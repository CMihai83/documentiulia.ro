<?php

namespace DocumentIulia\Services\EFactura;

require_once __DIR__ . '/EFacturaConfig.php';

/**
 * e-Factura OAuth 2.0 Client
 * Handles authentication with ANAF e-Factura API
 *
 * Features:
 * - OAuth 2.0 authorization code flow
 * - Automatic token refresh
 * - Multi-company support
 * - Secure token storage with encryption
 * - Token expiration handling
 * - Error recovery
 */
class EFacturaOAuthClient {

    private $pdo;
    private $encryptionKey;

    public function __construct($pdo) {
        $this->pdo = $pdo;
        // In production, get from secure environment variable
        $this->encryptionKey = getenv('EFACTURA_ENCRYPTION_KEY') ?: 'CHANGE_ME_IN_PRODUCTION';
    }

    /**
     * Get authorization URL to start OAuth flow
     *
     * @param string $companyId UUID of company
     * @return array URL and state token
     */
    public function getAuthorizationUrl($companyId) {
        // Generate state token for CSRF protection
        $state = bin2hex(random_bytes(16));

        // Store state in session or database for verification
        $_SESSION['efactura_oauth_state'] = $state;
        $_SESSION['efactura_oauth_company_id'] = $companyId;

        $url = EFacturaConfig::getAuthorizationUrl($state);

        return [
            'url' => $url,
            'state' => $state
        ];
    }

    /**
     * Handle OAuth callback and exchange code for tokens
     *
     * @param string $code Authorization code from ANAF
     * @param string $state State token for verification
     * @param string $companyId UUID of company
     * @return array Tokens
     */
    public function handleCallback($code, $state, $companyId) {
        // Verify state token
        if (!isset($_SESSION['efactura_oauth_state']) ||
            $_SESSION['efactura_oauth_state'] !== $state) {
            throw new \Exception('Invalid state token - possible CSRF attack');
        }

        // Verify company ID
        if (!isset($_SESSION['efactura_oauth_company_id']) ||
            $_SESSION['efactura_oauth_company_id'] !== $companyId) {
            throw new \Exception('Company ID mismatch');
        }

        // Clear session variables
        unset($_SESSION['efactura_oauth_state']);
        unset($_SESSION['efactura_oauth_company_id']);

        // Exchange authorization code for access token
        $tokens = $this->exchangeCodeForTokens($code);

        // Store tokens in database
        $this->storeTokens($companyId, $tokens, $code);

        return $tokens;
    }

    /**
     * Exchange authorization code for access and refresh tokens
     */
    private function exchangeCodeForTokens($code) {
        $credentials = EFacturaConfig::getClientCredentials();

        $data = [
            'grant_type' => 'authorization_code',
            'code' => $code,
            'redirect_uri' => EFacturaConfig::REDIRECT_URI,
            'client_id' => $credentials['client_id'],
            'client_secret' => $credentials['client_secret']
        ];

        $response = $this->makeTokenRequest($data);

        return $response;
    }

    /**
     * Refresh access token using refresh token
     *
     * @param string $refreshToken Refresh token
     * @return array New tokens
     */
    private function refreshAccessToken($refreshToken) {
        $credentials = EFacturaConfig::getClientCredentials();

        $data = [
            'grant_type' => 'refresh_token',
            'refresh_token' => $refreshToken,
            'client_id' => $credentials['client_id'],
            'client_secret' => $credentials['client_secret']
        ];

        $response = $this->makeTokenRequest($data);

        return $response;
    }

