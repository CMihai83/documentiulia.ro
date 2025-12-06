#!/usr/bin/env php
<?php
/**
 * Send Reminder Emails Cron Job
 * Sends payment reminders, deadline notifications, etc.
 */

require_once __DIR__ . '/../api/config/Database.php';
require_once __DIR__ . '/../api/services/EmailService.php';

echo "[" . date('Y-m-d H:i:s') . "] Starting reminder emails...\n";

try {
    $db = Database::getInstance()->getConnection();
    $emailService = new EmailService();

    // 1. Invoice payment reminders (due in 3 days)
    $stmt = $db->query("
        SELECT i.*, c.email as customer_email, c.first_name as customer_name,
               u.email as user_email, comp.name as company_name
        FROM invoices i
        JOIN contacts c ON i.customer_id = c.id
        JOIN users u ON i.created_by = u.id
        JOIN companies comp ON i.company_id = comp.id
        WHERE i.status = 'sent'
        AND i.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'
        AND i.reminder_sent_at IS NULL
    ");

    $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Found " . count($invoices) . " invoices needing reminders\n";

    foreach ($invoices as $invoice) {
        try {
            $emailService->sendPaymentReminder(
                $invoice['customer_email'],
                $invoice['customer_name'],
                $invoice['invoice_number'],
                $invoice['total_amount'],
                $invoice['due_date'],
                $invoice['company_name']
            );

            // Mark reminder sent
            $updateStmt = $db->prepare("UPDATE invoices SET reminder_sent_at = NOW() WHERE id = :id");
            $updateStmt->execute([':id' => $invoice['id']]);

            echo "  Sent reminder for invoice {$invoice['invoice_number']}\n";
        } catch (Exception $e) {
            echo "  ERROR sending reminder for {$invoice['invoice_number']}: " . $e->getMessage() . "\n";
        }
    }

    // 2. Subscription expiry warnings (expiring in 7 days)
    $stmt = $db->query("
        SELECT s.*, u.email, u.first_name
        FROM user_subscriptions s
        JOIN users u ON s.user_id = u.id
        WHERE s.status = 'active'
        AND s.expires_at BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
        AND s.expiry_warning_sent_at IS NULL
    ");

    $subscriptions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Found " . count($subscriptions) . " subscriptions expiring soon\n";

    foreach ($subscriptions as $sub) {
        try {
            $emailService->sendSubscriptionExpiryWarning(
                $sub['email'],
                $sub['first_name'],
                $sub['plan_name'],
                $sub['expires_at']
            );

            $updateStmt = $db->prepare("UPDATE user_subscriptions SET expiry_warning_sent_at = NOW() WHERE id = :id");
            $updateStmt->execute([':id' => $sub['id']]);

            echo "  Sent subscription warning to {$sub['email']}\n";
        } catch (Exception $e) {
            echo "  ERROR: " . $e->getMessage() . "\n";
        }
    }

    // 3. Task deadline reminders (due today)
    $stmt = $db->query("
        SELECT t.*, u.email, u.first_name, p.name as project_name
        FROM tasks t
        JOIN users u ON t.assignee_id = u.id
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE t.status NOT IN ('done', 'cancelled')
        AND t.due_date = CURRENT_DATE
        AND t.deadline_reminder_sent = false
    ");

    $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Found " . count($tasks) . " tasks due today\n";

    foreach ($tasks as $task) {
        try {
            $emailService->sendTaskDeadlineReminder(
                $task['email'],
                $task['first_name'],
                $task['title'],
                $task['project_name'],
                $task['due_date']
            );

            $updateStmt = $db->prepare("UPDATE tasks SET deadline_reminder_sent = true WHERE id = :id");
            $updateStmt->execute([':id' => $task['id']]);

            echo "  Sent task reminder for '{$task['title']}'\n";
        } catch (Exception $e) {
            echo "  ERROR: " . $e->getMessage() . "\n";
        }
    }

    echo "[" . date('Y-m-d H:i:s') . "] Reminders completed\n";

} catch (Exception $e) {
    echo "FATAL ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
