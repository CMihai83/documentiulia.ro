import { Controller, Get, Param, Query, NotFoundException, BadRequestException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ContentService } from './content.service';

@Controller('forum')
export class ForumController {
  constructor(private readonly contentService: ContentService) {}

  @Get('categories')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getCategories() {
    return this.contentService.getForumCategories();
  }

  @Get('categories/:slug')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getCategory(@Param('slug') slug: string) {
    // Validate slug format (alphanumeric and hyphens only)
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new BadRequestException('Invalid category slug format');
    }

    const category = await this.contentService.getForumCategory(slug);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  @Get('threads')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getThreads(
    @Query('category') category?: string,
    @Query('limit') limit?: string,
  ) {
    // Validate category slug if provided
    if (category && !/^[a-z0-9-]+$/.test(category)) {
      throw new BadRequestException('Invalid category slug format');
    }

    // Validate and sanitize limit
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    return this.contentService.getForumThreads(category, parsedLimit);
  }

  @Get('threads/:slug')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getThread(@Param('slug') slug: string) {
    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new BadRequestException('Invalid thread slug format');
    }

    const thread = await this.contentService.getForumThread(slug);
    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    // Increment views asynchronously (don't block response)
    this.contentService.incrementThreadViews(slug).catch(() => {});

    return thread;
  }
}
