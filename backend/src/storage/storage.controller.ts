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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import {
  FileStorageService,
  FileCategory,
  FileStatus,
  AccessLevel,
  UploadOptions,
  DownloadOptions,
  FileQuery,
} from './file-storage.service';

@ApiTags('File Storage')
@Controller('storage')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class StorageController {
  constructor(private readonly storageService: FileStorageService) {}

  // =================== FILE OPERATIONS ===================

  @Post('files')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        category: { type: 'string', enum: ['INVOICE', 'DOCUMENT', 'ATTACHMENT', 'BACKUP', 'EXPORT', 'IMPORT', 'TEMPLATE', 'REPORT', 'AVATAR', 'LOGO', 'SIGNATURE', 'CERTIFICATE', 'ANAF_XML', 'SAGA_EXPORT', 'AUDIT_LOG'] },
        folderId: { type: 'string' },
        accessLevel: { type: 'string', enum: ['PRIVATE', 'INTERNAL', 'SHARED', 'PUBLIC'] },
        tags: { type: 'array', items: { type: 'string' } },
        encrypt: { type: 'boolean' },
        compress: { type: 'boolean' },
      },
      required: ['file', 'category'],
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  async uploadFile(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: {
      category: FileCategory;
      folderId?: string;
      accessLevel?: AccessLevel;
      tags?: string[];
      encrypt?: boolean;
      compress?: boolean;
      metadata?: Record<string, any>;
    },
  ) {
    const options: UploadOptions = {
      category: body.category,
      folderId: body.folderId,
      accessLevel: body.accessLevel,
      tags: body.tags ? (Array.isArray(body.tags) ? body.tags : [body.tags]) : [],
      encrypt: body.encrypt,
      compress: body.compress,
      metadata: body.metadata,
    };

    return this.storageService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      req.user.sub,
      req.user.organizationId || req.user.sub,
      options,
    );
  }

  @Get('files')
  @ApiOperation({ summary: 'Query files' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'accessLevel', required: false })
  @ApiQuery({ name: 'folderId', required: false })
  @ApiQuery({ name: 'tags', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, description: 'List of files' })
  async queryFiles(
    @Request() req: any,
    @Query('category') category?: FileCategory,
    @Query('status') status?: FileStatus,
    @Query('accessLevel') accessLevel?: AccessLevel,
    @Query('folderId') folderId?: string,
    @Query('tags') tags?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const query: FileQuery = {
      organizationId: req.user.organizationId || req.user.sub,
      category,
      status,
      accessLevel,
      folderId,
      tags: tags ? tags.split(',') : undefined,
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      sortBy,
      sortOrder,
    };

    return this.storageService.queryFiles(query);
  }

  @Get('files/:id')
  @ApiOperation({ summary: 'Get file metadata' })
  @ApiResponse({ status: 200, description: 'File metadata' })
  async getFile(@Param('id') id: string) {
    const file = await this.storageService.getFileById(id);
    return file || { error: 'File not found' };
  }

  @Get('files/:id/download')
  @ApiOperation({ summary: 'Get file download URL' })
  @ApiQuery({ name: 'version', required: false, type: Number })
  @ApiQuery({ name: 'inline', required: false, type: Boolean })
  @ApiQuery({ name: 'expiresIn', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Download URL' })
  async getDownloadUrl(
    @Request() req: any,
    @Param('id') id: string,
    @Query('version') version?: string,
    @Query('inline') inline?: string,
    @Query('expiresIn') expiresIn?: string,
  ) {
    const options: DownloadOptions = {
      version: version ? parseInt(version) : undefined,
      inline: inline === 'true',
      expiresIn: expiresIn ? parseInt(expiresIn) : undefined,
    };

    return this.storageService.getDownloadUrl(id, req.user.sub, options);
  }

  @Put('files/:id')
  @ApiOperation({ summary: 'Update file metadata' })
  @ApiResponse({ status: 200, description: 'Updated file metadata' })
  async updateFile(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updates: {
      name?: string;
      nameRo?: string;
      tags?: string[];
      metadata?: Record<string, any>;
      accessLevel?: AccessLevel;
    },
  ) {
    return this.storageService.updateFileMetadata(id, updates, req.user.sub);
  }

  @Post('files/:id/move')
  @ApiOperation({ summary: 'Move file to another folder' })
  @ApiResponse({ status: 200, description: 'File moved' })
  async moveFile(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { targetFolderId: string },
  ) {
    return this.storageService.moveFile(id, body.targetFolderId, req.user.sub);
  }

  @Post('files/:id/copy')
  @ApiOperation({ summary: 'Copy file to another folder' })
  @ApiResponse({ status: 200, description: 'File copied' })
  async copyFile(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { targetFolderId: string },
  ) {
    return this.storageService.copyFile(id, body.targetFolderId, req.user.sub);
  }

  @Post('files/:id/archive')
  @ApiOperation({ summary: 'Archive a file' })
  @ApiResponse({ status: 200, description: 'File archived' })
  async archiveFile(@Request() req: any, @Param('id') id: string) {
    return this.storageService.archiveFile(id, req.user.sub);
  }

  @Post('files/:id/restore')
  @ApiOperation({ summary: 'Restore a deleted file' })
  @ApiResponse({ status: 200, description: 'File restored' })
  async restoreFile(@Request() req: any, @Param('id') id: string) {
    return this.storageService.restoreFile(id, req.user.sub);
  }

  @Delete('files/:id')
  @ApiOperation({ summary: 'Delete a file' })
  @ApiQuery({ name: 'permanent', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'File deleted' })
  async deleteFile(
    @Request() req: any,
    @Param('id') id: string,
    @Query('permanent') permanent?: string,
  ) {
    await this.storageService.deleteFile(id, req.user.sub, permanent === 'true');
    return { success: true };
  }

  // =================== FOLDER OPERATIONS ===================

  @Post('folders')
  @ApiOperation({ summary: 'Create a folder' })
  @ApiResponse({ status: 201, description: 'Folder created' })
  async createFolder(
    @Request() req: any,
    @Body() body: {
      name: string;
      nameRo?: string;
      parentId?: string;
      accessLevel?: AccessLevel;
      metadata?: Record<string, any>;
    },
  ) {
    return this.storageService.createFolder(
      body.name,
      req.user.organizationId || req.user.sub,
      req.user.sub,
      body.parentId,
      {
        nameRo: body.nameRo,
        accessLevel: body.accessLevel,
        metadata: body.metadata,
      },
    );
  }

  @Get('folders/:id')
  @ApiOperation({ summary: 'Get folder details' })
  @ApiResponse({ status: 200, description: 'Folder details' })
  async getFolder(@Param('id') id: string) {
    const folder = await this.storageService.getFolderById(id);
    return folder || { error: 'Folder not found' };
  }

  @Get('folders/:id/contents')
  @ApiOperation({ summary: 'Get folder contents (files and subfolders)' })
  @ApiResponse({ status: 200, description: 'Folder contents' })
  async getFolderContents(@Param('id') id: string) {
    return this.storageService.getFolderContents(id);
  }

  @Delete('folders/:id')
  @ApiOperation({ summary: 'Delete a folder' })
  @ApiQuery({ name: 'recursive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Folder deleted' })
  async deleteFolder(
    @Request() req: any,
    @Param('id') id: string,
    @Query('recursive') recursive?: string,
  ) {
    await this.storageService.deleteFolder(id, req.user.sub, recursive === 'true');
    return { success: true };
  }

  // =================== BULK OPERATIONS ===================

  @Post('bulk')
  @ApiOperation({ summary: 'Start a bulk operation on files' })
  @ApiResponse({ status: 201, description: 'Bulk operation started' })
  async startBulkOperation(
    @Request() req: any,
    @Body() body: {
      type: 'MOVE' | 'COPY' | 'DELETE' | 'ARCHIVE' | 'COMPRESS' | 'ENCRYPT';
      fileIds: string[];
      targetFolderId?: string;
    },
  ) {
    return this.storageService.startBulkOperation(
      body.type,
      body.fileIds,
      req.user.sub,
      body.targetFolderId,
    );
  }

  @Get('bulk/:id')
  @ApiOperation({ summary: 'Get bulk operation status' })
  @ApiResponse({ status: 200, description: 'Bulk operation status' })
  async getBulkOperation(@Param('id') id: string) {
    const operation = await this.storageService.getBulkOperation(id);
    return operation || { error: 'Operation not found' };
  }

  // =================== QUOTA & STATS ===================

  @Get('quota')
  @ApiOperation({ summary: 'Get storage quota for organization' })
  @ApiResponse({ status: 200, description: 'Storage quota' })
  async getQuota(@Request() req: any) {
    return this.storageService.getStorageQuota(req.user.organizationId || req.user.sub);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get storage statistics' })
  @ApiResponse({ status: 200, description: 'Storage statistics' })
  async getStats(@Request() req: any) {
    return this.storageService.getStorageStats(req.user.organizationId || req.user.sub);
  }

  // =================== POLICIES ===================

  @Get('policies')
  @ApiOperation({ summary: 'Get all storage policies' })
  @ApiResponse({ status: 200, description: 'List of storage policies' })
  getAllPolicies() {
    return this.storageService.getAllPolicies();
  }

  @Get('policies/:id')
  @ApiOperation({ summary: 'Get storage policy details' })
  @ApiResponse({ status: 200, description: 'Storage policy details' })
  getPolicy(@Param('id') id: string) {
    const policy = this.storageService.getPolicy(id);
    return policy || { error: 'Policy not found' };
  }

  // =================== CATEGORIES & ENUMS ===================

  @Get('categories')
  @ApiOperation({ summary: 'Get file categories' })
  @ApiResponse({ status: 200, description: 'List of file categories' })
  getCategories() {
    return [
      { value: 'INVOICE', label: 'Invoice', labelRo: 'Factură' },
      { value: 'DOCUMENT', label: 'Document', labelRo: 'Document' },
      { value: 'ATTACHMENT', label: 'Attachment', labelRo: 'Atașament' },
      { value: 'BACKUP', label: 'Backup', labelRo: 'Backup' },
      { value: 'EXPORT', label: 'Export', labelRo: 'Export' },
      { value: 'IMPORT', label: 'Import', labelRo: 'Import' },
      { value: 'TEMPLATE', label: 'Template', labelRo: 'Șablon' },
      { value: 'REPORT', label: 'Report', labelRo: 'Raport' },
      { value: 'AVATAR', label: 'Avatar', labelRo: 'Avatar' },
      { value: 'LOGO', label: 'Logo', labelRo: 'Logo' },
      { value: 'SIGNATURE', label: 'Signature', labelRo: 'Semnătură' },
      { value: 'CERTIFICATE', label: 'Certificate', labelRo: 'Certificat' },
      { value: 'ANAF_XML', label: 'ANAF XML', labelRo: 'XML ANAF' },
      { value: 'SAGA_EXPORT', label: 'SAGA Export', labelRo: 'Export SAGA' },
      { value: 'AUDIT_LOG', label: 'Audit Log', labelRo: 'Jurnal Audit' },
    ];
  }

  @Get('access-levels')
  @ApiOperation({ summary: 'Get access levels' })
  @ApiResponse({ status: 200, description: 'List of access levels' })
  getAccessLevels() {
    return [
      { value: 'PRIVATE', label: 'Private', labelRo: 'Privat', description: 'Only owner can access' },
      { value: 'INTERNAL', label: 'Internal', labelRo: 'Intern', description: 'Organization members can access' },
      { value: 'SHARED', label: 'Shared', labelRo: 'Partajat', description: 'Shared with specific users' },
      { value: 'PUBLIC', label: 'Public', labelRo: 'Public', description: 'Anyone with link can access' },
    ];
  }
}
