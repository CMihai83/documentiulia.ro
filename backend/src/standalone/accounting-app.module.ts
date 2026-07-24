import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';

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
import { AccountingModule } from '../accounting/accounting.module';
import { BankReconciliationModule } from '../bank-reconciliation/bank-reconciliation.module';
import { BudgetManagementModule } from '../budget-management/budget-management.module';
import { ControllingModule } from '../controlling/controlling.module';
import { AssetManagementModule } from '../asset-management/asset-management.module';
import { FundsModule } from '../funds/funds.module';
import { ExpenseManagementModule } from '../expense-management/expense-management.module';
import { HealthModule } from '../health/health.module';

/**
 * accounting-core — standalone deployable slice (REQ-043, port 3102).
 *
 * SME accounting/close: chart of accounts + period closing, bank
 * reconciliation, budgets (planning/tracking/variance/forecast), controlling
 * (cost/profit centers, consolidation), fixed assets (depreciation/disposal/
 * maintenance), funds/treasury, expense management.
 * See docs/architecture/standalone-modules.md for the dual-mode contract.
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
    AccountingModule,
    BankReconciliationModule,
    BudgetManagementModule,
    ControllingModule,
    AssetManagementModule,
    FundsModule,
    ExpenseManagementModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AccountingAppModule {}
