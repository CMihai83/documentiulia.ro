import {
  Controller,
  Get,
  Post,
  Put,
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
  ProcurementManagementService,
  ProcurementCategory,
  ItemStatus,
  UnitOfMeasure,
  CatalogStatus,
  ItemSpecification,
  PreferredVendor,
  ItemCompliance,
  ItemInventory,
  CatalogItem,
  ContractTerms,
  ContractItem,
  ContractContact,
  RenewalInfo,
  ItemAttachment,
  ContractDocument,
} from './procurement-management.service';

@ApiTags('Procurement Management')
@Controller('procurement')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProcurementManagementController {
  constructor(private readonly procurementService: ProcurementManagementService) {}

  // =================== ITEMS ===================

  @Post('items')
  @ApiOperation({ summary: 'Create procurement item' })
  @ApiResponse({ status: 201, description: 'Item created' })
  async createItem(
    @Request() req: any,
    @Body() body: {
      code: string;
      name: string;
      description?: string;
      category: ProcurementCategory;
      subcategory?: string;
      unitOfMeasure: UnitOfMeasure;
      specifications?: ItemSpecification[];
      preferredVendors?: Omit<PreferredVendor, 'lastOrderDate'>[];
      pricing: {
        standardCost: number;
        targetPrice?: number;
        currency?: string;
      };
      inventory?: Partial<ItemInventory>;
      compliance?: Partial<ItemCompliance>;
      tags?: string[];
      notes?: string;
    },
  ) {
    try {
      return await this.procurementService.createItem({
        tenantId: req.user.tenantId,
        ...body,
        createdBy: req.user.id,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Get('items')
  @ApiOperation({ summary: 'Get procurement items' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiQuery({ name: 'belowReorderPoint', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Items list' })
  async getItems(
    @Request() req: any,
    @Query('category') category?: ProcurementCategory,
    @Query('status') status?: ItemStatus,
    @Query('search') search?: string,
    @Query('vendorId') vendorId?: string,
    @Query('belowReorderPoint') belowReorderPoint?: string,
    @Query('limit') limit?: string,
  ) {
    const items = await this.procurementService.getItems(req.user.tenantId, {
      category,
      status,
      search,
      vendorId,
      belowReorderPoint: belowReorderPoint === 'true',
      limit: limit ? parseInt(limit) : undefined,
    });
    return { items, total: items.length };
  }

  @Get('items/:id')
  @ApiOperation({ summary: 'Get item by ID' })
  @ApiResponse({ status: 200, description: 'Item details' })
  async getItem(@Param('id') id: string) {
    const item = await this.procurementService.getItem(id);
    if (!item) {
      return { error: 'Item not found' };
    }
    return item;
  }

  @Get('items/code/:code')
  @ApiOperation({ summary: 'Get item by code' })
  @ApiResponse({ status: 200, description: 'Item details' })
  async getItemByCode(@Request() req: any, @Param('code') code: string) {
    const item = await this.procurementService.getItemByCode(req.user.tenantId, code);
    if (!item) {
      return { error: 'Item not found' };
    }
    return item;
  }

  @Put('items/:id')
  @ApiOperation({ summary: 'Update item' })
  @ApiResponse({ status: 200, description: 'Item updated' })
  async updateItem(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      description?: string;
      subcategory?: string;
      specifications?: ItemSpecification[];
      tags?: string[];
      notes?: string;
    },
  ) {
    const item = await this.procurementService.updateItem(id, body);
    if (!item) {
      return { error: 'Item not found' };
    }
    return item;
  }

  @Put('items/:id/status')
  @ApiOperation({ summary: 'Update item status' })
  @ApiResponse({ status: 200, description: 'Item status updated' })
  async updateItemStatus(
    @Param('id') id: string,
    @Body() body: { status: ItemStatus },
  ) {
    const item = await this.procurementService.updateItemStatus(id, body.status);
    if (!item) {
      return { error: 'Item not found' };
    }
    return item;
  }

  @Post('items/:id/vendors')
  @ApiOperation({ summary: 'Add preferred vendor to item' })
  @ApiResponse({ status: 201, description: 'Vendor added' })
  async addPreferredVendor(
    @Param('id') id: string,
    @Body() body: Omit<PreferredVendor, 'lastOrderDate'>,
  ) {
    const item = await this.procurementService.addPreferredVendor(id, body);
    if (!item) {
      return { error: 'Item not found' };
    }
    return item;
  }

  @Put('items/:id/vendors/:vendorId/remove')
  @ApiOperation({ summary: 'Remove preferred vendor from item' })
  @ApiResponse({ status: 200, description: 'Vendor removed' })
  async removePreferredVendor(
    @Param('id') id: string,
    @Param('vendorId') vendorId: string,
  ) {
    const item = await this.procurementService.removePreferredVendor(id, vendorId);
    if (!item) {
      return { error: 'Item not found' };
    }
    return item;
  }

  @Put('items/:id/inventory')
  @ApiOperation({ summary: 'Update item inventory' })
  @ApiResponse({ status: 200, description: 'Inventory updated' })
  async updateItemInventory(
    @Param('id') id: string,
    @Body() body: Partial<ItemInventory>,
  ) {
    const item = await this.procurementService.updateItemInventory(id, body);
    if (!item) {
      return { error: 'Item not found' };
    }
    return item;
  }

  @Post('items/:id/price-history')
  @ApiOperation({ summary: 'Record purchase price' })
  @ApiResponse({ status: 201, description: 'Price recorded' })
  async recordPurchasePrice(
    @Param('id') id: string,
    @Body() body: {
      price: number;
      vendorId: string;
      vendorName: string;
      quantity: number;
      poNumber?: string;
    },
  ) {
    const item = await this.procurementService.recordPurchasePrice(id, body);
    if (!item) {
      return { error: 'Item not found' };
    }
    return item;
  }

  @Post('items/:id/attachments')
  @ApiOperation({ summary: 'Add item attachment' })
  @ApiResponse({ status: 201, description: 'Attachment added' })
  async addItemAttachment(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: Omit<ItemAttachment, 'id' | 'uploadedAt'>,
  ) {
    const item = await this.procurementService.addItemAttachment(id, {
      ...body,
      uploadedBy: req.user.id,
    });
    if (!item) {
      return { error: 'Item not found' };
    }
    return item;
  }

  // =================== CATALOGS ===================

  @Post('catalogs')
  @ApiOperation({ summary: 'Create procurement catalog' })
  @ApiResponse({ status: 201, description: 'Catalog created' })
  async createCatalog(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      category?: ProcurementCategory;
      validFrom: string;
      validTo?: string;
      items?: Omit<CatalogItem, 'itemCode' | 'itemName'>[];
      vendors?: string[];
    },
  ) {
    return this.procurementService.createCatalog({
      tenantId: req.user.tenantId,
      name: body.name,
      description: body.description,
      category: body.category,
      validFrom: new Date(body.validFrom),
      validTo: body.validTo ? new Date(body.validTo) : undefined,
      items: body.items,
      vendors: body.vendors,
      createdBy: req.user.id,
    });
  }

  @Get('catalogs')
  @ApiOperation({ summary: 'Get procurement catalogs' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiQuery({ name: 'activeOnly', required: false })
  @ApiResponse({ status: 200, description: 'Catalogs list' })
  async getCatalogs(
    @Request() req: any,
    @Query('status') status?: CatalogStatus,
    @Query('category') category?: ProcurementCategory,
    @Query('vendorId') vendorId?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    const catalogs = await this.procurementService.getCatalogs(req.user.tenantId, {
      status,
      category,
      vendorId,
      activeOnly: activeOnly === 'true',
    });
    return { catalogs, total: catalogs.length };
  }

  @Get('catalogs/:id')
  @ApiOperation({ summary: 'Get catalog by ID' })
  @ApiResponse({ status: 200, description: 'Catalog details' })
  async getCatalog(@Param('id') id: string) {
    const catalog = await this.procurementService.getCatalog(id);
    if (!catalog) {
      return { error: 'Catalog not found' };
    }
    return catalog;
  }

  @Post('catalogs/:id/activate')
  @ApiOperation({ summary: 'Activate catalog' })
  @ApiResponse({ status: 200, description: 'Catalog activated' })
  async activateCatalog(@Request() req: any, @Param('id') id: string) {
    const catalog = await this.procurementService.activateCatalog(id, req.user.id);
    if (!catalog) {
      return { error: 'Catalog not found or not in draft status' };
    }
    return catalog;
  }

  @Post('catalogs/:id/items')
  @ApiOperation({ summary: 'Add item to catalog' })
  @ApiResponse({ status: 201, description: 'Item added to catalog' })
  async addCatalogItem(
    @Param('id') id: string,
    @Body() body: Omit<CatalogItem, 'itemCode' | 'itemName'>,
  ) {
    const catalog = await this.procurementService.addCatalogItem(id, body);
    if (!catalog) {
      return { error: 'Catalog or item not found' };
    }
    return catalog;
  }

  @Get('catalogs/price/:itemId')
  @ApiOperation({ summary: 'Get catalog price for item' })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiResponse({ status: 200, description: 'Catalog price' })
  async getCatalogPrice(
    @Request() req: any,
    @Param('itemId') itemId: string,
    @Query('vendorId') vendorId?: string,
  ) {
    const price = await this.procurementService.getCatalogPrice(
      req.user.tenantId,
      itemId,
      vendorId,
    );
    if (!price) {
      return { error: 'No catalog price found for this item' };
    }
    return price;
  }

  // =================== BUDGETS ===================

  @Post('budgets')
  @ApiOperation({ summary: 'Create procurement budget' })
  @ApiResponse({ status: 201, description: 'Budget created' })
  async createBudget(
    @Request() req: any,
    @Body() body: {
      name: string;
      fiscalYear: number;
      category?: ProcurementCategory;
      departmentId?: string;
      departmentName?: string;
      totalBudget: number;
      currency?: string;
      monthlyAllocations?: { month: number; allocated: number }[];
    },
  ) {
    return this.procurementService.createBudget({
      tenantId: req.user.tenantId,
      ...body,
      createdBy: req.user.id,
    });
  }

  @Get('budgets')
  @ApiOperation({ summary: 'Get procurement budgets' })
  @ApiQuery({ name: 'fiscalYear', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: 'Budgets list' })
  async getBudgets(
    @Request() req: any,
    @Query('fiscalYear') fiscalYear?: string,
    @Query('category') category?: ProcurementCategory,
    @Query('departmentId') departmentId?: string,
    @Query('status') status?: string,
  ) {
    const budgets = await this.procurementService.getBudgets(req.user.tenantId, {
      fiscalYear: fiscalYear ? parseInt(fiscalYear) : undefined,
      category,
      departmentId,
      status: status as any,
    });
    return { budgets, total: budgets.length };
  }

  @Get('budgets/:id')
  @ApiOperation({ summary: 'Get budget by ID' })
  @ApiResponse({ status: 200, description: 'Budget details' })
  async getBudget(@Param('id') id: string) {
    const budget = await this.procurementService.getBudget(id);
    if (!budget) {
      return { error: 'Budget not found' };
    }
    return budget;
  }

  @Post('budgets/:id/approve')
  @ApiOperation({ summary: 'Approve budget' })
  @ApiResponse({ status: 200, description: 'Budget approved' })
  async approveBudget(@Request() req: any, @Param('id') id: string) {
    const budget = await this.procurementService.approveBudget(id, req.user.id);
    if (!budget) {
      return { error: 'Budget not found or not in draft status' };
    }
    return budget;
  }

  @Post('budgets/:id/activate')
  @ApiOperation({ summary: 'Activate budget' })
  @ApiResponse({ status: 200, description: 'Budget activated' })
  async activateBudget(@Param('id') id: string) {
    const budget = await this.procurementService.activateBudget(id);
    if (!budget) {
      return { error: 'Budget not found or not approved' };
    }
    return budget;
  }

  @Post('budgets/:id/spend')
  @ApiOperation({ summary: 'Record budget spend' })
  @ApiResponse({ status: 200, description: 'Spend recorded' })
  async recordBudgetSpend(
    @Param('id') id: string,
    @Body() body: { amount: number; month: number },
  ) {
    const budget = await this.procurementService.recordBudgetSpend(
      id,
      body.amount,
      body.month,
    );
    if (!budget) {
      return { error: 'Budget not found or not active' };
    }
    return budget;
  }

  @Post('budgets/:id/commit')
  @ApiOperation({ summary: 'Record budget commitment' })
  @ApiResponse({ status: 200, description: 'Commitment recorded' })
  async recordBudgetCommitment(
    @Param('id') id: string,
    @Body() body: { amount: number; month: number },
  ) {
    const budget = await this.procurementService.recordBudgetCommitment(
      id,
      body.amount,
      body.month,
    );
    if (!budget) {
      return { error: 'Budget not found or not active' };
    }
    return budget;
  }

  @Get('budgets/check-availability')
  @ApiOperation({ summary: 'Check budget availability' })
  @ApiQuery({ name: 'amount', required: true, type: Number })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiResponse({ status: 200, description: 'Budget availability' })
  async checkBudgetAvailability(
    @Request() req: any,
    @Query('amount') amount: string,
    @Query('category') category?: ProcurementCategory,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.procurementService.checkBudgetAvailability(
      req.user.tenantId,
      parseFloat(amount),
      { category, departmentId },
    );
  }

  // =================== CONTRACTS ===================

  @Post('contracts')
  @ApiOperation({ summary: 'Create procurement contract' })
  @ApiResponse({ status: 201, description: 'Contract created' })
  async createContract(
    @Request() req: any,
    @Body() body: {
      vendorId: string;
      vendorName: string;
      name: string;
      description?: string;
      type: 'framework' | 'blanket' | 'spot' | 'service';
      startDate: string;
      endDate: string;
      totalValue: number;
      currency?: string;
      terms: ContractTerms;
      items?: Omit<ContractItem, 'id' | 'orderedQuantity' | 'deliveredQuantity'>[];
      contacts?: ContractContact[];
      renewalInfo?: Omit<RenewalInfo, 'renewalCount'>;
    },
  ) {
    return this.procurementService.createContract({
      tenantId: req.user.tenantId,
      vendorId: body.vendorId,
      vendorName: body.vendorName,
      name: body.name,
      description: body.description,
      type: body.type,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      totalValue: body.totalValue,
      currency: body.currency,
      terms: body.terms,
      items: body.items,
      contacts: body.contacts,
      renewalInfo: body.renewalInfo,
      createdBy: req.user.id,
    });
  }

  @Get('contracts')
  @ApiOperation({ summary: 'Get procurement contracts' })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'expiringWithinDays', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Contracts list' })
  async getContracts(
    @Request() req: any,
    @Query('vendorId') vendorId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('expiringWithinDays') expiringWithinDays?: string,
  ) {
    const contracts = await this.procurementService.getContracts(req.user.tenantId, {
      vendorId,
      type: type as any,
      status: status as any,
      expiringWithinDays: expiringWithinDays ? parseInt(expiringWithinDays) : undefined,
    });
    return { contracts, total: contracts.length };
  }

  @Get('contracts/:id')
  @ApiOperation({ summary: 'Get contract by ID' })
  @ApiResponse({ status: 200, description: 'Contract details' })
  async getContract(@Param('id') id: string) {
    const contract = await this.procurementService.getContract(id);
    if (!contract) {
      return { error: 'Contract not found' };
    }
    return contract;
  }

  @Post('contracts/:id/activate')
  @ApiOperation({ summary: 'Activate contract' })
  @ApiResponse({ status: 200, description: 'Contract activated' })
  async activateContract(@Param('id') id: string) {
    const contract = await this.procurementService.activateContract(id);
    if (!contract) {
      return { error: 'Contract not found or not in draft/pending status' };
    }
    return contract;
  }

  @Post('contracts/:id/usage')
  @ApiOperation({ summary: 'Record contract usage' })
  @ApiResponse({ status: 200, description: 'Usage recorded' })
  async recordContractUsage(
    @Param('id') id: string,
    @Body() body: { itemId: string; quantity: number; value: number },
  ) {
    const contract = await this.procurementService.recordContractUsage(
      id,
      body.itemId,
      body.quantity,
      body.value,
    );
    if (!contract) {
      return { error: 'Contract not found or not active' };
    }
    return contract;
  }

  @Post('contracts/:id/documents')
  @ApiOperation({ summary: 'Add contract document' })
  @ApiResponse({ status: 201, description: 'Document added' })
  async addContractDocument(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: Omit<ContractDocument, 'id' | 'uploadedAt'>,
  ) {
    const contract = await this.procurementService.addContractDocument(id, {
      ...body,
      uploadedBy: req.user.id,
    });
    if (!contract) {
      return { error: 'Contract not found' };
    }
    return contract;
  }

  // =================== ANALYTICS ===================

  @Get('analytics/spend')
  @ApiOperation({ summary: 'Get spend analysis' })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  @ApiResponse({ status: 200, description: 'Spend analysis' })
  async getSpendAnalysis(
    @Request() req: any,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.procurementService.getSpendAnalysis(
      req.user.tenantId,
      new Date(from),
      new Date(to),
    );
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get procurement statistics' })
  @ApiResponse({ status: 200, description: 'Procurement statistics' })
  async getStatistics(@Request() req: any) {
    return this.procurementService.getStatistics(req.user.tenantId);
  }
}
