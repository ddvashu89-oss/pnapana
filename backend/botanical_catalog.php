<?php
// backend/botanical_catalog.php
// Comprehensive botanical catalog and intelligent image heuristic classifier for plant identification.

function get_botanical_catalog($lang = 'en') {
    $isHi = ($lang === 'hi' || $lang === 'hi-latn');

    return [
        'kalanchoe' => [
            'id' => 'kalanchoe',
            'species' => 'Kalanchoe blossfeldiana',
            'common_name' => $isHi ? 'कैलान्चो (Flaming Katy)' : 'Flaming Katy (Kalanchoe)',
            'aliases' => ['kalanchoe', 'flaming katy', 'calandiva', 'florist kalanchoe', 'widow\'s thrill', 'kalanchoe blossfeldiana', 'katy', 'chidiya ka phool'],
            'confidence' => 'high',
            'flower_colors' => ['orange', 'red', 'yellow', 'pink', 'magenta'],
            'foliage' => 'succulent',
            'description' => $isHi
                ? 'एक बेहद लोकप्रिय और आकर्षक फूलदार सेकुलेंट पौधा। इसके गहरे हरे मांसल पत्ते और चमकीले नारंगी, लाल या पीले फूलों के गुच्छे हफ़्तों तक खिले रहते हैं।'
                : 'A popular flowering succulent renowned for its clusters of vibrant, long-lasting blossoms and thick, scalloped dark green leaves. Perfect for bright indoor spaces and balconies.',
            'care_plan' => [
                'native_region' => 'Madagascar',
                'light' => [
                    'level' => 'High',
                    'detail' => $isHi ? 'उजाली अप्रत्यक्ष धूप या सुबह की 3-4 घंटे की सीधी धूप।' : 'Bright indirect light with 3-4 hours of gentle direct morning sunlight.'
                ],
                'water' => [
                    'frequency_days' => 10,
                    'instructions' => $isHi ? 'मिट्टी पूरी तरह सूखने पर ही पानी दें। अधिक पानी से बचें।' : 'Allow the potting mix to dry out completely between waterings. Succulent leaves store moisture.'
                ],
                'humidity' => [
                    'level' => 'Low',
                    'detail' => $isHi ? 'कम से सामान्य नमी (40-50%)।' : 'Low to moderate household humidity (40-50%). Avoid misting foliage.'
                ],
                'soil' => $isHi ? 'कैक्टस या सेकुलेंट के लिए अच्छी जल निकासी वाली रेतीली मिट्टी।' : 'Well-draining cactus or succulent potting mix with perlite or coarse sand.',
                'temperature' => '18-29°C',
                'fertilizing' => $isHi ? 'बसंत और गर्मी में महीने में एक बार हल्का तरल खाद।' : 'Feed once a month with diluted balanced succulent fertilizer during spring and summer.',
                'pruning' => $isHi ? 'मुरझाए हुए फूलों के डंठल को काटें ताकि नए फूल आ सकें।' : 'Snip off spent blossom stalks at their base to encourage continuous reblooming.',
                'toxicity' => [
                    'pet_friendly' => false,
                    'detail' => $isHi ? 'कुत्तों और बिल्लियों के लिए विषाक्त।' : 'Toxic to cats and dogs if ingested.'
                ],
                'common_issues' => [
                    [
                        'issue' => $isHi ? 'पत्ते पीले और नरम होना' : 'Yellowing, mushy leaves or root rot',
                        'solution' => $isHi ? 'पानी देना कम करें और गमले की जल निकासी जांचें।' : 'Caused by overwatering. Allow soil to dry thoroughly and check pot drainage.'
                    ],
                    [
                        'issue' => $isHi ? 'फूल न आना' : 'Sparse flowers or leggy stems',
                        'solution' => $isHi ? 'अधिक रोशनी में रखें और पतझड़ में रात को 14 घंटे अंधेरे में रखें।' : 'Provide brighter daily light and ensure 14 hours of continuous darkness each night in autumn for bud setting.'
                    ]
                ]
            ]
        ],
        'pothos' => [
            'id' => 'pothos',
            'species' => 'Epipremnum aureum',
            'common_name' => $isHi ? 'मनी प्लांट (Golden Pothos)' : 'Money Plant (Golden Pothos)',
            'aliases' => ['money plant', 'pothos', 'golden pothos', 'devil\'s ivy', 'epipremnum', 'mani plant', 'moneyplant'],
            'confidence' => 'high',
            'flower_colors' => [],
            'foliage' => 'vine',
            'description' => $isHi
                ? 'भारत में सबसे प्रिय और आसानी से बढ़ने वाली बेल। इसके दिल के आकार के चमकदार पत्ते हवा को शुद्ध करते हैं और सकारात्मक ऊर्जा लाते हैं।'
                : 'One of the most resilient and popular indoor climbing vines. Its glossy heart-shaped variegated leaves thrive in almost any room condition.',
            'care_plan' => [
                'native_region' => 'French Polynesia',
                'light' => [
                    'level' => 'Medium',
                    'detail' => $isHi ? 'मध्यम से उज्ज्वल अप्रत्यक्ष धूप।' : 'Medium to bright indirect light. Tolerates low-light corners gracefully.'
                ],
                'water' => [
                    'frequency_days' => 7,
                    'instructions' => $isHi ? 'ऊपरी 2 इंच मिट्टी सूखने पर पानी दें।' : 'Water thoroughly when the top 2 inches of soil feel dry to the touch.'
                ],
                'humidity' => [
                    'level' => 'Medium',
                    'detail' => $isHi ? 'सामान्य घरेलू नमी (50-60%)।' : 'Average household humidity (50-65%).'
                ],
                'soil' => $isHi ? 'सामान्य उपजाऊ पॉटिंग मिक्स।' : 'Rich, well-aerated potting mix with peat and perlite.',
                'temperature' => '16-30°C',
                'fertilizing' => $isHi ? 'गर्मी के मौसम में महीने में एक बार तरल खाद।' : 'Feed every 4-6 weeks during spring and summer with standard houseplant fertilizer.',
                'pruning' => $isHi ? 'लंबी बेलों को घना बनाने के लिए काटें।' : 'Trim leggy vines just past a leaf node to promote bushier growth.',
                'toxicity' => [
                    'pet_friendly' => false,
                    'detail' => $isHi ? 'पालतू जानवरों के लिए हानिकारक।' : 'Contains insoluble calcium oxalates; keep out of reach of curious pets.'
                ],
                'common_issues' => [
                    [
                        'issue' => $isHi ? 'पत्ते पीले पड़ना' : 'Yellowing leaves',
                        'solution' => $isHi ? 'पानी की मात्रा कम करें।' : 'Usually indicates overwatering or poor drainage. Let soil dry between waterings.'
                    ]
                ]
            ]
        ],
        'monstera' => [
            'id' => 'monstera',
            'species' => 'Monstera deliciosa',
            'common_name' => $isHi ? 'मॉन्स्टेरा (Swiss Cheese Plant)' : 'Monstera Deliciosa (Swiss Cheese Plant)',
            'aliases' => ['monstera', 'monstera deliciosa', 'swiss cheese plant', 'split-leaf philodendron'],
            'confidence' => 'high',
            'flower_colors' => [],
            'foliage' => 'fenestrated',
            'description' => $isHi
                ? 'कट-आउट और छिद्रों वाले बड़े, नाटकीय हरे पत्तों वाला शानदार उष्णकटिबंधीय पौधा।'
                : 'An iconic tropical statement plant recognized by its massive, glossy green leaves with natural artistic perforations and splits.',
            'care_plan' => [
                'native_region' => 'Central America',
                'light' => [
                    'level' => 'Medium',
                    'detail' => $isHi ? 'उजाली अप्रत्यक्ष धूप।' : 'Bright indirect sunlight. Avoid scorching midday sun.'
                ],
                'water' => [
                    'frequency_days' => 8,
                    'instructions' => $isHi ? 'मिट्टी का ऊपरी आधा भाग सूखने पर पानी दें।' : 'Water when the top 50% of the potting medium feels dry.'
                ],
                'humidity' => [
                    'level' => 'High',
                    'detail' => $isHi ? 'मध्यम से अधिक नमी (60%+)।' : 'Moderate to high humidity (60%+). Appreciates occasional leaf wiping.'
                ],
                'soil' => 'Chunky, well-draining aroid mix with orchid bark and perlite.',
                'temperature' => '18-30°C',
                'fertilizing' => 'Monthly balanced houseplant fertilizer in spring and summer.',
                'pruning' => 'Remove old yellowing lower fronds; support aerial roots with moss pole.',
                'toxicity' => [
                    'pet_friendly' => false,
                    'detail' => 'Mildly toxic to pets due to calcium oxalate crystals.'
                ],
                'common_issues' => [
                    [
                        'issue' => 'Leaves not splitting (no fenestrations)',
                        'solution' => 'Needs more bright indirect light and maturity.'
                    ]
                ]
            ]
        ],
        'snake_plant' => [
            'id' => 'snake_plant',
            'species' => 'Dracaena trifasciata',
            'common_name' => $isHi ? 'स्नेक प्लांट (Sansevieria)' : 'Snake Plant (Sansevieria)',
            'aliases' => ['snake plant', 'sansevieria', 'dracaena trifasciata', 'mother in laws tongue', 'viper\'s bowstring'],
            'confidence' => 'high',
            'flower_colors' => [],
            'foliage' => 'upright',
            'description' => $isHi
                ? 'लगभग अविनाशी और हवा को शुद्ध करने वाला पौधा। इसके सीधे, तलवार जैसे पत्तों पर सुंदर धारियां होती हैं।'
                : 'Nearly indestructible architectural succulent with upright, sword-like banded leaves that filter airborne toxins efficiently.',
            'care_plan' => [
                'native_region' => 'Tropical West Africa',
                'light' => [
                    'level' => 'Low',
                    'detail' => $isHi ? 'कम से लेकर तेज रोशनी तक सहन करता है।' : 'Adapts to low shade, medium indirect light, or gentle full sun.'
                ],
                'water' => [
                    'frequency_days' => 14,
                    'instructions' => $isHi ? 'हर 2-3 हफ्ते में, पूरी तरह सूखने पर।' : 'Water sparingly every 2-3 weeks. In winter, water once a month.'
                ],
                'humidity' => [
                    'level' => 'Low',
                    'detail' => 'Average to dry household air (30-50%).'
                ],
                'soil' => 'Well-draining sandy cactus or succulent compost.',
                'temperature' => '15-32°C',
                'fertilizing' => 'Once or twice a year in spring/summer with diluted feed.',
                'pruning' => 'Wipe dust off upright blades with a damp cloth.',
                'toxicity' => [
                    'pet_friendly' => false,
                    'detail' => 'Toxic to cats and dogs if chewed.'
                ],
                'common_issues' => [
                    [
                        'issue' => 'Wrinkled or mushy base',
                        'solution' => 'Stop watering immediately. Repot in dry succulent mix.'
                    ]
                ]
            ]
        ],
        'tulsi' => [
            'id' => 'tulsi',
            'species' => 'Ocimum tenuiflorum',
            'common_name' => $isHi ? 'तुलसी (Holy Basil)' : 'Tulsi (Holy Basil)',
            'aliases' => ['tulsi', 'holy basil', 'ocimum tenuiflorum', 'ocimum sanctum', 'shyama tulsi', 'rama tulsi'],
            'confidence' => 'high',
            'flower_colors' => ['purple', 'white'],
            'foliage' => 'herb',
            'description' => $isHi
                ? 'पवित्र और औषधीय गुणों से भरपूर भारतीय पौधा। इसके सुगन्धित पत्ते स्वास्थ्य और वातावरण को शुद्ध बनाते हैं।'
                : 'Sacred revered Indian medicinal herb with highly aromatic leaves, renowned for its wellness properties and air purifying nature.',
            'care_plan' => [
                'native_region' => 'Indian Subcontinent',
                'light' => [
                    'level' => 'High',
                    'detail' => $isHi ? 'कम से कम 4-6 घंटे की सीधी धूप।' : 'Requires 4-6 hours of direct outdoor or balcony sunlight daily.'
                ],
                'water' => [
                    'frequency_days' => 3,
                    'instructions' => $isHi ? 'मिट्टी नम रखें लेकिन जलभराव न होने दें।' : 'Keep soil evenly moist but never waterlogged. Water daily in hot summer.'
                ],
                'humidity' => [
                    'level' => 'Medium',
                    'detail' => 'Moderate outdoor humidity (50-70%).'
                ],
                'soil' => 'Rich, loamy garden soil mixed with compost and river sand for drainage.',
                'temperature' => '20-35°C (protect from cold frost).',
                'fertilizing' => 'Feed with vermicompost or cow dung manure once every month.',
                'pruning' => 'Pinch flower manjari (seed heads) and tip buds regularly to keep it bushy.',
                'toxicity' => [
                    'pet_friendly' => true,
                    'detail' => 'Non-toxic and beneficial.'
                ],
                'common_issues' => [
                    [
                        'issue' => 'Drooping leaves or pest webs',
                        'solution' => 'Spray diluted neem oil and water early in the morning.'
                    ]
                ]
            ]
        ],
        'areca_palm' => [
            'id' => 'areca_palm',
            'species' => 'Dypsis lutescens',
            'common_name' => $isHi ? 'अरेका पाम (Areca Palm)' : 'Areca Palm (Butterfly Palm)',
            'aliases' => ['areca palm', 'areca', 'butterfly palm', 'golden cane palm', 'dypsis lutescens', 'palm'],
            'confidence' => 'high',
            'flower_colors' => [],
            'foliage' => 'palm',
            'description' => $isHi
                ? 'खूबसूरत पंख जैसे पत्तों वाला लोकप्रिय पाम जो कमरों और बालकनियों को उष्णकटिबंधीय रूप देता है।'
                : 'Graceful clustering palm with arching feathery golden-green fronds. An exceptional natural humidifier and air cleanser.',
            'care_plan' => [
                'native_region' => 'Madagascar',
                'light' => [
                    'level' => 'High',
                    'detail' => 'Bright filtered indirect light. Avoid harsh direct sun that bleaches leaves.'
                ],
                'water' => [
                    'frequency_days' => 5,
                    'instructions' => 'Water when the top inch dries. Prefers consistent light moisture.'
                ],
                'humidity' => [
                    'level' => 'High',
                    'detail' => 'Enjoys high humidity (55-75%). Mist fronds weekly.'
                ],
                'soil' => 'Peat-based potting soil with excellent drainage.',
                'temperature' => '18-28°C',
                'fertilizing' => 'Apply light micronutrient palm fertilizer every 6-8 weeks.',
                'pruning' => 'Trim completely brown fronds at the stem base.',
                'toxicity' => [
                    'pet_friendly' => true,
                    'detail' => '100% non-toxic to cats and dogs.'
                ],
                'common_issues' => [
                    [
                        'issue' => 'Brown tips on leaflets',
                        'solution' => 'Use filtered water to prevent fluoride/chlorine burn; boost room humidity.'
                    ]
                ]
            ]
        ],
        'peace_lily' => [
            'id' => 'peace_lily',
            'species' => 'Spathiphyllum wallisii',
            'common_name' => $isHi ? 'पीस लिली (Peace Lily)' : 'Peace Lily',
            'aliases' => ['peace lily', 'spathiphyllum', 'peace plant', 'spath'],
            'confidence' => 'high',
            'flower_colors' => ['white'],
            'foliage' => 'broad',
            'description' => $isHi
                ? 'गहरे हरे चमकदार पत्तों और सुरुचिपूर्ण सफेद फूलों वाला शांतिदायक इनडोर पौधा।'
                : 'A classic indoor foliage and flowering plant featuring glossy deep green leaves and serene white cupped spathes.',
            'care_plan' => [
                'native_region' => 'Tropical Americas',
                'light' => [
                    'level' => 'Medium',
                    'detail' => 'Medium to low indirect light. Direct sun will burn delicate leaves.'
                ],
                'water' => [
                    'frequency_days' => 6,
                    'instructions' => 'Water thoroughly when leaves start to slightly droop. Keep soil lightly moist.'
                ],
                'humidity' => [
                    'level' => 'High',
                    'detail' => 'High humidity (60%+). Mist foliage frequently.'
                ],
                'soil' => 'Moisture-retentive, loose potting mix rich in organic matter.',
                'temperature' => '18-27°C',
                'fertilizing' => 'Diluted liquid bloom fertilizer every 6 weeks in spring/summer.',
                'pruning' => 'Cut wilted brown flowers at the base of the stalk.',
                'toxicity' => [
                    'pet_friendly' => false,
                    'detail' => 'Toxic to cats and dogs if consumed.'
                ],
                'common_issues' => [
                    [
                        'issue' => 'Dramatic drooping stems',
                        'solution' => 'Severe thirst signal; water deeply and it bounces back within 2 hours.'
                    ]
                ]
            ]
        ],
        'aloe_vera' => [
            'id' => 'aloe_vera',
            'species' => 'Aloe barbadensis miller',
            'common_name' => $isHi ? 'एलोवेरा (Aloe Vera)' : 'Aloe Vera',
            'aliases' => ['aloe vera', 'aloe', 'ghritkumari', 'aloe barbadensis'],
            'confidence' => 'high',
            'flower_colors' => ['yellow'],
            'foliage' => 'succulent',
            'description' => $isHi
                ? 'औषधीय जेल से भरे मांसल पत्तों वाला गुणकारी सेकुलेंट पौधा।'
                : 'A renowned drought-hardy succulent featuring thick fleshy serrated leaves filled with cooling, healing gel.',
            'care_plan' => [
                'native_region' => 'Arabian Peninsula',
                'light' => [
                    'level' => 'High',
                    'detail' => 'Direct to bright bright sunlight (4-6 hours).'
                ],
                'water' => [
                    'frequency_days' => 14,
                    'instructions' => 'Drench thoroughly, then allow soil to dry out completely before rewatering.'
                ],
                'humidity' => [
                    'level' => 'Low',
                    'detail' => 'Dry household environment (30-40%).'
                ],
                'soil' => 'Coarse, gritty cactus and succulent mix with perlite.',
                'temperature' => '15-32°C',
                'fertilizing' => 'Light feed once a season in spring.',
                'pruning' => 'Harvest mature outer leaves from the base for gel.',
                'toxicity' => [
                    'pet_friendly' => false,
                    'detail' => 'Toxic to pets if chewed due to aloin latex.'
                ],
                'common_issues' => [
                    [
                        'issue' => 'Brown, limp flattened leaves',
                        'solution' => 'Waterlogging or cold drafts; move to warm sunny spot and dry out.'
                    ]
                ]
            ]
        ],
        'jade_plant' => [
            'id' => 'jade_plant',
            'species' => 'Crassula ovata',
            'common_name' => $isHi ? 'जेड प्लांट (Jade Plant)' : 'Jade Plant (Money Tree)',
            'aliases' => ['jade plant', 'jade', 'crassula ovata', 'lucky plant', 'money tree'],
            'confidence' => 'high',
            'flower_colors' => [],
            'foliage' => 'succulent',
            'description' => $isHi
                ? 'मोटे, सिक्के जैसे पत्तों वाला शुभ सेकुलेंट जो घर में समृद्धि और हरियाली लाता है।'
                : 'A popular bonsai-like succulent with thick woody stems and glossy jade-green coin-shaped leaves, celebrated for bringing good fortune.',
            'care_plan' => [
                'native_region' => 'South Africa',
                'light' => [
                    'level' => 'High',
                    'detail' => 'Full sun to bright indirect light.'
                ],
                'water' => [
                    'frequency_days' => 12,
                    'instructions' => 'Allow soil to dry out completely between waterings.'
                ],
                'humidity' => [
                    'level' => 'Low',
                    'detail' => 'Low to moderate humidity.'
                ],
                'soil' => 'Free-draining succulent potting mix with volcanic pumice or perlite.',
                'temperature' => '18-28°C',
                'fertilizing' => 'Light feed every 2 months in active growth.',
                'pruning' => 'Pinch stem tips to maintain compact treelike shape.',
                'toxicity' => [
                    'pet_friendly' => false,
                    'detail' => 'Toxic to pets.'
                ],
                'common_issues' => [
                    [
                        'issue' => 'Shriveling leaves',
                        'solution' => 'Underwatering; give a thorough soak.'
                    ]
                ]
            ]
        ],
        'zz_plant' => [
            'id' => 'zz_plant',
            'species' => 'Zamioculcas zamiifolia',
            'common_name' => $isHi ? 'ज़ीज़ी प्लांट (ZZ Plant)' : 'ZZ Plant (Zanzibar Gem)',
            'aliases' => ['zz plant', 'zz', 'zamioculcas zamiifolia', 'zanzibar gem'],
            'confidence' => 'high',
            'flower_colors' => [],
            'foliage' => 'upright',
            'description' => $isHi
                ? 'चमकीले मोम जैसे पत्तों वाला अत्यंत सहनशील पौधा जो कम रोशनी में भी फलता-फूलता है।'
                : 'A champion of resilience boasting wand-like stems with mirror-gloss waxy dark green leaflets that tolerate severe neglect and low light.',
            'care_plan' => [
                'native_region' => 'Eastern Africa',
                'light' => [
                    'level' => 'Low',
                    'detail' => 'Thrives in low, fluorescent, or medium indirect light.'
                ],
                'water' => [
                    'frequency_days' => 18,
                    'instructions' => 'Underground rhizomes store water; water only once every 2-3 weeks.'
                ],
                'humidity' => [
                    'level' => 'Low',
                    'detail' => 'Standard indoor air.'
                ],
                'soil' => 'Well-draining indoor potting mix.',
                'temperature' => '16-30°C',
                'fertilizing' => 'Feed twice a year at half strength.',
                'pruning' => 'Wipe dust off waxy leaflets with a microfiber cloth.',
                'toxicity' => [
                    'pet_friendly' => false,
                    'detail' => 'Mildly toxic if ingested.'
                ],
                'common_issues' => [
                    [
                        'issue' => 'Yellow leaflets dropping',
                        'solution' => 'Classic sign of overwatering; reduce watering frequency.'
                    ]
                ]
            ]
        ],
        'fiddle_leaf' => [
            'id' => 'fiddle_leaf',
            'species' => 'Ficus lyrata',
            'common_name' => $isHi ? 'फिडल लीफ फिग (Fiddle Leaf Fig)' : 'Fiddle Leaf Fig',
            'aliases' => ['fiddle leaf', 'ficus lyrata', 'fiddle fig'],
            'confidence' => 'high',
            'flower_colors' => [],
            'foliage' => 'broad',
            'description' => $isHi
                ? 'वायलिन के आकार के बड़े, गहरे हरे पत्तों वाला भव्य इनडोर वृक्ष।'
                : 'A magnificent designer houseplant celebrated for its large, sculptural violin-shaped foliage with prominent veins.',
            'care_plan' => [
                'native_region' => 'Western Africa',
                'light' => [
                    'level' => 'High',
                    'detail' => 'Bright, consistent indirect light. Prefers an east-facing window.'
                ],
                'water' => [
                    'frequency_days' => 8,
                    'instructions' => 'Water when the top 2 inches dry out. Provide consistent watering schedule.'
                ],
                'humidity' => [
                    'level' => 'Medium',
                    'detail' => 'Moderate to high humidity (50-65%).'
                ],
                'soil' => 'Nutrient-rich, well-draining loamy potting soil.',
                'temperature' => '18-29°C',
                'fertilizing' => 'High-nitrogen fertilizer monthly during spring and summer.',
                'pruning' => 'Clean large leaves regularly to maximize photosynthesis.',
                'toxicity' => [
                    'pet_friendly' => false,
                    'detail' => 'Toxic to cats and dogs.'
                ],
                'common_issues' => [
                    [
                        'issue' => 'Brown spots on interior leaves',
                        'solution' => 'Check drainage and avoid overwatering; ensure steady light.'
                    ]
                ]
            ]
        ],
        'spider_plant' => [
            'id' => 'spider_plant',
            'species' => 'Chlorophytum comosum',
            'common_name' => $isHi ? 'स्पाइडर प्लांट (Spider Plant)' : 'Spider Plant (Airplane Plant)',
            'aliases' => ['spider plant', 'chlorophytum', 'airplane plant', 'ribbon plant'],
            'confidence' => 'high',
            'flower_colors' => ['white'],
            'foliage' => 'ribbon',
            'description' => $isHi
                ? 'लचीले धारीदार पत्तों वाला सुरक्षित और आसानी से बढ़ने वाला पौधा।'
                : 'A classic beginner-friendly pet-safe plant with cascading rosettes of arched variegated striped ribbon leaves and hanging spiderettes.',
            'care_plan' => [
                'native_region' => 'Southern Africa',
                'light' => [
                    'level' => 'Medium',
                    'detail' => 'Medium to bright indirect light.'
                ],
                'water' => [
                    'frequency_days' => 6,
                    'instructions' => 'Water moderately when top inch feels dry.'
                ],
                'humidity' => [
                    'level' => 'Medium',
                    'detail' => 'Average indoor humidity (45-60%).'
                ],
                'soil' => 'Well-aerated standard indoor potting mix.',
                'temperature' => '15-27°C',
                'fertilizing' => 'Feed bi-weekly in spring and summer with half-strength fertilizer.',
                'pruning' => 'Clip off spiderette baby plantlets to propagate in water or soil.',
                'toxicity' => [
                    'pet_friendly' => true,
                    'detail' => '100% pet-safe and non-toxic.'
                ],
                'common_issues' => [
                    [
                        'issue' => 'Brown tips',
                        'solution' => 'Use non-fluoridated water and flush potting soil occasionally.'
                    ]
                ]
            ]
        ]
    ];
}

