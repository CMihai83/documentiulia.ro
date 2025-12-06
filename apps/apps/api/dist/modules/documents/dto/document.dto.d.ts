export declare enum DocumentType {
    INVOICE_PDF = "INVOICE_PDF",
    RECEIPT = "RECEIPT",
    CONTRACT = "CONTRACT",
    REPORT = "REPORT",
    EFACTURA_XML = "EFACTURA_XML",
    SAFT_XML = "SAFT_XML",
    OTHER = "OTHER"
}
export declare class CreateDocumentDto {
    name: string;
    description?: string;
    fileUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    type?: DocumentType;
    invoiceId?: string;
    expenseId?: string;
}
export declare class UpdateDocumentDto {
    name?: string;
    description?: string;
    type?: DocumentType;
    invoiceId?: string;
    expenseId?: string;
}
export declare class DocumentFilterDto {
    type?: DocumentType;
    invoiceId?: string;
    expenseId?: string;
    search?: string;
    page?: number;
    limit?: number;
}
//# sourceMappingURL=document.dto.d.ts.map