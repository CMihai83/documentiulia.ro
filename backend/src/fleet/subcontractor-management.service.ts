import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Subcontractor Management Service
 * Manages subcontractors for overflow delivery capacity.
 *
 * Features:
 * - Subcontractor registration and profiles
 * - Capacity tracking (vehicles, drivers, zones)
 * - Route assignment to subcontractors
 * - Performance metrics and ratings
 * - Payment tracking
 * - Contract management
 *
 * Supports Munich delivery fleet outsourcing needs.
 */

export type SubcontractorStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_APPROVAL';

export interface Subcontractor {
  id: string;
  userId: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  address: {
    street: string;
    postalCode: string;
    city: string;
  };
  taxId: string | null;
  status: SubcontractorStatus;
  capacity: SubcontractorCapacity;
  rates: SubcontractorRates;
  serviceZones: string[];
  contractStart: Date | null;
  contractEnd: Date | null;
  rating: number;
  totalRoutes: number;
  totalDeliveries: number;
  createdAt: Date;
}

export interface SubcontractorCapacity {
  totalVehicles: number;
  availableVehicles: number;
  totalDrivers: number;
  availableDrivers: number;
  maxDailyRoutes: number;
  maxDailyDeliveries: number;
}

export interface SubcontractorRates {
  perDelivery: number;
  perKilometer: number;
  minimumDaily: number;
  currency: string;
}

export interface SubcontractorAssignment {
  id: string;
  subcontractorId: string;
  routeId: string;
  assignedAt: Date;
  status: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  deliveryCount: number;
  distanceKm: number;
  agreedRate: number;
  actualCost: number | null;
  completedAt: Date | null;
  notes: string | null;
}

export interface SubcontractorPerformance {
  subcontractorId: string;
  period: { from: Date; to: Date };
  totalRoutes: number;
  completedRoutes: number;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  onTimeRate: number;
  successRate: number;
  avgDeliveriesPerRoute: number;
  totalCost: number;
  avgCostPerDelivery: number;
  rating: number;
}

@Injectable()
export class SubcontractorManagementService {
  private readonly logger = new Logger(SubcontractorManagementService.name);

  // In-memory storage (in production, add to Prisma schema)
  private subcontractors: Map<string, Subcontractor> = new Map();
  private assignments: Map<string, SubcontractorAssignment> = new Map();
  private subcontractorIdCounter = 1;
  private assignmentIdCounter = 1;

  constructor(private readonly prisma: PrismaService) {}

  // =================== SUBCONTRACTOR MANAGEMENT ===================

  /**
   * Register a new subcontractor
   */
  async registerSubcontractor(
    userId: string,
    data: {
      companyName: string;
      contactName: string;
      email: string;
      phone: string;
      address: { street: string; postalCode: string; city: string };
      taxId?: string;
      capacity: SubcontractorCapacity;
      rates: SubcontractorRates;
      serviceZones: string[];
    },
  ): Promise<Subcontractor> {
    this.logger.log(`Registering subcontractor: ${data.companyName}`);

    // Check for duplicate email
    for (const sub of this.subcontractors.values()) {
      if (sub.email === data.email) {
        throw new BadRequestException(`Subcontractor with email ${data.email} already exists`);
      }
    }

    const subcontractor: Subcontractor = {
      id: `sub-${this.subcontractorIdCounter++}`,
      userId,
      companyName: data.companyName,
      contactName: data.contactName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      taxId: data.taxId || null,
      status: 'PENDING_APPROVAL',
      capacity: data.capacity,
      rates: data.rates,
      serviceZones: data.serviceZones,
      contractStart: null,
      contractEnd: null,
      rating: 0,
      totalRoutes: 0,
      totalDeliveries: 0,
      createdAt: new Date(),
    };

    this.subcontractors.set(subcontractor.id, subcontractor);
    this.logger.log(`Subcontractor ${subcontractor.id} registered: ${data.companyName}`);

    return subcontractor;
  }

  /**
   * Get all subcontractors
   */
  async getSubcontractors(
    userId: string,
    options: {
      status?: SubcontractorStatus;
      zone?: string;
    } = {},
  ): Promise<Subcontractor[]> {
    let subs = Array.from(this.subcontractors.values()).filter(
      s => s.userId === userId,
    );

    if (options.status) {
      subs = subs.filter(s => s.status === options.status);
    }
    if (options.zone) {
      subs = subs.filter(s => s.serviceZones.includes(options.zone!));
    }

    return subs.sort((a, b) => b.rating - a.rating);
  }

