<?php
/**
 * Analytics Export API
 * GET /api/v1/analytics/export.php - Export analytics data as JSON/CSV
 *
 * Query params:
 * - type: persona_adoption|feature_usage|unused_features|daily_analytics
 * - format: json|csv (default: json)
 * - persona_id: filter by persona (optional)
 * - start_date: for daily_analytics (default: 30 days ago)
 * - end_date: for daily_analytics (default: today)
 */

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/PersonaAnalyticsService.php';
require_once __DIR__ . '/../../helpers/headers.php';

// Handle OPTIONS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');
    http_response_code(200);
    exit();
}

try {
    // Verify authentication
    $authHeader = getHeader('authorization', '') ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    // Only admin can export analytics
    if ($userData['role'] !== 'admin') {
        header('Content-Type: application/json');
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Admin access required'
        ]);
        exit();
    }

    $type = $_GET['type'] ?? '';
    $format = $_GET['format'] ?? 'json';

    if (empty($type)) {
        throw new Exception('Export type required. Options: persona_adoption, feature_usage, unused_features, daily_analytics');
    }

    $filters = [
        'persona_id' => $_GET['persona_id'] ?? null,
        'start_date' => $_GET['start_date'] ?? null,
        'end_date' => $_GET['end_date'] ?? null
    ];

    $analytics = PersonaAnalyticsService::getInstance();
    $data = $analytics->exportAnalytics($type, array_filter($filters));

    if ($format === 'csv') {
        // Output as CSV
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="' . $type . '_' . date('Y-m-d') . '.csv"');
        header('Access-Control-Allow-Origin: *');

        if (empty($data)) {
            echo "No data available";
            exit();
        }

        $output = fopen('php://output', 'w');

        // Headers from first row keys
        fputcsv($output, array_keys($data[0]));

        // Data rows
        foreach ($data as $row) {
            // Flatten arrays/objects for CSV
            $flatRow = array_map(function($val) {
                if (is_array($val)) {
                    return json_encode($val);
                }
                return $val;
            }, $row);
            fputcsv($output, $flatRow);
        }

        fclose($output);
    } else {
        // Output as JSON
        header('Content-Type: application/json');
        header('Access-Control-Allow-Origin: *');

        echo json_encode([
            'success' => true,
            'data' => $data,
            'meta' => [
                'type' => $type,
                'count' => count($data),
                'exported_at' => date('c'),
                'filters' => array_filter($filters)
            ]
        ]);
    }

} catch (Exception $e) {
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