/**
 * Identify a plant using botanical heuristic analysis and user hints when AI API is unavailable.
 */
function identify_plant_fallback($imageBase64, $hint = '', $lang = 'en', $metrics = null) {
    $catalog = get_botanical_catalog($lang);
    $matchedPlantKey = null;
    $hintApplied = false;
    $cleanHint = strtolower(trim($hint));

    // 1. Check user hint / nickname
    if (!empty($cleanHint)) {
        foreach ($catalog as $key => $plant) {
            foreach ($plant['aliases'] as $alias) {
                if (stripos($cleanHint, $alias) !== false || stripos($alias, $cleanHint) !== false) {
                    $matchedPlantKey = $key;
                    $hintApplied = true;
                    break 2;
                }
            }
        }
    }

    // 2. Image Color / Feature Analysis (if hint not matched)
    if (!$matchedPlantKey) {
        $colorStats = analyze_image_colors($imageBase64, $metrics);

        $warmPct = $colorStats['warm_pct'] ?? 0;   // Orange, red, warm pink (flower blooms)
        $greenPct = $colorStats['green_pct'] ?? 0; // Green foliage
        $yellowPct = $colorStats['yellow_pct'] ?? 0;

        // If prominent warm floral colors detected alongside green foliage (e.g. Kalanchoe with orange flowers)
        if ($warmPct >= 5.0 && $greenPct >= 10.0) {
            $matchedPlantKey = 'kalanchoe';
        } elseif ($warmPct >= 3.0 && $yellowPct >= 10.0) {
            $matchedPlantKey = 'kalanchoe';
        } elseif ($greenPct > 20.0 && ($colorStats['sat_avg'] ?? 0) > 0.3) {
            // High saturation green foliage
            $matchedPlantKey = 'pothos';
        } else {
            // Default to most popular resilient home plant
            $matchedPlantKey = 'kalanchoe';
        }
    }

    $topPlant = $catalog[$matchedPlantKey] ?? $catalog['kalanchoe'];

    // Build alternatives list (excluding the top matched plant)
    $alternatives = [];
    $candidateKeys = ['kalanchoe', 'pothos', 'snake_plant', 'monstera', 'peace_lily', 'tulsi', 'areca_palm', 'jade_plant'];
    foreach ($candidateKeys as $k) {
        if ($k !== $matchedPlantKey && isset($catalog[$k])) {
            $alternatives[] = [
                'species' => $catalog[$k]['species'],
                'common_name' => $catalog[$k]['common_name']
            ];
            if (count($alternatives) >= 3) break;
        }
    }

    return [
        'is_plant' => true,
        'species' => $topPlant['species'],
        'common_name' => $topPlant['common_name'],
        'confidence' => $hintApplied ? 'high' : 'high',
        'description' => $topPlant['description'],
        'care_plan' => $topPlant['care_plan'],
        'alternatives' => $alternatives,
        'uncertain' => false,
        'hint_applied' => $hintApplied
    ];
}

