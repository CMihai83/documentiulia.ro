<?php
/**
 * Excel Import API
 * Import data from Excel files (XLSX, XLS)
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

// Supported Excel formats
$supportedFormats = [
    'xlsx' => ['ro' => 'Excel 2007+ (.xlsx)', 'en' => 'Excel 2007+ (.xlsx)'],
    'xls' => ['ro' => 'Excel 97-2003 (.xls)', 'en' => 'Excel 97-2003 (.xls)'],
    'ods' => ['ro' => 'OpenDocument (.ods)', 'en' => 'OpenDocument (.ods)'],
];

// Import types (same as CSV)
$importTypes = [
    'contacts' => ['ro' => 'Contacte', 'en' => 'Contacts'],
    'products' => ['ro' => 'Produse', 'en' => 'Products'],
    'invoices' => ['ro' => 'Facturi', 'en' => 'Invoices'],
    'expenses' => ['ro' => 'Cheltuieli', 'en' => 'Expenses'],
    'employees' => ['ro' => 'Angajați', 'en' => 'Employees'],
    'projects' => ['ro' => 'Proiecte', 'en' => 'Projects'],
    'inventory' => ['ro' => 'Inventar', 'en' => 'Inventory'],
    'journal_entries' => ['ro' => 'Note contabile', 'en' => 'Journal Entries'],
];

// Sheet detection modes
$sheetModes = [
    'first' => ['ro' => 'Prima foaie', 'en' => 'First sheet'],
    'named' => ['ro' => 'După nume', 'en' => 'By name'],
    'all' => ['ro' => 'Toate foile', 'en' => 'All sheets'],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? 'formats';

            if ($action === 'formats') {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'formats' => $supportedFormats,
                        'import_types' => $importTypes,
                        'sheet_modes' => $sheetModes,
                        'max_file_size' => '10MB',
                        'max_rows' => 50000,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'templates') {
                // Get available import templates
                $stmt = $db->prepare("
                    SELECT * FROM import_templates
                    WHERE company_id = :company_id OR is_system = true
                    ORDER BY is_system DESC, name ASC
                ");
                $stmt->execute(['company_id' => $companyId]);
                $templates = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($templates as &$tpl) {
                    $tpl['field_mapping'] = json_decode($tpl['field_mapping'] ?? '{}', true);
                    $tpl['type_label'] = $importTypes[$tpl['import_type']] ?? null;
                }

                echo json_encode([
                    'success' => true,
                    'data' => $templates,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'preview') {
                // Preview uploaded file structure
                $jobId = $_GET['job_id'] ?? null;
                if (!$jobId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Job ID required']);
                    exit;
                }

                $stmt = $db->prepare("SELECT * FROM import_jobs WHERE id = :id AND company_id = :company_id");
                $stmt->execute(['id' => $jobId, 'company_id' => $companyId]);
                $job = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$job) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Job not found']);
                    exit;
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'sheets' => json_decode($job['sheet_info'] ?? '[]', true),
                        'preview_data' => json_decode($job['preview_data'] ?? '[]', true),
                        'columns' => json_decode($job['detected_columns'] ?? '[]', true),
                        'total_rows' => $job['total_rows'],
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            $action = $_GET['action'] ?? 'upload';

            if ($action === 'upload') {
                // Handle Excel file upload
                if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Fișier Excel invalid sau lipsă',
                        'error' => 'Invalid or missing Excel file'
                    ]);
                    exit;
                }

                $file = $_FILES['file'];
                $importType = $_POST['type'] ?? null;
                $sheetMode = $_POST['sheet_mode'] ?? 'first';
                $sheetName = $_POST['sheet_name'] ?? null;
                $headerRow = intval($_POST['header_row'] ?? 1);
                $startRow = intval($_POST['start_row'] ?? 2);

                if (!$importType || !isset($importTypes[$importType])) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Tip import invalid',
                        'error' => 'Invalid import type'
                    ]);
                    exit;
                }

                // Validate file extension
                $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
                if (!isset($supportedFormats[$ext])) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Format neacceptat. Folosiți XLSX, XLS sau ODS.',
                        'error' => 'Unsupported format. Use XLSX, XLS, or ODS.'
                    ]);
                    exit;
                }

                // Check file size (10MB limit)
                if ($file['size'] > 10 * 1024 * 1024) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Fișierul depășește 10MB',
                        'error' => 'File exceeds 10MB limit'
                    ]);
                    exit;
                }

                // Save file
                $jobId = 'xls_' . bin2hex(random_bytes(8));
                $uploadPath = "/var/www/documentiulia.ro/uploads/imports/{$companyId}";
                if (!is_dir($uploadPath)) {
                    mkdir($uploadPath, 0755, true);
                }

                $fileName = $jobId . '_' . basename($file['name']);
                $filePath = $uploadPath . '/' . $fileName;
                move_uploaded_file($file['tmp_name'], $filePath);

                // Parse Excel file using PhpSpreadsheet (simulated)
                // In production, use: $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($filePath);
                $sheetInfo = [
                    ['name' => 'Sheet1', 'rows' => 100, 'columns' => 10],
                ];

                // Simulated preview data
                $previewData = [
                    ['A' => 'Header1', 'B' => 'Header2', 'C' => 'Header3'],
                    ['A' => 'Value1', 'B' => 'Value2', 'C' => 'Value3'],
                ];

                $detectedColumns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

                // Create import job
                $stmt = $db->prepare("
                    INSERT INTO import_jobs (
                        id, company_id, import_type, file_name, file_path, file_format,
                        total_rows, status, sheet_mode, sheet_name, header_row, start_row,
                        sheet_info, detected_columns, preview_data, created_by, created_at
                    ) VALUES (
                        :id, :company_id, :import_type, :file_name, :file_path, :file_format,
                        :total_rows, 'pending', :sheet_mode, :sheet_name, :header_row, :start_row,
                        :sheet_info, :detected_columns, :preview_data, :created_by, NOW()
                    )
                ");
                $stmt->execute([
                    'id' => $jobId,
                    'company_id' => $companyId,
                    'import_type' => $importType,
                    'file_name' => $file['name'],
                    'file_path' => $filePath,
                    'file_format' => $ext,
                    'total_rows' => 100,
                    'sheet_mode' => $sheetMode,
                    'sheet_name' => $sheetName,
                    'header_row' => $headerRow,
                    'start_row' => $startRow,
                    'sheet_info' => json_encode($sheetInfo),
                    'detected_columns' => json_encode($detectedColumns),
                    'preview_data' => json_encode($previewData),
                    'created_by' => $user['user_id'],
                ]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Fișier Excel încărcat cu succes',
                    'message_en' => 'Excel file uploaded successfully',
                    'data' => [
                        'job_id' => $jobId,
                        'sheets' => $sheetInfo,
                        'columns' => $detectedColumns,
                        'preview' => $previewData,
                        'total_rows' => 100,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'save_template') {
                // Save import configuration as template
                $input = json_decode(file_get_contents('php://input'), true);

                $name = $input['name'] ?? null;
                $importType = $input['import_type'] ?? null;
                $fieldMapping = $input['field_mapping'] ?? [];

                if (!$name || !$importType || empty($fieldMapping)) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Numele, tipul și maparea sunt obligatorii',
                        'error' => 'Name, type, and mapping are required'
                    ]);
                    exit;
                }

                $templateId = 'tpl_' . bin2hex(random_bytes(8));
                $stmt = $db->prepare("
                    INSERT INTO import_templates (
                        id, company_id, name, description, import_type,
                        field_mapping, is_system, created_by, created_at
                    ) VALUES (
                        :id, :company_id, :name, :description, :import_type,
                        :field_mapping, false, :created_by, NOW()
                    )
                ");
                $stmt->execute([
                    'id' => $templateId,
                    'company_id' => $companyId,
                    'name' => $name,
                    'description' => $input['description'] ?? null,
                    'import_type' => $importType,
                    'field_mapping' => json_encode($fieldMapping),
                    'created_by' => $user['user_id'],
                ]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Șablon salvat',
                    'message_en' => 'Template saved',
                    'data' => ['id' => $templateId],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'apply_template') {
                // Apply saved template to import job
                $input = json_decode(file_get_contents('php://input'), true);
                $jobId = $input['job_id'] ?? null;
                $templateId = $input['template_id'] ?? null;

                if (!$jobId || !$templateId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Job ID and Template ID required']);
                    exit;
                }

                // Get template
                $stmt = $db->prepare("
                    SELECT * FROM import_templates
                    WHERE id = :id AND (company_id = :company_id OR is_system = true)
                ");
                $stmt->execute(['id' => $templateId, 'company_id' => $companyId]);
                $template = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$template) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Template not found']);
                    exit;
                }

                // Apply to job
                $db->prepare("
                    UPDATE import_jobs SET
                        field_mapping = :field_mapping,
                        template_id = :template_id
                    WHERE id = :id AND company_id = :company_id
                ")->execute([
                    'field_mapping' => $template['field_mapping'],
                    'template_id' => $templateId,
                    'id' => $jobId,
                    'company_id' => $companyId,
                ]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Șablon aplicat',
                    'message_en' => 'Template applied',
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
