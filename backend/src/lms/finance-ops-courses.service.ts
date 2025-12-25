import { Injectable } from '@nestjs/common';
import { LMSService, Course, CourseCategory } from './lms.service';

// Finance for Operations & RO GAAP Courses Service
// Budgeting, cash flow forecasting, RO GAAP/IFRS compliance, cost accounting
// Practical exercises with platform integration

export interface FinanceCourseTemplate {
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  category: 'BUDGETING' | 'CASH_FLOW' | 'GAAP_COMPLIANCE' | 'IFRS' | 'COST_ACCOUNTING' | 'FINANCIAL_ANALYSIS';
  level: 'FOUNDATIONAL' | 'INTERMEDIATE' | 'ADVANCED' | 'PROFESSIONAL';
  targetAudience: string[];
  prerequisites: string[];
  learningOutcomes: string[];
  modules: FinanceModuleTemplate[];
  practicalExercises: PracticalExercise[];
  duration: {
    weeks: number;
    hoursPerWeek: number;
    totalHours: number;
  };
  pricing: {
    amount: number;
    currency: string;
    corporateDiscount: number;
  };
  certification: {
    credentialName: string;
    ceuCredits: number;
    cecpaCredits?: number; // CECCAR credits for Romanian accountants
    validityYears: number;
  };
  complianceFrameworks: string[];
  regulatoryUpdates: boolean;
  hrdaEligible: boolean;
}

export interface FinanceModuleTemplate {
  title: string;
  description: string;
  duration: number;
  lessons: FinanceLessonTemplate[];
  practicalExerciseIds: string[];
  keyRegulations?: string[];
  caseStudyType?: 'ROMANIAN_SME' | 'MULTINATIONAL' | 'STARTUP' | 'PUBLIC_SECTOR';
}

export interface FinanceLessonTemplate {
  title: string;
  type: 'VIDEO' | 'READING' | 'EXERCISE' | 'CASE_STUDY' | 'SIMULATION' | 'QUIZ' | 'LIVE_WORKSHOP';
  duration: number;
  description: string;
  keyTakeaways: string[];
  regulatoryReferences?: string[];
  excelTemplates?: string[];
}

export interface PracticalExercise {
  id: string;
  title: string;
  type: 'EXCEL_MODEL' | 'CASE_ANALYSIS' | 'SIMULATION' | 'PLATFORM_INTEGRATION' | 'COMPLIANCE_CHECK';
  description: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
  duration: number;
  tools: string[];
  deliverables: string[];
  rubric: { criterion: string; weight: number; description: string }[];
  sampleData?: {
    datasetName: string;
    description: string;
    downloadUrl: string;
  };
}

export interface RegulationReference {
  id: string;
  code: string;
  title: string;
  description: string;
  effectiveDate: Date;
  source: 'MF' | 'ANAF' | 'CECCAR' | 'EU' | 'IASB';
  url?: string;
  relevantCourses: string[];
}

export interface AccountingStandard {
  id: string;
  code: string;
  name: string;
  framework: 'RO_GAAP' | 'IFRS' | 'US_GAAP';
  category: string;
  summary: string;
  keyRequirements: string[];
  commonMistakes: string[];
  practicalTips: string[];
}

export interface FinanceCredential {
  id: string;
  name: string;
  description: string;
  category: string;
  requiredCourses: string[];
  optionalCourses: string[];
  minOptionalRequired: number;
  totalCredits: number;
  examRequired: boolean;
  examDetails?: {
    duration: number;
    passingScore: number;
    questionCount: number;
    topics: string[];
  };
  professionalRecognition: string[];
  digitalBadgeUrl: string;
  validityYears: number;
}

export interface UserFinanceProgress {
  id: string;
  userId: string;
  credentialId: string;
  completedCourses: string[];
  exercisesCompleted: string[];
  examStatus?: 'NOT_STARTED' | 'SCHEDULED' | 'PASSED' | 'FAILED';
  examScore?: number;
  earnedAt?: Date;
  certificateUrl?: string;
  verificationCode?: string;
}

@Injectable()
export class FinanceOpsCoursesService {
  private exercises = new Map<string, PracticalExercise>();
  private regulations = new Map<string, RegulationReference>();
  private standards = new Map<string, AccountingStandard>();
  private credentials = new Map<string, FinanceCredential>();
  private userProgress = new Map<string, UserFinanceProgress>();

  constructor(private readonly lmsService: LMSService) {
    this.initializeDefaultExercises();
    this.initializeDefaultRegulations();
    this.initializeDefaultStandards();
    this.initializeDefaultCredentials();
  }

  // ===== COURSE TEMPLATES =====

  getBudgetingFundamentalsTemplate(): FinanceCourseTemplate {
    return {
      title: 'Fundamentele Bugetării pentru Manageri Operaționali',
      slug: 'budgeting-fundamentals',
      description: `Curs practic de bugetare pentru manageri non-financiari. Acoperă
        procesul de bugetare de la zero, analiza varianțelor, și alinierea bugetului
        cu obiectivele strategice. Include exerciții în Excel și integrare cu
        modulul de finanțe al platformei.`,
      shortDescription: 'Învață să construiești și să gestionezi bugete departamentale eficient',
      category: 'BUDGETING',
      level: 'FOUNDATIONAL',
      targetAudience: [
        'Manageri de departament cu responsabilități bugetare',
        'Team leads care doresc să înțeleagă procesul de bugetare',
        'Antreprenori care își gestionează propriul buget',
        'Profesioniști care colaborează cu departamentul financiar',
      ],
      prerequisites: [
        'Cunoștințe de bază Excel (formule, tabele)',
        'Experiență minimă în management',
        'Acces la date financiare de bază ale companiei (recomandat)',
      ],
      learningOutcomes: [
        'Construiește un buget departamental complet în Excel',
        'Înțelege și aplică metodologia zero-based budgeting',
        'Efectuează analiza varianțelor și identifică cauzele',
        'Prezintă și argumentează cereri bugetare către management',
        'Aliniază bugetul cu obiectivele strategice ale organizației',
        'Utilizează rolling forecasts pentru planificare dinamică',
      ],
      modules: [
        {
          title: 'Modul 1: Introducere în Bugetare',
          description: 'Fundamentele procesului de bugetare organizațională',
          duration: 300,
          lessons: [
            {
              title: 'Ce Este un Buget și De Ce Contează',
              type: 'VIDEO',
              duration: 30,
              description: 'Rolul bugetului în managementul organizațional',
              keyTakeaways: [
                'Definiția și scopul bugetării',
                'Tipuri de bugete: operațional, capital, cash flow',
                'Bugetul ca instrument de control și planificare',
              ],
            },
            {
              title: 'Procesul de Bugetare în Organizații',
              type: 'VIDEO',
              duration: 45,
              description: 'Ciclul bugetar și stakeholderii implicați',
              keyTakeaways: [
                'Fazele procesului de bugetare',
                'Rolurile în procesul bugetar',
                'Timeline-ul tipic de bugetare',
              ],
            },
            {
              title: 'Top-Down vs Bottom-Up Budgeting',
              type: 'VIDEO',
              duration: 30,
              description: 'Abordări diferite în construirea bugetelor',
              keyTakeaways: [
                'Avantaje și dezavantaje ale fiecărei abordări',
                'Când să folosești fiecare metodă',
                'Abordarea hibridă în practică',
              ],
            },
            {
              title: 'Quiz: Concepte de Bugetare',
              type: 'QUIZ',
              duration: 15,
              description: 'Verifică înțelegerea conceptelor de bază',
              keyTakeaways: ['Consolidarea cunoștințelor'],
            },
          ],
          practicalExerciseIds: [],
        },
        {
          title: 'Modul 2: Construirea Bugetului Departamental',
          description: 'Pas cu pas: de la obiective la cifre',
          duration: 420,
          lessons: [
            {
              title: 'Identificarea Categoriilor de Costuri',
              type: 'VIDEO',
              duration: 45,
              description: 'Clasificarea cheltuielilor departamentale',
              keyTakeaways: [
                'Costuri fixe vs variabile',
                'Costuri directe vs indirecte',
                'Costuri controlabile vs necontrolabile',
              ],
              excelTemplates: ['cost-categories-template.xlsx'],
            },
            {
              title: 'Estimarea Costurilor cu Personal',
              type: 'VIDEO',
              duration: 60,
              description: 'Bugetarea resurselor umane',
              keyTakeaways: [
                'Salarii de bază și contribuții în România',
                'Beneficii și costuri adiacente',
                'Planificarea creșterilor salariale',
              ],
              regulatoryReferences: ['Codul Fiscal - contribuții sociale'],
              excelTemplates: ['hr-budget-template.xlsx'],
            },
            {
              title: 'Bugetarea Materialelor și Serviciilor',
              type: 'VIDEO',
              duration: 45,
              description: 'Estimarea costurilor operaționale',
              keyTakeaways: [
                'Analiza istoricului de consum',
                'Ajustări pentru inflație și tendințe',
                'Contracte și acorduri-cadru',
              ],
            },
            {
              title: 'Exercițiu Excel: Buget Departamental',
              type: 'EXERCISE',
              duration: 90,
              description: 'Construiește un buget complet în Excel',
              keyTakeaways: [
                'Aplicarea practică a conceptelor',
                'Utilizarea formulelor Excel',
                'Structurarea datelor pentru analiză',
              ],
              excelTemplates: ['departmental-budget-exercise.xlsx'],
            },
          ],
          practicalExerciseIds: ['ex-dept-budget'],
        },
        {
          title: 'Modul 3: Zero-Based Budgeting (ZBB)',
          description: 'Bugetarea de la zero - metodologie avansată',
          duration: 360,
          lessons: [
            {
              title: 'Ce Este Zero-Based Budgeting',
              type: 'VIDEO',
              duration: 30,
              description: 'Principiile și originile ZBB',
              keyTakeaways: [
                'Diferența față de bugetarea incrementală',
                'Când să aplici ZBB',
                'Beneficii și provocări',
              ],
            },
            {
              title: 'Decision Units și Decision Packages',
              type: 'VIDEO',
              duration: 45,
              description: 'Structurarea ZBB pentru aplicare practică',
              keyTakeaways: [
                'Definirea decision units',
                'Crearea decision packages',
                'Niveluri de prioritate',
              ],
            },
            {
              title: 'Implementarea ZBB - Studiu de Caz',
              type: 'CASE_STUDY',
              duration: 60,
              description: 'Exemplu real de implementare ZBB într-o companie românească',
              keyTakeaways: [
                'Lecții din implementare',
                'Rezultate obținute',
                'Adaptări pentru contexul local',
              ],
            },
            {
              title: 'Workshop: Aplică ZBB pe Departamentul Tău',
              type: 'LIVE_WORKSHOP',
              duration: 90,
              description: 'Sesiune practică ghidată de aplicare ZBB',
              keyTakeaways: [
                'Aplicarea ZBB pas cu pas',
                'Feedback de la instructor',
                'Plan de acțiune personalizat',
              ],
            },
          ],
          practicalExerciseIds: ['ex-zbb-implementation'],
        },
        {
          title: 'Modul 4: Analiza Varianțelor',
          description: 'Monitorizarea și explicarea abaterilor de la buget',
          duration: 360,
          lessons: [
            {
              title: 'Tipuri de Varianțe',
              type: 'VIDEO',
              duration: 45,
              description: 'Clasificarea și calculul varianțelor',
              keyTakeaways: [
                'Varianțe de preț vs volum vs mix',
                'Varianțe favorabile vs nefavorabile',
                'Materialitatea varianțelor',
              ],
            },
            {
              title: 'Root Cause Analysis pentru Varianțe',
              type: 'VIDEO',
              duration: 45,
              description: 'Identificarea cauzelor abaterilor',
              keyTakeaways: [
                'Tehnici de investigare',
                'Documentarea cauzelor',
                'Prevenirea recurenței',
              ],
            },
            {
              title: 'Raportarea Varianțelor către Management',
              type: 'VIDEO',
              duration: 30,
              description: 'Comunicarea eficientă a rezultatelor',
              keyTakeaways: [
                'Structura raportului de varianțe',
                'Vizualizarea datelor',
                'Recomandări de acțiune',
              ],
            },
            {
              title: 'Exercițiu: Analiza Varianțelor',
              type: 'EXERCISE',
              duration: 60,
              description: 'Analizează setul de date și identifică varianțele',
              keyTakeaways: [
                'Calculul varianțelor în Excel',
                'Interpretarea rezultatelor',
                'Redactarea raportului',
              ],
              excelTemplates: ['variance-analysis-exercise.xlsx'],
            },
          ],
          practicalExerciseIds: ['ex-variance-analysis'],
        },
        {
          title: 'Modul 5: Rolling Forecasts și Flexibilitate',
          description: 'Planificarea dinamică și adaptabilă',
          duration: 300,
          lessons: [
            {
              title: 'Limitările Bugetului Anual Static',
              type: 'VIDEO',
              duration: 30,
              description: 'De ce bugetul tradițional nu mai este suficient',
              keyTakeaways: [
                'Volatilitatea mediului de business',
                'Problema "gaming the budget"',
                'Nevoia de agilitate',
              ],
            },
            {
              title: 'Implementarea Rolling Forecasts',
              type: 'VIDEO',
              duration: 45,
              description: 'Prognoza continuă pe orizonturi mobile',
              keyTakeaways: [
                'Ce este rolling forecast',
                'Cadența de actualizare',
                'Integrarea cu bugetul anual',
              ],
            },
            {
              title: 'Scenario Planning',
              type: 'VIDEO',
              duration: 45,
              description: 'Planificarea pentru multiple scenarii',
              keyTakeaways: [
                'Scenarii: pesimist, bază, optimist',
                'Trigger points pentru acțiune',
                'Flexibilitatea în execuție',
              ],
            },
            {
              title: 'Exercițiu: Rolling Forecast Model',
              type: 'EXERCISE',
              duration: 60,
              description: 'Construiește un model de rolling forecast',
              keyTakeaways: [
                'Structura modelului în Excel',
                'Automatizarea actualizărilor',
                'Dashboard de monitorizare',
              ],
              excelTemplates: ['rolling-forecast-model.xlsx'],
            },
          ],
          practicalExerciseIds: ['ex-rolling-forecast'],
        },
        {
          title: 'Modul 6: Prezentarea și Apărarea Bugetului',
          description: 'Comunicarea eficientă cu stakeholderii',
          duration: 240,
          lessons: [
            {
              title: 'Pregătirea pentru Budget Review',
              type: 'VIDEO',
              duration: 30,
              description: 'Cum să te pregătești pentru prezentarea bugetului',
              keyTakeaways: [
                'Anticiparea întrebărilor',
                'Documentația de suport',
                'Flexibilitatea în negociere',
              ],
            },
            {
              title: 'Storytelling cu Numere',
              type: 'VIDEO',
              duration: 45,
              description: 'Prezentarea convingătoare a datelor financiare',
              keyTakeaways: [
                'Narațiunea bugetului',
                'Vizualizări eficiente',
                'Conectarea cu strategia',
              ],
            },
            {
              title: 'Proiect Final: Prezentare Buget',
              type: 'SIMULATION',
              duration: 90,
              description: 'Prezentarea bugetului în fața unui panel',
              keyTakeaways: [
                'Aplicarea tuturor conceptelor',
                'Feedback constructiv',
                'Plan de îmbunătățire',
              ],
            },
          ],
          practicalExerciseIds: [],
        },
      ],
      practicalExercises: [],
      duration: {
        weeks: 5,
        hoursPerWeek: 5,
        totalHours: 25,
      },
      pricing: {
        amount: 299,
        currency: 'RON',
        corporateDiscount: 25,
      },
      certification: {
        credentialName: 'Certificate in Operational Budgeting',
        ceuCredits: 3,
        validityYears: 3,
      },
      complianceFrameworks: [],
      regulatoryUpdates: false,
      hrdaEligible: true,
    };
  }

