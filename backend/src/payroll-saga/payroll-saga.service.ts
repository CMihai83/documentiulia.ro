import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SagaService } from '../saga/saga.service';

// Payroll SAGA Integration Service
// Implements bi-directional sync, D112 automation, SAF-T payroll section
// Per Romanian labor law, Order 1783/2021 compliance

// ===== ENUMS =====

export enum SyncDirection {
  TO_SAGA = 'TO_SAGA',
  FROM_SAGA = 'FROM_SAGA',
  BIDIRECTIONAL = 'BIDIRECTIONAL',
}

export enum SyncStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
}

export enum PayrollPeriodStatus {
  DRAFT = 'DRAFT',
  CALCULATED = 'CALCULATED',
  APPROVED = 'APPROVED',
  SYNCED = 'SYNCED',
  DECLARED = 'DECLARED',
  CLOSED = 'CLOSED',
}

export enum D112Status {
  NOT_STARTED = 'NOT_STARTED',
  GENERATING = 'GENERATING',
  GENERATED = 'GENERATED',
  VALIDATED = 'VALIDATED',
  SUBMITTED = 'SUBMITTED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export enum ReconciliationStatus {
  MATCHED = 'MATCHED',
  DISCREPANCY = 'DISCREPANCY',
  MISSING_IN_SAGA = 'MISSING_IN_SAGA',
  MISSING_IN_LOCAL = 'MISSING_IN_LOCAL',
}

// ===== INTERFACES =====

export interface SagaEmployee {
  sagaId: string;
  cnp: string;
  firstName: string;
  lastName: string;
  hireDate: string;
  position: string;
  department: string;
  salary: number;
  contractType: string;
  workHours: number;
  bankAccount?: string;
  address?: string;
}

export interface PayrollEntry {
  employeeId: string;
  employeeName: string;
  cnp: string;
  grossSalary: number;
  netSalary: number;
  cas: number;          // Contribuție Asigurări Sociale (25%)
  cass: number;         // Contribuție Asigurări Sociale Sănătate (10%)
  incomeTax: number;    // Impozit pe venit (10%)
  cam: number;          // Contribuție Asiguratorie pentru Muncă (2.25%)
  deductions: PayrollDeduction[];
  bonuses: PayrollBonus[];
  workingDays: number;
  workedDays: number;
  overtimeHours: number;
  sickLeaveDays: number;
  vacationDays: number;
}

export interface PayrollDeduction {
  type: string;
  amount: number;
  description: string;
}

export interface PayrollBonus {
  type: string;
  amount: number;
  description: string;
  taxable: boolean;
}

export interface PayrollPeriod {
  id: string;
  year: number;
  month: number;
  status: PayrollPeriodStatus;
  entries: PayrollEntry[];
  totals: PayrollTotals;
  sagaSyncId?: string;
  sagaSyncedAt?: Date;
  d112Status: D112Status;
  d112SubmittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PayrollTotals {
  totalGross: number;
  totalNet: number;
  totalCas: number;
  totalCass: number;
  totalIncomeTax: number;
  totalCam: number;
  totalDeductions: number;
  totalBonuses: number;
  employeeCount: number;
}

export interface SyncResult {
  id: string;
  direction: SyncDirection;
  status: SyncStatus;
  startedAt: Date;
  completedAt?: Date;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  errors: SyncError[];
  changes: SyncChange[];
}

export interface SyncError {
  recordId: string;
  recordType: string;
  error: string;
  timestamp: Date;
}

export interface SyncChange {
  recordId: string;
  recordType: string;
  field: string;
  oldValue: any;
  newValue: any;
  direction: SyncDirection;
}

export interface D112Declaration {
  id: string;
  period: string;
  status: D112Status;
  xml: string;
  validationErrors: string[];
  submittedAt?: Date;
  anafResponseId?: string;
  createdAt: Date;
}

export interface SAFTPayrollSection {
  period: string;
  employees: SAFTEmployee[];
  salaryPayments: SAFTSalaryPayment[];
  taxDeclarations: SAFTTaxDeclaration[];
}

export interface SAFTEmployee {
  employeeID: string;
  registrationNumber: string;
  firstName: string;
  lastName: string;
  taxNumber: string;
}

export interface SAFTSalaryPayment {
  paymentID: string;
  employeeID: string;
  paymentDate: string;
  grossAmount: number;
  taxAmount: number;
  netAmount: number;
}

export interface SAFTTaxDeclaration {
  declarationType: string;
  period: string;
  totalAmount: number;
  dueDate: string;
}

export interface ReconciliationReport {
  id: string;
  period: string;
  generatedAt: Date;
  status: 'CLEAN' | 'DISCREPANCIES_FOUND';
  localEmployeeCount: number;
  sagaEmployeeCount: number;
  matchedRecords: number;
  discrepancies: ReconciliationDiscrepancy[];
  recommendations: string[];
}

export interface ReconciliationDiscrepancy {
  employeeId: string;
  employeeName: string;
  field: string;
  localValue: any;
  sagaValue: any;
  status: ReconciliationStatus;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface SalaryChangeEvent {
  employeeId: string;
  oldSalary: number;
  newSalary: number;
  effectiveDate: string;
  reason: string;
  approvedBy?: string;
}

// ===== SERVICE =====

@Injectable()
export class PayrollSagaService {
  private readonly logger = new Logger(PayrollSagaService.name);

