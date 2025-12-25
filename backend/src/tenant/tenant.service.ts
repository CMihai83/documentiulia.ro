import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrgRole } from '@prisma/client';

export interface TenantContext {
  organizationId: string;
  userId: string;
  orgRole: OrgRole;
}

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get user's organization memberships
   */
  async getUserOrganizations(userId: string) {
    return this.prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            cui: true,
            tier: true,
          },
        },
      },
    });
  }

  /**
   * Get user's membership in a specific organization
   */
  async getUserMembership(userId: string, organizationId: string) {
    return this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            cui: true,
            tier: true,
          },
        },
      },
    });
  }

  /**
   * Validate user has access to organization
   */
  async validateOrganizationAccess(
    userId: string,
    organizationId: string,
    requiredRoles?: OrgRole[],
  ): Promise<TenantContext> {
    const membership = await this.getUserMembership(userId, organizationId);

    if (!membership) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(membership.role)) {
        throw new ForbiddenException(
          `Required organization role: ${requiredRoles.join(' or ')}. You have: ${membership.role}`,
        );
      }
    }

    return {
      organizationId,
      userId,
      orgRole: membership.role,
    };
  }

  /**
   * Get organization by ID with validation
   */
  async getOrganization(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org;
  }

  /**
   * Create a new organization
   */
  async createOrganization(
    userId: string,
    data: {
      name: string;
      cui: string;
      address?: string;
      email?: string;
      phone?: string;
    },
  ) {
    // Generate slug from name
    const baseSlug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const uniqueSuffix = Date.now().toString(36);
    const slug = `${baseSlug}-${uniqueSuffix}`;

    // Create organization and add user as owner
    const org = await this.prisma.organization.create({
      data: {
        ...data,
        slug,
        members: {
          create: {
            userId,
            role: OrgRole.OWNER,
          },
        },
      },
      include: {
        members: true,
      },
    });

    return org;
  }

  /**
   * Add member to organization
   */
  async addMember(
    organizationId: string,
    userId: string,
    role: OrgRole = OrgRole.MEMBER,
  ) {
    return this.prisma.organizationMember.create({
      data: {
        organizationId,
        userId,
        role,
      },
    });
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    organizationId: string,
    userId: string,
    role: OrgRole,
  ) {
    return this.prisma.organizationMember.update({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      data: { role },
    });
  }

  /**
   * Remove member from organization
   */
  async removeMember(organizationId: string, userId: string) {
    return this.prisma.organizationMember.delete({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });
  }

  /**
   * Get organization members
   */
  async getOrganizationMembers(organizationId: string) {
    return this.prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Switch user's active organization
   * This doesn't persist - it's handled per-request via header
   */
  async switchOrganization(userId: string, organizationId: string) {
    const membership = await this.getUserMembership(userId, organizationId);

    if (!membership) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    return membership;
  }

  /**
   * Check if user can perform action based on org role
   */
  canPerformAction(userRole: OrgRole, requiredRoles: OrgRole[]): boolean {
    return requiredRoles.includes(userRole);
  }

  /**
   * Get role hierarchy level (higher = more permissions)
   */
  getRoleLevel(role: OrgRole): number {
    const levels: Record<OrgRole, number> = {
      [OrgRole.OWNER]: 100,
      [OrgRole.ADMIN]: 80,
      [OrgRole.ACCOUNTANT]: 60,
      [OrgRole.MEMBER]: 40,
      [OrgRole.VIEWER]: 20,
    };
    return levels[role] || 0;
  }

  /**
   * Check if user has at least the required role level
   */
  hasMinimumRole(userRole: OrgRole, minimumRole: OrgRole): boolean {
    return this.getRoleLevel(userRole) >= this.getRoleLevel(minimumRole);
  }
}
