import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';

export type DocumentType = 'INVOICE' | 'CONTRACT' | 'REPORT' | 'SPREADSHEET' | 'PRESENTATION' | 'NOTE' | 'TEMPLATE';
export type PermissionLevel = 'VIEW' | 'COMMENT' | 'EDIT' | 'ADMIN';
export type PresenceStatus = 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE';
export type OperationType = 'INSERT' | 'DELETE' | 'UPDATE' | 'FORMAT' | 'MOVE';
export type ConflictResolution = 'LAST_WRITE_WINS' | 'FIRST_WRITE_WINS' | 'MERGE' | 'MANUAL';

export interface CollaborativeDocument {
  id: string;
  title: string;
  titleRo: string;
  type: DocumentType;
  ownerId: string;
  tenantId?: string;
  content: string;
  version: number;
  collaborators: DocumentCollaborator[];
  permissions: DocumentPermission[];
  isLocked: boolean;
  lockedBy?: string;
  lockedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  lastEditedBy?: string;
  tags: string[];
  metadata: Record<string, any>;
}

export interface DocumentCollaborator {
  id: string;
  documentId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  permissionLevel: PermissionLevel;
  joinedAt: Date;
  lastActiveAt: Date;
  cursorPosition?: CursorPosition;
  selection?: TextSelection;
  color: string;
}

export interface DocumentPermission {
  userId: string;
  level: PermissionLevel;
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
}

export interface CursorPosition {
  line: number;
  column: number;
  offset: number;
}

export interface TextSelection {
  start: CursorPosition;
  end: CursorPosition;
}

export interface DocumentOperation {
  id: string;
  documentId: string;
  userId: string;
  userName: string;
  type: OperationType;
  position: number;
  content?: string;
  length?: number;
  previousContent?: string;
  timestamp: Date;
  version: number;
  isApplied: boolean;
}

export interface OperationalTransform {
  operation: DocumentOperation;
  transformedAgainst: string[];
  resultingOperation: DocumentOperation;
}

export interface DocumentComment {
  id: string;
  documentId: string;
  userId: string;
  userName: string;
  content: string;
  position?: { start: number; end: number };
  parentId?: string;
  replies: DocumentComment[];
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PresenceInfo {
  userId: string;
  userName: string;
  userAvatar?: string;
  status: PresenceStatus;
  currentDocumentId?: string;
  cursorPosition?: CursorPosition;
  color: string;
  lastActiveAt: Date;
}

export interface CollaborationSession {
  id: string;
  documentId: string;
  participants: string[];
  startedAt: Date;
  endedAt?: Date;
  operationsCount: number;
  conflictsResolved: number;
}

export interface DocumentHistory {
  documentId: string;
  versions: DocumentVersion[];
}

export interface DocumentVersion {
  version: number;
  content: string;
  editedBy: string;
  editedAt: Date;
  changesSummary: string;
  operationsApplied: number;
}

export interface ConflictEvent {
  id: string;
  documentId: string;
  operations: DocumentOperation[];
  resolution: ConflictResolution;
  resolvedOperation?: DocumentOperation;
  resolvedAt?: Date;
  resolvedBy?: string;
}

@Injectable()
export class RealtimeCollaborationService {
  private documents: Map<string, CollaborativeDocument> = new Map();
  private operations: Map<string, DocumentOperation[]> = new Map();
  private presence: Map<string, PresenceInfo> = new Map();
  private sessions: Map<string, CollaborationSession> = new Map();
  private comments: Map<string, DocumentComment[]> = new Map();
  private history: Map<string, DocumentVersion[]> = new Map();
  private conflicts: Map<string, ConflictEvent[]> = new Map();
  private userColors: string[] = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  ];
  private colorIndex = 0;

  constructor(private readonly eventEmitter: EventEmitter2) {}

  // Document Management
  createDocument(data: {
    title: string;
    titleRo: string;
    type: DocumentType;
    ownerId: string;
    tenantId?: string;
    content?: string;
    tags?: string[];
    metadata?: Record<string, any>;
  }): CollaborativeDocument {
    const document: CollaborativeDocument = {
      id: `doc-${randomUUID()}`,
      title: data.title,
      titleRo: data.titleRo,
      type: data.type,
      ownerId: data.ownerId,
      tenantId: data.tenantId,
      content: data.content || '',
      version: 1,
      collaborators: [],
      permissions: [
        {
          userId: data.ownerId,
          level: 'ADMIN',
          grantedBy: 'system',
          grantedAt: new Date(),
        },
      ],
      isLocked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: data.tags || [],
      metadata: data.metadata || {},
    };

    this.documents.set(document.id, document);
    this.operations.set(document.id, []);
    this.comments.set(document.id, []);
    this.history.set(document.id, [
      {
        version: 1,
        content: document.content,
        editedBy: data.ownerId,
        editedAt: new Date(),
        changesSummary: 'Document created',
        operationsApplied: 0,
      },
    ]);
    this.conflicts.set(document.id, []);

    this.eventEmitter.emit('collaboration.document.created', {
      documentId: document.id,
      ownerId: data.ownerId,
    });

    return document;
  }