  // In-memory storage for demo (replace with Prisma when tables are created)
  private payrollPeriods: Map<string, PayrollPeriod> = new Map();
  private syncHistory: Map<string, SyncResult> = new Map();
  private d112Declarations: Map<string, D112Declaration> = new Map();
  private reconciliationReports: Map<string, ReconciliationReport> = new Map();
  private salaryChangeQueue: SalaryChangeEvent[] = [];

  // Romanian tax rates 2025
  private readonly TAX_RATES = {
    CAS: 0.25,       // Contribuție Asigurări Sociale
    CASS: 0.10,      // Contribuție Asigurări Sociale Sănătate
    INCOME_TAX: 0.10, // Impozit pe venit
    CAM: 0.0225,     // Contribuție Asiguratorie pentru Muncă (employer)
  };

  // Minimum wage 2025
  private readonly MINIMUM_WAGE = 3700; // RON

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private sagaService: SagaService,
  ) {}

  // ===== EMPLOYEE SYNC =====

  async syncEmployeesToSaga(organizationId?: string): Promise<SyncResult> {
    const syncId = `sync-emp-${Date.now()}`;
    const startedAt = new Date();
    const errors: SyncError[] = [];
    const changes: SyncChange[] = [];
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    this.logger.log(`Starting employee sync to SAGA: ${syncId}`);

    try {
      // Get all active employees
      const whereClause: any = { status: 'ACTIVE' };
      if (organizationId) {
        whereClause.organizationId = organizationId;
      }

      const employees = await this.prisma.employee.findMany({
        where: whereClause,
      });

      for (const employee of employees) {
        processed++;
        try {
          const sagaEmployee: SagaEmployee = {
            sagaId: `SAGA-${employee.id}`,
            cnp: employee.cnp || '',
            firstName: employee.firstName,
            lastName: employee.lastName,
            hireDate: employee.hireDate.toISOString().split('T')[0],
            position: employee.position,
            department: employee.department || 'General',
            salary: employee.salary ? Number(employee.salary) : this.MINIMUM_WAGE,
            contractType: employee.contractType || 'FULL_TIME',
            workHours: 8,
          };

          // Call SAGA API to sync employee
          await this.sagaService.syncPayroll({
            type: 'employee',
            data: sagaEmployee,
          });

          changes.push({
            recordId: employee.id,
            recordType: 'employee',
            field: 'all',
            oldValue: null,
            newValue: sagaEmployee,
            direction: SyncDirection.TO_SAGA,
          });

          succeeded++;
        } catch (error: any) {
          failed++;
          errors.push({
            recordId: employee.id,
            recordType: 'employee',
            error: error.message || 'Unknown error',
            timestamp: new Date(),
          });
        }
      }

      const result: SyncResult = {
        id: syncId,
        direction: SyncDirection.TO_SAGA,
        status: failed === 0 ? SyncStatus.COMPLETED : (succeeded > 0 ? SyncStatus.PARTIAL : SyncStatus.FAILED),
        startedAt,
        completedAt: new Date(),
        recordsProcessed: processed,
        recordsSucceeded: succeeded,
        recordsFailed: failed,
        errors,
        changes,
      };

      this.syncHistory.set(syncId, result);
      return result;
    } catch (error: any) {
      const result: SyncResult = {
        id: syncId,
        direction: SyncDirection.TO_SAGA,
        status: SyncStatus.FAILED,
        startedAt,
        completedAt: new Date(),
        recordsProcessed: processed,
        recordsSucceeded: succeeded,
        recordsFailed: failed,
        errors: [...errors, {
          recordId: 'system',
          recordType: 'sync',
          error: error.message,
          timestamp: new Date(),
        }],
        changes,
      };

      this.syncHistory.set(syncId, result);
      throw error;
    }
  }

