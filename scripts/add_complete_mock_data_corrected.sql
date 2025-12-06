-- ===============================================
-- COMPREHENSIVE MOCK DATA FOR test_admin ACCOUNT
-- Company ID: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
-- User ID: 11111111-1111-1111-1111-111111111111
-- ===============================================

-- 1. BILLS (8 bills from various vendors)
INSERT INTO bills (company_id, vendor_id, bill_number, bill_date, due_date, status, total_amount, amount_paid, amount_due)
SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    id,
    'BILL-2025-' || LPAD(ROW_NUMBER() OVER()::text, 4, '0'),
    CURRENT_DATE - (random() * 90)::int,
    CURRENT_DATE - (random() * 90)::int + 30,
    (ARRAY['draft', 'pending', 'paid', 'overdue'])[floor(random() * 4 + 1)],
    (random() * 20000 + 1000)::numeric(15,2),
    CASE
        WHEN random() > 0.5 THEN (random() * 10000)::numeric(15,2)
        ELSE 0
    END,
    (random() * 10000 + 500)::numeric(15,2)
FROM contacts
WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  AND contact_type = 'supplier'
LIMIT 8;

-- 2. EXPENSE CATEGORIES (10 categories)
INSERT INTO expense_categories (company_id, category_name, parent_category, statement_section, is_tax_deductible, requires_receipt, is_custom, created_by)
VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Office Rent', NULL, 'operating_expenses', true, true, false, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Utilities', NULL, 'operating_expenses', true, true, false, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Office Supplies', NULL, 'operating_expenses', true, true, false, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Travel & Transportation', NULL, 'operating_expenses', true, true, false, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Meals & Entertainment', NULL, 'operating_expenses', true, true, false, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Software Subscriptions', NULL, 'operating_expenses', true, false, false, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Marketing & Advertising', NULL, 'operating_expenses', true, true, false, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Professional Services', NULL, 'operating_expenses', true, true, false, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Insurance', NULL, 'operating_expenses', true, true, false, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Equipment & Maintenance', NULL, 'operating_expenses', true, true, false, '11111111-1111-1111-1111-111111111111');

-- 3. EXPENSES (15 expenses across different categories)
INSERT INTO expenses (company_id, expense_date, vendor_id, amount, currency, description, category, status)
SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    CURRENT_DATE - (random() * 60)::int,
    c.id,
    (random() * 5000 + 100)::numeric(15,2),
    'RON',
    'Expense for ' || ec.category_name,
    ec.category_name,
    (ARRAY['pending', 'approved', 'paid'])[floor(random() * 3 + 1)]
