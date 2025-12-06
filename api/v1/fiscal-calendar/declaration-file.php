<?php
/**
 * Declaration File Upload/Download
 * POST /api/v1/fiscal-calendar/declaration-file - Upload declaration file
 * GET  /api/v1/fiscal-calendar/declaration-file?id=xxx - Download declaration file
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/headers.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // Verify authentication
    $authHeader = getHeader('authorization', '');

    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    $companyId = getHeader('x-company-id');
    $userId = $userData['user_id'];

    $db = Database::getInstance()->getConnection();

    // POST - Upload declaration file
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if (!isset($_POST['calendar_entry_id'])) {
            http_response_code(400);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Calendar entry ID required']);
            exit;
        }

        if (!isset($_FILES['file'])) {
            http_response_code(400);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'No file uploaded']);
            exit;
        }

        $calendarEntryId = $_POST['calendar_entry_id'];
        $file = $_FILES['file'];

        // Validate file type
        $allowedTypes = ['application/pdf', 'application/xml', 'text/xml'];
        if (!in_array($file['type'], $allowedTypes)) {
            http_response_code(400);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Only PDF and XML files are allowed']);
            exit;
        }

        // Validate file size (max 10MB)
        if ($file['size'] > 10 * 1024 * 1024) {
            http_response_code(400);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'File size must be less than 10MB']);
            exit;
        }

        // Get calendar entry
        $stmt = $db->prepare("SELECT * FROM company_fiscal_calendar WHERE id = :id");
        $stmt->execute(['id' => $calendarEntryId]);
        $entry = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$entry) {
            http_response_code(404);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Calendar entry not found']);
            exit;
        }

        // Create storage directory
        $storageDir = '/var/www/documentiulia.ro/storage/declarations';
        if (!file_exists($storageDir)) {
            mkdir($storageDir, 0755, true);
        }

        // Generate unique filename
        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = uniqid('decl_') . '.' . $extension;
        $filepath = $storageDir . '/' . $filename;

        // Move uploaded file
        if (!move_uploaded_file($file['tmp_name'], $filepath)) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Failed to save file']);
            exit;
        }

        // Create or update declaration record
        $stmt = $db->prepare("
            INSERT INTO fiscal_declarations (
                company_id, user_id, form_id, period_year, period_month,
                status, file_path, original_filename, created_by
            ) VALUES (
                :company_id, :user_id, (SELECT id FROM anaf_declaration_forms LIMIT 1),
                :year, :month, 'submitted', :file_path, :original_filename, :created_by
            ) RETURNING id
        ");

        $declarationId = $stmt->execute([
            'company_id' => $companyId,
            'user_id' => $userId,
            'year' => $entry['year'],
            'month' => $entry['month'],
            'file_path' => $filename,
            'original_filename' => $file['name'],
            'created_by' => $userId
        ]) ? $stmt->fetchColumn() : null;

        if (!$declarationId) {
            unlink($filepath);
            throw new Exception("Failed to create declaration record");
        }

        // Update calendar entry with declaration ID
        $stmt = $db->prepare("
            UPDATE company_fiscal_calendar
            SET declaration_id = :declaration_id, updated_at = NOW()
            WHERE id = :id
        ");
        $stmt->execute([
            'declaration_id' => $declarationId,
            'id' => $calendarEntryId
        ]);

        header('Content-Type: application/json');
        echo json_encode([
            'success' => true,
            'message' => 'Declaration uploaded successfully',
            'declaration_id' => $declarationId
        ]);
    }

    // GET - Download declaration file
    elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (!isset($_GET['id'])) {
            http_response_code(400);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Declaration ID required']);
            exit;
        }

        $declarationId = $_GET['id'];

        // Get declaration
        $stmt = $db->prepare("SELECT * FROM fiscal_declarations WHERE id = :id");
        $stmt->execute(['id' => $declarationId]);
        $declaration = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$declaration) {
            http_response_code(404);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Declaration not found']);
            exit;
        }

        // Verify ownership
        if ($companyId && $declaration['company_id'] !== $companyId) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Access denied']);
            exit;
        }

        $filepath = '/var/www/documentiulia.ro/storage/declarations/' . $declaration['file_path'];

        if (!file_exists($filepath)) {
            http_response_code(404);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'File not found']);
            exit;
        }

        // Determine content type
        $extension = pathinfo($filepath, PATHINFO_EXTENSION);
        $contentType = $extension === 'pdf' ? 'application/pdf' : 'application/xml';

        // Send file
        header('Content-Type: ' . $contentType);
        header('Content-Disposition: attachment; filename="' . $declaration['original_filename'] . '"');
        header('Content-Length: ' . filesize($filepath));
        readfile($filepath);
    }

} catch (Exception $e) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
