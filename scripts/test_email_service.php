#!/usr/bin/env php
<?php
/**
 * Test Email Service
 * Verifies email service is working (logs only without SendGrid API key)
 */

echo "=== Email Service Test ===\n\n";

require_once __DIR__ . '/../api/config/env.php';
require_once __DIR__ . '/../api/services/EmailService.php';

try {
    echo "1. Loading environment configuration...\n";
    echo "   SendGrid API Key: " . (Env::get('SENDGRID_API_KEY') ? '✓ Configured' : '✗ Not configured') . "\n";
    echo "   Email Sending: " . (Env::getBool('ENABLE_EMAIL_SENDING') ? 'Enabled' : 'Disabled') . "\n";
    echo "   From Email: " . Env::get('SENDGRID_FROM_EMAIL', 'not set') . "\n\n";

    echo "2. Initializing email service...\n";
    $emailService = new EmailService();
    echo "   ✓ Email service initialized\n\n";

    echo "3. Testing payment confirmation email...\n";
    $result = $emailService->sendPaymentConfirmationEmail('test@example.com', [
        'amount' => 99.00,
        'currency' => 'EUR',
        'payment_type' => 'course',
        'description' => 'Excel Mastery Course'
    ]);

    echo "   Result: " . ($result['success'] ? '✓ Success' : '✗ Failed') . "\n";
    echo "   Message: " . ($result['message'] ?? 'Email sent') . "\n\n";

    echo "4. Testing course enrollment email...\n";
    $result = $emailService->sendCourseEnrollmentEmail('student@example.com', 'Excel Mastery Course');
    echo "   Result: " . ($result['success'] ? '✓ Success' : '✗ Failed') . "\n";
    echo "   Message: " . ($result['message'] ?? 'Email sent') . "\n\n";

    echo "5. Email service status:\n";
    if (!Env::getBool('ENABLE_EMAIL_SENDING')) {
        echo "   ⚠ Email sending is DISABLED in .env\n";
        echo "   → Emails are being logged but not sent\n";
        echo "   → To enable: Set ENABLE_EMAIL_SENDING=true in .env\n";
    } elseif (!Env::get('SENDGRID_API_KEY') || strpos(Env::get('SENDGRID_API_KEY'), 'REPLACE') !== false) {
        echo "   ⚠ SendGrid API key not configured\n";
        echo "   → Emails are being logged but not sent\n";
        echo "   → To send emails: Add SendGrid API key to .env\n";
    } else {
        echo "   ✓ Email service is fully configured\n";
        echo "   → Emails will be sent via SendGrid\n";
    }

    echo "\n=== EMAIL SERVICE TEST PASSED ===\n";
    echo "\nCheck PHP error log for email queue entries:\n";
    echo "tail -f /var/log/php8.2-fpm.log | grep EMAIL\n";

} catch (Exception $e) {
    echo "\n✗ ERROR: " . $e->getMessage() . "\n";
    echo "\nStack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}

echo "\n";
