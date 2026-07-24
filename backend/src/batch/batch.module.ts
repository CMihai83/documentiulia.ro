import { Module } from '@nestjs/common';
import { BatchProcessingService } from './batch-processing.service';
import { BatchController } from './batch.controller';

@Module({
  imports: [],
  controllers: [BatchController],
  providers: [BatchProcessingService],
  exports: [BatchProcessingService],
})
export class BatchModule {}
