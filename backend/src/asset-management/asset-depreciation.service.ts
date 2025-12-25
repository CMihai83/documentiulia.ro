import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DepreciationMethod, Asset } from './asset-management.service';

// =================== TYPES ===================

export interface DepreciationSchedule {
  id: string;
  tenantId: string;
  assetId: string;
  assetName: string;
  method: DepreciationMethod;
  purchasePrice: number;
  salvageValue: number;
  usefulLifeMonths: number;
  startDate: Date;
  endDate: Date;
  monthlyDepreciation: number;
  entries: DepreciationEntry[];
  totalDepreciation: number;
  currentBookValue: number;
  status: 'active' | 'completed' | 'paused';
  createdAt: Date;
  updatedAt: Date;
}

export interface DepreciationEntry {
  id: string;
  period: string; // YYYY-MM
  periodStart: Date;
  periodEnd: Date;
  openingValue: number;
  depreciationAmount: number;
  closingValue: number;
  accumulatedDepreciation: number;
  status: 'pending' | 'posted' | 'adjusted';
  postedAt?: Date;
  postedBy?: string;
  adjustmentReason?: string;
}

export interface DepreciationSummary {
  totalAssets: number;
  totalOriginalValue: number;
  totalCurrentValue: number;
  totalDepreciationThisYear: number;
  totalDepreciationLifetime: number;
  byCategory: Array<{
    category: string;
    assetCount: number;
    originalValue: number;
    currentValue: number;
    depreciation: number;
  }>;
  byMethod: Array<{
    method: DepreciationMethod;
    assetCount: number;
    totalDepreciation: number;
  }>;
  fullyDepreciated: number;
  nearFullyDepreciated: number;
}

export interface AssetValuation {
  assetId: string;
  assetName: string;
  purchaseDate: Date;
  purchasePrice: number;
  currentBookValue: number;
  accumulatedDepreciation: number;
  depreciationRate: number;
  remainingLife: number;
  estimatedEndValue: number;
  marketValue?: number;
  revaluationHistory: Array<{
    date: Date;
    previousValue: number;
    newValue: number;
    reason: string;
    adjustedBy: string;
  }>;
}

// =================== SERVICE ===================

@Injectable()
export class AssetDepreciationService {
  private schedules: Map<string, DepreciationSchedule> = new Map();
  private valuations: Map<string, AssetValuation> = new Map();

  constructor(private eventEmitter: EventEmitter2) {}

  // =================== DEPRECIATION SCHEDULE ===================

