import { Module } from '@nestjs/common';
import { GdprController } from './gdpr.controller';
import { GdprService } from './gdpr.service';
import { RetentionService } from './retention.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GdprController],
  providers: [GdprService, RetentionService],
  exports: [GdprService, RetentionService],
})
export class GdprModule {}
