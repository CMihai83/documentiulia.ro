<?php
/**
 * Transaction Categorization Engine
 *
 * Intelligently categorizes bank transactions using keyword matching,
 * pattern recognition, and machine learning
 */

class CategorizationEngine
{
    private $db;
    private $rulesCache = null;

    public function __construct($db)
    {
        $this->db = $db;
    }

    /**
     * Categorize a transaction
     *
     * @param string $companyId Company UUID
     * @param string $description Transaction description
     * @param float $amount Transaction amount
     * @param string|null $counterparty Merchant/counterparty name
     * @return array ['category' => string, 'subcategory' => string|null, 'confidence' => float]
     */
    public function categorize(
        string $companyId,
        string $description,
        float $amount,
        ?string $counterparty = null
    ): array {
        // Load categorization rules for company
        $rules = $this->getRules($companyId);

        // Try to match against rules (sorted by priority)
        foreach ($rules as $rule) {
            $match = $this->matchRule($rule, $description, $amount, $counterparty);

            if ($match) {
                // Update rule statistics
                $this->updateRuleStats($rule['id']);

                return [
                    'category' => $rule['category'],
                    'subcategory' => $rule['subcategory'],
                    'confidence' => $this->calculateConfidence($rule, $match)
                ];
            }
        }

        // No rule matched, use default categorization
        return $this->defaultCategorization($description, $amount, $counterparty);
    }

    /**
     * Get categorization rules for a company
     */
    private function getRules(string $companyId): array
    {
        // Use cached rules if available
        if ($this->rulesCache !== null) {
            return $this->rulesCache;
        }

        $query = "SELECT * FROM transaction_categorization_rules
                  WHERE (company_id = :company_id OR is_system_rule = true)
                  AND is_active = true
                  ORDER BY priority DESC, id ASC";

        $stmt = $this->db->prepare($query);
        $stmt->execute([':company_id' => $companyId]);

        $this->rulesCache = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return $this->rulesCache;
    }

    /**
     * Match a rule against transaction data
     */
    private function matchRule(
        array $rule,
        string $description,
        float $amount,
        ?string $counterparty
    ): ?array {
        $ruleType = $rule['rule_type'];
        $pattern = $rule['pattern'];

        switch ($ruleType) {
            case 'keyword':
                return $this->matchKeyword($pattern, $description, $counterparty);

            case 'regex':
                return $this->matchRegex($pattern, $description);

            case 'amount_range':
                return $this->matchAmountRange($pattern, $amount);

            case 'counterparty':
                return $this->matchCounterparty($pattern, $counterparty);

            case 'ml_learned':
                // Placeholder for future ML integration
                return null;

            default:
                return null;
        }
    }

    /**
     * Match keyword pattern
     */
    private function matchKeyword(string $pattern, string $description, ?string $counterparty): ?array
    {
        $keywords = explode('|', strtolower($pattern));
        $text = strtolower($description . ' ' . $counterparty);

        foreach ($keywords as $keyword) {
            if (strpos($text, trim($keyword)) !== false) {
                return ['type' => 'keyword', 'matched' => $keyword];
            }
        }

        return null;
    }

    /**
     * Match regex pattern
     */
    private function matchRegex(string $pattern, string $description): ?array
    {
        if (@preg_match($pattern, $description, $matches)) {
            return ['type' => 'regex', 'matched' => $matches[0]];
        }

        return null;
    }

    /**
     * Match amount range
     */
    private function matchAmountRange(string $pattern, float $amount): ?array
    {
        // Pattern format: "min-max" or ">value" or "<value"
        if (preg_match('/^(-?\d+\.?\d*)-(-?\d+\.?\d*)$/', $pattern, $matches)) {
            $min = (float)$matches[1];
            $max = (float)$matches[2];

            if ($amount >= $min && $amount <= $max) {
                return ['type' => 'amount_range', 'matched' => $pattern];
            }
        } elseif (preg_match('/^>(-?\d+\.?\d*)$/', $pattern, $matches)) {
            if ($amount > (float)$matches[1]) {
                return ['type' => 'amount_range', 'matched' => $pattern];
            }
        } elseif (preg_match('/^<(-?\d+\.?\d*)$/', $pattern, $matches)) {
            if ($amount < (float)$matches[1]) {
                return ['type' => 'amount_range', 'matched' => $pattern];
            }
        }

        return null;
    }

    /**
     * Match counterparty pattern
     */
    private function matchCounterparty(string $pattern, ?string $counterparty): ?array
    {
        if (!$counterparty) {
            return null;
        }

        $patterns = explode('|', strtolower($pattern));
        $counterpartyLower = strtolower($counterparty);

        foreach ($patterns as $p) {
            if (strpos($counterpartyLower, trim($p)) !== false) {
                return ['type' => 'counterparty', 'matched' => $p];
            }
        }

        return null;
    }

    /**
     * Calculate confidence score for a match
     */
    private function calculateConfidence(array $rule, array $match): float
    {
        $baseConfidence = 70.0; // Default confidence

        // Adjust based on rule type
        switch ($match['type']) {
            case 'keyword':
                $baseConfidence = 75.0;
                break;
            case 'regex':
                $baseConfidence = 85.0;
                break;
            case 'amount_range':
                $baseConfidence = 65.0;
                break;
            case 'counterparty':
                $baseConfidence = 90.0;
                break;
        }

        // Boost confidence for system rules
        if ($rule['is_system_rule']) {
            $baseConfidence += 5.0;
        }

        // Boost confidence based on rule's historical accuracy
        if ($rule['accuracy_score'] && $rule['match_count'] > 10) {
            $baseConfidence = ($baseConfidence + $rule['accuracy_score']) / 2;
        }

        return min(100.0, $baseConfidence);
    }

