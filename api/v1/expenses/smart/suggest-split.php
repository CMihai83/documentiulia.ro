<?php
/**
 * Expense Split Suggestion API
 * Suggests how to split expenses between business and personal use
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../middleware/auth.php';

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

$input = json_decode(file_get_contents('php://input'), true);

$amount = floatval($input['amount'] ?? 0);
$category = $input['category'] ?? '';
$description = $input['description'] ?? '';
$vendor = $input['vendor'] ?? '';

if (!$amount) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Amount required']);
    exit;
}

// Define split rules based on Romanian tax law
$splitRules = [
    // Mașină / Vehicle expenses - commonly split 50/50
    'transport' => [
        'keywords' => ['carburant', 'benzină', 'motorină', 'combustibil', 'întreținere auto', 'reparații auto', 'asigurare auto', 'rovinieta'],
        'default_split' => 50,
        'rule_ro' => 'Cheltuielile auto sunt de obicei deductibile 50% pentru utilizare mixtă.',
        'rule_en' => 'Vehicle expenses are typically 50% deductible for mixed use.',
        'tax_note_ro' => 'Conform Codului Fiscal, cheltuielile auto pentru utilizare mixtă sunt limitate la 50%.',
        'tax_note_en' => 'According to the Tax Code, vehicle expenses for mixed use are limited to 50%.',
    ],
    // Mese / Meals - limited deductibility
    'meals' => [
        'keywords' => ['restaurant', 'masă', 'prânz', 'cină', 'protocol', 'cafea', 'catering'],
        'default_split' => 50,
        'rule_ro' => 'Cheltuielile de protocol sunt deductibile limitat (50% sau cu limită fixă).',
        'rule_en' => 'Entertainment expenses have limited deductibility (50% or fixed limit).',
        'tax_note_ro' => 'Cheltuielile de protocol sunt deductibile în limita a 2% din profitul brut contabil.',
        'tax_note_en' => 'Entertainment expenses are deductible up to 2% of gross accounting profit.',
    ],
    // Telefon / Phone - split based on usage
    'utilities' => [
        'keywords' => ['telefon', 'mobil', 'internet', 'abonament', 'digi', 'vodafone', 'orange'],
        'default_split' => 70,
        'rule_ro' => 'Utilitățile pentru uz mixt se deduc proporțional cu utilizarea profesională.',
        'rule_en' => 'Mixed-use utilities are deducted proportionally to business use.',
        'tax_note_ro' => 'Păstrați evidența utilizării pentru a justifica procentul de deducere.',
        'tax_note_en' => 'Keep usage records to justify the deduction percentage.',
    ],
    // Echipamente / Equipment
    'equipment' => [
        'keywords' => ['laptop', 'computer', 'telefon', 'imprimantă', 'echipament'],
        'default_split' => 100,
        'rule_ro' => 'Echipamentele folosite exclusiv pentru afaceri sunt 100% deductibile.',
        'rule_en' => 'Equipment used exclusively for business is 100% deductible.',
        'tax_note_ro' => 'Pentru uz mixt, deducerea se face proporțional cu utilizarea profesională.',
        'tax_note_en' => 'For mixed use, deduction is proportional to business use.',
    ],
    // Chirie / Rent for home office
    'rent' => [
        'keywords' => ['chirie', 'închiriere', 'birou acasă', 'home office'],
        'default_split' => 20,
        'rule_ro' => 'Chiria pentru home office se deduce proporțional cu suprafața folosită.',
        'rule_en' => 'Home office rent is deducted proportionally to the space used.',
        'tax_note_ro' => 'Calculați procentul din suprafața locuinței folosită pentru birou.',
        'tax_note_en' => 'Calculate the percentage of home space used for office.',
    ],
];

// Find matching rule
$matchedRule = null;
$searchText = strtolower($category . ' ' . $description . ' ' . $vendor);

foreach ($splitRules as $ruleCategory => $rule) {
    foreach ($rule['keywords'] as $keyword) {
        if (strpos($searchText, strtolower($keyword)) !== false) {
            $matchedRule = array_merge($rule, ['matched_category' => $ruleCategory]);
            break 2;
        }
    }
}

// Default to 100% business if no rule matches
if (!$matchedRule) {
    $matchedRule = [
        'default_split' => 100,
        'rule_ro' => 'Această cheltuială pare a fi 100% de afaceri.',
        'rule_en' => 'This expense appears to be 100% business.',
        'tax_note_ro' => 'Asigurați-vă că cheltuiala este justificată pentru activitatea companiei.',
        'tax_note_en' => 'Make sure the expense is justified for business activity.',
        'matched_category' => 'business',
    ];
}

// Get historical split for this vendor/category
$db = getDbConnection();
$historicalSplit = null;

try {
    $stmt = $db->prepare("
        SELECT AVG(business_percent) as avg_split
        FROM expenses
        WHERE company_id = :company_id
        AND (
            (vendor IS NOT NULL AND LOWER(vendor) = LOWER(:vendor))
            OR category = :category
        )
        AND business_percent IS NOT NULL
        AND business_percent < 100
        LIMIT 1
    ");
    $stmt->execute(['company_id' => $companyId, 'vendor' => $vendor, 'category' => $category]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($result && $result['avg_split']) {
        $historicalSplit = round(floatval($result['avg_split']), 0);
    }
} catch (Exception $e) {
    // Ignore history lookup errors
}

// Calculate amounts
$suggestedSplit = $historicalSplit ?? $matchedRule['default_split'];
$businessAmount = round($amount * ($suggestedSplit / 100), 2);
$personalAmount = round($amount - $businessAmount, 2);

echo json_encode([
    'success' => true,
    'data' => [
        'original_amount' => $amount,
        'suggested_split' => $suggestedSplit,
        'business_amount' => $businessAmount,
        'personal_amount' => $personalAmount,
        'business_percent' => $suggestedSplit,
        'personal_percent' => 100 - $suggestedSplit,
        'matched_category' => $matchedRule['matched_category'],
        'rule_ro' => $matchedRule['rule_ro'],
        'rule_en' => $matchedRule['rule_en'],
        'tax_note_ro' => $matchedRule['tax_note_ro'],
        'tax_note_en' => $matchedRule['tax_note_en'],
        'historical_split' => $historicalSplit,
        'common_splits' => [
            ['percent' => 100, 'label_ro' => '100% Afaceri', 'label_en' => '100% Business'],
            ['percent' => 75, 'label_ro' => '75% Afaceri', 'label_en' => '75% Business'],
            ['percent' => 50, 'label_ro' => '50% Afaceri', 'label_en' => '50% Business'],
            ['percent' => 25, 'label_ro' => '25% Afaceri', 'label_en' => '25% Business'],
            ['percent' => 0, 'label_ro' => '100% Personal', 'label_en' => '100% Personal'],
        ],
    ],
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
