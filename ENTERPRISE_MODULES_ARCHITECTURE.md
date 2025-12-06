# 🏢 DocumentiUlia - Enterprise Modules Architecture

**Version:** 2.0
**Date:** 2025-11-19
**Status:** Production Ready
**Architecture:** Microservices + Event-Driven + AI-Enhanced

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Module 1: Advanced Time Tracking](#module-1-advanced-time-tracking)
4. [Module 2: Project Management](#module-2-project-management)
5. [Module 3: Advanced Accounting](#module-3-advanced-accounting)
6. [Module 4: Analytics & Business Intelligence](#module-4-analytics--business-intelligence)
7. [Cross-Module Integration](#cross-module-integration)
8. [Technology Stack](#technology-stack)
9. [Security & Compliance](#security--compliance)
10. [Performance & Scalability](#performance--scalability)

---

## Executive Summary

This document outlines the architecture for four enterprise-grade modules:

| Module | Key Features | Technology Highlights |
|--------|--------------|----------------------|
| **Time Tracking** | AI-powered auto-tracking, project integration, billable hours, team productivity | ML task prediction, GPS/geofencing, real-time sync |
| **Project Management** | Gantt charts, resource allocation, critical path, agile boards, dependencies | WebSocket updates, AI scheduling, risk prediction |
| **Advanced Accounting** | Multi-currency, automated reconciliation, tax compliance, financial statements | AI categorization, OCR receipts, blockchain audit trail |
| **Analytics & BI** | Predictive analytics, custom dashboards, data warehouse, ML insights | TimescaleDB, Apache Superset, TensorFlow integration |

**Unique Selling Points:**
- 🤖 **AI-First Approach:** Machine learning integrated into every module
- ⚡ **Real-Time Collaboration:** WebSocket-powered live updates
- 🔗 **Deep Integration:** Modules work seamlessly together
- 📊 **Data-Driven:** Advanced analytics and predictive insights
- 🌍 **Global Ready:** Multi-currency, multi-language, multi-timezone
- 🔐 **Enterprise Security:** Role-based access, audit trails, encryption

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                             │
│  React SPA • Mobile Apps • Third-party Integrations             │
└────────────┬────────────────────────────────────────────────────┘
             │
             ├─── REST API Gateway (Nginx + JWT)
             │
┌────────────┴────────────────────────────────────────────────────┐
│                    Application Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Time Tracking│  │   Project    │  │  Accounting  │          │
│  │   Service    │  │ Mgmt Service │  │   Service    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                  │
│  ┌──────┴──────────────────┴──────────────────┴─────┐          │
│  │         Analytics & BI Service                    │          │
│  └───────────────────────────┬───────────────────────┘          │
└────────────────────────────────┼──────────────────────────────────┘
                                 │
┌────────────────────────────────┴──────────────────────────────────┐
│                         Data Layer                                │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐              │
│  │ PostgreSQL  │  │ TimescaleDB  │  │   Redis    │              │
│  │   (OLTP)    │  │   (OLAP)     │  │  (Cache)   │              │
│  └─────────────┘  └──────────────┘  └────────────┘              │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐              │
│  │ Elasticsearch│  │   RabbitMQ   │  │  MinIO     │              │
│  │  (Search)   │  │  (Events)    │  │(File Store)│              │
│  └─────────────┘  └──────────────┘  └────────────┘              │
└───────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + TypeScript | SPA with real-time updates |
| **API** | PHP 8.2 + Nginx | RESTful API gateway |
| **Database** | PostgreSQL 15 | Primary transactional data |
| **Time-Series** | TimescaleDB | Analytics & historical data |
| **Cache** | Redis 7 | Session, caching, pub/sub |
| **Search** | Elasticsearch 8 | Full-text search & logs |
| **Queue** | RabbitMQ | Event-driven architecture |
| **Files** | MinIO | S3-compatible object storage |
| **AI/ML** | TensorFlow.js + Python | Predictive models |
| **BI** | Apache Superset | Dashboards & reporting |

---

## Module 1: Advanced Time Tracking

### Features Overview

#### Core Capabilities
✅ Manual time entry with project/task assignment
✅ Automatic time tracking (desktop/mobile apps)
✅ GPS-based location tracking for field teams
✅ Screenshot capture for remote workers (configurable)
✅ AI-powered activity classification
✅ Billable vs non-billable hours
✅ Approval workflows
✅ Overtime tracking
✅ Break time management
✅ Time-off requests integration

#### Advanced Features
🤖 **AI Task Prediction:** Learns user patterns and suggests tasks
🎯 **Smart Time Allocation:** Auto-distributes time across projects
📍 **Geofencing:** Auto-start/stop tracking based on location
📊 **Productivity Analytics:** Team and individual insights
⚡ **Real-Time Sync:** WebSocket-based live updates
🔔 **Smart Reminders:** ML-based reminder system
💰 **Billing Integration:** Direct invoice generation
📈 **Capacity Planning:** Predict resource availability

### Database Schema

```sql
-- Time Entries (Enhanced)
CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id),
    user_id UUID NOT NULL REFERENCES users(id),
    project_id UUID REFERENCES projects(id),
    task_id UUID REFERENCES tasks(id),

    -- Time tracking
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    break_duration_seconds INTEGER DEFAULT 0,

    -- Classification
    activity_type VARCHAR(50), -- coding, meeting, email, design, etc.
    is_billable BOOLEAN DEFAULT false,
    billable_rate DECIMAL(10,2),
    billable_amount DECIMAL(10,2),

    -- Description
    description TEXT,
    tags TEXT[],

    -- Location (if enabled)
    location_lat DECIMAL(10,8),
    location_lng DECIMAL(11,8),
    location_name VARCHAR(255),

    -- Device info
    device_type VARCHAR(50), -- desktop, mobile, web
    device_id VARCHAR(255),
    app_version VARCHAR(50),

    -- AI classification
    ai_suggested_task_id UUID,
    ai_confidence_score DECIMAL(3,2),
    ai_activity_category VARCHAR(50),

    -- Approval workflow
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,

    -- Invoice link
    invoice_id UUID REFERENCES invoices(id),
    invoiced_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_duration CHECK (
        (end_time IS NULL) OR
        (duration_seconds = EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER)
    )
);

-- Indexes for performance
CREATE INDEX idx_time_entries_user_date ON time_entries(user_id, start_time DESC);
CREATE INDEX idx_time_entries_project ON time_entries(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_time_entries_billable ON time_entries(is_billable, status) WHERE is_billable = true;
CREATE INDEX idx_time_entries_status ON time_entries(status, company_id);

-- Time Tracking Rules (Per Project/Company)
CREATE TABLE time_tracking_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id),
    project_id UUID REFERENCES projects(id),

    -- Settings
    require_location BOOLEAN DEFAULT false,
    require_screenshots BOOLEAN DEFAULT false,
    screenshot_interval_minutes INTEGER DEFAULT 10,
    allow_manual_entry BOOLEAN DEFAULT true,
    require_approval BOOLEAN DEFAULT false,
    auto_stop_after_hours INTEGER DEFAULT 8,

    -- Geofencing
    geofence_enabled BOOLEAN DEFAULT false,
    geofence_center_lat DECIMAL(10,8),
    geofence_center_lng DECIMAL(11,8),
    geofence_radius_meters INTEGER DEFAULT 100,

    -- Billable rates
    default_billable_rate DECIMAL(10,2),
    overtime_multiplier DECIMAL(3,2) DEFAULT 1.5,
    weekend_multiplier DECIMAL(3,2) DEFAULT 2.0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Activity Patterns (for AI learning)
CREATE TABLE time_activity_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),

    -- Pattern identification
    day_of_week INTEGER, -- 0-6
    hour_of_day INTEGER, -- 0-23
    activity_type VARCHAR(50),
    typical_duration_minutes INTEGER,

    -- Learning data
    occurrence_count INTEGER DEFAULT 1,
    last_occurrence TIMESTAMP WITH TIME ZONE,
    confidence_score DECIMAL(3,2),

    -- AI model version
    model_version VARCHAR(50),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, day_of_week, hour_of_day, activity_type)
);

-- Time-off Requests
CREATE TABLE time_off_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id),
    user_id UUID NOT NULL REFERENCES users(id),

    -- Request details
    type VARCHAR(50) NOT NULL, -- vacation, sick, personal, etc.
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days DECIMAL(4,2) NOT NULL,

    -- Approval
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,

    -- Description
    reason TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### API Endpoints

```
POST   /api/v1/time/entries           - Start/create time entry
PUT    /api/v1/time/entries/:id       - Update time entry
DELETE /api/v1/time/entries/:id       - Delete time entry
GET    /api/v1/time/entries           - List time entries (with filters)
POST   /api/v1/time/entries/:id/stop  - Stop running timer

GET    /api/v1/time/dashboard         - User time tracking dashboard
GET    /api/v1/time/analytics         - Team analytics
GET    /api/v1/time/reports           - Generate reports

POST   /api/v1/time/approve/:id       - Approve time entry
POST   /api/v1/time/reject/:id        - Reject time entry

GET    /api/v1/time/ai/suggest-task   - AI task suggestion
GET    /api/v1/time/ai/predict-duration - Predict task duration

POST   /api/v1/time/time-off          - Request time off
GET    /api/v1/time/time-off          - List time-off requests
PUT    /api/v1/time/time-off/:id      - Update time-off request
```

### AI/ML Features

**1. Task Prediction**
- Analyzes past patterns (time of day, day of week, recent tasks)
- Suggests most likely task when user starts timer
- Confidence score: 0.0 - 1.0

**2. Duration Estimation**
- Predicts how long a task will take based on similar past tasks
- Considers user performance history
- Adjusts based on interruptions and context switches

**3. Activity Classification**
- Automatically categorizes activities (coding, meetings, etc.)
- Learns from user corrections
- Integrates with calendar and communication tools

---

## Module 2: Project Management

### Features Overview

#### Core Capabilities
✅ Project creation with templates
✅ Task management with subtasks
✅ Kanban boards (drag & drop)
✅ Gantt charts with dependencies
✅ Resource allocation
✅ Milestone tracking
✅ Document management
✅ Team collaboration
✅ Client portal access
✅ Budget tracking

#### Advanced Features
🤖 **AI Project Planning:** Auto-generates project plan from description
🎯 **Critical Path Analysis:** Identifies bottlenecks automatically
📊 **Resource Optimization:** ML-based resource allocation
⚡ **Real-Time Collaboration:** Live cursors, WebSocket updates
🔔 **Smart Notifications:** Context-aware alerts
📈 **Risk Prediction:** AI-powered risk assessment
💰 **Budget Forecasting:** Predicts overruns before they happen
🔄 **Agile + Waterfall:** Hybrid methodology support

### Database Schema

```sql
-- Projects (Enhanced)
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id),

    -- Basic info
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    description TEXT,

    -- Client relationship
    client_id UUID REFERENCES contacts(id),
    client_contact_person VARCHAR(255),
    client_email VARCHAR(255),

    -- Dates
    start_date DATE,
    end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,

    -- Status
    status VARCHAR(50) DEFAULT 'planning',
    -- planning, active, on_hold, completed, cancelled
    health_status VARCHAR(20) DEFAULT 'on_track',
    -- on_track, at_risk, off_track
    completion_percentage DECIMAL(5,2) DEFAULT 0.00,

    -- Financial
    budget DECIMAL(12,2),
    actual_cost DECIMAL(12,2) DEFAULT 0.00,
    revenue DECIMAL(12,2) DEFAULT 0.00,
    profit_margin DECIMAL(5,2),

    -- Team
    project_manager_id UUID REFERENCES users(id),
    team_member_ids UUID[],

    -- Settings
    methodology VARCHAR(50) DEFAULT 'agile', -- agile, waterfall, hybrid
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    color VARCHAR(7), -- #HEX color for UI

    -- AI insights
    ai_risk_score DECIMAL(3,2), -- 0.00 - 1.00
    ai_suggested_end_date DATE,
    ai_resource_warnings JSONB,

    -- Visibility
    is_billable BOOLEAN DEFAULT true,
    is_internal BOOLEAN DEFAULT false,
    client_portal_access BOOLEAN DEFAULT false,

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP WITH TIME ZONE
);

-- Tasks (Enhanced with Dependencies)
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id),
    project_id UUID REFERENCES projects(id),
    parent_task_id UUID REFERENCES tasks(id),

    -- Basic info
    title VARCHAR(500) NOT NULL,
    description TEXT,

    -- Organization
    section VARCHAR(255), -- For Kanban columns or task groups
    priority VARCHAR(20) DEFAULT 'medium',
    tags TEXT[],

    -- Assignment
    assigned_to UUID[] DEFAULT '{}',
    created_by UUID REFERENCES users(id),

    -- Dates
    start_date DATE,
    due_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Status
    status VARCHAR(50) DEFAULT 'todo',
    -- todo, in_progress, in_review, blocked, completed, cancelled

    -- Effort tracking
    estimated_hours DECIMAL(8,2),
    actual_hours DECIMAL(8,2) DEFAULT 0.00,
    remaining_hours DECIMAL(8,2),

    -- Dependencies
    depends_on UUID[], -- Array of task IDs that must complete first
    dependency_type VARCHAR(50) DEFAULT 'finish_to_start',
    -- finish_to_start, start_to_start, finish_to_finish, start_to_finish

    -- Position (for Kanban)
    position INTEGER DEFAULT 0,

    -- Checklist
    checklist_items JSONB, -- [{text, completed}]

    -- AI insights
    ai_estimated_hours DECIMAL(8,2),
    ai_risk_factors TEXT[],
    ai_similar_tasks UUID[],

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_project ON tasks(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_tasks_assigned ON tasks USING GIN(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status, due_date);
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;

-- Project Templates
CREATE TABLE project_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id),

    -- Template info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),

    -- Template structure (JSON)
    tasks_template JSONB, -- Array of task templates with dependencies
    milestones_template JSONB,
    default_duration_days INTEGER,

    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT false,

    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Project Milestones
CREATE TABLE project_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id),

    -- Milestone info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,

    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, completed, missed
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Financial
    payment_amount DECIMAL(12,2),
    payment_received BOOLEAN DEFAULT false,

    -- Dependencies
    required_tasks UUID[], -- Tasks that must be completed

    position INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Resource Allocation
CREATE TABLE resource_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id),
    user_id UUID NOT NULL REFERENCES users(id),

    -- Allocation
    allocation_percentage DECIMAL(5,2) NOT NULL, -- 0-100
    start_date DATE NOT NULL,
    end_date DATE,

    -- Role on project
    role VARCHAR(100),
    hourly_rate DECIMAL(10,2),

    -- Status
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_allocation CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100)
);
```

### API Endpoints

```
POST   /api/v1/projects                    - Create project
GET    /api/v1/projects                    - List projects
GET    /api/v1/projects/:id                - Get project details
PUT    /api/v1/projects/:id                - Update project
DELETE /api/v1/projects/:id                - Archive project