  async syncEmployeesFromSaga(organizationId?: string): Promise<SyncResult> {
    const syncId = `sync-emp-from-${Date.now()}`;
    const startedAt = new Date();
    const errors: SyncError[] = [];
    const changes: SyncChange[] = [];
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    this.logger.log(`Starting employee sync from SAGA: ${syncId}`);

    try {
      // Mock SAGA employees for demo
      const sagaEmployees: SagaEmployee[] = await this.fetchSagaEmployees();

      for (const sagaEmp of sagaEmployees) {
        processed++;
        try {
          // Find local employee by CNP
          const localEmployee = await this.prisma.employee.findFirst({
            where: { cnp: sagaEmp.cnp },
          });

          if (localEmployee) {
            // Check for differences and update
            const updates: any = {};

            const localSalary = localEmployee.salary ? Number(localEmployee.salary) : 0;
            if (localSalary !== sagaEmp.salary) {
              changes.push({
                recordId: localEmployee.id,
                recordType: 'employee',
                field: 'salary',
                oldValue: localSalary,
                newValue: sagaEmp.salary,
                direction: SyncDirection.FROM_SAGA,
              });
              updates.salary = sagaEmp.salary;
            }

            if (localEmployee.position !== sagaEmp.position) {
              changes.push({
                recordId: localEmployee.id,
                recordType: 'employee',
                field: 'position',
                oldValue: localEmployee.position,
                newValue: sagaEmp.position,
                direction: SyncDirection.FROM_SAGA,
              });
              updates.position = sagaEmp.position;
            }

            if (Object.keys(updates).length > 0) {
              await this.prisma.employee.update({
                where: { id: localEmployee.id },
                data: updates,
              });
            }
          }

          succeeded++;
        } catch (error: any) {
          failed++;
          errors.push({
            recordId: sagaEmp.sagaId,
            recordType: 'employee',
            error: error.message || 'Unknown error',
            timestamp: new Date(),
          });
        }
      }

      const result: SyncResult = {
        id: syncId,
        direction: SyncDirection.FROM_SAGA,
        status: failed === 0 ? SyncStatus.COMPLETED : (succeeded > 0 ? SyncStatus.PARTIAL : SyncStatus.FAILED),
        startedAt,
        completedAt: new Date(),
        recordsProcessed: processed,
        recordsSucceeded: succeeded,
        recordsFailed: failed,
        errors,
        changes,
      };

      this.syncHistory.set(syncId, result);
      return result;
    } catch (error: any) {
      const result: SyncResult = {
        id: syncId,
        direction: SyncDirection.FROM_SAGA,
        status: SyncStatus.FAILED,
        startedAt,
        completedAt: new Date(),
        recordsProcessed: processed,
        recordsSucceeded: succeeded,
        recordsFailed: failed,
        errors: [...errors, {
          recordId: 'system',
          recordType: 'sync',
          error: error.message,
          timestamp: new Date(),
        }],
        changes,
      };

      this.syncHistory.set(syncId, result);
      throw error;
    }
  }

  async bidirectionalSync(organizationId?: string): Promise<SyncResult> {
    const syncId = `sync-bi-${Date.now()}`;
    this.logger.log(`Starting bidirectional sync: ${syncId}`);

    // First sync from SAGA to get latest data
    const fromSaga = await this.syncEmployeesFromSaga(organizationId);

    // Then sync to SAGA to push local changes
    const toSaga = await this.syncEmployeesToSaga(organizationId);

    // Combine results
    const result: SyncResult = {
      id: syncId,
      direction: SyncDirection.BIDIRECTIONAL,
      status: fromSaga.status === SyncStatus.COMPLETED && toSaga.status === SyncStatus.COMPLETED
        ? SyncStatus.COMPLETED
        : SyncStatus.PARTIAL,
      startedAt: fromSaga.startedAt,
      completedAt: new Date(),
      recordsProcessed: fromSaga.recordsProcessed + toSaga.recordsProcessed,
      recordsSucceeded: fromSaga.recordsSucceeded + toSaga.recordsSucceeded,
      recordsFailed: fromSaga.recordsFailed + toSaga.recordsFailed,
      errors: [...fromSaga.errors, ...toSaga.errors],
      changes: [...fromSaga.changes, ...toSaga.changes],
    };

    this.syncHistory.set(syncId, result);
    return result;
  }

  // ===== SALARY CHANGES =====

