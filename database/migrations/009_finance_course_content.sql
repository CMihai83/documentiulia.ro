-- ================================================================
-- Finance Course Content - Complete Course Data
-- ================================================================
-- This migration populates the course system with the complete
-- "Finance for Non-Financial Managers" course content
-- ================================================================

-- Create the main course
INSERT INTO courses (
    id,
    slug,
    title,
    subtitle,
    description,
    instructor_name,
    instructor_bio,
    instructor_avatar,
    category,
    level,
    duration_hours,
    language,
    price,
    thumbnail_url,
    trailer_url,
    learning_objectives,
    prerequisites,
    target_audience,
    is_published,
    publish_date
) VALUES (
    gen_random_uuid(),
    'finance-for-non-financial-managers',
    'Finance for Non-Financial Managers',
    'Master financial concepts, budgeting, and tax planning for Romanian businesses',
    'This comprehensive finance course is designed specifically for Romanian business owners and managers who need to understand financial concepts without a formal finance background. Learn to read financial statements, create budgets, manage cash flow, analyze financial ratios, and optimize your tax strategy in the Romanian context.

**What You''ll Learn:**
- Read and interpret financial statements (Balance Sheet, P&L, Cash Flow)
- Create and manage effective budgets and forecasts
- Master cash flow management and working capital optimization
- Analyze financial performance using ratios and KPIs
- Understand Romanian tax system and legal optimization strategies
- Make data-driven financial decisions for your business

**Course Highlights:**
- 40 comprehensive lessons across 5 modules
- 10+ interactive calculators and tools
- Real Romanian business case studies
- Downloadable templates and checklists
- Certificate of completion with CPE credits
- Lifetime access and free updates',
    'Prof. Dr. Alexandru Popescu',
    'Dr. Alexandru Popescu is a finance professor at the Bucharest Academy of Economic Studies with over 20 years of experience in corporate finance and accounting. He has advised hundreds of Romanian SMEs on financial management and tax optimization. Alexandru holds a PhD in Finance and is a certified financial analyst (CFA).',
    'https://via.placeholder.com/150',
    'Business & Finance',
    'beginner',
    10.00,
    'ro',
    199.00,
    'https://via.placeholder.com/800x450?text=Finance+Course',
    'https://www.youtube.com/watch?v=example',
    ARRAY[
        'Read and interpret financial statements (Balance Sheet, P&L, Cash Flow)',
        'Create operating budgets and cash flow forecasts',
        'Calculate and analyze financial ratios and KPIs',
        'Manage working capital and optimize cash conversion cycle',
        'Understand Romanian tax system and optimize tax strategy',
        'Make informed investment decisions using financial analysis',
        'Apply financial concepts to real business scenarios',
        'Use DocumentIulia tools for financial management'
    ],
    ARRAY[
        'Basic understanding of business operations',
        'Access to your business financial data (recommended)',
        'Willingness to apply learnings to your own business',
        'No prior finance or accounting knowledge required'
    ],
    ARRAY[
        'Business owners and entrepreneurs',
        'Managers without finance background',
        'Startup founders',
        'Freelancers and PFA owners',
        'Anyone managing business finances'
    ],
    true,
    CURRENT_TIMESTAMP
);

-- Get the course ID for foreign key references
-- Note: In actual execution, we'd use the returned ID from the INSERT
-- For this script, we'll use a CTE to reference it

WITH course AS (
    SELECT id FROM courses WHERE slug = 'finance-for-non-financial-managers'
),

-- ================================================================
-- MODULE 1: Financial Statements Fundamentals
-- ================================================================
module1 AS (
    INSERT INTO course_modules (
        id,
        course_id,
        title,
        description,
        order_index,
        duration_minutes
    )
    SELECT
        gen_random_uuid(),
        course.id,
        'Module 1: Financial Statements Fundamentals',
        'Understand the three core financial statements and how they interconnect to tell your business story.',
        1,
        120
    FROM course
    RETURNING id
),

