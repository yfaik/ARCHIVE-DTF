import db from '../config/db.js';

function buildDateCondition(dateColumn, period) {
  switch (period) {
    case 'today':
      return `${dateColumn} = CURRENT_DATE`;
    case 'week':
      return `DATE_TRUNC('week', ${dateColumn}::timestamp) = DATE_TRUNC('week', CURRENT_DATE::timestamp)`;
    case 'month':
      return `DATE_TRUNC('month', ${dateColumn}::timestamp) = DATE_TRUNC('month', CURRENT_DATE::timestamp)`;
    case 'year':
      return `DATE_TRUNC('year', ${dateColumn}::timestamp) = DATE_TRUNC('year', CURRENT_DATE::timestamp)`;
    case 'total':
    default:
      return '1=1';
  }
}

export async function getDashboardStats(req, res) {
  try {
    const isServiceUser = req.user.role === 'USER_SERVICE';
    const serviceFilter = req.user.service;

    const period = req.query.period || 'year';
    const validPeriods = ['today', 'week', 'month', 'year', 'total'];
    const selectedPeriod = validPeriods.includes(period) ? period : 'year';

    const arrivesCondition = buildDateCondition('date_arrivee', selectedPeriod);
    let baseWhere = `WHERE ${arrivesCondition}`;
    let params = [];

    if (isServiceUser) {
      baseWhere += ` AND service_destinataire = $1`;
      params.push(serviceFilter);
    }

    // 1. Total Courriers Arrivés
    const resArrives = await db.get(`SELECT COUNT(*) as count FROM courriers_arrives ${baseWhere}`, params);
    const totalArrives = parseInt(resArrives?.count || 0, 10);

    // 2. Global status breakdown (NOUVEAU, TRANSMIS, EN_COURS, TRAITE)
    const statusSql = `SELECT statut, COUNT(*) as count FROM courriers_arrives ${baseWhere} GROUP BY statut`;
    const statusRows = await db.all(statusSql, params);

    const statusCounts = {
      NOUVEAU: 0,
      TRANSMIS: 0,
      EN_COURS: 0,
      TRAITE: 0
    };

    const mapStatusKey = (raw) => {
      const s = String(raw || '').toUpperCase();
      if (s.includes('TRAIT')) return 'TRAITE';
      if (s.includes('COURS')) return 'EN_COURS';
      if (s.includes('TRANSMIS')) return 'TRANSMIS';
      if (s.includes('NOUVEAU')) return 'NOUVEAU';
      return s;
    };

    statusRows.forEach(row => {
      const key = mapStatusKey(row.statut);
      if (statusCounts[key] !== undefined) {
        statusCounts[key] += parseInt(row.count, 10);
      }
    });

    // 3. Courriers Départs avec filtre temporel
    let totalDeparts = 0;
    const departsCondition = buildDateCondition('c.date_depart', selectedPeriod);
    if (isServiceUser) {
      const resDeparts = await db.get(
        `SELECT COUNT(*) as count 
         FROM courriers_departs c 
         LEFT JOIN services s ON c.service_expediteur_id = s.id 
         WHERE ${departsCondition} AND (s.nom = $1 OR c.service_expediteur_id = (SELECT id FROM services WHERE nom = $2 LIMIT 1))`,
        [serviceFilter, serviceFilter]
      );
      totalDeparts = parseInt(resDeparts?.count || 0, 10);
    } else {
      const resDeparts = await db.get(`SELECT COUNT(*) as count FROM courriers_departs c WHERE ${departsCondition}`);
      totalDeparts = parseInt(resDeparts?.count || 0, 10);
    }

    // 4. Répartition détaillée par service et par statut (NOUVEAU, TRANSMIS, EN_COURS, TRAITE)
    const serviceStatusSql = `SELECT service_destinataire as service, statut, COUNT(*) as count 
                              FROM courriers_arrives 
                              ${baseWhere} 
                              GROUP BY service_destinataire, statut`;
    const serviceStatusRows = await db.all(serviceStatusSql, params);

    const allServices = ['Service Technique', 'Service Financier', 'Service Comptabilité', 'Chef de Division'];
    const serviceStats = allServices.map(s => {
      const serviceRows = serviceStatusRows.filter(r => r.service === s);
      const statsObj = {
        service: s,
        total: 0,
        NOUVEAU: 0,
        TRANSMIS: 0,
        EN_COURS: 0,
        TRAITE: 0
      };

      serviceRows.forEach(r => {
        const count = parseInt(r.count, 10);
        const key = mapStatusKey(r.statut);
        if (statsObj[key] !== undefined) {
          statsObj[key] += count;
        }
        statsObj.total += count;
      });

      return statsObj;
    });

    // Active users count
    const usersCountRes = await db.get('SELECT COUNT(*) as count FROM users WHERE active = true');
    const totalUsers = parseInt(usersCountRes?.count || 0, 10);

    // Recent activity stream (Audit logs)
    let recentActivitySql = `SELECT timestamp, user_name, role, action, new_value FROM audit_logs ORDER BY timestamp DESC LIMIT 10`;
    const recentActivity = await db.all(recentActivitySql);

    res.json({
      period: selectedPeriod,
      totalArrives,
      totalDeparts,
      statusCounts,
      serviceStats,
      totalUsers,
      recentActivity
    });
  } catch (err) {
    console.error('Erreur getDashboardStats PostgreSQL:', err);
    res.status(500).json({ error: 'Erreur lors de la génération des statistiques du tableau de bord.' });
  }
}
