import { EfacturaStatus } from '@prisma/client';
export declare class UpdateEfacturaConfigDto {
    isEnabled?: boolean;
    autoUpload?: boolean;
    autoDownload?: boolean;
    certificateFile?: string;
    certificatePassword?: string;
}
export declare class SendToAnafDto {
    invoiceId: string;
}
export declare class AnafStatusDto {
    uploadId: string;
}
export declare class UpdateInvoiceEfacturaDto {
    efacturaStatus?: EfacturaStatus;
    efacturaIndexId?: string;
    efacturaUploadId?: string;
    efacturaXml?: string;
}
//# sourceMappingURL=efactura.dto.d.ts.map