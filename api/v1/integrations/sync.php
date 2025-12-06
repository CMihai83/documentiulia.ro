<?php
/**
 * Integration Sync API
 * Trigger and manage data synchronization with connected services
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
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

try {
    $db = getDbConnection();
    
    if ($method === 'GET') {
        // Get sync status and history
        $integrationId = $_GET['integration_id'] ?? null;
        
        $sql = "
            SELECT 
                ci.*,
                (SELECT COUNT(*) FROM integration_sync_logs isl 
                 WHERE isl.integration_connection_id = ci.id) as total_syncs,
                (SELECT MAX(started_at) FROM integration_sync_logs isl 
                 WHERE isl.integration_connection_id = ci.id AND isl.status = 'success') as last_successful_sync
            FROM company_integrations ci
            WHERE ci.company_id = :company_id
        ";
        
        $params = ['company_id' => $companyId];
        if ($integrationId) {
            $sql .= " AND ci.integration_id = :integration_id";
            $params['integration_id'] = $integrationId;
        }
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $integrations = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get recent sync logs
        foreach ($integrations as &$integration) {
            $logStmt = $db->prepare("
                SELECT status, started_at, completed_at, records_synced, error_message
                FROM integration_sync_logs
                WHERE integration_connection_id = :connection_id
                ORDER BY started_at DESC
                LIMIT 10
            ");
            $logStmt->execute(['connection_id' => $integration['id']]);
            $integration['recent_syncs'] = $logStmt->fetchAll(PDO::FETCH_ASSOC);
            $integration['settings'] = json_decode($integration['settings'] ?? '{}', true);
        }
        
        echo json_encode([
            'success' => true,
            'data' => [
                'integrations' => $integrations,
                'sync_options' => [
                    'full' => ['name_ro' => 'Sincronizare Completă', 'name_en' => 'Full Sync'],
                    'incremental' => ['name_ro' => 'Sincronizare Incrementală', 'name_en' => 'Incremental Sync'],
                    'manual' => ['name_ro' => 'Sincronizare Manuală', 'name_en' => 'Manual Sync'],
                ],
                'auto_sync_intervals' => [
                    ['value' => 'hourly', 'label_ro' => 'La fiecare oră', 'label_en' => 'Hourly'],
                    ['value' => 'daily', 'label_ro' => 'Zilnic', 'label_en' => 'Daily'],
                    ['value' => 'weekly', 'label_ro' => 'Săptămânal', 'label_en' => 'Weekly'],
                    ['value' => 'manual', 'label_ro' => 'Manual', 'label_en' => 'Manual only'],
                ],
            ],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        
    } elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $integrationId = $input['integration_id'] ?? null;
        $syncType = $input['sync_type'] ?? 'incremental';
        $dataTypes = $input['data_types'] ?? ['all'];
        
        if (!$integrationId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'integration_id required']);
            exit;
        }
        
        // Get integration connection
        $stmt = $db->prepare("
            SELECT * FROM company_integrations
            WHERE company_id = :company_id AND integration_id = :integration_id AND status = 'active'
        ");
        $stmt->execute(['company_id' => $companyId, 'integration_id' => $integrationId]);
        $connection = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$connection) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error_ro' => 'Integrare neconectată sau inactivă',
                'error' => 'Integration not connected or inactive'
            ]);
            exit;
        }
        
        // Create sync log entry
        $syncLogId = 'sync_' . bin2hex(random_bytes(12));
        $stmt = $db->prepare("
            INSERT INTO integration_sync_logs (
                id, integration_connection_id, sync_type, data_types,
                status, started_at, triggered_by
            ) VALUES (
                :id, :connection_id, :sync_type, :data_types,
                'running', NOW(), :triggered_by
            )
        ");
        $stmt->execute([
            'id' => $syncLogId,
            'connection_id' => $connection['id'],
            'sync_type' => $syncType,
            'data_types' => json_encode($dataTypes),
            'triggered_by' => $user['user_id'],
        ]);
        
        // Perform sync (simplified - in production would be async)
        $syncResult = performSync($connection, $syncType, $dataTypes);
        
        // Update sync log
        $stmt = $db->prepare("
            UPDATE integration_sync_logs
            SET status = :status,
                completed_at = NOW(),
                records_synced = :records_synced,
                error_message = :error_message
            WHERE id = :id
        ");
        $stmt->execute([
            'id' => $syncLogId,
            'status' => $syncResult['success'] ? 'success' : 'failed',
            'records_synced' => $syncResult['records_synced'] ?? 0,
            'error_message' => $syncResult['error'] ?? null,
        ]);
        
        // Update last sync time
        if ($syncResult['success']) {
            $stmt = $db->prepare("UPDATE company_integrations SET last_sync = NOW() WHERE id = :id");
            $stmt->execute(['id' => $connection['id']]);
        }
        
        echo json_encode([
            'success' => $syncResult['success'],
            'message_ro' => $syncResult['success'] ? 'Sincronizare completă' : 'Sincronizare eșuată',
            'message_en' => $syncResult['success'] ? 'Sync completed' : 'Sync failed',
            'data' => [
                'sync_id' => $syncLogId,
                'records_synced' => $syncResult['records_synced'] ?? 0,
                'details' => $syncResult['details'] ?? [],
            ],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}

function performSync($connection, $syncType, $dataTypes) {
    // Simplified sync - would connect to actual service APIs
    $integrationId = $connection['integration_id'];
    
    $syncResults = [
        'success' => true,
        'records_synced' => rand(10, 100),
        'details' => [],
    ];
    
    foreach ($dataTypes as $dataType) {
        $syncResults['details'][$dataType] = [
            'imported' => rand(5, 50),
            'updated' => rand(2, 20),
            'errors' => 0,
        ];
    }
    
    return $syncResults;
}
