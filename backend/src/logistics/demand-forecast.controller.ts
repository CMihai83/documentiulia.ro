import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  DemandForecastService,
  Product,
  SalesData,
} from './demand-forecast.service';

// Demand Forecasting Controller
// AI-powered demand prediction for inventory optimization

@Controller('logistics/demand-forecast')
@UseGuards(ThrottlerGuard)
export class DemandForecastController {
  constructor(private readonly forecastService: DemandForecastService) {}

  // =================== PRODUCT MANAGEMENT ===================

  @Post('products')
  registerProduct(@Body() product: Product) {
    if (!product.id || !product.sku || !product.name) {
      throw new HttpException('Product id, sku, and name are required', HttpStatus.BAD_REQUEST);
    }
    return this.forecastService.registerProduct(product);
  }

  @Get('products')
  listProducts(@Query('category') category?: string) {
    return this.forecastService.listProducts(category);
  }

  @Get('products/:id')
  getProduct(@Param('id') id: string) {
    const product = this.forecastService.getProduct(id);
    if (!product) {
      throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
    }
    return product;
  }

  // =================== SALES DATA ===================

  @Post('sales')
  recordSale(@Body() sale: SalesData) {
    if (!sale.productId || sale.quantity === undefined) {
      throw new HttpException('Product ID and quantity are required', HttpStatus.BAD_REQUEST);
    }
    sale.date = new Date(sale.date);
    return this.forecastService.recordSale(sale);
  }

  @Post('sales/batch')
  recordSalesBatch(@Body('sales') sales: SalesData[]) {
    if (!sales || sales.length === 0) {
      throw new HttpException('Sales data is required', HttpStatus.BAD_REQUEST);
    }
    sales.forEach(s => s.date = new Date(s.date));
    const count = this.forecastService.recordSalesBatch(sales);
    return { recorded: count };
  }

