-- Sprint 3: Dashboard Widgets & Navigation Seed
-- Persona-specific default dashboard layouts and navigation

-- ============================================
-- ADD MISSING WIDGETS TO REGISTRY (if not exists)
-- ============================================
INSERT INTO widget_registry (id, name_ro, name_en, description_ro, description_en, category, component_name, default_width, default_height, enabled_for_personas) VALUES
('kpi_summary', 'Sumar KPI', 'KPI Summary', 'Indicatori principali de performanta', 'Key performance indicators', 'financial', 'KPISummaryWidget', 12, 2, '[]'),
('recent_activity', 'Activitate Recenta', 'Recent Activity', 'Ultimele actiuni in platforma', 'Latest platform actions', 'operational', 'RecentActivityWidget', 6, 2, '[]'),
('todays_deliveries', 'Livrari Azi', 'Today''s Deliveries', 'Lista livrarilor programate azi', 'Today''s scheduled deliveries', 'vertical', 'TodaysDeliveriesWidget', 6, 4, '["delivery"]'),
('fleet_status', 'Status Flota', 'Fleet Status', 'Starea vehiculelor din flota', 'Fleet vehicle status', 'vertical', 'FleetStatusWidget', 6, 4, '["delivery", "transport"]'),
('active_projects', 'Proiecte Active', 'Active Projects', 'Lista proiectelor in desfasurare', 'Ongoing projects list', 'vertical', 'ActiveProjectsWidget', 6, 4, '["construction", "services"]'),
('crew_schedule', 'Program Echipa', 'Crew Schedule', 'Programul echipei pentru azi', 'Today''s crew schedule', 'vertical', 'CrewScheduleWidget', 6, 3, '["construction"]'),
('todays_appointments', 'Programari Azi', 'Today''s Appointments', 'Programarile din ziua curenta', 'Today''s scheduled appointments', 'vertical', 'TodaysAppointmentsWidget', 6, 4, '["medical", "beauty", "services"]'),
('patient_stats', 'Statistici Pacienti', 'Patient Stats', 'Statistici despre pacienti', 'Patient statistics', 'vertical', 'PatientStatsWidget', 6, 3, '["medical"]'),
('client_stats', 'Statistici Clienti', 'Client Stats', 'Statistici despre clienti', 'Client statistics', 'vertical', 'ClientStatsWidget', 6, 4, '["beauty", "services"]'),
('todays_reservations', 'Rezervari Azi', 'Today''s Reservations', 'Rezervarile din ziua curenta', 'Today''s reservations', 'vertical', 'TodaysReservationsWidget', 6, 4, '["horeca"]'),
('low_stock_alerts', 'Alerte Stoc Scazut', 'Low Stock Alerts', 'Produse cu stoc sub minim', 'Products below minimum stock', 'vertical', 'LowStockAlertsWidget', 6, 3, '["retail", "horeca", "ecommerce"]'),
('top_products', 'Top Produse', 'Top Products', 'Cele mai vandute produse', 'Best selling products', 'vertical', 'TopProductsWidget', 6, 3, '["retail", "ecommerce"]'),
('active_routes', 'Rute Active', 'Active Routes', 'Rutele in desfasurare', 'Ongoing routes', 'vertical', 'ActiveRoutesWidget', 6, 4, '["transport"]'),
('fuel_consumption', 'Consum Combustibil', 'Fuel Consumption', 'Grafic consum combustibil', 'Fuel consumption chart', 'vertical', 'FuelConsumptionWidget', 6, 4, '["transport", "delivery"]'),
('orders_status', 'Status Comenzi', 'Orders Status', 'Comenzi pe statusuri', 'Orders by status', 'vertical', 'OrdersStatusWidget', 6, 4, '["ecommerce", "retail"]'),
('service_calls_today', 'Interventii Azi', 'Service Calls Today', 'Interventiile programate azi', 'Today''s scheduled service calls', 'vertical', 'ServiceCallsTodayWidget', 6, 4, '["electrical"]'),
('weather_forecast', 'Prognoza Meteo', 'Weather Forecast', 'Vremea pentru urmatoarele zile', 'Weather for upcoming days', 'vertical', 'WeatherForecastWidget', 4, 4, '["agriculture"]'),
('crop_status', 'Status Culturi', 'Crop Status', 'Starea culturilor agricole', 'Agricultural crop status', 'vertical', 'CropStatusWidget', 8, 4, '["agriculture"]')
ON CONFLICT (id) DO UPDATE SET
    enabled_for_personas = EXCLUDED.enabled_for_personas,
    name_ro = EXCLUDED.name_ro,
    name_en = EXCLUDED.name_en;

