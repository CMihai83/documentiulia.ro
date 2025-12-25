import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SDKGeneratorService } from './sdk-generator.service';
import { SDKGeneratorController } from './sdk-generator.controller';
import { WebhookTesterService } from './webhook-tester.service';
import { WebhookTesterController } from './webhook-tester.controller';
import { APISandboxService } from './api-sandbox.service';
import { APISandboxController } from './api-sandbox.controller';
import { DeveloperPortalService } from './developer-portal.service';
import { DeveloperPortalController } from './developer-portal.controller';
import { APIAnalyticsService } from './api-analytics.service';
import { APIAnalyticsController } from './api-analytics.controller';
import { RateLimitService } from './rate-limit.service';
import { RateLimitController } from './rate-limit.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, EventEmitterModule.forRoot()],
  controllers: [
    SDKGeneratorController,
    WebhookTesterController,
    APISandboxController,
    DeveloperPortalController,
    APIAnalyticsController,
    RateLimitController,
  ],
  providers: [
    SDKGeneratorService,
    WebhookTesterService,
    APISandboxService,
    DeveloperPortalService,
    APIAnalyticsService,
    RateLimitService,
  ],
  exports: [
    SDKGeneratorService,
    WebhookTesterService,
    APISandboxService,
    DeveloperPortalService,
    APIAnalyticsService,
    RateLimitService,
  ],
})
export class DeveloperModule {}
