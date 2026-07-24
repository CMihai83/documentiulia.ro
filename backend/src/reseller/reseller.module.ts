import { Module } from '@nestjs/common';
import { ResellerDashboardService } from './reseller-dashboard.service';
import { ResellerDashboardController } from './reseller-dashboard.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ResellerDashboardController],
  providers: [ResellerDashboardService],
  exports: [ResellerDashboardService],
})
export class ResellerModule {}
