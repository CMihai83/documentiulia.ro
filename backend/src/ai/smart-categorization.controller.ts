import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  SmartCategorizationService,
  TransactionType,
  CategoryLevel,
  RuleCondition,
} from './smart-categorization.service';

// =================== DTOs ===================

class CategorizeTransactionDto {
  type: TransactionType;
  amount: number;
  currency: string;
  description: string;
  vendorName?: string;
  vendorId?: string;
  date: string;
  metadata?: Record<string, any>;
}

class CategorizeTransactionsDto {
  transactions: Array<{
    id: string;
    type: TransactionType;
    amount: number;
    currency: string;
    description: string;
    vendorName?: string;
    vendorId?: string;
    date: string;
    metadata?: Record<string, any>;
  }>;
}

class CreateRuleDto {
  name: string;
  priority: number;
  conditions: RuleCondition[];
  categoryId: string;
  isActive?: boolean;
}

class UpdateRuleDto {
  name?: string;
  priority?: number;
  conditions?: RuleCondition[];
  categoryId?: string;
  isActive?: boolean;
}

class RecordFeedbackDto {
  transactionId: string;
  originalCategoryId: string;
  correctedCategoryId: string;
}

@Controller('smart-categorization')
@UseGuards(JwtAuthGuard)
export class SmartCategorizationController {
  constructor(
    private readonly categorizationService: SmartCategorizationService,
  ) {}

  // =================== CATEGORIZATION ===================

  @Post('categorize')
  async categorizeTransaction(
    @Request() req: any,
    @Body() dto: CategorizeTransactionDto,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    const transaction = {
      id: `txn_${Date.now()}`,
      tenantId,
      type: dto.type,
      amount: dto.amount,
      currency: dto.currency,
      description: dto.description,
      vendorName: dto.vendorName,
      vendorId: dto.vendorId,
      date: new Date(dto.date),
      metadata: dto.metadata,
    };
    return this.categorizationService.categorizeTransaction(tenantId, transaction);
  }

  @Post('categorize/batch')
  async categorizeTransactions(
    @Request() req: any,
    @Body() dto: CategorizeTransactionsDto,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    const transactions = dto.transactions.map(t => ({
      ...t,
      tenantId,
      date: new Date(t.date),
    }));
    return this.categorizationService.categorizeTransactions(tenantId, transactions);
  }

  // =================== CATEGORIES ===================

  @Get('categories')
  async getCategories(
    @Query('level') level?: CategoryLevel,
    @Query('parentId') parentId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.categorizationService.getCategories({
      level,
      parentId,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  @Get('categories/tree')
  async getCategoryTree() {
    return this.categorizationService.getCategoryTree();
  }

  @Get('categories/:id')
  async getCategory(@Param('id') id: string) {
    return this.categorizationService.getCategory(id);
  }

  // =================== RULES ===================

  @Post('rules')
  async createRule(@Request() req: any, @Body() dto: CreateRuleDto) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.categorizationService.createRule(tenantId, {
      ...dto,
      isActive: dto.isActive ?? true,
    });
  }

  @Get('rules')
  async getRules(@Request() req: any) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.categorizationService.getRules(tenantId);
  }

  @Put('rules/:id')
  async updateRule(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateRuleDto,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.categorizationService.updateRule(tenantId, id, dto);
  }

  @Delete('rules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRule(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    await this.categorizationService.deleteRule(tenantId, id);
  }

  // =================== LEARNING & FEEDBACK ===================

  @Post('feedback')
  async recordFeedback(@Request() req: any, @Body() dto: RecordFeedbackDto) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    const userId = req.user?.sub || req.user?.id || 'system';
    return this.categorizationService.recordFeedback(
      tenantId,
      dto.transactionId,
      dto.originalCategoryId,
      dto.correctedCategoryId,
      userId,
    );
  }

  @Get('vendor-mappings')
  async getVendorMappings(@Request() req: any) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.categorizationService.getVendorMappings(tenantId);
  }

  // =================== ANALYTICS ===================

  @Get('stats')
  async getStats(@Request() req: any) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.categorizationService.getCategorizationStats(tenantId);
  }
}
