import db from '../config/db.js';
import { createAuditLog } from '../middleware/audit.js';
import { validatePdfMagicBytes } from '../middleware/upload.js';
import { notifyService, notifyChefDivision } from '../services/notification.service.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// COURRIERS ARRIVÉS
// =============================================================================

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

export async function getCourriersArrives(req, res) {
  try {
    const { search, date_from, date_to, service, status, period, priorite } = req.query;
    let sql = `SELECT c.*, u.name as creator_name FROM courriers_arrives c LEFT JOIN users u ON c.created_by = u.id WHERE 1=1`;
    const params = [];
    let pIdx = 1;

    if (period && period !== 'total') {
      const dateCond = buildDateCondition('c.date_arrivee', period);
      sql += ` AND ${dateCond}`;
    }

    // Filter by priority ('Normal', 'Urgent', 'Très Urgent')
    if (priorite && ['Normal', 'Urgent', 'Très Urgent'].includes(priorite.trim())) {
      params.push(priorite.trim());
      sql += ` AND c.priorite = $${pIdx++}`;
    }

    // Service isolation for USER_SERVICE:
    // Destination services see all courriers assigned to their service that have been transmitted
    if (req.user.role === 'USER_SERVICE') {
      params.push(req.user.service);
      sql += ` AND c.service_destinataire = $${pIdx++}`;
      sql += ` AND UPPER(c.statut) != 'NOUVEAU'`;
    } else if (service) {
      params.push(service);
      sql += ` AND c.service_destinataire = $${pIdx++}`;
    }

    if (status) {
      const st = status.trim();
      let matchVals = [st];
      const upper = st.toUpperCase();
      if (upper.includes('TRAIT')) matchVals = ['Traité', 'TRAITE', 'TRAITÉ'];
      else if (upper.includes('COURS')) matchVals = ['En cours', 'EN_COURS', 'EN COURS'];
      else if (upper.includes('TRANSMIS')) matchVals = ['Transmis', 'TRANSMIS'];
      else if (upper.includes('NOUVEAU')) matchVals = ['Nouveau', 'NOUVEAU'];

      const placeholders = matchVals.map(() => `$${pIdx++}`).join(', ');
      params.push(...matchVals);
      sql += ` AND c.statut IN (${placeholders})`;
    }

    if (search) {
      const searchPattern = `%${search}%`;
      const p1 = pIdx++;
      const p2 = pIdx++;
      const p3 = pIdx++;
      params.push(searchPattern, searchPattern, searchPattern);
      sql += ` AND (c.reference ILIKE $${p1} OR c.objet ILIKE $${p2} OR c.expediteur ILIKE $${p3})`;
    }

    if (date_from) {
      params.push(date_from);
      sql += ` AND c.date_arrivee >= $${pIdx++}`;
    }

    if (date_to) {
      params.push(date_to);
      sql += ` AND c.date_arrivee <= $${pIdx++}`;
    }

    sql += ` ORDER BY c.created_at DESC`;

    const courriers = await db.all(sql, params);
    res.json(courriers);
  } catch (err) {
    console.error('Erreur getCourriersArrives PostgreSQL:', err);
    res.status(500).json({ error: 'Erreur lors de la recherche des courriers arrivés.' });
  }
}

