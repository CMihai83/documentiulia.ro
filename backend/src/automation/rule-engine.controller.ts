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
  RuleEngineService,
  RuleStatus,
  RulePriority,
  RuleConditionGroup,
  RuleAction,
  RuleSchedule,
  RuleLimits,
  RuleSet,
} from './rule-engine.service';

@ApiTags('Automation - Rules')
@Controller('automation/rules')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RuleEngineController {
  constructor(private readonly ruleService: RuleEngineService) {}

  // =================== RULES ===================

  @Post()
  @ApiOperation({ summary: 'Create rule' })
  @ApiResponse({ status: 201, description: 'Rule created' })
  async createRule(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      category?: string;
      tags?: string[];
      priority?: RulePriority;
      conditions: RuleConditionGroup;
      actions: Omit<RuleAction, 'id'>[];
      schedule?: RuleSchedule;
      limits?: RuleLimits;
    },
  ) {
    return this.ruleService.createRule({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get rules' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'tag', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Rules list' })
  async getRules(
    @Request() req: any,
    @Query('status') status?: RuleStatus,
    @Query('category') category?: string,
    @Query('priority') priority?: RulePriority,
    @Query('tag') tag?: string,
    @Query('search') search?: string,
  ) {
    const rules = await this.ruleService.getRules(req.user.tenantId, {
      status,
      category,
      priority,
      tag,
      search,
    });
    return { rules, total: rules.length };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get rule stats' })
  @ApiResponse({ status: 200, description: 'Rule statistics' })
  async getStats(@Request() req: any) {
    return this.ruleService.getStats(req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get rule details' })
  @ApiResponse({ status: 200, description: 'Rule details' })
  async getRule(@Param('id') id: string) {
    const rule = await this.ruleService.getRule(id);
    if (!rule) {
      return { error: 'Rule not found' };
    }
    return rule;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update rule' })
  @ApiResponse({ status: 200, description: 'Rule updated' })
  async updateRule(
    @Param('id') id: string,
    @Body() body: Partial<{
      name: string;
      description: string;
      category: string;
      tags: string[];
      priority: RulePriority;
      conditions: RuleConditionGroup;
      actions: RuleAction[];
      schedule: RuleSchedule;
      limits: RuleLimits;
    }>,
  ) {
    const rule = await this.ruleService.updateRule(id, body);
    if (!rule) {
      return { error: 'Rule not found' };
    }
    return rule;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete rule' })
  @ApiResponse({ status: 200, description: 'Rule deleted' })
  async deleteRule(@Param('id') id: string) {
    await this.ruleService.deleteRule(id);
    return { success: true };
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate rule' })
  @ApiResponse({ status: 200, description: 'Rule activated' })
  async activateRule(@Param('id') id: string) {
    const rule = await this.ruleService.activateRule(id);
    if (!rule) {
      return { error: 'Rule not found' };
    }
    return rule;
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate rule' })
  @ApiResponse({ status: 200, description: 'Rule deactivated' })
  async deactivateRule(@Param('id') id: string) {
    const rule = await this.ruleService.deactivateRule(id);
    if (!rule) {
      return { error: 'Rule not found' };
    }
    return rule;
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate rule' })
  @ApiResponse({ status: 201, description: 'Rule duplicated' })
  async duplicateRule(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { name: string },
  ) {
    const rule = await this.ruleService.duplicateRule(id, body.name, req.user.id);
    if (!rule) {
      return { error: 'Rule not found' };
    }
    return rule;
  }

  // =================== EVALUATION ===================

  @Post(':id/evaluate')
  @ApiOperation({ summary: 'Evaluate rule' })
  @ApiResponse({ status: 200, description: 'Evaluation result' })
  async evaluateRule(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { input: Record<string, any> },
  ) {
    try {
      return await this.ruleService.evaluateRule(id, body.input, {
        tenantId: req.user.tenantId,
        userId: req.user.id,
        timestamp: new Date(),
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test rule' })
  @ApiResponse({ status: 200, description: 'Test result' })
  async testRule(
    @Param('id') id: string,
    @Body() body: { input: Record<string, any> },
  ) {
    try {
      return await this.ruleService.testRule(id, body.input);
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Get(':id/evaluations')
  @ApiOperation({ summary: 'Get rule evaluations' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Evaluations list' })
  async getEvaluations(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    const evaluations = await this.ruleService.getEvaluations(
      id,
      limit ? parseInt(limit) : undefined
    );
    return { evaluations, total: evaluations.length };
  }

  // =================== RULE SETS ===================

  @Post('sets')
  @ApiOperation({ summary: 'Create rule set' })
  @ApiResponse({ status: 201, description: 'Rule set created' })
  async createRuleSet(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      rules: string[];
      executionMode: RuleSet['executionMode'];
      stopOnFirstMatch?: boolean;
    },
  ) {
    return this.ruleService.createRuleSet({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Get('sets')
  @ApiOperation({ summary: 'Get rule sets' })
  @ApiResponse({ status: 200, description: 'Rule sets list' })
  async getRuleSets(@Request() req: any) {
    const ruleSets = await this.ruleService.getRuleSets(req.user.tenantId);
    return { ruleSets, total: ruleSets.length };
  }

  @Get('sets/:id')
  @ApiOperation({ summary: 'Get rule set details' })
  @ApiResponse({ status: 200, description: 'Rule set details' })
  async getRuleSet(@Param('id') id: string) {
    const ruleSet = await this.ruleService.getRuleSet(id);
    if (!ruleSet) {
      return { error: 'Rule set not found' };
    }
    return ruleSet;
  }

  @Put('sets/:id')
  @ApiOperation({ summary: 'Update rule set' })
  @ApiResponse({ status: 200, description: 'Rule set updated' })
  async updateRuleSet(
    @Param('id') id: string,
    @Body() body: Partial<{
      name: string;
      description: string;
      rules: string[];
      executionMode: RuleSet['executionMode'];
      stopOnFirstMatch: boolean;
      isActive: boolean;
    }>,
  ) {
    const ruleSet = await this.ruleService.updateRuleSet(id, body);
    if (!ruleSet) {
      return { error: 'Rule set not found' };
    }
    return ruleSet;
  }

  @Delete('sets/:id')
  @ApiOperation({ summary: 'Delete rule set' })
  @ApiResponse({ status: 200, description: 'Rule set deleted' })
  async deleteRuleSet(@Param('id') id: string) {
    await this.ruleService.deleteRuleSet(id);
    return { success: true };
  }

  @Post('sets/:id/evaluate')
  @ApiOperation({ summary: 'Evaluate rule set' })
  @ApiResponse({ status: 200, description: 'Evaluation results' })
  async evaluateRuleSet(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { input: Record<string, any> },
  ) {
    try {
      const evaluations = await this.ruleService.evaluateRuleSet(id, body.input, {
        tenantId: req.user.tenantId,
        userId: req.user.id,
        timestamp: new Date(),
      });
      return { evaluations, total: evaluations.length };
    } catch (error: any) {
      return { error: error.message };
    }
  }
}
