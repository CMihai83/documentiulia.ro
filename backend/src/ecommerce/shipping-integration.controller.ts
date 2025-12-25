import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ShippingIntegrationService,
  ShippingCarrier,
  ServiceType,
  ShipmentStatus,
  LabelFormat,
  ShippingAddress,
  ShippingPackage,
  Shipment,
  RateQuote,
  PickupRequest,
  ReturnLabel,
  ShippingZone,
  ShippingRule,
  LockerLocation,
  CarrierInfo,
  ShippingAnalytics,
  ShipmentEvent,
} from './shipping-integration.service';

@Controller('shipping')
export class ShippingIntegrationController {
  constructor(private readonly shippingService: ShippingIntegrationService) {}

  // ==================== Carrier Endpoints ====================

  @Get('carriers')
  getCarriers(): CarrierInfo[] {
    return this.shippingService.getCarriers();
  }

  @Get('carriers/:carrierId')
  getCarrier(@Param('carrierId') carrierId: ShippingCarrier): CarrierInfo | undefined {
    return this.shippingService.getCarrier(carrierId);
  }

  @Get('carriers/filter/romanian')
  getRomanianCarriers(): CarrierInfo[] {
    return this.shippingService.getRomanianCarriers();
  }

  @Get('carriers/filter/international')
  getInternationalCarriers(): CarrierInfo[] {
    return this.shippingService.getInternationalCarriers();
  }

  @Get('carriers/filter/country/:country')
  getCarriersByCountry(@Param('country') country: string): CarrierInfo[] {
    return this.shippingService.getCarriersByCountry(country);
  }

  @Get('carriers/filter/service/:service')
  getCarriersByService(@Param('service') service: ServiceType): CarrierInfo[] {
    return this.shippingService.getCarriersByService(service);
  }

  // ==================== Rate Endpoints ====================

  @Post('rates')
  async getRates(
    @Body() body: {
      fromAddress: ShippingAddress;
      toAddress: ShippingAddress;
      packages: ShippingPackage[];
      options?: {
        carriers?: ShippingCarrier[];
        services?: ServiceType[];
        cashOnDelivery?: number;
        insurance?: number;
      };
    },
  ): Promise<RateQuote[]> {
    return this.shippingService.getRates(body);
  }

  @Get('rates/estimate')
  estimateDeliveryDate(
    @Query('carrier') carrier: ShippingCarrier,
    @Query('service') service: ServiceType,
    @Query('fromCountry') fromCountry: string,
    @Query('toCountry') toCountry: string,
  ): { estimatedDeliveryDate: Date } {
    const date = this.shippingService.estimateDeliveryDate(carrier, service, fromCountry, toCountry);
    return { estimatedDeliveryDate: date };
  }

  // ==================== Shipment Endpoints ====================

  @Post('shipments')
  async createShipment(
    @Body() body: {
      tenantId: string;
      orderId?: string;
      carrier: ShippingCarrier;
      service: ServiceType;
      fromAddress: ShippingAddress;
      toAddress: ShippingAddress;
      packages: ShippingPackage[];
      options?: Shipment['options'];
    },
  ): Promise<Shipment> {
    return this.shippingService.createShipment(body);
  }

  @Get('shipments/:shipmentId')
  getShipment(@Param('shipmentId') shipmentId: string): Shipment | undefined {
    return this.shippingService.getShipment(shipmentId);
  }

  @Get('shipments/tenant/:tenantId')
  getShipmentsByTenant(@Param('tenantId') tenantId: string): Shipment[] {
    return this.shippingService.getShipmentsByTenant(tenantId);
  }

  @Get('shipments/order/:orderId')
  getShipmentsByOrder(@Param('orderId') orderId: string): Shipment[] {
    return this.shippingService.getShipmentsByOrder(orderId);
  }

  @Get('shipments/tenant/:tenantId/status/:status')
  getShipmentsByStatus(
    @Param('tenantId') tenantId: string,
    @Param('status') status: ShipmentStatus,
  ): Shipment[] {
    return this.shippingService.getShipmentsByStatus(tenantId, status);
  }

  @Put('shipments/:shipmentId/status')
  async updateShipmentStatus(
    @Param('shipmentId') shipmentId: string,
    @Body() body: {
      status: ShipmentStatus;
      location?: string;
      description?: string;
      signedBy?: string;
    },
  ): Promise<Shipment> {
    return this.shippingService.updateShipmentStatus(shipmentId, body.status, {
      location: body.location,
      description: body.description,
      signedBy: body.signedBy,
    });
  }

  @Post('shipments/:shipmentId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelShipment(
    @Param('shipmentId') shipmentId: string,
    @Body() body: { reason?: string },
  ): Promise<Shipment> {
    return this.shippingService.cancelShipment(shipmentId, body.reason);
  }

  // ==================== Label Endpoints ====================

  @Post('shipments/:shipmentId/label')
  async createLabel(
    @Param('shipmentId') shipmentId: string,
    @Body() body: { format?: LabelFormat },
  ): Promise<{ labelUrl: string; trackingNumber: string }> {
    return this.shippingService.createLabel(shipmentId, body.format);
  }

  @Post('shipments/:shipmentId/return-label')
  async createReturnLabel(@Param('shipmentId') shipmentId: string): Promise<ReturnLabel> {
    return this.shippingService.createReturnLabel(shipmentId);
  }

