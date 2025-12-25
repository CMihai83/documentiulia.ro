import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantModule } from '../tenant/tenant.module';

// Legacy
import { WarehouseController } from './warehouse.controller';
import { WarehouseService } from './warehouse.service';

// New Services
import { WarehouseManagementService } from './warehouse-management.service';
import { StockMovementsService } from './stock-movements.service';
import { PickingPackingService } from './picking-packing.service';
import { CycleCountingService } from './cycle-counting.service';
import { WarehouseAnalyticsService } from './warehouse-analytics.service';

// New Controllers
import { WarehouseManagementController } from './warehouse-management.controller';
import {
  StockMovementsController,
  StockTransfersController,
} from './stock-movements.controller';
import {
  PickWavesController,
  PickTasksController,
  PackingSessionsController,
} from './picking-packing.controller';
import {
  CycleCountsController,
  CountTasksController,
  InventoryAdjustmentsController,
} from './cycle-counting.controller';
import {
  WarehouseAnalyticsController,
  WarehouseAlertsController,
  ScheduledReportsController,
} from './warehouse-analytics.controller';

@Module({
  imports: [PrismaModule, TenantModule, EventEmitterModule.forRoot()],
  controllers: [
    // Legacy
    WarehouseController,
    // Warehouse Management
    WarehouseManagementController,
    // Stock Movements
    StockMovementsController,
    StockTransfersController,
    // Picking & Packing
    PickWavesController,
    PickTasksController,
    PackingSessionsController,
    // Cycle Counting
    CycleCountsController,
    CountTasksController,
    InventoryAdjustmentsController,
    // Analytics
    WarehouseAnalyticsController,
    WarehouseAlertsController,
    ScheduledReportsController,
  ],
  providers: [
    // Legacy
    WarehouseService,
    // New Services
    WarehouseManagementService,
    StockMovementsService,
    PickingPackingService,
    CycleCountingService,
    WarehouseAnalyticsService,
  ],
  exports: [
    WarehouseService,
    WarehouseManagementService,
    StockMovementsService,
    PickingPackingService,
    CycleCountingService,
    WarehouseAnalyticsService,
  ],
})
export class WarehouseModule {}
