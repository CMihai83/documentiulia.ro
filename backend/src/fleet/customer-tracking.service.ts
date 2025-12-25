import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Customer Tracking Portal Service
 * Public-facing API for customers to track their deliveries.
 *
 * Features:
 * - Track delivery by tracking number (no auth required)
 * - Get estimated delivery time
 * - View delivery history
 * - Set delivery preferences
 * - Rate delivery experience
 *
 * German localization for Munich delivery operations.
 */

export interface TrackingResult {
  trackingNumber: string;
  status: DeliveryTrackingStatus;
  statusMessage: string;
  estimatedDelivery: Date | null;
  actualDelivery: Date | null;
  recipientName: string;
  deliveryAddress: {
    street: string;
    postalCode: string;
    city: string;
  };
  timeline: TrackingEvent[];
  proofOfDelivery: {
    hasSignature: boolean;
    hasPhoto: boolean;
    signedBy: string | null;
  } | null;
  driverInfo: {
    name: string;
    vehiclePlate: string;
  } | null;
}

export type DeliveryTrackingStatus =
  | 'PENDING'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED'
  | 'RESCHEDULED'
  | 'RETURNED';

export interface TrackingEvent {
  timestamp: Date;
  status: string;
  description: string;
  location: string | null;
}

export interface DeliveryPreference {
  leaveAtDoor: boolean;
  leaveWithNeighbor: boolean;
  preferredTimeWindow: string | null;
  specialInstructions: string | null;
  alternativeRecipient: string | null;
}

export interface DeliveryRating {
  overallRating: number; // 1-5
  punctualityRating: number; // 1-5
  driverRating: number; // 1-5
  conditionRating: number; // 1-5
  comment: string | null;
}

// German status messages
const STATUS_MESSAGES: Record<DeliveryTrackingStatus, { de: string; en: string }> = {
  PENDING: {
    de: 'Sendung wurde registriert und wird bald abgeholt',
    en: 'Shipment registered and will be picked up soon',
  },
  IN_TRANSIT: {
    de: 'Sendung ist unterwegs zum Liefergebiet',
    en: 'Shipment is in transit to delivery area',
  },
  OUT_FOR_DELIVERY: {
    de: 'Sendung ist zur Zustellung unterwegs',
    en: 'Shipment is out for delivery',
  },
  DELIVERED: {
    de: 'Sendung wurde erfolgreich zugestellt',
    en: 'Shipment has been delivered successfully',
  },
  FAILED: {
    de: 'Zustellung fehlgeschlagen - Neuer Versuch wird geplant',
    en: 'Delivery failed - New attempt will be scheduled',
  },
  RESCHEDULED: {
    de: 'Zustellung wurde auf neuen Termin verschoben',
    en: 'Delivery has been rescheduled',
  },
  RETURNED: {
    de: 'Sendung wird an Absender zurückgeschickt',
    en: 'Shipment is being returned to sender',
  },
};

@Injectable()
export class CustomerTrackingService {
  private readonly logger = new Logger(CustomerTrackingService.name);

