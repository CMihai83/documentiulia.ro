import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import * as path from 'path';

export type StorageProvider = 'LOCAL' | 'S3' | 'BUNNY' | 'AZURE' | 'GCS';

export type FileCategory =
  | 'INVOICE'
  | 'DOCUMENT'
  | 'ATTACHMENT'
  | 'BACKUP'
  | 'EXPORT'
  | 'IMPORT'
  | 'TEMPLATE'
  | 'REPORT'
  | 'AVATAR'
  | 'LOGO'
  | 'SIGNATURE'
  | 'CERTIFICATE'
  | 'ANAF_XML'
  | 'SAGA_EXPORT'
  | 'AUDIT_LOG';

export type FileStatus = 'UPLOADING' | 'PROCESSING' | 'READY' | 'ARCHIVED' | 'DELETED' | 'ERROR';

export type AccessLevel = 'PRIVATE' | 'INTERNAL' | 'SHARED' | 'PUBLIC';

export interface FileMetadata {
  id: string;
  name: string;
  nameRo?: string;
  originalName: string;
  mimeType: string;
  size: number;
  category: FileCategory;
  status: FileStatus;
  accessLevel: AccessLevel;
  provider: StorageProvider;
  bucket: string;
  path: string;
  key: string;
  etag?: string;
  checksum: string;
  checksumAlgorithm: 'MD5' | 'SHA256';
  folderId?: string;
  ownerId: string;
  organizationId: string;
  tags: string[];
  metadata: Record<string, any>;
  version: number;
  versions: FileVersion[];
  retentionPolicy?: string;
  retentionUntil?: Date;
  encryptionKey?: string;
  isEncrypted: boolean;
  isCompressed: boolean;
  compressionType?: 'GZIP' | 'ZIP' | 'LZ4';
  thumbnailPath?: string;
  previewPath?: string;
  downloadCount: number;
  lastAccessedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface FileVersion {
  version: number;
  key: string;
  size: number;
  checksum: string;
  uploadedBy: string;
  uploadedAt: Date;
  comment?: string;
}

export interface Folder {
  id: string;
  name: string;
  nameRo?: string;
  parentId?: string;
  path: string;
  ownerId: string;
  organizationId: string;
  accessLevel: AccessLevel;
  fileCount: number;
  totalSize: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface UploadOptions {
  category: FileCategory;
  folderId?: string;
  accessLevel?: AccessLevel;
  tags?: string[];
  metadata?: Record<string, any>;
  encrypt?: boolean;
  compress?: boolean;
  generateThumbnail?: boolean;
  retentionPolicy?: string;
  expiresAt?: Date;
  overwrite?: boolean;
  version?: boolean;
}

export interface UploadResult {
  file: FileMetadata;
  uploadUrl?: string;
  uploadId?: string;
  parts?: UploadPart[];
}

export interface UploadPart {
  partNumber: number;
  startByte: number;
  endByte: number;
  uploadUrl: string;
}

export interface DownloadOptions {
  version?: number;
  inline?: boolean;
  expiresIn?: number;
  responseHeaders?: Record<string, string>;
}

export interface DownloadResult {
  url: string;
  expiresAt: Date;
  headers: Record<string, string>;
}

export interface StorageQuota {
  organizationId: string;
  totalBytes: number;
  usedBytes: number;
  fileCount: number;
  maxFileSize: number;
  allowedTypes: string[];
  categories: Record<FileCategory, { usedBytes: number; fileCount: number }>;
}

export interface StoragePolicy {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  category: FileCategory;
  maxFileSize: number;
  allowedMimeTypes: string[];
  retentionDays: number;
  autoArchiveDays?: number;
  autoDeleteDays?: number;
  requireEncryption: boolean;
  requireCompression: boolean;
  generateThumbnails: boolean;
  maxVersions: number;
}

export interface FileQuery {
  category?: FileCategory;
  status?: FileStatus;
  accessLevel?: AccessLevel;
  folderId?: string;
  ownerId?: string;
  organizationId?: string;
  tags?: string[];
  mimeType?: string;
  minSize?: number;
  maxSize?: number;
  createdAfter?: Date;
  createdBefore?: Date;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FileQueryResult {
  files: FileMetadata[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface BulkOperation {
  id: string;
  type: 'MOVE' | 'COPY' | 'DELETE' | 'ARCHIVE' | 'COMPRESS' | 'ENCRYPT';
  fileIds: string[];
  targetFolderId?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  progress: number;
  results: BulkOperationResult[];
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface BulkOperationResult {
  fileId: string;
  success: boolean;
  error?: string;
}

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private files: Map<string, FileMetadata> = new Map();
  private folders: Map<string, Folder> = new Map();
  private policies: Map<string, StoragePolicy> = new Map();
  private quotas: Map<string, StorageQuota> = new Map();
  private bulkOperations: Map<string, BulkOperation> = new Map();
  private fileContents: Map<string, Buffer> = new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.initializeDefaultPolicies();
  }

  private initializeDefaultPolicies(): void {
    const defaultPolicies: StoragePolicy[] = [
      {
        id: 'policy-invoice',
        name: 'Invoice Documents',
        nameRo: 'Documente Factură',
        description: 'Policy for invoice-related files with 10-year retention',
        descriptionRo: 'Politică pentru fișiere legate de facturi cu retenție de 10 ani',
        category: 'INVOICE',
        maxFileSize: 50 * 1024 * 1024, // 50MB
        allowedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg', 'application/xml'],
        retentionDays: 3650, // 10 years for Romanian tax compliance
        requireEncryption: true,
        requireCompression: false,
        generateThumbnails: true,
        maxVersions: 10,
      },
      {
        id: 'policy-anaf',
        name: 'ANAF XML Files',
        nameRo: 'Fișiere XML ANAF',
        description: 'Policy for ANAF e-Factura and SAF-T XML files',
        descriptionRo: 'Politică pentru fișiere XML e-Factura și SAF-T ANAF',
        category: 'ANAF_XML',
        maxFileSize: 500 * 1024 * 1024, // 500MB per ANAF requirements
        allowedMimeTypes: ['application/xml', 'text/xml'],
        retentionDays: 3650, // 10 years
        requireEncryption: true,
        requireCompression: true,
        generateThumbnails: false,
        maxVersions: 50,
      },
      {
        id: 'policy-backup',
        name: 'Backup Files',
        nameRo: 'Fișiere Backup',
        description: 'Policy for system backup files',
        descriptionRo: 'Politică pentru fișiere de backup sistem',
        category: 'BACKUP',
        maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB
        allowedMimeTypes: ['application/zip', 'application/gzip', 'application/x-tar'],
        retentionDays: 365,
        autoDeleteDays: 400,
        requireEncryption: true,
        requireCompression: false,
        generateThumbnails: false,
        maxVersions: 5,
      },
      {
        id: 'policy-avatar',
        name: 'User Avatars',
        nameRo: 'Avatare Utilizatori',
        description: 'Policy for user profile images',
        descriptionRo: 'Politică pentru imagini de profil utilizatori',
        category: 'AVATAR',
        maxFileSize: 5 * 1024 * 1024, // 5MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
        retentionDays: 0, // No auto-delete
        requireEncryption: false,
        requireCompression: false,
        generateThumbnails: true,
        maxVersions: 3,
      },
      {
        id: 'policy-template',
        name: 'Document Templates',
        nameRo: 'Șabloane Documente',
        description: 'Policy for document templates',
        descriptionRo: 'Politică pentru șabloane de documente',
        category: 'TEMPLATE',
        maxFileSize: 20 * 1024 * 1024, // 20MB
        allowedMimeTypes: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/html',
        ],
        retentionDays: 0,
        requireEncryption: false,
        requireCompression: false,
        generateThumbnails: true,
        maxVersions: 20,
      },
    ];

    defaultPolicies.forEach((policy) => this.policies.set(policy.id, policy));
  }

  async uploadFile(
    content: Buffer,
    filename: string,
    mimeType: string,
    userId: string,
    organizationId: string,
    options: UploadOptions,
  ): Promise<UploadResult> {
    const policy = this.getPolicyForCategory(options.category);

    // Validate file
    this.validateFile(content, filename, mimeType, policy);

    // Check quota
    await this.checkQuota(organizationId, content.length);

    const fileId = this.generateId();
    const key = this.generateKey(organizationId, options.category, filename);
    const checksum = this.calculateChecksum(content);

    // Handle versioning
    let existingFile: FileMetadata | undefined;
    if (options.version) {
      existingFile = this.findExistingFile(organizationId, options.folderId, filename);
    }

    let processedContent = content;
    let isCompressed = false;
    let compressionType: 'GZIP' | 'ZIP' | 'LZ4' | undefined;

    // Compress if required
    if (options.compress || policy?.requireCompression) {
      processedContent = this.compressContent(content);
      isCompressed = true;
      compressionType = 'GZIP';
    }

    // Encrypt if required
    let encryptionKey: string | undefined;
    const isEncrypted = options.encrypt || policy?.requireEncryption || false;
    if (isEncrypted) {
      encryptionKey = this.generateEncryptionKey();
      processedContent = this.encryptContent(processedContent, encryptionKey);
    }

    // Store content
    this.fileContents.set(key, processedContent);

    const now = new Date();
    const version = existingFile ? existingFile.version + 1 : 1;
    const versions: FileVersion[] = existingFile ? [...existingFile.versions] : [];

    if (existingFile) {
      versions.push({
        version: existingFile.version,
        key: existingFile.key,
        size: existingFile.size,
        checksum: existingFile.checksum,
        uploadedBy: existingFile.ownerId,
        uploadedAt: existingFile.updatedAt,
      });

      // Limit versions
      const maxVersions = policy?.maxVersions || 10;
      while (versions.length > maxVersions) {
        const oldVersion = versions.shift();
        if (oldVersion) {
          this.fileContents.delete(oldVersion.key);
        }
      }
    }

    const file: FileMetadata = {
      id: existingFile?.id || fileId,
      name: filename,
      originalName: filename,
      mimeType,
      size: content.length,
      category: options.category,
      status: 'READY',
      accessLevel: options.accessLevel || 'PRIVATE',
      provider: 'LOCAL',
      bucket: 'default',
      path: this.getFilePath(organizationId, options.category),
      key,
      checksum,
      checksumAlgorithm: 'SHA256',
      folderId: options.folderId,
      ownerId: userId,
      organizationId,
      tags: options.tags || [],
      metadata: options.metadata || {},
      version,
      versions,
      retentionPolicy: options.retentionPolicy || policy?.id,
      retentionUntil: policy?.retentionDays
        ? new Date(now.getTime() + policy.retentionDays * 24 * 60 * 60 * 1000)
        : undefined,
      encryptionKey: isEncrypted ? encryptionKey : undefined,
      isEncrypted,
      isCompressed,
      compressionType,
      downloadCount: existingFile?.downloadCount || 0,
      expiresAt: options.expiresAt,
      createdAt: existingFile?.createdAt || now,
      updatedAt: now,
    };

    // Generate thumbnail if requested
    if (options.generateThumbnail || policy?.generateThumbnails) {
      if (this.isImageMimeType(mimeType)) {
        file.thumbnailPath = await this.generateThumbnail(content, key);
      }
    }

    this.files.set(file.id, file);

    // Update folder stats
    if (options.folderId) {
      await this.updateFolderStats(options.folderId);
    }

    // Update quota
    await this.updateQuota(organizationId, content.length, 1);

    this.eventEmitter.emit('file.uploaded', {
      fileId: file.id,
      userId,
      organizationId,
      category: options.category,
      size: content.length,
      isNewVersion: !!existingFile,
    });

    this.logger.log(`File uploaded: ${file.id} (${filename}, ${this.formatBytes(content.length)})`);

    return { file };
  }

  async initiateMultipartUpload(
    filename: string,
    mimeType: string,
    totalSize: number,
    userId: string,
    organizationId: string,
    options: UploadOptions,
  ): Promise<UploadResult> {
    const policy = this.getPolicyForCategory(options.category);

    // Validate size
    if (policy && totalSize > policy.maxFileSize) {
      throw new Error(`File size exceeds maximum allowed: ${this.formatBytes(policy.maxFileSize)}`);
    }

    // Check quota
    await this.checkQuota(organizationId, totalSize);

    const fileId = this.generateId();
    const uploadId = this.generateId();
    const key = this.generateKey(organizationId, options.category, filename);

    const now = new Date();
    const file: FileMetadata = {
      id: fileId,
      name: filename,
      originalName: filename,
      mimeType,
      size: totalSize,
      category: options.category,
      status: 'UPLOADING',
      accessLevel: options.accessLevel || 'PRIVATE',
      provider: 'LOCAL',
      bucket: 'default',
      path: this.getFilePath(organizationId, options.category),
      key,
      checksum: '',
      checksumAlgorithm: 'SHA256',
      folderId: options.folderId,
      ownerId: userId,
      organizationId,
      tags: options.tags || [],
      metadata: { ...options.metadata, uploadId },
      version: 1,
      versions: [],
      isEncrypted: options.encrypt || policy?.requireEncryption || false,
      isCompressed: options.compress || policy?.requireCompression || false,
      downloadCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.files.set(file.id, file);

    // Generate upload parts (5MB chunks)
    const partSize = 5 * 1024 * 1024;
    const parts: UploadPart[] = [];
    let partNumber = 1;

    for (let offset = 0; offset < totalSize; offset += partSize) {
      parts.push({
        partNumber,
        startByte: offset,
        endByte: Math.min(offset + partSize - 1, totalSize - 1),
        uploadUrl: `/api/files/${fileId}/parts/${partNumber}`,
      });
      partNumber++;
    }

    this.eventEmitter.emit('file.multipart.initiated', {
      fileId,
      uploadId,
      userId,
      organizationId,
      totalSize,
      partCount: parts.length,
    });

    return { file, uploadId, parts };
  }

  async completeMultipartUpload(
    fileId: string,
    parts: Buffer[],
  ): Promise<FileMetadata> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new Error('File not found');
    }

    if (file.status !== 'UPLOADING') {
      throw new Error('File is not in uploading state');
    }

    // Combine parts
    const content = Buffer.concat(parts);
    const checksum = this.calculateChecksum(content);

    // Store combined content
    this.fileContents.set(file.key, content);

    file.status = 'READY';
    file.checksum = checksum;
    file.updatedAt = new Date();

    this.files.set(file.id, file);

    // Update quota
    await this.updateQuota(file.organizationId, content.length, 1);

    this.eventEmitter.emit('file.multipart.completed', {
      fileId: file.id,
      size: content.length,
    });

    return file;
  }

