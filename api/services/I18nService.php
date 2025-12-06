<?php
/**
 * Internationalization Service
 * Handles multi-language support for the platform
 */

class I18nService
{
    private static ?I18nService $instance = null;
    private PDO $db;
    private string $currentLang = 'ro';
    private array $translations = [];
    private array $supportedLanguages = ['ro', 'en', 'de', 'it', 'es', 'fr'];
    private string $defaultLanguage = 'ro';

    private function __construct()
    {
        require_once __DIR__ . '/../config/Database.php';
        $this->db = Database::getInstance()->getConnection();
    }

    public static function getInstance(): I18nService
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Set current language from request headers or parameter
     */
    public function setLanguageFromRequest(): string
    {
        // Check query parameter first
        if (!empty($_GET['lang'])) {
            $lang = substr($_GET['lang'], 0, 2);
            if (in_array($lang, $this->supportedLanguages)) {
                $this->currentLang = $lang;
                return $this->currentLang;
            }
        }

        // Check Accept-Language header
        $acceptLang = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '';
        if (!empty($acceptLang)) {
            $lang = substr($acceptLang, 0, 2);
            if (in_array($lang, $this->supportedLanguages)) {
                $this->currentLang = $lang;
                return $this->currentLang;
            }
        }

        return $this->currentLang;
    }

    /**
     * Set language explicitly
     */
    public function setLanguage(string $lang): void
    {
        if (in_array($lang, $this->supportedLanguages)) {
            $this->currentLang = $lang;
        }
    }

    /**
     * Get current language
     */
    public function getLanguage(): string
    {
        return $this->currentLang;
    }

    /**
     * Get all supported languages with details
     */
    public function getSupportedLanguages(): array
    {
        return [
            'ro' => [
                'code' => 'ro',
                'name' => 'Română',
                'native_name' => 'Română',
                'flag' => '🇷🇴',
                'rtl' => false
            ],
            'en' => [
                'code' => 'en',
                'name' => 'English',
                'native_name' => 'English',
                'flag' => '🇬🇧',
                'rtl' => false
            ],
            'de' => [
                'code' => 'de',
                'name' => 'German',
                'native_name' => 'Deutsch',
                'flag' => '🇩🇪',
                'rtl' => false
            ],
            'it' => [
                'code' => 'it',
                'name' => 'Italian',
                'native_name' => 'Italiano',
                'flag' => '🇮🇹',
                'rtl' => false
            ],
            'es' => [
                'code' => 'es',
                'name' => 'Spanish',
                'native_name' => 'Español',
                'flag' => '🇪🇸',
                'rtl' => false
            ],
            'fr' => [
                'code' => 'fr',
                'name' => 'French',
                'native_name' => 'Français',
                'flag' => '🇫🇷',
                'rtl' => false
            ]
        ];
    }

    /**
     * Load translations for a namespace
     */
    public function loadNamespace(string $namespace): array
    {
        $cacheKey = "{$this->currentLang}:{$namespace}";

        if (isset($this->translations[$cacheKey])) {
            return $this->translations[$cacheKey];
        }

        // Try to load from database
        try {
            $stmt = $this->db->prepare("
                SELECT translation_key, translation_value
                FROM translations
                WHERE language_code = :lang AND namespace = :namespace
            ");
            $stmt->execute([
                ':lang' => $this->currentLang,
                ':namespace' => $namespace
            ]);

            $translations = [];
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $translations[$row['translation_key']] = $row['translation_value'];
            }

            $this->translations[$cacheKey] = $translations;
            return $translations;
        } catch (Exception $e) {
            // If database table doesn't exist, load from file
            return $this->loadFromFile($namespace);
        }
    }

    /**
     * Load translations from JSON file
     */
    private function loadFromFile(string $namespace): array
    {
        $filePath = __DIR__ . "/../i18n/{$this->currentLang}/{$namespace}.json";

        if (file_exists($filePath)) {
            $content = file_get_contents($filePath);
            return json_decode($content, true) ?? [];
        }

        // Fallback to default language
        $fallbackPath = __DIR__ . "/../i18n/{$this->defaultLanguage}/{$namespace}.json";
        if (file_exists($fallbackPath)) {
            $content = file_get_contents($fallbackPath);
            return json_decode($content, true) ?? [];
        }

        return [];
    }

    /**
     * Translate a key
     */
    public function t(string $key, array $params = [], ?string $namespace = null): string
    {
        // Parse namespace from key if not provided (e.g., "common.save" -> namespace: common, key: save)
        if ($namespace === null && strpos($key, '.') !== false) {
            $parts = explode('.', $key, 2);
            $namespace = $parts[0];
            $key = $parts[1];
        }

        $namespace = $namespace ?? 'common';
        $translations = $this->loadNamespace($namespace);

        // Support nested keys (e.g., "buttons.save")
        $value = $this->getNestedValue($translations, $key);

        if ($value === null) {
            // Return key if translation not found
            return $key;
        }

        // Replace parameters
        foreach ($params as $paramKey => $paramValue) {
            $value = str_replace("{{$paramKey}}", $paramValue, $value);
        }

        return $value;
    }

