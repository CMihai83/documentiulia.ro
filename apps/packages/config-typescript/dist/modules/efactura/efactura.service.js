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
exports.EfacturaService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
let EfacturaService = class EfacturaService {
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
    async getConfig(companyId, userId) {
        await this.checkCompanyAccess(companyId, userId);
        let config = await this.prisma.efacturaConfig.findUnique({
            where: { companyId },
        });
        if (!config) {
            config = await this.prisma.efacturaConfig.create({
                data: {
                    companyId,
                    isEnabled: false,
                    autoUpload: false,
                    autoDownload: false,
                },
            });
        }
        return {
            ...config,
            certificatePassword: config.certificatePassword ? '********' : null,
        };
    }
    async updateConfig(companyId, dto, userId) {
        await this.checkCompanyAccess(companyId, userId);
        return this.prisma.efacturaConfig.upsert({
            where: { companyId },
            update: dto,
            create: {
                companyId,
                ...dto,
                isEnabled: dto.isEnabled ?? false,
                autoUpload: dto.autoUpload ?? false,
                autoDownload: dto.autoDownload ?? false,
            },
        });
    }
    async generateXml(companyId, invoiceId, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const invoice = await this.prisma.invoice.findFirst({
            where: { id: invoiceId, companyId },
            include: {
                company: true,
                client: true,
                items: {
                    include: { product: true },
                },
            },
        });
        if (!invoice) {
            throw new common_1.NotFoundException('Invoice not found');
        }
        const ublData = {
            invoiceNumber: invoice.invoiceNumber,
            issueDate: invoice.issueDate.toISOString().split('T')[0],
            dueDate: invoice.dueDate.toISOString().split('T')[0],
            currencyCode: invoice.currency,
            supplier: {
                name: invoice.company.name,
                cui: invoice.company.cui,
                regCom: invoice.company.regCom || '',
                address: invoice.company.address || '',
                city: invoice.company.city || '',
                county: invoice.company.county || '',
                country: invoice.company.country || 'RO',
                postalCode: invoice.company.postalCode || '',
            },
            customer: {
                name: invoice.client.name,
                cui: invoice.client.cui || '',
                regCom: invoice.client.regCom || undefined,
                address: invoice.client.address || '',
                city: invoice.client.city || '',
                county: invoice.client.county || undefined,
                country: invoice.client.country || 'RO',
                postalCode: invoice.client.postalCode || undefined,
            },
            lines: invoice.items.map((item, index) => ({
                lineNumber: index + 1,
                description: item.description,
                quantity: Number(item.quantity),
                unit: item.unit,
                unitPrice: Number(item.unitPrice),
                vatRate: Number(item.vatRate),
                lineTotal: Number(item.subtotal),
                vatAmount: Number(item.vatAmount),
            })),
            totals: {
                subtotal: Number(invoice.subtotal),
                vatAmount: Number(invoice.vatAmount),
                total: Number(invoice.total),
            },
        };
        return this.generateUblXml(ublData);
    }
    generateUblXml(data) {
        const escapeXml = (str) => str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
        const lines = data.lines.map(line => `
    <cac:InvoiceLine>
      <cbc:ID>${line.lineNumber}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="${escapeXml(line.unit)}">${line.quantity}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="${data.currencyCode}">${line.lineTotal.toFixed(2)}</cbc:LineExtensionAmount>
      <cac:Item>
        <cbc:Description>${escapeXml(line.description)}</cbc:Description>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="${data.currencyCode}">${line.unitPrice.toFixed(2)}</cbc:PriceAmount>
      </cac:Price>
      <cac:TaxTotal>
        <cbc:TaxAmount currencyID="${data.currencyCode}">${line.vatAmount.toFixed(2)}</cbc:TaxAmount>
        <cac:TaxSubtotal>
          <cbc:TaxableAmount currencyID="${data.currencyCode}">${line.lineTotal.toFixed(2)}</cbc:TaxableAmount>
          <cbc:TaxAmount currencyID="${data.currencyCode}">${line.vatAmount.toFixed(2)}</cbc:TaxAmount>
          <cac:TaxCategory>
            <cbc:ID>S</cbc:ID>
            <cbc:Percent>${line.vatRate}</cbc:Percent>
            <cac:TaxScheme>
              <cbc:ID>VAT</cbc:ID>
            </cac:TaxScheme>
          </cac:TaxCategory>
        </cac:TaxSubtotal>
      </cac:TaxTotal>
    </cac:InvoiceLine>`).join('');
        return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1</cbc:CustomizationID>
  <cbc:ID>${escapeXml(data.invoiceNumber)}</cbc:ID>
  <cbc:IssueDate>${data.issueDate}</cbc:IssueDate>
  <cbc:DueDate>${data.dueDate}</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${data.currencyCode}</cbc:DocumentCurrencyCode>

  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${escapeXml(data.supplier.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(data.supplier.address)}</cbc:StreetName>
        <cbc:CityName>${escapeXml(data.supplier.city)}</cbc:CityName>
        <cbc:PostalZone>${escapeXml(data.supplier.postalCode)}</cbc:PostalZone>
        <cbc:CountrySubentity>${escapeXml(data.supplier.county)}</cbc:CountrySubentity>
        <cac:Country>
          <cbc:IdentificationCode>${data.supplier.country}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(data.supplier.cui)}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(data.supplier.name)}</cbc:RegistrationName>
        <cbc:CompanyID>${escapeXml(data.supplier.regCom)}</cbc:CompanyID>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${escapeXml(data.customer.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(data.customer.address)}</cbc:StreetName>
        <cbc:CityName>${escapeXml(data.customer.city)}</cbc:CityName>
        ${data.customer.postalCode ? `<cbc:PostalZone>${escapeXml(data.customer.postalCode)}</cbc:PostalZone>` : ''}
        ${data.customer.county ? `<cbc:CountrySubentity>${escapeXml(data.customer.county)}</cbc:CountrySubentity>` : ''}
        <cac:Country>
          <cbc:IdentificationCode>${data.customer.country}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      ${data.customer.cui ? `
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(data.customer.cui)}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>` : ''}
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(data.customer.name)}</cbc:RegistrationName>
        ${data.customer.regCom ? `<cbc:CompanyID>${escapeXml(data.customer.regCom)}</cbc:CompanyID>` : ''}
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${data.currencyCode}">${data.totals.vatAmount.toFixed(2)}</cbc:TaxAmount>
  </cac:TaxTotal>

  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${data.currencyCode}">${data.totals.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${data.currencyCode}">${data.totals.subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${data.currencyCode}">${data.totals.total.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${data.currencyCode}">${data.totals.total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${lines}
</Invoice>`;
    }
    async sendToAnaf(companyId, invoiceId, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const config = await this.prisma.efacturaConfig.findUnique({
            where: { companyId },
        });
        if (!config?.isEnabled) {
            throw new common_1.BadRequestException('e-Factura is not enabled for this company');
        }
        const invoice = await this.prisma.invoice.findFirst({
            where: { id: invoiceId, companyId },
        });
        if (!invoice) {
            throw new common_1.NotFoundException('Invoice not found');
        }
        if (invoice.status === client_1.InvoiceStatus.DRAFT) {
            throw new common_1.BadRequestException('Cannot send draft invoices to ANAF');
        }
        const xml = await this.generateXml(companyId, invoiceId, userId);
        const uploadId = `ANAF-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        await this.prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                efacturaStatus: client_1.EfacturaStatus.PENDING,
                efacturaUploadId: uploadId,
                efacturaXml: xml,
                efacturaSentAt: new Date(),
            },
        });
        return {
            success: true,
            uploadId,
            message: 'Sent to ANAF',
        };
    }
    async checkAnafStatus(companyId, invoiceId, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const invoice = await this.prisma.invoice.findFirst({
            where: { id: invoiceId, companyId },
            select: {
                id: true,
                efacturaStatus: true,
                efacturaIndexId: true,
                efacturaUploadId: true,
                efacturaSentAt: true,
            },
        });
        if (!invoice) {
            throw new common_1.NotFoundException('Invoice not found');
        }
        if (!invoice.efacturaUploadId) {
            throw new common_1.BadRequestException('Invoice was not sent to ANAF');
        }
        return {
            invoiceId: invoice.id,
            status: invoice.efacturaStatus,
            uploadId: invoice.efacturaUploadId,
            indexId: invoice.efacturaIndexId,
            sentAt: invoice.efacturaSentAt,
        };
    }
    async updateInvoiceEfacturaStatus(companyId, invoiceId, dto, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const invoice = await this.prisma.invoice.findFirst({
            where: { id: invoiceId, companyId },
        });
        if (!invoice) {
            throw new common_1.NotFoundException('Invoice not found');
        }
        return this.prisma.invoice.update({
            where: { id: invoiceId },
            data: dto,
        });
    }
    async getPendingEfactura(companyId, userId) {
        await this.checkCompanyAccess(companyId, userId);
        return this.prisma.invoice.findMany({
            where: {
                companyId,
                efacturaStatus: { in: [client_1.EfacturaStatus.PENDING, client_1.EfacturaStatus.PROCESSING] },
            },
            include: {
                client: { select: { name: true } },
            },
            orderBy: { efacturaSentAt: 'asc' },
        });
    }
    async getFailedEfactura(companyId, userId) {
        await this.checkCompanyAccess(companyId, userId);
        return this.prisma.invoice.findMany({
            where: {
                companyId,
                efacturaStatus: client_1.EfacturaStatus.REJECTED,
            },
            include: {
                client: { select: { name: true } },
            },
            orderBy: { efacturaSentAt: 'desc' },
        });
    }
    async validateForEfactura(companyId, invoiceId, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const invoice = await this.prisma.invoice.findFirst({
            where: { id: invoiceId, companyId },
            include: {
                company: true,
                client: true,
                items: true,
            },
        });
        if (!invoice) {
            throw new common_1.NotFoundException('Invoice not found');
        }
        const errors = [];
        const warnings = [];
        if (!invoice.company.cui)
            errors.push('Company CUI is required');
        if (!invoice.company.regCom)
            warnings.push('Company registry number is recommended');
        if (!invoice.company.address)
            errors.push('Company address is required');
        if (!invoice.company.city)
            errors.push('Company city is required');
        if (!invoice.client.address)
            errors.push('Client address is required');
        if (!invoice.client.city)
            errors.push('Client city is required');
        if (invoice.client.type === client_1.ClientType.BUSINESS && !invoice.client.cui) {
            errors.push('Client CUI is required for business clients');
        }
        if (invoice.items.length === 0) {
            errors.push('Invoice must have at least one item');
        }
        invoice.items.forEach((item, index) => {
            if (!item.description)
                errors.push(`Item ${index + 1}: Description is required`);
            if (Number(item.quantity) <= 0)
                errors.push(`Item ${index + 1}: Quantity must be positive`);
            if (Number(item.unitPrice) < 0)
                errors.push(`Item ${index + 1}: Unit price cannot be negative`);
        });
        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
};
exports.EfacturaService = EfacturaService;
exports.EfacturaService = EfacturaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EfacturaService);
//# sourceMappingURL=efactura.service.js.map