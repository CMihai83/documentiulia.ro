/**
 * 2026 Fiscal Compliance Content Seed
 * Seeds blog posts, forum topics, and course content about Romanian fiscal reforms
 */

import { PrismaClient, BlogPostStatus, CourseDifficulty } from '@prisma/client';

const prisma = new PrismaClient();

// 2026 Compliance Blog Posts
const complianceBlogPosts = [
  {
    title: 'Ghid complet: Noile cote TVA 2026 în România',
    slug: 'ghid-cote-tva-2026-romania',
    excerpt: 'Tot ce trebuie să știi despre modificările TVA din August 2025: cota standard de 21% și cota redusă de 11%.',
    content: `
# Noile cote TVA în România - Ghid complet pentru 2025-2026

## Introducere

Începând cu **1 August 2025**, România implementează modificări semnificative ale cotelor de TVA ca parte a reformei fiscale pentru consolidare bugetară.

## Modificările principale

### 1. Cota standard TVA: de la 19% la 21%

Cota standard de TVA crește la **21%** pentru majoritatea bunurilor și serviciilor. Aceasta este cea mai mare creștere din ultimii 10 ani.

**Impact:**
- Toate facturile emise după 1 August 2025 trebuie să utilizeze noua cotă
- Contractele pe termen lung trebuie revizuite
- Sistemele de facturare necesită actualizare

### 2. Cota redusă: de la 9% la 11%

Cota redusă crește la **11%** pentru:
- Produse alimentare
- Servicii de catering și restaurant
- Apă potabilă
- Medicamente de uz uman
- Cărți, ziare, reviste
- Cazare hotelieră

### 3. Cota super-redusă de 5% rămâne neschimbată

Cota de 5% se menține pentru:
- Locuințe sociale
- Manuale școlare
- Servicii culturale

## Calendar de implementare

| Data | Eveniment |
|------|-----------|
| 1 Aug 2025 | Intrare în vigoare TVA 21%/11% |
| 1 Ian 2026 | Impozit dividende 10% |
| 1 Iul 2026 | e-Factura B2B obligatorie |

## Ce trebuie să faci acum

1. **Actualizează sistemul de facturare** pentru noile cote
2. **Revizuiește contractele** cu clauză de ajustare preț
3. **Notifică clienții** despre modificarea prețurilor
4. **Pregătește inventarul** - consideră impact asupra marjelor
5. **Verifică SAF-T** pentru noile coduri de cotă

## Excepții și tranziții

Pentru livrările parțiale sau contractele pe termen lung:
- Bunurile livrate înainte de 1 August: cotă veche
- Bunurile livrate după 1 August: cotă nouă
- Avansurile încasate înainte de 1 August pentru livrări după: cotă veche pentru suma avans

## Concluzii

Pregătirea din timp este esențială. DocumentIulia.ro vă oferă toate instrumentele necesare pentru tranziția la noile cote TVA, inclusiv actualizare automată a cotelor în funcție de data tranzacției.
    `,
    metaTitle: 'Ghid TVA 2026 România - Cote noi 21% și 11%',
    metaDescription: 'Ghid complet despre modificările TVA din 2026 în România: cota standard 21%, cota redusă 11%, calendar implementare și ce trebuie să faci.',
    tags: ['tva-2026', 'reforma-fiscala', 'contabilitate'],
    featured: true,
    readingTime: 8,
  },
  {
    title: 'e-Factura B2B devine obligatorie din Iulie 2026',
    slug: 'efactura-b2b-obligatorie-2026',
    excerpt: 'De la 1 Iulie 2026, toate tranzacțiile B2B trebuie facturate electronic prin SPV ANAF. Pregătește-te acum!',
    content: `
# e-Factura B2B obligatorie din Iulie 2026

## Context și cadru legal

Prin Ordinul 1.783/2024, ANAF extinde obligativitatea e-Factura la toate tranzacțiile B2B (business-to-business) începând cu **1 Iulie 2026**.

## Ce se schimbă?

### Situația actuală (2024-2025)
- e-Factura B2G: **Obligatorie** pentru contracte publice
- e-Factura B2C: **Obligatorie** de la 1 ianuarie 2024
- e-Factura B2B: Opțională

### Din Iulie 2026
- **TOATE** facturile între firme românești trebuie transmise prin SPV
- Format obligatoriu: XML conform standardului UBL 2.1
- Termen: 5 zile de la emitere

## Pași pentru pregătire

### 1. Obține certificatul digital ANAF
- Tip: Certificat calificat sau certificat de semnătură electronică
- Durată procesare: 2-4 săptămâni
- Cost: ~200-500 RON/an

### 2. Integrează sistemul de facturare
DocumentIulia.ro oferă integrare nativă cu SPV ANAF:
- Generare automată XML
- Validare înainte de trimitere
- Monitorizare status
- Arhivare legală

### 3. Instruiește echipa
- Training utilizare SPV
- Proceduri interne pentru erori
- Responsabilități clare

## Sancțiuni pentru neconformare

| Încălcare | Amendă |
|-----------|--------|
| Netransmitere factură | 5.000 - 10.000 RON |
| Transmitere tardivă | 1.000 - 5.000 RON |
| Date incorecte | 2.500 - 5.000 RON |

## Beneficii e-Factura B2B

- Reducere erori de procesare
- Deducere TVA automată
- Arhivare electronică gratuită
- Transparență fiscală

## Concluzie

Nu amâna pregătirea! Cu 18 luni înainte de termenul limită, ai suficient timp să implementezi corect e-Factura B2B.
    `,
    metaTitle: 'e-Factura B2B obligatorie 2026 - Ghid complet pregătire',
    metaDescription: 'De la 1 Iulie 2026 e-Factura B2B devine obligatorie. Află cum te pregătești: certificat ANAF, integrare SPV, sancțiuni.',
    tags: ['e-factura', 'b2b', '2026', 'anaf'],
    featured: true,
    readingTime: 6,
  },
  {
    title: 'Impozit dividende 10% din 2026 - Ce trebuie să știi',
    slug: 'impozit-dividende-10-procent-2026',
    excerpt: 'Impozitul pe dividende crește de la 8% la 10% începând cu 1 ianuarie 2026. Strategii de optimizare și planificare.',
    content: `
# Impozit dividende 10% - Modificări 2026

## Cadru legislativ

Conform OUG pentru reforma fiscală, impozitul pe dividendele distribuite persoanelor fizice crește de la **8% la 10%** începând cu **1 ianuarie 2026**.

## Cine este afectat?

### Persoane fizice rezidente
- Asociați și acționari la SRL, SA, SCA
- Beneficiari de dividende din participații
- Venituri din drepturi de proprietate intelectuală (similare dividendelor)

### Persoane juridice
- Impozit 0% între companiile române (participare min 10%, 1 an deținere)
- Impozit conform convenții pentru dividende către nerezidenți

## Comparație rate

| Țara | Rată impozit dividende |
|------|----------------------|
| România 2024 | 8% |
| România 2026 | 10% |
| Bulgaria | 5% |
| Ungaria | 15% |
| Polonia | 19% |

## Strategii de optimizare

### 1. Distribuire anticipată
Dacă ai profituri nedistribuite, consideră distribuirea **înainte de 31 decembrie 2025** pentru a beneficia de rata de 8%.

### 2. Reinvestire profit
Profitul reinvestit în echipamente și tehnologie beneficiază de facilități fiscale.

### 3. Structurare holding
Pentru grupuri de companii, evaluează:
- Directiva mamă-fiică UE
- Convenții de evitare a dublei impuneri
- Structuri holding în jurisdicții favorabile

### 4. Salarizare vs dividende
Recalculează raportul optim salariu/dividende:
- CASS pe dividende: 10% (nu mai mult de 12 salarii minime)
- Impozit salariu: 10%
- Contribuții sociale salariu: ~35% total

## Calendar distribuire optimă

| Perioadă | Acțiune recomandată |
|----------|-------------------|
| T1 2025 | Analiza profit disponibil |
| T2 2025 | Hotărâre AGA pentru distribuire |
| T3 2025 | Plată dividende (8%) |
| T4 2025 | Ultimele distribuiri la 8% |

## Exemple practice

### Exemplu: Distribuire 100.000 RON

**În 2025 (8%):**
- Impozit: 8.000 RON
- Net primit: 92.000 RON

**În 2026 (10%):**
- Impozit: 10.000 RON
- Net primit: 90.000 RON

**Diferență: 2.000 RON / 100.000 RON dividende**

## Concluzii

Planificarea fiscală anticipată poate genera economii semnificative. Consultă-te cu un specialist fiscal pentru situația ta particulară.
    `,
    metaTitle: 'Impozit dividende 10% din 2026 - Strategi optimizare',
    metaDescription: 'Impozitul pe dividende crește la 10% din 2026. Află strategii de optimizare: distribuire anticipată, reinvestire, structurare holding.',
    tags: ['dividende', 'impozit', '2026', 'optimizare-fiscala'],
    featured: false,
    readingTime: 7,
  },
  {
    title: 'SAF-T D406 în 2026 - Actualizări și extinderi',
    slug: 'saft-d406-actualizari-2026',
    excerpt: 'Raportarea SAF-T evoluează în 2026 cu noi cerințe și câmpuri obligatorii. Ghid de conformitate.',
    content: `
# SAF-T D406 - Actualizări 2026

## Ce este SAF-T?

Standard Audit File for Tax (SAF-T) este formatul standardizat de raportare fiscală electronică adoptat de România din 2022.

## Modificări planificate 2026

### Noi câmpuri obligatorii

1. **Codul NACE al partenerului**
   - Obligatoriu pentru tranzacții B2B
   - Validare automată la transmitere

2. **Referință e-Factura**
   - ID-ul din SPV pentru facturile electronice
   - Reconciliere automată ANAF

3. **Informații e-Transport**
   - Codul UIT pentru transporturi declarate
   - Legătură între tranzacție și transport

### Noi categorii de raportare

- **Tranzacții cu criptoactive** - raportare separată
- **Plăți instantanee** - detalii suplimentare
- **Subvenții și granturi** - categorie dedicată

## Calendar implementare

| Data | Eveniment |
|------|-----------|
| Q1 2025 | Publicare schemă XSD actualizată |
| Q2 2025 | Perioadă de testare |
| Q3 2025 | Implementare graduală |
| Q1 2026 | Obligatoriu pentru toți |

## Pregătire tehnică

### 1. Actualizează sistemul contabil
- Export SAF-T conform noii scheme
- Mapare conturi pe noile categorii
- Testare validări

### 2. Colectează datele noi
- NACE parteneri
- ID-uri e-Factura
- Coduri UIT e-Transport

### 3. Automatizează procesul
- Generare lunară automată
- Validare pre-submisie
- Arhivare conformă

## Sancțiuni

- Netransmitere: 1.000 - 5.000 RON
- Erori sistematice: 2.000 - 10.000 RON
- Refuz rectificare: 5.000 - 20.000 RON

## Resurse utile

DocumentIulia.ro generează automat fișierul SAF-T D406 conform ultimelor specificații ANAF.
    `,
    metaTitle: 'SAF-T D406 modificări 2026 - Ghid actualizare',
    metaDescription: 'Actualizări SAF-T D406 pentru 2026: noi câmpuri obligatorii, categorii raportare, calendar implementare și pregătire tehnică.',
    tags: ['saft', 'd406', '2026', 'raportare-anaf'],
    featured: false,
    readingTime: 5,
  },
  {
    title: 'Calcul ESG și amprentă de carbon pentru IMM-uri românești',
    slug: 'esg-amprenta-carbon-imm-romania',
    excerpt: 'Cum să calculezi și raportezi amprenta de carbon a companiei tale conform cerințelor CSRD.',
    content: `
# ESG și Amprenta de Carbon - Ghid pentru IMM-uri

## Ce este ESG?

ESG (Environmental, Social, Governance) reprezintă criteriile de sustenabilitate după care sunt evaluate companiile:

- **E**nvironmental: Impact de mediu
- **S**ocial: Relații cu angajații, comunitatea
- **G**overnance: Conducere etică, transparență

## De ce contează pentru IMM-uri?

### Obligații legale (CSRD)
Din 2025-2026, Directiva CSRD extinde raportarea ESG:
- 2024: Companii mari (500+ angajați)
- 2025: Companii mijlocii listate
- 2026: IMM-uri listate

### Avantaje competitive
- Acces la finanțare verde
- Preferință în achiziții publice
- Parteneriate cu multinaționale
- Imagine de brand îmbunătățită

## Calculul amprentei de carbon

### Scope 1: Emisii directe
- Combustibil vehicule proprii
- Gaz natural pentru încălzire
- Generatoare diesel

### Scope 2: Emisii indirecte energie
- Electricitate consumată
- Încălzire district

### Scope 3: Lanț de valoare
- Călătorii de afaceri
- Achiziții
- Transport marfă

## Factori de emisie România 2024

| Sursă | Factor emisie |
|-------|--------------|
| Electricitate grid | 0.299 kg CO2/kWh |
| Gaz natural | 1.93 kg CO2/m³ |
| Motorină | 2.68 kg CO2/litru |
| Benzină | 2.31 kg CO2/litru |

## Calculatorul ESG DocumentIulia

Platforma noastră oferă:
- Calcul automat din cheltuieli
- Raportare conform GHG Protocol
- Recomandări de reducere
- Opțiuni de compensare

## Reducerea emisiilor

### Acțiuni rapide (ROI < 1 an)
1. LED și senzori mișcare: -15% electricitate
2. Optimizare trasee: -10% combustibil
3. Digitalizare documente: -40% hârtie

### Investiții medii (ROI 1-3 ani)
1. Panouri solare
2. Vehicule electrice
3. Izolație termică

## Concluzie

Începe acum măsurarea amprentei de carbon. DocumentIulia.ro transformă automat cheltuielile în metrici ESG.
    `,
    metaTitle: 'Calcul ESG amprentă carbon IMM România - Ghid complet',
    metaDescription: 'Ghid ESG pentru IMM-uri românești: calcul amprentă carbon, obligații CSRD, factori emisie și strategii de reducere.',
    tags: ['esg', 'carbon', 'sustenabilitate', 'csrd'],
    featured: false,
    readingTime: 6,
  },
];

