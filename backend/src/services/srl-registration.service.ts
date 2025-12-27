import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSrlRegistrationDto, ShareholderDto } from './dto/create-srl-registration.dto';
import { DocumentGenerationService } from './document-generation.service';
import { OnrcIntegrationService } from './onrc-integration.service';

export enum RegistrationStatus {
  DRAFT = 'DRAFT', // Cerere în pregătire
  SUBMITTED = 'SUBMITTED', // Trimisă către ONRC
  UNDER_REVIEW = 'UNDER_REVIEW', // În verificare la ONRC
  APPROVED = 'APPROVED', // Aprobată - CUI alocat
  REJECTED = 'REJECTED', // Respinsă
  COMPLETED = 'COMPLETED', // Finalizată - certificat emis
  CANCELLED = 'CANCELLED', // Anulată
}

/**
 * SRL Registration Service
 *
 * Handles the complete workflow for registering a Romanian Limited Liability Company (SRL):
 * 1. Validate registration data (shareholders, capital, activities)
 * 2. Check company name availability with ONRC
 * 3. Generate required documents (Articles of Association, Founding Act, etc.)
 * 4. Submit to ONRC for CUI allocation
 * 5. Track registration status
 * 6. Retrieve company certificate once approved
 *
 * Romanian Requirements:
 * - Minimum share capital: 200 RON
 * - Minimum shareholders: 1 (SRL-D) or 2+ (SRL)
 * - Maximum shareholders: 50
 * - At least one administrator
 * - Valid CAEN codes for activities
 * - Registered office address
 *
 * Pricing: €299 base fee + ONRC fees (~€50-100)
 */
@Injectable()
export class SrlRegistrationService {
  private readonly logger = new Logger(SrlRegistrationService.name);

  constructor(
    private prisma: PrismaService,
    private documentGeneration: DocumentGenerationService,
    private onrcIntegration: OnrcIntegrationService,
  ) {}

  /**
   * Create a new SRL registration request
   */
  async createRegistration(userId: string, data: CreateSrlRegistrationDto) {
    this.logger.log(`Creating SRL registration for user ${userId}: ${data.companyName}`);

    // Validate registration data
    await this.validateRegistrationData(data);

    // Check company name availability
    const nameAvailability = await this.onrcIntegration.checkCompanyNameAvailability(
      data.companyName,
      data.alternativeName1,
      data.alternativeName2,
    );

    if (!nameAvailability.isAvailable) {
      throw new BadRequestException({
        message: 'Denumirea societății nu este disponibilă',
        suggestions: nameAvailability.suggestions || [],
      });
    }

    // Calculate registration fee
    const fee = this.calculateRegistrationFee(data);

    // Create registration record in database
    const registration = await this.prisma.srlRegistration.create({
      data: {
        userId,
        status: RegistrationStatus.DRAFT,
        companyType: data.companyType,
        companyName: data.companyName,
        alternativeName1: data.alternativeName1,
        alternativeName2: data.alternativeName2,
        county: data.county,
        city: data.city,
        sector: data.sector,
        street: data.street,
        streetNumber: data.streetNumber,
        building: data.building,
        staircase: data.staircase,
        floor: data.floor,
        apartment: data.apartment,
        postalCode: data.postalCode,
        shareCapital: data.shareCapital,
        totalShares: data.totalShares,
        shareNominalValue: data.shareNominalValue,
        businessPurpose: data.businessPurpose,
        companyDuration: data.companyDuration || 99,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        notes: data.notes,
        registrationFee: fee.total,
        onrcFee: fee.onrcFee,
        serviceFee: fee.serviceFee,
        shareholders: {
          create: data.shareholders.map((sh) => ({
            type: sh.type,
            name: sh.name,
            cnp: sh.cnp,
            cui: sh.cui,
            address: sh.address,
            email: sh.email,
            phone: sh.phone,
            shares: sh.shares,
            contribution: sh.contribution,
            percentage: sh.percentage,
          })),
        },
        administrators: {
          create: data.administrators.map((admin) => ({
            name: admin.name,
            cnp: admin.cnp,
            address: admin.address,
            email: admin.email,
            phone: admin.phone,
            isSoleAdministrator: admin.isSoleAdministrator || false,
          })),
        },
        activities: {
          create: data.activities.map((activity) => ({
            caenCode: activity.caenCode,
            description: activity.description,
            isPrimary: activity.isPrimary || false,
          })),
        },
      },
      include: {
        shareholders: true,
        administrators: true,
        activities: true,
      },
    });

    this.logger.log(`SRL registration created with ID: ${registration.id}`);

    return {
      registration,
      fee,
      nextSteps: [
        'Verificați datele introduse',
        'Efectuați plata taxei de înregistrare',
        'Documentele vor fi generate automat după plată',
        'Dosarul va fi transmis către ONRC în 1-2 zile lucrătoare',
      ],
    };
  }

