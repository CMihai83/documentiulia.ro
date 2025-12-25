import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { HRContractType } from '@prisma/client';
import * as crypto from 'crypto';

// Contract Template Types
export enum ContractTemplateCategory {
  CIM = 'CIM', // Contract Individual de Munca
  PART_TIME = 'PART_TIME',
  FIXED_TERM = 'FIXED_TERM',
  TELEWORK = 'TELEWORK',
  TEMPORARY = 'TEMPORARY',
  SEASONAL = 'SEASONAL',
  INTERNSHIP = 'INTERNSHIP',
  APPRENTICESHIP = 'APPRENTICESHIP',
  MANAGEMENT = 'MANAGEMENT',
  AMENDMENT = 'AMENDMENT',
}

export interface ContractTemplate {
  id: string;
  name: string;
  nameEn: string;
  category: ContractTemplateCategory;
  description: string;
  clauses: ContractClause[];
  requiredFields: string[];
  optionalFields: string[];
  legalReferences: string[];
  version: string;
  locale: 'ro' | 'en';
  active: boolean;
}

export interface ContractClause {
  id: string;
  title: string;
  titleEn: string;
  content: string;
  contentEn: string;
  type: 'mandatory' | 'optional' | 'conditional';
  condition?: string;
  variables: string[];
  order: number;
  legalReference?: string;
}

export interface GeneratedContract {
  id: string;
  templateId: string;
  employeeId: string;
  content: string;
  contentHtml: string;
  metadata: ContractMetadata;
  clauses: GeneratedClause[];
  signatures: SignatureRequest[];
  status: 'draft' | 'pending_review' | 'pending_signature' | 'signed' | 'active';
  createdAt: Date;
  validatedAt?: Date;
  signedAt?: Date;
}

export interface ContractMetadata {
  employerName: string;
  employerCui: string;
  employerAddress: string;
  employeeName: string;
  employeeCnp: string;
  employeeAddress: string;
  position: string;
  department?: string;
  salary: number;
  currency: string;
  workHours: number;
  startDate: Date;
  endDate?: Date;
  probationDays?: number;
  probationEnd?: Date;
  workLocation: string;
  workSchedule: string;
  nonCompete?: NonCompeteClause;
  telework?: TeleworkClause;
}

export interface NonCompeteClause {
  enabled: boolean;
  durationMonths: number;
  geographicScope: string;
  compensation: number;
  activities: string[];
}

export interface TeleworkClause {
  enabled: boolean;
  daysPerWeek: number;
  equipment: string[];
  expenses: number;
  schedule: string;
}

export interface GeneratedClause {
  clauseId: string;
  title: string;
  content: string;
  included: boolean;
  variables: Record<string, string>;
}

export interface SignatureRequest {
  id: string;
  signerType: 'employer' | 'employee';
  signerName: string;
  signerEmail: string;
  provider: 'docusign' | 'adobesign' | 'internal';
  status: 'pending' | 'sent' | 'viewed' | 'signed' | 'declined';
  signatureUrl?: string;
  signedAt?: Date;
  externalId?: string;
}

export interface AIClauseSuggestion {
  clauseId: string;
  reason: string;
  confidence: number;
  source: string;
}

