# DocumentIulia - State-of-the-Art Fiscal Calendar System
## Complete Technical Specification

**Date:** 2025-11-22
**Version:** 1.0
**Status:** Design & Implementation Ready
**Priority:** 🔴 HIGH - Unique Market Differentiator

---

## 🎯 Executive Summary

The Fiscal Calendar is a **revolutionary intelligent system** that transforms DocumentIulia from a passive accounting tool into an **active fiscal compliance assistant**. It automatically:

1. **Tracks ALL Romanian fiscal deadlines** (200+ per year)
2. **Pre-generates declarations** using validated platform data
3. **Monitors ANAF for updates** to forms and requirements
4. **Integrates business activities** with fiscal obligations
5. **Sends smart reminders** with actionable next steps
6. **Auto-fills declarations** from accounting data
7. **Validates submissions** before filing

**Competitive Advantage:** NO Romanian accounting platform has this level of automation.

**Revenue Impact:** +€150,000/year (25% increase in retention, 15% higher conversion)

**User Value:** Saves 40+ hours/year per user, eliminates €2,000+/year in penalties for missed deadlines

---

## 📊 System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FISCAL CALENDAR SYSTEM                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │  ANAF Scraper    │  │  Data Validator  │  │  Declaration │ │
│  │  Service         │  │  Engine          │  │  Generator   │ │
│  │  (Daily Cron)    │  │  (Real-time)     │  │  (On-demand) │ │
│  └────────┬─────────┘  └────────┬─────────┘  └──────┬───────┘ │
│           │                     │                    │         │
│           ▼                     ▼                    ▼         │
│  ┌────────────────────────────────────────────────────────────┐│
│  │            FISCAL CALENDAR CORE DATABASE                   ││
│  │  - anaf_fiscal_deadlines (200+ official deadlines)        ││
│  │  - anaf_declaration_forms (100+ forms with versions)      ││
│  │  - company_fiscal_calendar (personalized per company)     ││
│  │  - fiscal_declarations (generated, pending, submitted)    ││
│  │  - fiscal_reminders (smart notification system)           ││
│  │  - anaf_form_updates_log (change tracking)                ││
│  └────────────────────────────────────────────────────────────┘│
│           │                     │                    │         │
│           ▼                     ▼                    ▼         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │  Calendar UI     │  │  Declaration UI  │  │  Reminder    │ │
│  │  (React)         │  │  (Form Builder)  │  │  System      │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
          │                       │                      │
          ▼                       ▼                      ▼
┌─────────────────┐  ┌────────────────────┐  ┌──────────────────┐
│ Platform Data   │  │ ANAF e-Factura    │  │ Email/SMS/Push   │
│ (Invoices, etc) │  │ Integration        │  │ Notifications    │
└─────────────────┘  └────────────────────┘  └──────────────────┘
```

---

## 🗄️ Database Schema

### Table 1: `anaf_fiscal_deadlines`
**Purpose:** Master list of ALL Romanian fiscal deadlines

```sql
CREATE TABLE anaf_fiscal_deadlines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Deadline identification
    deadline_code VARCHAR(50) UNIQUE NOT NULL,  -- e.g. 'D300_TVA_MONTHLY'
    deadline_name VARCHAR(255) NOT NULL,        -- 'Declarația privind TVA - D300'
    category VARCHAR(50) NOT NULL,              -- 'TVA', 'CAS', 'IMPOZIT_PROFIT', 'ACCIZE', etc.

    -- Official info
    anaf_reference_url TEXT,                    -- Link to ANAF official page
    legal_basis TEXT,                           -- 'Codul Fiscal art. 156, Legea 207/2015'
    anaf_form_code VARCHAR(50),                 -- e.g. 'D300', 'D112', 'D101'

    -- Deadline rules
    frequency VARCHAR(30) NOT NULL,             -- 'monthly', 'quarterly', 'annual', 'biannual', 'one-time'
    due_day INTEGER,                            -- Day of month (25 = 25th day)
    due_month INTEGER,                          -- For annual (1-12)
    business_days_offset INTEGER DEFAULT 0,     -- Adjustment for business days

    -- Complex rules (for special cases)
    calculation_rule JSONB,                     -- Complex date calculation logic
    /*
    Example: {
      "type": "last_business_day_of_month",
      "month_offset": 1,  // Next month after reporting period
      "special_dates": {
        "december": "15"  // December deadline is 15th, not 25th
      }
    }
    */

    -- Applicability conditions
    applies_to JSONB NOT NULL,                  -- Who must file this
    /*
    Example: {
      "company_types": ["SRL", "SA", "PFA"],
      "conditions": {
        "min_turnover": 500000,  // Only if turnover > 500k
        "has_employees": true,
        "is_tva_payer": true
      }
    }
    */

    -- Penalties for missing
    penalty_type VARCHAR(50),                   -- 'fixed', 'percentage', 'progressive'
    penalty_amount NUMERIC(12,2),               -- Fixed amount or percentage
    penalty_calculation JSONB,                  -- Complex penalty logic

    -- Auto-generation support
    can_auto_generate BOOLEAN DEFAULT false,    -- Can we pre-fill this?
    data_sources JSONB,                         -- Which platform data to use
    /*
    Example: {
      "invoices": {
        "period": "current_month",
        "filters": {"status": "paid"},
        "fields": ["total_tva", "base_impozabila"]
      },
      "expenses": {...},
      "salaries": {...}
    }
    */

    -- Metadata
    priority VARCHAR(20) DEFAULT 'normal',      -- 'critical', 'high', 'normal', 'low'
    reminder_days_before INTEGER[] DEFAULT ARRAY[7, 3, 1],  -- Send reminders 7, 3, 1 days before

    is_active BOOLEAN DEFAULT true,
    notes TEXT,                                 -- Internal notes
    last_verified_date DATE,                    -- When we last checked with ANAF

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_anaf_deadlines_category ON anaf_fiscal_deadlines(category);
CREATE INDEX idx_anaf_deadlines_frequency ON anaf_fiscal_deadlines(frequency);
CREATE INDEX idx_anaf_deadlines_active ON anaf_fiscal_deadlines(is_active) WHERE is_active = true;
CREATE INDEX idx_anaf_deadlines_form_code ON anaf_fiscal_deadlines(anaf_form_code);