// 2026 Forum Topics
const complianceForumTopics = [
  {
    categorySlug: 'fiscalitate',
    title: 'TVA 21% de la 1 august 2025 - cum ajustăm prețurile?',
    content: 'Cu creșterea TVA de la 19% la 21%, cum recomandați să ajustăm prețurile către clienți? Absorbim diferența sau transferăm integral?',
    tags: ['tva-2026', 'preturi', 'strategie'],
  },
  {
    categorySlug: 'fiscalitate',
    title: 'Contracte pe termen lung și TVA 21% - ce cotă aplicăm?',
    content: 'Am contracte de servicii încheiate în 2024 care se execută în 2025-2026. Ce cotă TVA aplic pentru livrările după 1 august?',
    tags: ['tva-2026', 'contracte', 'livrari'],
  },
  {
    categorySlug: 'fiscalitate',
    title: 'Impozit dividende 10% - când distribuim?',
    content: 'Avem profit nedistribuit din 2023. Merită să distribuim totul înainte de 2026 pentru a plăti 8% în loc de 10%?',
    tags: ['dividende', '2026', 'optimizare'],
  },
  {
    categorySlug: 'e-factura',
    title: 'e-Factura B2B obligatorie iulie 2026 - cum ne pregătim?',
    content: 'Ce pași trebuie să urmăm pentru implementarea e-Factura B2B? Avem soft propriu de facturare și vrem să integrăm cu ANAF.',
    tags: ['e-factura', 'b2b', '2026'],
  },
  {
    categorySlug: 'e-factura',
    title: 'Certificat digital pentru e-Factura - experiențe',
    content: 'De unde ați obținut certificatul digital pentru semnarea e-Facturilor? Ce furnizori recomandați și ce costuri implică?',
    tags: ['e-factura', 'certificat', 'semnatura'],
  },
  {
    categorySlug: 'saft',
    title: 'SAF-T 2026 - noi câmpuri obligatorii',
    content: 'Am citit că din 2026 SAF-T va avea câmpuri noi obligatorii. Ce modificări anticipați și cum vă pregătiți?',
    tags: ['saft', '2026', 'modificari'],
  },
  {
    categorySlug: 'contabilitate',
    title: 'ESG reporting pentru IMM - obligatoriu din 2026?',
    content: 'Firma noastră are 150 angajați. Suntem obligați la raportare ESG din 2026 sau doar companiile listate?',
    tags: ['esg', 'csrd', 'raportare'],
  },
  {
    categorySlug: 'contabilitate',
    title: 'Calcul amprentă carbon din cheltuieli contabile',
    content: 'Există o metodă simplă de a estima amprenta de carbon pornind de la cheltuielile din balanta? Ce factori de emisie folosiți?',
    tags: ['carbon', 'esg', 'cheltuieli'],
  },
  {
    categorySlug: 'fiscalitate',
    title: 'Convenție dublă impunere UK post-Brexit',
    content: 'Avem parteneri în UK. Ce trebuie să știm despre impozitarea dividendelor și dobânzilor după Brexit?',
    tags: ['dubla-impunere', 'uk', 'dividende'],
  },
  {
    categorySlug: 'fiscalitate',
    title: 'Optimizare fiscală legală 2026 - sfaturi practice',
    content: 'Ce strategii legale de optimizare fiscală recomandați pentru 2026 ținând cont de noile cote TVA și impozit dividende?',
    tags: ['optimizare', '2026', 'strategie'],
  },
];

