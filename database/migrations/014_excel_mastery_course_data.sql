-- =====================================================================
-- Migration 014: Excel Mastery Course - Complete Data Population
-- =====================================================================
-- Purpose: Insert Excel Mastery course with all 5 modules and 25 lessons
-- Date: 2025-11-15
-- Estimated Budget: $50 of $1000 Claude Code credit
-- =====================================================================

BEGIN;

-- =====================================================================
-- COURSE: Excel Mastery for Business Owners
-- =====================================================================

INSERT INTO courses (
  course_key,
  name,
  description,
  category,
  difficulty,
  price_ron,
  duration_hours,
  instructor_name,
  learning_objectives,
  prerequisites,
  target_audience,
  certification_available,
  is_published
) VALUES (
  'excel_mastery',
  'Excel Mastery for Business Owners',
  'Transformă-te dintr-un începător în Excel într-un utilizator avansat care poate crea dashboarduri profesionale, modele financiare și rapoarte automate. Cursul se concentrează pe scenarii reale de business folosite zilnic de companiile românești.',
  'excel',
  'beginner',
  299.00,
  18,
  'Documentiulia Academy',
  '[
    "Navighează Excel cu încredere și folosește formule esențiale",
    "Construiește dashboarduri financiare automate pentru metrici de business",
    "Creează situații profit & pierdere, proiecții cash flow",
    "Analizează date de vânzări și tendințe clienți",
    "Automatizează sarcini repetitive cu macro-uri de bază",
    "Prezintă date profesional cu grafice și formatare condițională"
  ]'::jsonb,
  '[]'::jsonb,
  'Proprietari de business, contabili, manageri cu experiență minimă sau fără experiență în Excel',
  true,
  true
);

-- =====================================================================
-- MODULE 1: Excel Fundamentals (3 lessons)
-- =====================================================================

WITH course AS (SELECT id FROM courses WHERE course_key = 'excel_mastery')
INSERT INTO course_modules (course_id, module_number, module_key, name, description, duration_minutes, learning_outcomes, is_locked)
SELECT
  course.id,
  1,
  'excel_fundamentals',
  'Fundamentele Excel',
  'Stăpânește interfața, navigarea de bază și operațiunile esențiale pentru a deveni productiv în Excel.',
  180,
  '[
    "Înțelegi interfața Excel și navigarea eficientă",
    "Introduci și formatezi date corect (numere românești, date)",
    "Folosești formule esențiale: SUM, AVERAGE, IF, VLOOKUP",
    "Aplici formatare condițională și validare date"
  ]'::jsonb,
  false
FROM course;

-- Lesson 1.1: Excel Interface & Navigation
WITH module AS (SELECT id FROM course_modules WHERE module_key = 'excel_fundamentals')
INSERT INTO course_lessons (
  module_id, lesson_number, lesson_key, name, description, lesson_type,
  video_duration_seconds, downloadable_resources, is_preview, is_required
)
SELECT
  module.id,
  1,
  'interface_navigation',
  'Interfață Excel & Navigare',
  'Înțelege ribbon-ul, tab-urile și navigarea eficientă în Excel. Învață comenzile rapide esențiale pentru productivitate.',
  'video',
  2700, -- 45 min
  '[
    {"name": "Keyboard Shortcuts Cheat Sheet", "url": "/templates/excel/shortcuts.pdf", "type": "pdf", "size_mb": 0.5},
    {"name": "Practice Workbook - Navigation", "url": "/templates/excel/navigation_practice.xlsx", "type": "xlsx", "size_mb": 0.2}
  ]'::jsonb,
  true, -- Preview lesson
  true
FROM module;

-- Lesson 1.2: Data Entry & Formatting
WITH module AS (SELECT id FROM course_modules WHERE module_key = 'excel_fundamentals')
INSERT INTO course_lessons (
  module_id, lesson_number, lesson_key, name, description, lesson_type,
  video_duration_seconds, downloadable_resources, is_preview, is_required
)
SELECT
  module.id,
  2,
  'data_entry_formatting',
  'Introducere Date & Formatare',
  'Tipuri de date, formatare numere românești (1.234,56), formatare date (DD.MM.YYYY), formatare condițională și validare date.',
  'video',
  3600, -- 60 min
  '[
    {"name": "Product Catalog Template", "url": "/templates/excel/product_catalog.xlsx", "type": "xlsx", "size_mb": 0.3},
    {"name": "Formatting Style Guide", "url": "/templates/excel/formatting_guide.pdf", "type": "pdf", "size_mb": 0.8}
  ]'::jsonb,
  false,
  true
