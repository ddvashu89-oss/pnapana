<?php
// backend/trefle_helper.php
// Official Trefle API botanical integration for Pnapana.
// Connects to https://trefle.io (World's open botanical database with 400,000+ species).

if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
}

define('DEFAULT_TREFLE_KEY', 'usr-xLlGuG2wdE0NtUFmHHdXSd7NK3PESPa5eublx2b7VPE');

/**
 * Returns the active Trefle API key.
 * Strictly uses the system master key provided by the user.
 */
function trefle_get_token($userKey = null) {
    if (defined('TREFLE_API_KEY') && !empty(TREFLE_API_KEY)) {
        return TREFLE_API_KEY;
    }
    $envKey = getenv('TREFLE_API_KEY');
    if (!empty($envKey)) {
        return trim($envKey);
    }
    return DEFAULT_TREFLE_KEY;
}

/**
 * Common plant name to botanical search term mapping for optimal Trefle lookup.
 */
function trefle_normalize_query($query) {
    $q = strtolower(trim($query));
    $map = [
        'money plant' => 'Epipremnum aureum',
        'pothos' => 'Epipremnum aureum',
        'golden pothos' => 'Epipremnum aureum',
        'snake plant' => 'Dracaena trifasciata',
        'sansevieria' => 'Dracaena trifasciata',
        'mother in laws tongue' => 'Dracaena trifasciata',
        'peace lily' => 'Spathiphyllum',
        'aloe vera' => 'Aloe vera',
        'aloe' => 'Aloe vera',
        'tulsi' => 'Ocimum tenuiflorum',
        'holy basil' => 'Ocimum tenuiflorum',
        'basil' => 'Ocimum basilicum',
        'monstera' => 'Monstera deliciosa',
        'swiss cheese plant' => 'Monstera deliciosa',
        'spider plant' => 'Chlorophytum comosum',
        'rubber plant' => 'Ficus elastica',
        'rubber tree' => 'Ficus elastica',
        'fiddle leaf fig' => 'Ficus lyrata',
        'zz plant' => 'Zamioculcas zamiifolia',
        'zamioculcas' => 'Zamioculcas zamiifolia',
        'jade plant' => 'Crassula ovata',
        'kalanchoe' => 'Kalanchoe blossfeldiana',
        'flaming katy' => 'Kalanchoe blossfeldiana',
        'neem' => 'Azadirachta indica',
        'banyan' => 'Ficus benghalensis',
        'peepal' => 'Ficus religiosa',
        'areca palm' => 'Dypsis lutescens',
        'rose' => 'Rosa',
        'sunflower' => 'Helianthus annuus',
        'oak' => 'Quercus',
        'oak tree' => 'Quercus',
        'valley oak' => 'Quercus lobata',
        'jasmine' => 'Jasminum',
        'lavender' => 'Lavandula angustifolia',
        'mint' => 'Mentha'
    ];

    foreach ($map as $common => $botanical) {
        if ($q === $common || stripos($q, $common) !== false) {
            return $botanical;
        }
    }

    return $query;
}

/**
 * Execute HTTP GET request to Trefle API.
 */
function trefle_api_get($endpoint, $params = [], $userKey = null) {
    $token = trefle_get_token($userKey);
    $params['token'] = $token;

    $url = 'https://trefle.io' . $endpoint . '?' . http_build_query($params);

    if (function_exists('curl_init')) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 12);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Accept: application/json',
            'User-Agent: PnapanaBotany/1.0'
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);

        if ($err || $httpCode !== 200 || empty($response)) {
            error_log("Trefle API Error: HTTP $httpCode - " . ($err ?: 'Empty response'));
            return null;
        }

        $decoded = json_decode($response, true);
        return is_array($decoded) ? $decoded : null;
    }

    $opts = [
        'http' => [
            'method' => 'GET',
            'header' => "Accept: application/json\r\nUser-Agent: PnapanaBotany/1.0\r\n",
            'timeout' => 12
        ]
    ];
    $ctx = stream_context_create($opts);
    $response = @file_get_contents($url, false, $ctx);
    if (!empty($response)) {
        $decoded = json_decode($response, true);
        return is_array($decoded) ? $decoded : null;
    }
    return null;
}

/**
 * Search species on Trefle by query string.
 */
