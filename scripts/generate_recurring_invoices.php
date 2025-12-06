#!/usr/bin/env php
<?php
/**
 * Generate Recurring Invoices Cron Job
 *
 * This script should be run daily via cron to automatically generate
 * invoices from active recurring invoice templates.
 *
 * Cron configuration (run daily at 2:00 AM):
 * 0 2 * * * /usr/bin/php /var/www/documentiulia.ro/scripts/generate_recurring_invoices.php >> /var/log/recurring_invoices.log 2>&1
 *
 * Or run every hour:
 * 0 * * * * /usr/bin/php /var/www/documentiulia.ro/scripts/generate_recurring_invoices.php >> /var/log/recurring_invoices.log 2>&1
 *
 * @version 1.0.0
 * @date 2025-11-21
 */

// Set error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set execution time limit (10 minutes)
set_time_limit(600);

// Get script start time
$startTime = microtime(true);
$startDateTime = date('Y-m-d H:i:s');

echo "=====================================\n";
echo "Recurring Invoice Generation Started\n";
echo "=====================================\n";
echo "Time: $startDateTime\n";
echo "PHP Version: " . PHP_VERSION . "\n";
echo "\n";

// Load dependencies
require_once __DIR__ . '/../api/config/database.php';
require_once __DIR__ . '/../api/services/RecurringInvoiceService.php';

try {
    // Initialize service
    $recurringInvoiceService = new RecurringInvoiceService();

    echo "✓ RecurringInvoiceService initialized\n";
    echo "✓ Database connection established\n";
    echo "\n";

    // Generate due invoices
    echo "Scanning for due recurring invoices...\n";
    $report = $recurringInvoiceService->generateDueInvoices();

    echo "\n";
    echo "=====================================\n";
    echo "Generation Report\n";
    echo "=====================================\n";
    echo "Total due: {$report['total_due']}\n";
    echo "Generated: {$report['generated']}\n";
    echo "Failed: {$report['failed']}\n";

    // Display errors if any
    if (!empty($report['errors'])) {
        echo "\n";
        echo "Errors encountered:\n";
        echo "-----------------------------------\n";

        foreach ($report['errors'] as $error) {
            echo "Recurring ID: {$error['recurring_id']}\n";
            echo "Customer: {$error['customer']}\n";
            echo "Error: {$error['error']}\n";
            echo "-----------------------------------\n";
        }
    }

    // Calculate execution time
    $endTime = microtime(true);
    $executionTime = round($endTime - $startTime, 2);

    echo "\n";
    echo "✓ Execution completed successfully\n";
    echo "Execution time: {$executionTime} seconds\n";
    echo "Completed at: " . date('Y-m-d H:i:s') . "\n";
    echo "\n";

    // Exit with success code
    exit(0);

} catch (Exception $e) {
    // Log error
    echo "\n";
    echo "=====================================\n";
    echo "❌ ERROR\n";
    echo "=====================================\n";
    echo "Message: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
    echo "Trace:\n" . $e->getTraceAsString() . "\n";
    echo "\n";

    // Calculate execution time
    $endTime = microtime(true);
    $executionTime = round($endTime - $startTime, 2);
    echo "Failed after {$executionTime} seconds\n";
    echo "\n";

    // Exit with error code
    exit(1);
}
