<?php
/**
 * Cancel Recurring Invoice Endpoint
 *
 * DELETE /api/v1/recurring-invoices/cancel.php?id=XXX
 *
 * Cancels a recurring invoice (sets status to 'cancelled').
 * No more invoices will be generated from this template.
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
    if ($_SERVER['REQUEST_METHOD'] !== 'DELETE' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Method not allowed', 405);
    }

    // Get recurring invoice ID
    $recurringId = $_GET['id'] ?? null;

    if (empty($recurringId)) {
        throw new Exception('Recurring invoice ID is required');
    }

    // Cancel recurring invoice
    $recurringInvoiceService = new RecurringInvoiceService();
    $recurringInvoiceService->cancelRecurringInvoice($recurringId, $companyId);

    respondSuccess([
        'message' => 'Recurring invoice cancelled successfully'
    ]);

} catch (Exception $e) {
    $statusCode = $e->getCode() ?: 400;
    if ($statusCode < 100 || $statusCode >= 600) {
        $statusCode = 400;
    }
    respondError($e->getMessage(), $statusCode);
}
