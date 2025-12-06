<?php
/**
 * Create Recurring Invoice Endpoint
 *
 * POST /api/v1/recurring-invoices/create.php
 *
 * Creates a new recurring invoice template for automated billing.
 * Supports weekly, monthly, quarterly, and yearly frequencies.
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
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Method not allowed', 405);
    }

    // Get request body
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        throw new Exception('Invalid JSON input');
    }

    // Validate required fields
    $requiredFields = ['customer_id', 'frequency', 'line_items'];
    foreach ($requiredFields as $field) {
        if (empty($input[$field])) {
            throw new Exception("Field '$field' is required");
        }
    }

    // Validate frequency
    $validFrequencies = ['weekly', 'monthly', 'quarterly', 'yearly'];
    if (!in_array($input['frequency'], $validFrequencies)) {
        throw new Exception('Invalid frequency. Use: weekly, monthly, quarterly, or yearly');
    }

    // Validate line items
    if (!is_array($input['line_items']) || count($input['line_items']) === 0) {
        throw new Exception('At least one line item is required');
    }

    foreach ($input['line_items'] as $index => $item) {
        if (empty($item['description']) || empty($item['quantity']) || empty($item['unit_price'])) {
            throw new Exception("Line item $index is missing required fields (description, quantity, unit_price)");
        }

        if (!is_numeric($item['quantity']) || $item['quantity'] <= 0) {
            throw new Exception("Line item $index: quantity must be a positive number");
        }

        if (!is_numeric($item['unit_price']) || $item['unit_price'] <= 0) {
            throw new Exception("Line item $index: unit_price must be a positive number");
        }

        // Calculate amount if not provided
        if (!isset($item['amount'])) {
            $input['line_items'][$index]['amount'] = $item['quantity'] * $item['unit_price'];
        }
    }

    // Create recurring invoice
    $recurringInvoiceService = new RecurringInvoiceService();
    $recurringId = $recurringInvoiceService->createRecurringInvoice(
        $companyId,
        $userData['user_id'],
        $input
    );

    // Get created recurring invoice
    $recurring = $recurringInvoiceService->getRecurringInvoice($recurringId, $companyId);

    respondSuccess([
        'recurring_invoice' => $recurring,
        'message' => 'Recurring invoice created successfully'
    ], 201);

} catch (Exception $e) {
    $statusCode = $e->getCode() ?: 400;
    if ($statusCode < 100 || $statusCode >= 600) {
        $statusCode = 400;
    }
    respondError($e->getMessage(), $statusCode);
}
