import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

interface UserMembership {
  id: string;
  organizationId: string;
  role: string;
  organization: {
    id: string;
    name: string;
    cui: string | null;
    tier: string;
  };
}

/**
 * REQ-048 security fix: JWT_SECRET previously fell back to the constant
 * 'documentiulia_jwt_secret', which is committed to this repository. Any
 * deployment missing the env var silently signed and accepted tokens anyone
 * could forge — and made tokens valid across every standalone slice too.
 * Refuse to start instead.
 */
function requireJwtSecret(configService: ConfigService): string {
  const secret = configService.get<string>('JWT_SECRET');
  if (!secret || secret.length < 16 || secret === 'documentiulia_jwt_secret') {
    throw new Error(
      'JWT_SECRET is missing, too short, or still the default placeholder. ' +
      'Set a unique secret of at least 16 characters before starting the API.',
    );
  }
  return secret;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: requireJwtSecret(configService),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        cui: true,
        tier: true,
        role: true,
        activeOrganizationId: true,
        organizationMemberships: {
          where: { isActive: true },
          select: {
            id: true,
            organizationId: true,
            role: true,
            organization: {
              select: {
                id: true,
                name: true,
                cui: true,
                tier: true,
              },
            },
          },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Transform memberships to a more usable format
    const organizations = user.organizationMemberships.map((m: UserMembership) => ({
      id: m.organizationId,
      name: m.organization.name,
      cui: m.organization.cui,
      tier: m.organization.tier,
      role: m.role,
    }));

    // Get primary organization ID
    const primaryOrg = user.organizationMemberships[0];
    const organizationId = user.activeOrganizationId || primaryOrg?.organizationId;

    return {
      ...user,
      sub: user.id, // Required for controllers using req.user.sub
      organizations,
      organizationId, // Add organizationId for subscription/other services
    };
  }
}
