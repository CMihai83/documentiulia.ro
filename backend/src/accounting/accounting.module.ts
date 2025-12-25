import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AccountingService } from './accounting.service';
import { AccountingController } from './accounting.controller';
import { PeriodClosingService } from './period-closing.service';
import { PeriodClosingController } from './period-closing.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AccountingController, PeriodClosingController],
  providers: [AccountingService, PeriodClosingService],
  exports: [AccountingService, PeriodClosingService],
})
export class AccountingModule {}
