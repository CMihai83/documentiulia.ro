/**
 * Internationalization (i18n) Module
 * Sprint 42: Multi-Language Support
 */

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { I18nService } from './i18n.service';
import { I18nController } from './i18n.controller';

@Module({
  imports: [EventEmitterModule],
  controllers: [I18nController],
  providers: [I18nService],
  exports: [I18nService],
})
export class I18nModule {}
