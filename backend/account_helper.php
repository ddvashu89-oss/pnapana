<?php
/**
 * Post-registration provisioning shared by the public signup form and the
 * admin "create user" screen, so an account looks identical whichever door
 * it came through.
 */

/**
 * Builds the human-facing customer identifier, e.g. PNP-2026-000042.
 * Derived from the internal auto-increment id, so it is unique by construction
 * and needs no counter table or locking.
 */
function build_customer_id($userId, $createdAt = null) {
    $year = $createdAt ? date('Y', strtotime($createdAt)) : date('Y');
    return 'PNP-' . $year . '-' . str_pad((string)$userId, 6, '0', STR_PAD_LEFT);
}

/**
 * Assigns a customer id and places the account on the Free plan.
 * Returns the customer id, or null if provisioning could not complete.
 */
function provision_new_account(PDO $pdo, $userId) {
    $userId = (int)$userId;
    $customerId = build_customer_id($userId);

    try {
        $stmt = $pdo->prepare("UPDATE users SET customer_id = ? WHERE id = ?");
        $stmt->execute([$customerId, $userId]);

        $freePlanId = $pdo->query("SELECT id FROM subscription_plans WHERE code = 'FREE'")->fetchColumn();
        if ($freePlanId) {
            $stmt = $pdo->prepare(
                "INSERT INTO subscriptions (user_id, plan_id, status, expires_at) VALUES (?, ?, 'ACTIVE', NULL)"
            );
            $stmt->execute([$userId, $freePlanId]);
        }

        return $customerId;
    } catch (PDOException $e) {
        // A failure here must not block the registration itself; the migration
        // backfill will pick up any account that slipped through.
        error_log("provision_new_account failed for user $userId: " . $e->getMessage());
        return null;
    }
}

/**
 * Returns the user's effective plan, treating a lapsed premium subscription as
 * Free. Callers use this to gate premium-only features.
 */
function get_active_plan(PDO $pdo, $userId) {
    $stmt = $pdo->prepare(
        "SELECT p.*, s.status AS subscription_status, s.expires_at
         FROM subscriptions s
         JOIN subscription_plans p ON p.id = s.plan_id
         WHERE s.user_id = ? AND s.status = 'ACTIVE'
           AND (s.expires_at IS NULL OR s.expires_at > NOW())
         ORDER BY p.price_inr DESC, s.id DESC
         LIMIT 1"
    );
    $stmt->execute([(int)$userId]);
    $plan = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$plan) {
        $stmt = $pdo->prepare("SELECT * FROM subscription_plans WHERE code = 'FREE'");
        $stmt->execute();
        $plan = $stmt->fetch(PDO::FETCH_ASSOC);
    }

    if ($plan) {
        $plan['max_plants'] = $plan['max_plants'] === null ? null : (int)$plan['max_plants'];
        $plan['ai_diagnosis'] = (bool)$plan['ai_diagnosis'];
        $plan['ai_chat'] = (bool)$plan['ai_chat'];
        $plan['weather_care'] = (bool)$plan['weather_care'];
        $plan['price_inr'] = (float)$plan['price_inr'];
    }

    return $plan;
}
