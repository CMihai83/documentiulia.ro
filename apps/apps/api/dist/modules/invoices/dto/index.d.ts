import { InvoiceType, InvoiceStatus } from '@prisma/client';
export declare class InvoiceItemDto {
    productId?: string;
    description: string;
    unit?: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    discount?: number;
    discountType?: string;
}
export declare class CreateInvoiceDto {
    clientId: string;
    type?: InvoiceType;
    series: string;
    issueDate: string;
    dueDate: string;
    deliveryDate?: string;
    currency?: string;
    exchangeRate?: number;
    discount?: number;
    paymentMethod?: string;
    notes?: string;
    internalNotes?: string;
    termsConditions?: string;
    items: InvoiceItemDto[];
}
declare const UpdateInvoiceDto_base: import("@nestjs/common").Type<Partial<CreateInvoiceDto>>;
export declare class UpdateInvoiceDto extends UpdateInvoiceDto_base {
}
export declare class InvoiceFilterDto {
    status?: InvoiceStatus;
    clientId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    skip?: number;
    take?: number;
}
export {};
//# sourceMappingURL=index.d.ts.map