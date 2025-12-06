import { ConfigService } from '@nestjs/config';
export interface AccountInfo {
    resourceId: string;
    iban: string;
    currency: string;
    name: string;
    product: string;
    cashAccountType: string;
    status: string;
    bic?: string;
    ownerName?: string;
}
export interface Balance {
    balanceAmount: {
        currency: string;
        amount: string;
    };
    balanceType: string;
    lastChangeDateTime?: string;
    referenceDate?: string;
}
export interface Transaction {
    transactionId: string;
    entryReference?: string;
    bookingDate: string;
    valueDate: string;
    transactionAmount: {
        currency: string;
        amount: string;
    };
    creditorName?: string;
    creditorAccount?: {
        iban: string;
    };
    debtorName?: string;
    debtorAccount?: {
        iban: string;
    };
    remittanceInformationUnstructured?: string;
    proprietaryBankTransactionCode?: string;
    internalTransactionId?: string;
}
export interface PaymentInitiation {
    instructedAmount: {
        currency: string;
        amount: string;
    };
    debtorAccount: {
        iban: string;
    };
    creditorName: string;
    creditorAccount: {
        iban: string;
    };
    remittanceInformationUnstructured: string;
}
export declare class BankingService {
    private readonly configService;
    private readonly logger;
    private readonly prisma;
    constructor(configService: ConfigService);
    getAuthorizationUrl(bankCode: string, companyId: string, state: string): Promise<{
        url: string;
        consentId: string;
    }>;
    exchangeCodeForToken(bankCode: string, code: string, companyId: string): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        consentId: string;
    }>;
    getAccounts(bankCode: string, accessToken: string): Promise<AccountInfo[]>;
    getBalances(bankCode: string, accessToken: string, accountId: string): Promise<Balance[]>;
    getTransactions(bankCode: string, accessToken: string, accountId: string, dateFrom?: string, dateTo?: string): Promise<{
        transactions: Transaction[];
        categorized: Array<Transaction & {
            category: string;
            contAccount: string;
        }>;
    }>;
    initiatePayment(bankCode: string, accessToken: string, payment: PaymentInitiation): Promise<{
        paymentId: string;
        transactionStatus: string;
        scaStatus?: string;
        scaRedirect?: string;
    }>;
    getPaymentStatus(bankCode: string, accessToken: string, paymentId: string): Promise<{
        paymentId: string;
        transactionStatus: string;
        fundsAvailable?: boolean;
    }>;
    syncTransactions(companyId: string, bankCode: string, accessToken: string, accountId: string): Promise<{
        synced: number;
        categorized: number;
        reconciled: number;
        errors: string[];
    }>;
    private categorizeTransaction;
    private validateIBAN;
    private getBankConfig;
    getSupportedBanks(): Array<{
        code: string;
        name: string;
        logo: string;
        features: string[];
    }>;
}
//# sourceMappingURL=banking.service.d.ts.map