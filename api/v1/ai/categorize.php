<?php
/**
 * AI Transaction Categorization API
 * Automatically categorizes transactions based on description, vendor, amount
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

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';

$user = authenticate();
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
$input = json_decode(file_get_contents('php://input'), true);

$description = $input['description'] ?? '';
$vendor = $input['vendor'] ?? '';
$amount = floatval($input['amount'] ?? 0);
$type = $input['type'] ?? 'expense'; // expense or income

// Romanian category patterns for expenses
$expenseCategories = [
    'transport' => [
        'patterns' => ['uber', 'bolt', 'taxi', 'benzină', 'motorină', 'carburant', 'parcare', 'autostradă', 'rovinieta', 'metrou', 'cfr', 'tren', 'avion', 'bilet'],
        'name_ro' => 'Transport',
        'name_en' => 'Transportation',
        'tax_deductible' => true,
        'vat_deductible' => true,
    ],
    'office_supplies' => [
        'patterns' => ['papetărie', 'birou', 'hârtie', 'toner', 'cartușe', 'pixuri', 'dosare', 'office', 'staples', 'emag', 'altex'],
        'name_ro' => 'Rechizite birou',
        'name_en' => 'Office Supplies',
        'tax_deductible' => true,
        'vat_deductible' => true,
    ],
    'utilities' => [
        'patterns' => ['enel', 'engie', 'digi', 'vodafone', 'orange', 'telekom', 'electric', 'gaz', 'apă', 'internet', 'telefon', 'curent'],
        'name_ro' => 'Utilități',
        'name_en' => 'Utilities',
        'tax_deductible' => true,
        'vat_deductible' => true,
    ],
    'rent' => [
        'patterns' => ['chirie', 'rent', 'închiriere', 'spațiu', 'birou', 'sediu'],
        'name_ro' => 'Chirie',
        'name_en' => 'Rent',
        'tax_deductible' => true,
        'vat_deductible' => true,
    ],
    'software' => [
        'patterns' => ['software', 'licență', 'microsoft', 'adobe', 'google', 'aws', 'hosting', 'domeniu', 'saas', 'subscripție', 'subscription'],
        'name_ro' => 'Software și licențe',
        'name_en' => 'Software & Licenses',
        'tax_deductible' => true,
        'vat_deductible' => true,
    ],
    'marketing' => [
        'patterns' => ['facebook', 'google ads', 'marketing', 'publicitate', 'reclamă', 'promovare', 'seo', 'social media'],
        'name_ro' => 'Marketing și publicitate',
        'name_en' => 'Marketing & Advertising',
        'tax_deductible' => true,
        'vat_deductible' => true,
    ],
    'meals' => [
        'patterns' => ['restaurant', 'masă', 'prânz', 'cină', 'cafea', 'food', 'delivery', 'tazz', 'glovo', 'foodpanda'],
        'name_ro' => 'Mese și protocol',
        'name_en' => 'Meals & Entertainment',
        'tax_deductible' => true,
        'vat_deductible' => false, // Limited VAT deduction for meals
        'deduction_limit' => 0.5, // 50% deductible
    ],
    'professional_services' => [
        'patterns' => ['contabil', 'avocat', 'consultant', 'notar', 'audit', 'servicii', 'consultanță'],
        'name_ro' => 'Servicii profesionale',
        'name_en' => 'Professional Services',
        'tax_deductible' => true,
        'vat_deductible' => true,
    ],
    'insurance' => [
        'patterns' => ['asigurare', 'casco', 'rca', 'allianz', 'omniasig', 'groupama', 'euroins'],
        'name_ro' => 'Asigurări',
        'name_en' => 'Insurance',
        'tax_deductible' => true,
        'vat_deductible' => false,
    ],
    'equipment' => [
        'patterns' => ['laptop', 'computer', 'echipament', 'imprimantă', 'monitor', 'tastatură', 'mouse', 'scaun', 'birou', 'mobilă'],
        'name_ro' => 'Echipamente',
        'name_en' => 'Equipment',
        'tax_deductible' => true,
        'vat_deductible' => true,
        'is_asset' => true,
    ],
    'training' => [
        'patterns' => ['curs', 'training', 'conferință', 'seminar', 'certificare', 'educație', 'workshop'],
        'name_ro' => 'Training și educație',
        'name_en' => 'Training & Education',
        'tax_deductible' => true,
        'vat_deductible' => true,
    ],
    'bank_fees' => [
        'patterns' => ['comision', 'bancă', 'transfer', 'ing', 'brd', 'bcr', 'raiffeisen', 'bt', 'unicredit'],
        'name_ro' => 'Comisioane bancare',
        'name_en' => 'Bank Fees',
        'tax_deductible' => true,
        'vat_deductible' => false,
    ],
    'travel' => [
        'patterns' => ['hotel', 'cazare', 'booking', 'airbnb', 'delegație', 'diurnă', 'travel'],
        'name_ro' => 'Deplasări și cazare',
        'name_en' => 'Travel & Accommodation',
        'tax_deductible' => true,
        'vat_deductible' => true,
    ],
    'materials' => [
        'patterns' => ['materiale', 'materie primă', 'stoc', 'marfă', 'aprovizionare'],
        'name_ro' => 'Materiale și stocuri',
        'name_en' => 'Materials & Inventory',
        'tax_deductible' => true,
        'vat_deductible' => true,
    ],
];

// Romanian category patterns for income
$incomeCategories = [
    'sales' => [
        'patterns' => ['vânzare', 'factură', 'servicii', 'produs', 'marfă'],
        'name_ro' => 'Vânzări',
        'name_en' => 'Sales',
    ],
    'services' => [
        'patterns' => ['consultanță', 'servicii', 'proiect', 'contract'],
        'name_ro' => 'Servicii prestate',
        'name_en' => 'Services',
    ],
    'interest' => [
        'patterns' => ['dobândă', 'depozit', 'investiție'],
        'name_ro' => 'Dobânzi',
        'name_en' => 'Interest Income',
    ],
    'rent_income' => [
        'patterns' => ['chirie primită', 'închiriere', 'subînchiriere'],
        'name_ro' => 'Venituri din chirii',
        'name_en' => 'Rental Income',
    ],
];

$categories = $type === 'expense' ? $expenseCategories : $incomeCategories;
$searchText = strtolower($description . ' ' . $vendor);

$matchedCategory = null;
$confidence = 0;
$matchedPatterns = [];

foreach ($categories as $categoryId => $category) {
    $categoryScore = 0;
    $matched = [];

    foreach ($category['patterns'] as $pattern) {
        if (strpos($searchText, strtolower($pattern)) !== false) {
            $categoryScore += strlen($pattern); // Longer matches = higher score
            $matched[] = $pattern;
        }
    }

    if ($categoryScore > $confidence) {
        $confidence = $categoryScore;
        $matchedCategory = $categoryId;
        $matchedPatterns = $matched;
    }
}

// Calculate confidence percentage (0-100)
$confidencePercent = min(100, ($confidence / max(strlen($searchText), 1)) * 100);

// If no match found, suggest "other"
if (!$matchedCategory) {
    $matchedCategory = 'other';
    $confidencePercent = 30;
}

$result = [
    'category_id' => $matchedCategory,
    'category_name_ro' => $categories[$matchedCategory]['name_ro'] ?? 'Altele',
    'category_name_en' => $categories[$matchedCategory]['name_en'] ?? 'Other',
    'confidence' => round($confidencePercent),
    'matched_patterns' => $matchedPatterns,
];

// Add tax info for expenses
if ($type === 'expense' && isset($categories[$matchedCategory])) {
    $cat = $categories[$matchedCategory];
    $result['tax_info'] = [
        'tax_deductible' => $cat['tax_deductible'] ?? false,
        'vat_deductible' => $cat['vat_deductible'] ?? false,
        'deduction_limit' => $cat['deduction_limit'] ?? 1.0,
        'is_asset' => $cat['is_asset'] ?? false,
    ];
}

// Get similar past transactions for learning
if ($companyId) {
    try {
        $db = getDbConnection();
        $stmt = $db->prepare("
            SELECT category, COUNT(*) as count
            FROM expenses
            WHERE company_id = :company_id
            AND (LOWER(description) LIKE :search OR LOWER(vendor) LIKE :search)
            AND category IS NOT NULL
            GROUP BY category
            ORDER BY count DESC
            LIMIT 3
        ");
        $stmt->execute([
            'company_id' => $companyId,
            'search' => '%' . strtolower(substr($description, 0, 20)) . '%',
        ]);
        $similar = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if ($similar) {
            $result['suggestions_from_history'] = $similar;
        }
    } catch (Exception $e) {
        // Ignore history lookup errors
    }
}

echo json_encode([
    'success' => true,
    'data' => $result,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
