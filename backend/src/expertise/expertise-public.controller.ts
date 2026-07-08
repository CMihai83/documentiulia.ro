import { Controller, Get, Param } from '@nestjs/common';
import { CredentialService } from './credential.service';
import { ProfileService } from './profile.service';

/**
 * EXP-8/10 — PUBLIC endpoints, deliberately WITHOUT JwtAuthGuard/TierGuard:
 * - verify/:code — credential verification must work logged-out (that is the
 *   point of a verifiable credential). Exposes only the credential JSON,
 *   signature validity and revocation status — no other user data.
 * - experts/:userId — public expert profile, DOUBLE-GATED inside the service
 *   (user opt-in AND EXPERT_PROFILES_PUBLIC flag; 404 otherwise, flag OFF at
 *   deploy pending DPO review).
 */
@Controller('expertise')
export class ExpertisePublicController {
  constructor(
    private readonly credentials: CredentialService,
    private readonly profiles: ProfileService,
  ) {}

  @Get('verify/:code')
  verify(@Param('code') code: string) {
    return this.credentials.verifyPublic(code);
  }

  @Get('experts/:userId')
  publicProfile(@Param('userId') userId: string) {
    return this.profiles.publicProfile(userId);
  }
}
