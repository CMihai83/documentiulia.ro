export declare enum SaftExportType {
    FULL = "FULL",
    INVOICES = "INVOICES",
    GENERAL_LEDGER = "GENERAL_LEDGER",
    PAYMENTS = "PAYMENTS"
}
export declare class SaftExportDto {
    startDate: string;
    endDate: string;
    exportType?: SaftExportType;
    declarationId?: string;
}
export declare class SaftValidationResultDto {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    summary: {
        totalInvoices: number;
        totalVatAmount: number;
        totalAmount: number;
        period: string;
    };
}
//# sourceMappingURL=saft-export.dto.d.ts.map