  /**
   * Validate registration data according to Romanian law
   */
  private async validateRegistrationData(data: CreateSrlRegistrationDto): Promise<void> {
    // Validate minimum share capital (200 RON for SRL)
    if (data.shareCapital < 200) {
      throw new BadRequestException('Capitalul social minim pentru SRL este 200 RON');
    }

    // Validate shareholders
    if (data.shareholders.length === 0) {
      throw new BadRequestException('Societatea trebuie să aibă cel puțin un asociat');
    }

    if (data.shareholders.length > 50) {
      throw new BadRequestException('SRL poate avea maxim 50 de asociați');
    }

    // Validate total shareholding percentage
    const totalPercentage = data.shareholders.reduce((sum, sh) => sum + sh.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new BadRequestException(`Procentul total al asociaților trebuie să fie 100% (actual: ${totalPercentage}%)`);
    }

    // Validate total contribution equals share capital
    const totalContribution = data.shareholders.reduce((sum, sh) => sum + sh.contribution, 0);
    if (Math.abs(totalContribution - data.shareCapital) > 0.01) {
      throw new BadRequestException(
        `Aportul total (${totalContribution} RON) trebuie să fie egal cu capitalul social (${data.shareCapital} RON)`,
      );
    }

    // Validate administrators
    if (data.administrators.length === 0) {
      throw new BadRequestException('Societatea trebuie să aibă cel puțin un administrator');
    }

    // Validate CNP format for administrators
    for (const admin of data.administrators) {
      if (!/^\d{13}$/.test(admin.cnp)) {
        throw new BadRequestException(`CNP invalid pentru administrator: ${admin.name}`);
      }
    }

    // Validate CAEN codes
    if (data.activities.length === 0) {
      throw new BadRequestException('Societatea trebuie să aibă cel puțin o activitate CAEN');
    }

    const primaryActivities = data.activities.filter((a) => a.isPrimary);
    if (primaryActivities.length !== 1) {
      throw new BadRequestException('Trebuie să existe exact o activitate CAEN principală');
    }

    // Validate CAEN code format (4 digits)
    for (const activity of data.activities) {
      if (!/^\d{4}$/.test(activity.caenCode)) {
        throw new BadRequestException(`Cod CAEN invalid: ${activity.caenCode}`);
      }
    }
  }

  /**
   * Calculate registration fees
   */
  private calculateRegistrationFee(data: CreateSrlRegistrationDto): {
    serviceFee: number;
    onrcFee: number;
    total: number;
  } {
    // Service fee (DocumentIulia.ro)
    let serviceFee = 299; // Base fee in EUR

    // Additional fees for complex structures
    if (data.shareholders.length > 3) {
      serviceFee += (data.shareholders.length - 3) * 20; // €20 per additional shareholder
    }

    if (data.activities.length > 3) {
      serviceFee += (data.activities.length - 3) * 10; // €10 per additional activity
    }

    // ONRC fees (estimated, varies by county)
    const onrcFee = 50; // Approximate ONRC registration fee in EUR

    return {
      serviceFee,
      onrcFee,
      total: serviceFee + onrcFee,
    };
  }

