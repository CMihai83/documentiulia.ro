import { SetMetadata } from '@nestjs/common';
import { Tier } from '@prisma/client';

export const REQUIRES_TIER_KEY = 'requiresTier';

/** Minimum subscription tier required for a route/controller (FREE < PRO < BUSINESS < ENTERPRISE). */
export const RequiresTier = (tier: Tier) => SetMetadata(REQUIRES_TIER_KEY, tier);
