import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CourierService } from './courier.service';
import { SubcontractorPaymentService } from './subcontractor-payment.service';
import { CourierController } from './courier.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [CourierController],
  providers: [CourierService, SubcontractorPaymentService],
  exports: [CourierService, SubcontractorPaymentService],
})
export class CourierModule {}