-- ============================================
-- PERSONA DASHBOARD WIDGETS
-- Using correct schema: widget_type, grid_position JSONB
-- ============================================

-- Clear existing persona widgets
DELETE FROM persona_dashboard_widgets;

-- FREELANCER Dashboard (Simple, focused on invoicing and time)
INSERT INTO persona_dashboard_widgets (persona_id, widget_type, title_ro, title_en, grid_position, display_order, data_source) VALUES
('freelancer', 'kpi_summary', 'Sumar KPI', 'KPI Summary', '{"x": 0, "y": 0, "w": 12, "h": 2}', 1, '/api/v1/dashboard/kpi.php'),
('freelancer', 'revenue_chart', 'Venituri', 'Revenue', '{"x": 0, "y": 2, "w": 6, "h": 4}', 2, '/api/v1/dashboard/revenue.php'),
('freelancer', 'outstanding_invoices', 'Facturi Restante', 'Outstanding Invoices', '{"x": 6, "y": 2, "w": 6, "h": 4}', 3, '/api/v1/invoices/outstanding.php'),
('freelancer', 'quick_actions', 'Actiuni Rapide', 'Quick Actions', '{"x": 0, "y": 6, "w": 4, "h": 2}', 4, NULL),
('freelancer', 'recent_activity', 'Activitate Recenta', 'Recent Activity', '{"x": 4, "y": 6, "w": 8, "h": 2}', 5, '/api/v1/dashboard/activity.php');

-- RETAIL Dashboard (Inventory and sales focused)
INSERT INTO persona_dashboard_widgets (persona_id, widget_type, title_ro, title_en, grid_position, display_order, data_source) VALUES
('retail', 'kpi_summary', 'Sumar KPI', 'KPI Summary', '{"x": 0, "y": 0, "w": 12, "h": 2}', 1, '/api/v1/dashboard/kpi.php'),
('retail', 'revenue_chart', 'Venituri', 'Revenue', '{"x": 0, "y": 2, "w": 6, "h": 4}', 2, '/api/v1/dashboard/revenue.php'),
('retail', 'expense_chart', 'Cheltuieli', 'Expenses', '{"x": 6, "y": 2, "w": 6, "h": 4}', 3, '/api/v1/dashboard/expenses.php'),
('retail', 'low_stock_alerts', 'Alerte Stoc', 'Low Stock', '{"x": 0, "y": 6, "w": 6, "h": 3}', 4, '/api/v1/inventory/low-stock.php'),
('retail', 'top_products', 'Top Produse', 'Top Products', '{"x": 6, "y": 6, "w": 6, "h": 3}', 5, '/api/v1/inventory/top-products.php'),
('retail', 'quick_actions', 'Actiuni Rapide', 'Quick Actions', '{"x": 0, "y": 9, "w": 4, "h": 2}', 6, NULL);