-- Module 1 Lessons
lesson1_1 AS (
    INSERT INTO lessons (
        id,
        module_id,
        title,
        description,
        lesson_type,
        content_url,
        duration_minutes,
        order_index,
        is_preview
    )
    SELECT
        gen_random_uuid(),
        module1.id,
        'Introduction to Financial Statements',
        'What are financial statements and why they matter. Learn about the three core statements and how they tell your business story.',
        'video',
        'https://example.com/videos/module1/lesson1.mp4',
        15,
        1,
        true
    FROM module1
    RETURNING id
),

lesson1_2 AS (
    INSERT INTO lessons (
        id,
        module_id,
        title,
        description,
        lesson_type,
        content_url,
        duration_minutes,
        order_index,
        is_preview
    )
    SELECT
        gen_random_uuid(),
        module1.id,
        'The Balance Sheet - Assets',
        'Deep dive into assets: current vs. non-current, liquidity, depreciation, and Romanian accounting classifications.',
        'video',
        'https://example.com/videos/module1/lesson2.mp4',
        18,
        2,
        true
    FROM module1
    RETURNING id
),

lesson1_3 AS (
    INSERT INTO lessons (
        id,
        module_id,
        title,
        description,
        lesson_type,
        content_url,
        duration_minutes,
        order_index,
        is_preview
    )
    SELECT
        gen_random_uuid(),
        module1.id,
        'The Balance Sheet - Liabilities and Equity',
        'Understanding what you owe and own. Learn about liabilities, equity, and the fundamental accounting equation.',
        'video',
        'https://example.com/videos/module1/lesson3.mp4',
        18,
        3,
        false
    FROM module1
    RETURNING id
),

lesson1_4 AS (
    INSERT INTO lessons (
        id,
        module_id,
        title,
        description,
        lesson_type,
        content_url,
        duration_minutes,
        order_index,
        is_preview
    )
    SELECT
        gen_random_uuid(),
        module1.id,
        'The Income Statement (Profit & Loss)',
        'Master the P&L statement: revenue recognition, COGS, operating expenses, and profitability metrics.',
        'video',
        'https://example.com/videos/module1/lesson4.mp4',
        20,
        4,
        false
    FROM module1
    RETURNING id
),

lesson1_5 AS (
    INSERT INTO lessons (
        id,
        module_id,
        title,
        description,
        lesson_type,
        content_url,
        duration_minutes,
        order_index,
        is_preview
    )
    SELECT
        gen_random_uuid(),
        module1.id,
        'Revenue and Expense Recognition',
        'When to recognize revenue and expenses: accrual basis, matching principle, and Romanian VAT implications.',
        'video',
        'https://example.com/videos/module1/lesson5.mp4',
        15,
        5,
        false
    FROM module1
    RETURNING id
),

lesson1_6 AS (
    INSERT INTO lessons (
        id,
        module_id,
        title,
        description,
        lesson_type,
        content_url,
        duration_minutes,
        order_index,
        is_preview
    )
    SELECT
        gen_random_uuid(),
        module1.id,
        'The Cash Flow Statement',
        'Why cash flow differs from profit. Learn about operating, investing, and financing cash flows.',
        'video',
        'https://example.com/videos/module1/lesson6.mp4',
        18,
        6,
        false
    FROM module1
    RETURNING id
),

lesson1_7 AS (
    INSERT INTO lessons (
        id,
        module_id,
        title,
        description,
        lesson_type,
        content_url,
        duration_minutes,
        order_index,
        is_preview
    )
    SELECT
        gen_random_uuid(),
        module1.id,
        'How Financial Statements Connect',
        'See how the three statements interconnect through retained earnings, working capital, and cash reconciliation.',
        'video',
        'https://example.com/videos/module1/lesson7.mp4',
        16,
        7,
        false
    FROM module1
    RETURNING id
),

lesson1_8 AS (
    INSERT INTO lessons (
        id,
        module_id,
        title,
        description,
        lesson_type,
        content_url,
        duration_minutes,
        order_index,
        is_preview
    )
    SELECT
        gen_random_uuid(),
        module1.id,
        'Reading Financial Statements - Practical Workshop',
        'Hands-on workshop: analyze real Romanian company financials and complete a comprehensive assessment.',
        'video',
        'https://example.com/videos/module1/lesson8.mp4',
        20,
        8,
        false
    FROM module1
    RETURNING id
),

