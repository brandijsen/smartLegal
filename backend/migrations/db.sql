-- =============================================================================
-- InvParser - Database Schema (unified migration)
-- =============================================================================
-- Uso:
--   Fresh install:  mysql -u root -p invParserDb < migrations/db.sql
--   DB esistente:  mysql -u root -p invParserDb < migrations/db.sql
--   (le migrazioni sono idempotenti, sicure da rieseguire)
-- =============================================================================

-- Crea DB se non esiste
CREATE DATABASE IF NOT EXISTS invParserDb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE invParserDb;

-- -----------------------------------------------------------------------------
-- Users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  avatar_path VARCHAR(255) NULL,

  password VARCHAR(255) NULL,
  auth_provider ENUM('email', 'google') NOT NULL DEFAULT 'email',

  verified TINYINT(1) NOT NULL DEFAULT 0,
  verification_token VARCHAR(255) DEFAULT NULL,

  reset_token VARCHAR(255) DEFAULT NULL,
  reset_token_expiry DATETIME DEFAULT NULL,

  delete_token VARCHAR(255) DEFAULT NULL,
  delete_token_expiry DATETIME DEFAULT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


-- -----------------------------------------------------------------------------
-- Documents
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
  id INT AUTO_INCREMENT PRIMARY KEY,

  user_id INT NOT NULL,

  stored_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,

  status ENUM('pending', 'processing', 'done', 'failed') 
    NOT NULL DEFAULT 'pending',

  is_defective TINYINT(1) NOT NULL DEFAULT 0,
  marked_defective_at TIMESTAMP NULL DEFAULT NULL,

  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP NULL DEFAULT NULL,

  CONSTRAINT fk_documents_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

  INDEX idx_documents_user (user_id),
  INDEX idx_documents_status (status),
  INDEX idx_documents_uploaded (uploaded_at),
  INDEX idx_documents_defective (is_defective)
);


-- -----------------------------------------------------------------------------
-- Document Results
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS document_results (
  id INT AUTO_INCREMENT PRIMARY KEY,

  document_id INT NOT NULL,

  raw_text LONGTEXT NOT NULL,
  parsed_json JSON NULL,

  manually_edited TINYINT(1) NOT NULL DEFAULT 0,
  edited_at TIMESTAMP NULL DEFAULT NULL,
  edited_by INT NULL DEFAULT NULL,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_results_document
    FOREIGN KEY (document_id)
    REFERENCES documents(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_results_edited_by 
    FOREIGN KEY (edited_by) 
    REFERENCES users(id) 
    ON DELETE SET NULL,

  UNIQUE KEY uk_document_result (document_id),
  INDEX idx_manually_edited (manually_edited)
);


-- -----------------------------------------------------------------------------
-- Processing Stats
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS processing_stats (
  id INT AUTO_INCREMENT PRIMARY KEY,

  stat_date DATE NOT NULL UNIQUE,

  total_documents INT NOT NULL DEFAULT 0,
  processed_documents INT NOT NULL DEFAULT 0,
  failed_documents INT NOT NULL DEFAULT 0,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- -----------------------------------------------------------------------------
-- Suppliers
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,

  name VARCHAR(255) NOT NULL,
  vat_number VARCHAR(50) NULL,
  address VARCHAR(500) NULL,
  email VARCHAR(150) NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_suppliers_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

  INDEX idx_suppliers_user (user_id),
  INDEX idx_suppliers_vat (user_id, vat_number),
  INDEX idx_suppliers_name (user_id, name(100))
);

-- Link document -> supplier (migration handles existing DB)
-- -----------------------------------------------------------------------------
-- Tags
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,

  name VARCHAR(100) NOT NULL,
  color VARCHAR(20) NULL DEFAULT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_tags_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

  UNIQUE KEY uk_tags_user_name (user_id, name),
  INDEX idx_tags_user (user_id)
);

CREATE TABLE IF NOT EXISTS document_tags (
  document_id INT NOT NULL,
  tag_id INT NOT NULL,

  PRIMARY KEY (document_id, tag_id),

  CONSTRAINT fk_dt_document
    FOREIGN KEY (document_id)
    REFERENCES documents(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_dt_tag
    FOREIGN KEY (tag_id)
    REFERENCES tags(id)
    ON DELETE CASCADE,

  INDEX idx_dt_tag (tag_id)
);


-- =============================================================================
-- MIGRATIONS: DB esistente (idempotente, sicuro anche su fresh install)
-- =============================================================================
DELIMITER //
CREATE PROCEDURE _migrate_invparser()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'documents' AND COLUMN_NAME = 'supplier_id') THEN
    ALTER TABLE documents ADD COLUMN supplier_id INT NULL AFTER marked_defective_at;
    ALTER TABLE documents ADD CONSTRAINT fk_documents_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;
    ALTER TABLE documents ADD INDEX idx_documents_supplier (supplier_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar_path') THEN
    ALTER TABLE users ADD COLUMN avatar_path VARCHAR(255) NULL AFTER email;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role') THEN
    SET @sql = 'ALTER TABLE users DROP COLUMN role';
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'auth_provider') THEN
    ALTER TABLE users ADD COLUMN auth_provider ENUM('email', 'google') NOT NULL DEFAULT 'email' AFTER password;
  END IF;
  -- reset_token / reset_token_expiry (forgot password)
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'reset_token') THEN
    ALTER TABLE users ADD COLUMN reset_token VARCHAR(255) DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'reset_token_expiry') THEN
    ALTER TABLE users ADD COLUMN reset_token_expiry DATETIME DEFAULT NULL;
  END IF;
  -- delete_token / delete_token_expiry (cancellazione account via link email)
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'delete_token') THEN
    ALTER TABLE users ADD COLUMN delete_token VARCHAR(255) DEFAULT NULL;
    ALTER TABLE users ADD COLUMN delete_token_expiry DATETIME DEFAULT NULL;
  END IF;
END //
DELIMITER ;
CALL _migrate_invparser();
DROP PROCEDURE IF EXISTS _migrate_invparser;

-- =============================================================================
-- LEGACY: Migrazione da vendors a suppliers
-- =============================================================================
-- Eseguire SOLO se avete già una tabella vendors e volete migrare a suppliers.
-- Non eseguire su installazione fresh (questa migrazione fallirà).
--
-- 1. Rimuovi FK da documents
--    ALTER TABLE documents DROP FOREIGN KEY fk_documents_vendor;
--
-- 2. Crea suppliers, copia dati, elimina vendors
--    CREATE TABLE IF NOT EXISTS suppliers (...);
--    INSERT INTO suppliers SELECT * FROM vendors;
--    DROP TABLE vendors;
--
-- 3. Rinomina colonna e FK
--    ALTER TABLE documents CHANGE COLUMN vendor_id supplier_id INT NULL, ...;
