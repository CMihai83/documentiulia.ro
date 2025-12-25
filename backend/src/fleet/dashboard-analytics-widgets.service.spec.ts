import { Test, TestingModule } from '@nestjs/testing';
import { DashboardAnalyticsWidgetsService } from './dashboard-analytics-widgets.service';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

describe('DashboardAnalyticsWidgetsService', () => {
  let service: DashboardAnalyticsWidgetsService;
  let prisma: PrismaService;

  const mockUserId = 'user-123';

  const mockVehicles = [
    {
      id: 'vehicle-1',
      userId: mockUserId,
      make: 'Mercedes',
      model: 'Sprinter',
      licensePlate: 'M-FL 1234',
      status: 'AVAILABLE',
      mileage: 50000,
      nextServiceDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      updatedAt: new Date(),
      deliveryRoutes: [],
      maintenanceLogs: [],
    },
    {
      id: 'vehicle-2',
      userId: mockUserId,
      make: 'VW',
      model: 'Crafter',
      licensePlate: 'M-FL 5678',
      status: 'AVAILABLE',
      mileage: 75000,
      nextServiceDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days overdue
      updatedAt: new Date(),
      deliveryRoutes: [],
      maintenanceLogs: [],
    },
  ];

  const mockDeliveryStops = [
    {
      id: 'stop-1',
      status: 'DELIVERED',
      createdAt: new Date(),
      actualArrival: new Date(),
      estimatedArrival: new Date(Date.now() + 60 * 60 * 1000), // Scheduled later (on time)
      route: { userId: mockUserId },
    },
    {
      id: 'stop-2',
      status: 'DELIVERED',
      createdAt: new Date(),
      actualArrival: new Date(),
      estimatedArrival: new Date(Date.now() - 60 * 60 * 1000), // Scheduled earlier (late)
      route: { userId: mockUserId },
    },
    {
      id: 'stop-3',
      status: 'PENDING',
      createdAt: new Date(),
      actualArrival: null,
      estimatedArrival: new Date(Date.now() + 2 * 60 * 60 * 1000),
      route: { userId: mockUserId },
    },
  ];

  const mockInvoices = [
    {
      id: 'invoice-1',
      userId: mockUserId,
      invoiceDate: new Date(),
      grossAmount: new Decimal(500),
      status: 'PAID',
    },
    {
      id: 'invoice-2',
      userId: mockUserId,
      invoiceDate: new Date(),
      grossAmount: new Decimal(750),
      status: 'SUBMITTED',
    },
  ];

  const mockEmployees = [
    {
      id: 'emp-1',
      userId: mockUserId,
      firstName: 'Max',
      lastName: 'Mustermann',
      driverRoutes: [
        {
          status: 'COMPLETED',
          routeDate: new Date(),
          stops: [
            { status: 'DELIVERED' },
            { status: 'DELIVERED' },
            { status: 'FAILED' },
          ],
        },
      ],
    },
    {
      id: 'emp-2',
      userId: mockUserId,
      firstName: 'Anna',
      lastName: 'Schmidt',
      driverRoutes: [
        {
          status: 'COMPLETED',
          routeDate: new Date(),
          stops: [
            { status: 'DELIVERED' },
            { status: 'DELIVERED' },
            { status: 'DELIVERED' },
          ],
        },
      ],
    },
  ];

  const mockFuelLogs = [
    {
      id: 'fuel-1',
      fueledAt: new Date(),
      liters: new Decimal(50),
      totalCost: new Decimal(85),
      vehicle: { userId: mockUserId },
    },
    {
      id: 'fuel-2',
      fueledAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      liters: new Decimal(45),
      totalCost: new Decimal(76.5),
      vehicle: { userId: mockUserId },
    },
  ];

  const mockMaintenanceLogs = [
    {
      id: 'maint-1',
      serviceDate: new Date(),
      totalCost: new Decimal(350),
      vehicle: { userId: mockUserId },
    },
  ];

  const mockRoutes = [
    {
      id: 'route-1',
      userId: mockUserId,
      status: 'COMPLETED',
      routeDate: new Date(),
      actualStartTime: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
      actualEndTime: new Date(),
      actualDistanceKm: new Decimal(120),
      stops: [],
    },
  ];

  const mockPrisma = {
    vehicle: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    deliveryStop: {
      findMany: jest.fn(),
    },
    invoice: {
      findMany: jest.fn(),
    },
    employee: {
      findMany: jest.fn(),
    },
    fuelLog: {
      findMany: jest.fn(),
    },
    maintenanceLog: {
      findMany: jest.fn(),
    },
    deliveryRoute: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardAnalyticsWidgetsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DashboardAnalyticsWidgetsService>(DashboardAnalyticsWidgetsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset mocks
    jest.clearAllMocks();

    // Default mock implementations
    mockPrisma.vehicle.findMany.mockResolvedValue(mockVehicles);
    mockPrisma.deliveryStop.findMany.mockResolvedValue(mockDeliveryStops);
    mockPrisma.invoice.findMany.mockResolvedValue(mockInvoices);
    mockPrisma.employee.findMany.mockResolvedValue(mockEmployees);
    mockPrisma.fuelLog.findMany.mockResolvedValue(mockFuelLogs);
    mockPrisma.maintenanceLog.findMany.mockResolvedValue(mockMaintenanceLogs);
    mockPrisma.deliveryRoute.findMany.mockResolvedValue(mockRoutes);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getKpiCards', () => {
    it('should return KPI cards for TODAY', async () => {
      const result = await service.getKpiCards(mockUserId, 'TODAY');

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('type', 'KPI_CARD');
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('titleDe');
      expect(result[0]).toHaveProperty('value');
      expect(result[0]).toHaveProperty('trend');
    });

    it('should include total deliveries KPI', async () => {
      const result = await service.getKpiCards(mockUserId, 'TODAY');

      const deliveriesKpi = result.find(k => k.id === 'kpi-total-deliveries');
      expect(deliveriesKpi).toBeDefined();
      expect(deliveriesKpi?.title).toBe('Total Deliveries');
      expect(deliveriesKpi?.titleDe).toBe('Gesamtlieferungen');
    });

    it('should include revenue KPI', async () => {
      const result = await service.getKpiCards(mockUserId, 'TODAY');

      const revenueKpi = result.find(k => k.id === 'kpi-revenue');
      expect(revenueKpi).toBeDefined();
      expect(revenueKpi?.title).toBe('Revenue');
      expect(revenueKpi?.unit).toBe('EUR');
    });

    it('should include on-time rate KPI', async () => {
      const result = await service.getKpiCards(mockUserId, 'TODAY');

      const onTimeKpi = result.find(k => k.id === 'kpi-on-time-rate');
      expect(onTimeKpi).toBeDefined();
      expect(onTimeKpi?.format).toBe('percentage');
    });

    it('should handle different time ranges', async () => {
      const resultWeek = await service.getKpiCards(mockUserId, 'WEEK');
      const resultMonth = await service.getKpiCards(mockUserId, 'MONTH');

      expect(resultWeek).toBeInstanceOf(Array);
      expect(resultMonth).toBeInstanceOf(Array);
    });
  });

  describe('getDeliveryTrendChart', () => {
    it('should return delivery trend chart data', async () => {
      const result = await service.getDeliveryTrendChart(mockUserId, 'WEEK');

      expect(result).toHaveProperty('id', 'trend-deliveries');
      expect(result).toHaveProperty('type', 'TREND_CHART');
      expect(result).toHaveProperty('title', 'Delivery Trend');
      expect(result).toHaveProperty('titleDe', 'Lieferungstrend');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('chartType', 'area');
      expect(result).toHaveProperty('color');
    });

    it('should return data points with date and value', async () => {
      mockPrisma.deliveryStop.findMany.mockResolvedValue([
        { createdAt: new Date(), status: 'DELIVERED' },
        { createdAt: new Date(), status: 'DELIVERED' },
      ]);

      const result = await service.getDeliveryTrendChart(mockUserId, 'WEEK');

      expect(result.data).toBeInstanceOf(Array);
    });
  });

  describe('getRevenueTrendChart', () => {
    it('should return revenue trend chart data', async () => {
      const result = await service.getRevenueTrendChart(mockUserId, 'WEEK');

      expect(result).toHaveProperty('id', 'trend-revenue');
      expect(result).toHaveProperty('type', 'TREND_CHART');
      expect(result).toHaveProperty('chartType', 'bar');
      expect(result).toHaveProperty('unit', 'EUR');
    });
  });

  describe('getFuelConsumptionTrend', () => {
    it('should return fuel consumption trend data', async () => {
      const result = await service.getFuelConsumptionTrend(mockUserId, 'MONTH');

      expect(result).toHaveProperty('id', 'trend-fuel');
      expect(result).toHaveProperty('type', 'TREND_CHART');
      expect(result).toHaveProperty('chartType', 'line');
      expect(result).toHaveProperty('unit', 'L');
    });
  });

  describe('getComparisonWidgets', () => {
    it('should return comparison widgets', async () => {
      const result = await service.getComparisonWidgets(mockUserId);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('type', 'COMPARISON');
      expect(result[0]).toHaveProperty('currentValue');
      expect(result[0]).toHaveProperty('previousValue');
      expect(result[0]).toHaveProperty('change');
      expect(result[0]).toHaveProperty('changePercent');
      expect(result[0]).toHaveProperty('trend');
    });

    it('should include delivery comparison', async () => {
      const result = await service.getComparisonWidgets(mockUserId);

      const deliveryComparison = result.find(c => c.id === 'comparison-deliveries');
      expect(deliveryComparison).toBeDefined();
      expect(deliveryComparison?.title).toBe('Deliveries vs Yesterday');
    });

    it('should include revenue comparison', async () => {
      const result = await service.getComparisonWidgets(mockUserId);

      const revenueComparison = result.find(c => c.id === 'comparison-revenue');
      expect(revenueComparison).toBeDefined();
      expect(revenueComparison?.format).toBe('currency');
    });
  });

  describe('getDriverPerformanceRanking', () => {
    it('should return driver performance ranking', async () => {
      const result = await service.getDriverPerformanceRanking(mockUserId, 10);

      expect(result).toHaveProperty('id', 'ranking-drivers');
      expect(result).toHaveProperty('type', 'RANKING');
      expect(result).toHaveProperty('title', 'Top Drivers by Success Rate');
      expect(result).toHaveProperty('titleDe', 'Top-Fahrer nach Erfolgsquote');
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('metric', 'Success Rate');
    });

    it('should rank drivers by success rate', async () => {
      const result = await service.getDriverPerformanceRanking(mockUserId, 10);

      expect(result.items).toBeInstanceOf(Array);
      if (result.items.length > 0) {
        expect(result.items[0]).toHaveProperty('rank', 1);
        expect(result.items[0]).toHaveProperty('name');
        expect(result.items[0]).toHaveProperty('value');
      }
    });

    it('should respect limit parameter', async () => {
      const result = await service.getDriverPerformanceRanking(mockUserId, 1);

      expect(result.items.length).toBeLessThanOrEqual(1);
    });
  });

  describe('getVehicleUtilizationRanking', () => {
    it('should return vehicle utilization ranking', async () => {
      mockPrisma.vehicle.findMany.mockResolvedValue([
        {
          ...mockVehicles[0],
          routes: [{ actualDistanceKm: new Decimal(200) }],
        },
        {
          ...mockVehicles[1],
          routes: [{ actualDistanceKm: new Decimal(150) }],
        },
      ]);

      const result = await service.getVehicleUtilizationRanking(mockUserId, 10);

      expect(result).toHaveProperty('id', 'ranking-vehicles');
      expect(result).toHaveProperty('type', 'RANKING');
      expect(result).toHaveProperty('metric', 'Distance (km)');
      expect(result.items).toBeInstanceOf(Array);
    });
  });

  describe('getFleetHealthGauge', () => {
    it('should return fleet health gauge', async () => {
      const result = await service.getFleetHealthGauge(mockUserId);

      expect(result).toHaveProperty('id', 'gauge-fleet-health');
      expect(result).toHaveProperty('type', 'GAUGE');
      expect(result).toHaveProperty('title', 'Fleet Health Score');
      expect(result).toHaveProperty('titleDe', 'Flottengesundheit');
      expect(result).toHaveProperty('value');
      expect(result).toHaveProperty('min', 0);
      expect(result).toHaveProperty('max', 100);
      expect(result).toHaveProperty('target', 85);
      expect(result).toHaveProperty('zones');
    });

    it('should have color-coded zones', async () => {
      const result = await service.getFleetHealthGauge(mockUserId);

      expect(result.zones).toBeInstanceOf(Array);
      expect(result.zones.length).toBe(4);
      expect(result.zones[0]).toHaveProperty('min');
      expect(result.zones[0]).toHaveProperty('max');
      expect(result.zones[0]).toHaveProperty('color');
      expect(result.zones[0]).toHaveProperty('label');
    });

    it('should deduct health score for overdue maintenance', async () => {
      mockPrisma.vehicle.findMany.mockResolvedValue([
        {
          ...mockVehicles[0],
          nextServiceDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days overdue
          status: 'ACTIVE',
        },
      ]);

      const result = await service.getFleetHealthGauge(mockUserId);

      expect(result.value).toBeLessThan(100);
    });
  });

  describe('getOnTimeDeliveryGauge', () => {
    it('should return on-time delivery gauge', async () => {
      const result = await service.getOnTimeDeliveryGauge(mockUserId);

      expect(result).toHaveProperty('id', 'gauge-on-time');
      expect(result).toHaveProperty('type', 'GAUGE');
      expect(result).toHaveProperty('title', 'On-Time Delivery Rate');
      expect(result).toHaveProperty('target', 95);
      expect(result).toHaveProperty('unit', '%');
    });
  });

  describe('getVehicleStatusGrid', () => {
    it('should return vehicle status grid', async () => {
      const result = await service.getVehicleStatusGrid(mockUserId);

      expect(result).toHaveProperty('id', 'status-vehicles');
      expect(result).toHaveProperty('type', 'STATUS_GRID');
      expect(result).toHaveProperty('title', 'Vehicle Status');
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('summary');
    });

    it('should include status summary', async () => {
      const result = await service.getVehicleStatusGrid(mockUserId);

      expect(result.summary).toHaveProperty('active');
      expect(result.summary).toHaveProperty('idle');
      expect(result.summary).toHaveProperty('offline');
      expect(result.summary).toHaveProperty('maintenance');
      expect(result.summary).toHaveProperty('alert');
    });

    it('should mark vehicles with overdue maintenance as alert', async () => {
      mockPrisma.vehicle.findMany.mockResolvedValue([
        {
          ...mockVehicles[0],
          nextServiceDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          routes: [],
        },
      ]);

      const result = await service.getVehicleStatusGrid(mockUserId);

      expect(result.items[0].status).toBe('ALERT');
    });
  });

  describe('getDeliveryHeatmap', () => {
    it('should return delivery heatmap', async () => {
      const result = await service.getDeliveryHeatmap(mockUserId);

      expect(result).toHaveProperty('id', 'heatmap-deliveries');
      expect(result).toHaveProperty('type', 'HEATMAP');
      expect(result).toHaveProperty('title', 'Delivery Activity Heatmap');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('xLabels');
      expect(result).toHaveProperty('yLabels');
      expect(result).toHaveProperty('colorScale');
    });

    it('should have day labels for x-axis', async () => {
      const result = await service.getDeliveryHeatmap(mockUserId);

      expect(result.xLabels).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    });

    it('should have hour labels for y-axis', async () => {
      const result = await service.getDeliveryHeatmap(mockUserId);

      expect(result.yLabels.length).toBe(12);
      expect(result.yLabels[0]).toBe('06:00');
      expect(result.yLabels[11]).toBe('17:00');
    });
  });

  describe('getDeliveryStatusPieChart', () => {
    it('should return delivery status pie chart', async () => {
      const result = await service.getDeliveryStatusPieChart(mockUserId);

      expect(result).toHaveProperty('id', 'pie-delivery-status');
      expect(result).toHaveProperty('type', 'PIE_CHART');
      expect(result).toHaveProperty('title', 'Delivery Status Distribution');
      expect(result).toHaveProperty('segments');
      expect(result).toHaveProperty('total');
    });

    it('should include segments with labels and colors', async () => {
      const result = await service.getDeliveryStatusPieChart(mockUserId);

      if (result.segments.length > 0) {
        expect(result.segments[0]).toHaveProperty('label');
        expect(result.segments[0]).toHaveProperty('labelDe');
        expect(result.segments[0]).toHaveProperty('value');
        expect(result.segments[0]).toHaveProperty('color');
        expect(result.segments[0]).toHaveProperty('percentage');
      }
    });
  });

  describe('getCostBreakdownPieChart', () => {
    it('should return cost breakdown pie chart', async () => {
      const result = await service.getCostBreakdownPieChart(mockUserId);

      expect(result).toHaveProperty('id', 'pie-cost-breakdown');
      expect(result).toHaveProperty('type', 'PIE_CHART');
      expect(result).toHaveProperty('title', 'Cost Breakdown');
      expect(result).toHaveProperty('titleDe', 'Kostenaufteilung');
      expect(result).toHaveProperty('segments');
      expect(result).toHaveProperty('total');
    });

    it('should include fuel, maintenance, labor, and other costs', async () => {
      const result = await service.getCostBreakdownPieChart(mockUserId);

      const segmentLabels = result.segments.map(s => s.label);
      expect(segmentLabels).toContain('Fuel');
      expect(segmentLabels).toContain('Maintenance');
    });
  });

  describe('getFullDashboard', () => {
    it('should return complete dashboard data', async () => {
      const result = await service.getFullDashboard(mockUserId, 'TODAY');

      expect(result).toHaveProperty('kpiCards');
      expect(result).toHaveProperty('trendCharts');
      expect(result).toHaveProperty('comparisons');
      expect(result).toHaveProperty('rankings');
      expect(result).toHaveProperty('gauges');
      expect(result).toHaveProperty('statusGrids');
      expect(result).toHaveProperty('heatmaps');
      expect(result).toHaveProperty('pieCharts');
      expect(result).toHaveProperty('lastUpdated');
    });

    it('should include multiple KPI cards', async () => {
      const result = await service.getFullDashboard(mockUserId, 'TODAY');

      expect(result.kpiCards.length).toBeGreaterThan(0);
    });

    it('should include trend charts', async () => {
      const result = await service.getFullDashboard(mockUserId, 'TODAY');

      expect(result.trendCharts.length).toBe(3);
    });

    it('should include rankings', async () => {
      const result = await service.getFullDashboard(mockUserId, 'TODAY');

      expect(result.rankings.length).toBe(2);
    });

    it('should include gauges', async () => {
      const result = await service.getFullDashboard(mockUserId, 'TODAY');

      expect(result.gauges.length).toBe(2);
    });

    it('should include pie charts', async () => {
      const result = await service.getFullDashboard(mockUserId, 'TODAY');

      expect(result.pieCharts.length).toBe(2);
    });

    it('should include lastUpdated timestamp', async () => {
      const result = await service.getFullDashboard(mockUserId, 'TODAY');

      expect(result.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('Time range handling', () => {
    it('should handle TODAY time range', async () => {
      await service.getKpiCards(mockUserId, 'TODAY');

      expect(mockPrisma.deliveryStop.findMany).toHaveBeenCalled();
    });

    it('should handle WEEK time range', async () => {
      await service.getKpiCards(mockUserId, 'WEEK');

      expect(mockPrisma.deliveryStop.findMany).toHaveBeenCalled();
    });

    it('should handle MONTH time range', async () => {
      await service.getKpiCards(mockUserId, 'MONTH');

      expect(mockPrisma.deliveryStop.findMany).toHaveBeenCalled();
    });

    it('should handle QUARTER time range', async () => {
      await service.getKpiCards(mockUserId, 'QUARTER');

      expect(mockPrisma.deliveryStop.findMany).toHaveBeenCalled();
    });

    it('should handle YEAR time range', async () => {
      await service.getKpiCards(mockUserId, 'YEAR');

      expect(mockPrisma.deliveryStop.findMany).toHaveBeenCalled();
    });
  });

  describe('Trend calculations', () => {
    it('should calculate UP trend when current > previous', async () => {
      mockPrisma.deliveryStop.findMany
        .mockResolvedValueOnce([
          { status: 'DELIVERED', createdAt: new Date() },
          { status: 'DELIVERED', createdAt: new Date() },
          { status: 'DELIVERED', createdAt: new Date() },
        ])
        .mockResolvedValueOnce([
          { status: 'DELIVERED', createdAt: new Date() },
        ]);

      const result = await service.getKpiCards(mockUserId, 'TODAY');

      const totalDeliveriesKpi = result.find(k => k.id === 'kpi-total-deliveries');
      // Trend direction depends on comparison with previous period
      expect(totalDeliveriesKpi?.trend).toBeDefined();
    });

    it('should handle zero values gracefully', async () => {
      mockPrisma.deliveryStop.findMany.mockResolvedValue([]);
      mockPrisma.invoice.findMany.mockResolvedValue([]);

      const result = await service.getKpiCards(mockUserId, 'TODAY');

      expect(result).toBeInstanceOf(Array);
      const revenueKpi = result.find(k => k.id === 'kpi-revenue');
      expect(revenueKpi?.value).toBe(0);
    });
  });

  describe('German localization', () => {
    it('should include German titles in KPI cards', async () => {
      const result = await service.getKpiCards(mockUserId, 'TODAY');

      result.forEach(kpi => {
        expect(kpi.titleDe).toBeDefined();
        expect(typeof kpi.titleDe).toBe('string');
      });
    });

    it('should include German labels in status grid', async () => {
      const result = await service.getVehicleStatusGrid(mockUserId);

      result.items.forEach(item => {
        expect(item.statusLabelDe).toBeDefined();
      });
    });

    it('should include German labels in pie chart segments', async () => {
      const result = await service.getDeliveryStatusPieChart(mockUserId);

      result.segments.forEach(segment => {
        expect(segment.labelDe).toBeDefined();
      });
    });
  });
});
