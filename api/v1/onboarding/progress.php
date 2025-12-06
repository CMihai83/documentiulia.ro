<?php
/**
 * Onboarding Progress Tracking
 * GET /api/v1/onboarding/progress.php - Get onboarding status
 * POST /api/v1/onboarding/progress.php - Update onboarding step
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    // Verify authentication
    $authHeader = getHeader('authorization', '') ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);
    $userId = $userData['user_id'];

    // Get company ID
    $companyId = getHeader('x-company-id') ?? '';
    if (empty($companyId)) {
        throw new Exception('Company ID required');
    }

    $db = Database::getInstance()->getConnection();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Get onboarding status for company
        $stmt = $db->prepare("
            SELECT
                cps.persona_id,
                cps.onboarding_completed,
                cps.selection_method,
                cps.quiz_score,
                cps.created_at as persona_selected_at,
                bp.name_ro as persona_name_ro,
                bp.name_en as persona_name_en,
                bp.icon as persona_icon,
                bp.color as persona_color
            FROM company_persona_settings cps
            LEFT JOIN business_personas bp ON cps.persona_id = bp.id
            WHERE cps.company_id = :company_id
        ");
        $stmt->execute([':company_id' => $companyId]);
        $settings = $stmt->fetch(PDO::FETCH_ASSOC);

        // Get user's onboarding progress (join with steps table to get step details)
        $progressStmt = $db->prepare("
            SELECT
                pos.step_key,
                uop.status,
                uop.completed_at
            FROM user_onboarding_progress uop
            LEFT JOIN persona_onboarding_steps pos ON uop.step_id = pos.id
            WHERE uop.user_id = :user_id AND uop.company_id = :company_id
            ORDER BY uop.completed_at ASC
        ");
        $progressStmt->execute([
            ':user_id' => $userId,
            ':company_id' => $companyId
        ]);
        $progressSteps = $progressStmt->fetchAll(PDO::FETCH_ASSOC);

        // Determine current step - filter for completed steps
        $completedSteps = array_column(array_filter($progressSteps, fn($s) => $s['status'] === 'completed'), 'step_key');
        $allSteps = ['welcome', 'persona_selected', 'company_info', 'first_invoice', 'complete'];

        $currentStep = 'welcome';
        foreach ($allSteps as $step) {
            if (!in_array($step, $completedSteps)) {
                $currentStep = $step;
                break;
            }
        }

        // If persona not selected, force that step
        if (!$settings || !$settings['persona_id']) {
            $currentStep = 'persona_select';
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'is_complete' => $settings['onboarding_completed'] ?? false,
                'current_step' => $currentStep,
                'persona' => $settings ? [
                    'id' => $settings['persona_id'],
                    'name' => $settings['persona_name_ro'],
                    'icon' => $settings['persona_icon'],
                    'color' => $settings['persona_color'],
                    'selection_method' => $settings['selection_method'],
                    'quiz_score' => $settings['quiz_score']
                ] : null,
                'completed_steps' => $completedSteps,
                'progress_percentage' => count($completedSteps) > 0
                    ? round((count($completedSteps) / count($allSteps)) * 100)
                    : 0
            ]
        ]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Update onboarding progress
        $input = json_decode(file_get_contents('php://input'), true);
        $step = $input['step'] ?? '';
        $data = $input['data'] ?? [];

        $validSteps = ['welcome', 'persona_selected', 'company_info', 'first_invoice', 'complete'];
        if (!in_array($step, $validSteps)) {
            throw new Exception('Invalid step');
        }

        // First get the step_id from the step_key
        $stepStmt = $db->prepare("
            SELECT id FROM persona_onboarding_steps
            WHERE step_key = :step_key
            LIMIT 1
        ");
        $stepStmt->execute([':step_key' => $step]);
        $stepRow = $stepStmt->fetch(PDO::FETCH_ASSOC);

        if (!$stepRow) {
            // Create the step if it doesn't exist (for backwards compatibility)
            $createStmt = $db->prepare("
                INSERT INTO persona_onboarding_steps (id, persona_id, step_key, title_ro, title_en, step_order)
                VALUES (uuid_generate_v4(), 'default', :step_key, :title, :title, 0)
                RETURNING id
            ");
            $createStmt->execute([':step_key' => $step, ':title' => ucfirst(str_replace('_', ' ', $step))]);
            $stepRow = $createStmt->fetch(PDO::FETCH_ASSOC);
        }

        $stepId = $stepRow['id'];

        // Insert or update progress using step_id
        $stmt = $db->prepare("
            INSERT INTO user_onboarding_progress (user_id, company_id, step_id, status, completed_at)
            VALUES (:user_id, :company_id, :step_id, 'completed', NOW())
            ON CONFLICT (user_id, company_id, step_id) DO UPDATE SET
                status = 'completed',
                completed_at = NOW()
        ");

        $stmt->execute([
            ':user_id' => $userId,
            ':company_id' => $companyId,
            ':step_id' => $stepId
        ]);

        // If all steps complete, mark onboarding as complete
        if ($step === 'complete') {
            $updateStmt = $db->prepare("
                UPDATE company_persona_settings
                SET onboarding_completed = true, updated_at = NOW()
                WHERE company_id = :company_id
            ");
            $updateStmt->execute([':company_id' => $companyId]);
        }

        echo json_encode([
            'success' => true,
            'message' => 'Progress updated',
            'data' => [
                'step' => $step,
                'completed_at' => date('Y-m-d H:i:s')
            ]
        ]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