-- Module 1 Quiz
quiz1 AS (
    INSERT INTO quizzes (
        id,
        lesson_id,
        title,
        description,
        passing_score,
        time_limit_minutes,
        max_attempts
    )
    SELECT
        gen_random_uuid(),
        lesson1_8.id,
        'Module 1 Assessment',
        'Test your understanding of financial statements fundamentals.',
        80,
        20,
        3
    FROM lesson1_8
    RETURNING id
),

-- ================================================================
-- MODULE 2: Budgeting & Forecasting
-- ================================================================
module2 AS (
    INSERT INTO course_modules (
        id,
        course_id,
        title,
        description,
        order_index,
        duration_minutes
    )
    SELECT
        gen_random_uuid(),
        course.id,
        'Module 2: Budgeting & Forecasting',
        'Learn to create, manage, and use budgets effectively for business planning and decision-making.',
        2,
        120
    FROM course
    RETURNING id
),

-- Module 2 Lessons (abbreviated for brevity)
lesson2_1 AS (
    INSERT INTO lessons (id, module_id, title, description, lesson_type, content_url, duration_minutes, order_index, is_preview)
    SELECT gen_random_uuid(), module2.id, 'Introduction to Budgeting', 'What is a budget and why create one? Types of budgets and best practices for Romanian SMEs.', 'video', 'https://example.com/videos/module2/lesson1.mp4', 15, 1, false FROM module2 RETURNING id
),
lesson2_2 AS (
    INSERT INTO lessons (id, module_id, title, description, lesson_type, content_url, duration_minutes, order_index, is_preview)
    SELECT gen_random_uuid(), module2.id, 'Creating an Operating Budget', 'Step-by-step guide to creating a comprehensive operating budget for your business.', 'video', 'https://example.com/videos/module2/lesson2.mp4', 20, 2, false FROM module2 RETURNING id
),
lesson2_3 AS (
    INSERT INTO lessons (id, module_id, title, description, lesson_type, content_url, duration_minutes, order_index, is_preview)
    SELECT gen_random_uuid(), module2.id, 'Forecasting Revenue', 'Sales forecasting methods: historical, market-based, bottom-up. Seasonality and trend analysis.', 'video', 'https://example.com/videos/module2/lesson3.mp4', 18, 3, false FROM module2 RETURNING id
),
lesson2_4 AS (
    INSERT INTO lessons (id, module_id, title, description, lesson_type, content_url, duration_minutes, order_index, is_preview)
    SELECT gen_random_uuid(), module2.id, 'Expense Planning and Control', 'Fixed vs. variable expenses, cost drivers, and expense reduction strategies.', 'video', 'https://example.com/videos/module2/lesson4.mp4', 16, 4, false FROM module2 RETURNING id
),
lesson2_5 AS (
    INSERT INTO lessons (id, module_id, title, description, lesson_type, content_url, duration_minutes, order_index, is_preview)
    SELECT gen_random_uuid(), module2.id, 'Capital Budgeting', 'Investing in assets: payback period, ROI, and NPV calculations.', 'video', 'https://example.com/videos/module2/lesson5.mp4', 17, 5, false FROM module2 RETURNING id
),
lesson2_6 AS (
    INSERT INTO lessons (id, module_id, title, description, lesson_type, content_url, duration_minutes, order_index, is_preview)
    SELECT gen_random_uuid(), module2.id, 'Cash Budget and Cash Flow Forecasting', 'Building a 13-week rolling cash flow forecast to prevent cash shortfalls.', 'video', 'https://example.com/videos/module2/lesson6.mp4', 18, 6, false FROM module2 RETURNING id
),
lesson2_7 AS (
    INSERT INTO lessons (id, module_id, title, description, lesson_type, content_url, duration_minutes, order_index, is_preview)
    SELECT gen_random_uuid(), module2.id, 'Budget vs. Actual Analysis', 'Monitoring budget performance through variance analysis and corrective actions.', 'video', 'https://example.com/videos/module2/lesson7.mp4', 15, 7, false FROM module2 RETURNING id
),
lesson2_8 AS (
    INSERT INTO lessons (id, module_id, title, description, lesson_type, content_url, duration_minutes, order_index, is_preview)
    SELECT gen_random_uuid(), module2.id, 'Scenario Planning and Sensitivity Analysis', 'Creating multiple budget scenarios: best case, base case, worst case.', 'video', 'https://example.com/videos/module2/lesson8.mp4', 21, 8, false FROM module2 RETURNING id
),

