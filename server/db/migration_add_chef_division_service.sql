-- =============================================================================
-- DTF Commune de Benslimane - Migration : Support Chef de Division comme Destinataire
-- Tables affectées : services, courriers_arrives, users
-- =============================================================================

USE `dtf_benslimane`;

-- 1. Insérer 'Chef de Division' dans la table des services
INSERT INTO `services` (`id`, `nom`, `code`) VALUES
  (4, 'Chef de Division', 'CHEF')
ON DUPLICATE KEY UPDATE `nom` = VALUES(`nom`), `code` = VALUES(`code`);

-- 2. Étendre l'ENUM service_destinataire de la table courriers_arrives
ALTER TABLE `courriers_arrives` 
MODIFY COLUMN `service_destinataire` ENUM('Service Technique', 'Service Financier', 'Service Comptabilité', 'Chef de Division') NOT NULL;

-- 3. Étendre l'ENUM service de la table users
ALTER TABLE `users` 
MODIFY COLUMN `service` ENUM('Service Technique', 'Service Financier', 'Service Comptabilité', 'Chef de Division') NULL;
