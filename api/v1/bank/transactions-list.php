<?php
/**
 * Bank Transactions List (Simplified)
 * GET /api/v1/bank/transactions-list.php - List bank transactions
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json');

try {
    $auth = authenticate();
    $companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;

    if (!$companyId) {
        throw new Exception('Company ID is required', 400);
    }

    $db = Database::getInstance()->getConnection();

    // Build query with filters
    $sql = "SELECT
        bt.id,
        bt.bank_account_id,
        ba.bank_name,
        ba.account_number_masked,
        bt.transaction_date,
        bt.description,
        bt.amount,
        bt.balance,
        bt.transaction_type,
        bt.payee,
        bt.reference_number,
        bt.status,
        bt.created_at,
        bt.updated_at
    FROM bank_transactions bt
    LEFT JOIN bank_accounts ba ON bt.bank_account_id = ba.id
    WHERE ba.company_id = :company_id";

    $params = ['company_id' => $companyId];

    // Apply filters
    if (!empty($_GET['date_from'])) {
        $sql .= " AND bt.transaction_date >= :date_from";
        $params['date_from'] = $_GET['date_from'];
    }

    if (!empty($_GET['date_to'])) {
        $sql .= " AND bt.transaction_date <= :date_to";
        $params['date_to'] = $_GET['date_to'];
    }

    if (!empty($_GET['status'])) {
        $sql .= " AND bt.status = :status";
        $params['status'] = $_GET['status'];
    }

    if (!empty($_GET['bank_account_id'])) {
        $sql .= " AND bt.bank_account_id = :bank_account_id";
        $params['bank_account_id'] = $_GET['bank_account_id'];
    }

    if (!empty($_GET['transaction_type'])) {
        $sql .= " AND bt.transaction_type = :transaction_type";
        $params['transaction_type'] = $_GET['transaction_type'];
    }

    // Pagination
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

    $sql .= " ORDER BY bt.transaction_date DESC, bt.created_at DESC LIMIT :limit OFFSET :offset";

    $stmt = $db->prepare($sql);
    foreach ($params as $key => $value) {
        $stmt->bindValue(':' . $key, $value);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $transactions,
        'count' => count($transactions),
        'pagination' => [
            'limit' => $limit,
            'offset' => $offset
        ]
    ]);

} catch (Exception $e) {
    $code = is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
