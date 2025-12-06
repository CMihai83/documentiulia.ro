<?php
/**
 * Duplicate Expense Detection API
 * Checks for potential duplicate expenses before saving
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
$date = $input['expense_date'] ?? $input['date'] ?? null;
$vendor = $input['vendor'] ?? null;
$description = $input['description'] ?? null;

if (!$amount || !$date) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Amount and date are required']);
    exit;
}

$db = getDbConnection();

try {
    // Check for exact matches
    $exactMatches = [];
    $stmt = $db->prepare("
        SELECT id, description, vendor, amount, expense_date, category, created_at
        FROM expenses
        WHERE company_id = :company_id
        AND amount = :amount
        AND expense_date = :date
    ");
    $stmt->execute(['company_id' => $companyId, 'amount' => $amount, 'date' => $date]);
    $exactMatches = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Check for similar matches (same amount, different date within 7 days)
    $similarMatches = [];
    $stmt = $db->prepare("
        SELECT id, description, vendor, amount, expense_date, category, created_at
        FROM expenses
        WHERE company_id = :company_id
        AND amount = :amount
        AND expense_date != :date
        AND ABS(EXTRACT(EPOCH FROM (expense_date::date - :date::date))) <= 86400 * 7
        ORDER BY expense_date DESC
        LIMIT 5
    ");
    $stmt->execute(['company_id' => $companyId, 'amount' => $amount, 'date' => $date]);
    $similarMatches = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Check for vendor duplicates (same vendor, same day)
    $vendorMatches = [];
    if ($vendor) {
        $stmt = $db->prepare("
            SELECT id, description, vendor, amount, expense_date, category, created_at
            FROM expenses
            WHERE company_id = :company_id
            AND LOWER(vendor) = LOWER(:vendor)
            AND expense_date = :date
            LIMIT 5
        ");
        $stmt->execute(['company_id' => $companyId, 'vendor' => $vendor, 'date' => $date]);
        $vendorMatches = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Calculate duplicate risk score
    $duplicateRisk = 'low';
    $riskScore = 0;

    if (count($exactMatches) > 0) {
        $duplicateRisk = 'high';
        $riskScore = 95;
    } elseif (count($similarMatches) > 0 && count($vendorMatches) > 0) {
        $duplicateRisk = 'high';
        $riskScore = 80;
    } elseif (count($similarMatches) > 0 || count($vendorMatches) > 0) {
        $duplicateRisk = 'medium';
        $riskScore = 50;
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'duplicate_risk' => $duplicateRisk,
            'risk_score' => $riskScore,
            'exact_matches' => $exactMatches,
            'similar_matches' => $similarMatches,
            'vendor_matches' => $vendorMatches,
            'recommendation_ro' => getDuplicateRecommendationRo($duplicateRisk, $exactMatches, $similarMatches),
            'recommendation_en' => getDuplicateRecommendationEn($duplicateRisk, $exactMatches, $similarMatches),
        ],
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error']);
}

function getDuplicateRecommendationRo(string $risk, array $exact, array $similar): string {
    if ($risk === 'high' && count($exact) > 0) {
        return 'Atenție! Această cheltuială pare să fie duplicată. O cheltuială identică există deja în sistem.';
    }
    if ($risk === 'high') {
        return 'Posibilă cheltuială duplicată detectată. Verificați detaliile înainte de salvare.';
    }
    if ($risk === 'medium') {
        return 'Există cheltuieli similare în perioada apropiată. Verificați dacă nu este o duplicare.';
    }
    return 'Nu s-au găsit cheltuieli duplicate.';
}

function getDuplicateRecommendationEn(string $risk, array $exact, array $similar): string {
    if ($risk === 'high' && count($exact) > 0) {
        return 'Warning! This expense appears to be a duplicate. An identical expense already exists.';
    }
    if ($risk === 'high') {
        return 'Possible duplicate expense detected. Please verify details before saving.';
    }
    if ($risk === 'medium') {
        return 'Similar expenses found in nearby dates. Please check for duplicates.';
    }
    return 'No duplicate expenses found.';
}
