import { Test, TestingModule } from '@nestjs/testing';
import { CourierService } from './courier.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CourierProvider } from './dto/courier.dto';

describe('CourierService', () => {
  let service: CourierService;
  let prisma: PrismaService;
  let configService: ConfigService;

  const mockPrisma = {
    courierDelivery: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        DPD_API_URL: 'https://api.dpd.de',
        DPD_API_KEY: '', // Empty to trigger mock mode
        GLS_API_URL: 'https://api.gls.de',
        GLS_API_KEY: '',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourierService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<CourierService>(CourierService);
    prisma = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('trackParcel', () => {
    it('should return mock tracking for DPD parcel', async () => {
      const result = await service.trackParcel('00340000000000001234', CourierProvider.DPD);

      expect(result).toBeDefined();
      expect(result.trackingNumber).toBe('00340000000000001234');
      expect(result.provider).toBe(CourierProvider.DPD);
      expect(result.events).toBeInstanceOf(Array);
      expect(result.events.length).toBeGreaterThan(0);
    });

    it('should return mock tracking for GLS parcel', async () => {
      const result = await service.trackParcel('GLS123456789', CourierProvider.GLS);

      expect(result).toBeDefined();
      expect(result.trackingNumber).toBe('GLS123456789');
      expect(result.provider).toBe(CourierProvider.GLS);
      expect(result.status).toBeDefined();
    });

    it('should throw error for unsupported DHL provider', async () => {
      // DHL tracking not implemented yet - only DPD and GLS supported
      await expect(
        service.trackParcel('JJD12345678', CourierProvider.DHL)
      ).rejects.toThrow('Unsupported courier provider: DHL');
    });
  });

  describe('createDPDShipment', () => {
    it('should create a DPD shipment request', async () => {
      const shipmentData = {
        sender: {
          name: 'Test Sender',
          street: 'Test Street 1',
          postalCode: '80331',
          city: 'München',
          country: 'DE',
        },
        recipient: {
          name: 'Test Recipient',
          street: 'Recipient Street 5',
          postalCode: '80333',
          city: 'München',
          country: 'DE',
          phone: '+49123456789',
          email: 'test@example.com',
        },
        parcels: [{ weight: 5.5, length: 30, width: 20, height: 15 }],
        services: { express: false, saturdayDelivery: false },
      };

      const result = await service.createDPDShipment(shipmentData);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.trackingNumber).toBeDefined();
      expect(result.labelUrl).toBeDefined();
    });
  });

  describe('createGLSShipment', () => {
    it('should create a GLS shipment request', async () => {
      const shipmentData = {
        sender: {
          name: 'Test Shipper',
          street: 'Shipper Street 1',
          postalCode: '80331',
          city: 'München',
          country: 'DE',
        },
        recipient: {
          name: 'Test Consignee',
          street: 'Consignee Street 5',
          postalCode: '80333',
          city: 'München',
          country: 'DE',
          phone: '+49123456789',
        },
        parcels: [{ weight: 3.0 }],
        references: ['ORDER-123'],
      };

      const result = await service.createGLSShipment(shipmentData);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.trackingNumber).toBeDefined();
    });
  });

  describe('importSubcontractorDeliveries', () => {
    it('should import delivery records from subcontractor for date range', async () => {
      // Mock internal fetch - the method fetches from API and creates records
      mockPrisma.courierDelivery.createMany.mockResolvedValue({ count: 2 });

      const result = await service.importSubcontractorDeliveries(
        'user-123',
        CourierProvider.DPD,
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );

      expect(result).toBeDefined();
      expect(result.imported).toBeDefined();
      expect(result.total).toBeDefined();
    });
  });

  describe('getDeliverySummary', () => {
    it('should return delivery summary for a month', async () => {
      // Mock findMany to return delivery records
      mockPrisma.courierDelivery.findMany.mockResolvedValue([
        { status: 'DELIVERED', amount: 15.00 },
        { status: 'DELIVERED', amount: 12.50 },
        { status: 'FAILED', amount: 0 },
      ]);

      const result = await service.getDeliverySummary('user-123', CourierProvider.DPD, '2024-01');

      expect(result).toBeDefined();
      expect(result.totalDeliveries).toBe(3);
      expect(result.successfulDeliveries).toBe(2);
      expect(result.failedDeliveries).toBe(1);
    });
  });

  describe('trackParcel with different providers', () => {
    it('should return correct provider for DPD tracking', async () => {
      const result = await service.trackParcel('00340434567890123456', CourierProvider.DPD);
      expect(result.provider).toBe(CourierProvider.DPD);
    });

    it('should return correct provider for GLS tracking', async () => {
      const result = await service.trackParcel('GLS987654321', CourierProvider.GLS);
      expect(result.provider).toBe(CourierProvider.GLS);
    });

    it('should throw error for unsupported provider', async () => {
      await expect(
        service.trackParcel('TEST123', 'UNKNOWN' as CourierProvider)
      ).rejects.toThrow('Unsupported courier provider');
    });
  });
});