// Romanian Labor Code (Codul Muncii) Compliant Templates
const CONTRACT_TEMPLATES: ContractTemplate[] = [
  // 1. Standard CIM (Contract Individual de Munca)
  {
    id: 'tpl-cim-standard',
    name: 'Contract Individual de Muncă - Standard',
    nameEn: 'Standard Individual Employment Contract',
    category: ContractTemplateCategory.CIM,
    description: 'Contract standard pe durată nedeterminată conform Codul Muncii',
    requiredFields: ['employeeName', 'employeeCnp', 'position', 'salary', 'startDate', 'workLocation'],
    optionalFields: ['department', 'probationDays', 'nonCompete'],
    legalReferences: ['Art. 10-15 Codul Muncii', 'Art. 17 - Informarea prealabilă'],
    version: '2.0',
    locale: 'ro',
    active: true,
    clauses: [
      {
        id: 'cl-parties',
        title: 'Părțile Contractante',
        titleEn: 'Contracting Parties',
        content: 'Între {{employerName}}, cu sediul în {{employerAddress}}, CUI {{employerCui}}, reprezentată legal de {{employerRepresentative}}, în calitate de ANGAJATOR, și {{employeeName}}, CNP {{employeeCnp}}, domiciliat(ă) în {{employeeAddress}}, în calitate de SALARIAT, s-a încheiat prezentul contract individual de muncă.',
        contentEn: 'Between {{employerName}}, headquartered at {{employerAddress}}, Tax ID {{employerCui}}, legally represented by {{employerRepresentative}}, as EMPLOYER, and {{employeeName}}, Personal ID {{employeeCnp}}, residing at {{employeeAddress}}, as EMPLOYEE, the present individual employment contract is concluded.',
        type: 'mandatory',
        variables: ['employerName', 'employerAddress', 'employerCui', 'employerRepresentative', 'employeeName', 'employeeCnp', 'employeeAddress'],
        order: 1,
        legalReference: 'Art. 10 Codul Muncii',
      },
      {
        id: 'cl-duration',
        title: 'Durata Contractului',
        titleEn: 'Contract Duration',
        content: 'Prezentul contract se încheie pe DURATĂ NEDETERMINATĂ, începând cu data de {{startDate}}.',
        contentEn: 'This contract is concluded for an INDEFINITE PERIOD, starting from {{startDate}}.',
        type: 'mandatory',
        variables: ['startDate'],
        order: 2,
        legalReference: 'Art. 12 Codul Muncii',
      },
      {
        id: 'cl-probation',
        title: 'Perioada de Probă',
        titleEn: 'Probation Period',
        content: 'Perioada de probă este de {{probationDays}} zile calendaristice, care se încheie la data de {{probationEnd}}. În această perioadă, contractul poate fi desfăcut fără preaviz de oricare dintre părți.',
        contentEn: 'The probation period is {{probationDays}} calendar days, ending on {{probationEnd}}. During this period, the contract may be terminated without notice by either party.',
        type: 'conditional',
        condition: 'probationDays > 0',
        variables: ['probationDays', 'probationEnd'],
        order: 3,
        legalReference: 'Art. 31-33 Codul Muncii',
      },
      {
        id: 'cl-position',
        title: 'Felul Muncii',
        titleEn: 'Job Description',
        content: 'Salariatul este angajat în funcția de {{position}}{{#department}}, în cadrul departamentului {{department}}{{/department}}. Atribuțiile și responsabilitățile sunt detaliate în fișa postului, anexă la prezentul contract.',
        contentEn: 'The employee is hired for the position of {{position}}{{#department}}, within the {{department}} department{{/department}}. Duties and responsibilities are detailed in the job description annexed to this contract.',
        type: 'mandatory',
        variables: ['position', 'department'],
        order: 4,
        legalReference: 'Art. 17 alin. 3 lit. d) Codul Muncii',
      },
      {
        id: 'cl-workplace',
        title: 'Locul de Muncă',
        titleEn: 'Workplace',
        content: 'Locul de muncă este la sediul angajatorului din {{workLocation}}. {{#telework}}Salariatul va desfășura activitate în regim de telemuncă {{teleworkDays}} zile pe săptămână, conform prevederilor Legii nr. 81/2018.{{/telework}}',
        contentEn: 'The workplace is at the employer\'s premises at {{workLocation}}. {{#telework}}The employee will perform work remotely {{teleworkDays}} days per week, in accordance with Law no. 81/2018.{{/telework}}',
        type: 'mandatory',
        variables: ['workLocation', 'telework', 'teleworkDays'],
        order: 5,
        legalReference: 'Art. 17 alin. 3 lit. b) Codul Muncii',
      },
      {
        id: 'cl-schedule',
        title: 'Durata Timpului de Muncă',
        titleEn: 'Working Hours',
        content: 'Durata timpului de muncă este de {{workHours}} ore pe săptămână, {{dailyHours}} ore pe zi, cu un program de lucru {{workSchedule}}. Durata concediului anual de odihnă este de minim 20 de zile lucrătoare.',
        contentEn: 'Working time is {{workHours}} hours per week, {{dailyHours}} hours per day, with a {{workSchedule}} work schedule. Annual leave is a minimum of 20 working days.',
        type: 'mandatory',
        variables: ['workHours', 'dailyHours', 'workSchedule'],
        order: 6,
        legalReference: 'Art. 112-113 Codul Muncii',
      },
      {
        id: 'cl-salary',
        title: 'Salariul',
        titleEn: 'Salary',
        content: 'Salariul de bază lunar brut este de {{salary}} {{currency}}, plătibil în a {{payDay}}-a zi a lunii următoare. Salariatul beneficiază de toate drepturile prevăzute de lege, inclusiv sporuri, bonusuri și alte beneficii conform politicii companiei.',
        contentEn: 'The gross monthly base salary is {{salary}} {{currency}}, payable on the {{payDay}}th of the following month. The employee is entitled to all rights provided by law, including allowances, bonuses, and other benefits according to company policy.',
        type: 'mandatory',
        variables: ['salary', 'currency', 'payDay'],
        order: 7,
        legalReference: 'Art. 159-166 Codul Muncii',
      },
      {
        id: 'cl-noncompete',
        title: 'Clauza de Neconcurență',
        titleEn: 'Non-Compete Clause',
        content: 'După încetarea contractului, salariatul se obligă să nu presteze, pentru o perioadă de {{nonCompeteDuration}} luni, activități în domeniul {{nonCompeteActivities}}, în zona geografică {{nonCompeteArea}}. Indemnizația de neconcurență este de {{nonCompeteCompensation}} {{currency}} lunar.',
        contentEn: 'After contract termination, the employee agrees not to perform, for a period of {{nonCompeteDuration}} months, activities in the field of {{nonCompeteActivities}}, in the geographic area of {{nonCompeteArea}}. The non-compete indemnity is {{nonCompeteCompensation}} {{currency}} monthly.',
        type: 'conditional',
        condition: 'nonCompete.enabled === true',
        variables: ['nonCompeteDuration', 'nonCompeteActivities', 'nonCompeteArea', 'nonCompeteCompensation', 'currency'],
        order: 8,
        legalReference: 'Art. 21-24 Codul Muncii',
      },
      {
        id: 'cl-termination',
        title: 'Încetarea Contractului',
        titleEn: 'Contract Termination',
        content: 'Contractul poate înceta prin: acordul părților, demisie (cu preaviz de 20 zile lucrătoare), concediere conform legii, sau expirarea termenului (pentru contracte pe durată determinată). Încetarea se va face cu respectarea prevederilor Codului Muncii.',
        contentEn: 'The contract may be terminated by: mutual agreement, resignation (with 20 working days notice), dismissal in accordance with law, or expiry (for fixed-term contracts). Termination shall comply with Labor Code provisions.',
        type: 'mandatory',
        variables: [],
        order: 9,
        legalReference: 'Art. 55-81 Codul Muncii',
      },
      {
        id: 'cl-final',
        title: 'Dispoziții Finale',
        titleEn: 'Final Provisions',
        content: 'Prezentul contract s-a încheiat în două exemplare, câte unul pentru fiecare parte. Orice modificare se va face prin act adițional, semnat de ambele părți. Litigiile se soluționează conform legislației române.',
        contentEn: 'This contract is concluded in two copies, one for each party. Any modification shall be made by addendum, signed by both parties. Disputes shall be resolved according to Romanian law.',
        type: 'mandatory',
        variables: [],
        order: 10,
        legalReference: 'Art. 17 Codul Muncii',
      },
    ],
  },
  // 2. Part-Time Contract
  {
    id: 'tpl-part-time',
    name: 'Contract de Muncă cu Timp Parțial',
    nameEn: 'Part-Time Employment Contract',
    category: ContractTemplateCategory.PART_TIME,
    description: 'Contract pentru angajare cu normă parțială (sub 40 ore/săptămână)',
    requiredFields: ['employeeName', 'employeeCnp', 'position', 'salary', 'startDate', 'workHours'],
    optionalFields: ['department', 'probationDays'],
    legalReferences: ['Art. 103-107 Codul Muncii'],
    version: '1.0',
    locale: 'ro',
    active: true,
    clauses: [],
  },
  // 3. Fixed-Term Contract
  {
    id: 'tpl-fixed-term',
    name: 'Contract de Muncă pe Durată Determinată',
    nameEn: 'Fixed-Term Employment Contract',
    category: ContractTemplateCategory.FIXED_TERM,
    description: 'Contract pe perioadă determinată (max 36 luni, max 3 prelungiri)',
    requiredFields: ['employeeName', 'employeeCnp', 'position', 'salary', 'startDate', 'endDate', 'reason'],
    optionalFields: ['department'],
    legalReferences: ['Art. 82-87 Codul Muncii'],
    version: '1.0',
    locale: 'ro',
    active: true,
    clauses: [],
  },
  // 4. Telework Contract
  {
    id: 'tpl-telework',
    name: 'Contract de Telemuncă',
    nameEn: 'Telework Employment Contract',
    category: ContractTemplateCategory.TELEWORK,
    description: 'Contract pentru activitate desfășurată în regim de telemuncă (Legea 81/2018)',
    requiredFields: ['employeeName', 'employeeCnp', 'position', 'salary', 'startDate', 'teleworkLocation', 'teleworkSchedule'],
    optionalFields: ['department', 'equipment', 'expenses'],
    legalReferences: ['Legea nr. 81/2018', 'OUG 53/2023'],
    version: '2.0',
    locale: 'ro',
    active: true,
    clauses: [],
  },
  // 5. Management Contract
  {
    id: 'tpl-management',
    name: 'Contract de Management',
    nameEn: 'Management Contract',
    category: ContractTemplateCategory.MANAGEMENT,
    description: 'Contract pentru funcții de conducere cu obiective de performanță',
    requiredFields: ['employeeName', 'employeeCnp', 'position', 'salary', 'startDate', 'performanceObjectives'],
    optionalFields: ['bonusStructure', 'confidentiality', 'nonCompete'],
    legalReferences: ['Codul Muncii', 'Legea societăților'],
    version: '1.0',
    locale: 'ro',
    active: true,
    clauses: [],
  },
  // 6. Internship Contract
  {
    id: 'tpl-internship',
    name: 'Contract de Stagiu',
    nameEn: 'Internship Contract',
    category: ContractTemplateCategory.INTERNSHIP,
    description: 'Contract pentru debutanți în profesie (max 6 luni)',
    requiredFields: ['employeeName', 'employeeCnp', 'position', 'salary', 'startDate', 'mentor'],
    optionalFields: ['trainingPlan'],
    legalReferences: ['Legea nr. 335/2013'],
    version: '1.0',
    locale: 'ro',
    active: true,
    clauses: [],
  },
  // 7. Amendment Template
  {
    id: 'tpl-amendment',
    name: 'Act Adițional la Contractul de Muncă',
    nameEn: 'Employment Contract Amendment',
    category: ContractTemplateCategory.AMENDMENT,
    description: 'Act adițional pentru modificarea contractului existent',
    requiredFields: ['originalContractId', 'originalContractDate', 'changes', 'effectiveDate'],
    optionalFields: [],
    legalReferences: ['Art. 17 Codul Muncii'],
    version: '1.0',
    locale: 'ro',
    active: true,
    clauses: [],
  },
];

