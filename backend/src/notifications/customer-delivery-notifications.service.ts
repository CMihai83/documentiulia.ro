import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Customer Delivery Notifications Service
 * Handles SMS and Email notifications to customers about their deliveries
 *
 * Notification Types:
 * - OUT_FOR_DELIVERY: When driver starts the route
 * - ARRIVING_SOON: When driver is approaching (within 15 min)
 * - DELIVERED: Successful delivery confirmation
 * - DELIVERY_FAILED: Failed delivery attempt with reason
 * - RESCHEDULED: New delivery date scheduled
 */

export type NotificationType =
  | 'OUT_FOR_DELIVERY'
  | 'ARRIVING_SOON'
  | 'DELIVERED'
  | 'DELIVERY_FAILED'
  | 'RESCHEDULED';

export type NotificationChannel = 'SMS' | 'EMAIL' | 'PUSH';

export interface CustomerNotificationPreferences {
  email?: boolean;
  sms?: boolean;
  push?: boolean;
  language: 'de' | 'en';
}

export interface NotificationTemplate {
  type: NotificationType;
  channel: NotificationChannel;
  subject?: string; // For email
  body: string;
  variables: string[];
}

export interface DeliveryNotificationData {
  stopId: string;
  recipientName: string;
  recipientPhone?: string;
  recipientEmail?: string;
  trackingNumber?: string;
  address: string;
  estimatedTime?: Date;
  driverName?: string;
  vehiclePlate?: string;
  failureReason?: string;
  newDeliveryDate?: Date;
  parcelCount?: number;
}

// German notification templates
const TEMPLATES_DE: Record<NotificationType, { sms: string; email: { subject: string; body: string } }> = {
  OUT_FOR_DELIVERY: {
    sms: 'Guten Tag {recipientName}! Ihre Lieferung ist unterwegs. Voraussichtliche Ankunft: {estimatedTime}. Tracking: {trackingNumber}',
    email: {
      subject: 'Ihre Lieferung ist unterwegs - {trackingNumber}',
      body: `Guten Tag {recipientName},

Ihre Lieferung ist unterwegs zu Ihnen!

📦 Tracking-Nummer: {trackingNumber}
📍 Lieferadresse: {address}
🕐 Voraussichtliche Ankunft: {estimatedTime}
🚐 Fahrzeug: {vehiclePlate}

Sie können Ihre Lieferung in Echtzeit verfolgen.

Mit freundlichen Grüßen,
Ihr Lieferteam`,
    },
  },
  ARRIVING_SOON: {
    sms: 'Ihr Paket kommt in ca. 15 Minuten! Bitte seien Sie bereit. Tracking: {trackingNumber}',
    email: {
      subject: 'Ihr Paket kommt gleich! - {trackingNumber}',
      body: `Guten Tag {recipientName},

Ihr Paket ist fast da! Der Fahrer wird in etwa 15 Minuten bei Ihnen eintreffen.

📦 Tracking-Nummer: {trackingNumber}
📍 Lieferadresse: {address}
👤 Fahrer: {driverName}

Bitte stellen Sie sicher, dass jemand zur Annahme bereit ist.

Mit freundlichen Grüßen,
Ihr Lieferteam`,
    },
  },
  DELIVERED: {
    sms: 'Zugestellt! Ihr Paket {trackingNumber} wurde erfolgreich an {address} geliefert. Danke für Ihr Vertrauen!',
    email: {
      subject: 'Erfolgreich zugestellt! - {trackingNumber}',
      body: `Guten Tag {recipientName},

Ihr Paket wurde erfolgreich zugestellt!

📦 Tracking-Nummer: {trackingNumber}
📍 Lieferadresse: {address}
🕐 Zustellzeit: {deliveryTime}
📦 Anzahl Pakete: {parcelCount}

Vielen Dank für Ihr Vertrauen!

Mit freundlichen Grüßen,
Ihr Lieferteam`,
    },
  },
  DELIVERY_FAILED: {
    sms: 'Zustellung nicht möglich: {failureReason}. Tracking: {trackingNumber}. Wir versuchen es erneut.',
    email: {
      subject: 'Zustellung nicht möglich - {trackingNumber}',
      body: `Guten Tag {recipientName},

Leider konnten wir Ihr Paket heute nicht zustellen.

📦 Tracking-Nummer: {trackingNumber}
📍 Lieferadresse: {address}
❌ Grund: {failureReason}

Wir werden einen weiteren Zustellversuch unternehmen. Sie können auch eine Abholung im Depot vereinbaren.

Mit freundlichen Grüßen,
Ihr Lieferteam`,
    },
  },
  RESCHEDULED: {
    sms: 'Neue Lieferung geplant für {newDeliveryDate}. Tracking: {trackingNumber}',
    email: {
      subject: 'Neue Lieferung geplant - {trackingNumber}',
      body: `Guten Tag {recipientName},

Ihr Paket wurde für einen neuen Liefertermin eingeplant.

📦 Tracking-Nummer: {trackingNumber}
📍 Lieferadresse: {address}
📅 Neuer Liefertermin: {newDeliveryDate}

Bei Fragen kontaktieren Sie uns bitte.

Mit freundlichen Grüßen,
Ihr Lieferteam`,
    },
  },
};

