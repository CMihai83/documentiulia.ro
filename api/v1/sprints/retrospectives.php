<?php
/**
 * Sprint Retrospectives API Endpoint
 * Manages sprint retrospectives with items categorization
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
        case 'GET':
            handleGet($db, $companyId, $auth);
            break;

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

function handleGet($db, $companyId, $auth) {
    $sprintId = $_GET['sprint_id'] ?? null;
    $retroId = $_GET['id'] ?? null;

    if ($retroId) {
        // Get specific retrospective with items
        getRetrospectiveDetails($db, $companyId, $retroId);
    } elseif ($sprintId) {
        // Get retrospective for a specific sprint
        getSprintRetrospective($db, $companyId, $sprintId);
    } else {
        // List all retrospectives
        listRetrospectives($db, $companyId);
    }
}

function getRetrospectiveDetails($db, $companyId, $retroId) {
    // Get retrospective
    $query = "
        SELECT
            r.*,
            s.name as sprint_name,
            s.start_date as sprint_start,
            s.end_date as sprint_end,
            u.first_name || ' ' || u.last_name as facilitator_name
        FROM sprint_retrospectives r
        JOIN sprints s ON s.id = r.sprint_id
        LEFT JOIN users u ON u.id = r.facilitator_id
        WHERE r.id = $1 AND r.company_id = $2
    ";

    $result = pg_query_params($db, $query, [$retroId, $companyId]);
    if (!$result || pg_num_rows($result) === 0) {
        throw new Exception('Retrospective not found', 404);
    }

    $retro = pg_fetch_assoc($result);

    // Get items grouped by category
    $itemsQuery = "
        SELECT
            i.*,
            u1.first_name || ' ' || u1.last_name as creator_name,
            u2.first_name || ' ' || u2.last_name as assignee_name
        FROM retrospective_items i
        LEFT JOIN users u1 ON u1.id = i.created_by
        LEFT JOIN users u2 ON u2.id = i.assignee_id
        WHERE i.retrospective_id = $1 AND i.company_id = $2
        ORDER BY i.votes DESC, i.created_at ASC
    ";

    $itemsResult = pg_query_params($db, $itemsQuery, [$retroId, $companyId]);

    $wentWell = [];
    $toImprove = [];
    $actionItems = [];

    while ($item = pg_fetch_assoc($itemsResult)) {
        $formattedItem = [
            'id' => $item['id'],
            'content' => $item['content'],
            'votes' => (int)$item['votes'],
            'creator_name' => $item['creator_name'],
            'assignee_id' => $item['assignee_id'],
            'assignee_name' => $item['assignee_name'],
            'due_date' => $item['due_date'],
            'status' => $item['status'],
            'created_at' => $item['created_at']
        ];

        switch ($item['category']) {
            case 'went_well':
                $wentWell[] = $formattedItem;
                break;
            case 'to_improve':
                $toImprove[] = $formattedItem;
                break;
            case 'action_item':
                $actionItems[] = $formattedItem;
                break;
        }
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'retrospective' => [
                'id' => $retro['id'],
                'sprint_id' => $retro['sprint_id'],
                'sprint_name' => $retro['sprint_name'],
                'sprint_start' => $retro['sprint_start'],
                'sprint_end' => $retro['sprint_end'],
                'conducted_date' => $retro['conducted_date'],
                'facilitator_id' => $retro['facilitator_id'],
                'facilitator_name' => $retro['facilitator_name'],
                'notes' => $retro['notes'],
                'team_sentiment' => $retro['team_sentiment'],
                'sentiment_score' => $retro['sentiment_score'] ? (float)$retro['sentiment_score'] : null,
                'created_at' => $retro['created_at']
            ],
            'items' => [
                'went_well' => $wentWell,
                'to_improve' => $toImprove,
                'action_items' => $actionItems
            ],
            'summary' => [
                'total_items' => count($wentWell) + count($toImprove) + count($actionItems),
                'went_well_count' => count($wentWell),
                'to_improve_count' => count($toImprove),
                'action_items_count' => count($actionItems),
                'completed_actions' => count(array_filter($actionItems, fn($i) => $i['status'] === 'completed')),
                'pending_actions' => count(array_filter($actionItems, fn($i) => $i['status'] !== 'completed' && $i['status'] !== 'cancelled'))
            ]
        ]
    ]);
}

function getSprintRetrospective($db, $companyId, $sprintId) {
    $query = "
        SELECT id FROM sprint_retrospectives
        WHERE sprint_id = $1 AND company_id = $2
    ";

    $result = pg_query_params($db, $query, [$sprintId, $companyId]);

    if (pg_num_rows($result) > 0) {
        $retro = pg_fetch_assoc($result);
        getRetrospectiveDetails($db, $companyId, $retro['id']);
    } else {
        echo json_encode([
            'success' => true,
            'data' => null
        ]);
    }
}

function listRetrospectives($db, $companyId) {
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

    $query = "
        SELECT
            r.*,
            s.name as sprint_name,
            s.start_date as sprint_start,
            s.end_date as sprint_end,
            u.first_name || ' ' || u.last_name as facilitator_name,
            (SELECT COUNT(*) FROM retrospective_items WHERE retrospective_id = r.id) as total_items,
            (SELECT COUNT(*) FROM retrospective_items WHERE retrospective_id = r.id AND category = 'action_item') as action_items_count,
            (SELECT COUNT(*) FROM retrospective_items WHERE retrospective_id = r.id AND category = 'action_item' AND status = 'completed') as completed_actions
        FROM sprint_retrospectives r
        JOIN sprints s ON s.id = r.sprint_id
        LEFT JOIN users u ON u.id = r.facilitator_id
        WHERE r.company_id = $1
        ORDER BY r.conducted_date DESC
        LIMIT $2 OFFSET $3
    ";

    $result = pg_query_params($db, $query, [$companyId, $limit, $offset]);

    $retrospectives = [];
    while ($row = pg_fetch_assoc($result)) {
        $retrospectives[] = [
            'id' => $row['id'],
            'sprint_id' => $row['sprint_id'],
            'sprint_name' => $row['sprint_name'],
            'sprint_start' => $row['sprint_start'],
            'sprint_end' => $row['sprint_end'],
            'conducted_date' => $row['conducted_date'],
            'facilitator_name' => $row['facilitator_name'],
            'team_sentiment' => $row['team_sentiment'],
            'sentiment_score' => $row['sentiment_score'] ? (float)$row['sentiment_score'] : null,
            'total_items' => (int)$row['total_items'],
            'action_items_count' => (int)$row['action_items_count'],
            'completed_actions' => (int)$row['completed_actions']
        ];
    }

    echo json_encode([
        'success' => true,
        'data' => $retrospectives
    ]);
}

function handlePost($db, $companyId, $auth) {
    $input = json_decode(file_get_contents('php://input'), true);

    $sprintId = $input['sprint_id'] ?? null;
    if (!$sprintId) {
        throw new Exception('Sprint ID is required', 400);
    }

    // Check if retrospective already exists for this sprint
    $checkQuery = "SELECT id FROM sprint_retrospectives WHERE sprint_id = $1 AND company_id = $2";
    $checkResult = pg_query_params($db, $checkQuery, [$sprintId, $companyId]);

    if (pg_num_rows($checkResult) > 0) {
        throw new Exception('Retrospective already exists for this sprint', 409);
    }

    $conductedDate = $input['conducted_date'] ?? date('Y-m-d');
    $facilitatorId = $input['facilitator_id'] ?? $auth['user_id'];
    $notes = $input['notes'] ?? null;
    $teamSentiment = $input['team_sentiment'] ?? null;
    $sentimentScore = $input['sentiment_score'] ?? null;

    $query = "
        INSERT INTO sprint_retrospectives (
            company_id, sprint_id, conducted_date, facilitator_id,
            notes, team_sentiment, sentiment_score
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
    ";

    $result = pg_query_params($db, $query, [
        $companyId,
        $sprintId,
        $conductedDate,
        $facilitatorId,
        $notes,
        $teamSentiment,
        $sentimentScore
    ]);

    if (!$result) {
        throw new Exception('Failed to create retrospective', 500);
    }

    $retro = pg_fetch_assoc($result);

    echo json_encode([
        'success' => true,
        'data' => [
            'id' => $retro['id'],
            'message' => 'Retrospective created successfully'
        ]
    ]);
}

function handlePut($db, $companyId, $auth) {
    $input = json_decode(file_get_contents('php://input'), true);

    $id = $input['id'] ?? null;
    if (!$id) {
        throw new Exception('Retrospective ID is required', 400);
    }

    // Build update query dynamically
    $fields = [];
    $params = [$companyId, $id];
    $paramCount = 2;

    if (isset($input['notes'])) {
        $paramCount++;
        $fields[] = "notes = $paramCount";
        $params[] = $input['notes'];
    }

    if (isset($input['team_sentiment'])) {
        $paramCount++;
        $fields[] = "team_sentiment = $paramCount";
        $params[] = $input['team_sentiment'];
    }

    if (isset($input['sentiment_score'])) {
        $paramCount++;
        $fields[] = "sentiment_score = $paramCount";
        $params[] = $input['sentiment_score'];
    }

    if (empty($fields)) {
        throw new Exception('No fields to update', 400);
    }

    $query = "
        UPDATE sprint_retrospectives
        SET " . implode(', ', $fields) . "
        WHERE company_id = $1 AND id = $2
        RETURNING id
    ";

    $result = pg_query_params($db, $query, $params);

    if (!$result || pg_affected_rows($result) === 0) {
        throw new Exception('Retrospective not found or update failed', 404);
    }

    echo json_encode([
        'success' => true,
        'message' => 'Retrospective updated successfully'
    ]);
}

function handleDelete($db, $companyId, $auth) {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        throw new Exception('Retrospective ID is required', 400);
    }

    $query = "DELETE FROM sprint_retrospectives WHERE id = $1 AND company_id = $2";
    $result = pg_query_params($db, $query, [$id, $companyId]);

    if (!$result || pg_affected_rows($result) === 0) {
        throw new Exception('Retrospective not found', 404);
    }

    echo json_encode([
        'success' => true,
        'message' => 'Retrospective deleted successfully'
    ]);
}
