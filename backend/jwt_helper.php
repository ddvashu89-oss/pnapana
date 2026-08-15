<?php
// Minimal dependency-free JWT (HS256) encode/decode. No Composer in this project,
// so this implements just the subset of the JWT spec pnapana actually needs.

function jwt_base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function jwt_base64url_decode($data) {
    $remainder = strlen($data) % 4;
    if ($remainder) {
        $data .= str_repeat('=', 4 - $remainder);
    }
    return base64_decode(strtr($data, '-_', '+/'));
}

function jwt_encode($payload, $secret) {
    $header = ['alg' => 'HS256', 'typ' => 'JWT'];
    $headerB64 = jwt_base64url_encode(json_encode($header));
    $payloadB64 = jwt_base64url_encode(json_encode($payload));

    $signingInput = $headerB64 . '.' . $payloadB64;
    $signature = hash_hmac('sha256', $signingInput, $secret, true);
    $signatureB64 = jwt_base64url_encode($signature);

    return $signingInput . '.' . $signatureB64;
}

// Returns the decoded payload array on success, or null on bad signature, malformed input, or expiry.
function jwt_decode($jwt, $secret) {
    if (!is_string($jwt)) return null;
    $parts = explode('.', $jwt);
    if (count($parts) !== 3) return null;
    list($headerB64, $payloadB64, $signatureB64) = $parts;

    $signingInput = $headerB64 . '.' . $payloadB64;
    $expectedSignature = hash_hmac('sha256', $signingInput, $secret, true);
    $actualSignature = jwt_base64url_decode($signatureB64);

    if (!hash_equals($expectedSignature, $actualSignature)) {
        return null;
    }

    $payload = json_decode(jwt_base64url_decode($payloadB64), true);
    if (!is_array($payload)) return null;

    if (isset($payload['exp']) && time() >= (int)$payload['exp']) {
        return null; // expired
    }

    return $payload;
}
?>
