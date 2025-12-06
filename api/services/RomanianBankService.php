<?php
/**
 * Romanian Bank Integration Service
 * E2-US03: Romanian bank statement import and reconciliation
 *
 * Supports:
 * - CSV/OFX/MT940 statement import
 * - Romanian bank IBAN validation
 * - Automatic transaction categorization
 * - Bank reconciliation
 * - Romanian bank list with BIC codes
 */

require_once __DIR__ . '/../config/database.php';

class RomanianBankService {
    private static ?RomanianBankService $instance = null;
    private PDO $pdo;

    // Romanian banks with BIC codes
    private array $romanianBanks = [
        'BTRL' => ['name' => 'Banca Transilvania', 'bic' => 'BTRLRO22'],
        'BREL' => ['name' => 'BRD - Groupe Société Générale', 'bic' => 'BRDEROBU'],
        'RNCB' => ['name' => 'BCR - Banca Comercială Română', 'bic' => 'RNCBROBU'],
        'INGB' => ['name' => 'ING Bank', 'bic' => 'INGBROBU'],
        'RZBR' => ['name' => 'Raiffeisen Bank', 'bic' => 'RZBRROBU'],
        'UGBI' => ['name' => 'UniCredit Bank', 'bic' => 'UGBIROBU'],
        'CECE' => ['name' => 'CEC Bank', 'bic' => 'CECEROBU'],
        'PIRB' => ['name' => 'First Bank (fost Piraeus)', 'bic' => 'PIRBROBUXXX'],
        'OTPV' => ['name' => 'OTP Bank', 'bic' => 'OTPVROBU'],
        'NBOR' => ['name' => 'Alpha Bank', 'bic' => 'NBORROBU'],
        'FNNB' => ['name' => 'Banca Feroviară', 'bic' => 'FNNBROBU'],
        'EXIM' => ['name' => 'EximBank', 'bic' => 'EABOROBU'],
        'WBAN' => ['name' => 'Banca Românească', 'bic' => 'WBANROBU'],
        'TREZ' => ['name' => 'Trezoreria Statului', 'bic' => 'TABOROBU'],
        'PORL' => ['name' => 'Banca Populară', 'bic' => 'PORLROBU'],
        'MIND' => ['name' => 'Intesa Sanpaolo Bank', 'bic' => 'MINDROBU'],
        'LIBR' => ['name' => 'Libra Internet Bank', 'bic' => 'LIBRROB2'],
        'VISA' => ['name' => 'Vista Bank', 'bic' => 'VISAROBU'],
        'CRCO' => ['name' => 'Credit Coop', 'bic' => 'CRCOROB2'],
        'PATC' => ['name' => 'Patria Credit', 'bic' => 'PATCROBU']
    ];

    private function __construct() {
        $this->pdo = Database::getInstance()->getConnection();
    }

