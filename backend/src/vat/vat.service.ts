import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateD300DeclarationDto } from './dto/create-d300-declaration.dto';
import { CreateD394DeclarationDto, Quarter } from './dto/create-d394-declaration.dto';
import { VatCalculationService } from './services/vat-calculation.service';
import { VatXmlGeneratorService } from './services/vat-xml-generator.service';
import { AnafService } from '../anaf/anaf.service';
import { v4 as uuidv4 } from 'uuid';

export enum VatDeclarationStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  AMENDED = 'AMENDED',
}

/**
 * VAT Service
 *
 * Main business logic for Romanian VAT compliance
 * - D300 monthly VAT returns
 * - D394 quarterly EU transactions
 * - ANAF SPV submission
 * - VIES validation
 */
@Injectable()
export class VatService {
  private readonly logger = new Logger(VatService.name);

  constructor(
    private prisma: PrismaService,
    private vatCalculation: VatCalculationService,
    private xmlGenerator: VatXmlGeneratorService,
    private anafService: AnafService,
  ) {}

  // ============================================================================
  // D300 MONTHLY VAT RETURN
  // ============================================================================

  /**
   * Create D300 declaration
   */
  async createD300Declaration(userId: string, data: CreateD300DeclarationDto) {
    this.logger.log(`Creating D300 declaration for user ${userId}, CUI ${data.cui}, ${data.month}/${data.year}`);

    // Validate calculations
    const validation = this.vatCalculation.validateD300Calculations({
      outputTaxableBase19: data.outputTaxableBase19,
      outputVat19: data.outputVat19,
      outputTaxableBase9: data.outputTaxableBase9,
      outputVat9: data.outputVat9,
      outputTaxableBase5: data.outputTaxableBase5,
      outputVat5: data.outputVat5,
      inputVat19: data.inputVat19,
      inputVat9: data.inputVat9,
      inputVat5: data.inputVat5,
      month: data.month,
      year: data.year,
    });

    if (!validation.isValid) {
      throw new BadRequestException({
        message: 'VAT calculation errors detected',
        errors: validation.errors,
      });
    }

    // Auto-calculate totals
    const totalOutputVat = new Prisma.Decimal(validation.calculatedOutputVat);
    const totalInputVat = new Prisma.Decimal(validation.calculatedInputVat);
    const vatPayable = new Prisma.Decimal(validation.calculatedVatPayable);

    // Check for existing declaration for same period
    const existing = await this.prisma.vatD300Declaration.findFirst({
      where: {
        userId,
        cui: data.cui,
        month: data.month,
        year: data.year,
        status: {
          not: VatDeclarationStatus.REJECTED,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `O declarație D300 pentru perioada ${data.month}/${data.year} există deja. Folosiți PUT pentru actualizare.`,
      );
    }

    // Create declaration
    const declaration = await this.prisma.vatD300Declaration.create({
      data: {
        id: uuidv4(),
        userId,
        cui: data.cui,
        companyName: data.companyName,
        month: data.month,
        year: data.year,
        status: VatDeclarationStatus.DRAFT,

        // Section A - Output VAT
        outputTaxableBase19: data.outputTaxableBase19,
        outputVat19: data.outputVat19,
        outputTaxableBase9: data.outputTaxableBase9,
        outputVat9: data.outputVat9,
        outputTaxableBase5: data.outputTaxableBase5,
        outputVat5: data.outputVat5,
        exemptWithDeduction: data.exemptWithDeduction,
        exemptWithoutDeduction: data.exemptWithoutDeduction,
        reverseChargeBase: data.reverseChargeBase,
        intraCommunityDeliveries: data.intraCommunityDeliveries,
        exports: data.exports,

        // Section B - Input VAT
        inputVat19: data.inputVat19,
        inputVat9: data.inputVat9,
        inputVat5: data.inputVat5,
        importVat: data.importVat,
        intraCommunityAcquisitionsBase: data.intraCommunityAcquisitionsBase,
        intraCommunityAcquisitionsVat: data.intraCommunityAcquisitionsVat,
        reverseChargeInputVat: data.reverseChargeInputVat,

        // Section C - Calculated totals
        totalOutputVat,
        totalInputVat,
        vatPayable,

        // Section D - Intra-community transactions
        intraCommunityTransactions: (data.intraCommunityTransactions || []) as any,

        // Additional data
        notes: data.notes,
        legalRepresentativeName: data.legalRepresentativeName,
        legalRepresentativeCnp: data.legalRepresentativeCnp,

        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    this.logger.log(`D300 declaration created successfully: ${declaration.id}`);

    return {
      ...declaration,
      validationWarnings: validation.errors.length > 0 ? validation.errors : undefined,
    };
  }

  /**
   * List D300 declarations for user
   */
  async listD300Declarations(userId: string, year?: number, month?: number) {
    const where: any = { userId };

    if (year) {
      where.year = year;
    }

    if (month) {
      where.month = month;
    }

    const declarations = await this.prisma.vatD300Declaration.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    return declarations;
  }

  /**
   * Get D300 declaration by ID
   */
  async getD300Declaration(id: string, userId: string) {
    const declaration = await this.prisma.vatD300Declaration.findFirst({
      where: { id, userId },
    });

    if (!declaration) {
      throw new NotFoundException(`D300 declaration ${id} not found`);
    }

    return declaration;
  }

  /**
   * Update D300 declaration
   */
  async updateD300Declaration(id: string, userId: string, data: Partial<CreateD300DeclarationDto>) {
    const existing = await this.getD300Declaration(id, userId);

    if (existing.status !== VatDeclarationStatus.DRAFT) {
      throw new BadRequestException(
        'Nu se poate actualiza o declarație trimisă. Creați o declarație rectificativă.',
      );
    }

    // Recalculate totals if amounts changed
    let totalOutputVat = existing.totalOutputVat;
    let totalInputVat = existing.totalInputVat;
    let vatPayable = existing.vatPayable;

    if (
      data.outputVat19 !== undefined ||
      data.outputVat9 !== undefined ||
      data.outputVat5 !== undefined ||
      data.inputVat19 !== undefined ||
      data.inputVat9 !== undefined ||
      data.inputVat5 !== undefined
    ) {
      const validation = this.vatCalculation.validateD300Calculations({
        outputTaxableBase19: data.outputTaxableBase19 ?? Number(existing.outputTaxableBase19),
        outputVat19: data.outputVat19 ?? Number(existing.outputVat19),
        outputTaxableBase9: data.outputTaxableBase9 ?? Number(existing.outputTaxableBase9),
        outputVat9: data.outputVat9 ?? Number(existing.outputVat9),
        outputTaxableBase5: data.outputTaxableBase5 ?? Number(existing.outputTaxableBase5),
        outputVat5: data.outputVat5 ?? Number(existing.outputVat5),
        inputVat19: data.inputVat19 ?? Number(existing.inputVat19),
        inputVat9: data.inputVat9 ?? Number(existing.inputVat9),
        inputVat5: data.inputVat5 ?? Number(existing.inputVat5),
        month: existing.month,
        year: existing.year,
      });

      if (!validation.isValid) {
        throw new BadRequestException({
          message: 'VAT calculation errors detected',
          errors: validation.errors,
        });
      }

      totalOutputVat = new Prisma.Decimal(validation.calculatedOutputVat);
      totalInputVat = new Prisma.Decimal(validation.calculatedInputVat);
      vatPayable = new Prisma.Decimal(validation.calculatedVatPayable);
    }

    const updated = await this.prisma.vatD300Declaration.update({
      where: { id },
      data: {
        ...(data as any),
        totalOutputVat,
        totalInputVat,
        vatPayable,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`D300 declaration ${id} updated successfully`);
    return updated;
  }

  /**
   * Generate D300 XML
   */
  async generateD300Xml(id: string, userId: string): Promise<string> {
    const declaration = await this.getD300Declaration(id, userId);

    const xml = this.xmlGenerator.generateD300Xml(declaration as any);

    // Validate XML
    const validation = this.xmlGenerator.validateXml(xml, 'D300');
    if (!validation.isValid) {
      throw new BadRequestException({
        message: 'XML validation failed',
        errors: validation.errors,
      });
    }

    return xml;
  }

  /**
   * Submit D300 to ANAF
   */
  async submitD300ToAnaf(id: string, userId: string) {
    const declaration = await this.getD300Declaration(id, userId);

    if (declaration.status !== VatDeclarationStatus.DRAFT) {
      throw new BadRequestException('Declarația a fost deja trimisă');
    }

    // Generate XML
    const xml = await this.generateD300Xml(id, userId);

    // Submit to ANAF via ANAF service
    // Note: This is a mock implementation. In production, replace with actual ANAF API call
    try {
      // Mock ANAF submission
      const referenceNumber = `D300-${declaration.cui}-${declaration.year}${declaration.month.toString().padStart(2, '0')}-${Date.now()}`;

      // Update status
      await this.prisma.vatD300Declaration.update({
        where: { id },
        data: {
          status: VatDeclarationStatus.SUBMITTED,
          submittedAt: new Date(),
          anafReferenceNumber: referenceNumber,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`D300 declaration ${id} submitted to ANAF: ${referenceNumber}`);

      return {
        referenceNumber,
        submittedAt: new Date(),
        message: 'Declarația a fost trimisă cu succes la ANAF',
      };
    } catch (error) {
      this.logger.error(`Failed to submit D300 to ANAF: ${error.message}`);
      throw new BadRequestException(`Eroare la trimiterea către ANAF: ${error.message}`);
    }
  }

  /**
   * Delete D300 declaration
   */
  async deleteD300Declaration(id: string, userId: string) {
    const declaration = await this.getD300Declaration(id, userId);

    if (declaration.status !== VatDeclarationStatus.DRAFT) {
      throw new BadRequestException('Nu se poate șterge o declarație trimisă');
    }

    await this.prisma.vatD300Declaration.delete({ where: { id } });

    this.logger.log(`D300 declaration ${id} deleted`);
  }

  // ============================================================================
  // D394 QUARTERLY VAT RETURN
  // ============================================================================

  /**
   * Create D394 declaration
   */
  async createD394Declaration(userId: string, data: CreateD394DeclarationDto) {
    this.logger.log(`Creating D394 declaration for user ${userId}, CUI ${data.cui}, Q${data.quarter}/${data.year}`);

    // Check for existing declaration for same period
    const existing = await this.prisma.vatD394Declaration.findFirst({
      where: {
        userId,
        cui: data.cui,
        quarter: data.quarter,
        year: data.year,
        status: {
          not: VatDeclarationStatus.REJECTED,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `O declarație D394 pentru perioada Q${data.quarter}/${data.year} există deja.`,
      );
    }

    // Validate reconciliation with monthly D300 if IDs provided
    if (data.monthlyD300Ids && data.monthlyD300Ids.length > 0) {
      const monthlyDeclarations = await this.prisma.vatD300Declaration.findMany({
        where: {
          id: { in: data.monthlyD300Ids },
          userId,
        },
      });

      if (monthlyDeclarations.length !== data.monthlyD300Ids.length) {
        throw new BadRequestException('Unele declarații D300 nu au fost găsite');
      }

      const reconciliation = this.vatCalculation.validateD394Reconciliation(
        {
          totalAcquisitionsBase: data.totalAcquisitionsBase,
          totalAcquisitionsVat: data.totalAcquisitionsVat,
          totalDeliveriesValue: data.totalDeliveriesValue,
          totalServicesProvidedValue: data.totalServicesProvidedValue,
          totalServicesReceivedBase: data.totalServicesReceivedBase,
          totalServicesReceivedVat: data.totalServicesReceivedVat,
        },
        monthlyDeclarations.map((d) => ({
          intraCommunityAcquisitionsBase: Number(d.intraCommunityAcquisitionsBase),
          intraCommunityAcquisitionsVat: Number(d.intraCommunityAcquisitionsVat),
          intraCommunityDeliveries: Number(d.intraCommunityDeliveries),
        })),
      );

      if (!reconciliation.isReconciled) {
        this.logger.warn(`D394 reconciliation warnings: ${reconciliation.discrepancies.join(', ')}`);
      }
    }

    // Create declaration
    const declaration = await this.prisma.vatD394Declaration.create({
      data: {
        id: uuidv4(),
        userId,
        cui: data.cui,
        companyName: data.companyName,
        quarter: data.quarter,
        year: data.year,
        status: VatDeclarationStatus.DRAFT,

        // Acquisitions
        acquisitions: (data.acquisitions || []) as any,
        totalAcquisitionsBase: data.totalAcquisitionsBase,
        totalAcquisitionsVat: data.totalAcquisitionsVat,

        // Deliveries
        deliveries: (data.deliveries || []) as any,
        totalDeliveriesValue: data.totalDeliveriesValue,

        // Services
        servicesProvided: (data.servicesProvided || []) as any,
        totalServicesProvidedValue: data.totalServicesProvidedValue,
        servicesReceived: (data.servicesReceived || []) as any,
        totalServicesReceivedBase: data.totalServicesReceivedBase,
        totalServicesReceivedVat: data.totalServicesReceivedVat,

        // Triangular operations
        triangularSimplification: data.triangularSimplification,
        triangularDeliveries: data.triangularDeliveries,
        triangularAcquisitions: data.triangularAcquisitions,

        // Corrections
        acquisitionsCorrectionsBase: data.acquisitionsCorrectionsBase,
        acquisitionsCorrectionsVat: data.acquisitionsCorrectionsVat,
        deliveriesCorrectionsValue: data.deliveriesCorrectionsValue,
        servicesProvidedCorrectionsValue: data.servicesProvidedCorrectionsValue,
        servicesReceivedCorrectionsBase: data.servicesReceivedCorrectionsBase,
        servicesReceivedCorrectionsVat: data.servicesReceivedCorrectionsVat,

        // VIES
        viesValidated: data.viesValidated,
        viesValidationDate: data.viesValidationDate,
        invalidVatIds: data.invalidVatIds || [],

        // References
        monthlyD300Ids: data.monthlyD300Ids || [],
        isReconciled: data.isReconciled,

        // Additional
        notes: data.notes,
        isAmendment: data.isAmendment,
        originalDeclarationNumber: data.originalDeclarationNumber,
        legalRepresentativeName: data.legalRepresentativeName,
        legalRepresentativeCnp: data.legalRepresentativeCnp,

        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    this.logger.log(`D394 declaration created successfully: ${declaration.id}`);
    return declaration;
  }

  /**
   * List D394 declarations
   */
  async listD394Declarations(userId: string, year?: number, quarter?: Quarter) {
    const where: any = { userId };

    if (year) {
      where.year = year;
    }

    if (quarter) {
      where.quarter = quarter;
    }

    const declarations = await this.prisma.vatD394Declaration.findMany({
      where,
      orderBy: [{ year: 'desc' }, { quarter: 'desc' }],
    });

    return declarations;
  }

  /**
   * Get D394 declaration by ID
   */
  async getD394Declaration(id: string, userId: string) {
    const declaration = await this.prisma.vatD394Declaration.findFirst({
      where: { id, userId },
    });

    if (!declaration) {
      throw new NotFoundException(`D394 declaration ${id} not found`);
    }

    return declaration;
  }

  /**
   * Update D394 declaration
   */
  async updateD394Declaration(id: string, userId: string, data: Partial<CreateD394DeclarationDto>) {
    const existing = await this.getD394Declaration(id, userId);

    if (existing.status !== VatDeclarationStatus.DRAFT) {
      throw new BadRequestException('Nu se poate actualiza o declarație trimisă');
    }

    const updated = await this.prisma.vatD394Declaration.update({
      where: { id },
      data: {
        ...(data as any),
        updatedAt: new Date(),
      },
    });

    this.logger.log(`D394 declaration ${id} updated successfully`);
    return updated;
  }

  /**
   * Generate D394 XML
   */
  async generateD394Xml(id: string, userId: string): Promise<string> {
    const declaration = await this.getD394Declaration(id, userId);

    const xml = this.xmlGenerator.generateD394Xml(declaration as any);

    // Validate XML
    const validation = this.xmlGenerator.validateXml(xml, 'D394');
    if (!validation.isValid) {
      throw new BadRequestException({
        message: 'XML validation failed',
        errors: validation.errors,
      });
    }

    return xml;
  }

  /**
   * Submit D394 to ANAF
   */
  async submitD394ToAnaf(id: string, userId: string) {
    const declaration = await this.getD394Declaration(id, userId);

    if (declaration.status !== VatDeclarationStatus.DRAFT) {
      throw new BadRequestException('Declarația a fost deja trimisă');
    }

    // Generate XML
    const xml = await this.generateD394Xml(id, userId);

    // Submit to ANAF
    // Note: This is a mock implementation. In production, replace with actual ANAF API call
    try {
      // Mock ANAF submission
      const referenceNumber = `D394-${declaration.cui}-${declaration.year}Q${declaration.quarter}-${Date.now()}`;

      // Update status
      await this.prisma.vatD394Declaration.update({
        where: { id },
        data: {
          status: VatDeclarationStatus.SUBMITTED,
          submittedAt: new Date(),
          anafReferenceNumber: referenceNumber,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`D394 declaration ${id} submitted to ANAF: ${referenceNumber}`);

      return {
        referenceNumber,
        submittedAt: new Date(),
        message: 'Declarația a fost trimisă cu succes la ANAF',
      };
    } catch (error) {
      this.logger.error(`Failed to submit D394 to ANAF: ${error.message}`);
      throw new BadRequestException(`Eroare la trimiterea către ANAF: ${error.message}`);
    }
  }

  /**
   * Delete D394 declaration
   */
  async deleteD394Declaration(id: string, userId: string) {
    const declaration = await this.getD394Declaration(id, userId);

    if (declaration.status !== VatDeclarationStatus.DRAFT) {
      throw new BadRequestException('Nu se poate șterge o declarație trimisă');
    }

    await this.prisma.vatD394Declaration.delete({ where: { id } });

    this.logger.log(`D394 declaration ${id} deleted`);
  }

  // ============================================================================
  // VIES VALIDATION
  // ============================================================================

  /**
   * Validate EU VAT number in VIES
   */
  async validateViesNumber(vatId: string): Promise<{
    isValid: boolean;
    countryCode: string;
    vatNumber: string;
    name?: string;
    address?: string;
    validationDate: string;
  }> {
    this.logger.log(`Validating VIES number: ${vatId}`);

    // Extract country code and number
    const countryCode = vatId.substring(0, 2).toUpperCase();
    const vatNumber = vatId.substring(2);

    // Mock VIES validation (replace with actual VIES SOAP API call in production)
    const isValid = /^[A-Z]{2}[0-9A-Z]{2,12}$/.test(vatId);

    if (!isValid) {
      return {
        isValid: false,
        countryCode,
        vatNumber,
        validationDate: new Date().toISOString(),
      };
    }

    // In production, call VIES SOAP API:
    // http://ec.europa.eu/taxation_customs/vies/checkVatService.wsdl

    return {
      isValid: true,
      countryCode,
      vatNumber,
      name: 'Mock Company Name',
      address: 'Mock Address',
      validationDate: new Date().toISOString(),
    };
  }
}
