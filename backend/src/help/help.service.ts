import { Injectable } from '@nestjs/common';

export interface HelpArticle {
  id: string;
  title: string;
  titleRo: string;
  slug: string;
  category: HelpCategory;
  content: string;
  contentRo: string;
  tags: string[];
  views: number;
  helpful: number;
  notHelpful: number;
  lastUpdated: string;
  relatedArticles: string[];
}

export interface HelpCategory {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  icon: string;
  order: number;
  articleCount: number;
}

export interface FAQ {
  id: string;
  question: string;
  questionRo: string;
  answer: string;
  answerRo: string;
  category: string;
  order: number;
}

export interface Tutorial {
  id: string;
  title: string;
  titleRo: string;
  description: string;
  descriptionRo: string;
  steps: TutorialStep[];
  estimatedMinutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  module: string;
}

export interface TutorialStep {
  order: number;
  title: string;
  titleRo: string;
  content: string;
  contentRo: string;
  imageUrl?: string;
  videoUrl?: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
  responses: TicketResponse[];
}

export interface TicketResponse {
  id: string;
  content: string;
  authorType: 'customer' | 'support' | 'ai';
  authorName: string;
  createdAt: string;
}

export interface Glossary {
  term: string;
  termRo: string;
  definition: string;
  definitionRo: string;
  category: string;
  relatedTerms: string[];
}

@Injectable()
export class HelpService {
  private readonly categories: HelpCategory[] = [
    {
      id: 'getting-started',
      name: 'Getting Started',
      nameRo: 'Primii Pași',
      description: 'Learn the basics of DocumentIulia',
      descriptionRo: 'Învață elementele de bază ale DocumentIulia',
      icon: 'rocket',
      order: 1,
      articleCount: 8,
    },
    {
      id: 'invoicing',
      name: 'Invoicing & e-Factura',
      nameRo: 'Facturare și e-Factura',
      description: 'Create invoices and submit to ANAF',
      descriptionRo: 'Creează facturi și trimite la ANAF',
      icon: 'file-text',
      order: 2,
      articleCount: 12,
    },
    {
      id: 'vat-taxes',
      name: 'VAT & Taxes',
      nameRo: 'TVA și Taxe',
      description: 'VAT calculation and tax compliance',
      descriptionRo: 'Calcul TVA și conformitate fiscală',
      icon: 'percent',
      order: 3,
      articleCount: 10,
    },
    {
      id: 'saft-d406',
      name: 'SAF-T D406',
      nameRo: 'SAF-T D406',
      description: 'Generate and submit SAF-T declarations',
      descriptionRo: 'Generează și trimite declarații SAF-T',
      icon: 'database',
      order: 4,
      articleCount: 6,
    },
    {
      id: 'hr-payroll',
      name: 'HR & Payroll',
      nameRo: 'HR și Salarizare',
      description: 'Employee management and payroll',
      descriptionRo: 'Gestionare angajați și salarii',
      icon: 'users',
      order: 5,
      articleCount: 15,
    },
    {
      id: 'reports',
      name: 'Reports & Analytics',
      nameRo: 'Rapoarte și Analize',
      description: 'Financial reports and business insights',
      descriptionRo: 'Rapoarte financiare și analize de business',
      icon: 'bar-chart',
      order: 6,
      articleCount: 8,
    },
    {
      id: 'ocr-ai',
      name: 'OCR & AI Features',
      nameRo: 'OCR și Funcții AI',
      description: 'Document scanning and AI assistant',
      descriptionRo: 'Scanare documente și asistent AI',
      icon: 'scan',
      order: 7,
      articleCount: 5,
    },
    {
      id: 'account-settings',
      name: 'Account & Settings',
      nameRo: 'Cont și Setări',
      description: 'Manage your account and preferences',
      descriptionRo: 'Gestionează contul și preferințele',
      icon: 'settings',
      order: 8,
      articleCount: 7,
    },
  ];

