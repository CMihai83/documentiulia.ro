import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
// @ts-ignore
import * as xml2js from 'xml2js';

export interface D112Employee {
  cnp: string;
  nume: string;
  prenume: string;
  salariuBrut: number;
  salariuNet: number;
  cas: number;  // Contributie asigurari sociale (25%)
  cass: number; // Contributie asigurari sociale de sanatate (10%)
  impozit: number; // Impozit pe venit (10%)
  camFSSF: number; // Contributie asiguratorie pentru munca (2.25%)
  zileLucrate: number;
  oreLucrate: number;
}

export interface D112Totals {
  totalSalariuBrut: number;
  totalSalariuNet: number;
  totalCAS: number;
  totalCASS: number;
  totalImpozit: number;
  totalCAM: number;
  numarAngajati: number;
}

export interface D112Submission {
  id: string;
  userId: string;
  period: string;
  fileName: string;
  submittedAt: Date;
  status: 'PENDING' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  errorMessage?: string;
  totals: D112Totals;
  xmlContent: string;
}

@Injectable()
export class D112Service {
  private readonly logger = new Logger(D112Service.name);

  // Romanian tax rates 2025
  private readonly CAS_RATE = 0.25;  // 25% pension contribution
  private readonly CASS_RATE = 0.10; // 10% health contribution
  private readonly IMPOZIT_RATE = 0.10; // 10% income tax
  private readonly CAM_RATE = 0.0225; // 2.25% work insurance

  constructor(private prisma: PrismaService) {}

  /**
   * Generate D112 XML for monthly payroll declaration to ANAF
   * Format: ANAF D112 XML schema
   */
  async generateD112Xml(
    userId: string,
    period: string, // YYYY-MM format
    employees: D112Employee[],
    companyData: {
      cui: string;
      denumire: string;
      judet: string;
      localitate: string;
      strada: string;
      numar: string;
      caen: string;
    },
  ): Promise<string> {
    const builder = new xml2js.Builder({
      xmldec: { version: '1.0', encoding: 'UTF-8' },
      renderOpts: { pretty: true, indent: '  ' },
    });

    const [year, month] = period.split('-');
    const totals = this.calculateTotals(employees);

    const d112Data = {
      D112: {
        $: {
          xmlns: 'mfp:anaf:dgti:d112:declaratie:v1',
          versiune: '1.0',
        },
        ANTET: {
          CUI_PLATITOR: companyData.cui.replace('RO', ''),
          DENUMIRE_PLATITOR: companyData.denumire,
          ADRESA: {
            JUDET: companyData.judet,
            LOCALITATE: companyData.localitate,
            STRADA: companyData.strada,
            NUMAR: companyData.numar,
          },
          CAEN: companyData.caen,
          AN: year,
          LUNA: month,
          D_REC: 0, // Initial declaration
        },
        TOTAL_PLATA: {
          TOTAL_CAS: Math.round(totals.totalCAS * 100) / 100,
          TOTAL_CASS: Math.round(totals.totalCASS * 100) / 100,
          TOTAL_IMPOZIT: Math.round(totals.totalImpozit * 100) / 100,
          TOTAL_CAM: Math.round(totals.totalCAM * 100) / 100,
          TOTAL_GENERAL: Math.round(
            (totals.totalCAS + totals.totalCASS + totals.totalImpozit + totals.totalCAM) * 100
          ) / 100,
        },
        ANGAJATI: {
          ANGAJAT: employees.map((emp, index) => ({
            $: { nr: index + 1 },
            CNP: emp.cnp,
            NUME: emp.nume,
            PRENUME: emp.prenume,
            VENIT_BRUT: emp.salariuBrut,
            VENIT_NET: emp.salariuNet,
            CAS: emp.cas,
            CASS: emp.cass,
            IMPOZIT: emp.impozit,
            CAM: emp.camFSSF,
            ZILE_LUCRATE: emp.zileLucrate,
            ORE_LUCRATE: emp.oreLucrate,
          })),
        },
        DECLARATIE: {
          DATA_GENERARE: new Date().toISOString().split('T')[0],
          NUMAR_ANGAJATI: employees.length,
        },
      },
    };

    return builder.buildObject(d112Data);
  }

