import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ForumController } from './forum.controller';
import { ForumService } from './forum.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ClerkAuthGuard } from '../auth/guards/clerk.guard';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [ForumController],
  providers: [ForumService, ClerkAuthGuard],
  exports: [ForumService],
})
export class ForumModule {}
