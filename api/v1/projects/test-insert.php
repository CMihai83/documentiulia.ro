<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    $authHeader = getHeader('authorization', '') ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Auth required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    $db = Database::getInstance();

    error_log("About to execute INSERT...");

    $result = $db->fetchOne(
        "INSERT INTO projects (company_id, name, status) VALUES ($1, $2, $3) RETURNING id",
        ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Test Insert', 'planning']
    );

    error_log("INSERT completed, got: " . print_r($result, true));

    echo json_encode(['success' => true, 'id' => $result['id']]);

} catch (Exception $e) {
    error_log("ERROR: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
