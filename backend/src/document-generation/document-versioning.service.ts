import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// =================== TYPES ===================

export type VersionStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'published' | 'archived';
export type ChangeType = 'created' | 'modified' | 'renamed' | 'moved' | 'restored' | 'deleted';

export interface DocumentVersion {
  id: string;
  documentId: string;
  tenantId: string;
  versionNumber: number;
  label?: string;
  status: VersionStatus;
  content: string;
  contentHash: string;
  fileSize: number;
  mimeType: string;
  metadata: Record<string, any>;
  changes: VersionChange[];
  createdBy: string;
  createdAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewComment?: string;
  publishedBy?: string;
  publishedAt?: Date;
}

export interface VersionChange {
  type: ChangeType;
  field?: string;
  oldValue?: any;
  newValue?: any;
  description?: string;
}

export interface VersionComparison {
  version1: number;
  version2: number;
  additions: number;
  deletions: number;
  modifications: number;
  diff: Array<{
    type: 'added' | 'removed' | 'unchanged' | 'modified';
    content: string;
    lineNumber?: number;
  }>;
}

export interface VersionBranch {
  id: string;
  documentId: string;
  tenantId: string;
  name: string;
  description?: string;
  baseVersion: number;
  headVersion: number;
  status: 'active' | 'merged' | 'closed';
  versions: DocumentVersion[];
  createdBy: string;
  createdAt: Date;
  mergedAt?: Date;
  mergedBy?: string;
  mergeTargetBranch?: string;
}

export interface VersionLock {
  documentId: string;
  lockedBy: string;
  lockedByName: string;
  lockedAt: Date;
  expiresAt: Date;
  reason?: string;
}

export interface RetentionPolicy {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  conditions: {
    olderThanDays?: number;
    status?: VersionStatus[];
    excludeLabeled?: boolean;
    keepMinVersions?: number;
    keepMajorVersions?: boolean;
  };
  action: 'archive' | 'delete';
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  lastRunAt?: Date;
  versionsAffected?: number;
}

// =================== SERVICE ===================

@Injectable()
export class DocumentVersioningService {
  private versions: Map<string, DocumentVersion[]> = new Map();
  private branches: Map<string, VersionBranch> = new Map();
  private locks: Map<string, VersionLock> = new Map();
  private policies: Map<string, RetentionPolicy> = new Map();

  constructor(private eventEmitter: EventEmitter2) {}

  // =================== VERSION MANAGEMENT ===================

