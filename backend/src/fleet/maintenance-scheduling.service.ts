import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MaintenanceType } from '@prisma/client';

// Re-export MaintenanceType for controller usage
export { MaintenanceType };

// Priority levels for maintenance tasks
export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// Maintenance schedule configuration
export interface MaintenanceScheduleConfig {
  type: MaintenanceType;
  intervalKm?: number;        // Distance interval for this maintenance
  intervalMonths?: number;    // Time interval for this maintenance
  estimatedCostEur?: number;  // Estimated cost
  estimatedDurationHours?: number;
}

// Default maintenance schedules for delivery vans (German standards)
export const DEFAULT_MAINTENANCE_SCHEDULES: MaintenanceScheduleConfig[] = [
  {
    type: 'OIL_CHANGE',
    intervalKm: 15000,
    intervalMonths: 12,
    estimatedCostEur: 150,
    estimatedDurationHours: 1,
  },
  {
    type: 'BRAKE_SERVICE',
    intervalKm: 30000,
    intervalMonths: 24,
    estimatedCostEur: 400,
    estimatedDurationHours: 3,
  },
  {
    type: 'TIRE_ROTATION',
    intervalKm: 10000,
    intervalMonths: 6,
    estimatedCostEur: 50,
    estimatedDurationHours: 0.5,
  },
  {
    type: 'SCHEDULED_SERVICE',
    intervalKm: 30000,
    intervalMonths: 12,
    estimatedCostEur: 350,
    estimatedDurationHours: 4,
  },
  {
    type: 'TUV_INSPECTION',
    intervalMonths: 24, // German TÜV every 2 years
    estimatedCostEur: 120,
    estimatedDurationHours: 2,
  },
];

export interface ScheduledMaintenanceTask {
  id: string;
  vehicleId: string;
  licensePlate: string;
  make: string;
  model: string;
  type: MaintenanceType;
  dueDate: Date;
  dueMileage?: number;
  currentMileage?: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedCostEur?: number;
  estimatedDurationHours?: number;
  daysUntilDue: number;
  kmUntilDue?: number;
  isOverdue: boolean;
  lastServiceDate?: Date;
}

export interface MaintenanceAlert {
  vehicleId: string;
  licensePlate: string;
  alertType: 'TUV_EXPIRY' | 'INSURANCE_EXPIRY' | 'SERVICE_DUE' | 'MILEAGE_SERVICE';
  severity: 'INFO' | 'WARNING' | 'URGENT' | 'CRITICAL';
  message: string;
  dueDate?: Date;
  daysRemaining?: number;
}

export interface MaintenanceSummary {
  totalVehicles: number;
  vehiclesNeedingService: number;
  overdueTasks: number;
  upcomingTasks7Days: number;
  upcomingTasks30Days: number;
  estimatedMonthlyMaintenanceCost: number;
  tuvExpiringThisMonth: number;
  insuranceExpiringThisMonth: number;
}

export interface CreateScheduledMaintenanceDto {
  vehicleId: string;
  type: MaintenanceType;
  scheduledDate: Date;
  estimatedCostEur?: number;
  notes?: string;
  vendorName?: string;
}