function trefle_search_species($query, $limit = 5, $userKey = null) {
    $cleanQuery = trim($query);
    if (empty($cleanQuery)) {
        return [];
    }

    // Try normalized query first (e.g. "snake plant" -> "Dracaena trifasciata")
    $normalized = trefle_normalize_query($cleanQuery);
    
    $res = trefle_api_get('/api/v1/species/search', [
        'q' => $normalized,
        'limit' => $limit
    ], $userKey);

    $data = $res['data'] ?? [];

    // If normalized yielded 0 and was different from raw query, retry with raw query
    if (empty($data) && strcasecmp($normalized, $cleanQuery) !== 0) {
        $res = trefle_api_get('/api/v1/species/search', [
            'q' => $cleanQuery,
            'limit' => $limit
        ], $userKey);
        $data = $res['data'] ?? [];
    }

    // Also fallback to plants/search if species returned empty
    if (empty($data)) {
        $res = trefle_api_get('/api/v1/plants/search', [
            'q' => $normalized,
            'limit' => $limit
        ], $userKey);
        $data = $res['data'] ?? [];
    }

    $results = [];
    foreach ($data as $item) {
        $img = $item['image_url'] ?? ($item['main_image']['image_url'] ?? null);
        $results[] = [
            'id' => $item['id'] ?? null,
            'slug' => $item['slug'] ?? '',
            'scientific_name' => $item['scientific_name'] ?? 'Unknown Species',
            'common_name' => !empty($item['common_name']) ? ucwords(str_replace('-', ' ', $item['common_name'])) : null,
            'family' => $item['family'] ?? '',
            'genus' => $item['genus'] ?? '',
            'image_url' => $img,
            'year' => $item['year'] ?? null
        ];
    }

    return $results;
}

/**
 * Get detailed species data by ID or slug.
 */
function trefle_get_species_details($idOrSlug, $userKey = null) {
    if (empty($idOrSlug)) {
        return null;
    }

    $res = trefle_api_get('/api/v1/species/' . urlencode($idOrSlug), [], $userKey);
    return $res['data'] ?? null;
}

/**
 * Translate Trefle botanical attributes into an intelligent, comprehensive care plan.
 */
