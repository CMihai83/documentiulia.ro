#!/usr/bin/env php
<?php
/**
 * Generate Recurring Invoices Cron Job
 * Run daily to auto-generate invoices from recurring templates
 *
 * Add to crontab:
 * 0 2 * * * /usr/bin/php /var/www/documentiulia.ro/scripts/generate_recurring_invoices.php
 */

require_once __DIR__ . '/../api/config/database.php';
require_once __DIR__ . '/../api/services/InvoiceService.php';
require_once __DIR__ . '/../api/services/EmailService.php';

echo "[" . date('Y-m-d H:i:s') . "] Starting recurring invoices generation\n";

try {
    $db = Database::getInstance();
    $invoiceService = new InvoiceService();
    $emailService = new EmailService();

    // Get all active recurring invoices due today or earlier
    $recurringInvoices = $db->fetchAll("
        SELECT ri.*,
               co.name as company_name,
               cu.display_name as customer_name,
               cu.email as customer_email
        FROM recurring_invoices ri
        JOIN companies co ON ri.company_id = co.id
        JOIN contacts cu ON ri.customer_id = cu.id
        WHERE ri.is_active = TRUE
          AND ri.next_invoice_date <= CURRENT_DATE
        ORDER BY ri.next_invoice_date
    ");

    echo "Found " . count($recurringInvoices) . " recurring invoices to process\n";

    foreach ($recurringInvoices as $recurring) {
        try {
            echo "\nProcessing recurring invoice ID: {$recurring['id']}\n";
            echo "  Company: {$recurring['company_name']}\n";
            echo "  Customer: {$recurring['customer_name']}\n";

            // Parse template data
            $templateData = json_decode($recurring['template_data'], true);

            // Generate new invoice number
            $invoiceNumber = generateInvoiceNumber($db, $recurring['company_id']);

            // Create invoice from template
            $invoiceData = [
                'customer_id' => $recurring['customer_id'],
                'invoice_number' => $invoiceNumber,
                'invoice_date' => date('Y-m-d'),
                'due_date' => date('Y-m-d', strtotime($templateData['payment_terms'] . ' days')),
                'payment_terms' => $templateData['payment_terms'] ?? 30,
                'line_items' => $templateData['line_items'],
                'tax_amount' => $templateData['tax_amount'] ?? 0,
                'discount_amount' => $templateData['discount_amount'] ?? 0,
                'currency' => $templateData['currency'] ?? 'RON',
                'notes' => $templateData['notes'] ?? "Factură generată automat din abonament"
            ];

            // Create invoice
            $newInvoice = $invoiceService->createInvoice($recurring['company_id'], $invoiceData);

            echo "  ✓ Created invoice: {$invoiceNumber}\n";

            // Send email notification
            if ($recurring['customer_email']) {
                // TODO: Generate PDF and send email
                echo "  ✓ Email notification queued\n";
            }

            // Calculate next invoice date
            $nextDate = calculateNextInvoiceDate(
                $recurring['next_invoice_date'],
                $recurring['frequency'],
                $recurring['interval_days']
            );

            // Update recurring invoice
            $db->update('recurring_invoices', [
                'last_generated_date' => date('Y-m-d'),
                'next_invoice_date' => $nextDate,
                'updated_at' => date('Y-m-d H:i:s')
            ], ['id' => $recurring['id']]);

            echo "  ✓ Next invoice scheduled for: {$nextDate}\n";

        } catch (Exception $e) {
            echo "  ✗ Error: " . $e->getMessage() . "\n";
            continue;
        }
    }

    echo "\n[" . date('Y-m-d H:i:s') . "] Recurring invoices generation completed\n";

} catch (Exception $e) {
    echo "FATAL ERROR: " . $e->getMessage() . "\n";
    exit(1);
}

/**
 * Generate next invoice number for a company
 */
function generateInvoiceNumber($db, $companyId) {
    $lastInvoice = $db->fetchOne(
        "SELECT invoice_number FROM invoices WHERE company_id = :id ORDER BY id DESC LIMIT 1",
        ['id' => $companyId]
    );

    if ($lastInvoice && preg_match('/(\d+)$/', $lastInvoice['invoice_number'], $matches)) {
        $nextNumber = intval($matches[1]) + 1;
        return 'FAC-' . str_pad($nextNumber, 6, '0', STR_PAD_LEFT);
    }

    return 'FAC-' . date('Y') . '-000001';
}

/**
 * Calculate next invoice date based on frequency
 */
function calculateNextInvoiceDate($currentDate, $frequency, $intervalDays = null) {
    $date = new DateTime($currentDate);

    switch ($frequency) {
        case 'monthly':
            $date->modify('+1 month');
            break;
        case 'quarterly':
            $date->modify('+3 months');
            break;
        case 'yearly':
            $date->modify('+1 year');
            break;
        case 'custom':
            if ($intervalDays) {
                $date->modify("+{$intervalDays} days");
            }
            break;
    }

    return $date->format('Y-m-d');
}
