-- ===============================================
-- CRITICAL MISSING DATA FOR FULL FUNCTIONALITY
-- Company ID: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
-- ===============================================

-- 1. INVOICE LINE ITEMS (invoices need line items to display properly)
INSERT INTO invoice_line_items (invoice_id, line_number, description, quantity, unit_price, amount)
SELECT
    i.id,
    ROW_NUMBER() OVER (PARTITION BY i.id ORDER BY p.id) as line_number,
    p.name || ' - ' || p.description,
    (random() * 5 + 1)::numeric(10,2) as quantity,
    p.selling_price,
    (random() * 5 + 1)::numeric(10,2) * p.selling_price as amount
FROM invoices i
CROSS JOIN LATERAL (
    SELECT id, name, description, selling_price
    FROM products
    WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    ORDER BY random()
    LIMIT 3
) p
WHERE i.company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  AND NOT EXISTS (
    SELECT 1 FROM invoice_line_items ili WHERE ili.invoice_id = i.id
  )
LIMIT 100;

-- 2. BILL LINE ITEMS (bills need line items too)
INSERT INTO bill_line_items (bill_id, line_number, description, quantity, unit_price, amount)
SELECT
    b.id,
    ROW_NUMBER() OVER (PARTITION BY b.id ORDER BY p.id) as line_number,
    p.name || ' - Purchase',
    (random() * 10 + 1)::numeric(10,2) as quantity,
    p.purchase_price,
    (random() * 10 + 1)::numeric(10,2) * p.purchase_price as amount
FROM bills b
CROSS JOIN LATERAL (
    SELECT id, name, purchase_price
    FROM products
    WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      AND purchase_price IS NOT NULL
    ORDER BY random()
    LIMIT 2
) p
WHERE b.company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  AND NOT EXISTS (
    SELECT 1 FROM bill_line_items bli WHERE bli.bill_id = b.id
  )
LIMIT 50;

-- 3. PAYMENTS (critical for cash flow tracking)
INSERT INTO payments (company_id, payment_type, payment_date, amount, currency, reference_number, contact_id, status)
SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    payment_type_val,
    CURRENT_DATE - ((ROW_NUMBER() OVER())::int % 60),
    (random() * 10000 + 500)::numeric(15,2),
    'RON',
    'PAY-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD((ROW_NUMBER() OVER())::text, 4, '0'),
    c.id,
    status_val
