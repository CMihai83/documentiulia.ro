import { BankingService } from './banking.service';
declare class ConnectBankDto {
    bankCode: string;
    companyId: string;
    state?: string;
}
declare class ExchangeCodeDto {
    bankCode: string;
    code: string;
    companyId: string;
}
declare class InitiatePaymentDto {
    bankCode: string;
    debtorIban: string;
    creditorIban: string;
    creditorName: string;
    amount: number;
    currency: string;
    description: string;
}
declare class SyncTransactionsDto {
    bankCode: string;
    accountId: string;
    companyId: string;
}
export declare class BankingController {
    private readonly bankingService;
    constructor(bankingService: BankingService);
    getSupportedBanks(): {
        success: boolean;
        banks: {
            code: string;
            name: string;
            logo: string;
            features: string[];
        }[];
        psd2Info: {
            description: string;
            features: string[];
            security: string;
        };
    };
    connectBank(dto: ConnectBankDto): Promise<{
        success: boolean;
        authorizationUrl: string;
        consentId: string;
        state: string;
        instructions: string[];
    }>;
    handleCallback(dto: ExchangeCodeDto): Promise<{
        note: string;
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        consentId: string;
        success: boolean;
    }>;
    getAccounts(bankCode: string, accessToken: string): Promise<{
        success: boolean;
        bank: string;
        accounts: import("./banking.service").AccountInfo[];
        count: number;
    }>;
    getBalances(bankCode: string, accountId: string, accessToken: string): Promise<{
        success: boolean;
        bank: string;
        accountId: string;
        balances: import("./banking.service").Balance[];
    }>;
    getTransactions(bankCode: string, accountId: string, accessToken: string, dateFrom?: string, dateTo?: string): Promise<{
        success: boolean;
        bank: string;
        accountId: string;
        transactions: (import("./banking.service").Transaction & {
            category: string;
            contAccount: string;
        })[];
        count: number;
        summary: {
            totalIncome: string;
            totalExpenses: string;
            netFlow: string;
            byCategory: Record<string, {
                count: number;
                total: number;
            }>;
        };
    }>;
    initiatePayment(dto: InitiatePaymentDto): Promise<{
        nextSteps: string[];
        paymentId: string;
        transactionStatus: string;
        scaStatus?: string;
        scaRedirect?: string;
        success: boolean;
    }>;
    getPaymentStatus(paymentId: string, bankCode: string, accessToken: string): Promise<{
        statusDescription: string;
        paymentId: string;
        transactionStatus: string;
        fundsAvailable?: boolean;
        success: boolean;
    }>;
    syncTransactions(dto: SyncTransactionsDto): Promise<{
        message: string;
        synced: number;
        categorized: number;
        reconciled: number;
        errors: string[];
        success: boolean;
    }>;
    getCategories(): {
        success: boolean;
        categories: {
            income: {
                code: string;
                name: string;
                contAccount: string;
            }[];
            expense: {
                code: string;
                name: string;
                contAccount: string;
            }[];
        };
        note: string;
    };
    healthCheck(): {
        status: string;
        service: string;
        supportedBanks: string[];
        features: string[];
        compliance: string[];
    };
    private getStatusDescription;
}
export {};
//# sourceMappingURL=banking.controller.d.ts.map