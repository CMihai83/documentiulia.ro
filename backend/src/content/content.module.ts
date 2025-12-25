import { Module } from '@nestjs/common';
import { ForumController } from './forum.controller';
import { BlogController } from './blog.controller';
import { CoursesController, DemoBusinessesController, ContentStatsController } from './courses.controller';
import { ContentService } from './content.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ForumController, BlogController, CoursesController, DemoBusinessesController, ContentStatsController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
