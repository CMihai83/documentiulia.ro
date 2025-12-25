import { Controller, Get, Param, Query } from '@nestjs/common';
import { ContentService } from './content.service';

@Controller('blog')
export class BlogController {
  constructor(private readonly contentService: ContentService) {}

  @Get('categories')
  async getCategories() {
    return this.contentService.getBlogCategories();
  }

  @Get('articles')
  async getArticles(
    @Query('category') category?: string,
    @Query('limit') limit?: string,
  ) {
    return this.contentService.getBlogArticles(
      category,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('article/:slug')
  async getArticle(@Param('slug') slug: string) {
    const article = await this.contentService.getBlogArticle(slug);
    if (article) {
      await this.contentService.incrementArticleViews(slug);
    }
    return article;
  }
}
