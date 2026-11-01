-- =============================================================================
-- DTF Commune de Benslimane - Migration : Ajout de la gestion de la Priorité
-- Table affectée : courriers_arrives
-- Compatible MySQL 5.7+, MySQL 8.0+, MariaDB 10.4+ (phpMyAdmin / CLI)
-- =============================================================================

USE `dtf_benslimane`;

-- 1. Ajout de la colonne 'priorite' avec valeur par défaut 'Normal'
ALTER TABLE `courriers_arrives` 
ADD COLUMN `priorite` ENUM('Normal', 'Urgent', 'Très Urgent') NOT NULL DEFAULT 'Normal'
AFTER `statut`;

-- 2. Mise à jour de sécurité pour les enregistrements existants
UPDATE `courriers_arrives`
SET `priorite` = 'Normal'
WHERE `priorite` IS NULL OR `priorite` NOT IN ('Normal', 'Urgent', 'Très Urgent');

-- 3. Ajout de l'index pour optimiser le filtrage par niveau d'urgence
ALTER TABLE `courriers_arrives` ADD INDEX `idx_arrives_priorite` (`priorite`);
