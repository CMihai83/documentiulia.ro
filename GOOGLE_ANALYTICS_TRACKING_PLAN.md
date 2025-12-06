# 📊 Google Analytics 4 - Plan Complet de Tracking DocumentiUlia

## 🎯 Obiective Analytics

### Obiective de Business
1. **Acquisition**: Înțelegere surse de trafic și performanța canalelor de marketing
2. **Activation**: Măsurare conversii beta applications și trial signups
3. **Retention**: Urmărire engagement și utilizare platformă
4. **Revenue**: Tracking venituri și conversii plăți
5. **Referral**: Măsurare referrals și word-of-mouth

### KPIs Principale
- **Conversion Rate**: Beta applications / Total visitors
- **Activation Rate**: Completed onboarding / Signups
- **Engagement Rate**: Active sessions / Total sessions
- **Revenue per User**: Total revenue / Active users
- **Churn Rate**: Canceled subscriptions / Total subscriptions

---

## 🔧 Setup Inițial Google Analytics 4

### 1. Creare Proprietate GA4

```javascript
// Global Site Tag (gtag.js) - Instalare în <head>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-XXXXXXXXXX', {
    'send_page_view': true,
    'cookie_flags': 'SameSite=None;Secure',
    'user_id': '{{USER_ID}}' // Dacă user e logat
  });
</script>
```

### 2. Google Tag Manager Setup (Recomandat)

```html
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>
<!-- End Google Tag Manager -->

<!-- Google Tag Manager (noscript) în <body> -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
```

---

## 📍 Events Tracking - Structură Completă

### ACQUISITION EVENTS (Marketing & Traffic)

#### Event: page_view (Automatic)
```javascript
// Automatic tracking - GA4 default event
// Customizări adiționale:
gtag('event', 'page_view', {
  'page_title': document.title,
  'page_location': window.location.href,
  'page_path': window.location.pathname,
  'page_referrer': document.referrer,
  'user_type': 'visitor' // sau 'logged_in', 'beta_user'
});
```

#### Event: landing_page_viewed
```javascript
// Când user ajunge pe o landing page (retail, beta, etc.)
gtag('event', 'landing_page_viewed', {
  'landing_type': 'retail', // 'beta', 'professional_services', etc.
  'traffic_source': getCookie('utm_source'),
  'campaign': getCookie('utm_campaign')
});
```

#### Event: cta_clicked
```javascript
// Click pe orice CTA (Call-to-Action)
gtag('event', 'cta_clicked', {
  'cta_text': 'Încearcă Gratuit',
  'cta_location': 'hero_section', // sau 'navigation', 'footer', etc.
  'cta_destination': '/beta-application',
  'page_section': 'above_fold'
});
```

---

### BETA PROGRAM EVENTS

#### Event: beta_application_started
```javascript
// User începe formularul de aplicare beta
gtag('event', 'beta_application_started', {
  'form_id': 'beta-application-form',
  'traffic_source': getCookie('utm_source'),
  'page_url': window.location.href
});
```

#### Event: beta_application_completed
```javascript
// Formular beta trimis cu succes
gtag('event', 'beta_application_completed', {
  'company_type': formData.businessType, // 'physical', 'online', 'hybrid'
  'num_products': formData.numProducts,
  'num_employees': formData.numEmployees,
  'application_score': response.score, // Din backend
  'auto_accepted': response.status === 'accepted'
});

// Track ca și conversion
gtag('event', 'conversion', {
  'send_to': 'AW-CONVERSION-ID/CONVERSION-LABEL',
  'value': 1.0,
  'currency': 'EUR'
});
```

#### Event: beta_acceptance_viewed
```javascript
// User vede pagina de acceptare beta
gtag('event', 'beta_acceptance_viewed', {
  'company_id': userData.companyId,
  'acceptance_date': new Date().toISOString()
});
```

---

### ONBOARDING EVENTS

#### Event: onboarding_started
```javascript
// User începe procesul de onboarding
gtag('event', 'onboarding_started', {
  'user_id': userId,
  'company_id': companyId,
  'user_role': 'owner' // sau 'admin', 'user'
});
```

