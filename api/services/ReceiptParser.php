<?php
/**
 * Receipt Parser - Extract structured data from OCR text
 *
 * Parses receipt text to extract:
 * - Merchant name
 * - Receipt date
 * - Total amount
 * - VAT amount
 * - Line items
 * - Payment method
 */

require_once __DIR__ . '/../config/Database.php';

class ReceiptParser
{
    private $db;
    private $templates = [];

    public function __construct()
    {
        $database = Database::getInstance();
        $this->db = $database->getConnection();
    }

    /**
     * Parse receipt text into structured data
     *
     * @param string $rawText Raw OCR text
     * @param array $structure Structured text blocks
     * @param string|null $companyId Company ID for template matching
     * @return array Parsed receipt data
     */
    public function parse(string $rawText, array $structure, ?string $companyId = null): array
    {
        // Load templates if company provided
        if ($companyId) {
            $this->loadTemplates($companyId);
        }

        $lines = array_filter(explode("\n", $rawText));

        return [
            'merchant_name' => $this->extractMerchant($lines, $structure),
            'receipt_date' => $this->extractDate($rawText, $lines),
            'total_amount' => $this->extractTotalAmount($rawText, $lines),
            'vat_amount' => $this->extractVATAmount($rawText, $lines),
            'vat_rate' => $this->extractVATRate($rawText),
            'currency' => $this->extractCurrency($rawText),
            'payment_method' => $this->extractPaymentMethod($rawText),
            'receipt_number' => $this->extractReceiptNumber($rawText, $lines),
            'line_items' => $this->extractLineItems($lines),
            'confidence_scores' => $this->calculateConfidenceScores($rawText, $lines)
        ];
    }

    /**
     * Extract merchant name
     */
    private function extractMerchant(array $lines, array $structure): ?array
    {
        if (empty($lines)) {
            return null;
        }

        // Check against templates first
        foreach ($this->templates as $template) {
            if (!empty($template['merchant_pattern'])) {
                foreach ($lines as $line) {
                    if (preg_match('/' . $template['merchant_pattern'] . '/i', $line)) {
                        return [
                            'value' => $template['merchant_name'],
                            'confidence' => 95.0
                        ];
                    }
                }
            }
        }

        // First line strategy (most common)
        $firstLine = trim($lines[0]);

        // Skip common receipt headers
        $skipPatterns = ['BON FISCAL', 'RECEIPT', 'CHITANTA', 'FACTURA', 'INVOICE'];
        foreach ($skipPatterns as $pattern) {
            if (stripos($firstLine, $pattern) !== false) {
                $firstLine = isset($lines[1]) ? trim($lines[1]) : '';
                break;
            }
        }

        // Look for company indicators (S.R.L., S.A., PFA)
        $companyIndicators = ['S\.R\.L\.', 'S\.A\.', 'PFA', 'SRL', 'SA'];
        foreach ($lines as $index => $line) {
            if ($index > 5) break; // Only check first 5 lines

            foreach ($companyIndicators as $indicator) {
                if (preg_match('/\b' . $indicator . '\b/i', $line)) {
                    return [
                        'value' => trim($line),
                        'confidence' => 90.0
                    ];
                }
            }
        }

        // Fallback to first line
        return [
            'value' => $firstLine,
            'confidence' => $firstLine ? 75.0 : 30.0
        ];
    }

    /**
     * Extract receipt date
     */
    private function extractDate(string $rawText, array $lines): ?array
    {
        // Date keywords
        $dateKeywords = ['DATA:', 'DATE:', 'DIN DATA', 'DATA', 'EMIS'];

        // Date patterns
        $datePatterns = [
            '/(\d{2})[\.\-\/](\d{2})[\.\-\/](\d{4})/',  // DD.MM.YYYY or DD/MM/YYYY
            '/(\d{4})[\.\-\/](\d{2})[\.\-\/](\d{2})/',  // YYYY-MM-DD
            '/(\d{2})[\.\-\/](\d{2})[\.\-\/](\d{2})/'   // DD.MM.YY
        ];

        // Search with keywords first (higher confidence)
        foreach ($lines as $line) {
            foreach ($dateKeywords as $keyword) {
                if (stripos($line, $keyword) !== false) {
                    foreach ($datePatterns as $pattern) {
                        if (preg_match($pattern, $line, $matches)) {
                            $date = $this->normalizeDate($matches, $pattern);
                            if ($this->isValidDate($date)) {
                                return [
                                    'value' => $date,
                                    'confidence' => 95.0
                                ];
                            }
                        }
                    }
                }
            }
        }

        // Search without keywords (lower confidence)
        foreach ($datePatterns as $pattern) {
            if (preg_match($pattern, $rawText, $matches)) {
                $date = $this->normalizeDate($matches, $pattern);
                if ($this->isValidDate($date)) {
                    return [
                        'value' => $date,
                        'confidence' => 75.0
                    ];
                }
            }
        }

        return null;
    }

