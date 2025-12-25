import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from './pdf.service';
import { EmailService } from '../communication/email.service';
import { Invoice, Partner, User } from '@prisma/client';

export interface BulkEmailResult {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  results: Array<{
    invoiceId: string;
    invoiceNumber: string;
    recipientEmail: string;
    status: 'sent' | 'failed' | 'skipped';
    error?: string;
  }>;
}

export interface BulkEmailOptions {
  subject?: string;
  message?: string;
  includeAttachment?: boolean;
  ccEmails?: string[];
  replyToEmail?: string;
}

@Injectable()
export class BulkInvoiceEmailService {
  private readonly logger = new Logger(BulkInvoiceEmailService.name);

  constructor(
    private prisma: PrismaService,
    private pdfService: PdfService,
    private emailService: EmailService,
  ) {}

  /**
   * Send multiple invoices via email in bulk
   */
  async sendBulkInvoiceEmails(
    userId: string,
    invoiceIds: string[],
    options: BulkEmailOptions = {},
  ): Promise<BulkEmailResult> {
    if (!invoiceIds || invoiceIds.length === 0) {
      throw new BadRequestException('Nu au fost selectate facturi');
    }

    if (invoiceIds.length > 100) {
      throw new BadRequestException('Maxim 100 facturi pot fi trimise simultan');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilizator negăsit');
    }

    const organizationId = user.activeOrganizationId;

    // Fetch all invoices
    const invoices = await this.prisma.invoice.findMany({
      where: {
        id: { in: invoiceIds },
        organizationId,
      },
      include: {
        partner: true,
        user: true,
      },
    });

    if (invoices.length === 0) {
      throw new NotFoundException('Nu s-au găsit facturi pentru ID-urile specificate');
    }

    const results: BulkEmailResult['results'] = [];
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    // Process each invoice
    for (const invoice of invoices) {
      const result = await this.sendSingleInvoiceEmail(
        invoice,
        user,
        options,
      );
      results.push(result);

      if (result.status === 'sent') sent++;
      else if (result.status === 'failed') failed++;
      else skipped++;
    }

    this.logger.log(
      `Bulk email completed: ${sent} sent, ${failed} failed, ${skipped} skipped out of ${invoices.length}`,
    );

    return {
      total: invoiceIds.length,
      sent,
      failed,
      skipped,
      results,
    };
  }