FROM module;

-- Lesson 1.3: Essential Formulas (QUIZ)
WITH module AS (SELECT id FROM course_modules WHERE module_key = 'excel_fundamentals')
INSERT INTO course_lessons (
  module_id, lesson_number, lesson_key, name, description, lesson_type,
  video_duration_seconds, quiz_data, downloadable_resources, is_preview, is_required
)
SELECT
  module.id,
  3,
  'essential_formulas',
  'Formule Esențiale & Funcții',
  'SUM, AVERAGE, COUNT, IF, CONCATENATE, TODAY. Învață referințe absolute vs relative ($A$1 vs A1).',
  'quiz',
  4500, -- 75 min video
  '{
    "passing_score": 80,
    "questions": [
      {
        "question": "Ce formulă calculează suma celulelor A1:A10?",
        "options": ["=SUM(A1:A10)", "=TOTAL(A1:A10)", "=ADD(A1:A10)", "=SUMA(A1:A10)"],
        "correct": 0
      },
      {
        "question": "Care este diferența dintre A1 și $A$1?",
        "options": [
          "Nu există diferență",
          "A1 este referință relativă, $A$1 este absolută",
          "$A$1 este referință relativă, A1 este absolută",
          "Ambele sunt referințe absolute"
        ],
        "correct": 1
      },
      {
        "question": "Ce funcție afișează data curentă?",
        "options": ["=NOW()", "=TODAY()", "=DATE()", "=CURRENT()"],
        "correct": 1
      }
    ]
  }'::jsonb,
  '[
    {"name": "Invoice Calculator Template", "url": "/templates/excel/invoice_calculator.xlsx", "type": "xlsx", "size_mb": 0.4},
    {"name": "Formula Reference Guide", "url": "/templates/excel/formula_reference.pdf", "type": "pdf", "size_mb": 1.2}
  ]'::jsonb,
  false,
  true
FROM module;

-- =====================================================================
-- MODULE 2: Business Formulas & Data Analysis (5 lessons)
-- =====================================================================

WITH course AS (SELECT id FROM courses WHERE course_key = 'excel_mastery')
INSERT INTO course_modules (course_id, module_number, module_key, name, description, duration_minutes, learning_outcomes, is_locked)
SELECT
  course.id,
  2,
  'business_formulas',
  'Formule Business & Analiză Date',
  'Folosește formule avansate pentru scenarii reale de business: VLOOKUP, SUMIF, PivotTables, curățare date.',
  240,
  '[
    "Folosești VLOOKUP și XLOOKUP pentru cataloage produse",
    "Analizezi vânzări cu SUMIF, SUMIFS, COUNTIF",
    "Creezi PivotTables pentru insights instant",
    "Curăți date messy (duplicate, formatare inconsistentă)",
    "Calculezi termene plată și vechime facturi"
  ]'::jsonb,
  false
FROM course;

-- Lesson 2.1: VLOOKUP & XLOOKUP
WITH module AS (SELECT id FROM course_modules WHERE module_key = 'business_formulas')
INSERT INTO course_lessons (
  module_id, lesson_number, lesson_key, name, description, lesson_type,
  video_duration_seconds, downloadable_resources, is_preview, is_required
)
SELECT
  module.id,
  1,
  'vlookup_xlookup',
  'VLOOKUP & XLOOKUP - Cataloage Produse',
  'Creează baze de date produse căutabile. VLOOKUP, XLOOKUP, INDEX+MATCH pentru facturare automată.',
  'video',
  3000, -- 50 min
  '[
    {"name": "Product Database with VLOOKUP", "url": "/templates/excel/product_db_vlookup.xlsx", "type": "xlsx", "size_mb": 0.6},
    {"name": "VLOOKUP Troubleshooting Guide", "url": "/templates/excel/vlookup_troubleshooting.pdf", "type": "pdf", "size_mb": 0.5}
  ]'::jsonb,
  false,
  true
FROM module;

