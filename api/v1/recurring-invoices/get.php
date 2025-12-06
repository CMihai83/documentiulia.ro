<?php
/**
 * Get Recurring Invoice Details Endpoint
 *
 * GET /api/v1/recurring-invoices/get.php?id=XXX
 *
 * Gets detailed information about a specific recurring invoice,
 * including the last 12 generated invoices.
 *
 * @authenticated
 * @requires JWT token
 * @requires X-Company-ID header
 */

require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../middleware/company.php';
require_once __DIR__ . '/../../services/RecurringInvoiceService.php';
require_once __DIR__ . '/../../helpers/response.php';

header('Content-Type: application/json');

try {
    // Authenticate user
    $userData = authenticateRequest();

    // Get company ID
    $companyId = getCompanyId();

    // Validate request method
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        throw new Exception('Method not allowed', 405);
    }

    // Get recurring invoice ID
    $recurringId = $_GET['id'] ?? null;

    if (empty($recurringId)) {
        throw new Exception('Recurring invoice ID is required');
    }

    // Get recurring invoice
    $recurringInvoiceService = new RecurringInvoiceService();
    $recurring = $recurringInvoiceService->getRecurringInvoice($recurringId, $companyId);

    // Parse invoice template JSON
    if (isset($recurring['invoice_template']) && is_string($recurring['invoice_template'])) {
        $recurring['invoice_template'] = json_decode($recurring['invoice_template'], true);
    }

    respondSuccess([
        'recurring_invoice' => $recurring
    ]);

} catch (Exception $e) {
    $statusCode = $e->getCode() ?: 400;
    if ($statusCode < 100 || $statusCode >= 600) {
        $statusCode = 400;
    }
    respondError($e->getMessage(), $statusCode);
}
