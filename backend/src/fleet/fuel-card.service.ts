import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VehicleStatus } from '@prisma/client';

/**
 * Fuel Card Integration Service
 * Manages fuel card operations for the Munich delivery fleet.
 *
 * Supports German fuel card providers:
 * - Shell Card
 * - DKV Card
 * - UTA Card
 * - ARAL Card
 * - Euroshell
 *
 * Features:
 * - Fuel card registration and management
 * - Transaction import and tracking
 * - Fuel efficiency analysis
 * - Spending alerts
 * - Cost reporting
 */

export type FuelCardProvider = 'SHELL' | 'DKV' | 'UTA' | 'ARAL' | 'EUROSHELL' | 'OTHER';
export type FuelCardStatus = 'ACTIVE' | 'BLOCKED' | 'EXPIRED' | 'LOST';

export interface FuelCard {
  id: string;
  cardNumber: string;
  provider: FuelCardProvider;
  vehicleId: string | null;
  driverId: string | null;
  status: FuelCardStatus;
  expiryDate: Date;
  monthlyLimit: number;
  currentMonthSpent: number;
  pinRequired: boolean;
  createdAt: Date;
}

export interface FuelTransaction {
  id: string;
  cardId: string;
  vehicleId: string;
  driverId: string | null;
  transactionDate: Date;
  stationName: string;
  stationAddress: string | null;
  fuelType: string;
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  odometerReading: number | null;
  receiptNumber: string | null;
  importedAt: Date;
}

export interface FuelCardSummary {
  totalCards: number;
  activeCards: number;
  blockedCards: number;
  expiredCards: number;
  totalMonthlyLimit: number;
  totalMonthlySpent: number;
  utilizationPercent: number;
}

export interface FuelSpendingAnalysis {
  period: { from: Date; to: Date };
  totalLiters: number;
  totalCostEur: number;
  avgPricePerLiter: number;
  avgCostPerKm: number;
  totalDistanceKm: number;
  transactionCount: number;
  byFuelType: { fuelType: string; liters: number; cost: number }[];
  byStation: { station: string; visits: number; totalCost: number }[];
  byVehicle: { vehicleId: string; plate: string; liters: number; cost: number; kmPerLiter: number }[];
}

export interface FuelAlert {
  alertType: 'HIGH_SPENDING' | 'UNUSUAL_LOCATION' | 'LIMIT_WARNING' | 'CARD_EXPIRING' | 'EFFICIENCY_DROP';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  details: Record<string, any>;
  createdAt: Date;
}

// German fuel card provider configs
const FUEL_CARD_PROVIDERS: Record<FuelCardProvider, { name: string; website: string }> = {
  SHELL: { name: 'Shell Card', website: 'https://shellcard.shell.de' },
  DKV: { name: 'DKV Euro Service', website: 'https://www.dkv-euroservice.com' },
  UTA: { name: 'UTA', website: 'https://www.uta.com' },
  ARAL: { name: 'ARAL Card', website: 'https://www.aral.de' },
  EUROSHELL: { name: 'Euroshell', website: 'https://www.shell.de' },
  OTHER: { name: 'Other', website: '' },
};

@Injectable()
export class FuelCardService {
  private readonly logger = new Logger(FuelCardService.name);

  // In-memory storage for fuel cards (in production, add to Prisma schema)
  private fuelCards: Map<string, FuelCard> = new Map();
  private cardIdCounter = 1;

  constructor(private readonly prisma: PrismaService) {}

  // =================== FUEL CARD MANAGEMENT ===================

