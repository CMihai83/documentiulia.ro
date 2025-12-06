<?php
/**
 * Test Email Service
 * This script tests email templating without actually sending emails
 */

require_once __DIR__ . '/includes/EmailService.php';

// Connect to database
try {
    $pdo = new PDO(
        "pgsql:host=127.0.0.1;dbname=accountech_production",
        "accountech_app",
        "AccTech2025Prod@Secure"
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Database connection failed: " . $e->getMessage());
}

$emailService = new EmailService($pdo);

// Test data for beta application confirmation
$test_data = [
    'contact_name' => 'Maria Popescu',
    'company_name' => 'Test Retail SRL',
    'application_score' => 75,
    'status' => 'accepted',
    'status_message' => '✅ ACCEPTAT - Felicitări!',
    'if_accepted' => true,
    'if_pending' => false,
    'if_waitlist' => false
];

echo "=== EMAIL SERVICE TEST ===\n\n";

// Load and render template
$template_path = __DIR__ . '/email-templates/beta-application-confirmation.html';
if (!file_exists($template_path)) {
    die("Template not found: $template_path\n");
}

$template = file_get_contents($template_path);
echo "✓ Template loaded successfully\n";

// Extract subject
if (preg_match('/<!-- SUBJECT: (.*?) -->/', $template, $matches)) {
    $subject = trim($matches[1]);
    echo "✓ Subject extracted: $subject\n";
}

// Test template rendering
$reflection = new ReflectionClass($emailService);
$method = $reflection->getMethod('render_template');
$method->setAccessible(true);
$rendered = $method->invoke($emailService, $template, $test_data);

echo "✓ Template rendered successfully\n";
echo "✓ Rendered HTML length: " . strlen($rendered) . " bytes\n\n";

// Check if conditional blocks were processed
$has_accepted_content = strpos($rendered, '🚀 Următorii pași') !== false;
$has_pending_content = strpos($rendered, '📋 Ce urmează') !== false;
$has_waitlist_content = strpos($rendered, '⏳ Pe lista de așteptare') !== false;

echo "Conditional rendering check:\n";
echo "  - Accepted section shown: " . ($has_accepted_content ? "✓ YES" : "✗ NO") . "\n";
echo "  - Pending section shown: " . ($has_pending_content ? "✗ NO (expected)" : "✗ YES (unexpected)") . "\n";
echo "  - Waitlist section shown: " . ($has_waitlist_content ? "✗ NO (expected)" : "✗ YES (unexpected)") . "\n\n";

// Check variable replacement
$has_company_name = strpos($rendered, 'Test Retail SRL') !== false;
$has_contact_name = strpos($rendered, 'Maria Popescu') !== false;
$has_score = strpos($rendered, '75') !== false;

echo "Variable replacement check:\n";
echo "  - Company name: " . ($has_company_name ? "✓" : "✗") . "\n";
echo "  - Contact name: " . ($has_contact_name ? "✓" : "✗") . "\n";
echo "  - Score displayed: " . ($has_score ? "✓" : "✗") . "\n\n";

// Save rendered email to file for inspection
$output_file = '/tmp/test_email_rendered.html';
file_put_contents($output_file, $rendered);
echo "✓ Rendered email saved to: $output_file\n";
echo "  You can open this in a browser to see how it looks\n\n";

echo "=== EMAIL SERVICE TEST COMPLETE ===\n";
echo "Status: " . ($has_accepted_content && $has_company_name && $has_contact_name ? "✅ PASSED" : "❌ FAILED") . "\n";