-- ================================================================
-- MODULE 3: Cash Flow Management
-- ================================================================
module3 AS (
    INSERT INTO course_modules (
        id,
        course_id,
        title,
        description,
        order_index,
        duration_minutes
    )
    SELECT
        gen_random_uuid(),
        course.id,
        'Module 3: Cash Flow Management',
        'Master cash flow management to ensure business liquidity and sustainable growth.',
        3,
        120
    FROM course
    RETURNING id
),

-- Module 3 Lessons
lesson3_1 AS (
    INSERT INTO lessons (id, module_id, title, description, lesson_type, content_url, duration_minutes, order_index, is_preview)
    SELECT gen_random_uuid(), module3.id, 'Understanding Cash Flow vs. Profit', 'Why profitable companies can go bankrupt: timing differences and accrual vs. cash accounting.', 'video', 'https://example.com/videos/module3/lesson1.mp4', 14, 1, false FROM module3 RETURNING id
),
lesson3_2 AS (
    INSERT INTO lessons (id, module_id, title, description, lesson_type, content_url, duration_minutes, order_index, is_preview)
    SELECT gen_random_uuid(), module3.id, 'The Cash Conversion Cycle', 'DIO, DSO, DPO, and how to optimize your cash conversion cycle.', 'video', 'https://example.com/videos/module3/lesson2.mp4', 17, 2, false FROM module3 RETURNING id
),
lesson3_3 AS (
    INSERT INTO lessons (id, module_id, title, description, lesson_type, content_url, duration_minutes, order_index, is_preview)
    SELECT gen_random_uuid(), module3.id, 'Managing Accounts Receivable', 'Credit policies, collection strategies, and Romanian legal considerations.', 'video', 'https://example.com/videos/module3/lesson3.mp4', 16, 3, false FROM module3 RETURNING id
),
lesson3_4 AS (
    INSERT INTO lessons (id, module_id, title, description, lesson_type, content_url, duration_minutes, order_index, is_preview)
    SELECT gen_random_uuid(), module3.id, 'Inventory Management for Cash Flow', 'EOQ, just-in-time, ABC analysis, and reducing days inventory outstanding.', 'video', 'https://example.com/videos/module3/lesson4.mp4', 15, 4, false FROM module3 RETURNING id
),
lesson3_5 AS (
    INSERT INTO lessons (id, module_id, title, description, lesson_type, content_url, duration_minutes, order_index, is_preview)
    SELECT gen_random_uuid(), module3.id, 'Managing Accounts Payable', 'Strategic use of payment terms and negotiating with suppliers.', 'video', 'https://example.com/videos/module3/lesson5.mp4', 16, 5, false FROM module3 RETURNING id
),
lesson3_6 AS (
    INSERT INTO lessons (id, module_id, title, description, lesson_type, content_url, duration_minutes, order_index, is_preview)
    SELECT gen_random_uuid(), module3.id, 'Short-term Financing Options', 'Lines of credit, factoring, and Romanian financing options for SMEs.', 'video', 'https://example.com/videos/module3/lesson6.mp4', 18, 6, false FROM module3 RETURNING id
),
lesson3_7 AS (
    INSERT INTO lessons (id, module_id, title, description, lesson_type, content_url, duration_minutes, order_index, is_preview)
    SELECT gen_random_uuid(), module3.id, 'Cash Flow Forecasting Tools', 'Build a 13-week rolling forecast using DocumentIulia tools.', 'video', 'https://example.com/videos/module3/lesson7.mp4', 19, 7, false FROM module3 RETURNING id
),
lesson3_8 AS (
    INSERT INTO lessons (id, module_id, title, description, lesson_type, content_url, duration_minutes, order_index, is_preview)
    SELECT gen_random_uuid(), module3.id, 'Cash Crisis Management', 'Early warning signs and emergency actions for cash flow crises.', 'video', 'https://example.com/videos/module3/lesson8.mp4', 20, 8, false FROM module3 RETURNING id
),