  /**
   * Register a new fuel card
   */
  async registerCard(
    userId: string,
    data: {
      cardNumber: string;
      provider: FuelCardProvider;
      vehicleId?: string;
      driverId?: string;
      expiryDate: Date;
      monthlyLimit: number;
      pinRequired?: boolean;
    },
  ): Promise<FuelCard> {
    this.logger.log(`Registering fuel card ${data.cardNumber} for user ${userId}`);

    // Validate vehicle exists if provided
    if (data.vehicleId) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: data.vehicleId, userId },
      });
      if (!vehicle) {
        throw new NotFoundException(`Vehicle ${data.vehicleId} not found`);
      }
    }

    // Validate driver exists if provided
    if (data.driverId) {
      const driver = await this.prisma.employee.findFirst({
        where: { id: data.driverId, userId },
      });
      if (!driver) {
        throw new NotFoundException(`Driver ${data.driverId} not found`);
      }
    }

    // Check for duplicate card number
    for (const card of this.fuelCards.values()) {
      if (card.cardNumber === data.cardNumber) {
        throw new BadRequestException(`Card number ${data.cardNumber} already registered`);
      }
    }

    const card: FuelCard = {
      id: `card-${this.cardIdCounter++}`,
      cardNumber: data.cardNumber,
      provider: data.provider,
      vehicleId: data.vehicleId || null,
      driverId: data.driverId || null,
      status: 'ACTIVE',
      expiryDate: data.expiryDate,
      monthlyLimit: data.monthlyLimit,
      currentMonthSpent: 0,
      pinRequired: data.pinRequired ?? true,
      createdAt: new Date(),
    };

    this.fuelCards.set(card.id, card);
    this.logger.log(`Fuel card ${card.id} registered successfully`);

    return card;
  }

  /**
   * Get all fuel cards for a user
   */
  async getCards(userId: string): Promise<FuelCard[]> {
    this.logger.log(`Getting fuel cards for user ${userId}`);
    return Array.from(this.fuelCards.values());
  }

  /**
   * Get a single fuel card
   */
  async getCard(cardId: string): Promise<FuelCard> {
    const card = this.fuelCards.get(cardId);
    if (!card) {
      throw new NotFoundException(`Fuel card ${cardId} not found`);
    }
    return card;
  }

  /**
   * Update fuel card
   */
  async updateCard(
    cardId: string,
    data: {
      vehicleId?: string;
      driverId?: string;
      status?: FuelCardStatus;
      monthlyLimit?: number;
    },
  ): Promise<FuelCard> {
    this.logger.log(`Updating fuel card ${cardId}`);

    const card = await this.getCard(cardId);

    if (data.vehicleId !== undefined) card.vehicleId = data.vehicleId;
    if (data.driverId !== undefined) card.driverId = data.driverId;
    if (data.status !== undefined) card.status = data.status;
    if (data.monthlyLimit !== undefined) card.monthlyLimit = data.monthlyLimit;

    this.fuelCards.set(cardId, card);
    return card;
  }

  /**
   * Block a fuel card
   */
  async blockCard(cardId: string, reason: string): Promise<FuelCard> {
    this.logger.log(`Blocking fuel card ${cardId}: ${reason}`);

    const card = await this.getCard(cardId);
    card.status = 'BLOCKED';
    this.fuelCards.set(cardId, card);

    return card;
  }

  /**
   * Get fuel card summary
   */
  async getCardSummary(userId: string): Promise<FuelCardSummary> {
    const cards = await this.getCards(userId);

    const activeCards = cards.filter(c => c.status === 'ACTIVE').length;
    const blockedCards = cards.filter(c => c.status === 'BLOCKED').length;
    const expiredCards = cards.filter(c => c.status === 'EXPIRED').length;

    const totalMonthlyLimit = cards.reduce((sum, c) => sum + c.monthlyLimit, 0);
    const totalMonthlySpent = cards.reduce((sum, c) => sum + c.currentMonthSpent, 0);

    return {
      totalCards: cards.length,
      activeCards,
      blockedCards,
      expiredCards,
      totalMonthlyLimit,
      totalMonthlySpent,
      utilizationPercent: totalMonthlyLimit > 0
        ? Math.round((totalMonthlySpent / totalMonthlyLimit) * 1000) / 10
        : 0,
    };
  }

  // =================== FUEL TRANSACTIONS ===================

  /**
   * Import fuel transactions from provider
   */
  async importTransactions(
    userId: string,
    cardId: string,
    transactions: Array<{
      transactionDate: Date;
      stationName: string;
      stationAddress?: string;
      fuelType: string;
      liters: number;
      pricePerLiter: number;
      odometerReading?: number;
      receiptNumber?: string;
    }>,
  ): Promise<{ imported: number; errors: string[] }> {
    this.logger.log(`Importing ${transactions.length} transactions for card ${cardId}`);

    const card = await this.getCard(cardId);
    const errors: string[] = [];
    let imported = 0;

    for (const tx of transactions) {
      try {
        // Create fuel log in database
        await this.prisma.fuelLog.create({
          data: {
            vehicleId: card.vehicleId || '', // Will need handling if no vehicle linked
            driverId: card.driverId,
            fuelType: tx.fuelType as any,
            liters: tx.liters,
            pricePerLiter: tx.pricePerLiter,
            totalCost: tx.liters * tx.pricePerLiter,
            odometerReading: tx.odometerReading || 0,
            stationName: tx.stationName,
            stationAddress: tx.stationAddress,
            fueledAt: tx.transactionDate,
          },
        });

        // Update card spending
        card.currentMonthSpent += tx.liters * tx.pricePerLiter;
        imported++;
      } catch (error) {
        errors.push(`Transaction ${tx.receiptNumber || 'unknown'}: ${(error as Error).message}`);
      }
    }

    this.fuelCards.set(cardId, card);
    this.logger.log(`Imported ${imported} transactions, ${errors.length} errors`);

    return { imported, errors };
  }

  /**
   * Get recent fuel transactions
   */
  async getRecentTransactions(
    userId: string,
    options: {
      vehicleId?: string;
      from?: Date;
      to?: Date;
      limit?: number;
    } = {},
  ): Promise<FuelTransaction[]> {
    const { vehicleId, from, to, limit = 50 } = options;

    const where: any = {};
    if (vehicleId) where.vehicleId = vehicleId;
    if (from || to) {
      where.fueledAt = {};
      if (from) where.fueledAt.gte = from;
      if (to) where.fueledAt.lte = to;
    }

    const logs = await this.prisma.fuelLog.findMany({
      where,
      orderBy: { fueledAt: 'desc' },
      take: limit,
    });

    return logs.map(log => ({
      id: log.id,
      cardId: '', // Would need to track card ID in schema
      vehicleId: log.vehicleId,
      driverId: log.driverId,
      transactionDate: log.fueledAt,
      stationName: log.stationName || '',
      stationAddress: log.stationAddress,
      fuelType: log.fuelType,
      liters: log.liters.toNumber(),
      pricePerLiter: log.pricePerLiter.toNumber(),
      totalCost: log.totalCost.toNumber(),
      odometerReading: log.odometerReading,
      receiptNumber: null,
      importedAt: log.createdAt,
    }));
  }

  // =================== FUEL ANALYSIS ===================

  /**
   * Get fuel spending analysis
   */
  async getSpendingAnalysis(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<FuelSpendingAnalysis> {
    this.logger.log(`Analyzing fuel spending from ${from} to ${to}`);

    // Get all fuel logs in period
    const logs = await this.prisma.fuelLog.findMany({
      where: {
        vehicle: { userId },
        fueledAt: { gte: from, lte: to },
      },
      include: {
        vehicle: { select: { id: true, licensePlate: true } },
      },
    });

    // Get routes in same period for distance calculation
    const routes = await this.prisma.deliveryRoute.findMany({
      where: {
        userId,
        routeDate: { gte: from, lte: to },
      },
      select: {
        actualDistanceKm: true,
      },
    });

    const totalLiters = logs.reduce((sum, l) => sum + l.liters.toNumber(), 0);
    const totalCostEur = logs.reduce((sum, l) => sum + l.totalCost.toNumber(), 0);
    const avgPricePerLiter = totalLiters > 0 ? totalCostEur / totalLiters : 0;
    const totalDistanceKm = routes.reduce((sum, r) => sum + (r.actualDistanceKm?.toNumber() || 0), 0);
    const avgCostPerKm = totalDistanceKm > 0 ? totalCostEur / totalDistanceKm : 0;

    // Group by fuel type
    const byFuelType: Map<string, { liters: number; cost: number }> = new Map();
    for (const log of logs) {
      const fuelType = log.fuelType;
      const existing = byFuelType.get(fuelType) || { liters: 0, cost: 0 };
      existing.liters += log.liters.toNumber();
      existing.cost += log.totalCost.toNumber();
      byFuelType.set(fuelType, existing);
    }

    // Group by station
    const byStation: Map<string, { visits: number; totalCost: number }> = new Map();
    for (const log of logs) {
      const station = log.stationName || 'Unknown';
      const existing = byStation.get(station) || { visits: 0, totalCost: 0 };
      existing.visits++;
      existing.totalCost += log.totalCost.toNumber();
      byStation.set(station, existing);
    }

    // Group by vehicle
    const byVehicle: Map<string, { plate: string; liters: number; cost: number; distance: number }> = new Map();
    for (const log of logs) {
      const vehicleId = log.vehicleId;
      const existing = byVehicle.get(vehicleId) || {
        plate: log.vehicle.licensePlate,
        liters: 0,
        cost: 0,
        distance: 0,
      };
      existing.liters += log.liters.toNumber();
      existing.cost += log.totalCost.toNumber();
      byVehicle.set(vehicleId, existing);
    }

    // Add distance data per vehicle
    const vehicleRoutes = await this.prisma.deliveryRoute.findMany({
      where: {
        userId,
        routeDate: { gte: from, lte: to },
      },
      select: {
        vehicleId: true,
        actualDistanceKm: true,
      },
    });

    for (const route of vehicleRoutes) {
      const existing = byVehicle.get(route.vehicleId);
      if (existing) {
        existing.distance += route.actualDistanceKm?.toNumber() || 0;
      }
    }

    return {
      period: { from, to },
      totalLiters: Math.round(totalLiters * 10) / 10,
      totalCostEur: Math.round(totalCostEur * 100) / 100,
      avgPricePerLiter: Math.round(avgPricePerLiter * 1000) / 1000,
      avgCostPerKm: Math.round(avgCostPerKm * 100) / 100,
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      transactionCount: logs.length,
      byFuelType: Array.from(byFuelType.entries()).map(([fuelType, data]) => ({
        fuelType,
        liters: Math.round(data.liters * 10) / 10,
        cost: Math.round(data.cost * 100) / 100,
      })),
      byStation: Array.from(byStation.entries())
        .map(([station, data]) => ({
          station,
          visits: data.visits,
          totalCost: Math.round(data.totalCost * 100) / 100,
        }))
        .sort((a, b) => b.totalCost - a.totalCost),
      byVehicle: Array.from(byVehicle.entries()).map(([vehicleId, data]) => ({
        vehicleId,
        plate: data.plate,
        liters: Math.round(data.liters * 10) / 10,
        cost: Math.round(data.cost * 100) / 100,
        kmPerLiter: data.liters > 0 ? Math.round((data.distance / data.liters) * 10) / 10 : 0,
      })),
    };
  }

  // =================== FUEL ALERTS ===================

  /**
   * Check for fuel-related alerts
   */
  async checkAlerts(userId: string): Promise<FuelAlert[]> {
    this.logger.log(`Checking fuel alerts for user ${userId}`);

    const alerts: FuelAlert[] = [];
    const now = new Date();

    // Check card limits and expiry
    const cards = await this.getCards(userId);
    for (const card of cards) {
      // Card expiring soon (within 30 days)
      const daysUntilExpiry = Math.floor(
        (new Date(card.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysUntilExpiry <= 30 && daysUntilExpiry > 0 && card.status === 'ACTIVE') {
        alerts.push({
          alertType: 'CARD_EXPIRING',
          severity: daysUntilExpiry <= 7 ? 'CRITICAL' : 'WARNING',
          message: `Tankkarte ${card.cardNumber} läuft in ${daysUntilExpiry} Tagen ab`,
          details: { cardId: card.id, cardNumber: card.cardNumber, expiryDate: card.expiryDate },
          createdAt: now,
        });
      }

      // Limit warning (80% or 100% used)
      const utilizationPercent = card.monthlyLimit > 0
        ? (card.currentMonthSpent / card.monthlyLimit) * 100
        : 0;
      if (utilizationPercent >= 100) {
        alerts.push({
          alertType: 'LIMIT_WARNING',
          severity: 'CRITICAL',
          message: `Tankkarte ${card.cardNumber} hat das Monatslimit erreicht`,
          details: { cardId: card.id, spent: card.currentMonthSpent, limit: card.monthlyLimit },
          createdAt: now,
        });
      } else if (utilizationPercent >= 80) {
        alerts.push({
          alertType: 'LIMIT_WARNING',
          severity: 'WARNING',
          message: `Tankkarte ${card.cardNumber} hat ${Math.round(utilizationPercent)}% des Monatslimits erreicht`,
          details: { cardId: card.id, spent: card.currentMonthSpent, limit: card.monthlyLimit },
          createdAt: now,
        });
      }
    }

    // Check for unusual spending patterns
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentLogs = await this.prisma.fuelLog.findMany({
      where: {
        vehicle: { userId },
        fueledAt: { gte: thirtyDaysAgo },
      },
    });

    // Calculate average daily spending
    const totalSpending = recentLogs.reduce((sum, l) => sum + l.totalCost.toNumber(), 0);
    const avgDailySpending = totalSpending / 30;

    // Check last week's daily spending
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekLogs = recentLogs.filter(l => l.fueledAt >= sevenDaysAgo);
    const lastWeekSpending = lastWeekLogs.reduce((sum, l) => sum + l.totalCost.toNumber(), 0);
    const lastWeekDailyAvg = lastWeekSpending / 7;

    if (avgDailySpending > 0 && lastWeekDailyAvg > avgDailySpending * 1.5) {
      alerts.push({
        alertType: 'HIGH_SPENDING',
        severity: 'WARNING',
        message: `Kraftstoffausgaben in der letzten Woche 50% über dem Durchschnitt`,
        details: {
          avgDaily: Math.round(avgDailySpending * 100) / 100,
          lastWeekDaily: Math.round(lastWeekDailyAvg * 100) / 100,
        },
        createdAt: now,
      });
    }

    // Sort by severity
    alerts.sort((a, b) => {
      const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    return alerts;
  }

  // =================== FUEL PROVIDERS ===================

  /**
   * Get list of supported fuel card providers
   */
  getProviders(): Array<{ code: FuelCardProvider; name: string; website: string }> {
    return Object.entries(FUEL_CARD_PROVIDERS).map(([code, info]) => ({
      code: code as FuelCardProvider,
      name: info.name,
      website: info.website,
    }));
  }

  /**
   * Get fuel efficiency report by vehicle
   */
  async getEfficiencyReport(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<Array<{
    vehicleId: string;
    licensePlate: string;
    totalLiters: number;
    totalDistanceKm: number;
    kmPerLiter: number;
    costPerKm: number;
    status: 'GOOD' | 'AVERAGE' | 'POOR';
  }>> {
    this.logger.log(`Generating efficiency report for user ${userId}`);

    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId, status: { in: [VehicleStatus.AVAILABLE, VehicleStatus.IN_USE] } },
      select: { id: true, licensePlate: true },
    });

    const report: Array<{
      vehicleId: string;
      licensePlate: string;
      totalLiters: number;
      totalDistanceKm: number;
      kmPerLiter: number;
      costPerKm: number;
      status: 'GOOD' | 'AVERAGE' | 'POOR';
    }> = [];

    for (const vehicle of vehicles) {
      // Get fuel logs
      const logs = await this.prisma.fuelLog.findMany({
        where: {
          vehicleId: vehicle.id,
          fueledAt: { gte: from, lte: to },
        },
      });

      // Get routes for distance
      const routes = await this.prisma.deliveryRoute.findMany({
        where: {
          vehicleId: vehicle.id,
          routeDate: { gte: from, lte: to },
        },
        select: { actualDistanceKm: true },
      });

      const totalLiters = logs.reduce((sum, l) => sum + l.liters.toNumber(), 0);
      const totalCost = logs.reduce((sum, l) => sum + l.totalCost.toNumber(), 0);
      const totalDistanceKm = routes.reduce((sum, r) => sum + (r.actualDistanceKm?.toNumber() || 0), 0);

      const kmPerLiter = totalLiters > 0 ? totalDistanceKm / totalLiters : 0;
      const costPerKm = totalDistanceKm > 0 ? totalCost / totalDistanceKm : 0;

      // Determine efficiency status
      // German delivery van standards: 8-12 km/L is good
      let status: 'GOOD' | 'AVERAGE' | 'POOR';
      if (kmPerLiter >= 10) {
        status = 'GOOD';
      } else if (kmPerLiter >= 7) {
        status = 'AVERAGE';
      } else {
        status = 'POOR';
      }

      report.push({
        vehicleId: vehicle.id,
        licensePlate: vehicle.licensePlate,
        totalLiters: Math.round(totalLiters * 10) / 10,
        totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
        kmPerLiter: Math.round(kmPerLiter * 10) / 10,
        costPerKm: Math.round(costPerKm * 100) / 100,
        status,
      });
    }

    // Sort by efficiency (worst first)
    report.sort((a, b) => a.kmPerLiter - b.kmPerLiter);

    return report;
  }
}
