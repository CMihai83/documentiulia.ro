-- Migration: Dashboard Layouts and Widgets System
-- Enables persona-adaptive dashboard with customizable widgets

-- Widget definitions (registry of available widgets)
CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id VARCHAR(100) PRIMARY KEY,
    name_ro VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    description_ro TEXT,
    description_en TEXT,
    category VARCHAR(50) NOT NULL, -- 'financial', 'operational', 'analytics', 'activity'
    component_name VARCHAR(100) NOT NULL, -- React component name
    default_width INTEGER DEFAULT 6, -- Grid columns (1-12)
    default_height INTEGER DEFAULT 4, -- Grid rows
    min_width INTEGER DEFAULT 3,
    min_height INTEGER DEFAULT 2,
    max_width INTEGER DEFAULT 12,
    max_height INTEGER DEFAULT 8,
    data_source VARCHAR(255), -- API endpoint or data type
    refresh_interval INTEGER DEFAULT 300, -- Seconds, 0 for no auto-refresh
    is_resizable BOOLEAN DEFAULT true,
    is_removable BOOLEAN DEFAULT true,
    required_feature VARCHAR(100), -- Feature toggle required to access
    required_tier VARCHAR(50) DEFAULT 'free',
    enabled_for_personas JSONB DEFAULT '[]', -- Empty = all personas
    settings_schema JSONB DEFAULT '{}', -- JSON schema for widget settings
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Persona default layouts (what each persona sees initially)
CREATE TABLE IF NOT EXISTS persona_dashboard_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    persona_id VARCHAR(100) NOT NULL,
    layout_name VARCHAR(100) DEFAULT 'default',
    widgets JSONB NOT NULL, -- Array of widget configs with positions
    is_default BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(persona_id, layout_name)
);

-- User custom layouts (user overrides)
CREATE TABLE IF NOT EXISTS user_dashboard_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    layout_name VARCHAR(100) DEFAULT 'custom',
    widgets JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, company_id, layout_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_persona_layouts_persona ON persona_dashboard_layouts(persona_id);
CREATE INDEX IF NOT EXISTS idx_user_layouts_user ON user_dashboard_layouts(user_id, company_id);
CREATE INDEX IF NOT EXISTS idx_widgets_category ON dashboard_widgets(category);

-- Seed: Core widgets available to all personas
INSERT INTO dashboard_widgets (id, name_ro, name_en, description_ro, description_en, category, component_name, default_width, default_height, data_source, enabled_for_personas)
VALUES
    ('revenue_chart', 'Grafic Venituri', 'Revenue Chart',
     'Vizualizare venituri lunare', 'Monthly revenue visualization',
     'financial', 'RevenueChartWidget', 6, 4, '/api/v1/analytics/revenue', '[]'),

    ('expense_chart', 'Grafic Cheltuieli', 'Expenses Chart',
     'Vizualizare cheltuieli pe categorii', 'Expenses by category visualization',
     'financial', 'ExpenseChartWidget', 6, 4, '/api/v1/analytics/expenses', '[]'),

    ('outstanding_invoices', 'Facturi Neplatite', 'Outstanding Invoices',
     'Lista facturi care asteapta plata', 'Invoices awaiting payment',
     'financial', 'OutstandingInvoicesWidget', 4, 3, '/api/v1/invoices/outstanding', '[]'),

    ('cash_flow', 'Flux Numerar', 'Cash Flow Forecast',
     'Previziune flux numerar 30 zile', '30-day cash flow forecast',
     'financial', 'CashFlowWidget', 8, 4, '/api/v1/analytics/cashflow', '[]'),

    ('quick_actions', 'Actiuni Rapide', 'Quick Actions',
     'Butoane pentru actiuni frecvente', 'Buttons for frequent actions',
     'operational', 'QuickActionsWidget', 4, 2, NULL, '[]'),

    ('today_tasks', 'Sarcini Azi', 'Today''s Tasks',
     'Lista sarcinilor pentru astazi', 'List of today''s tasks',
     'operational', 'TodayTasksWidget', 4, 4, '/api/v1/tasks/today', '[]'),

    ('recent_activity', 'Activitate Recenta', 'Recent Activity',
     'Flux activitati recente', 'Recent activity feed',
     'activity', 'RecentActivityWidget', 4, 4, '/api/v1/activity/recent', '[]'),

    ('kpi_summary', 'Sumar KPI', 'KPI Summary',
     'Indicatori cheie de performanta', 'Key performance indicators',
     'analytics', 'KPISummaryWidget', 12, 2, '/api/v1/analytics/kpis', '[]')
