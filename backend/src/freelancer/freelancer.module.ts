import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FreelancerController } from './freelancer.controller';
import { FreelancerService } from './freelancer.service';
import { SmartContractController } from './smart-contract.controller';
import { SmartContractService } from './smart-contract.service';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';
import { FreelancerComplianceController } from './freelancer-compliance.controller';
import { FreelancerComplianceService } from './freelancer-compliance.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [
    FreelancerController,
    SmartContractController,
    WorkspaceController,
    FreelancerComplianceController,
  ],
  providers: [
    FreelancerService,
    SmartContractService,
    WorkspaceService,
    FreelancerComplianceService,
  ],
  exports: [
    FreelancerService,
    SmartContractService,
    WorkspaceService,
    FreelancerComplianceService,
  ],
})
export class FreelancerModule {}