-- Lesson 2.2: SUMIF, SUMIFS, COUNTIF
WITH module AS (SELECT id FROM course_modules WHERE module_key = 'business_formulas')
INSERT INTO course_lessons (
  module_id, lesson_number, lesson_key, name, description, lesson_type,
  video_duration_seconds, downloadable_resources, is_preview, is_required
)
SELECT
  module.id,
  2,
  'sumif_countif',
  'SUMIF, SUMIFS, COUNTIF - Analiză Vânzări',
  'Sumare condițională pentru analiză vânzări: top produse, regiuni, tendințe lunare.',
  'video',
  3300, -- 55 min
  '[
    {"name": "Sales Analysis Template", "url": "/templates/excel/sales_analysis.xlsx", "type": "xlsx", "size_mb": 0.8},
    {"name": "Sample Sales Dataset (1000 rows)", "url": "/templates/excel/sales_data_1000.xlsx", "type": "xlsx", "size_mb": 0.4}
  ]'::jsonb,
  false,
  true
FROM module;

-- Lesson 2.3: PivotTables
WITH module AS (SELECT id FROM course_modules WHERE module_key = 'business_formulas')
INSERT INTO course_lessons (
  module_id, lesson_number, lesson_key, name, description, lesson_type,
  video_duration_seconds, downloadable_resources, is_preview, is_required
)
SELECT
  module.id,
  3,
  'pivottables',
  'PivotTables - Insights Instant',
  'Creează PivotTables din date brute. Grupare date, câmpuri calculate, PivotCharts, refresh automat.',
  'video',
  3600, -- 60 min
  '[
    {"name": "PivotTable Dashboard Template", "url": "/templates/excel/pivottable_dashboard.xlsx", "type": "xlsx", "size_mb": 1.0},
    {"name": "PivotTable Best Practices", "url": "/templates/excel/pivottable_best_practices.pdf", "type": "pdf", "size_mb": 0.6}
  ]'::jsonb,
  false,
  true
FROM module;

-- Lesson 2.4: Data Cleaning
WITH module AS (SELECT id FROM course_modules WHERE module_key = 'business_formulas')
INSERT INTO course_lessons (
  module_id, lesson_number, lesson_key, name, description, lesson_type,
  video_duration_seconds, downloadable_resources, is_preview, is_required
)
SELECT
  module.id,
  4,
  'data_cleaning',
  'Curățare Date & Funcții TEXT',
  'Elimină duplicate, separă text (Text to Columns), TRIM, LEFT, RIGHT, MID, FIND, Flash Fill.',
  'video',
  2700, -- 45 min
  '[
    {"name": "Messy Customer Database", "url": "/templates/excel/messy_customer_db.xlsx", "type": "xlsx", "size_mb": 0.5},
    {"name": "Data Cleaning Checklist", "url": "/templates/excel/data_cleaning_checklist.pdf", "type": "pdf", "size_mb": 0.3}
  ]'::jsonb,
  false,
  true
FROM module;

-- Lesson 2.5: Date & Time Calculations (QUIZ)
WITH module AS (SELECT id FROM course_modules WHERE module_key = 'business_formulas')
INSERT INTO course_lessons (
  module_id, lesson_number, lesson_key, name, description, lesson_type,
  video_duration_seconds, quiz_data, downloadable_resources, is_preview, is_required
)
SELECT
  module.id,
  5,
  'date_time_calculations',
  'Calcule Date & Timp pentru Business',
  'DATEDIF, WORKDAY, NETWORKDAYS, EOMONTH. Calculează termene plată, vechime facturi, vechime angajați.',
  'quiz',
  3000, -- 50 min
  '{
    "passing_score": 80,
    "questions": [
      {
        "question": "Ce funcție calculează numărul de zile lucrătoare între două date?",
        "options": ["=DAYS(start, end)", "=NETWORKDAYS(start, end)", "=WORKDAYS(start, end)", "=BUSINESSDAYS(start, end)"],
        "correct": 1
      },
      {
        "question": "Cum calculezi ultima zi a lunii pentru o dată din A1?",
        "options": ["=LASTDAY(A1)", "=EOMONTH(A1, 0)", "=ENDOFMONTH(A1)", "=MONTHEND(A1)"],
        "correct": 1
      }
    ]
  }'::jsonb,
  '[
    {"name": "Invoice Aging Template", "url": "/templates/excel/invoice_aging.xlsx", "type": "xlsx", "size_mb": 0.6},
    {"name": "Date Formula Examples", "url": "/templates/excel/date_formulas.pdf", "type": "pdf", "size_mb": 0.7}
  ]'::jsonb,
  false,
  true