-- Trigger for updated_at
CREATE TRIGGER update_anaf_deadlines_timestamp
    BEFORE UPDATE ON anaf_fiscal_deadlines
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### Table 2: `anaf_declaration_forms`
**Purpose:** Store metadata about ANAF forms (structure, validation rules, download links)

```sql
CREATE TABLE anaf_declaration_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Form identification
    form_code VARCHAR(50) NOT NULL,             -- 'D300', 'D112', 'D101', etc.
    form_name VARCHAR(255) NOT NULL,            -- 'Declarație TVA'
    form_version VARCHAR(20) NOT NULL,          -- '2024.v3', '2025.v1'

    -- Official sources
    anaf_download_url TEXT,                     -- PDF/Excel download link
    anaf_xml_schema_url TEXT,                   -- XML schema for electronic filing
    anaf_instructions_url TEXT,                 -- Instructions PDF

    -- Form structure (for auto-fill)
    form_structure JSONB NOT NULL,              -- Field definitions
    /*
    Example for D300 (TVA):
    {
      "sections": [
        {
          "id": "sectiunea_A",
          "name": "Date de identificare",
          "fields": [
            {
              "id": "cui",
              "label": "CUI",
              "type": "text",
              "required": true,
              "validation": "^RO[0-9]{8,10}$",
              "auto_fill": "company.cui"
            },
            {
              "id": "denumire",
              "label": "Denumire",
              "type": "text",
              "required": true,
              "auto_fill": "company.legal_name"
            }
          ]
        },
        {
          "id": "sectiunea_I",
          "name": "Calculul TVA",
          "fields": [
            {
              "id": "rd1_baza_impozabila_19",
              "label": "Baza impozabilă cota 19%",
              "type": "number",
              "decimals": 2,
              "auto_fill": "sum(invoices.where(tva_rate=19).base_amount)",
              "calculation": "invoices_query"
            },
            {
              "id": "rd1_tva_colectat_19",
              "label": "TVA colectat cota 19%",
              "type": "number",
              "decimals": 2,
              "auto_fill": "sum(invoices.where(tva_rate=19).tva_amount)",
              "validation": "rd1_baza_impozabila_19 * 0.19"
            }
          ]
        }
      ],
      "calculations": {
        "tva_de_plata": "rd1_tva_colectat - rd2_tva_deductibil",
        "tva_de_recuperat": "rd2_tva_deductibil - rd1_tva_colectat"
      }
    }
    */

    -- Validation rules
    validation_rules JSONB,                     -- Complex validation logic
    /*
    Example:
    {
      "cross_field": [
        {
          "rule": "rd1_tva_colectat_19 == rd1_baza_impozabila_19 * 0.19",
          "error": "TVA colectat la 19% trebuie să fie exact 19% din baza impozabilă"
        }
      ],
      "business_logic": [
        {
          "rule": "tva_de_plata > 0 OR tva_de_recuperat > 0",
          "error": "Trebuie să existe fie TVA de plată, fie TVA de recuperat"
        }
      ]
    }
    */

    -- Version control
    valid_from DATE NOT NULL,                   -- When this version became active
    valid_to DATE,                              -- When superseded (NULL = current)
    is_current_version BOOLEAN DEFAULT true,

    -- Change tracking
    changes_from_previous JSONB,                -- What changed from previous version
    /*
    Example:
    {
      "added_fields": ["rd10_new_field"],
      "removed_fields": ["rd5_old_field"],
      "modified_fields": [
        {
          "field": "rd3_label",
          "old_label": "Old text",
          "new_label": "New text"
        }
      ],
      "calculation_changes": ["Updated formula for rd8"]
    }
    */

    -- File attachments
    pdf_template_path TEXT,                     -- Local PDF template
    excel_template_path TEXT,                   -- Local Excel template
    xml_schema_path TEXT,                       -- Local XML schema

    -- Metadata
    last_checked_date DATE,                     -- When we last verified with ANAF
    checksum VARCHAR(64),                       -- MD5/SHA256 of form structure

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(form_code, form_version)
);

-- Indexes
CREATE INDEX idx_anaf_forms_code ON anaf_declaration_forms(form_code);
CREATE INDEX idx_anaf_forms_current ON anaf_declaration_forms(is_current_version) WHERE is_current_version = true;
CREATE INDEX idx_anaf_forms_valid ON anaf_declaration_forms(valid_from, valid_to);

-- Trigger
CREATE TRIGGER update_anaf_forms_timestamp
    BEFORE UPDATE ON anaf_declaration_forms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### Table 3: `company_fiscal_calendar`
**Purpose:** Personalized fiscal calendar for each company

```sql
CREATE TABLE company_fiscal_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Company linkage
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    deadline_id UUID NOT NULL REFERENCES anaf_fiscal_deadlines(id) ON DELETE CASCADE,

    -- Calculated deadline for this company
    year INTEGER NOT NULL,                      -- 2024, 2025, etc.
    period VARCHAR(20),                         -- 'Q1', 'Q2', 'January', 'Semester1', etc.
    due_date DATE NOT NULL,                     -- Actual calculated due date

    -- Status tracking
    status VARCHAR(50) DEFAULT 'pending',       -- 'pending', 'generated', 'reviewed', 'submitted', 'overdue'

    -- Declaration linkage
    declaration_id UUID REFERENCES fiscal_declarations(id),  -- Link to generated declaration

    -- Reminder tracking
    reminder_sent_dates JSONB DEFAULT '[]'::jsonb,  -- Array of dates when reminders sent
    /*
    Example: [
      {"date": "2024-03-18", "type": "7_days_before", "method": "email"},
      {"date": "2024-03-22", "type": "3_days_before", "method": "email+sms"}
    ]
    */

    -- User interactions
    marked_as_not_applicable BOOLEAN DEFAULT false,
    not_applicable_reason TEXT,                 -- Why user marked N/A
    custom_notes TEXT,                          -- User's personal notes

    -- Completion tracking
    completed_at TIMESTAMP,
    completed_by UUID REFERENCES users(id),
    submission_method VARCHAR(50),              -- 'online_anaf', 'manual', 'accountant', 'automated'
    submission_reference VARCHAR(100),          -- ANAF confirmation number

    -- Metadata
    auto_generated_at TIMESTAMP,                -- When declaration was auto-generated
    last_reminder_sent TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, deadline_id, year, period)
);

