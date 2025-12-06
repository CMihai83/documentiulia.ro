<?php
/**
 * Alerts API
 * Business alerts and automated notifications
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
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

$method = $_SERVER['REQUEST_METHOD'];

// Alert types
$alertTypes = [
    'invoice_overdue' => ['ro' => 'Factură restantă', 'en' => 'Overdue Invoice', 'severity' => 'warning', 'icon' => 'receipt'],
    'payment_due' => ['ro' => 'Plată scadentă', 'en' => 'Payment Due', 'severity' => 'info', 'icon' => 'payments'],
    'low_stock' => ['ro' => 'Stoc scăzut', 'en' => 'Low Stock', 'severity' => 'warning', 'icon' => 'inventory'],
    'out_of_stock' => ['ro' => 'Stoc epuizat', 'en' => 'Out of Stock', 'severity' => 'error', 'icon' => 'remove_shopping_cart'],
    'budget_exceeded' => ['ro' => 'Buget depășit', 'en' => 'Budget Exceeded', 'severity' => 'error', 'icon' => 'money_off'],
    'deadline_approaching' => ['ro' => 'Termen apropiat', 'en' => 'Deadline Approaching', 'severity' => 'warning', 'icon' => 'schedule'],
    'contract_expiring' => ['ro' => 'Contract expiră', 'en' => 'Contract Expiring', 'severity' => 'info', 'icon' => 'description'],
    'license_expiring' => ['ro' => 'Licență expiră', 'en' => 'License Expiring', 'severity' => 'warning', 'icon' => 'verified'],
    'subscription_expiring' => ['ro' => 'Abonament expiră', 'en' => 'Subscription Expiring', 'severity' => 'warning', 'icon' => 'card_membership'],
    'tax_deadline' => ['ro' => 'Termen fiscal', 'en' => 'Tax Deadline', 'severity' => 'error', 'icon' => 'gavel'],
    'document_expiring' => ['ro' => 'Document expiră', 'en' => 'Document Expiring', 'severity' => 'info', 'icon' => 'folder'],
    'bank_balance_low' => ['ro' => 'Sold bancar scăzut', 'en' => 'Low Bank Balance', 'severity' => 'warning', 'icon' => 'account_balance'],
    'cash_flow_warning' => ['ro' => 'Avertisment flux numerar', 'en' => 'Cash Flow Warning', 'severity' => 'warning', 'icon' => 'trending_down'],
    'goal_achieved' => ['ro' => 'Obiectiv atins', 'en' => 'Goal Achieved', 'severity' => 'success', 'icon' => 'emoji_events'],
];

// Severity levels
$severityLevels = [
    'info' => ['ro' => 'Informare', 'en' => 'Info', 'color' => '#2196F3', 'order' => 1],
    'success' => ['ro' => 'Succes', 'en' => 'Success', 'color' => '#4CAF50', 'order' => 2],
    'warning' => ['ro' => 'Avertisment', 'en' => 'Warning', 'color' => '#FF9800', 'order' => 3],
    'error' => ['ro' => 'Eroare', 'en' => 'Error', 'color' => '#F44336', 'order' => 4],
];

// Alert statuses
$alertStatuses = [
    'active' => ['ro' => 'Activă', 'en' => 'Active'],
    'acknowledged' => ['ro' => 'Confirmată', 'en' => 'Acknowledged'],
    'resolved' => ['ro' => 'Rezolvată', 'en' => 'Resolved'],
    'dismissed' => ['ro' => 'Ignorată', 'en' => 'Dismissed'],
    'snoozed' => ['ro' => 'Amânată', 'en' => 'Snoozed'],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? 'list';

            if ($action === 'list') {
                $severity = $_GET['severity'] ?? null;
                $type = $_GET['type'] ?? null;
                $status = $_GET['status'] ?? 'active';

                $sql = "SELECT * FROM business_alerts WHERE company_id = :company_id";
                $params = ['company_id' => $companyId];

                if ($status !== 'all') {
                    $sql .= " AND status = :status";
                    $params['status'] = $status;
                }
                if ($severity) {
                    $sql .= " AND severity = :severity";
                    $params['severity'] = $severity;
                }
                if ($type) {
                    $sql .= " AND alert_type = :type";
                    $params['type'] = $type;
                }

                $sql .= " ORDER BY severity_order DESC, created_at DESC LIMIT 100";

                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                $alerts = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($alerts as &$alert) {
                    $alert['type_config'] = $alertTypes[$alert['alert_type']] ?? null;
                    $alert['severity_config'] = $severityLevels[$alert['severity']] ?? null;
                    $alert['status_label'] = $alertStatuses[$alert['status']] ?? null;
                    $alert['metadata'] = json_decode($alert['metadata'] ?? '{}', true);
                }

                // Count by severity
                $stmt = $db->prepare("
                    SELECT severity, COUNT(*) as count FROM business_alerts
                    WHERE company_id = :company_id AND status = 'active'
                    GROUP BY severity
                ");
                $stmt->execute(['company_id' => $companyId]);
                $counts = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'alerts' => $alerts,
                        'counts' => $counts,
                        'total_active' => array_sum($counts),
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'types') {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'types' => $alertTypes,
                        'severities' => $severityLevels,
                        'statuses' => $alertStatuses,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'dashboard') {
                // Get alert summary for dashboard
                $stmt = $db->prepare("
                    SELECT 
                        COUNT(*) FILTER (WHERE severity = 'error' AND status = 'active') as critical,
                        COUNT(*) FILTER (WHERE severity = 'warning' AND status = 'active') as warnings,
                        COUNT(*) FILTER (WHERE severity = 'info' AND status = 'active') as info,
                        COUNT(*) FILTER (WHERE status = 'active') as total_active
                    FROM business_alerts
                    WHERE company_id = :company_id
                ");
                $stmt->execute(['company_id' => $companyId]);
                $summary = $stmt->fetch(PDO::FETCH_ASSOC);

                // Get recent alerts
                $stmt = $db->prepare("
                    SELECT * FROM business_alerts
                    WHERE company_id = :company_id AND status = 'active'
                    ORDER BY severity_order DESC, created_at DESC
                    LIMIT 5
                ");
                $stmt->execute(['company_id' => $companyId]);
                $recent = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($recent as &$alert) {
                    $alert['type_config'] = $alertTypes[$alert['alert_type']] ?? null;
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'summary' => $summary,
                        'recent' => $recent,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            $action = $_GET['action'] ?? 'create';

            if ($action === 'create') {
                // Create manual alert (admin/manager only)
                if (!in_array($user['role'], ['admin', 'manager'])) {
                    http_response_code(403);
                    echo json_encode(['success' => false, 'error_ro' => 'Nu aveți permisiunea', 'error' => 'Permission denied']);
                    exit;
                }

                $input = json_decode(file_get_contents('php://input'), true);
                $alertType = $input['type'] ?? null;
                $title = $input['title'] ?? null;
                $message = $input['message'] ?? null;

                if (!$alertType || !$title || !$message) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error_ro' => 'Tip, titlu și mesaj obligatorii', 'error' => 'Type, title and message required']);
                    exit;
                }

                $typeConfig = $alertTypes[$alertType] ?? null;
                $severity = $typeConfig['severity'] ?? 'info';

                $alertId = 'alert_' . bin2hex(random_bytes(8));
                $stmt = $db->prepare("
                    INSERT INTO business_alerts (
                        id, company_id, alert_type, severity, severity_order, title, message,
                        status, metadata, entity_type, entity_id, created_by, created_at
                    ) VALUES (
                        :id, :company_id, :alert_type, :severity, :severity_order, :title, :message,
                        'active', :metadata, :entity_type, :entity_id, :created_by, NOW()
                    )
                ");
                $stmt->execute([
                    'id' => $alertId,
                    'company_id' => $companyId,
                    'alert_type' => $alertType,
                    'severity' => $severity,
                    'severity_order' => $severityLevels[$severity]['order'] ?? 1,
                    'title' => $title,
                    'message' => $message,
                    'metadata' => json_encode($input['metadata'] ?? []),
                    'entity_type' => $input['entity_type'] ?? null,
                    'entity_id' => $input['entity_id'] ?? null,
                    'created_by' => $user['user_id'],
                ]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Alertă creată',
                    'message_en' => 'Alert created',
                    'data' => ['id' => $alertId],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'acknowledge') {
                $input = json_decode(file_get_contents('php://input'), true);
                $alertIds = $input['ids'] ?? [];

                if (empty($alertIds)) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Alert IDs required']);
                    exit;
                }

                $placeholders = implode(',', array_fill(0, count($alertIds), '?'));
                $params = array_merge($alertIds, [$user['user_id'], $companyId]);
                $stmt = $db->prepare("
                    UPDATE business_alerts SET status = 'acknowledged', acknowledged_by = ?, acknowledged_at = NOW()
                    WHERE id IN ($placeholders) AND company_id = ?
                ");
                $stmt->execute($params);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Alerte confirmate',
                    'message_en' => 'Alerts acknowledged',
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'resolve') {
                $input = json_decode(file_get_contents('php://input'), true);
                $alertId = $input['id'] ?? null;
                $resolution = $input['resolution'] ?? null;

                if (!$alertId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Alert ID required']);
                    exit;
                }

                $stmt = $db->prepare("
                    UPDATE business_alerts SET status = 'resolved', resolved_by = :resolved_by, resolved_at = NOW(), resolution_notes = :resolution
                    WHERE id = :id AND company_id = :company_id
                ");
                $stmt->execute(['id' => $alertId, 'company_id' => $companyId, 'resolved_by' => $user['user_id'], 'resolution' => $resolution]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Alertă rezolvată',
                    'message_en' => 'Alert resolved',
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'snooze') {
                $input = json_decode(file_get_contents('php://input'), true);
                $alertId = $input['id'] ?? null;
                $duration = $input['duration'] ?? '1 day';

                if (!$alertId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Alert ID required']);
                    exit;
                }

                $snoozeUntil = date('Y-m-d H:i:s', strtotime("+$duration"));
                $stmt = $db->prepare("
                    UPDATE business_alerts SET status = 'snoozed', snoozed_until = :snooze_until
                    WHERE id = :id AND company_id = :company_id
                ");
                $stmt->execute(['id' => $alertId, 'company_id' => $companyId, 'snooze_until' => $snoozeUntil]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Alertă amânată',
                    'message_en' => 'Alert snoozed',
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'dismiss') {
                $input = json_decode(file_get_contents('php://input'), true);
                $alertIds = $input['ids'] ?? [];

                if (empty($alertIds)) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Alert IDs required']);
                    exit;
                }

                $placeholders = implode(',', array_fill(0, count($alertIds), '?'));
                $params = array_merge($alertIds, [$companyId]);
                $stmt = $db->prepare("UPDATE business_alerts SET status = 'dismissed' WHERE id IN ($placeholders) AND company_id = ?");
                $stmt->execute($params);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Alerte ignorate',
                    'message_en' => 'Alerts dismissed',
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'DELETE':
            $alertId = $_GET['id'] ?? null;
            if (!$alertId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Alert ID required']);
                exit;
            }

            $stmt = $db->prepare("DELETE FROM business_alerts WHERE id = :id AND company_id = :company_id");
            $stmt->execute(['id' => $alertId, 'company_id' => $companyId]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Alertă ștearsă',
                'message_en' => 'Alert deleted',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
