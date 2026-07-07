import { Injectable } from '@nestjs/common';
import { LMSService, Course, Assessment, Question } from './lms.service';

// Project Management & Agile Certification Service
// PMP-aligned courses, Agile/Scrum certification, practice exams, micro-credentials

export interface PMCourseTemplate {
  title: string;
  description: string;
  shortDescription: string;
  category: 'PROJECT_MANAGEMENT';
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  language: string;
  learningOutcomes: string[];
  targetAudience: string[];
  prerequisites: string[];
  price: number;
  currency: string;
  ceuCredits: number;
  pduCredits?: number; // Professional Development Units for PMP
  hrdaEligible: boolean;
  modules: PMModuleTemplate[];
}

export interface PMModuleTemplate {
  title: string;
  description: string;
  isFree?: boolean;
  lessons: PMLessonTemplate[];
  assessment?: PMAssessmentTemplate;
}

export interface PMLessonTemplate {
  title: string;
  description: string;
  type: 'VIDEO' | 'TEXT' | 'DOWNLOAD' | 'QUIZ' | 'CASE_STUDY';
  duration: number;
  isFree?: boolean;
  isPreview?: boolean;
  content: {
    videoUrl?: string;
    textContent?: string;
    downloadUrl?: string;
    downloadFilename?: string;
    caseStudy?: CaseStudy;
  };
}

export interface PMAssessmentTemplate {
  title: string;
  description: string;
  type: 'QUIZ' | 'PRACTICE_EXAM' | 'SIMULATION';
  passingScore: number;
  timeLimit?: number;
  questions: Question[];
}

export interface CaseStudy {
  id: string;
  title: string;
  scenario: string;
  stakeholders: string[];
  constraints: string[];
  questions: string[];
  bestPractices: string[];
}

export interface MicroCredential {
  id: string;
  name: string;
  description: string;
  category: 'PROJECT_MANAGEMENT' | 'AGILE' | 'LEADERSHIP' | 'TECHNICAL';
  level: 'FOUNDATION' | 'PRACTITIONER' | 'EXPERT';
  requiredCourses: string[];
  requiredAssessments: string[];
  skills: string[];
  badgeIcon: string;
  validityMonths: number;
  industryRecognition: string[];
  createdAt: Date;
}

export interface UserMicroCredential {
  id: string;
  userId: string;
  credentialId: string;
  credential: MicroCredential;
  earnedAt: Date;
  expiresAt: Date;
  verificationCode: string;
  verificationUrl: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
}

export interface PracticeExam {
  id: string;
  title: string;
  description: string;
  examType: 'PMP' | 'CAPM' | 'PSM' | 'CSM' | 'PMI_ACP' | 'PRINCE2';
  questions: Question[];
  totalQuestions: number;
  passingScore: number;
  timeLimit: number; // minutes
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXAM_LEVEL';
  domain?: string; // For domain-specific practice
  createdAt: Date;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  userId: string;
  answers: { questionId: string; answer: string | string[]; timeSpent: number }[];
  score: number;
  percentage: number;
  passed: boolean;
  startedAt: Date;
  completedAt?: Date;
  totalTime: number;
  domainScores?: Record<string, number>;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  methodology: 'WATERFALL' | 'AGILE' | 'HYBRID' | 'PRINCE2';
  industry?: string;
  phases: ProjectPhase[];
  artifacts: ProjectArtifact[];
  roles: string[];
  estimatedDuration: string;
}

export interface ProjectPhase {
  name: string;
  description: string;
  deliverables: string[];
  milestones: string[];
  tools: string[];
}

export interface ProjectArtifact {
  name: string;
  description: string;
  templateUrl?: string;
  category: 'INITIATION' | 'PLANNING' | 'EXECUTION' | 'MONITORING' | 'CLOSING';
}

@Injectable()
export class PMAgileCoursesService {
  // In-memory storage
  private microCredentials = new Map<string, MicroCredential>();
  private userCredentials = new Map<string, UserMicroCredential>();
  private practiceExams = new Map<string, PracticeExam>();
  private examAttempts = new Map<string, ExamAttempt>();
  private projectTemplates = new Map<string, ProjectTemplate>();
  private generatedCourses = new Map<string, string>();

  constructor(private lmsService: LMSService) {
    this.initializeDefaultCredentials();
    this.initializeProjectTemplates();
  }

  resetState(): void {
    this.microCredentials.clear();
    this.userCredentials.clear();
    this.practiceExams.clear();
    this.examAttempts.clear();
    this.projectTemplates.clear();
    this.generatedCourses.clear();
    this.initializeDefaultCredentials();
    this.initializeProjectTemplates();
  }

  private initializeDefaultCredentials(): void {
    const credentials: Omit<MicroCredential, 'id' | 'createdAt'>[] = [
      {
        name: 'Project Management Fundamentals',
        description: 'Foundation-level understanding of project management principles',
        category: 'PROJECT_MANAGEMENT',
        level: 'FOUNDATION',
        requiredCourses: ['pm-fundamentals'],
        requiredAssessments: ['pm-fundamentals-exam'],
        skills: ['Project Planning', 'Stakeholder Management', 'Risk Management', 'Schedule Management'],
        badgeIcon: '📊',
        validityMonths: 36,
        industryRecognition: ['PMI', 'IPMA'],
      },
      {
        name: 'Agile Practitioner',
        description: 'Demonstrated ability to apply Agile methodologies in projects',
        category: 'AGILE',
        level: 'PRACTITIONER',
        requiredCourses: ['agile-scrum'],
        requiredAssessments: ['agile-practitioner-exam'],
        skills: ['Scrum', 'Kanban', 'Sprint Planning', 'Retrospectives', 'User Stories'],
        badgeIcon: '🔄',
        validityMonths: 24,
        industryRecognition: ['Scrum Alliance', 'Scrum.org'],
      },
      {
        name: 'PMP Exam Ready',
        description: 'Completed comprehensive PMP preparation with practice exams',
        category: 'PROJECT_MANAGEMENT',
        level: 'EXPERT',
        requiredCourses: ['pmp-prep'],
        requiredAssessments: ['pmp-practice-1', 'pmp-practice-2', 'pmp-practice-3'],
        skills: ['All PMP Domains', 'Predictive PM', 'Agile PM', 'Hybrid PM'],
        badgeIcon: '🏆',
        validityMonths: 12,
        industryRecognition: ['PMI'],
      },
      {
        name: 'Scrum Master Certified',
        description: 'Mastery of Scrum framework and servant leadership',
        category: 'AGILE',
        level: 'EXPERT',
        requiredCourses: ['scrum-master'],
        requiredAssessments: ['psm-practice-exam'],
        skills: ['Scrum Framework', 'Servant Leadership', 'Facilitation', 'Coaching'],
        badgeIcon: '🎯',
        validityMonths: 24,
        industryRecognition: ['Scrum.org', 'Scrum Alliance'],
      },
    ];

    credentials.forEach((cred, index) => {
      const id = `mc-${cred.name.toLowerCase().replace(/\s+/g, '-')}`;
      this.microCredentials.set(id, { ...cred, id, createdAt: new Date() });
    });
  }