  /**
   * Get subcontractor by ID
   */
  async getSubcontractor(subcontractorId: string): Promise<Subcontractor> {
    const sub = this.subcontractors.get(subcontractorId);
    if (!sub) {
      throw new NotFoundException(`Subcontractor ${subcontractorId} not found`);
    }
    return sub;
  }

  /**
   * Update subcontractor
   */
  async updateSubcontractor(
    subcontractorId: string,
    data: Partial<{
      contactName: string;
      email: string;
      phone: string;
      address: { street: string; postalCode: string; city: string };
      capacity: SubcontractorCapacity;
      rates: SubcontractorRates;
      serviceZones: string[];
    }>,
  ): Promise<Subcontractor> {
    const sub = await this.getSubcontractor(subcontractorId);

    if (data.contactName) sub.contactName = data.contactName;
    if (data.email) sub.email = data.email;
    if (data.phone) sub.phone = data.phone;
    if (data.address) sub.address = data.address;
    if (data.capacity) sub.capacity = data.capacity;
    if (data.rates) sub.rates = data.rates;
    if (data.serviceZones) sub.serviceZones = data.serviceZones;

    this.subcontractors.set(subcontractorId, sub);
    return sub;
  }

  /**
   * Approve subcontractor
   */
  async approveSubcontractor(
    subcontractorId: string,
    contractStart: Date,
    contractEnd: Date,
  ): Promise<Subcontractor> {
    const sub = await this.getSubcontractor(subcontractorId);

    if (sub.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Only pending subcontractors can be approved');
    }

    sub.status = 'ACTIVE';
    sub.contractStart = contractStart;
    sub.contractEnd = contractEnd;

    this.subcontractors.set(subcontractorId, sub);
    this.logger.log(`Subcontractor ${sub.companyName} approved`);

    return sub;
  }

  /**
   * Suspend subcontractor
   */
  async suspendSubcontractor(
    subcontractorId: string,
    reason: string,
  ): Promise<Subcontractor> {
    const sub = await this.getSubcontractor(subcontractorId);
    sub.status = 'SUSPENDED';
    this.subcontractors.set(subcontractorId, sub);
    this.logger.log(`Subcontractor ${sub.companyName} suspended: ${reason}`);
    return sub;
  }

  /**
   * Update subcontractor capacity
   */
  async updateCapacity(
    subcontractorId: string,
    capacity: Partial<SubcontractorCapacity>,
  ): Promise<Subcontractor> {
    const sub = await this.getSubcontractor(subcontractorId);
    sub.capacity = { ...sub.capacity, ...capacity };
    this.subcontractors.set(subcontractorId, sub);
    return sub;
  }

  // =================== ROUTE ASSIGNMENT ===================

  /**
   * Assign route to subcontractor
   */
  async assignRoute(
    userId: string,
    subcontractorId: string,
    routeId: string,
    agreedRate?: number,
  ): Promise<SubcontractorAssignment> {
    const sub = await this.getSubcontractor(subcontractorId);

    if (sub.status !== 'ACTIVE') {
      throw new BadRequestException('Can only assign routes to active subcontractors');
    }

    // Check route exists
    const route = await this.prisma.deliveryRoute.findFirst({
      where: { id: routeId, userId },
      include: { stops: true },
    });

    if (!route) {
      throw new NotFoundException(`Route ${routeId} not found`);
    }

    // Check route is not already assigned
    for (const assignment of this.assignments.values()) {
      if (assignment.routeId === routeId && assignment.status !== 'CANCELLED' && assignment.status !== 'REJECTED') {
        throw new BadRequestException(`Route ${routeId} is already assigned`);
      }
    }

    const deliveryCount = route.stops.length;
    const distanceKm = route.plannedDistanceKm?.toNumber() || 0;

    // Calculate rate based on subcontractor rates
    const calculatedRate = agreedRate || (
      deliveryCount * sub.rates.perDelivery +
      distanceKm * sub.rates.perKilometer
    );

    const assignment: SubcontractorAssignment = {
      id: `assign-${this.assignmentIdCounter++}`,
      subcontractorId,
      routeId,
      assignedAt: new Date(),
      status: 'PENDING',
      deliveryCount,
      distanceKm,
      agreedRate: Math.max(calculatedRate, sub.rates.minimumDaily),
      actualCost: null,
      completedAt: null,
      notes: null,
    };

    this.assignments.set(assignment.id, assignment);
    this.logger.log(`Route ${routeId} assigned to ${sub.companyName}`);

    return assignment;
  }