// Dedicated endpoint for Chef de Division's assigned courriers
export async function getMyCourriersChef(req, res) {
  try {
    const { search, date_from, date_to, status, period, priorite } = req.query;
    let sql = `SELECT c.*, u.name as creator_name 
               FROM courriers_arrives c 
               LEFT JOIN users u ON c.created_by = u.id 
               WHERE c.service_destinataire = 'Chef de Division'`;
    const params = [];
    let pIdx = 1;

    if (period && period !== 'total') {
      const dateCond = buildDateCondition('c.date_arrivee', period);
      sql += ` AND ${dateCond}`;
    }

    if (priorite && ['Normal', 'Urgent', 'Très Urgent'].includes(priorite.trim())) {
      params.push(priorite.trim());
      sql += ` AND c.priorite = $${pIdx++}`;
    }

    if (status) {
      const st = status.trim();
      let matchVals = [st];
      const upper = st.toUpperCase();
      if (upper.includes('TRAIT')) matchVals = ['Traité', 'TRAITE', 'TRAITÉ'];
      else if (upper.includes('COURS')) matchVals = ['En cours', 'EN_COURS', 'EN COURS'];
      else if (upper.includes('TRANSMIS')) matchVals = ['Transmis', 'TRANSMIS'];
      else if (upper.includes('NOUVEAU')) matchVals = ['Nouveau', 'NOUVEAU'];

      const placeholders = matchVals.map(() => `$${pIdx++}`).join(', ');
      params.push(...matchVals);
      sql += ` AND c.statut IN (${placeholders})`;
    }

    if (search) {
      const searchPattern = `%${search}%`;
      const p1 = pIdx++;
      const p2 = pIdx++;
      const p3 = pIdx++;
      params.push(searchPattern, searchPattern, searchPattern);
      sql += ` AND (c.reference ILIKE $${p1} OR c.objet ILIKE $${p2} OR c.expediteur ILIKE $${p3})`;
    }

    if (date_from) {
      params.push(date_from);
      sql += ` AND c.date_arrivee >= $${pIdx++}`;
    }

    if (date_to) {
      params.push(date_to);
      sql += ` AND c.date_arrivee <= $${pIdx++}`;
    }

    sql += ` ORDER BY c.created_at DESC`;

    const courriers = await db.all(sql, params);
    res.json(courriers);
  } catch (err) {
    console.error('Erreur getMyCourriersChef PostgreSQL:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des courriers du Chef de Division.' });
  }
}

