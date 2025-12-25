import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import Anthropic from '@anthropic-ai/sdk';
import {
  DocumentType,
  OCRStatus,
  OCRResultDto,
  ProcessOCRDto,
  CorrectOCRDto,
  ExtractedInvoiceFieldsDto,
  ExtractedFieldDto,
} from './dto/ocr.dto';

// Language-specific OCR prompts for maximum accuracy
const OCR_PROMPTS: Record<string, string> = {
  ro: `Analyze this Romanian invoice (factura) image and extract fields in JSON format.

Romanian invoice terminology: FACTURA, Serie, Numar, Data, Scadenta, Furnizor, Client, CUI/CIF, TVA, Total

Required fields:
- invoice_number (Seria si numarul facturii, e.g. "FV-2024-001234")
- invoice_date (Data emiterii in YYYY-MM-DD)
- due_date (Data scadenta in YYYY-MM-DD)
- supplier_name (Denumirea furnizorului)
- supplier_cui (CUI/CIF furnizor, format: RO12345678 or 12345678)
- supplier_address (Adresa furnizorului)
- customer_name (Denumirea clientului)
- customer_cui (CUI/CIF client)
- customer_address (Adresa clientului)
- net_amount (Baza de impozitare / Total fara TVA - number only)
- vat_rate (Cota TVA - 19% standard, 9% reduced, 5% for certain goods)
- vat_amount (Valoare TVA - number only)
- gross_amount (Total cu TVA / Total de plata - number only)
- currency (RON, EUR, USD)

For each field provide: value (null if not found), confidence (0.0-1.0)
Respond ONLY with valid JSON: {"documentType": "INVOICE", "fields": {...}, "rawText": "..."}`,

  de: `Analyze this German invoice (Rechnung) image and extract fields in JSON format.

German invoice terminology: Rechnung, Rechnungsnummer, Rechnungsdatum, Zahlungsziel, Lieferant, Kunde, USt-IdNr, Steuernummer, MwSt/USt, Nettobetrag, Bruttobetrag

Required fields:
- invoice_number (Rechnungsnummer, e.g. "RE-2024-001234")
- invoice_date (Rechnungsdatum in YYYY-MM-DD)
- due_date (Zahlungsziel/Faelligkeitsdatum in YYYY-MM-DD)
- supplier_name (Name des Lieferanten/Verkaeufers)
- supplier_cui (USt-IdNr or Steuernummer, format: DE123456789)
- supplier_address (Adresse des Lieferanten)
- customer_name (Name des Kunden/Kaeufers)
- customer_cui (USt-IdNr des Kunden)
- customer_address (Adresse des Kunden)
- net_amount (Nettobetrag / Summe netto - number only)
- vat_rate (MwSt-Satz / USt-Satz - 19% standard, 7% reduced in Germany)
- vat_amount (MwSt-Betrag / USt-Betrag - number only)
- gross_amount (Bruttobetrag / Gesamtbetrag - number only)
- currency (EUR, CHF)

For each field provide: value (null if not found), confidence (0.0-1.0)
Respond ONLY with valid JSON: {"documentType": "INVOICE", "fields": {...}, "rawText": "..."}`,

  en: `Analyze this English invoice image and extract fields in JSON format.

Common invoice terminology: Invoice, Invoice Number, Invoice Date, Due Date, Supplier/Vendor, Customer/Client, VAT/Tax ID, Amount, Total

Required fields:
- invoice_number (Invoice number/reference)
- invoice_date (Invoice date in YYYY-MM-DD)
- due_date (Payment due date in YYYY-MM-DD)
- supplier_name (Supplier/Vendor name)
- supplier_cui (VAT ID or Tax ID of supplier)
- supplier_address (Supplier address)
- customer_name (Customer/Client name)
- customer_cui (Customer VAT/Tax ID)
- customer_address (Customer address)
- net_amount (Subtotal / Net amount before tax - number only)
- vat_rate (VAT/Tax rate percentage - 20% UK, varies by country)
- vat_amount (VAT/Tax amount - number only)
- gross_amount (Total / Grand total including tax - number only)
- currency (GBP, USD, EUR)

For each field provide: value (null if not found), confidence (0.0-1.0)
Respond ONLY with valid JSON: {"documentType": "INVOICE", "fields": {...}, "rawText": "..."}`,

  auto: `Analyze this invoice image. First detect the language, then extract fields in JSON format.

Look for language indicators:
- Romanian: FACTURA, TVA, CUI/CIF, Lei/RON
- German: Rechnung, MwSt/USt, USt-IdNr, EUR
- English: Invoice, VAT, Tax ID, Total

Required fields:
- invoice_number, invoice_date (YYYY-MM-DD), due_date (YYYY-MM-DD)
- supplier_name, supplier_cui (tax ID), supplier_address
- customer_name, customer_cui, customer_address
- net_amount, vat_rate, vat_amount, gross_amount, currency

For each field provide: value (null if not found), confidence (0.0-1.0)
Include detected language in response.
Respond ONLY with valid JSON: {"documentType": "INVOICE", "language": "ro|de|en", "fields": {...}, "rawText": "..."}`
};

