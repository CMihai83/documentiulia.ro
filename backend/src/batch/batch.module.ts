import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BatchProcessingService } from './batch-processing.service';
import { BatchController } from './batch.controller';

@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [BatchController],
  providers: [BatchProcessingService],
  exports: [BatchProcessingService],
})
export class BatchModule {}
