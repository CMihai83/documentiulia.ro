import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HRFormsController } from './hr-forms.controller';
import { HRFormsService } from './hr-forms.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [HRFormsController],
  providers: [HRFormsService],
  exports: [HRFormsService],
})
export class HRFormsModule {}