#### Event: onboarding_step_completed
```javascript
// Fiecare step din onboarding completat
gtag('event', 'onboarding_step_completed', {
  'step_number': 1,
  'step_name': 'company_info', // 'product_import', 'first_invoice', etc.
  'time_spent': 45, // secunde
  'completion_rate': 0.25 // 25% din onboarding
});
```

#### Event: onboarding_completed
```javascript
// Onboarding complet finalizat
gtag('event', 'onboarding_completed', {
  'user_id': userId,
  'total_time_spent': 1200, // secunde
  'steps_completed': 4,
  'aha_moment_reached': true // A creat prima factură cu succes
});
```

---

### PRODUCT USAGE EVENTS

#### Event: product_imported
```javascript
// User importă produse în inventar
gtag('event', 'product_imported', {
  'import_method': 'excel', // sau 'manual', 'api', 'woocommerce'
  'product_count': 150,
  'time_to_complete': 120 // secunde
});
```

#### Event: invoice_created
```javascript
// Creare factură
gtag('event', 'invoice_created', {
  'invoice_type': 'sale', // sau 'proforma', 'credit_note'
  'invoice_value': 500.00,
  'currency': 'RON',
  'customer_type': 'new', // sau 'returning'
  'time_to_create': 45 // secunde - pentru a măsura cât de rapid e procesul
});
```

#### Event: stock_synced
```javascript
// Sincronizare stoc (WooCommerce, etc.)
gtag('event', 'stock_synced', {
  'sync_direction': 'to_woocommerce', // sau 'from_woocommerce', 'bidirectional'
  'products_synced': 75,
  'sync_status': 'success', // sau 'partial', 'failed'
  'integration': 'woocommerce' // sau 'prestashop', 'manual'
});
```

#### Event: report_generated
```javascript
// User generează raport
gtag('event', 'report_generated', {
  'report_type': 'sales', // 'inventory', 'profit_loss', 'cashflow'
  'report_period': '30_days', // '7_days', '90_days', 'custom'
  'export_format': 'pdf' // sau 'excel', 'view_only'
});
```

#### Event: low_stock_alert_viewed
```javascript
// User vede alertă stoc scăzut
gtag('event', 'low_stock_alert_viewed', {
  'alert_count': 5, // Număr produse cu stoc scăzut
  'action_taken': 'created_purchase_order' // sau 'dismissed', 'viewed_product'
});
```

---

### ENGAGEMENT EVENTS

#### Event: search_performed
```javascript
// Căutare în platformă
gtag('event', 'search', {
  'search_term': searchQuery,
  'search_category': 'products', // 'customers', 'invoices', 'reports'
  'results_count': 12,
  'results_clicked': true
});
```

#### Event: feature_used
```javascript
// Utilizare feature specific
gtag('event', 'feature_used', {
  'feature_name': 'barcode_scanner',
  'feature_category': 'inventory',
  'first_time_use': false,
  'session_count': 3 // A 3-a sesiune când folosește feature-ul
});
```

#### Event: help_article_viewed
```javascript
// User accesează documentație
gtag('event', 'help_article_viewed', {
  'article_title': 'Cum să creez o factură',
  'article_category': 'invoicing',
  'time_on_article': 120, // secunde
  'helpful_vote': 'yes' // sau 'no', null
});
```

---

### MONETIZATION EVENTS

#### Event: pricing_page_viewed
```javascript
// Vizualizare pagină pricing
gtag('event', 'pricing_page_viewed', {
  'traffic_source': getCookie('utm_source'),
  'user_type': 'beta_user', // sau 'trial', 'visitor'
  'time_on_page': 90 // secunde
});
```

#### Event: plan_selected
```javascript
// User selectează un plan de prețuri
gtag('event', 'plan_selected', {
  'plan_name': 'Retail Growth',
  'plan_price': 59.00,
  'billing_period': 'monthly', // sau 'annually'
  'previous_plan': 'Retail Start' // dacă e upgrade
});
```

#### Event: checkout_started
```javascript
// Început proces de plată
gtag('event', 'begin_checkout', {
  'currency': 'EUR',
  'value': 59.00,
  'plan_name': 'Retail Growth',
  'billing_period': 'monthly',
  'items': [{
    'item_id': 'RETAIL_GROWTH_MONTHLY',
    'item_name': 'Retail Growth Plan',
    'price': 59.00,
    'quantity': 1
  }]
});
```

