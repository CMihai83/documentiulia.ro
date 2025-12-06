-- =====================================================
-- SEED DATA: Business Personas
-- Sprint 1 - E1-US01
-- Date: 2025-11-29
-- =====================================================

-- Clear existing data (for re-seeding)
TRUNCATE business_personas CASCADE;

-- =====================================================
-- INSERT: 12 Business Personas
-- =====================================================

INSERT INTO business_personas (id, name_ro, name_en, description_ro, description_en, icon, color, category, default_features, dashboard_layout, navigation_config, quiz_keywords, recommended_tier, display_order) VALUES

-- 1. FREELANCER / PFA
('freelancer',
 'Freelancer / PFA',
 'Freelancer / Sole Trader',
 'Pentru profesioniști independenți: consultanți, programatori, designeri, traducători, contabili independenți',
 'For independent professionals: consultants, developers, designers, translators, independent accountants',
 'user', '#8B5CF6', 'services',
 '["invoicing", "time_tracking", "expenses", "tax_helper", "contracts"]',
 '{"widgets": ["revenue_monthly", "invoices_outstanding", "time_this_week", "tax_deadlines"]}',
 '{"primary": ["dashboard", "invoices", "expenses", "time", "reports"], "secondary": ["contacts", "contracts", "settings"]}',
 '["singur", "pfa", "consultant", "freelance", "independent", "programator", "designer"]',
 'starter', 1),

-- 2. SMALL RETAIL
('retail',
 'Magazin / Comerț',
 'Retail / Shop',
 'Pentru magazine mici, buticuri, chioșcuri - gestionare stocuri, vânzări, furnizori',
 'For small shops, boutiques, kiosks - inventory management, sales, suppliers',
 'shopping-bag', '#EC4899', 'retail',
 '["invoicing", "inventory", "pos", "suppliers", "sales_reports"]',
 '{"widgets": ["sales_today", "low_stock_alerts", "revenue_chart", "top_products"]}',
 '{"primary": ["dashboard", "sales", "inventory", "invoices", "suppliers"], "secondary": ["reports", "settings"]}',
 '["magazin", "vanzari", "stocuri", "produse", "butic", "comert"]',
 'growth', 2),

-- 3. DELIVERY / LOGISTICS
('delivery',
 'Curierat / Livrări',
 'Delivery / Logistics',
 'Pentru firme de curierat, livrări locale, distribuție - rute, șoferi, pachete',
 'For courier companies, local delivery, distribution - routes, drivers, packages',
 'truck', '#F59E0B', 'logistics',
 '["invoicing", "routes", "drivers", "fleet", "tracking", "delivery_proof"]',
 '{"widgets": ["deliveries_today", "drivers_active", "route_efficiency", "revenue_per_route"]}',
 '{"primary": ["dashboard", "routes", "drivers", "fleet", "packages"], "secondary": ["invoices", "reports", "settings"]}',
 '["curier", "livrare", "transport", "sofer", "pachete", "rute"]',
 'growth', 3),

-- 4. BEAUTY & WELLNESS
('beauty',
 'Salon / Beauty',
 'Beauty & Wellness',
 'Pentru saloane de înfrumusețare, frizerii, spa, masaj - programări, clienți, servicii',
 'For beauty salons, barbershops, spas, massage - appointments, clients, services',
 'scissors', '#F472B6', 'services',
 '["invoicing", "appointments", "clients", "services", "loyalty"]',
 '{"widgets": ["appointments_today", "revenue_monthly", "top_clients", "upcoming_appointments"]}',
 '{"primary": ["dashboard", "calendar", "clients", "services", "invoices"], "secondary": ["reports", "settings"]}',
 '["salon", "coafor", "manichiura", "cosmetica", "programari", "beauty"]',
 'starter', 4),

