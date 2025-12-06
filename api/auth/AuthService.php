<?php
/**
 * AccounTech AI - Authentication Service
 * Handles user registration, login, JWT tokens
 */

require_once __DIR__ . '/../config/database.php';

class AuthService {
    private $db;
    private $jwtSecret = 'your-secret-key-change-in-production'; // TODO: Move to env

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Register a new user
     */
    public function register($email, $password, $firstName, $lastName) {
        // Validate email
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new Exception('Invalid email address');
        }

        // Check if user exists
        $existing = $this->db->fetchOne(
            "SELECT id FROM users WHERE email = :email",
            ['email' => $email]
        );

        if ($existing) {
            throw new Exception('Email already registered');
        }

        // Hash password
        $passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

        // Create user
        $userId = $this->db->insert('users', [
            'email' => $email,
            'password_hash' => $passwordHash,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'status' => 'active',
            'email_verified' => false
        ]);

        return [
            'user_id' => $userId,
            'email' => $email,
            'first_name' => $firstName,
            'last_name' => $lastName
        ];
    }

    /**
     * Login user and return JWT token
     */
    public function login($email, $password) {
        $user = $this->db->fetchOne(
            "SELECT id, email, password_hash, first_name, last_name, role, status
             FROM users
             WHERE email = :email",
            ['email' => $email]
        );

        if (!$user) {
            throw new Exception('Invalid credentials');
        }

        if ($user['status'] !== 'active') {
            throw new Exception('Account is suspended');
        }

        if (!password_verify($password, $user['password_hash'])) {
            throw new Exception('Invalid credentials');
        }

        // Update last login
        $this->db->query(
            "UPDATE users SET last_login_at = NOW() WHERE id = :id",
            ['id' => $user['id']]
        );

        // Generate JWT token
        $token = $this->generateJWT($user);

        // Get user's companies
        $companies = $this->db->fetchAll(
            "SELECT c.id, c.name, cu.role
             FROM companies c
             JOIN company_users cu ON c.id = cu.company_id
             WHERE cu.user_id = :user_id",
            ['user_id' => $user['id']]
        );

        return [
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'role' => $user['role']
            ],
            'companies' => $companies
        ];
    }

    /**
     * Authenticate request using Authorization header
     * Extracts Bearer token and verifies it
     */
    public function authenticate() {
        // Get Authorization header
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? '';

        if (empty($authHeader)) {
            return null;
        }

        // Extract token from "Bearer TOKEN" format
        if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return null;
        }

        $token = $matches[1];

        try {
            return $this->verifyToken($token);
        } catch (Exception $e) {
            return null;
        }
    }

    /**
     * Verify JWT token and return user data
     */
    public function verifyToken($token) {
        try {
            $parts = explode('.', $token);
            if (count($parts) !== 3) {
                throw new Exception('Invalid token format');
            }

            [$header, $payload, $signature] = $parts;

            // Verify signature
            $expectedSignature = $this->base64UrlEncode(
                hash_hmac('sha256', "$header.$payload", $this->jwtSecret, true)
            );

            if ($signature !== $expectedSignature) {
                throw new Exception('Invalid token signature');
            }

            // Decode payload
            $data = json_decode($this->base64UrlDecode($payload), true);

            // Check expiration
            if (isset($data['exp']) && $data['exp'] < time()) {
                throw new Exception('Token expired');
            }

            return $data;
        } catch (Exception $e) {
            throw new Exception('Invalid token: ' . $e->getMessage());
        }
    }

    /**
     * Generate JWT token
     */
    private function generateJWT($user) {
        $header = [
            'typ' => 'JWT',
            'alg' => 'HS256'
        ];

        $payload = [
            'iss' => 'accountech.ai',
            'iat' => time(),
            'exp' => time() + (86400 * 30), // 30 days
            'user_id' => $user['id'],
            'email' => $user['email'],
            'role' => $user['role']
        ];

        $header64 = $this->base64UrlEncode(json_encode($header));
        $payload64 = $this->base64UrlEncode(json_encode($payload));
        $signature = $this->base64UrlEncode(
            hash_hmac('sha256', "$header64.$payload64", $this->jwtSecret, true)
        );

        return "$header64.$payload64.$signature";
    }

    /**
     * Create a new company for a user
     */
    public function createCompany($userId, $companyName, $industry = null, $currency = 'USD') {
        $this->db->beginTransaction();

        try {
            // Create company
            $companyId = $this->db->insert('companies', [
                'name' => $companyName,
                'industry' => $industry,
                'base_currency' => $currency
            ]);

            // Add user to company as owner
            $this->db->insert('company_users', [
                'company_id' => $companyId,
                'user_id' => $userId,
                'role' => 'owner'
            ]);

            // Create default chart of accounts
            $this->createDefaultAccounts($companyId);

            $this->db->commit();

            return [
                'company_id' => $companyId,
                'name' => $companyName
            ];
        } catch (Exception $e) {
            $this->db->rollback();
            throw $e;
        }
    }

    /**
     * Check if user has access to company
     * @param string $userId UUID
     * @param string $companyId UUID
     * @return bool
     */
    public function userHasAccessToCompany($userId, $companyId) {
        $result = $this->db->fetchOne(
            "SELECT 1 FROM company_users
             WHERE user_id = :user_id AND company_id = :company_id",
            ['user_id' => $userId, 'company_id' => $companyId]
        );
        return $result !== null && $result !== false;
    }

    /**
     * Generate a new JWT token for an authenticated user
     */
    public function generateToken($userId, $email, $role) {
        $user = [
            'id' => $userId,
            'email' => $email,
            'role' => $role
        ];
        return $this->generateJWT($user);
    }

    /**
     * Create default chart of accounts for a new company
     */
    private function createDefaultAccounts($companyId) {
        $defaultAccounts = [
            ['1000', 'Cash', 'asset', 'cash'],
            ['1200', 'Accounts Receivable', 'asset', 'accounts_receivable'],
            ['1500', 'Inventory', 'asset', 'inventory'],
            ['2000', 'Accounts Payable', 'liability', 'accounts_payable'],
            ['2100', 'Credit Cards', 'liability', 'credit_card'],
            ['3000', 'Owner Equity', 'equity', 'equity'],
            ['4000', 'Sales Revenue', 'revenue', 'sales'],
            ['4100', 'Service Revenue', 'revenue', 'service'],
            ['5000', 'Cost of Goods Sold', 'expense', 'cogs'],
            ['6000', 'Operating Expenses', 'expense', 'operating'],
            ['6100', 'Salaries & Wages', 'expense', 'payroll'],
            ['6200', 'Rent', 'expense', 'rent'],
            ['6300', 'Utilities', 'expense', 'utilities'],
            ['6400', 'Marketing', 'expense', 'marketing'],
            ['6500', 'Office Supplies', 'expense', 'supplies']
        ];

        foreach ($defaultAccounts as $account) {
            $this->db->insert('accounts', [
                'company_id' => $companyId,
                'code' => $account[0],
                'name' => $account[1],
                'account_type' => $account[2],
                'account_subtype' => $account[3],
                'is_active' => true
            ]);
        }
    }

    private function base64UrlEncode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private function base64UrlDecode($data) {
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
