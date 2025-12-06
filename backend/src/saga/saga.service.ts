import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

// SAGA v3.2 REST API Integration
// Per Pynbooking/SAP efficiency patterns, Order 1783/2021 compliance

interface SagaConfig {
  apiUrl: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
}

interface SagaInvoice {
  id?: string;
  number: string;
  date: string;
  partner: {
    name: string;
    cui: string;
    address?: string;
  };
  lines: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
  }>;
  totals: {
    net: number;
    vat: number;
    gross: number;
  };
}

@Injectable()
export class SagaService {
  private readonly logger = new Logger(SagaService.name);
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(private configService: ConfigService) {
    this.client = axios.create({
      baseURL: this.configService.get('SAGA_API_URL') || 'https://api.saga.ro/v3.2',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // OAuth2 authentication for SAGA v3.2
  async authenticate(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await this.client.post('/oauth/token', {
        grant_type: 'client_credentials',
        client_id: this.configService.get('SAGA_CLIENT_ID'),
        client_secret: this.configService.get('SAGA_CLIENT_SECRET'),
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);

      return this.accessToken;
    } catch (error) {
      this.logger.error('SAGA authentication failed', error);
      throw new Error('Failed to authenticate with SAGA');
    }
  }

  // Sync invoice to SAGA
  async syncInvoice(invoice: SagaInvoice): Promise<{ sagaId: string; status: string }> {
    const token = await this.authenticate();

    try {
      const response = await this.client.post(
        '/invoices',
        {
          invoice_number: invoice.number,
          invoice_date: invoice.date,
          partner: invoice.partner,
          lines: invoice.lines.map((line) => ({
            description: line.description,
            quantity: line.quantity,
            unit_price: line.unitPrice,
            vat_rate: line.vatRate,
          })),
          totals: invoice.totals,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      this.logger.log(`Invoice synced to SAGA: ${response.data.id}`);
      return {
        sagaId: response.data.id,
        status: 'synced',
      };
    } catch (error) {
      this.logger.error('Failed to sync invoice to SAGA', error);
      throw error;
    }
  }

  // Print invoice via SAGA
  async printInvoice(sagaId: string): Promise<Buffer> {
    const token = await this.authenticate();

    const response = await this.client.get(`/invoices/${sagaId}/print`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'arraybuffer',
    });

    return Buffer.from(response.data);
  }

  // Delete invoice from SAGA
  async deleteInvoice(sagaId: string): Promise<void> {
    const token = await this.authenticate();

    await this.client.delete(`/invoices/${sagaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    this.logger.log(`Invoice deleted from SAGA: ${sagaId}`);
  }

  // Sync payroll data
  async syncPayroll(payrollData: any): Promise<{ sagaId: string }> {
    const token = await this.authenticate();

    const response = await this.client.post('/payroll', payrollData, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return { sagaId: response.data.id };
  }

  // Sync inventory
  async syncInventory(inventoryData: any): Promise<{ sagaId: string }> {
    const token = await this.authenticate();

    const response = await this.client.post('/inventory', inventoryData, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return { sagaId: response.data.id };
  }

  // Generate SAF-T XML for SAGA data
  async generateSAFTXml(period: string): Promise<string> {
    const token = await this.authenticate();

    const response = await this.client.get(`/saft/generate`, {
      params: { period },
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data.xml;
  }

  // Validate with DUKIntegrator
  async validateWithDUK(xml: string): Promise<{ valid: boolean; errors: string[] }> {
    const token = await this.authenticate();

    const response = await this.client.post(
      '/saft/validate',
      { xml },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    return {
      valid: response.data.valid,
      errors: response.data.errors || [],
    };
  }
}
