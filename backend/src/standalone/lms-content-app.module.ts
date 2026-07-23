import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

// Global infrastructure modules (@Global) — required in every slice.
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { CacheModule } from '../cache/cache.module';
import { CommonModule } from '../common/common.module';
import { LoggingModule } from '../logging/logging.module';
import { SecurityModule } from '../security/security.module';
import { TenantModule } from '../tenant/tenant.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { ChartsModule } from '../charts/charts.module';
import { MatchingModule } from '../matching/matching.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { HealthModule } from '../health/health.module';

import { LMSModule } from '../lms/lms.module';
import { ContentModule } from '../content/content.module';
import { HelpModule } from '../help/help.module';

/**
 * lms-content — standalone deployable slice (REQ-043, port 3110).
 * Learning & content: LMS courses/certifications/gamification, CMS (blog/forum/courses), help center.
 * See docs/architecture/standalone-modules.md for the dual-mode contract.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10),
        limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
      },
    ]),
    PrismaModule,
    RedisModule,
    CacheModule,
    CommonModule,
    LoggingModule,
    SecurityModule,
    TenantModule,
    SubscriptionModule,
    MonitoringModule,
    ChartsModule,
    MatchingModule,
    AuthModule,
    UsersModule,
    LMSModule,
    ContentModule,
    HelpModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class LmsContentAppModule {}
