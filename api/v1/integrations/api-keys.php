<?php
/**
 * API Keys Management
 * Create and manage API keys for external access
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

// Permission scopes
$availableScopes = [
    'read:invoices' => ['ro' => 'Citire facturi', 'en' => 'Read invoices'],
    'write:invoices' => ['ro' => 'Scriere facturi', 'en' => 'Write invoices'],
    'read:contacts' => ['ro' => 'Citire contacte', 'en' => 'Read contacts'],
    'write:contacts' => ['ro' => 'Scriere contacte', 'en' => 'Write contacts'],
    'read:products' => ['ro' => 'Citire produse', 'en' => 'Read products'],
    'write:products' => ['ro' => 'Scriere produse', 'en' => 'Write products'],
    'read:expenses' => ['ro' => 'Citire cheltuieli', 'en' => 'Read expenses'],
    'write:expenses' => ['ro' => 'Scriere cheltuieli', 'en' => 'Write expenses'],
    'read:projects' => ['ro' => 'Citire proiecte', 'en' => 'Read projects'],
    'write:projects' => ['ro' => 'Scriere proiecte', 'en' => 'Write projects'],
    'read:reports' => ['ro' => 'Citire rapoarte', 'en' => 'Read reports'],
    'read:settings' => ['ro' => 'Citire setări', 'en' => 'Read settings'],
    'write:settings' => ['ro' => 'Scriere setări', 'en' => 'Write settings'],
    'webhooks' => ['ro' => 'Gestionare webhooks', 'en' => 'Manage webhooks'],
    'admin' => ['ro' => 'Acces administrator', 'en' => 'Admin access'],
];

// Key statuses
$keyStatuses = [
    'active' => ['ro' => 'Activ', 'en' => 'Active'],
    'inactive' => ['ro' => 'Inactiv', 'en' => 'Inactive'],
    'revoked' => ['ro' => 'Revocat', 'en' => 'Revoked'],
    'expired' => ['ro' => 'Expirat', 'en' => 'Expired'],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $keyId = $_GET['id'] ?? null;

            if ($keyId) {
                // Get single key (without secret)
                $stmt = $db->prepare("
                    SELECT id, name, description, key_prefix, scopes, status,
                           last_used_at, last_used_ip, usage_count, rate_limit,
                           expires_at, created_at, created_by
                    FROM api_keys
                    WHERE id = :id AND company_id = :company_id
                ");
                $stmt->execute(['id' => $keyId, 'company_id' => $companyId]);
                $key = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$key) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'API key not found']);
                    exit;
                }

                $key['scopes'] = json_decode($key['scopes'] ?? '[]', true);
                $key['status_label'] = $keyStatuses[$key['status']] ?? null;
                $key['is_expired'] = $key['expires_at'] && strtotime($key['expires_at']) < time();

                echo json_encode([
                    'success' => true,
                    'data' => $key,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } else {
                // List all keys
                $stmt = $db->prepare("
                    SELECT k.id, k.name, k.description, k.key_prefix, k.scopes, k.status,
                           k.last_used_at, k.usage_count, k.rate_limit, k.expires_at, k.created_at,
                           u.first_name, u.last_name
                    FROM api_keys k
                    LEFT JOIN users u ON k.created_by = u.id
                    WHERE k.company_id = :company_id
                    ORDER BY k.created_at DESC
                ");
                $stmt->execute(['company_id' => $companyId]);
                $keys = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($keys as &$k) {
                    $k['scopes'] = json_decode($k['scopes'] ?? '[]', true);
                    $k['scope_count'] = count($k['scopes']);
                    $k['status_label'] = $keyStatuses[$k['status']] ?? null;
                    $k['created_by_name'] = trim(($k['first_name'] ?? '') . ' ' . ($k['last_name'] ?? ''));
                    $k['is_expired'] = $k['expires_at'] && strtotime($k['expires_at']) < time();
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'keys' => $keys,
                        'available_scopes' => $availableScopes,
                        'statuses' => $keyStatuses,
                        'total' => count($keys),
                        'active_count' => count(array_filter($keys, fn($k) => $k['status'] === 'active')),
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            if (!in_array($user['role'], ['admin'])) {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Doar administratorii pot crea chei API',
                    'error' => 'Only administrators can create API keys'
                ]);
                exit;
            }

            $input = json_decode(file_get_contents('php://input'), true);

            $name = $input['name'] ?? null;
            $scopes = $input['scopes'] ?? [];

            if (!$name || empty($scopes)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Numele și permisiunile sunt obligatorii',
                    'error' => 'Name and scopes are required'
                ]);
                exit;
            }

            // Validate scopes
            foreach ($scopes as $scope) {
                if (!isset($availableScopes[$scope])) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => "Permisiune invalidă: $scope",
                        'error' => "Invalid scope: $scope"
                    ]);
                    exit;
                }
            }

            // Generate API key
            $keyId = 'key_' . bin2hex(random_bytes(8));
            $keyPrefix = 'dk_' . bin2hex(random_bytes(4)); // dk = documentiulia key
            $keySecret = bin2hex(random_bytes(32));
            $fullKey = $keyPrefix . '_' . $keySecret;
            $keyHash = hash('sha256', $fullKey);

            $stmt = $db->prepare("
                INSERT INTO api_keys (
                    id, company_id, name, description, key_prefix, key_hash,
                    scopes, status, rate_limit, expires_at, created_by, created_at
                ) VALUES (
                    :id, :company_id, :name, :description, :key_prefix, :key_hash,
                    :scopes, 'active', :rate_limit, :expires_at, :created_by, NOW()
                )
            ");
            $stmt->execute([
                'id' => $keyId,
                'company_id' => $companyId,
                'name' => $name,
                'description' => $input['description'] ?? null,
                'key_prefix' => $keyPrefix,
                'key_hash' => $keyHash,
                'scopes' => json_encode($scopes),
                'rate_limit' => $input['rate_limit'] ?? 1000,
                'expires_at' => $input['expires_at'] ?? null,
                'created_by' => $user['user_id'],
            ]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Cheie API creată. Salvați cheia - nu va mai fi afișată!',
                'message_en' => 'API key created. Save the key - it will not be shown again!',
                'data' => [
                    'id' => $keyId,
                    'key' => $fullKey,
                    'prefix' => $keyPrefix,
                    'scopes' => $scopes,
                ],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'PUT':
            if (!in_array($user['role'], ['admin'])) {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Doar administratorii pot modifica cheile API',
                    'error' => 'Only administrators can modify API keys'
                ]);
                exit;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            $keyId = $input['id'] ?? null;

            if (!$keyId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'id required']);
                exit;
            }

            // Verify exists
            $stmt = $db->prepare("SELECT id FROM api_keys WHERE id = :id AND company_id = :company_id");
            $stmt->execute(['id' => $keyId, 'company_id' => $companyId]);
            if (!$stmt->fetch()) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'API key not found']);
                exit;
            }

            $updates = [];
            $params = ['id' => $keyId];

            if (isset($input['name'])) {
                $updates[] = "name = :name";
                $params['name'] = $input['name'];
            }
            if (isset($input['description'])) {
                $updates[] = "description = :description";
                $params['description'] = $input['description'];
            }
            if (isset($input['status'])) {
                $updates[] = "status = :status";
                $params['status'] = $input['status'];
            }
            if (isset($input['scopes'])) {
                $updates[] = "scopes = :scopes";
                $params['scopes'] = json_encode($input['scopes']);
            }
            if (isset($input['rate_limit'])) {
                $updates[] = "rate_limit = :rate_limit";
                $params['rate_limit'] = $input['rate_limit'];
            }
            if (isset($input['expires_at'])) {
                $updates[] = "expires_at = :expires_at";
                $params['expires_at'] = $input['expires_at'];
            }

            if (!empty($updates)) {
                $updates[] = "updated_at = NOW()";
                $sql = "UPDATE api_keys SET " . implode(', ', $updates) . " WHERE id = :id";
                $db->prepare($sql)->execute($params);
            }

            echo json_encode([
                'success' => true,
                'message_ro' => 'Cheie API actualizată',
                'message_en' => 'API key updated',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'DELETE':
            if (!in_array($user['role'], ['admin'])) {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Doar administratorii pot șterge cheile API',
                    'error' => 'Only administrators can delete API keys'
                ]);
                exit;
            }

            $keyId = $_GET['id'] ?? null;

            if (!$keyId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'id required']);
                exit;
            }

            // Revoke instead of delete (for audit trail)
            $stmt = $db->prepare("
                UPDATE api_keys SET status = 'revoked', revoked_at = NOW()
                WHERE id = :id AND company_id = :company_id
            ");
            $stmt->execute(['id' => $keyId, 'company_id' => $companyId]);

            if ($stmt->rowCount() === 0) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'API key not found']);
                exit;
            }

            echo json_encode([
                'success' => true,
                'message_ro' => 'Cheie API revocată',
                'message_en' => 'API key revoked',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
