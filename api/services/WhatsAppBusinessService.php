<?php
/**
 * WhatsApp Business API Integration Service
 * E2-US04: WhatsApp Business Integration
 *
 * Features:
 * - Send invoices via WhatsApp
 * - Send payment reminders
 * - Template messages for common scenarios
 * - Message history tracking
 * - Opt-out handling
 */

require_once __DIR__ . '/../config/database.php';

class WhatsAppBusinessService {
    private static ?WhatsAppBusinessService $instance = null;
    private PDO $pdo;

    // WhatsApp Business API configuration
    private string $apiUrl = 'https://graph.facebook.com/v18.0';
    private ?string $phoneNumberId = null;
    private ?string $accessToken = null;
    private ?string $businessAccountId = null;

    // Message templates (pre-approved by WhatsApp)
    private array $templates = [
        'invoice_sent' => [
            'name' => 'invoice_notification_ro',
            'language' => 'ro',
            'components' => [
                ['type' => 'body', 'parameters' => ['customer_name', 'invoice_number', 'amount', 'due_date']]
            ]
        ],
        'payment_reminder' => [
            'name' => 'payment_reminder_ro',
            'language' => 'ro',
            'components' => [
                ['type' => 'body', 'parameters' => ['customer_name', 'invoice_number', 'amount', 'days_overdue']]
            ]
        ],
        'payment_received' => [
            'name' => 'payment_confirmation_ro',
            'language' => 'ro',
            'components' => [
                ['type' => 'body', 'parameters' => ['customer_name', 'amount', 'invoice_number']]
            ]
        ],
        'estimate_sent' => [
            'name' => 'estimate_notification_ro',
            'language' => 'ro',
            'components' => [
                ['type' => 'body', 'parameters' => ['customer_name', 'estimate_number', 'amount', 'valid_until']]
            ]
        ],
        'appointment_reminder' => [
            'name' => 'appointment_reminder_ro',
            'language' => 'ro',
            'components' => [
                ['type' => 'body', 'parameters' => ['customer_name', 'date', 'time', 'service_type']]
            ]
        ]
    ];

    private function __construct() {
        $this->pdo = Database::getInstance()->getConnection();
        $this->loadConfiguration();
    }