POST   /api/v1/projects/:id/tasks          - Create task
GET    /api/v1/projects/:id/tasks          - List tasks
PUT    /api/v1/projects/:id/tasks/:taskId  - Update task
DELETE /api/v1/projects/:id/tasks/:taskId  - Delete task

GET    /api/v1/projects/:id/gantt          - Gantt chart data
GET    /api/v1/projects/:id/kanban         - Kanban board data
POST   /api/v1/projects/:id/kanban/move    - Move task between columns

GET    /api/v1/projects/:id/critical-path  - Calculate critical path
GET    /api/v1/projects/:id/timeline       - Project timeline
GET    /api/v1/projects/:id/team           - Team view with workload

POST   /api/v1/projects/:id/milestones     - Create milestone
GET    /api/v1/projects/:id/milestones     - List milestones
PUT    /api/v1/projects/:id/milestones/:id - Update milestone

GET    /api/v1/projects/:id/ai/risk-analysis    - AI risk assessment
POST   /api/v1/projects/:id/ai/optimize-schedule - AI schedule optimization
GET    /api/v1/projects/:id/ai/resource-suggestions - AI resource recommendations

POST   /api/v1/project-templates           - Create template
GET    /api/v1/project-templates           - List templates
POST   /api/v1/projects/from-template/:id  - Create project from template
```

### Real-Time Features (WebSocket)

```javascript
// Client subscribes to project updates
ws.subscribe('project:' + projectId, (event) => {
  switch(event.type) {
    case 'task.created':
    case 'task.updated':
    case 'task.moved':
    case 'task.completed':
    case 'comment.added':
    case 'file.uploaded':
    case 'user.joined':
      // Update UI in real-time
  }
});
```

---

## Module 3: Advanced Accounting

### Features Overview

#### Core Capabilities
✅ Double-entry bookkeeping
✅ Chart of accounts
✅ Journal entries
✅ General ledger
✅ Trial balance
✅ Financial statements (P&L, Balance Sheet, Cash Flow)
✅ Multi-currency support
✅ Tax management (VAT, income tax)
✅ Bank reconciliation
✅ Fixed assets management

#### Advanced Features
🤖 **AI Transaction Categorization:** Auto-classifies expenses
📸 **OCR Receipt Scanning:** Extract data from images
🔗 **Bank Feed Integration:** Auto-import transactions
💱 **Multi-Currency & Crypto:** Real-time exchange rates
📊 **Consolidated Reporting:** Multi-company financials
🔐 **Blockchain Audit Trail:** Immutable transaction log
📈 **Predictive Cash Flow:** ML-based forecasting
🌍 **Multi-GAAP Compliance:** US GAAP, IFRS, Romanian standards

### Database Schema

```sql
-- Chart of Accounts
CREATE TABLE chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id),

    -- Account identification
    account_code VARCHAR(50) NOT NULL,
    account_name VARCHAR(255) NOT NULL,

    -- Classification
    account_type VARCHAR(50) NOT NULL,
    -- asset, liability, equity, revenue, expense
    account_subtype VARCHAR(100),
    -- cash, accounts_receivable, inventory, etc.

    -- Hierarchy
    parent_account_id UUID REFERENCES chart_of_accounts(id),
    level INTEGER DEFAULT 0,

    -- Properties
    is_active BOOLEAN DEFAULT true,
    is_system_account BOOLEAN DEFAULT false,
    allow_manual_entries BOOLEAN DEFAULT true,

    -- Tax
    default_tax_rate_id UUID,

    -- Currency
    currency_code VARCHAR(3) DEFAULT 'RON',

    -- Balance tracking
    current_balance DECIMAL(15,2) DEFAULT 0.00,
    current_balance_local DECIMAL(15,2) DEFAULT 0.00,

    -- Metadata
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(company_id, account_code)
);

