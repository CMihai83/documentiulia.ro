import { TaxCodesService } from './tax-codes.service';
import { CreateTaxCodeDto, UpdateTaxCodeDto, TaxCodeFilterDto } from './dto/tax-code.dto';
export declare class TaxCodesController {
    private readonly taxCodesService;
    constructor(taxCodesService: TaxCodesService);
    create(companyId: string, dto: CreateTaxCodeDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        companyId: string;
        type: import(".prisma/client").$Enums.TaxType;
        isActive: boolean;
        code: string;
        isDefault: boolean;
        rate: import("@prisma/client/runtime/library").Decimal;
        saftCode: string | null;
    }>;
    findAll(companyId: string, filters: TaxCodeFilterDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        companyId: string;
        type: import(".prisma/client").$Enums.TaxType;
        isActive: boolean;
        code: string;
        isDefault: boolean;
        rate: import("@prisma/client/runtime/library").Decimal;
        saftCode: string | null;
    }[]>;
    getVatSummary(companyId: string): Promise<{
        code: string;
        name: string;
        rate: number;
        saftCode: string | null;
        isDefault: boolean;
    }[]>;
    getFiscalCompliance(): Promise<import("./tax-codes.service").FiscalComplianceStatus>;
    getApplicableRate(companyId: string, dateStr: string, rateType?: 'standard' | 'reduced' | 'super-reduced' | 'zero' | 'exempt'): Promise<{
        transactionDate: Date;
        rateType: "standard" | "reduced" | "super-reduced" | "zero" | "exempt";
        applicableRate: number;
        taxCode: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            companyId: string;
            type: import(".prisma/client").$Enums.TaxType;
            isActive: boolean;
            code: string;
            isDefault: boolean;
            rate: import("@prisma/client/runtime/library").Decimal;
            saftCode: string | null;
        } | null;
        regime: string;
    }>;
    initializeDefaults(companyId: string): Promise<{
        initialized: number;
        taxCodes: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            companyId: string;
            type: import(".prisma/client").$Enums.TaxType;
            isActive: boolean;
            code: string;
            isDefault: boolean;
            rate: import("@prisma/client/runtime/library").Decimal;
            saftCode: string | null;
        }[];
    }>;
    findOne(companyId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        companyId: string;
        type: import(".prisma/client").$Enums.TaxType;
        isActive: boolean;
        code: string;
        isDefault: boolean;
        rate: import("@prisma/client/runtime/library").Decimal;
        saftCode: string | null;
    }>;
    update(companyId: string, id: string, dto: UpdateTaxCodeDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        companyId: string;
        type: import(".prisma/client").$Enums.TaxType;
        isActive: boolean;
        code: string;
        isDefault: boolean;
        rate: import("@prisma/client/runtime/library").Decimal;
        saftCode: string | null;
    }>;
    delete(companyId: string, id: string): Promise<{
        message: string;
    }>;
    setDefault(companyId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        companyId: string;
        type: import(".prisma/client").$Enums.TaxType;
        isActive: boolean;
        code: string;
        isDefault: boolean;
        rate: import("@prisma/client/runtime/library").Decimal;
        saftCode: string | null;
    }>;
}
//# sourceMappingURL=tax-codes.controller.d.ts.map