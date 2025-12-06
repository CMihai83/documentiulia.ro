import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateBankAccountDto, UpdateBankAccountDto, CreateTransactionDto, UpdateTransactionDto, TransactionFilterDto } from './dto/bank-account.dto';
export declare class BankAccountsService {
    private prisma;
    constructor(prisma: PrismaService);
    private checkCompanyAccess;
    create(companyId: string, dto: CreateBankAccountDto, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        companyId: string;
        bankName: string;
        iban: string;
        swift: string | null;
        currency: string;
        isActive: boolean;
        balance: import("@prisma/client/runtime/library").Decimal;
        balanceDate: Date | null;
        isConnected: boolean;
        connectionId: string | null;
        lastSyncAt: Date | null;
        isDefault: boolean;
    }>;
    findAll(companyId: string, userId: string): Promise<({
        _count: {
            transactions: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        companyId: string;
        bankName: string;
        iban: string;
        swift: string | null;
        currency: string;
        isActive: boolean;
        balance: import("@prisma/client/runtime/library").Decimal;
        balanceDate: Date | null;
        isConnected: boolean;
        connectionId: string | null;
        lastSyncAt: Date | null;
        isDefault: boolean;
    })[]>;
    findOne(companyId: string, id: string, userId: string): Promise<{
        _count: {
            transactions: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        companyId: string;
        bankName: string;
        iban: string;
        swift: string | null;
        currency: string;
        isActive: boolean;
        balance: import("@prisma/client/runtime/library").Decimal;
        balanceDate: Date | null;
        isConnected: boolean;
        connectionId: string | null;
        lastSyncAt: Date | null;
        isDefault: boolean;
    }>;
    update(companyId: string, id: string, dto: UpdateBankAccountDto, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        companyId: string;
        bankName: string;
        iban: string;
        swift: string | null;
        currency: string;
        isActive: boolean;
        balance: import("@prisma/client/runtime/library").Decimal;
        balanceDate: Date | null;
        isConnected: boolean;
        connectionId: string | null;
        lastSyncAt: Date | null;
        isDefault: boolean;
    }>;
    delete(companyId: string, id: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        companyId: string;
        bankName: string;
        iban: string;
        swift: string | null;
        currency: string;
        isActive: boolean;
        balance: import("@prisma/client/runtime/library").Decimal;
        balanceDate: Date | null;
        isConnected: boolean;
        connectionId: string | null;
        lastSyncAt: Date | null;
        isDefault: boolean;
    }>;
    setDefault(companyId: string, id: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        companyId: string;
        bankName: string;
        iban: string;
        swift: string | null;
        currency: string;
        isActive: boolean;
        balance: import("@prisma/client/runtime/library").Decimal;
        balanceDate: Date | null;
        isConnected: boolean;
        connectionId: string | null;
        lastSyncAt: Date | null;
        isDefault: boolean;
    }>;
    createTransaction(companyId: string, accountId: string, dto: CreateTransactionDto, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        currency: string;
        description: string;
        type: import(".prisma/client").$Enums.TransactionType;
        amount: import("@prisma/client/runtime/library").Decimal;
        reference: string | null;
        category: string | null;
        transactionDate: Date;
        valueDate: Date | null;
        isReconciled: boolean;
        runningBalance: import("@prisma/client/runtime/library").Decimal | null;
        bankAccountId: string;
    }>;
    getTransactions(companyId: string, accountId: string, filters: TransactionFilterDto, userId: string): Promise<{
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            currency: string;
            description: string;
            type: import(".prisma/client").$Enums.TransactionType;
            amount: import("@prisma/client/runtime/library").Decimal;
            reference: string | null;
            category: string | null;
            transactionDate: Date;
            valueDate: Date | null;
            isReconciled: boolean;
            runningBalance: import("@prisma/client/runtime/library").Decimal | null;
            bankAccountId: string;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getTransaction(companyId: string, accountId: string, transactionId: string, userId: string): Promise<{
        bankAccount: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            companyId: string;
            bankName: string;
            iban: string;
            swift: string | null;
            currency: string;
            isActive: boolean;
            balance: import("@prisma/client/runtime/library").Decimal;
            balanceDate: Date | null;
            isConnected: boolean;
            connectionId: string | null;
            lastSyncAt: Date | null;
            isDefault: boolean;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        currency: string;
        description: string;
        type: import(".prisma/client").$Enums.TransactionType;
        amount: import("@prisma/client/runtime/library").Decimal;
        reference: string | null;
        category: string | null;
        transactionDate: Date;
        valueDate: Date | null;
        isReconciled: boolean;
        runningBalance: import("@prisma/client/runtime/library").Decimal | null;
        bankAccountId: string;
    }>;
    updateTransaction(companyId: string, accountId: string, transactionId: string, dto: UpdateTransactionDto, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        currency: string;
        description: string;
        type: import(".prisma/client").$Enums.TransactionType;
        amount: import("@prisma/client/runtime/library").Decimal;
        reference: string | null;
        category: string | null;
        transactionDate: Date;
        valueDate: Date | null;
        isReconciled: boolean;
        runningBalance: import("@prisma/client/runtime/library").Decimal | null;
        bankAccountId: string;
    }>;
    deleteTransaction(companyId: string, accountId: string, transactionId: string, userId: string): Promise<{
        message: string;
    }>;
    reconcileTransaction(companyId: string, accountId: string, transactionId: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        currency: string;
        description: string;
        type: import(".prisma/client").$Enums.TransactionType;
        amount: import("@prisma/client/runtime/library").Decimal;
        reference: string | null;
        category: string | null;
        transactionDate: Date;
        valueDate: Date | null;
        isReconciled: boolean;
        runningBalance: import("@prisma/client/runtime/library").Decimal | null;
        bankAccountId: string;
    }>;
    bulkReconcile(companyId: string, accountId: string, transactionIds: string[], userId: string): Promise<{
        reconciled: number;
    }>;
    getAccountStats(companyId: string, accountId: string, userId: string): Promise<{
        currentBalance: import("@prisma/client/runtime/library").Decimal;
        balanceDate: Date | null;
        monthlyCredits: {
            amount: number | import("@prisma/client/runtime/library").Decimal;
            count: number;
        };
        monthlyDebits: {
            amount: number | import("@prisma/client/runtime/library").Decimal;
            count: number;
        };
        unreconciledTransactions: number;
    }>;
}
//# sourceMappingURL=bank-accounts.service.d.ts.map