import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SagaController } from './saga.controller';
import { SagaIntegrationService } from './saga.service';
import { PrismaModule } from '../../../common/prisma/prisma.module';
import { ClerkAuthGuard } from '../../auth/guards/clerk.guard';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [SagaController],
  providers: [SagaIntegrationService, ClerkAuthGuard],
  exports: [SagaIntegrationService],
})
export class SagaModule {}
