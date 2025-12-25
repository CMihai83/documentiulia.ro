import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DeliveryStopStatus, RouteStatus } from '@prisma/client';

/**
 * Enhanced Mobile Driver API Service
 * Additional features for the Munich delivery fleet mobile app.
 *
 * Features:
 * - Break management (start/end, track time)
 * - Parcel scanning and verification
 * - Vehicle inspection checklists (pre/post trip)
 * - Daily summary statistics
 * - Offline queue sync
 * - Delivery feedback/rating integration
 */

export interface BreakEntry {
  id: string;
  driverId: string;
  timesheetId: string;
  startTime: Date;
  endTime: Date | null;
  type: 'LUNCH' | 'REST' | 'OTHER';
  durationMinutes: number | null;
}

export interface ParcelScan {
  trackingNumber: string;
  stopId: string;
  scannedAt: Date;
  verified: boolean;
  status: 'MATCHED' | 'NOT_FOUND' | 'WRONG_STOP';
}

export interface InspectionItem {
  id: string;
  category: string;
  item: string;
  required: boolean;
  passed: boolean | null;
  notes: string | null;
}

export interface VehicleInspection {
  id: string;
  vehicleId: string;
  driverId: string;
  type: 'PRE_TRIP' | 'POST_TRIP';
  date: Date;
  overallPass: boolean;
  mileageReading: number;
  items: InspectionItem[];
  notes: string | null;
}

export interface OfflineQueueItem {
  id: string;
  operation: 'LOCATION' | 'DELIVERY' | 'SCAN' | 'SIGNATURE';
  payload: any;
  createdAt: Date;
  synced: boolean;
  syncedAt: Date | null;
  error: string | null;
}

export interface DailySummary {
  date: Date;
  driverId: string;
  driverName: string;
  route: {
    id: string;
    name: string;
    status: string;
  } | null;
  metrics: {
    totalStops: number;
    deliveredStops: number;
    failedStops: number;
    skippedStops: number;
    successRate: number;
    totalDistance: number;
    totalTime: number;
    avgTimePerStop: number;
  };
  breaks: {
    totalBreakTime: number;
    breakCount: number;
  };
  fuel: {
    litersUsed: number;
    cost: number;
  };
  alerts: string[];
}

@Injectable()
export class DriverMobileEnhancedService {
  private readonly logger = new Logger(DriverMobileEnhancedService.name);

  // In-memory storage for demo (would be in Prisma schema in production)
  private breaks: Map<string, BreakEntry[]> = new Map();
  private inspections: Map<string, VehicleInspection[]> = new Map();
  private offlineQueues: Map<string, OfflineQueueItem[]> = new Map();
  private parcelScans: Map<string, ParcelScan[]> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  // =================== BREAK MANAGEMENT ===================

  /**
   * Start a break
   */
  async startBreak(
    driverId: string,
    type: 'LUNCH' | 'REST' | 'OTHER',
  ): Promise<BreakEntry> {
    // Get active timesheet
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const employee = await this.prisma.employee.findFirst({
      where: { id: driverId },
    });

    if (!employee) {
      throw new NotFoundException('Driver not found');
    }

    const timesheet = await this.prisma.timesheet.findFirst({
      where: {
        employeeId: driverId,
        date: today,
        status: 'PENDING',
      },
    });

    if (!timesheet) {
      throw new BadRequestException('Kein aktiver Dienst. Bitte erst einstempeln.');
    }

    // Check for existing active break
    const driverBreaks = this.breaks.get(driverId) || [];
    const activeBreak = driverBreaks.find(b => b.endTime === null);

    if (activeBreak) {
      throw new BadRequestException('Bereits in einer Pause. Bitte erst beenden.');
    }

    const breakEntry: BreakEntry = {
      id: `break-${Date.now()}`,
      driverId,
      timesheetId: timesheet.id,
      startTime: new Date(),
      endTime: null,
      type,
      durationMinutes: null,
    };

    driverBreaks.push(breakEntry);
    this.breaks.set(driverId, driverBreaks);

    this.logger.log(`Driver ${driverId} started ${type} break`);

    return breakEntry;
  }