-- Journal Entries (Double-Entry)
CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id),

    -- Entry details
    entry_number VARCHAR(50) UNIQUE,
    entry_date DATE NOT NULL,
    posting_date DATE,

    -- Type
    entry_type VARCHAR(50) DEFAULT 'manual',
    -- manual, automatic, reversal, closing

    -- Status
    status VARCHAR(20) DEFAULT 'draft',
    -- draft, posted, reversed, void

    -- Source
    source_type VARCHAR(50),
    -- invoice, bill, payment, payroll, etc.
    source_id UUID,

    -- Description
    description TEXT,
    reference VARCHAR(255),

    -- Approval
    posted_by UUID REFERENCES users(id),
    posted_at TIMESTAMP WITH TIME ZONE,

    -- Reversal
    reversed_entry_id UUID REFERENCES journal_entries(id),
    reversal_entry_id UUID REFERENCES journal_entries(id),
    reversal_reason TEXT,

    -- AI insights
    ai_suggested_accounts JSONB,
    ai_confidence_score DECIMAL(3,2),

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Journal Entry Lines
CREATE TABLE journal_entry_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id),

    -- Account
    account_id UUID NOT NULL REFERENCES chart_of_accounts(id),

    -- Amount (always store debit OR credit, not both)
    debit_amount DECIMAL(15,2) DEFAULT 0.00,
    credit_amount DECIMAL(15,2) DEFAULT 0.00,

    -- Currency
    currency_code VARCHAR(3) DEFAULT 'RON',
    exchange_rate DECIMAL(10,6) DEFAULT 1.000000,
    debit_amount_local DECIMAL(15,2) DEFAULT 0.00,
    credit_amount_local DECIMAL(15,2) DEFAULT 0.00,

    -- Description
    description TEXT,

    -- Dimensions (for reporting)
    project_id UUID REFERENCES projects(id),
    department_id UUID,
    cost_center_id UUID,

    -- Tax
    tax_amount DECIMAL(15,2),
    tax_rate_id UUID,

    line_number INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_amounts CHECK (
        (debit_amount >= 0 AND credit_amount = 0) OR
        (credit_amount >= 0 AND debit_amount = 0)
    )
);

