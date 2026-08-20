<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('POST, OPTIONS');
header('Content-Type: application/json');

require_once '../db.php';
require_once '../rate_limiter.php';
require_once 'auth.php';

check_rate_limit('admin_update_user', 30, 300);

$user = authenticate($pdo);
require_admin($user);

$data = json_decode(file_get_contents('php://input'), true);
$target_id = isset($data['id']) ? (int)$data['id'] : 0;

if (!$target_id) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "User id is required"]);
    exit();
}

try {
    $stmt = $pdo->prepare("SELECT id, name, email, is_admin FROM users WHERE id = ?");
    $stmt->execute([$target_id]);
    $target = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$target) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "User not found"]);
        exit();
    }

    $fields = [];
    $values = [];

    if (isset($data['name'])) {
        $name = strip_tags(trim($data['name']));
        if ($name === '' || mb_strlen($name) > 100) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Name must be between 1 and 100 characters."]);
            exit();
        }
        $fields[] = 'name = ?';
        $values[] = $name;
    }

    if (isset($data['email'])) {
        $email = strtolower(trim($data['email']));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Please enter a valid email address."]);
            exit();
        }
        $dupe = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
        $dupe->execute([$email, $target_id]);
        if ($dupe->fetch()) {
            http_response_code(409);
            echo json_encode(["status" => "error", "message" => "Email already in use by another account."]);
            exit();
        }
        $fields[] = 'email = ?';
        $values[] = $email;
    }

    if (array_key_exists('is_admin', $data)) {
        $newRole = !empty($data['is_admin']) ? 1 : 0;

        // Guard against locking every admin out of the panel.
        if ((int)$target['is_admin'] === 1 && $newRole === 0) {
            if ($target_id === (int)$user['id']) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "You cannot remove your own admin access."]);
                exit();
            }
            $count = $pdo->query("SELECT COUNT(*) FROM users WHERE is_admin = 1")->fetchColumn();
            if ((int)$count <= 1) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Cannot demote the last remaining admin."]);
                exit();
            }
        }

        $fields[] = 'is_admin = ?';
        $values[] = $newRole;
    }

    // An admin resetting someone's password also invalidates that user's active
    // session, so a stolen or shared login cannot outlive the reset.
    if (!empty($data['password'])) {
        $password = (string)$data['password'];
        if (strlen($password) < 8) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Password must be at least 8 characters long."]);
            exit();
        }
        $fields[] = 'password = ?';
        $values[] = password_hash($password, PASSWORD_DEFAULT);
        $fields[] = 'token = ?';
        $values[] = bin2hex(random_bytes(32));
    }

    if (!$fields) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "No changes supplied."]);
        exit();
    }

    $values[] = $target_id;
    $stmt = $pdo->prepare("UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?");
    $stmt->execute($values);

    $stmt = $pdo->prepare("SELECT u.id, u.name, u.email, u.is_admin, u.coins, u.created_at,
            (SELECT COUNT(*) FROM plants p WHERE p.user_id = u.id) AS plant_count
        FROM users u WHERE u.id = ?");
    $stmt->execute([$target_id]);
    $updated = $stmt->fetch(PDO::FETCH_ASSOC);
    $updated['is_admin'] = (bool)$updated['is_admin'];
    $updated['coins'] = (int)$updated['coins'];
    $updated['plant_count'] = (int)$updated['plant_count'];

    echo json_encode(["status" => "success", "message" => "User updated", "user" => $updated]);
} catch (PDOException $e) {
    error_log("admin_update_user error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Could not update the user. Please try again."]);
}
?>