-- DELIVERY Dashboard (Routes and fleet focused)
INSERT INTO persona_dashboard_widgets (persona_id, widget_type, title_ro, title_en, grid_position, display_order, data_source) VALUES
('delivery', 'kpi_summary', 'Sumar KPI', 'KPI Summary', '{"x": 0, "y": 0, "w": 12, "h": 2}', 1, '/api/v1/dashboard/kpi.php'),
('delivery', 'todays_deliveries', 'Livrari Azi', 'Today''s Deliveries', '{"x": 0, "y": 2, "w": 6, "h": 4}', 2, '/api/v1/fleet/deliveries-today.php'),
('delivery', 'fleet_status', 'Status Flota', 'Fleet Status', '{"x": 6, "y": 2, "w": 6, "h": 4}', 3, '/api/v1/fleet/status.php'),
('delivery', 'revenue_chart', 'Venituri', 'Revenue', '{"x": 0, "y": 6, "w": 8, "h": 4}', 4, '/api/v1/dashboard/revenue.php'),
('delivery', 'quick_actions', 'Actiuni Rapide', 'Quick Actions', '{"x": 8, "y": 6, "w": 4, "h": 2}', 5, NULL);

-- CONSTRUCTION Dashboard (Projects and crew focused)
INSERT INTO persona_dashboard_widgets (persona_id, widget_type, title_ro, title_en, grid_position, display_order, data_source) VALUES
('construction', 'kpi_summary', 'Sumar KPI', 'KPI Summary', '{"x": 0, "y": 0, "w": 12, "h": 2}', 1, '/api/v1/dashboard/kpi.php'),
('construction', 'active_projects', 'Proiecte Active', 'Active Projects', '{"x": 0, "y": 2, "w": 6, "h": 4}', 2, '/api/v1/projects/active.php'),
('construction', 'cash_flow', 'Flux Numerar', 'Cash Flow', '{"x": 6, "y": 2, "w": 6, "h": 4}', 3, '/api/v1/dashboard/cashflow.php'),
('construction', 'outstanding_invoices', 'Facturi Restante', 'Outstanding Invoices', '{"x": 0, "y": 6, "w": 6, "h": 3}', 4, '/api/v1/invoices/outstanding.php'),
('construction', 'crew_schedule', 'Program Echipa', 'Crew Schedule', '{"x": 6, "y": 6, "w": 6, "h": 3}', 5, '/api/v1/hr/schedule-today.php'),
('construction', 'quick_actions', 'Actiuni Rapide', 'Quick Actions', '{"x": 0, "y": 9, "w": 4, "h": 2}', 6, NULL);

-- MEDICAL Dashboard (Appointments and patients)
INSERT INTO persona_dashboard_widgets (persona_id, widget_type, title_ro, title_en, grid_position, display_order, data_source) VALUES
('medical', 'kpi_summary', 'Sumar KPI', 'KPI Summary', '{"x": 0, "y": 0, "w": 12, "h": 2}', 1, '/api/v1/dashboard/kpi.php'),
('medical', 'todays_appointments', 'Programari Azi', 'Today''s Appointments', '{"x": 0, "y": 2, "w": 6, "h": 4}', 2, '/api/v1/appointments/today.php'),
('medical', 'revenue_chart', 'Venituri', 'Revenue', '{"x": 6, "y": 2, "w": 6, "h": 4}', 3, '/api/v1/dashboard/revenue.php'),
('medical', 'patient_stats', 'Statistici Pacienti', 'Patient Stats', '{"x": 0, "y": 6, "w": 6, "h": 3}', 4, '/api/v1/patients/stats.php'),
('medical', 'outstanding_invoices', 'Facturi Restante', 'Outstanding Invoices', '{"x": 6, "y": 6, "w": 6, "h": 3}', 5, '/api/v1/invoices/outstanding.php'),
('medical', 'quick_actions', 'Actiuni Rapide', 'Quick Actions', '{"x": 0, "y": 9, "w": 4, "h": 2}', 6, NULL);

