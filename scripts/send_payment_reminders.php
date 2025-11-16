#!/usr/bin/env php
<?php
/**
 * Send Payment Reminders Cron Job
 * Run daily to send automated payment reminders
 *
 * Add to crontab:
 * 0 9 * * * /usr/bin/php /var/www/documentiulia.ro/scripts/send_payment_reminders.php
 */

require_once __DIR__ . '/../api/config/database.php';
require_once __DIR__ . '/../api/services/EmailService.php';

echo "[" . date('Y-m-d H:i:s') . "] Starting payment reminders\n";

try {
    $db = Database::getInstance();
    $emailService = new EmailService();

    $today = date('Y-m-d');
    $threeDaysBefore = date('Y-m-d', strtotime('+3 days'));
    $sevenDaysAgo = date('Y-m-d', strtotime('-7 days'));
    $fourteenDaysAgo = date('Y-m-d', strtotime('-14 days'));
    $thirtyDaysAgo = date('Y-m-d', strtotime('-30 days'));

    // Define reminder rules
    $reminderRules = [
        [
            'type' => 'before_due',
            'condition' => "i.due_date = :date AND i.status = 'unpaid'",
            'date' => $threeDaysBefore,
            'description' => '3 days before due date'
        ],
        [
            'type' => 'on_due',
            'condition' => "i.due_date = :date AND i.status = 'unpaid'",
            'date' => $today,
            'description' => 'On due date'
        ],
        [
            'type' => 'overdue_7',
            'condition' => "i.due_date = :date AND i.status = 'unpaid'",
            'date' => $sevenDaysAgo,
            'description' => '7 days overdue'
        ],
        [
            'type' => 'overdue_14',
            'condition' => "i.due_date = :date AND i.status = 'unpaid'",
            'date' => $fourteenDaysAgo,
            'description' => '14 days overdue'
        ],
        [
            'type' => 'overdue_30',
            'condition' => "i.due_date = :date AND i.status = 'unpaid'",
            'date' => $thirtyDaysAgo,
            'description' => '30 days overdue'
        ]
    ];

    $totalReminders = 0;

    foreach ($reminderRules as $rule) {
        echo "\nChecking: {$rule['description']}\n";

        // Get invoices matching this reminder rule
        $invoices = $db->fetchAll("
            SELECT i.*,
                   c.display_name as customer_name,
                   c.email as customer_email,
                   co.name as company_name
            FROM invoices i
            JOIN contacts c ON i.customer_id = c.id
            JOIN companies co ON i.company_id = co.id
            WHERE {$rule['condition']}
              AND i.amount_due > 0
              AND NOT EXISTS (
                  SELECT 1 FROM payment_reminders pr
                  WHERE pr.invoice_id = i.id
                    AND pr.reminder_type = :type
                    AND pr.status = 'sent'
              )
        ", ['date' => $rule['date'], 'type' => $rule['type']]);

        echo "  Found " . count($invoices) . " invoices\n";

        foreach ($invoices as $invoice) {
            try {
                echo "  Processing invoice: {$invoice['invoice_number']}\n";

                // Send reminder email
                $result = $emailService->sendPaymentReminderEmail($invoice, $rule['type']);

                // Create reminder record
                $db->insert('payment_reminders', [
                    'invoice_id' => $invoice['id'],
                    'reminder_type' => $rule['type'],
                    'scheduled_date' => $today,
                    'sent_date' => date('Y-m-d H:i:s'),
                    'status' => $result['success'] ? 'sent' : 'failed',
                    'email_to' => $invoice['customer_email'],
                    'created_at' => date('Y-m-d H:i:s')
                ]);

                echo "    ✓ Reminder sent to {$invoice['customer_email']}\n";
                $totalReminders++;

            } catch (Exception $e) {
                echo "    ✗ Error: " . $e->getMessage() . "\n";
                continue;
            }
        }
    }

    echo "\n[" . date('Y-m-d H:i:s') . "] Payment reminders completed\n";
    echo "Total reminders sent: {$totalReminders}\n";

} catch (Exception $e) {
    echo "FATAL ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
