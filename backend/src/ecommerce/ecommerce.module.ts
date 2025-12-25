import { Module } from '@nestjs/common';
import { EcommerceService } from './ecommerce.service';
import { EcommerceController } from './ecommerce.controller';
import { MarketplaceIntegrationService } from './marketplace-integration.service';
import { MarketplaceIntegrationController } from './marketplace-integration.controller';
import { ShippingIntegrationService } from './shipping-integration.service';
import { ShippingIntegrationController } from './shipping-integration.controller';
import { EcommerceAnalyticsService } from './ecommerce-analytics.service';
import { EcommerceAnalyticsController } from './ecommerce-analytics.controller';

@Module({
  controllers: [EcommerceController, MarketplaceIntegrationController, ShippingIntegrationController, EcommerceAnalyticsController],
  providers: [EcommerceService, MarketplaceIntegrationService, ShippingIntegrationService, EcommerceAnalyticsService],
  exports: [EcommerceService, MarketplaceIntegrationService, ShippingIntegrationService, EcommerceAnalyticsService],
})
export class EcommerceModule {}
