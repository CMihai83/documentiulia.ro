import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateDocumentDto, UpdateDocumentDto, DocumentFilterDto } from './dto/document.dto';
export declare class DocumentsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(companyId: string, dto: CreateDocumentDto): Promise<{
        invoice: {
            id: string;
            invoiceNumber: string;
        } | null;
        expense: {
            id: string;
            description: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        companyId: string;
        description: string | null;
        type: import(".prisma/client").$Enums.DocumentType;
        invoiceId: string | null;
        expenseId: string | null;
        fileUrl: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
    }>;
    findAll(companyId: string, filters: DocumentFilterDto): Promise<{
        data: ({
            invoice: {
                id: string;
                invoiceNumber: string;
            } | null;
            expense: {
                id: string;
                description: string;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            companyId: string;
            description: string | null;
            type: import(".prisma/client").$Enums.DocumentType;
            invoiceId: string | null;
            expenseId: string | null;
            fileUrl: string;
            fileName: string;
            fileSize: number;
            mimeType: string;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(companyId: string, id: string): Promise<{
        invoice: {
            id: string;
            clientId: string;
            invoiceNumber: string;
        } | null;
        expense: {
            id: string;
            description: string;
            category: import(".prisma/client").$Enums.ExpenseCategory;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        companyId: string;
        description: string | null;
        type: import(".prisma/client").$Enums.DocumentType;
        invoiceId: string | null;
        expenseId: string | null;
        fileUrl: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
    }>;
    update(companyId: string, id: string, dto: UpdateDocumentDto): Promise<{
        invoice: {
            id: string;
            invoiceNumber: string;
        } | null;
        expense: {
            id: string;
            description: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        companyId: string;
        description: string | null;
        type: import(".prisma/client").$Enums.DocumentType;
        invoiceId: string | null;
        expenseId: string | null;
        fileUrl: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
    }>;
    delete(companyId: string, id: string): Promise<{
        message: string;
    }>;
    getByInvoice(companyId: string, invoiceId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        companyId: string;
        description: string | null;
        type: import(".prisma/client").$Enums.DocumentType;
        invoiceId: string | null;
        expenseId: string | null;
        fileUrl: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
    }[]>;
    getByExpense(companyId: string, expenseId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        companyId: string;
        description: string | null;
        type: import(".prisma/client").$Enums.DocumentType;
        invoiceId: string | null;
        expenseId: string | null;
        fileUrl: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
    }[]>;
    getStats(companyId: string): Promise<{
        total: number;
        byType: Record<string, number>;
        totalSizeBytes: number;
        totalSizeMB: number;
    }>;
    linkToInvoice(companyId: string, id: string, invoiceId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        companyId: string;
        description: string | null;
        type: import(".prisma/client").$Enums.DocumentType;
        invoiceId: string | null;
        expenseId: string | null;
        fileUrl: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
    }>;
    linkToExpense(companyId: string, id: string, expenseId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        companyId: string;
        description: string | null;
        type: import(".prisma/client").$Enums.DocumentType;
        invoiceId: string | null;
        expenseId: string | null;
        fileUrl: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
    }>;
    unlinkFromInvoice(companyId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        companyId: string;
        description: string | null;
        type: import(".prisma/client").$Enums.DocumentType;
        invoiceId: string | null;
        expenseId: string | null;
        fileUrl: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
    }>;
    unlinkFromExpense(companyId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        companyId: string;
        description: string | null;
        type: import(".prisma/client").$Enums.DocumentType;
        invoiceId: string | null;
        expenseId: string | null;
        fileUrl: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
    }>;
}
//# sourceMappingURL=documents.service.d.ts.map