  getCashFlowForecastingTemplate(): FinanceCourseTemplate {
    return {
      title: 'Prognoza și Managementul Cash Flow-ului',
      slug: 'cash-flow-forecasting',
      description: `Curs avansat de management al cash flow-ului pentru profesioniști
        operaționali și financiari. Acoperă modelarea cash flow-ului, optimizarea
        working capital, și strategii de lichiditate. Include modele Excel profesionale.`,
      shortDescription: 'Stăpânește arta prognozei și optimizării cash flow-ului',
      category: 'CASH_FLOW',
      level: 'INTERMEDIATE',
      targetAudience: [
        'CFOs și controlleri financiari',
        'Manageri de trezorerie',
        'Directori operaționali cu responsabilități financiare',
        'Antreprenori care gestionează lichiditatea',
      ],
      prerequisites: [
        'Cunoștințe solide de contabilitate',
        'Experiență cu situații financiare',
        'Excel avansat (funcții financiare, pivot tables)',
      ],
      learningOutcomes: [
        'Construiește modele de prognoză cash flow pe termen scurt și lung',
        'Optimizează ciclul de conversie a numerarului',
        'Implementează strategii de working capital management',
        'Gestionează riscul de lichiditate',
        'Negociază linii de credit și facilități de finanțare',
        'Construiește dashboard-uri de monitorizare a cash-ului',
      ],
      modules: [
        {
          title: 'Modul 1: Fundamentele Cash Flow-ului',
          description: 'Înțelegerea fluxurilor de numerar',
          duration: 360,
          lessons: [
            {
              title: 'Cash Flow Statement - Recapitulare',
              type: 'VIDEO',
              duration: 45,
              description: 'Cele trei categorii de cash flow',
              keyTakeaways: [
                'Operating, Investing, Financing activities',
                'Metoda directă vs indirectă',
                'Reconcilierea cu profitul',
              ],
            },
            {
              title: 'De Ce Cash is King',
              type: 'VIDEO',
              duration: 30,
              description: 'Diferența dintre profit și cash',
              keyTakeaways: [
                'Companii profitabile care falimentează',
                'Importanța lichidității',
                'Cash vs accrual accounting',
              ],
            },
            {
              title: 'Ciclul de Conversie a Numerarului (CCC)',
              type: 'VIDEO',
              duration: 60,
              description: 'Timpul de la plată la încasare',
              keyTakeaways: [
                'Calculul CCC: DSO + DIO - DPO',
                'Benchmarking pe industrie',
                'Strategii de reducere a CCC',
              ],
            },
            {
              title: 'Exercițiu: Calculul CCC',
              type: 'EXERCISE',
              duration: 45,
              description: 'Calculează CCC pentru 3 companii',
              keyTakeaways: [
                'Aplicarea formulelor',
                'Interpretarea rezultatelor',
                'Recomandări de îmbunătățire',
              ],
              excelTemplates: ['ccc-calculation-exercise.xlsx'],
            },
          ],
          practicalExerciseIds: ['ex-ccc-analysis'],
        },
        {
          title: 'Modul 2: Modelarea Cash Flow-ului',
          description: 'Construirea modelelor de prognoză',
          duration: 480,
          lessons: [
            {
              title: 'Prognoza pe Termen Scurt (13 săptămâni)',
              type: 'VIDEO',
              duration: 60,
              description: 'Modelul rolling 13-week cash forecast',
              keyTakeaways: [
                'Structura modelului',
                'Inputuri și surse de date',
                'Actualizarea săptămânală',
              ],
              excelTemplates: ['13-week-cash-forecast.xlsx'],
            },
            {
              title: 'Prognoza pe Termen Mediu (12 luni)',
              type: 'VIDEO',
              duration: 60,
              description: 'Modelul anual de cash flow',
              keyTakeaways: [
                'Conectarea cu P&L și bilanț',
                'Sezonalitate și tendințe',
                'Integrarea cu bugetul',
              ],
              excelTemplates: ['annual-cash-forecast.xlsx'],
            },
            {
              title: 'Scenarii și Sensitivitate',
              type: 'VIDEO',
              duration: 45,
              description: 'Analiza what-if pentru cash flow',
              keyTakeaways: [
                'Scenarii de stress testing',
                'Variabile cheie de sensitivitate',
                'Monte Carlo simplificat',
              ],
            },
            {
              title: 'Workshop: Construiește Modelul Tău',
              type: 'LIVE_WORKSHOP',
              duration: 120,
              description: 'Sesiune practică de modelare',
              keyTakeaways: [
                'Aplicarea pe date reale',
                'Debugging și validare',
                'Best practices în modelare',
              ],
            },
          ],
          practicalExerciseIds: ['ex-cash-model'],
        },
        {
          title: 'Modul 3: Working Capital Management',
          description: 'Optimizarea capitalului de lucru',
          duration: 420,
          lessons: [
            {
              title: 'Managementul Creanțelor (AR)',
              type: 'VIDEO',
              duration: 60,
              description: 'Accelerarea încasărilor',
              keyTakeaways: [
                'Credit policy și termene',
                'Collections process',
                'DSO improvement strategies',
              ],
            },
            {
              title: 'Managementul Stocurilor (Inventory)',
              type: 'VIDEO',
              duration: 60,
              description: 'Optimizarea nivelurilor de stoc',
              keyTakeaways: [
                'EOQ și safety stock',
                'Just-in-time vs just-in-case',
                'DIO și turnover optimization',
              ],
            },
            {
              title: 'Managementul Datoriilor (AP)',
              type: 'VIDEO',
              duration: 45,
              description: 'Optimizarea plăților către furnizori',
              keyTakeaways: [
                'Terms negotiation',
                'Early payment discounts',
                'DPO extension strategies',
              ],
            },
            {
              title: 'Studiu de Caz: WC Transformation',
              type: 'CASE_STUDY',
              duration: 75,
              description: 'Transformarea working capital într-o companie românească',
              keyTakeaways: [
                'Diagnostic inițial',
                'Inițiative implementate',
                'Rezultate obținute',
              ],
            },
          ],
          practicalExerciseIds: ['ex-wc-optimization'],
          caseStudyType: 'ROMANIAN_SME',
        },
        {
          title: 'Modul 4: Strategii de Lichiditate',
          description: 'Asigurarea accesului la numerar',
          duration: 360,
          lessons: [
            {
              title: 'Linii de Credit și Facilități Bancare',
              type: 'VIDEO',
              duration: 60,
              description: 'Produse bancare pentru lichiditate',
              keyTakeaways: [
                'Overdraft vs revolving credit',
                'Factoring și scontare',
                'Covenants și condiții',
              ],
            },
            {
              title: 'Cash Pooling și Treasury Management',
              type: 'VIDEO',
              duration: 45,
              description: 'Centralizarea lichidității în grup',
              keyTakeaways: [
                'Notional vs physical pooling',
                'In-house banking',
                'Intercompany funding',
              ],
            },
            {
              title: 'Rezerve de Lichiditate',
              type: 'VIDEO',
              duration: 30,
              description: 'Cât cash să păstrezi',
              keyTakeaways: [
                'Determinarea rezervei optime',
                'Cost of carry vs risk',
                'Investment of excess cash',
              ],
            },
            {
              title: 'Exercițiu: Liquidity Buffer Calculation',
              type: 'EXERCISE',
              duration: 45,
              description: 'Calculează rezerva optimă de lichiditate',
              keyTakeaways: [
                'Analiza volatilității cash flow',
                'Scenarii de stress',
                'Recomandare de buffer',
              ],
              excelTemplates: ['liquidity-buffer-exercise.xlsx'],
            },
          ],
          practicalExerciseIds: ['ex-liquidity-strategy'],
        },
        {
          title: 'Modul 5: Proiect Final - Cash Flow Dashboard',
          description: 'Construirea unui sistem complet de monitoring',
          duration: 360,
          lessons: [
            {
              title: 'Design-ul Dashboard-ului',
              type: 'VIDEO',
              duration: 45,
              description: 'Principii de design pentru dashboards financiare',
              keyTakeaways: [
                'KPIs cheie pentru cash',
                'Vizualizări eficiente',
                'Alerts și thresholds',
              ],
            },
            {
              title: 'Implementare în Excel/Power BI',
              type: 'EXERCISE',
              duration: 120,
              description: 'Construiește dashboard-ul pas cu pas',
              keyTakeaways: [
                'Conectarea surselor de date',
                'Crearea vizualizărilor',
                'Automatizarea refresh-ului',
              ],
              excelTemplates: ['cash-dashboard-template.xlsx'],
            },
            {
              title: 'Prezentarea Proiectului Final',
              type: 'SIMULATION',
              duration: 60,
              description: 'Prezintă dashboard-ul către un panel de experți',
              keyTakeaways: [
                'Demonstrarea funcționalităților',
                'Feedback și îmbunătățiri',
                'Certificare',
              ],
            },
          ],
          practicalExerciseIds: ['ex-cash-dashboard'],
        },
      ],
      practicalExercises: [],
      duration: {
        weeks: 6,
        hoursPerWeek: 5,
        totalHours: 30,
      },
      pricing: {
        amount: 449,
        currency: 'RON',
        corporateDiscount: 20,
      },
      certification: {
        credentialName: 'Certificate in Cash Flow Management',
        ceuCredits: 4,
        validityYears: 3,
      },
      complianceFrameworks: [],
      regulatoryUpdates: false,
      hrdaEligible: true,
    };
  }

