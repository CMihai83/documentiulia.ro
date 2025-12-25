import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

// Types
export type DocumentStatus = 'draft' | 'active' | 'archived' | 'deleted';
export type DocumentType = 'invoice' | 'contract' | 'report' | 'policy' | 'form' | 'other';
export type LockType = 'exclusive' | 'shared';
export type PermissionLevel = 'view' | 'edit' | 'admin';

// Interfaces
export interface Document {
  id: string;
  tenantId: string;
  name: string;
  type: DocumentType;
  status: DocumentStatus;
  currentVersion: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: DocumentMetadata;
  tags: string[];
  folderId?: string;
}

export interface DocumentMetadata {
  description?: string;
  mimeType?: string;
  size?: number;
  checksum?: string;
  customFields?: Record<string, any>;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  content: string;
  contentHash: string;
  size: number;
  createdBy: string;
  createdAt: Date;
  comment?: string;
  changes?: VersionChange[];
}

export interface VersionChange {
  field: string;
  oldValue: any;
  newValue: any;
}

export interface DocumentLock {
  id: string;
  documentId: string;
  userId: string;
  type: LockType;
  acquiredAt: Date;
  expiresAt: Date;
  reason?: string;
}

export interface DocumentShare {
  id: string;
  documentId: string;
  sharedWith: string;
  sharedBy: string;
  permission: PermissionLevel;
  sharedAt: Date;
  expiresAt?: Date;
}

export interface DocumentFolder {
  id: string;
  tenantId: string;
  name: string;
  parentId?: string;
  createdBy: string;
  createdAt: Date;
  path: string;
}

export interface VersionComparison {
  documentId: string;
  version1: number;
  version2: number;
  differences: VersionDifference[];
  summary: { additions: number; deletions: number; modifications: number };
}

export interface VersionDifference {
  type: 'addition' | 'deletion' | 'modification';
  position: number;
  oldContent?: string;
  newContent?: string;
}

export interface DocumentSearchResult {
  document: Document;
  score: number;
  matchedFields: string[];
}

export interface DocumentStats {
  totalDocuments: number;
  documentsByType: { type: DocumentType; count: number }[];
  documentsByStatus: { status: DocumentStatus; count: number }[];
  totalVersions: number;
  averageVersionsPerDocument: number;
  totalStorageUsed: number;
  lockedDocuments: number;
}

@Injectable()
export class DocumentVersioningService {
  private readonly logger = new Logger(DocumentVersioningService.name);

  // In-memory storage
  private documents: Map<string, Document> = new Map();
  private versions: Map<string, DocumentVersion> = new Map();
  private locks: Map<string, DocumentLock> = new Map();
  private shares: Map<string, DocumentShare> = new Map();
  private folders: Map<string, DocumentFolder> = new Map();

  // ID counters
  private docIdCounter = 0;
  private versionIdCounter = 0;
  private lockIdCounter = 0;
  private shareIdCounter = 0;
  private folderIdCounter = 0;

  // Lock timeout in minutes
  private readonly lockTimeout = 30;

  constructor(private configService: ConfigService) {}

  private generateId(prefix: string, counter: number): string {
    return `${prefix}-${counter}-${Date.now()}`;
  }

  private calculateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  // =================== DOCUMENTS ===================

  async createDocument(
    tenantId: string,
    name: string,
    type: DocumentType,
    content: string,
    createdBy: string,
    options?: {
      description?: string;
      tags?: string[];
      folderId?: string;
      customFields?: Record<string, any>;
    },
  ): Promise<Document> {
    const doc: Document = {
      id: this.generateId('doc', ++this.docIdCounter),
      tenantId,
      name,
      type,
      status: 'draft',
      currentVersion: 1,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        description: options?.description,
        size: content.length,
        checksum: this.calculateHash(content),
        customFields: options?.customFields,
      },
      tags: options?.tags || [],
      folderId: options?.folderId,
    };

    this.documents.set(doc.id, doc);

    // Create initial version
    await this.createVersion(doc.id, content, createdBy, 'Initial version');

