import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateEfacturaConfigDto, UpdateInvoiceEfacturaDto } from './dto/efactura.dto';
import { EfacturaStatus, InvoiceStatus, ClientType } from '@prisma/client';

// UBL 2.1 Invoice structure for e-Factura
interface UblInvoice {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currencyCode: string;
  supplier: {
    name: string;
    cui: string;
    regCom: string;
    address: string;
    city: string;
    county: string;
    country: string;
    postalCode: string;
  };
  customer: {
    name: string;
    cui: string;
    regCom?: string;
    address: string;
    city: string;
    county?: string;
    country: string;
    postalCode?: string;
  };
  lines: Array<{
    lineNumber: number;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    vatRate: number;
    lineTotal: number;
    vatAmount: number;
  }>;
  totals: {
    subtotal: number;
    vatAmount: number;
    total: number;
  };
}

@Injectable()
export class EfacturaService {
  constructor(private prisma: PrismaService) {}

  private async checkCompanyAccess(companyId: string, userId: string) {
    const membership = await this.prisma.companyUser.findFirst({
      where: { companyId, userId },
    });
    if (!membership) {
      throw new ForbiddenException('No access to this company');
    }
    return membership;
  }

  // Configuration
  async getConfig(companyId: string, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    let config = await this.prisma.efacturaConfig.findUnique({
      where: { companyId },
    });

    if (!config) {
      // Create default config
      config = await this.prisma.efacturaConfig.create({
        data: {
          companyId,
          isEnabled: false,
          autoUpload: false,
          autoDownload: false,
        },
      });
    }

    // Don't expose sensitive data
    return {
      ...config,
      certificatePassword: config.certificatePassword ? '********' : null,
    };
  }

  async updateConfig(companyId: string, dto: UpdateEfacturaConfigDto, userId: string) {
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

  // Generate UBL XML
  async generateXml(companyId: string, invoiceId: string, userId: string): Promise<string> {
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
      throw new NotFoundException('Invoice not found');
    }

    // Build UBL structure
    const ublData: UblInvoice = {
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

    // Generate UBL 2.1 XML
    return this.generateUblXml(ublData);
  }

  private generateUblXml(data: UblInvoice): string {
    const escapeXml = (str: string) =>
      str.replace(/&/g, '&amp;')
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

  // Send to ANAF
  async sendToAnaf(companyId: string, invoiceId: string, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    const config = await this.prisma.efacturaConfig.findUnique({
      where: { companyId },
    });

    if (!config?.isEnabled) {
      throw new BadRequestException('e-Factura is not enabled for this company');
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, companyId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status === InvoiceStatus.DRAFT) {
      throw new BadRequestException('Cannot send draft invoices to ANAF');
    }

    // Generate XML
    const xml = await this.generateXml(companyId, invoiceId, userId);

    // TODO: Implement actual ANAF API call
    // For now, simulate the process
    const uploadId = `ANAF-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Update invoice status
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        efacturaStatus: EfacturaStatus.PENDING,
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

  // Check status from ANAF
  async checkAnafStatus(companyId: string, invoiceId: string, userId: string) {
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
      throw new NotFoundException('Invoice not found');
    }

    if (!invoice.efacturaUploadId) {
      throw new BadRequestException('Invoice was not sent to ANAF');
    }

    // TODO: Implement actual ANAF status check
    // For now, return current status

    return {
      invoiceId: invoice.id,
      status: invoice.efacturaStatus,
      uploadId: invoice.efacturaUploadId,
      indexId: invoice.efacturaIndexId,
      sentAt: invoice.efacturaSentAt,
    };
  }

  // Update e-Factura status (for webhook/polling results)
  async updateInvoiceEfacturaStatus(companyId: string, invoiceId: string, dto: UpdateInvoiceEfacturaDto, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, companyId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: dto,
    });
  }

  // Get pending e-Factura invoices
  async getPendingEfactura(companyId: string, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    return this.prisma.invoice.findMany({
      where: {
        companyId,
        efacturaStatus: { in: [EfacturaStatus.PENDING, EfacturaStatus.PROCESSING] },
      },
      include: {
        client: { select: { name: true } },
      },
      orderBy: { efacturaSentAt: 'asc' },
    });
  }

  // Get failed e-Factura invoices
  async getFailedEfactura(companyId: string, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    return this.prisma.invoice.findMany({
      where: {
        companyId,
        efacturaStatus: EfacturaStatus.REJECTED,
      },
      include: {
        client: { select: { name: true } },
      },
      orderBy: { efacturaSentAt: 'desc' },
    });
  }

  // Get e-Factura status summary
  async getStatusSummary(companyId: string) {
    const statuses = await this.prisma.invoice.groupBy({
      by: ['efacturaStatus'],
      where: { companyId },
      _count: true,
    });

    const summary = {
      pending: 0,
      processing: 0,
      accepted: 0,
      rejected: 0,
      notSent: 0,
    };

    statuses.forEach((s) => {
      const status = s.efacturaStatus;
      if (status === EfacturaStatus.PENDING) summary.pending = s._count;
      else if (status === EfacturaStatus.PROCESSING) summary.processing = s._count;
      else if (status === EfacturaStatus.VALIDATED) summary.accepted = s._count;
      else if (status === EfacturaStatus.REJECTED) summary.rejected = s._count;
      else if (!status) summary.notSent = s._count;
    });

    return summary;
  }

  // Get e-Factura submission history
  async getHistory(companyId: string) {
    return this.prisma.invoice.findMany({
      where: {
        companyId,
        efacturaStatus: { not: null },
      },
      select: {
        id: true,
        invoiceNumber: true,
        efacturaStatus: true,
        efacturaUploadId: true,
        efacturaIndexId: true,
        efacturaSentAt: true,
        total: true,
        currency: true,
        client: {
          select: { name: true },
        },
      },
      orderBy: { efacturaSentAt: 'desc' },
      take: 50,
    });
  }

  // Validate invoice for e-Factura
  async validateForEfactura(companyId: string, invoiceId: string, userId: string) {
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
      throw new NotFoundException('Invoice not found');
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate company data
    if (!invoice.company.cui) errors.push('Company CUI is required');
    if (!invoice.company.regCom) warnings.push('Company registry number is recommended');
    if (!invoice.company.address) errors.push('Company address is required');
    if (!invoice.company.city) errors.push('Company city is required');

    // Validate client data
    if (!invoice.client.address) errors.push('Client address is required');
    if (!invoice.client.city) errors.push('Client city is required');
    if (invoice.client.type === ClientType.BUSINESS && !invoice.client.cui) {
      errors.push('Client CUI is required for business clients');
    }

    // Validate invoice items
    if (invoice.items.length === 0) {
      errors.push('Invoice must have at least one item');
    }

    invoice.items.forEach((item, index) => {
      if (!item.description) errors.push(`Item ${index + 1}: Description is required`);
      if (Number(item.quantity) <= 0) errors.push(`Item ${index + 1}: Quantity must be positive`);
      if (Number(item.unitPrice) < 0) errors.push(`Item ${index + 1}: Unit price cannot be negative`);
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
