import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

// REVISAL Types per Romanian ITM (Inspectoratul Teritorial de Muncă) specifications
export enum RevisalOperationType {
  ANGAJARE = 'ANGAJARE', // New hire registration
  MODIFICARE_SALARIU = 'MODIFICARE_SALARIU', // Salary change
  MODIFICARE_FUNCTIE = 'MODIFICARE_FUNCTIE', // Position change
  MODIFICARE_NORMA = 'MODIFICARE_NORMA', // Work hours change
  SUSPENDARE = 'SUSPENDARE', // Contract suspension
  RELUARE = 'RELUARE', // Contract resumption
  INCETARE = 'INCETARE', // Contract termination
  DETASARE = 'DETASARE', // Secondment
  TRANSFER = 'TRANSFER', // Transfer to another employer
}

export enum RevisalSubmissionStatus {
  DRAFT = 'DRAFT',
  VALIDATED = 'VALIDATED',
  SUBMITTED = 'SUBMITTED',
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  ERROR = 'ERROR',
}

export interface RevisalEmployee {
  cnp: string;
  nume: string;
  prenume: string;
  dataNastere: Date;
  locNastere: string;
  cetatenie: string;
  adresa: string;
  actIdentitate: {
    tip: 'CI' | 'BI' | 'PASAPORT';
    serie: string;
    numar: string;
    dataEliberare: Date;
    dataExpirare: Date;
  };
  studii: {
    nivel: 'FARA' | 'PRIMAR' | 'GIMNAZIAL' | 'LICEAL' | 'PROFESIONAL' | 'POSTLICEAL' | 'UNIVERSITAR' | 'MASTER' | 'DOCTORAT';
    specializare?: string;
  };
}

export interface RevisalContract {
  numarContract: string;
  dataContract: Date;
  tipContract: 'NEDETERMINAT' | 'DETERMINAT' | 'PARTIAL' | 'TEMPORAR';
  dataInceput: Date;
  dataSfarsit?: Date;
  perioadaProba?: number;
  functie: string;
  codCOR: string;
  salariu: number;
  sporuri?: RevisalSpor[];
  norma: number; // hours per week
  locMunca: string;
  conditiiMunca: 'NORMALE' | 'DEOSEBITE' | 'SPECIALE';
}

export interface RevisalSpor {
  tip: string;
  procent?: number;
  valoare?: number;
  descriere: string;
}

export interface RevisalSubmission {
  id: string;
  userId: string;
  employeeId: string;
  contractId: string;
  operationType: RevisalOperationType;
  status: RevisalSubmissionStatus;
  employeeData: RevisalEmployee;
  contractData: RevisalContract;
  changes?: Record<string, { old: any; new: any }>;
  revisalId?: string;
  submittedAt?: Date;
  processedAt?: Date;
  errorMessage?: string;
  validationErrors: string[];
  xmlContent?: string;
  receiptNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RevisalValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface D112Declaration {
  id: string;
  userId: string;
  month: number;
  year: number;
  employerCui: string;
  employees: D112Employee[];
  totalSalaries: number;
  totalContributions: {
    cas: number; // Contribuția la asigurări sociale (25%)
    cass: number; // Contribuția la asigurări sociale de sănătate (10%)
    impozit: number; // Impozit pe venit (10%)
    cam: number; // Contribuția asiguratorie pentru muncă (2.25%)
  };
  status: 'draft' | 'validated' | 'submitted' | 'accepted';
  submittedAt?: Date;
  xmlContent?: string;
}

export interface D112Employee {
  cnp: string;
  nume: string;
  prenume: string;
  salariuBrut: number;
  zileLucrate: number;
  cas: number;
  cass: number;
  impozit: number;
  salariuNet: number;
}

// COR (Clasificarea Ocupațiilor din România) codes mapping
const COR_CODES: Record<string, string> = {
  'Director General': '112001',
  'Director Executiv': '112002',
  'Manager': '121101',
  'Manager Resurse Umane': '121201',
  'Manager Financiar': '121202',
  'Manager IT': '133001',
  'Contabil': '241101',
  'Contabil Șef': '241102',
  'Economist': '263101',
  'Programator': '251201',
  'Analist Programator': '251202',
  'Administrator Baze de Date': '252101',
  'Inginer Software': '251203',
  'Designer Web': '251204',
  'Specialist Marketing': '243101',
  'Specialist Vânzări': '332201',
  'Asistent Manager': '334101',
  'Secretară': '412001',
  'Referent': '411001',
  'Operator Date': '413201',
  'Șofer': '832201',
  'Curier': '962101',
  'Muncitor Necalificat': '961101',
};

@Injectable()
export class RevisalService {
  private readonly logger = new Logger(RevisalService.name);
  private submissions: Map<string, RevisalSubmission> = new Map();
  private d112Declarations: Map<string, D112Declaration> = new Map();

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  // =================== SUBMISSION MANAGEMENT ===================

