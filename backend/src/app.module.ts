import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { validate } from './config/env.validation';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { FinanceModule } from './finance/finance.module';
import { SagaModule } from './saga/saga.module';
import { AnafModule } from './anaf/anaf.module';
import { VatModule } from './vat/vat.module';
import { ServicesModule } from './services/services.module';
import { HrModule } from './hr/hr.module';
import { AiModule } from './ai/ai.module';
import { AIAssistantModule } from './ai-assistant/ai-assistant.module';
import { DocumentsModule } from './documents/documents.module';
import { HealthModule } from './health/health.module';
import { InvoicesModule } from './invoices/invoices.module';
import { AuthModule } from './auth/auth.module';
import { GdprModule } from './gdpr/gdpr.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { LoggingModule } from './logging/logging.module';
import { OcrModule } from './ocr/ocr.module';
import { ProjectModule } from './project/project.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PartnersModule } from './partners/partners.module';
import { PaymentsModule } from './payments/payments.module';
import { ReportsModule } from './reports/reports.module';
import { ExportModule } from './export/export.module';
import { FleetModule } from './fleet/fleet.module';
import { TenantModule } from './tenant/tenant.module';
import { AuditModule } from './audit/audit.module';
import { CourierModule } from './courier/courier.module';
import { CacheModule } from './cache/cache.module';
import { ComplianceModule } from './compliance/compliance.module';
import { SecurityModule } from './security/security.module';
import { CdnModule } from './cdn/cdn.module';
import { EcommerceModule } from './ecommerce/ecommerce.module';
import { PwaModule } from './pwa/pwa.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { WorkflowModule } from './workflow/workflow.module';
import { HRContractsModule } from './hr-contracts/hr-contracts.module';
import { HRFormsModule } from './hr-forms/hr-forms.module';
import { EmployeePortalModule } from './employee-portal/employee-portal.module';
import { PayrollSagaModule } from './payroll-saga/payroll-saga.module';
import { ATSModule } from './ats/ats.module';
import { HSEModule } from './hse/hse.module';
import { FreelancerModule } from './freelancer/freelancer.module';
import { LMSModule } from './lms/lms.module';
import { SimulationModule } from './simulation/simulation.module';
import { LogisticsModule } from './logistics/logistics.module';
import { MicroservicesModule } from './microservices/microservices.module';
import { CloudInfrastructureModule } from './cloud-infrastructure/cloud-infrastructure.module';
import { IntegrationModule } from './integration/integration.module';
import { ApiPlatformModule } from './api-platform/api-platform.module';
import { RealtimeModule } from './realtime/realtime.module';
import { ContentModule } from './content/content.module';
import { WarehouseModule } from './warehouse/warehouse.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { ConsultingModule } from './consulting/consulting.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { HelpModule } from './help/help.module';
import { BackupModule } from './backup/backup.module';
import { ErrorsModule } from './errors/errors.module';
import { BankReconciliationModule } from './bank-reconciliation/bank-reconciliation.module';
import { ClientPortalModule } from './client-portal/client-portal.module';
import { ExpenseManagementModule } from './expense-management/expense-management.module';
import { DatabaseModule } from './database/database.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { CollaborationModule } from './collaboration/collaboration.module';
import { ResellerModule } from './reseller/reseller.module';
import { AdminModule } from './admin/admin.module';
import { DeveloperModule } from './developer/developer.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { MarketingModule } from './marketing/marketing.module';
import { CrmModule } from './crm/crm.module';
import { ProjectManagementModule } from './project-management/project-management.module';
import { BusinessIntelligenceModule } from './business-intelligence/business-intelligence.module';
import { AutomationModule } from './automation/automation.module';
import { DocumentGenerationModule } from './document-generation/document-generation.module';
import { CommunicationModule } from './communication/communication.module';
import { AssetManagementModule } from './asset-management/asset-management.module';
import { BudgetManagementModule } from './budget-management/budget-management.module';
import { VendorManagementModule } from './vendor-management/vendor-management.module';
import { CommonModule } from './common/common.module';
import { I18nModule } from './i18n/i18n.module';
import { PerformanceModule } from './performance/performance.module';
import { AccountingModule } from './accounting/accounting.module';
import { InventoryModule } from './inventory/inventory.module';
import { ContractsModule } from './contracts/contracts.module';
import { QualityModule } from './quality/quality.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { ProcurementModule } from './procurement/procurement.module';
import { PublicContactModule } from './public-contact/public-contact.module';
import { BillingModule } from './billing/billing.module';
import { SettingsModule } from './settings/settings.module';
import { UsersModule } from './users/users.module';
import { ReportingModule } from './reporting/reporting.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { BatchModule } from './batch/batch.module';
import { StorageModule } from './storage/storage.module';
import { SearchModule } from './search/search.module';
import { PdfModule } from './pdf/pdf.module';
import { TemplatesModule } from './templates/templates.module';
import { EmailTemplateModule } from './email-template/email-template.module';
import { EmailModule } from './email/email.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { QueueModule } from './queue/queue.module';
import { LocalizationModule } from './localization/localization.module';
import { RedisModule } from './redis/redis.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';
import { SanitizeMiddleware } from './common/middleware/sanitize.middleware';
import { VatAliasController, SaftAliasController, DashboardAliasController, AiQueryController, AuditLogsController, EfacturaAliasController, SettingsAliasController } from './api-aliases.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate,
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 1000,
    }]),
    // Core Infrastructure
    CommonModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    NotificationsModule,
    CacheModule,
    SecurityModule,
    MonitoringModule,
    ErrorsModule,
    DatabaseModule,
    I18nModule,
    PerformanceModule,
    // Finance & Invoicing
    FinanceModule,
    InvoicesModule,
    PaymentsModule,
    ReportsModule,
    ExportModule,
    BankReconciliationModule,
    AccountingModule,
    BudgetManagementModule,
    ExpenseManagementModule,
    // ANAF Compliance
    AnafModule,
    VatModule,
    ServicesModule,
    ComplianceModule,
    AuditModule,
    GdprModule,
    // Documents & OCR
    DocumentsModule,
    OcrModule,
    DocumentGenerationModule,
    // HR & Payroll
    HrModule,
    HRContractsModule,
    HRFormsModule,
    PayrollSagaModule,
    ATSModule,
    EmployeePortalModule,
    // Operations
    InventoryModule,
    FleetModule,
    WarehouseModule,
    LogisticsModule,
    HSEModule,
    AssetManagementModule,
    // Business
    PartnersModule,
    ContractsModule,
    CrmModule,
    VendorManagementModule,
    ProcurementModule,
    // AI & Analytics
    AiModule,
    AIAssistantModule,
    AnalyticsModule,
    BusinessIntelligenceModule,
    // Dashboard & UI
    DashboardModule,
    ProjectModule,
    ProjectManagementModule,
    // Integrations
    SagaModule,
    IntegrationModule,
    IntegrationsModule,
    EcommerceModule,
    WebhooksModule,
    ApiPlatformModule,
    // Communication
    CommunicationModule,
    CollaborationModule,
    // Content & LMS
    ContentModule,
    LMSModule,
    SimulationModule,
    HelpModule,
    // Other
    TenantModule,
    CourierModule,
    FreelancerModule,
    ClientPortalModule,
    SubscriptionModule,
    ConsultingModule,
    OnboardingModule,
    DeveloperModule,
    AdminModule,
    MarketingModule,
    AutomationModule,
    WorkflowModule,
    BackupModule,
    ResellerModule,
    RealtimeModule,
    PwaModule,
    CdnModule,
    CloudInfrastructureModule,
    MicroservicesModule,
    LoggingModule,
    QualityModule,
    PublicContactModule,
    // Billing & Settings
    BillingModule,
    SettingsModule,
    UsersModule,
    ReportingModule,
    // API Platform & Keys
    ApiKeysModule,
    // Batch Processing & Storage
    BatchModule,
    StorageModule,
    // Search & Templates
    SearchModule,
    TemplatesModule,
    EmailTemplateModule,
    EmailModule,
    // Queue & Scheduling
    QueueModule,
    SchedulerModule,
    // PDF Generation
    PdfModule,
    // Localization
    LocalizationModule,
    // Caching
    RedisModule,
  ],
  controllers: [
    VatAliasController,
    SaftAliasController,
    DashboardAliasController,
    AiQueryController,
    AuditLogsController,
    EfacturaAliasController,
    SettingsAliasController,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CsrfMiddleware, SanitizeMiddleware)
      .forRoutes('*');
  }
}
