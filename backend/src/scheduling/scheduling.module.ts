import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MeetingsService } from './meetings.service';
import { MeetingsController } from './meetings.controller';

@Module({
  imports: [PrismaModule],
  controllers: [MeetingsController],
  providers: [MeetingsService],
  exports: [MeetingsService],
})
export class SchedulingModule {}
