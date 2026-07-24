import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { OnboardingEmailListener } from './onboarding-email.listener';
import { OnboardingGamificationService } from './onboarding-gamification.service';
import { OnboardingGamificationController } from './onboarding-gamification.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [OnboardingController, OnboardingGamificationController],
  providers: [OnboardingService, OnboardingEmailListener, OnboardingGamificationService],
  exports: [OnboardingService, OnboardingGamificationService],
})
export class OnboardingModule {}
