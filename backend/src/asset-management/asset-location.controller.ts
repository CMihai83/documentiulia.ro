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
import { AssetLocationService, LocationType } from './asset-location.service';

@ApiTags('Asset Management - Organization')
@Controller('assets/organization')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AssetLocationController {
  constructor(private readonly locationService: AssetLocationService) {}

  // =================== LOCATIONS ===================

  @Post('locations')
  @ApiOperation({ summary: 'Create location' })
  @ApiResponse({ status: 201, description: 'Location created' })
  async createLocation(
    @Request() req: any,
    @Body() body: {
      name: string;
      code: string;
      type: LocationType;
      description?: string;
      parentId?: string;
      address?: string;
      city?: string;
      country?: string;
      postalCode?: string;
      latitude?: number;
      longitude?: number;
      floor?: string;
      room?: string;
      building?: string;
      capacity?: number;
      managerId?: string;
      managerName?: string;
      contactPhone?: string;
      contactEmail?: string;
      operatingHours?: string;
      tags?: string[];
      customFields?: Record<string, any>;
    },
  ) {
    return this.locationService.createLocation({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Get('locations')
  @ApiOperation({ summary: 'Get locations' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'parentId', required: false })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'country', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Locations list' })
  async getLocations(
    @Request() req: any,
    @Query('type') type?: LocationType,
    @Query('parentId') parentId?: string,
    @Query('city') city?: string,
    @Query('country') country?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    const locations = await this.locationService.getLocations(req.user.tenantId, {
      type,
      parentId,
      city,
      country,
      isActive: isActive ? isActive === 'true' : undefined,
      search,
    });
    return { locations, total: locations.length };
  }

  @Get('locations/hierarchy')
  @ApiOperation({ summary: 'Get location hierarchy' })
  @ApiResponse({ status: 200, description: 'Location hierarchy' })
  async getLocationHierarchy(@Request() req: any) {
    return this.locationService.getLocationHierarchy(req.user.tenantId);
  }

  @Get('locations/code/:code')
  @ApiOperation({ summary: 'Get location by code' })
  @ApiResponse({ status: 200, description: 'Location details' })
  async getLocationByCode(@Param('code') code: string) {
    const location = await this.locationService.getLocationByCode(code);
    if (!location) {
      return { error: 'Location not found' };
    }
    return location;
  }

  @Get('locations/:id')
  @ApiOperation({ summary: 'Get location by ID' })
  @ApiResponse({ status: 200, description: 'Location details' })
  async getLocation(@Param('id') id: string) {
    const location = await this.locationService.getLocation(id);
    if (!location) {
      return { error: 'Location not found' };
    }
    return location;
  }

  @Put('locations/:id')
  @ApiOperation({ summary: 'Update location' })
  @ApiResponse({ status: 200, description: 'Location updated' })
  async updateLocation(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      description?: string;
      address?: string;
      city?: string;
      country?: string;
      postalCode?: string;
      latitude?: number;
      longitude?: number;
      floor?: string;
      room?: string;
      building?: string;
      capacity?: number;
      currentOccupancy?: number;
      managerId?: string;
      managerName?: string;
      contactPhone?: string;
      contactEmail?: string;
      operatingHours?: string;
      isActive?: boolean;
      tags?: string[];
      customFields?: Record<string, any>;
    },
  ) {
    const location = await this.locationService.updateLocation(id, body);
    if (!location) {
      return { error: 'Location not found' };
    }
    return location;
  }

  @Delete('locations/:id')
  @ApiOperation({ summary: 'Delete location' })
  @ApiResponse({ status: 200, description: 'Location deleted' })
  async deleteLocation(@Param('id') id: string) {
    try {
      const success = await this.locationService.deleteLocation(id);
      return { success };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // =================== CATEGORIES ===================

  @Post('categories')
  @ApiOperation({ summary: 'Create category' })
  @ApiResponse({ status: 201, description: 'Category created' })
  async createCategory(
    @Request() req: any,
    @Body() body: {
      name: string;
      code: string;
      description?: string;
      parentId?: string;
      depreciationMethod?: 'straight_line' | 'declining_balance' | 'units_of_production' | 'sum_of_years_digits';
      defaultUsefulLife?: number;
      defaultSalvagePercent?: number;
      accountCode?: string;
      glAssetAccount?: string;
      glDepreciationAccount?: string;
      glAccumulatedDepreciationAccount?: string;
      requiresSerialNumber?: boolean;
      requiresWarranty?: boolean;
      requiresInsurance?: boolean;
      requiresMaintenance?: boolean;
      maintenanceInterval?: number;
      icon?: string;
      color?: string;
      sortOrder?: number;
      customFields?: Record<string, any>;
    },
  ) {
    return this.locationService.createCategory({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get categories' })
  @ApiQuery({ name: 'parentId', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Categories list' })
  async getCategories(
    @Request() req: any,
    @Query('parentId') parentId?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    const categories = await this.locationService.getCategories(req.user.tenantId, {
      parentId,
      isActive: isActive ? isActive === 'true' : undefined,
      search,
    });
    return { categories, total: categories.length };
  }

  @Get('categories/hierarchy')
  @ApiOperation({ summary: 'Get category hierarchy' })
  @ApiResponse({ status: 200, description: 'Category hierarchy' })
  async getCategoryHierarchy(@Request() req: any) {
    return this.locationService.getCategoryHierarchy(req.user.tenantId);
  }

  @Get('categories/code/:code')
  @ApiOperation({ summary: 'Get category by code' })
  @ApiResponse({ status: 200, description: 'Category details' })
  async getCategoryByCode(@Param('code') code: string) {
    const category = await this.locationService.getCategoryByCode(code);
    if (!category) {
      return { error: 'Category not found' };
    }
    return category;
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiResponse({ status: 200, description: 'Category details' })
  async getCategory(@Param('id') id: string) {
    const category = await this.locationService.getCategory(id);
    if (!category) {
      return { error: 'Category not found' };
    }
    return category;
  }

  @Put('categories/:id')
  @ApiOperation({ summary: 'Update category' })
  @ApiResponse({ status: 200, description: 'Category updated' })
  async updateCategory(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      description?: string;
      depreciationMethod?: 'straight_line' | 'declining_balance' | 'units_of_production' | 'sum_of_years_digits';
      defaultUsefulLife?: number;
      defaultSalvagePercent?: number;
      accountCode?: string;
      glAssetAccount?: string;
      glDepreciationAccount?: string;
      glAccumulatedDepreciationAccount?: string;
      requiresSerialNumber?: boolean;
      requiresWarranty?: boolean;
      requiresInsurance?: boolean;
      requiresMaintenance?: boolean;
      maintenanceInterval?: number;
      isActive?: boolean;
      icon?: string;
      color?: string;
      sortOrder?: number;
      customFields?: Record<string, any>;
    },
  ) {
    const category = await this.locationService.updateCategory(id, body);
    if (!category) {
      return { error: 'Category not found' };
    }
    return category;
  }

  // =================== DEPARTMENTS ===================

  @Post('departments')
  @ApiOperation({ summary: 'Create department' })
  @ApiResponse({ status: 201, description: 'Department created' })
  async createDepartment(
    @Request() req: any,
    @Body() body: {
      name: string;
      code: string;
      description?: string;
      parentId?: string;
      managerId?: string;
      managerName?: string;
      costCenterId?: string;
      costCenterName?: string;
      locationId?: string;
      locationName?: string;
      budget?: number;
      assetBudget?: number;
      headcount?: number;
    },
  ) {
    return this.locationService.createDepartment({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Get('departments')
  @ApiOperation({ summary: 'Get departments' })
  @ApiQuery({ name: 'parentId', required: false })
  @ApiQuery({ name: 'locationId', required: false })
  @ApiQuery({ name: 'costCenterId', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Departments list' })
  async getDepartments(
    @Request() req: any,
    @Query('parentId') parentId?: string,
    @Query('locationId') locationId?: string,
    @Query('costCenterId') costCenterId?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    const departments = await this.locationService.getDepartments(req.user.tenantId, {
      parentId,
      locationId,
      costCenterId,
      isActive: isActive ? isActive === 'true' : undefined,
      search,
    });
    return { departments, total: departments.length };
  }

  @Get('departments/:id')
  @ApiOperation({ summary: 'Get department by ID' })
  @ApiResponse({ status: 200, description: 'Department details' })
  async getDepartment(@Param('id') id: string) {
    const department = await this.locationService.getDepartment(id);
    if (!department) {
      return { error: 'Department not found' };
    }
    return department;
  }

  @Put('departments/:id')
  @ApiOperation({ summary: 'Update department' })
  @ApiResponse({ status: 200, description: 'Department updated' })
  async updateDepartment(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      description?: string;
      managerId?: string;
      managerName?: string;
      costCenterId?: string;
      costCenterName?: string;
      locationId?: string;
      locationName?: string;
      budget?: number;
      assetBudget?: number;
      headcount?: number;
      isActive?: boolean;
    },
  ) {
    const department = await this.locationService.updateDepartment(id, body);
    if (!department) {
      return { error: 'Department not found' };
    }
    return department;
  }

  // =================== COST CENTERS ===================

  @Post('cost-centers')
  @ApiOperation({ summary: 'Create cost center' })
  @ApiResponse({ status: 201, description: 'Cost center created' })
  async createCostCenter(
    @Request() req: any,
    @Body() body: {
      name: string;
      code: string;
      description?: string;
      departmentId?: string;
      departmentName?: string;
      managerId?: string;
      managerName?: string;
      budget?: number;
      fiscalYear?: string;
    },
  ) {
    return this.locationService.createCostCenter({
      tenantId: req.user.tenantId,
      ...body,
    });
  }

  @Get('cost-centers')
  @ApiOperation({ summary: 'Get cost centers' })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'fiscalYear', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  @ApiResponse({ status: 200, description: 'Cost centers list' })
  async getCostCenters(
    @Request() req: any,
    @Query('departmentId') departmentId?: string,
    @Query('fiscalYear') fiscalYear?: string,
    @Query('isActive') isActive?: string,
  ) {
    const costCenters = await this.locationService.getCostCenters(req.user.tenantId, {
      departmentId,
      fiscalYear,
      isActive: isActive ? isActive === 'true' : undefined,
    });
    return { costCenters, total: costCenters.length };
  }

  @Post('cost-centers/:id/allocate')
  @ApiOperation({ summary: 'Allocate to cost center' })
  @ApiResponse({ status: 200, description: 'Allocation recorded' })
  async allocateToCostCenter(
    @Param('id') id: string,
    @Body() body: { amount: number },
  ) {
    const costCenter = await this.locationService.allocateToCostCenter(id, body.amount);
    if (!costCenter) {
      return { error: 'Cost center not found' };
    }
    return costCenter;
  }

  // =================== STATISTICS ===================

  @Get('statistics')
  @ApiOperation({ summary: 'Get organization statistics' })
  @ApiResponse({ status: 200, description: 'Organization statistics' })
  async getStatistics(@Request() req: any) {
    return this.locationService.getOrganizationStatistics(req.user.tenantId);
  }
}
