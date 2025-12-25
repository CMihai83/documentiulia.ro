import { Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * User Impersonation Service
 * Allow admins to impersonate users for support purposes
 *
 * Features:
 * - Secure impersonation sessions
 * - Audit trail
 * - Time-limited sessions
 * - Role restrictions
 */

// =================== TYPES ===================

export interface ImpersonationSession {
  id: string;
  adminId: string;
  adminEmail: string;
  targetUserId: string;
  targetUserEmail: string;
  targetTenantId: string;
  reason: string;
  ticketId?: string;
  permissions: ImpersonationPermission[];
  startedAt: Date;
  expiresAt: Date;
  endedAt?: Date;
  endReason?: 'manual' | 'expired' | 'timeout';
  ipAddress?: string;
  userAgent?: string;
}

export type ImpersonationPermission =
  | 'read_only'
  | 'full_access'
  | 'no_financial'
  | 'no_delete'
  | 'view_settings'
  | 'modify_settings';

export interface ImpersonationAudit {
  id: string;
  sessionId: string;
  action: string;
  endpoint: string;
  method: string;
  statusCode: number;
  timestamp: Date;
  details?: Record<string, any>;
}

// =================== SERVICE ===================

@Injectable()
export class UserImpersonationService {
  private readonly logger = new Logger(UserImpersonationService.name);

  // Storage
  private sessions = new Map<string, ImpersonationSession>();
  private auditLogs: ImpersonationAudit[] = [];

  // Configuration
  private readonly maxSessionDuration = 2 * 60 * 60 * 1000; // 2 hours
  private readonly allowedRoles = ['super_admin', 'admin', 'support'];

  constructor(private eventEmitter: EventEmitter2) {}

  // =================== SESSION MANAGEMENT ===================

  async startImpersonation(params: {
    adminId: string;
    adminEmail: string;
    adminRole: string;
    targetUserId: string;
    targetUserEmail: string;
    targetTenantId: string;
    targetUserRole: string;
    reason: string;
    ticketId?: string;
    permissions?: ImpersonationPermission[];
    duration?: number;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<ImpersonationSession> {
    // Validate admin permissions
    if (!this.allowedRoles.includes(params.adminRole)) {
      throw new ForbiddenException('You do not have permission to impersonate users');
    }

    // Prevent impersonating other admins (unless super_admin)
    if (
      params.targetUserRole === 'admin' ||
      params.targetUserRole === 'super_admin'
    ) {
      if (params.adminRole !== 'super_admin') {
        throw new ForbiddenException('Only super admins can impersonate other admins');
      }
    }

    // Check for existing session
    const existingSession = await this.getActiveSessionForAdmin(params.adminId);
    if (existingSession) {
      throw new ForbiddenException('You already have an active impersonation session');
    }

    // Create session
    const duration = Math.min(params.duration || this.maxSessionDuration, this.maxSessionDuration);
    const sessionId = `imp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const session: ImpersonationSession = {
      id: sessionId,
      adminId: params.adminId,
      adminEmail: params.adminEmail,
      targetUserId: params.targetUserId,
      targetUserEmail: params.targetUserEmail,
      targetTenantId: params.targetTenantId,
      reason: params.reason,
      ticketId: params.ticketId,
      permissions: params.permissions || ['read_only'],
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + duration),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    };

    this.sessions.set(sessionId, session);

    this.eventEmitter.emit('impersonation.started', { session });

    this.logger.warn(
      `Impersonation started: ${params.adminEmail} -> ${params.targetUserEmail} (${params.reason})`,
    );

    return session;
  }

  async endImpersonation(
    sessionId: string,
    adminId: string,
    reason: 'manual' | 'expired' | 'timeout' = 'manual',
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new NotFoundException('Impersonation session not found');
    }

    if (session.adminId !== adminId) {
      throw new ForbiddenException('You can only end your own sessions');
    }

    session.endedAt = new Date();
    session.endReason = reason;
    this.sessions.set(sessionId, session);

    this.eventEmitter.emit('impersonation.ended', { session, reason });

    this.logger.log(`Impersonation ended: ${sessionId} (${reason})`);
  }

  async validateSession(sessionId: string): Promise<ImpersonationSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Check if expired
    if (session.endedAt || new Date() > session.expiresAt) {
      if (!session.endedAt) {
        session.endedAt = new Date();
        session.endReason = 'expired';
        this.sessions.set(sessionId, session);
      }
      return null;
    }

    return session;
  }

  async getActiveSessionForAdmin(adminId: string): Promise<ImpersonationSession | null> {
    for (const session of this.sessions.values()) {
      if (session.adminId === adminId && !session.endedAt && new Date() < session.expiresAt) {
        return session;
      }
    }
    return null;
  }

  async getSession(sessionId: string): Promise<ImpersonationSession | null> {
    return this.sessions.get(sessionId) || null;
  }

  // =================== PERMISSIONS ===================

  async checkPermission(
    sessionId: string,
    requiredPermission: ImpersonationPermission,
  ): Promise<boolean> {
    const session = await this.validateSession(sessionId);
    if (!session) return false;

    // full_access includes everything
    if (session.permissions.includes('full_access')) return true;

    return session.permissions.includes(requiredPermission);
  }

  async canPerformAction(
    sessionId: string,
    action: {
      method: string;
      endpoint: string;
      isFinancial?: boolean;
      isDelete?: boolean;
      isSettings?: boolean;
    },
  ): Promise<boolean> {
    const session = await this.validateSession(sessionId);
    if (!session) return false;

    // Full access can do everything
    if (session.permissions.includes('full_access')) return true;

    // Read only - only GET requests
    if (session.permissions.includes('read_only')) {
      if (action.method !== 'GET') return false;
    }

    // No financial operations
    if (session.permissions.includes('no_financial') && action.isFinancial) {
      return false;
    }

    // No delete operations
    if (session.permissions.includes('no_delete') && action.isDelete) {
      return false;
    }

    // Settings access
    if (action.isSettings) {
      if (session.permissions.includes('modify_settings')) return true;
      if (session.permissions.includes('view_settings') && action.method === 'GET') return true;
      return false;
    }

    return true;
  }

  // =================== AUDIT ===================

  async logAction(
    sessionId: string,
    action: {
      action: string;
      endpoint: string;
      method: string;
      statusCode: number;
      details?: Record<string, any>;
    },
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const audit: ImpersonationAudit = {
      id: `audit-${Date.now()}`,
      sessionId,
      action: action.action,
      endpoint: action.endpoint,
      method: action.method,
      statusCode: action.statusCode,
      timestamp: new Date(),
      details: action.details,
    };

    this.auditLogs.push(audit);
  }

  async getSessionAuditLog(sessionId: string): Promise<ImpersonationAudit[]> {
    return this.auditLogs
      .filter(a => a.sessionId === sessionId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // =================== QUERIES ===================

  async getAllSessions(filters?: {
    adminId?: string;
    targetUserId?: string;
    active?: boolean;
    startDate?: Date;
    endDate?: Date;
  }): Promise<ImpersonationSession[]> {
    let sessions = Array.from(this.sessions.values());

    if (filters?.adminId) {
      sessions = sessions.filter(s => s.adminId === filters.adminId);
    }
    if (filters?.targetUserId) {
      sessions = sessions.filter(s => s.targetUserId === filters.targetUserId);
    }
    if (filters?.active !== undefined) {
      const now = new Date();
      if (filters.active) {
        sessions = sessions.filter(s => !s.endedAt && s.expiresAt > now);
      } else {
        sessions = sessions.filter(s => s.endedAt || s.expiresAt <= now);
      }
    }
    if (filters?.startDate) {
      sessions = sessions.filter(s => s.startedAt >= filters.startDate!);
    }
    if (filters?.endDate) {
      sessions = sessions.filter(s => s.startedAt <= filters.endDate!);
    }

    return sessions.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  async getActiveSessions(): Promise<ImpersonationSession[]> {
    return this.getAllSessions({ active: true });
  }

  async getSessionsForUser(targetUserId: string): Promise<ImpersonationSession[]> {
    return this.getAllSessions({ targetUserId });
  }

  // =================== ADMIN ===================

  async forceEndSession(sessionId: string, endedBy: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    session.endedAt = new Date();
    session.endReason = 'manual';
    this.sessions.set(sessionId, session);

    this.eventEmitter.emit('impersonation.force_ended', {
      session,
      endedBy,
    });

    this.logger.warn(`Impersonation force ended by ${endedBy}: ${sessionId}`);
  }

  async forceEndAllSessions(endedBy: string): Promise<number> {
    const activeSessions = await this.getActiveSessions();
    let count = 0;

    for (const session of activeSessions) {
      session.endedAt = new Date();
      session.endReason = 'manual';
      this.sessions.set(session.id, session);
      count++;
    }

    if (count > 0) {
      this.eventEmitter.emit('impersonation.all_force_ended', {
        count,
        endedBy,
      });
      this.logger.warn(`All impersonation sessions force ended by ${endedBy}: ${count} sessions`);
    }

    return count;
  }

  // =================== STATS ===================

  async getStats(): Promise<{
    activeSessions: number;
    totalSessions: number;
    sessionsToday: number;
    avgSessionDuration: number;
    topAdmins: Array<{ adminEmail: string; sessionCount: number }>;
    topTargets: Array<{ userEmail: string; sessionCount: number }>;
  }> {
    const sessions = Array.from(this.sessions.values());
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const activeSessions = sessions.filter(
      s => !s.endedAt && s.expiresAt > now
    ).length;

    const sessionsToday = sessions.filter(
      s => s.startedAt >= today
    ).length;

    // Calculate average session duration
    const completedSessions = sessions.filter(s => s.endedAt);
    const avgDuration = completedSessions.length > 0
      ? completedSessions.reduce(
          (sum, s) => sum + (s.endedAt!.getTime() - s.startedAt.getTime()),
          0
        ) / completedSessions.length / 60000 // in minutes
      : 0;

    // Top admins
    const adminCounts = new Map<string, { email: string; count: number }>();
    for (const session of sessions) {
      const existing = adminCounts.get(session.adminId) || {
        email: session.adminEmail,
        count: 0,
      };
      existing.count++;
      adminCounts.set(session.adminId, existing);
    }

    const topAdmins = Array.from(adminCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(a => ({ adminEmail: a.email, sessionCount: a.count }));

    // Top targets
    const targetCounts = new Map<string, { email: string; count: number }>();
    for (const session of sessions) {
      const existing = targetCounts.get(session.targetUserId) || {
        email: session.targetUserEmail,
        count: 0,
      };
      existing.count++;
      targetCounts.set(session.targetUserId, existing);
    }

    const topTargets = Array.from(targetCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(t => ({ userEmail: t.email, sessionCount: t.count }));

    return {
      activeSessions,
      totalSessions: sessions.length,
      sessionsToday,
      avgSessionDuration: Math.round(avgDuration * 10) / 10,
      topAdmins,
      topTargets,
    };
  }

  // =================== CLEANUP ===================

  async cleanupExpiredSessions(): Promise<number> {
    const now = new Date();
    let cleaned = 0;

    for (const [id, session] of this.sessions) {
      if (!session.endedAt && session.expiresAt <= now) {
        session.endedAt = now;
        session.endReason = 'expired';
        this.sessions.set(id, session);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired impersonation sessions`);
    }

    return cleaned;
  }
}