export async function createCourrierArrive(req, res) {
  try {
    const role = String(req.user.role || '').trim().toUpperCase();
    if (role !== 'CHEF_DIVISION' && role !== 'SECRETAIRE' && role !== 'RESPONSABLE_BO' && role !== 'AGENT_BO') {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'Seuls le Chef de Division et le Responsable Bureau d\'Ordre peuvent créer un courrier arrivé.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Le fichier PDF scanné ou numérisé est obligatoire.' });
    }

    const isValidPdf = validatePdfMagicBytes(req.file.path);
    if (!isValidPdf) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Le fichier téléversé n est pas un document PDF valide.' });
    }

    const { reference, objet, expediteur, date_arrivee, observation, service_destinataire, priorite } = req.body;

    if (!reference || !reference.trim()) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'La référence manuelle du courrier est obligatoire.' });
    }

    if (!objet || !objet.trim()) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'L objet du courrier est obligatoire.' });
    }

    if (!expediteur || !expediteur.trim()) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'L expéditeur du courrier est obligatoire.' });
    }

    if (!service_destinataire || !service_destinataire.trim()) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Le service destinataire est obligatoire.' });
    }

    const validPriorities = ['Normal', 'Urgent', 'Très Urgent'];
    const safePriorite = priorite && validPriorities.includes(priorite.trim()) ? priorite.trim() : 'Normal';

    // Check duplicate reference (Reference MUST BE MANUAL and UNIQUE)
    const existing = await db.get('SELECT id FROM courriers_arrives WHERE reference = $1', [reference.trim()]);
    if (existing) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: `La référence "${reference.trim()}" existe déjà dans le registre des courriers arrivés.` });
    }

    const insertRes = await db.query(
      `INSERT INTO courriers_arrives 
       (reference, objet, expediteur, date_arrivee, observation, service_destinataire, statut, priorite, pdf_filename, pdf_original_name, pdf_size, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'NOUVEAU', $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        reference.trim(),
        objet.trim(),
        expediteur.trim(),
        date_arrivee || new Date().toISOString().split('T')[0],
        observation ? observation.trim() : null,
        service_destinataire.trim(),
        safePriorite,
        req.file.filename,
        req.file.originalname,
        req.file.size,
        req.user.id
      ]
    );

    const newCourrier = insertRes.rows[0];

    await createAuditLog({
      req,
      action: `Création du courrier ${reference.trim()} (${safePriorite})`,
      newValue: newCourrier
    });

    // Notify service
    const notifType = safePriorite === 'Très Urgent' ? 'danger' : (safePriorite === 'Urgent' ? 'warning' : 'info');
    const notifTitle = safePriorite === 'Normal' ? 'Nouveau courrier enregistré' : `Nouveau courrier [${safePriorite}]`;
    await notifyService({
      service: service_destinataire.trim(),
      title: notifTitle,
      message: `Courrier Réf: ${reference.trim()} ("${objet.trim().substring(0, 40)}...") Priorité: ${safePriorite}.`,
      type: notifType
    });

    res.status(201).json(newCourrier);
  } catch (err) {
    console.error('❌ Erreur SQL/Serveur createCourrierArrive:', err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: `Erreur lors de l enregistrement du courrier arrivé : ${err.message || 'Erreur serveur SQL.'}` });
  }
}

export async function updateCourrierArrive(req, res) {
  try {
    const role = String(req.user.role || '').trim().toUpperCase();
    if (role !== 'CHEF_DIVISION' && role !== 'SECRETAIRE' && role !== 'RESPONSABLE_BO' && role !== 'AGENT_BO') {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'Permissions insuffisantes pour modifier un courrier.' });
    }

    const { id } = req.params;
    const oldCourrier = await db.get('SELECT * FROM courriers_arrives WHERE id = $1', [id]);
    if (!oldCourrier) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Courrier arrivé introuvable.' });
    }

    const { reference, objet, expediteur, date_arrivee, observation, service_destinataire, priorite } = req.body;

    // Check if new reference collides
    if (reference && reference.trim() !== oldCourrier.reference) {
      const collision = await db.get('SELECT id FROM courriers_arrives WHERE reference = $1 AND id != $2', [reference.trim(), id]);
      if (collision) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: `La référence "${reference.trim()}" est déjà attribuée.` });
      }
    }

    let pdf_filename = oldCourrier.pdf_filename;
    let pdf_original_name = oldCourrier.pdf_original_name;
    let pdf_size = oldCourrier.pdf_size;

    if (req.file && validatePdfMagicBytes(req.file.path)) {
      pdf_filename = req.file.filename;
      pdf_original_name = req.file.originalname;
      pdf_size = req.file.size;
    }

    const newRef = reference ? reference.trim() : oldCourrier.reference;
    const newObjet = objet ? objet.trim() : oldCourrier.objet;
    const newExp = expediteur ? expediteur.trim() : oldCourrier.expediteur;
    const newDate = date_arrivee || oldCourrier.date_arrivee;
    const newObs = observation !== undefined ? (observation ? observation.trim() : null) : oldCourrier.observation;
    const newService = service_destinataire ? service_destinataire.trim() : oldCourrier.service_destinataire;
    const validPriorities = ['Normal', 'Urgent', 'Très Urgent'];
    const newPriorite = priorite && validPriorities.includes(priorite.trim()) ? priorite.trim() : (oldCourrier.priorite || 'Normal');

    const updateRes = await db.query(
      `UPDATE courriers_arrives 
       SET reference = $1, objet = $2, expediteur = $3, date_arrivee = $4, observation = $5,
           service_destinataire = $6, priorite = $7, pdf_filename = $8, pdf_original_name = $9, pdf_size = $10,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING *`,
      [newRef, newObjet, newExp, newDate, newObs, newService, newPriorite, pdf_filename, pdf_original_name, pdf_size, id]
    );

    const updatedCourrier = updateRes.rows[0];

    const isRedirected = oldCourrier.service_destinataire !== newService;
    const actionName = isRedirected ? 'REDIRECTION_COURRIER_ARRIVE' : 'MODIFICATION_COURRIER_ARRIVE';

    await createAuditLog({
      req,
      action: actionName,
      oldValue: oldCourrier,
      newValue: updatedCourrier
    });

    if (isRedirected) {
      await notifyService({
        service: newService,
        title: 'Courrier Redirigé',
        message: `Le courrier Réf: ${newRef} a été réattribué à votre service.`,
        type: 'warning'
      });
    }

    res.json(updatedCourrier);
  } catch (err) {
    console.error('❌ Erreur SQL/Serveur updateCourrierArrive:', err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: `Erreur lors de la modification du courrier : ${err.message || 'Erreur serveur SQL.'}` });
  }
}

export async function updateCourrierArriveStatus(req, res) {
  try {
    const { id } = req.params;
    const { statut, service_destinataire, priorite } = req.body;

    const userRole = String(req.user.role || '').trim().toUpperCase();
    const isChefDivision = userRole === 'CHEF_DIVISION';
    const isUserService = userRole === 'USER_SERVICE';

    if (!isChefDivision && !isUserService) {
      return res.status(403).json({
        error: 'Permissions insuffisantes pour modifier le statut du courrier.'
      });
    }

    const courrier = await db.get('SELECT * FROM courriers_arrives WHERE id = $1', [id]);
    if (!courrier) {
      return res.status(404).json({ error: 'Courrier arrivé introuvable.' });
    }

    // Helper to canonicalize status name
    const rawStatut = String(statut || '').trim();
    const upperStatut = rawStatut.toUpperCase();
    let targetStatut = 'Transmis';
    if (upperStatut.includes('TRAIT')) {
      targetStatut = 'Traité';
    } else if (upperStatut.includes('COURS')) {
      targetStatut = 'En cours';
    } else if (upperStatut.includes('TRANSMIS')) {
      targetStatut = 'Transmis';
    } else if (upperStatut.includes('NOUVEAU')) {
      targetStatut = 'Nouveau';
    } else if (rawStatut) {
      targetStatut = rawStatut;
    }

    // Validation for USER_SERVICE (Destination Service)
    if (isUserService) {
      if (courrier.service_destinataire !== req.user.service) {
        return res.status(403).json({
          error: 'Ce courrier n est pas assigné à votre service.'
        });
      }

      if (targetStatut !== 'En cours' && targetStatut !== 'Traité') {
        return res.status(400).json({
          error: 'Le service destinataire ne peut changer le statut que vers "En cours" ou "Traité".'
        });
      }

      let datePriseEnChargeSql = '';
      let dateTraitementSql = '';
      const params = [targetStatut];
      let pIdx = 2;

      if (targetStatut === 'En cours') {
        datePriseEnChargeSql = ', date_prise_en_charge = COALESCE(date_prise_en_charge, CURRENT_TIMESTAMP)';
      } else if (targetStatut === 'Traité') {
        dateTraitementSql = `, date_traitement = CURRENT_TIMESTAMP, traite_par = $${pIdx++}`;
        params.push(req.user.name || req.user.login);
      }

      const idPlaceholder = `$${pIdx++}`;
      params.push(id);

      await db.query(
        `UPDATE courriers_arrives 
         SET statut = $1 ${datePriseEnChargeSql} ${dateTraitementSql}, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ${idPlaceholder}`,
        params
      );

      const actionName = targetStatut === 'Traité' 
        ? `Traitement finalisé du courrier ${courrier.reference} par ${req.user.name}`
        : `Prise en charge du courrier ${courrier.reference} par ${req.user.name}`;

      await createAuditLog({
        req,
        action: actionName,
        oldValue: { reference: courrier.reference, statut: courrier.statut },
        newValue: { reference: courrier.reference, statut: targetStatut }
      });

      await notifyChefDivision({
        title: `Courrier ${targetStatut.toLowerCase()} : ${courrier.reference}`,
        message: `Le courrier Réf: ${courrier.reference} ("${courrier.objet.substring(0, 40)}...") a été marqué comme "${targetStatut}" par le ${req.user.service} (${req.user.name}).`,
        type: targetStatut === 'Traité' ? 'success' : 'info'
      });

      const updatedCourrier = await db.get(
        'SELECT c.*, u.name as creator_name FROM courriers_arrives c LEFT JOIN users u ON c.created_by = u.id WHERE c.id = $1',
        [id]
      );
      return res.json(updatedCourrier);
    }

    // Chef de Division actions
    if (isChefDivision) {
      const targetService = service_destinataire ? service_destinataire.trim() : courrier.service_destinataire;
      const validPriorities = ['Normal', 'Urgent', 'Très Urgent'];
      const targetPriorite = priorite && validPriorities.includes(priorite.trim())
        ? priorite.trim()
        : (courrier.priorite || 'Normal');

      let datePriseSql = '';
      let dateTraitSql = '';
      const updateParams = [targetStatut, targetService, targetPriorite];
      let pIdx = 4;

      if (targetStatut === 'En cours') {
        datePriseSql = ', date_prise_en_charge = COALESCE(date_prise_en_charge, CURRENT_TIMESTAMP)';
      } else if (targetStatut === 'Traité') {
        dateTraitSql = `, date_traitement = CURRENT_TIMESTAMP, traite_par = $${pIdx++}`;
        updateParams.push(req.user.name || 'Chef de Division');
      }

      const idPlaceholder = `$${pIdx++}`;
      updateParams.push(id);

      await db.query(
        `UPDATE courriers_arrives 
         SET statut = $1, service_destinataire = $2, priorite = $3 ${datePriseSql} ${dateTraitSql}, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ${idPlaceholder}`,
        updateParams
      );

      await createAuditLog({
        req,
        action: `Transmission/Mise à jour du courrier ${courrier.reference} (${targetStatut}) au ${targetService}`,
        oldValue: { reference: courrier.reference, statut: courrier.statut, service: courrier.service_destinataire, priorite: courrier.priorite },
        newValue: { reference: courrier.reference, statut: targetStatut, service: targetService, priorite: targetPriorite }
      });

      if (targetStatut === 'Transmis') {
        const isHighPriority = targetPriorite === 'Très Urgent' || targetPriorite === 'Urgent';
        const notifType = targetPriorite === 'Très Urgent' ? 'danger' : (targetPriorite === 'Urgent' ? 'warning' : 'info');
        await notifyService({
          service: targetService,
          title: isHighPriority ? `Courrier transmis [${targetPriorite}]` : 'Courrier transmis',
          message: `Le courrier Réf: ${courrier.reference} ("${courrier.objet.substring(0, 40)}...") [Priorité: ${targetPriorite}] vous a été transmis par le Chef de Division.`,
          type: notifType
        });
      }

      const updatedCourrier = await db.get(
        'SELECT c.*, u.name as creator_name FROM courriers_arrives c LEFT JOIN users u ON c.created_by = u.id WHERE c.id = $1',
        [id]
      );
      return res.json(updatedCourrier);
    }
  } catch (err) {
    console.error('❌ Erreur updateCourrierArriveStatus:', err);
    res.status(500).json({ error: 'Erreur lors du changement de statut du courrier.' });
  }
}

// =============================================================================
// COURRIERS DÉPART
// =============================================================================

export async function getCourriersDeparts(req, res) {
  try {
    const { search, date_from, date_to, period, service } = req.query;
    let sql = `SELECT c.*, s.nom as service_expediteur, u.name as creator_name 
               FROM courriers_departs c 
               LEFT JOIN services s ON c.service_expediteur_id = s.id 
               LEFT JOIN users u ON c.created_by = u.id 
               WHERE 1=1`;
    const params = [];
    let pIdx = 1;

    if (period && period !== 'total') {
      const dateCond = buildDateCondition('c.date_depart', period);
      sql += ` AND ${dateCond}`;
    }

    // Service isolation for USER_SERVICE
    if (req.user.role === 'USER_SERVICE') {
      const p1 = pIdx++;
      const p2 = pIdx++;
      params.push(req.user.service, req.user.service);
      sql += ` AND (s.nom = $${p1} OR c.service_expediteur_id = (SELECT id FROM services WHERE nom = $${p2} LIMIT 1))`;
    } else if (service) {
      const p1 = pIdx++;
      const p2 = pIdx++;
      params.push(service, service);
      sql += ` AND (s.nom = $${p1} OR c.service_expediteur_id = (SELECT id FROM services WHERE nom = $${p2} LIMIT 1))`;
    }

    if (search) {
      const searchPattern = `%${search}%`;
      const p1 = pIdx++;
      const p2 = pIdx++;
      const p3 = pIdx++;
      params.push(searchPattern, searchPattern, searchPattern);
      sql += ` AND (c.reference ILIKE $${p1} OR c.objet ILIKE $${p2} OR c.destinataire ILIKE $${p3})`;
    }

    if (date_from) {
      params.push(date_from);
      sql += ` AND c.date_depart >= $${pIdx++}`;
    }

    if (date_to) {
      params.push(date_to);
      sql += ` AND c.date_depart <= $${pIdx++}`;
    }

    sql += ` ORDER BY c.created_at DESC`;

    const courriers = await db.all(sql, params);
    res.json(courriers);
  } catch (err) {
    console.error('❌ Erreur getCourriersDeparts PostgreSQL:', err);
    res.status(500).json({ error: 'Erreur lors de la recherche des courriers départ.' });
  }
}

export async function createCourrierDepart(req, res) {
  try {
    const role = String(req.user.role || '').trim().toUpperCase();
    if (role !== 'CHEF_DIVISION' && role !== 'SECRETAIRE' && role !== 'RESPONSABLE_BO' && role !== 'AGENT_BO') {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'Seuls le Chef de Division et le Responsable Bureau d\'Ordre peuvent créer un courrier départ.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Le fichier PDF du courrier départ est obligatoire.' });
    }

    const isValidPdf = validatePdfMagicBytes(req.file.path);
    if (!isValidPdf) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Le fichier téléversé n est pas un document PDF valide.' });
    }

    const { reference, objet, destinataire, date_depart, observation, service_expediteur_id, service_expediteur } = req.body;

    if (!reference || !reference.trim()) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'La référence manuelle du courrier départ est obligatoire.' });
    }

    if (!objet || !objet.trim()) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'L objet du courrier départ est obligatoire.' });
    }

    if (!destinataire || !destinataire.trim()) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Le destinataire du courrier départ est obligatoire.' });
    }

    let targetServiceId = service_expediteur_id ? parseInt(service_expediteur_id, 10) : null;
    if (!targetServiceId && service_expediteur) {
      const sRow = await db.get('SELECT id FROM services WHERE nom = $1', [service_expediteur.trim()]);
      if (sRow) targetServiceId = sRow.id;
    }

    if (!targetServiceId || isNaN(targetServiceId)) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Le Service Expéditeur est obligatoire.' });
    }

    const existing = await db.get('SELECT id FROM courriers_departs WHERE reference = $1', [reference.trim()]);
    if (existing) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: `La référence "${reference.trim()}" existe déjà dans le registre des courriers départ.` });
    }

    const insertRes = await db.query(
      `INSERT INTO courriers_departs 
       (reference, objet, destinataire, service_expediteur_id, date_depart, observation, pdf_filename, pdf_original_name, pdf_size, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        reference.trim(),
        objet.trim(),
        destinataire.trim(),
        targetServiceId,
        date_depart || new Date().toISOString().split('T')[0],
        observation ? observation.trim() : null,
        req.file.filename,
        req.file.originalname,
        req.file.size,
        req.user.id
      ]
    );

    const newCourrier = await db.get(
      `SELECT c.*, s.nom as service_expediteur 
       FROM courriers_departs c 
       LEFT JOIN services s ON c.service_expediteur_id = s.id 
       WHERE c.reference = $1`,
      [reference.trim()]
    );

    await createAuditLog({
      req,
      action: 'CREATION_COURRIER_DEPART',
      newValue: newCourrier
    });

    res.status(201).json(newCourrier);
  } catch (err) {
    console.error('❌ Erreur SQL/Serveur createCourrierDepart:', err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: `Erreur lors de l enregistrement du courrier départ : ${err.message || 'Erreur serveur SQL.'}` });
  }
}

