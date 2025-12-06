<?php
/**
 * Feature Access Check API
 * GET /api/v1/features/check.php?feature_id=xxx - Check single feature
 * GET /api/v1/features/check.php - Get all features with access status
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/FeatureToggleService.php';
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

    // Get company ID
    $companyId = getHeader('x-company-id') ?? '';
    if (empty($companyId)) {
        throw new Exception('Company ID required');
    }

    $featureService = FeatureToggleService::getInstance();

    // Check if specific feature requested
    $featureId = $_GET['feature_id'] ?? null;

    if ($featureId) {
        // Single feature check
        $access = $featureService->getFeatureAccess($featureId, $companyId);

        // Log feature access attempt
        logFeatureAccess($companyId, $userId, $featureId, $access['enabled'] ? 'accessed' : 'blocked');

        echo json_encode([
            'success' => true,
            'data' => $access
        ]);
    } else {
        // Get all features with access status
        $groupByCategory = isset($_GET['group_by_category']);

        if ($groupByCategory) {
            $features = $featureService->getFeaturesByCategory($companyId);
        } else {
            $features = $featureService->getAllFeaturesForCompany($companyId);
        }

        echo json_encode([
            'success' => true,
            'data' => $features,
            'meta' => [
                'total_features' => count($features),
                'enabled_count' => count(array_filter(
                    is_array($features) && isset($features[0]['access'])
                        ? $features
                        : array_merge(...array_column($features, 'features')),
                    fn($f) => $f['access']['enabled'] ?? false
                ))
            ]
        ]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

/**
 * Log feature access for analytics
 */
function logFeatureAccess(string $companyId, string $userId, string $featureId, string $action): void
{
    try {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("
            INSERT INTO feature_usage_log (company_id, user_id, feature_id, action)
            VALUES (:company_id, :user_id, :feature_id, :action)
        ");
        $stmt->execute([
            ':company_id' => $companyId,
            ':user_id' => $userId,
            ':feature_id' => $featureId,
            ':action' => $action
        ]);
    } catch (Exception $e) {
        // Don't fail the request if logging fails
        error_log("Feature logging failed: " . $e->getMessage());
    }
}
