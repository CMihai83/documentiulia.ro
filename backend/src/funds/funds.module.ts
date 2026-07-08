import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { FundsController } from './funds.controller';
import { FundsService } from './funds.service';
import { DeMinimisService } from './deminimis.service';
import { FundsAdvisoryService } from './funds-advisory.service';
import { FundsRefreshService } from './funds-refresh.service';
import { FundsAlertsService } from './funds-alerts.service';
import { NotificationsModule } from '../notifications/notifications.module';

/** FND-1..9 — Funds & Financing Advisory (catalog, 7-filter match, de minimis, pre-check, advisory). */
@Module({
  imports: [PrismaModule, AuditModule, NotificationsModule],
  controllers: [FundsController],
  providers: [FundsService, DeMinimisService, FundsAdvisoryService, FundsRefreshService, FundsAlertsService],
  exports: [FundsService, DeMinimisService, FundsAdvisoryService],
})
export class FundsModule {}
