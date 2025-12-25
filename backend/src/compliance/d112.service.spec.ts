import { Test, TestingModule } from '@nestjs/testing';
import { D112Service, D112Employee, D112Totals } from './d112.service';
import { PrismaService } from '../prisma/prisma.service';

describe('D112Service', () => {
  let service: D112Service;
  let mockPrismaService: any;

  const userId = 'user-123';
  const period = '2025-01';

  const createMockEmployee = (overrides: Partial<D112Employee> = {}): D112Employee => ({
    cnp: '1900101123456',
    nume: 'Popescu',
    prenume: 'Ion',
    salariuBrut: 5000,
    salariuNet: 3275, // 5000 - 1250 - 500 - 325 - 112.5 = 2812.5 (approx)
    cas: 1250, // 25% of 5000
    cass: 500, // 10% of 5000
    impozit: 325, // 10% of (5000 - 1250 - 500)
    camFSSF: 112.5, // 2.25% of 5000
    zileLucrate: 22,
    oreLucrate: 176,
    ...overrides,
  });

  const mockCompanyData = {
    cui: 'RO12345678',
    denumire: 'SC Test Company SRL',
    judet: 'București',
    localitate: 'Sector 1',
    strada: 'Calea Victoriei',
    numar: '100',
    caen: '6201',
  };

  const mockDbEmployee = {
    id: 'emp-1',
    userId,
    firstName: 'Ion',
    lastName: 'Popescu',
    cnp: '1900101123456',
    salary: 5000,
    status: 'ACTIVE',
    contractType: 'FULL_TIME',
  };

  beforeEach(async () => {
    mockPrismaService = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: userId }),
      },
      employee: {
        findMany: jest.fn().mockResolvedValue([mockDbEmployee]),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        D112Service,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<D112Service>(D112Service);
  });

  describe('Constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  // =================== CALCULATE TOTALS ===================

  describe('calculateTotals', () => {
    it('should calculate totals for single employee', () => {
      const employees = [createMockEmployee()];
      const totals = service.calculateTotals(employees);

      expect(totals.numarAngajati).toBe(1);
      expect(totals.totalSalariuBrut).toBe(5000);
      expect(totals.totalCAS).toBe(1250);
      expect(totals.totalCASS).toBe(500);
    });

    it('should calculate totals for multiple employees', () => {
      const employees = [
        createMockEmployee({ salariuBrut: 5000, cas: 1250 }),
        createMockEmployee({ salariuBrut: 4000, cas: 1000, cnp: '2900202234567' }),
        createMockEmployee({ salariuBrut: 6000, cas: 1500, cnp: '1850303345678' }),
      ];

      const totals = service.calculateTotals(employees);

      expect(totals.numarAngajati).toBe(3);
      expect(totals.totalSalariuBrut).toBe(15000);
      expect(totals.totalCAS).toBe(3750);
    });

    it('should return zeros for empty employee list', () => {
      const totals = service.calculateTotals([]);

      expect(totals.numarAngajati).toBe(0);
      expect(totals.totalSalariuBrut).toBe(0);
      expect(totals.totalCAS).toBe(0);
      expect(totals.totalCASS).toBe(0);
      expect(totals.totalImpozit).toBe(0);
      expect(totals.totalCAM).toBe(0);
    });

    it('should sum all contribution types', () => {
      const employees = [
        createMockEmployee({
          salariuBrut: 10000,
          cas: 2500,
          cass: 1000,
          impozit: 650,
          camFSSF: 225,
        }),
      ];

      const totals = service.calculateTotals(employees);

      expect(totals.totalCAS).toBe(2500);
      expect(totals.totalCASS).toBe(1000);
      expect(totals.totalImpozit).toBe(650);
      expect(totals.totalCAM).toBe(225);
    });
  });

  // =================== VALIDATE D112 DATA ===================

  describe('validateD112Data', () => {
    it('should return valid for correct data', () => {
      const employees = [createMockEmployee()];
      const result = service.validateD112Data(employees, '2025-01');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate invalid period format', () => {
      const employees = [createMockEmployee()];
      const result = service.validateD112Data(employees, 'invalid');

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('Perioada invalida'));
    });

    it('should validate invalid month (13)', () => {
      const employees = [createMockEmployee()];
      const result = service.validateD112Data(employees, '2025-13');

      expect(result.valid).toBe(false);
    });

    it('should validate invalid month (0)', () => {
      const employees = [createMockEmployee()];
      const result = service.validateD112Data(employees, '2025-00');

      expect(result.valid).toBe(false);
    });

    it('should validate invalid CNP length', () => {
      const employees = [createMockEmployee({ cnp: '123456' })];
      const result = service.validateD112Data(employees, '2025-01');

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('CNP invalid'));
    });

    it('should validate empty CNP', () => {
      const employees = [createMockEmployee({ cnp: '' })];
      const result = service.validateD112Data(employees, '2025-01');

      expect(result.valid).toBe(false);
    });

    it('should validate missing name', () => {
      const employees = [createMockEmployee({ nume: '' })];
      const result = service.validateD112Data(employees, '2025-01');

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('Nume lipsa'));
    });

    it('should validate missing first name', () => {
      const employees = [createMockEmployee({ prenume: '' })];
      const result = service.validateD112Data(employees, '2025-01');

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('Prenume lipsa'));
    });

    it('should validate salary below minimum wage (3700 RON)', () => {
      const employees = [createMockEmployee({ salariuBrut: 3000 })];
      const result = service.validateD112Data(employees, '2025-01');

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining('sub minimul pe economie'),
      );
    });

    it('should accept salary at minimum wage', () => {
      const employees = [createMockEmployee({ salariuBrut: 3700 })];
      const result = service.validateD112Data(employees, '2025-01');

      const salaryErrors = result.errors.filter((e) =>
        e.includes('sub minimul pe economie'),
      );
      expect(salaryErrors).toHaveLength(0);
    });

    it('should validate negative work days', () => {
      const employees = [createMockEmployee({ zileLucrate: -1 })];
      const result = service.validateD112Data(employees, '2025-01');

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining('Zile lucrate invalide'),
      );
    });

    it('should validate work days over 31', () => {
      const employees = [createMockEmployee({ zileLucrate: 32 })];
      const result = service.validateD112Data(employees, '2025-01');

      expect(result.valid).toBe(false);
    });

    it('should validate multiple employees with errors', () => {
      const employees = [
        createMockEmployee({ cnp: '123' }), // Invalid CNP
        createMockEmployee({ nume: '', cnp: '2900202234567' }), // Missing name
        createMockEmployee({ salariuBrut: 2000, cnp: '1850303345678' }), // Low salary
      ];

      const result = service.validateD112Data(employees, '2025-01');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  // =================== GET EMPLOYEES FOR D112 ===================

  describe('getEmployeesForD112', () => {
    it('should get employees and calculate contributions', async () => {
      const employees = await service.getEmployeesForD112(userId, period);

      expect(employees.length).toBe(1);
      expect(employees[0].nume).toBe('Popescu');
      expect(employees[0].prenume).toBe('Ion');
    });

    it('should throw error for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getEmployeesForD112(userId, period)).rejects.toThrow(
        'User not found',
      );
    });

    it('should query only active employees', async () => {
      await service.getEmployeesForD112(userId, period);

      expect(mockPrismaService.employee.findMany).toHaveBeenCalledWith({
        where: { userId, status: 'ACTIVE' },
        orderBy: { lastName: 'asc' },
      });
    });

    it('should calculate CAS at 25%', async () => {
      mockPrismaService.employee.findMany.mockResolvedValue([
        { ...mockDbEmployee, salary: 10000 },
      ]);

      const employees = await service.getEmployeesForD112(userId, period);

      expect(employees[0].cas).toBe(2500); // 25% of 10000
    });

    it('should calculate CASS at 10%', async () => {
      mockPrismaService.employee.findMany.mockResolvedValue([
        { ...mockDbEmployee, salary: 10000 },
      ]);

      const employees = await service.getEmployeesForD112(userId, period);

      expect(employees[0].cass).toBe(1000); // 10% of 10000
    });

    it('should calculate CAM at 2.25%', async () => {
      mockPrismaService.employee.findMany.mockResolvedValue([
        { ...mockDbEmployee, salary: 10000 },
      ]);

      const employees = await service.getEmployeesForD112(userId, period);

      expect(employees[0].camFSSF).toBe(225); // 2.25% of 10000
    });

    it('should set 22 work days for full-time', async () => {
      mockPrismaService.employee.findMany.mockResolvedValue([
        { ...mockDbEmployee, contractType: 'FULL_TIME' },
      ]);

      const employees = await service.getEmployeesForD112(userId, period);

      expect(employees[0].zileLucrate).toBe(22);
      expect(employees[0].oreLucrate).toBe(176);
    });

    it('should set 10 work days for part-time', async () => {
      mockPrismaService.employee.findMany.mockResolvedValue([
        { ...mockDbEmployee, contractType: 'PART_TIME' },
      ]);

      const employees = await service.getEmployeesForD112(userId, period);

      expect(employees[0].zileLucrate).toBe(10);
      expect(employees[0].oreLucrate).toBe(80);
    });

    it('should handle empty CNP', async () => {
      mockPrismaService.employee.findMany.mockResolvedValue([
        { ...mockDbEmployee, cnp: null },
      ]);

      const employees = await service.getEmployeesForD112(userId, period);

      expect(employees[0].cnp).toBe('');
    });

    it('should round amounts to 2 decimal places', async () => {
      mockPrismaService.employee.findMany.mockResolvedValue([
        { ...mockDbEmployee, salary: 3333.33 },
      ]);

      const employees = await service.getEmployeesForD112(userId, period);

      expect(employees[0].cas).toBe(833.33); // Rounded
    });
  });

  // =================== GENERATE D112 XML ===================

  describe('generateD112Xml', () => {
    it('should generate valid XML', async () => {
      const employees = [createMockEmployee()];
      const xml = await service.generateD112Xml(userId, period, employees, mockCompanyData);

      expect(xml).toContain('<?xml');
      expect(xml).toContain('D112');
    });

    it('should include company CUI without RO prefix', async () => {
      const employees = [createMockEmployee()];
      const xml = await service.generateD112Xml(userId, period, employees, mockCompanyData);

      expect(xml).toContain('12345678');
      expect(xml).not.toContain('RO12345678');
    });

    it('should include company name', async () => {
      const employees = [createMockEmployee()];
      const xml = await service.generateD112Xml(userId, period, employees, mockCompanyData);

      expect(xml).toContain('SC Test Company SRL');
    });

    it('should include period year and month', async () => {
      const employees = [createMockEmployee()];
      const xml = await service.generateD112Xml(userId, '2025-06', employees, mockCompanyData);

      expect(xml).toContain('<AN>2025</AN>');
      expect(xml).toContain('<LUNA>06</LUNA>');
    });

    it('should include employee data', async () => {
      const employees = [createMockEmployee({ nume: 'Ionescu', prenume: 'Maria' })];
      const xml = await service.generateD112Xml(userId, period, employees, mockCompanyData);

      expect(xml).toContain('<NUME>Ionescu</NUME>');
      expect(xml).toContain('<PRENUME>Maria</PRENUME>');
    });

    it('should include CNP', async () => {
      const employees = [createMockEmployee({ cnp: '2900202234567' })];
      const xml = await service.generateD112Xml(userId, period, employees, mockCompanyData);

      expect(xml).toContain('<CNP>2900202234567</CNP>');
    });

    it('should include totals section', async () => {
      const employees = [createMockEmployee({ cas: 1250, cass: 500 })];
      const xml = await service.generateD112Xml(userId, period, employees, mockCompanyData);

      expect(xml).toContain('TOTAL_CAS');
      expect(xml).toContain('TOTAL_CASS');
      expect(xml).toContain('TOTAL_IMPOZIT');
      expect(xml).toContain('TOTAL_CAM');
    });

    it('should include generation date', async () => {
      const employees = [createMockEmployee()];
      const xml = await service.generateD112Xml(userId, period, employees, mockCompanyData);

      expect(xml).toContain('DATA_GENERARE');
    });

    it('should include CAEN code', async () => {
      const employees = [createMockEmployee()];
      const xml = await service.generateD112Xml(userId, period, employees, mockCompanyData);

      expect(xml).toContain('<CAEN>6201</CAEN>');
    });

    it('should handle multiple employees', async () => {
      const employees = [
        createMockEmployee({ cnp: '1900101123456' }),
        createMockEmployee({ cnp: '2900202234567' }),
        createMockEmployee({ cnp: '1850303345678' }),
      ];
      const xml = await service.generateD112Xml(userId, period, employees, mockCompanyData);

      // Count CNP entries to verify 3 employees
      expect((xml.match(/<CNP>/g) || []).length).toBe(3);
    });
  });

  // =================== SUBMIT TO ANAF ===================

  describe('submitToANAF', () => {
    it('should create submission record', async () => {
      const totals: D112Totals = {
        totalSalariuBrut: 5000,
        totalSalariuNet: 3275,
        totalCAS: 1250,
        totalCASS: 500,
        totalImpozit: 325,
        totalCAM: 112.5,
        numarAngajati: 1,
      };

      const submission = await service.submitToANAF(
        userId,
        period,
        '<xml/>',
        totals,
      );

      expect(submission.id).toBeDefined();
      expect(submission.status).toBe('SUBMITTED');
    });

    it('should store in audit log', async () => {
      const totals: D112Totals = {
        totalSalariuBrut: 5000,
        totalSalariuNet: 3275,
        totalCAS: 1250,
        totalCASS: 500,
        totalImpozit: 325,
        totalCAM: 112.5,
        numarAngajati: 1,
      };

      await service.submitToANAF(userId, period, '<xml/>', totals);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          action: 'D112_SUBMISSION',
          entity: 'COMPLIANCE',
        }),
      });
    });

    it('should include period in submission', async () => {
      const totals = service.calculateTotals([]);
      const submission = await service.submitToANAF(
        userId,
        '2025-06',
        '<xml/>',
        totals,
      );

      expect(submission.period).toBe('2025-06');
    });

    it('should generate correct filename', async () => {
      const totals = service.calculateTotals([]);
      const submission = await service.submitToANAF(
        userId,
        '2025-06',
        '<xml/>',
        totals,
      );

      expect(submission.fileName).toBe('d112_2025-06.xml');
    });

    it('should store XML content', async () => {
      const totals = service.calculateTotals([]);
      const xmlContent = '<?xml version="1.0"?><D112>test</D112>';
      const submission = await service.submitToANAF(
        userId,
        period,
        xmlContent,
        totals,
      );

      expect(submission.xmlContent).toBe(xmlContent);
    });
  });

  // =================== GET SUBMISSION HISTORY ===================

  describe('getSubmissionHistory', () => {
    it('should return submission history', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([
        {
          entityId: 'D112-2025-01-123',
          createdAt: new Date(),
          details: { period: '2025-01', status: 'SUBMITTED' },
        },
      ]);

      const history = await service.getSubmissionHistory(userId);

      expect(history.length).toBe(1);
      expect(history[0].period).toBe('2025-01');
    });

    it('should query D112_SUBMISSION actions', async () => {
      await service.getSubmissionHistory(userId);

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: { userId, action: 'D112_SUBMISSION' },
        orderBy: { createdAt: 'desc' },
        take: 24,
      });
    });

    it('should return empty array when no history', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      const history = await service.getSubmissionHistory(userId);

      expect(history).toEqual([]);
    });

    it('should limit to 24 entries (2 years)', async () => {
      await service.getSubmissionHistory(userId);

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 24 }),
      );
    });
  });

  // =================== GET STATUS ===================

  describe('getStatus', () => {
    it('should return period status', async () => {
      const status = await service.getStatus(userId, period);

      expect(status.period).toBe(period);
      expect(status.employeeCount).toBeDefined();
      expect(status.totals).toBeDefined();
    });

    it('should indicate if period is submitted', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([
        {
          entityId: 'D112-2025-01-123',
          createdAt: new Date(),
          details: { period: '2025-01', status: 'SUBMITTED' },
        },
      ]);

      const status = await service.getStatus(userId, '2025-01');

      expect(status.submitted).toBe(true);
    });

    it('should indicate if period is not submitted', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      const status = await service.getStatus(userId, period);

      expect(status.submitted).toBe(false);
    });

    it('should include deadline', async () => {
      const status = await service.getStatus(userId, '2025-01');

      expect(status.deadline).toBe('2025-02-25');
    });

    it('should handle December deadline crossing to next year', async () => {
      const status = await service.getStatus(userId, '2025-12');

      expect(status.deadline).toBe('2026-01-25');
    });
  });

  // =================== ROMANIAN COMPLIANCE ===================

  describe('Romanian Compliance', () => {
    it('should use 2025 minimum wage (3700 RON) for validation', () => {
      const employees = [createMockEmployee({ salariuBrut: 3699 })];
      const result = service.validateD112Data(employees, '2025-01');

      expect(result.valid).toBe(false);
    });

    it('should calculate net salary correctly', async () => {
      // Gross: 10000
      // CAS: 2500 (25%)
      // CASS: 1000 (10%)
      // Tax base: 10000 - 2500 - 1000 = 6500
      // Impozit: 650 (10% of tax base)
      // Net: 10000 - 2500 - 1000 - 650 = 5850
      mockPrismaService.employee.findMany.mockResolvedValue([
        { ...mockDbEmployee, salary: 10000 },
      ]);

      const employees = await service.getEmployeesForD112(userId, period);

      expect(employees[0].salariuNet).toBe(5850);
    });

    it('should set deadline as 25th of following month', async () => {
      const status = await service.getStatus(userId, '2025-03');

      expect(status.deadline).toBe('2025-04-25');
    });

    it('should include Romanian XML namespace', async () => {
      const employees = [createMockEmployee()];
      const xml = await service.generateD112Xml(userId, period, employees, mockCompanyData);

      expect(xml).toContain('mfp:anaf:dgti:d112');
    });
  });

  // =================== EDGE CASES ===================

  describe('Edge Cases', () => {
    it('should handle no employees', async () => {
      mockPrismaService.employee.findMany.mockResolvedValue([]);

      const employees = await service.getEmployeesForD112(userId, period);

      expect(employees).toEqual([]);
    });

    it('should handle very high salaries', async () => {
      mockPrismaService.employee.findMany.mockResolvedValue([
        { ...mockDbEmployee, salary: 100000 },
      ]);

      const employees = await service.getEmployeesForD112(userId, period);

      expect(employees[0].cas).toBe(25000);
    });

    it('should handle Romanian diacritics in names', async () => {
      const employees = [
        createMockEmployee({ nume: 'Ștefănescu', prenume: 'Ălin' }),
      ];
      const xml = await service.generateD112Xml(userId, period, employees, mockCompanyData);

      expect(xml).toContain('Ștefănescu');
      expect(xml).toContain('Ălin');
    });

    it('should handle special characters in company name', async () => {
      const companyWithSpecialChars = {
        ...mockCompanyData,
        denumire: 'SC Test & Partners SRL',
      };
      const employees = [createMockEmployee()];
      const xml = await service.generateD112Xml(
        userId,
        period,
        employees,
        companyWithSpecialChars,
      );

      expect(xml).toBeDefined();
    });

    it('should handle minimum work days (0)', () => {
      const employees = [createMockEmployee({ zileLucrate: 0 })];
      const result = service.validateD112Data(employees, '2025-01');

      // 0 days is valid (unpaid leave)
      expect(result.errors.filter((e) => e.includes('Zile lucrate'))).toHaveLength(0);
    });

    it('should handle maximum work days (31)', () => {
      const employees = [createMockEmployee({ zileLucrate: 31 })];
      const result = service.validateD112Data(employees, '2025-01');

      expect(result.errors.filter((e) => e.includes('Zile lucrate'))).toHaveLength(0);
    });
  });
});