FROM module;

-- =====================================================================
-- MODULE 3: Business Dashboards & Visualization (5 lessons)
-- =====================================================================

WITH course AS (SELECT id FROM courses WHERE course_key = 'excel_mastery')
INSERT INTO course_modules (course_id, module_number, module_key, name, description, duration_minutes, learning_outcomes, is_locked)
SELECT
  course.id,
  3,
  'dashboards_visualization',
  'Dashboarduri Business & Vizualizare',
  'Creează dashboarduri profesionale, interactive cu formatare condițională, grafice, slicers și design excelent.',
  210,
  '[
    "Aplici formatare condițională pentru alerte vizuale (traffic lights, KPIs)",
    "Creezi grafice profesionale și alegi tipul corect de grafic",
    "Construiești dashboarduri interactive cu slicers și filtre",
    "Folosești formule dinamice (OFFSET, INDIRECT) pentru dashboarduri actualizate automat",
    "Aplici principii de design pentru dashboarduri clare și acționabile"
  ]'::jsonb,
  false
FROM course;

-- Lesson 3.1: Conditional Formatting
WITH module AS (SELECT id FROM course_modules WHERE module_key = 'dashboards_visualization')
INSERT INTO course_lessons (
  module_id, lesson_number, lesson_key, name, description, lesson_type,
  video_duration_seconds, downloadable_resources, is_preview, is_required
)
SELECT
  module.id,
  1,
  'conditional_formatting',
  'Formatare Condițională - Alerte Vizuale',
  'Color scales, data bars, icon sets (semafoare, săgeți). Formule personalizate pentru formatare. KPI dashboards.',
  'video',
  2400, -- 40 min
  '[
    {"name": "KPI Dashboard Template", "url": "/templates/excel/kpi_dashboard.xlsx", "type": "xlsx", "size_mb": 0.9}
  ]'::jsonb,
  false,
  true
FROM module;

-- Lesson 3.2: Charts & Graphs
WITH module AS (SELECT id FROM course_modules WHERE module_key = 'dashboards_visualization')
INSERT INTO course_lessons (
  module_id, lesson_number, lesson_key, name, description, lesson_type,
  video_duration_seconds, downloadable_resources, is_preview, is_required
)
SELECT
  module.id,
  2,
  'charts_graphs',
  'Grafice & Chartare - Povestiri cu Date',
  'Tipuri de grafice (coloană, bară, linie, pie, combo). Alegerea graficului corect. Formatare profesională. Sparklines.',
  'video',
  3300, -- 55 min
  '[
    {"name": "Chart Design Templates", "url": "/templates/excel/chart_templates.xlsx", "type": "xlsx", "size_mb": 0.7},
    {"name": "Chart Selection Flowchart", "url": "/templates/excel/chart_selection.pdf", "type": "pdf", "size_mb": 0.4}
  ]'::jsonb,
  false,
  true
FROM module;

-- Lesson 3.3: Interactive Dashboards
WITH module AS (SELECT id FROM course_modules WHERE module_key = 'dashboards_visualization')
INSERT INTO course_lessons (
  module_id, lesson_number, lesson_key, name, description, lesson_type,
  video_duration_seconds, downloadable_resources, is_preview, is_required
)
SELECT
  module.id,
  3,
  'interactive_dashboards',
  'Dashboarduri Interactive cu Slicers',
  'Adaugă slicers la PivotTables. Conectează slicers la multiple PivotTables. Timeline slicers. Layout user-friendly.',
  'video',
  2700, -- 45 min
  '[
    {"name": "Interactive Sales Dashboard", "url": "/templates/excel/interactive_sales_dashboard.xlsx", "type": "xlsx", "size_mb": 1.2}
  ]'::jsonb,
  false,
  true
FROM module;

-- Lesson 3.4: Dynamic Dashboards
WITH module AS (SELECT id FROM course_modules WHERE module_key = 'dashboards_visualization')
INSERT INTO course_lessons (
  module_id, lesson_number, lesson_key, name, description, lesson_type,
  video_duration_seconds, downloadable_resources, is_preview, is_required
)
SELECT
  module.id,
  4,
  'dynamic_dashboards',
  'Dashboarduri Dinamice cu Formule',
  'Named ranges, OFFSET, INDIRECT pentru range-uri dinamice. Dashboarduri controlate cu dropdown-uri.',
  'video',
  3000, -- 50 min
  '[
    {"name": "Dynamic Dashboard Template", "url": "/templates/excel/dynamic_dashboard.xlsx", "type": "xlsx", "size_mb": 1.0}
  ]'::jsonb,
  false,
  true
