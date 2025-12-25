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

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'documentiulia_jwt_secret',
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
        organizationMemberships: {
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

    return {
      ...user,
      sub: user.id, // Required for controllers using req.user.sub
      organizations,
    };
  }
}
