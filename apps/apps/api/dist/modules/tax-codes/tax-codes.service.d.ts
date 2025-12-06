import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTaxCodeDto, UpdateTaxCodeDto, TaxCodeFilterDto } from './dto/tax-code.dto';
import { TaxType } from '@prisma/client';
export interface VatRateInfo {
    standard: number;
    reduced: number;
    superReduced: number;
    dividendTax: number;
    effectiveDate: Date;
    isCurrentlyActive: boolean;
}
export interface FiscalComplianceStatus {
    currentVatRegime: '2024' | '2025-transitional' | '2026';
    applicableRates: VatRateInfo;
    upcomingChanges: Array<{
        date: Date;
        description: string;
        impact: string;
    }>;
    complianceChecklist: Array<{
        item: string;
        status: 'compliant' | 'action-required' | 'pending';
    }>;
}
export declare class TaxCodesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
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
    findByCode(companyId: string, code: string): Promise<{
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
    getDefault(companyId: string, type: TaxType): Promise<{
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
    } | null>;
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
    getApplicableVatRate(transactionDate: Date, rateType?: 'standard' | 'reduced' | 'super-reduced'): number;
    getDividendTaxRate(distributionDate: Date): number;
    getFiscalComplianceStatus(): FiscalComplianceStatus;
    getApplicableTaxCode(companyId: string, transactionDate: Date, rateType?: 'standard' | 'reduced' | 'super-reduced' | 'zero' | 'exempt'): Promise<{
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
    } | null>;
    getVatSummary(companyId: string): Promise<{
        code: string;
        name: string;
        rate: number;
        saftCode: string | null;
        isDefault: boolean;
    }[]>;
}
//# sourceMappingURL=tax-codes.service.d.ts.map