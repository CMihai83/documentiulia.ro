<?php
/**
 * Team Members API
 * Manage team members and their roles
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

$companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
if (!$companyId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Company ID required']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// User roles
$userRoles = [
    'admin' => ['ro' => 'Administrator', 'en' => 'Administrator', 'level' => 100, 'color' => '#9C27B0'],
    'owner' => ['ro' => 'Proprietar', 'en' => 'Owner', 'level' => 90, 'color' => '#673AB7'],
    'manager' => ['ro' => 'Manager', 'en' => 'Manager', 'level' => 70, 'color' => '#2196F3'],
    'accountant' => ['ro' => 'Contabil', 'en' => 'Accountant', 'level' => 60, 'color' => '#00BCD4'],
    'sales' => ['ro' => 'Vânzări', 'en' => 'Sales', 'level' => 50, 'color' => '#4CAF50'],
    'hr' => ['ro' => 'Resurse Umane', 'en' => 'Human Resources', 'level' => 50, 'color' => '#FF9800'],
    'employee' => ['ro' => 'Angajat', 'en' => 'Employee', 'level' => 30, 'color' => '#607D8B'],
    'viewer' => ['ro' => 'Vizualizator', 'en' => 'Viewer', 'level' => 10, 'color' => '#9E9E9E'],
    'guest' => ['ro' => 'Invitat', 'en' => 'Guest', 'level' => 5, 'color' => '#BDBDBD'],
];

// Member statuses
$memberStatuses = [
    'active' => ['ro' => 'Activ', 'en' => 'Active', 'color' => '#4CAF50'],
    'inactive' => ['ro' => 'Inactiv', 'en' => 'Inactive', 'color' => '#9E9E9E'],
    'pending' => ['ro' => 'În așteptare', 'en' => 'Pending', 'color' => '#FF9800'],
    'suspended' => ['ro' => 'Suspendat', 'en' => 'Suspended', 'color' => '#F44336'],
    'invited' => ['ro' => 'Invitat', 'en' => 'Invited', 'color' => '#2196F3'],
];

// Departments
$departments = [
    'management' => ['ro' => 'Management', 'en' => 'Management'],
    'accounting' => ['ro' => 'Contabilitate', 'en' => 'Accounting'],
    'sales' => ['ro' => 'Vânzări', 'en' => 'Sales'],
    'marketing' => ['ro' => 'Marketing', 'en' => 'Marketing'],
    'hr' => ['ro' => 'Resurse Umane', 'en' => 'Human Resources'],
    'it' => ['ro' => 'IT', 'en' => 'IT'],
    'operations' => ['ro' => 'Operațiuni', 'en' => 'Operations'],
    'logistics' => ['ro' => 'Logistică', 'en' => 'Logistics'],
    'production' => ['ro' => 'Producție', 'en' => 'Production'],
    'support' => ['ro' => 'Suport', 'en' => 'Support'],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? 'list';

            if ($action === 'list') {
                $role = $_GET['role'] ?? null;
                $department = $_GET['department'] ?? null;
                $status = $_GET['status'] ?? null;
                $search = $_GET['search'] ?? null;
                $limit = intval($_GET['limit'] ?? 50);
                $offset = intval($_GET['offset'] ?? 0);

                $sql = "
                    SELECT u.id, u.email, u.first_name, u.last_name, u.phone,
                           cu.role, cu.department, cu.status, cu.job_title, cu.joined_at,
                           cu.last_active_at, cu.permissions, u.avatar_url
                    FROM users u
                    INNER JOIN company_users cu ON u.id = cu.user_id
                    WHERE cu.company_id = :company_id
                ";
                $params = ['company_id' => $companyId];

                if ($role) {
                    $sql .= " AND cu.role = :role";
                    $params['role'] = $role;
                }
                if ($department) {
                    $sql .= " AND cu.department = :department";
                    $params['department'] = $department;
                }
                if ($status) {
                    $sql .= " AND cu.status = :status";
                    $params['status'] = $status;
                }
                if ($search) {
                    $sql .= " AND (u.first_name ILIKE :search OR u.last_name ILIKE :search OR u.email ILIKE :search)";
                    $params['search'] = "%$search%";
                }

                $sql .= " ORDER BY cu.role DESC, u.first_name LIMIT $limit OFFSET $offset";

                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                $members = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($members as &$member) {
                    $member['full_name'] = trim($member['first_name'] . ' ' . $member['last_name']);
                    $member['role_config'] = $userRoles[$member['role']] ?? null;
                    $member['status_config'] = $memberStatuses[$member['status']] ?? null;
                    $member['department_config'] = $departments[$member['department']] ?? null;
                    $member['permissions'] = json_decode($member['permissions'] ?? '[]', true);
                }

                // Get total count
                $stmt = $db->prepare("SELECT COUNT(*) FROM company_users WHERE company_id = :company_id");
                $stmt->execute(['company_id' => $companyId]);
                $total = $stmt->fetchColumn();

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'members' => $members,
                        'total' => intval($total),
                        'limit' => $limit,
                        'offset' => $offset,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'get') {
                $memberId = $_GET['id'] ?? null;

                if (!$memberId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Member ID required']);
                    exit;
                }

                $stmt = $db->prepare("
                    SELECT u.*, cu.role, cu.department, cu.status, cu.job_title, cu.joined_at,
                           cu.last_active_at, cu.permissions, cu.notes
                    FROM users u
                    INNER JOIN company_users cu ON u.id = cu.user_id
                    WHERE u.id = :id AND cu.company_id = :company_id
                ");
                $stmt->execute(['id' => $memberId, 'company_id' => $companyId]);
                $member = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$member) {
                    http_response_code(404);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Membrul nu a fost găsit',
                        'error' => 'Member not found'
                    ]);
                    exit;
                }

                $member['full_name'] = trim($member['first_name'] . ' ' . $member['last_name']);
                $member['role_config'] = $userRoles[$member['role']] ?? null;
                $member['status_config'] = $memberStatuses[$member['status']] ?? null;
                $member['permissions'] = json_decode($member['permissions'] ?? '[]', true);

                echo json_encode([
                    'success' => true,
                    'data' => $member,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'roles') {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'roles' => $userRoles,
                        'statuses' => $memberStatuses,
                        'departments' => $departments,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'stats') {
                // Get team statistics
                $stmt = $db->prepare("
                    SELECT 
                        COUNT(*) as total,
                        COUNT(*) FILTER (WHERE status = 'active') as active,
                        COUNT(*) FILTER (WHERE status = 'inactive') as inactive,
                        COUNT(*) FILTER (WHERE status = 'pending') as pending,
                        COUNT(*) FILTER (WHERE status = 'invited') as invited
                    FROM company_users
                    WHERE company_id = :company_id
                ");
                $stmt->execute(['company_id' => $companyId]);
                $stats = $stmt->fetch(PDO::FETCH_ASSOC);

                // By role
                $stmt = $db->prepare("
                    SELECT role, COUNT(*) as count
                    FROM company_users WHERE company_id = :company_id
                    GROUP BY role ORDER BY count DESC
                ");
                $stmt->execute(['company_id' => $companyId]);
                $byRole = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // By department
                $stmt = $db->prepare("
                    SELECT department, COUNT(*) as count
                    FROM company_users WHERE company_id = :company_id AND department IS NOT NULL
                    GROUP BY department ORDER BY count DESC
                ");
                $stmt->execute(['company_id' => $companyId]);
                $byDepartment = $stmt->fetchAll(PDO::FETCH_ASSOC);

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'summary' => $stats,
                        'by_role' => $byRole,
                        'by_department' => $byDepartment,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            // Check permission
            if (!in_array($user['role'], ['admin', 'owner', 'manager'])) {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Nu aveți permisiunea de a adăuga membri',
                    'error' => 'You do not have permission to add members'
                ]);
                exit;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            $action = $input['action'] ?? 'invite';

            if ($action === 'invite') {
                // Invite new member
                $email = $input['email'] ?? null;
                $role = $input['role'] ?? 'employee';
                $department = $input['department'] ?? null;
                $jobTitle = $input['job_title'] ?? null;

                if (!$email) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Email-ul este obligatoriu',
                        'error' => 'Email is required'
                    ]);
                    exit;
                }

                // Check if already a member
                $stmt = $db->prepare("
                    SELECT cu.id FROM company_users cu
                    INNER JOIN users u ON cu.user_id = u.id
                    WHERE u.email = :email AND cu.company_id = :company_id
                ");
                $stmt->execute(['email' => $email, 'company_id' => $companyId]);
                if ($stmt->fetch()) {
                    http_response_code(409);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Utilizatorul este deja membru',
                        'error' => 'User is already a member'
                    ]);
                    exit;
                }

                // Check if user exists
                $stmt = $db->prepare("SELECT id FROM users WHERE email = :email");
                $stmt->execute(['email' => $email]);
                $existingUser = $stmt->fetch(PDO::FETCH_ASSOC);

                $inviteToken = bin2hex(random_bytes(32));

                if ($existingUser) {
                    // Add existing user to company
                    $stmt = $db->prepare("
                        INSERT INTO company_users (company_id, user_id, role, department, job_title, status, invite_token, joined_at)
                        VALUES (:company_id, :user_id, :role, :department, :job_title, 'invited', :token, NOW())
                    ");
                    $stmt->execute([
                        'company_id' => $companyId,
                        'user_id' => $existingUser['id'],
                        'role' => $role,
                        'department' => $department,
                        'job_title' => $jobTitle,
                        'token' => $inviteToken,
                    ]);
                } else {
                    // Create invite for new user
                    $stmt = $db->prepare("
                        INSERT INTO team_invites (company_id, email, role, department, job_title, token, invited_by, expires_at, created_at)
                        VALUES (:company_id, :email, :role, :department, :job_title, :token, :invited_by, NOW() + INTERVAL '7 days', NOW())
                    ");
                    $stmt->execute([
                        'company_id' => $companyId,
                        'email' => $email,
                        'role' => $role,
                        'department' => $department,
                        'job_title' => $jobTitle,
                        'token' => $inviteToken,
                        'invited_by' => $user['user_id'],
                    ]);
                }

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Invitația a fost trimisă',
                    'message_en' => 'Invitation sent',
                    'data' => [
                        'email' => $email,
                        'invite_url' => "/invite/$inviteToken",
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'PUT':
            // Check permission
            if (!in_array($user['role'], ['admin', 'owner', 'manager'])) {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Nu aveți permisiunea de a modifica membri',
                    'error' => 'You do not have permission to modify members'
                ]);
                exit;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            $memberId = $input['id'] ?? null;

            if (!$memberId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Member ID required']);
                exit;
            }

            $updateFields = [];
            $params = ['company_id' => $companyId, 'user_id' => $memberId];

            if (isset($input['role'])) {
                $updateFields[] = "role = :role";
                $params['role'] = $input['role'];
            }
            if (isset($input['department'])) {
                $updateFields[] = "department = :department";
                $params['department'] = $input['department'];
            }
            if (isset($input['job_title'])) {
                $updateFields[] = "job_title = :job_title";
                $params['job_title'] = $input['job_title'];
            }
            if (isset($input['status'])) {
                $updateFields[] = "status = :status";
                $params['status'] = $input['status'];
            }
            if (isset($input['permissions'])) {
                $updateFields[] = "permissions = :permissions";
                $params['permissions'] = json_encode($input['permissions']);
            }
            if (isset($input['notes'])) {
                $updateFields[] = "notes = :notes";
                $params['notes'] = $input['notes'];
            }

            if (empty($updateFields)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'No fields to update']);
                exit;
            }

            $sql = "UPDATE company_users SET " . implode(', ', $updateFields) . ", updated_at = NOW() WHERE company_id = :company_id AND user_id = :user_id";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Membrul a fost actualizat',
                'message_en' => 'Member updated',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'DELETE':
            // Check permission
            if (!in_array($user['role'], ['admin', 'owner'])) {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Nu aveți permisiunea de a elimina membri',
                    'error' => 'You do not have permission to remove members'
                ]);
                exit;
            }

            $memberId = $_GET['id'] ?? null;

            if (!$memberId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Member ID required']);
                exit;
            }

            // Cannot remove yourself
            if ($memberId === $user['user_id']) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Nu vă puteți elimina pe dumneavoastră',
                    'error' => 'You cannot remove yourself'
                ]);
                exit;
            }

            $stmt = $db->prepare("DELETE FROM company_users WHERE company_id = :company_id AND user_id = :user_id");
            $stmt->execute(['company_id' => $companyId, 'user_id' => $memberId]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Membrul a fost eliminat',
                'message_en' => 'Member removed',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
