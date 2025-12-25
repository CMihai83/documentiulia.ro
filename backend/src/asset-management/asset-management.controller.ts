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
  AssetManagementService,
  AssetCategory,
  AssetStatus,
  AssetCondition,
  DepreciationMethod,
  AssetRequest,
  AssetTransfer,
} from './asset-management.service';

@ApiTags('Asset Management')
@Controller('assets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AssetManagementController {
  constructor(private readonly assetService: AssetManagementService) {}

  // =================== ASSETS ===================

  @Post()
  @ApiOperation({ summary: 'Create a new asset' })
  @ApiResponse({ status: 201, description: 'Asset created' })
  async createAsset(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      category: AssetCategory;
      subcategory?: string;
      serialNumber?: string;
      manufacturer?: string;
      model?: string;
      status?: AssetStatus;
      condition?: AssetCondition;
      locationId?: string;
      locationName?: string;
      departmentId?: string;
      departmentName?: string;
      assignedToUserId?: string;
      assignedToUserName?: string;
      purchaseDate?: string;
      purchasePrice?: number;
      purchaseOrderNumber?: string;
      supplierId?: string;
      supplierName?: string;
      warrantyExpiry?: string;
      warrantyInfo?: string;
      salvageValue?: number;
      usefulLifeMonths?: number;
      depreciationMethod?: DepreciationMethod;
      insurancePolicyNumber?: string;
      insuranceExpiry?: string;
      customFields?: Record<string, any>;
      tags?: string[];
      notes?: string;
    },
  ) {
    return this.assetService.createAsset({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : undefined,
      warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : undefined,
      insuranceExpiry: body.insuranceExpiry ? new Date(body.insuranceExpiry) : undefined,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all assets' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'condition', required: false })
  @ApiQuery({ name: 'locationId', required: false })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'assignedToUserId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'tags', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of assets' })
  async getAssets(
    @Request() req: any,
    @Query('category') category?: AssetCategory,
    @Query('status') status?: AssetStatus,
    @Query('condition') condition?: AssetCondition,
    @Query('locationId') locationId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('assignedToUserId') assignedToUserId?: string,
    @Query('search') search?: string,
    @Query('tags') tags?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.assetService.getAssets(req.user.tenantId, {
      category,
      status,
      condition,
      locationId,
      departmentId,
      assignedToUserId,
      search,
      tags: tags ? tags.split(',') : undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get asset statistics' })
  @ApiResponse({ status: 200, description: 'Asset statistics' })
  async getStatistics(@Request() req: any) {
    return this.assetService.getAssetStatistics(req.user.tenantId);
  }

  @Get('tag/:assetTag')
  @ApiOperation({ summary: 'Get asset by tag' })
  @ApiResponse({ status: 200, description: 'Asset details' })
  async getAssetByTag(@Param('assetTag') assetTag: string) {
    const asset = await this.assetService.getAssetByTag(assetTag);
    if (!asset) {
      return { error: 'Asset not found' };
    }
    return asset;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get asset by ID' })
  @ApiResponse({ status: 200, description: 'Asset details' })
  async getAsset(@Param('id') id: string) {
    const asset = await this.assetService.getAsset(id);
    if (!asset) {
      return { error: 'Asset not found' };
    }
    return asset;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update asset' })
  @ApiResponse({ status: 200, description: 'Asset updated' })
  async updateAsset(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      description?: string;
      subcategory?: string;
      serialNumber?: string;
      manufacturer?: string;
      model?: string;
      status?: AssetStatus;
      condition?: AssetCondition;
      locationId?: string;
      locationName?: string;
      departmentId?: string;
      departmentName?: string;
      assignedToUserId?: string;
      assignedToUserName?: string;
      warrantyExpiry?: string;
      warrantyInfo?: string;
      currentValue?: number;
      salvageValue?: number;
      insurancePolicyNumber?: string;
      insuranceExpiry?: string;
      customFields?: Record<string, any>;
      tags?: string[];
      notes?: string;
    },
  ) {
    const updateData: any = { ...body };
    if (body.warrantyExpiry) updateData.warrantyExpiry = new Date(body.warrantyExpiry);
    if (body.insuranceExpiry) updateData.insuranceExpiry = new Date(body.insuranceExpiry);

    const asset = await this.assetService.updateAsset(id, updateData);
    if (!asset) {
      return { error: 'Asset not found' };
    }
    return asset;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete asset' })
  @ApiResponse({ status: 200, description: 'Asset deleted' })
  async deleteAsset(@Param('id') id: string) {
    const success = await this.assetService.deleteAsset(id);
    return { success };
  }

  // =================== CHECKOUTS ===================

  @Post(':id/checkout')
  @ApiOperation({ summary: 'Checkout asset' })
  @ApiResponse({ status: 201, description: 'Asset checked out' })
  async checkoutAsset(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: {
      checkedOutTo: 'user' | 'location' | 'department';
      targetId: string;
      targetName: string;
      expectedReturn?: string;
      notes?: string;
    },
  ) {
    try {
      return await this.assetService.checkoutAsset({
        tenantId: req.user.tenantId,
        assetId: id,
        checkedOutTo: body.checkedOutTo,
        targetId: body.targetId,
        targetName: body.targetName,
        expectedReturn: body.expectedReturn ? new Date(body.expectedReturn) : undefined,
        notes: body.notes,
        checkedOutBy: req.user.id,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Post('checkouts/:checkoutId/checkin')
  @ApiOperation({ summary: 'Checkin asset' })
  @ApiResponse({ status: 200, description: 'Asset checked in' })
  async checkinAsset(
    @Param('checkoutId') checkoutId: string,
    @Body() body: {
      notes?: string;
      condition?: AssetCondition;
    },
  ) {
    const checkout = await this.assetService.checkinAsset(checkoutId, body);
    if (!checkout) {
      return { error: 'Checkout not found' };
    }
    return checkout;
  }

  @Get('checkouts/list')
  @ApiOperation({ summary: 'Get checkouts' })
  @ApiQuery({ name: 'assetId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'checkedOutTo', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Checkouts list' })
  async getCheckouts(
    @Request() req: any,
    @Query('assetId') assetId?: string,
    @Query('status') status?: 'checked_out' | 'returned' | 'overdue',
    @Query('checkedOutTo') checkedOutTo?: 'user' | 'location' | 'department',
    @Query('limit') limit?: string,
  ) {
    const checkouts = await this.assetService.getCheckouts(req.user.tenantId, {
      assetId,
      status,
      checkedOutTo,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { checkouts, total: checkouts.length };
  }

  @Get('checkouts/overdue')
  @ApiOperation({ summary: 'Get overdue checkouts' })
  @ApiResponse({ status: 200, description: 'Overdue checkouts' })
  async getOverdueCheckouts(@Request() req: any) {
    const checkouts = await this.assetService.getOverdueCheckouts(req.user.tenantId);
    return { checkouts, total: checkouts.length };
  }

  // =================== TRANSFERS ===================

  @Post(':id/transfer')
  @ApiOperation({ summary: 'Request asset transfer' })
  @ApiResponse({ status: 201, description: 'Transfer requested' })
  async requestTransfer(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: {
      toType: 'location' | 'department' | 'user';
      toId: string;
      toName: string;
      reason?: string;
    },
  ) {
    try {
      return await this.assetService.requestTransfer({
        tenantId: req.user.tenantId,
        assetId: id,
        toType: body.toType,
        toId: body.toId,
        toName: body.toName,
        reason: body.reason,
        transferredBy: req.user.id,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Post('transfers/:transferId/approve')
  @ApiOperation({ summary: 'Approve transfer' })
  @ApiResponse({ status: 200, description: 'Transfer approved' })
  async approveTransfer(
    @Request() req: any,
    @Param('transferId') transferId: string,
  ) {
    const transfer = await this.assetService.approveTransfer(transferId, req.user.id);
    if (!transfer) {
      return { error: 'Transfer not found' };
    }
    return transfer;
  }

  @Post('transfers/:transferId/complete')
  @ApiOperation({ summary: 'Complete transfer' })
  @ApiResponse({ status: 200, description: 'Transfer completed' })
  async completeTransfer(@Param('transferId') transferId: string) {
    const transfer = await this.assetService.completeTransfer(transferId);
    if (!transfer) {
      return { error: 'Transfer not found or not approved' };
    }
    return transfer;
  }

  @Post('transfers/:transferId/reject')
  @ApiOperation({ summary: 'Reject transfer' })
  @ApiResponse({ status: 200, description: 'Transfer rejected' })
  async rejectTransfer(
    @Request() req: any,
    @Param('transferId') transferId: string,
    @Body() body: { notes?: string },
  ) {
    const transfer = await this.assetService.rejectTransfer(
      transferId,
      req.user.id,
      body.notes,
    );
    if (!transfer) {
      return { error: 'Transfer not found' };
    }
    return transfer;
  }

  @Get('transfers/list')
  @ApiOperation({ summary: 'Get transfers' })
  @ApiQuery({ name: 'assetId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Transfers list' })
  async getTransfers(
    @Request() req: any,
    @Query('assetId') assetId?: string,
    @Query('status') status?: AssetTransfer['status'],
    @Query('limit') limit?: string,
  ) {
    const transfers = await this.assetService.getTransfers(req.user.tenantId, {
      assetId,
      status,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { transfers, total: transfers.length };
  }

  // =================== REQUESTS ===================

  @Post('requests')
  @ApiOperation({ summary: 'Create asset request' })
  @ApiResponse({ status: 201, description: 'Request created' })
  async createRequest(
    @Request() req: any,
    @Body() body: {
      requestType: AssetRequest['requestType'];
      assetId?: string;
      assetName?: string;
      category?: AssetCategory;
      description: string;
      justification?: string;
      estimatedCost?: number;
      priority?: AssetRequest['priority'];
    },
  ) {
    return this.assetService.createRequest({
      tenantId: req.user.tenantId,
      requesterId: req.user.id,
      requesterName: req.user.name || req.user.email,
      ...body,
    });
  }

  @Post('requests/:requestId/review')
  @ApiOperation({ summary: 'Review asset request' })
  @ApiResponse({ status: 200, description: 'Request reviewed' })
  async reviewRequest(
    @Request() req: any,
    @Param('requestId') requestId: string,
    @Body() body: {
      approved: boolean;
      notes?: string;
    },
  ) {
    const request = await this.assetService.reviewRequest(requestId, {
      approved: body.approved,
      reviewedBy: req.user.id,
      notes: body.notes,
    });
    if (!request) {
      return { error: 'Request not found' };
    }
    return request;
  }

  @Post('requests/:requestId/complete')
  @ApiOperation({ summary: 'Complete asset request' })
  @ApiResponse({ status: 200, description: 'Request completed' })
  async completeRequest(@Param('requestId') requestId: string) {
    const request = await this.assetService.completeRequest(requestId);
    if (!request) {
      return { error: 'Request not found or not approved' };
    }
    return request;
  }

  @Get('requests/list')
  @ApiOperation({ summary: 'Get asset requests' })
  @ApiQuery({ name: 'requestType', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'requesterId', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Requests list' })
  async getRequests(
    @Request() req: any,
    @Query('requestType') requestType?: AssetRequest['requestType'],
    @Query('status') status?: AssetRequest['status'],
    @Query('requesterId') requesterId?: string,
    @Query('priority') priority?: AssetRequest['priority'],
    @Query('limit') limit?: string,
  ) {
    const requests = await this.assetService.getRequests(req.user.tenantId, {
      requestType,
      status,
      requesterId,
      priority,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { requests, total: requests.length };
  }
}
