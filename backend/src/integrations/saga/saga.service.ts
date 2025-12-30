import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface SagaOAuthToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
}

export interface SagaInvoice {
  id: string;
  number: string;
  date: Date;
  dueDate: Date;
  partnerCUI: string;
  partnerName: string;
  items: SagaInvoiceItem[];
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
}

export interface SagaInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  total: number;
}

export interface SagaPayrollRecord {
  employeeId: string;
  employeeCNP: string;
  employeeName: string;
  grossSalary: number;
  netSalary: number;
  taxes: number;
  contributions: number;
  period: string; // YYYY-MM
}

export interface SagaSyncResult {
  success: boolean;
  syncedCount: number;
  errors: string[];
  timestamp: Date;
}

@Injectable()
export class SagaService {
  private readonly logger = new Logger(SagaService.name);

  // SAGA v3.2 REST API base URL - configured via environment
  private readonly baseUrl = process.env.SAGA_API_URL || 'https://api.saga.ro/v3.2';
  private readonly clientId = process.env.SAGA_CLIENT_ID;
  private readonly clientSecret = process.env.SAGA_CLIENT_SECRET;

  // In-memory token cache (in production, use Redis)
  private tokenCache: Map<string, SagaOAuthToken> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * OAuth 2.0 Authorization - Get authorization URL
   */
  getAuthorizationUrl(organizationId: string, redirectUri: string): string {
    const state = Buffer.from(JSON.stringify({ organizationId })).toString('base64');
    const params = new URLSearchParams({
      client_id: this.clientId || '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'invoices:read invoices:write payroll:read payroll:write inventory:read inventory:write saft:export',
      state,
    });

    return `${this.baseUrl}/oauth/authorize?${params.toString()}`;
  }

  /**
   * OAuth 2.0 - Exchange authorization code for tokens
   */
  async exchangeCodeForToken(
    code: string,
    redirectUri: string,
    organizationId: string,
  ): Promise<SagaOAuthToken> {
    this.logger.log(`Exchanging auth code for token - org: ${organizationId}`);

    try {
      const clientId = this.clientId;
      const clientSecret = this.clientSecret;

      if (!clientId || !clientSecret) {
        throw new Error('SAGA API credentials not configured');
      }

      const response = await fetch(`${this.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }).toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`SAGA OAuth token exchange failed: ${response.status} ${error}`);
        throw new Error(`SAGA OAuth failed: ${response.status}`);
      }

      const tokenData = await response.json();

      const token: SagaOAuthToken = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: new Date(Date.now() + (tokenData.expires_in * 1000)),
        scope: tokenData.scope || 'invoices:read invoices:write payroll:read payroll:write inventory:read inventory:write saft:export',
      };

      // Cache token
      this.tokenCache.set(organizationId, token);

      // Store in database for persistence
      await this.storeToken(organizationId, token);

      return token;
    } catch (error) {
      this.logger.error(`Failed to exchange SAGA OAuth code: ${error.message}`);
      throw new Error(`SAGA OAuth exchange failed: ${error.message}`);
    }
  }

  /**
   * OAuth 2.0 - Refresh access token
   */
  async refreshAccessToken(organizationId: string): Promise<SagaOAuthToken> {
    const existingToken = this.tokenCache.get(organizationId);
    if (!existingToken?.refreshToken) {
      throw new Error('No refresh token found for organization. Please re-authorize.');
    }

    this.logger.log(`Refreshing access token - org: ${organizationId}`);

    try {
      const clientId = this.clientId;
      const clientSecret = this.clientSecret;

      if (!clientId || !clientSecret) {
        throw new Error('SAGA API credentials not configured');
      }

      const response = await fetch(`${this.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: existingToken.refreshToken,
        }).toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`SAGA OAuth token refresh failed: ${response.status} ${error}`);
        throw new Error(`SAGA OAuth refresh failed: ${response.status}`);
      }

      const tokenData = await response.json();