  // In-memory storage for preferences and ratings (in production, add to Prisma schema)
  private deliveryPreferences: Map<string, DeliveryPreference> = new Map();
  private deliveryRatings: Map<string, DeliveryRating> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Track a delivery by tracking number (public, no auth required)
   */
  async trackDelivery(
    trackingNumber: string,
    language: 'de' | 'en' = 'de',
  ): Promise<TrackingResult> {
    this.logger.log(`Tracking delivery: ${trackingNumber}`);

    // Find the delivery stop by tracking number
    const stop = await this.prisma.deliveryStop.findFirst({
      where: {
        trackingNumbers: { has: trackingNumber },
      },
      include: {
        route: {
          include: {
            driver: { select: { firstName: true, lastName: true } },
            vehicle: { select: { licensePlate: true } },
          },
        },
      },
    });

    if (!stop) {
      throw new NotFoundException(
        language === 'de'
          ? `Sendung mit Tracking-Nummer ${trackingNumber} nicht gefunden`
          : `Shipment with tracking number ${trackingNumber} not found`,
      );
    }

    // Map stop status to tracking status
    const trackingStatus = this.mapStopStatusToTrackingStatus(
      stop.status,
      stop.route?.status,
    );

    // Build timeline of events
    const timeline = this.buildTimeline(stop, stop.route, language);

    // Get POD info if delivered
    // signedBy is extracted from recipientNote (format: "Signed by: Name")
    const extractSignedBy = (note: string | null): string | null => {
      if (!note) return null;
      const match = note.match(/Signed by:\s*([^|]+)/);
      return match ? match[1].trim() : null;
    };

    const proofOfDelivery =
      stop.status === 'DELIVERED'
        ? {
            hasSignature: !!stop.signature,
            hasPhoto: !!stop.photoUrl,
            signedBy: extractSignedBy(stop.recipientNote) || null,
          }
        : null;

    // Get driver info if route is active
    const driverInfo =
      stop.route?.status === 'IN_PROGRESS' && stop.route.driver
        ? {
            name: `${stop.route.driver.firstName} ${stop.route.driver.lastName.charAt(0)}.`,
            vehiclePlate: stop.route.vehicle?.licensePlate || '',
          }
        : null;

    return {
      trackingNumber,
      status: trackingStatus,
      statusMessage: STATUS_MESSAGES[trackingStatus][language],
      estimatedDelivery: stop.estimatedArrival,
      actualDelivery: stop.completedAt,
      recipientName: stop.recipientName,
      deliveryAddress: {
        street: stop.streetAddress,
        postalCode: stop.postalCode,
        city: stop.city,
      },
      timeline,
      proofOfDelivery,
      driverInfo,
    };
  }

  /**
   * Track multiple deliveries at once
   */
  async trackMultiple(
    trackingNumbers: string[],
    language: 'de' | 'en' = 'de',
  ): Promise<Map<string, TrackingResult | { error: string }>> {
    const results = new Map<string, TrackingResult | { error: string }>();

    for (const trackingNumber of trackingNumbers) {
      try {
        const result = await this.trackDelivery(trackingNumber, language);
        results.set(trackingNumber, result);
      } catch (error) {
        results.set(trackingNumber, {
          error:
            error instanceof NotFoundException
              ? (error as NotFoundException).message
              : 'Tracking failed',
        });
      }
    }

    return results;
  }

