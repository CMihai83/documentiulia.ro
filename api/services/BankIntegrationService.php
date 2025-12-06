<?php
/**
 * Bank Integration Service
 *
 * Manages bank connections, account access, and synchronization
 */

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../adapters/NordigenAdapter.php';

class BankIntegrationService
{
    private $db;
    private $adapters = [];

    public function __construct()
    {
        $database = Database::getInstance();
        $this->db = $database->getConnection();

        // Register available adapters
        $this->adapters['nordigen'] = new NordigenAdapter();
        // Future: $this->adapters['salt_edge'] = new SaltEdgeAdapter();
    }

    /**
     * Get list of supported banks for a country
     *
     * @param string $provider Provider name ('nordigen', 'salt_edge')
     * @param string $country Country code ('RO', 'GB', etc.)
     * @return array List of institutions
     */
    public function getInstitutions(string $provider, string $country = 'RO'): array
    {
        if (!isset($this->adapters[$provider])) {
            throw new Exception("Provider '{$provider}' not supported");
        }

        try {
            return $this->adapters[$provider]->getInstitutions($country);
        } catch (Exception $e) {
            error_log("BankIntegrationService::getInstitutions Error: " . $e->getMessage());
            throw new Exception("Failed to fetch institutions: " . $e->getMessage());
        }
    }

