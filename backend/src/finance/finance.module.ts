import { Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { VatService } from './vat.service';

@Module({
  controllers: [FinanceController],
  providers: [FinanceService, VatService],
  exports: [FinanceService, VatService],
})
export class FinanceModule {}
