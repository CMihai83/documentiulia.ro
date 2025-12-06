<?php
/**
 * List Recurring Invoices Endpoint
 *
 * GET /api/v1/recurring-invoices/list.php
 *
 * Lists all recurring invoices for a company with optional filters.
 *
 * Query Parameters:
 * - status: Filter by status (active, cancelled, paused)
 * - customer_id: Filter by customer
 * - frequency: Filter by frequency (weekly, monthly, quarterly, yearly)
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

    // Build filters from query parameters
    $filters = [];

    if (!empty($_GET['status'])) {
        $filters['status'] = $_GET['status'];
    }

    if (!empty($_GET['customer_id'])) {
        $filters['customer_id'] = $_GET['customer_id'];
    }

    if (!empty($_GET['frequency'])) {
        $filters['frequency'] = $_GET['frequency'];
    }

    // Get recurring invoices
    $recurringInvoiceService = new RecurringInvoiceService();
    $recurringInvoices = $recurringInvoiceService->listRecurringInvoices($companyId, $filters);

    // Get statistics
    $stats = $recurringInvoiceService->getStatistics($companyId);

    respondSuccess([
        'recurring_invoices' => $recurringInvoices,
        'statistics' => $stats,
        'count' => count($recurringInvoices)
    ]);

} catch (Exception $e) {
    $statusCode = $e->getCode() ?: 400;
    if ($statusCode < 100 || $statusCode >= 600) {
        $statusCode = 400;
    }
    respondError($e->getMessage(), $statusCode);
}
