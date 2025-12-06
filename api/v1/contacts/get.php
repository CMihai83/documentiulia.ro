<?php
/**
 * Get Single Contact Endpoint
 * GET /api/v1/contacts/get.php?id={uuid}
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Company-ID');

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/ContactService.php';
require_once __DIR__ . '/../../helpers/headers.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    $authHeader = getHeader('authorization', '') ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Authorization token required']);
        exit();
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    $companyId = getHeader('x-company-id') ?? null;
    if (!$companyId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Company context required']);
        exit();
    }

    if (!$auth->userHasAccessToCompany($userData['user_id'], $companyId)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Access denied']);
        exit();
    }

    $contactId = $_GET['id'] ?? null;
    if (!$contactId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Contact ID required']);
        exit();
    }

    $contactService = new ContactService();

    try {
        $contact = $contactService->getContact($contactId);

        // Verify contact belongs to user's company
        if ($contact['company_id'] !== $companyId) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied']);
            exit();
        }

        echo json_encode([
            'success' => true,
            'data' => $contact
        ]);
    } catch (Exception $e) {
        if (strpos($e->getMessage(), 'not found') !== false) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Contact not found']);
        } else {
            throw $e;
        }
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