  /**
   * Get assignments for a subcontractor
   */
  async getSubcontractorAssignments(
    subcontractorId: string,
    options: {
      status?: SubcontractorAssignment['status'];
      from?: Date;
      to?: Date;
    } = {},
  ): Promise<SubcontractorAssignment[]> {
    let assignments = Array.from(this.assignments.values()).filter(
      a => a.subcontractorId === subcontractorId,
    );

    if (options.status) {
      assignments = assignments.filter(a => a.status === options.status);
    }
    if (options.from) {
      assignments = assignments.filter(a => a.assignedAt >= options.from!);
    }
    if (options.to) {
      assignments = assignments.filter(a => a.assignedAt <= options.to!);
    }

    return assignments.sort((a, b) => b.assignedAt.getTime() - a.assignedAt.getTime());
  }

  /**
   * Accept assignment (by subcontractor)
   */
  async acceptAssignment(assignmentId: string): Promise<SubcontractorAssignment> {
    const assignment = this.assignments.get(assignmentId);
    if (!assignment) {
      throw new NotFoundException(`Assignment ${assignmentId} not found`);
    }

    if (assignment.status !== 'PENDING') {
      throw new BadRequestException('Can only accept pending assignments');
    }

    assignment.status = 'ACCEPTED';
    this.assignments.set(assignmentId, assignment);
    return assignment;
  }

  /**
   * Reject assignment (by subcontractor)
   */
  async rejectAssignment(
    assignmentId: string,
    reason: string,
  ): Promise<SubcontractorAssignment> {
    const assignment = this.assignments.get(assignmentId);
    if (!assignment) {
      throw new NotFoundException(`Assignment ${assignmentId} not found`);
    }

    if (assignment.status !== 'PENDING') {
      throw new BadRequestException('Can only reject pending assignments');
    }

    assignment.status = 'REJECTED';
    assignment.notes = reason;
    this.assignments.set(assignmentId, assignment);
    return assignment;
  }

  /**
   * Start assignment (subcontractor begins route)
   */
  async startAssignment(assignmentId: string): Promise<SubcontractorAssignment> {
    const assignment = this.assignments.get(assignmentId);
    if (!assignment) {
      throw new NotFoundException(`Assignment ${assignmentId} not found`);
    }

    if (assignment.status !== 'ACCEPTED') {
      throw new BadRequestException('Can only start accepted assignments');
    }

    assignment.status = 'IN_PROGRESS';
    this.assignments.set(assignmentId, assignment);
    return assignment;
  }

  /**
   * Complete assignment
   */
  async completeAssignment(
    assignmentId: string,
    actualCost?: number,
  ): Promise<SubcontractorAssignment> {
    const assignment = this.assignments.get(assignmentId);
    if (!assignment) {
      throw new NotFoundException(`Assignment ${assignmentId} not found`);
    }

    if (assignment.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Can only complete in-progress assignments');
    }

    assignment.status = 'COMPLETED';
    assignment.completedAt = new Date();
    assignment.actualCost = actualCost || assignment.agreedRate;
    this.assignments.set(assignmentId, assignment);

    // Update subcontractor stats
    const sub = await this.getSubcontractor(assignment.subcontractorId);
    sub.totalRoutes++;
    sub.totalDeliveries += assignment.deliveryCount;
    this.subcontractors.set(sub.id, sub);

    return assignment;
  }

  /**
   * Cancel assignment
   */
  async cancelAssignment(
    assignmentId: string,
    reason: string,
  ): Promise<SubcontractorAssignment> {
    const assignment = this.assignments.get(assignmentId);
    if (!assignment) {
      throw new NotFoundException(`Assignment ${assignmentId} not found`);
    }

    if (assignment.status === 'COMPLETED') {
      throw new BadRequestException('Cannot cancel completed assignments');
    }

    assignment.status = 'CANCELLED';
    assignment.notes = reason;
    this.assignments.set(assignmentId, assignment);
    return assignment;
  }

