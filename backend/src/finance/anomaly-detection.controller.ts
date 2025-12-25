import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import {
  AnomalyDetectionService,
  Transaction,
  DetectionConfig,
} from './anomaly-detection.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Finance - Anomaly Detection')
@ApiBearerAuth()
@Controller('finance/anomaly-detection')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnomalyDetectionController {
  constructor(private readonly anomalyService: AnomalyDetectionService) {}

  // =================== TRANSACTION ANALYSIS ===================

  @Post('analyze')
  @ApiOperation({ summary: 'Analyze a single transaction for anomalies' })
  @ApiResponse({ status: 200, description: 'Anomaly analysis result' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        amount: { type: 'number' },
        currency: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
        category: { type: 'string' },
        customerId: { type: 'string' },
        location: {
          type: 'object',
          properties: {
            country: { type: 'string' },
            city: { type: 'string' },
          },
        },
      },
      required: ['id', 'amount', 'currency', 'timestamp', 'customerId'],
    },
  })
  async analyzeTransaction(@Body() transaction: Transaction) {
    // Convert timestamp string to Date if needed
    if (typeof transaction.timestamp === 'string') {
      transaction.timestamp = new Date(transaction.timestamp);
    }
    return this.anomalyService.analyzeTransaction(transaction);
  }

  @Post('analyze/batch')
  @ApiOperation({ summary: 'Analyze multiple transactions for anomalies' })
  @ApiResponse({ status: 200, description: 'Batch anomaly analysis results' })
  async analyzeTransactions(@Body() transactions: Transaction[]) {
    // Convert timestamps
    for (const t of transactions) {
      if (typeof t.timestamp === 'string') {
        t.timestamp = new Date(t.timestamp);
      }
    }
    return this.anomalyService.analyzeTransactions(transactions);
  }

  // =================== PATTERN MANAGEMENT ===================

  @Get('patterns')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get all customer patterns' })
  @ApiResponse({ status: 200, description: 'List of customer patterns' })
  getAllPatterns() {
    return {
      patterns: this.anomalyService.getAllPatterns(),
    };
  }

  @Get('patterns/:customerId')
  @ApiOperation({ summary: 'Get pattern for a specific customer' })
  @ApiResponse({ status: 200, description: 'Customer transaction pattern' })
  getPattern(@Param('customerId') customerId: string) {
    const pattern = this.anomalyService.getPattern(customerId);
    if (!pattern) {
      return { error: 'No pattern found for customer', customerId };
    }
    return pattern;
  }

  @Post('patterns/:customerId/build')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Build pattern from historical transactions' })
  @ApiResponse({ status: 200, description: 'Built pattern' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        transactions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              amount: { type: 'number' },
              currency: { type: 'string' },
              timestamp: { type: 'string' },
              customerId: { type: 'string' },
            },
          },
        },
      },
    },
  })
  buildPattern(
    @Param('customerId') customerId: string,
    @Body('transactions') transactions: Transaction[],
  ) {
    // Convert timestamps
    for (const t of transactions) {
      if (typeof t.timestamp === 'string') {
        t.timestamp = new Date(t.timestamp);
      }
    }
    return this.anomalyService.buildPatternFromHistory(customerId, transactions);
  }

  @Delete('patterns')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Clear all patterns' })
  @ApiResponse({ status: 200, description: 'Patterns cleared' })
  clearPatterns() {
    this.anomalyService.clearPatterns();
    return { success: true, message: 'All patterns cleared' };
  }

  // =================== RISK REPORTS ===================

  @Get('risk-report/:customerId')
  @ApiOperation({ summary: 'Generate risk report for a customer' })
  @ApiResponse({ status: 200, description: 'Customer risk report' })
  getRiskReport(@Param('customerId') customerId: string) {
    return this.anomalyService.generateRiskReport(customerId);
  }

  // =================== CONFIGURATION ===================

  @Get('config')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get detection configuration' })
  @ApiResponse({ status: 200, description: 'Current configuration' })
  getConfig() {
    return this.anomalyService.getConfig();
  }

  @Put('config')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update detection configuration' })
  @ApiResponse({ status: 200, description: 'Updated configuration' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        zscoreThreshold: { type: 'number' },
        iqrMultiplier: { type: 'number' },
        velocityWindow: { type: 'number' },
        velocityThreshold: { type: 'number' },
        minTransactionsForPattern: { type: 'number' },
      },
    },
  })
  updateConfig(@Body() config: Partial<DetectionConfig>) {
    return this.anomalyService.updateConfig(config);
  }

  // =================== STATISTICS ===================

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get anomaly detection statistics' })
  @ApiResponse({ status: 200, description: 'Detection statistics' })
  getStats() {
    return this.anomalyService.getStats();
  }

  @Post('stats/reset')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reset statistics' })
  @ApiResponse({ status: 200, description: 'Statistics reset' })
  resetStats() {
    this.anomalyService.resetStats();
    return { success: true };
  }
}
