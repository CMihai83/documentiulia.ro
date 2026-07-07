import { Global, Module } from '@nestjs/common';
import { ChartService } from './chart.service';

/**
 * Shared chart rendering (F-5). Global so any deliverable generator
 * (Business-Case Excel/PPTX/PDF, simulator dashboards) can inject ChartService.
 */
@Global()
@Module({
  providers: [ChartService],
  exports: [ChartService],
})
export class ChartsModule {}
