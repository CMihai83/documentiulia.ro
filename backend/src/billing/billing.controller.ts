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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { BillingService } from './billing.service';

@ApiTags('Billing')
@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // =================== PLANS ===================

  @Get('plans')
  @ApiOperation({ summary: 'List available subscription plans' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of plans' })
  async listPlans(@Query('includeInactive') includeInactive?: string) {
    return this.billingService.listPlans(includeInactive === 'true');
  }

  @Get('plans/:id')
  @ApiOperation({ summary: 'Get plan details' })
  @ApiResponse({ status: 200, description: 'Plan details' })
  async getPlan(@Param('id') id: string) {
    return this.billingService.getPlan(id);
  }

  @Get('plans/popular')
  @ApiOperation({ summary: 'Get most popular plan' })
  @ApiResponse({ status: 200, description: 'Popular plan' })
  async getPopularPlan() {
    return this.billingService.getPopularPlan();
  }

  // =================== SUBSCRIPTIONS ===================

  @Get('subscriptions')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all subscriptions' })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: 'List of subscriptions' })
  async listSubscriptions(@Query('status') status?: string) {
    return this.billingService.listSubscriptions(status as any);
  }

  @Get('subscription')
  @ApiOperation({ summary: 'Get current user subscription' })
  @ApiResponse({ status: 200, description: 'User subscription' })
  async getMySubscription(@Request() req: any) {
    return this.billingService.getCustomerSubscription(req.user.sub);
  }

  @Post('subscription')
  @ApiOperation({ summary: 'Create subscription' })
  @ApiResponse({ status: 201, description: 'Subscription created' })
  async createSubscription(
    @Request() req: any,
    @Body() body: { planId: string; billingCycle?: 'MONTHLY' | 'QUARTERLY' | 'YEARLY'; trialDays?: number },
  ) {
    return this.billingService.createSubscription(
      req.user.sub,
      body.planId,
      body.billingCycle || 'MONTHLY',
      { trialDays: body.trialDays },
    );
  }

  @Post('subscription/cancel')
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled' })
  async cancelSubscription(
    @Request() req: any,
    @Body() body: { immediate?: boolean },
  ) {
    const subscription = await this.billingService.getCustomerSubscription(req.user.sub);
    if (!subscription) {
      return { error: 'No active subscription found' };
    }
    return this.billingService.cancelSubscription(subscription.id, body.immediate);
  }

  @Post('subscription/upgrade')
  @ApiOperation({ summary: 'Upgrade subscription plan' })
  @ApiResponse({ status: 200, description: 'Plan upgraded' })
  async upgradePlan(
    @Request() req: any,
    @Body() body: { newPlanId: string },
  ) {
    const subscription = await this.billingService.getCustomerSubscription(req.user.sub);
    if (!subscription) {
      return { error: 'No active subscription found' };
    }
    return this.billingService.upgradePlan(subscription.id, body.newPlanId);
  }

  // =================== INVOICES ===================

  @Get('invoices')
  @ApiOperation({ summary: 'List user invoices' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of invoices' })
  async listInvoices(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.billingService.listInvoices({
      customerId: req.user.sub,
      status: status as any,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get invoice details' })
  @ApiResponse({ status: 200, description: 'Invoice details' })
  async getInvoice(@Param('id') id: string) {
    return this.billingService.getInvoice(id);
  }

  // =================== PAYMENTS ===================

  @Get('payments/:id')
  @ApiOperation({ summary: 'Get payment details' })
  @ApiResponse({ status: 200, description: 'Payment details' })
  async getPayment(@Param('id') id: string) {
    return this.billingService.getPayment(id);
  }
}
