<?php
/**
 * DocumentIulia - Declaration Auto-Generator Service
 *
 * Automatically generates fiscal declarations using validated platform data
 * Supports: D300 (TVA), D112 (Salaries), D101 (Profit Tax), and more
 *
 * @package DocumentIulia
 * @subpackage FiscalCalendar
 * @version 1.0
 */

class DeclarationAutoGenerator {

    private $db;
    private $logger;

    /**
     * Constructor
     */
    public function __construct() {
        $this->db = Database::getInstance();
        $this->logger = new Logger('DeclarationAutoGenerator');
    }

    /**
     * Main entry point - Generate declaration for a calendar entry
     *
     * @param string $calendar_entry_id UUID of company_fiscal_calendar entry
     * @return array Result with declaration_id or errors
     */
    public function generateDeclaration($calendar_entry_id) {
        $start_time = microtime(true);

        try {
            // 1. Get calendar entry and related data
            $calendarEntry = $this->getCalendarEntry($calendar_entry_id);
            if (!$calendarEntry) {
                throw new Exception('Calendar entry not found');
            }

            // 2. Get deadline and form information
            $deadline = $this->getDeadline($calendarEntry['deadline_id']);
            $form = $this->getCurrentFormVersion($deadline['anaf_form_code']);

            if (!$form) {
                throw new Exception("Form {$deadline['anaf_form_code']} not found");
            }

            // 3. Check if can auto-generate
            if (!$deadline['can_auto_generate']) {
                throw new Exception("Declaration type {$deadline['deadline_code']} cannot be auto-generated");
            }

            // 4. Route to specific generator based on form code
            $declarationData = $this->routeToGenerator(
                $form['form_code'],
                $calendarEntry,
                $deadline,
                $form
            );

            // 5. Validate generated declaration
            $validation = $this->validateDeclaration($declarationData, $form);

            // 6. Save declaration to database
            $declarationId = $this->saveDeclaration(
                $calendarEntry,
                $form,
                $declarationData,
                $validation,
                microtime(true) - $start_time
            );

            // 7. Update calendar entry
            $this->updateCalendarEntry($calendar_entry_id, $declarationId);

            // 8. Generate PDF and XML files
            $this->generateFiles($declarationId);

            return [
                'success' => true,
                'declaration_id' => $declarationId,
                'validation_status' => $validation['status'],
                'errors' => $validation['errors'],
                'warnings' => $validation['warnings'],
                'generation_time_ms' => (microtime(true) - $start_time) * 1000
            ];

        } catch (Exception $e) {
            $this->logger->error("Declaration generation failed: " . $e->getMessage(), [
                'calendar_entry_id' => $calendar_entry_id,
                'trace' => $e->getTraceAsString()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Route to specific generator based on form code
     */
    private function routeToGenerator($formCode, $calendarEntry, $deadline, $form) {
        switch ($formCode) {
            case 'D300':
                return $this->generateD300($calendarEntry, $deadline, $form);

            case 'D112':
                return $this->generateD112($calendarEntry, $deadline, $form);

            case 'D101':
                return $this->generateD101($calendarEntry, $deadline, $form);

            case 'D200':
                return $this->generateD200($calendarEntry, $deadline, $form);

            case 'D390':
                return $this->generateD390($calendarEntry, $deadline, $form);

            case 'D394':
                return $this->generateD394($calendarEntry, $deadline, $form);

            default:
                throw new Exception("Generator not implemented for form $formCode");
        }
    }

    /**
     * ========================================================================
     * D300 - VAT DECLARATION GENERATOR
     * ========================================================================
     */
    public function generateD300($calendarEntry, $deadline, $form) {
        $companyId = $calendarEntry['company_id'];
        $year = $calendarEntry['year'];
        $period = $calendarEntry['period'];

        // Calculate period dates
        $periodDates = $this->calculatePeriodDates($year, $period, $deadline['frequency']);
        $periodStart = $periodDates['start'];
        $periodEnd = $periodDates['end'];

        // Get company info
        $company = $this->getCompany($companyId);

        // Initialize form data structure
        $formData = [
            'sectiunea_A' => [
                'cui' => $company['cui'],
                'denumire' => $company['legal_name'],
                'perioada' => $this->formatPeriod($period, $year, $deadline['frequency']),
                'adresa' => $company['address'],
                'telefon' => $company['phone'] ?? '',
                'email' => $company['email'] ?? ''
            ],
            'sectiunea_I' => [],
            'sectiunea_III' => []
        ];

        $dataSources = [
            'invoices_used' => [],
            'bills_used' => [],
            'date_range' => [
                'from' => $periodStart,
                'to' => $periodEnd
            ]
        ];

        // ==== TVA COLLECTED (from issued invoices) ====

        // Query invoices by TVA rate
        $invoicesByRate = $this->db->fetchAll("
            SELECT
                tva_rate,
                COUNT(*) as invoice_count,
                SUM(base_amount) as base_impozabila,
                SUM(tva_amount) as tva_colectat
            FROM invoices
            WHERE company_id = :company_id
              AND invoice_date >= :period_start
              AND invoice_date <= :period_end
              AND status IN ('issued', 'paid')
              AND tva_rate IS NOT NULL
              AND tva_rate > 0
            GROUP BY tva_rate
            ORDER BY tva_rate DESC
        ", [
            'company_id' => $companyId,
            'period_start' => $periodStart,
            'period_end' => $periodEnd
        ]);

        // Get invoice IDs for provenance
        $invoiceIds = $this->db->fetchAll("
            SELECT id
            FROM invoices
            WHERE company_id = :company_id
              AND invoice_date >= :period_start
              AND invoice_date <= :period_end
              AND status IN ('issued', 'paid')
        ", [
            'company_id' => $companyId,
            'period_start' => $periodStart,
            'period_end' => $periodEnd
        ]);
        $dataSources['invoices_used'] = array_column($invoiceIds, 'id');

        // Fill TVA collected data by rate
        $totalTvaColectat = 0;
        foreach ($invoicesByRate as $row) {
            $rate = (int)$row['tva_rate'];
            $rateKey = $rate; // 19, 9, 5

            $formData['sectiunea_I']["rd1_baza_impozabila_$rateKey"] = round($row['base_impozabila'], 2);
            $formData['sectiunea_I']["rd1_tva_colectat_$rateKey"] = round($row['tva_colectat'], 2);

            $totalTvaColectat += $row['tva_colectat'];
        }

        // ==== TVA DEDUCTIBLE (from received bills) ====

        // Query bills by TVA rate
        $billsByRate = $this->db->fetchAll("
            SELECT
                tva_rate,
                COUNT(*) as bill_count,
                SUM(base_amount) as achizitii,
                SUM(tva_amount) as tva_deductibil
            FROM bills
            WHERE company_id = :company_id
              AND bill_date >= :period_start
              AND bill_date <= :period_end
              AND status IN ('received', 'paid')
              AND tva_rate IS NOT NULL
              AND tva_rate > 0
            GROUP BY tva_rate
            ORDER BY tva_rate DESC
        ", [
            'company_id' => $companyId,
            'period_start' => $periodStart,
            'period_end' => $periodEnd
        ]);

        // Get bill IDs for provenance
        $billIds = $this->db->fetchAll("
            SELECT id
            FROM bills
            WHERE company_id = :company_id
              AND bill_date >= :period_start
              AND bill_date <= :period_end
              AND status IN ('received', 'paid')
        ", [
            'company_id' => $companyId,
            'period_start' => $periodStart,
            'period_end' => $periodEnd
        ]);
        $dataSources['bills_used'] = array_column($billIds, 'id');

        // Fill TVA deductible data by rate
        $totalTvaDeductibil = 0;
        foreach ($billsByRate as $row) {
            $rate = (int)$row['tva_rate'];
            $rateKey = $rate;

            $formData['sectiunea_I']["rd2_achizitii_$rateKey"] = round($row['achizitii'], 2);
            $formData['sectiunea_I']["rd2_tva_deductibil_$rateKey"] = round($row['tva_deductibil'], 2);

            $totalTvaDeductibil += $row['tva_deductibil'];
        }

        // ==== FINAL CALCULATION ====

        $formData['sectiunea_III']['rd30_total_tva_colectat'] = round($totalTvaColectat, 2);
        $formData['sectiunea_III']['rd31_total_tva_deductibil'] = round($totalTvaDeductibil, 2);

        if ($totalTvaColectat > $totalTvaDeductibil) {
            $formData['sectiunea_III']['rd40_tva_de_plata'] = round($totalTvaColectat - $totalTvaDeductibil, 2);
            $formData['sectiunea_III']['rd50_tva_de_recuperat'] = 0;
        } else {
            $formData['sectiunea_III']['rd40_tva_de_plata'] = 0;
            $formData['sectiunea_III']['rd50_tva_de_recuperat'] = round($totalTvaDeductibil - $totalTvaColectat, 2);
        }

        return [
            'form_data' => $formData,
            'data_sources' => $dataSources
        ];
    }

