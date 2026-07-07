import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RateLimiterService } from '../rate-limiter/rate-limiter.service';
import { AnafLookupService } from './anaf-lookup.service';
import axios from 'axios';

@Injectable()
export class AnafService {
  private readonly logger = new Logger(AnafService.name);

  constructor(
    private configService: ConfigService,
    private rateLimiter: RateLimiterService,
    private anafLookup: AnafLookupService,
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
    // Delegates to the hardened, v9-correct AnafLookupService (rate-limited,
    // 24h-cached, retried). Keeps this method's legacy return contract.
    const result = await this.anafLookup.lookup(cui);
    if (result.company) {
      return {
        valid: result.found,
        company: {
          name: result.company.name ?? '',
          address: result.company.address ?? '',
          vatPayer: result.company.vatPayer,
          roEfactura: result.company.eFacturaEnrolled,
        },
        error: result.error,
      };
    }
    return { valid: false, error: result.errorRo || result.error };
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
