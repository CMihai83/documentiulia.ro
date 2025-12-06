<?php
/**
 * Email Service
 * Handles all email communications with templates
 */

namespace DocumentIulia\Services;

class EmailService
{
    private $smtp_host;
    private $smtp_port;
    private $smtp_user;
    private $smtp_pass;
    private $from_email;
    private $from_name;
    private $use_sendgrid;
    private $sendgrid_api_key;

    public function __construct()
    {
        // Load configuration from environment
        $this->smtp_host = getenv('SMTP_HOST') ?: 'smtp.gmail.com';
        $this->smtp_port = getenv('SMTP_PORT') ?: 587;
        $this->smtp_user = getenv('SMTP_USER') ?: '';
        $this->smtp_pass = getenv('SMTP_PASS') ?: '';
        $this->from_email = getenv('FROM_EMAIL') ?: 'noreply@documentiulia.ro';
        $this->from_name = getenv('FROM_NAME') ?: 'DocumentIulia';
        $this->use_sendgrid = getenv('USE_SENDGRID') === 'true';
        $this->sendgrid_api_key = getenv('SENDGRID_API_KEY') ?: '';
    }

    /**
     * Send email using configured provider
     */
    public function send($to, $subject, $html, $text = null, $attachments = [])
    {
        if ($this->use_sendgrid && $this->sendgrid_api_key) {
            return $this->sendViaSendGrid($to, $subject, $html, $text, $attachments);
        } else {
            return $this->sendViaSMTP($to, $subject, $html, $text, $attachments);
        }
    }

