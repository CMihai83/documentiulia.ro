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
  DocumentVersioningService,
  VersionStatus,
  VersionChange,
  RetentionPolicy,
} from './document-versioning.service';

@ApiTags('Document Generation - Versioning')
@Controller('documents/versioning')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentVersioningController {
  constructor(private readonly versioningService: DocumentVersioningService) {}

  // =================== VERSIONS ===================

  @Post(':documentId/versions')
  @ApiOperation({ summary: 'Create new version' })
  @ApiResponse({ status: 201, description: 'Version created' })
  async createVersion(
    @Request() req: any,
    @Param('documentId') documentId: string,
    @Body() body: {
      content: string;
      mimeType: string;
      label?: string;
      metadata?: Record<string, any>;
      changes?: VersionChange[];
    },
  ) {
    try {
      return await this.versioningService.createVersion({
        documentId,
        tenantId: req.user.tenantId,
        createdBy: req.user.id,
        ...body,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Get(':documentId/versions')
  @ApiOperation({ summary: 'Get document versions' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Versions list' })
  async getVersions(
    @Param('documentId') documentId: string,
    @Query('status') status?: VersionStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    const versions = await this.versioningService.getVersions(documentId, {
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { versions, total: versions.length };
  }

  @Get(':documentId/versions/latest')
  @ApiOperation({ summary: 'Get latest version' })
  @ApiResponse({ status: 200, description: 'Latest version' })
  async getLatestVersion(@Param('documentId') documentId: string) {
    const version = await this.versioningService.getLatestVersion(documentId);
    if (!version) {
      return { error: 'No versions found' };
    }
    return version;
  }

  @Get(':documentId/versions/published')
  @ApiOperation({ summary: 'Get published version' })
  @ApiResponse({ status: 200, description: 'Published version' })
  async getPublishedVersion(@Param('documentId') documentId: string) {
    const version = await this.versioningService.getPublishedVersion(documentId);
    if (!version) {
      return { error: 'No published version found' };
    }
    return version;
  }

  @Get(':documentId/versions/:versionNumber')
  @ApiOperation({ summary: 'Get specific version' })
  @ApiResponse({ status: 200, description: 'Version details' })
  async getVersion(
    @Param('documentId') documentId: string,
    @Param('versionNumber') versionNumber: string,
  ) {
    const version = await this.versioningService.getVersion(documentId, parseInt(versionNumber));
    if (!version) {
      return { error: 'Version not found' };
    }
    return version;
  }

  @Put(':documentId/versions/:versionNumber/status')
  @ApiOperation({ summary: 'Update version status' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateVersionStatus(
    @Request() req: any,
    @Param('documentId') documentId: string,
    @Param('versionNumber') versionNumber: string,
    @Body() body: { status: VersionStatus; comment?: string },
  ) {
    const version = await this.versioningService.updateVersionStatus(
      documentId,
      parseInt(versionNumber),
      body.status,
      req.user.id,
      body.comment,
    );
    if (!version) {
      return { error: 'Version not found' };
    }
    return version;
  }

  @Put(':documentId/versions/:versionNumber/label')
  @ApiOperation({ summary: 'Label version' })
  @ApiResponse({ status: 200, description: 'Version labeled' })
  async labelVersion(
    @Param('documentId') documentId: string,
    @Param('versionNumber') versionNumber: string,
    @Body() body: { label: string },
  ) {
    const version = await this.versioningService.labelVersion(
      documentId,
      parseInt(versionNumber),
      body.label,
    );
    if (!version) {
      return { error: 'Version not found' };
    }
    return version;
  }

  @Post(':documentId/versions/:versionNumber/restore')
  @ApiOperation({ summary: 'Restore version' })
  @ApiResponse({ status: 201, description: 'Version restored' })
  async restoreVersion(
    @Request() req: any,
    @Param('documentId') documentId: string,
    @Param('versionNumber') versionNumber: string,
  ) {
    try {
      return await this.versioningService.restoreVersion(
        documentId,
        parseInt(versionNumber),
        req.user.id,
      );
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // =================== COMPARISON ===================

  @Get(':documentId/compare')
  @ApiOperation({ summary: 'Compare versions' })
  @ApiQuery({ name: 'v1', required: true, type: Number })
  @ApiQuery({ name: 'v2', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Comparison result' })
  async compareVersions(
    @Param('documentId') documentId: string,
    @Query('v1') v1: string,
    @Query('v2') v2: string,
  ) {
    const comparison = await this.versioningService.compareVersions(
      documentId,
      parseInt(v1),
      parseInt(v2),
    );
    if (!comparison) {
      return { error: 'One or both versions not found' };
    }
    return comparison;
  }

  // =================== BRANCHES ===================

  @Post(':documentId/branches')
  @ApiOperation({ summary: 'Create branch' })
  @ApiResponse({ status: 201, description: 'Branch created' })
  async createBranch(
    @Request() req: any,
    @Param('documentId') documentId: string,
    @Body() body: {
      name: string;
      description?: string;
      baseVersion: number;
    },
  ) {
    try {
      return await this.versioningService.createBranch({
        documentId,
        tenantId: req.user.tenantId,
        createdBy: req.user.id,
        ...body,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Get(':documentId/branches')
  @ApiOperation({ summary: 'Get branches' })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: 'Branches list' })
  async getBranches(
    @Param('documentId') documentId: string,
    @Query('status') status?: string,
  ) {
    const branches = await this.versioningService.getBranches(documentId, {
      status: status as any,
    });
    return { branches, total: branches.length };
  }

  @Get('branches/:branchId')
  @ApiOperation({ summary: 'Get branch details' })
  @ApiResponse({ status: 200, description: 'Branch details' })
  async getBranch(@Param('branchId') branchId: string) {
    const branch = await this.versioningService.getBranch(branchId);
    if (!branch) {
      return { error: 'Branch not found' };
    }
    return branch;
  }

  @Post('branches/:branchId/versions')
  @ApiOperation({ summary: 'Add version to branch' })
  @ApiResponse({ status: 201, description: 'Version added' })
  async addVersionToBranch(
    @Request() req: any,
    @Param('branchId') branchId: string,
    @Body() body: {
      content: string;
      mimeType: string;
      changes?: VersionChange[];
    },
  ) {
    try {
      return await this.versioningService.addVersionToBranch(
        branchId,
        body.content,
        body.mimeType,
        req.user.id,
        body.changes,
      );
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Post('branches/:branchId/merge')
  @ApiOperation({ summary: 'Merge branch' })
  @ApiResponse({ status: 200, description: 'Branch merged' })
  async mergeBranch(
    @Request() req: any,
    @Param('branchId') branchId: string,
    @Body() body: { targetBranchId?: string },
  ) {
    try {
      return await this.versioningService.mergeBranch(
        branchId,
        body.targetBranchId || null,
        req.user.id,
      );
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Post('branches/:branchId/close')
  @ApiOperation({ summary: 'Close branch' })
  @ApiResponse({ status: 200, description: 'Branch closed' })
  async closeBranch(@Param('branchId') branchId: string) {
    const branch = await this.versioningService.closeBranch(branchId);
    if (!branch) {
      return { error: 'Branch not found' };
    }
    return branch;
  }

  // =================== LOCKING ===================

  @Post(':documentId/lock')
  @ApiOperation({ summary: 'Lock document' })
  @ApiResponse({ status: 200, description: 'Document locked' })
  async lockDocument(
    @Request() req: any,
    @Param('documentId') documentId: string,
    @Body() body: { reason?: string; durationMinutes?: number },
  ) {
    try {
      return await this.versioningService.lockDocument(
        documentId,
        req.user.id,
        req.user.name || req.user.email,
        body.reason,
        body.durationMinutes,
      );
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Delete(':documentId/lock')
  @ApiOperation({ summary: 'Unlock document' })
  @ApiResponse({ status: 200, description: 'Document unlocked' })
  async unlockDocument(
    @Request() req: any,
    @Param('documentId') documentId: string,
  ) {
    try {
      await this.versioningService.unlockDocument(documentId, req.user.id);
      return { success: true };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Delete(':documentId/lock/force')
  @ApiOperation({ summary: 'Force unlock document (admin)' })
  @ApiResponse({ status: 200, description: 'Document force unlocked' })
  async forceUnlock(
    @Request() req: any,
    @Param('documentId') documentId: string,
  ) {
    await this.versioningService.forceUnlock(documentId, req.user.id);
    return { success: true };
  }

  @Get(':documentId/lock')
  @ApiOperation({ summary: 'Get document lock' })
  @ApiResponse({ status: 200, description: 'Lock details' })
  async getLock(@Param('documentId') documentId: string) {
    const lock = await this.versioningService.getLock(documentId);
    return { lock };
  }

  @Post(':documentId/lock/extend')
  @ApiOperation({ summary: 'Extend lock' })
  @ApiResponse({ status: 200, description: 'Lock extended' })
  async extendLock(
    @Request() req: any,
    @Param('documentId') documentId: string,
    @Body() body: { additionalMinutes: number },
  ) {
    const lock = await this.versioningService.extendLock(
      documentId,
      req.user.id,
      body.additionalMinutes,
    );
    if (!lock) {
      return { error: 'Lock not found or not owned by you' };
    }
    return lock;
  }

  // =================== RETENTION POLICIES ===================

  @Post('retention-policies')
  @ApiOperation({ summary: 'Create retention policy' })
  @ApiResponse({ status: 201, description: 'Policy created' })
  async createRetentionPolicy(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      conditions: RetentionPolicy['conditions'];
      action: RetentionPolicy['action'];
    },
  ) {
    return this.versioningService.createRetentionPolicy({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Get('retention-policies')
  @ApiOperation({ summary: 'Get retention policies' })
  @ApiResponse({ status: 200, description: 'Policies list' })
  async getRetentionPolicies(@Request() req: any) {
    const policies = await this.versioningService.getRetentionPolicies(req.user.tenantId);
    return { policies, total: policies.length };
  }

  @Post('retention-policies/:policyId/execute')
  @ApiOperation({ summary: 'Execute retention policy' })
  @ApiResponse({ status: 200, description: 'Policy executed' })
  async executeRetentionPolicy(@Param('policyId') policyId: string) {
    try {
      return await this.versioningService.executeRetentionPolicy(policyId);
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // =================== STATS ===================

  @Get('stats')
  @ApiOperation({ summary: 'Get versioning stats' })
  @ApiResponse({ status: 200, description: 'Statistics' })
  async getStats(@Request() req: any) {
    return this.versioningService.getStats(req.user.tenantId);
  }
}
