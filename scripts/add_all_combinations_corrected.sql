-- ===============================================
-- ALL COMBINATIONS MOCK DATA - CORRECTED
-- Covers every possible status, type, and variation
-- Company ID: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
-- ===============================================

-- 1. CONTACTS - All contact types (using correct schema)
INSERT INTO contacts (company_id, contact_type, display_name, email, phone, payment_terms, currency, is_active)
VALUES
-- Customer contacts
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'customer', 'Premium Enterprise SRL', 'premium@enterprise.ro', '+40721111001', 30, 'RON', true),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'customer', 'Corporate Clients Ltd', 'corporate@clients.ro', '+40721111002', 45, 'RON', true),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'customer', 'Inactive Client SA', 'inactive@client.ro', '+40721111003', 30, 'RON', false),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'customer', 'VIP Customer Corp', 'vip@customer.ro', '+40721111004', 15, 'RON', true),
-- Supplier contacts
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'supplier', 'Primary Supplier SRL', 'primary@supplier.ro', '+40721111005', 60, 'RON', true),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'supplier', 'Secondary Vendor SA', 'secondary@vendor.ro', '+40721111006', 45, 'RON', true),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'supplier', 'Equipment Provider', 'equipment@provider.ro', '+40721111007', 30, 'RON', true),
-- Vendor contacts
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'vendor', 'Office Supplies Plus', 'supplies@plus.ro', '+40721111008', 30, 'RON', true),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'vendor', 'Software Licensing Co', 'software@licensing.ro', '+40721111009', 15, 'RON', true),
-- Lead contacts
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'lead', 'Potential Enterprise', 'potential@enterprise.ro', '+40721111010', 30, 'RON', true),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'lead', 'Prospect Corporation', 'prospect@corp.ro', '+40721111011', 30, 'RON', true);

-- 2. INVOICES - All possible statuses (using correct schema - no notes column)
INSERT INTO invoices (company_id, customer_id, invoice_number, invoice_date, due_date, status, total_amount, currency)
SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    c.id,
    'INV-STATUS-' || UPPER(SUBSTRING(status_val, 1, 3)) || '-' || ROW_NUMBER() OVER(),
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
    1000.00 + (ROW_NUMBER() OVER() * 1000),
    'RON'
