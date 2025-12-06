<?php
/**
 * Persona Analytics Dashboard API
 * E1-US06: Admin view for persona adoption and usage stats
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/PersonaAnalyticsService.php';
require_once __DIR__ . '/../../helpers/headers.php';

// Authenticate
$authHeader = getHeader('authorization', '') ?? '';
if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Authorization required']);
    exit;
}

$authService = new AuthService();
try {
    $auth = $authService->verifyToken($matches[1]);
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

// Only admins can view analytics dashboard
if ($auth['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Admin access required']);
    exit;
}

try {
    $analytics = PersonaAnalyticsService::getInstance();

    // Get dashboard data
    $summary = $analytics->getDashboardSummary();
    $adoption = $analytics->getPersonaAdoptionStats();

    $dashboard = array_merge($summary, [
        'persona_distribution' => $adoption['persona_distribution'] ?? [],
        'top_features' => $adoption['top_features'] ?? [],
        'active_users_7d' => $adoption['active_users'] ?? 0,
        'generated_at' => date('c')
    ]);

    echo json_encode([
        'success' => true,
        'data' => $dashboard
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to load analytics: ' . $e->getMessage()
    ]);
}