#### Event: payment_info_added
```javascript
// User adaugă informații de plată
gtag('event', 'add_payment_info', {
  'currency': 'EUR',
  'value': 59.00,
  'payment_method': 'card' // sau 'bank_transfer', 'paypal'
});
```

#### Event: purchase_completed
```javascript
// Plată finalizată cu succes
gtag('event', 'purchase', {
  'transaction_id': 'TXN_123456789',
  'value': 59.00,
  'currency': 'EUR',
  'tax': 11.21, // TVA 19%
  'shipping': 0,
  'plan_name': 'Retail Growth',
  'billing_period': 'monthly',
  'items': [{
    'item_id': 'RETAIL_GROWTH_MONTHLY',
    'item_name': 'Retail Growth Plan',
    'price': 59.00,
    'quantity': 1
  }]
});

// Track ca și conversion pentru Ads
gtag('event', 'conversion', {
  'send_to': 'AW-CONVERSION-ID/PURCHASE-LABEL',
  'value': 59.00,
  'currency': 'EUR',
  'transaction_id': 'TXN_123456789'
});
```

#### Event: subscription_renewed
```javascript
// Reînnoire abonament (automatic)
gtag('event', 'subscription_renewed', {
  'plan_name': 'Retail Growth',
  'renewal_count': 3, // A 3-a reînnoire
  'value': 59.00,
  'currency': 'EUR'
});
```

#### Event: subscription_canceled
```javascript
// Anulare abonament
gtag('event', 'subscription_canceled', {
  'plan_name': 'Retail Growth',
  'cancellation_reason': 'too_expensive', // 'not_using', 'missing_features', etc.
  'months_subscribed': 4,
  'lifetime_value': 236.00 // 4 x €59
});
```

---

### RETENTION EVENTS

#### Event: session_start (Automatic în GA4)
```javascript
// Automatic - dar putem adăuga context
gtag('event', 'session_start', {
  'user_segment': 'power_user', // 'casual', 'inactive', 'churned'
  'days_since_signup': 15,
  'last_session_days_ago': 2
});
```

#### Event: email_opened
```javascript
// Email marketing opened (din link tracking)
gtag('event', 'email_opened', {
  'email_campaign': 'weekly_tips',
  'email_subject': '5 Tips pentru inventar eficient',
  'user_segment': 'inactive_users'
});
```

#### Event: email_link_clicked
```javascript
// Click pe link din email
gtag('event', 'email_link_clicked', {
  'email_campaign': 'weekly_tips',
  'link_destination': '/inventory/reports',
  'link_text': 'Vezi Raportul Complet'
});
```

---

### SOCIAL & REFERRAL EVENTS

#### Event: social_share
```javascript
// User share content pe social media
gtag('event', 'share', {
  'method': 'facebook', // 'linkedin', 'twitter', 'copy_link'
  'content_type': 'beta_application',
  'content_id': 'beta-retail-2025'
});
```

#### Event: referral_sent
```javascript
// User trimite referral
gtag('event', 'referral_sent', {
  'referral_method': 'email', // 'link', 'social'
  'referred_count': 1
});
```

#### Event: referral_signup
```javascript
// Cineva se înregistrează prin referral
gtag('event', 'referral_signup', {
  'referrer_id': referrerId,
  'traffic_source': 'referral_link'
});
```

---

## 🎯 Custom Dimensions & Metrics

### User-scoped Custom Dimensions
```javascript
gtag('set', 'user_properties', {
  'user_role': 'owner', // 'admin', 'employee'
  'company_size': 'small', // '2-10', '11-50', '50+'
  'industry': 'retail',
  'subscription_plan': 'Retail Growth',
  'days_since_signup': 15,
  'lifetime_value': 236.00,
  'beta_user': true
});
```

### Event-scoped Parameters
Toate events ar trebui să includă:
```javascript
{
  'user_id': userId, // Dacă e logat
  'company_id': companyId,
  'session_id': sessionId,
  'page_path': window.location.pathname,
  'timestamp': new Date().toISOString()
}
```