  /**
   * Get employees with calculated payroll for D112
   */
  async getEmployeesForD112(
    userId: string,
    period: string,
  ): Promise<D112Employee[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const employees = await this.prisma.employee.findMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
      orderBy: { lastName: 'asc' },
    });

    return employees.map(emp => {
      const salariuBrut = Number(emp.salary);
      const cas = salariuBrut * this.CAS_RATE;
      const cass = salariuBrut * this.CASS_RATE;
      const bazaImpozit = salariuBrut - cas - cass;
      const impozit = bazaImpozit * this.IMPOZIT_RATE;
      const camFSSF = salariuBrut * this.CAM_RATE;
      const salariuNet = salariuBrut - cas - cass - impozit;

      // Default working days/hours based on contract type
      const zileLucrate = emp.contractType === 'PART_TIME' ? 10 : 22;
      const oreLucrate = emp.contractType === 'PART_TIME' ? 80 : 176;

      return {
        cnp: emp.cnp || '',
        nume: emp.lastName,
        prenume: emp.firstName,
        salariuBrut: Math.round(salariuBrut * 100) / 100,
        salariuNet: Math.round(salariuNet * 100) / 100,
        cas: Math.round(cas * 100) / 100,
        cass: Math.round(cass * 100) / 100,
        impozit: Math.round(impozit * 100) / 100,
        camFSSF: Math.round(camFSSF * 100) / 100,
        zileLucrate,
        oreLucrate,
      };
    });
  }

  /**
   * Calculate totals for D112
   */
  calculateTotals(employees: D112Employee[]): D112Totals {
    return employees.reduce(
      (acc, emp) => ({
        totalSalariuBrut: acc.totalSalariuBrut + emp.salariuBrut,
        totalSalariuNet: acc.totalSalariuNet + emp.salariuNet,
        totalCAS: acc.totalCAS + emp.cas,
        totalCASS: acc.totalCASS + emp.cass,
        totalImpozit: acc.totalImpozit + emp.impozit,
        totalCAM: acc.totalCAM + emp.camFSSF,
        numarAngajati: acc.numarAngajati + 1,
      }),
      {
        totalSalariuBrut: 0,
        totalSalariuNet: 0,
        totalCAS: 0,
        totalCASS: 0,
        totalImpozit: 0,
        totalCAM: 0,
        numarAngajati: 0,
      },
    );
  }

  /**
   * Submit D112 to ANAF
   */
  async submitToANAF(
    userId: string,
    period: string,
    xmlContent: string,
    totals: D112Totals,
  ): Promise<D112Submission> {
    const submission: D112Submission = {
      id: `D112-${period}-${Date.now()}`,
      userId,
      period,
      fileName: `d112_${period}.xml`,
      submittedAt: new Date(),
      status: 'PENDING',
      totals,
      xmlContent,
    };

    // Store submission in audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'D112_SUBMISSION',
        entity: 'COMPLIANCE',
        entityId: submission.id,
        details: JSON.parse(JSON.stringify({
          period: submission.period,
          fileName: submission.fileName,
          totals: submission.totals,
          status: submission.status,
        })),
        ipAddress: '127.0.0.1',
      },
    });

    this.logger.log(
      `D112 submission created: ${submission.id} for period ${period} with ${totals.numarAngajati} employees`,
    );

    // In production, this would submit to ANAF SPV
    submission.status = 'SUBMITTED';

    return submission;
  }

  /**
   * Get D112 submission history
   */
  async getSubmissionHistory(userId: string): Promise<any[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        userId,
        action: 'D112_SUBMISSION',
      },
      orderBy: { createdAt: 'desc' },
      take: 24, // Last 2 years of monthly submissions
    });

    return logs.map(log => ({
      id: log.entityId,
      submittedAt: log.createdAt,
      ...(log.details as object || {}),
    }));
  }

  /**
   * Validate D112 data
   */
  validateD112Data(
    employees: D112Employee[],
    period: string,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const [year, month] = period.split('-');

    // Validate period
    if (!year || !month || parseInt(month) < 1 || parseInt(month) > 12) {
      errors.push('Perioada invalida (format: YYYY-MM)');
    }

    // Validate employees
    employees.forEach((emp, index) => {
      if (!emp.cnp || emp.cnp.length !== 13) {
        errors.push(`Angajat ${index + 1}: CNP invalid`);
      }
      if (!emp.nume) {
        errors.push(`Angajat ${index + 1}: Nume lipsa`);
      }
      if (!emp.prenume) {
        errors.push(`Angajat ${index + 1}: Prenume lipsa`);
      }
      if (emp.salariuBrut < 3700) {
        errors.push(
          `Angajat ${index + 1}: Salariul brut (${emp.salariuBrut} RON) sub minimul pe economie (3700 RON)`,
        );
      }
      if (emp.zileLucrate < 0 || emp.zileLucrate > 31) {
        errors.push(`Angajat ${index + 1}: Zile lucrate invalide`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get current D112 status for a period
   */
  async getStatus(userId: string, period?: string): Promise<any> {
    // Default to current month if no period specified
    if (!period) {
      const now = new Date();
      period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    const employees = await this.getEmployeesForD112(userId, period);
    const totals = this.calculateTotals(employees);
    const history = await this.getSubmissionHistory(userId);
    const periodSubmission = history.find(h => h.period === period);

    return {
      period,
      employeeCount: employees.length,
      totals,
      submitted: !!periodSubmission,
      lastSubmission: periodSubmission || null,
      deadline: this.getDeadline(period),
    };
  }

  private getDeadline(period: string): string {
    // D112 deadline is 25th of the following month
    if (!period) {
      // Default to current month if no period specified
      const now = new Date();
      period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    const [year, month] = period.split('-').map(Number);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    return `${nextYear}-${String(nextMonth).padStart(2, '0')}-25`;
  }
}
