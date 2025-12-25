import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SmartBillService } from './smartbill.service';
import { SmartBillController } from './smartbill.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [SmartBillController],
  providers: [SmartBillService],
  exports: [SmartBillService],
})
export class SmartBillModule {}