  async pushSalaryChange(event: SalaryChangeEvent): Promise<SyncResult> {
    const syncId = `sync-salary-${Date.now()}`;
    const startedAt = new Date();

    this.logger.log(`Pushing salary change for employee ${event.employeeId}`);

    try {
      // Update local employee
      const employee = await this.prisma.employee.findUnique({
        where: { id: event.employeeId },
      });

      if (!employee) {
        throw new NotFoundException(`Employee ${event.employeeId} not found`);
      }

      // Update in database
      await this.prisma.employee.update({
        where: { id: event.employeeId },
        data: { salary: event.newSalary },
      });

      // Push to SAGA
      await this.sagaService.syncPayroll({
        type: 'salary_change',
        data: {
          employeeId: event.employeeId,
          cnp: employee.cnp,
          oldSalary: event.oldSalary,
          newSalary: event.newSalary,
          effectiveDate: event.effectiveDate,
          reason: event.reason,
        },
      });

      const result: SyncResult = {
        id: syncId,
        direction: SyncDirection.TO_SAGA,
        status: SyncStatus.COMPLETED,
        startedAt,
        completedAt: new Date(),
        recordsProcessed: 1,
        recordsSucceeded: 1,
        recordsFailed: 0,
        errors: [],
        changes: [{
          recordId: event.employeeId,
          recordType: 'employee',
          field: 'salary',
          oldValue: event.oldSalary,
          newValue: event.newSalary,
          direction: SyncDirection.TO_SAGA,
        }],
      };

      this.syncHistory.set(syncId, result);
      return result;
    } catch (error: any) {
      const result: SyncResult = {
        id: syncId,
        direction: SyncDirection.TO_SAGA,
        status: SyncStatus.FAILED,
        startedAt,
        completedAt: new Date(),
        recordsProcessed: 1,
        recordsSucceeded: 0,
        recordsFailed: 1,
        errors: [{
          recordId: event.employeeId,
          recordType: 'salary_change',
          error: error.message,
          timestamp: new Date(),
        }],
        changes: [],
      };

      this.syncHistory.set(syncId, result);
      throw error;
    }
  }

  async queueSalaryChange(event: SalaryChangeEvent): Promise<void> {
    this.salaryChangeQueue.push(event);
    this.logger.log(`Salary change queued for employee ${event.employeeId}`);
  }

