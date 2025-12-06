<?php
/**
 * Feature Usage Analytics API
 * GET /api/v1/analytics/feature-usage.php - Get feature usage by persona
 * POST /api/v1/analytics/feature-usage.php - Record feature usage
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/PersonaAnalyticsService.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    // Verify authentication
    $authHeader = getHeader('authorization', '') ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);
    $userId = $userData['user_id'];

    $companyId = getHeader('x-company-id') ?? '';
    if (empty($companyId)) {
        throw new Exception('Company ID required');
    }

    $analytics = PersonaAnalyticsService::getInstance();

    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            // Admin-only: Get feature usage stats
            if ($userData['role'] !== 'admin') {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'message' => 'Admin access required'
                ]);
                exit();
            }

            $personaId = $_GET['persona_id'] ?? null;
            $data = $analytics->getFeatureUsageByPersona($personaId);

            echo json_encode([
                'success' => true,
                'data' => $data,
                'meta' => [
                    'persona_filter' => $personaId,
                    'count' => count($data)
                ]
            ]);
            break;

        case 'POST':
            // Record feature usage (any authenticated user)
            $input = json_decode(file_get_contents('php://input'), true);

            $featureKey = $input['feature_key'] ?? '';
            $action = $input['action'] ?? 'view';
            $metadata = $input['metadata'] ?? [];

            if (empty($featureKey)) {
                throw new Exception('Feature key required');
            }

            // Get company's current persona
            $db = Database::getInstance()->getConnection();
            $stmt = $db->prepare("
                SELECT COALESCE(persona_id, 'freelancer') as persona_id
                FROM company_persona_settings
                WHERE company_id = :company_id
            ");
            $stmt->execute([':company_id' => $companyId]);
            $personaId = $stmt->fetch(PDO::FETCH_ASSOC)['persona_id'] ?? 'freelancer';

            $success = $analytics->recordFeatureUsage(
                $companyId,
                $userId,
                $personaId,
                $featureKey,
                $action,
                $metadata
            );

            echo json_encode([
                'success' => $success,
                'message' => 'Usage recorded'
            ]);
            break;

        default:
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'message' => 'Method not allowed'
            ]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
