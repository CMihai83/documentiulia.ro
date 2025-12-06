'use client';

/**
 * Forum Topic Detail Page - Thread Enchantment
 *
 * Features:
 * - Full thread with seeded replies
 * - Reply form with validation
 * - User badges and reputation
 * - Quote and react functionality
 * - Rich text formatting
 */

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AppLayout, MobileNav } from '@/components/layout';
import {
  ArrowLeft,
  MessageSquare,
  Clock,
  Users,
  ThumbsUp,
  Quote,
  Share2,
  Flag,
  Award,
  Shield,
  Sparkles,
  Send,
  ChevronUp,
  ChevronDown,
  Bookmark,
  MoreHorizontal,
} from 'lucide-react';

interface Reply {
  id: string;
  author: string;
  authorBadge?: 'expert' | 'moderator' | 'ai' | 'verified';
  content: string;
  createdAt: string;
  likes: number;
  isLiked?: boolean;
  quotedReply?: string;
}

interface TopicData {
  id: string;
  title: string;
  category: string;
  categoryId: string;
  author: string;
  authorBadge?: 'expert' | 'moderator' | 'ai' | 'verified';
  content: string;
  createdAt: string;
  viewsCount: number;
  repliesCount: number;
  likes: number;
  tags: string[];
  replies: Reply[];
}

