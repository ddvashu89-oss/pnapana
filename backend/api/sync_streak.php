<?php
// backend/api/sync_streak.php
// Manages daily login streaks and dynamic emotional plant companion ("Pana") states.

require_once __DIR__ . '/../cors.php';
pnapana_cors('GET, POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

define('ALLOW_DB_FALLBACK', true);
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/auth.php';

date_default_timezone_set('Asia/Kolkata');

$user = authenticate($pdo);
$userId = (int)$user['id'];

// Fallback in case DB is offline
if (!$pdo) {
    echo json_encode([
        "status" => "success",
        "streak_days" => 1,
        "max_streak" => 1,
        "visit_status" => "same_day",
        "days_absent" => 0,
        "mood" => "happy",
        "thirsty_count" => 0,
        "companion" => [
            "name" => "Pana",
            "mood" => "happy",
            "message" => "Welcome back! Happy to see you! 🌱✨",
            "message_hi" => "वापस आने पर स्वागत है! आपको देखकर बहुत खुशी हुई! 🌱✨",
            "quote" => "Taking care of plants nurtures the soul."
        ]
    ]);
    exit;
}

try {
    // Auto-migrate users table if streak columns or coins are missing
    try {
        $checkCol = $pdo->query("SHOW COLUMNS FROM users LIKE 'last_active_date'")->fetch();
        if (!$checkCol) {
            $pdo->exec("ALTER TABLE users 
                ADD COLUMN streak_days INT DEFAULT 0,
                ADD COLUMN max_streak INT DEFAULT 0,
                ADD COLUMN last_active_date DATE DEFAULT NULL,
                ADD COLUMN streak_freeze_tokens INT DEFAULT 1");
        }
        $checkCoins = $pdo->query("SHOW COLUMNS FROM users LIKE 'coins'")->fetch();
        if (!$checkCoins) {
            $pdo->exec("ALTER TABLE users ADD COLUMN coins INT NOT NULL DEFAULT 0");
        }
    } catch (Exception $migrationEx) {
        // Continue if columns exist or user lacks ALTER permissions
    }

    // 1. Fetch current user streak info
    $stmt = $pdo->prepare("SELECT id, name, streak_days, max_streak, last_active_date, coins FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $userData = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$userData) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "User not found"]);
        exit;
    }

    $name = $userData['name'] ?: 'Friend';
    $currentStreak = (int)($userData['streak_days'] ?? 0);
    $maxStreak = (int)($userData['max_streak'] ?? 0);
    $lastActiveDate = $userData['last_active_date'];
    $coins = (int)($userData['coins'] ?? 0);

    // 2. Count total plants for this user
    $plantCountStmt = $pdo->prepare("SELECT COUNT(*) FROM plants WHERE user_id = ?");
    $plantCountStmt->execute([$userId]);
    $totalPlants = (int)$plantCountStmt->fetchColumn();

    // 3. Count thirsty plants for this user
    $thirstyStmt = $pdo->prepare("
        SELECT COUNT(*) FROM plants 
        WHERE user_id = ? 
          AND (last_watered IS NULL OR DATEDIFF(NOW(), last_watered) >= COALESCE(water_freq, 7))
    ");
    $thirstyStmt->execute([$userId]);
    $thirstyCount = (int)$thirstyStmt->fetchColumn();

    $today = new DateTime('today');
    $todayStr = $today->format('Y-m-d');
    $coinsAwarded = 0;
    $daysAbsent = 0;
    $visitStatus = 'same_day';
    $mood = 'happy';

    $isFirstVisit = empty($lastActiveDate);

    if ($isFirstVisit) {
        // First ever visit / new user signup
        $currentStreak = 1;
        $maxStreak = max(1, $maxStreak);
        $coinsAwarded = 10;
        $coins += 10;
        $visitStatus = 'first_visit';
        $mood = 'ecstatic';
    } else {
        $lastDate = new DateTime($lastActiveDate);
        $diff = $lastDate->diff($today);
        $diffDays = (int)$diff->format('%r%a');

        if ($diffDays === 0) {
            // Same calendar day visit
            $visitStatus = 'same_day';
            $mood = ($thirstyCount > 0) ? 'thirsty' : (($currentStreak >= 3) ? 'ecstatic' : 'happy');
        } elseif ($diffDays === 1) {
            // Consecutive day! Streak continues
            $currentStreak += 1;
            $maxStreak = max($maxStreak, $currentStreak);
            $coinsAwarded = 5 + min($currentStreak, 20); // Bonus coins for streak
            $coins += $coinsAwarded;
            $visitStatus = 'streak_continued';
            $mood = ($currentStreak >= 3) ? 'ecstatic' : 'happy';
        } else {
            // Missed 2 or more days! Streak broke / user returned after long time
            $daysAbsent = $diffDays;
            $currentStreak = 1; // Reset streak
            $visitStatus = 'streak_broken';
            $mood = 'sad'; // Droopy wilted face
        }
    }

    // Update database
    $updateStmt = $pdo->prepare("
        UPDATE users 
        SET streak_days = ?, max_streak = ?, last_active_date = ?, coins = ? 
        WHERE id = ?
    ");
    $updateStmt->execute([$currentStreak, $maxStreak, $todayStr, $coins, $userId]);

    // Dynamic dialogue generator
    $messageEn = '';
    $messageHi = '';

    if ($visitStatus === 'first_visit' || $totalPlants === 0) {
        // First ever visit or user has not added any plants yet: NEVER say "Welcome back"
        $messagesFirstTime = [
            [
                "en" => "Welcome to Pnapana, {$name}! 🎉 So thrilled to meet you! Let's start growing your green family together! 🌱✨",
                "hi" => "Pnapana में आपका स्वागत है, {$name}! 🎉 आपसे मिलकर बहुत खुशी हुई! चलिए मिलकर अपने पौधों का सुंदर संसार बनाते हैं! 🌱✨"
            ],
            [
                "en" => "Welcome aboard, {$name}! 🌿 I'm Pana, your plant care companion. Ready to add your first green friend? ✨",
                "hi" => "स्वागत है, {$name}! 🌿 मैं पाना हूँ, आपका प्लांट केयर साथी। चलिए आपका पहला पौधा जोड़ते हैं! ✨"
            ],
            [
                "en" => "Hello {$name}! Welcome to your new plant sanctuary! Tap 'Add Plant' to add your very first species! 🌱💚",
                "hi" => "नमस्ते {$name}! आपके नए प्लांट अभयारण्य में स्वागत है! अपना पहला पौधा जोड़ने के लिए 'Add Plant' दबाएं! 🌱💚"
            ]
        ];
        $picked = $messagesFirstTime[array_rand($messagesFirstTime)];
        $messageEn = $picked['en'];
        $messageHi = $picked['hi'];
        $mood = 'ecstatic';
    } elseif ($mood === 'sad') {
        $messagesSad = [
            [
                "en" => "Where were you? I missed you so much! My leaves were drooping without you... 🥺🥀",
                "hi" => "आप कहाँ थे? मुझे आपकी बहुत याद आई! आपके बिना मेरी पत्तियाँ मुरझा रही थीं... 🥺🥀"
            ],
            [
                "en" => "You're finally back! Don't leave me alone for so long, I was getting so thirsty! 💧",
                "hi" => "आखिरकार आप आ गए! मुझे इतने दिनों तक अकेला मत छोड़ना, मुझे बहुत प्यास लग रही थी! 💧"
            ],
            [
                "en" => "I was waiting for you every day! Let's get our streak back on track! 💚",
                "hi" => "मैं हर दिन आपका इंतज़ार कर रहा था! चलिए मिलकर अपनी स्ट्रीक फिर से शुरू करते हैं! 💚"
            ]
        ];
        $picked = $messagesSad[array_rand($messagesSad)];
        $messageEn = $picked['en'];
        $messageHi = $picked['hi'];
    } elseif ($mood === 'thirsty') {
        $messageEn = "Hey {$name}! {$thirstyCount} of your plants are really thirsty today! Give them a drink! 💧";
        $messageHi = "नमस्ते {$name}! आज आपके {$thirstyCount} पौधों को पानी चाहिए! चलिए उन्हें पानी पिलाते हैं! 💧";
    } elseif ($mood === 'ecstatic') {
        $messagesEcstatic = [
            [
                "en" => "Day {$currentStreak} streak! Look at us thriving together! High-five with a leaf! 🌿✨",
                "hi" => "लगातार {$currentStreak} दिन की स्ट्रीक! हम दोनों कमाल कर रहे हैं! 🌿✨"
            ],
            [
                "en" => "You are an amazing plant parent! My leaves are glowing with joy today! 🌟🌱",
                "hi" => "आप पौधों के बहुत अच्छे रक्षक हैं! मेरी पत्तियाँ आज खुशी से चमक रही हैं! 🌟🌱"
            ],
            [
                "en" => "Streak on fire! 🔥 Keep it going, you earned +{$coinsAwarded} bonus coins today!",
                "hi" => "शानदार स्ट्रीक! 🔥 इसे जारी रखें, आज आपको +{$coinsAwarded} बोनस सिक्के मिले हैं!"
            ]
        ];
        $picked = $messagesEcstatic[array_rand($messagesEcstatic)];
        $messageEn = $picked['en'];
        $messageHi = $picked['hi'];
    } else {
        // Returning user with plants
        $messagesHappy = [
            [
                "en" => "Welcome back, {$name}! So happy to see you today! Let's care for our green family! 🌱",
                "hi" => "वापस स्वागत है, {$name}! आज आपको देखकर बहुत खुशी हुई! चलिए पौधों की देखभाल करें! 🌱"
            ],
            [
                "en" => "Good day, sunshine! The plants are breathing happy air today! ☀️🌿",
                "hi" => "शुभ दिन! आज सभी पौधे बहुत ताजगी महसूस कर रहे हैं! ☀️🌿"
            ],
            [
                "en" => "Another beautiful day in our indoor jungle! What shall we tend to first? 🍃",
                "hi" => "हमारे बगीचे में एक और खूबसूरत दिन! आज हम पहले किसकी देखभाल करें? 🍃"
            ]
        ];
        $picked = $messagesHappy[array_rand($messagesHappy)];
        $messageEn = $picked['en'];
        $messageHi = $picked['hi'];
    }

    echo json_encode([
        "status" => "success",
        "streak_days" => $currentStreak,
        "max_streak" => $maxStreak,
        "visit_status" => $visitStatus,
        "is_first_visit" => ($visitStatus === 'first_visit' || $totalPlants === 0),
        "total_plants" => $totalPlants,
        "days_absent" => $daysAbsent,
        "coins" => $coins,
        "coins_awarded" => $coinsAwarded,
        "thirsty_count" => $thirstyCount,
        "mood" => $mood,
        "companion" => [
            "name" => "Pana",
            "mood" => $mood,
            "message" => $messageEn,
            "message_hi" => $messageHi
        ]
    ]);
} catch (Exception $e) {
    error_log("sync_streak error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Could not sync streak"]);
}