-- 5. PROFESSIONAL SERVICES
('services',
 'Servicii Profesionale',
 'Professional Services',
 'Pentru avocați, notari, arhitecți, ingineri - proiecte, clienți, ore facturabile',
 'For lawyers, notaries, architects, engineers - projects, clients, billable hours',
 'briefcase', '#6366F1', 'services',
 '["invoicing", "time_tracking", "projects", "contracts", "clients"]',
 '{"widgets": ["billable_hours", "project_status", "invoices_outstanding", "revenue_by_client"]}',
 '{"primary": ["dashboard", "projects", "time", "invoices", "clients"], "secondary": ["contracts", "reports", "settings"]}',
 '["avocat", "notar", "arhitect", "inginer", "proiecte", "consultatii"]',
 'growth', 5),

-- 6. HORECA (Hotels, Restaurants, Cafes)
('horeca',
 'Restaurant / Cafe / Hotel',
 'HoReCa',
 'Pentru restaurante, cafenele, pensiuni, hoteluri - rezervări, meniuri, stocuri alimentare',
 'For restaurants, cafes, guesthouses, hotels - reservations, menus, food inventory',
 'utensils', '#EF4444', 'hospitality',
 '["invoicing", "reservations", "inventory", "menu", "suppliers", "staff_scheduling"]',
 '{"widgets": ["reservations_today", "revenue_daily", "inventory_alerts", "top_items"]}',
 '{"primary": ["dashboard", "reservations", "menu", "inventory", "invoices"], "secondary": ["staff", "reports", "settings"]}',
 '["restaurant", "cafenea", "hotel", "pensiune", "rezervari", "mancare"]',
 'growth', 6),

-- 7. CONSTRUCTION
('construction',
 'Construcții / Renovări',
 'Construction / Renovations',
 'Pentru echipe de construcții, renovări, finisaje - devize, proiecte, materiale, echipe',
 'For construction teams, renovations, finishing - estimates, projects, materials, crews',
 'hard-hat', '#78716C', 'construction',
 '["invoicing", "estimates", "projects", "materials", "crew", "permits"]',
 '{"widgets": ["active_projects", "estimates_pending", "materials_cost", "crew_schedule"]}',
 '{"primary": ["dashboard", "estimates", "projects", "materials", "crew"], "secondary": ["invoices", "reports", "settings"]}',
 '["constructii", "renovare", "santier", "deviz", "materiale", "muncitori"]',
 'growth', 7),

-- 8. ELECTRICAL / INSTALLATIONS
('electrical',
 'Electrician / Instalații',
 'Electrical / Installations',
 'Pentru electricieni, instalatori, climatizare - intervenții, piese, certificate ANRE',
 'For electricians, plumbers, HVAC - service calls, parts, ANRE certifications',
 'zap', '#FBBF24', 'construction',
 '["invoicing", "service_calls", "parts_inventory", "certifications", "dispatch"]',
 '{"widgets": ["calls_today", "parts_low", "certifications_expiring", "revenue_weekly"]}',
 '{"primary": ["dashboard", "service_calls", "inventory", "invoices"], "secondary": ["certifications", "reports", "settings"]}',
 '["electrician", "instalator", "anre", "interventii", "piese", "service"]',
 'growth', 8),

-- 9. MEDICAL / DENTAL
('medical',
 'Cabinet Medical / Stomatologic',
 'Medical / Dental Practice',
 'Pentru cabinete medicale, stomatologice, veterinare - pacienți, programări, fișe medicale',
 'For medical, dental, veterinary practices - patients, appointments, medical records',
 'stethoscope', '#10B981', 'medical',
 '["invoicing", "appointments", "patients", "medical_records", "prescriptions"]',
 '{"widgets": ["appointments_today", "patients_new", "revenue_monthly", "upcoming_schedule"]}',
 '{"primary": ["dashboard", "calendar", "patients", "invoices"], "secondary": ["records", "reports", "settings"]}',
 '["medic", "dentist", "cabinet", "pacienti", "programari", "stomatolog"]',
 'professional', 9),

-- 10. E-COMMERCE
('ecommerce',
 'Magazin Online',
 'E-commerce',
 'Pentru magazine online - comenzi, stocuri, expedieri, integrări platforme',
 'For online stores - orders, inventory, shipping, platform integrations',
 'globe', '#0EA5E9', 'retail',
 '["invoicing", "orders", "inventory", "shipping", "marketplace_sync"]',
 '{"widgets": ["orders_new", "revenue_daily", "low_stock", "shipping_pending"]}',
 '{"primary": ["dashboard", "orders", "products", "inventory", "invoices"], "secondary": ["shipping", "reports", "settings"]}',
 '["online", "magazin", "comenzi", "emag", "shopify", "woocommerce"]',
 'growth', 10),

