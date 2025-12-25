import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';

export type DocumentType =
  | 'INVOICE'
  | 'RECEIPT'
  | 'CONTRACT'
  | 'REPORT'
  | 'DECLARATION'
  | 'CERTIFICATE'
  | 'PAYSLIP'
  | 'TAX_DOCUMENT'
  | 'EFACTURA_XML'
  | 'SAFT_XML'
  | 'IMAGE'
  | 'OTHER';

export type DocumentStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'ARCHIVED' | 'DELETED';

export type StorageLocation = 'LOCAL' | 'S3' | 'AZURE' | 'BUNNY';

export interface Document {
  id: string;
  name: string;
  nameRo?: string;
  description?: string;
  descriptionRo?: string;
  type: DocumentType;
  mimeType: string;
  size: number;
  checksum: string;
  status: DocumentStatus;
  folderId?: string;
  version: number;
  tags: string[];
  metadata: DocumentMetadata;
  storageLocation: StorageLocation;
  storagePath: string;
  thumbnailPath?: string;
  ocrText?: string;
  ocrConfidence?: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  tenantId?: string;
}

export interface DocumentMetadata {
  originalName: string;
  extension: string;
  encoding?: string;
  width?: number;
  height?: number;
  pages?: number;
  language?: string;
  extracted?: Record<string, any>;
  custom?: Record<string, any>;
}

export interface Folder {
  id: string;
  name: string;
  nameRo?: string;
  description?: string;
  descriptionRo?: string;
  parentId?: string;
  path: string;
  documentCount: number;
  totalSize: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  tenantId?: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  size: number;
  checksum: string;
  storagePath: string;
  changes?: string;
  createdAt: Date;
  createdBy: string;
}

export interface DocumentShare {
  id: string;
  documentId: string;
  sharedWith: string;
  sharedBy: string;
  permissions: SharePermission[];
  expiresAt?: Date;
  password?: string;
  accessCount: number;
  lastAccessed?: Date;
  createdAt: Date;
}

export type SharePermission = 'VIEW' | 'DOWNLOAD' | 'EDIT' | 'DELETE' | 'SHARE';

export interface UploadOptions {
  name?: string;
  description?: string;
  descriptionRo?: string;
  type?: DocumentType;
  folderId?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  extractOcr?: boolean;
  tenantId?: string;
}

export interface SearchOptions {
  query?: string;
  type?: DocumentType | DocumentType[];
  status?: DocumentStatus | DocumentStatus[];
  folderId?: string;
  tags?: string[];
  fromDate?: Date;
  toDate?: Date;
  minSize?: number;
  maxSize?: number;
  createdBy?: string;
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  documents: Document[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface StorageStats {
  totalDocuments: number;
  totalSize: number;
  documentsByType: Record<DocumentType, number>;
  documentsByStatus: Record<DocumentStatus, number>;
  recentUploads: Document[];
  topFolders: Array<{ folder: Folder; size: number }>;
}

// Romanian translations for document types
const DOCUMENT_TYPE_TRANSLATIONS: Record<DocumentType, string> = {
  INVOICE: 'Factură',
  RECEIPT: 'Chitanță',
  CONTRACT: 'Contract',
  REPORT: 'Raport',
  DECLARATION: 'Declarație',
  CERTIFICATE: 'Certificat',
  PAYSLIP: 'Fluturаș de Salariu',
  TAX_DOCUMENT: 'Document Fiscal',
  EFACTURA_XML: 'e-Factura XML',
  SAFT_XML: 'SAF-T XML',
  IMAGE: 'Imagine',
  OTHER: 'Altele',
};

// Romanian translations for statuses
const STATUS_TRANSLATIONS: Record<DocumentStatus, string> = {
  DRAFT: 'Ciornă',
  PENDING: 'În Așteptare',
  APPROVED: 'Aprobat',
  REJECTED: 'Respins',
  ARCHIVED: 'Arhivat',
  DELETED: 'Șters',
};

// File extension to document type mapping
const EXTENSION_TYPE_MAP: Record<string, DocumentType> = {
  pdf: 'INVOICE',
  xml: 'EFACTURA_XML',
  jpg: 'IMAGE',
  jpeg: 'IMAGE',
  png: 'IMAGE',
  gif: 'IMAGE',
  doc: 'CONTRACT',
  docx: 'CONTRACT',
  xls: 'REPORT',
  xlsx: 'REPORT',
};

// MIME type validation
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/xml',
  'text/xml',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/json',
]);