  async createDepreciationSchedule(
    asset: Asset,
    tenantId: string,
  ): Promise<DepreciationSchedule> {
    if (!asset.purchasePrice || !asset.usefulLifeMonths) {
      throw new Error('Asset must have purchase price and useful life defined');
    }

    const id = `deprec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    const startDate = asset.depreciationStartDate || asset.purchaseDate || now;
    const endDate = new Date(startDate.getTime() + asset.usefulLifeMonths * 30 * 24 * 60 * 60 * 1000);
    const salvageValue = asset.salvageValue || 0;
    const depreciableAmount = asset.purchasePrice - salvageValue;

    // Calculate monthly depreciation based on method
    let monthlyDepreciation = 0;
    switch (asset.depreciationMethod || 'straight_line') {
      case 'straight_line':
        monthlyDepreciation = depreciableAmount / asset.usefulLifeMonths;
        break;
      case 'declining_balance':
        // 200% declining balance first month
        const annualRate = 2 / (asset.usefulLifeMonths / 12);
        monthlyDepreciation = (asset.purchasePrice * annualRate) / 12;
        break;
      case 'sum_of_years_digits':
        const n = asset.usefulLifeMonths / 12;
        const sumOfYears = (n * (n + 1)) / 2;
        monthlyDepreciation = (depreciableAmount * n) / sumOfYears / 12;
        break;
      case 'units_of_production':
        // For units of production, we'd need expected units - use straight line as fallback
        monthlyDepreciation = depreciableAmount / asset.usefulLifeMonths;
        break;
    }

    // Generate entries
    const entries: DepreciationEntry[] = [];
    let currentValue = asset.purchasePrice;
    let accumulatedDepreciation = 0;

    for (let i = 0; i < asset.usefulLifeMonths; i++) {
      const periodStart = new Date(startDate.getTime() + i * 30 * 24 * 60 * 60 * 1000);
      const periodEnd = new Date(startDate.getTime() + (i + 1) * 30 * 24 * 60 * 60 * 1000);
      const periodString = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, '0')}`;

      let depreciationAmount = monthlyDepreciation;

      // For declining balance, recalculate each period
      if (asset.depreciationMethod === 'declining_balance') {
        const annualRate = 2 / (asset.usefulLifeMonths / 12);
        depreciationAmount = Math.max((currentValue * annualRate) / 12, 0);
        // Don't depreciate below salvage value
        if (currentValue - depreciationAmount < salvageValue) {
          depreciationAmount = Math.max(currentValue - salvageValue, 0);
        }
      }

      // For sum of years digits, recalculate
      if (asset.depreciationMethod === 'sum_of_years_digits') {
        const n = asset.usefulLifeMonths / 12;
        const sumOfYears = (n * (n + 1)) / 2;
        const yearIndex = Math.floor(i / 12);
        const remainingYears = n - yearIndex;
        depreciationAmount = (depreciableAmount * remainingYears) / sumOfYears / 12;
      }

      const openingValue = currentValue;
      currentValue = Math.max(currentValue - depreciationAmount, salvageValue);
      accumulatedDepreciation += depreciationAmount;

      entries.push({
        id: `entry-${id}-${i}`,
        period: periodString,
        periodStart,
        periodEnd,
        openingValue,
        depreciationAmount: Math.round(depreciationAmount * 100) / 100,
        closingValue: Math.round(currentValue * 100) / 100,
        accumulatedDepreciation: Math.round(accumulatedDepreciation * 100) / 100,
        status: periodEnd < now ? 'posted' : 'pending',
      });
    }

    const schedule: DepreciationSchedule = {
      id,
      tenantId,
      assetId: asset.id,
      assetName: asset.name,
      method: asset.depreciationMethod || 'straight_line',
      purchasePrice: asset.purchasePrice,
      salvageValue,
      usefulLifeMonths: asset.usefulLifeMonths,
      startDate,
      endDate,
      monthlyDepreciation: Math.round(monthlyDepreciation * 100) / 100,
      entries,
      totalDepreciation: Math.round(accumulatedDepreciation * 100) / 100,
      currentBookValue: Math.round(currentValue * 100) / 100,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    this.schedules.set(id, schedule);

    this.eventEmitter.emit('depreciation.schedule_created', { schedule });

    return schedule;
  }

  async getDepreciationSchedule(assetId: string): Promise<DepreciationSchedule | null> {
    for (const schedule of this.schedules.values()) {
      if (schedule.assetId === assetId) {
        return schedule;
      }
    }
    return null;
  }

  async getDepreciationSchedules(
    tenantId: string,
    filters?: {
      method?: DepreciationMethod;
      status?: DepreciationSchedule['status'];
      limit?: number;
    },
  ): Promise<DepreciationSchedule[]> {
    let schedules = Array.from(this.schedules.values()).filter(
      (s) => s.tenantId === tenantId,
    );

    if (filters?.method) {
      schedules = schedules.filter((s) => s.method === filters.method);
    }

    if (filters?.status) {
      schedules = schedules.filter((s) => s.status === filters.status);
    }

    schedules = schedules.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (filters?.limit) {
      schedules = schedules.slice(0, filters.limit);
    }

    return schedules;
  }

