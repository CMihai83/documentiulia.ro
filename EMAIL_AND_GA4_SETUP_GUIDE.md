# 📧 Email Service & Google Analytics 4 Setup Guide

**Created:** 2025-11-19
**Status:** Ready for Configuration
**Priority:** HIGH (Required for Production Launch)

---

## Table of Contents

1. [Email Service Setup](#email-service-setup)
2. [Google Analytics 4 Setup](#google-analytics-4-setup)
3. [Testing & Verification](#testing--verification)
4. [Troubleshooting](#troubleshooting)

---

## Email Service Setup

### Overview

The email service is **fully implemented** using PHPMailer and ready to send confirmation emails to beta applicants. You just need to configure SMTP credentials.

### Components Installed

✅ PHPMailer 7.0 (via Composer)
✅ EmailService class (`/includes/EmailService.php`)
✅ Email templates (6 templates in `/email-templates/`)
✅ Database logging (`email_logs` table)
✅ Auto-send on beta application submission

---

### Option A: SendGrid (Recommended for Production)

**Why SendGrid?**
- ✅ 100 emails/day free tier
- ✅ High deliverability rate
- ✅ Professional sender reputation
- ✅ Detailed analytics
- ✅ No spam folder issues

**Setup Steps:**

1. **Create SendGrid Account**
   ```
   Go to: https://sendgrid.com/pricing/
   Click: Start For Free
   Complete: Email verification
   ```

2. **Create API Key**
   ```
   Navigate to: Settings → API Keys
   Click: Create API Key
   Name: DocumentiUlia Production
   Permissions: Full Access (or just Mail Send)
   Copy: API Key (you won't see it again!)
   ```

3. **Verify Sender Email**
   ```
   Navigate to: Settings → Sender Authentication
   Click: Verify a Single Sender
   Enter: noreply@documentiulia.ro (or your domain email)
   Complete: Email verification process
   ```

4. **Configure .env File**
   ```bash
   # SSH into server
   ssh root@95.216.112.59

   # Edit .env file
   nano /var/www/documentiulia.ro/.env
   ```

   Update these lines:
   ```env
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USERNAME=apikey
   SMTP_PASSWORD=YOUR_SENDGRID_API_KEY_HERE
   SMTP_ENCRYPTION=tls
   SMTP_DEBUG=false
   ```

   Save: `Ctrl+X`, `Y`, `Enter`

5. **Test Email Sending**
   ```bash
   php /var/www/documentiulia.ro/test_email_service.php
   ```

---

### Option B: Gmail (Quick Testing Only)

**⚠️ Warning:** Gmail has daily sending limits (500 emails/day) and may mark you as spam. Use only for testing!

**Setup Steps:**

1. **Enable 2-Factor Authentication**
   ```
   Go to: https://myaccount.google.com/security
   Enable: 2-Step Verification
   ```

2. **Create App Password**
   ```
   Go to: https://myaccount.google.com/apppasswords
   Select App: Mail
   Select Device: Other (DocumentiUlia)
   Generate: Copy the 16-character password
   ```

3. **Configure .env File**
   ```bash
   nano /var/www/documentiulia.ro/.env
   ```

   Update:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=your-email@gmail.com
   SMTP_PASSWORD=xxxx xxxx xxxx xxxx  # 16-char app password
   SMTP_ENCRYPTION=tls
   SMTP_DEBUG=false
   ```

4. **Test**
   ```bash
   php /var/www/documentiulia.ro/test_email_service.php
   ```

---

### Email Templates Available

| Template | Purpose | Triggered By |
|----------|---------|--------------|
| `welcome.html` | New user welcome | User registration |
| `password-reset.html` | Password reset link | Password reset request |
| `invoice.html` | Invoice notification | Invoice created |
| `beta-acceptance.html` | Beta program acceptance | Manual approval |
| `beta-application-confirmation.html` | Application received | **Auto-sent on beta application** |
| `low-stock-alert.html` | Inventory alert | Stock below threshold |

---

### Current Email Flow

**Beta Application Submission:**

1. User submits form at `/beta-application.html`
2. POST to `/api/v1/beta/applications.php`
3. Data saved to `beta_applications` table
4. Auto-scoring calculated (0-100)
5. **Email automatically sent** via `EmailService`
6. Email logged to `email_logs` table

**Email Content Based on Status:**

- **Accepted (score ≥ 60):** Congratulations + next steps
- **Pending (score 30-59):** Under review + expect response in 48h
- **Waitlist (score < 30):** Added to waitlist + alternative options

---

### Monitoring Email Delivery

**Check Email Logs:**
```sql
psql -U accountech_app -d accountech_production

SELECT
    recipient,
    subject,
    status,
    sent_at,
    error_message
FROM email_logs
ORDER BY sent_at DESC
LIMIT 20;
```

**Email Statuses:**
- `sent`: Email successfully sent via SMTP
- `failed`: SMTP error (check `error_message` column)

**Check PHP Error Logs:**
```bash
tail -f /var/log/php8.2-fpm.log | grep -i "email"
```

---

## Google Analytics 4 Setup

### Overview

GA4 tracking is **fully implemented** in the beta application page. You just need to create a GA4 property and add the Measurement ID.

### Components Installed

✅ GA4 configuration script (`/public/ga4-config.js`)
✅ Event tracking functions
✅ Integration with beta application form
✅ Custom events for conversion tracking

---

### Setup Steps

#### 1. Create Google Analytics 4 Property

1. **Go to Google Analytics**
   ```
   URL: https://analytics.google.com
   Sign in with your Google account
   ```

2. **Create Account**
   ```
   Click: Admin (bottom left gear icon)
   Click: + Create Account
   Name: DocumentiUlia
   Data sharing: Select all (recommended)
   Click: Next
   ```

3. **Create Property**
   ```
   Property name: DocumentiUlia Production
   Reporting time zone: (GMT+02:00) Europe/Bucharest
   Currency: Euro (EUR)
   Click: Next
   ```

4. **Business Information**
   ```
   Industry: Technology or Business & Industrial
   Business size: Small (1-10 employees)
   How you plan to use: Measure customer engagement, optimize marketing
   Click: Create
   Accept: Terms of Service
   ```

5. **Create Data Stream**
   ```
   Platform: Web
   Website URL: https://documentiulia.ro
   Stream name: DocumentiUlia Website
   Enhanced measurement: Enable all (recommended)
   Click: Create Stream
   ```

6. **Copy Measurement ID**
   ```
   Format: G-XXXXXXXXXX (10 characters after G-)
   Example: G-ABC123XYZ4
   ```

   **⚠️ IMPORTANT:** Save this ID - you'll need it in the next step!

---

#### 2. Configure GA4 Measurement ID

**Edit the configuration file:**

```bash
# SSH into server
ssh root@95.216.112.59

# Edit GA4 config
nano /var/www/documentiulia.ro/public/ga4-config.js
```

**Find this line:**
```javascript
measurementId: 'G-XXXXXXXXXX', // Replace with your actual GA4 Measurement ID
```

**Replace with your ID:**
```javascript
measurementId: 'G-ABC123XYZ4', // Your actual Measurement ID
```

**Save:** `Ctrl+X`, `Y`, `Enter`

---

#### 3. Verify Tracking is Working

1. **Open Beta Page in Browser**
   ```
   URL: https://documentiulia.ro/beta-application.html
   Open Browser Console: F12 (Developer Tools)
   ```

2. **Check Console Output**
   ```
   You should see:
   ✓ "GA4 initialized: G-ABC123XYZ4"
   ```

3. **View Real-Time Data in GA4**
   ```
   Go to: Google Analytics → Reports → Realtime
   You should see: 1 user online (yourself)
   Location: Your current location
   Page: /beta-application.html
   ```

4. **Test Event Tracking**
   ```
   Fill out the beta application form
   Submit the form
   Check Console: "GA4 Event: beta_application_completed {...}"
   ```

5. **Verify in GA4**
   ```
   Go to: Reports → Realtime → Event count by Event name
   You should see: beta_application_completed (1 event)
   ```

---

### Custom Events Tracked

| Event Name | When Fired | Parameters |
|------------|------------|------------|
| `beta_application_started` | User visits beta page | `page_location`, `page_title` |
| `beta_application_completed` | Form submitted successfully | `company_type`, `num_products`, `num_employees`, `application_score`, `auto_accepted` |
| `beta_application_accepted` | Application auto-accepted | Same as completed + status |
| `beta_application_pending` | Application pending review | Same as completed + status |
| `beta_application_waitlist` | Application waitlisted | Same as completed + status |
| `form_field_focused` | User clicks on form field | `field_name` |
| `form_validation_error` | Form validation fails | `field_name`, `error_message` |

---

### Creating Conversion Goals

**Track Beta Applications as Conversions:**

1. **Go to GA4 Admin**
   ```
   Admin → Events
   Find: beta_application_completed
   Toggle: Mark as conversion (switch to ON)
   ```

2. **Create Custom Funnel**
   ```
   Admin → Explorations → Funnel exploration

   Funnel Steps:
   1. Page view: /beta-application.html
   2. Event: form_field_focused
   3. Event: beta_application_completed
   4. Event: beta_application_accepted

   Save as: Beta Application Funnel
   ```

3. **Set Up Audience**
   ```
   Admin → Audiences → New Audience
   Name: Beta Applicants - Accepted

   Conditions:
   - Event: beta_application_accepted
   - Within last: 30 days

   Use for: Remarketing campaigns
   ```

---

### GA4 Dashboard Setup

**Recommended Reports to Monitor:**

1. **Realtime** - Live traffic monitoring
2. **Acquisition → Traffic acquisition** - Where users come from
3. **Engagement → Events** - Custom event tracking
4. **Engagement → Conversions** - Beta application completions
5. **User attributes** - Company type, product count distribution

**Custom Report for Beta Program:**

```
Go to: Explorations → Create New Exploration

Technique: Free Form

Rows:
- Company type (custom parameter)
- Number of products (custom parameter)

Values:
- Event count (beta_application_completed)
- Conversions (beta_application_accepted)
- Acceptance rate (calculated field)

Filters:
- Event name = beta_application_completed
- Date range = Last 30 days
```

---

## Testing & Verification

### Email Service Testing

**Test 1: Template Rendering**
```bash
php /var/www/documentiulia.ro/test_email_service.php
```

Expected output:
```
✓ Template loaded successfully
✓ Subject extracted: ✅ Aplicația ta pentru Program Beta DocumentiUlia
✓ Template rendered successfully
✓ Rendered HTML length: 5798 bytes
✅ PASSED
```

---

**Test 2: End-to-End Beta Application with Email**

```bash
# Submit test application
curl -X POST https://documentiulia.ro/api/v1/beta/applications.php \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Email Test SRL",
    "contact_name": "Your Name",
    "email": "YOUR_EMAIL@gmail.com",
    "phone": "0712345678",
    "businessType": "hybrid",
    "numProducts": 500,
    "numEmployees": 8,
    "mainProblem": "Testing the email service integration"
  }'
```

**What Should Happen:**
1. ✅ API returns success (201 Created)
2. ✅ Application saved to database
3. ✅ Email sent to YOUR_EMAIL@gmail.com
4. ✅ Email logged to `email_logs` table

**Check Your Email:**
- Check inbox (and spam folder!)
- Subject: "✅ Aplicația ta pentru Program Beta DocumentiUlia"
- Contains your name and company
- Shows acceptance status (should be "ACCEPTAT")

**Verify in Database:**
```sql
SELECT * FROM email_logs WHERE recipient = 'YOUR_EMAIL@gmail.com';
```

---

### Google Analytics 4 Testing

**Test 1: Page View Tracking**

1. Open: https://documentiulia.ro/beta-application.html
2. Wait: 30 seconds
3. Check GA4: Reports → Realtime
4. Expected: 1 active user, page = /beta-application.html

---

**Test 2: Event Tracking**

1. Fill out beta form (use test data)
2. Submit form
3. Check browser console for: "GA4 Event: beta_application_completed"
4. Wait: 1-2 minutes
5. Check GA4: Realtime → Event count by Event name
6. Expected: `beta_application_completed` with count 1

---

**Test 3: Custom Parameters**

1. Go to: GA4 → Reports → Realtime → Event name
2. Click: beta_application_completed
3. View: Custom parameters
4. Expected parameters:
   - company_type: hybrid
   - num_products: 500
   - num_employees: 8
   - application_score: 75
   - auto_accepted: true

---

## Troubleshooting

### Email Issues

**Problem: Emails Not Sending**

1. Check SMTP credentials in `.env`
2. Check error logs: `tail -f /var/log/php8.2-fpm.log`
3. Check email logs table:
   ```sql
   SELECT * FROM email_logs WHERE status = 'failed' ORDER BY sent_at DESC LIMIT 10;
   ```
4. Test SMTP connection:
   ```bash
   php -r "
   use PHPMailer\PHPMailer\PHPMailer;
   require '/var/www/documentiulia.ro/vendor/autoload.php';
   $mail = new PHPMailer();
   $mail->isSMTP();
   $mail->Host = 'smtp.gmail.com'; // or smtp.sendgrid.net
   $mail->SMTPAuth = true;
   $mail->Username = 'YOUR_USERNAME';
   $mail->Password = 'YOUR_PASSWORD';
   $mail->Port = 587;
   $mail->SMTPDebug = 2;
   echo $mail->smtpConnect() ? 'Connected!' : 'Failed!';
   "
   ```

---

**Problem: Emails Going to Spam**

**Solutions:**
1. Use SendGrid instead of Gmail
2. Verify sender domain (SPF, DKIM, DMARC)
3. Start with low volume (< 50 emails/day)
4. Avoid spam trigger words in subject
5. Include unsubscribe link (for marketing emails)

---

**Problem: Email Template Not Rendering**

1. Check template exists:
   ```bash
   ls -la /var/www/documentiulia.ro/email-templates/beta-application-confirmation.html
   ```
2. Check file permissions: `644 www-data:www-data`
3. Test rendering:
   ```bash
   php /var/www/documentiulia.ro/test_email_service.php
   ```

---

### Google Analytics Issues

**Problem: GA4 Not Tracking**

1. Check Measurement ID is correct in `ga4-config.js`
2. Check browser console for errors
3. Verify ga4-config.js is loaded:
   ```
   Browser DevTools → Network tab
   Look for: ga4-config.js (should be 200 OK)
   ```
4. Check if AdBlockers are enabled (they block GA)
5. Try incognito mode

---

**Problem: Events Not Showing in GA4**

**Possible Causes:**
1. **Delay:** GA4 events can take 1-2 minutes to appear in Realtime
2. **Filters:** Check if you have filters excluding events
3. **Debugging:** Enable debug mode:
   ```javascript
   // In ga4-config.js
   debug: true
   ```
4. **Console:** Check browser console for "GA4 Event:" messages

---

**Problem: Custom Parameters Not Showing**

1. Wait 24-48 hours (custom parameters take time to register)
2. Check parameter names match exactly
3. Verify data type (string, number, boolean)
4. Register custom dimensions:
   ```
   GA4 → Admin → Custom definitions → Create custom dimension
   Dimension name: company_type
   Scope: Event
   Event parameter: company_type
   ```

---

## Production Launch Checklist

### Email Service

- [ ] SMTP credentials configured in `.env`
- [ ] Test email sent successfully
- [ ] Email received (not in spam)
- [ ] Email template renders correctly
- [ ] Database logging working
- [ ] Error handling tested

### Google Analytics 4

- [ ] GA4 property created
- [ ] Measurement ID added to `ga4-config.js`
- [ ] Page view tracking verified
- [ ] Event tracking verified
- [ ] Realtime data showing correctly
- [ ] Conversion marked in GA4

### Integration Testing

- [ ] Submit test beta application
- [ ] Verify application in database
- [ ] Verify email received
- [ ] Verify GA4 event fired
- [ ] Check both email and GA4 logs

---

## Support & Resources

### Documentation
- EmailService class: `/var/www/documentiulia.ro/includes/EmailService.php`
- GA4 config: `/var/www/documentiulia.ro/public/ga4-config.js`
- Email templates: `/var/www/documentiulia.ro/email-templates/`

### External Resources
- **SendGrid Docs:** https://docs.sendgrid.com/for-developers/sending-email/quickstart-php
- **PHPMailer Docs:** https://github.com/PHPMailer/PHPMailer
- **GA4 Setup Guide:** https://support.google.com/analytics/answer/9304153
- **GA4 Events:** https://support.google.com/analytics/answer/9267735

### Testing Tools
- **Email Tester:** https://www.mail-tester.com (check spam score)
- **GA4 Debugger:** Chrome extension "Google Analytics Debugger"
- **SMTP Test:** https://www.smtper.net

---

**Next Steps:**

1. ✅ Configure email service (SendGrid recommended)
2. ✅ Setup Google Analytics 4 property
3. ✅ Test both integrations end-to-end
4. ✅ Monitor for 24 hours
5. 🚀 Launch beta program!

---

**© 2025 DocumentiUlia**
**Document:** Email & GA4 Setup Guide
**Version:** 1.0
**Last Updated:** 2025-11-19