  getROGAAPComplianceTemplate(): FinanceCourseTemplate {
    return {
      title: 'Conformitate RO GAAP - Reglementările Contabile Românești',
      slug: 'ro-gaap-compliance',
      description: `Curs comprehensiv de conformitate cu reglementările contabile românești
        (OMFP 1802/2014 actualizat). Acoperă principii contabile, politici, situații
        financiare, și integrarea cu SAF-T D406. Pentru contabili și manageri financiari.`,
      shortDescription: 'Stăpânește reglementările contabile românești și asigură conformitatea',
      category: 'GAAP_COMPLIANCE',
      level: 'PROFESSIONAL',
      targetAudience: [
        'Contabili și experți contabili CECCAR',
        'Controlleri financiari',
        'Auditori interni și externi',
        'CFOs și directori financiari',
      ],
      prerequisites: [
        'Cunoștințe solide de contabilitate',
        'Experiență în întocmirea situațiilor financiare',
        'Familiaritate cu software-ul contabil',
      ],
      learningOutcomes: [
        'Aplică corect principiile contabile românești (OMFP 1802/2014)',
        'Întocmește situații financiare conforme cu cerințele legale',
        'Elaborează și documentează politici contabile',
        'Pregătește fișierul SAF-T D406 conform cerințelor ANAF',
        'Gestionează tranziția între politici contabile',
        'Evită greșelile comune de conformitate',
      ],
      modules: [
        {
          title: 'Modul 1: Cadrul Reglementărilor Contabile în România',
          description: 'Structura și ierarhia normelor contabile',
          duration: 360,
          keyRegulations: ['Legea 82/1991', 'OMFP 1802/2014', 'OMFP 2844/2016'],
          lessons: [
            {
              title: 'Ierarhia Normelor Contabile',
              type: 'VIDEO',
              duration: 45,
              description: 'De la legi la reglementări specifice',
              keyTakeaways: [
                'Legea contabilității 82/1991',
                'OMFP 1802/2014 vs OMFP 2844/2016',
                'Pragurile de aplicare',
              ],
              regulatoryReferences: ['Legea 82/1991 republicată', 'OMFP 1802/2014'],
            },
            {
              title: 'Principii Contabile Generale',
              type: 'VIDEO',
              duration: 60,
              description: 'Principiile fundamentale de raportare',
              keyTakeaways: [
                'Continuitatea activității',
                'Permanența metodelor',
                'Prudența și independența exercițiului',
              ],
            },
            {
              title: 'Categorii de Entități',
              type: 'VIDEO',
              duration: 30,
              description: 'Micro, mici, mijlocii și mari',
              keyTakeaways: [
                'Criteriile de încadrare',
                'Obligații diferențiate',
                'Simplificări pentru microentități',
              ],
              regulatoryReferences: ['OMFP 1802/2014 - Art. 3-8'],
            },
            {
              title: 'Quiz: Cadrul Reglementărilor',
              type: 'QUIZ',
              duration: 20,
              description: 'Verifică înțelegerea cadrului normativ',
              keyTakeaways: ['Consolidarea cunoștințelor'],
            },
          ],
          practicalExerciseIds: [],
        },
        {
          title: 'Modul 2: Recunoașterea și Evaluarea Elementelor',
          description: 'Reguli de recunoaștere și evaluare conform RO GAAP',
          duration: 480,
          keyRegulations: ['OMFP 1802/2014 - Secțiunile 2-5'],
          lessons: [
            {
              title: 'Imobilizări Corporale',
              type: 'VIDEO',
              duration: 60,
              description: 'Recunoaștere, evaluare și amortizare',
              keyTakeaways: [
                'Criterii de recunoaștere',
                'Evaluare la cost sau reevaluare',
                'Metode de amortizare acceptate',
              ],
              regulatoryReferences: ['OMFP 1802/2014 - Secțiunea 2.5'],
            },
            {
              title: 'Imobilizări Necorporale',
              type: 'VIDEO',
              duration: 45,
              description: 'Brevete, licențe, goodwill',
              keyTakeaways: [
                'Tratamentul cheltuielilor de dezvoltare',
                'Amortizarea goodwill-ului',
                'Diferențe față de IFRS',
              ],
            },
            {
              title: 'Stocuri',
              type: 'VIDEO',
              duration: 45,
              description: 'Evaluarea și ajustările de depreciere',
              keyTakeaways: [
                'FIFO, LIFO, CMP',
                'Cost vs valoare netă realizabilă',
                'Ajustări pentru depreciere',
              ],
            },
            {
              title: 'Creanțe și Provizioane',
              type: 'VIDEO',
              duration: 60,
              description: 'Recunoaștere, ajustări și provizionare',
              keyTakeaways: [
                'Ajustări pentru creanțe incerte',
                'Tipuri de provizioane',
                'Documentația necesară',
              ],
            },
            {
              title: 'Exercițiu: Cazuri Practice de Recunoaștere',
              type: 'EXERCISE',
              duration: 60,
              description: 'Rezolvă 10 situații practice',
              keyTakeaways: [
                'Aplicarea regulilor pe cazuri concrete',
                'Documentarea deciziilor',
                'Înregistrări contabile',
              ],
            },
          ],
          practicalExerciseIds: ['ex-recognition-cases'],
        },
        {
          title: 'Modul 3: Situații Financiare Anuale',
          description: 'Întocmirea și prezentarea situațiilor financiare',
          duration: 540,
          keyRegulations: ['OMFP 1802/2014 - Secțiunea 8'],
          lessons: [
            {
              title: 'Bilanțul - Structură și Prezentare',
              type: 'VIDEO',
              duration: 60,
              description: 'Formatul obligatoriu și opțiunile de prezentare',
              keyTakeaways: [
                'Format prescurtat vs detaliat',
                'Ajustări ale capitalurilor proprii',
                'Note explicative obligatorii',
              ],
              regulatoryReferences: ['OMFP 1802/2014 - Anexa 1'],
            },
            {
              title: 'Contul de Profit și Pierdere',
              type: 'VIDEO',
              duration: 45,
              description: 'Structura P&L conform RO GAAP',
              keyTakeaways: [
                'Clasificarea cheltuielilor',
                'Rezultatul din exploatare vs financiar',
                'Prezentarea cifrei de afaceri',
              ],
            },
            {
              title: 'Situația Fluxurilor de Trezorerie',
              type: 'VIDEO',
              duration: 45,
              description: 'Cash flow statement conform RO GAAP',
              keyTakeaways: [
                'Obligativitatea întocmirii',
                'Metoda directă vs indirectă',
                'Diferențe față de IAS 7',
              ],
            },
            {
              title: 'Situația Modificărilor Capitalurilor Proprii',
              type: 'VIDEO',
              duration: 30,
              description: 'Mișcările în capitaluri',
              keyTakeaways: [
                'Structura situației',
                'Rezerve legale și alte rezerve',
                'Rezultatul reportat',
              ],
            },
            {
              title: 'Note Explicative Obligatorii',
              type: 'VIDEO',
              duration: 60,
              description: 'Cerințele de disclosure',
              keyTakeaways: [
                'Politici contabile',
                'Informații suplimentare obligatorii',
                'Disclosure tranzacții cu părți afiliate',
              ],
            },
            {
              title: 'Exercițiu: Întocmirea Bilanțului',
              type: 'EXERCISE',
              duration: 90,
              description: 'Întocmește bilanțul dintr-o balanță de verificare',
              keyTakeaways: [
                'Reclasificări necesare',
                'Verificarea concordanței',
                'Formatarea conformă',
              ],
            },
          ],
          practicalExerciseIds: ['ex-financial-statements'],
        },
        {
          title: 'Modul 4: SAF-T D406 și Raportare Digitală',
          description: 'Conformitatea cu cerințele de raportare ANAF',
          duration: 420,
          keyRegulations: ['OMFP 1783/2021', 'OPANAF 1783/2021'],
          lessons: [
            {
              title: 'Introducere în SAF-T D406',
              type: 'VIDEO',
              duration: 45,
              description: 'Ce este SAF-T și de ce contează',
              keyTakeaways: [
                'Originea și scopul SAF-T',
                'Timeline-ul de implementare în România',
                'Categorii de contribuabili vizați',
              ],
              regulatoryReferences: ['OPANAF 1783/2021', 'Legea 207/2015'],
            },
            {
              title: 'Structura Fișierului SAF-T',
              type: 'VIDEO',
              duration: 60,
              description: 'Componentele și schema XML',
              keyTakeaways: [
                'Header și informații generale',
                'Master files (parteneri, produse, conturi)',
                'General ledger entries',
                'Source documents',
              ],
            },
            {
              title: 'Pregătirea Datelor pentru SAF-T',
              type: 'VIDEO',
              duration: 60,
              description: 'Curățarea și maparea datelor',
              keyTakeaways: [
                'Data quality checks',
                'Maparea planului de conturi',
                'Codificarea partenerilor și produselor',
              ],
            },
            {
              title: 'Validarea și Depunerea',
              type: 'VIDEO',
              duration: 45,
              description: 'Procesul de validare și transmitere',
              keyTakeaways: [
                'Validator ANAF',
                'Erori comune și remedieri',
                'Termene și sancțiuni',
              ],
            },
            {
              title: 'Workshop: Generarea SAF-T',
              type: 'LIVE_WORKSHOP',
              duration: 90,
              description: 'Generează un fișier SAF-T din softul contabil',
              keyTakeaways: [
                'Configurarea exportului',
                'Validarea fișierului',
                'Depanarea erorilor',
              ],
            },
          ],
          practicalExerciseIds: ['ex-saft-generation'],
        },
        {
          title: 'Modul 5: Politici Contabile și Erori',
          description: 'Elaborarea politicilor și corectarea erorilor',
          duration: 360,
          keyRegulations: ['OMFP 1802/2014 - Secțiunea 7'],
          lessons: [
            {
              title: 'Elaborarea Manualului de Politici Contabile',
              type: 'VIDEO',
              duration: 60,
              description: 'Structura și conținutul documentației',
              keyTakeaways: [
                'Componente obligatorii',
                'Adaptarea la specificul entității',
                'Aprobarea și actualizarea',
              ],
            },
            {
              title: 'Schimbarea Politicilor Contabile',
              type: 'VIDEO',
              duration: 45,
              description: 'Când și cum să schimbi o politică',
              keyTakeaways: [
                'Schimbări voluntare vs obligatorii',
                'Aplicarea retrospectivă',
                'Disclosure requirements',
              ],
            },
            {
              title: 'Corectarea Erorilor',
              type: 'VIDEO',
              duration: 45,
              description: 'Tratamentul erorilor din perioadele anterioare',
              keyTakeaways: [
                'Erori materiale vs imateriale',
                'Retratarea sau ajustarea curentă',
                'Documentarea corectării',
              ],
            },
            {
              title: 'Exercițiu: Manual de Politici',
              type: 'EXERCISE',
              duration: 60,
              description: 'Elaborează secțiuni din manualul de politici',
              keyTakeaways: [
                'Redactarea profesională',
                'Consistența cu practica',
                'Conformitatea cu reglementările',
              ],
            },
          ],
          practicalExerciseIds: ['ex-accounting-policies'],
        },
        {
          title: 'Modul 6: Examen și Certificare',
          description: 'Evaluarea finală și obținerea certificării',
          duration: 180,
          lessons: [
            {
              title: 'Recapitulare și Pregătire Examen',
              type: 'VIDEO',
              duration: 60,
              description: 'Review al conceptelor cheie',
              keyTakeaways: [
                'Sinteza modulelor',
                'Puncte frecvent testate',
                'Strategii de examen',
              ],
            },
            {
              title: 'Examen Final',
              type: 'QUIZ',
              duration: 90,
              description: 'Test comprehensiv de conformitate RO GAAP',
              keyTakeaways: [
                '60 întrebări, 70% pentru promovare',
                'Mix de teorie și aplicare',
                'Certificat digital la promovare',
              ],
            },
          ],
          practicalExerciseIds: [],
        },
      ],
      practicalExercises: [],
      duration: {
        weeks: 8,
        hoursPerWeek: 5,
        totalHours: 40,
      },
      pricing: {
        amount: 599,
        currency: 'RON',
        corporateDiscount: 15,
      },
      certification: {
        credentialName: 'Certificate in RO GAAP Compliance',
        ceuCredits: 5,
        cecpaCredits: 40,
        validityYears: 2,
      },
      complianceFrameworks: ['OMFP 1802/2014', 'SAF-T D406', 'Legea 82/1991'],
      regulatoryUpdates: true,
      hrdaEligible: true,
    };
  }

