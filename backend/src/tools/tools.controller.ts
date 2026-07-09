import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ToolsService } from './tools.service';

/**
 * W-0 free-tools funnel — PUBLIC endpoints (no JWT by design, like
 * gdpr-ext-public). Every route is throttled per IP; nothing here reads or
 * writes tenant data. Each tool is a thin surface over an existing engine:
 * AnafLookupService (DOC-44-4), the date-aware VAT engine (DOC-45-4),
 * RO payroll math, the e-Factura UBL builder and the SAF-T validator.
 */
@Controller('tools')
@UseGuards(ThrottlerGuard)
export class ToolsController {
  constructor(private readonly tools: ToolsService) {}

  /** DOC-W0-1 — CUI / VAT-status lookup (ANAF public WS, 24h-cached). */
  @Get('cui/:cui')
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  lookupCui(@Param('cui') cui: string) {
    return this.tools.lookupCui(cui);
  }

  /** DOC-W0-2 — date-aware VAT calculator (21/11/9 + pre-Aug-2025 rates). */
  @Get('vat')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  vat(
    @Query('amount') amount: string,
    @Query('direction') direction?: string,
    @Query('date') date?: string,
    @Query('category') category?: string,
  ) {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 0) {
      throw new BadRequestException('Suma trebuie să fie un număr pozitiv.');
    }
    return this.tools.calculateVat(
      value,
      direction === 'extract' ? 'extract' : 'add',
      date ? new Date(date) : new Date(),
      (category as any) || 'STANDARD',
    );
  }

  /** DOC-W0-3 — net ↔ gross salary calculator (CAS/CASS/impozit + deducere). */
  @Get('salary')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  salary(
    @Query('gross') gross?: string,
    @Query('net') net?: string,
    @Query('dependents') dependents?: string,
    @Query('minWage') minWage?: string,
  ) {
    const dep = Math.max(0, parseInt(dependents ?? '0', 10) || 0);
    const mw = Number(minWage) > 0 ? Number(minWage) : undefined;
    if (gross !== undefined) {
      const g = Number(gross);
      if (!Number.isFinite(g) || g <= 0) throw new BadRequestException('Salariul brut trebuie să fie pozitiv.');
      return this.tools.salaryFromGross(g, dep, mw);
    }
    if (net !== undefined) {
      const n = Number(net);
      if (!Number.isFinite(n) || n <= 0) throw new BadRequestException('Salariul net trebuie să fie pozitiv.');
      return this.tools.salaryFromNet(n, dep, mw);
    }
    throw new BadRequestException('Furnizați gross= sau net=.');
  }
}
