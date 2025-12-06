<?php
/**
 * Romanian Tax Calculator API
 * POST /api/v1/tax/calculate.php
 *
 * Calculates various Romanian taxes based on type
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../services/RomanianTaxService.php';

header('Content-Type: application/json');

try {
    $auth = authenticate();
    $pdo = Database::getInstance()->getConnection();

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Method not allowed', 405);
    }

    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || !isset($input['type'])) {
        throw new Exception('Missing calculation type', 400);
    }

    $taxService = RomanianTaxService::getInstance();
    $result = null;

    switch ($input['type']) {
        case 'salary':
            // Calculate salary taxes
            if (!isset($input['gross_salary'])) {
                throw new Exception('Missing gross_salary parameter');
            }
            $options = [
                'deductions' => $input['deductions'] ?? [],
                'is_it_worker' => $input['is_it_worker'] ?? false,
                'has_dependents' => $input['has_dependents'] ?? 0,
                'is_part_time' => $input['is_part_time'] ?? false,
                'hours_per_week' => $input['hours_per_week'] ?? 40
            ];
            $result = $taxService->calculateSalary((float)$input['gross_salary'], $options);
            break;

        case 'pfa':
            // Calculate PFA taxes
            if (!isset($input['annual_income'])) {
                throw new Exception('Missing annual_income parameter');
            }
            $options = [
                'pay_cas' => $input['pay_cas'] ?? true,
                'pay_cass' => $input['pay_cass'] ?? true
            ];
            $result = $taxService->calculatePFATaxes(
                (float)$input['annual_income'],
                (float)($input['annual_expenses'] ?? 0),
                $input['tax_system'] ?? 'real',
                $options
            );
            break;

        case 'micro':
            // Calculate micro-enterprise tax
            if (!isset($input['revenue'])) {
                throw new Exception('Missing revenue parameter');
            }
            $result = $taxService->calculateMicroTax(
                (float)$input['revenue'],
                $input['has_employees'] ?? true
            );
            break;

        case 'profit':
            // Calculate corporate profit tax
            if (!isset($input['revenue']) || !isset($input['expenses'])) {
                throw new Exception('Missing revenue or expenses parameter');
            }
            $options = [
                'sponsorships' => $input['sponsorships'] ?? 0,
                'reinvested_profit' => $input['reinvested_profit'] ?? 0
            ];
            $result = $taxService->calculateProfitTax(
                (float)$input['revenue'],
                (float)$input['expenses'],
                $options
            );
            break;

        case 'dividend':
            // Calculate dividend tax
            if (!isset($input['gross_dividend'])) {
                throw new Exception('Missing gross_dividend parameter');
            }
            $result = $taxService->calculateDividendTax((float)$input['gross_dividend']);
            break;

        case 'vat':
            // Calculate VAT
            if (!isset($input['amount'])) {
                throw new Exception('Missing amount parameter');
            }
            $result = $taxService->calculateVAT(
                (float)$input['amount'],
                $input['vat_type'] ?? 'vat_19',
                $input['inclusive'] ?? false
            );
            break;

        case 'vat_balance':
            // Calculate VAT balance
            if (!isset($input['collected_vat']) || !isset($input['deductible_vat'])) {
                throw new Exception('Missing collected_vat or deductible_vat parameter');
            }
            $result = $taxService->calculateVATBalance(
                (float)$input['collected_vat'],
                (float)$input['deductible_vat']
            );
            break;

        case 'compare_regimes':
            // Compare tax regimes
            if (!isset($input['annual_revenue']) || !isset($input['annual_expenses'])) {
                throw new Exception('Missing annual_revenue or annual_expenses parameter');
            }
            $result = $taxService->compareTaxRegimes(
                (float)$input['annual_revenue'],
                (float)$input['annual_expenses'],
                $input['has_employees'] ?? true,
                (float)($input['desired_dividends'] ?? 0)
            );
            break;

        default:
            throw new Exception('Unknown calculation type: ' . $input['type']);
    }

    echo json_encode([
        'success' => true,
        'data' => $result,
        'calculation_type' => $input['type'],
        'timestamp' => date('c')
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
