<?php
/**
 * Nordigen (GoCardless) Open Banking Adapter
 *
 * Free open banking API integration for PSD2-compliant bank access
 * Documentation: https://nordigen.com/en/account_information_docpage/integration/quickstart_guide/
 */

require_once __DIR__ . '/BankProviderAdapter.php';

class NordigenAdapter implements BankProviderAdapter
{
    private $apiBaseUrl = 'https://ob.nordigen.com/api/v2';
    private $secretId;
    private $secretKey;
    private $accessToken;
    private $tokenExpiresAt;

    public function __construct()
    {
        // Load credentials from environment
        $this->secretId = getenv('NORDIGEN_SECRET_ID') ?: '';
        $this->secretKey = getenv('NORDIGEN_SECRET_KEY') ?: '';

        if (empty($this->secretId) || empty($this->secretKey)) {
            error_log("Nordigen credentials not configured in environment");
        }
    }

    /**
     * Get or refresh access token
     */
    private function getAccessToken(): string
    {
        // Return cached token if still valid
        if ($this->accessToken && $this->tokenExpiresAt && time() < $this->tokenExpiresAt) {
            return $this->accessToken;
        }

        // Request new token
        $response = $this->makeRequest('POST', '/token/new/', [
            'secret_id' => $this->secretId,
            'secret_key' => $this->secretKey
        ]);

        $this->accessToken = $response['access'];
        $this->tokenExpiresAt = time() + $response['access_expires']; // Typically 86400 seconds (24h)

        return $this->accessToken;
    }

