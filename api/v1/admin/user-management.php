<?php
/**
 * User Management API
 * Admin tools for managing platform users
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
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

// Admin only
if (!in_array($user['role'], ['admin', 'owner'])) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'error_ro' => 'Doar administratorii pot gestiona utilizatorii',
        'error' => 'Only administrators can manage users'
    ]);
    exit;
}

$companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
$method = $_SERVER['REQUEST_METHOD'];

// User statuses
$userStatuses = [
    'active' => ['ro' => 'Activ', 'en' => 'Active', 'color' => '#4CAF50'],
    'inactive' => ['ro' => 'Inactiv', 'en' => 'Inactive', 'color' => '#9E9E9E'],
    'pending' => ['ro' => 'În așteptare', 'en' => 'Pending', 'color' => '#FF9800'],
    'suspended' => ['ro' => 'Suspendat', 'en' => 'Suspended', 'color' => '#F44336'],
    'locked' => ['ro' => 'Blocat', 'en' => 'Locked', 'color' => '#9C27B0'],
];

// User roles
$userRoles = [
    'admin' => ['ro' => 'Administrator', 'en' => 'Administrator', 'level' => 100],
    'owner' => ['ro' => 'Proprietar', 'en' => 'Owner', 'level' => 90],
    'manager' => ['ro' => 'Manager', 'en' => 'Manager', 'level' => 70],
    'accountant' => ['ro' => 'Contabil', 'en' => 'Accountant', 'level' => 60],
    'sales' => ['ro' => 'Vânzări', 'en' => 'Sales', 'level' => 50],
    'hr' => ['ro' => 'Resurse Umane', 'en' => 'HR', 'level' => 50],
    'employee' => ['ro' => 'Angajat', 'en' => 'Employee', 'level' => 30],
    'viewer' => ['ro' => 'Vizualizator', 'en' => 'Viewer', 'level' => 10],
    'guest' => ['ro' => 'Invitat', 'en' => 'Guest', 'level' => 5],
];

// Action types for audit
$actionTypes = [
    'created' => ['ro' => 'Creat', 'en' => 'Created'],
    'updated' => ['ro' => 'Actualizat', 'en' => 'Updated'],
    'activated' => ['ro' => 'Activat', 'en' => 'Activated'],
    'deactivated' => ['ro' => 'Dezactivat', 'en' => 'Deactivated'],
    'suspended' => ['ro' => 'Suspendat', 'en' => 'Suspended'],
    'unlocked' => ['ro' => 'Deblocat', 'en' => 'Unlocked'],
    'password_reset' => ['ro' => 'Resetare parolă', 'en' => 'Password Reset'],
    'role_changed' => ['ro' => 'Rol schimbat', 'en' => 'Role Changed'],
    'deleted' => ['ro' => 'Șters', 'en' => 'Deleted'],
    'impersonated' => ['ro' => 'Impersonat', 'en' => 'Impersonated'],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? 'list';

            if ($action === 'list') {
                $status = $_GET['status'] ?? null;
                $role = $_GET['role'] ?? null;
                $search = $_GET['search'] ?? null;
                $limit = intval($_GET['limit'] ?? 50);
                $offset = intval($_GET['offset'] ?? 0);

                $sql = "
                    SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar_url,
                           u.status, u.email_verified_at, u.last_login_at, u.login_count,
                           u.created_at, cu.role
                    FROM users u
                    LEFT JOIN company_users cu ON u.id = cu.user_id AND cu.company_id = :company_id
                    WHERE 1=1
                ";
                $params = ['company_id' => $companyId];

                if ($companyId) {
                    $sql .= " AND cu.company_id = :company_filter";
                    $params['company_filter'] = $companyId;
                }

                if ($status) {
                    $sql .= " AND u.status = :status";
                    $params['status'] = $status;
                }
                if ($role) {
                    $sql .= " AND cu.role = :role";
                    $params['role'] = $role;
                }
                if ($search) {
                    $sql .= " AND (u.email ILIKE :search OR u.first_name ILIKE :search OR u.last_name ILIKE :search)";
                    $params['search'] = "%$search%";
                }

                $sql .= " ORDER BY u.created_at DESC LIMIT $limit OFFSET $offset";

                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($users as &$usr) {
                    $usr['full_name'] = trim(($usr['first_name'] ?? '') . ' ' . ($usr['last_name'] ?? ''));
                    $usr['status_config'] = $userStatuses[$usr['status']] ?? null;
                    $usr['role_config'] = $userRoles[$usr['role']] ?? null;
                    $usr['is_verified'] = !empty($usr['email_verified_at']);
                }

                // Get total count
                $countSql = "SELECT COUNT(DISTINCT u.id) FROM users u LEFT JOIN company_users cu ON u.id = cu.user_id";
                if ($companyId) {
                    $countSql .= " WHERE cu.company_id = :company_id";
                }
                $stmt = $db->prepare($countSql);
                $stmt->execute($companyId ? ['company_id' => $companyId] : []);
                $total = $stmt->fetchColumn();

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'users' => $users,
                        'total' => intval($total),
                        'limit' => $limit,
                        'offset' => $offset,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'get') {
                $userId = $_GET['id'] ?? null;

                if (!$userId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'User ID required']);
                    exit;
                }

                $stmt = $db->prepare("
                    SELECT u.*, cu.role, cu.joined_at, cu.permissions
                    FROM users u
                    LEFT JOIN company_users cu ON u.id = cu.user_id AND cu.company_id = :company_id
                    WHERE u.id = :user_id
                ");
                $stmt->execute(['user_id' => $userId, 'company_id' => $companyId]);
                $userData = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$userData) {
                    http_response_code(404);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Utilizatorul nu a fost găsit',
                        'error' => 'User not found'
                    ]);
                    exit;
                }

                $userData['full_name'] = trim(($userData['first_name'] ?? '') . ' ' . ($userData['last_name'] ?? ''));
                $userData['status_config'] = $userStatuses[$userData['status']] ?? null;
                $userData['role_config'] = $userRoles[$userData['role']] ?? null;
                $userData['permissions'] = json_decode($userData['permissions'] ?? '[]', true);

                // Get user activity
                $stmt = $db->prepare("
                    SELECT * FROM user_activity_log
                    WHERE user_id = :user_id
                    ORDER BY created_at DESC LIMIT 20
                ");
                $stmt->execute(['user_id' => $userId]);
                $userData['recent_activity'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Get login history
                $stmt = $db->prepare("
                    SELECT ip_address, user_agent, login_at, success
                    FROM login_history
                    WHERE user_id = :user_id
                    ORDER BY login_at DESC LIMIT 10
                ");
                $stmt->execute(['user_id' => $userId]);
                $userData['login_history'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

                echo json_encode([
                    'success' => true,
                    'data' => $userData,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'stats') {
                // User statistics
                $stmt = $db->prepare("
                    SELECT
                        COUNT(*) as total,
                        COUNT(*) FILTER (WHERE status = 'active') as active,
                        COUNT(*) FILTER (WHERE status = 'inactive') as inactive,
                        COUNT(*) FILTER (WHERE status = 'suspended') as suspended,
                        COUNT(*) FILTER (WHERE status = 'pending') as pending,
                        COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '7 days') as active_7d,
                        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_30d
                    FROM users u
                    JOIN company_users cu ON u.id = cu.user_id
                    WHERE cu.company_id = :company_id
                ");
                $stmt->execute(['company_id' => $companyId]);
                $stats = $stmt->fetch(PDO::FETCH_ASSOC);

                // By role
                $stmt = $db->prepare("
                    SELECT cu.role, COUNT(*) as count
                    FROM company_users cu
                    WHERE cu.company_id = :company_id
                    GROUP BY cu.role ORDER BY count DESC
                ");
                $stmt->execute(['company_id' => $companyId]);
                $byRole = $stmt->fetchAll(PDO::FETCH_ASSOC);

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'summary' => $stats,
                        'by_role' => $byRole,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'types') {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'statuses' => $userStatuses,
                        'roles' => $userRoles,
                        'actions' => $actionTypes,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            $action = $input['action'] ?? 'create';

            if ($action === 'create') {
                $email = $input['email'] ?? null;
                $firstName = $input['first_name'] ?? null;
                $lastName = $input['last_name'] ?? null;
                $role = $input['role'] ?? 'employee';

                if (!$email) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Email is required']);
                    exit;
                }

                // Check if user exists
                $stmt = $db->prepare("SELECT id FROM users WHERE email = :email");
                $stmt->execute(['email' => $email]);
                if ($stmt->fetch()) {
                    http_response_code(409);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Un utilizator cu acest email există deja',
                        'error' => 'User with this email already exists'
                    ]);
                    exit;
                }

                $userId = 'usr_' . bin2hex(random_bytes(8));
                $tempPassword = bin2hex(random_bytes(8));

                // Create user
                $stmt = $db->prepare("
                    INSERT INTO users (id, email, first_name, last_name, password_hash, status, created_at)
                    VALUES (:id, :email, :first_name, :last_name, :password, 'pending', NOW())
                ");
                $stmt->execute([
                    'id' => $userId,
                    'email' => $email,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'password' => password_hash($tempPassword, PASSWORD_DEFAULT),
                ]);

                // Add to company
                if ($companyId) {
                    $stmt = $db->prepare("
                        INSERT INTO company_users (company_id, user_id, role, status, joined_at)
                        VALUES (:company_id, :user_id, :role, 'active', NOW())
                    ");
                    $stmt->execute([
                        'company_id' => $companyId,
                        'user_id' => $userId,
                        'role' => $role,
                    ]);
                }

                // Log action
                logUserAction($db, $user['user_id'], $userId, 'created', $companyId);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Utilizatorul a fost creat',
                    'message_en' => 'User created',
                    'data' => ['id' => $userId, 'temp_password' => $tempPassword],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'activate') {
                $userId = $input['user_id'] ?? null;

                if (!$userId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'User ID required']);
                    exit;
                }

                $stmt = $db->prepare("UPDATE users SET status = 'active' WHERE id = :id");
                $stmt->execute(['id' => $userId]);

                logUserAction($db, $user['user_id'], $userId, 'activated', $companyId);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Utilizatorul a fost activat',
                    'message_en' => 'User activated',
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'suspend') {
                $userId = $input['user_id'] ?? null;
                $reason = $input['reason'] ?? null;

                if (!$userId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'User ID required']);
                    exit;
                }

                $stmt = $db->prepare("UPDATE users SET status = 'suspended', suspension_reason = :reason WHERE id = :id");
                $stmt->execute(['id' => $userId, 'reason' => $reason]);

                logUserAction($db, $user['user_id'], $userId, 'suspended', $companyId, ['reason' => $reason]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Utilizatorul a fost suspendat',
                    'message_en' => 'User suspended',
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'unlock') {
                $userId = $input['user_id'] ?? null;

                if (!$userId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'User ID required']);
                    exit;
                }

                $stmt = $db->prepare("UPDATE users SET status = 'active', failed_login_attempts = 0, locked_until = NULL WHERE id = :id");
                $stmt->execute(['id' => $userId]);

                logUserAction($db, $user['user_id'], $userId, 'unlocked', $companyId);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Utilizatorul a fost deblocat',
                    'message_en' => 'User unlocked',
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'reset_password') {
                $userId = $input['user_id'] ?? null;

                if (!$userId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'User ID required']);
                    exit;
                }

                $newPassword = bin2hex(random_bytes(8));

                $stmt = $db->prepare("UPDATE users SET password_hash = :password, must_change_password = true WHERE id = :id");
                $stmt->execute([
                    'id' => $userId,
                    'password' => password_hash($newPassword, PASSWORD_DEFAULT),
                ]);

                logUserAction($db, $user['user_id'], $userId, 'password_reset', $companyId);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Parola a fost resetată',
                    'message_en' => 'Password reset',
                    'data' => ['new_password' => $newPassword],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'impersonate') {
                $userId = $input['user_id'] ?? null;

                if (!$userId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'User ID required']);
                    exit;
                }

                // Only super admins can impersonate
                if ($user['role'] !== 'admin') {
                    http_response_code(403);
                    echo json_encode(['success' => false, 'error' => 'Only super admins can impersonate']);
                    exit;
                }

                // Generate impersonation token
                $impersonateToken = bin2hex(random_bytes(32));

                $stmt = $db->prepare("
                    INSERT INTO impersonation_tokens (id, admin_user_id, target_user_id, token, expires_at, created_at)
                    VALUES (:id, :admin_id, :target_id, :token, NOW() + INTERVAL '1 hour', NOW())
                ");
                $stmt->execute([
                    'id' => 'imp_' . bin2hex(random_bytes(8)),
                    'admin_id' => $user['user_id'],
                    'target_id' => $userId,
                    'token' => $impersonateToken,
                ]);

                logUserAction($db, $user['user_id'], $userId, 'impersonated', $companyId);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Sesiune de impersonare creată',
                    'message_en' => 'Impersonation session created',
                    'data' => ['impersonate_token' => $impersonateToken],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            $userId = $input['user_id'] ?? null;

            if (!$userId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'User ID required']);
                exit;
            }

            $updateFields = [];
            $params = ['id' => $userId];

            // Allowed fields for update
            $allowedFields = ['first_name', 'last_name', 'phone', 'status'];
            foreach ($allowedFields as $field) {
                if (isset($input[$field])) {
                    $updateFields[] = "$field = :$field";
                    $params[$field] = $input[$field];
                }
            }

            if (empty($updateFields)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'No fields to update']);
                exit;
            }

            $sql = "UPDATE users SET " . implode(', ', $updateFields) . ", updated_at = NOW() WHERE id = :id";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);

            // Update role if provided
            if (isset($input['role']) && $companyId) {
                $stmt = $db->prepare("UPDATE company_users SET role = :role WHERE company_id = :company_id AND user_id = :user_id");
                $stmt->execute([
                    'company_id' => $companyId,
                    'user_id' => $userId,
                    'role' => $input['role'],
                ]);

                logUserAction($db, $user['user_id'], $userId, 'role_changed', $companyId, ['new_role' => $input['role']]);
            }

            logUserAction($db, $user['user_id'], $userId, 'updated', $companyId);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Utilizatorul a fost actualizat',
                'message_en' => 'User updated',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'DELETE':
            $userId = $_GET['id'] ?? null;

            if (!$userId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'User ID required']);
                exit;
            }

            // Soft delete - just deactivate
            $stmt = $db->prepare("UPDATE users SET status = 'inactive', deleted_at = NOW() WHERE id = :id");
            $stmt->execute(['id' => $userId]);

            // Remove from company
            if ($companyId) {
                $stmt = $db->prepare("UPDATE company_users SET status = 'inactive' WHERE company_id = :company_id AND user_id = :user_id");
                $stmt->execute(['company_id' => $companyId, 'user_id' => $userId]);
            }

            logUserAction($db, $user['user_id'], $userId, 'deleted', $companyId);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Utilizatorul a fost dezactivat',
                'message_en' => 'User deactivated',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}

function logUserAction($db, $adminId, $targetUserId, $action, $companyId, $details = []) {
    $stmt = $db->prepare("
        INSERT INTO user_admin_actions (id, admin_user_id, target_user_id, company_id, action, details, created_at)
        VALUES (:id, :admin_id, :target_id, :company_id, :action, :details, NOW())
    ");
    $stmt->execute([
        'id' => 'uaa_' . bin2hex(random_bytes(8)),
        'admin_id' => $adminId,
        'target_id' => $targetUserId,
        'company_id' => $companyId,
        'action' => $action,
        'details' => json_encode($details),
    ]);
}
