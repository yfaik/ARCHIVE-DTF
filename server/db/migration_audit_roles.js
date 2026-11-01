import db from '../config/db.js';

async function migrate() {
  console.log('🔄 Mise à jour des rôles dans la table audit_logs...');
  const res = await db.query(
    "UPDATE audit_logs SET role = 'RESPONSABLE_BO' WHERE role IN ('SECRETAIRE', 'Secrétaire', 'secretaire')"
  );
  console.log(`✅ Lignes mises à jour dans audit_logs : ${res.affectedRows || res[0]?.affectedRows || 0}`);

  const roles = await db.all("SELECT DISTINCT role, COUNT(1) as count FROM audit_logs GROUP BY role");
  console.log('📊 Rôles actuels dans audit_logs :', roles);

  const sample = await db.all(
    "SELECT id, user_name, role, action, timestamp FROM audit_logs WHERE role = 'RESPONSABLE_BO' ORDER BY timestamp DESC LIMIT 5"
  );
  console.log('🔍 Exemples d\'enregistrements mis à jour :', sample);
  process.exit(0);
}

migrate().catch((err) => {
  console.error('❌ Erreur lors de la migration audit_logs:', err);
  process.exit(1);
});
