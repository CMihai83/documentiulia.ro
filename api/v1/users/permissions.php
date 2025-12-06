<?php
/**
 * User Permissions API
 * Manage user roles and permissions
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';

$user = authenticate();
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
if (!$companyId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Company ID required']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// Permission modules
$modules = [
    'dashboard' => [
        'label_ro' => 'Panou de Control',
        'label_en' => 'Dashboard',
        'permissions' => ['view'],
    ],
    'invoices' => [
        'label_ro' => 'Facturi',
        'label_en' => 'Invoices',
        'permissions' => ['view', 'create', 'edit', 'delete', 'send', 'void'],
    ],
    'expenses' => [
        'label_ro' => 'Cheltuieli',
        'label_en' => 'Expenses',
        'permissions' => ['view', 'create', 'edit', 'delete', 'approve'],
    ],
    'contacts' => [
        'label_ro' => 'Contacte',
        'label_en' => 'Contacts',
        'permissions' => ['view', 'create', 'edit', 'delete', 'import', 'export'],
    ],
    'products' => [
        'label_ro' => 'Produse',
        'label_en' => 'Products',
        'permissions' => ['view', 'create', 'edit', 'delete', 'manage_stock'],
    ],
    'projects' => [
        'label_ro' => 'Proiecte',
        'label_en' => 'Projects',
        'permissions' => ['view', 'create', 'edit', 'delete', 'manage_tasks'],
    ],
    'reports' => [
        'label_ro' => 'Rapoarte',
        'label_en' => 'Reports',
        'permissions' => ['view', 'export', 'schedule'],
    ],
    'accounting' => [
        'label_ro' => 'Contabilitate',
        'label_en' => 'Accounting',
        'permissions' => ['view', 'journal_entries', 'close_period', 'view_reports'],
    ],
    'hr' => [
        'label_ro' => 'Resurse Umane',
        'label_en' => 'Human Resources',
        'permissions' => ['view', 'manage_employees', 'payroll', 'time_tracking'],
    ],
    'settings' => [
        'label_ro' => 'Setări',
        'label_en' => 'Settings',
        'permissions' => ['view', 'edit', 'billing', 'integrations'],
    ],
    'users' => [
        'label_ro' => 'Utilizatori',
        'label_en' => 'Users',
        'permissions' => ['view', 'invite', 'edit', 'remove', 'manage_roles'],
    ],
];

// Permission labels
$permissionLabels = [
    'view' => ['ro' => 'Vizualizare', 'en' => 'View'],
    'create' => ['ro' => 'Creare', 'en' => 'Create'],
    'edit' => ['ro' => 'Editare', 'en' => 'Edit'],
    'delete' => ['ro' => 'Ștergere', 'en' => 'Delete'],
    'send' => ['ro' => 'Trimitere', 'en' => 'Send'],
    'void' => ['ro' => 'Anulare', 'en' => 'Void'],
    'approve' => ['ro' => 'Aprobare', 'en' => 'Approve'],
    'import' => ['ro' => 'Import', 'en' => 'Import'],
    'export' => ['ro' => 'Export', 'en' => 'Export'],
    'manage_stock' => ['ro' => 'Gestionare Stoc', 'en' => 'Manage Stock'],
    'manage_tasks' => ['ro' => 'Gestionare Sarcini', 'en' => 'Manage Tasks'],
    'schedule' => ['ro' => 'Programare', 'en' => 'Schedule'],
    'journal_entries' => ['ro' => 'Note Contabile', 'en' => 'Journal Entries'],
    'close_period' => ['ro' => 'Închidere Perioadă', 'en' => 'Close Period'],
    'view_reports' => ['ro' => 'Vizualizare Rapoarte', 'en' => 'View Reports'],
    'manage_employees' => ['ro' => 'Gestionare Angajați', 'en' => 'Manage Employees'],
    'payroll' => ['ro' => 'Salarizare', 'en' => 'Payroll'],
    'time_tracking' => ['ro' => 'Pontaj', 'en' => 'Time Tracking'],
    'billing' => ['ro' => 'Facturare', 'en' => 'Billing'],
    'integrations' => ['ro' => 'Integrări', 'en' => 'Integrations'],
    'invite' => ['ro' => 'Invitare', 'en' => 'Invite'],
    'remove' => ['ro' => 'Eliminare', 'en' => 'Remove'],
    'manage_roles' => ['ro' => 'Gestionare Roluri', 'en' => 'Manage Roles'],
];

// Default role permissions
$roleDefaults = [
    'admin' => '*', // All permissions
    'manager' => [
        'dashboard' => ['view'],
        'invoices' => ['view', 'create', 'edit', 'send'],
        'expenses' => ['view', 'create', 'edit', 'approve'],
        'contacts' => ['view', 'create', 'edit', 'import', 'export'],
        'products' => ['view', 'create', 'edit', 'manage_stock'],
        'projects' => ['view', 'create', 'edit', 'manage_tasks'],
        'reports' => ['view', 'export'],
        'hr' => ['view', 'time_tracking'],
        'users' => ['view'],
    ],
    'accountant' => [
        'dashboard' => ['view'],
        'invoices' => ['view', 'create', 'edit', 'send', 'void'],
        'expenses' => ['view', 'create', 'edit', 'approve'],
        'contacts' => ['view', 'create', 'edit'],
        'products' => ['view'],
        'reports' => ['view', 'export', 'schedule'],
        'accounting' => ['view', 'journal_entries', 'close_period', 'view_reports'],
    ],
    'sales' => [
        'dashboard' => ['view'],
        'invoices' => ['view', 'create', 'edit', 'send'],
        'contacts' => ['view', 'create', 'edit'],
        'products' => ['view'],
        'reports' => ['view'],
    ],
    'employee' => [
        'dashboard' => ['view'],
        'projects' => ['view'],
        'hr' => ['time_tracking'],
    ],
    'viewer' => [
        'dashboard' => ['view'],
        'invoices' => ['view'],
        'expenses' => ['view'],
        'contacts' => ['view'],
        'products' => ['view'],
        'reports' => ['view'],
    ],
];

try {
    $db = getDbConnection();

    if ($method === 'GET') {
        $userId = $_GET['user_id'] ?? null;

        if ($userId) {
            // Get user's permissions
            $stmt = $db->prepare("
                SELECT cu.role, cu.custom_permissions
                FROM company_users cu
                WHERE cu.company_id = :company_id AND cu.user_id = :user_id
            ");
            $stmt->execute(['company_id' => $companyId, 'user_id' => $userId]);
            $userData = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$userData) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'User not found']);
                exit;
            }

            // Get effective permissions
            $role = $userData['role'];
            $customPermissions = json_decode($userData['custom_permissions'] ?? '{}', true);
            $effectivePermissions = getEffectivePermissions($role, $customPermissions, $roleDefaults, $modules);

            echo json_encode([
                'success' => true,
                'data' => [
                    'user_id' => $userId,
                    'role' => $role,
                    'custom_permissions' => $customPermissions,
                    'effective_permissions' => $effectivePermissions,
                ],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        } else {
            // Get all available permissions and role defaults
            echo json_encode([
                'success' => true,
                'data' => [
                    'modules' => $modules,
                    'permission_labels' => $permissionLabels,
                    'role_defaults' => $roleDefaults,
                ],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        }

    } elseif ($method === 'PUT') {
        // Update user permissions
        if ($user['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error_ro' => 'Doar administratorii pot modifica permisiunile',
                'error' => 'Only administrators can modify permissions'
            ]);
            exit;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $userId = $input['user_id'] ?? null;

        if (!$userId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'user_id required']);
            exit;
        }

        // Verify user is in company
        $stmt = $db->prepare("SELECT id FROM company_users WHERE company_id = :company_id AND user_id = :user_id");
        $stmt->execute(['company_id' => $companyId, 'user_id' => $userId]);
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'User not found in company']);
            exit;
        }

        $updates = [];
        $params = ['company_id' => $companyId, 'user_id' => $userId];

        if (isset($input['role'])) {
            $updates[] = "role = :role";
            $params['role'] = $input['role'];
        }

        if (isset($input['custom_permissions'])) {
            $updates[] = "custom_permissions = :custom_permissions";
            $params['custom_permissions'] = json_encode($input['custom_permissions']);
        }

        if (!empty($updates)) {
            $updates[] = "updated_at = NOW()";
            $sql = "UPDATE company_users SET " . implode(', ', $updates) . " WHERE company_id = :company_id AND user_id = :user_id";
            $db->prepare($sql)->execute($params);
        }

        echo json_encode([
            'success' => true,
            'message_ro' => 'Permisiuni actualizate',
            'message_en' => 'Permissions updated',
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}

function getEffectivePermissions($role, $customPermissions, $roleDefaults, $modules) {
    $effective = [];

    // Start with role defaults
    $defaults = $roleDefaults[$role] ?? [];

    if ($defaults === '*') {
        // Admin - all permissions
        foreach ($modules as $module => $config) {
            $effective[$module] = $config['permissions'];
        }
    } else {
        // Apply role defaults
        foreach ($modules as $module => $config) {
            $effective[$module] = $defaults[$module] ?? [];
        }
    }

    // Apply custom overrides
    foreach ($customPermissions as $module => $perms) {
        if (isset($modules[$module])) {
            $effective[$module] = $perms;
        }
    }

    return $effective;
}
