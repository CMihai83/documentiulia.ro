import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { BlogService } from './blog.service';
import {
  CreateBlogCategoryDto,
  UpdateBlogCategoryDto,
  CreateBlogPostDto,
  UpdateBlogPostDto,
  ReviewPostDto,
  PublishPostDto,
  BlogPostFilterDto,
  GenerateBlogPostDto,
  CreateCommentDto,
  UpdateCommentDto,
  ModerateCommentDto,
  CommentFilterDto,
} from './dto/blog.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk.guard';

@ApiTags('Blog')
@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  // ==================== PUBLIC ENDPOINTS ====================

  @Get('posts')
  @ApiOperation({ summary: 'Get published blog posts' })
  @ApiResponse({ status: 200, description: 'Blog posts retrieved' })
  async getPosts(@Query() filters: BlogPostFilterDto) {
    return this.blogService.getPosts(filters);
  }

  @Get('posts/:slug')
  @ApiOperation({ summary: 'Get blog post by slug' })
  @ApiResponse({ status: 200, description: 'Blog post retrieved' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async getPostBySlug(@Param('slug') slug: string) {
    return this.blogService.getPostBySlug(slug);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get blog categories' })
  @ApiResponse({ status: 200, description: 'Categories retrieved' })
  async getCategories() {
    return this.blogService.getCategories();
  }

  @Get('categories/:slug')
  @ApiOperation({ summary: 'Get category by slug' })
  @ApiResponse({ status: 200, description: 'Category retrieved' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async getCategoryBySlug(@Param('slug') slug: string) {
    return this.blogService.getCategoryBySlug(slug);
  }

  @Get('feed/rss')
  @ApiOperation({ summary: 'Get RSS feed' })
  @ApiResponse({ status: 200, description: 'RSS feed generated' })
  async getRssFeed(@Res() res: Response) {
    const items = await this.blogService.getRssFeed();

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>DocumentIulia Blog - Contabilitate și Fiscalitate</title>
    <link>https://documentiulia.ro/blog</link>
    <description>Articole despre contabilitate, fiscalitate și legislație românească</description>
    <language>ro</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="https://documentiulia.ro/blog/feed/rss" rel="self" type="application/rss+xml"/>
    ${items
      .map(
        (item) => `
    <item>
      <title><![CDATA[${item.title}]]></title>
      <link>${item.link}</link>
      <description><![CDATA[${item.description}]]></description>
      <pubDate>${item.pubDate}</pubDate>
      <guid isPermaLink="false">${item.guid}</guid>
      ${item.author ? `<author>${item.author}</author>` : ''}
      ${item.category ? `<category>${item.category}</category>` : ''}
    </item>`,
      )
      .join('\n')}
  </channel>
</rss>`;

    res.set('Content-Type', 'application/rss+xml; charset=utf-8');
    res.send(rss);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get blog statistics' })
  @ApiResponse({ status: 200, description: 'Stats retrieved' })
  async getBlogStats() {
    return this.blogService.getBlogStats();
  }

  // ==================== POST COMMENTS (PUBLIC) ====================

  @Get('posts/:postId/comments')
  @ApiOperation({ summary: 'Get comments for a post' })
  @ApiResponse({ status: 200, description: 'Comments retrieved' })
  async getComments(
    @Param('postId') postId: string,
    @Query() filters: CommentFilterDto,
  ) {
    return this.blogService.getComments(postId, filters);
  }

  @Post('posts/:postId/comments')
  @ApiOperation({ summary: 'Create a comment (guests allowed)' })
  @ApiResponse({ status: 201, description: 'Comment created' })
  async createComment(
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
    @Req() req: any,
  ) {
    const userId = req.auth?.userId || null;
    return this.blogService.createComment(postId, userId, dto);
  }

  // ==================== AUTHENTICATED ENDPOINTS ====================

  @Post('posts')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new blog post' })
  @ApiResponse({ status: 201, description: 'Post created' })
  async createPost(@Req() req: any, @Body() dto: CreateBlogPostDto) {
    return this.blogService.createPost(req.user.clerkId, dto);
  }

  @Put('posts/:id')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a blog post' })
  @ApiResponse({ status: 200, description: 'Post updated' })
  async updatePost(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: UpdateBlogPostDto,
  ) {
    return this.blogService.updatePost(id, req.user.clerkId, dto);
  }

  @Delete('posts/:id')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a blog post' })
  @ApiResponse({ status: 200, description: 'Post deleted' })
  async deletePost(@Param('id') id: string, @Req() req: any) {
    return this.blogService.deletePost(id, req.user.clerkId);
  }

  @Post('posts/:id/submit')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit post for review' })
  @ApiResponse({ status: 200, description: 'Post submitted for review' })
  async submitForReview(@Param('id') id: string, @Req() req: any) {
    return this.blogService.submitForReview(id, req.user.clerkId);
  }

  @Post('posts/:id/publish')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish a post' })
  @ApiResponse({ status: 200, description: 'Post published' })
  async publishPost(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: PublishPostDto,
  ) {
    return this.blogService.publishPost(id, req.user.clerkId, dto);
  }

  @Post('posts/:id/unpublish')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unpublish a post (admin only)' })
  @ApiResponse({ status: 200, description: 'Post unpublished' })
  async unpublishPost(@Param('id') id: string) {
    return this.blogService.unpublishPost(id, true);
  }

  // ==================== AI GENERATION ====================

  @Post('generate')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate blog post with AI' })
  @ApiResponse({ status: 201, description: 'AI-generated post created' })
  async generatePost(@Req() req: any, @Body() dto: GenerateBlogPostDto) {
    return this.blogService.generatePost(req.user.clerkId, dto);
  }

  // ==================== ADMIN ENDPOINTS ====================

  @Get('admin/posts')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all posts (admin view)' })
  @ApiResponse({ status: 200, description: 'Posts retrieved' })
  async getAdminPosts(@Query() filters: BlogPostFilterDto) {
    // Remove default status filter for admin
    return this.blogService.getPosts({ ...filters, status: filters.status });
  }

  @Get('admin/posts/:id')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get post by ID (admin view)' })
  @ApiResponse({ status: 200, description: 'Post retrieved' })
  async getAdminPostById(@Param('id') id: string) {
    return this.blogService.getPostById(id);
  }

  @Get('admin/pending-reviews')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get posts pending review' })
  @ApiResponse({ status: 200, description: 'Pending posts retrieved' })
  async getPendingReviews(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.blogService.getPendingReviews(page, limit);
  }

  @Post('admin/posts/:id/review')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Review a post (approve/reject)' })
  @ApiResponse({ status: 200, description: 'Post reviewed' })
  async reviewPost(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: ReviewPostDto,
  ) {
    return this.blogService.reviewPost(id, req.user.clerkId, dto);
  }

  @Get('admin/pending-comments')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get comments pending moderation' })
  @ApiResponse({ status: 200, description: 'Pending comments retrieved' })
  async getPendingComments(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.blogService.getPendingComments(page, limit);
  }

  @Patch('admin/comments/:id/moderate')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Moderate a comment' })
  @ApiResponse({ status: 200, description: 'Comment moderated' })
  async moderateComment(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: ModerateCommentDto,
  ) {
    return this.blogService.moderateComment(id, req.user.clerkId, dto);
  }

  // ==================== CATEGORY MANAGEMENT (ADMIN) ====================

  @Post('categories')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a category' })
  @ApiResponse({ status: 201, description: 'Category created' })
  async createCategory(@Body() dto: CreateBlogCategoryDto) {
    return this.blogService.createCategory(dto);
  }

  @Put('categories/:id')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a category' })
  @ApiResponse({ status: 200, description: 'Category updated' })
  async updateCategory(@Param('id') id: string, @Body() dto: UpdateBlogCategoryDto) {
    return this.blogService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a category' })
  @ApiResponse({ status: 200, description: 'Category deleted' })
  async deleteCategory(@Param('id') id: string) {
    return this.blogService.deleteCategory(id);
  }

  // ==================== COMMENT MANAGEMENT (AUTHENTICATED) ====================

  @Put('comments/:id')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update own comment' })
  @ApiResponse({ status: 200, description: 'Comment updated' })
  async updateComment(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.blogService.updateComment(id, req.user.clerkId, dto);
  }

  @Delete('comments/:id')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete own comment' })
  @ApiResponse({ status: 200, description: 'Comment deleted' })
  async deleteComment(@Param('id') id: string, @Req() req: any) {
    return this.blogService.deleteComment(id, req.user.clerkId);
  }
}
