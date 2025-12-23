import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FleetController } from './fleet.controller';
import { DriverMobileController } from './driver-mobile.controller';
import { CustomerTrackingController } from './customer-tracking.controller';
import { FleetService } from './fleet.service';
import { FleetGateway } from './fleet.gateway';
import { FleetAnalyticsService } from './fleet-analytics.service';
import { RouteOptimizationService } from './route-optimization.service';
import { RouteOptimizationController } from './route-optimization.controller';
import { GpsTrackingService } from './gps-tracking.service';
import { GpsTrackingGateway } from './gps-tracking.gateway';
import { ReportingService } from './reporting.service';
import { MaintenanceSchedulingService } from './maintenance-scheduling.service';
import { MaintenanceSchedulingController } from './maintenance-scheduling.controller';
import { ProofOfDeliveryService } from './proof-of-delivery.service';
import { DriverPerformanceService } from './driver-performance.service';
import { RouteHistoryService } from './route-history.service';
import { FuelCardService } from './fuel-card.service';
import { CustomerTrackingService } from './customer-tracking.service';
import { DeliveryInvoiceService } from './delivery-invoice.service';
import { SubcontractorManagementService } from './subcontractor-management.service';
import { FleetDashboardWidgetsService } from './fleet-dashboard-widgets.service';
import { DriverMobileEnhancedService } from './driver-mobile-enhanced.service';
import { DispatchAlertsService } from './dispatch-alerts.service';
import { FleetKpiAnalyticsService } from './fleet-kpi-analytics.service';
import { ComplianceAuditService } from './compliance-audit.service';
import { RouteSimulationService } from './route-simulation.service';
import { FleetTenantIsolationService } from './fleet-tenant-isolation.service';
import { FleetFinanceIntegrationService } from './fleet-finance-integration.service';
import { AutomatedInvoicingService } from './automated-invoicing.service';
import { GpsTrackingEnhancedService } from './gps-tracking-enhanced.service';
import { DriverNotificationsService } from './driver-notifications.service';
import { FleetReportsExportService } from './fleet-reports-export.service';
import { PredictiveMaintenanceService } from './predictive-maintenance.service';
import { DashboardAnalyticsWidgetsService } from './dashboard-analytics-widgets.service';
import { TachographService } from './tachograph.service';
import { TachographController } from './tachograph.controller';
import { FleetAnalyticsController } from './fleet-analytics.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantModule } from '../tenant/tenant.module';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [
    PrismaModule,
    TenantModule,
    FinanceModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  controllers: [FleetController, DriverMobileController, CustomerTrackingController, TachographController, FleetAnalyticsController, RouteOptimizationController, MaintenanceSchedulingController],
  providers: [
    FleetService,
    FleetGateway,
    FleetAnalyticsService,
    RouteOptimizationService,
    GpsTrackingService,
    GpsTrackingGateway,
    ReportingService,
    MaintenanceSchedulingService,
    ProofOfDeliveryService,
    DriverPerformanceService,
    RouteHistoryService,
    FuelCardService,
    CustomerTrackingService,
    DeliveryInvoiceService,
    SubcontractorManagementService,
    FleetDashboardWidgetsService,
    DriverMobileEnhancedService,
    DispatchAlertsService,
    FleetKpiAnalyticsService,
    ComplianceAuditService,
    RouteSimulationService,
    FleetTenantIsolationService,
    FleetFinanceIntegrationService,
    AutomatedInvoicingService,
    GpsTrackingEnhancedService,
    DriverNotificationsService,
    FleetReportsExportService,
    PredictiveMaintenanceService,
    DashboardAnalyticsWidgetsService,
    TachographService,
  ],
  exports: [
    FleetService,
    FleetGateway,
    FleetAnalyticsService,
    RouteOptimizationService,
    GpsTrackingService,
    GpsTrackingGateway,
    ReportingService,
    MaintenanceSchedulingService,
    ProofOfDeliveryService,
    DriverPerformanceService,
    RouteHistoryService,
    FuelCardService,
    CustomerTrackingService,
    DeliveryInvoiceService,
    SubcontractorManagementService,
    FleetDashboardWidgetsService,
    DriverMobileEnhancedService,
    DispatchAlertsService,
    FleetKpiAnalyticsService,
    ComplianceAuditService,
    RouteSimulationService,
    FleetTenantIsolationService,
    FleetFinanceIntegrationService,
    AutomatedInvoicingService,
    GpsTrackingEnhancedService,
    DriverNotificationsService,
    FleetReportsExportService,
    PredictiveMaintenanceService,
    DashboardAnalyticsWidgetsService,
    TachographService,
  ],
})
export class FleetModule {}