    /**
     * Make HTTP request to Nordigen API
     */
    private function makeRequest(string $method, string $endpoint, array $data = null, bool $requiresAuth = false): array
    {
        $url = $this->apiBaseUrl . $endpoint;
        $headers = ['Content-Type: application/json'];

        if ($requiresAuth) {
            $token = $this->getAccessToken();
            $headers[] = "Authorization: Bearer {$token}";
        }

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);

        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            if ($data) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            }
        } elseif ($method === 'PUT') {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
            if ($data) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            }
        } elseif ($method === 'DELETE') {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        if (curl_errno($ch)) {
            $error = curl_error($ch);
            curl_close($ch);
            throw new Exception("Nordigen API request failed: {$error}");
        }

        curl_close($ch);

        if ($httpCode >= 400) {
            error_log("Nordigen API error {$httpCode}: " . $response);
            throw new Exception("Nordigen API returned error {$httpCode}");
        }

        return json_decode($response, true) ?? [];
    }

    /**
     * Get list of supported institutions/banks
     */
    public function getInstitutions(string $country = 'RO'): array
    {
        $response = $this->makeRequest('GET', "/institutions/?country={$country}", null, true);

        $institutions = [];
        foreach ($response as $institution) {
            $institutions[] = [
                'id' => $institution['id'],
                'name' => $institution['name'],
                'bic' => $institution['bic'] ?? null,
                'logo' => $institution['logo'] ?? null,
                'countries' => $institution['countries'] ?? [],
                'transaction_total_days' => $institution['transaction_total_days'] ?? 90
            ];
        }

        return $institutions;
    }

    /**
     * Initiate bank connection flow
     */
    public function createConnection(string $institutionId, string $redirectUrl, string $userId): array
    {
        $data = [
            'redirect' => $redirectUrl,
            'institution_id' => $institutionId,
            'reference' => 'user_' . $userId, // User reference for tracking
            'agreement' => null, // Will use default agreement (90 days access)
            'user_language' => 'RO'
        ];

        $response = $this->makeRequest('POST', '/requisitions/', $data, true);

        return [
            'requisition_id' => $response['id'],
            'auth_url' => $response['link'],
            'status' => $response['status'] // 'CR' = created
        ];
    }

    /**
     * Complete connection after user authorization
     */
    public function completeConnection(string $requisitionId): array
    {
        // Get requisition status
        $requisition = $this->makeRequest('GET', "/requisitions/{$requisitionId}/", null, true);

        if ($requisition['status'] !== 'LN') { // LN = linked
            throw new Exception("Requisition not linked. Status: {$requisition['status']}");
        }

        // Get account IDs from requisition
        $accountIds = $requisition['accounts'] ?? [];

        if (empty($accountIds)) {
            throw new Exception("No accounts found in requisition");
        }

        // Nordigen doesn't use traditional access/refresh tokens
        // Access is granted via the requisition itself
        return [
            'requisition_id' => $requisition['id'],
            'account_ids' => $accountIds,
            'institution_id' => $requisition['institution_id'],
            'status' => $requisition['status'],
            'access_valid_days' => 90, // PSD2 standard
            'expires_at' => date('Y-m-d H:i:s', strtotime('+90 days'))
        ];
    }

    /**
     * Get account details
     */
    public function getAccountDetails(string $accountId): array
    {
        $response = $this->makeRequest('GET', "/accounts/{$accountId}/details/", null, true);

        $account = $response['account'] ?? [];

        return [
            'id' => $accountId,
            'iban' => $account['iban'] ?? null,
            'name' => $account['name'] ?? $account['product'] ?? 'Unknown Account',
            'currency' => $account['currency'] ?? 'RON',
            'type' => $this->mapAccountType($account['cashAccountType'] ?? 'CACC'),
            'owner_name' => $account['ownerName'] ?? null,
            'bic' => $account['bic'] ?? null
        ];
    }

    /**
     * Get account balance
     */
    public function getBalance(string $accountId): array
    {
        $response = $this->makeRequest('GET', "/accounts/{$accountId}/balances/", null, true);

        $balances = $response['balances'] ?? [];

        // Find the most relevant balance (closingBooked or interimAvailable)
        $balance = null;
        foreach ($balances as $bal) {
            if ($bal['balanceType'] === 'closingBooked' || $bal['balanceType'] === 'interimAvailable') {
                $balance = $bal;
                break;
            }
        }

        if (!$balance) {
            $balance = $balances[0] ?? ['balanceAmount' => ['amount' => '0', 'currency' => 'RON']];
        }

        return [
            'amount' => (float)$balance['balanceAmount']['amount'],
            'currency' => $balance['balanceAmount']['currency'],
            'type' => $balance['balanceType'],
            'date' => $balance['referenceDate'] ?? date('Y-m-d')
        ];
    }

    /**
     * Get account transactions
     */
    public function getTransactions(string $accountId, string $fromDate, string $toDate): array
    {
        $response = $this->makeRequest(
            'GET',
            "/accounts/{$accountId}/transactions/?date_from={$fromDate}&date_to={$toDate}",
            null,
            true
        );

        $transactions = [];
        $rawTransactions = array_merge(
            $response['transactions']['booked'] ?? [],
            $response['transactions']['pending'] ?? []
        );

        foreach ($rawTransactions as $transaction) {
            $transactions[] = $this->normalizeTransaction($transaction);
        }

        return $transactions;
    }

    /**
     * Refresh expired access token
     * Note: Nordigen uses requisition-based access, not refresh tokens
     */
    public function refreshToken(string $refreshToken): array
    {
        // Nordigen doesn't use refresh tokens
        // Access is granted via requisitions which last 90 days
        throw new Exception("Nordigen uses requisition-based access. Create new requisition to renew.");
    }

    /**
     * Revoke access and disconnect
     */
    public function revokeAccess(string $requisitionId): bool
    {
        try {
            $this->makeRequest('DELETE', "/requisitions/{$requisitionId}/", null, true);
            return true;
        } catch (Exception $e) {
            error_log("Failed to revoke Nordigen requisition: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Normalize transaction data to common format
     */
    public function normalizeTransaction(array $providerTransaction): array
    {
        $amount = (float)($providerTransaction['transactionAmount']['amount'] ?? 0);
        $currency = $providerTransaction['transactionAmount']['currency'] ?? 'RON';

        return [
            'id' => $providerTransaction['transactionId'] ?? $providerTransaction['internalTransactionId'],
            'date' => $providerTransaction['bookingDate'] ?? $providerTransaction['valueDate'] ?? date('Y-m-d'),
            'booking_date' => $providerTransaction['bookingDate'] ?? null,
            'value_date' => $providerTransaction['valueDate'] ?? null,
            'amount' => $amount,
            'currency' => $currency,
            'description' => $providerTransaction['remittanceInformationUnstructured'] ??
                           $providerTransaction['additionalInformation'] ??
                           'No description',
            'counterparty' => $providerTransaction['creditorName'] ??
                            $providerTransaction['debtorName'] ??
                            null,
            'counterparty_account' => $providerTransaction['creditorAccount']['iban'] ??
                                    $providerTransaction['debtorAccount']['iban'] ??
                                    null,
            'transaction_type' => $amount >= 0 ? 'credit' : 'debit',
            'status' => isset($providerTransaction['bookingDate']) ? 'booked' : 'pending',
            'reference' => $providerTransaction['merchantCategoryCode'] ?? null,
            'raw' => $providerTransaction
        ];
    }

    /**
     * Map Nordigen account types to our standard types
     */
    private function mapAccountType(string $nordigenType): string
    {
        $mapping = [
            'CACC' => 'checking', // Current Account
            'SVGS' => 'savings', // Savings Account
            'CARD' => 'credit_card', // Card Account
            'LOAN' => 'loan',
            'TRAN' => 'checking'
        ];

        return $mapping[$nordigenType] ?? 'checking';
    }
}
