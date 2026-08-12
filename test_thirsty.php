<?php
require_once 'backend/db.php';
$pdo->exec("INSERT INTO plants (user_id, name, species, water_freq, last_watered) VALUES (1, 'Thirsty Charlie', 'Monstera', 7, DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 8 DAY))");
echo "Inserted thirsty plant.";
?>
