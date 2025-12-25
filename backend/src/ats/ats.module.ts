import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ATSController } from './ats.controller';
import { ATSService } from './ats.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [ATSController],
  providers: [ATSService],
  exports: [ATSService],
})
export class ATSModule {}
