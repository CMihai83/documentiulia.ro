export declare enum TaxType {
    VAT_STANDARD = "VAT_STANDARD",
    VAT_STANDARD_21 = "VAT_STANDARD_21",
    VAT_REDUCED_9 = "VAT_REDUCED_9",
    VAT_REDUCED_11 = "VAT_REDUCED_11",
    VAT_REDUCED_5 = "VAT_REDUCED_5",
    VAT_ZERO = "VAT_ZERO",
    VAT_EXEMPT = "VAT_EXEMPT",
    INCOME_TAX = "INCOME_TAX",
    SOCIAL_CONTRIB = "SOCIAL_CONTRIB",
    DIVIDEND_TAX = "DIVIDEND_TAX"
}
export declare class CreateTaxCodeDto {
    code: string;
    name: string;
    rate: number;
    type: TaxType;
    saftCode?: string;
    isDefault?: boolean;
}
export declare class UpdateTaxCodeDto {
    name?: string;
    rate?: number;
    type?: TaxType;
    saftCode?: string;
    isDefault?: boolean;
    isActive?: boolean;
}
export declare class TaxCodeFilterDto {
    type?: TaxType;
    isActive?: boolean;
}
//# sourceMappingURL=tax-code.dto.d.ts.map