-- 11. TRANSPORT / FLEET
('transport',
 'Transport Marfă / Flotă',
 'Transport / Fleet',
 'Pentru firme de transport marfă, curse - flotă, șoferi, CMR-uri, combustibil',
 'For freight transport, haulage - fleet, drivers, CMR documents, fuel',
 'truck-loading', '#7C3AED', 'logistics',
 '["invoicing", "fleet", "drivers", "cmr_documents", "fuel_tracking", "maintenance"]',
 '{"widgets": ["trucks_active", "fuel_costs", "deliveries_completed", "maintenance_due"]}',
 '{"primary": ["dashboard", "fleet", "drivers", "documents", "invoices"], "secondary": ["fuel", "reports", "settings"]}',
 '["transport", "tir", "camion", "marfa", "cmr", "flota"]',
 'professional', 11),

-- 12. AGRICULTURE
('agriculture',
 'Agricultură / Fermă',
 'Agriculture / Farm',
 'Pentru ferme, gospodării agricole - culturi, animale, subvenții APIA, utilaje',
 'For farms, agricultural holdings - crops, livestock, APIA subsidies, equipment',
 'tractor', '#84CC16', 'agriculture',
 '["invoicing", "crops", "livestock", "equipment", "subsidies", "weather"]',
 '{"widgets": ["weather_forecast", "crops_status", "subsidies_pending", "revenue_season"]}',
 '{"primary": ["dashboard", "crops", "livestock", "equipment", "invoices"], "secondary": ["subsidies", "reports", "settings"]}',
 '["ferma", "agricultura", "apia", "culturi", "animale", "utilaje"]',
 'growth', 12);

-- =====================================================
-- INSERT: Core Features
-- =====================================================

INSERT INTO feature_toggles (id, name, description, category, enabled_for_personas, required_tier, is_active) VALUES

-- CORE FEATURES (All personas)
('invoicing', 'Facturare', 'Creare și gestionare facturi', 'core', '[]', 'starter', true),
('expenses', 'Cheltuieli', 'Înregistrare și raportare cheltuieli', 'core', '[]', 'starter', true),
('contacts', 'Contacte', 'Gestionare clienți și furnizori', 'core', '[]', 'starter', true),
('reports', 'Rapoarte', 'Rapoarte financiare de bază', 'core', '[]', 'starter', true),
('dashboard', 'Panou Control', 'Dashboard personalizat', 'core', '[]', 'starter', true),

-- PREMIUM FEATURES
('ai_assistant', 'Asistent AI', 'Consultant AI fiscal și business', 'premium', '[]', 'professional', true),
('advanced_analytics', 'Analiză Avansată', 'Rapoarte și predicții avansate', 'premium', '[]', 'growth', true),
('bank_sync', 'Sincronizare Bancară', 'Import automat tranzacții bancare', 'premium', '[]', 'growth', true),

-- VERTICAL FEATURES - Construction
('estimates', 'Devize', 'Creare și gestionare devize', 'vertical', '["construction", "electrical"]', 'starter', true),
('projects', 'Proiecte', 'Management proiecte construcții', 'vertical', '["construction", "electrical", "services"]', 'starter', true),
('materials', 'Materiale', 'Tracking materiale și costuri', 'vertical', '["construction", "electrical"]', 'starter', true),
('crew', 'Echipă', 'Management echipă și pontaj', 'vertical', '["construction", "electrical"]', 'growth', true),
('permits', 'Autorizații', 'Tracking autorizații și permise', 'vertical', '["construction", "electrical"]', 'growth', true),

