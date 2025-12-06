import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';
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
export declare class SagaIntegrationService {
    private readonly configService;
    private readonly prisma;
    private readonly logger;
    private readonly baseUrl;
    private tokenCache;
    constructor(configService: ConfigService, prisma: PrismaService);
    getAuthorizationUrl(companyId: string, redirectUri: string): string;
    exchangeCodeForTokens(code: string, redirectUri: string): Promise<SagaOAuthTokens>;
    refreshTokens(refreshToken: string): Promise<SagaOAuthTokens>;
    saveCredentials(companyId: string, tokens: SagaOAuthTokens): Promise<void>;
    getAccessToken(companyId: string): Promise<string>;
    createInvoice(companyId: string, invoice: SagaInvoice): Promise<{
        sagaId: string;
        success: boolean;
    }>;
    printInvoice(companyId: string, sagaInvoiceId: string): Promise<Buffer>;
    deleteInvoice(companyId: string, sagaInvoiceId: string): Promise<boolean>;
    getInvoice(companyId: string, sagaInvoiceId: string): Promise<SagaInvoice>;
    listInvoices(companyId: string, filters?: {
        from?: Date;
        to?: Date;
        page?: number;
        limit?: number;
    }): Promise<{
        invoices: SagaInvoice[];
        total: number;
    }>;
    listPartners(companyId: string): Promise<SagaPartner[]>;
    getCompanyInfo(companyId: string): Promise<SagaCompanyInfo>;
    syncInvoices(companyId: string, lastSyncDate?: Date): Promise<SagaSyncResult>;
    private syncInvoiceToLocal;
    private syncPartnerToLocal;
    getIntegrationStatus(companyId: string): Promise<{
        isConnected: boolean;
        lastSync?: Date;
        expiresAt?: Date;
        companyInfo?: SagaCompanyInfo;
    }>;
    disconnect(companyId: string): Promise<void>;
}
//# sourceMappingURL=saga.service.d.ts.map