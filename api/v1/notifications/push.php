<?php
/**
 * Push Notifications API
 * Manage push notification subscriptions and delivery
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
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

// Device types
$deviceTypes = [
    'web' => ['ro' => 'Web Browser', 'en' => 'Web Browser'],
    'android' => ['ro' => 'Android', 'en' => 'Android'],
    'ios' => ['ro' => 'iOS', 'en' => 'iOS'],
    'desktop' => ['ro' => 'Desktop', 'en' => 'Desktop'],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            // List user's push subscriptions
            $stmt = $db->prepare("
                SELECT * FROM push_subscriptions
                WHERE user_id = :user_id AND company_id = :company_id
                ORDER BY last_used DESC
            ");
            $stmt->execute(['user_id' => $user['user_id'], 'company_id' => $companyId]);
            $subscriptions = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($subscriptions as &$s) {
                $s['device_type_label'] = $deviceTypes[$s['device_type']] ?? ['ro' => $s['device_type'], 'en' => $s['device_type']];
                $s['is_current'] = $s['device_token'] === ($_SERVER['HTTP_X_DEVICE_TOKEN'] ?? null);
            }

            echo json_encode([
                'success' => true,
                'data' => [
                    'subscriptions' => $subscriptions,
                    'device_types' => $deviceTypes,
                    'vapid_public_key' => getenv('VAPID_PUBLIC_KEY') ?: 'your-vapid-public-key',
                ],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            $action = $input['action'] ?? 'subscribe';

            if ($action === 'subscribe') {
                // Register push subscription
                $subscription = $input['subscription'] ?? null;
                $deviceType = $input['device_type'] ?? 'web';
                $deviceName = $input['device_name'] ?? null;

                if (!$subscription) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Datele de abonare sunt obligatorii',
                        'error' => 'Subscription data is required'
                    ]);
                    exit;
                }

                // Generate device token from subscription endpoint
                $deviceToken = md5($subscription['endpoint'] ?? json_encode($subscription));

                // Check if already exists
                $stmt = $db->prepare("
                    SELECT id FROM push_subscriptions
                    WHERE user_id = :user_id AND device_token = :device_token
                ");
                $stmt->execute(['user_id' => $user['user_id'], 'device_token' => $deviceToken]);
                $existing = $stmt->fetch();

                if ($existing) {
                    // Update existing
                    $stmt = $db->prepare("
                        UPDATE push_subscriptions
                        SET subscription_data = :subscription_data, device_name = :device_name,
                            last_used = NOW(), is_active = TRUE
                        WHERE id = :id
                    ");
                    $stmt->execute([
                        'subscription_data' => json_encode($subscription),
                        'device_name' => $deviceName,
                        'id' => $existing['id'],
                    ]);
                } else {
                    // Create new
                    $subId = 'push_' . bin2hex(random_bytes(12));
                    $stmt = $db->prepare("
                        INSERT INTO push_subscriptions (
                            id, user_id, company_id, device_type, device_name, device_token,
                            subscription_data, is_active, created_at, last_used
                        ) VALUES (
                            :id, :user_id, :company_id, :device_type, :device_name, :device_token,
                            :subscription_data, TRUE, NOW(), NOW()
                        )
                    ");
                    $stmt->execute([
                        'id' => $subId,
                        'user_id' => $user['user_id'],
                        'company_id' => $companyId,
                        'device_type' => $deviceType,
                        'device_name' => $deviceName,
                        'device_token' => $deviceToken,
                        'subscription_data' => json_encode($subscription),
                    ]);
                }

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Abonare activată pentru notificări push',
                    'message_en' => 'Push notifications subscription activated',
                    'data' => ['device_token' => $deviceToken],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'test') {
                // Send test notification
                $subscriptionId = $input['subscription_id'] ?? null;

                // In production, would use web-push library
                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Notificare de test trimisă',
                    'message_en' => 'Test notification sent',
                    'data' => [
                        'title' => 'Test Notification',
                        'body' => 'This is a test push notification from DocumentIulia',
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'send') {
                // Admin: Send push to users
                if (!in_array($user['role'], ['admin', 'manager'])) {
                    http_response_code(403);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Nu aveți permisiunea de a trimite notificări',
                        'error' => 'You do not have permission to send notifications'
                    ]);
                    exit;
                }

                $title = $input['title'] ?? 'Notification';
                $body = $input['body'] ?? '';
                $targetUsers = $input['user_ids'] ?? [];

                // Get active subscriptions
                $sql = "
                    SELECT ps.*, u.first_name, u.last_name
                    FROM push_subscriptions ps
                    JOIN users u ON ps.user_id = u.id
                    WHERE ps.company_id = :company_id AND ps.is_active = TRUE
                ";
                $params = ['company_id' => $companyId];

                if (!empty($targetUsers)) {
                    $placeholders = implode(',', array_fill(0, count($targetUsers), '?'));
                    $sql .= " AND ps.user_id IN ($placeholders)";
                }

                $stmt = $db->prepare($sql);
                if (!empty($targetUsers)) {
                    $stmt->execute(array_merge([$companyId], $targetUsers));
                } else {
                    $stmt->execute($params);
                }
                $subscriptions = $stmt->fetchAll(PDO::FETCH_ASSOC);

                $sent = 0;
                $failed = 0;

                foreach ($subscriptions as $sub) {
                    // In production, would use web-push library to send
                    // For now, just count
                    $sent++;
                }

                echo json_encode([
                    'success' => true,
                    'message_ro' => "Notificări trimise: $sent",
                    'message_en' => "Notifications sent: $sent",
                    'data' => [
                        'sent' => $sent,
                        'failed' => $failed,
                        'total' => count($subscriptions),
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'DELETE':
            $subscriptionId = $_GET['id'] ?? null;
            $deviceToken = $_GET['device_token'] ?? null;

            if ($subscriptionId) {
                $stmt = $db->prepare("
                    DELETE FROM push_subscriptions
                    WHERE id = :id AND user_id = :user_id
                ");
                $stmt->execute(['id' => $subscriptionId, 'user_id' => $user['user_id']]);
            } elseif ($deviceToken) {
                $stmt = $db->prepare("
                    DELETE FROM push_subscriptions
                    WHERE device_token = :device_token AND user_id = :user_id
                ");
                $stmt->execute(['device_token' => $deviceToken, 'user_id' => $user['user_id']]);
            } else {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'id or device_token required']);
                exit;
            }

            echo json_encode([
                'success' => true,
                'message_ro' => 'Abonare dezactivată',
                'message_en' => 'Subscription removed',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
