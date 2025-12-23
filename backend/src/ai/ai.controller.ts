import { Controller, Post, Get, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('ask')
  @ApiOperation({ summary: 'Ask Grok AI about Romanian accounting/tax' })
  @ApiResponse({ status: 200, description: 'AI response with answer and token count' })
  async ask(@Request() req: any, @Body() body: { question: string }) {
    const userId = req.user?.sub;
    if (!userId) {
      return { answer: 'Autentificare necesara', tokens: 0, error: 'Unauthorized' };
    }
    return this.aiService.ask(userId, body.question);
  }

  @Post('explain-vat')
  @ApiOperation({ summary: 'Get VAT explanation for a scenario' })
  async explainVAT(@Body() body: { scenario: string }) {
    const explanation = await this.aiService.explainVAT(body.scenario);
    return { explanation };
  }

  @Post('check-compliance')
  @ApiOperation({ summary: 'Check data compliance with Romanian regulations' })
  async checkCompliance(@Body() data: any) {
    return this.aiService.checkCompliance(data);
  }

  @Post('generate-report')
  @ApiOperation({ summary: 'Generate AI-powered report' })
  async generateReport(@Body() body: { type: string; data: any }) {
    const report = await this.aiService.generateReport(body.type, body.data);
    return { report };
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get AI usage statistics for current user' })
  @ApiResponse({ status: 200, description: 'Usage stats with queries, tokens, latency' })
  async getUsage(@Request() req: any) {
    const userId = req.user?.sub;
    if (!userId) {
      return { queries: 0, tokens: 0, avgLatency: 0, lastUsed: null };
    }
    return this.aiService.getUsageStats(userId);
  }
}
