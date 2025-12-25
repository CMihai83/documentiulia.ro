import { Module } from '@nestjs/common';
import { SagaService } from './saga.service';
import { SagaXmlService } from './saga-xml.service';
import { SagaController } from './saga.controller';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * SAGA Integration Module
 *
 * Provides bidirectional sync with SAGA v3.2 accounting software:
 * - SagaService: Basic SAGA REST API integration
 * - SagaXmlService: Full REST XML integration per SAGA v3.2 spec (SAGA-005)
 */
@Module({
  imports: [PrismaModule],
  controllers: [SagaController],
  providers: [SagaService, SagaXmlService],
  exports: [SagaService, SagaXmlService],
})
export class SagaModule {}