@Injectable()
export class MaintenanceSchedulingService {
  private readonly logger = new Logger(MaintenanceSchedulingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =================== MAINTENANCE SUMMARY ===================

  async getMaintenanceSummary(userId: string): Promise<MaintenanceSummary> {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId },
      include: {
        maintenanceLogs: {
          orderBy: { serviceDate: 'desc' },
          take: 1,
        },
      },
    });

    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    let vehiclesNeedingService = 0;
    let overdueTasks = 0;
    let upcomingTasks7Days = 0;
    let upcomingTasks30Days = 0;
    let estimatedMonthlyMaintenanceCost = 0;
    let tuvExpiringThisMonth = 0;
    let insuranceExpiringThisMonth = 0;

    for (const vehicle of vehicles) {
      const tasks = await this.getScheduledMaintenanceForVehicle(vehicle);

      for (const task of tasks) {
        if (task.isOverdue) {
          overdueTasks++;
          vehiclesNeedingService++;
        } else if (task.dueDate <= in7Days) {
          upcomingTasks7Days++;
        } else if (task.dueDate <= in30Days) {
          upcomingTasks30Days++;
          if (task.estimatedCostEur) {
            estimatedMonthlyMaintenanceCost += task.estimatedCostEur;
          }
        }
      }

      // Check TÜV expiry
      if (vehicle.tuvExpiry && vehicle.tuvExpiry <= endOfMonth) {
        tuvExpiringThisMonth++;
      }

      // Check insurance expiry
      if (vehicle.insuranceExpiry && vehicle.insuranceExpiry <= endOfMonth) {
        insuranceExpiringThisMonth++;
      }
    }

    return {
      totalVehicles: vehicles.length,
      vehiclesNeedingService,
      overdueTasks,
      upcomingTasks7Days,
      upcomingTasks30Days,
      estimatedMonthlyMaintenanceCost: Math.round(estimatedMonthlyMaintenanceCost * 100) / 100,
      tuvExpiringThisMonth,
      insuranceExpiringThisMonth,
    };
  }

  // =================== SCHEDULED MAINTENANCE TASKS ===================

  async getAllScheduledMaintenance(
    userId: string,
    options?: {
      includeOverdue?: boolean;
      daysAhead?: number;
      vehicleId?: string;
      type?: MaintenanceType;
      status?: 'pending' | 'scheduled' | 'completed' | 'overdue';
    },
  ): Promise<ScheduledMaintenanceTask[]> {
    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        userId,
        ...(options?.vehicleId ? { id: options.vehicleId } : {}),
      },
      include: {
        maintenanceLogs: {
          orderBy: { serviceDate: 'desc' },
        },
      },
    });

    const allTasks: ScheduledMaintenanceTask[] = [];
    const daysAhead = options?.daysAhead || 90;
    const cutoffDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

    for (const vehicle of vehicles) {
      const vehicleTasks = await this.getScheduledMaintenanceForVehicle(vehicle);

      for (const task of vehicleTasks) {
        // Filter by type if specified
        if (options?.type && task.type !== options.type) continue;

        // Filter by status if specified
        if (options?.status) {
          if (options.status === 'overdue' && !task.isOverdue) continue;
          if (options.status === 'pending' && task.isOverdue) continue;
          if (options.status === 'scheduled' && (task.isOverdue || task.daysUntilDue > 30)) continue;
        }

        // Include overdue or upcoming within daysAhead
        if (task.isOverdue && options?.includeOverdue !== false) {
          allTasks.push(task);
        } else if (task.dueDate <= cutoffDate) {
          allTasks.push(task);
        }
      }
    }

    // Sort by priority and due date
    return allTasks.sort((a, b) => {
      const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.dueDate.getTime() - b.dueDate.getTime();
    });
  }

  private async getScheduledMaintenanceForVehicle(
    vehicle: any,
  ): Promise<ScheduledMaintenanceTask[]> {
    const tasks: ScheduledMaintenanceTask[] = [];
    const now = new Date();

    for (const schedule of DEFAULT_MAINTENANCE_SCHEDULES) {
      // Find last maintenance of this type
      const lastMaintenance = vehicle.maintenanceLogs?.find(
        (log: any) => log.type === schedule.type,
      );

      // Calculate due date based on time interval
      let dueDate: Date;
      let dueMileage: number | undefined;

      if (lastMaintenance) {
        // Calculate from last service
        const lastServiceDate = new Date(lastMaintenance.serviceDate);

        if (schedule.intervalMonths) {
          dueDate = new Date(lastServiceDate);
          dueDate.setMonth(dueDate.getMonth() + schedule.intervalMonths);
        } else {
          dueDate = new Date(lastServiceDate);
          dueDate.setFullYear(dueDate.getFullYear() + 1); // Default 1 year
        }

        if (schedule.intervalKm && lastMaintenance.odometerReading) {
          dueMileage = lastMaintenance.odometerReading + schedule.intervalKm;
        }
      } else {
        // No previous service - use vehicle registration or default
        if (schedule.type === 'TUV_INSPECTION' && vehicle.tuvExpiry) {
          dueDate = new Date(vehicle.tuvExpiry);
        } else if (vehicle.lastServiceDate) {
          dueDate = new Date(vehicle.lastServiceDate);
          if (schedule.intervalMonths) {
            dueDate.setMonth(dueDate.getMonth() + schedule.intervalMonths);
          }
        } else {
          // Assume service is due soon for new vehicles
          dueDate = new Date();
          if (schedule.intervalMonths) {
            dueDate.setMonth(dueDate.getMonth() + Math.floor(schedule.intervalMonths / 2));
          }
        }

        if (schedule.intervalKm && vehicle.mileage) {
          dueMileage = vehicle.mileage + Math.floor(schedule.intervalKm / 2);
        }
      }

      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      const kmUntilDue = dueMileage && vehicle.mileage ? dueMileage - vehicle.mileage : undefined;
      const isOverdue = dueDate < now || (kmUntilDue !== undefined && kmUntilDue < 0);

      // Determine priority
      let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      if (isOverdue) {
        priority = daysUntilDue < -30 ? 'CRITICAL' : 'HIGH';
      } else if (daysUntilDue <= 7 || (kmUntilDue !== undefined && kmUntilDue <= 500)) {
        priority = 'HIGH';
      } else if (daysUntilDue <= 30 || (kmUntilDue !== undefined && kmUntilDue <= 2000)) {
        priority = 'MEDIUM';
      } else {
        priority = 'LOW';
      }

      tasks.push({
        id: `${vehicle.id}-${schedule.type}`,
        vehicleId: vehicle.id,
        licensePlate: vehicle.licensePlate,
        make: vehicle.make,
        model: vehicle.model,
        type: schedule.type,
        dueDate,
        dueMileage,
        currentMileage: vehicle.mileage,
        priority,
        estimatedCostEur: schedule.estimatedCostEur,
        estimatedDurationHours: schedule.estimatedDurationHours,
        daysUntilDue,
        kmUntilDue,
        isOverdue,
        lastServiceDate: lastMaintenance?.serviceDate,
      });
    }

    return tasks;
  }

  // =================== MAINTENANCE ALERTS ===================

  async getMaintenanceAlerts(userId: string): Promise<MaintenanceAlert[]> {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId },
      include: {
        maintenanceLogs: {
          orderBy: { serviceDate: 'desc' },
          take: 5,
        },
      },
    });

    const alerts: MaintenanceAlert[] = [];
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    for (const vehicle of vehicles) {
      // TÜV expiry alerts
      if (vehicle.tuvExpiry) {
        const tuvDate = new Date(vehicle.tuvExpiry);
        const daysRemaining = Math.ceil((tuvDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

        if (tuvDate < now) {
          alerts.push({
            vehicleId: vehicle.id,
            licensePlate: vehicle.licensePlate,
            alertType: 'TUV_EXPIRY',
            severity: 'CRITICAL',
            message: `TÜV expired ${Math.abs(daysRemaining)} days ago! Vehicle cannot be legally operated.`,
            dueDate: tuvDate,
            daysRemaining,
          });
        } else if (tuvDate <= in7Days) {
          alerts.push({
            vehicleId: vehicle.id,
            licensePlate: vehicle.licensePlate,
            alertType: 'TUV_EXPIRY',
            severity: 'URGENT',
            message: `TÜV expires in ${daysRemaining} days. Schedule inspection immediately.`,
            dueDate: tuvDate,
            daysRemaining,
          });
        } else if (tuvDate <= in30Days) {
          alerts.push({
            vehicleId: vehicle.id,
            licensePlate: vehicle.licensePlate,
            alertType: 'TUV_EXPIRY',
            severity: 'WARNING',
            message: `TÜV expires in ${daysRemaining} days. Schedule inspection soon.`,
            dueDate: tuvDate,
            daysRemaining,
          });
        }
      }

      // Insurance expiry alerts
      if (vehicle.insuranceExpiry) {
        const insuranceDate = new Date(vehicle.insuranceExpiry);
        const daysRemaining = Math.ceil((insuranceDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

        if (insuranceDate < now) {
          alerts.push({
            vehicleId: vehicle.id,
            licensePlate: vehicle.licensePlate,
            alertType: 'INSURANCE_EXPIRY',
            severity: 'CRITICAL',
            message: `Insurance expired ${Math.abs(daysRemaining)} days ago! Vehicle cannot be legally operated.`,
            dueDate: insuranceDate,
            daysRemaining,
          });
        } else if (insuranceDate <= in14Days) {
          alerts.push({
            vehicleId: vehicle.id,
            licensePlate: vehicle.licensePlate,
            alertType: 'INSURANCE_EXPIRY',
            severity: 'URGENT',
            message: `Insurance expires in ${daysRemaining} days. Renew immediately.`,
            dueDate: insuranceDate,
            daysRemaining,
          });
        } else if (insuranceDate <= in30Days) {
          alerts.push({
            vehicleId: vehicle.id,
            licensePlate: vehicle.licensePlate,
            alertType: 'INSURANCE_EXPIRY',
            severity: 'WARNING',
            message: `Insurance expires in ${daysRemaining} days.`,
            dueDate: insuranceDate,
            daysRemaining,
          });
        }
      }

      // Service due alerts based on next service date
      if (vehicle.nextServiceDate) {
        const serviceDate = new Date(vehicle.nextServiceDate);
        const daysRemaining = Math.ceil((serviceDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

        if (serviceDate < now) {
          alerts.push({
            vehicleId: vehicle.id,
            licensePlate: vehicle.licensePlate,
            alertType: 'SERVICE_DUE',
            severity: 'HIGH' as any,
            message: `Scheduled service is ${Math.abs(daysRemaining)} days overdue.`,
            dueDate: serviceDate,
            daysRemaining,
          });
        } else if (serviceDate <= in7Days) {
          alerts.push({
            vehicleId: vehicle.id,
            licensePlate: vehicle.licensePlate,
            alertType: 'SERVICE_DUE',
            severity: 'WARNING',
            message: `Scheduled service due in ${daysRemaining} days.`,
            dueDate: serviceDate,
            daysRemaining,
          });
        }
      }

      // Mileage-based service alerts
      const tasks = await this.getScheduledMaintenanceForVehicle(vehicle);
      for (const task of tasks) {
        if (task.kmUntilDue !== undefined && task.kmUntilDue < 0) {
          alerts.push({
            vehicleId: vehicle.id,
            licensePlate: vehicle.licensePlate,
            alertType: 'MILEAGE_SERVICE',
            severity: 'WARNING',
            message: `${this.formatMaintenanceType(task.type)} overdue by ${Math.abs(task.kmUntilDue)} km.`,
            daysRemaining: task.daysUntilDue,
          });
        } else if (task.kmUntilDue !== undefined && task.kmUntilDue <= 500) {
          alerts.push({
            vehicleId: vehicle.id,
            licensePlate: vehicle.licensePlate,
            alertType: 'MILEAGE_SERVICE',
            severity: 'INFO',
            message: `${this.formatMaintenanceType(task.type)} due in ${task.kmUntilDue} km.`,
            daysRemaining: task.daysUntilDue,
          });
        }
      }
    }

    // Sort by severity
    const severityOrder = { CRITICAL: 0, URGENT: 1, HIGH: 2, WARNING: 3, INFO: 4 };
    return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }

  // =================== SCHEDULE MAINTENANCE ===================

  async scheduleMaintenanceTask(
    userId: string,
    vehicleId: string,
    options: {
      type: MaintenanceType;
      scheduledDate: Date;
      priority?: MaintenancePriority;
      estimatedCostEur?: number;
      notes?: string;
      serviceProvider?: string;
    },
  ): Promise<any> {
    // Verify vehicle belongs to user
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, userId },
    });

    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    // Update vehicle's next service date
    await this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        nextServiceDate: options.scheduledDate,
      },
    });

    this.logger.log(`Scheduled ${options.type} maintenance for vehicle ${vehicle.licensePlate} on ${options.scheduledDate}`);

    return {
      vehicleId,
      licensePlate: vehicle.licensePlate,
      type: options.type,
      scheduledDate: options.scheduledDate,
      priority: options.priority || 'MEDIUM',
      estimatedCostEur: options.estimatedCostEur,
      notes: options.notes,
      serviceProvider: options.serviceProvider,
    };
  }

  // =================== COMPLETE MAINTENANCE ===================

  async completeMaintenanceTask(
    userId: string,
    taskId: string,
    data: {
      actualCostEur: number;
      notes?: string;
      odometerReading?: number;
      serviceProvider?: string;
      invoiceNumber?: string;
    },
  ): Promise<any> {
    // Parse taskId to get vehicleId and type (format: vehicleId-TYPE)
    const parts = taskId.split('-');
    const maintenanceType = parts.pop() as MaintenanceType;
    const vehicleId = parts.join('-');

    // Verify vehicle belongs to user
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, userId },
    });

    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    // Create maintenance log
    const maintenanceLog = await this.prisma.maintenanceLog.create({
      data: {
        vehicleId,
        type: maintenanceType,
        description: `${this.formatMaintenanceType(maintenanceType)} completed`,
        odometerReading: data.odometerReading,
        totalCost: data.actualCostEur,
        vendorName: data.serviceProvider,
        notes: data.notes ? `${data.notes}${data.invoiceNumber ? ` | Invoice: ${data.invoiceNumber}` : ''}` : data.invoiceNumber ? `Invoice: ${data.invoiceNumber}` : undefined,
        serviceDate: new Date(),
      },
    });

    // Update vehicle
    const updateData: any = {
      lastServiceDate: new Date(),
    };

    if (data.odometerReading) {
      updateData.mileage = data.odometerReading;
    }

    // Calculate next service date based on maintenance type
    const schedule = DEFAULT_MAINTENANCE_SCHEDULES.find(s => s.type === maintenanceType);
    if (schedule?.intervalMonths) {
      const nextService = new Date();
      nextService.setMonth(nextService.getMonth() + schedule.intervalMonths);
      updateData.nextServiceDate = nextService;
    }

    // Special handling for TÜV inspection
    if (maintenanceType === 'TUV_INSPECTION') {
      const newTuvExpiry = new Date();
      newTuvExpiry.setFullYear(newTuvExpiry.getFullYear() + 2);
      updateData.tuvExpiry = newTuvExpiry;
    }

    await this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: updateData,
    });

    this.logger.log(`Completed ${maintenanceType} maintenance for vehicle ${vehicle.licensePlate}`);

    return {
      ...maintenanceLog,
      vehicle: {
        id: vehicle.id,
        licensePlate: vehicle.licensePlate,
        make: vehicle.make,
        model: vehicle.model,
      },
    };
  }

  // =================== MAINTENANCE HISTORY ===================

  async getMaintenanceHistory(
    userId: string,
    vehicleId: string,
    options?: {
      from?: Date;
      to?: Date;
      limit?: number;
    },
  ): Promise<any> {
    const where: any = {
      vehicleId,
      vehicle: { userId },
    };

    if (options?.from || options?.to) {
      where.serviceDate = {};
      if (options.from) where.serviceDate.gte = options.from;
      if (options.to) where.serviceDate.lte = options.to;
    }

    const logs = await this.prisma.maintenanceLog.findMany({
      where,
      include: {
        vehicle: {
          select: {
            id: true,
            licensePlate: true,
            make: true,
            model: true,
          },
        },
      },
      orderBy: { serviceDate: 'desc' },
      take: options?.limit || 100,
    });

    return {
      vehicleId,
      totalRecords: logs.length,
      history: logs.map(log => ({
        id: log.id,
        type: log.type,
        typeLabel: this.formatMaintenanceType(log.type),
        description: log.description,
        serviceDate: log.serviceDate,
        odometerReading: log.odometerReading,
        totalCost: log.totalCost,
        partsCost: log.partsCost,
        laborCost: log.laborCost,
        vendorName: log.vendorName,
        notes: log.notes,
      })),
    };
  }

  // =================== VEHICLE MAINTENANCE SCHEDULE ===================

  async getVehicleMaintenanceSchedule(
    userId: string,
    vehicleId: string,
  ): Promise<any> {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, userId },
      include: {
        maintenanceLogs: {
          orderBy: { serviceDate: 'desc' },
        },
      },
    });

    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    const tasks = await this.getScheduledMaintenanceForVehicle(vehicle);
    const alerts = (await this.getMaintenanceAlerts(userId)).filter(
      a => a.vehicleId === vehicleId,
    );

    // Calculate next 12 months cost forecast for this vehicle
    const now = new Date();
    const forecast: Array<{ month: string; estimatedCostEur: number; tasks: string[] }> = [];

    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthKey = date.toISOString().slice(0, 7);
      const monthTasks = tasks.filter(t => t.dueDate.toISOString().slice(0, 7) === monthKey);

      forecast.push({
        month: monthKey,
        estimatedCostEur: monthTasks.reduce((sum, t) => sum + (t.estimatedCostEur || 0), 0),
        tasks: monthTasks.map(t => this.formatMaintenanceType(t.type)),
      });
    }

    return {
      vehicle: {
        id: vehicle.id,
        licensePlate: vehicle.licensePlate,
        make: vehicle.make,
        model: vehicle.model,
        mileage: vehicle.mileage,
        tuvExpiry: vehicle.tuvExpiry,
        insuranceExpiry: vehicle.insuranceExpiry,
        lastServiceDate: vehicle.lastServiceDate,
        nextServiceDate: vehicle.nextServiceDate,
      },
      scheduledTasks: tasks,
      alerts,
      recentHistory: vehicle.maintenanceLogs.slice(0, 5).map(log => ({
        id: log.id,
        type: log.type,
        typeLabel: this.formatMaintenanceType(log.type),
        serviceDate: log.serviceDate,
        totalCost: log.totalCost,
      })),
      costForecast: forecast,
      summary: {
        totalScheduledTasks: tasks.length,
        overdueTasks: tasks.filter(t => t.isOverdue).length,
        upcomingTasks30Days: tasks.filter(t => !t.isOverdue && t.daysUntilDue <= 30).length,
        estimatedYearCost: tasks.reduce((sum, t) => sum + (t.estimatedCostEur || 0), 0),
      },
    };
  }

  // =================== MAINTENANCE COST FORECAST ===================

  async getMaintenanceCostForecast(
    userId: string,
    months: number = 12,
  ): Promise<Array<{
    month: string;
    estimatedCostEur: number;
    maintenanceCount: number;
    details: Array<{ vehiclePlate: string; type: string; cost: number }>;
  }>> {
    const tasks = await this.getAllScheduledMaintenance(userId, {
      includeOverdue: true,
      daysAhead: months * 31,
    });

    const forecast: Map<string, {
      cost: number;
      count: number;
      details: Array<{ vehiclePlate: string; type: string; cost: number }>;
    }> = new Map();

    // Initialize months
    const now = new Date();
    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = date.toISOString().slice(0, 7); // YYYY-MM
      forecast.set(key, { cost: 0, count: 0, details: [] });
    }

    for (const task of tasks) {
      const monthKey = task.dueDate.toISOString().slice(0, 7);
      const existing = forecast.get(monthKey);

      if (existing) {
        existing.cost += task.estimatedCostEur || 0;
        existing.count++;
        existing.details.push({
          vehiclePlate: task.licensePlate,
          type: this.formatMaintenanceType(task.type),
          cost: task.estimatedCostEur || 0,
        });
      }
    }

    return Array.from(forecast.entries()).map(([month, data]) => ({
      month,
      estimatedCostEur: Math.round(data.cost * 100) / 100,
      maintenanceCount: data.count,
      details: data.details,
    }));
  }

  // =================== UTILITIES ===================

  private formatMaintenanceType(type: MaintenanceType): string {
    const labels: Record<MaintenanceType, string> = {
      OIL_CHANGE: 'Oil Change',
      BRAKE_SERVICE: 'Brake Service',
      TIRE_ROTATION: 'Tire Rotation',
      SCHEDULED_SERVICE: 'Scheduled Service',
      TUV_INSPECTION: 'TÜV Inspection',
      REPAIR: 'Repair',
      UNSCHEDULED_REPAIR: 'Unscheduled Repair',
      CLEANING: 'Cleaning',
      OTHER: 'Other',
    };
    return labels[type] || type;
  }
}