    /**
     * ========================================================================
     * D112 - SALARIES DECLARATION GENERATOR
     * ========================================================================
     */
    public function generateD112($calendarEntry, $deadline, $form) {
        $companyId = $calendarEntry['company_id'];
        $year = $calendarEntry['year'];
        $period = $calendarEntry['period'];

        // For D112, period is always a month
        $month = (int)$period;

        // Get company info
        $company = $this->getCompany($companyId);

        // Initialize form data
        $formData = [
            'identificare' => [
                'cui' => $company['cui'],
                'denumire' => $company['legal_name'],
                'luna' => $month,
                'an' => $year
            ],
            'salarii' => []
        ];

        // Query payroll data
        $payrollData = $this->db->fetchOne("
            SELECT
                COUNT(DISTINCT employee_id) as numar_angajati,
                SUM(gross_salary) as fond_salarii_brut,
                SUM(cas_employee) as cas_angajat,
                SUM(cass_employee) as cass_angajat,
                SUM(income_tax) as impozit_venit,
                SUM(cas_employer) as cas_angajator,
                SUM(work_insurance) as asigurari_munca
            FROM payroll
            WHERE company_id = :company_id
              AND month = :month
              AND year = :year
        ", [
            'company_id' => $companyId,
            'month' => $month,
            'year' => $year
        ]);

