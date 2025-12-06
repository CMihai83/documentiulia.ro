<?php
/**
 * Onboarding Checklist Endpoint
 * GET /api/v1/onboarding/checklist.php
 * Returns the onboarding checklist with completion status
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    // Authenticate
    $authHeader = getHeader('authorization', '') ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);
    $userId = $userData['user_id'];

    $companyId = getHeader('x-company-id') ?? '';
    if (empty($companyId)) {
        throw new Exception('Company ID required');
    }

    $db = Database::getInstance();

    // Define checklist items
    $checklistItems = [
        [
            'id' => 'complete_profile',
            'title_ro' => 'Completează profilul companiei',
            'title_en' => 'Complete company profile',
            'description_ro' => 'Adaugă informațiile companiei tale: nume, adresă, CUI',
            'description_en' => 'Add your company information: name, address, tax ID',
            'path' => '/settings/company',
            'icon' => 'Building2',
            'order' => 1
        ],
        [
            'id' => 'add_first_contact',
            'title_ro' => 'Adaugă primul client',
            'title_en' => 'Add your first client',
            'description_ro' => 'Creează primul contact în sistemul CRM',
            'description_en' => 'Create your first contact in the CRM system',
            'path' => '/contacts/new',
            'icon' => 'UserPlus',
            'order' => 2
        ],
        [
            'id' => 'create_first_invoice',
            'title_ro' => 'Emite prima factură',
            'title_en' => 'Create your first invoice',
            'description_ro' => 'Creează prima factură pentru un client',
            'description_en' => 'Create your first invoice for a client',
            'path' => '/invoices/new',
            'icon' => 'FileText',
            'order' => 3
        ],
        [
            'id' => 'setup_bank_account',
            'title_ro' => 'Configurează contul bancar',
            'title_en' => 'Set up bank account',
            'description_ro' => 'Adaugă informațiile contului bancar',
            'description_en' => 'Add your bank account information',
            'path' => '/settings/banking',
            'icon' => 'CreditCard',
            'order' => 4
        ],
        [
            'id' => 'create_first_project',
            'title_ro' => 'Creează primul proiect',
            'title_en' => 'Create your first project',
            'description_ro' => 'Începe să gestionezi proiectele tale',
            'description_en' => 'Start managing your projects',
            'path' => '/projects/new',
            'icon' => 'FolderKanban',
            'order' => 5
        ]
    ];

    // Check completion status for each item
    foreach ($checklistItems as &$item) {
        $item['completed'] = false;

        switch ($item['id']) {
            case 'complete_profile':
                $company = $db->fetchOne(
                    "SELECT tax_id, address_street FROM companies WHERE id = :id",
                    ['id' => $companyId]
                );
                $item['completed'] = !empty($company['tax_id']) && !empty($company['address_street']);
                break;

            case 'add_first_contact':
                $contactCount = $db->fetchOne(
                    "SELECT COUNT(*) as cnt FROM contacts WHERE company_id = :company_id",
                    ['company_id' => $companyId]
                );
                $item['completed'] = ($contactCount['cnt'] ?? 0) > 0;
                break;

            case 'create_first_invoice':
                $invoiceCount = $db->fetchOne(
                    "SELECT COUNT(*) as cnt FROM invoices WHERE company_id = :company_id",
                    ['company_id' => $companyId]
                );
                $item['completed'] = ($invoiceCount['cnt'] ?? 0) > 0;
                break;

            case 'setup_bank_account':
                $bankCount = $db->fetchOne(
                    "SELECT COUNT(*) as cnt FROM bank_accounts WHERE company_id = :company_id",
                    ['company_id' => $companyId]
                );
                $item['completed'] = ($bankCount['cnt'] ?? 0) > 0;
                break;

            case 'create_first_project':
                $projectCount = $db->fetchOne(
                    "SELECT COUNT(*) as cnt FROM projects WHERE company_id = :company_id",
                    ['company_id' => $companyId]
                );
                $item['completed'] = ($projectCount['cnt'] ?? 0) > 0;
                break;
        }
    }

    // Calculate progress
    $completedCount = count(array_filter($checklistItems, fn($item) => $item['completed']));
    $totalCount = count($checklistItems);
    $progressPercentage = $totalCount > 0 ? round(($completedCount / $totalCount) * 100) : 0;

    echo json_encode([
        'success' => true,
        'data' => [
            'items' => $checklistItems,
            'completed_count' => $completedCount,
            'total_count' => $totalCount,
            'progress_percentage' => $progressPercentage,
            'is_complete' => $completedCount === $totalCount
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
