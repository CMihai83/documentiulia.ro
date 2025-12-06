# Analytics & Business Intelligence Module

## Overview

The Analytics & BI Module provides comprehensive business intelligence capabilities for the AccountEch platform, enabling users to create custom dashboards, track KPIs, generate custom reports, and visualize data across all modules.

### Key Features

- **Custom Dashboards**: Create personalized dashboards with configurable widgets
- **KPI Tracking**: Define and monitor key performance indicators with targets and thresholds
- **Custom Reports**: Build SQL-based custom reports with parameter support
- **Data Visualization**: Multiple chart types (line, bar, pie, area, gauge, table)
- **Real-time Metrics**: Dashboard overview with key business metrics
- **Export Capabilities**: Export data to CSV, Excel, PDF formats
- **Event Tracking**: Analytics event tracking for user behavior analysis
- **Multi-tenant Support**: Company-level data isolation

## Database Schema

### Core Tables

#### 1. dashboards
Stores user-defined dashboard configurations.

```sql
CREATE TABLE dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    dashboard_type VARCHAR(50) DEFAULT 'custom',  -- custom, system, template
    layout_config JSONB,  -- Grid layout configuration
    is_public BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields**:
- `layout_config`: Grid layout with widget positions (e.g., `{"cols": 12, "rows": 10}`)
- `dashboard_type`: 'custom' (user-created), 'system' (predefined), 'template' (shareable)
- `is_public`: Whether dashboard is shared with all company users

#### 2. dashboard_widgets
Individual widgets that populate dashboards.

```sql
CREATE TABLE dashboard_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    widget_type VARCHAR(50) NOT NULL,  -- chart, table, metric, kpi
    title VARCHAR(255) NOT NULL,
    data_source VARCHAR(100) NOT NULL,
    query_config JSONB,
    visualization_config JSONB,
    position_config JSONB,  -- {x, y, width, height}
    refresh_interval INTEGER DEFAULT 300,  -- seconds
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Widget Types**:
- `chart`: Line, bar, pie, area charts
- `table`: Tabular data display
- `metric`: Single metric display (revenue, count, etc.)
- `kpi`: KPI status indicator

**Data Sources**:
- `revenue`: Revenue data from invoices
- `expenses`: Expense data from bills/expenses
- `projects`: Project statistics
- `time_entries`: Time tracking data
- `custom_query`: Custom SQL query
- `kpi`: KPI tracking data

#### 3. kpis (Key Performance Indicators)
Defines trackable KPIs with targets and thresholds.