  getIFRSFundamentalsTemplate(): FinanceCourseTemplate {
    return {
      title: 'IFRS Fundamentals pentru Afaceri Românești',
      slug: 'ifrs-fundamentals',
      description: `Introducere în IFRS pentru profesioniști români. Acoperă principalele
        standarde, diferențele față de RO GAAP, și implementarea practică. Ideal pentru
        companii care raportează în IFRS sau care se pregătesc pentru tranziție.`,
      shortDescription: 'Înțelege IFRS și aplicarea în contextul românesc',
      category: 'IFRS',
      level: 'INTERMEDIATE',
      targetAudience: [
        'Contabili din companii cu raportare IFRS',
        'Controlleri financiari în multinaționale',
        'Auditori care auditează entități IFRS',
        'CFOs care pregătesc tranziția la IFRS',
      ],
      prerequisites: [
        'Cunoștințe solide de contabilitate RO GAAP',
        'Experiență în situații financiare',
        'Cunoștințe de bază în limba engleză (pentru terminologie)',
      ],
      learningOutcomes: [
        'Înțelege cadrul conceptual IFRS',
        'Aplică standardele IFRS cheie',
        'Identifică diferențele majore RO GAAP vs IFRS',
        'Pregătește situații financiare conform IFRS',
        'Gestionează prima adoptare IFRS 1',
        'Documentează politicile contabile IFRS',
      ],
      modules: [
        {
          title: 'Modul 1: Cadrul Conceptual IFRS',
          description: 'Fundația standardelor internaționale',
          duration: 300,
          lessons: [
            {
              title: 'IASB și Procesul de Standard-Setting',
              type: 'VIDEO',
              duration: 30,
              description: 'Cine emite IFRS și cum',
              keyTakeaways: [
                'Structura IFRS Foundation',
                'Procesul due process',
                'IFRS vs IFRS for SMEs',
              ],
            },
            {
              title: 'Cadrul Conceptual 2018',
              type: 'VIDEO',
              duration: 60,
              description: 'Principiile fundamentale',
              keyTakeaways: [
                'Caracteristici calitative',
                'Elementele situațiilor financiare',
                'Recunoaștere și derecunoaștere',
              ],
            },
            {
              title: 'Prezentarea Situațiilor Financiare (IAS 1)',
              type: 'VIDEO',
              duration: 60,
              description: 'Structura completă de raportare IFRS',
              keyTakeaways: [
                'Setul complet de situații',
                'Structura și conținutul',
                'Comparativa cu OMFP 1802',
              ],
            },
            {
              title: 'Quiz: Cadrul IFRS',
              type: 'QUIZ',
              duration: 20,
              description: 'Verifică înțelegerea cadrului',
              keyTakeaways: ['Consolidarea cunoștințelor'],
            },
          ],
          practicalExerciseIds: [],
        },
        {
          title: 'Modul 2: Standarde Cheie pentru Active',
          description: 'IAS 16, IAS 38, IAS 36, IAS 40',
          duration: 480,
          lessons: [
            {
              title: 'IAS 16 - Imobilizări Corporale',
              type: 'VIDEO',
              duration: 60,
              description: 'Tratamentul PP&E în IFRS',
              keyTakeaways: [
                'Model cost vs revaluation',
                'Component depreciation',
                'Diferențe față de RO GAAP',
              ],
            },
            {
              title: 'IAS 38 - Imobilizări Necorporale',
              type: 'VIDEO',
              duration: 45,
              description: 'Intangibles în IFRS',
              keyTakeaways: [
                'Criterii de recunoaștere',
                'R&D capitalization',
                'Amortizare și impairment',
              ],
            },
            {
              title: 'IAS 36 - Deprecierea Activelor',
              type: 'VIDEO',
              duration: 60,
              description: 'Impairment testing',
              keyTakeaways: [
                'Indicatori de depreciere',
                'Recoverable amount',
                'Cash generating units',
              ],
            },
            {
              title: 'IAS 40 - Investiții Imobiliare',
              type: 'VIDEO',
              duration: 45,
              description: 'Investment property',
              keyTakeaways: [
                'Clasificare și evaluare',
                'Fair value model',
                'Transfers și reclasificări',
              ],
            },
            {
              title: 'Exercițiu: Active Non-Curente IFRS',
              type: 'EXERCISE',
              duration: 60,
              description: 'Cazuri practice de aplicare',
              keyTakeaways: [
                'Component depreciation',
                'Impairment calculations',
                'Journal entries',
              ],
            },
          ],
          practicalExerciseIds: ['ex-ifrs-assets'],
        },
        {
          title: 'Modul 3: Venituri și Instrumente Financiare',
          description: 'IFRS 15, IFRS 9',
          duration: 420,
          lessons: [
            {
              title: 'IFRS 15 - Venituri din Contracte cu Clienții',
              type: 'VIDEO',
              duration: 90,
              description: 'Modelul în 5 pași',
              keyTakeaways: [
                'Identificarea contractului și obligațiilor',
                'Determinarea prețului tranzacției',
                'Alocarea și recunoașterea veniturilor',
              ],
            },
            {
              title: 'IFRS 9 - Instrumente Financiare (Partea 1)',
              type: 'VIDEO',
              duration: 60,
              description: 'Clasificare și evaluare',
              keyTakeaways: [
                'Business model și SPPI test',
                'Amortised cost vs FVOCI vs FVPL',
                'Reclasificări',
              ],
            },
            {
              title: 'IFRS 9 - Instrumente Financiare (Partea 2)',
              type: 'VIDEO',
              duration: 60,
              description: 'Impairment și hedging',
              keyTakeaways: [
                'Expected credit loss model',
                'Stage 1, 2, 3 provisions',
                'Hedge accounting basics',
              ],
            },
            {
              title: 'Exercițiu: Revenue Recognition',
              type: 'EXERCISE',
              duration: 60,
              description: 'Scenarii de recunoaștere a veniturilor',
              keyTakeaways: [
                'Aplicarea celor 5 pași',
                'Documentarea judecăților',
                'Înregistrări contabile',
              ],
            },
          ],
          practicalExerciseIds: ['ex-ifrs-revenue'],
        },
        {
          title: 'Modul 4: Leasing și Provizioane',
          description: 'IFRS 16, IAS 37',
          duration: 360,
          lessons: [
            {
              title: 'IFRS 16 - Contracte de Leasing',
              type: 'VIDEO',
              duration: 90,
              description: 'Noul model de leasing',
              keyTakeaways: [
                'Right-of-use asset',
                'Lease liability',
                'Impactul asupra KPIs',
              ],
            },
            {
              title: 'IAS 37 - Provizioane și Contingențe',
              type: 'VIDEO',
              duration: 60,
              description: 'Când și cât să provizionezi',
              keyTakeaways: [
                'Criterii de recunoaștere',
                'Evaluarea la best estimate',
                'Contingent liabilities disclosure',
              ],
            },
            {
              title: 'Exercițiu: Lease Calculations',
              type: 'EXERCISE',
              duration: 60,
              description: 'Calculul și înregistrarea leasing-ului',
              keyTakeaways: [
                'Present value calculations',
                'Amortization schedules',
                'Financial statement impact',
              ],
            },
          ],
          practicalExerciseIds: ['ex-ifrs-leasing'],
        },
        {
          title: 'Modul 5: Prima Adoptare IFRS',
          description: 'Tranziția de la RO GAAP la IFRS',
          duration: 420,
          lessons: [
            {
              title: 'IFRS 1 - Cadrul de Tranziție',
              type: 'VIDEO',
              duration: 60,
              description: 'Principiile primei adoptări',
              keyTakeaways: [
                'Opening IFRS balance sheet',
                'Mandatory exceptions',
                'Optional exemptions',
              ],
            },
            {
              title: 'Ajustări Majore RO GAAP → IFRS',
              type: 'VIDEO',
              duration: 90,
              description: 'Principalele diferențe de ajustat',
              keyTakeaways: [
                'PP&E și intangibles',
                'Leasing IFRS 16',
                'Revenue recognition',
                'Provisions și contingencies',
              ],
            },
            {
              title: 'Planul de Tranziție',
              type: 'VIDEO',
              duration: 45,
              description: 'Cum să planifici tranziția',
              keyTakeaways: [
                'Timeline și resurse',
                'Data gaps și remedii',
                'Comunicarea cu stakeholderii',
              ],
            },
            {
              title: 'Studiu de Caz: Tranziție IFRS',
              type: 'CASE_STUDY',
              duration: 90,
              description: 'Tranziția unei companii românești la IFRS',
              keyTakeaways: [
                'Provocări întâmpinate',
                'Ajustări majore efectuate',
                'Lecții învățate',
              ],
            },
          ],
          practicalExerciseIds: ['ex-ifrs-transition'],
          caseStudyType: 'MULTINATIONAL',
        },
        {
          title: 'Modul 6: Examen și Certificare',
          description: 'Evaluarea finală',
          duration: 150,
          lessons: [
            {
              title: 'Recapitulare',
              type: 'VIDEO',
              duration: 45,
              description: 'Review al standardelor cheie',
              keyTakeaways: [
                'Sinteza modulelor',
                'Diferențe cheie RO GAAP vs IFRS',
                'Tips pentru examen',
              ],
            },
            {
              title: 'Examen Final IFRS',
              type: 'QUIZ',
              duration: 90,
              description: 'Test de certificare',
              keyTakeaways: [
                '50 întrebări, 70% pentru promovare',
                'Focus pe standarde cheie',
                'Certificat la promovare',
              ],
            },
          ],
          practicalExerciseIds: [],
        },
      ],
      practicalExercises: [],
      duration: {
        weeks: 7,
        hoursPerWeek: 5,
        totalHours: 35,
      },
      pricing: {
        amount: 549,
        currency: 'RON',
        corporateDiscount: 15,
      },
      certification: {
        credentialName: 'Certificate in IFRS Fundamentals',
        ceuCredits: 4,
        cecpaCredits: 35,
        validityYears: 2,
      },
      complianceFrameworks: ['IFRS', 'IAS'],
      regulatoryUpdates: true,
      hrdaEligible: true,
    };
  }

