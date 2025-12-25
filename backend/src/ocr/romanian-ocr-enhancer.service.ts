/**
 * Romanian OCR Enhancement Service
 * Post-processing and validation for Romanian invoice OCR
 * Sprint 26 - Grok Backlog
 */

import { Injectable, Logger } from '@nestjs/common';

export interface RomanianOCRField {
  value: string | number | null;
  confidence: number;
  corrected?: boolean;
  originalValue?: string | number | null;
}

export interface RomanianInvoiceData {
  invoiceNumber: RomanianOCRField;
  invoiceDate: RomanianOCRField;
  dueDate: RomanianOCRField;
  supplierName: RomanianOCRField;
  supplierCui: RomanianOCRField;
  supplierAddress: RomanianOCRField;
  customerName: RomanianOCRField;
  customerCui: RomanianOCRField;
  customerAddress: RomanianOCRField;
  netAmount: RomanianOCRField;
  vatRate: RomanianOCRField;
  vatAmount: RomanianOCRField;
  grossAmount: RomanianOCRField;
  currency: RomanianOCRField;
}

@Injectable()
export class RomanianOCREnhancerService {
  private readonly logger = new Logger(RomanianOCREnhancerService.name);

  // Common Romanian diacritics substitutions from OCR errors
  private readonly diacriticCorrections: [RegExp, string][] = [
    [/ş/g, 'ș'], // s-comma to s-cedilla
    [/ţ/g, 'ț'], // t-comma to t-cedilla
    [/Ş/g, 'Ș'],
    [/Ţ/g, 'Ț'],
    [/ã/g, 'ă'],
    [/Ã/g, 'Ă'],
    [/î/g, 'î'], // Normalize
    [/Î/g, 'Î'],
    [/â/g, 'â'],
    [/Â/g, 'Â'],
  ];

  // Common OCR misreadings for Romanian
  private readonly commonMisreadings: [RegExp, string][] = [
    [/S\.?R\.?L\.?/gi, 'S.R.L.'],
    [/S\.?A\.?/gi, 'S.A.'],
    [/P\.?F\.?A\.?/gi, 'P.F.A.'],
    [/I\.?I\.?/gi, 'I.I.'],
    [/TVA/gi, 'TVA'],
    [/CU[I1]\/C[I1]F/gi, 'CUI/CIF'],
    [/RO\s*(\d+)/gi, 'RO$1'],
    [/J\s*(\d+)\/(\d+)\/(\d{4})/g, 'J$1/$2/$3'], // Trade registry format
  ];

  // Romanian city names (common ones)
  private readonly romanianCities = [
    'București', 'Cluj-Napoca', 'Timișoara', 'Iași', 'Constanța', 'Craiova',
    'Brașov', 'Galați', 'Ploiești', 'Oradea', 'Brăila', 'Arad', 'Pitești',
    'Sibiu', 'Bacău', 'Târgu Mureș', 'Baia Mare', 'Buzău', 'Botoșani', 'Satu Mare',
  ];

  // Romanian county abbreviations
  private readonly romanianCounties: Record<string, string> = {
    AB: 'Alba', AG: 'Argeș', AR: 'Arad', B: 'București', BC: 'Bacău',
    BH: 'Bihor', BN: 'Bistrița-Năsăud', BR: 'Brăila', BT: 'Botoșani',
    BV: 'Brașov', BZ: 'Buzău', CJ: 'Cluj', CL: 'Călărași', CS: 'Caraș-Severin',
    CT: 'Constanța', CV: 'Covasna', DB: 'Dâmbovița', DJ: 'Dolj', GJ: 'Gorj',
    GL: 'Galați', GR: 'Giurgiu', HD: 'Hunedoara', HR: 'Harghita', IF: 'Ilfov',
    IL: 'Ialomița', IS: 'Iași', MH: 'Mehedinți', MM: 'Maramureș', MS: 'Mureș',
    NT: 'Neamț', OT: 'Olt', PH: 'Prahova', SB: 'Sibiu', SJ: 'Sălaj',
    SM: 'Satu Mare', SV: 'Suceava', TL: 'Tulcea', TM: 'Timiș', TR: 'Teleorman',
    VL: 'Vâlcea', VN: 'Vrancea', VS: 'Vaslui',
  };