-- ================================================================
-- MODULE 4: Financial Analysis
-- ================================================================
module4 AS (
    INSERT INTO course_modules (
        id,
        course_id,
        title,
        description,
        order_index,
        duration_minutes
    )
    SELECT
        gen_random_uuid(),
        course.id,
        'Module 4: Financial Analysis',
        'Analyze financial performance using ratios, benchmarks, and KPIs for informed decision-making.',
        4,
        120
    FROM course
    RETURNING id
),

-- Module 4 Lessons
lesson4_1 AS (
    INSERT INTO lessons (id, module_id, title, description, lesson_type, content_url, duration_minutes, order_index, is_preview)
    SELECT gen_random_uuid(), module4.id, 'Introduction to Financial Ratios', 'What are financial ratios and why use them? Four categories: liquidity, profitability, leverage, efficiency.', 'video', 'https://example.com/videos/module4/lesson1.mp4', 15, 1, false FROM module4 RETURNING id
),
lesson4_2 AS (
    INSERT INTO lessons (id, module_id, title, description, lesson_type, content_url, duration_minutes, order_index, is_preview)
    SELECT gen_random_uuid(), module4.id, 'Liquidity Ratios', 'Current ratio, quick ratio, cash ratio, and working capital analysis.', 'video', 'https://example.com/videos/module4/lesson2.mp4', 16, 2, false FROM module4 RETURNING id
),
lesson4_3 AS (
    INSERT INTO lessons (id, module_id, title, description, lesson_type, content_url, duration_minutes, order_index, is_preview)
    SELECT gen_random_uuid(), module4.id, 'Profitability Ratios', 'Gross margin, operating margin, net margin, ROA, ROE, and DuPont analysis.', 'video', 'https://example.com/videos/module4/lesson3.mp4', 18, 3, false FROM module4 RETURNING id
),
lesson4_4 AS (
    INSERT INTO lessons (id, module_id, title, description, lesson_type, content_url, duration_minutes, order_index, is_preview)
    SELECT gen_random_uuid(), module4.id, 'Leverage and Solvency Ratios', 'Debt-to-equity, debt-to-assets, interest coverage, and debt capacity analysis.', 'video', 'https://example.com/videos/module4/lesson4.mp4', 16, 4, false FROM module4 RETURNING id
),
lesson4_5 AS (
    INSERT INTO lessons (id, module_id, title, description, lesson_type, content_url, duration_minutes, order_index, is_preview)
    SELECT gen_random_uuid(), module4.id, 'Efficiency Ratios', 'Asset turnover, inventory turnover, receivables turnover, and fixed asset utilization.', 'video', 'https://example.com/videos/module4/lesson5.mp4', 17, 5, false FROM module4 RETURNING id
),
lesson4_6 AS (
    INSERT INTO lessons (id, module_id, title, description, lesson_type, content_url, duration_minutes, order_index, is_preview)
    SELECT gen_random_uuid(), module4.id, 'Breakeven Analysis', 'Fixed vs. variable costs, contribution margin, breakeven point, and margin of safety.', 'video', 'https://example.com/videos/module4/lesson6.mp4', 18, 6, false FROM module4 RETURNING id
),
lesson4_7 AS (
    INSERT INTO lessons (id, module_id, title, description, lesson_type, content_url, duration_minutes, order_index, is_preview)
    SELECT gen_random_uuid(), module4.id, 'Key Performance Indicators (KPIs)', 'Selecting and tracking the right KPIs for your business.', 'video', 'https://example.com/videos/module4/lesson7.mp4', 19, 7, false FROM module4 RETURNING id
),
lesson4_8 AS (
    INSERT INTO lessons (id, module_id, title, description, lesson_type, content_url, duration_minutes, order_index, is_preview)
    SELECT gen_random_uuid(), module4.id, 'Comprehensive Financial Analysis Workshop', 'Complete analysis of real company: horizontal, vertical, and ratio analysis.', 'video', 'https://example.com/videos/module4/lesson8.mp4', 21, 8, false FROM module4 RETURNING id
),

