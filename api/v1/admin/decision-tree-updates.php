<?php
/**
 * Decision Tree Update Management API
 * Manages update points, pending updates, and variable changes
 */

require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

try {
    $db = Database::getInstance()->getConnection();

    // Get action from input
    $action = $input['action'] ?? '';

    switch ($action) {
        case 'get_overdue_points':
            // Get all overdue update points
            $stmt = $db->query("
                SELECT * FROM overdue_update_points
                ORDER BY priority_order, days_overdue DESC
                LIMIT 100
            ");

            $overduePoints = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get summary by criticality
            $summaryStmt = $db->query("
                SELECT
                    criticality,
                    COUNT(*) as count,
                    MAX(days_overdue) as max_days_overdue
                FROM overdue_update_points
                GROUP BY criticality
                ORDER BY
                    CASE criticality
                        WHEN 'critical' THEN 1
                        WHEN 'high' THEN 2
                        WHEN 'medium' THEN 3
                        ELSE 4
                    END
            ");

            $result = [
                'success' => true,
                'overdue_points' => $overduePoints,
                'summary' => $summaryStmt->fetchAll(PDO::FETCH_ASSOC),
                'total_count' => count($overduePoints)
            ];
            break;

        case 'get_due_this_week':
            $stmt = $db->query("
                SELECT * FROM update_points_due_this_week
                ORDER BY next_verification_due
            ");
            $result = [
                'success' => true,
                'due_points' => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ];
            break;

        case 'mark_verified':
            // Mark update point as verified
            if (!isset($input['point_id'])) {
                throw new Exception('Missing point_id parameter');
            }

            $stmt = $db->prepare("
                UPDATE decision_tree_update_points
                SET last_verified = NOW(),
                    updated_at = NOW()
                WHERE id = :point_id
                RETURNING id, next_verification_due
            ");
            $stmt->execute(['point_id' => $input['point_id']]);
            $updated = $stmt->fetch(PDO::FETCH_ASSOC);

            $result = [
                'success' => true,
                'message' => 'Update point marked as verified',
                'updated' => $updated
            ];
            break;

        case 'update_variable':
            // Update variable value and propagate changes
            if (!isset($input['variable_key']) || !isset($input['new_value'])) {
                throw new Exception('Missing variable_key or new_value parameters');
            }

            $stmt = $db->prepare("
                SELECT * FROM propagate_variable_update(:var_key, :new_value, :auto_apply)
            ");
            $stmt->execute([
                'var_key' => $input['variable_key'],
                'new_value' => $input['new_value'],
                'auto_apply' => $input['auto_apply'] ?? false
            ]);

            $updateResult = $stmt->fetch(PDO::FETCH_ASSOC);

            $result = [
                'success' => true,
                'update_result' => $updateResult
            ];
            break;

        case 'get_pending_updates':
            $stmt = $db->query("
                SELECT
                    pu.*,
                    dt.tree_name,
                    dt.tree_key
                FROM pending_tree_updates pu
                JOIN decision_trees dt ON pu.tree_id = dt.id
                WHERE pu.reviewed = FALSE
                ORDER BY
                    CASE pu.change_type
                        WHEN 'legislation_change' THEN 1
                        WHEN 'variable_update' THEN 2
                        ELSE 3
                    END,
                    pu.created_at DESC
                LIMIT 50
            ");
            $result = [
                'success' => true,
                'pending_updates' => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ];
            break;

        case 'approve_pending_update':
            // Approve and apply pending update
            if (!isset($input['update_id']) || !isset($input['answer_id'])) {
                throw new Exception('Missing update_id or answer_id parameters');
            }

            $db->beginTransaction();

            try {
                // Get the pending update
                $stmt = $db->prepare("
                    SELECT * FROM pending_tree_updates WHERE id = :update_id
                ");
                $stmt->execute(['update_id' => $input['update_id']]);
                $pendingUpdate = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$pendingUpdate) {
                    throw new Exception('Pending update not found');
                }

                // Apply the update
                $stmt = $db->prepare("
                    UPDATE decision_answers
                    SET {$pendingUpdate['field_name']} = :new_content,
                        last_content_update = NOW(),
                        updated_at = NOW()
                    WHERE id = :answer_id
                ");
                $stmt->execute([
                    'new_content' => $pendingUpdate['proposed_content'],
                    'answer_id' => $input['answer_id']
                ]);

                // Mark as reviewed and approved
                $stmt = $db->prepare("
                    UPDATE pending_tree_updates
                    SET reviewed = TRUE,
                        approved = TRUE,
                        reviewed_at = NOW(),
                        review_notes = :notes
                    WHERE id = :update_id
                ");
                $stmt->execute([
                    'update_id' => $input['update_id'],
                    'notes' => $input['review_notes'] ?? 'Approved via admin dashboard'
                ]);

                // Log to history
                $stmt = $db->prepare("
                    INSERT INTO decision_tree_update_history (
                        update_point_id, tree_id, answer_id, field_name,
                        old_value, new_value, change_type, trigger_source, auto_applied
                    ) VALUES (
                        :update_point_id, :tree_id, :answer_id, :field_name,
                        :old_value, :new_value, :change_type, :trigger_source, FALSE
                    )
                ");
                $stmt->execute([
                    'update_point_id' => $pendingUpdate['update_point_id'],
                    'tree_id' => $pendingUpdate['tree_id'],
                    'answer_id' => $input['answer_id'],
                    'field_name' => $pendingUpdate['field_name'],
                    'old_value' => $pendingUpdate['current_content'],
                    'new_value' => $pendingUpdate['proposed_content'],
                    'change_type' => $pendingUpdate['change_type'],
                    'trigger_source' => $pendingUpdate['trigger_source']
                ]);

                $db->commit();

                $result = [
                    'success' => true,
                    'message' => 'Update approved and applied successfully'
                ];
            } catch (Exception $e) {
                $db->rollBack();
                throw $e;
            }
            break;

        case 'get_statistics':
            $stmt = $db->query("SELECT * FROM update_points_statistics");
            $result = [
                'success' => true,
                'statistics' => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ];
            break;

        case 'get_all_variables':
            $stmt = $db->query("
                SELECT * FROM legislation_variables
                ORDER BY variable_key
            ");
            $result = [
                'success' => true,
                'variables' => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ];
            break;

        case 'get_update_history':
            $limit = $input['limit'] ?? 50;
            $stmt = $db->prepare("
                SELECT
                    uh.*,
                    dt.tree_name
                FROM decision_tree_update_history uh
                LEFT JOIN decision_trees dt ON uh.tree_id = dt.id
                ORDER BY uh.created_at DESC
                LIMIT :limit
            ");
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->execute();

            $result = [
                'success' => true,
                'history' => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ];
            break;

        default:
            $result = [
                'success' => false,
                'message' => 'Invalid action: ' . $action
            ];
    }

    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
