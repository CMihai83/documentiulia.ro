import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { DashboardBuilderService } from './dashboard-builder.service';
import { DashboardBuilderController } from './dashboard-builder.controller';
import { ReportDesignerService } from './report-designer.service';
import { ReportDesignerController } from './report-designer.controller';
import { KPIMetricsService } from './kpi-metrics.service';
import { KPIMetricsController } from './kpi-metrics.controller';
import { DataVisualizationService } from './data-visualization.service';
import { DataVisualizationController } from './data-visualization.controller';
import { ScheduledReportsService } from './scheduled-reports.service';
import { ScheduledReportsController } from './scheduled-reports.controller';
import { ExecutiveSummaryService } from './executive-summary.service';
import { ExecutiveSummaryController } from './executive-summary.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
  ],
  controllers: [
    DashboardBuilderController,
    ReportDesignerController,
    KPIMetricsController,
    DataVisualizationController,
    ScheduledReportsController,
    ExecutiveSummaryController,
  ],
  providers: [
    DashboardBuilderService,
    ReportDesignerService,
    KPIMetricsService,
    DataVisualizationService,
    ScheduledReportsService,
    ExecutiveSummaryService,
  ],
  exports: [
    DashboardBuilderService,
    ReportDesignerService,
    KPIMetricsService,
    DataVisualizationService,
    ScheduledReportsService,
    ExecutiveSummaryService,
  ],
})
export class BusinessIntelligenceModule {}
