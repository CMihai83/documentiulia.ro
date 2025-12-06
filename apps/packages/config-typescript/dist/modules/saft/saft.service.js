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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaftService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const xml2js = require('xml2js');
let SaftService = class SaftService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async checkCompanyAccess(companyId, userId) {
        const membership = await this.prisma.companyUser.findFirst({
            where: { companyId, userId },
        });
        if (!membership) {
            throw new common_1.ForbiddenException('No access to this company');
        }
        return membership;
    }
    async generateSaftXml(companyId, dto, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);
        if (startDate > endDate) {
            throw new common_1.BadRequestException('Start date must be before end date');
        }
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
        });
        if (!company) {
            throw new common_1.NotFoundException('Company not found');
        }
        const [invoices, clients, products] = await Promise.all([
            this.fetchInvoices(companyId, startDate, endDate),
            this.fetchClients(companyId),
            this.fetchProducts(companyId),
        ]);
        const saftData = this.buildSaftStructure(company, invoices, clients, products, startDate, endDate);
        const builder = new xml2js.Builder({
            xmldec: { version: '1.0', encoding: 'UTF-8' },
            renderOpts: { pretty: true, indent: '  ', newline: '\n' },
        });
        return builder.buildObject(saftData);
    }
    async validateSaftData(companyId, dto, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);
        const errors = [];
        const warnings = [];
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
        });
        if (!company) {
            errors.push('Company not found');
            return {
                isValid: false,
                errors,
                warnings,
                summary: {
                    totalInvoices: 0,
                    totalVatAmount: 0,
                    totalAmount: 0,
                    period: `${dto.startDate} - ${dto.endDate}`,
                },
            };
        }
        if (!company.cui) {
            errors.push('Company CUI is required for SAF-T export');
        }
        if (!company.name) {
            errors.push('Company name is required');
        }
        if (!company.address) {
            warnings.push('Company address is recommended');
        }
        const invoices = await this.fetchInvoices(companyId, startDate, endDate);
        let totalVatAmount = 0;
        let totalAmount = 0;
        for (const invoice of invoices) {
            totalVatAmount += Number(invoice.vatAmount) || 0;
            totalAmount += Number(invoice.total) || 0;
            if (!invoice.invoiceNumber) {
                errors.push(`Invoice ${invoice.id} missing invoice number`);
            }
            if (!invoice.client) {
                errors.push(`Invoice ${invoice.invoiceNumber} missing client data`);
            }
            if (invoice.items.length === 0) {
                warnings.push(`Invoice ${invoice.invoiceNumber} has no line items`);
            }
        }
        const clients = await this.fetchClients(companyId);
        for (const client of clients) {
            if (client.type === 'BUSINESS' && !client.cui) {
                warnings.push(`Client ${client.name} is business type but has no CUI`);
            }
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            summary: {
                totalInvoices: invoices.length,
                totalVatAmount,
                totalAmount,
                period: `${dto.startDate} - ${dto.endDate}`,
            },
        };
    }
    async fetchInvoices(companyId, startDate, endDate) {
        return this.prisma.invoice.findMany({
            where: {
                companyId,
                issueDate: {
                    gte: startDate,
                    lte: endDate,
                },
                status: { not: 'DRAFT' },
            },
            include: {
                client: true,
                items: {
                    include: {
                        product: true,
                    },
                },
            },
            orderBy: { issueDate: 'asc' },
        });
    }
    async fetchClients(companyId) {
        return this.prisma.client.findMany({
            where: { companyId },
        });
    }
    async fetchProducts(companyId) {
        return this.prisma.product.findMany({
            where: { companyId, isActive: true },
        });
    }
    buildSaftStructure(company, invoices, clients, products, startDate, endDate) {
        const now = new Date();
        return {
            'n1:AuditFile': {
                $: {
                    'xmlns:n1': 'urn:OECD:StandardAuditFile-Taxation/2.00',
                    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
                },
                'n1:Header': {
                    'n1:AuditFileVersion': 'D406_RO_V1.00',
                    'n1:AuditFileCountry': 'RO',
                    'n1:AuditFileDateCreated': now.toISOString().split('T')[0],
                    'n1:SoftwareCompanyName': 'DocumentIulia',
                    'n1:SoftwareID': 'DocumentIulia ERP',
                    'n1:SoftwareVersion': '2.0.0',
                    'n1:Company': {
                        'n1:RegistrationNumber': company.cui,
                        'n1:Name': company.name,
                        'n1:Address': {
                            'n1:StreetName': company.address || '',
                            'n1:City': company.city || '',
                            'n1:PostalCode': company.postalCode || '',
                            'n1:Country': company.country || 'RO',
                        },
                        'n1:Contact': {
                            'n1:Telephone': company.phone || '',
                            'n1:Email': company.email || '',
                        },
                        'n1:BankAccount': company.iban ? {
                            'n1:BankAccountNumber': company.iban,
                            'n1:BankAccountName': company.bankName || '',
                        } : undefined,
                        'n1:TaxRegistration': {
                            'n1:TaxRegistrationNumber': company.vatNumber || company.cui,
                            'n1:TaxType': 'TVA',
                        },
                    },
                    'n1:SelectionCriteria': {
                        'n1:SelectionStartDate': startDate.toISOString().split('T')[0],
                        'n1:SelectionEndDate': endDate.toISOString().split('T')[0],
                    },
                },
                'n1:MasterFiles': {
                    'n1:Customers': {
                        'n1:Customer': clients.map((client, index) => ({
                            'n1:CustomerID': client.id,
                            'n1:AccountID': `411.${String(index + 1).padStart(4, '0')}`,
                            'n1:CustomerTaxID': client.cui || '',
                            'n1:CompanyName': client.name,
                            'n1:Contact': client.contactName || '',
                            'n1:BillingAddress': {
                                'n1:StreetName': client.address || '',
                                'n1:City': client.city || '',
                                'n1:PostalCode': client.postalCode || '',
                                'n1:Country': client.country || 'RO',
                            },
                            'n1:Telephone': client.contactPhone || '',
                            'n1:Email': client.contactEmail || '',
                        })),
                    },
                    'n1:Products': {
                        'n1:Product': products.map(product => ({
                            'n1:ProductCode': product.sku || product.id,
                            'n1:ProductDescription': product.name,
                            'n1:ProductGroup': product.type,
                            'n1:ProductCommodityCode': product.ncCode || '',
                            'n1:UnitOfMeasure': product.unit,
                            'n1:ValuationMethod': 'FIFO',
                        })),
                    },
                    'n1:TaxTable': {
                        'n1:TaxTableEntry': [
                            {
                                'n1:TaxType': 'TVA',
                                'n1:TaxCode': 'TVA19',
                                'n1:Description': 'TVA 19% standard',
                                'n1:TaxPercentage': '19.00',
                            },
                            {
                                'n1:TaxType': 'TVA',
                                'n1:TaxCode': 'TVA9',
                                'n1:Description': 'TVA 9% redus',
                                'n1:TaxPercentage': '9.00',
                            },
                            {
                                'n1:TaxType': 'TVA',
                                'n1:TaxCode': 'TVA5',
                                'n1:Description': 'TVA 5% super-redus',
                                'n1:TaxPercentage': '5.00',
                            },
                            {
                                'n1:TaxType': 'TVA',
                                'n1:TaxCode': 'TVA0',
                                'n1:Description': 'TVA 0% scutit',
                                'n1:TaxPercentage': '0.00',
                            },
                        ],
                    },
                },
                'n1:SourceDocuments': {
                    'n1:SalesInvoices': {
                        'n1:NumberOfEntries': invoices.length.toString(),
                        'n1:TotalDebit': '0.00',
                        'n1:TotalCredit': invoices
                            .reduce((sum, inv) => sum + Number(inv.total), 0)
                            .toFixed(2),
                        'n1:Invoice': invoices.map(invoice => this.buildInvoiceEntry(invoice)),
                    },
                },
            },
        };
    }
    buildInvoiceEntry(invoice) {
        return {
            'n1:InvoiceNo': invoice.invoiceNumber,
            'n1:CustomerInfo': {
                'n1:CustomerID': invoice.clientId,
                'n1:BillingAddress': {
                    'n1:StreetName': invoice.client?.address || '',
                    'n1:City': invoice.client?.city || '',
                    'n1:PostalCode': invoice.client?.postalCode || '',
                    'n1:Country': invoice.client?.country || 'RO',
                },
            },
            'n1:Period': new Date(invoice.issueDate).getMonth() + 1,
            'n1:InvoiceDate': new Date(invoice.issueDate).toISOString().split('T')[0],
            'n1:InvoiceType': this.mapInvoiceType(invoice.type),
            'n1:SpecialRegimes': invoice.type === 'STORNO' ? 'STORNO' : undefined,
            'n1:DocumentTotals': {
                'n1:TaxPayable': Number(invoice.vatAmount).toFixed(2),
                'n1:NetTotal': Number(invoice.subtotal).toFixed(2),
                'n1:GrossTotal': Number(invoice.total).toFixed(2),
                'n1:Currency': {
                    'n1:CurrencyCode': invoice.currency || 'RON',
                    'n1:CurrencyAmount': Number(invoice.total).toFixed(2),
                    'n1:ExchangeRate': Number(invoice.exchangeRate || 1).toFixed(4),
                },
                'n1:Payment': {
                    'n1:PaymentMechanism': this.mapPaymentMethod(invoice.paymentMethod),
                    'n1:PaymentAmount': Number(invoice.paidAmount || 0).toFixed(2),
                    'n1:PaymentDate': invoice.paidAt
                        ? new Date(invoice.paidAt).toISOString().split('T')[0]
                        : undefined,
                },
            },
            'n1:Line': invoice.items.map((item, index) => this.buildInvoiceLine(item, index + 1)),
        };
    }
    buildInvoiceLine(item, lineNumber) {
        const vatRate = Number(item.vatRate);
        const taxCode = vatRate >= 19 ? 'TVA19' : vatRate >= 9 ? 'TVA9' : vatRate >= 5 ? 'TVA5' : 'TVA0';
        return {
            'n1:LineNumber': lineNumber.toString(),
            'n1:ProductCode': item.product?.sku || item.productId || '',
            'n1:ProductDescription': item.description,
            'n1:Quantity': Number(item.quantity).toFixed(4),
            'n1:UnitOfMeasure': item.unit || 'buc',
            'n1:UnitPrice': Number(item.unitPrice).toFixed(2),
            'n1:TaxPointDate': new Date().toISOString().split('T')[0],
            'n1:Description': item.description,
            'n1:InvoiceUOM': item.unit || 'buc',
            'n1:InvoiceUOMQuantity': Number(item.quantity).toFixed(4),
            'n1:DebitAmount': Number(item.subtotal).toFixed(2),
            'n1:Tax': {
                'n1:TaxType': 'TVA',
                'n1:TaxCode': taxCode,
                'n1:TaxPercentage': vatRate.toFixed(2),
                'n1:TaxAmount': Number(item.vatAmount).toFixed(2),
            },
        };
    }
    mapInvoiceType(type) {
        switch (type) {
            case 'STANDARD':
                return 'FT';
            case 'PROFORMA':
                return 'FP';
            case 'STORNO':
                return 'NC';
            case 'AVIZ':
                return 'VD';
            default:
                return 'FT';
        }
    }
    mapPaymentMethod(method) {
        switch (method?.toLowerCase()) {
            case 'cash':
                return 'NU';
            case 'card':
                return 'CC';
            case 'transfer':
                return 'TB';
            default:
                return 'NU';
        }
    }
    async getExportHistory(companyId, userId) {
        await this.checkCompanyAccess(companyId, userId);
        return [];
    }
};
exports.SaftService = SaftService;
exports.SaftService = SaftService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SaftService);
//# sourceMappingURL=saft.service.js.map