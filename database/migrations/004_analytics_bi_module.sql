-- ============================================================================
-- Module 4: Analytics & Business Intelligence
-- ============================================================================
-- Description: Comprehensive analytics and BI system with dashboards,
--              KPI tracking, custom reports, and data visualization
-- Version: 1.0.0
-- Created: 2025-11-19
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy text search

-- ============================================================================
-- TABLE: dashboards
-- Purpose: Store user-defined dashboard configurations
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    dashboard_type VARCHAR(50) DEFAULT 'custom',
        -- Types: custom, executive, financial, operational, sales, hr
    layout JSONB DEFAULT '[]',
        -- Stores widget positions and sizes
        -- Example: [{"widget_id": "uuid", "x": 0, "y": 0, "w": 6, "h": 4}]
    is_default BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
        -- Public dashboards visible to all company users
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, name)
);

CREATE INDEX idx_dashboards_company ON dashboards(company_id);
CREATE INDEX idx_dashboards_type ON dashboards(dashboard_type);
CREATE INDEX idx_dashboards_created_by ON dashboards(created_by);

-- ============================================================================
-- TABLE: dashboard_widgets
-- Purpose: Individual widgets that can be added to dashboards
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    widget_type VARCHAR(50) NOT NULL,
        -- Types: chart, table, metric, gauge, map, calendar, funnel
    chart_type VARCHAR(50),
        -- For widget_type='chart': line, bar, pie, donut, area, scatter, bubble
    title VARCHAR(255) NOT NULL,
    data_source VARCHAR(100) NOT NULL,
        -- Source: sales, expenses, revenue, projects, time_tracking, custom_query
    query_config JSONB NOT NULL,
        -- Stores the query configuration
        -- Example: {"metric": "revenue", "groupBy": "month", "filters": {...}}
    visualization_config JSONB DEFAULT '{}',
        -- Chart-specific configuration (colors, labels, axes, etc.)
    refresh_interval INTEGER DEFAULT 300,
        -- Auto-refresh interval in seconds (0 = manual only)
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    width INTEGER DEFAULT 6,
        -- Grid units (12-column grid)
    height INTEGER DEFAULT 4,
        -- Grid units
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_widgets_dashboard ON dashboard_widgets(dashboard_id);
CREATE INDEX idx_widgets_type ON dashboard_widgets(widget_type);
CREATE INDEX idx_widgets_data_source ON dashboard_widgets(data_source);

-- ============================================================================
-- TABLE: kpis (Key Performance Indicators)
-- Purpose: Define and track business KPIs
-- ============================================================================
CREATE TABLE IF NOT EXISTS kpis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
        -- Categories: financial, operational, customer, employee, growth
    metric_type VARCHAR(50) NOT NULL,
        -- Types: currency, percentage, number, ratio, count
    calculation_method VARCHAR(50) NOT NULL,
        -- Methods: sum, average, count, ratio, custom_query
    calculation_config JSONB NOT NULL,
        -- Stores calculation details
        -- Example: {"numerator": "revenue", "denominator": "employees"}
    target_value DECIMAL(15,2),
        -- Target to achieve
    target_period VARCHAR(20),
        -- Period: daily, weekly, monthly, quarterly, yearly
    comparison_operator VARCHAR(10) DEFAULT '>=',
        -- Operators: >, >=, <, <=, =
    thresholds JSONB DEFAULT '{}',
        -- Color thresholds
        -- Example: {"red": 0, "yellow": 75, "green": 90}
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, name)
);

CREATE INDEX idx_kpis_company ON kpis(company_id);
CREATE INDEX idx_kpis_category ON kpis(category);
CREATE INDEX idx_kpis_active ON kpis(is_active);

-- ============================================================================
-- TABLE: kpi_values
-- Purpose: Historical values for KPI tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS kpi_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kpi_id UUID NOT NULL REFERENCES kpis(id) ON DELETE CASCADE,
    period_date DATE NOT NULL,
        -- The date/period this value represents
    actual_value DECIMAL(15,2) NOT NULL,
    target_value DECIMAL(15,2),
    variance DECIMAL(15,2),
        -- Difference between actual and target
    variance_percentage DECIMAL(5,2),
        -- Percentage variance
    status VARCHAR(20),
        -- Status: on_track, warning, critical, exceeding
    notes TEXT,
    recorded_by UUID REFERENCES users(id),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_kpi_values_kpi ON kpi_values(kpi_id);
CREATE INDEX idx_kpi_values_period ON kpi_values(period_date);
CREATE INDEX idx_kpi_values_status ON kpi_values(status);