ON CONFLICT (id) DO UPDATE SET
    name_ro = EXCLUDED.name_ro,
    name_en = EXCLUDED.name_en,
    description_ro = EXCLUDED.description_ro,
    description_en = EXCLUDED.description_en;

-- Seed: Persona-specific widgets
INSERT INTO dashboard_widgets (id, name_ro, name_en, category, component_name, default_width, default_height, data_source, enabled_for_personas, required_tier)
VALUES
    -- Construction/Trades specific
    ('active_projects', 'Proiecte Active', 'Active Projects',
     'operational', 'ActiveProjectsWidget', 6, 4, '/api/v1/projects/active',
     '["construction_contractor", "electrical_contractor", "general_trades"]', 'starter'),

    ('crew_schedule', 'Program Echipa', 'Crew Schedule',
     'operational', 'CrewScheduleWidget', 6, 3, '/api/v1/crew/schedule',
     '["construction_contractor", "electrical_contractor", "general_trades"]', 'professional'),

    ('material_alerts', 'Alerte Materiale', 'Material Alerts',
     'operational', 'MaterialAlertsWidget', 4, 3, '/api/v1/materials/alerts',
     '["construction_contractor", "general_trades"]', 'starter'),

    -- Delivery specific
    ('todays_routes', 'Rute Azi', 'Today''s Routes',
     'operational', 'TodaysRoutesWidget', 6, 4, '/api/v1/routes/today',
     '["delivery_service", "courier_freelancer"]', 'starter'),

    ('fleet_status', 'Status Flota', 'Fleet Status',
     'operational', 'FleetStatusWidget', 6, 3, '/api/v1/fleet/status',
     '["delivery_service"]', 'professional'),

    ('delivery_metrics', 'Metrici Livrari', 'Delivery Metrics',
     'analytics', 'DeliveryMetricsWidget', 6, 4, '/api/v1/analytics/deliveries',
     '["delivery_service", "courier_freelancer"]', 'starter'),

    -- Retail specific
    ('inventory_alerts', 'Alerte Stoc', 'Inventory Alerts',
     'operational', 'InventoryAlertsWidget', 4, 3, '/api/v1/inventory/alerts',
     '["retail_shop", "ecommerce_seller"]', 'starter'),

    ('sales_today', 'Vanzari Azi', 'Today''s Sales',
     'financial', 'TodaySalesWidget', 6, 4, '/api/v1/sales/today',
     '["retail_shop", "ecommerce_seller"]', 'free'),

    -- Freelancer specific
    ('time_tracker', 'Timp Lucrat', 'Time Tracker',
     'operational', 'TimeTrackerWidget', 4, 3, '/api/v1/time/current',
     '["freelancer", "consultant"]', 'free'),

    ('client_overview', 'Clienti', 'Client Overview',
     'operational', 'ClientOverviewWidget', 4, 4, '/api/v1/clients/overview',
     '["freelancer", "consultant", "professional_services"]', 'free')
ON CONFLICT (id) DO UPDATE SET
    name_ro = EXCLUDED.name_ro,
    name_en = EXCLUDED.name_en,
    enabled_for_personas = EXCLUDED.enabled_for_personas;

