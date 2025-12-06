<?php
/**
 * Retrospective Items API Endpoint
 * Manages individual retrospective items (went_well, to_improve, action_items)
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json');

try {
    // Authenticate user
    $auth = authenticate();

    // Get company ID from header
    $companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
    if (!$companyId) {
        throw new Exception('Company ID is required', 400);
    }

    $db = getDBConnection();
    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'POST':
            handlePost($db, $companyId, $auth);
            break;

        case 'PUT':
            handlePut($db, $companyId, $auth);
            break;

        case 'DELETE':
            handleDelete($db, $companyId, $auth);
            break;

        default:
            throw new Exception('Method not allowed', 405);
    }

} catch (Exception $e) {
    $statusCode = $e->getCode() ?: 500;
    http_response_code($statusCode);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

function handlePost($db, $companyId, $auth) {
    $input = json_decode(file_get_contents('php://input'), true);

    $retrospectiveId = $input['retrospective_id'] ?? null;
    $category = $input['category'] ?? null;
    $content = $input['content'] ?? null;

    if (!$retrospectiveId || !$category || !$content) {
        throw new Exception('Retrospective ID, category, and content are required', 400);
    }

    // Validate category
    $validCategories = ['went_well', 'to_improve', 'action_item'];
    if (!in_array($category, $validCategories)) {
        throw new Exception('Invalid category. Must be: went_well, to_improve, or action_item', 400);
    }

    // Verify retrospective exists and belongs to company
    $checkQuery = "SELECT id FROM sprint_retrospectives WHERE id = $1 AND company_id = $2";
    $checkResult = pg_query_params($db, $checkQuery, [$retrospectiveId, $companyId]);

    if (pg_num_rows($checkResult) === 0) {
        throw new Exception('Retrospective not found', 404);
    }

    $assigneeId = $input['assignee_id'] ?? null;
    $dueDate = $input['due_date'] ?? null;

    $query = "
        INSERT INTO retrospective_items (
            company_id, retrospective_id, category, content,
            created_by, assignee_id, due_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, votes, status, created_at
    ";

    $result = pg_query_params($db, $query, [
        $companyId,
        $retrospectiveId,
        $category,
        $content,
        $auth['user_id'],
        $assigneeId,
        $dueDate
    ]);

    if (!$result) {
        throw new Exception('Failed to create retrospective item', 500);
    }

    $item = pg_fetch_assoc($result);

    echo json_encode([
        'success' => true,
        'data' => [
            'id' => $item['id'],
            'content' => $content,
            'category' => $category,
            'votes' => (int)$item['votes'],
            'status' => $item['status'],
            'created_at' => $item['created_at'],
            'message' => 'Item added successfully'
        ]
    ]);
}

function handlePut($db, $companyId, $auth) {
    $input = json_decode(file_get_contents('php://input'), true);

    $id = $input['id'] ?? null;
    if (!$id) {
        throw new Exception('Item ID is required', 400);
    }

    // Check for vote action
    if (isset($input['action']) && $input['action'] === 'vote') {
        handleVote($db, $companyId, $id);
        return;
    }

    // Build update query dynamically
    $fields = [];
    $params = [$companyId, $id];
    $paramCount = 2;

    if (isset($input['content'])) {
        $paramCount++;
        $fields[] = "content = $paramCount";
        $params[] = $input['content'];
    }

    if (isset($input['assignee_id'])) {
        $paramCount++;
        $fields[] = "assignee_id = $paramCount";
        $params[] = $input['assignee_id'];
    }

    if (isset($input['due_date'])) {
        $paramCount++;
        $fields[] = "due_date = $paramCount";
        $params[] = $input['due_date'];
    }

    if (isset($input['status'])) {
        $validStatuses = ['open', 'in_progress', 'completed', 'cancelled'];
        if (!in_array($input['status'], $validStatuses)) {
            throw new Exception('Invalid status', 400);
        }

        $paramCount++;
        $fields[] = "status = $paramCount";
        $params[] = $input['status'];
    }

    if (empty($fields)) {
        throw new Exception('No fields to update', 400);
    }

    $query = "
        UPDATE retrospective_items
        SET " . implode(', ', $fields) . "
        WHERE company_id = $1 AND id = $2
        RETURNING id
    ";

    $result = pg_query_params($db, $query, $params);

    if (!$result || pg_affected_rows($result) === 0) {
        throw new Exception('Item not found or update failed', 404);
    }

    echo json_encode([
        'success' => true,
        'message' => 'Item updated successfully'
    ]);
}

function handleVote($db, $companyId, $id) {
    $query = "
        UPDATE retrospective_items
        SET votes = votes + 1
        WHERE company_id = $1 AND id = $2
        RETURNING votes
    ";

    $result = pg_query_params($db, $query, [$companyId, $id]);

    if (!$result || pg_affected_rows($result) === 0) {
        throw new Exception('Item not found', 404);
    }

    $item = pg_fetch_assoc($result);

    echo json_encode([
        'success' => true,
        'data' => [
            'votes' => (int)$item['votes'],
            'message' => 'Vote recorded'
        ]
    ]);
}

function handleDelete($db, $companyId, $auth) {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        throw new Exception('Item ID is required', 400);
    }

    $query = "DELETE FROM retrospective_items WHERE id = $1 AND company_id = $2";
    $result = pg_query_params($db, $query, [$id, $companyId]);

    if (!$result || pg_affected_rows($result) === 0) {
        throw new Exception('Item not found', 404);
    }

    echo json_encode([
        'success' => true,
        'message' => 'Item deleted successfully'
    ]);
}
