import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';

class AskDto {
  userId: string;
  question: string;
}

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('ask')
  @ApiOperation({ summary: 'Ask Grok AI about Romanian accounting/tax' })
  async ask(@Body() dto: AskDto) {
    return this.aiService.ask(dto.userId, dto.question);
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
  @ApiOperation({ summary: 'Get AI usage statistics' })
  async getUsage(@Query('userId') userId: string) {
    return this.aiService.getUsageStats(userId);
  }
}
