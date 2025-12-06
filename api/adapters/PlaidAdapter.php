<?php
/**
 * Plaid Bank Integration Adapter
 *
 * Handles bank connections via Plaid API
 * Supports US, Canada, UK, and EU banks
 *
 * SETUP:
 * 1. Create Plaid account at https://dashboard.plaid.com
 * 2. Set environment variables:
 *    - PLAID_CLIENT_ID
 *    - PLAID_SECRET
 *    - PLAID_ENV (sandbox, development, production)
 */

class PlaidAdapter
{
    private $clientId;
    private $secret;
    private $environment;
    private $baseUrl;

    public function __construct()
    {
        $this->clientId = getenv('PLAID_CLIENT_ID') ?: $_ENV['PLAID_CLIENT_ID'] ?? null;
        $this->secret = getenv('PLAID_SECRET') ?: $_ENV['PLAID_SECRET'] ?? null;
        $this->environment = getenv('PLAID_ENV') ?: $_ENV['PLAID_ENV'] ?? 'sandbox';

        $this->baseUrl = match ($this->environment) {
            'production' => 'https://production.plaid.com',
            'development' => 'https://development.plaid.com',
            default => 'https://sandbox.plaid.com'
        };
    }

    /**
     * Check if Plaid is configured
     */
    public function isConfigured(): bool
    {
        return !empty($this->clientId) && !empty($this->secret);
    }

    /**
     * Create a Link token for Plaid Link initialization
     *
     * @param string $userId User identifier
     * @param string $clientName Your app name
     * @param array $products Products to enable (transactions, auth, identity, etc.)
     * @param array $countryCodes Country codes (US, CA, GB, ES, FR, IE, NL, DE, RO, etc.)
     * @return array Link token data
     */
    public function createLinkToken(
        string $userId,
        string $clientName = 'Documentiulia',
        array $products = ['transactions'],
        array $countryCodes = ['RO', 'US', 'GB']
    ): array {
        $this->ensureConfigured();

        $response = $this->request('/link/token/create', [
            'client_id' => $this->clientId,
            'secret' => $this->secret,
            'user' => ['client_user_id' => $userId],
            'client_name' => $clientName,
            'products' => $products,
            'country_codes' => $countryCodes,
            'language' => 'en'
        ]);

        return [
            'link_token' => $response['link_token'],
            'expiration' => $response['expiration'],
            'request_id' => $response['request_id']
        ];
    }

    /**
     * Exchange public token for access token
     *
     * @param string $publicToken Public token from Plaid Link
     * @return array Access token data
     */
    public function exchangePublicToken(string $publicToken): array
    {
        $this->ensureConfigured();

        $response = $this->request('/item/public_token/exchange', [
            'client_id' => $this->clientId,
            'secret' => $this->secret,
            'public_token' => $publicToken
        ]);

        return [
            'access_token' => $response['access_token'],
            'item_id' => $response['item_id'],
            'request_id' => $response['request_id']
        ];
    }

    /**
     * Get account information
     *
     * @param string $accessToken Access token
     * @return array Account details
     */
    public function getAccounts(string $accessToken): array
    {
        $this->ensureConfigured();

        $response = $this->request('/accounts/get', [
            'client_id' => $this->clientId,
            'secret' => $this->secret,
            'access_token' => $accessToken
        ]);

        $accounts = [];
        foreach ($response['accounts'] as $account) {
            $accounts[] = [
                'id' => $account['account_id'],
                'name' => $account['name'],
                'official_name' => $account['official_name'] ?? $account['name'],
                'type' => $account['type'],
                'subtype' => $account['subtype'],
                'mask' => $account['mask'],
                'currency' => $account['balances']['iso_currency_code'] ?? 'USD',
                'balance' => [
                    'available' => $account['balances']['available'],
                    'current' => $account['balances']['current'],
                    'limit' => $account['balances']['limit']
                ]
            ];
        }

        return [
            'accounts' => $accounts,
            'item' => $response['item'],
            'request_id' => $response['request_id']
        ];
    }

    /**
     * Get account balance
     *
     * @param string $accessToken Access token
     * @param array $accountIds Optional specific account IDs
     * @return array Balance data
     */
    public function getBalance(string $accessToken, array $accountIds = []): array
    {
        $this->ensureConfigured();

        $payload = [
            'client_id' => $this->clientId,
            'secret' => $this->secret,
            'access_token' => $accessToken
        ];

        if (!empty($accountIds)) {
            $payload['options'] = ['account_ids' => $accountIds];
        }

        $response = $this->request('/accounts/balance/get', $payload);

        $balances = [];
        foreach ($response['accounts'] as $account) {
            $balances[] = [
                'account_id' => $account['account_id'],
                'name' => $account['name'],
                'available' => $account['balances']['available'],
                'current' => $account['balances']['current'],
                'currency' => $account['balances']['iso_currency_code'] ?? 'USD',
                'date' => date('Y-m-d')
            ];
        }

        return [
            'balances' => $balances,
            'request_id' => $response['request_id']
        ];
    }

