import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Tier } from '@prisma/client';
import { REQUIRES_TIER_KEY } from './tiers.decorator';

/** Subscription hierarchy — higher index unlocks everything below it. */
const TIER_ORDER: Tier[] = [Tier.FREE, Tier.PRO, Tier.BUSINESS, Tier.ENTERPRISE];
const rank = (t: Tier | undefined | null): number => {
  const i = TIER_ORDER.indexOf((t as Tier) ?? Tier.FREE);
  return i === -1 ? 0 : i;
};

/**
 * Gates a route by minimum subscription tier. Reads req.user populated by
 * JwtStrategy (which selects tier + organizationMemberships). The effective
 * tier is the best of the user's own tier and any active org's tier, matching
 * auth.service's "prefer org tier" login behaviour.
 *
 * Use AFTER JwtAuthGuard: @UseGuards(JwtAuthGuard, TierGuard) + @RequiresTier(Tier.PRO).
 */
@Injectable()
export class TierGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Tier | undefined>(REQUIRES_TIER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true; // no tier requirement on this route

    const user: any = context.switchToHttp().getRequest().user;
    if (!user) throw new ForbiddenException('Authentication required');

    let effective = rank(user.tier);
    for (const m of user.organizationMemberships ?? []) {
      effective = Math.max(effective, rank(m?.organization?.tier));
    }

    if (effective < rank(required)) {
      throw new ForbiddenException(
        `This feature requires the ${required} plan. Your current plan: ${TIER_ORDER[effective]}. ` +
          `Upgrade at /dashboard/settings/subscription.`,
      );
    }
    return true;
  }
}
