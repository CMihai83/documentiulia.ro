import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrgRole } from '@prisma/client';
import { TenantService } from './tenant.service';
import {
  ORG_ROLES_KEY,
  TENANT_SCOPE_KEY,
  OPTIONAL_TENANT_KEY,
} from './tenant.decorator';

/**
 * Header name for organization ID
 */
export const ORG_HEADER = 'x-organization-id';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private tenantService: TenantService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Check if route is tenant-scoped
    const isTenantScoped = this.reflector.getAllAndOverride<boolean>(
      TENANT_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Check if tenant is optional for this route
    const isOptionalTenant = this.reflector.getAllAndOverride<boolean>(
      OPTIONAL_TENANT_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Get required organization roles
    const requiredOrgRoles = this.reflector.getAllAndOverride<OrgRole[]>(
      ORG_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If not tenant-scoped and no org roles required, allow access
    if (!isTenantScoped && (!requiredOrgRoles || requiredOrgRoles.length === 0)) {
      return true;
    }

    // User must be authenticated
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Get organization ID from header
    const organizationId = request.headers[ORG_HEADER];

    // If no org ID and not optional, require it
    if (!organizationId) {
      if (isTenantScoped && !isOptionalTenant) {
        throw new BadRequestException(
          `Organization ID required. Please provide ${ORG_HEADER} header.`,
        );
      }
      // Optional tenant - allow without org context
      return true;
    }

    // Validate user has access to the organization
    try {
      const tenantContext = await this.tenantService.validateOrganizationAccess(
        user.id,
        organizationId,
        requiredOrgRoles,
      );

      // Get full organization info
      const organization = await this.tenantService.getOrganization(organizationId);
      const membership = await this.tenantService.getUserMembership(
        user.id,
        organizationId,
      );

      // Attach tenant context to request
      request.organization = organization;
      request.orgMembership = membership;
      request.tenantContext = tenantContext;

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new ForbiddenException('Invalid organization access');
    }
  }
}

/**
 * Guard specifically for organization role checks
 * Use this when you need org role validation but not full tenant scope
 */
@Injectable()
export class OrgRolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private tenantService: TenantService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<OrgRole[]>(
      ORG_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const orgMembership = request.orgMembership;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!orgMembership) {
      throw new ForbiddenException('Organization context required');
    }

    const hasRole = requiredRoles.includes(orgMembership.role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required organization roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