// Seeded topic data with full replies - Enchanted Discussions
const topicsDatabase: Record<string, TopicData> = {
  '1': {
    id: '1',
    title: 'TVA 21% vs 11% - Când se aplică fiecare cotă (Legea 141)',
    category: 'Fiscalitate și TVA',
    categoryId: 'fiscalitate',
    author: 'Expert.Fiscal',
    authorBadge: 'expert',
    content: `Bună ziua tuturor,

Vreau să clarific aplicarea noilor cote TVA conform Legii 141/2025 care a intrat în vigoare din august 2025.

## TVA 21% (cota standard nouă)
Se aplică pentru majoritatea bunurilor și serviciilor care anterior aveau cota de 19%. Aceasta include:
- Produse alimentare standard
- Servicii profesionale
- Bunuri de larg consum
- Echipamente și utilaje

## TVA 11% (cota redusă nouă)
Se aplică pentru:
- Produse alimentare de bază (pâine, lapte, etc.)
- Cărți și manuale școlare
- Medicamente de uz uman
- Servicii hoteliere și cazare
- Transport de persoane

## Întrebări frecvente:

1. **Cum afectează contractele existente?**
   Pentru contractele semnate înainte de 1 august 2025, se aplică regulile tranzitorii. Facturile emise după 1 august trebuie să reflecte noile cote.

2. **Ce se întâmplă cu avansurile?**
   Avansurile încasate înainte de 1 august se regularizează la livrare conform noilor cote.

Aștept întrebările voastre!`,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    viewsCount: 2341,
    repliesCount: 45,
    likes: 127,
    tags: ['TVA', '21%', '11%', 'Legea 141'],
    replies: [
      {
        id: 'r1',
        author: 'Maria.Popescu',
        content: `Mulțumesc pentru clarificări! Am o întrebare specifică: pentru serviciile de consultanță IT prestate către firme din UE, se aplică tot 21%?

Am un client din Germania și nu sunt sigură dacă trebuie să facturez cu TVA românesc sau se aplică reverse charge.`,
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        likes: 34,
      },
      {
        id: 'r2',
        author: 'Expert.Fiscal',
        authorBadge: 'expert',
        content: `@Maria.Popescu Întrebare excelentă!

Pentru serviciile B2B prestate către persoane impozabile din UE (cum ar fi clientul tău din Germania), se aplică **reverse charge** conform art. 278 Cod Fiscal.

Asta înseamnă că:
- Facturezi **fără TVA**
- Menționezi pe factură "TVA neexigibilă - taxare inversă" sau "VAT reverse charge"
- Clientul german va declara și deduce TVA în Germania

**Important:** Asigură-te că ai codul de TVA valid al clientului verificat în VIES.`,
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
        likes: 56,
        quotedReply: 'pentru serviciile de consultanță IT prestate către firme din UE',
      },
      {
        id: 'r3',
        author: 'Contabil.Pro',
        authorBadge: 'verified',
        content: `Adaug o precizare importantă pentru cazul facturilor mixte:

Dacă o factură conține atât produse/servicii cu TVA 21% cât și cu TVA 11%, trebuie să le separați pe linii distincte cu cotele corespunzătoare.

De exemplu, pentru un restaurant:
- Mâncare la pachet: TVA 11%
- Băuturi alcoolice: TVA 21%
- Serviciu la masă: TVA 21%

Softurile de facturare actualizate ar trebui să gestioneze automat aceste situații.`,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        likes: 42,
      },
      {
        id: 'r4',
        author: 'Andrei.Ionescu',
        content: `Am o situație mai complicată: suntem o firmă de construcții și avem lucrări începute în iulie 2025, dar care se vor finaliza în 2026.

Cum procedăm cu:
1. Situațiile de lucrări parțiale?
2. Factura finală?
3. Garanțiile de bună execuție?`,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        likes: 28,
      },
      {
        id: 'r5',
        author: 'Expert.Fiscal',
        authorBadge: 'expert',
        content: `@Andrei.Ionescu Pentru construcții este într-adevăr mai complex:

**1. Situații de lucrări parțiale:**
Se aplică cota în vigoare la data exigibilității (acceptarea situației). Deci:
- Situații acceptate înainte de 1 aug 2025 → TVA 19%
- Situații acceptate după 1 aug 2025 → TVA 21%

**2. Factura finală:**
Se aplică cota în vigoare la finalizare (21%)

**3. Garanții:**
Garanțiile reprezintă o reținere din preț, nu o prestare separată. Se facturează la eliberare cu cota în vigoare la acel moment.

Recomand să consultați și OPANAF 3725/2025 pentru detalii suplimentare.`,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 7200000).toISOString(),
        likes: 67,
        quotedReply: 'suntem o firmă de construcții și avem lucrări începute în iulie 2025',
      },
      {
        id: 'r6',
        author: 'Fiscal.Expert',
        authorBadge: 'expert',
        content: `Vreau să subliniez și aspectul **e-Factura**:

ANAF a actualizat schema XSD pentru a include noile cote TVA. Dacă folosiți integrare directă cu SPV, asigurați-vă că ați actualizat:

\`\`\`xml
<cac:TaxCategory>
  <cbc:ID>S</cbc:ID>
  <cbc:Percent>21.00</cbc:Percent>
  <cac:TaxScheme>
    <cbc:ID>VAT</cbc:ID>
  </cac:TaxScheme>
</cac:TaxCategory>
\`\`\`

Veți primi eroare de validare dacă trimiteți cota veche de 19% pentru facturi emise după 1 august.`,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        likes: 45,
      },
      {
        id: 'r7',
        author: 'Student.Contabil',
        content: `Mulțumesc pentru toate explicațiile! Tocmai studiez pentru examenul CECCAR și acest thread este extrem de util.

O întrebare pentru clarificare: pentru operațiunile scutite de TVA (ex: servicii medicale, educație), situația rămâne neschimbată, corect?`,
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        likes: 12,
      },
      {
        id: 'r8',
        author: 'Expert.Fiscal',
        authorBadge: 'expert',
        content: `@Student.Contabil Corect! Scutirile de TVA rămân neschimbate.

Art. 292 din Codul Fiscal (operațiuni scutite fără drept de deducere) continuă să se aplice pentru:
- Servicii medicale și de sănătate
- Servicii educaționale
- Servicii financiar-bancare
- Asigurări
- Etc.

Succes la examen! 📚`,
        createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
        likes: 23,
        quotedReply: 'pentru operațiunile scutite de TVA',
      },
    ],
  },
  '9': {
    id: '9',
    title: 'Impozit dividende 16% - strategie optimă 2026',
    category: 'Fiscalitate și TVA',
    categoryId: 'fiscalitate',
    author: 'Tax.Advisor',
    authorBadge: 'expert',
    content: `# Pregătire pentru impozitul pe dividende de 16% din 2026

Din ianuarie 2026, impozitul pe dividende crește de la 8% la **16%**. Aceasta este o schimbare majoră care necesită planificare în avans.

## Ce se schimbă?

| Aspect | 2025 | 2026 |
|--------|------|------|
| Impozit dividende | 8% | 16% |
| CASS | 10% (peste plafon) | 10% (peste plafon) |
| Total maxim | 18% | 26% |

## Strategii de optimizare legale

### 1. Distribuirea anticipată (până în 31.12.2025)
Dacă aveți profituri nedistribuite sau profit estimat pentru 2025, puteți lua în considerare distribuirea înainte de 1 ianuarie 2026.

### 2. Optimizarea structurii de remunerare
Pentru managerii asociați, analizați balanța optimă între:
- Salariu (impozit 10% + CAS + CASS)
- Dividende (16% + eventual CASS)

### 3. Reinvestirea profitului
Profitul reinvestit în active productive nu este supus impozitului pe dividende.

### 4. Structuri holding (pentru cazuri complexe)
Pentru grupuri de companii, pot exista optimizări prin structuri holding, cu respectarea normelor anti-evaziune.

## Important!
Orice strategie trebuie analizată în context specific. Consultați un expert fiscal înainte de a lua decizii.

Aștept discuții și întrebări!`,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    viewsCount: 3421,
    repliesCount: 56,
    likes: 189,
    tags: ['dividende', '16%', '2026', 'optimizare'],
    replies: [
      {
        id: 'r1',
        author: 'Entrepreneur.RO',
        content: `Mulțumesc pentru ghid! Am SRL cu un singur asociat și sunt și administrator.

Care ar fi mix-ul optim salariu/dividende pentru un profit anual de ~100.000 RON?

Am auzit că există un prag de la care salariul devine mai avantajos decât dividendele.`,
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        likes: 45,
      },
      {
        id: 'r2',
        author: 'Tax.Advisor',
        authorBadge: 'expert',
        content: `@Entrepreneur.RO Excelentă întrebare! Hai să calculăm:

**Scenariul Dividende 100%:**
- Profit net: 100.000 RON
- Impozit profit (micro 1%): 1.000 RON
- Impozit dividende (16%): 15.840 RON
- CASS (10%, dacă depășești plafonul): ~9.900 RON
- **Total taxe: ~26.740 RON**
- **Net: ~73.260 RON**

**Scenariul Mixt (salariu minim + dividende):**
- Salariu brut anual: 42.000 RON (3.500/lună)
- Impozit salariu + contribuții angajat: ~18.000 RON
- Profit rămas pentru dividende: ~58.000 RON
- Impozit dividende: ~9.280 RON
- **Total taxe: ~27.280 RON**
- **Net: ~72.720 RON**

Concluzie: Pentru acest nivel de venit, diferența nu este semnificativă. Însă salariul aduce beneficii suplimentare (pensie, asigurări).`,
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
        likes: 89,
      },
      {
        id: 'r3',
        author: 'Contabil.Senior',
        authorBadge: 'verified',
        content: `Adaug o observație importantă: pentru microîntreprinderile cu cifra de afaceri peste 500.000 EUR, situația se schimbă în 2026.

Aceste companii vor trece obligatoriu la impozit pe profit (16%), ceea ce modifică calculele semnificativ.

Recomand să analizați și acest aspect în planificare.`,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        likes: 67,
      },
    ],
  },
  '21': {
    id: '21',
    title: 'PNRR 2026 - Ghid complet eligibilitate IMM-uri',
    category: 'Fonduri EU',
    categoryId: 'fonduri',
    author: 'EU.Funds.Expert',
    authorBadge: 'expert',
    content: `# Ghid Complet PNRR pentru IMM-uri - 2026

Planul Național de Redresare și Reziliență (PNRR) oferă **€21.6 miliarde** pentru România, din care o parte semnificativă este destinată IMM-urilor.

## Componente principale pentru IMM-uri

### C3 - Managementul deșeurilor
- Granturi pentru economia circulară
- Investiții în reciclare și reutilizare

### C7 - Digitalizare
- **Subvenții până la 100.000 EUR** pentru digitalizare
- Eligibile: soluții ERP, CRM, e-commerce, automatizare

### C9 - Suport pentru sectorul privat
- Scheme de ajutor de stat pentru IMM-uri
- Capital de lucru și investiții productive

## Criterii de eligibilitate generale

1. **Forma juridică:** SRL, SA, SNC, SCS, PFA, II
2. **Categoria:** Microîntreprindere, întreprindere mică sau mijlocie
3. **Vechime:** Minimum 1-2 ani (variază pe componentă)
4. **Sediu:** În România
5. **Fără datorii:** La stat și bugetele locale
6. **Nu în dificultate:** Conform definiției UE

## Documente necesare

- Certificat constatator ONRC (max 30 zile)
- Situații financiare ultimii 2-3 ani
- Certificat fiscal ANAF
- Plan de afaceri / investiții
- Oferte de la furnizori
- Declarații pe proprie răspundere

## Calendarul 2026

| Lună | Acțiune |
|------|---------|
| Ian-Feb | Pregătire documentație |
| Mar-Apr | Sesiuni de depunere C7 |
| Mai-Iun | Evaluare și contractare |
| Iul+ | Implementare și raportare |

Întrebări? Răspund cu plăcere!`,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    viewsCount: 4521,
    repliesCount: 67,
    likes: 234,
    tags: ['PNRR', 'eligibilitate', 'IMM', 'fonduri'],
    replies: [
      {
        id: 'r1',
        author: 'Startup.Founder',
        content: `Mulțumesc pentru ghid! Am un startup de 8 luni, suntem SRL.

Pentru componenta C7 (digitalizare), am văzut că unele scheme cer minimum 2 ani vechime. Există alternative pentru startup-uri mai noi?`,
        createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
        likes: 34,
      },
      {
        id: 'r2',
        author: 'EU.Funds.Expert',
        authorBadge: 'expert',
        content: `@Startup.Founder Pentru startup-uri mai noi există alternative:

1. **DIH4Society** - vouchere de până la €50.000, fără cerință de vechime minimă strictă
2. **Start-Up Nation** (când va fi relansat)
3. **Măsura 4.1.1 POAT** - pentru firme nou-înființate

Pentru PNRR C7, cerința de vechime este de obicei 1 an, deci în 4 luni deveniți eligibili.

Sfat: Folosiți perioada de așteptare pentru a pregăti documentația!`,
        createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000 + 7200000).toISOString(),
        likes: 56,
        quotedReply: 'startup de 8 luni',
      },
      {
        id: 'r3',
        author: 'Grant.Writer',
        authorBadge: 'verified',
        content: `Câteva tips din experiența mea de scriere proiecte PNRR:

**1. Planul de afaceri** - fiți specifici cu obiectivele SMART. Evitați generalități.

**2. Bugetul** - includeți minim 3 oferte pentru fiecare categorie de cheltuieli peste 15.000 EUR.

**3. Indicatorii** - asigurați-vă că puteți demonstra și măsura rezultatele promise.

**4. Sustenabilitatea** - explicați cum veți menține investiția după finalizarea proiectului.

Rata de respingere este mare (40-50%), dar cu pregătire atentă șansele cresc semnificativ!`,
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        likes: 78,
      },
    ],
  },
  '31': {
    id: '31',
    title: 'RO AI Factory - ghid acces HPC și costuri',
    category: 'GenAI & Tehnologie',
    categoryId: 'genai',
    author: 'AI.Engineer',
    authorBadge: 'expert',
    content: `# RO AI Factory - Ghid Complet pentru Acces și Utilizare

RO AI Factory este infrastructura națională de calcul de înaltă performanță (HPC) pentru inteligența artificială.

## Ce oferă RO AI Factory?

- **GPU clusters** pentru antrenare modele ML/DL
- **Acces la LLMs pre-antrenate** (Llama, Mistral, etc.)
- **Storage de mare capacitate** pentru datasets
- **Suport tehnic** și consultanță

## Cum obții acces?

### 1. Pentru cercetare academică
- Aplicație prin instituția de învățământ
- Acces gratuit în limita cotelor alocate
- Prioritate pentru proiecte finanțate EU

### 2. Pentru companii
- Aplicație prin portalul oficial
- Model pay-per-use sau subscripție
- Discount-uri pentru startup-uri și IMM-uri

## Costuri orientative (2025)

| Resursă | Cost/oră |
|---------|----------|
| GPU A100 (40GB) | ~2.5 EUR |
| GPU A100 (80GB) | ~3.5 EUR |
| CPU standard | ~0.05 EUR/core |
| Storage | ~0.02 EUR/GB/lună |

## Use cases pentru business

1. **Fine-tuning LLMs** pentru domeniu specific (medical, legal, contabilitate)
2. **OCR avansat** cu LayoutLMv3 pentru documente românești
3. **Analiză predictivă** pentru cash-flow și vânzări
4. **NLP pentru limba română** - sentiment analysis, clasificare

## Exemplu: Antrenare model pentru OCR documente românești

\`\`\`python
# Conectare la RO AI Factory
from roai_factory import Cluster

cluster = Cluster(api_key="your_key")
job = cluster.submit_job(
    script="train_layoutlm.py",
    gpu_type="A100_80GB",
    gpu_count=4,
    max_hours=24
)
\`\`\`

Întrebări despre RO AI Factory? Răspund!`,
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    viewsCount: 2156,
    repliesCount: 38,
    likes: 145,
    tags: ['RO AI Factory', 'HPC', 'LLM', 'GPU'],
    replies: [
      {
        id: 'r1',
        author: 'ML.Developer',
        authorBadge: 'verified',
        content: `Super util ghidul! Am aplicat luna trecută și am primit acces în ~2 săptămâni.

Pro tip: dacă aveți proiect de cercetare sau grant EU, menționați-l în aplicație - prioritizează accesul.

Performanța este impresionantă - am redus timpul de fine-tuning pentru un model de clasificare de la 3 zile (local) la 4 ore pe cluster.`,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        likes: 45,
      },
      {
        id: 'r2',
        author: 'Data.Scientist',
        content: `Am o întrebare despre integrarea cu MLflow pentru experiment tracking.

Clusterul suportă salvarea artefactelor și metricilor direct în MLflow, sau trebuie să gestionăm asta separat?`,
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        likes: 23,
      },
      {
        id: 'r3',
        author: 'AI.Engineer',
        authorBadge: 'expert',
        content: `@Data.Scientist Da, există suport pentru MLflow!

Ei oferă un server MLflow partajat sau poți configura unul propriu. Comanda:

\`\`\`bash
export MLFLOW_TRACKING_URI=https://mlflow.roaifactory.ro
mlflow run your_project
\`\`\`

Artefactele se salvează în S3-compatible storage inclus în cotă.`,
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
        likes: 34,
        quotedReply: 'integrarea cu MLflow',
      },
    ],
  },
  '41': {
    id: '41',
    title: 'e-Transport €10k - ghid conformitate obligatorie',
    category: 'e-Transport & Tahograf',
    categoryId: 'etransport',
    author: 'Transport.Expert',
    authorBadge: 'expert',
    content: `# e-Transport Obligatoriu pentru Transporturi peste €10.000

Din 2025, declararea e-Transport devine obligatorie pentru toate transporturile de bunuri cu valoare peste **€10.000** pe teritoriul României.

## Ce este e-Transport?

Sistemul RO e-Transport monitorizează mișcarea bunurilor cu risc fiscal ridicat. Scopul este combaterea evaziunii fiscale în transportul de mărfuri.

## Cine trebuie să declare?

- **Expeditorul** sau **destinatarul** mărfurilor
- **Transportatorul** (în anumite cazuri)
- Obligatoriu pentru bunuri >= €10.000 sau conform listei ANAF

## Bunuri cu risc fiscal ridicat (obligatorii indiferent de valoare)

1. Legume, fructe, carne
2. Băuturi alcoolice
3. Tutun și produse din tutun
4. Îmbrăcăminte și încălțăminte
5. Produse electronice
6. Materiale de construcții

## Procedura de declarare

### 1. Generare UIT (Unique Identification Tag)
- Se face prin SPV înainte de începerea transportului
- UIT valid 5 zile pentru transport național

### 2. Informații necesare
- Expeditor și destinatar (CUI, adrese)
- Descriere mărfuri și valoare
- Date transport (vehicul, traseu)
- CMR sau alte documente transport

### 3. Finalizare transport
- Confirmare primire în sistem
- Termen: 5 zile de la data livrării

## Penalități pentru neconformitate

| Încălcare | Amendă |
|-----------|--------|
| Nedeclarare | 10.000 - 50.000 RON |
| Declarare incorectă | 5.000 - 30.000 RON |
| Neconfirmare recepție | 2.500 - 10.000 RON |

## Integrare cu sistemele existente

API REST disponibil pentru integrare ERP:
- Generare automată UIT la emitere factură
- Sincronizare cu tahograf digital
- Raportare automată

Întrebări specifice? Lăsați un mesaj!`,
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    viewsCount: 3456,
    repliesCount: 52,
    likes: 167,
    tags: ['e-Transport', '€10k', 'obligatoriu', 'ANAF'],
    replies: [
      {
        id: 'r1',
        author: 'Fleet.Manager',
        authorBadge: 'verified',
        content: `Mulțumesc pentru ghid! Avem flotă de 15 camioane și facem transport internațional.

Întrebare: pentru transporturile care tranzitează România (Germania → Bulgaria de ex.), trebuie să declarăm e-Transport?`,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        likes: 34,
      },
      {
        id: 'r2',
        author: 'Transport.Expert',
        authorBadge: 'expert',
        content: `@Fleet.Manager Întrebare importantă!

Pentru **tranzit** (mărfuri care nu au origine sau destinație în RO):
- Dacă bunurile sunt sub procedură vamală T1/T2 → NU trebuie e-Transport
- Dacă bunurile sunt în liberă circulație și doar tranzitează → consultați art. 12 din OUG

În practică, majoritatea tranziturilor sunt acoperite de documente vamale și nu necesită e-Transport.

Dar atenție: dacă există oprire pentru descărcare parțială în RO, situația se schimbă!`,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
        likes: 56,
        quotedReply: 'transporturile care tranzitează România',
      },
      {
        id: 'r3',
        author: 'Tech.Fleet',
        content: `Am integrat e-Transport cu ERP-ul nostru (SAP) folosind API-ul ANAF.

Durată implementare: ~3 săptămâni cu developer dedicat.

Cel mai complicat a fost sincronizarea cu tahograful digital pentru a extrage automat datele despre traseu și opriri.

Recomand să începeți integrarea cât mai curând - ANAF-ul are downtime-uri frecvente și e bine să testați în avans.`,
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        likes: 45,
      },
    ],
  },
};

