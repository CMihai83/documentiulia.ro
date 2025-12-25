import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Collaboration Service
 * Team workspaces, document sharing, comments, and activity feeds
 */

// ============================================================================
// TYPES
// ============================================================================

export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer';
export type SharePermission = 'view' | 'comment' | 'edit' | 'manage';
export type CommentStatus = 'active' | 'resolved' | 'deleted';
export type ActivityType =
  | 'workspace_created'
  | 'workspace_updated'
  | 'member_added'
  | 'member_removed'
  | 'document_shared'
  | 'document_unshared'
  | 'comment_added'
  | 'comment_resolved'
  | 'document_uploaded'
  | 'document_updated'
  | 'invoice_created'
  | 'invoice_approved'
  | 'payment_recorded';

// ============================================================================
// INTERFACES
// ============================================================================

export interface Workspace {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  isDefault: boolean;
  members: WorkspaceMember[];
  settings: WorkspaceSettings;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMember {
  userId: string;
  email: string;
  name: string;
  role: WorkspaceRole;
  addedBy: string;
  addedAt: Date;
  lastActiveAt?: Date;
}

export interface WorkspaceSettings {
  allowGuestAccess: boolean;
  requireApprovalForSharing: boolean;
  defaultSharePermission: SharePermission;
  notifyOnActivity: boolean;
  retentionDays: number;
}

export interface SharedDocument {
  id: string;
  workspaceId: string;
  tenantId: string;
  documentId: string;
  documentType: 'invoice' | 'document' | 'report' | 'contract';
  documentName: string;
  sharedBy: string;
  sharedWith: ShareRecipient[];
  permission: SharePermission;
  expiresAt?: Date;
  password?: string;
  accessCount: number;
  lastAccessedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShareRecipient {
  type: 'user' | 'email' | 'workspace' | 'public';
  value: string;
  permission: SharePermission;
  notified: boolean;
  accessedAt?: Date;
}

export interface Comment {
  id: string;
  workspaceId: string;
  tenantId: string;
  documentId: string;
  parentId?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  mentions: string[];
  attachments?: CommentAttachment[];
  reactions: CommentReaction[];
  status: CommentStatus;
  resolvedBy?: string;
  resolvedAt?: Date;
  editedAt?: Date;
  createdAt: Date;
}

export interface CommentAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface CommentReaction {
  userId: string;
  emoji: string;
  createdAt: Date;
}

export interface ActivityFeedItem {
  id: string;
  workspaceId: string;
  tenantId: string;
  type: ActivityType;
  actorId: string;
  actorName: string;
  actorAvatar?: string;
  targetId?: string;
  targetType?: string;
  targetName?: string;
  metadata?: Record<string, any>;
  readBy: string[];
  createdAt: Date;
}

export interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  invitedBy: string;
  token: string;
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name);

  // In-memory storage
  private workspaces: Map<string, Workspace> = new Map();
  private sharedDocuments: Map<string, SharedDocument> = new Map();
  private comments: Map<string, Comment> = new Map();
  private activities: Map<string, ActivityFeedItem> = new Map();
  private invites: Map<string, WorkspaceInvite> = new Map();