FROM
    (SELECT id FROM contacts WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' AND contact_type IN ('customer', 'supplier', 'vendor') LIMIT 10) c
CROSS JOIN
    UNNEST(ARRAY['invoice_payment', 'bill_payment', 'expense_reimbursement', 'other']) AS payment_type_val
CROSS JOIN
    UNNEST(ARRAY['completed', 'pending', 'failed', 'cancelled']) AS status_val
LIMIT 40;

-- 4. TASKS (project tasks are essential)
INSERT INTO tasks (company_id, project_id, name, description, status, priority, assigned_to, estimated_hours, due_date, task_type, progress_percentage)
SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    p.id,
    task_name || ' - ' || status_val,
    'Task description for ' || task_name || ' in ' || status_val || ' status',
    status_val,
    priority_val,
    '11111111-1111-1111-1111-111111111111',
    (random() * 40 + 5)::numeric(8,2),
    CURRENT_DATE + ((ROW_NUMBER() OVER())::int % 60),
    type_val,
    CASE status_val
        WHEN 'completed' THEN 100
        WHEN 'in_progress' THEN (random() * 80 + 10)::numeric(5,2)
        WHEN 'review' THEN 90
        ELSE 0
    END
FROM
    (SELECT id FROM projects WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' ORDER BY created_at DESC LIMIT 10) p
CROSS JOIN
    UNNEST(ARRAY['Development', 'Testing', 'Documentation', 'Design', 'Deployment']) AS task_name
CROSS JOIN
    UNNEST(ARRAY['todo', 'in_progress', 'review', 'blocked', 'completed', 'cancelled']) AS status_val
CROSS JOIN
    UNNEST(ARRAY['low', 'medium', 'high', 'critical']) AS priority_val
CROSS JOIN
    UNNEST(ARRAY['task', 'bug', 'feature', 'improvement']) AS type_val
LIMIT 100;

-- 5. STOCK MOVEMENTS (for inventory tracking)
INSERT INTO stock_movements (product_id, movement_type, quantity, unit_cost, total_cost, movement_date, reference_type, notes)
SELECT
    p.id,
    movement_type_val,
    (random() * 50 + 10)::numeric(15,3) *
        CASE movement_type_val
            WHEN 'purchase' THEN 1
            WHEN 'sale' THEN -1
            WHEN 'adjustment' THEN (CASE WHEN random() > 0.5 THEN 1 ELSE -1 END)
            WHEN 'return' THEN 1
            WHEN 'waste' THEN -1
        END,
    p.purchase_price,
    (random() * 50 + 10)::numeric(15,2) * p.purchase_price,
    CURRENT_DATE - ((ROW_NUMBER() OVER())::int % 90),
    reference_type_val,
    'Stock movement: ' || movement_type_val
FROM
    (SELECT id, purchase_price FROM products WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' AND track_inventory = true LIMIT 15) p
CROSS JOIN
    UNNEST(ARRAY['purchase', 'sale', 'adjustment', 'return', 'waste']) AS movement_type_val
CROSS JOIN
    UNNEST(ARRAY['invoice', 'bill', 'adjustment', 'return', 'other']) AS reference_type_val
LIMIT 75;

-- 6. RECEIPTS (for expense documentation)
INSERT INTO receipts (company_id, expense_id, receipt_number, receipt_date, vendor_name, total_amount, currency, status)
SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    e.id,
    'REC-' || TO_CHAR(e.expense_date, 'YYYYMM') || '-' || LPAD(ROW_NUMBER() OVER()::text, 4, '0'),
    e.expense_date,
    c.display_name,
    e.amount,
    'RON',
    (ARRAY['pending', 'processed', 'matched', 'rejected'])[floor(random() * 4 + 1)]
FROM expenses e
LEFT JOIN contacts c ON e.vendor_id = c.id
WHERE e.company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  AND NOT EXISTS (SELECT 1 FROM receipts r WHERE r.expense_id = e.id)
LIMIT 30;

-- 7. FISCAL DECLARATIONS (for compliance tracking)
INSERT INTO fiscal_declarations (company_id, declaration_type, fiscal_period, due_date, status, submission_date, created_by)
SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    declaration_type_val,
    period_val,
    (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day' + INTERVAL '25 days')::date,
    status_val,
    CASE status_val
        WHEN 'submitted' THEN (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '20 days')::date
        WHEN 'approved' THEN (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '22 days')::date
        ELSE NULL
    END,
    '11111111-1111-1111-1111-111111111111'
FROM
    UNNEST(ARRAY[
        '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06',
        '2025-07', '2025-08', '2025-09', '2025-10', '2025-11'
    ]) AS period_val
CROSS JOIN
    UNNEST(ARRAY['D112', 'D300', 'D394', 'D100']) AS declaration_type_val
CROSS JOIN
    UNNEST(ARRAY['draft', 'pending', 'submitted', 'approved', 'rejected']) AS status_val
LIMIT 50;

-- 8. COMPANY FISCAL CALENDAR (personalized calendar)
INSERT INTO company_fiscal_calendar (company_id, declaration_type, due_date, period, status, notes, created_by)
SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    type_val,
    due_date_val,
    TO_CHAR(due_date_val, 'YYYY-MM'),
    (ARRAY['upcoming', 'completed', 'overdue'])[floor(random() * 3 + 1)],
    'Fiscal obligation for ' || type_val,
    '11111111-1111-1111-1111-111111111111'
FROM
    UNNEST(ARRAY['D112', 'D300', 'D394', 'D100', 'Contributii sociale']) AS type_val
CROSS JOIN
    UNNEST(ARRAY[
        '2025-01-25'::date, '2025-02-25'::date, '2025-03-25'::date,
        '2025-04-25'::date, '2025-05-25'::date, '2025-06-25'::date,
        '2025-07-25'::date, '2025-08-25'::date, '2025-09-25'::date,
        '2025-10-25'::date, '2025-11-25'::date, '2025-12-25'::date
    ]) AS due_date_val
LIMIT 60;

-- Summary
SELECT
    '=== CRITICAL DATA ADDED ===' as summary,
    '' as table_name,
    '' as count
UNION ALL
SELECT '', 'Invoice Line Items', COUNT(*)::text
FROM invoice_line_items
WHERE invoice_id IN (SELECT id FROM invoices WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
UNION ALL
SELECT '', 'Bill Line Items', COUNT(*)::text
FROM bill_line_items
WHERE bill_id IN (SELECT id FROM bills WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
UNION ALL
SELECT '', 'Payments', COUNT(*)::text
FROM payments WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT '', 'Tasks', COUNT(*)::text
FROM tasks WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT '', 'Stock Movements', COUNT(*)::text
FROM stock_movements
WHERE product_id IN (SELECT id FROM products WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
UNION ALL
SELECT '', 'Receipts', COUNT(*)::text
FROM receipts WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT '', 'Fiscal Declarations', COUNT(*)::text
FROM fiscal_declarations WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL
SELECT '', 'Company Fiscal Calendar', COUNT(*)::text
FROM company_fiscal_calendar WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
