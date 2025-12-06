<?php
/**
 * Batch Sync API
 * Handles batch synchronization of multiple records
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';

// Check authentication
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

$input = json_decode(file_get_contents('php://input'), true);
$operations = $input['operations'] ?? [];

if (empty($operations)) {
    echo json_encode([
        'success' => true,
        'data' => [
            'processed' => 0,
            'results' => [],
        ],
    ]);
    exit;
}

// Limit batch size
$maxBatchSize = 100;
if (count($operations) > $maxBatchSize) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => "Batch size exceeds maximum of $maxBatchSize",
    ]);
    exit;
}

$results = [];
$processed = 0;
$succeeded = 0;
$failed = 0;
$conflicts = 0;

$db = getDbConnection();
$db->beginTransaction();

try {
    foreach ($operations as $op) {
        $opResult = processOperation($db, $op, $companyId, $user['user_id']);
        $results[] = $opResult;
        $processed++;

        if ($opResult['success']) {
            $succeeded++;
        } elseif ($opResult['conflict'] ?? false) {
            $conflicts++;
        } else {
            $failed++;
        }
    }

    $db->commit();

    // Update sync status
    updateSyncStatus($db, $companyId, $user['user_id']);

} catch (Exception $e) {
    $db->rollBack();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Batch processing failed: ' . $e->getMessage(),
    ]);
    exit;
}

echo json_encode([
    'success' => $failed === 0,
    'data' => [
        'processed' => $processed,
        'succeeded' => $succeeded,
        'failed' => $failed,
        'conflicts' => $conflicts,
        'results' => $results,
        'server_time' => date('c'),
    ],
], JSON_PRETTY_PRINT);

function processOperation(PDO $db, array $op, string $companyId, string $userId): array {
    $action = $op['action'] ?? null;
    $type = $op['type'] ?? null;
    $payload = $op['payload'] ?? [];
    $clientId = $op['client_id'] ?? null;

    if (!$action || !$type) {
        return [
            'client_id' => $clientId,
            'success' => false,
            'error' => 'Missing action or type',
        ];
    }

    // Map type to table
    $tableMap = [
        'invoice' => 'invoices',
        'expense' => 'expenses',
        'contact' => 'contacts',
        'project' => 'projects',
        'product' => 'products',
    ];

    $table = $tableMap[$type] ?? null;
    if (!$table) {
        return [
            'client_id' => $clientId,
            'success' => false,
            'error' => "Unknown type: $type",
        ];
    }

    try {
        switch ($action) {
            case 'create':
                return handleCreate($db, $table, $payload, $companyId, $userId, $clientId);
            case 'update':
                return handleUpdate($db, $table, $payload, $companyId, $clientId);
            case 'delete':
                return handleDelete($db, $table, $payload, $companyId, $clientId);
            default:
                return [
                    'client_id' => $clientId,
                    'success' => false,
                    'error' => "Unknown action: $action",
                ];
        }
    } catch (Exception $e) {
        return [
            'client_id' => $clientId,
            'success' => false,
            'error' => $e->getMessage(),
        ];
    }
}

function handleCreate(PDO $db, string $table, array $payload, string $companyId, string $userId, ?string $clientId): array {
    // Generate server ID if needed
    $serverId = $payload['id'] ?? generateUUID();

    // Add company_id and created_by
    $payload['company_id'] = $companyId;
    $payload['created_by'] = $userId;
    $payload['id'] = $serverId;
    $payload['created_at'] = date('Y-m-d H:i:s');
    $payload['updated_at'] = date('Y-m-d H:i:s');

    // Remove client-only fields
    unset($payload['sync_status'], $payload['client_id']);

    // Build INSERT query
    $columns = array_keys($payload);
    $placeholders = array_map(fn($c) => ":$c", $columns);

    $sql = "INSERT INTO $table (" . implode(', ', $columns) . ") VALUES (" . implode(', ', $placeholders) . ")";
    $stmt = $db->prepare($sql);

    foreach ($payload as $key => $value) {
        $stmt->bindValue(":$key", $value);
    }

    $stmt->execute();

    return [
        'client_id' => $clientId,
        'success' => true,
        'server_id' => $serverId,
    ];
}

function handleUpdate(PDO $db, string $table, array $payload, string $companyId, ?string $clientId): array {
    $id = $payload['id'] ?? null;
    if (!$id) {
        return [
            'client_id' => $clientId,
            'success' => false,
            'error' => 'Missing ID for update',
        ];
    }

    // Check if record exists and belongs to company
    $stmt = $db->prepare("SELECT updated_at FROM $table WHERE id = :id AND company_id = :company_id");
    $stmt->execute(['id' => $id, 'company_id' => $companyId]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$existing) {
        return [
            'client_id' => $clientId,
            'success' => false,
            'error' => 'Record not found',
        ];
    }

    // Check for conflict (client version vs server version)
    $clientUpdatedAt = $payload['_last_known_update'] ?? null;
    if ($clientUpdatedAt && strtotime($existing['updated_at']) > strtotime($clientUpdatedAt)) {
        return [
            'client_id' => $clientId,
            'success' => false,
            'conflict' => true,
            'server_version' => $existing['updated_at'],
            'error' => 'Conflict detected',
        ];
    }

    // Remove system fields
    unset($payload['company_id'], $payload['created_by'], $payload['created_at'], $payload['_last_known_update']);
    $payload['updated_at'] = date('Y-m-d H:i:s');

    // Build UPDATE query
    $sets = [];
    foreach (array_keys($payload) as $key) {
        if ($key !== 'id') {
            $sets[] = "$key = :$key";
        }
    }

    $sql = "UPDATE $table SET " . implode(', ', $sets) . " WHERE id = :id AND company_id = :company_id";
    $stmt = $db->prepare($sql);

    foreach ($payload as $key => $value) {
        $stmt->bindValue(":$key", $value);
    }
    $stmt->bindValue(':company_id', $companyId);

    $stmt->execute();

    return [
        'client_id' => $clientId,
        'success' => true,
        'updated_at' => $payload['updated_at'],
    ];
}

function handleDelete(PDO $db, string $table, array $payload, string $companyId, ?string $clientId): array {
    $id = $payload['id'] ?? null;
    if (!$id) {
        return [
            'client_id' => $clientId,
            'success' => false,
            'error' => 'Missing ID for delete',
        ];
    }

    $stmt = $db->prepare("DELETE FROM $table WHERE id = :id AND company_id = :company_id");
    $stmt->execute(['id' => $id, 'company_id' => $companyId]);

    return [
        'client_id' => $clientId,
        'success' => true,
    ];
}

function updateSyncStatus(PDO $db, string $companyId, string $userId): void {
    try {
        $stmt = $db->prepare("
            INSERT INTO sync_status (company_id, user_id, last_sync_at, pending_changes)
            VALUES (:company_id, :user_id, NOW(), 0)
            ON CONFLICT (company_id, user_id)
            DO UPDATE SET last_sync_at = NOW(), pending_changes = 0
        ");
        $stmt->execute(['company_id' => $companyId, 'user_id' => $userId]);
    } catch (Exception $e) {
        // Ignore - table may not exist
    }
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