  private initializeProjectTemplates(): void {
    const templates: Omit<ProjectTemplate, 'id'>[] = [
      {
        name: 'Software Development Project',
        description: 'Complete template for software development using Agile methodology',
        methodology: 'AGILE',
        industry: 'Technology',
        phases: [
          {
            name: 'Discovery',
            description: 'Understand requirements and define product vision',
            deliverables: ['Product Vision', 'Initial Backlog', 'Team Charter'],
            milestones: ['Vision Approved', 'Team Formed'],
            tools: ['User Story Mapping', 'Impact Mapping'],
          },
          {
            name: 'Sprint 0',
            description: 'Setup infrastructure and refine initial backlog',
            deliverables: ['Development Environment', 'Refined Backlog', 'Definition of Done'],
            milestones: ['Environment Ready', 'Sprint Planning Complete'],
            tools: ['Jira', 'Confluence', 'Git'],
          },
          {
            name: 'Iterative Development',
            description: 'Execute sprints to deliver increments',
            deliverables: ['Working Increments', 'Sprint Reports', 'Updated Documentation'],
            milestones: ['Sprint Reviews', 'Release Candidates'],
            tools: ['CI/CD Pipeline', 'Automated Testing'],
          },
          {
            name: 'Release',
            description: 'Deploy and transition to operations',
            deliverables: ['Production Release', 'User Documentation', 'Training Materials'],
            milestones: ['Go-Live', 'Handover Complete'],
            tools: ['Deployment Scripts', 'Monitoring Tools'],
          },
        ],
        artifacts: [
          { name: 'Product Backlog', description: 'Prioritized list of features', category: 'PLANNING' },
          { name: 'Sprint Backlog', description: 'Work committed for current sprint', category: 'EXECUTION' },
          { name: 'Burndown Chart', description: 'Progress tracking visualization', category: 'MONITORING' },
          { name: 'Retrospective Notes', description: 'Continuous improvement insights', category: 'CLOSING' },
        ],
        roles: ['Product Owner', 'Scrum Master', 'Development Team', 'Stakeholders'],
        estimatedDuration: '3-6 months',
      },
      {
        name: 'Construction Project',
        description: 'Traditional waterfall template for construction projects',
        methodology: 'WATERFALL',
        industry: 'Construction',
        phases: [
          {
            name: 'Initiation',
            description: 'Define project scope and feasibility',
            deliverables: ['Project Charter', 'Feasibility Study', 'Stakeholder Register'],
            milestones: ['Project Approved'],
            tools: ['Feasibility Analysis', 'Stakeholder Analysis'],
          },
          {
            name: 'Planning',
            description: 'Detailed planning of all project aspects',
            deliverables: ['Project Plan', 'WBS', 'Schedule', 'Budget', 'Risk Register'],
            milestones: ['Plan Approved', 'Contracts Signed'],
            tools: ['MS Project', 'Primavera', 'Cost Estimation'],
          },
          {
            name: 'Execution',
            description: 'Construct according to plans',
            deliverables: ['Completed Work Packages', 'Quality Reports', 'Progress Reports'],
            milestones: ['Foundation Complete', 'Structure Complete', 'MEP Complete'],
            tools: ['BIM', 'Quality Inspections'],
          },
          {
            name: 'Monitoring & Control',
            description: 'Track progress and manage changes',
            deliverables: ['Status Reports', 'Change Requests', 'Earned Value Reports'],
            milestones: ['Phase Gates'],
            tools: ['EVM', 'Change Control Board'],
          },
          {
            name: 'Closing',
            description: 'Handover and project closure',
            deliverables: ['Final Inspection', 'As-Built Documents', 'Lessons Learned'],
            milestones: ['Final Acceptance', 'Project Closed'],
            tools: ['Punch List', 'Closure Checklist'],
          },
        ],
        artifacts: [
          { name: 'Project Charter', description: 'Authorization document', category: 'INITIATION' },
          { name: 'WBS', description: 'Work breakdown structure', category: 'PLANNING' },
          { name: 'Gantt Chart', description: 'Schedule visualization', category: 'PLANNING' },
          { name: 'Risk Register', description: 'Risk tracking document', category: 'PLANNING' },
          { name: 'Change Log', description: 'Record of approved changes', category: 'MONITORING' },
        ],
        roles: ['Project Manager', 'Site Manager', 'Engineers', 'Contractors', 'Client'],
        estimatedDuration: '12-24 months',
      },
      {
        name: 'Digital Transformation Initiative',
        description: 'Hybrid approach for organizational change projects',
        methodology: 'HYBRID',
        industry: 'Cross-Industry',
        phases: [
          {
            name: 'Assessment',
            description: 'Evaluate current state and define target state',
            deliverables: ['Current State Analysis', 'Target State Vision', 'Gap Analysis'],
            milestones: ['Assessment Complete'],
            tools: ['SWOT', 'Process Mapping', 'Maturity Models'],
          },
          {
            name: 'Strategy',
            description: 'Define transformation roadmap',
            deliverables: ['Transformation Roadmap', 'Business Case', 'Governance Model'],
            milestones: ['Strategy Approved', 'Funding Secured'],
            tools: ['Roadmapping', 'Benefits Realization Planning'],
          },
          {
            name: 'Implementation Waves',
            description: 'Execute in iterative waves with quick wins',
            deliverables: ['Wave Deliverables', 'Change Adoption Metrics', 'Training Completion'],
            milestones: ['Wave Completions', 'Quick Wins Delivered'],
            tools: ['Agile Ceremonies', 'Change Management'],
          },
          {
            name: 'Sustainment',
            description: 'Embed changes and continuous improvement',
            deliverables: ['Operating Model', 'KPI Dashboard', 'Continuous Improvement Plan'],
            milestones: ['Steady State Achieved'],
            tools: ['Performance Dashboards', 'Feedback Loops'],
          },
        ],
        artifacts: [
          { name: 'Business Case', description: 'Justification for transformation', category: 'INITIATION' },
          { name: 'Roadmap', description: 'Multi-wave implementation plan', category: 'PLANNING' },
          { name: 'Change Impact Assessment', description: 'People impact analysis', category: 'PLANNING' },
          { name: 'Benefits Tracker', description: 'ROI and benefits tracking', category: 'MONITORING' },
        ],
        roles: ['Transformation Lead', 'Change Manager', 'Workstream Leads', 'Executive Sponsor'],
        estimatedDuration: '18-36 months',
      },
    ];

    templates.forEach((template, index) => {
      const id = `pt-${template.name.toLowerCase().replace(/\s+/g, '-')}`;
      this.projectTemplates.set(id, { ...template, id });
    });
  }

  // ===== PMP FUNDAMENTALS COURSE =====

