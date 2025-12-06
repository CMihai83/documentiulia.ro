<?php
/**
 * PayrollProcessor.php
 *
 * Core payroll calculation engine for Romanian payroll compliance
 * Handles gross → net salary calculation with Romanian tax rules
 *
 * Romanian Payroll Rules (2024-2025):
 * - CAS (Social Insurance): 25% employer + 25% employee
 * - CASS (Health Insurance): 10% employer + 10% employee
 * - Income Tax: 10% on taxable income after personal deductions
 * - Personal Deduction: 510 RON/month basic + 510 RON/dependent
 *
 * @package DocumentIulia
 * @subpackage Payroll
 * @version 1.0
 * @created 2025-11-22
 */

require_once __DIR__ . '/../../config/database.php';

class PayrollProcessor {

    private $db;

    // Romanian tax rates (2024-2025)
    const CAS_EMPLOYER_RATE = 25.00;      // 25% employer contribution
    const CAS_EMPLOYEE_RATE = 25.00;      // 25% employee deduction
    const CASS_EMPLOYER_RATE = 10.00;     // 10% employer contribution
    const CASS_EMPLOYEE_RATE = 10.00;     // 10% employee deduction
    const INCOME_TAX_RATE = 10.00;        // 10% income tax
    const PERSONAL_DEDUCTION = 510.00;    // 510 RON/month (2024)
    const DEPENDENT_DEDUCTION = 510.00;   // 510 RON/month per dependent

    public function __construct($database) {
        $this->db = $database;
    }

