import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * ONRC Integration Service
 *
 * Integrates with Romanian Trade Register (Oficiul Național al Registrului Comerțului)
 * for company registration and status tracking.
 *
 * ONRC API Documentation: https://www.onrc.ro/index.php/ro/informatii-de-interes-public
 *
 * Features:
 * - Check company name availability
 * - Submit SRL registration
 * - Submit PFA registration (via ANAF)
 * - Check registration status
 * - Retrieve company certificates
 *
 * Note: This is a mock implementation. Production requires:
 * 1. ONRC API credentials
 * 2. Digital certificate for signing
 * 3. Payment gateway integration for ONRC fees
 */
@Injectable()
export class OnrcIntegrationService {
  private readonly logger = new Logger(OnrcIntegrationService.name);
  private readonly onrcApiUrl: string;
  private readonly onrcApiKey: string;

  constructor(private configService: ConfigService) {
    this.onrcApiUrl = this.configService.get<string>('ONRC_API_URL') || 'https://api.onrc.ro/v1';
    this.onrcApiKey = this.configService.get<string>('ONRC_API_KEY') || 'test-api-key';
  }

  /**
   * Check company name availability
   */
  async checkCompanyNameAvailability(
    primaryName: string,
    alternativeName1?: string,
    alternativeName2?: string,
  ): Promise<{
    isAvailable: boolean;
    suggestions?: string[];
    message?: string;
  }> {
    this.logger.log(`Checking company name availability: ${primaryName}`);

    try {
      const namesToCheck = [primaryName];
      if (alternativeName1) namesToCheck.push(alternativeName1);
      if (alternativeName2) namesToCheck.push(alternativeName2);

      const response = await fetch(`${this.onrcApiUrl}/company-names/availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.onrcApiKey}`,
        },
        body: JSON.stringify({ names: namesToCheck }),
      });

      if (!response.ok) {
        throw new Error(`ONRC API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      // Check primary name availability
      const primaryResult = result.results.find((r: any) => r.name === primaryName);

      if (primaryResult?.available) {
        return {
          isAvailable: true,
          message: 'Denumirea este disponibilă',
        };
      } else {
        // Generate suggestions based on API response or fallback
        const suggestions = result.suggestions || [
          `${primaryName} Consulting`,
          `${primaryName} Services`,
          `${primaryName} Solutions`,
        ];

        return {
          isAvailable: false,
          message: primaryResult?.reason || 'Denumirea nu este disponibilă',
          suggestions,
        };
      }
    } catch (error) {
      this.logger.error(`Error checking company name: ${error.message}`);
      // Fallback to basic availability check for resilience
      return {
        isAvailable: true,
        message: 'Verificarea a eșuat, vă rugăm să verificați manual',
      };
    }
  }

  /**
   * Submit SRL registration to ONRC
   */
  async submitSrlRegistration(
    registration: any,
    documents: any,
  ): Promise<{
    referenceNumber: string;
    estimatedProcessingDays: number;
    message: string;
  }> {
    this.logger.log(`Submitting SRL registration to ONRC: ${registration.companyName}`);

    try {
      // Prepare registration data for ONRC API
      const registrationData = {
        companyType: 'SRL',
        companyName: registration.companyName,
        headquartersAddress: registration.headquartersAddress,
        postalAddress: registration.postalAddress,
        shareCapital: registration.shareCapital,
        socialCapital: registration.socialCapital,
        administrators: registration.administrators,
        associates: registration.associates,
        activityCodes: registration.activityCodes,
        fiscalRegime: registration.fiscalRegime,
        contactInfo: registration.contactInfo,
      };

      // Create FormData for document upload
      const formData = new FormData();
      formData.append('registrationData', JSON.stringify(registrationData));

      // Add documents
      if (documents.statute) {
        formData.append('statute', documents.statute);
      }
      if (documents.administratorId) {
        formData.append('administratorId', documents.administratorId);
      }
      if (documents.associateIds) {
        documents.associateIds.forEach((doc: any, index: number) => {
          formData.append(`associateId_${index}`, doc);
        });
      }
      if (documents.otherDocuments) {
        documents.otherDocuments.forEach((doc: any, index: number) => {
          formData.append(`document_${index}`, doc);
        });
      }

      const response = await fetch(`${this.onrcApiUrl}/registrations/srl`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.onrcApiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ONRC API error: ${response.status} ${error}`);
      }

