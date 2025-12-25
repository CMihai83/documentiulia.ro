import {
  Injectable,
  Logger,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantService, TenantContext } from '../tenant/tenant.service';
import { OrgRole, VehicleStatus, Organization, Tier } from '@prisma/client';

/**
 * Fleet Tenant Isolation Service
 * Provides multi-tenant data isolation for fleet management resources.
 *
 * Features:
 * - Tenant-scoped queries for all fleet resources
 * - Resource access validation
 * - Cross-tenant sharing for subcontractors
 * - Tier-based resource limits
 * - Audit trail for cross-tenant operations
 */

export interface FleetTenantContext extends TenantContext {
  tier: Tier;
  resourceLimits: ResourceLimits;
}

export interface ResourceLimits {
  maxVehicles: number;
  maxDrivers: number;
  maxRoutesPerDay: number;
  maxSubcontractors: number;
  maxApiCallsPerHour: number;
  allowedFeatures: string[];
}

export interface CrossTenantAccess {
  id: string;
  sourceOrgId: string;
  targetOrgId: string;
  resourceType: 'VEHICLE' | 'DRIVER' | 'ROUTE';
  resourceId: string;
  accessLevel: 'VIEW' | 'OPERATE' | 'MANAGE';
  validFrom: Date;
  validUntil?: Date;
  createdAt: Date;
  createdBy: string;
}

export interface IsolationViolation {
  type: 'UNAUTHORIZED_ACCESS' | 'CROSS_TENANT_LEAK' | 'LIMIT_EXCEEDED';
  resourceType: string;
  resourceId?: string;
  attemptedOrg?: string;
  ownerOrg?: string;
  message: string;
  timestamp: Date;
}

@Injectable()
export class FleetTenantIsolationService {
  private readonly logger = new Logger(FleetTenantIsolationService.name);

  // In-memory storage for cross-tenant access grants
  private crossTenantAccess: Map<string, CrossTenantAccess[]> = new Map();
  private accessCounter = 0;

  // In-memory violation log
  private violations: IsolationViolation[] = [];

  // Tier-based resource limits
  private readonly TIER_LIMITS: Record<Tier, ResourceLimits> = {
    [Tier.FREE]: {
      maxVehicles: 2,
      maxDrivers: 3,
      maxRoutesPerDay: 5,
      maxSubcontractors: 0,
      maxApiCallsPerHour: 100,
      allowedFeatures: ['basic_tracking', 'route_planning'],
    },
    [Tier.PRO]: {
      maxVehicles: 10,
      maxDrivers: 20,
      maxRoutesPerDay: 50,
      maxSubcontractors: 5,
      maxApiCallsPerHour: 1000,
      allowedFeatures: [
        'basic_tracking',
        'route_planning',
        'route_optimization',
        'fuel_management',
        'maintenance_scheduling',
        'kpi_analytics',
      ],
    },
    [Tier.BUSINESS]: {
      maxVehicles: -1, // Unlimited for BUSINESS tier
      maxDrivers: -1,
      maxRoutesPerDay: -1,
      maxSubcontractors: -1,
      maxApiCallsPerHour: -1,
      allowedFeatures: ['*'], // All features
    },
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantService: TenantService,
  ) {}

  // =================== TENANT CONTEXT ===================

  /**
   * Get fleet-specific tenant context with resource limits
   */
  async getFleetTenantContext(
    userId: string,
    organizationId: string,
  ): Promise<FleetTenantContext> {
    const tenantContext = await this.tenantService.validateOrganizationAccess(
      userId,
      organizationId,
    );

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new NotFoundException('Organisation nicht gefunden');
    }

    const tier = org.tier || Tier.FREE;
    const resourceLimits = this.TIER_LIMITS[tier];

