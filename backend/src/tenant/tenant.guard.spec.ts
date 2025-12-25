import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantGuard, OrgRolesGuard, ORG_HEADER } from './tenant.guard';
import { TenantService } from './tenant.service';
import { OrgRole } from '@prisma/client';
import { TENANT_SCOPE_KEY, OPTIONAL_TENANT_KEY, ORG_ROLES_KEY } from './tenant.decorator';

describe('TenantGuard', () => {
  let guard: TenantGuard;
  let reflector: Reflector;
  let tenantService: TenantService;

  const mockTenantService = {
    validateOrganizationAccess: jest.fn(),
    getOrganization: jest.fn(),
    getUserMembership: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const mockUser = { id: 'user-123', email: 'test@test.com' };
  const mockOrganization = { id: 'org-456', name: 'Test Company', cui: 'RO12345678' };
  const mockMembership = { userId: 'user-123', organizationId: 'org-456', role: OrgRole.ADMIN };
  const mockTenantContext = { organizationId: 'org-456', userId: 'user-123', orgRole: OrgRole.ADMIN };

  const createMockExecutionContext = (options: {
    user?: any;
    headers?: Record<string, string>;
  }): ExecutionContext => {
    const mockRequest = {
      user: options.user,
      headers: options.headers || {},
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: TenantService, useValue: mockTenantService },
      ],
    }).compile();

    guard = module.get<TenantGuard>(TenantGuard);
    reflector = module.get<Reflector>(Reflector);
    tenantService = module.get<TenantService>(TenantService);

    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow access for non-tenant-scoped routes without org roles', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(undefined);

      const context = createMockExecutionContext({ user: mockUser });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should require authentication for tenant-scoped routes', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(true) // isTenantScoped
        .mockReturnValueOnce(false) // isOptionalTenant
        .mockReturnValueOnce(undefined); // requiredOrgRoles

      const context = createMockExecutionContext({ user: null });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should require organization header for tenant-scoped routes', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(true) // isTenantScoped
        .mockReturnValueOnce(false) // isOptionalTenant
        .mockReturnValueOnce(undefined); // requiredOrgRoles

      const context = createMockExecutionContext({ user: mockUser });

      await expect(guard.canActivate(context)).rejects.toThrow(BadRequestException);
    });

    it('should allow optional tenant routes without organization header', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(true) // isTenantScoped
        .mockReturnValueOnce(true) // isOptionalTenant
        .mockReturnValueOnce(undefined); // requiredOrgRoles

      const context = createMockExecutionContext({ user: mockUser });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should validate organization access and attach context', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(true) // isTenantScoped
        .mockReturnValueOnce(false) // isOptionalTenant
        .mockReturnValueOnce(undefined); // requiredOrgRoles

      mockTenantService.validateOrganizationAccess.mockResolvedValue(mockTenantContext);
      mockTenantService.getOrganization.mockResolvedValue(mockOrganization);
      mockTenantService.getUserMembership.mockResolvedValue(mockMembership);

      const context = createMockExecutionContext({
        user: mockUser,
        headers: { [ORG_HEADER]: 'org-456' },
      });

      const result = await guard.canActivate(context);
      const request = context.switchToHttp().getRequest();

      expect(result).toBe(true);
      expect(request.organization).toEqual(mockOrganization);
      expect(request.orgMembership).toEqual(mockMembership);
      expect(request.tenantContext).toEqual(mockTenantContext);
    });

    it('should throw ForbiddenException when user has no access to organization', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(true) // isTenantScoped
        .mockReturnValueOnce(false) // isOptionalTenant
        .mockReturnValueOnce(undefined); // requiredOrgRoles

      mockTenantService.validateOrganizationAccess.mockRejectedValue(
        new ForbiddenException('You do not have access to this organization'),
      );

      const context = createMockExecutionContext({
        user: mockUser,
        headers: { [ORG_HEADER]: 'invalid-org' },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should validate organization roles when specified', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(true) // isTenantScoped
        .mockReturnValueOnce(false) // isOptionalTenant
        .mockReturnValueOnce([OrgRole.OWNER, OrgRole.ADMIN]); // requiredOrgRoles

      mockTenantService.validateOrganizationAccess.mockResolvedValue(mockTenantContext);
      mockTenantService.getOrganization.mockResolvedValue(mockOrganization);
      mockTenantService.getUserMembership.mockResolvedValue(mockMembership);

      const context = createMockExecutionContext({
        user: mockUser,
        headers: { [ORG_HEADER]: 'org-456' },
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockTenantService.validateOrganizationAccess).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        [OrgRole.OWNER, OrgRole.ADMIN],
      );
    });
  });
});

describe('OrgRolesGuard', () => {
  let guard: OrgRolesGuard;
  let reflector: Reflector;
  let tenantService: TenantService;

  const mockTenantService = {};
  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const mockUser = { id: 'user-123', email: 'test@test.com' };
  const mockMembership = { userId: 'user-123', organizationId: 'org-456', role: OrgRole.MEMBER };

  const createMockExecutionContext = (options: {
    user?: any;
    orgMembership?: any;
  }): ExecutionContext => {
    const mockRequest = {
      user: options.user,
      orgMembership: options.orgMembership,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrgRolesGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: TenantService, useValue: mockTenantService },
      ],
    }).compile();

    guard = module.get<OrgRolesGuard>(OrgRolesGuard);
    reflector = module.get<Reflector>(Reflector);
    tenantService = module.get<TenantService>(TenantService);

    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow access when no roles are required', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(undefined);

      const context = createMockExecutionContext({
        user: mockUser,
        orgMembership: mockMembership,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user has required role', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([OrgRole.MEMBER, OrgRole.ADMIN]);

      const context = createMockExecutionContext({
        user: mockUser,
        orgMembership: mockMembership,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user is not authenticated', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([OrgRole.ADMIN]);

      const context = createMockExecutionContext({
        user: null,
        orgMembership: mockMembership,
      });

      await expect(guard.canActivate(context)).rejects.toThrow('User not authenticated');
    });

    it('should throw ForbiddenException when organization context is missing', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([OrgRole.ADMIN]);

      const context = createMockExecutionContext({
        user: mockUser,
        orgMembership: null,
      });

      await expect(guard.canActivate(context)).rejects.toThrow('Organization context required');
    });

    it('should throw ForbiddenException when user does not have required role', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([OrgRole.OWNER, OrgRole.ADMIN]);

      const context = createMockExecutionContext({
        user: mockUser,
        orgMembership: { ...mockMembership, role: OrgRole.VIEWER },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        'Access denied. Required organization roles: OWNER, ADMIN',
      );
    });

    it('should allow OWNER to access ADMIN routes', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([OrgRole.OWNER, OrgRole.ADMIN]);

      const context = createMockExecutionContext({
        user: mockUser,
        orgMembership: { ...mockMembership, role: OrgRole.OWNER },
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});
