<?php
/**
 * Update Recurring Invoice Endpoint
 *
 * PUT /api/v1/recurring-invoices/update.php?id=XXX
 *
 * Updates a recurring invoice template.
 * Allowed fields: frequency, end_date, auto_send, status, line_items
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
    if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'PATCH') {
        throw new Exception('Method not allowed', 405);
    }

    // Get recurring invoice ID
    $recurringId = $_GET['id'] ?? null;

    if (empty($recurringId)) {
        throw new Exception('Recurring invoice ID is required');
    }

    // Get request body
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        throw new Exception('Invalid JSON input');
    }

    // Validate status if provided
    if (isset($input['status'])) {
        $validStatuses = ['active', 'paused', 'cancelled'];
        if (!in_array($input['status'], $validStatuses)) {
            throw new Exception('Invalid status. Use: active, paused, or cancelled');
        }
    }

    // Validate frequency if provided
    if (isset($input['frequency'])) {
        $validFrequencies = ['weekly', 'monthly', 'quarterly', 'yearly'];
        if (!in_array($input['frequency'], $validFrequencies)) {
            throw new Exception('Invalid frequency. Use: weekly, monthly, quarterly, or yearly');
        }
    }

    // Validate line items if provided
    if (isset($input['line_items'])) {
        if (!is_array($input['line_items']) || count($input['line_items']) === 0) {
            throw new Exception('At least one line item is required');
        }

        foreach ($input['line_items'] as $index => $item) {
            if (empty($item['description']) || empty($item['quantity']) || empty($item['unit_price'])) {
                throw new Exception("Line item $index is missing required fields");
            }

            // Calculate amount if not provided
            if (!isset($item['amount'])) {
                $input['line_items'][$index]['amount'] = $item['quantity'] * $item['unit_price'];
            }
        }
    }

    // Update recurring invoice
    $recurringInvoiceService = new RecurringInvoiceService();
    $recurringInvoiceService->updateRecurringInvoice($recurringId, $companyId, $input);

    // Get updated recurring invoice
    $recurring = $recurringInvoiceService->getRecurringInvoice($recurringId, $companyId);

    respondSuccess([
        'recurring_invoice' => $recurring,
        'message' => 'Recurring invoice updated successfully'
    ]);

} catch (Exception $e) {
    $statusCode = $e->getCode() ?: 400;
    if ($statusCode < 100 || $statusCode >= 600) {
        $statusCode = 400;
    }
    respondError($e->getMessage(), $statusCode);
}