  /**
   * Enhance extracted data with Romanian-specific corrections
   */
  enhanceExtractedData(data: Partial<RomanianInvoiceData>): RomanianInvoiceData {
    const enhanced: RomanianInvoiceData = {
      invoiceNumber: this.enhanceInvoiceNumber(data.invoiceNumber),
      invoiceDate: this.enhanceDate(data.invoiceDate),
      dueDate: this.enhanceDate(data.dueDate),
      supplierName: this.enhanceCompanyName(data.supplierName),
      supplierCui: this.enhanceCUI(data.supplierCui),
      supplierAddress: this.enhanceAddress(data.supplierAddress),
      customerName: this.enhanceCompanyName(data.customerName),
      customerCui: this.enhanceCUI(data.customerCui),
      customerAddress: this.enhanceAddress(data.customerAddress),
      netAmount: this.enhanceAmount(data.netAmount),
      vatRate: this.enhanceVatRate(data.vatRate),
      vatAmount: this.enhanceAmount(data.vatAmount),
      grossAmount: this.enhanceAmount(data.grossAmount),
      currency: this.enhanceCurrency(data.currency),
    };

    // Validate and correct amounts
    const correctedAmounts = this.validateAndCorrectAmounts(enhanced);
    enhanced.netAmount = correctedAmounts.netAmount;
    enhanced.vatAmount = correctedAmounts.vatAmount;
    enhanced.grossAmount = correctedAmounts.grossAmount;

    return enhanced;
  }

  /**
   * Normalize Romanian text (diacritics, common OCR errors)
   */
  normalizeRomanianText(text: string | null): string {
    if (!text) return '';

    let normalized = text;

    // Apply diacritic corrections
    for (const [pattern, replacement] of this.diacriticCorrections) {
      normalized = normalized.replace(pattern, replacement);
    }

    // Apply common misreading corrections
    for (const [pattern, replacement] of this.commonMisreadings) {
      normalized = normalized.replace(pattern, replacement);
    }

    // Normalize whitespace
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized;
  }

  /**
   * Validate Romanian CUI (tax ID) using checksum algorithm
   */
  validateCUI(cui: string): { valid: boolean; normalized: string } {
    if (!cui) return { valid: false, normalized: '' };

    // Remove RO prefix and whitespace
    let cleaned = cui.replace(/^RO/i, '').replace(/\s+/g, '').trim();

    // Must be 2-10 digits
    if (!/^\d{2,10}$/.test(cleaned)) {
      return { valid: false, normalized: cui };
    }

    // Pad to 10 digits for checksum calculation
    const padded = cleaned.padStart(10, '0');
    const weights = [7, 5, 3, 2, 1, 7, 5, 3, 2, 1];

    // Calculate checksum (last digit)
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(padded[i]) * weights[i];
    }
    const remainder = sum % 11;
    const checkDigit = remainder === 10 ? 0 : remainder;

    const valid = parseInt(padded[9]) === checkDigit;

    // Format with RO prefix if valid
    const normalized = valid ? `RO${cleaned}` : cleaned;

