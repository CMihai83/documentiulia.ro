# Email Templates Documentation

**Location:** `/var/www/documentiulia.ro/templates/emails/`
**Service Class:** `/var/www/documentiulia.ro/includes/services/EmailService.php`

---

## Template List

### 1. welcome.html ✅ CREATED
**Purpose:** Welcome email for new users
**Variables:**
- `{{first_name}}` - User's first name
- `{{email}}` - User's email
- `{{login_url}}` - Login page URL

**Usage:**
```php
$emailService->sendWelcomeEmail($user);
```

---

### 2. invoice.html
**Purpose:** Send invoice to customer with PDF attachment
**Variables:**
- `{{invoice_number}}` - Invoice number
- `{{invoice_date}}` - Invoice date
- `{{total_amount}}` - Total amount formatted
- `{{currency}}` - Currency (RON/EUR/USD)
- `{{customer_name}}` - Customer name
- `{{due_date}}` - Payment due date

**Content:**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
        .header { background: #2563eb; padding: 20px; color: white; text-align: center; }
        .content { padding: 30px; }
        .invoice-details { background: #f3f4f6; padding: 15px; margin: 20px 0; border-radius: 6px; }
        .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Factură #{{invoice_number}}</h1>
    </div>
    <div class="content">
        <p>Bună ziua {{customer_name}},</p>
        <p>Vă mulțumim pentru colaborare! Vă transmitem factura în atașament.</p>
        <div class="invoice-details">
            <p><strong>Număr factură:</strong> {{invoice_number}}</p>
            <p><strong>Data:</strong> {{invoice_date}}</p>
            <p><strong>Total:</strong> {{total_amount}} {{currency}}</p>
            <p><strong>Scadență:</strong> {{due_date}}</p>
        </div>
        <p>Factura este atașată la acest email în format PDF.</p>
        <p>Pentru plată, vă rugăm să folosiți datele menționate în factură.</p>
        <p>Cu stimă,<br><strong>Echipa DocumentIulia</strong></p>
    </div>
</body>
</html>
```

---

### 3. password_reset.html
**Purpose:** Password reset email
**Variables:**
- `{{first_name}}` - User's first name
- `{{reset_url}}` - Password reset URL with token

**Content:**
```html
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>body{font-family:Arial;max-width:600px;margin:0 auto}.header{background:#2563eb;padding:20px;color:white;text-align:center}.content{padding:30px}.button{display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:6px}</style></head>
<body>
<div class="header"><h1>Resetare Parolă</h1></div>
<div class="content">
<p>Salut {{first_name}},</p>
<p>Am primit o solicitare de resetare a parolei pentru contul tău DocumentIulia.</p>
<p><a href="{{reset_url}}" class="button">Resetează Parola</a></p>
<p>Linkul este valabil 1 oră.</p>
<p>Dacă nu ai solicitat această resetare, poți ignora acest email.</p>
</div>
</body>
</html>
```

---

### 4. efactura_notification.html
**Purpose:** Notify user of e-Factura upload status
**Variables:**
- `{{invoice_number}}` - Invoice number
- `{{status_text}}` - Status text (acceptată/respinsă)
- `{{status_color}}` - Status color (#10b981 green or #ef4444 red)
- `{{upload_index}}` - ANAF upload index
- `{{message}}` - ANAF message

**Content:**
```html
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>body{font-family:Arial;max-width:600px;margin:0 auto}.header{background:#2563eb;padding:20px;color:white;text-align:center}.content{padding:30px}.status-badge{display:inline-block;padding:8px 16px;border-radius:6px;font-weight:bold;color:white}</style></head>
<body>
<div class="header"><h1>e-Factura - Update Status</h1></div>
<div class="content">
<p>Factura #{{invoice_number}} a fost <span class="status-badge" style="background-color:{{status_color}}">{{status_text}}</span> de ANAF.</p>
<p><strong>Index încărcare:</strong> {{upload_index}}</p>
<p><strong>Mesaj ANAF:</strong> {{message}}</p>
<p>Poți verifica detaliile în contul tău DocumentIulia.</p>
</div>
</body>
</html>
```

---

### 5. subscription_expiry.html
**Purpose:** Warn user about subscription expiration
**Variables:**
- `{{first_name}}` - User's first name
- `{{days_remaining}}` - Days until expiration
- `{{renew_url}}` - Renewal page URL

**Content:**
```html
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>body{font-family:Arial;max-width:600px;margin:0 auto}.header{background:#f59e0b;padding:20px;color:white;text-align:center}.content{padding:30px}.warning{background:#fef3c7;border-left:4px solid #f59e0b;padding:15px;margin:20px 0}.button{display:inline-block;padding:12px 24px;background:#f59e0b;color:white;text-decoration:none;border-radius:6px}</style></head>
<body>
<div class="header"><h1>⚠️ Abonamentul Expiră</h1></div>
<div class="content">
<p>Salut {{first_name}},</p>
<div class="warning">
<p><strong>Abonamentul tău DocumentIulia expiră în {{days_remaining}} zile!</strong></p>
</div>
<p>Pentru a continua să beneficiezi de toate funcționalitățile, te rugăm să-ți reînnoiești abonamentul.</p>
<p><a href="{{renew_url}}" class="button">Reînnoire Abonament</a></p>
</div>
</body>
</html>
```

---

### 6. monthly_report.html
**Purpose:** Monthly financial report summary
**Variables:**
- `{{first_name}}` - User's first name
- `{{month}}` - Month name
- `{{invoices_count}}` - Number of invoices
- `{{total_revenue}}` - Total revenue
- `{{expenses_count}}` - Number of expenses
- `{{total_expenses}}` - Total expenses
- `{{profit}}` - Net profit
- `{{view_report_url}}` - Full report URL

**Content:**
```html
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>body{font-family:Arial;max-width:600px;margin:0 auto}.header{background:#2563eb;padding:20px;color:white;text-align:center}.content{padding:30px}.stats{background:#f3f4f6;padding:20px;margin:20px 0;border-radius:6px}.stat-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e5e7eb}.button{display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:6px}</style></head>
<body>
<div class="header"><h1>📊 Raport Lunar {{month}}</h1></div>
<div class="content">
<p>Salut {{first_name}},</p>
<p>Iată raportul tău financiar pentru luna {{month}}:</p>
<div class="stats">
<div class="stat-row"><span>Facturi emise:</span><strong>{{invoices_count}}</strong></div>
<div class="stat-row"><span>Venituri totale:</span><strong>{{total_revenue}} RON</strong></div>
<div class="stat-row"><span>Cheltuieli:</span><strong>{{expenses_count}}</strong></div>
<div class="stat-row"><span>Total cheltuieli:</span><strong>{{total_expenses}} RON</strong></div>
<div class="stat-row"><span>Profit net:</span><strong style="color:#10b981">{{profit}} RON</strong></div>
</div>
<p><a href="{{view_report_url}}" class="button">Vezi Raport Complet</a></p>
</div>
</body>
</html>
```

---

### 7. new_course.html
**Purpose:** Notify user of new course availability
**Variables:**
- `{{first_name}}` - User's first name
- `{{course_title}}` - Course title
- `{{course_description}}` - Course description
- `{{course_url}}` - Course page URL
- `{{instructor}}` - Instructor name

**Content:**
```html
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>body{font-family:Arial;max-width:600px;margin:0 auto}.header{background:#10b981;padding:20px;color:white;text-align:center}.content{padding:30px}.course-box{background:#d1fae5;border-left:4px solid #10b981;padding:20px;margin:20px 0;border-radius:6px}.button{display:inline-block;padding:12px 24px;background:#10b981;color:white;text-decoration:none;border-radius:6px}</style></head>
<body>
<div class="header"><h1>🎓 Curs Nou Disponibil!</h1></div>
<div class="content">
<p>Salut {{first_name}},</p>
<p>Un curs nou este acum disponibil pe platforma DocumentIulia:</p>
<div class="course-box">
<h2 style="margin-top:0">{{course_title}}</h2>
<p>{{course_description}}</p>
<p><strong>Instructor:</strong> {{instructor}}</p>
</div>
<p><a href="{{course_url}}" class="button">Începe Cursul</a></p>
</div>
</body>
</html>
```

---

## Setup Instructions

### 1. Install PHPMailer

```bash
cd /var/www/documentiulia.ro
composer require phpmailer/phpmailer
```

### 2. Configure Environment Variables

Add to `.env`:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@documentiulia.ro
FROM_NAME=DocumentIulia

# Or use SendGrid
USE_SENDGRID=false
SENDGRID_API_KEY=SG.xxxxx
```

### 3. Create Missing Templates

Run this script to create all template files:

```bash
cd /var/www/documentiulia.ro/templates/emails

# Create invoice.html
cat > invoice.html << 'EOF'
[Copy HTML content from above]
EOF

# Create password_reset.html
cat > password_reset.html << 'EOF'
[Copy HTML content from above]
EOF

# And so on for all templates...
```

### 4. Test Email Service

```php
<?php
require_once 'includes/services/EmailService.php';

$emailService = new \DocumentIulia\Services\EmailService();

// Test welcome email
$result = $emailService->sendWelcomeEmail([
    'first_name' => 'Ion',
    'email' => 'test@example.com'
]);

var_dump($result);
```

---

## Usage Examples

### Send Invoice Email

```php
$emailService = new \DocumentIulia\Services\EmailService();

$result = $emailService->sendInvoiceEmail(
    $invoice,
    'customer@example.com',
    '/path/to/invoice.pdf'
);

if ($result['success']) {
    echo "Email sent successfully!";
} else {
    echo "Error: " . $result['error'];
}
```

### Send e-Factura Notification

```php
$emailService->sendEFacturaUploadNotification(
    $invoice,
    'user@example.com',
    'accepted'
);
```

### Send Monthly Report

```php
$emailService->sendMonthlyReport($user, [
    'month' => 'Noiembrie 2025',
    'invoices_count' => 45,
    'total_revenue' => 125000,
    'expenses_count' => 32,
    'total_expenses' => 85000,
    'profit' => 40000,
    'report_url' => 'https://documentiulia.ro/reports/november-2025'
]);
```

---

## Email Service Features

✅ **Dual Provider Support:** SMTP (PHPMailer) or SendGrid
✅ **Template System:** HTML templates with variable replacement
✅ **Attachments:** Support for PDF invoices and other files
✅ **Error Handling:** Comprehensive error logging
✅ **UTF-8 Support:** Full Romanian character support
✅ **Responsive Design:** Mobile-friendly email templates
✅ **Security:** Proper encoding and validation

---

## Production Checklist

- [ ] Set up SMTP server or SendGrid account
- [ ] Configure SPF/DKIM/DMARC for sender domain
- [ ] Test all email templates
- [ ] Set up email queue for high volume
- [ ] Configure bounce handling
- [ ] Add unsubscribe functionality
- [ ] Set up email analytics
- [ ] Test spam score with mail-tester.com
- [ ] Create email sending limits
- [ ] Set up monitoring and alerts

---

**Status:** EmailService.php ✅ COMPLETE | Templates: 7/7 documented
**Next:** Create remaining HTML template files, test email delivery