    public static function getInstance(): WhatsAppBusinessService {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Load WhatsApp configuration from database or environment
     */
    private function loadConfiguration(): void {
        $this->phoneNumberId = $_ENV['WHATSAPP_PHONE_NUMBER_ID'] ?? getenv('WHATSAPP_PHONE_NUMBER_ID') ?: null;
        $this->accessToken = $_ENV['WHATSAPP_ACCESS_TOKEN'] ?? getenv('WHATSAPP_ACCESS_TOKEN') ?: null;
        $this->businessAccountId = $_ENV['WHATSAPP_BUSINESS_ACCOUNT_ID'] ?? getenv('WHATSAPP_BUSINESS_ACCOUNT_ID') ?: null;
    }

    /**
     * Check if WhatsApp is configured
     */
    public function isConfigured(): bool {
        return !empty($this->phoneNumberId) && !empty($this->accessToken);
    }

    /**
     * Get configuration status for company
     */
    public function getConfigurationStatus(string $companyId): array {
        $stmt = $this->pdo->prepare("
            SELECT * FROM whatsapp_settings
            WHERE company_id = ?
        ");
        $stmt->execute([$companyId]);
        $settings = $stmt->fetch(PDO::FETCH_ASSOC);

        return [
            'configured' => $this->isConfigured(),
            'company_settings' => $settings ? [
                'enabled' => $settings['enabled'] ?? false,
                'phone_number' => $settings['phone_number'] ?? null,
                'auto_invoice_send' => $settings['auto_invoice_send'] ?? false,
                'auto_reminder_days' => json_decode($settings['auto_reminder_days'] ?? '[]', true),
                'business_hours_only' => $settings['business_hours_only'] ?? true
            ] : null,
            'available_templates' => array_keys($this->templates)
        ];
    }

    /**
     * Save company WhatsApp settings
     */
    public function saveSettings(string $companyId, array $settings): bool {
        $stmt = $this->pdo->prepare("
            INSERT INTO whatsapp_settings (company_id, enabled, phone_number, auto_invoice_send,
                auto_reminder_days, business_hours_only, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
            ON CONFLICT (company_id) DO UPDATE SET
                enabled = EXCLUDED.enabled,
                phone_number = EXCLUDED.phone_number,
                auto_invoice_send = EXCLUDED.auto_invoice_send,
                auto_reminder_days = EXCLUDED.auto_reminder_days,
                business_hours_only = EXCLUDED.business_hours_only,
                updated_at = NOW()
        ");

        return $stmt->execute([
            $companyId,
            $settings['enabled'] ?? false,
            $settings['phone_number'] ?? null,
            $settings['auto_invoice_send'] ?? false,
            json_encode($settings['auto_reminder_days'] ?? [3, 7, 14]),
            $settings['business_hours_only'] ?? true
        ]);
    }

    /**
     * Format phone number for WhatsApp (E.164 format)
     */
    public function formatPhoneNumber(string $phone, string $defaultCountry = 'RO'): string {
        // Remove all non-numeric characters
        $phone = preg_replace('/[^0-9]/', '', $phone);

        // Romanian number handling
        if ($defaultCountry === 'RO') {
            // If starts with 0, replace with 40 (Romania country code)
            if (str_starts_with($phone, '0')) {
                $phone = '40' . substr($phone, 1);
            }
            // If doesn't start with 40, add it
            if (!str_starts_with($phone, '40')) {
                $phone = '40' . $phone;
            }
        }

        return $phone;
    }

    /**
     * Check if contact has opted out
     */
    public function hasOptedOut(string $companyId, string $phoneNumber): bool {
        $phone = $this->formatPhoneNumber($phoneNumber);

        $stmt = $this->pdo->prepare("
            SELECT 1 FROM whatsapp_optouts
            WHERE company_id = ? AND phone_number = ?
        ");
        $stmt->execute([$companyId, $phone]);

        return $stmt->fetch() !== false;
    }

    /**
     * Record opt-out
     */
    public function recordOptOut(string $companyId, string $phoneNumber, string $reason = null): bool {
        $phone = $this->formatPhoneNumber($phoneNumber);

        $stmt = $this->pdo->prepare("
            INSERT INTO whatsapp_optouts (company_id, phone_number, reason, created_at)
            VALUES (?, ?, ?, NOW())
            ON CONFLICT (company_id, phone_number) DO NOTHING
        ");

        return $stmt->execute([$companyId, $phone, $reason]);
    }

    /**
     * Remove opt-out (re-subscribe)
     */
    public function removeOptOut(string $companyId, string $phoneNumber): bool {
        $phone = $this->formatPhoneNumber($phoneNumber);

        $stmt = $this->pdo->prepare("
            DELETE FROM whatsapp_optouts
            WHERE company_id = ? AND phone_number = ?
        ");

        return $stmt->execute([$companyId, $phone]);
    }

    /**
     * Send a template message
     */
    public function sendTemplateMessage(
        string $companyId,
        string $toPhone,
        string $templateKey,
        array $parameters,
        ?string $contactId = null
    ): array {
        if (!$this->isConfigured()) {
            return [
                'success' => false,
                'error' => 'WhatsApp not configured',
                'simulated' => true,
                'message' => 'Message would be sent: ' . $templateKey
            ];
        }

        $phone = $this->formatPhoneNumber($toPhone);

        // Check opt-out
        if ($this->hasOptedOut($companyId, $phone)) {
            return [
                'success' => false,
                'error' => 'Contact has opted out of WhatsApp messages'
            ];
        }

        // Get template
        $template = $this->templates[$templateKey] ?? null;
        if (!$template) {
            return [
                'success' => false,
                'error' => 'Unknown template: ' . $templateKey
            ];
        }

        // Build message payload
        $payload = [
            'messaging_product' => 'whatsapp',
            'to' => $phone,
            'type' => 'template',
            'template' => [
                'name' => $template['name'],
                'language' => ['code' => $template['language']],
                'components' => $this->buildTemplateComponents($template, $parameters)
            ]
        ];

        // Send via API
        $result = $this->callApi('POST', "/{$this->phoneNumberId}/messages", $payload);

        // Log message
        $this->logMessage($companyId, $phone, $templateKey, $parameters, $result, $contactId);

        return $result;
    }

    /**
     * Send invoice notification
     */
    public function sendInvoiceNotification(
        string $companyId,
        string $toPhone,
        array $invoiceData,
        ?string $contactId = null
    ): array {
        return $this->sendTemplateMessage($companyId, $toPhone, 'invoice_sent', [
            'customer_name' => $invoiceData['customer_name'],
            'invoice_number' => $invoiceData['invoice_number'],
            'amount' => number_format($invoiceData['amount'], 2) . ' ' . ($invoiceData['currency'] ?? 'RON'),
            'due_date' => date('d.m.Y', strtotime($invoiceData['due_date']))
        ], $contactId);
    }

    /**
     * Send payment reminder
     */
    public function sendPaymentReminder(
        string $companyId,
        string $toPhone,
        array $invoiceData,
        ?string $contactId = null
    ): array {
        $daysOverdue = floor((time() - strtotime($invoiceData['due_date'])) / 86400);

        return $this->sendTemplateMessage($companyId, $toPhone, 'payment_reminder', [
            'customer_name' => $invoiceData['customer_name'],
            'invoice_number' => $invoiceData['invoice_number'],
            'amount' => number_format($invoiceData['amount'], 2) . ' ' . ($invoiceData['currency'] ?? 'RON'),
            'days_overdue' => max(0, $daysOverdue) . ' zile'
        ], $contactId);
    }

    /**
     * Send payment confirmation
     */
    public function sendPaymentConfirmation(
        string $companyId,
        string $toPhone,
        array $paymentData,
        ?string $contactId = null
    ): array {
        return $this->sendTemplateMessage($companyId, $toPhone, 'payment_received', [
            'customer_name' => $paymentData['customer_name'],
            'amount' => number_format($paymentData['amount'], 2) . ' ' . ($paymentData['currency'] ?? 'RON'),
            'invoice_number' => $paymentData['invoice_number']
        ], $contactId);
    }

    /**
     * Send estimate notification
     */
    public function sendEstimateNotification(
        string $companyId,
        string $toPhone,
        array $estimateData,
        ?string $contactId = null
    ): array {
        return $this->sendTemplateMessage($companyId, $toPhone, 'estimate_sent', [
            'customer_name' => $estimateData['customer_name'],
            'estimate_number' => $estimateData['estimate_number'],
            'amount' => number_format($estimateData['amount'], 2) . ' ' . ($estimateData['currency'] ?? 'RON'),
            'valid_until' => date('d.m.Y', strtotime($estimateData['valid_until']))
        ], $contactId);
    }

    /**
     * Send appointment reminder
     */
    public function sendAppointmentReminder(
        string $companyId,
        string $toPhone,
        array $appointmentData,
        ?string $contactId = null
    ): array {
        return $this->sendTemplateMessage($companyId, $toPhone, 'appointment_reminder', [
            'customer_name' => $appointmentData['customer_name'],
            'date' => date('d.m.Y', strtotime($appointmentData['date'])),
            'time' => date('H:i', strtotime($appointmentData['time'])),
            'service_type' => $appointmentData['service_type']
        ], $contactId);
    }

    /**
     * Send custom text message (requires session)
     */
    public function sendTextMessage(
        string $companyId,
        string $toPhone,
        string $message,
        ?string $contactId = null
    ): array {
        if (!$this->isConfigured()) {
            return [
                'success' => false,
                'error' => 'WhatsApp not configured',
                'simulated' => true,
                'message' => 'Text would be sent: ' . substr($message, 0, 100)
            ];
        }

        $phone = $this->formatPhoneNumber($toPhone);

        if ($this->hasOptedOut($companyId, $phone)) {
            return [
                'success' => false,
                'error' => 'Contact has opted out'
            ];
        }

        $payload = [
            'messaging_product' => 'whatsapp',
            'to' => $phone,
            'type' => 'text',
            'text' => ['body' => $message]
        ];

        $result = $this->callApi('POST', "/{$this->phoneNumberId}/messages", $payload);

        $this->logMessage($companyId, $phone, 'text', ['message' => $message], $result, $contactId);

        return $result;
    }

    /**
     * Send document (invoice PDF)
     */
    public function sendDocument(
        string $companyId,
        string $toPhone,
        string $documentUrl,
        string $filename,
        ?string $caption = null,
        ?string $contactId = null
    ): array {
        if (!$this->isConfigured()) {
            return [
                'success' => false,
                'error' => 'WhatsApp not configured',
                'simulated' => true
            ];
        }

        $phone = $this->formatPhoneNumber($toPhone);

        if ($this->hasOptedOut($companyId, $phone)) {
            return ['success' => false, 'error' => 'Contact has opted out'];
        }

        $payload = [
            'messaging_product' => 'whatsapp',
            'to' => $phone,
            'type' => 'document',
            'document' => [
                'link' => $documentUrl,
                'filename' => $filename
            ]
        ];

        if ($caption) {
            $payload['document']['caption'] = $caption;
        }

        $result = $this->callApi('POST', "/{$this->phoneNumberId}/messages", $payload);

        $this->logMessage($companyId, $phone, 'document', [
            'url' => $documentUrl,
            'filename' => $filename
        ], $result, $contactId);

        return $result;
    }

    /**
     * Get message history for a contact
     */
    public function getMessageHistory(string $companyId, string $phoneNumber, int $limit = 50): array {
        $phone = $this->formatPhoneNumber($phoneNumber);

        $stmt = $this->pdo->prepare("
            SELECT id, phone_number, template_key, parameters, status,
                   whatsapp_message_id, error_message, created_at
            FROM whatsapp_messages
            WHERE company_id = ? AND phone_number = ?
            ORDER BY created_at DESC
            LIMIT ?
        ");
        $stmt->execute([$companyId, $phone, $limit]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get all messages for company
     */
    public function getCompanyMessages(string $companyId, array $filters = []): array {
        $sql = "
            SELECT wm.*, c.display_name as contact_name
            FROM whatsapp_messages wm
            LEFT JOIN contacts c ON wm.contact_id = c.id
            WHERE wm.company_id = ?
        ";
        $params = [$companyId];

        if (!empty($filters['status'])) {
            $sql .= " AND wm.status = ?";
            $params[] = $filters['status'];
        }

        if (!empty($filters['template_key'])) {
            $sql .= " AND wm.template_key = ?";
            $params[] = $filters['template_key'];
        }

        if (!empty($filters['date_from'])) {
            $sql .= " AND wm.created_at >= ?";
            $params[] = $filters['date_from'];
        }

        if (!empty($filters['date_to'])) {
            $sql .= " AND wm.created_at <= ?";
            $params[] = $filters['date_to'];
        }

        $sql .= " ORDER BY wm.created_at DESC LIMIT 100";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get available templates
     */
    public function getTemplates(): array {
        $result = [];
        foreach ($this->templates as $key => $template) {
            $result[] = [
                'key' => $key,
                'name' => $template['name'],
                'language' => $template['language'],
                'parameters' => array_merge(...array_map(
                    fn($c) => $c['parameters'] ?? [],
                    $template['components']
                ))
            ];
        }
        return $result;
    }

    /**
     * Process webhook from WhatsApp
     */
    public function processWebhook(array $payload): array {
        $processed = [];

        foreach ($payload['entry'] ?? [] as $entry) {
            foreach ($entry['changes'] ?? [] as $change) {
                if ($change['field'] !== 'messages') continue;

                $value = $change['value'];

                // Process status updates
                foreach ($value['statuses'] ?? [] as $status) {
                    $this->updateMessageStatus(
                        $status['id'],
                        $status['status'],
                        $status['timestamp'] ?? null,
                        $status['errors'] ?? null
                    );
                    $processed[] = ['type' => 'status', 'id' => $status['id']];
                }

                // Process incoming messages
                foreach ($value['messages'] ?? [] as $message) {
                    $this->handleIncomingMessage($message, $value['contacts'][0] ?? null);
                    $processed[] = ['type' => 'message', 'id' => $message['id']];
                }
            }
        }

        return ['processed' => $processed];
    }

    /**
     * Build template components with parameters
     */
    private function buildTemplateComponents(array $template, array $parameters): array {
        $components = [];

        foreach ($template['components'] as $component) {
            $params = [];
            foreach ($component['parameters'] as $paramName) {
                $params[] = [
                    'type' => 'text',
                    'text' => $parameters[$paramName] ?? ''
                ];
            }

            $components[] = [
                'type' => $component['type'],
                'parameters' => $params
            ];
        }

        return $components;
    }

    /**
     * Call WhatsApp API
     */
    private function callApi(string $method, string $endpoint, array $data = []): array {
        $url = $this->apiUrl . $endpoint;

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $this->accessToken,
                'Content-Type: application/json'
            ]
        ]);

        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            return ['success' => false, 'error' => $error];
        }

        $result = json_decode($response, true);

        if ($httpCode >= 200 && $httpCode < 300) {
            return [
                'success' => true,
                'message_id' => $result['messages'][0]['id'] ?? null,
                'data' => $result
            ];
        }

        return [
            'success' => false,
            'error' => $result['error']['message'] ?? 'Unknown error',
            'error_code' => $result['error']['code'] ?? null
        ];
    }

    /**
     * Log sent message
     */
    private function logMessage(
        string $companyId,
        string $phone,
        string $templateKey,
        array $parameters,
        array $result,
        ?string $contactId
    ): void {
        $stmt = $this->pdo->prepare("
            INSERT INTO whatsapp_messages
            (company_id, contact_id, phone_number, template_key, parameters,
             status, whatsapp_message_id, error_message, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");

        $stmt->execute([
            $companyId,
            $contactId,
            $phone,
            $templateKey,
            json_encode($parameters),
            $result['success'] ? 'sent' : 'failed',
            $result['message_id'] ?? null,
            $result['error'] ?? null
        ]);
    }

    /**
     * Update message status from webhook
     */
    private function updateMessageStatus(
        string $messageId,
        string $status,
        ?string $timestamp,
        ?array $errors
    ): void {
        $stmt = $this->pdo->prepare("
            UPDATE whatsapp_messages
            SET status = ?,
                delivered_at = CASE WHEN ? = 'delivered' THEN NOW() ELSE delivered_at END,
                read_at = CASE WHEN ? = 'read' THEN NOW() ELSE read_at END,
                error_message = COALESCE(?, error_message)
            WHERE whatsapp_message_id = ?
        ");

        $errorMsg = $errors ? json_encode($errors) : null;
        $stmt->execute([$status, $status, $status, $errorMsg, $messageId]);
    }

    /**
     * Handle incoming message
     */
    private function handleIncomingMessage(array $message, ?array $contact): void {
        // Store incoming message for display in platform
        $stmt = $this->pdo->prepare("
            INSERT INTO whatsapp_incoming_messages
            (whatsapp_message_id, from_phone, from_name, message_type, message_body,
             timestamp, raw_payload, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ");

        $body = match($message['type']) {
            'text' => $message['text']['body'] ?? '',
            'button' => $message['button']['text'] ?? '',
            'interactive' => $message['interactive']['button_reply']['title'] ??
                            $message['interactive']['list_reply']['title'] ?? '',
            default => '[' . $message['type'] . ']'
        };

        $stmt->execute([
            $message['id'],
            $message['from'],
            $contact['profile']['name'] ?? null,
            $message['type'],
            $body,
            $message['timestamp'] ?? time(),
            json_encode($message)
        ]);

        // Check for opt-out keywords
        $optOutKeywords = ['stop', 'unsubscribe', 'opreste', 'dezabonare'];
        if (in_array(strtolower(trim($body)), $optOutKeywords)) {
            // Find company by phone number and record opt-out
            // This requires matching the phone number to a company's WhatsApp settings
        }
    }
}
