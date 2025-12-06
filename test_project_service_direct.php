<?php
/**
 * Direct test of ProjectService to isolate the 502 error
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

echo "Starting ProjectService test...\n";

require_once __DIR__ . '/api/services/ProjectService.php';

try {
    echo "1. Creating ProjectService instance...\n";
    $projectService = new ProjectService();
    echo "✅ ProjectService created\n";

    $companyId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    $userId = '11111111-1111-1111-1111-111111111111';

    echo "\n2. Testing createProject with minimal data...\n";
    $projectData = [
        'name' => 'PHP Test Project - Minimal'
    ];

    $projectId = $projectService->createProject($companyId, $projectData, $userId);
    echo "✅ Project created with ID: $projectId\n";

    echo "\n3. Testing createProject with full data...\n";
    $fullProjectData = [
        'name' => 'PHP Test Project - Full',
        'description' => 'Complete test with all fields',
        'status' => 'active',
        'start_date' => '2025-11-23',
        'end_date' => '2025-12-31',
        'budget' => 25000,
        'methodology' => 'agile',
        'priority' => 'high'
    ];

    $fullProjectId = $projectService->createProject($companyId, $fullProjectData, $userId);
    echo "✅ Full project created with ID: $fullProjectId\n";

    echo "\n4. Testing getProject...\n";
    $project = $projectService->getProject($fullProjectId, $companyId);
    echo "✅ Project retrieved: {$project['name']}\n";

    echo "\n✅ ALL TESTS PASSED\n";

} catch (Exception $e) {
    echo "❌ ERROR: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