FROM module;

-- Lesson 3.5: Dashboard Design Best Practices
WITH module AS (SELECT id FROM course_modules WHERE module_key = 'dashboards_visualization')
INSERT INTO course_lessons (
  module_id, lesson_number, lesson_key, name, description, lesson_type,
  video_duration_seconds, downloadable_resources, is_preview, is_required
)
SELECT
  module.id,
  5,
  'dashboard_design',
  'Best Practices Design Dashboarduri',
  'Principii design (simplicitate, claritate, acționabilitate). Psihologie culori. Layout. Protejare foi.',
  'video',
  1800, -- 30 min
  '[
    {"name": "5 Professional Dashboard Examples", "url": "/templates/excel/dashboard_examples.xlsx", "type": "xlsx", "size_mb": 2.0},
    {"name": "Dashboard Design Checklist", "url": "/templates/excel/dashboard_checklist.pdf", "type": "pdf", "size_mb": 0.5}
  ]'::jsonb,
  false,
  true
FROM module;

-- =====================================================================
-- MODULE 4: Financial Modeling (6 lessons)
-- =====================================================================

WITH course AS (SELECT id FROM courses WHERE course_key = 'excel_mastery')
INSERT INTO course_modules (course_id, module_number, module_key, name, description, duration_minutes, learning_outcomes, is_locked)
SELECT
  course.id,
  4,
  'financial_modeling',
  'Modelare Financiară pentru Business',
  'Construiește modele financiare folosite de companiile românești: P&L, cash flow, bugete, break-even, credite.',
  240,
  '[
    "Construiești Profit & Loss (Cont P&P) pentru SRL românesc",
    "Creezi proiecții cash flow cu 12 luni înainte",
    "Planifici bugete anuale și urmărești actual vs budget",
    "Calculezi break-even (prag rentabilitate) și sensibilitate",
    "Construiești calculatoare credite cu grafic amortizare",
    "Integrezi P&L, bilanț, cash flow într-un model complet"
  ]'::jsonb,
  false
FROM course;

-- Lesson 4.1: P&L Statement
WITH module AS (SELECT id FROM course_modules WHERE module_key = 'financial_modeling')
INSERT INTO course_lessons (
  module_id, lesson_number, lesson_key, name, description, lesson_type,
  video_duration_seconds, downloadable_resources, is_preview, is_required
)
SELECT
  module.id,
  1,
  'profit_loss',
  'Profit & Loss (Cont P&P)',
  'Structură P&L românească (venituri, cheltuieli, profit net). Construire P&L lunar. Analiză varianță actual vs budget.',
  'video',
  3000, -- 50 min
  '[
    {"name": "P&L Template for Romanian SRL", "url": "/templates/excel/pl_srl_romania.xlsx", "type": "xlsx", "size_mb": 0.8},
    {"name": "Sample P&L Data", "url": "/templates/excel/sample_pl_data.xlsx", "type": "xlsx", "size_mb": 0.3}
  ]'::jsonb,
  false,
  true
FROM module;

-- Lesson 4.2: Cash Flow Forecast
WITH module AS (SELECT id FROM course_modules WHERE module_key = 'financial_modeling')
INSERT INTO course_lessons (
  module_id, lesson_number, lesson_key, name, description, lesson_type,
  video_duration_seconds, downloadable_resources, is_preview, is_required
)
SELECT
  module.id,
  2,
  'cash_flow',
  'Proiecție Flux Numerar (Cash Flow)',
  'Cash vs accrual accounting. Proiecție 12 luni. Intrări (vânzări, încasări). Ieșiri (salarii, furnizori, taxe). Burn rate.',
  'video',
  3300, -- 55 min
  '[
    {"name": "Cash Flow Template", "url": "/templates/excel/cash_flow_forecast.xlsx", "type": "xlsx", "size_mb": 0.9},
    {"name": "Payment Terms Scenarios", "url": "/templates/excel/payment_terms.pdf", "type": "pdf", "size_mb": 0.4}
  ]'::jsonb,
  false,
  true
FROM module;