  async createSubmission(
    userId: string,
    employeeId: string,
    contractId: string,
    operationType: RevisalOperationType,
    employeeData: RevisalEmployee,
    contractData: RevisalContract,
    changes?: Record<string, { old: any; new: any }>,
  ): Promise<RevisalSubmission> {
    const id = `rev_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const submission: RevisalSubmission = {
      id,
      userId,
      employeeId,
      contractId,
      operationType,
      status: RevisalSubmissionStatus.DRAFT,
      employeeData,
      contractData,
      changes,
      validationErrors: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.submissions.set(id, submission);
    this.logger.log(`Created REVISAL submission ${id} for operation ${operationType}`);

    return submission;
  }

  async validateSubmission(submissionId: string): Promise<RevisalValidationResult> {
    const submission = this.submissions.get(submissionId);
    if (!submission) {
      throw new NotFoundException(`Submission ${submissionId} not found`);
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate CNP
    if (!this.validateCNP(submission.employeeData.cnp)) {
      errors.push('CNP invalid');
    }

    // Validate COR code
    if (!this.isValidCORCode(submission.contractData.codCOR)) {
      errors.push(`Codul COR "${submission.contractData.codCOR}" nu este valid`);
    }

    // Validate salary vs minimum wage
    const minimumWage = 3300;
    const hourlyEquivalent = (submission.contractData.salariu / 40) * submission.contractData.norma;
    if (hourlyEquivalent < minimumWage * (submission.contractData.norma / 40)) {
      errors.push(`Salariul pentru norma de ${submission.contractData.norma} ore este sub minimul legal`);
    }

    // Validate contract dates
    if (submission.contractData.tipContract === 'DETERMINAT') {
      if (!submission.contractData.dataSfarsit) {
        errors.push('Contractul pe durată determinată necesită dată de sfârșit');
      } else {
        const maxDuration = 36; // months
        const months = this.monthsDifference(
          submission.contractData.dataInceput,
          submission.contractData.dataSfarsit,
        );
        if (months > maxDuration) {
          errors.push(`Durata contractului (${months} luni) depășește maximul legal de ${maxDuration} luni`);
        }
      }
    }

    // Validate probation period
    if (submission.contractData.perioadaProba) {
      const maxProbation = 120; // days for management positions
      if (submission.contractData.perioadaProba > maxProbation) {
        errors.push(`Perioada de probă (${submission.contractData.perioadaProba} zile) depășește maximul legal`);
      }
    }

    // Validate work hours
    if (submission.contractData.norma > 48) {
      errors.push('Norma de lucru nu poate depăși 48 ore pe săptămână');
    }

    // Validate identity document expiry
    if (submission.employeeData.actIdentitate.dataExpirare < new Date()) {
      warnings.push('Actul de identitate al angajatului este expirat');
    }

    // Operation-specific validations
    switch (submission.operationType) {
      case RevisalOperationType.ANGAJARE:
        if (!submission.contractData.numarContract) {
          errors.push('Numărul contractului este obligatoriu pentru înregistrare');
        }
        break;

      case RevisalOperationType.MODIFICARE_SALARIU:
        if (!submission.changes?.salariu) {
          errors.push('Trebuie specificată modificarea de salariu');
        }
        break;

      case RevisalOperationType.INCETARE:
        if (!submission.changes?.motivIncetare) {
          warnings.push('Se recomandă specificarea motivului încetării');
        }
        break;
    }

    // Update submission
    submission.validationErrors = errors;
    submission.status = errors.length === 0
      ? RevisalSubmissionStatus.VALIDATED
      : RevisalSubmissionStatus.DRAFT;
    submission.updatedAt = new Date();
    this.submissions.set(submissionId, submission);

    return { valid: errors.length === 0, errors, warnings };
  }

  async submitToRevisal(submissionId: string): Promise<RevisalSubmission> {
    const submission = this.submissions.get(submissionId);
    if (!submission) {
      throw new NotFoundException(`Submission ${submissionId} not found`);
    }

    if (submission.status !== RevisalSubmissionStatus.VALIDATED) {
      throw new BadRequestException('Submission must be validated before submitting');
    }

    // Generate XML content per REVISAL schema
    const xmlContent = this.generateRevisalXML(submission);
    submission.xmlContent = xmlContent;

    // In production, submit to actual REVISAL API
    const revisalApiUrl = this.configService.get('REVISAL_API_URL');
    const revisalApiKey = this.configService.get('REVISAL_API_KEY');

    if (revisalApiUrl && revisalApiKey) {
      try {
        // Production submission
        const response = await this.sendToRevisalAPI(xmlContent);
        submission.revisalId = response.id;
        submission.receiptNumber = response.receiptNumber;
        submission.status = RevisalSubmissionStatus.SUBMITTED;
      } catch (error) {
        submission.status = RevisalSubmissionStatus.ERROR;
        submission.errorMessage = error.message;
        this.logger.error(`REVISAL submission failed: ${error.message}`);
      }
    } else {
      // Mock submission for development
      submission.revisalId = `REV-${Date.now()}`;
      submission.receiptNumber = `RCP-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      submission.status = RevisalSubmissionStatus.PENDING;
      this.logger.warn('REVISAL API not configured, using mock submission');
    }

