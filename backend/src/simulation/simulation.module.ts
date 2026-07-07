/**
 * Simulation Module
 * NestJS module for the business simulation feature
 * Sprint 25 - World-Class Simulation
 */

import { Module } from '@nestjs/common';
import { SimulationController } from './simulation.controller';
import { SimulationService } from './simulation.service';
import { AIRecommendationsService } from './ai-recommendations.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SimV2Controller } from './v2/simv2.controller';
import { SimV2Service } from './v2/simv2.service';

@Module({
  imports: [PrismaModule],
  controllers: [SimulationController, SimV2Controller],
  providers: [SimulationService, AIRecommendationsService, SimV2Service],
  exports: [SimulationService, SimV2Service],
})
export class SimulationModule {}
