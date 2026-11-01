-- =============================================================================
-- DTF Commune de Benslimane - Script d'initialisation des utilisateurs (PostgreSQL / Neon Tech)
-- Compatible avec Neon Tech, PostgreSQL 14, 15, 16+
-- Mot de passe par défaut pour tous les comptes : Password123!
-- =============================================================================

-- Insertion sécurisée des utilisateurs par défaut avec ON CONFLICT (login) DO UPDATE
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

-- =============================================================================
-- VÉRIFICATION DES COMPTES INSÉRÉS
-- =============================================================================
-- Logins créés :
-- 1. admin        -> Role: CHEF_DIVISION  | Service: NULL
-- 2. secretaire   -> Role: RESPONSABLE_BO | Service: NULL
-- 3. technique    -> Role: USER_SERVICE   | Service: Service Technique
-- 4. financier    -> Role: USER_SERVICE   | Service: Service Financier
-- 5. comptabilite -> Role: USER_SERVICE   | Service: Service Comptabilité
-- =============================================================================