    /**
     * Get transactions
     *
     * @param string $accessToken Access token
     * @param string $startDate Start date (YYYY-MM-DD)
     * @param string $endDate End date (YYYY-MM-DD)
     * @param array $accountIds Optional specific account IDs
     * @return array Transactions
     */
    public function getTransactions(
        string $accessToken,
        string $startDate,
        string $endDate,
        array $accountIds = []
    ): array {
        $this->ensureConfigured();

        $payload = [
            'client_id' => $this->clientId,
            'secret' => $this->secret,
            'access_token' => $accessToken,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'options' => [
                'count' => 500,
                'offset' => 0
            ]
        ];

        if (!empty($accountIds)) {
            $payload['options']['account_ids'] = $accountIds;
        }

        $response = $this->request('/transactions/get', $payload);

        $transactions = [];
        foreach ($response['transactions'] as $tx) {
            $transactions[] = [
                'id' => $tx['transaction_id'],
                'account_id' => $tx['account_id'],
                'date' => $tx['date'],
                'datetime' => $tx['datetime'] ?? null,
                'name' => $tx['name'],
                'merchant_name' => $tx['merchant_name'] ?? null,
                'amount' => $tx['amount'],
                'currency' => $tx['iso_currency_code'] ?? 'USD',
                'category' => $tx['category'] ?? [],
                'category_id' => $tx['category_id'] ?? null,
                'pending' => $tx['pending'],
                'payment_channel' => $tx['payment_channel'] ?? null,
                'location' => $tx['location'] ?? null
            ];
        }

        return [
            'transactions' => $transactions,
            'total_transactions' => $response['total_transactions'],
            'accounts' => $response['accounts'],
            'request_id' => $response['request_id']
        ];
    }

    /**
     * Sync transactions (incremental)
     *
     * @param string $accessToken Access token
     * @param string|null $cursor Pagination cursor
     * @return array Synced transactions
     */
    public function syncTransactions(string $accessToken, ?string $cursor = null): array
    {
        $this->ensureConfigured();

        $payload = [
            'client_id' => $this->clientId,
            'secret' => $this->secret,
            'access_token' => $accessToken
        ];

        if ($cursor) {
            $payload['cursor'] = $cursor;
        }

        $response = $this->request('/transactions/sync', $payload);

        return [
            'added' => $response['added'] ?? [],
            'modified' => $response['modified'] ?? [],
            'removed' => $response['removed'] ?? [],
            'next_cursor' => $response['next_cursor'],
            'has_more' => $response['has_more'],
            'request_id' => $response['request_id']
        ];
    }

    /**
     * Get institution details
     *
     * @param string $institutionId Institution ID
     * @param array $countryCodes Country codes
     * @return array Institution details
     */
    public function getInstitution(string $institutionId, array $countryCodes = ['RO', 'US']): array
    {
        $this->ensureConfigured();

        $response = $this->request('/institutions/get_by_id', [
            'client_id' => $this->clientId,
            'secret' => $this->secret,
            'institution_id' => $institutionId,
            'country_codes' => $countryCodes
        ]);

        return [
            'id' => $response['institution']['institution_id'],
            'name' => $response['institution']['name'],
            'url' => $response['institution']['url'] ?? null,
            'logo' => $response['institution']['logo'] ?? null,
            'primary_color' => $response['institution']['primary_color'] ?? null,
            'country_codes' => $response['institution']['country_codes'],
            'products' => $response['institution']['products']
        ];
    }

    /**
     * Search institutions
     *
     * @param string $query Search query
     * @param array $countryCodes Country codes
     * @return array List of institutions
     */
    public function searchInstitutions(string $query, array $countryCodes = ['RO', 'US']): array
    {
        $this->ensureConfigured();

        $response = $this->request('/institutions/search', [
            'client_id' => $this->clientId,
            'secret' => $this->secret,
            'query' => $query,
            'country_codes' => $countryCodes,
            'products' => ['transactions']
        ]);

        $institutions = [];
        foreach ($response['institutions'] as $inst) {
            $institutions[] = [
                'id' => $inst['institution_id'],
                'name' => $inst['name'],
                'logo' => $inst['logo'] ?? null,
                'url' => $inst['url'] ?? null,
                'country_codes' => $inst['country_codes']
            ];
        }

        return $institutions;
    }

    /**
     * Remove item (disconnect)
     *
     * @param string $accessToken Access token
     * @return bool Success
     */
    public function removeItem(string $accessToken): bool
    {
        $this->ensureConfigured();

        try {
            $this->request('/item/remove', [
                'client_id' => $this->clientId,
                'secret' => $this->secret,
                'access_token' => $accessToken
            ]);
            return true;
        } catch (Exception $e) {
            error_log("PlaidAdapter::removeItem Error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get item status
     *
     * @param string $accessToken Access token
     * @return array Item status
     */
    public function getItemStatus(string $accessToken): array
    {
        $this->ensureConfigured();

        $response = $this->request('/item/get', [
            'client_id' => $this->clientId,
            'secret' => $this->secret,
            'access_token' => $accessToken
        ]);

        return [
            'item_id' => $response['item']['item_id'],
            'institution_id' => $response['item']['institution_id'],
            'consent_expiration' => $response['item']['consent_expiration_time'] ?? null,
            'update_type' => $response['item']['update_type'],
            'error' => $response['item']['error'] ?? null,
            'available_products' => $response['item']['available_products'],
            'billed_products' => $response['item']['billed_products']
        ];
    }

    /**
     * Make API request
     */
    private function request(string $endpoint, array $data): array
    {
        $url = $this->baseUrl . $endpoint;

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Plaid-Version: 2020-09-14'
            ],
            CURLOPT_TIMEOUT => 30
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new Exception("Plaid API request failed: $error");
        }

        $result = json_decode($response, true);

        if ($httpCode >= 400) {
            $errorMsg = $result['error_message'] ?? 'Unknown error';
            $errorCode = $result['error_code'] ?? 'UNKNOWN';
            throw new Exception("Plaid API error ($errorCode): $errorMsg");
        }

        return $result;
    }

    private function ensureConfigured(): void
    {
        if (!$this->isConfigured()) {
            throw new Exception('Plaid is not configured. Set PLAID_CLIENT_ID and PLAID_SECRET environment variables.');
        }
    }
}
