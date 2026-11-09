<?php
/** Ensure the personal vacation planner table exists. */
function pnapana_ensure_vacation_schema(PDO $pdo): void {
    $pdo->exec("CREATE TABLE IF NOT EXISTS vacation_modes (
        user_id INT PRIMARY KEY,
        enabled TINYINT(1) NOT NULL DEFAULT 0,
        starts_on DATE DEFAULT NULL,
        ends_on DATE DEFAULT NULL,
        instructions VARCHAR(1000) DEFAULT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}
?>
