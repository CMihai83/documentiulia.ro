<?php
/**
 * Transaction Sync Service
 *
 * Handles fetching, storing, and categorizing bank transactions
 */

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../adapters/NordigenAdapter.php';
require_once __DIR__ . '/CategorizationEngine.php';

class TransactionSyncService
{
    private $db;
    private $adapters = [];
    private $categorizationEngine;

    public function __construct()
    {
        $database = Database::getInstance();
        $this->db = $database->getConnection();

        // Register adapters
        $this->adapters['nordigen'] = new NordigenAdapter();

        // Initialize categorization engine
        $this->categorizationEngine = new CategorizationEngine($this->db);
    }

    /**
     * Sync transactions for a connection
     *
     * @param string $connectionId Connection UUID
     * @param string|null $fromDate Start date (Y-m-d), defaults to 90 days ago
     * @param string|null $toDate End date (Y-m-d), defaults to today
     * @return array Statistics about sync operation
     */
    public function syncTransactions(
        string $connectionId,
        ?string $fromDate = null,
        ?string $toDate = null
    ): array {
        // Start sync log
        $syncLogId = $this->startSyncLog($connectionId, 'manual');

        try {
            // Get connection details
            $connection = $this->getConnection($connectionId);

            if ($connection['status'] !== 'active') {
                throw new Exception("Connection not active");
            }

            $adapter = $this->adapters[$connection['provider']];

            // Set default date range
            $fromDate = $fromDate ?? date('Y-m-d', strtotime('-90 days'));
            $toDate = $toDate ?? date('Y-m-d');

            // Fetch transactions from provider
            $providerTransactions = $adapter->getTransactions(
                $connection['account_id'],
                $fromDate,
                $toDate
            );

            $stats = [
                'fetched' => count($providerTransactions),
                'new' => 0,
                'updated' => 0,
                'skipped' => 0,
                'duplicate' => 0
            ];

            // Process each transaction
            foreach ($providerTransactions as $transaction) {
                $result = $this->processTransaction($connection, $transaction);
                $stats[$result]++;
            }

            // Update last_sync_at on connection
            $this->updateLastSync($connectionId, 'success');

            // Complete sync log
            $this->completeSyncLog($syncLogId, 'completed', $stats);

            return $stats;

        } catch (Exception $e) {
            $this->updateLastSync($connectionId, 'failed', $e->getMessage());
            $this->completeSyncLog($syncLogId, 'failed', null, $e->getMessage());
            error_log("TransactionSyncService::syncTransactions Error: " . $e->getMessage());
            throw new Exception("Transaction sync failed: " . $e->getMessage());
        }
    }

