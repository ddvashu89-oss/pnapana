<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

require_once '../db.php';

try {
    // Fetch all plants from all users to show in the Explore feed
    $stmt = $conn->prepare("SELECT * FROM plants ORDER BY id DESC LIMIT 50");
    $stmt->execute();
    
    $plants = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(["status" => "success", "plants" => $plants]);
} catch(PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