  getPMPFundamentalsTemplate(): PMCourseTemplate {
    return {
      title: 'Project Management Fundamentals (PMP-Aligned)',
      description: `Curs complet de Management de Proiect aliniat cu standardele PMI și ghidul PMBOK 7th Edition.

      Acest curs acoperă toate domeniile de cunoaștere PM:
      - Inițierea și planificarea proiectelor
      - Managementul scopului, timpului și costurilor
      - Managementul calității și riscurilor
      - Comunicare și stakeholder management
      - Procurement și integrare

      Ideal pentru pregătirea examenului CAPM sau ca fundație pentru PMP.`,
      shortDescription: 'Management de proiect profesional - fundamente PMBOK și pregătire CAPM',
      category: 'PROJECT_MANAGEMENT',
      level: 'INTERMEDIATE',
      language: 'ro',
      learningOutcomes: [
        'Înțelege ciclul de viață al proiectelor',
        'Aplică procesele de management conform PMBOK',
        'Creează documente de proiect profesionale',
        'Gestionează stakeholderi și comunicarea',
        'Identifică și gestionează riscurile',
        'Controlează scope, schedule și cost',
      ],
      targetAudience: [
        'Aspiranți Project Manager',
        'Team Leads care gestionează proiecte',
        'Profesioniști IT care vor certificare',
        'Manageri operaționali',
        'Consultanți de business',
      ],
      prerequisites: [
        'Experiență minimă de lucru în echipe',
        'Înțelegere de bază a proceselor de business',
      ],
      price: 399,
      currency: 'RON',
      ceuCredits: 4,
      pduCredits: 35,
      hrdaEligible: true,
      modules: [
        {
          title: 'Modulul 1: Introducere în Project Management',
          description: 'Fundamente și concepte cheie în PM',
          isFree: true,
          lessons: [
            {
              title: '1.1 Ce este un proiect și project management',
              description: 'Definiții, caracteristici, și diferența față de operațiuni',
              type: 'VIDEO',
              duration: 12,
              isFree: true,
              isPreview: true,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pm-fundamentals/1-1-intro.mp4' },
            },
            {
              title: '1.2 Rolul Project Manager-ului',
              description: 'Responsabilități, competențe și soft skills esențiale',
              type: 'VIDEO',
              duration: 15,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pm-fundamentals/1-2-pm-role.mp4' },
            },
            {
              title: '1.3 PMI, PMBOK și standardele globale',
              description: 'Organizații profesionale și ghiduri de bune practici',
              type: 'VIDEO',
              duration: 10,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pm-fundamentals/1-3-pmi-pmbok.mp4' },
            },
            {
              title: '1.4 Ciclul de viață al proiectului',
              description: 'Fazele proiectului: Inițiere, Planificare, Execuție, Monitorizare, Închidere',
              type: 'VIDEO',
              duration: 18,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pm-fundamentals/1-4-lifecycle.mp4' },
            },
            {
              title: 'Glosar termeni PM',
              description: 'Dicționar cu termenii esențiali în project management',
              type: 'DOWNLOAD',
              duration: 10,
              content: {
                downloadUrl: 'https://cdn.documentiulia.ro/courses/pm-fundamentals/pm-glossary.pdf',
                downloadFilename: 'PM-Glossary-RO.pdf',
              },
            },
          ],
          assessment: {
            title: 'Quiz Modul 1: Fundamente PM',
            description: 'Verifică înțelegerea conceptelor de bază',
            type: 'QUIZ',
            passingScore: 70,
            timeLimit: 15,
            questions: this.generatePMQuizQuestions('fundamentals'),
          },
        },
        {
          title: 'Modulul 2: Inițierea Proiectului',
          description: 'Cum pornești corect un proiect',
          lessons: [
            {
              title: '2.1 Business Case și justificarea proiectului',
              description: 'De ce facem acest proiect? Analiza cost-beneficiu',
              type: 'VIDEO',
              duration: 15,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pm-fundamentals/2-1-business-case.mp4' },
            },
            {
              title: '2.2 Project Charter - docul de autorizare',
              description: 'Structura și importanța Project Charter-ului',
              type: 'VIDEO',
              duration: 20,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pm-fundamentals/2-2-charter.mp4' },
            },
            {
              title: '2.3 Identificarea stakeholderilor',
              description: 'Cine sunt părțile interesate și cum le analizăm',
              type: 'VIDEO',
              duration: 18,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pm-fundamentals/2-3-stakeholders.mp4' },
            },
            {
              title: '2.4 Exercițiu: Creează un Project Charter',
              description: 'Aplică ce ai învățat pe un caz practic',
              type: 'TEXT',
              duration: 30,
              content: {
                textContent: `# Exercițiu Practic: Project Charter

## Scenariu
Compania ABC dorește să implementeze un nou sistem CRM pentru a îmbunătăți relațiile cu clienții.

## Cerințe
Completează un Project Charter care include:
1. Titlul și descrierea proiectului
2. Obiectivele SMART
3. Scope la nivel înalt (ce include și ce exclude)
4. Stakeholderii principali
5. Riscurile inițiale identificate
6. Bugetul estimat și timeline
7. Criteriile de succes
8. Semnăturile de aprobare

## Template
Descarcă template-ul Project Charter și completează-l.`,
              },
            },
            {
              title: 'Template Project Charter',
              description: 'Template editabil pentru Project Charter',
              type: 'DOWNLOAD',
              duration: 5,
              content: {
                downloadUrl: 'https://cdn.documentiulia.ro/courses/pm-fundamentals/project-charter-template.docx',
                downloadFilename: 'Project-Charter-Template.docx',
              },
            },
          ],
        },
        {
          title: 'Modulul 3: Planificarea Proiectului',
          description: 'Dezvoltarea planului comprehensiv de proiect',
          lessons: [
            {
              title: '3.1 Project Management Plan - overview',
              description: 'Componentele planului integrat de management',
              type: 'VIDEO',
              duration: 15,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pm-fundamentals/3-1-pm-plan.mp4' },
            },
            {
              title: '3.2 Definirea scopului - WBS',
              description: 'Work Breakdown Structure și descompunerea muncii',
              type: 'VIDEO',
              duration: 25,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pm-fundamentals/3-2-wbs.mp4' },
            },
            {
              title: '3.3 Planificarea timpului - Schedule',
              description: 'Secvențierea activităților și estimarea duratelor',
              type: 'VIDEO',
              duration: 22,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pm-fundamentals/3-3-schedule.mp4' },
            },
            {
              title: '3.4 Diagrama Gantt și Critical Path',
              description: 'Vizualizarea schedule-ului și calea critică',
              type: 'VIDEO',
              duration: 20,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pm-fundamentals/3-4-gantt-cpm.mp4' },
            },
            {
              title: '3.5 Planificarea costurilor - Budget',
              description: 'Estimarea și agregarea costurilor proiectului',
              type: 'VIDEO',
              duration: 18,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pm-fundamentals/3-5-budget.mp4' },
            },
            {
              title: '3.6 Planificarea resurselor',
              description: 'Identificarea și alocarea resurselor umane și materiale',
              type: 'VIDEO',
              duration: 15,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pm-fundamentals/3-6-resources.mp4' },
            },
          ],
          assessment: {
            title: 'Quiz Modul 3: Planificare',
            description: 'Testează-ți cunoștințele de planificare',
            type: 'QUIZ',
            passingScore: 70,
            timeLimit: 20,
            questions: this.generatePMQuizQuestions('planning'),
          },
        },
        {
          title: 'Modulul 4: Managementul Riscurilor',
          description: 'Identificarea, analiza și răspunsul la riscuri',
          lessons: [
            {
              title: '4.1 Ce este riscul în proiecte',
              description: 'Definiție, tipuri de riscuri și importanța managementului',
              type: 'VIDEO',
              duration: 12,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pm-fundamentals/4-1-risk-intro.mp4' },
            },
            {
              title: '4.2 Identificarea riscurilor',
              description: 'Tehnici: Brainstorming, Delphi, SWOT, Checklist',
              type: 'VIDEO',
              duration: 18,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pm-fundamentals/4-2-risk-identification.mp4' },
            },
            {
              title: '4.3 Analiza calitativă a riscurilor',
              description: 'Matricea probabilitate-impact și prioritizare',
              type: 'VIDEO',
              duration: 20,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pm-fundamentals/4-3-qualitative-analysis.mp4' },
            },
            {
              title: '4.4 Analiza cantitativă a riscurilor',
              description: 'Expected Monetary Value, simulări Monte Carlo',
              type: 'VIDEO',
              duration: 22,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pm-fundamentals/4-4-quantitative-analysis.mp4' },
            },
            {
              title: '4.5 Strategii de răspuns la riscuri',
              description: 'Evitare, Transfer, Mitigare, Acceptare (și pentru oportunități)',
              type: 'VIDEO',
              duration: 18,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pm-fundamentals/4-5-risk-response.mp4' },
            },
            {
              title: '4.6 Risk Register - studiu de caz',
              description: 'Exercițiu practic de completare Risk Register',
              type: 'TEXT',
              duration: 25,
              content: {
                textContent: `# Studiu de Caz: Risk Register

## Proiect: Lansare Produs Nou pe Piață

### Context
O companie farmaceutică lansează un nou supliment alimentar în România.

### Riscuri identificate:
1. Întârziere aprobare ANSVSA
2. Furnizor principal în insolvență
3. Concurent lansează produs similar
4. Campanie marketing ineficientă
5. Probleme de calitate la producție

### Exercițiu:
Pentru fiecare risc, completează:
- Probabilitate (1-5)
- Impact (1-5)
- Scor risc (P x I)
- Strategie de răspuns
- Owner risc
- Plan de contingență`,
              },
            },
          ],
        },
        {
          title: 'Modulul 5: Execuția și Monitorizarea',
          description: 'Livrarea și controlul proiectului',
          lessons: [
            {
              title: '5.1 Managementul echipei de proiect',
              description: 'Leadership, motivare și dezvoltarea echipei',
              type: 'VIDEO',
              duration: 18,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pm-fundamentals/5-1-team-management.mp4' },
            },
            {
              title: '5.2 Managementul comunicării',
              description: 'Plan de comunicare și reporting eficient',
              type: 'VIDEO',
              duration: 15,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pm-fundamentals/5-2-communication.mp4' },
            },
            {
              title: '5.3 Managementul calității',
              description: 'Quality Assurance vs Quality Control',
              type: 'VIDEO',
              duration: 16,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pm-fundamentals/5-3-quality.mp4' },
            },
            {
              title: '5.4 Earned Value Management (EVM)',
              description: 'Măsurarea performanței: PV, EV, AC, SPI, CPI',
              type: 'VIDEO',
              duration: 25,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pm-fundamentals/5-4-evm.mp4' },
            },
            {
              title: '5.5 Change Control',
              description: 'Gestionarea schimbărilor în proiect',
              type: 'VIDEO',
              duration: 15,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pm-fundamentals/5-5-change-control.mp4' },
            },
          ],
          assessment: {
            title: 'Quiz Modul 5: Execuție și Control',
            description: 'Testează cunoștințele de monitorizare și control',
            type: 'QUIZ',
            passingScore: 70,
            timeLimit: 20,
            questions: this.generatePMQuizQuestions('execution'),
          },
        },
        {
          title: 'Modulul 6: Închiderea Proiectului',
          description: 'Finalizarea cu succes a proiectului',
          lessons: [
            {
              title: '6.1 Procesul de închidere',
              description: 'Activități și documente de închidere',
              type: 'VIDEO',
              duration: 12,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pm-fundamentals/6-1-closing-process.mp4' },
            },
            {
              title: '6.2 Lessons Learned',
              description: 'Captarea și documentarea lecțiilor învățate',
              type: 'VIDEO',
              duration: 15,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pm-fundamentals/6-2-lessons-learned.mp4' },
            },
            {
              title: '6.3 Transferul și arhivarea',
              description: 'Predarea deliverables și arhivarea documentelor',
              type: 'VIDEO',
              duration: 10,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pm-fundamentals/6-3-handover.mp4' },
            },
          ],
        },
        {
          title: 'Examen Final',
          description: 'Evaluare comprehensivă a cunoștințelor PM',
          lessons: [
            {
              title: 'Recapitulare și pregătire examen',
              description: 'Rezumat al conceptelor cheie pentru examen',
              type: 'TEXT',
              duration: 45,
              content: {
                textContent: `# Pregătire Examen Final PM Fundamentals

## Domenii de cunoaștere (conform PMBOK):
1. **Integration Management** - coordonarea tuturor aspectelor
2. **Scope Management** - definirea și controlul scopului
3. **Schedule Management** - planificarea și controlul timpului
4. **Cost Management** - estimare, bugetare, control
5. **Quality Management** - asigurarea și controlul calității
6. **Resource Management** - echipa și resursele fizice
7. **Communications Management** - informarea stakeholderilor
8. **Risk Management** - identificare și răspuns la riscuri
9. **Procurement Management** - achiziții externe
10. **Stakeholder Management** - angajamentul părților interesate

## Format examen:
- 50 întrebări
- 90 minute
- Scor minim: 75%
- Tipuri: multiple choice, multiple select, situațional`,
              },
            },
          ],
          assessment: {
            title: 'Examen Final: PM Fundamentals',
            description: 'Examen comprehensiv pentru certificare',
            type: 'PRACTICE_EXAM',
            passingScore: 75,
            timeLimit: 90,
            questions: this.generatePMExamQuestions(50),
          },
        },
      ],
    };
  }