  async createVersion(data: {
    documentId: string;
    tenantId: string;
    content: string;
    mimeType: string;
    label?: string;
    metadata?: Record<string, any>;
    changes?: VersionChange[];
    createdBy: string;
  }): Promise<DocumentVersion> {
    // Check for lock
    const lock = this.locks.get(data.documentId);
    if (lock && lock.lockedBy !== data.createdBy && lock.expiresAt > new Date()) {
      throw new Error(`Document is locked by ${lock.lockedByName}`);
    }

    const documentVersions = this.versions.get(data.documentId) || [];
    const nextVersionNumber = documentVersions.length > 0
      ? Math.max(...documentVersions.map(v => v.versionNumber)) + 1
      : 1;

    const id = `ver-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const version: DocumentVersion = {
      id,
      documentId: data.documentId,
      tenantId: data.tenantId,
      versionNumber: nextVersionNumber,
      label: data.label,
      status: 'draft',
      content: data.content,
      contentHash: this.generateHash(data.content),
      fileSize: data.content.length,
      mimeType: data.mimeType,
      metadata: data.metadata || {},
      changes: data.changes || [{ type: 'created' }],
      createdBy: data.createdBy,
      createdAt: new Date(),
    };

    documentVersions.push(version);
    this.versions.set(data.documentId, documentVersions);

    this.eventEmitter.emit('document.version.created', { version });

    return version;
  }

  async getVersions(
    documentId: string,
    filters?: {
      status?: VersionStatus;
      startDate?: Date;
      endDate?: Date;
      createdBy?: string;
      limit?: number;
    },
  ): Promise<DocumentVersion[]> {
    let versions = this.versions.get(documentId) || [];

    if (filters?.status) {
      versions = versions.filter(v => v.status === filters.status);
    }

    if (filters?.startDate) {
      versions = versions.filter(v => v.createdAt >= filters.startDate!);
    }

    if (filters?.endDate) {
      versions = versions.filter(v => v.createdAt <= filters.endDate!);
    }

    if (filters?.createdBy) {
      versions = versions.filter(v => v.createdBy === filters.createdBy);
    }

    versions = versions.sort((a, b) => b.versionNumber - a.versionNumber);

    if (filters?.limit) {
      versions = versions.slice(0, filters.limit);
    }

    return versions;
  }

  async getVersion(documentId: string, versionNumber: number): Promise<DocumentVersion | null> {
    const versions = this.versions.get(documentId) || [];
    return versions.find(v => v.versionNumber === versionNumber) || null;
  }

  async getLatestVersion(documentId: string): Promise<DocumentVersion | null> {
    const versions = this.versions.get(documentId) || [];
    if (versions.length === 0) return null;
    return versions.reduce((latest, v) => v.versionNumber > latest.versionNumber ? v : latest);
  }

  async getPublishedVersion(documentId: string): Promise<DocumentVersion | null> {
    const versions = this.versions.get(documentId) || [];
    const published = versions.filter(v => v.status === 'published');
    if (published.length === 0) return null;
    return published.reduce((latest, v) => v.publishedAt! > latest.publishedAt! ? v : latest);
  }

  async updateVersionStatus(
    documentId: string,
    versionNumber: number,
    status: VersionStatus,
    userId: string,
    comment?: string,
  ): Promise<DocumentVersion | null> {
    const version = await this.getVersion(documentId, versionNumber);
    if (!version) return null;

    const oldStatus = version.status;
    version.status = status;

    if (status === 'approved' || status === 'rejected') {
      version.reviewedBy = userId;
      version.reviewedAt = new Date();
      version.reviewComment = comment;
    }

    if (status === 'published') {
      version.publishedBy = userId;
      version.publishedAt = new Date();

      // Unpublish other versions
      const versions = this.versions.get(documentId) || [];
      for (const v of versions) {
        if (v.versionNumber !== versionNumber && v.status === 'published') {
          v.status = 'archived';
        }
      }
    }

    this.eventEmitter.emit('document.version.status.changed', {
      version,
      oldStatus,
      newStatus: status,
      userId,
    });

    return version;
  }

  async labelVersion(
    documentId: string,
    versionNumber: number,
    label: string,
  ): Promise<DocumentVersion | null> {
    const version = await this.getVersion(documentId, versionNumber);
    if (!version) return null;

    version.label = label;

    this.eventEmitter.emit('document.version.labeled', { version, label });

    return version;
  }

  // =================== VERSION COMPARISON ===================

  async compareVersions(
    documentId: string,
    version1: number,
    version2: number,
  ): Promise<VersionComparison | null> {
    const v1 = await this.getVersion(documentId, version1);
    const v2 = await this.getVersion(documentId, version2);

    if (!v1 || !v2) return null;

    const lines1 = v1.content.split('\n');
    const lines2 = v2.content.split('\n');

    const diff = this.computeDiff(lines1, lines2);

    const additions = diff.filter(d => d.type === 'added').length;
    const deletions = diff.filter(d => d.type === 'removed').length;
    const modifications = diff.filter(d => d.type === 'modified').length;

    return {
      version1,
      version2,
      additions,
      deletions,
      modifications,
      diff,
    };
  }

  private computeDiff(
    lines1: string[],
    lines2: string[],
  ): VersionComparison['diff'] {
    const diff: VersionComparison['diff'] = [];
    const maxLines = Math.max(lines1.length, lines2.length);

    for (let i = 0; i < maxLines; i++) {
      const line1 = lines1[i];
      const line2 = lines2[i];

      if (line1 === undefined) {
        diff.push({ type: 'added', content: line2, lineNumber: i + 1 });
      } else if (line2 === undefined) {
        diff.push({ type: 'removed', content: line1, lineNumber: i + 1 });
      } else if (line1 === line2) {
        diff.push({ type: 'unchanged', content: line1, lineNumber: i + 1 });
      } else {
        diff.push({ type: 'modified', content: `- ${line1}\n+ ${line2}`, lineNumber: i + 1 });
      }
    }

    return diff;
  }

  // =================== VERSION RESTORATION ===================

  async restoreVersion(
    documentId: string,
    versionNumber: number,
    userId: string,
  ): Promise<DocumentVersion> {
    const versionToRestore = await this.getVersion(documentId, versionNumber);
    if (!versionToRestore) {
      throw new Error('Version not found');
    }

    return this.createVersion({
      documentId,
      tenantId: versionToRestore.tenantId,
      content: versionToRestore.content,
      mimeType: versionToRestore.mimeType,
      metadata: {
        ...versionToRestore.metadata,
        restoredFrom: versionNumber,
      },
      changes: [
        {
          type: 'restored',
          description: `Restored from version ${versionNumber}`,
        },
      ],
      createdBy: userId,
    });
  }

  // =================== BRANCHING ===================

  async createBranch(data: {
    documentId: string;
    tenantId: string;
    name: string;
    description?: string;
    baseVersion: number;
    createdBy: string;
  }): Promise<VersionBranch> {
    const baseVersionDoc = await this.getVersion(data.documentId, data.baseVersion);
    if (!baseVersionDoc) {
      throw new Error('Base version not found');
    }

    const id = `branch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const branch: VersionBranch = {
      id,
      documentId: data.documentId,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      baseVersion: data.baseVersion,
      headVersion: data.baseVersion,
      status: 'active',
      versions: [{ ...baseVersionDoc, versionNumber: 1 }],
      createdBy: data.createdBy,
      createdAt: new Date(),
    };

    this.branches.set(id, branch);

    this.eventEmitter.emit('document.branch.created', { branch });

    return branch;
  }