---

## 🔄 Conversion Tracking Setup

### Conversii Principale (Goals în GA4)

1. **Beta Application Submitted**
   - Event name: `beta_application_completed`
   - Value: €0 (lead value poate fi setat la €100 pentru LTV estimate)

2. **Onboarding Completed**
   - Event name: `onboarding_completed`
   - Value: €0 (user activat)

3. **First Invoice Created**
   - Event name: `invoice_created` (where first_invoice = true)
   - Value: €0 (aha moment reached)

4. **Purchase Completed**
   - Event name: `purchase`
   - Value: Dynamic (actual transaction value)

5. **Subscription Renewed**
   - Event name: `subscription_renewed`
   - Value: Dynamic

### E-commerce Tracking (Enhanced)
```javascript
// Item list view (pe pagina de pricing)
gtag('event', 'view_item_list', {
  'items': [
    {
      'item_id': 'RETAIL_START',
      'item_name': 'Retail Start',
      'price': 29.00,
      'item_category': 'subscription',
      'item_variant': 'monthly'
    },
    {
      'item_id': 'RETAIL_GROWTH',
      'item_name': 'Retail Growth',
      'price': 59.00,
      'item_category': 'subscription',
      'item_variant': 'monthly'
    }
  ]
});

// Item detail view (când user expandează detalii plan)
gtag('event', 'view_item', {
  'items': [{
    'item_id': 'RETAIL_GROWTH',
    'item_name': 'Retail Growth',
    'price': 59.00
  }]
});

// Add to cart (selectare plan)
gtag('event', 'add_to_cart', {
  'currency': 'EUR',
  'value': 59.00,
  'items': [{
    'item_id': 'RETAIL_GROWTH',
    'item_name': 'Retail Growth',
    'price': 59.00,
    'quantity': 1
  }]
});
```

---

## 📊 Funnel Analysis Setup

### Beta Funnel
```
1. Landing Page View (landing_page_viewed)
   ↓
2. Beta Application Started (beta_application_started)
   ↓
3. Beta Application Completed (beta_application_completed)
   ↓
4. Beta Acceptance Viewed (beta_acceptance_viewed)
   ↓
5. Onboarding Started (onboarding_started)
   ↓
6. Onboarding Completed (onboarding_completed)
```

### Purchase Funnel
```
1. Pricing Page Viewed (pricing_page_viewed)
   ↓
2. Plan Selected (plan_selected)
   ↓
3. Checkout Started (begin_checkout)
   ↓
4. Payment Info Added (add_payment_info)
   ↓
5. Purchase Completed (purchase)
```

### Product Adoption Funnel
```
1. Session Start (session_start)
   ↓
2. Feature Discovered (feature_viewed)
   ↓
3. Feature Used (feature_used)
   ↓
4. Feature Repeated Use (feature_used x3+)
```

---

## 🎨 Dashboard Templates

### Dashboard 1: ACQUISITION OVERVIEW
**Metrics:**
- Sessions by Source/Medium
- New Users by Channel
- Beta Applications by Source
- Conversion Rate by Campaign
- Cost per Acquisition (dacă se importă din Ads)

**Dimensions:**
- Source/Medium
- Campaign
- Landing Page
- Device Category

### Dashboard 2: USER ENGAGEMENT
**Metrics:**
- Active Users (DAU, WAU, MAU)
- Average Session Duration
- Pages per Session
- Feature Usage (top 10 features)
- Onboarding Completion Rate

**Dimensions:**
- User Segment
- Days Since Signup
- Subscription Plan
- Device Type

### Dashboard 3: MONETIZATION
**Metrics:**
- Revenue
- Transactions
- Average Order Value
- Customer Lifetime Value
- Churn Rate
- MRR (Monthly Recurring Revenue)

**Dimensions:**
- Plan Name
- Billing Period
- User Cohort
- Acquisition Channel

### Dashboard 4: PRODUCT ANALYTICS
**Metrics:**
- Invoices Created (total & trend)
- Products Imported (total & trend)
- Stock Syncs (total & trend)
- Reports Generated
- Average Time to Invoice