-- Lesson 4.3: Budget Planning
WITH module AS (SELECT id FROM course_modules WHERE module_key = 'financial_modeling')
INSERT INTO course_lessons (
  module_id, lesson_number, lesson_key, name, description, lesson_type,
  video_duration_seconds, downloadable_resources, is_preview, is_required
)
SELECT
  module.id,
  3,
  'budget_planning',
  'Planificare Buget Anual',
  'Creare bugete anuale pe departamente. Alocare lunară. Urmărire budget vs actual. Rolling forecasts. Scenarii (best, base, worst).',
  'video',
  2700, -- 45 min
  '[
    {"name": "Annual Budget Template", "url": "/templates/excel/annual_budget.xlsx", "type": "xlsx", "size_mb": 0.7}
  ]'::jsonb,
  false,
  true
FROM module;

-- Lesson 4.4: Break-Even Analysis
WITH module AS (SELECT id FROM course_modules WHERE module_key = 'financial_modeling')
INSERT INTO course_lessons (
  module_id, lesson_number, lesson_key, name, description, lesson_type,
  video_duration_seconds, downloadable_resources, is_preview, is_required
)
SELECT
  module.id,
  4,
  'break_even',
  'Analiză Break-Even (Prag Rentabilitate)',
  'Costuri fixe vs variabile. Formula break-even. Marjă contribuție. Analiză sensibilitate. Goal Seek pentru break-even.',
  'video',
  2400, -- 40 min
  '[
    {"name": "Break-Even Calculator", "url": "/templates/excel/breakeven_calculator.xlsx", "type": "xlsx", "size_mb": 0.5}
  ]'::jsonb,
  false,
  true
FROM module;

-- Lesson 4.5: Loan & Investment Calculators
WITH module AS (SELECT id FROM course_modules WHERE module_key = 'financial_modeling')
INSERT INTO course_lessons (
  module_id, lesson_number, lesson_key, name, description, lesson_type,
  video_duration_seconds, downloadable_resources, is_preview, is_required
)
SELECT
  module.id,
  5,
  'loan_investment',
  'Calculatoare Credite & Investiții',
  'Funcția PMT pentru rate credite. Grafic amortizare. FV, PV, RATE. NPV (Valoare Netă Prezentă). IRR (Rată Internă Return).',
  'video',
  3000, -- 50 min
  '[
    {"name": "Loan Amortization Calculator", "url": "/templates/excel/loan_calculator.xlsx", "type": "xlsx", "size_mb": 0.6},
    {"name": "Investment Analysis Template", "url": "/templates/excel/investment_analysis.xlsx", "type": "xlsx", "size_mb": 0.7}
  ]'::jsonb,
  false,
  true
FROM module;

-- Lesson 4.6: Integrated Financial Model (CAPSTONE)
WITH module AS (SELECT id FROM course_modules WHERE module_key = 'financial_modeling')
INSERT INTO course_lessons (
  module_id, lesson_number, lesson_key, name, description, lesson_type,
  video_duration_seconds, downloadable_resources, is_preview, is_required
)
SELECT
  module.id,
  6,
  'integrated_model',
  'Model Financiar Integrat (Capstone)',
  'Leagă P&L, bilanț, cash flow. Model 3-statements. Tabele sensibilitate (what-if). Data tables. Structură model profesional.',
  'video',
  3600, -- 60 min
  '[
    {"name": "Integrated Financial Model Template", "url": "/templates/excel/integrated_model.xlsx", "type": "xlsx", "size_mb": 1.5},
    {"name": "Capstone Project Instructions", "url": "/templates/excel/capstone_instructions.pdf", "type": "pdf", "size_mb": 0.6}
  ]'::jsonb,
  false,
  true
FROM module;

-- =====================================================================
-- MODULE 5: Automation & Advanced Features (6 lessons)
-- =====================================================================

WITH course AS (SELECT id FROM courses WHERE course_key = 'excel_mastery')
INSERT INTO course_modules (course_id, module_number, module_key, name, description, duration_minutes, learning_outcomes, is_locked)
SELECT
  course.id,
  5,
  'automation_advanced',
  'Automatizare & Funcții Avansate',
  'Economisește timp cu automatizare și funcții avansate Excel: Tables, Power Query, Macros, Form Controls.',
  210,
  '[
    "Folosești Tables pentru range-uri dinamice și referințe structurate",
    "Consolidezi date din multiple surse cu Power Query",
    "Înregistrezi și folosești macros pentru automatizare",
    "Creezi workbook-uri interactive cu butoane și controale",
    "Colaborezi eficient cu OneDrive/SharePoint",
    "Aplici productivity hacks și rezolvi erori comune"
  ]'::jsonb,
  false
