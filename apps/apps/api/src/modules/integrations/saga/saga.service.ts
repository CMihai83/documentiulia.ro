import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';

// SAGA API Types
export interface SagaOAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface SagaInvoice {
  id?: string;
  numar_factura: string;
  data_factura: string;
  denumire_client: string;
  cui_client: string;
  adresa_client?: string;
  valoare_fara_tva: number;
  valoare_tva: number;
  valoare_totala: number;
  cota_tva: number;
  moneda: string;
  serie_factura: string;
  items: SagaInvoiceItem[];
}

export interface SagaInvoiceItem {
  denumire: string;
  cantitate: number;
  pret_unitar: number;
  valoare: number;
  cota_tva: number;
  unitate_masura: string;
  cod_produs?: string;
}

export interface SagaCompanyInfo {
  cui: string;
  denumire: string;
  adresa: string;
  judet: string;
  localitate: string;
  nr_reg_com: string;
  cont_iban: string;
  banca: string;
}

export interface SagaPartner {
  id: string;
  denumire: string;
  cui: string;
  adresa: string;
  email?: string;
  telefon?: string;
}

export interface SagaSyncResult {
  success: boolean;
  syncedInvoices: number;
  syncedPartners: number;
  errors: string[];
  lastSyncAt: Date;
}

