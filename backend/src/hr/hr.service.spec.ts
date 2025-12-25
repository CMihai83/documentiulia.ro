import { Test, TestingModule } from '@nestjs/testing';
import { HrService } from './hr.service';
import { PrismaService } from '../prisma/prisma.service';

describe('HrService', () => {
  let service: HrService;
  let prisma: PrismaService;

  const mockPrismaService = {
    employee: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    payroll: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    timesheet: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    deliveryRoute: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HrService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<HrService>(HrService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  // Helper functions
  const createMockEmployee = (overrides: any = {}) => ({
    id: 'emp-001',
    userId: 'user-001',
    firstName: 'Ion',
    lastName: 'Popescu',
    cnp: '1800101080016',
    email: 'ion@test.ro',
    position: 'Software Developer',
    department: 'IT',
    salary: 8000,
    status: 'ACTIVE',
    hireDate: new Date('2024-01-15'),
    ...overrides,
  });

  const createMockPayroll = (overrides: any = {}) => ({
    id: 'pay-001',
    employeeId: 'emp-001',
    period: '2025-01',
    grossSalary: 8000,
    netSalary: 5200,
    taxes: 650,
    contributions: 2800,
    status: 'PENDING',
    ...overrides,
  });

  const createMockTimesheet = (overrides: any = {}) => ({
    id: 'ts-001',
    employeeId: 'emp-001',
    date: new Date('2025-01-15'),
    startTime: new Date('2025-01-15T08:00:00'),
    endTime: new Date('2025-01-15T17:00:00'),
    breakMinutes: 60,
    workedHours: 8,
    status: 'PENDING',
    ...overrides,
  });

  describe('Constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  // =================== EMPLOYEE OPERATIONS ===================

  describe('getStats', () => {
    const userId = 'user-001';

    it('should return HR statistics', async () => {
      const employees = [
        createMockEmployee({ salary: 8000, status: 'ACTIVE' }),
        createMockEmployee({ id: 'emp-002', salary: 6000, status: 'ACTIVE' }),
        createMockEmployee({ id: 'emp-003', salary: 10000, status: 'INACTIVE' }),
      ];
      mockPrismaService.employee.findMany.mockResolvedValue(employees);
      mockPrismaService.payroll.findMany.mockResolvedValue([]);

      const result = await service.getStats(userId);

      expect(result).toMatchObject({
        totalEmployees: 3,
        activeContracts: 2,
        monthlyPayroll: 24000,
        avgSalary: 8000,
      });
    });

    it('should handle no employees', async () => {
      mockPrismaService.employee.findMany.mockResolvedValue([]);
      mockPrismaService.payroll.findMany.mockResolvedValue([]);

      const result = await service.getStats(userId);

      expect(result.totalEmployees).toBe(0);
      expect(result.avgSalary).toBe(0);
    });

    it('should handle null salaries', async () => {
      const employees = [
        createMockEmployee({ salary: null }),
        createMockEmployee({ id: 'emp-002', salary: 5000 }),
      ];
      mockPrismaService.employee.findMany.mockResolvedValue(employees);
      mockPrismaService.payroll.findMany.mockResolvedValue([]);

      const result = await service.getStats(userId);

      expect(result.monthlyPayroll).toBe(5000);
    });
  });

  describe('createEmployee', () => {
    const userId = 'user-001';
    const employeeData = {
      firstName: 'Maria',
      lastName: 'Ionescu',
      email: 'maria@test.ro',
      position: 'Accountant',
      salary: 7000,
    };

    it('should create an employee', async () => {
      mockPrismaService.employee.create.mockResolvedValue({
        id: 'new-emp',
        userId,
        ...employeeData,
      });

      const result = await service.createEmployee(userId, employeeData);

      expect(result.id).toBe('new-emp');
      expect(mockPrismaService.employee.create).toHaveBeenCalledWith({
        data: { userId, ...employeeData },
      });
    });
  });

  describe('getEmployees', () => {
    const userId = 'user-001';

    it('should return all employees for user', async () => {
      const employees = [
        createMockEmployee(),
        createMockEmployee({ id: 'emp-002' }),
      ];
      mockPrismaService.employee.findMany.mockResolvedValue(employees);

      const result = await service.getEmployees(userId);

      expect(result).toHaveLength(2);
      expect(mockPrismaService.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
          orderBy: { firstName: 'asc' },
        }),
      );
    });

    it('should filter by department', async () => {
      mockPrismaService.employee.findMany.mockResolvedValue([]);

      await service.getEmployees(userId, 'IT');

      expect(mockPrismaService.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId, department: 'IT' },
        }),
      );
    });

    it('should include recent payrolls', async () => {
      mockPrismaService.employee.findMany.mockResolvedValue([]);

      await service.getEmployees(userId);

      expect(mockPrismaService.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            payrolls: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe('getEmployee', () => {
    it('should return employee by id', async () => {
      const employee = createMockEmployee({ payrolls: [] });
      mockPrismaService.employee.findUnique.mockResolvedValue(employee);

      const result = await service.getEmployee('emp-001');

      expect(result?.id).toBe('emp-001');
      expect(mockPrismaService.employee.findUnique).toHaveBeenCalledWith({
        where: { id: 'emp-001' },
        include: { payrolls: { orderBy: { period: 'desc' } } },
      });
    });

    it('should return null if not found', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(null);

      const result = await service.getEmployee('not-found');

      expect(result).toBeNull();
    });
  });

  describe('updateEmployee', () => {
    it('should update employee', async () => {
      const updateData = { salary: 9000 };
      mockPrismaService.employee.update.mockResolvedValue({
        ...createMockEmployee(),
        ...updateData,
      });

      const result = await service.updateEmployee('emp-001', updateData);

      expect(result.salary).toBe(9000);
      expect(mockPrismaService.employee.update).toHaveBeenCalledWith({
        where: { id: 'emp-001' },
        data: updateData,
      });
    });
  });

  describe('deleteEmployee', () => {
    it('should delete employee and payrolls (GDPR)', async () => {
      mockPrismaService.payroll.deleteMany.mockResolvedValue({ count: 5 });
      mockPrismaService.employee.delete.mockResolvedValue(createMockEmployee());

      const result = await service.deleteEmployee('emp-001');

      expect(result.success).toBe(true);
      expect(result.message).toContain('deleted permanently');
      expect(mockPrismaService.payroll.deleteMany).toHaveBeenCalledWith({
        where: { employeeId: 'emp-001' },
      });
      expect(mockPrismaService.employee.delete).toHaveBeenCalledWith({
        where: { id: 'emp-001' },
      });
    });
  });

  // =================== PAYROLL OPERATIONS ===================

  describe('generatePayroll', () => {
    it('should generate payroll with Romanian tax calculations', async () => {
      const employee = createMockEmployee({ salary: 10000 });
      mockPrismaService.employee.findUnique.mockResolvedValue(employee);
      mockPrismaService.payroll.create.mockImplementation(({ data }) => ({
        id: 'new-payroll',
        ...data,
      }));

      const result = await service.generatePayroll('emp-001', '2025-01');

      // CAS = 10000 * 0.25 = 2500
      // CASS = 10000 * 0.10 = 1000
      // Income Tax = (10000 - 2500 - 1000) * 0.10 = 650
      // Net = 10000 - 2500 - 1000 - 650 = 5850

      expect(mockPrismaService.payroll.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          employeeId: 'emp-001',
          period: '2025-01',
          grossSalary: 10000,
          netSalary: 5850,
          taxes: 650,
          contributions: 3500, // CAS + CASS
          status: 'PENDING',
        }),
      });
    });

    it('should throw error if employee not found', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(null);

      await expect(service.generatePayroll('not-found', '2025-01')).rejects.toThrow(
        'Employee not found',
      );
    });

    it('should calculate CAS at 25%', async () => {
      const employee = createMockEmployee({ salary: 8000 });
      mockPrismaService.employee.findUnique.mockResolvedValue(employee);
      mockPrismaService.payroll.create.mockImplementation(({ data }) => data);

      await service.generatePayroll('emp-001', '2025-01');

      // CAS = 8000 * 0.25 = 2000
      // CASS = 8000 * 0.10 = 800
      // Total contributions = 2800
      expect(mockPrismaService.payroll.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          contributions: 2800,
        }),
      });
    });

    it('should calculate income tax at 10% after deductions', async () => {
      const employee = createMockEmployee({ salary: 5000 });
      mockPrismaService.employee.findUnique.mockResolvedValue(employee);
      mockPrismaService.payroll.create.mockImplementation(({ data }) => data);

      await service.generatePayroll('emp-001', '2025-01');

      // CAS = 5000 * 0.25 = 1250
      // CASS = 5000 * 0.10 = 500
      // Taxable = 5000 - 1250 - 500 = 3250
      // Income Tax = 3250 * 0.10 = 325
      expect(mockPrismaService.payroll.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          taxes: 325,
        }),
      });
    });
  });

  describe('processPayrollForPeriod', () => {
    const userId = 'user-001';

    it('should process payroll for all active employees', async () => {
      const employees = [
        createMockEmployee({ id: 'emp-001', salary: 5000, status: 'ACTIVE' }),
        createMockEmployee({ id: 'emp-002', salary: 6000, status: 'ACTIVE' }),
      ];
      mockPrismaService.employee.findMany.mockResolvedValue(employees);
      mockPrismaService.employee.findUnique
        .mockResolvedValueOnce(employees[0])
        .mockResolvedValueOnce(employees[1]);
      mockPrismaService.payroll.create.mockImplementation(({ data }) => ({
        id: `pay-${data.employeeId}`,
        ...data,
      }));

      const result = await service.processPayrollForPeriod(userId, '2025-01');

      expect(result.processed).toBe(2);
      expect(result.period).toBe('2025-01');
      expect(result.payrolls).toHaveLength(2);
    });

    it('should only process ACTIVE employees', async () => {
      mockPrismaService.employee.findMany.mockResolvedValue([]);

      await service.processPayrollForPeriod(userId, '2025-01');

      expect(mockPrismaService.employee.findMany).toHaveBeenCalledWith({
        where: { userId, status: 'ACTIVE' },
      });
    });
  });

  describe('getPayrollHistory', () => {
    const userId = 'user-001';

    it('should return payroll history', async () => {
      const payrolls = [
        createMockPayroll({ period: '2025-01' }),
        createMockPayroll({ id: 'pay-002', period: '2024-12' }),
      ];
      mockPrismaService.payroll.findMany.mockResolvedValue(payrolls);

      const result = await service.getPayrollHistory(userId);

      expect(result).toHaveLength(2);
    });

    it('should filter by period', async () => {
      mockPrismaService.payroll.findMany.mockResolvedValue([]);

      await service.getPayrollHistory(userId, '2025-01');

      expect(mockPrismaService.payroll.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            period: '2025-01',
          }),
        }),
      );
    });
  });

  describe('updatePayrollStatus', () => {
    it('should update payroll status', async () => {
      mockPrismaService.payroll.update.mockResolvedValue({
        ...createMockPayroll(),
        status: 'PAID',
      });

      const result = await service.updatePayrollStatus('pay-001', 'PAID');

      expect(result.status).toBe('PAID');
      expect(mockPrismaService.payroll.update).toHaveBeenCalledWith({
        where: { id: 'pay-001' },
        data: { status: 'PAID' },
      });
    });
  });

  describe('downloadPayslip', () => {
    it('should return payslip data', async () => {
      const payroll = {
        ...createMockPayroll(),
        employee: createMockEmployee(),
      };
      mockPrismaService.payroll.findUnique.mockResolvedValue(payroll);

      const result = await service.downloadPayslip('pay-001');

      expect(result.filename).toContain('payslip');
      expect(result.filename).toContain('Ion');
      expect(result.filename).toContain('Popescu');
      expect(result.filename).toContain('2025-01');
      expect(result.contentType).toBe('application/pdf');
    });

    it('should throw error if payroll not found', async () => {
      mockPrismaService.payroll.findUnique.mockResolvedValue(null);

      await expect(service.downloadPayslip('not-found')).rejects.toThrow(
        'Payroll not found',
      );
    });
  });

  describe('getDepartments', () => {
    it('should return unique departments', async () => {
      mockPrismaService.employee.findMany.mockResolvedValue([
        { department: 'IT' },
        { department: 'HR' },
        { department: 'Finance' },
      ]);

      const result = await service.getDepartments('user-001');

      expect(result).toEqual(['IT', 'HR', 'Finance']);
    });

    it('should filter out null departments', async () => {
      mockPrismaService.employee.findMany.mockResolvedValue([
        { department: 'IT' },
        { department: null },
        { department: '' },
      ]);

      const result = await service.getDepartments('user-001');

      expect(result).toEqual(['IT']);
    });
  });

  // =================== TIMESHEET OPERATIONS ===================

  describe('createTimesheet', () => {
    it('should create timesheet with calculated hours', async () => {
      mockPrismaService.timesheet.create.mockImplementation(({ data }) => ({
        id: 'new-ts',
        ...data,
        employee: { id: 'emp-001', firstName: 'Ion', lastName: 'Popescu' },
      }));

      const result = await service.createTimesheet({
        employeeId: 'emp-001',
        date: new Date('2025-01-15'),
        startTime: new Date('2025-01-15T08:00:00'),
        endTime: new Date('2025-01-15T17:00:00'),
        breakMinutes: 60,
      });

      // 9 hours - 1 hour break = 8 hours
      expect(mockPrismaService.timesheet.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          employeeId: 'emp-001',
          workedHours: 8,
          breakMinutes: 60,
          status: 'PENDING',
        }),
        include: expect.any(Object),
      });
    });

    it('should default breakMinutes to 0', async () => {
      mockPrismaService.timesheet.create.mockImplementation(({ data }) => ({
        id: 'new-ts',
        ...data,
      }));

      await service.createTimesheet({
        employeeId: 'emp-001',
        date: new Date('2025-01-15'),
        startTime: new Date('2025-01-15T08:00:00'),
        endTime: new Date('2025-01-15T16:00:00'),
      });

      // 8 hours - 0 break = 8 hours
      expect(mockPrismaService.timesheet.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workedHours: 8,
          breakMinutes: 0,
        }),
        include: expect.any(Object),
      });
    });

    it('should include routeId and notes', async () => {
      mockPrismaService.timesheet.create.mockImplementation(({ data }) => ({
        id: 'new-ts',
        ...data,
      }));

      await service.createTimesheet({
        employeeId: 'emp-001',
        date: new Date('2025-01-15'),
        startTime: new Date('2025-01-15T08:00:00'),
        endTime: new Date('2025-01-15T16:00:00'),
        routeId: 'route-001',
        notes: 'Test note',
      });

      expect(mockPrismaService.timesheet.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          routeId: 'route-001',
          notes: 'Test note',
        }),
        include: expect.any(Object),
      });
    });
  });

  describe('getEmployeeTimesheets', () => {
    it('should return employee timesheets', async () => {
      const timesheets = [createMockTimesheet()];
      mockPrismaService.timesheet.findMany.mockResolvedValue(timesheets);

      const result = await service.getEmployeeTimesheets('emp-001');

      expect(result).toHaveLength(1);
    });

    it('should filter by date range', async () => {
      mockPrismaService.timesheet.findMany.mockResolvedValue([]);

      await service.getEmployeeTimesheets('emp-001', {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      });

      expect(mockPrismaService.timesheet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrismaService.timesheet.findMany.mockResolvedValue([]);

      await service.getEmployeeTimesheets('emp-001', { status: 'APPROVED' });

      expect(mockPrismaService.timesheet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'APPROVED',
          }),
        }),
      );
    });
  });

  describe('getAllTimesheets', () => {
    const userId = 'user-001';

    it('should return all timesheets for user', async () => {
      mockPrismaService.timesheet.findMany.mockResolvedValue([]);

      await service.getAllTimesheets(userId);

      expect(mockPrismaService.timesheet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { employee: { userId } },
        }),
      );
    });

    it('should filter by date', async () => {
      mockPrismaService.timesheet.findMany.mockResolvedValue([]);

      await service.getAllTimesheets(userId, { date: new Date('2025-01-15') });

      expect(mockPrismaService.timesheet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('approveTimesheet', () => {
    it('should approve timesheet', async () => {
      mockPrismaService.timesheet.update.mockResolvedValue({
        ...createMockTimesheet(),
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: 'manager-001',
      });

      const result = await service.approveTimesheet('ts-001', 'manager-001');

      expect(mockPrismaService.timesheet.update).toHaveBeenCalledWith({
        where: { id: 'ts-001' },
        data: {
          status: 'APPROVED',
          approvedAt: expect.any(Date),
          approvedBy: 'manager-001',
        },
      });
    });
  });

  describe('rejectTimesheet', () => {
    it('should reject timesheet with reason', async () => {
      mockPrismaService.timesheet.update.mockResolvedValue({
        ...createMockTimesheet(),
        status: 'REJECTED',
        notes: 'Incomplete data',
      });

      await service.rejectTimesheet('ts-001', 'manager-001', 'Incomplete data');

      expect(mockPrismaService.timesheet.update).toHaveBeenCalledWith({
        where: { id: 'ts-001' },
        data: {
          status: 'REJECTED',
          notes: 'Incomplete data',
        },
      });
    });
  });

  describe('updateTimesheet', () => {
    it('should update timesheet and recalculate hours', async () => {
      mockPrismaService.timesheet.findUnique.mockResolvedValue(createMockTimesheet());
      mockPrismaService.timesheet.update.mockImplementation(({ data }) => ({
        id: 'ts-001',
        ...data,
      }));

      await service.updateTimesheet('ts-001', {
        startTime: new Date('2025-01-15T07:00:00'),
        endTime: new Date('2025-01-15T18:00:00'),
        breakMinutes: 30,
      });

      // 11 hours - 0.5 hour = 10.5 hours
      expect(mockPrismaService.timesheet.update).toHaveBeenCalledWith({
        where: { id: 'ts-001' },
        data: expect.objectContaining({
          workedHours: 10.5,
          status: 'PENDING', // Reset on edit
        }),
      });
    });

    it('should throw error if timesheet not found', async () => {
      mockPrismaService.timesheet.findUnique.mockResolvedValue(null);

      await expect(
        service.updateTimesheet('not-found', { breakMinutes: 30 }),
      ).rejects.toThrow('Timesheet not found');
    });
  });

  describe('getTimesheetSummary', () => {
    const userId = 'user-001';

    it('should return summary for period', async () => {
      const timesheets = [
        {
          ...createMockTimesheet(),
          employeeId: 'emp-001',
          workedHours: 8,
          date: new Date('2025-01-15'),
          employee: { id: 'emp-001', firstName: 'Ion', lastName: 'Popescu', salary: 8000 },
        },
        {
          ...createMockTimesheet({ id: 'ts-002' }),
          employeeId: 'emp-001',
          workedHours: 8,
          date: new Date('2025-01-16'),
          employee: { id: 'emp-001', firstName: 'Ion', lastName: 'Popescu', salary: 8000 },
        },
      ];
      mockPrismaService.timesheet.findMany.mockResolvedValue(timesheets);

      const result = await service.getTimesheetSummary(userId, '2025-01');

      expect(result.period).toBe('2025-01');
      expect(result.employees).toHaveLength(1);
      expect(result.employees[0].totalHours).toBe(16);
      expect(result.employees[0].daysWorked).toBe(2);
      expect(result.totalHours).toBe(16);
    });

    it('should only include APPROVED timesheets', async () => {
      mockPrismaService.timesheet.findMany.mockResolvedValue([]);

      await service.getTimesheetSummary(userId, '2025-01');

      expect(mockPrismaService.timesheet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'APPROVED',
          }),
        }),
      );
    });
  });

  // =================== CONTRACT TEMPLATES ===================

  describe('getContractTypes', () => {
    it('should return available contract types', () => {
      const types = service.getContractTypes();

      expect(types).toContainEqual(
        expect.objectContaining({ code: 'CIM_NEDETERMINAT' }),
      );
      expect(types).toContainEqual(
        expect.objectContaining({ code: 'CIM_DETERMINAT' }),
      );
      expect(types).toContainEqual(
        expect.objectContaining({ code: 'CIM_TIMP_PARTIAL' }),
      );
      expect(types).toContainEqual(
        expect.objectContaining({ code: 'CONVENTIE_CIVILA' }),
      );
      expect(types).toContainEqual(
        expect.objectContaining({ code: 'ACT_ADITIONAL' }),
      );
    });

    it('should include names and descriptions', () => {
      const types = service.getContractTypes();

      types.forEach((type) => {
        expect(type.name).toBeDefined();
        expect(type.description).toBeDefined();
      });
    });
  });

  describe('generateContract', () => {
    const userId = 'user-001';
    const employeeId = 'emp-001';

    beforeEach(() => {
      mockPrismaService.employee.findFirst.mockResolvedValue(createMockEmployee());
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        name: 'Test Manager',
        company: 'Test SRL',
        cui: 'RO12345678',
        address: 'Str. Test 1',
      });
    });

    it('should generate CIM nedeterminat', async () => {
      const result = await service.generateContract(userId, employeeId, {
        templateType: 'CIM_NEDETERMINAT',
      });

      expect(result.contract.type).toBe('CIM_NEDETERMINAT');
      expect(result.contract.content).toContain('durată nedeterminată');
      expect(result.contract.registrationNumber).toContain('CIM-');
    });

    it('should generate CIM determinat with end date', async () => {
      const result = await service.generateContract(userId, employeeId, {
        templateType: 'CIM_DETERMINAT',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-06-30'),
      });

      expect(result.contract.type).toBe('CIM_DETERMINAT');
      expect(result.contract.content).toContain('durată determinată');
      expect(result.contract.validTo).toEqual(new Date('2025-06-30'));
    });

    it('should throw error for CIM determinat without end date', async () => {
      await expect(
        service.generateContract(userId, employeeId, {
          templateType: 'CIM_DETERMINAT',
        }),
      ).rejects.toThrow('Data de sfârșit este obligatorie');
    });

    it('should generate CIM timp partial', async () => {
      mockPrismaService.employee.findFirst.mockResolvedValue(
        createMockEmployee({ hoursPerDay: 4 }),
      );

      const result = await service.generateContract(userId, employeeId, {
        templateType: 'CIM_TIMP_PARTIAL',
      });

      expect(result.contract.type).toBe('CIM_TIMP_PARTIAL');
      expect(result.contract.content).toContain('timp parțial');
    });

    it('should generate Conventie Civila', async () => {
      const result = await service.generateContract(userId, employeeId, {
        templateType: 'CONVENTIE_CIVILA',
      });

      expect(result.contract.type).toBe('CONVENTIE_CIVILA');
      expect(result.contract.content).toContain('PRESTĂRI SERVICII');
    });

    it('should generate Act Aditional with changes', async () => {
      const result = await service.generateContract(userId, employeeId, {
        templateType: 'ACT_ADITIONAL',
        changes: [
          { field: 'salary', oldValue: '8000', newValue: '9000' },
        ],
      });

      expect(result.contract.type).toBe('ACT_ADITIONAL');
      expect(result.contract.content).toContain('ACT ADIȚIONAL');
      expect(result.contract.content).toContain('Salariul');
    });

    it('should throw error for Act Aditional without changes', async () => {
      await expect(
        service.generateContract(userId, employeeId, {
          templateType: 'ACT_ADITIONAL',
        }),
      ).rejects.toThrow('Modificările sunt obligatorii');
    });

    it('should throw error if employee not found', async () => {
      mockPrismaService.employee.findFirst.mockResolvedValue(null);

      await expect(
        service.generateContract(userId, employeeId, {
          templateType: 'CIM_NEDETERMINAT',
        }),
      ).rejects.toThrow('Angajatul nu a fost găsit');
    });

    it('should throw error for invalid template type', async () => {
      await expect(
        service.generateContract(userId, employeeId, {
          templateType: 'INVALID_TYPE',
        }),
      ).rejects.toThrow('Tip contract invalid');
    });

    it('should include warnings for missing data', async () => {
      mockPrismaService.employee.findFirst.mockResolvedValue(
        createMockEmployee({ cnp: null }),
      );

      const result = await service.generateContract(userId, employeeId, {
        templateType: 'CIM_NEDETERMINAT',
      });

      expect(result.warnings).toContainEqual(
        expect.stringContaining('CNP'),
      );
    });

    it('should include additional clauses', async () => {
      const result = await service.generateContract(userId, employeeId, {
        templateType: 'CIM_NEDETERMINAT',
        additionalClauses: ['Clauză de confidențialitate', 'Clauză de neconcurență'],
      });

      expect(result.contract.content).toContain('Clauză de confidențialitate');
      expect(result.contract.content).toContain('Clauză de neconcurență');
    });
  });

  describe('detectContractChanges', () => {
    it('should detect salary changes', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(
        createMockEmployee({ salary: 8000 }),
      );

      const result = await service.detectContractChanges('emp-001', {
        salary: 9000,
      });

      expect(result.hasChanges).toBe(true);
      expect(result.changes).toContainEqual({
        field: 'salary',
        oldValue: '8000',
        newValue: '9000',
      });
      expect(result.suggestActAditional).toBe(true);
    });

    it('should detect position changes', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(
        createMockEmployee({ position: 'Junior Developer' }),
      );

      const result = await service.detectContractChanges('emp-001', {
        position: 'Senior Developer',
      });

      expect(result.hasChanges).toBe(true);
      expect(result.changes).toContainEqual({
        field: 'position',
        oldValue: 'Junior Developer',
        newValue: 'Senior Developer',
      });
    });

    it('should not flag non-contract field changes', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(createMockEmployee());

      const result = await service.detectContractChanges('emp-001', {
        email: 'new@email.com',
      });

      expect(result.hasChanges).toBe(false);
      expect(result.suggestActAditional).toBe(false);
    });

    it('should throw error if employee not found', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(null);

      await expect(
        service.detectContractChanges('not-found', { salary: 9000 }),
      ).rejects.toThrow('Angajatul nu a fost găsit');
    });
  });

  // =================== ROUTE INTEGRATION ===================

  describe('createTimesheetsFromRoutes', () => {
    const userId = 'user-001';
    const date = new Date('2025-01-15');

    it('should create timesheets from completed routes', async () => {
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([
        {
          id: 'route-001',
          driverId: 'driver-001',
          actualStartTime: new Date('2025-01-15T08:00:00'),
          actualEndTime: new Date('2025-01-15T17:00:00'),
          routeName: 'Morning Route',
          driver: { firstName: 'Ion', lastName: 'Popescu' },
        },
      ]);
      mockPrismaService.employee.findFirst.mockResolvedValue(createMockEmployee());
      mockPrismaService.timesheet.create.mockImplementation(({ data }) => ({
        id: 'new-ts',
        ...data,
      }));

      const result = await service.createTimesheetsFromRoutes(userId, date);

      expect(result.created).toBe(1);
      expect(mockPrismaService.timesheet.create).toHaveBeenCalled();
    });

    it('should skip routes without driver', async () => {
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([
        {
          id: 'route-001',
          driverId: null,
          actualStartTime: new Date(),
          actualEndTime: new Date(),
        },
      ]);

      const result = await service.createTimesheetsFromRoutes(userId, date);

      expect(result.created).toBe(0);
    });

    it('should skip routes without actual times', async () => {
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([
        {
          id: 'route-001',
          driverId: 'driver-001',
          actualStartTime: null,
          actualEndTime: null,
          driver: { firstName: 'Ion', lastName: 'Popescu' },
        },
      ]);

      const result = await service.createTimesheetsFromRoutes(userId, date);

      expect(result.created).toBe(0);
    });

    it('should add auto-generated note', async () => {
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([
        {
          id: 'route-001',
          driverId: 'driver-001',
          actualStartTime: new Date('2025-01-15T08:00:00'),
          actualEndTime: new Date('2025-01-15T17:00:00'),
          routeName: 'Test Route',
          driver: { firstName: 'Ion', lastName: 'Popescu' },
        },
      ]);
      mockPrismaService.employee.findFirst.mockResolvedValue(createMockEmployee());
      mockPrismaService.timesheet.create.mockImplementation(({ data }) => ({
        id: 'new-ts',
        ...data,
      }));

      await service.createTimesheetsFromRoutes(userId, date);

      expect(mockPrismaService.timesheet.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          notes: expect.stringContaining('Auto-generated'),
        }),
        include: expect.any(Object),
      });
    });
  });
});