async function seedComplianceContent() {
  console.log('🌱 Starting 2026 compliance content seed...');

  // Get or create admin user for blog posts
  let adminUser = await prisma.user.findFirst({
    where: { email: { contains: 'admin' } },
  });

  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        clerkId: 'clerk_admin_seed_2026',
        email: 'admin@documentiulia.ro',
        firstName: 'Admin',
        lastName: 'DocumentIulia',
      },
    });
    console.log('✅ Created admin user');
  }

  // Seed blog posts
  console.log('📝 Seeding 2026 compliance blog posts...');
  for (const post of complianceBlogPosts) {
    const existingPost = await prisma.blogPost.findUnique({
      where: { slug: post.slug },
    });

    if (!existingPost) {
      await prisma.blogPost.create({
        data: {
          authorId: adminUser.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          metaTitle: post.metaTitle,
          metaDescription: post.metaDescription,
          tags: post.tags,
          status: BlogPostStatus.PUBLISHED,
          readingTime: post.readingTime,
          publishedAt: new Date(),
        },
      });
      console.log(`  ✓ Created blog post: ${post.slug}`);
    } else {
      console.log(`  - Blog post exists: ${post.slug}`);
    }
  }

  // Seed forum topics
  console.log('💬 Seeding 2026 compliance forum topics...');
  for (const topic of complianceForumTopics) {
    // Find category
    const category = await prisma.forumCategory.findFirst({
      where: { slug: topic.categorySlug },
    });

    if (!category) {
      console.log(`  ⚠ Category not found: ${topic.categorySlug}`);
      continue;
    }

    const existingTopic = await prisma.forumTopic.findFirst({
      where: { title: topic.title },
    });

    if (!existingTopic) {
      // Generate slug from title
      const slug = topic.title
        .toLowerCase()
        .replace(/[ăâ]/g, 'a')
        .replace(/[î]/g, 'i')
        .replace(/[șş]/g, 's')
        .replace(/[țţ]/g, 't')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 100);

      await prisma.forumTopic.create({
        data: {
          categoryId: category.id,
          authorId: adminUser.id,
          title: topic.title,
          slug: `${slug}-${Date.now().toString(36)}`,
          content: topic.content,
          isPinned: false,
          isLocked: false,
        },
      });
      console.log(`  ✓ Created forum topic: ${topic.title.substring(0, 40)}...`);
    } else {
      console.log(`  - Forum topic exists: ${topic.title.substring(0, 40)}...`);
    }
  }

  console.log('✅ 2026 compliance content seed completed!');
}

// Run if executed directly
seedComplianceContent()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export { seedComplianceContent, complianceBlogPosts, complianceForumTopics };
