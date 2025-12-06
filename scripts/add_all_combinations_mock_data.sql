-- ===============================================
-- ALL COMBINATIONS MOCK DATA FOR test_admin
-- Covers every possible status, type, and variation
-- Company ID: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
-- ===============================================

-- 1. CONTACTS - All contact types with all variations
INSERT INTO contacts (company_id, contact_type, display_name, email, phone, address, city, country, tax_id, is_active)
VALUES
-- Customer contacts with different statuses
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'customer', 'Premium Client SRL', 'premium@client.ro', '+40721234567', 'Str. Premium 1', 'Bucharest', 'Romania', 'RO12345678', true),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'customer', 'Inactive Customer Ltd', 'inactive@customer.ro', '+40721234568', 'Str. Inactive 2', 'Cluj-Napoca', 'Romania', 'RO12345679', false),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'customer', 'VIP Enterprise SA', 'vip@enterprise.ro', '+40721234569', 'Str. VIP 3', 'Timisoara', 'Romania', 'RO12345680', true),
-- Supplier/Vendor contacts
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'supplier', 'Main Supplier SRL', 'main@supplier.ro', '+40721234570', 'Str. Supply 1', 'Bucharest', 'Romania', 'RO12345681', true),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'supplier', 'Backup Vendor SA', 'backup@vendor.ro', '+40721234571', 'Str. Backup 2', 'Iasi', 'Romania', 'RO12345682', true),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'vendor', 'Office Supplies Pro', 'office@supplies.ro', '+40721234572', 'Str. Office 3', 'Brasov', 'Romania', 'RO12345683', true),
-- Lead contacts (prospects)
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'lead', 'Potential Lead Corp', 'lead@potential.ro', '+40721234573', 'Str. Lead 1', 'Constanta', 'Romania', NULL, true),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'lead', 'Hot Prospect Inc', 'hot@prospect.ro', '+40721234574', 'Str. Hot 2', 'Sibiu', 'Romania', NULL, true);

-- 2. INVOICES - All possible statuses
INSERT INTO invoices (company_id, customer_id, invoice_number, invoice_date, due_date, status, total_amount, currency, notes)
SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    id,
    'INV-COMBO-' || status_val,
    CURRENT_DATE - 30,
    CURRENT_DATE - 30 +
        CASE status_val
            WHEN 'draft' THEN 60
            WHEN 'sent' THEN 45
            WHEN 'viewed' THEN 30
            WHEN 'pending' THEN 25
            WHEN 'partial' THEN 20
            WHEN 'paid' THEN 15
            WHEN 'overdue' THEN -5
            WHEN 'cancelled' THEN 30
            WHEN 'refunded' THEN 10
        END,
    status_val,
    (random() * 10000 + 1000)::numeric(15,2),
    'RON',
    'Invoice with status: ' || status_val
FROM contacts,
    UNNEST(ARRAY['draft', 'sent', 'viewed', 'pending', 'partial', 'paid', 'overdue', 'cancelled', 'refunded']) AS status_val
WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  AND contact_type = 'customer'
LIMIT 9;

-- 3. BILLS - All possible statuses
INSERT INTO bills (company_id, vendor_id, bill_number, bill_date, due_date, status, total_amount, amount_paid, amount_due)
SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    id,
    'BILL-COMBO-' || status_val,
    CURRENT_DATE - 20,
    CURRENT_DATE + 10,
    status_val,
    amount_val,
    CASE status_val
        WHEN 'paid' THEN amount_val
        WHEN 'partial' THEN amount_val * 0.5
        ELSE 0
    END,
    CASE status_val
        WHEN 'paid' THEN 0
        WHEN 'partial' THEN amount_val * 0.5
        ELSE amount_val
    END
FROM contacts,
    UNNEST(ARRAY['draft', 'pending', 'approved', 'paid', 'partial', 'overdue', 'cancelled', 'open']) AS status_val,
    UNNEST(ARRAY[5000.00, 3000.00, 8000.00, 4500.00, 6000.00, 2500.00, 1000.00, 7500.00]) AS amount_val
WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  AND contact_type = 'supplier'
LIMIT 8;

-- 4. EXPENSES - All statuses and categories
INSERT INTO expenses (company_id, expense_date, vendor_id, amount, currency, description, category, status)
SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    CURRENT_DATE - (random() * 60)::int,
    v.id,
    (random() * 3000 + 200)::numeric(15,2),
    'RON',
    'Expense: ' || ec.category_name || ' - Status: ' || s.status_val,
    ec.category_name,
    s.status_val
