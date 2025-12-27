import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePfaRegistrationDto } from './dto/create-pfa-registration.dto';
import { DocumentGenerationService } from './document-generation.service';
import { OnrcIntegrationService } from './onrc-integration.service';
import { RegistrationStatus } from './srl-registration.service';

/**
 * PFA Registration Service
 *
 * Handles registration of Persoană Fizică Autorizată (Authorized Natural Person):
 * 1. Validate personal and business data
 * 2. Check for existing PFA registration
 * 3. Generate declaration and required documents
 * 4. Submit to ANAF for CUI allocation
 * 5. Track registration status
 *
 * Romanian Requirements:
 * - Romanian citizenship or valid residence permit
 * - Valid ID card
 * - Registered address
 * - Valid CAEN codes
 * - No prior PFA with same CNP (must be closed first)
 *
 * Pricing: €99 base fee + ANAF fees (~€20)
 */
@Injectable()
export class PfaRegistrationService {
  private readonly logger = new Logger(PfaRegistrationService.name);

  constructor(
    private prisma: PrismaService,
    private documentGeneration: DocumentGenerationService,
    private onrcIntegration: OnrcIntegrationService,
  ) {}

  /**
   * Create a new PFA registration request
   */
  async createRegistration(userId: string, data: CreatePfaRegistrationDto) {
    this.logger.log(`Creating PFA registration for user ${userId}: ${data.fullName}`);

    // Validate registration data
    await this.validateRegistrationData(data);

    // Check if person already has active PFA
    const existingPfa = await this.checkExistingPfa(data.cnp);
    if (existingPfa) {
      throw new BadRequestException({
        message: 'Există deja un PFA activ pe acest CNP',
        existingCui: existingPfa.cui,
        status: existingPfa.status,
      });
    }

    // Calculate registration fee
    const fee = this.calculateRegistrationFee(data);

    // Create registration record
    const registration = await this.prisma.pfaRegistration.create({
      data: {
        userId,
        status: RegistrationStatus.DRAFT,
        fullName: data.fullName,
        cnp: data.cnp,
        idCardNumber: data.idCardNumber,
        idCardIssuedBy: data.idCardIssuedBy,
        idCardIssuedDate: new Date(data.idCardIssuedDate),
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
        email: data.email,
        phone: data.phone,
        tradeName: data.tradeName,
        activityType: data.activityType,
        activityDescription: data.activityDescription,
        businessAddress: data.businessAddress,
        needsCommercialSpace: data.needsCommercialSpace || false,
        expectedEmployees: data.expectedEmployees || 0,
        notes: data.notes,
        registrationFee: fee.total,
        anafFee: fee.anafFee,
        serviceFee: fee.serviceFee,
        activities: {
          create: data.activities.map((activity) => ({
            caenCode: activity.caenCode,
            description: activity.description,
            isPrimary: activity.isPrimary || false,
          })),
        },
      },
      include: {
        activities: true,
      },
    });

    this.logger.log(`PFA registration created with ID: ${registration.id}`);

    return {
      registration,
      fee,
      nextSteps: [
        'Verificați datele introduse',
        'Efectuați plata taxei de înregistrare',
        'Declarația va fi generată automat după plată',
        'Dosarul va fi transmis către ANAF în 1-2 zile lucrătoare',
        'Veți primi notificare când CUI-ul este alocat',
      ],
    };
  }

  /**
   * Validate PFA registration data
   */
  private async validateRegistrationData(data: CreatePfaRegistrationDto): Promise<void> {
    // Validate CNP format (13 digits)
    if (!/^\d{13}$/.test(data.cnp)) {
      throw new BadRequestException('CNP invalid (trebuie să conțină 13 cifre)');
    }

    // Validate ID card number
    if (!data.idCardNumber || data.idCardNumber.length < 6) {
      throw new BadRequestException('Serie și număr carte de identitate invalid');
    }

    // Validate activities
    if (data.activities.length === 0) {
      throw new BadRequestException('PFA trebuie să aibă cel puțin o activitate CAEN');
    }

    const primaryActivities = data.activities.filter((a) => a.isPrimary);
    if (primaryActivities.length !== 1) {
      throw new BadRequestException('Trebuie să existe exact o activitate CAEN principală');
    }

    // Validate CAEN codes
    for (const activity of data.activities) {
      if (!/^\d{4}$/.test(activity.caenCode)) {
        throw new BadRequestException(`Cod CAEN invalid: ${activity.caenCode}`);
      }
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new BadRequestException('Adresa de email invalidă');
    }

    // Validate phone (Romanian format)
    const phoneRegex = /^(\+40|0040|0)[1-9]\d{8}$/;
    if (!phoneRegex.test(data.phone.replace(/\s/g, ''))) {
      throw new BadRequestException('Număr de telefon invalid (format românesc: +40... sau 07...)');
    }
  }

