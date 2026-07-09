import { Injectable } from '@nestjs/common';
import { AnafLookupService } from '../anaf/anaf-lookup.service';
import { VatCalculationService } from '../vat/services/vat-calculation.service';
import { computeVat, VatCategory, VatToolResult } from './tools-vat.logic';
import {
  DEFAULT_MIN_WAGE,
  salaryFromGross,
  salaryFromNet,
  SalaryBreakdown,
} from './tools-salary.logic';

/** W-0 free tools — thin orchestration over the real engines. */
@Injectable()
export class ToolsService {
  constructor(
    private readonly anafLookup: AnafLookupService,
    private readonly vatCalc: VatCalculationService,
  ) {}

  /** DOC-W0-1 — delegate to the hardened DOC-44-4 lookup (cache/backoff inside). */
  async lookupCui(cui: string) {
    const res = await this.anafLookup.lookup(cui);
    // Graceful ANAF-down: lookup() returns error fields instead of throwing.
    return {
      ...res,
      anafDown: !res.found && !!res.error && res.formatValid,
      cta: 'Creează-ți cont gratuit pentru facturare cu verificare CUI automată.',
    };
  }

  /** DOC-W0-2 — rate from the statutory engine, math in the pure module. */
  calculateVat(
    amount: number,
    direction: 'add' | 'extract',
    date: Date,
    category: VatCategory,
  ): VatToolResult {
    const cfg = this.vatCalc.getVatRates(date);
    const rate =
      category === 'REDUCED' ? cfg.reduced : category === 'SPECIAL' ? cfg.special : cfg.standard;
    return computeVat(amount, direction, rate, category, cfg.effectiveFrom.toISOString().slice(0, 10));
  }

  /** DOC-W0-3 */
  salaryFromGross(gross: number, dependents: number, minWage?: number): SalaryBreakdown {
    return salaryFromGross(gross, dependents, minWage ?? DEFAULT_MIN_WAGE);
  }

  salaryFromNet(net: number, dependents: number, minWage?: number): SalaryBreakdown {
    return salaryFromNet(net, dependents, minWage ?? DEFAULT_MIN_WAGE);
  }
}
