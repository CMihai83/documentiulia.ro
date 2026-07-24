import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HRContractsController } from './hr-contracts.controller';
import { HRContractsService } from './hr-contracts.service';
import { ContractGeneratorService } from './contract-generator.service';
import { RevisalService } from './revisal.service';
import { RegesOnlineService } from './reges-online.service';
import { RegesOnlineController } from './reges-online.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [HRContractsController, RegesOnlineController],
  providers: [HRContractsService, ContractGeneratorService, RevisalService, RegesOnlineService],
  exports: [HRContractsService, ContractGeneratorService, RevisalService, RegesOnlineService],
})
export class HRContractsModule {}
