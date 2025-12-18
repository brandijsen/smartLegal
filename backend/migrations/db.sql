CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
password VARCHAR(255) NULL,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',

  verified TINYINT(1) NOT NULL DEFAULT 0,
  verification_token VARCHAR(255) DEFAULT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


CREATE TABLE documents (
  id INT AUTO_INCREMENT PRIMARY KEY,

  user_id INT NOT NULL,

  stored_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,

  status ENUM('pending', 'processing', 'done', 'failed') 
    NOT NULL DEFAULT 'pending',

  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP NULL DEFAULT NULL,

  CONSTRAINT fk_documents_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

  INDEX idx_documents_user (user_id),
  INDEX idx_documents_status (status),
  INDEX idx_documents_uploaded (uploaded_at)
);


CREATE TABLE document_results (
  id INT AUTO_INCREMENT PRIMARY KEY,

  document_id INT NOT NULL,

  raw_text LONGTEXT NOT NULL,
  parsed_json JSON NULL,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_results_document
    FOREIGN KEY (document_id)
    REFERENCES documents(id)
    ON DELETE CASCADE,

  UNIQUE KEY uk_document_result (document_id)
);


CREATE TABLE processing_stats (
  id INT AUTO_INCREMENT PRIMARY KEY,

  stat_date DATE NOT NULL UNIQUE,

  total_documents INT NOT NULL DEFAULT 0,
  processed_documents INT NOT NULL DEFAULT 0,
  failed_documents INT NOT NULL DEFAULT 0,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
