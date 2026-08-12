<?php
try {
    $pdo = new PDO("mysql:host=localhost;dbname=pnapana_db", "root", "");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Ignore errors if columns already exist
    try { $pdo->exec("ALTER TABLE plants ADD COLUMN status_color VARCHAR(20) DEFAULT 'green'"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE plants ADD COLUMN water_freq INT DEFAULT 7"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE plants ADD COLUMN light_req VARCHAR(50) DEFAULT 'Medium'"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE plants ADD COLUMN last_watered DATETIME DEFAULT CURRENT_TIMESTAMP"); } catch (Exception $e) {}
    
    echo "Columns added successfully!";
} catch (Exception $e) {
    echo $e->getMessage();
}
?>