        if (!$payrollData || $payrollData['numar_angajati'] == 0) {
            throw new Exception('No payroll data found for this period');
        }

        // Fill salary data
        $fondSalariiB rut = (float)$payrollData['fond_salarii_brut'];

        $formData['salarii'] = [
            'numar_angajati' => (int)$payrollData['numar_angajati'],
            'fond_salarii_brut' => round($fondSalariiB rut, 2),
            'cas_angajator' => round((float)$payrollData['cas_angajator'], 2),
            'cas_angajat' => round((float)$payrollData['cas_angajat'], 2),
            'cass_angajat' => round((float)$payrollData['cass_angajat'], 2),
            'impozit_venit' => round((float)$payrollData['impozit_venit'], 2),
            'asigurari_munca' => round((float)$payrollData['asigurari_munca'], 2)
        ];

        // Calculate totals
        $formData['salarii']['total_contributii_angajator'] = round(
            $formData['salarii']['cas_angajator'] + $formData['salarii']['asigurari_munca'],
            2
        );

        $formData['salarii']['total_contributii_angajat'] = round(
            $formData['salarii']['cas_angajat'] + $formData['salarii']['cass_angajat'],
            2
        );

        $formData['salarii']['total_impozit'] = $formData['salarii']['impozit_venit'];

        $formData['salarii']['total_de_plata'] = round(
            $formData['salarii']['total_contributii_angajator'] +
            $formData['salarii']['total_contributii_angajat'] +
            $formData['salarii']['total_impozit'],
            2
        );

        // Get employee IDs for data provenance
        $employeeIds = $this->db->fetchAll("
            SELECT DISTINCT employee_id
            FROM payroll
            WHERE company_id = :company_id AND month = :month AND year = :year
        ", ['company_id' => $companyId, 'month' => $month, 'year' => $year]);

        return [
            'form_data' => $formData,
            'data_sources' => [
                'employees_used' => array_column($employeeIds, 'employee_id'),
                'month' => $month,
                'year' => $year
            ]
        ];
    }

