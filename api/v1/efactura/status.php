<?php
/**
 * e-Factura Status Check Endpoint
 * GET /api/v1/efactura/status.php?invoice_id=xxx
 * POST /api/v1/efactura/status.php (for bulk sync)
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../services/EFacturaService.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    $auth = authenticate();
    $pdo = Database::getInstance()->getConnection();
    $service = EFacturaService::getInstance();

    $companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
    if (!$companyId) {
        throw new Exception('Company ID required', 400);
    }

    // Get parameters
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $invoiceId = $input['invoice_id'] ?? null;
        $syncAll = $input['sync_all'] ?? false;
    } else {
        $invoiceId = $_GET['invoice_id'] ?? null;
        $syncAll = isset($_GET['sync_all']) && $_GET['sync_all'] === 'true';
    }

    if ($invoiceId) {
        // Check specific invoice
        $status = $service->getInvoiceEFacturaStatus($invoiceId, $companyId);

        if (!$status) {
            echo json_encode([
                'success' => true,
                'data' => [
                    'status' => 'not_submitted',
                    'message' => 'Invoice has not been submitted to e-Factura'
                ]
            ]);
            exit();
        }

        // If submitted, check ANAF for latest status
        if ($status['upload_index']) {
            try {
                $anafStatus = $service->checkStatus($invoiceId, $companyId);
                $status['anaf_response'] = $anafStatus;
            } catch (Exception $e) {
                $status['anaf_error'] = $e->getMessage();
            }
        }

        // Get history
        $history = $service->getInvoiceHistory($invoiceId, $companyId);

        echo json_encode([
            'success' => true,
            'data' => [
                'efactura_status' => $status,
                'history' => $history
            ]
        ]);

    } elseif ($syncAll) {
        // Sync all pending invoices for company
        $stmt = $pdo->prepare("
            SELECT ei.invoice_id
            FROM efactura_invoices ei
            WHERE ei.company_id = :company_id
              AND ei.status NOT IN ('validated', 'rejected', 'cancelled')
              AND ei.upload_index IS NOT NULL
        ");
        $stmt->execute(['company_id' => $companyId]);
        $invoices = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $results = [
            'synced' => 0,
            'updated' => 0,
            'errors' => 0,
            'details' => []
        ];

        foreach ($invoices as $invId) {
            try {
                $response = $service->checkStatus($invId, $companyId);
                $results['synced']++;
                if (isset($response['stare'])) {
                    $results['updated']++;
                }
                $results['details'][$invId] = [
                    'success' => true,
                    'status' => $response['stare'] ?? 'unknown'
                ];
            } catch (Exception $e) {
                $results['errors']++;
                $results['details'][$invId] = [
                    'success' => false,
                    'error' => $e->getMessage()
                ];
            }
        }

        echo json_encode([
            'success' => true,
            'data' => $results
        ]);

    } else {
        // List all e-Factura invoices for company
        $stmt = $pdo->prepare("
            SELECT
                ei.*,
                i.invoice_number,
                i.invoice_date,
                i.total_amount,
                c.display_name as customer_name
            FROM efactura_invoices ei
            JOIN invoices i ON ei.invoice_id = i.id
            JOIN contacts c ON i.customer_id = c.id
            WHERE ei.company_id = :company_id
            ORDER BY ei.created_at DESC
            LIMIT 100
        ");
        $stmt->execute(['company_id' => $companyId]);
        $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'data' => $invoices
        ]);
    }

} catch (Exception $e) {
    $code = $e->getCode() ?: 500;
    http_response_code($code > 99 && $code < 600 ? $code : 500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
