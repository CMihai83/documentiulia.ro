import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

// e-Factura Service - ANAF SPV Integration
// B2B mandatory mid-2026

interface EfacturaInvoice {
  invoiceNumber: string;
  invoiceDate: string;
  supplier: {
    cui: string;
    name: string;
    address: string;
  };
  customer: {
    cui: string;
    name: string;
    address: string;
  };
  lines: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    total: number;
  }>;
  totals: {
    net: number;
    vat: number;
    gross: number;
  };
}

@Injectable()
export class EfacturaService {
  private readonly logger = new Logger(EfacturaService.name);
  private client: AxiosInstance;

  constructor(private configService: ConfigService) {
    this.client = axios.create({
      baseURL: this.configService.get('ANAF_EFACTURA_URL') || 'https://api.anaf.ro/efactura',
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  }

  // Generate UBL 2.1 XML for e-Factura
  generateUBL(invoice: EfacturaInvoice): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1</cbc:CustomizationID>
  <cbc:ID>${invoice.invoiceNumber}</cbc:ID>
  <cbc:IssueDate>${invoice.invoiceDate}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>RON</cbc:DocumentCurrencyCode>

  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${invoice.supplier.name}</cbc:Name>
      </cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>RO${invoice.supplier.cui}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${invoice.customer.name}</cbc:Name>
      </cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>RO${invoice.customer.cui}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="RON">${invoice.totals.vat.toFixed(2)}</cbc:TaxAmount>
  </cac:TaxTotal>

  <cac:LegalMonetaryTotal>
    <cbc:TaxExclusiveAmount currencyID="RON">${invoice.totals.net.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="RON">${invoice.totals.gross.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="RON">${invoice.totals.gross.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  ${invoice.lines
    .map(
      (line, i) => `
  <cac:InvoiceLine>
    <cbc:ID>${i + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="C62">${line.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="RON">${line.total.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${line.description}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${line.vatRate}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="RON">${line.unitPrice.toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`,
    )
    .join('')}
</Invoice>`;
  }

  // Submit to ANAF SPV
  async submitToSPV(xml: string, cui: string): Promise<{ uploadIndex: string; status: string }> {
    try {
      const response = await this.client.post(
        '/upload',
        xml,
        {
          params: { cif: cui },
          headers: {
            'Content-Type': 'application/xml',
            Authorization: `Bearer ${this.configService.get('ANAF_API_KEY')}`,
          },
        },
      );

      this.logger.log(`e-Factura submitted to SPV: ${response.data.uploadIndex}`);
      return {
        uploadIndex: response.data.uploadIndex,
        status: 'submitted',
      };
    } catch (error) {
      this.logger.error('Failed to submit e-Factura to SPV', error);
      throw error;
    }
  }

  // Check submission status
  async checkStatus(uploadIndex: string): Promise<{ status: string; messages: string[] }> {
    try {
      const response = await this.client.get(`/status/${uploadIndex}`, {
        headers: {
          Authorization: `Bearer ${this.configService.get('ANAF_API_KEY')}`,
        },
      });

      return {
        status: response.data.stare,
        messages: response.data.mesaje || [],
      };
    } catch (error) {
      this.logger.error('Failed to check e-Factura status', error);
      throw error;
    }
  }

  // Download received invoices
  async downloadReceived(cui: string, days: number = 60): Promise<any[]> {
    try {
      const response = await this.client.get('/download', {
        params: { cif: cui, zile: days },
        headers: {
          Authorization: `Bearer ${this.configService.get('ANAF_API_KEY')}`,
        },
      });

      return response.data.facturi || [];
    } catch (error) {
      this.logger.error('Failed to download received invoices', error);
      throw error;
    }
  }
}