// English notification templates
const TEMPLATES_EN: Record<NotificationType, { sms: string; email: { subject: string; body: string } }> = {
  OUT_FOR_DELIVERY: {
    sms: 'Hello {recipientName}! Your delivery is on its way. Expected arrival: {estimatedTime}. Tracking: {trackingNumber}',
    email: {
      subject: 'Your delivery is on its way - {trackingNumber}',
      body: `Hello {recipientName},

Your delivery is on its way to you!

📦 Tracking Number: {trackingNumber}
📍 Delivery Address: {address}
🕐 Expected Arrival: {estimatedTime}
🚐 Vehicle: {vehiclePlate}

You can track your delivery in real-time.

Best regards,
Your Delivery Team`,
    },
  },
  ARRIVING_SOON: {
    sms: 'Your package arrives in about 15 minutes! Please be ready. Tracking: {trackingNumber}',
    email: {
      subject: 'Your package is almost there! - {trackingNumber}',
      body: `Hello {recipientName},

Your package is almost there! The driver will arrive in approximately 15 minutes.

📦 Tracking Number: {trackingNumber}
📍 Delivery Address: {address}
👤 Driver: {driverName}

Please make sure someone is available to receive the package.

Best regards,
Your Delivery Team`,
    },
  },
  DELIVERED: {
    sms: 'Delivered! Your package {trackingNumber} was successfully delivered to {address}. Thank you!',
    email: {
      subject: 'Successfully Delivered! - {trackingNumber}',
      body: `Hello {recipientName},

Your package has been successfully delivered!

📦 Tracking Number: {trackingNumber}
📍 Delivery Address: {address}
🕐 Delivery Time: {deliveryTime}
📦 Number of Parcels: {parcelCount}

Thank you for your trust!

Best regards,
Your Delivery Team`,
    },
  },
  DELIVERY_FAILED: {
    sms: 'Delivery failed: {failureReason}. Tracking: {trackingNumber}. We will try again.',
    email: {
      subject: 'Delivery Unsuccessful - {trackingNumber}',
      body: `Hello {recipientName},

Unfortunately, we were unable to deliver your package today.

📦 Tracking Number: {trackingNumber}
📍 Delivery Address: {address}
❌ Reason: {failureReason}

We will make another delivery attempt. You can also arrange a pickup at our depot.

Best regards,
Your Delivery Team`,
    },
  },
  RESCHEDULED: {
    sms: 'New delivery scheduled for {newDeliveryDate}. Tracking: {trackingNumber}',
    email: {
      subject: 'New Delivery Scheduled - {trackingNumber}',
      body: `Hello {recipientName},

Your package has been scheduled for a new delivery date.

📦 Tracking Number: {trackingNumber}
📍 Delivery Address: {address}
📅 New Delivery Date: {newDeliveryDate}

If you have any questions, please contact us.

Best regards,
Your Delivery Team`,
    },
  },
};

export interface NotificationResult {
  success: boolean;
  channel: NotificationChannel;
  recipientId?: string;
  error?: string;
  messageId?: string;
}

export interface NotificationLog {
  id: string;
  stopId: string;
  type: NotificationType;
  channel: NotificationChannel;
  recipient: string;
  status: 'SENT' | 'FAILED' | 'PENDING';
  sentAt?: Date;
  error?: string;
}

@Injectable()
export class CustomerDeliveryNotificationsService {
  private readonly logger = new Logger(CustomerDeliveryNotificationsService.name);

  // Mock SMS/Email providers - in production, replace with Twilio, SendGrid, etc.
  private smsProvider = {
    enabled: true,
    mockMode: true,
  };
  private emailProvider = {
    enabled: true,
    mockMode: true,
  };

