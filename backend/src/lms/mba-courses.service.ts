import { Injectable } from '@nestjs/common';
import { LMSService, Course, CourseCategory } from './lms.service';

// MBA Strategy & Leadership Micro-Credentials Service
// Business strategy, leadership, finance fundamentals, operations management
// Case study library, peer discussion forums, executive education format

export interface MBACourseTemplate {
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  category: 'STRATEGY' | 'LEADERSHIP' | 'FINANCE' | 'OPERATIONS' | 'MARKETING' | 'INNOVATION';
  level: 'FOUNDATIONAL' | 'INTERMEDIATE' | 'ADVANCED' | 'EXECUTIVE';
  targetAudience: string[];
  prerequisites: string[];
  learningOutcomes: string[];
  modules: MBAModuleTemplate[];
  caseStudies: CaseStudy[];
  peerActivities: PeerActivity[];
  duration: {
    weeks: number;
    hoursPerWeek: number;
    totalHours: number;
  };
  pricing: {
    amount: number;
    currency: string;
    corporateDiscount: number;
    earlyBirdDiscount: number;
  };
  certification: {
    credentialName: string;
    credentialType: 'MICRO_CREDENTIAL' | 'PROFESSIONAL_CERTIFICATE' | 'EXECUTIVE_CERTIFICATE';
    ceuCredits: number;
    validityYears: number;
    digitalBadge: boolean;
  };
  cohortBased: boolean;
  mentorshipIncluded: boolean;
  networkingEvents: boolean;
  hrdaEligible: boolean;
}

export interface MBAModuleTemplate {
  title: string;
  description: string;
  duration: number;
  lessons: MBALessonTemplate[];
  caseStudyIds: string[];
  discussionTopics: string[];
  executiveSummary: string;
  keyFrameworks: string[];
}

export interface MBALessonTemplate {
  title: string;
  type: 'VIDEO' | 'READING' | 'CASE_ANALYSIS' | 'SIMULATION' | 'PEER_DISCUSSION' | 'EXPERT_INTERVIEW' | 'WORKSHOP' | 'ROLE_PLAY';
  duration: number;
  description: string;
  keyTakeaways: string[];
  resources: { type: string; title: string; url?: string }[];
}

export interface CaseStudy {
  id: string;
  title: string;
  company: string;
  industry: string;
  country: string;
  yearPublished: number;
  difficulty: 'INTRODUCTORY' | 'INTERMEDIATE' | 'ADVANCED';
  type: 'DECISION' | 'DESCRIPTIVE' | 'PROBLEM_SOLVING' | 'EVALUATIVE';
  synopsis: string;
  learningObjectives: string[];
  discussionQuestions: string[];
  teachingNotes: string;
  duration: number;
  pages: number;
  tags: string[];
}

export interface PeerActivity {
  id: string;
  title: string;
  type: 'DISCUSSION' | 'GROUP_PROJECT' | 'PEER_REVIEW' | 'DEBATE' | 'ROLE_PLAY' | 'BRAINSTORM';
  description: string;
  groupSize: { min: number; max: number };
  duration: number;
  deliverables: string[];
  rubric: { criterion: string; weight: number; description: string }[];
}

export interface DiscussionForum {
  id: string;
  courseId: string;
  moduleId?: string;
  title: string;
  description: string;
  type: 'GENERAL' | 'CASE_DISCUSSION' | 'PEER_LEARNING' | 'Q_AND_A' | 'NETWORKING';
  isModerated: boolean;
  posts: ForumPost[];
  createdAt: Date;
}

