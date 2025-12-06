<?php
/**
 * Get Supported Languages
 * GET /api/v1/i18n/languages.php
 *
 * Returns list of supported languages with their details
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Cache-Control: public, max-age=86400'); // Cache for 24 hours

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../services/I18nService.php';

try {
    $i18n = I18nService::getInstance();
    $i18n->setLanguageFromRequest();

    $languages = $i18n->getSupportedLanguages();

    echo json_encode([
        'success' => true,
        'data' => array_values($languages),
        'current' => $i18n->getLanguage(),
        'default' => 'ro'
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
