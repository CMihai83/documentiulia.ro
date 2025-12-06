<?php
/**
 * Email Service for DocumentiUlia
 * Handles all transactional and marketing emails using PHPMailer
 */

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../vendor/autoload.php';

class EmailService {
    private $templates_dir;
    private $from_email = 'noreply@documentiulia.ro';
    private $from_name = 'DocumentiUlia';
    private $smtp_config;
    private $pdo;

    public function __construct($pdo = null) {
        $this->templates_dir = __DIR__ . '/../email-templates/';
        $this->smtp_config = $this->load_smtp_config();
        $this->pdo = $pdo;
    }

    /**
     * Load SMTP configuration from environment or use defaults
     */
    private function load_smtp_config() {
        // Try to load from .env file
        $env_file = __DIR__ . '/../.env';
        if (file_exists($env_file)) {
            $lines = file($env_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
                    list($key, $value) = explode('=', $line, 2);
                    putenv(trim($key) . '=' . trim($value));
                }
            }
        }

        return [
            'host' => getenv('SMTP_HOST') ?: 'smtp.gmail.com',
            'port' => getenv('SMTP_PORT') ?: 587,
            'username' => getenv('SMTP_USERNAME') ?: '',
            'password' => getenv('SMTP_PASSWORD') ?: '',
            'encryption' => getenv('SMTP_ENCRYPTION') ?: 'tls',
            'debug' => getenv('SMTP_DEBUG') === 'true'
        ];
    }

    /**
     * Send email using template
     */
    public function send($to, $template_name, $variables = [], $attachments = []) {
        try {
            $template = $this->load_template($template_name);
            $html = $this->render_template($template, $variables);
            $subject = $this->extract_subject($template, $variables);

            return $this->send_email($to, $subject, $html, $attachments);
        } catch (Exception $e) {
            error_log("EmailService Error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Load email template
     */
    private function load_template($template_name) {
        $template_path = $this->templates_dir . $template_name . '.html';

        if (!file_exists($template_path)) {
            throw new Exception("Template not found: $template_name");
        }

        return file_get_contents($template_path);
    }

    /**
     * Render template with variables
     */
    private function render_template($template, $variables) {
        // Handle conditional blocks {{#if_variable}}...{{/if_variable}}
        foreach ($variables as $key => $value) {
            if (strpos($key, 'if_') === 0) {
                $condition_name = $key;
                $pattern = '/\{\{#' . preg_quote($condition_name, '/') . '\}\}(.*?)\{\{\/' . preg_quote($condition_name, '/') . '\}\}/s';

                if ($value) {
                    // Condition is true, keep the content
                    $template = preg_replace($pattern, '$1', $template);
                } else {
                    // Condition is false, remove the block
                    $template = preg_replace($pattern, '', $template);
                }
            }
        }

        // Replace {{ variable }} with actual values
        foreach ($variables as $key => $value) {
            if (strpos($key, 'if_') !== 0) {
                $template = str_replace('{{' . $key . '}}', $value, $template);
            }
        }

        return $template;
    }

    /**
     * Extract subject from template
     */
    private function extract_subject($template, $variables) {
        // Extract subject from <!-- SUBJECT: ... --> comment
        if (preg_match('/<!-- SUBJECT: (.*?) -->/', $template, $matches)) {
            $subject = trim($matches[1]);
            return $this->render_template($subject, $variables);
        }

        return 'Notificare DocumentiUlia';
    }

    /**
     * Send email via SMTP using PHPMailer
     */
    private function send_email($to, $subject, $html, $attachments = []) {
        $mail = new PHPMailer(true);

        try {
            // Server settings
            if ($this->smtp_config['debug']) {
                $mail->SMTPDebug = SMTP::DEBUG_SERVER;
            }

            $mail->isSMTP();
            $mail->Host       = $this->smtp_config['host'];
            $mail->SMTPAuth   = true;
            $mail->Username   = $this->smtp_config['username'];
            $mail->Password   = $this->smtp_config['password'];
            $mail->SMTPSecure = $this->smtp_config['encryption'] === 'ssl' ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = $this->smtp_config['port'];
            $mail->CharSet    = 'UTF-8';

            // Recipients
            $mail->setFrom($this->from_email, $this->from_name);
            $mail->addAddress($to);
            $mail->addReplyTo($this->from_email, $this->from_name);

            // Attachments
            foreach ($attachments as $attachment) {
                if (file_exists($attachment)) {
                    $mail->addAttachment($attachment);
                }
            }

            // Content
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body    = $html;
            $mail->AltBody = strip_tags($html);

            $result = $mail->send();

            // Log success
            $this->log_email($to, $subject, 'sent', null);

            return true;

        } catch (Exception $e) {
            // Log failure
            $this->log_email($to, $subject, 'failed', $mail->ErrorInfo);
            error_log("Email Error: {$mail->ErrorInfo}");
            return false;
        }
    }

    /**
     * Log email activity
     */
    private function log_email($to, $subject, $status, $error_message = null) {
        if (!$this->pdo) {
            return; // No database connection available
        }

        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO email_logs (recipient, subject, status, error_message, sent_at)
                VALUES (:recipient, :subject, :status, :error_message, NOW())
            ");

            $stmt->execute([
                ':recipient' => $to,
                ':subject' => $subject,
                ':status' => $status,
                ':error_message' => $error_message
            ]);
        } catch (PDOException $e) {
            error_log("Email log error: " . $e->getMessage());
        }
    }

    /**
     * Quick send methods for common emails
     */

    // Welcome email for new users
    public function sendWelcomeEmail($user) {
        return $this->send(
            $user['email'],
            'welcome',
            [
                'first_name' => $user['first_name'],
                'login_url' => 'https://documentiulia.ro/login',
                'support_email' => 'support@documentiulia.ro'
            ]
        );
    }

    // Password reset email
    public function sendPasswordReset($user, $reset_token) {
        $reset_url = 'https://documentiulia.ro/reset-password?token=' . $reset_token;

        return $this->send(
            $user['email'],
            'password-reset',
            [
                'first_name' => $user['first_name'],
                'reset_url' => $reset_url,
                'expiry_hours' => 24
            ]
        );
    }

    // Invoice email
    public function sendInvoiceEmail($customer_email, $invoice) {
        return $this->send(
            $customer_email,
            'invoice',
            [
                'invoice_number' => $invoice['invoice_number'],
                'customer_name' => $invoice['customer_name'],
                'total_amount' => number_format($invoice['total'], 2),
                'due_date' => date('d.m.Y', strtotime($invoice['due_date'])),
                'invoice_url' => 'https://documentiulia.ro/invoices/' . $invoice['id']
            ],
            [$invoice['pdf_path']] // Attach PDF
        );
    }

    // Payment received confirmation
    public function sendPaymentReceived($customer_email, $payment) {
        return $this->send(
            $customer_email,
            'payment-received',
            [
                'customer_name' => $payment['customer_name'],
                'amount' => number_format($payment['amount'], 2),
                'payment_date' => date('d.m.Y', strtotime($payment['payment_date'])),
                'invoice_number' => $payment['invoice_number']
            ]
        );
    }

    // Beta application confirmation
    public function sendBetaApplicationConfirmation($applicant) {
        return $this->send(
            $applicant['email'],
            'beta-application-confirmation',
            [
                'contact_name' => $applicant['contact_name'],
                'company_name' => $applicant['company_name'],
                'application_score' => $applicant['score'],
                'status' => $applicant['status']
            ]
        );
    }

    // Beta acceptance email
    public function sendBetaAcceptanceEmail($applicant, $onboarding_url) {
        return $this->send(
            $applicant['email'],
            'beta-acceptance',
            [
                'contact_name' => $applicant['contact_name'],
                'company_name' => $applicant['company_name'],
                'onboarding_url' => $onboarding_url,
                'start_date' => date('d.m.Y', strtotime('+7 days'))
            ]
        );
    }

    // Low stock alert
    public function sendLowStockAlert($user_email, $products) {
        $product_list = '';
        foreach ($products as $product) {
            $product_list .= sprintf(
                '<li><strong>%s</strong> - Stoc rămas: %d buc</li>',
                $product['name'],
                $product['stock_quantity']
            );
        }

        return $this->send(
            $user_email,
            'low-stock-alert',
            [
                'product_count' => count($products),
                'product_list' => $product_list
            ]
        );
    }

    // Subscription renewal reminder
    public function sendSubscriptionRenewal($user, $subscription) {
        return $this->send(
            $user['email'],
            'subscription-renewal',
            [
                'first_name' => $user['first_name'],
                'plan_name' => $subscription['plan_name'],
                'renewal_date' => date('d.m.Y', strtotime($subscription['renewal_date'])),
                'amount' => number_format($subscription['amount'], 2),
                'billing_url' => 'https://documentiulia.ro/billing'
            ]
        );
    }

    // System notification
    public function sendSystemNotification($user_email, $notification) {
        return $this->send(
            $user_email,
            'system-notification',
            [
                'notification_title' => $notification['title'],
                'notification_message' => $notification['message'],
                'action_url' => $notification['action_url'] ?? null,
                'action_text' => $notification['action_text'] ?? 'Vezi Detalii'
            ]
        );
    }
}