-- ============================================================================
-- TABLE: custom_reports
-- Purpose: User-defined custom reports with SQL queries
-- ============================================================================
CREATE TABLE IF NOT EXISTS custom_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
        -- Categories: financial, sales, inventory, hr, operational, custom
    report_type VARCHAR(50) DEFAULT 'table',
        -- Types: table, chart, pivot, cross_tab
    data_source VARCHAR(100) NOT NULL,
        -- Source table/view or 'custom_query'
    query_template TEXT NOT NULL,
        -- SQL query template with placeholders
        -- Example: SELECT * FROM invoices WHERE company_id = :company_id
        --          AND created_at >= :start_date
    parameters JSONB DEFAULT '[]',
        -- Input parameters for the query
        -- Example: [{"name": "start_date", "type": "date", "required": true}]
    columns_config JSONB DEFAULT '[]',
        -- Column definitions and formatting
        -- Example: [{"field": "total", "header": "Total Amount", "format": "currency"}]
    filters_config JSONB DEFAULT '[]',
        -- Available filters
    sorting_config JSONB DEFAULT '{}',
        -- Default sorting
    grouping_config JSONB DEFAULT '{}',
        -- Grouping and aggregation
    is_scheduled BOOLEAN DEFAULT false,
    schedule_config JSONB DEFAULT '{}',
        -- Cron-like schedule: {"frequency": "daily", "time": "09:00"}
    recipients JSONB DEFAULT '[]',
        -- Email recipients for scheduled reports
    output_format VARCHAR(20) DEFAULT 'html',
        -- Formats: html, pdf, excel, csv
    is_public BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_run_at TIMESTAMP,
    UNIQUE(company_id, name)
);

CREATE INDEX idx_custom_reports_company ON custom_reports(company_id);
CREATE INDEX idx_custom_reports_category ON custom_reports(category);
CREATE INDEX idx_custom_reports_scheduled ON custom_reports(is_scheduled);

-- ============================================================================
-- TABLE: report_executions
-- Purpose: Track report execution history
-- ============================================================================
CREATE TABLE IF NOT EXISTS report_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES custom_reports(id) ON DELETE CASCADE,
    executed_by UUID REFERENCES users(id),
        -- NULL if scheduled/automated
    parameters_used JSONB DEFAULT '{}',
        -- Actual parameter values used
    execution_status VARCHAR(20) NOT NULL,
        -- Status: success, failed, timeout
    execution_time_ms INTEGER,
        -- Execution duration in milliseconds
    row_count INTEGER,
        -- Number of rows returned
    error_message TEXT,
        -- Error details if failed
    output_file_path VARCHAR(500),
        -- Path to generated file
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_report_executions_report ON report_executions(report_id);
CREATE INDEX idx_report_executions_status ON report_executions(execution_status);
CREATE INDEX idx_report_executions_date ON report_executions(executed_at);

-- ============================================================================
-- TABLE: data_exports
-- Purpose: Track data export requests and files
-- ============================================================================
CREATE TABLE IF NOT EXISTS data_exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    export_type VARCHAR(50) NOT NULL,
        -- Types: full_backup, filtered_data, report_export, dashboard_export
    entity_type VARCHAR(100),
        -- What was exported: invoices, time_entries, all_data, etc.
    filters JSONB DEFAULT '{}',
        -- Filters applied to the export
    file_format VARCHAR(20) NOT NULL,
        -- Formats: csv, xlsx, json, sql, pdf
    file_path VARCHAR(500),
    file_size_bytes BIGINT,
    row_count INTEGER,
    compression_type VARCHAR(20),
        -- Compression: none, zip, gzip
    status VARCHAR(20) NOT NULL,
        -- Status: pending, processing, completed, failed
    expires_at TIMESTAMP,
        -- When the export file will be deleted
    requested_by UUID NOT NULL REFERENCES users(id),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_data_exports_company ON data_exports(company_id);
CREATE INDEX idx_data_exports_status ON data_exports(status);
CREATE INDEX idx_data_exports_requested_by ON data_exports(requested_by);
CREATE INDEX idx_data_exports_expires ON data_exports(expires_at);

-- ============================================================================
-- TABLE: data_visualizations
-- Purpose: Saved data visualization configurations
-- ============================================================================
CREATE TABLE IF NOT EXISTS data_visualizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    visualization_type VARCHAR(50) NOT NULL,
        -- Types: chart, graph, map, network, tree, sankey, heatmap
    chart_library VARCHAR(50) DEFAULT 'chartjs',
        -- Libraries: chartjs, d3, plotly, highcharts
    data_query TEXT NOT NULL,
        -- SQL query to fetch data
    chart_config JSONB NOT NULL,
        -- Complete chart configuration
        -- Example: {"type": "line", "options": {...}, "data": {...}}
    is_interactive BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT false,
    thumbnail_url VARCHAR(500),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, name)
);

