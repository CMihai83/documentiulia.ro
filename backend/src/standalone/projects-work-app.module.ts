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
import { HealthModule } from '../health/health.module';

import { ProjectManagementModule } from '../project-management/project-management.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { CollaborationModule } from '../collaboration/collaboration.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { ConsultingModule } from '../consulting/consulting.module';
import { ExpertiseModule } from '../expertise/expertise.module';
import { BusinessCaseModule } from '../business-case/business-case.module';

/**
 * projects-work — standalone deployable slice (REQ-043, port 3109).
 * Projects & services work: PM (epics/kanban/tasks/time), workspaces, collaboration, workflow, consulting, expertise, business case.
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
    ProjectManagementModule,
    WorkspacesModule,
    CollaborationModule,
    WorkflowModule,
    ConsultingModule,
    ExpertiseModule,
    BusinessCaseModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class ProjectsWorkAppModule {}
