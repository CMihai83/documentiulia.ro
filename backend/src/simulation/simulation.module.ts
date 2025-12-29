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

@Module({
  imports: [PrismaModule],
  controllers: [SimulationController],
  providers: [SimulationService, AIRecommendationsService],
  exports: [SimulationService],
})
export class SimulationModule {}
