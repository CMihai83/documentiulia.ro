<?php
/**
 * Pause/Resume Recurring Transaction API
 * POST - Pause or resume a recurring transaction
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
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
if (!$companyId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Company ID required']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$recurringId = $input['id'] ?? $_GET['id'] ?? null;
$action = $input['action'] ?? 'toggle'; // pause, resume, toggle

if (!$recurringId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Recurring ID required']);
    exit;
}

try {
    $db = getDbConnection();
    
    // Get current status
    $stmt = $db->prepare("
        SELECT id, name, status FROM recurring_transactions
        WHERE id = :id AND company_id = :company_id
    ");
    $stmt->execute(['id' => $recurringId, 'company_id' => $companyId]);
    $recurring = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$recurring) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Recurring transaction not found']);
        exit;
    }
    
    // Determine new status
    if ($action === 'toggle') {
        $newStatus = $recurring['status'] === 'active' ? 'paused' : 'active';
    } elseif ($action === 'pause') {
        if ($recurring['status'] !== 'active') {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error_ro' => 'Doar tranzacțiile active pot fi puse în pauză',
                'error' => 'Only active transactions can be paused'
            ]);
            exit;
        }
        $newStatus = 'paused';
    } elseif ($action === 'resume') {
        if ($recurring['status'] !== 'paused') {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error_ro' => 'Doar tranzacțiile în pauză pot fi reluate',
                'error' => 'Only paused transactions can be resumed'
            ]);
            exit;
        }
        $newStatus = 'active';
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid action. Use: pause, resume, or toggle']);
        exit;
    }
    
    // Update status
    $stmt = $db->prepare("
        UPDATE recurring_transactions
        SET status = :status, updated_at = NOW()
        WHERE id = :id AND company_id = :company_id
    ");
    $stmt->execute([
        'status' => $newStatus,
        'id' => $recurringId,
        'company_id' => $companyId,
    ]);
    
    $messageRo = $newStatus === 'active' ? 'Tranzacția recurentă a fost reluată' : 'Tranzacția recurentă a fost pusă în pauză';
    $messageEn = $newStatus === 'active' ? 'Recurring transaction resumed' : 'Recurring transaction paused';
    
    echo json_encode([
        'success' => true,
        'message_ro' => $messageRo,
        'message_en' => $messageEn,
        'data' => [
            'id' => $recurringId,
            'name' => $recurring['name'],
            'previous_status' => $recurring['status'],
            'new_status' => $newStatus,
        ],
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error']);
}