export async function updateCourrierDepart(req, res) {
  try {
    const role = String(req.user.role || '').trim().toUpperCase();
    if (role !== 'CHEF_DIVISION' && role !== 'SECRETAIRE' && role !== 'RESPONSABLE_BO' && role !== 'AGENT_BO') {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'Permissions insuffisantes pour modifier un courrier départ.' });
    }

    const { id } = req.params;
    const oldCourrier = await db.get('SELECT * FROM courriers_departs WHERE id = $1', [id]);
    if (!oldCourrier) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Courrier départ introuvable.' });
    }

    const { reference, objet, destinataire, date_depart, observation, service_expediteur_id, service_expediteur } = req.body;

    if (reference && reference.trim() !== oldCourrier.reference) {
      const collision = await db.get('SELECT id FROM courriers_departs WHERE reference = $1 AND id != $2', [reference.trim(), id]);
      if (collision) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: `La référence "${reference.trim()}" est déjà attribuée.` });
      }
    }

    let targetServiceId = oldCourrier.service_expediteur_id;
    if (service_expediteur_id) {
      targetServiceId = parseInt(service_expediteur_id, 10);
    } else if (service_expediteur) {
      const sRow = await db.get('SELECT id FROM services WHERE nom = $1', [service_expediteur.trim()]);
      if (sRow) targetServiceId = sRow.id;
    }

    let pdf_filename = oldCourrier.pdf_filename;
    let pdf_original_name = oldCourrier.pdf_original_name;
    let pdf_size = oldCourrier.pdf_size;

    if (req.file && validatePdfMagicBytes(req.file.path)) {
      pdf_filename = req.file.filename;
      pdf_original_name = req.file.originalname;
      pdf_size = req.file.size;
    }

    const newRef = reference ? reference.trim() : oldCourrier.reference;
    const newObjet = objet ? objet.trim() : oldCourrier.objet;
    const newDest = destinataire ? destinataire.trim() : oldCourrier.destinataire;
    const newDate = date_depart || oldCourrier.date_depart;
    const newObs = observation !== undefined ? (observation ? observation.trim() : null) : oldCourrier.observation;

    await db.query(
      `UPDATE courriers_departs 
       SET reference = $1, objet = $2, destinataire = $3, service_expediteur_id = $4, date_depart = $5, observation = $6,
           pdf_filename = $7, pdf_original_name = $8, pdf_size = $9, updated_at = CURRENT_TIMESTAMP
       WHERE id = $10`,
      [newRef, newObjet, newDest, targetServiceId, newDate, newObs, pdf_filename, pdf_original_name, pdf_size, id]
    );

    const updatedCourrier = await db.get(
      `SELECT c.*, s.nom as service_expediteur 
       FROM courriers_departs c 
       LEFT JOIN services s ON c.service_expediteur_id = s.id 
       WHERE c.id = $1`,
      [id]
    );

    await createAuditLog({
      req,
      action: 'MODIFICATION_COURRIER_DEPART',
      oldValue: oldCourrier,
      newValue: updatedCourrier
    });

    res.json(updatedCourrier);
  } catch (err) {
    console.error('❌ Erreur SQL/Serveur updateCourrierDepart:', err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: `Erreur lors de la modification du courrier départ : ${err.message || 'Erreur serveur SQL.'}` });
  }
}

