import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EfacturaService } from './efactura.service';
import { InvoiceType, InvoiceStatus } from '@prisma/client';
import { logAudit, AuditActions } from '../logging/winston.config';

@Injectable()
export class EfacturaSyncService {
  private readonly logger = new Logger(EfacturaSyncService.name);
  private isProcessing = false;
  private isAnafConfigured = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly efacturaService: EfacturaService,
    private readonly configService: ConfigService,
  ) {
    // Check if ANAF credentials are properly configured
    const clientId = this.configService.get('ANAF_CLIENT_ID');
    const clientSecret = this.configService.get('ANAF_CLIENT_SECRET');
    this.isAnafConfigured = !!(
      clientId &&
      clientSecret &&
      clientId !== 'placeholder_client_id' &&
      clientSecret !== 'placeholder_client_secret'
    );

    if (!this.isAnafConfigured) {
      this.logger.warn(
        'ANAF credentials not configured - e-Factura sync disabled. ' +
        'Configure ANAF_CLIENT_ID and ANAF_CLIENT_SECRET with valid OAuth2 credentials.'
      );
    }
  }

  // Run every 4 hours to fetch incoming invoices from ANAF
  @Cron(CronExpression.EVERY_4_HOURS)
  async syncIncomingInvoices() {
    // Skip if ANAF is not configured
    if (!this.isAnafConfigured) {
      return;
    }

    if (this.isProcessing) {
      this.logger.warn('Sync already in progress, skipping');
      return;
    }

    this.isProcessing = true;
    this.logger.log('Starting incoming e-Factura sync from ANAF SPV');

    try {
      // Get all users with configured CUI
      const users = await this.prisma.user.findMany({
        where: {
          cui: { not: null },
        },
        select: { id: true, cui: true, company: true },
      });

      for (const user of users) {
        if (!user.cui) continue;

        try {
          await this.syncUserInvoices(user.id, user.cui);
        } catch (error) {
          this.logger.error(`Failed to sync invoices for user ${user.id}`, error);
        }
      }

      this.logger.log('Completed incoming e-Factura sync');
    } catch (error) {
      this.logger.error('Failed to sync incoming invoices', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async syncUserInvoices(userId: string, cui: string) {
    this.logger.debug(`Syncing invoices for CUI ${cui}`);

    // Download received invoices from last 60 days
    const received = await this.efacturaService.downloadReceived(cui, 60);

    if (!received || received.length === 0) {
      this.logger.debug(`No new invoices for CUI ${cui}`);
      return;
    }

    for (const efactura of received) {
      try {
        // Check if invoice already exists
        const existing = await this.prisma.invoice.findFirst({
          where: {
            userId,
            efacturaId: efactura.id,
          },
        });

        if (existing) {
          this.logger.debug(`Invoice ${efactura.id} already exists, skipping`);
          continue;
        }

        // Create new received invoice
        const invoice = await this.prisma.invoice.create({
          data: {
            userId,
            invoiceNumber: efactura.numar || `EF-${efactura.id}`,
            invoiceDate: new Date(efactura.dataEmitere || new Date()),
            type: InvoiceType.RECEIVED,
            status: InvoiceStatus.DRAFT,
            partnerName: efactura.furnizor?.denumire || 'Unknown',
            partnerCui: efactura.furnizor?.cui || '',
            partnerAddress: efactura.furnizor?.adresa || '',
            netAmount: efactura.total?.netAmount || 0,
            vatRate: 21, // Default, would parse from e-Factura
            vatAmount: efactura.total?.vatAmount || 0,
            grossAmount: efactura.total?.grossAmount || 0,
            currency: 'RON',
            efacturaId: efactura.id,
            efacturaStatus: 'RECEIVED',
            spvSubmitted: false,
          },
        });

        this.logger.log(`Created received invoice ${invoice.invoiceNumber} from e-Factura ${efactura.id}`);

        logAudit('EFACTURA_RECEIVED', userId, {
          invoiceId: invoice.id,
          efacturaId: efactura.id,
          supplierCui: efactura.furnizor?.cui,
        });
      } catch (error) {
        this.logger.error(`Failed to process e-Factura ${efactura.id}`, error);
      }
    }
  }

  // Check status of pending submitted invoices every 2 hours
  @Cron(CronExpression.EVERY_2_HOURS)
  async checkPendingSubmissions() {
    // Skip if ANAF is not configured
    if (!this.isAnafConfigured) {
      return;
    }

    this.logger.log('Checking pending e-Factura submissions');

    try {
      const pending = await this.prisma.invoice.findMany({
        where: {
          type: InvoiceType.ISSUED,
          spvSubmitted: true,
          efacturaStatus: { in: ['SUBMITTED', 'PENDING', 'IN_PROGRESS'] },
        },
        select: {
          id: true,
          userId: true,
          invoiceNumber: true,
          efacturaId: true,
        },
      });

      for (const invoice of pending) {
        if (!invoice.efacturaId) continue;

        try {
          const status = await this.efacturaService.checkStatus(invoice.efacturaId);

          await this.prisma.invoice.update({
            where: { id: invoice.id },
            data: {
              efacturaStatus: status.status,
            },
          });

          if (status.status === 'ACCEPTED') {
            this.logger.log(`Invoice ${invoice.invoiceNumber} accepted by ANAF`);
          } else if (status.status === 'REJECTED') {
            this.logger.warn(`Invoice ${invoice.invoiceNumber} rejected by ANAF: ${status.messages.join(', ')}`);
          }
        } catch (error) {
          this.logger.error(`Failed to check status for invoice ${invoice.id}`, error);
        }
      }
    } catch (error) {
      this.logger.error('Failed to check pending submissions', error);
    }
  }

  // Manual trigger for immediate sync
  async triggerSync(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { cui: true },
    });

    if (!user?.cui) {
      throw new Error('User CUI not configured');
    }

    await this.syncUserInvoices(userId, user.cui);
    return { success: true, message: 'Sync completed' };
  }
}