  /**
   * Send a single invoice email
   */
  private async sendSingleInvoiceEmail(
    invoice: Invoice & { partner: Partner | null; user: User | null },
    sender: User,
    options: BulkEmailOptions,
  ): Promise<BulkEmailResult['results'][0]> {
    const invoiceNumber = invoice.invoiceNumber;

    // Check if partner has email
    if (!invoice.partner?.email) {
      return {
        invoiceId: invoice.id,
        invoiceNumber,
        recipientEmail: 'N/A',
        status: 'skipped',
        error: 'Partenerul nu are adresă de email',
      };
    }

    try {
      // Generate PDF attachment if requested
      let pdfBuffer: Buffer | null = null;
      if (options.includeAttachment !== false) {
        pdfBuffer = await this.generateInvoicePdf(invoice, sender);
      }

      // Prepare email content
      const subject = options.subject || `Factură #${invoiceNumber} - DocumentIulia`;
      const companyName = sender.company || 'DocumentIulia';

      const textBody = options.message || this.getDefaultEmailBody(invoice, companyName);
      const htmlBody = this.getHtmlEmailBody(invoice, companyName, options.message);

      // Send email
      await this.emailService.sendEmail({
        tenantId: invoice.organizationId || 'default',
        from: {
          email: sender.email,
          name: companyName,
        },
        to: [{ email: invoice.partner.email, name: invoice.partner.name || invoice.partnerName }],
        cc: options.ccEmails?.map(email => ({ email })),
        replyTo: options.replyToEmail ? { email: options.replyToEmail } : undefined,
        subject,
        textBody,
        htmlBody,
        attachments: pdfBuffer
          ? [
              {
                filename: `Factura_${invoiceNumber}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf',
              },
            ]
          : undefined,
        tags: ['invoice', 'bulk-send'],
        createdBy: sender.id,
      });

      // Update invoice to track that email was sent
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          metadata: {
            ...(invoice.metadata as object || {}),
            lastEmailSent: new Date().toISOString(),
            emailSentCount: ((invoice.metadata as any)?.emailSentCount || 0) + 1,
          },
        },
      });

      return {
        invoiceId: invoice.id,
        invoiceNumber,
        recipientEmail: invoice.partner.email,
        status: 'sent',
      };
    } catch (error: any) {
      this.logger.error(`Failed to send email for invoice ${invoiceNumber}: ${error.message}`);
      return {
        invoiceId: invoice.id,
        invoiceNumber,
        recipientEmail: invoice.partner?.email || 'N/A',
        status: 'failed',
        error: error.message,
      };
    }
  }

  /**
   * Generate PDF for invoice
   */
  private async generateInvoicePdf(
    invoice: Invoice & { partner: Partner | null; user: User | null },
    sender: User,
  ): Promise<Buffer> {
    const pdfData = {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      supplier: {
        name: sender.company || 'DocumentIulia.ro',
        cui: sender.cui || '',
        address: '',
      },
      customer: {
        name: invoice.partnerName,
        cui: invoice.partnerCui || undefined,
        address: invoice.partnerAddress || undefined,
      },
      items: [
        {
          description: 'Servicii conform factură',
          quantity: 1,
          unitPrice: Number(invoice.netAmount),
          vatRate: Number(invoice.vatRate),
          total: Number(invoice.netAmount),
        },
      ],
      totals: {
        netAmount: Number(invoice.netAmount),
        vatAmount: Number(invoice.vatAmount),
        grossAmount: Number(invoice.grossAmount),
      },
      currency: invoice.currency,
    };

    return this.pdfService.generateInvoicePdf(pdfData);
  }

  /**
   * Get default email body text
   */
  private getDefaultEmailBody(invoice: Invoice, companyName: string): string {
    const dueDate = invoice.dueDate
      ? new Date(invoice.dueDate).toLocaleDateString('ro-RO')
      : 'N/A';
    const amount = `${Number(invoice.grossAmount).toLocaleString('ro-RO', {
      minimumFractionDigits: 2,
    })} ${invoice.currency}`;

    return `Bună ziua,

Vă transmitem atașat factura #${invoice.invoiceNumber}.

Detalii factură:
- Număr factură: ${invoice.invoiceNumber}
- Data emiterii: ${new Date(invoice.invoiceDate).toLocaleDateString('ro-RO')}
- Data scadenței: ${dueDate}
- Valoare totală: ${amount}

Vă rugăm să efectuați plata până la data scadenței.

Pentru orice întrebări, nu ezitați să ne contactați.

Cu stimă,
${companyName}`;
  }

  /**
   * Get HTML email body
   */
  private getHtmlEmailBody(
    invoice: Invoice,
    companyName: string,
    customMessage?: string,
  ): string {
    const dueDate = invoice.dueDate
      ? new Date(invoice.dueDate).toLocaleDateString('ro-RO')
      : 'N/A';
    const amount = `${Number(invoice.grossAmount).toLocaleString('ro-RO', {
      minimumFractionDigits: 2,
    })} ${invoice.currency}`;
    const issueDate = new Date(invoice.invoiceDate).toLocaleDateString('ro-RO');

    const bodyContent = customMessage
      ? `<p>${customMessage.replace(/\n/g, '<br>')}</p>`
      : `<p>Vă transmitem atașat factura #${invoice.invoiceNumber}.</p>`;

    return `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0; opacity: 0.9; }
    .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .invoice-box { background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .invoice-box table { width: 100%; border-collapse: collapse; }
    .invoice-box td { padding: 8px 0; }
    .invoice-box td:first-child { color: #6B7280; width: 40%; }
    .invoice-box td:last-child { font-weight: 500; text-align: right; }
    .amount-row td { font-size: 18px; color: #4F46E5; border-top: 1px solid #E5E7EB; padding-top: 15px !important; }
    .footer { background: #F9FAFB; padding: 20px; text-align: center; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .footer p { margin: 5px 0; color: #6B7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Factură #${invoice.invoiceNumber}</h1>
      <p>${companyName}</p>
    </div>
    <div class="content">
      <p>Bună ziua,</p>
      ${bodyContent}
      <div class="invoice-box">
        <table>
          <tr>
            <td>Număr factură:</td>
            <td>${invoice.invoiceNumber}</td>
          </tr>
          <tr>
            <td>Data emiterii:</td>
            <td>${issueDate}</td>
          </tr>
          <tr>
            <td>Data scadenței:</td>
            <td>${dueDate}</td>
          </tr>
          <tr class="amount-row">
            <td><strong>Valoare totală:</strong></td>
            <td><strong>${amount}</strong></td>
          </tr>
        </table>
      </div>
      <p>Vă rugăm să efectuați plata până la data scadenței.</p>
      <p>Pentru orice întrebări, nu ezitați să ne contactați.</p>
      <p>Cu stimă,<br><strong>${companyName}</strong></p>
    </div>
    <div class="footer">
      <p>Acest email a fost trimis automat de pe platforma DocumentIulia</p>
      <p>&copy; ${new Date().getFullYear()} ${companyName}. Toate drepturile rezervate.</p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Get emails that can be sent (invoices with partner emails)
   */
  async getEligibleInvoices(
    userId: string,
    invoiceIds: string[],
  ): Promise<{
    eligible: Array<{ id: string; invoiceNumber: string; partnerEmail: string; partnerName: string }>;
    ineligible: Array<{ id: string; invoiceNumber: string; reason: string }>;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilizator negăsit');
    }

    const invoices = await this.prisma.invoice.findMany({
      where: {
        id: { in: invoiceIds },
        organizationId: user.activeOrganizationId,
      },
      include: {
        partner: true,
      },
    });

    const eligible: Array<{ id: string; invoiceNumber: string; partnerEmail: string; partnerName: string }> = [];
    const ineligible: Array<{ id: string; invoiceNumber: string; reason: string }> = [];

    for (const invoice of invoices) {
      if (invoice.partner?.email) {
        eligible.push({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          partnerEmail: invoice.partner.email,
          partnerName: invoice.partner.name || invoice.partnerName,
        });
      } else {
        ineligible.push({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          reason: invoice.partner ? 'Partenerul nu are adresă de email' : 'Partener negăsit',
        });
      }
    }

    // Check for invoices that weren't found
    const foundIds = invoices.map((i) => i.id);
    const notFoundIds = invoiceIds.filter((id) => !foundIds.includes(id));
    for (const id of notFoundIds) {
      ineligible.push({
        id,
        invoiceNumber: 'N/A',
        reason: 'Factura nu a fost găsită',
      });
    }

    return { eligible, ineligible };
  }

  /**
   * Preview email before sending
   */
  async previewEmail(
    userId: string,
    invoiceId: string,
    options: BulkEmailOptions = {},
  ): Promise<{
    subject: string;
    textBody: string;
    htmlBody: string;
    recipientEmail: string;
    recipientName: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilizator negăsit');
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        organizationId: user.activeOrganizationId,
      },
      include: {
        partner: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Factura nu a fost găsită');
    }

    const companyName = user.company || 'DocumentIulia';
    const subject = options.subject || `Factură #${invoice.invoiceNumber} - DocumentIulia`;
    const textBody = options.message || this.getDefaultEmailBody(invoice, companyName);
    const htmlBody = this.getHtmlEmailBody(invoice, companyName, options.message);

    return {
      subject,
      textBody,
      htmlBody,
      recipientEmail: invoice.partner?.email || 'N/A',
      recipientName: invoice.partner?.name || invoice.partnerName,
    };
  }
}
