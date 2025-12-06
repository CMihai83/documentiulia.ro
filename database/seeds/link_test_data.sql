-- ============================================================
-- LINK TEST USERS TO COMPANIES AND ADD REMAINING DATA
-- Uses existing companies from previous seeding
-- ============================================================

-- SECTION 1: LINK USERS TO COMPANIES
-- ============================================================
INSERT INTO company_users (company_id, user_id, role, created_at)
VALUES
-- ConstructPro (c1000000-0000-0000-0000-000000000001)
('c1000000-0000-0000-0000-000000000001', 'b1100000-1111-1111-1111-000000000011', 'owner', NOW()),
('c1000000-0000-0000-0000-000000000001', 'b1100000-1111-1111-1111-000000000012', 'manager', NOW()),
('c1000000-0000-0000-0000-000000000001', 'b1100000-1111-1111-1111-000000000013', 'member', NOW()),
('c1000000-0000-0000-0000-000000000001', 'b1100000-1111-1111-1111-000000000014', 'member', NOW()),
-- ElectroPro (c2000000-0000-0000-0000-000000000002)
('c2000000-0000-0000-0000-000000000002', 'b2200000-2222-2222-2222-000000000021', 'owner', NOW()),
('c2000000-0000-0000-0000-000000000002', 'b2200000-2222-2222-2222-000000000022', 'manager', NOW()),
('c2000000-0000-0000-0000-000000000002', 'b2200000-2222-2222-2222-000000000023', 'member', NOW()),
-- QuickDelivery (c3000000-0000-0000-0000-000000000003)
('c3000000-0000-0000-0000-000000000003', 'b3300000-3333-3333-3333-000000000031', 'owner', NOW()),
('c3000000-0000-0000-0000-000000000003', 'b3300000-3333-3333-3333-000000000032', 'member', NOW()),
('c3000000-0000-0000-0000-000000000003', 'b3300000-3333-3333-3333-000000000033', 'member', NOW()),
-- Freelancer (c4000000-0000-0000-0000-000000000004)
('c4000000-0000-0000-0000-000000000004', 'b4400000-4444-4444-4444-000000000041', 'owner', NOW()),
-- Restaurant (c5000000-0000-0000-0000-000000000005)
('c5000000-0000-0000-0000-000000000005', 'b5500000-5555-5555-5555-000000000051', 'owner', NOW()),
('c5000000-0000-0000-0000-000000000005', 'b5500000-5555-5555-5555-000000000052', 'manager', NOW())
ON CONFLICT (company_id, user_id) DO NOTHING;


-- SECTION 2: CONTACTS (Customers/Vendors)
-- ============================================================
INSERT INTO contacts (id, company_id, contact_type, display_name, email, phone, tax_id, currency, address_street, address_city, address_county, address_postal_code, payment_terms, is_active, created_at)
VALUES
-- ConstructPro Contacts
('d1100001-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000001', 'customer', 'Familie Popescu - Renovare Vila', 'popescu.familie@email.ro', '+40721111001', NULL, 'RON', 'Str. Primaverii 15', 'București', 'Ilfov', '010001', 30, true, NOW()),
('d1100002-2222-2222-2222-222222222222', 'c1000000-0000-0000-0000-000000000001', 'customer', 'SC Office Center SRL', 'contract@officecenter.ro', '+40721111002', 'RO87654321', 'RON', 'Bd. Victoriei 100', 'București', 'Sector 1', '010002', 45, true, NOW()),
('d1100003-3333-3333-3333-333333333333', 'c1000000-0000-0000-0000-000000000001', 'vendor', 'Materiale Construct SRL', 'comenzi@materialeconstruct.ro', '+40721111003', 'RO11223344', 'RON', 'Str. Industriei 50', 'București', 'Sector 3', '030001', 30, true, NOW()),
-- ElectroPro Contacts
('d2200001-1111-1111-1111-111111111111', 'c2000000-0000-0000-0000-000000000002', 'customer', 'Smart Home Residence', 'admin@smarthome.ro', '+40722222001', NULL, 'RON', 'Str. Zorilor 25', 'Cluj-Napoca', 'Cluj', '400100', 15, true, NOW()),
('d2200002-2222-2222-2222-222222222222', 'c2000000-0000-0000-0000-000000000002', 'customer', 'Hotel Grand Plaza', 'tehnic@grandplaza.ro', '+40722222002', 'RO99887766', 'RON', 'Bd. Unirii 50', 'București', 'Sector 5', '050001', 30, true, NOW()),
('d2200003-3333-3333-3333-333333333333', 'c2000000-0000-0000-0000-000000000002', 'vendor', 'ElectroMateriale SRL', 'vanzari@electromateriale.ro', '+40722222003', 'RO55443322', 'RON', 'Str. Fabricii 10', 'Timișoara', 'Timiș', '300100', 30, true, NOW()),
-- QuickDelivery Contacts
('d3300001-1111-1111-1111-111111111111', 'c3000000-0000-0000-0000-000000000003', 'customer', 'eMAG Marketplace', 'livrari@emag-partner.ro', '+40733333001', 'RON', 'Bd. Theodor Pallady 51', 'București', 'Sector 3', '032266', 15, true, NOW()),
('d3300002-2222-2222-2222-222222222222', 'c3000000-0000-0000-0000-000000000003', 'customer', 'Fashion Boutique Online', 'expeditii@fashionboutique.ro', '+40733333002', 'RON', 'Str. Lipscani 100', 'București', 'Sector 3', '030031', 7, true, NOW())
ON CONFLICT (id) DO NOTHING;