  // ===== AGILE SCRUM COURSE =====

  getAgileScrumTemplate(): PMCourseTemplate {
    return {
      title: 'Agile & Scrum Mastery',
      description: `Curs complet despre metodologiile Agile și framework-ul Scrum pentru echipe performante.

      Învață să:
      - Aplici principiile Agile în practică
      - Implementezi Scrum corect
      - Facilitezi ceremoniile Scrum
      - Gestionezi Product Backlog eficient
      - Livrezi valoare iterativ și incremental`,
      shortDescription: 'Stăpânește Agile și Scrum - de la teorie la practică',
      category: 'PROJECT_MANAGEMENT',
      level: 'INTERMEDIATE',
      language: 'ro',
      learningOutcomes: [
        'Înțelege și aplică valorile și principiile Agile',
        'Implementează framework-ul Scrum corect',
        'Facilitează toate ceremoniile Scrum',
        'Creează și gestionează Product Backlog',
        'Scrie User Stories eficiente',
        'Conduce Sprint-uri productive',
      ],
      targetAudience: [
        'Scrum Masters aspiranți',
        'Product Owners',
        'Team Leads și manageri',
        'Dezvoltatori în echipe Agile',
        'Project Managers în tranziție',
      ],
      prerequisites: [
        'Experiență de lucru în echipe',
        'Cunoștințe de bază PM (opțional)',
      ],
      price: 349,
      currency: 'RON',
      ceuCredits: 3,
      pduCredits: 21,
      hrdaEligible: true,
      modules: [
        {
          title: 'Modulul 1: Introducere în Agile',
          description: 'Originile, valorile și principiile Agile',
          isFree: true,
          lessons: [
            {
              title: '1.1 Istoria Agile - de la Waterfall la Agile',
              description: 'Cum a apărut nevoia de metodologii adaptive',
              type: 'VIDEO',
              duration: 12,
              isFree: true,
              isPreview: true,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/agile-scrum/1-1-history.mp4' },
            },
            {
              title: '1.2 Manifestul Agile - cele 4 valori',
              description: 'Indivizi, software funcțional, colaborare, răspuns la schimbare',
              type: 'VIDEO',
              duration: 15,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/agile-scrum/1-2-manifesto.mp4' },
            },
            {
              title: '1.3 Cele 12 principii Agile',
              description: 'Principiile care ghidează practicile Agile',
              type: 'VIDEO',
              duration: 18,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/agile-scrum/1-3-principles.mp4' },
            },
            {
              title: '1.4 Agile vs Waterfall - când să folosești fiecare',
              description: 'Comparație și criterii de alegere',
              type: 'VIDEO',
              duration: 14,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/agile-scrum/1-4-agile-vs-waterfall.mp4' },
            },
          ],
        },
        {
          title: 'Modulul 2: Framework-ul Scrum',
          description: 'Componentele și regulile Scrum',
          lessons: [
            {
              title: '2.1 Overview Scrum - teoria din spate',
              description: 'Empirism, pilonii Scrum: transparență, inspecție, adaptare',
              type: 'VIDEO',
              duration: 15,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/agile-scrum/2-1-scrum-theory.mp4' },
            },
            {
              title: '2.2 Rolurile Scrum: Product Owner',
              description: 'Responsabilitățile și abilitățile Product Owner-ului',
              type: 'VIDEO',
              duration: 18,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/agile-scrum/2-2-product-owner.mp4' },
            },
            {
              title: '2.3 Rolurile Scrum: Scrum Master',
              description: 'Servant leadership și responsabilitățile SM',
              type: 'VIDEO',
              duration: 20,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/agile-scrum/2-3-scrum-master.mp4' },
            },
            {
              title: '2.4 Rolurile Scrum: Development Team',
              description: 'Echipa auto-organizată și cross-funcțională',
              type: 'VIDEO',
              duration: 15,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/agile-scrum/2-4-dev-team.mp4' },
            },
            {
              title: '2.5 Artefactele Scrum',
              description: 'Product Backlog, Sprint Backlog, Increment',
              type: 'VIDEO',
              duration: 22,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/agile-scrum/2-5-artifacts.mp4' },
            },
          ],
          assessment: {
            title: 'Quiz: Framework-ul Scrum',
            description: 'Verifică înțelegerea componentelor Scrum',
            type: 'QUIZ',
            passingScore: 70,
            timeLimit: 15,
            questions: this.generateAgileQuizQuestions('scrum-framework'),
          },
        },
        {
          title: 'Modulul 3: Ceremoniile Scrum',
          description: 'Evenimentele care structurează Sprint-ul',
          lessons: [
            {
              title: '3.1 Sprint - containerul pentru toate activitățile',
              description: 'Durata, scopul și regulile Sprint-ului',
              type: 'VIDEO',
              duration: 12,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/agile-scrum/3-1-sprint.mp4' },
            },
            {
              title: '3.2 Sprint Planning',
              description: 'Cum să planifici un Sprint eficient',
              type: 'VIDEO',
              duration: 22,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/agile-scrum/3-2-sprint-planning.mp4' },
            },
            {
              title: '3.3 Daily Scrum (Stand-up)',
              description: 'Sincronizarea zilnică a echipei',
              type: 'VIDEO',
              duration: 15,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/agile-scrum/3-3-daily-scrum.mp4' },
            },
            {
              title: '3.4 Sprint Review',
              description: 'Demonstrația și feedback-ul stakeholderilor',
              type: 'VIDEO',
              duration: 18,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/agile-scrum/3-4-sprint-review.mp4' },
            },
            {
              title: '3.5 Sprint Retrospective',
              description: 'Îmbunătățirea continuă a procesului',
              type: 'VIDEO',
              duration: 20,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/agile-scrum/3-5-retrospective.mp4' },
            },
            {
              title: '3.6 Backlog Refinement',
              description: 'Pregătirea backlog-ului pentru sprint-uri viitoare',
              type: 'VIDEO',
              duration: 15,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/agile-scrum/3-6-refinement.mp4' },
            },
          ],
        },
        {
          title: 'Modulul 4: Product Backlog și User Stories',
          description: 'Gestionarea cerințelor în Agile',
          lessons: [
            {
              title: '4.1 Product Backlog Management',
              description: 'Crearea și mentenanța unui backlog sănătos',
              type: 'VIDEO',
              duration: 18,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/agile-scrum/4-1-backlog-management.mp4' },
            },
            {
              title: '4.2 User Stories - formatul și componentele',
              description: 'As a... I want... So that... și criteriile de acceptare',
              type: 'VIDEO',
              duration: 22,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/agile-scrum/4-2-user-stories.mp4' },
            },
            {
              title: '4.3 INVEST și criterii de calitate',
              description: 'Independent, Negotiable, Valuable, Estimable, Small, Testable',
              type: 'VIDEO',
              duration: 15,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/agile-scrum/4-3-invest.mp4' },
            },
            {
              title: '4.4 Story Points și Planning Poker',
              description: 'Estimarea relativă și tehnici de estimare în echipă',
              type: 'VIDEO',
              duration: 20,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/agile-scrum/4-4-estimation.mp4' },
            },
            {
              title: '4.5 Prioritizare: MoSCoW, WSJF, Value vs Effort',
              description: 'Tehnici de prioritizare a backlog-ului',
              type: 'VIDEO',
              duration: 18,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/agile-scrum/4-5-prioritization.mp4' },
            },
          ],
          assessment: {
            title: 'Exercițiu Practic: Creează User Stories',
            description: 'Scrie user stories pentru un proiect real',
            type: 'SIMULATION',
            passingScore: 60,
            questions: [
              {
                id: 'us-1',
                type: 'ESSAY',
                text: 'Pentru un sistem de rezervări online, scrie 5 user stories cu acceptance criteria',
                points: 100,
                rubric: `Criterii:
- Format corect (As a/I want/So that) - 20p
- Acceptance criteria clare și testabile - 30p
- Respectă principiile INVEST - 25p
- Estimări rezonabile în story points - 15p
- Prioritizare logică - 10p`,
              },
            ],
          },
        },
        {
          title: 'Modulul 5: Kanban și alte practici Agile',
          description: 'Extinde-ți toolkit-ul Agile',
          lessons: [
            {
              title: '5.1 Introducere în Kanban',
              description: 'Principii și practici Kanban',
              type: 'VIDEO',
              duration: 18,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/agile-scrum/5-1-kanban.mp4' },
            },
            {
              title: '5.2 Scrum vs Kanban vs Scrumban',
              description: 'Comparație și cazuri de utilizare',
              type: 'VIDEO',
              duration: 15,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/agile-scrum/5-2-comparison.mp4' },
            },
            {
              title: '5.3 Metrici Agile: Velocity, Lead Time, Cycle Time',
              description: 'Măsurarea performanței echipei',
              type: 'VIDEO',
              duration: 20,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/agile-scrum/5-3-metrics.mp4' },
            },
            {
              title: '5.4 Scaling Agile: SAFe, LeSS, Nexus',
              description: 'Agile la scară pentru organizații mari',
              type: 'VIDEO',
              duration: 22,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/agile-scrum/5-4-scaling.mp4' },
            },
          ],
        },
        {
          title: 'Examen Final Agile',
          description: 'Certificare Agile Practitioner',
          lessons: [
            {
              title: 'Recapitulare: Agile & Scrum',
              description: 'Tot ce trebuie să știi pentru examen',
              type: 'TEXT',
              duration: 30,
              content: {
                textContent: `# Recapitulare Examen Agile & Scrum

## Checklist cunoștințe:
- [ ] Cele 4 valori Agile Manifesto
- [ ] Cele 12 principii Agile
- [ ] Pilonii Scrum (transparență, inspecție, adaptare)
- [ ] Rolurile Scrum și responsabilitățile lor
- [ ] Toate ceremoniile și timeboxing-ul lor
- [ ] Artefactele Scrum
- [ ] User Stories și INVEST
- [ ] Tehnici de estimare
- [ ] Definition of Done vs Acceptance Criteria
- [ ] Metrici Agile

## Format examen: 40 întrebări, 60 minute, 75% pentru trecere`,
              },
            },
          ],
          assessment: {
            title: 'Examen Final: Agile & Scrum',
            description: 'Examen comprehensiv pentru certificare Agile',
            type: 'PRACTICE_EXAM',
            passingScore: 75,
            timeLimit: 60,
            questions: this.generateAgileExamQuestions(40),
          },
        },
      ],
    };
  }

