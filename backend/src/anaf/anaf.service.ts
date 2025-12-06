import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class AnafService {
  private readonly logger = new Logger(AnafService.name);

  constructor(private configService: ConfigService) {}

  // Validate CUI (Romanian company ID)
  async validateCUI(cui: string): Promise<{
    valid: boolean;
    company?: {
      name: string;
      address: string;
      vatPayer: boolean;
    };
  }> {
    try {
      const response = await axios.post(
        'https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva',
        [{ cui: parseInt(cui.replace(/\D/g, '')), data: new Date().toISOString().split('T')[0] }],
      );

      const data = response.data.found?.[0];
      if (data) {
        return {
          valid: true,
          company: {
            name: data.denumire,
            address: data.adresa,
            vatPayer: data.scpTVA,
          },
        };
      }

      return { valid: false };
    } catch (error) {
      this.logger.error('Failed to validate CUI', error);
      return { valid: false };
    }
  }

  // Submit SAF-T D406 to SPV
  async submitSAFT(
    xml: string,
    cui: string,
    period: string,
  ): Promise<{ reference: string; status: string }> {
    const apiKey = this.configService.get('ANAF_API_KEY');

    try {
      const response = await axios.post(
        `${this.configService.get('ANAF_SPV_URL')}/d406/upload`,
        xml,
        {
          params: { cif: cui, perioada: period },
          headers: {
            'Content-Type': 'application/xml',
            Authorization: `Bearer ${apiKey}`,
          },
        },
      );

      this.logger.log(`SAF-T D406 submitted for period ${period}`);
      return {
        reference: response.data.indexIncarcare,
        status: 'submitted',
      };
    } catch (error) {
      this.logger.error('Failed to submit SAF-T to ANAF', error);
      throw error;
    }
  }

  // Get submission deadlines based on company type
  getDeadlines(companyType: 'small' | 'large' | 'non-resident'): {
    saftFrequency: string;
    nextDeadline: Date;
    pilotPeriod: { start: Date; end: Date };
    gracePeriod: number;
  } {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 25);

    // Per Order 1783/2021:
    // - Small/non-residents: Monthly from Jan 2025
    // - Large: Quarterly
    // - Pilot: Sept 2025 - Aug 2026 with 6-month grace

    return {
      saftFrequency: companyType === 'large' ? 'quarterly' : 'monthly',
      nextDeadline: nextMonth,
      pilotPeriod: {
        start: new Date('2025-09-01'),
        end: new Date('2026-08-31'),
      },
      gracePeriod: 6, // months
    };
  }
}