    /**
     * Get nested value from array using dot notation
     */
    private function getNestedValue(array $array, string $key)
    {
        $keys = explode('.', $key);
        $value = $array;

        foreach ($keys as $k) {
            if (!is_array($value) || !isset($value[$k])) {
                return null;
            }
            $value = $value[$k];
        }

        return $value;
    }

    /**
     * Get all translations for a namespace (for frontend)
     */
    public function getNamespaceTranslations(string $namespace): array
    {
        return $this->loadNamespace($namespace);
    }

    /**
     * Get all translations for multiple namespaces
     */
    public function getAllTranslations(array $namespaces): array
    {
        $result = [];
        foreach ($namespaces as $namespace) {
            $result[$namespace] = $this->loadNamespace($namespace);
        }
        return $result;
    }

    /**
     * Format date according to locale
     */
    public function formatDate(string $date, string $format = 'medium'): string
    {
        $timestamp = strtotime($date);

        switch ($this->currentLang) {
            case 'ro':
                $formats = [
                    'short' => 'd.m.Y',
                    'medium' => 'd M Y',
                    'long' => 'd MMMM Y',
                    'full' => 'EEEE, d MMMM Y'
                ];
                break;
            case 'de':
                $formats = [
                    'short' => 'd.m.Y',
                    'medium' => 'd. M Y',
                    'long' => 'd. MMMM Y',
                    'full' => 'EEEE, d. MMMM Y'
                ];
                break;
            default:
                $formats = [
                    'short' => 'm/d/Y',
                    'medium' => 'M d, Y',
                    'long' => 'MMMM d, Y',
                    'full' => 'EEEE, MMMM d, Y'
                ];
        }

        return date($formats[$format] ?? $formats['medium'], $timestamp);
    }

    /**
     * Format currency according to locale
     */
    public function formatCurrency(float $amount, string $currency = 'RON'): string
    {
        $symbols = [
            'RON' => 'lei',
            'EUR' => '€',
            'USD' => '$',
            'GBP' => '£'
        ];

        $symbol = $symbols[$currency] ?? $currency;

        switch ($this->currentLang) {
            case 'ro':
                return number_format($amount, 2, ',', '.') . ' ' . $symbol;
            case 'de':
                return number_format($amount, 2, ',', '.') . ' ' . $symbol;
            case 'en':
            default:
                if (in_array($currency, ['EUR', 'USD', 'GBP'])) {
                    return $symbol . number_format($amount, 2, '.', ',');
                }
                return number_format($amount, 2, '.', ',') . ' ' . $symbol;
        }
    }

    /**
     * Format number according to locale
     */
    public function formatNumber(float $number, int $decimals = 0): string
    {
        switch ($this->currentLang) {
            case 'ro':
            case 'de':
            case 'it':
            case 'es':
            case 'fr':
                return number_format($number, $decimals, ',', '.');
            case 'en':
            default:
                return number_format($number, $decimals, '.', ',');
        }
    }

    /**
     * Get locale-specific settings
     */
    public function getLocaleSettings(): array
    {
        $settings = [
            'ro' => [
                'date_format' => 'DD.MM.YYYY',
                'time_format' => 'HH:mm',
                'first_day_of_week' => 1, // Monday
                'decimal_separator' => ',',
                'thousands_separator' => '.',
                'currency_position' => 'after',
                'currency' => 'RON',
                'timezone' => 'Europe/Bucharest'
            ],
            'en' => [
                'date_format' => 'MM/DD/YYYY',
                'time_format' => 'h:mm A',
                'first_day_of_week' => 0, // Sunday
                'decimal_separator' => '.',
                'thousands_separator' => ',',
                'currency_position' => 'before',
                'currency' => 'USD',
                'timezone' => 'UTC'
            ],
            'de' => [
                'date_format' => 'DD.MM.YYYY',
                'time_format' => 'HH:mm',
                'first_day_of_week' => 1,
                'decimal_separator' => ',',
                'thousands_separator' => '.',
                'currency_position' => 'after',
                'currency' => 'EUR',
                'timezone' => 'Europe/Berlin'
            ],
            'it' => [
                'date_format' => 'DD/MM/YYYY',
                'time_format' => 'HH:mm',
                'first_day_of_week' => 1,
                'decimal_separator' => ',',
                'thousands_separator' => '.',
                'currency_position' => 'after',
                'currency' => 'EUR',
                'timezone' => 'Europe/Rome'
            ],
            'es' => [
                'date_format' => 'DD/MM/YYYY',
                'time_format' => 'HH:mm',
                'first_day_of_week' => 1,
                'decimal_separator' => ',',
                'thousands_separator' => '.',
                'currency_position' => 'after',
                'currency' => 'EUR',
                'timezone' => 'Europe/Madrid'
            ],
            'fr' => [
                'date_format' => 'DD/MM/YYYY',
                'time_format' => 'HH:mm',
                'first_day_of_week' => 1,
                'decimal_separator' => ',',
                'thousands_separator' => ' ',
                'currency_position' => 'after',
                'currency' => 'EUR',
                'timezone' => 'Europe/Paris'
            ]
        ];

        return $settings[$this->currentLang] ?? $settings['en'];
    }
}