  // ===== QUESTION GENERATORS =====

  private generatePMQuizQuestions(topic: string): Question[] {
    const questionSets: Record<string, Question[]> = {
      fundamentals: [
        {
          id: 'pm-f-1',
          type: 'MULTIPLE_CHOICE',
          text: 'Care este diferența principală dintre un proiect și operațiunile curente?',
          points: 10,
          options: [
            { id: 'a', text: 'Proiectele au buget, operațiunile nu', isCorrect: false },
            { id: 'b', text: 'Proiectele sunt temporare și unice, operațiunile sunt continue', isCorrect: true },
            { id: 'c', text: 'Proiectele implică mai mulți oameni', isCorrect: false },
            { id: 'd', text: 'Nu există diferență semnificativă', isCorrect: false },
          ],
          correctAnswer: 'b',
        },
        {
          id: 'pm-f-2',
          type: 'MULTIPLE_CHOICE',
          text: 'Câte grupuri de procese definește PMBOK?',
          points: 10,
          options: [
            { id: 'a', text: '3', isCorrect: false },
            { id: 'b', text: '4', isCorrect: false },
            { id: 'c', text: '5', isCorrect: true },
            { id: 'd', text: '10', isCorrect: false },
          ],
          correctAnswer: 'c',
          explanation: 'PMBOK definește 5 grupuri: Initiating, Planning, Executing, Monitoring & Controlling, Closing',
        },
        {
          id: 'pm-f-3',
          type: 'TRUE_FALSE',
          text: 'Project Charter-ul este creat în faza de Planificare',
          points: 10,
          options: [
            { id: 't', text: 'Adevărat', isCorrect: false },
            { id: 'f', text: 'Fals', isCorrect: true },
          ],
          correctAnswer: 'f',
          explanation: 'Project Charter-ul este creat în faza de Inițiere (Initiating)',
        },
      ],
      planning: [
        {
          id: 'pm-p-1',
          type: 'MULTIPLE_CHOICE',
          text: 'Ce reprezintă WBS (Work Breakdown Structure)?',
          points: 10,
          options: [
            { id: 'a', text: 'Lista de stakeholderi', isCorrect: false },
            { id: 'b', text: 'Descompunerea ierarhică a muncii proiectului', isCorrect: true },
            { id: 'c', text: 'Diagrama Gantt', isCorrect: false },
            { id: 'd', text: 'Registrul riscurilor', isCorrect: false },
          ],
          correctAnswer: 'b',
        },
        {
          id: 'pm-p-2',
          type: 'MULTIPLE_CHOICE',
          text: 'Care metodă de estimare folosește date istorice de la proiecte similare?',
          points: 10,
          options: [
            { id: 'a', text: 'Bottom-up', isCorrect: false },
            { id: 'b', text: 'Parametric', isCorrect: false },
            { id: 'c', text: 'Analogous (Analogă)', isCorrect: true },
            { id: 'd', text: 'Three-point', isCorrect: false },
          ],
          correctAnswer: 'c',
        },
      ],
      execution: [
        {
          id: 'pm-e-1',
          type: 'MULTIPLE_CHOICE',
          text: 'În EVM, ce indică un CPI (Cost Performance Index) < 1?',
          points: 10,
          options: [
            { id: 'a', text: 'Proiectul este sub buget', isCorrect: false },
            { id: 'b', text: 'Proiectul este peste buget', isCorrect: true },
            { id: 'c', text: 'Proiectul este în grafic', isCorrect: false },
            { id: 'd', text: 'Proiectul este în avans', isCorrect: false },
          ],
          correctAnswer: 'b',
          explanation: 'CPI < 1 înseamnă că s-a cheltuit mai mult decât valoarea muncii realizate (peste buget)',
        },
        {
          id: 'pm-e-2',
          type: 'MULTIPLE_CHOICE',
          text: 'Ce document trebuie actualizat când apare o schimbare aprobată în proiect?',
          points: 10,
          options: [
            { id: 'a', text: 'Doar Project Charter', isCorrect: false },
            { id: 'b', text: 'Doar Schedule', isCorrect: false },
            { id: 'c', text: 'Change Log și documentele relevante ale planului', isCorrect: true },
            { id: 'd', text: 'Nimic, schimbările nu se documentează', isCorrect: false },
          ],
          correctAnswer: 'c',
        },
      ],
    };

    return questionSets[topic] || [];
  }