@Injectable()
export class SagaIntegrationService {
  private readonly logger = new Logger(SagaIntegrationService.name);
  private readonly baseUrl: string;
  private tokenCache: Map<string, { tokens: SagaOAuthTokens; expiresAt: Date }> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.baseUrl = this.configService.get<string>('SAGA_API_URL', 'https://api.saga.ro');
  }

  // OAuth 2.0 Authorization
  getAuthorizationUrl(companyId: string, redirectUri: string): string {
    const clientId = this.configService.get<string>('SAGA_CLIENT_ID');
    const state = Buffer.from(JSON.stringify({ companyId, timestamp: Date.now() })).toString('base64');

    return `${this.baseUrl}/oauth/authorize?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=invoices:read invoices:write partners:read partners:write&` +
      `state=${state}`;
  }

  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<SagaOAuthTokens> {
    const clientId = this.configService.get<string>('SAGA_CLIENT_ID');
    const clientSecret = this.configService.get<string>('SAGA_CLIENT_SECRET');

    try {
      const response = await fetch(`${this.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: clientId || '',
          client_secret: clientSecret || '',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new HttpException(`SAGA OAuth error: ${error}`, HttpStatus.BAD_REQUEST);
      }

      return await response.json() as SagaOAuthTokens;
    } catch (error) {
      this.logger.error('Failed to exchange SAGA OAuth code', error);
      throw new HttpException('Eroare la autentificarea SAGA', HttpStatus.BAD_REQUEST);
    }
  }

  async refreshTokens(refreshToken: string): Promise<SagaOAuthTokens> {
    const clientId = this.configService.get<string>('SAGA_CLIENT_ID');
    const clientSecret = this.configService.get<string>('SAGA_CLIENT_SECRET');

    try {
      const response = await fetch(`${this.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: clientId || '',
          client_secret: clientSecret || '',
        }),
      });

      if (!response.ok) {
        throw new HttpException('Token refresh failed', HttpStatus.UNAUTHORIZED);
      }

      return await response.json() as SagaOAuthTokens;
    } catch (error) {
      this.logger.error('Failed to refresh SAGA tokens', error);
      throw new HttpException('Eroare la reîmprospătarea tokenului SAGA', HttpStatus.UNAUTHORIZED);
    }
  }

  // Store SAGA credentials for a company
  async saveCredentials(companyId: string, tokens: SagaOAuthTokens): Promise<void> {
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // In production, encrypt these tokens before storing
    await this.prisma.companyIntegration.upsert({
      where: {
        companyId_type: {
          companyId,
          type: 'SAGA',
        },
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        companyId,
        type: 'SAGA',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        isActive: true,
      },
    });

    this.tokenCache.set(companyId, { tokens, expiresAt });
  }

  // Get valid access token (refresh if needed)
  async getAccessToken(companyId: string): Promise<string> {
    // Check cache first
    const cached = this.tokenCache.get(companyId);
    if (cached && cached.expiresAt > new Date()) {
      return cached.tokens.access_token;
    }

    // Get from database
    const integration = await this.prisma.companyIntegration.findUnique({
      where: {
        companyId_type: {
          companyId,
          type: 'SAGA',
        },
      },
    });

    if (!integration || !integration.isActive) {
      throw new HttpException('Integrarea SAGA nu este configurată', HttpStatus.NOT_FOUND);
    }

    // Check if token needs refresh
    if (integration.expiresAt && integration.expiresAt <= new Date()) {
      if (!integration.refreshToken) {
        throw new HttpException('Reautentificare SAGA necesară', HttpStatus.UNAUTHORIZED);
      }

      const newTokens = await this.refreshTokens(integration.refreshToken);
      await this.saveCredentials(companyId, newTokens);
      return newTokens.access_token;
    }

    return integration.accessToken;
  }

  // Invoice Operations
  async createInvoice(companyId: string, invoice: SagaInvoice): Promise<{ sagaId: string; success: boolean }> {
    const accessToken = await this.getAccessToken(companyId);

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/invoices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoice),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`SAGA create invoice error: ${error}`);
        throw new HttpException(`Eroare SAGA: ${error}`, HttpStatus.BAD_REQUEST);
      }

      const result = await response.json() as { id: string };
      return { sagaId: result.id, success: true };
    } catch (error) {
      this.logger.error('Failed to create SAGA invoice', error);
      throw error;
    }
  }

  async printInvoice(companyId: string, sagaInvoiceId: string): Promise<Buffer> {
    const accessToken = await this.getAccessToken(companyId);

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/invoices/${sagaInvoiceId}/print`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/pdf',
        },
      });

      if (!response.ok) {
        throw new HttpException('Eroare la generarea PDF-ului', HttpStatus.BAD_REQUEST);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      this.logger.error('Failed to print SAGA invoice', error);
      throw error;
    }
  }

  async deleteInvoice(companyId: string, sagaInvoiceId: string): Promise<boolean> {
    const accessToken = await this.getAccessToken(companyId);

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/invoices/${sagaInvoiceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new HttpException(`Eroare la ștergerea facturii: ${error}`, HttpStatus.BAD_REQUEST);
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to delete SAGA invoice', error);
      throw error;
    }
  }

  async getInvoice(companyId: string, sagaInvoiceId: string): Promise<SagaInvoice> {
    const accessToken = await this.getAccessToken(companyId);

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/invoices/${sagaInvoiceId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new HttpException('Factura nu a fost găsită', HttpStatus.NOT_FOUND);
      }

      return await response.json() as SagaInvoice;
    } catch (error) {
      this.logger.error('Failed to get SAGA invoice', error);
      throw error;
    }
  }

  async listInvoices(
    companyId: string,
    filters?: { from?: Date; to?: Date; page?: number; limit?: number },
  ): Promise<{ invoices: SagaInvoice[]; total: number }> {
    const accessToken = await this.getAccessToken(companyId);

    const params = new URLSearchParams();
    if (filters?.from) params.append('from', filters.from.toISOString().split('T')[0]);
    if (filters?.to) params.append('to', filters.to.toISOString().split('T')[0]);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/invoices?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new HttpException('Eroare la listarea facturilor', HttpStatus.BAD_REQUEST);
      }

      const result = await response.json() as { data: SagaInvoice[]; total: number };
      return { invoices: result.data, total: result.total };
    } catch (error) {
      this.logger.error('Failed to list SAGA invoices', error);
      throw error;
    }
  }

  // Partner Operations
  async listPartners(companyId: string): Promise<SagaPartner[]> {
    const accessToken = await this.getAccessToken(companyId);

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/partners`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new HttpException('Eroare la listarea partenerilor', HttpStatus.BAD_REQUEST);
      }

      const result = await response.json() as { data: SagaPartner[] };
      return result.data;
    } catch (error) {
      this.logger.error('Failed to list SAGA partners', error);
      throw error;
    }
  }

  async getCompanyInfo(companyId: string): Promise<SagaCompanyInfo> {
    const accessToken = await this.getAccessToken(companyId);

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/company`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new HttpException('Eroare la obținerea datelor firmei', HttpStatus.BAD_REQUEST);
      }

      return await response.json() as SagaCompanyInfo;
    } catch (error) {
      this.logger.error('Failed to get SAGA company info', error);
      throw error;
    }
  }

  // Sync Operations
  async syncInvoices(companyId: string, lastSyncDate?: Date): Promise<SagaSyncResult> {
    const result: SagaSyncResult = {
      success: true,
      syncedInvoices: 0,
      syncedPartners: 0,
      errors: [],
      lastSyncAt: new Date(),
    };

    try {
      // Get invoices from SAGA
      const { invoices } = await this.listInvoices(companyId, {
        from: lastSyncDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      });

      // Sync each invoice to local database
      for (const sagaInvoice of invoices) {
        try {
          await this.syncInvoiceToLocal(companyId, sagaInvoice);
          result.syncedInvoices++;
        } catch (error) {
          result.errors.push(`Invoice ${sagaInvoice.numar_factura}: ${(error as Error).message}`);
        }
      }

      // Sync partners
      const partners = await this.listPartners(companyId);
      for (const partner of partners) {
        try {
          await this.syncPartnerToLocal(companyId, partner);
          result.syncedPartners++;
        } catch (error) {
          result.errors.push(`Partner ${partner.denumire}: ${(error as Error).message}`);
        }
      }

      // Update last sync timestamp
      await this.prisma.companyIntegration.update({
        where: {
          companyId_type: {
            companyId,
            type: 'SAGA',
          },
        },
        data: {
          lastSyncAt: new Date(),
          metadata: { lastSyncResult: result } as any,
        },
      });
    } catch (error) {
      result.success = false;
      result.errors.push((error as Error).message);
    }

    return result;
  }

  private async syncInvoiceToLocal(companyId: string, sagaInvoice: SagaInvoice): Promise<void> {
    // Map SAGA invoice to local Invoice model
    // This would create/update the invoice in the local database
    this.logger.log(`Syncing SAGA invoice ${sagaInvoice.numar_factura} for company ${companyId}`);
    // Implementation depends on local invoice schema
  }

  private async syncPartnerToLocal(companyId: string, partner: SagaPartner): Promise<void> {
    // Check if client with this CUI already exists
    const existingClient = await this.prisma.client.findFirst({
      where: {
        companyId,
        cui: partner.cui,
      },
    });

    if (existingClient) {
      // Update existing client
      await this.prisma.client.update({
        where: { id: existingClient.id },
        data: {
          name: partner.denumire,
          address: partner.adresa,
          contactEmail: partner.email,
          contactPhone: partner.telefon,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new client
      await this.prisma.client.create({
        data: {
          companyId,
          name: partner.denumire,
          cui: partner.cui,
          address: partner.adresa,
          contactEmail: partner.email,
          contactPhone: partner.telefon,
          type: 'BUSINESS',
        },
      });
    }
  }

  // Check integration status
  async getIntegrationStatus(companyId: string): Promise<{
    isConnected: boolean;
    lastSync?: Date;
    expiresAt?: Date;
    companyInfo?: SagaCompanyInfo;
  }> {
    const integration = await this.prisma.companyIntegration.findUnique({
      where: {
        companyId_type: {
          companyId,
          type: 'SAGA',
        },
      },
    });

    if (!integration || !integration.isActive) {
      return { isConnected: false };
    }

    try {
      const companyInfo = await this.getCompanyInfo(companyId);
      return {
        isConnected: true,
        lastSync: integration.lastSyncAt || undefined,
        expiresAt: integration.expiresAt || undefined,
        companyInfo,
      };
    } catch {
      return {
        isConnected: false,
        lastSync: integration.lastSyncAt || undefined,
      };
    }
  }

  // Disconnect SAGA integration
  async disconnect(companyId: string): Promise<void> {
    await this.prisma.companyIntegration.update({
      where: {
        companyId_type: {
          companyId,
          type: 'SAGA',
        },
      },
      data: {
        isActive: false,
        accessToken: '',
        refreshToken: null,
      },
    });

    this.tokenCache.delete(companyId);
  }
}