    /**
     * ========================================================================
     * D101 - PROFIT TAX DECLARATION GENERATOR
     * ========================================================================
     */
    public function generateD101($calendarEntry, $deadline, $form) {
        $companyId = $calendarEntry['company_id'];
        $year = $calendarEntry['year'];
        $period = $calendarEntry['period'];

        // Get company info
        $company = $this->getCompany($companyId);

        // Determine if quarterly or annual
        $isAnnual = ($deadline['frequency'] === 'annual');

        if ($isAnnual) {
            $periodStart = "$year-01-01";
            $periodEnd = "$year-12-31";
        } else {
            // Quarterly
            $periodDates = $this->calculatePeriodDates($year, $period, 'quarterly');
            $periodStart = $periodDates['start'];
            $periodEnd = $periodDates['end'];
        }

        // Initialize form data
        $formData = [
            'identificare' => [
                'cui' => $company['cui'],
                'denumire' => $company['legal_name'],
                'an_fiscal' => $year,
                'trimestru' => $isAnnual ? null : $period
            ],
            'rezultat_fiscal' => []
        ];

        // Query total revenues (invoices)
        $revenues = $this->db->fetchOne("
            SELECT
                COUNT(*) as invoice_count,
                SUM(total_amount) as venituri_totale
            FROM invoices
            WHERE company_id = :company_id
              AND invoice_date >= :period_start
              AND invoice_date <= :period_end
              AND status = 'paid'
        ", [
            'company_id' => $companyId,
            'period_start' => $periodStart,
            'period_end' => $periodEnd
        ]);