  @Get('sales/:productId')
  getSalesHistory(
    @Param('productId') productId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.forecastService.getSalesHistory(
      productId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  // =================== FORECASTING ===================

  @Post('forecast/:productId')
  generateForecast(
    @Param('productId') productId: string,
    @Body() body?: {
      forecastDays?: number;
      includeSeasonality?: boolean;
      includeTrend?: boolean;
      confidenceLevel?: number;
    },
  ) {
    const forecast = this.forecastService.generateForecast(
      productId,
      body?.forecastDays || 30,
      {
        includeSeasonality: body?.includeSeasonality,
        includeTrend: body?.includeTrend,
        confidenceLevel: body?.confidenceLevel,
      },
    );
    if (!forecast) {
      throw new HttpException(
        'Unable to generate forecast. Product not found or insufficient data.',
        HttpStatus.BAD_REQUEST,
      );
    }
    return forecast;
  }

  @Get('forecast/:productId')
  getForecast(@Param('productId') productId: string) {
    const forecast = this.forecastService.getForecast(productId);
    if (!forecast) {
      throw new HttpException('Forecast not found', HttpStatus.NOT_FOUND);
    }
    return forecast;
  }

  // =================== TREND ANALYSIS ===================

  @Get('trend/:productId')
  analyzeTrend(
    @Param('productId') productId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const history = this.forecastService.getSalesHistory(
      productId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
    if (history.length < 2) {
      throw new HttpException('Insufficient data for trend analysis', HttpStatus.BAD_REQUEST);
    }

    const dailyData = history.reduce((acc, sale) => {
      const dateKey = sale.date.toISOString().split('T')[0];
      const existing = acc.find(d => d.date.toISOString().split('T')[0] === dateKey);
      if (existing) {
        existing.quantity += sale.quantity;
      } else {
        acc.push({ date: sale.date, quantity: sale.quantity });
      }
      return acc;
    }, [] as { date: Date; quantity: number }[]);

    return this.forecastService.analyzeTrend(dailyData);
  }

  // =================== SEASONALITY ===================

  @Get('seasonality/:productId')
  detectSeasonality(@Param('productId') productId: string) {
    const product = this.forecastService.getProduct(productId);
    if (!product) {
      throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
    }

    const history = this.forecastService.getSalesHistory(productId);
    if (history.length < 30) {
      throw new HttpException('Insufficient data for seasonality detection', HttpStatus.BAD_REQUEST);
    }

    const dailyData = history.reduce((acc, sale) => {
      const dateKey = sale.date.toISOString().split('T')[0];
      const existing = acc.find(d => d.date.toISOString().split('T')[0] === dateKey);
      if (existing) {
        existing.quantity += sale.quantity;
      } else {
        acc.push({ date: sale.date, quantity: sale.quantity });
      }
      return acc;
    }, [] as { date: Date; quantity: number }[]);

    const seasonality = this.forecastService.detectSeasonality(dailyData, product.category);
    if (!seasonality) {
      return { detected: false, message: 'No significant seasonality detected' };
    }
    return { detected: true, ...seasonality };
  }

  // =================== SAFETY STOCK ===================

  @Get('safety-stock/:productId')
  calculateSafetyStock(
    @Param('productId') productId: string,
    @Query('serviceLevel') serviceLevel?: string,
  ) {
    const recommendation = this.forecastService.calculateSafetyStock(
      productId,
      serviceLevel ? parseFloat(serviceLevel) : 0.95,
    );
    if (!recommendation) {
      throw new HttpException(
        'Unable to calculate safety stock. Product not found or insufficient data.',
        HttpStatus.BAD_REQUEST,
      );
    }
    return recommendation;
  }

  // =================== INVENTORY OPTIMIZATION ===================

  @Get('eoq/:productId')
  calculateEOQ(@Param('productId') productId: string) {
    const optimization = this.forecastService.calculateEOQ(productId);
    if (!optimization) {
      throw new HttpException(
        'Unable to calculate EOQ. Product not found or insufficient data.',
        HttpStatus.BAD_REQUEST,
      );
    }
    return optimization;
  }

  // =================== ANOMALY DETECTION ===================

  @Get('anomalies/:productId')
  detectAnomalies(
    @Param('productId') productId: string,
    @Query('threshold') threshold?: string,
  ) {
    return this.forecastService.detectAnomalies(
      productId,
      threshold ? parseFloat(threshold) : 2.0,
    );
  }

  // =================== FORECAST ACCURACY ===================

  @Post('accuracy/:productId')
  calculateAccuracy(
    @Param('productId') productId: string,
    @Body('actualData') actualData: { date: string; quantity: number }[],
  ) {
    if (!actualData || actualData.length === 0) {
      throw new HttpException('Actual data is required', HttpStatus.BAD_REQUEST);
    }

    const parsedData = actualData.map(d => ({
      date: new Date(d.date),
      quantity: d.quantity,
    }));

    const accuracy = this.forecastService.calculateForecastAccuracy(productId, parsedData);
    if (!accuracy) {
      throw new HttpException(
        'Unable to calculate accuracy. Forecast not found or no matching data.',
        HttpStatus.BAD_REQUEST,
      );
    }
    return accuracy;
  }

  // =================== CATEGORY FORECASTING ===================

  @Post('category/:category')
  generateCategoryForecast(
    @Param('category') category: string,
    @Query('forecastDays') forecastDays?: string,
  ) {
    return this.forecastService.generateCategoryForecast(
      category,
      forecastDays ? parseInt(forecastDays) : 30,
    );
  }

  // =================== SCENARIO ANALYSIS ===================

  @Post('scenario/:productId')
  runScenario(
    @Param('productId') productId: string,
    @Body() body: {
      scenarioName: string;
      assumptions: { factor: string; change: number }[];
    },
  ) {
    if (!body.scenarioName || !body.assumptions || body.assumptions.length === 0) {
      throw new HttpException('Scenario name and assumptions are required', HttpStatus.BAD_REQUEST);
    }

    const scenario = this.forecastService.runScenario(
      productId,
      body.scenarioName,
      body.assumptions,
    );
    if (!scenario) {
      throw new HttpException(
        'Unable to run scenario. Product not found or insufficient data.',
        HttpStatus.BAD_REQUEST,
      );
    }
    return scenario;
  }

  // =================== DASHBOARD ===================

  @Get('dashboard')
  getDashboardData(@Query('productIds') productIds?: string) {
    const ids = productIds ? productIds.split(',') : undefined;
    return this.forecastService.getDashboardData(ids);
  }
}
