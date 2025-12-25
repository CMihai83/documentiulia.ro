import { Test, TestingModule } from '@nestjs/testing';
import { SubcontractorPaymentService } from './subcontractor-payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { CourierProvider } from './dto/courier.dto';
import { BadRequestException } from '@nestjs/common';

describe('SubcontractorPaymentService', () => {
  let service: SubcontractorPaymentService;

  const mockPrisma = {
    courierDelivery: {
      findMany: jest.fn(),
    },
    deliveryRoute: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubcontractorPaymentService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SubcontractorPaymentService>(SubcontractorPaymentService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculatePayment', () => {
    it('should calculate payment for DPD deliveries', async () => {
      const deliveries = [
        { trackingNumber: 'DPD123456', status: 'DELIVERED', deliveredAt: new Date('2024-01-15') },
        { trackingNumber: 'DPD789012', status: 'DELIVERED', deliveredAt: new Date('2024-01-16') },
        { trackingNumber: 'DPDEXP001', status: 'DELIVERED', deliveredAt: new Date('2024-01-17') }, // Express
      ];

      mockPrisma.courierDelivery.findMany.mockResolvedValue(deliveries);

      const result = await service.calculatePayment(
        'user-123',
        CourierProvider.DPD,
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );

      expect(result.provider).toBe(CourierProvider.DPD);
      expect(result.totalDeliveries).toBe(3);
      expect(result.breakdown.standardDeliveries.count).toBe(2);
      expect(result.breakdown.expressDeliveries.count).toBe(1);
      expect(result.netPayment).toBeGreaterThan(0);
      expect(result.currency).toBe('EUR');
    });

    it('should calculate payment for GLS deliveries', async () => {
      const deliveries = [
        { trackingNumber: 'GLS123456', status: 'DELIVERED', deliveredAt: new Date('2024-01-15') },
        { trackingNumber: 'GLS789012', status: 'FAILED', deliveredAt: new Date('2024-01-16') },
      ];

      mockPrisma.courierDelivery.findMany.mockResolvedValue(deliveries);

      const result = await service.calculatePayment(
        'user-123',
        CourierProvider.GLS,
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );

      expect(result.provider).toBe(CourierProvider.GLS);
      expect(result.totalDeliveries).toBe(2);
      expect(result.breakdown.standardDeliveries.count).toBe(1);
      expect(result.breakdown.failedAttempts.count).toBe(1);
    });

    it('should handle empty delivery list', async () => {
      mockPrisma.courierDelivery.findMany.mockResolvedValue([]);

      const result = await service.calculatePayment(
        'user-123',
        CourierProvider.DPD,
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );

      expect(result.totalDeliveries).toBe(0);
      expect(result.netPayment).toBe(0);
    });

    it('should calculate Saturday bonuses', async () => {
      // Saturday is day 6
      const saturday = new Date('2024-01-13'); // This is a Saturday
      saturday.setHours(12, 0, 0, 0);

      const deliveries = [
        { trackingNumber: 'DPD123456', status: 'DELIVERED', deliveredAt: saturday },
      ];

      mockPrisma.courierDelivery.findMany.mockResolvedValue(deliveries);

      const result = await service.calculatePayment(
        'user-123',
        CourierProvider.DPD,
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );

      expect(result.breakdown.saturdayBonuses.count).toBe(1);
      expect(result.breakdown.saturdayBonuses.amount).toBe(0.50); // DPD Saturday bonus
    });

    it('should calculate return deliveries', async () => {
      const deliveries = [
        { trackingNumber: 'DPD123456', status: 'RETURNED', deliveredAt: new Date('2024-01-15') },
      ];

      mockPrisma.courierDelivery.findMany.mockResolvedValue(deliveries);

      const result = await service.calculatePayment(
        'user-123',
        CourierProvider.DPD,
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );

      expect(result.breakdown.returnDeliveries.count).toBe(1);
      expect(result.breakdown.returnDeliveries.amount).toBe(1.50); // DPD return rate
    });

    it('should detect oversize parcels from tracking number', async () => {
      const deliveries = [
        { trackingNumber: 'DPDXL12345', status: 'DELIVERED', deliveredAt: new Date('2024-01-15') },
        { trackingNumber: 'DPDOS67890', status: 'DELIVERED', deliveredAt: new Date('2024-01-16') },
      ];

      mockPrisma.courierDelivery.findMany.mockResolvedValue(deliveries);

      const result = await service.calculatePayment(
        'user-123',
        CourierProvider.DPD,
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );

      expect(result.breakdown.oversizeParcels.count).toBe(2);
    });
  });

  describe('processPayment', () => {
    it('should process payment and return result', async () => {
      const deliveries = [
        { trackingNumber: 'DPD123456', status: 'DELIVERED', deliveredAt: new Date('2024-01-15') },
      ];

      mockPrisma.courierDelivery.findMany.mockResolvedValue(deliveries);

      const result = await service.processPayment(
        'user-123',
        CourierProvider.DPD,
        { from: new Date('2024-01-01'), to: new Date('2024-01-31') },
      );

      expect(result.paymentId).toContain('PAY-DPD');
      expect(result.status).toBe('PENDING');
      expect(result.amount).toBeGreaterThan(0);
      expect(result.scheduledDate).toBeInstanceOf(Date);
    });

    it('should throw error when no payment due', async () => {
      mockPrisma.courierDelivery.findMany.mockResolvedValue([]);

      await expect(
        service.processPayment(
          'user-123',
          CourierProvider.DPD,
          { from: new Date('2024-01-01'), to: new Date('2024-01-31') },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should generate invoice when requested', async () => {
      const deliveries = [
        { trackingNumber: 'DPD123456', status: 'DELIVERED', deliveredAt: new Date('2024-01-15') },
      ];

      mockPrisma.courierDelivery.findMany.mockResolvedValue(deliveries);

      const result = await service.processPayment(
        'user-123',
        CourierProvider.DPD,
        { from: new Date('2024-01-01'), to: new Date('2024-01-31') },
        { generateInvoice: true },
      );

      expect(result.invoiceNumber).toContain('INV-DPD');
    });
  });

  describe('generateMonthlySummary', () => {
    it('should generate monthly summary for all providers', async () => {
      const dpdDeliveries = [
        { trackingNumber: 'DPD123', status: 'DELIVERED', deliveredAt: new Date('2024-01-15') },
      ];
      const glsDeliveries = [
        { trackingNumber: 'GLS456', status: 'DELIVERED', deliveredAt: new Date('2024-01-16') },
      ];

      mockPrisma.courierDelivery.findMany
        .mockResolvedValueOnce(dpdDeliveries)
        .mockResolvedValueOnce(glsDeliveries);

      const result = await service.generateMonthlySummary('user-123', 2024, 1);

      expect(result.period.year).toBe(2024);
      expect(result.period.month).toBe(1);
      expect(result.byProvider).toHaveLength(2);
      expect(result.totals.deliveries).toBe(2);
      expect(result.totals.netAmount).toBeGreaterThan(0);
    });

    it('should handle months with no deliveries', async () => {
      mockPrisma.courierDelivery.findMany.mockResolvedValue([]);

      const result = await service.generateMonthlySummary('user-123', 2024, 1);

      expect(result.byProvider).toHaveLength(0);
      expect(result.totals.deliveries).toBe(0);
    });
  });

  describe('reconcileWithCourier', () => {
    it('should return MATCHED status for matching amounts', async () => {
      const deliveries = [
        { trackingNumber: 'DPD123', status: 'DELIVERED', deliveredAt: new Date('2024-01-15') },
      ];

      mockPrisma.courierDelivery.findMany.mockResolvedValue(deliveries);

      // Get expected amount first
      const calculation = await service.calculatePayment(
        'user-123',
        CourierProvider.DPD,
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );

      const result = await service.reconcileWithCourier(
        'user-123',
        CourierProvider.DPD,
        calculation.netPayment, // Exact match
        { from: new Date('2024-01-01'), to: new Date('2024-01-31') },
      );

      expect(result.status).toBe('MATCHED');
      expect(result.difference).toBe(0);
    });

    it('should return DISCREPANCY status for small differences', async () => {
      const deliveries = [
        { trackingNumber: 'DPD123', status: 'DELIVERED', deliveredAt: new Date('2024-01-15') },
      ];

      mockPrisma.courierDelivery.findMany.mockResolvedValue(deliveries);

      const result = await service.reconcileWithCourier(
        'user-123',
        CourierProvider.DPD,
        2.55, // Slightly different from 2.50
        { from: new Date('2024-01-01'), to: new Date('2024-01-31') },
      );

      expect(result.status).toBe('DISCREPANCY');
      expect(result.differencePercent).toBeLessThan(5);
    });

    it('should return MAJOR_DISCREPANCY status for large differences', async () => {
      const deliveries = [
        { trackingNumber: 'DPD123', status: 'DELIVERED', deliveredAt: new Date('2024-01-15') },
      ];

      mockPrisma.courierDelivery.findMany.mockResolvedValue(deliveries);

      const result = await service.reconcileWithCourier(
        'user-123',
        CourierProvider.DPD,
        10.00, // Very different from 2.50
        { from: new Date('2024-01-01'), to: new Date('2024-01-31') },
      );

      expect(result.status).toBe('MAJOR_DISCREPANCY');
      expect(result.differencePercent).toBeGreaterThan(5);
    });
  });

  describe('calculateDriverPayout', () => {
    it('should calculate payout for driver with completed routes', async () => {
      const routes = [
        {
          id: 'route-1',
          driverId: 'driver-1',
          status: 'COMPLETED',
          actualDistanceKm: { toNumber: () => 50 },
          driver: { firstName: 'Hans', lastName: 'Müller' },
          stops: [
            { parcelCount: 2 },
            { parcelCount: 1 },
            { parcelCount: 3 },
          ],
        },
      ];

      mockPrisma.deliveryRoute.findMany.mockResolvedValue(routes);

      const result = await service.calculateDriverPayout(
        'driver-1',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );

      expect(result.driverId).toBe('driver-1');
      expect(result.driverName).toBe('Hans Müller');
      expect(result.metrics.routesCompleted).toBe(1);
      expect(result.metrics.deliveriesCompleted).toBe(3);
      expect(result.metrics.parcelsDelivered).toBe(6);
      expect(result.metrics.distanceKm).toBe(50);
      expect(result.grossPayment).toBeGreaterThan(0);
      expect(result.taxWithholding).toBeGreaterThan(0);
      expect(result.netPayment).toBeLessThan(result.grossPayment);
    });

    it('should handle driver with no completed routes', async () => {
      mockPrisma.deliveryRoute.findMany.mockResolvedValue([]);

      const result = await service.calculateDriverPayout(
        'driver-1',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );

      expect(result.metrics.routesCompleted).toBe(0);
      expect(result.grossPayment).toBe(0);
      expect(result.netPayment).toBe(0);
    });

    it('should calculate parcel bonus correctly', async () => {
      const routes = [
        {
          id: 'route-1',
          driverId: 'driver-1',
          status: 'COMPLETED',
          actualDistanceKm: { toNumber: () => 0 },
          driver: { firstName: 'Anna', lastName: 'Schmidt' },
          stops: [
            { parcelCount: 5 }, // 4 extra parcels = 0.80 EUR bonus
          ],
        },
      ];

      mockPrisma.deliveryRoute.findMany.mockResolvedValue(routes);

      const result = await service.calculateDriverPayout(
        'driver-1',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );

      expect(result.breakdown.parcelBonus).toBe(0.80); // 4 * 0.20
    });
  });

  describe('calculateAllDriverPayouts', () => {
    it('should calculate payouts for all drivers', async () => {
      // First call returns unique driver IDs
      mockPrisma.deliveryRoute.findMany
        .mockResolvedValueOnce([
          { driverId: 'driver-1' },
          { driverId: 'driver-2' },
        ])
        // Subsequent calls for individual driver payouts
        .mockResolvedValueOnce([
          {
            id: 'route-1',
            driverId: 'driver-1',
            status: 'COMPLETED',
            actualDistanceKm: { toNumber: () => 50 },
            driver: { firstName: 'Hans', lastName: 'Müller' },
            stops: [{ parcelCount: 3 }],
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'route-2',
            driverId: 'driver-2',
            status: 'COMPLETED',
            actualDistanceKm: { toNumber: () => 40 },
            driver: { firstName: 'Anna', lastName: 'Schmidt' },
            stops: [{ parcelCount: 2 }],
          },
        ]);

      const result = await service.calculateAllDriverPayouts(
        'user-123',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );

      expect(result.drivers).toHaveLength(2);
      expect(result.totals.totalDrivers).toBe(2);
      expect(result.totals.totalDeliveries).toBe(2);
      expect(result.totals.totalGross).toBeGreaterThan(0);
      expect(result.totals.totalNet).toBeLessThan(result.totals.totalGross);
    });

    it('should sort drivers by net payment descending', async () => {
      mockPrisma.deliveryRoute.findMany
        .mockResolvedValueOnce([
          { driverId: 'driver-1' },
          { driverId: 'driver-2' },
        ])
        .mockResolvedValueOnce([
          {
            id: 'route-1',
            driverId: 'driver-1',
            status: 'COMPLETED',
            actualDistanceKm: { toNumber: () => 10 },
            driver: { firstName: 'Hans', lastName: 'Müller' },
            stops: [{ parcelCount: 1 }],
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'route-2',
            driverId: 'driver-2',
            status: 'COMPLETED',
            actualDistanceKm: { toNumber: () => 100 },
            driver: { firstName: 'Anna', lastName: 'Schmidt' },
            stops: [{ parcelCount: 10 }],
          },
        ]);

      const result = await service.calculateAllDriverPayouts(
        'user-123',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );

      // Anna should be first (higher payout)
      expect(result.drivers[0].driverName).toBe('Anna Schmidt');
    });
  });
});
