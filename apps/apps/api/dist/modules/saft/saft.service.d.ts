import { PrismaService } from '../../common/prisma/prisma.service';
import { SaftExportDto, SaftValidationResultDto } from './dto/saft-export.dto';
export declare class SaftService {
    private prisma;
    constructor(prisma: PrismaService);
    private checkCompanyAccess;
    generateSaftXml(companyId: string, dto: SaftExportDto, userId: string): Promise<string>;
    validateSaftData(companyId: string, dto: SaftExportDto, userId: string): Promise<SaftValidationResultDto>;
    private fetchInvoices;
    private fetchClients;
    private fetchProducts;
    private buildSaftStructure;
    private buildInvoiceEntry;
    private buildInvoiceLine;
    private mapInvoiceType;
    private mapPaymentMethod;
    getExportHistory(companyId: string, userId: string): Promise<never[]>;
}
//# sourceMappingURL=saft.service.d.ts.map