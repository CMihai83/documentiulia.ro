import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface QuickBooksConfig {
  accessToken: string;
  refreshToken: string;
  realmId: string; // Company ID
  expiresAt?: Date;
}

export interface QuickBooksOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  environment: 'sandbox' | 'production';
}

export interface QuickBooksCustomer {
  Id?: string;
  SyncToken?: string;
  DisplayName: string;
  CompanyName?: string;
  PrimaryEmailAddr?: { Address: string };
  PrimaryPhone?: { FreeFormNumber: string };
  BillAddr?: {
    Line1?: string;
    City?: string;
    CountrySubDivisionCode?: string;
    PostalCode?: string;
    Country?: string;
  };
  Active?: boolean;
}

export interface QuickBooksInvoice {
  Id?: string;
  SyncToken?: string;
  DocNumber?: string;
  TxnDate: string;
  DueDate?: string;
  CustomerRef: { value: string; name?: string };
  CurrencyRef?: { value: string };
  Line: QuickBooksInvoiceLine[];
  TotalAmt?: number;
  Balance?: number;
  EmailStatus?: string;
  PrivateNote?: string;
  CustomerMemo?: { value: string };
}

export interface QuickBooksInvoiceLine {
  Id?: string;
  LineNum?: number;
  Description?: string;
  Amount: number;
  DetailType: 'SalesItemLineDetail' | 'SubTotalLineDetail' | 'DescriptionOnly';
  SalesItemLineDetail?: {
    ItemRef?: { value: string; name?: string };
    Qty?: number;
    UnitPrice?: number;
    TaxCodeRef?: { value: string };
  };
}

export interface QuickBooksItem {
  Id?: string;
  Name: string;
  Description?: string;
  Type: 'Inventory' | 'Service' | 'NonInventory';
  UnitPrice?: number;
  IncomeAccountRef?: { value: string };
  ExpenseAccountRef?: { value: string };
  AssetAccountRef?: { value: string };
  Active?: boolean;
  Taxable?: boolean;
  QtyOnHand?: number;
}

export interface QuickBooksPayment {
  Id?: string;
  TotalAmt: number;
  CustomerRef: { value: string };
  TxnDate: string;
  PaymentMethodRef?: { value: string };
  Line?: {
    Amount: number;
    LinkedTxn: { TxnId: string; TxnType: string }[];
  }[];
}

export interface QuickBooksAccount {
  Id: string;
  Name: string;
  FullyQualifiedName: string;
  AccountType: string;
  AccountSubType: string;
  CurrentBalance?: number;
  Active: boolean;
}

@Injectable()
export class QuickBooksService {
  private readonly logger = new Logger(QuickBooksService.name);
  private axiosInstance: AxiosInstance;
  private oauthConfig: QuickBooksOAuthConfig;

  // QuickBooks API base URLs
  private readonly SANDBOX_BASE_URL = 'https://sandbox-quickbooks.api.intuit.com';
  private readonly PRODUCTION_BASE_URL = 'https://quickbooks.api.intuit.com';
  private readonly OAUTH_BASE_URL = 'https://oauth.platform.intuit.com/oauth2/v1';
  private readonly DISCOVERY_SANDBOX = 'https://developer.api.intuit.com/.well-known/openid_sandbox_configuration';
  private readonly DISCOVERY_PRODUCTION = 'https://developer.api.intuit.com/.well-known/openid_configuration';

  constructor(private configService: ConfigService) {
    this.oauthConfig = {
      clientId: this.configService.get('QUICKBOOKS_CLIENT_ID') || '',
      clientSecret: this.configService.get('QUICKBOOKS_CLIENT_SECRET') || '',
      redirectUri: this.configService.get('QUICKBOOKS_REDIRECT_URI') || '',
      environment: (this.configService.get('QUICKBOOKS_ENVIRONMENT') || 'sandbox') as 'sandbox' | 'production',
    };

    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }

  private getBaseUrl(): string {
    return this.oauthConfig.environment === 'production'
      ? this.PRODUCTION_BASE_URL
      : this.SANDBOX_BASE_URL;
  }

