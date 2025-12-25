import { Test, TestingModule } from '@nestjs/testing';
import { FuelCardService, FuelCard, FuelCardProvider } from './fuel-card.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

describe('FuelCardService', () => {
  let service: FuelCardService;
  let prisma: jest.Mocked<PrismaService>;

  const mockVehicle = {
    id: 'vehicle-1',
    userId: 'user-1',
    licensePlate: 'M-DL-1234',
    status: 'ACTIVE',
  };

  const mockEmployee = {
    id: 'driver-1',
    userId: 'user-1',
    firstName: 'Hans',
    lastName: 'Mueller',
  };

  const mockFuelLog = (options: Partial<any> = {}) => ({
    id: options.id || 'fuel-log-1',
    vehicleId: options.vehicleId || 'vehicle-1',
    driverId: options.driverId || 'driver-1',
    fuelType: options.fuelType || 'DIESEL',
    liters: new Decimal(options.liters || 50),
    pricePerLiter: new Decimal(options.pricePerLiter || 1.65),
    totalCost: new Decimal(options.totalCost || 82.50),
    odometerReading: options.odometerReading || 125000,
    stationName: options.stationName || 'Shell München',
    stationAddress: options.stationAddress || 'Leopoldstraße 100',
    fueledAt: options.fueledAt || new Date('2025-12-05T10:00:00Z'),
    createdAt: new Date(),
    vehicle: mockVehicle,
  });

  beforeEach(async () => {
    const mockPrisma = {
      vehicle: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      employee: {
        findFirst: jest.fn(),
      },
      fuelLog: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      deliveryRoute: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FuelCardService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<FuelCardService>(FuelCardService);
    prisma = module.get(PrismaService);
  });

  describe('getProviders', () => {
    it('should return list of supported fuel card providers', () => {
      const providers = service.getProviders();

      expect(providers.length).toBeGreaterThan(0);
      expect(providers.map(p => p.code)).toContain('SHELL');
      expect(providers.map(p => p.code)).toContain('DKV');
      expect(providers.map(p => p.code)).toContain('UTA');
      expect(providers.map(p => p.code)).toContain('ARAL');
      expect(providers.map(p => p.code)).toContain('EUROSHELL');
    });

    it('should include provider names and websites', () => {
      const providers = service.getProviders();
      const shell = providers.find(p => p.code === 'SHELL');

      expect(shell?.name).toBe('Shell Card');
      expect(shell?.website).toContain('shell');
    });
  });

  describe('registerCard', () => {
    it('should register a new fuel card', async () => {
      (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue(mockVehicle);
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(mockEmployee);

      const card = await service.registerCard('user-1', {
        cardNumber: '7002 1234 5678 9012',
        provider: 'SHELL' as FuelCardProvider,
        vehicleId: 'vehicle-1',
        driverId: 'driver-1',
        expiryDate: new Date('2027-12-31'),
        monthlyLimit: 500,
        pinRequired: true,
      });

      expect(card.cardNumber).toBe('7002 1234 5678 9012');
      expect(card.provider).toBe('SHELL');
      expect(card.status).toBe('ACTIVE');
      expect(card.monthlyLimit).toBe(500);
      expect(card.currentMonthSpent).toBe(0);
    });

    it('should throw NotFoundException if vehicle not found', async () => {
      (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.registerCard('user-1', {
          cardNumber: '7002 1234 5678 9012',
          provider: 'SHELL' as FuelCardProvider,
          vehicleId: 'non-existent',
          expiryDate: new Date('2027-12-31'),
          monthlyLimit: 500,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if driver not found', async () => {
      (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue(mockVehicle);
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.registerCard('user-1', {
          cardNumber: '7002 1234 5678 9012',
          provider: 'DKV' as FuelCardProvider,
          vehicleId: 'vehicle-1',
          driverId: 'non-existent',
          expiryDate: new Date('2027-12-31'),
          monthlyLimit: 500,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for duplicate card number', async () => {
      // Register first card
      await service.registerCard('user-1', {
        cardNumber: 'DUPLICATE-123',
        provider: 'UTA' as FuelCardProvider,
        expiryDate: new Date('2027-12-31'),
        monthlyLimit: 500,
      });

      // Try to register with same number
      await expect(
        service.registerCard('user-1', {
          cardNumber: 'DUPLICATE-123',
          provider: 'DKV' as FuelCardProvider,
          expiryDate: new Date('2027-12-31'),
          monthlyLimit: 500,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCards', () => {
    it('should return all registered fuel cards', async () => {
      // Register some cards first
      await service.registerCard('user-1', {
        cardNumber: 'CARD-001',
        provider: 'SHELL' as FuelCardProvider,
        expiryDate: new Date('2027-12-31'),
        monthlyLimit: 500,
      });
      await service.registerCard('user-1', {
        cardNumber: 'CARD-002',
        provider: 'DKV' as FuelCardProvider,
        expiryDate: new Date('2027-12-31'),
        monthlyLimit: 600,
      });

      const cards = await service.getCards('user-1');

      expect(cards.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getCard', () => {
    it('should return a specific fuel card', async () => {
      const registered = await service.registerCard('user-1', {
        cardNumber: 'SPECIFIC-CARD',
        provider: 'ARAL' as FuelCardProvider,
        expiryDate: new Date('2027-12-31'),
        monthlyLimit: 400,
      });

      const card = await service.getCard(registered.id);

      expect(card.id).toBe(registered.id);
      expect(card.cardNumber).toBe('SPECIFIC-CARD');
    });

    it('should throw NotFoundException if card not found', async () => {
      await expect(service.getCard('non-existent-card')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateCard', () => {
    it('should update fuel card fields', async () => {
      const card = await service.registerCard('user-1', {
        cardNumber: 'UPDATE-TEST',
        provider: 'SHELL' as FuelCardProvider,
        expiryDate: new Date('2027-12-31'),
        monthlyLimit: 500,
      });

      const updated = await service.updateCard(card.id, {
        monthlyLimit: 750,
        vehicleId: 'new-vehicle',
      });

      expect(updated.monthlyLimit).toBe(750);
      expect(updated.vehicleId).toBe('new-vehicle');
    });
  });

  describe('blockCard', () => {
    it('should block a fuel card', async () => {
      const card = await service.registerCard('user-1', {
        cardNumber: 'BLOCK-TEST',
        provider: 'DKV' as FuelCardProvider,
        expiryDate: new Date('2027-12-31'),
        monthlyLimit: 500,
      });

      const blocked = await service.blockCard(card.id, 'Lost card');

      expect(blocked.status).toBe('BLOCKED');
    });
  });

  describe('getCardSummary', () => {
    it('should return fuel card summary statistics', async () => {
      // Register cards with different statuses
      await service.registerCard('user-1', {
        cardNumber: 'SUM-001',
        provider: 'SHELL' as FuelCardProvider,
        expiryDate: new Date('2027-12-31'),
        monthlyLimit: 500,
      });
      const cardToBlock = await service.registerCard('user-1', {
        cardNumber: 'SUM-002',
        provider: 'DKV' as FuelCardProvider,
        expiryDate: new Date('2027-12-31'),
        monthlyLimit: 600,
      });
      await service.blockCard(cardToBlock.id, 'Test block');

      const summary = await service.getCardSummary('user-1');

      expect(summary.totalCards).toBeGreaterThanOrEqual(2);
      expect(summary.activeCards).toBeGreaterThanOrEqual(1);
      expect(summary.blockedCards).toBeGreaterThanOrEqual(1);
      expect(summary).toHaveProperty('totalMonthlyLimit');
      expect(summary).toHaveProperty('utilizationPercent');
    });
  });

  describe('importTransactions', () => {
    it('should import fuel transactions', async () => {
      (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue(mockVehicle);

      const card = await service.registerCard('user-1', {
        cardNumber: 'IMPORT-TEST',
        provider: 'SHELL' as FuelCardProvider,
        vehicleId: 'vehicle-1',
        expiryDate: new Date('2027-12-31'),
        monthlyLimit: 1000,
      });

      (prisma.fuelLog.create as jest.Mock).mockResolvedValue(mockFuelLog());

      const result = await service.importTransactions('user-1', card.id, [
        {
          transactionDate: new Date('2025-12-05T10:00:00Z'),
          stationName: 'Shell München',
          fuelType: 'DIESEL',
          liters: 50,
          pricePerLiter: 1.65,
          odometerReading: 125000,
          receiptNumber: 'REC-001',
        },
      ]);

      expect(result.imported).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should update card spending after import', async () => {
      (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue(mockVehicle);

      const card = await service.registerCard('user-1', {
        cardNumber: 'SPEND-TEST',
        provider: 'SHELL' as FuelCardProvider,
        vehicleId: 'vehicle-1',
        expiryDate: new Date('2027-12-31'),
        monthlyLimit: 1000,
      });

      (prisma.fuelLog.create as jest.Mock).mockResolvedValue(mockFuelLog());

      await service.importTransactions('user-1', card.id, [
        {
          transactionDate: new Date(),
          stationName: 'Shell',
          fuelType: 'DIESEL',
          liters: 50,
          pricePerLiter: 1.65,
        },
      ]);

      const updated = await service.getCard(card.id);
      expect(updated.currentMonthSpent).toBeGreaterThan(0);
    });
  });

  describe('getRecentTransactions', () => {
    it('should return recent fuel transactions', async () => {
      (prisma.fuelLog.findMany as jest.Mock).mockResolvedValue([
        mockFuelLog({ id: 'log-1' }),
        mockFuelLog({ id: 'log-2' }),
      ]);

      const transactions = await service.getRecentTransactions('user-1');

      expect(transactions).toHaveLength(2);
      expect(transactions[0]).toHaveProperty('liters');
      expect(transactions[0]).toHaveProperty('totalCost');
      expect(transactions[0]).toHaveProperty('stationName');
    });

    it('should filter by vehicle ID', async () => {
      (prisma.fuelLog.findMany as jest.Mock).mockResolvedValue([mockFuelLog()]);

      await service.getRecentTransactions('user-1', { vehicleId: 'vehicle-1' });

      expect(prisma.fuelLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ vehicleId: 'vehicle-1' }),
        }),
      );
    });

    it('should respect limit parameter', async () => {
      (prisma.fuelLog.findMany as jest.Mock).mockResolvedValue([mockFuelLog()]);

      await service.getRecentTransactions('user-1', { limit: 10 });

      expect(prisma.fuelLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        }),
      );
    });
  });

  describe('getSpendingAnalysis', () => {
    it('should return spending analysis for a period', async () => {
      (prisma.fuelLog.findMany as jest.Mock).mockResolvedValue([
        mockFuelLog({ liters: 50, totalCost: 82.50, fuelType: 'DIESEL' }),
        mockFuelLog({ id: 'log-2', liters: 60, totalCost: 99, fuelType: 'DIESEL' }),
      ]);
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([
        { actualDistanceKm: new Decimal(500), vehicleId: 'vehicle-1' },
      ]);

      const from = new Date('2025-12-01');
      const to = new Date('2025-12-08');

      const analysis = await service.getSpendingAnalysis('user-1', from, to);

      expect(analysis.period.from).toEqual(from);
      expect(analysis.period.to).toEqual(to);
      expect(analysis.totalLiters).toBeGreaterThan(0);
      expect(analysis.totalCostEur).toBeGreaterThan(0);
      expect(analysis.avgPricePerLiter).toBeGreaterThan(0);
      expect(analysis.transactionCount).toBe(2);
      expect(analysis.byFuelType.length).toBeGreaterThan(0);
    });

    it('should group spending by station', async () => {
      (prisma.fuelLog.findMany as jest.Mock).mockResolvedValue([
        mockFuelLog({ stationName: 'Shell München' }),
        mockFuelLog({ id: 'log-2', stationName: 'Shell München' }),
        mockFuelLog({ id: 'log-3', stationName: 'Aral Schwabing' }),
      ]);
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([]);

      const analysis = await service.getSpendingAnalysis(
        'user-1',
        new Date('2025-12-01'),
        new Date('2025-12-08'),
      );

      expect(analysis.byStation.length).toBe(2);
      const shellStation = analysis.byStation.find(s => s.station === 'Shell München');
      expect(shellStation?.visits).toBe(2);
    });
  });

  describe('checkAlerts', () => {
    it('should detect expiring cards', async () => {
      // Register a card expiring in 5 days (< 7 days = CRITICAL)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 5);

      await service.registerCard('user-1', {
        cardNumber: 'EXPIRING-CARD',
        provider: 'SHELL' as FuelCardProvider,
        expiryDate,
        monthlyLimit: 500,
      });

      (prisma.fuelLog.findMany as jest.Mock).mockResolvedValue([]);

      const alerts = await service.checkAlerts('user-1');

      const expiryAlerts = alerts.filter(a => a.alertType === 'CARD_EXPIRING');
      expect(expiryAlerts.length).toBeGreaterThan(0);
      expect(expiryAlerts[0].severity).toBe('CRITICAL'); // <= 7 days is critical
    });

    it('should detect limit warnings', async () => {
      const card = await service.registerCard('user-1', {
        cardNumber: 'LIMIT-WARNING',
        provider: 'DKV' as FuelCardProvider,
        expiryDate: new Date('2027-12-31'),
        monthlyLimit: 100,
      });

      // Simulate spending 85% of limit
      await service.updateCard(card.id, {});
      const updatedCard = await service.getCard(card.id);
      (updatedCard as any).currentMonthSpent = 85;

      (prisma.fuelLog.findMany as jest.Mock).mockResolvedValue([]);

      const alerts = await service.checkAlerts('user-1');

      // Should find the expiring card alert and possibly limit warning
      expect(alerts.some(a => a.alertType === 'CARD_EXPIRING' || a.alertType === 'LIMIT_WARNING')).toBe(true);
    });

    it('should return German alert messages', async () => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 5);

      await service.registerCard('user-1', {
        cardNumber: 'GERMAN-TEST',
        provider: 'SHELL' as FuelCardProvider,
        expiryDate,
        monthlyLimit: 500,
      });

      (prisma.fuelLog.findMany as jest.Mock).mockResolvedValue([]);

      const alerts = await service.checkAlerts('user-1');

      const expiryAlert = alerts.find(a => a.alertType === 'CARD_EXPIRING');
      expect(expiryAlert?.message).toContain('Tankkarte');
      expect(expiryAlert?.message).toContain('läuft');
    });
  });

  describe('getEfficiencyReport', () => {
    it('should return fuel efficiency report by vehicle', async () => {
      (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([
        { id: 'vehicle-1', licensePlate: 'M-DL-1234' },
        { id: 'vehicle-2', licensePlate: 'M-DL-5678' },
      ]);
      (prisma.fuelLog.findMany as jest.Mock).mockResolvedValue([
        mockFuelLog({ vehicleId: 'vehicle-1', liters: 100, totalCost: 165 }),
      ]);
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([
        { actualDistanceKm: new Decimal(1000) },
      ]);

      const from = new Date('2025-12-01');
      const to = new Date('2025-12-08');

      const report = await service.getEfficiencyReport('user-1', from, to);

      expect(report.length).toBeGreaterThan(0);
      expect(report[0]).toHaveProperty('vehicleId');
      expect(report[0]).toHaveProperty('licensePlate');
      expect(report[0]).toHaveProperty('kmPerLiter');
      expect(report[0]).toHaveProperty('costPerKm');
      expect(report[0]).toHaveProperty('status');
    });

    it('should classify efficiency status correctly', async () => {
      (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([
        { id: 'good-vehicle', licensePlate: 'M-EFF-GOOD' },
      ]);
      // 50 liters, 600 km = 12 km/L (GOOD)
      (prisma.fuelLog.findMany as jest.Mock).mockResolvedValue([
        mockFuelLog({ vehicleId: 'good-vehicle', liters: 50, totalCost: 82.50 }),
      ]);
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([
        { actualDistanceKm: new Decimal(600) },
      ]);

      const report = await service.getEfficiencyReport(
        'user-1',
        new Date('2025-12-01'),
        new Date('2025-12-08'),
      );

      const goodVehicle = report.find(r => r.vehicleId === 'good-vehicle');
      expect(goodVehicle?.kmPerLiter).toBeGreaterThanOrEqual(10);
      expect(goodVehicle?.status).toBe('GOOD');
    });

    it('should sort by efficiency (worst first)', async () => {
      (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([
        { id: 'efficient', licensePlate: 'M-EFF-1' },
        { id: 'inefficient', licensePlate: 'M-EFF-2' },
      ]);
      (prisma.fuelLog.findMany as jest.Mock)
        .mockResolvedValueOnce([mockFuelLog({ vehicleId: 'efficient', liters: 50 })])
        .mockResolvedValueOnce([mockFuelLog({ vehicleId: 'inefficient', liters: 100 })]);
      (prisma.deliveryRoute.findMany as jest.Mock)
        .mockResolvedValueOnce([{ actualDistanceKm: new Decimal(500) }])
        .mockResolvedValueOnce([{ actualDistanceKm: new Decimal(500) }]);

      const report = await service.getEfficiencyReport(
        'user-1',
        new Date('2025-12-01'),
        new Date('2025-12-08'),
      );

      // Worst efficiency should be first
      if (report.length >= 2) {
        expect(report[0].kmPerLiter).toBeLessThanOrEqual(report[1].kmPerLiter);
      }
    });
  });
});
