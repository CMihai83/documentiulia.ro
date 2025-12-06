<?php

require_once __DIR__ . '/../config/database.php';

class JournalService {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Create journal entry with lines (double-entry bookkeeping)
     */
    public function createJournalEntry($companyId, $data, $userId) {
        // Validate that debits equal credits
        $totalDebits = 0;
        $totalCredits = 0;
        foreach ($data['lines'] as $line) {
            $totalDebits += $line['debit'] ?? 0;
            $totalCredits += $line['credit'] ?? 0;
        }

        if (abs($totalDebits - $totalCredits) > 0.01) {
            throw new Exception('Debits must equal credits');
        }

        // Create journal entry header
        $query = "
            INSERT INTO journal_entries (
                company_id, entry_date, reference, description, status, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        ";

        $result = $this->db->fetchOne($query, [
            $companyId,
            $data['entry_date'],
            $data['reference'] ?? null,
            $data['description'] ?? null,
            $data['status'] ?? 'draft',
            $userId
        ]);

        $entryId = $result['id'];

        // Create journal entry lines
        foreach ($data['lines'] as $line) {
            $lineQuery = "
                INSERT INTO journal_entry_lines (
                    journal_entry_id, account_id, debit, credit, description
                ) VALUES ($1, $2, $3, $4, $5)
            ";

            $this->db->query($lineQuery, [
                $entryId,
                $line['account_id'],
                $line['debit'] ?? 0,
                $line['credit'] ?? 0,
                $line['description'] ?? null
            ]);
        }

        return $entryId;
    }

    /**
     * Post journal entry (finalize it)
     */
    public function postJournalEntry($entryId, $companyId, $userId) {
        // Get entry with lines
        $entry = $this->getJournalEntry($entryId, $companyId);

        if (!$entry) {
            throw new Exception('Journal entry not found');
        }

        if ($entry['status'] === 'posted') {
            throw new Exception('Journal entry is already posted');
        }

        // Update entry status
        $this->db->query(
            "UPDATE journal_entries
             SET status = 'posted', posted_at = NOW(), posted_by = $1
             WHERE id = $2 AND company_id = $3",
            [$userId, $entryId, $companyId]
        );

        // Update account balances
        foreach ($entry['lines'] as $line) {
            $this->updateAccountBalance(
                $line['account_id'],
                $line['debit'],
                $line['credit']
            );
        }
    }

    /**
     * Update account balance
     */
    private function updateAccountBalance($accountId, $debit, $credit) {
        $this->db->query(
            "UPDATE accounts
             SET balance = balance + $1 - $2
             WHERE id = $3",
            [$debit, $credit, $accountId]
        );
    }

    /**
     * Get journal entry with lines
     */
    public function getJournalEntry($entryId, $companyId) {
        $entry = $this->db->fetchOne(
            "SELECT * FROM journal_entries
             WHERE id = $1 AND company_id = $2",
            [$entryId, $companyId]
        );

        if (!$entry) {
            return null;
        }

        $lines = $this->db->fetchAll(
            "SELECT
                jel.*,
                a.code as account_code,
                a.name as account_name
             FROM journal_entry_lines jel
             JOIN accounts a ON jel.account_id = a.id
             WHERE jel.journal_entry_id = $1
             ORDER BY jel.created_at",
            [$entryId]
        );

        $entry['lines'] = $lines;
        return $entry;
    }

    /**
     * List journal entries
     */
    public function listJournalEntries($companyId, $filters = []) {
        $conditions = ['company_id = $1'];
        $params = [$companyId];
        $paramCount = 1;

        if (!empty($filters['status'])) {
            $paramCount++;
            $conditions[] = "status = $$paramCount";
            $params[] = $filters['status'];
        }

        if (!empty($filters['start_date'])) {
            $paramCount++;
            $conditions[] = "entry_date >= $$paramCount";
            $params[] = $filters['start_date'];
        }

        if (!empty($filters['end_date'])) {
            $paramCount++;
            $conditions[] = "entry_date <= $$paramCount";
            $params[] = $filters['end_date'];
        }

        $whereClause = implode(' AND ', $conditions);

        return $this->db->fetchAll(
            "SELECT
                je.*,
                u.first_name || ' ' || u.last_name as created_by_name,
                (SELECT SUM(debit) FROM journal_entry_lines WHERE journal_entry_id = je.id) as total_debit,
                (SELECT SUM(credit) FROM journal_entry_lines WHERE journal_entry_id = je.id) as total_credit
             FROM journal_entries je
             LEFT JOIN users u ON je.created_by = u.id
             WHERE $whereClause
             ORDER BY je.entry_date DESC, je.created_at DESC",
            $params
        );
    }

    /**
     * Get general ledger for an account
     */
    public function getGeneralLedger($companyId, $accountId, $startDate, $endDate) {
        return $this->db->fetchAll(
            "SELECT
                je.entry_date,
                je.reference,
                je.description as entry_description,
                jel.description as line_description,
                jel.debit,
                jel.credit,
                jel.debit - jel.credit as net_change
             FROM journal_entry_lines jel
             JOIN journal_entries je ON jel.journal_entry_id = je.id
             WHERE je.company_id = $1
               AND jel.account_id = $2
               AND je.entry_date BETWEEN $3 AND $4
               AND je.status = 'posted'
             ORDER BY je.entry_date, je.created_at",
            [$companyId, $accountId, $startDate, $endDate]
        );
    }

    /**
     * Get trial balance
     */
    public function getTrialBalance($companyId, $asOfDate) {
        return $this->db->fetchAll(
            "SELECT
                a.id,
                a.code,
                a.name,
                a.account_type,
                COALESCE(SUM(jel.debit), 0) as total_debit,
                COALESCE(SUM(jel.credit), 0) as total_credit,
                COALESCE(SUM(jel.debit) - SUM(jel.credit), 0) as balance
             FROM accounts a
             LEFT JOIN journal_entry_lines jel ON a.id = jel.account_id
             LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
                 AND je.company_id = $1
                 AND je.entry_date <= $2
                 AND je.status = 'posted'
             WHERE a.company_id = $1
               AND a.is_active = true
             GROUP BY a.id, a.code, a.name, a.account_type
             HAVING COALESCE(SUM(jel.debit) - SUM(jel.credit), 0) != 0
             ORDER BY a.code",
            [$companyId, $asOfDate]
        );
    }
}
