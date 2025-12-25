import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HrService {
  private readonly logger = new Logger(HrService.name);

  constructor(private prisma: PrismaService) {}

  async getStats(userId: string) {
    const [employees, payrolls] = await Promise.all([
      this.prisma.employee.findMany({ where: { userId } }),
      this.prisma.payroll.findMany({
        where: { employee: { userId } },
        orderBy: { period: 'desc' },
        take: 100,
      }),
    ]);

    const totalEmployees = employees.length;
    const activeContracts = employees.filter((e) => e.status === 'ACTIVE').length;
    const totalGross = employees.reduce((sum, e) => sum + (Number(e.salary) || 0), 0);
    const avgSalary = totalEmployees > 0 ? totalGross / totalEmployees : 0;

    return {
      totalEmployees,
      activeContracts,
      monthlyPayroll: totalGross,
      avgSalary: Math.round(avgSalary),
    };
  }

  async createEmployee(userId: string, data: any) {
    return this.prisma.employee.create({
      data: { userId, ...data },
    });
  }

  async getEmployees(userId: string, department?: string) {
    return this.prisma.employee.findMany({
      where: {
        userId,
        ...(department && { department }),
      },
      include: { payrolls: { take: 3, orderBy: { period: 'desc' } } },
      orderBy: { firstName: 'asc' },
    });
  }

  async getEmployee(id: string) {
    return this.prisma.employee.findUnique({
      where: { id },
      include: { payrolls: { orderBy: { period: 'desc' } } },
    });
  }

  async updateEmployee(id: string, data: any) {
    return this.prisma.employee.update({
      where: { id },
      data,
    });
  }

  async deleteEmployee(id: string) {
    this.logger.log(`Deleting employee ${id} (GDPR request)`);
    await this.prisma.payroll.deleteMany({ where: { employeeId: id } });
    await this.prisma.employee.delete({ where: { id } });
    return { success: true, message: 'Employee data deleted permanently' };
  }

  async generatePayroll(employeeId: string, period: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) throw new Error('Employee not found');

    const grossSalary = Number(employee.salary);
    // Romanian tax calculations per 2025 rates
    const cas = grossSalary * 0.25; // CAS - Social security 25%
    const cass = grossSalary * 0.10; // CASS - Health insurance 10%
    const incomeTax = (grossSalary - cas - cass) * 0.10; // Income tax 10%
    const netSalary = grossSalary - cas - cass - incomeTax;

    return this.prisma.payroll.create({
      data: {
        employeeId,
        period,
        grossSalary,
        netSalary,
        taxes: incomeTax,
        contributions: cas + cass,
        status: 'PENDING',
      },
    });
  }

  async processPayrollForPeriod(userId: string, period: string) {
    const employees = await this.prisma.employee.findMany({
      where: { userId, status: 'ACTIVE' },
    });

    const payrolls = await Promise.all(
      employees.map((emp) => this.generatePayroll(emp.id, period)),
    );

    return {
      processed: payrolls.length,
      period,
      payrolls,
    };
  }

  async getPayrollHistory(userId: string, period?: string) {
    return this.prisma.payroll.findMany({
      where: {
        employee: { userId },
        ...(period && { period }),
      },
      include: { employee: true },
      orderBy: { period: 'desc' },
    });
  }

  async updatePayrollStatus(id: string, status: string) {
    return this.prisma.payroll.update({
      where: { id },
      data: { status: status as any },
    });
  }

  async downloadPayslip(id: string) {
    const payroll = await this.prisma.payroll.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!payroll) throw new Error('Payroll not found');

    return {
      filename: `payslip-${payroll.employee.firstName}-${payroll.employee.lastName}-${payroll.period}.pdf`,
      contentType: 'application/pdf',
      data: payroll,
    };
  }

  async getDepartments(userId: string) {
    const employees = await this.prisma.employee.findMany({
      where: { userId },
      select: { department: true },
      distinct: ['department'],
    });

    return employees.map((e) => e.department).filter(Boolean);
  }

  // =================== DRIVER TIMESHEET OPERATIONS ===================
  // For logistics businesses (10-van fleet) to track driver hours

  /**
   * Create a timesheet entry for a driver
   */
  async createTimesheet(data: {
    employeeId: string;
    date: Date;
    startTime: Date;
    endTime: Date;
    breakMinutes?: number;
    routeId?: string;
    notes?: string;
  }) {
    const { employeeId, date, startTime, endTime, breakMinutes = 0, routeId, notes } = data;

    // Calculate worked hours
    const startMs = new Date(startTime).getTime();
    const endMs = new Date(endTime).getTime();
    const breakMs = breakMinutes * 60 * 1000;
    const workedMs = endMs - startMs - breakMs;
    const workedHours = workedMs / (1000 * 60 * 60);

    return this.prisma.timesheet.create({
      data: {
        employeeId,
        date: new Date(date),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        breakMinutes,
        workedHours,
        routeId,
        notes,
        status: 'PENDING',
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  /**
   * Get timesheets for an employee
   */
  async getEmployeeTimesheets(employeeId: string, options?: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
  }) {
    const { startDate, endDate, status } = options || {};

    return this.prisma.timesheet.findMany({
      where: {
        employeeId,
        ...(startDate && endDate && {
          date: {
            gte: startDate,
            lte: endDate,
          },
        }),
        ...(status && { status: status as any }),
      },
      orderBy: { date: 'desc' },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  /**
   * Get all timesheets for a user's organization
   */
  async getAllTimesheets(userId: string, options?: {
    date?: Date;
    status?: string;
  }) {
    const { date, status } = options || {};

    return this.prisma.timesheet.findMany({
      where: {
        employee: { userId },
        ...(date && { date }),
        ...(status && { status: status as any }),
      },
      orderBy: [{ date: 'desc' }, { startTime: 'asc' }],
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, department: true } },
      },
    });
  }

  /**
   * Approve a timesheet entry
   */
  async approveTimesheet(id: string, approvedBy: string) {
    return this.prisma.timesheet.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy,
      },
    });
  }

  /**
   * Reject a timesheet entry
   */
  async rejectTimesheet(id: string, rejectedBy: string, reason: string) {
    return this.prisma.timesheet.update({
      where: { id },
      data: {
        status: 'REJECTED',
        notes: reason,
      },
    });
  }

  /**
   * Update a timesheet entry
   */
  async updateTimesheet(id: string, data: {
    startTime?: Date;
    endTime?: Date;
    breakMinutes?: number;
    notes?: string;
  }) {
    const existing = await this.prisma.timesheet.findUnique({ where: { id } });
    if (!existing) throw new Error('Timesheet not found');

    const startTime = data.startTime || existing.startTime;
    const endTime = data.endTime || existing.endTime;
    const breakMinutes = data.breakMinutes ?? existing.breakMinutes;

    // Recalculate worked hours
    const startMs = new Date(startTime).getTime();
    const endMs = new Date(endTime).getTime();
    const breakMs = (breakMinutes || 0) * 60 * 1000;
    const workedMs = endMs - startMs - breakMs;
    const workedHours = workedMs / (1000 * 60 * 60);

    return this.prisma.timesheet.update({
      where: { id },
      data: {
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        breakMinutes,
        workedHours,
        notes: data.notes,
        status: 'PENDING', // Reset to pending on edit
      },
    });
  }

  /**
   * Get timesheet summary for payroll
   * Aggregates hours for a period to integrate with payroll
   */
  async getTimesheetSummary(userId: string, period: string) {
    const [year, month] = period.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const timesheets = await this.prisma.timesheet.findMany({
      where: {
        employee: { userId },
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: 'APPROVED',
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, salary: true } },
      },
    });

    // Group by employee
    const byEmployee = new Map<string, {
      employee: any;
      totalHours: number;
      daysWorked: number;
      timesheets: typeof timesheets;
    }>();

    for (const ts of timesheets) {
      const key = ts.employeeId;
      if (!byEmployee.has(key)) {
        byEmployee.set(key, {
          employee: ts.employee,
          totalHours: 0,
          daysWorked: 0,
          timesheets: [],
        });
      }
      const entry = byEmployee.get(key)!;
      entry.totalHours += ts.workedHours || 0;
      entry.timesheets.push(ts);
    }

    // Calculate days worked (unique dates)
    for (const [, entry] of byEmployee) {
      const uniqueDates = new Set(entry.timesheets.map(ts => ts.date.toISOString().split('T')[0]));
      entry.daysWorked = uniqueDates.size;
    }

    return {
      period,
      startDate,
      endDate,
      employees: Array.from(byEmployee.values()).map(entry => ({
        employeeId: entry.employee.id,
        employeeName: `${entry.employee.firstName} ${entry.employee.lastName}`,
        totalHours: Math.round(entry.totalHours * 100) / 100,
        daysWorked: entry.daysWorked,
        monthlySalary: entry.employee.salary,
      })),
      totalHours: Array.from(byEmployee.values()).reduce((sum, e) => sum + e.totalHours, 0),
    };
  }

