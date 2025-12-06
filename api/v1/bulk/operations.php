<?php
/**
 * Bulk Operations API
 * Perform batch operations on multiple records
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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

// Supported entity types and their operations
$entityOperations = [
    'invoices' => [
        'label_ro' => 'Facturi',
        'label_en' => 'Invoices',
        'operations' => [
            'delete' => ['ro' => 'Șterge', 'en' => 'Delete', 'permission' => 'delete'],
            'send' => ['ro' => 'Trimite', 'en' => 'Send', 'permission' => 'send'],
            'mark_paid' => ['ro' => 'Marchează plătit', 'en' => 'Mark as Paid', 'permission' => 'edit'],
            'mark_sent' => ['ro' => 'Marchează trimis', 'en' => 'Mark as Sent', 'permission' => 'edit'],
            'export_pdf' => ['ro' => 'Exportă PDF', 'en' => 'Export PDF', 'permission' => 'view'],
            'archive' => ['ro' => 'Arhivează', 'en' => 'Archive', 'permission' => 'edit'],
        ],
    ],
    'contacts' => [
        'label_ro' => 'Contacte',
        'label_en' => 'Contacts',
        'operations' => [
            'delete' => ['ro' => 'Șterge', 'en' => 'Delete', 'permission' => 'delete'],
            'export' => ['ro' => 'Exportă', 'en' => 'Export', 'permission' => 'view'],
            'assign_tag' => ['ro' => 'Adaugă etichetă', 'en' => 'Add Tag', 'permission' => 'edit'],
            'remove_tag' => ['ro' => 'Elimină etichetă', 'en' => 'Remove Tag', 'permission' => 'edit'],
            'change_type' => ['ro' => 'Schimbă tip', 'en' => 'Change Type', 'permission' => 'edit'],
            'merge' => ['ro' => 'Îmbină', 'en' => 'Merge', 'permission' => 'edit'],
        ],
    ],
    'products' => [
        'label_ro' => 'Produse',
        'label_en' => 'Products',
        'operations' => [
            'delete' => ['ro' => 'Șterge', 'en' => 'Delete', 'permission' => 'delete'],
            'update_price' => ['ro' => 'Actualizează preț', 'en' => 'Update Price', 'permission' => 'edit'],
            'update_stock' => ['ro' => 'Actualizează stoc', 'en' => 'Update Stock', 'permission' => 'manage_stock'],
            'activate' => ['ro' => 'Activează', 'en' => 'Activate', 'permission' => 'edit'],
            'deactivate' => ['ro' => 'Dezactivează', 'en' => 'Deactivate', 'permission' => 'edit'],
            'assign_category' => ['ro' => 'Atribuie categorie', 'en' => 'Assign Category', 'permission' => 'edit'],
        ],
    ],
    'expenses' => [
        'label_ro' => 'Cheltuieli',
        'label_en' => 'Expenses',
        'operations' => [
            'delete' => ['ro' => 'Șterge', 'en' => 'Delete', 'permission' => 'delete'],
            'approve' => ['ro' => 'Aprobă', 'en' => 'Approve', 'permission' => 'approve'],
            'reject' => ['ro' => 'Respinge', 'en' => 'Reject', 'permission' => 'approve'],
            'mark_paid' => ['ro' => 'Marchează plătit', 'en' => 'Mark as Paid', 'permission' => 'edit'],
            'assign_category' => ['ro' => 'Atribuie categorie', 'en' => 'Assign Category', 'permission' => 'edit'],
            'export' => ['ro' => 'Exportă', 'en' => 'Export', 'permission' => 'view'],
        ],
    ],
    'tasks' => [
        'label_ro' => 'Sarcini',
        'label_en' => 'Tasks',
        'operations' => [
            'delete' => ['ro' => 'Șterge', 'en' => 'Delete', 'permission' => 'delete'],
            'change_status' => ['ro' => 'Schimbă stare', 'en' => 'Change Status', 'permission' => 'edit'],
            'change_priority' => ['ro' => 'Schimbă prioritate', 'en' => 'Change Priority', 'permission' => 'edit'],
            'assign' => ['ro' => 'Atribuie', 'en' => 'Assign', 'permission' => 'edit'],
            'move_project' => ['ro' => 'Mută în proiect', 'en' => 'Move to Project', 'permission' => 'edit'],
            'set_due_date' => ['ro' => 'Setează scadență', 'en' => 'Set Due Date', 'permission' => 'edit'],
        ],
    ],
    'employees' => [
        'label_ro' => 'Angajați',
        'label_en' => 'Employees',
        'operations' => [
            'activate' => ['ro' => 'Activează', 'en' => 'Activate', 'permission' => 'manage_employees'],
            'deactivate' => ['ro' => 'Dezactivează', 'en' => 'Deactivate', 'permission' => 'manage_employees'],
            'change_department' => ['ro' => 'Schimbă departament', 'en' => 'Change Department', 'permission' => 'manage_employees'],
            'export' => ['ro' => 'Exportă', 'en' => 'Export', 'permission' => 'view'],
        ],
    ],
];

try {
    $db = getDbConnection();

    if ($method === 'GET') {
        // Return available operations for entity type
        $entityType = $_GET['entity_type'] ?? null;

        if ($entityType && isset($entityOperations[$entityType])) {
            echo json_encode([
                'success' => true,
                'data' => [
                    'entity_type' => $entityType,
                    'config' => $entityOperations[$entityType],
                ],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        } else {
            echo json_encode([
                'success' => true,
                'data' => [
                    'entity_operations' => $entityOperations,
                ],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        }

    } elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        $entityType = $input['entity_type'] ?? null;
        $operation = $input['operation'] ?? null;
        $ids = $input['ids'] ?? [];
        $params = $input['params'] ?? [];
        $dry_run = $input['dry_run'] ?? false;

        if (!$entityType || !$operation || empty($ids)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error_ro' => 'Tipul entității, operația și ID-urile sunt obligatorii',
                'error' => 'Entity type, operation, and IDs are required'
            ]);
            exit;
        }

        if (!isset($entityOperations[$entityType])) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error_ro' => 'Tip de entitate invalid',
                'error' => 'Invalid entity type'
            ]);
            exit;
        }

        if (!isset($entityOperations[$entityType]['operations'][$operation])) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error_ro' => 'Operație invalidă pentru acest tip de entitate',
                'error' => 'Invalid operation for this entity type'
            ]);
            exit;
        }

        // Validate IDs exist
        $ids_valid = validateIds($db, $entityType, $ids, $companyId);
        if (!$ids_valid['valid']) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error_ro' => 'Unele ID-uri nu sunt valide sau nu aparțin companiei',
                'error' => 'Some IDs are invalid or do not belong to this company',
                'invalid_ids' => $ids_valid['invalid'],
            ]);
            exit;
        }

        // Dry run mode - return what would happen without executing
        if ($dry_run) {
            echo json_encode([
                'success' => true,
                'dry_run' => true,
                'message_ro' => 'Simulare - nicio modificare efectuată',
                'message_en' => 'Dry run - no changes made',
                'data' => [
                    'entity_type' => $entityType,
                    'operation' => $operation,
                    'operation_label' => $entityOperations[$entityType]['operations'][$operation],
                    'total_items' => count($ids),
                    'valid_ids' => $ids_valid['valid_ids'],
                    'params' => $params,
                ],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Create bulk job
        $jobId = 'bulk_' . bin2hex(random_bytes(12));
        $totalItems = count($ids);

        $stmt = $db->prepare("
            INSERT INTO bulk_jobs (
                id, company_id, user_id, entity_type, operation, total_items,
                processed_items, successful_items, failed_items, status, params, created_at
            ) VALUES (
                :id, :company_id, :user_id, :entity_type, :operation, :total_items,
                0, 0, 0, 'processing', :params, NOW()
            )
        ");
        $stmt->execute([
            'id' => $jobId,
            'company_id' => $companyId,
            'user_id' => $user['user_id'],
            'entity_type' => $entityType,
            'operation' => $operation,
            'total_items' => $totalItems,
            'params' => json_encode($params),
        ]);

        // Process items
        $results = processOperation($db, $entityType, $operation, $ids, $params, $companyId, $user);

        // Update job status
        $stmt = $db->prepare("
            UPDATE bulk_jobs SET
                processed_items = :processed,
                successful_items = :successful,
                failed_items = :failed,
                status = 'completed',
                completed_at = NOW(),
                results = :results
            WHERE id = :id
        ");
        $stmt->execute([
            'processed' => $results['processed'],
            'successful' => $results['successful'],
            'failed' => $results['failed'],
            'results' => json_encode($results['details']),
            'id' => $jobId,
        ]);

        echo json_encode([
            'success' => true,
            'message_ro' => "Operație completată: {$results['successful']} reușite, {$results['failed']} eșuate",
            'message_en' => "Operation completed: {$results['successful']} successful, {$results['failed']} failed",
            'data' => [
                'job_id' => $jobId,
                'total' => $totalItems,
                'processed' => $results['processed'],
                'successful' => $results['successful'],
                'failed' => $results['failed'],
                'details' => $results['details'],
            ],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}

function processOperation($db, $entityType, $operation, $ids, $params, $companyId, $user) {
    $results = [
        'processed' => 0,
        'successful' => 0,
        'failed' => 0,
        'details' => [],
    ];

    $table = getTableName($entityType);

    foreach ($ids as $id) {
        $results['processed']++;
        $detail = ['id' => $id, 'success' => false, 'error' => null];

        try {
            switch ($operation) {
                case 'delete':
                    $stmt = $db->prepare("DELETE FROM $table WHERE id = :id AND company_id = :company_id");
                    $stmt->execute(['id' => $id, 'company_id' => $companyId]);
                    $detail['success'] = true;
                    break;

                case 'mark_paid':
                    $stmt = $db->prepare("UPDATE $table SET status = 'paid', paid_at = NOW() WHERE id = :id AND company_id = :company_id");
                    $stmt->execute(['id' => $id, 'company_id' => $companyId]);
                    $detail['success'] = true;
                    break;

                case 'mark_sent':
                    $stmt = $db->prepare("UPDATE $table SET status = 'sent', sent_at = NOW() WHERE id = :id AND company_id = :company_id");
                    $stmt->execute(['id' => $id, 'company_id' => $companyId]);
                    $detail['success'] = true;
                    break;

                case 'approve':
                    $stmt = $db->prepare("UPDATE $table SET status = 'approved', approved_at = NOW(), approved_by = :user_id WHERE id = :id AND company_id = :company_id");
                    $stmt->execute(['id' => $id, 'company_id' => $companyId, 'user_id' => $user['user_id']]);
                    $detail['success'] = true;
                    break;

                case 'reject':
                    $stmt = $db->prepare("UPDATE $table SET status = 'rejected', rejected_at = NOW(), rejected_by = :user_id WHERE id = :id AND company_id = :company_id");
                    $stmt->execute(['id' => $id, 'company_id' => $companyId, 'user_id' => $user['user_id']]);
                    $detail['success'] = true;
                    break;

                case 'activate':
                    $stmt = $db->prepare("UPDATE $table SET is_active = TRUE, updated_at = NOW() WHERE id = :id AND company_id = :company_id");
                    $stmt->execute(['id' => $id, 'company_id' => $companyId]);
                    $detail['success'] = true;
                    break;

                case 'deactivate':
                    $stmt = $db->prepare("UPDATE $table SET is_active = FALSE, updated_at = NOW() WHERE id = :id AND company_id = :company_id");
                    $stmt->execute(['id' => $id, 'company_id' => $companyId]);
                    $detail['success'] = true;
                    break;

                case 'archive':
                    $stmt = $db->prepare("UPDATE $table SET is_archived = TRUE, archived_at = NOW() WHERE id = :id AND company_id = :company_id");
                    $stmt->execute(['id' => $id, 'company_id' => $companyId]);
                    $detail['success'] = true;
                    break;

                case 'change_status':
                    if (isset($params['status'])) {
                        $stmt = $db->prepare("UPDATE $table SET status = :status, updated_at = NOW() WHERE id = :id AND company_id = :company_id");
                        $stmt->execute(['id' => $id, 'company_id' => $companyId, 'status' => $params['status']]);
                        $detail['success'] = true;
                    } else {
                        $detail['error'] = 'Status not provided';
                    }
                    break;

                case 'change_priority':
                    if (isset($params['priority'])) {
                        $stmt = $db->prepare("UPDATE $table SET priority = :priority, updated_at = NOW() WHERE id = :id AND company_id = :company_id");
                        $stmt->execute(['id' => $id, 'company_id' => $companyId, 'priority' => $params['priority']]);
                        $detail['success'] = true;
                    } else {
                        $detail['error'] = 'Priority not provided';
                    }
                    break;

                case 'assign':
                    if (isset($params['assignee_id'])) {
                        $stmt = $db->prepare("UPDATE $table SET assignee_id = :assignee_id, updated_at = NOW() WHERE id = :id AND company_id = :company_id");
                        $stmt->execute(['id' => $id, 'company_id' => $companyId, 'assignee_id' => $params['assignee_id']]);
                        $detail['success'] = true;
                    } else {
                        $detail['error'] = 'Assignee not provided';
                    }
                    break;

                case 'assign_category':
                    if (isset($params['category'])) {
                        $stmt = $db->prepare("UPDATE $table SET category = :category, updated_at = NOW() WHERE id = :id AND company_id = :company_id");
                        $stmt->execute(['id' => $id, 'company_id' => $companyId, 'category' => $params['category']]);
                        $detail['success'] = true;
                    } else {
                        $detail['error'] = 'Category not provided';
                    }
                    break;

                case 'assign_tag':
                    if (isset($params['tag'])) {
                        // Add tag to contact_tags
                        $tagId = 'tag_' . bin2hex(random_bytes(8));
                        $stmt = $db->prepare("INSERT IGNORE INTO contact_tags (id, contact_id, tag, created_at) VALUES (:id, :contact_id, :tag, NOW())");
                        $stmt->execute(['id' => $tagId, 'contact_id' => $id, 'tag' => $params['tag']]);
                        $detail['success'] = true;
                    } else {
                        $detail['error'] = 'Tag not provided';
                    }
                    break;

                case 'update_price':
                    if (isset($params['price'])) {
                        $stmt = $db->prepare("UPDATE $table SET price = :price, updated_at = NOW() WHERE id = :id AND company_id = :company_id");
                        $stmt->execute(['id' => $id, 'company_id' => $companyId, 'price' => $params['price']]);
                        $detail['success'] = true;
                    } elseif (isset($params['adjustment_percent'])) {
                        $stmt = $db->prepare("UPDATE $table SET price = price * (1 + :percent / 100), updated_at = NOW() WHERE id = :id AND company_id = :company_id");
                        $stmt->execute(['id' => $id, 'company_id' => $companyId, 'percent' => $params['adjustment_percent']]);
                        $detail['success'] = true;
                    } else {
                        $detail['error'] = 'Price or adjustment not provided';
                    }
                    break;

                case 'update_stock':
                    if (isset($params['quantity'])) {
                        $stmt = $db->prepare("UPDATE $table SET stock_quantity = :quantity, updated_at = NOW() WHERE id = :id AND company_id = :company_id");
                        $stmt->execute(['id' => $id, 'company_id' => $companyId, 'quantity' => $params['quantity']]);
                        $detail['success'] = true;
                    } elseif (isset($params['adjustment'])) {
                        $stmt = $db->prepare("UPDATE $table SET stock_quantity = stock_quantity + :adjustment, updated_at = NOW() WHERE id = :id AND company_id = :company_id");
                        $stmt->execute(['id' => $id, 'company_id' => $companyId, 'adjustment' => $params['adjustment']]);
                        $detail['success'] = true;
                    } else {
                        $detail['error'] = 'Quantity not provided';
                    }
                    break;

                default:
                    $detail['error'] = 'Operation not implemented';
            }
        } catch (Exception $e) {
            $detail['error'] = $e->getMessage();
        }

        if ($detail['success']) {
            $results['successful']++;
        } else {
            $results['failed']++;
        }

        $results['details'][] = $detail;
    }

    return $results;
}

function getTableName($entityType) {
    $tables = [
        'invoices' => 'invoices',
        'contacts' => 'contacts',
        'products' => 'products',
        'expenses' => 'expenses',
        'tasks' => 'tasks',
        'employees' => 'employees',
    ];
    return $tables[$entityType] ?? $entityType;
}

function validateIds($db, $entityType, $ids, $companyId) {
    $table = getTableName($entityType);
    $placeholders = implode(',', array_fill(0, count($ids), '?'));

    $stmt = $db->prepare("SELECT id FROM $table WHERE id IN ($placeholders) AND company_id = ?");
    $params = array_merge($ids, [$companyId]);
    $stmt->execute($params);

    $validIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $invalidIds = array_diff($ids, $validIds);

    return [
        'valid' => empty($invalidIds),
        'valid_ids' => $validIds,
        'invalid' => array_values($invalidIds),
    ];
}