  /**
   * Check if person already has active PFA
   */
  private async checkExistingPfa(cnp: string): Promise<any | null> {
    const existing = await this.prisma.pfaRegistration.findFirst({
      where: {
        cnp,
        status: {
          in: [
            RegistrationStatus.DRAFT,
            RegistrationStatus.SUBMITTED,
            RegistrationStatus.UNDER_REVIEW,
            RegistrationStatus.APPROVED,
            RegistrationStatus.COMPLETED,
          ],
        },
      },
    });

    return existing;
  }

  /**
   * Calculate registration fees
   */
  private calculateRegistrationFee(data: CreatePfaRegistrationDto): {
    serviceFee: number;
    anafFee: number;
    total: number;
  } {
    // Service fee (DocumentIulia.ro)
    let serviceFee = 99; // Base fee in EUR

    // Additional fees for multiple activities
    if (data.activities.length > 3) {
      serviceFee += (data.activities.length - 3) * 10; // €10 per additional activity
    }

    // Additional fee if commercial space is needed
    if (data.needsCommercialSpace) {
      serviceFee += 30; // €30 for commercial space documentation
    }

    // ANAF fees (estimated)
    const anafFee = 20; // Approximate ANAF registration fee in EUR

    return {
      serviceFee,
      anafFee,
      total: serviceFee + anafFee,
    };
  }

  /**
   * Submit PFA registration to ANAF
   */
  async submitToAnaf(registrationId: string, userId: string) {
    this.logger.log(`Submitting PFA registration ${registrationId} to ANAF`);

    const registration = await this.prisma.pfaRegistration.findFirst({
      where: { id: registrationId, userId },
      include: { activities: true },
    });

    if (!registration) {
      throw new BadRequestException('Cererea de înregistrare nu a fost găsită');
    }

    if (registration.status !== RegistrationStatus.DRAFT) {
      throw new BadRequestException('Cererea a fost deja transmisă');
    }

    // Generate PFA declaration (D020 form)
    const declaration = await this.documentGeneration.generatePfaDeclaration(registration);

    // Submit to ANAF (via ONRC integration)
    const anafResponse = await this.onrcIntegration.submitPfaRegistration(registration, declaration);

    // Update registration status
    await this.prisma.pfaRegistration.update({
      where: { id: registrationId },
      data: {
        status: RegistrationStatus.SUBMITTED,
        submittedAt: new Date(),
        anafReferenceNumber: anafResponse.referenceNumber,
      },
    });

    this.logger.log(`PFA registration ${registrationId} submitted to ANAF: ${anafResponse.referenceNumber}`);

    return {
      success: true,
      referenceNumber: anafResponse.referenceNumber,
      estimatedProcessingDays: anafResponse.estimatedProcessingDays || 3,
      message: 'Declarația D020 a fost transmisă cu succes către ANAF',
    };
  }

  /**
   * Get registration status
   */
  async getRegistrationStatus(registrationId: string, userId: string) {
    const registration = await this.prisma.pfaRegistration.findFirst({
      where: { id: registrationId, userId },
      include: { activities: true },
    });

    if (!registration) {
      throw new BadRequestException('Cererea de înregistrare nu a fost găsită');
    }

    // Check ANAF status if submitted
    if (registration.anafReferenceNumber) {
      const anafStatus = await this.onrcIntegration.checkPfaRegistrationStatus(
        registration.anafReferenceNumber,
      );

      // Update local status if changed
      if (anafStatus.status !== registration.status) {
        await this.prisma.pfaRegistration.update({
          where: { id: registrationId },
          data: {
            status: anafStatus.status,
            cui: anafStatus.cui || registration.cui,
          },
        });

        registration.status = anafStatus.status;
        registration.cui = anafStatus.cui || registration.cui;
      }
    }

    return registration;
  }

  /**
   * List all PFA registrations for a user
   */
  async listRegistrations(userId: string) {
    return this.prisma.pfaRegistration.findMany({
      where: { userId },
      include: { activities: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update registration (only in DRAFT status)
   */
  async updateRegistration(registrationId: string, userId: string, data: Partial<CreatePfaRegistrationDto>) {
    const registration = await this.prisma.pfaRegistration.findFirst({
      where: { id: registrationId, userId },
    });

    if (!registration) {
      throw new BadRequestException('Cererea de înregistrare nu a fost găsită');
    }

    if (registration.status !== RegistrationStatus.DRAFT) {
      throw new BadRequestException('Cererea nu mai poate fi modificată după transmiterea către ANAF');
    }

    return this.prisma.pfaRegistration.update({
      where: { id: registrationId },
      data: data as any,
    });
  }

  /**
   * Cancel registration
   */
  async cancelRegistration(registrationId: string, userId: string) {
    const registration = await this.prisma.pfaRegistration.findFirst({
      where: { id: registrationId, userId },
    });

    if (!registration) {
      throw new BadRequestException('Cererea de înregistrare nu a fost găsită');
    }

    if ([RegistrationStatus.APPROVED, RegistrationStatus.COMPLETED].includes(registration.status as any)) {
      throw new BadRequestException('Cererea nu poate fi anulată după aprobare');
    }

    return this.prisma.pfaRegistration.update({
      where: { id: registrationId },
      data: { status: RegistrationStatus.CANCELLED },
    });
  }
}