    return { valid, normalized };
  }

  /**
   * Parse Romanian date formats
   */
  parseRomanianDate(dateStr: string | null): Date | null {
    if (!dateStr) return null;

    // Common Romanian date patterns
    const patterns = [
      // DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
      /(\d{1,2})[./-](\d{1,2})[./-](\d{4})/,
      // YYYY-MM-DD (ISO format)
      /(\d{4})-(\d{1,2})-(\d{1,2})/,
      // DD luna YYYY (e.g., "15 ianuarie 2024")
      /(\d{1,2})\s+(ian(?:uarie)?|feb(?:ruarie)?|mar(?:tie)?|apr(?:ilie)?|mai|iun(?:ie)?|iul(?:ie)?|aug(?:ust)?|sep(?:tembrie)?|oct(?:ombrie)?|no[iv](?:embrie)?|dec(?:embrie)?)\s*(\d{4})/i,
    ];

    const monthNames: Record<string, number> = {
      ian: 1, ianuarie: 1, feb: 2, februarie: 2, mar: 3, martie: 3,
      apr: 4, aprilie: 4, mai: 5, iun: 6, iunie: 6, iul: 7, iulie: 7,
      aug: 8, august: 8, sep: 9, septembrie: 9, oct: 10, octombrie: 10,
      nov: 11, noiembrie: 11, noi: 11, noiembie: 11, dec: 12, decembrie: 12,
    };

    // Try ISO format first
    const isoMatch = dateStr.match(patterns[1]);
    if (isoMatch) {
      return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
    }

    // Try DD.MM.YYYY format
    const dmyMatch = dateStr.match(patterns[0]);
    if (dmyMatch) {
      return new Date(parseInt(dmyMatch[3]), parseInt(dmyMatch[2]) - 1, parseInt(dmyMatch[1]));
    }

    // Try text format (DD luna YYYY)
    const textMatch = dateStr.match(patterns[2]);
    if (textMatch) {
      const month = monthNames[textMatch[2].toLowerCase()] || 1;
      return new Date(parseInt(textMatch[3]), month - 1, parseInt(textMatch[1]));
    }

    return null;
  }

  /**
   * Parse Romanian invoice number formats
   */
  parseInvoiceNumber(invoiceNumber: string | null): { serie: string; numar: string; formatted: string } | null {
    if (!invoiceNumber) return null;

    // Common Romanian invoice number patterns:
    // FV-2024-001234, FV 2024 1234, FV2024/1234, Serie ABC Nr. 1234

    const patterns = [
      // Standard format: SERIE-YYYY-NNNNN or SERIE YYYY NNNNN
      /([A-Z]{2,5})[\s\-]?(\d{4})[\s\-\/]?(\d+)/i,
      // Serie + Nr format: Serie ABC Nr. 1234
      /[Ss]erie?\s*([A-Z0-9]+)\s*[Nn]r\.?\s*(\d+)/,
      // Simple format: ABC1234
      /([A-Z]{2,5})(\d+)/i,
    ];

    for (const pattern of patterns) {
      const match = invoiceNumber.match(pattern);
      if (match) {
        if (match.length === 4) {
          // SERIE-YYYY-NNNNN format
          return {
            serie: match[1].toUpperCase(),
            numar: `${match[2]}-${match[3]}`,
            formatted: `${match[1].toUpperCase()}-${match[2]}-${match[3].padStart(6, '0')}`,
          };
        } else if (match.length === 3) {
          return {
            serie: match[1].toUpperCase(),
            numar: match[2],
            formatted: `${match[1].toUpperCase()}${match[2]}`,
          };
        }
      }
    }

    return { serie: '', numar: invoiceNumber, formatted: invoiceNumber };
  }

  /**
   * Parse Romanian currency amounts (handling Romanian number format: 1.234,56)
   */
  parseRomanianAmount(amount: string | number | null): number | null {
    if (amount === null || amount === undefined) return null;

    if (typeof amount === 'number') return amount;

    // Remove currency symbols and whitespace
    let cleaned = amount.replace(/[RON€\$LEI\s]/gi, '').trim();

    // Romanian format uses . for thousands and , for decimals
    // e.g., 1.234,56 should become 1234.56

    // Check if it's Romanian format (has both . and , with , after .)
    if (cleaned.includes('.') && cleaned.includes(',')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (cleaned.includes(',') && !cleaned.includes('.')) {
      // Only comma - could be decimal separator
      cleaned = cleaned.replace(',', '.');
    }

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  // Private enhancement methods

  private enhanceInvoiceNumber(field: RomanianOCRField | undefined): RomanianOCRField {
    if (!field?.value) {
      return { value: null, confidence: 0 };
    }

    const parsed = this.parseInvoiceNumber(String(field.value));
    if (parsed && parsed.formatted !== field.value) {
      return {
        value: parsed.formatted,
        confidence: field.confidence * 0.95, // Slightly reduce confidence when corrected
        corrected: true,
        originalValue: field.value,
      };
    }

    return { value: field.value, confidence: field.confidence };
  }

  private enhanceDate(field: RomanianOCRField | undefined): RomanianOCRField {
    if (!field?.value) {
      return { value: null, confidence: 0 };
    }

    const parsed = this.parseRomanianDate(String(field.value));
    if (parsed) {
      const isoDate = parsed.toISOString().split('T')[0];
      if (isoDate !== field.value) {
        return {
          value: isoDate,
          confidence: field.confidence * 0.95,
          corrected: true,
          originalValue: field.value,
        };
      }
      return { value: isoDate, confidence: field.confidence };
    }

    return { value: null, confidence: 0 };
  }

  private enhanceCompanyName(field: RomanianOCRField | undefined): RomanianOCRField {
    if (!field?.value) {
      return { value: null, confidence: 0 };
    }

    const normalized = this.normalizeRomanianText(String(field.value));

    if (normalized !== field.value) {
      return {
        value: normalized,
        confidence: field.confidence * 0.98,
        corrected: true,
        originalValue: field.value,
      };
    }

    return { value: field.value, confidence: field.confidence };
  }

  private enhanceCUI(field: RomanianOCRField | undefined): RomanianOCRField {
    if (!field?.value) {
      return { value: null, confidence: 0 };
    }

    const { valid, normalized } = this.validateCUI(String(field.value));

    if (valid) {
      return {
        value: normalized,
        confidence: Math.min(1, field.confidence * 1.1), // Boost confidence if valid
        corrected: normalized !== field.value,
        originalValue: normalized !== field.value ? field.value : undefined,
      };
    }

    return {
      value: String(field.value).replace(/^RO/i, 'RO').replace(/\s+/g, ''),
      confidence: field.confidence * 0.7, // Reduce confidence if invalid
    };
  }

  private enhanceAddress(field: RomanianOCRField | undefined): RomanianOCRField {
    if (!field?.value) {
      return { value: null, confidence: 0 };
    }

    let enhanced = this.normalizeRomanianText(String(field.value));

    // Normalize street abbreviations
    enhanced = enhanced
      .replace(/\bstr\.?\s*/gi, 'Str. ')
      .replace(/\bnr\.?\s*/gi, 'Nr. ')
      .replace(/\bbl\.?\s*/gi, 'Bl. ')
      .replace(/\bsc\.?\s*/gi, 'Sc. ')
      .replace(/\bet\.?\s*/gi, 'Et. ')
      .replace(/\bap\.?\s*/gi, 'Ap. ')
      .replace(/\bjud\.?\s*/gi, 'Jud. ')
      .replace(/\bsect\.?\s*/gi, 'Sector ');

    // Normalize city names
    for (const city of this.romanianCities) {
      const cityLower = city.toLowerCase().replace(/[ăâîșț]/g, (c) => {
        const map: Record<string, string> = { ă: 'a', â: 'a', î: 'i', ș: 's', ț: 't' };
        return map[c] || c;
      });
      const pattern = new RegExp(`\\b${cityLower}\\b`, 'gi');
      enhanced = enhanced.replace(pattern, city);
    }

    if (enhanced !== field.value) {
      return {
        value: enhanced,
        confidence: field.confidence * 0.98,
        corrected: true,
        originalValue: field.value,
      };
    }

    return { value: field.value, confidence: field.confidence };
  }

  private enhanceAmount(field: RomanianOCRField | undefined): RomanianOCRField {
    if (!field?.value && field?.value !== 0) {
      return { value: null, confidence: 0 };
    }

    const parsed = this.parseRomanianAmount(field.value);

    if (parsed !== null) {
      const rounded = Math.round(parsed * 100) / 100;
      return {
        value: rounded,
        confidence: field.confidence,
        corrected: rounded !== field.value,
        originalValue: rounded !== field.value ? field.value : undefined,
      };
    }

    return { value: null, confidence: 0 };
  }

  private enhanceVatRate(field: RomanianOCRField | undefined): RomanianOCRField {
    if (!field?.value && field?.value !== 0) {
      return { value: null, confidence: 0 };
    }

    let rate = this.parseRomanianAmount(field.value);

    if (rate !== null) {
      // Common Romanian VAT rates
      const validRates = [0, 5, 9, 11, 19, 21]; // Including new 2025 rates

      // If rate is above 100, it might be in decimal form (1900 instead of 19)
      if (rate > 100) {
        rate = rate / 100;
      }

      // Round to nearest valid rate
      const nearestRate = validRates.reduce((prev, curr) =>
        Math.abs(curr - rate!) < Math.abs(prev - rate!) ? curr : prev
      );

      if (Math.abs(nearestRate - rate) < 2) {
        return {
          value: nearestRate,
          confidence: nearestRate === rate ? field.confidence : field.confidence * 0.9,
          corrected: nearestRate !== rate,
          originalValue: nearestRate !== rate ? field.value : undefined,
        };
      }

      return { value: rate, confidence: field.confidence * 0.7 };
    }

    return { value: null, confidence: 0 };
  }

  private enhanceCurrency(field: RomanianOCRField | undefined): RomanianOCRField {
    if (!field?.value) {
      return { value: 'RON', confidence: 0.5 }; // Default to RON
    }

    const value = String(field.value).toUpperCase().trim();

    const currencyMap: Record<string, string> = {
      RON: 'RON',
      LEI: 'RON',
      LEU: 'RON',
      EUR: 'EUR',
      EURO: 'EUR',
      '€': 'EUR',
      USD: 'USD',
      '$': 'USD',
      GBP: 'GBP',
      '£': 'GBP',
    };

    const normalized = currencyMap[value] || value;

    return {
      value: normalized,
      confidence: normalized !== value ? field.confidence * 0.9 : field.confidence,
      corrected: normalized !== value,
      originalValue: normalized !== value ? field.value : undefined,
    };
  }

  private validateAndCorrectAmounts(data: RomanianInvoiceData): {
    netAmount: RomanianOCRField;
    vatAmount: RomanianOCRField;
    grossAmount: RomanianOCRField;
  } {
    const net = data.netAmount.value as number | null;
    const vat = data.vatAmount.value as number | null;
    const gross = data.grossAmount.value as number | null;
    const vatRate = data.vatRate.value as number | null;

    // If we have net and vat rate, calculate expected vat
    if (net !== null && vatRate !== null && vat !== null) {
      const expectedVat = Math.round(net * vatRate / 100 * 100) / 100;
      if (Math.abs(expectedVat - vat) > 0.1) {
        this.logger.warn(
          `VAT mismatch: extracted ${vat}, calculated ${expectedVat} from net ${net} @ ${vatRate}%`
        );
        // Use calculated value if difference is significant
        if (Math.abs(expectedVat - vat) > vat * 0.05) {
          data.vatAmount = {
            value: expectedVat,
            confidence: data.netAmount.confidence * 0.9,
            corrected: true,
            originalValue: vat,
          };
        }
      }
    }

    // Validate gross = net + vat
    if (net !== null && vat !== null && gross !== null) {
      const expectedGross = Math.round((net + (data.vatAmount.value as number)) * 100) / 100;
      if (Math.abs(expectedGross - gross) > 0.1) {
        this.logger.warn(
          `Gross mismatch: extracted ${gross}, calculated ${expectedGross} from net ${net} + vat ${data.vatAmount.value}`
        );
        // Use calculated value if difference is significant
        if (Math.abs(expectedGross - gross) > gross * 0.01) {
          data.grossAmount = {
            value: expectedGross,
            confidence: Math.min(data.netAmount.confidence, data.vatAmount.confidence) * 0.9,
            corrected: true,
            originalValue: gross,
          };
        }
      }
    }

    // If we only have gross and vat rate, calculate net and vat
    if (gross !== null && vatRate !== null && net === null) {
      const calculatedNet = Math.round(gross / (1 + vatRate / 100) * 100) / 100;
      const calculatedVat = Math.round((gross - calculatedNet) * 100) / 100;

      data.netAmount = {
        value: calculatedNet,
        confidence: data.grossAmount.confidence * 0.8,
        corrected: true,
        originalValue: null,
      };

      if (vat === null) {
        data.vatAmount = {
          value: calculatedVat,
          confidence: data.grossAmount.confidence * 0.8,
          corrected: true,
          originalValue: null,
        };
      }
    }

    return {
      netAmount: data.netAmount,
      vatAmount: data.vatAmount,
      grossAmount: data.grossAmount,
    };
  }

  /**
   * Get OCR accuracy report with Romanian-specific metrics
   */
  getAccuracyReport(
    extractions: Array<{
      fields: Partial<RomanianInvoiceData>;
      wasManuallyEdited: boolean;
      editedFields?: string[];
    }>
  ): {
    totalDocuments: number;
    autoAccepted: number;
    manuallyEdited: number;
    fieldAccuracy: Record<string, { accuracy: number; commonErrors: string[] }>;
    recommendations: string[];
  } {
    const fieldStats: Record<string, { correct: number; edited: number; errors: string[] }> = {};

    const fields = [
      'invoiceNumber', 'invoiceDate', 'dueDate', 'supplierName', 'supplierCui',
      'customerCui', 'netAmount', 'vatRate', 'vatAmount', 'grossAmount', 'currency',
    ];

    for (const field of fields) {
      fieldStats[field] = { correct: 0, edited: 0, errors: [] };
    }

    let autoAccepted = 0;
    let manuallyEdited = 0;

    for (const extraction of extractions) {
      if (extraction.wasManuallyEdited) {
        manuallyEdited++;
        for (const editedField of extraction.editedFields || []) {
          if (fieldStats[editedField]) {
            fieldStats[editedField].edited++;
          }
        }
      } else {
        autoAccepted++;
      }

      for (const field of fields) {
        if (!extraction.wasManuallyEdited || !extraction.editedFields?.includes(field)) {
          fieldStats[field].correct++;
        }
      }
    }

    const fieldAccuracy: Record<string, { accuracy: number; commonErrors: string[] }> = {};
    const recommendations: string[] = [];

    for (const [field, stats] of Object.entries(fieldStats)) {
      const total = stats.correct + stats.edited;
      const accuracy = total > 0 ? Math.round((stats.correct / total) * 100) : 100;

      fieldAccuracy[field] = {
        accuracy,
        commonErrors: stats.errors.slice(0, 5),
      };

      if (accuracy < 90) {
        recommendations.push(`Câmpul "${this.getFieldDisplayName(field)}" are acuratețe ${accuracy}% - verificați template-ul OCR`);
      }
    }

    if (manuallyEdited / extractions.length > 0.3) {
      recommendations.push('Rata de editare manuală este ridicată (>30%) - îmbunătățiți calitatea scanărilor');
    }

    return {
      totalDocuments: extractions.length,
      autoAccepted,
      manuallyEdited,
      fieldAccuracy,
      recommendations,
    };
  }

  private getFieldDisplayName(field: string): string {
    const names: Record<string, string> = {
      invoiceNumber: 'Număr factură',
      invoiceDate: 'Data facturii',
      dueDate: 'Data scadenței',
      supplierName: 'Furnizor',
      supplierCui: 'CUI Furnizor',
      supplierAddress: 'Adresa furnizor',
      customerName: 'Client',
      customerCui: 'CUI Client',
      customerAddress: 'Adresa client',
      netAmount: 'Sumă netă',
      vatRate: 'Cotă TVA',
      vatAmount: 'Valoare TVA',
      grossAmount: 'Total',
      currency: 'Monedă',
    };
    return names[field] || field;
  }
}