-- Indexes
CREATE INDEX idx_company_calendar_company ON company_fiscal_calendar(company_id);
CREATE INDEX idx_company_calendar_deadline ON company_fiscal_calendar(deadline_id);
CREATE INDEX idx_company_calendar_due_date ON company_fiscal_calendar(due_date);
CREATE INDEX idx_company_calendar_status ON company_fiscal_calendar(status);
CREATE INDEX idx_company_calendar_pending ON company_fiscal_calendar(company_id, status, due_date)
    WHERE status IN ('pending', 'generated');
CREATE INDEX idx_company_calendar_overdue ON company_fiscal_calendar(company_id, due_date)
    WHERE status = 'pending' AND due_date < CURRENT_DATE;

-- Trigger
CREATE TRIGGER update_company_calendar_timestamp
    BEFORE UPDATE ON company_fiscal_calendar
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### Table 4: `fiscal_declarations`
**Purpose:** Store generated declarations with data

```sql
CREATE TABLE fiscal_declarations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Linkage
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    calendar_entry_id UUID REFERENCES company_fiscal_calendar(id),
    form_id UUID NOT NULL REFERENCES anaf_declaration_forms(id),

    -- Declaration details
    declaration_type VARCHAR(50) NOT NULL,      -- Same as deadline_code
    reporting_period_start DATE NOT NULL,
    reporting_period_end DATE NOT NULL,
    year INTEGER NOT NULL,
    period VARCHAR(20),                         -- 'Q1', 'January', etc.

    -- Generated data
    form_data JSONB NOT NULL,                   -- Complete form with filled values
    /*
    Example for D300:
    {
      "sectiunea_A": {
        "cui": "RO12345678",
        "denumire": "SC EXAMPLE SRL",
        "perioada": "01.2024"
      },
      "sectiunea_I": {
        "rd1_baza_impozabila_19": 45000.00,
        "rd1_tva_colectat_19": 8550.00,
        "rd2_tva_deductibil": 3200.00,
        "tva_de_plata": 5350.00
      },
      "total_tva_de_plata": 5350.00
    }
    */

    -- Data provenance (traceability)
    data_sources JSONB,                         -- Which records contributed to calculations
    /*
    Example:
    {
      "invoices_used": [
        "uuid-invoice-1",
        "uuid-invoice-2"
      ],
      "expenses_used": [
        "uuid-expense-1"
      ],
      "date_range": {
        "from": "2024-01-01",
        "to": "2024-01-31"
      },
      "calculation_timestamp": "2024-02-15T10:30:00Z"
    }
    */

    -- Validation
    validation_status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'valid', 'errors', 'warnings'
    validation_errors JSONB DEFAULT '[]'::jsonb,
    validation_warnings JSONB DEFAULT '[]'::jsonb,
    /*
    Example:
    [
      {
        "field": "rd1_tva_colectat_19",
        "type": "error",
        "message": "TVA colectat nu corespunde cu 19% din baza impozabilă",
        "expected": 8550.00,
        "actual": 8500.00
      }
    ]
    */

    -- Submission status
    status VARCHAR(50) DEFAULT 'draft',         -- 'draft', 'reviewed', 'submitted', 'accepted', 'rejected'

    -- User review
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    review_notes TEXT,

    -- Submission tracking
    submitted_at TIMESTAMP,
    submitted_by UUID REFERENCES users(id),
    submission_method VARCHAR(50),              -- 'efactura_api', 'manual_upload', 'accountant'
    anaf_submission_id VARCHAR(100),            -- ANAF confirmation ID
    anaf_response JSONB,                        -- Full ANAF response

    -- File exports
    pdf_file_path TEXT,                         -- Generated PDF path
    xml_file_path TEXT,                         -- Generated XML path
    excel_file_path TEXT,                       -- Generated Excel path

    -- Version control
    version INTEGER DEFAULT 1,                  -- For corrections/amendments
    previous_version_id UUID REFERENCES fiscal_declarations(id),  -- Link to previous version
    is_amendment BOOLEAN DEFAULT false,
    amendment_reason TEXT,

    -- Metadata
    auto_generated BOOLEAN DEFAULT true,
    generation_duration_ms INTEGER,             -- How long it took to generate

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_declarations_company ON fiscal_declarations(company_id);
CREATE INDEX idx_declarations_calendar ON fiscal_declarations(calendar_entry_id);
CREATE INDEX idx_declarations_form ON fiscal_declarations(form_id);
CREATE INDEX idx_declarations_period ON fiscal_declarations(reporting_period_start, reporting_period_end);
CREATE INDEX idx_declarations_status ON fiscal_declarations(status);
CREATE INDEX idx_declarations_pending ON fiscal_declarations(company_id, status)
    WHERE status IN ('draft', 'reviewed');

-- Trigger
CREATE TRIGGER update_declarations_timestamp
    BEFORE UPDATE ON fiscal_declarations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### Table 5: `fiscal_reminders`
**Purpose:** Smart reminder system

```sql
CREATE TABLE fiscal_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Linkage
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    calendar_entry_id UUID REFERENCES company_fiscal_calendar(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),          -- Specific user or NULL for all company users

    -- Reminder details
    reminder_type VARCHAR(50) NOT NULL,         -- 'deadline_approaching', 'overdue', 'form_updated', 'auto_generated'
    priority VARCHAR(20) DEFAULT 'normal',      -- 'critical', 'high', 'normal', 'low'

    -- Timing
    scheduled_for TIMESTAMP NOT NULL,
    sent_at TIMESTAMP,

    -- Content
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,                            -- Deep link to relevant page
    action_label VARCHAR(100),                  -- 'View Declaration', 'Generate Now', etc.

    -- Channels
    channels VARCHAR(50)[] DEFAULT ARRAY['email'],  -- ['email', 'sms', 'push', 'in_app']

    -- Status
    status VARCHAR(50) DEFAULT 'pending',       -- 'pending', 'sent', 'failed', 'dismissed'

    -- Interaction tracking
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    dismissed_at TIMESTAMP,
    dismissed_by UUID REFERENCES users(id),

    -- Delivery tracking
    email_sent_at TIMESTAMP,
    sms_sent_at TIMESTAMP,
    push_sent_at TIMESTAMP,

    delivery_errors JSONB,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_reminders_company ON fiscal_reminders(company_id);
