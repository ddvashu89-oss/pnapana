<?php
try {
    $pdo = new PDO("mysql:host=localhost;dbname=pnapana_db", "root", "");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec("CREATE TABLE IF NOT EXISTS plant_scans (id INT AUTO_INCREMENT PRIMARY KEY, plant_id INT, image_url MEDIUMTEXT, ai_analysis TEXT, status VARCHAR(50), created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
    echo "Table plant_scans created successfully!";
} catch (Exception $e) {
    echo $e->getMessage();
}
?>
