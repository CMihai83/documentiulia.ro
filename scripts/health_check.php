#!/usr/bin/env php
<?php
/**
 * Documentiulia System Health Check
 * Comprehensive health monitoring for all platform components
 */

echo "╔════════════════════════════════════════════════════════════╗\n";
echo "║     DOCUMENTIULIA - SYSTEM HEALTH CHECK                   ║\n";
echo "╚════════════════════════════════════════════════════════════╝\n\n";

$healthStatus = [
    'healthy' => 0,
    'warning' => 0,
    'critical' => 0
];

// Color codes
$GREEN = "\033[0;32m";
$YELLOW = "\033[1;33m";
$RED = "\033[0;31m";
$BLUE = "\033[0;34m";
$NC = "\033[0m"; // No Color

function printStatus($status, $message) {
    global $GREEN, $YELLOW, $RED, $NC, $healthStatus;

    if ($status === 'ok') {
        echo "{$GREEN}✓{$NC} $message\n";
        $healthStatus['healthy']++;
    } elseif ($status === 'warning') {
        echo "{$YELLOW}⚠{$NC} $message\n";
        $healthStatus['warning']++;
    } else {
        echo "{$RED}✗{$NC} $message\n";
        $healthStatus['critical']++;
    }
}

function printSection($title) {
    global $BLUE, $NC;
    echo "\n{$BLUE}═══ $title ═══{$NC}\n";
}

// 1. PHP Environment Check
printSection("PHP Environment");

$phpVersion = PHP_VERSION;
if (version_compare($phpVersion, '8.0.0', '>=')) {
    printStatus('ok', "PHP Version: $phpVersion");
} else {
    printStatus('critical', "PHP Version: $phpVersion (8.0+ required)");
}

// Check required extensions
$requiredExtensions = ['pgsql', 'pdo_pgsql', 'mbstring', 'curl', 'gd', 'xml', 'zip'];
foreach ($requiredExtensions as $ext) {
    if (extension_loaded($ext)) {
        printStatus('ok', "Extension $ext loaded");
    } else {
        printStatus('critical', "Extension $ext missing");
    }
}

// 2. Composer Dependencies
printSection("Composer Dependencies");

if (file_exists(__DIR__ . '/../vendor/autoload.php')) {
    printStatus('ok', "Composer autoloader found");

    require_once __DIR__ . '/../vendor/autoload.php';

    // Check for key packages
    $packages = [
        'Stripe\\Stripe' => 'Stripe PHP SDK',
        'Mpdf\\Mpdf' => 'mPDF Library',
        'SendGrid' => 'SendGrid SDK'
    ];

    foreach ($packages as $class => $name) {
        if (class_exists($class)) {
            printStatus('ok', "$name installed");
        } else {
            printStatus('warning', "$name not found");
        }
    }
} else {
    printStatus('critical', "Composer dependencies not installed (run: composer install)");
}

// 3. Environment Configuration
printSection("Environment Configuration");

if (file_exists(__DIR__ . '/../.env')) {
    printStatus('ok', ".env file exists");

    require_once __DIR__ . '/../api/config/env.php';

    // Check critical environment variables
    $envVars = [
        'DB_HOST' => 'Database host',
        'DB_DATABASE' => 'Database name',
        'DB_USERNAME' => 'Database username',
        'STRIPE_SECRET_KEY' => 'Stripe secret key',
        'SENDGRID_API_KEY' => 'SendGrid API key'
    ];

    foreach ($envVars as $var => $description) {
        $value = Env::get($var);
        if ($value && strpos($value, 'REPLACE') === false) {
            if (in_array($var, ['STRIPE_SECRET_KEY', 'SENDGRID_API_KEY'])) {
                printStatus('ok', "$description configured");
            } else {
                printStatus('ok', "$description: $value");
            }
        } else {
            if (in_array($var, ['STRIPE_SECRET_KEY', 'SENDGRID_API_KEY'])) {
                printStatus('warning', "$description not configured (payments/emails disabled)");
            } else {
                printStatus('critical', "$description missing");
            }
        }
    }

    // Check feature flags
    $emailEnabled = Env::getBool('ENABLE_EMAIL_SENDING', false);
    $pdfEnabled = Env::getBool('ENABLE_PDF_GENERATION', true);

    printStatus($emailEnabled ? 'ok' : 'warning',
        "Email sending: " . ($emailEnabled ? 'Enabled' : 'Disabled'));
    printStatus($pdfEnabled ? 'ok' : 'warning',
        "PDF generation: " . ($pdfEnabled ? 'Enabled' : 'Disabled'));

} else {
    printStatus('critical', ".env file missing");
}

// 4. Database Connectivity
printSection("Database Connection");