  async postDepreciationEntry(
    scheduleId: string,
    period: string,
    postedBy: string,
  ): Promise<DepreciationEntry | null> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) return null;

    const entry = schedule.entries.find((e) => e.period === period);
    if (!entry) return null;

    entry.status = 'posted';
    entry.postedAt = new Date();
    entry.postedBy = postedBy;

    schedule.updatedAt = new Date();
    this.schedules.set(scheduleId, schedule);

    this.eventEmitter.emit('depreciation.entry_posted', { schedule, entry });

    return entry;
  }

  async adjustDepreciationEntry(
    scheduleId: string,
    period: string,
    data: {
      newAmount: number;
      reason: string;
      adjustedBy: string;
    },
  ): Promise<DepreciationEntry | null> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) return null;

    const entryIndex = schedule.entries.findIndex((e) => e.period === period);
    if (entryIndex === -1) return null;

    const entry = schedule.entries[entryIndex];
    const difference = data.newAmount - entry.depreciationAmount;

    entry.depreciationAmount = data.newAmount;
    entry.closingValue = entry.openingValue - data.newAmount;
    entry.status = 'adjusted';
    entry.adjustmentReason = data.reason;
    entry.postedAt = new Date();
    entry.postedBy = data.adjustedBy;

    // Recalculate subsequent entries
    for (let i = entryIndex + 1; i < schedule.entries.length; i++) {
      schedule.entries[i].accumulatedDepreciation += difference;
    }

    schedule.totalDepreciation += difference;
    schedule.currentBookValue = schedule.purchasePrice - schedule.totalDepreciation;
    schedule.updatedAt = new Date();

    this.schedules.set(scheduleId, schedule);

    this.eventEmitter.emit('depreciation.entry_adjusted', { schedule, entry });

    return entry;
  }

  // =================== DEPRECIATION CALCULATIONS ===================

  calculateCurrentBookValue(asset: Asset): number {
    if (!asset.purchasePrice || !asset.purchaseDate) {
      return asset.currentValue || 0;
    }

    const method = asset.depreciationMethod || 'straight_line';
    const usefulLifeMonths = asset.usefulLifeMonths || 60; // Default 5 years
    const salvageValue = asset.salvageValue || 0;
    const depreciableAmount = asset.purchasePrice - salvageValue;

    const monthsElapsed = Math.floor(
      (Date.now() - asset.purchaseDate.getTime()) / (30 * 24 * 60 * 60 * 1000),
    );

    if (monthsElapsed >= usefulLifeMonths) {
      return salvageValue;
    }

    let totalDepreciation = 0;

    switch (method) {
      case 'straight_line':
        totalDepreciation = (depreciableAmount / usefulLifeMonths) * monthsElapsed;
        break;
      case 'declining_balance':
        let currentValue = asset.purchasePrice;
        const annualRate = 2 / (usefulLifeMonths / 12);
        for (let i = 0; i < monthsElapsed; i++) {
          const monthlyDep = (currentValue * annualRate) / 12;
          if (currentValue - monthlyDep < salvageValue) {
            totalDepreciation += currentValue - salvageValue;
            break;
          }
          totalDepreciation += monthlyDep;
          currentValue -= monthlyDep;
        }
        break;
      case 'sum_of_years_digits':
        const n = usefulLifeMonths / 12;
        const sumOfYears = (n * (n + 1)) / 2;
        for (let i = 0; i < monthsElapsed; i++) {
          const yearIndex = Math.floor(i / 12);
          const remainingYears = n - yearIndex;
          totalDepreciation += (depreciableAmount * remainingYears) / sumOfYears / 12;
        }
        break;
      case 'units_of_production':
        totalDepreciation = (depreciableAmount / usefulLifeMonths) * monthsElapsed;
        break;
    }

    return Math.max(asset.purchasePrice - totalDepreciation, salvageValue);
  }

  async getDepreciationSummary(tenantId: string): Promise<DepreciationSummary> {
    const schedules = Array.from(this.schedules.values()).filter(
      (s) => s.tenantId === tenantId,
    );

    let totalOriginalValue = 0;
    let totalCurrentValue = 0;
    let totalDepreciationThisYear = 0;
    let totalDepreciationLifetime = 0;
    let fullyDepreciated = 0;
    let nearFullyDepreciated = 0;

    const byCategory: Record<string, { assetCount: number; originalValue: number; currentValue: number; depreciation: number }> = {};
    const byMethod: Record<DepreciationMethod, { assetCount: number; totalDepreciation: number }> = {
      straight_line: { assetCount: 0, totalDepreciation: 0 },
      declining_balance: { assetCount: 0, totalDepreciation: 0 },
      units_of_production: { assetCount: 0, totalDepreciation: 0 },
      sum_of_years_digits: { assetCount: 0, totalDepreciation: 0 },
    };

    const currentYear = new Date().getFullYear();

    for (const schedule of schedules) {
      totalOriginalValue += schedule.purchasePrice;
      totalCurrentValue += schedule.currentBookValue;
      totalDepreciationLifetime += schedule.totalDepreciation;

      // Calculate this year's depreciation
      const thisYearEntries = schedule.entries.filter(
        (e) => e.period.startsWith(String(currentYear)),
      );
      const thisYearDepreciation = thisYearEntries.reduce(
        (sum, e) => sum + e.depreciationAmount,
        0,
      );
      totalDepreciationThisYear += thisYearDepreciation;

      // Track by method
      byMethod[schedule.method].assetCount++;
      byMethod[schedule.method].totalDepreciation += schedule.totalDepreciation;

      // Track fully depreciated
      if (schedule.currentBookValue <= schedule.salvageValue) {
        fullyDepreciated++;
      } else if (schedule.currentBookValue <= schedule.purchasePrice * 0.1) {
        nearFullyDepreciated++;
      }
    }

    return {
      totalAssets: schedules.length,
      totalOriginalValue: Math.round(totalOriginalValue * 100) / 100,
      totalCurrentValue: Math.round(totalCurrentValue * 100) / 100,
      totalDepreciationThisYear: Math.round(totalDepreciationThisYear * 100) / 100,
      totalDepreciationLifetime: Math.round(totalDepreciationLifetime * 100) / 100,
      byCategory: Object.entries(byCategory).map(([category, data]) => ({
        category,
        ...data,
      })),
      byMethod: Object.entries(byMethod).map(([method, data]) => ({
        method: method as DepreciationMethod,
        ...data,
      })),
      fullyDepreciated,
      nearFullyDepreciated,
    };
  }

  // =================== ASSET VALUATION ===================

  async getAssetValuation(assetId: string): Promise<AssetValuation | null> {
    return this.valuations.get(assetId) || null;
  }

  async revalueAsset(
    asset: Asset,
    data: {
      newValue: number;
      reason: string;
      adjustedBy: string;
    },
  ): Promise<AssetValuation> {
    let valuation = this.valuations.get(asset.id);

    if (!valuation) {
      valuation = {
        assetId: asset.id,
        assetName: asset.name,
        purchaseDate: asset.purchaseDate || new Date(),
        purchasePrice: asset.purchasePrice || 0,
        currentBookValue: asset.currentValue || 0,
        accumulatedDepreciation: (asset.purchasePrice || 0) - (asset.currentValue || 0),
        depreciationRate: asset.usefulLifeMonths
          ? 100 / (asset.usefulLifeMonths / 12)
          : 20,
        remainingLife: asset.usefulLifeMonths || 60,
        estimatedEndValue: asset.salvageValue || 0,
        revaluationHistory: [],
      };
    }

    valuation.revaluationHistory.push({
      date: new Date(),
      previousValue: valuation.currentBookValue,
      newValue: data.newValue,
      reason: data.reason,
      adjustedBy: data.adjustedBy,
    });

    valuation.currentBookValue = data.newValue;

    this.valuations.set(asset.id, valuation);

    this.eventEmitter.emit('asset.revalued', { valuation, asset });

    return valuation;
  }

  // =================== REPORTS ===================

  async generateDepreciationReport(
    tenantId: string,
    period: { year: number; month?: number },
  ): Promise<{
    period: string;
    schedules: Array<{
      assetId: string;
      assetName: string;
      method: DepreciationMethod;
      openingValue: number;
      depreciation: number;
      closingValue: number;
      accumulatedDepreciation: number;
    }>;
    totals: {
      openingValue: number;
      depreciation: number;
      closingValue: number;
      accumulatedDepreciation: number;
    };
    generatedAt: Date;
  }> {
    const schedules = Array.from(this.schedules.values()).filter(
      (s) => s.tenantId === tenantId,
    );

    const periodString = period.month
      ? `${period.year}-${String(period.month).padStart(2, '0')}`
      : String(period.year);

    const reportData: Array<{
      assetId: string;
      assetName: string;
      method: DepreciationMethod;
      openingValue: number;
      depreciation: number;
      closingValue: number;
      accumulatedDepreciation: number;
    }> = [];

    let totalOpening = 0;
    let totalDepreciation = 0;
    let totalClosing = 0;
    let totalAccumulated = 0;

    for (const schedule of schedules) {
      const entries = schedule.entries.filter((e) =>
        period.month ? e.period === periodString : e.period.startsWith(String(period.year)),
      );

      if (entries.length === 0) continue;

      const opening = entries[0].openingValue;
      const depreciation = entries.reduce((sum, e) => sum + e.depreciationAmount, 0);
      const closing = entries[entries.length - 1].closingValue;
      const accumulated = entries[entries.length - 1].accumulatedDepreciation;

      reportData.push({
        assetId: schedule.assetId,
        assetName: schedule.assetName,
        method: schedule.method,
        openingValue: opening,
        depreciation,
        closingValue: closing,
        accumulatedDepreciation: accumulated,
      });

      totalOpening += opening;
      totalDepreciation += depreciation;
      totalClosing += closing;
      totalAccumulated += accumulated;
    }

    return {
      period: periodString,
      schedules: reportData,
      totals: {
        openingValue: Math.round(totalOpening * 100) / 100,
        depreciation: Math.round(totalDepreciation * 100) / 100,
        closingValue: Math.round(totalClosing * 100) / 100,
        accumulatedDepreciation: Math.round(totalAccumulated * 100) / 100,
      },
      generatedAt: new Date(),
    };
  }

  async getAssetsByDepreciationStatus(
    tenantId: string,
  ): Promise<{
    fullyDepreciated: Array<{ assetId: string; assetName: string; salvageValue: number }>;
    nearFullyDepreciated: Array<{ assetId: string; assetName: string; currentValue: number; remainingPercentage: number }>;
    active: Array<{ assetId: string; assetName: string; currentValue: number; depreciationProgress: number }>;
  }> {
    const schedules = Array.from(this.schedules.values()).filter(
      (s) => s.tenantId === tenantId,
    );

    const fullyDepreciated: Array<{ assetId: string; assetName: string; salvageValue: number }> = [];
    const nearFullyDepreciated: Array<{ assetId: string; assetName: string; currentValue: number; remainingPercentage: number }> = [];
    const active: Array<{ assetId: string; assetName: string; currentValue: number; depreciationProgress: number }> = [];

    for (const schedule of schedules) {
      const progress = (schedule.totalDepreciation / (schedule.purchasePrice - schedule.salvageValue)) * 100;

      if (schedule.currentBookValue <= schedule.salvageValue) {
        fullyDepreciated.push({
          assetId: schedule.assetId,
          assetName: schedule.assetName,
          salvageValue: schedule.salvageValue,
        });
      } else if (progress >= 90) {
        nearFullyDepreciated.push({
          assetId: schedule.assetId,
          assetName: schedule.assetName,
          currentValue: schedule.currentBookValue,
          remainingPercentage: 100 - progress,
        });
      } else {
        active.push({
          assetId: schedule.assetId,
          assetName: schedule.assetName,
          currentValue: schedule.currentBookValue,
          depreciationProgress: progress,
        });
      }
    }

    return {
      fullyDepreciated,
      nearFullyDepreciated,
      active,
    };
  }
}
