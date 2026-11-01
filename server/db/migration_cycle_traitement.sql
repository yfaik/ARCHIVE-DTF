-- =============================================================================
-- DTF Commune de Benslimane - Migration : Cycle de Traitement des Courriers Arrivés
-- Table affectée : courriers_arrives
-- Support des statuts : 'Nouveau', 'Transmis', 'En cours', 'Traité'
-- Suivi d'audit : date_prise_en_charge, date_traitement, traite_par
-- Compatible MySQL 5.7+, MySQL 8.0+, MariaDB 10.4+
-- =============================================================================

USE `dtf_benslimane`;

-- 1. Extension de la colonne statut pour inclure 'En cours' et 'Traité'
ALTER TABLE `courriers_arrives` 
MODIFY COLUMN `statut` ENUM('Nouveau', 'Transmis', 'En cours', 'Traité', 'NOUVEAU', 'TRANSMIS', 'EN_COURS', 'TRAITE') NOT NULL DEFAULT 'Nouveau';

-- 2. Ajout des colonnes de traçabilité du traitement (si non existantes)
ALTER TABLE `courriers_arrives`
ADD COLUMN IF NOT EXISTS `date_prise_en_charge` DATETIME NULL AFTER `priorite`,
ADD COLUMN IF NOT EXISTS `date_traitement` DATETIME NULL AFTER `date_prise_en_charge`,
ADD COLUMN IF NOT EXISTS `traite_par` VARCHAR(150) NULL AFTER `date_traitement`;

-- 3. Mise à jour de compatibilité sur les enregistrements existants
UPDATE `courriers_arrives` SET `statut` = 'Nouveau' WHERE `statut` = 'NOUVEAU';
UPDATE `courriers_arrives` SET `statut` = 'Transmis' WHERE `statut` = 'TRANSMIS';

DESCRIBE `courriers_arrives`;
