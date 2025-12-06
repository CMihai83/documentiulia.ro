import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ClerkAuthGuard } from '../auth/guards/clerk.guard';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [CoursesController],
  providers: [CoursesService, ClerkAuthGuard],
  exports: [CoursesService],
})
export class CoursesModule {}