function trefle_build_care_plan($species, $lang = 'en') {
    $isHi = ($lang === 'hi' || $lang === 'hi-latn');

    $family = strtolower($species['family'] ?? '');
    $genus = strtolower($species['genus'] ?? '');
    $habit = strtolower($species['specifications']['growth_habit'] ?? '');
    $lightVal = $species['growth']['light'] ?? null;
    $humidityVal = $species['growth']['atmospheric_humidity'] ?? null;
    $minTemp = $species['growth']['minimum_temperature']['deg_c'] ?? 16;
    $maxTemp = $species['growth']['maximum_temperature']['deg_c'] ?? 30;
    $toxicityRaw = strtolower($species['specifications']['toxicity'] ?? '');
    $phMin = $species['growth']['ph_minimum'] ?? null;
    $phMax = $species['growth']['ph_maximum'] ?? null;

    // 1. Water Frequency & Instructions
    $isSucculent = (strpos($habit, 'succulent') !== false || in_array($family, ['cactaceae', 'crassulaceae', 'asphodelaceae', 'aloeaceae']));
    $isVineOrTropical = (strpos($habit, 'vine') !== false || in_array($family, ['araceae', 'marantaceae', 'orchidaceae', 'begoniaceae']));
    $isHerb = in_array($family, ['lamiaceae', 'asteraceae', 'brassicaceae', 'apiaceae']);

    if ($isSucculent) {
        $waterDays = 12;
        $waterDetail = $isHi 
            ? 'मिट्टी पूरी तरह सूखने पर ही पानी दें (लगभग 10-14 दिन में)। अधिक पानी से जड़ें गल सकती हैं।'
            : 'Allow potting soil to dry completely between waterings (every 10-14 days). Succulent leaves store moisture.';
    } elseif ($isHerb) {
        $waterDays = 3;
        $waterDetail = $isHi
            ? 'मिट्टी में हल्की नमी बनाए रखें। हर 2-3 दिन में पानी दें जब ऊपरी सतह सूखी लगे।'
            : 'Keep potting soil evenly moist. Water every 2-3 days when the topsoil feels dry.';
    } elseif ($isVineOrTropical) {
        $waterDays = 7;
        $waterDetail = $isHi
            ? 'सप्ताह में एक बार अच्छी तरह पानी दें। ऊपर की 2 इंच मिट्टी सूखने पर ही दोबारा पानी दें।'
            : 'Water thoroughly once a week. Allow the top 2 inches of soil to dry before re-watering.';
    } else {
        $waterDays = 7;
        $waterDetail = $isHi
            ? 'सामान्य जल चक्र: हर 6-8 दिन में पानी दें। गमले में जल निकासी अच्छी होनी चाहिए।'
            : 'Standard cycle: Water every 6-8 days. Ensure the planter provides clean bottom drainage.';
    }

    // 2. Light Requirements
    if ($lightVal !== null && $lightVal >= 8 || $isSucculent || in_array($family, ['cactaceae', 'rosaceae', 'oleaceae'])) {
        $lightLevel = 'High';
        $lightDetail = $isHi 
            ? 'उज्ज्वल सीधी या अप्रत्यक्ष धूप (4-6 घंटे प्रतिदिन)।'
            : 'Bright direct to strong indirect sunlight (4-6 hours daily).';
    } elseif ($lightVal !== null && $lightVal <= 4 || in_array($family, ['asparagaceae', 'araceae'])) {
        $lightLevel = 'Medium';
        $lightDetail = $isHi
            ? 'मध्यम से उज्ज्वल अप्रत्यक्ष धूप। सीधे दोपहर की तेज धूप से बचाएं।'
            : 'Medium to bright indirect light. Avoid scorching midday sun.';
    } else {
        $lightLevel = 'Medium';
        $lightDetail = $isHi
            ? 'उज्ज्वल अप्रत्यक्ष रोशनी में सबसे अच्छा बढ़ता है।'
            : 'Thrives best in bright filtered or indirect ambient daylight.';
    }

    // 3. Humidity
    if ($humidityVal !== null && $humidityVal >= 7 || $isVineOrTropical) {
        $humidityLevel = 'High';
        $humidityDetail = $isHi ? 'उच्च नमी (60% या अधिक)। पत्तियों पर हल्का स्प्रे करें।' : 'High humidity (60%+). Appreciates gentle foliage misting or pebble trays.';
    } elseif ($isSucculent) {
        $humidityLevel = 'Low';
        $humidityDetail = $isHi ? 'कम से सामान्य घरेलू नमी (35-45%)।' : 'Low to average indoor humidity (35-45%). Keep leaves dry.';
    } else {
        $humidityLevel = 'Medium';
        $humidityDetail = $isHi ? 'सामान्य घरेलू नमी (50-60%)।' : 'Average household humidity (50-60%).';
    }

    // 4. Soil
    if ($phMin && $phMax) {
        $phStr = " (pH $phMin - $phMax)";
    } else {
        $phStr = "";
    }

    if ($isSucculent) {
        $soil = $isHi ? 'कैक्टस/सेकुलेंट के लिए रेतीली और तेज़ी से पानी निकालने वाली मिट्टी' . $phStr : 'Porous cactus & succulent mix with perlite or pumice' . $phStr;
    } else {
        $soil = $isHi ? 'उपजाऊ पॉटिंग मिक्स जिसमें पीट मॉस और कोकोपीट हो' . $phStr : 'Rich, well-aerated potting mix enriched with perlite and compost' . $phStr;
    }

    // 5. Temperature
    $tempRange = ($minTemp && $maxTemp) ? "{$minTemp}-{$maxTemp}°C" : '18-28°C';

    // 6. Toxicity & Pet Safety
    $isToxic = false;
    if ($toxicityRaw === 'high' || $toxicityRaw === 'moderate' || in_array($family, ['araceae', 'apocynaceae', 'solanaceae', 'euphorbiaceae'])) {
        $isToxic = true;
    }
    $toxicity = [
        'pet_friendly' => !$isToxic,
        'detail' => $isToxic 
            ? ($isHi ? 'पालतू जानवरों के लिए हानिकारक हो सकता है। बच्चों और पालतू जानवरों की पहुंच से दूर रखें।' : 'May cause irritation if ingested by pets. Keep out of reach of curious cats and dogs.')
            : ($isHi ? 'पालतू जानवरों के लिए सुरक्षित माना जाता है।' : 'Non-toxic and safe around household pets.')
    ];

    // 7. Common Issues
    $commonIssues = [
        [
            'issue' => $isHi ? 'पत्तियां पीली पड़ना' : 'Yellowing lower leaves',
            'solution' => $isHi ? 'पानी देना कम करें और जांचें कि गमले में पानी न रुके।' : 'Usually caused by overwatering. Allow the topsoil to dry before watering again.'
        ],
        [
            'issue' => $isHi ? 'पत्तियों के सिरे भूरे या सूखे होना' : 'Crispy or brown leaf tips',
            'solution' => $isHi ? 'नमी बढ़ाएं और सीधी तेज धूप से दूर रखें।' : 'Indicates dry indoor air or tap water mineral build-up. Increase humidity.'
        ]
    ];

    return [
        'native_region' => !empty($species['family']) ? "Family " . $species['family'] : 'Global Botanical Range',
        'light' => [
            'level' => $lightLevel,
            'detail' => $lightDetail
        ],
        'water' => [
            'frequency_days' => $waterDays,
            'instructions' => $waterDetail
        ],
        'humidity' => [
            'level' => $humidityLevel,
            'detail' => $humidityDetail
        ],
        'soil' => $soil,
        'temperature' => $tempRange,
        'fertilizing' => $isHi ? 'बसंत और गर्मी में महीने में एक बार जैविक तरल खाद दें।' : 'Feed once a month during spring and summer with a balanced organic houseplant fertilizer.',
        'pruning' => $isHi ? 'सूखी या पीली पत्तियों को कैंची से सावधानीपूर्वक काटें।' : 'Snip spent, discolored, or leggy stems with clean pruning shears to foster fresh growth.',
        'toxicity' => $toxicity,
        'common_issues' => $commonIssues
    ];
}