FROM
    (SELECT id FROM contacts WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' AND contact_type = 'supplier' LIMIT 3) v
CROSS JOIN
    (SELECT category_name FROM expense_categories WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' LIMIT 4) ec
CROSS JOIN
    UNNEST(ARRAY['pending', 'approved', 'rejected', 'paid', 'reimbursed']) AS s(status_val)
LIMIT 15;

-- 5. OPPORTUNITIES - All stages and sources
INSERT INTO opportunities (company_id, contact_id, name, description, amount, currency, probability, expected_close_date, stage, assigned_to, source, campaign)
SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    c.id,
    'Opp: ' || stage_val || ' from ' || source_val,
    'Opportunity in ' || stage_val || ' stage from ' || source_val,
    (random() * 80000 + 5000)::numeric(15,2),
    'RON',
    CASE stage_val
        WHEN 'lead' THEN 10
        WHEN 'qualified' THEN 25
        WHEN 'proposal' THEN 50
        WHEN 'negotiation' THEN 75
        WHEN 'closed_won' THEN 100
        WHEN 'closed_lost' THEN 0
    END,
    CURRENT_DATE + (random() * 90)::int,
    stage_val,
    '11111111-1111-1111-1111-111111111111',
    source_val,
    CASE source_val
        WHEN 'website' THEN 'SEO Campaign 2025'
        WHEN 'referral' THEN 'Partner Referral Program'
        WHEN 'cold_call' THEN 'Q1 Outbound Campaign'
        WHEN 'email' THEN 'Email Marketing Campaign'
        WHEN 'social_media' THEN 'LinkedIn Ads'
        WHEN 'event' THEN 'Trade Show 2025'
    END
FROM
    (SELECT id FROM contacts WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' AND contact_type IN ('customer', 'lead') LIMIT 6) c
CROSS JOIN
    UNNEST(ARRAY['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']) AS stage_val
CROSS JOIN
    UNNEST(ARRAY['website', 'referral', 'cold_call', 'email', 'social_media', 'event']) AS source_val
LIMIT 20;

-- 6. PRODUCTS - All categories and types
INSERT INTO products (company_id, sku, name, description, category, subcategory, brand, unit_of_measure, purchase_price, selling_price, min_selling_price, vat_rate, track_inventory, allow_negative_stock, is_active, is_sellable, is_purchasable, created_by)
VALUES
-- Electronics
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ELEC-001', 'Gaming Laptop Pro', 'High-end gaming laptop', 'Electronics', 'Computers', 'TechBrand', 'buc', 4500.00, 6800.00, 6000.00, 19.00, true, false, true, true, true, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ELEC-002', 'Wireless Mouse Premium', 'Ergonomic wireless mouse', 'Electronics', 'Accessories', 'TechBrand', 'buc', 150.00, 280.00, 250.00, 19.00, true, false, true, true, true, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ELEC-003', 'USB-C Hub 7-Port', '7-port USB-C hub', 'Electronics', 'Accessories', 'TechBrand', 'buc', 120.00, 220.00, 200.00, 19.00, true, true, true, true, true, '11111111-1111-1111-1111-111111111111'),
-- Furniture
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'FURN-001', 'Standing Desk Electric', 'Electric standing desk', 'Furniture', 'Desks', 'OfficePro', 'buc', 1800.00, 3200.00, 2900.00, 19.00, true, false, true, true, true, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'FURN-002', 'Filing Cabinet 4-Drawer', '4-drawer filing cabinet', 'Furniture', 'Storage', 'OfficePro', 'buc', 600.00, 1100.00, 1000.00, 19.00, true, false, true, true, true, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'FURN-003', 'Conference Table 8-Seat', 'Large conference table', 'Furniture', 'Tables', 'OfficePro', 'buc', 2500.00, 4200.00, 3800.00, 19.00, true, false, false, false, true, '11111111-1111-1111-1111-111111111111'),
-- Supplies
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SUPP-001', 'Printer Paper A4 Box', 'Box of 2500 sheets A4', 'Supplies', 'Paper', 'Generic', 'cutie', 80.00, 150.00, 140.00, 19.00, true, true, true, true, true, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SUPP-002', 'Toner Cartridge Black', 'Black toner cartridge', 'Supplies', 'Printer', 'Generic', 'buc', 180.00, 320.00, 300.00, 19.00, true, false, true, true, true, '11111111-1111-1111-1111-111111111111'),
-- Services (non-inventory)
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SERV-001', 'IT Support Monthly', 'Monthly IT support package', 'Services', 'IT', NULL, 'luna', 800.00, 1500.00, 1400.00, 19.00, false, false, true, true, false, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SERV-002', 'Accounting Services Hourly', 'Professional accounting services', 'Services', 'Finance', NULL, 'ora', 150.00, 300.00, 280.00, 19.00, false, false, true, true, false, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SERV-003', 'Marketing Campaign', 'Full marketing campaign service', 'Services', 'Marketing', NULL, 'proiect', 5000.00, 12000.00, 11000.00, 19.00, false, false, true, true, false, '11111111-1111-1111-1111-111111111111');

-- 7. PROJECTS - All statuses, methodologies, health statuses, priorities
INSERT INTO projects (company_id, name, description, client_id, status, start_date, end_date, budget, currency, is_billable, default_hourly_rate, methodology, health_status, priority, created_by)
SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Project: ' || status_val || ' - ' || priority_val,
    'Project with status ' || status_val || ', priority ' || priority_val || ', health: ' || health_val,
    c.id,
    status_val,
    CURRENT_DATE - 30,
    CURRENT_DATE + 60,
    (random() * 60000 + 10000)::numeric(15,2),
    'RON',
    true,
    (random() * 200 + 200)::numeric(15,2),
    methodology_val,
    health_val,
    priority_val,
    '11111111-1111-1111-1111-111111111111'
FROM
    (SELECT id FROM contacts WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' AND contact_type = 'customer' LIMIT 5) c
CROSS JOIN
    UNNEST(ARRAY['active', 'planning', 'on_hold', 'completed', 'cancelled']) AS status_val
CROSS JOIN
    UNNEST(ARRAY['agile', 'scrum', 'kanban', 'waterfall', 'hybrid']) AS methodology_val
CROSS JOIN
    UNNEST(ARRAY['on_track', 'at_risk', 'critical', 'on_hold', 'completed']) AS health_val
CROSS JOIN
    UNNEST(ARRAY['low', 'medium', 'high', 'critical']) AS priority_val
LIMIT 15;

-- 8. TIME ENTRIES - All statuses and types
INSERT INTO time_entries (company_id, employee_id, customer_id, project_id, entry_date, hours, hourly_rate, description, is_billable, status, time_entry_type)
SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    e.id,
    c.id,
    p.id,
    CURRENT_DATE - (random() * 30)::int,
    (random() * 8 + 1)::numeric(10,2),
    (random() * 200 + 150)::numeric(15,2),
    'Time entry: ' || status_val || ' - ' || type_val,
    CASE WHEN random() > 0.3 THEN true ELSE false END,
    status_val,
    type_val
FROM
    (SELECT id FROM employees WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' LIMIT 3) e
CROSS JOIN
    (SELECT id FROM contacts WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' AND contact_type = 'customer' LIMIT 2) c
CROSS JOIN
    (SELECT id FROM projects WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' LIMIT 2) p
CROSS JOIN
    UNNEST(ARRAY['pending', 'approved', 'rejected', 'disputed', 'under_review']) AS status_val
CROSS JOIN
    UNNEST(ARRAY['regular', 'overtime', 'holiday', 'on_call', 'training']) AS type_val
LIMIT 25;

-- 9. ADDITIONAL EXPENSE CATEGORIES - All statement sections
INSERT INTO expense_categories (company_id, category_name, parent_category, statement_section, is_tax_deductible, requires_receipt, is_custom, created_by)
VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Cost of Goods Sold', NULL, 'cost_of_goods_sold', true, true, true, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Sales Expenses', NULL, 'operating_expenses', true, true, true, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Administrative Costs', NULL, 'operating_expenses', true, true, true, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'R&D Expenses', NULL, 'operating_expenses', true, true, true, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Depreciation', NULL, 'non_operating_expenses', true, false, true, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Interest Expenses', NULL, 'non_operating_expenses', true, true, true, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Bank Fees', NULL, 'non_operating_expenses', true, true, true, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Non-Deductible Expenses', NULL, 'operating_expenses', false, true, true, '11111111-1111-1111-1111-111111111111');

-- Display comprehensive summary
SELECT
    'ADDED IN THIS BATCH' as section,
    'Contacts' as data_type,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '5 minutes')::text as new_count
FROM contacts WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT 'ADDED IN THIS BATCH', 'Invoices', COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '5 minutes')::text
FROM invoices WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT 'ADDED IN THIS BATCH', 'Bills', COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '5 minutes')::text
FROM bills WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT 'ADDED IN THIS BATCH', 'Expenses', COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '5 minutes')::text
FROM expenses WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT 'ADDED IN THIS BATCH', 'Expense Categories', COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '5 minutes')::text
FROM expense_categories WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT 'ADDED IN THIS BATCH', 'Opportunities', COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '5 minutes')::text
FROM opportunities WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT 'ADDED IN THIS BATCH', 'Products', COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '5 minutes')::text
FROM products WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT 'ADDED IN THIS BATCH', 'Projects', COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '5 minutes')::text
FROM projects WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT 'ADDED IN THIS BATCH', 'Time Entries', COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '5 minutes')::text
FROM time_entries WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT '', '', ''
UNION ALL
SELECT 'TOTAL IN DATABASE', 'Contacts', COUNT(*)::text
FROM contacts WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT 'TOTAL IN DATABASE', 'Invoices', COUNT(*)::text
FROM invoices WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT 'TOTAL IN DATABASE', 'Bills', COUNT(*)::text
FROM bills WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT 'TOTAL IN DATABASE', 'Expenses', COUNT(*)::text
FROM expenses WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT 'TOTAL IN DATABASE', 'Expense Categories', COUNT(*)::text
FROM expense_categories WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT 'TOTAL IN DATABASE', 'Opportunities', COUNT(*)::text
FROM opportunities WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT 'TOTAL IN DATABASE', 'Products', COUNT(*)::text
FROM products WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT 'TOTAL IN DATABASE', 'Projects', COUNT(*)::text
FROM projects WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT 'TOTAL IN DATABASE', 'Time Entries', COUNT(*)::text
FROM time_entries WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
