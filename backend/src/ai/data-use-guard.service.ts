import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * GI-AI-2 — Art 28(10) role-flip guard.
 *
 * Processing a tenant's data for OUR OWN purpose (training/calibrating the
 * simulator, cross-tenant analytics) turns us from processor into controller and
 * requires specific written authorisation from that controller (CNIL 2022).
 * This service is the single gate: own-purpose use of tenant data is blocked
 * unless the org has explicitly authorised it, and even then only aggregates
 * (never person-level fields) are allowed out.
 */
@Injectable()
export class DataUseGuardService {
  private readonly logger = new Logger(DataUseGuardService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Throws unless the organization has explicitly authorised own-purpose AI use. */
  async assertTrainingAllowed(organizationId: string): Promise<void> {
    if (!organizationId) {
      throw new ForbiddenException('Art 28(10): organisation context required for AI data use');
    }
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { aiTrainingAuthorized: true },
    });
    if (!org?.aiTrainingAuthorized) {
      throw new ForbiddenException(
        'Art 28(10): this organisation has not authorised use of its data for AI training/calibration. Use industry presets or synthetic data instead.',
      );
    }
  }

  /** Non-throwing variant for callers that degrade gracefully to presets. */
  async isTrainingAllowed(organizationId: string): Promise<boolean> {
    if (!organizationId) return false;
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { aiTrainingAuthorized: true },
    });
    return !!org?.aiTrainingAuthorized;
  }

  /**
   * Strip person-level fields so only aggregates can feed a model, even for an
   * authorised org. Removes names, CNP, emails, phones, and per-person salary/pay.
   */
  scrubForCalibration<T = any>(data: T): T {
    const PERSON_KEYS = new Set([
      'cnp', 'firstname', 'lastname', 'name', 'fullname', 'email', 'phone', 'telefon',
      'salary', 'grosssalary', 'netsalary', 'salariu', 'iban', 'bankaccount', 'address', 'adresa',
    ]);
    const walk = (v: any): any => {
      if (Array.isArray(v)) return v.map(walk);
      if (v && typeof v === 'object') {
        const out: any = {};
        for (const [k, val] of Object.entries(v)) {
          if (PERSON_KEYS.has(k.toLowerCase())) continue; // drop person-level field
          out[k] = walk(val);
        }
        return out;
      }
      return v;
    };
    return walk(data);
  }

  /** Record an explicit authorisation change (audited by the caller). */
  async setAuthorization(organizationId: string, authorized: boolean, actorUserId: string): Promise<void> {
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        aiTrainingAuthorized: authorized,
        aiTrainingAuthorizedAt: authorized ? new Date() : null,
        aiTrainingAuthorizedBy: authorized ? actorUserId : null,
      },
    });
    this.logger.log(`AI data-use authorization for org ${organizationId} set to ${authorized} by ${actorUserId}`);
  }
}
