import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HRContractsController } from './hr-contracts.controller';
import { HRContractsService } from './hr-contracts.service';
import { ContractGeneratorService } from './contract-generator.service';
import { RevisalService } from './revisal.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [HRContractsController],
  providers: [HRContractsService, ContractGeneratorService, RevisalService],
  exports: [HRContractsService, ContractGeneratorService, RevisalService],
})
export class HRContractsModule {}
