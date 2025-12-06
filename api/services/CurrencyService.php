<?php
/**
 * Currency Service - Multi-Currency System
 * Epic 5: EU Expansion Framework - Sprint 18
 *
 * Handles:
 * - System currencies management
 * - ECB exchange rate fetching and caching
 * - Currency conversion
 * - Multi-currency reporting
 */

require_once __DIR__ . '/../config/Database.php';

class CurrencyService {
    private static ?CurrencyService $instance = null;
    private PDO $pdo;
    private string $ecbApiUrl = 'https://data-api.ecb.europa.eu/service/data/EXR/D.{currencies}.EUR.SP00.A';
    private string $ecbLatestUrl = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';

    // Supported currencies
    private array $supportedCurrencies = ['EUR', 'RON', 'PLN', 'HUF', 'CZK', 'BGN', 'USD', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK'];

    private function __construct() {
        $database = Database::getInstance();
        $this->pdo = $database->getConnection();
    }

    public static function getInstance(): CurrencyService {
        if (self::$instance === null) {
            self::$instance = new CurrencyService();
        }
        return self::$instance;
    }

    /**
     * Get all system currencies
     */
    public function getAllCurrencies(bool $activeOnly = true): array {
        $sql = "SELECT * FROM system_currencies";
        if ($activeOnly) {
            $sql .= " WHERE is_active = true";
        }
        $sql .= " ORDER BY code";

        $stmt = $this->pdo->query($sql);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get a single currency by code
     */
    public function getCurrency(string $code): ?array {
        $stmt = $this->pdo->prepare("SELECT * FROM system_currencies WHERE code = ?");
        $stmt->execute([strtoupper($code)]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    /**
     * Get EU currencies only
     */
    public function getEUCurrencies(): array {
        $stmt = $this->pdo->query("
            SELECT * FROM system_currencies
            WHERE is_active = true AND (is_eu_currency = true OR country_code IN ('RO', 'PL', 'HU', 'CZ', 'BG', 'SE', 'DK'))
            ORDER BY code
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Fetch latest exchange rates from ECB
     */
    public function fetchECBRates(): array {
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'timeout' => 10,
                'user_agent' => 'DocumentiuliaRO/1.0'
            ]
        ]);

        $xml = @file_get_contents($this->ecbLatestUrl, false, $context);
        if ($xml === false) {
            throw new Exception('Failed to fetch ECB exchange rates');
        }

        $data = simplexml_load_string($xml);
        if ($data === false) {
            throw new Exception('Failed to parse ECB response');
        }

        $rates = ['EUR' => 1.0]; // EUR is always 1.0
        $rateDate = null;

        // Parse the ECB XML structure
        foreach ($data->Cube->Cube as $cube) {
            $rateDate = (string)$cube['time'];
            foreach ($cube->Cube as $rate) {
                $currency = (string)$rate['currency'];
                $rateValue = (float)$rate['rate'];
                if (in_array($currency, $this->supportedCurrencies)) {
                    $rates[$currency] = $rateValue;
                }
            }
        }

        if (empty($rateDate)) {
            $rateDate = date('Y-m-d');
        }

        // Store rates in database
        $this->storeECBRates($rates, $rateDate);

        return [
            'date' => $rateDate,
            'base' => 'EUR',
            'rates' => $rates
        ];
    }

    /**
     * Store ECB rates in database
     */
    private function storeECBRates(array $rates, string $date): void {
        $stmt = $this->pdo->prepare("
            INSERT INTO ecb_exchange_rates (base_currency, target_currency, rate, rate_date, source)
            VALUES ('EUR', ?, ?, ?, 'ECB')
            ON CONFLICT (base_currency, target_currency, rate_date)
            DO UPDATE SET rate = EXCLUDED.rate, created_at = NOW()
        ");

        foreach ($rates as $currency => $rate) {
            if ($currency !== 'EUR') {
                $stmt->execute([$currency, $rate, $date]);
            }
        }
    }

    /**
     * Get latest exchange rate for a currency pair
     */
    public function getExchangeRate(string $fromCurrency, string $toCurrency, ?string $date = null): float {
        $fromCurrency = strtoupper($fromCurrency);
        $toCurrency = strtoupper($toCurrency);

        // Same currency
        if ($fromCurrency === $toCurrency) {
            return 1.0;
        }

        // Get rates for the date (or latest if no date specified)
        $dateCondition = $date ? "rate_date = ?" : "rate_date = (SELECT MAX(rate_date) FROM ecb_exchange_rates)";
        $params = $date ? [$date] : [];

        // Get EUR-based rates
        $stmt = $this->pdo->prepare("
            SELECT target_currency, rate
            FROM ecb_exchange_rates
            WHERE $dateCondition
        ");
        $stmt->execute($params);
        $rates = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

        // Add EUR
        $rates['EUR'] = 1.0;

        // If we don't have rates, try to fetch them
        if (empty($rates) || count($rates) < 2) {
            $this->fetchECBRates();
            // Retry
            $stmt->execute($params);
            $rates = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
            $rates['EUR'] = 1.0;
        }

        // Calculate cross rate
        if (!isset($rates[$fromCurrency]) && $fromCurrency !== 'EUR') {
            throw new Exception("Exchange rate not available for $fromCurrency");
        }
        if (!isset($rates[$toCurrency]) && $toCurrency !== 'EUR') {
            throw new Exception("Exchange rate not available for $toCurrency");
        }

        $fromRate = $rates[$fromCurrency] ?? 1.0;
        $toRate = $rates[$toCurrency] ?? 1.0;

        // Convert through EUR: fromCurrency -> EUR -> toCurrency
        // 1 fromCurrency = (1/fromRate) EUR = (toRate/fromRate) toCurrency
        return $toRate / $fromRate;
    }

    /**
     * Convert amount between currencies
     */
    public function convert(float $amount, string $fromCurrency, string $toCurrency, ?string $date = null): array {
        $rate = $this->getExchangeRate($fromCurrency, $toCurrency, $date);
        $convertedAmount = round($amount * $rate, 2);

        return [
            'original_amount' => $amount,
            'original_currency' => $fromCurrency,
            'converted_amount' => $convertedAmount,
            'target_currency' => $toCurrency,
            'exchange_rate' => $rate,
            'rate_date' => $date ?? date('Y-m-d')
        ];
    }

    /**
     * Get historical rates for a currency
     */
    public function getHistoricalRates(string $currency, string $startDate, string $endDate): array {
        $currency = strtoupper($currency);

        $stmt = $this->pdo->prepare("
            SELECT rate_date, rate
            FROM ecb_exchange_rates
            WHERE target_currency = ? AND rate_date BETWEEN ? AND ?
            ORDER BY rate_date ASC
        ");
        $stmt->execute([$currency, $startDate, $endDate]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get all latest rates
     */
    public function getLatestRates(): array {
        $stmt = $this->pdo->query("
            SELECT e.target_currency, e.rate, e.rate_date, s.name, s.symbol, s.decimal_places
            FROM ecb_exchange_rates e
            JOIN system_currencies s ON e.target_currency = s.code
            WHERE e.rate_date = (SELECT MAX(rate_date) FROM ecb_exchange_rates)
            ORDER BY e.target_currency
        ");

        $rates = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Add EUR as base
        array_unshift($rates, [
            'target_currency' => 'EUR',
            'rate' => 1.0,
            'rate_date' => $rates[0]['rate_date'] ?? date('Y-m-d'),
            'name' => 'Euro',
            'symbol' => '€',
            'decimal_places' => 2
        ]);

        return $rates;
    }

    /**
     * Format amount with currency
     */
    public function formatAmount(float $amount, string $currencyCode, string $locale = 'ro_RO'): string {
        $currency = $this->getCurrency($currencyCode);
        if (!$currency) {
            return number_format($amount, 2) . ' ' . $currencyCode;
        }

        $decimals = $currency['decimal_places'] ?? 2;
        $formatted = number_format($amount, $decimals, ',', '.');

        // Position symbol based on currency
        if (in_array($currencyCode, ['USD', 'GBP'])) {
            return $currency['symbol'] . $formatted;
        }
        return $formatted . ' ' . $currency['symbol'];
    }

    /**
     * Get company currency settings
     */
    public function getCompanyCurrency(string $companyId): array {
        $stmt = $this->pdo->prepare("
            SELECT default_currency, base_currency
            FROM companies WHERE id = ?
        ");
        $stmt->execute([$companyId]);
        $company = $stmt->fetch(PDO::FETCH_ASSOC);

        return [
            'default_currency' => $company['default_currency'] ?? 'RON',
            'base_currency' => $company['base_currency'] ?? 'RON'
        ];
    }

    /**
     * Update company currency settings
     */
    public function updateCompanyCurrency(string $companyId, string $defaultCurrency, ?string $baseCurrency = null): bool {
        $defaultCurrency = strtoupper($defaultCurrency);
        $baseCurrency = $baseCurrency ? strtoupper($baseCurrency) : $defaultCurrency;

        // Validate currencies
        if (!in_array($defaultCurrency, $this->supportedCurrencies)) {
            throw new Exception("Unsupported currency: $defaultCurrency");
        }
        if (!in_array($baseCurrency, $this->supportedCurrencies)) {
            throw new Exception("Unsupported currency: $baseCurrency");
        }

        $stmt = $this->pdo->prepare("
            UPDATE companies
            SET default_currency = ?, base_currency = ?, updated_at = NOW()
            WHERE id = ?
        ");

        return $stmt->execute([$defaultCurrency, $baseCurrency, $companyId]);
    }

    /**
     * Multi-currency report - convert all amounts to base currency
     */
    public function generateMultiCurrencyReport(string $companyId, array $transactions, string $reportCurrency = null): array {
        $companyCurrency = $this->getCompanyCurrency($companyId);
        $targetCurrency = $reportCurrency ?? $companyCurrency['base_currency'];

        $convertedTransactions = [];
        $totals = [
            'original' => [],
            'converted' => 0
        ];

        foreach ($transactions as $tx) {
            $currency = $tx['currency_code'] ?? $companyCurrency['default_currency'];
            $amount = floatval($tx['amount']);

            // Track original amounts by currency
            if (!isset($totals['original'][$currency])) {
                $totals['original'][$currency] = 0;
            }
            $totals['original'][$currency] += $amount;

            // Convert to target currency
            $converted = $this->convert($amount, $currency, $targetCurrency, $tx['date'] ?? null);

            $tx['converted_amount'] = $converted['converted_amount'];
            $tx['converted_currency'] = $targetCurrency;
            $tx['exchange_rate'] = $converted['exchange_rate'];

            $convertedTransactions[] = $tx;
            $totals['converted'] += $converted['converted_amount'];
        }

        return [
            'target_currency' => $targetCurrency,
            'transactions' => $convertedTransactions,
            'totals' => $totals,
            'rate_date' => date('Y-m-d')
        ];
    }

    /**
     * Check if rates need updating (older than 1 day)
     */
    public function ratesNeedUpdate(): bool {
        $stmt = $this->pdo->query("SELECT MAX(rate_date) as latest FROM ecb_exchange_rates");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$result['latest']) {
            return true;
        }

        $latestDate = new DateTime($result['latest']);
        $today = new DateTime();

        return $latestDate < $today->modify('-1 day');
    }

    /**
     * Auto-update rates if needed
     */
    public function ensureRatesUpdated(): array {
        if ($this->ratesNeedUpdate()) {
            return $this->fetchECBRates();
        }

        return ['status' => 'rates_current', 'message' => 'Exchange rates are up to date'];
    }
}
