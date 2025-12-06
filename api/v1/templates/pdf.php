<?php
/**
 * PDF Generation API
 * Generate PDFs from templates
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
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
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
if (!$companyId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Company ID required']);
    exit;
}

// PDF output types
$outputTypes = [
    'download' => ['ro' => 'Descărcare', 'en' => 'Download'],
    'base64' => ['ro' => 'Base64', 'en' => 'Base64'],
    'url' => ['ro' => 'URL temporar', 'en' => 'Temporary URL'],
    'email' => ['ro' => 'Trimite pe email', 'en' => 'Send by Email'],
    'storage' => ['ro' => 'Salvează în stocare', 'en' => 'Save to Storage'],
];

// PDF metadata fields
$metadataFields = [
    'title' => ['ro' => 'Titlu', 'en' => 'Title'],
    'author' => ['ro' => 'Autor', 'en' => 'Author'],
    'subject' => ['ro' => 'Subiect', 'en' => 'Subject'],
    'keywords' => ['ro' => 'Cuvinte cheie', 'en' => 'Keywords'],
    'creator' => ['ro' => 'Creator', 'en' => 'Creator'],
];

try {
    $db = getDbConnection();

    $input = json_decode(file_get_contents('php://input'), true);

    $templateId = $input['template_id'] ?? null;
    $documentId = $input['document_id'] ?? null;
    $documentType = $input['document_type'] ?? null;
    $data = $input['data'] ?? [];
    $output = $input['output'] ?? 'base64';
    $options = $input['options'] ?? [];

    if (!$templateId && !$documentId) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error_ro' => 'ID-ul șablonului sau documentului este obligatoriu',
            'error' => 'Template ID or document ID is required'
        ]);
        exit;
    }

    // Get template
    $template = null;
    if ($templateId) {
        $stmt = $db->prepare("
            SELECT * FROM document_templates
            WHERE id = :id AND (company_id = :company_id OR is_system = TRUE)
        ");
        $stmt->execute(['id' => $templateId, 'company_id' => $companyId]);
        $template = $stmt->fetch(PDO::FETCH_ASSOC);
    } elseif ($documentType) {
        // Get default template for document type
        $stmt = $db->prepare("
            SELECT * FROM document_templates
            WHERE (company_id = :company_id OR is_system = TRUE)
            AND document_type = :document_type
            AND is_default = TRUE
            ORDER BY is_system ASC
            LIMIT 1
        ");
        $stmt->execute(['company_id' => $companyId, 'document_type' => $documentType]);
        $template = $stmt->fetch(PDO::FETCH_ASSOC);
    }

    if (!$template) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Template not found']);
        exit;
    }

    // Get document data if document_id provided
    if ($documentId && empty($data)) {
        $data = getDocumentData($db, $documentType ?? $template['document_type'], $documentId, $companyId);
        if (!$data) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Document not found']);
            exit;
        }
    }

    // Get company data
    $companyData = getCompanyData($db, $companyId);
    $data['company'] = $companyData;

    // Render template with data
    $html = renderTemplate($template, $data);

    // Get print settings
    $printSettings = getPrintSettings($db, $companyId, $template['document_type']);

    // Generate PDF
    $pdfResult = generatePdf($html, $printSettings, $options);

    // Handle output
    switch ($output) {
        case 'download':
            header('Content-Type: application/pdf');
            header('Content-Disposition: attachment; filename="' . ($options['filename'] ?? 'document.pdf') . '"');
            echo $pdfResult['content'];
            exit;

        case 'base64':
            echo json_encode([
                'success' => true,
                'data' => [
                    'content' => base64_encode($pdfResult['content']),
                    'filename' => $options['filename'] ?? 'document.pdf',
                    'mime_type' => 'application/pdf',
                    'size' => strlen($pdfResult['content']),
                    'pages' => $pdfResult['pages'] ?? 1,
                ],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'url':
            // Save to temp storage and return URL
            $filename = 'pdf_' . bin2hex(random_bytes(12)) . '.pdf';
            $tempPath = '/tmp/pdf_exports/' . $filename;
            @mkdir(dirname($tempPath), 0755, true);
            file_put_contents($tempPath, $pdfResult['content']);

            echo json_encode([
                'success' => true,
                'data' => [
                    'url' => '/api/v1/templates/download.php?file=' . $filename,
                    'expires_at' => date('c', strtotime('+1 hour')),
                    'filename' => $options['filename'] ?? 'document.pdf',
                    'size' => strlen($pdfResult['content']),
                ],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'storage':
            // Save to permanent storage
            $filename = $options['filename'] ?? ('document_' . date('Y-m-d_His') . '.pdf');
            $storagePath = '/var/www/documentiulia.ro/storage/documents/' . $companyId . '/' . date('Y/m/');
            @mkdir($storagePath, 0755, true);
            file_put_contents($storagePath . $filename, $pdfResult['content']);

            // Log in database
            $fileId = 'file_' . bin2hex(random_bytes(8));
            $stmt = $db->prepare("
                INSERT INTO generated_documents (id, company_id, user_id, document_type, template_id, document_id, filename, file_path, file_size, created_at)
                VALUES (:id, :company_id, :user_id, :document_type, :template_id, :document_id, :filename, :file_path, :file_size, NOW())
            ");
            $stmt->execute([
                'id' => $fileId,
                'company_id' => $companyId,
                'user_id' => $user['user_id'],
                'document_type' => $template['document_type'],
                'template_id' => $template['id'],
                'document_id' => $documentId,
                'filename' => $filename,
                'file_path' => $storagePath . $filename,
                'file_size' => strlen($pdfResult['content']),
            ]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'PDF salvat',
                'message_en' => 'PDF saved',
                'data' => [
                    'file_id' => $fileId,
                    'filename' => $filename,
                    'size' => strlen($pdfResult['content']),
                ],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        default:
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error_ro' => 'Tip de output invalid',
                'error' => 'Invalid output type'
            ]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'PDF generation error: ' . $e->getMessage()]);
}

function getDocumentData($db, $documentType, $documentId, $companyId) {
    $tables = [
        'invoice' => 'invoices',
        'quote' => 'quotes',
        'receipt' => 'receipts',
        'delivery_note' => 'delivery_notes',
    ];

    $table = $tables[$documentType] ?? null;
    if (!$table) return null;

    $stmt = $db->prepare("SELECT * FROM $table WHERE id = :id AND company_id = :company_id");
    $stmt->execute(['id' => $documentId, 'company_id' => $companyId]);
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

function getCompanyData($db, $companyId) {
    $stmt = $db->prepare("SELECT setting_key, setting_value FROM company_settings WHERE company_id = :company_id");
    $stmt->execute(['company_id' => $companyId]);
    return $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
}

function getPrintSettings($db, $companyId, $documentType) {
    $stmt = $db->prepare("SELECT settings FROM print_settings WHERE company_id = :company_id AND document_type = :document_type");
    $stmt->execute(['company_id' => $companyId, 'document_type' => $documentType]);
    $settings = $stmt->fetchColumn();
    return json_decode($settings ?? '{}', true);
}

function renderTemplate($template, $data) {
    $html = $template['content'];

    // Replace placeholders
    foreach ($data as $section => $values) {
        if (is_array($values)) {
            foreach ($values as $key => $value) {
                $html = str_replace("{{" . $section . "." . $key . "}}", htmlspecialchars($value ?? ''), $html);
            }
        }
    }

    // Add CSS styles
    if (!empty($template['css_styles'])) {
        $html = "<style>" . $template['css_styles'] . "</style>" . $html;
    }

    // Wrap with header/footer
    $fullHtml = '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>';
    if (!empty($template['header_html'])) {
        $fullHtml .= '<header>' . $template['header_html'] . '</header>';
    }
    $fullHtml .= '<main>' . $html . '</main>';
    if (!empty($template['footer_html'])) {
        $fullHtml .= '<footer>' . $template['footer_html'] . '</footer>';
    }
    $fullHtml .= '</body></html>';

    return $fullHtml;
}

function generatePdf($html, $settings, $options) {
    // Simplified PDF generation (would use a library like TCPDF, Dompdf, or wkhtmltopdf in production)
    return [
        'content' => '%PDF-1.4 ' . $html, // Placeholder - real implementation would generate actual PDF
        'pages' => 1,
    ];
}
