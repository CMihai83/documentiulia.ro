import { Injectable, Logger } from '@nestjs/common';

/**
 * Contract Analysis Service (AI-004)
 * AI-powered analysis of legal documents
 *
 * Features:
 * - Contract type classification (employment, commercial, NDA, lease, etc.)
 * - Key terms and obligations extraction
 * - Risk assessment and flagging
 * - Compliance checking (Romanian labor law, GDPR, etc.)
 * - Contract comparison and versioning
 * - Expiration and renewal tracking
 * - Multi-language support (RO/EN)
 */

// =================== TYPES & ENUMS ===================

export enum ContractType {
  EMPLOYMENT = 'EMPLOYMENT',           // Contract individual de muncă
  COMMERCIAL = 'COMMERCIAL',           // Contract comercial
  NDA = 'NDA',                         // Acord de confidențialitate
  LEASE = 'LEASE',                     // Contract de închiriere
  SERVICE = 'SERVICE',                 // Contract de prestări servicii
  SUPPLY = 'SUPPLY',                   // Contract de furnizare
  PARTNERSHIP = 'PARTNERSHIP',         // Contract de asociere
  LOAN = 'LOAN',                       // Contract de împrumut
  CONSULTING = 'CONSULTING',           // Contract de consultanță
  LICENSE = 'LICENSE',                 // Contract de licență
  FRANCHISE = 'FRANCHISE',             // Contract de franciză
  MANDATE = 'MANDATE',                 // Contract de mandat
  OTHER = 'OTHER',
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ComplianceStatus {
  COMPLIANT = 'COMPLIANT',
  NON_COMPLIANT = 'NON_COMPLIANT',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

export enum ContractStatus {
  DRAFT = 'DRAFT',
  PENDING_SIGNATURE = 'PENDING_SIGNATURE',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  TERMINATED = 'TERMINATED',
  RENEWED = 'RENEWED',
}

export interface Party {
  name: string;
  type: 'INDIVIDUAL' | 'COMPANY';
  identifier?: string; // CNP/CUI
  role: 'PRIMARY' | 'SECONDARY' | 'GUARANTOR' | 'WITNESS';
  address?: string;
  representative?: string;
}

export interface ContractTerm {
  id: string;
  category: string;
  description: string;
  descriptionEn: string;
  value?: string;
  startDate?: Date;
  endDate?: Date;
  isKey: boolean;
  riskLevel: RiskLevel;
  complianceNotes?: string;
}

export interface Obligation {
  id: string;
  party: string;
  description: string;
  descriptionEn: string;
  deadline?: Date;
  isRecurring: boolean;
  frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  penalty?: string;
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE';
}

export interface RiskAssessment {
  overallRisk: RiskLevel;
  riskScore: number; // 0-100
  findings: Array<{
    category: string;
    description: string;
    riskLevel: RiskLevel;
    recommendation: string;
  }>;
}

export interface ComplianceCheck {
  regulation: string;
  regulationCode: string;
  status: ComplianceStatus;
  findings: string[];
  recommendations: string[];
}

export interface Contract {
  id: string;
  tenantId: string;
  title: string;
  type: ContractType;
  status: ContractStatus;
  parties: Party[];
  terms: ContractTerm[];
  obligations: Obligation[];
  effectiveDate: Date;
  expirationDate?: Date;
  renewalDate?: Date;
  autoRenewal: boolean;
  value?: number;
  currency?: string;
  language: 'RO' | 'EN';
  originalText?: string;
  summary?: string;
  summaryEn?: string;
  riskAssessment?: RiskAssessment;
  complianceChecks: ComplianceCheck[];
  tags: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  analyzedAt?: Date;
}

export interface ContractAnalysisResult {
  contractId: string;
  type: ContractType;
  confidence: number;
  parties: Party[];
  terms: ContractTerm[];
  obligations: Obligation[];
  riskAssessment: RiskAssessment;
  complianceChecks: ComplianceCheck[];
  summary: string;
  summaryEn: string;
  keyDates: Array<{
    type: string;
    date: Date;
    description: string;
  }>;
  warnings: string[];
  recommendations: string[];
}

export interface ContractTemplate {
  id: string;
  tenantId: string;
  name: string;
  type: ContractType;
  language: 'RO' | 'EN';
  content: string;
  variables: Array<{
    name: string;
    description: string;
    type: 'TEXT' | 'DATE' | 'NUMBER' | 'CURRENCY' | 'PARTY';
    required: boolean;
    defaultValue?: string;
  }>;
  isActive: boolean;
  createdAt: Date;
}

// =================== SERVICE ===================

@Injectable()
export class ContractAnalysisService {
  private readonly logger = new Logger(ContractAnalysisService.name);

  // In-memory storage
  private contracts: Map<string, Contract> = new Map();
  private templates: Map<string, ContractTemplate> = new Map();

  private counters = {
    contract: 0,
    template: 0,
    term: 0,
    obligation: 0,
  };

  // Romanian labor law keywords for compliance checking
  private readonly laborLawKeywords = {
    minimumWage: ['salariul minim', 'minimum wage', 'salariu brut'],
    workingHours: ['program de lucru', 'ore de muncă', 'working hours', 'timp de lucru'],
    probation: ['perioadă de probă', 'probation period', 'probațiune'],
    vacation: ['concediu', 'zile libere', 'vacation', 'leave'],
    termination: ['încetare', 'reziliere', 'termination', 'desfacere'],
    overtime: ['ore suplimentare', 'overtime', 'muncă suplimentară'],
    benefits: ['beneficii', 'benefits', 'tichete de masă', 'asigurare'],
  };

  // GDPR keywords for compliance
  private readonly gdprKeywords = {
    dataProcessing: ['prelucrare date', 'data processing', 'date personale'],
    consent: ['consimțământ', 'consent', 'acord'],
    retention: ['păstrare', 'retention', 'stocare date'],
    rights: ['dreptul la', 'right to', 'acces', 'ștergere', 'portabilitate'],
    transfer: ['transfer', 'transmitere', 'țări terțe'],
  };

  constructor() {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates(): void {
    // Employment contract template (Romanian)
    const employmentTemplate: Omit<ContractTemplate, 'id' | 'createdAt'> = {
      tenantId: 'system',
      name: 'Contract Individual de Muncă',
      type: ContractType.EMPLOYMENT,
      language: 'RO',
      content: `CONTRACT INDIVIDUAL DE MUNCĂ
Nr. {{contract_number}} din {{contract_date}}

Între:
{{employer_name}}, cu sediul în {{employer_address}}, CUI {{employer_cui}},
reprezentată de {{employer_representative}}, în calitate de ANGAJATOR

și

{{employee_name}}, domiciliat în {{employee_address}}, CNP {{employee_cnp}},
în calitate de ANGAJAT

Părțile au convenit încheierea prezentului contract individual de muncă, în următoarele condiții:

Art. 1. Obiectul contractului
Angajatul va presta activitatea de {{job_title}} în cadrul compartimentului {{department}}.

Art. 2. Durata contractului
Prezentul contract se încheie pe durată {{contract_duration}}.
Data începerii activității: {{start_date}}

Art. 3. Locul de muncă
Activitatea se va desfășura la sediul angajatorului din {{work_location}}.

Art. 4. Salariul
Salariul de bază brut lunar: {{gross_salary}} RON
Sporuri: {{bonuses}}

Art. 5. Timpul de muncă
Program de lucru: {{working_hours}} ore/zi, {{working_days}} zile/săptămână
Ore suplimentare: conform Codului Muncii

Art. 6. Concediul de odihnă
Angajatul are dreptul la {{vacation_days}} zile lucrătoare de concediu de odihnă plătit.

Art. 7. Perioada de probă
{{probation_period}}

Art. 8. Clauze speciale
{{special_clauses}}

Prezentul contract a fost încheiat în două exemplare, câte unul pentru fiecare parte.

ANGAJATOR                           ANGAJAT
{{employer_signature}}              {{employee_signature}}`,
      variables: [
        { name: 'contract_number', description: 'Număr contract', type: 'TEXT', required: true },
        { name: 'contract_date', description: 'Data contractului', type: 'DATE', required: true },
        { name: 'employer_name', description: 'Numele angajatorului', type: 'TEXT', required: true },
        { name: 'employer_address', description: 'Adresa angajatorului', type: 'TEXT', required: true },
        { name: 'employer_cui', description: 'CUI angajator', type: 'TEXT', required: true },
        { name: 'employer_representative', description: 'Reprezentant angajator', type: 'TEXT', required: true },
        { name: 'employee_name', description: 'Numele angajatului', type: 'TEXT', required: true },
        { name: 'employee_address', description: 'Adresa angajatului', type: 'TEXT', required: true },
        { name: 'employee_cnp', description: 'CNP angajat', type: 'TEXT', required: true },
        { name: 'job_title', description: 'Funcția', type: 'TEXT', required: true },
        { name: 'department', description: 'Departament', type: 'TEXT', required: false },
        { name: 'contract_duration', description: 'Durată (nedeterminată/determinată)', type: 'TEXT', required: true },
        { name: 'start_date', description: 'Data începerii', type: 'DATE', required: true },
        { name: 'work_location', description: 'Locul de muncă', type: 'TEXT', required: true },
        { name: 'gross_salary', description: 'Salariu brut', type: 'CURRENCY', required: true },
        { name: 'bonuses', description: 'Sporuri și bonusuri', type: 'TEXT', required: false },
        { name: 'working_hours', description: 'Ore pe zi', type: 'NUMBER', required: true, defaultValue: '8' },
        { name: 'working_days', description: 'Zile pe săptămână', type: 'NUMBER', required: true, defaultValue: '5' },
        { name: 'vacation_days', description: 'Zile concediu', type: 'NUMBER', required: true, defaultValue: '21' },
        { name: 'probation_period', description: 'Perioada de probă', type: 'TEXT', required: false },
        { name: 'special_clauses', description: 'Clauze speciale', type: 'TEXT', required: false },
      ],
      isActive: true,
    };

    const templateId = `template_${++this.counters.template}`;
    this.templates.set(templateId, {
      ...employmentTemplate,
      id: templateId,
      createdAt: new Date(),
    });

    // NDA template
    const ndaTemplate: Omit<ContractTemplate, 'id' | 'createdAt'> = {
      tenantId: 'system',
      name: 'Acord de Confidențialitate (NDA)',
      type: ContractType.NDA,
      language: 'RO',
      content: `ACORD DE CONFIDENȚIALITATE (NDA)
Nr. {{contract_number}} din {{contract_date}}

Între:
{{disclosing_party}}, în calitate de Parte Divulgătoare
și
{{receiving_party}}, în calitate de Parte Receptoare

Art. 1. Definiții
"Informații Confidențiale" înseamnă {{confidential_info_definition}}

Art. 2. Obligații
Partea Receptoare se obligă să:
- păstreze confidențialitatea informațiilor primite
- nu divulge informațiile către terți fără acord scris
- utilizeze informațiile doar în scopul {{purpose}}

Art. 3. Durata
Prezentul acord este valabil pentru o perioadă de {{duration}} de la semnare.
Obligațiile de confidențialitate rămân în vigoare pentru {{post_termination_period}} după încetare.

Art. 4. Excepții
Nu sunt considerate confidențiale informațiile care:
{{exceptions}}

Art. 5. Penalități
În caz de încălcare: {{penalties}}

PARTE DIVULGĂTOARE                  PARTE RECEPTOARE`,
      variables: [
        { name: 'contract_number', description: 'Număr acord', type: 'TEXT', required: true },
        { name: 'contract_date', description: 'Data acordului', type: 'DATE', required: true },
        { name: 'disclosing_party', description: 'Partea divulgătoare', type: 'PARTY', required: true },
        { name: 'receiving_party', description: 'Partea receptoare', type: 'PARTY', required: true },
        { name: 'confidential_info_definition', description: 'Definiția informațiilor confidențiale', type: 'TEXT', required: true },
        { name: 'purpose', description: 'Scopul utilizării', type: 'TEXT', required: true },
        { name: 'duration', description: 'Durata acordului', type: 'TEXT', required: true },
        { name: 'post_termination_period', description: 'Perioada după încetare', type: 'TEXT', required: true },
        { name: 'exceptions', description: 'Excepții', type: 'TEXT', required: false },
        { name: 'penalties', description: 'Penalități', type: 'TEXT', required: false },
      ],
      isActive: true,
    };

    const ndaId = `template_${++this.counters.template}`;
    this.templates.set(ndaId, {
      ...ndaTemplate,
      id: ndaId,
      createdAt: new Date(),
    });

    this.logger.log('Default contract templates initialized');
  }

  // =================== CONTRACT ANALYSIS ===================

  async analyzeContract(
    tenantId: string,
    text: string,
    options?: {
      language?: 'RO' | 'EN';
      expectedType?: ContractType;
    },
  ): Promise<ContractAnalysisResult> {
    this.logger.log(`Analyzing contract for tenant ${tenantId}`);

    const language = options?.language || this.detectLanguage(text);
    const contractType = options?.expectedType || this.classifyContractType(text);

    // Extract parties
    const parties = this.extractParties(text);

    // Extract key terms
    const terms = this.extractTerms(text, contractType);

    // Extract obligations
    const obligations = this.extractObligations(text);

    // Perform risk assessment
    const riskAssessment = this.assessRisk(text, contractType, terms);

    // Run compliance checks
    const complianceChecks = this.runComplianceChecks(text, contractType);

    // Generate summary
    const { summary, summaryEn } = this.generateSummary(text, contractType, parties, terms);

    // Extract key dates
    const keyDates = this.extractKeyDates(text);

    // Generate warnings and recommendations
    const { warnings, recommendations } = this.generateWarningsAndRecommendations(
      riskAssessment,
      complianceChecks,
      terms,
    );

    // Create contract record
    const contractId = `contract_${++this.counters.contract}`;
    const contract: Contract = {
      id: contractId,
      tenantId,
      title: this.extractTitle(text) || `Contract ${contractType}`,
      type: contractType,
      status: ContractStatus.DRAFT,
      parties,
      terms,
      obligations,
      effectiveDate: keyDates.find(d => d.type === 'effective')?.date || new Date(),
      expirationDate: keyDates.find(d => d.type === 'expiration')?.date,
      autoRenewal: text.toLowerCase().includes('reînnoire automată') || text.toLowerCase().includes('auto renewal'),
      language,
      originalText: text,
      summary,
      summaryEn,
      riskAssessment,
      complianceChecks,
      tags: this.generateTags(contractType, terms),
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      analyzedAt: new Date(),
    };

    this.contracts.set(contractId, contract);

    return {
      contractId,
      type: contractType,
      confidence: this.calculateTypeConfidence(text, contractType),
      parties,
      terms,
      obligations,
      riskAssessment,
      complianceChecks,
      summary,
      summaryEn,
      keyDates,
      warnings,
      recommendations,
    };
  }

  private detectLanguage(text: string): 'RO' | 'EN' {
    const romanianIndicators = [
      'între', 'părțile', 'contract', 'prezentul', 'angajat', 'angajator',
      'articol', 'obligații', 'drepturile', 'încetare', 'semnătura',
    ];
    const englishIndicators = [
      'between', 'parties', 'agreement', 'hereby', 'employee', 'employer',
      'article', 'obligations', 'rights', 'termination', 'signature',
    ];

    const lowerText = text.toLowerCase();
    const roCount = romanianIndicators.filter(w => lowerText.includes(w)).length;
    const enCount = englishIndicators.filter(w => lowerText.includes(w)).length;

    return roCount >= enCount ? 'RO' : 'EN';
  }

  private classifyContractType(text: string): ContractType {
    const lowerText = text.toLowerCase();

    const typeIndicators: Record<ContractType, string[]> = {
      [ContractType.EMPLOYMENT]: [
        'contract individual de muncă', 'employment contract', 'angajat', 'salariat',
        'cod muncii', 'labor code', 'funcția', 'job title', 'program de lucru',
      ],
      [ContractType.NDA]: [
        'confidențialitate', 'confidential', 'nda', 'non-disclosure',
        'secret comercial', 'trade secret', 'informații confidențiale',
      ],
      [ContractType.LEASE]: [
        'închiriere', 'lease', 'locațiune', 'chirie', 'rent',
        'locatar', 'locator', 'tenant', 'landlord', 'imobil',
      ],
      [ContractType.SERVICE]: [
        'prestări servicii', 'service agreement', 'prestator', 'beneficiar',
        'servicii', 'services rendered',
      ],
      [ContractType.COMMERCIAL]: [
        'comercial', 'commercial', 'vânzare', 'cumpărare', 'sale', 'purchase',
        'furnizor', 'client', 'marfă', 'goods',
      ],
      [ContractType.SUPPLY]: [
        'furnizare', 'supply', 'livrare', 'delivery', 'aprovizionare',
      ],
      [ContractType.CONSULTING]: [
        'consultanță', 'consulting', 'consultant', 'advisor', 'consilier',
      ],
      [ContractType.PARTNERSHIP]: [
        'asociere', 'partnership', 'parteneriat', 'asociat', 'partner',
        'joint venture',
      ],
      [ContractType.LOAN]: [
        'împrumut', 'loan', 'credit', 'dobândă', 'interest', 'rambursare',
      ],
      [ContractType.LICENSE]: [
        'licență', 'license', 'drept de utilizare', 'right to use',
        'proprietate intelectuală', 'intellectual property',
      ],
      [ContractType.FRANCHISE]: [
        'franciză', 'franchise', 'franchisor', 'franchisee',
      ],
      [ContractType.MANDATE]: [
        'mandat', 'mandate', 'împuternicire', 'power of attorney', 'reprezentare',
      ],
      [ContractType.OTHER]: [],
    };

    let maxScore = 0;
    let detectedType = ContractType.OTHER;

    for (const [type, indicators] of Object.entries(typeIndicators)) {
      if (type === ContractType.OTHER) continue;
      const score = indicators.filter(ind => lowerText.includes(ind)).length;
      if (score > maxScore) {
        maxScore = score;
        detectedType = type as ContractType;
      }
    }

    return detectedType;
  }

  private calculateTypeConfidence(text: string, type: ContractType): number {
    const lowerText = text.toLowerCase();
    let confidence = 50; // Base confidence

    const typeIndicators: Record<string, string[]> = {
      [ContractType.EMPLOYMENT]: [
        'contract individual de muncă', 'employment contract', 'angajat',
        'cod muncii', 'salariu', 'program de lucru', 'concediu',
      ],
      [ContractType.NDA]: [
        'confidențialitate', 'non-disclosure', 'informații confidențiale',
        'secret comercial',
      ],
      // Add more as needed
    };

    const indicators = typeIndicators[type] || [];
    const matchCount = indicators.filter(ind => lowerText.includes(ind)).length;

    confidence += matchCount * 10;
    return Math.min(confidence, 95);
  }

  private extractParties(text: string): Party[] {
    const parties: Party[] = [];

    // Extract company parties (by CUI)
    const cuiPattern = /([A-Za-zÀ-ž\s.]+),?\s*(?:cu sediul|having its seat|having its registered office)?\s*(?:în|in|at)?\s*([^,]+),?\s*(?:CUI|RO|registration number)?\s*:?\s*(\d+)/gi;
    let match;

    while ((match = cuiPattern.exec(text)) !== null) {
      parties.push({
        name: match[1].trim(),
        type: 'COMPANY',
        identifier: match[3],
        role: parties.length === 0 ? 'PRIMARY' : 'SECONDARY',
        address: match[2].trim(),
      });
    }

    // Extract individual parties (by CNP)
    const cnpPattern = /([A-Za-zÀ-ž\s]+),?\s*(?:domiciliat|residing|with residence)?\s*(?:în|in|at)?\s*([^,]+),?\s*(?:CNP|personal identification number)?\s*:?\s*(\d{13})/gi;

    while ((match = cnpPattern.exec(text)) !== null) {
      parties.push({
        name: match[1].trim(),
        type: 'INDIVIDUAL',
        identifier: match[3],
        role: parties.length === 0 ? 'PRIMARY' : 'SECONDARY',
        address: match[2].trim(),
      });
    }

    // If no parties found, try simpler patterns
    if (parties.length === 0) {
      const simplePattern = /(?:între|between)\s*:?\s*([^,\n]+)/i;
      const simpleMatch = text.match(simplePattern);
      if (simpleMatch) {
        parties.push({
          name: simpleMatch[1].trim(),
          type: 'COMPANY',
          role: 'PRIMARY',
        });
      }
    }

    return parties;
  }

  private extractTerms(text: string, contractType: ContractType): ContractTerm[] {
    const terms: ContractTerm[] = [];
    const lowerText = text.toLowerCase();

    // Employment-specific terms
    if (contractType === ContractType.EMPLOYMENT) {
      // Salary
      const salaryPattern = /salariu[^\d]*(\d[\d.,]*)\s*(ron|lei|eur|usd)?/i;
      const salaryMatch = text.match(salaryPattern);
      if (salaryMatch) {
        terms.push({
          id: `term_${++this.counters.term}`,
          category: 'COMPENSATION',
          description: 'Salariul brut lunar',
          descriptionEn: 'Monthly gross salary',
          value: salaryMatch[1] + ' ' + (salaryMatch[2] || 'RON'),
          isKey: true,
          riskLevel: RiskLevel.LOW,
        });
      }

      // Working hours
      const hoursPattern = /(\d+)\s*ore\s*(?:pe\s*)?(?:zi|day)/i;
      const hoursMatch = text.match(hoursPattern);
      if (hoursMatch) {
        const hours = parseInt(hoursMatch[1]);
        terms.push({
          id: `term_${++this.counters.term}`,
          category: 'WORKING_CONDITIONS',
          description: 'Program de lucru',
          descriptionEn: 'Working hours',
          value: `${hours} ore/zi`,
          isKey: true,
          riskLevel: hours > 8 ? RiskLevel.HIGH : RiskLevel.LOW,
          complianceNotes: hours > 8 ? 'Depășește normul legal de 8 ore/zi' : undefined,
        });
      }

      // Vacation days
      const vacationPattern = /(\d+)\s*zile\s*(?:lucrătoare\s*)?(?:de\s*)?concediu/i;
      const vacationMatch = text.match(vacationPattern);
      if (vacationMatch) {
        const days = parseInt(vacationMatch[1]);
        terms.push({
          id: `term_${++this.counters.term}`,
          category: 'BENEFITS',
          description: 'Zile de concediu de odihnă',
          descriptionEn: 'Annual leave days',
          value: `${days} zile`,
          isKey: true,
          riskLevel: days < 20 ? RiskLevel.MEDIUM : RiskLevel.LOW,
          complianceNotes: days < 20 ? 'Sub minimul legal de 20 zile' : undefined,
        });
      }

      // Probation period
      const probationPattern = /perioadă\s*(?:de\s*)?probă[^\d]*(\d+)\s*(zile|luni|days|months)/i;
      const probationMatch = text.match(probationPattern);
      if (probationMatch) {
        terms.push({
          id: `term_${++this.counters.term}`,
          category: 'PROBATION',
          description: 'Perioada de probă',
          descriptionEn: 'Probation period',
          value: `${probationMatch[1]} ${probationMatch[2]}`,
          isKey: true,
          riskLevel: RiskLevel.LOW,
        });
      }
    }

    // NDA-specific terms
    if (contractType === ContractType.NDA) {
      // Duration
      const durationPattern = /valabil[^\d]*(\d+)\s*(ani|luni|years|months)/i;
      const durationMatch = text.match(durationPattern);
      if (durationMatch) {
        terms.push({
          id: `term_${++this.counters.term}`,
          category: 'DURATION',
          description: 'Durata acordului',
          descriptionEn: 'Agreement duration',
          value: `${durationMatch[1]} ${durationMatch[2]}`,
          isKey: true,
          riskLevel: RiskLevel.LOW,
        });
      }

      // Penalties
      if (lowerText.includes('penalități') || lowerText.includes('penalties')) {
        const penaltyPattern = /(?:penalități|penalties)[^\d]*(\d[\d.,]*)\s*(ron|lei|eur|usd)?/i;
        const penaltyMatch = text.match(penaltyPattern);
        if (penaltyMatch) {
          terms.push({
            id: `term_${++this.counters.term}`,
            category: 'PENALTIES',
            description: 'Penalități pentru încălcare',
            descriptionEn: 'Breach penalties',
            value: penaltyMatch[1] + ' ' + (penaltyMatch[2] || 'RON'),
            isKey: true,
            riskLevel: RiskLevel.HIGH,
          });
        }
      }
    }

    // Common terms for all contracts
    // Termination clause
    if (lowerText.includes('încetare') || lowerText.includes('termination')) {
      terms.push({
        id: `term_${++this.counters.term}`,
        category: 'TERMINATION',
        description: 'Clauză de încetare',
        descriptionEn: 'Termination clause',
        isKey: true,
        riskLevel: RiskLevel.MEDIUM,
      });
    }

    // Jurisdiction
    if (lowerText.includes('jurisdicție') || lowerText.includes('jurisdiction') || lowerText.includes('instanța')) {
      terms.push({
        id: `term_${++this.counters.term}`,
        category: 'LEGAL',
        description: 'Clauză de jurisdicție',
        descriptionEn: 'Jurisdiction clause',
        isKey: false,
        riskLevel: RiskLevel.LOW,
      });
    }

    return terms;
  }

  private extractObligations(text: string): Obligation[] {
    const obligations: Obligation[] = [];
    const lowerText = text.toLowerCase();

    // Common obligation patterns
    const obligationPatterns = [
      /se obligă să\s+([^.;]+)/gi,
      /obligația de a\s+([^.;]+)/gi,
      /shall\s+([^.;]+)/gi,
      /must\s+([^.;]+)/gi,
      /is required to\s+([^.;]+)/gi,
    ];

    for (const pattern of obligationPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        obligations.push({
          id: `obl_${++this.counters.obligation}`,
          party: 'To be determined',
          description: match[1].trim().substring(0, 200),
          descriptionEn: match[1].trim().substring(0, 200), // Would need translation
          isRecurring: lowerText.includes('periodic') || lowerText.includes('monthly') || lowerText.includes('lunar'),
          status: 'PENDING',
        });
      }
    }

    return obligations.slice(0, 10); // Limit to 10 obligations
  }

  private assessRisk(
    text: string,
    contractType: ContractType,
    terms: ContractTerm[],
  ): RiskAssessment {
    const findings: RiskAssessment['findings'] = [];
    let totalRiskScore = 0;
    const lowerText = text.toLowerCase();

    // Check for missing key clauses
    if (!lowerText.includes('încetare') && !lowerText.includes('termination')) {
      findings.push({
        category: 'MISSING_CLAUSE',
        description: 'Lipsește clauza de încetare a contractului',
        riskLevel: RiskLevel.HIGH,
        recommendation: 'Adăugați o clauză clară privind condițiile de încetare',
      });
      totalRiskScore += 25;
    }

    if (!lowerText.includes('forță majoră') && !lowerText.includes('force majeure')) {
      findings.push({
        category: 'MISSING_CLAUSE',
        description: 'Lipsește clauza de forță majoră',
        riskLevel: RiskLevel.MEDIUM,
        recommendation: 'Adăugați o clauză de forță majoră pentru protecție',
      });
      totalRiskScore += 15;
    }

    // Check for unlimited liability
    if (lowerText.includes('răspundere nelimitată') || lowerText.includes('unlimited liability')) {
      findings.push({
        category: 'LIABILITY',
        description: 'Contractul conține clauze de răspundere nelimitată',
        riskLevel: RiskLevel.CRITICAL,
        recommendation: 'Negociați un plafon al răspunderii',
      });
      totalRiskScore += 40;
    }

    // Check for automatic renewal without notice
    if ((lowerText.includes('reînnoire automată') || lowerText.includes('auto renewal')) &&
        !lowerText.includes('preaviz') && !lowerText.includes('notice')) {
      findings.push({
        category: 'AUTO_RENEWAL',
        description: 'Reînnoire automată fără cerința de preaviz',
        riskLevel: RiskLevel.MEDIUM,
        recommendation: 'Adăugați o perioadă de preaviz pentru reînnoire',
      });
      totalRiskScore += 15;
    }

    // Employment contract specific risks
    if (contractType === ContractType.EMPLOYMENT) {
      // Check minimum wage compliance
      const salaryTerm = terms.find(t => t.category === 'COMPENSATION');
      if (salaryTerm) {
        const salaryMatch = salaryTerm.value?.match(/(\d[\d.,]*)/);
        if (salaryMatch) {
          const salary = parseFloat(salaryMatch[1].replace(',', '.'));
          const minimumWage = 3700; // RON, 2025 value
          if (salary < minimumWage) {
            findings.push({
              category: 'COMPLIANCE',
              description: `Salariul (${salary} RON) este sub salariul minim (${minimumWage} RON)`,
              riskLevel: RiskLevel.CRITICAL,
              recommendation: 'Ajustați salariul la minimul legal',
            });
            totalRiskScore += 50;
          }
        }
      }

      // Check working hours
      const hoursTerm = terms.find(t => t.category === 'WORKING_CONDITIONS');
      if (hoursTerm) {
        const hoursMatch = hoursTerm.value?.match(/(\d+)/);
        if (hoursMatch && parseInt(hoursMatch[1]) > 8) {
          findings.push({
            category: 'COMPLIANCE',
            description: 'Programul de lucru depășește 8 ore/zi',
            riskLevel: RiskLevel.HIGH,
            recommendation: 'Reduceți la normul legal sau asigurați plata orelor suplimentare',
          });
          totalRiskScore += 25;
        }
      }
    }

    // Determine overall risk level
    let overallRisk: RiskLevel;
    if (totalRiskScore >= 60) {
      overallRisk = RiskLevel.CRITICAL;
    } else if (totalRiskScore >= 40) {
      overallRisk = RiskLevel.HIGH;
    } else if (totalRiskScore >= 20) {
      overallRisk = RiskLevel.MEDIUM;
    } else {
      overallRisk = RiskLevel.LOW;
    }

    return {
      overallRisk,
      riskScore: Math.min(totalRiskScore, 100),
      findings,
    };
  }

  private runComplianceChecks(text: string, contractType: ContractType): ComplianceCheck[] {
    const checks: ComplianceCheck[] = [];
    const lowerText = text.toLowerCase();

    // Romanian Labor Code compliance (for employment contracts)
    if (contractType === ContractType.EMPLOYMENT) {
      const laborCodeCheck: ComplianceCheck = {
        regulation: 'Codul Muncii (Legea 53/2003)',
        regulationCode: 'LABOR_CODE_RO',
        status: ComplianceStatus.COMPLIANT,
        findings: [],
        recommendations: [],
      };

      // Check mandatory elements
      const mandatoryElements = [
        { key: 'salariu', text: 'salary', requirement: 'Salariul de bază' },
        { key: 'program', text: 'working hours', requirement: 'Programul de lucru' },
        { key: 'concediu', text: 'vacation', requirement: 'Concediul de odihnă' },
        { key: 'funcți', text: 'position', requirement: 'Funcția/postul' },
      ];

      for (const element of mandatoryElements) {
        if (!lowerText.includes(element.key) && !lowerText.includes(element.text)) {
          laborCodeCheck.findings.push(`Lipsește: ${element.requirement}`);
          laborCodeCheck.status = ComplianceStatus.NON_COMPLIANT;
        }
      }

      if (laborCodeCheck.findings.length > 0) {
        laborCodeCheck.recommendations.push('Completați elementele obligatorii conform art. 17 Codul Muncii');
      }

      checks.push(laborCodeCheck);
    }

    // GDPR compliance check
    const gdprCheck: ComplianceCheck = {
      regulation: 'GDPR (Regulamentul UE 2016/679)',
      regulationCode: 'GDPR_EU',
      status: ComplianceStatus.NOT_APPLICABLE,
      findings: [],
      recommendations: [],
    };

    // Check if contract involves personal data
    const hasPersonalData = lowerText.includes('date personale') ||
                           lowerText.includes('personal data') ||
                           lowerText.includes('cnp') ||
                           lowerText.includes('prelucrare');

    if (hasPersonalData) {
      gdprCheck.status = ComplianceStatus.NEEDS_REVIEW;

      // Check GDPR requirements
      if (!lowerText.includes('consimțământ') && !lowerText.includes('consent')) {
        gdprCheck.findings.push('Nu se menționează baza legală pentru prelucrare');
      }

      if (!lowerText.includes('dreptul') && !lowerText.includes('right to')) {
        gdprCheck.findings.push('Nu se menționează drepturile persoanei vizate');
      }

      if (gdprCheck.findings.length > 0) {
        gdprCheck.recommendations.push('Adăugați clauze GDPR conform Regulamentului UE 2016/679');
      } else {
        gdprCheck.status = ComplianceStatus.COMPLIANT;
      }
    }

    checks.push(gdprCheck);

    return checks;
  }

  private generateSummary(
    text: string,
    contractType: ContractType,
    parties: Party[],
    terms: ContractTerm[],
  ): { summary: string; summaryEn: string } {
    const partyNames = parties.map(p => p.name).join(' și ');
    const keyTerms = terms.filter(t => t.isKey).map(t => t.description).join(', ');

    const typeNames: Record<ContractType, { ro: string; en: string }> = {
      [ContractType.EMPLOYMENT]: { ro: 'Contract individual de muncă', en: 'Employment Contract' },
      [ContractType.COMMERCIAL]: { ro: 'Contract comercial', en: 'Commercial Contract' },
      [ContractType.NDA]: { ro: 'Acord de confidențialitate', en: 'Non-Disclosure Agreement' },
      [ContractType.LEASE]: { ro: 'Contract de închiriere', en: 'Lease Agreement' },
      [ContractType.SERVICE]: { ro: 'Contract de prestări servicii', en: 'Service Agreement' },
      [ContractType.SUPPLY]: { ro: 'Contract de furnizare', en: 'Supply Agreement' },
      [ContractType.PARTNERSHIP]: { ro: 'Contract de asociere', en: 'Partnership Agreement' },
      [ContractType.LOAN]: { ro: 'Contract de împrumut', en: 'Loan Agreement' },
      [ContractType.CONSULTING]: { ro: 'Contract de consultanță', en: 'Consulting Agreement' },
      [ContractType.LICENSE]: { ro: 'Contract de licență', en: 'License Agreement' },
      [ContractType.FRANCHISE]: { ro: 'Contract de franciză', en: 'Franchise Agreement' },
      [ContractType.MANDATE]: { ro: 'Contract de mandat', en: 'Mandate Agreement' },
      [ContractType.OTHER]: { ro: 'Contract', en: 'Contract' },
    };

    const typeName = typeNames[contractType];

    const summary = `${typeName.ro} între ${partyNames || 'părți neidentificate'}. Termeni cheie: ${keyTerms || 'de analizat'}.`;
    const summaryEn = `${typeName.en} between ${partyNames || 'unidentified parties'}. Key terms: ${keyTerms || 'to be analyzed'}.`;

    return { summary, summaryEn };
  }

  private extractKeyDates(text: string): Array<{ type: string; date: Date; description: string }> {
    const dates: Array<{ type: string; date: Date; description: string }> = [];

    // Romanian date patterns
    const datePatterns = [
      /data\s*(?:de\s*)?(?:începere|start)[^\d]*(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/gi,
      /data\s*(?:de\s*)?(?:încetare|expirare|end)[^\d]*(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/gi,
      /(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/g,
    ];

    for (const pattern of datePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const day = parseInt(match[1]);
        const month = parseInt(match[2]) - 1;
        const year = parseInt(match[3]);

        if (day > 0 && day <= 31 && month >= 0 && month <= 11 && year >= 2000) {
          const date = new Date(year, month, day);
          dates.push({
            type: pattern.source.includes('început') || pattern.source.includes('start') ? 'effective' : 'general',
            date,
            description: `${day}.${month + 1}.${year}`,
          });
        }
      }
    }

    return dates.slice(0, 5); // Limit to 5 dates
  }

  private generateWarningsAndRecommendations(
    riskAssessment: RiskAssessment,
    complianceChecks: ComplianceCheck[],
    terms: ContractTerm[],
  ): { warnings: string[]; recommendations: string[] } {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Add risk-based warnings
    for (const finding of riskAssessment.findings) {
      if (finding.riskLevel === RiskLevel.CRITICAL || finding.riskLevel === RiskLevel.HIGH) {
        warnings.push(finding.description);
      }
      recommendations.push(finding.recommendation);
    }

    // Add compliance-based warnings
    for (const check of complianceChecks) {
      if (check.status === ComplianceStatus.NON_COMPLIANT) {
        warnings.push(`Non-conformitate ${check.regulation}: ${check.findings.join(', ')}`);
      }
      recommendations.push(...check.recommendations);
    }

    // Add term-based warnings
    for (const term of terms) {
      if (term.complianceNotes) {
        warnings.push(`${term.description}: ${term.complianceNotes}`);
      }
    }

    return {
      warnings: [...new Set(warnings)],
      recommendations: [...new Set(recommendations)],
    };
  }

  private extractTitle(text: string): string | null {
    // Try to extract title from first lines
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      if (firstLine.length < 100 && firstLine.toUpperCase() === firstLine) {
        return firstLine;
      }
    }
    return null;
  }

  private generateTags(contractType: ContractType, terms: ContractTerm[]): string[] {
    const tags: string[] = [contractType.toLowerCase()];

    // Add category-based tags
    const categories = [...new Set(terms.map(t => t.category.toLowerCase()))];
    tags.push(...categories);

    // Add risk-based tags
    const hasHighRisk = terms.some(t => t.riskLevel === RiskLevel.HIGH || t.riskLevel === RiskLevel.CRITICAL);
    if (hasHighRisk) {
      tags.push('high-risk');
    }

    return tags;
  }

  // =================== CONTRACT CRUD ===================

  async getContracts(
    tenantId: string,
    options?: {
      type?: ContractType;
      status?: ContractStatus;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<Contract[]> {
    let contracts = Array.from(this.contracts.values()).filter(c => c.tenantId === tenantId);

    if (options?.type) {
      contracts = contracts.filter(c => c.type === options.type);
    }

    if (options?.status) {
      contracts = contracts.filter(c => c.status === options.status);
    }

    if (options?.startDate) {
      contracts = contracts.filter(c => c.effectiveDate >= options.startDate!);
    }

    if (options?.endDate) {
      contracts = contracts.filter(c => c.effectiveDate <= options.endDate!);
    }

    return contracts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getContract(tenantId: string, contractId: string): Promise<Contract | null> {
    const contract = this.contracts.get(contractId);
    if (contract && contract.tenantId === tenantId) {
      return contract;
    }
    return null;
  }

  async updateContractStatus(
    tenantId: string,
    contractId: string,
    status: ContractStatus,
  ): Promise<Contract | null> {
    const contract = this.contracts.get(contractId);
    if (contract && contract.tenantId === tenantId) {
      contract.status = status;
      contract.updatedAt = new Date();
      return contract;
    }
    return null;
  }

  async deleteContract(tenantId: string, contractId: string): Promise<void> {
    const contract = this.contracts.get(contractId);
    if (contract && contract.tenantId === tenantId) {
      this.contracts.delete(contractId);
    }
  }

  // =================== TEMPLATES ===================

  async getTemplates(
    tenantId: string,
    options?: {
      type?: ContractType;
      language?: 'RO' | 'EN';
    },
  ): Promise<ContractTemplate[]> {
    let templates = Array.from(this.templates.values()).filter(
      t => t.tenantId === tenantId || t.tenantId === 'system',
    );

    if (options?.type) {
      templates = templates.filter(t => t.type === options.type);
    }

    if (options?.language) {
      templates = templates.filter(t => t.language === options.language);
    }

    return templates.filter(t => t.isActive);
  }

  async getTemplate(templateId: string): Promise<ContractTemplate | null> {
    return this.templates.get(templateId) || null;
  }

  async createTemplate(
    tenantId: string,
    data: Omit<ContractTemplate, 'id' | 'tenantId' | 'createdAt'>,
  ): Promise<ContractTemplate> {
    const templateId = `template_${++this.counters.template}`;
    const template: ContractTemplate = {
      ...data,
      id: templateId,
      tenantId,
      createdAt: new Date(),
    };
    this.templates.set(templateId, template);
    return template;
  }

  async generateContractFromTemplate(
    tenantId: string,
    templateId: string,
    variables: Record<string, string>,
  ): Promise<string> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    let content = template.content;

    // Replace variables
    for (const [name, value] of Object.entries(variables)) {
      const pattern = new RegExp(`\\{\\{${name}\\}\\}`, 'g');
      content = content.replace(pattern, value);
    }

    // Check for missing required variables
    const missingVars = template.variables
      .filter(v => v.required && !variables[v.name])
      .map(v => v.name);

    if (missingVars.length > 0) {
      throw new Error(`Missing required variables: ${missingVars.join(', ')}`);
    }

    return content;
  }

  // =================== COMPARISON ===================

  async compareContracts(
    tenantId: string,
    contractId1: string,
    contractId2: string,
  ): Promise<{
    differences: Array<{
      field: string;
      contract1Value: string;
      contract2Value: string;
    }>;
    riskComparison: {
      contract1Risk: RiskLevel;
      contract2Risk: RiskLevel;
      riskDelta: number;
    };
  }> {
    const contract1 = await this.getContract(tenantId, contractId1);
    const contract2 = await this.getContract(tenantId, contractId2);

    if (!contract1 || !contract2) {
      throw new Error('One or both contracts not found');
    }

    const differences: Array<{
      field: string;
      contract1Value: string;
      contract2Value: string;
    }> = [];

    // Compare basic fields
    if (contract1.type !== contract2.type) {
      differences.push({
        field: 'type',
        contract1Value: contract1.type,
        contract2Value: contract2.type,
      });
    }

    if (contract1.status !== contract2.status) {
      differences.push({
        field: 'status',
        contract1Value: contract1.status,
        contract2Value: contract2.status,
      });
    }

    // Compare terms
    const terms1Map = new Map(contract1.terms.map(t => [t.category, t]));
    const terms2Map = new Map(contract2.terms.map(t => [t.category, t]));

    const allCategories = new Set([...terms1Map.keys(), ...terms2Map.keys()]);
    for (const category of allCategories) {
      const term1 = terms1Map.get(category);
      const term2 = terms2Map.get(category);

      if (!term1 && term2) {
        differences.push({
          field: `term:${category}`,
          contract1Value: 'N/A',
          contract2Value: term2.value || term2.description,
        });
      } else if (term1 && !term2) {
        differences.push({
          field: `term:${category}`,
          contract1Value: term1.value || term1.description,
          contract2Value: 'N/A',
        });
      } else if (term1 && term2 && term1.value !== term2.value) {
        differences.push({
          field: `term:${category}`,
          contract1Value: term1.value || term1.description,
          contract2Value: term2.value || term2.description,
        });
      }
    }

    const riskLevelToNumber = (level: RiskLevel): number => {
      const map: Record<RiskLevel, number> = {
        [RiskLevel.LOW]: 1,
        [RiskLevel.MEDIUM]: 2,
        [RiskLevel.HIGH]: 3,
        [RiskLevel.CRITICAL]: 4,
      };
      return map[level];
    };

    return {
      differences,
      riskComparison: {
        contract1Risk: contract1.riskAssessment?.overallRisk || RiskLevel.LOW,
        contract2Risk: contract2.riskAssessment?.overallRisk || RiskLevel.LOW,
        riskDelta:
          riskLevelToNumber(contract2.riskAssessment?.overallRisk || RiskLevel.LOW) -
          riskLevelToNumber(contract1.riskAssessment?.overallRisk || RiskLevel.LOW),
      },
    };
  }

  // =================== ANALYTICS ===================

  async getContractStats(tenantId: string): Promise<{
    totalContracts: number;
    byType: Record<ContractType, number>;
    byStatus: Record<ContractStatus, number>;
    expiringWithin30Days: number;
    highRiskContracts: number;
    complianceIssues: number;
  }> {
    const contracts = Array.from(this.contracts.values()).filter(c => c.tenantId === tenantId);

    const byType: Record<ContractType, number> = {} as Record<ContractType, number>;
    const byStatus: Record<ContractStatus, number> = {} as Record<ContractStatus, number>;

    for (const type of Object.values(ContractType)) {
      byType[type] = 0;
    }
    for (const status of Object.values(ContractStatus)) {
      byStatus[status] = 0;
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    let expiringWithin30Days = 0;
    let highRiskContracts = 0;
    let complianceIssues = 0;

    for (const contract of contracts) {
      byType[contract.type]++;
      byStatus[contract.status]++;

      if (contract.expirationDate && contract.expirationDate <= thirtyDaysFromNow && contract.expirationDate >= now) {
        expiringWithin30Days++;
      }

      if (contract.riskAssessment?.overallRisk === RiskLevel.HIGH ||
          contract.riskAssessment?.overallRisk === RiskLevel.CRITICAL) {
        highRiskContracts++;
      }

      const hasComplianceIssue = contract.complianceChecks.some(
        c => c.status === ComplianceStatus.NON_COMPLIANT,
      );
      if (hasComplianceIssue) {
        complianceIssues++;
      }
    }

    return {
      totalContracts: contracts.length,
      byType,
      byStatus,
      expiringWithin30Days,
      highRiskContracts,
      complianceIssues,
    };
  }
}