    /**
     * Process payroll for an entire period
     *
     * @param string $payroll_period_id UUID of payroll period
     * @return array Result with success status and details
     */
    public function processPeriodPayroll($payroll_period_id) {
        try {
            $this->db->beginTransaction();

            // 1. Get payroll period
            $period = $this->getPayrollPeriod($payroll_period_id);
            if (!$period) {
                throw new Exception("Payroll period not found");
            }

            // 2. Get all active employees for this company
            $employees = $this->getActiveEmployees($period['company_id'], $period['period_start'], $period['period_end']);

            $processed_count = 0;
            $total_gross = 0;
            $total_net = 0;
            $total_cas_employer = 0;
            $total_cass_employer = 0;
            $total_cas_employee = 0;
            $total_cass_employee = 0;
            $total_income_tax = 0;

            // 3. Process each employee
            foreach ($employees as $employee) {
                $payroll_item = $this->processEmployeePayroll(
                    $payroll_period_id,
                    $employee['id'],
                    $period['working_days'],
                    $period['period_start'],
                    $period['period_end']
                );

                if ($payroll_item) {
                    $processed_count++;
                    $total_gross += $payroll_item['gross_salary'];
                    $total_net += $payroll_item['net_salary'];
                    $total_cas_employer += $payroll_item['cas_employer'];
                    $total_cass_employer += $payroll_item['cass_employer'];
                    $total_cas_employee += $payroll_item['cas_employee'];
                    $total_cass_employee += $payroll_item['cass_employee'];
                    $total_income_tax += $payroll_item['income_tax'];
                }
            }

            // 4. Update period totals
            $this->updatePeriodTotals($payroll_period_id, [
                'total_gross_salary' => $total_gross,
                'total_net_salary' => $total_net,
                'total_cas_employer' => $total_cas_employer,
                'total_cass_employer' => $total_cass_employer,
                'total_cas_employee' => $total_cas_employee,
                'total_cass_employee' => $total_cass_employee,
                'total_income_tax' => $total_income_tax,
                'status' => 'calculated'
            ]);

            $this->db->commit();

            return [
                'success' => true,
                'processed_employees' => $processed_count,
                'totals' => [
                    'gross_salary' => $total_gross,
                    'net_salary' => $total_net,
                    'cas_employer' => $total_cas_employer,
                    'cass_employer' => $total_cass_employer,
                    'cas_employee' => $total_cas_employee,
                    'cass_employee' => $total_cass_employee,
                    'income_tax' => $total_income_tax,
                    'total_employer_cost' => $total_gross + $total_cas_employer + $total_cass_employer
                ]
            ];

        } catch (Exception $e) {
            $this->db->rollBack();
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Process payroll for a single employee
     *
     * @param string $payroll_period_id UUID of payroll period
     * @param string $employee_id UUID of employee
     * @param int $working_days Number of working days in period
     * @param string $period_start Start date
     * @param string $period_end End date
     * @return array|null Payroll item data or null if failed
     */
    public function processEmployeePayroll($payroll_period_id, $employee_id, $working_days, $period_start, $period_end) {

        // 1. Get employee salary structure
        $salary_structure = $this->getEmployeeSalaryStructure($employee_id, $period_start);
        if (!$salary_structure) {
            error_log("No salary structure found for employee: {$employee_id}");
            return null;
        }

        // 2. Get time worked
        $time_data = $this->getEmployeeTimeData($employee_id, $period_start, $period_end);
        $days_worked = $time_data['days_worked'] ?? $working_days;
        $hours_worked = $time_data['hours_worked'] ?? ($working_days * 8);

        // 3. Calculate base salary (prorated if needed)
        $base_salary = $salary_structure['base_salary'];
        if ($days_worked < $working_days) {
            $base_salary = ($base_salary / $working_days) * $days_worked;
        }

        // 4. Get additional components (bonuses, overtime, allowances)
        $additional = $this->getEmployeeAdditionalComponents($employee_id, $salary_structure['id'], $period_start, $period_end);

        $bonuses = $additional['bonuses'] ?? 0;
        $overtime = $additional['overtime'] ?? 0;
        $allowances = $additional['allowances'] ?? 0;
        $other_taxable = $additional['other_taxable'] ?? 0;

        // 5. Calculate gross salary
        $gross_salary = $base_salary + $bonuses + $overtime + $allowances + $other_taxable;

        // 6. Calculate employer contributions (NOT deducted from employee)
        $cas_employer = $this->calculatePercentage($gross_salary, self::CAS_EMPLOYER_RATE);
        $cass_employer = $this->calculatePercentage($gross_salary, self::CASS_EMPLOYER_RATE);

        // 7. Calculate employee deductions
        $cas_employee = $this->calculatePercentage($gross_salary, self::CAS_EMPLOYEE_RATE);
        $cass_employee = $this->calculatePercentage($gross_salary, self::CASS_EMPLOYEE_RATE);

        // 8. Get employee personal deductions
        $employee_info = $this->getEmployeeInfo($employee_id);
        $dependents_count = $employee_info['dependents_count'] ?? 0;

        $personal_deduction = self::PERSONAL_DEDUCTION;
        $dependents_deduction = $dependents_count * self::DEPENDENT_DEDUCTION;

        // 9. Calculate taxable income
        // Taxable income = Gross - Personal deductions (NOT social contributions)
        $taxable_income = max(0, $gross_salary - $personal_deduction - $dependents_deduction);

        // 10. Calculate income tax (10%)
        $income_tax = $this->calculatePercentage($taxable_income, self::INCOME_TAX_RATE);

        // 11. Get other deductions (advances, garnishments, etc.)
        $other_deductions = $this->getEmployeeOtherDeductions($employee_id, $period_start, $period_end);
        $union_fees = $other_deductions['union_fees'] ?? 0;
        $advances = $other_deductions['advances'] ?? 0;
        $garnishments = $other_deductions['garnishments'] ?? 0;
        $other = $other_deductions['other'] ?? 0;

        $total_other_deductions = $union_fees + $advances + $garnishments + $other;

        // 12. Calculate NET salary
        // Net = Gross - CAS(employee) - CASS(employee) - Income Tax - Other Deductions
        $net_salary = $gross_salary - $cas_employee - $cass_employee - $income_tax - $total_other_deductions;

        // 13. Get non-taxable benefits
        $meal_vouchers_value = $additional['meal_vouchers'] ?? 0;
        $transportation_allowance = $additional['transportation'] ?? 0;

        // 14. Prepare calculation details for transparency
        $calculation_details = [
            'base_salary' => $base_salary,
            'bonuses' => $bonuses,
            'overtime' => $overtime,
            'allowances' => $allowances,
            'other_taxable' => $other_taxable,
            'gross_salary' => $gross_salary,
            'cas_employer' => $cas_employer,
            'cass_employer' => $cass_employer,
            'cas_employee' => $cas_employee,
            'cass_employee' => $cass_employee,
            'personal_deduction' => $personal_deduction,
            'dependents_deduction' => $dependents_deduction,
            'dependents_count' => $dependents_count,
            'taxable_income' => $taxable_income,
            'income_tax' => $income_tax,
            'union_fees' => $union_fees,
            'advances' => $advances,
            'garnishments' => $garnishments,
            'other_deductions' => $other,
            'net_salary' => $net_salary,
            'meal_vouchers' => $meal_vouchers_value,
            'transportation' => $transportation_allowance,
            'total_employer_cost' => $gross_salary + $cas_employer + $cass_employer
        ];

        // 15. Insert or update payroll_item
        $payroll_item_id = $this->savePayrollItem([
            'payroll_period_id' => $payroll_period_id,
            'employee_id' => $employee_id,
            'employee_salary_structure_id' => $salary_structure['id'],
            'days_worked' => $days_worked,
            'hours_worked' => $hours_worked,
            'base_salary' => $base_salary,
            'bonuses' => $bonuses,
            'overtime' => $overtime,
            'allowances' => $allowances,
            'other_taxable' => $other_taxable,
            'gross_salary' => $gross_salary,
            'cas_employer' => $cas_employer,
            'cas_employer_rate' => self::CAS_EMPLOYER_RATE,
            'cass_employer' => $cass_employer,
            'cass_employer_rate' => self::CASS_EMPLOYER_RATE,
            'cas_employee' => $cas_employee,
            'cas_employee_rate' => self::CAS_EMPLOYEE_RATE,
            'cass_employee' => $cass_employee,
            'cass_employee_rate' => self::CASS_EMPLOYEE_RATE,
            'personal_deduction' => $personal_deduction,
            'dependents_deduction' => $dependents_deduction,
            'taxable_income' => $taxable_income,
            'income_tax' => $income_tax,
            'income_tax_rate' => self::INCOME_TAX_RATE,
            'union_fees' => $union_fees,
            'advances' => $advances,
            'garnishments' => $garnishments,
            'other_deductions' => $other,
            'net_salary' => $net_salary,
            'meal_vouchers_value' => $meal_vouchers_value,
            'transportation_allowance' => $transportation_allowance,
            'calculation_details' => json_encode($calculation_details),
            'status' => 'calculated'
        ]);

        $calculation_details['id'] = $payroll_item_id;

        return $calculation_details;
    }

    /**
     * Calculate percentage
     */
    private function calculatePercentage($amount, $percentage) {
        return round(($amount * $percentage) / 100, 2);
    }

    /**
     * Get payroll period details
     */
    private function getPayrollPeriod($payroll_period_id) {
        $stmt = $this->db->prepare("
            SELECT * FROM payroll_periods
            WHERE id = :id
        ");
        $stmt->execute(['id' => $payroll_period_id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Get active employees for company
     */
    private function getActiveEmployees($company_id, $period_start, $period_end) {
        $stmt = $this->db->prepare("
            SELECT DISTINCT e.*
            FROM employees e
            WHERE e.company_id = :company_id
              AND e.status = 'active'
              AND (e.employment_end_date IS NULL OR e.employment_end_date >= :period_start)
              AND e.employment_start_date <= :period_end
            ORDER BY e.last_name, e.first_name
        ");
        $stmt->execute([
            'company_id' => $company_id,
            'period_start' => $period_start,
            'period_end' => $period_end
        ]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get employee salary structure for period
     */
    private function getEmployeeSalaryStructure($employee_id, $date) {
        $stmt = $this->db->prepare("
            SELECT * FROM employee_salary_structures
            WHERE employee_id = :employee_id
              AND effective_from <= :date
              AND (effective_to IS NULL OR effective_to >= :date)
              AND is_active = true
            ORDER BY effective_from DESC
            LIMIT 1
        ");
        $stmt->execute([
            'employee_id' => $employee_id,
            'date' => $date
        ]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Get employee time data (from time_entries table)
     */
    private function getEmployeeTimeData($employee_id, $period_start, $period_end) {
        $stmt = $this->db->prepare("
            SELECT
                COUNT(DISTINCT DATE(start_time)) as days_worked,
                SUM(hours_worked) as hours_worked
            FROM time_entries
            WHERE employee_id = :employee_id
              AND DATE(start_time) >= :period_start
              AND DATE(start_time) <= :period_end
              AND status = 'approved'
        ");
        $stmt->execute([
            'employee_id' => $employee_id,
            'period_start' => $period_start,
            'period_end' => $period_end
        ]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Get employee additional components (bonuses, overtime, etc.)
     */
    private function getEmployeeAdditionalComponents($employee_id, $salary_structure_id, $period_start, $period_end) {
        // This would query employee_salary_components and payroll_adjustments
        // For now, return empty array - to be implemented
        return [
            'bonuses' => 0,
            'overtime' => 0,
            'allowances' => 0,
            'other_taxable' => 0,
            'meal_vouchers' => 0,
            'transportation' => 0
        ];
    }

    /**
     * Get employee info (dependents, etc.)
     */
    private function getEmployeeInfo($employee_id) {
        $stmt = $this->db->prepare("
            SELECT * FROM employees
            WHERE id = :id
        ");
        $stmt->execute(['id' => $employee_id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Get other deductions (advances, garnishments, etc.)
     */
    private function getEmployeeOtherDeductions($employee_id, $period_start, $period_end) {
        // Query payroll_adjustments table
        // For now, return empty - to be implemented
        return [
            'union_fees' => 0,
            'advances' => 0,
            'garnishments' => 0,
            'other' => 0
        ];
    }

    /**
     * Save payroll item to database
     */
    private function savePayrollItem($data) {
        // Check if exists
        $stmt = $this->db->prepare("
            SELECT id FROM payroll_items
            WHERE payroll_period_id = :payroll_period_id
              AND employee_id = :employee_id
        ");
        $stmt->execute([
            'payroll_period_id' => $data['payroll_period_id'],
            'employee_id' => $data['employee_id']
        ]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            // Update
            $stmt = $this->db->prepare("
                UPDATE payroll_items SET
                    employee_salary_structure_id = :employee_salary_structure_id,
                    days_worked = :days_worked,
                    hours_worked = :hours_worked,
                    base_salary = :base_salary,
                    bonuses = :bonuses,
                    overtime = :overtime,
                    allowances = :allowances,
                    other_taxable = :other_taxable,
                    gross_salary = :gross_salary,
                    cas_employer = :cas_employer,
                    cas_employer_rate = :cas_employer_rate,
                    cass_employer = :cass_employer,
                    cass_employer_rate = :cass_employer_rate,
                    cas_employee = :cas_employee,
                    cas_employee_rate = :cas_employee_rate,
                    cass_employee = :cass_employee,
                    cass_employee_rate = :cass_employee_rate,
                    personal_deduction = :personal_deduction,
                    dependents_deduction = :dependents_deduction,
                    taxable_income = :taxable_income,
                    income_tax = :income_tax,
                    income_tax_rate = :income_tax_rate,
                    union_fees = :union_fees,
                    advances = :advances,
                    garnishments = :garnishments,
                    other_deductions = :other_deductions,
                    net_salary = :net_salary,
                    meal_vouchers_value = :meal_vouchers_value,
                    transportation_allowance = :transportation_allowance,
                    calculation_details = :calculation_details,
                    status = :status,
                    updated_at = NOW()
                WHERE id = :id
            ");
            $data['id'] = $existing['id'];
            $stmt->execute($data);
            return $existing['id'];
        } else {
            // Insert
            $stmt = $this->db->prepare("
                INSERT INTO payroll_items (
                    payroll_period_id, employee_id, employee_salary_structure_id,
                    days_worked, hours_worked,
                    base_salary, bonuses, overtime, allowances, other_taxable, gross_salary,
                    cas_employer, cas_employer_rate, cass_employer, cass_employer_rate,
                    cas_employee, cas_employee_rate, cass_employee, cass_employee_rate,
                    personal_deduction, dependents_deduction, taxable_income,
                    income_tax, income_tax_rate,
                    union_fees, advances, garnishments, other_deductions, net_salary,
                    meal_vouchers_value, transportation_allowance,
                    calculation_details, status
                ) VALUES (
                    :payroll_period_id, :employee_id, :employee_salary_structure_id,
                    :days_worked, :hours_worked,
                    :base_salary, :bonuses, :overtime, :allowances, :other_taxable, :gross_salary,
                    :cas_employer, :cas_employer_rate, :cass_employer, :cass_employer_rate,
                    :cas_employee, :cas_employee_rate, :cass_employee, :cass_employee_rate,
                    :personal_deduction, :dependents_deduction, :taxable_income,
                    :income_tax, :income_tax_rate,
                    :union_fees, :advances, :garnishments, :other_deductions, :net_salary,
                    :meal_vouchers_value, :transportation_allowance,
                    :calculation_details, :status
                ) RETURNING id
            ");
            $stmt->execute($data);
            return $stmt->fetchColumn();
        }
    }

    /**
     * Update period totals
     */
    private function updatePeriodTotals($payroll_period_id, $totals) {
        $stmt = $this->db->prepare("
            UPDATE payroll_periods SET
                total_gross_salary = :total_gross_salary,
                total_net_salary = :total_net_salary,
                total_cas_employer = :total_cas_employer,
                total_cass_employer = :total_cass_employer,
                total_cas_employee = :total_cas_employee,
                total_cass_employee = :total_cass_employee,
                total_income_tax = :total_income_tax,
                status = :status,
                calculated_at = NOW(),
                updated_at = NOW()
            WHERE id = :id
        ");
        $totals['id'] = $payroll_period_id;
        return $stmt->execute($totals);
    }
}