-- HORECA Dashboard (Reservations and orders)
INSERT INTO persona_dashboard_widgets (persona_id, widget_type, title_ro, title_en, grid_position, display_order, data_source) VALUES
('horeca', 'kpi_summary', 'Sumar KPI', 'KPI Summary', '{"x": 0, "y": 0, "w": 12, "h": 2}', 1, '/api/v1/dashboard/kpi.php'),
('horeca', 'todays_reservations', 'Rezervari Azi', 'Today''s Reservations', '{"x": 0, "y": 2, "w": 6, "h": 4}', 2, '/api/v1/reservations/today.php'),
('horeca', 'revenue_chart', 'Venituri', 'Revenue', '{"x": 6, "y": 2, "w": 6, "h": 4}', 3, '/api/v1/dashboard/revenue.php'),
('horeca', 'expense_chart', 'Cheltuieli', 'Expenses', '{"x": 0, "y": 6, "w": 6, "h": 4}', 4, '/api/v1/dashboard/expenses.php'),
('horeca', 'low_stock_alerts', 'Alerte Stoc', 'Low Stock', '{"x": 6, "y": 6, "w": 6, "h": 4}', 5, '/api/v1/inventory/low-stock.php'),
('horeca', 'quick_actions', 'Actiuni Rapide', 'Quick Actions', '{"x": 0, "y": 10, "w": 4, "h": 2}', 6, NULL);

-- SERVICES Dashboard (Appointments and clients)
INSERT INTO persona_dashboard_widgets (persona_id, widget_type, title_ro, title_en, grid_position, display_order, data_source) VALUES
('services', 'kpi_summary', 'Sumar KPI', 'KPI Summary', '{"x": 0, "y": 0, "w": 12, "h": 2}', 1, '/api/v1/dashboard/kpi.php'),
('services', 'todays_appointments', 'Programari Azi', 'Today''s Appointments', '{"x": 0, "y": 2, "w": 6, "h": 4}', 2, '/api/v1/appointments/today.php'),
('services', 'outstanding_invoices', 'Facturi Restante', 'Outstanding Invoices', '{"x": 6, "y": 2, "w": 6, "h": 4}', 3, '/api/v1/invoices/outstanding.php'),
('services', 'revenue_chart', 'Venituri', 'Revenue', '{"x": 0, "y": 6, "w": 8, "h": 4}', 4, '/api/v1/dashboard/revenue.php'),
('services', 'quick_actions', 'Actiuni Rapide', 'Quick Actions', '{"x": 8, "y": 6, "w": 4, "h": 2}', 5, NULL);

-- BEAUTY Dashboard (Appointments focused)
INSERT INTO persona_dashboard_widgets (persona_id, widget_type, title_ro, title_en, grid_position, display_order, data_source) VALUES
('beauty', 'kpi_summary', 'Sumar KPI', 'KPI Summary', '{"x": 0, "y": 0, "w": 12, "h": 2}', 1, '/api/v1/dashboard/kpi.php'),
('beauty', 'todays_appointments', 'Programari Azi', 'Today''s Appointments', '{"x": 0, "y": 2, "w": 6, "h": 4}', 2, '/api/v1/appointments/today.php'),
('beauty', 'client_stats', 'Statistici Clienti', 'Client Stats', '{"x": 6, "y": 2, "w": 6, "h": 4}', 3, '/api/v1/crm/client-stats.php'),
('beauty', 'revenue_chart', 'Venituri', 'Revenue', '{"x": 0, "y": 6, "w": 8, "h": 4}', 4, '/api/v1/dashboard/revenue.php'),
('beauty', 'quick_actions', 'Actiuni Rapide', 'Quick Actions', '{"x": 8, "y": 6, "w": 4, "h": 2}', 5, NULL);

