CREATE DATABASE IF NOT EXISTS `dtf_benslimane` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `dtf_benslimane`;

SET FOREIGN_KEY_CHECKS = 0;
CREATE TABLE IF NOT EXISTS users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  login VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(150) NOT NULL,
  role ENUM('CHEF_DIVISION', 'RESPONSABLE_BO', 'SECRETAIRE', 'USER_SERVICE') NOT NULL,
  service ENUM('Service Technique', 'Service Financier', 'Service Comptabilité', 'Chef de Division') NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_login (login),
  INDEX idx_users_role_service (role, service)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS courriers_arrives (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  reference VARCHAR(100) NOT NULL UNIQUE,
  objet TEXT NOT NULL,
  expediteur VARCHAR(200) NOT NULL,
  date_arrivee DATE NOT NULL,
  observation TEXT NULL,
  service_destinataire ENUM('Service Technique', 'Service Financier', 'Service Comptabilité', 'Chef de Division') NOT NULL,
  statut ENUM('Nouveau', 'Transmis', 'En cours', 'Traité', 'NOUVEAU', 'TRANSMIS', 'EN_COURS', 'TRAITE') NOT NULL DEFAULT 'Nouveau',
  priorite ENUM('Normal', 'Urgent', 'Très Urgent') NOT NULL DEFAULT 'Normal',
  date_prise_en_charge DATETIME NULL,
  date_traitement DATETIME NULL,
  traite_par VARCHAR(150) NULL,
  pdf_filename VARCHAR(255) NOT NULL,
  pdf_original_name VARCHAR(255) NOT NULL,
  pdf_size BIGINT NOT NULL,
  created_by BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_arrives_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_arrives_ref (reference),
  INDEX idx_arrives_service (service_destinataire),
  INDEX idx_arrives_statut (statut),
  INDEX idx_arrives_priorite (priorite),
  INDEX idx_arrives_service_statut (service_destinataire, statut),
  INDEX idx_arrives_date (date_arrivee),
  INDEX idx_arrives_search (reference, expediteur(50))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS services (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(150) NOT NULL UNIQUE,
  code VARCHAR(50) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `services` (`id`, `nom`, `code`) VALUES
  (1, 'Service Technique', 'TECH'),
  (2, 'Service Financier', 'FIN'),
  (3, 'Service Comptabilité', 'COMPTA'),
  (4, 'Chef de Division', 'CHEF')
ON DUPLICATE KEY UPDATE `nom` = VALUES(`nom`);

CREATE TABLE IF NOT EXISTS courriers_departs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  reference VARCHAR(100) NOT NULL UNIQUE,
  objet TEXT NOT NULL,
  destinataire VARCHAR(200) NOT NULL,
  service_expediteur_id BIGINT NULL,
  date_depart DATE NOT NULL,
  observation TEXT NULL,
  pdf_filename VARCHAR(255) NOT NULL,
  pdf_original_name VARCHAR(255) NOT NULL,
  pdf_size BIGINT NOT NULL,
  created_by BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_departs_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_departs_service FOREIGN KEY (service_expediteur_id) REFERENCES services(id) ON DELETE SET NULL,
  INDEX idx_departs_ref (reference),
  INDEX idx_departs_service (service_expediteur_id),
  INDEX idx_departs_date (date_depart),
  INDEX idx_departs_search (reference, destinataire(50))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id BIGINT NULL,
  user_name VARCHAR(150) NOT NULL,
  role VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT NULL,
  action VARCHAR(100) NOT NULL,
  old_value TEXT NULL,
  new_value TEXT NULL,
  INDEX idx_audit_timestamp (timestamp),
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NULL,
  service VARCHAR(100) NULL,
  role VARCHAR(50) NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_service (service),
  INDEX idx_notif_role (role),
  INDEX idx_notif_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


INSERT INTO `users` (`login`, `password_hash`, `name`, `role`, `service`, `active`)
VALUES 
  ('admin', '$2a$10$gQrqz0eR.y6QmrvMzCchjOVeftWYTOpUjHdM0aLRcDF7/U0rmY14W', 'Chef de Division', 'CHEF_DIVISION', NULL, 1),
  ('secretaire', '$2a$10$gQrqz0eR.y6QmrvMzCchjOVeftWYTOpUjHdM0aLRcDF7/U0rmY14W', 'Responsable Bureau d''Ordre', 'RESPONSABLE_BO', NULL, 1),
  ('technique', '$2a$10$gQrqz0eR.y6QmrvMzCchjOVeftWYTOpUjHdM0aLRcDF7/U0rmY14W', 'Responsable Service Technique', 'USER_SERVICE', 'Service Technique', 1),
  ('financier', '$2a$10$gQrqz0eR.y6QmrvMzCchjOVeftWYTOpUjHdM0aLRcDF7/U0rmY14W', 'Responsable Service Financier', 'USER_SERVICE', 'Service Financier', 1),
  ('comptabilite', '$2a$10$gQrqz0eR.y6QmrvMzCchjOVeftWYTOpUjHdM0aLRcDF7/U0rmY14W', 'Responsable Service Comptabilité', 'USER_SERVICE', 'Service Comptabilité', 1)
ON DUPLICATE KEY UPDATE
  `password_hash` = VALUES(`password_hash`),
  `name` = VALUES(`name`),
  `role` = VALUES(`role`),
  `service` = VALUES(`service`),
  `active` = VALUES(`active`);

SET FOREIGN_KEY_CHECKS = 1;