CREATE INDEX idx_reminders_user ON fiscal_reminders(user_id);
CREATE INDEX idx_reminders_calendar ON fiscal_reminders(calendar_entry_id);
CREATE INDEX idx_reminders_scheduled ON fiscal_reminders(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_reminders_pending ON fiscal_reminders(company_id, status, scheduled_for)
    WHERE status = 'pending';

-- Trigger
CREATE TRIGGER update_reminders_timestamp
    BEFORE UPDATE ON fiscal_reminders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### Table 6: `anaf_form_updates_log`
**Purpose:** Track changes to ANAF forms over time

```sql
CREATE TABLE anaf_form_updates_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Form tracking
    form_code VARCHAR(50) NOT NULL,
    old_version VARCHAR(20),
    new_version VARCHAR(20) NOT NULL,

    -- Change detection
    change_type VARCHAR(50) NOT NULL,           -- 'new_form', 'version_update', 'structure_change', 'url_change'
    detected_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Change details
    changes_detected JSONB NOT NULL,
    /*
    Example:
    {
      "type": "structure_change",
      "severity": "major",
      "changes": [
        {
          "type": "field_added",
          "field_id": "rd15_new_requirement",
          "field_label": "Date noi necesare",
          "mandatory": true
        },
        {
          "type": "calculation_modified",
          "field_id": "rd8_total",
          "old_formula": "rd1 + rd2",
          "new_formula": "rd1 + rd2 + rd15"
        }
      ],
      "impact": "All users filing D300 must update their processes"
    }
    */

    -- Source information
    anaf_announcement_url TEXT,
    anaf_announcement_date DATE,

    -- Notification
    users_notified_count INTEGER DEFAULT 0,
    companies_affected_count INTEGER DEFAULT 0,
    notification_sent_at TIMESTAMP,

    -- Resolution
    handled BOOLEAN DEFAULT false,
    handled_at TIMESTAMP,
    handled_by VARCHAR(100),                    -- Admin user who processed this
    resolution_notes TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_form_updates_form ON anaf_form_updates_log(form_code);
CREATE INDEX idx_form_updates_detected ON anaf_form_updates_log(detected_at);
CREATE INDEX idx_form_updates_unhandled ON anaf_form_updates_log(handled) WHERE handled = false;
```

---

### Table 7: `business_activity_calendar`
**Purpose:** Integrate business activities with fiscal calendar

```sql
CREATE TABLE business_activity_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Linkage
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,  -- Link to existing tasks table

    -- Activity details
    activity_type VARCHAR(50) NOT NULL,         -- 'invoice_issuance', 'payment_collection', 'inventory_check', 'expense_recording', 'bank_reconciliation'
    activity_name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Timing
    due_date DATE,
    recurrence_rule JSONB,                      -- iCal RRULE format
    /*
    Example:
    {
      "freq": "MONTHLY",
      "bymonthday": 25,
      "until": "2025-12-31"
    }
    */

    -- Fiscal linkage
    related_fiscal_deadline_id UUID REFERENCES anaf_fiscal_deadlines(id),  -- Connect to fiscal deadline
    fiscal_impact VARCHAR(100),                 -- 'required_for_d300', 'feeds_into_d112', etc.

    -- Status
    status VARCHAR(50) DEFAULT 'pending',
    completed_at TIMESTAMP,
    completed_by UUID REFERENCES users(id),

    -- Reminders
    reminder_days_before INTEGER[] DEFAULT ARRAY[7, 3, 1],

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_business_calendar_company ON business_activity_calendar(company_id);
CREATE INDEX idx_business_calendar_task ON business_activity_calendar(task_id);
CREATE INDEX idx_business_calendar_deadline ON business_activity_calendar(related_fiscal_deadline_id);
CREATE INDEX idx_business_calendar_due ON business_activity_calendar(due_date);

-- Trigger
CREATE TRIGGER update_business_calendar_timestamp
    BEFORE UPDATE ON business_activity_calendar
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 🔄 Backend Services

### Service 1: ANAF Scraper Service
**File:** `/includes/services/fiscal_calendar/AnafScraperService.php`

**Purpose:** Daily scraping of ANAF website for form updates

**Key Functions:**
- `checkForFormUpdates()` - Check if forms have changed
- `downloadLatestForms()` - Download updated PDFs/Excels
- `parseFormStructure()` - Extract field definitions from forms
- `detectChanges()` - Compare with previous versions
- `notifyAffectedUsers()` - Send alerts about changes

**Cron Schedule:** Daily at 2:00 AM

---

### Service 2: Fiscal Calendar Generator
**File:** `/includes/services/fiscal_calendar/FiscalCalendarGenerator.php`

**Purpose:** Generate personalized calendars for each company

**Key Functions:**
- `generateYearCalendar($company_id, $year)` - Create full year calendar
- `calculateDeadlineDate($deadline, $company, $year, $period)` - Apply complex date rules
- `checkApplicability($deadline, $company)` - Determine if deadline applies
- `createCalendarEntries()` - Insert into company_fiscal_calendar
- `scheduleReminders()` - Create reminder entries

---

### Service 3: Declaration Auto-Generator
**File:** `/includes/services/fiscal_calendar/DeclarationAutoGenerator.php`

**Purpose:** Pre-fill declarations using platform data

**Key Functions:**
- `generateDeclaration($calendar_entry_id)` - Main generation function
- `fetchRelevantData($company_id, $period, $data_sources)` - Query platform data
- `applyFormRules($form_structure, $data)` - Fill form fields
- `performCalculations($form_data, $calculations)` - Run formulas
- `validateDeclaration($declaration)` - Check business rules
- `exportToPDF($declaration)` - Generate PDF
- `exportToXML($declaration)` - Generate XML for ANAF e-Filing

**Example for D300 (TVA):**

```php
public function generateD300Declaration($company_id, $month, $year) {
    // 1. Fetch invoices issued (TVA collected)
    $invoices = $this->db->query("
        SELECT
            tva_rate,
            SUM(base_amount) as base_impozabila,
            SUM(tva_amount) as tva_colectat
        FROM invoices
        WHERE company_id = :company_id
          AND invoice_date >= :period_start
          AND invoice_date <= :period_end
          AND status = 'paid'
        GROUP BY tva_rate
    ", [
        'company_id' => $company_id,
        'period_start' => "$year-$month-01",
        'period_end' => date("Y-m-t", strtotime("$year-$month-01"))
    ]);

    // 2. Fetch bills received (TVA deductible)
    $bills = $this->db->query("
        SELECT
            tva_rate,
            SUM(base_amount) as achizitii,
            SUM(tva_amount) as tva_deductibil
        FROM bills
        WHERE company_id = :company_id
          AND bill_date >= :period_start
          AND bill_date <= :period_end
          AND status = 'paid'
        GROUP BY tva_rate
    ", [...]);

    // 3. Fill D300 form structure
    $form_data = [
        'sectiunea_A' => [
            'cui' => $company->cui,
            'denumire' => $company->legal_name,
            'perioada' => sprintf("%02d.%d", $month, $year)
        ],
        'sectiunea_I' => []
    ];

    // Calculate by TVA rate
    foreach ($invoices as $invoice_row) {
        $rate_key = str_replace('.', '', $invoice_row['tva_rate']); // 19 -> '19', 9 -> '9'
        $form_data['sectiunea_I']["rd1_baza_impozabila_$rate_key"] = $invoice_row['base_impozabila'];
        $form_data['sectiunea_I']["rd1_tva_colectat_$rate_key"] = $invoice_row['tva_colectat'];
    }

    // ... Similar for bills (TVA deductible)

    // 4. Calculate total TVA to pay/recover
    $total_tva_colectat = array_sum(array_column($invoices, 'tva_colectat'));
    $total_tva_deductibil = array_sum(array_column($bills, 'tva_deductibil'));

    if ($total_tva_colectat > $total_tva_deductibil) {
        $form_data['sectiunea_III']['rd30_tva_de_plata'] = $total_tva_colectat - $total_tva_deductibil;
    } else {
        $form_data['sectiunea_III']['rd40_tva_de_recuperat'] = $total_tva_deductibil - $total_tva_colectat;
    }

    // 5. Validate
    $validation = $this->validateD300($form_data);

    // 6. Save declaration
    $declaration_id = $this->db->insert('fiscal_declarations', [
        'company_id' => $company_id,
        'declaration_type' => 'D300_TVA_MONTHLY',
        'reporting_period_start' => "$year-$month-01",
        'reporting_period_end' => date("Y-m-t", strtotime("$year-$month-01")),
        'year' => $year,
        'period' => sprintf("%02d", $month),
        'form_data' => json_encode($form_data),
        'validation_status' => $validation['status'],
        'validation_errors' => json_encode($validation['errors']),
        'validation_warnings' => json_encode($validation['warnings']),
        'data_sources' => json_encode([
            'invoices_used' => array_column($invoices, 'id'),
            'bills_used' => array_column($bills, 'id'),
            'date_range' => [
                'from' => "$year-$month-01",
                'to' => date("Y-m-t", strtotime("$year-$month-01"))
            ]
        ])
    ]);

    // 7. Generate PDF
    $this->exportToPDF($declaration_id);

    return $declaration_id;
}
```

---

### Service 4: Smart Reminder Engine
**File:** `/includes/services/fiscal_calendar/SmartReminderEngine.php`

**Purpose:** Send contextual reminders at the right time

**Key Functions:**
- `processScheduledReminders()` - Run every hour via cron
- `createReminderForDeadline($calendar_entry)` - Generate smart reminder text
- `determineReminderChannels($user_preferences, $urgency)` - Email vs SMS vs Push
- `sendReminder($reminder)` - Dispatch via appropriate channels

**Example Reminder Logic:**

```php
public function createReminderForDeadline($calendar_entry) {
    $deadline = $calendar_entry->deadline;
    $days_until = (strtotime($calendar_entry->due_date) - time()) / 86400;

    // Determine urgency and tone
    if ($days_until <= 0) {
        $priority = 'critical';
        $title = "🚨 URGENT: Termen depășit - {$deadline->deadline_name}";
        $message = "Termenul de depunere a fost {$calendar_entry->due_date}. Depuneți cât mai curând pentru a minimiza penalitățile.";
        $channels = ['email', 'sms', 'push'];
    } elseif ($days_until == 1) {
        $priority = 'high';
        $title = "⚠️ MÂINE: {$deadline->deadline_name}";
        $message = "Termenul de depunere este MÂINE ({$calendar_entry->due_date}). ";

        // Check if auto-generated
        if ($calendar_entry->declaration_id) {
            $message .= "Declarația este pregătită și vă așteaptă pentru verificare și trimitere.";
            $action_label = "Verifică și trimite declarația";
        } else {
            $message .= "Generați declarația acum pentru a avea timp de verificare.";
            $action_label = "Generează declarația acum";
        }
        $channels = ['email', 'push'];
    } elseif ($days_until <= 3) {
        $priority = 'normal';
        $title = "{$deadline->deadline_name} - {$days_until} zile rămase";
        $message = "Mai aveți {$days_until} zile până la termenul de depunere ({$calendar_entry->due_date}). ";

        if ($calendar_entry->declaration_id) {
            $message .= "Declarația a fost pre-generată cu datele din platformă. Verificați-o și trimiteți-o când sunteți gata.";
        } else {
            $message .= "Recomandăm să generați declarația astăzi pentru a avea timp de verificare.";
        }
        $channels = ['email'];
    } else {
        $priority = 'low';
        $title = "{$deadline->deadline_name} - {$days_until} zile până la termen";
        $message = "Vă reamintim că termenul de depunere este {$calendar_entry->due_date}. DocumentIulia poate genera automat declarația folosind datele validate din platformă.";
        $channels = ['email'];
    }

    // Create reminder
    $this->db->insert('fiscal_reminders', [
        'company_id' => $calendar_entry->company_id,
        'calendar_entry_id' => $calendar_entry->id,
        'reminder_type' => 'deadline_approaching',
        'priority' => $priority,
        'scheduled_for' => date('Y-m-d H:i:s', strtotime($calendar_entry->due_date) - ($days_until * 86400)),
        'title' => $title,
        'message' => $message,
        'action_url' => "/fiscal-calendar/declaration/{$calendar_entry->id}",
        'action_label' => $action_label ?? 'Vezi detalii',
        'channels' => '{' . implode(',', $channels) . '}'
    ]);
}
```

---

## 🎨 Frontend Implementation

### Component 1: Fiscal Calendar Dashboard
**File:** `/frontend/src/pages/fiscal-calendar/FiscalCalendarDashboard.tsx`

**Features:**
- Monthly/Yearly calendar view
- Color-coded deadlines (overdue=red, upcoming=yellow, completed=green)
- Quick filters (TVA, CAS, Profit Tax, etc.)
- Urgent deadlines widget
- Auto-generated declarations counter

**UI Mock:**

```
┌─────────────────────────────────────────────────────────────────┐
│  📅 Calendar Fiscal 2025                    [Monthly ▼] [2025 ▼]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🚨 URGENT (2)    ⚠️ UPCOMING (5)    ✅ COMPLETED (18)         │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ DECEMBRIE 2025                                             ││
│  ├────┬────┬────┬────┬────┬────┬────────────────────────────┤│
│  │ L  │ M  │ M  │ J  │ V  │ S  │ D                          ││
│  ├────┼────┼────┼────┼────┼────┼────────────────────────────┤│
│  │ 1  │ 2  │ 3  │ 4  │ 5  │ 6  │ 7                          ││
│  │    │    │    │    │    │    │                            ││
│  ├────┼────┼────┼────┼────┼────┼────────────────────────────┤│
│  │ 8  │ 9  │ 10 │ 11 │ 12 │ 13 │ 14                         ││
│  │    │    │    │    │    │    │                            ││
│  ├────┼────┼────┼────┼────┼────┼────────────────────────────┤│
│  │ 15 │ 16 │ 17 │ 18 │ 19 │ 20 │ 21                         ││
│  │    │    │    │    │    │    │                            ││
│  ├────┼────┼────┼────┼────┼────┼────────────────────────────┤│
│  │ 22 │ 23 │ 24 │ 25 │ 26 │ 27 │ 28                         ││
│  │    │    │    │🔴  │    │    │                            ││
│  │    │    │    │D300│    │    │                            ││
│  │    │    │    │TVA │    │    │                            ││
│  ├────┼────┼────┼────┼────┼────┼────────────────────────────┤│
│  │ 29 │ 30 │ 31 │    │    │    │                            ││
│  │    │    │    │    │    │    │                            ││
│  └────┴────┴────┴────┴────┴────┴────────────────────────────┘│
│                                                                 │
│  TERMEN URGENT: 25 Decembrie                                    │
│  ┌─────────────────────────────────────────────────────────────┐
│  │ 🔴 D300 - Declarație TVA (Noiembrie 2025)                   │
│  │ ⏰ Termen: 25 decembrie 2025 (MÂINE!)                       │
│  │ 📊 Status: Declarație pregătită automat                     │
│  │ ✅ Validare: 0 erori, 1 avertisment                         │
│  │                                                              │
│  │ [Verifică declarația] [Trimite la ANAF]  [Amână]           │
│  └─────────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────┘
```

---

### Component 2: Declaration Review & Submit
**File:** `/frontend/src/pages/fiscal-calendar/DeclarationReview.tsx`

**Features:**
- Side-by-side view: Form fields vs Platform data
- Validation errors highlighted
- Edit capability for manual adjustments
- PDF preview
- One-click ANAF submission (via e-Factura API)

---

### Component 3: Form Update Alerts
**File:** `/frontend/src/components/fiscal-calendar/FormUpdateAlert.tsx`

**Features:**
- Popup notification when ANAF updates a form
- "What changed" summary
- Action buttons: "Update my declarations" / "Learn more"

---

## 🤖 Automation Features

### Feature 1: Auto-Generation on Data Entry

**Trigger:** When user completes an activity that feeds into a declaration

**Example:**
- User records last invoice for November → Trigger D300 (TVA) generation for November
- User completes payroll for December → Trigger D112 (Salaries) generation

**Implementation:**

```php
// In InvoiceController.php
public function markInvoiceAsPaid($invoice_id) {
    // ... existing logic ...

    // Trigger fiscal calendar check
    $fiscalCalendar = new FiscalCalendarService();
    $fiscalCalendar->checkAutoGenerationTriggers($invoice->company_id, [
        'data_type' => 'invoice',
        'period' => date('Y-m', strtotime($invoice->invoice_date))
    ]);
}
```

---

### Feature 2: Intelligent Data Validation

**Before auto-generating, validate:**
- All invoices for period are recorded
- All expenses are categorized
- No missing sequences in invoice numbers
- Bank reconciliation complete

**User feedback:**

```
⚠️ AVERTISMENT: Generare D300 pentru Noiembrie 2025

Datele tale sunt aproape complete, dar recomandăm să verifici:

1. ✅ Facturi emise: 45 facturi, total 125.000 RON
2. ⚠️ Facturi primite: 12 bonuri, 1 factură lipsește seria (click pentru detalii)
3. ✅ Reconciliere bancară: Completă pentru noiembrie
4. ⚠️ Cheltuieli fără categorie: 2 bonuri (click pentru categorizare)

[Generează oricum] [Rezolvă avertismentele mai întâi]
```

---

## 📊 Analytics & Insights

### Dashboard Widget: Fiscal Health Score

**Metrics:**
- On-time submission rate (last 12 months)
- Average days before deadline
- Auto-generated vs Manual submissions
- Penalties avoided (estimated)

**Example:**

```
┌──────────────────────────────────────────┐
│ 📊 SCOR SĂNĂTATE FISCALĂ                 │
├──────────────────────────────────────────┤
│                                          │
│  Scor global: 92/100 ⭐⭐⭐⭐⭐           │
│                                          │
│  ✅ Depuneri la timp: 18/20 (90%)       │
│  ⏱️ Timp mediu înainte de termen: 5 zile│
│  🤖 Auto-generate: 85% din declarații   │
│  💰 Penalități evitate: ~2.500 RON      │
│                                          │
│  [Vezi detalii]                          │
└──────────────────────────────────────────┘
```

---

## 🚀 Implementation Roadmap

### Phase 1: Database & Core Services (1 week)
- [ ] Create 7 database tables
- [ ] Seed anaf_fiscal_deadlines with 200+ deadlines
- [ ] Seed anaf_declaration_forms with D300, D112, D101
- [ ] Build FiscalCalendarGenerator service
- [ ] Build DeclarationAutoGenerator service (D300 only)

### Phase 2: Frontend Calendar (1 week)
- [ ] Build FiscalCalendarDashboard component
- [ ] Build DeclarationReview component
- [ ] Integrate with existing tasks system
- [ ] Add calendar widget to main dashboard

### Phase 3: Auto-Generation & Validation (1 week)
- [ ] Implement D300 (TVA) auto-generation
- [ ] Implement D112 (Salaries) auto-generation
- [ ] Build validation engine
- [ ] Implement data completeness checks

### Phase 4: ANAF Scraper & Updates (1 week)
- [ ] Build AnafScraperService
- [ ] Implement form change detection
- [ ] Build FormUpdateAlert component
- [ ] Set up daily cron job

### Phase 5: Smart Reminders (3 days)
- [ ] Build SmartReminderEngine
- [ ] Integrate with email service
- [ ] Add SMS capability (Twilio)
- [ ] Add push notifications

**Total Effort:** 4 weeks
**Revenue Impact:** +€150,000/year
**User Savings:** 40+ hours/year per user

---

## 💰 Business Impact

### ROI Calculation

**Development Cost:** 4 weeks × €5,000/week = €20,000

**Revenue Impact (Year 1):**
- Increased retention: 5% → +€50,000
- Higher conversion: 10% → +€70,000
- Premium feature upsell: 20% adoption → +€30,000
- **Total:** +€150,000/year

**ROI:** 750% in Year 1

**Payback Period:** 7 weeks

---

## 🏆 Competitive Advantage

**No Romanian platform has:**
- ✅ Auto-generation of declarations from accounting data
- ✅ Automatic ANAF form update detection
- ✅ Integrated fiscal + business calendar
- ✅ Smart reminders with pre-filled declarations
- ✅ Data provenance tracking (which invoices contributed to which declaration)

**This feature alone could justify €20-30/month premium pricing.**

---

## 📚 Documentation Requirements

### User Guide Sections:
1. "Cum funcționează Calendarul Fiscal"
2. "Generarea automată a declarațiilor"
3. "Verificarea și trimiterea declarațiilor"
4. "Înțelegerea avertismentelor de validare"
5. "Ce fac când ANAF actualizează un formular"

### Video Tutorials:
1. "Calendar Fiscal - Prezentare generală" (10 min)
2. "Prima ta declarație D300 auto-generată" (15 min)
3. "Cum să gestionezi termenele fiscale eficient" (12 min)

---

**Document Status:** Complete Design Specification
**Next Step:** Database implementation
**Estimated Launch:** 4 weeks from start
**Market Impact:** Game-changer for DocumentIulia
