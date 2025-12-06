"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SagaIntegrationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SagaIntegrationService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../../common/prisma/prisma.service");
let SagaIntegrationService = SagaIntegrationService_1 = class SagaIntegrationService {
    configService;
    prisma;
    logger = new common_1.Logger(SagaIntegrationService_1.name);
    baseUrl;
    tokenCache = new Map();
    constructor(configService, prisma) {
        this.configService = configService;
        this.prisma = prisma;
        this.baseUrl = this.configService.get('SAGA_API_URL', 'https://api.saga.ro');
    }
    getAuthorizationUrl(companyId, redirectUri) {
        const clientId = this.configService.get('SAGA_CLIENT_ID');
        const state = Buffer.from(JSON.stringify({ companyId, timestamp: Date.now() })).toString('base64');
        return `${this.baseUrl}/oauth/authorize?` +
            `client_id=${clientId}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `response_type=code&` +
            `scope=invoices:read invoices:write partners:read partners:write&` +
            `state=${state}`;
    }
    async exchangeCodeForTokens(code, redirectUri) {
        const clientId = this.configService.get('SAGA_CLIENT_ID');
        const clientSecret = this.configService.get('SAGA_CLIENT_SECRET');
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
                throw new common_1.HttpException(`SAGA OAuth error: ${error}`, common_1.HttpStatus.BAD_REQUEST);
            }
            return await response.json();
        }
        catch (error) {
            this.logger.error('Failed to exchange SAGA OAuth code', error);
            throw new common_1.HttpException('Eroare la autentificarea SAGA', common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async refreshTokens(refreshToken) {
        const clientId = this.configService.get('SAGA_CLIENT_ID');
        const clientSecret = this.configService.get('SAGA_CLIENT_SECRET');
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
                throw new common_1.HttpException('Token refresh failed', common_1.HttpStatus.UNAUTHORIZED);
            }
            return await response.json();
        }
        catch (error) {
            this.logger.error('Failed to refresh SAGA tokens', error);
            throw new common_1.HttpException('Eroare la reîmprospătarea tokenului SAGA', common_1.HttpStatus.UNAUTHORIZED);
        }
    }
    async saveCredentials(companyId, tokens) {
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
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
    async getAccessToken(companyId) {
        const cached = this.tokenCache.get(companyId);
        if (cached && cached.expiresAt > new Date()) {
            return cached.tokens.access_token;
        }
        const integration = await this.prisma.companyIntegration.findUnique({
            where: {
                companyId_type: {
                    companyId,
                    type: 'SAGA',
                },
            },
        });
        if (!integration || !integration.isActive) {
            throw new common_1.HttpException('Integrarea SAGA nu este configurată', common_1.HttpStatus.NOT_FOUND);
        }
        if (integration.expiresAt && integration.expiresAt <= new Date()) {
            if (!integration.refreshToken) {
                throw new common_1.HttpException('Reautentificare SAGA necesară', common_1.HttpStatus.UNAUTHORIZED);
            }
            const newTokens = await this.refreshTokens(integration.refreshToken);
            await this.saveCredentials(companyId, newTokens);
            return newTokens.access_token;
        }
        return integration.accessToken;
    }
    async createInvoice(companyId, invoice) {
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
                throw new common_1.HttpException(`Eroare SAGA: ${error}`, common_1.HttpStatus.BAD_REQUEST);
            }
            const result = await response.json();
            return { sagaId: result.id, success: true };
        }
        catch (error) {
            this.logger.error('Failed to create SAGA invoice', error);
            throw error;
        }
    }
    async printInvoice(companyId, sagaInvoiceId) {
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
                throw new common_1.HttpException('Eroare la generarea PDF-ului', common_1.HttpStatus.BAD_REQUEST);
            }
            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);
        }
        catch (error) {
            this.logger.error('Failed to print SAGA invoice', error);
            throw error;
        }
    }
    async deleteInvoice(companyId, sagaInvoiceId) {
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
                throw new common_1.HttpException(`Eroare la ștergerea facturii: ${error}`, common_1.HttpStatus.BAD_REQUEST);
            }
            return true;
        }
        catch (error) {
            this.logger.error('Failed to delete SAGA invoice', error);
            throw error;
        }
    }
    async getInvoice(companyId, sagaInvoiceId) {
        const accessToken = await this.getAccessToken(companyId);
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/invoices/${sagaInvoiceId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
            if (!response.ok) {
                throw new common_1.HttpException('Factura nu a fost găsită', common_1.HttpStatus.NOT_FOUND);
            }
            return await response.json();
        }
        catch (error) {
            this.logger.error('Failed to get SAGA invoice', error);
            throw error;
        }
    }
    async listInvoices(companyId, filters) {
        const accessToken = await this.getAccessToken(companyId);
        const params = new URLSearchParams();
        if (filters?.from)
            params.append('from', filters.from.toISOString().split('T')[0]);
        if (filters?.to)
            params.append('to', filters.to.toISOString().split('T')[0]);
        if (filters?.page)
            params.append('page', filters.page.toString());
        if (filters?.limit)
            params.append('limit', filters.limit.toString());
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/invoices?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
            if (!response.ok) {
                throw new common_1.HttpException('Eroare la listarea facturilor', common_1.HttpStatus.BAD_REQUEST);
            }
            const result = await response.json();
            return { invoices: result.data, total: result.total };
        }
        catch (error) {
            this.logger.error('Failed to list SAGA invoices', error);
            throw error;
        }
    }
    async listPartners(companyId) {
        const accessToken = await this.getAccessToken(companyId);
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/partners`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
            if (!response.ok) {
                throw new common_1.HttpException('Eroare la listarea partenerilor', common_1.HttpStatus.BAD_REQUEST);
            }
            const result = await response.json();
            return result.data;
        }
        catch (error) {
            this.logger.error('Failed to list SAGA partners', error);
            throw error;
        }
    }
    async getCompanyInfo(companyId) {
        const accessToken = await this.getAccessToken(companyId);
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/company`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
            if (!response.ok) {
                throw new common_1.HttpException('Eroare la obținerea datelor firmei', common_1.HttpStatus.BAD_REQUEST);
            }
            return await response.json();
        }
        catch (error) {
            this.logger.error('Failed to get SAGA company info', error);
            throw error;
        }
    }
    async syncInvoices(companyId, lastSyncDate) {
        const result = {
            success: true,
            syncedInvoices: 0,
            syncedPartners: 0,
            errors: [],
            lastSyncAt: new Date(),
        };
        try {
            const { invoices } = await this.listInvoices(companyId, {
                from: lastSyncDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            });
            for (const sagaInvoice of invoices) {
                try {
                    await this.syncInvoiceToLocal(companyId, sagaInvoice);
                    result.syncedInvoices++;
                }
                catch (error) {
                    result.errors.push(`Invoice ${sagaInvoice.numar_factura}: ${error.message}`);
                }
            }
            const partners = await this.listPartners(companyId);
            for (const partner of partners) {
                try {
                    await this.syncPartnerToLocal(companyId, partner);
                    result.syncedPartners++;
                }
                catch (error) {
                    result.errors.push(`Partner ${partner.denumire}: ${error.message}`);
                }
            }
            await this.prisma.companyIntegration.update({
                where: {
                    companyId_type: {
                        companyId,
                        type: 'SAGA',
                    },
                },
                data: {
                    lastSyncAt: new Date(),
                    metadata: { lastSyncResult: result },
                },
            });
        }
        catch (error) {
            result.success = false;
            result.errors.push(error.message);
        }
        return result;
    }
    async syncInvoiceToLocal(companyId, sagaInvoice) {
        this.logger.log(`Syncing SAGA invoice ${sagaInvoice.numar_factura} for company ${companyId}`);
    }
    async syncPartnerToLocal(companyId, partner) {
        const existingClient = await this.prisma.client.findFirst({
            where: {
                companyId,
                cui: partner.cui,
            },
        });
        if (existingClient) {
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
        }
        else {
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
    async getIntegrationStatus(companyId) {
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
        }
        catch {
            return {
                isConnected: false,
                lastSync: integration.lastSyncAt || undefined,
            };
        }
    }
    async disconnect(companyId) {
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
};
exports.SagaIntegrationService = SagaIntegrationService;
exports.SagaIntegrationService = SagaIntegrationService = SagaIntegrationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], SagaIntegrationService);
//# sourceMappingURL=saga.service.js.map