import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentGatewayService } from './payment-gateway.service';
import { PaymentGatewayController } from './payment-gateway.controller';
import { PaymentLinksService } from './payment-links.service';
import { PaymentLinksController } from './payment-links.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, EventEmitterModule.forRoot()],
  controllers: [PaymentsController, PaymentGatewayController, PaymentLinksController],
  providers: [PaymentsService, PaymentGatewayService, PaymentLinksService],
  exports: [PaymentsService, PaymentGatewayService, PaymentLinksService],
})
export class PaymentsModule {}