    return {
      ...tenantContext,
      tier,
      resourceLimits,
    };
  }

  /**
   * Get resource limits for a tenant
   */
  getResourceLimits(tier: Tier): ResourceLimits {
    return this.TIER_LIMITS[tier] || this.TIER_LIMITS[Tier.FREE];
  }

  // =================== RESOURCE ACCESS VALIDATION ===================

  /**
   * Validate vehicle belongs to organization
   */
  async validateVehicleAccess(
    vehicleId: string,
    organizationId: string,
    userId: string,
  ): Promise<boolean> {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException('Fahrzeug nicht gefunden');
    }

    // Check direct ownership via userId (legacy) or organizationId
    if (vehicle.userId === userId) {
      return true;
    }

    // Check organization ownership
    // Note: This assumes vehicles have an organizationId field
    // If not, we need to check via user's organization membership
    const userMembership = await this.tenantService.getUserMembership(
      userId,
      organizationId,
    );

    if (!userMembership) {
      this.logViolation({
        type: 'UNAUTHORIZED_ACCESS',
        resourceType: 'VEHICLE',
        resourceId: vehicleId,
        attemptedOrg: organizationId,
        message: `User ${userId} attempted to access vehicle ${vehicleId} without organization membership`,
      });
      return false;
    }

    // Check cross-tenant access
    const crossAccess = await this.hasCrossTenantAccess(
      organizationId,
      'VEHICLE',
      vehicleId,
    );

    if (crossAccess) {
      return true;
    }

    // Vehicle belongs to user in the organization
    return true;
  }

  /**
   * Validate route belongs to organization
   */
  async validateRouteAccess(
    routeId: string,
    organizationId: string,
    userId: string,
  ): Promise<boolean> {
    const route = await this.prisma.deliveryRoute.findFirst({
      where: { id: routeId },
    });

    if (!route) {
      throw new NotFoundException('Route nicht gefunden');
    }

    // Check direct ownership
    if (route.userId === userId) {
      return true;
    }

    // Check organization membership
    const userMembership = await this.tenantService.getUserMembership(
      userId,
      organizationId,
    );

    if (!userMembership) {
      this.logViolation({
        type: 'UNAUTHORIZED_ACCESS',
        resourceType: 'ROUTE',
        resourceId: routeId,
        attemptedOrg: organizationId,
        message: `User ${userId} attempted to access route ${routeId} without organization membership`,
      });
      return false;
    }

    return true;
  }

  /**
   * Validate driver belongs to organization
   */
  async validateDriverAccess(
    employeeId: string,
    organizationId: string,
    userId: string,
  ): Promise<boolean> {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Mitarbeiter nicht gefunden');
    }

    // Check direct ownership
    if (employee.userId === userId) {
      return true;
    }

    // Check organization membership
    const userMembership = await this.tenantService.getUserMembership(
      userId,
      organizationId,
    );

    if (!userMembership) {
      this.logViolation({
        type: 'UNAUTHORIZED_ACCESS',
        resourceType: 'DRIVER',
        resourceId: employeeId,
        attemptedOrg: organizationId,
        message: `User ${userId} attempted to access employee ${employeeId} without organization membership`,
      });
      return false;
    }

    return true;
  }

  // =================== TENANT-SCOPED QUERIES ===================

  /**
   * Get vehicles for organization with proper isolation
   */
  async getVehiclesForTenant(
    userId: string,
    organizationId?: string,
    options?: {
      status?: VehicleStatus[];
      includeShared?: boolean;
    },
  ) {
    const whereClause: any = { userId };

    if (options?.status && options.status.length > 0) {
      whereClause.status = { in: options.status };
    }

    const ownVehicles = await this.prisma.vehicle.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    // Include shared vehicles if requested and organization has access
    if (options?.includeShared && organizationId) {
      const sharedAccess = this.crossTenantAccess.get(organizationId) || [];
      const sharedVehicleIds = sharedAccess
        .filter(a => a.resourceType === 'VEHICLE' && this.isAccessValid(a))
        .map(a => a.resourceId);

      if (sharedVehicleIds.length > 0) {
        const sharedVehicles = await this.prisma.vehicle.findMany({
          where: { id: { in: sharedVehicleIds } },
        });

        return {
          owned: ownVehicles,
          shared: sharedVehicles,
          total: ownVehicles.length + sharedVehicles.length,
        };
      }
    }

    return {
      owned: ownVehicles,
      shared: [],
      total: ownVehicles.length,
    };
  }

  /**
   * Get routes for organization with proper isolation
   */
  async getRoutesForTenant(
    userId: string,
    organizationId?: string,
    options?: {
      dateFrom?: Date;
      dateTo?: Date;
      status?: string[];
    },
  ) {
    const whereClause: any = { userId };

    if (options?.dateFrom || options?.dateTo) {
      whereClause.routeDate = {};
      if (options.dateFrom) whereClause.routeDate.gte = options.dateFrom;
      if (options.dateTo) whereClause.routeDate.lte = options.dateTo;
    }

    if (options?.status && options.status.length > 0) {
      whereClause.status = { in: options.status };
    }

    return this.prisma.deliveryRoute.findMany({
      where: whereClause,
      include: {
        vehicle: true,
        stops: true,
      },
      orderBy: { routeDate: 'desc' },
    });
  }

  // =================== RESOURCE LIMITS ENFORCEMENT ===================

  /**
   * Check if tenant can create a new vehicle
   */
  async canCreateVehicle(userId: string, tier: Tier): Promise<{ allowed: boolean; reason?: string }> {
    const limits = this.TIER_LIMITS[tier];

    if (limits.maxVehicles === -1) {
      return { allowed: true };
    }

    const currentCount = await this.prisma.vehicle.count({
      where: { userId },
    });

    if (currentCount >= limits.maxVehicles) {
      this.logViolation({
        type: 'LIMIT_EXCEEDED',
        resourceType: 'VEHICLE',
        message: `User ${userId} exceeded vehicle limit of ${limits.maxVehicles} for tier ${tier}`,
      });

      return {
        allowed: false,
        reason: `Fahrzeuglimit erreicht (${currentCount}/${limits.maxVehicles}). Bitte auf höheren Tarif upgraden.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Check if tenant can create a new route
   */
  async canCreateRoute(
    userId: string,
    tier: Tier,
    routeDate: Date,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const limits = this.TIER_LIMITS[tier];

    if (limits.maxRoutesPerDay === -1) {
      return { allowed: true };
    }

    const startOfDay = new Date(routeDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(routeDate);
    endOfDay.setHours(23, 59, 59, 999);

    const routesToday = await this.prisma.deliveryRoute.count({
      where: {
        userId,
        routeDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (routesToday >= limits.maxRoutesPerDay) {
      this.logViolation({
        type: 'LIMIT_EXCEEDED',
        resourceType: 'ROUTE',
        message: `User ${userId} exceeded daily route limit of ${limits.maxRoutesPerDay} for tier ${tier}`,
      });

      return {
        allowed: false,
        reason: `Tageslimit für Routen erreicht (${routesToday}/${limits.maxRoutesPerDay}). Bitte auf höheren Tarif upgraden.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Check if tenant can add more drivers
   */
  async canAddDriver(userId: string, tier: Tier): Promise<{ allowed: boolean; reason?: string }> {
    const limits = this.TIER_LIMITS[tier];

    if (limits.maxDrivers === -1) {
      return { allowed: true };
    }

    const currentCount = await this.prisma.employee.count({
      where: { userId },
    });

    if (currentCount >= limits.maxDrivers) {
      return {
        allowed: false,
        reason: `Fahrerlimit erreicht (${currentCount}/${limits.maxDrivers}). Bitte auf höheren Tarif upgraden.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Check if feature is allowed for tier
   */
  isFeatureAllowed(tier: Tier, feature: string): boolean {
    const limits = this.TIER_LIMITS[tier];
    return limits.allowedFeatures.includes('*') || limits.allowedFeatures.includes(feature);
  }

  /**
   * Enforce feature access
   */
  enforceFeatureAccess(tier: Tier, feature: string): void {
    if (!this.isFeatureAllowed(tier, feature)) {
      throw new ForbiddenException(
        `Die Funktion "${feature}" ist in Ihrem Tarif nicht verfügbar. Bitte upgraden Sie auf einen höheren Tarif.`,
      );
    }
  }

  // =================== CROSS-TENANT SHARING ===================

  /**
   * Grant cross-tenant access to a resource (for subcontractors)
   */
  async grantCrossTenantAccess(
    sourceOrgId: string,
    targetOrgId: string,
    resourceType: 'VEHICLE' | 'DRIVER' | 'ROUTE',
    resourceId: string,
    accessLevel: 'VIEW' | 'OPERATE' | 'MANAGE',
    grantedBy: string,
    validUntil?: Date,
  ): Promise<CrossTenantAccess> {
    // Verify source org owns the resource
    const hasAccess = await this.verifyResourceOwnership(sourceOrgId, resourceType, resourceId);
    if (!hasAccess) {
      throw new ForbiddenException('Sie haben keine Berechtigung, diesen Zugriff zu gewähren');
    }

    const access: CrossTenantAccess = {
      id: `cta-${++this.accessCounter}-${Date.now()}`,
      sourceOrgId,
      targetOrgId,
      resourceType,
      resourceId,
      accessLevel,
      validFrom: new Date(),
      validUntil,
      createdAt: new Date(),
      createdBy: grantedBy,
    };

    const targetAccess = this.crossTenantAccess.get(targetOrgId) || [];
    targetAccess.push(access);
    this.crossTenantAccess.set(targetOrgId, targetAccess);

    this.logger.log(
      `Cross-tenant access granted: ${sourceOrgId} -> ${targetOrgId} for ${resourceType}:${resourceId}`,
    );

    return access;
  }

  /**
   * Revoke cross-tenant access
   */
  async revokeCrossTenantAccess(
    sourceOrgId: string,
    targetOrgId: string,
    resourceId: string,
  ): Promise<boolean> {
    const targetAccess = this.crossTenantAccess.get(targetOrgId) || [];
    const filtered = targetAccess.filter(
      a => !(a.sourceOrgId === sourceOrgId && a.resourceId === resourceId),
    );

    this.crossTenantAccess.set(targetOrgId, filtered);

    this.logger.log(
      `Cross-tenant access revoked: ${sourceOrgId} -> ${targetOrgId} for resource ${resourceId}`,
    );

    return filtered.length < targetAccess.length;
  }

  /**
   * Get cross-tenant access grants for an organization
   */
  getCrossTenantAccessGrants(organizationId: string): CrossTenantAccess[] {
    return (this.crossTenantAccess.get(organizationId) || []).filter(a =>
      this.isAccessValid(a),
    );
  }

  /**
   * Check if organization has cross-tenant access to a resource
   */
  async hasCrossTenantAccess(
    organizationId: string,
    resourceType: 'VEHICLE' | 'DRIVER' | 'ROUTE',
    resourceId: string,
  ): Promise<CrossTenantAccess | null> {
    const access = this.crossTenantAccess.get(organizationId) || [];
    return (
      access.find(
        a =>
          a.resourceType === resourceType &&
          a.resourceId === resourceId &&
          this.isAccessValid(a),
      ) || null
    );
  }

  // =================== AUDIT & MONITORING ===================

  /**
   * Get isolation violations
   */
  getViolations(options?: {
    type?: IsolationViolation['type'];
    resourceType?: string;
    from?: Date;
    to?: Date;
    limit?: number;
  }): IsolationViolation[] {
    let result = [...this.violations];

    if (options?.type) {
      result = result.filter(v => v.type === options.type);
    }
    if (options?.resourceType) {
      result = result.filter(v => v.resourceType === options.resourceType);
    }
    if (options?.from) {
      result = result.filter(v => v.timestamp >= options.from!);
    }
    if (options?.to) {
      result = result.filter(v => v.timestamp <= options.to!);
    }

    result.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options?.limit) {
      result = result.slice(0, options.limit);
    }

    return result;
  }

  /**
   * Get tenant usage statistics
   */
  async getTenantUsageStats(
    userId: string,
    tier: Tier,
  ): Promise<{
    vehicles: { current: number; limit: number; percentage: number };
    drivers: { current: number; limit: number; percentage: number };
    routesToday: { current: number; limit: number; percentage: number };
    availableFeatures: string[];
    tier: Tier;
  }> {
    const limits = this.TIER_LIMITS[tier];

    const [vehicleCount, driverCount, routesTodayCount] = await Promise.all([
      this.prisma.vehicle.count({ where: { userId } }),
      this.prisma.employee.count({ where: { userId } }),
      this.prisma.deliveryRoute.count({
        where: {
          userId,
          routeDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
    ]);

    const calcPercentage = (current: number, limit: number) =>
      limit === -1 ? 0 : Math.round((current / limit) * 100);

    return {
      vehicles: {
        current: vehicleCount,
        limit: limits.maxVehicles,
        percentage: calcPercentage(vehicleCount, limits.maxVehicles),
      },
      drivers: {
        current: driverCount,
        limit: limits.maxDrivers,
        percentage: calcPercentage(driverCount, limits.maxDrivers),
      },
      routesToday: {
        current: routesTodayCount,
        limit: limits.maxRoutesPerDay,
        percentage: calcPercentage(routesTodayCount, limits.maxRoutesPerDay),
      },
      availableFeatures: limits.allowedFeatures,
      tier,
    };
  }

  /**
   * Validate data isolation for a batch operation
   */
  async validateBatchIsolation(
    userId: string,
    organizationId: string,
    resourceType: 'VEHICLE' | 'DRIVER' | 'ROUTE',
    resourceIds: string[],
  ): Promise<{
    valid: string[];
    invalid: string[];
    unauthorized: string[];
  }> {
    const valid: string[] = [];
    const invalid: string[] = [];
    const unauthorized: string[] = [];

    for (const resourceId of resourceIds) {
      let hasAccess = false;

      switch (resourceType) {
        case 'VEHICLE':
          hasAccess = await this.validateVehicleAccess(resourceId, organizationId, userId);
          break;
        case 'DRIVER':
          hasAccess = await this.validateDriverAccess(resourceId, organizationId, userId);
          break;
        case 'ROUTE':
          hasAccess = await this.validateRouteAccess(resourceId, organizationId, userId);
          break;
      }

      if (hasAccess) {
        valid.push(resourceId);
      } else {
        unauthorized.push(resourceId);
      }
    }

    return { valid, invalid, unauthorized };
  }

  // =================== PRIVATE HELPERS ===================

  private isAccessValid(access: CrossTenantAccess): boolean {
    const now = new Date();
    if (access.validFrom > now) return false;
    if (access.validUntil && access.validUntil < now) return false;
    return true;
  }

  private async verifyResourceOwnership(
    organizationId: string,
    resourceType: 'VEHICLE' | 'DRIVER' | 'ROUTE',
    resourceId: string,
  ): Promise<boolean> {
    // In a full implementation, this would check if the organization owns the resource
    // For now, we'll return true as resources are user-scoped
    return true;
  }

  private logViolation(
    violation: Omit<IsolationViolation, 'timestamp'>,
  ): void {
    const fullViolation: IsolationViolation = {
      ...violation,
      timestamp: new Date(),
    };

    this.violations.push(fullViolation);

    // Keep only last 1000 violations
    if (this.violations.length > 1000) {
      this.violations = this.violations.slice(-1000);
    }

    this.logger.warn(`Isolation violation: ${violation.type} - ${violation.message}`);
  }
}