CREATE INDEX idx_journal_lines_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX idx_journal_lines_account ON journal_entry_lines(account_id);
CREATE INDEX idx_journal_lines_date ON journal_entry_lines(
    (SELECT entry_date FROM journal_entries WHERE id = journal_entry_id)
);

-- Bank Accounts
CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id),

    -- Bank info
    bank_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(100),
    iban VARCHAR(100),
    swift_code VARCHAR(20),

    -- Accounting link
    gl_account_id UUID NOT NULL REFERENCES chart_of_accounts(id),

    -- Balance
    current_balance DECIMAL(15,2) DEFAULT 0.00,
    available_balance DECIMAL(15,2),

    -- Currency
    currency_code VARCHAR(3) DEFAULT 'RON',

    -- Bank feed integration
    bank_feed_enabled BOOLEAN DEFAULT false,
    bank_connection_id VARCHAR(255),
    last_sync_at TIMESTAMP WITH TIME ZONE,

    -- Settings
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Bank Transactions (for reconciliation)
CREATE TABLE bank_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id),
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),

    -- Transaction details
    transaction_date DATE NOT NULL,
    value_date DATE,
    amount DECIMAL(15,2) NOT NULL,

    -- Description
    description TEXT,
    reference VARCHAR(255),
    bank_reference VARCHAR(255),

    -- Counterparty
    payee_payer VARCHAR(255),

    -- Type
    transaction_type VARCHAR(50), -- debit, credit, fee, interest

    -- Reconciliation
    is_reconciled BOOLEAN DEFAULT false,
    reconciled_at TIMESTAMP WITH TIME ZONE,
    reconciled_by UUID REFERENCES users(id),
    matched_payment_id UUID,
    matched_journal_entry_id UUID REFERENCES journal_entries(id),

    -- AI categorization
    ai_suggested_category VARCHAR(100),
    ai_suggested_account_id UUID REFERENCES chart_of_accounts(id),
    ai_confidence_score DECIMAL(3,2),

    -- Import tracking
    imported_from VARCHAR(50), -- manual, csv, bank_feed, ocr
    import_batch_id UUID,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bank_trans_account ON bank_transactions(bank_account_id);
CREATE INDEX idx_bank_trans_date ON bank_transactions(transaction_date DESC);
CREATE INDEX idx_bank_trans_reconciled ON bank_transactions(is_reconciled, bank_account_id);