  getCostAccountingTemplate(): FinanceCourseTemplate {
    return {
      title: 'Contabilitate de Gestiune și Costuri',
      slug: 'cost-accounting',
      description: `Curs comprehensiv de contabilitate de gestiune pentru profesioniști
        care doresc să înțeleagă și să optimizeze structura costurilor. Acoperă
        metode de alocare, ABC, standard costing și decision-making.`,
      shortDescription: 'Stăpânește analiza costurilor pentru decizii mai bune',
      category: 'COST_ACCOUNTING',
      level: 'INTERMEDIATE',
      targetAudience: [
        'Controlleri și analiști de costuri',
        'Manageri de producție',
        'CFOs și directori financiari',
        'Manageri operaționali cu focus pe eficiență',
      ],
      prerequisites: [
        'Cunoștințe solide de contabilitate generală',
        'Experiență cu situații financiare',
        'Excel intermediar',
      ],
      learningOutcomes: [
        'Clasifică și analizează costurile organizaționale',
        'Implementează sisteme de cost accounting',
        'Aplică metodologii ABC (Activity-Based Costing)',
        'Calculează și analizează varianțe de cost',
        'Ia decizii informate bazate pe analiza costurilor',
        'Construiește modele de pricing bazate pe cost-plus',
      ],
      modules: [
        {
          title: 'Modul 1: Clasificarea și Comportamentul Costurilor',
          description: 'Fundamente de analiză a costurilor',
          duration: 360,
          lessons: [
            {
              title: 'Clasificări ale Costurilor',
              type: 'VIDEO',
              duration: 45,
              description: 'Multiple perspective asupra costurilor',
              keyTakeaways: [
                'Direct vs indirect',
                'Fix vs variabil',
                'Produs vs perioadă',
              ],
            },
            {
              title: 'Comportamentul Costurilor',
              type: 'VIDEO',
              duration: 60,
              description: 'Cum se schimbă costurile cu volumul',
              keyTakeaways: [
                'High-low method',
                'Regression analysis',
                'Relevant range',
              ],
            },
            {
              title: 'Analiza CVP (Cost-Volume-Profit)',
              type: 'VIDEO',
              duration: 60,
              description: 'Break-even și analiza sensitivității',
              keyTakeaways: [
                'Calculul break-even point',
                'Contribution margin',
                'Operating leverage',
              ],
            },
            {
              title: 'Exercițiu: Analiza CVP',
              type: 'EXERCISE',
              duration: 60,
              description: 'Calculează break-even și margin of safety',
              keyTakeaways: [
                'Aplicarea formulelor',
                'Interpretarea rezultatelor',
                'Recomandări de pricing',
              ],
              excelTemplates: ['cvp-analysis-template.xlsx'],
            },
          ],
          practicalExerciseIds: ['ex-cvp-analysis'],
        },
        {
          title: 'Modul 2: Sisteme de Cost Accounting',
          description: 'Metodologii de calculație a costurilor',
          duration: 420,
          lessons: [
            {
              title: 'Job Order Costing',
              type: 'VIDEO',
              duration: 60,
              description: 'Calculația pe comenzi',
              keyTakeaways: [
                'Când să folosești job costing',
                'Flow of costs',
                'Overhead allocation',
              ],
            },
            {
              title: 'Process Costing',
              type: 'VIDEO',
              duration: 60,
              description: 'Calculația pe procese',
              keyTakeaways: [
                'Equivalent units',
                'FIFO vs weighted average',
                'Multi-department processes',
              ],
            },
            {
              title: 'Activity-Based Costing (ABC)',
              type: 'VIDEO',
              duration: 90,
              description: 'Calculația pe activități',
              keyTakeaways: [
                'Cost drivers și cost pools',
                'Implementarea ABC',
                'ABC vs traditional costing',
              ],
            },
            {
              title: 'Exercițiu: Implementează ABC',
              type: 'EXERCISE',
              duration: 90,
              description: 'Construiește un model ABC',
              keyTakeaways: [
                'Identificarea activităților',
                'Selectarea cost drivers',
                'Calculul costurilor pe produs',
              ],
              excelTemplates: ['abc-model-template.xlsx'],
            },
          ],
          practicalExerciseIds: ['ex-abc-implementation'],
        },
        {
          title: 'Modul 3: Standard Costing și Varianțe',
          description: 'Bugetarea și analiza abaterilor de cost',
          duration: 420,
          lessons: [
            {
              title: 'Stabilirea Costurilor Standard',
              type: 'VIDEO',
              duration: 60,
              description: 'Cum să setezi standarde',
              keyTakeaways: [
                'Ideal vs practical standards',
                'Material, labor, overhead standards',
                'Actualizarea standardelor',
              ],
            },
            {
              title: 'Analiza Varianțelor de Material',
              type: 'VIDEO',
              duration: 45,
              description: 'Price și quantity variances',
              keyTakeaways: [
                'Calculul varianțelor',
                'Interpretarea cauzelor',
                'Acțiuni corective',
              ],
            },
            {
              title: 'Analiza Varianțelor de Manoperă',
              type: 'VIDEO',
              duration: 45,
              description: 'Rate și efficiency variances',
              keyTakeaways: [
                'Labor rate variance',
                'Labor efficiency variance',
                'Factori de influență',
              ],
            },
            {
              title: 'Analiza Varianțelor de Overhead',
              type: 'VIDEO',
              duration: 60,
              description: 'Fixed și variable overhead variances',
              keyTakeaways: [
                'Spending și efficiency variances',
                'Volume variance',
                'Three-way vs four-way analysis',
              ],
            },
            {
              title: 'Exercițiu Comprehensiv de Varianțe',
              type: 'EXERCISE',
              duration: 90,
              description: 'Analiză completă a varianțelor',
              keyTakeaways: [
                'Calculul tuturor varianțelor',
                'Raportul de management',
                'Recomandări de îmbunătățire',
              ],
              excelTemplates: ['variance-analysis-comprehensive.xlsx'],
            },
          ],
          practicalExerciseIds: ['ex-variance-comprehensive'],
        },
        {
          title: 'Modul 4: Decizii Bazate pe Costuri',
          description: 'Utilizarea informațiilor de cost în decizii',
          duration: 360,
          lessons: [
            {
              title: 'Relevant Costs pentru Decizii',
              type: 'VIDEO',
              duration: 45,
              description: 'Ce costuri contează în decizii',
              keyTakeaways: [
                'Sunk costs vs relevant costs',
                'Opportunity costs',
                'Differential analysis',
              ],
            },
            {
              title: 'Make or Buy Decisions',
              type: 'VIDEO',
              duration: 45,
              description: 'Analiza externalizării',
              keyTakeaways: [
                'Factori de decizie',
                'Calculul economic',
                'Riscuri non-financiare',
              ],
            },
            {
              title: 'Pricing Decisions',
              type: 'VIDEO',
              duration: 60,
              description: 'Stabilirea prețurilor bazate pe cost',
              keyTakeaways: [
                'Cost-plus pricing',
                'Target costing',
                'Value-based pricing',
              ],
            },
            {
              title: 'Studiu de Caz: Decizie de Pricing',
              type: 'CASE_STUDY',
              duration: 90,
              description: 'Analizează o decizie de pricing complexă',
              keyTakeaways: [
                'Aplicarea conceptelor',
                'Argumentarea recomandării',
                'Prezentarea către management',
              ],
            },
          ],
          practicalExerciseIds: ['ex-pricing-decision'],
          caseStudyType: 'ROMANIAN_SME',
        },
        {
          title: 'Modul 5: Proiect Final și Certificare',
          description: 'Aplicarea cunoștințelor într-un proiect comprehensiv',
          duration: 300,
          lessons: [
            {
              title: 'Briefing Proiect Final',
              type: 'VIDEO',
              duration: 30,
              description: 'Cerințele proiectului de certificare',
              keyTakeaways: [
                'Scopul proiectului',
                'Deliverables necesare',
                'Criteriile de evaluare',
              ],
            },
            {
              title: 'Proiect: Sistem de Cost Accounting',
              type: 'EXERCISE',
              duration: 180,
              description: 'Construiește un sistem complet',
              keyTakeaways: [
                'Design-ul sistemului',
                'Implementare în Excel',
                'Documentație',
              ],
            },
            {
              title: 'Prezentarea și Examen',
              type: 'SIMULATION',
              duration: 60,
              description: 'Prezentare și test final',
              keyTakeaways: [
                'Demonstrarea competențelor',
                'Feedback și certificare',
              ],
            },
          ],
          practicalExerciseIds: [],
        },
      ],
      practicalExercises: [],
      duration: {
        weeks: 6,
        hoursPerWeek: 5,
        totalHours: 30,
      },
      pricing: {
        amount: 399,
        currency: 'RON',
        corporateDiscount: 20,
      },
      certification: {
        credentialName: 'Certificate in Cost Accounting',
        ceuCredits: 4,
        cecpaCredits: 30,
        validityYears: 3,
      },
      complianceFrameworks: [],
      regulatoryUpdates: false,
      hrdaEligible: true,
    };
  }