-- SECTION 3: PROJECTS
-- ============================================================
INSERT INTO projects (id, company_id, name, description, status, budget, start_date, end_date, created_at)
VALUES
-- ConstructPro Projects
('e1100001-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000001', 'Renovare Vila Pipera', 'Renovare completă vilă 250mp, 3 nivele', 'in_progress', 150000.00, '2025-09-01', '2025-12-31', NOW()),
('e1100002-2222-2222-2222-222222222222', 'c1000000-0000-0000-0000-000000000001', 'Amenajare Birouri IT', 'Construcție și amenajare spațiu birouri 500mp', 'in_progress', 280000.00, '2025-10-01', '2026-02-28', NOW()),
('e1100003-3333-3333-3333-333333333333', 'c1000000-0000-0000-0000-000000000001', 'Acoperiș Casă Voluntari', 'Refacere acoperiș și izolație termică', 'completed', 45000.00, '2025-06-01', '2025-08-15', NOW()),
('e1100004-4444-4444-4444-444444444444', 'c1000000-0000-0000-0000-000000000001', 'Extindere Hală Depozit', 'Extindere hală cu 200mp', 'planning', 95000.00, '2026-01-15', '2026-04-30', NOW()),
-- ElectroPro Projects
('e2200001-1111-1111-1111-111111111111', 'c2000000-0000-0000-0000-000000000002', 'Instalație Smart Home Villa', 'Sistem complet automatizare casă cu KNX', 'in_progress', 85000.00, '2025-10-01', '2025-12-15', NOW()),
('e2200002-2222-2222-2222-222222222222', 'c2000000-0000-0000-0000-000000000002', 'Revizie Instalație Hotel', 'Verificare și upgrade instalație electrică hotel 100 camere', 'in_progress', 120000.00, '2025-09-15', '2026-01-31', NOW()),
('e2200003-3333-3333-3333-333333333333', 'c2000000-0000-0000-0000-000000000002', 'Panouri Solare Rezidențial', 'Instalare sistem fotovoltaic 10kW', 'completed', 55000.00, '2025-07-01', '2025-08-30', NOW())
ON CONFLICT (id) DO NOTHING;


