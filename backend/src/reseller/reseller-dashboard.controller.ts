import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Ip,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ResellerDashboardService } from './reseller-dashboard.service';

@ApiTags('Reseller Dashboard')
@Controller('reseller')
export class ResellerDashboardController {
  constructor(
    private readonly resellerService: ResellerDashboardService,
  ) {}

  // =================== ACCOUNT ===================

  @Post('register')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register as a reseller' })
  @ApiResponse({ status: 201, description: 'Reseller registered' })
  async register(
    @Request() req: any,
    @Body() body: {
      companyName: string;
      contactName: string;
      contactEmail: string;
      contactPhone?: string;
      address?: string;
      country: string;
      taxId?: string;
    },
  ) {
    return this.resellerService.registerReseller({
      userId: req.user.id,
      ...body,
    });
  }

  @Get('account')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get reseller account' })
  @ApiResponse({ status: 200, description: 'Reseller account' })
  async getAccount(@Request() req: any) {
    const reseller = await this.resellerService.getResellerByUserId(req.user.id);
    if (!reseller) {
      return { registered: false };
    }
    return { registered: true, account: reseller };
  }

  @Put('account')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update reseller account' })
  @ApiResponse({ status: 200, description: 'Account updated' })
  async updateAccount(
    @Request() req: any,
    @Body() body: {
      companyName?: string;
      contactName?: string;
      contactEmail?: string;
      contactPhone?: string;
      address?: string;
    },
  ) {
    const reseller = await this.resellerService.getResellerByUserId(req.user.id);
    if (!reseller) {
      return { error: 'Not registered as reseller' };
    }
    return this.resellerService.updateReseller(reseller.id, body);
  }

  @Post('account/regenerate-api-key')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Regenerate API key' })
  @ApiResponse({ status: 200, description: 'New API key' })
  async regenerateApiKey(@Request() req: any) {
    const reseller = await this.resellerService.getResellerByUserId(req.user.id);
    if (!reseller) {
      return { error: 'Not registered as reseller' };
    }
    const apiKey = await this.resellerService.regenerateApiKey(reseller.id);
    return { apiKey };
  }