  @Get('return-labels/:returnLabelId')
  getReturnLabel(@Param('returnLabelId') returnLabelId: string): ReturnLabel | undefined {
    return this.shippingService.getReturnLabel(returnLabelId);
  }

  // ==================== Tracking Endpoints ====================

  @Get('track/:trackingNumber')
  async trackShipment(@Param('trackingNumber') trackingNumber: string): Promise<ShipmentEvent[]> {
    return this.shippingService.trackShipment(trackingNumber);
  }

  @Get('track/:carrier/:trackingNumber')
  async trackByCarrier(
    @Param('carrier') carrier: ShippingCarrier,
    @Param('trackingNumber') trackingNumber: string,
  ): Promise<{ trackingUrl: string; events: ShipmentEvent[] }> {
    return this.shippingService.trackByCarrier(carrier, trackingNumber);
  }

  // ==================== Pickup Endpoints ====================

  @Post('pickups')
  async schedulePickup(
    @Body() body: {
      tenantId: string;
      carrier: ShippingCarrier;
      pickupDate: Date;
      pickupWindow: { start: string; end: string };
      address: ShippingAddress;
      shipmentIds: string[];
      instructions?: string;
    },
  ): Promise<PickupRequest> {
    return this.shippingService.schedulePickup({
      ...body,
      pickupDate: new Date(body.pickupDate),
    });
  }

  @Get('pickups/:pickupId')
  getPickupRequest(@Param('pickupId') pickupId: string): PickupRequest | undefined {
    return this.shippingService.getPickupRequest(pickupId);
  }

  @Get('pickups/tenant/:tenantId')
  getPickupsByTenant(@Param('tenantId') tenantId: string): PickupRequest[] {
    return this.shippingService.getPickupsByTenant(tenantId);
  }

  @Post('pickups/:pickupId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelPickup(@Param('pickupId') pickupId: string): Promise<PickupRequest> {
    return this.shippingService.cancelPickup(pickupId);
  }

  // ==================== Shipping Zone Endpoints ====================

  @Post('zones')
  async createShippingZone(
    @Body() body: {
      tenantId: string;
      name: string;
      countries: string[];
      regions?: string[];
      postalCodeRanges?: { from: string; to: string }[];
      carriers: ShippingCarrier[];
      defaultCarrier: ShippingCarrier;
      rates: ShippingZone['rates'];
    },
  ): Promise<ShippingZone> {
    return this.shippingService.createShippingZone(body);
  }

  @Get('zones/:zoneId')
  getShippingZone(@Param('zoneId') zoneId: string): ShippingZone | undefined {
    return this.shippingService.getShippingZone(zoneId);
  }

  @Get('zones/tenant/:tenantId')
  getShippingZonesByTenant(@Param('tenantId') tenantId: string): ShippingZone[] {
    return this.shippingService.getShippingZonesByTenant(tenantId);
  }

  @Post('zones/find')
  getZoneForAddress(
    @Body() body: { tenantId: string; address: ShippingAddress },
  ): ShippingZone | undefined {
    return this.shippingService.getZoneForAddress(body.tenantId, body.address);
  }

  // ==================== Shipping Rule Endpoints ====================

  @Post('rules')
  async createShippingRule(
    @Body() body: {
      tenantId: string;
      name: string;
      priority: number;
      conditions: ShippingRule['conditions'];
      action: ShippingRule['action'];
    },
  ): Promise<ShippingRule> {
    return this.shippingService.createShippingRule(body);
  }

  @Get('rules/:ruleId')
  getShippingRule(@Param('ruleId') ruleId: string): ShippingRule | undefined {
    return this.shippingService.getShippingRule(ruleId);
  }

  @Get('rules/tenant/:tenantId')
  getShippingRulesByTenant(@Param('tenantId') tenantId: string): ShippingRule[] {
    return this.shippingService.getShippingRulesByTenant(tenantId);
  }

  @Post('rules/evaluate')
  evaluateRules(
    @Body() body: {
      tenantId: string;
      context: {
        weight?: number;
        value?: number;
        country?: string;
        category?: string;
        sku?: string;
      };
    },
  ): ShippingRule['action'][] {
    return this.shippingService.evaluateRules(body.tenantId, body.context);
  }

  // ==================== Locker Location Endpoints ====================

  @Get('lockers')
  getLockerLocations(@Query('carrier') carrier?: ShippingCarrier): LockerLocation[] {
    return this.shippingService.getLockerLocations(carrier);
  }

  @Get('lockers/city/:city')
  getLockersByCity(@Param('city') city: string): LockerLocation[] {
    return this.shippingService.getLockersByCity(city);
  }

  @Get('lockers/nearby')
  getNearbyLockers(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
  ): LockerLocation[] {
    return this.shippingService.getNearbyLockers(
      parseFloat(lat),
      parseFloat(lng),
      radius ? parseFloat(radius) : undefined,
    );
  }

  // ==================== Analytics Endpoints ====================

  @Get('analytics/:tenantId')
  getShippingAnalytics(
    @Param('tenantId') tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): ShippingAnalytics {
    return this.shippingService.getShippingAnalytics(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  // ==================== Utility Endpoints ====================

  @Post('validate-address')
  validateAddress(@Body() address: ShippingAddress): { valid: boolean; suggestions?: string[] } {
    return this.shippingService.validateAddress(address);
  }
}
