-- ============================================================
-- COMPREHENSIVE TEST DATA FOR DOCUMENTIULIA.RO
-- Generated: 2025-11-30
-- Password for ALL test users: Test123!
-- ============================================================

-- SECTION 1: TEST COMPANIES (5 business types)
-- ============================================================
INSERT INTO companies (id, name, legal_name, tax_id, trade_register_number, industry, persona_id, country_code, currency, subscription_tier, status, created_at)
VALUES
('c1000000-1111-1111-1111-000000000001', 'ConstructPro Test SRL', 'ConstructPro Test SRL', 'RO12345678', 'J40/1234/2020', 'construction',
 (SELECT id FROM business_personas WHERE slug = 'construction' LIMIT 1), 'RO', 'RON', 'professional', 'active', NOW()),
('c2000000-2222-2222-2222-000000000002', 'ElectroPro Test SRL', 'ElectroPro Test SRL', 'RO23456789', 'J40/2345/2020', 'electrical_services',
 (SELECT id FROM business_personas WHERE slug = 'electrical' LIMIT 1), 'RO', 'RON', 'professional', 'active', NOW()),
('c3000000-3333-3333-3333-000000000003', 'QuickDelivery Test SRL', 'QuickDelivery Test SRL', 'RO34567890', 'J40/3456/2020', 'delivery_services',
 (SELECT id FROM business_personas WHERE slug = 'delivery' LIMIT 1), 'RO', 'RON', 'starter', 'active', NOW()),
('c4000000-4444-4444-4444-000000000004', 'Freelancer Ion Popescu PFA', 'Ion Popescu PFA', 'RO45678901', 'F40/4567/2020', 'it_services',
 (SELECT id FROM business_personas WHERE slug = 'freelancer' LIMIT 1), 'RO', 'RON', 'starter', 'active', NOW()),
('c5000000-5555-5555-5555-000000000005', 'Restaurant La Bunica SRL', 'Restaurant La Bunica SRL', 'RO56789012', 'J40/5678/2020', 'hospitality',
 (SELECT id FROM business_personas WHERE slug = 'horeca' LIMIT 1), 'RO', 'RON', 'professional', 'active', NOW())
ON CONFLICT (id) DO UPDATE SET updated_at = NOW();


-- SECTION 2: TEST USERS
-- ============================================================
-- Password hash for 'Test123!' using bcrypt
-- $2y$12$P4hZk6imuBzbD7nZdNG7wOLVVDT2ZmG3DawIAW3kE7h9id8JiO45G

-- Super Admin
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, status, email_verified, created_at)
VALUES ('a1000000-1111-1111-1111-000000000001', 'superadmin@documentiulia.ro', '$2y$12$P4hZk6imuBzbD7nZdNG7wOLVVDT2ZmG3DawIAW3kE7h9id8JiO45G',
        'Super', 'Admin', '+40700000001', 'admin', 'active', true, NOW())
ON CONFLICT (email) DO UPDATE SET password_hash = '$2y$12$P4hZk6imuBzbD7nZdNG7wOLVVDT2ZmG3DawIAW3kE7h9id8JiO45G', updated_at = NOW();

-- ConstructPro Users
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, status, email_verified, created_at)
VALUES
('b1100000-1111-1111-1111-000000000011', 'owner@constructpro-test.ro', '$2y$12$P4hZk6imuBzbD7nZdNG7wOLVVDT2ZmG3DawIAW3kE7h9id8JiO45G',
 'Mihai', 'Ionescu', '+40721100011', 'user', 'active', true, NOW()),
('b1100000-1111-1111-1111-000000000012', 'manager@constructpro-test.ro', '$2y$12$P4hZk6imuBzbD7nZdNG7wOLVVDT2ZmG3DawIAW3kE7h9id8JiO45G',
 'Ana', 'Popa', '+40721100012', 'user', 'active', true, NOW()),
('b1100000-1111-1111-1111-000000000013', 'worker1@constructpro-test.ro', '$2y$12$P4hZk6imuBzbD7nZdNG7wOLVVDT2ZmG3DawIAW3kE7h9id8JiO45G',
 'Vasile', 'Munteanu', '+40721100013', 'user', 'active', true, NOW()),
('b1100000-1111-1111-1111-000000000014', 'worker2@constructpro-test.ro', '$2y$12$P4hZk6imuBzbD7nZdNG7wOLVVDT2ZmG3DawIAW3kE7h9id8JiO45G',
 'Ion', 'Georgescu', '+40721100014', 'user', 'active', true, NOW())
