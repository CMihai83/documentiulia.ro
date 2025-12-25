import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../prisma/prisma.module';

// Services
import { AssetManagementService } from './asset-management.service';
import { AssetDepreciationService } from './asset-depreciation.service';
import { AssetMaintenanceService } from './asset-maintenance.service';
import { AssetLocationService } from './asset-location.service';
import { AssetReportsService } from './asset-reports.service';
import { AssetDisposalService } from './asset-disposal.service';

// Controllers
import { AssetManagementController } from './asset-management.controller';
import { AssetDepreciationController } from './asset-depreciation.controller';
import { AssetMaintenanceController } from './asset-maintenance.controller';
import { AssetLocationController } from './asset-location.controller';
import { AssetReportsController } from './asset-reports.controller';
import { AssetDisposalController } from './asset-disposal.controller';

@Module({
  imports: [
    PrismaModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [
    AssetManagementController,
    AssetDepreciationController,
    AssetMaintenanceController,
    AssetLocationController,
    AssetReportsController,
    AssetDisposalController,
  ],
  providers: [
    AssetManagementService,
    AssetDepreciationService,
    AssetMaintenanceService,
    AssetLocationService,
    AssetReportsService,
    AssetDisposalService,
  ],
  exports: [
    AssetManagementService,
    AssetDepreciationService,
    AssetMaintenanceService,
    AssetLocationService,
    AssetReportsService,
    AssetDisposalService,
  ],
})
export class AssetManagementModule {}