-- Tax Rates & Rules
CREATE TABLE tax_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id),

    -- Tax details
    name VARCHAR(255) NOT NULL,
    rate DECIMAL(5,2) NOT NULL,

    -- Type
    tax_type VARCHAR(50) NOT NULL, -- vat, sales_tax, income_tax, etc.

    -- Accounts
    tax_payable_account_id UUID REFERENCES chart_of_accounts(id),
    tax_receivable_account_id UUID REFERENCES chart_of_accounts(id),

    -- Applicability
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,

    -- Date range
    effective_from DATE,
    effective_to DATE,

    -- Compliance
    tax_authority VARCHAR(255),
    reporting_code VARCHAR(50),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Fixed Assets
CREATE TABLE fixed_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id),

    -- Asset details
    asset_name VARCHAR(255) NOT NULL,
    asset_number VARCHAR(50) UNIQUE,
    description TEXT,

    -- Classification
    asset_category VARCHAR(100),
    asset_type VARCHAR(100),

    -- Financial
    purchase_date DATE NOT NULL,
    purchase_cost DECIMAL(15,2) NOT NULL,
    salvage_value DECIMAL(15,2) DEFAULT 0.00,

    -- Depreciation
    depreciation_method VARCHAR(50) DEFAULT 'straight_line',
    -- straight_line, declining_balance, units_of_production
    useful_life_years INTEGER,
    useful_life_units INTEGER,

    accumulated_depreciation DECIMAL(15,2) DEFAULT 0.00,
    current_book_value DECIMAL(15,2),

    -- Status
    status VARCHAR(50) DEFAULT 'active',
    -- active, disposed, sold, written_off
    disposal_date DATE,
    disposal_amount DECIMAL(15,2),

    -- Accounting
    asset_account_id UUID REFERENCES chart_of_accounts(id),
    depreciation_account_id UUID REFERENCES chart_of_accounts(id),
    accumulated_depr_account_id UUID REFERENCES chart_of_accounts(id),

    -- Location & Assignment
    location VARCHAR(255),
    assigned_to UUID REFERENCES users(id),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Depreciation Schedule
CREATE TABLE depreciation_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fixed_asset_id UUID NOT NULL REFERENCES fixed_assets(id),
    company_id UUID NOT NULL REFERENCES companies(id),

    -- Period
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,

    -- Amounts
    depreciation_amount DECIMAL(15,2) NOT NULL,
    accumulated_depreciation DECIMAL(15,2) NOT NULL,
    book_value DECIMAL(15,2) NOT NULL,

    -- Journal entry link
    journal_entry_id UUID REFERENCES journal_entries(id),

    -- Status
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, posted, adjusted

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### API Endpoints

```
-- Chart of Accounts
GET    /api/v1/accounting/chart-of-accounts      - List accounts
POST   /api/v1/accounting/chart-of-accounts      - Create account
PUT    /api/v1/accounting/chart-of-accounts/:id  - Update account
DELETE /api/v1/accounting/chart-of-accounts/:id  - Deactivate account

-- Journal Entries
POST   /api/v1/accounting/journal-entries        - Create entry
GET    /api/v1/accounting/journal-entries        - List entries
GET    /api/v1/accounting/journal-entries/:id    - Get entry details
PUT    /api/v1/accounting/journal-entries/:id    - Update draft entry
POST   /api/v1/accounting/journal-entries/:id/post    - Post entry
POST   /api/v1/accounting/journal-entries/:id/reverse - Reverse entry

-- Financial Statements
GET    /api/v1/accounting/reports/trial-balance       - Trial balance
GET    /api/v1/accounting/reports/balance-sheet       - Balance sheet
GET    /api/v1/accounting/reports/income-statement    - P&L statement
GET    /api/v1/accounting/reports/cash-flow           - Cash flow statement
GET    /api/v1/accounting/reports/general-ledger      - General ledger

-- Bank Reconciliation
GET    /api/v1/accounting/bank-accounts               - List bank accounts
POST   /api/v1/accounting/bank-accounts/:id/transactions - Import transactions
GET    /api/v1/accounting/bank-accounts/:id/reconcile - Reconciliation view
POST   /api/v1/accounting/bank-accounts/:id/match     - Match transaction

-- AI Features
POST   /api/v1/accounting/ai/categorize-transaction   - AI categorization
POST   /api/v1/accounting/ai/ocr-receipt              - OCR receipt scan
GET    /api/v1/accounting/ai/suggest-entries          - Suggest journal entries

-- Fixed Assets
GET    /api/v1/accounting/fixed-assets                - List assets
POST   /api/v1/accounting/fixed-assets                - Create asset
GET    /api/v1/accounting/fixed-assets/:id/depreciation - Depreciation schedule
POST   /api/v1/accounting/fixed-assets/:id/calculate-depreciation - Run depreciation
```

### AI/ML Features

**1. Transaction Categorization**
- Learns from historical categorizations
- Uses NLP to analyze transaction descriptions
- Multi-class classification with confidence scores

**2. OCR Receipt Scanning**
- Tesseract OCR for text extraction
- TensorFlow for receipt field detection (vendor, date, amount, items)
- Automatic matching to existing vendors

**3. Predictive Cash Flow**
- LSTM neural network for time-series forecasting
- Considers seasonality, historical patterns, upcoming invoices
- 90-day forward projection with confidence intervals

---

## Module 4: Analytics & Business Intelligence

### Features Overview

#### Core Capabilities
✅ Pre-built dashboards for all modules
✅ Custom dashboard builder (drag & drop)
✅ Real-time metrics and KPIs
✅ Ad-hoc query builder
✅ Scheduled reports (PDF, Excel)
✅ Data export (CSV, JSON, API)
✅ Multi-dimensional analysis (OLAP)
✅ Drill-down and drill-through

#### Advanced Features
🤖 **Predictive Analytics:** ML-powered forecasts
📊 **Natural Language Queries:** Ask questions in plain language
🎯 **Anomaly Detection:** Auto-identify unusual patterns
⚡ **Real-Time Streaming:** Live dashboards with WebSocket
📈 **Benchmark Analysis:** Compare against industry standards
🔔 **Smart Alerts:** ML-based threshold monitoring
🌍 **Data Warehouse:** Dedicated OLAP database (TimescaleDB)
📱 **Mobile BI:** Responsive dashboards, mobile apps

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                   │
│  • React Dashboards  • Apache Superset  • Mobile Apps  │
└────────────┬────────────────────────────────────────────┘
             │