    /**
     * Normalize date from regex matches
     */
    private function normalizeDate(array $matches, string $pattern): ?string
    {
        try {
            if (strpos($pattern, 'YYYY') !== false && strpos($pattern, 'MM') !== false) {
                // YYYY-MM-DD format
                return $matches[1] . '-' . $matches[2] . '-' . $matches[3];
            } else if (strpos($pattern, 'DD') !== false) {
                // DD.MM.YYYY or DD.MM.YY format
                $day = $matches[1];
                $month = $matches[2];
                $year = $matches[3];

                // Handle 2-digit year
                if (strlen($year) === 2) {
                    $year = (int)$year >= 50 ? '19' . $year : '20' . $year;
                }

                return $year . '-' . $month . '-' . $day;
            }
        } catch (Exception $e) {
            return null;
        }

        return null;
    }

    /**
     * Validate date
     */
    private function isValidDate(?string $date): bool
    {
        if (!$date) return false;

        $timestamp = strtotime($date);
        if (!$timestamp) return false;

        // Check if date is not in future
        if ($timestamp > time()) return false;

        // Check if date is not older than 2 years
        $twoYearsAgo = strtotime('-2 years');
        if ($timestamp < $twoYearsAgo) return false;

        return true;
    }

    /**
     * Extract total amount
     */
    private function extractTotalAmount(string $rawText, array $lines): ?array
    {
        // Keywords for total
        $totalKeywords = [
            'TOTAL\s*DE\s*PLATA',
            'TOTAL\s*PLATA',
            'DE\s*PLATA',
            'TOTAL',
            'SUMA\s*TOTALA',
            'SUMA'
        ];

        // Amount pattern (handles both . and , as decimal separator)
        $amountPattern = '(\d{1,6})[,\.](\d{2})';

        // Search with keywords (higher confidence)
        foreach ($totalKeywords as $keyword) {
            foreach ($lines as $line) {
                if (preg_match('/' . $keyword . '.*?' . $amountPattern . '/i', $line, $matches)) {
                    $amount = (float)($matches[1] . '.' . $matches[2]);
                    if ($amount > 0 && $amount < 1000000) {
                        return [
                            'value' => $amount,
                            'confidence' => 95.0
                        ];
                    }
                }
            }
        }

        // Find largest amount in receipt (fallback strategy)
        $amounts = [];
        if (preg_match_all('/' . $amountPattern . '/', $rawText, $allMatches, PREG_SET_ORDER)) {
            foreach ($allMatches as $match) {
                $amount = (float)($match[1] . '.' . $match[2]);
                if ($amount > 0 && $amount < 1000000) {
                    $amounts[] = $amount;
                }
            }
        }

        if (!empty($amounts)) {
            $largestAmount = max($amounts);
            return [
                'value' => $largestAmount,
                'confidence' => 65.0
            ];
        }

        return null;
    }

    /**
     * Extract VAT amount
     */
    private function extractVATAmount(string $rawText, array $lines): ?array
    {
        $vatKeywords = ['TVA', 'T\.V\.A\.', 'VAT'];
        $amountPattern = '(\d{1,6})[,\.](\d{2})';

        foreach ($vatKeywords as $keyword) {
            foreach ($lines as $line) {
                if (preg_match('/' . $keyword . '.*?' . $amountPattern . '/i', $line, $matches)) {
                    $amount = (float)($matches[1] . '.' . $matches[2]);
                    if ($amount > 0) {
                        return [
                            'value' => $amount,
                            'confidence' => 90.0
                        ];
                    }
                }
            }
        }

        return null;
    }

    /**
     * Extract VAT rate
     */
    private function extractVATRate(string $rawText): ?float
    {
        // Common VAT rates in Romania: 19%, 9%, 5%
        $vatRates = [19, 9, 5];

        foreach ($vatRates as $rate) {
            if (preg_match('/\b' . $rate . '\s*%/', $rawText)) {
                return (float)$rate;
            }
        }

        // Default to 19% if no rate found but VAT mentioned
        if (preg_match('/TVA|VAT/i', $rawText)) {
            return 19.0;
        }

        return null;
    }