-- VERTICAL FEATURES - Delivery
('routes', 'Rute', 'Planificare și optimizare rute', 'vertical', '["delivery", "transport"]', 'starter', true),
('drivers', 'Șoferi', 'Management șoferi', 'vertical', '["delivery", "transport"]', 'starter', true),
('fleet', 'Flotă', 'Management vehicule', 'vertical', '["delivery", "transport"]', 'starter', true),
('tracking', 'Tracking', 'Urmărire în timp real', 'vertical', '["delivery", "transport"]', 'growth', true),
('delivery_proof', 'Dovadă Livrare', 'Foto și semnătură livrare', 'vertical', '["delivery"]', 'starter', true),

-- VERTICAL FEATURES - Services/Beauty
('appointments', 'Programări', 'Calendar și programări', 'vertical', '["beauty", "medical", "services"]', 'starter', true),
('clients', 'Clienți', 'Fișe clienți cu istoric', 'vertical', '["beauty", "medical", "services"]', 'starter', true),
('time_tracking', 'Pontaj', 'Urmărire timp lucrat', 'vertical', '["freelancer", "services"]', 'starter', true),

-- VERTICAL FEATURES - Retail/E-commerce
('inventory', 'Stocuri', 'Gestionare stocuri și produse', 'vertical', '["retail", "ecommerce", "horeca"]', 'starter', true),
('pos', 'POS', 'Punct de vânzare', 'vertical', '["retail"]', 'growth', true),
('orders', 'Comenzi', 'Management comenzi online', 'vertical', '["ecommerce"]', 'starter', true),

-- VERTICAL FEATURES - Electrical
('service_calls', 'Intervenții', 'Management intervenții service', 'vertical', '["electrical"]', 'starter', true),
('parts_inventory', 'Piese', 'Stoc piese și componente', 'vertical', '["electrical"]', 'starter', true),
('certifications', 'Certificate ANRE', 'Tracking certificate și autorizații', 'vertical', '["electrical"]', 'starter', true),
('dispatch', 'Dispecerat', 'Dispatch și alocare tehnicieni', 'vertical', '["electrical"]', 'growth', true),

-- VERTICAL FEATURES - Medical
('patients', 'Pacienți', 'Gestionare pacienți', 'vertical', '["medical"]', 'starter', true),
('medical_records', 'Fișe Medicale', 'Dosare medicale electronice', 'vertical', '["medical"]', 'growth', true),

-- VERTICAL FEATURES - Transport
('cmr_documents', 'CMR', 'Generare și arhivare CMR', 'vertical', '["transport"]', 'starter', true),
('fuel_tracking', 'Combustibil', 'Tracking consum combustibil', 'vertical', '["transport"]', 'starter', true),
('maintenance', 'Mentenanță', 'Programare service vehicule', 'vertical', '["transport", "delivery"]', 'growth', true),

-- VERTICAL FEATURES - Agriculture
('crops', 'Culturi', 'Management culturi agricole', 'vertical', '["agriculture"]', 'starter', true),
('livestock', 'Animale', 'Evidență animale', 'vertical', '["agriculture"]', 'starter', true),
('subsidies', 'Subvenții APIA', 'Tracking subvenții și documente', 'vertical', '["agriculture"]', 'starter', true),
('weather', 'Meteo', 'Integrare date meteorologice', 'vertical', '["agriculture"]', 'starter', true),

-- REGIONAL FEATURES
('efactura', 'e-Factura', 'Integrare ANAF e-Factura', 'regional', '[]', 'starter', true),
('anaf_validation', 'Validare ANAF', 'Verificare CUI/CIF la ANAF', 'regional', '[]', 'starter', true),
('romanian_taxes', 'Taxe RO', 'Calcul taxe și contribuții România', 'regional', '[]', 'starter', true);

-- =====================================================
-- INSERT: Quiz Questions for "Help me choose"
-- =====================================================

INSERT INTO persona_quiz_questions (question_ro, question_en, options, question_order) VALUES

