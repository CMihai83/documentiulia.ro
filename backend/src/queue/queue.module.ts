import { Module } from '@nestjs/common';
import { QueueManagementService } from './queue-management.service';
import { QueueController } from './queue.controller';

@Module({
  imports: [],
  controllers: [QueueController],
  providers: [QueueManagementService],
  exports: [QueueManagementService],
})
export class QueueModule {}
