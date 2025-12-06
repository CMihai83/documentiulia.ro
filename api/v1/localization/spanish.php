<?php
/**
 * Spanish Localization API
 * GET /api/v1/localization/spanish.php - Get all Spanish localization data
 * GET /api/v1/localization/spanish.php?section=accounts - Chart of accounts (PGC 2007)
 * GET /api/v1/localization/spanish.php?section=vat - VAT rules (IVA)
 * GET /api/v1/localization/spanish.php?section=invoice - Invoice requirements
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Spanish PGC 2007 (Plan General de Contabilidad)
$spanishAccounts = [
    // Grupo 1 - Financiación Básica
    ['code' => '100', 'name' => 'Capital social', 'name_en' => 'Share capital', 'type' => 'equity', 'category' => 'fondos_propios'],
    ['code' => '112', 'name' => 'Reserva legal', 'name_en' => 'Legal reserve', 'type' => 'equity', 'category' => 'fondos_propios'],
    ['code' => '129', 'name' => 'Resultado del ejercicio', 'name_en' => 'Profit/loss for the year', 'type' => 'equity', 'category' => 'fondos_propios'],
    ['code' => '170', 'name' => 'Deudas a largo plazo con entidades de crédito', 'name_en' => 'Long-term bank debt', 'type' => 'liability', 'category' => 'deudas_largo'],

    // Grupo 2 - Activo No Corriente
    ['code' => '210', 'name' => 'Terrenos y bienes naturales', 'name_en' => 'Land', 'type' => 'asset', 'category' => 'inmovilizado'],
    ['code' => '211', 'name' => 'Construcciones', 'name_en' => 'Buildings', 'type' => 'asset', 'category' => 'inmovilizado'],
    ['code' => '212', 'name' => 'Instalaciones técnicas', 'name_en' => 'Technical installations', 'type' => 'asset', 'category' => 'inmovilizado'],
    ['code' => '213', 'name' => 'Maquinaria', 'name_en' => 'Machinery', 'type' => 'asset', 'category' => 'inmovilizado'],
    ['code' => '216', 'name' => 'Mobiliario', 'name_en' => 'Furniture', 'type' => 'asset', 'category' => 'inmovilizado'],
    ['code' => '217', 'name' => 'Equipos para procesos de información', 'name_en' => 'IT equipment', 'type' => 'asset', 'category' => 'inmovilizado'],
    ['code' => '281', 'name' => 'Amortización acumulada del inmovilizado material', 'name_en' => 'Accumulated depreciation', 'type' => 'asset', 'category' => 'inmovilizado'],

    // Grupo 3 - Existencias
    ['code' => '300', 'name' => 'Mercaderías', 'name_en' => 'Merchandise', 'type' => 'asset', 'category' => 'existencias'],
    ['code' => '310', 'name' => 'Materias primas', 'name_en' => 'Raw materials', 'type' => 'asset', 'category' => 'existencias'],

    // Grupo 4 - Acreedores y Deudores
    ['code' => '400', 'name' => 'Proveedores', 'name_en' => 'Trade payables', 'type' => 'liability', 'category' => 'acreedores'],
    ['code' => '410', 'name' => 'Acreedores por prestaciones de servicios', 'name_en' => 'Service creditors', 'type' => 'liability', 'category' => 'acreedores'],
    ['code' => '430', 'name' => 'Clientes', 'name_en' => 'Trade receivables', 'type' => 'asset', 'category' => 'deudores'],
    ['code' => '472', 'name' => 'Hacienda Pública, IVA soportado', 'name_en' => 'Input VAT', 'type' => 'asset', 'category' => 'hacienda'],
    ['code' => '477', 'name' => 'Hacienda Pública, IVA repercutido', 'name_en' => 'Output VAT', 'type' => 'liability', 'category' => 'hacienda'],
    ['code' => '476', 'name' => 'Organismos de la Seguridad Social, acreedores', 'name_en' => 'Social security payable', 'type' => 'liability', 'category' => 'hacienda'],

    // Grupo 5 - Cuentas Financieras
    ['code' => '520', 'name' => 'Deudas a corto plazo con entidades de crédito', 'name_en' => 'Short-term bank debt', 'type' => 'liability', 'category' => 'pasivo_corriente'],
    ['code' => '570', 'name' => 'Caja', 'name_en' => 'Cash', 'type' => 'asset', 'category' => 'tesoreria'],
    ['code' => '572', 'name' => 'Bancos e instituciones de crédito c/c', 'name_en' => 'Bank accounts', 'type' => 'asset', 'category' => 'tesoreria'],

    // Grupo 6 - Compras y Gastos
    ['code' => '600', 'name' => 'Compras de mercaderías', 'name_en' => 'Purchases of merchandise', 'type' => 'expense', 'category' => 'compras'],
    ['code' => '601', 'name' => 'Compras de materias primas', 'name_en' => 'Purchases of raw materials', 'type' => 'expense', 'category' => 'compras'],
    ['code' => '621', 'name' => 'Arrendamientos y cánones', 'name_en' => 'Rent and royalties', 'type' => 'expense', 'category' => 'servicios'],
    ['code' => '622', 'name' => 'Reparaciones y conservación', 'name_en' => 'Repairs and maintenance', 'type' => 'expense', 'category' => 'servicios'],
    ['code' => '623', 'name' => 'Servicios de profesionales independientes', 'name_en' => 'Professional services', 'type' => 'expense', 'category' => 'servicios'],
    ['code' => '628', 'name' => 'Suministros', 'name_en' => 'Utilities', 'type' => 'expense', 'category' => 'servicios'],
    ['code' => '640', 'name' => 'Sueldos y salarios', 'name_en' => 'Salaries and wages', 'type' => 'expense', 'category' => 'personal'],
    ['code' => '642', 'name' => 'Seguridad Social a cargo de la empresa', 'name_en' => 'Employer social security', 'type' => 'expense', 'category' => 'personal'],
    ['code' => '681', 'name' => 'Amortización del inmovilizado material', 'name_en' => 'Depreciation of fixed assets', 'type' => 'expense', 'category' => 'amortizaciones'],

    // Grupo 7 - Ventas e Ingresos
    ['code' => '700', 'name' => 'Ventas de mercaderías', 'name_en' => 'Sales of merchandise', 'type' => 'revenue', 'category' => 'ventas'],
    ['code' => '705', 'name' => 'Prestaciones de servicios', 'name_en' => 'Service revenue', 'type' => 'revenue', 'category' => 'ventas'],
    ['code' => '708', 'name' => 'Devoluciones de ventas y operaciones similares', 'name_en' => 'Sales returns', 'type' => 'revenue', 'category' => 'ventas'],
];

// Spanish VAT (IVA) Rules
$spanishVATRules = [
    'standard_rate' => 21,
    'reduced_rates' => [
        ['rate' => 10, 'description' => 'Tipo reducido - food, transport, hospitality'],
        ['rate' => 4, 'description' => 'Tipo superreducido - basic food, medicine, books'],
    ],
    'special_regimes' => [
        'equivalence_surcharge' => [
            'description' => 'Recargo de equivalencia (retail)',
            'rates' => [5.2, 1.4, 0.5], // Applied on top of 21%, 10%, 4%
        ],
        'simplified_regime' => 'Régimen simplificado',
        'agriculture_regime' => 'Régimen especial de la agricultura',
    ],
    'sii_required' => true, // Suministro Inmediato de Información
    'sii_threshold' => 6010121.04, // Annual turnover threshold
    'real_time_reporting' => true,
    'filing_deadlines' => [
        'sii_invoices' => 4, // Days to report issued invoices
        'sii_received' => 4, // Days to report received invoices
        'quarterly_model_303' => 20, // Day of month after quarter
        'annual_model_390' => 'january_30',
    ],
    'retention_period' => 4, // Years (general), 10 for real estate
];

// Spanish Invoice Requirements
$spanishInvoiceRequirements = [
    'format' => 'Facturae 3.2.x',
    'e_invoicing' => [
        'b2g_mandatory' => true, // Mandatory for public sector
        'b2b_voluntary' => true,
        'format' => 'Facturae XML',
        'platforms' => ['FACe', 'FACeB2B'],
    ],
    'required_fields' => [
        'numero_factura' => 'Invoice number',
        'fecha_expedicion' => 'Issue date',
        'nombre_emisor' => 'Seller name',
        'nif_emisor' => 'Seller NIF/CIF',
        'domicilio_emisor' => 'Seller address',
        'nombre_receptor' => 'Buyer name',
        'nif_receptor' => 'Buyer NIF/CIF',
        'descripcion' => 'Description of goods/services',
        'base_imponible' => 'Taxable base',
        'tipo_iva' => 'VAT rate',
        'cuota_iva' => 'VAT amount',
        'total_factura' => 'Total amount',
    ],
    'simplified_invoice_threshold' => 400, // EUR
    'ticket_threshold' => 3000, // EUR (for retail)
    'numbering' => 'Sequential per year',
    'sii_fields' => [
        'tipo_factura' => 'F1/F2/R1/R2/R3/R4/R5',
        'clave_regimen' => 'Tax regime code',
        'descripcion_operacion' => 'Transaction description',
    ],
];

try {
    $section = $_GET['section'] ?? null;

    if ($section === 'accounts') {
        $data = [
            'framework' => 'PGC 2007',
            'country' => 'ES',
            'accounts' => $spanishAccounts,
            'total_accounts' => count($spanishAccounts),
        ];
    } elseif ($section === 'vat') {
        $data = $spanishVATRules;
    } elseif ($section === 'invoice') {
        $data = $spanishInvoiceRequirements;
    } else {
        $data = [
            'country' => 'Spain',
            'country_code' => 'ES',
            'currency' => 'EUR',
            'language' => 'es',
            'chart_of_accounts' => 'PGC 2007',
            'vat_rules' => $spanishVATRules,
            'invoice_requirements' => $spanishInvoiceRequirements,
            'e_invoicing_format' => 'Facturae',
            'fiscal_year' => 'calendar_year',
            'date_format' => 'DD/MM/YYYY',
            'number_format' => ['decimal' => ',', 'thousands' => '.'],
            'tax_authority' => 'Agencia Tributaria',
            'sii_portal' => 'https://www.agenciatributaria.es/AEAT.internet/SII.html',
        ];
    }

    echo json_encode([
        'success' => true,
        'data' => $data
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
