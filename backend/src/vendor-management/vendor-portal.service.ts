import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// =================== TYPES ===================

export type PortalUserStatus = 'pending' | 'active' | 'suspended' | 'deactivated';
export type PortalUserRole = 'admin' | 'manager' | 'viewer' | 'contributor';
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';
export type MessageStatus = 'unread' | 'read' | 'archived';
export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationType = 'info' | 'warning' | 'alert' | 'success' | 'action_required';
export type RequestType =
  | 'profile_update'
  | 'document_submission'
  | 'compliance_update'
  | 'contract_review'
  | 'payment_inquiry'
  | 'support'
  | 'other';
export type RequestStatus = 'open' | 'in_progress' | 'pending_vendor' | 'resolved' | 'closed';

// =================== INTERFACES ===================

export interface PortalUser {
  id: string;
  vendorId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: PortalUserRole;
  status: PortalUserStatus;
  phone?: string;
  jobTitle?: string;
  department?: string;
  permissions: PortalPermission[];
  lastLoginAt?: Date;
  loginCount: number;
  passwordChangedAt?: Date;
  mfaEnabled: boolean;
  mfaMethod?: 'email' | 'sms' | 'authenticator';
  createdAt: Date;
  updatedAt: Date;
}

export interface PortalPermission {
  resource: string;
  actions: ('view' | 'create' | 'edit' | 'delete' | 'submit')[];
}

export interface PortalInvitation {
  id: string;
  vendorId: string;
  email: string;
  role: PortalUserRole;
  permissions: PortalPermission[];
  status: InvitationStatus;
  invitedBy: string;
  invitedByName: string;
  message?: string;
  token: string;
  expiresAt: Date;
  acceptedAt?: Date;
  acceptedUserId?: string;
  createdAt: Date;
}

export interface PortalMessage {
  id: string;
  vendorId: string;
  tenantId: string;
  subject: string;
  body: string;
  priority: MessagePriority;
  status: MessageStatus;
  fromVendor: boolean;
  senderId: string;
  senderName: string;
  recipientId?: string;
  recipientName?: string;
  parentMessageId?: string;
  threadId: string;
  attachments: MessageAttachment[];
  readAt?: Date;
  readBy?: string;
  createdAt: Date;
}

export interface MessageAttachment {
  id: string;
  name: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

export interface PortalNotification {
  id: string;
  vendorId: string;
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  relatedEntity?: {
    type: string;
    id: string;
  };
  read: boolean;
  readAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

export interface VendorRequest {
  id: string;
  vendorId: string;
  tenantId: string;
  type: RequestType;
  subject: string;
  description: string;
  status: RequestStatus;
  priority: MessagePriority;
  requestedBy: string;
  requestedByName: string;
  assignedTo?: string;
  assignedToName?: string;
  attachments: MessageAttachment[];
  comments: RequestComment[];
  resolution?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RequestComment {
  id: string;
  content: string;
  fromVendor: boolean;
  authorId: string;
  authorName: string;
  attachments: MessageAttachment[];
  createdAt: Date;
}

export interface PortalSettings {
  id: string;
  vendorId: string;
  allowedFeatures: PortalFeature[];
  customBranding?: {
    logoUrl?: string;
    primaryColor?: string;
    accentColor?: string;
  };
  notificationPreferences: NotificationPreference[];
  dataVisibility: DataVisibilitySettings;
  updatedAt: Date;
}

export type PortalFeature =
  | 'profile_management'
  | 'document_upload'
  | 'compliance_tracking'
  | 'contract_view'
  | 'invoice_submission'
  | 'payment_tracking'
  | 'performance_view'
  | 'messaging'
  | 'support_requests';

export interface NotificationPreference {
  type: string;
  email: boolean;
  portal: boolean;
  sms: boolean;
}

export interface DataVisibilitySettings {
  showPaymentHistory: boolean;
  showPerformanceScores: boolean;
  showContractDetails: boolean;
  showComplianceStatus: boolean;
}

export interface VendorDashboard {
  vendorId: string;
  overview: {
    activeContracts: number;
    pendingDocuments: number;
    upcomingDeadlines: number;
    unreadMessages: number;
    openRequests: number;
    performanceScore?: number;
  };
  recentActivity: DashboardActivity[];
  upcomingDeadlines: DashboardDeadline[];
  pendingActions: PendingAction[];
  quickStats: {
    totalContractValue: number;
    ytdPayments: number;
    pendingPayments: number;
    complianceScore: number;
  };
}

export interface DashboardActivity {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
  relatedEntity?: {
    type: string;
    id: string;
    name: string;
  };
}

export interface DashboardDeadline {
  id: string;
  type: string;
  description: string;
  dueDate: Date;
  priority: MessagePriority;
  actionRequired: boolean;
}

export interface PendingAction {
  id: string;
  type: string;
  title: string;
  description: string;
  dueDate?: Date;
  actionUrl: string;
  priority: MessagePriority;
}

export interface DocumentSubmission {
  id: string;
  vendorId: string;
  tenantId: string;
  documentType: string;
  name: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: 'pending_review' | 'approved' | 'rejected';
  submittedBy: string;
  submittedByName: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
  expiresAt?: Date;
  relatedEntity?: {
    type: string;
    id: string;
  };
  createdAt: Date;
}

export interface ProfileUpdateRequest {
  id: string;
  vendorId: string;
  tenantId: string;
  changes: ProfileChange[];
  status: 'pending' | 'approved' | 'rejected' | 'partially_approved';
  requestedBy: string;
  requestedByName: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: Date;
  comments?: string;
  createdAt: Date;
}

export interface ProfileChange {
  field: string;
  oldValue: any;
  newValue: any;
  approved?: boolean;
  rejectionReason?: string;
}

@Injectable()
export class VendorPortalService {
  private portalUsers: Map<string, PortalUser> = new Map();
  private invitations: Map<string, PortalInvitation> = new Map();
  private messages: Map<string, PortalMessage> = new Map();
  private notifications: Map<string, PortalNotification> = new Map();
  private requests: Map<string, VendorRequest> = new Map();
  private portalSettings: Map<string, PortalSettings> = new Map();
  private documentSubmissions: Map<string, DocumentSubmission> = new Map();
  private profileUpdates: Map<string, ProfileUpdateRequest> = new Map();

