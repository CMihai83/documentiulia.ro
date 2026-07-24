import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Global infrastructure modules (@Global) the platform registers in app.module —
// required in any slice for cross-cutting DI (cache, redis, tenant, security...).
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
import { InvoicesModule } from '../invoices/invoices.module';
import { VatModule } from '../vat/vat.module';
import { PaymentsModule } from '../payments/payments.module';
import { BillingModule } from '../billing/billing.module';
import { AnafModule } from '../anaf/anaf.module';
import { HealthModule } from '../health/health.module';

/**
 * invoicing-efactura — standalone deployable slice (REQ-043).
 *
 * Same source tree as the full platform, but only the invoicing/compliance
 * module graph is bootstrapped: auth, invoices (+recurring/reminders), VAT,
 * payments, billing, ANAF (e-Factura B2B/B2C, SPV, SAF-T D406, e-Transport).
 * Transitive imports (finance, notifications, communication, saga) come in
 * via InvoicesModule; their routes ship with the slice for now and get
 * pruned when slim module variants exist.
 *
 * MODE=standalone: own DATABASE_URL, own JWT_SECRET, own port (3101).
 * MODE=platform: not used — the full app.module serves platform mode.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot({
      // Hoisted from microservices.module (REQ-043 cleanup): the automation
      // wildcard listeners depend on wildcard mode being enabled app-wide.
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: true,
    }),
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
    InvoicesModule,
    VatModule,
    PaymentsModule,
    BillingModule,
    AnafModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class InvoicingAppModule {}