    /**
     * Process a single transaction
     *
     * @param array $connection Connection details
     * @param array $transaction Normalized transaction data
     * @return string Result: 'new', 'updated', 'skipped', or 'duplicate'
     */
    private function processTransaction(array $connection, array $transaction): string
    {
        // Check if transaction already exists
        $existing = $this->findExistingTransaction(
            $connection['id'],
            $transaction['id']
        );

        if ($existing) {
            // Check if transaction data changed
            if ($this->hasTransactionChanged($existing, $transaction)) {
                $this->updateTransaction($existing['id'], $transaction);
                return 'updated';
            }
            return 'skipped';
        }

        // Check for duplicates (same amount, date, description within 1 day)
        $duplicate = $this->findDuplicateTransaction(
            $connection['id'],
            $transaction['date'],
            $transaction['amount'],
            $transaction['description']
        );

        // Categorize transaction
        $category = $this->categorizationEngine->categorize(
            $connection['company_id'],
            $transaction['description'],
            $transaction['amount'],
            $transaction['counterparty']
        );

        // Clean description
        $cleanDescription = $this->cleanDescription($transaction['description']);

        // Insert new transaction
        $query = "INSERT INTO bank_transactions (
            connection_id, company_id, provider_transaction_id,
            transaction_date, booking_date, value_date,
            amount, currency, description, clean_description,
            counterparty_name, counterparty_account,
            category, subcategory, category_confidence,
            transaction_type, payment_method, reference,
            status, is_duplicate, duplicate_of, metadata
        ) VALUES (
            :connection_id, :company_id, :provider_transaction_id,
            :transaction_date, :booking_date, :value_date,
            :amount, :currency, :description, :clean_description,
            :counterparty_name, :counterparty_account,
            :category, :subcategory, :category_confidence,
            :transaction_type, :payment_method, :reference,
            :status, :is_duplicate, :duplicate_of, :metadata
        )";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            ':connection_id' => $connection['id'],
            ':company_id' => $connection['company_id'],
            ':provider_transaction_id' => $transaction['id'],
            ':transaction_date' => $transaction['date'],
            ':booking_date' => $transaction['booking_date'],
            ':value_date' => $transaction['value_date'],
            ':amount' => $transaction['amount'],
            ':currency' => $transaction['currency'],
            ':description' => $transaction['description'],
            ':clean_description' => $cleanDescription,
            ':counterparty_name' => $transaction['counterparty'],
            ':counterparty_account' => $transaction['counterparty_account'],
            ':category' => $category['category'],
            ':subcategory' => $category['subcategory'],
            ':category_confidence' => $category['confidence'],
            ':transaction_type' => $transaction['transaction_type'],
            ':payment_method' => $this->detectPaymentMethod($transaction),
            ':reference' => $transaction['reference'],
            ':status' => $transaction['status'],
            ':is_duplicate' => $duplicate ? true : false,
            ':duplicate_of' => $duplicate ? $duplicate['id'] : null,
            ':metadata' => json_encode($transaction['raw'])
        ]);

        return $duplicate ? 'duplicate' : 'new';
    }

    /**
     * Find existing transaction by provider ID
     */
    private function findExistingTransaction(string $connectionId, string $providerTransactionId): ?array
    {
        $query = "SELECT * FROM bank_transactions
                  WHERE connection_id = :connection_id
                  AND provider_transaction_id = :provider_transaction_id
                  LIMIT 1";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            ':connection_id' => $connectionId,
            ':provider_transaction_id' => $providerTransactionId
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Find duplicate transaction by amount, date, and description
     */
    private function findDuplicateTransaction(
        string $connectionId,
        string $date,
        float $amount,
        string $description
    ): ?array {
        // Look for transactions within 1 day, same amount, similar description
        $query = "SELECT * FROM bank_transactions
                  WHERE connection_id = :connection_id
                  AND transaction_date BETWEEN :date::date - INTERVAL '1 day' AND :date::date + INTERVAL '1 day'
                  AND amount = :amount
                  AND similarity(description, :description) > 0.7
                  LIMIT 1";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            ':connection_id' => $connectionId,
            ':date' => $date,
            ':amount' => $amount,
            ':description' => $description
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Check if transaction data has changed
     */
    private function hasTransactionChanged(array $existing, array $new): bool
    {
        return $existing['amount'] != $new['amount'] ||
               $existing['status'] != $new['status'] ||
               $existing['description'] != $new['description'];
    }

    /**
     * Update existing transaction
     */
    private function updateTransaction(string $transactionId, array $transaction): void
    {
        $query = "UPDATE bank_transactions SET
                  amount = :amount,
                  status = :status,
                  description = :description,
                  updated_at = CURRENT_TIMESTAMP
                  WHERE id = :transaction_id";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            ':transaction_id' => $transactionId,
            ':amount' => $transaction['amount'],
            ':status' => $transaction['status'],
            ':description' => $transaction['description']
        ]);
    }

    /**
     * Clean and normalize transaction description
     */
    private function cleanDescription(string $description): string
    {
        // Remove extra whitespace
        $clean = preg_replace('/\s+/', ' ', trim($description));

        // Remove transaction codes and IDs
        $clean = preg_replace('/[A-Z0-9]{10,}/', '', $clean);

        // Remove dates in various formats
        $clean = preg_replace('/\d{2}[\/\-]\d{2}[\/\-]\d{2,4}/', '', $clean);

        // Remove common banking prefixes
        $clean = preg_replace('/(TRANSFER|PAYMENT|CARD|DEBIT|CREDIT)\s*/i', '', $clean);

        return trim($clean);
    }

    /**
     * Detect payment method from transaction
     */
    private function detectPaymentMethod(array $transaction): ?string
    {
        $desc = strtolower($transaction['description']);

        if (strpos($desc, 'card') !== false || strpos($desc, 'pos') !== false) {
            return 'card';
        } elseif (strpos($desc, 'transfer') !== false || strpos($desc, 'virament') !== false) {
            return 'transfer';
        } elseif (strpos($desc, 'direct debit') !== false || strpos($desc, 'debit direct') !== false) {
            return 'direct_debit';
        } elseif (strpos($desc, 'cash') !== false || strpos($desc, 'atm') !== false) {
            return 'cash';
        }

        return null;
    }

    /**
     * Get connection details
     */
    private function getConnection(string $connectionId): array
    {
        $query = "SELECT * FROM bank_connections WHERE id = :connection_id";
        $stmt = $this->db->prepare($query);
        $stmt->execute([':connection_id' => $connectionId]);

        $connection = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$connection) {
            throw new Exception("Connection not found");
        }

        return $connection;
    }

    /**
     * Start sync log
     */
    private function startSyncLog(string $connectionId, string $syncType): int
    {
        $query = "INSERT INTO bank_sync_logs (connection_id, sync_type, status, started_at)
                  VALUES (:connection_id, :sync_type, 'started', CURRENT_TIMESTAMP)
                  RETURNING id";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            ':connection_id' => $connectionId,
            ':sync_type' => $syncType
        ]);

        return $stmt->fetchColumn();
    }

    /**
     * Complete sync log
     */
    private function completeSyncLog(
        int $syncLogId,
        string $status,
        ?array $stats = null,
        ?string $errorMessage = null
    ): void {
        $query = "UPDATE bank_sync_logs SET
                  status = :status,
                  transactions_fetched = :fetched,
                  transactions_new = :new,
                  transactions_updated = :updated,
                  transactions_skipped = :skipped,
                  transactions_duplicate = :duplicate,
                  error_message = :error_message,
                  completed_at = CURRENT_TIMESTAMP
                  WHERE id = :log_id";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            ':log_id' => $syncLogId,
            ':status' => $status,
            ':fetched' => $stats['fetched'] ?? 0,
            ':new' => $stats['new'] ?? 0,
            ':updated' => $stats['updated'] ?? 0,
            ':skipped' => $stats['skipped'] ?? 0,
            ':duplicate' => $stats['duplicate'] ?? 0,
            ':error_message' => $errorMessage
        ]);
    }

    /**
     * Update last sync timestamp on connection
     */
    private function updateLastSync(
        string $connectionId,
        string $status,
        ?string $errorMessage = null
    ): void {
        $query = "UPDATE bank_connections SET
                  last_sync_at = CURRENT_TIMESTAMP,
                  last_sync_status = :status,
                  sync_error_message = :error_message
                  WHERE id = :connection_id";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            ':connection_id' => $connectionId,
            ':status' => $status,
            ':error_message' => $errorMessage
        ]);
    }

    /**
     * Get transactions for a company
     *
     * @param string $companyId Company UUID
     * @param array $filters Optional filters (date_from, date_to, category, status)
     * @param int $limit Pagination limit
     * @param int $offset Pagination offset
     * @return array Transactions
     */
    public function getTransactions(
        string $companyId,
        array $filters = [],
        int $limit = 50,
        int $offset = 0
    ): array {
        $query = "SELECT
            bt.*,
            ba.bank_name as account_name,
            ba.account_number_masked as account_number
            FROM bank_transactions bt
            JOIN bank_accounts ba ON bt.bank_account_id = ba.id
            WHERE ba.company_id = :company_id";

        $params = [':company_id' => $companyId];

        if (!empty($filters['date_from'])) {
            $query .= " AND bt.transaction_date >= :date_from";
            $params[':date_from'] = $filters['date_from'];
        }

        if (!empty($filters['date_to'])) {
            $query .= " AND bt.transaction_date <= :date_to";
            $params[':date_to'] = $filters['date_to'];
        }

        if (!empty($filters['status'])) {
            $query .= " AND bt.status = :status";
            $params[':status'] = $filters['status'];
        }

        if (!empty($filters['bank_account_id'])) {
            $query .= " AND bt.bank_account_id = :bank_account_id";
            $params[':bank_account_id'] = $filters['bank_account_id'];
        }

        $query .= " ORDER BY bt.transaction_date DESC, bt.created_at DESC
                    LIMIT :limit OFFSET :offset";

        $stmt = $this->db->prepare($query);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get transaction statistics for a company
     *
     * @param string $companyId Company UUID
     * @param string $fromDate Start date
     * @param string $toDate End date
     * @return array Statistics
     */
    public function getTransactionStats(string $companyId, string $fromDate, string $toDate): array
    {
        $query = "SELECT
            COUNT(*) as total_transactions,
            SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_income,
            SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as total_expenses,
            COUNT(DISTINCT connection_id) as active_connections,
            COUNT(*) FILTER (WHERE status = 'pending') as pending_transactions,
            COUNT(*) FILTER (WHERE matched_invoice_id IS NOT NULL OR matched_expense_id IS NOT NULL) as matched_transactions
            FROM bank_transactions
            WHERE company_id = :company_id
            AND transaction_date BETWEEN :from_date AND :to_date";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            ':company_id' => $companyId,
            ':from_date' => $fromDate,
            ':to_date' => $toDate
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}
