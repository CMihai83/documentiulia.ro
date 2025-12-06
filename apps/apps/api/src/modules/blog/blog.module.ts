import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ClerkAuthGuard } from '../auth/guards/clerk.guard';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [BlogController],
  providers: [BlogService, ClerkAuthGuard],
  exports: [BlogService],
})
export class BlogModule {}
