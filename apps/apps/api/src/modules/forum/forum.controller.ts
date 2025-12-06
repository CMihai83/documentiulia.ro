import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ForumService } from './forum.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateTopicDto,
  UpdateTopicDto,
  CreateReplyDto,
  UpdateReplyDto,
  TopicFilterDto,
} from './dto/forum.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Forum')
@Controller('forum')
export class ForumController {
  constructor(private readonly forumService: ForumService) {}

  // ==================== CATEGORIES ====================

  @Get('categories')
  @ApiOperation({ summary: 'Get all forum categories' })
  @ApiResponse({ status: 200, description: 'Categories returned' })
  async getCategories() {
    return this.forumService.getCategories();
  }

  @Get('categories/:slug')
  @ApiOperation({ summary: 'Get category by slug' })
  @ApiParam({ name: 'slug', description: 'Category slug' })
  @ApiResponse({ status: 200, description: 'Category returned' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async getCategoryBySlug(@Param('slug') slug: string) {
    return this.forumService.getCategoryBySlug(slug);
  }

  @Post('categories')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new category (admin only)' })
  @ApiResponse({ status: 201, description: 'Category created' })
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.forumService.createCategory(dto);
  }

  @Put('categories/:id')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update category (admin only)' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category updated' })
  async updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.forumService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete category (admin only)' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category deleted' })
  async deleteCategory(@Param('id') id: string) {
    return this.forumService.deleteCategory(id);
  }

  // ==================== TOPICS ====================

  @Get('topics')
  @ApiOperation({ summary: 'Get all topics with filters' })
  @ApiResponse({ status: 200, description: 'Topics returned' })
  async getTopics(@Query() filters: TopicFilterDto) {
    return this.forumService.getTopics(filters);
  }

  @Get('topics/:categorySlug/:topicSlug')
  @ApiOperation({ summary: 'Get topic by slug' })
  @ApiParam({ name: 'categorySlug', description: 'Category slug' })
  @ApiParam({ name: 'topicSlug', description: 'Topic slug' })
  @ApiResponse({ status: 200, description: 'Topic returned' })
  @ApiResponse({ status: 404, description: 'Topic not found' })
  async getTopicBySlug(
    @Param('categorySlug') categorySlug: string,
    @Param('topicSlug') topicSlug: string,
  ) {
    return this.forumService.getTopicBySlug(categorySlug, topicSlug);
  }

  @Post('topics')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new topic' })
  @ApiResponse({ status: 201, description: 'Topic created' })
  async createTopic(@CurrentUser() user: any, @Body() dto: CreateTopicDto) {
    return this.forumService.createTopic(user.id, dto);
  }

  @Put('topics/:id')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update topic' })
  @ApiParam({ name: 'id', description: 'Topic ID' })
  @ApiResponse({ status: 200, description: 'Topic updated' })
  async updateTopic(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateTopicDto,
  ) {
    return this.forumService.updateTopic(id, user.id, dto);
  }

  @Delete('topics/:id')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete topic' })
  @ApiParam({ name: 'id', description: 'Topic ID' })
  @ApiResponse({ status: 200, description: 'Topic deleted' })
  async deleteTopic(@Param('id') id: string, @CurrentUser() user: any) {
    return this.forumService.deleteTopic(id, user.id);
  }

  // ==================== REPLIES ====================

  @Post('topics/:topicId/replies')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a reply to a topic' })
  @ApiParam({ name: 'topicId', description: 'Topic ID' })
  @ApiResponse({ status: 201, description: 'Reply created' })
  async createReply(
    @Param('topicId') topicId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateReplyDto,
  ) {
    return this.forumService.createReply(topicId, user.id, dto);
  }

  @Put('replies/:id')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update reply' })
  @ApiParam({ name: 'id', description: 'Reply ID' })
  @ApiResponse({ status: 200, description: 'Reply updated' })
  async updateReply(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateReplyDto,
  ) {
    return this.forumService.updateReply(id, user.id, dto);
  }

  @Delete('replies/:id')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete reply' })
  @ApiParam({ name: 'id', description: 'Reply ID' })
  @ApiResponse({ status: 200, description: 'Reply deleted' })
  async deleteReply(@Param('id') id: string, @CurrentUser() user: any) {
    return this.forumService.deleteReply(id, user.id);
  }

  @Post('topics/:topicId/replies/:replyId/accept')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark reply as accepted solution' })
  @ApiParam({ name: 'topicId', description: 'Topic ID' })
  @ApiParam({ name: 'replyId', description: 'Reply ID' })
  @ApiResponse({ status: 200, description: 'Reply marked as accepted' })
  async markReplyAsAccepted(
    @Param('topicId') topicId: string,
    @Param('replyId') replyId: string,
    @CurrentUser() user: any,
  ) {
    return this.forumService.markReplyAsAccepted(topicId, replyId, user.id);
  }

  // ==================== STATS ====================

  @Get('stats')
  @ApiOperation({ summary: 'Get forum statistics' })
  @ApiResponse({ status: 200, description: 'Forum stats returned' })
  async getForumStats() {
    return this.forumService.getForumStats();
  }
}
