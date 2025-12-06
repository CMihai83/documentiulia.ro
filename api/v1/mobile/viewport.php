<?php
/**
 * Mobile Viewport API
 * GET /api/v1/mobile/viewport.php - Get recommended viewport settings
 * GET /api/v1/mobile/viewport.php?breakpoints=1 - Get breakpoint definitions
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$breakpoints = [
    'xs' => ['min' => 0, 'max' => 639, 'name' => 'Extra Small', 'device' => 'Small phones'],
    'sm' => ['min' => 640, 'max' => 767, 'name' => 'Small', 'device' => 'Large phones'],
    'md' => ['min' => 768, 'max' => 1023, 'name' => 'Medium', 'device' => 'Tablets'],
    'lg' => ['min' => 1024, 'max' => 1279, 'name' => 'Large', 'device' => 'Small laptops'],
    'xl' => ['min' => 1280, 'max' => 1535, 'name' => 'Extra Large', 'device' => 'Desktops'],
    '2xl' => ['min' => 1536, 'max' => null, 'name' => '2X Large', 'device' => 'Large desktops'],
];

$touchTargets = [
    'minimum' => 44, // Apple HIG minimum
    'recommended' => 48,
    'comfortable' => 56,
];

$safeAreas = [
    'iphone_x' => [
        'top' => 44,
        'bottom' => 34,
        'left' => 0,
        'right' => 0,
    ],
    'iphone_14_pro' => [
        'top' => 59,
        'bottom' => 34,
        'left' => 0,
        'right' => 0,
    ],
    'android_notch' => [
        'top' => 24,
        'bottom' => 0,
        'left' => 0,
        'right' => 0,
    ],
];

$viewportSettings = [
    'recommended' => [
        'width' => 'device-width',
        'initial_scale' => 1.0,
        'maximum_scale' => 5.0,
        'user_scalable' => 'yes',
        'viewport_fit' => 'cover',
    ],
    'meta_tag' => '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover" />',
];

$section = $_GET['breakpoints'] ?? null;

if ($section) {
    echo json_encode([
        'success' => true,
        'data' => [
            'breakpoints' => $breakpoints,
            'touch_targets' => $touchTargets,
        ]
    ]);
} else {
    echo json_encode([
        'success' => true,
        'data' => [
            'viewport' => $viewportSettings,
            'breakpoints' => $breakpoints,
            'touch_targets' => $touchTargets,
            'safe_areas' => $safeAreas,
            'recommendations' => [
                'min_touch_target' => '44x44px',
                'font_size_mobile' => '16px minimum to prevent zoom',
                'spacing' => '16px padding recommended',
                'bottom_nav_height' => '64px recommended',
            ],
        ]
    ]);
}
