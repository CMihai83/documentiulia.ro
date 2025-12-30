import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RateLimiterService } from '../rate-limiter/rate-limiter.service';
import axios from 'axios';

@Injectable()
export class AnafService {
  private readonly logger = new Logger(AnafService.name);

  constructor(
    private configService: ConfigService,
    private rateLimiter: RateLimiterService,
  ) {}

  // Validate CUI (Romanian company ID)
  async validateCUI(cui: string): Promise<{
    valid: boolean;
    company?: {
      name: string;
      address: string;
      vatPayer: boolean;
      roEfactura?: boolean;
    };
    error?: string;
  }> {
    // Check rate limit for ANAF API calls
    const rateLimitKey = `anaf:cui:${cui.substring(0, 4)}`; // Group by first 4 digits to avoid too many keys
    const rateLimitResult = await this.rateLimiter.consumeRateLimit('INTEGRATION', rateLimitKey, {
      integrationType: 'ANAF'
    });

    if (!rateLimitResult.allowed) {
      this.logger.warn(`ANAF CUI validation rate limited for CUI ${cui}`);
      return {
        valid: false,
        error: `Rate limit exceeded. Try again in ${Math.ceil((rateLimitResult.retryAfterMs || 5000) / 1000)} seconds.`,
      };
    }

    const cuiApiUrl = this.configService.get('ANAF_CUI_API_URL') || 'https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva';
    const cleanCui = parseInt(cui.replace(/\D/g, ''));
    const today = new Date().toISOString().split('T')[0];

    try {
      const response = await axios.post(
        cuiApiUrl,
        [{ cui: cleanCui, data: today }],
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'DocumentIulia-ERP/1.0',
          },
          timeout: 10000,
        },
      );

      const data = response.data.found?.[0];
      if (data) {
        return {
          valid: true,
          company: {
            name: data.denumire,
            address: data.adresa,
            vatPayer: data.scpTVA === true,
            roEfactura: data.statusRO_e_Factura === true,
          },
        };
      }

      // Check notfound array
      if (response.data.notfound?.length > 0) {
        return { valid: false, error: 'CUI not found in ANAF database' };
      }

      return { valid: false };
    } catch (error: any) {
      this.logger.error('Failed to validate CUI', error.message);
      // Return graceful error instead of throwing
      return {
        valid: false,
        error: error.response?.status === 404
          ? 'ANAF API temporarily unavailable'
          : `Validation failed: ${error.message}`,
      };
    }
  }

  // Submit SAF-T D406 to SPV
  async submitSAFT(
    xml: string,
    cui: string,
    period: string,
  ): Promise<{ reference: string; status: string }> {
    // Check rate limit for ANAF API calls
    const rateLimitKey = `anaf:saft:${cui}`;
    const rateLimitResult = await this.rateLimiter.consumeRateLimit('INTEGRATION', rateLimitKey, {
      integrationType: 'ANAF'
    });

    if (!rateLimitResult.allowed) {
      this.logger.warn(`ANAF SAF-T submission rate limited for CUI ${cui}`);
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil((rateLimitResult.retryAfterMs || 5000) / 1000)} seconds.`);
    }

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
