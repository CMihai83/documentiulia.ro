<?php
/**
 * Report Export Service
 * Handles export of financial reports to Excel and CSV formats
 */

require_once __DIR__ . '/../../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Writer\Csv;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Color;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;

class ReportExportService
{
    /**
     * Export Profit & Loss statement to Excel
     */
    public function exportProfitLoss($data, $company, $period)
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Set title
        $sheet->setCellValue('A1', $company['name']);
        $sheet->setCellValue('A2', 'Profit & Loss Statement');
        $sheet->setCellValue('A3', 'Period: ' . $period);

        // Style header
        $sheet->getStyle('A1:A3')->getFont()->setBold(true);
        $sheet->getStyle('A2')->getFont()->setSize(14);

        // Headers
        $row = 5;
        $sheet->setCellValue('A' . $row, 'Category');
        $sheet->setCellValue('B' . $row, 'Amount (RON)');

        $sheet->getStyle('A' . $row . ':B' . $row)->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()->setARGB('FF333333');
        $sheet->getStyle('A' . $row . ':B' . $row)->getFont()->getColor()->setARGB(Color::COLOR_WHITE);
        $sheet->getStyle('A' . $row . ':B' . $row)->getFont()->setBold(true);

        // Revenue section
        $row++;
        $sheet->setCellValue('A' . $row, 'REVENUE');
        $sheet->getStyle('A' . $row)->getFont()->setBold(true);

        $row++;
        $totalRevenue = 0;
        foreach ($data['revenue'] as $item) {
            $sheet->setCellValue('A' . $row, '  ' . $item['category']);
            $sheet->setCellValue('B' . $row, $item['amount']);
            $sheet->getStyle('B' . $row)->getNumberFormat()->setFormatCode('#,##0.00');
            $totalRevenue += $item['amount'];
            $row++;
        }

        $sheet->setCellValue('A' . $row, 'Total Revenue');
        $sheet->setCellValue('B' . $row, $totalRevenue);
        $sheet->getStyle('A' . $row . ':B' . $row)->getFont()->setBold(true);
        $sheet->getStyle('B' . $row)->getNumberFormat()->setFormatCode('#,##0.00');

        // Expenses section
        $row += 2;
        $sheet->setCellValue('A' . $row, 'EXPENSES');
        $sheet->getStyle('A' . $row)->getFont()->setBold(true);

        $row++;
        $totalExpenses = 0;
        foreach ($data['expenses'] as $item) {
            $sheet->setCellValue('A' . $row, '  ' . $item['category']);
            $sheet->setCellValue('B' . $row, $item['amount']);
            $sheet->getStyle('B' . $row)->getNumberFormat()->setFormatCode('#,##0.00');
            $totalExpenses += $item['amount'];
            $row++;
        }

        $sheet->setCellValue('A' . $row, 'Total Expenses');
        $sheet->setCellValue('B' . $row, $totalExpenses);
        $sheet->getStyle('A' . $row . ':B' . $row)->getFont()->setBold(true);
        $sheet->getStyle('B' . $row)->getNumberFormat()->setFormatCode('#,##0.00');

        // Net Profit
        $row += 2;
        $netProfit = $totalRevenue - $totalExpenses;
        $sheet->setCellValue('A' . $row, 'NET PROFIT/LOSS');
        $sheet->setCellValue('B' . $row, $netProfit);

        $sheet->getStyle('A' . $row . ':B' . $row)->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()->setARGB($netProfit >= 0 ? 'FF4CAF50' : 'FFF44336');
        $sheet->getStyle('A' . $row . ':B' . $row)->getFont()->getColor()->setARGB(Color::COLOR_WHITE);
        $sheet->getStyle('A' . $row . ':B' . $row)->getFont()->setBold(true);
        $sheet->getStyle('B' . $row)->getNumberFormat()->setFormatCode('#,##0.00');

        // Auto-size columns
        $sheet->getColumnDimension('A')->setWidth(40);
        $sheet->getColumnDimension('B')->setWidth(20);

