import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FinanceService, CountryCode, VatRateType } from '../finance/finance.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Fleet-Finance Integration Service
 * Connects fleet operations with financial tracking and reporting.
 *
 * Features:
 * - Fleet cost aggregation (fuel, maintenance, routes)
 * - Cost allocation per vehicle/driver/customer
 * - Profitability analysis
 * - Expense categorization for accounting
 * - VAT calculations on fleet expenses
 * - Financial KPIs and reporting
 */

export interface FleetCostSummary {
  period: string;
  totalCosts: number;
  breakdown: {
    fuel: number;
    maintenance: number;
    depreciation: number;
    insurance: number;
    tolls: number;
    driverCosts: number;
    other: number;
  };
  perKm: number;
  perRoute: number;
  perDelivery: number;
  currency: string;
}

export interface VehicleCostReport {
  vehicleId: string;
  licensePlate: string;
  period: string;
  totalKm: number;
  totalRoutes: number;
  costs: {
    fuel: number;
    maintenance: number;
    depreciation: number;
    insurance: number;
    other: number;
    total: number;
  };
  costPerKm: number;
  revenue: number;
  profit: number;
  profitMargin: number;
}

export interface RouteProfitability {
  routeId: string;
  routeDate: Date;
  customerId?: string;
  customerName?: string;
  revenue: number;
  costs: {
    fuel: number;
    driverTime: number;
    vehicleDepreciation: number;
    tolls: number;
    total: number;
  };
  profit: number;
  profitMargin: number;
  distanceKm: number;
  profitPerKm: number;
}

export interface FleetExpenseEntry {
  id: string;
  date: Date;
  category: ExpenseCategory;
  description: string;
  amount: number;
  vatAmount: number;
  grossAmount: number;
  vehicleId?: string;
  routeId?: string;
  driverId?: string;
  supplierId?: string;
  invoiceNumber?: string;
  status: 'PENDING' | 'APPROVED' | 'POSTED' | 'REJECTED';
}

export type ExpenseCategory =
  | 'FUEL'
  | 'MAINTENANCE'
  | 'REPAIRS'
  | 'INSURANCE'
  | 'TOLLS'
  | 'PARKING'
  | 'CLEANING'
  | 'DEPRECIATION'
  | 'DRIVER_SALARY'
  | 'DRIVER_ALLOWANCE'
  | 'OTHER';

export interface FleetBudget {
  id: string;
  userId: string;
  period: string;
  budgetedAmount: number;
  allocations: Record<ExpenseCategory, number>;
  actualSpent: number;
  remaining: number;
  variance: number;
  variancePercent: number;
}

export interface CustomerProfitability {
  customerId: string;
  customerName: string;
  period: string;
  totalRoutes: number;
  totalDeliveries: number;
  totalRevenue: number;
  totalCosts: number;
  profit: number;
  profitMargin: number;
  avgRevenuePerRoute: number;
  avgCostPerRoute: number;
}

@Injectable()
export class FleetFinanceIntegrationService {
  private readonly logger = new Logger(FleetFinanceIntegrationService.name);

  // In-memory storage
  private expenses: Map<string, FleetExpenseEntry[]> = new Map();
  private budgets: Map<string, FleetBudget[]> = new Map();
  private expenseCounter = 0;
  private budgetCounter = 0;

  // Cost factors (EUR per unit)
  private readonly COST_FACTORS = {
    FUEL_PRICE_PER_LITER: 1.80,
    DRIVER_HOURLY_RATE: 25,
    DRIVER_DAILY_ALLOWANCE: 35,
    VEHICLE_DEPRECIATION_PER_KM: 0.15,
    MAINTENANCE_PER_KM: 0.08,
    INSURANCE_MONTHLY: 250,
    TOLL_AVG_PER_KM: 0.12,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly financeService: FinanceService,
  ) {}

  // =================== COST AGGREGATION ===================