FROM course;

-- Lesson 5.1: Tables & Structured References
WITH module AS (SELECT id FROM course_modules WHERE module_key = 'automation_advanced')
INSERT INTO course_lessons (
  module_id, lesson_number, lesson_key, name, description, lesson_type,
  video_duration_seconds, downloadable_resources, is_preview, is_required
)
SELECT
  module.id,
  1,
  'tables_structured',
  'Tables & Referințe Structurate',
  'Convertire range la Table (Ctrl+T). Formatare automată și filtrare. Referințe structurate. Total row. Beneficii pentru range-uri dinamice.',
  'video',
  2100, -- 35 min
  '[
    {"name": "Table Examples Workbook", "url": "/templates/excel/table_examples.xlsx", "type": "xlsx", "size_mb": 0.6}
  ]'::jsonb,
  false,
  true
FROM module;

-- Lesson 5.2: Power Query Basics
WITH module AS (SELECT id FROM course_modules WHERE module_key = 'automation_advanced')
INSERT INTO course_lessons (
  module_id, lesson_number, lesson_key, name, description, lesson_type,
  video_duration_seconds, downloadable_resources, is_preview, is_required
)
SELECT
  module.id,
  2,
  'power_query',
  'Power Query - Consolidare Date',
  'Interfață Power Query (Get & Transform). Import CSV, TXT, web. Transformări de bază. Append și merge queries.',
  'video',
  3000, -- 50 min
  '[
    {"name": "Multi-Source Data Files", "url": "/templates/excel/multi_source_data.zip", "type": "zip", "size_mb": 1.2},
    {"name": "Power Query Introduction", "url": "/templates/excel/power_query_intro.pdf", "type": "pdf", "size_mb": 0.8}
  ]'::jsonb,
  false,
  true
FROM module;

-- Lesson 5.3: Recording Macros
WITH module AS (SELECT id FROM course_modules WHERE module_key = 'automation_advanced')
INSERT INTO course_lessons (
  module_id, lesson_number, lesson_key, name, description, lesson_type,
  video_duration_seconds, downloadable_resources, is_preview, is_required
)
SELECT
  module.id,
  3,
  'macros',
  'Înregistrare & Folosire Macros',
  'Ce sunt macros? (VBA basics fără cod). Înregistrare pas-cu-pas. Rulare cu butoane. Editare macros simple. Personal macro workbook.',
  'video',
  2700, -- 45 min
  '[
    {"name": "Macro Practice Workbook", "url": "/templates/excel/macro_practice.xlsm", "type": "xlsm", "size_mb": 0.4},
    {"name": "Macro Security Guide", "url": "/templates/excel/macro_security.pdf", "type": "pdf", "size_mb": 0.3}
  ]'::jsonb,
  false,
  true
FROM module;

-- Lesson 5.4: Form Controls
WITH module AS (SELECT id FROM course_modules WHERE module_key = 'automation_advanced')
INSERT INTO course_lessons (
  module_id, lesson_number, lesson_key, name, description, lesson_type,
  video_duration_seconds, downloadable_resources, is_preview, is_required
)
SELECT
  module.id,
  4,
  'form_controls',
  'Form Controls & Workbooks Interactive',
  'Butoane, checkboxes, option buttons, spin buttons. Legare controale la celule. Formulare input user-friendly. Protejare foi.',
  'video',
  2400, -- 40 min
  '[
    {"name": "Quotation Generator (Interactive)", "url": "/templates/excel/quotation_generator.xlsm", "type": "xlsm", "size_mb": 0.7}
  ]'::jsonb,
  false,
  true
FROM module;

-- Lesson 5.5: Collaboration & Sharing
WITH module AS (SELECT id FROM course_modules WHERE module_key = 'automation_advanced')
INSERT INTO course_lessons (
  module_id, lesson_number, lesson_key, name, description, lesson_type,
  video_duration_seconds, downloadable_resources, is_preview, is_required
)
SELECT
  module.id,
  5,
  'collaboration',
  'Colaborare & Sharing Workbooks',
  'Sharing via OneDrive/SharePoint. Co-authoring în Excel Online. Comments și notes. Track Changes. Protecție cu parole. Export PDF.',
  'video',
  2100, -- 35 min
  '[
    {"name": "Collaboration Best Practices", "url": "/templates/excel/collaboration_guide.pdf", "type": "pdf", "size_mb": 0.5}
  ]'::jsonb,
  false,
  false -- Optional lesson
