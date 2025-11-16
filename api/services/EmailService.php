<?php
/**
 * Email Service
 * Handles all email sending operations using SendGrid
 */

require_once __DIR__ . '/../config/env.php';

class EmailService {
    private $from_email;
    private $from_name;
    private $enabled;

    public function __construct() {
        $this->from_email = Env::get('SENDGRID_FROM_EMAIL', 'noreply@documentiulia.ro');
        $this->from_name = Env::get('SENDGRID_FROM_NAME', 'Documentiulia');
        $this->enabled = Env::getBool('ENABLE_EMAIL_SENDING', false);
    }

    /**
     * Send invoice email with PDF attachment
     */
    public function sendInvoiceEmail($invoice, $pdfPath) {
        $to = $invoice['customer_email'];
        $subject = "Factură {$invoice['invoice_number']} - {$invoice['company_name']}";

        $html = $this->getInvoiceEmailTemplate($invoice);

        return $this->sendEmail($to, $subject, $html, $pdfPath);
    }

    /**
     * Send payment confirmation email
     */
    public function sendPaymentConfirmationEmail($userEmail, $paymentDetails) {
        $subject = "Confirmare plată - Documentiulia";
        $html = $this->getPaymentConfirmationTemplate($paymentDetails);

        return $this->sendEmail($userEmail, $subject, $html);
    }

    /**
     * Send payment reminder email
     */
    public function sendPaymentReminderEmail($invoice, $reminderType) {
        $to = $invoice['customer_email'];
        $subject = $this->getReminderSubject($reminderType, $invoice['invoice_number']);
        $html = $this->getPaymentReminderTemplate($invoice, $reminderType);

        return $this->sendEmail($to, $subject, $html);
    }

    /**
     * Send course enrollment confirmation
     */
    public function sendCourseEnrollmentEmail($userEmail, $courseName) {
        $subject = "Bine ai venit la cursul: {$courseName}";
        $html = $this->getCourseEnrollmentTemplate($courseName);

        return $this->sendEmail($userEmail, $subject, $html);
    }