  /**
   * Get fleet cost summary for a period
   */
  async getFleetCostSummary(
    userId: string,
    options?: {
      from?: Date;
      to?: Date;
      vehicleIds?: string[];
    },
  ): Promise<FleetCostSummary> {
    const from = options?.from || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = options?.to || new Date();

    // Get user's vehicles first
    const userVehicles = await this.prisma.vehicle.findMany({
      where: { userId },
      select: { id: true },
    });
    const userVehicleIds = options?.vehicleIds || userVehicles.map(v => v.id);

    // Get fuel costs
    const fuelLogs = await this.prisma.fuelLog.findMany({
      where: {
        vehicleId: { in: userVehicleIds },
        fueledAt: { gte: from, lte: to },
      },
    });

    const fuelCost = fuelLogs.reduce((sum, log) => sum + Number(log.totalCost), 0);

    // Get maintenance costs
    const maintenanceLogs = await this.prisma.maintenanceLog.findMany({
      where: {
        vehicleId: { in: userVehicleIds },
        serviceDate: { gte: from, lte: to },
      },
    });

    const maintenanceCost = maintenanceLogs.reduce((sum, log) => sum + Number(log.totalCost || 0), 0);

    // Get routes for distance and count
    const routes = await this.prisma.deliveryRoute.findMany({
      where: {
        userId,
        routeDate: { gte: from, lte: to },
        ...(options?.vehicleIds && { vehicleId: { in: options.vehicleIds } }),
      },
      include: { stops: true },
    });

    const totalKm = routes.reduce((sum, r) => sum + Number(r.actualDistanceKm || r.plannedDistanceKm || 0), 0);
    const totalDeliveries = routes.reduce((sum, r) => sum + r.stops.length, 0);

    // Calculate other costs
    const depreciationCost = totalKm * this.COST_FACTORS.VEHICLE_DEPRECIATION_PER_KM;
    const tollCost = totalKm * this.COST_FACTORS.TOLL_AVG_PER_KM;

    // Estimate driver costs
    const routeHours = routes.length * 8; // Assume 8h per route
    const driverCost = routeHours * this.COST_FACTORS.DRIVER_HOURLY_RATE;

    // Vehicle count for insurance
    const vehicleCount = options?.vehicleIds?.length ||
      await this.prisma.vehicle.count({ where: { userId } });
    const monthsInPeriod = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (30 * 24 * 60 * 60 * 1000)));
    const insuranceCost = vehicleCount * this.COST_FACTORS.INSURANCE_MONTHLY * monthsInPeriod;

    const totalCosts = fuelCost + maintenanceCost + depreciationCost + insuranceCost + tollCost + driverCost;

    const period = `${from.toISOString().slice(0, 10)} - ${to.toISOString().slice(0, 10)}`;

    return {
      period,
      totalCosts: Math.round(totalCosts * 100) / 100,
      breakdown: {
        fuel: Math.round(fuelCost * 100) / 100,
        maintenance: Math.round(maintenanceCost * 100) / 100,
        depreciation: Math.round(depreciationCost * 100) / 100,
        insurance: Math.round(insuranceCost * 100) / 100,
        tolls: Math.round(tollCost * 100) / 100,
        driverCosts: Math.round(driverCost * 100) / 100,
        other: 0,
      },
      perKm: totalKm > 0 ? Math.round((totalCosts / totalKm) * 100) / 100 : 0,
      perRoute: routes.length > 0 ? Math.round((totalCosts / routes.length) * 100) / 100 : 0,
      perDelivery: totalDeliveries > 0 ? Math.round((totalCosts / totalDeliveries) * 100) / 100 : 0,
      currency: 'EUR',
    };
  }

  /**
   * Get cost report per vehicle
   */
  async getVehicleCostReport(
    userId: string,
    vehicleId: string,
    options?: { from?: Date; to?: Date },
  ): Promise<VehicleCostReport> {
    const from = options?.from || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = options?.to || new Date();

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, userId },
    });

    if (!vehicle) {
      throw new BadRequestException('Fahrzeug nicht gefunden');
    }

    // Get fuel costs
    const fuelLogs = await this.prisma.fuelLog.findMany({
      where: { vehicleId, fueledAt: { gte: from, lte: to } },
    });
    const fuelCost = fuelLogs.reduce((sum, log) => sum + Number(log.totalCost), 0);

    // Get maintenance costs
    const maintenanceLogs = await this.prisma.maintenanceLog.findMany({
      where: { vehicleId, serviceDate: { gte: from, lte: to } },
    });
    const maintenanceCost = maintenanceLogs.reduce((sum, log) => sum + Number(log.totalCost || 0), 0);

    // Get routes
    const routes = await this.prisma.deliveryRoute.findMany({
      where: { vehicleId, routeDate: { gte: from, lte: to } },
    });

    const totalKm = routes.reduce((sum, r) => sum + Number(r.actualDistanceKm || r.plannedDistanceKm || 0), 0);
    const depreciationCost = totalKm * this.COST_FACTORS.VEHICLE_DEPRECIATION_PER_KM;

    // Estimate insurance (monthly prorated)
    const monthsInPeriod = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (30 * 24 * 60 * 60 * 1000)));
    const insuranceCost = this.COST_FACTORS.INSURANCE_MONTHLY * monthsInPeriod;

    const totalCost = fuelCost + maintenanceCost + depreciationCost + insuranceCost;

    // Estimate revenue (placeholder - would come from invoices)
    const revenue = routes.length * 150; // Avg 150 EUR per route
    const profit = revenue - totalCost;

    return {
      vehicleId,
      licensePlate: vehicle.licensePlate,
      period: `${from.toISOString().slice(0, 10)} - ${to.toISOString().slice(0, 10)}`,
      totalKm: Math.round(totalKm),
      totalRoutes: routes.length,
      costs: {
        fuel: Math.round(fuelCost * 100) / 100,
        maintenance: Math.round(maintenanceCost * 100) / 100,
        depreciation: Math.round(depreciationCost * 100) / 100,
        insurance: Math.round(insuranceCost * 100) / 100,
        other: 0,
        total: Math.round(totalCost * 100) / 100,
      },
      costPerKm: totalKm > 0 ? Math.round((totalCost / totalKm) * 100) / 100 : 0,
      revenue: Math.round(revenue * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      profitMargin: revenue > 0 ? Math.round((profit / revenue) * 100 * 100) / 100 : 0,
    };
  }

  /**
   * Get all vehicles cost comparison
   */
  async getVehiclesCostComparison(
    userId: string,
    options?: { from?: Date; to?: Date },
  ): Promise<VehicleCostReport[]> {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId },
    });

    const reports: VehicleCostReport[] = [];

    for (const vehicle of vehicles) {
      const report = await this.getVehicleCostReport(userId, vehicle.id, options);
      reports.push(report);
    }

    return reports.sort((a, b) => b.costPerKm - a.costPerKm);
  }

  // =================== PROFITABILITY ANALYSIS ===================

  /**
   * Calculate route profitability
   */
  async getRouteProfitability(
    userId: string,
    routeId: string,
  ): Promise<RouteProfitability> {
    const route = await this.prisma.deliveryRoute.findFirst({
      where: { id: routeId, userId },
      include: { vehicle: true, stops: true },
    });

    if (!route) {
      throw new BadRequestException('Route nicht gefunden');
    }

    const distanceKm = Number(route.actualDistanceKm || route.plannedDistanceKm || 0);

    // Calculate costs
    const fuelCost = (distanceKm / 100) * 10 * this.COST_FACTORS.FUEL_PRICE_PER_LITER; // Assuming 10L/100km
    const driverTimeCost = 8 * this.COST_FACTORS.DRIVER_HOURLY_RATE; // 8h route
    const depreciationCost = distanceKm * this.COST_FACTORS.VEHICLE_DEPRECIATION_PER_KM;
    const tollCost = distanceKm * this.COST_FACTORS.TOLL_AVG_PER_KM;

    const totalCost = fuelCost + driverTimeCost + depreciationCost + tollCost;

    // Estimate revenue (would come from invoices in real implementation)
    const revenue = route.stops.length * 15; // 15 EUR per delivery

    const profit = revenue - totalCost;

    return {
      routeId,
      routeDate: route.routeDate,
      customerId: undefined, // Would come from stops/orders
      customerName: undefined,
      revenue: Math.round(revenue * 100) / 100,
      costs: {
        fuel: Math.round(fuelCost * 100) / 100,
        driverTime: Math.round(driverTimeCost * 100) / 100,
        vehicleDepreciation: Math.round(depreciationCost * 100) / 100,
        tolls: Math.round(tollCost * 100) / 100,
        total: Math.round(totalCost * 100) / 100,
      },
      profit: Math.round(profit * 100) / 100,
      profitMargin: revenue > 0 ? Math.round((profit / revenue) * 100 * 100) / 100 : 0,
      distanceKm: Math.round(distanceKm * 10) / 10,
      profitPerKm: distanceKm > 0 ? Math.round((profit / distanceKm) * 100) / 100 : 0,
    };
  }

  /**
   * Get profitability by customer
   */
  async getCustomerProfitability(
    userId: string,
    customerId: string,
    options?: { from?: Date; to?: Date },
  ): Promise<CustomerProfitability> {
    const from = options?.from || new Date(new Date().getFullYear(), 0, 1);
    const to = options?.to || new Date();

    // Get routes for customer (would need customer association in real implementation)
    const routes = await this.prisma.deliveryRoute.findMany({
      where: {
        userId,
        routeDate: { gte: from, lte: to },
        // customerId: customerId, // Would need this field
      },
      include: { stops: true },
    });

    const totalRoutes = routes.length;
    const totalDeliveries = routes.reduce((sum, r) => sum + r.stops.length, 0);

    // Calculate totals
    const totalRevenue = totalDeliveries * 15; // Placeholder
    const totalKm = routes.reduce((sum, r) => sum + Number(r.actualDistanceKm || r.plannedDistanceKm || 0), 0);
    const totalCosts = totalKm * 0.85; // Avg cost per km

    return {
      customerId,
      customerName: `Customer ${customerId}`,
      period: `${from.toISOString().slice(0, 10)} - ${to.toISOString().slice(0, 10)}`,
      totalRoutes,
      totalDeliveries,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCosts: Math.round(totalCosts * 100) / 100,
      profit: Math.round((totalRevenue - totalCosts) * 100) / 100,
      profitMargin: totalRevenue > 0 ? Math.round(((totalRevenue - totalCosts) / totalRevenue) * 100 * 100) / 100 : 0,
      avgRevenuePerRoute: totalRoutes > 0 ? Math.round((totalRevenue / totalRoutes) * 100) / 100 : 0,
      avgCostPerRoute: totalRoutes > 0 ? Math.round((totalCosts / totalRoutes) * 100) / 100 : 0,
    };
  }

  // =================== EXPENSE MANAGEMENT ===================

  /**
   * Create a fleet expense entry
   */
  async createExpense(
    userId: string,
    expense: {
      date: Date;
      category: ExpenseCategory;
      description: string;
      amount: number;
      vehicleId?: string;
      routeId?: string;
      driverId?: string;
      supplierId?: string;
      invoiceNumber?: string;
      vatRate?: number;
    },
  ): Promise<FleetExpenseEntry> {
    const id = `exp-${++this.expenseCounter}-${Date.now()}`;

    // Calculate VAT
    const vatRate = expense.vatRate || 19; // Default German VAT
    const vatAmount = expense.amount * (vatRate / 100);
    const grossAmount = expense.amount + vatAmount;

    const entry: FleetExpenseEntry = {
      id,
      date: expense.date,
      category: expense.category,
      description: expense.description,
      amount: Math.round(expense.amount * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      grossAmount: Math.round(grossAmount * 100) / 100,
      vehicleId: expense.vehicleId,
      routeId: expense.routeId,
      driverId: expense.driverId,
      supplierId: expense.supplierId,
      invoiceNumber: expense.invoiceNumber,
      status: 'PENDING',
    };

    const userExpenses = this.expenses.get(userId) || [];
    userExpenses.push(entry);
    this.expenses.set(userId, userExpenses);

    this.logger.log(`Expense created: ${id} - ${expense.category} - ${expense.amount} EUR`);

    return entry;
  }

  /**
   * Get expenses with filters
   */
  async getExpenses(
    userId: string,
    options?: {
      category?: ExpenseCategory;
      vehicleId?: string;
      status?: 'PENDING' | 'APPROVED' | 'POSTED' | 'REJECTED';
      from?: Date;
      to?: Date;
    },
  ): Promise<FleetExpenseEntry[]> {
    let expenses = this.expenses.get(userId) || [];

    if (options?.category) {
      expenses = expenses.filter(e => e.category === options.category);
    }
    if (options?.vehicleId) {
      expenses = expenses.filter(e => e.vehicleId === options.vehicleId);
    }
    if (options?.status) {
      expenses = expenses.filter(e => e.status === options.status);
    }
    if (options?.from) {
      expenses = expenses.filter(e => e.date >= options.from!);
    }
    if (options?.to) {
      expenses = expenses.filter(e => e.date <= options.to!);
    }

    return expenses.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  /**
   * Approve an expense
   */
  async approveExpense(
    userId: string,
    expenseId: string,
  ): Promise<FleetExpenseEntry | null> {
    const expenses = this.expenses.get(userId) || [];
    const expense = expenses.find(e => e.id === expenseId);

    if (!expense) return null;

    expense.status = 'APPROVED';
    return expense;
  }

  /**
   * Post expense to accounting
   */
  async postExpenseToAccounting(
    userId: string,
    expenseId: string,
  ): Promise<{ success: boolean; journalEntryId?: string }> {
    const expenses = this.expenses.get(userId) || [];
    const expense = expenses.find(e => e.id === expenseId);

    if (!expense) {
      return { success: false };
    }

    if (expense.status !== 'APPROVED') {
      throw new BadRequestException('Expense must be approved before posting');
    }

    expense.status = 'POSTED';

    // In real implementation, would create journal entry in accounting system
    const journalEntryId = `JE-${Date.now()}`;

    return { success: true, journalEntryId };
  }

  // =================== BUDGET MANAGEMENT ===================

  /**
   * Create a fleet budget
   */
  async createBudget(
    userId: string,
    budget: {
      period: string;
      budgetedAmount: number;
      allocations: Partial<Record<ExpenseCategory, number>>;
    },
  ): Promise<FleetBudget> {
    const id = `budget-${++this.budgetCounter}-${Date.now()}`;

    // Ensure all categories have allocations
    const defaultAllocations: Record<ExpenseCategory, number> = {
      FUEL: 0,
      MAINTENANCE: 0,
      REPAIRS: 0,
      INSURANCE: 0,
      TOLLS: 0,
      PARKING: 0,
      CLEANING: 0,
      DEPRECIATION: 0,
      DRIVER_SALARY: 0,
      DRIVER_ALLOWANCE: 0,
      OTHER: 0,
    };

    const allocations = { ...defaultAllocations, ...budget.allocations };

    const newBudget: FleetBudget = {
      id,
      userId,
      period: budget.period,
      budgetedAmount: budget.budgetedAmount,
      allocations,
      actualSpent: 0,
      remaining: budget.budgetedAmount,
      variance: 0,
      variancePercent: 0,
    };

    const userBudgets = this.budgets.get(userId) || [];
    userBudgets.push(newBudget);
    this.budgets.set(userId, userBudgets);

    return newBudget;
  }

  /**
   * Get budget with actuals
   */
  async getBudgetWithActuals(
    userId: string,
    period: string,
  ): Promise<FleetBudget | null> {
    const budgets = this.budgets.get(userId) || [];
    const budget = budgets.find(b => b.period === period);

    if (!budget) return null;

    // Calculate actual spent from expenses
    const expenses = await this.getExpenses(userId, {
      from: new Date(`${period}-01`),
      to: new Date(new Date(`${period}-01`).setMonth(new Date(`${period}-01`).getMonth() + 1)),
    });

    const actualSpent = expenses
      .filter(e => e.status !== 'REJECTED')
      .reduce((sum, e) => sum + e.amount, 0);

    budget.actualSpent = Math.round(actualSpent * 100) / 100;
    budget.remaining = Math.round((budget.budgetedAmount - actualSpent) * 100) / 100;
    budget.variance = Math.round((actualSpent - budget.budgetedAmount) * 100) / 100;
    budget.variancePercent = budget.budgetedAmount > 0
      ? Math.round(((actualSpent - budget.budgetedAmount) / budget.budgetedAmount) * 100 * 100) / 100
      : 0;

    return budget;
  }

  // =================== VAT CALCULATIONS ===================

  /**
   * Calculate VAT on fleet expenses for a period
   */
  async calculateFleetVAT(
    userId: string,
    options?: { from?: Date; to?: Date },
  ): Promise<{
    totalNet: number;
    totalVAT: number;
    totalGross: number;
    byCategory: Record<ExpenseCategory, { net: number; vat: number; gross: number }>;
  }> {
    const expenses = await this.getExpenses(userId, {
      ...options,
      status: 'POSTED',
    });

    const byCategory: Record<ExpenseCategory, { net: number; vat: number; gross: number }> = {} as any;
    let totalNet = 0;
    let totalVAT = 0;
    let totalGross = 0;

    for (const expense of expenses) {
      if (!byCategory[expense.category]) {
        byCategory[expense.category] = { net: 0, vat: 0, gross: 0 };
      }

      byCategory[expense.category].net += expense.amount;
      byCategory[expense.category].vat += expense.vatAmount;
      byCategory[expense.category].gross += expense.grossAmount;

      totalNet += expense.amount;
      totalVAT += expense.vatAmount;
      totalGross += expense.grossAmount;
    }

    return {
      totalNet: Math.round(totalNet * 100) / 100,
      totalVAT: Math.round(totalVAT * 100) / 100,
      totalGross: Math.round(totalGross * 100) / 100,
      byCategory,
    };
  }

  // =================== FINANCIAL DASHBOARD ===================

  /**
   * Get financial dashboard data
   */
  async getFinancialDashboard(userId: string): Promise<{
    costSummary: FleetCostSummary;
    topCostVehicles: VehicleCostReport[];
    pendingExpenses: FleetExpenseEntry[];
    budgetStatus: FleetBudget | null;
    vatSummary: { totalNet: number; totalVAT: number; totalGross: number };
    kpis: {
      avgCostPerKm: number;
      avgCostPerRoute: number;
      avgProfitMargin: number;
      fuelEfficiency: number;
    };
  }> {
    const currentMonth = new Date().toISOString().slice(0, 7);

    const [costSummary, vehicleReports, pendingExpenses, budgetStatus, vatSummary] = await Promise.all([
      this.getFleetCostSummary(userId),
      this.getVehiclesCostComparison(userId),
      this.getExpenses(userId, { status: 'PENDING' }),
      this.getBudgetWithActuals(userId, currentMonth),
      this.calculateFleetVAT(userId),
    ]);

    // Calculate KPIs
    const avgProfitMargin = vehicleReports.length > 0
      ? vehicleReports.reduce((sum, r) => sum + r.profitMargin, 0) / vehicleReports.length
      : 0;

    return {
      costSummary,
      topCostVehicles: vehicleReports.slice(0, 5),
      pendingExpenses: pendingExpenses.slice(0, 10),
      budgetStatus,
      vatSummary: {
        totalNet: vatSummary.totalNet,
        totalVAT: vatSummary.totalVAT,
        totalGross: vatSummary.totalGross,
      },
      kpis: {
        avgCostPerKm: costSummary.perKm,
        avgCostPerRoute: costSummary.perRoute,
        avgProfitMargin: Math.round(avgProfitMargin * 100) / 100,
        fuelEfficiency: 10.5, // Placeholder - would calculate from actual data
      },
    };
  }

  /**
   * Export financial data for accounting integration
   */
  async exportForAccounting(
    userId: string,
    options?: { from?: Date; to?: Date; format?: 'CSV' | 'JSON' | 'DATEV' },
  ): Promise<{
    format: string;
    data: any;
    filename: string;
    recordCount: number;
  }> {
    const expenses = await this.getExpenses(userId, {
      ...options,
      status: 'POSTED',
    });

    const format = options?.format || 'CSV';
    const filename = `fleet-expenses-${new Date().toISOString().slice(0, 10)}.${format.toLowerCase()}`;

    let data: any;

    switch (format) {
      case 'CSV':
        data = this.formatAsCSV(expenses);
        break;
      case 'DATEV':
        data = this.formatAsDATEV(expenses);
        break;
      default:
        data = expenses;
    }

    return {
      format,
      data,
      filename,
      recordCount: expenses.length,
    };
  }

  // =================== PRIVATE HELPERS ===================

  private formatAsCSV(expenses: FleetExpenseEntry[]): string {
    const headers = ['Date', 'Category', 'Description', 'Net', 'VAT', 'Gross', 'Vehicle', 'Invoice'];
    const rows = expenses.map(e => [
      e.date.toISOString().slice(0, 10),
      e.category,
      e.description,
      e.amount.toFixed(2),
      e.vatAmount.toFixed(2),
      e.grossAmount.toFixed(2),
      e.vehicleId || '',
      e.invoiceNumber || '',
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  private formatAsDATEV(expenses: FleetExpenseEntry[]): any[] {
    // DATEV format for German accounting software
    return expenses.map((e, i) => ({
      Umsatz: e.grossAmount,
      'Soll/Haben-Kennzeichen': 'S',
      'WKZ Umsatz': 'EUR',
      Kurs: 1,
      'Basis-Umsatz': e.amount,
      'WKZ Basis-Umsatz': 'EUR',
      Konto: this.getCategoryAccount(e.category),
      'Gegenkonto (ohne BU-Schlüssel)': '1200', // Bank
      'BU-Schlüssel': '9', // 19% VAT
      Belegdatum: e.date.toISOString().slice(0, 10).replace(/-/g, ''),
      Belegfeld1: e.invoiceNumber || `EXP${i + 1}`,
      Buchungstext: e.description,
    }));
  }

  private getCategoryAccount(category: ExpenseCategory): string {
    const accounts: Record<ExpenseCategory, string> = {
      FUEL: '4530',
      MAINTENANCE: '4540',
      REPAIRS: '4541',
      INSURANCE: '4520',
      TOLLS: '4590',
      PARKING: '4591',
      CLEANING: '4592',
      DEPRECIATION: '4830',
      DRIVER_SALARY: '6010',
      DRIVER_ALLOWANCE: '6020',
      OTHER: '4900',
    };
    return accounts[category] || '4900';
  }
}