  constructor(private readonly prisma: PrismaService) {}

  // =================== MAIN NOTIFICATION METHODS ===================

  /**
   * Send notification when route starts (OUT_FOR_DELIVERY)
   */
  async notifyRouteStarted(routeId: string): Promise<NotificationResult[]> {
    this.logger.log(`Sending OUT_FOR_DELIVERY notifications for route ${routeId}`);

    const route = await this.prisma.deliveryRoute.findUnique({
      where: { id: routeId },
      include: {
        vehicle: { select: { licensePlate: true } },
        driver: { select: { firstName: true, lastName: true } },
        stops: {
          where: { status: 'PENDING' },
          include: {
            route: true,
          },
        },
      },
    });

    if (!route) {
      return [{ success: false, channel: 'SMS', error: 'Route not found' }];
    }

    const results: NotificationResult[] = [];
    const driverName = route.driver
      ? `${route.driver.firstName} ${route.driver.lastName}`
      : 'Your Driver';

    for (const stop of route.stops) {
      // Calculate estimated arrival based on stop sequence
      const estimatedMinutes = (stop.stopOrder || 0) * 15; // ~15 min per stop
      const estimatedTime = new Date(Date.now() + estimatedMinutes * 60 * 1000);

      // Combine address fields
      const address = `${stop.streetAddress}, ${stop.postalCode} ${stop.city}`;
      // Get first tracking number or generate one
      const trackingNumber = stop.trackingNumbers?.[0] || stop.id.slice(-8).toUpperCase();

      const data: DeliveryNotificationData = {
        stopId: stop.id,
        recipientName: stop.recipientName || 'Customer',
        recipientPhone: stop.recipientPhone || undefined,
        recipientEmail: stop.recipientEmail || undefined,
        trackingNumber,
        address,
        estimatedTime,
        driverName,
        vehiclePlate: route.vehicle.licensePlate,
      };

      const stopResults = await this.sendNotification('OUT_FOR_DELIVERY', data, 'de');
      results.push(...stopResults);
    }

    return results;
  }

