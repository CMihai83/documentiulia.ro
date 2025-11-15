<?php
/**
 * Lege5 Web Scraper Service
 * Automated legislation updates from lege5.ro with rate limiting
 *
 * Features:
 * - Login authentication to lege5.ro
 * - Rate-limited scraping (configurable per day)
 * - Category-based legislation extraction
 * - Anti-bot detection (user agent rotation, delays)
 * - Automatic database updates
 * - Comprehensive logging
 */

require_once __DIR__ . '/../config/database.php';

class Lege5ScraperService {
    private $db;
    private $config;
    private $cookieFile;
    private $userAgents;
    private $baseUrl = 'https://lege5.ro';

    // Legislation categories to scrape
    private $categories = [
        'fiscal' => [
            'url' => '/gratuit/legislatie/legislatie-fiscala',
            'keywords' => ['tva', 'impozit', 'fiscal', 'cod fiscal', 'anaf']
        ],
        'accounting' => [
            'url' => '/gratuit/legislatie/contabilitate',
            'keywords' => ['contabil', 'bilant', 'raportare', 'registru']
        ],
        'labor' => [
            'url' => '/gratuit/legislatie/munca',
            'keywords' => ['munca', 'salariat', 'angajat', 'contract', 'revisal']
        ],
        'commercial' => [
            'url' => '/gratuit/legislatie/comercial',
            'keywords' => ['comercial', 'societate', 'srl', 'contract']
        ],
        'audit' => [
            'url' => '/gratuit/legislatie/audit',
            'keywords' => ['audit', 'control', 'revizie', 'ceccar']
        ]
    ];