  async downloadFile(
    fileId: string,
    userId: string,
    options: DownloadOptions = {},
  ): Promise<{ content: Buffer; metadata: FileMetadata }> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new Error('File not found');
    }

    if (file.status === 'DELETED') {
      throw new Error('File has been deleted');
    }

    // Get specific version if requested
    let key = file.key;
    if (options.version && options.version !== file.version) {
      const versionInfo = file.versions.find((v) => v.version === options.version);
      if (!versionInfo) {
        throw new Error(`Version ${options.version} not found`);
      }
      key = versionInfo.key;
    }

    let content = this.fileContents.get(key);
    if (!content) {
      throw new Error('File content not found');
    }

    // Decrypt if encrypted
    if (file.isEncrypted && file.encryptionKey) {
      content = this.decryptContent(content, file.encryptionKey);
    }

    // Decompress if compressed
    if (file.isCompressed) {
      content = this.decompressContent(content);
    }

    // Update stats
    file.downloadCount++;
    file.lastAccessedAt = new Date();
    this.files.set(file.id, file);

    this.eventEmitter.emit('file.downloaded', {
      fileId: file.id,
      userId,
      version: options.version || file.version,
    });

    return { content, metadata: file };
  }

  async getDownloadUrl(
    fileId: string,
    userId: string,
    options: DownloadOptions = {},
  ): Promise<DownloadResult> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new Error('File not found');
    }

    const expiresIn = options.expiresIn || 3600; // 1 hour default
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    const token = this.generateDownloadToken(fileId, userId, expiresAt);

    const headers: Record<string, string> = {
      'Content-Type': file.mimeType,
      'Content-Length': file.size.toString(),
    };

    if (!options.inline) {
      headers['Content-Disposition'] = `attachment; filename="${file.originalName}"`;
    }

    return {
      url: `/api/files/download/${token}`,
      expiresAt,
      headers: { ...headers, ...options.responseHeaders },
    };
  }

  async deleteFile(fileId: string, userId: string, permanent: boolean = false): Promise<void> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new Error('File not found');
    }

    // Check retention policy
    if (file.retentionUntil && file.retentionUntil > new Date()) {
      throw new Error(
        `Cannot delete file until retention period ends: ${file.retentionUntil.toISOString()}`,
      );
    }

    if (permanent) {
      // Delete all versions
      this.fileContents.delete(file.key);
      file.versions.forEach((v) => this.fileContents.delete(v.key));
      if (file.thumbnailPath) {
        this.fileContents.delete(file.thumbnailPath);
      }

      this.files.delete(fileId);

      // Update quota
      await this.updateQuota(file.organizationId, -file.size, -1);
    } else {
      file.status = 'DELETED';
      file.deletedAt = new Date();
      this.files.set(file.id, file);
    }

    // Update folder stats
    if (file.folderId) {
      await this.updateFolderStats(file.folderId);
    }

    this.eventEmitter.emit('file.deleted', {
      fileId,
      userId,
      permanent,
      category: file.category,
    });

    this.logger.log(`File deleted: ${fileId} (permanent: ${permanent})`);
  }

  async restoreFile(fileId: string, userId: string): Promise<FileMetadata> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new Error('File not found');
    }

    if (file.status !== 'DELETED') {
      throw new Error('File is not deleted');
    }

    file.status = 'READY';
    file.deletedAt = undefined;
    file.updatedAt = new Date();

    this.files.set(file.id, file);

    this.eventEmitter.emit('file.restored', { fileId, userId });

    return file;
  }

  async moveFile(fileId: string, targetFolderId: string, userId: string): Promise<FileMetadata> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new Error('File not found');
    }

    const targetFolder = this.folders.get(targetFolderId);
    if (!targetFolder) {
      throw new Error('Target folder not found');
    }

    const sourceFolderId = file.folderId;
    file.folderId = targetFolderId;
    file.updatedAt = new Date();

    this.files.set(file.id, file);

    // Update folder stats
    if (sourceFolderId) {
      await this.updateFolderStats(sourceFolderId);
    }
    await this.updateFolderStats(targetFolderId);

    this.eventEmitter.emit('file.moved', {
      fileId,
      userId,
      sourceFolderId,
      targetFolderId,
    });

    return file;
  }

  async copyFile(fileId: string, targetFolderId: string, userId: string): Promise<FileMetadata> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new Error('File not found');
    }

    const content = this.fileContents.get(file.key);
    if (!content) {
      throw new Error('File content not found');
    }

    const newFileId = this.generateId();
    const newKey = this.generateKey(file.organizationId, file.category, `copy_${file.name}`);

    // Copy content
    this.fileContents.set(newKey, Buffer.from(content));

    const now = new Date();
    const newFile: FileMetadata = {
      ...file,
      id: newFileId,
      name: `Copy of ${file.name}`,
      key: newKey,
      folderId: targetFolderId,
      version: 1,
      versions: [],
      downloadCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.files.set(newFile.id, newFile);

    // Update quota
    await this.updateQuota(file.organizationId, file.size, 1);

    // Update folder stats
    await this.updateFolderStats(targetFolderId);

    this.eventEmitter.emit('file.copied', {
      sourceFileId: fileId,
      newFileId: newFile.id,
      userId,
      targetFolderId,
    });

    return newFile;
  }

  async updateFileMetadata(
    fileId: string,
    updates: Partial<Pick<FileMetadata, 'name' | 'nameRo' | 'tags' | 'metadata' | 'accessLevel'>>,
    userId: string,
  ): Promise<FileMetadata> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new Error('File not found');
    }

    if (updates.name) file.name = updates.name;
    if (updates.nameRo) file.nameRo = updates.nameRo;
    if (updates.tags) file.tags = updates.tags;
    if (updates.metadata) file.metadata = { ...file.metadata, ...updates.metadata };
    if (updates.accessLevel) file.accessLevel = updates.accessLevel;

    file.updatedAt = new Date();
    this.files.set(file.id, file);

    this.eventEmitter.emit('file.metadata.updated', { fileId, userId, updates });

    return file;
  }

  async createFolder(
    name: string,
    organizationId: string,
    userId: string,
    parentId?: string,
    options: { nameRo?: string; accessLevel?: AccessLevel; metadata?: Record<string, any> } = {},
  ): Promise<Folder> {
    const folderId = this.generateId();

    let folderPath = `/${name}`;
    if (parentId) {
      const parent = this.folders.get(parentId);
      if (!parent) {
        throw new Error('Parent folder not found');
      }
      folderPath = `${parent.path}/${name}`;
    }

    const now = new Date();
    const folder: Folder = {
      id: folderId,
      name,
      nameRo: options.nameRo,
      parentId,
      path: folderPath,
      ownerId: userId,
      organizationId,
      accessLevel: options.accessLevel || 'PRIVATE',
      fileCount: 0,
      totalSize: 0,
      metadata: options.metadata || {},
      createdAt: now,
      updatedAt: now,
    };

    this.folders.set(folder.id, folder);

    this.eventEmitter.emit('folder.created', { folderId, userId, organizationId });

    return folder;
  }

  async deleteFolder(folderId: string, userId: string, recursive: boolean = false): Promise<void> {
    const folder = this.folders.get(folderId);
    if (!folder) {
      throw new Error('Folder not found');
    }

    // Check for files
    const filesInFolder = Array.from(this.files.values()).filter((f) => f.folderId === folderId);

    // Check for subfolders
    const subfolders = Array.from(this.folders.values()).filter((f) => f.parentId === folderId);

    if ((filesInFolder.length > 0 || subfolders.length > 0) && !recursive) {
      throw new Error('Folder is not empty. Use recursive delete to remove all contents.');
    }

    if (recursive) {
      // Delete files
      for (const file of filesInFolder) {
        await this.deleteFile(file.id, userId, true);
      }

      // Delete subfolders
      for (const subfolder of subfolders) {
        await this.deleteFolder(subfolder.id, userId, true);
      }
    }

    this.folders.delete(folderId);

    this.eventEmitter.emit('folder.deleted', { folderId, userId });
  }

  async queryFiles(query: FileQuery): Promise<FileQueryResult> {
    let files = Array.from(this.files.values());

    // Apply filters
    if (query.category) {
      files = files.filter((f) => f.category === query.category);
    }
    if (query.status) {
      files = files.filter((f) => f.status === query.status);
    } else {
      files = files.filter((f) => f.status !== 'DELETED');
    }
    if (query.accessLevel) {
      files = files.filter((f) => f.accessLevel === query.accessLevel);
    }
    if (query.folderId) {
      files = files.filter((f) => f.folderId === query.folderId);
    }
    if (query.ownerId) {
      files = files.filter((f) => f.ownerId === query.ownerId);
    }
    if (query.organizationId) {
      files = files.filter((f) => f.organizationId === query.organizationId);
    }
    if (query.tags && query.tags.length > 0) {
      files = files.filter((f) => query.tags!.some((tag) => f.tags.includes(tag)));
    }
    if (query.mimeType) {
      files = files.filter((f) => f.mimeType === query.mimeType);
    }
    if (query.minSize !== undefined) {
      files = files.filter((f) => f.size >= query.minSize!);
    }
    if (query.maxSize !== undefined) {
      files = files.filter((f) => f.size <= query.maxSize!);
    }
    if (query.createdAfter) {
      files = files.filter((f) => f.createdAt >= query.createdAfter!);
    }
    if (query.createdBefore) {
      files = files.filter((f) => f.createdAt <= query.createdBefore!);
    }
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      files = files.filter(
        (f) =>
          f.name.toLowerCase().includes(searchLower) ||
          f.originalName.toLowerCase().includes(searchLower) ||
          f.tags.some((t) => t.toLowerCase().includes(searchLower)),
      );
    }

    const total = files.length;

    // Sort
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';
    files.sort((a, b) => {
      const aVal = a[sortBy as keyof FileMetadata];
      const bVal = b[sortBy as keyof FileMetadata];
      if (aVal === undefined || bVal === undefined) return 0;
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Paginate
    const page = query.page || 1;
    const limit = query.limit || 20;
    const start = (page - 1) * limit;
    files = files.slice(start, start + limit);

    return {
      files,
      total,
      page,
      limit,
      hasMore: start + files.length < total,
    };
  }

  async getFileById(fileId: string): Promise<FileMetadata | undefined> {
    return this.files.get(fileId);
  }

  async getFilesByIds(fileIds: string[]): Promise<FileMetadata[]> {
    return fileIds.map((id) => this.files.get(id)).filter((f): f is FileMetadata => f !== undefined);
  }

  async getFolderById(folderId: string): Promise<Folder | undefined> {
    return this.folders.get(folderId);
  }

  async getFolderContents(
    folderId: string,
  ): Promise<{ folder: Folder; files: FileMetadata[]; subfolders: Folder[] }> {
    const folder = this.folders.get(folderId);
    if (!folder) {
      throw new Error('Folder not found');
    }

    const files = Array.from(this.files.values()).filter(
      (f) => f.folderId === folderId && f.status !== 'DELETED',
    );

    const subfolders = Array.from(this.folders.values()).filter((f) => f.parentId === folderId);

    return { folder, files, subfolders };
  }

  async startBulkOperation(
    type: BulkOperation['type'],
    fileIds: string[],
    userId: string,
    targetFolderId?: string,
  ): Promise<BulkOperation> {
    const operationId = this.generateId();

    const operation: BulkOperation = {
      id: operationId,
      type,
      fileIds,
      targetFolderId,
      status: 'PENDING',
      progress: 0,
      results: [],
      startedAt: new Date(),
    };

    this.bulkOperations.set(operationId, operation);

    // Process asynchronously
    this.processBulkOperation(operation, userId).catch((err) => {
      operation.status = 'FAILED';
      operation.error = err.message;
      this.bulkOperations.set(operationId, operation);
    });

    return operation;
  }

  private async processBulkOperation(operation: BulkOperation, userId: string): Promise<void> {
    operation.status = 'IN_PROGRESS';
    this.bulkOperations.set(operation.id, operation);

    for (let i = 0; i < operation.fileIds.length; i++) {
      const fileId = operation.fileIds[i];
      try {
        switch (operation.type) {
          case 'MOVE':
            if (operation.targetFolderId) {
              await this.moveFile(fileId, operation.targetFolderId, userId);
            }
            break;
          case 'COPY':
            if (operation.targetFolderId) {
              await this.copyFile(fileId, operation.targetFolderId, userId);
            }
            break;
          case 'DELETE':
            await this.deleteFile(fileId, userId, false);
            break;
          case 'ARCHIVE':
            await this.archiveFile(fileId, userId);
            break;
        }
        operation.results.push({ fileId, success: true });
      } catch (err) {
        operation.results.push({
          fileId,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }

      operation.progress = ((i + 1) / operation.fileIds.length) * 100;
      this.bulkOperations.set(operation.id, operation);
    }

    operation.status = 'COMPLETED';
    operation.completedAt = new Date();
    this.bulkOperations.set(operation.id, operation);

    this.eventEmitter.emit('bulk.operation.completed', {
      operationId: operation.id,
      type: operation.type,
      fileCount: operation.fileIds.length,
      successCount: operation.results.filter((r) => r.success).length,
    });
  }

  async archiveFile(fileId: string, userId: string): Promise<FileMetadata> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new Error('File not found');
    }

    file.status = 'ARCHIVED';
    file.updatedAt = new Date();

    this.files.set(file.id, file);

    this.eventEmitter.emit('file.archived', { fileId, userId });

    return file;
  }

  async getBulkOperation(operationId: string): Promise<BulkOperation | undefined> {
    return this.bulkOperations.get(operationId);
  }

  async getStorageQuota(organizationId: string): Promise<StorageQuota> {
    let quota = this.quotas.get(organizationId);
    if (!quota) {
      quota = this.createDefaultQuota(organizationId);
      this.quotas.set(organizationId, quota);
    }
    return quota;
  }

  async getStorageStats(organizationId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    byCategory: Record<FileCategory, { count: number; size: number }>;
    byStatus: Record<FileStatus, number>;
    recentUploads: FileMetadata[];
  }> {
    const files = Array.from(this.files.values()).filter(
      (f) => f.organizationId === organizationId,
    );

    const byCategory: Record<FileCategory, { count: number; size: number }> = {} as any;
    const byStatus: Record<FileStatus, number> = {} as any;

    for (const file of files) {
      if (!byCategory[file.category]) {
        byCategory[file.category] = { count: 0, size: 0 };
      }
      byCategory[file.category].count++;
      byCategory[file.category].size += file.size;

      byStatus[file.status] = (byStatus[file.status] || 0) + 1;
    }

    const recentUploads = files
      .filter((f) => f.status === 'READY')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    return {
      totalFiles: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      byCategory,
      byStatus,
      recentUploads,
    };
  }

  getPolicy(policyId: string): StoragePolicy | undefined {
    return this.policies.get(policyId);
  }

  getAllPolicies(): StoragePolicy[] {
    return Array.from(this.policies.values());
  }

  getPolicyForCategory(category: FileCategory): StoragePolicy | undefined {
    return Array.from(this.policies.values()).find((p) => p.category === category);
  }

  private validateFile(
    content: Buffer,
    filename: string,
    mimeType: string,
    policy?: StoragePolicy,
  ): void {
    if (policy) {
      if (content.length > policy.maxFileSize) {
        throw new Error(`File size ${this.formatBytes(content.length)} exceeds maximum ${this.formatBytes(policy.maxFileSize)}`);
      }

      if (
        policy.allowedMimeTypes.length > 0 &&
        !policy.allowedMimeTypes.includes(mimeType)
      ) {
        throw new Error(`File type ${mimeType} is not allowed. Allowed types: ${policy.allowedMimeTypes.join(', ')}`);
      }
    }

    // Basic validation
    if (!filename || filename.length === 0) {
      throw new Error('Filename is required');
    }

    if (content.length === 0) {
      throw new Error('File content is empty');
    }
  }

  private async checkQuota(organizationId: string, additionalBytes: number): Promise<void> {
    const quota = await this.getStorageQuota(organizationId);
    if (quota.usedBytes + additionalBytes > quota.totalBytes) {
      throw new Error('Storage quota exceeded');
    }
  }

  private async updateQuota(
    organizationId: string,
    bytesDelta: number,
    fileCountDelta: number,
  ): Promise<void> {
    const quota = await this.getStorageQuota(organizationId);
    quota.usedBytes += bytesDelta;
    quota.fileCount += fileCountDelta;
    this.quotas.set(organizationId, quota);
  }

  private async updateFolderStats(folderId: string): Promise<void> {
    const folder = this.folders.get(folderId);
    if (!folder) return;

    const files = Array.from(this.files.values()).filter(
      (f) => f.folderId === folderId && f.status !== 'DELETED',
    );

    folder.fileCount = files.length;
    folder.totalSize = files.reduce((sum, f) => sum + f.size, 0);
    folder.updatedAt = new Date();

    this.folders.set(folderId, folder);
  }

  private createDefaultQuota(organizationId: string): StorageQuota {
    return {
      organizationId,
      totalBytes: 10 * 1024 * 1024 * 1024, // 10GB default
      usedBytes: 0,
      fileCount: 0,
      maxFileSize: 500 * 1024 * 1024, // 500MB max file
      allowedTypes: [],
      categories: {} as any,
    };
  }

  private findExistingFile(
    organizationId: string,
    folderId: string | undefined,
    filename: string,
  ): FileMetadata | undefined {
    return Array.from(this.files.values()).find(
      (f) =>
        f.organizationId === organizationId &&
        f.folderId === folderId &&
        f.name === filename &&
        f.status !== 'DELETED',
    );
  }

  private generateId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private keyCounter = 0;

  private generateKey(organizationId: string, category: FileCategory, filename: string): string {
    const timestamp = Date.now();
    const counter = ++this.keyCounter;
    const random = Math.random().toString(36).substring(2, 8);
    const hash = crypto.createHash('md5').update(`${organizationId}${timestamp}${counter}${random}${filename}`).digest('hex').substring(0, 8);
    return `${organizationId}/${category.toLowerCase()}/${timestamp}_${counter}_${hash}_${filename}`;
  }

  private getFilePath(organizationId: string, category: FileCategory): string {
    return `/${organizationId}/${category.toLowerCase()}`;
  }

  private calculateChecksum(content: Buffer): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private encryptContent(content: Buffer, key: string): Buffer {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
    const encrypted = Buffer.concat([cipher.update(content), cipher.final()]);
    return Buffer.concat([iv, encrypted]);
  }

  private decryptContent(content: Buffer, key: string): Buffer {
    const iv = content.subarray(0, 16);
    const encrypted = content.subarray(16);
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  private compressContent(content: Buffer): Buffer {
    // Simulated compression (in production, use zlib)
    return content;
  }

  private decompressContent(content: Buffer): Buffer {
    // Simulated decompression
    return content;
  }

  private isImageMimeType(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  private async generateThumbnail(content: Buffer, key: string): Promise<string> {
    // Simulated thumbnail generation
    const thumbnailKey = `thumbnails/${key}_thumb`;
    this.fileContents.set(thumbnailKey, content.subarray(0, Math.min(1000, content.length)));
    return thumbnailKey;
  }

  private generateDownloadToken(fileId: string, userId: string, expiresAt: Date): string {
    const payload = `${fileId}:${userId}:${expiresAt.getTime()}`;
    const signature = crypto.createHmac('sha256', 'secret-key').update(payload).digest('hex');
    return Buffer.from(`${payload}:${signature}`).toString('base64url');
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}
