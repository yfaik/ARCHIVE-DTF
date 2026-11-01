-- =============================================================================
-- DTF Commune de Benslimane - Script d'initialisation des utilisateurs (MySQL / MariaDB)
-- Fichier compatible avec phpMyAdmin, MariaDB 10.4+ et MySQL 5.7+ / 8.0+
-- Mot de passe par défaut pour tous les comptes : Password123!
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `dtf_benslimane` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `dtf_benslimane`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Insertion sécurisée des utilisateurs par défaut avec vérification ON DUPLICATE KEY UPDATE
INSERT INTO `users` (`login`, `password_hash`, `name`, `role`, `service`, `active`)
VALUES 
  (
    'admin',
    '$2a$10$gQrqz0eR.y6QmrvMzCchjOVeftWYTOpUjHdM0aLRcDF7/U0rmY14W',
    'Chef de Division',
    'CHEF_DIVISION',
    NULL,
    1
  ),
  (
    'secretaire',
    '$2a$10$gQrqz0eR.y6QmrvMzCchjOVeftWYTOpUjHdM0aLRcDF7/U0rmY14W',
    'Responsable Bureau d''Ordre',
    'RESPONSABLE_BO',
    NULL,
    1
  ),
  (
    'technique',
    '$2a$10$gQrqz0eR.y6QmrvMzCchjOVeftWYTOpUjHdM0aLRcDF7/U0rmY14W',
    'Responsable Service Technique',
    'USER_SERVICE',
    'Service Technique',
    1
  ),
  (
    'financier',
    '$2a$10$gQrqz0eR.y6QmrvMzCchjOVeftWYTOpUjHdM0aLRcDF7/U0rmY14W',
    'Responsable Service Financier',
    'USER_SERVICE',
    'Service Financier',
    1
  ),
  (
    'comptabilite',
    '$2a$10$gQrqz0eR.y6QmrvMzCchjOVeftWYTOpUjHdM0aLRcDF7/U0rmY14W',
    'Responsable Service Comptabilité',
    'USER_SERVICE',
    'Service Comptabilité',
    1
  )
ON DUPLICATE KEY UPDATE
  `password_hash` = VALUES(`password_hash`),
  `name` = VALUES(`name`),
  `role` = VALUES(`role`),
  `service` = VALUES(`service`),
  `active` = VALUES(`active`);

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- VÉRIFICATION DES COMPTES INSÉRÉS
-- =============================================================================
-- Logins créés :
-- 1. admin       -> Role: CHEF_DIVISION | Service: NULL
-- 2. secretaire  -> Role: SECRETAIRE    | Service: NULL
-- 3. technique   -> Role: USER_SERVICE  | Service: Service Technique
-- 4. financier   -> Role: USER_SERVICE  | Service: Service Financier
-- 5. comptabilite -> Role: USER_SERVICE | Service: Service Comptabilité
-- =============================================================================
