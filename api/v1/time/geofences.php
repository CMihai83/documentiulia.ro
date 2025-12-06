<?php
/**
 * Geofence Management API
 *
 * Endpoints:
 * GET    /geofences           - List all geofences
 * GET    /geofences?id=xxx    - Get single geofence
 * POST   /geofences           - Create geofence
 * PUT    /geofences           - Update geofence
 * DELETE /geofences           - Delete geofence
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
    // Authenticate user
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

    // GET - List geofences or get single
    if ($method === 'GET') {
        if (isset($_GET['id'])) {
            $geofence = $db->fetchOne(
                "SELECT * FROM geofences WHERE id = $1 AND company_id = $2",
                [$_GET['id'], $companyId]
            );

            if (!$geofence) {
                throw new Exception('Geofence not found');
            }

            echo json_encode([
                'success' => true,
                'data' => ['geofence' => $geofence]
            ]);
        } else {
            $geofences = $db->fetchAll(
                "SELECT * FROM geofences WHERE company_id = $1 ORDER BY name",
                [$companyId]
            );

            echo json_encode([
                'success' => true,
                'data' => [
                    'geofences' => $geofences,
                    'count' => count($geofences)
                ]
            ]);
        }
    }

    // POST - Create geofence
    elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['name'])) {
            throw new Exception('Name is required');
        }

        if (!isset($input['center_lat']) || !isset($input['center_lng'])) {
            throw new Exception('Location coordinates are required');
        }

        if (empty($input['radius_meters']) || $input['radius_meters'] <= 0) {
            throw new Exception('Valid radius is required');
        }

        $result = $db->fetchOne(
            "INSERT INTO geofences (
                company_id, name, description, center_lat, center_lng,
                radius_meters, is_active, allowed_projects, requires_geofence
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id",
            [
                $companyId,
                $input['name'],
                $input['description'] ?? null,
                $input['center_lat'],
                $input['center_lng'],
                $input['radius_meters'],
                $input['is_active'] ?? true,
                isset($input['allowed_projects']) ? '{' . implode(',', $input['allowed_projects']) . '}' : null,
                $input['requires_geofence'] ?? false
            ]
        );

        $geofence = $db->fetchOne(
            "SELECT * FROM geofences WHERE id = $1",
            [$result['id']]
        );

        echo json_encode([
            'success' => true,
            'data' => [
                'geofence_id' => $result['id'],
                'geofence' => $geofence
            ],
            'message' => 'Geofence created successfully'
        ]);
    }

    // PUT - Update geofence
    elseif ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['id'])) {
            throw new Exception('Geofence ID is required');
        }

        $fields = [];
        $params = [];
        $paramCount = 0;

        $allowedFields = [
            'name', 'description', 'center_lat', 'center_lng',
            'radius_meters', 'is_active', 'requires_geofence'
        ];

        foreach ($allowedFields as $field) {
            if (isset($input[$field])) {
                $paramCount++;
                $fields[] = "$field = $$paramCount";
                $params[] = $input[$field];
            }
        }

        if (isset($input['allowed_projects'])) {
            $paramCount++;
            $fields[] = "allowed_projects = $$paramCount";
            $params[] = '{' . implode(',', $input['allowed_projects']) . '}';
        }

        if (empty($fields)) {
            throw new Exception('No fields to update');
        }

        $fields[] = 'updated_at = NOW()';

        $paramCount++;
        $params[] = $input['id'];
        $idParam = $paramCount;

        $paramCount++;
        $params[] = $companyId;
        $companyParam = $paramCount;

        $setClause = implode(', ', $fields);
        $db->query(
            "UPDATE geofences SET $setClause WHERE id = $$idParam AND company_id = $$companyParam",
            $params
        );

        $geofence = $db->fetchOne(
            "SELECT * FROM geofences WHERE id = $1",
            [$input['id']]
        );

        echo json_encode([
            'success' => true,
            'data' => ['geofence' => $geofence],
            'message' => 'Geofence updated successfully'
        ]);
    }

    // DELETE - Delete geofence
    elseif ($method === 'DELETE') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['id'])) {
            throw new Exception('Geofence ID is required');
        }

        $db->query(
            "DELETE FROM geofences WHERE id = $1 AND company_id = $2",
            [$input['id'], $companyId]
        );

        echo json_encode([
            'success' => true,
            'message' => 'Geofence deleted successfully'
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
