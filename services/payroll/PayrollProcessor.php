<?php
/**
 * Payroll Processor Service
 * Processes payroll calculations for employees
 */

class PayrollProcessor
{
    private $db;

    // Romanian tax rates (2025)
    const CAS_EMPLOYEE_RATE = 0.25;  // 25%
    const CAS_EMPLOYER_RATE = 0.25;  // 25%
    const CASS_EMPLOYEE_RATE = 0.10; // 10%
    const CASS_EMPLOYER_RATE = 0.10; // 10%
    const INCOME_TAX_RATE = 0.10;    // 10%
    const PERSONAL_DEDUCTION = 510;  // RON per month

    public function __construct($db)
    {
        $this->db = $db;
    }

    /**
     * Process payroll for an entire period
     */
    public function processPeriodPayroll($periodId)
    {
        try {
            // Get period details
            $stmt = $this->db->prepare("SELECT * FROM payroll_periods WHERE id = :id");
            $stmt->execute(['id' => $periodId]);
            $period = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$period) {
                return ['success' => false, 'error' => 'Payroll period not found'];
            }

            // Get all active employees for the company
            $stmt = $this->db->prepare("
                SELECT
                    e.id,
                    e.employee_number,
                    e.salary_amount,
                    c.display_name,
                    c.email
                FROM employees e
                LEFT JOIN contacts c ON e.contact_id = c.id
                WHERE e.company_id = :company_id
                  AND e.status = 'active'
            ");
            $stmt->execute(['company_id' => $period['company_id']]);
            $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (count($employees) === 0) {
                return ['success' => false, 'error' => 'No active employees found'];
            }

            $total_gross = 0;
            $total_net = 0;
            $total_employer_cost = 0;
            $items_created = 0;

            foreach ($employees as $employee) {
                // Calculate payroll for this employee
                $calculation = $this->calculateEmployeePayroll($employee, $period);

                // Check if item already exists
                $stmt = $this->db->prepare("
                    SELECT id FROM payroll_items
                    WHERE payroll_period_id = :period_id AND employee_id = :employee_id
                ");
                $stmt->execute([
                    'period_id' => $periodId,
                    'employee_id' => $employee['id']
                ]);
                $existing = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($existing) {
                    // Update existing item
                    $stmt = $this->db->prepare("
                        UPDATE payroll_items SET
                            gross_salary = :gross_salary,
                            net_salary = :net_salary,
                            cas_employee = :cas_employee,
                            cass_employee = :cass_employee,
                            cas_employer = :cas_employer,
                            cass_employer = :cass_employer,
                            income_tax = :income_tax,
                            days_worked = :days_worked,
                            calculation_details = :calculation_details,
                            updated_at = NOW()
                        WHERE id = :id
                    ");
                    $calculation['id'] = $existing['id'];
                    $stmt->execute($calculation);
                } else {
                    // Create new item
                    $stmt = $this->db->prepare("
                        INSERT INTO payroll_items (
                            payroll_period_id,
                            employee_id,
                            gross_salary,
                            net_salary,
                            cas_employee,
                            cass_employee,
                            cas_employer,
                            cass_employer,
                            income_tax,
                            days_worked,
                            calculation_details
                        ) VALUES (
                            :period_id,
                            :employee_id,
                            :gross_salary,
                            :net_salary,
                            :cas_employee,
                            :cass_employee,
                            :cas_employer,
                            :cass_employer,
                            :income_tax,
                            :days_worked,
                            :calculation_details
                        )
                    ");
                    $calculation['period_id'] = $periodId;
                    $calculation['employee_id'] = $employee['id'];
                    $stmt->execute($calculation);
                    $items_created++;
                }

                $total_gross += $calculation['gross_salary'];
                $total_net += $calculation['net_salary'];
                $total_employer_cost += $calculation['gross_salary'] + $calculation['cas_employer'] + $calculation['cass_employer'];
            }

            // Update period totals
            $stmt = $this->db->prepare("
                UPDATE payroll_periods SET
                    total_gross_salary = :total_gross,
                    total_net_salary = :total_net,
                    status = 'calculated',
                    updated_at = NOW()
                WHERE id = :id
            ");
            $stmt->execute([
                'total_gross' => $total_gross,
                'total_net' => $total_net,
                'id' => $periodId
            ]);

            return [
                'success' => true,
                'message' => 'Payroll processed successfully',
                'employees_processed' => count($employees),
                'items_created' => $items_created,
                'total_gross_salary' => $total_gross,
                'total_net_salary' => $total_net,
                'total_employer_cost' => $total_employer_cost
            ];

        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Calculate payroll for a single employee
     */
    private function calculateEmployeePayroll($employee, $period)
    {
        $gross_salary = $employee['salary_amount'] ?? 0;
        $days_worked = $period['working_days'];

        // Calculate employee contributions
        $cas_employee = round($gross_salary * self::CAS_EMPLOYEE_RATE, 2);
        $cass_employee = round($gross_salary * self::CASS_EMPLOYEE_RATE, 2);

        // Calculate taxable income
        $taxable_income = $gross_salary - $cas_employee - $cass_employee - self::PERSONAL_DEDUCTION;
        $taxable_income = max(0, $taxable_income); // Cannot be negative

        // Calculate income tax
        $income_tax = round($taxable_income * self::INCOME_TAX_RATE, 2);

        // Calculate net salary
        $net_salary = $gross_salary - $cas_employee - $cass_employee - $income_tax;

        // Calculate employer contributions
        $cas_employer = round($gross_salary * self::CAS_EMPLOYER_RATE, 2);
        $cass_employer = round($gross_salary * self::CASS_EMPLOYER_RATE, 2);

        // Calculation details for transparency
        $calculation_details = json_encode([
            'gross_salary' => $gross_salary,
            'cas_employee_rate' => self::CAS_EMPLOYEE_RATE,
            'cass_employee_rate' => self::CASS_EMPLOYEE_RATE,
            'income_tax_rate' => self::INCOME_TAX_RATE,
            'personal_deduction' => self::PERSONAL_DEDUCTION,
            'taxable_income' => $taxable_income,
            'cas_employer_rate' => self::CAS_EMPLOYER_RATE,
            'cass_employer_rate' => self::CASS_EMPLOYER_RATE,
            'total_employer_cost' => $gross_salary + $cas_employer + $cass_employer
        ]);

        return [
            'gross_salary' => $gross_salary,
            'net_salary' => $net_salary,
            'cas_employee' => $cas_employee,
            'cass_employee' => $cass_employee,
            'cas_employer' => $cas_employer,
            'cass_employer' => $cass_employer,
            'income_tax' => $income_tax,
            'days_worked' => $days_worked,
            'calculation_details' => $calculation_details
        ];
    }
}
