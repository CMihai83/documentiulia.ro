import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BcTemplate, TEMPLATES, validateAnswers, diffAnswers } from './bc.questionnaire';
import { resolveDiscountRate } from './bc.finance';

@Injectable()
export class BusinessCaseService {
  private readonly logger = new Logger(BusinessCaseService.name);
  constructor(private readonly prisma: PrismaService) {}

  /** BC-102 — the questionnaire (sections + fields) for a template. */
  getQuestionnaire(template: BcTemplate) {
    const t = TEMPLATES[template];
    if (!t) throw new BadRequestException(`Unknown template ${template}`);
    return t;
  }

  listTemplates() {
    return Object.values(TEMPLATES).map((t) => ({
      template: t.template, name: t.name, nameRo: t.nameRo, skeleton: t.skeleton, maturityStages: t.maturityStages,
    }));
  }

  async create(userId: string, organizationId: string | undefined, dto: { title: string; template: BcTemplate }) {
    if (!TEMPLATES[dto.template]) throw new BadRequestException(`Unknown template ${dto.template}`);
    const bc = await this.prisma.businessCase.create({
      data: { userId, organizationId, title: dto.title, template: dto.template, status: 'DRAFT' },
    });
    this.logger.log(`Business case ${bc.id} created (${dto.template})`);
    return bc;
  }

  async list(userId: string) {
    return this.prisma.businessCase.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } });
  }

  async get(userId: string, id: string) {
    const bc = await this.prisma.businessCase.findFirst({
      where: { id, userId },
      include: { assumptionSets: { orderBy: { version: 'desc' }, take: 1 } },
    });
    if (!bc) throw new NotFoundException(`Business case ${id} not found`);
    return { ...bc, latest: bc.assumptionSets[0] ?? null };
  }

  /**
   * BC-101/105 — submit answers as a NEW versioned assumption set (never overwrite:
   * every change is auditable). Validates against the template DSL first.
   */
  async submitAnswers(userId: string, id: string, answers: Record<string, any>) {
    const bc = await this.prisma.businessCase.findFirst({ where: { id, userId } });
    if (!bc) throw new NotFoundException(`Business case ${id} not found`);

    const errors = validateAnswers(bc.template as BcTemplate, answers);
    if (errors.length) throw new BadRequestException({ message: 'Validation failed', errors });

    const last = await this.prisma.bcAssumptionSet.findFirst({
      where: { bcId: id }, orderBy: { version: 'desc' }, select: { version: true },
    });
    const version = (last?.version ?? 0) + 1;
    const set = await this.prisma.bcAssumptionSet.create({ data: { bcId: id, version, answers } });

    // BC-103: derive the discount rate for the summary (also proves the mapping works).
    const wacc = resolveDiscountRate(answers);
    await this.prisma.businessCase.update({ where: { id }, data: { updatedAt: new Date() } });
    this.logger.log(`Business case ${id} answers v${version} saved (rate ${(wacc.rate * 100).toFixed(2)}% via ${wacc.method})`);
    return { version: set.version, createdAt: set.createdAt, discountRate: wacc };
  }

  async listVersions(userId: string, id: string) {
    const bc = await this.prisma.businessCase.findFirst({ where: { id, userId } });
    if (!bc) throw new NotFoundException(`Business case ${id} not found`);
    return this.prisma.bcAssumptionSet.findMany({
      where: { bcId: id }, orderBy: { version: 'desc' }, select: { version: true, createdAt: true },
    });
  }

  /** BC-105 — field-level diff between two assumption-set versions. */
  async diff(userId: string, id: string, vA: number, vB: number) {
    const bc = await this.prisma.businessCase.findFirst({ where: { id, userId } });
    if (!bc) throw new NotFoundException(`Business case ${id} not found`);
    const [a, b] = await Promise.all([
      this.prisma.bcAssumptionSet.findUnique({ where: { bcId_version: { bcId: id, version: vA } } }),
      this.prisma.bcAssumptionSet.findUnique({ where: { bcId_version: { bcId: id, version: vB } } }),
    ]);
    if (!a || !b) throw new NotFoundException('One or both versions not found');
    return { from: vA, to: vB, changes: diffAnswers(a.answers as any, b.answers as any) };
  }
}