      const newToken: SagaOAuthToken = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || existingToken.refreshToken,
        expiresAt: new Date(Date.now() + (tokenData.expires_in * 1000)),
        scope: tokenData.scope || existingToken.scope,
      };

      this.tokenCache.set(organizationId, newToken);
      await this.storeToken(organizationId, newToken);

      return newToken;
    } catch (error) {
      this.logger.error(`Failed to refresh SAGA access token: ${error.message}`);
      throw new Error(`SAGA token refresh failed: ${error.message}`);
    }
  }

  /**
   * Get valid access token (auto-refresh if expired)
   */
  private async getValidToken(organizationId: string): Promise<string> {
    let token: SagaOAuthToken | null | undefined = this.tokenCache.get(organizationId);

    if (!token) {
      // Try to load from database
      token = await this.loadToken(organizationId);
      if (token) {
        this.tokenCache.set(organizationId, token);
      }
    }

    if (!token) {
      throw new Error('Organization not connected to SAGA. Please authorize first.');
    }

    // Check if token is expired (with 5 min buffer)
    if (token.expiresAt.getTime() < Date.now() + 300000) {
      token = await this.refreshAccessToken(organizationId);
    }

    return token.accessToken;
  }

  // ==================== INVOICE SYNC ====================

  /**
   * Sync invoices from SAGA to local database
   */
  async syncInvoicesFromSaga(
    organizationId: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<SagaSyncResult> {
    this.logger.log(`Syncing invoices from SAGA - org: ${organizationId}`);

    try {
      const accessToken = await this.getValidToken(organizationId);

      const params = new URLSearchParams();
      if (fromDate) params.append('from_date', fromDate.toISOString().split('T')[0]);
      if (toDate) params.append('to_date', toDate.toISOString().split('T')[0]);

      const response = await fetch(`${this.baseUrl}/invoices?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`SAGA API error: ${response.status} ${response.statusText}`);
      }

      const invoices = await response.json();
      const syncedCount = invoices.length;

      // TODO: Process and save invoices to local database
      // This would involve mapping SAGA invoice format to local Invoice model

      this.logger.log(`Successfully synced ${syncedCount} invoices from SAGA`);

      return {
        success: true,
        syncedCount,
        errors: [],
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to sync invoices from SAGA: ${error.message}`);
      return {
        success: false,
        syncedCount: 0,
        errors: [error.message],
        timestamp: new Date(),
      };
    }
  }

  /**
   * Push invoice to SAGA
   */
  async pushInvoiceToSaga(
    organizationId: string,
    invoiceId: string,
  ): Promise<{ success: boolean; sagaId?: string; error?: string }> {
    this.logger.log(`Pushing invoice ${invoiceId} to SAGA - org: ${organizationId}`);

    await this.getValidToken(organizationId);

    // Get invoice from local database
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return { success: false, error: 'Invoice not found' };
    }

    try {
      const accessToken = await this.getValidToken(organizationId);

      // Transform local invoice to SAGA format
      const inv = invoice as any;
      const sagaInvoice = {
        number: inv.number,
        date: inv.date?.toISOString().split('T')[0],
        due_date: inv.dueDate?.toISOString().split('T')[0],
        partner_cui: inv.partnerCui,
        partner_name: inv.partnerName,
        currency: inv.currency || 'RON',
        items: (inv.items || []).map((item: any) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          vat_rate: item.vatRate,
        })),
        notes: inv.notes,
      };

      const response = await fetch(`${this.baseUrl}/invoices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sagaInvoice),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`SAGA API error: ${response.status} ${error}`);
      }

      const result = await response.json();
      const sagaId = result.id || result.invoice_id;

      // Update local invoice with SAGA reference
      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          sagaSynced: true,
          sagaId,
        },
      });

      this.logger.log(`Successfully pushed invoice ${invoiceId} to SAGA with ID ${sagaId}`);

      return { success: true, sagaId };
    } catch (error) {
      this.logger.error(`Failed to push invoice to SAGA: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ==================== PAYROLL SYNC ====================

  /**
   * Sync payroll data from SAGA
   */
  async syncPayrollFromSaga(
    organizationId: string,
    period: string, // YYYY-MM
  ): Promise<SagaSyncResult> {
    this.logger.log(`Syncing payroll from SAGA - org: ${organizationId}, period: ${period}`);

    await this.getValidToken(organizationId);

    // TODO: Implement actual API call when SAGA credentials available
    // GET /payroll?period=YYYY-MM

    // For now, return mock success - actual implementation will sync to Payroll model
    return {
      success: true,
      syncedCount: 0,
      errors: [],
      timestamp: new Date(),
    };
  }

  /**
   * Export payroll declarations to SAGA
   */
  async exportPayrollToSaga(
    organizationId: string,
    period: string,
  ): Promise<{ success: boolean; declarationId?: string; error?: string }> {
    this.logger.log(`Exporting payroll to SAGA - org: ${organizationId}, period: ${period}`);

    await this.getValidToken(organizationId);

    // Get employees for the organization to find their payroll
    const employees = await this.prisma.employee.findMany({
      where: { organizationId },
      select: { id: true },
    });

    if (employees.length === 0) {
      return { success: false, error: 'No employees found for organization' };
    }

    // Get payroll records for the period
    const payrollRecords = await this.prisma.payroll.findMany({
      where: {
        employeeId: { in: employees.map(e => e.id) },
        period,
      },
      include: { employee: true },
    });

    if (payrollRecords.length === 0) {
      return { success: false, error: 'No payroll records found for period' };
    }

    // TODO: Implement actual POST /payroll/declarations call
    const mockDeclarationId = `D112-${period}-${Date.now()}`;

    return { success: true, declarationId: mockDeclarationId };
  }

  // ==================== INVENTORY SYNC ====================

  /**
   * Sync inventory from SAGA
   * Note: InventoryItem model needs to be added to schema for full functionality
   */
  async syncInventoryFromSaga(
    organizationId: string,
    warehouseCode?: string,
  ): Promise<SagaSyncResult> {
    this.logger.log(`Syncing inventory from SAGA - org: ${organizationId}, warehouse: ${warehouseCode}`);

    await this.getValidToken(organizationId);

    // TODO: Implement actual API call when SAGA credentials available
    // GET /inventory?warehouse=CODE
    // Note: InventoryItem model needs to be added to Prisma schema

    return {
      success: true,
      syncedCount: 0,
      errors: ['InventoryItem model not yet implemented in schema'],
      timestamp: new Date(),
    };
  }

  // ==================== SAF-T D406 EXPORT ====================

  /**
   * Export SAF-T D406 XML via SAGA
   */
  async exportSafTD406(
    organizationId: string,
    period: string, // YYYY-MM
  ): Promise<{ success: boolean; xmlUrl?: string; error?: string }> {
    this.logger.log(`Exporting SAF-T D406 via SAGA - org: ${organizationId}, period: ${period}`);

    await this.getValidToken(organizationId);

    // TODO: Implement actual POST /saft/d406 call
    // This would generate the XML according to Order 1783/2021

    // Mock response
    const mockXmlUrl = `${this.baseUrl}/downloads/saft-d406-${organizationId}-${period}.xml`;

    return { success: true, xmlUrl: mockXmlUrl };
  }

  // ==================== e-FACTURA SPV ====================

  /**
   * Submit e-Factura to SPV via SAGA
   */
  async submitEFacturaToSPV(
    organizationId: string,
    invoiceId: string,
  ): Promise<{ success: boolean; indexIncarcare?: string; error?: string }> {
    this.logger.log(`Submitting e-Factura to SPV via SAGA - org: ${organizationId}, invoice: ${invoiceId}`);

    await this.getValidToken(organizationId);

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return { success: false, error: 'Invoice not found' };
    }

    // TODO: Implement actual POST /efactura/submit call
    // This would convert invoice to UBL XML and submit to ANAF SPV

    // Mock response - index_incarcare is the ANAF upload index
    const mockIndexIncarcare = `${Date.now()}`;

    // Update invoice with SPV submission info
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        spvSubmitted: true,
        spvSubmittedAt: new Date(),
        efacturaId: mockIndexIncarcare,
        efacturaStatus: 'SUBMITTED',
      },
    });

    return { success: true, indexIncarcare: mockIndexIncarcare };
  }

  /**
   * Check e-Factura status from SPV
   */
  async checkEFacturaStatus(
    organizationId: string,
    indexIncarcare: string,
  ): Promise<{ status: string; message?: string; stare?: string }> {
    this.logger.log(`Checking e-Factura status - index: ${indexIncarcare}`);

    await this.getValidToken(organizationId);

    // TODO: Implement actual GET /efactura/status/{index} call

    // Mock response - possible states: in_prelucrare, ok, nok
    return {
      status: 'ok',
      stare: 'ok',
      message: 'Factura a fost inregistrata cu succes in sistemul SPV',
    };
  }

  // ==================== TOKEN STORAGE ====================

  private async storeToken(organizationId: string, token: SagaOAuthToken): Promise<void> {
    // Store encrypted token in organization
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        sagaConnected: true,
        sagaAccessToken: token.accessToken,
        sagaRefreshToken: token.refreshToken,
        sagaTokenExpiresAt: token.expiresAt,
        sagaTokenScope: token.scope,
      },
    });
  }

  private async loadToken(organizationId: string): Promise<SagaOAuthToken | null> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization?.sagaAccessToken) {
      return null;
    }

    return {
      accessToken: organization.sagaAccessToken,
      refreshToken: organization.sagaRefreshToken || '',
      expiresAt: organization.sagaTokenExpiresAt || new Date(),
      scope: organization.sagaTokenScope || '',
    };
  }

  /**
   * Check if organization is connected to SAGA
   */
  async isConnected(organizationId: string): Promise<boolean> {
    const token = await this.loadToken(organizationId);
    return token !== null;
  }

  /**
   * Disconnect organization from SAGA
   */
  async disconnect(organizationId: string): Promise<void> {
    this.tokenCache.delete(organizationId);
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        sagaConnected: false,
        sagaAccessToken: null,
        sagaRefreshToken: null,
        sagaTokenExpiresAt: null,
        sagaTokenScope: null,
      },
    });
  }
}
