import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LocalizationService } from './localization.service';
import { LocalizationController } from './localization.controller';

@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [LocalizationController],
  providers: [LocalizationService],
  exports: [LocalizationService],
})
export class LocalizationModule {}
