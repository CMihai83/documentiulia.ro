<?php
/**
 * Webhook Subscriptions API
 * Manage webhook endpoints and event subscriptions
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

// Available webhook events
$availableEvents = [
    'invoice.created' => ['ro' => 'Factură creată', 'en' => 'Invoice Created'],
    'invoice.updated' => ['ro' => 'Factură actualizată', 'en' => 'Invoice Updated'],
    'invoice.sent' => ['ro' => 'Factură trimisă', 'en' => 'Invoice Sent'],
    'invoice.paid' => ['ro' => 'Factură plătită', 'en' => 'Invoice Paid'],
    'invoice.overdue' => ['ro' => 'Factură restantă', 'en' => 'Invoice Overdue'],
    'invoice.deleted' => ['ro' => 'Factură ștearsă', 'en' => 'Invoice Deleted'],
    'contact.created' => ['ro' => 'Contact creat', 'en' => 'Contact Created'],
    'contact.updated' => ['ro' => 'Contact actualizat', 'en' => 'Contact Updated'],
    'contact.deleted' => ['ro' => 'Contact șters', 'en' => 'Contact Deleted'],
    'product.created' => ['ro' => 'Produs creat', 'en' => 'Product Created'],
    'product.updated' => ['ro' => 'Produs actualizat', 'en' => 'Product Updated'],
    'product.low_stock' => ['ro' => 'Stoc scăzut', 'en' => 'Low Stock'],
    'expense.created' => ['ro' => 'Cheltuială creată', 'en' => 'Expense Created'],
    'expense.approved' => ['ro' => 'Cheltuială aprobată', 'en' => 'Expense Approved'],
    'expense.rejected' => ['ro' => 'Cheltuială respinsă', 'en' => 'Expense Rejected'],
    'project.created' => ['ro' => 'Proiect creat', 'en' => 'Project Created'],
    'project.completed' => ['ro' => 'Proiect finalizat', 'en' => 'Project Completed'],
    'task.created' => ['ro' => 'Sarcină creată', 'en' => 'Task Created'],
    'task.completed' => ['ro' => 'Sarcină finalizată', 'en' => 'Task Completed'],
    'task.overdue' => ['ro' => 'Sarcină restantă', 'en' => 'Task Overdue'],
    'payment.received' => ['ro' => 'Plată primită', 'en' => 'Payment Received'],
    'user.created' => ['ro' => 'Utilizator creat', 'en' => 'User Created'],
    'user.login' => ['ro' => 'Autentificare', 'en' => 'User Login'],
];

// Webhook statuses
$webhookStatuses = [
    'active' => ['ro' => 'Activ', 'en' => 'Active'],
    'inactive' => ['ro' => 'Inactiv', 'en' => 'Inactive'],
    'failing' => ['ro' => 'Eșuează', 'en' => 'Failing'],
    'disabled' => ['ro' => 'Dezactivat', 'en' => 'Disabled'],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $webhookId = $_GET['id'] ?? null;
            $includeDeliveries = ($_GET['include_deliveries'] ?? 'false') === 'true';

            if ($webhookId) {
                // Get single webhook
                $stmt = $db->prepare("
                    SELECT * FROM webhook_subscriptions
                    WHERE id = :id AND company_id = :company_id
                ");
                $stmt->execute(['id' => $webhookId, 'company_id' => $companyId]);
                $webhook = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$webhook) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Webhook not found']);
                    exit;
                }

                $webhook['events'] = json_decode($webhook['events'] ?? '[]', true);
                $webhook['headers'] = json_decode($webhook['headers'] ?? '{}', true);
                $webhook['status_label'] = $webhookStatuses[$webhook['status']] ?? null;

                // Get recent deliveries
                if ($includeDeliveries) {
                    $stmt = $db->prepare("
                        SELECT id, event, status_code, response_time_ms, created_at, error_message
                        FROM webhook_deliveries
                        WHERE webhook_id = :webhook_id
                        ORDER BY created_at DESC
                        LIMIT 20
                    ");
                    $stmt->execute(['webhook_id' => $webhookId]);
                    $webhook['recent_deliveries'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
                }

                echo json_encode([
                    'success' => true,
                    'data' => $webhook,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } else {
                // List all webhooks
                $stmt = $db->prepare("
                    SELECT w.*,
                           (SELECT COUNT(*) FROM webhook_deliveries WHERE webhook_id = w.id) as total_deliveries,
                           (SELECT COUNT(*) FROM webhook_deliveries WHERE webhook_id = w.id AND status_code >= 200 AND status_code < 300) as successful_deliveries
                    FROM webhook_subscriptions w
                    WHERE w.company_id = :company_id
                    ORDER BY w.created_at DESC
                ");
                $stmt->execute(['company_id' => $companyId]);
                $webhooks = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($webhooks as &$w) {
                    $w['events'] = json_decode($w['events'] ?? '[]', true);
                    $w['event_count'] = count($w['events']);
                    $w['status_label'] = $webhookStatuses[$w['status']] ?? null;
                    $w['success_rate'] = $w['total_deliveries'] > 0
                        ? round(($w['successful_deliveries'] / $w['total_deliveries']) * 100)
                        : null;
                }

                // Group events by category
                $eventCategories = [];
                foreach ($availableEvents as $event => $labels) {
                    $category = explode('.', $event)[0];
                    if (!isset($eventCategories[$category])) {
                        $eventCategories[$category] = [
                            'category' => $category,
                            'events' => [],
                        ];
                    }
                    $eventCategories[$category]['events'][$event] = $labels;
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'webhooks' => $webhooks,
                        'available_events' => $availableEvents,
                        'event_categories' => array_values($eventCategories),
                        'statuses' => $webhookStatuses,
                        'total' => count($webhooks),
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            if (!in_array($user['role'], ['admin', 'manager'])) {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Nu aveți permisiunea de a crea webhooks',
                    'error' => 'You do not have permission to create webhooks'
                ]);
                exit;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            $action = $input['action'] ?? 'create';

            if ($action === 'test') {
                // Test webhook delivery
                $webhookId = $input['id'] ?? null;
                if (!$webhookId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'id required']);
                    exit;
                }

                $stmt = $db->prepare("SELECT * FROM webhook_subscriptions WHERE id = :id AND company_id = :company_id");
                $stmt->execute(['id' => $webhookId, 'company_id' => $companyId]);
                $webhook = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$webhook) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Webhook not found']);
                    exit;
                }

                // Send test payload
                $testPayload = [
                    'event' => 'test.ping',
                    'timestamp' => date('c'),
                    'data' => [
                        'message' => 'Test webhook delivery',
                        'company_id' => $companyId,
                    ],
                ];

                $result = sendWebhook($webhook, $testPayload);

                // Log delivery
                $deliveryId = 'del_' . bin2hex(random_bytes(8));
                $stmt = $db->prepare("
                    INSERT INTO webhook_deliveries (id, webhook_id, event, payload, status_code, response_body, response_time_ms, error_message, created_at)
                    VALUES (:id, :webhook_id, 'test.ping', :payload, :status_code, :response_body, :response_time_ms, :error_message, NOW())
                ");
                $stmt->execute([
                    'id' => $deliveryId,
                    'webhook_id' => $webhookId,
                    'payload' => json_encode($testPayload),
                    'status_code' => $result['status_code'],
                    'response_body' => $result['response_body'],
                    'response_time_ms' => $result['response_time_ms'],
                    'error_message' => $result['error'] ?? null,
                ]);

                echo json_encode([
                    'success' => $result['success'],
                    'message_ro' => $result['success'] ? 'Test trimis cu succes' : 'Test eșuat',
                    'message_en' => $result['success'] ? 'Test sent successfully' : 'Test failed',
                    'data' => [
                        'status_code' => $result['status_code'],
                        'response_time_ms' => $result['response_time_ms'],
                        'error' => $result['error'] ?? null,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } else {
                // Create new webhook
                $url = $input['url'] ?? null;
                $events = $input['events'] ?? [];

                if (!$url || empty($events)) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'URL-ul și evenimentele sunt obligatorii',
                        'error' => 'URL and events are required'
                    ]);
                    exit;
                }

                // Validate URL
                if (!filter_var($url, FILTER_VALIDATE_URL)) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'URL invalid',
                        'error' => 'Invalid URL'
                    ]);
                    exit;
                }

                // Validate events
                foreach ($events as $event) {
                    if (!isset($availableEvents[$event])) {
                        http_response_code(400);
                        echo json_encode([
                            'success' => false,
                            'error_ro' => "Eveniment invalid: $event",
                            'error' => "Invalid event: $event"
                        ]);
                        exit;
                    }
                }

                // Generate secret for signature verification
                $secret = bin2hex(random_bytes(32));

                $webhookId = 'wh_' . bin2hex(random_bytes(8));
                $stmt = $db->prepare("
                    INSERT INTO webhook_subscriptions (
                        id, company_id, name, description, url, events, secret,
                        headers, status, retry_count, created_by, created_at
                    ) VALUES (
                        :id, :company_id, :name, :description, :url, :events, :secret,
                        :headers, 'active', :retry_count, :created_by, NOW()
                    )
                ");
                $stmt->execute([
                    'id' => $webhookId,
                    'company_id' => $companyId,
                    'name' => $input['name'] ?? 'Webhook',
                    'description' => $input['description'] ?? null,
                    'url' => $url,
                    'events' => json_encode($events),
                    'secret' => $secret,
                    'headers' => json_encode($input['headers'] ?? []),
                    'retry_count' => $input['retry_count'] ?? 3,
                    'created_by' => $user['user_id'],
                ]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Webhook creat. Salvați secretul pentru verificarea semnăturii!',
                    'message_en' => 'Webhook created. Save the secret for signature verification!',
                    'data' => [
                        'id' => $webhookId,
                        'secret' => $secret,
                        'events' => $events,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'PUT':
            if (!in_array($user['role'], ['admin', 'manager'])) {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Nu aveți permisiunea de a modifica webhooks',
                    'error' => 'You do not have permission to modify webhooks'
                ]);
                exit;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            $webhookId = $input['id'] ?? null;

            if (!$webhookId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'id required']);
                exit;
            }

            // Verify exists
            $stmt = $db->prepare("SELECT id FROM webhook_subscriptions WHERE id = :id AND company_id = :company_id");
            $stmt->execute(['id' => $webhookId, 'company_id' => $companyId]);
            if (!$stmt->fetch()) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Webhook not found']);
                exit;
            }

            $updates = [];
            $params = ['id' => $webhookId];

            $allowedFields = ['name', 'description', 'url', 'status', 'retry_count'];
            foreach ($allowedFields as $field) {
                if (isset($input[$field])) {
                    $updates[] = "$field = :$field";
                    $params[$field] = $input[$field];
                }
            }

            if (isset($input['events'])) {
                $updates[] = "events = :events";
                $params['events'] = json_encode($input['events']);
            }
            if (isset($input['headers'])) {
                $updates[] = "headers = :headers";
                $params['headers'] = json_encode($input['headers']);
            }

            if (!empty($updates)) {
                $updates[] = "updated_at = NOW()";
                $sql = "UPDATE webhook_subscriptions SET " . implode(', ', $updates) . " WHERE id = :id";
                $db->prepare($sql)->execute($params);
            }

            echo json_encode([
                'success' => true,
                'message_ro' => 'Webhook actualizat',
                'message_en' => 'Webhook updated',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'DELETE':
            if (!in_array($user['role'], ['admin', 'manager'])) {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Nu aveți permisiunea de a șterge webhooks',
                    'error' => 'You do not have permission to delete webhooks'
                ]);
                exit;
            }

            $webhookId = $_GET['id'] ?? null;

            if (!$webhookId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'id required']);
                exit;
            }

            // Delete deliveries first
            $db->prepare("DELETE FROM webhook_deliveries WHERE webhook_id = :id")->execute(['id' => $webhookId]);

            // Delete webhook
            $stmt = $db->prepare("DELETE FROM webhook_subscriptions WHERE id = :id AND company_id = :company_id");
            $stmt->execute(['id' => $webhookId, 'company_id' => $companyId]);

            if ($stmt->rowCount() === 0) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Webhook not found']);
                exit;
            }

            echo json_encode([
                'success' => true,
                'message_ro' => 'Webhook șters',
                'message_en' => 'Webhook deleted',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}

function sendWebhook($webhook, $payload) {
    $startTime = microtime(true);

    $headers = json_decode($webhook['headers'] ?? '{}', true);
    $headers['Content-Type'] = 'application/json';
    $headers['X-Webhook-Signature'] = hash_hmac('sha256', json_encode($payload), $webhook['secret']);
    $headers['X-Webhook-Timestamp'] = time();

    $headerLines = [];
    foreach ($headers as $key => $value) {
        $headerLines[] = "$key: $value";
    }

    $ch = curl_init($webhook['url']);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => $headerLines,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_FOLLOWLOCATION => true,
    ]);

    $response = curl_exec($ch);
    $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    $responseTime = round((microtime(true) - $startTime) * 1000);

    return [
        'success' => $statusCode >= 200 && $statusCode < 300,
        'status_code' => $statusCode,
        'response_body' => substr($response, 0, 1000),
        'response_time_ms' => $responseTime,
        'error' => $error ?: null,
    ];
}
