import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Services
import { BudgetPlanningService } from './budget-planning.service';
import { BudgetTrackingService } from './budget-tracking.service';
import { BudgetVarianceService } from './budget-variance.service';
import { BudgetForecastingService } from './budget-forecasting.service';
import { BudgetApprovalService } from './budget-approval.service';
import { BudgetReportingService } from './budget-reporting.service';

// Controllers
import { BudgetPlanningController } from './budget-planning.controller';
import { BudgetTrackingController } from './budget-tracking.controller';
import { BudgetVarianceController } from './budget-variance.controller';
import { BudgetForecastingController } from './budget-forecasting.controller';
import { BudgetApprovalController } from './budget-approval.controller';
import { BudgetReportingController } from './budget-reporting.controller';

@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [
    BudgetPlanningController,
    BudgetTrackingController,
    BudgetVarianceController,
    BudgetForecastingController,
    BudgetApprovalController,
    BudgetReportingController,
  ],
  providers: [
    BudgetPlanningService,
    BudgetTrackingService,
    BudgetVarianceService,
    BudgetForecastingService,
    BudgetApprovalService,
    BudgetReportingService,
  ],
  exports: [
    BudgetPlanningService,
    BudgetTrackingService,
    BudgetVarianceService,
    BudgetForecastingService,
    BudgetApprovalService,
    BudgetReportingService,
  ],
})
export class BudgetManagementModule {}
