<?php

function pnapana_normalize_plant_setup($value) {
    if (!is_array($value)) {
        throw new InvalidArgumentException('Complete all three plant setup steps before continuing.');
    }

    $pick = static function ($key, $allowed) use ($value) {
        $selected = isset($value[$key]) && is_string($value[$key]) ? trim($value[$key]) : '';
        if (!in_array($selected, $allowed, true)) {
            throw new InvalidArgumentException('Choose a valid option for ' . str_replace('_', ' ', $key) . '.');
        }
        return $selected;
    };
    $interval = static function ($key, $allowed) use ($value) {
        $selected = filter_var($value[$key] ?? null, FILTER_VALIDATE_INT);
        if ($selected === false || !in_array((int)$selected, $allowed, true)) {
            throw new InvalidArgumentException('Choose a valid reminder interval.');
        }
        return (int)$selected;
    };

    $room = trim((string)($value['room'] ?? ''));
    if ($room === '' || mb_strlen($room) > 80) {
        throw new InvalidArgumentException('Choose where this plant will live.');
    }
    if (!array_key_exists('has_drainage', $value) || !is_bool($value['has_drainage'])) {
        throw new InvalidArgumentException('Confirm whether the pot has drainage holes.');
    }
    $reminderTime = trim((string)($value['reminder_time'] ?? ''));
    if (!preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/', $reminderTime)) {
        throw new InvalidArgumentException('Choose a valid reminder time.');
    }

    return [
        'placement' => $pick('placement', ['indoor', 'outdoor']),
        'room' => $room,
        'light' => $pick('light', ['Direct sun', 'Full sun', 'Bright indirect', 'Medium', 'Low light']),
        'pot_size' => $pick('pot_size', ['small', 'medium', 'large', 'extra-large', 'not-sure']),
        'has_drainage' => $value['has_drainage'],
        'soil_condition' => $pick('soil_condition', ['well-draining', 'dense', 'sandy', 'moisture-retaining', 'not-sure']),
        'moisture_level' => $pick('moisture_level', ['dry', 'slightly-dry', 'moist', 'wet', 'not-sure']),
        'last_watered' => $pick('last_watered', ['today', '1-3-days', '4-7-days', 'over-week', 'never', 'not-sure']),
        'last_repotted' => $pick('last_repotted', ['under-month', '1-6-months', 'over-6-months', 'never', 'not-sure']),
        'soil_check_days' => $interval('soil_check_days', [1, 2, 3, 5, 7, 10, 14]),
        'fertilizer_weeks' => $interval('fertilizer_weeks', [0, 2, 4, 6, 8, 12]),
        'rotation_days' => $interval('rotation_days', [0, 7, 14, 30]),
        'light_review_days' => $interval('light_review_days', [0, 7, 14, 30]),
        'leaf_cleaning_days' => $interval('leaf_cleaning_days', [0, 7, 14, 30]),
        'health_check_days' => $interval('health_check_days', [7, 14, 30]),
        'reminder_time' => $reminderTime,
        'notification_mode' => $pick('notification_mode', ['in-app', 'browser']),
        'completed_version' => 1,
    ];
}
function pnapana_setup_last_watered_at($selection) {
    $days = ['today' => 0, '1-3-days' => 2, '4-7-days' => 5, 'over-week' => 8];
    return array_key_exists($selection, $days)
        ? date('Y-m-d H:i:s', strtotime('-' . $days[$selection] . ' days'))
        : null;
}
