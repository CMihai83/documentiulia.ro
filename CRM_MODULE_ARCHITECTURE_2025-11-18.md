# 🤝 CRM Module - Complete Architecture

**Date**: 2025-11-18
**Status**: 🚧 IN PROGRESS
**Scope**: Contacts, Opportunities, Quotations

---

## 📊 Executive Summary

Building a comprehensive CRM (Customer Relationship Management) module for DocumentiUlia to manage:
1. **Contacts** - Customers, Vendors, and Leads
2. **Opportunities** - Sales pipeline and deal tracking
3. **Quotations** - Professional quotes that convert to invoices

---

## 🗄️ Database Schema

### 1. Contacts Table (EXISTS ✅)
Already created with comprehensive fields:
- ID, company_id, contact_type
- display_name, email, phone
- payment_terms, currency
- is_active, created_at, updated_at

**Enhancement Needed**: Add CRM-specific fields
```sql
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS position VARCHAR(100),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS county VARCHAR(100),
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'România',
ADD COLUMN IF NOT EXISTS website VARCHAR(255),
ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS source VARCHAR(50), -- 'website', 'referral', 'cold_call', etc.
ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating BETWEEN 1 AND 5), -- 1-5 stars
ADD COLUMN IF NOT EXISTS tags TEXT[]; -- Array of tags
```

### 2. Opportunities Table (NEW)
Track sales pipeline and deals:

```sql
CREATE TABLE opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

    -- Opportunity Details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'RON',
    probability INTEGER CHECK (probability BETWEEN 0 AND 100) DEFAULT 50,
    expected_close_date DATE,

    -- Pipeline Stage
    stage VARCHAR(50) NOT NULL DEFAULT 'lead',
    -- Stages: lead, qualified, proposal, negotiation, won, lost
    stage_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Assignment
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Loss Reason (if stage = 'lost')
    loss_reason VARCHAR(100),
    loss_notes TEXT,

    -- Source Tracking
    source VARCHAR(50), -- 'inbound', 'outbound', 'referral', 'partner'
    campaign VARCHAR(100),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,

    -- Multi-tenant
    CONSTRAINT opportunities_company_fkey FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE INDEX idx_opportunities_company ON opportunities(company_id, stage);
CREATE INDEX idx_opportunities_contact ON opportunities(contact_id);
CREATE INDEX idx_opportunities_assigned ON opportunities(assigned_to);
CREATE INDEX idx_opportunities_stage ON opportunities(company_id, stage, expected_close_date);
```

### 3. Quotations Table (NEW)
Professional quotes that can convert to invoices:

```sql
CREATE TABLE quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
    opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,

    -- Quotation Details
    quotation_number VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE NOT NULL,

    -- Financial
    subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5, 2) DEFAULT 19.00, -- Romania VAT
    tax_amount DECIMAL(15, 2) DEFAULT 0,
    discount_amount DECIMAL(15, 2) DEFAULT 0,
    total_amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'RON',

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    -- Statuses: draft, sent, accepted, rejected, expired, converted
    sent_at TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    converted_to_invoice_id UUID REFERENCES invoices(id),

    -- Terms
    payment_terms INTEGER DEFAULT 30,
    terms_and_conditions TEXT,
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Multi-tenant
    CONSTRAINT quotations_company_fkey FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE INDEX idx_quotations_company ON quotations(company_id, status);
CREATE INDEX idx_quotations_contact ON quotations(contact_id);
CREATE INDEX idx_quotations_opportunity ON quotations(opportunity_id);
CREATE INDEX idx_quotations_number ON quotations(quotation_number);
CREATE INDEX idx_quotations_dates ON quotations(company_id, issue_date, expiry_date);
```

### 4. Quotation Items Table (NEW)
Line items for quotations:

```sql
CREATE TABLE quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,

    -- Item Details
    item_order INTEGER NOT NULL DEFAULT 0,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(15, 2) NOT NULL,
    unit_of_measure VARCHAR(20) DEFAULT 'buc',

    -- Tax
    tax_rate DECIMAL(5, 2) DEFAULT 19.00,
    tax_amount DECIMAL(15, 2) DEFAULT 0,

    -- Totals
    line_total DECIMAL(15, 2) NOT NULL,

    -- Optional Product Link
    product_id UUID REFERENCES inventory_products(id) ON DELETE SET NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_quotation_items_quotation ON quotation_items(quotation_id);
CREATE INDEX idx_quotation_items_product ON quotation_items(product_id);
```

### 5. Opportunity Activities Table (NEW)
Track all interactions with opportunities:

```sql
CREATE TABLE opportunity_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Activity Details
    activity_type VARCHAR(50) NOT NULL,
    -- Types: 'email', 'call', 'meeting', 'note', 'stage_change', 'task'
    subject VARCHAR(255),
    description TEXT,

    -- Scheduling
    scheduled_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    duration_minutes INTEGER,
    outcome VARCHAR(100), -- 'positive', 'neutral', 'negative'

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_opportunity_activities_opportunity ON opportunity_activities(opportunity_id);
CREATE INDEX idx_opportunity_activities_user ON opportunity_activities(user_id);
CREATE INDEX idx_opportunity_activities_type ON opportunity_activities(activity_type, scheduled_at);
```

---

## 🎯 API Endpoints

### Contacts API
- ✅ `GET /api/v1/contacts/list.php` - List contacts
- ✅ `POST /api/v1/contacts/create.php` - Create contact
- ✅ `PUT /api/v1/contacts/update.php` - Update contact
- ✅ `DELETE /api/v1/contacts/delete.php` - Delete contact
- 🆕 `GET /api/v1/contacts/stats.php` - Contact statistics
- 🆕 `POST /api/v1/contacts/import.php` - Bulk import

### Opportunities API (NEW)
- `GET /api/v1/crm/opportunities.php` - List/Get opportunities
- `POST /api/v1/crm/opportunities.php` - Create opportunity
- `PUT /api/v1/crm/opportunities.php` - Update opportunity
- `DELETE /api/v1/crm/opportunities.php` - Delete opportunity
- `GET /api/v1/crm/opportunities-pipeline.php` - Pipeline view
- `POST /api/v1/crm/opportunities-move-stage.php` - Change stage
- `POST /api/v1/crm/opportunities-activity.php` - Add activity

### Quotations API (NEW)
- `GET /api/v1/crm/quotations.php` - List/Get quotations
- `POST /api/v1/crm/quotations.php` - Create quotation
- `PUT /api/v1/crm/quotations.php` - Update quotation
- `DELETE /api/v1/crm/quotations.php` - Delete quotation
- `POST /api/v1/crm/quotations-send.php` - Send quotation to customer
- `POST /api/v1/crm/quotations-accept.php` - Accept quotation
- `POST /api/v1/crm/quotations-reject.php` - Reject quotation
- `POST /api/v1/crm/quotations-convert.php` - Convert to invoice
- `GET /api/v1/crm/quotations-pdf.php` - Generate PDF

---

## 🎨 Frontend Pages

### 1. CRM Dashboard (`/crm`)
- **KPIs**: Total contacts, active opportunities, open quotations, conversion rate
- **Pipeline Overview**: Kanban-style opportunity stages
- **Recent Activity**: Latest interactions
- **Quick Stats**: This month's wins, losses, quotes sent

### 2. Contacts Page (`/crm/contacts`)
- **List View**: Searchable, filterable contact list
- **Contact Types**: Tabs for Customers, Vendors, Leads
- **Details Modal**: View/edit contact information
- **Quick Actions**: Call, email, create opportunity, create quote
- **Mobile**: Card layout

### 3. Opportunities Page (`/crm/opportunities`)
- **Pipeline View**: Kanban board with drag-and-drop
- **List View**: Table with filters
- **Opportunity Details**: Modal with activities timeline
- **Stages**: Lead → Qualified → Proposal → Negotiation → Won/Lost
- **Mobile**: Card layout with stage indicators

