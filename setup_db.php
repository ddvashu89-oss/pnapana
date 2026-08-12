<?php
try {
    $pdo = new PDO("mysql:host=localhost", "root", "");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec("CREATE DATABASE IF NOT EXISTS pnapana_db");
    $pdo->exec("USE pnapana_db");
    $pdo->exec("CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100), email VARCHAR(100), password VARCHAR(255))");
    $pdo->exec("CREATE TABLE IF NOT EXISTS plants (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, name VARCHAR(100), species VARCHAR(100), image_url MEDIUMTEXT, status VARCHAR(50) DEFAULT 'Happy', status_color VARCHAR(20) DEFAULT 'green', water_freq INT, light_req VARCHAR(50), last_watered DATETIME DEFAULT CURRENT_TIMESTAMP)");
    
    // Insert a test user if empty
    $stmt = $pdo->query("SELECT COUNT(*) FROM users");
    if ($stmt->fetchColumn() == 0) {
        $pdo->exec("INSERT INTO users (name, email, password) VALUES ('Test Customer', 'test@example.com', 'password')");
    }
    
    echo "Database and tables created successfully!";
} catch (Exception $e) {
    echo $e->getMessage();
}
?>