// More templates (50+ total) would include variations for:
// - Seasonal workers, Temporary agency, Apprenticeship
// - Specific industries (construction, IT, medical, education)
// - Executive/Director level, Sales with commission
// - Shift work, Night shift, On-call arrangements

@Injectable()
export class ContractGeneratorService {
  private readonly logger = new Logger(ContractGeneratorService.name);
  private templates: Map<string, ContractTemplate> = new Map();
  private generatedContracts: Map<string, GeneratedContract> = new Map();

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    CONTRACT_TEMPLATES.forEach((tpl) => {
      this.templates.set(tpl.id, tpl);
    });
    this.logger.log(`Initialized ${this.templates.size} contract templates`);
  }

  // =================== TEMPLATE MANAGEMENT ===================

  getTemplates(category?: ContractTemplateCategory, locale?: string): ContractTemplate[] {
    let templates = Array.from(this.templates.values()).filter((t) => t.active);

    if (category) {
      templates = templates.filter((t) => t.category === category);
    }
    if (locale) {
      templates = templates.filter((t) => t.locale === locale);
    }

    return templates;
  }

  getTemplate(templateId: string): ContractTemplate {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }
    return template;
  }

  // =================== AI CLAUSE SUGGESTIONS ===================

  async suggestClauses(
    contractType: HRContractType,
    employeeData: {
      position: string;
      department?: string;
      salary: number;
      isManager?: boolean;
      hasAccessToConfidential?: boolean;
      workRemotely?: boolean;
    },
  ): Promise<AIClauseSuggestion[]> {
    const suggestions: AIClauseSuggestion[] = [];

    // Non-compete suggestion for managers or high-salary employees
    if (employeeData.isManager || employeeData.salary > 15000) {
      suggestions.push({
        clauseId: 'cl-noncompete',
        reason: 'Recomandat pentru funcții de conducere sau salarii peste 15,000 RON',
        confidence: 0.85,
        source: 'AI Analysis - Art. 21-24 Codul Muncii',
      });
    }

    // Confidentiality clause for access to sensitive data
    if (employeeData.hasAccessToConfidential) {
      suggestions.push({
        clauseId: 'cl-confidentiality',
        reason: 'Angajatul are acces la date confidențiale ale companiei',
        confidence: 0.95,
        source: 'GDPR compliance & business protection',
      });
    }

    // Telework clause
    if (employeeData.workRemotely) {
      suggestions.push({
        clauseId: 'cl-telework',
        reason: 'Angajatul va lucra în regim de telemuncă conform Legii 81/2018',
        confidence: 0.99,
        source: 'Legea nr. 81/2018, OUG 53/2023',
      });
    }

    // IT equipment clause for remote work
    if (employeeData.workRemotely) {
      suggestions.push({
        clauseId: 'cl-equipment',
        reason: 'Necesită specificarea echipamentelor IT pentru telemuncă',
        confidence: 0.90,
        source: 'Legea nr. 81/2018 Art. 5',
      });
    }

    // Performance bonus clause for management
    if (employeeData.isManager) {
      suggestions.push({
        clauseId: 'cl-performance-bonus',
        reason: 'Recomandat pentru funcții de conducere - obiective de performanță',
        confidence: 0.80,
        source: 'Best practices HR',
      });
    }

    return suggestions;
  }

  // =================== CONTRACT GENERATION ===================

  async generateContract(
    userId: string,
    templateId: string,
    employeeId: string,
    data: {
      employerName: string;
      employerCui: string;
      employerAddress: string;
      employerRepresentative: string;
      employeeName: string;
      employeeCnp: string;
      employeeAddress: string;
      position: string;
      department?: string;
      salary: number;
      currency?: string;
      workHours?: number;
      startDate: Date;
      endDate?: Date;
      probationDays?: number;
      workLocation: string;
      workSchedule?: string;
      telework?: TeleworkClause;
      nonCompete?: NonCompeteClause;
    },
  ): Promise<GeneratedContract> {
    const template = this.getTemplate(templateId);

    // Validate required fields
    for (const field of template.requiredFields) {
      if (!(field in data) || (data as Record<string, any>)[field] === undefined || (data as Record<string, any>)[field] === null) {
        throw new BadRequestException(`Required field missing: ${field}`);
      }
    }

    // Validate probation period per Romanian law
    if (data.probationDays) {
      const maxProbation = this.getMaxProbationDays(data.position);
      if (data.probationDays > maxProbation) {
        throw new BadRequestException(
          `Probation period exceeds legal maximum of ${maxProbation} days for this position type`,
        );
      }
    }

    // Calculate probation end date
    const probationEnd = data.probationDays
      ? new Date(data.startDate.getTime() + data.probationDays * 24 * 60 * 60 * 1000)
      : undefined;

    // Build metadata
    const metadata: ContractMetadata = {
      employerName: data.employerName,
      employerCui: data.employerCui,
      employerAddress: data.employerAddress,
      employeeName: data.employeeName,
      employeeCnp: data.employeeCnp,
      employeeAddress: data.employeeAddress,
      position: data.position,
      department: data.department,
      salary: data.salary,
      currency: data.currency || 'RON',
      workHours: data.workHours || 40,
      startDate: data.startDate,
      endDate: data.endDate,
      probationDays: data.probationDays,
      probationEnd,
      workLocation: data.workLocation,
      workSchedule: data.workSchedule || 'Luni-Vineri 09:00-18:00',
      nonCompete: data.nonCompete,
      telework: data.telework,
    };

    // Generate clauses
    const generatedClauses = this.generateClauses(template, metadata, data);

    // Generate contract content
    const content = this.buildContractContent(template, generatedClauses, metadata);
    const contentHtml = this.buildContractHtml(template, generatedClauses, metadata);

    // Create contract record
    const contractId = `contract_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const generatedContract: GeneratedContract = {
      id: contractId,
      templateId,
      employeeId,
      content,
      contentHtml,
      metadata,
      clauses: generatedClauses,
      signatures: [],
      status: 'draft',
      createdAt: new Date(),
    };

    this.generatedContracts.set(contractId, generatedContract);
    this.logger.log(`Generated contract ${contractId} from template ${templateId}`);

    return generatedContract;
  }

  private getMaxProbationDays(position: string): number {
    // Per Romanian Labor Code:
    // - Standard positions: max 90 days
    // - Management/executive: max 120 days
    const isManagement = /director|manager|CEO|CFO|CTO|șef|coordonator/i.test(position);
    return isManagement ? 120 : 90;
  }

  private generateClauses(
    template: ContractTemplate,
    metadata: ContractMetadata,
    data: Record<string, any>,
  ): GeneratedClause[] {
    return template.clauses.map((clause) => {
      // Check if conditional clause should be included
      let included = true;
      if (clause.type === 'conditional' && clause.condition) {
        included = this.evaluateCondition(clause.condition, { ...metadata, ...data });
      }

      // Process variables
      const variables: Record<string, string> = {};
      const content = this.processTemplate(clause.content, { ...metadata, ...data }, variables);

      return {
        clauseId: clause.id,
        title: clause.title,
        content,
        included,
        variables,
      };
    });
  }

  private evaluateCondition(condition: string, data: Record<string, any>): boolean {
    try {
      // Simple condition evaluation (in production, use a safer parser)
      const fn = new Function(...Object.keys(data), `return ${condition}`);
      return fn(...Object.values(data));
    } catch {
      return false;
    }
  }

  private processTemplate(
    template: string,
    data: Record<string, any>,
    variables: Record<string, string>,
  ): string {
    let result = template;

    // Replace {{variable}} patterns
    const pattern = /\{\{(\w+)\}\}/g;
    result = result.replace(pattern, (match, key) => {
      let value = data[key];
      if (value instanceof Date) {
        value = value.toLocaleDateString('ro-RO');
      }
      if (value !== undefined && value !== null) {
        variables[key] = String(value);
        return String(value);
      }
      return match;
    });

    // Handle conditional sections {{#condition}}...{{/condition}}
    const conditionalPattern = /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
    result = result.replace(conditionalPattern, (match, key, content) => {
      if (data[key]) {
        return this.processTemplate(content, data, variables);
      }
      return '';
    });

    return result;
  }

  private buildContractContent(
    template: ContractTemplate,
    clauses: GeneratedClause[],
    metadata: ContractMetadata,
  ): string {
    const lines: string[] = [
      `CONTRACT INDIVIDUAL DE MUNCĂ`,
      `Nr. ______ din ${new Date().toLocaleDateString('ro-RO')}`,
      '',
      `Înregistrat la ITM sub nr. ______ din __________`,
      '',
    ];

    for (const clause of clauses.filter((c) => c.included)) {
      lines.push(`${clause.title.toUpperCase()}`);
      lines.push(clause.content);
      lines.push('');
    }

    lines.push(`SEMNĂTURI:`);
    lines.push('');
    lines.push(`ANGAJATOR                           SALARIAT`);
    lines.push(`${metadata.employerName}            ${metadata.employeeName}`);
    lines.push('');
    lines.push(`_________________                   _________________`);
    lines.push(`(semnătura)                         (semnătura)`);
    lines.push('');
    lines.push(`Data: ________________              Data: ________________`);

    return lines.join('\n');
  }

  private buildContractHtml(
    template: ContractTemplate,
    clauses: GeneratedClause[],
    metadata: ContractMetadata,
  ): string {
    return `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Times New Roman', serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.6; }
    h1 { text-align: center; font-size: 18px; margin-bottom: 10px; }
    h2 { font-size: 14px; margin-top: 20px; margin-bottom: 10px; }
    p { text-align: justify; margin-bottom: 10px; }
    .header { text-align: center; margin-bottom: 30px; }
    .signature-block { display: flex; justify-content: space-between; margin-top: 50px; }
    .signature { text-align: center; width: 45%; }
    .signature-line { border-top: 1px solid #000; margin-top: 50px; padding-top: 5px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>CONTRACT INDIVIDUAL DE MUNCĂ</h1>
    <p>Nr. ______ din ${new Date().toLocaleDateString('ro-RO')}</p>
    <p>Înregistrat la ITM sub nr. ______ din __________</p>
  </div>

  ${clauses
    .filter((c) => c.included)
    .map((c) => `<h2>${c.title}</h2><p>${c.content}</p>`)
    .join('\n')}

  <div class="signature-block">
    <div class="signature">
      <p><strong>ANGAJATOR</strong></p>
      <p>${metadata.employerName}</p>
      <div class="signature-line">(semnătura)</div>
    </div>
    <div class="signature">
      <p><strong>SALARIAT</strong></p>
      <p>${metadata.employeeName}</p>
      <div class="signature-line">(semnătura)</div>
    </div>
  </div>
</body>
</html>`;
  }

  // =================== E-SIGNATURE INTEGRATION ===================

  async requestSignature(
    contractId: string,
    signerType: 'employer' | 'employee',
    signerEmail: string,
    provider: 'docusign' | 'adobesign' | 'internal' = 'internal',
  ): Promise<SignatureRequest> {
    const contract = this.generatedContracts.get(contractId);
    if (!contract) {
      throw new NotFoundException(`Contract ${contractId} not found`);
    }

    const signerName = signerType === 'employer'
      ? contract.metadata.employerName
      : contract.metadata.employeeName;

    const signatureRequest: SignatureRequest = {
      id: `sig_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      signerType,
      signerName,
      signerEmail,
      provider,
      status: 'pending',
    };

    // Simulate provider integration
    if (provider === 'docusign') {
      signatureRequest.externalId = await this.sendToDocuSign(contract, signerEmail);
      signatureRequest.status = 'sent';
    } else if (provider === 'adobesign') {
      signatureRequest.externalId = await this.sendToAdobeSign(contract, signerEmail);
      signatureRequest.status = 'sent';
    } else {
      // Internal signature - generate signing URL
      signatureRequest.signatureUrl = `/api/hr-contracts/sign/${contractId}/${signatureRequest.id}`;
    }

    contract.signatures.push(signatureRequest);
    if (contract.status === 'draft') {
      contract.status = 'pending_signature';
    }

    this.generatedContracts.set(contractId, contract);
    this.logger.log(`Signature requested for contract ${contractId} from ${signerEmail}`);

    return signatureRequest;
  }

  private async sendToDocuSign(contract: GeneratedContract, recipientEmail: string): Promise<string> {
    // In production, integrate with DocuSign API
    // https://developers.docusign.com/docs/esign-rest-api/
    const docusignApiKey = this.configService.get('DOCUSIGN_API_KEY');
    const docusignAccountId = this.configService.get('DOCUSIGN_ACCOUNT_ID');

    if (!docusignApiKey) {
      this.logger.warn('DocuSign API key not configured, using mock');
    }

    // Mock response
    return `docusign_env_${Date.now()}`;
  }

  private async sendToAdobeSign(contract: GeneratedContract, recipientEmail: string): Promise<string> {
    // In production, integrate with Adobe Sign API
    // https://secure.adobesign.com/public/docs/restapi/v6
    const adobeApiKey = this.configService.get('ADOBE_SIGN_API_KEY');

    if (!adobeApiKey) {
      this.logger.warn('Adobe Sign API key not configured, using mock');
    }

    // Mock response
    return `adobe_agr_${Date.now()}`;
  }

  async recordSignature(
    contractId: string,
    signatureRequestId: string,
    signatureData: { signatureUrl: string; ipAddress?: string },
  ): Promise<GeneratedContract> {
    const contract = this.generatedContracts.get(contractId);
    if (!contract) {
      throw new NotFoundException(`Contract ${contractId} not found`);
    }

    const signatureRequest = contract.signatures.find((s) => s.id === signatureRequestId);
    if (!signatureRequest) {
      throw new NotFoundException(`Signature request ${signatureRequestId} not found`);
    }

    signatureRequest.status = 'signed';
    signatureRequest.signatureUrl = signatureData.signatureUrl;
    signatureRequest.signedAt = new Date();

    // Check if all signatures are complete
    const allSigned = contract.signatures.every((s) => s.status === 'signed');
    if (allSigned && contract.signatures.length >= 2) {
      contract.status = 'signed';
      contract.signedAt = new Date();
    }

    this.generatedContracts.set(contractId, contract);
    this.logger.log(`Signature recorded for contract ${contractId}`);

    return contract;
  }

  // =================== CONTRACT RETRIEVAL ===================

  getGeneratedContract(contractId: string): GeneratedContract {
    const contract = this.generatedContracts.get(contractId);
    if (!contract) {
      throw new NotFoundException(`Contract ${contractId} not found`);
    }
    return contract;
  }

  getContractsByEmployee(employeeId: string): GeneratedContract[] {
    return Array.from(this.generatedContracts.values())
      .filter((c) => c.employeeId === employeeId);
  }

  // =================== VALIDATION ===================

  validateContract(contract: GeneratedContract): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check minimum wage (2024 Romanian minimum wage: 3,300 RON)
    const minimumWage = 3300;
    if (contract.metadata.salary < minimumWage) {
      errors.push(`Salariul (${contract.metadata.salary} RON) este sub salariul minim legal (${minimumWage} RON)`);
    }

    // Check work hours (max 48 hours/week per EU directive)
    if (contract.metadata.workHours > 48) {
      errors.push(`Orele de lucru (${contract.metadata.workHours}) depășesc maximul legal de 48 ore/săptămână`);
    }

    // Check probation period
    if (contract.metadata.probationDays && contract.metadata.probationDays > 120) {
      errors.push(`Perioada de probă (${contract.metadata.probationDays} zile) depășește maximul legal de 120 zile`);
    }

    // Non-compete warnings
    if (contract.metadata.nonCompete?.enabled) {
      if (contract.metadata.nonCompete.durationMonths > 24) {
        warnings.push(`Clauza de neconcurență (${contract.metadata.nonCompete.durationMonths} luni) este neobișnuit de lungă`);
      }
      if (contract.metadata.nonCompete.compensation < contract.metadata.salary * 0.25) {
        warnings.push(`Compensația pentru neconcurență pare sub nivelul recomandat (min 25% din salariu)`);
      }
    }

    // CNP validation
    if (!this.validateCNP(contract.metadata.employeeCnp)) {
      errors.push('CNP-ul angajatului pare invalid');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateCNP(cnp: string): boolean {
    if (!cnp || cnp.length !== 13) return false;
    if (!/^\d{13}$/.test(cnp)) return false;

    // Romanian CNP checksum validation
    const weights = [2, 7, 9, 1, 4, 6, 3, 5, 8, 2, 7, 9];
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cnp[i]) * weights[i];
    }
    const remainder = sum % 11;
    const checkDigit = remainder === 10 ? 1 : remainder;

    return parseInt(cnp[12]) === checkDigit;
  }

  // =================== STATISTICS ===================

  getStatistics(): {
    totalTemplates: number;
    totalGenerated: number;
    byStatus: Record<string, number>;
    byTemplate: Record<string, number>;
  } {
    const contracts = Array.from(this.generatedContracts.values());

    const byStatus: Record<string, number> = {};
    const byTemplate: Record<string, number> = {};

    for (const contract of contracts) {
      byStatus[contract.status] = (byStatus[contract.status] || 0) + 1;
      byTemplate[contract.templateId] = (byTemplate[contract.templateId] || 0) + 1;
    }

    return {
      totalTemplates: this.templates.size,
      totalGenerated: contracts.length,
      byStatus,
      byTemplate,
    };
  }
}
