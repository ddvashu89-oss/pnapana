<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('POST, OPTIONS');
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/../botanical_catalog.php';

$rawInput = file_get_contents('php://input');
if (empty($rawInput) && php_sapi_name() === 'cli') {
    $rawInput = file_get_contents('php://stdin');
}
$data = json_decode($rawInput, true) ?? [];

$name = trim($data['name'] ?? $data['species'] ?? '');
$lang = strtolower(trim($data['lang'] ?? 'en'));
$isHi = ($lang === 'hi' || $lang === 'hi-latn');

if (empty($name)) {
    echo json_encode([
        "status" => "success",
        "ok" => true,
        "verdict" => "known",
        "message" => null,
        "suggestion" => null
    ]);
    exit;
}

$catalog = get_botanical_catalog($lang);
$cleanName = strtolower($name);

$exactMatch = false;

foreach ($catalog as $plant) {
    if (strtolower($plant['species']) === $cleanName || strtolower($plant['common_name']) === $cleanName) {
        $exactMatch = true;
        break;
    }
    foreach ($plant['aliases'] as $alias) {
        if (strtolower($alias) === $cleanName) {
            $exactMatch = true;
            break 2;
        }
        // Substring check for multi-word or compound names
        if (strlen($cleanName) >= 4 && (stripos($cleanName, $alias) !== false || stripos($alias, $cleanName) !== false)) {
            $exactMatch = true;
            break 2;
        }
    }
}

if ($exactMatch) {
    echo json_encode([
        "status" => "success",
        "ok" => true,
        "verdict" => "known",
        "message" => null,
        "suggestion" => null
    ]);
    exit;
}

// Find closest suggestion using Levenshtein distance
$bestCandidate = null;
$bestDistance = 999;

foreach ($catalog as $plant) {
    $candidate = $plant['common_name'];
    $dist = levenshtein($cleanName, strtolower($candidate));
    if ($dist < $bestDistance) {
        $bestDistance = $dist;
        $bestCandidate = $candidate;
    }
    foreach ($plant['aliases'] as $alias) {
        $dist = levenshtein($cleanName, strtolower($alias));
        if ($dist < $bestDistance) {
            $bestDistance = $dist;
            $bestCandidate = ucwords($alias);
        }
    }
}

// Threshold: length-relative distance
$maxDistance = max(2, (int)(strlen($cleanName) * 0.45));
if ($bestDistance <= $maxDistance && $bestCandidate) {
    $msg = $isHi 
        ? 'Is naam ka koi podha nahi milta. Kya aapka matlab "' . $bestCandidate . '" tha?'
        : 'No plant by that name. Did you mean "' . $bestCandidate . '"?';

    echo json_encode([
        "status" => "success",
        "ok" => false,
        "verdict" => "unknown",
        "message" => $msg,
        "suggestion" => $bestCandidate
    ]);
} else {
    $msg = $isHi 
        ? 'Is naam ka koi podha nahi milta. Kripya sahi naam daalein.'
        : 'No plant recognized by that name. Please check spelling or enter another name.';

    echo json_encode([
        "status" => "success",
        "ok" => false,
        "verdict" => "unknown",
        "message" => $msg,
        "suggestion" => null
    ]);
}