export interface ForumPost {
  id: string;
  forumId: string;
  authorId: string;
  authorName: string;
  title?: string;
  content: string;
  parentId?: string;
  likes: number;
  replies: ForumPost[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MBAMicroCredential {
  id: string;
  name: string;
  description: string;
  category: string;
  requiredCourses: string[];
  optionalCourses: string[];
  minOptionalRequired: number;
  totalCredits: number;
  capstoneRequired: boolean;
  capstoneDescription?: string;
  digitalBadgeUrl: string;
  linkedInShareable: boolean;
  validityYears: number;
}

export interface UserMBAProgress {
  id: string;
  userId: string;
  credentialId: string;
  completedCourses: string[];
  capstoneStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REVISION_NEEDED';
  capstoneSubmission?: {
    submittedAt: Date;
    documentUrl: string;
    feedbackUrl?: string;
  };
  earnedAt?: Date;
  certificateUrl?: string;
  verificationCode?: string;
}

export interface ExecutiveCoach {
  id: string;
  name: string;
  title: string;
  company: string;
  bio: string;
  expertise: string[];
  languages: string[];
  hourlyRate: number;
  availability: { dayOfWeek: number; startHour: number; endHour: number }[];
  rating: number;
  sessionsCompleted: number;
}

export interface CoachingSession {
  id: string;
  coachId: string;
  userId: string;
  courseId?: string;
  scheduledAt: Date;
  duration: number;
  type: 'ONE_ON_ONE' | 'GROUP' | 'CAREER' | 'CAPSTONE_REVIEW';
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  notes?: string;
  recordingUrl?: string;
  feedback?: {
    rating: number;
    comment: string;
  };
}

@Injectable()
export class MBACoursesService {
  private caseStudies = new Map<string, CaseStudy>();
  private forums = new Map<string, DiscussionForum>();
  private posts = new Map<string, ForumPost>();
  private mbaCredentials = new Map<string, MBAMicroCredential>();
  private userProgress = new Map<string, UserMBAProgress>();
  private coaches = new Map<string, ExecutiveCoach>();
  private sessions = new Map<string, CoachingSession>();

  constructor(private readonly lmsService: LMSService) {
    this.initializeDefaultCaseStudies();
    this.initializeDefaultCredentials();
    this.initializeDefaultCoaches();
  }

  // ===== COURSE TEMPLATES =====

  getStrategyFundamentalsTemplate(): MBACourseTemplate {
    return {
      title: 'Fundamentele Strategiei de Afaceri',
      slug: 'strategy-fundamentals',
      description: `Curs cuprinzător de strategie de afaceri care acoperă analiza competitivă,
        formularea strategiei, execuția și managementul schimbării. Bazat pe framework-uri
        consacrate de la Harvard Business School și INSEAD, cu aplicații practice pentru
        piața românească și europeană.`,
      shortDescription: 'Master strategie de afaceri cu framework-uri dovedite și studii de caz reale',
      category: 'STRATEGY',
      level: 'INTERMEDIATE',
      targetAudience: [
        'Manageri de nivel mediu care aspiră la roluri executive',
        'Antreprenori care doresc să scaleze afacerea',
        'Consultanți în strategie și management',
        'Lideri de departament responsabili de planificare strategică',
      ],
      prerequisites: [
        'Minimum 3 ani experiență în management sau business',
        'Cunoștințe de bază în finanțe și operațiuni',
        'Abilitatea de a analiza date și de a lua decizii',
      ],
      learningOutcomes: [
        'Efectuați analize competitive complete folosind Porter\'s Five Forces',
        'Dezvoltați strategii diferențiate pentru avantaj competitiv sustenabil',
        'Creați Business Model Canvas și Value Proposition Canvas',
        'Implementați Balanced Scorecard pentru execuție strategică',
        'Gestionați schimbarea organizațională în timpul transformărilor strategice',
        'Analizați și prezentați studii de caz în format executiv',
      ],
      modules: [
        {
          title: 'Modul 1: Fundamente Strategice',
          description: 'Introducere în gândirea strategică și framework-urile fundamentale',
          duration: 480,
          executiveSummary: 'Bazele strategiei: de la viziune la execuție',
          keyFrameworks: ['Porter\'s Five Forces', 'SWOT Analysis', 'PESTEL'],
          lessons: [
            {
              title: 'Ce este Strategia? Definiții și Perspective',
              type: 'VIDEO',
              duration: 45,
              description: 'Explorarea diferitelor școli de gândire strategică',
              keyTakeaways: [
                'Diferența între strategie și tactică',
                'Cele 5 Ps ale strategiei (Mintzberg)',
                'Strategia emergentă vs planificată',
              ],
              resources: [
                { type: 'PDF', title: 'What is Strategy? - Michael Porter' },
                { type: 'ARTICLE', title: 'Strategy Safari - Rezumat executiv' },
              ],
            },
            {
              title: 'Analiza Mediului Competitiv',
              type: 'VIDEO',
              duration: 60,
              description: 'Porter\'s Five Forces în detaliu cu exemple românești',
              keyTakeaways: [
                'Aplicarea Five Forces pe industrii locale',
                'Identificarea forțelor dominante',
                'Strategii de poziționare competitivă',
              ],
              resources: [
                { type: 'TEMPLATE', title: 'Five Forces Analysis Worksheet' },
                { type: 'CASE', title: 'Analiza Five Forces - Retail România' },
              ],
            },
            {
              title: 'Analiza SWOT și PESTEL',
              type: 'WORKSHOP',
              duration: 90,
              description: 'Workshop practic de analiză strategică',
              keyTakeaways: [
                'Diferența între analiză internă și externă',
                'Cum să prioritizezi factorii SWOT',
                'Integrarea PESTEL în planificare',
              ],
              resources: [
                { type: 'TEMPLATE', title: 'SWOT-PESTEL Integration Matrix' },
                { type: 'EXERCISE', title: 'Analizează-ți propria companie' },
              ],
            },
            {
              title: 'Studiu de Caz: Transformarea eMAG',
              type: 'CASE_ANALYSIS',
              duration: 120,
              description: 'Analiza strategiei eMAG în contextul retail-ului românesc',
              keyTakeaways: [
                'Expansiunea regională și diversificarea',
                'Competiția cu Amazon și alți jucători',
                'Strategia marketplace vs retail propriu',
              ],
              resources: [
                { type: 'CASE', title: 'eMAG: From Local Champion to Regional Leader' },
              ],
            },
          ],
          caseStudyIds: ['cs-emag-transformation'],
          discussionTopics: [
            'Care sunt cele mai puternice forțe competitive în industria ta?',
            'Cum poate o companie românească să concureze global?',
          ],
        },
        {
          title: 'Modul 2: Avantaj Competitiv și Diferențiere',
          description: 'Crearea și susținerea avantajului competitiv',
          duration: 480,
          executiveSummary: 'Cum să te diferențiezi într-o piață aglomerată',
          keyFrameworks: ['Generic Strategies', 'Value Chain', 'Blue Ocean Strategy'],
          lessons: [
            {
              title: 'Strategii Generice Porter',
              type: 'VIDEO',
              duration: 45,
              description: 'Cost leadership, diferențiere și focus',
              keyTakeaways: [
                'Alegerea poziționării strategice',
                'Evitarea capcanei "stuck in the middle"',
                'Exemple de succes din România',
              ],
              resources: [
                { type: 'PDF', title: 'Competitive Advantage - Porter Summary' },
              ],
            },
            {
              title: 'Analiza Lanțului de Valoare',
              type: 'VIDEO',
              duration: 60,
              description: 'Identificarea surselor de avantaj competitiv',
              keyTakeaways: [
                'Activități primare vs suport',
                'Identificarea activităților critice',
                'Externalizare strategică',
              ],
              resources: [
                { type: 'TEMPLATE', title: 'Value Chain Analysis Template' },
              ],
            },
            {
              title: 'Strategia Oceanului Albastru',
              type: 'VIDEO',
              duration: 60,
              description: 'Crearea de piețe noi în loc de competiție directă',
              keyTakeaways: [
                'Canvas-ul strategiei',
                'Cele 4 acțiuni: Eliminate, Reduce, Raise, Create',
                'Exemple de oceane albastre în România',
              ],
              resources: [
                { type: 'PDF', title: 'Blue Ocean Strategy Summary' },
                { type: 'TEMPLATE', title: 'Strategy Canvas Template' },
              ],
            },
            {
              title: 'Workshop: Definește-ți Avantajul Competitiv',
              type: 'WORKSHOP',
              duration: 120,
              description: 'Exercițiu practic de definire a strategiei',
              keyTakeaways: [
                'Identificarea competențelor distinctive',
                'Testarea sustenabilității avantajului',
                'Plan de acțiune pentru consolidare',
              ],
              resources: [
                { type: 'WORKBOOK', title: 'Competitive Advantage Workbook' },
              ],
            },
          ],
          caseStudyIds: ['cs-dedeman-growth'],
          discussionTopics: [
            'Care este avantajul competitiv al companiei tale?',
            'Cum ar arăta un ocean albastru în industria ta?',
          ],
        },
        {
          title: 'Modul 3: Business Model Innovation',
          description: 'Design și inovare în modele de afaceri',
          duration: 420,
          executiveSummary: 'De la Business Model Canvas la modele disruptive',
          keyFrameworks: ['Business Model Canvas', 'Value Proposition Canvas', 'Lean Startup'],
          lessons: [
            {
              title: 'Business Model Canvas',
              type: 'VIDEO',
              duration: 60,
              description: 'Cele 9 blocuri ale unui model de afaceri',
              keyTakeaways: [
                'Customer Segments și Value Propositions',
                'Channels și Customer Relationships',
                'Revenue Streams și Cost Structure',
              ],
              resources: [
                { type: 'TEMPLATE', title: 'Business Model Canvas Template' },
                { type: 'EXAMPLE', title: 'BMC Examples - Tech Startups' },
              ],
            },
            {
              title: 'Value Proposition Design',
              type: 'VIDEO',
              duration: 60,
              description: 'Crearea de propuneri de valoare irezistibile',
              keyTakeaways: [
                'Customer Jobs, Pains, Gains',
                'Fit între produs și piață',
                'Testarea propunerilor de valoare',
              ],
              resources: [
                { type: 'TEMPLATE', title: 'Value Proposition Canvas' },
              ],
            },
            {
              title: 'Modele de Afaceri Disruptive',
              type: 'VIDEO',
              duration: 45,
              description: 'Platform business models și economia subscripțiilor',
              keyTakeaways: [
                'De la produse la platforme',
                'Efecte de rețea și scalabilitate',
                'Modele de revenue recurent',
              ],
              resources: [
                { type: 'PDF', title: 'Platform Revolution Summary' },
              ],
            },
            {
              title: 'Studiu de Caz: UiPath - De la Startup la Unicorn',
              type: 'CASE_ANALYSIS',
              duration: 90,
              description: 'Analiza modelului de afaceri UiPath',
              keyTakeaways: [
                'Pivotările strategice ale UiPath',
                'Modelul freemium și community-driven growth',
                'Scalarea globală din România',
              ],
              resources: [
                { type: 'CASE', title: 'UiPath: The Romanian Unicorn Story' },
              ],
            },
          ],
          caseStudyIds: ['cs-uipath-unicorn'],
          discussionTopics: [
            'Ce element al modelului de afaceri ar trebui schimbat în compania ta?',
            'Cum poți crea efecte de rețea?',
          ],
        },
        {
          title: 'Modul 4: Execuție Strategică',
          description: 'Transformarea strategiei în rezultate',
          duration: 480,
          executiveSummary: 'De la strategie pe hârtie la execuție în practică',
          keyFrameworks: ['Balanced Scorecard', 'OKRs', 'Strategy Maps'],
          lessons: [
            {
              title: 'Balanced Scorecard',
              type: 'VIDEO',
              duration: 60,
              description: 'Cele 4 perspective ale performanței strategice',
              keyTakeaways: [
                'Financial, Customer, Process, Learning perspectives',
                'Legăturile cauzale între perspective',
                'KPIs și targets strategice',
              ],
              resources: [
                { type: 'TEMPLATE', title: 'Balanced Scorecard Template' },
                { type: 'PDF', title: 'Strategy Maps - Kaplan & Norton' },
              ],
            },
            {
              title: 'OKRs - Objectives and Key Results',
              type: 'VIDEO',
              duration: 45,
              description: 'Sistemul de goal-setting folosit de Google',
              keyTakeaways: [
                'Diferența între OKRs și KPIs',
                'Setarea obiectivelor ambițioase',
                'Cadența de review și ajustare',
              ],
              resources: [
                { type: 'TEMPLATE', title: 'OKR Planning Template' },
                { type: 'EXAMPLE', title: 'OKR Examples by Department' },
              ],
            },
            {
              title: 'Alinierea Organizațională',
              type: 'VIDEO',
              duration: 60,
              description: 'Cascadarea strategiei în organizație',
              keyTakeaways: [
                'De la viziune la obiective departamentale',
                'Alinierea incentivelor cu strategia',
                'Comunicarea strategiei la toate nivelurile',
              ],
              resources: [
                { type: 'PDF', title: 'Strategic Alignment Guide' },
              ],
            },
            {
              title: 'Workshop: Construiește BSC pentru Compania Ta',
              type: 'WORKSHOP',
              duration: 120,
              description: 'Exercițiu practic de creare Balanced Scorecard',
              keyTakeaways: [
                'Selectarea metricilor relevante',
                'Stabilirea target-urilor realiste',
                'Planul de implementare',
              ],
              resources: [
                { type: 'WORKBOOK', title: 'BSC Implementation Workbook' },
              ],
            },
          ],
          caseStudyIds: ['cs-execution-failures'],
          discussionTopics: [
            'De ce eșuează execuția strategică în majoritatea companiilor?',
            'Cum măsori succesul strategic în compania ta?',
          ],
        },
        {
          title: 'Modul 5: Strategie Digitală și Transformare',
          description: 'Strategia în era digitală',
          duration: 420,
          executiveSummary: 'Navigarea transformării digitale strategice',
          keyFrameworks: ['Digital Transformation Framework', 'Platform Strategy', 'Ecosystem Strategy'],
          lessons: [
            {
              title: 'Fundamentele Strategiei Digitale',
              type: 'VIDEO',
              duration: 60,
              description: 'Ce înseamnă digital-first strategy',
              keyTakeaways: [
                'Digital ca enabler vs digital ca strategie',
                'Competențe digitale necesare',
                'Roadmap de transformare digitală',
              ],
              resources: [
                { type: 'PDF', title: 'Digital Transformation Playbook' },
              ],
            },
            {
              title: 'Data-Driven Strategy',
              type: 'VIDEO',
              duration: 60,
              description: 'Utilizarea datelor în deciziile strategice',
              keyTakeaways: [
                'De la intuiție la decizii bazate pe date',
                'Analytics pentru strategie',
                'Privacy și etică în utilizarea datelor',
              ],
              resources: [
                { type: 'ARTICLE', title: 'Competing on Analytics' },
              ],
            },
            {
              title: 'AI și Automatizare în Strategie',
              type: 'EXPERT_INTERVIEW',
              duration: 45,
              description: 'Interviu cu expert în AI și strategie de business',
              keyTakeaways: [
                'Impactul AI asupra industriilor',
                'Oportunități și riscuri strategice',
                'Pregătirea organizației pentru AI',
              ],
              resources: [
                { type: 'VIDEO', title: 'AI Strategy Expert Interview' },
              ],
            },
            {
              title: 'Studiu de Caz: Banca Transilvania - Digital Banking',
              type: 'CASE_ANALYSIS',
              duration: 90,
              description: 'Transformarea digitală în banking românesc',
              keyTakeaways: [
                'Strategia mobile-first',
                'Competiția cu fintech-urile',
                'Integrarea neo și BT Pay',
              ],
              resources: [
                { type: 'CASE', title: 'BT Digital Transformation Journey' },
              ],
            },
          ],
          caseStudyIds: ['cs-bt-digital'],
          discussionTopics: [
            'Cât de avansată este transformarea digitală în industria ta?',
            'Ce tehnologii vor disrupta industria ta în următorii 5 ani?',
          ],
        },
        {
          title: 'Modul 6: Proiect Final - Plan Strategic',
          description: 'Aplicarea cunoștințelor într-un proiect comprehensiv',
          duration: 600,
          executiveSummary: 'Capstone project: Dezvoltarea unui plan strategic complet',
          keyFrameworks: ['All frameworks integrated'],
          lessons: [
            {
              title: 'Briefing Proiect Final',
              type: 'VIDEO',
              duration: 30,
              description: 'Cerințele și structura planului strategic',
              keyTakeaways: [
                'Structura documentului strategic',
                'Criteriile de evaluare',
                'Timeline și milestones',
              ],
              resources: [
                { type: 'TEMPLATE', title: 'Strategic Plan Template' },
                { type: 'RUBRIC', title: 'Evaluation Criteria' },
              ],
            },
            {
              title: 'Sesiune de Coaching 1: Analiza și Diagnostic',
              type: 'WORKSHOP',
              duration: 90,
              description: 'Feedback pe analiza situației curente',
              keyTakeaways: [
                'Validarea analizei competitive',
                'Feedback pe SWOT și insights',
                'Îmbunătățiri sugerate',
              ],
              resources: [],
            },
            {
              title: 'Sesiune de Coaching 2: Strategie și Execuție',
              type: 'WORKSHOP',
              duration: 90,
              description: 'Feedback pe formularea strategiei',
              keyTakeaways: [
                'Validarea alegerilor strategice',
                'Feedback pe planul de execuție',
                'Refinements finale',
              ],
              resources: [],
            },
            {
              title: 'Prezentarea Finală',
              type: 'SIMULATION',
              duration: 120,
              description: 'Prezentare în fața unui panel de experți',
              keyTakeaways: [
                'Prezentarea executivă a planului',
                'Răspunsuri la întrebări dificile',
                'Feedback final și certificare',
              ],
              resources: [
                { type: 'TEMPLATE', title: 'Executive Presentation Template' },
              ],
            },
          ],
          caseStudyIds: [],
          discussionTopics: [
            'Ce ai învățat din procesul de planificare strategică?',
            'Cum vei aplica aceste cunoștințe în rolul tău?',
          ],
        },
      ],
      caseStudies: [],
      peerActivities: [
        {
          id: 'pa-strategy-debate',
          title: 'Dezbatere Strategică',
          type: 'DEBATE',
          description: 'Dezbatere pe tema: Cost leadership vs Diferențiere',
          groupSize: { min: 4, max: 8 },
          duration: 90,
          deliverables: ['Argument structurat', 'Counter-arguments', 'Concluzie'],
          rubric: [
            { criterion: 'Claritatea argumentului', weight: 30, description: 'Argumente logice și structurate' },
            { criterion: 'Utilizarea evidențelor', weight: 30, description: 'Exemple și date relevante' },
            { criterion: 'Răspuns la contra-argumente', weight: 20, description: 'Abilitatea de a răspunde la obiecții' },
            { criterion: 'Prezentare', weight: 20, description: 'Comunicare clară și profesională' },
          ],
        },
      ],
      duration: {
        weeks: 8,
        hoursPerWeek: 6,
        totalHours: 48,
      },
      pricing: {
        amount: 499,
        currency: 'RON',
        corporateDiscount: 20,
        earlyBirdDiscount: 15,
      },
      certification: {
        credentialName: 'Certificate in Business Strategy',
        credentialType: 'PROFESSIONAL_CERTIFICATE',
        ceuCredits: 5,
        validityYears: 3,
        digitalBadge: true,
      },
      cohortBased: true,
      mentorshipIncluded: true,
      networkingEvents: true,
      hrdaEligible: true,
    };
  }

  getLeadershipManagementTemplate(): MBACourseTemplate {
    return {
      title: 'Leadership și Management Eficient',
      slug: 'leadership-management',
      description: `Program comprehensiv de dezvoltare a competențelor de leadership și
        management. Acoperă stiluri de leadership, managementul echipelor, comunicare
        executivă, și dezvoltarea personală. Include coaching individual și proiecte practice.`,
      shortDescription: 'Dezvoltă-ți abilitățile de lider și manager prin practică și feedback',
      category: 'LEADERSHIP',
      level: 'INTERMEDIATE',
      targetAudience: [
        'Manageri noi sau proaspăt promovați',
        'Lideri de echipă care doresc să-și îmbunătățească stilul',
        'Specialiști care aspiră la roluri de management',
        'Antreprenori care construiesc echipe',
      ],
      prerequisites: [
        'Experiență de lucru în echipă',
        'Dorința de auto-dezvoltare',
        'Deschidere pentru feedback',
      ],
      learningOutcomes: [
        'Identifică și dezvoltă stilul personal de leadership',
        'Construiește și motivează echipe performante',
        'Comunică eficient în situații dificile',
        'Gestionează conflicte și rezistența la schimbare',
        'Oferă feedback constructiv și dezvoltă talente',
        'Ia decizii etice în situații complexe',
      ],
      modules: [
        {
          title: 'Modul 1: Fundamente de Leadership',
          description: 'Teoria și practica leadership-ului modern',
          duration: 420,
          executiveSummary: 'De la manager la lider: transformarea mindset-ului',
          keyFrameworks: ['Situational Leadership', 'Transformational Leadership', 'Servant Leadership'],
          lessons: [
            {
              title: 'Leadership vs Management',
              type: 'VIDEO',
              duration: 45,
              description: 'Diferențele fundamentale și complementaritatea',
              keyTakeaways: [
                'Când să conduci vs când să gestionezi',
                'Echilibrul între viziune și execuție',
                'Dezvoltarea ambelor competențe',
              ],
              resources: [
                { type: 'PDF', title: 'What Leaders Really Do - Kotter' },
              ],
            },
            {
              title: 'Stiluri de Leadership',
              type: 'VIDEO',
              duration: 60,
              description: 'Situational Leadership și adaptarea stilului',
              keyTakeaways: [
                'Cele 4 stiluri: Directing, Coaching, Supporting, Delegating',
                'Evaluarea maturității echipei',
                'Flexibilitatea în leadership',
              ],
              resources: [
                { type: 'ASSESSMENT', title: 'Leadership Style Assessment' },
              ],
            },
            {
              title: 'Assessment: Profilul Tău de Lider',
              type: 'SIMULATION',
              duration: 60,
              description: 'Evaluare 360° și plan de dezvoltare',
              keyTakeaways: [
                'Puncte forte și zone de îmbunătățire',
                'Percepția altora vs autopercepție',
                'Plan de acțiune personalizat',
              ],
              resources: [
                { type: 'ASSESSMENT', title: '360 Leadership Assessment' },
                { type: 'TEMPLATE', title: 'Personal Development Plan' },
              ],
            },
            {
              title: 'Servant Leadership în Practică',
              type: 'EXPERT_INTERVIEW',
              duration: 45,
              description: 'Interviu cu CEO care practică servant leadership',
              keyTakeaways: [
                'Principiile servant leadership',
                'Aplicarea în cultura românească',
                'Rezultate și provocări',
              ],
              resources: [
                { type: 'VIDEO', title: 'Servant Leadership Interview' },
              ],
            },
          ],
          caseStudyIds: ['cs-leadership-transformation'],
          discussionTopics: [
            'Care este stilul tău dominant de leadership?',
            'Cum îți adaptezi stilul la diferite situații?',
          ],
        },
        {
          title: 'Modul 2: Construirea Echipelor Performante',
          description: 'De la grup la echipă de înaltă performanță',
          duration: 480,
          executiveSummary: 'Secretele echipelor care performează excepțional',
          keyFrameworks: ['Tuckman Model', 'Five Dysfunctions of a Team', 'Psychological Safety'],
          lessons: [
            {
              title: 'Etapele Dezvoltării Echipei',
              type: 'VIDEO',
              duration: 45,
              description: 'Modelul Tuckman: Forming, Storming, Norming, Performing',
              keyTakeaways: [
                'Recunoașterea etapei echipei',
                'Intervenții specifice fiecărei etape',
                'Accelerarea maturizării',
              ],
              resources: [
                { type: 'PDF', title: 'Team Development Model' },
              ],
            },
            {
              title: 'Cele 5 Disfuncții ale Echipei',
              type: 'VIDEO',
              duration: 60,
              description: 'Modelul Lencioni și cum să eviți capcanele',
              keyTakeaways: [
                'Absența încrederii și frica de conflict',
                'Lipsa angajamentului și evitarea responsabilității',
                'Neatenția la rezultate',
              ],
              resources: [
                { type: 'ASSESSMENT', title: 'Team Dysfunctions Assessment' },
              ],
            },
            {
              title: 'Siguranța Psihologică',
              type: 'VIDEO',
              duration: 60,
              description: 'Cercetările Google despre echipele eficiente',
              keyTakeaways: [
                'Ce este siguranța psihologică',
                'Cum o creezi ca lider',
                'Impactul asupra inovației și performanței',
              ],
              resources: [
                { type: 'ARTICLE', title: 'Project Aristotle Findings' },
              ],
            },
            {
              title: 'Workshop: Team Building Exercise',
              type: 'SIMULATION',
              duration: 120,
              description: 'Simulare de construire a echipei în situație de criză',
              keyTakeaways: [
                'Aplicarea teoriei în practică',
                'Observarea dinamicilor de grup',
                'Feedback și lecții învățate',
              ],
              resources: [
                { type: 'SIMULATION', title: 'Crisis Team Building Simulation' },
              ],
            },
          ],
          caseStudyIds: ['cs-team-turnaround'],
          discussionTopics: [
            'Care disfuncție este cea mai prezentă în echipa ta?',
            'Cum ai creat siguranță psihologică?',
          ],
        },
        {
          title: 'Modul 3: Comunicare Executivă',
          description: 'Comunicarea ca instrument de leadership',
          duration: 420,
          executiveSummary: 'Mesaje care inspiră, informează și mobilizează',
          keyFrameworks: ['Pyramid Principle', 'Storytelling', 'Difficult Conversations'],
          lessons: [
            {
              title: 'Principiul Piramidei în Comunicare',
              type: 'VIDEO',
              duration: 45,
              description: 'Structurarea mesajelor pentru impact maxim',
              keyTakeaways: [
                'Start with the answer',
                'Gruparea și logica argumentelor',
                'Adaptarea la audiență',
              ],
              resources: [
                { type: 'PDF', title: 'Pyramid Principle Summary' },
              ],
            },
            {
              title: 'Storytelling pentru Lideri',
              type: 'VIDEO',
              duration: 60,
              description: 'Utilizarea narațiunii pentru influență',
              keyTakeaways: [
                'Structura unei povești eficiente',
                'Tipuri de povești de leadership',
                'Autenticitate în storytelling',
              ],
              resources: [
                { type: 'TEMPLATE', title: 'Leadership Story Templates' },
              ],
            },
            {
              title: 'Conversații Dificile',
              type: 'ROLE_PLAY',
              duration: 90,
              description: 'Practică în gestionarea discuțiilor sensibile',
              keyTakeaways: [
                'Pregătirea pentru conversații dificile',
                'Tehnici de de-escaladare',
                'Menținerea relației după conflict',
              ],
              resources: [
                { type: 'SCRIPT', title: 'Difficult Conversation Scripts' },
              ],
            },
            {
              title: 'Prezentări Executive',
              type: 'WORKSHOP',
              duration: 90,
              description: 'Workshop practic de prezentare pentru board',
              keyTakeaways: [
                'Structura prezentării executive',
                'Răspunsuri la întrebări dificile',
                'Prezența executivă',
              ],
              resources: [
                { type: 'TEMPLATE', title: 'Board Presentation Template' },
              ],
            },
          ],
          caseStudyIds: ['cs-communication-crisis'],
          discussionTopics: [
            'Care este cea mai dificilă conversație pe care ai avut-o ca lider?',
            'Cum îți pregătești mesajele pentru diferite audiențe?',
          ],
        },
        {
          title: 'Modul 4: Managementul Performanței',
          description: 'De la obiective la rezultate excepționale',
          duration: 420,
          executiveSummary: 'Sisteme și practici pentru performanță susținută',
          keyFrameworks: ['SMART Goals', 'Continuous Feedback', 'Performance Reviews'],
          lessons: [
            {
              title: 'Setarea Obiectivelor Eficiente',
              type: 'VIDEO',
              duration: 45,
              description: 'SMART goals și alinierea cu strategia',
              keyTakeaways: [
                'Cascadarea obiectivelor organizaționale',
                'Balansarea între stretch și realizabil',
                'Implicarea echipei în setare',
              ],
              resources: [
                { type: 'TEMPLATE', title: 'Goal Setting Worksheet' },
              ],
            },
            {
              title: 'Feedback Continuu',
              type: 'VIDEO',
              duration: 60,
              description: 'De la annual review la feedback în timp real',
              keyTakeaways: [
                'Modelul SBI (Situation-Behavior-Impact)',
                'Feedforward vs feedback',
                'Crearea culturii de feedback',
              ],
              resources: [
                { type: 'TEMPLATE', title: 'SBI Feedback Template' },
              ],
            },
            {
              title: 'Coaching pentru Performanță',
              type: 'VIDEO',
              duration: 60,
              description: 'Tehnici de coaching pentru dezvoltarea echipei',
              keyTakeaways: [
                'Modelul GROW',
                'Întrebări puternice',
                'Când să coaching vs când să direcționezi',
              ],
              resources: [
                { type: 'TEMPLATE', title: 'GROW Coaching Template' },
              ],
            },
            {
              title: 'Role Play: Performance Review',
              type: 'SIMULATION',
              duration: 90,
              description: 'Practică în conducerea review-urilor de performanță',
              keyTakeaways: [
                'Pregătirea review-ului',
                'Gestionarea reacțiilor emoționale',
                'Plan de dezvoltare și follow-up',
              ],
              resources: [
                { type: 'SCRIPT', title: 'Performance Review Scenarios' },
              ],
            },
          ],
          caseStudyIds: ['cs-performance-turnaround'],
          discussionTopics: [
            'Ce funcționează și ce nu în sistemul de performanță actual?',
            'Cum dai feedback constructiv oamenilor sensibili?',
          ],
        },
        {
          title: 'Modul 5: Managementul Schimbării',
          description: 'Conducerea transformărilor organizaționale',
          duration: 420,
          executiveSummary: 'De ce eșuează schimbările și cum să le faci să funcționeze',
          keyFrameworks: ['Kotter\'s 8 Steps', 'ADKAR', 'Resistance Management'],
          lessons: [
            {
              title: 'Psihologia Schimbării',
              type: 'VIDEO',
              duration: 45,
              description: 'De ce oamenii rezistă la schimbare',
              keyTakeaways: [
                'Curba schimbării și reacțiile emoționale',
                'Tipuri de rezistență',
                'Strategii de adresare',
              ],
              resources: [
                { type: 'PDF', title: 'Psychology of Change' },
              ],
            },
            {
              title: 'Cei 8 Pași ai lui Kotter',
              type: 'VIDEO',
              duration: 60,
              description: 'Framework-ul clasic pentru change management',
              keyTakeaways: [
                'Crearea senzului de urgență',
                'Construirea coaliției',
                'Consolidarea și instituționalizarea',
              ],
              resources: [
                { type: 'TEMPLATE', title: 'Kotter 8 Steps Checklist' },
              ],
            },
            {
              title: 'Modelul ADKAR',
              type: 'VIDEO',
              duration: 45,
              description: 'Change management la nivel individual',
              keyTakeaways: [
                'Awareness, Desire, Knowledge, Ability, Reinforcement',
                'Diagnosticarea blocajelor',
                'Intervenții specifice',
              ],
              resources: [
                { type: 'ASSESSMENT', title: 'ADKAR Assessment Tool' },
              ],
            },
            {
              title: 'Studiu de Caz: Transformare Eșuată și Lecții',
              type: 'CASE_ANALYSIS',
              duration: 90,
              description: 'Analiza unui proiect de schimbare care a eșuat',
              keyTakeaways: [
                'Identificarea punctelor de eșec',
                'Ce ar fi putut fi făcut diferit',
                'Lecții pentru viitoare transformări',
              ],
              resources: [
                { type: 'CASE', title: 'Failed Transformation Case' },
              ],
            },
          ],
          caseStudyIds: ['cs-change-failure'],
          discussionTopics: [
            'Care a fost cea mai mare schimbare prin care ai trecut?',
            'Cum gestionezi rezistența în echipa ta?',
          ],
        },
        {
          title: 'Modul 6: Leadership Etic și Proiect Final',
          description: 'Integritatea în leadership și aplicare practică',
          duration: 480,
          executiveSummary: 'Liderul complet: competență, caracter și curaj',
          keyFrameworks: ['Ethical Decision Making', 'Values-Based Leadership'],
          lessons: [
            {
              title: 'Decizii Etice în Leadership',
              type: 'VIDEO',
              duration: 45,
              description: 'Framework pentru decizii dificile',
              keyTakeaways: [
                'Dileme etice comune în business',
                'Framework de analiză etică',
                'Curajul de a face ce e corect',
              ],
              resources: [
                { type: 'PDF', title: 'Ethical Decision Framework' },
              ],
            },
            {
              title: 'Studii de Caz: Dileme Etice',
              type: 'PEER_DISCUSSION',
              duration: 90,
              description: 'Discuții în grup pe scenarii etice',
              keyTakeaways: [
                'Multiple perspective asupra dilemelor',
                'Impactul deciziilor asupra stakeholderilor',
                'Construirea culturii etice',
              ],
              resources: [
                { type: 'CASES', title: 'Ethical Dilemma Scenarios' },
              ],
            },
            {
              title: 'Proiect Final: Plan de Dezvoltare Leadership',
              type: 'WORKSHOP',
              duration: 180,
              description: 'Crearea planului personal de dezvoltare',
              keyTakeaways: [
                'Sinteza învățămintelor din curs',
                'Plan de acțiune pe 12 luni',
                'Mecanisme de accountability',
              ],
              resources: [
                { type: 'TEMPLATE', title: 'Leadership Development Plan' },
              ],
            },
            {
              title: 'Prezentare și Coaching Final',
              type: 'SIMULATION',
              duration: 60,
              description: 'Prezentarea planului și sesiune de coaching',
              keyTakeaways: [
                'Feedback pe plan de dezvoltare',
                'Commitment public',
                'Rețea de suport peer',
              ],
              resources: [],
            },
          ],
          caseStudyIds: ['cs-ethical-dilemma'],
          discussionTopics: [
            'Care sunt valorile tale fundamentale ca lider?',
            'Cum vei continua să te dezvolți după acest curs?',
          ],
        },
      ],
      caseStudies: [],
      peerActivities: [
        {
          id: 'pa-leadership-shadowing',
          title: 'Leadership Shadowing',
          type: 'GROUP_PROJECT',
          description: 'Observarea și analiza unui lider pe care îl admiri',
          groupSize: { min: 1, max: 1 },
          duration: 240,
          deliverables: [
            'Raport de observare',
            'Lecții învățate',
            'Plan de aplicare',
          ],
          rubric: [
            { criterion: 'Profunzimea observației', weight: 40, description: 'Insight-uri valoroase despre stilul liderului' },
            { criterion: 'Conexiunea cu teoria', weight: 30, description: 'Legarea observațiilor de conceptele din curs' },
            { criterion: 'Aplicabilitate personală', weight: 30, description: 'Plan concret de aplicare' },
          ],
        },
      ],
      duration: {
        weeks: 8,
        hoursPerWeek: 5,
        totalHours: 40,
      },
      pricing: {
        amount: 449,
        currency: 'RON',
        corporateDiscount: 20,
        earlyBirdDiscount: 15,
      },
      certification: {
        credentialName: 'Certificate in Leadership & Management',
        credentialType: 'PROFESSIONAL_CERTIFICATE',
        ceuCredits: 4,
        validityYears: 3,
        digitalBadge: true,
      },
      cohortBased: true,
      mentorshipIncluded: true,
      networkingEvents: true,
      hrdaEligible: true,
    };
  }

  getFinanceForManagersTemplate(): MBACourseTemplate {
    return {
      title: 'Finanțe pentru Manageri Non-Financiari',
      slug: 'finance-for-managers',
      description: `Curs esențial de educație financiară pentru manageri din domenii
        non-financiare. Acoperă citirea situațiilor financiare, analiza profitabilității,
        bugetare, evaluarea investițiilor și comunicarea cu departamentul financiar.`,
      shortDescription: 'Înțelege limbajul finanțelor și ia decizii informate',
      category: 'FINANCE',
      level: 'FOUNDATIONAL',
      targetAudience: [
        'Manageri din departamente operaționale',
        'Lideri de proiecte cu responsabilități bugetare',
        'Antreprenori fără background financiar',
        'Specialiști care colaborează cu finanțele',
      ],
      prerequisites: [
        'Experiență de management sau coordonare',
        'Cunoștințe de bază de matematică',
        'Acces la situațiile financiare ale companiei (recomandat)',
      ],
      learningOutcomes: [
        'Citește și interpretează bilanțul, P&L și cash flow',
        'Calculează și interpretează ratele financiare cheie',
        'Construiește și gestionează bugete departamentale',
        'Evaluează proiecte de investiții cu NPV și IRR',
        'Comunică eficient cu CFO și echipa de finanțe',
        'Identifică levierele de profitabilitate în departamentul tău',
      ],
      modules: [
        {
          title: 'Modul 1: Fundamente Contabile',
          description: 'Limbajul de bază al finanțelor',
          duration: 360,
          executiveSummary: 'Principiile contabile pe care orice manager trebuie să le cunoască',
          keyFrameworks: ['Accounting Equation', 'Double-Entry', 'Accrual vs Cash'],
          lessons: [
            {
              title: 'Ecuația Contabilă Fundamentală',
              type: 'VIDEO',
              duration: 30,
              description: 'Active = Pasive + Capitaluri Proprii',
              keyTakeaways: [
                'Ce sunt activele și cum se clasifică',
                'Diferența între datorii și capitaluri',
                'Cum se leagă cele 3 situații financiare',
              ],
              resources: [
                { type: 'PDF', title: 'Accounting Basics Cheatsheet' },
              ],
            },
            {
              title: 'Principiul Angajamentelor vs Cash',
              type: 'VIDEO',
              duration: 45,
              description: 'De ce profitul nu e același lucru cu cash-ul',
              keyTakeaways: [
                'Recunoașterea veniturilor și cheltuielilor',
                'Diferențele între profit și cash',
                'Implicații pentru decizii',
              ],
              resources: [
                { type: 'EXAMPLE', title: 'Profit vs Cash Examples' },
              ],
            },
            {
              title: 'Quiz Interactiv: Concepte Contabile',
              type: 'SIMULATION',
              duration: 30,
              description: 'Testează-ți înțelegerea conceptelor',
              keyTakeaways: [
                'Validarea înțelegerii',
                'Identificarea lacunelor',
                'Consolidarea cunoștințelor',
              ],
              resources: [
                { type: 'QUIZ', title: 'Accounting Concepts Quiz' },
              ],
            },
          ],
          caseStudyIds: [],
          discussionTopics: [
            'Ce termeni financiari ți se par cei mai confuzi?',
          ],
        },
        {
          title: 'Modul 2: Citirea Situațiilor Financiare',
          description: 'Bilanț, Profit & Loss, Cash Flow',
          duration: 480,
          executiveSummary: 'Cum să extragi informații din cele 3 situații financiare',
          keyFrameworks: ['Balance Sheet', 'Income Statement', 'Cash Flow Statement'],
          lessons: [
            {
              title: 'Bilanțul Contabil',
              type: 'VIDEO',
              duration: 60,
              description: 'Fotografia poziției financiare',
              keyTakeaways: [
                'Structura bilanțului',
                'Ce spune despre sănătatea companiei',
                'Red flags de urmărit',
              ],
              resources: [
                { type: 'TEMPLATE', title: 'Balance Sheet Reading Guide' },
              ],
            },
            {
              title: 'Contul de Profit și Pierdere',
              type: 'VIDEO',
              duration: 60,
              description: 'Filmul performanței pe o perioadă',
              keyTakeaways: [
                'De la venituri la profit net',
                'Marje: brută, operațională, netă',
                'Analiza trendurilor',
              ],
              resources: [
                { type: 'TEMPLATE', title: 'P&L Analysis Template' },
              ],
            },
            {
              title: 'Situația Fluxurilor de Numerar',
              type: 'VIDEO',
              duration: 60,
              description: 'Cash is king - urmărirea banilor',
              keyTakeaways: [
                'Cele 3 categorii de cash flows',
                'Reconcilierea cu profitul',
                'Warning signs în cash flow',
              ],
              resources: [
                { type: 'TEMPLATE', title: 'Cash Flow Analysis Guide' },
              ],
            },
            {
              title: 'Workshop: Analiza Raportului Anual',
              type: 'WORKSHOP',
              duration: 120,
              description: 'Analizăm împreună un raport anual real',
              keyTakeaways: [
                'Aplicarea conceptelor pe date reale',
                'Identificarea informațiilor cheie',
                'Întrebări de pus CFO-ului',
              ],
              resources: [
                { type: 'REPORT', title: 'Sample Annual Report' },
              ],
            },
          ],
          caseStudyIds: ['cs-financial-analysis'],
          discussionTopics: [
            'Ce ai descoperit nou în situațiile financiare ale companiei tale?',
          ],
        },
        {
          title: 'Modul 3: Analiza Financiară',
          description: 'Rate și indicatori de performanță',
          duration: 420,
          executiveSummary: 'KPIs financiari esențiali pentru decizii',
          keyFrameworks: ['Ratio Analysis', 'DuPont Model', 'Benchmarking'],
          lessons: [
            {
              title: 'Rate de Lichiditate și Solvabilitate',
              type: 'VIDEO',
              duration: 45,
              description: 'Poate compania să-și plătească obligațiile?',
              keyTakeaways: [
                'Current ratio, Quick ratio',
                'Debt-to-Equity, Interest Coverage',
                'Interpretare și benchmarks',
              ],
              resources: [
                { type: 'CALCULATOR', title: 'Liquidity Ratios Calculator' },
              ],
            },
            {
              title: 'Rate de Profitabilitate',
              type: 'VIDEO',
              duration: 45,
              description: 'Cât de eficient generează profit compania?',
              keyTakeaways: [
                'ROE, ROA, ROIC',
                'Marje de profit',
                'Descompunerea DuPont',
              ],
              resources: [
                { type: 'CALCULATOR', title: 'Profitability Calculator' },
              ],
            },
            {
              title: 'Rate de Eficiență',
              type: 'VIDEO',
              duration: 45,
              description: 'Cât de bine utilizează compania resursele?',
              keyTakeaways: [
                'Asset Turnover, Inventory Days',
                'DSO, DPO și ciclul de cash',
                'Working capital management',
              ],
              resources: [
                { type: 'CALCULATOR', title: 'Efficiency Ratios Calculator' },
              ],
            },
            {
              title: 'Exercițiu: Analiza Comparativă',
              type: 'WORKSHOP',
              duration: 90,
              description: 'Comparăm 3 companii din aceeași industrie',
              keyTakeaways: [
                'Benchmarking cu competitorii',
                'Identificarea avantajelor competitive',
                'Story-ul din spatele cifrelor',
              ],
              resources: [
                { type: 'DATA', title: 'Industry Comparison Dataset' },
              ],
            },
          ],
          caseStudyIds: ['cs-ratio-analysis'],
          discussionTopics: [
            'Care rate sunt cele mai relevante pentru departamentul tău?',
          ],
        },
        {
          title: 'Modul 4: Bugetare și Control',
          description: 'Planificarea și monitorizarea financiară',
          duration: 420,
          executiveSummary: 'De la buget la realitate: planificare și control',
          keyFrameworks: ['Zero-Based Budgeting', 'Variance Analysis', 'Rolling Forecasts'],
          lessons: [
            {
              title: 'Fundamentele Bugetării',
              type: 'VIDEO',
              duration: 45,
              description: 'Tipuri de bugete și procesul de bugetare',
              keyTakeaways: [
                'Top-down vs Bottom-up',
                'Zero-based budgeting',
                'Beyond budgeting trends',
              ],
              resources: [
                { type: 'TEMPLATE', title: 'Budget Templates Pack' },
              ],
            },
            {
              title: 'Construirea Bugetului Departamental',
              type: 'VIDEO',
              duration: 60,
              description: 'Ghid practic pentru manageri',
              keyTakeaways: [
                'Categorii de costuri',
                'Justificarea cererilor bugetare',
                'Negocierea cu finanțele',
              ],
              resources: [
                { type: 'TEMPLATE', title: 'Departmental Budget Template' },
              ],
            },
            {
              title: 'Analiza Varianțelor',
              type: 'VIDEO',
              duration: 45,
              description: 'Ce faci când realitatea diferă de buget',
              keyTakeaways: [
                'Tipuri de varianțe: preț, volum, mix',
                'Root cause analysis',
                'Acțiuni corective',
              ],
              resources: [
                { type: 'TEMPLATE', title: 'Variance Analysis Template' },
              ],
            },
            {
              title: 'Workshop: Bugetare în Excel',
              type: 'WORKSHOP',
              duration: 90,
              description: 'Construim un buget departamental pas cu pas',
              keyTakeaways: [
                'Model practic de buget',
                'Scenarii și sensitivități',
                'Dashboard de monitorizare',
              ],
              resources: [
                { type: 'EXCEL', title: 'Budget Model Template' },
              ],
            },
          ],
          caseStudyIds: ['cs-budget-management'],
          discussionTopics: [
            'Care sunt cele mai mari provocări în procesul de bugetare?',
          ],
        },
        {
          title: 'Modul 5: Evaluarea Investițiilor',
          description: 'Cum să evaluezi proiecte și business cases',
          duration: 420,
          executiveSummary: 'Decizii de investiții bazate pe date',
          keyFrameworks: ['NPV', 'IRR', 'Payback Period', 'Business Case'],
          lessons: [
            {
              title: 'Valoarea în Timp a Banilor',
              type: 'VIDEO',
              duration: 45,
              description: 'De ce 1 RON azi valorează mai mult decât mâine',
              keyTakeaways: [
                'Present Value și Future Value',
                'Discount rate și cost of capital',
                'Compounding și discounting',
              ],
              resources: [
                { type: 'CALCULATOR', title: 'TVM Calculator' },
              ],
            },
            {
              title: 'NPV și IRR',
              type: 'VIDEO',
              duration: 60,
              description: 'Cele mai importante metrici de investiții',
              keyTakeaways: [
                'Calculul și interpretarea NPV',
                'Ce înseamnă IRR și limitările',
                'Când să folosești ce metodă',
              ],
              resources: [
                { type: 'CALCULATOR', title: 'NPV & IRR Calculator' },
              ],
            },
            {
              title: 'Construirea unui Business Case',
              type: 'VIDEO',
              duration: 60,
              description: 'Cum să argumentezi o investiție',
              keyTakeaways: [
                'Structura unui business case',
                'Identificarea beneficiilor și costurilor',
                'Risk și sensitivity analysis',
              ],
              resources: [
                { type: 'TEMPLATE', title: 'Business Case Template' },
              ],
            },
            {
              title: 'Studiu de Caz: Evaluarea unui Proiect',
              type: 'CASE_ANALYSIS',
              duration: 90,
              description: 'Analiza completă a unei oportunități de investiție',
              keyTakeaways: [
                'Aplicarea tuturor conceptelor',
                'Prezentarea recomandării',
                'Q&A cu panel',
              ],
              resources: [
                { type: 'CASE', title: 'Investment Evaluation Case' },
              ],
            },
          ],
          caseStudyIds: ['cs-investment-decision'],
          discussionTopics: [
            'Cum sunt evaluate proiectele în compania ta?',
          ],
        },
        {
          title: 'Modul 6: Comunicarea cu Finanțele',
          description: 'Parteneriat eficient cu departamentul financiar',
          duration: 300,
          executiveSummary: 'De la adversar la partener strategic',
          keyFrameworks: ['Business Partnering', 'Financial Storytelling'],
          lessons: [
            {
              title: 'Ce Vrea CFO-ul de la Tine',
              type: 'EXPERT_INTERVIEW',
              duration: 45,
              description: 'Interviu cu un CFO despre colaborarea cu operaționalii',
              keyTakeaways: [
                'Așteptările finanțelor',
                'Informații valoroase pe care le poți oferi',
                'Evitarea conflictelor comune',
              ],
              resources: [
                { type: 'VIDEO', title: 'CFO Interview' },
              ],
            },
            {
              title: 'Prezentarea Datelor Financiare',
              type: 'VIDEO',
              duration: 45,
              description: 'Cum să prezinți numere pentru impact',
              keyTakeaways: [
                'Vizualizarea datelor financiare',
                'Storytelling cu numere',
                'Adaptarea la audiență',
              ],
              resources: [
                { type: 'TEMPLATE', title: 'Financial Presentation Templates' },
              ],
            },
            {
              title: 'Examen Final și Certificare',
              type: 'SIMULATION',
              duration: 90,
              description: 'Test comprehensiv și prezentare de proiect',
              keyTakeaways: [
                'Validarea cunoștințelor',
                'Feedback personalizat',
                'Plan de dezvoltare continuă',
              ],
              resources: [
                { type: 'EXAM', title: 'Final Exam' },
              ],
            },
          ],
          caseStudyIds: [],
          discussionTopics: [
            'Ce întrebări ai pentru CFO-ul tău după acest curs?',
          ],
        },
      ],
      caseStudies: [],
      peerActivities: [
        {
          id: 'pa-finance-presentation',
          title: 'Prezentare Financiară',
          type: 'PEER_REVIEW',
          description: 'Prezintă un business case colegilor și primește feedback',
          groupSize: { min: 3, max: 5 },
          duration: 120,
          deliverables: [
            'Business case document',
            'Prezentare 10 minute',
            'Feedback de la colegi',
          ],
          rubric: [
            { criterion: 'Acuratețea analizei', weight: 40, description: 'Calcule corecte și logice' },
            { criterion: 'Claritatea prezentării', weight: 30, description: 'Mesaj clar și convingător' },
            { criterion: 'Calitatea feedback-ului', weight: 30, description: 'Feedback util oferit colegilor' },
          ],
        },
      ],
      duration: {
        weeks: 6,
        hoursPerWeek: 5,
        totalHours: 30,
      },
      pricing: {
        amount: 349,
        currency: 'RON',
        corporateDiscount: 25,
        earlyBirdDiscount: 15,
      },
      certification: {
        credentialName: 'Certificate in Finance for Managers',
        credentialType: 'MICRO_CREDENTIAL',
        ceuCredits: 3,
        validityYears: 3,
        digitalBadge: true,
      },
      cohortBased: false,
      mentorshipIncluded: false,
      networkingEvents: false,
      hrdaEligible: true,
    };
  }

  getOperationsExcellenceTemplate(): MBACourseTemplate {
    return {
      title: 'Excelență Operațională și Process Management',
      slug: 'operations-excellence',
      description: `Curs comprehensive despre managementul operațiunilor, lean management,
        Six Sigma și îmbunătățirea continuă. Include tools și tehnici pentru optimizarea
        proceselor, reducerea costurilor și creșterea calității.`,
      shortDescription: 'Optimizează procesele și elimină risipa cu metodologii dovedite',
      category: 'OPERATIONS',
      level: 'INTERMEDIATE',
      targetAudience: [
        'Manageri de operațiuni și producție',
        'Process owners și quality managers',
        'Manageri de proiecte de transformare',
        'Consultanți operaționali',
      ],
      prerequisites: [
        'Experiență în coordonarea proceselor',
        'Cunoștințe de bază statistice',
        'Acces la date operaționale (recomandat)',
      ],
      learningOutcomes: [
        'Aplică principiile Lean pentru eliminarea risipei',
        'Utilizează DMAIC pentru proiecte Six Sigma',
        'Cartografiază și optimizează procesele cu VSM',
        'Implementează sisteme de management vizual',
        'Conduci proiecte de îmbunătățire continuă',
        'Construiești cultura de excelență operațională',
      ],
      modules: [
        {
          title: 'Modul 1: Fundamente de Operations Management',
          description: 'Principii și concepte fundamentale',
          duration: 420,
          executiveSummary: 'Bazele managementului operațiunilor moderne',
          keyFrameworks: ['Operations Strategy', 'Process Types', 'Performance Measurement'],
          lessons: [
            {
              title: 'Strategia Operațională',
              type: 'VIDEO',
              duration: 45,
              description: 'Alinierea operațiunilor cu strategia de business',
              keyTakeaways: [
                'Prioritățile competitive: cost, quality, speed, flexibility',
                'Trade-offs și focus strategic',
                'Operations ca sursă de avantaj competitiv',
              ],
              resources: [
                { type: 'PDF', title: 'Operations Strategy Framework' },
              ],
            },
            {
              title: 'Tipuri de Procese și Layout',
              type: 'VIDEO',
              duration: 60,
              description: 'De la job shop la producție continuă',
              keyTakeaways: [
                'Product-process matrix',
                'Alegerea layout-ului potrivit',
                'Implicații pentru flexibilitate și cost',
              ],
              resources: [
                { type: 'DIAGRAM', title: 'Process Types Comparison' },
              ],
            },
            {
              title: 'Măsurarea Performanței Operaționale',
              type: 'VIDEO',
              duration: 60,
              description: 'KPIs esențiali pentru operațiuni',
              keyTakeaways: [
                'OEE (Overall Equipment Effectiveness)',
                'Cycle time, takt time, lead time',
                'Quality metrics și yield',
              ],
              resources: [
                { type: 'CALCULATOR', title: 'OEE Calculator' },
              ],
            },
            {
              title: 'Workshop: Diagnosticul Operațional',
              type: 'WORKSHOP',
              duration: 90,
              description: 'Evaluarea maturității operaționale',
              keyTakeaways: [
                'Assessment structurat',
                'Identificarea oportunităților',
                'Prioritizarea inițiativelor',
              ],
              resources: [
                { type: 'ASSESSMENT', title: 'Operational Maturity Assessment' },
              ],
            },
          ],
          caseStudyIds: ['cs-operations-strategy'],
          discussionTopics: [
            'Care sunt prioritățile competitive în industria ta?',
            'Ce KPIs operaționali urmărești?',
          ],
        },
        {
          title: 'Modul 2: Lean Management',
          description: 'Eliminarea risipei și crearea valorii',
          duration: 540,
          executiveSummary: 'Principiile Toyota Production System pentru orice industrie',
          keyFrameworks: ['7 Wastes', 'Value Stream Mapping', '5S', 'Visual Management'],
          lessons: [
            {
              title: 'Principiile Lean',
              type: 'VIDEO',
              duration: 45,
              description: 'Cele 5 principii Lean Thinking',
              keyTakeaways: [
                'Value, Value Stream, Flow, Pull, Perfection',
                'Diferența între activități VA și NVA',
                'Mindset-ul Lean',
              ],
              resources: [
                { type: 'PDF', title: 'Lean Thinking Summary' },
              ],
            },
            {
              title: 'Cele 7 Tipuri de Risipă',
              type: 'VIDEO',
              duration: 60,
              description: 'TIMWOOD: identificarea și eliminarea risipei',
              keyTakeaways: [
                'Transport, Inventory, Motion, Waiting',
                'Over-processing, Over-production, Defects',
                'A 8-a risipă: talentul neutilizat',
              ],
              resources: [
                { type: 'CHECKLIST', title: 'Waste Walk Checklist' },
              ],
            },
            {
              title: 'Value Stream Mapping',
              type: 'VIDEO',
              duration: 60,
              description: 'Cartografierea fluxului de valoare',
              keyTakeaways: [
                'Current state vs future state map',
                'Simboluri și convenții VSM',
                'Identificarea bottlenecks',
              ],
              resources: [
                { type: 'TEMPLATE', title: 'VSM Template and Guide' },
              ],
            },
            {
              title: '5S și Visual Management',
              type: 'VIDEO',
              duration: 45,
              description: 'Organizarea locului de muncă',
              keyTakeaways: [
                'Sort, Set in Order, Shine, Standardize, Sustain',
                'Visual controls și andon',
                'Implementarea 5S pas cu pas',
              ],
              resources: [
                { type: 'TEMPLATE', title: '5S Implementation Kit' },
              ],
            },
            {
              title: 'Workshop: Crează un VSM',
              type: 'WORKSHOP',
              duration: 120,
              description: 'Exercițiu practic de Value Stream Mapping',
              keyTakeaways: [
                'Aplicarea VSM pe un proces real',
                'Identificarea oportunităților',
                'Plan de îmbunătățire',
              ],
              resources: [
                { type: 'EXERCISE', title: 'VSM Exercise Materials' },
              ],
            },
          ],
          caseStudyIds: ['cs-lean-transformation'],
          discussionTopics: [
            'Ce tipuri de risipă observi în procesele tale?',
            'Cum poți aplica 5S în office?',
          ],
        },
        {
          title: 'Modul 3: Six Sigma și DMAIC',
          description: 'Reducerea variabilității și îmbunătățirea calității',
          duration: 540,
          executiveSummary: 'Metodologia data-driven pentru îmbunătățire',
          keyFrameworks: ['DMAIC', 'Statistical Process Control', 'Root Cause Analysis'],
          lessons: [
            {
              title: 'Introducere în Six Sigma',
              type: 'VIDEO',
              duration: 45,
              description: 'Istoria și principiile Six Sigma',
              keyTakeaways: [
                'Ce înseamnă 6 sigma (3.4 DPMO)',
                'Belt levels și structura',
                'Când să folosești Six Sigma',
              ],
              resources: [
                { type: 'PDF', title: 'Six Sigma Overview' },
              ],
            },
            {
              title: 'Define și Measure',
              type: 'VIDEO',
              duration: 60,
              description: 'Primele faze ale DMAIC',
              keyTakeaways: [
                'Project charter și SIPOC',
                'Voice of Customer',
                'Colectarea și validarea datelor',
              ],
              resources: [
                { type: 'TEMPLATE', title: 'Project Charter Template' },
                { type: 'TEMPLATE', title: 'SIPOC Template' },
              ],
            },
            {
              title: 'Analyze',
              type: 'VIDEO',
              duration: 60,
              description: 'Identificarea cauzelor rădăcină',
              keyTakeaways: [
                'Fishbone diagram și 5 Whys',
                'Analiza Pareto',
                'Hypothesis testing basics',
              ],
              resources: [
                { type: 'TEMPLATE', title: 'Root Cause Analysis Tools' },
              ],
            },
            {
              title: 'Improve și Control',
              type: 'VIDEO',
              duration: 60,
              description: 'Implementarea și susținerea îmbunătățirilor',
              keyTakeaways: [
                'Solution selection și piloting',
                'Control charts și SPC',
                'Control plan și handover',
              ],
              resources: [
                { type: 'TEMPLATE', title: 'Control Plan Template' },
              ],
            },
            {
              title: 'Workshop: Mini Proiect DMAIC',
              type: 'WORKSHOP',
              duration: 180,
              description: 'Aplicarea DMAIC pe un proces simplu',
              keyTakeaways: [
                'Parcurgerea tuturor fazelor',
                'Utilizarea tool-urilor cheie',
                'Prezentarea rezultatelor',
              ],
              resources: [
                { type: 'EXERCISE', title: 'DMAIC Mini Project' },
              ],
            },
          ],
          caseStudyIds: ['cs-six-sigma-project'],
          discussionTopics: [
            'Ce procese din organizația ta ar beneficia de un proiect Six Sigma?',
            'Care sunt cele mai mari provocări în colectarea datelor?',
          ],
        },
        {
          title: 'Modul 4: Kaizen și Îmbunătățire Continuă',
          description: 'Cultura îmbunătățirii continue',
          duration: 420,
          executiveSummary: 'De la proiecte la cultura de excelență',
          keyFrameworks: ['Kaizen Events', 'A3 Problem Solving', 'Kata'],
          lessons: [
            {
              title: 'Filosofia Kaizen',
              type: 'VIDEO',
              duration: 45,
              description: 'Îmbunătățire continuă, pas cu pas',
              keyTakeaways: [
                'Kaizen vs Kaikaku',
                'Implicarea tuturor angajaților',
                'Small wins și momentum',
              ],
              resources: [
                { type: 'PDF', title: 'Kaizen Philosophy Guide' },
              ],
            },
            {
              title: 'Kaizen Events',
              type: 'VIDEO',
              duration: 60,
              description: 'Rapid improvement workshops',
              keyTakeaways: [
                'Planificarea unui Kaizen event',
                'Facilitarea workshop-ului',
                'Follow-up și sustenabilitate',
              ],
              resources: [
                { type: 'TEMPLATE', title: 'Kaizen Event Playbook' },
              ],
            },
            {
              title: 'A3 Problem Solving',
              type: 'VIDEO',
              duration: 60,
              description: 'Metodologia Toyota pentru rezolvarea problemelor',
              keyTakeaways: [
                'Structura A3',
                'Storytelling cu date',
                'Mentoring prin A3',
              ],
              resources: [
                { type: 'TEMPLATE', title: 'A3 Template' },
              ],
            },
            {
              title: 'Workshop: Kaizen Event Simulation',
              type: 'SIMULATION',
              duration: 120,
              description: 'Simularea unui Kaizen event',
              keyTakeaways: [
                'Experiența facilitării',
                'Dinamica de grup',
                'Tehnici de ideation',
              ],
              resources: [
                { type: 'SIMULATION', title: 'Kaizen Simulation Materials' },
              ],
            },
          ],
          caseStudyIds: ['cs-kaizen-culture'],
          discussionTopics: [
            'Cum poți încuraja ideile de îmbunătățire în echipa ta?',
            'Ce bariere există pentru îmbunătățirea continuă?',
          ],
        },
        {
          title: 'Modul 5: Proiect Final și Certificare',
          description: 'Aplicarea cunoștințelor într-un proiect real',
          duration: 480,
          executiveSummary: 'Demonstrarea competențelor prin practică',
          keyFrameworks: ['All integrated'],
          lessons: [
            {
              title: 'Briefing Proiect Final',
              type: 'VIDEO',
              duration: 30,
              description: 'Cerințele proiectului de certificare',
              keyTakeaways: [
                'Selectarea procesului',
                'Metodologia de urmat',
                'Criteriile de evaluare',
              ],
              resources: [
                { type: 'TEMPLATE', title: 'Final Project Brief' },
              ],
            },
            {
              title: 'Coaching Session 1',
              type: 'WORKSHOP',
              duration: 90,
              description: 'Review pe Define și Measure',
              keyTakeaways: [
                'Feedback pe problem statement',
                'Validarea datelor',
                'Ajustări necesare',
              ],
              resources: [],
            },
            {
              title: 'Coaching Session 2',
              type: 'WORKSHOP',
              duration: 90,
              description: 'Review pe Analyze și Improve',
              keyTakeaways: [
                'Validarea analizei',
                'Feedback pe soluții',
                'Pregătire pentru prezentare',
              ],
              resources: [],
            },
            {
              title: 'Prezentare Finală',
              type: 'SIMULATION',
              duration: 60,
              description: 'Prezentarea proiectului în fața panelului',
              keyTakeaways: [
                'Demonstrarea rezultatelor',
                'Răspunsuri la întrebări',
                'Certificare',
              ],
              resources: [],
            },
          ],
          caseStudyIds: [],
          discussionTopics: [
            'Ce ai învățat din proiectul de îmbunătățire?',
            'Cum vei aplica aceste competențe în viitor?',
          ],
        },
      ],
      caseStudies: [],
      peerActivities: [
        {
          id: 'pa-waste-walk',
          title: 'Waste Walk Virtual',
          type: 'GROUP_PROJECT',
          description: 'Identificarea risipei într-un proces video',
          groupSize: { min: 3, max: 5 },
          duration: 90,
          deliverables: [
            'Lista de risipă identificată',
            'Prioritizarea oportunităților',
            'Quick wins propuse',
          ],
          rubric: [
            { criterion: 'Completitudinea observației', weight: 40, description: 'Identificarea tuturor tipurilor de risipă' },
            { criterion: 'Calitatea analizei', weight: 30, description: 'Cuantificarea impactului' },
            { criterion: 'Recomandări', weight: 30, description: 'Soluții practice și actionabile' },
          ],
        },
      ],
      duration: {
        weeks: 8,
        hoursPerWeek: 6,
        totalHours: 48,
      },
      pricing: {
        amount: 499,
        currency: 'RON',
        corporateDiscount: 20,
        earlyBirdDiscount: 15,
      },
      certification: {
        credentialName: 'Certificate in Operations Excellence',
        credentialType: 'PROFESSIONAL_CERTIFICATE',
        ceuCredits: 5,
        validityYears: 3,
        digitalBadge: true,
      },
      cohortBased: true,
      mentorshipIncluded: true,
      networkingEvents: false,
      hrdaEligible: true,
    };
  }

  // ===== COURSE GENERATION =====

  private mapCategoryToLMS(category: MBACourseTemplate['category']): CourseCategory {
    const mapping: Record<MBACourseTemplate['category'], CourseCategory> = {
      'STRATEGY': 'LEADERSHIP',
      'LEADERSHIP': 'LEADERSHIP',
      'FINANCE': 'FINANCE',
      'OPERATIONS': 'OPERATIONS',
      'MARKETING': 'MARKETING',
      'INNOVATION': 'TECHNOLOGY',
    };
    return mapping[category];
  }

  async generateCourse(template: MBACourseTemplate, instructorId: string): Promise<Course> {
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
      tags: [template.category, 'MBA', 'Business', 'Romanian'],
      ceuCredits: template.certification.ceuCredits,
      hrdaEligible: template.hrdaEligible,
      thumbnail: `/images/courses/${template.slug}.jpg`,
      previewVideo: `/videos/courses/${template.slug}/preview.mp4`,
    };

    const course = await this.lmsService.createCourse(courseData);

    // Create modules and lessons
    let moduleIndex = 0;
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
              resources: lessonTemplate.resources,
            }),
            videoUrl: lessonType === 'VIDEO' ? `/videos/courses/${template.slug}/${module.id}/${lessonIndex + 1}.mp4` : undefined,
          },
          isFree: moduleIndex === 0 && lessonIndex < 2,
        });
        lessonIndex++;
      }
      moduleIndex++;
    }

    return course;
  }

  private mapLessonType(type: string): 'VIDEO' | 'TEXT' | 'QUIZ' | 'ASSIGNMENT' | 'LIVE_SESSION' {
    const mapping: Record<string, 'VIDEO' | 'TEXT' | 'QUIZ' | 'ASSIGNMENT' | 'LIVE_SESSION'> = {
      'VIDEO': 'VIDEO',
      'READING': 'TEXT',
      'CASE_ANALYSIS': 'ASSIGNMENT',
      'SIMULATION': 'ASSIGNMENT',
      'PEER_DISCUSSION': 'LIVE_SESSION',
      'EXPERT_INTERVIEW': 'VIDEO',
      'WORKSHOP': 'LIVE_SESSION',
      'ROLE_PLAY': 'LIVE_SESSION',
    };
    return mapping[type] || 'VIDEO';
  }

  async generateAllMBACourses(instructorId: string): Promise<{
    strategy: Course;
    leadership: Course;
    finance: Course;
    operations: Course;
  }> {
    const [strategy, leadership, finance, operations] = await Promise.all([
      this.generateCourse(this.getStrategyFundamentalsTemplate(), instructorId),
      this.generateCourse(this.getLeadershipManagementTemplate(), instructorId),
      this.generateCourse(this.getFinanceForManagersTemplate(), instructorId),
      this.generateCourse(this.getOperationsExcellenceTemplate(), instructorId),
    ]);

    return { strategy, leadership, finance, operations };
  }

  // ===== CASE STUDIES =====

  private initializeDefaultCaseStudies(): void {
    const defaultCases: CaseStudy[] = [
      {
        id: 'cs-emag-transformation',
        title: 'eMAG: De la Lider Local la Campion Regional',
        company: 'eMAG',
        industry: 'E-commerce / Retail',
        country: 'România',
        yearPublished: 2023,
        difficulty: 'INTERMEDIATE',
        type: 'DECISION',
        synopsis: `eMAG, cel mai mare retailer online din România, se confruntă cu o decizie
          strategică crucială: cum să răspundă la intrarea Amazon pe piața est-europeană.
          Studiul de caz explorează opțiunile strategice disponibile: apărare agresivă,
          diferențiere, expansiune regională sau parteneriat strategic.`,
        learningObjectives: [
          'Aplicarea Porter\'s Five Forces pe industria e-commerce',
          'Evaluarea opțiunilor strategice în fața unui competitor global',
          'Înțelegerea avantajelor și dezavantajelor locale',
        ],
        discussionQuestions: [
          'Care sunt cele mai mari avantaje competitive ale eMAG față de Amazon?',
          'Ce strategie ar trebui să adopte eMAG pentru următorii 5 ani?',
          'Cum poate eMAG să-și consolideze poziția în afara României?',
        ],
        teachingNotes: 'Folosiți acest caz pentru a ilustra conceptele de strategie competitivă și avantaj local.',
        duration: 90,
        pages: 15,
        tags: ['e-commerce', 'strategie', 'competiție', 'România', 'retail'],
      },
      {
        id: 'cs-dedeman-growth',
        title: 'Dedeman: Cum să Crești Organic într-o Piață Matur',
        company: 'Dedeman',
        industry: 'Retail DIY',
        country: 'România',
        yearPublished: 2022,
        difficulty: 'INTERMEDIATE',
        type: 'EVALUATIVE',
        synopsis: `Dedeman a devenit cel mai mare retailer DIY din România prin creștere
          organică și focus pe customer experience. Studiul analizează strategia de
          expansiune, cultura organizațională și abordarea față de digitalizare.`,
        learningObjectives: [
          'Înțelegerea strategiei de creștere organică',
          'Analiza avantajului competitiv în retail',
          'Evaluarea rolului culturii în succes',
        ],
        discussionQuestions: [
          'Ce a făcut Dedeman diferit față de competitori?',
          'Este modelul Dedeman replicabil în alte industrii?',
          'Ce provocări va întâmpina Dedeman în următorii ani?',
        ],
        teachingNotes: 'Caz excelent pentru discuții despre strategie generică și diferențiere.',
        duration: 75,
        pages: 12,
        tags: ['retail', 'creștere organică', 'cultură', 'România'],
      },
      {
        id: 'cs-uipath-unicorn',
        title: 'UiPath: Călătoria de la Startup Bucureștean la Unicorn Global',
        company: 'UiPath',
        industry: 'Software / RPA',
        country: 'România / SUA',
        yearPublished: 2023,
        difficulty: 'ADVANCED',
        type: 'DESCRIPTIVE',
        synopsis: `UiPath a devenit cel mai valoros startup românesc din istorie, atingând
          o evaluare de peste $35 miliarde. Studiul explorează pivoturile strategice,
          modelul de go-to-market, și deciziile de fundraising care au condus la succes.`,
        learningObjectives: [
          'Înțelegerea strategiei de platform business',
          'Analiza decision-making în scaling rapid',
          'Evaluarea trade-offs în strategia de fundraising',
        ],
        discussionQuestions: [
          'Care au fost pivoturile cheie în evoluția UiPath?',
          'Cum a contribuit modelul community-led growth la succes?',
          'Ce lecții pot învăța alte startup-uri românești?',
        ],
        teachingNotes: 'Folosiți pentru discuții despre inovare în modele de afaceri și scalare globală.',
        duration: 120,
        pages: 20,
        tags: ['startup', 'unicorn', 'RPA', 'software', 'scalare'],
      },
      {
        id: 'cs-bt-digital',
        title: 'Banca Transilvania: Transformarea Digitală în Banking',
        company: 'Banca Transilvania',
        industry: 'Banking / Fintech',
        country: 'România',
        yearPublished: 2023,
        difficulty: 'INTERMEDIATE',
        type: 'PROBLEM_SOLVING',
        synopsis: `Banca Transilvania se confruntă cu presiunea disrupției fintech și
          schimbarea comportamentului clienților. Studiul analizează strategia digitală,
          achiziția neo, și construirea ecosistemului BT.`,
        learningObjectives: [
          'Înțelegerea transformării digitale în banking',
          'Analiza strategiei de platformă și ecosistem',
          'Evaluarea opțiunilor build vs buy vs partner',
        ],
        discussionQuestions: [
          'Cum ar trebui BT să răspundă la amenințarea neobanks?',
          'Este achiziția neobanks o strategie bună?',
          'Cum poate BT să mențină relevanța pentru generația Z?',
        ],
        teachingNotes: 'Caz util pentru discuții despre strategie digitală și disrupție.',
        duration: 90,
        pages: 16,
        tags: ['banking', 'digital', 'fintech', 'transformare'],
      },
    ];

    defaultCases.forEach(cs => this.caseStudies.set(cs.id, cs));
  }

  async getCaseStudies(): Promise<CaseStudy[]> {
    return Array.from(this.caseStudies.values());
  }

  async getCaseStudy(id: string): Promise<CaseStudy | undefined> {
    return this.caseStudies.get(id);
  }

  async getCaseStudiesByIndustry(industry: string): Promise<CaseStudy[]> {
    return Array.from(this.caseStudies.values())
      .filter(cs => cs.industry.toLowerCase().includes(industry.toLowerCase()));
  }

  async getCaseStudiesByDifficulty(difficulty: string): Promise<CaseStudy[]> {
    return Array.from(this.caseStudies.values())
      .filter(cs => cs.difficulty === difficulty);
  }

  async createCaseStudy(data: Omit<CaseStudy, 'id'>): Promise<CaseStudy> {
    const id = `cs-${Date.now()}`;
    const caseStudy: CaseStudy = { id, ...data };
    this.caseStudies.set(id, caseStudy);
    return caseStudy;
  }

  // ===== DISCUSSION FORUMS =====

  async createForum(data: Omit<DiscussionForum, 'id' | 'posts' | 'createdAt'>): Promise<DiscussionForum> {
    const id = `forum-${Date.now()}`;
    const forum: DiscussionForum = {
      id,
      ...data,
      posts: [],
      createdAt: new Date(),
    };
    this.forums.set(id, forum);
    return forum;
  }

  async getForumsByCourse(courseId: string): Promise<DiscussionForum[]> {
    return Array.from(this.forums.values())
      .filter(f => f.courseId === courseId);
  }

  async getForum(id: string): Promise<DiscussionForum | undefined> {
    return this.forums.get(id);
  }

  async createPost(forumId: string, data: {
    authorId: string;
    authorName: string;
    title?: string;
    content: string;
    parentId?: string;
  }): Promise<ForumPost> {
    const forum = this.forums.get(forumId);
    if (!forum) {
      throw new Error('Forum not found');
    }

    const post: ForumPost = {
      id: `post-${Date.now()}`,
      forumId,
      ...data,
      likes: 0,
      replies: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.posts.set(post.id, post);

    if (data.parentId) {
      const parentPost = this.posts.get(data.parentId);
      if (parentPost) {
        parentPost.replies.push(post);
      }
    } else {
      forum.posts.push(post);
    }

    return post;
  }

  async likePost(postId: string): Promise<ForumPost> {
    const post = this.posts.get(postId);
    if (!post) {
      throw new Error('Post not found');
    }
    post.likes++;
    return post;
  }

  // ===== MBA MICRO-CREDENTIALS =====

  private initializeDefaultCredentials(): void {
    const defaultCredentials: MBAMicroCredential[] = [
      {
        id: 'mba-mc-business-fundamentals',
        name: 'MBA Micro-Credential: Business Fundamentals',
        description: 'Fundamente de business pentru profesioniști non-MBA',
        category: 'GENERAL_MANAGEMENT',
        requiredCourses: ['finance-for-managers'],
        optionalCourses: ['strategy-fundamentals', 'leadership-management', 'operations-excellence'],
        minOptionalRequired: 1,
        totalCredits: 8,
        capstoneRequired: false,
        digitalBadgeUrl: '/badges/mba-fundamentals.png',
        linkedInShareable: true,
        validityYears: 3,
      },
      {
        id: 'mba-mc-strategic-leadership',
        name: 'MBA Micro-Credential: Strategic Leadership',
        description: 'Program avansat pentru lideri și manageri strategici',
        category: 'LEADERSHIP',
        requiredCourses: ['strategy-fundamentals', 'leadership-management'],
        optionalCourses: ['finance-for-managers', 'operations-excellence'],
        minOptionalRequired: 1,
        totalCredits: 14,
        capstoneRequired: true,
        capstoneDescription: 'Dezvoltarea unui plan strategic pentru organizația sau departamentul tău',
        digitalBadgeUrl: '/badges/strategic-leadership.png',
        linkedInShareable: true,
        validityYears: 3,
      },
      {
        id: 'mba-mc-operational-excellence',
        name: 'MBA Micro-Credential: Operational Excellence',
        description: 'Specializare în excelență operațională și lean management',
        category: 'OPERATIONS',
        requiredCourses: ['operations-excellence'],
        optionalCourses: ['finance-for-managers', 'strategy-fundamentals'],
        minOptionalRequired: 1,
        totalCredits: 10,
        capstoneRequired: true,
        capstoneDescription: 'Completarea unui proiect de îmbunătățire cu rezultate măsurabile',
        digitalBadgeUrl: '/badges/operational-excellence.png',
        linkedInShareable: true,
        validityYears: 3,
      },
      {
        id: 'mba-mc-complete',
        name: 'MBA Micro-Credential: Complete Program',
        description: 'Programul complet MBA micro-credential',
        category: 'COMPREHENSIVE',
        requiredCourses: ['strategy-fundamentals', 'leadership-management', 'finance-for-managers', 'operations-excellence'],
        optionalCourses: [],
        minOptionalRequired: 0,
        totalCredits: 17,
        capstoneRequired: true,
        capstoneDescription: 'Proiect integrat demonstrând competențe în toate ariile',
        digitalBadgeUrl: '/badges/mba-complete.png',
        linkedInShareable: true,
        validityYears: 5,
      },
    ];

    defaultCredentials.forEach(mc => this.mbaCredentials.set(mc.id, mc));
  }

  async getMBACredentials(): Promise<MBAMicroCredential[]> {
    return Array.from(this.mbaCredentials.values());
  }

  async getMBACredential(id: string): Promise<MBAMicroCredential | undefined> {
    return this.mbaCredentials.get(id);
  }

  async checkCredentialEligibility(userId: string, credentialId: string): Promise<{
    eligible: boolean;
    completedRequired: string[];
    missingRequired: string[];
    completedOptional: string[];
    optionalNeeded: number;
    capstoneNeeded: boolean;
  }> {
    const credential = this.mbaCredentials.get(credentialId);
    if (!credential) {
      throw new Error('Credential not found');
    }

    // Get user's completed courses (would integrate with LMS enrollment data)
    const userCourses = await this.lmsService.getUserEnrollments(userId);
    const completedSlugs = userCourses
      .filter(e => e.status === 'COMPLETED')
      .map(e => e.courseId); // In real impl, would be course slug

    const completedRequired = credential.requiredCourses.filter(c => completedSlugs.includes(c));
    const missingRequired = credential.requiredCourses.filter(c => !completedSlugs.includes(c));
    const completedOptional = credential.optionalCourses.filter(c => completedSlugs.includes(c));
    const optionalNeeded = Math.max(0, credential.minOptionalRequired - completedOptional.length);

    const progress = this.userProgress.get(`${userId}-${credentialId}`);
    const capstoneNeeded = credential.capstoneRequired &&
      (!progress || progress.capstoneStatus !== 'APPROVED');

    const eligible = missingRequired.length === 0 &&
      optionalNeeded === 0 &&
      !capstoneNeeded;

    return {
      eligible,
      completedRequired,
      missingRequired,
      completedOptional,
      optionalNeeded,
      capstoneNeeded,
    };
  }

  async startCapstoneProject(userId: string, credentialId: string): Promise<UserMBAProgress> {
    const key = `${userId}-${credentialId}`;
    let progress = this.userProgress.get(key);

    if (!progress) {
      progress = {
        id: `progress-${Date.now()}`,
        userId,
        credentialId,
        completedCourses: [],
        capstoneStatus: 'IN_PROGRESS',
      };
    } else {
      progress.capstoneStatus = 'IN_PROGRESS';
    }

    this.userProgress.set(key, progress);
    return progress;
  }

  async submitCapstone(userId: string, credentialId: string, documentUrl: string): Promise<UserMBAProgress> {
    const key = `${userId}-${credentialId}`;
    const progress = this.userProgress.get(key);

    if (!progress) {
      throw new Error('No progress record found');
    }

    progress.capstoneStatus = 'SUBMITTED';
    progress.capstoneSubmission = {
      submittedAt: new Date(),
      documentUrl,
    };

    return progress;
  }

  async awardMBACredential(userId: string, credentialId: string): Promise<UserMBAProgress> {
    const key = `${userId}-${credentialId}`;
    let progress = this.userProgress.get(key);

    if (!progress) {
      progress = {
        id: `progress-${Date.now()}`,
        userId,
        credentialId,
        completedCourses: [],
        capstoneStatus: 'NOT_STARTED',
      };
    }

    progress.earnedAt = new Date();
    progress.verificationCode = `MBA-${credentialId.toUpperCase().slice(0, 4)}-${Date.now().toString(36).toUpperCase()}`;
    progress.certificateUrl = `/certificates/mba/${progress.verificationCode}.pdf`;

    this.userProgress.set(key, progress);
    return progress;
  }

  async getUserMBACredentials(userId: string): Promise<UserMBAProgress[]> {
    return Array.from(this.userProgress.values())
      .filter(p => p.userId === userId && p.earnedAt);
  }

  async verifyMBACredential(verificationCode: string): Promise<UserMBAProgress | null> {
    const progress = Array.from(this.userProgress.values())
      .find(p => p.verificationCode === verificationCode);
    return progress || null;
  }

  // ===== EXECUTIVE COACHING =====

  private initializeDefaultCoaches(): void {
    const defaultCoaches: ExecutiveCoach[] = [
      {
        id: 'coach-1',
        name: 'Maria Ionescu',
        title: 'Executive Coach & Former CFO',
        company: 'Leadership Partners Romania',
        bio: '20+ ani experiență în leadership executiv, fost CFO la companii multinaționale',
        expertise: ['Finance', 'Strategy', 'Executive Presence', 'Career Transitions'],
        languages: ['RO', 'EN'],
        hourlyRate: 300,
        availability: [
          { dayOfWeek: 1, startHour: 9, endHour: 17 },
          { dayOfWeek: 3, startHour: 9, endHour: 17 },
          { dayOfWeek: 5, startHour: 9, endHour: 13 },
        ],
        rating: 4.9,
        sessionsCompleted: 450,
      },
      {
        id: 'coach-2',
        name: 'Alexandru Popescu',
        title: 'Leadership Development Expert',
        company: 'Independent',
        bio: 'Fost HR Director, specialist în dezvoltarea liderilor și coaching de echipă',
        expertise: ['Leadership', 'Team Development', 'Conflict Resolution', 'Change Management'],
        languages: ['RO', 'EN', 'DE'],
        hourlyRate: 250,
        availability: [
          { dayOfWeek: 2, startHour: 10, endHour: 18 },
          { dayOfWeek: 4, startHour: 10, endHour: 18 },
        ],
        rating: 4.8,
        sessionsCompleted: 320,
      },
    ];

    defaultCoaches.forEach(c => this.coaches.set(c.id, c));
  }

  async getCoaches(): Promise<ExecutiveCoach[]> {
    return Array.from(this.coaches.values());
  }

  async getCoach(id: string): Promise<ExecutiveCoach | undefined> {
    return this.coaches.get(id);
  }

  async getCoachesByExpertise(expertise: string): Promise<ExecutiveCoach[]> {
    return Array.from(this.coaches.values())
      .filter(c => c.expertise.some(e => e.toLowerCase().includes(expertise.toLowerCase())));
  }

  async bookCoachingSession(data: Omit<CoachingSession, 'id' | 'status'>): Promise<CoachingSession> {
    const coach = this.coaches.get(data.coachId);
    if (!coach) {
      throw new Error('Coach not found');
    }

    const session: CoachingSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      status: 'SCHEDULED',
    };

    this.sessions.set(session.id, session);
    return session;
  }

  async getUserCoachingSessions(userId: string): Promise<CoachingSession[]> {
    return Array.from(this.sessions.values())
      .filter(s => s.userId === userId);
  }

  async completeCoachingSession(sessionId: string, notes: string, feedback?: { rating: number; comment: string }): Promise<CoachingSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.status = 'COMPLETED';
    session.notes = notes;
    if (feedback) {
      session.feedback = feedback;
      // Update coach rating
      const coach = this.coaches.get(session.coachId);
      if (coach) {
        const totalRating = coach.rating * coach.sessionsCompleted + feedback.rating;
        coach.sessionsCompleted++;
        coach.rating = totalRating / coach.sessionsCompleted;
      }
    }

    return session;
  }

  // ===== LEARNING PATHS =====

  getMBALearningPaths(): { pathId: string; name: string; description: string; courses: string[]; duration: string; credential: string }[] {
    return [
      {
        pathId: 'path-general-management',
        name: 'General Management Track',
        description: 'Fundamente comprehensive pentru manageri generaliști',
        courses: ['finance-for-managers', 'leadership-management', 'strategy-fundamentals'],
        duration: '22 săptămâni',
        credential: 'mba-mc-business-fundamentals',
      },
      {
        pathId: 'path-strategic-leader',
        name: 'Strategic Leadership Track',
        description: 'Pentru lideri care doresc roluri de top management',
        courses: ['strategy-fundamentals', 'leadership-management', 'finance-for-managers'],
        duration: '22 săptămâni',
        credential: 'mba-mc-strategic-leadership',
      },
      {
        pathId: 'path-operations',
        name: 'Operations Excellence Track',
        description: 'Specializare în eficiență operațională și Lean Six Sigma',
        courses: ['operations-excellence', 'finance-for-managers'],
        duration: '14 săptămâni',
        credential: 'mba-mc-operational-excellence',
      },
      {
        pathId: 'path-complete-mba',
        name: 'Complete MBA Micro-Credential',
        description: 'Programul complet acoperind toate ariile manageriale',
        courses: ['strategy-fundamentals', 'leadership-management', 'finance-for-managers', 'operations-excellence'],
        duration: '30 săptămâni',
        credential: 'mba-mc-complete',
      },
    ];
  }

  // ===== CORPORATE TRAINING =====

  getCorporatePackages(): {
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
        packageId: 'corp-emerging-leaders',
        name: 'Emerging Leaders Program',
        description: 'Program pentru viitorii manageri și high-potentials',
        courses: ['leadership-management', 'finance-for-managers'],
        participants: { min: 10, max: 25 },
        pricePerPerson: 599,
        features: [
          'Cohortă dedicată companiei',
          'Customizare conținut 20%',
          '2 sesiuni de coaching de grup',
          'Raport de progres lunar',
          'Certificare brandată',
        ],
      },
      {
        packageId: 'corp-executive-development',
        name: 'Executive Development Program',
        description: 'Program intensiv pentru manageri seniori',
        courses: ['strategy-fundamentals', 'leadership-management', 'finance-for-managers'],
        participants: { min: 8, max: 15 },
        pricePerPerson: 1299,
        features: [
          'Cohortă dedicată companiei',
          'Customizare conținut 40%',
          '4 sesiuni de coaching individual',
          'Case study personalizat pe companie',
          'Prezentare finală către leadership',
          'Alumni network access',
        ],
      },
      {
        packageId: 'corp-operations-transformation',
        name: 'Operations Transformation',
        description: 'Program pentru transformare operațională',
        courses: ['operations-excellence'],
        participants: { min: 15, max: 30 },
        pricePerPerson: 449,
        features: [
          'Training on-site opțional',
          'Proiecte aplicate pe procese reale',
          'Suport implementare 3 luni',
          'Certificare Lean/Six Sigma Yellow Belt',
          'ROI tracking',
        ],
      },
    ];
  }

  // ===== TEST HELPERS =====

  resetState(): void {
    this.caseStudies.clear();
    this.forums.clear();
    this.posts.clear();
    this.mbaCredentials.clear();
    this.userProgress.clear();
    this.coaches.clear();
    this.sessions.clear();
    this.initializeDefaultCaseStudies();
    this.initializeDefaultCredentials();
    this.initializeDefaultCoaches();
  }
}
