<?php
/**
 * Get Translations
 * GET /api/v1/i18n/translations.php?lang=ro&namespaces=common,nav,auth
 *
 * Returns translations for specified namespaces
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, Accept-Language');
header('Cache-Control: public, max-age=3600'); // Cache for 1 hour

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../services/I18nService.php';

try {
    $i18n = I18nService::getInstance();

    // Set language from request
    $lang = $_GET['lang'] ?? null;
    if ($lang) {
        $i18n->setLanguage($lang);
    } else {
        $i18n->setLanguageFromRequest();
    }

    // Get namespaces to load
    $namespacesParam = $_GET['namespaces'] ?? 'common';
    $namespaces = array_map('trim', explode(',', $namespacesParam));

    // Load translations
    $translations = [];
    foreach ($namespaces as $namespace) {
        $translations[$namespace] = $i18n->getNamespaceTranslations($namespace);
    }

    // Get locale settings
    $localeSettings = $i18n->getLocaleSettings();

    echo json_encode([
        'success' => true,
        'data' => [
            'translations' => $translations,
            'language' => $i18n->getLanguage(),
            'locale' => $localeSettings
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