  // =================== DASHBOARD ===================

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get dashboard stats' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics' })
  async getDashboard(@Request() req: any) {
    const reseller = await this.resellerService.getResellerByUserId(req.user.id);
    if (!reseller) {
      return { error: 'Not registered as reseller' };
    }
    return this.resellerService.getDashboardStats(reseller.id);
  }

  @Get('dashboard/chart')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get revenue chart data' })
  @ApiQuery({ name: 'period', enum: ['week', 'month', 'quarter', 'year'] })
  @ApiResponse({ status: 200, description: 'Chart data' })
  async getRevenueChart(
    @Request() req: any,
    @Query('period') period: 'week' | 'month' | 'quarter' | 'year' = 'month',
  ) {
    const reseller = await this.resellerService.getResellerByUserId(req.user.id);
    if (!reseller) {
      return { error: 'Not registered as reseller' };
    }
    const data = await this.resellerService.getRevenueChart(reseller.id, period);
    return { data };
  }

  // =================== CLIENTS ===================

  @Get('clients')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get reseller clients' })
  @ApiResponse({ status: 200, description: 'Client list' })
  async getClients(@Request() req: any) {
    const reseller = await this.resellerService.getResellerByUserId(req.user.id);
    if (!reseller) {
      return { error: 'Not registered as reseller' };
    }
    const clients = await this.resellerService.getResellerClients(reseller.id);
    return { clients, total: clients.length };
  }

  @Post('clients')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a client' })
  @ApiResponse({ status: 201, description: 'Client added' })
  async addClient(
    @Request() req: any,
    @Body() body: {
      tenantId: string;
      companyName: string;
      contactEmail: string;
      subscriptionPlan: string;
    },
  ) {
    const reseller = await this.resellerService.getResellerByUserId(req.user.id);
    if (!reseller) {
      return { error: 'Not registered as reseller' };
    }
    return this.resellerService.addClient(reseller.id, body);
  }

  @Get('clients/:clientId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get client details' })
  @ApiResponse({ status: 200, description: 'Client details' })
  async getClientDetails(
    @Request() req: any,
    @Param('clientId') clientId: string,
  ) {
    const reseller = await this.resellerService.getResellerByUserId(req.user.id);
    if (!reseller) {
      return { error: 'Not registered as reseller' };
    }
    return this.resellerService.getClientDetails(reseller.id, clientId);
  }

  // =================== COMMISSIONS ===================

  @Get('commissions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get commissions' })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: 'Commission list' })
  async getCommissions(
    @Request() req: any,
    @Query('status') status?: string,
  ) {
    const reseller = await this.resellerService.getResellerByUserId(req.user.id);
    if (!reseller) {
      return { error: 'Not registered as reseller' };
    }
    const commissions = await this.resellerService.getCommissions(
      reseller.id,
      status ? { status } : undefined,
    );
    return { commissions, total: commissions.length };
  }

  @Get('commissions/summary')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get commission summary' })
  @ApiResponse({ status: 200, description: 'Commission summary' })
  async getCommissionSummary(@Request() req: any) {
    const reseller = await this.resellerService.getResellerByUserId(req.user.id);
    if (!reseller) {
      return { error: 'Not registered as reseller' };
    }
    return this.resellerService.getCommissionSummary(reseller.id);
  }

  // =================== PAYOUTS ===================

  @Get('payouts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payouts' })
  @ApiResponse({ status: 200, description: 'Payout list' })
  async getPayouts(@Request() req: any) {
    const reseller = await this.resellerService.getResellerByUserId(req.user.id);
    if (!reseller) {
      return { error: 'Not registered as reseller' };
    }
    const payouts = await this.resellerService.getPayouts(reseller.id);
    return { payouts, total: payouts.length };
  }

  @Post('payouts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request a payout' })
  @ApiResponse({ status: 201, description: 'Payout requested' })
  async requestPayout(
    @Request() req: any,
    @Body() body: {
      amount: number;
      currency: string;
      paymentMethod: 'bank_transfer' | 'paypal' | 'stripe';
      paymentDetails: Record<string, any>;
    },
  ) {
    const reseller = await this.resellerService.getResellerByUserId(req.user.id);
    if (!reseller) {
      return { error: 'Not registered as reseller' };
    }
    return this.resellerService.requestPayout(reseller.id, body);
  }

  @Get('payouts/:payoutId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payout details' })
  @ApiResponse({ status: 200, description: 'Payout details' })
  async getPayoutDetails(
    @Request() req: any,
    @Param('payoutId') payoutId: string,
  ) {
    const reseller = await this.resellerService.getResellerByUserId(req.user.id);
    if (!reseller) {
      return { error: 'Not registered as reseller' };
    }
    return this.resellerService.getPayoutDetails(reseller.id, payoutId);
  }

  // =================== LEAD FORMS ===================

  @Get('leads/forms')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get lead forms' })
  @ApiResponse({ status: 200, description: 'Lead form list' })
  async getLeadForms(@Request() req: any) {
    const reseller = await this.resellerService.getResellerByUserId(req.user.id);
    if (!reseller) {
      return { error: 'Not registered as reseller' };
    }
    const forms = await this.resellerService.getLeadForms(reseller.id);
    return { forms, total: forms.length };
  }

  @Post('leads/forms')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create lead form' })
  @ApiResponse({ status: 201, description: 'Lead form created' })
  async createLeadForm(
    @Request() req: any,
    @Body() body: {
      name: string;
      fields: Array<{
        id: string;
        type: 'text' | 'email' | 'phone' | 'select' | 'textarea' | 'checkbox';
        label: string;
        placeholder?: string;
        required: boolean;
        options?: string[];
      }>;
      redirectUrl?: string;
      successMessage?: string;
    },
  ) {
    const reseller = await this.resellerService.getResellerByUserId(req.user.id);
    if (!reseller) {
      return { error: 'Not registered as reseller' };
    }
    return this.resellerService.createLeadForm(reseller.id, body);
  }

  // Public endpoint for form submission
  @Post('leads/forms/:formId/submit')
  @ApiOperation({ summary: 'Submit lead form (public)' })
  @ApiResponse({ status: 201, description: 'Lead submitted' })
  async submitLeadForm(
    @Param('formId') formId: string,
    @Body() data: Record<string, any>,
    @Ip() ip: string,
    @Query('source') source: string = 'direct',
  ) {
    const lead = await this.resellerService.submitLead(formId, data, {
      source,
      ipAddress: ip,
    });

    const form = await this.resellerService.getLeadForm(formId);
    return {
      success: true,
      message: form.successMessage,
      redirectUrl: form.redirectUrl,
      leadId: lead.id,
    };
  }

  @Get('leads')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get leads' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'formId', required: false })
  @ApiResponse({ status: 200, description: 'Lead list' })
  async getLeads(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('formId') formId?: string,
  ) {
    const reseller = await this.resellerService.getResellerByUserId(req.user.id);
    if (!reseller) {
      return { error: 'Not registered as reseller' };
    }
    const leads = await this.resellerService.getLeads(reseller.id, {
      status,
      formId,
    });
    return { leads, total: leads.length };
  }

  @Put('leads/:leadId/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update lead status' })
  @ApiResponse({ status: 200, description: 'Lead status updated' })
  async updateLeadStatus(
    @Request() req: any,
    @Param('leadId') leadId: string,
    @Body() body: {
      status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
      notes?: string;
    },
  ) {
    const reseller = await this.resellerService.getResellerByUserId(req.user.id);
    if (!reseller) {
      return { error: 'Not registered as reseller' };
    }
    return this.resellerService.updateLeadStatus(
      reseller.id,
      leadId,
      body.status,
      body.notes,
    );
  }

  // =================== BRANDING ===================

  @Get('branding')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get branding settings' })
  @ApiResponse({ status: 200, description: 'Branding settings' })
  async getBranding(@Request() req: any) {
    const reseller = await this.resellerService.getResellerByUserId(req.user.id);
    if (!reseller) {
      return { error: 'Not registered as reseller' };
    }
    return this.resellerService.getBrandingSettings(reseller.id);
  }

  @Put('branding')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update branding settings' })
  @ApiResponse({ status: 200, description: 'Branding updated' })
  async updateBranding(
    @Request() req: any,
    @Body() body: {
      logoUrl?: string;
      primaryColor?: string;
      secondaryColor?: string;
      supportEmail?: string;
      termsUrl?: string;
      privacyUrl?: string;
    },
  ) {
    const reseller = await this.resellerService.getResellerByUserId(req.user.id);
    if (!reseller) {
      return { error: 'Not registered as reseller' };
    }
    await this.resellerService.updateBrandingSettings(reseller.id, body);
    return { success: true };
  }

  // =================== TIER ===================

  @Get('tier')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check tier upgrade eligibility' })
  @ApiResponse({ status: 200, description: 'Tier info' })
  async checkTierUpgrade(@Request() req: any) {
    const reseller = await this.resellerService.getResellerByUserId(req.user.id);
    if (!reseller) {
      return { error: 'Not registered as reseller' };
    }
    return this.resellerService.checkTierUpgrade(reseller.id);
  }

  @Post('tier/upgrade')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request tier upgrade' })
  @ApiResponse({ status: 200, description: 'Upgrade requested' })
  async requestTierUpgrade(@Request() req: any) {
    const reseller = await this.resellerService.getResellerByUserId(req.user.id);
    if (!reseller) {
      return { error: 'Not registered as reseller' };
    }
    await this.resellerService.requestTierUpgrade(reseller.id);
    return { success: true, message: 'Tier upgrade requested' };
  }

  // =================== REPORTS ===================

  @Get('reports/performance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get performance report' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Performance report' })
  async getPerformanceReport(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const reseller = await this.resellerService.getResellerByUserId(req.user.id);
    if (!reseller) {
      return { error: 'Not registered as reseller' };
    }

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return this.resellerService.getPerformanceReport(reseller.id, start, end);
  }

  @Get('reports/export')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export report' })
  @ApiQuery({ name: 'type', enum: ['clients', 'commissions', 'payouts'] })
  @ApiQuery({ name: 'format', enum: ['csv', 'xlsx', 'pdf'] })
  @ApiResponse({ status: 200, description: 'Export URL' })
  async exportReport(
    @Request() req: any,
    @Query('type') type: 'clients' | 'commissions' | 'payouts',
    @Query('format') format: 'csv' | 'xlsx' | 'pdf' = 'csv',
  ) {
    const reseller = await this.resellerService.getResellerByUserId(req.user.id);
    if (!reseller) {
      return { error: 'Not registered as reseller' };
    }
    return this.resellerService.exportReport(reseller.id, type, format);
  }
}
