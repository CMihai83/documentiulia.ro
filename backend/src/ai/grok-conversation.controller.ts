import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Query,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { GrokConversationService } from './grok-conversation.service';

/**
 * Grok Conversational AI Controller
 * Handles natural language business queries for DocumentIulia.ro
 *
 * Endpoints:
 * - POST /api/ai/grok/query - Process conversational query
 * - GET /api/ai/grok/suggestions - Get query suggestions
 * - GET /api/ai/grok/health - Health check
 */
@ApiTags('AI - Grok Conversation')
@Controller('ai/grok')
export class GrokConversationController {
  private readonly logger = new Logger(GrokConversationController.name);

  constructor(private readonly grokService: GrokConversationService) {}

  /**
   * Process conversational business query
   * POST /api/ai/grok/query
   */
  @Post('query')
  @ApiOperation({
    summary: 'Process natural language business query',
    description: `
Process a natural language question about business data using Grok AI.

Examples:
- Romanian: "Care este marja de profit pentru Q4?"
- English: "What's my Q4 profit margin?"
- Romanian: "Când este următorul termen ANAF?"
- English: "When is the next ANAF deadline?"

The service understands Romanian compliance context (ANAF, e-Factura, SAF-T D406).
    `,
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: {
          type: 'string',
          description: 'Natural language question in Romanian or English',
          example: 'Care este marja de profit pentru Q4?',
        },
        locale: {
          type: 'string',
          enum: ['ro', 'en', 'de', 'fr', 'es'],
          description: 'Response language preference',
          example: 'ro',
        },
        companyContext: {
          type: 'object',
          description: 'Optional company data for context-aware responses',
          example: {
            financials: {
              revenue: 250000,
              expenses: 180000,
              profit: 70000,
              margin: 0.28,
            },
            compliance: {
              nextD406Deadline: '2025-01-25',
              pendingEFacturas: 5,
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Query processed successfully',
    schema: {
      type: 'object',
      properties: {
        response: {
          type: 'string',
          example: 'Marja dvs. de profit pentru Q4 este 28% (70,000 RON profit din 250,000 RON venituri). Aceasta este peste media industriei de 22%.',
        },
        sources: {
          type: 'array',
          items: { type: 'string' },
          example: ['Date financiare Q4 2025', 'Benchmark industrie'],
        },
        confidence: {
          type: 'number',
          example: 0.85,
          description: 'Confidence score (0-1)',
        },
        tokenUsage: {
          type: 'number',
          example: 450,
          description: 'Total tokens used',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid query or missing required fields' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async processQuery(
    @Body()
    body: {
      query: string;
      locale?: string;
      companyContext?: Record<string, any>;
    },
    @Request() req?: any,
  ) {
    try {
      // Validate query
      if (!body.query || body.query.trim().length === 0) {
        throw new HttpException('Query is required', HttpStatus.BAD_REQUEST);
      }

      if (body.query.length > 500) {
        throw new HttpException('Query too long (max 500 characters)', HttpStatus.BAD_REQUEST);
      }

      // Extract user ID (from auth middleware or default)
      const userId = req?.user?.id || 'anonymous';
      const locale = body.locale || 'ro';

      // Check rate limit
      // TODO: Integrate with tenant subscription tier
      const tier = 'pro'; // Default tier
      const allowed = await this.grokService.checkRateLimit(userId, tier);

      if (!allowed) {
        throw new HttpException(
          {
            message: locale === 'ro'
              ? 'Ați depășit limita de interogări zilnice. Upgrade la Business pentru mai multe.'
              : 'Daily query limit exceeded. Upgrade to Business for more.',
            upgradeUrl: '/pricing',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Process query
      const result = await this.grokService.processQuery(
        body.query,
        userId,
        locale,
        body.companyContext,
      );

      this.logger.log(`Query processed for user ${userId}: ${body.query.substring(0, 50)}...`);

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error processing query: ${error.message}`, error.stack);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          message: 'Failed to process query',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get query suggestions based on user context
   * GET /api/ai/grok/suggestions
   */
  @Get('suggestions')
  @ApiOperation({
    summary: 'Get suggested queries for the user',
    description: 'Returns a list of common business queries the user can ask',
  })
  @ApiResponse({
    status: 200,
    description: 'Suggestions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        suggestions: {
          type: 'array',
          items: { type: 'string' },
          example: [
            'Care este marja de profit pentru trimestrul curent?',
            'Când este următorul termen de depunere D406 la ANAF?',
            'Care sunt primele 5 cheltuieli din această lună?',
          ],
        },
      },
    },
  })
  async getSuggestions(
    @Query('locale') locale: string = 'ro',
    @Request() req?: any,
  ) {
    try {
      const userId = req?.user?.id || 'anonymous';

      const suggestions = await this.grokService.generateQuerySuggestions(
        userId,
        locale,
      );

      return {
        success: true,
        data: {
          suggestions,
          locale,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error fetching suggestions: ${error.message}`, error.stack);

      throw new HttpException(
        {
          message: 'Failed to fetch suggestions',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Health check for Grok service
   * GET /api/ai/grok/health
   */
  @Get('health')
  @ApiOperation({
    summary: 'Health check for Grok AI service',
    description: 'Verifies that the Grok API integration is working',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        service: { type: 'string', example: 'grok-conversation' },
        apiConnected: { type: 'boolean', example: true },
        timestamp: { type: 'string', example: '2025-12-27T10:00:00.000Z' },
      },
    },
  })
  async healthCheck() {
    try {
      // Test a simple query to verify API connectivity
      const testResult = await this.grokService.processQuery(
        'Test query',
        'health-check',
        'en',
      );

      const isHealthy = testResult.confidence >= 0;

      return {
        status: isHealthy ? 'healthy' : 'degraded',
        service: 'grok-conversation',
        apiConnected: isHealthy,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);

      return {
        status: 'unhealthy',
        service: 'grok-conversation',
        apiConnected: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