// =================== CONTRACT TEMPLATE GENERATOR ===================
  // Romanian Labor Law (Codul Muncii) compliant contract templates

  /**
   * Contract template types per Romanian labor law
   */
  readonly contractTypes = {
    CIM_NEDETERMINAT: {
      code: 'CIM_NEDETERMINAT',
      name: 'Contract Individual de Muncă pe durată nedeterminată',
      description: 'Contract standard pe termen nelimitat',
    },
    CIM_DETERMINAT: {
      code: 'CIM_DETERMINAT',
      name: 'Contract Individual de Muncă pe durată determinată',
      description: 'Contract pe termen limitat (max 36 luni)',
    },
    CIM_TIMP_PARTIAL: {
      code: 'CIM_TIMP_PARTIAL',
      name: 'Contract Individual de Muncă cu timp parțial',
      description: 'Contract part-time (sub 8 ore/zi)',
    },
    CONVENTIE_CIVILA: {
      code: 'CONVENTIE_CIVILA',
      name: 'Convenție Civilă de Prestări Servicii',
      description: 'Pentru colaboratori/freelanceri',
    },
    ACT_ADITIONAL: {
      code: 'ACT_ADITIONAL',
      name: 'Act Adițional la CIM',
      description: 'Modificare contract existent (salariu, funcție, etc.)',
    },
  };

  /**
   * Get available contract template types
   */
  getContractTypes() {
    return Object.values(this.contractTypes);
  }

  /**
   * Generate contract from employee data
   */
  async generateContract(
    userId: string,
    employeeId: string,
    options: {
      templateType: string;
      startDate?: Date;
      endDate?: Date;
      additionalClauses?: string[];
      changes?: { field: string; oldValue: string; newValue: string }[];
    },
  ): Promise<{
    employee: any;
    contract: {
      type: string;
      typeName: string;
      content: string;
      generatedAt: Date;
      validFrom: Date;
      validTo?: Date;
      registrationNumber: string;
    };
    warnings: string[];
  }> {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, userId },
    });

    if (!employee) {
      throw new Error('Angajatul nu a fost găsit');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const warnings: string[] = [];
    const emp = employee as Record<string, any>;

    // Validate employee data completeness
    if (!employee.cnp) warnings.push('CNP angajat lipsă - obligatoriu pentru REVISAL');
    if (!emp.address) warnings.push('Adresa angajat lipsă');
    if (!emp.idCard) warnings.push('CI/Buletin angajat lipsă');

    const contractTypesMap = this.contractTypes as Record<string, { code: string; name: string; description: string }>;
    const templateType = contractTypesMap[options.templateType];
    if (!templateType) {
      throw new Error(`Tip contract invalid: ${options.templateType}`);
    }

    const startDate = options.startDate || new Date();
    const registrationNumber = `CIM-${Date.now()}-${employeeId.slice(-4).toUpperCase()}`;

    // Generate contract content based on template type
    let content = '';

    switch (options.templateType) {
      case 'CIM_NEDETERMINAT':
        content = this.generateCIMNedeterminat(employee, user, startDate, options.additionalClauses);
        break;
      case 'CIM_DETERMINAT':
        if (!options.endDate) {
          throw new Error('Data de sfârșit este obligatorie pentru CIM determinat');
        }
        content = this.generateCIMDeterminat(employee, user, startDate, options.endDate, options.additionalClauses);
        break;
      case 'CIM_TIMP_PARTIAL':
        content = this.generateCIMTimpPartial(employee, user, startDate, options.additionalClauses);
        break;
      case 'CONVENTIE_CIVILA':
        content = this.generateConventieCivila(employee, user, startDate, options.endDate, options.additionalClauses);
        break;
      case 'ACT_ADITIONAL':
        if (!options.changes || options.changes.length === 0) {
          throw new Error('Modificările sunt obligatorii pentru Act Adițional');
        }
        content = this.generateActAditional(employee, user, startDate, options.changes);
        break;
      default:
        throw new Error(`Tip contract necunoscut: ${options.templateType}`);
    }

    return {
      employee: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        cnp: employee.cnp,
        position: employee.position,
        department: employee.department,
        salary: employee.salary,
      },
      contract: {
        type: templateType.code,
        typeName: templateType.name,
        content,
        generatedAt: new Date(),
        validFrom: startDate,
        validTo: options.endDate,
        registrationNumber,
      },
      warnings,
    };
  }

  /**
   * Generate CIM pe durată nedeterminată
   */
  private generateCIMNedeterminat(
    employee: any,
    employer: any,
    startDate: Date,
    additionalClauses?: string[],
  ): string {
    const formattedDate = startDate.toLocaleDateString('ro-RO');
    const salary = Number(employee.salary).toLocaleString('ro-RO');

    return `
CONTRACT INDIVIDUAL DE MUNCĂ
pe durată nedeterminată

Nr. înregistrare: _______________ din data de ${formattedDate}

În temeiul Legii nr. 53/2003 - Codul Muncii, republicată, cu modificările și completările ulterioare,

PĂRȚILE CONTRACTANTE:

1. ANGAJATOR
Denumire: ${employer?.company || '____________________'}
CUI/CIF: ${employer?.cui || '____________________'}
Sediul: ${employer?.address || '____________________'}
Reprezentant legal: ${employer?.name || '____________________'}

2. ANGAJAT
Numele și prenumele: ${employee.lastName} ${employee.firstName}
CNP: ${employee.cnp || '____________________'}
Domiciliul: ${employee.address || '____________________'}
Act de identitate: ${employee.idCard || '____________________'}

Au convenit să încheie prezentul contract individual de muncă în următoarele condiții:

Art. 1. OBIECTUL CONTRACTULUI
Angajatul va presta activitate în funcția/meseria de ${employee.position || '____________________'},
în cadrul departamentului ${employee.department || '____________________'}.

Art. 2. DURATA CONTRACTULUI
Prezentul contract se încheie pe durată nedeterminată, începând cu data de ${formattedDate}.
Perioada de probă: 90 zile calendaristice.

Art. 3. LOCUL DE MUNCĂ
Activitatea se desfășoară la sediul angajatorului sau în alte locații stabilite de comun acord.

Art. 4. PROGRAMUL DE LUCRU
- Durata timpului de lucru: 8 ore/zi, 40 ore/săptămână
- Programul de lucru: Luni-Vineri, 09:00-17:00
- Repausul săptămânal: Sâmbătă și Duminică

Art. 5. SALARIUL
- Salariul de bază brut lunar: ${salary} RON
- Plata salariului: lunar, prin virament bancar
- Data plății: până la data de 10 a lunii următoare

Art. 6. DREPTURI ȘI OBLIGAȚII ALE PĂRȚILOR
Conform Codului Muncii și regulamentului intern al angajatorului.

Art. 7. CONCEDIUL DE ODIHNĂ
Angajatul beneficiază de un concediu de odihnă anual de minimum 20 zile lucrătoare.

Art. 8. ÎNCETAREA CONTRACTULUI
Prezentul contract poate înceta în condițiile prevăzute de Codul Muncii.
Termenul de preaviz: 20 zile lucrătoare.

${additionalClauses?.length ? `Art. 9. CLAUZE SPECIALE\n${additionalClauses.join('\n')}` : ''}

Art. 10. DISPOZIȚII FINALE
Prezentul contract a fost încheiat în 2 exemplare, câte unul pentru fiecare parte.
Orice modificare se face prin act adițional, cu acordul ambelor părți.

ANGAJATOR,                                    ANGAJAT,
${employer?.name || '____________________'}   ${employee.lastName} ${employee.firstName}
_______________________                       _______________________
(semnătura și ștampila)                       (semnătura)

Data: ${formattedDate}
    `.trim();
  }

  /**
   * Generate CIM pe durată determinată
   */
  private generateCIMDeterminat(
    employee: any,
    employer: any,
    startDate: Date,
    endDate: Date,
    additionalClauses?: string[],
  ): string {
    const startFormatted = startDate.toLocaleDateString('ro-RO');
    const endFormatted = endDate.toLocaleDateString('ro-RO');
    const salary = Number(employee.salary).toLocaleString('ro-RO');

    // Calculate duration in months
    const months = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    if (months > 36) {
      this.logger.warn(`CIM determinat > 36 luni: ${months} luni`);
    }

    return `
CONTRACT INDIVIDUAL DE MUNCĂ
pe durată determinată

Nr. înregistrare: _______________ din data de ${startFormatted}

În temeiul Legii nr. 53/2003 - Codul Muncii, republicată, cu modificările și completările ulterioare,
Art. 82-87 (contractul pe durată determinată),

PĂRȚILE CONTRACTANTE:

1. ANGAJATOR
Denumire: ${employer?.company || '____________________'}
CUI/CIF: ${employer?.cui || '____________________'}
Sediul: ${employer?.address || '____________________'}

2. ANGAJAT
Numele și prenumele: ${employee.lastName} ${employee.firstName}
CNP: ${employee.cnp || '____________________'}
Domiciliul: ${employee.address || '____________________'}

Au convenit să încheie prezentul contract individual de muncă în următoarele condiții:

Art. 1. OBIECTUL CONTRACTULUI
Funcția/Meseria: ${employee.position || '____________________'}
Departament: ${employee.department || '____________________'}

Art. 2. DURATA CONTRACTULUI
Prezentul contract se încheie pe durată DETERMINATĂ:
- Data începerii: ${startFormatted}
- Data încetării: ${endFormatted}
- Durata totală: ${months} luni

Motivul încheierii pe durată determinată: ____________________
(înlocuire salariat, activitate sezonieră, creștere temporară activitate, etc.)

Art. 3. SALARIUL
- Salariul de bază brut lunar: ${salary} RON

Art. 4. PROGRAMUL DE LUCRU
8 ore/zi, 40 ore/săptămână, Luni-Vineri

Art. 5. ÎNCETAREA CONTRACTULUI
Contractul încetează de drept la data de ${endFormatted}.
Poate fi prelungit prin act adițional, în limita a max. 36 luni cumulate.

${additionalClauses?.length ? `Art. 6. CLAUZE SPECIALE\n${additionalClauses.join('\n')}` : ''}

ANGAJATOR,                                    ANGAJAT,
${employer?.name || '____________________'}   ${employee.lastName} ${employee.firstName}

Data: ${startFormatted}
    `.trim();
  }

  /**
   * Generate CIM cu timp parțial (part-time)
   */
  private generateCIMTimpPartial(
    employee: any,
    employer: any,
    startDate: Date,
    additionalClauses?: string[],
  ): string {
    const formattedDate = startDate.toLocaleDateString('ro-RO');
    const salary = Number(employee.salary).toLocaleString('ro-RO');
    const hoursPerDay = employee.hoursPerDay || 4;
    const hoursPerWeek = hoursPerDay * 5;

    return `
CONTRACT INDIVIDUAL DE MUNCĂ
cu timp parțial

Nr. înregistrare: _______________ din data de ${formattedDate}

În temeiul Legii nr. 53/2003 - Codul Muncii, Art. 103-107 (munca cu timp parțial),

PĂRȚILE CONTRACTANTE:

1. ANGAJATOR
Denumire: ${employer?.company || '____________________'}
CUI/CIF: ${employer?.cui || '____________________'}

2. ANGAJAT
Numele și prenumele: ${employee.lastName} ${employee.firstName}
CNP: ${employee.cnp || '____________________'}

Art. 1. OBIECTUL CONTRACTULUI
Funcția: ${employee.position || '____________________'}

Art. 2. DURATA MUNCII
- Ore/zi: ${hoursPerDay} ore
- Ore/săptămână: ${hoursPerWeek} ore
- Programul de lucru: ____________________
- Repartizarea programului: ____________________

NOTĂ: Timpul parțial reprezintă ${Math.round((hoursPerWeek / 40) * 100)}% din norma întreagă.

Art. 3. SALARIUL
- Salariul brut lunar (proporțional): ${salary} RON
- Calculat la ${hoursPerWeek}h/săptămână din norma de 40h

Art. 4. DREPTURILE SALARIATULUI
Salariatul cu timp parțial beneficiază de drepturile prevăzute de lege,
proporțional cu timpul efectiv lucrat.

${additionalClauses?.length ? `Art. 5. CLAUZE SPECIALE\n${additionalClauses.join('\n')}` : ''}

ANGAJATOR,                                    ANGAJAT,
${employer?.name || '____________________'}   ${employee.lastName} ${employee.firstName}

Data: ${formattedDate}
    `.trim();
  }

  /**
   * Generate Convenție Civilă de Prestări Servicii (pentru PFA/colaboratori)
   */
  private generateConventieCivila(
    employee: any,
    employer: any,
    startDate: Date,
    endDate?: Date,
    additionalClauses?: string[],
  ): string {
    const startFormatted = startDate.toLocaleDateString('ro-RO');
    const endFormatted = endDate?.toLocaleDateString('ro-RO') || '____________________';
    const fee = Number(employee.salary).toLocaleString('ro-RO');

    return `
CONVENȚIE CIVILĂ DE PRESTĂRI SERVICII

Nr. _____________ din data de ${startFormatted}

Încheiată în temeiul Art. 1166 și următoarele din Codul Civil,

ÎNTRE:

1. BENEFICIAR
Denumire: ${employer?.company || '____________________'}
CUI/CIF: ${employer?.cui || '____________________'}
Sediul: ${employer?.address || '____________________'}
Reprezentant: ${employer?.name || '____________________'}

ȘI

2. PRESTATOR
Numele și prenumele: ${employee.lastName} ${employee.firstName}
CNP: ${employee.cnp || '____________________'}
Domiciliul: ${employee.address || '____________________'}
Cod CAEN prestator: ____________________

Art. 1. OBIECTUL CONVENȚIEI
Prestatorul se obligă să presteze următoarele servicii:
${employee.position || '____________________'}

Art. 2. DURATA CONVENȚIEI
De la: ${startFormatted}
Până la: ${endFormatted}

Art. 3. PREȚUL SERVICIILOR
Onorariul convenit: ${fee} RON (brut)
Modalitatea de plată: lunar, pe bază de factură/raport de activitate

Art. 4. OBLIGAȚIILE PRESTATORULUI
- Să presteze serviciile conform standardelor profesionale
- Să emită factură fiscală pentru serviciile prestate
- Să asigure confidențialitatea informațiilor

Art. 5. OBLIGAȚIILE BENEFICIARULUI
- Să achite onorariul în termen de 30 zile de la facturare
- Să pună la dispoziție informațiile necesare prestării serviciilor

Art. 6. REGIMUL FISCAL
Prestatorul este responsabil pentru plata propriilor impozite și contribuții.
Aceasta NU este o relație de muncă în sensul Codului Muncii.

${additionalClauses?.length ? `Art. 7. CLAUZE SPECIALE\n${additionalClauses.join('\n')}` : ''}

BENEFICIAR,                                   PRESTATOR,
${employer?.name || '____________________'}   ${employee.lastName} ${employee.firstName}

Data: ${startFormatted}
    `.trim();
  }

  /**
   * Generate Act Adițional la CIM (pentru modificări salariu, funcție, etc.)
   */
  private generateActAditional(
    employee: any,
    employer: any,
    effectiveDate: Date,
    changes: { field: string; oldValue: string; newValue: string }[],
  ): string {
    const formattedDate = effectiveDate.toLocaleDateString('ro-RO');

    const changeDescriptions = changes.map((change, index) => {
      const fieldLabels: Record<string, string> = {
        salary: 'Salariul de bază brut lunar',
        position: 'Funcția/Meseria',
        department: 'Departamentul',
        schedule: 'Programul de lucru',
        location: 'Locul de muncă',
      };
      const label = fieldLabels[change.field] || change.field;
      return `${index + 1}. ${label}:
   - Valoare anterioară: ${change.oldValue}
   - Valoare nouă: ${change.newValue}`;
    }).join('\n\n');

    return `
ACT ADIȚIONAL nr. ________
la Contractul Individual de Muncă nr. _____________ din data de _____________

Încheiat astăzi, ${formattedDate}

ÎNTRE:

1. ANGAJATOR
Denumire: ${employer?.company || '____________________'}
CUI/CIF: ${employer?.cui || '____________________'}
Reprezentant: ${employer?.name || '____________________'}

ȘI

2. ANGAJAT
Numele și prenumele: ${employee.lastName} ${employee.firstName}
CNP: ${employee.cnp || '____________________'}
Funcția actuală: ${employee.position || '____________________'}

Părțile au convenit de comun acord modificarea contractului individual de muncă
după cum urmează:

Art. 1. MODIFICĂRI ADUSE CONTRACTULUI

${changeDescriptions}

Art. 2. DATA INTRĂRII ÎN VIGOARE
Prezentul act adițional produce efecte începând cu data de ${formattedDate}.

Art. 3. DISPOZIȚII FINALE
Celelalte clauze ale contractului individual de muncă rămân neschimbate.
Prezentul act adițional a fost încheiat în 2 exemplare, câte unul pentru fiecare parte.

ANGAJATOR,                                    ANGAJAT,
${employer?.name || '____________________'}   ${employee.lastName} ${employee.firstName}
_______________________                       _______________________
(semnătura și ștampila)                       (semnătura)

Data: ${formattedDate}
    `.trim();
  }

  /**
   * Detect if employee data changed and suggest Act Adițional
   */
  async detectContractChanges(employeeId: string, newData: any): Promise<{
    hasChanges: boolean;
    changes: { field: string; oldValue: string; newValue: string }[];
    suggestActAditional: boolean;
    message: string;
  }> {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      throw new Error('Angajatul nu a fost găsit');
    }

    const contractFields = ['salary', 'position', 'department'] as const;
    const changes: { field: string; oldValue: string; newValue: string }[] = [];
    const emp = employee as Record<string, any>;

    for (const field of contractFields) {
      if (newData[field] !== undefined && newData[field] !== emp[field]) {
        changes.push({
          field,
          oldValue: String(emp[field] || ''),
          newValue: String(newData[field]),
        });
      }
    }

    const hasChanges = changes.length > 0;
    const suggestActAditional = hasChanges;

    let message = '';
    if (suggestActAditional) {
      message = `Atenție! Modificările detectate necesită Act Adițional la CIM conform Codului Muncii: ${changes.map(c => c.field).join(', ')}.`;
    }

    return {
      hasChanges,
      changes,
      suggestActAditional,
      message,
    };
  }

  /**
   * Auto-create timesheets from completed delivery routes
   * Links driver timesheets to fleet routes for accurate tracking
   */
  async createTimesheetsFromRoutes(userId: string, date: Date) {
    const routes = await this.prisma.deliveryRoute.findMany({
      where: {
        userId,
        routeDate: date,
        status: 'COMPLETED',
      },
      include: {
        driver: true,
      },
    });

    const timesheets = [];

    for (const route of routes) {
      if (!route.driverId || !route.actualStartTime || !route.actualEndTime) {
        continue;
      }

      // Find employee linked to this driver
      const employee = await this.prisma.employee.findFirst({
        where: { userId, firstName: route.driver?.firstName, lastName: route.driver?.lastName },
      });

      if (!employee) {
        this.logger.warn(`No employee found for driver ${route.driverId}`);
        continue;
      }

      try {
        const timesheet = await this.createTimesheet({
          employeeId: employee.id,
          date,
          startTime: route.actualStartTime,
          endTime: route.actualEndTime,
          breakMinutes: 30, // Default 30 min break
          routeId: route.id,
          notes: `Auto-generated from route ${route.routeName || route.id}`,
        });
        timesheets.push(timesheet);
      } catch (err) {
        this.logger.error(`Failed to create timesheet for route ${route.id}: ${err.message}`);
      }
    }

    return {
      created: timesheets.length,
      timesheets,
    };
  }
}