  /**
   * Send notification when driver is approaching (ARRIVING_SOON)
   */
  async notifyArrivingSoon(stopId: string): Promise<NotificationResult[]> {
    this.logger.log(`Sending ARRIVING_SOON notification for stop ${stopId}`);

    const stop = await this.prisma.deliveryStop.findUnique({
      where: { id: stopId },
      include: {
        route: {
          include: {
            vehicle: { select: { licensePlate: true } },
            driver: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!stop) {
      return [{ success: false, channel: 'SMS', error: 'Stop not found' }];
    }

    const driverName = stop.route.driver
      ? `${stop.route.driver.firstName} ${stop.route.driver.lastName}`
      : 'Your Driver';

    const address = `${stop.streetAddress}, ${stop.postalCode} ${stop.city}`;
    const trackingNumber = stop.trackingNumbers?.[0] || stop.id.slice(-8).toUpperCase();

    const data: DeliveryNotificationData = {
      stopId: stop.id,
      recipientName: stop.recipientName || 'Customer',
      recipientPhone: stop.recipientPhone || undefined,
      recipientEmail: stop.recipientEmail || undefined,
      trackingNumber,
      address,
      estimatedTime: new Date(Date.now() + 15 * 60 * 1000),
      driverName,
      vehiclePlate: stop.route.vehicle.licensePlate,
    };

    return this.sendNotification('ARRIVING_SOON', data, 'de');
  }

  /**
   * Send notification when delivery is completed (DELIVERED)
   */
  async notifyDelivered(
    stopId: string,
    parcelCount: number = 1,
  ): Promise<NotificationResult[]> {
    this.logger.log(`Sending DELIVERED notification for stop ${stopId}`);

    const stop = await this.prisma.deliveryStop.findUnique({
      where: { id: stopId },
      include: {
        route: {
          include: {
            vehicle: { select: { licensePlate: true } },
          },
        },
      },
    });

    if (!stop) {
      return [{ success: false, channel: 'SMS', error: 'Stop not found' }];
    }

    const address = `${stop.streetAddress}, ${stop.postalCode} ${stop.city}`;
    const trackingNumber = stop.trackingNumbers?.[0] || stop.id.slice(-8).toUpperCase();

    const data: DeliveryNotificationData = {
      stopId: stop.id,
      recipientName: stop.recipientName || 'Customer',
      recipientPhone: stop.recipientPhone || undefined,
      recipientEmail: stop.recipientEmail || undefined,
      trackingNumber,
      address,
      parcelCount,
    };

    return this.sendNotification('DELIVERED', data, 'de');
  }

  /**
   * Send notification when delivery fails (DELIVERY_FAILED)
   */
  async notifyDeliveryFailed(
    stopId: string,
    failureReason: string,
  ): Promise<NotificationResult[]> {
    this.logger.log(`Sending DELIVERY_FAILED notification for stop ${stopId}`);

    const stop = await this.prisma.deliveryStop.findUnique({
      where: { id: stopId },
    });

    if (!stop) {
      return [{ success: false, channel: 'SMS', error: 'Stop not found' }];
    }

    const address = `${stop.streetAddress}, ${stop.postalCode} ${stop.city}`;
    const trackingNumber = stop.trackingNumbers?.[0] || stop.id.slice(-8).toUpperCase();

    const data: DeliveryNotificationData = {
      stopId: stop.id,
      recipientName: stop.recipientName || 'Customer',
      recipientPhone: stop.recipientPhone || undefined,
      recipientEmail: stop.recipientEmail || undefined,
      trackingNumber,
      address,
      failureReason: this.translateFailureReason(failureReason, 'de'),
    };

    return this.sendNotification('DELIVERY_FAILED', data, 'de');
  }

  /**
   * Send notification when delivery is rescheduled (RESCHEDULED)
   */
  async notifyRescheduled(
    stopId: string,
    newDeliveryDate: Date,
  ): Promise<NotificationResult[]> {
    this.logger.log(`Sending RESCHEDULED notification for stop ${stopId}`);

    const stop = await this.prisma.deliveryStop.findUnique({
      where: { id: stopId },
    });

    if (!stop) {
      return [{ success: false, channel: 'SMS', error: 'Stop not found' }];
    }

    const address = `${stop.streetAddress}, ${stop.postalCode} ${stop.city}`;
    const trackingNumber = stop.trackingNumbers?.[0] || stop.id.slice(-8).toUpperCase();

    const data: DeliveryNotificationData = {
      stopId: stop.id,
      recipientName: stop.recipientName || 'Customer',
      recipientPhone: stop.recipientPhone || undefined,
      recipientEmail: stop.recipientEmail || undefined,
      trackingNumber,
      address,
      newDeliveryDate,
    };

    return this.sendNotification('RESCHEDULED', data, 'de');
  }

  // =================== CORE NOTIFICATION LOGIC ===================

  private async sendNotification(
    type: NotificationType,
    data: DeliveryNotificationData,
    language: 'de' | 'en' = 'de',
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];
    const templates = language === 'de' ? TEMPLATES_DE : TEMPLATES_EN;
    const template = templates[type];

    // Send SMS if phone number available
    if (data.recipientPhone && this.smsProvider.enabled) {
      const smsContent = this.formatTemplate(template.sms, data);
      const smsResult = await this.sendSms(data.recipientPhone, smsContent);
      results.push({
        ...smsResult,
        channel: 'SMS',
      });

      // Log notification
      await this.logNotification({
        stopId: data.stopId,
        type,
        channel: 'SMS',
        recipient: data.recipientPhone,
        status: smsResult.success ? 'SENT' : 'FAILED',
        error: smsResult.error,
      });
    }

    // Send Email if email available
    if (data.recipientEmail && this.emailProvider.enabled) {
      const subject = this.formatTemplate(template.email.subject, data);
      const body = this.formatTemplate(template.email.body, data);
      const emailResult = await this.sendEmail(data.recipientEmail, subject, body);
      results.push({
        ...emailResult,
        channel: 'EMAIL',
      });

      // Log notification
      await this.logNotification({
        stopId: data.stopId,
        type,
        channel: 'EMAIL',
        recipient: data.recipientEmail,
        status: emailResult.success ? 'SENT' : 'FAILED',
        error: emailResult.error,
      });
    }

    return results;
  }

  private formatTemplate(template: string, data: DeliveryNotificationData): string {
    let result = template;

    const replacements: Record<string, string> = {
      '{recipientName}': data.recipientName,
      '{trackingNumber}': data.trackingNumber || '',
      '{address}': data.address,
      '{estimatedTime}': data.estimatedTime
        ? data.estimatedTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
        : '',
      '{driverName}': data.driverName || '',
      '{vehiclePlate}': data.vehiclePlate || '',
      '{failureReason}': data.failureReason || '',
      '{newDeliveryDate}': data.newDeliveryDate
        ? data.newDeliveryDate.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
        : '',
      '{parcelCount}': String(data.parcelCount || 1),
      '{deliveryTime}': new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
    };

    for (const [placeholder, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
    }

    return result;
  }

  // =================== SMS PROVIDER ===================

  private async sendSms(phone: string, message: string): Promise<NotificationResult> {
    try {
      if (this.smsProvider.mockMode) {
        // Mock SMS sending
        this.logger.log(`[MOCK SMS] To: ${phone}, Message: ${message.slice(0, 50)}...`);
        return {
          success: true,
          channel: 'SMS',
          messageId: `mock-sms-${Date.now()}`,
        };
      }

      // Real SMS integration (e.g., Twilio)
      // const twilio = require('twilio')(accountSid, authToken);
      // const result = await twilio.messages.create({
      //   body: message,
      //   from: '+49...',
      //   to: phone,
      // });
      // return { success: true, channel: 'SMS', messageId: result.sid };

      return { success: false, channel: 'SMS', error: 'SMS provider not configured' };
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${phone}:`, error);
      return {
        success: false,
        channel: 'SMS',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // =================== EMAIL PROVIDER ===================

  private async sendEmail(
    email: string,
    subject: string,
    body: string,
  ): Promise<NotificationResult> {
    try {
      if (this.emailProvider.mockMode) {
        // Mock email sending
        this.logger.log(`[MOCK EMAIL] To: ${email}, Subject: ${subject}`);
        return {
          success: true,
          channel: 'EMAIL',
          messageId: `mock-email-${Date.now()}`,
        };
      }

      // Real email integration (e.g., SendGrid, Nodemailer)
      // const sgMail = require('@sendgrid/mail');
      // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      // const result = await sgMail.send({
      //   to: email,
      //   from: 'noreply@documentiulia.ro',
      //   subject,
      //   text: body,
      // });
      // return { success: true, channel: 'EMAIL', messageId: result[0].headers['x-message-id'] };

      return { success: false, channel: 'EMAIL', error: 'Email provider not configured' };
    } catch (error) {
      this.logger.error(`Failed to send email to ${email}:`, error);
      return {
        success: false,
        channel: 'EMAIL',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // =================== NOTIFICATION LOG ===================

  private async logNotification(log: Omit<NotificationLog, 'id'>): Promise<void> {
    try {
      // In production, save to database
      // await this.prisma.notificationLog.create({
      //   data: {
      //     ...log,
      //     sentAt: log.status === 'SENT' ? new Date() : null,
      //   },
      // });

      this.logger.debug(`Notification logged: ${log.type} via ${log.channel} to ${log.recipient}`);
    } catch (error) {
      this.logger.error('Failed to log notification:', error);
    }
  }

  // =================== UTILITIES ===================

  private translateFailureReason(reason: string, language: 'de' | 'en'): string {
    const translations: Record<string, Record<string, string>> = {
      'NO_ONE_HOME': { de: 'Niemand zu Hause', en: 'No one home' },
      'WRONG_ADDRESS': { de: 'Falsche Adresse', en: 'Wrong address' },
      'REFUSED': { de: 'Annahme verweigert', en: 'Refused' },
      'DAMAGED': { de: 'Paket beschädigt', en: 'Package damaged' },
      'ACCESS_DENIED': { de: 'Kein Zugang möglich', en: 'Access denied' },
      'BUSINESS_CLOSED': { de: 'Geschäft geschlossen', en: 'Business closed' },
    };

    return translations[reason]?.[language] || reason;
  }

  /**
   * Get notification history for a delivery stop
   */
  async getNotificationHistory(stopId: string): Promise<NotificationLog[]> {
    // In production, query from database
    // return this.prisma.notificationLog.findMany({
    //   where: { stopId },
    //   orderBy: { sentAt: 'desc' },
    // });

    return [];
  }

  /**
   * Get notification statistics for a date range
   */
  async getNotificationStats(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<{
    totalSent: number;
    totalFailed: number;
    byType: Record<NotificationType, number>;
    byChannel: Record<NotificationChannel, number>;
  }> {
    // In production, aggregate from database
    return {
      totalSent: 0,
      totalFailed: 0,
      byType: {
        OUT_FOR_DELIVERY: 0,
        ARRIVING_SOON: 0,
        DELIVERED: 0,
        DELIVERY_FAILED: 0,
        RESCHEDULED: 0,
      },
      byChannel: {
        SMS: 0,
        EMAIL: 0,
        PUSH: 0,
      },
    };
  }
}