  /**
   * End a break
   */
  async endBreak(driverId: string): Promise<BreakEntry> {
    const driverBreaks = this.breaks.get(driverId) || [];
    const activeBreak = driverBreaks.find(b => b.endTime === null);

    if (!activeBreak) {
      throw new BadRequestException('Keine aktive Pause gefunden.');
    }

    activeBreak.endTime = new Date();
    activeBreak.durationMinutes = Math.round(
      (activeBreak.endTime.getTime() - activeBreak.startTime.getTime()) / (1000 * 60),
    );

    this.breaks.set(driverId, driverBreaks);

    this.logger.log(
      `Driver ${driverId} ended break. Duration: ${activeBreak.durationMinutes} minutes`,
    );

    return activeBreak;
  }

  /**
   * Get today's breaks for a driver
   */
  async getTodayBreaks(driverId: string): Promise<{
    breaks: BreakEntry[];
    totalMinutes: number;
    activeBreak: BreakEntry | null;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const driverBreaks = (this.breaks.get(driverId) || []).filter(
      b => b.startTime >= today,
    );

    const totalMinutes = driverBreaks
      .filter(b => b.durationMinutes !== null)
      .reduce((sum, b) => sum + (b.durationMinutes || 0), 0);

    const activeBreak = driverBreaks.find(b => b.endTime === null) || null;

    return {
      breaks: driverBreaks,
      totalMinutes,
      activeBreak,
    };
  }

  // =================== PARCEL SCANNING ===================

  /**
   * Scan a parcel at a delivery stop
   */
  async scanParcel(
    stopId: string,
    trackingNumber: string,
  ): Promise<ParcelScan> {
    // Find the stop
    const stop = await this.prisma.deliveryStop.findUnique({
      where: { id: stopId },
    });

    if (!stop) {
      throw new NotFoundException('Stop not found');
    }

    // Check if tracking number matches this stop
    const isMatch = stop.trackingNumbers.includes(trackingNumber);

    const scan: ParcelScan = {
      trackingNumber,
      stopId,
      scannedAt: new Date(),
      verified: isMatch,
      status: isMatch ? 'MATCHED' : 'NOT_FOUND',
    };

    // If not matched at this stop, check if it belongs to another stop on the route
    if (!isMatch) {
      const otherStops = await this.prisma.deliveryStop.findMany({
        where: {
          routeId: stop.routeId,
          trackingNumbers: { has: trackingNumber },
        },
      });

      if (otherStops.length > 0) {
        scan.status = 'WRONG_STOP';
      }
    }

    // Store scan
    const stopScans = this.parcelScans.get(stopId) || [];
    stopScans.push(scan);
    this.parcelScans.set(stopId, stopScans);

    return scan;
  }

  /**
   * Verify all parcels for a stop
   */
  async verifyStopParcels(stopId: string): Promise<{
    stop: any;
    scans: ParcelScan[];
    allVerified: boolean;
    missingParcels: string[];
  }> {
    const stop = await this.prisma.deliveryStop.findUnique({
      where: { id: stopId },
    });

    if (!stop) {
      throw new NotFoundException('Stop not found');
    }

    const scans = this.parcelScans.get(stopId) || [];
    const verifiedTrackingNumbers = scans
      .filter(s => s.verified)
      .map(s => s.trackingNumber);

    const missingParcels = stop.trackingNumbers.filter(
      tn => !verifiedTrackingNumbers.includes(tn),
    );

    const allVerified = missingParcels.length === 0;

    return {
      stop,
      scans,
      allVerified,
      missingParcels,
    };
  }

  // =================== VEHICLE INSPECTION ===================

