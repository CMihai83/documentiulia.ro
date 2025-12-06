import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTaxCodeDto, UpdateTaxCodeDto, TaxCodeFilterDto } from './dto/tax-code.dto';
import { TaxType } from '@prisma/client';

// Romanian Fiscal Reform 2025-2026 Dates
const VAT_REFORM_DATE = new Date('2025-08-01');
const DIVIDEND_REFORM_DATE = new Date('2026-01-01');

export interface VatRateInfo {
  standard: number;
  reduced: number;
  superReduced: number;
  dividendTax: number;
  effectiveDate: Date;
  isCurrentlyActive: boolean;
}

export interface FiscalComplianceStatus {
  currentVatRegime: '2024' | '2025-transitional' | '2026';
  applicableRates: VatRateInfo;
  upcomingChanges: Array<{ date: Date; description: string; impact: string }>;
  complianceChecklist: Array<{ item: string; status: 'compliant' | 'action-required' | 'pending' }>;
}

@Injectable()
export class TaxCodesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, dto: CreateTaxCodeDto) {
    // Check if code already exists for this company
    const existing = await this.prisma.taxCode.findUnique({
      where: {
        companyId_code: { companyId, code: dto.code },
      },
    });

    if (existing) {
      throw new ConflictException(`Codul de taxă ${dto.code} există deja`);
    }

    // If setting as default, unset other defaults of same type
    if (dto.isDefault) {
      await this.prisma.taxCode.updateMany({
        where: { companyId, type: dto.type, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.taxCode.create({
      data: {
        companyId,
        code: dto.code,
        name: dto.name,
        rate: dto.rate,
        type: dto.type,
        saftCode: dto.saftCode,
        isDefault: dto.isDefault || false,
      },
    });
  }

  async findAll(companyId: string, filters: TaxCodeFilterDto) {
    const where: any = { companyId };

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return this.prisma.taxCode.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { code: 'asc' }],
    });
  }

  async findOne(companyId: string, id: string) {
    const taxCode = await this.prisma.taxCode.findFirst({
      where: { id, companyId },
    });

    if (!taxCode) {
      throw new NotFoundException('Codul de taxă nu a fost găsit');
    }

    return taxCode;
  }

  async findByCode(companyId: string, code: string) {
    const taxCode = await this.prisma.taxCode.findUnique({
      where: {
        companyId_code: { companyId, code },
      },
    });

    if (!taxCode) {
      throw new NotFoundException(`Codul de taxă ${code} nu a fost găsit`);
    }

    return taxCode;
  }

  async getDefault(companyId: string, type: TaxType) {
    return this.prisma.taxCode.findFirst({
      where: { companyId, type, isDefault: true, isActive: true },
    });
  }

  async update(companyId: string, id: string, dto: UpdateTaxCodeDto) {
    const taxCode = await this.findOne(companyId, id);

    // If setting as default, unset other defaults of same type
    if (dto.isDefault) {
      await this.prisma.taxCode.updateMany({
        where: {
          companyId,
          type: (dto.type as TaxType) || taxCode.type,
          isDefault: true,
          id: { not: id },
        },
        data: { isDefault: false },
      });
    }

    return this.prisma.taxCode.update({
      where: { id },
      data: dto,
    });
  }

  async delete(companyId: string, id: string) {
    await this.findOne(companyId, id);

    await this.prisma.taxCode.delete({ where: { id } });
    return { message: 'Codul de taxă a fost șters' };
  }

