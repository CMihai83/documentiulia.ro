<?php
/**
 * Notification Preferences API
 * Manage user notification preferences and channels
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
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

// Notification channels
$channels = [
    'in_app' => ['ro' => 'În aplicație', 'en' => 'In-app', 'default' => true],
    'email' => ['ro' => 'Email', 'en' => 'Email', 'default' => true],
    'push' => ['ro' => 'Push', 'en' => 'Push', 'default' => false],
    'sms' => ['ro' => 'SMS', 'en' => 'SMS', 'default' => false],
    'whatsapp' => ['ro' => 'WhatsApp', 'en' => 'WhatsApp', 'default' => false],
];

// Notification categories with events
$categories = [
    'invoicing' => [
        'ro' => 'Facturare', 'en' => 'Invoicing',
        'events' => [
            'invoice_created' => ['ro' => 'Factură nouă creată', 'en' => 'New invoice created'],
            'invoice_paid' => ['ro' => 'Factură plătită', 'en' => 'Invoice paid'],
            'invoice_overdue' => ['ro' => 'Factură restantă', 'en' => 'Invoice overdue'],
            'payment_received' => ['ro' => 'Plată primită', 'en' => 'Payment received'],
        ],
    ],
    'expenses' => [
        'ro' => 'Cheltuieli', 'en' => 'Expenses',
        'events' => [
            'expense_approved' => ['ro' => 'Cheltuială aprobată', 'en' => 'Expense approved'],
            'expense_rejected' => ['ro' => 'Cheltuială respinsă', 'en' => 'Expense rejected'],
            'budget_exceeded' => ['ro' => 'Buget depășit', 'en' => 'Budget exceeded'],
        ],
    ],
    'inventory' => [
        'ro' => 'Inventar', 'en' => 'Inventory',
        'events' => [
            'low_stock' => ['ro' => 'Stoc scăzut', 'en' => 'Low stock'],
            'out_of_stock' => ['ro' => 'Stoc epuizat', 'en' => 'Out of stock'],
        ],
    ],
    'projects' => [
        'ro' => 'Proiecte', 'en' => 'Projects',
        'events' => [
            'task_assigned' => ['ro' => 'Sarcină asignată', 'en' => 'Task assigned'],
            'task_completed' => ['ro' => 'Sarcină finalizată', 'en' => 'Task completed'],
            'deadline_approaching' => ['ro' => 'Termen apropiat', 'en' => 'Deadline approaching'],
        ],
    ],
    'team' => [
        'ro' => 'Echipă', 'en' => 'Team',
        'events' => [
            'user_joined' => ['ro' => 'Utilizator nou', 'en' => 'New user joined'],
            'mention' => ['ro' => 'Menționare', 'en' => 'Mention'],
        ],
    ],
    'system' => [
        'ro' => 'Sistem', 'en' => 'System',
        'events' => [
            'security_alert' => ['ro' => 'Alertă securitate', 'en' => 'Security alert'],
            'login_new_device' => ['ro' => 'Login dispozitiv nou', 'en' => 'Login from new device'],
            'subscription_expiring' => ['ro' => 'Abonament expiră', 'en' => 'Subscription expiring'],
        ],
    ],
];

// Frequency options
$frequencies = [
    'instant' => ['ro' => 'Instant', 'en' => 'Instant'],
    'hourly' => ['ro' => 'Orar', 'en' => 'Hourly'],
    'daily' => ['ro' => 'Zilnic', 'en' => 'Daily'],
    'weekly' => ['ro' => 'Săptămânal', 'en' => 'Weekly'],
    'never' => ['ro' => 'Niciodată', 'en' => 'Never'],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? 'preferences';

            if ($action === 'preferences') {
                $stmt = $db->prepare("SELECT * FROM notification_preferences WHERE user_id = :user_id AND company_id = :company_id");
                $stmt->execute(['user_id' => $user['user_id'], 'company_id' => $companyId]);
                $prefs = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$prefs) {
                    $prefs = [
                        'channels' => ['in_app' => true, 'email' => true, 'push' => false, 'sms' => false, 'whatsapp' => false],
                        'events' => [],
                        'quiet_hours' => ['enabled' => false, 'start' => '22:00', 'end' => '07:00'],
                        'email_digest' => 'instant',
                    ];
                } else {
                    $prefs['channels'] = json_decode($prefs['channels'] ?? '{}', true);
                    $prefs['events'] = json_decode($prefs['events'] ?? '{}', true);
                    $prefs['quiet_hours'] = json_decode($prefs['quiet_hours'] ?? '{}', true);
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'preferences' => $prefs,
                        'available_channels' => $channels,
                        'categories' => $categories,
                        'frequencies' => $frequencies,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'channels') {
                echo json_encode(['success' => true, 'data' => $channels], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            } elseif ($action === 'categories') {
                echo json_encode(['success' => true, 'data' => $categories], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            $action = $_GET['action'] ?? 'update';

            if ($action === 'update') {
                $channelPrefs = $input['channels'] ?? null;
                $eventPrefs = $input['events'] ?? null;
                $quietHours = $input['quiet_hours'] ?? null;
                $emailDigest = $input['email_digest'] ?? 'instant';

                $stmt = $db->prepare("SELECT id FROM notification_preferences WHERE user_id = :user_id AND company_id = :company_id");
                $stmt->execute(['user_id' => $user['user_id'], 'company_id' => $companyId]);
                $existing = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($existing) {
                    $updates = [];
                    $params = ['id' => $existing['id']];
                    if ($channelPrefs !== null) { $updates[] = "channels = :channels"; $params['channels'] = json_encode($channelPrefs); }
                    if ($eventPrefs !== null) { $updates[] = "events = :events"; $params['events'] = json_encode($eventPrefs); }
                    if ($quietHours !== null) { $updates[] = "quiet_hours = :quiet_hours"; $params['quiet_hours'] = json_encode($quietHours); }
                    $updates[] = "email_digest = :email_digest"; $params['email_digest'] = $emailDigest;
                    $updates[] = "updated_at = NOW()";
                    $db->prepare("UPDATE notification_preferences SET " . implode(', ', $updates) . " WHERE id = :id")->execute($params);
                } else {
                    $prefId = 'pref_' . bin2hex(random_bytes(8));
                    $stmt = $db->prepare("INSERT INTO notification_preferences (id, company_id, user_id, channels, events, quiet_hours, email_digest, created_at) VALUES (:id, :company_id, :user_id, :channels, :events, :quiet_hours, :email_digest, NOW())");
                    $stmt->execute([
                        'id' => $prefId, 'company_id' => $companyId, 'user_id' => $user['user_id'],
                        'channels' => json_encode($channelPrefs ?? ['in_app' => true, 'email' => true]),
                        'events' => json_encode($eventPrefs ?? []),
                        'quiet_hours' => json_encode($quietHours ?? ['enabled' => false]),
                        'email_digest' => $emailDigest,
                    ]);
                }
                echo json_encode(['success' => true, 'message_ro' => 'Preferințe salvate', 'message_en' => 'Preferences saved'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'toggle_channel') {
                $channel = $input['channel'] ?? null;
                $enabled = $input['enabled'] ?? true;
                if (!$channel || !isset($channels[$channel])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error_ro' => 'Canal invalid', 'error' => 'Invalid channel']);
                    exit;
                }
                $stmt = $db->prepare("SELECT channels FROM notification_preferences WHERE user_id = :user_id AND company_id = :company_id");
                $stmt->execute(['user_id' => $user['user_id'], 'company_id' => $companyId]);
                $row = $stmt->fetch(PDO::FETCH_ASSOC);
                $currentChannels = json_decode($row['channels'] ?? '{}', true);
                $currentChannels[$channel] = $enabled;
                $db->prepare("UPDATE notification_preferences SET channels = :channels, updated_at = NOW() WHERE user_id = :user_id AND company_id = :company_id")->execute(['channels' => json_encode($currentChannels), 'user_id' => $user['user_id'], 'company_id' => $companyId]);
                echo json_encode(['success' => true, 'message_ro' => $enabled ? 'Canal activat' : 'Canal dezactivat', 'message_en' => $enabled ? 'Channel enabled' : 'Channel disabled'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'quiet_hours') {
                $quietHours = $input;
                $db->prepare("UPDATE notification_preferences SET quiet_hours = :quiet_hours, updated_at = NOW() WHERE user_id = :user_id AND company_id = :company_id")->execute(['quiet_hours' => json_encode($quietHours), 'user_id' => $user['user_id'], 'company_id' => $companyId]);
                echo json_encode(['success' => true, 'message_ro' => 'Ore liniștite configurate', 'message_en' => 'Quiet hours configured'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