    submission.submittedAt = new Date();
    submission.updatedAt = new Date();
    this.submissions.set(submissionId, submission);

    this.logger.log(`Submitted to REVISAL: ${submission.revisalId}`);
    return submission;
  }

  private async sendToRevisalAPI(xmlContent: string): Promise<{ id: string; receiptNumber: string }> {
    // In production, make actual API call to REVISAL/ITM system
    // This would use the official REVISAL web service or ANAF integration

    // Mock response
    return {
      id: `REV-${Date.now()}`,
      receiptNumber: `RCP-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    };
  }

  async checkSubmissionStatus(submissionId: string): Promise<RevisalSubmission> {
    const submission = this.submissions.get(submissionId);
    if (!submission) {
      throw new NotFoundException(`Submission ${submissionId} not found`);
    }

    if (submission.status === RevisalSubmissionStatus.PENDING && submission.revisalId) {
      // In production, check status with REVISAL API
      // Simulate processing delay
      const timeSinceSubmission = Date.now() - (submission.submittedAt?.getTime() || 0);
      if (timeSinceSubmission > 60000) { // 1 minute for demo
        submission.status = RevisalSubmissionStatus.ACCEPTED;
        submission.processedAt = new Date();
        this.submissions.set(submissionId, submission);
      }
    }

    return submission;
  }

  // =================== XML GENERATION ===================

  private generateRevisalXML(submission: RevisalSubmission): string {
    const { employeeData, contractData, operationType } = submission;

    return `<?xml version="1.0" encoding="UTF-8"?>
<REVISAL xmlns="http://www.anaf.ro/revisal" version="2.0">
  <HEADER>
    <CUI_ANGAJATOR>${this.configService.get('COMPANY_CUI') || '12345678'}</CUI_ANGAJATOR>
    <DENUMIRE_ANGAJATOR>${this.configService.get('COMPANY_NAME') || 'S.C. Document & Iulia S.R.L.'}</DENUMIRE_ANGAJATOR>
    <DATA_DOCUMENT>${new Date().toISOString().split('T')[0]}</DATA_DOCUMENT>
    <TIP_OPERATIUNE>${operationType}</TIP_OPERATIUNE>
  </HEADER>

  <ANGAJAT>
    <CNP>${employeeData.cnp}</CNP>
    <NUME>${employeeData.nume}</NUME>
    <PRENUME>${employeeData.prenume}</PRENUME>
    <DATA_NASTERE>${employeeData.dataNastere.toISOString().split('T')[0]}</DATA_NASTERE>
    <LOC_NASTERE>${employeeData.locNastere}</LOC_NASTERE>
    <CETATENIE>${employeeData.cetatenie}</CETATENIE>
    <ADRESA>${employeeData.adresa}</ADRESA>
    <ACT_IDENTITATE>
      <TIP>${employeeData.actIdentitate.tip}</TIP>
      <SERIE>${employeeData.actIdentitate.serie}</SERIE>
      <NUMAR>${employeeData.actIdentitate.numar}</NUMAR>
      <DATA_ELIBERARE>${employeeData.actIdentitate.dataEliberare.toISOString().split('T')[0]}</DATA_ELIBERARE>
      <DATA_EXPIRARE>${employeeData.actIdentitate.dataExpirare.toISOString().split('T')[0]}</DATA_EXPIRARE>
    </ACT_IDENTITATE>
    <STUDII>
      <NIVEL>${employeeData.studii.nivel}</NIVEL>
      ${employeeData.studii.specializare ? `<SPECIALIZARE>${employeeData.studii.specializare}</SPECIALIZARE>` : ''}
    </STUDII>
  </ANGAJAT>

  <CONTRACT>
    <NUMAR_CONTRACT>${contractData.numarContract}</NUMAR_CONTRACT>
    <DATA_CONTRACT>${contractData.dataContract.toISOString().split('T')[0]}</DATA_CONTRACT>
    <TIP_CONTRACT>${contractData.tipContract}</TIP_CONTRACT>
    <DATA_INCEPUT>${contractData.dataInceput.toISOString().split('T')[0]}</DATA_INCEPUT>
    ${contractData.dataSfarsit ? `<DATA_SFARSIT>${contractData.dataSfarsit.toISOString().split('T')[0]}</DATA_SFARSIT>` : ''}
    ${contractData.perioadaProba ? `<PERIOADA_PROBA>${contractData.perioadaProba}</PERIOADA_PROBA>` : ''}
    <FUNCTIE>${contractData.functie}</FUNCTIE>
    <COD_COR>${contractData.codCOR}</COD_COR>
    <SALARIU>${contractData.salariu}</SALARIU>
    <NORMA>${contractData.norma}</NORMA>
    <LOC_MUNCA>${contractData.locMunca}</LOC_MUNCA>
    <CONDITII_MUNCA>${contractData.conditiiMunca}</CONDITII_MUNCA>
    ${contractData.sporuri?.map(s => `
    <SPOR>
      <TIP>${s.tip}</TIP>
      ${s.procent ? `<PROCENT>${s.procent}</PROCENT>` : ''}
      ${s.valoare ? `<VALOARE>${s.valoare}</VALOARE>` : ''}
      <DESCRIERE>${s.descriere}</DESCRIERE>
    </SPOR>`).join('') || ''}
  </CONTRACT>

  ${submission.changes ? `
  <MODIFICARI>
    ${Object.entries(submission.changes).map(([key, value]) => `
    <MODIFICARE>
      <CAMP>${key}</CAMP>
      <VALOARE_VECHE>${value.old}</VALOARE_VECHE>
      <VALOARE_NOUA>${value.new}</VALOARE_NOUA>
    </MODIFICARE>`).join('')}
  </MODIFICARI>` : ''}
</REVISAL>`;
  }

  // =================== D112 DECLARATION ===================

  async generateD112(
    userId: string,
    month: number,
    year: number,
  ): Promise<D112Declaration> {
    // Get all active employees with contracts for the period
    const employees = await this.prisma.employee.findMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
      include: {
        hrContracts: {
          where: {
            status: 'ACTIVE',
          },
        },
      },
    });

    const d112Employees: D112Employee[] = [];
    let totalSalaries = 0;
    const totalContributions = { cas: 0, cass: 0, impozit: 0, cam: 0 };

    for (const employee of employees) {
      const contract = (employee as any).hrContracts?.[0];
      if (!contract) continue;

      const salariuBrut = contract.salary || 0;
      const zileLucrate = this.getWorkingDays(month, year);

      // Calculate contributions per Romanian tax law
      const cas = salariuBrut * 0.25; // 25% CAS
      const cass = salariuBrut * 0.10; // 10% CASS
      const bazaImpozit = salariuBrut - cas - cass;
      const impozit = bazaImpozit * 0.10; // 10% income tax
      const salariuNet = salariuBrut - cas - cass - impozit;

      const cam = salariuBrut * 0.0225; // 2.25% employer contribution

      d112Employees.push({
        cnp: employee.cnp || '',
        nume: employee.lastName,
        prenume: employee.firstName,
        salariuBrut,
        zileLucrate,
        cas,
        cass,
        impozit,
        salariuNet,
      });

      totalSalaries += salariuBrut;
      totalContributions.cas += cas;
      totalContributions.cass += cass;
      totalContributions.impozit += impozit;
      totalContributions.cam += cam;
    }

    const id = `d112_${year}_${month}_${crypto.randomBytes(4).toString('hex')}`;
    const declaration: D112Declaration = {
      id,
      userId,
      month,
      year,
      employerCui: this.configService.get('COMPANY_CUI') || '12345678',
      employees: d112Employees,
      totalSalaries,
      totalContributions,
      status: 'draft',
    };

    // Generate XML
    declaration.xmlContent = this.generateD112XML(declaration);

    this.d112Declarations.set(id, declaration);
    this.logger.log(`Generated D112 declaration ${id} for ${month}/${year}`);

    return declaration;
  }

  private generateD112XML(declaration: D112Declaration): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<D112 xmlns="http://www.anaf.ro/d112" version="1.0">
  <HEADER>
    <CUI_ANGAJATOR>${declaration.employerCui}</CUI_ANGAJATOR>
    <LUNA>${declaration.month.toString().padStart(2, '0')}</LUNA>
    <AN>${declaration.year}</AN>
  </HEADER>

  <ANGAJATI>
    ${declaration.employees.map(e => `
    <ANGAJAT>
      <CNP>${e.cnp}</CNP>
      <NUME>${e.nume}</NUME>
      <PRENUME>${e.prenume}</PRENUME>
      <SALARIU_BRUT>${e.salariuBrut.toFixed(2)}</SALARIU_BRUT>
      <ZILE_LUCRATE>${e.zileLucrate}</ZILE_LUCRATE>
      <CAS>${e.cas.toFixed(2)}</CAS>
      <CASS>${e.cass.toFixed(2)}</CASS>
      <IMPOZIT>${e.impozit.toFixed(2)}</IMPOZIT>
      <SALARIU_NET>${e.salariuNet.toFixed(2)}</SALARIU_NET>
    </ANGAJAT>`).join('')}
  </ANGAJATI>

  <TOTALURI>
    <TOTAL_SALARII>${declaration.totalSalaries.toFixed(2)}</TOTAL_SALARII>
    <TOTAL_CAS>${declaration.totalContributions.cas.toFixed(2)}</TOTAL_CAS>
    <TOTAL_CASS>${declaration.totalContributions.cass.toFixed(2)}</TOTAL_CASS>
    <TOTAL_IMPOZIT>${declaration.totalContributions.impozit.toFixed(2)}</TOTAL_IMPOZIT>
    <TOTAL_CAM>${declaration.totalContributions.cam.toFixed(2)}</TOTAL_CAM>
  </TOTALURI>
</D112>`;
  }

  async submitD112(declarationId: string): Promise<D112Declaration> {
    const declaration = this.d112Declarations.get(declarationId);
    if (!declaration) {
      throw new NotFoundException(`D112 declaration ${declarationId} not found`);
    }

    if (declaration.status !== 'validated') {
      // Auto-validate if needed
      declaration.status = 'validated';
    }

    // In production, submit to ANAF
    declaration.status = 'submitted';
    declaration.submittedAt = new Date();
    this.d112Declarations.set(declarationId, declaration);

    this.logger.log(`D112 declaration ${declarationId} submitted`);
    return declaration;
  }

  // =================== UTILITIES ===================

  private validateCNP(cnp: string): boolean {
    if (!cnp || cnp.length !== 13) return false;
    if (!/^\d{13}$/.test(cnp)) return false;

    const weights = [2, 7, 9, 1, 4, 6, 3, 5, 8, 2, 7, 9];
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cnp[i]) * weights[i];
    }
    const remainder = sum % 11;
    const checkDigit = remainder === 10 ? 1 : remainder;