  /**
   * Get estimated delivery time for a tracking number
   */
  async getEstimatedDeliveryTime(
    trackingNumber: string,
  ): Promise<{
    estimatedTime: Date | null;
    timeWindow: { start: Date; end: Date } | null;
    position: number | null;
    remainingStops: number | null;
  }> {
    const stop = await this.prisma.deliveryStop.findFirst({
      where: { trackingNumbers: { has: trackingNumber } },
      include: {
        route: {
          include: {
            stops: {
              where: { status: 'PENDING' },
              orderBy: { stopOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!stop) {
      throw new NotFoundException(`Tracking number ${trackingNumber} not found`);
    }

    // If already delivered
    if (stop.status === 'DELIVERED') {
      return {
        estimatedTime: stop.completedAt,
        timeWindow: null,
        position: null,
        remainingStops: null,
      };
    }

    // Calculate position in route
    const pendingStops = stop.route?.stops || [];
    const position = pendingStops.findIndex(s => s.id === stop.id) + 1;
    const remainingStops = position > 0 ? position : null;

    // Calculate time window (30 min before to 1 hour after estimated)
    let timeWindow = null;
    if (stop.estimatedArrival) {
      const start = new Date(stop.estimatedArrival.getTime() - 30 * 60 * 1000);
      const end = new Date(stop.estimatedArrival.getTime() + 60 * 60 * 1000);
      timeWindow = { start, end };
    }

    return {
      estimatedTime: stop.estimatedArrival,
      timeWindow,
      position,
      remainingStops: pendingStops.length,
    };
  }

  /**
   * Set delivery preferences for a tracking number
   */
  async setDeliveryPreferences(
    trackingNumber: string,
    preferences: Partial<DeliveryPreference>,
  ): Promise<DeliveryPreference> {
    // Verify tracking number exists
    const stop = await this.prisma.deliveryStop.findFirst({
      where: { trackingNumbers: { has: trackingNumber } },
    });

    if (!stop) {
      throw new NotFoundException(`Tracking number ${trackingNumber} not found`);
    }

    // Don't allow changes for completed deliveries
    if (stop.status === 'DELIVERED' || stop.status === 'FAILED') {
      throw new BadRequestException('Cannot modify preferences for completed deliveries');
    }

    const existingPrefs = this.deliveryPreferences.get(trackingNumber) || {
      leaveAtDoor: false,
      leaveWithNeighbor: false,
      preferredTimeWindow: null,
      specialInstructions: null,
      alternativeRecipient: null,
    };

    const updatedPrefs: DeliveryPreference = {
      ...existingPrefs,
      ...preferences,
    };

    this.deliveryPreferences.set(trackingNumber, updatedPrefs);

    // Update special instructions in the stop if provided
    if (preferences.specialInstructions) {
      await this.prisma.deliveryStop.update({
        where: { id: stop.id },
        data: { recipientNote: preferences.specialInstructions },
      });
    }

    this.logger.log(`Preferences updated for ${trackingNumber}`);
    return updatedPrefs;
  }

  /**
   * Get delivery preferences for a tracking number
   */
  async getDeliveryPreferences(trackingNumber: string): Promise<DeliveryPreference | null> {
    return this.deliveryPreferences.get(trackingNumber) || null;
  }

  /**
   * Submit delivery rating
   */
  async submitRating(
    trackingNumber: string,
    rating: DeliveryRating,
  ): Promise<{ success: boolean; message: string }> {
    // Verify tracking number exists and is delivered
    const stop = await this.prisma.deliveryStop.findFirst({
      where: { trackingNumbers: { has: trackingNumber } },
    });

    if (!stop) {
      throw new NotFoundException(`Tracking number ${trackingNumber} not found`);
    }

    if (stop.status !== 'DELIVERED') {
      throw new BadRequestException('Can only rate delivered shipments');
    }

    // Validate ratings
    const ratings = [
      rating.overallRating,
      rating.punctualityRating,
      rating.driverRating,
      rating.conditionRating,
    ];
    if (ratings.some(r => r < 1 || r > 5)) {
      throw new BadRequestException('Ratings must be between 1 and 5');
    }

    // Check if already rated
    if (this.deliveryRatings.has(trackingNumber)) {
      throw new BadRequestException('This delivery has already been rated');
    }

    this.deliveryRatings.set(trackingNumber, rating);
    this.logger.log(`Rating submitted for ${trackingNumber}: ${rating.overallRating}/5`);

    return {
      success: true,
      message: 'Vielen Dank für Ihre Bewertung!', // "Thank you for your rating!"
    };
  }

  /**
   * Get delivery history for an email/phone (requires verification token)
   */
  async getDeliveryHistory(
    email: string,
    limit: number = 20,
  ): Promise<Array<{
    trackingNumber: string;
    status: DeliveryTrackingStatus;
    deliveryDate: Date | null;
    recipientName: string;
    address: string;
  }>> {
    const stops = await this.prisma.deliveryStop.findMany({
      where: {
        recipientEmail: email,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        trackingNumbers: true,
        status: true,
        completedAt: true,
        recipientName: true,
        streetAddress: true,
        postalCode: true,
        city: true,
      },
    });

    return stops.map(stop => ({
      trackingNumber: stop.trackingNumbers?.[0] || 'N/A',
      status: this.mapStopStatusToTrackingStatus(stop.status, null),
      deliveryDate: stop.completedAt,
      recipientName: stop.recipientName,
      address: `${stop.streetAddress}, ${stop.postalCode} ${stop.city}`,
    }));
  }

  /**
   * Request delivery reschedule
   */
  async requestReschedule(
    trackingNumber: string,
    preferredDate: Date,
    preferredTimeWindow?: string,
    reason?: string,
  ): Promise<{ success: boolean; message: string; newEstimate: Date | null }> {
    const stop = await this.prisma.deliveryStop.findFirst({
      where: { trackingNumbers: { has: trackingNumber } },
    });

    if (!stop) {
      throw new NotFoundException(`Tracking number ${trackingNumber} not found`);
    }

    if (stop.status === 'DELIVERED') {
      throw new BadRequestException('Cannot reschedule a delivered shipment');
    }

    // Validate preferred date is in the future
    if (preferredDate < new Date()) {
      throw new BadRequestException('Preferred date must be in the future');
    }

    // Update stop with new estimated arrival
    await this.prisma.deliveryStop.update({
      where: { id: stop.id },
      data: {
        estimatedArrival: preferredDate,
        recipientNote: reason
          ? `${stop.recipientNote || ''}\nReschedule requested: ${reason}`.trim()
          : stop.recipientNote,
      },
    });

    this.logger.log(`Reschedule requested for ${trackingNumber} to ${preferredDate}`);

    return {
      success: true,
      message: 'Ihre Anfrage zur Terminänderung wurde übermittelt',
      newEstimate: preferredDate,
    };
  }

  /**
   * Get live driver location for active delivery
   */
  async getLiveDriverLocation(
    trackingNumber: string,
  ): Promise<{
    available: boolean;
    location: { lat: number; lng: number } | null;
    lastUpdated: Date | null;
    estimatedMinutesAway: number | null;
  }> {
    const stop = await this.prisma.deliveryStop.findFirst({
      where: { trackingNumbers: { has: trackingNumber } },
      include: {
        route: {
          include: {
            vehicle: true,
          },
        },
      },
    });

    if (!stop) {
      throw new NotFoundException(`Tracking number ${trackingNumber} not found`);
    }

    // Only show location for active routes where stop is pending
    if (stop.route?.status !== 'IN_PROGRESS' || stop.status !== 'PENDING') {
      return {
        available: false,
        location: null,
        lastUpdated: null,
        estimatedMinutesAway: null,
      };
    }

    // Get vehicle's current location
    const vehicle = stop.route.vehicle;
    if (!vehicle?.currentLat || !vehicle?.currentLng) {
      return {
        available: false,
        location: null,
        lastUpdated: null,
        estimatedMinutesAway: null,
      };
    }

    // Calculate estimated minutes away based on stop order
    const pendingStops = await this.prisma.deliveryStop.count({
      where: {
        routeId: stop.routeId,
        status: 'PENDING',
        stopOrder: { lt: stop.stopOrder },
      },
    });

    // Estimate 8 minutes per stop
    const estimatedMinutesAway = pendingStops * 8 + 5;

    return {
      available: true,
      location: {
        lat: vehicle.currentLat.toNumber(),
        lng: vehicle.currentLng.toNumber(),
      },
      lastUpdated: vehicle.lastLocationAt,
      estimatedMinutesAway,
    };
  }

  /**
   * Get aggregate rating statistics for the delivery service
   */
  async getRatingStatistics(): Promise<{
    averageRating: number;
    totalRatings: number;
    ratingDistribution: Record<number, number>;
    averageByCategory: {
      punctuality: number;
      driver: number;
      condition: number;
    };
  }> {
    const ratings = Array.from(this.deliveryRatings.values());

    if (ratings.length === 0) {
      return {
        averageRating: 0,
        totalRatings: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        averageByCategory: { punctuality: 0, driver: 0, condition: 0 },
      };
    }

    const totalRatings = ratings.length;
    const averageRating =
      ratings.reduce((sum, r) => sum + r.overallRating, 0) / totalRatings;

    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach(r => {
      ratingDistribution[r.overallRating]++;
    });

    const averageByCategory = {
      punctuality:
        ratings.reduce((sum, r) => sum + r.punctualityRating, 0) / totalRatings,
      driver: ratings.reduce((sum, r) => sum + r.driverRating, 0) / totalRatings,
      condition:
        ratings.reduce((sum, r) => sum + r.conditionRating, 0) / totalRatings,
    };

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalRatings,
      ratingDistribution,
      averageByCategory: {
        punctuality: Math.round(averageByCategory.punctuality * 10) / 10,
        driver: Math.round(averageByCategory.driver * 10) / 10,
        condition: Math.round(averageByCategory.condition * 10) / 10,
      },
    };
  }

  // =================== PRIVATE HELPERS ===================

  private mapStopStatusToTrackingStatus(
    stopStatus: string,
    routeStatus: string | null | undefined,
  ): DeliveryTrackingStatus {
    switch (stopStatus) {
      case 'DELIVERED':
        return 'DELIVERED';
      case 'FAILED':
        return 'FAILED';
      case 'SKIPPED':
        return 'RESCHEDULED';
      case 'PENDING':
        if (routeStatus === 'IN_PROGRESS') {
          return 'OUT_FOR_DELIVERY';
        }
        if (routeStatus === 'PLANNED') {
          return 'IN_TRANSIT';
        }
        return 'PENDING';
      case 'IN_PROGRESS':
        return 'OUT_FOR_DELIVERY';
      default:
        return 'PENDING';
    }
  }

  private buildTimeline(
    stop: any,
    route: any,
    language: 'de' | 'en',
  ): TrackingEvent[] {
    const events: TrackingEvent[] = [];

    // Created event
    events.push({
      timestamp: stop.createdAt,
      status: 'REGISTERED',
      description:
        language === 'de'
          ? 'Sendung wurde registriert'
          : 'Shipment registered',
      location: null,
    });

    // Route assigned
    if (route) {
      events.push({
        timestamp: route.createdAt,
        status: 'ROUTE_ASSIGNED',
        description:
          language === 'de'
            ? 'Sendung wurde einer Route zugewiesen'
            : 'Shipment assigned to route',
        location: route.deliveryZone || null,
      });

      // Route started
      if (route.actualStartTime) {
        events.push({
          timestamp: route.actualStartTime,
          status: 'OUT_FOR_DELIVERY',
          description:
            language === 'de'
              ? 'Fahrer hat die Tour gestartet'
              : 'Driver started the route',
          location: 'München',
        });
      }
    }

    // Arrival at stop
    if (stop.actualArrival) {
      events.push({
        timestamp: stop.actualArrival,
        status: 'ARRIVED',
        description:
          language === 'de'
            ? 'Fahrer ist an der Lieferadresse angekommen'
            : 'Driver arrived at delivery address',
        location: `${stop.postalCode} ${stop.city}`,
      });
    }

    // Delivery completed or failed
    if (stop.completedAt) {
      if (stop.status === 'DELIVERED') {
        events.push({
          timestamp: stop.completedAt,
          status: 'DELIVERED',
          description:
            language === 'de'
              ? stop.signature
                ? 'Sendung wurde persönlich übergeben und unterschrieben'
                : 'Sendung wurde zugestellt'
              : stop.signature
                ? 'Shipment delivered and signed for'
                : 'Shipment delivered',
          location: `${stop.streetAddress}, ${stop.postalCode} ${stop.city}`,
        });
      } else if (stop.status === 'FAILED') {
        events.push({
          timestamp: stop.completedAt,
          status: 'FAILED',
          description:
            language === 'de'
              ? `Zustellung fehlgeschlagen: ${stop.failureNote || 'Empfänger nicht angetroffen'}`
              : `Delivery failed: ${stop.failureNote || 'Recipient not available'}`,
          location: `${stop.postalCode} ${stop.city}`,
        });
      }
    }

    // Sort by timestamp
    events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return events;
  }
}