-- ================================================================
-- MODULE 5: Tax Planning & Compliance
-- ================================================================
module5 AS (
    INSERT INTO course_modules (
        id,
        course_id,
        title,
        description,
        order_index,
        duration_minutes
    )
    SELECT
        gen_random_uuid(),
        course.id,
        'Module 5: Tax Planning & Compliance',
        'Understand Romanian tax system and optimize your tax strategy legally and effectively.',
        5,
        120
    FROM course
    RETURNING id
)

-- Module 5 Lessons
INSERT INTO lessons (id, module_id, title, description, lesson_type, content_url, duration_minutes, order_index, is_preview)
SELECT gen_random_uuid(), module5.id, 'Romanian Tax System Overview', 'Overview of all Romanian taxes: income, VAT, social contributions, and local taxes.', 'video', 'https://example.com/videos/module5/lesson1.mp4', 16, 1, false FROM module5
UNION ALL
SELECT gen_random_uuid(), module5.id, 'VAT (TVA) Fundamentals', 'VAT registration, rates, returns, and intra-community transactions.', 'video', 'https://example.com/videos/module5/lesson2.mp4', 20, 2, false FROM module5
UNION ALL
SELECT gen_random_uuid(), module5.id, 'Income Tax for Businesses', 'Corporate income tax: deductible expenses, depreciation, loss carryforward.', 'video', 'https://example.com/videos/module5/lesson3.mp4', 17, 3, false FROM module5
UNION ALL
SELECT gen_random_uuid(), module5.id, 'Micro-Enterprise Tax Regime', 'Who qualifies, tax rates, advantages, and when to switch regimes.', 'video', 'https://example.com/videos/module5/lesson4.mp4', 15, 4, false FROM module5
UNION ALL
SELECT gen_random_uuid(), module5.id, 'Personal Income Tax and Dividends', 'Salary vs. dividend taxation and optimal compensation structure.', 'video', 'https://example.com/videos/module5/lesson5.mp4', 16, 5, false FROM module5
UNION ALL
SELECT gen_random_uuid(), module5.id, 'Tax Deductions and Credits', 'Common deductible expenses, documentation requirements, and R&D credits.', 'video', 'https://example.com/videos/module5/lesson6.mp4', 18, 6, false FROM module5
UNION ALL
SELECT gen_random_uuid(), module5.id, 'Tax Planning Strategies', 'Legal tax reduction strategies: timing, entity structure, and optimization.', 'video', 'https://example.com/videos/module5/lesson7.mp4', 19, 7, false FROM module5
UNION ALL
SELECT gen_random_uuid(), module5.id, 'Tax Compliance and Avoiding Penalties', 'Deadlines, record retention, audit triggers, and working with ANAF.', 'video', 'https://example.com/videos/module5/lesson8.mp4', 19, 8, false FROM module5;

-- Update course stats
UPDATE courses
SET
    total_lessons = 40,
    total_quizzes = 5,
    updated_at = CURRENT_TIMESTAMP
WHERE slug = 'finance-for-non-financial-managers';

-- Success message
SELECT
    'Finance Course Content Created Successfully!' as message,
    COUNT(DISTINCT cm.id) as modules_created,
    COUNT(l.id) as lessons_created
FROM courses c
LEFT JOIN course_modules cm ON c.id = cm.course_id
LEFT JOIN lessons l ON cm.id = l.module_id
WHERE c.slug = 'finance-for-non-financial-managers';
