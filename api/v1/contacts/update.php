<?php
/**
 * Update Contact Endpoint
 * PUT /api/v1/contacts/{id}
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/ContactService.php';
require_once __DIR__ . '/../../helpers/headers.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    // Authenticate
    $authHeader = getHeader('authorization', '') ?? '';

    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    // Get company from header
    $companyId = getHeader('x-company-id') ?? null;
    if (!$companyId) {
        throw new Exception('Company ID required');
    }

    // Get request data first
    $input = json_decode(file_get_contents('php://input'), true);

    if (empty($input)) {
        throw new Exception('No data provided');
    }

    // Get contact ID from JSON body or URL path (backward compatibility)
    $contactId = null;
    if (!empty($input['id'])) {
        $contactId = $input['id'];
    } else {
        // Try to get from URL path
        $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $pathParts = explode('/', trim($path, '/'));
        $contactId = end($pathParts);
    }

    if (empty($contactId)) {
        throw new Exception('Contact ID is required');
    }

    // Accept 'name' as alias for 'display_name'
    if (!empty($input['name']) && empty($input['display_name'])) {
        $input['display_name'] = $input['name'];
    }

    $contactService = new ContactService();

    // Verify contact belongs to company
    $existingContact = $contactService->getContact($contactId);
    if ($existingContact['company_id'] !== $companyId) {
        throw new Exception('Contact not found');
    }

    $contact = $contactService->updateContact($contactId, $input);

    echo json_encode([
        'success' => true,
        'message' => 'Contact updated successfully',
        'data' => $contact
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
