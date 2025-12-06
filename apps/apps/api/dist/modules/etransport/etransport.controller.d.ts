import { Response } from 'express';
import { EtransportService } from './etransport.service';
export declare class EtransportController {
    private readonly etransportService;
    constructor(etransportService: EtransportService);
    createDeclaration(companyId: string, declaration: any, user: any): Promise<{
        uit: string;
        message: string;
        validUntil: Date;
    }>;
    listDeclarations(companyId: string, status?: string, startDate?: string, endDate?: string, page?: number, limit?: number): Promise<{
        declarations: any[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    getDeclaration(companyId: string, uit: string): Promise<any>;
    confirmStart(companyId: string, uit: string): Promise<{
        status: string;
        message: string;
    }>;
    confirmDelivery(companyId: string, uit: string, deliveryData: {
        dataLivrare: string;
        observatii?: string;
    }): Promise<{
        status: string;
        message: string;
    }>;
    cancelDeclaration(companyId: string, uit: string, reason: string): Promise<{
        status: string;
        message: string;
    }>;
    downloadXml(companyId: string, uit: string, res: Response): Promise<void>;
    getCountyCodes(): Promise<Record<string, string>>;
    getOperationTypes(): Promise<{
        code: string;
        description: string;
    }[]>;
}
//# sourceMappingURL=etransport.controller.d.ts.map