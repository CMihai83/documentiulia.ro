import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Services
import { ProcurementManagementService } from './procurement-management.service';
import { PurchaseRequisitionsService } from './purchase-requisitions.service';
import { SupplierQuotationsService } from './supplier-quotations.service';
import { PurchaseOrdersService } from './purchase-orders.service';
import { GoodsReceiptService } from './goods-receipt.service';
import { ProcurementAnalyticsService } from './procurement-analytics.service';

// Controllers
import { ProcurementManagementController } from './procurement-management.controller';
import {
  PurchaseRequisitionsController,
  ApprovalRulesController,
} from './purchase-requisitions.controller';
import {
  RFQController,
  QuotationsController,
} from './supplier-quotations.controller';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { GoodsReceiptController } from './goods-receipt.controller';
import { ProcurementAnalyticsController } from './procurement-analytics.controller';

@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [
    ProcurementManagementController,
    PurchaseRequisitionsController,
    ApprovalRulesController,
    RFQController,
    QuotationsController,
    PurchaseOrdersController,
    GoodsReceiptController,
    ProcurementAnalyticsController,
  ],
  providers: [
    ProcurementManagementService,
    PurchaseRequisitionsService,
    SupplierQuotationsService,
    PurchaseOrdersService,
    GoodsReceiptService,
    ProcurementAnalyticsService,
  ],
  exports: [
    ProcurementManagementService,
    PurchaseRequisitionsService,
    SupplierQuotationsService,
    PurchaseOrdersService,
    GoodsReceiptService,
    ProcurementAnalyticsService,
  ],
})
export class ProcurementModule {}
