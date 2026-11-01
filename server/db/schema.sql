-- =============================================================================
-- DTF Commune de Benslimane - Schéma PostgreSQL & Neon Tech (Cloud Serverless)
-- Compatible avec Neon.tech, PostgreSQL 14, 15, 16+
-- Mot de passe initial pour tous les comptes de test : Password123!
-- =============================================================================

-- Extensions recommandées pour PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. Table: SERVICES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS services (
  id BIGSERIAL PRIMARY KEY,
  nom VARCHAR(150) NOT NULL UNIQUE,
  code VARCHAR(50) NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Insertion des services de la DTF (avec Chef de Division inclus)
INSERT INTO services (id, nom, code) VALUES
  (1, 'Service Technique', 'TECH'),
  (2, 'Service Financier', 'FIN'),
  (3, 'Service Comptabilité', 'COMPTA'),
  (4, 'Chef de Division', 'CHEF')
ON CONFLICT (id) DO UPDATE SET
  nom = EXCLUDED.nom,
  code = EXCLUDED.code;

SELECT setval('services_id_seq', (SELECT COALESCE(MAX(id), 1) FROM services));

-- -----------------------------------------------------------------------------
-- 2. Table: USERS (Utilisateurs et Rôles DTF)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  login VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(150) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('CHEF_DIVISION', 'RESPONSABLE_BO', 'SECRETAIRE', 'USER_SERVICE')),
  service VARCHAR(150) NULL CHECK (service IS NULL OR service IN ('Service Technique', 'Service Financier', 'Service Comptabilité', 'Chef de Division')),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_login ON users(login);
CREATE INDEX IF NOT EXISTS idx_users_role_service ON users(role, service);

-- -----------------------------------------------------------------------------
-- 3. Table: COURRIERS_ARRIVES (Courriers Arrivés)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courriers_arrives (
  id BIGSERIAL PRIMARY KEY,
  reference VARCHAR(100) NOT NULL UNIQUE,
  objet TEXT NOT NULL,
  expediteur VARCHAR(200) NOT NULL,
  date_arrivee DATE NOT NULL,
  observation TEXT NULL,
  service_destinataire VARCHAR(150) NOT NULL CHECK (service_destinataire IN ('Service Technique', 'Service Financier', 'Service Comptabilité', 'Chef de Division')),
  statut VARCHAR(50) NOT NULL DEFAULT 'Nouveau',
  priorite VARCHAR(50) NOT NULL DEFAULT 'Normal' CHECK (priorite IN ('Normal', 'Urgent', 'Très Urgent')),
  date_prise_en_charge TIMESTAMPTZ NULL,
  date_traitement TIMESTAMPTZ NULL,
  traite_par VARCHAR(150) NULL,
  pdf_filename VARCHAR(255) NOT NULL,
  pdf_original_name VARCHAR(255) NOT NULL,
  pdf_size BIGINT NOT NULL,
  created_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_arrives_ref ON courriers_arrives(reference);
CREATE INDEX IF NOT EXISTS idx_arrives_service ON courriers_arrives(service_destinataire);
CREATE INDEX IF NOT EXISTS idx_arrives_statut ON courriers_arrives(statut);
CREATE INDEX IF NOT EXISTS idx_arrives_priorite ON courriers_arrives(priorite);
CREATE INDEX IF NOT EXISTS idx_arrives_service_statut ON courriers_arrives(service_destinataire, statut);
CREATE INDEX IF NOT EXISTS idx_arrives_date ON courriers_arrives(date_arrivee);
CREATE INDEX IF NOT EXISTS idx_arrives_search ON courriers_arrives(reference, expediteur);

-- -----------------------------------------------------------------------------
-- 4. Table: COURRIERS_DEPARTS (Courriers Départs)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courriers_departs (
  id BIGSERIAL PRIMARY KEY,
  reference VARCHAR(100) NOT NULL UNIQUE,
  objet TEXT NOT NULL,
  destinataire VARCHAR(200) NOT NULL,
  service_expediteur_id BIGINT NULL REFERENCES services(id) ON DELETE SET NULL,
  date_depart DATE NOT NULL,
  observation TEXT NULL,
  pdf_filename VARCHAR(255) NOT NULL,
  pdf_original_name VARCHAR(255) NOT NULL,
  pdf_size BIGINT NOT NULL,
  created_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_departs_ref ON courriers_departs(reference);
CREATE INDEX IF NOT EXISTS idx_departs_service ON courriers_departs(service_expediteur_id);
CREATE INDEX IF NOT EXISTS idx_departs_date ON courriers_departs(date_depart);
CREATE INDEX IF NOT EXISTS idx_departs_search ON courriers_departs(reference, destinataire);

-- -----------------------------------------------------------------------------
-- 5. Table: AUDIT_LOGS (Journalisation Immuable)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  user_id BIGINT NULL,
  user_name VARCHAR(150) NOT NULL,
  role VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT NULL,
  action VARCHAR(100) NOT NULL,
  old_value TEXT NULL,
  new_value TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);

-- -----------------------------------------------------------------------------
-- 6. Table: NOTIFICATIONS (Système de Notifications Scanné & Cloisonné)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NULL,
  service VARCHAR(100) NULL,
  role VARCHAR(50) NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notif_service ON notifications(service);
CREATE INDEX IF NOT EXISTS idx_notif_role ON notifications(role);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);

-- -----------------------------------------------------------------------------
-- 7. SEED INITIAL USERS (Comptes initiaux avec mot de passe haché bcrypt)
-- Mot de passe par défaut : Password123!
-- -----------------------------------------------------------------------------
INSERT INTO users (login, password_hash, name, role, service, active)
VALUES 
  (
    'admin',
    '$2a$10$gQrqz0eR.y6QmrvMzCchjOVeftWYTOpUjHdM0aLRcDF7/U0rmY14W',
    'Chef de Division',
    'CHEF_DIVISION',
    NULL,
    TRUE
  ),
  (
    'secretaire',
    '$2a$10$gQrqz0eR.y6QmrvMzCchjOVeftWYTOpUjHdM0aLRcDF7/U0rmY14W',
    'Responsable Bureau d''Ordre',
    'RESPONSABLE_BO',
    NULL,
    TRUE
  ),
  (
    'technique',
    '$2a$10$gQrqz0eR.y6QmrvMzCchjOVeftWYTOpUjHdM0aLRcDF7/U0rmY14W',
    'Responsable Service Technique',
    'USER_SERVICE',
    'Service Technique',
    TRUE
  ),
  (
    'financier',
    '$2a$10$gQrqz0eR.y6QmrvMzCchjOVeftWYTOpUjHdM0aLRcDF7/U0rmY14W',
    'Responsable Service Financier',
    'USER_SERVICE',
    'Service Financier',
    TRUE
  ),
  (
    'comptabilite',
    '$2a$10$gQrqz0eR.y6QmrvMzCchjOVeftWYTOpUjHdM0aLRcDF7/U0rmY14W',
    'Responsable Service Comptabilité',
    'USER_SERVICE',
    'Service Comptabilité',
    TRUE
  )
ON CONFLICT (login) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  service = EXCLUDED.service,
  active = EXCLUDED.active;
