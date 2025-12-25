import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { RbacService } from './rbac.service';

describe('RbacService', () => {
  let service: RbacService;
  const tenantId = 'tenant-123';
  const userId = 'user-456';
  const adminId = 'admin-789';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RbacService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-value'),
          },
        },
      ],
    }).compile();

    service = module.get<RbacService>(RbacService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('System Initialization', () => {
    it('should initialize system permissions', async () => {
      const permissions = await service.getPermissions();
      expect(permissions.length).toBeGreaterThan(100);
    });

    it('should initialize system roles', async () => {
      const roles = await service.getRoles();
      expect(roles.length).toBeGreaterThanOrEqual(8);
    });

    it('should have SUPER_ADMIN role', async () => {
      const role = await service.getRoleByName('SUPER_ADMIN');
      expect(role).toBeDefined();
      expect(role?.isSystem).toBe(true);
    });

    it('should have all standard roles', async () => {
      const expectedRoles = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'HR_MANAGER', 'FLEET_MANAGER', 'USER', 'VIEWER'];
      for (const name of expectedRoles) {
        const role = await service.getRoleByName(name);
        expect(role).toBeDefined();
      }
    });
  });

  describe('Role CRUD', () => {
    it('should create a custom role', async () => {
      const role = await service.createRole(
        'CUSTOM_ROLE',
        'A custom role',
        ['invoices:read:tenant', 'customers:read:tenant'],
        tenantId,
      );

      expect(role).toBeDefined();
      expect(role.id).toMatch(/^role-/);
      expect(role.name).toBe('CUSTOM_ROLE');
      expect(role.permissions).toHaveLength(2);
      expect(role.isSystem).toBe(false);
    });

    it('should get role by ID', async () => {
      const created = await service.createRole('TEST', 'Test', ['invoices:read:tenant'], tenantId);
      const retrieved = await service.getRole(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('TEST');
    });

    it('should get role by name', async () => {
      await service.createRole('UNIQUE_NAME', 'Unique', ['invoices:read:tenant'], tenantId);
      const role = await service.getRoleByName('UNIQUE_NAME', tenantId);
      expect(role).toBeDefined();
      expect(role?.name).toBe('UNIQUE_NAME');
    });

    it('should return null for non-existent role', async () => {
      const role = await service.getRole('non-existent');
      expect(role).toBeNull();
    });

    it('should get roles for tenant', async () => {
      await service.createRole('TENANT_ROLE', 'Tenant', ['invoices:read:tenant'], tenantId);
      const roles = await service.getRoles(tenantId);
      expect(roles.some(r => r.name === 'TENANT_ROLE')).toBe(true);
    });

    it('should filter system roles', async () => {
      const roles = await service.getRoles(tenantId, false);
      expect(roles.every(r => !r.isSystem)).toBe(true);
    });

    it('should update custom role', async () => {
      const created = await service.createRole('UPDATE_TEST', 'Original', ['invoices:read:tenant'], tenantId);
      const updated = await service.updateRole(created.id, {
        name: 'UPDATED_NAME',
        description: 'Updated description',
      });

      expect(updated?.name).toBe('UPDATED_NAME');
      expect(updated?.description).toBe('Updated description');
    });

    it('should not update system role', async () => {
      const adminRole = await service.getRoleByName('ADMIN');
      const result = await service.updateRole(adminRole!.id, { name: 'HACKED' });
      expect(result).toBeNull();
    });

    it('should delete custom role', async () => {
      const created = await service.createRole('DELETE_TEST', 'Delete', ['invoices:read:tenant'], tenantId);
      const deleted = await service.deleteRole(created.id);
      expect(deleted).toBe(true);
      expect(await service.getRole(created.id)).toBeNull();
    });

    it('should not delete system role', async () => {
      const adminRole = await service.getRoleByName('ADMIN');
      const deleted = await service.deleteRole(adminRole!.id);
      expect(deleted).toBe(false);
    });

    it('should create role with inheritance', async () => {
      const baseRole = await service.createRole('BASE_ROLE', 'Base', ['invoices:read:tenant'], tenantId);
      const childRole = await service.createRole(
        'CHILD_ROLE',
        'Child',
        ['customers:read:tenant'],
        tenantId,
        baseRole.id,
      );

      expect(childRole.inheritsFrom).toBe(baseRole.id);
    });
  });

  describe('User Role Assignments', () => {
    it('should assign role to user', async () => {
      const adminRole = await service.getRoleByName('ADMIN');
      const assignment = await service.assignRole(userId, adminRole!.id, tenantId, adminId);

      expect(assignment.userId).toBe(userId);
      expect(assignment.roleId).toBe(adminRole!.id);
      expect(assignment.tenantId).toBe(tenantId);
      expect(assignment.assignedBy).toBe(adminId);
    });

    it('should assign role with expiration', async () => {
      const userRole = await service.getRoleByName('USER');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const assignment = await service.assignRole(userId, userRole!.id, tenantId, adminId, expiresAt);
      expect(assignment.expiresAt).toEqual(expiresAt);
    });

    it('should throw error for non-existent role', async () => {
      await expect(
        service.assignRole(userId, 'non-existent', tenantId, adminId),
      ).rejects.toThrow('Role not found');
    });

    it('should get user roles', async () => {
      const adminRole = await service.getRoleByName('ADMIN');
      const userRole = await service.getRoleByName('USER');

      await service.assignRole(userId, adminRole!.id, tenantId, adminId);
      await service.assignRole(userId, userRole!.id, tenantId, adminId);

      const roles = await service.getUserRoles(userId, tenantId);
      expect(roles).toHaveLength(2);
    });

    it('should filter roles by tenant', async () => {
      const userRole = await service.getRoleByName('USER');
      await service.assignRole(userId, userRole!.id, tenantId, adminId);
      await service.assignRole(userId, userRole!.id, 'other-tenant', adminId);

      const roles = await service.getUserRoles(userId, tenantId);
      expect(roles).toHaveLength(1);
    });

    it('should revoke role', async () => {
      const userRole = await service.getRoleByName('USER');
      await service.assignRole(userId, userRole!.id, tenantId, adminId);

      const revoked = await service.revokeRole(userId, userRole!.id, tenantId);
      expect(revoked).toBe(true);

      const roles = await service.getUserRoles(userId, tenantId);
      expect(roles).toHaveLength(0);
    });

    it('should not return expired roles', async () => {
      const userRole = await service.getRoleByName('USER');
      const expiresAt = new Date(Date.now() - 1000); // Already expired

      await service.assignRole(userId, userRole!.id, tenantId, adminId, expiresAt);

      const roles = await service.getUserRoles(userId, tenantId);
      expect(roles).toHaveLength(0);
    });

    it('should get role assignments', async () => {
      const userRole = await service.getRoleByName('USER');
      await service.assignRole(userId, userRole!.id, tenantId, adminId);

      const assignments = await service.getUserRoleAssignments(userId, tenantId);
      expect(assignments).toHaveLength(1);
      expect(assignments[0].assignedBy).toBe(adminId);
    });

    it('should remove assignments when role is deleted', async () => {
      const customRole = await service.createRole('TEMP_ROLE', 'Temp', ['invoices:read:tenant'], tenantId);
      await service.assignRole(userId, customRole.id, tenantId, adminId);

      await service.deleteRole(customRole.id);

      const assignments = await service.getUserRoleAssignments(userId, tenantId);
      expect(assignments.some(a => a.roleId === customRole.id)).toBe(false);
    });
  });

  describe('Permissions', () => {
    it('should get all permissions', async () => {
      const permissions = await service.getPermissions();
      expect(permissions.length).toBeGreaterThan(0);
    });

    it('should filter permissions by resource', async () => {
      const permissions = await service.getPermissions('invoices');
      expect(permissions.every(p => p.resource === 'invoices')).toBe(true);
    });

    it('should filter permissions by action', async () => {
      const permissions = await service.getPermissions(undefined, 'read');
      expect(permissions.every(p => p.action === 'read')).toBe(true);
    });

    it('should get permission by ID', async () => {
      const permission = await service.getPermission('invoices:read:tenant');
      expect(permission).toBeDefined();
      expect(permission?.resource).toBe('invoices');
      expect(permission?.action).toBe('read');
      expect(permission?.scope).toBe('tenant');
    });

    it('should get user permissions based on role', async () => {
      const accountantRole = await service.getRoleByName('ACCOUNTANT');
      await service.assignRole(userId, accountantRole!.id, tenantId, adminId);

      const permissions = await service.getUserPermissions(userId, tenantId);
      expect(permissions.length).toBeGreaterThan(0);
      expect(permissions.some(p => p.resource === 'invoices')).toBe(true);
    });

    it('should inherit permissions from parent role', async () => {
      const baseRole = await service.createRole(
        'INHERIT_BASE',
        'Base',
        ['invoices:read:tenant'],
        tenantId,
      );

      const childRole = await service.createRole(
        'INHERIT_CHILD',
        'Child',
        ['customers:read:tenant'],
        tenantId,
        baseRole.id,
      );

      await service.assignRole(userId, childRole.id, tenantId, adminId);

      const permissions = await service.getUserPermissions(userId, tenantId);
      expect(permissions.some(p => p.id === 'invoices:read:tenant')).toBe(true);
      expect(permissions.some(p => p.id === 'customers:read:tenant')).toBe(true);
    });

    it('should get permissions by category', async () => {
      const financePerms = await service.getPermissionsByCategory('finance');
      expect(financePerms.some(p => p.resource === 'invoices')).toBe(true);
      expect(financePerms.some(p => p.resource === 'payments')).toBe(true);
    });
  });

  describe('Access Control', () => {
    beforeEach(async () => {
      // Set up user with ACCOUNTANT role
      const accountantRole = await service.getRoleByName('ACCOUNTANT');
      await service.assignRole(userId, accountantRole!.id, tenantId, adminId);
    });

    it('should allow access for valid permission', async () => {
      const result = await service.checkAccess({
        userId,
        tenantId,
        resource: 'invoices',
        action: 'read',
      });

      expect(result.allowed).toBe(true);
    });

    it('should deny access for missing permission', async () => {
      const result = await service.checkAccess({
        userId,
        tenantId,
        resource: 'roles',
        action: 'delete',
      });

      expect(result.allowed).toBe(false);
    });

    it('should check own scope correctly', async () => {
      // User with own scope should only access own resources
      const viewerRole = await service.getRoleByName('VIEWER');
      const viewerId = 'viewer-user';
      await service.assignRole(viewerId, viewerRole!.id, tenantId, adminId);

      // Should allow if owner matches
      const resultOwn = await service.checkAccess({
        userId: viewerId,
        tenantId,
        resource: 'invoices',
        action: 'read',
        resourceOwnerId: viewerId,
      });
      expect(resultOwn.allowed).toBe(true);

      // Should deny if owner doesn't match
      const resultOther = await service.checkAccess({
        userId: viewerId,
        tenantId,
        resource: 'invoices',
        action: 'read',
        resourceOwnerId: 'other-user',
      });
      expect(resultOther.allowed).toBe(false);
    });

    it('should allow team scope with team membership', async () => {
      const managerRole = await service.getRoleByName('MANAGER');
      const managerId = 'manager-user';
      await service.assignRole(managerId, managerRole!.id, tenantId, adminId);

      const result = await service.checkAccess({
        userId: managerId,
        tenantId,
        resource: 'timesheets',
        action: 'read',
        metadata: { isTeamMember: true },
      });
      expect(result.allowed).toBe(true);
    });

    it('should throw on requireAccess for denied permission', async () => {
      await expect(
        service.requireAccess({
          userId,
          tenantId,
          resource: 'roles',
          action: 'delete',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should hasPermission return boolean', async () => {
      const has = await service.hasPermission(userId, tenantId, 'invoices', 'read');
      expect(has).toBe(true);

      const hasNot = await service.hasPermission(userId, tenantId, 'roles', 'delete');
      expect(hasNot).toBe(false);
    });

    it('should hasRole check correctly', async () => {
      const has = await service.hasRole(userId, tenantId, 'ACCOUNTANT');
      expect(has).toBe(true);

      const hasNot = await service.hasRole(userId, tenantId, 'SUPER_ADMIN');
      expect(hasNot).toBe(false);
    });

    it('should hasAnyRole check correctly', async () => {
      const has = await service.hasAnyRole(userId, tenantId, ['ACCOUNTANT', 'HR_MANAGER']);
      expect(has).toBe(true);

      const hasNot = await service.hasAnyRole(userId, tenantId, ['SUPER_ADMIN', 'ADMIN']);
      expect(hasNot).toBe(false);
    });
  });

  describe('Accessible Resources', () => {
    it('should return scope and actions for resource', async () => {
      const accountantRole = await service.getRoleByName('ACCOUNTANT');
      await service.assignRole(userId, accountantRole!.id, tenantId, adminId);

      const accessible = await service.getAccessibleResources(userId, tenantId, 'invoices');

      expect(accessible.scope).toBe('tenant');
      expect(accessible.actions).toContain('read');
      expect(accessible.actions).toContain('create');
    });

    it('should return none for inaccessible resource', async () => {
      const viewerRole = await service.getRoleByName('VIEWER');
      await service.assignRole(userId, viewerRole!.id, tenantId, adminId);

      const accessible = await service.getAccessibleResources(userId, tenantId, 'roles');
      expect(accessible.scope).toBe('none');
      expect(accessible.actions).toHaveLength(0);
    });
  });

  describe('Cache Management', () => {
    it('should cache user permissions', async () => {
      const userRole = await service.getRoleByName('USER');
      await service.assignRole(userId, userRole!.id, tenantId, adminId);

      // First call populates cache
      const perms1 = await service.getUserPermissions(userId, tenantId);
      // Second call should use cache
      const perms2 = await service.getUserPermissions(userId, tenantId);

      expect(perms1).toEqual(perms2);
    });

    it('should clear cache', async () => {
      const userRole = await service.getRoleByName('USER');
      await service.assignRole(userId, userRole!.id, tenantId, adminId);

      await service.getUserPermissions(userId, tenantId);
      await service.clearCache();

      // Should still work after cache clear
      const perms = await service.getUserPermissions(userId, tenantId);
      expect(perms.length).toBeGreaterThan(0);
    });
  });

  describe('Metadata', () => {
    it('should get resource types', () => {
      const types = service.getResourceTypes();
      expect(types).toContain('invoices');
      expect(types).toContain('customers');
      expect(types).toContain('employees');
      expect(types).toContain('fleet');
    });

    it('should get action types', () => {
      const actions = service.getActionTypes();
      expect(actions).toContain('create');
      expect(actions).toContain('read');
      expect(actions).toContain('update');
      expect(actions).toContain('delete');
      expect(actions).toContain('approve');
    });

    it('should get scope types', () => {
      const scopes = service.getScopeTypes();
      expect(scopes).toContain('all');
      expect(scopes).toContain('tenant');
      expect(scopes).toContain('team');
      expect(scopes).toContain('own');
    });

    it('should get system roles', () => {
      const roles = service.getSystemRoles();
      expect(roles).toContain('SUPER_ADMIN');
      expect(roles).toContain('ADMIN');
      expect(roles).toContain('USER');
    });
  });

  describe('Edge Cases', () => {
    it('should handle user with no roles', async () => {
      const roles = await service.getUserRoles('no-roles-user', tenantId);
      expect(roles).toHaveLength(0);
    });

    it('should handle user with no permissions', async () => {
      const permissions = await service.getUserPermissions('no-perms-user', tenantId);
      expect(permissions).toHaveLength(0);
    });

    it('should replace duplicate role assignment', async () => {
      const userRole = await service.getRoleByName('USER');
      await service.assignRole(userId, userRole!.id, tenantId, adminId);
      await service.assignRole(userId, userRole!.id, tenantId, 'another-admin');

      const assignments = await service.getUserRoleAssignments(userId, tenantId);
      const roleAssignments = assignments.filter(a => a.roleId === userRole!.id);
      expect(roleAssignments).toHaveLength(1);
      expect(roleAssignments[0].assignedBy).toBe('another-admin');
    });
  });
});