        return $spreadsheet;
    }

    /**
     * Export Balance Sheet to Excel
     */
    public function exportBalanceSheet($data, $company, $asOfDate)
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Set title
        $sheet->setCellValue('A1', $company['name']);
        $sheet->setCellValue('A2', 'Balance Sheet');
        $sheet->setCellValue('A3', 'As of: ' . $asOfDate);

        $sheet->getStyle('A1:A3')->getFont()->setBold(true);
        $sheet->getStyle('A2')->getFont()->setSize(14);

        // Headers
        $row = 5;
        $sheet->setCellValue('A' . $row, 'Account');
        $sheet->setCellValue('B' . $row, 'Amount (RON)');

        $sheet->getStyle('A' . $row . ':B' . $row)->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()->setARGB('FF333333');
        $sheet->getStyle('A' . $row . ':B' . $row)->getFont()->getColor()->setARGB(Color::COLOR_WHITE);
        $sheet->getStyle('A' . $row . ':B' . $row)->getFont()->setBold(true);

        // Assets
        $row++;
        $sheet->setCellValue('A' . $row, 'ASSETS');
        $sheet->getStyle('A' . $row)->getFont()->setBold(true);

        $row++;
        $totalAssets = 0;
        foreach ($data['assets'] as $item) {
            $sheet->setCellValue('A' . $row, '  ' . $item['account']);
            $sheet->setCellValue('B' . $row, $item['amount']);
            $sheet->getStyle('B' . $row)->getNumberFormat()->setFormatCode('#,##0.00');
            $totalAssets += $item['amount'];
            $row++;
        }

        $sheet->setCellValue('A' . $row, 'Total Assets');
        $sheet->setCellValue('B' . $row, $totalAssets);
        $sheet->getStyle('A' . $row . ':B' . $row)->getFont()->setBold(true);
        $sheet->getStyle('B' . $row)->getNumberFormat()->setFormatCode('#,##0.00');

        // Liabilities
        $row += 2;
        $sheet->setCellValue('A' . $row, 'LIABILITIES');
        $sheet->getStyle('A' . $row)->getFont()->setBold(true);

        $row++;
        $totalLiabilities = 0;
        foreach ($data['liabilities'] as $item) {
            $sheet->setCellValue('A' . $row, '  ' . $item['account']);
            $sheet->setCellValue('B' . $row, $item['amount']);
            $sheet->getStyle('B' . $row)->getNumberFormat()->setFormatCode('#,##0.00');
            $totalLiabilities += $item['amount'];
            $row++;
        }

        $sheet->setCellValue('A' . $row, 'Total Liabilities');
        $sheet->setCellValue('B' . $row, $totalLiabilities);
        $sheet->getStyle('A' . $row . ':B' . $row)->getFont()->setBold(true);
        $sheet->getStyle('B' . $row)->getNumberFormat()->setFormatCode('#,##0.00');

        // Equity
        $row += 2;
        $sheet->setCellValue('A' . $row, 'EQUITY');
        $sheet->getStyle('A' . $row)->getFont()->setBold(true);

        $row++;
        $totalEquity = 0;
        foreach ($data['equity'] as $item) {
            $sheet->setCellValue('A' . $row, '  ' . $item['account']);
            $sheet->setCellValue('B' . $row, $item['amount']);
            $sheet->getStyle('B' . $row)->getNumberFormat()->setFormatCode('#,##0.00');
            $totalEquity += $item['amount'];
            $row++;
        }

        $sheet->setCellValue('A' . $row, 'Total Equity');
        $sheet->setCellValue('B' . $row, $totalEquity);
        $sheet->getStyle('A' . $row . ':B' . $row)->getFont()->setBold(true);
        $sheet->getStyle('B' . $row)->getNumberFormat()->setFormatCode('#,##0.00');

        // Balance check
        $row += 2;
        $sheet->setCellValue('A' . $row, 'TOTAL LIABILITIES + EQUITY');
        $sheet->setCellValue('B' . $row, $totalLiabilities + $totalEquity);
        $sheet->getStyle('A' . $row . ':B' . $row)->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()->setARGB('FF2196F3');
        $sheet->getStyle('A' . $row . ':B' . $row)->getFont()->getColor()->setARGB(Color::COLOR_WHITE);
        $sheet->getStyle('A' . $row . ':B' . $row)->getFont()->setBold(true);
        $sheet->getStyle('B' . $row)->getNumberFormat()->setFormatCode('#,##0.00');

        $sheet->getColumnDimension('A')->setWidth(40);
        $sheet->getColumnDimension('B')->setWidth(20);

        return $spreadsheet;
    }

    /**
     * Export Cash Flow statement to Excel
     */
    public function exportCashFlow($data, $company, $period)
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        $sheet->setCellValue('A1', $company['name']);
        $sheet->setCellValue('A2', 'Cash Flow Statement');
        $sheet->setCellValue('A3', 'Period: ' . $period);

        $sheet->getStyle('A1:A3')->getFont()->setBold(true);
        $sheet->getStyle('A2')->getFont()->setSize(14);

        $row = 5;
        $sheet->setCellValue('A' . $row, 'Category');
        $sheet->setCellValue('B' . $row, 'Amount (RON)');

        $sheet->getStyle('A' . $row . ':B' . $row)->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()->setARGB('FF333333');
        $sheet->getStyle('A' . $row . ':B' . $row)->getFont()->getColor()->setARGB(Color::COLOR_WHITE);
        $sheet->getStyle('A' . $row . ':B' . $row)->getFont()->setBold(true);

        // Operating Activities
        $row++;
        $sheet->setCellValue('A' . $row, 'OPERATING ACTIVITIES');
        $sheet->getStyle('A' . $row)->getFont()->setBold(true);

        $row++;
        foreach ($data['operating'] as $item) {
            $sheet->setCellValue('A' . $row, '  ' . $item['description']);
            $sheet->setCellValue('B' . $row, $item['amount']);
            $sheet->getStyle('B' . $row)->getNumberFormat()->setFormatCode('#,##0.00');
            $row++;
        }

        // Investing Activities
        $row++;
        $sheet->setCellValue('A' . $row, 'INVESTING ACTIVITIES');
        $sheet->getStyle('A' . $row)->getFont()->setBold(true);

        $row++;
        foreach ($data['investing'] as $item) {
            $sheet->setCellValue('A' . $row, '  ' . $item['description']);
            $sheet->setCellValue('B' . $row, $item['amount']);
            $sheet->getStyle('B' . $row)->getNumberFormat()->setFormatCode('#,##0.00');
            $row++;
        }

        // Financing Activities
        $row++;
        $sheet->setCellValue('A' . $row, 'FINANCING ACTIVITIES');
        $sheet->getStyle('A' . $row)->getFont()->setBold(true);

        $row++;
        foreach ($data['financing'] as $item) {
            $sheet->setCellValue('A' . $row, '  ' . $item['description']);
            $sheet->setCellValue('B' . $row, $item['amount']);
            $sheet->getStyle('B' . $row)->getNumberFormat()->setFormatCode('#,##0.00');
            $row++;
        }

        // Net Change in Cash
        $row++;
        $sheet->setCellValue('A' . $row, 'NET CHANGE IN CASH');
        $sheet->setCellValue('B' . $row, $data['net_change']);
        $sheet->getStyle('A' . $row . ':B' . $row)->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()->setARGB('FF2196F3');
        $sheet->getStyle('A' . $row . ':B' . $row)->getFont()->getColor()->setARGB(Color::COLOR_WHITE);
        $sheet->getStyle('A' . $row . ':B' . $row)->getFont()->setBold(true);
        $sheet->getStyle('B' . $row)->getNumberFormat()->setFormatCode('#,##0.00');

        $sheet->getColumnDimension('A')->setWidth(40);
        $sheet->getColumnDimension('B')->setWidth(20);

        return $spreadsheet;
    }

    /**
     * Save spreadsheet to file
     */
    public function saveAsExcel($spreadsheet, $filename)
    {
        $writer = new Xlsx($spreadsheet);
        $writer->save($filename);
        return $filename;
    }

    /**
     * Save spreadsheet as CSV
     */
    public function saveAsCSV($spreadsheet, $filename)
    {
        $writer = new Csv($spreadsheet);
        $writer->save($filename);
        return $filename;
    }

    /**
     * Output spreadsheet directly to browser
     */
    public function outputExcel($spreadsheet, $filename)
    {
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: max-age=0');

        $writer = new Xlsx($spreadsheet);
        $writer->save('php://output');
    }

    /**
     * Output CSV directly to browser
     */
    public function outputCSV($spreadsheet, $filename)
    {
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: max-age=0');

        $writer = new Csv($spreadsheet);
        $writer->save('php://output');
    }
}