  async getBranches(
    documentId: string,
    filters?: {
      status?: VersionBranch['status'];
    },
  ): Promise<VersionBranch[]> {
    let branches = Array.from(this.branches.values()).filter(
      b => b.documentId === documentId,
    );

    if (filters?.status) {
      branches = branches.filter(b => b.status === filters.status);
    }

    return branches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getBranch(branchId: string): Promise<VersionBranch | null> {
    return this.branches.get(branchId) || null;
  }

  async addVersionToBranch(
    branchId: string,
    content: string,
    mimeType: string,
    userId: string,
    changes?: VersionChange[],
  ): Promise<DocumentVersion> {
    const branch = this.branches.get(branchId);
    if (!branch) {
      throw new Error('Branch not found');
    }

    if (branch.status !== 'active') {
      throw new Error('Cannot add versions to a non-active branch');
    }

    const nextVersionNumber = branch.versions.length + 1;
    const id = `ver-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const version: DocumentVersion = {
      id,
      documentId: branch.documentId,
      tenantId: branch.tenantId,
      versionNumber: nextVersionNumber,
      status: 'draft',
      content,
      contentHash: this.generateHash(content),
      fileSize: content.length,
      mimeType,
      metadata: { branchId },
      changes: changes || [{ type: 'modified' }],
      createdBy: userId,
      createdAt: new Date(),
    };

    branch.versions.push(version);
    branch.headVersion = nextVersionNumber;

    this.eventEmitter.emit('document.branch.version.added', { branch, version });

    return version;
  }

  async mergeBranch(
    branchId: string,
    targetBranchId: string | null,
    userId: string,
  ): Promise<DocumentVersion> {
    const branch = this.branches.get(branchId);
    if (!branch) {
      throw new Error('Branch not found');
    }

    const headVersion = branch.versions.find(v => v.versionNumber === branch.headVersion);
    if (!headVersion) {
      throw new Error('Head version not found');
    }

    // Create a new version in the main document or target branch
    let newVersion: DocumentVersion;

    if (targetBranchId) {
      const targetBranch = this.branches.get(targetBranchId);
      if (!targetBranch) {
        throw new Error('Target branch not found');
      }

      newVersion = await this.addVersionToBranch(
        targetBranchId,
        headVersion.content,
        headVersion.mimeType,
        userId,
        [{ type: 'modified', description: `Merged from branch ${branch.name}` }],
      );
    } else {
      newVersion = await this.createVersion({
        documentId: branch.documentId,
        tenantId: branch.tenantId,
        content: headVersion.content,
        mimeType: headVersion.mimeType,
        metadata: {
          ...headVersion.metadata,
          mergedFromBranch: branchId,
        },
        changes: [{ type: 'modified', description: `Merged from branch ${branch.name}` }],
        createdBy: userId,
      });
    }

    branch.status = 'merged';
    branch.mergedAt = new Date();
    branch.mergedBy = userId;
    branch.mergeTargetBranch = targetBranchId || 'main';

    this.eventEmitter.emit('document.branch.merged', { branch, newVersion });

    return newVersion;
  }

  async closeBranch(branchId: string): Promise<VersionBranch | null> {
    const branch = this.branches.get(branchId);
    if (!branch) return null;

    branch.status = 'closed';

    this.eventEmitter.emit('document.branch.closed', { branch });

    return branch;
  }

  // =================== LOCKING ===================

  async lockDocument(
    documentId: string,
    userId: string,
    userName: string,
    reason?: string,
    durationMinutes: number = 60,
  ): Promise<VersionLock> {
    const existingLock = this.locks.get(documentId);
    if (existingLock && existingLock.expiresAt > new Date() && existingLock.lockedBy !== userId) {
      throw new Error(`Document is already locked by ${existingLock.lockedByName}`);
    }

    const lock: VersionLock = {
      documentId,
      lockedBy: userId,
      lockedByName: userName,
      lockedAt: new Date(),
      expiresAt: new Date(Date.now() + durationMinutes * 60 * 1000),
      reason,
    };

    this.locks.set(documentId, lock);

    this.eventEmitter.emit('document.locked', { lock });

    return lock;
  }

  async unlockDocument(documentId: string, userId: string): Promise<void> {
    const lock = this.locks.get(documentId);
    if (!lock) return;

    if (lock.lockedBy !== userId) {
      throw new Error('Only the user who locked the document can unlock it');
    }

    this.locks.delete(documentId);

    this.eventEmitter.emit('document.unlocked', { documentId, userId });
  }

  async forceUnlock(documentId: string, adminUserId: string): Promise<void> {
    const lock = this.locks.get(documentId);
    if (lock) {
      this.locks.delete(documentId);
      this.eventEmitter.emit('document.force.unlocked', {
        documentId,
        adminUserId,
        previousLock: lock,
      });
    }
  }

  async getLock(documentId: string): Promise<VersionLock | null> {
    const lock = this.locks.get(documentId);
    if (lock && lock.expiresAt <= new Date()) {
      this.locks.delete(documentId);
      return null;
    }
    return lock || null;
  }

  async extendLock(documentId: string, userId: string, additionalMinutes: number): Promise<VersionLock | null> {
    const lock = this.locks.get(documentId);
    if (!lock || lock.lockedBy !== userId) {
      return null;
    }

    lock.expiresAt = new Date(lock.expiresAt.getTime() + additionalMinutes * 60 * 1000);

    return lock;
  }

  // =================== RETENTION POLICIES ===================

  async createRetentionPolicy(data: {
    tenantId: string;
    name: string;
    description?: string;
    conditions: RetentionPolicy['conditions'];
    action: RetentionPolicy['action'];
    createdBy: string;
  }): Promise<RetentionPolicy> {
    const id = `policy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const policy: RetentionPolicy = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      conditions: data.conditions,
      action: data.action,
      isActive: true,
      createdBy: data.createdBy,
      createdAt: new Date(),
    };

    this.policies.set(id, policy);

    return policy;
  }

