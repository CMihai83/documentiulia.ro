import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { AdvancedRouteOptimizationController } from './advanced-route-optimization.controller';
import { AdvancedRouteOptimizationService } from './advanced-route-optimization.service';
import { CustomsClearanceController } from './customs-clearance.controller';
import { CustomsClearanceService } from './customs-clearance.service';
import { DemandForecastController } from './demand-forecast.controller';
import { DemandForecastService } from './demand-forecast.service';
import { CarbonTrackingController } from './carbon-tracking.controller';
import { CarbonTrackingService } from './carbon-tracking.service';
import { InventoryReconciliationController } from './inventory-reconciliation.controller';
import { InventoryReconciliationService } from './inventory-reconciliation.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [
    InventoryController,
    AdvancedRouteOptimizationController,
    CustomsClearanceController,
    DemandForecastController,
    CarbonTrackingController,
    InventoryReconciliationController,
  ],
  providers: [
    InventoryService,
    AdvancedRouteOptimizationService,
    CustomsClearanceService,
    DemandForecastService,
    CarbonTrackingService,
    InventoryReconciliationService,
  ],
  exports: [
    InventoryService,
    AdvancedRouteOptimizationService,
    CustomsClearanceService,
    DemandForecastService,
    CarbonTrackingService,
    InventoryReconciliationService,
  ],
})
export class LogisticsModule {}