  private readonly articles: HelpArticle[] = [
    {
      id: 'art-001',
      title: 'Creating Your First Invoice',
      titleRo: 'Crearea Primei Tale Facturi',
      slug: 'creating-first-invoice',
      category: this.categories.find(c => c.id === 'invoicing')!,
      content: `# Creating Your First Invoice

## Step 1: Navigate to Invoices
From your dashboard, click on "Invoices" in the left sidebar menu.

## Step 2: Click "New Invoice"
Click the blue "New Invoice" button in the top right corner.

## Step 3: Fill in Client Details
- Select an existing client or create a new one
- Enter client CUI/CIF for Romanian companies
- The system will auto-fill company details from ANAF

## Step 4: Add Invoice Items
- Click "Add Item" to add products or services
- Enter description, quantity, unit price
- VAT rate is automatically calculated (21% standard, 11% reduced)

## Step 5: Review and Save
- Check all details are correct
- Click "Save Draft" to save without sending
- Click "Generate" to create the final invoice

## Tips
- Use templates for recurring invoices
- Enable e-Factura integration for B2B compliance
- Export to PDF or send directly via email`,
      contentRo: `# Crearea Primei Tale Facturi

## Pasul 1: Navighează la Facturi
Din tabloul de bord, click pe "Facturi" în meniul din stânga.

## Pasul 2: Click "Factură Nouă"
Click pe butonul albastru "Factură Nouă" din colțul din dreapta sus.

## Pasul 3: Completează Detaliile Clientului
- Selectează un client existent sau creează unul nou
- Introdu CUI/CIF pentru companiile românești
- Sistemul va completa automat datele companiei de la ANAF

## Pasul 4: Adaugă Articole pe Factură
- Click "Adaugă Articol" pentru produse sau servicii
- Introdu descriere, cantitate, preț unitar
- Cota TVA se calculează automat (21% standard, 11% redusă)

## Pasul 5: Verifică și Salvează
- Verifică toate detaliile
- Click "Salvează Ciornă" pentru a salva fără a trimite
- Click "Generează" pentru a crea factura finală

## Sfaturi
- Folosește șabloane pentru facturi recurente
- Activează integrarea e-Factura pentru conformitate B2B
- Exportă în PDF sau trimite direct prin email`,
      tags: ['invoice', 'getting-started', 'e-factura'],
      views: 15420,
      helpful: 892,
      notHelpful: 23,
      lastUpdated: '2025-12-10',
      relatedArticles: ['art-002', 'art-003', 'art-004'],
    },
    {
      id: 'art-002',
      title: 'E-Factura B2B Integration Guide',
      titleRo: 'Ghid Integrare e-Factura B2B',
      slug: 'efactura-b2b-integration',
      category: this.categories.find(c => c.id === 'invoicing')!,
      content: `# E-Factura B2B Integration Guide

## What is e-Factura?
E-Factura is Romania's mandatory electronic invoicing system for B2B transactions, managed by ANAF.

## When is it Required?
- **Mid-2026**: Mandatory for all B2B transactions
- **Currently**: Voluntary but recommended

## Setup Steps

### 1. Enable SPV Integration
Go to Settings > ANAF Integration > Enable SPV OAuth.

### 2. Authenticate with ANAF
Click "Connect to ANAF SPV" and log in with your ANAF credentials.

### 3. Configure Auto-Submission
Choose whether to automatically submit invoices or review first.

## Validation
All e-Factura invoices are validated against:
- UBL 2.1 XML schema
- ANAF business rules
- Romanian legal requirements`,
      contentRo: `# Ghid Integrare e-Factura B2B

## Ce este e-Factura?
E-Factura este sistemul obligatoriu de facturare electronică din România pentru tranzacții B2B, gestionat de ANAF.

## Când este Obligatorie?
- **Mijlocul 2026**: Obligatorie pentru toate tranzacțiile B2B
- **În prezent**: Voluntară dar recomandată

## Pași de Configurare

### 1. Activează Integrarea SPV
Mergi la Setări > Integrare ANAF > Activează SPV OAuth.

### 2. Autentificare cu ANAF
Click "Conectare la ANAF SPV" și autentifică-te cu credențialele ANAF.

### 3. Configurează Trimiterea Automată
Alege dacă trimiți automat facturile sau le revizuiești mai întâi.

## Validare
Toate facturile e-Factura sunt validate conform:
- Schema XML UBL 2.1
- Reguli de business ANAF
- Cerințe legale românești`,
      tags: ['e-factura', 'anaf', 'b2b', 'compliance'],
      views: 8930,
      helpful: 567,
      notHelpful: 12,
      lastUpdated: '2025-12-11',
      relatedArticles: ['art-001', 'art-005'],
    },
    {
      id: 'art-003',
      title: 'Understanding VAT Rates in Romania',
      titleRo: 'Înțelegerea Cotelor TVA în România',
      slug: 'vat-rates-romania',
      category: this.categories.find(c => c.id === 'vat-taxes')!,
      content: `# Understanding VAT Rates in Romania (Legea 141/2025)

## Standard Rate: 21%
Applies to most goods and services.

## Reduced Rate: 11%
Applies to:
- Books and publications
- Hotel accommodations
- Restaurant services
- Certain medical equipment

## Exempt Categories
- Financial and insurance services
- Educational services
- Medical services
- Real estate transactions

## VAT Calculator
Use our built-in calculator at Dashboard > VAT Calculator for instant calculations.`,
      contentRo: `# Înțelegerea Cotelor TVA în România (Legea 141/2025)

## Cota Standard: 21%
Se aplică majorității bunurilor și serviciilor.

## Cota Redusă: 11%
Se aplică pentru:
- Cărți și publicații
- Cazare hotelieră
- Servicii de restaurant
- Anumite echipamente medicale

## Categorii Scutite
- Servicii financiare și de asigurări
- Servicii educaționale
- Servicii medicale
- Tranzacții imobiliare

## Calculator TVA
Folosește calculatorul nostru integrat la Dashboard > Calculator TVA pentru calcule instantanee.`,
      tags: ['vat', 'tax', 'romania', 'legea-141'],
      views: 12340,
      helpful: 789,
      notHelpful: 15,
      lastUpdated: '2025-08-01',
      relatedArticles: ['art-004', 'art-006'],
    },
    {
      id: 'art-004',
      title: 'SAF-T D406 Monthly Declaration',
      titleRo: 'Declarația Lunară SAF-T D406',
      slug: 'saft-d406-monthly',
      category: this.categories.find(c => c.id === 'saft-d406')!,
      content: `# SAF-T D406 Monthly Declaration (Order 1783/2021)

## What is SAF-T?
Standard Audit File for Tax - an international XML format for exchanging accounting data with tax authorities.

## Deadlines
- **Monthly submission**: By the 25th of the following month
- **Pilot period**: September 2025 - August 2026 (6-month grace)
- **File size limit**: <500MB per submission

## How to Generate

### Step 1: Go to ANAF > SAF-T D406
Navigate from the main menu to the SAF-T section.

### Step 2: Select Period
Choose the month and year for declaration.

### Step 3: Generate XML
Click "Generate D406" - the system validates data automatically.

### Step 4: Download & Submit
Download the XML file and submit via ANAF SPV.

## Validation
We validate against:
- XSD schema per Order 1783/2021
- DUKIntegrator rules
- ANAF business requirements`,
      contentRo: `# Declarația Lunară SAF-T D406 (Ordinul 1783/2021)

## Ce este SAF-T?
Standard Audit File for Tax - un format XML internațional pentru schimbul de date contabile cu autoritățile fiscale.

## Termene
- **Depunere lunară**: Până pe 25 a lunii următoare
- **Perioadă pilot**: Septembrie 2025 - August 2026 (6 luni grație)
- **Limită mărime fișier**: <500MB per depunere

## Cum Generezi

### Pasul 1: Mergi la ANAF > SAF-T D406
Navighează din meniul principal la secțiunea SAF-T.

### Pasul 2: Selectează Perioada
Alege luna și anul pentru declarație.

### Pasul 3: Generează XML
Click "Generează D406" - sistemul validează datele automat.

### Pasul 4: Descarcă și Trimite
Descarcă fișierul XML și trimite prin ANAF SPV.

## Validare
Validăm conform:
- Schema XSD conform Ordinului 1783/2021
- Reguli DUKIntegrator
- Cerințe business ANAF`,
      tags: ['saf-t', 'd406', 'anaf', 'xml', 'compliance'],
      views: 9870,
      helpful: 654,
      notHelpful: 8,
      lastUpdated: '2025-12-05',
      relatedArticles: ['art-002', 'art-003'],
    },
    {
      id: 'art-005',
      title: 'Using OCR to Scan Documents',
      titleRo: 'Folosirea OCR pentru Scanarea Documentelor',
      slug: 'ocr-document-scanning',
      category: this.categories.find(c => c.id === 'ocr-ai')!,
      content: `# Using OCR to Scan Documents

## Supported Document Types
- Invoices (supplier invoices)
- Receipts
- Bank statements
- Contracts

## How to Scan

### Desktop
1. Go to Dashboard > OCR
2. Drag & drop files or click to upload
3. Wait for processing (usually 2-5 seconds)
4. Review extracted data
5. Confirm or edit values

### Mobile App
1. Open the app
2. Tap the camera icon
3. Take a photo of the document
4. AI extracts data automatically

## OCR Accuracy
Our AI achieves 99%+ accuracy on:
- Romanian invoices
- Standard receipt formats
- EU document formats

## Tips for Best Results
- Ensure good lighting
- Keep document flat
- Avoid glare and shadows
- Use high resolution images`,
      contentRo: `# Folosirea OCR pentru Scanarea Documentelor

## Tipuri de Documente Suportate
- Facturi (facturi furnizori)
- Bonuri fiscale
- Extrase bancare
- Contracte

## Cum Scanezi

### Desktop
1. Mergi la Dashboard > OCR
2. Trage și plasează fișiere sau click pentru încărcare
3. Așteaptă procesarea (de obicei 2-5 secunde)
4. Revizuiește datele extrase
5. Confirmă sau editează valorile

### Aplicație Mobilă
1. Deschide aplicația
2. Apasă pe iconița camerei
3. Fotografiază documentul
4. AI extrage datele automat

## Precizie OCR
AI-ul nostru atinge 99%+ precizie pentru:
- Facturi românești
- Formate standard de bonuri
- Formate documente UE

## Sfaturi pentru Rezultate Optime
- Asigură iluminare bună
- Ține documentul plat
- Evită reflexiile și umbrele
- Folosește imagini de rezoluție înaltă`,
      tags: ['ocr', 'ai', 'documents', 'scanning'],
      views: 7650,
      helpful: 523,
      notHelpful: 19,
      lastUpdated: '2025-12-08',
      relatedArticles: ['art-001', 'art-006'],
    },
  ];

