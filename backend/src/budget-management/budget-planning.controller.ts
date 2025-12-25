import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  BudgetPlanningService,
  BudgetType,
  BudgetStatus,
  BudgetMethodology,
  BudgetPeriodType,
  BudgetScenario,
} from './budget-planning.service';

@ApiTags('Budget Management - Planning')
@Controller('budgets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BudgetPlanningController {
  constructor(private readonly budgetService: BudgetPlanningService) {}

  // =================== BUDGETS ===================

  @Post()
  @ApiOperation({ summary: 'Create a new budget' })
  @ApiResponse({ status: 201, description: 'Budget created' })
  async createBudget(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      type: BudgetType;
      methodology?: BudgetMethodology;
      fiscalYear: string;
      periodType?: BudgetPeriodType;
      startDate: string;
      endDate: string;
      currency?: string;
      totalAmount: number;
      departmentId?: string;
      departmentName?: string;
      projectId?: string;
      projectName?: string;
      costCenterId?: string;
      costCenterName?: string;
      parentBudgetId?: string;
      tags?: string[];
      notes?: string;
    },
  ) {
    return this.budgetService.createBudget({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      createdByName: req.user.name || req.user.email,
      ...body,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all budgets' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'fiscalYear', required: false })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'costCenterId', required: false })
  @ApiQuery({ name: 'parentBudgetId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of budgets' })
  async getBudgets(
    @Request() req: any,
    @Query('type') type?: BudgetType,
    @Query('status') status?: BudgetStatus,
    @Query('fiscalYear') fiscalYear?: string,
    @Query('departmentId') departmentId?: string,
    @Query('projectId') projectId?: string,
    @Query('costCenterId') costCenterId?: string,
    @Query('parentBudgetId') parentBudgetId?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    return this.budgetService.getBudgets(req.user.tenantId, {
      type,
      status,
      fiscalYear,
      departmentId,
      projectId,
      costCenterId,
      parentBudgetId,
      search,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get budget statistics' })
  @ApiResponse({ status: 200, description: 'Budget statistics' })
  async getStatistics(@Request() req: any) {
    return this.budgetService.getBudgetStatistics(req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get budget by ID' })
  @ApiResponse({ status: 200, description: 'Budget details' })
  async getBudget(@Param('id') id: string) {
    const budget = await this.budgetService.getBudget(id);
    if (!budget) {
      return { error: 'Budget not found' };
    }

    const lineItems = await this.budgetService.getLineItems(id);
    const scenarios = await this.budgetService.getScenarios(id);

    return { ...budget, lineItems, scenarios };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update budget' })
  @ApiResponse({ status: 200, description: 'Budget updated' })
  async updateBudget(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      description?: string;
      totalAmount?: number;
      departmentId?: string;
      departmentName?: string;
      projectId?: string;
      projectName?: string;
      costCenterId?: string;
      costCenterName?: string;
      tags?: string[];
      notes?: string;
    },
  ) {
    try {
      const budget = await this.budgetService.updateBudget(id, body);
      if (!budget) {
        return { error: 'Budget not found' };
      }
      return budget;
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete budget' })
  @ApiResponse({ status: 200, description: 'Budget deleted' })
  async deleteBudget(@Param('id') id: string) {
    const success = await this.budgetService.deleteBudget(id);
    if (!success) {
      return { error: 'Budget not found or cannot be deleted' };
    }
    return { success };
  }

  // =================== LINE ITEMS ===================

  @Post(':budgetId/line-items')
  @ApiOperation({ summary: 'Add line item to budget' })
  @ApiResponse({ status: 201, description: 'Line item added' })
  async addLineItem(
    @Param('budgetId') budgetId: string,
    @Body() body: {
      categoryId: string;
      categoryName: string;
      subcategoryId?: string;
      subcategoryName?: string;
      accountCode?: string;
      description?: string;
      plannedAmount: number;
      periodBreakdown?: Array<{ period: string; plannedAmount: number }>;
      notes?: string;
    },
  ) {
    try {
      return await this.budgetService.addLineItem({
        budgetId,
        ...body,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Get(':budgetId/line-items')
  @ApiOperation({ summary: 'Get budget line items' })
  @ApiResponse({ status: 200, description: 'Line items list' })
  async getLineItems(@Param('budgetId') budgetId: string) {
    const lineItems = await this.budgetService.getLineItems(budgetId);
    return { lineItems, total: lineItems.length };
  }

  @Put('line-items/:id')
  @ApiOperation({ summary: 'Update line item' })
  @ApiResponse({ status: 200, description: 'Line item updated' })
  async updateLineItem(
    @Param('id') id: string,
    @Body() body: {
      description?: string;
      plannedAmount?: number;
      notes?: string;
    },
  ) {
    try {
      const lineItem = await this.budgetService.updateLineItem(id, body);
      if (!lineItem) {
        return { error: 'Line item not found' };
      }
      return lineItem;
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Delete('line-items/:id')
  @ApiOperation({ summary: 'Delete line item' })
  @ApiResponse({ status: 200, description: 'Line item deleted' })
  async deleteLineItem(@Param('id') id: string) {
    try {
      const success = await this.budgetService.deleteLineItem(id);
      return { success };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // =================== CATEGORIES ===================

  @Post('categories')
  @ApiOperation({ summary: 'Create budget category' })
  @ApiResponse({ status: 201, description: 'Category created' })
  async createCategory(
    @Request() req: any,
    @Body() body: {
      name: string;
      code: string;
      description?: string;
      parentId?: string;
      type: 'expense' | 'revenue' | 'capital';
      glAccountCode?: string;
      sortOrder?: number;
    },
  ) {
    return this.budgetService.createCategory({
      tenantId: req.user.tenantId,
      ...body,
    });
  }

  @Get('categories/list')
  @ApiOperation({ summary: 'Get budget categories' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'parentId', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  @ApiResponse({ status: 200, description: 'Categories list' })
  async getCategories(
    @Request() req: any,
    @Query('type') type?: 'expense' | 'revenue' | 'capital',
    @Query('parentId') parentId?: string,
    @Query('isActive') isActive?: string,
  ) {
    const categories = await this.budgetService.getCategories(req.user.tenantId, {
      type,
      parentId,
      isActive: isActive ? isActive === 'true' : undefined,
    });
    return { categories, total: categories.length };
  }

  // =================== TEMPLATES ===================

  @Post('templates')
  @ApiOperation({ summary: 'Create budget template' })
  @ApiResponse({ status: 201, description: 'Template created' })
  async createTemplate(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      type: BudgetType;
      methodology?: BudgetMethodology;
      periodType?: BudgetPeriodType;
      categories: Array<{
        categoryId: string;
        categoryName: string;
        defaultAmount?: number;
        percentOfTotal?: number;
      }>;
    },
  ) {
    return this.budgetService.createTemplate({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Get('templates/list')
  @ApiOperation({ summary: 'Get budget templates' })
  @ApiResponse({ status: 200, description: 'Templates list' })
  async getTemplates(@Request() req: any) {
    const templates = await this.budgetService.getTemplates(req.user.tenantId);
    return { templates, total: templates.length };
  }

  @Post('templates/:templateId/create-budget')
  @ApiOperation({ summary: 'Create budget from template' })
  @ApiResponse({ status: 201, description: 'Budget created from template' })
  async createBudgetFromTemplate(
    @Request() req: any,
    @Param('templateId') templateId: string,
    @Body() body: {
      name: string;
      fiscalYear: string;
      startDate: string;
      endDate: string;
      totalAmount: number;
    },
  ) {
    try {
      return await this.budgetService.createBudgetFromTemplate(templateId, {
        tenantId: req.user.tenantId,
        createdBy: req.user.id,
        createdByName: req.user.name || req.user.email,
        ...body,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // =================== SCENARIOS ===================

  @Post(':budgetId/scenarios')
  @ApiOperation({ summary: 'Create budget scenario' })
  @ApiResponse({ status: 201, description: 'Scenario created' })
  async createScenario(
    @Request() req: any,
    @Param('budgetId') budgetId: string,
    @Body() body: {
      name: string;
      description?: string;
      type: BudgetScenario['type'];
      adjustmentPercentage?: number;
    },
  ) {
    try {
      return await this.budgetService.createScenario({
        budgetId,
        createdBy: req.user.id,
        ...body,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Get(':budgetId/scenarios')
  @ApiOperation({ summary: 'Get budget scenarios' })
  @ApiResponse({ status: 200, description: 'Scenarios list' })
  async getScenarios(@Param('budgetId') budgetId: string) {
    const scenarios = await this.budgetService.getScenarios(budgetId);
    return { scenarios, total: scenarios.length };
  }

  @Get(':budgetId/scenarios/compare')
  @ApiOperation({ summary: 'Compare budget scenarios' })
  @ApiResponse({ status: 200, description: 'Scenario comparison' })
  async compareScenarios(@Param('budgetId') budgetId: string) {
    try {
      return await this.budgetService.compareScenarios(budgetId);
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // =================== VERSIONING ===================

  @Post(':budgetId/versions')
  @ApiOperation({ summary: 'Create new budget version' })
  @ApiResponse({ status: 201, description: 'New version created' })
  async createNewVersion(
    @Request() req: any,
    @Param('budgetId') budgetId: string,
  ) {
    try {
      return await this.budgetService.createNewVersion(budgetId, req.user.id);
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Get(':budgetId/versions')
  @ApiOperation({ summary: 'Get budget version history' })
  @ApiResponse({ status: 200, description: 'Version history' })
  async getVersionHistory(@Param('budgetId') budgetId: string) {
    const versions = await this.budgetService.getVersionHistory(budgetId);
    return { versions, total: versions.length };
  }
}
