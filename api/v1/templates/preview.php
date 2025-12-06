<?php
/**
 * Template Preview API
 * GET - Generate a preview of a template with sample data
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';

$user = authenticate();
if (!$user) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
$templateId = $_GET['id'] ?? null;
$format = $_GET['format'] ?? 'html';

// Sample data for preview
$sampleData = [
    'invoice' => [
        'number' => 'FCT-2024-001',
        'date' => date('d.m.Y'),
        'due_date' => date('d.m.Y', strtotime('+30 days')),
        'company' => [
            'name' => 'COMPANIA DEMONSTRATIVĂ SRL',
            'tax_id' => 'RO12345678',
            'trade_register' => 'J40/1234/2020',
            'address' => 'Str. Exemplu Nr. 10, Sector 1, București',
            'bank_account' => 'RO49 AAAA 1B31 0075 9384 0000',
            'bank_name' => 'Banca Demonstrativă',
            'phone' => '+40 21 123 4567',
            'email' => 'contact@companie.ro',
        ],
        'customer' => [
            'name' => 'CLIENT EXEMPLU SRL',
            'tax_id' => 'RO87654321',
            'trade_register' => 'J40/5678/2019',
            'address' => 'Bd. Demonstrație Nr. 25, Cluj-Napoca',
        ],
        'items' => [
            ['description' => 'Servicii consultanță IT', 'quantity' => 10, 'unit' => 'ore', 'unit_price' => 150.00, 'vat_rate' => 19],
            ['description' => 'Dezvoltare software personalizat', 'quantity' => 1, 'unit' => 'buc', 'unit_price' => 2500.00, 'vat_rate' => 19],
            ['description' => 'Mentenanță lunară', 'quantity' => 1, 'unit' => 'lună', 'unit_price' => 500.00, 'vat_rate' => 19],
        ],
        'subtotal' => 4500.00,
        'vat_amount' => 855.00,
        'total' => 5355.00,
        'currency' => 'RON',
        'notes' => 'Vă mulțumim pentru colaborare!',
        'payment_terms' => 'Plata în termen de 30 de zile de la emiterea facturii.',
    ],
    'quote' => [
        'number' => 'OFR-2024-001',
        'date' => date('d.m.Y'),
        'valid_until' => date('d.m.Y', strtotime('+15 days')),
        'company' => [
            'name' => 'COMPANIA DEMONSTRATIVĂ SRL',
            'tax_id' => 'RO12345678',
            'address' => 'Str. Exemplu Nr. 10, București',
        ],
        'customer' => [
            'name' => 'CLIENT POTENȚIAL SRL',
            'address' => 'Str. Prospect Nr. 5, Timișoara',
        ],
        'items' => [
            ['description' => 'Proiect website complet', 'quantity' => 1, 'unit_price' => 5000.00],
            ['description' => 'SEO optimizare (6 luni)', 'quantity' => 6, 'unit' => 'luni', 'unit_price' => 300.00],
        ],
        'subtotal' => 6800.00,
        'vat_amount' => 1292.00,
        'total' => 8092.00,
    ],
    'receipt' => [
        'number' => 'CHT-2024-001',
        'date' => date('d.m.Y'),
        'company' => [
            'name' => 'COMPANIA DEMONSTRATIVĂ SRL',
            'tax_id' => 'RO12345678',
        ],
        'payer' => [
            'name' => 'Ion Popescu',
        ],
        'amount' => 1500.00,
        'amount_in_words' => 'una mie cinci sute lei',
        'description' => 'Contravaloare factură FCT-2024-001',
        'currency' => 'RON',
    ],
    'delivery_note' => [
        'number' => 'AVZ-2024-001',
        'date' => date('d.m.Y'),
        'company' => [
            'name' => 'COMPANIA DEMONSTRATIVĂ SRL',
            'address' => 'Str. Exemplu Nr. 10, București',
        ],
        'recipient' => [
            'name' => 'CLIENT EXEMPLU SRL',
            'address' => 'Bd. Livrare Nr. 50, Brașov',
        ],
        'vehicle' => [
            'plate' => 'B-123-ABC',
            'driver' => 'Gheorghe Transportescu',
        ],
        'items' => [
            ['description' => 'Laptop Dell XPS 15', 'quantity' => 5, 'unit' => 'buc'],
            ['description' => 'Monitor Samsung 27"', 'quantity' => 10, 'unit' => 'buc'],
        ],
    ],
];

// Get template type to determine which sample data to use
$templateType = $_GET['type'] ?? 'invoice';

// Generate preview HTML
$previewData = $sampleData[$templateType] ?? $sampleData['invoice'];

// Basic HTML template for preview
$html = '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: "DejaVu Sans", Arial, sans-serif; font-size: 10pt; color: #2c3e50; margin: 20px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #1a5276; padding-bottom: 15px; }
        .logo { font-size: 24pt; font-weight: bold; color: #1a5276; }
        .document-info { text-align: right; }
        .document-title { font-size: 18pt; color: #1a5276; margin-bottom: 10px; }
        .parties { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .party { width: 45%; }
        .party-title { font-weight: bold; color: #1a5276; border-bottom: 1px solid #1a5276; margin-bottom: 10px; padding-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #ecf0f1; color: #2c3e50; padding: 10px; text-align: left; border: 1px solid #bdc3c7; }
        td { padding: 8px 10px; border: 1px solid #bdc3c7; }
        tr:nth-child(even) { background: #f9f9f9; }
        .totals { text-align: right; margin-top: 20px; }
        .total-row { margin-bottom: 5px; }
        .total-final { font-size: 14pt; font-weight: bold; color: #1a5276; }
        .footer { margin-top: 30px; border-top: 1px solid #bdc3c7; padding-top: 15px; }
        .signatures { display: flex; justify-content: space-between; margin-top: 50px; }
        .signature { width: 40%; text-align: center; }
        .signature-line { border-top: 1px solid #2c3e50; margin-top: 50px; padding-top: 5px; }
        .preview-watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 72pt; color: rgba(0,0,0,0.05); z-index: -1; }
    </style>
</head>
<body>
    <div class="preview-watermark">PREVIZUALIZARE</div>
    <div class="header">
        <div class="logo">' . htmlspecialchars($previewData['company']['name']) . '</div>
        <div class="document-info">
            <div class="document-title">' . strtoupper($templateType === 'invoice' ? 'FACTURĂ' : ($templateType === 'quote' ? 'OFERTĂ' : ($templateType === 'receipt' ? 'CHITANȚĂ' : 'AVIZ'))) . '</div>
            <div>Nr: ' . htmlspecialchars($previewData['number']) . '</div>
            <div>Data: ' . htmlspecialchars($previewData['date']) . '</div>
        </div>
    </div>
    
    <div class="parties">
        <div class="party">
            <div class="party-title">Furnizor</div>
            <div>' . htmlspecialchars($previewData['company']['name']) . '</div>
            <div>CIF: ' . htmlspecialchars($previewData['company']['tax_id'] ?? '') . '</div>
            <div>' . htmlspecialchars($previewData['company']['address'] ?? '') . '</div>
        </div>
        <div class="party">
            <div class="party-title">' . ($templateType === 'receipt' ? 'Plătitor' : 'Client') . '</div>';

if ($templateType === 'receipt') {
    $html .= '<div>' . htmlspecialchars($previewData['payer']['name'] ?? '') . '</div>';
} else {
    $html .= '<div>' . htmlspecialchars($previewData['customer']['name'] ?? $previewData['recipient']['name'] ?? '') . '</div>
            <div>' . htmlspecialchars($previewData['customer']['address'] ?? $previewData['recipient']['address'] ?? '') . '</div>';
}

$html .= '</div>
    </div>';

if (isset($previewData['items']) && is_array($previewData['items'])) {
    $html .= '<table>
        <thead>
            <tr>
                <th>Nr.</th>
                <th>Descriere</th>
                <th>Cantitate</th>
                <th>UM</th>';
    if ($templateType !== 'delivery_note') {
        $html .= '<th>Preț unitar</th>
                <th>Valoare</th>';
    }
    $html .= '</tr>
        </thead>
        <tbody>';
    
    $nr = 1;
    foreach ($previewData['items'] as $item) {
        $value = ($item['quantity'] ?? 1) * ($item['unit_price'] ?? 0);
        $html .= '<tr>
            <td>' . $nr++ . '</td>
            <td>' . htmlspecialchars($item['description']) . '</td>
            <td style="text-align:right">' . number_format($item['quantity'] ?? 1, 2, ',', '.') . '</td>
            <td>' . htmlspecialchars($item['unit'] ?? 'buc') . '</td>';
        if ($templateType !== 'delivery_note') {
            $html .= '<td style="text-align:right">' . number_format($item['unit_price'] ?? 0, 2, ',', '.') . '</td>
            <td style="text-align:right">' . number_format($value, 2, ',', '.') . '</td>';
        }
        $html .= '</tr>';
    }
    
    $html .= '</tbody>
    </table>';
}

if ($templateType === 'receipt') {
    $html .= '<div class="totals">
        <div class="total-row"><strong>Suma primită:</strong> ' . number_format($previewData['amount'] ?? 0, 2, ',', '.') . ' ' . ($previewData['currency'] ?? 'RON') . '</div>
        <div class="total-row"><em>Adică: ' . htmlspecialchars($previewData['amount_in_words'] ?? '') . '</em></div>
        <div class="total-row">Reprezentând: ' . htmlspecialchars($previewData['description'] ?? '') . '</div>
    </div>';
} elseif ($templateType !== 'delivery_note') {
    $html .= '<div class="totals">
        <div class="total-row">Subtotal: ' . number_format($previewData['subtotal'] ?? 0, 2, ',', '.') . ' ' . ($previewData['currency'] ?? 'RON') . '</div>
        <div class="total-row">TVA (19%): ' . number_format($previewData['vat_amount'] ?? 0, 2, ',', '.') . ' ' . ($previewData['currency'] ?? 'RON') . '</div>
        <div class="total-row total-final">TOTAL: ' . number_format($previewData['total'] ?? 0, 2, ',', '.') . ' ' . ($previewData['currency'] ?? 'RON') . '</div>
    </div>';
}

$html .= '<div class="signatures">
        <div class="signature">
            <div class="signature-line">Semnătura furnizor</div>
        </div>
        <div class="signature">
            <div class="signature-line">Semnătura client</div>
        </div>
    </div>
</body>
</html>';

if ($format === 'raw' || $format === 'html') {
    header('Content-Type: text/html; charset=utf-8');
    echo $html;
} else {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'data' => [
            'html' => $html,
            'template_id' => $templateId,
            'type' => $templateType,
            'sample_data' => $previewData,
        ],
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
