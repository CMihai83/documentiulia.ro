import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EfacturaStatus } from '@prisma/client';
interface MessageListItem {
    data_creare: string;
    cif: string;
    id_solicitare: string;
    detalii: string;
    tip: string;
    id: string;
}
export declare class AnafSpvService {
    private configService;
    private prisma;
    private readonly logger;
    private readonly baseUrl;
    private readonly isProduction;
    constructor(configService: ConfigService, prisma: PrismaService);
    private createHttpsAgent;
    private decryptPassword;
    encryptPassword(password: string): string;
    uploadInvoice(companyId: string, invoiceId: string, xml: string, cif: string): Promise<{
        uploadId: string;
        message: string;
    }>;
    checkStatus(companyId: string, uploadId: string): Promise<{
        status: EfacturaStatus;
        downloadId?: string;
        message: string;
    }>;
    downloadResponse(companyId: string, downloadId: string): Promise<{
        content: string;
        type: string;
    }>;
    getMessagesList(companyId: string, cif: string, days?: number): Promise<MessageListItem[]>;
    getMessagesPaginated(companyId: string, cif: string, page?: number, days?: number): Promise<{
        messages: MessageListItem[];
        hasMore: boolean;
    }>;
    validateXml(companyId: string, xml: string): Promise<{
        valid: boolean;
        errors: string[];
    }>;
    convertPdfToXml(companyId: string, pdfBase64: string): Promise<string>;
    private makeRequest;
    syncPendingInvoices(companyId: string): Promise<{
        synced: number;
        failed: number;
        errors: string[];
    }>;
}
export {};
//# sourceMappingURL=anaf-spv.service.d.ts.map