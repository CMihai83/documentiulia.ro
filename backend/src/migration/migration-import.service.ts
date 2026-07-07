import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { parseString } from 'fast-csv';
import { XMLParser } from 'fast-xml-parser';
import { PrismaService } from '../prisma/prisma.service';
import { SaftValidatorService } from '../anaf/saft-validator.service';
import {
  detectEntityType,
  validateRow,
  invoiceTotal,
  extractCustomer,
  extractProduct,
  MigrationEntity,
  RowStatus,
} from './migration.validators';

/**
 * DOC-46-1 / DOC-46-3 — parse SAGA CSV/XML exports into a staging table with
 * per-row validation, then produce a dry-run reconciliation. Nothing is written
 * to live tables here; staging is the safe review buffer before a commit.
 */

interface StageDto {
  format: 'csv' | 'xml';
  content: string;
  entityType?: MigrationEntity;
  sourceType?: string;
}

export interface Summary {
  total: number;
  valid: number;
  warning: number;
  error: number;
}

@Injectable()
export class MigrationImportService {
  private readonly logger = new Logger(MigrationImportService.name);

  constructor(private readonly prisma: PrismaService) {}

  private parseCsv(content: string): Promise<Record<string, any>[]> {
    return new Promise((resolve, reject) => {
      const rows: Record<string, any>[] = [];
      parseString(content, { headers: true, ignoreEmpty: true, trim: true })
        .on('error', reject)
        .on('data', (r) => rows.push(r))
        .on('end', () => resolve(rows));
    });
  }