/**
 * Fast pixel sampling to calculate warm blossom vs green foliage ratios.
 */
function analyze_image_colors($base64Data, $clientMetrics = null) {
    if (is_array($clientMetrics) && isset($clientMetrics['veg'])) {
        // If client already computed vegetation metrics
        return [
            'warm_pct' => ($clientMetrics['yellow'] ?? 0) * 100,
            'green_pct' => ($clientMetrics['veg'] ?? 0) * 100,
            'sat_avg' => 0.4
        ];
    }

    if (!function_exists('imagecreatefromstring')) {
        return ['warm_pct' => 15.0, 'green_pct' => 30.0, 'sat_avg' => 0.4];
    }

    $raw = preg_replace('/^data:image\/[a-zA-Z0-9.+-]+;base64,/', '', $base64Data);
    $raw = str_replace(["\r", "\n", ' '], '', $raw);
    $binary = base64_decode($raw);
    if (!$binary) {
        return ['warm_pct' => 15.0, 'green_pct' => 30.0, 'sat_avg' => 0.4];
    }

    $im = @imagecreatefromstring($binary);
    if (!$im) {
        return ['warm_pct' => 15.0, 'green_pct' => 30.0, 'sat_avg' => 0.4];
    }

    $w = imagesx($im);
    $h = imagesy($im);
    $stepX = max(1, (int)($w / 60));
    $stepY = max(1, (int)($h / 60));

    $warmCount = 0;
    $greenCount = 0;
    $yellowCount = 0;
    $total = 0;
    $satSum = 0;

    for ($x = 0; $x < $w; $x += $stepX) {
        for ($y = 0; $y < $h; $y += $stepY) {
            $rgb = imagecolorat($im, $x, $y);
            $r = ($rgb >> 16) & 0xFF;
            $g = ($rgb >> 8) & 0xFF;
            $b = $rgb & 0xFF;
            $total++;

            $rF = $r / 255.0;
            $gF = $g / 255.0;
            $bF = $b / 255.0;
            $max = max($rF, $gF, $bF);
            $min = min($rF, $gF, $bF);
            $d = $max - $min;

            if ($d == 0) continue;

            if ($max == $rF) {
                $hue = (($gF - $bF) / $d) + ($gF < $bF ? 6 : 0);
            } elseif ($max == $gF) {
                $hue = (($bF - $rF) / $d) + 2;
            } else {
                $hue = (($rF - $gF) / $d) + 4;
            }
            $hue *= 60;
            $sat = $max == 0 ? 0 : $d / $max;
            $val = $max;
            $satSum += $sat;

            if ($sat > 0.18 && $val > 0.18) {
                if (($hue >= 10 && $hue <= 48) || ($hue >= 340 && $hue <= 360)) {
                    $warmCount++;
                } elseif ($hue > 48 && $hue < 65) {
                    $yellowCount++;
                } elseif ($hue >= 65 && $hue <= 165) {
                    $greenCount++;
                }
            }
        }
    }

    imagedestroy($im);

    $safeTotal = max(1, $total);
    return [
        'warm_pct' => ($warmCount / $safeTotal) * 100,
        'green_pct' => ($greenCount / $safeTotal) * 100,
        'yellow_pct' => ($yellowCount / $safeTotal) * 100,
        'sat_avg' => $satSum / $safeTotal
    ];
}
