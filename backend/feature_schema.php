<?php
/** Ensure the small tables needed by vacation care and buddy sharing exist. */
function pnapana_ensure_care_sharing_schema(PDO $pdo): void {
    $pdo->exec("CREATE TABLE IF NOT EXISTS plant_buddies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        requester_id INT NOT NULL,
        recipient_id INT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_buddy_request (requester_id, recipient_id),
        FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS vacation_modes (
        user_id INT PRIMARY KEY,
        enabled TINYINT(1) NOT NULL DEFAULT 0,
        starts_on DATE DEFAULT NULL,
        ends_on DATE DEFAULT NULL,
        buddy_id INT DEFAULT NULL,
        instructions VARCHAR(1000) DEFAULT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (buddy_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}
?>
