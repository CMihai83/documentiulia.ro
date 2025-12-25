import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { AdvancedReportingController } from './advanced-reporting.controller';
import { AdvancedReportingService } from './advanced-reporting.service';
import { ReportGeneratorService } from './report-generator.service';
import { ReportGeneratorController } from './report-generator.controller';
import { CashFlowForecastService } from './cash-flow-forecast.service';
import { CashFlowForecastController } from './cash-flow-forecast.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReportsController, AdvancedReportingController, ReportGeneratorController, CashFlowForecastController],
  providers: [ReportsService, AdvancedReportingService, ReportGeneratorService, CashFlowForecastService],
  exports: [ReportsService, AdvancedReportingService, ReportGeneratorService, CashFlowForecastService],
})
export class ReportsModule {}