-- SECTION 4: INVOICES
-- ============================================================
INSERT INTO invoices (id, company_id, customer_id, invoice_number, invoice_date, due_date, status, subtotal, vat_amount, total_amount, amount_paid, amount_due, currency, notes, created_at)
VALUES
-- ConstructPro Invoices
('f1100001-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000001', 'd1100001-1111-1111-1111-111111111111', 'FACT-2025-0001', '2025-09-15', '2025-10-15', 'paid', 25000.00, 4750.00, 29750.00, 29750.00, 0.00, 'RON', 'Avans renovare vila', NOW()),
('f1100002-2222-2222-2222-222222222222', 'c1000000-0000-0000-0000-000000000001', 'd1100001-1111-1111-1111-111111111111', 'FACT-2025-0002', '2025-10-15', '2025-11-15', 'pending', 35000.00, 6650.00, 41650.00, 0.00, 41650.00, 'RON', 'Situație lucrări octombrie', NOW()),
('f1100003-3333-3333-3333-333333333333', 'c1000000-0000-0000-0000-000000000001', 'd1100002-2222-2222-2222-222222222222', 'FACT-2025-0003', '2025-08-01', '2025-09-01', 'overdue', 45000.00, 8550.00, 53550.00, 0.00, 53550.00, 'RON', 'Avans amenajare birouri - RESTANT', NOW()),
('f1100004-4444-4444-4444-444444444444', 'c1000000-0000-0000-0000-000000000001', 'd1100001-1111-1111-1111-111111111111', 'FACT-2025-0004', '2025-11-20', '2025-12-20', 'draft', 18000.00, 3420.00, 21420.00, 0.00, 21420.00, 'RON', 'Situație lucrări noiembrie - ciornă', NOW()),
-- ElectroPro Invoices
('f2200001-1111-1111-1111-111111111111', 'c2000000-0000-0000-0000-000000000002', 'd2200001-1111-1111-1111-111111111111', 'EP-2025-0001', '2025-10-20', '2025-11-05', 'paid', 42500.00, 8075.00, 50575.00, 50575.00, 0.00, 'RON', 'Avans instalație smart home', NOW()),
('f2200002-2222-2222-2222-222222222222', 'c2000000-0000-0000-0000-000000000002', 'd2200002-2222-2222-2222-222222222222', 'EP-2025-0002', '2025-09-25', '2025-10-25', 'pending', 28000.00, 5320.00, 33320.00, 15000.00, 18320.00, 'RON', 'Situație lucrări revizie hotel - partial plătit', NOW())
ON CONFLICT (id) DO NOTHING;


-- SECTION 5: EXPENSES
-- ============================================================
INSERT INTO expenses (id, company_id, expense_date, vendor_id, amount, currency, description, category, status, created_at)
VALUES
-- ConstructPro Expenses
('71100001-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000001', '2025-09-10', 'd1100003-3333-3333-3333-333333333333', 15000.00, 'RON', 'Ciment, nisip, pietriș - Vila Pipera', 'materials', 'approved', NOW()),
('71100002-2222-2222-2222-222222222222', 'c1000000-0000-0000-0000-000000000001', '2025-09-15', 'd1100003-3333-3333-3333-333333333333', 8500.00, 'RON', 'Cărămidă și BCA', 'materials', 'approved', NOW()),
('71100003-3333-3333-3333-333333333333', 'c1000000-0000-0000-0000-000000000001', '2025-10-01', NULL, 2500.00, 'RON', 'Închiriere schelă 1 lună', 'equipment', 'approved', NOW()),
('71100004-4444-4444-4444-444444444444', 'c1000000-0000-0000-0000-000000000001', '2025-10-20', NULL, 3200.00, 'RON', 'Combustibil vehicule octombrie', 'fuel', 'pending', NOW()),
-- ElectroPro Expenses
('72200001-1111-1111-1111-111111111111', 'c2000000-0000-0000-0000-000000000002', '2025-10-05', 'd2200003-3333-3333-3333-333333333333', 22000.00, 'RON', 'Echipamente KNX și senzori', 'materials', 'approved', NOW()),
('72200002-2222-2222-2222-222222222222', 'c2000000-0000-0000-0000-000000000002', '2025-10-10', 'd2200003-3333-3333-3333-333333333333', 8500.00, 'RON', 'Cabluri și conectori', 'materials', 'approved', NOW()),
('72200003-3333-3333-3333-333333333333', 'c2000000-0000-0000-0000-000000000002', '2025-10-15', NULL, 1500.00, 'RON', 'Scule și echipamente de măsură', 'equipment', 'pending', NOW())
ON CONFLICT (id) DO NOTHING;