      const result = await response.json();

      this.logger.log(`SRL registration submitted successfully: ${result.referenceNumber}`);

      return {
        referenceNumber: result.referenceNumber,
        estimatedProcessingDays: result.estimatedProcessingDays || 5,
        message: result.message || 'Dosarul a fost înregistrat cu succes la ONRC',
      };
    } catch (error) {
      this.logger.error(`Error submitting SRL registration: ${error.message}`);
      throw new Error(`Înregistrarea SRL a eșuat: ${error.message}`);
    }
  }

  /**
   * Submit PFA registration to ANAF
   */
  async submitPfaRegistration(
    registration: any,
    declaration: Buffer,
  ): Promise<{
    referenceNumber: string;
    estimatedProcessingDays: number;
    message: string;
  }> {
    this.logger.log(`Submitting PFA registration to ANAF: ${registration.fullName}`);

    // TODO: Implement actual ANAF API submission
    // For now, mock implementation
    try {
      // Simulate API call
      await this.delay(1000);

      // Generate mock reference number
      const referenceNumber = `ANAF-D020-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

      this.logger.log(`PFA registration submitted: ${referenceNumber}`);

      return {
        referenceNumber,
        estimatedProcessingDays: 3,
        message: 'Declarația D020 a fost înregistrată cu succes la ANAF',
      };
    } catch (error) {
      this.logger.error(`Error submitting PFA registration: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check SRL registration status
   */
  async checkRegistrationStatus(referenceNumber: string): Promise<{
    status: string;
    cui?: string;
    registrationNumber?: string;
    message: string;
  }> {
    this.logger.log(`Checking registration status: ${referenceNumber}`);

    // TODO: Implement actual ONRC API status check
    // For now, mock implementation
    try {
      // Simulate API call
      await this.delay(300);

      // Mock status based on reference number age
      const timestamp = parseInt(referenceNumber.split('-')[1], 10);
      const daysSinceSubmission = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);

      if (daysSinceSubmission < 1) {
        return {
          status: 'UNDER_REVIEW',
          message: 'Dosarul este în procesare la ONRC',
        };
      } else if (daysSinceSubmission < 5) {
        return {
          status: 'UNDER_REVIEW',
          message: 'Dosarul este în verificare',
        };
      } else {
        return {
          status: 'APPROVED',
          cui: `RO${Math.floor(10000000 + Math.random() * 90000000)}`,
          registrationNumber: `J40/${Math.floor(1000 + Math.random() * 9000)}/2025`,
          message: 'Societatea a fost înregistrată cu succes',
        };
      }
    } catch (error) {
      this.logger.error(`Error checking registration status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check PFA registration status
   */
  async checkPfaRegistrationStatus(referenceNumber: string): Promise<{
    status: string;
    cui?: string;
    message: string;
  }> {
    this.logger.log(`Checking PFA registration status: ${referenceNumber}`);

    // TODO: Implement actual ANAF API status check
    // For now, mock implementation
    try {
      // Simulate API call
      await this.delay(300);

      // Mock status
      const timestamp = parseInt(referenceNumber.split('-')[2], 10);
      const daysSinceSubmission = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);

      if (daysSinceSubmission < 0.5) {
        return {
          status: 'UNDER_REVIEW',
          message: 'Declarația este în procesare',
        };
      } else if (daysSinceSubmission < 3) {
        return {
          status: 'UNDER_REVIEW',
          message: 'Declarația este în verificare la ANAF',
        };
      } else {
        return {
          status: 'APPROVED',
          cui: `${Math.floor(10000000 + Math.random() * 90000000)}`,
          message: 'PFA a fost înregistrat cu succes. CUI alocat.',
        };
      }
    } catch (error) {
      this.logger.error(`Error checking PFA status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Helper: Delay for mock API calls
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