// Default topic for unknown IDs
const defaultTopic: TopicData = {
  id: '0',
  title: 'Subiect în discuție',
  category: 'General',
  categoryId: 'ajutor',
  author: 'Comunitate',
  content: 'Acest subiect este în curs de încărcare sau nu a fost găsit. Vă rugăm să reveniți la lista de discuții.',
  createdAt: new Date().toISOString(),
  viewsCount: 0,
  repliesCount: 0,
  likes: 0,
  tags: [],
  replies: [],
};

function getBadgeDisplay(badge?: string): { icon: React.ReactNode; label: string; color: string } | null {
  switch (badge) {
    case 'expert':
      return { icon: <Award className="w-3 h-3" />, label: 'Expert', color: 'bg-amber-100 text-amber-700' };
    case 'moderator':
      return { icon: <Shield className="w-3 h-3" />, label: 'Moderator', color: 'bg-blue-100 text-blue-700' };
    case 'ai':
      return { icon: <Sparkles className="w-3 h-3" />, label: 'AI', color: 'bg-purple-100 text-purple-700' };
    case 'verified':
      return { icon: <Shield className="w-3 h-3" />, label: 'Verificat', color: 'bg-green-100 text-green-700' };
    default:
      return null;
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ForumTopicPage() {
  const params = useParams();
  const topicId = params.id as string;

  const topic = topicsDatabase[topicId] || defaultTopic;
  const [replyContent, setReplyContent] = useState('');
  const [likedReplies, setLikedReplies] = useState<Set<string>>(new Set());

  const handleLikeReply = (replyId: string) => {
    setLikedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(replyId)) {
        next.delete(replyId);
      } else {
        next.add(replyId);
      }
      return next;
    });
  };

  const handleSubmitReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (replyContent.trim()) {
      // In production, this would send to API
      alert('Răspunsul a fost trimis! (Demo - în producție se salvează în baza de date)');
      setReplyContent('');
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        {/* Back Navigation */}
        <Link
          href="/forum"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-blue-600 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Înapoi la Forum
        </Link>

        {/* Topic Header */}
        <div className="bg-white rounded-xl border p-6 mb-6">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
            <Link href={`/forum?category=${topic.categoryId}`} className="hover:text-blue-600">
              {topic.category}
            </Link>
            <ChevronUp className="w-4 h-4 rotate-90" />
            <span>Topic #{topic.id}</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-4">{topic.title}</h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <span className="font-medium text-slate-900">{topic.author}</span>
              {topic.authorBadge && (() => {
                const badge = getBadgeDisplay(topic.authorBadge);
                return badge ? (
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs ${badge.color}`}>
                    {badge.icon}
                    {badge.label}
                  </span>
                ) : null;
              })()}
            </div>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatDate(topic.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {topic.viewsCount} vizualizări
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              {topic.repliesCount} răspunsuri
            </span>
          </div>

          <div className="flex gap-2 mb-6">
            {topic.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Topic Content */}
          <div className="prose prose-slate max-w-none">
            <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
              {topic.content}
            </div>
          </div>

          {/* Topic Actions */}
          <div className="flex items-center gap-4 mt-6 pt-4 border-t">
            <button className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition">
              <ThumbsUp className="w-5 h-5" />
              <span>{topic.likes}</span>
            </button>
            <button className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition">
              <Bookmark className="w-5 h-5" />
              <span>Salvează</span>
            </button>
            <button className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition">
              <Share2 className="w-5 h-5" />
              <span>Distribuie</span>
            </button>
            <button className="flex items-center gap-2 text-slate-500 hover:text-red-600 transition ml-auto">
              <Flag className="w-5 h-5" />
              <span>Raportează</span>
            </button>
          </div>
        </div>

        {/* Replies */}
        <div className="space-y-4 mb-6">
          <h2 className="text-lg font-semibold text-slate-900">
            {topic.replies.length} Răspunsuri
          </h2>

          {topic.replies.map((reply, index) => (
            <div
              key={reply.id}
              className="bg-white rounded-xl border p-5"
            >
              {/* Reply Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{reply.author}</span>
                      {reply.authorBadge && (() => {
                        const badge = getBadgeDisplay(reply.authorBadge);
                        return badge ? (
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs ${badge.color}`}>
                            {badge.icon}
                            {badge.label}
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <span className="text-xs text-slate-500">{formatDate(reply.createdAt)}</span>
                  </div>
                </div>
                <span className="text-sm text-slate-400">#{index + 1}</span>
              </div>

              {/* Quoted Reply */}
              {reply.quotedReply && (
                <div className="bg-slate-50 border-l-4 border-blue-300 pl-4 py-2 mb-4 text-sm text-slate-600 italic">
                  <Quote className="w-4 h-4 inline mr-2 text-slate-400" />
                  "{reply.quotedReply}"
                </div>
              )}

              {/* Reply Content */}
              <div className="text-slate-700 whitespace-pre-wrap leading-relaxed mb-4">
                {reply.content}
              </div>

              {/* Reply Actions */}
              <div className="flex items-center gap-4 text-sm">
                <button
                  onClick={() => handleLikeReply(reply.id)}
                  className={`flex items-center gap-1 transition ${
                    likedReplies.has(reply.id) ? 'text-blue-600' : 'text-slate-500 hover:text-blue-600'
                  }`}
                >
                  <ThumbsUp className={`w-4 h-4 ${likedReplies.has(reply.id) ? 'fill-blue-600' : ''}`} />
                  <span>{reply.likes + (likedReplies.has(reply.id) ? 1 : 0)}</span>
                </button>
                <button className="flex items-center gap-1 text-slate-500 hover:text-blue-600 transition">
                  <Quote className="w-4 h-4" />
                  <span>Citează</span>
                </button>
                <button className="flex items-center gap-1 text-slate-500 hover:text-red-600 transition ml-auto">
                  <Flag className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Reply Form */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Adaugă un răspuns</h3>
          <form onSubmit={handleSubmitReply}>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Scrie răspunsul tău aici..."
              rows={5}
              className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-4"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Poți folosi Markdown pentru formatare
              </p>
              <button
                type="submit"
                disabled={!replyContent.trim()}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Send className="w-4 h-4" />
                Trimite răspuns
              </button>
            </div>
          </form>
        </div>
      </div>
      <MobileNav />
    </AppLayout>
  );
}
