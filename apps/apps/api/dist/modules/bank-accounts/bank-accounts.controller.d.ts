import { BankAccountsService } from './bank-accounts.service';
import { CreateBankAccountDto, UpdateBankAccountDto, CreateTransactionDto, UpdateTransactionDto, TransactionFilterDto } from './dto/bank-account.dto';
export declare class BankAccountsController {
    private readonly bankAccountsService;
    constructor(bankAccountsService: BankAccountsService);
    create(companyId: string, dto: CreateBankAccountDto, user: any): Promise<{
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
    findAll(companyId: string, user: any): Promise<({
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
    findOne(companyId: string, id: string, user: any): Promise<{
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
    update(companyId: string, id: string, dto: UpdateBankAccountDto, user: any): Promise<{
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
    delete(companyId: string, id: string, user: any): Promise<{
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
    setDefault(companyId: string, id: string, user: any): Promise<{
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
    getStats(companyId: string, id: string, user: any): Promise<{
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
    createTransaction(companyId: string, id: string, dto: CreateTransactionDto, user: any): Promise<{
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
    getTransactions(companyId: string, id: string, filters: TransactionFilterDto, user: any): Promise<{
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
    getTransaction(companyId: string, id: string, transactionId: string, user: any): Promise<{
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
    updateTransaction(companyId: string, id: string, transactionId: string, dto: UpdateTransactionDto, user: any): Promise<{
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
    deleteTransaction(companyId: string, id: string, transactionId: string, user: any): Promise<{
        message: string;
    }>;
    reconcileTransaction(companyId: string, id: string, transactionId: string, user: any): Promise<{
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
    bulkReconcile(companyId: string, id: string, transactionIds: string[], user: any): Promise<{
        reconciled: number;
    }>;
}
//# sourceMappingURL=bank-accounts.controller.d.ts.map