// =============================================================================
// STREAM / DOWNLOAD PDF FILE WITH ACCESS CHECK & AUDIT
// =============================================================================

export async function downloadPdf(req, res) {
  try {
    let { type, filename } = req.params;

    if (!filename && type) {
      filename = type;
      type = null;
    }

    if (!filename) {
      return res.status(400).json({ error: 'Nom de fichier invalide.' });
    }

    const safeFilename = path.basename(filename);
    const pdfsDir = path.resolve(__dirname, '../uploads/pdfs');
    const pdfPath = path.resolve(pdfsDir, safeFilename);

    if (!pdfPath.startsWith(pdfsDir)) {
      return res.status(400).json({ error: 'Chemin de fichier invalide ou non autorisé.' });
    }

    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ error: 'Fichier PDF physique introuvable sur le serveur.' });
    }

    try {
      fs.accessSync(pdfPath, fs.constants.R_OK);
    } catch (permErr) {
      console.error('Erreur de permission de lecture sur le fichier PDF:', permErr);
      return res.status(500).json({ error: 'Permission de lecture insuffisante sur le serveur.' });
    }

    let courrier = null;
    let detectedType = type;

    const isArrive = (type === 'arrive' || type === 'arrives');
    const isDepart = (type === 'depart' || type === 'departs');

    if (isArrive) {
      courrier = await db.get('SELECT *, \'arrive\' as category FROM courriers_arrives WHERE pdf_filename = $1', [safeFilename]);
    } else if (isDepart) {
      courrier = await db.get('SELECT c.*, s.nom as service_expediteur, \'depart\' as category FROM courriers_departs c LEFT JOIN services s ON c.service_expediteur_id = s.id WHERE c.pdf_filename = $1', [safeFilename]);
    }

    if (!courrier) {
      courrier = await db.get('SELECT *, \'arrive\' as category FROM courriers_arrives WHERE pdf_filename = $1', [safeFilename]);
      if (courrier) detectedType = 'arrive';
    }
    if (!courrier) {
      courrier = await db.get('SELECT c.*, s.nom as service_expediteur, \'depart\' as category FROM courriers_departs c LEFT JOIN services s ON c.service_expediteur_id = s.id WHERE c.pdf_filename = $1', [safeFilename]);
      if (courrier) detectedType = 'depart';
    }

    if (!courrier) {
      return res.status(404).json({ error: 'Référence du courrier introuvable dans la base de données.' });
    }

    // Check service isolation for USER_SERVICE
    if (req.user.role === 'USER_SERVICE') {
      if (detectedType === 'arrive') {
        if (courrier.service_destinataire && courrier.service_destinataire !== req.user.service) {
          return res.status(403).json({ error: `Accès refusé. Vous ne pouvez consulter que les courriers de votre propre service (${req.user.service}).` });
        }
        if (courrier.statut === 'NOUVEAU') {
          return res.status(403).json({ error: 'Ce courrier n est pas encore transmis à votre service.' });
        }
      } else if (detectedType === 'depart') {
        if (courrier.service_expediteur && courrier.service_expediteur !== req.user.service) {
          return res.status(403).json({ error: `Accès refusé. Vous ne pouvez consulter que les courriers départ de votre propre service (${req.user.service}).` });
        }
      }
    }

    await createAuditLog({
      req,
      action: 'TELECHARGEMENT_PDF',
      newValue: { reference: courrier.reference, filename: courrier.pdf_original_name, category: detectedType || 'document' }
    });

    const isDownload = req.query.download === 'true' || req.query.download === '1';
    const originalName = courrier.pdf_original_name || safeFilename;
    const stat = fs.statSync(pdfPath);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', stat.size);
    res.setHeader(
      'Content-Disposition',
      `${isDownload ? 'attachment' : 'inline'}; filename="${encodeURIComponent(originalName)}"; filename*=UTF-8''${encodeURIComponent(originalName)}"`
    );

    const fileStream = fs.createReadStream(pdfPath);
    fileStream.on('error', (streamErr) => {
      console.error('Erreur lecture flux PDF:', streamErr);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erreur lors de la lecture du fichier PDF.' });
      }
    });

    fileStream.pipe(res);
  } catch (err) {
    console.error('Erreur serveur téléchargement PDF:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erreur serveur lors du transfert du fichier PDF.' });
    }
  }
}

