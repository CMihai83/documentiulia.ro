import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  PayrollSagaService,
  SyncDirection,
  SyncStatus,
  PayrollPeriodStatus,
  D112Status,
  ReconciliationStatus,
} from './payroll-saga.service';
import { PrismaService } from '../prisma/prisma.service';
import { SagaService } from '../saga/saga.service';

describe('PayrollSagaService', () => {
  let service: PayrollSagaService;

  const mockEmployee = {
    id: 'emp-123',
    userId: 'user-123',
    firstName: 'Ion',
    lastName: 'Popescu',
    email: 'ion.popescu@example.com',
    position: 'Software Developer',
    hireDate: new Date('2023-01-15'),
    status: 'ACTIVE',
    department: 'IT Department',
    cnp: '1850101221145',
    salary: 5000,
    contractType: 'FULL_TIME',
    organizationId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    employee: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockSagaService = {
    authenticate: jest.fn().mockResolvedValue('mock-token'),
    syncPayroll: jest.fn().mockResolvedValue({ sagaId: 'saga-123' }),
    validateWithDUK: jest.fn().mockResolvedValue({ valid: true, errors: [] }),
    getConnectionStatus: jest.fn().mockResolvedValue({
      connected: true,
      apiVersion: 'v3.2',
      lastSync: new Date().toISOString(),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollSagaService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SagaService, useValue: mockSagaService },
      ],
    }).compile();

    service = module.get<PayrollSagaService>(PayrollSagaService);

    // Reset mocks
    jest.clearAllMocks();
    mockPrismaService.employee.findMany.mockResolvedValue([mockEmployee]);
    mockPrismaService.employee.findFirst.mockResolvedValue(mockEmployee);
    mockPrismaService.employee.findUnique.mockResolvedValue(mockEmployee);
    mockPrismaService.employee.update.mockResolvedValue(mockEmployee);
  });

  describe('Connection Status', () => {
    it('should get SAGA connection status', async () => {
      const status = await service.getConnectionStatus();

      expect(status.connected).toBe(true);
      expect(status.apiVersion).toBe('v3.2');
      expect(status.pendingChanges).toBe(0);
    });
  });

  describe('Employee Sync - To SAGA', () => {
    it('should sync employees to SAGA', async () => {
      const result = await service.syncEmployeesToSaga();

      expect(result.direction).toBe(SyncDirection.TO_SAGA);
      expect(result.status).toBe(SyncStatus.COMPLETED);
      expect(result.recordsProcessed).toBe(1);
      expect(result.recordsSucceeded).toBe(1);
      expect(result.recordsFailed).toBe(0);
    });

    it('should handle sync errors gracefully', async () => {
      mockSagaService.syncPayroll.mockRejectedValueOnce(new Error('SAGA error'));

      const result = await service.syncEmployeesToSaga();

      expect(result.status).toBe(SyncStatus.FAILED);
      expect(result.recordsFailed).toBe(1);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return PARTIAL status when some syncs fail', async () => {
      mockPrismaService.employee.findMany.mockResolvedValue([
        mockEmployee,
        { ...mockEmployee, id: 'emp-456', cnp: '1850101221146' },
      ]);
      mockSagaService.syncPayroll
        .mockResolvedValueOnce({ sagaId: 'saga-123' })
        .mockRejectedValueOnce(new Error('SAGA error'));

      const result = await service.syncEmployeesToSaga();

      expect(result.status).toBe(SyncStatus.PARTIAL);
      expect(result.recordsSucceeded).toBe(1);
      expect(result.recordsFailed).toBe(1);
    });

    it('should filter by organizationId', async () => {
      await service.syncEmployeesToSaga('org-123');

      expect(mockPrismaService.employee.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE', organizationId: 'org-123' },
      });
    });
  });

  describe('Employee Sync - From SAGA', () => {
    it('should sync employees from SAGA', async () => {
      const result = await service.syncEmployeesFromSaga();

      expect(result.direction).toBe(SyncDirection.FROM_SAGA);
      expect(result.status).toBe(SyncStatus.COMPLETED);
    });

    it('should detect salary differences', async () => {
      // Mock SAGA employee with different salary
      const sagaEmployee = { ...mockEmployee, salary: 6000 };
      mockPrismaService.employee.findMany.mockResolvedValue([sagaEmployee]);

      const result = await service.syncEmployeesFromSaga();

      expect(result.changes.some(c => c.field === 'salary')).toBe(true);
    });
  });

  describe('Bidirectional Sync', () => {
    it('should perform bidirectional sync', async () => {
      const result = await service.bidirectionalSync();

      expect(result.direction).toBe(SyncDirection.BIDIRECTIONAL);
      expect(result.recordsProcessed).toBeGreaterThan(0);
    });
  });

  describe('Salary Changes', () => {
    it('should push salary change to SAGA', async () => {
      const event = {
        employeeId: 'emp-123',
        oldSalary: 5000,
        newSalary: 6000,
        effectiveDate: '2025-02-01',
        reason: 'Annual review',
      };

      const result = await service.pushSalaryChange(event);

      expect(result.status).toBe(SyncStatus.COMPLETED);
      expect(result.changes[0].field).toBe('salary');
      expect(result.changes[0].oldValue).toBe(5000);
      expect(result.changes[0].newValue).toBe(6000);
    });

    it('should throw if employee not found', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(null);

      const event = {
        employeeId: 'unknown',
        oldSalary: 5000,
        newSalary: 6000,
        effectiveDate: '2025-02-01',
        reason: 'Test',
      };

      await expect(service.pushSalaryChange(event)).rejects.toThrow(NotFoundException);
    });

    it('should queue salary changes', async () => {
      const event = {
        employeeId: 'emp-123',
        oldSalary: 5000,
        newSalary: 6000,
        effectiveDate: '2025-02-01',
        reason: 'Test',
      };

      await service.queueSalaryChange(event);
      const status = await service.getConnectionStatus();

      expect(status.pendingChanges).toBe(1);
    });

    it('should process salary change queue', async () => {
      const event = {
        employeeId: 'emp-123',
        oldSalary: 5000,
        newSalary: 6000,
        effectiveDate: '2025-02-01',
        reason: 'Test',
      };

      await service.queueSalaryChange(event);
      const results = await service.processSalaryChangeQueue();

      expect(results.length).toBe(1);
      expect(results[0].status).toBe(SyncStatus.COMPLETED);
    });
  });

  describe('Payroll Periods', () => {
    it('should create payroll period', async () => {
      const period = await service.createPayrollPeriod(2025, 1);

      expect(period.year).toBe(2025);
      expect(period.month).toBe(1);
      expect(period.status).toBe(PayrollPeriodStatus.DRAFT);
      expect(period.entries.length).toBe(1);
      expect(period.d112Status).toBe(D112Status.NOT_STARTED);
    });

    it('should calculate Romanian tax deductions correctly', async () => {
      const period = await service.createPayrollPeriod(2025, 2);

      const entry = period.entries[0];
      const grossSalary = entry.grossSalary;

      // CAS 25%
      expect(entry.cas).toBeCloseTo(grossSalary * 0.25, 2);
      // CASS 10%
      expect(entry.cass).toBeCloseTo(grossSalary * 0.10, 2);
      // Net = Gross - CAS - CASS - Income Tax
      expect(entry.netSalary).toBeLessThan(grossSalary);
    });

    it('should get existing payroll period', async () => {
      await service.createPayrollPeriod(2025, 3);
      const period = await service.getPayrollPeriod(2025, 3);

      expect(period.year).toBe(2025);
      expect(period.month).toBe(3);
    });

    it('should throw for non-existent payroll period', async () => {
      await expect(service.getPayrollPeriod(2099, 12)).rejects.toThrow(NotFoundException);
    });

    it('should not allow duplicate payroll periods', async () => {
      await service.createPayrollPeriod(2025, 4);

      await expect(service.createPayrollPeriod(2025, 4)).rejects.toThrow(BadRequestException);
    });

    it('should calculate payroll', async () => {
      await service.createPayrollPeriod(2025, 5);
      const calculated = await service.calculatePayroll(2025, 5);

      expect(calculated.status).toBe(PayrollPeriodStatus.CALCULATED);
      expect(calculated.totals.employeeCount).toBe(1);
    });

    it('should approve payroll', async () => {
      await service.createPayrollPeriod(2025, 6);
      await service.calculatePayroll(2025, 6);
      const approved = await service.approvePayroll(2025, 6, 'admin@example.com');

      expect(approved.status).toBe(PayrollPeriodStatus.APPROVED);
    });

    it('should not approve non-calculated payroll', async () => {
      await service.createPayrollPeriod(2025, 7);

      await expect(service.approvePayroll(2025, 7, 'admin@example.com')).rejects.toThrow(BadRequestException);
    });

    it('should sync payroll to SAGA', async () => {
      await service.createPayrollPeriod(2025, 8);
      await service.calculatePayroll(2025, 8);
      await service.approvePayroll(2025, 8, 'admin@example.com');

      const result = await service.syncPayrollToSaga(2025, 8);

      expect(result.status).toBe(SyncStatus.COMPLETED);

      const period = await service.getPayrollPeriod(2025, 8);
      expect(period.status).toBe(PayrollPeriodStatus.SYNCED);
      expect(period.sagaSyncId).toBeDefined();
    });

    it('should not sync non-approved payroll', async () => {
      await service.createPayrollPeriod(2025, 9);
      await service.calculatePayroll(2025, 9);

      await expect(service.syncPayrollToSaga(2025, 9)).rejects.toThrow(BadRequestException);
    });
  });

  describe('D112 Declaration', () => {
    beforeEach(async () => {
      await service.createPayrollPeriod(2025, 10);
      await service.calculatePayroll(2025, 10);
      await service.approvePayroll(2025, 10, 'admin@example.com');
      await service.syncPayrollToSaga(2025, 10);
    });

    it('should generate D112 declaration', async () => {
      const d112 = await service.generateD112(2025, 10);

      expect(d112.status).toBe(D112Status.GENERATED);
      expect(d112.xml).toContain('<?xml version="1.0"');
      expect(d112.xml).toContain('<D112');
      expect(d112.period).toBe('2025-10');
    });

    it('should validate D112 with DUKIntegrator', async () => {
      const d112 = await service.generateD112(2025, 10);
      const validated = await service.validateD112(d112.id);

      expect(validated.status).toBe(D112Status.VALIDATED);
      expect(validated.validationErrors.length).toBe(0);
    });

    it('should handle validation failures', async () => {
      mockSagaService.validateWithDUK.mockResolvedValueOnce({
        valid: false,
        errors: ['Missing required field: TotalEmployees'],
      });

      const d112 = await service.generateD112(2025, 10);
      const validated = await service.validateD112(d112.id);

      expect(validated.status).toBe(D112Status.GENERATED);
      expect(validated.validationErrors.length).toBeGreaterThan(0);
    });

    it('should submit D112 to ANAF', async () => {
      const d112 = await service.generateD112(2025, 10);
      await service.validateD112(d112.id);
      const submitted = await service.submitD112ToAnaf(d112.id);

      expect(submitted.status).toBe(D112Status.SUBMITTED);
      expect(submitted.submittedAt).toBeDefined();
      expect(submitted.anafResponseId).toBeDefined();
    });

    it('should not submit unvalidated D112', async () => {
      const d112 = await service.generateD112(2025, 10);

      await expect(service.submitD112ToAnaf(d112.id)).rejects.toThrow(BadRequestException);
    });

    it('should get D112 status', async () => {
      await service.generateD112(2025, 10);
      const status = await service.getD112Status(2025, 10);

      expect(status).toBeDefined();
      expect(status?.status).toBe(D112Status.GENERATED);
    });

    it('should return null for non-existent D112', async () => {
      const status = await service.getD112Status(2099, 12);

      expect(status).toBeNull();
    });
  });

  describe('SAF-T Payroll Section', () => {
    beforeEach(async () => {
      await service.createPayrollPeriod(2025, 11);
    });

    it('should generate SAF-T payroll section', async () => {
      const section = await service.generateSAFTPayrollSection(2025, 11);

      expect(section.period).toBe('2025-11');
      expect(section.employees.length).toBe(1);
      expect(section.salaryPayments.length).toBe(1);
      expect(section.taxDeclarations.length).toBe(4); // CAS, CASS, Income Tax, CAM
    });

    it('should include all tax types in SAF-T', async () => {
      const section = await service.generateSAFTPayrollSection(2025, 11);
      const taxTypes = section.taxDeclarations.map(t => t.declarationType);

      expect(taxTypes).toContain('CAS');
      expect(taxTypes).toContain('CASS');
      expect(taxTypes).toContain('INCOME_TAX');
      expect(taxTypes).toContain('CAM');
    });

    it('should generate SAF-T XML', async () => {
      const xml = await service.generateSAFTPayrollXml(2025, 11);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<SAFTPayroll');
      expect(xml).toContain('<Employees>');
      expect(xml).toContain('<SalaryPayments>');
      expect(xml).toContain('<TaxDeclarations>');
    });

    it('should include employee CNP in SAF-T', async () => {
      const xml = await service.generateSAFTPayrollXml(2025, 11);

      expect(xml).toContain(`<RegistrationNumber>${mockEmployee.cnp}</RegistrationNumber>`);
    });
  });

  describe('Reconciliation', () => {
    beforeEach(async () => {
      await service.createPayrollPeriod(2025, 12);
    });

    it('should generate reconciliation report', async () => {
      const report = await service.generateReconciliationReport(2025, 12);

      expect(report.period).toBe('2025-12');
      expect(report.localEmployeeCount).toBe(1);
      expect(report.generatedAt).toBeDefined();
    });

    it('should detect clean reconciliation', async () => {
      const report = await service.generateReconciliationReport(2025, 12);

      expect(report.status).toBe('CLEAN');
      expect(report.discrepancies.length).toBe(0);
    });

    it('should detect salary discrepancies', async () => {
      // Simulate SAGA having different salary
      const originalFindMany = mockPrismaService.employee.findMany;
      let callCount = 0;
      mockPrismaService.employee.findMany.mockImplementation(() => {
        callCount++;
        if (callCount > 1) {
          // Return different salary for SAGA fetch
          return Promise.resolve([{ ...mockEmployee, salary: 7000 }]);
        }
        return Promise.resolve([mockEmployee]);
      });

      // Create period with local data
      await service.createPayrollPeriod(2026, 1);

      // Generate reconciliation
      const report = await service.generateReconciliationReport(2026, 1);

      // Should find discrepancy
      expect(report.discrepancies.some(d => d.field === 'salary')).toBe(true);

      mockPrismaService.employee.findMany = originalFindMany;
    });

    it('should provide recommendations for discrepancies', async () => {
      mockPrismaService.employee.findMany.mockResolvedValueOnce([mockEmployee]);
      mockPrismaService.employee.findMany.mockResolvedValueOnce([]);

      await service.createPayrollPeriod(2026, 2);
      const report = await service.generateReconciliationReport(2026, 2);

      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('should get reconciliation report by ID', async () => {
      const created = await service.generateReconciliationReport(2025, 12);
      const fetched = await service.getReconciliationReport(created.id);

      expect(fetched.id).toBe(created.id);
    });

    it('should throw for non-existent report', async () => {
      await expect(service.getReconciliationReport('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Sync History', () => {
    it('should track sync history', async () => {
      await service.syncEmployeesToSaga();
      await service.syncEmployeesFromSaga();

      const history = await service.getSyncHistory();

      expect(history.length).toBe(2);
    });

    it('should limit sync history results', async () => {
      // Each sync creates a unique ID, so multiple syncs create multiple history entries
      await service.syncEmployeesToSaga();
      await service.syncEmployeesFromSaga();
      await service.syncEmployeesToSaga();
      await service.syncEmployeesFromSaga();
      await service.syncEmployeesToSaga();

      const history = await service.getSyncHistory(3);

      // Should limit to 3 results
      expect(history.length).toBeLessThanOrEqual(3);
    });

    it('should get specific sync result', async () => {
      const sync = await service.syncEmployeesToSaga();
      const result = await service.getSyncResult(sync.id);

      expect(result.id).toBe(sync.id);
    });

    it('should throw for non-existent sync result', async () => {
      await expect(service.getSyncResult('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Working Days Calculation', () => {
    it('should calculate working days in January 2025', async () => {
      const period = await service.createPayrollPeriod(2025, 1);

      // January 2025 has 23 working days
      expect(period.entries[0].workingDays).toBe(23);
    });

    it('should calculate working days in February 2025', async () => {
      await service.createPayrollPeriod(2025, 2);
      const period = await service.getPayrollPeriod(2025, 2);

      // February 2025 has 20 working days
      expect(period.entries[0].workingDays).toBe(20);
    });
  });

  describe('Tax Calculations', () => {
    it('should apply correct CAS rate (25%)', async () => {
      const period = await service.createPayrollPeriod(2026, 3);
      const entry = period.entries[0];

      expect(entry.cas).toBeCloseTo(entry.grossSalary * 0.25, 2);
    });

    it('should apply correct CASS rate (10%)', async () => {
      const period = await service.createPayrollPeriod(2026, 4);
      const entry = period.entries[0];

      expect(entry.cass).toBeCloseTo(entry.grossSalary * 0.10, 2);
    });

    it('should calculate CAM (2.25%) for employer', async () => {
      const period = await service.createPayrollPeriod(2026, 5);
      const entry = period.entries[0];

      expect(entry.cam).toBeCloseTo(entry.grossSalary * 0.0225, 2);
    });

    it('should use minimum wage for employees without salary', async () => {
      mockPrismaService.employee.findMany.mockResolvedValue([
        { ...mockEmployee, salary: null },
      ]);

      const period = await service.createPayrollPeriod(2026, 6);

      expect(period.entries[0].grossSalary).toBe(3700); // Minimum wage 2025
    });
  });

  describe('Payroll Totals', () => {
    it('should calculate correct totals', async () => {
      mockPrismaService.employee.findMany.mockResolvedValue([
        mockEmployee,
        { ...mockEmployee, id: 'emp-456', cnp: '1850101221146', salary: 6000 },
      ]);

      const period = await service.createPayrollPeriod(2026, 7);

      expect(period.totals.employeeCount).toBe(2);
      expect(period.totals.totalGross).toBe(5000 + 6000);
    });
  });
});
