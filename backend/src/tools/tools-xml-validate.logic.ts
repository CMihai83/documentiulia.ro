import { XMLValidator } from 'fast-xml-parser';

/**
 * DOC-W0-5 — SAF-T / e-Factura XML pre-submission checks (pure, in-memory).
 *
 * Honest scope: full ANAF XSD validation requires the official schema files
 * (not shipped in-repo); like the DOC-42-4 SAF-T validator this performs
 * well-formedness + the mandatory-element checks ANAF rejects on most often,
 * with plain-language Romanian messages. Flagged as a follow-up to add the
 * official XSDs (DUKIntegrator parity).
 */

export interface XmlToolError {
  line?: number;
  element?: string;
  message: string; // Romanian, actionable
}

export interface XmlToolResult {
  detectedType: 'efactura' | 'saft' | 'unknown';
  wellFormed: boolean;
  valid: boolean;
  errors: XmlToolError[];
  checkedElements: number;
}

const EFACTURA_REQUIRED: Array<[string, string]> = [
  ['cbc:CustomizationID', 'Lipsește CustomizationID (CIUS-RO) — ANAF respinge fără identificatorul de customizare.'],
  ['cbc:ID', 'Lipsește numărul facturii (cbc:ID).'],
  ['cbc:IssueDate', 'Lipsește data emiterii (cbc:IssueDate).'],
  ['cbc:InvoiceTypeCode', 'Lipsește tipul facturii (cbc:InvoiceTypeCode, ex. 380).'],
  ['cac:AccountingSupplierParty', 'Lipsește secțiunea furnizorului (AccountingSupplierParty).'],
  ['cac:AccountingCustomerParty', 'Lipsește secțiunea cumpărătorului (AccountingCustomerParty).'],
  ['cac:TaxTotal', 'Lipsește totalul de TVA (cac:TaxTotal).'],
  ['cac:LegalMonetaryTotal', 'Lipsește totalul facturii (cac:LegalMonetaryTotal).'],
  ['cac:InvoiceLine', 'Factura nu are nicio linie (cac:InvoiceLine).'],
];

const SAFT_REQUIRED: Array<[string, string]> = [
  ['Header', 'Lipsește secțiunea Header a fișierului SAF-T.'],
  ['AuditFileVersion', 'Lipsește AuditFileVersion din Header.'],
  ['AuditFileDateCreated', 'Lipsește AuditFileDateCreated din Header.'],
  ['Company', 'Lipsesc datele companiei (Company) din Header.'],
  ['MasterFiles', 'Lipsește secțiunea MasterFiles (nomenclatoare).'],
];

function lineOf(xml: string, needle: string): number | undefined {
  const idx = xml.indexOf(needle);
  if (idx < 0) return undefined;
  return xml.slice(0, idx).split('\n').length;
}

export function validateXmlTool(xml: string): XmlToolResult {
  const errors: XmlToolError[] = [];

  // 1) well-formedness (same engine as the SAF-T validator)
  const wf = XMLValidator.validate(xml, { allowBooleanAttributes: true });
  const wellFormed = wf === true;
  if (wf !== true) {
    errors.push({
      line: (wf as any)?.err?.line,
      message: `XML invalid: ${(wf as any)?.err?.msg ?? 'structură coruptă'} — corectați înainte de depunere.`,
    });
  }

  // 2) type detection
  const isEfactura = /urn:oasis:names:specification:ubl:schema:xsd:Invoice-2/.test(xml);
  const isSaft = /<(nsSAFT:)?AuditFile[\s>]/.test(xml) || /StandardAuditFile/i.test(xml) || /AuditFileVersion/.test(xml);
  const detectedType: XmlToolResult['detectedType'] = isEfactura ? 'efactura' : isSaft ? 'saft' : 'unknown';

  // 3) mandatory-element sweep (only when well-formed enough to be meaningful)
  const table = detectedType === 'efactura' ? EFACTURA_REQUIRED : detectedType === 'saft' ? SAFT_REQUIRED : [];
  let checked = 0;
  if (wellFormed) {
    for (const [el, msg] of table) {
      checked++;
      const bare = el.includes(':') ? el.split(':')[1] : el;
      if (!xml.includes(`<${el}`) && !xml.includes(`<${bare}`) && !new RegExp(`<[A-Za-z0-9]+:${bare}[\\s>]`).test(xml)) {
        errors.push({ element: el, line: undefined, message: msg });
      }
    }
    if (detectedType === 'unknown') {
      errors.push({
        message:
          'Nu am recunoscut tipul fișierului — nu pare nici e-Factura (UBL Invoice-2), nici SAF-T (AuditFile). Verificați că ați încărcat XML-ul corect.',
      });
    }
    if (detectedType === 'efactura' && !/CIUS-RO/.test(xml)) {
      errors.push({
        element: 'cbc:CustomizationID',
        line: lineOf(xml, 'CustomizationID'),
        message: 'CustomizationID nu referă CIUS-RO — ANAF cere profilul urn:efactura.mfinante.ro:CIUS-RO:1.0.1.',
      });
    }
  }

  return {
    detectedType,
    wellFormed,
    valid: wellFormed && errors.length === 0,
    errors,
    checkedElements: checked,
  };
}