-- TRANSPORT Dashboard (Fleet and routes)
INSERT INTO persona_dashboard_widgets (persona_id, widget_type, title_ro, title_en, grid_position, display_order, data_source) VALUES
('transport', 'kpi_summary', 'Sumar KPI', 'KPI Summary', '{"x": 0, "y": 0, "w": 12, "h": 2}', 1, '/api/v1/dashboard/kpi.php'),
('transport', 'fleet_status', 'Status Flota', 'Fleet Status', '{"x": 0, "y": 2, "w": 6, "h": 4}', 2, '/api/v1/fleet/status.php'),
('transport', 'active_routes', 'Rute Active', 'Active Routes', '{"x": 6, "y": 2, "w": 6, "h": 4}', 3, '/api/v1/fleet/routes-active.php'),
('transport', 'fuel_consumption', 'Consum Combustibil', 'Fuel Consumption', '{"x": 0, "y": 6, "w": 6, "h": 4}', 4, '/api/v1/fleet/fuel.php'),
('transport', 'revenue_chart', 'Venituri', 'Revenue', '{"x": 6, "y": 6, "w": 6, "h": 4}', 5, '/api/v1/dashboard/revenue.php'),
('transport', 'quick_actions', 'Actiuni Rapide', 'Quick Actions', '{"x": 0, "y": 10, "w": 4, "h": 2}', 6, NULL);

-- ECOMMERCE Dashboard (Orders and inventory)
INSERT INTO persona_dashboard_widgets (persona_id, widget_type, title_ro, title_en, grid_position, display_order, data_source) VALUES
('ecommerce', 'kpi_summary', 'Sumar KPI', 'KPI Summary', '{"x": 0, "y": 0, "w": 12, "h": 2}', 1, '/api/v1/dashboard/kpi.php'),
('ecommerce', 'revenue_chart', 'Venituri', 'Revenue', '{"x": 0, "y": 2, "w": 6, "h": 4}', 2, '/api/v1/dashboard/revenue.php'),
('ecommerce', 'orders_status', 'Status Comenzi', 'Orders Status', '{"x": 6, "y": 2, "w": 6, "h": 4}', 3, '/api/v1/orders/status.php'),
('ecommerce', 'top_products', 'Top Produse', 'Top Products', '{"x": 0, "y": 6, "w": 6, "h": 3}', 4, '/api/v1/inventory/top-products.php'),
('ecommerce', 'low_stock_alerts', 'Alerte Stoc', 'Low Stock', '{"x": 6, "y": 6, "w": 6, "h": 3}', 5, '/api/v1/inventory/low-stock.php'),
('ecommerce', 'quick_actions', 'Actiuni Rapide', 'Quick Actions', '{"x": 0, "y": 9, "w": 4, "h": 2}', 6, NULL);

-- ELECTRICAL Dashboard (Service calls and permits)
INSERT INTO persona_dashboard_widgets (persona_id, widget_type, title_ro, title_en, grid_position, display_order, data_source) VALUES
('electrical', 'kpi_summary', 'Sumar KPI', 'KPI Summary', '{"x": 0, "y": 0, "w": 12, "h": 2}', 1, '/api/v1/dashboard/kpi.php'),
('electrical', 'service_calls_today', 'Interventii Azi', 'Service Calls Today', '{"x": 0, "y": 2, "w": 6, "h": 4}', 2, '/api/v1/service-calls/today.php'),
('electrical', 'outstanding_invoices', 'Facturi Restante', 'Outstanding Invoices', '{"x": 6, "y": 2, "w": 6, "h": 4}', 3, '/api/v1/invoices/outstanding.php'),
('electrical', 'revenue_chart', 'Venituri', 'Revenue', '{"x": 0, "y": 6, "w": 8, "h": 4}', 4, '/api/v1/dashboard/revenue.php'),
('electrical', 'quick_actions', 'Actiuni Rapide', 'Quick Actions', '{"x": 8, "y": 6, "w": 4, "h": 2}', 5, NULL);