    /**
     * Extract currency
     */
    private function extractCurrency(string $rawText): string
    {
        $currencies = ['RON', 'LEI', 'EUR', 'USD'];

        foreach ($currencies as $currency) {
            if (preg_match('/\b' . $currency . '\b/i', $rawText)) {
                return $currency === 'LEI' ? 'RON' : $currency;
            }
        }

        return 'RON'; // Default to RON for Romanian receipts
    }

    /**
     * Extract payment method
     */
    private function extractPaymentMethod(string $rawText): ?string
    {
        $methods = [
            'card' => ['CARD', 'POS', 'MASTERCARD', 'VISA'],
            'cash' => ['CASH', 'NUMERAR', 'CONT'],
            'transfer' => ['TRANSFER', 'VIRAMENT']
        ];

        foreach ($methods as $method => $keywords) {
            foreach ($keywords as $keyword) {
                if (preg_match('/\b' . $keyword . '\b/i', $rawText)) {
                    return $method;
                }
            }
        }

        return null;
    }

    /**
     * Extract receipt number
     */
    private function extractReceiptNumber(string $rawText, array $lines): ?string
    {
        $patterns = [
            '/BON\s*NR[:\.]?\s*(\d+)/i',
            '/NR[:\.]?\s*(\d{4,})/i',
            '/RECEIPT\s*#?(\d+)/i'
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $rawText, $matches)) {
                return $matches[1];
            }
        }

        return null;
    }

    /**
     * Extract line items (basic implementation)
     */
    private function extractLineItems(array $lines): array
    {
        $items = [];
        $amountPattern = '(\d{1,6})[,\.](\d{2})';

        // Skip first 3 lines (usually header) and last 5 lines (usually totals)
        $startIndex = min(3, count($lines) - 1);
        $endIndex = max(0, count($lines) - 5);

        for ($i = $startIndex; $i < $endIndex; $i++) {
            $line = $lines[$i];

            // Skip lines with total keywords
            if (preg_match('/TOTAL|SUMA|PLATA|TVA/i', $line)) {
                continue;
            }

            // Try to extract item description and price
            if (preg_match('/^(.+?)\s+' . $amountPattern . '\s*$/i', $line, $matches)) {
                $description = trim($matches[1]);
                $price = (float)($matches[2] . '.' . $matches[3]);

                if (strlen($description) > 3 && $price > 0 && $price < 10000) {
                    $items[] = [
                        'description' => $description,
                        'price' => $price,
                        'quantity' => 1
                    ];
                }
            }
        }

        return $items;
    }

    /**
     * Calculate confidence scores for all fields
     */
    private function calculateConfidenceScores(string $rawText, array $lines): array
    {
        $scores = [];

        // Merchant confidence
        $firstLine = !empty($lines) ? trim($lines[0]) : '';
        $scores['merchant'] = !empty($firstLine) ? 85.0 : 30.0;

        // Date confidence
        $hasDateKeyword = preg_match('/DATA:|DATE:/i', $rawText);
        $hasDatePattern = preg_match('/\d{2}[\.\-\/]\d{2}[\.\-\/]\d{2,4}/', $rawText);
        $scores['date'] = $hasDateKeyword ? 95.0 : ($hasDatePattern ? 75.0 : 30.0);

        // Amount confidence
        $hasTotalKeyword = preg_match('/TOTAL|SUMA/i', $rawText);
        $hasAmount = preg_match('/\d+[,\.]\d{2}/', $rawText);
        $scores['amount'] = $hasTotalKeyword ? 95.0 : ($hasAmount ? 65.0 : 30.0);

        // VAT confidence
        $hasVATKeyword = preg_match('/TVA|VAT/i', $rawText);
        $scores['vat'] = $hasVATKeyword ? 90.0 : 40.0;

        return $scores;
    }

    /**
     * Load receipt templates for company
     */
    private function loadTemplates(?string $companyId): void
    {
        if (!$companyId) {
            return;
        }

        $query = "SELECT * FROM receipt_templates
                  WHERE (company_id = :company_id OR is_system_template = true)
                  ORDER BY is_system_template DESC, usage_count DESC";

        $stmt = $this->db->prepare($query);
        $stmt->execute([':company_id' => $companyId]);

        $this->templates = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Calculate overall confidence
     */
    public function calculateOverallConfidence(array $parsedData): float
    {
        $scores = $parsedData['confidence_scores'] ?? [];

        if (empty($scores)) {
            return 50.0;
        }

        return array_sum($scores) / count($scores);
    }

    /**
     * Save or update template from corrected receipt
     *
     * @param string $companyId Company UUID
     * @param string $merchantName Merchant name
     * @param string $rawText Original OCR text
     * @param array $correctedData User-corrected data
     * @return bool Success status
     */
    public function saveTemplate(string $companyId, string $merchantName, string $rawText, array $correctedData): bool
    {
        try {
            // Extract patterns from raw text and corrected data
            $patterns = $this->extractPatterns($rawText, $correctedData);

            // Check if template already exists
            $query = "SELECT id, usage_count FROM receipt_templates
                      WHERE company_id = :company_id AND merchant_name = :merchant_name";
            $stmt = $this->db->prepare($query);
            $stmt->execute([
                ':company_id' => $companyId,
                ':merchant_name' => $merchantName
            ]);
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($existing) {
                // Update existing template
                $query = "UPDATE receipt_templates SET
                          merchant_pattern = :merchant_pattern,
                          date_pattern = :date_pattern,
                          amount_pattern = :amount_pattern,
                          vat_pattern = :vat_pattern,
                          usage_count = usage_count + 1,
                          updated_at = CURRENT_TIMESTAMP
                          WHERE id = :id";
                $stmt = $this->db->prepare($query);
                $stmt->execute([
                    ':id' => $existing['id'],
                    ':merchant_pattern' => $patterns['merchant_pattern'],
                    ':date_pattern' => $patterns['date_pattern'],
                    ':amount_pattern' => $patterns['amount_pattern'],
                    ':vat_pattern' => $patterns['vat_pattern']
                ]);
            } else {
                // Insert new template
                $query = "INSERT INTO receipt_templates
                          (company_id, merchant_name, merchant_pattern, date_pattern, amount_pattern, vat_pattern, usage_count)
                          VALUES (:company_id, :merchant_name, :merchant_pattern, :date_pattern, :amount_pattern, :vat_pattern, 1)";
                $stmt = $this->db->prepare($query);
                $stmt->execute([
                    ':company_id' => $companyId,
                    ':merchant_name' => $merchantName,
                    ':merchant_pattern' => $patterns['merchant_pattern'],
                    ':date_pattern' => $patterns['date_pattern'],
                    ':amount_pattern' => $patterns['amount_pattern'],
                    ':vat_pattern' => $patterns['vat_pattern']
                ]);
            }

            return true;
        } catch (Exception $e) {
            error_log("Error saving template: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Extract patterns from OCR text and corrected data
     */
    private function extractPatterns(string $rawText, array $correctedData): array
    {
        $patterns = [
            'merchant_pattern' => null,
            'date_pattern' => null,
            'amount_pattern' => null,
            'vat_pattern' => null
        ];

        // Extract merchant pattern (escape special characters for regex)
        if (!empty($correctedData['merchant_name'])) {
            $patterns['merchant_pattern'] = preg_quote($correctedData['merchant_name'], '/');
        }

        // Extract date pattern
        if (!empty($correctedData['receipt_date'])) {
            $date = $correctedData['receipt_date'];
            // Find lines containing the date
            $lines = explode("\n", $rawText);
            foreach ($lines as $lineNum => $line) {
                if (stripos($line, str_replace('-', '', $date)) !== false ||
                    stripos($line, str_replace('-', '.', $date)) !== false ||
                    stripos($line, str_replace('-', '/', $date)) !== false) {
                    $patterns['date_pattern'] = "line:" . $lineNum;
                    break;
                }
            }
        }

        // Extract amount pattern
        if (!empty($correctedData['total_amount'])) {
            $amount = number_format($correctedData['total_amount'], 2, '.', '');
            $patterns['amount_pattern'] = "total.*?" . preg_quote($amount, '/');
        }

        // Extract VAT pattern
        if (!empty($correctedData['vat_amount'])) {
            $vat = number_format($correctedData['vat_amount'], 2, '.', '');
            $patterns['vat_pattern'] = "tva.*?" . preg_quote($vat, '/');
        }

        return $patterns;
    }
}
