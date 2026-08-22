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
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  SubscriptionService,
  PricingPlan,
  UsageStats,
  SubscriptionStatus,
  AiAddOnPackage,
  AiUsageStats,
} from './subscription.service';
import { Tier } from '@prisma/client';

class UpgradeDto {
  tier: Tier;
  billingCycle?: 'monthly' | 'yearly';
}

class CheckLimitDto {
  limitType: string;
  currentCount?: number;
}

class ComparePlansDto {
  tier1: Tier;
  tier2: Tier;
}

class AiAddOnDto {
  packageId: string;
  billingCycle?: 'monthly' | 'yearly';
}

class CheckAiFeatureDto {
  featureKey: 'contractAnalysis' | 'forecasting' | 'anomalyDetection' | 'smartCategorization' | 'grokAssistant' | 'documentSummary';
}

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  /**
   * REQ-049 B2: accounts created via /auth/register have no organization yet;
   * every subscription route then called prisma with { id: undefined } and
   * returned a raw 500. Fail with a clear, actionable message instead.
   */
  private requireOrg(req: any): string {
    const organizationId = req.headers?.['x-organization-id'] || req.user?.organizationId;
    if (!organizationId) {
      throw new NotFoundException(
        'Nu există o organizație configurată pentru acest cont. Completați datele firmei în Setări › Organizație.',
      );
    }
    return organizationId;
  }

  /**
   * Get all pricing plans (public endpoint)
   */
  @Get('plans')
  getPricingPlans(): PricingPlan[] {
    return this.subscriptionService.getPricingPlans();
  }

  /**
   * Get a specific pricing plan (public endpoint)
   */
  @Get('plans/:tier')
  getPlan(@Param('tier') tier: Tier): PricingPlan {
    return this.subscriptionService.getPlan(tier);
  }

  /**
   * Compare two plans (public endpoint)
   */
  @Get('plans/compare')
  comparePlans(@Query() dto: ComparePlansDto) {
    return this.subscriptionService.comparePlans(dto.tier1, dto.tier2);
  }

  /**
   * Get current subscription status
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getSubscriptionStatus(@Request() req: any): Promise<SubscriptionStatus> {
    const organizationId = this.requireOrg(req);
    return this.subscriptionService.getSubscriptionStatus(organizationId);
  }

  /**
   * Get usage statistics
   */
  @Get('usage')
  @UseGuards(JwtAuthGuard)
  async getUsageStats(@Request() req: any): Promise<UsageStats> {
    const organizationId = this.requireOrg(req);
    return this.subscriptionService.getUsageStats(organizationId);
  }

  /**
   * Check if a specific limit is available
   */
  @Post('check-limit')
  @UseGuards(JwtAuthGuard)
  async checkLimit(@Request() req: any, @Body() dto: CheckLimitDto) {
    const organizationId = this.requireOrg(req);
    return this.subscriptionService.checkLimit(
      organizationId,
      dto.limitType as any,
      dto.currentCount,
    );
  }

  /**
   * Check if a feature is available
   */
  @Get('features/:featureKey')
  @UseGuards(JwtAuthGuard)
  async hasFeature(
    @Request() req: any,
    @Param('featureKey') featureKey: string,
  ): Promise<{ hasFeature: boolean; featureKey: string }> {
    const organizationId = this.requireOrg(req);
    const hasFeature = await this.subscriptionService.hasFeature(organizationId, featureKey);
    return { hasFeature, featureKey };
  }

  /**
   * Upgrade subscription tier
   */
  @Post('upgrade')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async upgradeTier(@Request() req: any, @Body() dto: UpgradeDto) {
    const organizationId = this.requireOrg(req);
    return this.subscriptionService.upgradeTier(
      organizationId,
      dto.tier,
      dto.billingCycle,
    );
  }

  /**
   * Downgrade subscription tier
   */
  @Post('downgrade')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async downgradeTier(@Request() req: any, @Body() dto: UpgradeDto) {
    const organizationId = this.requireOrg(req);
    return this.subscriptionService.downgradeTier(organizationId, dto.tier);
  }

  /**
   * Get organization-specific subscription details
   */
  @Get('organization/:organizationId')
  @UseGuards(JwtAuthGuard)
  async getOrganizationSubscription(
    @Param('organizationId') organizationId: string,
  ): Promise<SubscriptionStatus> {
    return this.subscriptionService.getSubscriptionStatus(organizationId);
  }

  /**
   * Get organization usage stats
   */
  @Get('organization/:organizationId/usage')
  @UseGuards(JwtAuthGuard)
  async getOrganizationUsage(
    @Param('organizationId') organizationId: string,
  ): Promise<UsageStats> {
    return this.subscriptionService.getUsageStats(organizationId);
  }

  // =================== PREMIUM AI SUBSCRIPTION ENDPOINTS ===================

  /**
   * Get all AI add-on packages (public endpoint)
   */
  @Get('ai-packages')
  getAiAddOnPackages(): AiAddOnPackage[] {
    return this.subscriptionService.getAiAddOnPackages();
  }

  /**
   * Get a specific AI add-on package (public endpoint)
   */
  @Get('ai-packages/:packageId')
  getAiAddOnPackage(@Param('packageId') packageId: string): AiAddOnPackage {
    return this.subscriptionService.getAiAddOnPackage(packageId);
  }

  /**
   * Subscribe to AI add-on package
   */
  @Post('ai-addon/subscribe')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async subscribeToAiAddOn(@Request() req: any, @Body() dto: AiAddOnDto) {
    const organizationId = this.requireOrg(req);
    return this.subscriptionService.subscribeToAiAddOn(
      organizationId,
      dto.packageId,
      dto.billingCycle,
    );
  }

  /**
   * Cancel AI add-on subscription
   */
  @Delete('ai-addon')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async cancelAiAddOn(@Request() req: any) {
    const organizationId = this.requireOrg(req);
    return this.subscriptionService.cancelAiAddOn(organizationId);
  }

  /**
   * Get current AI add-on subscription
   */
  @Get('ai-addon')
  @UseGuards(JwtAuthGuard)
  async getAiAddOnSubscription(@Request() req: any) {
    const organizationId = this.requireOrg(req);
    return this.subscriptionService.getAiAddOnSubscription(organizationId);
  }

  /**
   * Get AI usage statistics
   */
  @Get('ai-usage')
  @UseGuards(JwtAuthGuard)
  async getAiUsageStats(@Request() req: any): Promise<AiUsageStats> {
    const organizationId = this.requireOrg(req);
    return this.subscriptionService.getAiUsageStats(organizationId);
  }

  /**
   * Check access to a specific AI feature
   */
  @Post('ai-feature/check')
  @UseGuards(JwtAuthGuard)
  async checkAiFeatureAccess(@Request() req: any, @Body() dto: CheckAiFeatureDto) {
    const organizationId = this.requireOrg(req);
    return this.subscriptionService.checkAiFeatureAccess(
      organizationId,
      dto.featureKey,
    );
  }

  /**
   * Get full subscription summary (base plan + AI add-on)
   */
  @Get('summary')
  @UseGuards(JwtAuthGuard)
  async getFullSubscriptionSummary(@Request() req: any) {
    const organizationId = this.requireOrg(req);
    return this.subscriptionService.getFullSubscriptionSummary(organizationId);
  }
}
