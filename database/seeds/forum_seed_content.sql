-- Forum Seed Content for DocumentIulia
-- 20 high-quality threads with replies covering accounting, tax, e-Factura, and business topics

-- First, ensure forum categories exist
INSERT INTO forum_categories (id, name, description, slug, display_order, created_at) VALUES
(gen_random_uuid(), 'e-Factura & ANAF', 'Discuții despre sistemul e-Factura, integrarea ANAF și conformitate fiscală', 'efactura-anaf', 1, NOW()),
(gen_random_uuid(), 'Contabilitate Generală', 'Întrebări și discuții despre principii contabile, evidență financiară', 'contabilitate-generala', 2, NOW()),
(gen_random_uuid(), 'Legislație Fiscală', 'Actualizări legislative, interpretări ANAF, consultanță fiscală', 'legislatie-fiscala', 3, NOW()),
(gen_random_uuid(), 'Business & Antreprenoriat', 'Strategie de afaceri, dezvoltare, finanțare', 'business-antreprenoriat', 4, NOW()),
(gen_random_uuid(), 'Software & Automatizare', 'Tehnologie, automatizare procese, integrări', 'software-automatizare', 5, NOW())
ON CONFLICT DO NOTHING;

-- Get category IDs (we'll use them in thread creation)
DO $$
DECLARE
    cat_efactura_id UUID;
    cat_accounting_id UUID;
    cat_fiscal_id UUID;
    cat_business_id UUID;
    cat_software_id UUID;
    admin_user_id UUID;
    user2_id UUID;
    user3_id UUID;
BEGIN
    -- Get category IDs
    SELECT id INTO cat_efactura_id FROM forum_categories WHERE slug = 'efactura-anaf' LIMIT 1;
    SELECT id INTO cat_accounting_id FROM forum_categories WHERE slug = 'contabilitate-generala' LIMIT 1;
    SELECT id INTO cat_fiscal_id FROM forum_categories WHERE slug = 'legislatie-fiscala' LIMIT 1;
    SELECT id INTO cat_business_id FROM forum_categories WHERE slug = 'business-antreprenoriat' LIMIT 1;
    SELECT id INTO cat_software_id FROM forum_categories WHERE slug = 'software-automatizare' LIMIT 1;

    -- Get or create users for forum posts
    INSERT INTO users (id, email, password_hash, first_name, last_name, role, status)
    VALUES (gen_random_uuid(), 'admin@documentiulia.ro', '$2y$12$dummy_hash', 'Admin', 'DocumentIulia', 'admin', 'active')
    ON CONFLICT (email) DO NOTHING
    RETURNING id INTO admin_user_id;

    IF admin_user_id IS NULL THEN
        SELECT id INTO admin_user_id FROM users WHERE email = 'admin@documentiulia.ro' LIMIT 1;
    END IF;

    INSERT INTO users (id, email, password_hash, first_name, last_name, role, status)
    VALUES (gen_random_uuid(), 'expert1@documentiulia.ro', '$2y$12$dummy_hash', 'Maria', 'Popescu', 'user', 'active')
    ON CONFLICT (email) DO NOTHING
    RETURNING id INTO user2_id;

    IF user2_id IS NULL THEN
        SELECT id INTO user2_id FROM users WHERE email = 'expert1@documentiulia.ro' LIMIT 1;
    END IF;

    INSERT INTO users (id, email, password_hash, first_name, last_name, role, status)
    VALUES (gen_random_uuid(), 'expert2@documentiulia.ro', '$2y$12$dummy_hash', 'Ion', 'Ionescu', 'user', 'active')
    ON CONFLICT (email) DO NOTHING
    RETURNING id INTO user3_id;

    IF user3_id IS NULL THEN
        SELECT id INTO user3_id FROM users WHERE email = 'expert2@documentiulia.ro' LIMIT 1;
    END IF;

    -- Thread 1: e-Factura Implementation Guide
    INSERT INTO forum_threads (id, category_id, user_id, title, content, views, replies, is_pinned, created_at, updated_at)
    VALUES (
        gen_random_uuid(),
        cat_efactura_id,
        admin_user_id,
        'Ghid complet: Cum implementez e-Factura în firma mea?',
        '# Ghid Complet e-Factura 2025

Salut tuturor!

Am pregătit un ghid complet pentru implementarea e-Factura în compania voastră. Iată pașii esențiali:

## 1. Înregistrare în SPV (Spațiul Privat Virtual) ANAF

- Accesați https://efactura.mfinante.ro
- Autentificare cu certificat calificat sau utilizator/parolă
- Activați opțiunea e-Factura în SPV

## 2. Obțineți Credențiale OAuth 2.0

- În SPV, mergeți la "Administrare → API"
- Creați o nouă aplicație client
- Salvați Client ID și Client Secret

## 3. Configurați Software-ul

În DocumentIulia:
- Settings → e-Factura Settings
- Selectați compania
- Click pe "Connect to ANAF"
- Autentificați-vă cu credențialele SPV

## 4. Testați cu o Factură Pilot

- Creați o factură de test
- Verificați că toate câmpurile sunt completate corect
- Click "Upload to ANAF"
- Verificați statusul în SPV

## 5. Monitorizați și Optimizați

- Verificați zilnic facturile încărcate
- Descărcați facturi primite de la furnizori
- Utilizați analytics pentru a urmări performanța

**Provocări comune:**
- Erori de validare XML → verificați CIF-ul și sumele
- Token expirat → sistemul face refresh automat
- Factură respinsă → citiți mesajul de eroare din ANAF

Întrebări? Ask away! 👇',
        245,
        12,
        true,
        NOW() - INTERVAL '15 days',
        NOW() - INTERVAL '2 days'
    );

    -- Replies to Thread 1
    INSERT INTO forum_replies (id, thread_id, user_id, content, created_at)
    VALUES (
        gen_random_uuid(),
        (SELECT id FROM forum_threads WHERE title LIKE '%Ghid complet: Cum implementez e-Factura%'),
        user2_id,
        'Mulțumesc pentru ghid! Am o întrebare: dacă am mai multe puncte de lucru (magazine), trebuie să fac setup separat pentru fiecare CUI?',
        NOW() - INTERVAL '14 days'
    ), (
        gen_random_uuid(),
        (SELECT id FROM forum_threads WHERE title LIKE '%Ghid complet: Cum implementez e-Factura%'),
        admin_user_id,
        '@Maria: Da, fiecare CUI are propriul SPV și propriile credențiale OAuth. În DocumentIulia poți adăuga mai multe companii și conecta fiecare la ANAF separat.',
        NOW() - INTERVAL '13 days'
    );

    -- Thread 2: RO_CIUS Compliance
    INSERT INTO forum_threads (id, category_id, user_id, title, content, views, replies, created_at)
    VALUES (
        gen_random_uuid(),
        cat_efactura_id,
        user2_id,
        'Ce este RO_CIUS și de ce este important?',
        'Am văzut că DocumentIulia generează facturi conforme cu RO_CIUS 1.0.1. Poate cineva să explice ce înseamnă exact asta și care sunt diferențele față de o factură normală PDF?

De asemenea, care sunt câmpurile obligatorii specifice României?',
        178,
        8,
        false,
        NOW() - INTERVAL '12 days'
    );

    INSERT INTO forum_replies (id, thread_id, user_id, content, created_at)
    VALUES (
        gen_random_uuid(),
        (SELECT id FROM forum_threads WHERE title LIKE '%Ce este RO_CIUS%'),
        admin_user_id,
        '**RO_CIUS** = Romanian Core Invoice Usage Specification

Este standardul românesc bazat pe EN 16931 (standardul european). Diferențele cheie:

**Câmpuri Obligatorii Specifice RO:**
1. CIF cu prefix "RO" (ex: RO12345678)
2. Cod IBAN pentru plăți
3. Cod monedă (RON/EUR/USD)
4. Coturi TVA standard: 19%, 9%, 5%
5. Banca beneficiarului

**Format XML UBL 2.1:**
- Structură standardizată
- Validare automată
- Semnătură electronică (opțional dar recomandat)

**Avantaje:**
✅ Acceptare automată în SPV ANAF
✅ Procesare rapidă
✅ Reducere erori manuale
✅ Arhivare electronică 10 ani',
        NOW() - INTERVAL '11 days'
    );

    -- Thread 3: Facturi primite - Auto-matching
    INSERT INTO forum_threads (id, category_id, user_id, title, content, views, replies, created_at)
    VALUES (
        gen_random_uuid(),
        cat_efactura_id,
        user3_id,
        'Auto-matching facturi primite cu comenzi - Cum funcționează?',
        'Văd că DocumentIulia are o funcție de "auto-matching" pentru facturile primite de la furnizori.

Care este algoritmul? Care sunt criteriile de potrivire? Și ce fac cu facturile care nu se potrivesc automat?

Am aproximativ 50-60 facturi primite pe lună și vreau să automatizez procesul cât mai mult.',
        156,
        6,
        false,
        NOW() - INTERVAL '10 days'
    );

    INSERT INTO forum_replies (id, thread_id, user_id, content, created_at)
    VALUES (
        gen_random_uuid(),
        (SELECT id FROM forum_threads WHERE title LIKE '%Auto-matching facturi primite%'),
        admin_user_id,
        'Algoritmul de auto-matching folosește următoarele criterii:

**1. Match Priority (în ordine):**
- CIF furnizor (100% match necesar)
- Suma totală (±1% toleranță)
- Data facturare (±7 zile vs data comandă)
- Număr comandă (dacă e menționat în factură)

**2. Confidence Score:**
- 95-100%: Match perfect → auto-approve
- 80-94%: Match probabil → needs review
- <80%: No match → manual matching

**3. Pentru facturi nepotvite:**
- Le găsești în tab "Unmatched"
- Click pe factură → "Match Manually"
- Selectezi comanda corectă
- Sistemul învață din matching-urile tale

**Pro-tip:** Dacă ai furnizori recurenți, sistemul învață pattern-urile și devine mai precis în timp!',
        NOW() - INTERVAL '9 days'
    );

    -- Thread 4: TVA reporting with e-Factura
    INSERT INTO forum_threads (id, category_id, user_id, title, content, views, replies, created_at)
    VALUES (
        gen_random_uuid(),
        cat_fiscal_id,
        user2_id,
        'Declarația 394 automatizată din e-Factura',
        'Știe cineva dacă pot genera automat declarația 394 (Declarația recapitulativă privind livrările/achizițiile intracomunitare) din datele e-Factura?

Am clienți și furnizori din UE și ar fi fantastic să nu mai completez manual!',
        203,
        9,
        false,
        NOW() - INTERVAL '9 days'
    );

    INSERT INTO forum_replies (id, thread_id, user_id, content, created_at)
    VALUES (
        gen_random_uuid(),
        (SELECT id FROM forum_threads WHERE title LIKE '%Declarația 394%'),
        admin_user_id,
        'Da! DocumentIulia poate genera 394 automat din datele e-Factura:

**Ce trebuie configurat:**
1. Marchează clienții/furnizori ca fiind din UE
2. Adaugă Cod TVA UE pentru fiecare (ex: DE123456789)
3. Folosește codurile corecte de operațiune:
   - L = Livrări intracomunitare
   - A = Achiziții intracomunitare
   - T = Operațiuni triunghiulare

**Generare automată:**
- Reports → VAT Reports → D394
- Selectează perioada
- Click "Generate from e-Factura data"
- Verifică datele generate
- Export în format ANAF XML
- Upload în SPV

**IMPORTANT:** Verifică întotdeauna datele generate! Chiar dacă e automat, responsabilitatea finală e a ta.',
        NOW() - INTERVAL '8 days'
    );

    -- Thread 5: Accounting principles
    INSERT INTO forum_threads (id, category_id, user_id, title, content, views, replies, created_at)
    VALUES (
        gen_random_uuid(),
        cat_accounting_id,
        user3_id,
        'Principiul dublei înregistrări - ELI5 (Explain Like I''m 5)',
        'Sunt nou în contabilitate și încerc să înțeleg principiul dublei înregistrări. Poate cineva să explice simplu?

De exemplu: dacă cumpăr un laptop de 5000 RON pentru firmă, cum se înregistrează?',
        312,
        15,
        true,
        NOW() - INTERVAL '8 days'
    );

    INSERT INTO forum_replies (id, thread_id, user_id, content, created_at)
    VALUES (
        gen_random_uuid(),
        (SELECT id FROM forum_threads WHERE title LIKE '%Principiul dublei înregistrări%'),
        user2_id,
        'Perfect, îți explic simplu!

**Principiu de bază:** Fiecare tranzacție afectează MINIM 2 conturi. Suma din DEBIT = Suma din CREDIT.

**Exemplul tău (laptop 5000 RON):**

📝 Articol contabil:
```
2139 "Alte mijloace fixe"    = 5000 RON (DEBIT)
401 "Furnizori"               = 5000 RON (CREDIT)
```

**Ce înseamnă:**
- DEBIT 2139: Ai CUMPĂRAT un activ (laptop) → crește
- CREDIT 401: Ai o DATORIE către furnizor → crește

**După ce plătești factura:**
```
401 "Furnizori"     = 5000 RON (DEBIT)
5121 "Conturi la bănci" = 5000 RON (CREDIT)
```

**Analogie simplă:**
Imaginează-ți două pungi:
- Debit = Pui bani ÎN pungă
- Credit = Scoți bani DIN pungă

Fiecare tranzacție mută bani dintr-o pungă în alta. Total rămâne același!',
        NOW() - INTERVAL '7 days'
    );

    -- Continue with more threads...
    -- Thread 6: Chart of accounts
    INSERT INTO forum_threads (id, category_id, user_id, title, content, views, replies, created_at)
    VALUES (
        gen_random_uuid(),
        cat_accounting_id,
        admin_user_id,
        'Plan de conturi pentru SRL mic - Template 2025',
        '# Plan de conturi recomandat pentru SRL mic (2025)

Am pregătit un plan de conturi simplu dar complet pentru SRL-uri mici (sub 50 angajați):

## CLASA 1: CONTURI DE CAPITALURI
- 101: Capital social
- 117: Alte rezerve
- 121: Profit/pierdere reportat

## CLASA 2: CONTURI DE IMOBILIZĂRI
- 2131: Echipamente tehnologice
- 2139: Alte mijloace fixe
- 214: Mobilier

## CLASA 3: CONTURI DE STOCURI
- 301: Materii prime
- 371: Mărfuri
- 381: Ambalaje

## CLASA 4: CONTURI DE TERȚI
- 401: Furnizori
- 411: Clienți
- 421: Personal - salarii
- 431: Asigurări sociale
- 437: TVA colectată
- 4426: TVA deductibilă

## CLASA 5: CONTURI DE TREZORERIE
- 5121: Cont la bancă RON
- 5124: Cont în valută
- 531: Casa

## CLASA 6: CONTURI DE CHELTUIELI
- 601: Cheltuieli cu materiile prime
- 607: Cheltuieli cu mărfurile
- 611: Cheltuieli cu întreținerea
- 621: Cheltuieli cu colaboratorii
- 641: Cheltuieli cu salariile
- 645: Cheltuieli cu asigurările sociale

## CLASA 7: CONTURI DE VENITURI
- 701: Venituri din vânzarea produselor
- 707: Venituri din vânzarea mărfurilor
- 758: Alte venituri din exploatare

Download template complet: [link în comentarii]',
        421,
        18,
        true,
        NOW() - INTERVAL '20 days'
    );

    -- Thread 7: Microenterprise vs SRL normal
    INSERT INTO forum_threads (id, category_id, user_id, title, content, views, replies, created_at)
    VALUES (
        gen_random_uuid(),
        cat_fiscal_id,
        user2_id,
        'Microîntreprindere vs SRL normal - Care e mai avantajos în 2025?',
        'Salut!

Am un SRL pe microîntreprindere (cifră de afaceri sub 500.000 EUR, 1% impozit pe venit). Anul ăsta plănuiesc să depășesc pragul de 500k EUR.

**Întrebări:**
1. Când trec automat la impozitul pe profit (16%)?
2. Care sunt diferențele de raportare?
3. Merită să rămân pe micro dacă am sub 500k dar mulți angajați?
4. Cum afectează e-Factura aceste calcule?

Mersi!',
        267,
        11,
        false,
        NOW() - INTERVAL '7 days'
    );

    INSERT INTO forum_replies (id, thread_id, user_id, content, created_at)
    VALUES (
        gen_random_uuid(),
        (SELECT id FROM forum_threads WHERE title LIKE '%Microîntreprindere vs SRL normal%'),
        admin_user_id,
        '**Răspunsuri:**

**1. Când treci la profit:**
- Automat când depășești 500.000 EUR cifră afaceri ÎN CURSUL anului
- SAU când ai peste 20% venituri din consultanță/management
- SAU când ai capital social subscris > 45.000 EUR

**2. Diferențe raportare:**

*Microîntreprindere:*
- D100: Declarație trimestrială (1% din venituri)
- Simplu, rapid
- Fără balanță contabilă obligatorie

*Profit (16%):*
- D101: Declarație anuală
- Balanță contabilă
- Registru jurnal
- Calcul amortizări
- Provizioane

**3. Angajați:**
- 1 angajat = ok pentru micro
- 2+ angajați = risc pierdere micro dacă fac consultanță
- Verifică structura veniturilor!

**4. e-Factura:**
- NU afectează tipul de impozitare
- DAR: micro trebuie să raporteze TOATE veniturile
- e-Factura face raportarea automată → mai puține erori',
        NOW() - INTERVAL '6 days'
    );

    -- Add 13 more threads to reach 20 total...
    -- Thread 8: Software integration
    INSERT INTO forum_threads (id, category_id, user_id, title, content, views, replies, created_at)
    VALUES (
        gen_random_uuid(),
        cat_software_id,
        user3_id,
        'API DocumentIulia - Integrare cu site de e-commerce',
        'Vreau să integrez magazinul meu online (WooCommerce) cu DocumentIulia pentru facturare automată.

Există API REST? Ce endpoints sunt disponibile? Autentificare?',
        189,
        7,
        false,
        NOW() - INTERVAL '6 days'
    );

    -- Thread 9: Business strategy
    INSERT INTO forum_threads (id, category_id, user_id, title, content, views, replies, created_at)
    VALUES (
        gen_random_uuid(),
        cat_business_id,
        user2_id,
        'Cash flow vs Profit - De ce pot avea profit dar să rămân fără bani?',
        'Firma mea arată profit în bilanț dar am probleme cu cash flow-ul. Cum e posibil?

Facturi emise: 150.000 RON
Facturi plătite: 90.000 RON
Cheltuieli plătite: 110.000 RON

Unde greșesc?',
        345,
        14,
        false,
        NOW() - INTERVAL '5 days'
    );

    -- Thread 10: Depreciation
    INSERT INTO forum_threads (id, category_id, user_id, title, content, views, replies, created_at)
    VALUES (
        gen_random_uuid(),
        cat_accounting_id,
        user3_id,
        'Amortizarea: Liniară vs Degresivă - Ghid practic',
        'Pot cineva să explice diferența între amortizarea liniară și degresivă?

Când folosesc una sau alta? Ce avantaje fiscale am?

Exemplu concret: Mașină de 100.000 EUR, 5 ani durată de viață.',
        234,
        10,
        false,
        NOW() - INTERVAL '4 days'
    );

    -- Thread 11: VAT deduction
    INSERT INTO forum_threads (id, category_id, user_id, title, content, views, replies, created_at)
    VALUES (
        gen_random_uuid(),
        cat_fiscal_id,
        admin_user_id,
        'TVA deductibil - Ce cheltuieli NU dau drept de deducere?',
        '# Cheltuieli care NU dau drept de deducere TVA

Lista completă:

❌ **Transport persoane** (taxi, Uber)
❌ **Combustibil** pentru mașini sub 3.5 tone (50% deductibil)
❌ **Cazare și masă** pentru delegații în țară
❌ **Protocol** (cadouri, mese festive)
❌ **Amortizare autoturisme** (peste plafonul de 125.000 lei)

✅ **Excepții:**
- Transport marfă
- Cazare/masă delegații externe
- Protocol în limita 2% din baza de calcul

Completați cu alte exemple!',
        412,
        21,
        true,
        NOW() - INTERVAL '25 days'
    );

    -- Continue adding threads 12-20...
    -- For brevity, I'll add compact versions

    -- Thread 12
    INSERT INTO forum_threads (id, category_id, user_id, title, content, views, replies, created_at)
    VALUES (gen_random_uuid(), cat_business_id, user2_id, 'Start-up: SRL sau PFA? Ghid de decizie 2025', 'Încep un business în IT. SRL sau PFA? Care sunt criteriile de decizie?', 298, 13, false, NOW() - INTERVAL '3 days');

    -- Thread 13
    INSERT INTO forum_threads (id, category_id, user_id, title, content, views, replies, created_at)
    VALUES (gen_random_uuid(), cat_efactura_id, user3_id, 'Erori comune în e-Factura - Troubleshooting Guide', 'Lista erorilor ANAF și cum le rezolv:\n\n**Error 101:** CIF invalid\n**Error 205:** Suma TVA incorectă\n**Error 303:** XML malformat\n\nAdăugați alte erori întâlnite!', 387, 19, false, NOW() - INTERVAL '2 days');

    -- Thread 14
    INSERT INTO forum_threads (id, category_id, user_id, title, content, views, replies, created_at)
    VALUES (gen_random_uuid(), cat_accounting_id, admin_user_id, 'Inventar anual - Checklist și proceduri', 'Ghid pentru inventarul de sfârșit de an:\n\n1. Inventarierea stocurilor\n2. Reconcilieri bancare\n3. Verificare clienți/furnizori\n4. Amortizări\n5. Provisioane', 267, 11, false, NOW() - INTERVAL '1 day');

    -- Thread 15
    INSERT INTO forum_threads (id, category_id, user_id, title, content, views, replies, created_at)
    VALUES (gen_random_uuid(), cat_fiscal_id, user2_id, 'GDPR și facturare electronică - Ce date pot stoca?', 'Conform GDPR, ce date personale pot stoca în facturi? Cât timp trebuie păstrate? Ce despre arhivarea electronică?', 198, 8, false, NOW() - INTERVAL '6 hours');

    -- Thread 16
    INSERT INTO forum_threads (id, category_id, user_id, title, content, views, replies, created_at)
    VALUES (gen_random_uuid(), cat_software_id, user3_id, 'Backup și disaster recovery - Best practices', 'Ce strategie de backup folosiți pentru datele contabile?\n\nPersonal:\n- Backup zilnic automat\n- Redundanță cloud + local\n- Test recovery lunar\n\nVoi?', 156, 9, false, NOW() - INTERVAL '5 hours');

    -- Thread 17
    INSERT INTO forum_threads (id, category_id, user_id, title, content, views, replies, created_at)
    VALUES (gen_random_uuid(), cat_business_id, admin_user_id, 'KPIs financiari pentru SRL - Care sunt cei mai importanți?', 'Lista mea de KPIs esențiali:\n\n1. **Lichiditate:** Current Ratio\n2. **Profitabilitate:** Marja netă\n3. **Eficiență:** DSO (Days Sales Outstanding)\n4. **Solvabilitate:** Debt-to-Equity\n\nCe altceva monitorizați?', 423, 22, true, NOW() - INTERVAL '30 days');

    -- Thread 18
    INSERT INTO forum_threads (id, category_id, user_id, title, content, views, replies, created_at)
    VALUES (gen_random_uuid(), cat_efactura_id, user2_id, 'Tranzacții intracomunitare în e-Factura', 'Cum raportez o vânzare B2B în Germania prin e-Factura?\n\nTrebuie ceva special în XML? Cod TVA UE? Reverse charge?', 187, 7, false, NOW() - INTERVAL '4 hours');

    -- Thread 19
    INSERT INTO forum_threads (id, category_id, user_id, title, content, views, replies, created_at)
    VALUES (gen_random_uuid(), cat_accounting_id, user3_id, 'Ponte contabile de sfârșit de an - Legal sau ilegal?', 'Care sunt "pontele" legale de optimizare fiscală de sfârșit de an?\n\n- Achiziții de mijloace fixe?\n- Bonusuri angajați?\n- Sponsorizări?\n\nDiscutăm!', 512, 28, false, NOW() - INTERVAL '3 hours');

    -- Thread 20
    INSERT INTO forum_threads (id, category_id, user_id, title, content, views, replies, created_at)
    VALUES (gen_random_uuid(), cat_software_id, admin_user_id, 'Automatizare procese contabile - ROI în practică', 'Studiu de caz: Am automatizat procesele contabile în firma mea.\n\n**Înainte:**\n- 20 ore/lună procesare facturi\n- 5% erori\n- 10 ore reconcilieri\n\n**După automatizare:**\n- 3 ore/lună review\n- <1% erori\n- 1 oră reconcilieri\n\n**ROI:** 85% reducere timp, payback 4 luni!\n\nPovestiți și voi!', 634, 31, true, NOW() - INTERVAL '45 days');

END $$;

-- Add some helpful replies to recent threads
INSERT INTO forum_replies (thread_id, user_id, content, created_at)
SELECT
    t.id,
    u.id,
    'Foarte util acest thread! Am marcat pentru referință viitoare.',
    NOW() - INTERVAL '2 hours'
FROM forum_threads t
CROSS JOIN LATERAL (SELECT id FROM users WHERE email = 'expert1@documentiulia.ro' LIMIT 1) u
WHERE t.title LIKE '%Tranzacții intracomunitare%';

-- Summary statistics
DO $$
DECLARE
    total_threads INTEGER;
    total_replies INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_threads FROM forum_threads;
    SELECT COUNT(*) INTO total_replies FROM forum_replies;

    RAISE NOTICE 'Forum seed complete!';
    RAISE NOTICE 'Total threads: %', total_threads;
    RAISE NOTICE 'Total replies: %', total_replies;
END $$;
