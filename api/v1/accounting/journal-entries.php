<?php
/**
 * Journal Entries API (Double-Entry Bookkeeping)
 *
 * Manage journal entries with automatic balance validation
 * Endpoints:
 * - GET  /journal-entries.php                   - List journal entries
 * - GET  /journal-entries.php?id=UUID           - Get single entry with lines
 * - POST /journal-entries.php                   - Create journal entry
 * - POST /journal-entries.php?action=post       - Post entry (make permanent)
 */

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/AccountingService.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    $authHeader = getHeader('authorization', '') ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization token required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    $companyId = getHeader('x-company-id') ?? null;
    if (!$companyId) {
        throw new Exception('Company context required');
    }

    if (!$auth->userHasAccessToCompany($userData['user_id'], $companyId)) {
        throw new Exception('Access denied');
    }

    $accountingService = new AccountingService();
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        if (isset($_GET['id'])) {
            $entry = $accountingService->getJournalEntry($_GET['id'], $companyId);
            echo json_encode([
                'success' => true,
                'data' => ['entry' => $entry]
            ]);
        } else {
            $filters = [
                'status' => $_GET['status'] ?? null,
                'entry_type' => $_GET['entry_type'] ?? null,
                'start_date' => $_GET['start_date'] ?? null,
                'end_date' => $_GET['end_date'] ?? null,
                'limit' => $_GET['limit'] ?? 100,
                'offset' => $_GET['offset'] ?? 0
            ];

            $entries = $accountingService->listJournalEntries($companyId, $filters);

            echo json_encode([
                'success' => true,
                'data' => [
                    'entries' => $entries,
                    'count' => count($entries)
                ]
            ]);
        }
    }

    elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $_GET['action'] ?? 'create';

        if ($action === 'post') {
            // Post an existing entry
            if (empty($input['entry_id'])) {
                throw new Exception('Entry ID is required');
            }

            $accountingService->postJournalEntry($input['entry_id'], $companyId, $userData['user_id']);

            echo json_encode([
                'success' => true,
                'message' => 'Journal entry posted successfully'
            ]);
        } else {
            // Create new entry
            // Accept 'entries' as alias for 'lines'
            if (isset($input['entries']) && !isset($input['lines'])) {
                $input['lines'] = $input['entries'];
            }

            // Default entry_date to today if not provided
            if (empty($input['entry_date'])) {
                $input['entry_date'] = date('Y-m-d');
            }

            if (empty($input['lines']) || count($input['lines']) < 2) {
                throw new Exception('Journal entry must have at least 2 lines');
            }

            $entryId = $accountingService->createJournalEntry($companyId, $userData['user_id'], $input);
            $entry = $accountingService->getJournalEntry($entryId, $companyId);

            echo json_encode([
                'success' => true,
                'data' => [
                    'entry_id' => $entryId,
                    'entry' => $entry
                ],
                'message' => 'Journal entry created successfully'
            ]);
        }
    }

} catch (Exception $e) {
    $code = is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