@Injectable()
export class DocumentService implements OnModuleInit {
  private documents: Map<string, Document> = new Map();
  private folders: Map<string, Folder> = new Map();
  private versions: Map<string, DocumentVersion[]> = new Map();
  private shares: Map<string, DocumentShare> = new Map();
  private fileContents: Map<string, Buffer> = new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async onModuleInit(): Promise<void> {
    // Initialize root folder
    const rootFolder: Folder = {
      id: 'root',
      name: 'Documents',
      nameRo: 'Documente',
      path: '/',
      documentCount: 0,
      totalSize: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
    };
    this.folders.set(rootFolder.id, rootFolder);

    // Create default folders
    await this.createFolder('Invoices', 'Facturi', 'user-system', { parentId: 'root' });
    await this.createFolder('Contracts', 'Contracte', 'user-system', { parentId: 'root' });
    await this.createFolder('Reports', 'Rapoarte', 'user-system', { parentId: 'root' });
    await this.createFolder('Tax Documents', 'Documente Fiscale', 'user-system', { parentId: 'root' });
  }

  // Document Upload and Management
  async uploadDocument(
    content: Buffer,
    filename: string,
    mimeType: string,
    createdBy: string,
    options: UploadOptions = {},
  ): Promise<Document> {
    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new Error(`Invalid MIME type: ${mimeType}`);
    }

    // Validate file size (max 500MB for ANAF compliance)
    const maxSize = 500 * 1024 * 1024;
    if (content.length > maxSize) {
      throw new Error(`File size exceeds maximum allowed: ${maxSize} bytes`);
    }

    const extension = filename.split('.').pop()?.toLowerCase() || '';
    const checksum = this.calculateChecksum(content);

    // Check for duplicates
    const existingDoc = Array.from(this.documents.values()).find((d) => d.checksum === checksum);
    if (existingDoc) {
      throw new Error(`Duplicate document detected: ${existingDoc.id}`);
    }

    const documentType = options.type || this.detectDocumentType(extension, mimeType);
    const storagePath = `/${options.folderId || 'root'}/${this.generateId('file')}-${filename}`;

    const document: Document = {
      id: this.generateId('doc'),
      name: options.name || filename,
      description: options.description,
      descriptionRo: options.descriptionRo,
      type: documentType,
      mimeType,
      size: content.length,
      checksum,
      status: 'PENDING',
      folderId: options.folderId,
      version: 1,
      tags: options.tags || [],
      metadata: {
        originalName: filename,
        extension,
        ...options.metadata,
      },
      storageLocation: 'LOCAL',
      storagePath,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy,
      updatedBy: createdBy,
      tenantId: options.tenantId,
    };

    // Store file content
    this.fileContents.set(document.id, content);
    this.documents.set(document.id, document);

    // Initialize version history
    const initialVersion: DocumentVersion = {
      id: this.generateId('ver'),
      documentId: document.id,
      version: 1,
      size: content.length,
      checksum,
      storagePath,
      createdAt: new Date(),
      createdBy,
    };
    this.versions.set(document.id, [initialVersion]);

    // Update folder stats
    await this.updateFolderStats(options.folderId || 'root', content.length, 1);

    // Extract OCR if requested
    if (options.extractOcr && this.isOcrSupported(mimeType)) {
      await this.extractOcr(document.id);
    }

    this.eventEmitter.emit('document.uploaded', {
      documentId: document.id,
      name: document.name,
      type: document.type,
      size: document.size,
    });