  getFinancialAnalysisTemplate(): FinanceCourseTemplate {
    return {
      title: 'Analiza Financiară pentru Operaționali',
      slug: 'financial-analysis',
      description: `Curs practic de analiză financiară pentru manageri non-financiari.
        Acoperă citirea situațiilor financiare, calculul și interpretarea ratelor,
        și integrarea analizei în decizii operaționale.`,
      shortDescription: 'Învață să citești și să interpretezi datele financiare',
      category: 'FINANCIAL_ANALYSIS',
      level: 'FOUNDATIONAL',
      targetAudience: [
        'Manageri operaționali',
        'Project managers',
        'Team leads cu responsabilități de P&L',
        'Antreprenori',
      ],
      prerequisites: [
        'Cunoștințe de bază de business',
        'Excel de bază',
        'Dorință de a înțelege finanțele',
      ],
      learningOutcomes: [
        'Citește și interpretează cele trei situații financiare',
        'Calculează ratele financiare cheie',
        'Evaluează sănătatea financiară a unei companii',
        'Identifică red flags în situațiile financiare',
        'Comunică eficient cu echipa de finanțe',
        'Integrează analiza financiară în decizii operaționale',
      ],
      modules: [
        {
          title: 'Modul 1: Bilanțul Contabil',
          description: 'Poziția financiară la un moment dat',
          duration: 300,
          lessons: [
            {
              title: 'Structura Bilanțului',
              type: 'VIDEO',
              duration: 45,
              description: 'Active, pasive, capitaluri proprii',
              keyTakeaways: [
                'Ecuația contabilă',
                'Active curente vs non-curente',
                'Datorii pe termen scurt vs lung',
              ],
            },
            {
              title: 'Ce Spune Bilanțul despre Companie',
              type: 'VIDEO',
              duration: 45,
              description: 'Interpretarea poziției financiare',
              keyTakeaways: [
                'Lichiditatea companiei',
                'Gradul de îndatorare',
                'Calitatea activelor',
              ],
            },
            {
              title: 'Red Flags în Bilanț',
              type: 'VIDEO',
              duration: 30,
              description: 'Ce să cauți când analizezi',
              keyTakeaways: [
                'Creșterea stocurilor nejustificată',
                'Creanțe vechi neîncasate',
                'Schimbări bruște în structură',
              ],
            },
            {
              title: 'Exercițiu: Analizează un Bilanț',
              type: 'EXERCISE',
              duration: 45,
              description: 'Analiză practică pas cu pas',
              keyTakeaways: [
                'Identificarea elementelor cheie',
                'Calculul indicatorilor',
                'Formularea concluziilor',
              ],
            },
          ],
          practicalExerciseIds: ['ex-balance-sheet'],
        },
        {
          title: 'Modul 2: Contul de Profit și Pierdere',
          description: 'Performanța financiară pe o perioadă',
          duration: 300,
          lessons: [
            {
              title: 'De la Venituri la Profit Net',
              type: 'VIDEO',
              duration: 45,
              description: 'Structura P&L',
              keyTakeaways: [
                'Cifra de afaceri și alte venituri',
                'Costul bunurilor vândute',
                'Cheltuieli operaționale și financiare',
              ],
            },
            {
              title: 'Marjele de Profit',
              type: 'VIDEO',
              duration: 45,
              description: 'Marja brută, operațională, netă',
              keyTakeaways: [
                'Ce măsoară fiecare marjă',
                'Benchmarks pe industrie',
                'Tendințe și cauze',
              ],
            },
            {
              title: 'EBITDA și Ajustări',
              type: 'VIDEO',
              duration: 30,
              description: 'Profitabilitatea operațională pură',
              keyTakeaways: [
                'Calculul EBITDA',
                'De ce e popular EBITDA',
                'Limitări și critici',
              ],
            },
            {
              title: 'Exercițiu: Analiza P&L Comparativ',
              type: 'EXERCISE',
              duration: 45,
              description: 'Compară 2 ani de performanță',
              keyTakeaways: [
                'Analiza orizontală',
                'Identificarea tendințelor',
                'Explicarea variațiilor',
              ],
            },
          ],
          practicalExerciseIds: ['ex-pl-analysis'],
        },
        {
          title: 'Modul 3: Cash Flow Statement',
          description: 'Urmărirea banilor reali',
          duration: 240,
          lessons: [
            {
              title: 'Cele Trei Categorii de Cash Flow',
              type: 'VIDEO',
              duration: 45,
              description: 'Operating, investing, financing',
              keyTakeaways: [
                'Ce include fiecare categorie',
                'De unde vine și unde se duce cash-ul',
                'Semnificația fiecărei categorii',
              ],
            },
            {
              title: 'Free Cash Flow',
              type: 'VIDEO',
              duration: 30,
              description: 'Cash-ul disponibil pentru stakeholders',
              keyTakeaways: [
                'Calculul FCF',
                'De ce e important FCF',
                'FCF vs profit net',
              ],
            },
            {
              title: 'Exercițiu: Analiza Cash Flow',
              type: 'EXERCISE',
              duration: 45,
              description: 'Interpretează cash flow statement',
              keyTakeaways: [
                'Identificarea surselor de cash',
                'Evaluarea calității profiturilor',
                'Red flags în cash flow',
              ],
            },
          ],
          practicalExerciseIds: ['ex-cashflow-analysis'],
        },
        {
          title: 'Modul 4: Ratele Financiare',
          description: 'KPIs financiari pentru decizii',
          duration: 360,
          lessons: [
            {
              title: 'Rate de Lichiditate',
              type: 'VIDEO',
              duration: 45,
              description: 'Current, quick, cash ratio',
              keyTakeaways: [
                'Calculul ratelor',
                'Interpretare și benchmarks',
                'Acțiuni de îmbunătățire',
              ],
            },
            {
              title: 'Rate de Solvabilitate',
              type: 'VIDEO',
              duration: 45,
              description: 'Debt ratios și leverage',
              keyTakeaways: [
                'Debt-to-equity, debt-to-assets',
                'Interest coverage',
                'Riscul de solvabilitate',
              ],
            },
            {
              title: 'Rate de Profitabilitate',
              type: 'VIDEO',
              duration: 45,
              description: 'ROE, ROA, marje',
              keyTakeaways: [
                'Return ratios explained',
                'DuPont analysis',
                'Drivers ai profitabilității',
              ],
            },
            {
              title: 'Rate de Eficiență',
              type: 'VIDEO',
              duration: 45,
              description: 'Turnover ratios',
              keyTakeaways: [
                'Asset turnover',
                'Receivables și inventory turnover',
                'Ciclul de conversie a cash-ului',
              ],
            },
            {
              title: 'Exercițiu: Analiza Completă cu Rate',
              type: 'EXERCISE',
              duration: 60,
              description: 'Calculează și interpretează toate ratele',
              keyTakeaways: [
                'Dashboard de rate',
                'Trending și benchmarking',
                'Recomandări de management',
              ],
              excelTemplates: ['ratio-analysis-dashboard.xlsx'],
            },
          ],
          practicalExerciseIds: ['ex-ratio-dashboard'],
        },
        {
          title: 'Modul 5: Proiect Final',
          description: 'Analiză comprehensivă a unei companii',
          duration: 240,
          lessons: [
            {
              title: 'Briefing Proiect',
              type: 'VIDEO',
              duration: 20,
              description: 'Cerințele analizei finale',
              keyTakeaways: [
                'Structura raportului',
                'Surse de date',
                'Criteriile de evaluare',
              ],
            },
            {
              title: 'Proiect: Analiză de Companie',
              type: 'EXERCISE',
              duration: 120,
              description: 'Analizează o companie reală',
              keyTakeaways: [
                'Toate componentele analizei',
                'Concluzii și recomandări',
                'Prezentare profesională',
              ],
            },
            {
              title: 'Prezentare și Certificare',
              type: 'SIMULATION',
              duration: 60,
              description: 'Prezintă analiza și primește feedback',
              keyTakeaways: [
                'Demonstrarea competențelor',
                'Feedback de la experți',
                'Certificare',
              ],
            },
          ],
          practicalExerciseIds: [],
        },
      ],
      practicalExercises: [],
      duration: {
        weeks: 5,
        hoursPerWeek: 4,
        totalHours: 20,
      },
      pricing: {
        amount: 249,
        currency: 'RON',
        corporateDiscount: 25,
      },
      certification: {
        credentialName: 'Certificate in Financial Analysis',
        ceuCredits: 2,
        validityYears: 3,
      },
      complianceFrameworks: [],
      regulatoryUpdates: false,
      hrdaEligible: true,
    };
  }