    public static function getInstance(): RomanianBankService {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Get list of Romanian banks
     */
    public function getRomanianBanks(): array {
        return array_map(function($code, $bank) {
            return [
                'code' => $code,
                'name' => $bank['name'],
                'bic' => $bank['bic']
            ];
        }, array_keys($this->romanianBanks), array_values($this->romanianBanks));
    }

    /**
     * Validate Romanian IBAN
     */
    public function validateIBAN(string $iban): array {
        // Remove spaces and convert to uppercase
        $iban = strtoupper(str_replace(' ', '', $iban));

        // Romanian IBAN format: RO + 2 check digits + 4 bank code + 16 account number = 24 chars
        $errors = [];

        if (strlen($iban) !== 24) {
            $errors[] = 'Romanian IBAN must be 24 characters';
        }

        $formatValid = preg_match('/^RO[0-9]{2}[A-Z]{4}[A-Z0-9]{16}$/', $iban);
        if (!$formatValid) {
            $errors[] = 'Invalid IBAN format';
        }

        // Extract bank code
        $bankCode = strlen($iban) >= 8 ? substr($iban, 4, 4) : '';
        $bankInfo = $this->romanianBanks[$bankCode] ?? null;

        // Validate check digits using mod-97 (only if format is valid)
        if ($formatValid) {
            $checkDigitsValid = $this->validateIBANCheckDigits($iban);
            if (!$checkDigitsValid) {
                $errors[] = 'Invalid check digits';
            }
        }

        return [
            'valid' => count($errors) === 0,
            'iban' => $iban,
            'country' => 'RO',
            'bank_code' => $bankCode,
            'bank_name' => $bankInfo['name'] ?? 'Unknown',
            'bic' => $bankInfo['bic'] ?? null,
            'account_number' => substr($iban, 8),
            'formatted' => $this->formatIBAN($iban),
            'errors' => $errors
        ];
    }

    /**
     * Validate IBAN check digits
     */
    private function validateIBANCheckDigits(string $iban): bool {
        // Move first 4 characters to end
        $rearranged = substr($iban, 4) . substr($iban, 0, 4);

        // Convert letters to numbers (A=10, B=11, etc.)
        $numeric = '';
        for ($i = 0; $i < strlen($rearranged); $i++) {
            $char = $rearranged[$i];
            if (ctype_alpha($char)) {
                $numeric .= (ord($char) - ord('A') + 10);
            } else {
                $numeric .= $char;
            }
        }

        // Validate mod-97 = 1
        return bcmod($numeric, '97') === '1';
    }

    /**
     * Format IBAN with spaces
     */
    public function formatIBAN(string $iban): string {
        $iban = str_replace(' ', '', $iban);
        return implode(' ', str_split($iban, 4));
    }

    /**
     * Import bank statement from CSV
     */
    public function importCSV(string $companyId, string $bankAccountId, string $content, array $mapping = []): array {
        $lines = str_getcsv($content, "\n");
        $transactions = [];
        $errors = [];
        $imported = 0;
        $duplicates = 0;

        // Default column mapping
        $defaultMapping = [
            'date' => 0,
            'description' => 1,
            'reference' => 2,
            'debit' => 3,
            'credit' => 4,
            'balance' => 5
        ];
        $mapping = array_merge($defaultMapping, $mapping);

        // Skip header row
        $headerSkipped = false;

        foreach ($lines as $lineNum => $line) {
            if (!$headerSkipped) {
                $headerSkipped = true;
                continue;
            }

            $columns = str_getcsv($line);
            if (count($columns) < 4) continue;

            try {
                // Parse date
                $dateStr = trim($columns[$mapping['date']] ?? '');
                $date = $this->parseRomanianDate($dateStr);

                if (!$date) {
                    $errors[] = "Line {$lineNum}: Invalid date format";
                    continue;
                }

                // Parse amounts
                $debit = $this->parseRomanianAmount($columns[$mapping['debit']] ?? '');
                $credit = $this->parseRomanianAmount($columns[$mapping['credit']] ?? '');
                $amount = $credit > 0 ? $credit : -$debit;

                if ($amount == 0) continue;

                // Build transaction
                $transaction = [
                    'bank_account_id' => $bankAccountId,
                    'company_id' => $companyId,
                    'transaction_date' => $date,
                    'description' => trim($columns[$mapping['description']] ?? ''),
                    'reference' => trim($columns[$mapping['reference']] ?? ''),
                    'amount' => $amount,
                    'type' => $amount > 0 ? 'credit' : 'debit',
                    'balance_after' => $this->parseRomanianAmount($columns[$mapping['balance']] ?? ''),
                    'import_source' => 'csv',
                    'imported_at' => date('Y-m-d H:i:s')
                ];

                // Check for duplicates
                $exists = $this->transactionExists($bankAccountId, $date, $amount, $transaction['reference']);
                if ($exists) {
                    $duplicates++;
                    continue;
                }

                // Auto-categorize
                $transaction['category'] = $this->autoCategorizeTrans($transaction['description']);

                // Insert transaction
                $transId = $this->insertTransaction($transaction);
                $transaction['id'] = $transId;
                $transactions[] = $transaction;
                $imported++;

            } catch (Exception $e) {
                $errors[] = "Line {$lineNum}: " . $e->getMessage();
            }
        }

        // Update account balance
        $this->updateAccountBalance($bankAccountId);

        return [
            'success' => true,
            'imported' => $imported,
            'duplicates' => $duplicates,
            'errors' => $errors,
            'transactions' => array_slice($transactions, 0, 10) // Return first 10 as preview
        ];
    }

    /**
     * Import bank statement from OFX
     */
    public function importOFX(string $companyId, string $bankAccountId, string $content): array {
        $transactions = [];
        $errors = [];
        $imported = 0;

        // Parse OFX
        preg_match_all('/<STMTTRN>(.*?)<\/STMTTRN>/s', $content, $matches);

        foreach ($matches[1] as $idx => $txnXml) {
            try {
                // Extract fields
                preg_match('/<TRNTYPE>([^<]+)/', $txnXml, $typeMatch);
                preg_match('/<DTPOSTED>([^<]+)/', $txnXml, $dateMatch);
                preg_match('/<TRNAMT>([^<]+)/', $txnXml, $amountMatch);
                preg_match('/<FITID>([^<]+)/', $txnXml, $refMatch);
                preg_match('/<NAME>([^<]+)/', $txnXml, $nameMatch);
                preg_match('/<MEMO>([^<]+)/', $txnXml, $memoMatch);

                $type = trim($typeMatch[1] ?? '');
                $dateStr = trim($dateMatch[1] ?? '');
                $amount = floatval(trim($amountMatch[1] ?? 0));
                $reference = trim($refMatch[1] ?? '');
                $name = trim($nameMatch[1] ?? '');
                $memo = trim($memoMatch[1] ?? '');

                // Parse OFX date (YYYYMMDDHHMMSS)
                $date = substr($dateStr, 0, 4) . '-' . substr($dateStr, 4, 2) . '-' . substr($dateStr, 6, 2);

                $transaction = [
                    'bank_account_id' => $bankAccountId,
                    'company_id' => $companyId,
                    'transaction_date' => $date,
                    'description' => $name . ($memo ? ' - ' . $memo : ''),
                    'reference' => $reference,
                    'amount' => $amount,
                    'type' => $amount >= 0 ? 'credit' : 'debit',
                    'import_source' => 'ofx',
                    'imported_at' => date('Y-m-d H:i:s')
                ];

                // Check for duplicates
                if ($this->transactionExists($bankAccountId, $date, $amount, $reference)) {
                    continue;
                }

                // Auto-categorize
                $transaction['category'] = $this->autoCategorizeTrans($transaction['description']);

                $transId = $this->insertTransaction($transaction);
                $transaction['id'] = $transId;
                $transactions[] = $transaction;
                $imported++;

            } catch (Exception $e) {
                $errors[] = "Transaction {$idx}: " . $e->getMessage();
            }
        }

        $this->updateAccountBalance($bankAccountId);

        return [
            'success' => true,
            'imported' => $imported,
            'errors' => $errors,
            'transactions' => array_slice($transactions, 0, 10)
        ];
    }

    /**
     * Parse Romanian date formats
     */
    private function parseRomanianDate(string $dateStr): ?string {
        $dateStr = trim($dateStr);

        // Try various formats
        $formats = [
            'd.m.Y', 'd/m/Y', 'd-m-Y',
            'Y-m-d', 'Y/m/d', 'Y.m.d',
            'd.m.y', 'd/m/y', 'd-m-y'
        ];

        foreach ($formats as $format) {
            $date = DateTime::createFromFormat($format, $dateStr);
            if ($date && $date->format($format) === $dateStr) {
                return $date->format('Y-m-d');
            }
        }

        // Try strtotime as fallback
        $timestamp = strtotime($dateStr);
        if ($timestamp) {
            return date('Y-m-d', $timestamp);
        }

        return null;
    }

    /**
     * Parse Romanian amount format (1.234,56 or 1234.56)
     */
    private function parseRomanianAmount(string $amountStr): float {
        $amountStr = trim($amountStr);
        if ($amountStr === '' || $amountStr === '-') return 0;

        // Remove currency symbols and spaces
        $amountStr = preg_replace('/[RON EUR USD\s]/', '', $amountStr);

        // Detect format
        if (preg_match('/\d+\.\d{3},\d{2}$/', $amountStr)) {
            // Romanian format: 1.234,56
            $amountStr = str_replace('.', '', $amountStr);
            $amountStr = str_replace(',', '.', $amountStr);
        } elseif (preg_match('/\d+,\d{2}$/', $amountStr)) {
            // Simple Romanian: 1234,56
            $amountStr = str_replace(',', '.', $amountStr);
        }

        return floatval($amountStr);
    }

    /**
     * Auto-categorize transaction based on description
     */
    private function autoCategorizeTrans(string $description): string {
        $description = strtolower($description);

        $categories = [
            'salary' => ['salariu', 'salary', 'wage', 'plata salariilor'],
            'rent' => ['chirie', 'rent', 'închiriere'],
            'utilities' => ['enel', 'engie', 'eon', 'electrica', 'gaz', 'apa', 'internet', 'rcs', 'telekom', 'orange', 'vodafone'],
            'taxes' => ['anaf', 'impozit', 'taxa', 'contributii', 'cas', 'cass', 'tva'],
            'bank_fees' => ['comision', 'fee', 'dobanda', 'interest'],
            'supplies' => ['birou', 'office', 'papetarie', 'rechizite'],
            'fuel' => ['carburant', 'benzina', 'motorina', 'petrom', 'omv', 'mol', 'lukoil', 'rompetrol'],
            'transport' => ['transport', 'taxi', 'uber', 'bolt', 'fan courier', 'cargus'],
            'insurance' => ['asigurare', 'insurance', 'allianz', 'groupama', 'omniasig'],
            'software' => ['microsoft', 'google', 'adobe', 'software', 'licenta', 'subscriptie'],
            'marketing' => ['facebook', 'google ads', 'marketing', 'publicitate', 'reclama'],
            'meals' => ['restaurant', 'food', 'mancare', 'glovo', 'foodpanda'],
            'travel' => ['hotel', 'cazare', 'bilet avion', 'cfr', 'tarom', 'wizz', 'blue air'],
            'transfer' => ['transfer', 'plata', 'incasare']
        ];

        foreach ($categories as $category => $keywords) {
            foreach ($keywords as $keyword) {
                if (str_contains($description, $keyword)) {
                    return $category;
                }
            }
        }

        return 'uncategorized';
    }

    /**
     * Check if transaction already exists
     */
    private function transactionExists(string $bankAccountId, string $date, float $amount, string $reference): bool {
        $sql = "
            SELECT COUNT(*) FROM bank_transactions
            WHERE bank_account_id = :account
              AND transaction_date = :date
              AND ABS(amount - :amount) < 0.01
              AND (reference = :ref OR :ref = '')
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            'account' => $bankAccountId,
            'date' => $date,
            'amount' => $amount,
            'ref' => $reference
        ]);