  private readonly faqs: FAQ[] = [
    {
      id: 'faq-001',
      question: 'What is the current VAT rate in Romania?',
      questionRo: 'Care este cota TVA curentă în România?',
      answer: 'As of August 2025, the standard VAT rate is 21% (increased from 19% per Legea 141/2025). The reduced rate is 11%.',
      answerRo: 'Începând cu august 2025, cota standard TVA este 21% (crescută de la 19% conform Legea 141/2025). Cota redusă este 11%.',
      category: 'vat-taxes',
      order: 1,
    },
    {
      id: 'faq-002',
      question: 'When is SAF-T D406 submission required?',
      questionRo: 'Când este necesară depunerea SAF-T D406?',
      answer: 'SAF-T D406 must be submitted monthly by the 25th of the following month. The pilot period runs from September 2025 to August 2026 with a 6-month grace period.',
      answerRo: 'SAF-T D406 trebuie depus lunar până pe 25 a lunii următoare. Perioada pilot este din septembrie 2025 până în august 2026 cu o perioadă de grație de 6 luni.',
      category: 'saft-d406',
      order: 2,
    },
    {
      id: 'faq-003',
      question: 'Is e-Factura mandatory for all businesses?',
      questionRo: 'Este e-Factura obligatorie pentru toate afacerile?',
      answer: 'E-Factura becomes mandatory for all B2B transactions starting mid-2026. Currently it is voluntary but recommended.',
      answerRo: 'E-Factura devine obligatorie pentru toate tranzacțiile B2B începând cu mijlocul lui 2026. În prezent este voluntară dar recomandată.',
      category: 'invoicing',
      order: 3,
    },
    {
      id: 'faq-004',
      question: 'How do I connect to ANAF SPV?',
      questionRo: 'Cum mă conectez la ANAF SPV?',
      answer: 'Go to Settings > ANAF Integration > Enable SPV OAuth. You will be redirected to ANAF to authenticate with your credentials.',
      answerRo: 'Mergi la Setări > Integrare ANAF > Activează SPV OAuth. Vei fi redirecționat către ANAF pentru autentificare cu credențialele tale.',
      category: 'account-settings',
      order: 4,
    },
    {
      id: 'faq-005',
      question: 'What is the OCR accuracy rate?',
      questionRo: 'Care este rata de precizie OCR?',
      answer: 'Our OCR achieves 99%+ accuracy on Romanian invoices and standard document formats. AI-powered extraction continuously improves with usage.',
      answerRo: 'OCR-ul nostru atinge 99%+ precizie pe facturi românești și formate standard de documente. Extracția AI se îmbunătățește continuu cu utilizarea.',
      category: 'ocr-ai',
      order: 5,
    },
    {
      id: 'faq-006',
      question: 'What subscription plans are available?',
      questionRo: 'Ce planuri de abonament sunt disponibile?',
      answer: 'We offer: Gratuit (free basic features), Pro (49 RON/month with full features), and Business (149 RON/month with custom API access and SAGA integration).',
      answerRo: 'Oferim: Gratuit (funcții de bază), Pro (49 RON/lună cu funcții complete), și Business (149 RON/lună cu acces API custom și integrare SAGA).',
      category: 'account-settings',
      order: 6,
    },
    {
      id: 'faq-007',
      question: 'How do I generate payroll reports?',
      questionRo: 'Cum generez rapoarte de salarizare?',
      answer: 'Navigate to HR > Payroll > Reports. Select the period and click Generate. Reports include SAF-T payroll section, REVISAL declarations, and summary PDFs.',
      answerRo: 'Navighează la HR > Salarizare > Rapoarte. Selectează perioada și click Generează. Rapoartele includ secțiunea SAF-T salarizare, declarații REVISAL și PDF-uri sumare.',
      category: 'hr-payroll',
      order: 7,
    },
    {
      id: 'faq-008',
      question: 'Can I use DocumentIulia on mobile?',
      questionRo: 'Pot folosi DocumentIulia pe mobil?',
      answer: 'Yes! Our mobile app is available for iOS and Android. Features include dashboard, invoice scanner with OCR, push notifications for deadlines, and full document access.',
      answerRo: 'Da! Aplicația noastră mobilă este disponibilă pentru iOS și Android. Include dashboard, scanner facturi cu OCR, notificări push pentru termene și acces complet la documente.',
      category: 'getting-started',
      order: 8,
    },
  ];