  // ===== COURSE GENERATION =====

  private mapCategoryToLMS(category: FinanceCourseTemplate['category']): CourseCategory {
    const mapping: Record<FinanceCourseTemplate['category'], CourseCategory> = {
      'BUDGETING': 'FINANCE',
      'CASH_FLOW': 'FINANCE',
      'GAAP_COMPLIANCE': 'COMPLIANCE',
      'IFRS': 'COMPLIANCE',
      'COST_ACCOUNTING': 'FINANCE',
      'FINANCIAL_ANALYSIS': 'FINANCE',
    };
    return mapping[category];
  }

  async generateCourse(template: FinanceCourseTemplate, instructorId: string): Promise<Course> {
    const courseData = {
      title: template.title,
      description: template.description,
      shortDescription: template.shortDescription,
      category: this.mapCategoryToLMS(template.category),
      level: template.level.toLowerCase() as Course['level'],
      language: 'RO',
      price: template.pricing.amount,
      currency: template.pricing.currency,
      instructorId,
      learningOutcomes: template.learningOutcomes,
      prerequisites: template.prerequisites,
      targetAudience: template.targetAudience,
      tags: [template.category, 'Finance', 'Romanian', ...template.complianceFrameworks],
      ceuCredits: template.certification.ceuCredits,
      hrdaEligible: template.hrdaEligible,
      thumbnail: `/images/courses/${template.slug}.jpg`,
      previewVideo: `/videos/courses/${template.slug}/preview.mp4`,
    };

    const course = await this.lmsService.createCourse(courseData);

    // Create modules and lessons
    for (const moduleTemplate of template.modules) {
      const module = await this.lmsService.addModule(course.id, {
        title: moduleTemplate.title,
        description: moduleTemplate.description,
      });

      // Create lessons
      let lessonIndex = 0;
      for (const lessonTemplate of moduleTemplate.lessons) {
        const lessonType = this.mapLessonType(lessonTemplate.type);
        await this.lmsService.addLesson(module.id, {
          title: lessonTemplate.title,
          description: lessonTemplate.description,
          type: lessonType,
          duration: lessonTemplate.duration,
          content: {
            textContent: JSON.stringify({
              keyTakeaways: lessonTemplate.keyTakeaways,
              regulatoryReferences: lessonTemplate.regulatoryReferences,
              excelTemplates: lessonTemplate.excelTemplates,
            }),
            videoUrl: lessonType === 'VIDEO' ? `/videos/courses/${template.slug}/${module.id}/${lessonIndex + 1}.mp4` : undefined,
          },
          isFree: lessonIndex < 2,
        });
        lessonIndex++;
      }
    }

    return course;
  }

  private mapLessonType(type: string): 'VIDEO' | 'TEXT' | 'QUIZ' | 'ASSIGNMENT' | 'LIVE_SESSION' {
    const mapping: Record<string, 'VIDEO' | 'TEXT' | 'QUIZ' | 'ASSIGNMENT' | 'LIVE_SESSION'> = {
      'VIDEO': 'VIDEO',
      'READING': 'TEXT',
      'EXERCISE': 'ASSIGNMENT',
      'CASE_STUDY': 'ASSIGNMENT',
      'SIMULATION': 'ASSIGNMENT',
      'QUIZ': 'QUIZ',
      'LIVE_WORKSHOP': 'LIVE_SESSION',
    };
    return mapping[type] || 'VIDEO';
  }

  async generateAllFinanceCourses(instructorId: string): Promise<{
    budgeting: Course;
    cashFlow: Course;
    roGaap: Course;
    ifrs: Course;
    costAccounting: Course;
    financialAnalysis: Course;
  }> {
    const [budgeting, cashFlow, roGaap, ifrs, costAccounting, financialAnalysis] = await Promise.all([
      this.generateCourse(this.getBudgetingFundamentalsTemplate(), instructorId),
      this.generateCourse(this.getCashFlowForecastingTemplate(), instructorId),
      this.generateCourse(this.getROGAAPComplianceTemplate(), instructorId),
      this.generateCourse(this.getIFRSFundamentalsTemplate(), instructorId),
      this.generateCourse(this.getCostAccountingTemplate(), instructorId),
      this.generateCourse(this.getFinancialAnalysisTemplate(), instructorId),
    ]);

    return { budgeting, cashFlow, roGaap, ifrs, costAccounting, financialAnalysis };
  }

  // ===== PRACTICAL EXERCISES =====

  private initializeDefaultExercises(): void {
    const defaultExercises: PracticalExercise[] = [
      {
        id: 'ex-dept-budget',
        title: 'Construiește Bugetul Departamental',
        type: 'EXCEL_MODEL',
        description: 'Creează un buget complet pentru un departament de 20 de persoane',
        difficulty: 'MEDIUM',
        duration: 90,
        tools: ['Excel'],
        deliverables: ['Budget model', 'Narrative explanation', 'Assumptions document'],
        rubric: [
          { criterion: 'Completitudinea', weight: 30, description: 'Toate categoriile de costuri incluse' },
          { criterion: 'Acuratețea calculelor', weight: 30, description: 'Formule corecte și verificabile' },
          { criterion: 'Realismul asumpțiilor', weight: 20, description: 'Ipoteze justificate și rezonabile' },
          { criterion: 'Prezentarea', weight: 20, description: 'Format profesional și clar' },
        ],
        sampleData: {
          datasetName: 'Department Budget Dataset',
          description: 'Date istorice pentru un departament IT',
          downloadUrl: '/data/exercises/dept-budget-data.xlsx',
        },
      },
      {
        id: 'ex-variance-analysis',
        title: 'Analiză Comprehensivă de Varianțe',
        type: 'CASE_ANALYSIS',
        description: 'Analizează varianțele unui trimestru și pregătește raportul de management',
        difficulty: 'MEDIUM',
        duration: 60,
        tools: ['Excel'],
        deliverables: ['Variance calculations', 'Root cause analysis', 'Management report'],
        rubric: [
          { criterion: 'Calculele varianțelor', weight: 40, description: 'Toate varianțele calculate corect' },
          { criterion: 'Analiza cauzelor', weight: 30, description: 'Cauze identificate și documentate' },
          { criterion: 'Recomandări', weight: 30, description: 'Acțiuni concrete și actionabile' },
        ],
        sampleData: {
          datasetName: 'Quarterly Variance Dataset',
          description: 'Budget vs actual pentru un trimestru',
          downloadUrl: '/data/exercises/variance-data.xlsx',
        },
      },
      {
        id: 'ex-saft-generation',
        title: 'Generare și Validare SAF-T D406',
        type: 'PLATFORM_INTEGRATION',
        description: 'Generează un fișier SAF-T valid din datele contabile',
        difficulty: 'HARD',
        duration: 120,
        tools: ['Accounting Software', 'ANAF Validator'],
        deliverables: ['SAF-T XML file', 'Validation report', 'Error resolution log'],
        rubric: [
          { criterion: 'Validarea cu succes', weight: 50, description: 'Fișier validat fără erori' },
          { criterion: 'Completitudinea datelor', weight: 30, description: 'Toate secțiunile completate' },
          { criterion: 'Documentația', weight: 20, description: 'Proces documentat' },
        ],
      },
    ];

    defaultExercises.forEach(ex => this.exercises.set(ex.id, ex));
  }

  async getExercises(): Promise<PracticalExercise[]> {
    return Array.from(this.exercises.values());
  }

  async getExercise(id: string): Promise<PracticalExercise | undefined> {
    return this.exercises.get(id);
  }

  async getExercisesByDifficulty(difficulty: string): Promise<PracticalExercise[]> {
    return Array.from(this.exercises.values())
      .filter(ex => ex.difficulty === difficulty);
  }

  // ===== REGULATIONS =====

  private initializeDefaultRegulations(): void {
    const defaultRegs: RegulationReference[] = [
      {
        id: 'reg-omfp-1802',
        code: 'OMFP 1802/2014',
        title: 'Reglementări contabile privind situațiile financiare anuale individuale și consolidate',
        description: 'Principalul cadru de reglementare contabilă pentru entitățile din România',
        effectiveDate: new Date('2015-01-01'),
        source: 'MF',
        url: 'https://static.anaf.ro/static/10/Anaf/legislatie/OMFP_1802_2014.pdf',
        relevantCourses: ['ro-gaap-compliance'],
      },
      {
        id: 'reg-saft-d406',
        code: 'OPANAF 1783/2021',
        title: 'Fișierul standard de control fiscal SAF-T',
        description: 'Obligația de transmitere a fișierului SAF-T D406',
        effectiveDate: new Date('2022-01-01'),
        source: 'ANAF',
        relevantCourses: ['ro-gaap-compliance'],
      },
      {
        id: 'reg-cod-fiscal',
        code: 'Legea 227/2015',
        title: 'Codul Fiscal',
        description: 'Cadrul fiscal aplicabil în România',
        effectiveDate: new Date('2016-01-01'),
        source: 'MF',
        relevantCourses: ['ro-gaap-compliance', 'budgeting-fundamentals'],
      },
    ];

    defaultRegs.forEach(reg => this.regulations.set(reg.id, reg));
  }

  async getRegulations(): Promise<RegulationReference[]> {
    return Array.from(this.regulations.values());
  }

  async getRegulation(id: string): Promise<RegulationReference | undefined> {
    return this.regulations.get(id);
  }

  async getRegulationsByCourse(courseSlug: string): Promise<RegulationReference[]> {
    return Array.from(this.regulations.values())
      .filter(reg => reg.relevantCourses.includes(courseSlug));
  }

  // ===== ACCOUNTING STANDARDS =====

