import db from '../config/db.js';

async function migrateUsersRole() {
  console.log('🔄 Migration: Modification du type de colonne role dans users...');
  
  await db.query(
    "ALTER TABLE users MODIFY COLUMN role ENUM('CHEF_DIVISION', 'RESPONSABLE_BO', 'SECRETAIRE', 'USER_SERVICE') NOT NULL"
  );
  console.log('✅ ENUM modifié avec succès pour inclure RESPONSABLE_BO.');

  const res = await db.query(
    "UPDATE users SET role = 'RESPONSABLE_BO' WHERE login IN ('youness', 'secretaire') OR role = 'SECRETAIRE'"
  );
  console.log('✅ Utilisateurs mis à jour vers RESPONSABLE_BO :', res.affectedRows || res[0]?.affectedRows || 0);

  const users = await db.all("SELECT id, login, name, role, active FROM users");
  console.log('📋 Table users après mise à jour :');
  console.table(users);
  process.exit(0);
}

migrateUsersRole().catch((err) => {
  console.error('❌ Erreur migration:', err);
  process.exit(1);
});
