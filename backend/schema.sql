CREATE DATABASE IF NOT EXISTS pnapana_db;
USE pnapana_db;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    token VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    species VARCHAR(255) NOT NULL,
    image_url VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Thriving',
    status_color VARCHAR(50) DEFAULT 'green',
    native_region VARCHAR(255),
    light_requirement VARCHAR(255),
    water_requirement VARCHAR(255),
    humidity VARCHAR(255),
    pet_friendly BOOLEAN DEFAULT FALSE,
    water_freq INT DEFAULT 7,
    light_req VARCHAR(50) DEFAULT 'Medium',
    last_watered DATETIME DEFAULT CURRENT_TIMESTAMP,
    care_plan TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS care_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plant_id INT NOT NULL,
    action VARCHAR(255) NOT NULL,
    log_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS plant_scans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plant_id INT,
    image_url MEDIUMTEXT,
    ai_analysis TEXT,
    status VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS care_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    plant_id INT,
    event_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contact_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    subject VARCHAR(255),
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS coins INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS community_posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    plant_id INT DEFAULT NULL,
    plant_name VARCHAR(255) DEFAULT NULL,
    caption TEXT NOT NULL,
    image_url MEDIUMTEXT,
    likes_count INT NOT NULL DEFAULT 0,
    coins_earned INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS post_likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_like (post_id, user_id),
    FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert dummy data for testing
INSERT INTO users (id, name, email, password) VALUES (1, 'Arjun', 'arjun@example.com', 'password123') ON DUPLICATE KEY UPDATE name='Arjun';

INSERT INTO plants (id, user_id, name, species, image_url, status, status_color, native_region, light_requirement, water_requirement, humidity, pet_friendly) VALUES 
(1, 1, 'Monstera Deliciosa', 'Monstera Deliciosa', '/monstera.png', 'Thriving', 'green', 'Tropical America', 'Bright Indirect', 'When top 2cm is dry', '50-70%', FALSE),
(2, 1, 'Areca Palm', 'Areca Palm', '/areca.png', 'Needs Water', 'orange', 'Madagascar', 'Bright Indirect', 'When top 2cm is dry', '40-60%', TRUE),
(3, 1, 'Tulsi', 'Ocimum tenuiflorum', '/tulsi.png', 'Thriving', 'green', 'India', 'Full Sun', 'Keep soil moist', '50-70%', TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name);