  private readonly tutorials: Tutorial[] = [
    {
      id: 'tut-001',
      title: 'Getting Started with DocumentIulia',
      titleRo: 'Primii Pași cu DocumentIulia',
      description: 'Learn how to set up your account and navigate the platform',
      descriptionRo: 'Învață cum să-ți configurezi contul și să navighezi platforma',
      estimatedMinutes: 10,
      difficulty: 'beginner',
      module: 'getting-started',
      steps: [
        {
          order: 1,
          title: 'Create Your Account',
          titleRo: 'Creează-ți Contul',
          content: 'Sign up at documentiulia.ro with your email. Verify your email address to activate your account.',
          contentRo: 'Înregistrează-te la documentiulia.ro cu email-ul tău. Verifică adresa de email pentru a activa contul.',
        },
        {
          order: 2,
          title: 'Complete Your Profile',
          titleRo: 'Completează-ți Profilul',
          content: 'Enter your company details including CUI/CIF, address, and legal representative information.',
          contentRo: 'Introdu detaliile companiei inclusiv CUI/CIF, adresa și informații despre reprezentantul legal.',
        },
        {
          order: 3,
          title: 'Connect to ANAF',
          titleRo: 'Conectează-te la ANAF',
          content: 'Link your ANAF SPV account for e-Factura and SAF-T submissions. This enables automatic validation.',
          contentRo: 'Leagă contul tău ANAF SPV pentru e-Factura și depuneri SAF-T. Aceasta activează validarea automată.',
        },
        {
          order: 4,
          title: 'Explore the Dashboard',
          titleRo: 'Explorează Dashboard-ul',
          content: 'Your dashboard shows key metrics: revenue, expenses, VAT summary, and upcoming deadlines.',
          contentRo: 'Dashboard-ul arată metrici cheie: venituri, cheltuieli, rezumat TVA și termene viitoare.',
        },
      ],
    },
    {
      id: 'tut-002',
      title: 'Submitting Your First SAF-T D406',
      titleRo: 'Depunerea Primului Tău SAF-T D406',
      description: 'Step-by-step guide to generate and submit SAF-T declaration',
      descriptionRo: 'Ghid pas cu pas pentru generarea și depunerea declarației SAF-T',
      estimatedMinutes: 15,
      difficulty: 'intermediate',
      module: 'saft-d406',
      steps: [
        {
          order: 1,
          title: 'Verify Your Data',
          titleRo: 'Verifică-ți Datele',
          content: 'Ensure all invoices, payments, and journal entries for the period are complete and accurate.',
          contentRo: 'Asigură-te că toate facturile, plățile și notele contabile pentru perioadă sunt complete și exacte.',
        },
        {
          order: 2,
          title: 'Navigate to SAF-T Section',
          titleRo: 'Navighează la Secțiunea SAF-T',
          content: 'Go to ANAF > SAF-T D406 from the main menu.',
          contentRo: 'Mergi la ANAF > SAF-T D406 din meniul principal.',
        },
        {
          order: 3,
          title: 'Select Period and Generate',
          titleRo: 'Selectează Perioada și Generează',
          content: 'Choose the reporting month and click "Generate D406". The system validates automatically.',
          contentRo: 'Alege luna de raportare și click "Generează D406". Sistemul validează automat.',
        },
        {
          order: 4,
          title: 'Review Validation Results',
          titleRo: 'Revizuiește Rezultatele Validării',
          content: 'Check the validation report. Fix any errors highlighted before proceeding.',
          contentRo: 'Verifică raportul de validare. Corectează orice erori evidențiate înainte de a continua.',
        },
        {
          order: 5,
          title: 'Submit via SPV',
          titleRo: 'Trimite prin SPV',
          content: 'Click "Submit to ANAF" to send directly, or download XML to submit manually via SPV portal.',
          contentRo: 'Click "Trimite la ANAF" pentru trimitere directă, sau descarcă XML pentru depunere manuală prin portalul SPV.',
        },
      ],
    },
  ];