    /**
     * Initiate bank connection flow
     * Returns authorization URL for user to connect their bank
     *
     * @param string $companyId Company UUID
     * @param string $userId User UUID
     * @param string $provider Provider name
     * @param string $institutionId Bank institution ID
     * @param string $redirectUrl Callback URL after authentication
     * @return array ['connection_id' => UUID, 'auth_url' => string]
     */
    public function initiateConnection(
        string $companyId,
        string $userId,
        string $provider,
        string $institutionId,
        string $redirectUrl
    ): array {
        if (!isset($this->adapters[$provider])) {
            throw new Exception("Provider '{$provider}' not supported");
        }

        try {
            $this->db->beginTransaction();

            // Create connection flow with provider
            $adapter = $this->adapters[$provider];
            $connectionData = $adapter->createConnection($institutionId, $redirectUrl, $userId);

            // Get institution name from institutions list
            $institutions = $adapter->getInstitutions('RO');
            $institution = array_filter($institutions, fn($i) => $i['id'] === $institutionId);
            $institutionName = !empty($institution) ? reset($institution)['name'] : 'Unknown Bank';
            $institutionLogo = !empty($institution) ? reset($institution)['logo'] : null;

            // Store pending connection in database
            $query = "INSERT INTO bank_connections (
                company_id, user_id, provider, provider_connection_id,
                institution_id, institution_name, institution_logo_url,
                status, consent_id, consent_url, metadata
            ) VALUES (
                :company_id, :user_id, :provider, :provider_connection_id,
                :institution_id, :institution_name, :institution_logo_url,
                'pending', :consent_id, :consent_url, :metadata
            ) RETURNING id";

            $stmt = $this->db->prepare($query);
            $stmt->execute([
                ':company_id' => $companyId,
                ':user_id' => $userId,
                ':provider' => $provider,
                ':provider_connection_id' => $connectionData['requisition_id'],
                ':institution_id' => $institutionId,
                ':institution_name' => $institutionName,
                ':institution_logo_url' => $institutionLogo,
                ':consent_id' => $connectionData['requisition_id'],
                ':consent_url' => $connectionData['auth_url'],
                ':metadata' => json_encode($connectionData)
            ]);

            $connectionId = $stmt->fetchColumn();

            $this->db->commit();

            return [
                'connection_id' => $connectionId,
                'auth_url' => $connectionData['auth_url'],
                'status' => 'pending'
            ];

        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("BankIntegrationService::initiateConnection Error: " . $e->getMessage());
            throw new Exception("Failed to initiate bank connection: " . $e->getMessage());
        }
    }

    /**
     * Complete connection after user authorization
     *
     * @param string $connectionId Connection UUID
     * @return array Updated connection details
     */
    public function completeConnection(string $connectionId): array
    {
        try {
            $this->db->beginTransaction();

            // Get connection details
            $connection = $this->getConnection($connectionId);

            if ($connection['status'] === 'active') {
                throw new Exception("Connection already active");
            }

            $adapter = $this->adapters[$connection['provider']];

            // Complete authorization with provider
            $authData = $adapter->completeConnection($connection['provider_connection_id']);

            // Get first account details (users typically have one primary account)
            $accountId = $authData['account_ids'][0];
            $accountDetails = $adapter->getAccountDetails($accountId);

            // Update connection with account details
            $query = "UPDATE bank_connections SET
                account_id = :account_id,
                account_name = :account_name,
                account_number = :account_number,
                account_type = :account_type,
                currency = :currency,
                status = 'active',
                consent_expires_at = :consent_expires_at,
                updated_at = CURRENT_TIMESTAMP,
                metadata = :metadata
                WHERE id = :connection_id";

            $stmt = $this->db->prepare($query);
            $stmt->execute([
                ':connection_id' => $connectionId,
                ':account_id' => $accountId,
                ':account_name' => $accountDetails['name'],
                ':account_number' => isset($accountDetails['iban']) ? substr($accountDetails['iban'], -4) : null,
                ':account_type' => $accountDetails['type'],
                ':currency' => $accountDetails['currency'],
                ':consent_expires_at' => $authData['expires_at'],
                ':metadata' => json_encode(array_merge($authData, $accountDetails))
            ]);

            $this->db->commit();

            return $this->getConnection($connectionId);

        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("BankIntegrationService::completeConnection Error: " . $e->getMessage());
            throw new Exception("Failed to complete connection: " . $e->getMessage());
        }
    }

    /**
     * Get single connection by ID
     *
     * @param string $connectionId Connection UUID
     * @return array Connection details
     */
    public function getConnection(string $connectionId): array
    {
        $query = "SELECT * FROM bank_connections WHERE id = :connection_id";
        $stmt = $this->db->prepare($query);
        $stmt->execute([':connection_id' => $connectionId]);

        $connection = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$connection) {
            throw new Exception("Connection not found");
        }

        // Decode metadata
        $connection['metadata'] = json_decode($connection['metadata'], true);

        return $connection;
    }

    /**
     * List all connections for a company
     *
     * @param string $companyId Company UUID
     * @param string|null $status Filter by status
     * @return array List of connections
     */
    public function listConnections(string $companyId, ?string $status = null): array
    {
        $query = "SELECT
            id, provider, institution_name, institution_logo_url,
            account_name, account_number, account_type, currency,
            status, last_sync_at, last_sync_status,
            consent_expires_at, created_at
            FROM bank_connections
            WHERE company_id = :company_id";

        $params = [':company_id' => $companyId];

        if ($status) {
            $query .= " AND status = :status";
            $params[':status'] = $status;
        }

        $query .= " ORDER BY created_at DESC";

        $stmt = $this->db->prepare($query);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get current balance for a connection
     *
     * @param string $connectionId Connection UUID
     * @return array Balance information
     */
    public function getBalance(string $connectionId): array
    {
        try {
            $connection = $this->getConnection($connectionId);

            if ($connection['status'] !== 'active') {
                throw new Exception("Connection not active");
            }

            $adapter = $this->adapters[$connection['provider']];
            $balance = $adapter->getBalance($connection['account_id']);

            // Store balance snapshot
            $this->storeBalanceSnapshot($connectionId, $balance);

            return $balance;

        } catch (Exception $e) {
            error_log("BankIntegrationService::getBalance Error: " . $e->getMessage());
            throw new Exception("Failed to fetch balance: " . $e->getMessage());
        }
    }

    /**
     * Store balance snapshot
     */
    private function storeBalanceSnapshot(string $connectionId, array $balance): void
    {
        try {
            $query = "INSERT INTO bank_balance_snapshots (
                connection_id, balance_date, balance_type, amount, currency, source, metadata
            ) VALUES (
                :connection_id, :balance_date, :balance_type, :amount, :currency, 'sync', :metadata
            ) ON CONFLICT (connection_id, balance_date, balance_type)
            DO UPDATE SET amount = EXCLUDED.amount, metadata = EXCLUDED.metadata";

            $stmt = $this->db->prepare($query);
            $stmt->execute([
                ':connection_id' => $connectionId,
                ':balance_date' => $balance['date'] ?? date('Y-m-d'),
                ':balance_type' => $balance['type'] ?? 'closing',
                ':amount' => $balance['amount'],
                ':currency' => $balance['currency'],
                ':metadata' => json_encode($balance)
            ]);
        } catch (Exception $e) {
            error_log("Failed to store balance snapshot: " . $e->getMessage());
        }
    }

    /**
     * Disconnect and revoke bank access
     *
     * @param string $connectionId Connection UUID
     * @return bool Success status
     */
    public function disconnectConnection(string $connectionId): bool
    {
        try {
            $this->db->beginTransaction();

            $connection = $this->getConnection($connectionId);
            $adapter = $this->adapters[$connection['provider']];

            // Revoke access at provider
            $adapter->revokeAccess($connection['provider_connection_id']);

            // Update status to disconnected
            $query = "UPDATE bank_connections SET
                status = 'disconnected',
                access_token = NULL,
                refresh_token = NULL,
                updated_at = CURRENT_TIMESTAMP
                WHERE id = :connection_id";

            $stmt = $this->db->prepare($query);
            $stmt->execute([':connection_id' => $connectionId]);

            $this->db->commit();

            return true;

        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("BankIntegrationService::disconnectConnection Error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Check if connection needs consent renewal
     *
     * @param string $connectionId Connection UUID
     * @return array ['needs_renewal' => bool, 'expires_in_days' => int]
     */
    public function checkConsentStatus(string $connectionId): array
    {
        $connection = $this->getConnection($connectionId);

        if (!$connection['consent_expires_at']) {
            return ['needs_renewal' => false, 'expires_in_days' => null];
        }

        $expiresAt = strtotime($connection['consent_expires_at']);
        $now = time();
        $daysUntilExpiry = floor(($expiresAt - $now) / 86400);

        return [
            'needs_renewal' => $daysUntilExpiry <= 7, // Warn 7 days before expiry
            'expires_in_days' => $daysUntilExpiry,
            'expires_at' => $connection['consent_expires_at']
        ];
    }

    /**
     * Renew consent for expiring connection
     *
     * @param string $connectionId Connection UUID
     * @param string $redirectUrl Callback URL
     * @return array New auth URL
     */
    public function renewConsent(string $connectionId, string $redirectUrl): array
    {
        $connection = $this->getConnection($connectionId);

        // Disconnect old connection
        $this->disconnectConnection($connectionId);

        // Create new connection with same institution
        return $this->initiateConnection(
            $connection['company_id'],
            $connection['user_id'],
            $connection['provider'],
            $connection['institution_id'],
            $redirectUrl
        );
    }

    /**
     * Get connection statistics for a company
     *
     * @param string $companyId Company UUID
     * @return array Statistics
     */
    public function getConnectionStats(string $companyId): array
    {
        $query = "SELECT
            COUNT(*) as total_connections,
            COUNT(*) FILTER (WHERE status = 'active') as active_connections,
            COUNT(*) FILTER (WHERE status = 'expired') as expired_connections,
            COUNT(*) FILTER (WHERE consent_expires_at < NOW() + INTERVAL '7 days') as expiring_soon
            FROM bank_connections
            WHERE company_id = :company_id";

        $stmt = $this->db->prepare($query);
        $stmt->execute([':company_id' => $companyId]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}
