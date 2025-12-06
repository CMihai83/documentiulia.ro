<?php
/**
 * Fiscal Declaration CRUD
 * GET    /api/v1/fiscal-calendar/declaration?id=xxx  - Get declaration details
 * PUT    /api/v1/fiscal-calendar/declaration?id=xxx  - Update declaration
 * DELETE /api/v1/fiscal-calendar/declaration?id=xxx  - Delete declaration
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, PUT, DELETE, OPTIONS');
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

    // Get company context (optional for individuals)
    $companyId = getHeader('x-company-id');
    $userId = $userData['user_id'];

    // Connect to database
    $db = Database::getInstance()->getConnection();

    // GET - Get declaration details
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (!isset($_GET['id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Declaration ID required']);
            exit;
        }

        $declaration_id = $_GET['id'];

        // Get declaration
        $stmt = $db->prepare("
            SELECT
                fd.*,
                adf.form_code,
                adf.form_name,
                adf.form_version,
                adf.form_structure,
                adf.validation_rules
            FROM fiscal_declarations fd
            JOIN anaf_declaration_forms adf ON fd.form_id = adf.id
            WHERE fd.id = :id
        ");
        $stmt->execute(['id' => $declaration_id]);
        $declaration = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$declaration) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Declaration not found']);
            exit;
        }

        // Verify ownership
        if ($companyId && $declaration['company_id'] !== $companyId) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied']);
            exit;
        }
        if (!$companyId && $declaration['user_id'] !== $userId) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied']);
            exit;
        }

        // Parse JSON fields
        $declaration['form_data'] = json_decode($declaration['form_data'], true);
        $declaration['data_sources'] = json_decode($declaration['data_sources'], true);
        $declaration['validation_errors'] = json_decode($declaration['validation_errors'], true);
        $declaration['validation_warnings'] = json_decode($declaration['validation_warnings'], true);
        $declaration['form_structure'] = json_decode($declaration['form_structure'], true);
        $declaration['validation_rules'] = json_decode($declaration['validation_rules'], true);

        echo json_encode([
            'success' => true,
            'data' => $declaration
        ]);
    }

    // PUT - Update declaration
    elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        if (!isset($_GET['id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Declaration ID required']);
            exit;
        }

        $declaration_id = $_GET['id'];
        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['form_data'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Form data required']);
            exit;
        }

        // Verify ownership first
        $stmt = $db->prepare("SELECT company_id, user_id, status FROM fiscal_declarations WHERE id = :id");
        $stmt->execute(['id' => $declaration_id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Declaration not found']);
            exit;
        }

        if ($companyId && $existing['company_id'] !== $companyId) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied']);
            exit;
        }

        if ($existing['status'] === 'submitted') {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Cannot modify submitted declaration']);
            exit;
        }

        // Update declaration
        $stmt = $db->prepare("
            UPDATE fiscal_declarations SET
                form_data = :form_data,
                validation_status = 'pending',
                reviewed_by = :user_id,
                reviewed_at = NOW(),
                updated_at = NOW()
            WHERE id = :id
        ");
        $stmt->execute([
            'id' => $declaration_id,
            'form_data' => json_encode($input['form_data']),
            'user_id' => $userId
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'Declaration updated successfully'
        ]);
    }

    // DELETE - Delete declaration
    elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        if (!isset($_GET['id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Declaration ID required']);
            exit;
        }

        $declaration_id = $_GET['id'];

        // Verify ownership
        $stmt = $db->prepare("SELECT company_id, user_id, status FROM fiscal_declarations WHERE id = :id");
        $stmt->execute(['id' => $declaration_id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Declaration not found']);
            exit;
        }

        if ($existing['status'] === 'submitted') {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Cannot delete submitted declaration']);
            exit;
        }

        // Delete
        $stmt = $db->prepare("DELETE FROM fiscal_declarations WHERE id = :id");
        $stmt->execute(['id' => $declaration_id]);

        echo json_encode([
            'success' => true,
            'message' => 'Declaration deleted successfully'
        ]);
    }

    else {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
