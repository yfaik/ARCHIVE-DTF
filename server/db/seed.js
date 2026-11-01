import db from '../config/db.js';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function logUsersTable() {
  try {
    const users = await db.all('SELECT login, active, role, service FROM users ORDER BY id ASC');
    console.log('📋 [DATABASE CHECK] Registered Users in PostgreSQL / Neon:');
    if (console.table) {
      console.table(users);
    } else {
      console.log(users);
    }
  } catch (err) {
    console.error('❌ Erreur lors de l affichage de la table users:', err);
  }
}

/**
 * Initialisation de la base de données (Seeding PostgreSQL / Neon).
 */
export async function seedDatabase() {
  console.log('🌱 Vérification de l état de la base PostgreSQL / Neon...');

  // Ensure upload directory exists
  const uploadDir = path.join(__dirname, '../uploads/pdfs');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Generate a valid dummy PDF file for testing if it does not exist
  const dummyPdfPath = path.join(uploadDir, 'demo_document.pdf');
  if (!fs.existsSync(dummyPdfPath)) {
    const dummyPdfContent = `%PDF-1.4
1 0 obj <>/ProcSet[/PDF/Text/ImageB/ImageC/ImageI] >>/MediaBox[ 0 0 595.32 841.92] /Contents 4 0 R/Group<>/Tabs/S/StructParents 0>>
endobj
2 0 obj <>/Font<>/ProcSet[/PDF/Text/ImageB/ImageC/ImageI] >>/MediaBox[ 0 0 595.32 841.92] /Contents 5 0 R/Group<>/Tabs/S/StructParents 1>>
endobj
3 0 obj <>/Helvetica-Bold 7 0 R>> >>
endobj
4 0 obj <>/ColorSpace<>/Font<>/ProcSet[/PDF/Text/ImageB/ImageC/ImageI] >>/ExtGState<>>>
stream
BT
/F1 18 Tf
50 780 Td
(COMMUNE DE BENSLIMANE - DIVISION TECHNIQUE ET FINANCIERE) Tj
/F1 14 Tf
0 -30 Td
(Bureau d'Ordre - Document d'archive officiel) Tj
/F2 12 Tf
0 -40 Td
(Reference : DTF-2026-001) Tj
0 -20 Td
(Objet : Demande d'amenagement urbain Quartier Al Qods) Tj
0 -20 Td
(Expediteur : Prefecture de Benslimane) Tj
0 -20 Td
(Service Destinataire : Service Technique) Tj
0 -40 Td
(Ce document fait foi dans le registre numerique de la Division.) Tj
ET
endstream
endobj
5 0 obj <>
stream
BT /F1 14 Tf 50 750 Td (Document Officiel DTF) Tj ET
endstream
endobj
6 0 obj </BaseFont/Helvetica/Encoding/WinAnsiEncoding/Subtype/Type1/Type/Font>
7 0 obj </BaseFont/Helvetica-Bold/Encoding/WinAnsiEncoding/Subtype/Type1/Type/Font>
endobj
xref
0 8
0000000000 65535 f 
0000000009 00000 n 
0000000212 00000 n 
0000000415 00000 n 
0000000468 00000 n 
0000000880 00000 n 
0000000965 00000 n 
0000001053 00000 n 
trailer
<>/Root 1 0 R>>
startxref
1146
%%EOF`;
    fs.writeFileSync(dummyPdfPath, dummyPdfContent);
  }

  // Ensure initial services exist
  try {
    await db.query(`
      INSERT INTO services (id, nom, code) VALUES
        (1, 'Service Technique', 'TECH'),
        (2, 'Service Financier', 'FIN'),
        (3, 'Service Comptabilité', 'COMPTA'),
        (4, 'Chef de Division', 'CHEF')
      ON CONFLICT (id) DO UPDATE SET
        nom = EXCLUDED.nom,
        code = EXCLUDED.code;
    `);
  } catch (servErr) {
    console.warn('⚠️ Seeding services notice:', servErr.message);
  }

  // Hash default passwords (password: "Password123!")
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const usersToInsert = [
    {
      login: 'admin',
      password_hash: passwordHash,
      name: 'Chef de Division',
      role: 'CHEF_DIVISION',
      service: null,
      active: true
    },
    {
      login: 'secretaire',
      password_hash: passwordHash,
      name: "Responsable Bureau d'Ordre",
      role: 'RESPONSABLE_BO',
      service: null,
      active: true
    },
    {
      login: 'technique',
      password_hash: passwordHash,
      name: 'Responsable Service Technique',
      role: 'USER_SERVICE',
      service: 'Service Technique',
      active: true
    },
    {
      login: 'financier',
      password_hash: passwordHash,
      name: 'Responsable Service Financier',
      role: 'USER_SERVICE',
      service: 'Service Financier',
      active: true
    },
    {
      login: 'comptabilite',
      password_hash: passwordHash,
      name: 'Responsable Service Comptabilité',
      role: 'USER_SERVICE',
      service: 'Service Comptabilité',
      active: true
    }
  ];

  try {
    console.log('📌 Vérification et initialisation des comptes utilisateurs par défaut...');
    for (const u of usersToInsert) {
      await db.query(
        `INSERT INTO users (login, password_hash, name, role, service, active) 
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (login) DO UPDATE SET
           password_hash = EXCLUDED.password_hash,
           name = EXCLUDED.name,
           role = EXCLUDED.role,
           service = EXCLUDED.service,
           active = EXCLUDED.active`,
        [u.login, u.password_hash, u.name, u.role, u.service, u.active]
      );
    }
    console.log('✅ Comptes utilisateurs par défaut vérifiés / créés avec succès.');
  } catch (err) {
    console.error('❌ Erreur lors du vérification/seeding de la table users:', err);
  }

  await logUsersTable();
}

// Direct execution CLI support
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Erreur lors du seeding PostgreSQL / Neon:', err);
      process.exit(1);
    });
}