  // =================== PERFORMANCE & ANALYTICS ===================

  /**
   * Get subcontractor performance metrics
   */
  async getPerformance(
    subcontractorId: string,
    from: Date,
    to: Date,
  ): Promise<SubcontractorPerformance> {
    const sub = await this.getSubcontractor(subcontractorId);

    const assignments = Array.from(this.assignments.values()).filter(
      a =>
        a.subcontractorId === subcontractorId &&
        a.assignedAt >= from &&
        a.assignedAt <= to,
    );

    const completedAssignments = assignments.filter(a => a.status === 'COMPLETED');
    const totalRoutes = assignments.length;
    const completedRoutes = completedAssignments.length;
    const totalDeliveries = assignments.reduce((sum, a) => sum + a.deliveryCount, 0);

    // Get actual delivery success from routes
    let successfulDeliveries = 0;
    let failedDeliveries = 0;

    for (const assignment of completedAssignments) {
      const route = await this.prisma.deliveryRoute.findFirst({
        where: { id: assignment.routeId },
        include: { stops: true },
      });

      if (route) {
        successfulDeliveries += route.stops.filter(s => s.status === 'DELIVERED').length;
        failedDeliveries += route.stops.filter(s => s.status === 'FAILED').length;
      }
    }

    const totalCost = completedAssignments.reduce(
      (sum, a) => sum + (a.actualCost || a.agreedRate),
      0,
    );

    return {
      subcontractorId,
      period: { from, to },
      totalRoutes,
      completedRoutes,
      totalDeliveries,
      successfulDeliveries,
      failedDeliveries,
      onTimeRate: completedRoutes > 0 ? (completedRoutes / totalRoutes) * 100 : 0,
      successRate:
        totalDeliveries > 0
          ? (successfulDeliveries / (successfulDeliveries + failedDeliveries)) * 100
          : 0,
      avgDeliveriesPerRoute: completedRoutes > 0 ? totalDeliveries / completedRoutes : 0,
      totalCost: Math.round(totalCost * 100) / 100,
      avgCostPerDelivery:
        successfulDeliveries > 0
          ? Math.round((totalCost / successfulDeliveries) * 100) / 100
          : 0,
      rating: sub.rating,
    };
  }

  /**
   * Rate subcontractor
   */
  async rateSubcontractor(
    subcontractorId: string,
    rating: number,
  ): Promise<Subcontractor> {
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const sub = await this.getSubcontractor(subcontractorId);

    // Calculate new average rating
    const totalRatings = sub.totalRoutes;
    sub.rating =
      totalRatings > 0
        ? (sub.rating * totalRatings + rating) / (totalRatings + 1)
        : rating;
    sub.rating = Math.round(sub.rating * 10) / 10;

    this.subcontractors.set(subcontractorId, sub);
    return sub;
  }

  /**
   * Get available subcontractors for a zone
   */
  async getAvailableForZone(
    userId: string,
    zone: string,
    requiredCapacity: number = 1,
  ): Promise<Subcontractor[]> {
    const subs = await this.getSubcontractors(userId, { status: 'ACTIVE', zone });

    return subs.filter(
      s =>
        s.capacity.availableVehicles >= requiredCapacity &&
        s.capacity.availableDrivers >= requiredCapacity,
    );
  }

