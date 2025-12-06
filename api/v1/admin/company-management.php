<?php
/**
 * Company Management API
 * Admin tools for managing companies/organizations
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
        'error_ro' => 'Doar administratorii pot gestiona companiile',
        'error' => 'Only administrators can manage companies'
    ]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// Company statuses
$companyStatuses = [
    'active' => ['ro' => 'Activă', 'en' => 'Active', 'color' => '#4CAF50'],
    'trial' => ['ro' => 'Perioadă de probă', 'en' => 'Trial', 'color' => '#2196F3'],
    'suspended' => ['ro' => 'Suspendată', 'en' => 'Suspended', 'color' => '#F44336'],
    'cancelled' => ['ro' => 'Anulată', 'en' => 'Cancelled', 'color' => '#9E9E9E'],
    'pending' => ['ro' => 'În așteptare', 'en' => 'Pending', 'color' => '#FF9800'],
];

// Company types
$companyTypes = [
    'srl' => ['ro' => 'SRL', 'en' => 'LLC'],
    'sa' => ['ro' => 'SA', 'en' => 'JSC'],
    'pfa' => ['ro' => 'PFA', 'en' => 'Sole Proprietor'],
    'ii' => ['ro' => 'II', 'en' => 'Individual Enterprise'],
    'if' => ['ro' => 'IF', 'en' => 'Family Enterprise'],
    'ong' => ['ro' => 'ONG', 'en' => 'NGO'],
    'other' => ['ro' => 'Altele', 'en' => 'Other'],
];

// Subscription plans
$subscriptionPlans = [
    'free' => ['ro' => 'Gratuit', 'en' => 'Free', 'price' => 0],
    'starter' => ['ro' => 'Început', 'en' => 'Starter', 'price' => 49],
    'professional' => ['ro' => 'Profesional', 'en' => 'Professional', 'price' => 99],
    'business' => ['ro' => 'Business', 'en' => 'Business', 'price' => 199],
    'enterprise' => ['ro' => 'Enterprise', 'en' => 'Enterprise', 'price' => 499],
];

// Industry sectors
$industrySectors = [
    'retail' => ['ro' => 'Retail', 'en' => 'Retail'],
    'services' => ['ro' => 'Servicii', 'en' => 'Services'],
    'manufacturing' => ['ro' => 'Producție', 'en' => 'Manufacturing'],
    'construction' => ['ro' => 'Construcții', 'en' => 'Construction'],
    'it' => ['ro' => 'IT & Software', 'en' => 'IT & Software'],
    'transport' => ['ro' => 'Transport', 'en' => 'Transport'],
    'hospitality' => ['ro' => 'Ospitalitate', 'en' => 'Hospitality'],
    'healthcare' => ['ro' => 'Sănătate', 'en' => 'Healthcare'],
    'education' => ['ro' => 'Educație', 'en' => 'Education'],
    'finance' => ['ro' => 'Finanțe', 'en' => 'Finance'],
    'agriculture' => ['ro' => 'Agricultură', 'en' => 'Agriculture'],
    'other' => ['ro' => 'Altele', 'en' => 'Other'],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? 'list';

            if ($action === 'list') {
                $status = $_GET['status'] ?? null;
                $plan = $_GET['plan'] ?? null;
                $search = $_GET['search'] ?? null;
                $limit = intval($_GET['limit'] ?? 50);
                $offset = intval($_GET['offset'] ?? 0);

                $sql = "
                    SELECT c.*,
                           (SELECT COUNT(*) FROM company_users cu WHERE cu.company_id = c.id AND cu.status = 'active') as user_count
                    FROM companies c
                    WHERE 1=1
                ";
                $params = [];

                if ($status) {
                    $sql .= " AND c.status = :status";
                    $params['status'] = $status;
                }
                if ($plan) {
                    $sql .= " AND c.subscription_plan = :plan";
                    $params['plan'] = $plan;
                }
                if ($search) {
                    $sql .= " AND (c.name ILIKE :search OR c.cui ILIKE :search OR c.email ILIKE :search)";
                    $params['search'] = "%$search%";
                }

                $sql .= " ORDER BY c.created_at DESC LIMIT $limit OFFSET $offset";

                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                $companies = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($companies as &$company) {
                    $company['status_config'] = $companyStatuses[$company['status']] ?? null;
                    $company['type_config'] = $companyTypes[$company['company_type']] ?? null;
                    $company['plan_config'] = $subscriptionPlans[$company['subscription_plan']] ?? null;
                    $company['settings'] = json_decode($company['settings'] ?? '{}', true);
                }

                // Total count
                $stmt = $db->query("SELECT COUNT(*) FROM companies");
                $total = $stmt->fetchColumn();

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'companies' => $companies,
                        'total' => intval($total),
                        'limit' => $limit,
                        'offset' => $offset,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'get') {
                $companyId = $_GET['id'] ?? null;

                if (!$companyId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Company ID required']);
                    exit;
                }

                $stmt = $db->prepare("SELECT * FROM companies WHERE id = :id");
                $stmt->execute(['id' => $companyId]);
                $company = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$company) {
                    http_response_code(404);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Compania nu a fost găsită',
                        'error' => 'Company not found'
                    ]);
                    exit;
                }

                $company['status_config'] = $companyStatuses[$company['status']] ?? null;
                $company['type_config'] = $companyTypes[$company['company_type']] ?? null;
                $company['plan_config'] = $subscriptionPlans[$company['subscription_plan']] ?? null;
                $company['settings'] = json_decode($company['settings'] ?? '{}', true);
                $company['features'] = json_decode($company['enabled_features'] ?? '[]', true);

                // Get users
                $stmt = $db->prepare("
                    SELECT u.id, u.email, u.first_name, u.last_name, cu.role, cu.status, cu.joined_at
                    FROM users u
                    JOIN company_users cu ON u.id = cu.user_id
                    WHERE cu.company_id = :company_id
                    ORDER BY cu.joined_at DESC
                ");
                $stmt->execute(['company_id' => $companyId]);
                $company['users'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Get usage statistics
                $company['usage'] = getCompanyUsage($db, $companyId);

                echo json_encode([
                    'success' => true,
                    'data' => $company,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'stats') {
                // Platform statistics
                $stmt = $db->query("
                    SELECT
                        COUNT(*) as total_companies,
                        COUNT(*) FILTER (WHERE status = 'active') as active,
                        COUNT(*) FILTER (WHERE status = 'trial') as trial,
                        COUNT(*) FILTER (WHERE status = 'suspended') as suspended,
                        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_30d
                    FROM companies
                ");
                $stats = $stmt->fetch(PDO::FETCH_ASSOC);

                // By plan
                $stmt = $db->query("
                    SELECT subscription_plan, COUNT(*) as count
                    FROM companies WHERE status = 'active'
                    GROUP BY subscription_plan ORDER BY count DESC
                ");
                $byPlan = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // By industry
                $stmt = $db->query("
                    SELECT industry, COUNT(*) as count
                    FROM companies WHERE status = 'active' AND industry IS NOT NULL
                    GROUP BY industry ORDER BY count DESC LIMIT 10
                ");
                $byIndustry = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Total users
                $stmt = $db->query("SELECT COUNT(*) FROM users WHERE status = 'active'");
                $stats['total_users'] = intval($stmt->fetchColumn());

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'summary' => $stats,
                        'by_plan' => $byPlan,
                        'by_industry' => $byIndustry,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'types') {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'statuses' => $companyStatuses,
                        'types' => $companyTypes,
                        'plans' => $subscriptionPlans,
                        'industries' => $industrySectors,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            $action = $input['action'] ?? 'create';

            if ($action === 'create') {
                $name = $input['name'] ?? null;
                $cui = $input['cui'] ?? null;

                if (!$name) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Company name is required']);
                    exit;
                }

                $companyId = 'comp_' . bin2hex(random_bytes(8));

                $stmt = $db->prepare("
                    INSERT INTO companies (
                        id, name, cui, reg_com, company_type, address, city, county, country,
                        email, phone, website, industry, subscription_plan, status, trial_ends_at, created_at
                    ) VALUES (
                        :id, :name, :cui, :reg_com, :type, :address, :city, :county, :country,
                        :email, :phone, :website, :industry, :plan, 'trial', NOW() + INTERVAL '14 days', NOW()
                    )
                ");
                $stmt->execute([
                    'id' => $companyId,
                    'name' => $name,
                    'cui' => $cui,
                    'reg_com' => $input['reg_com'] ?? null,
                    'type' => $input['company_type'] ?? 'srl',
                    'address' => $input['address'] ?? null,
                    'city' => $input['city'] ?? null,
                    'county' => $input['county'] ?? null,
                    'country' => $input['country'] ?? 'Romania',
                    'email' => $input['email'] ?? null,
                    'phone' => $input['phone'] ?? null,
                    'website' => $input['website'] ?? null,
                    'industry' => $input['industry'] ?? null,
                    'plan' => $input['subscription_plan'] ?? 'free',
                ]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Compania a fost creată',
                    'message_en' => 'Company created',
                    'data' => ['id' => $companyId],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'activate') {
                $companyId = $input['company_id'] ?? null;

                if (!$companyId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Company ID required']);
                    exit;
                }

                $stmt = $db->prepare("UPDATE companies SET status = 'active', activated_at = NOW() WHERE id = :id");
                $stmt->execute(['id' => $companyId]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Compania a fost activată',
                    'message_en' => 'Company activated',
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'suspend') {
                $companyId = $input['company_id'] ?? null;
                $reason = $input['reason'] ?? null;

                if (!$companyId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Company ID required']);
                    exit;
                }

                $stmt = $db->prepare("UPDATE companies SET status = 'suspended', suspension_reason = :reason, suspended_at = NOW() WHERE id = :id");
                $stmt->execute(['id' => $companyId, 'reason' => $reason]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Compania a fost suspendată',
                    'message_en' => 'Company suspended',
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'upgrade') {
                $companyId = $input['company_id'] ?? null;
                $newPlan = $input['plan'] ?? null;

                if (!$companyId || !$newPlan) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Company ID and plan required']);
                    exit;
                }

                $stmt = $db->prepare("UPDATE companies SET subscription_plan = :plan, plan_changed_at = NOW() WHERE id = :id");
                $stmt->execute(['id' => $companyId, 'plan' => $newPlan]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Abonamentul a fost actualizat',
                    'message_en' => 'Subscription updated',
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'extend_trial') {
                $companyId = $input['company_id'] ?? null;
                $days = intval($input['days'] ?? 14);

                if (!$companyId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Company ID required']);
                    exit;
                }

                $stmt = $db->prepare("UPDATE companies SET trial_ends_at = trial_ends_at + INTERVAL '$days days' WHERE id = :id");
                $stmt->execute(['id' => $companyId]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => "Perioada de probă a fost extinsă cu $days zile",
                    'message_en' => "Trial extended by $days days",
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'toggle_feature') {
                $companyId = $input['company_id'] ?? null;
                $feature = $input['feature'] ?? null;
                $enabled = $input['enabled'] ?? true;

                if (!$companyId || !$feature) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Company ID and feature required']);
                    exit;
                }

                // Get current features
                $stmt = $db->prepare("SELECT enabled_features FROM companies WHERE id = :id");
                $stmt->execute(['id' => $companyId]);
                $features = json_decode($stmt->fetchColumn() ?? '[]', true);

                if ($enabled && !in_array($feature, $features)) {
                    $features[] = $feature;
                } elseif (!$enabled) {
                    $features = array_filter($features, fn($f) => $f !== $feature);
                }

                $stmt = $db->prepare("UPDATE companies SET enabled_features = :features WHERE id = :id");
                $stmt->execute(['id' => $companyId, 'features' => json_encode(array_values($features))]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => $enabled ? 'Funcționalitatea a fost activată' : 'Funcționalitatea a fost dezactivată',
                    'message_en' => $enabled ? 'Feature enabled' : 'Feature disabled',
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            $companyId = $input['company_id'] ?? null;

            if (!$companyId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Company ID required']);
                exit;
            }

            $updateFields = [];
            $params = ['id' => $companyId];

            $allowedFields = ['name', 'cui', 'reg_com', 'company_type', 'address', 'city', 'county',
                            'country', 'email', 'phone', 'website', 'industry', 'subscription_plan', 'status'];

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

            $sql = "UPDATE companies SET " . implode(', ', $updateFields) . ", updated_at = NOW() WHERE id = :id";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Compania a fost actualizată',
                'message_en' => 'Company updated',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}

function getCompanyUsage($db, $companyId) {
    $usage = [];

    // Invoice count
    $stmt = $db->prepare("SELECT COUNT(*) FROM invoices WHERE company_id = :id");
    $stmt->execute(['id' => $companyId]);
    $usage['invoices'] = intval($stmt->fetchColumn());

    // Contact count
    $stmt = $db->prepare("SELECT COUNT(*) FROM contacts WHERE company_id = :id");
    $stmt->execute(['id' => $companyId]);
    $usage['contacts'] = intval($stmt->fetchColumn());

    // Product count
    $stmt = $db->prepare("SELECT COUNT(*) FROM products WHERE company_id = :id");
    $stmt->execute(['id' => $companyId]);
    $usage['products'] = intval($stmt->fetchColumn());

    // Storage used (approximate)
    $stmt = $db->prepare("SELECT COUNT(*) FROM documents WHERE company_id = :id");
    $stmt->execute(['id' => $companyId]);
    $usage['documents'] = intval($stmt->fetchColumn());

    return $usage;
}