-- AGRICULTURE Dashboard (Crops and weather)
INSERT INTO persona_dashboard_widgets (persona_id, widget_type, title_ro, title_en, grid_position, display_order, data_source) VALUES
('agriculture', 'kpi_summary', 'Sumar KPI', 'KPI Summary', '{"x": 0, "y": 0, "w": 12, "h": 2}', 1, '/api/v1/dashboard/kpi.php'),
('agriculture', 'weather_forecast', 'Prognoza Meteo', 'Weather Forecast', '{"x": 0, "y": 2, "w": 4, "h": 4}', 2, '/api/v1/weather/forecast.php'),
('agriculture', 'crop_status', 'Status Culturi', 'Crop Status', '{"x": 4, "y": 2, "w": 8, "h": 4}', 3, '/api/v1/agriculture/crops.php'),
('agriculture', 'revenue_chart', 'Venituri', 'Revenue', '{"x": 0, "y": 6, "w": 6, "h": 4}', 4, '/api/v1/dashboard/revenue.php'),
('agriculture', 'expense_chart', 'Cheltuieli', 'Expenses', '{"x": 6, "y": 6, "w": 6, "h": 4}', 5, '/api/v1/dashboard/expenses.php'),
('agriculture', 'quick_actions', 'Actiuni Rapide', 'Quick Actions', '{"x": 0, "y": 10, "w": 4, "h": 2}', 6, NULL);

-- ============================================
-- PERSONA NAVIGATION LAYOUTS
-- Using correct schema: items as JSONB array
-- ============================================

-- Clear existing layouts
DELETE FROM persona_navigation_layouts;

-- FREELANCER Navigation Layout
INSERT INTO persona_navigation_layouts (persona_id, items) VALUES
('freelancer', '[
    {"id": "dashboard", "visible": true, "order": 1},
    {"id": "invoicing", "visible": true, "order": 2, "children": ["invoices_list", "invoices_new", "recurring", "efactura"]},
    {"id": "expenses", "visible": true, "order": 3, "children": ["expenses_list", "bills", "receipts"]},
    {"id": "contacts", "visible": true, "order": 4},
    {"id": "projects", "visible": true, "order": 5, "children": ["projects_list", "time_tracking", "sprints"]},
    {"id": "reports", "visible": true, "order": 6, "children": ["profit_loss", "cash_flow", "fiscal_calendar"]},
    {"id": "settings", "visible": true, "order": 99, "children": ["company_settings", "categories", "subscription", "features_page"]}
]');

-- RETAIL Navigation Layout
INSERT INTO persona_navigation_layouts (persona_id, items) VALUES
('retail', '[
    {"id": "dashboard", "visible": true, "order": 1},
    {"id": "invoicing", "visible": true, "order": 2, "children": ["invoices_list", "invoices_new", "recurring", "efactura"]},
    {"id": "expenses", "visible": true, "order": 3, "children": ["expenses_list", "bills", "receipts"]},
    {"id": "contacts", "visible": true, "order": 4},
    {"id": "inventory", "visible": true, "order": 5, "children": ["products", "stock_levels", "warehouses", "movements"]},
    {"id": "reports", "visible": true, "order": 6, "children": ["profit_loss", "cash_flow", "fiscal_calendar"]},
    {"id": "settings", "visible": true, "order": 99, "children": ["company_settings", "categories", "subscription", "features_page"]}
]');

-- DELIVERY Navigation Layout
INSERT INTO persona_navigation_layouts (persona_id, items) VALUES
('delivery', '[
    {"id": "dashboard", "visible": true, "order": 1},
    {"id": "fleet", "visible": true, "order": 2, "children": ["vehicles", "routes", "drivers"]},
    {"id": "invoicing", "visible": true, "order": 3, "children": ["invoices_list", "invoices_new", "recurring", "efactura"]},
    {"id": "expenses", "visible": true, "order": 4, "children": ["expenses_list", "bills", "receipts"]},
    {"id": "contacts", "visible": true, "order": 5},
    {"id": "reports", "visible": true, "order": 6, "children": ["profit_loss", "cash_flow", "fiscal_calendar"]},
    {"id": "settings", "visible": true, "order": 99, "children": ["company_settings", "categories", "subscription", "features_page"]}
]');

