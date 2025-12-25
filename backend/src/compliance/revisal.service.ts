import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
// @ts-ignore
import * as xml2js from 'xml2js';

export interface RevisalEmployee {
  cnp: string;
  nume: string;
  prenume: string;
  dataAngajare: string;
  dataIncetare?: string;
  tipContract: string;
  functie: string;
  corFunctie: string;
  normaTimpLucru: number;
  salariuBrut: number;
  tipOperatiune: 'ANGAJARE' | 'MODIFICARE' | 'INCETARE' | 'SUSPENDARE';
}

export interface RevisalSubmission {
  id: string;
  userId: string;
  fileName: string;
  submittedAt: Date;
  status: 'PENDING' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  errorMessage?: string;
  employeeCount: number;
  xmlContent: string;
}

@Injectable()
export class RevisalService {
  private readonly logger = new Logger(RevisalService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Generate REVISAL XML for employee registry submission to ITM
   * Format: REVISAL v3.0 XML schema
   */
  async generateRevisalXml(
    userId: string,
    employees: RevisalEmployee[],
    companyData: {
      cui: string;
      denumire: string;
      judet: string;
      localitate: string;
      strada: string;
      numar: string;
    },
  ): Promise<string> {
    const builder = new xml2js.Builder({
      xmldec: { version: '1.0', encoding: 'UTF-8' },
      renderOpts: { pretty: true, indent: '  ' },
    });

    const revisalData = {
      REVISAL: {
        $: {
          xmlns: 'http://www.inspectiamuncii.ro/revisal',
          versiune: '3.0',
        },
        ANGAJATOR: {
          CUI: companyData.cui.replace('RO', ''),
          DENUMIRE: companyData.denumire,
          JUDET: companyData.judet,
          LOCALITATE: companyData.localitate,
          STRADA: companyData.strada,
          NUMAR: companyData.numar,
        },
        SALARIATI: {
          SALARIAT: employees.map((emp, index) => ({
            $: { nr: index + 1 },
            CNP: emp.cnp,
            NUME: emp.nume,
            PRENUME: emp.prenume,
            DATA_ANGAJARE: this.formatDate(emp.dataAngajare),
            DATA_INCETARE: emp.dataIncetare ? this.formatDate(emp.dataIncetare) : '',
            TIP_CONTRACT: this.mapContractType(emp.tipContract),
            FUNCTIE: emp.functie,
            COR_FUNCTIE: emp.corFunctie,
            NORMA_TIMP: emp.normaTimpLucru,
            SALARIU_BRUT: emp.salariuBrut,
            TIP_OPERATIUNE: emp.tipOperatiune,
          })),
        },
        DECLARATIE: {
          DATA_GENERARE: new Date().toISOString().split('T')[0],
          NUMAR_SALARIATI: employees.length,
        },
      },
    };

    return builder.buildObject(revisalData);
  }

  /**
   * Get employees for REVISAL submission
   */
  async getEmployeesForRevisal(userId: string, options?: {
    startDate?: Date;
    endDate?: Date;
    operationType?: string;
  }): Promise<RevisalEmployee[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const employees = await this.prisma.employee.findMany({
      where: {
        userId,
        ...(options?.startDate && options?.endDate && {
          OR: [
            { hireDate: { gte: options.startDate, lte: options.endDate } },
            { updatedAt: { gte: options.startDate, lte: options.endDate } },
          ],
        }),
      },
      orderBy: { lastName: 'asc' },
    });

    return employees.map(emp => ({
      cnp: emp.cnp || '',
      nume: emp.lastName,
      prenume: emp.firstName,
      dataAngajare: emp.hireDate.toISOString().split('T')[0],
      dataIncetare: emp.status === 'TERMINATED' ? new Date().toISOString().split('T')[0] : undefined,
      tipContract: emp.contractType,
      functie: emp.position,
      corFunctie: this.getCORCode(emp.position),
      normaTimpLucru: emp.contractType === 'PART_TIME' ? 4 : 8,
      salariuBrut: Number(emp.salary),
      tipOperatiune: this.determineOperationType(emp),
    }));
  }

  /**
   * Submit REVISAL to ITM (Inspectoratul Teritorial de Munca)
   */
  async submitToITM(
    userId: string,
    xmlContent: string,
    employeeCount: number,
  ): Promise<RevisalSubmission> {
    const submission: RevisalSubmission = {
      id: `REVISAL-${Date.now()}`,
      userId,
      fileName: `revisal_${new Date().toISOString().split('T')[0]}.xml`,
      submittedAt: new Date(),
      status: 'PENDING',
      employeeCount,
      xmlContent,
    };

    // Store submission in database
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'REVISAL_SUBMISSION',
        entity: 'COMPLIANCE',
        entityId: submission.id,
        details: JSON.parse(JSON.stringify({
          fileName: submission.fileName,
          employeeCount: submission.employeeCount,
          status: submission.status,
        })),
        ipAddress: '127.0.0.1',
      },
    });

    this.logger.log(`REVISAL submission created: ${submission.id} with ${employeeCount} employees`);

    // In production, this would submit to ITM's REVISAL system
    // For now, mark as submitted
    submission.status = 'SUBMITTED';

    return submission;
  }

  /**
   * Get submission history
   */
  async getSubmissionHistory(userId: string): Promise<any[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        userId,
        action: 'REVISAL_SUBMISSION',
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return logs.map(log => ({
      id: log.entityId,
      submittedAt: log.createdAt,
      ...(log.details as object || {}),
    }));
  }

  /**
   * Validate REVISAL data before submission
   */
  validateRevisalData(employees: RevisalEmployee[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    employees.forEach((emp, index) => {
      if (!emp.cnp || emp.cnp.length !== 13) {
        errors.push(`Angajat ${index + 1}: CNP invalid`);
      }
      if (!emp.nume) {
        errors.push(`Angajat ${index + 1}: Nume lipsă`);
      }
      if (!emp.prenume) {
        errors.push(`Angajat ${index + 1}: Prenume lipsă`);
      }
      if (!emp.dataAngajare) {
        errors.push(`Angajat ${index + 1}: Data angajării lipsă`);
      }
      if (!emp.functie) {
        errors.push(`Angajat ${index + 1}: Funcția lipsă`);
      }
      if (emp.salariuBrut < 3700) {
        errors.push(`Angajat ${index + 1}: Salariul sub minimul pe economie (3700 RON)`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  }

  private mapContractType(type: string): string {
    const mapping: Record<string, string> = {
      'FULL_TIME': 'CIM_NEDETERMINAT',
      'PART_TIME': 'CIM_PARTIAL',
      'FIXED_TERM': 'CIM_DETERMINAT',
      'INDEFINITE': 'CIM_NEDETERMINAT',
    };
    return mapping[type] || 'CIM_NEDETERMINAT';
  }

  private getCORCode(position: string): string {
    // Simplified COR code mapping - in production, use full COR database
    const corMapping: Record<string, string> = {
      'Director': '112001',
      'Manager': '121101',
      'Contabil': '241103',
      'Programator': '251201',
      'Dezvoltator': '251201',
      'Analist': '251101',
      'Administrator': '334101',
      'Secretar': '412001',
      'Vanzator': '522101',
      'Sofer': '832201',
      'Muncitor': '931101',
    };

    for (const [key, code] of Object.entries(corMapping)) {
      if (position.toLowerCase().includes(key.toLowerCase())) {
        return code;
      }
    }
    return '999999'; // Generic code
  }

  private determineOperationType(employee: any): 'ANGAJARE' | 'MODIFICARE' | 'INCETARE' | 'SUSPENDARE' {
    if (employee.status === 'TERMINATED') return 'INCETARE';
    if (employee.status === 'ON_LEAVE') return 'SUSPENDARE';

    const hireDate = new Date(employee.hireDate);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (hireDate > thirtyDaysAgo) return 'ANGAJARE';
    return 'MODIFICARE';
  }
}
