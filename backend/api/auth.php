<?php
require_once '../config.php';
require_once '../jwt_helper.php';

function authenticate($conn) {
    // HTTP header names are case-insensitive (RFC 7230), and clients differ:
    // fetch()'s Headers object normalizes to "authorization", while a plain
    // object literal keeps "Authorization". Normalize before looking it up.
    $headers = array();
    if (function_exists('apache_request_headers')) {
        foreach (apache_request_headers() as $key => $value) {
            $headers[strtolower($key)] = $value;
        }
    }
    // Fall back to $_SERVER, including the REDIRECT_ prefix Apache adds when
    // the header is passed through a rewrite or CGI/FastCGI handler.
    foreach (array('HTTP_AUTHORIZATION', 'REDIRECT_HTTP_AUTHORIZATION') as $serverKey) {
        if (empty($headers['authorization']) && !empty($_SERVER[$serverKey])) {
            $headers['authorization'] = $_SERVER[$serverKey];
        }
    }

    $token = '';
    if (!empty($headers['authorization'])) {
        $token = trim(preg_replace('/^\s*Bearer\s+/i', '', $headers['authorization']));
    } elseif (isset($_GET['token'])) {
        $token = $_GET['token'];
    } else {
        $data = json_decode(file_get_contents('php://input'), true);
        if (isset($data['token'])) {
            $token = $data['token'];
        }
    }

    if (empty($token)) {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Unauthorized: Token missing"]);
        exit;
    }

    // The bearer token is a signed JWT. Verify its signature/expiry first, then
    // confirm the session id it carries is still the user's active one in the DB
    // (this is what makes login rotation / logout actually revoke old tokens).
    $payload = jwt_decode($token, JWT_SECRET);
    if (!$payload || !isset($payload['sub']) || !isset($payload['sid'])) {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Unauthorized: Invalid or expired token"]);
        exit;
    }

    $stmt = $conn->prepare("SELECT * FROM users WHERE id = :id AND token = :sid");
    $stmt->bindParam(':id', $payload['sub']);
    $stmt->bindParam(':sid', $payload['sid']);
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Unauthorized: Session expired, please log in again"]);
        exit;
    }

    return $user;
}

function require_admin($user) {
    if (empty($user['is_admin'])) {
        http_response_code(403);
        echo json_encode(["status" => "error", "message" => "Forbidden: Admin access required"]);
        exit;
    }
}
?>