    public function __construct() {
        $this->db = Database::getInstance();
        $this->loadConfig();
        $this->cookieFile = sys_get_temp_dir() . '/lege5_cookies_' . md5(__FILE__) . '.txt';

        // User agent rotation to avoid bot detection
        $this->userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
        ];
    }

    /**
     * Load scraper configuration from database
     */
    private function loadConfig() {
        try {
            $sql = "SELECT config_key, config_value FROM scraper_config";
            $results = $this->db->fetchAll($sql);

            $this->config = [];
            foreach ($results as $row) {
                $this->config[$row['config_key']] = $row['config_value'];
            }
        } catch (Exception $e) {
            error_log("Failed to load scraper config: " . $e->getMessage());
            // Fallback defaults
            $this->config = [
                'lege5_username' => 'loredana.ciuca@tmdfriction.com',
                'lege5_password' => 'tmdfriction',
                'scrape_rate_limit_per_day' => '3',
                'scrape_delay_seconds' => '30'
            ];
        }
    }

    /**
     * Check if scraping is allowed today (rate limiting)
     */
    public function canScrapeToday() {
        try {
            $sql = "SELECT can_scrape_today()";
            $result = $this->db->fetchOne($sql);
            return (bool)$result['can_scrape_today'];
        } catch (Exception $e) {
            error_log("Rate limit check failed: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Update rate limit counter
     */
    private function incrementRateLimit() {
        try {
            $sql = "INSERT INTO scraper_rate_limits (scrape_date, scrape_count, last_scrape_at)
                    VALUES (CURRENT_DATE, 1, NOW())
                    ON CONFLICT (scrape_date)
                    DO UPDATE SET
                        scrape_count = scraper_rate_limits.scrape_count + 1,
                        last_scrape_at = NOW()";

            $this->db->execute($sql);
        } catch (Exception $e) {
            error_log("Failed to increment rate limit: " . $e->getMessage());
        }
    }

    /**
     * Login to lege5.ro and maintain session
     */
    private function login() {
        $username = $this->config['lege5_username'];
        $password = $this->config['lege5_password'];

        // Create cookie file if doesn't exist
        if (!file_exists($this->cookieFile)) {
            touch($this->cookieFile);
        }

        $ch = curl_init();

        // First, get login page to extract CSRF token
        curl_setopt_array($ch, [
            CURLOPT_URL => $this->baseUrl . '/login',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_COOKIEJAR => $this->cookieFile,
            CURLOPT_COOKIEFILE => $this->cookieFile,
            CURLOPT_USERAGENT => $this->getRandomUserAgent(),
            CURLOPT_SSL_VERIFYPEER => false, // For testing - enable in production
            CURLOPT_TIMEOUT => 30
        ]);

        $loginPage = curl_exec($ch);

        if (curl_errno($ch)) {
            throw new Exception("Failed to load login page: " . curl_error($ch));
        }

        // Extract CSRF token if present
        $csrfToken = $this->extractCsrfToken($loginPage);

        // Prepare login data
        $postData = [
            'email' => $username,
            'password' => $password
        ];

        if ($csrfToken) {
            $postData['_token'] = $csrfToken;
        }

        // Submit login form
        curl_setopt_array($ch, [
            CURLOPT_URL => $this->baseUrl . '/login',
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query($postData),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_COOKIEJAR => $this->cookieFile,
            CURLOPT_COOKIEFILE => $this->cookieFile,
            CURLOPT_USERAGENT => $this->getRandomUserAgent()
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        curl_close($ch);

        // Check if login successful (should redirect to dashboard/home)
        if ($httpCode == 200 || $httpCode == 302) {
            error_log("Lege5 login successful");
            return true;
        } else {
            throw new Exception("Login failed with HTTP code: " . $httpCode);
        }
    }

    /**
     * Extract CSRF token from HTML
     */
    private function extractCsrfToken($html) {
        // Try to find CSRF token in meta tag or hidden input
        if (preg_match('/<meta name="csrf-token" content="([^"]+)"/', $html, $matches)) {
            return $matches[1];
        }

        if (preg_match('/<input[^>]+name="_token"[^>]+value="([^"]+)"/', $html, $matches)) {
            return $matches[1];
        }

        return null;
    }

    /**
     * Get random user agent to avoid detection
     */
    private function getRandomUserAgent() {
        return $this->userAgents[array_rand($this->userAgents)];
    }

    /**
     * Fetch legislation from a category
     */
    private function fetchCategoryLegislation($category, $categoryData) {
        $url = $this->baseUrl . $categoryData['url'];

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_COOKIEFILE => $this->cookieFile,
            CURLOPT_USERAGENT => $this->getRandomUserAgent(),
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_TIMEOUT => 60
        ]);

        $html = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode != 200) {
            throw new Exception("Failed to fetch category $category: HTTP $httpCode");
        }

        // Parse HTML to extract legislation articles
        $articles = $this->parseLegislationList($html, $category, $categoryData['keywords']);

        return $articles;
    }

    /**
     * Parse legislation list from HTML
     */
    private function parseLegislationList($html, $category, $keywords) {
        $articles = [];

        // Use DOMDocument to parse HTML
        $dom = new DOMDocument();
        @$dom->loadHTML(mb_convert_encoding($html, 'HTML-ENTITIES', 'UTF-8'));

        // Example parsing logic - adjust based on actual lege5.ro structure
        // This is a TEMPLATE - needs customization based on actual site structure

        $xpath = new DOMXPath($dom);

        // Try to find legislation links (common patterns)
        $linkQueries = [
            "//a[contains(@href, '/legislatie/')]",
            "//div[contains(@class, 'legislation')]//a",
            "//table//a[contains(@href, 'legea')]"
        ];

        foreach ($linkQueries as $query) {
            $nodes = $xpath->query($query);

            foreach ($nodes as $node) {
                $title = trim($node->textContent);
                $href = $node->getAttribute('href');

                // Filter by keywords
                $isRelevant = false;
                foreach ($keywords as $keyword) {
                    if (stripos($title, $keyword) !== false) {
                        $isRelevant = true;
                        break;
                    }
                }

                if ($isRelevant && strlen($title) > 10) {
                    $articles[] = [
                        'title' => $title,
                        'url' => $this->makeAbsoluteUrl($href),
                        'category' => $category
                    ];
                }
            }

            // Limit results
            if (count($articles) >= 20) {
                break;
            }
        }

        return $articles;
    }

    /**
     * Fetch full article content
     */
    private function fetchArticleContent($url) {
        // Delay to avoid rate limiting
        sleep((int)$this->config['scrape_delay_seconds']);

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_COOKIEFILE => $this->cookieFile,
            CURLOPT_USERAGENT => $this->getRandomUserAgent(),
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_TIMEOUT => 60
        ]);

        $html = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode != 200) {
            error_log("Failed to fetch article from $url: HTTP $httpCode");
            return null;
        }

        return $this->parseArticleContent($html);
    }

    /**
     * Parse article content from HTML
     */
    private function parseArticleContent($html) {
        $dom = new DOMDocument();
        @$dom->loadHTML(mb_convert_encoding($html, 'HTML-ENTITIES', 'UTF-8'));

        $xpath = new DOMXPath($dom);

        // Extract article code (e.g., "Legea 227/2015")
        $codePatterns = [
            "//h1",
            "//div[contains(@class, 'title')]",
            "//span[contains(@class, 'code')]"
        ];

        $code = '';
        foreach ($codePatterns as $pattern) {
            $nodes = $xpath->query($pattern);
            if ($nodes->length > 0) {
                $code = trim($nodes->item(0)->textContent);
                break;
            }
        }

        // Extract full text content
        $contentPatterns = [
            "//div[contains(@class, 'content')]",
            "//div[contains(@class, 'article-body')]",
            "//article"
        ];

        $fullText = '';
        foreach ($contentPatterns as $pattern) {
            $nodes = $xpath->query($pattern);
            if ($nodes->length > 0) {
                $fullText = trim($nodes->item(0)->textContent);
                break;
            }
        }

        // Extract effective date
        $effectiveDate = $this->extractDate($html);

        return [
            'code' => $code,
            'full_text' => $fullText,
            'effective_date' => $effectiveDate
        ];
    }

    /**
     * Extract date from HTML content
     */
    private function extractDate($html) {
        // Look for date patterns (e.g., "01.01.2025", "2025-01-01")
        if (preg_match('/\b(\d{2})\.(\d{2})\.(\d{4})\b/', $html, $matches)) {
            return $matches[3] . '-' . $matches[2] . '-' . $matches[1];
        }

        if (preg_match('/\b(\d{4})-(\d{2})-(\d{2})\b/', $html, $matches)) {
            return $matches[0];
        }

        return null;
    }

    /**
     * Make relative URL absolute
     */
    private function makeAbsoluteUrl($url) {
        if (strpos($url, 'http') === 0) {
            return $url;
        }

        if (strpos($url, '/') === 0) {
            return $this->baseUrl . $url;
        }

        return $this->baseUrl . '/' . $url;
    }

    /**
     * Save or update legislation in database
     */
    private function saveLegislation($article, $content, $category) {
        try {
            // Check if article exists
            $sql = "SELECT id, version FROM fiscal_legislation
                    WHERE code = :code
                    ORDER BY version DESC LIMIT 1";

            $existing = $this->db->fetchOne($sql, ['code' => $content['code']]);

            if ($existing) {
                // Check if content changed
                $sqlCheck = "SELECT full_text FROM fiscal_legislation WHERE id = :id";
                $currentContent = $this->db->fetchOne($sqlCheck, ['id' => $existing['id']]);

                if ($currentContent['full_text'] === $content['full_text']) {
                    // No change
                    return ['action' => 'skipped', 'id' => $existing['id']];
                }

                // Create new version
                $newVersion = (int)$existing['version'] + 1;

                $sql = "INSERT INTO fiscal_legislation
                        (code, title, category, full_text, version, source_url, effective_date, last_updated)
                        VALUES (:code, :title, :category, :full_text, :version, :source_url, :effective_date, NOW())
                        RETURNING id";

                $result = $this->db->fetchOne($sql, [
                    'code' => $content['code'],
                    'title' => $article['title'],
                    'category' => $category,
                    'full_text' => $content['full_text'],
                    'version' => $newVersion,
                    'source_url' => $article['url'],
                    'effective_date' => $content['effective_date']
                ]);

                return ['action' => 'updated', 'id' => $result['id'], 'version' => $newVersion];
            } else {
                // Insert new article
                $sql = "INSERT INTO fiscal_legislation
                        (code, title, category, summary, full_text, source_url, effective_date, last_updated)
                        VALUES (:code, :title, :category, :summary, :full_text, :source_url, :effective_date, NOW())
                        RETURNING id";

                $summary = mb_substr($content['full_text'], 0, 500) . '...';

                $result = $this->db->fetchOne($sql, [
                    'code' => $content['code'],
                    'title' => $article['title'],
                    'category' => $category,
                    'summary' => $summary,
                    'full_text' => $content['full_text'],
                    'source_url' => $article['url'],
                    'effective_date' => $content['effective_date']
                ]);

                return ['action' => 'inserted', 'id' => $result['id']];
            }
        } catch (Exception $e) {
            error_log("Failed to save legislation: " . $e->getMessage());
            return ['action' => 'error', 'error' => $e->getMessage()];
        }
    }

    /**
     * Log scraping activity
     */
    private function logScrapeActivity($sourceUrl, $stats, $status = 'success', $error = null) {
        try {
            $sql = "INSERT INTO legislation_updates_log
                    (source_url, articles_scraped, articles_updated, articles_new, status, error_message, scrape_duration_seconds)
                    VALUES (:url, :scraped, :updated, :new, :status, :error, :duration)";

            $this->db->execute($sql, [
                'url' => $sourceUrl,
                'scraped' => $stats['scraped'] ?? 0,
                'updated' => $stats['updated'] ?? 0,
                'new' => $stats['new'] ?? 0,
                'status' => $status,
                'error' => $error,
                'duration' => $stats['duration'] ?? 0
            ]);
        } catch (Exception $e) {
            error_log("Failed to log scrape activity: " . $e->getMessage());
        }
    }

    /**
     * Main scraping function
     */
    public function scrape($category = null) {
        $startTime = time();

        // Check rate limit
        if (!$this->canScrapeToday()) {
            return [
                'success' => false,
                'message' => 'Daily scrape limit reached. Try again tomorrow.',
                'rate_limit_hit' => true
            ];
        }

        try {
            // Login to lege5.ro
            $this->login();

            $stats = [
                'scraped' => 0,
                'updated' => 0,
                'new' => 0,
                'skipped' => 0,
                'errors' => 0
            ];

            // Determine which categories to scrape
            $categoriesToScrape = $category
                ? [$category => $this->categories[$category]]
                : $this->categories;

            foreach ($categoriesToScrape as $cat => $catData) {
                error_log("Scraping category: $cat");

                try {
                    // Fetch legislation list
                    $articles = $this->fetchCategoryLegislation($cat, $catData);
                    error_log("Found " . count($articles) . " articles in $cat");

                    foreach ($articles as $article) {
                        try {
                            // Fetch full content
                            $content = $this->fetchArticleContent($article['url']);

                            if ($content && !empty($content['full_text'])) {
                                // Save to database
                                $result = $this->saveLegislation($article, $content, $cat);

                                $stats['scraped']++;

                                if ($result['action'] === 'inserted') {
                                    $stats['new']++;
                                } elseif ($result['action'] === 'updated') {
                                    $stats['updated']++;
                                } elseif ($result['action'] === 'skipped') {
                                    $stats['skipped']++;
                                } elseif ($result['action'] === 'error') {
                                    $stats['errors']++;
                                }
                            }
                        } catch (Exception $e) {
                            error_log("Error processing article: " . $e->getMessage());
                            $stats['errors']++;
                        }
                    }
                } catch (Exception $e) {
                    error_log("Error scraping category $cat: " . $e->getMessage());
                }
            }

            $stats['duration'] = time() - $startTime;

            // Log activity
            $this->logScrapeActivity($this->baseUrl, $stats);

            // Increment rate limit
            $this->incrementRateLimit();

            return [
                'success' => true,
                'message' => 'Scraping completed successfully',
                'stats' => $stats
            ];

        } catch (Exception $e) {
            $stats['duration'] = time() - $startTime;
            $this->logScrapeActivity($this->baseUrl, $stats, 'failed', $e->getMessage());

            return [
                'success' => false,
                'message' => 'Scraping failed: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Test scraper connection (without saving to DB)
     */
    public function testConnection() {
        try {
            $this->login();
            return [
                'success' => true,
                'message' => 'Connection successful. Logged in to lege5.ro'
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Connection failed: ' . $e->getMessage()
            ];
        }
    }
}