    /**
     * Update rule match statistics
     */
    private function updateRuleStats(int $ruleId): void
    {
        try {
            $query = "UPDATE transaction_categorization_rules SET
                      match_count = match_count + 1,
                      last_matched_at = CURRENT_TIMESTAMP
                      WHERE id = :rule_id";

            $stmt = $this->db->prepare($query);
            $stmt->execute([':rule_id' => $ruleId]);
        } catch (Exception $e) {
            error_log("Failed to update rule stats: " . $e->getMessage());
        }
    }

    /**
     * Default categorization when no rules match
     */
    private function defaultCategorization(
        string $description,
        float $amount,
        ?string $counterparty
    ): array {
        $desc = strtolower($description . ' ' . $counterparty);

        // Income vs expense
        if ($amount > 0) {
            // Income detection
            if ($this->contains($desc, ['salary', 'salariu', 'wage', 'payroll'])) {
                return ['category' => 'income_salary', 'subcategory' => null, 'confidence' => 60.0];
            } elseif ($this->contains($desc, ['refund', 'rambursare', 'restitution'])) {
                return ['category' => 'income_refund', 'subcategory' => null, 'confidence' => 55.0];
            } else {
                return ['category' => 'income_other', 'subcategory' => null, 'confidence' => 40.0];
            }
        } else {
            // Expense detection
            if ($this->contains($desc, ['kaufland', 'carrefour', 'lidl', 'auchan', 'profi', 'mega'])) {
                return ['category' => 'groceries', 'subcategory' => null, 'confidence' => 65.0];
            } elseif ($this->contains($desc, ['petrom', 'omv', 'rompetrol', 'lukoil', 'benzinarie'])) {
                return ['category' => 'transportation_fuel', 'subcategory' => null, 'confidence' => 65.0];
            } elseif ($this->contains($desc, ['restaurant', 'cafe', 'bar', 'pizza', 'food'])) {
                return ['category' => 'dining_out', 'subcategory' => null, 'confidence' => 60.0];
            } elseif ($this->contains($desc, ['enel', 'electrica', 'engie', 'apa', 'gaz'])) {
                return ['category' => 'utilities', 'subcategory' => null, 'confidence' => 65.0];
            } elseif ($this->contains($desc, ['rent', 'chirie'])) {
                return ['category' => 'rent', 'subcategory' => null, 'confidence' => 70.0];
            } elseif ($this->contains($desc, ['atm', 'cash withdrawal', 'retragere'])) {
                return ['category' => 'cash_withdrawal', 'subcategory' => null, 'confidence' => 70.0];
            } else {
                return ['category' => 'uncategorized', 'subcategory' => null, 'confidence' => 30.0];
            }
        }
    }

    /**
     * Helper: Check if text contains any of the keywords
     */
    private function contains(string $text, array $keywords): bool
    {
        foreach ($keywords as $keyword) {
            if (strpos($text, $keyword) !== false) {
                return true;
            }
        }
        return false;
    }

    /**
     * Learn from user corrections
     * When user manually categorizes a transaction, create/update rule
     *
     * @param string $companyId Company UUID
     * @param string $description Transaction description
     * @param string $category User-assigned category
     * @param string|null $counterparty Counterparty name
     * @return bool Success
     */
    public function learnFromCorrection(
        string $companyId,
        string $description,
        string $category,
        ?string $counterparty = null
    ): bool {
        try {
            // Extract keywords from description
            $keywords = $this->extractKeywords($description);

            if (empty($keywords)) {
                return false;
            }

            // Create or update rule
            $pattern = implode('|', $keywords);

            $query = "INSERT INTO transaction_categorization_rules (
                company_id, rule_name, rule_type, pattern, category,
                priority, is_system_rule, auto_apply, match_count
            ) VALUES (
                :company_id, :rule_name, 'keyword', :pattern, :category,
                50, false, true, 1
            ) ON CONFLICT DO NOTHING";

            $stmt = $this->db->prepare($query);
            $stmt->execute([
                ':company_id' => $companyId,
                ':rule_name' => 'Auto-learned: ' . substr($description, 0, 50),
                ':pattern' => $pattern,
                ':category' => $category
            ]);

            // Clear rules cache
            $this->rulesCache = null;

            return true;

        } catch (Exception $e) {
            error_log("CategorizationEngine::learnFromCorrection Error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Extract keywords from description
     */
    private function extractKeywords(string $description): array
    {
        // Remove common words and extract meaningful keywords
        $stopWords = ['the', 'and', 'or', 'in', 'on', 'at', 'to', 'from', 'for', 'with'];

        $words = preg_split('/\s+/', strtolower($description));
        $keywords = [];

        foreach ($words as $word) {
            $word = preg_replace('/[^a-z0-9]/', '', $word);

            if (strlen($word) >= 3 && !in_array($word, $stopWords)) {
                $keywords[] = $word;
            }
        }

        // Return up to 3 most significant keywords
        return array_slice($keywords, 0, 3);
    }

    /**
     * Get category statistics for a company
     *
     * @param string $companyId Company UUID
     * @param string $fromDate Start date
     * @param string $toDate End date
     * @return array Category breakdown
     */
    public function getCategoryStats(string $companyId, string $fromDate, string $toDate): array
    {
        $query = "SELECT
            category,
            subcategory,
            COUNT(*) as transaction_count,
            SUM(ABS(amount)) as total_amount,
            AVG(category_confidence) as avg_confidence
            FROM bank_transactions
            WHERE company_id = :company_id
            AND transaction_date BETWEEN :from_date AND :to_date
            GROUP BY category, subcategory
            ORDER BY total_amount DESC";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            ':company_id' => $companyId,
            ':from_date' => $fromDate,
            ':to_date' => $toDate
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