  /**
   * Get inspection checklist template
   */
  getInspectionChecklist(type: 'PRE_TRIP' | 'POST_TRIP'): InspectionItem[] {
    const baseItems: InspectionItem[] = [
      // Außenprüfung
      { id: 'ext-1', category: 'Außen', item: 'Reifen und Reifendruck', required: true, passed: null, notes: null },
      { id: 'ext-2', category: 'Außen', item: 'Beleuchtung vorne/hinten', required: true, passed: null, notes: null },
      { id: 'ext-3', category: 'Außen', item: 'Blinker und Warnblinkanlage', required: true, passed: null, notes: null },
      { id: 'ext-4', category: 'Außen', item: 'Spiegel (links/rechts)', required: true, passed: null, notes: null },
      { id: 'ext-5', category: 'Außen', item: 'Karosserie (Schäden)', required: true, passed: null, notes: null },
      { id: 'ext-6', category: 'Außen', item: 'Kennzeichen lesbar', required: true, passed: null, notes: null },

      // Innenprüfung
      { id: 'int-1', category: 'Innen', item: 'Bremsen', required: true, passed: null, notes: null },
      { id: 'int-2', category: 'Innen', item: 'Lenkung', required: true, passed: null, notes: null },
      { id: 'int-3', category: 'Innen', item: 'Sicherheitsgurt', required: true, passed: null, notes: null },
      { id: 'int-4', category: 'Innen', item: 'Hupe', required: true, passed: null, notes: null },
      { id: 'int-5', category: 'Innen', item: 'Wischer/Scheibenwischer', required: true, passed: null, notes: null },
      { id: 'int-6', category: 'Innen', item: 'Heizung/Klimaanlage', required: false, passed: null, notes: null },

      // Flüssigkeiten
      { id: 'fluid-1', category: 'Flüssigkeiten', item: 'Motorölstand', required: true, passed: null, notes: null },
      { id: 'fluid-2', category: 'Flüssigkeiten', item: 'Kühlwasser', required: true, passed: null, notes: null },
      { id: 'fluid-3', category: 'Flüssigkeiten', item: 'Scheibenwischwasser', required: true, passed: null, notes: null },
      { id: 'fluid-4', category: 'Flüssigkeiten', item: 'Kraftstoff', required: true, passed: null, notes: null },

      // Sicherheit
      { id: 'saf-1', category: 'Sicherheit', item: 'Warndreieck vorhanden', required: true, passed: null, notes: null },
      { id: 'saf-2', category: 'Sicherheit', item: 'Verbandskasten vorhanden/gültig', required: true, passed: null, notes: null },
      { id: 'saf-3', category: 'Sicherheit', item: 'Feuerlöscher', required: false, passed: null, notes: null },

      // Laderaum
      { id: 'cargo-1', category: 'Laderaum', item: 'Laderaum sauber', required: true, passed: null, notes: null },
      { id: 'cargo-2', category: 'Laderaum', item: 'Türen schließen ordentlich', required: true, passed: null, notes: null },
    ];

    if (type === 'POST_TRIP') {
      baseItems.push(
        { id: 'post-1', category: 'Ende der Schicht', item: 'Fahrzeug gereinigt', required: false, passed: null, notes: null },
        { id: 'post-2', category: 'Ende der Schicht', item: 'Kraftstoff aufgefüllt', required: false, passed: null, notes: null },
        { id: 'post-3', category: 'Ende der Schicht', item: 'Neue Schäden gemeldet', required: true, passed: null, notes: null },
      );
    }

    return baseItems;
  }

