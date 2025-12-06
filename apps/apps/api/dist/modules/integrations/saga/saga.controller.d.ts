import { Response } from 'express';
import { SagaIntegrationService, SagaInvoice } from './saga.service';
declare class SagaInvoiceItemDto {
    denumire: string;
    cantitate: number;
    pret_unitar: number;
    valoare: number;
    cota_tva: number;
    unitate_masura: string;
    cod_produs?: string;
}
declare class CreateSagaInvoiceDto {
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
    items: SagaInvoiceItemDto[];
}
declare class OAuthCallbackDto {
    code: string;
    state: string;
}
export declare class SagaController {
    private readonly sagaService;
    constructor(sagaService: SagaIntegrationService);
    getAuthUrl(companyId: string, redirectUri: string): {
        authorizationUrl: string;
    };
    handleCallback(companyId: string, dto: OAuthCallbackDto, redirectUri: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getStatus(companyId: string): Promise<{
        isConnected: boolean;
        lastSync?: Date;
        expiresAt?: Date;
        companyInfo?: import("./saga.service").SagaCompanyInfo;
    }>;
    disconnect(companyId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getCompanyInfo(companyId: string): Promise<import("./saga.service").SagaCompanyInfo>;
    listInvoices(companyId: string, from?: string, to?: string, page?: string, limit?: string): Promise<{
        invoices: SagaInvoice[];
        total: number;
    }>;
    getInvoice(companyId: string, invoiceId: string): Promise<SagaInvoice>;
    createInvoice(companyId: string, dto: CreateSagaInvoiceDto): Promise<{
        sagaId: string;
        success: boolean;
    }>;
    printInvoice(companyId: string, invoiceId: string, res: Response): Promise<void>;
    deleteInvoice(companyId: string, invoiceId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    listPartners(companyId: string): Promise<import("./saga.service").SagaPartner[]>;
    sync(companyId: string, lastSyncDate?: string): Promise<import("./saga.service").SagaSyncResult>;
}
export {};
//# sourceMappingURL=saga.controller.d.ts.map