ON CONFLICT (email) DO UPDATE SET password_hash = '$2y$12$P4hZk6imuBzbD7nZdNG7wOLVVDT2ZmG3DawIAW3kE7h9id8JiO45G', updated_at = NOW();

-- ElectroPro Users
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, status, email_verified, created_at)
VALUES
('b2200000-2222-2222-2222-000000000021', 'owner@electropro-test.ro', '$2y$12$P4hZk6imuBzbD7nZdNG7wOLVVDT2ZmG3DawIAW3kE7h9id8JiO45G',
 'Adrian', 'Stanescu', '+40722200021', 'user', 'active', true, NOW()),
('b2200000-2222-2222-2222-000000000022', 'master@electropro-test.ro', '$2y$12$P4hZk6imuBzbD7nZdNG7wOLVVDT2ZmG3DawIAW3kE7h9id8JiO45G',
 'George', 'Marinescu', '+40722200022', 'user', 'active', true, NOW()),
('b2200000-2222-2222-2222-000000000023', 'technician1@electropro-test.ro', '$2y$12$P4hZk6imuBzbD7nZdNG7wOLVVDT2ZmG3DawIAW3kE7h9id8JiO45G',
 'Florin', 'Dumitru', '+40722200023', 'user', 'active', true, NOW())
ON CONFLICT (email) DO UPDATE SET password_hash = '$2y$12$P4hZk6imuBzbD7nZdNG7wOLVVDT2ZmG3DawIAW3kE7h9id8JiO45G', updated_at = NOW();

-- QuickDelivery Users
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, status, email_verified, created_at)
VALUES
('b3300000-3333-3333-3333-000000000031', 'owner@quickdelivery-test.ro', '$2y$12$P4hZk6imuBzbD7nZdNG7wOLVVDT2ZmG3DawIAW3kE7h9id8JiO45G',
 'Cristian', 'Barbu', '+40733300031', 'user', 'active', true, NOW()),
('b3300000-3333-3333-3333-000000000032', 'driver1@quickdelivery-test.ro', '$2y$12$P4hZk6imuBzbD7nZdNG7wOLVVDT2ZmG3DawIAW3kE7h9id8JiO45G',
 'Daniel', 'Stoica', '+40733300032', 'user', 'active', true, NOW()),
('b3300000-3333-3333-3333-000000000033', 'driver2@quickdelivery-test.ro', '$2y$12$P4hZk6imuBzbD7nZdNG7wOLVVDT2ZmG3DawIAW3kE7h9id8JiO45G',
 'Marius', 'Florescu', '+40733300033', 'user', 'active', true, NOW())
ON CONFLICT (email) DO UPDATE SET password_hash = '$2y$12$P4hZk6imuBzbD7nZdNG7wOLVVDT2ZmG3DawIAW3kE7h9id8JiO45G', updated_at = NOW();

-- Freelancer
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, status, email_verified, created_at)
VALUES ('b4400000-4444-4444-4444-000000000041', 'ion.popescu@freelancer-test.ro', '$2y$12$P4hZk6imuBzbD7nZdNG7wOLVVDT2ZmG3DawIAW3kE7h9id8JiO45G',
        'Ion', 'Popescu', '+40744400041', 'user', 'active', true, NOW())
ON CONFLICT (email) DO UPDATE SET password_hash = '$2y$12$P4hZk6imuBzbD7nZdNG7wOLVVDT2ZmG3DawIAW3kE7h9id8JiO45G', updated_at = NOW();

-- Restaurant Users
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, status, email_verified, created_at)
VALUES
('b5500000-5555-5555-5555-000000000051', 'owner@labunica-test.ro', '$2y$12$P4hZk6imuBzbD7nZdNG7wOLVVDT2ZmG3DawIAW3kE7h9id8JiO45G',
 'Maria', 'Vasilescu', '+40755500051', 'user', 'active', true, NOW()),
('b5500000-5555-5555-5555-000000000052', 'manager@labunica-test.ro', '$2y$12$P4hZk6imuBzbD7nZdNG7wOLVVDT2ZmG3DawIAW3kE7h9id8JiO45G',
 'Elena', 'Constantinescu', '+40755500052', 'user', 'active', true, NOW())
ON CONFLICT (email) DO UPDATE SET password_hash = '$2y$12$P4hZk6imuBzbD7nZdNG7wOLVVDT2ZmG3DawIAW3kE7h9id8JiO45G', updated_at = NOW();

