import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { OrgRole } from '@prisma/client';

/**
 * Decorator to extract the current organization from request
 * Usage: @CurrentOrg() org: OrganizationContext
 */
export const CurrentOrg = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.organization;
  },
);

/**
 * Decorator to get current organization ID
 * Usage: @CurrentOrgId() orgId: string
 */
export const CurrentOrgId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest();
    return request.organization?.id || null;
  },
);

/**
 * Decorator to get user's role in current organization
 * Usage: @CurrentOrgRole() role: OrgRole
 */
export const CurrentOrgRole = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): OrgRole | null => {
    const request = ctx.switchToHttp().getRequest();
    return request.orgMembership?.role || null;
  },
);

/**
 * Key for organization roles metadata
 */
export const ORG_ROLES_KEY = 'org_roles';

/**
 * Decorator to require specific organization roles
 * Usage: @OrgRoles(OrgRole.OWNER, OrgRole.ADMIN)
 */
export const OrgRoles = (...roles: OrgRole[]) => SetMetadata(ORG_ROLES_KEY, roles);

/**
 * Key for tenant scope metadata - indicates if endpoint is tenant-scoped
 */
export const TENANT_SCOPE_KEY = 'tenant_scope';

/**
 * Decorator to mark endpoint as tenant-scoped
 * Usage: @TenantScope() on controller methods that require tenant context
 */
export const TenantScope = () => SetMetadata(TENANT_SCOPE_KEY, true);

/**
 * Key for optional tenant scope metadata
 */
export const OPTIONAL_TENANT_KEY = 'optional_tenant';

/**
 * Decorator to mark tenant scope as optional (will use org if available)
 * Usage: @OptionalTenant() on controller methods that can work with or without tenant
 */
export const OptionalTenant = () => SetMetadata(OPTIONAL_TENANT_KEY, true);

/**
 * Interface for organization context attached to request
 */
export interface OrganizationContext {
  id: string;
  name: string;
  cui: string;
  tier: string;
}

/**
 * Interface for organization membership attached to request
 */
export interface OrgMembershipContext {
  id: string;
  userId: string;
  organizationId: string;
  role: OrgRole;
}
