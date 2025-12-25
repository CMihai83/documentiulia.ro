import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ResellerDashboardService } from './reseller-dashboard.service';
import { ResellerDashboardController } from './reseller-dashboard.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, EventEmitterModule.forRoot()],
  controllers: [ResellerDashboardController],
  providers: [ResellerDashboardService],
  exports: [ResellerDashboardService],
})
export class ResellerModule {}