FROM
    (SELECT id FROM contacts WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' AND contact_type = 'supplier' LIMIT 5) c
CROSS JOIN
    (SELECT category_name FROM expense_categories WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' LIMIT 3) ec
LIMIT 15;

-- 4. OPPORTUNITIES (10 opportunities in various stages)
INSERT INTO opportunities (company_id, contact_id, name, description, amount, currency, probability, expected_close_date, stage, assigned_to, source)
SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    id,
    'Opportunity: ' || display_name,
    'Potential deal with ' || display_name || ' for our services',
    (random() * 100000 + 10000)::numeric(15,2),
    'RON',
    (random() * 70 + 20)::int,
    CURRENT_DATE + (random() * 90)::int,
    (ARRAY['lead', 'qualified', 'proposal', 'negotiation', 'closed_won'])[floor(random() * 5 + 1)],
    '11111111-1111-1111-1111-111111111111',
    (ARRAY['website', 'referral', 'cold_call', 'email', 'social_media'])[floor(random() * 5 + 1)]
FROM contacts
WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  AND contact_type = 'customer'
LIMIT 10;

-- 5. PRODUCTS (12 products with inventory tracking)
INSERT INTO products (company_id, sku, name, description, category, unit_of_measure, purchase_price, selling_price, vat_rate, track_inventory, created_by)
VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'PROD-001', 'Professional Consulting - Hourly', 'Professional consulting services billed hourly', 'Services', 'ora', 200.00, 350.00, 19.00, false, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'PROD-002', 'Software Development Package', 'Custom software development project package', 'Services', 'proiect', 5000.00, 8500.00, 19.00, false, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'PROD-003', 'Website Hosting Annual', 'Annual website hosting and maintenance', 'Services', 'an', 300.00, 600.00, 19.00, false, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'PROD-004', 'Office Desk - Executive', 'Premium executive office desk', 'Furniture', 'buc', 1200.00, 2100.00, 19.00, true, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'PROD-005', 'Ergonomic Office Chair', 'High-end ergonomic office chair', 'Furniture', 'buc', 800.00, 1400.00, 19.00, true, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'PROD-006', 'Laptop - Business Grade', 'Business laptop with 3-year warranty', 'Electronics', 'buc', 3500.00, 5200.00, 19.00, true, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'PROD-007', 'Monitor 27" 4K', '27-inch 4K professional monitor', 'Electronics', 'buc', 1500.00, 2300.00, 19.00, true, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'PROD-008', 'Office Supplies Bundle', 'Monthly office supplies subscription', 'Supplies', 'luna', 200.00, 350.00, 19.00, false, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'PROD-009', 'Cloud Storage 1TB', '1TB cloud storage annual subscription', 'Services', 'an', 120.00, 250.00, 19.00, false, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'PROD-010', 'Video Conferencing License', 'Annual video conferencing platform license', 'Services', 'an', 150.00, 300.00, 19.00, false, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'PROD-011', 'Printer - Multifunction', 'Enterprise multifunction printer', 'Electronics', 'buc', 2000.00, 3200.00, 19.00, true, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'PROD-012', 'Training Session - Full Day', 'Full day training session for employees', 'Services', 'zi', 1500.00, 2800.00, 19.00, false, '11111111-1111-1111-1111-111111111111');

-- 6. PROJECTS (6 active projects)
INSERT INTO projects (company_id, name, description, client_id, status, start_date, end_date, budget, currency, is_billable, default_hourly_rate, created_by)
SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Project: ' || display_name,
    'Implementation project for ' || display_name,
    id,
    (ARRAY['active', 'planning', 'on_hold'])[floor(random() * 3 + 1)],
    CURRENT_DATE - (random() * 30)::int,
    CURRENT_DATE + (random() * 120)::int,
    (random() * 80000 + 20000)::numeric(15,2),
    'RON',
    true,
    350.00,
    '11111111-1111-1111-1111-111111111111'
FROM contacts
WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  AND contact_type = 'customer'
LIMIT 6;

-- 7. TIME ENTRIES (20 time entries across projects and employees)
INSERT INTO time_entries (company_id, employee_id, entry_date, hours, hourly_rate, description, is_billable, project_id)
SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    e.id,
    CURRENT_DATE - (random() * 30)::int,
    (random() * 7 + 1)::numeric(10,2),
    (random() * 200 + 150)::numeric(15,2),
    'Work on project tasks - ' || p.name,
    true,
    p.id
FROM
    (SELECT id FROM employees WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' LIMIT 5) e
CROSS JOIN
    (SELECT id, name FROM projects WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' LIMIT 4) p
LIMIT 20;

-- Display summary of added data
SELECT
    'Bills' as table_name, COUNT(*) as count
FROM bills WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT 'Expense Categories', COUNT(*) FROM expense_categories WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT 'Expenses', COUNT(*) FROM expenses WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT 'Opportunities', COUNT(*) FROM opportunities WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT 'Products', COUNT(*) FROM products WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT 'Projects', COUNT(*) FROM projects WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT 'Time Entries', COUNT(*) FROM time_entries WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT 'Invoices', COUNT(*) FROM invoices WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT 'Contacts', COUNT(*) FROM contacts WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT 'Employees', COUNT(*) FROM employees WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