FROM module;

-- Lesson 5.6: Tips, Tricks & Final Quiz
WITH module AS (SELECT id FROM course_modules WHERE module_key = 'automation_advanced')
INSERT INTO course_lessons (
  module_id, lesson_number, lesson_key, name, description, lesson_type,
  video_duration_seconds, quiz_data, downloadable_resources, is_preview, is_required
)
SELECT
  module.id,
  6,
  'tips_tricks_final',
  'Excel Tips & Final Quiz',
  'Power shortcuts. Flash Fill. Camera tool. Custom number formats. Freeze panes. Troubleshooting erori (#N/A, #VALUE!, #REF!).',
  'quiz',
  2400, -- 40 min
  '{
    "passing_score": 80,
    "questions": [
      {
        "question": "Ce shortcut deschide caseta Go To Special?",
        "options": ["Ctrl+G", "F5", "Ambele A și B", "Ctrl+F5"],
        "correct": 2
      },
      {
        "question": "Cum corectezi eroarea #REF!?",
        "options": [
          "Verifică dacă celulele referite au fost șterse",
          "Schimbă formatul celulei",
          "Resetează Excel",
          "Folosește funcția IFERROR"
        ],
        "correct": 0
      },
      {
        "question": "Ce face Flash Fill (Ctrl+E)?",
        "options": [
          "Completează automat date bazate pe pattern-uri",
          "Șterge formatarea",
          "Creează macros",
          "Exportă în PDF"
        ],
        "correct": 0
      }
    ]
  }'::jsonb,
  '[
    {"name": "50 Productivity Tips", "url": "/templates/excel/50_tips.pdf", "type": "pdf", "size_mb": 1.0},
    {"name": "Troubleshooting Guide", "url": "/templates/excel/troubleshooting.pdf", "type": "pdf", "size_mb": 0.8}
  ]'::jsonb,
  false,
  true
FROM module;

-- =====================================================================
-- VERIFICATION QUERY
-- =====================================================================

DO $$
DECLARE
  v_course_count INTEGER;
  v_module_count INTEGER;
  v_lesson_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_course_count FROM courses WHERE course_key = 'excel_mastery';
  SELECT COUNT(*) INTO v_module_count FROM course_modules cm
    JOIN courses c ON cm.course_id = c.id
    WHERE c.course_key = 'excel_mastery';
  SELECT COUNT(*) INTO v_lesson_count FROM course_lessons cl
    JOIN course_modules cm ON cl.module_id = cm.id
    JOIN courses c ON cm.course_id = c.id
    WHERE c.course_key = 'excel_mastery';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Excel Mastery Course Created Successfully';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Courses: %', v_course_count;
  RAISE NOTICE 'Modules: %', v_module_count;
  RAISE NOTICE 'Lessons: %', v_lesson_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Course Structure:';
  RAISE NOTICE '  Module 1: Excel Fundamentals (3 lessons, 180 min)';
  RAISE NOTICE '  Module 2: Business Formulas (5 lessons, 240 min)';
  RAISE NOTICE '  Module 3: Dashboards & Visualization (5 lessons, 210 min)';
  RAISE NOTICE '  Module 4: Financial Modeling (6 lessons, 240 min)';
  RAISE NOTICE '  Module 5: Automation & Advanced (6 lessons, 210 min)';
  RAISE NOTICE '';
  RAISE NOTICE 'Total: 25 lessons, ~18 hours';
  RAISE NOTICE 'Price: 299 RON';
  RAISE NOTICE 'Category: Excel';
  RAISE NOTICE 'Difficulty: Beginner';
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- List all modules and lessons
SELECT
  c.name as course,
  cm.module_number,
  cm.name as module,
  cm.duration_minutes as module_duration,
  COUNT(cl.id) as lesson_count
FROM courses c
JOIN course_modules cm ON c.id = cm.course_id
LEFT JOIN course_lessons cl ON cm.id = cl.module_id
WHERE c.course_key = 'excel_mastery'
GROUP BY c.name, cm.module_number, cm.name, cm.duration_minutes
ORDER BY cm.module_number;
