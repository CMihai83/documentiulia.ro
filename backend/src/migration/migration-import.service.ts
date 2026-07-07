import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { parseString } from 'fast-csv';
import { XMLParser } from 'fast-xml-parser';
import { PrismaService } from '../prisma/prisma.service';
import {
  detectEntityType,
  validateRow,
  invoiceTotal,
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
}