┌────────────┴────────────────────────────────────────────┐
│                   Analytics Engine                      │
│  • Query Optimization  • Caching  • Aggregations       │
└────────────┬────────────────────────────────────────────┘
             │
┌────────────┴────────────────────────────────────────────┐
│                    Data Pipeline (ETL)                  │
│  • Extract  • Transform  • Load  • Real-time Sync      │
└────────────┬────────────────────────────────────────────┘
             │
┌────────────┴───────────────┬─────────────────────────────┐
│    OLTP Database           │     OLAP Database           │
│    (PostgreSQL)            │     (TimescaleDB)           │
│  • Transactional data      │  • Aggregated data          │
│  • Current state           │  • Historical trends        │
│  • Normalized              │  • Denormalized             │
└────────────────────────────┴─────────────────────────────┘
```

### Data Warehouse Schema (TimescaleDB)

```sql
-- Fact Table: Time Entries (Hypertable for time-series optimization)
CREATE TABLE fact_time_entries (
    id UUID,
    time_entry_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Dimensions
    user_id UUID,
    project_id UUID,
    task_id UUID,
    company_id UUID,

    -- Metrics
    duration_hours DECIMAL(8,2),
    billable_hours DECIMAL(8,2),
    billable_amount DECIMAL(10,2),

    -- Pre-aggregated flags
    is_weekend BOOLEAN,
    is_overtime BOOLEAN,
    hour_of_day INTEGER,
    day_of_week INTEGER,

    PRIMARY KEY (id, time_entry_timestamp)
);

-- Convert to hypertable for TimescaleDB
SELECT create_hypertable('fact_time_entries', 'time_entry_timestamp');

-- Fact Table: Financial Transactions
CREATE TABLE fact_transactions (
    id UUID,
    transaction_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Dimensions
    company_id UUID,
    account_id UUID,
    project_id UUID,
    customer_id UUID,

    -- Metrics
    debit_amount DECIMAL(15,2),
    credit_amount DECIMAL(15,2),
    net_amount DECIMAL(15,2), -- debit - credit

    -- Currency
    currency_code VARCHAR(3),
    exchange_rate DECIMAL(10,6),
    amount_local DECIMAL(15,2),

    -- Type classification
    transaction_type VARCHAR(50),
    account_type VARCHAR(50),

    PRIMARY KEY (id, transaction_timestamp)
);

SELECT create_hypertable('fact_transactions', 'transaction_timestamp');

-- Dimension: Date
CREATE TABLE dim_date (
    date_key DATE PRIMARY KEY,

    -- Date components
    year INTEGER,
    quarter INTEGER,
    month INTEGER,
    week_of_year INTEGER,
    day_of_month INTEGER,
    day_of_week INTEGER,
    day_of_year INTEGER,

    -- Formatted strings
    month_name VARCHAR(20),
    day_name VARCHAR(20),
    quarter_name VARCHAR(10),

    -- Flags
    is_weekend BOOLEAN,
    is_holiday BOOLEAN,
    holiday_name VARCHAR(100),

    -- Fiscal calendar
    fiscal_year INTEGER,
    fiscal_quarter INTEGER,
    fiscal_month INTEGER
);

-- Pre-populate date dimension
INSERT INTO dim_date
SELECT
    d::DATE as date_key,
    EXTRACT(YEAR FROM d) as year,
    EXTRACT(QUARTER FROM d) as quarter,
    EXTRACT(MONTH FROM d) as month,
    EXTRACT(WEEK FROM d) as week_of_year,
    EXTRACT(DAY FROM d) as day_of_month,
    EXTRACT(DOW FROM d) as day_of_week,
    EXTRACT(DOY FROM d) as day_of_year,
    TO_CHAR(d, 'Month') as month_name,
    TO_CHAR(d, 'Day') as day_name,
    'Q' || EXTRACT(QUARTER FROM d) as quarter_name,
    EXTRACT(DOW FROM d) IN (0, 6) as is_weekend,
    false as is_holiday,
    NULL as holiday_name,
    EXTRACT(YEAR FROM d) as fiscal_year,
    EXTRACT(QUARTER FROM d) as fiscal_quarter,
    EXTRACT(MONTH FROM d) as fiscal_month
FROM generate_series(
    '2020-01-01'::DATE,
    '2030-12-31'::DATE,
    '1 day'::INTERVAL
) as d;

-- Materialized Views for Common Aggregations
CREATE MATERIALIZED VIEW mv_daily_revenue AS
SELECT
    DATE(transaction_timestamp) as date,
    company_id,
    currency_code,
    SUM(CASE WHEN account_type = 'revenue' THEN credit_amount ELSE 0 END) as daily_revenue,
    COUNT(DISTINCT customer_id) as unique_customers,
    COUNT(*) as transaction_count
FROM fact_transactions
WHERE account_type = 'revenue'
GROUP BY DATE(transaction_timestamp), company_id, currency_code;

CREATE UNIQUE INDEX ON mv_daily_revenue (date, company_id, currency_code);

-- Refresh policy (automatic)
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('refresh-daily-revenue', '0 1 * * *',
    'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_revenue');

-- Continuous Aggregates (TimescaleDB feature)
CREATE MATERIALIZED VIEW hourly_time_tracking
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time_entry_timestamp) AS hour,
    user_id,
    project_id,
    SUM(duration_hours) as total_hours,
    SUM(billable_hours) as billable_hours,
    SUM(billable_amount) as revenue,
    COUNT(*) as entry_count
FROM fact_time_entries
GROUP BY hour, user_id, project_id;

