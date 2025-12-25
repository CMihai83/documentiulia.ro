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
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  LandingPagesService,
  PageContent,
  PageSettings,
  SEOSettings,
  TrackingConfig,
  FormConfig,
  PageSection,
  FormSubmission,
} from './landing-pages.service';

@ApiTags('Marketing - Landing Pages')
@Controller('marketing/landing-pages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LandingPagesController {
  constructor(private readonly pagesService: LandingPagesService) {}

  // =================== PAGES ===================

  @Post()
  @ApiOperation({ summary: 'Create landing page' })
  @ApiResponse({ status: 201, description: 'Page created' })
  async createPage(
    @Request() req: any,
    @Body() body: {
      name: string;
      slug?: string;
      templateId?: string;
      content?: PageContent;
      settings?: Partial<PageSettings>;
      seo?: Partial<SEOSettings>;
    },
  ) {
    return this.pagesService.createPage({
      tenantId: req.user.tenantId,
      ...body,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get landing pages' })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: 'Landing pages' })
  async getPages(
    @Request() req: any,
    @Query('status') status?: string,
  ) {
    const pages = await this.pagesService.getPages(req.user.tenantId, status);
    return { pages, total: pages.length };
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get page templates' })
  @ApiQuery({ name: 'category', required: false })
  @ApiResponse({ status: 200, description: 'Templates' })
  async getTemplates(@Query('category') category?: string) {
    const templates = await this.pagesService.getTemplates(category);
    return { templates };
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get template details' })
  @ApiResponse({ status: 200, description: 'Template details' })
  async getTemplate(@Param('id') id: string) {
    const template = await this.pagesService.getTemplate(id);
    if (!template) {
      return { error: 'Template not found' };
    }
    return template;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get page details' })
  @ApiResponse({ status: 200, description: 'Page details' })
  async getPage(@Param('id') id: string) {
    const page = await this.pagesService.getPage(id);
    if (!page) {
      return { error: 'Page not found' };
    }
    return page;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update page' })
  @ApiResponse({ status: 200, description: 'Page updated' })
  async updatePage(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      slug?: string;
      content?: PageContent;
      settings?: Partial<PageSettings>;
      seo?: Partial<SEOSettings>;
      tracking?: Partial<TrackingConfig>;
      forms?: FormConfig[];
    },
  ) {
    const page = await this.pagesService.updatePage(id, body);
    if (!page) {
      return { error: 'Page not found' };
    }
    return page;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete page' })
  @ApiResponse({ status: 200, description: 'Page deleted' })
  async deletePage(@Param('id') id: string) {
    await this.pagesService.deletePage(id);
    return { success: true };
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish page' })
  @ApiResponse({ status: 200, description: 'Page published' })
  async publishPage(@Param('id') id: string) {
    const page = await this.pagesService.publishPage(id);
    if (!page) {
      return { error: 'Page not found' };
    }
    return page;
  }

  @Post(':id/unpublish')
  @ApiOperation({ summary: 'Unpublish page' })
  @ApiResponse({ status: 200, description: 'Page unpublished' })
  async unpublishPage(@Param('id') id: string) {
    const page = await this.pagesService.unpublishPage(id);
    if (!page) {
      return { error: 'Page not found' };
    }
    return page;
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive page' })
  @ApiResponse({ status: 200, description: 'Page archived' })
  async archivePage(@Param('id') id: string) {
    const page = await this.pagesService.archivePage(id);
    if (!page) {
      return { error: 'Page not found' };
    }
    return page;
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate page' })
  @ApiResponse({ status: 201, description: 'Page duplicated' })
  async duplicatePage(@Param('id') id: string) {
    return this.pagesService.duplicatePage(id);
  }

  @Get(':id/preview-url')
  @ApiOperation({ summary: 'Get preview URL' })
  @ApiResponse({ status: 200, description: 'Preview URL' })
  async getPreviewUrl(@Param('id') id: string) {
    const url = await this.pagesService.getPreviewUrl(id);
    if (!url) {
      return { error: 'Page not found' };
    }
    return { url };
  }

  @Get(':id/html')
  @ApiOperation({ summary: 'Generate HTML export' })
  @ApiResponse({ status: 200, description: 'HTML content' })
  async generateHTML(@Param('id') id: string) {
    const html = await this.pagesService.generateHTML(id);
    if (!html) {
      return { error: 'Page not found' };
    }
    return { html };
  }

  // =================== SECTIONS ===================

  @Post(':id/sections')
  @ApiOperation({ summary: 'Add section to page' })
  @ApiResponse({ status: 201, description: 'Section added' })
  async addSection(
    @Param('id') id: string,
    @Body() body: Omit<PageSection, 'id' | 'order'>,
  ) {
    const section = await this.pagesService.addSection(id, body);
    if (!section) {
      return { error: 'Page not found' };
    }
    return section;
  }

  @Put(':id/sections/:sectionId')
  @ApiOperation({ summary: 'Update section' })
  @ApiResponse({ status: 200, description: 'Section updated' })
  async updateSection(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Body() body: Partial<PageSection>,
  ) {
    const section = await this.pagesService.updateSection(id, sectionId, body);
    if (!section) {
      return { error: 'Section not found' };
    }
    return section;
  }

  @Delete(':id/sections/:sectionId')
  @ApiOperation({ summary: 'Delete section' })
  @ApiResponse({ status: 200, description: 'Section deleted' })
  async deleteSection(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
  ) {
    await this.pagesService.deleteSection(id, sectionId);
    return { success: true };
  }

  @Post(':id/sections/reorder')
  @ApiOperation({ summary: 'Reorder sections' })
  @ApiResponse({ status: 200, description: 'Sections reordered' })
  async reorderSections(
    @Param('id') id: string,
    @Body() body: { sectionIds: string[] },
  ) {
    await this.pagesService.reorderSections(id, body.sectionIds);
    return { success: true };
  }

  // =================== FORMS & SUBMISSIONS ===================

  @Post(':id/forms/:formId/submit')
  @ApiOperation({ summary: 'Submit form' })
  @ApiResponse({ status: 201, description: 'Form submitted' })
  async submitForm(
    @Param('id') pageId: string,
    @Param('formId') formId: string,
    @Body() body: {
      data: Record<string, any>;
      metadata?: FormSubmission['metadata'];
    },
  ) {
    return this.pagesService.submitForm({
      pageId,
      formId,
      data: body.data,
      metadata: body.metadata || {},
    });
  }

  @Get(':id/submissions')
  @ApiOperation({ summary: 'Get form submissions' })
  @ApiQuery({ name: 'formId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Submissions' })
  async getSubmissions(
    @Param('id') pageId: string,
    @Query('formId') formId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const submissions = await this.pagesService.getSubmissions(
      pageId,
      formId,
      status,
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
    );
    return { submissions, total: submissions.length };
  }

  @Get('submissions/:submissionId')
  @ApiOperation({ summary: 'Get submission details' })
  @ApiResponse({ status: 200, description: 'Submission details' })
  async getSubmission(@Param('submissionId') submissionId: string) {
    const submission = await this.pagesService.getSubmission(submissionId);
    if (!submission) {
      return { error: 'Submission not found' };
    }
    return submission;
  }

  @Put('submissions/:submissionId/status')
  @ApiOperation({ summary: 'Update submission status' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateSubmissionStatus(
    @Param('submissionId') submissionId: string,
    @Body() body: { status: FormSubmission['status'] },
  ) {
    const submission = await this.pagesService.updateSubmissionStatus(
      submissionId,
      body.status,
    );
    if (!submission) {
      return { error: 'Submission not found' };
    }
    return submission;
  }

  @Delete('submissions/:submissionId')
  @ApiOperation({ summary: 'Delete submission' })
  @ApiResponse({ status: 200, description: 'Submission deleted' })
  async deleteSubmission(@Param('submissionId') submissionId: string) {
    await this.pagesService.deleteSubmission(submissionId);
    return { success: true };
  }

  // =================== A/B TESTING ===================

  @Post(':id/variants')
  @ApiOperation({ summary: 'Create A/B test variant' })
  @ApiResponse({ status: 201, description: 'Variant created' })
  async createVariant(
    @Param('id') id: string,
    @Body() body: {
      name: string;
      weight: number;
      content: PageContent;
    },
  ) {
    const variant = await this.pagesService.createVariant(id, body);
    if (!variant) {
      return { error: 'Page not found' };
    }
    return variant;
  }

  @Put(':id/variants/:variantId')
  @ApiOperation({ summary: 'Update variant' })
  @ApiResponse({ status: 200, description: 'Variant updated' })
  async updateVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Body() body: {
      name?: string;
      weight?: number;
      content?: PageContent;
    },
  ) {
    const variant = await this.pagesService.updateVariant(id, variantId, body);
    if (!variant) {
      return { error: 'Variant not found' };
    }
    return variant;
  }

  @Delete(':id/variants/:variantId')
  @ApiOperation({ summary: 'Delete variant' })
  @ApiResponse({ status: 200, description: 'Variant deleted' })
  async deleteVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
  ) {
    await this.pagesService.deleteVariant(id, variantId);
    return { success: true };
  }

  @Get(':id/variants/winner')
  @ApiOperation({ summary: 'Get winning variant' })
  @ApiResponse({ status: 200, description: 'Winning variant analysis' })
  async getWinningVariant(@Param('id') id: string) {
    const result = await this.pagesService.getWinningVariant(id);
    if (!result) {
      return { error: 'No variants found or page not found' };
    }
    return result;
  }

  // =================== ANALYTICS ===================

  @Post(':id/view')
  @ApiOperation({ summary: 'Record page view' })
  @ApiResponse({ status: 200, description: 'View recorded' })
  async recordPageView(
    @Param('id') id: string,
    @Body() body: {
      visitorId: string;
      device: 'desktop' | 'mobile' | 'tablet';
      source?: string;
      variantId?: string;
    },
  ) {
    await this.pagesService.recordPageView(id, body);
    return { success: true };
  }

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get page analytics' })
  @ApiQuery({ name: 'period', required: false, enum: ['day', 'week', 'month'] })
  @ApiResponse({ status: 200, description: 'Page analytics' })
  async getPageAnalytics(
    @Param('id') id: string,
    @Query('period') period?: 'day' | 'week' | 'month',
  ) {
    const analytics = await this.pagesService.getPageAnalytics(id, period);
    if (!analytics) {
      return { error: 'Page not found' };
    }
    return analytics;
  }

  // =================== STATS ===================

  @Get('stats/overview')
  @ApiOperation({ summary: 'Get landing pages stats' })
  @ApiResponse({ status: 200, description: 'Stats overview' })
  async getStats(@Request() req: any) {
    return this.pagesService.getStats(req.user.tenantId);
  }
}
