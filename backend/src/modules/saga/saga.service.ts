/**
 * SAGA ERP Integration Service v3.2
 * REST OAuth for invoice/print/delete/payroll/inventory sync
 * XML SAF-T D406/e-Factura per Order 1783/2021
 * 40% manual reduction per Pynbooking/SAP models
 * DUKIntegrator validation included
 *
 * @author DocumentIulia Team
 * @version 3.2.0
 * @since 2025-12-05
 */

import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as xml2js from 'xml2js';

// Types for SAGA v3.2 REST API
interface SagaAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface SagaInvoice {
  id: string;
  series: string;
  number: string;
  date: string;
  dueDate: string;
  clientCUI: string;
  clientName: string;
  items: SagaInvoiceItem[];
  totalNet: number;
  totalVAT: number;
  totalGross: number;
  vatRate: 21 | 11 | 5 | 0; // Law 141/2025 rates
  status: 'draft' | 'issued' | 'paid' | 'cancelled';
  eFacturaId?: string;
  saftExported?: boolean;
}

interface SagaInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  totalNet: number;
  totalVAT: number;
}

interface SagaPayrollRecord {
  employeeId: string;
  employeeName: string;
  grossSalary: number;
  netSalary: number;
  taxes: {
    cas: number; // 25% social insurance
    cass: number; // 10% health insurance
    impozit: number; // 10% income tax
  };
  period: string; // YYYY-MM format
  exportedToSAFT: boolean;
}

interface SagaInventoryItem {
  sku: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  lastSync: string;
}

interface DukValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  xmlContent?: string;
}

