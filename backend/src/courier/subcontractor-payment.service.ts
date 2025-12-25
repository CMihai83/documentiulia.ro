import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CourierProvider } from './dto/courier.dto';

/**
 * Subcontractor Payment Automation Service
 * Automates payments to subcontractors (drivers/fleet operators) based on delivery data
 * Integrates with DPD/GLS delivery imports and generates payment summaries
 */
@Injectable()
export class SubcontractorPaymentService {
  private readonly logger = new Logger(SubcontractorPaymentService.name);

  // Payment rates per delivery (in EUR)
  private readonly PAYMENT_RATES: Record<CourierProvider, DeliveryRates> = {
    [CourierProvider.DPD]: {
      standardDelivery: 2.50,
      expressDelivery: 4.00,
      oversizeParcel: 3.50,
      returnDelivery: 1.50,
      failedAttempt: 0.80,
      saturdayBonus: 0.50,
    },
    [CourierProvider.GLS]: {
      standardDelivery: 2.30,
      expressDelivery: 3.80,
      oversizeParcel: 3.20,
      returnDelivery: 1.40,
      failedAttempt: 0.75,
      saturdayBonus: 0.45,
    },
    [CourierProvider.DHL]: {
      standardDelivery: 2.40,
      expressDelivery: 4.20,
      oversizeParcel: 3.40,
      returnDelivery: 1.60,
      failedAttempt: 0.85,
      saturdayBonus: 0.55,
    },
    [CourierProvider.UPS]: {
      standardDelivery: 2.60,
      expressDelivery: 4.50,
      oversizeParcel: 3.80,
      returnDelivery: 1.70,
      failedAttempt: 0.90,
      saturdayBonus: 0.60,
    },
    [CourierProvider.HERMES]: {
      standardDelivery: 2.20,
      expressDelivery: 3.60,
      oversizeParcel: 3.00,
      returnDelivery: 1.30,
      failedAttempt: 0.70,
      saturdayBonus: 0.40,
    },
  };

  constructor(private readonly prisma: PrismaService) {}

  // =================== PAYMENT CALCULATION ===================

