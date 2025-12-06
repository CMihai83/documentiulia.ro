<?php
/**
 * Payslip PDF Generator
 * Generates PDF payslips for employees
 */

require_once __DIR__ . '/../../vendor/autoload.php';

use Dompdf\Dompdf;
use Dompdf\Options;

class PayslipPDFGenerator
{
    private $dompdf;

    public function __construct()
    {
        $options = new Options();
        $options->set('defaultFont', 'DejaVu Sans');
        $options->set('isRemoteEnabled', true);

        $this->dompdf = new Dompdf($options);
    }

    /**
     * Generate payslip PDF for an employee
     *
     * @param array $payrollItem Employee payroll data
     * @param array $period Payroll period data
     * @param array $company Company data
     * @return string PDF content
     */
    public function generatePayslip($payrollItem, $period, $company)
    {
        $html = $this->generateHTML($payrollItem, $period, $company);

        $this->dompdf->loadHtml($html);
        $this->dompdf->setPaper('A4', 'portrait');
        $this->dompdf->render();

        return $this->dompdf->output();
    }

    /**
     * Generate HTML for payslip
     */
    private function generateHTML($item, $period, $company)
    {
        $monthName = date('F Y', mktime(0, 0, 0, $period['month'], 1, $period['year']));

        $html = '
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page {
            margin: 20mm;
        }
        body {
            font-family: "DejaVu Sans", sans-serif;
            font-size: 10pt;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
        }
        .company-info {
            margin-bottom: 20px;
        }
        .company-name {
            font-size: 16pt;
            font-weight: bold;
            color: #000;
        }
        .payslip-title {
            font-size: 14pt;
            font-weight: bold;
            margin-top: 10px;
            color: #000;
        }
        .info-grid {
            display: table;
            width: 100%;
            margin-bottom: 20px;
        }
        .info-row {
            display: table-row;
        }
        .info-label {
            display: table-cell;
            font-weight: bold;
            width: 150px;
            padding: 5px;
            background-color: #f0f0f0;
        }
        .info-value {
            display: table-cell;
            padding: 5px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        th {
            background-color: #333;
            color: white;
            padding: 10px;
            text-align: left;
            font-weight: bold;
        }
        td {
            padding: 8px;
            border-bottom: 1px solid #ddd;
        }
        .amount {
            text-align: right;
            font-family: monospace;
        }
        .total-row {
            font-weight: bold;
            background-color: #f0f0f0;
        }
        .net-salary {
            background-color: #4CAF50;
            color: white;
            font-size: 12pt;
        }
        .footer {
            margin-top: 30px;
            padding-top: 10px;
            border-top: 1px solid #ddd;
            font-size: 8pt;
            color: #666;
        }
        .signature-section {
            margin-top: 40px;
            display: table;
            width: 100%;
        }
        .signature-box {
            display: table-cell;
            width: 45%;
            text-align: center;
        }
        .signature-line {
            margin-top: 40px;
            border-top: 1px solid #333;
            padding-top: 5px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">' . htmlspecialchars($company['name']) . '</div>
        <div>CUI: ' . htmlspecialchars($company['cui']) . '</div>
        <div class="payslip-title">FLUTURAȘ DE SALARIU</div>
        <div>' . htmlspecialchars($monthName) . '</div>
    </div>

    <div class="info-grid">
        <div class="info-row">
            <div class="info-label">Angajat:</div>
            <div class="info-value">' . htmlspecialchars($item['employee_name']) . '</div>
        </div>
        <div class="info-row">
            <div class="info-label">Cod Angajat:</div>
            <div class="info-value">' . htmlspecialchars($item['employee_code']) . '</div>
        </div>
        <div class="info-row">
            <div class="info-label">Perioada:</div>
            <div class="info-value">' . htmlspecialchars($period['period_start']) . ' - ' . htmlspecialchars($period['period_end']) . '</div>
        </div>
        <div class="info-row">
            <div class="info-label">Zile lucrate:</div>
            <div class="info-value">' . htmlspecialchars($item['days_worked']) . ' zile</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Descriere</th>
                <th class="amount">Sumă (RON)</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>VENITURI</strong></td>
                <td></td>
            </tr>
            <tr>
                <td>Salariu brut</td>
                <td class="amount">' . number_format($item['gross_salary'], 2, ',', '.') . '</td>
            </tr>

            <tr>
                <td><strong>REȚINERI ANGAJAT</strong></td>
                <td></td>
            </tr>
            <tr>
                <td>CAS (25% - Contribuție asigurări sociale)</td>
                <td class="amount">-' . number_format($item['cas_employee'], 2, ',', '.') . '</td>
            </tr>
            <tr>
                <td>CASS (10% - Contribuție asigurări sănătate)</td>
                <td class="amount">-' . number_format($item['cass_employee'], 2, ',', '.') . '</td>
            </tr>
            <tr>
                <td>Impozit pe venit (10%)</td>
                <td class="amount">-' . number_format($item['income_tax'], 2, ',', '.') . '</td>
            </tr>

            <tr class="total-row">
                <td>Total rețineri</td>
                <td class="amount">-' . number_format($item['cas_employee'] + $item['cass_employee'] + $item['income_tax'], 2, ',', '.') . '</td>
            </tr>

            <tr class="net-salary">
                <td><strong>SALARIU NET DE PLATĂ</strong></td>
                <td class="amount"><strong>' . number_format($item['net_salary'], 2, ',', '.') . '</strong></td>
            </tr>
        </tbody>
    </table>

    <div style="margin-top: 20px; padding: 10px; background-color: #f9f9f9; border-left: 4px solid #333;">
        <div style="font-weight: bold; margin-bottom: 5px;">Contribuții angajator (informativ):</div>
        <div>CAS angajator (25%): ' . number_format($item['cas_employer'], 2, ',', '.') . ' RON</div>
        <div>CASS angajator (10%): ' . number_format($item['cass_employer'], 2, ',', '.') . ' RON</div>
        <div><strong>Cost total angajator: ' . number_format($item['gross_salary'] + $item['cas_employer'] + $item['cass_employer'], 2, ',', '.') . ' RON</strong></div>
    </div>

    <div class="signature-section">
        <div class="signature-box">
            <div>Angajator</div>
            <div class="signature-line">
                Data și semnătura
            </div>
        </div>
        <div style="display: table-cell; width: 10%;"></div>
        <div class="signature-box">
            <div>Angajat</div>
            <div class="signature-line">
                Data și semnătura
            </div>
        </div>
    </div>

    <div class="footer">
        <div>Document generat automat de platforma AccountEch la data ' . date('d.m.Y H:i') . '</div>
        <div>Acest document confirmă plata salariului pentru perioada menționată.</div>
    </div>
</body>
</html>';

        return $html;
    }

    /**
     * Save payslip to file
     */
    public function savePayslip($payrollItem, $period, $company, $filename)
    {
        $pdf = $this->generatePayslip($payrollItem, $period, $company);
        file_put_contents($filename, $pdf);
        return $filename;
    }
}
