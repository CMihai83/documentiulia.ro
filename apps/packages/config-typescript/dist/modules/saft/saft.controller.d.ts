import { Response } from 'express';
import { SaftService } from './saft.service';
import { SaftExportDto, SaftValidationResultDto } from './dto/saft-export.dto';
export declare class SaftController {
    private readonly saftService;
    constructor(saftService: SaftService);
    exportSaftXml(companyId: string, dto: SaftExportDto, user: any, res: Response): Promise<void>;
    validateSaftData(companyId: string, dto: SaftExportDto, user: any): Promise<SaftValidationResultDto>;
    getExportHistory(companyId: string, user: any): Promise<never[]>;
    previewExport(companyId: string, dto: SaftExportDto, user: any): Promise<{
        period: {
            startDate: string;
            endDate: string;
        };
        canExport: boolean;
        isValid: boolean;
        errors: string[];
        warnings: string[];
        summary: {
            totalInvoices: number;
            totalVatAmount: number;
            totalAmount: number;
            period: string;
        };
    }>;
}
//# sourceMappingURL=saft.controller.d.ts.map