  /**
   * Calculate payment for a date range
   */
  async calculatePayment(
    userId: string,
    provider: CourierProvider,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<PaymentCalculation> {
    this.logger.log(`Calculating payment for ${provider} from ${dateFrom} to ${dateTo}`);

    // Get all deliveries for the period
    const deliveries = await this.prisma.courierDelivery.findMany({
      where: {
        userId,
        provider,
        deliveredAt: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
    });

    if (deliveries.length === 0) {
      return {
        period: { from: dateFrom, to: dateTo },
        provider,
        totalDeliveries: 0,
        breakdown: {
          standardDeliveries: { count: 0, amount: 0 },
          expressDeliveries: { count: 0, amount: 0 },
          oversizeParcels: { count: 0, amount: 0 },
          returnDeliveries: { count: 0, amount: 0 },
          failedAttempts: { count: 0, amount: 0 },
          saturdayBonuses: { count: 0, amount: 0 },
        },
        subtotal: 0,
        deductions: [],
        totalDeductions: 0,
        netPayment: 0,
        currency: 'EUR',
      };
    }

    const rates = this.PAYMENT_RATES[provider];
    const breakdown = {
      standardDeliveries: { count: 0, amount: 0 },
      expressDeliveries: { count: 0, amount: 0 },
      oversizeParcels: { count: 0, amount: 0 },
      returnDeliveries: { count: 0, amount: 0 },
      failedAttempts: { count: 0, amount: 0 },
      saturdayBonuses: { count: 0, amount: 0 },
    };

    for (const delivery of deliveries) {
      // Determine delivery type based on status and tracking number patterns
      const isReturn = delivery.status === 'RETURNED';
      const isFailed = delivery.status === 'FAILED';
      const isSaturday = delivery.deliveredAt && delivery.deliveredAt.getDay() === 6;

      // Express detection based on tracking number pattern (e.g., contains EXP or starts with E)
      const isExpress = delivery.trackingNumber.includes('EXP') ||
                        delivery.trackingNumber.startsWith('E');

      // Oversize detection based on tracking number pattern (e.g., contains OS or XL)
      const isOversize = delivery.trackingNumber.includes('OS') ||
                         delivery.trackingNumber.includes('XL');

      if (isFailed) {
        breakdown.failedAttempts.count++;
        breakdown.failedAttempts.amount += rates.failedAttempt;
      } else if (isReturn) {
        breakdown.returnDeliveries.count++;
        breakdown.returnDeliveries.amount += rates.returnDelivery;
      } else if (isExpress) {
        breakdown.expressDeliveries.count++;
        breakdown.expressDeliveries.amount += rates.expressDelivery;
      } else if (isOversize) {
        breakdown.oversizeParcels.count++;
        breakdown.oversizeParcels.amount += rates.oversizeParcel;
      } else {
        breakdown.standardDeliveries.count++;
        breakdown.standardDeliveries.amount += rates.standardDelivery;
      }

      if (isSaturday && !isFailed) {
        breakdown.saturdayBonuses.count++;
        breakdown.saturdayBonuses.amount += rates.saturdayBonus;
      }
    }

    const subtotal =
      breakdown.standardDeliveries.amount +
      breakdown.expressDeliveries.amount +
      breakdown.oversizeParcels.amount +
      breakdown.returnDeliveries.amount +
      breakdown.failedAttempts.amount +
      breakdown.saturdayBonuses.amount;

    // Apply deductions (e.g., lost parcels, damages)
    const deductions = await this.getDeductions(userId, provider, dateFrom, dateTo);
    const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);

    return {
      period: { from: dateFrom, to: dateTo },
      provider,
      totalDeliveries: deliveries.length,
      breakdown,
      subtotal: Math.round(subtotal * 100) / 100,
      deductions,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      netPayment: Math.round((subtotal - totalDeductions) * 100) / 100,
      currency: 'EUR',
    };
  }

  /**
   * Get deductions for a period
   */
  private async getDeductions(
    userId: string,
    provider: CourierProvider,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<PaymentDeduction[]> {
    // In production, this would query a deductions table
    // For now, return empty array
    return [];
  }

  // =================== PAYMENT PROCESSING ===================

  /**
   * Process payment for a subcontractor
   */
  async processPayment(
    userId: string,
    provider: CourierProvider,
    period: { from: Date; to: Date },
    options: ProcessPaymentOptions = {},
  ): Promise<PaymentResult> {
    const calculation = await this.calculatePayment(userId, provider, period.from, period.to);

    if (calculation.netPayment <= 0) {
      throw new BadRequestException('No payment due for this period');
    }

    // Create payment record
    const paymentId = `PAY-${provider}-${Date.now()}`;
    const payment: PaymentRecord = {
      id: paymentId,
      userId,
      provider,
      period,
      calculation,
      status: 'PENDING',
      createdAt: new Date(),
      scheduledPaymentDate: options.scheduledDate || this.getNextPaymentDate(),
    };

    // Store payment record (in production, this would be in the database)
    this.logger.log(`Payment ${paymentId} created for ${calculation.netPayment} EUR`);

    // Generate invoice if requested
    let invoiceNumber: string | undefined;
    if (options.generateInvoice) {
      invoiceNumber = await this.generatePaymentInvoice(payment);
    }

    return {
      paymentId,
      status: 'PENDING',
      amount: calculation.netPayment,
      currency: 'EUR',
      scheduledDate: payment.scheduledPaymentDate,
      invoiceNumber,
      message: `Payment of ${calculation.netPayment} EUR scheduled for ${payment.scheduledPaymentDate.toISOString().split('T')[0]}`,
    };
  }

  /**
   * Generate invoice for payment
   */
  private async generatePaymentInvoice(payment: PaymentRecord): Promise<string> {
    const invoiceNumber = `INV-${payment.provider}-${Date.now()}`;

    // In production, this would create an actual invoice in the system
    // and potentially submit to ANAF e-Factura
    this.logger.log(`Generated invoice ${invoiceNumber} for payment ${payment.id}`);

    return invoiceNumber;
  }

  /**
   * Get next payment date (every 1st and 15th of month)
   */
  private getNextPaymentDate(): Date {
    const now = new Date();
    const day = now.getDate();

    if (day < 15) {
      return new Date(now.getFullYear(), now.getMonth(), 15);
    } else {
      // First of next month
      return new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }
  }

  // =================== BATCH PROCESSING ===================

  /**
   * Process all pending payments (scheduled job)
   */
  @Cron('0 9 1,15 * *') // 9am on 1st and 15th of each month
  async processScheduledPayments() {
    this.logger.log('Processing scheduled payments...');

    // In production, this would:
    // 1. Query all pending payments scheduled for today
    // 2. Validate bank details
    // 3. Submit to payment gateway
    // 4. Update payment status
    // 5. Send notifications

    this.logger.log('Scheduled payments processed');
  }

  /**
   * Generate monthly payment summary for all subcontractors
   */
  async generateMonthlySummary(
    userId: string,
    year: number,
    month: number,
  ): Promise<MonthlySummary> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of month

    const providers = [CourierProvider.DPD, CourierProvider.GLS];
    const summaries: ProviderPaymentSummary[] = [];

    for (const provider of providers) {
      const calculation = await this.calculatePayment(userId, provider, startDate, endDate);

      if (calculation.totalDeliveries > 0) {
        summaries.push({
          provider,
          totalDeliveries: calculation.totalDeliveries,
          grossAmount: calculation.subtotal,
          deductions: calculation.totalDeductions,
          netAmount: calculation.netPayment,
          averagePerDelivery: Math.round((calculation.netPayment / calculation.totalDeliveries) * 100) / 100,
        });
      }
    }

    const totalDeliveries = summaries.reduce((sum, s) => sum + s.totalDeliveries, 0);
    const totalGross = summaries.reduce((sum, s) => sum + s.grossAmount, 0);
    const totalDeductions = summaries.reduce((sum, s) => sum + s.deductions, 0);
    const totalNet = summaries.reduce((sum, s) => sum + s.netAmount, 0);

    return {
      period: { year, month },
      byProvider: summaries,
      totals: {
        deliveries: totalDeliveries,
        grossAmount: Math.round(totalGross * 100) / 100,
        deductions: Math.round(totalDeductions * 100) / 100,
        netAmount: Math.round(totalNet * 100) / 100,
      },
      currency: 'EUR',
      generatedAt: new Date(),
    };
  }

  // =================== RECONCILIATION ===================

  /**
   * Reconcile payments with courier statements
   */
  async reconcileWithCourier(
    userId: string,
    provider: CourierProvider,
    courierStatementAmount: number,
    period: { from: Date; to: Date },
  ): Promise<ReconciliationResult> {
    const calculation = await this.calculatePayment(userId, provider, period.from, period.to);

    const difference = Math.round((courierStatementAmount - calculation.netPayment) * 100) / 100;
    const percentDiff = calculation.netPayment > 0
      ? Math.round((Math.abs(difference) / calculation.netPayment) * 10000) / 100
      : 0;

    let status: 'MATCHED' | 'DISCREPANCY' | 'MAJOR_DISCREPANCY';
    if (Math.abs(percentDiff) < 0.5) {
      status = 'MATCHED';
    } else if (Math.abs(percentDiff) < 5) {
      status = 'DISCREPANCY';
    } else {
      status = 'MAJOR_DISCREPANCY';
    }

    return {
      provider,
      period,
      calculatedAmount: calculation.netPayment,
      courierStatementAmount,
      difference,
      differencePercent: percentDiff,
      status,
      details: {
        ourDeliveryCount: calculation.totalDeliveries,
        recommendation: status === 'MATCHED'
          ? 'Amounts match - proceed with payment'
          : status === 'DISCREPANCY'
          ? 'Minor discrepancy detected - review before payment'
          : 'Major discrepancy - manual investigation required',
      },
    };
  }

  // =================== DRIVER PAYOUTS ===================

  /**
   * Calculate payout for individual driver
   */
  async calculateDriverPayout(
    driverId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<DriverPayoutCalculation> {
    // Get driver's completed deliveries from routes
    const routes = await this.prisma.deliveryRoute.findMany({
      where: {
        driverId,
        routeDate: {
          gte: dateFrom,
          lte: dateTo,
        },
        status: 'COMPLETED',
      },
      include: {
        stops: {
          where: {
            status: 'DELIVERED',
          },
        },
        driver: true,
      },
    });

    let totalDeliveries = 0;
    let totalParcels = 0;
    let totalDistance = 0;

    for (const route of routes) {
      totalDeliveries += route.stops.length;
      totalParcels += route.stops.reduce((sum, s) => sum + s.parcelCount, 0);
      totalDistance += route.actualDistanceKm?.toNumber() || 0;
    }

    // Calculate payout (example rates)
    const perDeliveryRate = 1.50; // EUR per delivery stop
    const perParcelBonus = 0.20; // EUR per parcel over 1
    const perKmAllowance = 0.15; // EUR per km

    const basePayment = totalDeliveries * perDeliveryRate;
    const parcelBonus = totalParcels > totalDeliveries
      ? (totalParcels - totalDeliveries) * perParcelBonus
      : 0;
    const distanceAllowance = totalDistance * perKmAllowance;

    const grossPayment = basePayment + parcelBonus + distanceAllowance;
    const taxWithholding = grossPayment * 0.19; // 19% German tax
    const netPayment = grossPayment - taxWithholding;

    const driverName = routes[0]?.driver
      ? `${routes[0].driver.firstName} ${routes[0].driver.lastName}`
      : 'Unknown';

    return {
      driverId,
      driverName,
      period: { from: dateFrom, to: dateTo },
      metrics: {
        routesCompleted: routes.length,
        deliveriesCompleted: totalDeliveries,
        parcelsDelivered: totalParcels,
        distanceKm: Math.round(totalDistance * 100) / 100,
      },
      breakdown: {
        basePayment: Math.round(basePayment * 100) / 100,
        parcelBonus: Math.round(parcelBonus * 100) / 100,
        distanceAllowance: Math.round(distanceAllowance * 100) / 100,
      },
      grossPayment: Math.round(grossPayment * 100) / 100,
      taxWithholding: Math.round(taxWithholding * 100) / 100,
      netPayment: Math.round(netPayment * 100) / 100,
      currency: 'EUR',
    };
  }

  /**
   * Calculate payouts for all drivers
   */
  async calculateAllDriverPayouts(
    userId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<{ drivers: DriverPayoutCalculation[]; totals: PayoutTotals }> {
    // Get all drivers with routes in the period
    const routes = await this.prisma.deliveryRoute.findMany({
      where: {
        userId,
        routeDate: {
          gte: dateFrom,
          lte: dateTo,
        },
        status: 'COMPLETED',
        driverId: { not: null },
      },
      select: { driverId: true },
      distinct: ['driverId'],
    });

    const driverPayouts: DriverPayoutCalculation[] = [];

    for (const route of routes) {
      if (route.driverId) {
        const payout = await this.calculateDriverPayout(route.driverId, dateFrom, dateTo);
        driverPayouts.push(payout);
      }
    }

    // Sort by net payment (highest first)
    driverPayouts.sort((a, b) => b.netPayment - a.netPayment);

    const totals: PayoutTotals = {
      totalDrivers: driverPayouts.length,
      totalDeliveries: driverPayouts.reduce((sum, d) => sum + d.metrics.deliveriesCompleted, 0),
      totalGross: Math.round(driverPayouts.reduce((sum, d) => sum + d.grossPayment, 0) * 100) / 100,
      totalTax: Math.round(driverPayouts.reduce((sum, d) => sum + d.taxWithholding, 0) * 100) / 100,
      totalNet: Math.round(driverPayouts.reduce((sum, d) => sum + d.netPayment, 0) * 100) / 100,
    };

    return { drivers: driverPayouts, totals };
  }
}

// =================== TYPES ===================

interface DeliveryRates {
  standardDelivery: number;
  expressDelivery: number;
  oversizeParcel: number;
  returnDelivery: number;
  failedAttempt: number;
  saturdayBonus: number;
}

interface PaymentCalculation {
  period: { from: Date; to: Date };
  provider: CourierProvider;
  totalDeliveries: number;
  breakdown: {
    standardDeliveries: { count: number; amount: number };
    expressDeliveries: { count: number; amount: number };
    oversizeParcels: { count: number; amount: number };
    returnDeliveries: { count: number; amount: number };
    failedAttempts: { count: number; amount: number };
    saturdayBonuses: { count: number; amount: number };
  };
  subtotal: number;
  deductions: PaymentDeduction[];
  totalDeductions: number;
  netPayment: number;
  currency: string;
}

interface PaymentDeduction {
  type: 'LOST_PARCEL' | 'DAMAGE' | 'COMPLAINT' | 'OTHER';
  description: string;
  amount: number;
  reference?: string;
}

interface ProcessPaymentOptions {
  generateInvoice?: boolean;
  scheduledDate?: Date;
  notes?: string;
}

interface PaymentRecord {
  id: string;
  userId: string;
  provider: CourierProvider;
  period: { from: Date; to: Date };
  calculation: PaymentCalculation;
  status: 'PENDING' | 'SCHEDULED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: Date;
  scheduledPaymentDate: Date;
  processedAt?: Date;
  transactionId?: string;
}

interface PaymentResult {
  paymentId: string;
  status: string;
  amount: number;
  currency: string;
  scheduledDate: Date;
  invoiceNumber?: string;
  message: string;
}

interface MonthlySummary {
  period: { year: number; month: number };
  byProvider: ProviderPaymentSummary[];
  totals: {
    deliveries: number;
    grossAmount: number;
    deductions: number;
    netAmount: number;
  };
  currency: string;
  generatedAt: Date;
}

interface ProviderPaymentSummary {
  provider: CourierProvider;
  totalDeliveries: number;
  grossAmount: number;
  deductions: number;
  netAmount: number;
  averagePerDelivery: number;
}

interface ReconciliationResult {
  provider: CourierProvider;
  period: { from: Date; to: Date };
  calculatedAmount: number;
  courierStatementAmount: number;
  difference: number;
  differencePercent: number;
  status: 'MATCHED' | 'DISCREPANCY' | 'MAJOR_DISCREPANCY';
  details: {
    ourDeliveryCount: number;
    recommendation: string;
  };
}

interface DriverPayoutCalculation {
  driverId: string;
  driverName: string;
  period: { from: Date; to: Date };
  metrics: {
    routesCompleted: number;
    deliveriesCompleted: number;
    parcelsDelivered: number;
    distanceKm: number;
  };
  breakdown: {
    basePayment: number;
    parcelBonus: number;
    distanceAllowance: number;
  };
  grossPayment: number;
  taxWithholding: number;
  netPayment: number;
  currency: string;
}

interface PayoutTotals {
  totalDrivers: number;
  totalDeliveries: number;
  totalGross: number;
  totalTax: number;
  totalNet: number;
}

export {
  PaymentCalculation,
  PaymentResult,
  MonthlySummary,
  ReconciliationResult,
  DriverPayoutCalculation,
  PayoutTotals,
};
