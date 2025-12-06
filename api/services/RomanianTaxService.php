<?php
/**
 * Romanian Tax Calculation Service
 * E2-US02: Comprehensive Romanian tax calculations
 *
 * Supports:
 * - Income tax (impozit pe venit) - 10%
 * - Social contributions (CAS 25%, CASS 10%)
 * - Micro-enterprise tax (1% or 3%)
 * - Corporate profit tax (16%)
 * - VAT calculations (19%, 9%, 5%, 0%)
 * - Dividend tax (8%)
 * - PFA/SRL specific calculations
 */

require_once __DIR__ . '/../config/database.php';

class RomanianTaxService {
    private static ?RomanianTaxService $instance = null;
    private ?PDO $pdo = null;

    // Tax rates (2024/2025)
    private array $defaultRates = [
        'income_tax' => 0.10,      // 10%
        'cas' => 0.25,             // 25% pension
        'cass' => 0.10,            // 10% health
        'micro_1' => 0.01,         // 1% micro with employees
        'micro_3' => 0.03,         // 3% micro without employees
        'profit_tax' => 0.16,      // 16% corporate
        'dividend_tax' => 0.08,    // 8% dividend
        'vat_19' => 0.19,          // 19% standard VAT
        'vat_9' => 0.09,           // 9% reduced VAT
        'vat_5' => 0.05,           // 5% reduced VAT
        'cam' => 0.0225            // 2.25% employer contribution
    ];

    // 2024 minimum wage
    private float $minimumWage = 3300;

    // CAS/CASS thresholds (in minimum wages)
    private int $casMinThreshold = 12;  // 12 minimum wages
    private int $casMaxThreshold = 24;  // 24 average wages cap

    private function __construct() {
        try {
            require_once __DIR__ . '/../config/database.php';
            $this->pdo = Database::getInstance()->getConnection();
            $this->loadRatesFromDb();
        } catch (Exception $e) {
            // Use default rates if DB unavailable
        }
    }

