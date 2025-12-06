<?php
/**
 * Bulk Jobs API
 * Track and manage bulk operation jobs
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, DELETE, OPTIONS');
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

// Job statuses
$statuses = [
    'pending' => ['ro' => 'În așteptare', 'en' => 'Pending'],
    'processing' => ['ro' => 'În procesare', 'en' => 'Processing'],
    'completed' => ['ro' => 'Finalizat', 'en' => 'Completed'],
    'failed' => ['ro' => 'Eșuat', 'en' => 'Failed'],
    'cancelled' => ['ro' => 'Anulat', 'en' => 'Cancelled'],
];

// Operation labels
$operationLabels = [
    'delete' => ['ro' => 'Ștergere', 'en' => 'Delete'],
    'send' => ['ro' => 'Trimitere', 'en' => 'Send'],
    'mark_paid' => ['ro' => 'Marcare plătit', 'en' => 'Mark Paid'],
    'mark_sent' => ['ro' => 'Marcare trimis', 'en' => 'Mark Sent'],
    'export_pdf' => ['ro' => 'Export PDF', 'en' => 'Export PDF'],
    'archive' => ['ro' => 'Arhivare', 'en' => 'Archive'],
    'export' => ['ro' => 'Export', 'en' => 'Export'],
    'assign_tag' => ['ro' => 'Adăugare etichetă', 'en' => 'Add Tag'],
    'remove_tag' => ['ro' => 'Eliminare etichetă', 'en' => 'Remove Tag'],
    'change_type' => ['ro' => 'Schimbare tip', 'en' => 'Change Type'],
    'merge' => ['ro' => 'Îmbinare', 'en' => 'Merge'],
    'update_price' => ['ro' => 'Actualizare preț', 'en' => 'Update Price'],
    'update_stock' => ['ro' => 'Actualizare stoc', 'en' => 'Update Stock'],
    'activate' => ['ro' => 'Activare', 'en' => 'Activate'],
    'deactivate' => ['ro' => 'Dezactivare', 'en' => 'Deactivate'],
    'assign_category' => ['ro' => 'Atribuire categorie', 'en' => 'Assign Category'],
    'approve' => ['ro' => 'Aprobare', 'en' => 'Approve'],
    'reject' => ['ro' => 'Respingere', 'en' => 'Reject'],
    'change_status' => ['ro' => 'Schimbare stare', 'en' => 'Change Status'],
    'change_priority' => ['ro' => 'Schimbare prioritate', 'en' => 'Change Priority'],
    'assign' => ['ro' => 'Atribuire', 'en' => 'Assign'],
    'move_project' => ['ro' => 'Mutare în proiect', 'en' => 'Move to Project'],
    'set_due_date' => ['ro' => 'Setare scadență', 'en' => 'Set Due Date'],
    'change_department' => ['ro' => 'Schimbare departament', 'en' => 'Change Department'],
];

// Entity labels
$entityLabels = [
    'invoices' => ['ro' => 'Facturi', 'en' => 'Invoices'],
    'contacts' => ['ro' => 'Contacte', 'en' => 'Contacts'],
    'products' => ['ro' => 'Produse', 'en' => 'Products'],
    'expenses' => ['ro' => 'Cheltuieli', 'en' => 'Expenses'],
    'tasks' => ['ro' => 'Sarcini', 'en' => 'Tasks'],
    'employees' => ['ro' => 'Angajați', 'en' => 'Employees'],
];

try {
    $db = getDbConnection();

    if ($method === 'GET') {
        $jobId = $_GET['id'] ?? null;

        if ($jobId) {
            // Get single job
            $stmt = $db->prepare("
                SELECT j.*, u.first_name, u.last_name
                FROM bulk_jobs j
                LEFT JOIN users u ON j.user_id = u.id
                WHERE j.id = :id AND j.company_id = :company_id
            ");
            $stmt->execute(['id' => $jobId, 'company_id' => $companyId]);
            $job = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$job) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Job not found']);
                exit;
            }

            $job['user_name'] = trim(($job['first_name'] ?? '') . ' ' . ($job['last_name'] ?? ''));
            $job['status_label'] = $statuses[$job['status']] ?? null;
            $job['operation_label'] = $operationLabels[$job['operation']] ?? ['ro' => $job['operation'], 'en' => $job['operation']];
            $job['entity_label'] = $entityLabels[$job['entity_type']] ?? ['ro' => $job['entity_type'], 'en' => $job['entity_type']];
            $job['params'] = json_decode($job['params'] ?? '{}', true);
            $job['results'] = json_decode($job['results'] ?? '[]', true);
            $job['progress_percent'] = $job['total_items'] > 0 ? round(($job['processed_items'] / $job['total_items']) * 100) : 0;

            echo json_encode([
                'success' => true,
                'data' => $job,
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        } else {
            // List jobs
            $page = max(1, intval($_GET['page'] ?? 1));
            $limit = min(100, max(10, intval($_GET['limit'] ?? 20)));
            $offset = ($page - 1) * $limit;

            $status = $_GET['status'] ?? null;
            $entityType = $_GET['entity_type'] ?? null;

            $sql = "
                SELECT j.*, u.first_name, u.last_name
                FROM bulk_jobs j
                LEFT JOIN users u ON j.user_id = u.id
                WHERE j.company_id = :company_id
            ";
            $params = ['company_id' => $companyId];

            // Only show user's own jobs unless admin
            if ($user['role'] !== 'admin') {
                $sql .= " AND j.user_id = :user_id";
                $params['user_id'] = $user['user_id'];
            }

            if ($status) {
                $sql .= " AND j.status = :status";
                $params['status'] = $status;
            }
            if ($entityType) {
                $sql .= " AND j.entity_type = :entity_type";
                $params['entity_type'] = $entityType;
            }

            // Count total
            $countStmt = $db->prepare(str_replace('SELECT j.*, u.first_name, u.last_name', 'SELECT COUNT(*)', $sql));
            $countStmt->execute($params);
            $total = $countStmt->fetchColumn();

            // Get jobs
            $sql .= " ORDER BY j.created_at DESC LIMIT :limit OFFSET :offset";
            $stmt = $db->prepare($sql);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            $jobs = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($jobs as &$j) {
                $j['user_name'] = trim(($j['first_name'] ?? '') . ' ' . ($j['last_name'] ?? ''));
                $j['status_label'] = $statuses[$j['status']] ?? null;
                $j['operation_label'] = $operationLabels[$j['operation']] ?? ['ro' => $j['operation'], 'en' => $j['operation']];
                $j['entity_label'] = $entityLabels[$j['entity_type']] ?? ['ro' => $j['entity_type'], 'en' => $j['entity_type']];
                $j['progress_percent'] = $j['total_items'] > 0 ? round(($j['processed_items'] / $j['total_items']) * 100) : 0;
            }

            echo json_encode([
                'success' => true,
                'data' => [
                    'jobs' => $jobs,
                    'pagination' => [
                        'page' => $page,
                        'limit' => $limit,
                        'total' => intval($total),
                        'total_pages' => ceil($total / $limit),
                    ],
                    'statuses' => $statuses,
                    'operation_labels' => $operationLabels,
                    'entity_labels' => $entityLabels,
                ],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        }

    } elseif ($method === 'DELETE') {
        $jobId = $_GET['id'] ?? null;

        if (!$jobId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'id required']);
            exit;
        }

        // Check ownership
        $stmt = $db->prepare("SELECT user_id, status FROM bulk_jobs WHERE id = :id AND company_id = :company_id");
        $stmt->execute(['id' => $jobId, 'company_id' => $companyId]);
        $job = $stmt->fetch();

        if (!$job) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Job not found']);
            exit;
        }

        if ($job['user_id'] !== $user['user_id'] && $user['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error_ro' => 'Nu puteți șterge acest job',
                'error' => 'You cannot delete this job'
            ]);
            exit;
        }

        // Can only delete completed or failed jobs
        if (!in_array($job['status'], ['completed', 'failed', 'cancelled'])) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error_ro' => 'Puteți șterge doar joburi finalizate',
                'error' => 'You can only delete completed jobs'
            ]);
            exit;
        }

        $stmt = $db->prepare("DELETE FROM bulk_jobs WHERE id = :id");
        $stmt->execute(['id' => $jobId]);

        echo json_encode([
            'success' => true,
            'message_ro' => 'Job șters',
            'message_en' => 'Job deleted',
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