  async processSalaryChangeQueue(): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    while (this.salaryChangeQueue.length > 0) {
      const event = this.salaryChangeQueue.shift()!;
      try {
        const result = await this.pushSalaryChange(event);
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to process salary change for ${event.employeeId}`, error);
      }
    }

    return results;
  }

  // ===== PAYROLL PERIODS =====

  async createPayrollPeriod(year: number, month: number): Promise<PayrollPeriod> {
    const periodId = `payroll-${year}-${String(month).padStart(2, '0')}`;

    if (this.payrollPeriods.has(periodId)) {
      throw new BadRequestException(`Payroll period ${year}-${month} already exists`);
    }

    // Get all active employees
    const employees = await this.prisma.employee.findMany({
      where: { status: 'ACTIVE' },
    });

    const entries: PayrollEntry[] = employees.map(emp => {
      const grossSalary = emp.salary ? Number(emp.salary) : this.MINIMUM_WAGE;
      const cas = grossSalary * this.TAX_RATES.CAS;
      const cass = grossSalary * this.TAX_RATES.CASS;
      const taxableIncome = grossSalary - cas - cass;
      const incomeTax = taxableIncome * this.TAX_RATES.INCOME_TAX;
      const netSalary = grossSalary - cas - cass - incomeTax;
      const cam = grossSalary * this.TAX_RATES.CAM;

      return {
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        cnp: emp.cnp || '',
        grossSalary,
        netSalary,
        cas,
        cass,
        incomeTax,
        cam,
        deductions: [],
        bonuses: [],
        workingDays: this.getWorkingDaysInMonth(year, month),
        workedDays: this.getWorkingDaysInMonth(year, month),
        overtimeHours: 0,
        sickLeaveDays: 0,
        vacationDays: 0,
      };
    });

    const totals = this.calculatePayrollTotals(entries);

    const period: PayrollPeriod = {
      id: periodId,
      year,
      month,
      status: PayrollPeriodStatus.DRAFT,
      entries,
      totals,
      d112Status: D112Status.NOT_STARTED,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.payrollPeriods.set(periodId, period);
    return period;
  }

  async getPayrollPeriod(year: number, month: number): Promise<PayrollPeriod> {
    const periodId = `payroll-${year}-${String(month).padStart(2, '0')}`;
    const period = this.payrollPeriods.get(periodId);

    if (!period) {
      throw new NotFoundException(`Payroll period ${year}-${month} not found`);
    }

    return period;
  }

  async calculatePayroll(year: number, month: number): Promise<PayrollPeriod> {
    const period = await this.getPayrollPeriod(year, month);

    if (period.status !== PayrollPeriodStatus.DRAFT) {
      throw new BadRequestException(`Payroll period must be in DRAFT status to calculate`);
    }

    // Recalculate all entries
    period.entries = period.entries.map(entry => {
      const grossSalary = entry.grossSalary;
      const cas = grossSalary * this.TAX_RATES.CAS;
      const cass = grossSalary * this.TAX_RATES.CASS;

      // Apply bonuses
      const totalBonuses = entry.bonuses.reduce((sum, b) => sum + b.amount, 0);
      const taxableBonuses = entry.bonuses.filter(b => b.taxable).reduce((sum, b) => sum + b.amount, 0);

      // Apply deductions
      const totalDeductions = entry.deductions.reduce((sum, d) => sum + d.amount, 0);

      const taxableIncome = grossSalary + taxableBonuses - cas - cass;
      const incomeTax = Math.max(0, taxableIncome * this.TAX_RATES.INCOME_TAX);
      const netSalary = grossSalary + totalBonuses - cas - cass - incomeTax - totalDeductions;
      const cam = grossSalary * this.TAX_RATES.CAM;

      return {
        ...entry,
        cas,
        cass,
        incomeTax,
        netSalary,
        cam,
      };
    });

    period.totals = this.calculatePayrollTotals(period.entries);
    period.status = PayrollPeriodStatus.CALCULATED;
    period.updatedAt = new Date();

    this.payrollPeriods.set(period.id, period);
    return period;
  }

  async approvePayroll(year: number, month: number, approvedBy: string): Promise<PayrollPeriod> {
    const period = await this.getPayrollPeriod(year, month);

    if (period.status !== PayrollPeriodStatus.CALCULATED) {
      throw new BadRequestException(`Payroll period must be in CALCULATED status to approve`);
    }

    period.status = PayrollPeriodStatus.APPROVED;
    period.updatedAt = new Date();

    this.payrollPeriods.set(period.id, period);
    this.logger.log(`Payroll ${year}-${month} approved by ${approvedBy}`);
    return period;
  }

  async syncPayrollToSaga(year: number, month: number): Promise<SyncResult> {
    const period = await this.getPayrollPeriod(year, month);
    const syncId = `sync-payroll-${year}-${month}-${Date.now()}`;
    const startedAt = new Date();

    if (period.status !== PayrollPeriodStatus.APPROVED) {
      throw new BadRequestException(`Payroll period must be APPROVED before syncing to SAGA`);
    }

    try {
      // Send to SAGA
      const sagaResult = await this.sagaService.syncPayroll({
        type: 'monthly_payroll',
        period: `${year}-${String(month).padStart(2, '0')}`,
        entries: period.entries,
        totals: period.totals,
      });

      period.sagaSyncId = sagaResult.sagaId;
      period.sagaSyncedAt = new Date();
      period.status = PayrollPeriodStatus.SYNCED;
      period.updatedAt = new Date();

      this.payrollPeriods.set(period.id, period);

      const result: SyncResult = {
        id: syncId,
        direction: SyncDirection.TO_SAGA,
        status: SyncStatus.COMPLETED,
        startedAt,
        completedAt: new Date(),
        recordsProcessed: period.entries.length,
        recordsSucceeded: period.entries.length,
        recordsFailed: 0,
        errors: [],
        changes: [{
          recordId: period.id,
          recordType: 'payroll_period',
          field: 'status',
          oldValue: PayrollPeriodStatus.APPROVED,
          newValue: PayrollPeriodStatus.SYNCED,
          direction: SyncDirection.TO_SAGA,
        }],
      };

      this.syncHistory.set(syncId, result);
      return result;
    } catch (error: any) {
      const result: SyncResult = {
        id: syncId,
        direction: SyncDirection.TO_SAGA,
        status: SyncStatus.FAILED,
        startedAt,
        completedAt: new Date(),
        recordsProcessed: period.entries.length,
        recordsSucceeded: 0,
        recordsFailed: period.entries.length,
        errors: [{
          recordId: period.id,
          recordType: 'payroll_period',
          error: error.message,
          timestamp: new Date(),
        }],
        changes: [],
      };

      this.syncHistory.set(syncId, result);
      throw error;
    }
  }

  // ===== D112 DECLARATION =====

  async generateD112(year: number, month: number): Promise<D112Declaration> {
    const period = await this.getPayrollPeriod(year, month);
    const declarationId = `d112-${year}-${String(month).padStart(2, '0')}`;

    if (period.status !== PayrollPeriodStatus.SYNCED && period.status !== PayrollPeriodStatus.DECLARED) {
      throw new BadRequestException(`Payroll must be synced to SAGA before generating D112`);
    }

    period.d112Status = D112Status.GENERATING;
    this.payrollPeriods.set(period.id, period);

    try {
      const xml = this.generateD112Xml(period);

      const declaration: D112Declaration = {
        id: declarationId,
        period: `${year}-${String(month).padStart(2, '0')}`,
        status: D112Status.GENERATED,
        xml,
        validationErrors: [],
        createdAt: new Date(),
      };

      this.d112Declarations.set(declarationId, declaration);

      period.d112Status = D112Status.GENERATED;
      this.payrollPeriods.set(period.id, period);

      return declaration;
    } catch (error: any) {
      period.d112Status = D112Status.NOT_STARTED;
      this.payrollPeriods.set(period.id, period);
      throw error;
    }
  }

  async validateD112(declarationId: string): Promise<D112Declaration> {
    const declaration = this.d112Declarations.get(declarationId);

    if (!declaration) {
      throw new NotFoundException(`D112 declaration ${declarationId} not found`);
    }

    // Validate with DUKIntegrator
    const validation = await this.sagaService.validateWithDUK(declaration.xml);

    declaration.status = validation.valid ? D112Status.VALIDATED : D112Status.GENERATED;
    declaration.validationErrors = validation.errors;

    this.d112Declarations.set(declarationId, declaration);

    // Update period status
    const [year, month] = declaration.period.split('-').map(Number);
    const period = await this.getPayrollPeriod(year, month);
    period.d112Status = declaration.status;
    this.payrollPeriods.set(period.id, period);

    return declaration;
  }

  async submitD112ToAnaf(declarationId: string): Promise<D112Declaration> {
    const declaration = this.d112Declarations.get(declarationId);

    if (!declaration) {
      throw new NotFoundException(`D112 declaration ${declarationId} not found`);
    }

    if (declaration.status !== D112Status.VALIDATED) {
      throw new BadRequestException(`D112 must be validated before submission`);
    }

    // Mock ANAF submission
    declaration.status = D112Status.SUBMITTED;
    declaration.submittedAt = new Date();
    declaration.anafResponseId = `ANAF-${Date.now()}`;

    this.d112Declarations.set(declarationId, declaration);

    // Update period
    const [year, month] = declaration.period.split('-').map(Number);
    const period = await this.getPayrollPeriod(year, month);
    period.d112Status = D112Status.SUBMITTED;
    period.d112SubmittedAt = declaration.submittedAt;
    period.status = PayrollPeriodStatus.DECLARED;
    this.payrollPeriods.set(period.id, period);

    this.logger.log(`D112 submitted to ANAF: ${declaration.anafResponseId}`);
    return declaration;
  }

  async getD112Status(year: number, month: number): Promise<D112Declaration | null> {
    const declarationId = `d112-${year}-${String(month).padStart(2, '0')}`;
    return this.d112Declarations.get(declarationId) || null;
  }

  // ===== SAF-T PAYROLL SECTION =====

  async generateSAFTPayrollSection(year: number, month: number): Promise<SAFTPayrollSection> {
    const period = await this.getPayrollPeriod(year, month);

    const employees: SAFTEmployee[] = period.entries.map(entry => ({
      employeeID: entry.employeeId,
      registrationNumber: entry.cnp,
      firstName: entry.employeeName.split(' ')[0],
      lastName: entry.employeeName.split(' ').slice(1).join(' '),
      taxNumber: entry.cnp,
    }));

    const salaryPayments: SAFTSalaryPayment[] = period.entries.map(entry => ({
      paymentID: `PAY-${period.id}-${entry.employeeId}`,
      employeeID: entry.employeeId,
      paymentDate: `${year}-${String(month).padStart(2, '0')}-25`,
      grossAmount: entry.grossSalary,
      taxAmount: entry.cas + entry.cass + entry.incomeTax,
      netAmount: entry.netSalary,
    }));

    const taxDeclarations: SAFTTaxDeclaration[] = [
      {
        declarationType: 'CAS',
        period: `${year}-${String(month).padStart(2, '0')}`,
        totalAmount: period.totals.totalCas,
        dueDate: `${year}-${String(month + 1).padStart(2, '0')}-25`,
      },
      {
        declarationType: 'CASS',
        period: `${year}-${String(month).padStart(2, '0')}`,
        totalAmount: period.totals.totalCass,
        dueDate: `${year}-${String(month + 1).padStart(2, '0')}-25`,
      },
      {
        declarationType: 'INCOME_TAX',
        period: `${year}-${String(month).padStart(2, '0')}`,
        totalAmount: period.totals.totalIncomeTax,
        dueDate: `${year}-${String(month + 1).padStart(2, '0')}-25`,
      },
      {
        declarationType: 'CAM',
        period: `${year}-${String(month).padStart(2, '0')}`,
        totalAmount: period.totals.totalCam,
        dueDate: `${year}-${String(month + 1).padStart(2, '0')}-25`,
      },
    ];

    return {
      period: `${year}-${String(month).padStart(2, '0')}`,
      employees,
      salaryPayments,
      taxDeclarations,
    };
  }

  async generateSAFTPayrollXml(year: number, month: number): Promise<string> {
    const section = await this.generateSAFTPayrollSection(year, month);

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<SAFTPayroll xmlns="urn:ro:anaf:saft:payroll:v1">
  <Header>
    <AuditFileVersion>1.0</AuditFileVersion>
    <AuditFileDateCreated>${new Date().toISOString()}</AuditFileDateCreated>
    <Period>${section.period}</Period>
  </Header>
  <Employees>
    ${section.employees.map(emp => `
    <Employee>
      <EmployeeID>${emp.employeeID}</EmployeeID>
      <RegistrationNumber>${emp.registrationNumber}</RegistrationNumber>
      <FirstName>${emp.firstName}</FirstName>
      <LastName>${emp.lastName}</LastName>
      <TaxNumber>${emp.taxNumber}</TaxNumber>
    </Employee>`).join('')}
  </Employees>
  <SalaryPayments>
    ${section.salaryPayments.map(pay => `
    <Payment>
      <PaymentID>${pay.paymentID}</PaymentID>
      <EmployeeID>${pay.employeeID}</EmployeeID>
      <PaymentDate>${pay.paymentDate}</PaymentDate>
      <GrossAmount>${pay.grossAmount.toFixed(2)}</GrossAmount>
      <TaxAmount>${pay.taxAmount.toFixed(2)}</TaxAmount>
      <NetAmount>${pay.netAmount.toFixed(2)}</NetAmount>
    </Payment>`).join('')}
  </SalaryPayments>
  <TaxDeclarations>
    ${section.taxDeclarations.map(tax => `
    <Declaration>
      <DeclarationType>${tax.declarationType}</DeclarationType>
      <Period>${tax.period}</Period>
      <TotalAmount>${tax.totalAmount.toFixed(2)}</TotalAmount>
      <DueDate>${tax.dueDate}</DueDate>
    </Declaration>`).join('')}
  </TaxDeclarations>
</SAFTPayroll>`;

    return xml;
  }

  // ===== RECONCILIATION =====

  async generateReconciliationReport(year: number, month: number): Promise<ReconciliationReport> {
    const reportId = `recon-${year}-${String(month).padStart(2, '0')}-${Date.now()}`;
    const period = await this.getPayrollPeriod(year, month);
    const sagaEmployees = await this.fetchSagaEmployees();
    const discrepancies: ReconciliationDiscrepancy[] = [];

    // Compare local vs SAGA data
    for (const entry of period.entries) {
      const sagaEmp = sagaEmployees.find(e => e.cnp === entry.cnp);

      if (!sagaEmp) {
        discrepancies.push({
          employeeId: entry.employeeId,
          employeeName: entry.employeeName,
          field: 'employee',
          localValue: entry,
          sagaValue: null,
          status: ReconciliationStatus.MISSING_IN_SAGA,
          severity: 'HIGH',
        });
        continue;
      }

      // Check salary match
      if (entry.grossSalary !== sagaEmp.salary) {
        discrepancies.push({
          employeeId: entry.employeeId,
          employeeName: entry.employeeName,
          field: 'salary',
          localValue: entry.grossSalary,
          sagaValue: sagaEmp.salary,
          status: ReconciliationStatus.DISCREPANCY,
          severity: Math.abs(entry.grossSalary - sagaEmp.salary) > 500 ? 'HIGH' : 'MEDIUM',
        });
      }
    }

    // Check for employees in SAGA but not local
    for (const sagaEmp of sagaEmployees) {
      const localEntry = period.entries.find(e => e.cnp === sagaEmp.cnp);
      if (!localEntry) {
        discrepancies.push({
          employeeId: sagaEmp.sagaId,
          employeeName: `${sagaEmp.firstName} ${sagaEmp.lastName}`,
          field: 'employee',
          localValue: null,
          sagaValue: sagaEmp,
          status: ReconciliationStatus.MISSING_IN_LOCAL,
          severity: 'HIGH',
        });
      }
    }

    const recommendations: string[] = [];
    if (discrepancies.some(d => d.status === ReconciliationStatus.MISSING_IN_SAGA)) {
      recommendations.push('Run employee sync to SAGA to add missing employees');
    }
    if (discrepancies.some(d => d.status === ReconciliationStatus.MISSING_IN_LOCAL)) {
      recommendations.push('Import missing employees from SAGA');
    }
    if (discrepancies.some(d => d.field === 'salary')) {
      recommendations.push('Review and reconcile salary discrepancies before payroll submission');
    }

    const report: ReconciliationReport = {
      id: reportId,
      period: `${year}-${String(month).padStart(2, '0')}`,
      generatedAt: new Date(),
      status: discrepancies.length === 0 ? 'CLEAN' : 'DISCREPANCIES_FOUND',
      localEmployeeCount: period.entries.length,
      sagaEmployeeCount: sagaEmployees.length,
      matchedRecords: period.entries.length - discrepancies.filter(d => d.status !== ReconciliationStatus.MATCHED).length,
      discrepancies,
      recommendations,
    };

    this.reconciliationReports.set(reportId, report);
    return report;
  }

  async getReconciliationReport(reportId: string): Promise<ReconciliationReport> {
    const report = this.reconciliationReports.get(reportId);
    if (!report) {
      throw new NotFoundException(`Reconciliation report ${reportId} not found`);
    }
    return report;
  }

  // ===== SYNC HISTORY =====

  async getSyncHistory(limit: number = 20): Promise<SyncResult[]> {
    return Array.from(this.syncHistory.values())
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit);
  }

