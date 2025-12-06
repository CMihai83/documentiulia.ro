<?php
/**
 * Navigation Items Endpoint
 * GET /api/v1/navigation/items.php
 * Returns personalized navigation based on user's persona and role
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    // Authenticate
    $authHeader = getHeader('authorization', '') ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);
    $userId = $userData['user_id'];

    $companyId = getHeader('x-company-id') ?? '';
    if (empty($companyId)) {
        throw new Exception('Company ID required');
    }

    $db = Database::getInstance();

    // Get user's role for this company
    $userRole = $db->fetchOne(
        "SELECT role FROM company_users WHERE company_id = :company_id AND user_id = :user_id",
        ['company_id' => $companyId, 'user_id' => $userId]
    );
    $role = $userRole['role'] ?? 'user';

    // Get company's persona for customization
    $personaData = $db->fetchOne(
        "SELECT cps.persona_id, bp.id as persona_code
         FROM company_persona_settings cps
         LEFT JOIN business_personas bp ON cps.persona_id = bp.id
         WHERE cps.company_id = :company_id",
        ['company_id' => $companyId]
    );
    $persona = $personaData['persona_code'] ?? 'general';

    // Define navigation structure
    $navigation = [
        'main' => [
            [
                'id' => 'dashboard',
                'label_ro' => 'Panou Principal',
                'label_en' => 'Dashboard',
                'icon' => 'LayoutDashboard',
                'path' => '/dashboard',
                'order' => 1
            ],
            [
                'id' => 'projects',
                'label_ro' => 'Proiecte',
                'label_en' => 'Projects',
                'icon' => 'FolderKanban',
                'path' => '/projects',
                'order' => 2
            ],
            [
                'id' => 'tasks',
                'label_ro' => 'Sarcini',
                'label_en' => 'Tasks',
                'icon' => 'CheckSquare',
                'path' => '/tasks',
                'order' => 3
            ],
            [
                'id' => 'contacts',
                'label_ro' => 'Contacte',
                'label_en' => 'Contacts',
                'icon' => 'Users',
                'path' => '/contacts',
                'order' => 4
            ],
            [
                'id' => 'invoices',
                'label_ro' => 'Facturi',
                'label_en' => 'Invoices',
                'icon' => 'FileText',
                'path' => '/invoices',
                'order' => 5
            ],
            [
                'id' => 'expenses',
                'label_ro' => 'Cheltuieli',
                'label_en' => 'Expenses',
                'icon' => 'Receipt',
                'path' => '/expenses',
                'order' => 6
            ]
        ],
        'secondary' => [
            [
                'id' => 'reports',
                'label_ro' => 'Rapoarte',
                'label_en' => 'Reports',
                'icon' => 'BarChart3',
                'path' => '/reports',
                'order' => 1
            ],
            [
                'id' => 'calendar',
                'label_ro' => 'Calendar',
                'label_en' => 'Calendar',
                'icon' => 'Calendar',
                'path' => '/calendar',
                'order' => 2
            ]
        ],
        'settings' => [
            [
                'id' => 'settings',
                'label_ro' => 'Setări',
                'label_en' => 'Settings',
                'icon' => 'Settings',
                'path' => '/settings',
                'order' => 1
            ],
            [
                'id' => 'company',
                'label_ro' => 'Companie',
                'label_en' => 'Company',
                'icon' => 'Building2',
                'path' => '/settings/company',
                'order' => 2
            ]
        ]
    ];

    // Add admin-only items
    if (in_array($role, ['owner', 'admin'])) {
        $navigation['settings'][] = [
            'id' => 'integrations',
            'label_ro' => 'Integrări',
            'label_en' => 'Integrations',
            'icon' => 'Plug',
            'path' => '/settings/integrations',
            'order' => 3
        ];
        $navigation['settings'][] = [
            'id' => 'team',
            'label_ro' => 'Echipă',
            'label_en' => 'Team',
            'icon' => 'UserPlus',
            'path' => '/settings/team',
            'order' => 4
        ];
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'navigation' => $navigation,
            'user_role' => $role,
            'persona' => $persona
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
