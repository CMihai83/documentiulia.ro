<?php
/**
 * User Onboarding Status Endpoint
 * GET /api/v1/onboarding/status.php
 *
 * Returns the current onboarding progress and next steps for the user
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    $authHeader = getHeader('authorization', '') ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);
    $userId = $userData['user_id'];

    $companyId = getHeader('x-company-id') ?? '';
    if (!$companyId) {
        throw new Exception('Company ID required');
    }

    $db = Database::getInstance()->getConnection();

    // Define onboarding steps
    $steps = [
        [
            'id' => 'profile_complete',
            'title' => 'Completează profilul',
            'description' => 'Adaugă informațiile companiei tale',
            'icon' => 'user',
            'link' => '/settings/company',
            'query' => "SELECT COUNT(*) as count FROM companies WHERE id = :company_id AND name IS NOT NULL AND address_street IS NOT NULL AND tax_id IS NOT NULL"
        ],
        [
            'id' => 'first_contact',
            'title' => 'Adaugă primul client',
            'description' => 'Creează primul contact pentru facturare',
            'icon' => 'users',
            'link' => '/crm/contacts/new',
            'query' => "SELECT COUNT(*) as count FROM contacts WHERE company_id = :company_id"
        ],
        [
            'id' => 'first_invoice',
            'title' => 'Creează prima factură',
            'description' => 'Emite prima ta factură electronică',
            'icon' => 'file-text',
            'link' => '/invoices/new',
            'query' => "SELECT COUNT(*) as count FROM invoices WHERE company_id = :company_id"
        ],
        [
            'id' => 'first_expense',
            'title' => 'Înregistrează o cheltuială',
            'description' => 'Adaugă prima cheltuială pentru evidență',
            'icon' => 'credit-card',
            'link' => '/expenses/new',
            'query' => "SELECT COUNT(*) as count FROM expenses WHERE company_id = :company_id"
        ],
        [
            'id' => 'bank_connected',
            'title' => 'Conectează un cont bancar',
            'description' => 'Sincronizează tranzacțiile automat',
            'icon' => 'building',
            'link' => '/bank/connect',
            'query' => "SELECT COUNT(*) as count FROM bank_connections WHERE company_id = :company_id AND status = 'active'"
        ],
        [
            'id' => 'first_project',
            'title' => 'Creează un proiect',
            'description' => 'Organizează-ți munca în proiecte',
            'icon' => 'folder',
            'link' => '/projects/new',
            'query' => "SELECT COUNT(*) as count FROM projects WHERE company_id = :company_id"
        ],
        [
            'id' => 'team_member',
            'title' => 'Invită un coleg',
            'description' => 'Colaborează cu echipa ta',
            'icon' => 'user-plus',
            'link' => '/settings/team',
            'query' => "SELECT COUNT(*) as count FROM company_users WHERE company_id = :company_id"
        ]
    ];

    // Check completion status for each step
    $completedSteps = 0;
    $onboardingSteps = [];

    foreach ($steps as $step) {
        $stmt = $db->prepare($step['query']);
        $stmt->execute([':company_id' => $companyId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $completed = ($result['count'] ?? 0) > 0;

        if ($completed) {
            $completedSteps++;
        }

        $onboardingSteps[] = [
            'id' => $step['id'],
            'title' => $step['title'],
            'description' => $step['description'],
            'icon' => $step['icon'],
            'link' => $step['link'],
            'completed' => $completed
        ];
    }

    $totalSteps = count($steps);
    $progress = $totalSteps > 0 ? round(($completedSteps / $totalSteps) * 100) : 0;

    // Get next uncompleted step
    $nextStep = null;
    foreach ($onboardingSteps as $step) {
        if (!$step['completed']) {
            $nextStep = $step;
            break;
        }
    }

    // Check if onboarding is complete
    $isComplete = $completedSteps >= $totalSteps;

    // Get achievement badges
    $badges = [];
    if ($completedSteps >= 1) $badges[] = ['id' => 'starter', 'name' => 'Primii pași', 'icon' => 'award'];
    if ($completedSteps >= 3) $badges[] = ['id' => 'progress', 'name' => 'În progres', 'icon' => 'trending-up'];
    if ($completedSteps >= 5) $badges[] = ['id' => 'advanced', 'name' => 'Avansat', 'icon' => 'star'];
    if ($isComplete) $badges[] = ['id' => 'master', 'name' => 'Expert Documentiulia', 'icon' => 'crown'];

    echo json_encode([
        'success' => true,
        'data' => [
            'progress' => $progress,
            'completed_steps' => $completedSteps,
            'total_steps' => $totalSteps,
            'is_complete' => $isComplete,
            'next_step' => $nextStep,
            'steps' => $onboardingSteps,
            'badges' => $badges,
            'tips' => [
                'Poți sări peste pași și reveni oricând',
                'Folosește shortcut-uri: Alt+N pentru factură nouă',
                'Scanează chitanțele cu camera telefonului'
            ]
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