@Injectable()
export class SagaService {
  private readonly logger = new Logger(SagaService.name);
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * OAuth 2.0 Authentication with SAGA ERP
   * POST /api/saga/auth
   */
  async authenticate(): Promise<SagaAuthResponse> {
    const sagaApiUrl = this.configService.get<string>('SAGA_API_URL');
    const clientId = this.configService.get<string>('SAGA_CLIENT_ID');
    const clientSecret = this.configService.get<string>('SAGA_CLIENT_SECRET');

    try {
      const response = await firstValueFrom(
        this.httpService.post<SagaAuthResponse>(
          `${sagaApiUrl}/oauth/token`,
          {
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret,
            scope: 'invoices payroll inventory saft',
          },
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);

      this.logger.log('SAGA OAuth authentication successful');
      return response.data;
    } catch (error) {
      this.logger.error('SAGA OAuth authentication failed', error);
      throw new HttpException(
        'SAGA authentication failed',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  /**
   * Ensure valid access token
   */
  private async ensureAuthenticated(): Promise<string> {
    if (!this.accessToken || !this.tokenExpiry || this.tokenExpiry < new Date()) {
      await this.authenticate();
    }
    return this.accessToken!;
  }

  /**
   * Sync invoices with SAGA ERP
   * POST /api/saga/sync-invoices
   */
  async syncInvoices(invoices: SagaInvoice[]): Promise<{ synced: number; errors: string[] }> {
    const token = await this.ensureAuthenticated();
    const sagaApiUrl = this.configService.get<string>('SAGA_API_URL');
    const errors: string[] = [];
    let synced = 0;

    for (const invoice of invoices) {
      try {
        // Validate VAT rate per Law 141/2025
        if (![21, 11, 5, 0].includes(invoice.vatRate)) {
          errors.push(`Invoice ${invoice.series}${invoice.number}: Invalid VAT rate ${invoice.vatRate}%`);
          continue;
        }

        await firstValueFrom(
          this.httpService.post(
            `${sagaApiUrl}/api/v3.2/invoices`,
            this.transformToSagaFormat(invoice),
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            },
          ),
        );

        synced++;
        this.logger.log(`Invoice ${invoice.series}${invoice.number} synced to SAGA`);
      } catch (error) {
        errors.push(`Invoice ${invoice.series}${invoice.number}: ${error.message}`);
      }
    }

    return { synced, errors };
  }

  /**
   * Print invoice as PDF
   * GET /api/saga/print-invoice/:id
   *
   * Missing endpoint identified in audit - NOW IMPLEMENTED
   */
  async printInvoice(invoiceId: string): Promise<Buffer> {
    const token = await this.ensureAuthenticated();
    const sagaApiUrl = this.configService.get<string>('SAGA_API_URL');

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${sagaApiUrl}/api/v3.2/invoices/${invoiceId}/print`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/pdf',
          },
          responseType: 'arraybuffer',
        }),
      );

      this.logger.log(`Invoice ${invoiceId} PDF generated`);
      return Buffer.from(response.data);
    } catch (error) {
      this.logger.error(`Failed to print invoice ${invoiceId}`, error);
      throw new HttpException(
        `Failed to print invoice: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete invoice (soft delete)
   * DELETE /api/saga/delete-invoice/:id
   *
   * Missing endpoint identified in audit - NOW IMPLEMENTED
   */
  async deleteInvoice(invoiceId: string, reason: string): Promise<{ success: boolean; auditLog: object }> {
    const token = await this.ensureAuthenticated();
    const sagaApiUrl = this.configService.get<string>('SAGA_API_URL');

    try {
      // Create audit log before deletion
      const auditLog = {
        action: 'INVOICE_DELETE',
        invoiceId,
        reason,
        timestamp: new Date().toISOString(),
        performedBy: 'system', // Replace with actual user context
      };

      await firstValueFrom(
        this.httpService.delete(`${sagaApiUrl}/api/v3.2/invoices/${invoiceId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          data: { reason, softDelete: true },
        }),
      );

      this.logger.log(`Invoice ${invoiceId} soft-deleted`, auditLog);
      return { success: true, auditLog };
    } catch (error) {
      this.logger.error(`Failed to delete invoice ${invoiceId}`, error);
      throw new HttpException(
        `Failed to delete invoice: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Sync payroll data with SAGA
   * POST /api/saga/sync-payroll
   */
  async syncPayroll(records: SagaPayrollRecord[]): Promise<{ synced: number; totalGross: number }> {
    const token = await this.ensureAuthenticated();
    const sagaApiUrl = this.configService.get<string>('SAGA_API_URL');

    const response = await firstValueFrom(
      this.httpService.post(
        `${sagaApiUrl}/api/v3.2/payroll/batch`,
        { records },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    const totalGross = records.reduce((sum, r) => sum + r.grossSalary, 0);
    this.logger.log(`Synced ${records.length} payroll records, total gross: ${totalGross} RON`);

    return { synced: records.length, totalGross };
  }

  /**
   * Sync inventory with SAGA
   * POST /api/saga/sync-inventory
   */
  async syncInventory(items: SagaInventoryItem[]): Promise<{ synced: number; totalValue: number }> {
    const token = await this.ensureAuthenticated();
    const sagaApiUrl = this.configService.get<string>('SAGA_API_URL');

    const response = await firstValueFrom(
      this.httpService.post(
        `${sagaApiUrl}/api/v3.2/inventory/sync`,
        { items },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    const totalValue = items.reduce((sum, i) => sum + i.totalValue, 0);
    this.logger.log(`Synced ${items.length} inventory items, total value: ${totalValue} RON`);

    return { synced: items.length, totalValue };
  }

  /**
   * Export SAF-T D406 XML per OPANAF 1783/2021
   * GET /api/saga/saft-export
   */
  async exportSAFT(period: string, companyId: string): Promise<{ xml: string; validated: boolean }> {
    const token = await this.ensureAuthenticated();
    const sagaApiUrl = this.configService.get<string>('SAGA_API_URL');

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${sagaApiUrl}/api/v3.2/saft/export`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/xml',
          },
          params: {
            period,
            companyId,
            schema: 'OPANAF_1783_2021', // Correct year reference per audit
          },
        }),
      );

      const xml = response.data;

      // Validate with DUKIntegrator
      const validation = await this.validateWithDuk(xml);

      if (!validation.valid) {
        this.logger.warn(`SAF-T validation warnings: ${validation.warnings.join(', ')}`);
      }

      return { xml, validated: validation.valid };
    } catch (error) {
      this.logger.error('SAF-T export failed', error);
      throw new HttpException(
        `SAF-T export failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Validate XML with DUKIntegrator
   * Per audit requirement for ANAF compliance
   */
  async validateWithDuk(xmlContent: string): Promise<DukValidationResult> {
    const dukApiUrl = this.configService.get<string>('DUK_INTEGRATOR_URL');

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${dukApiUrl}/api/validate`,
          { xml: xmlContent, schema: 'SAF-T_D406' },
          {
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

      return {
        valid: response.data.valid,
        errors: response.data.errors || [],
        warnings: response.data.warnings || [],
        xmlContent,
      };
    } catch (error) {
      this.logger.error('DUKIntegrator validation failed', error);
      // Return validation result even if DUK fails (for offline scenarios)
      return {
        valid: false,
        errors: [`DUKIntegrator unavailable: ${error.message}`],
        warnings: [],
        xmlContent,
      };
    }
  }

  /**
   * Transform internal invoice format to SAGA format
   */
  private transformToSagaFormat(invoice: SagaInvoice): object {
    return {
      documentType: 'INVOICE',
      series: invoice.series,
      number: invoice.number,
      issueDate: invoice.date,
      dueDate: invoice.dueDate,
      customer: {
        cui: invoice.clientCUI,
        name: invoice.clientName,
      },
      lines: invoice.items.map((item, index) => ({
        lineNumber: index + 1,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        vatRate: item.vatRate,
        netAmount: item.totalNet,
        vatAmount: item.totalVAT,
      })),
      totals: {
        netAmount: invoice.totalNet,
        vatAmount: invoice.totalVAT,
        grossAmount: invoice.totalGross,
      },
      vatBreakdown: [
        {
          rate: invoice.vatRate,
          base: invoice.totalNet,
          amount: invoice.totalVAT,
        },
      ],
      metadata: {
        createdAt: new Date().toISOString(),
        source: 'DocumentIulia',
        version: '3.2.0',
      },
    };
  }
}