-- Analytics KPI Tables
CREATE TABLE analytics_kpis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,

    -- KPI definition
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- financial, operational, customer, employee

    -- Calculation
    calculation_query TEXT NOT NULL,
    unit VARCHAR(50), -- currency, percentage, count, hours

    -- Targets
    target_value DECIMAL(15,2),
    warning_threshold DECIMAL(15,2),
    critical_threshold DECIMAL(15,2),

    -- Display
    format_string VARCHAR(100),
    color_good VARCHAR(7),
    color_warning VARCHAR(7),
    color_critical VARCHAR(7),

    -- Refresh
    refresh_frequency VARCHAR(50) DEFAULT 'daily',
    last_calculated_at TIMESTAMP WITH TIME ZONE,
    current_value DECIMAL(15,2),

    -- Trend
    trend_direction VARCHAR(10), -- up, down, flat
    trend_percentage DECIMAL(5,2),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Anomaly Detection Log
CREATE TABLE analytics_anomalies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,

    -- Anomaly details
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metric_name VARCHAR(255) NOT NULL,
    expected_value DECIMAL(15,2),
    actual_value DECIMAL(15,2),
    deviation_percentage DECIMAL(5,2),

    -- Severity
    severity VARCHAR(20), -- low, medium, high, critical

    -- AI analysis
    ai_explanation TEXT,
    ai_suggested_actions TEXT[],

    -- Status
    status VARCHAR(20) DEFAULT 'new', -- new, investigating, resolved, false_positive
    assigned_to UUID REFERENCES users(id),
    resolution_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE
);
```

### API Endpoints

```
-- Dashboards
GET    /api/v1/analytics/dashboards           - List dashboards
POST   /api/v1/analytics/dashboards           - Create dashboard
GET    /api/v1/analytics/dashboards/:id       - Get dashboard
PUT    /api/v1/analytics/dashboards/:id       - Update dashboard
DELETE /api/v1/analytics/dashboards/:id       - Delete dashboard

-- Widgets
POST   /api/v1/analytics/dashboards/:id/widgets     - Add widget
PUT    /api/v1/analytics/dashboards/:id/widgets/:id - Update widget
DELETE /api/v1/analytics/dashboards/:id/widgets/:id - Remove widget

-- KPIs
GET    /api/v1/analytics/kpis                 - List KPIs
POST   /api/v1/analytics/kpis                 - Create KPI
GET    /api/v1/analytics/kpis/:id/value       - Get current KPI value
GET    /api/v1/analytics/kpis/:id/history     - Get KPI history

-- Reports
GET    /api/v1/analytics/reports/revenue             - Revenue analysis
GET    /api/v1/analytics/reports/expenses            - Expense analysis
GET    /api/v1/analytics/reports/profitability       - Profit analysis
GET    /api/v1/analytics/reports/project-performance - Project metrics
GET    /api/v1/analytics/reports/team-productivity   - Team analytics
GET    /api/v1/analytics/reports/customer-analysis   - Customer insights

-- Query Builder
POST   /api/v1/analytics/query                - Execute custom query
GET    /api/v1/analytics/query/saved          - List saved queries
POST   /api/v1/analytics/query/save           - Save query

-- Exports
POST   /api/v1/analytics/export/excel         - Export to Excel
POST   /api/v1/analytics/export/pdf           - Export to PDF
POST   /api/v1/analytics/export/csv           - Export to CSV

-- AI & Predictions
GET    /api/v1/analytics/ai/forecast/revenue  - Revenue forecast
GET    /api/v1/analytics/ai/forecast/expenses - Expense forecast
GET    /api/v1/analytics/ai/forecast/cashflow - Cash flow forecast
GET    /api/v1/analytics/ai/anomalies         - Detected anomalies
POST   /api/v1/analytics/ai/nlp-query         - Natural language query
```

### Pre-Built Dashboards

**1. Executive Dashboard**
- Revenue vs Target (YTD)
- Profit Margin Trend
- Cash Flow Forecast
- Top 10 Customers
- Project Health Overview
- Team Utilization

**2. Financial Dashboard**
- P&L Summary
- Balance Sheet Highlights
- Accounts Receivable Aging
- Accounts Payable Aging
- Bank Account Balances
- Budget vs Actual

**3. Project Dashboard**
- Active Projects Status
- Resource Allocation
- Budget Utilization
- Timeline Progress
- Task Completion Rate
- Risk Indicators

**4. Team Dashboard**
- Time Tracking Summary
- Billable vs Non-Billable Hours
- Utilization Rate
- Productivity Trends
- Time-off Calendar
- Overtime Analysis

**5. Sales Dashboard**
- Sales Pipeline
- Conversion Rates
- Revenue Forecast
- Customer Acquisition Cost
- Lifetime Value
- Win/Loss Analysis

---

## Cross-Module Integration

### Integration Points

```
┌─────────────┐      ┌──────────────┐      ┌────────────┐
│    Time     │─────▶│   Project    │─────▶│ Accounting │
│  Tracking   │      │  Management  │      │            │
└─────────────┘      └──────────────┘      └────────────┘
       │                     │                      │
       │                     │                      │
       └─────────────────────┴──────────────────────┘
                             │
                    ┌────────▼─────────┐
                    │   Analytics &    │
                    │   BI (Central)   │
                    └──────────────────┘
```

**Time Tracking → Project Management**
- Time entries linked to projects/tasks
- Real-time project time tracking
- Resource capacity planning
- Automatic task duration updates

**Time Tracking → Accounting**
- Billable hours → Invoice generation
- Payroll calculations
- Cost allocation to projects
- Revenue recognition

**Project Management → Accounting**
- Project budgets → Financial forecasts
- Milestones → Revenue recognition
- Resource costs → Expense tracking
- Client billing → Invoices

**All Modules → Analytics**
- Real-time data streaming
- ETL pipeline to data warehouse
- Cross-module KPIs
- Unified reporting

---

## Technology Stack Details

### Backend Services

```php
// Service Architecture Pattern
abstract class BaseService {
    protected $db;
    protected $cache;
    protected $eventBus;

