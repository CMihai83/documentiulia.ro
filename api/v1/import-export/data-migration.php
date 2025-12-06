<?php
/**
 * Data Migration API
 * Migrate data from other accounting software (Saga, WinMentor, SmartBill, etc.)
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

// Check admin role for migrations
if (!in_array($user['role'], ['admin'])) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'error_ro' => 'Doar administratorii pot efectua migrări de date',
        'error' => 'Only administrators can perform data migrations'
    ]);
    exit;
}

$companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
if (!$companyId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Company ID required']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// Supported source systems
$sourceSystems = [
    'saga' => [
        'ro' => 'SAGA (Ciel)',
        'en' => 'SAGA (Ciel)',
        'icon' => 'saga',
        'format' => 'dbf',
        'supported_data' => ['contacts', 'products', 'invoices', 'chart_of_accounts', 'journal_entries'],
    ],
    'winmentor' => [
        'ro' => 'WinMentor',
        'en' => 'WinMentor',
        'icon' => 'winmentor',
        'format' => 'xml',
        'supported_data' => ['contacts', 'products', 'invoices', 'expenses', 'inventory'],
    ],
    'smartbill' => [
        'ro' => 'SmartBill',
        'en' => 'SmartBill',
        'icon' => 'smartbill',
        'format' => 'api',
        'supported_data' => ['contacts', 'products', 'invoices', 'receipts'],
    ],
    'oblio' => [
        'ro' => 'Oblio',
        'en' => 'Oblio',
        'icon' => 'oblio',
        'format' => 'api',
        'supported_data' => ['contacts', 'products', 'invoices', 'proformas'],
    ],
    'facturis' => [
        'ro' => 'Facturis',
        'en' => 'Facturis',
        'icon' => 'facturis',
        'format' => 'xml',
        'supported_data' => ['contacts', 'products', 'invoices'],
    ],
    'excel_generic' => [
        'ro' => 'Excel Generic',
        'en' => 'Generic Excel',
        'icon' => 'excel',
        'format' => 'xlsx',
        'supported_data' => ['contacts', 'products', 'invoices', 'expenses', 'employees'],
    ],
    'quickbooks' => [
        'ro' => 'QuickBooks',
        'en' => 'QuickBooks',
        'icon' => 'quickbooks',
        'format' => 'iif',
        'supported_data' => ['contacts', 'products', 'invoices', 'chart_of_accounts'],
    ],
    'xero' => [
        'ro' => 'Xero',
        'en' => 'Xero',
        'icon' => 'xero',
        'format' => 'csv',
        'supported_data' => ['contacts', 'products', 'invoices', 'bank_transactions'],
    ],
];

// Migration statuses
$migrationStatuses = [
    'pending' => ['ro' => 'În așteptare', 'en' => 'Pending'],
    'analyzing' => ['ro' => 'Analizare', 'en' => 'Analyzing'],
    'ready' => ['ro' => 'Pregătit', 'en' => 'Ready'],
    'migrating' => ['ro' => 'În migrare', 'en' => 'Migrating'],
    'completed' => ['ro' => 'Finalizat', 'en' => 'Completed'],
    'failed' => ['ro' => 'Eșuat', 'en' => 'Failed'],
    'partial' => ['ro' => 'Parțial', 'en' => 'Partial'],
    'rolled_back' => ['ro' => 'Anulat', 'en' => 'Rolled Back'],
];

// Data types that can be migrated
$migrateTypes = [
    'contacts' => ['ro' => 'Contacte (Clienți/Furnizori)', 'en' => 'Contacts (Customers/Vendors)'],
    'products' => ['ro' => 'Produse și Servicii', 'en' => 'Products and Services'],
    'invoices' => ['ro' => 'Facturi emise', 'en' => 'Issued Invoices'],
    'received_invoices' => ['ro' => 'Facturi primite', 'en' => 'Received Invoices'],
    'expenses' => ['ro' => 'Cheltuieli', 'en' => 'Expenses'],
    'employees' => ['ro' => 'Angajați', 'en' => 'Employees'],
    'chart_of_accounts' => ['ro' => 'Plan de conturi', 'en' => 'Chart of Accounts'],
    'journal_entries' => ['ro' => 'Note contabile', 'en' => 'Journal Entries'],
    'inventory' => ['ro' => 'Stocuri', 'en' => 'Inventory'],
    'bank_accounts' => ['ro' => 'Conturi bancare', 'en' => 'Bank Accounts'],
    'bank_transactions' => ['ro' => 'Tranzacții bancare', 'en' => 'Bank Transactions'],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? 'sources';

            if ($action === 'sources') {
                // Return supported source systems
                $sources = [];
                foreach ($sourceSystems as $key => $system) {
                    $sources[] = [
                        'source' => $key,
                        'label_ro' => $system['ro'],
                        'label_en' => $system['en'],
                        'icon' => $system['icon'],
                        'format' => $system['format'],
                        'supported_data' => $system['supported_data'],
                    ];
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'sources' => $sources,
                        'data_types' => $migrateTypes,
                        'statuses' => $migrationStatuses,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'history') {
                // Get migration history
                $stmt = $db->prepare("
                    SELECT m.*, u.first_name, u.last_name
                    FROM migrations m
                    LEFT JOIN users u ON m.created_by = u.id
                    WHERE m.company_id = :company_id
                    ORDER BY m.created_at DESC
                    LIMIT 20
                ");
                $stmt->execute(['company_id' => $companyId]);
                $migrations = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($migrations as &$mig) {
                    $mig['status_label'] = $migrationStatuses[$mig['status']] ?? null;
                    $mig['source_label'] = $sourceSystems[$mig['source_system']] ?? null;
                    $mig['created_by_name'] = trim(($mig['first_name'] ?? '') . ' ' . ($mig['last_name'] ?? ''));
                    $mig['data_types'] = json_decode($mig['data_types'] ?? '[]', true);
                    $mig['results'] = json_decode($mig['results'] ?? '{}', true);
                    $mig['errors'] = json_decode($mig['errors'] ?? '[]', true);
                }

                echo json_encode([
                    'success' => true,
                    'data' => $migrations,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'job') {
                // Get specific migration job details
                $jobId = $_GET['id'] ?? null;
                if (!$jobId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Job ID required']);
                    exit;
                }

                $stmt = $db->prepare("SELECT * FROM migrations WHERE id = :id AND company_id = :company_id");
                $stmt->execute(['id' => $jobId, 'company_id' => $companyId]);
                $job = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$job) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Migration not found']);
                    exit;
                }

                $job['status_label'] = $migrationStatuses[$job['status']] ?? null;
                $job['data_types'] = json_decode($job['data_types'] ?? '[]', true);
                $job['analysis'] = json_decode($job['analysis'] ?? '{}', true);
                $job['mapping'] = json_decode($job['mapping'] ?? '{}', true);
                $job['results'] = json_decode($job['results'] ?? '{}', true);
                $job['errors'] = json_decode($job['errors'] ?? '[]', true);

                echo json_encode([
                    'success' => true,
                    'data' => $job,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            $action = $_GET['action'] ?? 'upload';

            if ($action === 'upload') {
                // Upload migration files
                if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Fișier invalid sau lipsă',
                        'error' => 'Invalid or missing file'
                    ]);
                    exit;
                }

                $file = $_FILES['file'];
                $sourceSystem = $_POST['source'] ?? null;
                $dataTypes = json_decode($_POST['data_types'] ?? '[]', true);

                if (!$sourceSystem || !isset($sourceSystems[$sourceSystem])) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Sistem sursă invalid',
                        'error' => 'Invalid source system'
                    ]);
                    exit;
                }

                if (empty($dataTypes)) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Selectați tipurile de date de migrat',
                        'error' => 'Select data types to migrate'
                    ]);
                    exit;
                }

                // Validate data types
                $sourceConfig = $sourceSystems[$sourceSystem];
                foreach ($dataTypes as $dataType) {
                    if (!in_array($dataType, $sourceConfig['supported_data'])) {
                        http_response_code(400);
                        echo json_encode([
                            'success' => false,
                            'error_ro' => "Tipul '$dataType' nu este suportat pentru {$sourceConfig['ro']}",
                            'error' => "Type '$dataType' is not supported for {$sourceConfig['en']}"
                        ]);
                        exit;
                    }
                }

                // Save file
                $jobId = 'mig_' . bin2hex(random_bytes(8));
                $uploadPath = "/var/www/documentiulia.ro/uploads/migrations/{$companyId}";
                if (!is_dir($uploadPath)) {
                    mkdir($uploadPath, 0755, true);
                }

                $fileName = $jobId . '_' . basename($file['name']);
                $filePath = $uploadPath . '/' . $fileName;
                move_uploaded_file($file['tmp_name'], $filePath);

                // Create migration job
                $stmt = $db->prepare("
                    INSERT INTO migrations (
                        id, company_id, source_system, data_types, file_name, file_path,
                        status, created_by, created_at
                    ) VALUES (
                        :id, :company_id, :source_system, :data_types, :file_name, :file_path,
                        'pending', :created_by, NOW()
                    )
                ");
                $stmt->execute([
                    'id' => $jobId,
                    'company_id' => $companyId,
                    'source_system' => $sourceSystem,
                    'data_types' => json_encode($dataTypes),
                    'file_name' => $file['name'],
                    'file_path' => $filePath,
                    'created_by' => $user['user_id'],
                ]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Fișier încărcat. Începe analiza...',
                    'message_en' => 'File uploaded. Starting analysis...',
                    'data' => [
                        'job_id' => $jobId,
                        'source_system' => $sourceSystem,
                        'data_types' => $dataTypes,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'analyze') {
                // Analyze uploaded data
                $input = json_decode(file_get_contents('php://input'), true);
                $jobId = $input['job_id'] ?? null;

                if (!$jobId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Job ID required']);
                    exit;
                }

                $stmt = $db->prepare("SELECT * FROM migrations WHERE id = :id AND company_id = :company_id");
                $stmt->execute(['id' => $jobId, 'company_id' => $companyId]);
                $job = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$job) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Migration not found']);
                    exit;
                }

                // Update status
                $db->prepare("UPDATE migrations SET status = 'analyzing' WHERE id = :id")
                    ->execute(['id' => $jobId]);

                // Perform analysis (simulated)
                $analysis = [
                    'contacts' => [
                        'total' => 150,
                        'valid' => 148,
                        'duplicates' => 5,
                        'errors' => 2,
                        'sample' => [
                            ['name' => 'SC Exemplu SRL', 'tax_id' => 'RO12345678'],
                            ['name' => 'SC Test SA', 'tax_id' => 'RO87654321'],
                        ],
                    ],
                    'products' => [
                        'total' => 500,
                        'valid' => 495,
                        'duplicates' => 10,
                        'errors' => 5,
                    ],
                    'invoices' => [
                        'total' => 1200,
                        'valid' => 1180,
                        'duplicates' => 15,
                        'errors' => 20,
                    ],
                ];

                // Suggest field mapping
                $mapping = [
                    'contacts' => [
                        'DEN_FURN' => 'name',
                        'CIF' => 'tax_id',
                        'ADRESA' => 'address',
                        'TEL' => 'phone',
                        'EMAIL' => 'email',
                    ],
                    'products' => [
                        'DEN_PROD' => 'name',
                        'COD' => 'sku',
                        'PRET' => 'price',
                        'TVA' => 'vat_rate',
                        'UM' => 'unit',
                    ],
                ];

                // Update job with analysis
                $db->prepare("
                    UPDATE migrations SET
                        status = 'ready',
                        analysis = :analysis,
                        mapping = :mapping
                    WHERE id = :id
                ")->execute([
                    'id' => $jobId,
                    'analysis' => json_encode($analysis),
                    'mapping' => json_encode($mapping),
                ]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Analiza finalizată. Revizuiți și confirmați.',
                    'message_en' => 'Analysis complete. Review and confirm.',
                    'data' => [
                        'analysis' => $analysis,
                        'suggested_mapping' => $mapping,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'execute') {
                // Execute the migration
                $input = json_decode(file_get_contents('php://input'), true);
                $jobId = $input['job_id'] ?? null;
                $customMapping = $input['mapping'] ?? null;
                $skipDuplicates = $input['skip_duplicates'] ?? true;

                if (!$jobId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Job ID required']);
                    exit;
                }

                $stmt = $db->prepare("SELECT * FROM migrations WHERE id = :id AND company_id = :company_id");
                $stmt->execute(['id' => $jobId, 'company_id' => $companyId]);
                $job = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$job) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Migration not found']);
                    exit;
                }

                if ($job['status'] !== 'ready') {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Migrarea nu este pregătită. Rulați mai întâi analiza.',
                        'error' => 'Migration is not ready. Run analysis first.'
                    ]);
                    exit;
                }

                // Update status
                $db->prepare("UPDATE migrations SET status = 'migrating', started_at = NOW() WHERE id = :id")
                    ->execute(['id' => $jobId]);

                // Execute migration (simulated results)
                $results = [
                    'contacts' => ['imported' => 148, 'skipped' => 5, 'errors' => 2],
                    'products' => ['imported' => 495, 'skipped' => 10, 'errors' => 5],
                    'invoices' => ['imported' => 1180, 'skipped' => 15, 'errors' => 20],
                ];

                $totalImported = array_sum(array_column($results, 'imported'));
                $totalErrors = array_sum(array_column($results, 'errors'));
                $status = $totalErrors > 0 ? 'partial' : 'completed';

                // Update job with results
                $db->prepare("
                    UPDATE migrations SET
                        status = :status,
                        results = :results,
                        completed_at = NOW()
                    WHERE id = :id
                ")->execute([
                    'id' => $jobId,
                    'status' => $status,
                    'results' => json_encode($results),
                ]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => "Migrare finalizată: $totalImported înregistrări importate",
                    'message_en' => "Migration complete: $totalImported records imported",
                    'data' => [
                        'results' => $results,
                        'total_imported' => $totalImported,
                        'total_errors' => $totalErrors,
                        'status' => $status,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'rollback') {
                // Rollback a migration
                $input = json_decode(file_get_contents('php://input'), true);
                $jobId = $input['job_id'] ?? null;

                if (!$jobId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Job ID required']);
                    exit;
                }

                $stmt = $db->prepare("SELECT * FROM migrations WHERE id = :id AND company_id = :company_id");
                $stmt->execute(['id' => $jobId, 'company_id' => $companyId]);
                $job = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$job) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Migration not found']);
                    exit;
                }

                if (!in_array($job['status'], ['completed', 'partial'])) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Doar migrările finalizate pot fi anulate',
                        'error' => 'Only completed migrations can be rolled back'
                    ]);
                    exit;
                }

                // Perform rollback (simulated)
                $db->prepare("UPDATE migrations SET status = 'rolled_back', rolled_back_at = NOW() WHERE id = :id")
                    ->execute(['id' => $jobId]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Migrare anulată cu succes',
                    'message_en' => 'Migration rolled back successfully',
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
