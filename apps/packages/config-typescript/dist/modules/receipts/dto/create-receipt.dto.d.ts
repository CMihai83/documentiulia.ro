import { OcrStatus } from '@prisma/client';
export declare class CreateReceiptDto {
    fileUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    vendorName?: string;
    receiptDate?: string;
    total?: number;
    vatAmount?: number;
    currency?: string;
}
export declare class UpdateReceiptOcrDto {
    ocrStatus?: OcrStatus;
    ocrConfidence?: number;
    ocrRawData?: Record<string, unknown>;
    ocrItems?: Record<string, unknown>;
    vendorName?: string;
    total?: number;
    vatAmount?: number;
    receiptDate?: string;
}
export declare class LinkReceiptToExpenseDto {
    expenseId: string;
}
//# sourceMappingURL=create-receipt.dto.d.ts.map