    public static function getInstance(): RomanianTaxService {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Load tax rates from database
     */
    private function loadRatesFromDb(): void {
        if (!$this->pdo) return;

        try {
            $stmt = $this->pdo->query("
                SELECT tax_type, rate
                FROM romanian_tax_rates
                WHERE is_active = true
                  AND effective_from <= CURRENT_DATE
                  AND (effective_until IS NULL OR effective_until >= CURRENT_DATE)
            ");

            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $this->defaultRates[$row['tax_type']] = (float)$row['rate'];
            }

            // Get minimum wage
            $stmt = $this->pdo->query("SELECT get_minimum_wage()");
            $wage = $stmt->fetchColumn();
            if ($wage) {
                $this->minimumWage = (float)$wage;
            }
        } catch (Exception $e) {
            // Use defaults
        }
    }

    /**
     * Get current tax rate
     */
    public function getTaxRate(string $taxType): float {
        return $this->defaultRates[$taxType] ?? 0;
    }

    /**
     * Get all current tax rates
     */
    public function getAllRates(): array {
        return $this->defaultRates;
    }

    /**
     * Calculate salary taxes and net pay
     */
    public function calculateSalary(float $grossSalary, array $options = []): array {
        $deductibleAmount = $options['deductible_amount'] ?? 0;
        $dependents = $options['dependents'] ?? 0;
        $hasCas = $options['has_cas'] ?? true;
        $hasCass = $options['has_cass'] ?? true;

        // Calculate contributions
        $cas = $hasCas ? round($grossSalary * $this->defaultRates['cas'], 2) : 0;
        $cass = $hasCass ? round($grossSalary * $this->defaultRates['cass'], 2) : 0;

        // Tax base (after contributions)
        $taxBase = $grossSalary - $cas - $cass;

        // Personal deduction based on dependents (simplified)
        $personalDeduction = $this->calculatePersonalDeduction($grossSalary, $dependents);
        $taxBase -= $personalDeduction;
        $taxBase -= $deductibleAmount;
        $taxBase = max(0, $taxBase);

        // Income tax
        $incomeTax = round($taxBase * $this->defaultRates['income_tax'], 2);

        // Net salary
        $netSalary = $grossSalary - $cas - $cass - $incomeTax;

        // Employer costs
        $cam = round($grossSalary * $this->defaultRates['cam'], 2);
        $totalEmployerCost = $grossSalary + $cam;

        return [
            'gross_salary' => $grossSalary,
            'cas' => $cas,
            'cas_rate' => $this->defaultRates['cas'],
            'cass' => $cass,
            'cass_rate' => $this->defaultRates['cass'],
            'personal_deduction' => $personalDeduction,
            'taxable_income' => $taxBase,
            'income_tax' => $incomeTax,
            'income_tax_rate' => $this->defaultRates['income_tax'],
            'net_salary' => round($netSalary, 2),
            'employer_cam' => $cam,
            'cam_rate' => $this->defaultRates['cam'],
            'total_employer_cost' => round($totalEmployerCost, 2),
            'effective_tax_rate' => $grossSalary > 0
                ? round(($grossSalary - $netSalary) / $grossSalary, 4)
                : 0
        ];
    }

    /**
     * Calculate personal deduction (simplified)
     */
    private function calculatePersonalDeduction(float $grossSalary, int $dependents): float {
        // 2024 personal deduction rules (simplified)
        $baseDeduction = 300; // Base amount

        // Deduction decreases as salary increases
        if ($grossSalary <= $this->minimumWage) {
            $deduction = $baseDeduction + ($dependents * 100);
        } elseif ($grossSalary <= $this->minimumWage * 2) {
            $deduction = ($baseDeduction * 0.5) + ($dependents * 50);
        } else {
            $deduction = 0; // No deduction for high earners
        }

        return round($deduction, 2);
    }

    /**
     * Calculate PFA taxes (self-employed)
     */
    public function calculatePFATaxes(
        float $annualIncome,
        float $annualExpenses,
        string $taxSystem = 'real', // 'real' or 'norm'
        array $options = []
    ): array {
        $normIncome = $options['norm_income'] ?? 0; // For norma de venit

        if ($taxSystem === 'norm' && $normIncome > 0) {
            // Norma de venit system
            $taxableIncome = $normIncome;
        } else {
            // Real system
            $taxableIncome = max(0, $annualIncome - $annualExpenses);
        }

        // Income tax
        $incomeTax = round($taxableIncome * $this->defaultRates['income_tax'], 2);

        // CAS/CASS thresholds
        $casThreshold = $this->minimumWage * $this->casMinThreshold;
        $cassThreshold = $this->minimumWage * 6; // 6 minimum wages for CASS

        // CAS (25%) - applicable if income > threshold
        $casBase = max($taxableIncome, $casThreshold);
        $cas = round($casBase * $this->defaultRates['cas'], 2);

        // CASS (10%) - applicable if income > threshold
        $cassBase = max($taxableIncome, $cassThreshold);
        $cass = round($cassBase * $this->defaultRates['cass'], 2);

        $totalTax = $incomeTax + $cas + $cass;
        $netIncome = $annualIncome - $annualExpenses - $totalTax;

        return [
            'annual_income' => $annualIncome,
            'annual_expenses' => $annualExpenses,
            'tax_system' => $taxSystem,
            'taxable_income' => $taxableIncome,
            'income_tax' => $incomeTax,
            'income_tax_rate' => $this->defaultRates['income_tax'],
            'cas_base' => $casBase,
            'cas' => $cas,
            'cas_rate' => $this->defaultRates['cas'],
            'cass_base' => $cassBase,
            'cass' => $cass,
            'cass_rate' => $this->defaultRates['cass'],
            'total_taxes' => $totalTax,
            'net_income' => round($netIncome, 2),
            'effective_tax_rate' => $annualIncome > 0
                ? round($totalTax / $annualIncome, 4)
                : 0,
            'thresholds' => [
                'cas_threshold' => $casThreshold,
                'cass_threshold' => $cassThreshold
            ]
        ];
    }

    /**
     * Calculate micro-enterprise tax
     */
    public function calculateMicroTax(float $revenue, bool $hasEmployees = true): array {
        $rate = $hasEmployees ? $this->defaultRates['micro_1'] : $this->defaultRates['micro_3'];
        $tax = round($revenue * $rate, 2);

        return [
            'revenue' => $revenue,
            'has_employees' => $hasEmployees,
            'tax_rate' => $rate,
            'tax_amount' => $tax,
            'net_after_tax' => $revenue - $tax,
            'rate_name' => $hasEmployees ? '1% (with employees)' : '3% (without employees)'
        ];
    }

    /**
     * Calculate corporate profit tax
     */
    public function calculateProfitTax(float $revenue, float $expenses, array $options = []): array {
        $taxDeductibleExpenses = $options['tax_deductible_expenses'] ?? $expenses;
        $nonDeductibleExpenses = $options['non_deductible_expenses'] ?? 0;

        $profit = $revenue - $taxDeductibleExpenses;
        $taxableProfit = $profit + $nonDeductibleExpenses;
        $taxableProfit = max(0, $taxableProfit);

        $profitTax = round($taxableProfit * $this->defaultRates['profit_tax'], 2);

        return [
            'revenue' => $revenue,
            'expenses' => $expenses,
            'tax_deductible_expenses' => $taxDeductibleExpenses,
            'non_deductible_expenses' => $nonDeductibleExpenses,
            'accounting_profit' => $profit,
            'taxable_profit' => $taxableProfit,
            'profit_tax' => $profitTax,
            'profit_tax_rate' => $this->defaultRates['profit_tax'],
            'net_profit' => round($taxableProfit - $profitTax, 2)
        ];
    }

    /**
     * Calculate dividend tax
     */
    public function calculateDividendTax(float $grossDividend): array {
        $tax = round($grossDividend * $this->defaultRates['dividend_tax'], 2);

        // CASS on dividends if > threshold
        $cassThreshold = $this->minimumWage * 12;
        $cass = 0;
        if ($grossDividend > $cassThreshold) {
            $cass = round($grossDividend * $this->defaultRates['cass'], 2);
        }

        $netDividend = $grossDividend - $tax - $cass;

        return [
            'gross_dividend' => $grossDividend,
            'dividend_tax' => $tax,
            'dividend_tax_rate' => $this->defaultRates['dividend_tax'],
            'cass_applicable' => $grossDividend > $cassThreshold,
            'cass' => $cass,
            'cass_rate' => $cass > 0 ? $this->defaultRates['cass'] : 0,
            'cass_threshold' => $cassThreshold,
            'net_dividend' => round($netDividend, 2),
            'total_tax' => round($tax + $cass, 2)
        ];
    }

    /**
     * Calculate VAT
     */
    public function calculateVAT(float $amount, string $vatType = 'vat_19', bool $inclusive = false): array {
        $rate = $this->defaultRates[$vatType] ?? $this->defaultRates['vat_19'];

        if ($inclusive) {
            // VAT is included in the amount
            $netAmount = round($amount / (1 + $rate), 2);
            $vatAmount = round($amount - $netAmount, 2);
            $grossAmount = $amount;
        } else {
            // VAT is added to the amount
            $netAmount = $amount;
            $vatAmount = round($amount * $rate, 2);
            $grossAmount = round($amount + $vatAmount, 2);
        }

        return [
            'net_amount' => $netAmount,
            'vat_rate' => $rate,
            'vat_rate_percent' => $rate * 100,
            'vat_amount' => $vatAmount,
            'gross_amount' => $grossAmount,
            'vat_type' => $vatType
        ];
    }

    /**
     * Calculate VAT due/receivable
     */
    public function calculateVATBalance(float $collectedVAT, float $deductibleVAT): array {
        $balance = round($collectedVAT - $deductibleVAT, 2);

        return [
            'collected_vat' => $collectedVAT,
            'deductible_vat' => $deductibleVAT,
            'balance' => $balance,
            'status' => $balance >= 0 ? 'payable' : 'receivable',
            'amount_due' => $balance >= 0 ? $balance : 0,
            'amount_receivable' => $balance < 0 ? abs($balance) : 0
        ];
    }

    /**
     * Compare SRL tax regimes (micro vs profit)
     */
    public function compareTaxRegimes(
        float $annualRevenue,
        float $annualExpenses,
        bool $hasEmployees = true,
        float $desiredDividends = 0
    ): array {
        // Micro-enterprise scenario
        $microTax = $this->calculateMicroTax($annualRevenue, $hasEmployees);
        $microProfit = $annualRevenue - $annualExpenses;
        $microNetProfit = $microProfit - $microTax['tax_amount'];

        $microDividendTax = 0;
        $microNetDividend = 0;
        if ($desiredDividends > 0 && $desiredDividends <= $microNetProfit) {
            $dividendCalc = $this->calculateDividendTax($desiredDividends);
            $microDividendTax = $dividendCalc['total_tax'];
            $microNetDividend = $dividendCalc['net_dividend'];
        }

        $microTotalTax = $microTax['tax_amount'] + $microDividendTax;

        // Profit tax scenario
        $profitCalc = $this->calculateProfitTax($annualRevenue, $annualExpenses);

        $profitDividendTax = 0;
        $profitNetDividend = 0;
        if ($desiredDividends > 0 && $desiredDividends <= $profitCalc['net_profit']) {
            $dividendCalc = $this->calculateDividendTax($desiredDividends);
            $profitDividendTax = $dividendCalc['total_tax'];
            $profitNetDividend = $dividendCalc['net_dividend'];
        }

        $profitTotalTax = $profitCalc['profit_tax'] + $profitDividendTax;

        // Recommendation
        $microEffectiveRate = $annualRevenue > 0 ? $microTotalTax / $annualRevenue : 0;
        $profitEffectiveRate = $annualRevenue > 0 ? $profitTotalTax / $annualRevenue : 0;

        $recommendation = $microTotalTax <= $profitTotalTax ? 'micro' : 'profit';

        return [
            'micro_enterprise' => [
                'tax' => $microTax['tax_amount'],
                'tax_rate' => $microTax['tax_rate'],
                'profit' => $microProfit,
                'net_profit' => $microNetProfit,
                'dividend_tax' => $microDividendTax,
                'net_dividend' => $microNetDividend,
                'total_tax' => $microTotalTax,
                'effective_rate' => round($microEffectiveRate, 4)
            ],
            'profit_tax' => [
                'tax' => $profitCalc['profit_tax'],
                'tax_rate' => $profitCalc['profit_tax_rate'],
                'profit' => $profitCalc['accounting_profit'],
                'net_profit' => $profitCalc['net_profit'],
                'dividend_tax' => $profitDividendTax,
                'net_dividend' => $profitNetDividend,
                'total_tax' => $profitTotalTax,
                'effective_rate' => round($profitEffectiveRate, 4)
            ],
            'recommendation' => $recommendation,
            'tax_savings' => abs($microTotalTax - $profitTotalTax),
            'parameters' => [
                'revenue' => $annualRevenue,
                'expenses' => $annualExpenses,
                'has_employees' => $hasEmployees,
                'dividends' => $desiredDividends
            ]
        ];
    }

    /**
     * Get tax calendar/deadlines for current period
     */
    public function getTaxDeadlines(string $businessType = 'srl', int $month = null, int $year = null): array {
        $month = $month ?? (int)date('n');
        $year = $year ?? (int)date('Y');

        $deadlines = [];

        // Monthly deadlines (25th of each month)
        $deadlines[] = [
            'date' => sprintf('%04d-%02d-25', $year, $month),
            'name_ro' => 'Declaratia 112 si plata contributiilor',
            'name_en' => 'Form 112 and contribution payments',
            'applicable_to' => ['srl', 'pfa_employer']
        ];

        // VAT (if applicable)
        $deadlines[] = [
            'date' => sprintf('%04d-%02d-25', $year, $month),
            'name_ro' => 'Declaratia si plata TVA',
            'name_en' => 'VAT declaration and payment',
            'applicable_to' => ['vat_registered']
        ];

        // Micro/profit tax (quarterly for micro, quarterly advance for profit)
        if (in_array($month, [1, 4, 7, 10])) {
            $deadlines[] = [
                'date' => sprintf('%04d-%02d-25', $year, $month),
                'name_ro' => 'Impozit micro/profit trimestrial',
                'name_en' => 'Quarterly micro/profit tax',
                'applicable_to' => ['srl_micro', 'srl_profit']
            ];
        }

        // Sort by date
        usort($deadlines, function($a, $b) {
            return strcmp($a['date'], $b['date']);
        });

        return [
            'period' => [
                'month' => $month,
                'year' => $year
            ],
            'business_type' => $businessType,
            'deadlines' => $deadlines
        ];
    }
}