  async getSyncResult(syncId: string): Promise<SyncResult> {
    const result = this.syncHistory.get(syncId);
    if (!result) {
      throw new NotFoundException(`Sync result ${syncId} not found`);
    }
    return result;
  }

  // ===== HELPERS =====

  private calculatePayrollTotals(entries: PayrollEntry[]): PayrollTotals {
    return {
      totalGross: entries.reduce((sum, e) => sum + e.grossSalary, 0),
      totalNet: entries.reduce((sum, e) => sum + e.netSalary, 0),
      totalCas: entries.reduce((sum, e) => sum + e.cas, 0),
      totalCass: entries.reduce((sum, e) => sum + e.cass, 0),
      totalIncomeTax: entries.reduce((sum, e) => sum + e.incomeTax, 0),
      totalCam: entries.reduce((sum, e) => sum + e.cam, 0),
      totalDeductions: entries.reduce((sum, e) => sum + e.deductions.reduce((s, d) => s + d.amount, 0), 0),
      totalBonuses: entries.reduce((sum, e) => sum + e.bonuses.reduce((s, b) => s + b.amount, 0), 0),
      employeeCount: entries.length,
    };
  }

  private getWorkingDaysInMonth(year: number, month: number): number {
    const date = new Date(year, month - 1, 1);
    let workingDays = 0;

    while (date.getMonth() === month - 1) {
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
      date.setDate(date.getDate() + 1);
    }

    return workingDays;
  }