-- SECTION 6: EMPLOYEES
-- ============================================================
INSERT INTO employees (id, company_id, employee_number, employment_type, department, position_title, hire_date, salary_amount, status, created_at)
VALUES
-- ConstructPro Employees
('81100001-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000001', 'CONSTR-001', 'full_time', 'Șantier', 'Maistru', '2020-03-01', 7500.00, 'active', NOW()),
('81100002-2222-2222-2222-222222222222', 'c1000000-0000-0000-0000-000000000001', 'CONSTR-002', 'full_time', 'Șantier', 'Zidar', '2021-06-15', 5500.00, 'active', NOW()),
('81100003-3333-3333-3333-333333333333', 'c1000000-0000-0000-0000-000000000001', 'CONSTR-003', 'full_time', 'Șantier', 'Zidar', '2022-01-10', 5000.00, 'active', NOW()),
('81100004-4444-4444-4444-444444444444', 'c1000000-0000-0000-0000-000000000001', 'CONSTR-004', 'part_time', 'Șantier', 'Muncitor necalificat', '2023-04-01', 3000.00, 'active', NOW()),
-- ElectroPro Employees
('82200001-1111-1111-1111-111111111111', 'c2000000-0000-0000-0000-000000000002', 'ELEC-001', 'full_time', 'Tehnic', 'Electrician autorizat', '2019-02-01', 8500.00, 'active', NOW()),
('82200002-2222-2222-2222-222222222222', 'c2000000-0000-0000-0000-000000000002', 'ELEC-002', 'full_time', 'Tehnic', 'Tehnician automatizări', '2021-08-15', 7000.00, 'active', NOW()),
('82200003-3333-3333-3333-333333333333', 'c2000000-0000-0000-0000-000000000002', 'ELEC-003', 'full_time', 'Tehnic', 'Electrician', '2022-05-01', 5500.00, 'active', NOW())
ON CONFLICT (id) DO NOTHING;


-- SECTION 7: TASKS
-- ============================================================
INSERT INTO tasks (id, company_id, project_id, title, description, status, priority, due_date, estimated_hours, created_at)
VALUES
-- ConstructPro Tasks
('91100001-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000001', 'e1100001-1111-1111-1111-111111111111', 'Demolare pereți interiori', 'Demolare pereți nestructurali parter și etaj', 'done', 'high', '2025-09-15', 40.00, NOW()),
('91100002-2222-2222-2222-222222222222', 'c1000000-0000-0000-0000-000000000001', 'e1100001-1111-1111-1111-111111111111', 'Instalație sanitară nouă', 'Montaj țevi și racorduri 3 băi', 'in_progress', 'high', '2025-11-15', 80.00, NOW()),
('91100003-3333-3333-3333-333333333333', 'c1000000-0000-0000-0000-000000000001', 'e1100001-1111-1111-1111-111111111111', 'Tencuieli interioare', 'Tencuire și gletuire toate camerele', 'todo', 'medium', '2025-12-01', 120.00, NOW()),
('91100004-4444-4444-4444-444444444444', 'c1000000-0000-0000-0000-000000000001', 'e1100002-2222-2222-2222-222222222222', 'Montaj compartimentări', 'Pereți din gips-carton zona birouri', 'in_progress', 'high', '2025-11-30', 60.00, NOW()),
-- ElectroPro Tasks
('92200001-1111-1111-1111-111111111111', 'c2000000-0000-0000-0000-000000000002', 'e2200001-1111-1111-1111-111111111111', 'Instalare panou KNX', 'Montaj și configurare panou central KNX', 'done', 'high', '2025-10-15', 16.00, NOW()),
('92200002-2222-2222-2222-222222222222', 'c2000000-0000-0000-0000-000000000002', 'e2200001-1111-1111-1111-111111111111', 'Cablare senzori', 'Instalare cabluri pentru toate zonele', 'in_progress', 'high', '2025-11-01', 40.00, NOW()),
('92200003-3333-3333-3333-333333333333', 'c2000000-0000-0000-0000-000000000002', 'e2200001-1111-1111-1111-111111111111', 'Configurare scenarii', 'Programare scenarii iluminat și climatizare', 'todo', 'medium', '2025-11-30', 24.00, NOW())
ON CONFLICT (id) DO NOTHING;


