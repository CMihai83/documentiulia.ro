<?php
/**
 * Reset Test User Passwords
 * This script resets all test user passwords to: TestPass123!
 */

require_once __DIR__ . '/api/config/database.php';

$db = Database::getInstance();
$password = 'TestPass123!';
$hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

echo "Resetting test user passwords...\n";
echo "Password: $password\n";
echo "Hash: $hash\n\n";

$testUsers = [
    'test_admin@accountech.com',
    'test_manager@accountech.com',
    'test_user@accountech.com'
];

foreach ($testUsers as $email) {
    $result = $db->query(
        "UPDATE users SET password_hash = $1 WHERE email = $2",
        [$hash, $email]
    );

    echo "✓ Updated: $email\n";
}

echo "\n=== Testing Logins ===\n";

foreach ($testUsers as $email) {
    $user = $db->fetchOne(
        "SELECT email, password_hash FROM users WHERE email = $1",
        [$email]
    );

    if ($user && password_verify($password, $user['password_hash'])) {
        echo "✓ Login works: $email\n";
    } else {
        echo "✗ Login FAILED: $email\n";
    }
}

echo "\n=== Test Credentials ===\n";
echo "Email: test_admin@accountech.com\n";
echo "Password: TestPass123!\n";
echo "\nYou can now login at: https://documentiulia.ro/test_api.html\n";