    return document;
  }

  private detectDocumentType(extension: string, mimeType: string): DocumentType {
    if (mimeType === 'application/xml' || mimeType === 'text/xml') {
      return 'EFACTURA_XML';
    }
    return EXTENSION_TYPE_MAP[extension] || 'OTHER';
  }

  private isOcrSupported(mimeType: string): boolean {
    return ['application/pdf', 'image/jpeg', 'image/png'].includes(mimeType);
  }

  private async extractOcr(documentId: string): Promise<void> {
    const document = this.documents.get(documentId);
    if (!document) return;

    // Simulate OCR extraction
    document.ocrText = 'Extracted text from document...';
    document.ocrConfidence = 0.95;
    document.metadata.extracted = {
      invoiceNumber: 'FV-2024-001',
      date: new Date().toISOString(),
      totalAmount: 1000,
      currency: 'RON',
    };
    this.documents.set(documentId, document);
  }

  async getDocument(documentId: string): Promise<Document | undefined> {
    return this.documents.get(documentId);
  }

  async getDocumentContent(documentId: string): Promise<Buffer | undefined> {
    return this.fileContents.get(documentId);
  }

  async updateDocument(
    documentId: string,
    content: Buffer | undefined,
    updatedBy: string,
    options: {
      name?: string;
      description?: string;
      descriptionRo?: string;
      type?: DocumentType;
      status?: DocumentStatus;
      tags?: string[];
      metadata?: Record<string, any>;
      changes?: string;
    } = {},
  ): Promise<Document> {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    // Create new version if content changed
    if (content) {
      const newVersion = document.version + 1;
      const checksum = this.calculateChecksum(content);
      const storagePath = document.storagePath.replace(/v\d+/, `v${newVersion}`);

      const version: DocumentVersion = {
        id: this.generateId('ver'),
        documentId,
        version: newVersion,
        size: content.length,
        checksum,
        storagePath,
        changes: options.changes,
        createdAt: new Date(),
        createdBy: updatedBy,
      };

      const versions = this.versions.get(documentId) || [];
      versions.push(version);
      this.versions.set(documentId, versions);

      this.fileContents.set(documentId, content);

      document.version = newVersion;
      document.size = content.length;
      document.checksum = checksum;
      document.storagePath = storagePath;

      // Update folder size
      const oldSize = document.size;
      await this.updateFolderStats(document.folderId || 'root', content.length - oldSize, 0);
    }

    // Apply updates
    if (options.name) document.name = options.name;
    if (options.description !== undefined) document.description = options.description;
    if (options.descriptionRo !== undefined) document.descriptionRo = options.descriptionRo;
    if (options.type) document.type = options.type;
    if (options.status) document.status = options.status;
    if (options.tags) document.tags = options.tags;
    if (options.metadata) {
      document.metadata = { ...document.metadata, ...options.metadata };
    }

    document.updatedAt = new Date();
    document.updatedBy = updatedBy;
    this.documents.set(documentId, document);

    this.eventEmitter.emit('document.updated', {
      documentId: document.id,
      version: document.version,
      updatedBy,
    });

    return document;
  }

  async deleteDocument(documentId: string, deletedBy: string, permanent: boolean = false): Promise<boolean> {
    const document = this.documents.get(documentId);
    if (!document) {
      return false;
    }

    if (permanent) {
      this.documents.delete(documentId);
      this.fileContents.delete(documentId);
      this.versions.delete(documentId);

      // Delete shares
      for (const [shareId, share] of this.shares.entries()) {
        if (share.documentId === documentId) {
          this.shares.delete(shareId);
        }
      }

      await this.updateFolderStats(document.folderId || 'root', -document.size, -1);
    } else {
      document.status = 'DELETED';
      document.updatedAt = new Date();
      document.updatedBy = deletedBy;
      this.documents.set(documentId, document);
    }

    this.eventEmitter.emit('document.deleted', {
      documentId,
      permanent,
      deletedBy,
    });

    return true;
  }

  async restoreDocument(documentId: string, restoredBy: string): Promise<Document> {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    if (document.status !== 'DELETED') {
      throw new Error(`Document is not deleted: ${documentId}`);
    }

    document.status = 'PENDING';
    document.updatedAt = new Date();
    document.updatedBy = restoredBy;
    this.documents.set(documentId, document);

    this.eventEmitter.emit('document.restored', {
      documentId,
      restoredBy,
    });

    return document;
  }

  // Folder Management
  async createFolder(
    name: string,
    nameRo: string,
    createdBy: string,
    options: {
      description?: string;
      descriptionRo?: string;
      parentId?: string;
      tenantId?: string;
    } = {},
  ): Promise<Folder> {
    const parentId = options.parentId || 'root';
    const parent = this.folders.get(parentId);
    const parentPath = parent?.path || '/';
    const path = `${parentPath}${name}/`.replace(/\/+/g, '/');

    const folder: Folder = {
      id: this.generateId('fld'),
      name,
      nameRo,
      description: options.description,
      descriptionRo: options.descriptionRo,
      parentId,
      path,
      documentCount: 0,
      totalSize: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy,
      tenantId: options.tenantId,
    };

    this.folders.set(folder.id, folder);

    this.eventEmitter.emit('folder.created', {
      folderId: folder.id,
      name: folder.name,
      path: folder.path,
    });

    return folder;
  }

  async getFolder(folderId: string): Promise<Folder | undefined> {
    return this.folders.get(folderId);
  }

  async listFolders(parentId?: string): Promise<Folder[]> {
    let folders = Array.from(this.folders.values());
    if (parentId) {
      folders = folders.filter((f) => f.parentId === parentId);
    }
    return folders;
  }

  async updateFolder(
    folderId: string,
    updates: Partial<Omit<Folder, 'id' | 'createdAt' | 'createdBy'>>,
  ): Promise<Folder> {
    const folder = this.folders.get(folderId);
    if (!folder) {
      throw new Error(`Folder not found: ${folderId}`);
    }

    const updated: Folder = {
      ...folder,
      ...updates,
      updatedAt: new Date(),
    };
    this.folders.set(folderId, updated);

    return updated;
  }

  async deleteFolder(folderId: string): Promise<boolean> {
    if (folderId === 'root') {
      throw new Error('Cannot delete root folder');
    }

    // Check if folder has documents
    const documents = await this.listDocuments({ folderId });
    if (documents.length > 0) {
      throw new Error('Cannot delete folder with documents');
    }

    // Check if folder has subfolders
    const subfolders = await this.listFolders(folderId);
    if (subfolders.length > 0) {
      throw new Error('Cannot delete folder with subfolders');
    }

    return this.folders.delete(folderId);
  }

  private async updateFolderStats(folderId: string, sizeDelta: number, countDelta: number): Promise<void> {
    const folder = this.folders.get(folderId);
    if (folder) {
      folder.totalSize += sizeDelta;
      folder.documentCount += countDelta;
      folder.updatedAt = new Date();
      this.folders.set(folderId, folder);
    }
  }

  // Version Management
  async getVersions(documentId: string): Promise<DocumentVersion[]> {
    return this.versions.get(documentId) || [];
  }

  async getVersion(documentId: string, version: number): Promise<DocumentVersion | undefined> {
    const versions = this.versions.get(documentId) || [];
    return versions.find((v) => v.version === version);
  }

  async restoreVersion(documentId: string, version: number, restoredBy: string): Promise<Document> {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    const targetVersion = await this.getVersion(documentId, version);
    if (!targetVersion) {
      throw new Error(`Version not found: ${version}`);
    }

    // Create new version from old version
    return this.updateDocument(documentId, undefined, restoredBy, {
      changes: `Restored from version ${version}`,
    });
  }

  // Document Sharing
  async shareDocument(
    documentId: string,
    sharedWith: string,
    sharedBy: string,
    permissions: SharePermission[],
    options: {
      expiresAt?: Date;
      password?: string;
    } = {},
  ): Promise<DocumentShare> {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    const share: DocumentShare = {
      id: this.generateId('shr'),
      documentId,
      sharedWith,
      sharedBy,
      permissions,
      expiresAt: options.expiresAt,
      password: options.password ? this.hashPassword(options.password) : undefined,
      accessCount: 0,
      createdAt: new Date(),
    };

    this.shares.set(share.id, share);

    this.eventEmitter.emit('document.shared', {
      documentId,
      shareId: share.id,
      sharedWith,
      permissions,
    });

    return share;
  }

  async getShare(shareId: string): Promise<DocumentShare | undefined> {
    return this.shares.get(shareId);
  }

  async listShares(documentId: string): Promise<DocumentShare[]> {
    return Array.from(this.shares.values()).filter((s) => s.documentId === documentId);
  }

  async revokeShare(shareId: string): Promise<boolean> {
    const deleted = this.shares.delete(shareId);
    if (deleted) {
      this.eventEmitter.emit('document.share.revoked', { shareId });
    }
    return deleted;
  }

  async accessShare(shareId: string, password?: string): Promise<Document> {
    const share = this.shares.get(shareId);
    if (!share) {
      throw new Error(`Share not found: ${shareId}`);
    }

    // Check expiration
    if (share.expiresAt && share.expiresAt < new Date()) {
      throw new Error('Share link has expired');
    }

    // Check password
    if (share.password && this.hashPassword(password || '') !== share.password) {
      throw new Error('Invalid password');
    }

    const document = this.documents.get(share.documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Update access stats
    share.accessCount++;
    share.lastAccessed = new Date();
    this.shares.set(shareId, share);

    return document;
  }

  // Search
  async searchDocuments(options: SearchOptions = {}): Promise<SearchResult> {
    let documents = Array.from(this.documents.values());

    // Apply filters
    if (options.query) {
      const query = options.query.toLowerCase();
      documents = documents.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          d.description?.toLowerCase().includes(query) ||
          d.ocrText?.toLowerCase().includes(query) ||
          d.tags.some((t) => t.toLowerCase().includes(query)),
      );
    }

    if (options.type) {
      const types = Array.isArray(options.type) ? options.type : [options.type];
      documents = documents.filter((d) => types.includes(d.type));
    }

    if (options.status) {
      const statuses = Array.isArray(options.status) ? options.status : [options.status];
      documents = documents.filter((d) => statuses.includes(d.status));
    }

    if (options.folderId) {
      documents = documents.filter((d) => d.folderId === options.folderId);
    }

    if (options.tags && options.tags.length > 0) {
      documents = documents.filter((d) => options.tags!.some((tag) => d.tags.includes(tag)));
    }

    if (options.fromDate) {
      documents = documents.filter((d) => d.createdAt >= options.fromDate!);
    }

    if (options.toDate) {
      documents = documents.filter((d) => d.createdAt <= options.toDate!);
    }

    if (options.minSize !== undefined) {
      documents = documents.filter((d) => d.size >= options.minSize!);
    }

    if (options.maxSize !== undefined) {
      documents = documents.filter((d) => d.size <= options.maxSize!);
    }

    if (options.createdBy) {
      documents = documents.filter((d) => d.createdBy === options.createdBy);
    }

    // Exclude deleted documents by default
    documents = documents.filter((d) => d.status !== 'DELETED');

    // Sort
    const sortField = options.sortField || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';
    documents.sort((a, b) => {
      const aVal = (a as any)[sortField];
      const bVal = (b as any)[sortField];
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Paginate
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const total = documents.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    documents = documents.slice(start, start + pageSize);

    return {
      documents,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async listDocuments(options: { folderId?: string; type?: DocumentType } = {}): Promise<Document[]> {
    let documents = Array.from(this.documents.values());

    if (options.folderId) {
      documents = documents.filter((d) => d.folderId === options.folderId);
    }
    if (options.type) {
      documents = documents.filter((d) => d.type === options.type);
    }

    return documents.filter((d) => d.status !== 'DELETED');
  }

  // Statistics
  async getStats(): Promise<StorageStats> {
    const documents = Array.from(this.documents.values()).filter((d) => d.status !== 'DELETED');

    const documentsByType: Record<string, number> = {};
    const documentsByStatus: Record<string, number> = {};
    let totalSize = 0;

    for (const doc of documents) {
      documentsByType[doc.type] = (documentsByType[doc.type] || 0) + 1;
      documentsByStatus[doc.status] = (documentsByStatus[doc.status] || 0) + 1;
      totalSize += doc.size;
    }

    const folders = Array.from(this.folders.values());
    const topFolders = folders
      .filter((f) => f.id !== 'root')
      .sort((a, b) => b.totalSize - a.totalSize)
      .slice(0, 5)
      .map((f) => ({ folder: f, size: f.totalSize }));

    const recentUploads = [...documents]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    return {
      totalDocuments: documents.length,
      totalSize,
      documentsByType: documentsByType as Record<DocumentType, number>,
      documentsByStatus: documentsByStatus as Record<DocumentStatus, number>,
      recentUploads,
      topFolders,
    };
  }

  // e-Factura Support
  async validateEfacturaXml(documentId: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    if (document.type !== 'EFACTURA_XML') {
      throw new Error('Document is not an e-Factura XML');
    }

    // Simulate validation
    return {
      valid: true,
      errors: [],
      warnings: [],
    };
  }

  // Romanian Localization
  getDocumentTypeName(type: DocumentType): string {
    return DOCUMENT_TYPE_TRANSLATIONS[type];
  }

  getStatusName(status: DocumentStatus): string {
    return STATUS_TRANSLATIONS[status];
  }

  getAllDocumentTypes(): Array<{ type: DocumentType; name: string; nameRo: string }> {
    return (Object.keys(DOCUMENT_TYPE_TRANSLATIONS) as DocumentType[]).map((type) => ({
      type,
      name: type.replace(/_/g, ' '),
      nameRo: DOCUMENT_TYPE_TRANSLATIONS[type],
    }));
  }

  getAllStatuses(): Array<{ status: DocumentStatus; name: string; nameRo: string }> {
    return (Object.keys(STATUS_TRANSLATIONS) as DocumentStatus[]).map((status) => ({
      status,
      name: status,
      nameRo: STATUS_TRANSLATIONS[status],
    }));
  }

  // Helpers
  private calculateChecksum(content: Buffer): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