  private generateAgileQuizQuestions(topic: string): Question[] {
    const questionSets: Record<string, Question[]> = {
      'scrum-framework': [
        {
          id: 'ag-sf-1',
          type: 'MULTIPLE_CHOICE',
          text: 'Care sunt pilonii empirismului în Scrum?',
          points: 10,
          options: [
            { id: 'a', text: 'Plan, Do, Check, Act', isCorrect: false },
            { id: 'b', text: 'Transparență, Inspecție, Adaptare', isCorrect: true },
            { id: 'c', text: 'Velocity, Quality, Value', isCorrect: false },
            { id: 'd', text: 'Sprint, Review, Retrospective', isCorrect: false },
          ],
          correctAnswer: 'b',
        },
        {
          id: 'ag-sf-2',
          type: 'MULTIPLE_CHOICE',
          text: 'Cine este responsabil pentru maximizarea valorii produsului?',
          points: 10,
          options: [
            { id: 'a', text: 'Scrum Master', isCorrect: false },
            { id: 'b', text: 'Development Team', isCorrect: false },
            { id: 'c', text: 'Product Owner', isCorrect: true },
            { id: 'd', text: 'Stakeholders', isCorrect: false },
          ],
          correctAnswer: 'c',
        },
        {
          id: 'ag-sf-3',
          type: 'TRUE_FALSE',
          text: 'Scrum Master-ul decide ce intră în Sprint',
          points: 10,
          options: [
            { id: 't', text: 'Adevărat', isCorrect: false },
            { id: 'f', text: 'Fals', isCorrect: true },
          ],
          correctAnswer: 'f',
          explanation: 'Development Team-ul decide cât de multă muncă poate prelua, iar Product Owner-ul prioritizează',
        },
      ],
    };

    return questionSets[topic] || [];
  }

