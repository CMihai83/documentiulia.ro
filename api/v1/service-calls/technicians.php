<?php
/**
 * Available Technicians & Schedule API
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
require_once __DIR__ . '/../../services/ServiceCallService.php';
require_once __DIR__ . '/../../helpers/headers.php';

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

$companyId = getHeader('x-company-id', '');
if (!$companyId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Company ID required']);
    exit;
}

try {
    $serviceCallService = ServiceCallService::getInstance();

    $technicianId = $_GET['technician_id'] ?? null;

    if ($technicianId) {
        // Get technician schedule
        $dateFrom = $_GET['date_from'] ?? date('Y-m-d');
        $dateTo = $_GET['date_to'] ?? date('Y-m-d', strtotime('+7 days'));
        $schedule = $serviceCallService->getTechnicianSchedule($technicianId, $dateFrom, $dateTo);
        echo json_encode(['success' => true, 'data' => $schedule]);
    } else {
        // Get available technicians for date
        $date = $_GET['date'] ?? date('Y-m-d');
        $technicians = $serviceCallService->getAvailableTechnicians($companyId, $date);
        echo json_encode(['success' => true, 'data' => $technicians, 'count' => count($technicians)]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