-- Seed: Default layouts per persona
INSERT INTO persona_dashboard_layouts (persona_id, layout_name, widgets, is_default)
VALUES
    ('freelancer', 'default', '[
        {"widget_id": "kpi_summary", "x": 0, "y": 0, "w": 12, "h": 2},
        {"widget_id": "revenue_chart", "x": 0, "y": 2, "w": 6, "h": 4},
        {"widget_id": "time_tracker", "x": 6, "y": 2, "w": 3, "h": 3},
        {"widget_id": "quick_actions", "x": 9, "y": 2, "w": 3, "h": 2},
        {"widget_id": "outstanding_invoices", "x": 6, "y": 5, "w": 6, "h": 3},
        {"widget_id": "client_overview", "x": 0, "y": 6, "w": 6, "h": 4},
        {"widget_id": "recent_activity", "x": 6, "y": 8, "w": 6, "h": 4}
    ]', true),

    ('construction_contractor', 'default', '[
        {"widget_id": "kpi_summary", "x": 0, "y": 0, "w": 12, "h": 2},
        {"widget_id": "active_projects", "x": 0, "y": 2, "w": 8, "h": 4},
        {"widget_id": "quick_actions", "x": 8, "y": 2, "w": 4, "h": 2},
        {"widget_id": "material_alerts", "x": 8, "y": 4, "w": 4, "h": 3},
        {"widget_id": "crew_schedule", "x": 0, "y": 6, "w": 6, "h": 3},
        {"widget_id": "cash_flow", "x": 6, "y": 6, "w": 6, "h": 3},
        {"widget_id": "revenue_chart", "x": 0, "y": 9, "w": 6, "h": 4},
        {"widget_id": "expense_chart", "x": 6, "y": 9, "w": 6, "h": 4}
    ]', true),

    ('delivery_service', 'default', '[
        {"widget_id": "kpi_summary", "x": 0, "y": 0, "w": 12, "h": 2},
        {"widget_id": "todays_routes", "x": 0, "y": 2, "w": 8, "h": 4},
        {"widget_id": "quick_actions", "x": 8, "y": 2, "w": 4, "h": 2},
        {"widget_id": "fleet_status", "x": 8, "y": 4, "w": 4, "h": 3},
        {"widget_id": "delivery_metrics", "x": 0, "y": 6, "w": 6, "h": 4},
        {"widget_id": "revenue_chart", "x": 6, "y": 6, "w": 6, "h": 4}
    ]', true),

    ('retail_shop', 'default', '[
        {"widget_id": "kpi_summary", "x": 0, "y": 0, "w": 12, "h": 2},
        {"widget_id": "sales_today", "x": 0, "y": 2, "w": 6, "h": 4},
        {"widget_id": "inventory_alerts", "x": 6, "y": 2, "w": 6, "h": 3},
        {"widget_id": "quick_actions", "x": 6, "y": 5, "w": 6, "h": 2},
        {"widget_id": "cash_flow", "x": 0, "y": 6, "w": 8, "h": 4},
        {"widget_id": "recent_activity", "x": 8, "y": 6, "w": 4, "h": 4}
    ]', true),

    ('consultant', 'default', '[
        {"widget_id": "kpi_summary", "x": 0, "y": 0, "w": 12, "h": 2},
        {"widget_id": "client_overview", "x": 0, "y": 2, "w": 6, "h": 4},
        {"widget_id": "time_tracker", "x": 6, "y": 2, "w": 3, "h": 3},
        {"widget_id": "quick_actions", "x": 9, "y": 2, "w": 3, "h": 2},
        {"widget_id": "revenue_chart", "x": 0, "y": 6, "w": 6, "h": 4},
        {"widget_id": "outstanding_invoices", "x": 6, "y": 6, "w": 6, "h": 4}
    ]', true)
ON CONFLICT (persona_id, layout_name) DO UPDATE SET
    widgets = EXCLUDED.widgets,
    updated_at = NOW();

-- Add generic default for personas without specific layout
INSERT INTO persona_dashboard_layouts (persona_id, layout_name, widgets, is_default)
SELECT
    p.id,
    'default',
    '[
        {"widget_id": "kpi_summary", "x": 0, "y": 0, "w": 12, "h": 2},
        {"widget_id": "revenue_chart", "x": 0, "y": 2, "w": 6, "h": 4},
        {"widget_id": "expense_chart", "x": 6, "y": 2, "w": 6, "h": 4},
        {"widget_id": "outstanding_invoices", "x": 0, "y": 6, "w": 4, "h": 3},
        {"widget_id": "quick_actions", "x": 4, "y": 6, "w": 4, "h": 2},
        {"widget_id": "cash_flow", "x": 0, "y": 9, "w": 8, "h": 4},
        {"widget_id": "recent_activity", "x": 8, "y": 6, "w": 4, "h": 4}
    ]'::jsonb,
    true
FROM business_personas p
WHERE NOT EXISTS (
    SELECT 1 FROM persona_dashboard_layouts pdl
    WHERE pdl.persona_id = p.id AND pdl.layout_name = 'default'
)
ON CONFLICT (persona_id, layout_name) DO NOTHING;

-- Comments
COMMENT ON TABLE dashboard_widgets IS 'Registry of available dashboard widgets';
COMMENT ON TABLE persona_dashboard_layouts IS 'Default dashboard layouts per persona';
COMMENT ON TABLE user_dashboard_layouts IS 'User-customized dashboard layouts';