  private generatePMExamQuestions(count: number): Question[] {
    const allQuestions: Question[] = [
      {
        id: 'pme-1',
        type: 'MULTIPLE_CHOICE',
        text: 'Un project manager primește o cerere de schimbare de la un stakeholder senior. Care este primul pas?',
        points: 2,
        options: [
          { id: 'a', text: 'Implementează imediat schimbarea', isCorrect: false },
          { id: 'b', text: 'Refuză cererea', isCorrect: false },
          { id: 'c', text: 'Evaluează impactul și înregistrează în Change Log', isCorrect: true },
          { id: 'd', text: 'Escaladează la sponsor', isCorrect: false },
        ],
        correctAnswer: 'c',
      },
      {
        id: 'pme-2',
        type: 'MULTIPLE_CHOICE',
        text: 'În timpul execuției, echipa descoperă că o activitate pe calea critică va întârzia 5 zile. Ce ar trebui să facă PM-ul?',
        points: 2,
        options: [
          { id: 'a', text: 'Să nu facă nimic, să aștepte', isCorrect: false },
          { id: 'b', text: 'Să analizeze opțiuni de compresie (crashing/fast tracking)', isCorrect: true },
          { id: 'c', text: 'Să concedieze membrul echipei responsabil', isCorrect: false },
          { id: 'd', text: 'Să anuleze proiectul', isCorrect: false },
        ],
        correctAnswer: 'b',
      },
      {
        id: 'pme-3',
        type: 'MULTIPLE_CHOICE',
        text: 'Care document autorizează formal existența proiectului?',
        points: 2,
        options: [
          { id: 'a', text: 'Project Plan', isCorrect: false },
          { id: 'b', text: 'Business Case', isCorrect: false },
          { id: 'c', text: 'Project Charter', isCorrect: true },
          { id: 'd', text: 'SOW', isCorrect: false },
        ],
        correctAnswer: 'c',
      },
      {
        id: 'pme-4',
        type: 'MULTIPLE_CHOICE',
        text: 'EV = 500, PV = 600, AC = 550. Care este SPI?',
        points: 2,
        options: [
          { id: 'a', text: '0.83', isCorrect: true },
          { id: 'b', text: '0.91', isCorrect: false },
          { id: 'c', text: '1.09', isCorrect: false },
          { id: 'd', text: '1.20', isCorrect: false },
        ],
        correctAnswer: 'a',
        explanation: 'SPI = EV/PV = 500/600 = 0.83',
      },
      {
        id: 'pme-5',
        type: 'MULTIPLE_CHOICE',
        text: 'Care tehnică de identificare a riscurilor implică experți care răspund anonim în mai multe runde?',
        points: 2,
        options: [
          { id: 'a', text: 'Brainstorming', isCorrect: false },
          { id: 'b', text: 'Interviews', isCorrect: false },
          { id: 'c', text: 'Delphi Technique', isCorrect: true },
          { id: 'd', text: 'SWOT Analysis', isCorrect: false },
        ],
        correctAnswer: 'c',
      },
      // Add more questions to reach the count
      ...this.generatePMQuizQuestions('fundamentals'),
      ...this.generatePMQuizQuestions('planning'),
      ...this.generatePMQuizQuestions('execution'),
    ];

    return allQuestions.slice(0, count);
  }

  private generateAgileExamQuestions(count: number): Question[] {
    const allQuestions: Question[] = [
      {
        id: 'age-1',
        type: 'MULTIPLE_CHOICE',
        text: 'Care este durata recomandată pentru Daily Scrum?',
        points: 2,
        options: [
          { id: 'a', text: '5 minute', isCorrect: false },
          { id: 'b', text: '15 minute', isCorrect: true },
          { id: 'c', text: '30 minute', isCorrect: false },
          { id: 'd', text: '1 oră', isCorrect: false },
        ],
        correctAnswer: 'b',
      },
      {
        id: 'age-2',
        type: 'MULTIPLE_CHOICE',
        text: 'Cine poate anula un Sprint?',
        points: 2,
        options: [
          { id: 'a', text: 'Scrum Master', isCorrect: false },
          { id: 'b', text: 'Development Team', isCorrect: false },
          { id: 'c', text: 'Product Owner', isCorrect: true },
          { id: 'd', text: 'Stakeholders', isCorrect: false },
        ],
        correctAnswer: 'c',
      },
      {
        id: 'age-3',
        type: 'MULTIPLE_CHOICE',
        text: 'Ce înseamnă "INVEST" în contextul User Stories?',
        points: 2,
        options: [
          { id: 'a', text: 'O metodă de finanțare Agile', isCorrect: false },
          { id: 'b', text: 'Independent, Negotiable, Valuable, Estimable, Small, Testable', isCorrect: true },
          { id: 'c', text: 'Un framework de scaling', isCorrect: false },
          { id: 'd', text: 'O ceremonie Scrum', isCorrect: false },
        ],
        correctAnswer: 'b',
      },
      {
        id: 'age-4',
        type: 'MULTIPLE_CHOICE',
        text: 'În Kanban, ce este WIP limit?',
        points: 2,
        options: [
          { id: 'a', text: 'Limita de timp pentru o activitate', isCorrect: false },
          { id: 'b', text: 'Numărul maxim de itemi în lucru simultan', isCorrect: true },
          { id: 'c', text: 'Bugetul pentru sprint', isCorrect: false },
          { id: 'd', text: 'Dimensiunea echipei', isCorrect: false },
        ],
        correctAnswer: 'b',
      },
      {
        id: 'age-5',
        type: 'MULTIPLE_CHOICE',
        text: 'Care valoare Agile Manifesto pune accentul pe oameni?',
        points: 2,
        options: [
          { id: 'a', text: 'Comprehensive documentation over working software', isCorrect: false },
          { id: 'b', text: 'Individuals and interactions over processes and tools', isCorrect: true },
          { id: 'c', text: 'Following a plan over responding to change', isCorrect: false },
          { id: 'd', text: 'Contract negotiation over customer collaboration', isCorrect: false },
        ],
        correctAnswer: 'b',
      },
      ...this.generateAgileQuizQuestions('scrum-framework'),
    ];

    return allQuestions.slice(0, count);
  }

  // ===== COURSE GENERATION =====

  async generateCourse(template: PMCourseTemplate, instructorId: string): Promise<Course> {
    const course = await this.lmsService.createCourse({
      title: template.title,
      description: template.description,
      shortDescription: template.shortDescription,
      instructorId,
      category: template.category,
      level: template.level,
      language: template.language,
      learningOutcomes: template.learningOutcomes,
      targetAudience: template.targetAudience,
      prerequisites: template.prerequisites,
      price: template.price,
      currency: template.currency,
      ceuCredits: template.ceuCredits,
      hrdaEligible: template.hrdaEligible,
      certificateEnabled: true,
    });

    for (const moduleTemplate of template.modules) {
      const module = await this.lmsService.addModule(course.id, {
        title: moduleTemplate.title,
        description: moduleTemplate.description,
        isFree: moduleTemplate.isFree,
      });

      for (const lessonTemplate of moduleTemplate.lessons) {
        await this.lmsService.addLesson(module.id, {
          title: lessonTemplate.title,
          description: lessonTemplate.description,
          type: lessonTemplate.type === 'CASE_STUDY' ? 'TEXT' : lessonTemplate.type,
          content: {
            videoUrl: lessonTemplate.content.videoUrl,
            textContent: lessonTemplate.content.textContent,
            downloadUrl: lessonTemplate.content.downloadUrl,
            downloadFilename: lessonTemplate.content.downloadFilename,
          },
          duration: lessonTemplate.duration,
          isFree: lessonTemplate.isFree,
          isPreview: lessonTemplate.isPreview,
        });
      }

      if (moduleTemplate.assessment) {
        const assessment = await this.lmsService.createAssessment({
          courseId: course.id,
          moduleId: module.id,
          title: moduleTemplate.assessment.title,
          description: moduleTemplate.assessment.description,
          type: moduleTemplate.assessment.type === 'PRACTICE_EXAM' ? 'FINAL_EXAM' :
                moduleTemplate.assessment.type === 'SIMULATION' ? 'PRACTICAL' : 'QUIZ',
          questions: moduleTemplate.assessment.questions,
          passingScore: moduleTemplate.assessment.passingScore,
          maxAttempts: moduleTemplate.assessment.type === 'PRACTICE_EXAM' ? 5 : 3,
          timeLimit: moduleTemplate.assessment.timeLimit,
        });

        await this.lmsService.publishAssessment(assessment.id);
      }
    }

    return (await this.lmsService.getCourse(course.id)) as Course;
  }