  private parseXml(content: string): Record<string, any>[] {
    const parsed = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      removeNSPrefix: true,
      parseAttributeValue: true,
      trimValues: true,
    }).parse(content);
    // Best-effort: use the largest array of objects in the tree as the record list.
    let best: any[] = [];
    const walk = (node: any) => {
      if (Array.isArray(node)) {
        if (node.length > best.length && node.length && typeof node[0] === 'object') best = node;
        node.forEach(walk);
      } else if (node && typeof node === 'object') {
        Object.values(node).forEach(walk);
      }
    };
    walk(parsed);
    return best.map((r) => (r && typeof r === 'object' ? r : { value: r }));
  }

  private summarize(rows: { status: RowStatus }[]): Summary {
    return {
      total: rows.length,
      valid: rows.filter((r) => r.status === 'valid').length,
      warning: rows.filter((r) => r.status === 'warning').length,
      error: rows.filter((r) => r.status === 'error').length,
    };
  }

  /** Parse + validate + persist to staging. Returns the batch id and summary. */
  async stage(orgId: string, dto: StageDto) {
    const rows = dto.format === 'xml' ? this.parseXml(dto.content) : await this.parseCsv(dto.content);
    if (!rows.length) throw new BadRequestException('No rows parsed from input');

    const entityType = dto.entityType || detectEntityType(rows[0]);
    if (!entityType) {
      throw new BadRequestException('Could not detect entity type — pass entityType (customer|product|invoice)');
    }

    const batchId = randomUUID();
    const sourceType = dto.sourceType || (dto.format === 'xml' ? 'XML' : 'CSV');
    const staged = rows.map((raw, i) => {
      const { status, errors } = validateRow(entityType, raw);
      return {
        organizationId: orgId, batchId, sourceType, entityType, rowIndex: i,
        rawData: raw as any, status, errors,
      };
    });

    await this.prisma.migrationStaging.createMany({ data: staged });
    this.logger.log(`Staged batch ${batchId}: ${staged.length} ${entityType} rows`);
    return { batchId, entityType, sourceType, summary: this.summarize(staged) };
  }

  async getStaging(orgId: string, batchId: string, status?: RowStatus) {
    return this.prisma.migrationStaging.findMany({
      where: { organizationId: orgId, batchId, ...(status ? { status } : {}) },
      orderBy: { rowIndex: 'asc' },
    });
  }

  /** Reconciliation report: counts, invoice control total, and a sample of errors. */
  async dryRun(orgId: string, batchId: string) {
    const rows = await this.prisma.migrationStaging.findMany({ where: { organizationId: orgId, batchId } });
    if (!rows.length) throw new NotFoundException(`Batch ${batchId} not found`);

    const entityType = rows[0].entityType as MigrationEntity;
    const counts = this.summarize(rows as any);
    const controlTotal =
      entityType === 'invoice'
        ? Math.round(rows.reduce((s, r) => s + invoiceTotal(r.rawData as any), 0) * 100) / 100
        : undefined;
    const errorSamples = rows
      .filter((r) => r.status === 'error')
      .slice(0, 20)
      .map((r) => ({ rowIndex: r.rowIndex, errors: r.errors }));

    return {
      batchId,
      entityType,
      counts,
      controlTotal,
      ready: counts.error === 0,
      errorSamples,
    };
  }

  /** Discard a staged batch (before/after a rejected review). */
  async discardBatch(orgId: string, batchId: string) {
    const res = await this.prisma.migrationStaging.deleteMany({ where: { organizationId: orgId, batchId } });
    return { batchId, deleted: res.count };
  }

  /**
   * DOC-46-3 — commit a staged batch to live master data (customers → Partner,
   * products → Product). Error rows are skipped; existing records are deduped by
   * their unique key (idempotent, so a re-run is safe). Wrapped in a transaction.
   * Invoices are not committed directly (they need full document mapping).
   */
  async commitBatch(orgId: string, userId: string, batchId: string) {
    const rows = await this.prisma.migrationStaging.findMany({ where: { organizationId: orgId, batchId } });
    if (!rows.length) throw new NotFoundException(`Batch ${batchId} not found`);
    const entity = rows[0].entityType as MigrationEntity;
    if (entity === 'invoice') {
      throw new BadRequestException('Direct commit of invoices is not supported — use the invoices module');
    }

    const orgExists = await this.prisma.organization.findUnique({ where: { id: orgId }, select: { id: true } });
    const orgRef = orgExists ? orgId : null;
    const committable = rows.filter((r) => r.status !== 'error');
    let created = 0;
    let skipped = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const r of committable) {
        const raw = r.rawData as any;
        if (entity === 'customer') {
          const c = extractCustomer(raw);
          const existing = c.cui
            ? await tx.partner.findFirst({ where: { userId, cui: c.cui } })
            : await tx.partner.findFirst({ where: { userId, name: c.name } });
          if (existing) { skipped++; continue; }
          await tx.partner.create({
            data: { userId, organizationId: orgRef, name: c.name || '(fără nume)', cui: c.cui, address: c.address, city: c.city, county: c.county, email: c.email, phone: c.phone, type: 'CUSTOMER' },
          });
          created++;
        } else if (entity === 'product') {
          const p = extractProduct(raw);
          const existing = await tx.product.findFirst({ where: { userId, code: p.code } });
          if (existing) { skipped++; continue; }
          await tx.product.create({
            data: { userId, organizationId: orgRef, code: p.code, name: p.name, salePrice: p.salePrice, vatRate: p.vatRate, unit: p.unit },
          });
          created++;
        }
      }
    });

    this.logger.log(`Committed batch ${batchId}: ${created} ${entity}s created, ${skipped} skipped`);
    return { batchId, entity, committed: created, skipped, errorsSkipped: rows.length - committable.length, total: rows.length };
  }

  /**
   * DOC-46-4 — re-validate migrated master data against the SAF-T schema by
   * assembling a minimal D406 AuditFile from the (non-error) customer rows and
   * running it through the SAF-T validator. Proves the data slots into valid SAF-T.
   */
  async saftCheck(orgId: string, batchId: string) {
    const rows = await this.prisma.migrationStaging.findMany({ where: { organizationId: orgId, batchId } });
    if (!rows.length) throw new NotFoundException(`Batch ${batchId} not found`);
    const entity = rows[0].entityType as MigrationEntity;
    if (entity !== 'customer') {
      return { applicable: false, entity, note: 'SAF-T re-validation currently covers customer master data' };
    }
    const customers = rows.filter((r) => r.status !== 'error').map((r) => extractCustomer(r.rawData as any));
    const xml = this.buildSaftCustomersXml(customers);
    const result = new SaftValidatorService().validate(xml);
    return { applicable: true, entity, customersChecked: customers.length, valid: result.valid, errors: result.errors, warnings: result.warnings };
  }

  private esc(s: unknown): string {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private buildSaftCustomersXml(customers: { cui: string | null; name: string }[]): string {
    const custXml = customers
      .map((c, i) => `<Customer><CustomerID>${this.esc(c.cui || 'CUST' + (i + 1))}</CustomerID><AccountID>4111</AccountID><Name>${this.esc(c.name)}</Name></Customer>`)
      .join('');
    return `<?xml version="1.0" encoding="UTF-8"?><AuditFile><Header><AuditFileVersion>2.0</AuditFileVersion><AuditFileCountry>RO</AuditFileCountry><AuditFileDateCreated>2026-07-01</AuditFileDateCreated><SoftwareCompanyName>DocumentIulia</SoftwareCompanyName><SoftwareID>DI-ERP</SoftwareID><SoftwareVersion>1.0</SoftwareVersion><Company><RegistrationNumber>RO12345678</RegistrationNumber><Name>Migration</Name><Address>Str. Exemplu 1</Address></Company><DefaultCurrencyCode>RON</DefaultCurrencyCode><SelectionCriteria><SelectionStartDate>2026-07-01</SelectionStartDate><SelectionEndDate>2026-07-31</SelectionEndDate></SelectionCriteria><TaxAccountingBasis>A</TaxAccountingBasis></Header><MasterFiles><Customers>${custXml}</Customers></MasterFiles></AuditFile>`;
  }
}