FROM
    (SELECT id FROM contacts WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' AND contact_type = 'customer' ORDER BY created_at DESC LIMIT 1) c
CROSS JOIN
    UNNEST(ARRAY['draft', 'sent', 'viewed', 'pending', 'partial', 'paid', 'overdue', 'cancelled', 'refunded']) AS status_val;

-- 3. BILLS - All possible statuses
INSERT INTO bills (company_id, vendor_id, bill_number, bill_date, due_date, status, total_amount, amount_paid, amount_due)
SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    v.id,
    'BILL-STATUS-' || UPPER(SUBSTRING(status_val, 1, 3)) || '-' || ROW_NUMBER() OVER(),
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
FROM
    (SELECT id FROM contacts WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' AND contact_type IN ('supplier', 'vendor') ORDER BY created_at DESC LIMIT 1) v
CROSS JOIN
    UNNEST(ARRAY['draft', 'pending', 'approved', 'paid', 'partial', 'overdue', 'cancelled', 'open']) AS status_val
CROSS JOIN
    UNNEST(ARRAY[2000.00, 3500.00, 5000.00, 1500.00, 4200.00, 6000.00, 2800.00, 3900.00]) AS amount_val
LIMIT 8;

-- 4. EXPENSES - All statuses
INSERT INTO expenses (company_id, expense_date, vendor_id, amount, currency, description, category, status)
SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    CURRENT_DATE - (ROW_NUMBER() OVER() % 60),
    v.id,
    500.00 + (ROW_NUMBER() OVER() * 300),
    'RON',
    'Expense with status: ' || s.status_val || ' - Category: ' || ec.category_name,
    ec.category_name,
    s.status_val
FROM
    (SELECT id FROM contacts WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' AND contact_type IN ('supplier', 'vendor') ORDER BY created_at DESC LIMIT 2) v
CROSS JOIN
    (SELECT category_name FROM expense_categories WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' ORDER BY created_at LIMIT 3) ec
CROSS JOIN
    UNNEST(ARRAY['pending', 'approved', 'rejected', 'paid', 'reimbursed']) AS s(status_val)
LIMIT 15;

-- 5. OPPORTUNITIES - All stages, sources, and probabilities
INSERT INTO opportunities (company_id, contact_id, name, description, amount, currency, probability, expected_close_date, stage, assigned_to, source, campaign)
SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    c.id,
    'Opp-' || UPPER(SUBSTRING(stage_val, 1, 4)) || '-' || UPPER(SUBSTRING(source_val, 1, 3)) || '-' || ROW_NUMBER() OVER(),
    'Opportunity: ' || stage_val || ' stage from ' || source_val || ' source',
    5000.00 + (ROW_NUMBER() OVER() * 5000),
    'RON',
    CASE stage_val
        WHEN 'lead' THEN 10
        WHEN 'qualified' THEN 25
        WHEN 'proposal' THEN 50
        WHEN 'negotiation' THEN 75
        WHEN 'closed_won' THEN 100
        WHEN 'closed_lost' THEN 0
    END,
    CURRENT_DATE + (ROW_NUMBER() OVER() % 90 + 10),
    stage_val,
    '11111111-1111-1111-1111-111111111111',
    source_val,
    CASE source_val
        WHEN 'website' THEN 'Digital Marketing 2025'
        WHEN 'referral' THEN 'Partner Network'
        WHEN 'cold_call' THEN 'Outbound Sales'
        WHEN 'email' THEN 'Email Campaigns'
        WHEN 'social_media' THEN 'Social Media Ads'
        WHEN 'event' THEN 'Industry Events'
        ELSE 'General Campaign'
    END
FROM
    (SELECT id FROM contacts WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' AND contact_type IN ('customer', 'lead') ORDER BY created_at DESC LIMIT 3) c
CROSS JOIN
    UNNEST(ARRAY['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']) AS stage_val
CROSS JOIN
    UNNEST(ARRAY['website', 'referral', 'cold_call', 'email', 'social_media', 'event']) AS source_val
LIMIT 25;

-- 6. PRODUCTS - Various categories and configurations
INSERT INTO products (company_id, sku, name, description, category, subcategory, brand, unit_of_measure, purchase_price, selling_price, min_selling_price, vat_rate, track_inventory, allow_negative_stock, is_active, is_sellable, is_purchasable, created_by)
VALUES
-- IT Equipment
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'IT-DESK-001', 'Desktop Computer i7', 'High-performance desktop', 'IT Equipment', 'Computers', 'Dell', 'buc', 3200.00, 4800.00, 4500.00, 19.00, true, false, true, true, true, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'IT-SRV-001', 'Server Rack Unit', 'Enterprise server', 'IT Equipment', 'Servers', 'HP', 'buc', 8000.00, 12000.00, 11000.00, 19.00, true, false, true, true, true, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'IT-NET-001', 'Network Switch 24-Port', '24-port gigabit switch', 'IT Equipment', 'Networking', 'Cisco', 'buc', 1500.00, 2400.00, 2200.00, 19.00, true, false, true, true, true, '11111111-1111-1111-1111-111111111111'),
-- Discontinued/Inactive product
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'DISC-001', 'Discontinued Item', 'No longer available', 'Electronics', 'Legacy', 'Generic', 'buc', 100.00, 200.00, 180.00, 19.00, true, false, false, false, false, '11111111-1111-1111-1111-111111111111'),
-- Services - non-inventory
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SRV-TRAIN-001', 'Employee Training Day', 'Full day training program', 'Services', 'Training', NULL, 'zi', 1000.00, 2000.00, 1800.00, 19.00, false, false, true, true, false, '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SRV-MAINT-001', 'Maintenance Contract Annual', 'Annual maintenance service', 'Services', 'Maintenance', NULL, 'an', 2400.00, 4800.00, 4500.00, 19.00, false, false, true, true, false, '11111111-1111-1111-1111-111111111111'),
-- Products with negative stock allowed
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'FLEX-001', 'Flexible Stock Item', 'Allows negative inventory', 'Supplies', 'General', 'Generic', 'buc', 50.00, 100.00, 90.00, 19.00, true, true, true, true, true, '11111111-1111-1111-1111-111111111111');

-- 7. PROJECTS - All status/methodology/health/priority combinations
INSERT INTO projects (company_id, name, description, client_id, status, start_date, end_date, budget, currency, is_billable, default_hourly_rate, methodology, health_status, priority, created_by)
SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Project-' || UPPER(SUBSTRING(status_val, 1, 3)) || '-' || UPPER(SUBSTRING(priority_val, 1, 1)) || '-' || ROW_NUMBER() OVER(),
    'Status: ' || status_val || ', Method: ' || methodology_val || ', Health: ' || health_val || ', Priority: ' || priority_val,
    c.id,
    status_val,
    CURRENT_DATE - 30,
    CURRENT_DATE + 60,
    10000.00 + (ROW_NUMBER() OVER() * 5000),
    'RON',
    true,
    250.00 + (ROW_NUMBER() OVER() * 25),
    methodology_val,
    health_val,
    priority_val,
    '11111111-1111-1111-1111-111111111111'
FROM
    (SELECT id FROM contacts WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' AND contact_type = 'customer' ORDER BY created_at DESC LIMIT 2) c
CROSS JOIN
    UNNEST(ARRAY['active', 'planning', 'on_hold', 'completed', 'cancelled']) AS status_val
CROSS JOIN
    UNNEST(ARRAY['agile', 'scrum', 'waterfall']) AS methodology_val
CROSS JOIN
    UNNEST(ARRAY['on_track', 'at_risk', 'critical']) AS health_val
CROSS JOIN
    UNNEST(ARRAY['low', 'medium', 'high']) AS priority_val
LIMIT 20;

-- 8. TIME ENTRIES - All status and type combinations
INSERT INTO time_entries (company_id, employee_id, customer_id, project_id, entry_date, hours, hourly_rate, description, is_billable, status, time_entry_type)
SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    e.id,
    c.id,
    p.id,
    CURRENT_DATE - ((ROW_NUMBER() OVER()) % 30),
    2.0 + ((ROW_NUMBER() OVER()) % 6),
    200.00 + ((ROW_NUMBER() OVER()) % 100),
    'Time: ' || status_val || ' - Type: ' || type_val,
    CASE WHEN type_val IN ('regular', 'overtime') THEN true ELSE false END,
    status_val,
    type_val
FROM
    (SELECT id FROM employees WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' ORDER BY created_at LIMIT 2) e
CROSS JOIN
    (SELECT id FROM contacts WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' AND contact_type = 'customer' ORDER BY created_at DESC LIMIT 1) c
CROSS JOIN
    (SELECT id FROM projects WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' ORDER BY created_at DESC LIMIT 2) p
CROSS JOIN
    UNNEST(ARRAY['pending', 'approved', 'rejected', 'disputed', 'under_review']) AS status_val
CROSS JOIN
    UNNEST(ARRAY['regular', 'overtime', 'holiday', 'on_call', 'training']) AS type_val
LIMIT 30;

-- Summary Report
SELECT
    '=== NEW DATA ADDED ===' as section,
    '' as data_type,
    '' as count
UNION ALL
SELECT
    'New Contacts',
    contact_type,
    COUNT(*)::text
FROM contacts
WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  AND created_at > NOW() - INTERVAL '2 minutes'
GROUP BY contact_type
UNION ALL
SELECT '', '', ''
UNION ALL
SELECT
    'Total Database Records',
    'Contacts',
    COUNT(*)::text
FROM contacts WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT '', 'Invoices', COUNT(*)::text FROM invoices WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT '', 'Bills', COUNT(*)::text FROM bills WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT '', 'Expenses', COUNT(*)::text FROM expenses WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT '', 'Opportunities', COUNT(*)::text FROM opportunities WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT '', 'Products', COUNT(*)::text FROM products WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT '', 'Projects', COUNT(*)::text FROM projects WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT '', 'Time Entries', COUNT(*)::text FROM time_entries WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