-- BEAUTY Navigation Layout
INSERT INTO persona_navigation_layouts (persona_id, items) VALUES
('beauty', '[
    {"id": "dashboard", "visible": true, "order": 1},
    {"id": "appointments", "visible": true, "order": 2},
    {"id": "invoicing", "visible": true, "order": 3, "children": ["invoices_list", "invoices_new", "recurring", "efactura"]},
    {"id": "expenses", "visible": true, "order": 4, "children": ["expenses_list", "bills", "receipts"]},
    {"id": "contacts", "visible": true, "order": 5},
    {"id": "reports", "visible": true, "order": 6, "children": ["profit_loss", "cash_flow", "fiscal_calendar"]},
    {"id": "settings", "visible": true, "order": 99, "children": ["company_settings", "categories", "subscription", "features_page"]}
]');

-- SERVICES Navigation Layout
INSERT INTO persona_navigation_layouts (persona_id, items) VALUES
('services', '[
    {"id": "dashboard", "visible": true, "order": 1},
    {"id": "appointments", "visible": true, "order": 2},
    {"id": "projects", "visible": true, "order": 3, "children": ["projects_list", "time_tracking", "sprints"]},
    {"id": "invoicing", "visible": true, "order": 4, "children": ["invoices_list", "invoices_new", "recurring", "efactura"]},
    {"id": "expenses", "visible": true, "order": 5, "children": ["expenses_list", "bills", "receipts"]},
    {"id": "contacts", "visible": true, "order": 6},
    {"id": "reports", "visible": true, "order": 7, "children": ["profit_loss", "cash_flow", "fiscal_calendar"]},
    {"id": "settings", "visible": true, "order": 99, "children": ["company_settings", "categories", "subscription", "features_page"]}
]');

-- HORECA Navigation Layout
INSERT INTO persona_navigation_layouts (persona_id, items) VALUES
('horeca', '[
    {"id": "dashboard", "visible": true, "order": 1},
    {"id": "inventory", "visible": true, "order": 2, "children": ["products", "stock_levels", "movements"]},
    {"id": "invoicing", "visible": true, "order": 3, "children": ["invoices_list", "invoices_new", "recurring", "efactura"]},
    {"id": "expenses", "visible": true, "order": 4, "children": ["expenses_list", "bills", "receipts"]},
    {"id": "contacts", "visible": true, "order": 5},
    {"id": "reports", "visible": true, "order": 6, "children": ["profit_loss", "cash_flow", "fiscal_calendar"]},
    {"id": "settings", "visible": true, "order": 99, "children": ["company_settings", "categories", "subscription", "features_page"]}
]');

-- CONSTRUCTION Navigation Layout
INSERT INTO persona_navigation_layouts (persona_id, items) VALUES
('construction', '[
    {"id": "dashboard", "visible": true, "order": 1},
    {"id": "projects", "visible": true, "order": 2, "children": ["projects_list", "time_tracking"]},
    {"id": "invoicing", "visible": true, "order": 3, "children": ["invoices_list", "invoices_new", "recurring", "efactura"]},
    {"id": "expenses", "visible": true, "order": 4, "children": ["expenses_list", "bills", "receipts"]},
    {"id": "contacts", "visible": true, "order": 5},
    {"id": "reports", "visible": true, "order": 6, "children": ["profit_loss", "cash_flow", "fiscal_calendar"]},
    {"id": "settings", "visible": true, "order": 99, "children": ["company_settings", "categories", "subscription", "features_page"]}
]');

-- ELECTRICAL Navigation Layout
INSERT INTO persona_navigation_layouts (persona_id, items) VALUES
('electrical', '[
    {"id": "dashboard", "visible": true, "order": 1},
    {"id": "projects", "visible": true, "order": 2, "children": ["projects_list", "time_tracking"]},
    {"id": "invoicing", "visible": true, "order": 3, "children": ["invoices_list", "invoices_new", "recurring", "efactura"]},
    {"id": "expenses", "visible": true, "order": 4, "children": ["expenses_list", "bills", "receipts"]},
    {"id": "contacts", "visible": true, "order": 5},
    {"id": "reports", "visible": true, "order": 6, "children": ["profit_loss", "cash_flow", "fiscal_calendar"]},
    {"id": "settings", "visible": true, "order": 99, "children": ["company_settings", "categories", "subscription", "features_page"]}
]');