    public function __construct() {
        $this->db = Database::getInstance();
        $this->cache = Redis::getInstance();
        $this->eventBus = RabbitMQ::getInstance();
    }

    protected function publishEvent($eventName, $payload) {
        $this->eventBus->publish($eventName, $payload);
    }
}

// Example: TimeTrackingService
class TimeTrackingService extends BaseService {
    public function startTimer($userId, $projectId, $taskId) {
        $entry = $this->db->insert('time_entries', [
            'user_id' => $userId,
            'project_id' => $projectId,
            'task_id' => $taskId,
            'start_time' => 'NOW()',
            'status' => 'running'
        ]);

        // Publish event for real-time updates
        $this->publishEvent('time.started', [
            'entry_id' => $entry->id,
            'user_id' => $userId,
            'project_id' => $projectId
        ]);

        // Cache active timer
        $this->cache->set("active_timer:$userId", $entry->id, 86400);

        return $entry;
    }
}
```

### Real-Time WebSocket Server

```javascript
// WebSocket server (Node.js + Socket.io)
const io = require('socket.io')(3000);
const redis = require('redis');
const subscriber = redis.createClient();

// Subscribe to RabbitMQ events
subscriber.subscribe('project.*', 'time.*', 'accounting.*');

subscriber.on('message', (channel, message) => {
    const event = JSON.parse(message);

    // Broadcast to relevant rooms
    io.to(`company:${event.company_id}`).emit(channel, event);

    if (event.project_id) {
        io.to(`project:${event.project_id}`).emit(channel, event);
    }
});

io.on('connection', (socket) => {
    socket.on('join', (data) => {
        socket.join(`company:${data.company_id}`);
        if (data.project_id) {
            socket.join(`project:${data.project_id}`);
        }
    });
});
```

### AI/ML Pipeline

```python
# AI Service (Python microservice)
from tensorflow import keras
import pandas as pd

class TaskDurationPredictor:
    def __init__(self):
        self.model = keras.models.load_model('models/task_duration.h5')

    def predict(self, task_features):
        # Features: task_type, project_type, user_id, complexity, etc.
        df = pd.DataFrame([task_features])

        # Normalize features
        normalized = self.normalize(df)

        # Predict
        prediction = self.model.predict(normalized)

        return {
            'estimated_hours': float(prediction[0][0]),
            'confidence': float(prediction[0][1])
        }

# Flask API endpoint
@app.route('/api/ml/predict-duration', methods=['POST'])
def predict_duration():
    data = request.json
    predictor = TaskDurationPredictor()
    result = predictor.predict(data['features'])
    return jsonify(result)
```

---

## Security & Compliance

### Role-Based Access Control (RBAC)

```sql
-- Roles table
CREATE TABLE roles (
    id UUID PRIMARY KEY,
    company_id UUID,
    name VARCHAR(100),
    permissions JSONB
);

-- Example permissions
{
    "time_tracking": {
        "own": ["view", "create", "edit", "delete"],
        "team": ["view", "approve"],
        "all": []
    },
    "projects": {
        "assigned": ["view", "edit_tasks"],
        "all": ["view"]
    },
    "accounting": {
        "own": [],
        "all": ["view_reports"]
    },
    "analytics": {
        "dashboards": ["view", "create"],
        "reports": ["view", "export"]
    }
}
```

### Audit Trail

```sql
CREATE TABLE audit_log (
    id UUID PRIMARY KEY,
    company_id UUID,
    user_id UUID,

    -- Action
    action VARCHAR(50), -- create, update, delete, view
    entity_type VARCHAR(100), -- project, task, invoice, etc.
    entity_id UUID,

    -- Changes
    old_values JSONB,
    new_values JSONB,

    -- Context
    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Blockchain hash for immutability
CREATE TABLE audit_blockchain (
    block_number SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    previous_hash VARCHAR(64),
    current_hash VARCHAR(64),
    data_hash VARCHAR(64), -- SHA-256 of audit logs in this block
    signature VARCHAR(512)
);
```

---

## Performance & Scalability

### Caching Strategy

**Level 1: Redis Cache**
- User sessions (24h TTL)
- Active timers (1 day TTL)
- Project lists (5 min TTL)
- KPI values (1 hour TTL)

**Level 2: Materialized Views**
- Daily/monthly aggregations
- Refresh: nightly or on-demand

**Level 3: TimescaleDB Continuous Aggregates**
- Hourly/daily rollups
- Automatic refresh

### Database Optimization

**Partitioning:**
```sql
-- Partition large tables by date
CREATE TABLE time_entries_2025_q1 PARTITION OF time_entries
FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
```

**Indexes:**
- B-tree for equality/range queries
- GIN for array/JSONB columns
- BRIN for time-series data

**Connection Pooling:**
- PgBouncer for PostgreSQL
- Redis Cluster for distributed caching

---

## Deployment Architecture

```
                    ┌─────────────┐
                    │   Nginx     │
                    │  (Load LB)  │
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
    │  PHP-FPM  │   │  PHP-FPM  │   │  PHP-FPM  │
    │  (API 1)  │   │  (API 2)  │   │  (API 3)  │
    └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
          │                │                │
          └────────────────┼────────────────┘
                           │
                ┌──────────┴──────────┐
                │                     │
        ┌───────▼────────┐    ┌──────▼──────┐
        │   PostgreSQL   │    │    Redis    │
        │   (Primary)    │    │   Cluster   │
        └───────┬────────┘    └─────────────┘
                │
        ┌───────▼────────┐
        │   PostgreSQL   │
        │   (Replica)    │
        └────────────────┘
```

---

## Next Steps

1. ✅ Review architecture
2. ⏳ Implement enhanced services
3. ⏳ Build database migrations
4. ⏳ Create API endpoints
5. ⏳ Develop frontend components
6. ⏳ Integrate AI/ML models
7. ⏳ Setup real-time WebSocket
8. ⏳ Deploy and test

---

**Version:** 2.0
**Author:** DocumentiUlia Development Team
**Last Updated:** 2025-11-19

