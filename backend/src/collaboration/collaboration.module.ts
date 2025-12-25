import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CollaborationService } from './collaboration.service';
import { CollaborationController } from './collaboration.controller';

@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [CollaborationController],
  providers: [CollaborationService],
  exports: [CollaborationService],
})
export class CollaborationModule {}
