import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DeMinimisService } from './deminimis.service';
import { SEED_PROGRAMS } from './funds.seed';
import {
  rankMatches, matchProgram, isFirmInDifficulty,
  FundingProfileLike, FundingProgramLike, MatchRequest,
} from './funds-matching.logic';

export interface CreateProgramDto {
  name: string; authority: string; purpose: string; beneficiaryType: string;
  sizeEligibility?: string[]; coFinancingPct?: number; legalBasis: string;
  gberArticle?: string; aidIntensityPct?: number; ceilingEur?: number;
  opensAt?: string; closesAt?: string; caenWhitelist?: string[]; caenBlacklist?: string[];
  regions?: string[]; interventionField?: string; status?: string; sourceUrl: string;
}

export interface ProfileDto {
  caenPrimary?: string; caenSecondary?: string[]; foundedDate?: string;
  headcount?: number; turnoverEur?: number; balanceSheetEur?: number;
  subscribedCapitalEur?: number; accumulatedLossEur?: number; equityEur?: number;
  partnerLinks?: any[]; anafDebt?: boolean; insolvent?: boolean;
}

@Injectable()
export class FundsService {
  private readonly logger = new Logger(FundsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly deMinimis: DeMinimisService,
  ) {}

  // ---------- FND-1 catalog ----------
  private validateCaenLists(white: string[] = [], black: string[] = []) {
    const overlap = white.filter((c) => black.includes(c));
    if (overlap.length) throw new BadRequestException(`CAEN codes in both white and blacklist: ${overlap.join(', ')}`);
  }

  createProgram(dto: CreateProgramDto) {
    this.validateCaenLists(dto.caenWhitelist, dto.caenBlacklist);
    return this.prisma.fundingProgram.create({
      data: {
        name: dto.name, authority: dto.authority, purpose: dto.purpose, beneficiaryType: dto.beneficiaryType,
        sizeEligibility: dto.sizeEligibility ?? [], coFinancingPct: dto.coFinancingPct ?? null,
        legalBasis: dto.legalBasis, gberArticle: dto.gberArticle ?? null, aidIntensityPct: dto.aidIntensityPct ?? null,
        ceilingEur: dto.ceilingEur ?? null, opensAt: dto.opensAt ? new Date(dto.opensAt) : null,
        closesAt: dto.closesAt ? new Date(dto.closesAt) : null, caenWhitelist: dto.caenWhitelist ?? [],
        caenBlacklist: dto.caenBlacklist ?? [], regions: dto.regions ?? [], interventionField: dto.interventionField ?? null,
        status: dto.status ?? 'open', sourceUrl: dto.sourceUrl,
      },
    });
  }