  constructor(private eventEmitter: EventEmitter2) {}

  // =================== PORTAL USERS ===================

  async createPortalUser(data: {
    vendorId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: PortalUserRole;
    phone?: string;
    jobTitle?: string;
    department?: string;
    permissions?: PortalPermission[];
    createdBy: string;
  }): Promise<PortalUser> {
    // Check if user already exists
    const existing = Array.from(this.portalUsers.values()).find(
      u => u.vendorId === data.vendorId && u.email === data.email
    );
    if (existing) {
      throw new Error('User with this email already exists for this vendor');
    }

    const user: PortalUser = {
      id: `puser_${Date.now()}`,
      vendorId: data.vendorId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      status: 'pending',
      phone: data.phone,
      jobTitle: data.jobTitle,
      department: data.department,
      permissions: data.permissions || this.getDefaultPermissions(data.role),
      loginCount: 0,
      mfaEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.portalUsers.set(user.id, user);
    this.eventEmitter.emit('vendor_portal.user_created', { user, createdBy: data.createdBy });

    return user;
  }

  private getDefaultPermissions(role: PortalUserRole): PortalPermission[] {
    switch (role) {
      case 'admin':
        return [
          { resource: 'profile', actions: ['view', 'edit'] },
          { resource: 'documents', actions: ['view', 'create', 'edit', 'delete', 'submit'] },
          { resource: 'contracts', actions: ['view'] },
          { resource: 'invoices', actions: ['view', 'create', 'submit'] },
          { resource: 'payments', actions: ['view'] },
          { resource: 'compliance', actions: ['view', 'edit', 'submit'] },
          { resource: 'messages', actions: ['view', 'create'] },
          { resource: 'requests', actions: ['view', 'create'] },
          { resource: 'users', actions: ['view', 'create', 'edit'] },
        ];
      case 'manager':
        return [
          { resource: 'profile', actions: ['view', 'edit'] },
          { resource: 'documents', actions: ['view', 'create', 'submit'] },
          { resource: 'contracts', actions: ['view'] },
          { resource: 'invoices', actions: ['view', 'create', 'submit'] },
          { resource: 'payments', actions: ['view'] },
          { resource: 'compliance', actions: ['view', 'submit'] },
          { resource: 'messages', actions: ['view', 'create'] },
          { resource: 'requests', actions: ['view', 'create'] },
        ];
      case 'contributor':
        return [
          { resource: 'profile', actions: ['view'] },
          { resource: 'documents', actions: ['view', 'create'] },
          { resource: 'contracts', actions: ['view'] },
          { resource: 'invoices', actions: ['view', 'create'] },
          { resource: 'messages', actions: ['view', 'create'] },
          { resource: 'requests', actions: ['view', 'create'] },
        ];
      case 'viewer':
      default:
        return [
          { resource: 'profile', actions: ['view'] },
          { resource: 'documents', actions: ['view'] },
          { resource: 'contracts', actions: ['view'] },
          { resource: 'payments', actions: ['view'] },
        ];
    }
  }

  async getPortalUser(id: string): Promise<PortalUser | null> {
    return this.portalUsers.get(id) || null;
  }

  async getVendorPortalUsers(vendorId: string): Promise<PortalUser[]> {
    return Array.from(this.portalUsers.values())
      .filter(u => u.vendorId === vendorId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updatePortalUser(
    id: string,
    updates: Partial<Pick<PortalUser, 'firstName' | 'lastName' | 'role' | 'phone' | 'jobTitle' | 'department' | 'permissions' | 'mfaEnabled' | 'mfaMethod'>>
  ): Promise<PortalUser | null> {
    const user = this.portalUsers.get(id);
    if (!user) return null;

    Object.assign(user, updates, { updatedAt: new Date() });
    this.portalUsers.set(id, user);

    return user;
  }

  async activatePortalUser(id: string): Promise<PortalUser | null> {
    const user = this.portalUsers.get(id);
    if (!user || user.status !== 'pending') return null;

    user.status = 'active';
    user.updatedAt = new Date();
    this.portalUsers.set(id, user);

    this.eventEmitter.emit('vendor_portal.user_activated', { user });
    return user;
  }

  async suspendPortalUser(id: string, reason: string): Promise<PortalUser | null> {
    const user = this.portalUsers.get(id);
    if (!user || user.status !== 'active') return null;

    user.status = 'suspended';
    user.updatedAt = new Date();
    this.portalUsers.set(id, user);

    this.eventEmitter.emit('vendor_portal.user_suspended', { user, reason });
    return user;
  }

  async recordLogin(id: string): Promise<PortalUser | null> {
    const user = this.portalUsers.get(id);
    if (!user) return null;

    user.lastLoginAt = new Date();
    user.loginCount++;
    this.portalUsers.set(id, user);

    return user;
  }

  // =================== INVITATIONS ===================

  async createInvitation(data: {
    vendorId: string;
    email: string;
    role: PortalUserRole;
    permissions?: PortalPermission[];
    invitedBy: string;
    invitedByName: string;
    message?: string;
    expiresInDays?: number;
  }): Promise<PortalInvitation> {
    const token = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (data.expiresInDays || 7));

    const invitation: PortalInvitation = {
      id: `pinv_${Date.now()}`,
      vendorId: data.vendorId,
      email: data.email,
      role: data.role,
      permissions: data.permissions || this.getDefaultPermissions(data.role),
      status: 'pending',
      invitedBy: data.invitedBy,
      invitedByName: data.invitedByName,
      message: data.message,
      token,
      expiresAt,
      createdAt: new Date(),
    };

    this.invitations.set(invitation.id, invitation);
    this.eventEmitter.emit('vendor_portal.invitation_sent', { invitation });

    return invitation;
  }

  async getInvitation(id: string): Promise<PortalInvitation | null> {
    return this.invitations.get(id) || null;
  }

  async getInvitationByToken(token: string): Promise<PortalInvitation | null> {
    return Array.from(this.invitations.values()).find(i => i.token === token) || null;
  }

  async getVendorInvitations(vendorId: string): Promise<PortalInvitation[]> {
    return Array.from(this.invitations.values())
      .filter(i => i.vendorId === vendorId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async acceptInvitation(token: string, userId: string): Promise<PortalInvitation | null> {
    const invitation = await this.getInvitationByToken(token);
    if (!invitation || invitation.status !== 'pending') return null;

    if (new Date() > invitation.expiresAt) {
      invitation.status = 'expired';
      this.invitations.set(invitation.id, invitation);
      return null;
    }

    invitation.status = 'accepted';
    invitation.acceptedAt = new Date();
    invitation.acceptedUserId = userId;
    this.invitations.set(invitation.id, invitation);

    this.eventEmitter.emit('vendor_portal.invitation_accepted', { invitation });
    return invitation;
  }

  async revokeInvitation(id: string): Promise<PortalInvitation | null> {
    const invitation = this.invitations.get(id);
    if (!invitation || invitation.status !== 'pending') return null;

    invitation.status = 'revoked';
    this.invitations.set(id, invitation);

    return invitation;
  }

  // =================== MESSAGING ===================

  async sendMessage(data: {
    vendorId: string;
    tenantId: string;
    subject: string;
    body: string;
    priority?: MessagePriority;
    fromVendor: boolean;
    senderId: string;
    senderName: string;
    recipientId?: string;
    recipientName?: string;
    parentMessageId?: string;
    attachments?: Omit<MessageAttachment, 'id'>[];
  }): Promise<PortalMessage> {
    let threadId = data.parentMessageId
      ? this.messages.get(data.parentMessageId)?.threadId || `thread_${Date.now()}`
      : `thread_${Date.now()}`;

    const message: PortalMessage = {
      id: `pmsg_${Date.now()}`,
      vendorId: data.vendorId,
      tenantId: data.tenantId,
      subject: data.subject,
      body: data.body,
      priority: data.priority || 'normal',
      status: 'unread',
      fromVendor: data.fromVendor,
      senderId: data.senderId,
      senderName: data.senderName,
      recipientId: data.recipientId,
      recipientName: data.recipientName,
      parentMessageId: data.parentMessageId,
      threadId,
      attachments: (data.attachments || []).map(a => ({
        ...a,
        id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      })),
      createdAt: new Date(),
    };

    this.messages.set(message.id, message);
    this.eventEmitter.emit('vendor_portal.message_sent', { message });

    // Create notification for recipient
    await this.createNotification({
      vendorId: data.vendorId,
      type: data.priority === 'urgent' ? 'alert' : 'info',
      title: 'New Message',
      message: `${data.senderName}: ${data.subject}`,
      relatedEntity: { type: 'message', id: message.id },
    });

    return message;
  }

  async getMessage(id: string): Promise<PortalMessage | null> {
    return this.messages.get(id) || null;
  }

  async getVendorMessages(
    vendorId: string,
    options?: {
      status?: MessageStatus;
      fromVendor?: boolean;
      limit?: number;
    }
  ): Promise<PortalMessage[]> {
    let messages = Array.from(this.messages.values())
      .filter(m => m.vendorId === vendorId);

    if (options?.status) {
      messages = messages.filter(m => m.status === options.status);
    }
    if (options?.fromVendor !== undefined) {
      messages = messages.filter(m => m.fromVendor === options.fromVendor);
    }

    messages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (options?.limit) {
      messages = messages.slice(0, options.limit);
    }

    return messages;
  }

  async getMessageThread(threadId: string): Promise<PortalMessage[]> {
    return Array.from(this.messages.values())
      .filter(m => m.threadId === threadId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async markMessageAsRead(id: string, readBy: string): Promise<PortalMessage | null> {
    const message = this.messages.get(id);
    if (!message) return null;

    message.status = 'read';
    message.readAt = new Date();
    message.readBy = readBy;
    this.messages.set(id, message);

    return message;
  }

  async archiveMessage(id: string): Promise<PortalMessage | null> {
    const message = this.messages.get(id);
    if (!message) return null;

    message.status = 'archived';
    this.messages.set(id, message);

    return message;
  }

  // =================== NOTIFICATIONS ===================

  async createNotification(data: {
    vendorId: string;
    userId?: string;
    type: NotificationType;
    title: string;
    message: string;
    actionUrl?: string;
    actionLabel?: string;
    relatedEntity?: { type: string; id: string };
    expiresInDays?: number;
  }): Promise<PortalNotification> {
    const notification: PortalNotification = {
      id: `pnot_${Date.now()}`,
      vendorId: data.vendorId,
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      actionUrl: data.actionUrl,
      actionLabel: data.actionLabel,
      relatedEntity: data.relatedEntity,
      read: false,
      expiresAt: data.expiresInDays
        ? new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000)
        : undefined,
      createdAt: new Date(),
    };

    this.notifications.set(notification.id, notification);

    return notification;
  }

  async getVendorNotifications(
    vendorId: string,
    options?: {
      userId?: string;
      unreadOnly?: boolean;
      type?: NotificationType;
      limit?: number;
    }
  ): Promise<PortalNotification[]> {
    let notifications = Array.from(this.notifications.values())
      .filter(n => n.vendorId === vendorId)
      .filter(n => !n.expiresAt || n.expiresAt > new Date());

    if (options?.userId) {
      notifications = notifications.filter(n => !n.userId || n.userId === options.userId);
    }
    if (options?.unreadOnly) {
      notifications = notifications.filter(n => !n.read);
    }
    if (options?.type) {
      notifications = notifications.filter(n => n.type === options.type);
    }

    notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (options?.limit) {
      notifications = notifications.slice(0, options.limit);
    }

    return notifications;
  }

  async markNotificationAsRead(id: string): Promise<PortalNotification | null> {
    const notification = this.notifications.get(id);
    if (!notification) return null;

    notification.read = true;
    notification.readAt = new Date();
    this.notifications.set(id, notification);

    return notification;
  }

  async markAllNotificationsAsRead(vendorId: string, userId?: string): Promise<number> {
    let count = 0;
    for (const notification of this.notifications.values()) {
      if (
        notification.vendorId === vendorId &&
        !notification.read &&
        (!userId || !notification.userId || notification.userId === userId)
      ) {
        notification.read = true;
        notification.readAt = new Date();
        this.notifications.set(notification.id, notification);
        count++;
      }
    }
    return count;
  }

  // =================== SUPPORT REQUESTS ===================

  async createRequest(data: {
    vendorId: string;
    tenantId: string;
    type: RequestType;
    subject: string;
    description: string;
    priority?: MessagePriority;
    requestedBy: string;
    requestedByName: string;
    attachments?: Omit<MessageAttachment, 'id'>[];
  }): Promise<VendorRequest> {
    const request: VendorRequest = {
      id: `vreq_${Date.now()}`,
      vendorId: data.vendorId,
      tenantId: data.tenantId,
      type: data.type,
      subject: data.subject,
      description: data.description,
      status: 'open',
      priority: data.priority || 'normal',
      requestedBy: data.requestedBy,
      requestedByName: data.requestedByName,
      attachments: (data.attachments || []).map(a => ({
        ...a,
        id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      })),
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.requests.set(request.id, request);
    this.eventEmitter.emit('vendor_portal.request_created', { request });

    return request;
  }

  async getRequest(id: string): Promise<VendorRequest | null> {
    return this.requests.get(id) || null;
  }

  async getVendorRequests(
    vendorId: string,
    options?: {
      type?: RequestType;
      status?: RequestStatus;
      limit?: number;
    }
  ): Promise<VendorRequest[]> {
    let requests = Array.from(this.requests.values())
      .filter(r => r.vendorId === vendorId);

    if (options?.type) {
      requests = requests.filter(r => r.type === options.type);
    }
    if (options?.status) {
      requests = requests.filter(r => r.status === options.status);
    }

    requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (options?.limit) {
      requests = requests.slice(0, options.limit);
    }

    return requests;
  }

  async getTenantRequests(
    tenantId: string,
    options?: {
      vendorId?: string;
      type?: RequestType;
      status?: RequestStatus;
      assignedTo?: string;
      limit?: number;
    }
  ): Promise<VendorRequest[]> {
    let requests = Array.from(this.requests.values())
      .filter(r => r.tenantId === tenantId);

    if (options?.vendorId) {
      requests = requests.filter(r => r.vendorId === options.vendorId);
    }
    if (options?.type) {
      requests = requests.filter(r => r.type === options.type);
    }
    if (options?.status) {
      requests = requests.filter(r => r.status === options.status);
    }
    if (options?.assignedTo) {
      requests = requests.filter(r => r.assignedTo === options.assignedTo);
    }

    requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (options?.limit) {
      requests = requests.slice(0, options.limit);
    }

    return requests;
  }

  async assignRequest(
    id: string,
    assignedTo: string,
    assignedToName: string
  ): Promise<VendorRequest | null> {
    const request = this.requests.get(id);
    if (!request) return null;

    request.assignedTo = assignedTo;
    request.assignedToName = assignedToName;
    request.status = 'in_progress';
    request.updatedAt = new Date();
    this.requests.set(id, request);

    this.eventEmitter.emit('vendor_portal.request_assigned', { request });
    return request;
  }

  async addRequestComment(
    id: string,
    comment: {
      content: string;
      fromVendor: boolean;
      authorId: string;
      authorName: string;
      attachments?: Omit<MessageAttachment, 'id'>[];
    }
  ): Promise<VendorRequest | null> {
    const request = this.requests.get(id);
    if (!request) return null;

    const newComment: RequestComment = {
      id: `rcmt_${Date.now()}`,
      content: comment.content,
      fromVendor: comment.fromVendor,
      authorId: comment.authorId,
      authorName: comment.authorName,
      attachments: (comment.attachments || []).map(a => ({
        ...a,
        id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      })),
      createdAt: new Date(),
    };

    request.comments.push(newComment);
    request.status = comment.fromVendor ? 'pending_vendor' : 'in_progress';
    request.updatedAt = new Date();
    this.requests.set(id, request);

    return request;
  }

  async resolveRequest(
    id: string,
    resolution: string,
    resolvedBy: string
  ): Promise<VendorRequest | null> {
    const request = this.requests.get(id);
    if (!request) return null;

    request.status = 'resolved';
    request.resolution = resolution;
    request.resolvedAt = new Date();
    request.resolvedBy = resolvedBy;
    request.updatedAt = new Date();
    this.requests.set(id, request);

    this.eventEmitter.emit('vendor_portal.request_resolved', { request });
    return request;
  }

  async closeRequest(id: string): Promise<VendorRequest | null> {
    const request = this.requests.get(id);
    if (!request || request.status !== 'resolved') return null;

    request.status = 'closed';
    request.updatedAt = new Date();
    this.requests.set(id, request);

    return request;
  }

  // =================== DOCUMENT SUBMISSIONS ===================

  async submitDocument(data: {
    vendorId: string;
    tenantId: string;
    documentType: string;
    name: string;
    description?: string;
    fileUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    submittedBy: string;
    submittedByName: string;
    expiresAt?: Date;
    relatedEntity?: { type: string; id: string };
  }): Promise<DocumentSubmission> {
    const submission: DocumentSubmission = {
      id: `dsub_${Date.now()}`,
      vendorId: data.vendorId,
      tenantId: data.tenantId,
      documentType: data.documentType,
      name: data.name,
      description: data.description,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      status: 'pending_review',
      submittedBy: data.submittedBy,
      submittedByName: data.submittedByName,
      expiresAt: data.expiresAt,
      relatedEntity: data.relatedEntity,
      createdAt: new Date(),
    };

    this.documentSubmissions.set(submission.id, submission);
    this.eventEmitter.emit('vendor_portal.document_submitted', { submission });

    return submission;
  }

  async getDocumentSubmission(id: string): Promise<DocumentSubmission | null> {
    return this.documentSubmissions.get(id) || null;
  }

  async getVendorDocumentSubmissions(
    vendorId: string,
    options?: {
      status?: DocumentSubmission['status'];
      documentType?: string;
      limit?: number;
    }
  ): Promise<DocumentSubmission[]> {
    let submissions = Array.from(this.documentSubmissions.values())
      .filter(s => s.vendorId === vendorId);

    if (options?.status) {
      submissions = submissions.filter(s => s.status === options.status);
    }
    if (options?.documentType) {
      submissions = submissions.filter(s => s.documentType === options.documentType);
    }

    submissions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (options?.limit) {
      submissions = submissions.slice(0, options.limit);
    }

    return submissions;
  }

  async reviewDocumentSubmission(
    id: string,
    decision: {
      approved: boolean;
      reviewedBy: string;
      reviewedByName: string;
      rejectionReason?: string;
    }
  ): Promise<DocumentSubmission | null> {
    const submission = this.documentSubmissions.get(id);
    if (!submission || submission.status !== 'pending_review') return null;

    submission.status = decision.approved ? 'approved' : 'rejected';
    submission.reviewedBy = decision.reviewedBy;
    submission.reviewedByName = decision.reviewedByName;
    submission.reviewedAt = new Date();
    if (!decision.approved) {
      submission.rejectionReason = decision.rejectionReason;
    }
    this.documentSubmissions.set(id, submission);

    this.eventEmitter.emit('vendor_portal.document_reviewed', { submission, decision });

    // Notify vendor
    await this.createNotification({
      vendorId: submission.vendorId,
      type: decision.approved ? 'success' : 'warning',
      title: `Document ${decision.approved ? 'Approved' : 'Rejected'}`,
      message: decision.approved
        ? `Your document "${submission.name}" has been approved.`
        : `Your document "${submission.name}" was rejected: ${decision.rejectionReason}`,
      relatedEntity: { type: 'document_submission', id: submission.id },
    });

    return submission;
  }

  // =================== PROFILE UPDATE REQUESTS ===================

  async requestProfileUpdate(data: {
    vendorId: string;
    tenantId: string;
    changes: ProfileChange[];
    requestedBy: string;
    requestedByName: string;
  }): Promise<ProfileUpdateRequest> {
    const request: ProfileUpdateRequest = {
      id: `prup_${Date.now()}`,
      vendorId: data.vendorId,
      tenantId: data.tenantId,
      changes: data.changes,
      status: 'pending',
      requestedBy: data.requestedBy,
      requestedByName: data.requestedByName,
      createdAt: new Date(),
    };

    this.profileUpdates.set(request.id, request);
    this.eventEmitter.emit('vendor_portal.profile_update_requested', { request });

    return request;
  }

  async getProfileUpdateRequest(id: string): Promise<ProfileUpdateRequest | null> {
    return this.profileUpdates.get(id) || null;
  }

  async getVendorProfileUpdateRequests(vendorId: string): Promise<ProfileUpdateRequest[]> {
    return Array.from(this.profileUpdates.values())
      .filter(r => r.vendorId === vendorId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async reviewProfileUpdate(
    id: string,
    decision: {
      approvedChanges: string[];
      rejectedChanges: { field: string; reason: string }[];
      reviewedBy: string;
      reviewedByName: string;
      comments?: string;
    }
  ): Promise<ProfileUpdateRequest | null> {
    const request = this.profileUpdates.get(id);
    if (!request || request.status !== 'pending') return null;

    // Update change statuses
    for (const change of request.changes) {
      if (decision.approvedChanges.includes(change.field)) {
        change.approved = true;
      } else {
        const rejection = decision.rejectedChanges.find(r => r.field === change.field);
        if (rejection) {
          change.approved = false;
          change.rejectionReason = rejection.reason;
        }
      }
    }

    const allApproved = request.changes.every(c => c.approved);
    const allRejected = request.changes.every(c => c.approved === false);

    request.status = allApproved ? 'approved' : allRejected ? 'rejected' : 'partially_approved';
    request.reviewedBy = decision.reviewedBy;
    request.reviewedByName = decision.reviewedByName;
    request.reviewedAt = new Date();
    request.comments = decision.comments;
    this.profileUpdates.set(id, request);

    this.eventEmitter.emit('vendor_portal.profile_update_reviewed', { request, decision });

    return request;
  }

  // =================== PORTAL SETTINGS ===================

  async getPortalSettings(vendorId: string): Promise<PortalSettings | null> {
    return this.portalSettings.get(vendorId) || null;
  }

  async updatePortalSettings(
    vendorId: string,
    updates: Partial<Omit<PortalSettings, 'id' | 'vendorId' | 'updatedAt'>>
  ): Promise<PortalSettings> {
    let settings = this.portalSettings.get(vendorId);

    if (!settings) {
      settings = {
        id: `pset_${vendorId}`,
        vendorId,
        allowedFeatures: [
          'profile_management',
          'document_upload',
          'compliance_tracking',
          'contract_view',
          'messaging',
          'support_requests',
        ],
        notificationPreferences: [
          { type: 'message', email: true, portal: true, sms: false },
          { type: 'document_status', email: true, portal: true, sms: false },
          { type: 'contract_update', email: true, portal: true, sms: false },
          { type: 'compliance_reminder', email: true, portal: true, sms: true },
        ],
        dataVisibility: {
          showPaymentHistory: true,
          showPerformanceScores: false,
          showContractDetails: true,
          showComplianceStatus: true,
        },
        updatedAt: new Date(),
      };
    }

    Object.assign(settings, updates, { updatedAt: new Date() });
    this.portalSettings.set(vendorId, settings);

    return settings;
  }

  // =================== DASHBOARD ===================

  async getVendorDashboard(vendorId: string): Promise<VendorDashboard> {
    const messages = await this.getVendorMessages(vendorId, { status: 'unread' });
    const requests = await this.getVendorRequests(vendorId);
    const notifications = await this.getVendorNotifications(vendorId, { unreadOnly: true });
    const submissions = await this.getVendorDocumentSubmissions(vendorId, { status: 'pending_review' });

    const openRequests = requests.filter(r => !['resolved', 'closed'].includes(r.status));

    // Build recent activity
    const recentActivity: DashboardActivity[] = [
      ...messages.slice(0, 5).map(m => ({
        id: m.id,
        type: 'message',
        description: `New message: ${m.subject}`,
        timestamp: m.createdAt,
        relatedEntity: { type: 'message', id: m.id, name: m.subject },
      })),
      ...requests.slice(0, 5).map(r => ({
        id: r.id,
        type: 'request',
        description: `Request ${r.status}: ${r.subject}`,
        timestamp: r.updatedAt,
        relatedEntity: { type: 'request', id: r.id, name: r.subject },
      })),
    ]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    // Build pending actions
    const pendingActions: PendingAction[] = [];

    if (submissions.length > 0) {
      pendingActions.push({
        id: 'pending_docs',
        type: 'document_review',
        title: 'Documents Pending Review',
        description: `${submissions.length} document(s) awaiting review`,
        actionUrl: '/vendor/documents',
        priority: 'normal',
      });
    }

    for (const request of openRequests.filter(r => r.status === 'pending_vendor')) {
      pendingActions.push({
        id: request.id,
        type: 'request_response',
        title: 'Response Needed',
        description: request.subject,
        actionUrl: `/vendor/requests/${request.id}`,
        priority: request.priority,
      });
    }

    return {
      vendorId,
      overview: {
        activeContracts: 0, // Would be populated from contracts service
        pendingDocuments: submissions.length,
        upcomingDeadlines: 0, // Would be calculated
        unreadMessages: messages.length,
        openRequests: openRequests.length,
      },
      recentActivity,
      upcomingDeadlines: [], // Would be populated from various sources
      pendingActions,
      quickStats: {
        totalContractValue: 0,
        ytdPayments: 0,
        pendingPayments: 0,
        complianceScore: 0,
      },
    };
  }

  // =================== STATISTICS ===================

  async getPortalStatistics(tenantId: string): Promise<{
    totalVendorUsers: number;
    activeUsers: number;
    pendingInvitations: number;
    totalMessages: number;
    unreadMessages: number;
    totalRequests: number;
    openRequests: number;
    averageResponseTime: number;
    documentSubmissions: {
      total: number;
      pending: number;
      approved: number;
      rejected: number;
    };
    profileUpdates: {
      total: number;
      pending: number;
    };
  }> {
    const requests = Array.from(this.requests.values())
      .filter(r => r.tenantId === tenantId);
    const messages = Array.from(this.messages.values())
      .filter(m => m.tenantId === tenantId);
    const submissions = Array.from(this.documentSubmissions.values())
      .filter(s => s.tenantId === tenantId);
    const updates = Array.from(this.profileUpdates.values())
      .filter(u => u.tenantId === tenantId);

    // Calculate average response time
    const resolvedRequests = requests.filter(r => r.resolvedAt);
    const avgResponseTime = resolvedRequests.length > 0
      ? resolvedRequests.reduce((sum, r) => {
          return sum + (r.resolvedAt!.getTime() - r.createdAt.getTime());
        }, 0) / resolvedRequests.length / (1000 * 60 * 60) // Convert to hours
      : 0;

    return {
      totalVendorUsers: this.portalUsers.size,
      activeUsers: Array.from(this.portalUsers.values()).filter(u => u.status === 'active').length,
      pendingInvitations: Array.from(this.invitations.values())
        .filter(i => i.status === 'pending').length,
      totalMessages: messages.length,
      unreadMessages: messages.filter(m => m.status === 'unread').length,
      totalRequests: requests.length,
      openRequests: requests.filter(r => !['resolved', 'closed'].includes(r.status)).length,
      averageResponseTime: Math.round(avgResponseTime * 10) / 10,
      documentSubmissions: {
        total: submissions.length,
        pending: submissions.filter(s => s.status === 'pending_review').length,
        approved: submissions.filter(s => s.status === 'approved').length,
        rejected: submissions.filter(s => s.status === 'rejected').length,
      },
      profileUpdates: {
        total: updates.length,
        pending: updates.filter(u => u.status === 'pending').length,
      },
    };
  }
}