        return $stmt->fetchColumn() > 0;
    }

    /**
     * Insert transaction
     */
    private function insertTransaction(array $transaction): string {
        $id = $this->generateUUID();

        // Map transaction type to allowed values
        $transactionType = match($transaction['type']) {
            'credit' => 'deposit',
            'debit' => 'withdrawal',
            default => 'other'
        };

        // Store category and import info in metadata JSONB
        $metadata = json_encode([
            'category' => $transaction['category'] ?? 'uncategorized',
            'import_source' => $transaction['import_source'] ?? 'manual'
        ]);

        $sql = "
            INSERT INTO bank_transactions
            (id, bank_account_id, transaction_date, description, reference_number,
             amount, transaction_type, payee, imported_at, metadata, status)
            VALUES
            (:id, :bank_account_id, :transaction_date, :description, :reference,
             :amount, :transaction_type, :payee, :imported_at, :metadata, 'cleared')
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            'id' => $id,
            'bank_account_id' => $transaction['bank_account_id'],
            'transaction_date' => $transaction['transaction_date'],
            'description' => $transaction['description'],
            'reference' => $transaction['reference'] ?? '',
            'amount' => $transaction['amount'],
            'transaction_type' => $transactionType,
            'payee' => $transaction['payee'] ?? null,
            'imported_at' => $transaction['imported_at'],
            'metadata' => $metadata
        ]);

        return $id;
    }

    /**
     * Update account balance
     */
    private function updateAccountBalance(string $bankAccountId): void {
        $sql = "
            UPDATE bank_accounts
            SET current_balance = (
                SELECT COALESCE(SUM(amount), 0)
                FROM bank_transactions
                WHERE bank_account_id = :id
            ),
            updated_at = NOW()
            WHERE id = :id
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['id' => $bankAccountId]);
    }

    /**
     * Get transactions for reconciliation
     */
    public function getUnreconciledTransactions(string $bankAccountId, int $limit = 50): array {
        $sql = "
            SELECT bt.*, ba.bank_name, ba.account_number_masked
            FROM bank_transactions bt
            JOIN bank_accounts ba ON bt.bank_account_id = ba.id
            WHERE bt.bank_account_id = :account
              AND bt.reconciliation_id IS NULL
            ORDER BY bt.transaction_date DESC
            LIMIT :limit
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['account' => $bankAccountId, 'limit' => $limit]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Reconcile transaction with invoice/expense
     */
    public function reconcileTransaction(string $transactionId, string $matchType, string $matchId): bool {
        // Store reconciliation info in metadata
        $sql = "
            UPDATE bank_transactions
            SET matched_transaction_id = :match_id,
                metadata = jsonb_set(
                    COALESCE(metadata, '{}'::jsonb),
                    '{reconciled}',
                    jsonb_build_object('type', :match_type, 'id', :match_id2, 'at', NOW()::text)
                ),
                status = 'reconciled',
                updated_at = NOW()
            WHERE id = :id
        ";

        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute([
            'id' => $transactionId,
            'match_type' => $matchType,
            'match_id' => $matchId,
            'match_id2' => $matchId
        ]);
    }

    /**
     * Find potential matches for reconciliation
     */
    public function findPotentialMatches(string $transactionId): array {
        // Get transaction details
        $stmt = $this->pdo->prepare("SELECT * FROM bank_transactions WHERE id = :id");
        $stmt->execute(['id' => $transactionId]);
        $transaction = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$transaction) return [];

        $matches = [];
        $amount = abs($transaction['amount']);
        $date = $transaction['transaction_date'];
        $companyId = $transaction['company_id'];

        // Match with invoices (for credits/income)
        if ($transaction['amount'] > 0) {
            $sql = "
                SELECT i.id, i.invoice_number, i.customer_id, i.total_amount, i.amount_due,
                       i.invoice_date, c.display_name as customer_name,
                       'invoice' as match_type
                FROM invoices i
                JOIN contacts c ON i.customer_id = c.id
                WHERE i.company_id = :company_id
                  AND i.status != 'paid'
                  AND ABS(i.amount_due - :amount) < 1
                ORDER BY ABS(i.amount_due - :amount), i.invoice_date DESC
                LIMIT 5
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute(['company_id' => $companyId, 'amount' => $amount]);
            $matches = array_merge($matches, $stmt->fetchAll(PDO::FETCH_ASSOC));
        }

        // Match with expenses (for debits/payments)
        if ($transaction['amount'] < 0) {
            $sql = "
                SELECT e.id, e.description, e.vendor_id, e.amount, e.expense_date,
                       v.display_name as vendor_name,
                       'expense' as match_type
                FROM expenses e
                LEFT JOIN contacts v ON e.vendor_id = v.id
                WHERE e.company_id = :company_id
                  AND e.payment_status != 'paid'
                  AND ABS(e.amount - :amount) < 1
                ORDER BY ABS(e.amount - :amount), e.expense_date DESC
                LIMIT 5
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute(['company_id' => $companyId, 'amount' => $amount]);
            $matches = array_merge($matches, $stmt->fetchAll(PDO::FETCH_ASSOC));

            // Match with bills
            $sql = "
                SELECT b.id, b.bill_number, b.vendor_id, b.total_amount, b.amount_due,
                       b.bill_date, v.display_name as vendor_name,
                       'bill' as match_type
                FROM bills b
                LEFT JOIN contacts v ON b.vendor_id = v.id
                WHERE b.company_id = :company_id
                  AND b.status != 'paid'
                  AND ABS(b.amount_due - :amount) < 1
                ORDER BY ABS(b.amount_due - :amount), b.bill_date DESC
                LIMIT 5
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute(['company_id' => $companyId, 'amount' => $amount]);
            $matches = array_merge($matches, $stmt->fetchAll(PDO::FETCH_ASSOC));
        }

        return $matches;
    }

    /**
     * Generate UUID
     */
    private function generateUUID(): string {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    /**
     * Get account statement summary
     */
    public function getAccountSummary(string $bankAccountId, string $startDate, string $endDate): array {
        $sql = "
            SELECT
                SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_credits,
                SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as total_debits,
                COUNT(*) as transaction_count,
                MIN(transaction_date) as first_transaction,
                MAX(transaction_date) as last_transaction
            FROM bank_transactions
            WHERE bank_account_id = :account
              AND transaction_date BETWEEN :start AND :end
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            'account' => $bankAccountId,
            'start' => $startDate,
            'end' => $endDate
        ]);

        $summary = $stmt->fetch(PDO::FETCH_ASSOC);

        // Get category breakdown
        $categorySql = "
            SELECT category, SUM(ABS(amount)) as total, COUNT(*) as count
            FROM bank_transactions
            WHERE bank_account_id = :account
              AND transaction_date BETWEEN :start AND :end
            GROUP BY category
            ORDER BY total DESC
        ";

        $stmt = $this->pdo->prepare($categorySql);
        $stmt->execute([
            'account' => $bankAccountId,
            'start' => $startDate,
            'end' => $endDate
        ]);

        $summary['by_category'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return $summary;
    }
}