  /**
   * Submit registration to ONRC after payment confirmation
   */
  async submitToOnrc(registrationId: string, userId: string) {
    this.logger.log(`Submitting registration ${registrationId} to ONRC`);

    const registration = await this.prisma.srlRegistration.findFirst({
      where: { id: registrationId, userId },
      include: {
        shareholders: true,
        administrators: true,
        activities: true,
      },
    });

    if (!registration) {
      throw new BadRequestException('Cererea de înregistrare nu a fost găsită');
    }

    if (registration.status !== RegistrationStatus.DRAFT) {
      throw new BadRequestException('Cererea a fost deja transmisă');
    }

    // Generate required documents
    const documents = await this.documentGeneration.generateSrlDocuments(registration);

    // Submit to ONRC
    const onrcResponse = await this.onrcIntegration.submitSrlRegistration(registration, documents);

    // Update registration status
    await this.prisma.srlRegistration.update({
      where: { id: registrationId },
      data: {
        status: RegistrationStatus.SUBMITTED,
        submittedAt: new Date(),
        onrcReferenceNumber: onrcResponse.referenceNumber,
      },
    });

    this.logger.log(`Registration ${registrationId} submitted to ONRC: ${onrcResponse.referenceNumber}`);

    return {
      success: true,
      referenceNumber: onrcResponse.referenceNumber,
      estimatedProcessingDays: onrcResponse.estimatedProcessingDays || 5,
      message: 'Dosarul a fost transmis cu succes către ONRC',
    };
  }

  /**
   * Get registration status
   */
  async getRegistrationStatus(registrationId: string, userId: string) {
    const registration = await this.prisma.srlRegistration.findFirst({
      where: { id: registrationId, userId },
      include: {
        shareholders: true,
        administrators: true,
        activities: true,
      },
    });

    if (!registration) {
      throw new BadRequestException('Cererea de înregistrare nu a fost găsită');
    }

    // Check ONRC status if submitted
    if (registration.onrcReferenceNumber) {
      const onrcStatus = await this.onrcIntegration.checkRegistrationStatus(
        registration.onrcReferenceNumber,
      );

      // Update local status if changed
      if (onrcStatus.status !== registration.status) {
        await this.prisma.srlRegistration.update({
          where: { id: registrationId },
          data: {
            status: onrcStatus.status,
            cui: onrcStatus.cui || registration.cui,
            registrationNumber: onrcStatus.registrationNumber || registration.registrationNumber,
          },
        });

        registration.status = onrcStatus.status;
        registration.cui = onrcStatus.cui || registration.cui;
        registration.registrationNumber = onrcStatus.registrationNumber || registration.registrationNumber;
      }
    }

    return registration;
  }

  /**
   * List all registrations for a user
   */
  async listRegistrations(userId: string) {
    return this.prisma.srlRegistration.findMany({
      where: { userId },
      include: {
        shareholders: true,
        administrators: true,
        activities: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update registration (only in DRAFT status)
   */
  async updateRegistration(registrationId: string, userId: string, data: Partial<CreateSrlRegistrationDto>) {
    const registration = await this.prisma.srlRegistration.findFirst({
      where: { id: registrationId, userId },
    });

    if (!registration) {
      throw new BadRequestException('Cererea de înregistrare nu a fost găsită');
    }

    if (registration.status !== RegistrationStatus.DRAFT) {
      throw new BadRequestException('Cererea nu mai poate fi modificată după transmiterea către ONRC');
    }

    return this.prisma.srlRegistration.update({
      where: { id: registrationId },
      data: data as any,
    });
  }

  /**
   * Cancel registration
   */
  async cancelRegistration(registrationId: string, userId: string) {
    const registration = await this.prisma.srlRegistration.findFirst({
      where: { id: registrationId, userId },
    });

    if (!registration) {
      throw new BadRequestException('Cererea de înregistrare nu a fost găsită');
    }

    if ([RegistrationStatus.APPROVED, RegistrationStatus.COMPLETED].includes(registration.status as any)) {
      throw new BadRequestException('Cererea nu poate fi anulată după aprobare');
    }

    return this.prisma.srlRegistration.update({
      where: { id: registrationId },
      data: { status: RegistrationStatus.CANCELLED },
    });
  }
}