    /**
     * Generic email sending function
     */
    private function sendEmail($to, $subject, $html, $attachmentPath = null) {
        // Log email attempt
        $logEntry = [
            'timestamp' => date('Y-m-d H:i:s'),
            'to' => $to,
            'subject' => $subject,
            'has_attachment' => $attachmentPath !== null
        ];

        // If email sending is disabled, just log
        if (!$this->enabled) {
            error_log('EMAIL QUEUED (disabled): ' . json_encode($logEntry));
            return [
                'success' => true,
                'message' => 'Email logged (sending disabled in config)',
                'details' => $logEntry
            ];
        }

        // Check if SendGrid API key is configured
        $apiKey = Env::get('SENDGRID_API_KEY');
        if (!$apiKey || strpos($apiKey, 'REPLACE') !== false) {
            error_log('EMAIL QUEUED (no API key): ' . json_encode($logEntry));
            return [
                'success' => true,
                'message' => 'Email logged (SendGrid API key not configured)',
                'details' => $logEntry
            ];
        }

        // Use SendGrid to send email
        require_once __DIR__ . '/../../vendor/autoload.php';

        $email = new \SendGrid\Mail\Mail();
        $email->setFrom($this->from_email, $this->from_name);
        $email->setSubject($subject);
        $email->addTo($to);
        $email->addContent("text/html", $html);

        if ($attachmentPath && file_exists($attachmentPath)) {
            $fileData = base64_encode(file_get_contents($attachmentPath));
            $email->addAttachment(
                $fileData,
                "application/pdf",
                basename($attachmentPath),
                "attachment"
            );
        }

        $sendgrid = new \SendGrid($apiKey);

        try {
            $response = $sendgrid->send($email);
            error_log('EMAIL SENT: ' . json_encode($logEntry));
            return [
                'success' => true,
                'status_code' => $response->statusCode()
            ];
        } catch (Exception $e) {
            error_log('SendGrid error: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Invoice email template
     */
    private function getInvoiceEmailTemplate($invoice) {
        $currency = $invoice['currency'] ?? 'RON';

        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <style>
                body { font-family: Arial, sans-serif; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
                .content { padding: 30px 20px; background-color: #f9f9f9; }
                .invoice-details { background-color: white; padding: 20px; margin: 20px 0; border-left: 4px solid #0066cc; }
                .button { display: inline-block; padding: 12px 30px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>Factură Nouă</h1>
                </div>
                <div class='content'>
                    <p>Bună ziua,</p>
                    <p>Ați primit o factură nouă de la <strong>{$invoice['company_name']}</strong>.</p>

                    <div class='invoice-details'>
                        <h3>Detalii Factură</h3>
                        <p><strong>Număr:</strong> {$invoice['invoice_number']}</p>
                        <p><strong>Data:</strong> {$invoice['invoice_date']}</p>
                        <p><strong>Scadență:</strong> {$invoice['due_date']}</p>
                        <p><strong>Total:</strong> " . number_format($invoice['total_amount'], 2) . " {$currency}</p>
                        <p><strong>De plată:</strong> " . number_format($invoice['amount_due'], 2) . " {$currency}</p>
                    </div>

                    <p>Factura completă este atașată la acest email în format PDF.</p>

                    <center>
                        <a href='https://documentiulia.ro/invoices/{$invoice['id']}' class='button'>Vezi Factura Online</a>
                    </center>

                    <p>Pentru întrebări sau clarificări, nu ezitați să ne contactați.</p>

                    <p>Cu stimă,<br>
                    <strong>{$invoice['company_name']}</strong></p>
                </div>
                <div class='footer'>
                    <p>Acest email a fost generat automat de platforma Documentiulia.ro</p>
                </div>
            </div>
        </body>
        </html>
        ";
    }

    /**
     * Payment confirmation template
     */
    private function getPaymentConfirmationTemplate($paymentDetails) {
        return "
        <html>
        <body style='font-family: Arial, sans-serif;'>
            <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                <h2 style='color: #28a745;'>✓ Plată Confirmată</h2>
                <p>Plata dvs. a fost procesată cu succes!</p>
                <div style='background-color: #f0f0f0; padding: 15px; margin: 20px 0;'>
                    <p><strong>Sumă:</strong> {$paymentDetails['amount']} {$paymentDetails['currency']}</p>
                    <p><strong>Data:</strong> " . date('Y-m-d H:i:s') . "</p>
                </div>
                <p>Vă mulțumim!</p>
            </div>
        </body>
        </html>
        ";
    }

    /**
     * Payment reminder template
     */
    private function getPaymentReminderTemplate($invoice, $reminderType) {
        $messages = [
            'before_due' => 'Vă reamintim că factura urmează să ajungă la scadență în 3 zile.',
            'on_due' => 'Factura ajunge la scadență astăzi.',
            'overdue_7' => 'Factura este restantă de 7 zile.',
            'overdue_14' => 'Factura este restantă de 14 zile.',
            'overdue_30' => 'Factura este restantă de 30 de zile.'
        ];

        $message = $messages[$reminderType] ?? 'Reamintire de plată';

        return "
        <html>
        <body style='font-family: Arial, sans-serif;'>
            <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                <h2>Reminder: Factură {$invoice['invoice_number']}</h2>
                <p>{$message}</p>
                <div style='background-color: #fff3cd; padding: 15px; margin: 20px 0; border-left: 4px solid #ffc107;'>
                    <p><strong>Factură:</strong> {$invoice['invoice_number']}</p>
                    <p><strong>Scadență:</strong> {$invoice['due_date']}</p>
                    <p><strong>Suma:</strong> {$invoice['amount_due']} {$invoice['currency']}</p>
                </div>
                <p>Pentru detalii complete, consultați factura atașată.</p>
            </div>
        </body>
        </html>
        ";
    }

    /**
     * Course enrollment template
     */
    private function getCourseEnrollmentTemplate($courseName) {
        return "
        <html>
        <body style='font-family: Arial, sans-serif;'>
            <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                <h2 style='color: #0066cc;'>Bine ai venit la {$courseName}!</h2>
                <p>Înscrierea ta a fost confirmată cu succes.</p>
                <p><a href='https://documentiulia.ro/courses' style='display: inline-block; padding: 12px 30px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 5px;'>Începe Cursul</a></p>
            </div>
        </body>
        </html>
        ";
    }

    /**
     * Get reminder email subject
     */
    private function getReminderSubject($reminderType, $invoiceNumber) {
        $subjects = [
            'before_due' => "Reminder: Factură {$invoiceNumber} scade în 3 zile",
            'on_due' => "Reminder: Factură {$invoiceNumber} scade astăzi",
            'overdue_7' => "URGENT: Factură {$invoiceNumber} restantă 7 zile",
            'overdue_14' => "URGENT: Factură {$invoiceNumber} restantă 14 zile",
            'overdue_30' => "FINAL NOTICE: Factură {$invoiceNumber} restantă 30 zile"
        ];

        return $subjects[$reminderType] ?? "Reminder: Factură {$invoiceNumber}";
    }
}
