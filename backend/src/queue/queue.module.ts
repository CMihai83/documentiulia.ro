import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { QueueManagementService } from './queue-management.service';
import { QueueController } from './queue.controller';

@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [QueueController],
  providers: [QueueManagementService],
  exports: [QueueManagementService],
})
export class QueueModule {}