  private readonly glossary: Glossary[] = [
    {
      term: 'CUI',
      termRo: 'CUI',
      definition: 'Cod Unic de Identificare - Unique Identification Code for Romanian companies, used for tax purposes.',
      definitionRo: 'Cod Unic de Identificare - cod unic pentru companiile românești, folosit în scopuri fiscale.',
      category: 'general',
      relatedTerms: ['CIF', 'NIF'],
    },
    {
      term: 'SPV',
      termRo: 'SPV',
      definition: 'Spațiul Privat Virtual - ANAF\'s secure online portal for tax declarations and e-Factura submissions.',
      definitionRo: 'Spațiul Privat Virtual - portalul online securizat al ANAF pentru declarații fiscale și depuneri e-Factura.',
      category: 'anaf',
      relatedTerms: ['ANAF', 'e-Factura'],
    },
    {
      term: 'SAF-T',
      termRo: 'SAF-T',
      definition: 'Standard Audit File for Tax - international XML format for exchanging accounting data with tax authorities.',
      definitionRo: 'Standard Audit File for Tax - format XML internațional pentru schimbul de date contabile cu autoritățile fiscale.',
      category: 'compliance',
      relatedTerms: ['D406', 'XML', 'ANAF'],
    },
    {
      term: 'e-Factura',
      termRo: 'e-Factura',
      definition: 'Electronic invoicing system in Romania for B2B transactions, using UBL 2.1 XML format.',
      definitionRo: 'Sistem de facturare electronică în România pentru tranzacții B2B, folosind formatul XML UBL 2.1.',
      category: 'invoicing',
      relatedTerms: ['UBL', 'SPV', 'B2B'],
    },
    {
      term: 'REVISAL',
      termRo: 'REVISAL',
      definition: 'National register of employee records, mandatory for all Romanian employers to report employment changes.',
      definitionRo: 'Registrul național al evidenței angajaților, obligatoriu pentru toți angajatorii români pentru raportarea modificărilor de personal.',
      category: 'hr',
      relatedTerms: ['HR', 'D112', 'ITM'],
    },
  ];