  async generateAllPMCourses(instructorId: string): Promise<{
    pmFundamentals: Course;
    agileScrum: Course;
  }> {
    const pmFundamentals = await this.generateCourse(this.getPMPFundamentalsTemplate(), instructorId);
    const agileScrum = await this.generateCourse(this.getAgileScrumTemplate(), instructorId);

    this.generatedCourses.set('pm-fundamentals', pmFundamentals.id);
    this.generatedCourses.set('agile-scrum', agileScrum.id);

    return { pmFundamentals, agileScrum };
  }

  // ===== PRACTICE EXAMS =====

  async createPracticeExam(data: Omit<PracticeExam, 'id' | 'createdAt'>): Promise<PracticeExam> {
    const id = `exam-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const exam: PracticeExam = {
      id,
      ...data,
      createdAt: new Date(),
    };
    this.practiceExams.set(id, exam);
    return exam;
  }

  async getPracticeExam(id: string): Promise<PracticeExam | null> {
    return this.practiceExams.get(id) || null;
  }

  async listPracticeExams(examType?: string): Promise<PracticeExam[]> {
    let exams = Array.from(this.practiceExams.values());
    if (examType) {
      exams = exams.filter(e => e.examType === examType);
    }
    return exams;
  }

  async startExamAttempt(examId: string, userId: string): Promise<ExamAttempt> {
    const exam = this.practiceExams.get(examId);
    if (!exam) throw new Error('Exam not found');

    const id = `attempt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const attempt: ExamAttempt = {
      id,
      examId,
      userId,
      answers: [],
      score: 0,
      percentage: 0,
      passed: false,
      startedAt: new Date(),
      totalTime: 0,
    };

    this.examAttempts.set(id, attempt);
    return attempt;
  }

  async submitExamAttempt(attemptId: string, answers: ExamAttempt['answers']): Promise<ExamAttempt> {
    const attempt = this.examAttempts.get(attemptId);
    if (!attempt) throw new Error('Attempt not found');

    const exam = this.practiceExams.get(attempt.examId);
    if (!exam) throw new Error('Exam not found');

    // Grade the attempt
    let score = 0;
    for (const answer of answers) {
      const question = exam.questions.find(q => q.id === answer.questionId);
      if (question) {
        if (question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE') {
          if (answer.answer === question.correctAnswer) {
            score += question.points;
          }
        }
      }
    }

    const maxScore = exam.questions.reduce((sum, q) => sum + q.points, 0);
    attempt.answers = answers;
    attempt.score = score;
    attempt.percentage = Math.round((score / maxScore) * 100);
    attempt.passed = attempt.percentage >= exam.passingScore;
    attempt.completedAt = new Date();
    attempt.totalTime = Math.round((attempt.completedAt.getTime() - attempt.startedAt.getTime()) / 60000);

    this.examAttempts.set(attemptId, attempt);
    return attempt;
  }

  async getUserExamAttempts(userId: string): Promise<ExamAttempt[]> {
    return Array.from(this.examAttempts.values())
      .filter(a => a.userId === userId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  // ===== MICRO-CREDENTIALS =====

  async getMicroCredentials(): Promise<MicroCredential[]> {
    return Array.from(this.microCredentials.values());
  }

  async getMicroCredential(id: string): Promise<MicroCredential | null> {
    return this.microCredentials.get(id) || null;
  }

  async awardMicroCredential(userId: string, credentialId: string): Promise<UserMicroCredential> {
    const credential = this.microCredentials.get(credentialId);
    if (!credential) throw new Error('Credential not found');

    const id = `uc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const verificationCode = `MC-${new Date().getFullYear()}-${String(this.userCredentials.size + 1).padStart(6, '0')}`;

    const earnedAt = new Date();
    const expiresAt = new Date(earnedAt);
    expiresAt.setMonth(expiresAt.getMonth() + credential.validityMonths);

    const userCredential: UserMicroCredential = {
      id,
      userId,
      credentialId,
      credential,
      earnedAt,
      expiresAt,
      verificationCode,
      verificationUrl: `https://documentiulia.ro/verify/${verificationCode}`,
      status: 'ACTIVE',
    };

    this.userCredentials.set(id, userCredential);
    return userCredential;
  }

  async getUserMicroCredentials(userId: string): Promise<UserMicroCredential[]> {
    return Array.from(this.userCredentials.values())
      .filter(uc => uc.userId === userId);
  }

  async verifyMicroCredential(verificationCode: string): Promise<UserMicroCredential | null> {
    return Array.from(this.userCredentials.values())
      .find(uc => uc.verificationCode === verificationCode) || null;
  }

  // ===== PROJECT TEMPLATES =====

  async getProjectTemplates(): Promise<ProjectTemplate[]> {
    return Array.from(this.projectTemplates.values());
  }

  async getProjectTemplate(id: string): Promise<ProjectTemplate | null> {
    return this.projectTemplates.get(id) || null;
  }

  async getTemplatesByMethodology(methodology: string): Promise<ProjectTemplate[]> {
    return Array.from(this.projectTemplates.values())
      .filter(t => t.methodology === methodology);
  }

  // ===== REFERENCE DATA =====

  getCertificationPaths(): { path: string; certifications: string[]; description: string }[] {
    return [
      {
        path: 'PMI Traditional',
        certifications: ['CAPM', 'PMP', 'PgMP', 'PfMP'],
        description: 'Calea clasică PMI pentru project și program management',
      },
      {
        path: 'Agile/Scrum',
        certifications: ['PSM I', 'PSM II', 'PSPO', 'CSM', 'PMI-ACP'],
        description: 'Certificări pentru practicienii Agile și Scrum',
      },
      {
        path: 'PRINCE2',
        certifications: ['PRINCE2 Foundation', 'PRINCE2 Practitioner', 'PRINCE2 Agile'],
        description: 'Metodologia structurată din UK pentru project management',
      },
    ];
  }

  getPDUCategories(): { category: string; description: string; minRequired: number }[] {
    return [
      { category: 'Technical', description: 'Abilități tehnice de PM', minRequired: 8 },
      { category: 'Leadership', description: 'Competențe de leadership', minRequired: 8 },
      { category: 'Strategic', description: 'Business și strategie', minRequired: 8 },
    ];
  }
}