        // Query total expenses
        $expenses = $this->db->fetchOne("
            SELECT
                COUNT(*) as expense_count,
                SUM(amount) as cheltuieli_totale
            FROM expenses
            WHERE company_id = :company_id
              AND expense_date >= :period_start
              AND expense_date <= :period_end
        ", [
            'company_id' => $companyId,
            'period_start' => $periodStart,
            'period_end' => $periodEnd
        ]);

        // Query payroll expenses
        $payrollExpenses = $this->db->fetchOne("
            SELECT
                SUM(gross_salary + cas_employer + work_insurance) as salarii_total
            FROM payroll
            WHERE company_id = :company_id
              AND CONCAT(year, '-', LPAD(month::text, 2, '0'), '-01')::date >= :period_start
              AND CONCAT(year, '-', LPAD(month::text, 2, '0'), '-01')::date <= :period_end
        ", [
            'company_id' => $companyId,
            'period_start' => $periodStart,
            'period_end' => $periodEnd
        ]);

        $venituri = (float)($revenues['venituri_totale'] ?? 0);
        $cheltuieli = (float)($expenses['cheltuieli_totale'] ?? 0);
        $salariiTotal = (float)($payrollExpenses['salarii_total'] ?? 0);

        $cheltuieliTotale = $cheltuieli + $salariiTotal;
        $profitContabil = $venituri - $cheltuieliTotale;

        // For simplified calculation, profit impozabil = profit contabil
        // In real scenario, need to add fiscal adjustments
        $profitImpozabil = max(0, $profitContabil);

        // Profit tax rate: 16% in Romania
        $impozitProfit = round($profitImpozabil * 0.16, 2);

        $formData['rezultat_fiscal'] = [
            'venituri_totale' => round($venituri, 2),
            'cheltuieli_totale' => round($cheltuieliTotale, 2),
            'cheltuieli_materiale' => round($cheltuieli, 2),
            'cheltuieli_salarii' => round($salariiTotal, 2),
            'profit_contabil' => round($profitContabil, 2),
            'ajustari_fiscale' => 0, // Simplified - should calculate deductions/additions
            'profit_impozabil' => round($profitImpozabil, 2),
            'impozit_profit' => $impozitProfit,
            'cota_impozit' => 16
        ];

        return [
            'form_data' => $formData,
            'data_sources' => [
                'invoice_count' => $revenues['invoice_count'],
                'expense_count' => $expenses['expense_count'],
                'period' => [
                    'from' => $periodStart,
                    'to' => $periodEnd
                ]
            ]
        ];
    }

    /**
     * ========================================================================
     * D200 - INCOME TAX DECLARATION (PFA/II)
     * ========================================================================
     */
    public function generateD200($calendarEntry, $deadline, $form) {
        // Similar to D101 but for PFA/II (individual entrepreneurs)
        // Simplified implementation
        return $this->generateD101($calendarEntry, $deadline, $form);
    }

    /**
     * ========================================================================
     * D390 - INVENTORY DECLARATION
     * ========================================================================
     */
    public function generateD390($calendarEntry, $deadline, $form) {
        $companyId = $calendarEntry['company_id'];
        $year = $calendarEntry['year'];

        $company = $this->getCompany($companyId);

        // Query inventory data
        $inventoryData = $this->db->fetchAll("
            SELECT
                product_name,
                product_code,
                quantity,
                unit_price,
                (quantity * unit_price) as total_value
            FROM inventory
            WHERE company_id = :company_id
              AND status = 'active'
            ORDER BY product_name
        ", ['company_id' => $companyId]);

        $formData = [
            'identificare' => [
                'cui' => $company['cui'],
                'denumire' => $company['legal_name'],
                'an' => $year
            ],
            'inventar' => $inventoryData,
            'total_valoare' => round(array_sum(array_column($inventoryData, 'total_value')), 2)
        ];

        return [
            'form_data' => $formData,
            'data_sources' => [
                'inventory_count' => count($inventoryData)
            ]
        ];
    }

    /**
     * ========================================================================
     * D394 - INTRASTAT DECLARATION
     * ========================================================================
     */
    public function generateD394($calendarEntry, $deadline, $form) {
        $companyId = $calendarEntry['company_id'];
        $year = $calendarEntry['year'];
        $period = $calendarEntry['period'];

        $periodDates = $this->calculatePeriodDates($year, $period, 'monthly');

        $company = $this->getCompany($companyId);

        // Query EU transactions
        $euTransactions = $this->db->fetchAll("
            SELECT
                contact_country as country_code,
                contact_cui as partner_cui,
                contact_name as partner_name,
                SUM(base_amount) as total_baza,
                SUM(tva_amount) as total_tva
            FROM invoices
            WHERE company_id = :company_id
              AND invoice_date >= :period_start
              AND invoice_date <= :period_end
              AND contact_country IN ('DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PL', 'HU', 'CZ', 'SK', 'BG', 'HR', 'SI', 'LT', 'LV', 'EE', 'FI', 'SE', 'DK', 'IE', 'PT', 'GR', 'CY', 'MT', 'LU')
              AND contact_country != 'RO'
            GROUP BY contact_country, contact_cui, contact_name
            ORDER BY country_code, partner_name
        ", [
            'company_id' => $companyId,
            'period_start' => $periodDates['start'],
            'period_end' => $periodDates['end']
        ]);

        $formData = [
            'identificare' => [
                'cui' => $company['cui'],
                'denumire' => $company['legal_name'],
                'perioada' => $this->formatPeriod($period, $year, 'monthly')
            ],
            'livrari_intracomunitare' => $euTransactions,
            'total_livrari' => round(array_sum(array_column($euTransactions, 'total_baza')), 2)
        ];

        return [
            'form_data' => $formData,
            'data_sources' => [
                'transaction_count' => count($euTransactions)
            ]
        ];
    }

    /**
     * ========================================================================
     * HELPER METHODS
     * ========================================================================
     */

    private function getCalendarEntry($id) {
        return $this->db->fetchOne("
            SELECT * FROM company_fiscal_calendar WHERE id = :id
        ", ['id' => $id]);
    }

    private function getDeadline($id) {
        return $this->db->fetchOne("
            SELECT * FROM anaf_fiscal_deadlines WHERE id = :id
        ", ['id' => $id]);
    }

    private function getCurrentFormVersion($formCode) {
        return $this->db->fetchOne("
            SELECT * FROM anaf_declaration_forms
            WHERE form_code = :form_code
              AND is_current_version = true
            LIMIT 1
        ", ['form_code' => $formCode]);
    }

    private function getCompany($id) {
        return $this->db->fetchOne("
            SELECT * FROM companies WHERE id = :id
        ", ['id' => $id]);
    }

    private function calculatePeriodDates($year, $period, $frequency) {
        if ($frequency === 'monthly') {
            $month = (int)$period;
            return [
                'start' => "$year-" . sprintf('%02d', $month) . "-01",
                'end' => date("Y-m-t", strtotime("$year-$month-01"))
            ];
        } elseif ($frequency === 'quarterly') {
            $quarter = (int)str_replace('Q', '', $period);
            $startMonth = ($quarter - 1) * 3 + 1;
            $endMonth = $startMonth + 2;
            return [
                'start' => "$year-" . sprintf('%02d', $startMonth) . "-01",
                'end' => date("Y-m-t", strtotime("$year-$endMonth-01"))
            ];
        } elseif ($frequency === 'annual') {
            return [
                'start' => "$year-01-01",
                'end' => "$year-12-31"
            ];
        }
    }

    private function formatPeriod($period, $year, $frequency) {
        if ($frequency === 'monthly') {
            return sprintf('%02d.%d', (int)$period, $year);
        } elseif ($frequency === 'quarterly') {
            return "T$period/$year";
        } else {
            return "$year";
        }
    }

    /**
     * Validate generated declaration
     */
    private function validateDeclaration($declarationData, $form) {
        $errors = [];
        $warnings = [];

        $formData = $declarationData['form_data'];
        $validationRules = json_decode($form['validation_rules'], true);

        if (!$validationRules) {
            return [
                'status' => 'valid',
                'errors' => [],
                'warnings' => []
            ];
        }

        // Cross-field validations
        if (isset($validationRules['cross_field_validations'])) {
            foreach ($validationRules['cross_field_validations'] as $rule) {
                // Simple evaluation - in production, use safe expression parser
                $ruleText = $rule['rule'];
                $severity = $rule['severity'] ?? 'error';

                // Example: check if TVA calculation is correct
                // This is simplified - production should use proper expression evaluator

                if ($severity === 'error') {
                    // Add to errors if rule fails
                } elseif ($severity === 'warning') {
                    // Add to warnings if rule fails
                }
            }
        }

        $status = empty($errors) ? 'valid' : 'errors';

        return [
            'status' => $status,
            'errors' => $errors,
            'warnings' => $warnings
        ];
    }

    /**
     * Save declaration to database
     */
    private function saveDeclaration($calendarEntry, $form, $declarationData, $validation, $generationTime) {
        $declarationId = $this->db->insert('fiscal_declarations', [
            'company_id' => $calendarEntry['company_id'],
            'calendar_entry_id' => $calendarEntry['id'],
            'form_id' => $form['id'],
            'declaration_type' => $calendarEntry['deadline_id'],
            'reporting_period_start' => $declarationData['data_sources']['date_range']['from'] ?? $calendarEntry['due_date'],
            'reporting_period_end' => $declarationData['data_sources']['date_range']['to'] ?? $calendarEntry['due_date'],
            'year' => $calendarEntry['year'],
            'period' => $calendarEntry['period'],
            'form_data' => json_encode($declarationData['form_data']),
            'data_sources' => json_encode($declarationData['data_sources']),
            'validation_status' => $validation['status'],
            'validation_errors' => json_encode($validation['errors']),
            'validation_warnings' => json_encode($validation['warnings']),
            'status' => 'draft',
            'auto_generated' => true,
            'generation_duration_ms' => (int)($generationTime * 1000),
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return $declarationId;
    }

    /**
     * Update calendar entry with declaration ID
     */
    private function updateCalendarEntry($calendarEntryId, $declarationId) {
        $this->db->update('company_fiscal_calendar', [
            'declaration_id' => $declarationId,
            'status' => 'generated',
            'auto_generated_at' => date('Y-m-d H:i:s')
        ], ['id' => $calendarEntryId]);
    }

    /**
     * Generate PDF and XML files for declaration
     */
    private function generateFiles($declarationId) {
        // TODO: Implement PDF and XML generation
        // For now, just log the request
        $this->logger->info("File generation requested for declaration $declarationId");
    }
}