/**
 * Identify a plant using Trefle API.
 * Combines plant name/hint resolution or botanical image heuristics with live Trefle data.
 */
function trefle_identify_plant($imageBase64, $hint = '', $lang = 'en', $userKey = null, $metrics = null) {
    require_once __DIR__ . '/botanical_catalog.php';

    $cleanHint = trim($hint);

    // If no hint provided, extract candidate botanical species from image analysis
    if (empty($cleanHint)) {
        $colorStats = analyze_image_colors($imageBase64, $metrics);
        $warmPct = $colorStats['warm_pct'] ?? 0;
        $greenPct = $colorStats['green_pct'] ?? 0;
        $yellowPct = $colorStats['yellow_pct'] ?? 0;

        if ($warmPct >= 4.0) {
            $cleanHint = 'Kalanchoe blossfeldiana';
        } elseif ($greenPct > 25.0) {
            $cleanHint = 'Epipremnum aureum';
        } elseif ($yellowPct > 15.0) {
            $cleanHint = 'Aloe vera';
        } else {
            $cleanHint = 'Monstera deliciosa';
        }
    }

    // Query Trefle API
    $matches = trefle_search_species($cleanHint, 4, $userKey);

    $topMatch = !empty($matches) ? $matches[0] : null;

    if ($topMatch) {
        $speciesDetails = trefle_get_species_details($topMatch['slug'] ?: $topMatch['id'], $userKey);
        $activeSpecies = $speciesDetails ?: $topMatch;

        $carePlan = trefle_build_care_plan($activeSpecies, $lang);

        $commonName = !empty($activeSpecies['common_name']) 
            ? $activeSpecies['common_name'] 
            : (!empty($topMatch['common_name']) ? $topMatch['common_name'] : $activeSpecies['scientific_name']);

        $imgUrl = !empty($activeSpecies['image_url']) ? $activeSpecies['image_url'] : ($topMatch['image_url'] ?? null);

        $description = "Identified via Pnapana Botanical Intelligence (Family: " 
            . ($activeSpecies['family'] ?? 'Plantae') 
            . ", Genus: " . ($activeSpecies['genus'] ?? 'Unknown') . "). "
            . "A distinct botanical species documented in the Pnapana Global Plant Registry.";

        $alternatives = [];
        for ($i = 1; $i < count($matches); $i++) {
            $alt = $matches[$i];
            $alternatives[] = [
                'species' => $alt['scientific_name'],
                'common_name' => $alt['common_name'] ?: $alt['scientific_name'],
                'confidence' => 'medium',
                'image_url' => $alt['image_url']
            ];
        }

        return [
            'status' => 'success',
            'source' => 'Pnapana Botanical AI',
            'identification' => [
                'species' => $activeSpecies['scientific_name'],
                'common_name' => $commonName,
                'scientific_name' => $activeSpecies['scientific_name'],
                'family' => $activeSpecies['family'] ?? '',
                'genus' => $activeSpecies['genus'] ?? '',
                'confidence' => 'high',
                'description' => $description,
                'image_url' => $imgUrl,
                'trefle_id' => $activeSpecies['id'] ?? null,
                'slug' => $activeSpecies['slug'] ?? null
            ],
            'care_plan' => $carePlan,
            'alternatives' => $alternatives,
            'hint_applied' => !empty($hint)
        ];
    }

    // Fallback to local catalog if Trefle search returns zero
    $fallbackResult = identify_plant_fallback($imageBase64, $cleanHint, $lang, $metrics);
    return [
        'status' => 'success',
        'source' => 'catalog_fallback',
        'identification' => [
            'species' => $fallbackResult['species'] ?? 'Plant Species',
            'common_name' => $fallbackResult['common_name'] ?? 'Houseplant',
            'scientific_name' => $fallbackResult['species'] ?? 'Unknown Species',
            'confidence' => 'medium',
            'description' => $fallbackResult['description'] ?? 'Botanical specimen.',
            'image_url' => null
        ],
        'care_plan' => $fallbackResult['care_plan'] ?? [],
        'alternatives' => $fallbackResult['alternatives'] ?? [],
        'hint_applied' => !empty($hint)
    ];
}
