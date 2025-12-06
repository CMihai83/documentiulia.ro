<?php
/**
 * Italian Localization API
 * GET /api/v1/localization/italian.php - Get all Italian localization data
 * GET /api/v1/localization/italian.php?section=accounts - Chart of accounts
 * GET /api/v1/localization/italian.php?section=vat - VAT rules
 * GET /api/v1/localization/italian.php?section=invoice - Invoice requirements (FatturaPA)
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Italian Piano dei Conti (Chart of Accounts)
$italianAccounts = [
    // Attivo (Assets)
    ['code' => '06.01', 'name' => 'Terreni', 'name_en' => 'Land', 'type' => 'asset', 'category' => 'immobilizzazioni'],
    ['code' => '06.02', 'name' => 'Fabbricati', 'name_en' => 'Buildings', 'type' => 'asset', 'category' => 'immobilizzazioni'],
    ['code' => '06.03', 'name' => 'Impianti e macchinari', 'name_en' => 'Plant and machinery', 'type' => 'asset', 'category' => 'immobilizzazioni'],
    ['code' => '06.04', 'name' => 'Attrezzature industriali', 'name_en' => 'Industrial equipment', 'type' => 'asset', 'category' => 'immobilizzazioni'],
    ['code' => '06.05', 'name' => 'Mobili e arredi', 'name_en' => 'Furniture and fixtures', 'type' => 'asset', 'category' => 'immobilizzazioni'],
    ['code' => '06.06', 'name' => 'Macchine ufficio elettroniche', 'name_en' => 'Electronic office equipment', 'type' => 'asset', 'category' => 'immobilizzazioni'],
    ['code' => '14.01', 'name' => 'Crediti verso clienti', 'name_en' => 'Trade receivables', 'type' => 'asset', 'category' => 'attivo_circolante'],
    ['code' => '14.05', 'name' => 'Crediti IVA', 'name_en' => 'VAT receivables', 'type' => 'asset', 'category' => 'attivo_circolante'],
    ['code' => '18.01', 'name' => 'Banca c/c', 'name_en' => 'Bank current account', 'type' => 'asset', 'category' => 'attivo_circolante'],
    ['code' => '18.02', 'name' => 'Cassa', 'name_en' => 'Cash', 'type' => 'asset', 'category' => 'attivo_circolante'],

    // Passivo (Liabilities & Equity)
    ['code' => '22.01', 'name' => 'Capitale sociale', 'name_en' => 'Share capital', 'type' => 'equity', 'category' => 'patrimonio_netto'],
    ['code' => '22.02', 'name' => 'Riserva legale', 'name_en' => 'Legal reserve', 'type' => 'equity', 'category' => 'patrimonio_netto'],
    ['code' => '22.05', 'name' => 'Utile/Perdita d\'esercizio', 'name_en' => 'Profit/Loss for the year', 'type' => 'equity', 'category' => 'patrimonio_netto'],
    ['code' => '28.01', 'name' => 'Debiti verso fornitori', 'name_en' => 'Trade payables', 'type' => 'liability', 'category' => 'debiti'],
    ['code' => '28.05', 'name' => 'Debiti IVA', 'name_en' => 'VAT payables', 'type' => 'liability', 'category' => 'debiti'],
    ['code' => '28.10', 'name' => 'Debiti verso banche', 'name_en' => 'Bank loans', 'type' => 'liability', 'category' => 'debiti'],
    ['code' => '28.15', 'name' => 'Debiti verso dipendenti', 'name_en' => 'Payables to employees', 'type' => 'liability', 'category' => 'debiti'],

    // Ricavi (Revenue)
    ['code' => '40.01', 'name' => 'Ricavi vendite prodotti', 'name_en' => 'Product sales revenue', 'type' => 'revenue', 'category' => 'ricavi'],
    ['code' => '40.02', 'name' => 'Ricavi prestazioni servizi', 'name_en' => 'Service revenue', 'type' => 'revenue', 'category' => 'ricavi'],
    ['code' => '40.10', 'name' => 'Ricavi esportazioni', 'name_en' => 'Export revenue', 'type' => 'revenue', 'category' => 'ricavi'],
    ['code' => '40.15', 'name' => 'Ricavi UE', 'name_en' => 'EU revenue', 'type' => 'revenue', 'category' => 'ricavi'],

    // Costi (Expenses)
    ['code' => '60.01', 'name' => 'Acquisti materie prime', 'name_en' => 'Raw materials purchases', 'type' => 'expense', 'category' => 'costi'],
    ['code' => '60.02', 'name' => 'Acquisti merci', 'name_en' => 'Goods purchases', 'type' => 'expense', 'category' => 'costi'],
    ['code' => '62.01', 'name' => 'Salari e stipendi', 'name_en' => 'Salaries and wages', 'type' => 'expense', 'category' => 'costi_personale'],
    ['code' => '62.02', 'name' => 'Oneri sociali', 'name_en' => 'Social security costs', 'type' => 'expense', 'category' => 'costi_personale'],
    ['code' => '62.03', 'name' => 'TFR', 'name_en' => 'Severance pay provision', 'type' => 'expense', 'category' => 'costi_personale'],
    ['code' => '64.01', 'name' => 'Affitti passivi', 'name_en' => 'Rent expense', 'type' => 'expense', 'category' => 'costi_servizi'],
    ['code' => '64.02', 'name' => 'Utenze', 'name_en' => 'Utilities', 'type' => 'expense', 'category' => 'costi_servizi'],
    ['code' => '64.10', 'name' => 'Consulenze', 'name_en' => 'Consulting fees', 'type' => 'expense', 'category' => 'costi_servizi'],
    ['code' => '66.01', 'name' => 'Ammortamenti immobilizzazioni materiali', 'name_en' => 'Depreciation', 'type' => 'expense', 'category' => 'ammortamenti'],
];

// Italian VAT Rules
$italianVATRules = [
    'standard_rate' => 22,
    'reduced_rates' => [
        ['rate' => 10, 'description' => 'Aliquota ridotta - tourism, some foods, energy'],
        ['rate' => 5, 'description' => 'Aliquota super-ridotta - essential goods'],
        ['rate' => 4, 'description' => 'Aliquota minima - basic necessities, books, newspapers'],
    ],
    'e_invoicing_mandatory' => true,
    'sdi_system' => true, // Sistema di Interscambio
    'sdi_code_length' => 7,
    'retention_period' => 10, // Years
    'filing_deadlines' => [
        'monthly_vat' => 16, // Day of following month
        'quarterly_vat' => 16, // Day of second month after quarter
        'annual_declaration' => 'april_30',
    ],
    'spesometro' => false, // Abolished, replaced by e-invoicing
    'esterometro' => true, // Cross-border transactions report
];

// Italian Invoice Requirements (FatturaPA)
$italianInvoiceRequirements = [
    'format' => 'FatturaPA XML',
    'transmission' => 'SDI (Sistema di Interscambio)',
    'required_fields' => [
        'progressive_number' => 'Numero progressivo',
        'date' => 'Data',
        'seller_vat' => 'Partita IVA cedente',
        'seller_fiscal_code' => 'Codice fiscale cedente',
        'buyer_vat_or_fiscal' => 'Partita IVA o CF cessionario',
        'sdi_code' => 'Codice SDI destinatario',
        'pec_address' => 'Indirizzo PEC (alternativo a SDI)',
        'description' => 'Descrizione beni/servizi',
        'quantity' => 'Quantità',
        'unit_price' => 'Prezzo unitario',
        'vat_rate' => 'Aliquota IVA',
        'total_amount' => 'Importo totale',
    ],
    'payment_terms' => [
        'immediate' => 'TP01',
        'deferred' => 'TP02',
        'advance' => 'TP03',
    ],
    'document_types' => [
        'TD01' => 'Fattura',
        'TD02' => 'Acconto su fattura',
        'TD03' => 'Acconto su parcella',
        'TD04' => 'Nota di credito',
        'TD05' => 'Nota di debito',
        'TD06' => 'Parcella',
        'TD24' => 'Fattura differita',
        'TD25' => 'Fattura accompagnatoria',
    ],
];

try {
    $section = $_GET['section'] ?? null;

    if ($section === 'accounts') {
        $data = [
            'framework' => 'Piano dei Conti',
            'country' => 'IT',
            'accounts' => $italianAccounts,
            'total_accounts' => count($italianAccounts),
        ];
    } elseif ($section === 'vat') {
        $data = $italianVATRules;
    } elseif ($section === 'invoice') {
        $data = $italianInvoiceRequirements;
    } else {
        $data = [
            'country' => 'Italy',
            'country_code' => 'IT',
            'currency' => 'EUR',
            'language' => 'it',
            'chart_of_accounts' => 'Piano dei Conti',
            'vat_rules' => $italianVATRules,
            'invoice_requirements' => $italianInvoiceRequirements,
            'e_invoicing_format' => 'FatturaPA (XML)',
            'fiscal_year' => 'calendar_year',
            'date_format' => 'DD/MM/YYYY',
            'number_format' => ['decimal' => ',', 'thousands' => '.'],
            'tax_authority' => 'Agenzia delle Entrate',
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
