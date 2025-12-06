"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var BankingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankingService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const BANK_CONFIGS = {
    BCR: {
        authorize: 'https://api.bcr.ro/oauth/authorize',
        token: 'https://api.bcr.ro/oauth/token',
        accounts: 'https://api.bcr.ro/psd2/v1/accounts',
        balances: 'https://api.bcr.ro/psd2/v1/accounts/{accountId}/balances',
        transactions: 'https://api.bcr.ro/psd2/v1/accounts/{accountId}/transactions',
        payments: 'https://api.bcr.ro/psd2/v1/payments/sepa-credit-transfers',
    },
    BRD: {
        authorize: 'https://api.brd.ro/oauth/authorize',
        token: 'https://api.brd.ro/oauth/token',
        accounts: 'https://api.brd.ro/psd2/v1/accounts',
        balances: 'https://api.brd.ro/psd2/v1/accounts/{accountId}/balances',
        transactions: 'https://api.brd.ro/psd2/v1/accounts/{accountId}/transactions',
        payments: 'https://api.brd.ro/psd2/v1/payments/sepa-credit-transfers',
    },
    RAIFFEISEN: {
        authorize: 'https://api.raiffeisen.ro/oauth/authorize',
        token: 'https://api.raiffeisen.ro/oauth/token',
        accounts: 'https://api.raiffeisen.ro/psd2/v1/accounts',
        balances: 'https://api.raiffeisen.ro/psd2/v1/accounts/{accountId}/balances',
        transactions: 'https://api.raiffeisen.ro/psd2/v1/accounts/{accountId}/transactions',
        payments: 'https://api.raiffeisen.ro/psd2/v1/payments/sepa-credit-transfers',
    },
    ING: {
        authorize: 'https://api.ing.ro/oauth/authorize',
        token: 'https://api.ing.ro/oauth/token',
        accounts: 'https://api.ing.ro/psd2/v1/accounts',
        balances: 'https://api.ing.ro/psd2/v1/accounts/{accountId}/balances',
        transactions: 'https://api.ing.ro/psd2/v1/accounts/{accountId}/transactions',
        payments: 'https://api.ing.ro/psd2/v1/payments/sepa-credit-transfers',
    },
};
const TRANSACTION_CATEGORIES = {
    INCASARE_FACTURA: { category: 'Încasare Factură', contAccount: '5311' },
    TRANSFER_PRIMIT: { category: 'Transfer Primit', contAccount: '5121' },
    DOBANDA: { category: 'Dobândă', contAccount: '766' },
    RAMBURSARE: { category: 'Rambursare', contAccount: '461' },
    PLATA_FURNIZOR: { category: 'Plată Furnizor', contAccount: '401' },
    SALARII: { category: 'Salarii', contAccount: '421' },
    IMPOZITE: { category: 'Impozite și Taxe', contAccount: '446' },
    UTILITATI: { category: 'Utilități', contAccount: '605' },
    CHIRIE: { category: 'Chirie', contAccount: '612' },
    COMISIOANE_BANCARE: { category: 'Comisioane Bancare', contAccount: '627' },
    ASIGURARI: { category: 'Asigurări', contAccount: '613' },
    CARBURANT: { category: 'Carburant', contAccount: '6022' },
    MATERIALE: { category: 'Materiale', contAccount: '602' },
    SERVICII: { category: 'Servicii Externe', contAccount: '628' },
};
let BankingService = BankingService_1 = class BankingService {
    configService;
    logger = new common_1.Logger(BankingService_1.name);
    prisma;
    constructor(configService) {
        this.configService = configService;
        this.prisma = new client_1.PrismaClient();
    }
    async getAuthorizationUrl(bankCode, companyId, state) {
        const config = this.getBankConfig(bankCode);
        const endpoints = BANK_CONFIGS[bankCode];
        if (!endpoints) {
            throw new Error(`Unsupported bank: ${bankCode}`);
        }
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 90);
        const consentId = `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const authUrl = new URL(endpoints.authorize);
        authUrl.searchParams.set('client_id', config.clientId);
        authUrl.searchParams.set('redirect_uri', config.redirectUri);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', 'AIS PIS');
        authUrl.searchParams.set('state', state);
        this.logger.log(`Generated auth URL for bank ${bankCode}, company ${companyId}`);
        return {
            url: authUrl.toString(),
            consentId,
        };
    }
    async exchangeCodeForToken(bankCode, code, companyId) {
        const config = this.getBankConfig(bankCode);
        const endpoints = BANK_CONFIGS[bankCode];
        if (!endpoints) {
            throw new Error(`Unsupported bank: ${bankCode}`);
        }
        const mockTokenResponse = {
            accessToken: `access_${bankCode}_${Date.now()}`,
            refreshToken: `refresh_${bankCode}_${Date.now()}`,
            expiresIn: 3600,
            consentId: `consent_${bankCode}_${companyId}`,
        };
        this.logger.log(`Exchanged code for token for bank ${bankCode}, company ${companyId}`);
        return mockTokenResponse;
    }
    async getAccounts(bankCode, accessToken) {
        const endpoints = BANK_CONFIGS[bankCode];
        if (!endpoints) {
            throw new Error(`Unsupported bank: ${bankCode}`);
        }
        const mockAccounts = [
            {
                resourceId: 'acc_001',
                iban: 'RO49RNCB0082044367980001',
                currency: 'RON',
                name: 'Cont Curent Business',
                product: 'Business Account',
                cashAccountType: 'CACC',
                status: 'enabled',
                bic: 'RNCBROBU',
                ownerName: 'SC Example SRL',
            },
            {
                resourceId: 'acc_002',
                iban: 'RO49RNCB0082044367980002',
                currency: 'EUR',
                name: 'Cont Euro',
                product: 'Euro Account',
                cashAccountType: 'CACC',
                status: 'enabled',
                bic: 'RNCBROBU',
            },
        ];
        this.logger.log(`Retrieved ${mockAccounts.length} accounts from ${bankCode}`);
        return mockAccounts;
    }
    async getBalances(bankCode, accessToken, accountId) {
        const endpoints = BANK_CONFIGS[bankCode];
        if (!endpoints) {
            throw new Error(`Unsupported bank: ${bankCode}`);
        }
        const mockBalances = [
            {
                balanceAmount: {
                    currency: 'RON',
                    amount: '125450.75',
                },
                balanceType: 'closingBooked',
                lastChangeDateTime: new Date().toISOString(),
                referenceDate: new Date().toISOString().split('T')[0],
            },
            {
                balanceAmount: {
                    currency: 'RON',
                    amount: '128450.75',
                },
                balanceType: 'expected',
                referenceDate: new Date().toISOString().split('T')[0],
            },
        ];
        return mockBalances;
    }
    async getTransactions(bankCode, accessToken, accountId, dateFrom, dateTo) {
        const endpoints = BANK_CONFIGS[bankCode];
        if (!endpoints) {
            throw new Error(`Unsupported bank: ${bankCode}`);
        }
        const mockTransactions = [
            {
                transactionId: 'tx_001',
                bookingDate: '2025-12-02',
                valueDate: '2025-12-02',
                transactionAmount: { currency: 'RON', amount: '-2500.00' },
                creditorName: 'ENEL ENERGIE',
                creditorAccount: { iban: 'RO12BTRL0000000000000001' },
                remittanceInformationUnstructured: 'Plata factura electricitate decembrie 2025',
                proprietaryBankTransactionCode: 'PMNT',
            },
            {
                transactionId: 'tx_002',
                bookingDate: '2025-12-01',
                valueDate: '2025-12-01',
                transactionAmount: { currency: 'RON', amount: '15000.00' },
                debtorName: 'CLIENT ABC SRL',
                debtorAccount: { iban: 'RO12BTRL0000000000000002' },
                remittanceInformationUnstructured: 'Plata factura FV-2025-0542',
                proprietaryBankTransactionCode: 'RCDT',
            },
            {
                transactionId: 'tx_003',
                bookingDate: '2025-11-30',
                valueDate: '2025-11-30',
                transactionAmount: { currency: 'RON', amount: '-45000.00' },
                creditorName: 'ANAF - Buget de stat',
                creditorAccount: { iban: 'RO35TREZ0000000000000001' },
                remittanceInformationUnstructured: 'Plata TVA noiembrie 2025',
                proprietaryBankTransactionCode: 'PMNT',
            },
            {
                transactionId: 'tx_004',
                bookingDate: '2025-11-28',
                valueDate: '2025-11-28',
                transactionAmount: { currency: 'RON', amount: '-18500.00' },
                creditorName: 'Angajat Ion Popescu',
                remittanceInformationUnstructured: 'Salariu noiembrie 2025',
                proprietaryBankTransactionCode: 'SALA',
            },
            {
                transactionId: 'tx_005',
                bookingDate: '2025-11-25',
                valueDate: '2025-11-25',
                transactionAmount: { currency: 'RON', amount: '-15.50' },
                creditorName: bankCode,
                remittanceInformationUnstructured: 'Comision administrare cont',
                proprietaryBankTransactionCode: 'CHRG',
            },
        ];
        const categorized = mockTransactions.map((tx) => {
            const category = this.categorizeTransaction(tx);
            return {
                ...tx,
                category: category.category,
                contAccount: category.contAccount,
            };
        });
        this.logger.log(`Retrieved ${mockTransactions.length} transactions from ${bankCode}, account ${accountId}`);
        return {
            transactions: mockTransactions,
            categorized,
        };
    }
    async initiatePayment(bankCode, accessToken, payment) {
        const endpoints = BANK_CONFIGS[bankCode];
        if (!endpoints) {
            throw new Error(`Unsupported bank: ${bankCode}`);
        }
        if (!this.validateIBAN(payment.debtorAccount.iban)) {
            throw new Error('Invalid debtor IBAN format');
        }
        if (!this.validateIBAN(payment.creditorAccount.iban)) {
            throw new Error('Invalid creditor IBAN format');
        }
        const paymentId = `pmt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.logger.log(`Initiated payment of ${payment.instructedAmount.amount} ${payment.instructedAmount.currency} to ${payment.creditorName}`);
        return {
            paymentId,
            transactionStatus: 'RCVD',
            scaStatus: 'required',
            scaRedirect: `https://bank.example.com/sca/${paymentId}`,
        };
    }
    async getPaymentStatus(bankCode, accessToken, paymentId) {
        return {
            paymentId,
            transactionStatus: 'ACSC',
            fundsAvailable: true,
        };
    }
    async syncTransactions(companyId, bankCode, accessToken, accountId) {
        const { transactions, categorized } = await this.getTransactions(bankCode, accessToken, accountId);
        let synced = 0;
        let reconciled = 0;
        const errors = [];
        for (const tx of categorized) {
            try {
                synced++;
                if (tx.remittanceInformationUnstructured?.includes('FV-')) {
                    reconciled++;
                }
            }
            catch (error) {
                errors.push(`Failed to sync transaction ${tx.transactionId}: ${error}`);
            }
        }
        this.logger.log(`Synced ${synced} transactions, reconciled ${reconciled}, errors: ${errors.length}`);
        return {
            synced,
            categorized: categorized.length,
            reconciled,
            errors,
        };
    }
    categorizeTransaction(tx) {
        const description = (tx.remittanceInformationUnstructured || '').toLowerCase();
        const amount = parseFloat(tx.transactionAmount.amount);
        const creditor = (tx.creditorName || '').toLowerCase();
        const debtor = (tx.debtorName || '').toLowerCase();
        if (amount > 0) {
            if (description.includes('factura') || description.includes('fv-')) {
                return TRANSACTION_CATEGORIES.INCASARE_FACTURA;
            }
            if (description.includes('dobanda') || description.includes('interes')) {
                return TRANSACTION_CATEGORIES.DOBANDA;
            }
            return TRANSACTION_CATEGORIES.TRANSFER_PRIMIT;
        }
        if (creditor.includes('anaf') || description.includes('tva') || description.includes('impozit')) {
            return TRANSACTION_CATEGORIES.IMPOZITE;
        }
        if (description.includes('salariu') || description.includes('salary')) {
            return TRANSACTION_CATEGORIES.SALARII;
        }
        if (creditor.includes('enel') || creditor.includes('engie') || description.includes('utilit')) {
            return TRANSACTION_CATEGORIES.UTILITATI;
        }
        if (description.includes('chirie') || description.includes('rent')) {
            return TRANSACTION_CATEGORIES.CHIRIE;
        }
        if (description.includes('comision') || description.includes('fee')) {
            return TRANSACTION_CATEGORIES.COMISIOANE_BANCARE;
        }
        if (description.includes('asigur')) {
            return TRANSACTION_CATEGORIES.ASIGURARI;
        }
        if (creditor.includes('petrom') || creditor.includes('omv') || description.includes('carburant')) {
            return TRANSACTION_CATEGORIES.CARBURANT;
        }
        return TRANSACTION_CATEGORIES.PLATA_FURNIZOR;
    }
    validateIBAN(iban) {
        const cleanIban = iban.replace(/\s/g, '').toUpperCase();
        const roIbanRegex = /^RO\d{2}[A-Z]{4}[A-Z0-9]{16}$/;
        return roIbanRegex.test(cleanIban);
    }
    getBankConfig(bankCode) {
        const prefix = `PSD2_${bankCode.toUpperCase()}`;
        return {
            clientId: this.configService.get(`${prefix}_CLIENT_ID`) || 'demo_client_id',
            clientSecret: this.configService.get(`${prefix}_CLIENT_SECRET`) || 'demo_client_secret',
            redirectUri: this.configService.get(`${prefix}_REDIRECT_URI`) ||
                'https://documentiulia.ro/api/banking/callback',
            sandboxMode: this.configService.get(`${prefix}_SANDBOX`) !== 'false',
        };
    }
    getSupportedBanks() {
        return [
            {
                code: 'BCR',
                name: 'Banca Comercială Română',
                logo: '/images/banks/bcr.png',
                features: ['AIS', 'PIS', 'Bulk Payments'],
            },
            {
                code: 'BRD',
                name: 'BRD - Groupe Société Générale',
                logo: '/images/banks/brd.png',
                features: ['AIS', 'PIS'],
            },
            {
                code: 'RAIFFEISEN',
                name: 'Raiffeisen Bank',
                logo: '/images/banks/raiffeisen.png',
                features: ['AIS', 'PIS', 'Standing Orders'],
            },
            {
                code: 'ING',
                name: 'ING Bank',
                logo: '/images/banks/ing.png',
                features: ['AIS', 'PIS'],
            },
        ];
    }
};
exports.BankingService = BankingService;
exports.BankingService = BankingService = BankingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], BankingService);
//# sourceMappingURL=banking.service.js.map