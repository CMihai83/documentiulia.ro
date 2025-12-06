<?php
/**
 * Users List API
 * Manage company users
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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
$roles = [
    'admin' => [
        'label_ro' => 'Administrator',
        'label_en' => 'Administrator',
        'description_ro' => 'Acces complet la toate funcționalitățile',
        'description_en' => 'Full access to all features',
        'level' => 100,
    ],
    'manager' => [
        'label_ro' => 'Manager',
        'label_en' => 'Manager',
        'description_ro' => 'Poate gestiona echipe și aprobaări',
        'description_en' => 'Can manage teams and approvals',
        'level' => 80,
    ],
    'accountant' => [
        'label_ro' => 'Contabil',
        'label_en' => 'Accountant',
        'description_ro' => 'Acces la facturare și contabilitate',
        'description_en' => 'Access to invoicing and accounting',
        'level' => 60,
    ],
    'sales' => [
        'label_ro' => 'Vânzări',
        'label_en' => 'Sales',
        'description_ro' => 'Acces la CRM și facturare clienți',
        'description_en' => 'Access to CRM and customer invoicing',
        'level' => 50,
    ],
    'employee' => [
        'label_ro' => 'Angajat',
        'label_en' => 'Employee',
        'description_ro' => 'Acces limitat la funcționalități de bază',
        'description_en' => 'Limited access to basic features',
        'level' => 30,
    ],
    'viewer' => [
        'label_ro' => 'Vizualizare',
        'label_en' => 'Viewer',
        'description_ro' => 'Doar citire, fără modificări',
        'description_en' => 'Read-only, no modifications',
        'level' => 10,
    ],
];

// User statuses
$statuses = [
    'active' => ['ro' => 'Activ', 'en' => 'Active'],
    'inactive' => ['ro' => 'Inactiv', 'en' => 'Inactive'],
    'pending' => ['ro' => 'În așteptare', 'en' => 'Pending'],
    'suspended' => ['ro' => 'Suspendat', 'en' => 'Suspended'],
];

try {
    $db = getDbConnection();

    if ($method === 'GET') {
        $userId = $_GET['id'] ?? null;
        $search = $_GET['search'] ?? null;
        $role = $_GET['role'] ?? null;
        $status = $_GET['status'] ?? null;

        if ($userId) {
            // Get single user
            $stmt = $db->prepare("
                SELECT u.*, cu.role, cu.status as company_status, cu.joined_at,
                       t.name as team_name
                FROM users u
                JOIN company_users cu ON u.id = cu.user_id
                LEFT JOIN teams t ON cu.team_id = t.id
                WHERE u.id = :id AND cu.company_id = :company_id
            ");
            $stmt->execute(['id' => $userId, 'company_id' => $companyId]);
            $userData = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$userData) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'User not found']);
                exit;
            }

            unset($userData['password_hash']);
            $userData['role_info'] = $roles[$userData['role']] ?? null;
            $userData['status_label'] = $statuses[$userData['company_status']] ?? null;

            echo json_encode([
                'success' => true,
                'data' => $userData,
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        } else {
            // List users
            $page = max(1, intval($_GET['page'] ?? 1));
            $limit = min(100, max(10, intval($_GET['limit'] ?? 20)));
            $offset = ($page - 1) * $limit;

            // Count total
            $countSql = "
                SELECT COUNT(*) FROM users u
                JOIN company_users cu ON u.id = cu.user_id
                WHERE cu.company_id = :company_id
            ";
            $params = ['company_id' => $companyId];

            if ($search) {
                $countSql .= " AND (u.first_name LIKE :search OR u.last_name LIKE :search OR u.email LIKE :search)";
                $params['search'] = "%$search%";
            }
            if ($role) {
                $countSql .= " AND cu.role = :role";
                $params['role'] = $role;
            }
            if ($status) {
                $countSql .= " AND cu.status = :status";
                $params['status'] = $status;
            }

            $countStmt = $db->prepare($countSql);
            $countStmt->execute($params);
            $total = $countStmt->fetchColumn();

            // Get users
            $sql = "
                SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.avatar_url,
                       cu.role, cu.status as company_status, cu.joined_at, cu.last_active,
                       t.id as team_id, t.name as team_name
                FROM users u
                JOIN company_users cu ON u.id = cu.user_id
                LEFT JOIN teams t ON cu.team_id = t.id
                WHERE cu.company_id = :company_id
            ";

            if ($search) {
                $sql .= " AND (u.first_name LIKE :search OR u.last_name LIKE :search OR u.email LIKE :search)";
            }
            if ($role) {
                $sql .= " AND cu.role = :role";
            }
            if ($status) {
                $sql .= " AND cu.status = :status";
            }

            $sql .= " ORDER BY cu.joined_at DESC LIMIT :limit OFFSET :offset";

            $stmt = $db->prepare($sql);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($users as &$u) {
                $u['full_name'] = trim($u['first_name'] . ' ' . $u['last_name']);
                $u['role_label'] = $roles[$u['role']]['label_ro'] ?? $u['role'];
                $u['status_label'] = $statuses[$u['company_status']] ?? ['ro' => $u['company_status'], 'en' => $u['company_status']];
            }

            echo json_encode([
                'success' => true,
                'data' => [
                    'users' => $users,
                    'pagination' => [
                        'page' => $page,
                        'limit' => $limit,
                        'total' => intval($total),
                        'total_pages' => ceil($total / $limit),
                    ],
                    'roles' => $roles,
                    'statuses' => $statuses,
                ],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        }

    } elseif ($method === 'POST') {
        // Check if admin
        if ($user['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error_ro' => 'Doar administratorii pot adăuga utilizatori',
                'error' => 'Only administrators can add users'
            ]);
            exit;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $email = $input['email'] ?? null;
        $firstName = $input['first_name'] ?? null;
        $lastName = $input['last_name'] ?? null;
        $role = $input['role'] ?? 'employee';

        if (!$email || !$firstName || !$lastName) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error_ro' => 'Email, prenume și nume sunt obligatorii',
                'error' => 'Email, first name, and last name are required'
            ]);
            exit;
        }

        // Check if user exists
        $stmt = $db->prepare("SELECT id FROM users WHERE email = :email");
        $stmt->execute(['email' => $email]);
        $existingUser = $stmt->fetch();

        $db->beginTransaction();

        try {
            if ($existingUser) {
                // Add existing user to company
                $userId = $existingUser['id'];

                // Check if already in company
                $checkStmt = $db->prepare("SELECT id FROM company_users WHERE company_id = :company_id AND user_id = :user_id");
                $checkStmt->execute(['company_id' => $companyId, 'user_id' => $userId]);
                if ($checkStmt->fetch()) {
                    http_response_code(409);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Utilizatorul este deja în companie',
                        'error' => 'User is already in this company'
                    ]);
                    $db->rollBack();
                    exit;
                }
            } else {
                // Create new user
                $userId = bin2hex(random_bytes(16));
                $tempPassword = bin2hex(random_bytes(8));

                $stmt = $db->prepare("
                    INSERT INTO users (id, email, first_name, last_name, phone, password_hash, status, created_at)
                    VALUES (:id, :email, :first_name, :last_name, :phone, :password_hash, 'pending', NOW())
                ");
                $stmt->execute([
                    'id' => $userId,
                    'email' => $email,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'phone' => $input['phone'] ?? null,
                    'password_hash' => password_hash($tempPassword, PASSWORD_DEFAULT),
                ]);
            }

            // Add to company
            $stmt = $db->prepare("
                INSERT INTO company_users (company_id, user_id, role, status, team_id, joined_at, invited_by)
                VALUES (:company_id, :user_id, :role, 'pending', :team_id, NOW(), :invited_by)
            ");
            $stmt->execute([
                'company_id' => $companyId,
                'user_id' => $userId,
                'role' => $role,
                'team_id' => $input['team_id'] ?? null,
                'invited_by' => $user['user_id'],
            ]);

            $db->commit();

            echo json_encode([
                'success' => true,
                'message_ro' => $existingUser ? 'Utilizator adăugat în companie' : 'Utilizator creat și invitație trimisă',
                'message_en' => $existingUser ? 'User added to company' : 'User created and invitation sent',
                'data' => [
                    'user_id' => $userId,
                    'is_new_user' => !$existingUser,
                ],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