  /**
   * Submit vehicle inspection
   */
  async submitInspection(
    driverId: string,
    vehicleId: string,
    type: 'PRE_TRIP' | 'POST_TRIP',
    mileageReading: number,
    items: { id: string; passed: boolean; notes?: string }[],
    generalNotes?: string,
  ): Promise<VehicleInspection> {
    // Get checklist template
    const checklist = this.getInspectionChecklist(type);

    // Map submitted items to checklist
    const inspectionItems: InspectionItem[] = checklist.map(item => {
      const submitted = items.find(i => i.id === item.id);
      return {
        ...item,
        passed: submitted?.passed ?? null,
        notes: submitted?.notes ?? null,
      };
    });

    // Check if all required items passed
    const requiredItems = inspectionItems.filter(i => i.required);
    const overallPass = requiredItems.every(i => i.passed === true);

    const inspection: VehicleInspection = {
      id: `insp-${Date.now()}`,
      vehicleId,
      driverId,
      type,
      date: new Date(),
      overallPass,
      mileageReading,
      items: inspectionItems,
      notes: generalNotes || null,
    };

    // Store inspection
    const vehicleInspections = this.inspections.get(vehicleId) || [];
    vehicleInspections.push(inspection);
    this.inspections.set(vehicleId, vehicleInspections);

    // Update vehicle mileage
    await this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: { mileage: mileageReading },
    }).catch(() => {});

    // If failed, log warning
    if (!overallPass) {
      const failedItems = requiredItems.filter(i => i.passed === false);
      this.logger.warn(
        `Vehicle ${vehicleId} failed ${type} inspection. Failed items: ${failedItems.map(i => i.item).join(', ')}`,
      );
    }

    return inspection;
  }

  /**
   * Get vehicle inspection history
   */
  async getInspectionHistory(vehicleId: string, limit: number = 10): Promise<VehicleInspection[]> {
    const inspections = this.inspections.get(vehicleId) || [];
    return inspections.slice(-limit).reverse();
  }

  // =================== OFFLINE QUEUE SYNC ===================

  /**
   * Queue an offline operation
   */
  queueOfflineOperation(
    driverId: string,
    operation: 'LOCATION' | 'DELIVERY' | 'SCAN' | 'SIGNATURE',
    payload: any,
  ): OfflineQueueItem {
    const item: OfflineQueueItem = {
      id: `queue-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      operation,
      payload,
      createdAt: new Date(),
      synced: false,
      syncedAt: null,
      error: null,
    };

    const queue = this.offlineQueues.get(driverId) || [];
    queue.push(item);
    this.offlineQueues.set(driverId, queue);

    return item;
  }

  /**
   * Process offline queue
   */
  async syncOfflineQueue(driverId: string): Promise<{
    processed: number;
    failed: number;
    remaining: number;
    errors: { id: string; error: string }[];
  }> {
    const queue = this.offlineQueues.get(driverId) || [];
    const pending = queue.filter(q => !q.synced);

    let processed = 0;
    let failed = 0;
    const errors: { id: string; error: string }[] = [];

    for (const item of pending) {
      try {
        // Process based on operation type
        switch (item.operation) {
          case 'LOCATION':
            await this.prisma.vehicle.update({
              where: { id: item.payload.vehicleId },
              data: {
                currentLat: item.payload.latitude,
                currentLng: item.payload.longitude,
                lastLocationAt: new Date(item.payload.timestamp),
              },
            });
            break;

          case 'DELIVERY':
            await this.prisma.deliveryStop.update({
              where: { id: item.payload.stopId },
              data: {
                status: item.payload.status,
                completedAt: new Date(item.payload.timestamp),
                signature: item.payload.signature,
                photoUrl: item.payload.photo,
                recipientNote: item.payload.note,
              },
            });
            break;

          case 'SCAN':
            // Parcel scans are stored in memory
            await this.scanParcel(item.payload.stopId, item.payload.trackingNumber);
            break;

          case 'SIGNATURE':
            await this.prisma.deliveryStop.update({
              where: { id: item.payload.stopId },
              data: {
                signature: item.payload.signatureData,
              },
            });
            break;
        }

        item.synced = true;
        item.syncedAt = new Date();
        processed++;
      } catch (error: any) {
        item.error = error.message;
        failed++;
        errors.push({ id: item.id, error: error.message });
      }
    }

    this.offlineQueues.set(driverId, queue);

    const remaining = queue.filter(q => !q.synced).length;

    return { processed, failed, remaining, errors };
  }

  /**
   * Get queue status
   */
  getQueueStatus(driverId: string): {
    pending: number;
    synced: number;
    failed: number;
    oldestPending: Date | null;
  } {
    const queue = this.offlineQueues.get(driverId) || [];

    const pending = queue.filter(q => !q.synced && !q.error);
    const synced = queue.filter(q => q.synced);
    const failed = queue.filter(q => q.error);

    const oldestPending = pending.length > 0
      ? pending.reduce((oldest, q) => q.createdAt < oldest.createdAt ? q : oldest).createdAt
      : null;

    return {
      pending: pending.length,
      synced: synced.length,
      failed: failed.length,
      oldestPending,
    };
  }

  // =================== DAILY SUMMARY ===================

  /**
   * Get daily summary for a driver
   */
  async getDailySummary(driverId: string, date?: Date): Promise<DailySummary> {
    const targetDate = date || new Date();
    targetDate.setHours(0, 0, 0, 0);

    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    // Get driver info
    const employee = await this.prisma.employee.findFirst({
      where: { id: driverId },
    });

    if (!employee) {
      throw new NotFoundException('Driver not found');
    }

    // Get route for the day
    const route = await this.prisma.deliveryRoute.findFirst({
      where: {
        driverId,
        routeDate: targetDate,
      },
      include: {
        stops: true,
      },
    });

    // Calculate metrics
    const totalStops = route?.stops.length || 0;
    const deliveredStops = route?.stops.filter(s => s.status === DeliveryStopStatus.DELIVERED).length || 0;
    const failedStops = route?.stops.filter(s => s.status === DeliveryStopStatus.FAILED).length || 0;
    const skippedStops = route?.stops.filter(s => s.status === 'ATTEMPTED').length || 0;
    const successRate = totalStops > 0 ? Math.round((deliveredStops / totalStops) * 100) : 0;

    // Calculate time
    let totalTime = 0;
    if (route?.actualStartTime && route?.actualEndTime) {
      totalTime = Math.round(
        (route.actualEndTime.getTime() - route.actualStartTime.getTime()) / (1000 * 60),
      );
    }

    const avgTimePerStop = totalStops > 0 ? Math.round(totalTime / totalStops) : 0;

    // Get breaks
    const breaks = await this.getTodayBreaks(driverId);

    // Get fuel logs
    const fuelLogs = await this.prisma.fuelLog.findMany({
      where: {
        driverId,
        fueledAt: { gte: targetDate, lt: nextDate },
      },
    });

    const litersUsed = fuelLogs.reduce((sum, log) => sum + log.liters.toNumber(), 0);
    const fuelCost = fuelLogs.reduce((sum, log) => sum + log.totalCost.toNumber(), 0);

    // Build alerts
    const alerts: string[] = [];

    if (successRate < 90) {
      alerts.push(`Erfolgsquote unter 90% (${successRate}%)`);
    }
    if (failedStops > 3) {
      alerts.push(`${failedStops} fehlgeschlagene Zustellungen`);
    }
    if (breaks.totalMinutes < 30 && totalTime > 360) {
      alerts.push('Zu wenig Pausen. Bitte Ruhezeiten einhalten.');
    }

    return {
      date: targetDate,
      driverId,
      driverName: `${employee.firstName} ${employee.lastName}`,
      route: route ? {
        id: route.id,
        name: route.routeName || `Route ${route.id.slice(-6)}`,
        status: route.status,
      } : null,
      metrics: {
        totalStops,
        deliveredStops,
        failedStops,
        skippedStops,
        successRate,
        totalDistance: route?.actualDistanceKm?.toNumber() || 0,
        totalTime,
        avgTimePerStop,
      },
      breaks: {
        totalBreakTime: breaks.totalMinutes,
        breakCount: breaks.breaks.length,
      },
      fuel: {
        litersUsed,
        cost: Math.round(fuelCost * 100) / 100,
      },
      alerts,
    };
  }

  // =================== CUSTOMER RATING LINK ===================

  /**
   * Generate customer rating link for a delivery
   */
  generateRatingLink(stopId: string, trackingNumber: string): string {
    // Generate a unique token for the rating link
    const token = Buffer.from(`${stopId}:${trackingNumber}:${Date.now()}`)
      .toString('base64')
      .replace(/[+/=]/g, '');

    // In production, this would be the actual domain
    return `https://app.documentiulia.ro/rate/${token}`;
  }

  /**
   * Get pending feedback for deliveries
   */
  async getPendingFeedback(driverId: string): Promise<{
    totalDeliveries: number;
    ratingsReceived: number;
    averageRating: number;
    pendingFeedback: number;
  }> {
    // Get all completed deliveries
    const completedStops = await this.prisma.deliveryStop.findMany({
      where: {
        route: { driverId },
        status: DeliveryStopStatus.DELIVERED,
      },
      take: 100,
      orderBy: { completedAt: 'desc' },
    });

    // In production, this would check actual ratings from a CustomerFeedback table
    const totalDeliveries = completedStops.length;
    const ratingsReceived = Math.floor(totalDeliveries * 0.3); // Simulate 30% response rate
    const averageRating = 4.5; // Simulated
    const pendingFeedback = totalDeliveries - ratingsReceived;

    return {
      totalDeliveries,
      ratingsReceived,
      averageRating,
      pendingFeedback,
    };
  }

  // =================== MESSAGES & ANNOUNCEMENTS ===================

  /**
   * Get driver announcements (from dispatch)
   */
  async getAnnouncements(driverId: string): Promise<{
    unread: number;
    messages: {
      id: string;
      type: 'INFO' | 'WARNING' | 'URGENT';
      title: string;
      body: string;
      createdAt: Date;
      read: boolean;
    }[];
  }> {
    // In production, this would fetch from a Messages table
    // For now, return sample announcements
    const messages = [
      {
        id: 'msg-1',
        type: 'INFO' as const,
        title: 'Neue Lieferzone hinzugefügt',
        body: 'Ab morgen werden Lieferungen in München-Trudering aufgenommen.',
        createdAt: new Date(Date.now() - 86400000),
        read: true,
      },
      {
        id: 'msg-2',
        type: 'WARNING' as const,
        title: 'Baustelle Leopoldstraße',
        body: 'Bitte alternative Routen über die Schleißheimer Str. nutzen.',
        createdAt: new Date(Date.now() - 3600000),
        read: false,
      },
    ];

    const unread = messages.filter(m => !m.read).length;

    return { unread, messages };
  }
}