  private supportTickets: SupportTicket[] = [];
  private ticketCounter = 0;

  getAllCategories(): HelpCategory[] {
    return this.categories.sort((a, b) => a.order - b.order);
  }

  getCategoryById(id: string): HelpCategory | undefined {
    return this.categories.find(c => c.id === id);
  }

  getArticlesByCategory(categoryId: string): HelpArticle[] {
    return this.articles.filter(a => a.category.id === categoryId);
  }

  getArticleBySlug(slug: string): HelpArticle | undefined {
    return this.articles.find(a => a.slug === slug);
  }

  getArticleById(id: string): HelpArticle | undefined {
    return this.articles.find(a => a.id === id);
  }

  searchArticles(query: string, locale: string = 'en'): HelpArticle[] {
    const lowerQuery = query.toLowerCase();
    return this.articles.filter(article => {
      const title = locale === 'ro' ? article.titleRo : article.title;
      const content = locale === 'ro' ? article.contentRo : article.content;
      return (
        title.toLowerCase().includes(lowerQuery) ||
        content.toLowerCase().includes(lowerQuery) ||
        article.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    });
  }

  getPopularArticles(limit: number = 5): HelpArticle[] {
    return [...this.articles]
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  }

  recordArticleView(articleId: string): void {
    const article = this.articles.find(a => a.id === articleId);
    if (article) {
      article.views++;
    }
  }

  submitArticleFeedback(articleId: string, helpful: boolean): { helpful: number; notHelpful: number } {
    const article = this.articles.find(a => a.id === articleId);
    if (article) {
      if (helpful) {
        article.helpful++;
      } else {
        article.notHelpful++;
      }
      return { helpful: article.helpful, notHelpful: article.notHelpful };
    }
    return { helpful: 0, notHelpful: 0 };
  }

  getAllFaqs(): FAQ[] {
    return this.faqs.sort((a, b) => a.order - b.order);
  }

  getFaqsByCategory(categoryId: string): FAQ[] {
    return this.faqs.filter(f => f.category === categoryId);
  }

  getAllTutorials(): Tutorial[] {
    return this.tutorials;
  }

  getTutorialById(id: string): Tutorial | undefined {
    return this.tutorials.find(t => t.id === id);
  }

  getTutorialsByModule(module: string): Tutorial[] {
    return this.tutorials.filter(t => t.module === module);
  }

  getTutorialsByDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced'): Tutorial[] {
    return this.tutorials.filter(t => t.difficulty === difficulty);
  }

