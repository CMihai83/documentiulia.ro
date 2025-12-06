"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SaftD406Service_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaftD406Service = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const xml2js = __importStar(require("xml2js"));
const date_fns_1 = require("date-fns");
let SaftD406Service = SaftD406Service_1 = class SaftD406Service {
    prisma;
    logger = new common_1.Logger(SaftD406Service_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async generateSaftXml(companyId, startDate, endDate, options = {}) {
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
            include: {
                bankAccounts: true,
            },
        });
        if (!company) {
            throw new common_1.NotFoundException('Company not found');
        }
        if (!company.cui) {
            throw new common_1.BadRequestException('Company CUI is required for SAF-T');
        }
        const { includeCustomers = true, includeSuppliers = true, includeProducts = true, includeInvoices = true, includePayments = true, } = options;
        this.logger.log(`Generating SAF-T D406 for ${company.name} (${startDate} - ${endDate})`);
        const saftData = {
            AuditFile: {
                $: {
                    xmlns: 'urn:OECD:StandardAuditFile-Taxation/2.00',
                    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
                },
                Header: await this.buildHeader(company, startDate, endDate),
                MasterFiles: {},
                SourceDocuments: {},
            },
        };
        if (includeCustomers) {
            const customers = await this.getCustomers(companyId, startDate, endDate);
            if (customers.length > 0) {
                saftData.AuditFile.MasterFiles.Customers = { Customer: customers };
            }
        }
        if (includeSuppliers) {
            const suppliers = await this.getSuppliers(companyId, startDate, endDate);
            if (suppliers.length > 0) {
                saftData.AuditFile.MasterFiles.Suppliers = { Supplier: suppliers };
            }
        }
        if (includeProducts) {
            const products = await this.getProducts(companyId);
            if (products.length > 0) {
                saftData.AuditFile.MasterFiles.Products = { Product: products };
            }
        }
        const taxCodes = await this.getTaxTable(companyId);
        if (taxCodes.length > 0) {
            saftData.AuditFile.MasterFiles.TaxTable = { TaxTableEntry: taxCodes };
        }
        if (includeInvoices) {
            const invoices = await this.getInvoices(companyId, startDate, endDate);
            if (invoices.length > 0) {
                saftData.AuditFile.SourceDocuments.SalesInvoices = {
                    NumberOfEntries: invoices.length.toString(),
                    TotalDebit: this.calculateTotalDebit(invoices),
                    TotalCredit: this.calculateTotalCredit(invoices),
                    Invoice: invoices,
                };
            }
        }
        if (includePayments) {
            const payments = await this.getPayments(companyId, startDate, endDate);
            if (payments.length > 0) {
                saftData.AuditFile.SourceDocuments.Payments = {
                    NumberOfEntries: payments.length.toString(),
                    TotalDebit: this.calculatePaymentDebit(payments),
                    TotalCredit: this.calculatePaymentCredit(payments),
                    Payment: payments,
                };
            }
        }
        const builder = new xml2js.Builder({
            xmldec: { version: '1.0', encoding: 'UTF-8' },
            renderOpts: { pretty: true, indent: '  ' },
        });
        return builder.buildObject(saftData);
    }
    async generateMonthlySaft(companyId, year, month) {
        const date = new Date(year, month - 1, 1);
        const startDate = (0, date_fns_1.startOfMonth)(date);
        const endDate = (0, date_fns_1.endOfMonth)(date);
        return this.generateSaftXml(companyId, startDate, endDate);
    }
    async generateQuarterlySaft(companyId, year, quarter) {
        if (quarter < 1 || quarter > 4) {
            throw new common_1.BadRequestException('Quarter must be between 1 and 4');
        }
        const quarterStartMonth = (quarter - 1) * 3;
        const date = new Date(year, quarterStartMonth, 1);
        const startDate = (0, date_fns_1.startOfQuarter)(date);
        const endDate = (0, date_fns_1.endOfQuarter)(date);
        return this.generateSaftXml(companyId, startDate, endDate);
    }
    async buildHeader(company, startDate, endDate) {
        return {
            AuditFileVersion: '2.00',
            AuditFileCountry: 'RO',
            AuditFileDateCreated: (0, date_fns_1.format)(new Date(), 'yyyy-MM-dd'),
            SoftwareCompanyName: 'DocumentIulia',
            SoftwareID: 'documentiulia-accounting',
            SoftwareVersion: '1.0.0',
            Company: {
                RegistrationNumber: company.regCom || '',
                Name: company.name,
                Address: {
                    StreetName: company.address || '',
                    City: company.city || 'București',
                    PostalCode: company.postalCode || '',
                    Region: company.county || '',
                    Country: 'RO',
                },
                Contact: {
                    Telephone: company.phone || '',
                    Email: company.email || '',
                },
                TaxRegistration: {
                    TaxRegistrationNumber: company.cui,
                    TaxType: 'TVA',
                },
                BankAccount: company.bankAccounts?.map((ba) => ({
                    IBANNumber: ba.iban,
                    BankAccountName: ba.name,
                })) || [],
            },
            DefaultCurrencyCode: company.currency || 'RON',
            SelectionCriteria: {
                SelectionStartDate: (0, date_fns_1.format)(startDate, 'yyyy-MM-dd'),
                SelectionEndDate: (0, date_fns_1.format)(endDate, 'yyyy-MM-dd'),
            },
            TaxAccountingBasis: 'A',
            TaxEntity: company.cui,
        };
    }
    async getCustomers(companyId, startDate, endDate) {
        const clients = await this.prisma.client.findMany({
            where: {
                companyId,
                invoices: {
                    some: {
                        issueDate: { gte: startDate, lte: endDate },
                    },
                },
            },
        });
        return clients.map((client) => ({
            CustomerID: client.id,
            AccountID: `CLI-${client.id.slice(-8).toUpperCase()}`,
            CustomerTaxID: client.cui || '',
            CompanyName: client.name,
            BillingAddress: {
                StreetName: client.address || '',
                City: client.city || '',
                PostalCode: client.postalCode || '',
                Region: client.county || '',
                Country: client.country || 'RO',
            },
            Contact: {
                Telephone: client.contactPhone || '',
                Email: client.contactEmail || '',
            },
        }));
    }
    async getSuppliers(companyId, startDate, endDate) {
        const expenses = await this.prisma.expense.findMany({
            where: {
                companyId,
                expenseDate: { gte: startDate, lte: endDate },
                vendorName: { not: null },
            },
            distinct: ['vendorCui'],
        });
        return expenses
            .filter((e) => e.vendorCui)
            .map((expense, index) => ({
            SupplierID: `SUP-${index + 1}`,
            AccountID: `FUR-${expense.vendorCui}`,
            SupplierTaxID: expense.vendorCui || '',
            CompanyName: expense.vendorName || 'Unknown',
            BillingAddress: {
                Country: 'RO',
            },
        }));
    }
    async getProducts(companyId) {
        const products = await this.prisma.product.findMany({
            where: { companyId, isActive: true },
        });
        return products.map((product) => ({
            ProductCode: product.sku || product.id.slice(-8).toUpperCase(),
            ProductGroup: product.type,
            Description: product.name,
            ProductCommodityCode: product.ncCode || '',
            UnitOfMeasure: product.unit,
        }));
    }
    async getTaxTable(companyId) {
        const taxCodes = await this.prisma.taxCode.findMany({
            where: { companyId, isActive: true },
        });
        const defaultTaxCodes = [
            { code: 'S', name: 'TVA Standard 19%', rate: 19 },
            { code: 'R1', name: 'TVA Redus 9%', rate: 9 },
            { code: 'R2', name: 'TVA Redus 5%', rate: 5 },
            { code: 'Z', name: 'TVA Zero', rate: 0 },
            { code: 'E', name: 'Scutit TVA', rate: 0 },
        ];
        const allCodes = taxCodes.length > 0 ? taxCodes : defaultTaxCodes;
        return allCodes.map((tc) => ({
            TaxType: 'TVA',
            TaxCodeDetails: {
                TaxCode: tc.code,
                EffectiveDate: '2024-01-01',
                Description: tc.name,
                TaxPercentage: Number(tc.rate).toFixed(2),
            },
        }));
    }
    async getInvoices(companyId, startDate, endDate) {
        const invoices = await this.prisma.invoice.findMany({
            where: {
                companyId,
                issueDate: { gte: startDate, lte: endDate },
                status: { not: 'DRAFT' },
            },
            include: {
                client: true,
                items: {
                    include: { product: true },
                },
            },
            orderBy: { issueDate: 'asc' },
        });
        return invoices.map((invoice) => ({
            InvoiceNo: invoice.invoiceNumber,
            InvoiceDate: (0, date_fns_1.format)(invoice.issueDate, 'yyyy-MM-dd'),
            InvoiceType: this.mapInvoiceType(invoice.type),
            SourceID: 'documentiulia',
            GLPostingDate: (0, date_fns_1.format)(invoice.issueDate, 'yyyy-MM-dd'),
            CustomerID: invoice.clientId,
            Period: (invoice.issueDate.getMonth() + 1).toString(),
            PeriodYear: invoice.issueDate.getFullYear().toString(),
            Line: invoice.items.map((item, index) => ({
                LineNumber: (index + 1).toString(),
                ProductCode: item.product?.sku || item.productId?.slice(-8) || '',
                ProductDescription: item.description,
                Quantity: Number(item.quantity).toFixed(4),
                UnitOfMeasure: item.unit,
                UnitPrice: Number(item.unitPrice).toFixed(2),
                TaxPointDate: (0, date_fns_1.format)(invoice.issueDate, 'yyyy-MM-dd'),
                Description: item.description,
                CreditAmount: Number(item.subtotal).toFixed(2),
                Tax: {
                    TaxType: 'TVA',
                    TaxCode: this.getTaxCode(Number(item.vatRate)),
                    TaxPercentage: Number(item.vatRate).toFixed(2),
                    TaxBase: Number(item.subtotal).toFixed(2),
                    TaxAmount: Number(item.vatAmount).toFixed(2),
                },
            })),
            DocumentTotals: {
                TaxInformationTotals: this.aggregateTaxTotals(invoice.items),
                NetTotal: Number(invoice.subtotal).toFixed(2),
                GrossTotal: Number(invoice.total).toFixed(2),
            },
            Currency: {
                CurrencyCode: invoice.currency,
                ExchangeRate: Number(invoice.exchangeRate).toFixed(4),
            },
        }));
    }
    async getPayments(companyId, startDate, endDate) {
        const payments = await this.prisma.payment.findMany({
            where: {
                paymentDate: { gte: startDate, lte: endDate },
                invoice: { companyId },
            },
            include: {
                invoice: {
                    include: { client: true },
                },
            },
            orderBy: { paymentDate: 'asc' },
        });
        return payments.map((payment, index) => ({
            PaymentRefNo: `PAY-${(0, date_fns_1.format)(payment.paymentDate, 'yyyyMMdd')}-${index + 1}`,
            TransactionID: payment.id,
            TransactionDate: (0, date_fns_1.format)(payment.paymentDate, 'yyyy-MM-dd'),
            PaymentMethod: this.mapPaymentMethod(payment.method),
            Description: payment.notes || `Plată factură ${payment.invoice.invoiceNumber}`,
            SystemEntryDate: (0, date_fns_1.format)(payment.createdAt, 'yyyy-MM-dd'),
            CustomerID: payment.invoice.clientId,
            Line: [
                {
                    LineNumber: '1',
                    SourceDocumentID: payment.invoice.invoiceNumber,
                    DebitAmount: Number(payment.amount).toFixed(2),
                },
            ],
            DocumentTotals: {
                GrossTotal: Number(payment.amount).toFixed(2),
            },
        }));
    }
    mapInvoiceType(type) {
        const typeMap = {
            STANDARD: 'FT',
            PROFORMA: 'FP',
            STORNO: 'NC',
            AVIZ: 'AV',
        };
        return typeMap[type] || 'FT';
    }
    getTaxCode(rate) {
        if (rate === 19)
            return 'S';
        if (rate === 9)
            return 'R1';
        if (rate === 5)
            return 'R2';
        if (rate === 0)
            return 'Z';
        return 'S';
    }
    mapPaymentMethod(method) {
        const methodMap = {
            cash: 'NU',
            transfer: 'BT',
            card: 'CC',
        };
        return methodMap[method.toLowerCase()] || 'BT';
    }
    aggregateTaxTotals(items) {
        const taxMap = new Map();
        items.forEach((item) => {
            const code = this.getTaxCode(Number(item.vatRate));
            const existing = taxMap.get(code) || { base: 0, amount: 0, rate: Number(item.vatRate) };
            taxMap.set(code, {
                base: existing.base + Number(item.subtotal),
                amount: existing.amount + Number(item.vatAmount),
                rate: existing.rate,
            });
        });
        return Array.from(taxMap.entries()).map(([code, data]) => ({
            TaxType: 'TVA',
            TaxCode: code,
            TaxPercentage: data.rate.toFixed(2),
            TaxBase: data.base.toFixed(2),
            TaxAmount: data.amount.toFixed(2),
        }));
    }
    calculateTotalDebit(invoices) {
        return '0.00';
    }
    calculateTotalCredit(invoices) {
        const total = invoices.reduce((sum, inv) => {
            return sum + parseFloat(inv.DocumentTotals.GrossTotal);
        }, 0);
        return total.toFixed(2);
    }
    calculatePaymentDebit(payments) {
        const total = payments.reduce((sum, pay) => {
            return sum + parseFloat(pay.DocumentTotals.GrossTotal);
        }, 0);
        return total.toFixed(2);
    }
    calculatePaymentCredit(payments) {
        return '0.00';
    }
    async validateSaftXml(xml) {
        const errors = [];
        const warnings = [];
        try {
            const parser = new xml2js.Parser();
            const result = await parser.parseStringPromise(xml);
            if (!result.AuditFile?.Header) {
                errors.push('Missing Header element');
            }
            if (!result.AuditFile?.Header?.[0]?.Company?.[0]?.TaxRegistration) {
                errors.push('Missing Company TaxRegistration');
            }
            if (!result.AuditFile?.MasterFiles?.[0]?.TaxTable) {
                warnings.push('No TaxTable entries found');
            }
            if (!result.AuditFile?.SourceDocuments?.[0]?.SalesInvoices &&
                !result.AuditFile?.SourceDocuments?.[0]?.Payments) {
                warnings.push('No source documents found in the period');
            }
            return {
                valid: errors.length === 0,
                errors,
                warnings,
            };
        }
        catch (error) {
            return {
                valid: false,
                errors: [`Invalid XML structure: ${error.message}`],
                warnings,
            };
        }
    }
};
exports.SaftD406Service = SaftD406Service;
exports.SaftD406Service = SaftD406Service = SaftD406Service_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SaftD406Service);
//# sourceMappingURL=saft-d406.service.js.map