```sql
CREATE TABLE kpis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    metric_type VARCHAR(50) NOT NULL,  -- revenue, profit, customer_count, etc.
    calculation_method VARCHAR(100),
    target_value DECIMAL(15,2),
    warning_threshold DECIMAL(15,2),
    critical_threshold DECIMAL(15,2),
    unit VARCHAR(50),  -- $, %, count
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Metric Types**:
- `revenue`: Total revenue tracking
- `profit_margin`: Profit margin percentage
- `customer_acquisition_cost`: CAC metric
- `customer_lifetime_value`: CLV metric
- `employee_utilization`: Resource utilization percentage
- `project_completion_rate`: Project delivery metric

#### 4. kpi_values
Historical KPI value tracking.

```sql
CREATE TABLE kpi_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kpi_id UUID NOT NULL REFERENCES kpis(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    actual_value DECIMAL(15,2) NOT NULL,
    target_value DECIMAL(15,2),
    variance DECIMAL(15,2),  -- Auto-calculated by trigger
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    notes TEXT,
    recorded_by UUID REFERENCES users(id),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Auto-calculated fields**:
- `variance`: Calculated by trigger as `(actual_value - target_value) / target_value * 100`

#### 5. custom_reports
User-defined reports with SQL queries.

```sql
CREATE TABLE custom_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    data_source VARCHAR(100) NOT NULL,
    query_template TEXT,  -- SQL query with placeholders
    parameters JSONB,  -- Parameter definitions
    category VARCHAR(100),
    is_scheduled BOOLEAN DEFAULT false,
    schedule_config JSONB,  -- Cron expression, recipients
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Security Note**: Custom SQL queries are executed with restricted permissions and validated for safety.

#### 6. report_executions
Tracks report execution history.

```sql
CREATE TABLE report_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES custom_reports(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    executed_by UUID REFERENCES users(id),
    execution_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    parameters_used JSONB,
    row_count INTEGER,
    execution_duration_ms INTEGER,
    status VARCHAR(50) DEFAULT 'success',  -- success, failed, timeout
    error_message TEXT
);
```

#### 7. data_exports
Tracks data export operations.

```sql
CREATE TABLE data_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    export_type VARCHAR(50) NOT NULL,  -- csv, excel, pdf
    data_source VARCHAR(100) NOT NULL,
    filters JSONB,
    file_path VARCHAR(500),
    file_size_bytes BIGINT,
    row_count INTEGER,
    exported_by UUID REFERENCES users(id),
    exported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 8. analytics_events
User interaction tracking for analytics.

```sql
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    event_type VARCHAR(100) NOT NULL,
    event_category VARCHAR(100),
    event_data JSONB,
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Views

#### 1. revenue_by_month
Monthly revenue aggregation.

```sql
CREATE OR REPLACE VIEW revenue_by_month AS
SELECT
    company_id,
    DATE_TRUNC('month', invoice_date) as month,
    COUNT(*) as invoice_count,
    SUM(total_amount) as total_revenue,
    AVG(total_amount) as avg_invoice_amount
FROM invoices
WHERE status = 'paid'
GROUP BY company_id, DATE_TRUNC('month', invoice_date);
```

#### 2. project_profitability
Project-level profit analysis.

```sql
CREATE OR REPLACE VIEW project_profitability AS
SELECT
    p.id as project_id,
    p.company_id,
    p.name as project_name,
    p.budget,
    COALESCE(SUM(te.billable_amount), 0) as total_revenue,
    COALESCE(SUM(te.hours), 0) as total_hours,
    p.budget - COALESCE(SUM(te.billable_amount), 0) as remaining_budget
FROM projects p
LEFT JOIN time_entries te ON te.project_id = p.id
GROUP BY p.id, p.company_id, p.name, p.budget;
```

#### 3. customer_lifetime_value
Customer value metrics.

```sql
CREATE OR REPLACE VIEW customer_lifetime_value AS
SELECT
    c.id as customer_id,
    c.company_id,
    c.name as customer_name,
    COUNT(DISTINCT i.id) as total_invoices,
    SUM(i.total_amount) as lifetime_value,
    AVG(i.total_amount) as avg_invoice_value,
    MIN(i.invoice_date) as first_invoice_date,
    MAX(i.invoice_date) as last_invoice_date
FROM contacts c
LEFT JOIN invoices i ON i.contact_id = c.id AND i.status = 'paid'
WHERE c.contact_type = 'customer'
GROUP BY c.id, c.company_id, c.name;
```

### Database Functions

#### 1. calculate_kpi_status()
Returns KPI status based on thresholds.

```sql
CREATE OR REPLACE FUNCTION calculate_kpi_status(
    actual DECIMAL,
    target DECIMAL,
    warning_threshold DECIMAL,
    critical_threshold DECIMAL
) RETURNS VARCHAR AS $$
BEGIN
    IF actual >= target THEN
        RETURN 'on_track';
    ELSIF actual >= warning_threshold THEN
        RETURN 'warning';
    ELSIF actual >= critical_threshold THEN
        RETURN 'critical';
    ELSE
        RETURN 'danger';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

#### 2. get_dashboard_metrics()
Returns comprehensive dashboard metrics.

```sql
CREATE OR REPLACE FUNCTION get_dashboard_metrics(
    p_company_id UUID,
    p_start_date DATE,
    p_end_date DATE
) RETURNS TABLE (
    total_revenue DECIMAL,
    total_expenses DECIMAL,
    profit_margin DECIMAL,
    active_projects INTEGER,
    total_hours DECIMAL,
    utilization_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(i.total_amount), 0) as total_revenue,
        COALESCE(SUM(e.amount), 0) as total_expenses,
        CASE
            WHEN SUM(i.total_amount) > 0
            THEN ((SUM(i.total_amount) - COALESCE(SUM(e.amount), 0)) / SUM(i.total_amount)) * 100
            ELSE 0
        END as profit_margin,
        COUNT(DISTINCT p.id)::INTEGER as active_projects,
        COALESCE(SUM(te.hours), 0) as total_hours,
        CASE
            WHEN COUNT(DISTINCT emp.id) > 0
            THEN (SUM(te.hours) / (COUNT(DISTINCT emp.id) * 160)) * 100
            ELSE 0
        END as utilization_rate
    FROM companies c
    LEFT JOIN invoices i ON i.company_id = c.id
        AND i.invoice_date BETWEEN p_start_date AND p_end_date
        AND i.status = 'paid'
    LEFT JOIN expenses e ON e.company_id = c.id
        AND e.expense_date BETWEEN p_start_date AND p_end_date
    LEFT JOIN projects p ON p.company_id = c.id
        AND p.status = 'in_progress'
    LEFT JOIN time_entries te ON te.company_id = c.id
        AND te.entry_date BETWEEN p_start_date AND p_end_date
    LEFT JOIN employees emp ON emp.company_id = c.id
        AND emp.status = 'active'
    WHERE c.id = p_company_id;
END;
$$ LANGUAGE plpgsql;
```

## API Endpoints

### Base URL
All analytics endpoints are prefixed with `/api/v1/analytics/`

### Authentication
All endpoints require JWT authentication via `Authorization: Bearer <token>` header and company context via `X-Company-ID` header.

---

### 1. Dashboards API

#### GET /api/v1/analytics/dashboards.php
List all dashboards or get a specific dashboard.

**Query Parameters**:
- `id` (optional): Dashboard ID to retrieve specific dashboard
- `type` (optional): Filter by dashboard_type ('custom', 'system', 'template')
- `is_public` (optional): Filter by public status (true/false)
- `created_by` (optional): Filter by creator user ID

**Response** (list):
```json
{
  "success": true,
  "data": {
    "dashboards": [
      {
        "id": "uuid",
        "company_id": "uuid",
        "name": "Executive Dashboard",
        "description": "High-level metrics for executives",
        "dashboard_type": "custom",
        "layout_config": {"cols": 12, "rows": 10},
        "is_public": true,
        "created_by": "uuid",
        "created_at": "2025-01-15T10:00:00Z",
        "widget_count": 6
      }
    ],
    "count": 1
  }
}
```

**Response** (single):
```json
{
  "success": true,
  "data": {
    "dashboard": {
      "id": "uuid",
      "name": "Executive Dashboard",
      "widgets": [
        {
          "id": "uuid",
          "widget_type": "chart",
          "title": "Monthly Revenue",
          "data_source": "revenue",
          "visualization_config": {
            "chart_type": "line",
            "x_axis": "month",
            "y_axis": "total_revenue"
          }
        }
      ]
    }
  }
}
```

#### POST /api/v1/analytics/dashboards.php
Create a new dashboard.

**Request Body**:
```json
{
  "name": "Sales Dashboard",
  "description": "Sales team performance metrics",
  "dashboard_type": "custom",
  "layout_config": {"cols": 12, "rows": 10},
  "is_public": false
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "dashboard_id": "uuid"
  },
  "message": "Dashboard created successfully"
}
```

#### PUT /api/v1/analytics/dashboards.php
Update an existing dashboard.

**Request Body**:
```json
{
  "id": "uuid",
  "name": "Updated Dashboard Name",
  "layout_config": {"cols": 12, "rows": 12}
}
```

---

### 2. Widgets API

#### GET /api/v1/analytics/widgets.php?widget_id={id}
Get widget data for rendering.

**Response**:
```json
{
  "success": true,
  "data": {
    "widget_id": "uuid",
    "title": "Monthly Revenue",
    "widget_type": "chart",
    "data": [
      {"month": "2025-01", "total_revenue": 45000.00},
      {"month": "2025-02", "total_revenue": 52000.00}
    ],
    "metadata": {
      "row_count": 2,
      "last_updated": "2025-01-15T10:00:00Z"
    }
  }
}
```

#### POST /api/v1/analytics/widgets.php
Add a widget to a dashboard.

**Request Body**:
```json
{
  "dashboard_id": "uuid",
  "widget_type": "chart",
  "title": "Monthly Revenue Trend",
  "data_source": "revenue",
  "query_config": {
    "date_range": "last_12_months",
    "group_by": "month"
  },
  "visualization_config": {
    "chart_type": "line",
    "x_axis": "month",
    "y_axis": "total_revenue",
    "color": "#4F46E5"
  },
  "position_config": {
    "x": 0,
    "y": 0,
    "width": 6,
    "height": 4
  },
  "refresh_interval": 300
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "widget_id": "uuid"
  },
  "message": "Widget added successfully"
}
```

---

### 3. KPIs API

#### GET /api/v1/analytics/kpis.php
List all KPIs with optional filtering.

**Query Parameters**:
- `category` (optional): Filter by category
- `is_active` (optional): Filter by active status (true/false)

**Response**:
```json
{
  "success": true,
  "data": {
    "kpis": [
      {
        "id": "uuid",
        "name": "Monthly Recurring Revenue",
        "description": "Total MRR from all customers",
        "metric_type": "revenue",
        "target_value": 100000.00,
        "warning_threshold": 90000.00,
        "critical_threshold": 80000.00,
        "unit": "$",
        "category": "Financial",
        "is_active": true,
        "current_value": 95000.00,
        "status": "warning",
        "last_updated": "2025-01-15T10:00:00Z"
      }
    ],
    "count": 1
  }
}
```

#### POST /api/v1/analytics/kpis.php
Create a new KPI.

**Request Body**:
```json
{
  "name": "Customer Acquisition Cost",
  "description": "Average cost to acquire a new customer",
  "metric_type": "customer_acquisition_cost",
  "target_value": 500.00,
  "warning_threshold": 600.00,
  "critical_threshold": 750.00,
  "unit": "$",
  "category": "Marketing"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "kpi_id": "uuid"
  },
  "message": "KPI created successfully"
}
```

#### POST /api/v1/analytics/kpis.php?action=record_value
Record a KPI value.

**Request Body**:
```json
{
  "kpi_id": "uuid",
  "actual_value": 95000.00,
  "target_value": 100000.00,
  "period_start": "2025-01-01",
  "period_end": "2025-01-31",
  "notes": "Slight dip due to seasonal trends"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "value_id": "uuid"
  },
  "message": "KPI value recorded successfully"
}
```

---

### 4. Custom Reports API

#### GET /api/v1/analytics/reports.php
List custom reports.

**Query Parameters**:
- `category` (optional): Filter by category

**Response**:
```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "id": "uuid",
        "name": "Top Customers by Revenue",
        "description": "List of customers sorted by lifetime value",
        "data_source": "invoices",
        "category": "Sales",
        "is_scheduled": false,
        "created_at": "2025-01-15T10:00:00Z"
      }
    ],
    "count": 1
  }
}
```

#### POST /api/v1/analytics/reports.php
Create a custom report.

**Request Body**:
```json
{
  "name": "Project Profitability Report",
  "description": "Analyze profit margins across all projects",
  "data_source": "projects",
  "query_template": "SELECT * FROM project_profitability WHERE company_id = :company_id",
  "parameters": {
    "company_id": "uuid"
  },
  "category": "Financial"
}
```

---

### 5. Metrics API

#### GET /api/v1/analytics/metrics.php
Get dashboard overview metrics.

**Query Parameters**:
- `start_date` (optional): Start date (default: 30 days ago)
- `end_date` (optional): End date (default: today)

**Response**:
```json
{
  "success": true,
  "data": {
    "metrics": {
      "total_revenue": 125000.00,
      "total_expenses": 75000.00,
      "profit_margin": 40.00,
      "active_projects": 12,
      "total_hours": 1250.5,
      "utilization_rate": 78.15
    },
    "period": {
      "start_date": "2024-12-15",
      "end_date": "2025-01-15"
    }
  }
}
```

## Usage Examples

### Example 1: Creating a Revenue Dashboard

**Step 1**: Create the dashboard
```bash
curl -X POST https://documentiulia.ro/api/v1/analytics/dashboards.php \
  -H "Authorization: Bearer <token>" \
  -H "X-Company-ID: <company-id>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Revenue Analytics",
    "description": "Track revenue across all channels",
    "dashboard_type": "custom",
    "is_public": true
  }'
```

**Step 2**: Add a revenue trend widget
```bash
curl -X POST https://documentiulia.ro/api/v1/analytics/widgets.php \
  -H "Authorization: Bearer <token>" \
  -H "X-Company-ID: <company-id>" \
  -H "Content-Type: application/json" \
  -d '{
    "dashboard_id": "<dashboard-id>",
    "widget_type": "chart",
    "title": "Monthly Revenue Trend",
    "data_source": "revenue",
    "visualization_config": {
      "chart_type": "line",
      "x_axis": "month",
      "y_axis": "total_revenue"
    },
    "position_config": {"x": 0, "y": 0, "width": 12, "height": 6}
  }'
```

### Example 2: Setting Up a KPI

**Create KPI**:
```bash
curl -X POST https://documentiulia.ro/api/v1/analytics/kpis.php \
  -H "Authorization: Bearer <token>" \
  -H "X-Company-ID: <company-id>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Net Profit Margin",
    "metric_type": "profit_margin",
    "target_value": 25.00,
    "warning_threshold": 20.00,
    "critical_threshold": 15.00,
    "unit": "%",
    "category": "Financial"
  }'
```

**Record Monthly Value**:
```bash
curl -X POST https://documentiulia.ro/api/v1/analytics/kpis.php?action=record_value \
  -H "Authorization: Bearer <token>" \
  -H "X-Company-ID: <company-id>" \
  -H "Content-Type: application/json" \
  -d '{
    "kpi_id": "<kpi-id>",
    "actual_value": 22.50,
    "period_start": "2025-01-01",
    "period_end": "2025-01-31"
  }'
```

### Example 3: Creating a Custom Report

```bash
curl -X POST https://documentiulia.ro/api/v1/analytics/reports.php \
  -H "Authorization: Bearer <token>" \
  -H "X-Company-ID: <company-id>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer Lifetime Value Analysis",
    "description": "Top 20 customers by lifetime value",
    "data_source": "custom_query",
    "query_template": "SELECT * FROM customer_lifetime_value WHERE company_id = :company_id ORDER BY lifetime_value DESC LIMIT 20",
    "category": "Sales"
  }'
```

## Widget Configuration Guide

### Supported Widget Types

#### 1. Chart Widget
```json
{
  "widget_type": "chart",
  "visualization_config": {
    "chart_type": "line",  // line, bar, pie, area
    "x_axis": "month",
    "y_axis": "total_revenue",
    "color": "#4F46E5",
    "show_legend": true,
    "show_grid": true
  }
}
```

#### 2. Table Widget
```json
{
  "widget_type": "table",
  "visualization_config": {
    "columns": ["name", "revenue", "profit_margin"],
    "sortable": true,
    "paginated": true,
    "page_size": 25
  }
}
```

#### 3. Metric Widget (Single Value)
```json
{
  "widget_type": "metric",
  "visualization_config": {
    "display_format": "currency",  // currency, percentage, number
    "comparison": "previous_period",
    "show_trend": true
  }
}
```

#### 4. KPI Widget
```json
{
  "widget_type": "kpi",
  "data_source": "kpi",
  "query_config": {
    "kpi_id": "uuid"
  },
  "visualization_config": {
    "display_type": "gauge",  // gauge, progress_bar, indicator
    "show_target": true,
    "show_variance": true
  }
}
```

### Data Source Configuration

#### Revenue Data Source
```json
{
  "data_source": "revenue",
  "query_config": {
    "date_range": "last_12_months",  // last_7_days, last_30_days, last_12_months, custom
    "group_by": "month",  // day, week, month, quarter, year
    "status_filter": ["paid"],
    "custom_start_date": "2024-01-01",  // if date_range is 'custom'
    "custom_end_date": "2024-12-31"
  }
}
```

#### Expense Data Source
```json
{
  "data_source": "expenses",
  "query_config": {
    "date_range": "last_30_days",
    "group_by": "category",
    "include_bills": true
  }
}
```

#### Custom Query Data Source
```json
{
  "data_source": "custom_query",
  "query_config": {
    "query": "SELECT category, SUM(amount) as total FROM expenses WHERE company_id = :company_id GROUP BY category",
    "parameters": {
      "company_id": "uuid"
    }
  }
}
```

## Integration Guide

### Frontend Integration

#### 1. Fetching Dashboard Data
```javascript
async function loadDashboard(dashboardId) {
  const response = await fetch(
    `https://documentiulia.ro/api/v1/analytics/dashboards.php?id=${dashboardId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Company-ID': companyId
      }
    }
  );

  const { data } = await response.json();
  return data.dashboard;
}
```

#### 2. Rendering Widgets
```javascript
async function renderWidget(widgetId) {
  const response = await fetch(
    `https://documentiulia.ro/api/v1/analytics/widgets.php?widget_id=${widgetId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Company-ID': companyId
      }
    }
  );

  const { data } = await response.json();

  // Render based on widget_type
  if (data.widget_type === 'chart') {
    renderChart(data.data, data.visualization_config);
  } else if (data.widget_type === 'table') {
    renderTable(data.data);
  }
}
```

#### 3. Real-time Updates
```javascript
// Set up auto-refresh based on widget refresh_interval
function setupAutoRefresh(widget) {
  const intervalMs = widget.refresh_interval * 1000;

  setInterval(async () => {
    const freshData = await fetchWidgetData(widget.id);
    updateWidgetDisplay(widget.id, freshData);
  }, intervalMs);
}
```

### Dashboard Builder UI

Recommended UI components:
1. **Dashboard Grid**: Use react-grid-layout or similar for drag-and-drop widget positioning
2. **Widget Library**: Sidebar with available widget types
3. **Configuration Panel**: Right panel for widget settings
4. **Data Source Selector**: Dropdown with available data sources
5. **Visualization Config**: Form for chart type, colors, axes

## Best Practices

### 1. Performance Optimization

**Use Materialized Views for Heavy Queries**:
```sql
CREATE MATERIALIZED VIEW monthly_revenue_summary AS
SELECT
  company_id,
  DATE_TRUNC('month', invoice_date) as month,
  SUM(total_amount) as total_revenue
FROM invoices
WHERE status = 'paid'
GROUP BY company_id, DATE_TRUNC('month', invoice_date);

-- Refresh periodically
REFRESH MATERIALIZED VIEW monthly_revenue_summary;
```

**Widget Refresh Intervals**:
- Real-time metrics: 30-60 seconds
- Hourly aggregations: 5 minutes
- Daily summaries: 30 minutes
- Historical reports: On-demand only

### 2. Security Considerations

**SQL Injection Prevention**:
- All custom queries are executed with parameterized statements
- User input is sanitized and validated
- Query execution is logged for audit purposes

**Access Control**:
- Dashboards have `is_public` flag for sharing control
- Company-level data isolation enforced at database level
- User permissions checked for sensitive data sources

### 3. KPI Management

**Setting Realistic Thresholds**:
```
target_value: 100%
warning_threshold: 90% of target (90)
critical_threshold: 75% of target (75)
```

**KPI Review Cadence**:
- Financial KPIs: Monthly
- Operational KPIs: Weekly
- Strategic KPIs: Quarterly

### 4. Custom Report Design

**Efficient Query Design**:
```sql
-- GOOD: Indexed columns, specific date range
SELECT * FROM invoices
WHERE company_id = :company_id
  AND invoice_date BETWEEN :start_date AND :end_date
  AND status = 'paid'
ORDER BY invoice_date DESC
LIMIT 1000;

-- BAD: Full table scan, no limits
SELECT * FROM invoices
WHERE company_id = :company_id
ORDER BY total_amount DESC;
```

### 5. Dashboard Design Principles

1. **Information Hierarchy**: Most important metrics at the top
2. **Consistent Color Scheme**: Use brand colors for consistency
3. **Responsive Layout**: Ensure widgets adapt to screen size
4. **Minimal Clutter**: 6-8 widgets maximum per dashboard
5. **Actionable Insights**: Link widgets to relevant pages (e.g., click revenue chart → invoice list)

## Analytics Events Tracking

Track user interactions for behavior analysis:

```javascript
// Track dashboard view
await fetch('https://documentiulia.ro/api/v1/analytics/events.php', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Company-ID': companyId,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    event_type: 'dashboard_view',
    event_category: 'analytics',
    event_data: {
      dashboard_id: dashboardId,
      dashboard_name: 'Executive Dashboard'
    }
  })
});

// Track widget interaction
await fetch('https://documentiulia.ro/api/v1/analytics/events.php', {
  method: 'POST',
  body: JSON.stringify({
    event_type: 'widget_interaction',
    event_category: 'analytics',
    event_data: {
      widget_id: widgetId,
      interaction_type: 'click',
      widget_type: 'chart'
    }
  })
});
```

## Troubleshooting

### Issue: Widget Not Loading Data

**Possible Causes**:
1. Invalid data source configuration
2. Missing company_id in query
3. Database permissions issue

**Solution**:
```sql
-- Check widget configuration
SELECT * FROM dashboard_widgets WHERE id = '<widget-id>';

-- Verify data source query manually
SELECT * FROM revenue_by_month WHERE company_id = '<company-id>';
```

### Issue: KPI Status Incorrect

**Check**:
```sql
-- Verify KPI thresholds
SELECT
  name,
  target_value,
  warning_threshold,
  critical_threshold,
  calculate_kpi_status(
    (SELECT actual_value FROM kpi_values WHERE kpi_id = kpis.id ORDER BY recorded_at DESC LIMIT 1),
    target_value,
    warning_threshold,
    critical_threshold
  ) as calculated_status
FROM kpis
WHERE id = '<kpi-id>';
```

### Issue: Custom Report Timeout

**Solutions**:
1. Add indexes to queried columns
2. Limit result set with LIMIT clause
3. Use materialized views for complex aggregations
4. Increase execution timeout for specific reports

## Appendix: Complete API Reference

### Error Response Format
All endpoints return consistent error format:
```json
{
  "success": false,
  "message": "Descriptive error message"
}
```

### Common HTTP Status Codes
- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: User lacks permission
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server-side error

### Rate Limiting
- Dashboard API: 100 requests per minute
- Widget data API: 200 requests per minute (higher for real-time widgets)
- KPI API: 100 requests per minute
- Reports API: 50 requests per minute (lower due to query complexity)

---

**Module Status**: Analytics & BI Module backend complete
**Version**: 1.0
**Last Updated**: 2025-01-15
