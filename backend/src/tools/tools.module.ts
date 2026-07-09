import { Module } from '@nestjs/common';
import { AnafModule } from '../anaf/anaf.module';
import { VatModule } from '../vat/vat.module';
import { ToolsController } from './tools.controller';
import { ToolsService } from './tools.service';
import { ToolsInvoiceService } from './tools-invoice.service';

/**
 * W-0 free-tools funnel (public, throttled, zero-migration).
 * RedisModule is @Global, so RedisService is injectable without an import.
 */
@Module({
  imports: [AnafModule, VatModule],
  controllers: [ToolsController],
  providers: [ToolsService, ToolsInvoiceService],
})
export class ToolsModule {}
