import { Module } from '@nestjs/common';
import { ControllingService } from './controlling.service';
import { ControllingController } from './controlling.controller';

@Module({
  controllers: [ControllingController],
  providers: [ControllingService],
  exports: [ControllingService],
})
export class ControllingModule {}
