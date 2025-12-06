<?php
/**
 * Bank Provider Adapter Interface
 *
 * Defines the contract for all bank integration adapters (Nordigen, Salt Edge, etc.)
 * Uses adapter pattern to allow easy switching between providers
 */

interface BankProviderAdapter
{
    /**
     * Get list of supported institutions/banks
     *
     * @param string $country Country code (e.g., 'RO', 'GB')
     * @return array List of institutions with id, name, logo
     */
    public function getInstitutions(string $country): array;

    /**
     * Initiate bank connection flow
     * Returns authorization URL for user to authenticate with their bank
     *
     * @param string $institutionId Bank institution ID
     * @param string $redirectUrl Callback URL after authentication
     * @param string $userId User identifier for tracking
     * @return array ['requisition_id' => string, 'auth_url' => string]
     */
    public function createConnection(string $institutionId, string $redirectUrl, string $userId): array;

    /**
     * Complete connection after user authorization
     * Exchange authorization code/requisition for access token
     *
     * @param string $requisitionId Requisition/connection ID
     * @return array ['access_token' => string, 'refresh_token' => string, 'expires_in' => int]
     */
    public function completeConnection(string $requisitionId): array;

    /**
     * Get account details for a connection
     *
     * @param string $accountId Account identifier
     * @return array Account details (iban, name, type, currency, etc.)
     */
    public function getAccountDetails(string $accountId): array;

    /**
     * Get account balance
     *
     * @param string $accountId Account identifier
     * @return array ['amount' => float, 'currency' => string, 'type' => string]
     */
    public function getBalance(string $accountId): array;

    /**
     * Get account transactions
     *
     * @param string $accountId Account identifier
     * @param string $fromDate Start date (Y-m-d)
     * @param string $toDate End date (Y-m-d)
     * @return array List of transactions
     */
    public function getTransactions(string $accountId, string $fromDate, string $toDate): array;

    /**
     * Refresh expired access token
     *
     * @param string $refreshToken Refresh token
     * @return array ['access_token' => string, 'expires_in' => int]
     */
    public function refreshToken(string $refreshToken): array;

    /**
     * Revoke access and disconnect
     *
     * @param string $requisitionId Requisition/connection ID
     * @return bool Success status
     */
    public function revokeAccess(string $requisitionId): bool;

    /**
     * Normalize transaction data to common format
     *
     * @param array $providerTransaction Raw transaction from provider
     * @return array Normalized transaction
     */
    public function normalizeTransaction(array $providerTransaction): array;
}
