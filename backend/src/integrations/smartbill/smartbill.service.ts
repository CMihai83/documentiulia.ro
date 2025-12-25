import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface SmartBillConfig {
  apiKey: string;
  email: string;
  companyVat: string;
}

export interface SmartBillInvoice {
  companyVatCode: string;
  client: {
    name: string;
    vatCode?: string;
    regCom?: string;
    address?: string;
    city?: string;
    county?: string;
    country?: string;
    email?: string;
    phone?: string;
    bank?: string;
    iban?: string;
    isTaxPayer: boolean;
  };
  number?: string;
  seriesName: string;
  issueDate: string;
  dueDate?: string;
  deliveryDate?: string;
  currency: string;
  exchangeRate?: number;
  language?: string;
  precision?: number;
  observations?: string;
  products: SmartBillProduct[];
  payment?: {
    type: string;
    value: number;
    isCash: boolean;
  };
}

export interface SmartBillProduct {
  name: string;
  code?: string;
  productDescription?: string;
  isDiscount: boolean;
  measuringUnitName: string;
  currency: string;
  quantity: number;
  price: number;
  isTaxIncluded: boolean;
  taxName: string;
  taxPercentage: number;
  saveToDb?: boolean;
  isService: boolean;
}

export interface SmartBillResponse {
  errorText?: string;
  message?: string;
  number?: string;
  series?: string;
  url?: string;
}

export interface SmartBillClientInfo {
  name: string;
  vatCode: string;
  regCom: string;
  address: string;
  city: string;
  county: string;
  country: string;
  email: string;
  phone: string;
  iban: string;
  bank: string;
  isTaxPayer: boolean;
}

@Injectable()
export class SmartBillService {
  private readonly logger = new Logger(SmartBillService.name);
  private axiosInstance: AxiosInstance;
  private readonly baseUrl = 'https://ws.smartbill.ro/SBORO/api';

  constructor(private configService: ConfigService) {
    // Initialize default axios instance (will be configured per-request with user credentials)
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  }

  private getAuthHeaders(config: SmartBillConfig): Record<string, string> {
    const auth = Buffer.from(`${config.email}:${config.apiKey}`).toString('base64');
    return {
      'Authorization': `Basic ${auth}`,
    };
  }

  /**
   * Test SmartBill connection with provided credentials
   */
  async testConnection(config: SmartBillConfig): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.axiosInstance.get('/tax', {
        headers: this.getAuthHeaders(config),
        params: { cif: config.companyVat },
      });

