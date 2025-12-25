import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Services
import { VendorManagementService } from './vendor-management.service';
import { VendorOnboardingService } from './vendor-onboarding.service';
import { VendorPerformanceService } from './vendor-performance.service';
import { VendorContractsService } from './vendor-contracts.service';
import { VendorPortalService } from './vendor-portal.service';
import { VendorPaymentsService } from './vendor-payments.service';

// Controllers
import { VendorManagementController } from './vendor-management.controller';
import { VendorOnboardingController } from './vendor-onboarding.controller';
import { VendorPerformanceController } from './vendor-performance.controller';
import { VendorContractsController } from './vendor-contracts.controller';
import { VendorPortalController } from './vendor-portal.controller';
import { VendorPaymentsController } from './vendor-payments.controller';

@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [
    VendorManagementController,
    VendorOnboardingController,
    VendorPerformanceController,
    VendorContractsController,
    VendorPortalController,
    VendorPaymentsController,
  ],
  providers: [
    VendorManagementService,
    VendorOnboardingService,
    VendorPerformanceService,
    VendorContractsService,
    VendorPortalService,
    VendorPaymentsService,
  ],
  exports: [
    VendorManagementService,
    VendorOnboardingService,
    VendorPerformanceService,
    VendorContractsService,
    VendorPortalService,
    VendorPaymentsService,
  ],
})
export class VendorManagementModule {}
