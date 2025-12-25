import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  MarketingAutomationService,
  AutomationTrigger,
  AutomationAction,
  AutomationCondition,
  SegmentRule,
  MarketingAutomation,
} from './marketing-automation.service';

@ApiTags('Marketing - Automation')
@Controller('marketing/automation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MarketingAutomationController {
  constructor(private readonly automationService: MarketingAutomationService) {}

  // =================== AUTOMATIONS ===================

  @Post()
  @ApiOperation({ summary: 'Create automation' })
  @ApiResponse({ status: 201, description: 'Automation created' })
  async createAutomation(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      trigger: AutomationTrigger;
      actions: AutomationAction[];
      conditions?: AutomationCondition[];
      schedule?: MarketingAutomation['schedule'];
    },
  ) {
    return this.automationService.createAutomation({
      tenantId: req.user.tenantId,
      ...body,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get automations' })
  @ApiResponse({ status: 200, description: 'Automations' })
  async getAutomations(@Request() req: any) {
    const automations = await this.automationService.getAutomations(req.user.tenantId);
    return { automations, total: automations.length };
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get automation templates' })
  @ApiResponse({ status: 200, description: 'Automation templates' })
  async getTemplates() {
    const templates = await this.automationService.getAutomationTemplates();
    return { templates };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get automation details' })
  @ApiResponse({ status: 200, description: 'Automation details' })
  async getAutomation(@Param('id') id: string) {
    const automation = await this.automationService.getAutomation(id);
    if (!automation) {
      return { error: 'Automation not found' };
    }
    return automation;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update automation' })
  @ApiResponse({ status: 200, description: 'Automation updated' })
  async updateAutomation(
    @Param('id') id: string,
    @Body() body: Partial<Pick<MarketingAutomation, 'name' | 'description' | 'trigger' | 'actions' | 'conditions' | 'schedule'>>,
  ) {
    const automation = await this.automationService.updateAutomation(id, body);
    if (!automation) {
      return { error: 'Automation not found' };
    }
    return automation;
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate automation' })
  @ApiResponse({ status: 200, description: 'Automation activated' })
  async activateAutomation(@Param('id') id: string) {
    return this.automationService.activateAutomation(id);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause automation' })
  @ApiResponse({ status: 200, description: 'Automation paused' })
  async pauseAutomation(@Param('id') id: string) {
    return this.automationService.pauseAutomation(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete automation' })
  @ApiResponse({ status: 200, description: 'Automation deleted' })
  async deleteAutomation(@Param('id') id: string) {
    await this.automationService.deleteAutomation(id);
    return { success: true };
  }

  // =================== ENROLLMENTS ===================

  @Post(':id/enroll')
  @ApiOperation({ summary: 'Enroll contact in automation' })
  @ApiResponse({ status: 201, description: 'Contact enrolled' })
  async enrollContact(
    @Param('id') id: string,
    @Body() body: { contactId: string },
  ) {
    return this.automationService.enrollContact({
      automationId: id,
      contactId: body.contactId,
    });
  }

  @Get(':id/enrollments')
  @ApiOperation({ summary: 'Get automation enrollments' })
  @ApiResponse({ status: 200, description: 'Enrollments' })
  async getEnrollments(@Param('id') id: string) {
    const enrollments = await this.automationService.getEnrollments(id);
    return { enrollments, total: enrollments.length };
  }

  // =================== SEGMENTS ===================

  @Post('segments')
  @ApiOperation({ summary: 'Create segment' })
  @ApiResponse({ status: 201, description: 'Segment created' })
  async createSegment(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      rules: SegmentRule[];
      ruleLogic?: 'and' | 'or';
      isStatic?: boolean;
      staticMembers?: string[];
    },
  ) {
    return this.automationService.createSegment({
      tenantId: req.user.tenantId,
      ...body,
    });
  }

  @Get('segments')
  @ApiOperation({ summary: 'Get segments' })
  @ApiResponse({ status: 200, description: 'Segments' })
  async getSegments(@Request() req: any) {
    const segments = await this.automationService.getSegments(req.user.tenantId);
    return { segments, total: segments.length };
  }

  @Put('segments/:id')
  @ApiOperation({ summary: 'Update segment' })
  @ApiResponse({ status: 200, description: 'Segment updated' })
  async updateSegment(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      description?: string;
      rules?: SegmentRule[];
      ruleLogic?: 'and' | 'or';
    },
  ) {
    const segment = await this.automationService.updateSegment(id, body);
    if (!segment) {
      return { error: 'Segment not found' };
    }
    return segment;
  }

  @Delete('segments/:id')
  @ApiOperation({ summary: 'Delete segment' })
  @ApiResponse({ status: 200, description: 'Segment deleted' })
  async deleteSegment(@Param('id') id: string) {
    await this.automationService.deleteSegment(id);
    return { success: true };
  }

  @Post('segments/:id/refresh')
  @ApiOperation({ summary: 'Refresh segment members' })
  @ApiResponse({ status: 200, description: 'Members refreshed' })
  async refreshSegmentMembers(@Param('id') id: string) {
    return this.automationService.refreshSegmentMembers(id);
  }

  // =================== LEAD SCORING ===================

  @Post('lead-score/calculate')
  @ApiOperation({ summary: 'Calculate lead score' })
  @ApiResponse({ status: 200, description: 'Lead score' })
  async calculateLeadScore(
    @Request() req: any,
    @Body() body: {
      contactId: string;
      behaviors?: Array<{ type: string; field?: string; value?: any }>;
      demographics?: Record<string, any>;
    },
  ) {
    return this.automationService.calculateLeadScore({
      tenantId: req.user.tenantId,
      ...body,
    });
  }

  @Get('lead-score/:contactId')
  @ApiOperation({ summary: 'Get lead score' })
  @ApiResponse({ status: 200, description: 'Lead score' })
  async getLeadScore(@Param('contactId') contactId: string) {
    const score = await this.automationService.getLeadScore(contactId);
    if (!score) {
      return { error: 'Lead score not found' };
    }
    return score;
  }

  @Get('lead-score/rules')
  @ApiOperation({ summary: 'Get scoring rules' })
  @ApiResponse({ status: 200, description: 'Scoring rules' })
  async getScoringRules(@Request() req: any) {
    const rules = await this.automationService.getScoringRules(req.user.tenantId);
    return { rules, total: rules.length };
  }

  @Post('lead-score/rules')
  @ApiOperation({ summary: 'Create scoring rule' })
  @ApiResponse({ status: 201, description: 'Rule created' })
  async createScoringRule(
    @Request() req: any,
    @Body() body: {
      name: string;
      category: 'behavior' | 'demographic' | 'engagement';
      condition: { type: string; field?: string; operator?: string; value?: any };
      points: number;
    },
  ) {
    return this.automationService.createScoringRule({
      tenantId: req.user.tenantId,
      isActive: true,
      ...body,
    });
  }

  // =================== STATS ===================

  @Get('stats')
  @ApiOperation({ summary: 'Get marketing automation stats' })
  @ApiResponse({ status: 200, description: 'Stats' })
  async getStats(@Request() req: any) {
    return this.automationService.getStats(req.user.tenantId);
  }
}