  getDocument(documentId: string): CollaborativeDocument {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }
    return document;
  }

  getAllDocuments(filters?: {
    ownerId?: string;
    tenantId?: string;
    type?: DocumentType;
    collaboratorId?: string;
  }): CollaborativeDocument[] {
    let documents = Array.from(this.documents.values());

    if (filters?.ownerId) {
      documents = documents.filter(d => d.ownerId === filters.ownerId);
    }
    if (filters?.tenantId) {
      documents = documents.filter(d => d.tenantId === filters.tenantId);
    }
    if (filters?.type) {
      documents = documents.filter(d => d.type === filters.type);
    }
    if (filters?.collaboratorId) {
      documents = documents.filter(d =>
        d.collaborators.some(c => c.userId === filters.collaboratorId) ||
        d.ownerId === filters.collaboratorId
      );
    }

    return documents.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  updateDocument(documentId: string, updates: Partial<CollaborativeDocument>): CollaborativeDocument {
    const document = this.getDocument(documentId);

    const updatedDocument = {
      ...document,
      ...updates,
      id: documentId,
      updatedAt: new Date(),
    };

    this.documents.set(documentId, updatedDocument);

    this.eventEmitter.emit('collaboration.document.updated', { documentId });

    return updatedDocument;
  }

  deleteDocument(documentId: string): void {
    if (!this.documents.has(documentId)) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    this.documents.delete(documentId);
    this.operations.delete(documentId);
    this.comments.delete(documentId);
    this.history.delete(documentId);
    this.conflicts.delete(documentId);

    this.eventEmitter.emit('collaboration.document.deleted', { documentId });
  }

  // Collaboration
  joinDocument(documentId: string, userId: string, userName: string, userAvatar?: string): DocumentCollaborator {
    const document = this.getDocument(documentId);

    // Check if user has permission
    const permission = document.permissions.find(p => p.userId === userId);
    if (!permission && document.ownerId !== userId) {
      throw new ForbiddenException('No permission to access this document');
    }

    // Check if already joined
    const existing = document.collaborators.find(c => c.userId === userId);
    if (existing) {
      existing.lastActiveAt = new Date();
      return existing;
    }

    const collaborator: DocumentCollaborator = {
      id: `collab-${randomUUID()}`,
      documentId,
      userId,
      userName,
      userAvatar,
      permissionLevel: permission?.level || (document.ownerId === userId ? 'ADMIN' : 'VIEW'),
      joinedAt: new Date(),
      lastActiveAt: new Date(),
      color: this.getNextColor(),
    };

    document.collaborators.push(collaborator);

    // Update presence
    this.updatePresence(userId, userName, 'ONLINE', documentId, collaborator.color, userAvatar);

    this.eventEmitter.emit('collaboration.user.joined', {
      documentId,
      userId,
      userName,
      collaboratorCount: document.collaborators.length,
    });

    return collaborator;
  }

  leaveDocument(documentId: string, userId: string): void {
    const document = this.getDocument(documentId);

    const index = document.collaborators.findIndex(c => c.userId === userId);
    if (index !== -1) {
      document.collaborators.splice(index, 1);
    }

    // Update presence
    const presence = this.presence.get(userId);
    if (presence) {
      presence.currentDocumentId = undefined;
      presence.status = 'ONLINE';
    }

    this.eventEmitter.emit('collaboration.user.left', {
      documentId,
      userId,
      collaboratorCount: document.collaborators.length,
    });
  }

  getActiveCollaborators(documentId: string): DocumentCollaborator[] {
    const document = this.getDocument(documentId);
    return document.collaborators;
  }

  private getNextColor(): string {
    const color = this.userColors[this.colorIndex % this.userColors.length];
    this.colorIndex++;
    return color;
  }

  // Permissions
  grantPermission(
    documentId: string,
    userId: string,
    level: PermissionLevel,
    grantedBy: string,
    expiresAt?: Date,
  ): DocumentPermission {
    const document = this.getDocument(documentId);

    // Check if grantor has permission
    const grantorPermission = document.permissions.find(p => p.userId === grantedBy);
    if (!grantorPermission && document.ownerId !== grantedBy) {
      throw new ForbiddenException('No permission to grant access');
    }
    if (grantorPermission && grantorPermission.level !== 'ADMIN') {
      throw new ForbiddenException('Only admins can grant permissions');
    }

    // Remove existing permission
    document.permissions = document.permissions.filter(p => p.userId !== userId);

    const permission: DocumentPermission = {
      userId,
      level,
      grantedBy,
      grantedAt: new Date(),
      expiresAt,
    };

    document.permissions.push(permission);

    this.eventEmitter.emit('collaboration.permission.granted', {
      documentId,
      userId,
      level,
      grantedBy,
    });

    return permission;
  }

  revokePermission(documentId: string, userId: string, revokedBy: string): void {
    const document = this.getDocument(documentId);

    if (document.ownerId === userId) {
      throw new BadRequestException('Cannot revoke owner permission');
    }

    document.permissions = document.permissions.filter(p => p.userId !== userId);
    document.collaborators = document.collaborators.filter(c => c.userId !== userId);

    this.eventEmitter.emit('collaboration.permission.revoked', {
      documentId,
      userId,
      revokedBy,
    });
  }

  // Operations (OT - Operational Transform)
  applyOperation(operation: Omit<DocumentOperation, 'id' | 'timestamp' | 'isApplied'>): DocumentOperation {
    const document = this.getDocument(operation.documentId);

    // Check permission
    const collaborator = document.collaborators.find(c => c.userId === operation.userId);
    if (!collaborator || !['EDIT', 'ADMIN'].includes(collaborator.permissionLevel)) {
      throw new ForbiddenException('No edit permission');
    }

    if (document.isLocked && document.lockedBy !== operation.userId) {
      throw new ForbiddenException('Document is locked by another user');
    }

    const op: DocumentOperation = {
      ...operation,
      id: `op-${randomUUID()}`,
      timestamp: new Date(),
      isApplied: false,
    };

    // Check for conflicts
    const pendingOps = this.operations.get(operation.documentId) || [];
    const conflictingOps = pendingOps.filter(
      o => !o.isApplied && o.version === operation.version && o.userId !== operation.userId
    );

    if (conflictingOps.length > 0) {
      // Transform operation
      const transformed = this.transformOperation(op, conflictingOps);
      op.position = transformed.position;
      if (transformed.content !== undefined) {
        op.content = transformed.content;
      }

      // Record conflict
      const conflict: ConflictEvent = {
        id: `conflict-${randomUUID()}`,
        documentId: operation.documentId,
        operations: [op, ...conflictingOps],
        resolution: 'MERGE',
        resolvedOperation: op,
        resolvedAt: new Date(),
      };
      this.conflicts.get(operation.documentId)?.push(conflict);
    }

    // Apply operation to document content
    document.content = this.applyOperationToContent(document.content, op);
    document.version++;
    document.updatedAt = new Date();
    document.lastEditedBy = operation.userId;

    op.version = document.version;
    op.isApplied = true;

    pendingOps.push(op);
    this.operations.set(operation.documentId, pendingOps);

    // Update collaborator activity
    if (collaborator) {
      collaborator.lastActiveAt = new Date();
    }

    // Create version snapshot periodically
    if (document.version % 10 === 0) {
      this.createVersionSnapshot(operation.documentId, operation.userId);
    }

    this.eventEmitter.emit('collaboration.operation.applied', {
      documentId: operation.documentId,
      operationId: op.id,
      userId: operation.userId,
      type: operation.type,
    });

    return op;
  }

  private transformOperation(op: DocumentOperation, against: DocumentOperation[]): DocumentOperation {
    let transformedOp = { ...op };

    for (const otherOp of against) {
      if (otherOp.type === 'INSERT' && otherOp.position <= transformedOp.position) {
        transformedOp.position += otherOp.content?.length || 0;
      } else if (otherOp.type === 'DELETE' && otherOp.position < transformedOp.position) {
        transformedOp.position = Math.max(otherOp.position, transformedOp.position - (otherOp.length || 0));
      }
    }

    return transformedOp;
  }

  private applyOperationToContent(content: string, op: DocumentOperation): string {
    switch (op.type) {
      case 'INSERT':
        return content.slice(0, op.position) + (op.content || '') + content.slice(op.position);

      case 'DELETE':
        return content.slice(0, op.position) + content.slice(op.position + (op.length || 0));

      case 'UPDATE':
        const deleteEnd = op.position + (op.length || 0);
        return content.slice(0, op.position) + (op.content || '') + content.slice(deleteEnd);

      default:
        return content;
    }
  }

  getOperations(documentId: string, fromVersion?: number): DocumentOperation[] {
    const ops = this.operations.get(documentId) || [];

    if (fromVersion !== undefined) {
      return ops.filter(o => o.version > fromVersion);
    }

    return ops;
  }

  // Cursor & Selection
  updateCursor(documentId: string, userId: string, cursor: CursorPosition): void {
    const document = this.getDocument(documentId);
    const collaborator = document.collaborators.find(c => c.userId === userId);

    if (collaborator) {
      collaborator.cursorPosition = cursor;
      collaborator.lastActiveAt = new Date();

      this.eventEmitter.emit('collaboration.cursor.updated', {
        documentId,
        userId,
        cursor,
        color: collaborator.color,
      });
    }
  }

  updateSelection(documentId: string, userId: string, selection: TextSelection | null): void {
    const document = this.getDocument(documentId);
    const collaborator = document.collaborators.find(c => c.userId === userId);

    if (collaborator) {
      collaborator.selection = selection || undefined;
      collaborator.lastActiveAt = new Date();

      this.eventEmitter.emit('collaboration.selection.updated', {
        documentId,
        userId,
        selection,
        color: collaborator.color,
      });
    }
  }

  // Presence
  updatePresence(
    userId: string,
    userName: string,
    status: PresenceStatus,
    documentId?: string,
    color?: string,
    avatar?: string,
  ): PresenceInfo {
    const presence: PresenceInfo = {
      userId,
      userName,
      userAvatar: avatar,
      status,
      currentDocumentId: documentId,
      color: color || this.presence.get(userId)?.color || this.getNextColor(),
      lastActiveAt: new Date(),
    };

    this.presence.set(userId, presence);

    this.eventEmitter.emit('collaboration.presence.updated', {
      userId,
      status,
      documentId,
    });

    return presence;
  }

  getPresence(userId: string): PresenceInfo | undefined {
    return this.presence.get(userId);
  }

  getAllPresence(): PresenceInfo[] {
    return Array.from(this.presence.values());
  }

  getOnlineUsers(): PresenceInfo[] {
    return Array.from(this.presence.values()).filter(p => p.status !== 'OFFLINE');
  }

  // Comments
  addComment(data: {
    documentId: string;
    userId: string;
    userName: string;
    content: string;
    position?: { start: number; end: number };
    parentId?: string;
  }): DocumentComment {
    this.getDocument(data.documentId); // Verify document exists

    const comment: DocumentComment = {
      id: `comment-${randomUUID()}`,
      documentId: data.documentId,
      userId: data.userId,
      userName: data.userName,
      content: data.content,
      position: data.position,
      parentId: data.parentId,
      replies: [],
      isResolved: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const documentComments = this.comments.get(data.documentId) || [];

    if (data.parentId) {
      const parent = this.findComment(documentComments, data.parentId);
      if (parent) {
        parent.replies.push(comment);
      }
    } else {
      documentComments.push(comment);
    }

    this.comments.set(data.documentId, documentComments);

    this.eventEmitter.emit('collaboration.comment.added', {
      documentId: data.documentId,
      commentId: comment.id,
      userId: data.userId,
    });

    return comment;
  }

  private findComment(comments: DocumentComment[], commentId: string): DocumentComment | undefined {
    for (const comment of comments) {
      if (comment.id === commentId) return comment;
      const found = this.findComment(comment.replies, commentId);
      if (found) return found;
    }
    return undefined;
  }

  getComments(documentId: string): DocumentComment[] {
    return this.comments.get(documentId) || [];
  }

  resolveComment(commentId: string, documentId: string, resolvedBy: string): DocumentComment {
    const documentComments = this.comments.get(documentId) || [];
    const comment = this.findComment(documentComments, commentId);

    if (!comment) {
      throw new NotFoundException(`Comment ${commentId} not found`);
    }

    comment.isResolved = true;
    comment.resolvedBy = resolvedBy;
    comment.resolvedAt = new Date();

    this.eventEmitter.emit('collaboration.comment.resolved', {
      documentId,
      commentId,
      resolvedBy,
    });

    return comment;
  }

  deleteComment(commentId: string, documentId: string): void {
    const documentComments = this.comments.get(documentId) || [];

    const removeComment = (comments: DocumentComment[]): boolean => {
      const index = comments.findIndex(c => c.id === commentId);
      if (index !== -1) {
        comments.splice(index, 1);
        return true;
      }
      for (const comment of comments) {
        if (removeComment(comment.replies)) return true;
      }
      return false;
    };

    removeComment(documentComments);
    this.comments.set(documentId, documentComments);

    this.eventEmitter.emit('collaboration.comment.deleted', { documentId, commentId });
  }

  // Locking
  lockDocument(documentId: string, userId: string): CollaborativeDocument {
    const document = this.getDocument(documentId);

    if (document.isLocked && document.lockedBy !== userId) {
      throw new ForbiddenException(`Document is locked by another user`);
    }

    document.isLocked = true;
    document.lockedBy = userId;
    document.lockedAt = new Date();

    this.eventEmitter.emit('collaboration.document.locked', {
      documentId,
      lockedBy: userId,
    });

    return document;
  }

  unlockDocument(documentId: string, userId: string): CollaborativeDocument {
    const document = this.getDocument(documentId);

    if (document.lockedBy && document.lockedBy !== userId && document.ownerId !== userId) {
      throw new ForbiddenException('Only the user who locked the document or owner can unlock');
    }

    document.isLocked = false;
    document.lockedBy = undefined;
    document.lockedAt = undefined;

    this.eventEmitter.emit('collaboration.document.unlocked', {
      documentId,
      unlockedBy: userId,
    });

    return document;
  }

  // Version History
  createVersionSnapshot(documentId: string, userId: string): DocumentVersion {
    const document = this.getDocument(documentId);
    const docHistory = this.history.get(documentId) || [];

    const version: DocumentVersion = {
      version: document.version,
      content: document.content,
      editedBy: userId,
      editedAt: new Date(),
      changesSummary: `Version ${document.version}`,
      operationsApplied: (this.operations.get(documentId) || []).length,
    };

    docHistory.push(version);
    this.history.set(documentId, docHistory);

    return version;
  }

  getVersionHistory(documentId: string): DocumentVersion[] {
    return this.history.get(documentId) || [];
  }

  restoreVersion(documentId: string, version: number, userId: string): CollaborativeDocument {
    const document = this.getDocument(documentId);
    const docHistory = this.history.get(documentId) || [];

    const versionData = docHistory.find(v => v.version === version);
    if (!versionData) {
      throw new NotFoundException(`Version ${version} not found`);
    }

    // Create snapshot of current version before restoring
    this.createVersionSnapshot(documentId, userId);

    document.content = versionData.content;
    document.version++;
    document.updatedAt = new Date();
    document.lastEditedBy = userId;

    this.eventEmitter.emit('collaboration.version.restored', {
      documentId,
      restoredVersion: version,
      restoredBy: userId,
    });

    return document;
  }

  // Sessions
  startSession(documentId: string): CollaborationSession {
    const document = this.getDocument(documentId);

    const session: CollaborationSession = {
      id: `session-${randomUUID()}`,
      documentId,
      participants: document.collaborators.map(c => c.userId),
      startedAt: new Date(),
      operationsCount: 0,
      conflictsResolved: 0,
    };

    this.sessions.set(session.id, session);

    return session;
  }

  endSession(sessionId: string): CollaborationSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    session.endedAt = new Date();
    session.operationsCount = (this.operations.get(session.documentId) || []).length;
    session.conflictsResolved = (this.conflicts.get(session.documentId) || []).length;

    return session;
  }

  getSession(sessionId: string): CollaborationSession | undefined {
    return this.sessions.get(sessionId);
  }

  // Conflicts
  getConflicts(documentId: string): ConflictEvent[] {
    return this.conflicts.get(documentId) || [];
  }

  // Statistics
  getCollaborationStats(documentId: string): {
    totalOperations: number;
    totalComments: number;
    totalVersions: number;
    totalConflicts: number;
    activeCollaborators: number;
    averageSessionDuration: number;
  } {
    const operations = this.operations.get(documentId) || [];
    const comments = this.comments.get(documentId) || [];
    const versions = this.history.get(documentId) || [];
    const conflicts = this.conflicts.get(documentId) || [];
    const document = this.documents.get(documentId);

    const relatedSessions = Array.from(this.sessions.values()).filter(s => s.documentId === documentId && s.endedAt);
    const avgDuration = relatedSessions.length > 0
      ? relatedSessions.reduce((sum, s) => sum + (s.endedAt!.getTime() - s.startedAt.getTime()), 0) / relatedSessions.length
      : 0;

    return {
      totalOperations: operations.length,
      totalComments: this.countComments(comments),
      totalVersions: versions.length,
      totalConflicts: conflicts.length,
      activeCollaborators: document?.collaborators.length || 0,
      averageSessionDuration: avgDuration,
    };
  }

  private countComments(comments: DocumentComment[]): number {
    let count = 0;
    for (const comment of comments) {
      count++;
      count += this.countComments(comment.replies);
    }
    return count;
  }
}
