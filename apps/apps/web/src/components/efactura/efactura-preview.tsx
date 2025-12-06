"use client";

import { useState } from "react";
import {
  FileText,
  Download,
  Printer,
  Send,
  CheckCircle,
  AlertTriangle,
  Building2,
  MapPin,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Package,
  Percent,
  DollarSign,
  FileCode,
  Eye,
  Copy,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface InvoiceParty {
  name: string;
  cui: string;
  regCom?: string;
  address: string;
  city: string;
  county: string;
  country: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  iban?: string;
  bank?: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
  discount?: number;
  subtotal: number;
  vatAmount: number;
  total: number;
}

interface EFacturaData {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  issuer: InvoiceParty;
  recipient: InvoiceParty;
  items: InvoiceItem[];
  subtotal: number;
  totalVat: number;
  totalDiscount: number;
  grandTotal: number;
  paymentTerms?: string;
  notes?: string;
  xmlContent?: string;
}

// Mock data for demonstration
const mockInvoice: EFacturaData = {
  id: "inv-001",
  invoiceNumber: "DF-2024-001234",
  invoiceDate: "2024-12-01",
  dueDate: "2024-12-31",
  currency: "RON",
  issuer: {
    name: "SC DocumentIulia SRL",
    cui: "RO12345678",
    regCom: "J40/1234/2020",
    address: "Str. Contabilității nr. 10, Sector 1",
    city: "București",
    county: "București",
    country: "RO",
    postalCode: "010101",
    phone: "+40 21 123 4567",
    email: "contact@documentiulia.ro",
    iban: "RO49BTRLRONCRT0123456789",
    bank: "Banca Transilvania",
  },
  recipient: {
    name: "SC Client Important SRL",
    cui: "RO87654321",
    regCom: "J40/5678/2019",
    address: "Bd. Unirii nr. 50, Bl. A1",
    city: "București",
    county: "București",
    country: "RO",
    postalCode: "030167",
    phone: "+40 21 987 6543",
    email: "office@clientimportant.ro",
  },
  items: [
    {
      id: "1",
      description: "Servicii contabilitate lunară - Decembrie 2024",
      quantity: 1,
      unit: "buc",
      unitPrice: 2500,
      vatRate: 19,
      subtotal: 2500,
      vatAmount: 475,
      total: 2975,
    },
    {
      id: "2",
      description: "Consultanță fiscală",
      quantity: 4,
      unit: "ore",
      unitPrice: 350,
      vatRate: 19,
      subtotal: 1400,
      vatAmount: 266,
      total: 1666,
    },
    {
      id: "3",
      description: "Întocmire declarații fiscale D100, D112",
      quantity: 1,
      unit: "set",
      unitPrice: 500,
      vatRate: 19,
      subtotal: 500,
      vatAmount: 95,
      total: 595,
    },
    {
      id: "4",
      description: "Procesare documente contabile (250 documente)",
      quantity: 250,
      unit: "doc",
      unitPrice: 5,
      vatRate: 19,
      subtotal: 1250,
      vatAmount: 237.5,
      total: 1487.5,
    },
  ],
  subtotal: 5650,
  totalVat: 1073.5,
  totalDiscount: 0,
  grandTotal: 6723.5,
  paymentTerms: "30 zile de la emitere",
  notes: "Vă mulțumim pentru colaborare!",
};

interface EFacturaPreviewProps {
  invoice?: EFacturaData;
  onSend?: () => void;
  onDownloadXml?: () => void;
  onDownloadPdf?: () => void;
  onPrint?: () => void;
  onClose?: () => void;
  className?: string;
}

export function EFacturaPreview({
  invoice = mockInvoice,
  onSend,
  onDownloadXml,
  onDownloadPdf,
  onPrint,
  onClose,
  className = "",
}: EFacturaPreviewProps) {
  const [showXml, setShowXml] = useState(false);
  const [copiedIban, setCopiedIban] = useState(false);
  const [showValidation, setShowValidation] = useState(true);

  // Validation checks
  const validations = [
    {
      id: "cui-issuer",
      label: "CUI emitent valid",
      valid: /^RO?\d{2,10}$/.test(invoice.issuer.cui.replace(/\s/g, "")),
    },
    {
      id: "cui-recipient",
      label: "CUI destinatar valid",
      valid: /^RO?\d{2,10}$/.test(invoice.recipient.cui.replace(/\s/g, "")),
    },
    {
      id: "items",
      label: "Minim o linie de factură",
      valid: invoice.items.length > 0,
    },
    {
      id: "totals",
      label: "Totaluri calculate corect",
      valid: Math.abs(invoice.subtotal + invoice.totalVat - invoice.grandTotal) < 0.01,
    },
    {
      id: "iban",
      label: "IBAN emitent prezent",
      valid: !!invoice.issuer.iban,
    },
    {
      id: "dates",
      label: "Date valide",
      valid: new Date(invoice.invoiceDate) <= new Date(invoice.dueDate),
    },
  ];

  const allValid = validations.every((v) => v.valid);

  const handleCopyIban = async () => {
    if (invoice.issuer.iban) {
      await navigator.clipboard.writeText(invoice.issuer.iban.replace(/\s/g, ""));
      setCopiedIban(true);
      setTimeout(() => setCopiedIban(false), 2000);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  // Generate mock XML preview
  const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1</cbc:CustomizationID>
  <cbc:ID>${invoice.invoiceNumber}</cbc:ID>
  <cbc:IssueDate>${invoice.invoiceDate}</cbc:IssueDate>
  <cbc:DueDate>${invoice.dueDate}</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${invoice.currency}</cbc:DocumentCurrencyCode>

  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${invoice.issuer.name}</cbc:Name>
      </cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${invoice.issuer.cui}</cbc:CompanyID>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${invoice.recipient.name}</cbc:Name>
      </cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${invoice.recipient.cui}</cbc:CompanyID>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${invoice.currency}">${invoice.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${invoice.currency}">${invoice.subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${invoice.currency}">${invoice.grandTotal.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${invoice.currency}">${invoice.grandTotal.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  <!-- Invoice Lines -->
${invoice.items
  .map(
    (item, index) => `  <cac:InvoiceLine>
    <cbc:ID>${index + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${item.unit}">${item.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${invoice.currency}">${item.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Description>${item.description}</cbc:Description>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${invoice.currency}">${item.unitPrice.toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`
  )
  .join("\n")}
</Invoice>`;

  return (
    <div className={`bg-white rounded-xl shadow-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">E-Factura Preview</h2>
              <p className="text-blue-100 text-sm">{invoice.invoiceNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowXml(!showXml)}
              className={`p-2 rounded-lg transition ${
                showXml ? "bg-white text-blue-600" : "bg-blue-500 text-white hover:bg-blue-400"
              }`}
              title="Vizualizare XML"
            >
              <FileCode className="w-5 h-5" />
            </button>
            <button
              onClick={onDownloadXml}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition"
              title="Descarcă XML"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={onPrint}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition"
              title="Printează"
            >
              <Printer className="w-5 h-5" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Validation Panel */}
      <div className={`border-b ${allValid ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
        <button
          onClick={() => setShowValidation(!showValidation)}
          className="w-full px-6 py-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            {allValid ? (
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            )}
            <span className={`font-medium ${allValid ? "text-emerald-700" : "text-amber-700"}`}>
              {allValid ? "Validare completă - Gata pentru trimitere" : "Atenție - Verificați erorile"}
            </span>
          </div>
          {showValidation ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {showValidation && (
          <div className="px-6 pb-4 grid grid-cols-2 md:grid-cols-3 gap-2">
            {validations.map((v) => (
              <div
                key={v.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                  v.valid ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                }`}
              >
                {v.valid ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                <span className="text-sm">{v.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* XML View */}
      {showXml && (
        <div className="border-b border-slate-200 bg-slate-900 p-4 max-h-80 overflow-auto">
          <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">{mockXml}</pre>
        </div>
      )}

      {/* Invoice Content */}
      <div className="p-6 space-y-6">
        {/* Parties */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Issuer */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Furnizor</h3>
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900">{invoice.issuer.name}</p>
                  <p className="text-sm text-slate-600">CUI: {invoice.issuer.cui}</p>
                  {invoice.issuer.regCom && (
                    <p className="text-sm text-slate-600">Reg. Com.: {invoice.issuer.regCom}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-700">{invoice.issuer.address}</p>
                  <p className="text-sm text-slate-600">
                    {invoice.issuer.city}, {invoice.issuer.county}
                  </p>
                </div>
              </div>
              {invoice.issuer.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-slate-400" />
                  <p className="text-sm text-slate-700">{invoice.issuer.phone}</p>
                </div>
              )}
              {invoice.issuer.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-slate-400" />
                  <p className="text-sm text-slate-700">{invoice.issuer.email}</p>
                </div>
              )}
              {invoice.issuer.iban && (
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-slate-400" />
                  <div className="flex items-center gap-2 flex-1">
                    <p className="text-sm font-mono text-slate-700">{invoice.issuer.iban}</p>
                    <button
                      onClick={handleCopyIban}
                      className="p-1 text-slate-400 hover:text-slate-600 transition"
                      title="Copiază IBAN"
                    >
                      {copiedIban ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}
              {invoice.issuer.bank && (
                <p className="text-sm text-slate-500 ml-8">{invoice.issuer.bank}</p>
              )}
            </div>
          </div>

          {/* Recipient */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Client</h3>
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900">{invoice.recipient.name}</p>
                  <p className="text-sm text-slate-600">CUI: {invoice.recipient.cui}</p>
                  {invoice.recipient.regCom && (
                    <p className="text-sm text-slate-600">Reg. Com.: {invoice.recipient.regCom}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-700">{invoice.recipient.address}</p>
                  <p className="text-sm text-slate-600">
                    {invoice.recipient.city}, {invoice.recipient.county}
                  </p>
                </div>
              </div>
              {invoice.recipient.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-slate-400" />
                  <p className="text-sm text-slate-700">{invoice.recipient.phone}</p>
                </div>
              )}
              {invoice.recipient.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-slate-400" />
                  <p className="text-sm text-slate-700">{invoice.recipient.email}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
            <Calendar className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-xs text-blue-600">Data emiterii</p>
              <p className="font-medium text-blue-900">{formatDate(invoice.invoiceDate)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-lg">
            <Calendar className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-xs text-amber-600">Scadență</p>
              <p className="font-medium text-amber-900">{formatDate(invoice.dueDate)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg">
            <DollarSign className="w-5 h-5 text-slate-500" />
            <div>
              <p className="text-xs text-slate-600">Monedă</p>
              <p className="font-medium text-slate-900">{invoice.currency}</p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">#</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Descriere</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-700">Cant.</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-700">Preț unitar</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-700">TVA</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-700">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.items.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 text-sm text-slate-500">{index + 1}</td>
                  <td className="py-3 px-4">
                    <p className="text-sm font-medium text-slate-900">{item.description}</p>
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-slate-700">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-slate-700">
                    {item.unitPrice.toLocaleString("ro-RO")} {invoice.currency}
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-slate-500">{item.vatRate}%</td>
                  <td className="py-3 px-4 text-right text-sm font-mono font-medium text-slate-900">
                    {item.total.toLocaleString("ro-RO")} {invoice.currency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-full md:w-80 space-y-2">
            <div className="flex justify-between py-2 text-sm">
              <span className="text-slate-600">Subtotal (fără TVA)</span>
              <span className="font-mono text-slate-900">
                {invoice.subtotal.toLocaleString("ro-RO")} {invoice.currency}
              </span>
            </div>
            {invoice.totalDiscount > 0 && (
              <div className="flex justify-between py-2 text-sm">
                <span className="text-slate-600">Discount</span>
                <span className="font-mono text-red-600">
                  -{invoice.totalDiscount.toLocaleString("ro-RO")} {invoice.currency}
                </span>
              </div>
            )}
            <div className="flex justify-between py-2 text-sm">
              <span className="text-slate-600">TVA</span>
              <span className="font-mono text-slate-900">
                {invoice.totalVat.toLocaleString("ro-RO")} {invoice.currency}
              </span>
            </div>
            <div className="flex justify-between py-3 text-lg font-bold border-t border-slate-200">
              <span className="text-slate-900">Total de plată</span>
              <span className="font-mono text-blue-600">
                {invoice.grandTotal.toLocaleString("ro-RO")} {invoice.currency}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-600">{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Format: CIUS-RO 1.0.1 (UBL 2.1)
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onDownloadPdf}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-white transition text-slate-700"
            >
              <Download className="w-4 h-4" />
              Descarcă PDF
            </button>
            <button
              onClick={onSend}
              disabled={!allValid}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition ${
                allValid
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              <Send className="w-4 h-4" />
              Trimite la ANAF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