('Ce descrie cel mai bine activitatea ta principală?',
 'What best describes your main activity?',
 '[
   {"value": "solo", "label_ro": "Lucrez singur / sunt freelancer", "label_en": "I work alone / freelancer", "persona_weights": {"freelancer": 5, "services": 2}},
   {"value": "team_office", "label_ro": "Am o echipă și lucrez la birou", "label_en": "I have a team and work from office", "persona_weights": {"services": 4, "retail": 2}},
   {"value": "team_field", "label_ro": "Am o echipă și lucrăm pe teren", "label_en": "I have a team and we work in the field", "persona_weights": {"construction": 4, "electrical": 3, "delivery": 3}},
   {"value": "shop", "label_ro": "Am un magazin fizic", "label_en": "I have a physical store", "persona_weights": {"retail": 5, "horeca": 2}},
   {"value": "online", "label_ro": "Vând online", "label_en": "I sell online", "persona_weights": {"ecommerce": 5, "retail": 2}}
 ]', 1),

('Ce vinzi sau oferi?',
 'What do you sell or offer?',
 '[
   {"value": "services", "label_ro": "Servicii / Consultanță", "label_en": "Services / Consulting", "persona_weights": {"freelancer": 3, "services": 4, "beauty": 2}},
   {"value": "products", "label_ro": "Produse fizice", "label_en": "Physical products", "persona_weights": {"retail": 4, "ecommerce": 4}},
   {"value": "delivery", "label_ro": "Livrări / Transport", "label_en": "Delivery / Transport", "persona_weights": {"delivery": 5, "transport": 4}},
   {"value": "construction", "label_ro": "Construcții / Instalații", "label_en": "Construction / Installations", "persona_weights": {"construction": 5, "electrical": 4}},
   {"value": "food", "label_ro": "Mâncare / Băuturi", "label_en": "Food / Beverages", "persona_weights": {"horeca": 5}}
 ]', 2),

('Cum interacționezi cu clienții?',
 'How do you interact with customers?',
 '[
   {"value": "appointments", "label_ro": "Pe bază de programări", "label_en": "By appointments", "persona_weights": {"beauty": 4, "medical": 4, "services": 2}},
   {"value": "walkin", "label_ro": "Vin direct la mine", "label_en": "They come directly to me", "persona_weights": {"retail": 4, "horeca": 3}},
   {"value": "i_go", "label_ro": "Merg eu la ei", "label_en": "I go to them", "persona_weights": {"construction": 4, "electrical": 4, "delivery": 3}},
   {"value": "remote", "label_ro": "De la distanță / Online", "label_en": "Remotely / Online", "persona_weights": {"freelancer": 4, "ecommerce": 4}}
 ]', 3),

('Câți oameni lucrează în echipa ta?',
 'How many people work in your team?',
 '[
   {"value": "just_me", "label_ro": "Doar eu", "label_en": "Just me", "persona_weights": {"freelancer": 5}},
   {"value": "small", "label_ro": "2-5 persoane", "label_en": "2-5 people", "persona_weights": {"beauty": 3, "electrical": 3, "retail": 2}},
   {"value": "medium", "label_ro": "6-15 persoane", "label_en": "6-15 people", "persona_weights": {"construction": 3, "delivery": 3, "horeca": 3}},
   {"value": "large", "label_ro": "Peste 15 persoane", "label_en": "Over 15 people", "persona_weights": {"transport": 3, "construction": 2}}
 ]', 4),

('Ce tip de facturi emiți cel mai des?',
 'What type of invoices do you issue most often?',
 '[
   {"value": "hourly", "label_ro": "Pe oră / Timp lucrat", "label_en": "Hourly / Time worked", "persona_weights": {"freelancer": 4, "services": 4}},
   {"value": "project", "label_ro": "Pe proiect / Deviz", "label_en": "Per project / Estimate", "persona_weights": {"construction": 5, "electrical": 4}},
   {"value": "product", "label_ro": "Pe produse vândute", "label_en": "For products sold", "persona_weights": {"retail": 4, "ecommerce": 4}},
   {"value": "subscription", "label_ro": "Abonament / Recurent", "label_en": "Subscription / Recurring", "persona_weights": {"services": 3, "medical": 2}},
   {"value": "per_delivery", "label_ro": "Per livrare / Cursă", "label_en": "Per delivery / Trip", "persona_weights": {"delivery": 5, "transport": 4}}
 ]', 5);

-- =====================================================
-- Seed complete
-- =====================================================
