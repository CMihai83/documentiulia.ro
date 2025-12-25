import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import {
  AdvancedSearchService,
  SearchQuery,
  SearchableEntity,
  FilterOperator,
} from './advanced-search.service';

@ApiTags('Search')
@Controller('search')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SearchController {
  constructor(private readonly searchService: AdvancedSearchService) {}

  // =================== SEARCH OPERATIONS ===================

  @Post()
  @ApiOperation({ summary: 'Execute advanced search query' })
  @ApiResponse({ status: 200, description: 'Search results with facets and highlights' })
  async search(
    @Request() req: any,
    @Body() query: {
      query: string;
      entities?: SearchableEntity[];
      filters?: Array<{
        field: string;
        operator: FilterOperator;
        value: any;
        valueEnd?: any;
      }>;
      fields?: string[];
      sort?: Array<{ field: string; order: 'ASC' | 'DESC' }>;
      page?: number;
      pageSize?: number;
      facets?: string[];
      highlight?: boolean;
      fuzzy?: boolean;
      minScore?: number;
      language?: 'RO' | 'EN' | 'AUTO';
    },
  ) {
    const searchQuery: SearchQuery = {
      ...query,
      tenantId: req.user.organizationId || req.user.sub,
    };
    return this.searchService.search(searchQuery);
  }

  @Get('quick')
  @ApiOperation({ summary: 'Quick search across all entities' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Quick search results' })
  async quickSearch(
    @Request() req: any,
    @Query('q') q: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchService.search({
      query: q,
      tenantId: req.user.organizationId || req.user.sub,
      pageSize: limit ? parseInt(limit) : 10,
      highlight: true,
    });
  }

  @Get('suggest')
  @ApiOperation({ summary: 'Get search suggestions/autocomplete' })
  @ApiQuery({ name: 'q', required: true, description: 'Partial query' })
  @ApiQuery({ name: 'entity', required: false, description: 'Filter by entity type' })
  @ApiResponse({ status: 200, description: 'Search suggestions' })
  async suggest(
    @Request() req: any,
    @Query('q') q: string,
    @Query('entity') entity?: SearchableEntity,
    @Query('limit') limit?: string,
  ) {
    return this.searchService.getSuggestions(
      q,
      entity,
      limit ? parseInt(limit) : 10,
    );
  }

  // =================== ENTITY-SPECIFIC SEARCH ===================

  @Get('invoices')
  @ApiOperation({ summary: 'Search invoices' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'minAmount', required: false, type: Number })
  @ApiQuery({ name: 'maxAmount', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Invoice search results' })
  async searchInvoices(
    @Request() req: any,
    @Query('q') q: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('minAmount') minAmount?: string,
    @Query('maxAmount') maxAmount?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const filters: SearchQuery['filters'] = [];

    if (status) {
      filters.push({ field: 'status', operator: 'EQUALS', value: status });
    }
    if (dateFrom) {
      filters.push({ field: 'date', operator: 'GREATER_THAN', value: new Date(dateFrom) });
    }
    if (dateTo) {
      filters.push({ field: 'date', operator: 'LESS_THAN', value: new Date(dateTo) });
    }
    if (minAmount) {
      filters.push({ field: 'amount', operator: 'GREATER_THAN', value: parseFloat(minAmount) });
    }
    if (maxAmount) {
      filters.push({ field: 'amount', operator: 'LESS_THAN', value: parseFloat(maxAmount) });
    }

    return this.searchService.search({
      query: q,
      entities: ['INVOICE'],
      filters,
      tenantId: req.user.organizationId || req.user.sub,
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20,
      highlight: true,
    });
  }

  @Get('clients')
  @ApiOperation({ summary: 'Search clients/customers' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Client search results' })
  async searchClients(
    @Request() req: any,
    @Query('q') q: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.searchService.search({
      query: q,
      entities: ['CLIENT'],
      tenantId: req.user.organizationId || req.user.sub,
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20,
      highlight: true,
    });
  }

  @Get('products')
  @ApiOperation({ summary: 'Search products' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Product search results' })
  async searchProducts(
    @Request() req: any,
    @Query('q') q: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.searchService.search({
      query: q,
      entities: ['PRODUCT'],
      tenantId: req.user.organizationId || req.user.sub,
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20,
      highlight: true,
    });
  }

  @Get('documents')
  @ApiOperation({ summary: 'Search documents' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Document search results' })
  async searchDocuments(
    @Request() req: any,
    @Query('q') q: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const filters: SearchQuery['filters'] = [];
    if (type) {
      filters.push({ field: 'type', operator: 'EQUALS', value: type });
    }

    return this.searchService.search({
      query: q,
      entities: ['DOCUMENT'],
      filters,
      tenantId: req.user.organizationId || req.user.sub,
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20,
      highlight: true,
    });
  }

  // =================== SEARCH CONFIGURATION ===================

  @Get('entities')
  @ApiOperation({ summary: 'Get searchable entities' })
  @ApiResponse({ status: 200, description: 'List of searchable entities' })
  getEntities() {
    return [
      { value: 'INVOICE', label: 'Invoice', labelRo: 'Factură' },
      { value: 'CLIENT', label: 'Client', labelRo: 'Client' },
      { value: 'PRODUCT', label: 'Product', labelRo: 'Produs' },
      { value: 'DOCUMENT', label: 'Document', labelRo: 'Document' },
      { value: 'TRANSACTION', label: 'Transaction', labelRo: 'Tranzacție' },
      { value: 'EMPLOYEE', label: 'Employee', labelRo: 'Angajat' },
      { value: 'REPORT', label: 'Report', labelRo: 'Raport' },
    ];
  }

  @Get('operators')
  @ApiOperation({ summary: 'Get filter operators' })
  @ApiResponse({ status: 200, description: 'List of filter operators' })
  getOperators() {
    return [
      { value: 'EQUALS', label: 'Equals', labelRo: 'Egal' },
      { value: 'CONTAINS', label: 'Contains', labelRo: 'Conține' },
      { value: 'STARTS_WITH', label: 'Starts With', labelRo: 'Începe Cu' },
      { value: 'ENDS_WITH', label: 'Ends With', labelRo: 'Se Termină Cu' },
      { value: 'GREATER_THAN', label: 'Greater Than', labelRo: 'Mai Mare Decât' },
      { value: 'LESS_THAN', label: 'Less Than', labelRo: 'Mai Mic Decât' },
      { value: 'BETWEEN', label: 'Between', labelRo: 'Între' },
      { value: 'IN', label: 'In List', labelRo: 'În Listă' },
      { value: 'NOT_IN', label: 'Not In List', labelRo: 'Nu În Listă' },
    ];
  }

  @Get('fields/:entity')
  @ApiOperation({ summary: 'Get searchable fields for an entity' })
  @ApiResponse({ status: 200, description: 'Searchable fields configuration' })
  getFields(@Request() req: any, @Query('entity') entity: SearchableEntity) {
    return this.searchService.getSearchableFields(entity);
  }
}
