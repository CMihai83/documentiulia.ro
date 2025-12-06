<?php
/**
 * Report Export API
 * Export reports to PDF, Excel, CSV formats
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Content-Type: application/json');
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';

$user = authenticate();
if (!$user) {
    header('Content-Type: application/json');
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
if (!$companyId) {
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Company ID required']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$format = $input['format'] ?? 'pdf';
$reportType = $input['report_type'] ?? 'custom';
$reportId = $input['report_id'] ?? null;
$data = $input['data'] ?? [];
$options = $input['options'] ?? [];

$validFormats = ['pdf', 'excel', 'csv', 'json'];
if (!in_array($format, $validFormats)) {
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid format. Use: pdf, excel, csv, json']);
    exit;
}

try {
    $db = getDbConnection();
    
    // Get company info for header
    $stmt = $db->prepare("SELECT name, legal_name, tax_id FROM companies WHERE id = :id");
    $stmt->execute(['id' => $companyId]);
    $company = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $reportTitle = $options['title'] ?? 'Raport Export';
    $dateRange = $options['date_range'] ?? '';
    
    switch ($format) {
        case 'csv':
            exportCSV($data, $reportTitle, $company);
            break;
            
        case 'excel':
            exportExcel($data, $reportTitle, $company, $dateRange);
            break;
            
        case 'pdf':
            exportPDF($data, $reportTitle, $company, $dateRange, $options);
            break;
            
        case 'json':
            exportJSON($data, $reportTitle, $company);
            break;
    }
    
} catch (Exception $e) {
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Export error: ' . $e->getMessage()]);
}

function exportCSV($data, $title, $company) {
    $filename = sanitizeFilename($title) . '_' . date('Y-m-d') . '.csv';
    
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    
    $output = fopen('php://output', 'w');
    
    // BOM for Excel UTF-8 compatibility
    fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
    
    // Header row
    if (!empty($data['columns'])) {
        $headers = array_map(function($col) {
            return $col['label_ro'] ?? $col['label'] ?? $col['field'] ?? '';
        }, $data['columns']);
        fputcsv($output, $headers, ';');
    }
    
    // Data rows
    if (!empty($data['rows'])) {
        foreach ($data['rows'] as $row) {
            $values = [];
            foreach ($data['columns'] as $col) {
                $field = $col['field'] ?? '';
                $values[] = $row[$field] ?? '';
            }
            fputcsv($output, $values, ';');
        }
    }
    
    // Totals row
    if (!empty($data['totals'])) {
        fputcsv($output, [], ';');
        fputcsv($output, array_merge(['TOTAL'], array_values($data['totals'])), ';');
    }
    
    fclose($output);
}

function exportExcel($data, $title, $company, $dateRange) {
    // Simple Excel XML format (works without PhpSpreadsheet)
    $filename = sanitizeFilename($title) . '_' . date('Y-m-d') . '.xls';
    
    header('Content-Type: application/vnd.ms-excel');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    
    echo '<?xml version="1.0" encoding="UTF-8"?>
    <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
     xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
    <Worksheet ss:Name="' . htmlspecialchars($title) . '">
    <Table>';
    
    // Company header
    echo '<Row><Cell><Data ss:Type="String">' . htmlspecialchars($company['name'] ?? '') . '</Data></Cell></Row>';
    echo '<Row><Cell><Data ss:Type="String">' . htmlspecialchars($title) . '</Data></Cell></Row>';
    if ($dateRange) {
        echo '<Row><Cell><Data ss:Type="String">Perioada: ' . htmlspecialchars($dateRange) . '</Data></Cell></Row>';
    }
    echo '<Row></Row>';
    
    // Column headers
    if (!empty($data['columns'])) {
        echo '<Row>';
        foreach ($data['columns'] as $col) {
            $label = htmlspecialchars($col['label_ro'] ?? $col['label'] ?? $col['field'] ?? '');
            echo '<Cell><Data ss:Type="String">' . $label . '</Data></Cell>';
        }
        echo '</Row>';
    }
    
    // Data rows
    if (!empty($data['rows'])) {
        foreach ($data['rows'] as $row) {
            echo '<Row>';
            foreach ($data['columns'] as $col) {
                $field = $col['field'] ?? '';
                $value = $row[$field] ?? '';
                $type = is_numeric($value) ? 'Number' : 'String';
                echo '<Cell><Data ss:Type="' . $type . '">' . htmlspecialchars($value) . '</Data></Cell>';
            }
            echo '</Row>';
        }
    }
    
    // Totals
    if (!empty($data['totals'])) {
        echo '<Row></Row><Row><Cell><Data ss:Type="String">TOTAL</Data></Cell>';
        foreach ($data['totals'] as $total) {
            $type = is_numeric($total) ? 'Number' : 'String';
            echo '<Cell><Data ss:Type="' . $type . '">' . htmlspecialchars($total) . '</Data></Cell>';
        }
        echo '</Row>';
    }
    
    echo '</Table></Worksheet></Workbook>';
}

function exportPDF($data, $title, $company, $dateRange, $options) {
    // Generate HTML for PDF
    $html = '<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: DejaVu Sans, Arial, sans-serif; font-size: 10pt; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #1a5276; padding-bottom: 10px; }
            .company-name { font-size: 16pt; font-weight: bold; color: #1a5276; }
            .report-title { font-size: 14pt; margin-top: 10px; }
            .date-range { font-size: 10pt; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #1a5276; color: white; padding: 8px; text-align: left; }
            td { padding: 6px 8px; border-bottom: 1px solid #ddd; }
            tr:nth-child(even) { background: #f9f9f9; }
            .totals-row { font-weight: bold; background: #ecf0f1; }
            .footer { margin-top: 30px; font-size: 8pt; color: #666; text-align: center; }
            .money { text-align: right; }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="company-name">' . htmlspecialchars($company['name'] ?? '') . '</div>
            <div class="report-title">' . htmlspecialchars($title) . '</div>
            ' . ($dateRange ? '<div class="date-range">Perioada: ' . htmlspecialchars($dateRange) . '</div>' : '') . '
        </div>
        
        <table>
            <thead><tr>';
    
    // Headers
    if (!empty($data['columns'])) {
        foreach ($data['columns'] as $col) {
            $html .= '<th>' . htmlspecialchars($col['label_ro'] ?? $col['label'] ?? '') . '</th>';
        }
    }
    
    $html .= '</tr></thead><tbody>';
    
    // Data rows
    if (!empty($data['rows'])) {
        foreach ($data['rows'] as $row) {
            $html .= '<tr>';
            foreach ($data['columns'] as $col) {
                $field = $col['field'] ?? '';
                $value = $row[$field] ?? '';
                $class = ($col['type'] ?? '') === 'money' ? 'money' : '';
                if (is_numeric($value) && ($col['type'] ?? '') === 'money') {
                    $value = number_format($value, 2, ',', '.');
                }
                $html .= '<td class="' . $class . '">' . htmlspecialchars($value) . '</td>';
            }
            $html .= '</tr>';
        }
    }
    
    // Totals
    if (!empty($data['totals'])) {
        $html .= '<tr class="totals-row"><td>TOTAL</td>';
        foreach ($data['totals'] as $total) {
            if (is_numeric($total)) {
                $total = number_format($total, 2, ',', '.');
            }
            $html .= '<td class="money">' . htmlspecialchars($total) . '</td>';
        }
        $html .= '</tr>';
    }
    
    $html .= '</tbody></table>
        <div class="footer">
            Generat la: ' . date('d.m.Y H:i') . ' | DocumentIulia.ro
        </div>
    </body>
    </html>';
    
    // For now, return HTML (would use mPDF in production)
    $filename = sanitizeFilename($title) . '_' . date('Y-m-d') . '.html';
    header('Content-Type: text/html; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    echo $html;
}

function exportJSON($data, $title, $company) {
    $filename = sanitizeFilename($title) . '_' . date('Y-m-d') . '.json';
    
    header('Content-Type: application/json');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    
    echo json_encode([
        'title' => $title,
        'company' => $company,
        'generated_at' => date('c'),
        'data' => $data,
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}

function sanitizeFilename($name) {
    $name = preg_replace('/[^a-zA-Z0-9_-]/', '_', $name);
    return substr($name, 0, 50);
}
