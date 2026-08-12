<?php
try {
    $pdo = new PDO("mysql:host=localhost;dbname=pnapana_db", "root", "");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec("DELETE FROM users WHERE name = 'Test Customer'");
    // Also delete any plants associated with them (optional, but good cleanup)
    $pdo->exec("DELETE FROM plants WHERE name = 'Thirsty Charlie'");
    echo "Test Customer removed successfully!";
} catch (Exception $e) {
    echo $e->getMessage();
}
?>
