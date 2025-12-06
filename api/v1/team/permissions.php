<?php
/**
 * Permissions API
 * Manage user permissions and access control
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, PUT, OPTIONS');
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

// Admin-only for permission management
if (!in_array($user['role'], ['admin', 'owner'])) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'error_ro' => 'Doar administratorii pot gestiona permisiunile',
        'error' => 'Only administrators can manage permissions'
    ]);
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
$permissionModules = [
    'invoicing' => [
        'label_ro' => 'Facturare',
        'label_en' => 'Invoicing',
        'permissions' => [
            'invoices.view' => ['ro' => 'Vizualizare facturi', 'en' => 'View Invoices'],
            'invoices.create' => ['ro' => 'Creare facturi', 'en' => 'Create Invoices'],
            'invoices.edit' => ['ro' => 'Editare facturi', 'en' => 'Edit Invoices'],
            'invoices.delete' => ['ro' => 'Ștergere facturi', 'en' => 'Delete Invoices'],
            'invoices.send' => ['ro' => 'Trimitere facturi', 'en' => 'Send Invoices'],
            'invoices.export' => ['ro' => 'Export facturi', 'en' => 'Export Invoices'],
        ],
    ],
    'expenses' => [
        'label_ro' => 'Cheltuieli',
        'label_en' => 'Expenses',
        'permissions' => [
            'expenses.view' => ['ro' => 'Vizualizare cheltuieli', 'en' => 'View Expenses'],
            'expenses.create' => ['ro' => 'Creare cheltuieli', 'en' => 'Create Expenses'],
            'expenses.edit' => ['ro' => 'Editare cheltuieli', 'en' => 'Edit Expenses'],
            'expenses.delete' => ['ro' => 'Ștergere cheltuieli', 'en' => 'Delete Expenses'],
            'expenses.approve' => ['ro' => 'Aprobare cheltuieli', 'en' => 'Approve Expenses'],
        ],
    ],
    'contacts' => [
        'label_ro' => 'Contacte',
        'label_en' => 'Contacts',
        'permissions' => [
            'contacts.view' => ['ro' => 'Vizualizare contacte', 'en' => 'View Contacts'],
            'contacts.create' => ['ro' => 'Creare contacte', 'en' => 'Create Contacts'],
            'contacts.edit' => ['ro' => 'Editare contacte', 'en' => 'Edit Contacts'],
            'contacts.delete' => ['ro' => 'Ștergere contacte', 'en' => 'Delete Contacts'],
            'contacts.export' => ['ro' => 'Export contacte', 'en' => 'Export Contacts'],
        ],
    ],
    'products' => [
        'label_ro' => 'Produse',
        'label_en' => 'Products',
        'permissions' => [
            'products.view' => ['ro' => 'Vizualizare produse', 'en' => 'View Products'],
            'products.create' => ['ro' => 'Creare produse', 'en' => 'Create Products'],
            'products.edit' => ['ro' => 'Editare produse', 'en' => 'Edit Products'],
            'products.delete' => ['ro' => 'Ștergere produse', 'en' => 'Delete Products'],
            'products.pricing' => ['ro' => 'Modificare prețuri', 'en' => 'Modify Pricing'],
        ],
    ],
    'inventory' => [
        'label_ro' => 'Inventar',
        'label_en' => 'Inventory',
        'permissions' => [
            'inventory.view' => ['ro' => 'Vizualizare inventar', 'en' => 'View Inventory'],
            'inventory.adjust' => ['ro' => 'Ajustare stoc', 'en' => 'Adjust Stock'],
            'inventory.transfer' => ['ro' => 'Transfer stoc', 'en' => 'Transfer Stock'],
            'inventory.count' => ['ro' => 'Inventariere', 'en' => 'Stock Count'],
        ],
    ],
    'projects' => [
        'label_ro' => 'Proiecte',
        'label_en' => 'Projects',
        'permissions' => [
            'projects.view' => ['ro' => 'Vizualizare proiecte', 'en' => 'View Projects'],
            'projects.create' => ['ro' => 'Creare proiecte', 'en' => 'Create Projects'],
            'projects.edit' => ['ro' => 'Editare proiecte', 'en' => 'Edit Projects'],
            'projects.delete' => ['ro' => 'Ștergere proiecte', 'en' => 'Delete Projects'],
            'projects.manage_tasks' => ['ro' => 'Gestionare sarcini', 'en' => 'Manage Tasks'],
        ],
    ],
    'reports' => [
        'label_ro' => 'Rapoarte',
        'label_en' => 'Reports',
        'permissions' => [
            'reports.view' => ['ro' => 'Vizualizare rapoarte', 'en' => 'View Reports'],
            'reports.financial' => ['ro' => 'Rapoarte financiare', 'en' => 'Financial Reports'],
            'reports.export' => ['ro' => 'Export rapoarte', 'en' => 'Export Reports'],
            'reports.custom' => ['ro' => 'Rapoarte personalizate', 'en' => 'Custom Reports'],
        ],
    ],
    'team' => [
        'label_ro' => 'Echipă',
        'label_en' => 'Team',
        'permissions' => [
            'team.view' => ['ro' => 'Vizualizare echipă', 'en' => 'View Team'],
            'team.invite' => ['ro' => 'Invitare membri', 'en' => 'Invite Members'],
            'team.manage' => ['ro' => 'Gestionare membri', 'en' => 'Manage Members'],
            'team.permissions' => ['ro' => 'Gestionare permisiuni', 'en' => 'Manage Permissions'],
        ],
    ],
    'settings' => [
        'label_ro' => 'Setări',
        'label_en' => 'Settings',
        'permissions' => [
            'settings.view' => ['ro' => 'Vizualizare setări', 'en' => 'View Settings'],
            'settings.company' => ['ro' => 'Setări companie', 'en' => 'Company Settings'],
            'settings.billing' => ['ro' => 'Setări facturare', 'en' => 'Billing Settings'],
            'settings.security' => ['ro' => 'Setări securitate', 'en' => 'Security Settings'],
            'settings.integrations' => ['ro' => 'Integrări', 'en' => 'Integrations'],
        ],
    ],
];

// Role default permissions
$roleDefaults = [
    'admin' => ['*'], // All permissions
    'owner' => ['*'],
    'manager' => [
        'invoices.*', 'expenses.*', 'contacts.*', 'products.*', 'inventory.*',
        'projects.*', 'reports.*', 'team.view', 'team.invite', 'settings.view',
    ],
    'accountant' => [
        'invoices.*', 'expenses.*', 'contacts.view', 'products.view',
        'reports.*', 'settings.view',
    ],
    'sales' => [
        'invoices.view', 'invoices.create', 'invoices.send',
        'contacts.*', 'products.view',
        'reports.view',
    ],
    'hr' => [
        'team.view', 'team.invite', 'team.manage',
        'reports.view',
    ],
    'employee' => [
        'invoices.view', 'expenses.view', 'expenses.create',
        'contacts.view', 'products.view', 'projects.view',
    ],
    'viewer' => [
        'invoices.view', 'expenses.view', 'contacts.view',
        'products.view', 'projects.view', 'reports.view',
    ],
    'guest' => [
        'invoices.view', 'contacts.view',
    ],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? 'modules';

            if ($action === 'modules') {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'modules' => $permissionModules,
                        'role_defaults' => $roleDefaults,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'user') {
                $userId = $_GET['user_id'] ?? null;

                if (!$userId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'User ID required']);
                    exit;
                }

                $stmt = $db->prepare("
                    SELECT role, permissions FROM company_users
                    WHERE company_id = :company_id AND user_id = :user_id
                ");
                $stmt->execute(['company_id' => $companyId, 'user_id' => $userId]);
                $userData = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$userData) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'User not found']);
                    exit;
                }

                $customPermissions = json_decode($userData['permissions'] ?? '[]', true);
                $rolePermissions = $roleDefaults[$userData['role']] ?? [];

                // Merge role and custom permissions
                $effectivePermissions = array_unique(array_merge($rolePermissions, $customPermissions));

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'role' => $userData['role'],
                        'role_permissions' => $rolePermissions,
                        'custom_permissions' => $customPermissions,
                        'effective_permissions' => $effectivePermissions,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'check') {
                $permission = $_GET['permission'] ?? null;
                $userId = $_GET['user_id'] ?? $user['user_id'];

                if (!$permission) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Permission required']);
                    exit;
                }

                $stmt = $db->prepare("
                    SELECT role, permissions FROM company_users
                    WHERE company_id = :company_id AND user_id = :user_id
                ");
                $stmt->execute(['company_id' => $companyId, 'user_id' => $userId]);
                $userData = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$userData) {
                    echo json_encode(['success' => true, 'data' => ['has_permission' => false]]);
                    exit;
                }

                $customPermissions = json_decode($userData['permissions'] ?? '[]', true);
                $rolePermissions = $roleDefaults[$userData['role']] ?? [];
                $allPermissions = array_merge($rolePermissions, $customPermissions);

                // Check for wildcard or exact match
                $hasPermission = in_array('*', $allPermissions) ||
                                 in_array($permission, $allPermissions) ||
                                 in_array(explode('.', $permission)[0] . '.*', $allPermissions);

                echo json_encode([
                    'success' => true,
                    'data' => ['has_permission' => $hasPermission],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            $userId = $input['user_id'] ?? null;
            $permissions = $input['permissions'] ?? [];

            if (!$userId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'User ID required']);
                exit;
            }

            // Validate permissions
            $validPermissions = [];
            foreach ($permissionModules as $module) {
                $validPermissions = array_merge($validPermissions, array_keys($module['permissions']));
            }

            $filteredPermissions = array_filter($permissions, function($perm) use ($validPermissions) {
                return in_array($perm, $validPermissions) || 
                       preg_match('/^[a-z]+\.\*$/', $perm) || 
                       $perm === '*';
            });

            $stmt = $db->prepare("
                UPDATE company_users SET permissions = :permissions, updated_at = NOW()
                WHERE company_id = :company_id AND user_id = :user_id
            ");
            $stmt->execute([
                'company_id' => $companyId,
                'user_id' => $userId,
                'permissions' => json_encode(array_values($filteredPermissions)),
            ]);

            // Log permission change
            $stmt = $db->prepare("
                INSERT INTO audit_trail (id, company_id, user_id, event_type, category, risk_level, details, ip_address, created_at)
                VALUES (:id, :company_id, :user_id, 'permission_granted', 'authorization', 'high', :details, :ip, NOW())
            ");
            $stmt->execute([
                'id' => 'aud_' . bin2hex(random_bytes(8)),
                'company_id' => $companyId,
                'user_id' => $user['user_id'],
                'details' => json_encode(['target_user' => $userId, 'permissions' => $filteredPermissions]),
                'ip' => $_SERVER['REMOTE_ADDR'] ?? null,
            ]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Permisiunile au fost actualizate',
                'message_en' => 'Permissions updated',
                'data' => ['permissions' => $filteredPermissions],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