  /**
   * Get subcontractor summary
   */
  async getSummary(userId: string): Promise<{
    totalSubcontractors: number;
    activeSubcontractors: number;
    pendingApproval: number;
    suspended: number;
    totalCapacity: { vehicles: number; drivers: number };
    availableCapacity: { vehicles: number; drivers: number };
    activeAssignments: number;
    completedThisMonth: number;
  }> {
    const subs = Array.from(this.subcontractors.values()).filter(
      s => s.userId === userId,
    );

    const activeSubs = subs.filter(s => s.status === 'ACTIVE');

    const totalCapacity = activeSubs.reduce(
      (acc, s) => ({
        vehicles: acc.vehicles + s.capacity.totalVehicles,
        drivers: acc.drivers + s.capacity.totalDrivers,
      }),
      { vehicles: 0, drivers: 0 },
    );

    const availableCapacity = activeSubs.reduce(
      (acc, s) => ({
        vehicles: acc.vehicles + s.capacity.availableVehicles,
        drivers: acc.drivers + s.capacity.availableDrivers,
      }),
      { vehicles: 0, drivers: 0 },
    );

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const activeAssignments = Array.from(this.assignments.values()).filter(
      a =>
        subs.some(s => s.id === a.subcontractorId) &&
        (a.status === 'PENDING' || a.status === 'ACCEPTED' || a.status === 'IN_PROGRESS'),
    ).length;

    const completedThisMonth = Array.from(this.assignments.values()).filter(
      a =>
        subs.some(s => s.id === a.subcontractorId) &&
        a.status === 'COMPLETED' &&
        a.completedAt &&
        a.completedAt >= monthStart,
    ).length;

    return {
      totalSubcontractors: subs.length,
      activeSubcontractors: activeSubs.length,
      pendingApproval: subs.filter(s => s.status === 'PENDING_APPROVAL').length,
      suspended: subs.filter(s => s.status === 'SUSPENDED').length,
      totalCapacity,
      availableCapacity,
      activeAssignments,
      completedThisMonth,
    };
  }

  /**
   * Get cost comparison (in-house vs subcontractor)
   */
  async getCostComparison(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<{
    period: { from: Date; to: Date };
    inHouse: { routes: number; deliveries: number; estimatedCost: number };
    subcontracted: { routes: number; deliveries: number; actualCost: number };
    savings: number;
    recommendation: string;
  }> {
    // Get in-house routes
    const inHouseRoutes = await this.prisma.deliveryRoute.findMany({
      where: {
        userId,
        routeDate: { gte: from, lte: to },
        status: 'COMPLETED',
      },
      include: { stops: { where: { status: 'DELIVERED' } } },
    });

    // Filter out subcontracted routes
    const subcontractorRouteIds = new Set(
      Array.from(this.assignments.values())
        .filter(a => a.status === 'COMPLETED')
        .map(a => a.routeId),
    );

    const pureInHouseRoutes = inHouseRoutes.filter(
      r => !subcontractorRouteIds.has(r.id),
    );

    const inHouseDeliveries = pureInHouseRoutes.reduce(
      (sum, r) => sum + r.stops.length,
      0,
    );

    // Estimate in-house cost (driver salary + fuel + vehicle)
    const estimatedCostPerDelivery = 4.50; // €4.50 average in-house cost
    const inHouseEstimatedCost = inHouseDeliveries * estimatedCostPerDelivery;

    // Get subcontracted stats
    const subcontractedAssignments = Array.from(this.assignments.values()).filter(
      a =>
        a.status === 'COMPLETED' &&
        a.completedAt &&
        a.completedAt >= from &&
        a.completedAt <= to,
    );

    const subcontractedRoutes = subcontractedAssignments.length;
    const subcontractedDeliveries = subcontractedAssignments.reduce(
      (sum, a) => sum + a.deliveryCount,
      0,
    );
    const subcontractedCost = subcontractedAssignments.reduce(
      (sum, a) => sum + (a.actualCost || a.agreedRate),
      0,
    );

    // Calculate savings (positive = subcontracting is cheaper)
    const subcontractedEquivalentInHouse = subcontractedDeliveries * estimatedCostPerDelivery;
    const savings = subcontractedEquivalentInHouse - subcontractedCost;

    let recommendation: string;
    if (subcontractedRoutes === 0) {
      recommendation = 'Keine Subunternehmer-Daten verfügbar für Vergleich';
    } else if (savings > 0) {
      recommendation = `Subunternehmer-Einsatz spart €${savings.toFixed(2)} im Vergleich zu Eigenleistung`;
    } else {
      recommendation = `Eigenleistung wäre €${Math.abs(savings).toFixed(2)} günstiger als Subunternehmer`;
    }

    return {
      period: { from, to },
      inHouse: {
        routes: pureInHouseRoutes.length,
        deliveries: inHouseDeliveries,
        estimatedCost: Math.round(inHouseEstimatedCost * 100) / 100,
      },
      subcontracted: {
        routes: subcontractedRoutes,
        deliveries: subcontractedDeliveries,
        actualCost: Math.round(subcontractedCost * 100) / 100,
      },
      savings: Math.round(savings * 100) / 100,
      recommendation,
    };
  }
}