      if (response.data) {
        return { success: true, message: 'Conexiune SmartBill reușită!' };
      }
      return { success: false, message: 'Răspuns neașteptat de la SmartBill' };
    } catch (error: any) {
      this.logger.error('SmartBill connection test failed', error.message);
      return {
        success: false,
        message: error.response?.data?.errorText || 'Eroare la conectarea cu SmartBill',
      };
    }
  }

  /**
   * Get available invoice series
   */
  async getInvoiceSeries(config: SmartBillConfig): Promise<string[]> {
    try {
      const response = await this.axiosInstance.get('/series', {
        headers: this.getAuthHeaders(config),
        params: { cif: config.companyVat, type: 'f' }, // f = facturi
      });

      return response.data?.list?.map((s: any) => s.name) || [];
    } catch (error: any) {
      this.logger.error('Failed to fetch SmartBill series', error.message);
      throw new HttpException(
        error.response?.data?.errorText || 'Eroare la obținerea seriilor',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Get available tax rates
   */
  async getTaxRates(config: SmartBillConfig): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get('/tax', {
        headers: this.getAuthHeaders(config),
        params: { cif: config.companyVat },
      });

      return response.data?.taxes || [];
    } catch (error: any) {
      this.logger.error('Failed to fetch SmartBill tax rates', error.message);
      throw new HttpException(
        error.response?.data?.errorText || 'Eroare la obținerea cotelor TVA',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Create invoice in SmartBill
   */
  async createInvoice(
    config: SmartBillConfig,
    invoice: SmartBillInvoice,
  ): Promise<SmartBillResponse> {
    try {
      // Ensure companyVatCode is set
      invoice.companyVatCode = config.companyVat;

      const response = await this.axiosInstance.post('/invoice', invoice, {
        headers: this.getAuthHeaders(config),
      });

      this.logger.log(`SmartBill invoice created: ${response.data?.series}${response.data?.number}`);

      return {
        number: response.data?.number,
        series: response.data?.series,
        url: response.data?.url,
      };
    } catch (error: any) {
      this.logger.error('Failed to create SmartBill invoice', error.response?.data || error.message);
      throw new HttpException(
        error.response?.data?.errorText || 'Eroare la crearea facturii în SmartBill',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Get invoice PDF from SmartBill
   */
  async getInvoicePdf(
    config: SmartBillConfig,
    series: string,
    number: string,
  ): Promise<Buffer> {
    try {
      const response = await this.axiosInstance.get('/invoice/pdf', {
        headers: this.getAuthHeaders(config),
        params: {
          cif: config.companyVat,
          seriesname: series,
          number: number,
        },
        responseType: 'arraybuffer',
      });

      return Buffer.from(response.data);
    } catch (error: any) {
      this.logger.error('Failed to get SmartBill invoice PDF', error.message);
      throw new HttpException(
        error.response?.data?.errorText || 'Eroare la descărcarea PDF-ului',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Cancel/Storno invoice in SmartBill
   */
  async cancelInvoice(
    config: SmartBillConfig,
    series: string,
    number: string,
  ): Promise<SmartBillResponse> {
    try {
      const response = await this.axiosInstance.delete('/invoice', {
        headers: this.getAuthHeaders(config),
        params: {
          cif: config.companyVat,
          seriesname: series,
          number: number,
        },
      });

      this.logger.log(`SmartBill invoice cancelled: ${series}${number}`);
      return { message: 'Factura a fost anulată cu succes' };
    } catch (error: any) {
      this.logger.error('Failed to cancel SmartBill invoice', error.message);
      throw new HttpException(
        error.response?.data?.errorText || 'Eroare la anularea facturii',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Register payment in SmartBill
   */
  async registerPayment(
    config: SmartBillConfig,
    series: string,
    number: string,
    payment: {
      value: number;
      type: 'Card' | 'Numerar' | 'Ordin de plata' | 'Alta incasare';
      paymentDate: string;
    },
  ): Promise<SmartBillResponse> {
    try {
      const response = await this.axiosInstance.put('/invoice/payment', {
        companyVatCode: config.companyVat,
        seriesName: series,
        number: number,
        value: payment.value,
        type: payment.type,
        paymentDate: payment.paymentDate,
        isCash: payment.type === 'Numerar',
      }, {
        headers: this.getAuthHeaders(config),
      });

      this.logger.log(`SmartBill payment registered for ${series}${number}`);
      return { message: 'Încasarea a fost înregistrată cu succes' };
    } catch (error: any) {
      this.logger.error('Failed to register SmartBill payment', error.message);
      throw new HttpException(
        error.response?.data?.errorText || 'Eroare la înregistrarea încasării',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Get client information by VAT code
   */
  async getClientByVat(
    config: SmartBillConfig,
    vatCode: string,
  ): Promise<SmartBillClientInfo | null> {
    try {
      const response = await this.axiosInstance.get('/partner', {
        headers: this.getAuthHeaders(config),
        params: {
          cif: config.companyVat,
          partnerVatCode: vatCode,
        },
      });

      if (response.data?.partner) {
        return response.data.partner as SmartBillClientInfo;
      }
      return null;
    } catch (error: any) {
      this.logger.error('Failed to get SmartBill client', error.message);
      return null;
    }
  }

  /**
   * Sync invoices from SmartBill (for import)
   */
  async getInvoices(
    config: SmartBillConfig,
    startDate: string,
    endDate: string,
  ): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get('/invoice/list', {
        headers: this.getAuthHeaders(config),
        params: {
          cif: config.companyVat,
          startDate: startDate,
          endDate: endDate,
        },
      });

      return response.data?.list || [];
    } catch (error: any) {
      this.logger.error('Failed to get SmartBill invoices', error.message);
      throw new HttpException(
        error.response?.data?.errorText || 'Eroare la obținerea facturilor',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Get stock from SmartBill
   */
  async getStock(config: SmartBillConfig, warehouseName?: string): Promise<any[]> {
    try {
      const params: any = { cif: config.companyVat };
      if (warehouseName) {
        params.warehouseName = warehouseName;
      }

      const response = await this.axiosInstance.get('/stocks', {
        headers: this.getAuthHeaders(config),
        params,
      });

      return response.data?.list || [];
    } catch (error: any) {
      this.logger.error('Failed to get SmartBill stock', error.message);
      throw new HttpException(
        error.response?.data?.errorText || 'Eroare la obținerea stocului',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Convert our invoice format to SmartBill format
   */
  convertToSmartBillInvoice(
    invoice: any,
    seriesName: string,
    companyVat: string,
  ): SmartBillInvoice {
    return {
      companyVatCode: companyVat,
      client: {
        name: invoice.partner?.name || invoice.partnerName,
        vatCode: invoice.partner?.cui || invoice.partnerCui || undefined,
        regCom: invoice.partner?.registrationNumber || undefined,
        address: invoice.partner?.address || undefined,
        city: invoice.partner?.city || undefined,
        county: invoice.partner?.county || undefined,
        country: invoice.partner?.country || 'Romania',
        email: invoice.partner?.email || undefined,
        phone: invoice.partner?.phone || undefined,
        isTaxPayer: Boolean(invoice.partner?.cui),
      },
      seriesName: seriesName,
      issueDate: new Date(invoice.invoiceDate).toISOString().split('T')[0],
      dueDate: invoice.dueDate
        ? new Date(invoice.dueDate).toISOString().split('T')[0]
        : undefined,
      currency: invoice.currency || 'RON',
      language: 'RO',
      products: (invoice.items || []).map((item: any) => ({
        name: item.description || item.name,
        code: item.code || undefined,
        isDiscount: false,
        measuringUnitName: item.unit || 'buc',
        currency: invoice.currency || 'RON',
        quantity: item.quantity || 1,
        price: item.unitPrice || item.price || 0,
        isTaxIncluded: false,
        taxName: `${item.vatRate || 19}%`,
        taxPercentage: item.vatRate || 19,
        isService: item.isService || false,
      })),
      observations: invoice.notes || undefined,
    };
  }
}