  private generateD112Xml(period: PayrollPeriod): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<D112 xmlns="urn:ro:anaf:d112:v1">
  <Header>
    <FormType>D112</FormType>
    <Period>${period.year}-${String(period.month).padStart(2, '0')}</Period>
    <GeneratedAt>${new Date().toISOString()}</GeneratedAt>
  </Header>
  <Summary>
    <TotalEmployees>${period.totals.employeeCount}</TotalEmployees>
    <TotalGrossSalaries>${period.totals.totalGross.toFixed(2)}</TotalGrossSalaries>
    <TotalCAS>${period.totals.totalCas.toFixed(2)}</TotalCAS>
    <TotalCASS>${period.totals.totalCass.toFixed(2)}</TotalCASS>
    <TotalIncomeTax>${period.totals.totalIncomeTax.toFixed(2)}</TotalIncomeTax>
    <TotalCAM>${period.totals.totalCam.toFixed(2)}</TotalCAM>
  </Summary>
  <Employees>
    ${period.entries.map(e => `
    <Employee>
      <CNP>${e.cnp}</CNP>
      <Name>${e.employeeName}</Name>
      <GrossSalary>${e.grossSalary.toFixed(2)}</GrossSalary>
      <CAS>${e.cas.toFixed(2)}</CAS>
      <CASS>${e.cass.toFixed(2)}</CASS>
      <IncomeTax>${e.incomeTax.toFixed(2)}</IncomeTax>
      <NetSalary>${e.netSalary.toFixed(2)}</NetSalary>
      <WorkedDays>${e.workedDays}</WorkedDays>
    </Employee>`).join('')}
  </Employees>
</D112>`;
  }

  private async fetchSagaEmployees(): Promise<SagaEmployee[]> {
    // In real implementation, this would call SAGA API
    // For now, return mock data based on local employees
    try {
      const employees = await this.prisma.employee.findMany({
        where: { status: 'ACTIVE' },
        take: 10,
      });

      return employees.map(emp => ({
        sagaId: `SAGA-${emp.id}`,
        cnp: emp.cnp || '',
        firstName: emp.firstName,
        lastName: emp.lastName,
        hireDate: emp.hireDate.toISOString().split('T')[0],
        position: emp.position,
        department: emp.department || 'General',
        salary: emp.salary ? Number(emp.salary) : this.MINIMUM_WAGE,
        contractType: emp.contractType || 'FULL_TIME',
        workHours: 8,
      }));
    } catch {
      return [];
    }
  }

  // ===== CONNECTION STATUS =====

  async getConnectionStatus(): Promise<{
    connected: boolean;
    lastSync: Date | null;
    pendingChanges: number;
    apiVersion: string;
  }> {
    const sagaStatus = await this.sagaService.getConnectionStatus();
    const lastSync = Array.from(this.syncHistory.values())
      .filter(s => s.status === SyncStatus.COMPLETED)
      .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0))[0];

    return {
      connected: sagaStatus.connected,
      lastSync: lastSync?.completedAt || null,
      pendingChanges: this.salaryChangeQueue.length,
      apiVersion: sagaStatus.apiVersion,
    };
  }
}