try {
    require_once __DIR__ . '/../api/config/database.php';
    $db = Database::getInstance();

    printStatus('ok', "Database connection established");

    // Count tables
    $tableCount = $db->fetchOne("
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = 'public'
    ")['count'];

    printStatus('ok', "Database tables: $tableCount");

    // Check critical tables
    $criticalTables = [
        'decision_trees' => 'Decision Trees',
        'decision_nodes' => 'Decision Nodes',
        'decision_paths' => 'Decision Paths',
        'users' => 'Users',
        'companies' => 'Companies',
        'invoices' => 'Invoices',
        'payment_intents' => 'Payment Intents',
        'subscription_plans' => 'Subscription Plans'
    ];

    foreach ($criticalTables as $table => $name) {
        $exists = $db->fetchOne("
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = '$table'
            ) as exists
        ")['exists'];

        if ($exists === 't' || $exists === true) {
            $count = $db->fetchOne("SELECT COUNT(*) as count FROM $table")['count'];
            printStatus('ok', "$name table: $count records");
        } else {
            printStatus('critical', "$name table missing");
        }
    }

} catch (Exception $e) {
    printStatus('critical', "Database connection failed: " . $e->getMessage());
}

// 5. Decision Tree System
printSection("Decision Tree System");

try {
    $treeCount = $db->fetchOne("
        SELECT COUNT(*) as count
        FROM decision_trees
        WHERE is_active = true
    ")['count'];

    if ($treeCount >= 30) {
        printStatus('ok', "Active decision trees: $treeCount");
    } elseif ($treeCount > 0) {
        printStatus('warning', "Active decision trees: $treeCount (expected 30)");
    } else {
        printStatus('critical', "No active decision trees found");
    }

    // Check tree categories
    $categories = $db->fetchAll("
        SELECT category, COUNT(*) as count
        FROM decision_trees
        WHERE is_active = true
        GROUP BY category
    ");

    foreach ($categories as $cat) {
        printStatus('ok', "Category '{$cat['category']}': {$cat['count']} trees");
    }

    // Check update points
    $updatePoints = $db->fetchOne("
        SELECT COUNT(*) as count
        FROM decision_tree_update_points
    ")['count'];

    printStatus('ok', "Update points configured: $updatePoints");

} catch (Exception $e) {
    printStatus('warning', "Decision tree check failed: " . $e->getMessage());
}

// 6. Payment Infrastructure
printSection("Payment Infrastructure");

try {
    // Check subscription plans
    $plans = $db->fetchAll("
        SELECT plan_key, plan_name, price_monthly
        FROM subscription_plans
        WHERE is_active = true
    ");

    if (count($plans) >= 4) {
        printStatus('ok', "Subscription plans: " . count($plans));
        foreach ($plans as $plan) {
            echo "   → {$plan['plan_name']}: €{$plan['price_monthly']}/month\n";
        }
    } else {
        printStatus('warning', "Subscription plans: " . count($plans) . " (expected 4)");
    }

    // Check payment intents
    $paymentCount = $db->fetchOne("SELECT COUNT(*) as count FROM payment_intents")['count'];
    printStatus('ok', "Payment records: $paymentCount");

} catch (Exception $e) {
    printStatus('warning', "Payment infrastructure check failed: " . $e->getMessage());
}

// 7. Storage Directories
printSection("Storage & Permissions");

$directories = [
    __DIR__ . '/../storage/invoices' => 'Invoice storage',
    __DIR__ . '/../storage/logs' => 'Log storage',
    __DIR__ . '/../storage/temp' => 'Temporary storage',
    __DIR__ . '/../vendor' => 'Vendor directory'
];

foreach ($directories as $dir => $name) {
    if (is_dir($dir)) {
        if (is_writable($dir)) {
            printStatus('ok', "$name: writable");
        } else {
            printStatus('warning', "$name: not writable");
        }
    } else {
        printStatus('warning', "$name: not found");
    }
}

// 8. Service Tests
printSection("Service Functionality");

// Test PDF generation
if (file_exists(__DIR__ . '/test_pdf_generation.php')) {
    exec('php ' . __DIR__ . '/test_pdf_generation.php 2>&1', $output, $returnCode);
    if ($returnCode === 0) {
        printStatus('ok', "PDF generation test passed");
    } else {
        printStatus('warning', "PDF generation test failed");
    }
} else {
    printStatus('warning', "PDF test script not found");
}

// Test email service
if (file_exists(__DIR__ . '/test_email_service.php')) {
    exec('php ' . __DIR__ . '/test_email_service.php 2>&1', $output, $returnCode);
    if ($returnCode === 0) {
        printStatus('ok', "Email service test passed");
    } else {
        printStatus('warning', "Email service test failed");
    }
} else {
    printStatus('warning', "Email test script not found");
}

// 9. Cron Jobs
printSection("Scheduled Tasks");

exec('crontab -l 2>/dev/null', $cronJobs);
$cronConfigured = false;

foreach ($cronJobs as $job) {
    if (strpos($job, 'generate_recurring_invoices.php') !== false) {
        printStatus('ok', "Recurring invoices cron configured");
        $cronConfigured = true;
    }
    if (strpos($job, 'send_payment_reminders.php') !== false) {
        printStatus('ok', "Payment reminders cron configured");
        $cronConfigured = true;
    }
}

if (!$cronConfigured) {
    printStatus('warning', "Cron jobs not configured (run: crontab -e)");
}

// 10. Summary
printSection("Health Summary");

$totalChecks = $healthStatus['healthy'] + $healthStatus['warning'] + $healthStatus['critical'];
$healthPercentage = $totalChecks > 0 ? round(($healthStatus['healthy'] / $totalChecks) * 100) : 0;

echo "\n";
echo "Total Checks: $totalChecks\n";
echo "{$GREEN}✓ Healthy: {$healthStatus['healthy']}{$NC}\n";
echo "{$YELLOW}⚠ Warnings: {$healthStatus['warning']}{$NC}\n";
echo "{$RED}✗ Critical: {$healthStatus['critical']}{$NC}\n";
echo "\n";

if ($healthStatus['critical'] > 0) {
    echo "{$RED}SYSTEM STATUS: CRITICAL{$NC}\n";
    echo "Action required: Fix critical issues before production deployment\n";
    exit(1);
} elseif ($healthStatus['warning'] > 5) {
    echo "{$YELLOW}SYSTEM STATUS: NEEDS ATTENTION{$NC}\n";
    echo "Health Score: {$healthPercentage}%\n";
    echo "Recommendation: Address warnings before production use\n";
    exit(0);
} else {
    echo "{$GREEN}SYSTEM STATUS: HEALTHY{$NC}\n";
    echo "Health Score: {$healthPercentage}%\n";
    echo "Platform is production-ready!\n";
    exit(0);
}
