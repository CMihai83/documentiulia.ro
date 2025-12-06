<?php
/**
 * Time Tracking Policies Management API
 *
 * Configure company-wide time tracking rules and policies
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    $authHeader = getHeader('authorization', '') ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization token required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    $companyId = getHeader('x-company-id') ?? null;
    if (!$companyId) {
        throw new Exception('Company context required');
    }

    if (!$auth->userHasAccessToCompany($userData['user_id'], $companyId)) {
        throw new Exception('Access denied');
    }

    $db = Database::getInstance();
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        if (isset($_GET['id'])) {
            $policy = $db->fetchOne(
                "SELECT * FROM time_tracking_policies WHERE id = $1 AND company_id = $2",
                [$_GET['id'], $companyId]
            );

            if (!$policy) {
                throw new Exception('Policy not found');
            }

            echo json_encode([
                'success' => true,
                'data' => ['policy' => $policy]
            ]);
        } else {
            $policies = $db->fetchAll(
                "SELECT * FROM time_tracking_policies WHERE company_id = $1 ORDER BY name",
                [$companyId]
            );

            echo json_encode([
                'success' => true,
                'data' => [
                    'policies' => $policies,
                    'count' => count($policies)
                ]
            ]);
        }
    }

    elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['name'])) {
            throw new Exception('Policy name is required');
        }

        $result = $db->fetchOne(
            "INSERT INTO time_tracking_policies (
                company_id, name, description,
                require_screenshots, screenshot_interval_minutes, screenshot_blur_level,
                require_geofence, allowed_geofences,
                idle_timeout_minutes, auto_pause_on_idle, min_activity_threshold,
                require_approval, approval_threshold_hours, auto_approve_after_days,
                require_break_tracking, max_continuous_hours,
                overtime_threshold_hours, overtime_multiplier,
                applies_to_all_users, applies_to_users, applies_to_projects,
                is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
            RETURNING id",
            [
                $companyId,
                $input['name'],
                $input['description'] ?? null,
                $input['require_screenshots'] ?? false,
                $input['screenshot_interval_minutes'] ?? 15,
                $input['screenshot_blur_level'] ?? 0,
                $input['require_geofence'] ?? false,
                isset($input['allowed_geofences']) ? '{' . implode(',', $input['allowed_geofences']) . '}' : null,
                $input['idle_timeout_minutes'] ?? 10,
                $input['auto_pause_on_idle'] ?? true,
                $input['min_activity_threshold'] ?? 20,
                $input['require_approval'] ?? false,
                $input['approval_threshold_hours'] ?? 8.0,
                $input['auto_approve_after_days'] ?? 7,
                $input['require_break_tracking'] ?? false,
                $input['max_continuous_hours'] ?? 4.0,
                $input['overtime_threshold_hours'] ?? 8.0,
                $input['overtime_multiplier'] ?? 1.5,
                $input['applies_to_all_users'] ?? true,
                isset($input['applies_to_users']) ? '{' . implode(',', $input['applies_to_users']) . '}' : null,
                isset($input['applies_to_projects']) ? '{' . implode(',', $input['applies_to_projects']) . '}' : null,
                $input['is_active'] ?? true
            ]
        );

        $policy = $db->fetchOne("SELECT * FROM time_tracking_policies WHERE id = $1", [$result['id']]);

        echo json_encode([
            'success' => true,
            'data' => [
                'policy_id' => $result['id'],
                'policy' => $policy
            ],
            'message' => 'Policy created successfully'
        ]);
    }

    elseif ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['id'])) {
            throw new Exception('Policy ID is required');
        }

        $fields = [];
        $params = [];
        $paramCount = 0;

        $allowedFields = [
            'name', 'description', 'require_screenshots', 'screenshot_interval_minutes',
            'screenshot_blur_level', 'require_geofence', 'idle_timeout_minutes',
            'auto_pause_on_idle', 'min_activity_threshold', 'require_approval',
            'approval_threshold_hours', 'auto_approve_after_days', 'require_break_tracking',
            'max_continuous_hours', 'overtime_threshold_hours', 'overtime_multiplier',
            'applies_to_all_users', 'is_active'
        ];

        foreach ($allowedFields as $field) {
            if (isset($input[$field])) {
                $paramCount++;
                $fields[] = "$field = $$paramCount";
                $params[] = $input[$field];
            }
        }

        foreach (['allowed_geofences', 'applies_to_users', 'applies_to_projects'] as $arrayField) {
            if (isset($input[$arrayField])) {
                $paramCount++;
                $fields[] = "$arrayField = $$paramCount";
                $params[] = '{' . implode(',', $input[$arrayField]) . '}';
            }
        }

        if (!empty($fields)) {
            $fields[] = 'updated_at = NOW()';
            $paramCount++;
            $params[] = $input['id'];
            $idParam = $paramCount;
            $paramCount++;
            $params[] = $companyId;
            $companyParam = $paramCount;

            $setClause = implode(', ', $fields);
            $db->query(
                "UPDATE time_tracking_policies SET $setClause WHERE id = $$idParam AND company_id = $$companyParam",
                $params
            );
        }

        $policy = $db->fetchOne("SELECT * FROM time_tracking_policies WHERE id = $1", [$input['id']]);

        echo json_encode([
            'success' => true,
            'data' => ['policy' => $policy],
            'message' => 'Policy updated successfully'
        ]);
    }

    elseif ($method === 'DELETE') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['id'])) {
            throw new Exception('Policy ID is required');
        }

        $db->query(
            "DELETE FROM time_tracking_policies WHERE id = $1 AND company_id = $2",
            [$input['id'], $companyId]
        );

        echo json_encode([
            'success' => true,
            'message' => 'Policy deleted successfully'
        ]);
    }

} catch (Exception $e) {
    $code = is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
