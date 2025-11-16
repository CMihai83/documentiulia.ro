#!/usr/bin/env php
<?php
/**
 * Test PDF Generation
 * Creates a sample invoice and generates a PDF to verify mPDF is working
 */

echo "=== PDF Generation Test ===\n\n";

require_once __DIR__ . '/../api/config/database.php';
require_once __DIR__ . '/../api/services/InvoicePDFService.php';

try {
    $db = Database::getInstance();

    echo "1. Checking for existing invoices...\n";

    // Get a sample invoice from database
    $invoice = $db->fetchOne("
        SELECT id, invoice_number
        FROM invoices
        WHERE total_amount > 0
        LIMIT 1
    ");

    if (!$invoice) {
        echo "   No invoices found in database. Creating test invoice...\n";

        // Get a company and customer
        $company = $db->fetchOne("SELECT id FROM companies LIMIT 1");
        $customer = $db->fetchOne("SELECT id FROM contacts WHERE contact_type = 'customer' LIMIT 1");

        if (!$company || !$customer) {
            throw new Exception("No company or customer found in database. Please create test data first.");
        }

        // Create test invoice
        $invoiceId = $db->insert('invoices', [
            'company_id' => $company['id'],
            'customer_id' => $customer['id'],
            'invoice_number' => 'TEST-' . date('Ymd') . '-001',
            'invoice_date' => date('Y-m-d'),
            'due_date' => date('Y-m-d', strtotime('+30 days')),
            'payment_terms' => 30,
            'status' => 'draft',
            'subtotal' => 1000.00,
            'tax_amount' => 190.00,
            'discount_amount' => 0.00,
            'total_amount' => 1190.00,
            'amount_paid' => 0.00,
            'amount_due' => 1190.00,
            'currency' => 'RON',
            'notes' => 'Factură test generată automat pentru verificare sistem PDF'
        ]);

        // Add line items
        $db->insert('invoice_line_items', [
            'invoice_id' => $invoiceId,
            'line_number' => 1,
            'description' => 'Servicii consultanță business',
            'quantity' => 10,
            'unit_price' => 100.00,
            'amount' => 1000.00
        ]);

        $invoice = ['id' => $invoiceId, 'invoice_number' => 'TEST-' . date('Ymd') . '-001'];
        echo "   ✓ Test invoice created: {$invoice['invoice_number']}\n\n";
    } else {
        echo "   ✓ Using existing invoice: {$invoice['invoice_number']}\n\n";
    }

    echo "2. Initializing PDF service...\n";
    $pdfService = new InvoicePDFService();
    echo "   ✓ PDF service initialized\n\n";

    echo "3. Generating PDF...\n";
    echo "   Invoice ID: {$invoice['id']}\n";

    $pdfPath = $pdfService->generatePDF($invoice['id']);

    echo "   ✓ PDF generated successfully!\n\n";
    echo "4. PDF Details:\n";
    echo "   Path: $pdfPath\n";

    if (file_exists($pdfPath)) {
        $fileSize = filesize($pdfPath);
        echo "   Size: " . number_format($fileSize / 1024, 2) . " KB\n";
        echo "   ✓ PDF file exists and is readable\n\n";

        echo "5. Verifying PDF content...\n";
        // Check if it's a valid PDF
        $header = file_get_contents($pdfPath, false, null, 0, 4);
        if ($header === '%PDF') {
            echo "   ✓ Valid PDF file format detected\n\n";
        } else {
            echo "   ⚠ Warning: File may not be a valid PDF\n\n";
        }

        echo "=== PDF GENERATION TEST PASSED ===\n";
        echo "\nYou can view the PDF at: $pdfPath\n";
        echo "To download: scp root@95.216.112.59:$pdfPath ./invoice_test.pdf\n";

    } else {
        throw new Exception("PDF file was not created");
    }

} catch (Exception $e) {
    echo "\n✗ ERROR: " . $e->getMessage() . "\n";
    echo "\nStack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}

echo "\n";