// Default to Romanian for backward compatibility
const ROMANIAN_INVOICE_PROMPT = OCR_PROMPTS.ro;

@Injectable()
export class OCRService {
  private readonly logger = new Logger(OCRService.name);
  private anthropic: Anthropic | null = null;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
    } else {
      this.logger.warn('ANTHROPIC_API_KEY not configured');
    }
  }

  async processDocument(documentId: string, options: ProcessOCRDto = {}): Promise<OCRResultDto> {
    const startTime = performance.now();

    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document) throw new NotFoundException('Document not found');
    if (!this.anthropic) throw new BadRequestException('OCR not configured');

    // Determine language-specific prompt (default to auto-detection)
    const language = options.language || 'auto';
    const prompt = OCR_PROMPTS[language] || OCR_PROMPTS.auto;
    this.logger.log(`Processing document ${documentId} with language: ${language}`);

    try {
      const imageContent = await this.getDocumentImage(document);

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: imageContent },
            { type: 'text', text: prompt }
          ]
        }]
      });

      const textContent = response.content.find(c => c.type === 'text');
      if (!textContent || textContent.type !== 'text') throw new Error('No text response');

      const extractedData = this.parseClaudeResponse(textContent.text);
      const overallConfidence = this.calculateOverallConfidence(extractedData.fields);

      await this.storeExtractionResult(documentId, extractedData, options.templateId);

      return {
        documentId,
        status: overallConfidence > 0.7 ? OCRStatus.COMPLETED : OCRStatus.REVIEW_REQUIRED,
        templateId: options.templateId,
        documentType: extractedData.documentType || DocumentType.OTHER,
        overallConfidence,
        fields: extractedData.fields,
        rawText: extractedData.rawText,
        processingTimeMs: performance.now() - startTime,
      };
    } catch (error) {
      this.logger.error('OCR failed', error);
      return {
        documentId,
        status: OCRStatus.FAILED,
        documentType: DocumentType.OTHER,
        overallConfidence: 0,
        fields: {},
        errorMessage: error.message,
        processingTimeMs: performance.now() - startTime,
      };
    }
  }

  async processBatch(documentIds: string[], templateId?: string): Promise<OCRResultDto[]> {
    return Promise.all(documentIds.map(id => this.processDocument(id, { templateId })));
  }

  async getExtractionStatus(documentId: string): Promise<{ status: OCRStatus; result?: OCRResultDto }> {
    const extraction = await this.prisma.extractedField.findFirst({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });
    if (!extraction) return { status: OCRStatus.PENDING };
    return {
      status: extraction.overallConfidence > 0.7 ? OCRStatus.COMPLETED : OCRStatus.REVIEW_REQUIRED,
    };
  }

  async submitCorrections(documentId: string, corrections: CorrectOCRDto): Promise<void> {
    const extraction = await this.prisma.extractedField.findFirst({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });
    if (!extraction) throw new NotFoundException('No extraction found');

    const updateData: Record<string, any> = { wasManuallyEdited: true, editedFields: corrections.corrections };
    for (const c of corrections.corrections) {
      const field = this.snakeToCamel(c.fieldName);
      if (field in extraction) updateData[field] = c.correctedValue;
    }
    await this.prisma.extractedField.update({ where: { id: extraction.id }, data: updateData });
  }

  private async getDocumentImage(document: any): Promise<{ type: 'base64'; media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'; data: string }> {
    if (!document.filePath) throw new BadRequestException('No image file');
    const fs = await import('fs');
    const path = await import('path');
    const buffer = fs.readFileSync(document.filePath);
    const ext = path.extname(document.filePath).toLowerCase();
    const mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' =
      ext === '.png' ? 'image/png' :
      ext === '.gif' ? 'image/gif' :
      ext === '.webp' ? 'image/webp' :
      'image/jpeg';
    return { type: 'base64', media_type: mediaType, data: buffer.toString('base64') };
  }

  private parseClaudeResponse(text: string): { documentType: DocumentType; fields: ExtractedInvoiceFieldsDto; rawText?: string } {
    try {
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      const data = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      const fields: ExtractedInvoiceFieldsDto = {};
      if (data.fields) {
        for (const [key, value] of Object.entries(data.fields)) {
          const camelKey = this.snakeToCamel(key);
          if (value && typeof value === 'object') fields[camelKey] = value as ExtractedFieldDto;
        }
      }
      return { documentType: this.parseDocumentType(data.documentType), fields, rawText: data.rawText };
    } catch {
      return { documentType: DocumentType.OTHER, fields: {} };
    }
  }

  private parseDocumentType(type: string): DocumentType {
    const upper = (type || '').toUpperCase();
    if (upper.includes('INVOICE')) return DocumentType.INVOICE;
    if (upper.includes('RECEIPT')) return DocumentType.RECEIPT;
    if (upper.includes('CONTRACT')) return DocumentType.CONTRACT;
    return DocumentType.OTHER;
  }

  private snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
  }

  private calculateOverallConfidence(fields: any): number {
    const confidences = Object.values(fields).filter((f: any) => f?.confidence).map((f: any) => f.confidence);
    return confidences.length ? confidences.reduce((a: number, b: number) => a + b, 0) / confidences.length : 0;
  }

  async convertToInvoice(documentId: string, options: any = {}, userId?: string): Promise<any> {
    const extraction = await this.prisma.extractedField.findFirst({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });

    if (!extraction) {
      throw new NotFoundException('No extraction data found for this document');
    }

    // Get user ID from document or options
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    const finalUserId = userId || document?.userId;

    if (!finalUserId) {
      throw new BadRequestException('User ID required to create invoice');
    }

    const invoice = await this.prisma.invoice.create({
      data: {
        userId: finalUserId,
        documentId: documentId,
        invoiceNumber: extraction.invoiceNumber || `OCR-${Date.now()}`,
        invoiceDate: extraction.invoiceDate || new Date(),
        dueDate: extraction.dueDate,
        partnerName: extraction.partnerName || 'Unknown Partner',
        partnerCui: extraction.partnerCui,
        partnerAddress: extraction.partnerAddress,
        netAmount: extraction.netAmount || 0,
        vatRate: extraction.vatRate || 19,
        vatAmount: extraction.vatAmount || 0,
        grossAmount: extraction.grossAmount || 0,
        currency: extraction.currency || 'RON',
        status: options.asDraft ? 'DRAFT' : 'PENDING',
      },
    });

    this.logger.log(`Created invoice ${invoice.id} from OCR extraction`);
    return invoice;
  }

  private async storeExtractionResult(documentId: string, data: any, templateId?: string): Promise<void> {
    const fields = data.fields || {};
    await this.prisma.extractedField.create({
      data: {
        documentId,
        templateId,
        invoiceNumber: fields.invoiceNumber?.value,
        invoiceDate: fields.invoiceDate?.value ? new Date(fields.invoiceDate.value) : null,
        dueDate: fields.dueDate?.value ? new Date(fields.dueDate.value) : null,
        partnerName: fields.supplierName?.value,
        partnerCui: fields.supplierCui?.value,
        partnerAddress: fields.supplierAddress?.value,
        netAmount: fields.netAmount?.value ? parseFloat(fields.netAmount.value) : null,
        vatRate: fields.vatRate?.value ? parseFloat(fields.vatRate.value) : null,
        vatAmount: fields.vatAmount?.value ? parseFloat(fields.vatAmount.value) : null,
        grossAmount: fields.grossAmount?.value ? parseFloat(fields.grossAmount.value) : null,
        currency: fields.currency?.value,
        confidences: JSON.stringify(Object.fromEntries(Object.entries(fields).map(([k, v]: [string, any]) => [k, v?.confidence || 0]))),
        overallConfidence: this.calculateOverallConfidence(fields),
        rawText: data.rawText,
      },
    });
  }

  /**
   * Get extraction preview with validation and suggestions
   */
  async getExtractionPreview(documentId: string): Promise<{
    documentId: string;
    status: 'ready' | 'pending' | 'error';
    extraction: any;
    validation: {
      isValid: boolean;
      errors: string[];
      warnings: string[];
    };
    suggestions: {
      matchedPartner?: any;
      duplicateWarning?: string;
      autoCorrections?: Array<{ field: string; original: any; suggested: any; reason: string }>;
    };
    preview: {
      invoiceNumber: string | null;
      invoiceDate: string | null;
      dueDate: string | null;
      supplier: {
        name: string | null;
        cui: string | null;
        address: string | null;
      };
      customer: {
        name: string | null;
        cui: string | null;
        address: string | null;
      };
      amounts: {
        net: number | null;
        vatRate: number | null;
        vat: number | null;
        gross: number | null;
        currency: string;
      };
      confidence: {
        overall: number;
        byField: Record<string, number>;
      };
    };
    canCreateInvoice: boolean;
  }> {
    const extraction = await this.prisma.extractedField.findFirst({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });

    if (!extraction) {
      return {
        documentId,
        status: 'pending',
        extraction: null,
        validation: {
          isValid: false,
          errors: ['No extraction data found. Run OCR processing first.'],
          warnings: [],
        },
        suggestions: {},
        preview: {
          invoiceNumber: null,
          invoiceDate: null,
          dueDate: null,
          supplier: { name: null, cui: null, address: null },
          customer: { name: null, cui: null, address: null },
          amounts: { net: null, vatRate: null, vat: null, gross: null, currency: 'RON' },
          confidence: { overall: 0, byField: {} },
        },
        canCreateInvoice: false,
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const autoCorrections: Array<{ field: string; original: any; suggested: any; reason: string }> = [];

    // Validate required fields
    if (!extraction.invoiceNumber) errors.push('Numar factura lipseste');
    if (!extraction.invoiceDate) errors.push('Data factura lipseste');
    if (!extraction.grossAmount) errors.push('Total brut lipseste');

    // Validate CUI format (Romanian tax ID)
    if (extraction.partnerCui) {
      const cuiClean = extraction.partnerCui.replace(/^RO/i, '').trim();
      if (!/^\d{2,10}$/.test(cuiClean)) {
        warnings.push(`CUI partener "${extraction.partnerCui}" are format nestandard`);
      }
    }

    // Validate VAT calculation
    if (extraction.netAmount && extraction.vatRate && extraction.vatAmount) {
      const expectedVat = Math.round(Number(extraction.netAmount) * Number(extraction.vatRate) / 100 * 100) / 100;
      const actualVat = Number(extraction.vatAmount);
      if (Math.abs(expectedVat - actualVat) > 0.02) {
        warnings.push(`TVA calculat (${expectedVat}) difera de TVA extras (${actualVat})`);
        autoCorrections.push({
          field: 'vatAmount',
          original: actualVat,
          suggested: expectedVat,
          reason: 'Recalculat din suma neta si cota TVA',
        });
      }
    }

    // Validate gross = net + vat
    if (extraction.netAmount && extraction.vatAmount && extraction.grossAmount) {
      const expectedGross = Math.round((Number(extraction.netAmount) + Number(extraction.vatAmount)) * 100) / 100;
      const actualGross = Number(extraction.grossAmount);
      if (Math.abs(expectedGross - actualGross) > 0.02) {
        warnings.push(`Total brut (${actualGross}) nu corespunde cu suma neta + TVA (${expectedGross})`);
      }
    }

    // Check for duplicate invoice
    let duplicateWarning: string | undefined;
    if (extraction.invoiceNumber && extraction.partnerCui) {
      const existingInvoice = await this.prisma.invoice.findFirst({
        where: {
          invoiceNumber: extraction.invoiceNumber,
          partnerCui: extraction.partnerCui,
        },
      });
      if (existingInvoice) {
        duplicateWarning = `Factura cu numarul ${extraction.invoiceNumber} de la ${extraction.partnerCui} exista deja`;
        errors.push(duplicateWarning);
      }
    }

    // Try to match partner from database
    let matchedPartner: any;
    if (extraction.partnerCui) {
      matchedPartner = await this.prisma.partner.findFirst({
        where: { cui: extraction.partnerCui },
        select: { id: true, name: true, cui: true, address: true },
      });
      if (matchedPartner && extraction.partnerName !== matchedPartner.name) {
        autoCorrections.push({
          field: 'partnerName',
          original: extraction.partnerName,
          suggested: matchedPartner.name,
          reason: `Nume din baza de date pentru CUI ${extraction.partnerCui}`,
        });
      }
    }

    // Parse confidences
    const confidences = typeof extraction.confidences === 'string'
      ? JSON.parse(extraction.confidences)
      : (extraction.confidences || {});

    // Low confidence warnings
    const lowConfidenceFields = Object.entries(confidences)
      .filter(([_, conf]) => (conf as number) < 0.7)
      .map(([field]) => this.fieldDisplayName(this.snakeToCamel(field)));
    if (lowConfidenceFields.length > 0) {
      warnings.push(`Campuri cu incredere scazuta: ${lowConfidenceFields.join(', ')}`);
    }

    return {
      documentId,
      status: 'ready',
      extraction: {
        id: extraction.id,
        createdAt: extraction.createdAt,
        wasManuallyEdited: extraction.wasManuallyEdited,
      },
      validation: {
        isValid: errors.length === 0,
        errors,
        warnings,
      },
      suggestions: {
        matchedPartner,
        duplicateWarning,
        autoCorrections: autoCorrections.length > 0 ? autoCorrections : undefined,
      },
      preview: {
        invoiceNumber: extraction.invoiceNumber,
        invoiceDate: extraction.invoiceDate?.toISOString().split('T')[0] || null,
        dueDate: extraction.dueDate?.toISOString().split('T')[0] || null,
        supplier: {
          name: extraction.partnerName,
          cui: extraction.partnerCui,
          address: extraction.partnerAddress,
        },
        customer: {
          name: null, // Customer is typically the logged-in user's company
          cui: null,
          address: null,
        },
        amounts: {
          net: extraction.netAmount ? Number(extraction.netAmount) : null,
          vatRate: extraction.vatRate ? Number(extraction.vatRate) : null,
          vat: extraction.vatAmount ? Number(extraction.vatAmount) : null,
          gross: extraction.grossAmount ? Number(extraction.grossAmount) : null,
          currency: extraction.currency || 'RON',
        },
        confidence: {
          overall: Math.round(extraction.overallConfidence * 100),
          byField: Object.fromEntries(
            Object.entries(confidences).map(([k, v]) => [k, Math.round((v as number) * 100)])
          ),
        },
      },
      canCreateInvoice: errors.length === 0 && extraction.overallConfidence >= 0.5,
    };
  }

  /**
   * Apply auto-corrections to extraction
   */
  async applyAutoCorrections(documentId: string, corrections: Array<{ field: string; value: any }>): Promise<void> {
    const extraction = await this.prisma.extractedField.findFirst({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });

    if (!extraction) {
      throw new NotFoundException('No extraction found for this document');
    }

    const updateData: Record<string, any> = {};
    for (const correction of corrections) {
      const field = correction.field;
      if (field in extraction) {
        updateData[field] = correction.value;
      }
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.extractedField.update({
        where: { id: extraction.id },
        data: updateData,
      });
      this.logger.log(`Applied ${corrections.length} auto-corrections to document ${documentId}`);
    }
  }

  async getQualityMetrics(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all extractions in the period
    const extractions = await this.prisma.extractedField.findMany({
      where: { createdAt: { gte: startDate } },
      include: { template: true },
    });

    const totalDocuments = extractions.length;
    const manuallyEdited = extractions.filter(e => e.wasManuallyEdited).length;
    const avgConfidence = totalDocuments > 0
      ? extractions.reduce((sum, e) => sum + e.overallConfidence, 0) / totalDocuments
      : 0;

    // Confidence distribution
    const confidenceDistribution = {
      high: extractions.filter(e => e.overallConfidence >= 0.9).length,
      medium: extractions.filter(e => e.overallConfidence >= 0.7 && e.overallConfidence < 0.9).length,
      low: extractions.filter(e => e.overallConfidence >= 0.5 && e.overallConfidence < 0.7).length,
      veryLow: extractions.filter(e => e.overallConfidence < 0.5).length,
    };

    // Daily trend (last 7 days)
    const dailyTrend: { date: string; count: number; avgConfidence: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      const dayStart = new Date(day.setHours(0, 0, 0, 0));
      const dayEnd = new Date(day.setHours(23, 59, 59, 999));

      const dayExtractions = extractions.filter(e => {
        const created = new Date(e.createdAt);
        return created >= dayStart && created <= dayEnd;
      });

      dailyTrend.push({
        date: dayStart.toISOString().split('T')[0],
        count: dayExtractions.length,
        avgConfidence: dayExtractions.length > 0
          ? Math.round((dayExtractions.reduce((sum, e) => sum + e.overallConfidence, 0) / dayExtractions.length) * 100)
          : 0,
      });
    }

    // Language breakdown
    const languageBreakdown: Record<string, number> = {};
    for (const e of extractions) {
      const lang = e.template?.language || 'unknown';
      languageBreakdown[lang] = (languageBreakdown[lang] || 0) + 1;
    }

    return {
      period: { days, startDate: startDate.toISOString(), endDate: new Date().toISOString() },
      summary: {
        totalDocuments,
        manuallyEdited,
        manualCorrectionRate: totalDocuments > 0 ? Math.round((manuallyEdited / totalDocuments) * 100) : 0,
        avgConfidence: Math.round(avgConfidence * 100),
        autoAcceptRate: Math.round((confidenceDistribution.high / Math.max(totalDocuments, 1)) * 100),
      },
      confidenceDistribution,
      dailyTrend,
      languageBreakdown,
    };
  }

  async getTemplateMetrics() {
    const templates = await this.prisma.oCRTemplate.findMany({
      include: {
        extractedFields: {
          take: 100,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return templates.map(template => {
      const extractions = template.extractedFields;
      const total = extractions.length;
      const edited = extractions.filter(e => e.wasManuallyEdited).length;
      const avgConfidence = total > 0
        ? extractions.reduce((sum, e) => sum + e.overallConfidence, 0) / total
        : 0;

      return {
        templateId: template.id,
        templateName: template.name,
        documentType: template.documentType,
        language: template.language,
        isSystem: template.isSystem,
        usageCount: template.usageCount,
        recentExtractions: total,
        metrics: {
          avgConfidence: Math.round(avgConfidence * 100),
          correctionRate: total > 0 ? Math.round((edited / total) * 100) : 0,
          accuracyScore: Math.round((1 - (edited / Math.max(total, 1))) * avgConfidence * 100),
        },
      };
    }).sort((a, b) => b.usageCount - a.usageCount);
  }

  async getFieldMetrics() {
    // Get recent extractions with their corrections
    const extractions = await this.prisma.extractedField.findMany({
      where: { wasManuallyEdited: true },
      take: 500,
      orderBy: { createdAt: 'desc' },
    });

    const fieldNames = [
      'invoiceNumber', 'invoiceDate', 'dueDate', 'partnerName', 'partnerCui',
      'partnerAddress', 'netAmount', 'vatRate', 'vatAmount', 'grossAmount', 'currency'
    ];

    const fieldStats: Record<string, { corrections: number; avgConfidence: number; total: number }> = {};

    for (const field of fieldNames) {
      fieldStats[field] = { corrections: 0, avgConfidence: 0, total: 0 };
    }

    for (const extraction of extractions) {
      const confidences = typeof extraction.confidences === 'string'
        ? JSON.parse(extraction.confidences)
        : (extraction.confidences || {});
      const editedFields = (extraction.editedFields as any[]) || [];

      for (const field of fieldNames) {
        fieldStats[field].total++;
        if (confidences[field]) {
          fieldStats[field].avgConfidence += confidences[field];
        }

        // Check if this field was corrected
        const wasEdited = editedFields.some(e =>
          (typeof e === 'string' && e === field) ||
          (typeof e === 'object' && e.fieldName === field)
        );
        if (wasEdited) {
          fieldStats[field].corrections++;
        }
      }
    }

    // Calculate averages and format results
    const results = Object.entries(fieldStats).map(([field, stats]) => ({
      field,
      displayName: this.fieldDisplayName(field),
      totalExtractions: stats.total,
      corrections: stats.corrections,
      correctionRate: stats.total > 0 ? Math.round((stats.corrections / stats.total) * 100) : 0,
      avgConfidence: stats.total > 0 ? Math.round((stats.avgConfidence / stats.total) * 100) : 0,
      status: this.getFieldStatus(stats.total > 0 ? (stats.corrections / stats.total) : 0),
    }));

    return {
      totalAnalyzed: extractions.length,
      fields: results.sort((a, b) => b.correctionRate - a.correctionRate),
      recommendations: this.generateFieldRecommendations(results),
    };
  }

  private fieldDisplayName(field: string): string {
    const names: Record<string, string> = {
      invoiceNumber: 'Numar factura',
      invoiceDate: 'Data factura',
      dueDate: 'Data scadenta',
      partnerName: 'Nume partener',
      partnerCui: 'CUI partener',
      partnerAddress: 'Adresa partener',
      netAmount: 'Suma neta',
      vatRate: 'Cota TVA',
      vatAmount: 'Valoare TVA',
      grossAmount: 'Total brut',
      currency: 'Moneda',
    };
    return names[field] || field;
  }

  private getFieldStatus(correctionRate: number): 'excellent' | 'good' | 'needs_attention' | 'poor' {
    if (correctionRate < 0.1) return 'excellent';
    if (correctionRate < 0.2) return 'good';
    if (correctionRate < 0.35) return 'needs_attention';
    return 'poor';
  }

  private generateFieldRecommendations(fields: any[]): string[] {
    const recommendations: string[] = [];

    const poorFields = fields.filter(f => f.status === 'poor');
    const needsAttention = fields.filter(f => f.status === 'needs_attention');

    if (poorFields.length > 0) {
      recommendations.push(
        `Campuri cu acuratete scazuta: ${poorFields.map(f => f.displayName).join(', ')}. Considerati ajustarea zonelor de template.`
      );
    }

    if (needsAttention.length > 0) {
      recommendations.push(
        `Campuri ce necesita atentie: ${needsAttention.map(f => f.displayName).join(', ')}. Verificati prompt-urile AI.`
      );
    }

    const avgConfidence = fields.reduce((sum, f) => sum + f.avgConfidence, 0) / fields.length;
    if (avgConfidence < 70) {
      recommendations.push('Increderea medie este sub 70%. Considerati imbunatatirea calitatii documentelor scanate.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Sistemul OCR functioneaza optim. Nu sunt necesare ajustari.');
    }

    return recommendations;
  }
}