-- SECTION 8: TIME ENTRIES
-- ============================================================
INSERT INTO time_entries (id, company_id, project_id, employee_id, entry_date, hours, hourly_rate, description, is_billable, created_at)
VALUES
('01100001-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000001', 'e1100001-1111-1111-1111-111111111111', '81100001-1111-1111-1111-111111111111', '2025-10-25', 8.00, 75.00, 'Supraveghere lucrări sanitare', true, NOW()),
('01100002-2222-2222-2222-222222222222', 'c1000000-0000-0000-0000-000000000001', 'e1100001-1111-1111-1111-111111111111', '81100002-2222-2222-2222-222222222222', '2025-10-25', 8.00, 55.00, 'Zidărie pereți interiori', true, NOW()),
('01100003-3333-3333-3333-333333333333', 'c1000000-0000-0000-0000-000000000001', 'e1100001-1111-1111-1111-111111111111', '81100003-3333-3333-3333-333333333333', '2025-10-25', 8.00, 50.00, 'Zidărie pereți interiori', true, NOW()),
('01100004-4444-4444-4444-444444444444', 'c1000000-0000-0000-0000-000000000001', 'e1100002-2222-2222-2222-222222222222', '81100001-1111-1111-1111-111111111111', '2025-10-26', 6.00, 75.00, 'Coordonare echipă compartimentări', true, NOW()),
-- ElectroPro Time Entries
('02200001-1111-1111-1111-111111111111', 'c2000000-0000-0000-0000-000000000002', 'e2200001-1111-1111-1111-111111111111', '82200001-1111-1111-1111-111111111111', '2025-10-20', 8.00, 85.00, 'Montaj și configurare panou KNX', true, NOW()),
('02200002-2222-2222-2222-222222222222', 'c2000000-0000-0000-0000-000000000002', 'e2200001-1111-1111-1111-111111111111', '82200002-2222-2222-2222-222222222222', '2025-10-21', 8.00, 70.00, 'Cablare zonă living și dormitor master', true, NOW())
ON CONFLICT (id) DO NOTHING;


-- SECTION 9: PRODUCTS/INVENTORY
-- ============================================================
INSERT INTO products (id, company_id, sku, name, description, category, unit_of_measure, purchase_price, selling_price, vat_rate, track_inventory, reorder_level, is_active, created_at)
VALUES
-- ConstructPro Products
('51100001-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000001', 'MAT-CIM-001', 'Ciment Portland 42.5', 'Sac 50kg ciment pentru construcții', 'Materiale', 'sac', 28.00, 35.00, 19.00, true, 50, true, NOW()),
('51100002-2222-2222-2222-222222222222', 'c1000000-0000-0000-0000-000000000001', 'MAT-BCA-001', 'BCA 60x25x20', 'Bloc BCA standard', 'Materiale', 'buc', 8.50, 12.00, 19.00, true, 200, true, NOW()),
('51100003-3333-3333-3333-333333333333', 'c1000000-0000-0000-0000-000000000001', 'MAT-NIS-001', 'Nisip sortat', 'Nisip pentru construcții, mc', 'Materiale', 'mc', 80.00, 120.00, 19.00, true, 10, true, NOW()),
-- ElectroPro Products
('52200001-1111-1111-1111-111111111111', 'c2000000-0000-0000-0000-000000000002', 'ELEC-KNX-001', 'Actuator KNX 8 canale', 'Actuator pentru iluminat 8 ieșiri', 'Automatizări', 'buc', 450.00, 650.00, 19.00, true, 5, true, NOW()),
('52200002-2222-2222-2222-222222222222', 'c2000000-0000-0000-0000-000000000002', 'ELEC-SEN-001', 'Senzor prezență KNX', 'Senzor mișcare și luminozitate', 'Automatizări', 'buc', 180.00, 280.00, 19.00, true, 10, true, NOW()),
('52200003-3333-3333-3333-333333333333', 'c2000000-0000-0000-0000-000000000002', 'ELEC-CAB-001', 'Cablu KNX verde', 'Cablu bus KNX 100m', 'Cabluri', 'rola', 250.00, 380.00, 19.00, true, 5, true, NOW())
ON CONFLICT (id) DO NOTHING;


