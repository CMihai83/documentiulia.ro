import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MarketingAutomationService } from './marketing-automation.service';
import { MarketingAutomationController } from './marketing-automation.controller';
import { EmailCampaignsService } from './email-campaigns.service';
import { EmailCampaignsController } from './email-campaigns.controller';
import { LandingPagesService } from './landing-pages.service';
import { LandingPagesController } from './landing-pages.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule, EventEmitterModule.forRoot()],
  controllers: [
    MarketingAutomationController,
    EmailCampaignsController,
    LandingPagesController,
  ],
  providers: [
    MarketingAutomationService,
    EmailCampaignsService,
    LandingPagesService,
  ],
  exports: [
    MarketingAutomationService,
    EmailCampaignsService,
    LandingPagesService,
  ],
})
export class MarketingModule {}