**Dimensions:**
- User Segment
- Company Size
- Industry
- Integration Type

---

## 🔗 Integration cu alte Tools

### Google Ads Integration
```javascript
// Link GA4 cu Google Ads account
// În GA4: Admin → Google Ads Links → Link Google Ads

// Import conversions din GA4 în Google Ads:
// 1. beta_application_completed
// 2. purchase
// 3. subscription_renewed
```

### Facebook Pixel Integration (Parallel)
```javascript
// Facebook Pixel pentru retargeting
fbq('track', 'PageView');
fbq('track', 'Lead', {
  value: 100.00,
  currency: 'EUR'
}); // La beta application
fbq('track', 'Purchase', {
  value: 59.00,
  currency: 'EUR'
}); // La subscription purchase
```

### Hotjar Integration
```javascript
// User feedback & session recording
// Link Hotjar user ID cu GA4 user ID pentru cross-referencing
hj('identify', userId, {
  'subscription_plan': planName,
  'company_size': companySize
});
```

---

## 📋 Implementation Checklist

### Fase 1: Setup de Bază (Săptămâna 1)
- [ ] Creare cont Google Analytics 4
- [ ] Instalare Google Tag Manager
- [ ] Setup GA4 tag în GTM
- [ ] Verificare page_view tracking funcționează
- [ ] Configurare domenii exclude (documentiulia.ro & subdomenii)
- [ ] Setup enhanced measurement (scroll, outbound clicks, site search, video, file downloads)

### Faza 2: Events Custom (Săptămâna 2)
- [ ] Implementare acquisition events (CTA clicks, landing page views)
- [ ] Implementare beta application events
- [ ] Implementare onboarding events
- [ ] Test toate events în GA4 DebugView
- [ ] Documentare event parameters

### Faza 3: Conversion Tracking (Săptămâna 3)
- [ ] Setup conversions în GA4
- [ ] Link cu Google Ads account
- [ ] Import conversions în Google Ads
- [ ] Test purchase tracking
- [ ] Setup e-commerce reporting

### Faza 4: Advanced Analytics (Săptămâna 4)
- [ ] Creare custom dimensions
- [ ] Setup user properties
- [ ] Configurare audience segments
- [ ] Creare dashboard-uri
- [ ] Setup automated reports (săptămânal email)

### Faza 5: Optimization (Continuu)
- [ ] Review events săptămânal
- [ ] Ajustare conversii după feedback
- [ ] A/B testing tracking
- [ ] Funnel analysis & optimization

---

## 🚨 Privacy & GDPR Compliance

### Cookie Consent
```javascript
// Așteaptă consimțământ utilizator înainte de a încărca GA4
if (getCookieConsent() === 'accepted') {
  loadGoogleAnalytics();
} else {
  // Afișează banner cookie consent
  showCookieConsent();
}

function loadGoogleAnalytics() {
  // Load GA4 script
  gtag('consent', 'update', {
    'analytics_storage': 'granted'
  });
}
```

### IP Anonymization (Implicit în GA4)
GA4 nu stochează adrese IP complete - anonymization este by default.

### Data Retention
- Setup în GA4: Admin → Data Settings → Data Retention
- Recomandat: 14 luni pentru user-level data

### User Deletion Requests
```javascript
// API call pentru ștergere date user (GDPR right to be forgotten)
// Implementat în backend pentru a trimite request către GA4 API
```

---

## 📚 Resources & Documentation

### Google Analytics 4 Docs
- [GA4 Setup Guide](https://support.google.com/analytics/answer/9304153)
- [GA4 Events Reference](https://support.google.com/analytics/answer/9267735)
- [Measurement Protocol](https://developers.google.com/analytics/devguides/collection/protocol/ga4)

### Google Tag Manager
- [GTM Setup Guide](https://support.google.com/tagmanager/answer/6103696)
- [GTM Variable Reference](https://support.google.com/tagmanager/topic/7182737)

### E-commerce Tracking
- [GA4 E-commerce Guide](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce)

---

**© 2025 DocumentiUlia - Google Analytics Tracking Plan**
**Versiune: 1.0**
**Ultima actualizare: 2025-01-19**
