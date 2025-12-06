<?php
/**
 * Recent Activity Endpoint
 * GET /api/v1/activity/recent.php
 * Returns recent user and company activity
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
    $limit = isset($_GET['limit']) ? min((int)$_GET['limit'], 50) : 10;

    $activities = [];

    // Get recent invoices
    $recentInvoices = $db->fetchAll(
        "SELECT id, invoice_number, total_amount, status, created_at, 'invoice' as type
         FROM invoices
         WHERE company_id = :company_id
         ORDER BY created_at DESC
         LIMIT 5",
        ['company_id' => $companyId]
    );
    foreach ($recentInvoices as $inv) {
        $activities[] = [
            'id' => $inv['id'],
            'type' => 'invoice',
            'action' => 'created',
            'title_ro' => 'Factură ' . $inv['invoice_number'] . ' creată',
            'title_en' => 'Invoice ' . $inv['invoice_number'] . ' created',
            'amount' => $inv['total_amount'],
            'status' => $inv['status'],
            'timestamp' => $inv['created_at']
        ];
    }

    // Get recent projects
    $recentProjects = $db->fetchAll(
        "SELECT id, name, status, created_at, 'project' as type
         FROM projects
         WHERE company_id = :company_id
         ORDER BY created_at DESC
         LIMIT 5",
        ['company_id' => $companyId]
    );
    foreach ($recentProjects as $proj) {
        $activities[] = [
            'id' => $proj['id'],
            'type' => 'project',
            'action' => 'created',
            'title_ro' => 'Proiect "' . $proj['name'] . '" creat',
            'title_en' => 'Project "' . $proj['name'] . '" created',
            'status' => $proj['status'],
            'timestamp' => $proj['created_at']
        ];
    }

    // Get recent contacts
    $recentContacts = $db->fetchAll(
        "SELECT id, display_name, contact_type, created_at, 'contact' as type
         FROM contacts
         WHERE company_id = :company_id
         ORDER BY created_at DESC
         LIMIT 5",
        ['company_id' => $companyId]
    );
    foreach ($recentContacts as $contact) {
        $activities[] = [
            'id' => $contact['id'],
            'type' => 'contact',
            'action' => 'created',
            'title_ro' => 'Contact "' . $contact['display_name'] . '" adăugat',
            'title_en' => 'Contact "' . $contact['display_name'] . '" added',
            'contact_type' => $contact['contact_type'],
            'timestamp' => $contact['created_at']
        ];
    }

    // Get recent tasks
    $recentTasks = $db->fetchAll(
        "SELECT id, title, status, created_at, 'task' as type
         FROM tasks
         WHERE company_id = :company_id
         ORDER BY created_at DESC
         LIMIT 5",
        ['company_id' => $companyId]
    );
    foreach ($recentTasks as $task) {
        $activities[] = [
            'id' => $task['id'],
            'type' => 'task',
            'action' => 'created',
            'title_ro' => 'Sarcină "' . $task['title'] . '" creată',
            'title_en' => 'Task "' . $task['title'] . '" created',
            'status' => $task['status'],
            'timestamp' => $task['created_at']
        ];
    }

    // Sort by timestamp descending and limit
    usort($activities, function($a, $b) {
        return strtotime($b['timestamp']) - strtotime($a['timestamp']);
    });
    $activities = array_slice($activities, 0, $limit);

    echo json_encode([
        'success' => true,
        'data' => $activities
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
