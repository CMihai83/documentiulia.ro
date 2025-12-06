<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/services/ProjectService.php';

try {
    echo "Testing project update...\n\n";

    $projectService = new ProjectService();
    $companyId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    $projectId = '5984709d-b160-4f5f-a03c-d67c5062f47e';

    $data = [
        'name' => 'Test Update ' . date('H:i:s'),
        'status' => 'in_progress'
    ];

    echo "Updating project $projectId\n";
    echo "Data: " . json_encode($data) . "\n\n";

    $projectService->updateProject($projectId, $companyId, $data);

    echo "✅ Update successful!\n";

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Trace:\n" . $e->getTraceAsString() . "\n";
}
