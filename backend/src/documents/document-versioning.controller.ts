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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import {
  DocumentVersioningService,
  DocumentType,
  DocumentStatus,
  LockType,
  PermissionLevel,
} from './document-versioning.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Document Versioning')
@Controller('documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentVersioningController {
  constructor(private readonly docService: DocumentVersioningService) {}

  // =================== DOCUMENTS ===================

  @Post()
  @ApiOperation({ summary: 'Create document' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        name: { type: 'string' },
        type: { type: 'string' },
        content: { type: 'string' },
        createdBy: { type: 'string' },
        description: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        folderId: { type: 'string' },
      },
      required: ['tenantId', 'name', 'type', 'content', 'createdBy'],
    },
  })
  @ApiResponse({ status: 201, description: 'Document created' })
  async createDocument(
    @Body('tenantId') tenantId: string,
    @Body('name') name: string,
    @Body('type') type: DocumentType,
    @Body('content') content: string,
    @Body('createdBy') createdBy: string,
    @Body('description') description?: string,
    @Body('tags') tags?: string[],
    @Body('folderId') folderId?: string,
  ) {
    return this.docService.createDocument(tenantId, name, type, content, createdBy, {
      description,
      tags,
      folderId,
    });
  }

  @Get(':documentId')
  @ApiOperation({ summary: 'Get document by ID' })
  @ApiResponse({ status: 200, description: 'Document details' })
  async getDocument(@Param('documentId') documentId: string) {
    const doc = await this.docService.getDocument(documentId);
    if (!doc) return { error: 'Document not found' };
    return doc;
  }

  @Get('tenant/:tenantId')
  @ApiOperation({ summary: 'Get documents for tenant' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'folderId', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'List of documents' })
  async getDocuments(
    @Param('tenantId') tenantId: string,
    @Query('type') type?: DocumentType,
    @Query('status') status?: DocumentStatus,
    @Query('folderId') folderId?: string,
    @Query('limit') limit?: string,
  ) {
    return {
      documents: await this.docService.getDocuments(
        tenantId,
        { type, status, folderId },
        limit ? parseInt(limit) : 100,
      ),
    };
  }

  @Put(':documentId')
  @ApiOperation({ summary: 'Update document' })
  @ApiResponse({ status: 200, description: 'Document updated' })
  async updateDocument(
    @Param('documentId') documentId: string,
    @Body() updates: Record<string, any>,
  ) {
    const doc = await this.docService.updateDocument(documentId, updates);
    if (!doc) return { error: 'Document not found' };
    return doc;
  }

  @Delete(':documentId')
  @ApiOperation({ summary: 'Delete document' })
  @ApiQuery({ name: 'permanent', required: false })
  @ApiResponse({ status: 200, description: 'Document deleted' })
  async deleteDocument(
    @Param('documentId') documentId: string,
    @Query('permanent') permanent?: string,
  ) {
    const success = await this.docService.deleteDocument(documentId, permanent === 'true');
    return { success };
  }

  @Post(':documentId/restore')
  @ApiOperation({ summary: 'Restore deleted document' })
  @ApiResponse({ status: 200, description: 'Document restored' })
  async restoreDocument(@Param('documentId') documentId: string) {
    const doc = await this.docService.restoreDocument(documentId);
    if (!doc) return { error: 'Document not found or not deleted' };
    return doc;
  }

  @Post(':documentId/archive')
  @ApiOperation({ summary: 'Archive document' })
  @ApiResponse({ status: 200, description: 'Document archived' })
  async archiveDocument(@Param('documentId') documentId: string) {
    const doc = await this.docService.archiveDocument(documentId);
    if (!doc) return { error: 'Document not found' };
    return doc;
  }

  // =================== VERSIONS ===================

  @Post(':documentId/versions')
  @ApiOperation({ summary: 'Save new version' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string' },
        userId: { type: 'string' },
        comment: { type: 'string' },
      },
      required: ['content', 'userId'],
    },
  })
  @ApiResponse({ status: 201, description: 'Version saved' })
  async saveNewVersion(
    @Param('documentId') documentId: string,
    @Body('content') content: string,
    @Body('userId') userId: string,
    @Body('comment') comment?: string,
  ) {
    try {
      const version = await this.docService.saveNewVersion(documentId, content, userId, comment);
      if (!version) return { error: 'Document not found' };
      return version;
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Get(':documentId/versions')
  @ApiOperation({ summary: 'Get all versions' })
  @ApiResponse({ status: 200, description: 'List of versions' })
  async getVersions(@Param('documentId') documentId: string) {
    return { versions: await this.docService.getVersions(documentId) };
  }

  @Get(':documentId/versions/:versionNumber')
  @ApiOperation({ summary: 'Get specific version' })
  @ApiResponse({ status: 200, description: 'Version details' })
  async getVersion(
    @Param('documentId') documentId: string,
    @Param('versionNumber') versionNumber: string,
  ) {
    const version = await this.docService.getVersion(documentId, parseInt(versionNumber));
    if (!version) return { error: 'Version not found' };
    return version;
  }

  @Post(':documentId/versions/:versionNumber/restore')
  @ApiOperation({ summary: 'Restore to version' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { userId: { type: 'string' } },
      required: ['userId'],
    },
  })
  @ApiResponse({ status: 200, description: 'Version restored' })
  async restoreVersion(
    @Param('documentId') documentId: string,
    @Param('versionNumber') versionNumber: string,
    @Body('userId') userId: string,
  ) {
    const doc = await this.docService.restoreVersion(documentId, parseInt(versionNumber), userId);
    if (!doc) return { error: 'Document or version not found' };
    return doc;
  }

  @Get(':documentId/versions/compare')
  @ApiOperation({ summary: 'Compare versions' })
  @ApiQuery({ name: 'v1', required: true })
  @ApiQuery({ name: 'v2', required: true })
  @ApiResponse({ status: 200, description: 'Version comparison' })
  async compareVersions(
    @Param('documentId') documentId: string,
    @Query('v1') v1: string,
    @Query('v2') v2: string,
  ) {
    const comparison = await this.docService.compareVersions(documentId, parseInt(v1), parseInt(v2));
    if (!comparison) return { error: 'Versions not found' };
    return comparison;
  }

  // =================== LOCKS ===================

  @Post(':documentId/lock')
  @ApiOperation({ summary: 'Acquire lock' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        type: { type: 'string', enum: ['exclusive', 'shared'] },
        reason: { type: 'string' },
        durationMinutes: { type: 'number' },
      },
      required: ['userId'],
    },
  })
  @ApiResponse({ status: 200, description: 'Lock acquired' })
  async acquireLock(
    @Param('documentId') documentId: string,
    @Body('userId') userId: string,
    @Body('type') type?: LockType,
    @Body('reason') reason?: string,
    @Body('durationMinutes') durationMinutes?: number,
  ) {
    const lock = await this.docService.acquireLock(documentId, userId, type, reason, durationMinutes);
    if (!lock) return { error: 'Could not acquire lock' };
    return lock;
  }

  @Delete(':documentId/lock')
  @ApiOperation({ summary: 'Release lock' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { userId: { type: 'string' } },
      required: ['userId'],
    },
  })
  @ApiResponse({ status: 200, description: 'Lock released' })
  async releaseLock(
    @Param('documentId') documentId: string,
    @Body('userId') userId: string,
  ) {
    const success = await this.docService.releaseLock(documentId, userId);
    return { success };
  }

  @Get(':documentId/lock')
  @ApiOperation({ summary: 'Get document lock' })
  @ApiResponse({ status: 200, description: 'Lock details' })
  async getDocumentLock(@Param('documentId') documentId: string) {
    const lock = await this.docService.getDocumentLock(documentId);
    return lock || { locked: false };
  }

  // =================== SHARING ===================

  @Post(':documentId/share')
  @ApiOperation({ summary: 'Share document' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sharedWith: { type: 'string' },
        sharedBy: { type: 'string' },
        permission: { type: 'string', enum: ['view', 'edit', 'admin'] },
        expiresAt: { type: 'string' },
      },
      required: ['sharedWith', 'sharedBy', 'permission'],
    },
  })
  @ApiResponse({ status: 200, description: 'Document shared' })
  async shareDocument(
    @Param('documentId') documentId: string,
    @Body('sharedWith') sharedWith: string,
    @Body('sharedBy') sharedBy: string,
    @Body('permission') permission: PermissionLevel,
    @Body('expiresAt') expiresAt?: string,
  ) {
    const share = await this.docService.shareDocument(
      documentId,
      sharedWith,
      sharedBy,
      permission,
      expiresAt ? new Date(expiresAt) : undefined,
    );
    if (!share) return { error: 'Document not found' };
    return share;
  }

  @Delete(':documentId/share/:userId')
  @ApiOperation({ summary: 'Revoke share' })
  @ApiResponse({ status: 200, description: 'Share revoked' })
  async revokeShare(
    @Param('documentId') documentId: string,
    @Param('userId') userId: string,
  ) {
    const success = await this.docService.revokeShare(documentId, userId);
    return { success };
  }

  @Get(':documentId/shares')
  @ApiOperation({ summary: 'Get document shares' })
  @ApiResponse({ status: 200, description: 'List of shares' })
  async getDocumentShares(@Param('documentId') documentId: string) {
    return { shares: await this.docService.getDocumentShares(documentId) };
  }

  @Get('shared-with-me/:userId')
  @ApiOperation({ summary: 'Get documents shared with user' })
  @ApiResponse({ status: 200, description: 'List of shared documents' })
  async getSharedWithMe(@Param('userId') userId: string) {
    return { documents: await this.docService.getSharedWithMe(userId) };
  }

  // =================== FOLDERS ===================

  @Post('folders')
  @ApiOperation({ summary: 'Create folder' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        name: { type: 'string' },
        createdBy: { type: 'string' },
        parentId: { type: 'string' },
      },
      required: ['tenantId', 'name', 'createdBy'],
    },
  })
  @ApiResponse({ status: 201, description: 'Folder created' })
  async createFolder(
    @Body('tenantId') tenantId: string,
    @Body('name') name: string,
    @Body('createdBy') createdBy: string,
    @Body('parentId') parentId?: string,
  ) {
    return this.docService.createFolder(tenantId, name, createdBy, parentId);
  }

  @Get('folders/tenant/:tenantId')
  @ApiOperation({ summary: 'Get folders' })
  @ApiQuery({ name: 'parentId', required: false })
  @ApiResponse({ status: 200, description: 'List of folders' })
  async getFolders(
    @Param('tenantId') tenantId: string,
    @Query('parentId') parentId?: string,
  ) {
    return { folders: await this.docService.getFolders(tenantId, parentId) };
  }

  @Delete('folders/:folderId')
  @ApiOperation({ summary: 'Delete folder' })
  @ApiResponse({ status: 200, description: 'Folder deleted' })
  async deleteFolder(@Param('folderId') folderId: string) {
    const success = await this.docService.deleteFolder(folderId);
    return { success };
  }

  // =================== SEARCH ===================

  @Get('search/:tenantId')
  @ApiOperation({ summary: 'Search documents' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'includeContent', required: false })
  @ApiResponse({ status: 200, description: 'Search results' })
  async searchDocuments(
    @Param('tenantId') tenantId: string,
    @Query('q') query: string,
    @Query('type') type?: DocumentType,
    @Query('includeContent') includeContent?: string,
  ) {
    return {
      results: await this.docService.searchDocuments(tenantId, query, {
        type,
        includeContent: includeContent === 'true',
      }),
    };
  }

  // =================== TAGS ===================

  @Post(':documentId/tags')
  @ApiOperation({ summary: 'Add tag' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { tag: { type: 'string' } },
      required: ['tag'],
    },
  })
  @ApiResponse({ status: 200, description: 'Tag added' })
  async addTag(
    @Param('documentId') documentId: string,
    @Body('tag') tag: string,
  ) {
    const doc = await this.docService.addTag(documentId, tag);
    if (!doc) return { error: 'Document not found' };
    return doc;
  }

  @Delete(':documentId/tags/:tag')
  @ApiOperation({ summary: 'Remove tag' })
  @ApiResponse({ status: 200, description: 'Tag removed' })
  async removeTag(
    @Param('documentId') documentId: string,
    @Param('tag') tag: string,
  ) {
    const doc = await this.docService.removeTag(documentId, tag);
    if (!doc) return { error: 'Document not found' };
    return doc;
  }

  @Get('tags/:tenantId')
  @ApiOperation({ summary: 'Get tags used' })
  @ApiResponse({ status: 200, description: 'List of tags' })
  async getTagsUsed(@Param('tenantId') tenantId: string) {
    return { tags: await this.docService.getTagsUsed(tenantId) };
  }

  // =================== STATISTICS ===================

  @Get('stats/:tenantId')
  @ApiOperation({ summary: 'Get document statistics' })
  @ApiResponse({ status: 200, description: 'Document stats' })
  async getDocumentStats(@Param('tenantId') tenantId: string) {
    return { stats: await this.docService.getDocumentStats(tenantId) };
  }

  // =================== METADATA ===================

  @Get('metadata/types')
  @ApiOperation({ summary: 'Get document types' })
  async getDocumentTypes() {
    return { types: this.docService.getDocumentTypes() };
  }

  @Get('metadata/statuses')
  @ApiOperation({ summary: 'Get document statuses' })
  async getDocumentStatuses() {
    return { statuses: this.docService.getDocumentStatuses() };
  }

  @Get('metadata/permissions')
  @ApiOperation({ summary: 'Get permission levels' })
  async getPermissionLevels() {
    return { permissions: this.docService.getPermissionLevels() };
  }
}