    /**
     * Make request to token endpoint
     */
    private function makeTokenRequest($data) {
        $ch = curl_init(EFacturaConfig::OAUTH_TOKEN_URL);

        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/x-www-form-urlencoded',
            'Accept: application/json'
        ]);

        // Set timeout
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            throw new \Exception("CURL Error: $curlError");
        }

        if ($httpCode !== 200) {
            throw new \Exception("OAuth Token Error: HTTP $httpCode - $response");
        }

        $result = json_decode($response, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \Exception("Invalid JSON response from token endpoint");
        }

        if (isset($result['error'])) {
            throw new \Exception("OAuth Error: {$result['error']} - {$result['error_description']}");
        }

        if (!isset($result['access_token'])) {
            throw new \Exception("No access token in response");
        }

        return $result;
    }

    /**
     * Store tokens in database (encrypted)
     *
     * @param string $companyId UUID of company
     * @param array $tokens Token data
     * @param string $authCode Authorization code (for audit)
     */
    private function storeTokens($companyId, $tokens, $authCode = null) {
        $credentials = EFacturaConfig::getClientCredentials();

        // Calculate expiration time
        $expiresIn = $tokens['expires_in'] ?? 3600; // Default 1 hour
        $expiresAt = date('Y-m-d H:i:s', time() + $expiresIn);

        // Encrypt sensitive data
        $accessToken = $this->encrypt($tokens['access_token']);
        $refreshToken = isset($tokens['refresh_token']) ?
            $this->encrypt($tokens['refresh_token']) : null;
        $clientSecret = $this->encrypt($credentials['client_secret']);

        // Check if record exists
        $stmt = $this->pdo->prepare("
            SELECT id FROM efactura_oauth_tokens
            WHERE company_id = ?
        ");
        $stmt->execute([$companyId]);
        $existing = $stmt->fetch(\PDO::FETCH_ASSOC);

        if ($existing) {
            // Update existing record
            $stmt = $this->pdo->prepare("
                UPDATE efactura_oauth_tokens SET
                    client_id = ?,
                    client_secret = ?,
                    access_token = ?,
                    refresh_token = ?,
                    token_type = ?,
                    expires_at = ?,
                    is_active = true,
                    last_refresh_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE company_id = ?
            ");

            $stmt->execute([
                $credentials['client_id'],
                $clientSecret,
                $accessToken,
                $refreshToken,
                $tokens['token_type'] ?? 'Bearer',
                $expiresAt,
                $companyId
            ]);
        } else {
            // Insert new record
            $stmt = $this->pdo->prepare("
                INSERT INTO efactura_oauth_tokens (
                    company_id, client_id, client_secret, access_token,
                    refresh_token, token_type, expires_at,
                    authorization_code, authorization_redirect_uri,
                    is_active, last_refresh_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, true, CURRENT_TIMESTAMP)
            ");

            $stmt->execute([
                $companyId,
                $credentials['client_id'],
                $clientSecret,
                $accessToken,
                $refreshToken,
                $tokens['token_type'] ?? 'Bearer',
                $expiresAt,
                $authCode,
                EFacturaConfig::REDIRECT_URI
            ]);
        }

        return true;
    }

    /**
     * Get valid access token for company (auto-refresh if expired)
     *
     * @param string $companyId UUID of company
     * @return string Access token
     */
    public function getAccessToken($companyId) {
        // Get token data from database
        $stmt = $this->pdo->prepare("
            SELECT * FROM efactura_oauth_tokens
            WHERE company_id = ? AND is_active = true
        ");
        $stmt->execute([$companyId]);
        $tokenData = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$tokenData) {
            throw new \Exception("No OAuth tokens found for company. Please connect to ANAF first.");
        }

        // Check if token is expired (with 5 minute buffer)
        $expiresAt = strtotime($tokenData['expires_at']);
        $now = time();
        $bufferTime = 300; // 5 minutes

        if ($expiresAt - $now < $bufferTime) {
            // Token is expired or about to expire, refresh it
            if (empty($tokenData['refresh_token'])) {
                throw new \Exception("No refresh token available. Please re-authenticate.");
            }

            $refreshToken = $this->decrypt($tokenData['refresh_token']);

            try {
                $newTokens = $this->refreshAccessToken($refreshToken);
                $this->storeTokens($companyId, $newTokens);

                // Return new access token
                return $newTokens['access_token'];

            } catch (\Exception $e) {
                // Refresh failed, mark tokens as inactive
                $this->deactivateTokens($companyId);
                throw new \Exception("Token refresh failed: " . $e->getMessage() .
                    ". Please re-authenticate.");
            }
        }

        // Token is still valid, decrypt and return
        return $this->decrypt($tokenData['access_token']);
    }

    /**
     * Check if company has active OAuth tokens
     *
     * @param string $companyId UUID of company
     * @return bool
     */
    public function hasActiveTokens($companyId) {
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) as count FROM efactura_oauth_tokens
            WHERE company_id = ? AND is_active = true
        ");
        $stmt->execute([$companyId]);
        $result = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $result['count'] > 0;
    }

    /**
     * Deactivate tokens for company
     *
     * @param string $companyId UUID of company
     */
    public function deactivateTokens($companyId) {
        $stmt = $this->pdo->prepare("
            UPDATE efactura_oauth_tokens
            SET is_active = false, updated_at = CURRENT_TIMESTAMP
            WHERE company_id = ?
        ");
        $stmt->execute([$companyId]);
    }

    /**
     * Get token status for company
     *
     * @param string $companyId UUID of company
     * @return array Status information
     */
    public function getTokenStatus($companyId) {
        $stmt = $this->pdo->prepare("
            SELECT
                is_active,
                expires_at,
                last_refresh_at,
                created_at
            FROM efactura_oauth_tokens
            WHERE company_id = ?
        ");
        $stmt->execute([$companyId]);
        $tokenData = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$tokenData) {
            return [
                'connected' => false,
                'status' => 'not_connected',
                'message' => 'Not connected to ANAF e-Factura'
            ];
        }

        $expiresAt = strtotime($tokenData['expires_at']);
        $now = time();
        $minutesUntilExpiry = ($expiresAt - $now) / 60;

        $status = 'connected';
        $message = 'Connected to ANAF e-Factura';

        if (!$tokenData['is_active']) {
            $status = 'inactive';
            $message = 'Connection inactive. Please re-authenticate.';
        } elseif ($minutesUntilExpiry < 0) {
            $status = 'expired';
            $message = 'Token expired. Will auto-refresh on next use.';
        } elseif ($minutesUntilExpiry < 60) {
            $status = 'expiring_soon';
            $message = sprintf('Token expires in %d minutes', $minutesUntilExpiry);
        }

        return [
            'connected' => $tokenData['is_active'],
            'status' => $status,
            'message' => $message,
            'expires_at' => $tokenData['expires_at'],
            'last_refresh_at' => $tokenData['last_refresh_at'],
            'connected_since' => $tokenData['created_at']
        ];
    }

    /**
     * Encrypt sensitive data
     */
    private function encrypt($data) {
        $iv = random_bytes(16);
        $encrypted = openssl_encrypt(
            $data,
            'AES-256-CBC',
            hash('sha256', $this->encryptionKey, true),
            0,
            $iv
        );

        return base64_encode($iv . $encrypted);
    }

    /**
     * Decrypt sensitive data
     */
    private function decrypt($data) {
        $data = base64_decode($data);
        $iv = substr($data, 0, 16);
        $encrypted = substr($data, 16);

        return openssl_decrypt(
            $encrypted,
            'AES-256-CBC',
            hash('sha256', $this->encryptionKey, true),
            0,
            $iv
        );
    }

    /**
     * Test OAuth connection
     *
     * @param string $companyId UUID of company
     * @return array Test result
     */
    public function testConnection($companyId) {
        try {
            $accessToken = $this->getAccessToken($companyId);

            // Try a simple API call (list messages with 1 day)
            $ch = curl_init(EFacturaConfig::getApiUrl('listaMesajeFactura') . '?zile=1');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $accessToken
            ]);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200) {
                return [
                    'success' => true,
                    'message' => 'Connection successful'
                ];
            } else {
                return [
                    'success' => false,
                    'message' => "API test failed: HTTP $httpCode"
                ];
            }

        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }
}
