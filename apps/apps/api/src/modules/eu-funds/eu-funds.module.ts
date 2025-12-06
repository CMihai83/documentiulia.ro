/**
 * EU Funds Module - Enchantment binding for PNRR/Cohesion/InvestEU
 * Assembles eligibility scanner, application tracker, and analytics spells
 */

import { Module } from '@nestjs/common';
import { EuFundsController } from './eu-funds.controller';
import { EuFundsService } from './eu-funds.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EuFundsController],
  providers: [EuFundsService],
  exports: [EuFundsService],
})
export class EuFundsModule {}