  listPrograms(status?: string) {
    return this.prisma.fundingProgram.findMany({
      where: status ? { status } : undefined,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getProgram(id: string) {
    const p = await this.prisma.fundingProgram.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Program not found');
    return p;
  }

  async updateProgram(id: string, dto: Partial<CreateProgramDto>) {
    await this.getProgram(id);
    if (dto.caenWhitelist || dto.caenBlacklist) this.validateCaenLists(dto.caenWhitelist, dto.caenBlacklist);
    const data: any = { ...dto };
    if (dto.opensAt) data.opensAt = new Date(dto.opensAt);
    if (dto.closesAt) data.closesAt = new Date(dto.closesAt);
    return this.prisma.fundingProgram.update({ where: { id }, data });
  }

  /** Soft-close: flag status, never delete (audit + AC). */
  async closeProgram(id: string) {
    await this.getProgram(id);
    return this.prisma.fundingProgram.update({ where: { id }, data: { status: 'closed' } });
  }

  async seed() {
    let created = 0;
    for (const p of SEED_PROGRAMS) {
      const exists = await this.prisma.fundingProgram.findFirst({ where: { name: p.name } });
      if (exists) continue;
      this.validateCaenLists(p.caenWhitelist, p.caenBlacklist);
      await this.prisma.fundingProgram.create({
        data: {
          ...p,
          opensAt: p.opensAt ? new Date(p.opensAt) : null,
          closesAt: p.closesAt ? new Date(p.closesAt) : null,
        },
      });
      created++;
    }
    return { seeded: created, total: SEED_PROGRAMS.length };
  }

  // ---------- FND-2/4 profile (ERP auto-derivation) ----------
  async upsertProfile(userId: string, organizationId: string, dto: ProfileDto) {
    const derived = await this.deriveFromErp(userId, organizationId);
    const data = {
      caenPrimary: dto.caenPrimary ?? null,
      caenSecondary: dto.caenSecondary ?? [],
      foundedDate: dto.foundedDate ? new Date(dto.foundedDate) : null,
      headcount: dto.headcount ?? derived.headcount,
      turnoverEur: dto.turnoverEur ?? derived.turnoverEur,
      balanceSheetEur: dto.balanceSheetEur ?? null,
      subscribedCapitalEur: dto.subscribedCapitalEur ?? null,
      accumulatedLossEur: dto.accumulatedLossEur ?? null,
      equityEur: dto.equityEur ?? null,
      partnerLinks: dto.partnerLinks ?? [],
      anafDebt: dto.anafDebt ?? false,
      insolvent: dto.insolvent ?? false,
    };
    return this.prisma.fundingProfile.upsert({
      where: { organizationId },
      create: { organizationId, userId, ...data },
      update: data,
    });
  }

  /** Headcount from Employee count; turnover from Invoice gross sum (last 12mo, RON≈EUR fallback). */
  private async deriveFromErp(userId: string, organizationId: string): Promise<{ headcount: number; turnoverEur: number }> {
    const headcount = await this.prisma.employee.count({
      where: { OR: [{ organizationId }, { userId }] },
    }).catch(() => 0);
    const since = new Date('2025-07-01');
    const agg = await this.prisma.invoice.aggregate({
      _sum: { grossAmount: true },
      where: { userId, invoiceDate: { gte: since } },
    }).catch(() => ({ _sum: { grossAmount: null } } as any));
    const ron = Number(agg._sum.grossAmount ?? 0);
    // ~5 RON/EUR; if data is already EUR-scale this is a conservative estimate the user can override.
    const turnoverEur = Math.round(ron / 5);
    return { headcount, turnoverEur };
  }

  async getProfile(organizationId: string) {
    return this.prisma.fundingProfile.findUnique({ where: { organizationId } });
  }

  private toProfileLike(profile: any, county?: string | null): FundingProfileLike {
    return {
      county,
      caenPrimary: profile?.caenPrimary,
      caenSecondary: profile?.caenSecondary ?? [],
      foundedDate: profile?.foundedDate,
      headcount: profile?.headcount,
      turnoverEur: profile?.turnoverEur,
      balanceSheetEur: profile?.balanceSheetEur,
      subscribedCapitalEur: profile?.subscribedCapitalEur,
      accumulatedLossEur: profile?.accumulatedLossEur,
      equityEur: profile?.equityEur,
      partnerLinks: (profile?.partnerLinks as any) ?? [],
      anafDebt: profile?.anafDebt ?? false,
      insolvent: profile?.insolvent ?? false,
    };
  }

  private async orgCounty(organizationId: string): Promise<string | null> {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { county: true } }).catch(() => null);
    return org?.county ?? null;
  }

  // ---------- FND-2 match ----------
  async match(organizationId: string, request: MatchRequest & { requestedCostEur?: number } = {}) {
    const profileRow = await this.getProfile(organizationId);
    if (!profileRow) throw new BadRequestException('No funding profile — create one first (POST funds/profile).');
    const county = await this.orgCounty(organizationId);
    const profile = this.toProfileLike(profileRow, county);
    const headroom = await this.deMinimis.headroom(organizationId);
    const programs = (await this.prisma.fundingProgram.findMany()) as unknown as FundingProgramLike[];
    const ranked = rankMatches(profile, programs, { ...request, deMinimisHeadroomEur: headroom });
    return {
      deMinimisHeadroomEur: Math.round(headroom),
      eligibleCount: ranked.filter((r) => r.eligible).length,
      matches: ranked,
    };
  }

  // ---------- FND-4 pre-check ----------
  async precheck(userId: string, organizationId: string | undefined, body: { requestedType?: string; requestedCostEur?: number }) {
    const profileRow = organizationId ? await this.getProfile(organizationId) : null;
    const county = organizationId ? await this.orgCounty(organizationId) : null;
    const profile = this.toProfileLike(profileRow, county);
    const requested = body.requestedCostEur ?? 0;
    const headroom = organizationId ? await this.deMinimis.headroom(organizationId) : 300_000;

    const criteria: { criterion: string; pass: boolean; reason: string }[] = [];
    // size known?
    const hasSize = (profile.headcount ?? 0) > 0;
    criteria.push({ criterion: 'enterprise_size', pass: hasSize, reason: hasSize ? `Headcount ${profile.headcount} on record.` : 'No headcount — complete the profile.' });
    // age ≥ 1 fiscal year
    const founded = profile.foundedDate ? new Date(profile.foundedDate) : null;
    const ageOk = !founded || (new Date('2026-07-01').getTime() - founded.getTime()) / (365.25 * 864e5) >= 1;
    criteria.push({ criterion: 'age', pass: ageOk, reason: ageOk ? 'At least one fiscal year (or age not restricting).' : 'Less than one fiscal year of activity.' });
    // firm in difficulty
    const fid = isFirmInDifficulty(profile);
    criteria.push({ criterion: 'firm_in_difficulty', pass: !fid, reason: fid ? 'Firm in difficulty (GBER Art.2(18)).' : 'Not a firm in difficulty.' });
    // ANAF debt
    criteria.push({ criterion: 'anaf_debt', pass: !profile.anafDebt, reason: profile.anafDebt ? 'Outstanding ANAF debts (self-declared).' : 'No ANAF debt declared.' });
    // insolvency
    criteria.push({ criterion: 'insolvency', pass: !profile.insolvent, reason: profile.insolvent ? 'Enterprise is insolvent.' : 'Not insolvent.' });
    // de minimis headroom
    const headroomOk = requested <= headroom;
    criteria.push({ criterion: 'de_minimis_headroom', pass: headroomOk, reason: headroomOk ? `€${Math.round(headroom).toLocaleString()} de minimis headroom available.` : `Requested €${requested.toLocaleString()} exceeds €${Math.round(headroom).toLocaleString()} headroom.` });

    const eligible = criteria.every((c) => c.pass);
    const lead = await this.prisma.fundingLead.create({
      data: {
        userId, organizationId: organizationId ?? null, criteria: criteria as any, eligible,
        requestedType: body.requestedType ?? null, requestedCostEur: body.requestedCostEur ?? null,
      },
    });
    return { eligible, criteria, leadId: lead.id };
  }

  listLeads(userId: string) {
    return this.prisma.fundingLead.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }
}
