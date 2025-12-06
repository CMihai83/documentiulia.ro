<?php
/**
 * Create Contact Endpoint
 * POST /api/v1/contacts/create
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

// IMPORTANT: Read input BEFORE includes
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/ContactService.php';
require_once __DIR__ . '/../../helpers/headers.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

// Validate JSON input
if ($input === null && !empty($rawInput)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Invalid JSON format',
        'errors' => ['json' => 'Request body must be valid JSON']
    ]);
    exit();
}

// Initialize as empty array if no input
if ($input === null) {
    $input = [];
}

// Validate that request body is not completely empty
if (empty($input) || count($input) === 0) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Request body is required',
        'errors' => [
            'body' => 'Request body cannot be empty. Required fields: name (or display_name). Optional: type, email, phone'
        ]
    ]);
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

    // Validate required fields - accept both naming conventions
    // Accept both 'type' and 'contact_type', default to 'customer'
    if (empty($input['contact_type'])) {
        if (!empty($input['type'])) {
            $input['contact_type'] = $input['type'];
        } else {
            // Default to customer if not specified
            $input['contact_type'] = 'customer';
        }
    }

    // Normalize 'client' to 'customer' (common alias)
    if ($input['contact_type'] === 'client') {
        $input['contact_type'] = 'customer';
    }

    // Accept both 'name' and 'display_name'
    $displayName = trim($input['display_name'] ?? $input['name'] ?? '');

    if (empty($displayName)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Name is required',
            'errors' => ['name' => 'Name is required and cannot be empty']
        ]);
        exit();
    }

    // Sanitize input to prevent XSS
    $displayName = htmlspecialchars($displayName, ENT_QUOTES, 'UTF-8');
    $input['display_name'] = $displayName;

    // Sanitize other text fields
    if (!empty($input['email'])) {
        $input['email'] = filter_var($input['email'], FILTER_SANITIZE_EMAIL);
    }
    if (!empty($input['phone'])) {
        $input['phone'] = htmlspecialchars($input['phone'], ENT_QUOTES, 'UTF-8');
    }
    if (!empty($input['notes'])) {
        $input['notes'] = htmlspecialchars($input['notes'], ENT_QUOTES, 'UTF-8');
    }

    $contactService = new ContactService();
    $contact = $contactService->createContact($companyId, $input);

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Contact created successfully',
        'data' => $contact
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
