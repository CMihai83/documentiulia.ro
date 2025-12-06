<?php
/**
 * Tax Codes Endpoint
 * GET /api/v1/tax/codes.php
 * Returns Romanian tax codes and classifications
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    // Authenticate
    $authHeader = getHeader('authorization', '') ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    $db = Database::getInstance();

    // Check if tax_codes table exists
    $tableExists = $db->fetchOne(
        "SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_name = 'tax_codes'
        ) as exists"
    );

    if ($tableExists['exists'] === true || $tableExists['exists'] === 't') {
        $taxCodes = $db->fetchAll(
            "SELECT code, name as name_ro, name as name_en, rate, tax_type as category, is_active
             FROM tax_codes
             WHERE is_active = true
             ORDER BY code ASC"
        );
    } else {
        // Return standard Romanian tax codes
        $taxCodes = [
            [
                'code' => 'TVA_19',
                'name_ro' => 'TVA Standard 19%',
                'name_en' => 'Standard VAT 19%',
                'rate' => 19.00,
                'category' => 'standard',
                'is_active' => true
            ],
            [
                'code' => 'TVA_9',
                'name_ro' => 'TVA Redus 9%',
                'name_en' => 'Reduced VAT 9%',
                'rate' => 9.00,
                'category' => 'reduced',
                'is_active' => true
            ],
            [
                'code' => 'TVA_5',
                'name_ro' => 'TVA Redus 5%',
                'name_en' => 'Reduced VAT 5%',
                'rate' => 5.00,
                'category' => 'reduced',
                'is_active' => true
            ],
            [
                'code' => 'TVA_0',
                'name_ro' => 'TVA 0% (Export/Intra-UE)',
                'name_en' => 'VAT 0% (Export/Intra-EU)',
                'rate' => 0.00,
                'category' => 'zero',
                'is_active' => true
            ],
            [
                'code' => 'SCUTIT',
                'name_ro' => 'Scutit de TVA',
                'name_en' => 'VAT Exempt',
                'rate' => 0.00,
                'category' => 'exempt',
                'is_active' => true
            ],
            [
                'code' => 'NEINREG',
                'name_ro' => 'Neînregistrat în scopuri de TVA',
                'name_en' => 'Not VAT registered',
                'rate' => 0.00,
                'category' => 'not_registered',
                'is_active' => true
            ],
            [
                'code' => 'IMPOZIT_PROFIT_16',
                'name_ro' => 'Impozit pe profit 16%',
                'name_en' => 'Corporate Tax 16%',
                'rate' => 16.00,
                'category' => 'corporate',
                'is_active' => true
            ],
            [
                'code' => 'IMPOZIT_MICRO_1',
                'name_ro' => 'Impozit microîntreprindere 1%',
                'name_en' => 'Micro-enterprise Tax 1%',
                'rate' => 1.00,
                'category' => 'micro',
                'is_active' => true
            ],
            [
                'code' => 'IMPOZIT_MICRO_3',
                'name_ro' => 'Impozit microîntreprindere 3%',
                'name_en' => 'Micro-enterprise Tax 3%',
                'rate' => 3.00,
                'category' => 'micro',
                'is_active' => true
            ],
            [
                'code' => 'IMPOZIT_DIVID_8',
                'name_ro' => 'Impozit pe dividende 8%',
                'name_en' => 'Dividend Tax 8%',
                'rate' => 8.00,
                'category' => 'dividend',
                'is_active' => true
            ],
            [
                'code' => 'CAS_25',
                'name_ro' => 'Contribuție asigurări sociale 25%',
                'name_en' => 'Social Insurance Contribution 25%',
                'rate' => 25.00,
                'category' => 'social',
                'is_active' => true
            ],
            [
                'code' => 'CASS_10',
                'name_ro' => 'Contribuție asigurări sănătate 10%',
                'name_en' => 'Health Insurance Contribution 10%',
                'rate' => 10.00,
                'category' => 'health',
                'is_active' => true
            ]
        ];
    }

    echo json_encode([
        'success' => true,
        'data' => $taxCodes
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
