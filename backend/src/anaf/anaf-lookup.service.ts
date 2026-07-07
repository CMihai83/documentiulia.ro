import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { RedisService } from '../redis/redis.service';

/**
 * Central ANAF CUI/CIF lookup (DOC-44-4).
 * The single hardened entry point for validating a Romanian CUI against the
 * free ANAF public web service before any invoice/booking submission — and the
 * engine behind the public "verificare CUI" tool (DOC-W0-1).
 *
 * Hardening: format check → 24h Redis cache → 10 req/s rate limit →
 * exponential backoff (max 3 retries) on transient failures. Never throws;
 * always returns a structured result so callers can degrade gracefully.
 */

export interface AnafCompany {
  cui: string;
  name?: string;
  address?: string;
  vatPayer: boolean;
  splitVat: boolean;
  eFacturaEnrolled: boolean;
  inactive: boolean;
}

export interface AnafLookupResult {
  cui: string;
  formatValid: boolean;
  found: boolean;
  /** format valid AND found AND not inactive → safe to invoice */
  valid: boolean;
  company?: AnafCompany;
  cached: boolean;
  error?: string;
  errorRo?: string;
}

@Injectable()
export class AnafLookupService {
  private readonly logger = new Logger(AnafLookupService.name);
  private readonly apiUrl =
    process.env.ANAF_CUI_API_URL || 'https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva';
  private readonly cacheTtlSeconds = 24 * 60 * 60;
  private readonly maxRetries = 3;
  private readonly maxPerSecond = 10;
  private callTimes: number[] = [];

  constructor(private readonly redis: RedisService) {}

  /** RO CUI format: 2–10 digits, optional RO prefix. */
  validateFormat(cui: string | number): boolean {
    if (cui === null || cui === undefined) return false;
    const clean = this.normalize(cui);
    return clean.length >= 2 && clean.length <= 10 && /^\d+$/.test(clean);
  }

  private normalize(cui: string | number): string {
    return cui.toString().toUpperCase().replace(/^RO/, '').replace(/\D/g, '');
  }

  /** Sliding-window limiter: at most `maxPerSecond` outbound calls per second. */
  private async rateLimit(): Promise<void> {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const now = Date.now();
      this.callTimes = this.callTimes.filter((t) => now - t < 1000);
      if (this.callTimes.length < this.maxPerSecond) {
        this.callTimes.push(now);
        return;
      }
      const waitMs = Math.max(1000 - (now - this.callTimes[0]) + 5, 10);
      await this.sleep(waitMs);
    }
  }

  private backoffDelay(attempt: number): number {
    return Math.min(500 * 2 ** attempt, 5000);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** Look up a CUI. Result is 24h-cached; transient failures are retried. */
  async lookup(cuiInput: string | number): Promise<AnafLookupResult> {
    const clean = this.normalize(cuiInput);
    const formatValid = this.validateFormat(cuiInput);
    if (!formatValid) {
      return { cui: clean, formatValid: false, found: false, valid: false, cached: false, error: 'Invalid CUI format', errorRo: 'Format CUI invalid' };
    }

    const cacheKey = `anaf:cui:${clean}`;
    const cached = await this.redis.get<AnafLookupResult>(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const today = new Date().toISOString().split('T')[0];
    let lastError = '';

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      await this.rateLimit();
      try {
        const resp = await axios.post(
          this.apiUrl,
          [{ cui: parseInt(clean, 10), data: today }],
          {
            headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': 'DocumentIulia-ERP/1.0' },
            timeout: 10000,
            validateStatus: (s) => s < 600,
          },
        );

        if (resp.status >= 500) {
          lastError = `ANAF HTTP ${resp.status}`;
          if (attempt < this.maxRetries) { await this.sleep(this.backoffDelay(attempt)); continue; }
          break;
        }

        const d = resp.data?.found?.[0];
        let result: AnafLookupResult;
        if (d) {
          const inactive = d.statusInactivi === true;
          const company: AnafCompany = {
            cui: clean,
            name: d.denumire,
            address: d.adresa,
            vatPayer: d.scpTVA === true,
            splitVat: d.statusSplitTVA === true,
            eFacturaEnrolled: d.statusRO_e_Factura === true,
            inactive,
          };
          result = { cui: clean, formatValid: true, found: true, valid: !inactive, company, cached: false };
        } else if (resp.data?.notfound?.length) {
          result = { cui: clean, formatValid: true, found: false, valid: false, cached: false, error: 'CUI not found in ANAF registry', errorRo: 'CUI negăsit în registrul ANAF' };
        } else {
          result = { cui: clean, formatValid: true, found: false, valid: false, cached: false };
        }

        await this.redis.set(cacheKey, result, this.cacheTtlSeconds);
        return result;
      } catch (error: any) {
        lastError = error?.message || 'network error';
        const retryable = !error.response || error.code === 'ECONNABORTED';
        if (retryable && attempt < this.maxRetries) { await this.sleep(this.backoffDelay(attempt)); continue; }
        break;
      }
    }

    this.logger.warn(`ANAF lookup failed for ${clean}: ${lastError}`);
    return { cui: clean, formatValid: true, found: false, valid: false, cached: false, error: `ANAF lookup failed: ${lastError}`, errorRo: `Interogare ANAF eșuată: ${lastError}` };
  }

  /**
   * Gate a CUI before a submission. Returns ok=false with a Romanian reason
   * for invalid format, not-found, or inactive taxpayers.
   */
  async assertUsable(cui: string | number): Promise<{ ok: boolean; reason?: string; result: AnafLookupResult }> {
    const result = await this.lookup(cui);
    if (!result.formatValid) return { ok: false, reason: 'Format CUI invalid', result };
    if (result.error && !result.found) return { ok: false, reason: result.errorRo || 'CUI negăsit', result };
    if (result.company?.inactive) return { ok: false, reason: 'Contribuabil inactiv la ANAF', result };
    if (!result.found) return { ok: false, reason: 'CUI negăsit în registrul ANAF', result };
    return { ok: true, result };
  }
}