-- Test Client Users
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, status, email_verified, created_at)
VALUES
('b9900000-9999-9999-9999-000000000091', 'client.homeowner@test.ro', '$2y$12$P4hZk6imuBzbD7nZdNG7wOLVVDT2ZmG3DawIAW3kE7h9id8JiO45G',
 'Andrei', 'Radu', '+40799900091', 'user', 'active', true, NOW()),
('b9900000-9999-9999-9999-000000000092', 'client.business@test.ro', '$2y$12$P4hZk6imuBzbD7nZdNG7wOLVVDT2ZmG3DawIAW3kE7h9id8JiO45G',
 'Catalin', 'Negru', '+40799900092', 'user', 'active', true, NOW())
ON CONFLICT (email) DO UPDATE SET password_hash = '$2y$12$P4hZk6imuBzbD7nZdNG7wOLVVDT2ZmG3DawIAW3kE7h9id8JiO45G', updated_at = NOW();


-- SECTION 3: COMPANY-USER ASSOCIATIONS
-- ============================================================
INSERT INTO company_users (company_id, user_id, role, is_primary, created_at)
VALUES
-- ConstructPro
('c1000000-1111-1111-1111-000000000001', 'b1100000-1111-1111-1111-000000000011', 'owner', true, NOW()),
('c1000000-1111-1111-1111-000000000001', 'b1100000-1111-1111-1111-000000000012', 'manager', false, NOW()),
('c1000000-1111-1111-1111-000000000001', 'b1100000-1111-1111-1111-000000000013', 'worker', false, NOW()),
('c1000000-1111-1111-1111-000000000001', 'b1100000-1111-1111-1111-000000000014', 'worker', false, NOW()),
-- ElectroPro
('c2000000-2222-2222-2222-000000000002', 'b2200000-2222-2222-2222-000000000021', 'owner', true, NOW()),
('c2000000-2222-2222-2222-000000000002', 'b2200000-2222-2222-2222-000000000022', 'manager', false, NOW()),
('c2000000-2222-2222-2222-000000000002', 'b2200000-2222-2222-2222-000000000023', 'technician', false, NOW()),
-- QuickDelivery
('c3000000-3333-3333-3333-000000000003', 'b3300000-3333-3333-3333-000000000031', 'owner', true, NOW()),
('c3000000-3333-3333-3333-000000000003', 'b3300000-3333-3333-3333-000000000032', 'driver', false, NOW()),
('c3000000-3333-3333-3333-000000000003', 'b3300000-3333-3333-3333-000000000033', 'driver', false, NOW()),
-- Freelancer
('c4000000-4444-4444-4444-000000000004', 'b4400000-4444-4444-4444-000000000041', 'owner', true, NOW()),
-- Restaurant
('c5000000-5555-5555-5555-000000000005', 'b5500000-5555-5555-5555-000000000051', 'owner', true, NOW()),
('c5000000-5555-5555-5555-000000000005', 'b5500000-5555-5555-5555-000000000052', 'manager', false, NOW())
ON CONFLICT (company_id, user_id) DO UPDATE SET updated_at = NOW();


