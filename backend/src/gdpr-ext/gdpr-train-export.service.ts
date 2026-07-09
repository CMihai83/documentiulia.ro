import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditChainService } from '../audit/audit-chain.service';
import { LEGAL_TERMS } from './legal-terms';
import { scanHtml, ScanResult } from './cmp-harden.logic';

const TRAINING_VALIDITY_MONTHS = 12;

/** The role-based GDPR micro-courses seeded into the existing LMS. */
const GDPR_COURSES = [
  { key: 'gdpr-general', title: 'GDPR — noțiuni esențiale pentru tot personalul', category: 'COMPLIANCE', roleTag: 'general' },
  { key: 'gdpr-hr-cnp', title: 'GDPR pentru HR — CNP și Legea 190/2018', category: 'HR_COMPLIANCE', roleTag: 'hr' },
  { key: 'gdpr-finance-retention', title: 'GDPR pentru Finanțe — retenție și temeiuri', category: 'FINANCE_OPS', roleTag: 'finance' },
  { key: 'gdpr-marketing-consent', title: 'GDPR pentru Marketing — consimțământ și cookie-uri', category: 'MARKETING', roleTag: 'marketing' },
] as const;

@Injectable()
export class GdprTrainExportService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditChainService) {}

  // ---------------------------------------------------------------- GE-TRAIN
  /** Idempotently seed the four role-based GDPR courses (slug-unique). */
  async seedCourses() {
    const out: Array<{ key: string; id: string; created: boolean }> = [];
    for (const c of GDPR_COURSES) {
      const slug = `gdpr-training-${c.key}`;
      const existing = await this.prisma.lMSCourse.findUnique({ where: { slug } });
      if (existing) { out.push({ key: c.key, id: existing.id, created: false }); continue; }
      const course = await this.prisma.lMSCourse.create({
        data: {
          title: c.title, slug, description: `Curs de conformitate GDPR (${c.roleTag}).`,
          category: c.category as any, level: 'BEGINNER' as any, duration: 30, isFree: true, price: 0,
          currency: 'RON', language: 'ro', status: 'LMS_PUBLISHED' as any, hasCertificate: true,
          tags: ['gdpr', 'compliance', c.roleTag],
          shortDescription: 'Micro-curs GDPR obligatoriu, valabil 12 luni.',
          learningOutcomes: ['Principii GDPR', 'Drepturile persoanelor vizate', 'Obligațiile angajaților'],
          publishedAt: new Date(),
        },
      });
      const mod = await this.prisma.lMSCourseModule.create({
        data: { courseId: course.id, title: 'Modul unic', order: 1, duration: 30 },
      });
      await this.prisma.lMSLesson.create({
        data: { moduleId: mod.id, title: 'Lecție + test', order: 1, duration: 30, type: 'VIDEO' as any, isFree: true, content: 'GDPR essentials.' } as any,
      }).catch(() => undefined); // lesson shape varies; non-fatal for seeding
      out.push({ key: c.key, id: course.id, created: true });
    }
    return out;
  }

  private async gdprCourseIds(): Promise<string[]> {
    const rows = await this.prisma.lMSCourse.findMany({ where: { slug: { startsWith: 'gdpr-training-' } }, select: { id: true } });
    return rows.map((r) => r.id);
  }

  /** Record/complete a training enrollment (used by the UI + tests). */
  async completeTraining(userId: string, courseId: string, score = 100) {
    const now = new Date();
    return this.prisma.lMSEnrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: { userId, courseId, status: 'COMPLETED', progress: 100, completedAt: now, quizScore: score, passed: score >= 80, accessType: 'FREE' },
      update: { status: 'COMPLETED', progress: 100, completedAt: now, quizScore: score, passed: score >= 80 },
    });
  }

  /**
   * Does this user hold a VALID (<=12 month) GDPR-training completion?
   * This is what auto-satisfies the Law-190 Art-4 training condition.
   */
  async hasValidTraining(userId: string): Promise<boolean> {
    const courseIds = await this.gdprCourseIds();
    if (!courseIds.length) return false;
    const cutoff = new Date(Date.now() - TRAINING_VALIDITY_MONTHS * 30 * 86_400_000);
    const done = await this.prisma.lMSEnrollment.findFirst({
      where: { userId, courseId: { in: courseIds }, status: 'COMPLETED', passed: true, completedAt: { gte: cutoff } },
    });
    return !!done;
  }

  /** Does ANY member of the org hold valid training? (org-level attestation) */
  async orgHasValidTraining(orgId: string): Promise<boolean> {
    const members = await this.prisma.organizationMember.findMany({ where: { organizationId: orgId, isActive: true }, select: { userId: true } });
    for (const m of members) if (await this.hasValidTraining(m.userId)) return true;
    return false;
  }

  /** Evidence export: who completed which GDPR course, when, with what score. */
  async evidenceCsv(orgId: string): Promise<string> {
    const courseIds = await this.gdprCourseIds();
    const members = await this.prisma.organizationMember.findMany({ where: { organizationId: orgId, isActive: true }, select: { userId: true } });
    const userIds = members.map((m) => m.userId);
    const rows = courseIds.length && userIds.length
      ? await this.prisma.lMSEnrollment.findMany({
          where: { userId: { in: userIds }, courseId: { in: courseIds } },
          include: { course: { select: { title: true } } },
        })
      : [];
    const cutoff = new Date(Date.now() - TRAINING_VALIDITY_MONTHS * 30 * 86_400_000);
    const header = 'userId,course,status,completedAt,score,valid\n';
    const body = rows.map((r) => {
      const valid = r.status === 'COMPLETED' && !!r.completedAt && r.completedAt >= cutoff && !!r.passed;
      return [r.userId, `"${(r as any).course?.title ?? ''}"`, r.status, r.completedAt?.toISOString() ?? '', r.quizScore ?? '', valid].join(',');
    }).join('\n');
    return header + body + '\n';
  }

  // ------------------------------------------------------------- GE-DATA-ACT
  /**
   * Full-account export (EU Data Act switching / doubles as Art 20). Streams a
   * structured zip of the org's data by module. Secrets/PII-security fields are
   * excluded (mirrors gdpr.service exportUserData exclusions).
   */
  async fullExport(orgId: string): Promise<Buffer> {
    const JSZip = require('jszip');
    const zip = new JSZip();
    const [invoices, partners, employees, ropa, policies, consents, dsars, vendors] = await Promise.all([
      this.prisma.invoice.findMany({ where: { OR: [{ organizationId: orgId }, { userId: orgId }] } }).catch(() => []),
      this.prisma.partner.findMany({ where: { OR: [{ organizationId: orgId }, { userId: orgId }] } }).catch(() => []),
      this.prisma.employee.findMany({ where: { OR: [{ organizationId: orgId }, { userId: orgId }] } }).catch(() => []),
      this.prisma.ropaEntry.findMany({ where: { orgId } }).catch(() => []),
      this.prisma.policyDocument.findMany({ where: { orgId } }).catch(() => []),
      this.prisma.consentRecord.findMany({ where: { orgId } }).catch(() => []),
      this.prisma.dsarRequest.findMany({ where: { orgId } }).catch(() => []),
      this.prisma.gdprVendor.findMany({ where: { orgId } }).catch(() => []),
    ]);
    // strip security material from employees (mirror internal export rules)
    const scrub = (rows: any[], drop: string[]) => rows.map((r) => { const c = { ...r }; for (const k of drop) delete c[k]; return c; });
    const manifest = {
      exportedAt: new Date().toISOString(),
      orgId, format: 'documentiulia-full-export/v1',
      note: 'EU Data Act switching export; doubles as Art. 20 portability. Security material (passwords, MFA secrets, tokens) excluded.',
      counts: { invoices: invoices.length, partners: partners.length, employees: employees.length, ropa: ropa.length, policies: policies.length, consents: consents.length, dsars: dsars.length, vendors: vendors.length },
      legalTerms: LEGAL_TERMS,
    };
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    zip.file('invoices.json', JSON.stringify(invoices, null, 2));
    zip.file('partners.json', JSON.stringify(partners, null, 2));
    zip.file('employees.json', JSON.stringify(scrub(employees as any[], ['cnp', 'cnpHash', 'iban', 'bankAccount']), null, 2));
    zip.file('ropa.json', JSON.stringify(ropa, null, 2));
    zip.file('policies.json', JSON.stringify(policies, null, 2));
    zip.file('consents.json', JSON.stringify(consents, null, 2));
    zip.file('dsar-requests.json', JSON.stringify(dsars, null, 2));
    zip.file('vendors.json', JSON.stringify(vendors, null, 2));
    return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  }

  // ---------------------------------------------------------- GE-CMP-HARDEN
  /** Static single-page cookie scan (10s cap, polite UA). Fetch lives here; logic is pure. */
  async scanSite(orgId: string, url: string): Promise<ScanResult & { url: string; fetchedAt: string }> {
    if (!/^https?:\/\//i.test(url)) throw new NotFoundException('URL invalid');
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10_000);
    let html = '';
    try {
      const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'DocumentIulia-GDPR-Scanner/1.0 (+https://documentiulia.ro)' } });
      html = await res.text();
    } finally {
      clearTimeout(t);
    }
    const result = scanHtml(html);
    await this.prisma.cmpBannerConfig.updateMany({ where: { orgId }, data: { scanResult: result as any, scannedAt: new Date() } }).catch(() => undefined);
    return { ...result, url, fetchedAt: new Date().toISOString() };
  }
}
