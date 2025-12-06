<?php
/**
 * Teams List API
 * Manage company teams
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

// Team types
$teamTypes = [
    'department' => ['ro' => 'Departament', 'en' => 'Department'],
    'project' => ['ro' => 'Proiect', 'en' => 'Project'],
    'functional' => ['ro' => 'Funcțional', 'en' => 'Functional'],
    'cross_functional' => ['ro' => 'Cross-Funcțional', 'en' => 'Cross-Functional'],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $teamId = $_GET['id'] ?? null;

            if ($teamId) {
                // Get single team with members
                $stmt = $db->prepare("
                    SELECT t.*, u.first_name as leader_first_name, u.last_name as leader_last_name
                    FROM teams t
                    LEFT JOIN users u ON t.leader_id = u.id
                    WHERE t.id = :id AND t.company_id = :company_id
                ");
                $stmt->execute(['id' => $teamId, 'company_id' => $companyId]);
                $team = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$team) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Team not found']);
                    exit;
                }

                // Get team members
                $memberStmt = $db->prepare("
                    SELECT u.id, u.first_name, u.last_name, u.email, u.avatar_url,
                           cu.role, cu.joined_at
                    FROM users u
                    JOIN company_users cu ON u.id = cu.user_id
                    WHERE cu.company_id = :company_id AND cu.team_id = :team_id
                    ORDER BY cu.joined_at ASC
                ");
                $memberStmt->execute(['company_id' => $companyId, 'team_id' => $teamId]);
                $members = $memberStmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($members as &$m) {
                    $m['full_name'] = trim($m['first_name'] . ' ' . $m['last_name']);
                    $m['is_leader'] = $m['id'] === $team['leader_id'];
                }

                $team['members'] = $members;
                $team['member_count'] = count($members);
                $team['leader_name'] = trim(($team['leader_first_name'] ?? '') . ' ' . ($team['leader_last_name'] ?? ''));
                $team['type_label'] = $teamTypes[$team['team_type']] ?? ['ro' => $team['team_type'], 'en' => $team['team_type']];

                echo json_encode([
                    'success' => true,
                    'data' => $team,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } else {
                // List all teams
                $stmt = $db->prepare("
                    SELECT t.*, u.first_name as leader_first_name, u.last_name as leader_last_name,
                           (SELECT COUNT(*) FROM company_users WHERE team_id = t.id) as member_count
                    FROM teams t
                    LEFT JOIN users u ON t.leader_id = u.id
                    WHERE t.company_id = :company_id
                    ORDER BY t.name ASC
                ");
                $stmt->execute(['company_id' => $companyId]);
                $teams = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($teams as &$t) {
                    $t['leader_name'] = trim(($t['leader_first_name'] ?? '') . ' ' . ($t['leader_last_name'] ?? ''));
                    $t['type_label'] = $teamTypes[$t['team_type']] ?? ['ro' => $t['team_type'], 'en' => $t['team_type']];
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'teams' => $teams,
                        'team_types' => $teamTypes,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            // Check admin/manager
            if (!in_array($user['role'], ['admin', 'manager'])) {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Nu aveți permisiunea de a crea echipe',
                    'error' => 'You do not have permission to create teams'
                ]);
                exit;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            $name = $input['name'] ?? null;

            if (!$name) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Numele echipei este obligatoriu',
                    'error' => 'Team name is required'
                ]);
                exit;
            }

            $teamId = 'team_' . bin2hex(random_bytes(12));
            $stmt = $db->prepare("
                INSERT INTO teams (id, company_id, name, description, team_type, leader_id, created_by, created_at)
                VALUES (:id, :company_id, :name, :description, :team_type, :leader_id, :created_by, NOW())
            ");
            $stmt->execute([
                'id' => $teamId,
                'company_id' => $companyId,
                'name' => $name,
                'description' => $input['description'] ?? null,
                'team_type' => $input['team_type'] ?? 'department',
                'leader_id' => $input['leader_id'] ?? null,
                'created_by' => $user['user_id'],
            ]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Echipă creată cu succes',
                'message_en' => 'Team created successfully',
                'data' => ['id' => $teamId],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            $teamId = $input['id'] ?? null;

            if (!$teamId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'id required']);
                exit;
            }

            // Verify team exists
            $stmt = $db->prepare("SELECT id FROM teams WHERE id = :id AND company_id = :company_id");
            $stmt->execute(['id' => $teamId, 'company_id' => $companyId]);
            if (!$stmt->fetch()) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Team not found']);
                exit;
            }

            $updates = [];
            $params = ['id' => $teamId];

            $fields = ['name', 'description', 'team_type', 'leader_id'];
            foreach ($fields as $field) {
                if (isset($input[$field])) {
                    $updates[] = "$field = :$field";
                    $params[$field] = $input[$field];
                }
            }

            if (!empty($updates)) {
                $updates[] = "updated_at = NOW()";
                $sql = "UPDATE teams SET " . implode(', ', $updates) . " WHERE id = :id";
                $db->prepare($sql)->execute($params);
            }

            echo json_encode([
                'success' => true,
                'message_ro' => 'Echipă actualizată',
                'message_en' => 'Team updated',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'DELETE':
            $teamId = $_GET['id'] ?? null;

            if (!$teamId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'id required']);
                exit;
            }

            // Remove team assignments first
            $db->prepare("UPDATE company_users SET team_id = NULL WHERE team_id = :team_id")
               ->execute(['team_id' => $teamId]);

            // Delete team
            $stmt = $db->prepare("DELETE FROM teams WHERE id = :id AND company_id = :company_id");
            $stmt->execute(['id' => $teamId, 'company_id' => $companyId]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Echipă ștearsă',
                'message_en' => 'Team deleted',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
