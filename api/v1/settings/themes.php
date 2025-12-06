<?php
/**
 * Themes API
 * Manage UI themes and color schemes
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';

$user = authenticate();
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;

$method = $_SERVER['REQUEST_METHOD'];

// Built-in themes
$builtInThemes = [
    'light' => [
        'id' => 'light',
        'name_ro' => 'Luminos',
        'name_en' => 'Light',
        'type' => 'light',
        'is_builtin' => true,
        'colors' => [
            'background' => '#ffffff',
            'surface' => '#f8fafc',
            'primary' => '#3b82f6',
            'secondary' => '#64748b',
            'accent' => '#8b5cf6',
            'success' => '#22c55e',
            'warning' => '#f59e0b',
            'error' => '#ef4444',
            'text_primary' => '#1e293b',
            'text_secondary' => '#64748b',
            'border' => '#e2e8f0',
        ],
    ],
    'dark' => [
        'id' => 'dark',
        'name_ro' => 'Întunecat',
        'name_en' => 'Dark',
        'type' => 'dark',
        'is_builtin' => true,
        'colors' => [
            'background' => '#0f172a',
            'surface' => '#1e293b',
            'primary' => '#60a5fa',
            'secondary' => '#94a3b8',
            'accent' => '#a78bfa',
            'success' => '#4ade80',
            'warning' => '#fbbf24',
            'error' => '#f87171',
            'text_primary' => '#f1f5f9',
            'text_secondary' => '#94a3b8',
            'border' => '#334155',
        ],
    ],
    'blue' => [
        'id' => 'blue',
        'name_ro' => 'Albastru profesional',
        'name_en' => 'Professional Blue',
        'type' => 'light',
        'is_builtin' => true,
        'colors' => [
            'background' => '#f8fafc',
            'surface' => '#ffffff',
            'primary' => '#1e40af',
            'secondary' => '#475569',
            'accent' => '#7c3aed',
            'success' => '#16a34a',
            'warning' => '#d97706',
            'error' => '#dc2626',
            'text_primary' => '#1e293b',
            'text_secondary' => '#64748b',
            'border' => '#cbd5e1',
        ],
    ],
    'green' => [
        'id' => 'green',
        'name_ro' => 'Verde natural',
        'name_en' => 'Natural Green',
        'type' => 'light',
        'is_builtin' => true,
        'colors' => [
            'background' => '#f0fdf4',
            'surface' => '#ffffff',
            'primary' => '#15803d',
            'secondary' => '#4b5563',
            'accent' => '#059669',
            'success' => '#22c55e',
            'warning' => '#eab308',
            'error' => '#dc2626',
            'text_primary' => '#14532d',
            'text_secondary' => '#6b7280',
            'border' => '#bbf7d0',
        ],
    ],
    'purple' => [
        'id' => 'purple',
        'name_ro' => 'Mov elegant',
        'name_en' => 'Elegant Purple',
        'type' => 'light',
        'is_builtin' => true,
        'colors' => [
            'background' => '#faf5ff',
            'surface' => '#ffffff',
            'primary' => '#7c3aed',
            'secondary' => '#6b7280',
            'accent' => '#c026d3',
            'success' => '#22c55e',
            'warning' => '#f59e0b',
            'error' => '#ef4444',
            'text_primary' => '#4c1d95',
            'text_secondary' => '#6b7280',
            'border' => '#e9d5ff',
        ],
    ],
    'high_contrast' => [
        'id' => 'high_contrast',
        'name_ro' => 'Contrast ridicat',
        'name_en' => 'High Contrast',
        'type' => 'light',
        'is_builtin' => true,
        'colors' => [
            'background' => '#ffffff',
            'surface' => '#f5f5f5',
            'primary' => '#000000',
            'secondary' => '#333333',
            'accent' => '#0000ff',
            'success' => '#008000',
            'warning' => '#ff8c00',
            'error' => '#ff0000',
            'text_primary' => '#000000',
            'text_secondary' => '#333333',
            'border' => '#000000',
        ],
    ],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $themeId = $_GET['id'] ?? null;
            $includeCustom = ($_GET['include_custom'] ?? 'true') === 'true';

            if ($themeId) {
                // Check built-in first
                if (isset($builtInThemes[$themeId])) {
                    echo json_encode([
                        'success' => true,
                        'data' => $builtInThemes[$themeId],
                    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
                } else {
                    // Check custom themes
                    $stmt = $db->prepare("SELECT * FROM custom_themes WHERE id = :id AND (user_id = :user_id OR is_shared = TRUE)");
                    $stmt->execute(['id' => $themeId, 'user_id' => $user['user_id']]);
                    $theme = $stmt->fetch(PDO::FETCH_ASSOC);

                    if ($theme) {
                        $theme['colors'] = json_decode($theme['colors'], true);
                        $theme['is_builtin'] = false;
                        echo json_encode([
                            'success' => true,
                            'data' => $theme,
                        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
                    } else {
                        http_response_code(404);
                        echo json_encode(['success' => false, 'error' => 'Theme not found']);
                    }
                }
            } else {
                // List all themes
                $themes = array_values($builtInThemes);

                if ($includeCustom) {
                    $stmt = $db->prepare("SELECT * FROM custom_themes WHERE user_id = :user_id OR is_shared = TRUE ORDER BY name_ro ASC");
                    $stmt->execute(['user_id' => $user['user_id']]);
                    $customThemes = $stmt->fetchAll(PDO::FETCH_ASSOC);

                    foreach ($customThemes as &$ct) {
                        $ct['colors'] = json_decode($ct['colors'], true);
                        $ct['is_builtin'] = false;
                        $themes[] = $ct;
                    }
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'themes' => $themes,
                        'builtin_count' => count($builtInThemes),
                        'custom_count' => count($themes) - count($builtInThemes),
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);

            $nameRo = $input['name_ro'] ?? null;
            $nameEn = $input['name_en'] ?? null;
            $colors = $input['colors'] ?? null;
            $type = $input['type'] ?? 'light';

            if (!$nameRo || !$colors) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Numele și culorile sunt obligatorii',
                    'error' => 'Name and colors are required'
                ]);
                exit;
            }

            $themeId = 'theme_' . bin2hex(random_bytes(8));
            $stmt = $db->prepare("
                INSERT INTO custom_themes (id, user_id, company_id, name_ro, name_en, type, colors, is_shared, created_at)
                VALUES (:id, :user_id, :company_id, :name_ro, :name_en, :type, :colors, :is_shared, NOW())
            ");
            $stmt->execute([
                'id' => $themeId,
                'user_id' => $user['user_id'],
                'company_id' => $companyId,
                'name_ro' => $nameRo,
                'name_en' => $nameEn ?? $nameRo,
                'type' => $type,
                'colors' => json_encode($colors),
                'is_shared' => ($input['is_shared'] ?? false) ? 1 : 0,
            ]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Temă creată',
                'message_en' => 'Theme created',
                'data' => ['id' => $themeId],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            $themeId = $input['id'] ?? null;

            if (!$themeId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'id required']);
                exit;
            }

            if (isset($builtInThemes[$themeId])) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Nu puteți modifica temele predefinite',
                    'error' => 'Cannot modify built-in themes'
                ]);
                exit;
            }

            // Verify ownership
            $stmt = $db->prepare("SELECT user_id FROM custom_themes WHERE id = :id");
            $stmt->execute(['id' => $themeId]);
            $existing = $stmt->fetch();

            if (!$existing || ($existing['user_id'] !== $user['user_id'] && $user['role'] !== 'admin')) {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Nu puteți modifica această temă',
                    'error' => 'You cannot modify this theme'
                ]);
                exit;
            }

            $updates = [];
            $params = ['id' => $themeId];

            if (isset($input['name_ro'])) {
                $updates[] = "name_ro = :name_ro";
                $params['name_ro'] = $input['name_ro'];
            }
            if (isset($input['name_en'])) {
                $updates[] = "name_en = :name_en";
                $params['name_en'] = $input['name_en'];
            }
            if (isset($input['type'])) {
                $updates[] = "type = :type";
                $params['type'] = $input['type'];
            }
            if (isset($input['colors'])) {
                $updates[] = "colors = :colors";
                $params['colors'] = json_encode($input['colors']);
            }
            if (isset($input['is_shared'])) {
                $updates[] = "is_shared = :is_shared";
                $params['is_shared'] = $input['is_shared'] ? 1 : 0;
            }

            if (!empty($updates)) {
                $updates[] = "updated_at = NOW()";
                $sql = "UPDATE custom_themes SET " . implode(', ', $updates) . " WHERE id = :id";
                $db->prepare($sql)->execute($params);
            }

            echo json_encode([
                'success' => true,
                'message_ro' => 'Temă actualizată',
                'message_en' => 'Theme updated',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'DELETE':
            $themeId = $_GET['id'] ?? null;

            if (!$themeId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'id required']);
                exit;
            }

            if (isset($builtInThemes[$themeId])) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Nu puteți șterge temele predefinite',
                    'error' => 'Cannot delete built-in themes'
                ]);
                exit;
            }

            // Verify ownership
            $stmt = $db->prepare("SELECT user_id FROM custom_themes WHERE id = :id");
            $stmt->execute(['id' => $themeId]);
            $existing = $stmt->fetch();

            if (!$existing || ($existing['user_id'] !== $user['user_id'] && $user['role'] !== 'admin')) {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Nu puteți șterge această temă',
                    'error' => 'You cannot delete this theme'
                ]);
                exit;
            }

            $stmt = $db->prepare("DELETE FROM custom_themes WHERE id = :id");
            $stmt->execute(['id' => $themeId]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Temă ștearsă',
                'message_en' => 'Theme deleted',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
