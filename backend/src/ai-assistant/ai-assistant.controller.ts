import {
  Controller,
  Get,
  Post,
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
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { AIAssistantService, InsightCategory } from './ai-assistant.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('AI Assistant')
@Controller('ai-assistant')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AIAssistantController {
  constructor(private readonly aiService: AIAssistantService) {}

  // =================== CONVERSATIONS ===================

  @Post('conversations')
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiResponse({ status: 201, description: 'Conversation created' })
  async createConversation(
    @Request() req: any,
    @Body('title') title?: string,
  ) {
    return this.aiService.createConversation(req.user.userId, title);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List user conversations' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'List of conversations' })
  async listConversations(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
  ) {
    const conversations = await this.aiService.listConversations(req.user.userId, {
      status: status as any,
      limit: limit ? Number(limit) : undefined,
    });
    return { conversations };
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get conversation by ID' })
  @ApiResponse({ status: 200, description: 'Conversation details' })
  async getConversation(@Param('id') id: string) {
    const conversation = await this.aiService.getConversation(id);
    if (!conversation) {
      return { error: 'Conversation not found' };
    }
    return conversation;
  }

  @Post('conversations/:id/archive')
  @ApiOperation({ summary: 'Archive a conversation' })
  @ApiResponse({ status: 200, description: 'Conversation archived' })
  async archiveConversation(@Param('id') id: string) {
    return this.aiService.archiveConversation(id);
  }

  @Delete('conversations/:id')
  @ApiOperation({ summary: 'Delete a conversation' })
  @ApiResponse({ status: 200, description: 'Conversation deleted' })
  async deleteConversation(@Param('id') id: string) {
    await this.aiService.deleteConversation(id);
    return { success: true };
  }

  // =================== CHAT ===================

  @Post('chat')
  @ApiOperation({ summary: 'Send a message and get AI response' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        conversationId: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['conversationId', 'message'],
    },
  })
  @ApiResponse({ status: 200, description: 'Chat response' })
  async chat(
    @Body('conversationId') conversationId: string,
    @Body('message') message: string,
  ) {
    try {
      const result = await this.aiService.chat(conversationId, message);
      return result;
    } catch (error) {
      return { error: error.message };
    }
  }

  @Post('query')
  @ApiOperation({ summary: 'Quick query without conversation context' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
      },
      required: ['query'],
    },
  })
  @ApiResponse({ status: 200, description: 'Query response' })
  async query(
    @Request() req: any,
    @Body('query') query: string,
  ) {
    // Create temporary conversation for single query
    const conversation = await this.aiService.createConversation(
      req.user.userId,
      'Quick Query',
    );
    const result = await this.aiService.chat(conversation.id, query);
    return {
      response: result.assistantMessage.content,
      responseRo: result.assistantMessage.contentRo,
      conversationId: conversation.id,
    };
  }

  // =================== DOCUMENT ANALYSIS ===================

  @Post('analyze-document')
  @ApiOperation({ summary: 'Analyze a document with AI' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fileUrl: { type: 'string' },
        fileName: { type: 'string' },
        mimeType: { type: 'string' },
        type: { type: 'string' },
      },
      required: ['fileUrl', 'fileName', 'mimeType'],
    },
  })
  @ApiResponse({ status: 200, description: 'Document analysis result' })
  async analyzeDocument(
    @Body('fileUrl') fileUrl: string,
    @Body('fileName') fileName: string,
    @Body('mimeType') mimeType: string,
    @Body('type') type?: string,
  ) {
    return this.aiService.analyzeDocument(fileUrl, fileName, mimeType, {
      type: type as any,
    });
  }

  @Get('analysis/:id')
  @ApiOperation({ summary: 'Get document analysis result' })
  @ApiResponse({ status: 200, description: 'Analysis result' })
  async getAnalysis(@Param('id') id: string) {
    const analysis = await this.aiService.getAnalysis(id);
    if (!analysis) {
      return { error: 'Analysis not found' };
    }
    return analysis;
  }

  // =================== TAX CALCULATIONS ===================

  @Post('calculate-vat')
  @ApiOperation({ summary: 'Calculate VAT with AI assistance' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        baseAmount: { type: 'number' },
        rate: { type: 'number' },
        effectiveDate: { type: 'string' },
      },
      required: ['baseAmount'],
    },
  })
  @ApiResponse({ status: 200, description: 'VAT calculation result' })
  async calculateVAT(
    @Body('baseAmount') baseAmount: number,
    @Body('rate') rate?: number,
    @Body('effectiveDate') effectiveDate?: string,
  ) {
    return this.aiService.calculateVAT(baseAmount, rate, {
      effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
    });
  }

  @Get('calculations/:id')
  @ApiOperation({ summary: 'Get tax calculation result' })
  @ApiResponse({ status: 200, description: 'Calculation result' })
  async getCalculation(@Param('id') id: string) {
    const calculation = await this.aiService.getCalculation(id);
    if (!calculation) {
      return { error: 'Calculation not found' };
    }
    return calculation;
  }

  // =================== FINANCIAL INSIGHTS ===================

  @Get('insights')
  @ApiOperation({ summary: 'Get financial insights' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'importance', required: false })
  @ApiResponse({ status: 200, description: 'List of insights' })
  async listInsights(
    @Request() req: any,
    @Query('category') category?: InsightCategory,
    @Query('importance') importance?: string,
  ) {
    const insights = await this.aiService.listInsights(req.user.userId, {
      category,
      importance,
    });
    return { insights };
  }

  @Post('insights/generate')
  @ApiOperation({ summary: 'Generate a new financial insight' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        category: { type: 'string' },
        data: { type: 'object' },
      },
      required: ['category'],
    },
  })
  @ApiResponse({ status: 201, description: 'Insight generated' })
  async generateInsight(
    @Request() req: any,
    @Body('category') category: InsightCategory,
    @Body('data') data?: Record<string, any>,
  ) {
    return this.aiService.generateInsight(req.user.userId, category, data || {});
  }

  // =================== FORECASTING ===================

  @Post('forecast')
  @ApiOperation({ summary: 'Generate financial forecast' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        metric: { type: 'string' },
        currentValue: { type: 'number' },
        historicalData: { type: 'array', items: { type: 'number' } },
        periods: { type: 'number' },
      },
      required: ['metric', 'currentValue', 'historicalData'],
    },
  })
  @ApiResponse({ status: 200, description: 'Forecast result' })
  async generateForecast(
    @Request() req: any,
    @Body('metric') metric: string,
    @Body('currentValue') currentValue: number,
    @Body('historicalData') historicalData: number[],
    @Body('periods') periods?: number,
  ) {
    return this.aiService.generateForecast(
      req.user.userId,
      metric,
      currentValue,
      historicalData,
      { periods },
    );
  }

  @Get('forecast/:id')
  @ApiOperation({ summary: 'Get forecast result' })
  @ApiResponse({ status: 200, description: 'Forecast result' })
  async getForecast(@Param('id') id: string) {
    const forecast = await this.aiService.getForecast(id);
    if (!forecast) {
      return { error: 'Forecast not found' };
    }
    return forecast;
  }

  // =================== CONFIGURATION ===================

  @Get('config')
  @ApiOperation({ summary: 'Get AI assistant configuration' })
  @ApiResponse({ status: 200, description: 'Configuration' })
  async getConfig(@Request() req: any) {
    return this.aiService.getConfig(req.user.userId);
  }

  @Post('config')
  @ApiOperation({ summary: 'Update AI assistant configuration' })
  @ApiResponse({ status: 200, description: 'Configuration updated' })
  async updateConfig(
    @Request() req: any,
    @Body() updates: Record<string, any>,
  ) {
    return this.aiService.updateConfig(req.user.userId, updates);
  }

  // =================== CAPABILITIES ===================

  @Get('capabilities')
  @ApiOperation({ summary: 'Get available AI capabilities' })
  @ApiResponse({ status: 200, description: 'List of capabilities' })
  async getCapabilities() {
    return {
      capabilities: this.aiService.getAllCapabilities(),
      categories: this.aiService.getAllInsightCategories(),
    };
  }

  // =================== HISTORY ===================

  @Get('history')
  @ApiOperation({ summary: 'Get AI assistant chat history' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiResponse({ status: 200, description: 'Chat history' })
  async getHistory(
    @Request() req: any,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const conversations = await this.aiService.listConversations(req.user.userId, {
      limit: limit ? Number(limit) : 20,
    });

    // Get recent messages from all conversations
    const history = [];
    for (const conv of conversations.slice(0, 10)) {
      const fullConv = await this.aiService.getConversation(conv.id);
      if (fullConv?.messages) {
        history.push(...fullConv.messages.map((m: any) => ({
          conversationId: conv.id,
          conversationTitle: conv.title,
          ...m,
        })));
      }
    }

    return {
      history: history.slice(offset || 0, (offset || 0) + (limit || 50)),
      total: history.length,
      limit: limit || 50,
      offset: offset || 0,
    };
  }
}