  async setDefault(companyId: string, id: string) {
    const taxCode = await this.findOne(companyId, id);

    // Unset current default of same type
    await this.prisma.taxCode.updateMany({
      where: { companyId, type: taxCode.type, isDefault: true },
      data: { isDefault: false },
    });

    return this.prisma.taxCode.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  // Initialize default Romanian tax codes for a company (2026 compliant)
  async initializeDefaults(companyId: string) {
    const now = new Date();
    const useNewRates = now >= VAT_REFORM_DATE;
    const useDividend2026 = now >= DIVIDEND_REFORM_DATE;

    const defaultCodes: Array<{
      code: string;
      name: string;
      rate: number;
      type: TaxType;
      saftCode: string;
      isDefault?: boolean;
      validFrom?: Date;
      validUntil?: Date;
    }> = [
      // Current/Legacy rates (valid until Aug 2025)
      { code: 'TVA19', name: 'TVA 19%', rate: 19, type: TaxType.VAT_STANDARD, saftCode: 'S', isDefault: !useNewRates, validUntil: VAT_REFORM_DATE },
      { code: 'TVA9', name: 'TVA 9%', rate: 9, type: TaxType.VAT_REDUCED_9, saftCode: 'R9', validUntil: VAT_REFORM_DATE },

      // 2026 rates (valid from Aug 2025)
      { code: 'TVA21', name: 'TVA 21% (2026)', rate: 21, type: TaxType.VAT_STANDARD_21, saftCode: 'S21', isDefault: useNewRates, validFrom: VAT_REFORM_DATE },
      { code: 'TVA11', name: 'TVA 11% (2026)', rate: 11, type: TaxType.VAT_REDUCED_11, saftCode: 'R11', validFrom: VAT_REFORM_DATE },

      // Unchanged rates
      { code: 'TVA5', name: 'TVA 5%', rate: 5, type: TaxType.VAT_REDUCED_5, saftCode: 'R5' },
      { code: 'TVA0', name: 'TVA 0%', rate: 0, type: TaxType.VAT_ZERO, saftCode: 'Z' },
      { code: 'SCUTIT', name: 'Scutit de TVA', rate: 0, type: TaxType.VAT_EXEMPT, saftCode: 'E' },

      // Dividend tax
      { code: 'DIV8', name: 'Impozit dividende 8%', rate: 8, type: TaxType.DIVIDEND_TAX, saftCode: 'DIV8', isDefault: !useDividend2026, validUntil: DIVIDEND_REFORM_DATE },
      { code: 'DIV10', name: 'Impozit dividende 10% (2026)', rate: 10, type: TaxType.DIVIDEND_TAX, saftCode: 'DIV10', isDefault: useDividend2026, validFrom: DIVIDEND_REFORM_DATE },
    ];

    const results: Array<Awaited<ReturnType<typeof this.prisma.taxCode.create>>> = [];
    for (const code of defaultCodes) {
      const existing = await this.prisma.taxCode.findUnique({
        where: { companyId_code: { companyId, code: code.code } },
      });

      if (!existing) {
        const created = await this.prisma.taxCode.create({
          data: {
            companyId,
            code: code.code,
            name: code.name,
            rate: code.rate,
            type: code.type,
            saftCode: code.saftCode,
            isDefault: code.isDefault || false,
          },
        });
        results.push(created);
      }
    }

    return { initialized: results.length, taxCodes: results };
  }

  // Get applicable VAT rate based on transaction date (2026 compliant)
  getApplicableVatRate(transactionDate: Date, rateType: 'standard' | 'reduced' | 'super-reduced' = 'standard'): number {
    const isAfterReform = transactionDate >= VAT_REFORM_DATE;

    switch (rateType) {
      case 'standard':
        return isAfterReform ? 21 : 19;
      case 'reduced':
        return isAfterReform ? 11 : 9;
      case 'super-reduced':
        return 5; // Unchanged
      default:
        return isAfterReform ? 21 : 19;
    }
  }

  // Get dividend tax rate based on date
  getDividendTaxRate(distributionDate: Date): number {
    return distributionDate >= DIVIDEND_REFORM_DATE ? 10 : 8;
  }

  // Get comprehensive fiscal compliance status
  getFiscalComplianceStatus(): FiscalComplianceStatus {
    const now = new Date();
    let regime: '2024' | '2025-transitional' | '2026';

    if (now < VAT_REFORM_DATE) {
      regime = '2024';
    } else if (now < DIVIDEND_REFORM_DATE) {
      regime = '2025-transitional';
    } else {
      regime = '2026';
    }

    const applicableRates: VatRateInfo = {
      standard: this.getApplicableVatRate(now, 'standard'),
      reduced: this.getApplicableVatRate(now, 'reduced'),
      superReduced: 5,
      dividendTax: this.getDividendTaxRate(now),
      effectiveDate: now >= VAT_REFORM_DATE ? VAT_REFORM_DATE : new Date('2024-01-01'),
      isCurrentlyActive: true,
    };

    const upcomingChanges: FiscalComplianceStatus['upcomingChanges'] = [];

    if (now < VAT_REFORM_DATE) {
      upcomingChanges.push({
        date: VAT_REFORM_DATE,
        description: 'TVA standard crește la 21%, TVA redus la 11%',
        impact: 'Actualizare facturi, sisteme contabile, prețuri',
      });
    }

    if (now < DIVIDEND_REFORM_DATE) {
      upcomingChanges.push({
        date: DIVIDEND_REFORM_DATE,
        description: 'Impozit dividende crește la 10%',
        impact: 'Planificare distribuire dividende, actualizare declarații',
      });
    }

    upcomingChanges.push({
      date: new Date('2026-07-01'),
      description: 'e-Factura B2B devine obligatorie',
      impact: 'Integrare completă SPV ANAF, toate tranzacțiile B2B',
    });

    const complianceChecklist: FiscalComplianceStatus['complianceChecklist'] = [
      { item: 'Rate TVA 2026 configurate', status: regime === '2026' ? 'compliant' : 'pending' },
      { item: 'e-Factura B2C activ', status: 'compliant' },
      { item: 'e-Factura B2B activ', status: now >= new Date('2026-07-01') ? 'action-required' : 'pending' },
      { item: 'SAF-T D406 actualizat', status: 'compliant' },
      { item: 'Certificat digital ANAF valid', status: 'action-required' },
    ];

    return {
      currentVatRegime: regime,
      applicableRates,
      upcomingChanges,
      complianceChecklist,
    };
  }

  // Auto-select correct tax code based on transaction date
  async getApplicableTaxCode(
    companyId: string,
    transactionDate: Date,
    rateType: 'standard' | 'reduced' | 'super-reduced' | 'zero' | 'exempt' = 'standard',
  ) {
    const isAfterReform = transactionDate >= VAT_REFORM_DATE;
    let targetType: TaxType;

    switch (rateType) {
      case 'standard':
        targetType = isAfterReform ? TaxType.VAT_STANDARD_21 : TaxType.VAT_STANDARD;
        break;
      case 'reduced':
        targetType = isAfterReform ? TaxType.VAT_REDUCED_11 : TaxType.VAT_REDUCED_9;
        break;
      case 'super-reduced':
        targetType = TaxType.VAT_REDUCED_5;
        break;
      case 'zero':
        targetType = TaxType.VAT_ZERO;
        break;
      case 'exempt':
        targetType = TaxType.VAT_EXEMPT;
        break;
      default:
        targetType = isAfterReform ? TaxType.VAT_STANDARD_21 : TaxType.VAT_STANDARD;
    }

    const taxCode = await this.prisma.taxCode.findFirst({
      where: { companyId, type: targetType, isActive: true },
    });

    if (!taxCode) {
      // Fallback to any active standard rate
      return this.getDefault(companyId, TaxType.VAT_STANDARD);
    }

    return taxCode;
  }

  // Get VAT rates summary for reports
  async getVatSummary(companyId: string) {
    const vatCodes = await this.prisma.taxCode.findMany({
      where: {
        companyId,
        isActive: true,
        type: { in: [TaxType.VAT_STANDARD, TaxType.VAT_REDUCED_9, TaxType.VAT_REDUCED_5, TaxType.VAT_ZERO, TaxType.VAT_EXEMPT] },
      },
      orderBy: { rate: 'desc' },
    });

    return vatCodes.map((code) => ({
      code: code.code,
      name: code.name,
      rate: code.rate.toNumber(),
      saftCode: code.saftCode,
      isDefault: code.isDefault,
    }));
  }
}
