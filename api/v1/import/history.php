<?php
/**
 * Data Import - History API
 * View import history and status
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

// Status labels
$statusLabels = [
    'pending' => ['ro' => 'În așteptare', 'en' => 'Pending'],
    'mapped' => ['ro' => 'Mapat', 'en' => 'Mapped'],
    'validated' => ['ro' => 'Validat', 'en' => 'Validated'],
    'validation_errors' => ['ro' => 'Erori de validare', 'en' => 'Validation errors'],
    'processing' => ['ro' => 'Se procesează', 'en' => 'Processing'],
    'completed' => ['ro' => 'Completat', 'en' => 'Completed'],
    'completed_with_errors' => ['ro' => 'Completat cu erori', 'en' => 'Completed with errors'],
    'failed' => ['ro' => 'Eșuat', 'en' => 'Failed'],
];

$dataTypeLabels = [
    'contacts' => ['ro' => 'Contacte', 'en' => 'Contacts'],
    'products' => ['ro' => 'Produse', 'en' => 'Products'],
    'invoices' => ['ro' => 'Facturi', 'en' => 'Invoices'],
    'expenses' => ['ro' => 'Cheltuieli', 'en' => 'Expenses'],
    'transactions' => ['ro' => 'Tranzacții', 'en' => 'Transactions'],
    'employees' => ['ro' => 'Angajați', 'en' => 'Employees'],
    'chart_of_accounts' => ['ro' => 'Plan de Conturi', 'en' => 'Chart of Accounts'],
];

try {
    $db = getDbConnection();

    if ($method === 'GET') {
        $importId = $_GET['id'] ?? null;

        if ($importId) {
            // Get single import details
            $stmt = $db->prepare("
                SELECT ij.*, u.first_name, u.last_name
                FROM import_jobs ij
                LEFT JOIN users u ON ij.uploaded_by = u.id
                WHERE ij.id = :id AND ij.company_id = :company_id
            ");
            $stmt->execute(['id' => $importId, 'company_id' => $companyId]);
            $import = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$import) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Import not found']);
                exit;
            }

            $import['status_label'] = $statusLabels[$import['status']] ?? ['ro' => $import['status'], 'en' => $import['status']];
            $import['data_type_label'] = $dataTypeLabels[$import['data_type']] ?? ['ro' => $import['data_type'], 'en' => $import['data_type']];
            $import['column_mapping'] = json_decode($import['column_mapping'] ?? '{}', true);
            $import['validation_errors'] = json_decode($import['validation_errors'] ?? '[]', true);
            $import['processing_result'] = json_decode($import['processing_result'] ?? '{}', true);
            $import['uploaded_by_name'] = trim(($import['first_name'] ?? '') . ' ' . ($import['last_name'] ?? ''));

            echo json_encode([
                'success' => true,
                'data' => $import,
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        } else {
            // List all imports
            $page = max(1, intval($_GET['page'] ?? 1));
            $limit = min(100, max(10, intval($_GET['limit'] ?? 20)));
            $offset = ($page - 1) * $limit;
            $dataType = $_GET['data_type'] ?? null;
            $status = $_GET['status'] ?? null;

            // Count total
            $countSql = "SELECT COUNT(*) FROM import_jobs WHERE company_id = :company_id";
            $params = ['company_id' => $companyId];

            if ($dataType) {
                $countSql .= " AND data_type = :data_type";
                $params['data_type'] = $dataType;
            }
            if ($status) {
                $countSql .= " AND status = :status";
                $params['status'] = $status;
            }

            $countStmt = $db->prepare($countSql);
            $countStmt->execute($params);
            $total = $countStmt->fetchColumn();

            // Get imports
            $sql = "
                SELECT ij.*, u.first_name, u.last_name
                FROM import_jobs ij
                LEFT JOIN users u ON ij.uploaded_by = u.id
                WHERE ij.company_id = :company_id
            ";

            if ($dataType) {
                $sql .= " AND ij.data_type = :data_type";
            }
            if ($status) {
                $sql .= " AND ij.status = :status";
            }

            $sql .= " ORDER BY ij.created_at DESC LIMIT :limit OFFSET :offset";

            $stmt = $db->prepare($sql);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            $imports = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Add labels
            foreach ($imports as &$import) {
                $import['status_label'] = $statusLabels[$import['status']] ?? ['ro' => $import['status'], 'en' => $import['status']];
                $import['data_type_label'] = $dataTypeLabels[$import['data_type']] ?? ['ro' => $import['data_type'], 'en' => $import['data_type']];
                $import['uploaded_by_name'] = trim(($import['first_name'] ?? '') . ' ' . ($import['last_name'] ?? ''));
                unset($import['column_mapping'], $import['validation_errors'], $import['processing_result']);
            }

            echo json_encode([
                'success' => true,
                'data' => [
                    'imports' => $imports,
                    'pagination' => [
                        'page' => $page,
                        'limit' => $limit,
                        'total' => intval($total),
                        'total_pages' => ceil($total / $limit),
                    ],
                    'filters' => [
                        'data_types' => $dataTypeLabels,
                        'statuses' => $statusLabels,
                    ],
                ],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        }

    } elseif ($method === 'DELETE') {
        $importId = $_GET['id'] ?? null;

        if (!$importId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'id required']);
            exit;
        }

        // Get import to delete file
        $stmt = $db->prepare("
            SELECT file_path FROM import_jobs
            WHERE id = :id AND company_id = :company_id
        ");
        $stmt->execute(['id' => $importId, 'company_id' => $companyId]);
        $import = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$import) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Import not found']);
            exit;
        }

        // Delete file
        if (!empty($import['file_path']) && file_exists($import['file_path'])) {
            unlink($import['file_path']);
        }

        // Delete record
        $stmt = $db->prepare("DELETE FROM import_jobs WHERE id = :id");
        $stmt->execute(['id' => $importId]);

        echo json_encode([
            'success' => true,
            'message_ro' => 'Import șters cu succes',
            'message_en' => 'Import deleted successfully',
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
