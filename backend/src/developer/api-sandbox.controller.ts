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
import { APISandboxService, SandboxSettings, MockInvoice, MockPartner } from './api-sandbox.service';

@ApiTags('Developer - Sandbox')
@Controller('developer/sandbox')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class APISandboxController {
  constructor(private readonly sandboxService: APISandboxService) {}

  // =================== SANDBOX MANAGEMENT ===================

  @Post()
  @ApiOperation({ summary: 'Create sandbox environment' })
  @ApiResponse({ status: 201, description: 'Sandbox created' })
  async createSandbox(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      settings?: Partial<SandboxSettings>;
      expireInDays?: number;
    },
  ) {
    return this.sandboxService.createSandbox({
      tenantId: req.user.tenantId,
      ...body,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List sandbox environments' })
  @ApiResponse({ status: 200, description: 'Sandbox list' })
  async getSandboxes(@Request() req: any) {
    const sandboxes = await this.sandboxService.getSandboxes(req.user.tenantId);
    return { sandboxes, total: sandboxes.length };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sandbox details' })
  @ApiResponse({ status: 200, description: 'Sandbox details' })
  async getSandbox(@Param('id') id: string) {
    const sandbox = await this.sandboxService.getSandbox(id);
    if (!sandbox) {
      return { error: 'Sandbox not found' };
    }
    return sandbox;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update sandbox' })
  @ApiResponse({ status: 200, description: 'Sandbox updated' })
  async updateSandbox(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      description?: string;
      settings?: Partial<SandboxSettings>;
      status?: 'active' | 'paused';
    },
  ) {
    return this.sandboxService.updateSandbox(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete sandbox' })
  @ApiResponse({ status: 200, description: 'Sandbox deleted' })
  async deleteSandbox(@Param('id') id: string) {
    await this.sandboxService.deleteSandbox(id);
    return { success: true };
  }

  @Post(':id/reset')
  @ApiOperation({ summary: 'Reset sandbox to initial state' })
  @ApiResponse({ status: 200, description: 'Sandbox reset' })
  async resetSandbox(@Param('id') id: string) {
    return this.sandboxService.resetSandbox(id);
  }

  @Post(':id/regenerate-key')
  @ApiOperation({ summary: 'Regenerate sandbox API key' })
  @ApiResponse({ status: 200, description: 'API key regenerated' })
  async regenerateApiKey(@Param('id') id: string) {
    return this.sandboxService.regenerateApiKey(id);
  }

  // =================== REQUEST HISTORY ===================

  @Get(':id/requests')
  @ApiOperation({ summary: 'Get sandbox request history' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Request history' })
  async getRequestHistory(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    const requests = await this.sandboxService.getRequestHistory(
      id,
      limit ? parseInt(limit) : 50,
    );
    return { requests, total: requests.length };
  }

  // =================== MOCK DATA ===================

  @Get(':id/data')
  @ApiOperation({ summary: 'Get sandbox mock data' })
  @ApiResponse({ status: 200, description: 'Mock data' })
  async getMockData(@Param('id') id: string) {
    const sandbox = await this.sandboxService.getSandbox(id);
    if (!sandbox) {
      return { error: 'Sandbox not found' };
    }
    return sandbox.mockData;
  }

  @Post(':id/data/invoices')
  @ApiOperation({ summary: 'Add mock invoice' })
  @ApiResponse({ status: 201, description: 'Invoice added' })
  async addMockInvoice(
    @Param('id') id: string,
    @Body() body: Partial<MockInvoice>,
  ) {
    return this.sandboxService.addMockInvoice(id, body);
  }

  @Post(':id/data/partners')
  @ApiOperation({ summary: 'Add mock partner' })
  @ApiResponse({ status: 201, description: 'Partner added' })
  async addMockPartner(
    @Param('id') id: string,
    @Body() body: Partial<MockPartner>,
  ) {
    return this.sandboxService.addMockPartner(id, body);
  }

  // =================== TEST REQUEST ===================

  @Post(':id/request')
  @ApiOperation({ summary: 'Execute test request in sandbox' })
  @ApiResponse({ status: 200, description: 'Request result' })
  async executeRequest(
    @Param('id') id: string,
    @Body() body: {
      method: string;
      endpoint: string;
      headers?: Record<string, string>;
      query?: Record<string, any>;
      body?: any;
    },
  ) {
    return this.sandboxService.handleRequest({
      sandboxId: id,
      method: body.method,
      endpoint: body.endpoint,
      headers: body.headers || {},
      query: body.query,
      body: body.body,
    });
  }

  // =================== STATS ===================

  @Get('stats/overview')
  @ApiOperation({ summary: 'Get sandbox statistics' })
  @ApiResponse({ status: 200, description: 'Sandbox stats' })
  async getStats(@Request() req: any) {
    return this.sandboxService.getStats(req.user.tenantId);
  }
}
