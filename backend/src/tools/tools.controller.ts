import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ToolsService } from './tools.service';
import { FreeInvoiceInput, ToolsInvoiceService } from './tools-invoice.service';
import { validateXmlTool } from './tools-xml-validate.logic';

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
  constructor(
    private readonly tools: ToolsService,
    private readonly invoices: ToolsInvoiceService,
  ) {}

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

  /** DOC-W0-4 — free invoice + e-Factura UBL XML (3/month anonymous cap). */
  @Post('invoice')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  generateInvoice(@Body() input: FreeInvoiceInput, @Ip() ip: string) {
    return this.invoices.generate(input, ip);
  }

  /** DOC-W0-4 helper — how many free invoices remain this month. */
  @Get('invoice/remaining')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async remaining(@Ip() ip: string) {
    return { remaining: await this.invoices.remaining(ip), cap: 3 };
  }

  /**
   * DOC-W0-5 — SAF-T / e-Factura XML validator. Memory-only by design
   * (GDPR): multer memoryStorage, 10MB cap, nothing touches disk or DB.
   */
  @Post('validate-xml')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  validateXml(@UploadedFile() file?: { buffer: Buffer; size: number }) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Încărcați un fișier XML (max 10MB).');
    }
    return validateXmlTool(file.buffer.toString('utf-8'));
  }
}