  // Counters
  private idCounter = 0;

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.logger.log('Collaboration Service initialized');
  }

  private generateId(prefix: string): string {
    return `${prefix}-${++this.idCounter}-${Date.now()}`;
  }

  // ============================================================================
  // WORKSPACE MANAGEMENT
  // ============================================================================

  async createWorkspace(params: {
    tenantId: string;
    name: string;
    description?: string;
    createdBy: string;
    createdByName: string;
    createdByEmail: string;
    isDefault?: boolean;
    settings?: Partial<WorkspaceSettings>;
  }): Promise<Workspace> {
    const workspace: Workspace = {
      id: this.generateId('ws'),
      tenantId: params.tenantId,
      name: params.name,
      description: params.description,
      isDefault: params.isDefault || false,
      members: [
        {
          userId: params.createdBy,
          email: params.createdByEmail,
          name: params.createdByName,
          role: 'owner',
          addedBy: params.createdBy,
          addedAt: new Date(),
          lastActiveAt: new Date(),
        },
      ],
      settings: {
        allowGuestAccess: false,
        requireApprovalForSharing: false,
        defaultSharePermission: 'view',
        notifyOnActivity: true,
        retentionDays: 365,
        ...params.settings,
      },
      createdBy: params.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.workspaces.set(workspace.id, workspace);

    await this.createActivity({
      workspaceId: workspace.id,
      tenantId: params.tenantId,
      type: 'workspace_created',
      actorId: params.createdBy,
      actorName: params.createdByName,
      targetId: workspace.id,
      targetType: 'workspace',
      targetName: workspace.name,
    });

    this.logger.log(`Created workspace: ${workspace.name} (${workspace.id})`);
    return workspace;
  }

  async getWorkspace(workspaceId: string): Promise<Workspace | null> {
    return this.workspaces.get(workspaceId) || null;
  }

  async getWorkspaces(tenantId: string, userId?: string): Promise<Workspace[]> {
    let workspaces = Array.from(this.workspaces.values()).filter(
      (w) => w.tenantId === tenantId,
    );

    if (userId) {
      workspaces = workspaces.filter((w) =>
        w.members.some((m) => m.userId === userId),
      );
    }

    return workspaces.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateWorkspace(
    workspaceId: string,
    updates: Partial<Pick<Workspace, 'name' | 'description' | 'icon' | 'color' | 'settings'>>,
  ): Promise<Workspace | null> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return null;

    Object.assign(workspace, updates, { updatedAt: new Date() });
    this.workspaces.set(workspaceId, workspace);

    return workspace;
  }

  async deleteWorkspace(workspaceId: string): Promise<boolean> {
    return this.workspaces.delete(workspaceId);
  }

  // ============================================================================
  // WORKSPACE MEMBERS
  // ============================================================================

  async addMember(params: {
    workspaceId: string;
    userId: string;
    email: string;
    name: string;
    role: WorkspaceRole;
    addedBy: string;
    addedByName: string;
  }): Promise<WorkspaceMember | null> {
    const workspace = this.workspaces.get(params.workspaceId);
    if (!workspace) return null;

    const existingMember = workspace.members.find((m) => m.userId === params.userId);
    if (existingMember) return existingMember;

    const member: WorkspaceMember = {
      userId: params.userId,
      email: params.email,
      name: params.name,
      role: params.role,
      addedBy: params.addedBy,
      addedAt: new Date(),
    };

    workspace.members.push(member);
    workspace.updatedAt = new Date();
    this.workspaces.set(params.workspaceId, workspace);

    await this.createActivity({
      workspaceId: params.workspaceId,
      tenantId: workspace.tenantId,
      type: 'member_added',
      actorId: params.addedBy,
      actorName: params.addedByName,
      targetId: params.userId,
      targetType: 'user',
      targetName: params.name,
      metadata: { role: params.role },
    });

    return member;
  }

  async removeMember(
    workspaceId: string,
    userId: string,
    removedBy: string,
    removedByName: string,
  ): Promise<boolean> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return false;

    const memberIndex = workspace.members.findIndex((m) => m.userId === userId);
    if (memberIndex === -1) return false;

    const member = workspace.members[memberIndex];
    workspace.members.splice(memberIndex, 1);
    workspace.updatedAt = new Date();
    this.workspaces.set(workspaceId, workspace);

    await this.createActivity({
      workspaceId,
      tenantId: workspace.tenantId,
      type: 'member_removed',
      actorId: removedBy,
      actorName: removedByName,
      targetId: userId,
      targetType: 'user',
      targetName: member.name,
    });

    return true;
  }

  async updateMemberRole(
    workspaceId: string,
    userId: string,
    newRole: WorkspaceRole,
  ): Promise<WorkspaceMember | null> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return null;

    const member = workspace.members.find((m) => m.userId === userId);
    if (!member) return null;

    member.role = newRole;
    workspace.updatedAt = new Date();
    this.workspaces.set(workspaceId, workspace);

    return member;
  }

  // ============================================================================
  // DOCUMENT SHARING
  // ============================================================================

  async shareDocument(params: {
    workspaceId: string;
    tenantId: string;
    documentId: string;
    documentType: SharedDocument['documentType'];
    documentName: string;
    sharedBy: string;
    sharedByName: string;
    recipients: ShareRecipient[];
    permission: SharePermission;
    expiresAt?: Date;
    password?: string;
  }): Promise<SharedDocument> {
    const sharedDoc: SharedDocument = {
      id: this.generateId('share'),
      workspaceId: params.workspaceId,
      tenantId: params.tenantId,
      documentId: params.documentId,
      documentType: params.documentType,
      documentName: params.documentName,
      sharedBy: params.sharedBy,
      sharedWith: params.recipients,
      permission: params.permission,
      expiresAt: params.expiresAt,
      password: params.password,
      accessCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sharedDocuments.set(sharedDoc.id, sharedDoc);

    await this.createActivity({
      workspaceId: params.workspaceId,
      tenantId: params.tenantId,
      type: 'document_shared',
      actorId: params.sharedBy,
      actorName: params.sharedByName,
      targetId: params.documentId,
      targetType: params.documentType,
      targetName: params.documentName,
      metadata: {
        recipients: params.recipients.length,
        permission: params.permission,
      },
    });

    this.logger.log(`Shared document: ${params.documentName} (${sharedDoc.id})`);
    return sharedDoc;
  }

  async getSharedDocuments(
    workspaceId: string,
    filters?: { documentType?: string; sharedBy?: string },
  ): Promise<SharedDocument[]> {
    let docs = Array.from(this.sharedDocuments.values()).filter(
      (d) => d.workspaceId === workspaceId,
    );

    if (filters?.documentType) {
      docs = docs.filter((d) => d.documentType === filters.documentType);
    }
    if (filters?.sharedBy) {
      docs = docs.filter((d) => d.sharedBy === filters.sharedBy);
    }

    return docs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getSharedDocument(shareId: string): Promise<SharedDocument | null> {
    return this.sharedDocuments.get(shareId) || null;
  }

  async recordAccess(shareId: string, userId?: string): Promise<void> {
    const doc = this.sharedDocuments.get(shareId);
    if (doc) {
      doc.accessCount++;
      doc.lastAccessedAt = new Date();
      if (userId) {
        const recipient = doc.sharedWith.find(
          (r) => r.type === 'user' && r.value === userId,
        );
        if (recipient) {
          recipient.accessedAt = new Date();
        }
      }
      this.sharedDocuments.set(shareId, doc);
    }
  }

  async revokeShare(shareId: string): Promise<boolean> {
    return this.sharedDocuments.delete(shareId);
  }

  // ============================================================================
  // COMMENTS
  // ============================================================================

  async addComment(params: {
    workspaceId: string;
    tenantId: string;
    documentId: string;
    parentId?: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    content: string;
    mentions?: string[];
  }): Promise<Comment> {
    const comment: Comment = {
      id: this.generateId('cmt'),
      workspaceId: params.workspaceId,
      tenantId: params.tenantId,
      documentId: params.documentId,
      parentId: params.parentId,
      authorId: params.authorId,
      authorName: params.authorName,
      authorAvatar: params.authorAvatar,
      content: params.content,
      mentions: params.mentions || [],
      reactions: [],
      status: 'active',
      createdAt: new Date(),
    };

    this.comments.set(comment.id, comment);

    await this.createActivity({
      workspaceId: params.workspaceId,
      tenantId: params.tenantId,
      type: 'comment_added',
      actorId: params.authorId,
      actorName: params.authorName,
      targetId: params.documentId,
      targetType: 'document',
      metadata: {
        commentId: comment.id,
        isReply: !!params.parentId,
        mentions: params.mentions,
      },
    });

    // Emit event for notifications
    this.eventEmitter.emit('comment.created', {
      comment,
      mentions: params.mentions,
    });

    return comment;
  }

  async getComments(
    documentId: string,
    options?: { status?: CommentStatus; parentId?: string | null },
  ): Promise<Comment[]> {
    let comments = Array.from(this.comments.values()).filter(
      (c) => c.documentId === documentId,
    );

    if (options?.status) {
      comments = comments.filter((c) => c.status === options.status);
    }

    if (options?.parentId !== undefined) {
      comments = comments.filter((c) => c.parentId === options.parentId);
    }

    return comments.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async updateComment(commentId: string, content: string): Promise<Comment | null> {
    const comment = this.comments.get(commentId);
    if (!comment) return null;

    comment.content = content;
    comment.editedAt = new Date();
    this.comments.set(commentId, comment);

    return comment;
  }

  async resolveComment(
    commentId: string,
    resolvedBy: string,
    resolvedByName: string,
  ): Promise<Comment | null> {
    const comment = this.comments.get(commentId);
    if (!comment) return null;

    comment.status = 'resolved';
    comment.resolvedBy = resolvedBy;
    comment.resolvedAt = new Date();
    this.comments.set(commentId, comment);

    await this.createActivity({
      workspaceId: comment.workspaceId,
      tenantId: comment.tenantId,
      type: 'comment_resolved',
      actorId: resolvedBy,
      actorName: resolvedByName,
      targetId: commentId,
      targetType: 'comment',
    });

    return comment;
  }

  async deleteComment(commentId: string): Promise<boolean> {
    const comment = this.comments.get(commentId);
    if (!comment) return false;

    comment.status = 'deleted';
    this.comments.set(commentId, comment);

    return true;
  }

  async addReaction(
    commentId: string,
    userId: string,
    emoji: string,
  ): Promise<Comment | null> {
    const comment = this.comments.get(commentId);
    if (!comment) return null;

    const existingReaction = comment.reactions.find(
      (r) => r.userId === userId && r.emoji === emoji,
    );

    if (existingReaction) {
      // Remove reaction if already exists
      comment.reactions = comment.reactions.filter(
        (r) => !(r.userId === userId && r.emoji === emoji),
      );
    } else {
      comment.reactions.push({
        userId,
        emoji,
        createdAt: new Date(),
      });
    }

    this.comments.set(commentId, comment);
    return comment;
  }

  // ============================================================================
  // ACTIVITY FEED
  // ============================================================================

  async createActivity(params: {
    workspaceId: string;
    tenantId: string;
    type: ActivityType;
    actorId: string;
    actorName: string;
    actorAvatar?: string;
    targetId?: string;
    targetType?: string;
    targetName?: string;
    metadata?: Record<string, any>;
  }): Promise<ActivityFeedItem> {
    const activity: ActivityFeedItem = {
      id: this.generateId('act'),
      workspaceId: params.workspaceId,
      tenantId: params.tenantId,
      type: params.type,
      actorId: params.actorId,
      actorName: params.actorName,
      actorAvatar: params.actorAvatar,
      targetId: params.targetId,
      targetType: params.targetType,
      targetName: params.targetName,
      metadata: params.metadata,
      readBy: [params.actorId],
      createdAt: new Date(),
    };

    this.activities.set(activity.id, activity);

    // Emit for real-time updates
    this.eventEmitter.emit('activity.created', activity);

    return activity;
  }

  async getActivityFeed(
    workspaceId: string,
    options?: {
      type?: ActivityType;
      userId?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<ActivityFeedItem[]> {
    let activities = Array.from(this.activities.values())
      .filter((a) => a.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (options?.type) {
      activities = activities.filter((a) => a.type === options.type);
    }

    if (options?.userId) {
      activities = activities.filter((a) => a.actorId === options.userId);
    }

    if (options?.offset) {
      activities = activities.slice(options.offset);
    }

    if (options?.limit) {
      activities = activities.slice(0, options.limit);
    }

    return activities;
  }

  async getUserActivityFeed(
    tenantId: string,
    userId: string,
    limit: number = 50,
  ): Promise<ActivityFeedItem[]> {
    // Get workspaces user belongs to
    const userWorkspaces = await this.getWorkspaces(tenantId, userId);
    const workspaceIds = userWorkspaces.map((w) => w.id);

    return Array.from(this.activities.values())
      .filter((a) => workspaceIds.includes(a.workspaceId))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async markActivityAsRead(activityId: string, userId: string): Promise<void> {
    const activity = this.activities.get(activityId);
    if (activity && !activity.readBy.includes(userId)) {
      activity.readBy.push(userId);
      this.activities.set(activityId, activity);
    }
  }

  async getUnreadCount(workspaceId: string, userId: string): Promise<number> {
    return Array.from(this.activities.values()).filter(
      (a) => a.workspaceId === workspaceId && !a.readBy.includes(userId),
    ).length;
  }

  // ============================================================================
  // WORKSPACE INVITATIONS
  // ============================================================================

  async createInvite(params: {
    workspaceId: string;
    email: string;
    role: WorkspaceRole;
    invitedBy: string;
    expiresInDays?: number;
  }): Promise<WorkspaceInvite> {
    const token = `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (params.expiresInDays || 7));

    const invite: WorkspaceInvite = {
      id: this.generateId('inv'),
      workspaceId: params.workspaceId,
      email: params.email,
      role: params.role,
      invitedBy: params.invitedBy,
      token,
      expiresAt,
      createdAt: new Date(),
    };

    this.invites.set(invite.id, invite);

    // Emit event to send invitation email
    this.eventEmitter.emit('workspace.invite.created', invite);

    return invite;
  }

  async getInviteByToken(token: string): Promise<WorkspaceInvite | null> {
    return (
      Array.from(this.invites.values()).find((i) => i.token === token) || null
    );
  }

  async acceptInvite(
    token: string,
    userId: string,
    userName: string,
    userEmail: string,
  ): Promise<Workspace | null> {
    const invite = await this.getInviteByToken(token);
    if (!invite) return null;

    if (invite.acceptedAt) {
      throw new ForbiddenException('Invite already accepted');
    }

    if (new Date() > invite.expiresAt) {
      throw new ForbiddenException('Invite has expired');
    }

    const workspace = this.workspaces.get(invite.workspaceId);
    if (!workspace) return null;

    await this.addMember({
      workspaceId: invite.workspaceId,
      userId,
      email: userEmail,
      name: userName,
      role: invite.role,
      addedBy: invite.invitedBy,
      addedByName: 'System',
    });

    invite.acceptedAt = new Date();
    this.invites.set(invite.id, invite);

    return workspace;
  }

  async getPendingInvites(workspaceId: string): Promise<WorkspaceInvite[]> {
    return Array.from(this.invites.values())
      .filter((i) => i.workspaceId === workspaceId && !i.acceptedAt)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async revokeInvite(inviteId: string): Promise<boolean> {
    return this.invites.delete(inviteId);
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  async getWorkspaceStats(workspaceId: string): Promise<{
    memberCount: number;
    sharedDocuments: number;
    commentsCount: number;
    activitiesCount: number;
    recentActivity: ActivityFeedItem[];
  }> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const sharedDocs = Array.from(this.sharedDocuments.values()).filter(
      (d) => d.workspaceId === workspaceId,
    );

    const comments = Array.from(this.comments.values()).filter(
      (c) => c.workspaceId === workspaceId && c.status === 'active',
    );

    const activities = Array.from(this.activities.values())
      .filter((a) => a.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return {
      memberCount: workspace.members.length,
      sharedDocuments: sharedDocs.length,
      commentsCount: comments.length,
      activitiesCount: activities.length,
      recentActivity: activities.slice(0, 10),
    };
  }
}