  async getRetentionPolicies(tenantId: string): Promise<RetentionPolicy[]> {
    return Array.from(this.policies.values()).filter(p => p.tenantId === tenantId);
  }

  async executeRetentionPolicy(policyId: string): Promise<{
    versionsAffected: number;
    action: string;
  }> {
    const policy = this.policies.get(policyId);
    if (!policy || !policy.isActive) {
      throw new Error('Policy not found or inactive');
    }

    let versionsAffected = 0;
    const now = new Date();

    for (const [documentId, documentVersions] of this.versions.entries()) {
      // Keep minimum versions
      const keepMinVersions = policy.conditions.keepMinVersions || 1;
      const sortedVersions = [...documentVersions].sort((a, b) => b.versionNumber - a.versionNumber);

      for (let i = keepMinVersions; i < sortedVersions.length; i++) {
        const version = sortedVersions[i];

        // Check conditions
        let shouldProcess = true;

        if (policy.conditions.olderThanDays) {
          const ageMs = now.getTime() - version.createdAt.getTime();
          const ageDays = ageMs / (1000 * 60 * 60 * 24);
          if (ageDays < policy.conditions.olderThanDays) {
            shouldProcess = false;
          }
        }

        if (policy.conditions.status && !policy.conditions.status.includes(version.status)) {
          shouldProcess = false;
        }

        if (policy.conditions.excludeLabeled && version.label) {
          shouldProcess = false;
        }

        if (policy.conditions.keepMajorVersions && version.label?.startsWith('v')) {
          shouldProcess = false;
        }

        if (shouldProcess) {
          if (policy.action === 'archive') {
            version.status = 'archived';
          } else if (policy.action === 'delete') {
            const index = documentVersions.findIndex(v => v.id === version.id);
            if (index !== -1) {
              documentVersions.splice(index, 1);
            }
          }
          versionsAffected++;
        }
      }
    }

    policy.lastRunAt = new Date();
    policy.versionsAffected = versionsAffected;

    this.eventEmitter.emit('document.retention.executed', { policy, versionsAffected });

    return { versionsAffected, action: policy.action };
  }

