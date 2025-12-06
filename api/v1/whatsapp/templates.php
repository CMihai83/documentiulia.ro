<?php
/**
 * WhatsApp Templates API
 * GET - List available message templates
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../services/WhatsAppBusinessService.php';

try {
    $whatsappService = WhatsAppBusinessService::getInstance();
    $templates = $whatsappService->getTemplates();

    echo json_encode([
        'success' => true,
        'data' => $templates
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