### 4. Quotations Page (`/crm/quotations`)
- **List View**: All quotations with status badges
- **Create/Edit**: Multi-step wizard (similar to invoice)
- **Preview**: PDF preview before sending
- **Actions**: Send, Accept, Reject, Convert to Invoice
- **Mobile**: Card layout with status

### 5. Opportunity Detail Page (`/crm/opportunities/:id`)
- **Overview**: Amount, probability, expected close date
- **Activities Timeline**: All interactions
- **Related**: Linked quotations, contact info
- **Stage Progress**: Visual pipeline position
- **Actions**: Add note, schedule call, move stage

---

## 🎨 UI Components

### Reusable Components:
1. **ContactPicker** - Searchable contact selector
2. **OpportunityCard** - Opportunity summary card
3. **PipelineKanban** - Drag-drop pipeline board
4. **QuotationPreview** - PDF-style quotation preview
5. **ActivityTimeline** - Chronological activity feed
6. **StageIndicator** - Visual stage progress bar
7. **ContactModal** - Quick contact view/edit

---

## 📱 Mobile Optimization

All CRM pages will follow the same mobile patterns as Inventory:
- **Container**: `px-3 sm:px-4 md:px-6 lg:px-8`
- **Headers**: Responsive text sizes
- **Buttons**: 44x44px minimum touch targets
- **Tables → Cards**: On mobile (< 768px)
- **Modals**: Full-screen on mobile

---

## 🚀 Implementation Plan

### Phase 1: Database & Backend (Day 1)
1. ✅ Research existing infrastructure
2. 🔄 Create database migrations
3. 🔄 Build Opportunities API
4. 🔄 Build Quotations API
5. 🔄 Enhance Contacts API

### Phase 2: Frontend Core (Day 2)
1. CRM Dashboard with KPIs
2. Enhanced Contacts page
3. Opportunities pipeline (Kanban)
4. Quotations list & create

### Phase 3: Advanced Features (Day 3)
1. Opportunity detail page with activities
2. Quotation PDF generation
3. Email integration (send quotes)
4. Convert quotation to invoice

### Phase 4: Polish & Mobile (Day 4)
1. Mobile optimization for all pages
2. Drag-and-drop refinement
3. Testing and bug fixes
4. Documentation

---

## 🎯 Success Metrics

| Metric | Target |
|--------|--------|
| **Database Tables** | 5 new tables |
| **API Endpoints** | 15+ endpoints |
| **Frontend Pages** | 5 main pages |
| **Mobile Optimized** | 100% |
| **Build Time** | < 5 seconds |
| **Bundle Size** | < 1MB |

---

## 📊 Feature Comparison

| Feature | DocumentiUlia CRM | Industry Standard |
|---------|-------------------|-------------------|
| Contact Management | ✅ | ✅ |
| Opportunity Pipeline | ✅ | ✅ |
| Quotations | ✅ | ✅ |
| Activities Timeline | ✅ | ✅ |
| Drag-Drop Pipeline | ✅ | ✅ (Salesforce, HubSpot) |
| Email Integration | ⏳ Phase 3 | ✅ |
| Mobile App | ✅ Web | ✅ Native Apps |
| Conversion Tracking | ✅ | ✅ |

---

## 🔮 Future Enhancements (v2.0)

1. **Email Integration**: Send/receive emails directly
2. **Calendar Integration**: Sync meetings to Google Calendar
3. **Email Templates**: Pre-built quotation email templates
4. **Automated Follow-ups**: Reminders for stale opportunities
5. **Reporting**: Sales forecasting, win/loss analysis
6. **Mobile Apps**: iOS and Android native apps
7. **Lead Scoring**: AI-powered lead qualification
8. **SMS Integration**: Send quotes via SMS

---

**Document Version**: 1.0
**Created**: 2025-11-18
**Status**: 🚧 Architecture Complete - Ready for Implementation
**Next**: Begin database migrations

---

*Building a comprehensive CRM to manage the entire customer lifecycle from lead to invoice!*