    this.logger.log(`Created document: ${name} (${doc.id})`);
    return doc;
  }

  async getDocument(documentId: string): Promise<Document | null> {
    return this.documents.get(documentId) || null;
  }

  async getDocuments(
    tenantId: string,
    filters?: {
      type?: DocumentType;
      status?: DocumentStatus;
      folderId?: string;
      tags?: string[];
      createdBy?: string;
    },
    limit: number = 100,
  ): Promise<Document[]> {
    let docs = Array.from(this.documents.values())
      .filter(d => d.tenantId === tenantId);

    if (filters?.type) {
      docs = docs.filter(d => d.type === filters.type);
    }
    if (filters?.status) {
      docs = docs.filter(d => d.status === filters.status);
    }
    if (filters?.folderId) {
      docs = docs.filter(d => d.folderId === filters.folderId);
    }
    if (filters?.tags && filters.tags.length > 0) {
      docs = docs.filter(d => filters.tags!.some(tag => d.tags.includes(tag)));
    }
    if (filters?.createdBy) {
      docs = docs.filter(d => d.createdBy === filters.createdBy);
    }

    return docs
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, limit);
  }

  async updateDocument(
    documentId: string,
    updates: Partial<Omit<Document, 'id' | 'tenantId' | 'createdAt' | 'createdBy'>>,
  ): Promise<Document | null> {
    const doc = this.documents.get(documentId);
    if (!doc) return null;

    const updated: Document = {
      ...doc,
      ...updates,
      updatedAt: new Date(),
      metadata: { ...doc.metadata, ...updates.metadata },
    };

    this.documents.set(documentId, updated);
    return updated;
  }

  async deleteDocument(documentId: string, permanent: boolean = false): Promise<boolean> {
    const doc = this.documents.get(documentId);
    if (!doc) return false;

    if (permanent) {
      // Delete all versions
      const versions = await this.getVersions(documentId);
      for (const v of versions) {
        this.versions.delete(v.id);
      }
      // Delete shares
      const shares = await this.getDocumentShares(documentId);
      for (const s of shares) {
        this.shares.delete(s.id);
      }
      // Delete document
      this.documents.delete(documentId);
    } else {
      // Soft delete
      doc.status = 'deleted';
      doc.updatedAt = new Date();
      this.documents.set(documentId, doc);
    }

    return true;
  }

  async restoreDocument(documentId: string): Promise<Document | null> {
    const doc = this.documents.get(documentId);
    if (!doc || doc.status !== 'deleted') return null;

    doc.status = 'active';
    doc.updatedAt = new Date();
    this.documents.set(documentId, doc);
    return doc;
  }

  async archiveDocument(documentId: string): Promise<Document | null> {
    const doc = this.documents.get(documentId);
    if (!doc) return null;

    doc.status = 'archived';
    doc.updatedAt = new Date();
    this.documents.set(documentId, doc);
    return doc;
  }

  // =================== VERSIONS ===================

  private async createVersion(
    documentId: string,
    content: string,
    createdBy: string,
    comment?: string,
  ): Promise<DocumentVersion> {
    const doc = this.documents.get(documentId);
    if (!doc) throw new Error('Document not found');

    const version: DocumentVersion = {
      id: this.generateId('version', ++this.versionIdCounter),
      documentId,
      version: doc.currentVersion,
      content,
      contentHash: this.calculateHash(content),
      size: content.length,
      createdBy,
      createdAt: new Date(),
      comment,
    };

    this.versions.set(version.id, version);
    return version;
  }

  async saveNewVersion(
    documentId: string,
    content: string,
    userId: string,
    comment?: string,
  ): Promise<DocumentVersion | null> {
    const doc = this.documents.get(documentId);
    if (!doc) return null;

    // Check for lock
    const lock = await this.getDocumentLock(documentId);
    if (lock && lock.userId !== userId && lock.type === 'exclusive') {
      throw new Error(`Document is locked by another user until ${lock.expiresAt}`);
    }

    // Increment version
    doc.currentVersion++;
    doc.updatedAt = new Date();
    doc.metadata.size = content.length;
    doc.metadata.checksum = this.calculateHash(content);
    this.documents.set(documentId, doc);

    // Get previous version for change tracking
    const previousVersion = await this.getVersion(documentId, doc.currentVersion - 1);
    const changes = previousVersion ? this.detectChanges(previousVersion.content, content) : [];

    const version = await this.createVersion(documentId, content, userId, comment);
    version.changes = changes;
    this.versions.set(version.id, version);

    return version;
  }

  async getVersion(documentId: string, versionNumber: number): Promise<DocumentVersion | null> {
    const versions = Array.from(this.versions.values())
      .filter(v => v.documentId === documentId && v.version === versionNumber);

    return versions[0] || null;
  }

  async getVersionById(versionId: string): Promise<DocumentVersion | null> {
    return this.versions.get(versionId) || null;
  }

  async getVersions(documentId: string): Promise<DocumentVersion[]> {
    return Array.from(this.versions.values())
      .filter(v => v.documentId === documentId)
      .sort((a, b) => b.version - a.version);
  }

  async getLatestVersion(documentId: string): Promise<DocumentVersion | null> {
    const doc = this.documents.get(documentId);
    if (!doc) return null;

    return this.getVersion(documentId, doc.currentVersion);
  }

  async restoreVersion(documentId: string, versionNumber: number, userId: string): Promise<Document | null> {
    const doc = this.documents.get(documentId);
    if (!doc) return null;

    const targetVersion = await this.getVersion(documentId, versionNumber);
    if (!targetVersion) return null;

    // Save as new version
    await this.saveNewVersion(
      documentId,
      targetVersion.content,
      userId,
      `Restored from version ${versionNumber}`,
    );

    return this.documents.get(documentId) || null;
  }

  async compareVersions(documentId: string, version1: number, version2: number): Promise<VersionComparison | null> {
    const v1 = await this.getVersion(documentId, version1);
    const v2 = await this.getVersion(documentId, version2);

    if (!v1 || !v2) return null;

    const differences = this.computeDifferences(v1.content, v2.content);

    return {
      documentId,
      version1,
      version2,
      differences,
      summary: {
        additions: differences.filter(d => d.type === 'addition').length,
        deletions: differences.filter(d => d.type === 'deletion').length,
        modifications: differences.filter(d => d.type === 'modification').length,
      },
    };
  }

  private detectChanges(oldContent: string, newContent: string): VersionChange[] {
    const changes: VersionChange[] = [];

    if (oldContent.length !== newContent.length) {
      changes.push({
        field: 'size',
        oldValue: oldContent.length,
        newValue: newContent.length,
      });
    }

    return changes;
  }

  private computeDifferences(content1: string, content2: string): VersionDifference[] {
    const differences: VersionDifference[] = [];

    // Simple line-by-line comparison
    const lines1 = content1.split('\n');
    const lines2 = content2.split('\n');

    const maxLines = Math.max(lines1.length, lines2.length);

    for (let i = 0; i < maxLines; i++) {
      const line1 = lines1[i];
      const line2 = lines2[i];

      if (line1 === undefined && line2 !== undefined) {
        differences.push({
          type: 'addition',
          position: i,
          newContent: line2,
        });
      } else if (line1 !== undefined && line2 === undefined) {
        differences.push({
          type: 'deletion',
          position: i,
          oldContent: line1,
        });
      } else if (line1 !== line2) {
        differences.push({
          type: 'modification',
          position: i,
          oldContent: line1,
          newContent: line2,
        });
      }
    }

    return differences;
  }

  // =================== LOCKS ===================

  async acquireLock(
    documentId: string,
    userId: string,
    type: LockType = 'exclusive',
    reason?: string,
    durationMinutes?: number,
  ): Promise<DocumentLock | null> {
    const doc = this.documents.get(documentId);
    if (!doc) return null;

    // Check for existing lock
    const existingLock = await this.getDocumentLock(documentId);
    if (existingLock) {
      if (existingLock.userId === userId) {
        // Extend lock
        existingLock.expiresAt = new Date(Date.now() + (durationMinutes || this.lockTimeout) * 60000);
        this.locks.set(existingLock.id, existingLock);
        return existingLock;
      }
      if (existingLock.type === 'exclusive') {
        return null; // Cannot acquire lock
      }
    }

    const lock: DocumentLock = {
      id: this.generateId('lock', ++this.lockIdCounter),
      documentId,
      userId,
      type,
      acquiredAt: new Date(),
      expiresAt: new Date(Date.now() + (durationMinutes || this.lockTimeout) * 60000),
      reason,
    };

    this.locks.set(lock.id, lock);
    return lock;
  }

  async releaseLock(documentId: string, userId: string): Promise<boolean> {
    const lock = await this.getDocumentLock(documentId);
    if (!lock || lock.userId !== userId) return false;

    this.locks.delete(lock.id);
    return true;
  }

  async getDocumentLock(documentId: string): Promise<DocumentLock | null> {
    const now = new Date();
    const locks = Array.from(this.locks.values())
      .filter(l => l.documentId === documentId && l.expiresAt > now);

    return locks[0] || null;
  }

  async getLockedDocuments(tenantId: string): Promise<Document[]> {
    const now = new Date();
    const lockedDocIds = new Set(
      Array.from(this.locks.values())
        .filter(l => l.expiresAt > now)
        .map(l => l.documentId)
    );

    return Array.from(this.documents.values())
      .filter(d => d.tenantId === tenantId && lockedDocIds.has(d.id));
  }

  // =================== SHARING ===================

  async shareDocument(
    documentId: string,
    sharedWith: string,
    sharedBy: string,
    permission: PermissionLevel,
    expiresAt?: Date,
  ): Promise<DocumentShare | null> {
    const doc = this.documents.get(documentId);
    if (!doc) return null;

    // Check if already shared
    const existingShare = Array.from(this.shares.values())
      .find(s => s.documentId === documentId && s.sharedWith === sharedWith);

    if (existingShare) {
      existingShare.permission = permission;
      existingShare.expiresAt = expiresAt;
      this.shares.set(existingShare.id, existingShare);
      return existingShare;
    }

    const share: DocumentShare = {
      id: this.generateId('share', ++this.shareIdCounter),
      documentId,
      sharedWith,
      sharedBy,
      permission,
      sharedAt: new Date(),
      expiresAt,
    };

    this.shares.set(share.id, share);
    return share;
  }

  async revokeShare(documentId: string, sharedWith: string): Promise<boolean> {
    const share = Array.from(this.shares.values())
      .find(s => s.documentId === documentId && s.sharedWith === sharedWith);

    if (!share) return false;
    this.shares.delete(share.id);
    return true;
  }

  async getDocumentShares(documentId: string): Promise<DocumentShare[]> {
    const now = new Date();
    return Array.from(this.shares.values())
      .filter(s => s.documentId === documentId && (!s.expiresAt || s.expiresAt > now));
  }

  async getSharedWithMe(userId: string): Promise<Document[]> {
    const now = new Date();
    const sharedDocIds = Array.from(this.shares.values())
      .filter(s => s.sharedWith === userId && (!s.expiresAt || s.expiresAt > now))
      .map(s => s.documentId);

    return Array.from(this.documents.values())
      .filter(d => sharedDocIds.includes(d.id));
  }

  async checkPermission(documentId: string, userId: string): Promise<PermissionLevel | null> {
    const doc = this.documents.get(documentId);
    if (!doc) return null;

    // Owner has admin permission
    if (doc.createdBy === userId) return 'admin';

    // Check shares
    const share = Array.from(this.shares.values())
      .find(s => s.documentId === documentId && s.sharedWith === userId);

    if (!share) return null;
    if (share.expiresAt && share.expiresAt < new Date()) return null;

    return share.permission;
  }

  // =================== FOLDERS ===================

  async createFolder(
    tenantId: string,
    name: string,
    createdBy: string,
    parentId?: string,
  ): Promise<DocumentFolder> {
    let path = `/${name}`;

    if (parentId) {
      const parent = this.folders.get(parentId);
      if (parent) {
        path = `${parent.path}/${name}`;
      }
    }

    const folder: DocumentFolder = {
      id: this.generateId('folder', ++this.folderIdCounter),
      tenantId,
      name,
      parentId,
      createdBy,
      createdAt: new Date(),
      path,
    };

    this.folders.set(folder.id, folder);
    return folder;
  }

  async getFolder(folderId: string): Promise<DocumentFolder | null> {
    return this.folders.get(folderId) || null;
  }

  async getFolders(tenantId: string, parentId?: string): Promise<DocumentFolder[]> {
    return Array.from(this.folders.values())
      .filter(f => f.tenantId === tenantId && f.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async deleteFolder(folderId: string): Promise<boolean> {
    const folder = this.folders.get(folderId);
    if (!folder) return false;

    // Check if empty
    const docs = Array.from(this.documents.values())
      .filter(d => d.folderId === folderId);

    const subfolders = Array.from(this.folders.values())
      .filter(f => f.parentId === folderId);

    if (docs.length > 0 || subfolders.length > 0) {
      return false; // Folder not empty
    }

    this.folders.delete(folderId);
    return true;
  }

  // =================== SEARCH ===================

  async searchDocuments(
    tenantId: string,
    query: string,
    options?: {
      type?: DocumentType;
      status?: DocumentStatus;
      includeTags?: boolean;
      includeContent?: boolean;
    },
  ): Promise<DocumentSearchResult[]> {
    const results: DocumentSearchResult[] = [];
    const queryLower = query.toLowerCase();

    let docs = Array.from(this.documents.values())
      .filter(d => d.tenantId === tenantId && d.status !== 'deleted');

    if (options?.type) {
      docs = docs.filter(d => d.type === options.type);
    }
    if (options?.status) {
      docs = docs.filter(d => d.status === options.status);
    }

    for (const doc of docs) {
      const matchedFields: string[] = [];
      let score = 0;

      // Search name
      if (doc.name.toLowerCase().includes(queryLower)) {
        matchedFields.push('name');
        score += 10;
      }

      // Search description
      if (doc.metadata.description?.toLowerCase().includes(queryLower)) {
        matchedFields.push('description');
        score += 5;
      }

      // Search tags
      if (options?.includeTags !== false && doc.tags.some(t => t.toLowerCase().includes(queryLower))) {
        matchedFields.push('tags');
        score += 3;
      }

      // Search content
      if (options?.includeContent) {
        const latestVersion = await this.getLatestVersion(doc.id);
        if (latestVersion?.content.toLowerCase().includes(queryLower)) {
          matchedFields.push('content');
          score += 1;
        }
      }

      if (matchedFields.length > 0) {
        results.push({ document: doc, score, matchedFields });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  // =================== TAGS ===================

  async addTag(documentId: string, tag: string): Promise<Document | null> {
    const doc = this.documents.get(documentId);
    if (!doc) return null;

    if (!doc.tags.includes(tag)) {
      doc.tags.push(tag);
      doc.updatedAt = new Date();
      this.documents.set(documentId, doc);
    }

    return doc;
  }

  async removeTag(documentId: string, tag: string): Promise<Document | null> {
    const doc = this.documents.get(documentId);
    if (!doc) return null;

    const index = doc.tags.indexOf(tag);
    if (index > -1) {
      doc.tags.splice(index, 1);
      doc.updatedAt = new Date();
      this.documents.set(documentId, doc);
    }

    return doc;
  }

  async getTagsUsed(tenantId: string): Promise<{ tag: string; count: number }[]> {
    const tagCounts = new Map<string, number>();

    for (const doc of this.documents.values()) {
      if (doc.tenantId === tenantId) {
        for (const tag of doc.tags) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        }
      }
    }

    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }

  // =================== STATISTICS ===================

  async getDocumentStats(tenantId: string): Promise<DocumentStats> {
    const docs = Array.from(this.documents.values())
      .filter(d => d.tenantId === tenantId);

    const versions = Array.from(this.versions.values())
      .filter(v => docs.some(d => d.id === v.documentId));

    const typeMap = new Map<DocumentType, number>();
    const statusMap = new Map<DocumentStatus, number>();
    let totalStorage = 0;

    for (const doc of docs) {
      typeMap.set(doc.type, (typeMap.get(doc.type) || 0) + 1);
      statusMap.set(doc.status, (statusMap.get(doc.status) || 0) + 1);
    }

    for (const v of versions) {
      totalStorage += v.size;
    }

    const lockedDocs = await this.getLockedDocuments(tenantId);

    return {
      totalDocuments: docs.length,
      documentsByType: Array.from(typeMap.entries())
        .map(([type, count]) => ({ type, count })),
      documentsByStatus: Array.from(statusMap.entries())
        .map(([status, count]) => ({ status, count })),
      totalVersions: versions.length,
      averageVersionsPerDocument: docs.length > 0 ? versions.length / docs.length : 0,
      totalStorageUsed: totalStorage,
      lockedDocuments: lockedDocs.length,
    };
  }

  // =================== METADATA ===================

  getDocumentTypes(): DocumentType[] {
    return ['invoice', 'contract', 'report', 'policy', 'form', 'other'];
  }

  getDocumentStatuses(): DocumentStatus[] {
    return ['draft', 'active', 'archived', 'deleted'];
  }

  getPermissionLevels(): PermissionLevel[] {
    return ['view', 'edit', 'admin'];
  }
}
