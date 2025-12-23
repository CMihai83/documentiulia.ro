import { Controller, Get, Param, Query } from '@nestjs/common';
import { ContentService } from './content.service';

@Controller('courses')
export class CoursesController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  async getCourses(
    @Query('category') category?: string,
    @Query('level') level?: string,
    @Query('limit') limit?: string,
  ) {
    return this.contentService.getCourses(
      category,
      level,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get('categories')
  async getCategories() {
    return this.contentService.getCourseCategories();
  }

  @Get(':slug')
  async getCourse(@Param('slug') slug: string) {
    return this.contentService.getCourse(slug);
  }

  @Get(':slug/lessons/:lessonId')
  async getLesson(
    @Param('slug') slug: string,
    @Param('lessonId') lessonId: string,
  ) {
    const result = await this.contentService.getLesson(slug, lessonId);
    if (!result) {
      return { error: 'Lesson not found', statusCode: 404 };
    }
    return result;
  }
}

@Controller('demo-businesses')
export class DemoBusinessesController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  async getBusinesses() {
    return this.contentService.getDemoBusinesses();
  }

  @Get(':cui')
  async getBusiness(@Param('cui') cui: string) {
    return this.contentService.getDemoBusiness(cui);
  }
}

@Controller('content')
export class ContentStatsController {
  constructor(private readonly contentService: ContentService) {}

  @Get('stats')
  async getStats() {
    return this.contentService.getContentStats();
  }
}
