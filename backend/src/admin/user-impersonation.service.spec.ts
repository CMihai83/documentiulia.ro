import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  UserImpersonationService,
  ImpersonationSession,
  ImpersonationPermission,
  ImpersonationAudit,
} from './user-impersonation.service';

describe('UserImpersonationService', () => {
  let service: UserImpersonationService;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const validAdminParams = {
    adminId: 'admin_123',
    adminEmail: 'admin@documentiulia.ro',
    adminRole: 'admin',
    targetUserId: 'user_456',
    targetUserEmail: 'user@client.ro',
    targetTenantId: 'tenant_789',
    targetUserRole: 'user',
    reason: 'Customer support request',
    ticketId: 'TICKET-123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserImpersonationService,
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<UserImpersonationService>(UserImpersonationService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Session Management', () => {
    describe('startImpersonation', () => {
      it('should start impersonation session', async () => {
        const session = await service.startImpersonation(validAdminParams);

        expect(session).toBeDefined();
        expect(session.id).toBeDefined();
        expect(session.adminId).toBe(validAdminParams.adminId);
        expect(session.targetUserId).toBe(validAdminParams.targetUserId);
      });

      it('should set session timestamps', async () => {
        const session = await service.startImpersonation(validAdminParams);

        expect(session.startedAt).toBeDefined();
        expect(session.expiresAt).toBeDefined();
        expect(session.expiresAt.getTime()).toBeGreaterThan(session.startedAt.getTime());
      });

      it('should emit event on start', async () => {
        await service.startImpersonation(validAdminParams);

        expect(mockEventEmitter.emit).toHaveBeenCalledWith(
          'impersonation.started',
          expect.objectContaining({
            session: expect.any(Object),
          }),
        );
      });

      it('should set default permissions to read_only', async () => {
        const session = await service.startImpersonation(validAdminParams);

        expect(session.permissions).toContain('read_only');
      });

      it('should accept custom permissions', async () => {
        const session = await service.startImpersonation({
          ...validAdminParams,
          permissions: ['full_access'],
        });

        expect(session.permissions).toContain('full_access');
      });

      it('should store ticket ID', async () => {
        const session = await service.startImpersonation(validAdminParams);

        expect(session.ticketId).toBe('TICKET-123');
      });

      it('should store IP address', async () => {
        const session = await service.startImpersonation({
          ...validAdminParams,
          ipAddress: '192.168.1.1',
        });

        expect(session.ipAddress).toBe('192.168.1.1');
      });

      it('should store user agent', async () => {
        const session = await service.startImpersonation({
          ...validAdminParams,
          userAgent: 'Mozilla/5.0',
        });

        expect(session.userAgent).toBe('Mozilla/5.0');
      });

      it('should throw ForbiddenException for unauthorized role', async () => {
        await expect(
          service.startImpersonation({
            ...validAdminParams,
            adminRole: 'user',
          }),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should allow super_admin role', async () => {
        const session = await service.startImpersonation({
          ...validAdminParams,
          adminRole: 'super_admin',
        });

        expect(session).toBeDefined();
      });

      it('should allow admin role', async () => {
        const session = await service.startImpersonation({
          ...validAdminParams,
          adminRole: 'admin',
        });

        expect(session).toBeDefined();
      });

      it('should allow support role', async () => {
        const session = await service.startImpersonation({
          ...validAdminParams,
          adminRole: 'support',
        });

        expect(session).toBeDefined();
      });

      it('should prevent admin from impersonating other admins', async () => {
        await expect(
          service.startImpersonation({
            ...validAdminParams,
            adminRole: 'admin',
            targetUserRole: 'admin',
          }),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should allow super_admin to impersonate admins', async () => {
        const session = await service.startImpersonation({
          ...validAdminParams,
          adminRole: 'super_admin',
          targetUserRole: 'admin',
        });

        expect(session).toBeDefined();
      });

      it('should prevent multiple active sessions per admin', async () => {
        await service.startImpersonation(validAdminParams);

        await expect(
          service.startImpersonation({
            ...validAdminParams,
            targetUserId: 'different_user',
          }),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should respect max session duration', async () => {
        const session = await service.startImpersonation({
          ...validAdminParams,
          duration: 10 * 60 * 60 * 1000, // 10 hours (exceeds max)
        });

        const maxDuration = 2 * 60 * 60 * 1000; // 2 hours
        const actualDuration = session.expiresAt.getTime() - session.startedAt.getTime();

        expect(actualDuration).toBeLessThanOrEqual(maxDuration);
      });

      it('should accept custom duration within limit', async () => {
        const customDuration = 30 * 60 * 1000; // 30 minutes
        const session = await service.startImpersonation({
          ...validAdminParams,
          duration: customDuration,
        });

        const actualDuration = session.expiresAt.getTime() - session.startedAt.getTime();
        expect(actualDuration).toBeLessThanOrEqual(customDuration + 100); // Small tolerance
      });
    });

    describe('endImpersonation', () => {
      it('should end impersonation session', async () => {
        const session = await service.startImpersonation(validAdminParams);

        await service.endImpersonation(session.id, validAdminParams.adminId);

        const ended = await service.getSession(session.id);
        expect(ended?.endedAt).toBeDefined();
      });

      it('should set end reason', async () => {
        const session = await service.startImpersonation(validAdminParams);

        await service.endImpersonation(session.id, validAdminParams.adminId, 'manual');

        const ended = await service.getSession(session.id);
        expect(ended?.endReason).toBe('manual');
      });

      it('should emit event on end', async () => {
        const session = await service.startImpersonation(validAdminParams);

        await service.endImpersonation(session.id, validAdminParams.adminId);

        expect(mockEventEmitter.emit).toHaveBeenCalledWith(
          'impersonation.ended',
          expect.objectContaining({
            reason: 'manual',
          }),
        );
      });

      it('should throw NotFoundException for non-existent session', async () => {
        await expect(
          service.endImpersonation('non-existent', validAdminParams.adminId),
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw ForbiddenException for wrong admin', async () => {
        const session = await service.startImpersonation(validAdminParams);

        await expect(
          service.endImpersonation(session.id, 'different_admin'),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('validateSession', () => {
      it('should return session if valid', async () => {
        const session = await service.startImpersonation(validAdminParams);

        const validated = await service.validateSession(session.id);

        expect(validated).toBeDefined();
        expect(validated?.id).toBe(session.id);
      });

      it('should return null for non-existent session', async () => {
        const validated = await service.validateSession('non-existent');

        expect(validated).toBeNull();
      });

      it('should return null for ended session', async () => {
        const session = await service.startImpersonation(validAdminParams);
        await service.endImpersonation(session.id, validAdminParams.adminId);

        const validated = await service.validateSession(session.id);

        expect(validated).toBeNull();
      });
    });

    describe('getActiveSessionForAdmin', () => {
      it('should return active session', async () => {
        const session = await service.startImpersonation(validAdminParams);

        const active = await service.getActiveSessionForAdmin(validAdminParams.adminId);

        expect(active).toBeDefined();
        expect(active?.id).toBe(session.id);
      });

      it('should return null if no active session', async () => {
        const active = await service.getActiveSessionForAdmin('admin_no_session');

        expect(active).toBeNull();
      });

      it('should return null after session ended', async () => {
        const session = await service.startImpersonation(validAdminParams);
        await service.endImpersonation(session.id, validAdminParams.adminId);

        const active = await service.getActiveSessionForAdmin(validAdminParams.adminId);

        expect(active).toBeNull();
      });
    });

    describe('getSession', () => {
      it('should return session by ID', async () => {
        const session = await service.startImpersonation(validAdminParams);

        const retrieved = await service.getSession(session.id);

        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe(session.id);
      });

      it('should return null for non-existent ID', async () => {
        const retrieved = await service.getSession('non-existent');

        expect(retrieved).toBeNull();
      });
    });
  });

  describe('Permissions', () => {
    describe('checkPermission', () => {
      it('should return true for granted permission', async () => {
        const session = await service.startImpersonation({
          ...validAdminParams,
          permissions: ['read_only', 'view_settings'],
        });

        const canView = await service.checkPermission(session.id, 'view_settings');

        expect(canView).toBe(true);
      });

      it('should return false for missing permission', async () => {
        const session = await service.startImpersonation({
          ...validAdminParams,
          permissions: ['read_only'],
        });

        const canModify = await service.checkPermission(session.id, 'modify_settings');

        expect(canModify).toBe(false);
      });

      it('should return true for any permission with full_access', async () => {
        const session = await service.startImpersonation({
          ...validAdminParams,
          permissions: ['full_access'],
        });

        const canModify = await service.checkPermission(session.id, 'modify_settings');
        const canDelete = await service.checkPermission(session.id, 'no_delete');

        expect(canModify).toBe(true);
        expect(canDelete).toBe(true);
      });

      it('should return false for invalid session', async () => {
        const canView = await service.checkPermission('invalid', 'view_settings');

        expect(canView).toBe(false);
      });
    });

    describe('canPerformAction', () => {
      it('should allow GET for read_only permission', async () => {
        const session = await service.startImpersonation({
          ...validAdminParams,
          permissions: ['read_only'],
        });

        const canGet = await service.canPerformAction(session.id, {
          method: 'GET',
          endpoint: '/api/invoices',
        });

        expect(canGet).toBe(true);
      });

      it('should deny POST for read_only permission', async () => {
        const session = await service.startImpersonation({
          ...validAdminParams,
          permissions: ['read_only'],
        });

        const canPost = await service.canPerformAction(session.id, {
          method: 'POST',
          endpoint: '/api/invoices',
        });

        expect(canPost).toBe(false);
      });

      it('should allow all methods with full_access', async () => {
        const session = await service.startImpersonation({
          ...validAdminParams,
          permissions: ['full_access'],
        });

        const canPost = await service.canPerformAction(session.id, {
          method: 'POST',
          endpoint: '/api/invoices',
        });
        const canDelete = await service.canPerformAction(session.id, {
          method: 'DELETE',
          endpoint: '/api/invoices/123',
        });

        expect(canPost).toBe(true);
        expect(canDelete).toBe(true);
      });

      it('should deny financial operations with no_financial', async () => {
        const session = await service.startImpersonation({
          ...validAdminParams,
          permissions: ['no_financial'],
        });

        const canFinancial = await service.canPerformAction(session.id, {
          method: 'POST',
          endpoint: '/api/payments',
          isFinancial: true,
        });

        expect(canFinancial).toBe(false);
      });

      it('should deny delete with no_delete', async () => {
        const session = await service.startImpersonation({
          ...validAdminParams,
          permissions: ['no_delete'],
        });

        const canDelete = await service.canPerformAction(session.id, {
          method: 'DELETE',
          endpoint: '/api/invoices/123',
          isDelete: true,
        });

        expect(canDelete).toBe(false);
      });

      it('should allow settings view with view_settings', async () => {
        const session = await service.startImpersonation({
          ...validAdminParams,
          permissions: ['view_settings'],
        });

        const canViewSettings = await service.canPerformAction(session.id, {
          method: 'GET',
          endpoint: '/api/settings',
          isSettings: true,
        });

        expect(canViewSettings).toBe(true);
      });

      it('should deny settings modify with view_settings only', async () => {
        const session = await service.startImpersonation({
          ...validAdminParams,
          permissions: ['view_settings'],
        });

        const canModifySettings = await service.canPerformAction(session.id, {
          method: 'POST',
          endpoint: '/api/settings',
          isSettings: true,
        });

        expect(canModifySettings).toBe(false);
      });

      it('should allow settings modify with modify_settings', async () => {
        const session = await service.startImpersonation({
          ...validAdminParams,
          permissions: ['modify_settings'],
        });

        const canModifySettings = await service.canPerformAction(session.id, {
          method: 'POST',
          endpoint: '/api/settings',
          isSettings: true,
        });

        expect(canModifySettings).toBe(true);
      });

      it('should return false for invalid session', async () => {
        const canPerform = await service.canPerformAction('invalid', {
          method: 'GET',
          endpoint: '/api/test',
        });

        expect(canPerform).toBe(false);
      });
    });
  });

  describe('Audit', () => {
    describe('logAction', () => {
      it('should log action', async () => {
        const session = await service.startImpersonation(validAdminParams);

        await service.logAction(session.id, {
          action: 'VIEW_INVOICE',
          endpoint: '/api/invoices/123',
          method: 'GET',
          statusCode: 200,
        });

        const logs = await service.getSessionAuditLog(session.id);

        expect(logs.length).toBe(1);
        expect(logs[0].action).toBe('VIEW_INVOICE');
      });

      it('should store all action details', async () => {
        const session = await service.startImpersonation(validAdminParams);

        await service.logAction(session.id, {
          action: 'CREATE_INVOICE',
          endpoint: '/api/invoices',
          method: 'POST',
          statusCode: 201,
          details: { invoiceId: 'inv_123' },
        });

        const logs = await service.getSessionAuditLog(session.id);

        expect(logs[0].endpoint).toBe('/api/invoices');
        expect(logs[0].method).toBe('POST');
        expect(logs[0].statusCode).toBe(201);
        expect(logs[0].details?.invoiceId).toBe('inv_123');
      });

      it('should ignore log for non-existent session', async () => {
        await service.logAction('non-existent', {
          action: 'TEST',
          endpoint: '/test',
          method: 'GET',
          statusCode: 200,
        });

        // Should not throw, just skip
        expect(true).toBe(true);
      });
    });

    describe('getSessionAuditLog', () => {
      it('should return audit logs for session', async () => {
        const session = await service.startImpersonation(validAdminParams);

        await service.logAction(session.id, {
          action: 'ACTION_1',
          endpoint: '/test',
          method: 'GET',
          statusCode: 200,
        });
        await service.logAction(session.id, {
          action: 'ACTION_2',
          endpoint: '/test',
          method: 'POST',
          statusCode: 201,
        });

        const logs = await service.getSessionAuditLog(session.id);

        expect(logs.length).toBe(2);
      });

      it('should sort by timestamp descending', async () => {
        const session = await service.startImpersonation(validAdminParams);

        await service.logAction(session.id, {
          action: 'FIRST',
          endpoint: '/test',
          method: 'GET',
          statusCode: 200,
        });
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 5));
        await service.logAction(session.id, {
          action: 'SECOND',
          endpoint: '/test',
          method: 'GET',
          statusCode: 200,
        });

        const logs = await service.getSessionAuditLog(session.id);

        // Most recent should be first
        expect(logs.length).toBe(2);
        expect(logs[0].timestamp.getTime()).toBeGreaterThanOrEqual(logs[1].timestamp.getTime());
      });
    });
  });

  describe('Queries', () => {
    describe('getAllSessions', () => {
      it('should return all sessions', async () => {
        await service.startImpersonation(validAdminParams);

        const sessions = await service.getAllSessions();

        expect(sessions.length).toBeGreaterThan(0);
      });

      it('should filter by adminId', async () => {
        await service.startImpersonation(validAdminParams);

        const sessions = await service.getAllSessions({ adminId: validAdminParams.adminId });

        sessions.forEach(s => expect(s.adminId).toBe(validAdminParams.adminId));
      });

      it('should filter by targetUserId', async () => {
        await service.startImpersonation(validAdminParams);

        const sessions = await service.getAllSessions({ targetUserId: validAdminParams.targetUserId });

        sessions.forEach(s => expect(s.targetUserId).toBe(validAdminParams.targetUserId));
      });

      it('should filter active sessions', async () => {
        const session = await service.startImpersonation(validAdminParams);

        const activeSessions = await service.getAllSessions({ active: true });

        expect(activeSessions.some(s => s.id === session.id)).toBe(true);
      });

      it('should filter inactive sessions', async () => {
        const session = await service.startImpersonation(validAdminParams);
        await service.endImpersonation(session.id, validAdminParams.adminId);

        const inactiveSessions = await service.getAllSessions({ active: false });

        expect(inactiveSessions.some(s => s.id === session.id)).toBe(true);
      });

      it('should filter by start date', async () => {
        await service.startImpersonation(validAdminParams);
        const startDate = new Date(Date.now() - 1000);

        const sessions = await service.getAllSessions({ startDate });

        sessions.forEach(s => {
          expect(s.startedAt.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        });
      });

      it('should sort by startedAt descending', async () => {
        await service.startImpersonation(validAdminParams);

        const sessions = await service.getAllSessions();

        for (let i = 1; i < sessions.length; i++) {
          expect(sessions[i - 1].startedAt.getTime()).toBeGreaterThanOrEqual(
            sessions[i].startedAt.getTime(),
          );
        }
      });
    });

    describe('getActiveSessions', () => {
      it('should return only active sessions', async () => {
        const session = await service.startImpersonation(validAdminParams);

        const active = await service.getActiveSessions();

        expect(active.some(s => s.id === session.id)).toBe(true);
        active.forEach(s => expect(s.endedAt).toBeUndefined());
      });
    });

    describe('getSessionsForUser', () => {
      it('should return sessions for target user', async () => {
        await service.startImpersonation(validAdminParams);

        const sessions = await service.getSessionsForUser(validAdminParams.targetUserId);

        sessions.forEach(s => expect(s.targetUserId).toBe(validAdminParams.targetUserId));
      });
    });
  });

  describe('Admin Operations', () => {
    describe('forceEndSession', () => {
      it('should force end session', async () => {
        const session = await service.startImpersonation(validAdminParams);

        await service.forceEndSession(session.id, 'super_admin_123');

        const ended = await service.getSession(session.id);
        expect(ended?.endedAt).toBeDefined();
        expect(ended?.endReason).toBe('manual');
      });

      it('should emit force_ended event', async () => {
        const session = await service.startImpersonation(validAdminParams);

        await service.forceEndSession(session.id, 'super_admin_123');

        expect(mockEventEmitter.emit).toHaveBeenCalledWith(
          'impersonation.force_ended',
          expect.objectContaining({
            endedBy: 'super_admin_123',
          }),
        );
      });

      it('should throw NotFoundException for non-existent session', async () => {
        await expect(
          service.forceEndSession('non-existent', 'admin'),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('forceEndAllSessions', () => {
      it('should end all active sessions', async () => {
        await service.startImpersonation(validAdminParams);

        const count = await service.forceEndAllSessions('super_admin_123');

        expect(count).toBeGreaterThan(0);

        const active = await service.getActiveSessions();
        expect(active.length).toBe(0);
      });

      it('should emit all_force_ended event', async () => {
        await service.startImpersonation(validAdminParams);

        await service.forceEndAllSessions('super_admin_123');

        expect(mockEventEmitter.emit).toHaveBeenCalledWith(
          'impersonation.all_force_ended',
          expect.objectContaining({
            endedBy: 'super_admin_123',
          }),
        );
      });

      it('should return 0 if no active sessions', async () => {
        const count = await service.forceEndAllSessions('admin');

        expect(count).toBe(0);
      });
    });
  });

  describe('Stats', () => {
    describe('getStats', () => {
      it('should return stats', async () => {
        await service.startImpersonation(validAdminParams);

        const stats = await service.getStats();

        expect(stats).toBeDefined();
        expect(stats.totalSessions).toBeGreaterThan(0);
      });

      it('should count active sessions', async () => {
        await service.startImpersonation(validAdminParams);

        const stats = await service.getStats();

        expect(stats.activeSessions).toBeGreaterThan(0);
      });

      it('should count sessions today', async () => {
        await service.startImpersonation(validAdminParams);

        const stats = await service.getStats();

        expect(stats.sessionsToday).toBeGreaterThan(0);
      });

      it('should include top admins', async () => {
        await service.startImpersonation(validAdminParams);

        const stats = await service.getStats();

        expect(Array.isArray(stats.topAdmins)).toBe(true);
      });

      it('should include top targets', async () => {
        await service.startImpersonation(validAdminParams);

        const stats = await service.getStats();

        expect(Array.isArray(stats.topTargets)).toBe(true);
      });

      it('should calculate average session duration', async () => {
        const session = await service.startImpersonation(validAdminParams);
        await service.endImpersonation(session.id, validAdminParams.adminId);

        const stats = await service.getStats();

        expect(typeof stats.avgSessionDuration).toBe('number');
      });
    });
  });

  describe('Cleanup', () => {
    describe('cleanupExpiredSessions', () => {
      it('should mark expired sessions', async () => {
        // Create session with very short duration
        const session = await service.startImpersonation({
          ...validAdminParams,
          duration: 1, // 1ms
        });

        // Wait for expiration
        await new Promise(resolve => setTimeout(resolve, 10));

        const cleaned = await service.cleanupExpiredSessions();

        expect(cleaned).toBeGreaterThanOrEqual(1);

        const expired = await service.getSession(session.id);
        expect(expired?.endedAt).toBeDefined();
        expect(expired?.endReason).toBe('expired');
      });

      it('should not affect non-expired sessions', async () => {
        const session = await service.startImpersonation(validAdminParams);

        await service.cleanupExpiredSessions();

        const still = await service.validateSession(session.id);
        expect(still).toBeDefined();
      });
    });
  });

  describe('Permission Types', () => {
    it('should support read_only permission', async () => {
      const session = await service.startImpersonation({
        ...validAdminParams,
        permissions: ['read_only'],
      });
      expect(session.permissions).toContain('read_only');
    });

    it('should support full_access permission', async () => {
      const session = await service.startImpersonation({
        ...validAdminParams,
        permissions: ['full_access'],
      });
      expect(session.permissions).toContain('full_access');
    });

    it('should support no_financial permission', async () => {
      const session = await service.startImpersonation({
        ...validAdminParams,
        permissions: ['no_financial'],
      });
      expect(session.permissions).toContain('no_financial');
    });

    it('should support no_delete permission', async () => {
      const session = await service.startImpersonation({
        ...validAdminParams,
        permissions: ['no_delete'],
      });
      expect(session.permissions).toContain('no_delete');
    });

    it('should support view_settings permission', async () => {
      const session = await service.startImpersonation({
        ...validAdminParams,
        permissions: ['view_settings'],
      });
      expect(session.permissions).toContain('view_settings');
    });

    it('should support modify_settings permission', async () => {
      const session = await service.startImpersonation({
        ...validAdminParams,
        permissions: ['modify_settings'],
      });
      expect(session.permissions).toContain('modify_settings');
    });

    it('should support multiple permissions', async () => {
      const session = await service.startImpersonation({
        ...validAdminParams,
        permissions: ['read_only', 'view_settings', 'no_financial'],
      });
      expect(session.permissions).toContain('read_only');
      expect(session.permissions).toContain('view_settings');
      expect(session.permissions).toContain('no_financial');
    });
  });

  describe('End Reasons', () => {
    it('should support manual end reason', async () => {
      const session = await service.startImpersonation(validAdminParams);
      await service.endImpersonation(session.id, validAdminParams.adminId, 'manual');

      const ended = await service.getSession(session.id);
      expect(ended?.endReason).toBe('manual');
    });

    it('should support expired end reason', async () => {
      const session = await service.startImpersonation({
        ...validAdminParams,
        duration: 1,
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      await service.cleanupExpiredSessions();

      const ended = await service.getSession(session.id);
      expect(ended?.endReason).toBe('expired');
    });

    it('should support timeout end reason', async () => {
      const session = await service.startImpersonation(validAdminParams);
      await service.endImpersonation(session.id, validAdminParams.adminId, 'timeout');

      const ended = await service.getSession(session.id);
      expect(ended?.endReason).toBe('timeout');
    });
  });
});
