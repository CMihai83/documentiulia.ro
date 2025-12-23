import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';

@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [EmailController],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