CREATE INDEX idx_visualizations_company ON data_visualizations(company_id);
CREATE INDEX idx_visualizations_type ON data_visualizations(visualization_type);

-- ============================================================================
-- TABLE: analytics_events
-- Purpose: Track user interactions and system events for analytics
-- ============================================================================
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
        -- Types: page_view, button_click, feature_use, api_call, error
    event_category VARCHAR(100),
        -- Categories: navigation, interaction, transaction, system
    event_action VARCHAR(255),
        -- Specific action taken
    event_label VARCHAR(255),
        -- Additional context
    event_value DECIMAL(15,2),
        -- Numeric value associated with event
    event_metadata JSONB DEFAULT '{}',
        -- Additional event data
    session_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analytics_events_company ON analytics_events(company_id);
CREATE INDEX idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_category ON analytics_events(event_category);
CREATE INDEX idx_analytics_events_date ON analytics_events(created_at);

-- Convert to hypertable for time-series optimization (if TimescaleDB is available)
-- SELECT create_hypertable('analytics_events', 'created_at', if_not_exists => TRUE);

-- ============================================================================
-- VIEWS: Pre-built analytics views
-- ============================================================================

-- Revenue by Month View
CREATE OR REPLACE VIEW revenue_by_month AS
SELECT
    company_id,
    DATE_TRUNC('month', invoice_date) as month,
    COUNT(*) as invoice_count,
    SUM(total_amount) as total_revenue,
    AVG(total_amount) as avg_invoice_amount,
    SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) as paid_revenue,
    SUM(CASE WHEN status = 'pending' THEN total_amount ELSE 0 END) as pending_revenue
FROM invoices
GROUP BY company_id, DATE_TRUNC('month', invoice_date);

-- Project Profitability View
CREATE OR REPLACE VIEW project_profitability AS
SELECT
    p.id as project_id,
    p.company_id,
    p.name as project_name,
    p.budget,
    COALESCE(SUM(te.billable_amount), 0) as total_billed,
    COALESCE(SUM(te.cost_amount), 0) as total_cost,
    COALESCE(SUM(te.billable_amount), 0) - COALESCE(SUM(te.cost_amount), 0) as profit,
    CASE
        WHEN COALESCE(SUM(te.billable_amount), 0) > 0 THEN
            ((COALESCE(SUM(te.billable_amount), 0) - COALESCE(SUM(te.cost_amount), 0))
            / COALESCE(SUM(te.billable_amount), 0) * 100)
        ELSE 0
    END as profit_margin_percentage,
    COALESCE(SUM(te.hours_worked), 0) as total_hours
FROM projects p
LEFT JOIN time_entries te ON p.id = te.project_id
GROUP BY p.id, p.company_id, p.name, p.budget;

-- Customer Lifetime Value View
CREATE OR REPLACE VIEW customer_lifetime_value AS
SELECT
    c.id as customer_id,
    c.company_id,
    c.name as customer_name,
    COUNT(DISTINCT i.id) as total_invoices,
    COALESCE(SUM(i.total_amount), 0) as lifetime_value,
    COALESCE(AVG(i.total_amount), 0) as avg_invoice_value,
    MIN(i.invoice_date) as first_purchase_date,
    MAX(i.invoice_date) as last_purchase_date,
    CURRENT_DATE - MAX(i.invoice_date) as days_since_last_purchase
FROM customers c
LEFT JOIN invoices i ON c.id = i.customer_id
GROUP BY c.id, c.company_id, c.name;

-- ============================================================================
-- FUNCTIONS: Analytics helper functions
-- ============================================================================

-- Function: Calculate KPI status based on thresholds
CREATE OR REPLACE FUNCTION calculate_kpi_status(
    p_actual_value DECIMAL,
    p_target_value DECIMAL,
    p_thresholds JSONB
)
RETURNS VARCHAR AS $$
DECLARE
    v_percentage DECIMAL;
    v_red_threshold DECIMAL;
    v_yellow_threshold DECIMAL;
    v_green_threshold DECIMAL;