-- MEDICAL Navigation Layout
INSERT INTO persona_navigation_layouts (persona_id, items) VALUES
('medical', '[
    {"id": "dashboard", "visible": true, "order": 1},
    {"id": "appointments", "visible": true, "order": 2},
    {"id": "invoicing", "visible": true, "order": 3, "children": ["invoices_list", "invoices_new", "recurring", "efactura"]},
    {"id": "expenses", "visible": true, "order": 4, "children": ["expenses_list", "bills", "receipts"]},
    {"id": "contacts", "visible": true, "order": 5},
    {"id": "reports", "visible": true, "order": 6, "children": ["profit_loss", "cash_flow", "fiscal_calendar"]},
    {"id": "settings", "visible": true, "order": 99, "children": ["company_settings", "categories", "subscription", "features_page"]}
]');

-- ECOMMERCE Navigation Layout
INSERT INTO persona_navigation_layouts (persona_id, items) VALUES
('ecommerce', '[
    {"id": "dashboard", "visible": true, "order": 1},
    {"id": "inventory", "visible": true, "order": 2, "children": ["products", "stock_levels", "warehouses", "movements"]},
    {"id": "invoicing", "visible": true, "order": 3, "children": ["invoices_list", "invoices_new", "recurring", "efactura"]},
    {"id": "expenses", "visible": true, "order": 4, "children": ["expenses_list", "bills", "receipts"]},
    {"id": "contacts", "visible": true, "order": 5},
    {"id": "reports", "visible": true, "order": 6, "children": ["profit_loss", "cash_flow", "fiscal_calendar"]},
    {"id": "settings", "visible": true, "order": 99, "children": ["company_settings", "categories", "subscription", "features_page"]}
]');

-- TRANSPORT Navigation Layout
INSERT INTO persona_navigation_layouts (persona_id, items) VALUES
('transport', '[
    {"id": "dashboard", "visible": true, "order": 1},
    {"id": "fleet", "visible": true, "order": 2, "children": ["vehicles", "routes", "drivers"]},
    {"id": "invoicing", "visible": true, "order": 3, "children": ["invoices_list", "invoices_new", "recurring", "efactura"]},
    {"id": "expenses", "visible": true, "order": 4, "children": ["expenses_list", "bills", "receipts"]},
    {"id": "contacts", "visible": true, "order": 5},
    {"id": "reports", "visible": true, "order": 6, "children": ["profit_loss", "cash_flow", "fiscal_calendar"]},
    {"id": "settings", "visible": true, "order": 99, "children": ["company_settings", "categories", "subscription", "features_page"]}
]');

-- AGRICULTURE Navigation Layout
INSERT INTO persona_navigation_layouts (persona_id, items) VALUES
('agriculture', '[
    {"id": "dashboard", "visible": true, "order": 1},
    {"id": "agriculture_section", "visible": true, "order": 2},
    {"id": "invoicing", "visible": true, "order": 3, "children": ["invoices_list", "invoices_new", "recurring", "efactura"]},
    {"id": "expenses", "visible": true, "order": 4, "children": ["expenses_list", "bills", "receipts"]},
    {"id": "contacts", "visible": true, "order": 5},
    {"id": "reports", "visible": true, "order": 6, "children": ["profit_loss", "cash_flow", "fiscal_calendar"]},
    {"id": "settings", "visible": true, "order": 99, "children": ["company_settings", "categories", "subscription", "features_page"]}
]');

SELECT 'Dashboard widgets and navigation layouts seeded successfully!' as result;
