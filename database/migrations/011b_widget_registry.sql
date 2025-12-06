-- Migration: Widget Registry (separate from existing dashboard_widgets table)
-- This table defines the available widget types

CREATE TABLE IF NOT EXISTS widget_registry (
    id VARCHAR(100) PRIMARY KEY,
    name_ro VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    description_ro TEXT,
    description_en TEXT,
    category VARCHAR(50) NOT NULL,
    component_name VARCHAR(100) NOT NULL,
    default_width INTEGER DEFAULT 6,
    default_height INTEGER DEFAULT 4,
    min_width INTEGER DEFAULT 3,
    min_height INTEGER DEFAULT 2,
    max_width INTEGER DEFAULT 12,
    max_height INTEGER DEFAULT 8,
    data_source VARCHAR(255),
    refresh_interval INTEGER DEFAULT 300,
    is_resizable BOOLEAN DEFAULT true,
    is_removable BOOLEAN DEFAULT true,
    required_feature VARCHAR(100),
    required_tier VARCHAR(50) DEFAULT 'free',
    enabled_for_personas JSONB DEFAULT '[]',
    settings_schema JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_widget_registry_category ON widget_registry(category);

-- Seed core widgets
INSERT INTO widget_registry (id, name_ro, name_en, description_ro, description_en, category, component_name, default_width, default_height, data_source, enabled_for_personas)
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
    description_en = EXCLUDED.description_en,
    category = EXCLUDED.category;

-- Seed persona-specific widgets
INSERT INTO widget_registry (id, name_ro, name_en, category, component_name, default_width, default_height, data_source, enabled_for_personas, required_tier)
VALUES
    ('active_projects', 'Proiecte Active', 'Active Projects',
     'operational', 'ActiveProjectsWidget', 6, 4, '/api/v1/projects/active',
     '["construction_contractor", "electrical_contractor", "general_trades"]', 'starter'),

    ('crew_schedule', 'Program Echipa', 'Crew Schedule',
     'operational', 'CrewScheduleWidget', 6, 3, '/api/v1/crew/schedule',
     '["construction_contractor", "electrical_contractor", "general_trades"]', 'professional'),

    ('material_alerts', 'Alerte Materiale', 'Material Alerts',
     'operational', 'MaterialAlertsWidget', 4, 3, '/api/v1/materials/alerts',
     '["construction_contractor", "general_trades"]', 'starter'),

    ('todays_routes', 'Rute Azi', 'Today''s Routes',
     'operational', 'TodaysRoutesWidget', 6, 4, '/api/v1/routes/today',
     '["delivery_service", "courier_freelancer"]', 'starter'),

    ('fleet_status', 'Status Flota', 'Fleet Status',
     'operational', 'FleetStatusWidget', 6, 3, '/api/v1/fleet/status',
     '["delivery_service"]', 'professional'),

    ('delivery_metrics', 'Metrici Livrari', 'Delivery Metrics',
     'analytics', 'DeliveryMetricsWidget', 6, 4, '/api/v1/analytics/deliveries',
     '["delivery_service", "courier_freelancer"]', 'starter'),

    ('inventory_alerts', 'Alerte Stoc', 'Inventory Alerts',
     'operational', 'InventoryAlertsWidget', 4, 3, '/api/v1/inventory/alerts',
     '["retail_shop", "ecommerce_seller"]', 'starter'),

    ('sales_today', 'Vanzari Azi', 'Today''s Sales',
     'financial', 'TodaySalesWidget', 6, 4, '/api/v1/sales/today',
     '["retail_shop", "ecommerce_seller"]', 'free'),

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

-- Comment
COMMENT ON TABLE widget_registry IS 'Registry of available dashboard widget types';
