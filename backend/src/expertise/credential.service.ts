import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditChainService } from '../audit/audit-chain.service';
import { getCredentialSigner, canonicalize } from './credential.signer';

const ISSUER = {
  id: 'https://documentiulia.ro/issuer',
  type: 'Profile',
  name: 'DocumentIulia.ro',
};

/**
 * EXP-8 — Open Badges 3.0 / W3C VC issuance, public verification, revocation,
 * and an ELM(Europass)-aligned export.
 *
 * Mastery rule: a credential is claimable for a skill once the user holds it at
 * the `assessed`+ tier with proficiency ≥ 4 (or `verified` at any proficiency).
 * Every issuance/revocation is consent-logged on the audit chain.
 */
@Injectable()
export class CredentialService {
  private readonly logger = new Logger(CredentialService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditChainService,
  ) {}

  private buildUnsignedVc(params: {
    verifyCode: string;
    userId: string;
    skill: { escoUri: string; preferredLabel: string; description: string };
    evidence: any[];
    proficiency: number;
    tier: string;
  }) {
    const now = new Date().toISOString();
    return {
      '@context': [
        'https://www.w3.org/ns/credentials/v2',
        'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json',
      ],
      id: `https://documentiulia.ro/api/v1/expertise/verify/${params.verifyCode}`,
      type: ['VerifiableCredential', 'OpenBadgeCredential'],
      issuer: ISSUER,
      validFrom: now,
      credentialSubject: {
        type: ['AchievementSubject'],
        identifier: [{ type: 'IdentityObject', identityHash: crypto.createHash('sha256').update(params.userId).digest('hex'), hashed: true }],
        achievement: {
          type: ['Achievement'],
          name: params.skill.preferredLabel,
          description: params.skill.description || `Competență demonstrată: ${params.skill.preferredLabel}`,
          criteria: {
            narrative: `Attained at proficiency ${params.proficiency}/5 with evidence tier '${params.tier}' on DocumentIulia.ro (assessments, simulator work-samples, peer review).`,
          },
          alignment: [
            {
              type: ['Alignment'],
              targetUrl: params.skill.escoUri,
              targetName: params.skill.preferredLabel,
              targetFramework: 'ESCO',
            },
          ],
        },
        evidence: params.evidence.slice(-5).map((e: any) => ({
          type: ['Evidence'],
          name: e?.type ?? 'evidence',
          description: `ref=${e?.ref ?? ''} score=${e?.score ?? ''} tier=${e?.tier ?? ''}`,
        })),
      },
    };
  }

  /** Claim a credential for a mastered skill. */
  async claim(userId: string, skillUri: string) {
    const skill = await this.prisma.skill.findUnique({ where: { escoUri: skillUri } });
    if (!skill) throw new NotFoundException(`Skill ${skillUri} not found`);
    const us = await this.prisma.userSkill.findUnique({ where: { userId_skillId: { userId, skillId: skill.id } } });
    if (!us) throw new BadRequestException('You do not hold this skill yet.');
    const mastered = us.evidenceTier === 'verified' || (us.evidenceTier === 'assessed' && us.proficiency >= 4);
    if (!mastered) {
      throw new BadRequestException(
        `Mastery not reached: requires 'verified' tier, or 'assessed' at proficiency >= 4 (you: ${us.evidenceTier} @ ${us.proficiency}).`,
      );
    }

    const existing = await this.prisma.credential.findFirst({ where: { userId, skillId: skill.id, revoked: false } });
    if (existing) return existing;

    const verifyCode = crypto.randomBytes(12).toString('hex');
    const unsigned = this.buildUnsignedVc({
      verifyCode,
      userId,
      skill,
      evidence: (us.evidence as any[]) ?? [],
      proficiency: us.proficiency,
      tier: us.evidenceTier,
    });
    const signer = getCredentialSigner();
    const signature = signer.sign(unsigned);
    const vcJson = {
      ...unsigned,
      proof: {
        type: 'Ed25519Signature2020',
        created: new Date().toISOString(),
        verificationMethod: `did:web:documentiulia.ro#key-1`,
        proofPurpose: 'assertionMethod',
        proofValue: signature,
        publicKeyBase64: signer.publicKey,
      },
    };

    const cred = await this.prisma.credential.create({
      data: { userId, skillId: skill.id, vcJson: vcJson as any, signature, verifyCode, escoAlignment: skill.escoUri },
    });

    await this.audit
      .appendAudit({
        userId,
        action: 'expertise.credential.issue',
        entity: 'Credential',
        entityId: cred.id,
        details: { skillUri, verifyCode, tier: us.evidenceTier, proficiency: us.proficiency },
      })
      .catch((e) => this.logger.warn(`audit failed: ${e?.message}`));

    this.logger.log(`Credential ${cred.id} issued to ${userId} for ${skill.preferredLabel}`);
    return cred;
  }

  listMine(userId: string) {
    return this.prisma.credential.findMany({ where: { userId }, orderBy: { issuedAt: 'desc' } });
  }

  async revoke(userId: string, credentialId: string) {
    const cred = await this.prisma.credential.findFirst({ where: { id: credentialId, userId } });
    if (!cred) throw new NotFoundException(`Credential ${credentialId} not found`);
    const updated = await this.prisma.credential.update({
      where: { id: credentialId },
      data: { revoked: true, revokedAt: new Date() },
    });
    await this.audit
      .appendAudit({ userId, action: 'expertise.credential.revoke', entity: 'Credential', entityId: credentialId, details: {} })
      .catch(() => undefined);
    return updated;
  }

  /**
   * PUBLIC verification — no auth by design. Returns ONLY the credential JSON,
   * validity and revocation status; no other user data.
   */
  async verifyPublic(verifyCode: string) {
    const cred = await this.prisma.credential.findUnique({ where: { verifyCode } });
    if (!cred) throw new NotFoundException('Credential not found');
    const vc: any = cred.vcJson;
    const { proof, ...unsigned } = vc ?? {};
    const signatureValid = getCredentialSigner().verify(unsigned, cred.signature);
    return {
      credential: vc,
      signatureValid,
      revoked: cred.revoked,
      revokedAt: cred.revokedAt,
      status: cred.revoked ? 'revoked' : signatureValid ? 'valid' : 'signature_invalid',
      issuedAt: cred.issuedAt,
    };
  }

  /**
   * ELM(Europass)-aligned JSON export. NOTE: aligned to the ELM vocabulary, but
   * full Europass wallet-grade compliance is NOT yet validated (follow-up).
   */
  async europassExport(userId: string, credentialId: string) {
    const cred = await this.prisma.credential.findFirst({ where: { id: credentialId, userId } });
    if (!cred) throw new NotFoundException(`Credential ${credentialId} not found`);
    const vc: any = cred.vcJson;
    const achievement = vc?.credentialSubject?.achievement ?? {};
    return {
      '@context': 'https://data.europa.eu/snb/model/context/edc-ap',
      type: 'EuropeanDigitalCredential',
      credentialSchema: { id: 'https://data.europa.eu/snb/model/ap/edc-generic-full', type: 'ShaclValidator2017' },
      issuer: { legalName: { en: ISSUER.name }, id: ISSUER.id },
      issuanceDate: cred.issuedAt,
      title: { en: achievement.name, ro: achievement.name },
      description: { en: achievement.description },
      learningAchievement: {
        title: { en: achievement.name },
        alignment: achievement.alignment ?? [],
        provenBy: vc?.credentialSubject?.evidence ?? [],
      },
      originalCredential: vc,
      _note: 'ELM-aligned export; full Europass wallet compliance validation pending.',
    };
  }
}