    return parseInt(cnp[12]) === checkDigit;
  }

  private isValidCORCode(code: string): boolean {
    // COR codes are 6 digits
    return /^\d{6}$/.test(code);
  }

  getCORCode(position: string): string {
    return COR_CODES[position] || '961101'; // Default to unskilled worker
  }

  getCORCodes(): Record<string, string> {
    return { ...COR_CODES };
  }

  private monthsDifference(start: Date, end: Date): number {
    return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  }

  private getWorkingDays(month: number, year: number): number {
    const daysInMonth = new Date(year, month, 0).getDate();
    let workingDays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
    }

    // Subtract Romanian public holidays (simplified)
    const holidays = this.getRomanianHolidays(year);
    for (const holiday of holidays) {
      if (holiday.getMonth() + 1 === month) {
        const dayOfWeek = holiday.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          workingDays--;
        }
      }
    }

    return workingDays;
  }

  private getRomanianHolidays(year: number): Date[] {
    return [
      new Date(year, 0, 1), // New Year's Day
      new Date(year, 0, 2), // Day after New Year
      new Date(year, 0, 24), // Union Day
      new Date(year, 4, 1), // Labor Day
      new Date(year, 5, 1), // Children's Day
      new Date(year, 7, 15), // Assumption of Mary
      new Date(year, 10, 30), // St. Andrew's Day
      new Date(year, 11, 1), // National Day
      new Date(year, 11, 25), // Christmas Day
      new Date(year, 11, 26), // Second Day of Christmas
    ];
  }

  // =================== RETRIEVAL ===================

  getSubmission(submissionId: string): RevisalSubmission {
    const submission = this.submissions.get(submissionId);
    if (!submission) {
      throw new NotFoundException(`Submission ${submissionId} not found`);
    }
    return submission;
  }

  getUserSubmissions(userId: string, status?: RevisalSubmissionStatus): RevisalSubmission[] {
    let submissions = Array.from(this.submissions.values())
      .filter((s) => s.userId === userId);

    if (status) {
      submissions = submissions.filter((s) => s.status === status);
    }

    return submissions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getD112Declaration(declarationId: string): D112Declaration {
    const declaration = this.d112Declarations.get(declarationId);
    if (!declaration) {
      throw new NotFoundException(`D112 declaration ${declarationId} not found`);
    }
    return declaration;
  }

  // =================== STATISTICS ===================

  getStatistics(userId: string): {
    totalSubmissions: number;
    byStatus: Record<string, number>;
    byOperation: Record<string, number>;
    pendingCount: number;
    acceptedCount: number;
    rejectedCount: number;
  } {
    const userSubmissions = this.getUserSubmissions(userId);

    const byStatus: Record<string, number> = {};
    const byOperation: Record<string, number> = {};

    for (const submission of userSubmissions) {
      byStatus[submission.status] = (byStatus[submission.status] || 0) + 1;
      byOperation[submission.operationType] = (byOperation[submission.operationType] || 0) + 1;
    }

    return {
      totalSubmissions: userSubmissions.length,
      byStatus,
      byOperation,
      pendingCount: byStatus[RevisalSubmissionStatus.PENDING] || 0,
      acceptedCount: byStatus[RevisalSubmissionStatus.ACCEPTED] || 0,
      rejectedCount: byStatus[RevisalSubmissionStatus.REJECTED] || 0,
    };
  }
}
