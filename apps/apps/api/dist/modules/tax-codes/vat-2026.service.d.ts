import { PrismaService } from '../../common/prisma/prisma.service';
interface VatCalculation {
    netAmount: number;
    vatAmount: number;
    grossAmount: number;
    vatRate: number;
    vatCode: string;
    reverseCharge: boolean;
    vatExemptionReason?: string;
}
interface VatRateConfig {
    code: string;
    rate: number;
    name: string;
    nameRo: string;
    applicableFrom: Date;
    applicableTo?: Date;
    categories: string[];
    ncCodes?: string[];
}
interface VatReturn {
    period: string;
    year: number;
    month?: number;
    quarter?: number;
    salesVat: number;
    purchasesVat: number;
    reverseChargeVat: number;
    intraEuAcquisitions: number;
    intraEuSupplies: number;
    exports: number;
    imports: number;
    vatDue: number;
    vatRefund: number;
    netPosition: number;
}
export declare class Vat2026Service {
    private prisma;
    private readonly logger;
    private readonly vatRates;
    constructor(prisma: PrismaService);
    calculateVat(netAmount: number, category: string, options?: {
        date?: Date;
        customerCountry?: string;
        customerVatId?: string;
        isB2B?: boolean;
        ncCode?: string;
    }): VatCalculation;
    calculateVatFromGross(grossAmount: number, category: string, date?: Date): VatCalculation;
    getVatRate(category: string, date?: Date, ncCode?: string): VatRateConfig;
    getAllVatRates(): VatRateConfig[];
    validateVatNumber(vatNumber: string): {
        valid: boolean;
        formatted: string;
        error?: string;
    };
    validateEuVatNumber(vatNumber: string): Promise<{
        valid: boolean;
        name?: string;
        address?: string;
        error?: string;
    }>;
    calculateVatReturn(companyId: string, year: number, month?: number, quarter?: number): Promise<VatReturn>;
    checkOssThreshold(companyId: string, year: number): Promise<{
        totalSales: number;
        threshold: number;
        exceeds: boolean;
        recommendation: string;
    }>;
    getVatCalendar(year: number, isMonthly: boolean): {
        deadline: Date;
        declaration: string;
        description: string;
    }[];
    private isEuCountry;
    private roundVat;
    private getMonthName;
}
export {};
//# sourceMappingURL=vat-2026.service.d.ts.map