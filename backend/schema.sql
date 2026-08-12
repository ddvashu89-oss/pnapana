CREATE DATABASE IF NOT EXISTS pnapana_db;
USE pnapana_db;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
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

-- Insert dummy data for testing
INSERT INTO users (id, name, email, password) VALUES (1, 'Arjun', 'arjun@example.com', 'password123') ON DUPLICATE KEY UPDATE name='Arjun';

INSERT INTO plants (id, user_id, name, species, image_url, status, status_color, native_region, light_requirement, water_requirement, humidity, pet_friendly) VALUES 
(1, 1, 'Monstera Deliciosa', 'Monstera Deliciosa', '/monstera.png', 'Thriving', 'green', 'Tropical America', 'Bright Indirect', 'When top 2cm is dry', '50-70%', FALSE),
(2, 1, 'Areca Palm', 'Areca Palm', '/areca.png', 'Needs Water', 'orange', 'Madagascar', 'Bright Indirect', 'When top 2cm is dry', '40-60%', TRUE),
(3, 1, 'Tulsi', 'Ocimum tenuiflorum', '/tulsi.png', 'Thriving', 'green', 'India', 'Full Sun', 'Keep soil moist', '50-70%', TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name);
