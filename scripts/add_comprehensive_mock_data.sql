-- Comprehensive Mock Data for test_admin@accountech.com
-- Company ID: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
-- User ID: 11111111-1111-1111-1111-111111111111

\c accountech_production

-- =====================================================
-- 1. CONTACTS (Customers, Suppliers, Employees)
-- =====================================================

-- Customer Contacts
INSERT INTO contacts (id, company_id, contact_type, display_name, email, phone, payment_terms, currency, is_active)
VALUES
('c1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'customer', 'SC Tech Solutions SRL', 'contact@techsolutions.ro', '+40721234567', 30, 'RON', true),
('c2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'customer', 'ABC Commerce SA', 'office@abccommerce.ro', '+40722345678', 15, 'RON', true),
('c3333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'customer', 'Digital Media Group', 'info@digitalmedia.ro', '+40723456789', 45, 'RON', true),
('c4444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'customer', 'Retail Plus SRL', 'contact@retailplus.ro', '+40724567890', 30, 'RON', true),
('c5555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'customer', 'Consulting Partners', 'office@consulting.ro', '+40725678901', 60, 'RON', true)
ON CONFLICT (id) DO NOTHING;

-- Supplier Contacts
INSERT INTO contacts (id, company_id, contact_type, display_name, email, phone, payment_terms, currency, is_active)
VALUES
('s1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'supplier', 'Office Supplies Pro', 'orders@officesupplies.ro', '+40731234567', 30, 'RON', true),
('s2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'supplier', 'Tech Hardware Distributors', 'sales@techhw.ro', '+40732345678', 15, 'RON', true),
('s3333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'supplier', 'Cloud Services Provider', 'billing@cloudpro.ro', '+40733456789', 7, 'RON', true),
('s4444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'supplier', 'Marketing Agency', 'hello@marketingpro.ro', '+40734567890', 30, 'RON', true)
ON CONFLICT (id) DO NOTHING;

-- Employee Contacts (already exist but let's ensure they're there)
INSERT INTO contacts (id, company_id, contact_type, display_name, email, phone, is_active)
VALUES
('9c5affaf-aad8-4d39-a83b-4a00fc8183a8', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'employee', 'Ion Popescu', 'ion.popescu@testcompany.com', '+40741111111', true),
('92c81f40-1aee-4d69-b732-22cec5dc9df7', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'employee', 'Maria Ionescu', 'maria.ionescu@testcompany.com', '+40742222222', true),
('62151df6-805f-44ac-9095-96bc986501e3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'employee', 'Andrei Dumitrescu', 'andrei.dumitrescu@testcompany.com', '+40743333333', true),
('e4444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'employee', 'Elena Georgescu', 'elena.georgescu@testcompany.com', '+40744444444', true),
('e5555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'employee', 'Mihai Constantinescu', 'mihai.const@testcompany.com', '+40745555555', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. EMPLOYEES
-- =====================================================

-- Add new employees
INSERT INTO employees (id, company_id, contact_id, employee_number, employment_type, department, position_title, hire_date, salary_amount, status)
VALUES
('e4444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'e4444444-4444-4444-4444-444444444444', 'EMP004', 'full_time', 'Sales', 'Sales Manager', '2024-03-01', 7000.00, 'active'),
('e5555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'e5555555-5555-5555-5555-555555555555', 'EMP005', 'full_time', 'Marketing', 'Marketing Specialist', '2024-06-15', 5500.00, 'active')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 3. INVOICES (Customer Sales)
-- =====================================================

INSERT INTO invoices (id, company_id, customer_id, invoice_number, invoice_date, due_date, status, subtotal, tax_amount, total_amount, currency, notes)
VALUES
-- January invoices
('i1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1111111-1111-1111-1111-111111111111', 'INV-2025-001', '2025-01-15', '2025-02-14', 'paid', 10000.00, 1900.00, 11900.00, 'RON', 'Web development services - January'),
('i1111111-1111-1111-1111-111111111112', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c2222222-2222-2222-2222-222222222222', 'INV-2025-002', '2025-01-20', '2025-02-04', 'paid', 5000.00, 950.00, 5950.00, 'RON', 'Consulting services'),
-- February invoices
('i2222222-2222-2222-2222-222222222221', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c3333333-3333-3333-3333-333333333333', 'INV-2025-003', '2025-02-10', '2025-03-12', 'paid', 15000.00, 2850.00, 17850.00, 'RON', 'Digital marketing campaign'),
('i2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c4444444-4444-4444-4444-444444444444', 'INV-2025-004', '2025-02-25', '2025-03-27', 'sent', 8000.00, 1520.00, 9520.00, 'RON', 'E-commerce platform setup'),
-- March invoices
('i3333333-3333-3333-3333-333333333331', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c5555555-5555-5555-5555-555555555555', 'INV-2025-005', '2025-03-05', '2025-04-04', 'sent', 12000.00, 2280.00, 14280.00, 'RON', 'Business consulting Q1'),
('i3333333-3333-3333-3333-333333333332', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1111111-1111-1111-1111-111111111111', 'INV-2025-006', '2025-03-20', '2025-04-19', 'draft', 7500.00, 1425.00, 8925.00, 'RON', 'Mobile app development'),
-- April invoices
('i4444444-4444-4444-4444-444444444441', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c2222222-2222-2222-2222-222222222222', 'INV-2025-007', '2025-04-12', '2025-04-27', 'sent', 6000.00, 1140.00, 7140.00, 'RON', 'SEO optimization services'),
-- October/November (recent)
('i1010101-1010-1010-1010-101010101010', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c3333333-3333-3333-3333-333333333333', 'INV-2025-008', '2025-10-15', '2025-11-14', 'sent', 20000.00, 3800.00, 23800.00, 'RON', 'Annual maintenance contract'),
('i1111111-1111-1111-1111-111111111119', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c4444444-4444-4444-4444-444444444444', 'INV-2025-009', '2025-11-01', '2025-12-01', 'sent', 9500.00, 1805.00, 11305.00, 'RON', 'Cloud infrastructure setup'),
('i1111111-1111-1111-1111-111111111120', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c5555555-5555-5555-5555-555555555555', 'INV-2025-010', '2025-11-20', '2025-12-20', 'draft', 11000.00, 2090.00, 13090.00, 'RON', 'Q4 business strategy')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 4. BILLS (Supplier Purchases)
-- =====================================================

INSERT INTO bills (id, company_id, supplier_id, bill_number, bill_date, due_date, status, subtotal, tax_amount, total_amount, currency, notes)
VALUES
-- January bills
('b1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 's1111111-1111-1111-1111-111111111111', 'BILL-2025-001', '2025-01-10', '2025-02-09', 'paid', 2000.00, 380.00, 2380.00, 'RON', 'Office supplies Q1'),
('b1111111-1111-1111-1111-111111111112', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 's3333333-3333-3333-3333-333333333333', 'BILL-2025-002', '2025-01-15', '2025-01-22', 'paid', 3500.00, 665.00, 4165.00, 'RON', 'Cloud hosting - January'),
-- February bills
('b2222222-2222-2222-2222-222222222221', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 's2222222-2222-2222-2222-222222222222', 'BILL-2025-003', '2025-02-05', '2025-02-20', 'paid', 8000.00, 1520.00, 9520.00, 'RON', 'New laptops and hardware'),
('b2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 's4444444-4444-4444-4444-444444444444', 'BILL-2025-004', '2025-02-20', '2025-03-22', 'pending', 5000.00, 950.00, 5950.00, 'RON', 'Marketing campaign Q1'),
-- March bills
('b3333333-3333-3333-3333-333333333331', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 's3333333-3333-3333-3333-333333333333', 'BILL-2025-005', '2025-03-01', '2025-03-08', 'paid', 3500.00, 665.00, 4165.00, 'RON', 'Cloud hosting - March'),
-- October/November (recent)
('b1010101-1010-1010-1010-101010101010', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 's1111111-1111-1111-1111-111111111111', 'BILL-2025-006', '2025-10-15', '2025-11-14', 'pending', 1500.00, 285.00, 1785.00, 'RON', 'Office supplies Q4'),
('b1111111-1111-1111-1111-111111111119', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 's3333333-3333-3333-3333-333333333333', 'BILL-2025-007', '2025-11-01', '2025-11-08', 'paid', 3500.00, 665.00, 4165.00, 'RON', 'Cloud hosting - November'),
('b1111111-1111-1111-1111-111111111120', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 's2222222-2222-2222-2222-222222222222', 'BILL-2025-008', '2025-11-18', '2025-12-03', 'pending', 4500.00, 855.00, 5355.00, 'RON', 'IT equipment upgrade')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 5. EXPENSE CATEGORIES
-- =====================================================

INSERT INTO expense_categories (id, company_id, name, description, color, is_active)
VALUES
('ec111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Travel', 'Business travel and accommodation', '#3B82F6', true),
('ec222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Meals & Entertainment', 'Client meals and business entertainment', '#10B981', true),
('ec333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Utilities', 'Electricity, water, internet', '#F59E0B', true),
('ec444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Software Subscriptions', 'SaaS and software licenses', '#8B5CF6', true),
('ec555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Office Rent', 'Monthly office space rental', '#EF4444', true),
('ec666666-6666-6666-6666-666666666666', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Marketing', 'Advertising and promotional costs', '#EC4899', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 6. EXPENSES
-- =====================================================

INSERT INTO expenses (id, company_id, category_id, expense_date, amount, currency, description, payment_method, status, created_by)
VALUES
-- January expenses
('ex111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ec111111-1111-1111-1111-111111111111', '2025-01-12', 850.00, 'RON', 'Flight to Bucharest - client meeting', 'credit_card', 'approved', '11111111-1111-1111-1111-111111111111'),
('ex111111-1111-1111-1111-111111111112', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ec222222-2222-2222-2222-222222222222', '2025-01-15', 320.00, 'RON', 'Lunch with client - Tech Solutions', 'cash', 'approved', '11111111-1111-1111-1111-111111111111'),
('ex111111-1111-1111-1111-111111111113', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ec333333-3333-3333-3333-333333333333', '2025-01-25', 450.00, 'RON', 'Office electricity - January', 'bank_transfer', 'approved', '11111111-1111-1111-1111-111111111111'),
-- February expenses
('ex222222-2222-2222-2222-222222222221', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ec444444-4444-4444-4444-444444444444', '2025-02-05', 1200.00, 'RON', 'Adobe Creative Cloud - Annual', 'credit_card', 'approved', '11111111-1111-1111-1111-111111111111'),
('ex222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ec555555-5555-5555-5555-555555555555', '2025-02-01', 3000.00, 'RON', 'Office rent - February', 'bank_transfer', 'approved', '11111111-1111-1111-1111-111111111111'),
-- March expenses
('ex333333-3333-3333-3333-333333333331', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ec666666-6666-6666-6666-666666666666', '2025-03-10', 2500.00, 'RON', 'Google Ads campaign', 'credit_card', 'approved', '11111111-1111-1111-1111-111111111111'),
('ex333333-3333-3333-3333-333333333332', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ec555555-5555-5555-5555-555555555555', '2025-03-01', 3000.00, 'RON', 'Office rent - March', 'bank_transfer', 'approved', '11111111-1111-1111-1111-111111111111'),
-- October/November (recent)
('ex101010-1010-1010-1010-101010101010', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ec555555-5555-5555-5555-555555555555', '2025-10-01', 3000.00, 'RON', 'Office rent - October', 'bank_transfer', 'approved', '11111111-1111-1111-1111-111111111111'),
('ex111111-1111-1111-1111-111111111119', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ec555555-5555-5555-5555-555555555555', '2025-11-01', 3000.00, 'RON', 'Office rent - November', 'bank_transfer', 'approved', '11111111-1111-1111-1111-111111111111'),
('ex111111-1111-1111-1111-111111111120', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ec111111-1111-1111-1111-111111111111', '2025-11-15', 1200.00, 'RON', 'Conference attendance - Cluj', 'credit_card', 'pending', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 7. CRM - LEADS
-- =====================================================

INSERT INTO leads (id, company_id, name, email, phone, company_name, status, source, estimated_value, currency, notes, created_by)
VALUES
('l1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Alexandru Ionescu', 'alex@startup.ro', '+40751111111', 'Startup Innovations SRL', 'qualified', 'website', 25000.00, 'RON', 'Interested in complete web platform', '11111111-1111-1111-1111-111111111111'),
('l2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Cristina Popescu', 'cristina@ecommerce.ro', '+40752222222', 'E-Shop Plus', 'contacted', 'referral', 35000.00, 'RON', 'E-commerce platform development', '11111111-1111-1111-1111-111111111111'),
('l3333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Mihai Radu', 'mihai@consulting.ro', '+40753333333', 'Business Consulting Pro', 'new', 'linkedin', 15000.00, 'RON', 'Custom CRM solution needed', '11111111-1111-1111-1111-111111111111'),
('l4444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Elena Vasilescu', 'elena@healthtech.ro', '+40754444444', 'HealthTech Solutions', 'qualified', 'conference', 50000.00, 'RON', 'Healthcare management system', '11111111-1111-1111-1111-111111111111'),
('l5555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'George Marin', 'george@logistics.ro', '+40755555555', 'FastDelivery Logistics', 'contacted', 'email', 40000.00, 'RON', 'Fleet management software', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 8. CRM - OPPORTUNITIES
-- =====================================================

INSERT INTO opportunities (id, company_id, contact_id, name, stage, amount, currency, probability, expected_close_date, status, notes, created_by)
VALUES
('o1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1111111-1111-1111-1111-111111111111', 'Tech Solutions - Phase 2', 'negotiation', 45000.00, 'RON', 75, '2025-12-15', 'open', 'Second phase of web development project', '11111111-1111-1111-1111-111111111111'),
('o2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c3333333-3333-3333-3333-333333333333', 'Digital Media - Annual Contract', 'proposal', 120000.00, 'RON', 60, '2025-12-31', 'open', 'Full year marketing services contract', '11111111-1111-1111-1111-111111111111'),
('o3333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c5555555-5555-5555-5555-555555555555', 'Consulting Partners - Q1 2026', 'qualification', 80000.00, 'RON', 40, '2026-01-31', 'open', 'Business consulting for next quarter', '11111111-1111-1111-1111-111111111111'),
('o4444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c2222222-2222-2222-2222-222222222222', 'ABC Commerce - Mobile App', 'proposal', 95000.00, 'RON', 70, '2026-02-28', 'open', 'iOS and Android mobile app development', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 9. INVENTORY - PRODUCTS
-- =====================================================

INSERT INTO products (id, company_id, name, sku, description, category, unit_price, cost_price, stock_quantity, reorder_level, unit_of_measure, status)
VALUES
('p1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Premium Web Hosting', 'WH-PREM-001', 'Premium web hosting package - 50GB SSD', 'Services', 150.00, 50.00, 100, 20, 'subscription', 'active'),
('p2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SSL Certificate', 'SSL-WILD-001', 'Wildcard SSL certificate - 1 year', 'Services', 350.00, 120.00, 50, 10, 'unit', 'active'),
('p3333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SEO Optimization Package', 'SEO-BASIC-001', 'Basic SEO package - keyword research, on-page optimization', 'Services', 1200.00, 400.00, 999, 0, 'package', 'active'),
('p4444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Custom WordPress Theme', 'WP-THEME-001', 'Custom WordPress theme development', 'Digital Products', 2500.00, 800.00, 25, 5, 'unit', 'active'),
('p5555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Email Marketing Campaign', 'EM-CAMP-001', 'Professional email marketing campaign setup', 'Services', 800.00, 250.00, 999, 0, 'package', 'active')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 10. PROJECTS
-- =====================================================

INSERT INTO projects (id, company_id, name, client_id, status, start_date, end_date, budget, currency, description, created_by)
VALUES
('pr111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tech Solutions Web Platform', 'c1111111-1111-1111-1111-111111111111', 'in_progress', '2025-01-15', '2025-12-31', 150000.00, 'RON', 'Complete web platform development with CMS and e-commerce', '11111111-1111-1111-1111-111111111111'),
('pr222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Digital Media Campaign Q4', 'c3333333-3333-3333-3333-333333333333', 'in_progress', '2025-10-01', '2025-12-31', 60000.00, 'RON', 'Q4 digital marketing campaign across all channels', '11111111-1111-1111-1111-111111111111'),
('pr333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Retail Plus E-commerce', 'c4444444-4444-4444-4444-444444444444', 'completed', '2025-02-01', '2025-09-30', 85000.00, 'RON', 'Full e-commerce platform with payment gateway integration', '11111111-1111-1111-1111-111111111111'),
('pr444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Consulting Partners Analysis', 'c5555555-5555-5555-5555-555555555555', 'planning', '2025-11-01', '2026-03-31', 120000.00, 'RON', 'Business process analysis and optimization consulting', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 11. TIME ENTRIES
-- =====================================================

INSERT INTO time_entries (id, company_id, employee_id, project_id, entry_date, hours, description, billable, hourly_rate, created_by)
VALUES
-- Ion Popescu time entries
('t1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '05414e4e-0349-4eb2-b3a0-206da94a6da6', 'pr111111-1111-1111-1111-111111111111', '2025-11-18', 8.0, 'Backend API development', true, 150.00, '11111111-1111-1111-1111-111111111111'),
('t1111111-1111-1111-1111-111111111112', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '05414e4e-0349-4eb2-b3a0-206da94a6da6', 'pr111111-1111-1111-1111-111111111111', '2025-11-19', 7.5, 'Database optimization', true, 150.00, '11111111-1111-1111-1111-111111111111'),
-- Maria Ionescu time entries
('t2222222-2222-2222-2222-222222222221', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '1fe4c59a-161c-4098-b6ca-3c9f6e8db11a', 'pr222222-2222-2222-2222-222222222222', '2025-11-18', 6.0, 'Social media content creation', true, 120.00, '11111111-1111-1111-1111-111111111111'),
('t2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '1fe4c59a-161c-4098-b6ca-3c9f6e8db11a', 'pr222222-2222-2222-2222-222222222222', '2025-11-19', 8.0, 'Campaign analytics and reporting', true, 120.00, '11111111-1111-1111-1111-111111111111'),
-- Andrei Dumitrescu time entries
('t3333333-3333-3333-3333-333333333331', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '3b3216c5-8c88-4a18-9074-f4f1f51aff44', 'pr111111-1111-1111-1111-111111111111', '2025-11-20', 8.0, 'Frontend UI/UX implementation', true, 130.00, '11111111-1111-1111-1111-111111111111'),
('t3333333-3333-3333-3333-333333333332', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '3b3216c5-8c88-4a18-9074-f4f1f51aff44', 'pr111111-1111-1111-1111-111111111111', '2025-11-21', 7.0, 'Responsive design testing', true, 130.00, '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 12. Update company tax_id
-- =====================================================

UPDATE companies
SET tax_id = 'RO12345678',
    legal_name = 'Test Company SRL',
    industry = 'Information Technology'
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

COMMIT;

-- Print summary
SELECT 'Mock data inserted successfully!' as status;
SELECT 'Contacts: ' || count(*) as count FROM contacts WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
SELECT 'Employees: ' || count(*) as count FROM employees WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
SELECT 'Invoices: ' || count(*) as count FROM invoices WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
SELECT 'Bills: ' || count(*) as count FROM bills WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
SELECT 'Expenses: ' || count(*) as count FROM expenses WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
SELECT 'Leads: ' || count(*) as count FROM leads WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
SELECT 'Opportunities: ' || count(*) as count FROM opportunities WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
SELECT 'Products: ' || count(*) as count FROM products WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
SELECT 'Projects: ' || count(*) as count FROM projects WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
SELECT 'Time Entries: ' || count(*) as count FROM time_entries WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