  // =================== UTILITIES ===================

  private generateHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }

  // =================== STATS ===================

  async getStats(tenantId: string): Promise<{
    totalDocuments: number;
    totalVersions: number;
    versionsByStatus: Record<string, number>;
    activeBranches: number;
    lockedDocuments: number;
    activePolicies: number;
  }> {
    const allVersions = Array.from(this.versions.values()).flat();
    const tenantVersions = allVersions.filter(v => v.tenantId === tenantId);
    const tenantDocuments = new Set(tenantVersions.map(v => v.documentId));

    const versionsByStatus: Record<string, number> = {};
    for (const version of tenantVersions) {
      versionsByStatus[version.status] = (versionsByStatus[version.status] || 0) + 1;
    }

    const branches = Array.from(this.branches.values()).filter(
      b => b.tenantId === tenantId && b.status === 'active',
    );

    const locks = Array.from(this.locks.values()).filter(
      l => l.expiresAt > new Date(),
    );

    const policies = Array.from(this.policies.values()).filter(
      p => p.tenantId === tenantId && p.isActive,
    );

    return {
      totalDocuments: tenantDocuments.size,
      totalVersions: tenantVersions.length,
      versionsByStatus,
      activeBranches: branches.length,
      lockedDocuments: locks.length,
      activePolicies: policies.length,
    };
  }
}