-- SECTION 10: VEHICLES (QuickDelivery)
-- ============================================================
INSERT INTO vehicles (id, company_id, registration_number, make, model, year, vehicle_type, fuel_type, capacity_kg, current_mileage, status, itp_expiry, insurance_expiry, created_at)
VALUES
('43300001-1111-1111-1111-111111111111', 'c3000000-0000-0000-0000-000000000003', 'B-123-QDV', 'Renault', 'Master', 2022, 'van', 'diesel', 1500.00, 45000, 'available', '2026-03-15', '2025-12-31', NOW()),
('43300002-2222-2222-2222-222222222222', 'c3000000-0000-0000-0000-000000000003', 'B-456-QDV', 'Mercedes', 'Sprinter', 2021, 'van', 'diesel', 2000.00, 78000, 'available', '2025-09-20', '2025-11-30', NOW()),
('43300003-3333-3333-3333-333333333333', 'c3000000-0000-0000-0000-000000000003', 'B-789-QDV', 'Dacia', 'Dokker', 2023, 'van', 'diesel', 800.00, 25000, 'in_use', '2026-06-10', '2026-01-15', NOW())
ON CONFLICT (id) DO NOTHING;


-- SECTION 11: SERVICE CALLS (ElectroPro)
-- ============================================================
INSERT INTO service_calls (id, company_id, call_number, customer_name, customer_phone, customer_email, service_address, service_type, problem_category, problem_description, priority, status, scheduled_date, assigned_technician, created_at)
VALUES
('32200001-1111-1111-1111-111111111111', 'c2000000-0000-0000-0000-000000000002', 'SVC-2025-001', 'Hotel Grand Plaza', '+40722222002', 'tehnic@grandplaza.ro', 'Bd. Unirii 50, București', 'repair', 'power_outage', 'Pană de curent etaj 3 - urgentă', 1, 'completed', '2025-10-15', '82200001-1111-1111-1111-111111111111', NOW()),
('32200002-2222-2222-2222-222222222222', 'c2000000-0000-0000-0000-000000000002', 'SVC-2025-002', 'Smart Home Residence', '+40722222001', 'admin@smarthome.ro', 'Str. Zorilor 25, Cluj-Napoca', 'maintenance', 'lighting', 'Verificare periodică sistem iluminat', 3, 'scheduled', '2025-11-20', '82200002-2222-2222-2222-222222222222', NOW()),
('32200003-3333-3333-3333-333333333333', 'c2000000-0000-0000-0000-000000000002', 'SVC-2025-003', 'Familie Ionescu', '+40723456789', 'ionescu@email.ro', 'Str. Republicii 15, București', 'installation', 'panel', 'Instalare tablou electric nou', 2, 'new', NULL, NULL, NOW())
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- VERIFY: Display counts after insert
-- ============================================================
SELECT 'company_users' as table_name, COUNT(*) as count FROM company_users WHERE company_id LIKE 'c%'
UNION ALL
SELECT 'contacts', COUNT(*) FROM contacts WHERE company_id LIKE 'c%'
UNION ALL
SELECT 'projects', COUNT(*) FROM projects WHERE company_id LIKE 'c%'
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices WHERE company_id LIKE 'c%'
UNION ALL
SELECT 'expenses', COUNT(*) FROM expenses WHERE company_id LIKE 'c%'
UNION ALL
SELECT 'employees', COUNT(*) FROM employees WHERE company_id LIKE 'c%'
UNION ALL
SELECT 'tasks', COUNT(*) FROM tasks WHERE company_id LIKE 'c%'
UNION ALL
SELECT 'products', COUNT(*) FROM products WHERE company_id LIKE 'c%'
UNION ALL
SELECT 'vehicles', COUNT(*) FROM vehicles WHERE company_id LIKE 'c%'
UNION ALL
SELECT 'service_calls', COUNT(*) FROM service_calls WHERE company_id LIKE 'c%';

-- ============================================================
-- END OF LINK TEST DATA
-- ============================================================