BEGIN
    IF p_target_value = 0 OR p_target_value IS NULL THEN
        RETURN 'unknown';
    END IF;

    v_percentage := (p_actual_value / p_target_value) * 100;

    v_red_threshold := COALESCE((p_thresholds->>'red')::DECIMAL, 0);
    v_yellow_threshold := COALESCE((p_thresholds->>'yellow')::DECIMAL, 75);
    v_green_threshold := COALESCE((p_thresholds->>'green')::DECIMAL, 90);

    IF v_percentage >= v_green_threshold THEN
        RETURN 'on_track';
    ELSIF v_percentage >= v_yellow_threshold THEN
        RETURN 'warning';
    ELSE
        RETURN 'critical';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Get dashboard metrics
CREATE OR REPLACE FUNCTION get_dashboard_metrics(
    p_company_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_revenue', (
            SELECT COALESCE(SUM(total_amount), 0)
            FROM invoices
            WHERE company_id = p_company_id
            AND invoice_date BETWEEN p_start_date AND p_end_date
            AND status = 'paid'
        ),
        'total_expenses', (
            SELECT COALESCE(SUM(amount), 0)
            FROM expenses
            WHERE company_id = p_company_id
            AND expense_date BETWEEN p_start_date AND p_end_date
        ),
        'active_projects', (
            SELECT COUNT(*)
            FROM projects
            WHERE company_id = p_company_id
            AND status = 'active'
        ),
        'total_hours_logged', (
            SELECT COALESCE(SUM(hours_worked), 0)
            FROM time_entries
            WHERE company_id = p_company_id
            AND entry_date BETWEEN p_start_date AND p_end_date
        ),
        'outstanding_invoices', (
            SELECT COUNT(*)
            FROM invoices
            WHERE company_id = p_company_id
            AND status IN ('pending', 'sent')
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS: Automated updates
-- ============================================================================

-- Update dashboard updated_at timestamp
CREATE OR REPLACE FUNCTION update_dashboard_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dashboards_updated
BEFORE UPDATE ON dashboards
FOR EACH ROW
EXECUTE FUNCTION update_dashboard_timestamp();

CREATE TRIGGER trg_dashboard_widgets_updated
BEFORE UPDATE ON dashboard_widgets
FOR EACH ROW
EXECUTE FUNCTION update_dashboard_timestamp();

-- Auto-calculate KPI variance on insert/update
CREATE OR REPLACE FUNCTION calculate_kpi_variance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.target_value IS NOT NULL AND NEW.target_value != 0 THEN
        NEW.variance := NEW.actual_value - NEW.target_value;
        NEW.variance_percentage := ((NEW.actual_value - NEW.target_value) / NEW.target_value) * 100;

        -- Calculate status based on KPI thresholds
        SELECT calculate_kpi_status(
            NEW.actual_value,
            NEW.target_value,
            kpis.thresholds
        ) INTO NEW.status
        FROM kpis
        WHERE kpis.id = NEW.kpi_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_kpi_values_calculate
BEFORE INSERT OR UPDATE ON kpi_values
FOR EACH ROW
EXECUTE FUNCTION calculate_kpi_variance();

-- ============================================================================
-- SAMPLE DATA: Default dashboards and KPIs
-- ============================================================================

-- Note: Sample data will be inserted via application code or separate seed script
-- This ensures company_id references are valid

-- ============================================================================
-- PERMISSIONS: Grant appropriate access
-- ============================================================================

-- Grant SELECT on views to application role (if exists)
-- GRANT SELECT ON revenue_by_month, project_profitability, customer_lifetime_value
-- TO app_user;

-- ============================================================================
-- INDEXES for PERFORMANCE
-- ============================================================================

-- Additional composite indexes for common queries
CREATE INDEX idx_kpi_values_kpi_period ON kpi_values(kpi_id, period_date DESC);
CREATE INDEX idx_analytics_events_company_date ON analytics_events(company_id, created_at DESC);
CREATE INDEX idx_report_executions_report_date ON report_executions(report_id, executed_at DESC);

-- GIN index for JSONB columns (for fast JSON queries)
CREATE INDEX idx_dashboards_layout_gin ON dashboards USING GIN(layout);
CREATE INDEX idx_widgets_query_config_gin ON dashboard_widgets USING GIN(query_config);
CREATE INDEX idx_widgets_viz_config_gin ON dashboard_widgets USING GIN(visualization_config);
CREATE INDEX idx_kpis_thresholds_gin ON kpis USING GIN(thresholds);
CREATE INDEX idx_analytics_events_metadata_gin ON analytics_events USING GIN(event_metadata);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Analytics & BI Module migration completed successfully';
    RAISE NOTICE 'Tables created: 12';
    RAISE NOTICE 'Views created: 3';
    RAISE NOTICE 'Functions created: 2';
    RAISE NOTICE 'Triggers created: 3';
END $$;