    /**
     * Send via SMTP
     */
    private function sendViaSMTP($to, $subject, $html, $text, $attachments)
    {
        require_once __DIR__ . '/../../vendor/phpmailer/phpmailer/src/PHPMailer.php';
        require_once __DIR__ . '/../../vendor/phpmailer/phpmailer/src/SMTP.php';
        require_once __DIR__ . '/../../vendor/phpmailer/phpmailer/src/Exception.php';

        $mail = new \PHPMailer\PHPMailer\PHPMailer(true);

        try {
            // Server settings
            $mail->isSMTP();
            $mail->Host = $this->smtp_host;
            $mail->SMTPAuth = true;
            $mail->Username = $this->smtp_user;
            $mail->Password = $this->smtp_pass;
            $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port = $this->smtp_port;
            $mail->CharSet = 'UTF-8';

            // Recipients
            $mail->setFrom($this->from_email, $this->from_name);
            $mail->addAddress($to);

            // Content
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body = $html;
            if ($text) {
                $mail->AltBody = $text;
            }

            // Attachments
            foreach ($attachments as $attachment) {
                $mail->addAttachment($attachment['path'], $attachment['name'] ?? '');
            }

            $mail->send();
            return ['success' => true];
        } catch (\Exception $e) {
            error_log("Email send error: " . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Send via SendGrid
     */
    private function sendViaSendGrid($to, $subject, $html, $text, $attachments)
    {
        $email = new \SendGrid\Mail\Mail();
        $email->setFrom($this->from_email, $this->from_name);
        $email->setSubject($subject);
        $email->addTo($to);
        $email->addContent("text/html", $html);
        if ($text) {
            $email->addContent("text/plain", $text);
        }

        // Attachments
        foreach ($attachments as $attachment) {
            $file_encoded = base64_encode(file_get_contents($attachment['path']));
            $email->addAttachment(
                $file_encoded,
                mime_content_type($attachment['path']),
                $attachment['name'] ?? basename($attachment['path']),
                "attachment"
            );
        }

        $sendgrid = new \SendGrid($this->sendgrid_api_key);

        try {
            $response = $sendgrid->send($email);
            return [
                'success' => $response->statusCode() >= 200 && $response->statusCode() < 300,
                'status_code' => $response->statusCode()
            ];
        } catch (\Exception $e) {
            error_log("SendGrid error: " . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Load and render email template
     */
    private function renderTemplate($template_name, $variables)
    {
        $template_path = __DIR__ . '/../../templates/emails/' . $template_name . '.html';

        if (!file_exists($template_path)) {
            throw new \Exception("Email template not found: $template_name");
        }

        $html = file_get_contents($template_path);

        // Replace variables
        foreach ($variables as $key => $value) {
            $html = str_replace('{{' . $key . '}}', htmlspecialchars($value), $html);
        }

        return $html;
    }

    /**
     * Send welcome email to new user
     */
    public function sendWelcomeEmail($user)
    {
        $html = $this->renderTemplate('welcome', [
            'first_name' => $user['first_name'],
            'email' => $user['email'],
            'login_url' => 'https://documentiulia.ro/login'
        ]);

        return $this->send(
            $user['email'],
            'Bun venit la DocumentIulia!',
            $html
        );
    }

    /**
     * Send invoice email to customer
     */
    public function sendInvoiceEmail($invoice, $customer_email, $pdf_path)
    {
        $html = $this->renderTemplate('invoice', [
            'invoice_number' => $invoice['invoice_number'],
            'invoice_date' => $invoice['invoice_date'],
            'total_amount' => number_format($invoice['total_amount'], 2),
            'currency' => $invoice['currency'] ?? 'RON',
            'customer_name' => $invoice['customer_name'],
            'due_date' => $invoice['due_date']
        ]);

        return $this->send(
            $customer_email,
            "Factură #{$invoice['invoice_number']} - DocumentIulia",
            $html,
            null,
            [['path' => $pdf_path, 'name' => "Factura_{$invoice['invoice_number']}.pdf"]]
        );
    }

    /**
     * Send password reset email
     */
    public function sendPasswordResetEmail($user, $reset_token)
    {
        $reset_url = "https://documentiulia.ro/reset-password?token=$reset_token";

        $html = $this->renderTemplate('password_reset', [
            'first_name' => $user['first_name'],
            'reset_url' => $reset_url
        ]);

        return $this->send(
            $user['email'],
            'Resetare parolă - DocumentIulia',
            $html
        );
    }

    /**
     * Send e-Factura upload notification
     */
    public function sendEFacturaUploadNotification($invoice, $user_email, $status)
    {
        $status_text = $status === 'accepted' ? 'acceptată' : 'respinsă';
        $status_color = $status === 'accepted' ? '#10b981' : '#ef4444';

        $html = $this->renderTemplate('efactura_notification', [
            'invoice_number' => $invoice['invoice_number'],
            'status_text' => $status_text,
            'status_color' => $status_color,
            'upload_index' => $invoice['upload_index'] ?? 'N/A',
            'message' => $invoice['anaf_message'] ?? ''
        ]);

        return $this->send(
            $user_email,
            "e-Factura #{$invoice['invoice_number']} - Status: $status_text",
            $html
        );
    }

    /**
     * Send subscription expiration warning
     */
    public function sendSubscriptionExpiryWarning($user, $days_remaining)
    {
        $html = $this->renderTemplate('subscription_expiry', [
            'first_name' => $user['first_name'],
            'days_remaining' => $days_remaining,
            'renew_url' => 'https://documentiulia.ro/subscription/renew'
        ]);

        return $this->send(
            $user['email'],
            "Abonamentul tău expiră în $days_remaining zile",
            $html
        );
    }

    /**
     * Send monthly report email
     */
    public function sendMonthlyReport($user, $report_data)
    {
        $html = $this->renderTemplate('monthly_report', [
            'first_name' => $user['first_name'],
            'month' => $report_data['month'],
            'invoices_count' => $report_data['invoices_count'],
            'total_revenue' => number_format($report_data['total_revenue'], 2),
            'expenses_count' => $report_data['expenses_count'],
            'total_expenses' => number_format($report_data['total_expenses'], 2),
            'profit' => number_format($report_data['profit'], 2),
            'view_report_url' => $report_data['report_url']
        ]);

        return $this->send(
            $user['email'],
            "Raport lunar {$report_data['month']} - DocumentIulia",
            $html
        );
    }

    /**
     * Send new course available notification
     */
    public function sendNewCourseNotification($user, $course)
    {
        $html = $this->renderTemplate('new_course', [
            'first_name' => $user['first_name'],
            'course_title' => $course['title'],
            'course_description' => $course['description'],
            'course_url' => $course['url'],
            'instructor' => $course['instructor']
        ]);

        return $this->send(
            $user['email'],
            "Curs nou disponibil: {$course['title']}",
            $html
        );
    }
}
