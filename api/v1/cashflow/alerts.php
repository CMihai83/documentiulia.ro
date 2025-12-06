<?php
/**
 * Cash Flow Alerts API
 * Configurable alerts for cash flow thresholds
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

$db = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

// Default alert types
$alertTypes = [
    'low_balance' => [
        'name_ro' => 'Sold Scăzut',
        'name_en' => 'Low Balance',
        'description_ro' => 'Alertă când soldul scade sub un prag definit',
        'description_en' => 'Alert when balance falls below defined threshold',
        'default_threshold' => 5000,
    ],
    'negative_forecast' => [
        'name_ro' => 'Prognoză Negativă',
        'name_en' => 'Negative Forecast',
        'description_ro' => 'Alertă când prognoza indică sold negativ',
        'description_en' => 'Alert when forecast indicates negative balance',
        'default_threshold' => 0,
    ],
    'overdue_receivables' => [
        'name_ro' => 'Creanțe Restante',
        'name_en' => 'Overdue Receivables',
        'description_ro' => 'Alertă pentru facturi neplătite la scadență',
        'description_en' => 'Alert for unpaid invoices past due date',
        'default_threshold' => 1000,
    ],
    'large_outflow' => [
        'name_ro' => 'Ieșire Mare de Numerar',
        'name_en' => 'Large Cash Outflow',
        'description_ro' => 'Alertă pentru plăți mari programate',
        'description_en' => 'Alert for large scheduled payments',
        'default_threshold' => 10000,
    ],
    'runway_warning' => [
        'name_ro' => 'Runway Scurt',
        'name_en' => 'Short Runway',
        'description_ro' => 'Alertă când runway-ul scade sub X luni',
        'description_en' => 'Alert when runway falls below X months',
        'default_threshold' => 3,
    ],
];

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['active'])) {
                // Get active alerts (triggered alerts)
                $activeAlerts = checkActiveAlerts($db, $companyId, $alertTypes);
                echo json_encode([
                    'success' => true,
                    'data' => $activeAlerts,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            } else {
                // Get alert configurations
                $stmt = $db->prepare("
                    SELECT * FROM cashflow_alerts
                    WHERE company_id = :company_id
                    ORDER BY created_at DESC
                ");
                $stmt->execute(['company_id' => $companyId]);
                $alerts = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // If no alerts configured, return defaults
                if (empty($alerts)) {
                    $alerts = array_map(function($type, $config) {
                        return [
                            'type' => $type,
                            'name_ro' => $config['name_ro'],
                            'name_en' => $config['name_en'],
                            'threshold' => $config['default_threshold'],
                            'enabled' => true,
                            'notify_email' => true,
                            'notify_push' => true,
                        ];
                    }, array_keys($alertTypes), array_values($alertTypes));
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'configured_alerts' => $alerts,
                        'available_types' => $alertTypes,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);

            if (empty($input['type']) || !isset($alertTypes[$input['type']])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Valid alert type required']);
                exit;
            }

            $stmt = $db->prepare("
                INSERT INTO cashflow_alerts (
                    id, company_id, type, threshold, enabled,
                    notify_email, notify_push, recipients, created_at
                ) VALUES (
                    :id, :company_id, :type, :threshold, :enabled,
                    :notify_email, :notify_push, :recipients, NOW()
                )
                ON CONFLICT (company_id, type) DO UPDATE SET
                    threshold = :threshold,
                    enabled = :enabled,
                    notify_email = :notify_email,
                    notify_push = :notify_push,
                    recipients = :recipients,
                    updated_at = NOW()
                RETURNING *
            ");

            $id = generateUUID();
            $stmt->execute([
                'id' => $id,
                'company_id' => $companyId,
                'type' => $input['type'],
                'threshold' => $input['threshold'] ?? $alertTypes[$input['type']]['default_threshold'],
                'enabled' => $input['enabled'] ?? true,
                'notify_email' => $input['notify_email'] ?? true,
                'notify_push' => $input['notify_push'] ?? true,
                'recipients' => json_encode($input['recipients'] ?? []),
            ]);

            $alert = $stmt->fetch(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => $alert,
                'message_ro' => 'Alertă configurată cu succes',
                'message_en' => 'Alert configured successfully',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            $id = $input['id'] ?? $_GET['id'] ?? null;

            if (!$id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'ID required']);
                exit;
            }

            $updates = [];
            $params = ['id' => $id, 'company_id' => $companyId];

            $allowedFields = ['threshold', 'enabled', 'notify_email', 'notify_push'];
            foreach ($allowedFields as $field) {
                if (isset($input[$field])) {
                    $updates[] = "$field = :$field";
                    $params[$field] = $input[$field];
                }
            }

            if (isset($input['recipients'])) {
                $updates[] = "recipients = :recipients";
                $params['recipients'] = json_encode($input['recipients']);
            }

            if (empty($updates)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'No fields to update']);
                exit;
            }

            $sql = "UPDATE cashflow_alerts SET " . implode(', ', $updates) . ", updated_at = NOW() WHERE id = :id AND company_id = :company_id RETURNING *";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $alert = $stmt->fetch(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => $alert,
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'ID required']);
                exit;
            }

            $stmt = $db->prepare("
                DELETE FROM cashflow_alerts
                WHERE id = :id AND company_id = :company_id
            ");
            $stmt->execute(['id' => $id, 'company_id' => $companyId]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Alertă ștearsă',
                'message_en' => 'Alert deleted',
            ]);
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}

function checkActiveAlerts(PDO $db, string $companyId, array $alertTypes): array {
    $activeAlerts = [];

    // Get alert configurations
    $stmt = $db->prepare("
        SELECT * FROM cashflow_alerts
        WHERE company_id = :company_id AND enabled = true
    ");
    $stmt->execute(['company_id' => $companyId]);
    $configs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Check each alert type
    foreach ($configs as $config) {
        $threshold = floatval($config['threshold']);
        $triggered = false;
        $currentValue = 0;
        $message = '';

        switch ($config['type']) {
            case 'low_balance':
                $stmt = $db->prepare("
                    SELECT COALESCE(SUM(balance), 0) as balance
                    FROM bank_accounts WHERE company_id = :company_id
                ");
                $stmt->execute(['company_id' => $companyId]);
                $currentValue = floatval($stmt->fetch(PDO::FETCH_ASSOC)['balance']);
                $triggered = $currentValue < $threshold;
                $message = $triggered
                    ? "Soldul curent ({$currentValue} lei) este sub pragul de alertă ({$threshold} lei)"
                    : null;
                break;

            case 'overdue_receivables':
                $stmt = $db->prepare("
                    SELECT COALESCE(SUM(total_amount), 0) as overdue
                    FROM invoices
                    WHERE company_id = :company_id AND status = 'pending' AND due_date < CURRENT_DATE
                ");
                $stmt->execute(['company_id' => $companyId]);
                $currentValue = floatval($stmt->fetch(PDO::FETCH_ASSOC)['overdue']);
                $triggered = $currentValue > $threshold;
                $message = $triggered
                    ? "Creanțe restante ({$currentValue} lei) depășesc pragul de alertă ({$threshold} lei)"
                    : null;
                break;

            case 'large_outflow':
                $stmt = $db->prepare("
                    SELECT COALESCE(SUM(amount), 0) as upcoming
                    FROM bills
                    WHERE company_id = :company_id
                    AND status = 'pending'
                    AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
                ");
                $stmt->execute(['company_id' => $companyId]);
                $currentValue = floatval($stmt->fetch(PDO::FETCH_ASSOC)['upcoming']);
                $triggered = $currentValue > $threshold;
                $message = $triggered
                    ? "Plăți programate în următoarele 7 zile ({$currentValue} lei) depășesc pragul ({$threshold} lei)"
                    : null;
                break;
        }

        if ($triggered) {
            $activeAlerts[] = [
                'type' => $config['type'],
                'name' => $alertTypes[$config['type']]['name_ro'] ?? $config['type'],
                'threshold' => $threshold,
                'current_value' => $currentValue,
                'message_ro' => $message,
                'triggered_at' => date('c'),
                'severity' => $currentValue < 0 || $config['type'] === 'negative_forecast' ? 'critical' : 'warning',
            ];
        }
    }

    return $activeAlerts;
}

function generateUUID(): string {
    return sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}