  private initializeDefaultStandards(): void {
    const defaultStandards: AccountingStandard[] = [
      {
        id: 'std-rogaap-imob',
        code: 'OMFP 1802 - Secțiunea 2.5',
        name: 'Imobilizări Corporale',
        framework: 'RO_GAAP',
        category: 'Assets',
        summary: 'Recunoașterea, evaluarea și prezentarea imobilizărilor corporale',
        keyRequirements: [
          'Evaluare la cost de achiziție/producție',
          'Amortizare pe durata de viață utilă',
          'Reevaluare opțională',
        ],
        commonMistakes: [
          'Neincluderea tuturor costurilor în cost de achiziție',
          'Durate de amortizare nerealiste',
          'Nerecunoașterea deprecierii',
        ],
        practicalTips: [
          'Documentează toate componentele costului',
          'Revizuiește anual duratele de amortizare',
          'Efectuează teste de depreciere la indicii',
        ],
      },
      {
        id: 'std-ifrs16',
        code: 'IFRS 16',
        name: 'Leases',
        framework: 'IFRS',
        category: 'Leases',
        summary: 'Modelul unic de contabilizare a leasingului pentru locatari',
        keyRequirements: [
          'Recunoașterea right-of-use asset',
          'Recunoașterea lease liability',
          'Excepții pentru short-term și low-value',
        ],
        commonMistakes: [
          'Omiterea contractelor care conțin leasing',
          'Calculul incorect al rate-ului implicit',
          'Neajustarea pentru modificări de contract',
        ],
        practicalTips: [
          'Inventariază toate contractele',
          'Automatizează calculele în Excel/software',
          'Monitorizează impactul asupra KPIs',
        ],
      },
    ];

    defaultStandards.forEach(std => this.standards.set(std.id, std));
  }

  async getStandards(): Promise<AccountingStandard[]> {
    return Array.from(this.standards.values());
  }

  async getStandard(id: string): Promise<AccountingStandard | undefined> {
    return this.standards.get(id);
  }

  async getStandardsByFramework(framework: string): Promise<AccountingStandard[]> {
    return Array.from(this.standards.values())
      .filter(std => std.framework === framework);
  }

  // ===== CREDENTIALS =====

  private initializeDefaultCredentials(): void {
    const defaultCreds: FinanceCredential[] = [
      {
        id: 'fin-cred-ops-finance',
        name: 'Finance for Operations Professional',
        description: 'Competențe financiare pentru profesioniști operaționali',
        category: 'OPERATIONS_FINANCE',
        requiredCourses: ['budgeting-fundamentals', 'financial-analysis'],
        optionalCourses: ['cash-flow-forecasting', 'cost-accounting'],
        minOptionalRequired: 1,
        totalCredits: 9,
        examRequired: true,
        examDetails: {
          duration: 90,
          passingScore: 70,
          questionCount: 50,
          topics: ['Budgeting', 'Financial Analysis', 'Cost Management'],
        },
        professionalRecognition: ['HRDA eligible'],
        digitalBadgeUrl: '/badges/ops-finance-pro.png',
        validityYears: 3,
      },
      {
        id: 'fin-cred-compliance-specialist',
        name: 'Romanian Compliance Specialist',
        description: 'Specialist în conformitate RO GAAP și SAF-T',
        category: 'COMPLIANCE',
        requiredCourses: ['ro-gaap-compliance'],
        optionalCourses: ['ifrs-fundamentals'],
        minOptionalRequired: 0,
        totalCredits: 5,
        examRequired: true,
        examDetails: {
          duration: 120,
          passingScore: 75,
          questionCount: 60,
          topics: ['RO GAAP', 'SAF-T D406', 'Financial Statements'],
        },
        professionalRecognition: ['CECCAR CPD credits', 'HRDA eligible'],
        digitalBadgeUrl: '/badges/compliance-specialist.png',
        validityYears: 2,
      },
      {
        id: 'fin-cred-complete',
        name: 'Finance Operations Master',
        description: 'Program complet de competențe financiare pentru operații',
        category: 'COMPREHENSIVE',
        requiredCourses: ['budgeting-fundamentals', 'cash-flow-forecasting', 'financial-analysis', 'cost-accounting'],
        optionalCourses: ['ro-gaap-compliance', 'ifrs-fundamentals'],
        minOptionalRequired: 1,
        totalCredits: 18,
        examRequired: true,
        examDetails: {
          duration: 180,
          passingScore: 70,
          questionCount: 80,
          topics: ['Budgeting', 'Cash Flow', 'Cost Accounting', 'Financial Analysis', 'Compliance'],
        },
        professionalRecognition: ['CECCAR CPD credits', 'HRDA eligible'],
        digitalBadgeUrl: '/badges/finance-master.png',
        validityYears: 3,
      },
    ];

    defaultCreds.forEach(cred => this.credentials.set(cred.id, cred));
  }

  async getCredentials(): Promise<FinanceCredential[]> {
    return Array.from(this.credentials.values());
  }

  async getCredential(id: string): Promise<FinanceCredential | undefined> {
    return this.credentials.get(id);
  }

  async checkCredentialEligibility(userId: string, credentialId: string): Promise<{
    eligible: boolean;
    completedRequired: string[];
    missingRequired: string[];
    completedOptional: string[];
    optionalNeeded: number;
    examNeeded: boolean;
  }> {
    const credential = this.credentials.get(credentialId);
    if (!credential) {
      throw new Error('Credential not found');
    }

    const userEnrollments = await this.lmsService.getUserEnrollments(userId);
    const completedSlugs = userEnrollments
      .filter(e => e.status === 'COMPLETED')
      .map(e => e.courseId);

    const completedRequired = credential.requiredCourses.filter(c => completedSlugs.includes(c));
    const missingRequired = credential.requiredCourses.filter(c => !completedSlugs.includes(c));
    const completedOptional = credential.optionalCourses.filter(c => completedSlugs.includes(c));
    const optionalNeeded = Math.max(0, credential.minOptionalRequired - completedOptional.length);

    const progress = this.userProgress.get(`${userId}-${credentialId}`);
    const examNeeded = credential.examRequired &&
      (!progress || progress.examStatus !== 'PASSED');

    const eligible = missingRequired.length === 0 &&
      optionalNeeded === 0 &&
      !examNeeded;

    return {
      eligible,
      completedRequired,
      missingRequired,
      completedOptional,
      optionalNeeded,
      examNeeded,
    };
  }

  async awardCredential(userId: string, credentialId: string): Promise<UserFinanceProgress> {
    const key = `${userId}-${credentialId}`;
    let progress = this.userProgress.get(key);

    if (!progress) {
      progress = {
        id: `progress-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        credentialId,
        completedCourses: [],
        exercisesCompleted: [],
      };
    }

    progress.earnedAt = new Date();
    progress.verificationCode = `FIN-${credentialId.toUpperCase().slice(0, 4)}-${Date.now().toString(36).toUpperCase()}`;
    progress.certificateUrl = `/certificates/finance/${progress.verificationCode}.pdf`;

    this.userProgress.set(key, progress);
    return progress;
  }

  async getUserCredentials(userId: string): Promise<UserFinanceProgress[]> {
    return Array.from(this.userProgress.values())
      .filter(p => p.userId === userId && p.earnedAt);
  }

  async verifyCredential(verificationCode: string): Promise<UserFinanceProgress | null> {
    const progress = Array.from(this.userProgress.values())
      .find(p => p.verificationCode === verificationCode);
    return progress || null;
  }

  // ===== CORPORATE PACKAGES =====

  getCorporateTrainingPackages(): {
    packageId: string;
    name: string;
    description: string;
    courses: string[];
    participants: { min: number; max: number };
    pricePerPerson: number;
    features: string[];
  }[] {
    return [
      {
        packageId: 'corp-finance-fundamentals',
        name: 'Finance Fundamentals for Teams',
        description: 'Program de bază pentru echipe operaționale',
        courses: ['budgeting-fundamentals', 'financial-analysis'],
        participants: { min: 10, max: 30 },
        pricePerPerson: 449,
        features: [
          'Cohortă dedicată companiei',
          'Customizare exerciții pe date reale',
          'Workshop practic la sediul companiei (opțional)',
          'Raport de progres pentru HR',
          'Certificare brandată',
        ],
      },
      {
        packageId: 'corp-compliance-program',
        name: 'RO GAAP & SAF-T Compliance Program',
        description: 'Conformitate pentru echipa de contabilitate',
        courses: ['ro-gaap-compliance'],
        participants: { min: 5, max: 20 },
        pricePerPerson: 549,
        features: [
          'Training specializat pe industria companiei',
          'Support implementare SAF-T',
          'Q&A cu experți fiscali',
          'Actualizări legislative incluse 12 luni',
          'Credite CECCAR pentru participanți',
        ],
      },
      {
        packageId: 'corp-finance-transformation',
        name: 'Finance Transformation Program',
        description: 'Program comprehensiv pentru departamentul financiar',
        courses: ['ro-gaap-compliance', 'ifrs-fundamentals', 'cost-accounting', 'cash-flow-forecasting'],
        participants: { min: 8, max: 15 },
        pricePerPerson: 1499,
        features: [
          'Assessment inițial al competențelor',
          'Plan de dezvoltare personalizat',
          'Mentorship individual 4 sesiuni',
          'Proiecte aplicate pe procese reale',
          'Prezentare finală către CFO',
          'Alumni network access',
        ],
      },
    ];
  }

  // ===== LEARNING PATHS =====

  getLearningPaths(): {
    pathId: string;
    name: string;
    description: string;
    courses: string[];
    duration: string;
    targetRole: string;
    credential: string;
  }[] {
    return [
      {
        pathId: 'path-ops-manager',
        name: 'Finance for Operations Managers',
        description: 'De la analfabet financiar la business partner',
        courses: ['financial-analysis', 'budgeting-fundamentals', 'cash-flow-forecasting'],
        duration: '16 săptămâni',
        targetRole: 'Operations Manager, Department Head',
        credential: 'fin-cred-ops-finance',
      },
      {
        pathId: 'path-accountant-advanced',
        name: 'Advanced Accountant Track',
        description: 'Dezvoltare profesională pentru contabili cu experiență',
        courses: ['ro-gaap-compliance', 'ifrs-fundamentals', 'cost-accounting'],
        duration: '21 săptămâni',
        targetRole: 'Senior Accountant, Chief Accountant',
        credential: 'fin-cred-compliance-specialist',
      },
      {
        pathId: 'path-finance-complete',
        name: 'Complete Finance Operations',
        description: 'Programul complet pentru excelență în finance operations',
        courses: ['financial-analysis', 'budgeting-fundamentals', 'cash-flow-forecasting', 'cost-accounting', 'ro-gaap-compliance'],
        duration: '30 săptămâni',
        targetRole: 'Controller, Finance Manager, CFO',
        credential: 'fin-cred-complete',
      },
    ];
  }

  // ===== TEST HELPERS =====

  resetState(): void {
    this.exercises.clear();
    this.regulations.clear();
    this.standards.clear();
    this.credentials.clear();
    this.userProgress.clear();
    this.initializeDefaultExercises();
    this.initializeDefaultRegulations();
    this.initializeDefaultStandards();
    this.initializeDefaultCredentials();
  }
}