  private getHeaders(accessToken: string): Record<string, string> {
    return {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthorizationUrl(state: string): string {
    const scopes = [
      'com.intuit.quickbooks.accounting',
      'com.intuit.quickbooks.payment',
      'openid',
      'profile',
      'email',
    ].join(' ');

    const params = new URLSearchParams({
      client_id: this.oauthConfig.clientId,
      redirect_uri: this.oauthConfig.redirectUri,
      response_type: 'code',
      scope: scopes,
      state: state,
    });

    return `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    realmId: string;
    expiresIn: number;
  }> {
    try {
      const auth = Buffer.from(
        `${this.oauthConfig.clientId}:${this.oauthConfig.clientSecret}`
      ).toString('base64');

      const response = await axios.post(
        `${this.OAUTH_BASE_URL}/tokens/bearer`,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: this.oauthConfig.redirectUri,
        }).toString(),
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
        }
      );

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        realmId: response.data.realmId || '',
        expiresIn: response.data.expires_in,
      };
    } catch (error: any) {
      this.logger.error('Failed to exchange QuickBooks code for tokens', error.response?.data);
      throw new HttpException(
        'Failed to connect to QuickBooks',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    try {
      const auth = Buffer.from(
        `${this.oauthConfig.clientId}:${this.oauthConfig.clientSecret}`
      ).toString('base64');

      const response = await axios.post(
        `${this.OAUTH_BASE_URL}/tokens/bearer`,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }).toString(),
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
        }
      );

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
      };
    } catch (error: any) {
      this.logger.error('Failed to refresh QuickBooks token', error.response?.data);
      throw new HttpException(
        'Failed to refresh QuickBooks connection',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  /**
   * Test connection
   */
  async testConnection(config: QuickBooksConfig): Promise<{ success: boolean; companyName: string }> {
    try {
      const response = await this.axiosInstance.get(
        `${this.getBaseUrl()}/v3/company/${config.realmId}/companyinfo/${config.realmId}`,
        { headers: this.getHeaders(config.accessToken) }
      );

      return {
        success: true,
        companyName: response.data.CompanyInfo.CompanyName,
      };
    } catch (error: any) {
      this.logger.error('QuickBooks connection test failed', error.response?.data);
      return { success: false, companyName: '' };
    }
  }

  /**
   * Get company info
   */
  async getCompanyInfo(config: QuickBooksConfig): Promise<any> {
    try {
      const response = await this.axiosInstance.get(
        `${this.getBaseUrl()}/v3/company/${config.realmId}/companyinfo/${config.realmId}`,
        { headers: this.getHeaders(config.accessToken) }
      );
      return response.data.CompanyInfo;
    } catch (error: any) {
      this.logger.error('Failed to get QuickBooks company info', error.response?.data);
      throw new HttpException('Failed to get company info', HttpStatus.BAD_REQUEST);
    }
  }

  // ============ CUSTOMERS ============

  /**
   * Get all customers
   */
  async getCustomers(config: QuickBooksConfig, maxResults = 1000): Promise<QuickBooksCustomer[]> {
    try {
      const query = `SELECT * FROM Customer MAXRESULTS ${maxResults}`;
      const response = await this.axiosInstance.get(
        `${this.getBaseUrl()}/v3/company/${config.realmId}/query`,
        {
          headers: this.getHeaders(config.accessToken),
          params: { query },
        }
      );
      return response.data.QueryResponse?.Customer || [];
    } catch (error: any) {
      this.logger.error('Failed to get QuickBooks customers', error.response?.data);
      throw new HttpException('Failed to get customers', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Create customer
   */
  async createCustomer(config: QuickBooksConfig, customer: QuickBooksCustomer): Promise<QuickBooksCustomer> {
    try {
      const response = await this.axiosInstance.post(
        `${this.getBaseUrl()}/v3/company/${config.realmId}/customer`,
        customer,
        { headers: this.getHeaders(config.accessToken) }
      );
      return response.data.Customer;
    } catch (error: any) {
      this.logger.error('Failed to create QuickBooks customer', error.response?.data);
      throw new HttpException(
        error.response?.data?.Fault?.Error?.[0]?.Message || 'Failed to create customer',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Update customer
   */
  async updateCustomer(config: QuickBooksConfig, customer: QuickBooksCustomer): Promise<QuickBooksCustomer> {
    try {
      // First get the current version (SyncToken)
      const current = await this.getCustomerById(config, customer.Id!);
      customer['SyncToken'] = current['SyncToken'];

      const response = await this.axiosInstance.post(
        `${this.getBaseUrl()}/v3/company/${config.realmId}/customer`,
        customer,
        { headers: this.getHeaders(config.accessToken) }
      );
      return response.data.Customer;
    } catch (error: any) {
      this.logger.error('Failed to update QuickBooks customer', error.response?.data);
      throw new HttpException('Failed to update customer', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(config: QuickBooksConfig, customerId: string): Promise<QuickBooksCustomer> {
    try {
      const response = await this.axiosInstance.get(
        `${this.getBaseUrl()}/v3/company/${config.realmId}/customer/${customerId}`,
        { headers: this.getHeaders(config.accessToken) }
      );
      return response.data.Customer;
    } catch (error: any) {
      this.logger.error('Failed to get QuickBooks customer', error.response?.data);
      throw new HttpException('Failed to get customer', HttpStatus.NOT_FOUND);
    }
  }

  // ============ INVOICES ============

  /**
   * Get all invoices
   */
  async getInvoices(config: QuickBooksConfig, options?: {
    startDate?: string;
    endDate?: string;
    maxResults?: number;
  }): Promise<QuickBooksInvoice[]> {
    try {
      let query = 'SELECT * FROM Invoice';
      const conditions: string[] = [];

      if (options?.startDate) {
        conditions.push(`TxnDate >= '${options.startDate}'`);
      }
      if (options?.endDate) {
        conditions.push(`TxnDate <= '${options.endDate}'`);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ` MAXRESULTS ${options?.maxResults || 1000}`;

      const response = await this.axiosInstance.get(
        `${this.getBaseUrl()}/v3/company/${config.realmId}/query`,
        {
          headers: this.getHeaders(config.accessToken),
          params: { query },
        }
      );
      return response.data.QueryResponse?.Invoice || [];
    } catch (error: any) {
      this.logger.error('Failed to get QuickBooks invoices', error.response?.data);
      throw new HttpException('Failed to get invoices', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Create invoice
   */
  async createInvoice(config: QuickBooksConfig, invoice: QuickBooksInvoice): Promise<QuickBooksInvoice> {
    try {
      const response = await this.axiosInstance.post(
        `${this.getBaseUrl()}/v3/company/${config.realmId}/invoice`,
        invoice,
        { headers: this.getHeaders(config.accessToken) }
      );
      this.logger.log(`QuickBooks invoice created: ${response.data.Invoice.DocNumber}`);
      return response.data.Invoice;
    } catch (error: any) {
      this.logger.error('Failed to create QuickBooks invoice', error.response?.data);
      throw new HttpException(
        error.response?.data?.Fault?.Error?.[0]?.Message || 'Failed to create invoice',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Get invoice by ID
   */
  async getInvoiceById(config: QuickBooksConfig, invoiceId: string): Promise<QuickBooksInvoice> {
    try {
      const response = await this.axiosInstance.get(
        `${this.getBaseUrl()}/v3/company/${config.realmId}/invoice/${invoiceId}`,
        { headers: this.getHeaders(config.accessToken) }
      );
      return response.data.Invoice;
    } catch (error: any) {
      this.logger.error('Failed to get QuickBooks invoice', error.response?.data);
      throw new HttpException('Failed to get invoice', HttpStatus.NOT_FOUND);
    }
  }

  /**
   * Get invoice PDF
   */
  async getInvoicePdf(config: QuickBooksConfig, invoiceId: string): Promise<Buffer> {
    try {
      const response = await this.axiosInstance.get(
        `${this.getBaseUrl()}/v3/company/${config.realmId}/invoice/${invoiceId}/pdf`,
        {
          headers: {
            ...this.getHeaders(config.accessToken),
            'Accept': 'application/pdf',
          },
          responseType: 'arraybuffer',
        }
      );
      return Buffer.from(response.data);
    } catch (error: any) {
      this.logger.error('Failed to get QuickBooks invoice PDF', error.response?.data);
      throw new HttpException('Failed to get invoice PDF', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Send invoice via email
   */
  async sendInvoice(config: QuickBooksConfig, invoiceId: string, email?: string): Promise<QuickBooksInvoice> {
    try {
      let url = `${this.getBaseUrl()}/v3/company/${config.realmId}/invoice/${invoiceId}/send`;
      if (email) {
        url += `?sendTo=${encodeURIComponent(email)}`;
      }

      const response = await this.axiosInstance.post(
        url,
        null,
        { headers: this.getHeaders(config.accessToken) }
      );
      return response.data.Invoice;
    } catch (error: any) {
      this.logger.error('Failed to send QuickBooks invoice', error.response?.data);
      throw new HttpException('Failed to send invoice', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Void invoice
   */
  async voidInvoice(config: QuickBooksConfig, invoiceId: string): Promise<QuickBooksInvoice> {
    try {
      const invoice = await this.getInvoiceById(config, invoiceId);

      const response = await this.axiosInstance.post(
        `${this.getBaseUrl()}/v3/company/${config.realmId}/invoice?operation=void`,
        {
          Id: invoiceId,
          SyncToken: invoice['SyncToken'],
        },
        { headers: this.getHeaders(config.accessToken) }
      );
      return response.data.Invoice;
    } catch (error: any) {
      this.logger.error('Failed to void QuickBooks invoice', error.response?.data);
      throw new HttpException('Failed to void invoice', HttpStatus.BAD_REQUEST);
    }
  }

  // ============ PAYMENTS ============

  /**
   * Create payment
   */
  async createPayment(config: QuickBooksConfig, payment: QuickBooksPayment): Promise<QuickBooksPayment> {
    try {
      const response = await this.axiosInstance.post(
        `${this.getBaseUrl()}/v3/company/${config.realmId}/payment`,
        payment,
        { headers: this.getHeaders(config.accessToken) }
      );
      return response.data.Payment;
    } catch (error: any) {
      this.logger.error('Failed to create QuickBooks payment', error.response?.data);
      throw new HttpException('Failed to create payment', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Get payments
   */
  async getPayments(config: QuickBooksConfig, maxResults = 1000): Promise<QuickBooksPayment[]> {
    try {
      const query = `SELECT * FROM Payment MAXRESULTS ${maxResults}`;
      const response = await this.axiosInstance.get(
        `${this.getBaseUrl()}/v3/company/${config.realmId}/query`,
        {
          headers: this.getHeaders(config.accessToken),
          params: { query },
        }
      );
      return response.data.QueryResponse?.Payment || [];
    } catch (error: any) {
      this.logger.error('Failed to get QuickBooks payments', error.response?.data);
      throw new HttpException('Failed to get payments', HttpStatus.BAD_REQUEST);
    }
  }

  // ============ ITEMS / PRODUCTS ============

  /**
   * Get all items/products
   */
  async getItems(config: QuickBooksConfig, maxResults = 1000): Promise<QuickBooksItem[]> {
    try {
      const query = `SELECT * FROM Item MAXRESULTS ${maxResults}`;
      const response = await this.axiosInstance.get(
        `${this.getBaseUrl()}/v3/company/${config.realmId}/query`,
        {
          headers: this.getHeaders(config.accessToken),
          params: { query },
        }
      );
      return response.data.QueryResponse?.Item || [];
    } catch (error: any) {
      this.logger.error('Failed to get QuickBooks items', error.response?.data);
      throw new HttpException('Failed to get items', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Create item/product
   */
  async createItem(config: QuickBooksConfig, item: QuickBooksItem): Promise<QuickBooksItem> {
    try {
      const response = await this.axiosInstance.post(
        `${this.getBaseUrl()}/v3/company/${config.realmId}/item`,
        item,
        { headers: this.getHeaders(config.accessToken) }
      );
      return response.data.Item;
    } catch (error: any) {
      this.logger.error('Failed to create QuickBooks item', error.response?.data);
      throw new HttpException('Failed to create item', HttpStatus.BAD_REQUEST);
    }
  }

  // ============ ACCOUNTS ============

  /**
   * Get chart of accounts
   */
  async getAccounts(config: QuickBooksConfig): Promise<QuickBooksAccount[]> {
    try {
      const query = 'SELECT * FROM Account MAXRESULTS 1000';
      const response = await this.axiosInstance.get(
        `${this.getBaseUrl()}/v3/company/${config.realmId}/query`,
        {
          headers: this.getHeaders(config.accessToken),
          params: { query },
        }
      );
      return response.data.QueryResponse?.Account || [];
    } catch (error: any) {
      this.logger.error('Failed to get QuickBooks accounts', error.response?.data);
      throw new HttpException('Failed to get accounts', HttpStatus.BAD_REQUEST);
    }
  }

  // ============ REPORTS ============

  /**
   * Get Profit and Loss report
   */
  async getProfitAndLossReport(config: QuickBooksConfig, startDate: string, endDate: string): Promise<any> {
    try {
      const response = await this.axiosInstance.get(
        `${this.getBaseUrl()}/v3/company/${config.realmId}/reports/ProfitAndLoss`,
        {
          headers: this.getHeaders(config.accessToken),
          params: {
            start_date: startDate,
            end_date: endDate,
          },
        }
      );
      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to get QuickBooks P&L report', error.response?.data);
      throw new HttpException('Failed to get P&L report', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Get Balance Sheet report
   */
  async getBalanceSheetReport(config: QuickBooksConfig, asOfDate: string): Promise<any> {
    try {
      const response = await this.axiosInstance.get(
        `${this.getBaseUrl()}/v3/company/${config.realmId}/reports/BalanceSheet`,
        {
          headers: this.getHeaders(config.accessToken),
          params: { date_macro: 'custom', as_of_date: asOfDate },
        }
      );
      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to get QuickBooks Balance Sheet', error.response?.data);
      throw new HttpException('Failed to get Balance Sheet', HttpStatus.BAD_REQUEST);
    }
  }

  // ============ CONVERSION HELPERS ============

  /**
   * Convert DocumentIulia invoice to QuickBooks format
   */
  convertToQuickBooksInvoice(invoice: any, customerRef: string): QuickBooksInvoice {
    const lines: QuickBooksInvoiceLine[] = (invoice.items || []).map((item: any, index: number) => ({
      LineNum: index + 1,
      Description: item.description || item.name,
      Amount: (item.quantity || 1) * (item.unitPrice || item.price || 0),
      DetailType: 'SalesItemLineDetail' as const,
      SalesItemLineDetail: {
        Qty: item.quantity || 1,
        UnitPrice: item.unitPrice || item.price || 0,
      },
    }));

    return {
      TxnDate: new Date(invoice.invoiceDate).toISOString().split('T')[0],
      DueDate: invoice.dueDate
        ? new Date(invoice.dueDate).toISOString().split('T')[0]
        : undefined,
      CustomerRef: { value: customerRef },
      CurrencyRef: { value: invoice.currency || 'RON' },
      Line: lines,
      PrivateNote: invoice.notes || undefined,
    };
  }

  /**
   * Convert DocumentIulia customer to QuickBooks format
   */
  convertToQuickBooksCustomer(customer: any): QuickBooksCustomer {
    return {
      DisplayName: customer.name || customer.companyName,
      CompanyName: customer.companyName || customer.name,
      PrimaryEmailAddr: customer.email ? { Address: customer.email } : undefined,
      PrimaryPhone: customer.phone ? { FreeFormNumber: customer.phone } : undefined,
      BillAddr: {
        Line1: customer.address,
        City: customer.city,
        Country: customer.country || 'Romania',
      },
      Active: true,
    };
  }
}
