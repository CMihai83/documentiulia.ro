<?php
header('Content-Type: application/json');

try {
    require_once __DIR__ . '/../../config/database.php';

    $db = Database::getInstance();

    $result = $db->fetchOne(
        "INSERT INTO projects (
            company_id, name, status
        ) VALUES ($1, $2, $3)
        RETURNING id",
        [
            'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            'Minimal Test',
            'planning'
        ]
    );

    echo json_encode([
        'success' => true,
        'project_id' => $result['id']
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
