<?php
require_once '../config.php';
require_once '../jwt_helper.php';

function authenticate($conn) {
    // Check Authorization header first
    $headers = null;
    if (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
    } else {
        $headers = array(
            'Authorization' => isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : ''
        );
    }

    $token = '';
    if (isset($headers['Authorization']) && !empty($headers['Authorization'])) {
        $token = str_replace('Bearer ', '', $headers['Authorization']);
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
