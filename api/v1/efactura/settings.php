<?php
/**
 * e-Factura Settings Endpoint
 * GET /api/v1/efactura/settings.php - Get company e-Factura settings
 * POST /api/v1/efactura/settings.php - Save company e-Factura settings
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../services/EFacturaService.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    $auth = authenticate();
    $pdo = Database::getInstance()->getConnection();
    $service = EFacturaService::getInstance();

    $companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
    if (!$companyId) {
        throw new Exception('Company ID required', 400);
    }

    // Verify user has access to company
    $stmt = $pdo->prepare("SELECT 1 FROM company_users WHERE company_id = :company_id AND user_id = :user_id");
    $stmt->execute(['company_id' => $companyId, 'user_id' => $auth['user_id']]);
    if (!$stmt->fetch()) {
        throw new Exception('Access denied', 403);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $settings = $service->getSettings($companyId);

        // Don't expose secrets
        if ($settings) {
            unset($settings['anaf_client_secret']);
            unset($settings['anaf_oauth_token']);
            unset($settings['anaf_refresh_token']);
        }

        echo json_encode([
            'success' => true,
            'data' => $settings ?? [
                'is_enabled' => false,
                'auto_submit' => false,
                'use_test_environment' => true
            ]
        ]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        $result = $service->saveSettings($companyId, [
            'is_enabled' => $input['is_enabled'] ?? false,
            'auto_submit' => $input['auto_submit'] ?? false,
            'anaf_client_id' => $input['anaf_client_id'] ?? null,
            'anaf_client_secret' => $input['anaf_client_secret'] ?? null,
            'use_test_environment' => $input['use_test_environment'] ?? true,
            'notification_email' => $input['notification_email'] ?? null
        ]);

        echo json_encode([
            'success' => $result,
            'message' => $result ? 'Settings saved successfully' : 'Failed to save settings'
        ]);

    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    }

} catch (Exception $e) {
    $code = $e->getCode() ?: 500;
    http_response_code($code > 99 && $code < 600 ? $code : 500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
