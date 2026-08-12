<?php
try {
    $pdo = new PDO("mysql:host=localhost;dbname=pnapana_db", "root", "");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec("ALTER TABLE plants ADD COLUMN last_watered DATETIME DEFAULT CURRENT_TIMESTAMP");
    echo "Column added successfully!";
} catch (Exception $e) {
    echo $e->getMessage();
}
?>
