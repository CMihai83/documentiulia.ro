import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PayrollSagaController } from './payroll-saga.controller';
import { PayrollSagaService } from './payroll-saga.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SagaModule } from '../saga/saga.module';

@Module({
  imports: [PrismaModule, ConfigModule, SagaModule],
  controllers: [PayrollSagaController],
  providers: [PayrollSagaService],
  exports: [PayrollSagaService],
})
export class PayrollSagaModule {}