-- SECTION 4: CONTACTS (Customers/Vendors)
-- ============================================================
-- ConstructPro Contacts
INSERT INTO contacts (id, company_id, contact_type, display_name, email, phone, tax_id, currency, address_street, address_city, address_county, address_postal_code, payment_terms, is_active, created_at)
VALUES
('d1100000-1111-1111-1111-000000000001', 'c1000000-1111-1111-1111-000000000001', 'customer', 'Familie Popescu - Renovare Vila', 'popescu.familie@email.ro', '+40721111001', NULL, 'RON', 'Str. Primaverii 15', 'București', 'Ilfov', '010001', 30, true, NOW()),
('d1100000-1111-1111-1111-000000000002', 'c1000000-1111-1111-1111-000000000001', 'customer', 'SC Office Center SRL', 'contract@officecenter.ro', '+40721111002', 'RO87654321', 'RON', 'Bd. Victoriei 100', 'București', 'Sector 1', '010002', 45, true, NOW()),
('d1100000-1111-1111-1111-000000000003', 'c1000000-1111-1111-1111-000000000001', 'vendor', 'Materiale Construct SRL', 'comenzi@materialeconstruct.ro', '+40721111003', 'RO11223344', 'RON', 'Str. Industriei 50', 'București', 'Sector 3', '030001', 30, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ElectroPro Contacts
INSERT INTO contacts (id, company_id, contact_type, display_name, email, phone, tax_id, currency, address_street, address_city, address_county, address_postal_code, payment_terms, is_active, created_at)
VALUES
('d2200000-2222-2222-2222-000000000001', 'c2000000-2222-2222-2222-000000000002', 'customer', 'Smart Home Residence', 'admin@smarthome.ro', '+40722222001', NULL, 'RON', 'Str. Zorilor 25', 'Cluj-Napoca', 'Cluj', '400100', 15, true, NOW()),
('d2200000-2222-2222-2222-000000000002', 'c2000000-2222-2222-2222-000000000002', 'customer', 'Hotel Grand Plaza', 'tehnic@grandplaza.ro', '+40722222002', 'RO99887766', 'RON', 'Bd. Unirii 50', 'București', 'Sector 5', '050001', 30, true, NOW()),
('d2200000-2222-2222-2222-000000000003', 'c2000000-2222-2222-2222-000000000002', 'vendor', 'ElectroMateriale SRL', 'vanzari@electromateriale.ro', '+40722222003', 'RO55443322', 'RON', 'Str. Fabricii 10', 'Timișoara', 'Timiș', '300100', 30, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- QuickDelivery Contacts
INSERT INTO contacts (id, company_id, contact_type, display_name, email, phone, currency, address_street, address_city, address_county, address_postal_code, payment_terms, is_active, created_at)
VALUES
('d3300000-3333-3333-3333-000000000001', 'c3000000-3333-3333-3333-000000000003', 'customer', 'eMAG Marketplace', 'livrari@emag-partner.ro', '+40733333001', 'RON', 'Bd. Theodor Pallady 51', 'București', 'Sector 3', '032266', 15, true, NOW()),
('d3300000-3333-3333-3333-000000000002', 'c3000000-3333-3333-3333-000000000003', 'customer', 'Fashion Boutique Online', 'expeditii@fashionboutique.ro', '+40733333002', 'RON', 'Str. Lipscani 100', 'București', 'Sector 3', '030031', 7, true, NOW())
ON CONFLICT (id) DO NOTHING;


-- SECTION 5: PROJECTS
-- ============================================================
-- ConstructPro Projects
INSERT INTO projects (id, company_id, name, description, status, budget, start_date, end_date, created_at)
VALUES
('e1100000-1111-1111-1111-000000000001', 'c1000000-1111-1111-1111-000000000001', 'Renovare Vila Pipera', 'Renovare completă vilă 250mp, 3 nivele', 'in_progress', 150000.00, '2025-09-01', '2025-12-31', NOW()),
('e1100000-1111-1111-1111-000000000002', 'c1000000-1111-1111-1111-000000000001', 'Amenajare Birouri IT', 'Construcție și amenajare spațiu birouri 500mp', 'in_progress', 280000.00, '2025-10-01', '2026-02-28', NOW()),
('e1100000-1111-1111-1111-000000000003', 'c1000000-1111-1111-1111-000000000001', 'Acoperiș Casă Voluntari', 'Refacere acoperiș și izolație termică', 'completed', 45000.00, '2025-06-01', '2025-08-15', NOW()),
('e1100000-1111-1111-1111-000000000004', 'c1000000-1111-1111-1111-000000000001', 'Extindere Hală Depozit', 'Extindere hală cu 200mp', 'planning', 95000.00, '2026-01-15', '2026-04-30', NOW())
ON CONFLICT (id) DO NOTHING;

-- ElectroPro Projects
INSERT INTO projects (id, company_id, name, description, status, budget, start_date, end_date, created_at)
VALUES
('e2200000-2222-2222-2222-000000000001', 'c2000000-2222-2222-2222-000000000002', 'Instalație Smart Home Villa', 'Sistem complet automatizare casă cu KNX', 'in_progress', 85000.00, '2025-10-01', '2025-12-15', NOW()),
('e2200000-2222-2222-2222-000000000002', 'c2000000-2222-2222-2222-000000000002', 'Revizie Instalație Hotel', 'Verificare și upgrade instalație electrică hotel 100 camere', 'in_progress', 120000.00, '2025-09-15', '2026-01-31', NOW()),
('e2200000-2222-2222-2222-000000000003', 'c2000000-2222-2222-2222-000000000002', 'Panouri Solare Rezidențial', 'Instalare sistem fotovoltaic 10kW', 'completed', 55000.00, '2025-07-01', '2025-08-30', NOW())
ON CONFLICT (id) DO NOTHING;


-- SECTION 6: INVOICES
-- ============================================================
-- ConstructPro Invoices
INSERT INTO invoices (id, company_id, customer_id, invoice_number, invoice_date, due_date, status, subtotal, vat_amount, total_amount, amount_paid, amount_due, currency, notes, created_at)
VALUES
('f1100000-1111-1111-1111-000000000001', 'c1000000-1111-1111-1111-000000000001', 'd1100000-1111-1111-1111-000000000001', 'FACT-2025-0001', '2025-09-15', '2025-10-15', 'paid', 25000.00, 4750.00, 29750.00, 29750.00, 0.00, 'RON', 'Avans renovare vila', NOW()),
('f1100000-1111-1111-1111-000000000002', 'c1000000-1111-1111-1111-000000000001', 'd1100000-1111-1111-1111-000000000001', 'FACT-2025-0002', '2025-10-15', '2025-11-15', 'pending', 35000.00, 6650.00, 41650.00, 0.00, 41650.00, 'RON', 'Situație lucrări octombrie', NOW()),
('f1100000-1111-1111-1111-000000000003', 'c1000000-1111-1111-1111-000000000001', 'd1100000-1111-1111-1111-000000000002', 'FACT-2025-0003', '2025-08-01', '2025-09-01', 'overdue', 45000.00, 8550.00, 53550.00, 0.00, 53550.00, 'RON', 'Avans amenajare birouri - RESTANT', NOW()),
('f1100000-1111-1111-1111-000000000004', 'c1000000-1111-1111-1111-000000000001', 'd1100000-1111-1111-1111-000000000001', 'FACT-2025-0004', '2025-11-20', '2025-12-20', 'draft', 18000.00, 3420.00, 21420.00, 0.00, 21420.00, 'RON', 'Situație lucrări noiembrie - ciornă', NOW())
ON CONFLICT (id) DO NOTHING;

-- ElectroPro Invoices
INSERT INTO invoices (id, company_id, customer_id, invoice_number, invoice_date, due_date, status, subtotal, vat_amount, total_amount, amount_paid, amount_due, currency, notes, created_at)
VALUES
('f2200000-2222-2222-2222-000000000001', 'c2000000-2222-2222-2222-000000000002', 'd2200000-2222-2222-2222-000000000001', 'EP-2025-0001', '2025-10-20', '2025-11-05', 'paid', 42500.00, 8075.00, 50575.00, 50575.00, 0.00, 'RON', 'Avans instalație smart home', NOW()),
('f2200000-2222-2222-2222-000000000002', 'c2000000-2222-2222-2222-000000000002', 'd2200000-2222-2222-2222-000000000002', 'EP-2025-0002', '2025-09-25', '2025-10-25', 'pending', 28000.00, 5320.00, 33320.00, 15000.00, 18320.00, 'RON', 'Situație lucrări revizie hotel - partial plătit', NOW())
ON CONFLICT (id) DO NOTHING;


-- SECTION 7: EXPENSES
-- ============================================================
-- ConstructPro Expenses
INSERT INTO expenses (id, company_id, expense_date, vendor_id, amount, currency, description, category, status, created_at)
VALUES
('g1100000-1111-1111-1111-000000000001', 'c1000000-1111-1111-1111-000000000001', '2025-09-10', 'd1100000-1111-1111-1111-000000000003', 15000.00, 'RON', 'Ciment, nisip, pietriș - Vila Pipera', 'materials', 'approved', NOW()),
('g1100000-1111-1111-1111-000000000002', 'c1000000-1111-1111-1111-000000000001', '2025-09-15', 'd1100000-1111-1111-1111-000000000003', 8500.00, 'RON', 'Cărămidă și BCA', 'materials', 'approved', NOW()),
('g1100000-1111-1111-1111-000000000003', 'c1000000-1111-1111-1111-000000000001', '2025-10-01', NULL, 2500.00, 'RON', 'Închiriere schelă 1 lună', 'equipment_rental', 'approved', NOW()),
('g1100000-1111-1111-1111-000000000004', 'c1000000-1111-1111-1111-000000000001', '2025-10-20', NULL, 3200.00, 'RON', 'Combustibil vehicule octombrie', 'fuel', 'pending', NOW())
ON CONFLICT (id) DO NOTHING;

-- ElectroPro Expenses
INSERT INTO expenses (id, company_id, expense_date, vendor_id, amount, currency, description, category, status, created_at)
VALUES
('g2200000-2222-2222-2222-000000000001', 'c2000000-2222-2222-2222-000000000002', '2025-10-05', 'd2200000-2222-2222-2222-000000000003', 22000.00, 'RON', 'Echipamente KNX și senzori', 'materials', 'approved', NOW()),
('g2200000-2222-2222-2222-000000000002', 'c2000000-2222-2222-2222-000000000002', '2025-10-10', 'd2200000-2222-2222-2222-000000000003', 8500.00, 'RON', 'Cabluri și conectori', 'materials', 'approved', NOW()),
('g2200000-2222-2222-2222-000000000003', 'c2000000-2222-2222-2222-000000000002', '2025-10-15', NULL, 1500.00, 'RON', 'Scule și echipamente de măsură', 'equipment', 'pending', NOW())
ON CONFLICT (id) DO NOTHING;


-- SECTION 8: EMPLOYEES
-- ============================================================
-- ConstructPro Employees
INSERT INTO employees (id, company_id, employee_number, employment_type, department, position_title, hire_date, salary_amount, status, created_at)
VALUES
('h1100000-1111-1111-1111-000000000001', 'c1000000-1111-1111-1111-000000000001', 'CONSTR-001', 'full_time', 'Șantier', 'Maistru', '2020-03-01', 7500.00, 'active', NOW()),
('h1100000-1111-1111-1111-000000000002', 'c1000000-1111-1111-1111-000000000001', 'CONSTR-002', 'full_time', 'Șantier', 'Zidar', '2021-06-15', 5500.00, 'active', NOW()),
('h1100000-1111-1111-1111-000000000003', 'c1000000-1111-1111-1111-000000000001', 'CONSTR-003', 'full_time', 'Șantier', 'Zidar', '2022-01-10', 5000.00, 'active', NOW()),
('h1100000-1111-1111-1111-000000000004', 'c1000000-1111-1111-1111-000000000001', 'CONSTR-004', 'part_time', 'Șantier', 'Muncitor necalificat', '2023-04-01', 3000.00, 'active', NOW())
ON CONFLICT (id) DO NOTHING;

-- ElectroPro Employees
INSERT INTO employees (id, company_id, employee_number, employment_type, department, position_title, hire_date, salary_amount, status, created_at)
VALUES
('h2200000-2222-2222-2222-000000000001', 'c2000000-2222-2222-2222-000000000002', 'ELEC-001', 'full_time', 'Tehnic', 'Electrician autorizat', '2019-02-01', 8500.00, 'active', NOW()),
('h2200000-2222-2222-2222-000000000002', 'c2000000-2222-2222-2222-000000000002', 'ELEC-002', 'full_time', 'Tehnic', 'Tehnician automatizări', '2021-08-15', 7000.00, 'active', NOW()),
('h2200000-2222-2222-2222-000000000003', 'c2000000-2222-2222-2222-000000000002', 'ELEC-003', 'full_time', 'Tehnic', 'Electrician', '2022-05-01', 5500.00, 'active', NOW())
ON CONFLICT (id) DO NOTHING;


-- SECTION 9: TASKS
-- ============================================================
-- ConstructPro Tasks
INSERT INTO tasks (id, company_id, project_id, title, description, status, priority, due_date, estimated_hours, created_at)
VALUES
('i1100000-1111-1111-1111-000000000001', 'c1000000-1111-1111-1111-000000000001', 'e1100000-1111-1111-1111-000000000001', 'Demolare pereți interiori', 'Demolare pereți nestructurali parter și etaj', 'done', 'high', '2025-09-15', 40.00, NOW()),
('i1100000-1111-1111-1111-000000000002', 'c1000000-1111-1111-1111-000000000001', 'e1100000-1111-1111-1111-000000000001', 'Instalație sanitară nouă', 'Montaj țevi și racorduri 3 băi', 'in_progress', 'high', '2025-11-15', 80.00, NOW()),
('i1100000-1111-1111-1111-000000000003', 'c1000000-1111-1111-1111-000000000001', 'e1100000-1111-1111-1111-000000000001', 'Tencuieli interioare', 'Tencuire și gletuire toate camerele', 'todo', 'medium', '2025-12-01', 120.00, NOW()),
('i1100000-1111-1111-1111-000000000004', 'c1000000-1111-1111-1111-000000000001', 'e1100000-1111-1111-1111-000000000002', 'Montaj compartimentări', 'Pereți din gips-carton zona birouri', 'in_progress', 'high', '2025-11-30', 60.00, NOW())
ON CONFLICT (id) DO NOTHING;

-- ElectroPro Tasks
INSERT INTO tasks (id, company_id, project_id, title, description, status, priority, due_date, estimated_hours, created_at)
VALUES
('i2200000-2222-2222-2222-000000000001', 'c2000000-2222-2222-2222-000000000002', 'e2200000-2222-2222-2222-000000000001', 'Instalare panou KNX', 'Montaj și configurare panou central KNX', 'done', 'high', '2025-10-15', 16.00, NOW()),
('i2200000-2222-2222-2222-000000000002', 'c2000000-2222-2222-2222-000000000002', 'e2200000-2222-2222-2222-000000000001', 'Cablare senzori', 'Instalare cabluri pentru toate zonele', 'in_progress', 'high', '2025-11-01', 40.00, NOW()),
('i2200000-2222-2222-2222-000000000003', 'c2000000-2222-2222-2222-000000000002', 'e2200000-2222-2222-2222-000000000001', 'Configurare scenarii', 'Programare scenarii iluminat și climatizare', 'todo', 'medium', '2025-11-30', 24.00, NOW())
ON CONFLICT (id) DO NOTHING;


-- SECTION 10: TIME ENTRIES
-- ============================================================
INSERT INTO time_entries (id, company_id, project_id, employee_id, entry_date, hours, hourly_rate, description, is_billable, created_at)
VALUES
('j1100000-1111-1111-1111-000000000001', 'c1000000-1111-1111-1111-000000000001', 'e1100000-1111-1111-1111-000000000001', 'h1100000-1111-1111-1111-000000000001', '2025-10-25', 8.00, 75.00, 'Supraveghere lucrări sanitare', true, NOW()),
('j1100000-1111-1111-1111-000000000002', 'c1000000-1111-1111-1111-000000000001', 'e1100000-1111-1111-1111-000000000001', 'h1100000-1111-1111-1111-000000000002', '2025-10-25', 8.00, 55.00, 'Zidărie pereți interiori', true, NOW()),
('j1100000-1111-1111-1111-000000000003', 'c1000000-1111-1111-1111-000000000001', 'e1100000-1111-1111-1111-000000000001', 'h1100000-1111-1111-1111-000000000003', '2025-10-25', 8.00, 50.00, 'Zidărie pereți interiori', true, NOW()),
('j1100000-1111-1111-1111-000000000004', 'c1000000-1111-1111-1111-000000000001', 'e1100000-1111-1111-1111-000000000002', 'h1100000-1111-1111-1111-000000000001', '2025-10-26', 6.00, 75.00, 'Coordonare echipă compartimentări', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ElectroPro Time Entries
INSERT INTO time_entries (id, company_id, project_id, employee_id, entry_date, hours, hourly_rate, description, is_billable, created_at)
VALUES
('j2200000-2222-2222-2222-000000000001', 'c2000000-2222-2222-2222-000000000002', 'e2200000-2222-2222-2222-000000000001', 'h2200000-2222-2222-2222-000000000001', '2025-10-20', 8.00, 85.00, 'Montaj și configurare panou KNX', true, NOW()),
('j2200000-2222-2222-2222-000000000002', 'c2000000-2222-2222-2222-000000000002', 'e2200000-2222-2222-2222-000000000001', 'h2200000-2222-2222-2222-000000000002', '2025-10-21', 8.00, 70.00, 'Cablare zonă living și dormitor master', true, NOW())
ON CONFLICT (id) DO NOTHING;


-- SECTION 11: PRODUCTS/INVENTORY
-- ============================================================
-- ConstructPro Products
INSERT INTO products (id, company_id, sku, name, description, category, unit_of_measure, purchase_price, selling_price, vat_rate, track_inventory, reorder_level, is_active, created_at)
VALUES
('k1100000-1111-1111-1111-000000000001', 'c1000000-1111-1111-1111-000000000001', 'MAT-CIM-001', 'Ciment Portland 42.5', 'Sac 50kg ciment pentru construcții', 'Materiale', 'sac', 28.00, 35.00, 19.00, true, 50, true, NOW()),
('k1100000-1111-1111-1111-000000000002', 'c1000000-1111-1111-1111-000000000001', 'MAT-BCA-001', 'BCA 60x25x20', 'Bloc BCA standard', 'Materiale', 'buc', 8.50, 12.00, 19.00, true, 200, true, NOW()),
('k1100000-1111-1111-1111-000000000003', 'c1000000-1111-1111-1111-000000000001', 'MAT-NIS-001', 'Nisip sortat', 'Nisip pentru construcții, mc', 'Materiale', 'mc', 80.00, 120.00, 19.00, true, 10, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ElectroPro Products
INSERT INTO products (id, company_id, sku, name, description, category, unit_of_measure, purchase_price, selling_price, vat_rate, track_inventory, reorder_level, is_active, created_at)
VALUES
('k2200000-2222-2222-2222-000000000001', 'c2000000-2222-2222-2222-000000000002', 'ELEC-KNX-001', 'Actuator KNX 8 canale', 'Actuator pentru iluminat 8 ieșiri', 'Automatizări', 'buc', 450.00, 650.00, 19.00, true, 5, true, NOW()),
('k2200000-2222-2222-2222-000000000002', 'c2000000-2222-2222-2222-000000000002', 'ELEC-SEN-001', 'Senzor prezență KNX', 'Senzor mișcare și luminozitate', 'Automatizări', 'buc', 180.00, 280.00, 19.00, true, 10, true, NOW()),
('k2200000-2222-2222-2222-000000000003', 'c2000000-2222-2222-2222-000000000002', 'ELEC-CAB-001', 'Cablu KNX verde', 'Cablu bus KNX 100m', 'Cabluri', 'rola', 250.00, 380.00, 19.00, true, 5, true, NOW())
ON CONFLICT (id) DO NOTHING;


-- SECTION 12: VEHICLES (QuickDelivery)
-- ============================================================
INSERT INTO vehicles (id, company_id, registration_number, make, model, year, vehicle_type, fuel_type, capacity_kg, current_mileage, status, itp_expiry, insurance_expiry, created_at)
VALUES
('l3300000-3333-3333-3333-000000000001', 'c3000000-3333-3333-3333-000000000003', 'B-123-QDV', 'Renault', 'Master', 2022, 'van', 'diesel', 1500.00, 45000, 'available', '2026-03-15', '2025-12-31', NOW()),
('l3300000-3333-3333-3333-000000000002', 'c3000000-3333-3333-3333-000000000003', 'B-456-QDV', 'Mercedes', 'Sprinter', 2021, 'van', 'diesel', 2000.00, 78000, 'available', '2025-09-20', '2025-11-30', NOW()),
('l3300000-3333-3333-3333-000000000003', 'c3000000-3333-3333-3333-000000000003', 'B-789-QDV', 'Dacia', 'Dokker', 2023, 'van', 'diesel', 800.00, 25000, 'in_use', '2026-06-10', '2026-01-15', NOW())
ON CONFLICT (id) DO NOTHING;


-- SECTION 13: SERVICE CALLS (ElectroPro)
-- ============================================================
INSERT INTO service_calls (id, company_id, call_number, customer_name, customer_phone, customer_email, service_address, service_type, problem_category, problem_description, priority, status, scheduled_date, assigned_technician, created_at)
VALUES
('m2200000-2222-2222-2222-000000000001', 'c2000000-2222-2222-2222-000000000002', 'SVC-2025-001', 'Hotel Grand Plaza', '+40722222002', 'tehnic@grandplaza.ro', 'Bd. Unirii 50, București', 'repair', 'power_outage', 'Pană de curent etaj 3 - urgentă', 1, 'completed', '2025-10-15', 'h2200000-2222-2222-2222-000000000001', NOW()),
('m2200000-2222-2222-2222-000000000002', 'c2000000-2222-2222-2222-000000000002', 'SVC-2025-002', 'Smart Home Residence', '+40722222001', 'admin@smarthome.ro', 'Str. Zorilor 25, Cluj-Napoca', 'maintenance', 'lighting', 'Verificare periodică sistem iluminat', 3, 'scheduled', '2025-11-20', 'h2200000-2222-2222-2222-000000000002', NOW()),
('m2200000-2222-2222-2222-000000000003', 'c2000000-2222-2222-2222-000000000002', 'SVC-2025-003', 'Familie Ionescu', '+40723456789', 'ionescu@email.ro', 'Str. Republicii 15, București', 'installation', 'panel', 'Instalare tablou electric nou', 2, 'new', NULL, NULL, NOW())
ON CONFLICT (id) DO NOTHING;


-- SECTION 14: UPDATE EXISTING TEST USERS PASSWORD
-- ============================================================
UPDATE users
SET password_hash = '$2y$12$P4hZk6imuBzbD7nZdNG7wOLVVDT2ZmG3DawIAW3kE7h9id8JiO45G'
WHERE email IN (
    'test_admin@accountech.com',
    'test_manager@accountech.com',
    'test_user@accountech.com'
);

-- ============================================================
-- END OF COMPREHENSIVE TEST DATA
-- ============================================================
