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
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import {
  AiChatAssistantService,
  ConversationContext,
  BusinessContext,
} from './ai-chat-assistant.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('AI Chat Assistant')
@Controller('ai/chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiChatAssistantController {
  constructor(private readonly chatService: AiChatAssistantService) {}

  // =================== CONVERSATIONS ===================

  @Post('conversations')
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        tenantId: { type: 'string' },
        language: { type: 'string', enum: ['ro', 'en', 'de'] },
        initialContext: { type: 'object' },
      },
      required: ['userId', 'tenantId'],
    },
  })
  @ApiResponse({ status: 201, description: 'Conversation created' })
  async createConversation(
    @Body('userId') userId: string,
    @Body('tenantId') tenantId: string,
    @Body('language') language?: 'ro' | 'en' | 'de',
    @Body('initialContext') initialContext?: Partial<ConversationContext>,
  ) {
    return this.chatService.createConversation(
      userId,
      tenantId,
      language || 'ro',
      initialContext,
    );
  }

  @Get('conversations/:conversationId')
  @ApiOperation({ summary: 'Get conversation by ID' })
  @ApiResponse({ status: 200, description: 'Conversation details' })
  async getConversation(@Param('conversationId') conversationId: string) {
    const conversation = await this.chatService.getConversation(conversationId);
    if (!conversation) {
      return { error: 'Conversation not found' };
    }
    return conversation;
  }

  @Get('conversations/user/:userId')
  @ApiOperation({ summary: 'Get user conversations' })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'User conversations list' })
  async getUserConversations(
    @Param('userId') userId: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return {
      conversations: await this.chatService.getUserConversations(
        userId,
        includeArchived === 'true',
      ),
    };
  }

  @Put('conversations/:conversationId/archive')
  @ApiOperation({ summary: 'Archive a conversation' })
  @ApiResponse({ status: 200, description: 'Conversation archived' })
  async archiveConversation(@Param('conversationId') conversationId: string) {
    const success = await this.chatService.archiveConversation(conversationId);
    return { success, conversationId };
  }

  @Delete('conversations/:conversationId')
  @ApiOperation({ summary: 'Delete a conversation' })
  @ApiResponse({ status: 200, description: 'Conversation deleted' })
  async deleteConversation(@Param('conversationId') conversationId: string) {
    const success = await this.chatService.deleteConversation(conversationId);
    return { success, conversationId };
  }

  // =================== MESSAGES ===================

  @Post('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Send a message in conversation' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        additionalContext: { type: 'object' },
      },
      required: ['message'],
    },
  })
  @ApiResponse({ status: 201, description: 'Message sent and response received' })
  async sendMessage(
    @Param('conversationId') conversationId: string,
    @Body('message') message: string,
    @Body('additionalContext') additionalContext?: Record<string, any>,
  ) {
    try {
      return await this.chatService.sendMessage(
        conversationId,
        message,
        additionalContext,
      );
    } catch (error) {
      return { error: error.message };
    }
  }

  @Post('conversations/:conversationId/regenerate')
  @ApiOperation({ summary: 'Regenerate the last AI response' })
  @ApiResponse({ status: 200, description: 'Response regenerated' })
  async regenerateLastResponse(@Param('conversationId') conversationId: string) {
    const response = await this.chatService.regenerateLastResponse(conversationId);
    if (!response) {
      return { error: 'Unable to regenerate response' };
    }
    return response;
  }

  // =================== CONTEXT ===================

  @Put('conversations/:conversationId/context')
  @ApiOperation({ summary: 'Update conversation context' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        language: { type: 'string', enum: ['ro', 'en', 'de'] },
        businessType: { type: 'string' },
        userPreferences: { type: 'object' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Context updated' })
  async updateContext(
    @Param('conversationId') conversationId: string,
    @Body() contextUpdate: Partial<ConversationContext>,
  ) {
    const context = await this.chatService.updateConversationContext(
      conversationId,
      contextUpdate,
    );
    if (!context) {
      return { error: 'Conversation not found' };
    }
    return { success: true, context };
  }

  @Put('conversations/:conversationId/business-context')
  @ApiOperation({ summary: 'Set business context for conversation' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        companyName: { type: 'string' },
        vatNumber: { type: 'string' },
        fiscalYear: { type: 'string' },
        recentInvoices: { type: 'number' },
        recentRevenue: { type: 'number' },
        pendingDeclarations: { type: 'array', items: { type: 'string' } },
        upcomingDeadlines: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              date: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Business context set' })
  async setBusinessContext(
    @Param('conversationId') conversationId: string,
    @Body() businessData: BusinessContext,
  ) {
    const success = await this.chatService.setBusinessContext(
      conversationId,
      businessData,
    );
    return { success };
  }

  // =================== QUICK ACTIONS ===================

  @Post('conversations/:conversationId/actions/:actionId')
  @ApiOperation({ summary: 'Execute a quick action' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        params: { type: 'object' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Action executed' })
  async executeQuickAction(
    @Param('conversationId') conversationId: string,
    @Param('actionId') actionId: string,
    @Body('params') params?: Record<string, any>,
  ) {
    return this.chatService.executeQuickAction(conversationId, actionId, params);
  }

  // =================== INTENT CLASSIFICATION ===================

  @Post('classify-intent')
  @ApiOperation({ summary: 'Classify intent of a message' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        language: { type: 'string', enum: ['ro', 'en', 'de'] },
      },
      required: ['message'],
    },
  })
  @ApiResponse({ status: 200, description: 'Intent classification result' })
  async classifyIntent(
    @Body('message') message: string,
    @Body('language') language?: 'ro' | 'en' | 'de',
  ) {
    const intent = this.chatService.classifyIntent(message, language || 'ro');
    return { intent };
  }

  // =================== ANALYTICS ===================

  @Get('analytics/:tenantId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get chat analytics for tenant' })
  @ApiResponse({ status: 200, description: 'Chat analytics' })
  async getChatAnalytics(@Param('tenantId') tenantId: string) {
    return this.chatService.getChatAnalytics(tenantId);
  }

  // =================== EXPORT ===================

  @Get('conversations/:conversationId/export')
  @ApiOperation({ summary: 'Export conversation as markdown' })
  @ApiResponse({ status: 200, description: 'Conversation markdown export' })
  async exportConversation(@Param('conversationId') conversationId: string) {
    const markdown = await this.chatService.exportConversation(conversationId);
    if (!markdown) {
      return { error: 'Conversation not found' };
    }
    return { markdown };
  }
}
