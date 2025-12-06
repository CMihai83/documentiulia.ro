import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateEfacturaConfigDto, UpdateInvoiceEfacturaDto } from './dto/efactura.dto';
export declare class EfacturaService {
    private prisma;
    constructor(prisma: PrismaService);
    private checkCompanyAccess;
    getConfig(companyId: string, userId: string): Promise<{
        certificatePassword: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        isEnabled: boolean;
        certificateFile: string | null;
        autoUpload: boolean;
        autoDownload: boolean;
        lastUploadAt: Date | null;
        lastDownloadAt: Date | null;
    }>;
    updateConfig(companyId: string, dto: UpdateEfacturaConfigDto, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        isEnabled: boolean;
        certificateFile: string | null;
        certificatePassword: string | null;
        autoUpload: boolean;
        autoDownload: boolean;
        lastUploadAt: Date | null;
        lastDownloadAt: Date | null;
    }>;
    generateXml(companyId: string, invoiceId: string, userId: string): Promise<string>;
    private generateUblXml;
    sendToAnaf(companyId: string, invoiceId: string, userId: string): Promise<{
        success: boolean;
        uploadId: string;
        message: string;
    }>;
    checkAnafStatus(companyId: string, invoiceId: string, userId: string): Promise<{
        invoiceId: string;
        status: import(".prisma/client").$Enums.EfacturaStatus | null;
        uploadId: string;
        indexId: string | null;
        sentAt: Date | null;
    }>;
    updateInvoiceEfacturaStatus(companyId: string, invoiceId: string, dto: UpdateInvoiceEfacturaDto, userId: string): Promise<{
        number: number;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        currency: string;
        status: import(".prisma/client").$Enums.InvoiceStatus;
        type: import(".prisma/client").$Enums.InvoiceType;
        total: import("@prisma/client/runtime/library").Decimal;
        exchangeRate: import("@prisma/client/runtime/library").Decimal;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        vatAmount: import("@prisma/client/runtime/library").Decimal;
        discount: import("@prisma/client/runtime/library").Decimal;
        subtotalRon: import("@prisma/client/runtime/library").Decimal;
        vatAmountRon: import("@prisma/client/runtime/library").Decimal;
        totalRon: import("@prisma/client/runtime/library").Decimal;
        paidAmount: import("@prisma/client/runtime/library").Decimal;
        notes: string | null;
        issueDate: Date;
        clientId: string;
        paymentStatus: import(".prisma/client").$Enums.PaymentStatus;
        series: string;
        invoiceNumber: string;
        dueDate: Date;
        deliveryDate: Date | null;
        paymentMethod: string | null;
        paidAt: Date | null;
        internalNotes: string | null;
        termsConditions: string | null;
        efacturaStatus: import(".prisma/client").$Enums.EfacturaStatus | null;
        efacturaIndexId: string | null;
        efacturaUploadId: string | null;
        efacturaXml: string | null;
        efacturaSentAt: Date | null;
    }>;
    getPendingEfactura(companyId: string, userId: string): Promise<({
        client: {
            name: string;
        };
    } & {
        number: number;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        currency: string;
        status: import(".prisma/client").$Enums.InvoiceStatus;
        type: import(".prisma/client").$Enums.InvoiceType;
        total: import("@prisma/client/runtime/library").Decimal;
        exchangeRate: import("@prisma/client/runtime/library").Decimal;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        vatAmount: import("@prisma/client/runtime/library").Decimal;
        discount: import("@prisma/client/runtime/library").Decimal;
        subtotalRon: import("@prisma/client/runtime/library").Decimal;
        vatAmountRon: import("@prisma/client/runtime/library").Decimal;
        totalRon: import("@prisma/client/runtime/library").Decimal;
        paidAmount: import("@prisma/client/runtime/library").Decimal;
        notes: string | null;
        issueDate: Date;
        clientId: string;
        paymentStatus: import(".prisma/client").$Enums.PaymentStatus;
        series: string;
        invoiceNumber: string;
        dueDate: Date;
        deliveryDate: Date | null;
        paymentMethod: string | null;
        paidAt: Date | null;
        internalNotes: string | null;
        termsConditions: string | null;
        efacturaStatus: import(".prisma/client").$Enums.EfacturaStatus | null;
        efacturaIndexId: string | null;
        efacturaUploadId: string | null;
        efacturaXml: string | null;
        efacturaSentAt: Date | null;
    })[]>;
    getFailedEfactura(companyId: string, userId: string): Promise<({
        client: {
            name: string;
        };
    } & {
        number: number;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        currency: string;
        status: import(".prisma/client").$Enums.InvoiceStatus;
        type: import(".prisma/client").$Enums.InvoiceType;
        total: import("@prisma/client/runtime/library").Decimal;
        exchangeRate: import("@prisma/client/runtime/library").Decimal;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        vatAmount: import("@prisma/client/runtime/library").Decimal;
        discount: import("@prisma/client/runtime/library").Decimal;
        subtotalRon: import("@prisma/client/runtime/library").Decimal;
        vatAmountRon: import("@prisma/client/runtime/library").Decimal;
        totalRon: import("@prisma/client/runtime/library").Decimal;
        paidAmount: import("@prisma/client/runtime/library").Decimal;
        notes: string | null;
        issueDate: Date;
        clientId: string;
        paymentStatus: import(".prisma/client").$Enums.PaymentStatus;
        series: string;
        invoiceNumber: string;
        dueDate: Date;
        deliveryDate: Date | null;
        paymentMethod: string | null;
        paidAt: Date | null;
        internalNotes: string | null;
        termsConditions: string | null;
        efacturaStatus: import(".prisma/client").$Enums.EfacturaStatus | null;
        efacturaIndexId: string | null;
        efacturaUploadId: string | null;
        efacturaXml: string | null;
        efacturaSentAt: Date | null;
    })[]>;
    getStatusSummary(companyId: string): Promise<{
        pending: number;
        processing: number;
        accepted: number;
        rejected: number;
        notSent: number;
    }>;
    getHistory(companyId: string): Promise<{
        client: {
            name: string;
        };
        id: string;
        currency: string;
        total: import("@prisma/client/runtime/library").Decimal;
        invoiceNumber: string;
        efacturaStatus: import(".prisma/client").$Enums.EfacturaStatus | null;
        efacturaIndexId: string | null;
        efacturaUploadId: string | null;
        efacturaSentAt: Date | null;
    }[]>;
    validateForEfactura(companyId: string, invoiceId: string, userId: string): Promise<{
        valid: boolean;
        errors: string[];
        warnings: string[];
    }>;
}
//# sourceMappingURL=efactura.service.d.ts.map