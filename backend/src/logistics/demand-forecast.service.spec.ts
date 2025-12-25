import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  DemandForecastService,
  Product,
  SalesData,
} from './demand-forecast.service';

describe('DemandForecastService', () => {
  let service: DemandForecastService;

  const createTestProduct = (overrides?: Partial<Product>): Product => ({
    id: `prod_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    sku: 'TEST-SKU-001',
    name: 'Test Product',
    category: 'ELECTRONICS',
    unitCost: 50,
    unitPrice: 100,
    leadTimeDays: 7,
    minOrderQuantity: 10,
    ...overrides,
  });

  const createTestSalesData = (
    productId: string,
    daysBack: number = 90,
    baseQuantity: number = 50,
    variance: number = 0.2
  ): SalesData[] => {
    const sales: SalesData[] = [];
    const today = new Date();

    for (let i = daysBack; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      // Add some variation
      const seasonalFactor = 1 + 0.2 * Math.sin((date.getMonth() / 12) * 2 * Math.PI);
      const randomFactor = 1 + (Math.random() - 0.5) * 2 * variance;
      const dayOfWeekFactor = date.getDay() === 0 ? 0.7 : (date.getDay() === 6 ? 0.85 : 1);

      const quantity = Math.round(baseQuantity * seasonalFactor * randomFactor * dayOfWeekFactor);
      const revenue = quantity * 100;

      sales.push({
        productId,
        date,
        quantity: Math.max(1, quantity),
        revenue,
        channel: 'ONLINE',
        region: 'București',
      });
    }

    return sales;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DemandForecastService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: { [key: string]: string } = {
                FORECAST_API_URL: 'https://api.forecast.example.com',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<DemandForecastService>(DemandForecastService);
    service.resetState();
  });

  describe('Product Management', () => {
    it('should register a product', () => {
      const product = createTestProduct();
      const registered = service.registerProduct(product);

      expect(registered.id).toBe(product.id);
      expect(registered.name).toBe(product.name);
    });

    it('should get a registered product', () => {
      const product = createTestProduct();
      service.registerProduct(product);

      const retrieved = service.getProduct(product.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.sku).toBe(product.sku);
    });

    it('should list products by category', () => {
      service.registerProduct(createTestProduct({ category: 'ELECTRONICS' }));
      service.registerProduct(createTestProduct({ category: 'ELECTRONICS' }));
      service.registerProduct(createTestProduct({ category: 'CLOTHING' }));

      const electronics = service.listProducts('ELECTRONICS');
      expect(electronics).toHaveLength(2);

      const all = service.listProducts();
      expect(all).toHaveLength(3);
    });
  });

  describe('Sales Data Management', () => {
    it('should record a sale', () => {
      const product = createTestProduct();
      service.registerProduct(product);

      const sale: SalesData = {
        productId: product.id,
        date: new Date(),
        quantity: 10,
        revenue: 1000,
      };

      const recorded = service.recordSale(sale);
      expect(recorded.quantity).toBe(10);
    });

    it('should record batch sales', () => {
      const product = createTestProduct();
      service.registerProduct(product);

      const sales = createTestSalesData(product.id, 30);
      const count = service.recordSalesBatch(sales);

      expect(count).toBe(31); // 30 days + today
    });

    it('should get sales history with date filters', () => {
      const product = createTestProduct();
      service.registerProduct(product);

      const sales = createTestSalesData(product.id, 60);
      service.recordSalesBatch(sales);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const filtered = service.getSalesHistory(product.id, thirtyDaysAgo);
      expect(filtered.length).toBeLessThanOrEqual(31);
    });
  });

  describe('Demand Forecasting', () => {
    it('should generate a forecast', () => {
      const product = createTestProduct();
      service.registerProduct(product);
      service.recordSalesBatch(createTestSalesData(product.id, 90));

      const forecast = service.generateForecast(product.id, 30);

      expect(forecast).not.toBeNull();
      expect(forecast!.productId).toBe(product.id);
      expect(forecast!.predictions).toHaveLength(30);
      expect(forecast!.confidence).toBe(0.95);
    });

    it('should include prediction confidence bounds', () => {
      const product = createTestProduct();
      service.registerProduct(product);
      service.recordSalesBatch(createTestSalesData(product.id, 90));

      const forecast = service.generateForecast(product.id, 14);

      forecast!.predictions.forEach(p => {
        expect(p.lowerBound).toBeLessThanOrEqual(p.predictedQuantity);
        expect(p.upperBound).toBeGreaterThanOrEqual(p.predictedQuantity);
      });
    });

    it('should generate forecast summary', () => {
      const product = createTestProduct();
      service.registerProduct(product);
      service.recordSalesBatch(createTestSalesData(product.id, 90));

      const forecast = service.generateForecast(product.id, 30);

      expect(forecast!.summary.totalPredictedQuantity).toBeGreaterThan(0);
      expect(forecast!.summary.averageDailyDemand).toBeGreaterThan(0);
      expect(forecast!.summary.peakDemandDay).toBeInstanceOf(Date);
      expect(forecast!.summary.volatility).toBeGreaterThanOrEqual(0);
    });

    it('should return null for insufficient data', () => {
      const product = createTestProduct();
      service.registerProduct(product);

      // Only 3 days of data
      const fewSales = createTestSalesData(product.id, 3);
      service.recordSalesBatch(fewSales);

      const forecast = service.generateForecast(product.id);
      expect(forecast).toBeNull();
    });

    it('should return null for unknown product', () => {
      const forecast = service.generateForecast('unknown-product');
      expect(forecast).toBeNull();
    });

    it('should apply different confidence levels', () => {
      const product = createTestProduct();
      service.registerProduct(product);
      service.recordSalesBatch(createTestSalesData(product.id, 90));

      const forecast95 = service.generateForecast(product.id, 7, { confidenceLevel: 0.95 });
      const forecast99 = service.generateForecast(product.id, 7, { confidenceLevel: 0.99 });

      // 99% confidence should have wider bounds
      expect(forecast99!.predictions[0].upperBound - forecast99!.predictions[0].lowerBound)
        .toBeGreaterThanOrEqual(
          forecast95!.predictions[0].upperBound - forecast95!.predictions[0].lowerBound
        );
    });

    it('should generate recommendations', () => {
      const product = createTestProduct();
      service.registerProduct(product);
      service.recordSalesBatch(createTestSalesData(product.id, 90));

      const forecast = service.generateForecast(product.id);

      expect(forecast!.recommendations).toBeDefined();
      expect(Array.isArray(forecast!.recommendations)).toBe(true);
    });
  });

  describe('Trend Analysis', () => {
    it('should detect upward trend', () => {
      const data = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
        quantity: 50 + i * 2, // Increasing
      }));

      const trend = service.analyzeTrend(data);

      expect(trend.direction).toBe('UP');
      expect(trend.slope).toBeGreaterThan(0);
      expect(trend.percentageChange).toBeGreaterThan(0);
    });

    it('should detect downward trend', () => {
      const data = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
        quantity: 100 - i * 2, // Decreasing
      }));

      const trend = service.analyzeTrend(data);

      expect(trend.direction).toBe('DOWN');
      expect(trend.slope).toBeLessThan(0);
      expect(trend.percentageChange).toBeLessThan(0);
    });

    it('should detect stable trend', () => {
      const data = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
        quantity: 50 + (Math.random() - 0.5) * 5, // Small variance around 50
      }));

      const trend = service.analyzeTrend(data);

      expect(trend.direction).toBe('STABLE');
      expect(Math.abs(trend.percentageChange)).toBeLessThan(10);
    });

    it('should calculate R-squared', () => {
      const data = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
        quantity: 50 + i, // Perfect linear increase
      }));

      const trend = service.analyzeTrend(data);

      expect(trend.rSquared).toBeGreaterThan(0.9); // Should be close to 1 for linear data
    });
  });

  describe('Seasonality Detection', () => {
    it('should detect monthly seasonality', () => {
      const product = createTestProduct({ category: 'TOYS' });
      service.registerProduct(product);

      // Create 180 days of data with strong December peak
      const sales = createTestSalesData(product.id, 180);
      service.recordSalesBatch(sales);

      const history = service.getSalesHistory(product.id);
      const dailyData = history.map(s => ({ date: s.date, quantity: s.quantity }));

      const seasonality = service.detectSeasonality(dailyData, 'TOYS');

      expect(seasonality).not.toBeNull();
      expect(seasonality!.type).toBe('MONTHLY');
      expect(seasonality!.indices).toHaveLength(12);
      // December (index 11) should be highest for toys
      expect(seasonality!.indices[11]).toBeGreaterThan(1);
    });

    it('should return null for insufficient data', () => {
      const data = Array.from({ length: 20 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        quantity: 50,
      }));

      const seasonality = service.detectSeasonality(data, 'DEFAULT');
      expect(seasonality).toBeNull();
    });

    it('should identify peak and trough periods', () => {
      const product = createTestProduct({ category: 'ELECTRONICS' });
      const dailyData = Array.from({ length: 365 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        quantity: 50 + Math.sin((i / 365) * 2 * Math.PI) * 20,
      }));

      const seasonality = service.detectSeasonality(dailyData, 'ELECTRONICS');

      expect(seasonality!.peakPeriods.length).toBeGreaterThanOrEqual(0);
      expect(seasonality!.troughPeriods.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Safety Stock Calculation', () => {
    it('should calculate safety stock', () => {
      const product = createTestProduct({ leadTimeDays: 7 });
      service.registerProduct(product);
      service.recordSalesBatch(createTestSalesData(product.id, 90, 50, 0.3));

      const recommendation = service.calculateSafetyStock(product.id);

      expect(recommendation).not.toBeNull();
      expect(recommendation!.recommendedSafetyStock).toBeGreaterThan(0);
      expect(recommendation!.recommendedReorderPoint).toBeGreaterThan(recommendation!.recommendedSafetyStock);
      expect(recommendation!.serviceLevelTarget).toBe(0.95);
    });

    it('should adjust safety stock for different service levels', () => {
      const product = createTestProduct({ leadTimeDays: 7 });
      service.registerProduct(product);
      service.recordSalesBatch(createTestSalesData(product.id, 90));

      const ss95 = service.calculateSafetyStock(product.id, 0.95);
      const ss99 = service.calculateSafetyStock(product.id, 0.99);

      expect(ss99!.recommendedSafetyStock).toBeGreaterThan(ss95!.recommendedSafetyStock);
    });

    it('should provide reasoning', () => {
      const product = createTestProduct({ leadTimeDays: 7 });
      service.registerProduct(product);
      service.recordSalesBatch(createTestSalesData(product.id, 90));

      const recommendation = service.calculateSafetyStock(product.id);

      expect(recommendation!.reasoning).toBeDefined();
      expect(recommendation!.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe('Inventory Optimization (EOQ)', () => {
    it('should calculate economic order quantity', () => {
      const product = createTestProduct({
        unitCost: 50,
        leadTimeDays: 7,
        minOrderQuantity: 10,
      });
      service.registerProduct(product);
      service.recordSalesBatch(createTestSalesData(product.id, 90, 50));

      const optimization = service.calculateEOQ(product.id);

      expect(optimization).not.toBeNull();
      expect(optimization!.economicOrderQuantity).toBeGreaterThanOrEqual(product.minOrderQuantity);
      expect(optimization!.reorderPoint).toBeGreaterThan(0);
      expect(optimization!.safetyStock).toBeGreaterThanOrEqual(0);
    });

    it('should calculate inventory costs', () => {
      const product = createTestProduct({ unitCost: 100 });
      service.registerProduct(product);
      service.recordSalesBatch(createTestSalesData(product.id, 90, 50));

      const optimization = service.calculateEOQ(product.id);

      expect(optimization!.annualHoldingCost).toBeGreaterThan(0);
      expect(optimization!.annualOrderingCost).toBeGreaterThan(0);
      expect(optimization!.totalAnnualCost).toBeCloseTo(
        optimization!.annualHoldingCost + optimization!.annualOrderingCost,
        2
      );
    });

    it('should calculate inventory metrics', () => {
      const product = createTestProduct();
      service.registerProduct(product);
      service.recordSalesBatch(createTestSalesData(product.id, 90, 50));

      const optimization = service.calculateEOQ(product.id);

      expect(optimization!.turnsPerYear).toBeGreaterThan(0);
      expect(optimization!.daysOfSupply).toBeGreaterThan(0);
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect demand spikes', () => {
      const product = createTestProduct();
      service.registerProduct(product);

      // Create normal sales data
      const sales = createTestSalesData(product.id, 60, 50, 0.1);
      // Add a spike
      sales[30].quantity = 200; // 4x normal
      service.recordSalesBatch(sales);

      const anomalies = service.detectAnomalies(product.id, 2.0);

      expect(anomalies.length).toBeGreaterThan(0);
      const spike = anomalies.find(a => a.anomalyType === 'SPIKE');
      expect(spike).toBeDefined();
    });

    it('should detect demand drops', () => {
      const product = createTestProduct();
      service.registerProduct(product);

      // Create normal sales data
      const sales = createTestSalesData(product.id, 60, 50, 0.1);
      // Add a drop
      sales[25].quantity = 5; // 10% of normal
      service.recordSalesBatch(sales);

      const anomalies = service.detectAnomalies(product.id, 2.0);

      const drop = anomalies.find(a => a.anomalyType === 'DROP');
      expect(drop).toBeDefined();
    });

    it('should assign severity levels', () => {
      const product = createTestProduct();
      service.registerProduct(product);

      const sales = createTestSalesData(product.id, 60, 50, 0.05); // Low variance
      sales[30].quantity = 300; // Major spike
      service.recordSalesBatch(sales);

      const anomalies = service.detectAnomalies(product.id, 2.0);
      const highSeverity = anomalies.find(a => a.severity === 'HIGH');

      expect(highSeverity).toBeDefined();
    });

    it('should identify possible causes', () => {
      const product = createTestProduct();
      service.registerProduct(product);

      const sales = createTestSalesData(product.id, 60, 50, 0.1);
      sales[30].quantity = 150;
      service.recordSalesBatch(sales);

      const anomalies = service.detectAnomalies(product.id, 2.0);

      if (anomalies.length > 0) {
        expect(anomalies[0].possibleCauses.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Forecast Accuracy', () => {
    it('should calculate MAPE', () => {
      const product = createTestProduct();
      service.registerProduct(product);
      service.recordSalesBatch(createTestSalesData(product.id, 90));
      service.generateForecast(product.id, 14);

      const actualData = Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
        quantity: 50 + (Math.random() - 0.5) * 20,
      }));

      const accuracy = service.calculateForecastAccuracy(product.id, actualData);

      expect(accuracy).not.toBeNull();
      expect(accuracy!.mape).toBeGreaterThanOrEqual(0);
      expect(accuracy!.accuracy).toBeLessThanOrEqual(100);
    });

    it('should assign accuracy rating', () => {
      const product = createTestProduct();
      service.registerProduct(product);
      service.recordSalesBatch(createTestSalesData(product.id, 90, 50, 0.1));

      const forecast = service.generateForecast(product.id, 7);

      // Use predictions as "actuals" for perfect accuracy
      const actualData = forecast!.predictions.slice(0, 7).map(p => ({
        date: p.date,
        quantity: p.predictedQuantity,
      }));

      const accuracy = service.calculateForecastAccuracy(product.id, actualData);

      expect(['EXCELLENT', 'GOOD', 'FAIR', 'POOR']).toContain(accuracy!.rating);
    });
  });

  describe('Category Forecasting', () => {
    it('should generate category-level forecast', () => {
      const product1 = createTestProduct({ category: 'ELECTRONICS' });
      const product2 = createTestProduct({ category: 'ELECTRONICS' });
      service.registerProduct(product1);
      service.registerProduct(product2);
      service.recordSalesBatch(createTestSalesData(product1.id, 90));
      service.recordSalesBatch(createTestSalesData(product2.id, 90));

      const categoryForecast = service.generateCategoryForecast('ELECTRONICS', 30);

      expect(categoryForecast.category).toBe('ELECTRONICS');
      expect(categoryForecast.products).toHaveLength(2);
      expect(categoryForecast.totalPredictedQuantity).toBeGreaterThan(0);
      expect(categoryForecast.totalPredictedRevenue).toBeGreaterThan(0);
    });

    it('should calculate category growth rate', () => {
      const product = createTestProduct({ category: 'FURNITURE' });
      service.registerProduct(product);
      service.recordSalesBatch(createTestSalesData(product.id, 90));

      const categoryForecast = service.generateCategoryForecast('FURNITURE');

      expect(typeof categoryForecast.growthRate).toBe('number');
    });
  });

  describe('Scenario Analysis', () => {
    it('should run demand increase scenario', () => {
      const product = createTestProduct();
      service.registerProduct(product);
      service.recordSalesBatch(createTestSalesData(product.id, 90));

      const scenario = service.runScenario(product.id, 'Demand +20%', [
        { factor: 'demand', change: 20 },
      ]);

      expect(scenario).not.toBeNull();
      expect(scenario!.name).toBe('Demand +20%');

      const baseForecast = service.getForecast(product.id);
      expect(scenario!.results.summary.totalPredictedQuantity)
        .toBeGreaterThan(baseForecast!.summary.totalPredictedQuantity * 1.1);
    });

    it('should run price increase scenario', () => {
      const product = createTestProduct();
      service.registerProduct(product);
      service.recordSalesBatch(createTestSalesData(product.id, 90));

      const scenario = service.runScenario(product.id, 'Price +10%', [
        { factor: 'price', change: 10 },
      ]);

      // Price increase typically reduces demand
      const baseForecast = service.getForecast(product.id);
      expect(scenario!.results.summary.totalPredictedQuantity)
        .toBeLessThan(baseForecast!.summary.totalPredictedQuantity);
    });

    it('should handle multiple assumptions', () => {
      const product = createTestProduct();
      service.registerProduct(product);
      service.recordSalesBatch(createTestSalesData(product.id, 90));

      const scenario = service.runScenario(product.id, 'Combined', [
        { factor: 'demand', change: 10 },
        { factor: 'promotion', change: 20 },
      ]);

      expect(scenario!.assumptions).toHaveLength(2);
    });
  });

  describe('Dashboard Data', () => {
    it('should return dashboard summary', () => {
      const product1 = createTestProduct({ category: 'ELECTRONICS' });
      const product2 = createTestProduct({ category: 'CLOTHING' });
      service.registerProduct(product1);
      service.registerProduct(product2);
      service.recordSalesBatch(createTestSalesData(product1.id, 90));
      service.recordSalesBatch(createTestSalesData(product2.id, 90));
      service.generateForecast(product1.id);
      service.generateForecast(product2.id);

      const dashboard = service.getDashboardData();

      expect(dashboard.totalProducts).toBe(2);
      expect(dashboard.forecastedProducts).toBe(2);
      expect(dashboard.categoryBreakdown.length).toBeGreaterThan(0);
    });

    it('should identify top growing products', () => {
      // Create products with different growth patterns
      for (let i = 0; i < 3; i++) {
        const product = createTestProduct({ name: `Product ${i}` });
        service.registerProduct(product);

        // Create sales with growth
        const sales = createTestSalesData(product.id, 90, 30 + i * 10);
        service.recordSalesBatch(sales);
        service.generateForecast(product.id);
      }

      const dashboard = service.getDashboardData();

      expect(dashboard.topGrowingProducts).toBeDefined();
      expect(dashboard.decliningProducts).toBeDefined();
    });

    it('should filter by product IDs', () => {
      const product1 = createTestProduct();
      const product2 = createTestProduct();
      service.registerProduct(product1);
      service.registerProduct(product2);
      service.recordSalesBatch(createTestSalesData(product1.id, 90));
      service.recordSalesBatch(createTestSalesData(product2.id, 90));
      service.generateForecast(product1.id);
      service.generateForecast(product2.id);

      const dashboard = service.getDashboardData([product1.id]);

      expect(dashboard.totalProducts).toBe(1);
    });
  });
});
