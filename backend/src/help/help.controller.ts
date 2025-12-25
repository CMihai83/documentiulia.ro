import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { HelpService } from './help.service';
import { HelpSearchService } from './help-search.service';

@ApiTags('help')
@Controller('help')
export class HelpController {
  constructor(
    private readonly helpService: HelpService,
    private readonly searchService: HelpSearchService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get help center statistics' })
  @ApiResponse({ status: 200, description: 'Help center statistics' })
  getStats() {
    return this.helpService.getHelpCenterStats();
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all help categories' })
  @ApiResponse({ status: 200, description: 'List of help categories' })
  getCategories() {
    return this.helpService.getAllCategories();
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category details' })
  getCategoryById(@Param('id') id: string) {
    return this.helpService.getCategoryById(id);
  }

  @Get('categories/:id/articles')
  @ApiOperation({ summary: 'Get articles by category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'List of articles in category' })
  getArticlesByCategory(@Param('id') id: string) {
    return this.helpService.getArticlesByCategory(id);
  }

  @Get('articles/popular')
  @ApiOperation({ summary: 'Get popular articles' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of articles to return' })
  @ApiResponse({ status: 200, description: 'List of popular articles' })
  getPopularArticles(@Query('limit') limit?: number) {
    return this.helpService.getPopularArticles(limit || 5);
  }

  @Get('articles/search')
  @ApiOperation({ summary: 'Search help articles (basic)' })
  @ApiQuery({ name: 'q', description: 'Search query' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale (en or ro)' })
  @ApiResponse({ status: 200, description: 'Search results' })
  searchArticles(@Query('q') query: string, @Query('locale') locale?: string) {
    return this.helpService.searchArticles(query, locale || 'en');
  }

  @Get('search')
  @ApiOperation({ summary: 'Unified search across all help content' })
  @ApiQuery({ name: 'q', description: 'Search query' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale (en or ro)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results to return' })
  @ApiQuery({ name: 'types', required: false, description: 'Content types to search (article,faq,glossary,tutorial)' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiResponse({ status: 200, description: 'Unified search results with scoring' })
  async unifiedSearch(
    @Query('q') query: string,
    @Query('locale') locale?: string,
    @Query('limit') limit?: number,
    @Query('types') types?: string,
    @Query('category') category?: string,
  ) {
    const typeArray = types
      ? (types.split(',') as ('article' | 'faq' | 'glossary' | 'tutorial')[])
      : undefined;
    return this.searchService.search(query, locale || 'en', {
      limit: limit ? parseInt(String(limit), 10) : undefined,
      types: typeArray,
      category,
    });
  }

  @Get('search/autocomplete')
  @ApiOperation({ summary: 'Get autocomplete suggestions' })
  @ApiQuery({ name: 'prefix', description: 'Search prefix' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale (en or ro)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max suggestions' })
  @ApiResponse({ status: 200, description: 'Autocomplete suggestions' })
  getAutocompleteSuggestions(
    @Query('prefix') prefix: string,
    @Query('locale') locale?: string,
    @Query('limit') limit?: number,
  ) {
    return this.searchService.getAutocompleteSuggestions(
      prefix,
      locale || 'en',
      limit ? parseInt(String(limit), 10) : 8,
    );
  }

  @Get('search/popular')
  @ApiOperation({ summary: 'Get popular searches' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results' })
  @ApiResponse({ status: 200, description: 'Popular search queries' })
  getPopularSearches(@Query('limit') limit?: number) {
    return this.searchService.getPopularSearches(limit ? parseInt(String(limit), 10) : 10);
  }

  @Get('search/analytics')
  @ApiOperation({ summary: 'Get search analytics' })
  @ApiResponse({ status: 200, description: 'Search analytics data' })
  getSearchAnalytics() {
    return this.searchService.getSearchAnalytics();
  }

  @Post('search/click')
  @ApiOperation({ summary: 'Record a click on search result' })
  @ApiResponse({ status: 200, description: 'Click recorded' })
  recordSearchClick(
    @Body() body: { query: string; resultId: string; userId?: string },
  ) {
    this.searchService.recordSearchClick(body.query, body.resultId, body.userId);
    return { success: true };
  }

  @Get('articles/:slug')
  @ApiOperation({ summary: 'Get article by slug' })
  @ApiParam({ name: 'slug', description: 'Article slug' })
  @ApiResponse({ status: 200, description: 'Article details' })
  getArticleBySlug(@Param('slug') slug: string) {
    const article = this.helpService.getArticleBySlug(slug);
    if (article) {
      this.helpService.recordArticleView(article.id);
    }
    return article;
  }

  @Post('articles/:id/feedback')
  @ApiOperation({ summary: 'Submit article feedback' })
  @ApiParam({ name: 'id', description: 'Article ID' })
  @ApiResponse({ status: 200, description: 'Updated feedback counts' })
  submitArticleFeedback(
    @Param('id') id: string,
    @Body() body: { helpful: boolean },
  ) {
    return this.helpService.submitArticleFeedback(id, body.helpful);
  }

  @Get('faqs')
  @ApiOperation({ summary: 'Get all FAQs' })
  @ApiResponse({ status: 200, description: 'List of FAQs' })
  getAllFaqs() {
    return this.helpService.getAllFaqs();
  }

  @Get('faqs/category/:categoryId')
  @ApiOperation({ summary: 'Get FAQs by category' })
  @ApiParam({ name: 'categoryId', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'List of FAQs in category' })
  getFaqsByCategory(@Param('categoryId') categoryId: string) {
    return this.helpService.getFaqsByCategory(categoryId);
  }

  @Get('tutorials')
  @ApiOperation({ summary: 'Get all tutorials' })
  @ApiResponse({ status: 200, description: 'List of tutorials' })
  getAllTutorials() {
    return this.helpService.getAllTutorials();
  }

  @Get('tutorials/:id')
  @ApiOperation({ summary: 'Get tutorial by ID' })
  @ApiParam({ name: 'id', description: 'Tutorial ID' })
  @ApiResponse({ status: 200, description: 'Tutorial details with steps' })
  getTutorialById(@Param('id') id: string) {
    return this.helpService.getTutorialById(id);
  }

  @Get('tutorials/module/:module')
  @ApiOperation({ summary: 'Get tutorials by module' })
  @ApiParam({ name: 'module', description: 'Module name' })
  @ApiResponse({ status: 200, description: 'List of tutorials for module' })
  getTutorialsByModule(@Param('module') module: string) {
    return this.helpService.getTutorialsByModule(module);
  }

  @Get('tutorials/difficulty/:difficulty')
  @ApiOperation({ summary: 'Get tutorials by difficulty' })
  @ApiParam({ name: 'difficulty', enum: ['beginner', 'intermediate', 'advanced'] })
  @ApiResponse({ status: 200, description: 'List of tutorials by difficulty' })
  getTutorialsByDifficulty(
    @Param('difficulty') difficulty: 'beginner' | 'intermediate' | 'advanced',
  ) {
    return this.helpService.getTutorialsByDifficulty(difficulty);
  }

  @Get('glossary')
  @ApiOperation({ summary: 'Get all glossary terms' })
  @ApiResponse({ status: 200, description: 'List of glossary terms' })
  getAllGlossaryTerms() {
    return this.helpService.getAllGlossaryTerms();
  }

  @Get('glossary/search')
  @ApiOperation({ summary: 'Search glossary terms' })
  @ApiQuery({ name: 'q', description: 'Search query' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale (en or ro)' })
  @ApiResponse({ status: 200, description: 'Matching glossary terms' })
  searchGlossary(@Query('q') query: string, @Query('locale') locale?: string) {
    return this.helpService.searchGlossary(query, locale || 'en');
  }

  @Post('tickets')
  @ApiOperation({ summary: 'Create support ticket' })
  @ApiResponse({ status: 201, description: 'Created support ticket' })
  createSupportTicket(
    @Body() body: {
      userId: string;
      subject: string;
      description: string;
      category: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
    },
  ) {
    return this.helpService.createSupportTicket(
      body.userId,
      body.subject,
      body.description,
      body.category,
      body.priority,
    );
  }

  @Get('tickets/user/:userId')
  @ApiOperation({ summary: 'Get user support tickets' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'List of user tickets' })
  getUserTickets(@Param('userId') userId: string) {
    return this.helpService.getUserTickets(userId);
  }

  @Get('tickets/:ticketId')
  @ApiOperation({ summary: 'Get ticket by ID' })
  @ApiParam({ name: 'ticketId', description: 'Ticket ID' })
  @ApiResponse({ status: 200, description: 'Ticket details with responses' })
  getTicketById(@Param('ticketId') ticketId: string) {
    return this.helpService.getTicketById(ticketId);
  }

  @Post('tickets/:ticketId/respond')
  @ApiOperation({ summary: 'Add response to ticket' })
  @ApiParam({ name: 'ticketId', description: 'Ticket ID' })
  @ApiResponse({ status: 200, description: 'Updated ticket with new response' })
  addTicketResponse(
    @Param('ticketId') ticketId: string,
    @Body() body: {
      content: string;
      authorType: 'customer' | 'support' | 'ai';
      authorName: string;
    },
  ) {
    return this.helpService.addTicketResponse(
      ticketId,
      body.content,
      body.authorType,
      body.authorName,
    );
  }

  @Post('tickets/:ticketId/status')
  @ApiOperation({ summary: 'Update ticket status' })
  @ApiParam({ name: 'ticketId', description: 'Ticket ID' })
  @ApiResponse({ status: 200, description: 'Updated ticket' })
  updateTicketStatus(
    @Param('ticketId') ticketId: string,
    @Body() body: {
      status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
    },
  ) {
    return this.helpService.updateTicketStatus(ticketId, body.status);
  }
}