  getAllGlossaryTerms(): Glossary[] {
    return this.glossary.sort((a, b) => a.term.localeCompare(b.term));
  }

  searchGlossary(query: string, locale: string = 'en'): Glossary[] {
    const lowerQuery = query.toLowerCase();
    return this.glossary.filter(g => {
      const term = locale === 'ro' ? g.termRo : g.term;
      const definition = locale === 'ro' ? g.definitionRo : g.definition;
      return (
        term.toLowerCase().includes(lowerQuery) ||
        definition.toLowerCase().includes(lowerQuery)
      );
    });
  }

  createSupportTicket(
    userId: string,
    subject: string,
    description: string,
    category: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
  ): SupportTicket {
    const ticket: SupportTicket = {
      id: `TICKET-${++this.ticketCounter}`.padStart(10, '0'),
      userId,
      subject,
      description,
      category,
      priority,
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responses: [],
    };
    this.supportTickets.push(ticket);
    return ticket;
  }

  getUserTickets(userId: string): SupportTicket[] {
    return this.supportTickets.filter(t => t.userId === userId);
  }

  getTicketById(ticketId: string): SupportTicket | undefined {
    return this.supportTickets.find(t => t.id === ticketId);
  }

  addTicketResponse(
    ticketId: string,
    content: string,
    authorType: 'customer' | 'support' | 'ai',
    authorName: string,
  ): SupportTicket | undefined {
    const ticket = this.supportTickets.find(t => t.id === ticketId);
    if (ticket) {
      ticket.responses.push({
        id: `RESP-${Date.now()}`,
        content,
        authorType,
        authorName,
        createdAt: new Date().toISOString(),
      });
      ticket.updatedAt = new Date().toISOString();
      if (authorType === 'support') {
        ticket.status = 'waiting_customer';
      } else if (authorType === 'customer') {
        ticket.status = 'in_progress';
      }
    }
    return ticket;
  }

  updateTicketStatus(
    ticketId: string,
    status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed',
  ): SupportTicket | undefined {
    const ticket = this.supportTickets.find(t => t.id === ticketId);
    if (ticket) {
      ticket.status = status;
      ticket.updatedAt = new Date().toISOString();
    }
    return ticket;
  }

  getHelpCenterStats(): {
    totalArticles: number;
    totalCategories: number;
    totalFaqs: number;
    totalTutorials: number;
    totalGlossaryTerms: number;
    totalViews: number;
    totalHelpful: number;
    openTickets: number;
  } {
    return {
      totalArticles: this.articles.length,
      totalCategories: this.categories.length,
      totalFaqs: this.faqs.length,
      totalTutorials: this.tutorials.length,
      totalGlossaryTerms: this.glossary.length,
      totalViews: this.articles.reduce((sum, a) => sum + a.views, 0),
      totalHelpful: this.articles.reduce((sum, a) => sum + a.helpful, 0),
      openTickets: this.supportTickets.filter(t => t.status !== 'closed' && t.status !== 'resolved').length,
    };
  }
}
