<?php
// backend/api/search_trefle.php
// Instant live botanical search powered by Trefle.io (400,000+ plant species)

require_once __DIR__ . '/../cors.php';
pnapana_cors('GET, POST, OPTIONS');
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../trefle_helper.php';

$query = '';
$limit = 6;

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $query = trim($_GET['q'] ?? $_GET['query'] ?? '');
    if (isset($_GET['limit'])) {
        $limit = min(20, max(1, (int)$_GET['limit']));
    }
} else {
    $raw = file_get_contents('php://input');
    $body = json_decode($raw, true) ?? [];
    $query = trim($body['q'] ?? $body['query'] ?? '');
    if (isset($body['limit'])) {
        $limit = min(20, max(1, (int)$body['limit']));
    }
}

if (empty($query)) {
    echo json_encode([
        "status" => "success",
        "query" => "",
        "count" => 0,
        "data" => []
    ]);
    exit;
}

$results = trefle_search_species($query, $limit);

echo json_encode([
    "status" => "success",
    "source" => "Pnapana Botanical AI",
    "query" => $query,
    "count" => count($results),
    "data" => $results
]);
