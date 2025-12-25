import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentType } from '@prisma/client';
import { CreateTemplateDto, UpdateTemplateDto } from '../dto/ocr.dto';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTemplateDto, userId?: string) {
    // Check for duplicate name
    const existing = await this.prisma.oCRTemplate.findFirst({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`Template with name "${dto.name}" already exists`);
    }

    const template = await this.prisma.oCRTemplate.create({
      data: {
        name: dto.name,
        description: dto.description,
        documentType: dto.documentType,
        language: dto.language || 'ro',
        zones: dto.zones as any,
        aiPrompt: dto.aiPrompt,
        matchPatterns: dto.matchPatterns as any,
        createdById: userId,
        isSystem: false,
      },
    });

    this.logger.log(`Created template: ${template.id}`);
    return template;
  }

  async findAll(filters?: { documentType?: DocumentType; language?: string }) {
    return this.prisma.oCRTemplate.findMany({
      where: {
        documentType: filters?.documentType,
        language: filters?.language,
      },
      orderBy: [
        { isSystem: 'desc' },
        { usageCount: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.oCRTemplate.findUnique({
      where: { id },
      include: {
        extractedFields: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!template) {
      throw new NotFoundException(`Template ${id} not found`);
    }

    return template;
  }

  async update(id: string, dto: UpdateTemplateDto) {
    const template = await this.prisma.oCRTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template ${id} not found`);
    }

    if (template.isSystem) {
      throw new ConflictException('Cannot modify system templates');
    }

    const updated = await this.prisma.oCRTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        documentType: dto.documentType,
        language: dto.language,
        zones: dto.zones as any,
        aiPrompt: dto.aiPrompt,
        matchPatterns: dto.matchPatterns as any,
      },
    });

    this.logger.log(`Updated template: ${id}`);
    return updated;
  }

  async remove(id: string) {
    const template = await this.prisma.oCRTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template ${id} not found`);
    }

    if (template.isSystem) {
      throw new ConflictException('Cannot delete system templates');
    }

    await this.prisma.oCRTemplate.delete({
      where: { id },
    });

    this.logger.log(`Deleted template: ${id}`);
    return { message: 'Template deleted successfully' };
  }

  async incrementUsage(id: string) {
    await this.prisma.oCRTemplate.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });
  }

  async autoMatch(rawText: string): Promise<string | null> {
    // Get all templates and filter client-side for non-null matchPatterns
    const allTemplates = await this.prisma.oCRTemplate.findMany();
    const templates = allTemplates.filter(t => t.matchPatterns !== null);

    for (const template of templates) {
      const patterns = template.matchPatterns as Record<string, string>;
      let matchScore = 0;
      let totalPatterns = 0;

      for (const [, pattern] of Object.entries(patterns)) {
        totalPatterns++;
        const regex = new RegExp(pattern, 'i');
        if (regex.test(rawText)) {
          matchScore++;
        }
      }

      // Match if more than 50% of patterns match
      if (totalPatterns > 0 && matchScore / totalPatterns > 0.5) {
        this.logger.log(`Auto-matched template: ${template.id} (${template.name})`);
        return template.id;
      }
    }

    return null;
  }

  async trainFromCorrections(templateId: string, applyChanges = false) {
    const template = await this.prisma.oCRTemplate.findUnique({
      where: { id: templateId },
      include: {
        extractedFields: {
          where: { wasManuallyEdited: true },
          take: 100,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    // Analyze correction patterns
    const corrections = template.extractedFields;
    const fieldStats: Record<string, { corrected: number; total: number; avgConfidence: number; commonPatterns: string[] }> = {};

    // Track common value patterns for learning
    const valuePatterns: Record<string, string[]> = {};

    for (const extraction of corrections) {
      const editedFields = (extraction.editedFields as any[]) || [];
      const confidences = extraction.confidences as Record<string, number> || {};

      for (const edit of editedFields) {
        const field = typeof edit === 'string' ? edit : edit.fieldName;
        const correctedValue = typeof edit === 'object' ? edit.correctedValue : null;

        if (!fieldStats[field]) {
          fieldStats[field] = { corrected: 0, total: 0, avgConfidence: 0, commonPatterns: [] };
          valuePatterns[field] = [];
        }
        fieldStats[field].corrected++;
        fieldStats[field].total++;
        fieldStats[field].avgConfidence += confidences[field] || 0;

        if (correctedValue) {
          valuePatterns[field].push(correctedValue);
        }
      }
    }

    // Calculate averages and extract patterns
    for (const [field, stats] of Object.entries(fieldStats)) {
      if (stats.total > 0) {
        stats.avgConfidence = stats.avgConfidence / stats.total;
      }
      // Extract common patterns from corrected values
      const patterns = this.extractPatterns(valuePatterns[field] || []);
      stats.commonPatterns = patterns;
    }

    // Identify fields with high correction rates (>30% corrections)
    const problematicFields = Object.entries(fieldStats)
      .filter(([, stats]) => stats.total > 0 && stats.corrected / stats.total > 0.3)
      .map(([field, stats]) => ({
        field,
        correctionRate: Math.round((stats.corrected / stats.total) * 100),
        avgConfidence: Math.round(stats.avgConfidence * 100),
        suggestedPatterns: stats.commonPatterns,
      }));

    // Generate recommendations
    const recommendations: string[] = [];
    if (problematicFields.length > 0) {
      recommendations.push(`Campuri cu rata mare de corectii: ${problematicFields.map(f => f.field).join(', ')}`);
    }
    if (corrections.length < 10) {
      recommendations.push('Necesita mai multe documente procesate pentru antrenare eficienta (recomandat: 10+)');
    }

    // Calculate overall accuracy
    const totalCorrections = Object.values(fieldStats).reduce((sum, s) => sum + s.corrected, 0);
    const totalFields = Object.values(fieldStats).reduce((sum, s) => sum + s.total, 0);
    const accuracyRate = totalFields > 0 ? Math.round(((totalFields - totalCorrections) / totalFields) * 100) : 100;

    // If applyChanges is true and there are learnings, update the template
    let appliedChanges: string[] = [];
    if (applyChanges && !template.isSystem && problematicFields.length > 0) {
      const currentZones = (template.zones as Record<string, any>) || {};
      const updatedZones = { ...currentZones };

      // Adjust zones based on learnings (expand zones for problematic fields)
      for (const pf of problematicFields) {
        if (updatedZones[pf.field]) {
          // Expand zone by 10% to capture more content
          const zone = updatedZones[pf.field];
          updatedZones[pf.field] = {
            ...zone,
            width: Math.min(100, (zone.width || 20) * 1.1),
            height: Math.min(100, (zone.height || 10) * 1.1),
          };
          appliedChanges.push(`Expanded zone for ${pf.field}`);
        }
      }

      // Update match patterns if common patterns found
      const currentPatterns = (template.matchPatterns as Record<string, string>) || {};
      const updatedPatterns = { ...currentPatterns };
      for (const pf of problematicFields) {
        if (pf.suggestedPatterns.length > 0) {
          const patternKey = `learned_${pf.field}`;
          updatedPatterns[patternKey] = pf.suggestedPatterns.slice(0, 3).join('|');
          appliedChanges.push(`Added pattern for ${pf.field}`);
        }
      }

      if (appliedChanges.length > 0) {
        await this.prisma.oCRTemplate.update({
          where: { id: templateId },
          data: {
            zones: updatedZones,
            matchPatterns: updatedPatterns,
          },
        });
        this.logger.log(`Applied ${appliedChanges.length} training changes to template ${templateId}`);
      }
    }

    this.logger.log(`Training template ${templateId}: ${corrections.length} corrections analyzed, accuracy ${accuracyRate}%`);

    return {
      templateId,
      templateName: template.name,
      totalDocumentsAnalyzed: corrections.length,
      totalCorrections,
      accuracyRate,
      fieldStats: Object.fromEntries(
        Object.entries(fieldStats).map(([k, v]) => [k, {
          correctionRate: v.total > 0 ? Math.round((v.corrected / v.total) * 100) : 0,
          avgConfidence: Math.round(v.avgConfidence * 100),
        }])
      ),
      problematicFields,
      recommendations,
      appliedChanges,
      canApplyChanges: !template.isSystem && problematicFields.length > 0,
    };
  }

  private extractPatterns(values: string[]): string[] {
    if (values.length === 0) return [];

    // Extract common substrings or regex patterns
    const patterns: string[] = [];

    // Check for common prefixes
    if (values.length >= 2) {
      const commonPrefix = this.findCommonPrefix(values);
      if (commonPrefix.length >= 2) {
        patterns.push(`^${this.escapeRegex(commonPrefix)}`);
      }
    }

    // Check for common numeric patterns
    const numericPattern = values.every(v => /^\d+$/.test(v.replace(/[^0-9]/g, '')));
    if (numericPattern) {
      patterns.push('\\d+');
    }

    // Check for date patterns
    const datePattern = values.every(v => /\d{2,4}[-\/\.]\d{2}[-\/\.]\d{2,4}/.test(v));
    if (datePattern) {
      patterns.push('\\d{2,4}[-/.]\\d{2}[-/.]\\d{2,4}');
    }

    return patterns.slice(0, 3); // Max 3 patterns
  }

  private findCommonPrefix(strings: string[]): string {
    if (strings.length === 0) return '';
    let prefix = strings[0];
    for (let i = 1; i < strings.length; i++) {
      while (strings[i].indexOf(prefix) !== 0) {
        prefix = prefix.substring(0, prefix.length - 1);
        if (prefix === '') return '';
      }
    }
    return prefix;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async seedSystemTemplates() {
    const systemTemplates = [
      {
        name: 'Factura Fiscala Romania',
        description: 'Standard Romanian tax invoice template',
        documentType: DocumentType.INVOICE,
        language: 'ro',
        zones: {
          invoiceNumber: { x: 60, y: 10, width: 30, height: 8 },
          invoiceDate: { x: 60, y: 18, width: 30, height: 6 },
          supplierName: { x: 5, y: 25, width: 45, height: 10 },
          supplierCui: { x: 5, y: 35, width: 25, height: 5 },
          customerName: { x: 55, y: 25, width: 45, height: 10 },
          customerCui: { x: 55, y: 35, width: 25, height: 5 },
          netAmount: { x: 70, y: 75, width: 25, height: 5 },
          vatAmount: { x: 70, y: 80, width: 25, height: 5 },
          grossAmount: { x: 70, y: 85, width: 25, height: 5 },
        },
        matchPatterns: {
          romanianInvoice: 'FACTURA|SERIE|NR\\.',
          cui: 'CUI|CIF|RO\\d{8}',
          tva: 'TVA|T\\.V\\.A\\.',
        },
        isSystem: true,
      },
      {
        name: 'German Invoice (Rechnung)',
        description: 'Standard German invoice template',
        documentType: DocumentType.INVOICE,
        language: 'de',
        zones: {
          invoiceNumber: { x: 60, y: 10, width: 30, height: 8 },
          invoiceDate: { x: 60, y: 18, width: 30, height: 6 },
          supplierName: { x: 5, y: 25, width: 45, height: 10 },
          supplierCui: { x: 5, y: 35, width: 25, height: 5 },
          customerName: { x: 55, y: 25, width: 45, height: 10 },
          customerCui: { x: 55, y: 35, width: 25, height: 5 },
          netAmount: { x: 70, y: 75, width: 25, height: 5 },
          vatAmount: { x: 70, y: 80, width: 25, height: 5 },
          grossAmount: { x: 70, y: 85, width: 25, height: 5 },
        },
        matchPatterns: {
          germanInvoice: 'RECHNUNG|Rechnungsnummer',
          ustId: 'USt-IdNr|DE\\d{9}',
          mwst: 'MwSt|Mehrwertsteuer',
        },
        isSystem: true,
      },
      {
        name: 'Bon Fiscal Romania',
        description: 'Romanian fiscal receipt template',
        documentType: DocumentType.RECEIPT,
        language: 'ro',
        zones: {
          storeName: { x: 10, y: 5, width: 80, height: 10 },
          receiptNumber: { x: 10, y: 15, width: 50, height: 5 },
          receiptDate: { x: 60, y: 15, width: 35, height: 5 },
          cashRegisterNo: { x: 10, y: 20, width: 40, height: 5 },
          totalAmount: { x: 50, y: 80, width: 40, height: 8 },
        },
        matchPatterns: {
          bonFiscal: 'BON FISCAL|BON NR',
          casaMarcat: 'CASA DE MARCAT|NR\\. APARAT',
        },
        isSystem: true,
      },
    ];

    for (const template of systemTemplates) {
      const existing = await this.prisma.oCRTemplate.findFirst({
        where: { name: template.name, isSystem: true },
      });

      if (!existing) {
        await this.prisma.oCRTemplate.create({
          data: template,
        });
        this.logger.log(`Created system template: ${template.name}`);
      }
    }
  }
}