// Instant suggestions for auto-complete search
export async function getSearchSuggestions(req, res) {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);

    const param = `%${q}%`;
    let sqlArrives = `SELECT c.*, 'arrive' as category FROM courriers_arrives c WHERE c.reference ILIKE $1 OR c.objet ILIKE $2 OR c.expediteur ILIKE $3`;
    const paramsArrives = [param, param, param];
    let pIdxArrives = 4;

    if (req.user.role === 'USER_SERVICE') {
      paramsArrives.push(req.user.service);
      sqlArrives += ` AND c.service_destinataire = $${pIdxArrives++} AND UPPER(c.statut) != 'NOUVEAU'`;
    }

    sqlArrives += ` ORDER BY c.created_at DESC LIMIT 5`;
    const arrives = await db.all(sqlArrives, paramsArrives);

    let sqlDeparts = `SELECT c.*, s.nom as service_expediteur, 'depart' as category 
                      FROM courriers_departs c 
                      LEFT JOIN services s ON c.service_expediteur_id = s.id 
                      WHERE (c.reference ILIKE $1 OR c.objet ILIKE $2 OR c.destinataire ILIKE $3)`;
    const paramsDeparts = [param, param, param];
    let pIdxDeparts = 4;

    if (req.user.role === 'USER_SERVICE') {
      const p1 = pIdxDeparts++;
      const p2 = pIdxDeparts++;
      paramsDeparts.push(req.user.service, req.user.service);
      sqlDeparts += ` AND (s.nom = $${p1} OR c.service_expediteur_id = (SELECT id FROM services WHERE nom = $${p2} LIMIT 1))`;
    }

    sqlDeparts += ` ORDER BY c.created_at DESC LIMIT 5`;
    const departs = await db.all(sqlDeparts, paramsDeparts);

    res.json([...arrives, ...departs]);
  } catch (err) {
    console.error('Erreur suggestions recherche:', err);
    res.status(500).json({ error: 'Erreur suggestions recherche.' });
  }
}
