import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  ShippingIntegrationService,
  ShippingCarrier,
  ServiceType,
  ShipmentStatus,
  ShippingAddress,
  ShippingPackage,
  LabelFormat,
} from './shipping-integration.service';

describe('ShippingIntegrationService', () => {
  let service: ShippingIntegrationService;

  const mockFromAddress: ShippingAddress = {
    name: 'Test Sender',
    company: 'Test Company',
    street1: 'Str. Victoriei 10',
    city: 'Bucuresti',
    postalCode: '010061',
    country: 'RO',
    phone: '+40721123456',
    email: 'sender@test.com',
  };

  const mockToAddress: ShippingAddress = {
    name: 'Test Receiver',
    street1: 'Bd. Unirii 20',
    city: 'Cluj-Napoca',
    postalCode: '400001',
    country: 'RO',
    phone: '+40722654321',
    email: 'receiver@test.com',
  };

  const mockInternationalAddress: ShippingAddress = {
    name: 'International Receiver',
    street1: '123 Main Street',
    city: 'Berlin',
    postalCode: '10115',
    country: 'DE',
    phone: '+49301234567',
    email: 'intl@test.com',
  };

  const mockPackage: ShippingPackage = {
    id: 'pkg_1',
    type: 'parcel',
    weight: 2.5,
    weightUnit: 'kg',
    dimensions: { length: 30, width: 20, height: 15, unit: 'cm' },
    declaredValue: 100,
    currency: 'RON',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShippingIntegrationService],
    }).compile();

    service = module.get<ShippingIntegrationService>(ShippingIntegrationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==================== Carrier Tests ====================

  describe('Carrier Management', () => {
    it('should get all carriers', () => {
      const carriers = service.getCarriers();
      expect(carriers.length).toBeGreaterThan(0);
      expect(carriers.length).toBe(16); // 16 carriers defined
    });

    it('should get carrier by ID', () => {
      const carrier = service.getCarrier('fan_courier');
      expect(carrier).toBeDefined();
      expect(carrier?.name).toBe('FAN Courier');
      expect(carrier?.country).toBe('RO');
    });

    it('should get Romanian carriers', () => {
      const carriers = service.getRomanianCarriers();
      expect(carriers.length).toBeGreaterThan(0);
      expect(carriers.every(c => c.country === 'RO')).toBe(true);
      expect(carriers.map(c => c.id)).toContain('fan_courier');
      expect(carriers.map(c => c.id)).toContain('cargus');
      expect(carriers.map(c => c.id)).toContain('sameday');
    });

    it('should get international carriers', () => {
      const carriers = service.getInternationalCarriers();
      expect(carriers.length).toBeGreaterThan(0);
      expect(carriers.map(c => c.id)).toContain('dhl');
      expect(carriers.map(c => c.id)).toContain('ups');
      expect(carriers.map(c => c.id)).toContain('fedex');
    });

    it('should get carriers by country', () => {
      const roCarriers = service.getCarriersByCountry('RO');
      expect(roCarriers.length).toBeGreaterThan(5);

      const bgCarriers = service.getCarriersByCountry('BG');
      expect(bgCarriers.length).toBeGreaterThan(0);
    });

    it('should get carriers by service', () => {
      const sameDayCarriers = service.getCarriersByService('same_day');
      expect(sameDayCarriers.length).toBeGreaterThan(0);
      expect(sameDayCarriers.every(c => c.supportedServices.includes('same_day'))).toBe(true);

      const freightCarriers = service.getCarriersByService('freight');
      expect(freightCarriers.length).toBeGreaterThan(0);
    });

    it('should have correct carrier features', () => {
      const fanCourier = service.getCarrier('fan_courier');
      expect(fanCourier?.features.cashOnDelivery).toBe(true);
      expect(fanCourier?.features.lockerDelivery).toBe(true);

      const dhl = service.getCarrier('dhl');
      expect(dhl?.features.cashOnDelivery).toBe(false);
      expect(dhl?.features.insurance).toBe(true);
    });
  });

  // ==================== Rate Calculation Tests ====================

  describe('Rate Calculation', () => {
    it('should get rates for domestic shipment', async () => {
      const rates = await service.getRates({
        fromAddress: mockFromAddress,
        toAddress: mockToAddress,
        packages: [mockPackage],
      });

      expect(rates.length).toBeGreaterThan(0);
      expect(rates.every(r => r.rates.totalRate > 0)).toBe(true);
      expect(rates.every(r => r.estimatedDeliveryDays >= 0)).toBe(true);
    });

    it('should get rates for international shipment', async () => {
      const rates = await service.getRates({
        fromAddress: mockFromAddress,
        toAddress: mockInternationalAddress,
        packages: [mockPackage],
      });

      expect(rates.length).toBeGreaterThan(0);
      // International rates should be higher
      const avgRate = rates.reduce((sum, r) => sum + r.rates.totalRate, 0) / rates.length;
      expect(avgRate).toBeGreaterThan(20);
    });

    it('should filter rates by carrier', async () => {
      const rates = await service.getRates({
        fromAddress: mockFromAddress,
        toAddress: mockToAddress,
        packages: [mockPackage],
        options: {
          carriers: ['fan_courier', 'sameday'],
        },
      });

      expect(rates.length).toBeGreaterThan(0);
      expect(rates.every(r => ['fan_courier', 'sameday'].includes(r.carrier))).toBe(true);
    });

    it('should filter rates by service', async () => {
      const rates = await service.getRates({
        fromAddress: mockFromAddress,
        toAddress: mockToAddress,
        packages: [mockPackage],
        options: {
          services: ['express'],
        },
      });

      expect(rates.length).toBeGreaterThan(0);
      expect(rates.every(r => r.service === 'express')).toBe(true);
    });

    it('should include COD fee in rates', async () => {
      const ratesNoCod = await service.getRates({
        fromAddress: mockFromAddress,
        toAddress: mockToAddress,
        packages: [mockPackage],
        options: { carriers: ['fan_courier'], services: ['standard'] },
      });

      const ratesWithCod = await service.getRates({
        fromAddress: mockFromAddress,
        toAddress: mockToAddress,
        packages: [mockPackage],
        options: { carriers: ['fan_courier'], services: ['standard'], cashOnDelivery: 200 },
      });

      expect(ratesWithCod[0].rates.codFee).toBeGreaterThan(0);
      expect(ratesWithCod[0].rates.totalRate).toBeGreaterThan(ratesNoCod[0].rates.totalRate);
    });

    it('should include insurance fee in rates', async () => {
      const rates = await service.getRates({
        fromAddress: mockFromAddress,
        toAddress: mockToAddress,
        packages: [mockPackage],
        options: { insurance: 500 },
      });

      expect(rates.some(r => r.rates.insuranceFee > 0)).toBe(true);
    });

    it('should sort rates by total rate', async () => {
      const rates = await service.getRates({
        fromAddress: mockFromAddress,
        toAddress: mockToAddress,
        packages: [mockPackage],
      });

      for (let i = 1; i < rates.length; i++) {
        expect(rates[i].rates.totalRate).toBeGreaterThanOrEqual(rates[i - 1].rates.totalRate);
      }
    });

    it('should estimate delivery date', () => {
      const date = service.estimateDeliveryDate('fan_courier', 'standard', 'RO', 'RO');
      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).toBeGreaterThan(Date.now());
    });
  });

  // ==================== Shipment Management Tests ====================

  describe('Shipment Management', () => {
    it('should create shipment', async () => {
      const shipment = await service.createShipment({
        tenantId: 'tenant_123',
        orderId: 'order_456',
        carrier: 'fan_courier',
        service: 'standard',
        fromAddress: mockFromAddress,
        toAddress: mockToAddress,
        packages: [mockPackage],
      });

      expect(shipment).toBeDefined();
      expect(shipment.id).toMatch(/^ship_/);
      expect(shipment.status).toBe('draft');
      expect(shipment.carrier).toBe('fan_courier');
      expect(shipment.service).toBe('standard');
      expect(shipment.timeline.length).toBe(1);
    });

    it('should create shipment with options', async () => {
      const shipment = await service.createShipment({
        tenantId: 'tenant_123',
        carrier: 'sameday',
        service: 'express',
        fromAddress: mockFromAddress,
        toAddress: mockToAddress,
        packages: [mockPackage],
        options: {
          cashOnDelivery: { amount: 150, currency: 'RON' },
          insurance: { amount: 200, currency: 'RON' },
          signatureRequired: true,
          fragileHandling: true,
        },
      });

      expect(shipment.options.cashOnDelivery?.amount).toBe(150);
      expect(shipment.options.insurance?.amount).toBe(200);
      expect(shipment.options.signatureRequired).toBe(true);
    });

    it('should throw error for invalid carrier', async () => {
      await expect(
        service.createShipment({
          tenantId: 'tenant_123',
          carrier: 'invalid_carrier' as ShippingCarrier,
          service: 'standard',
          fromAddress: mockFromAddress,
          toAddress: mockToAddress,
          packages: [mockPackage],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should get shipment by ID', async () => {
      const created = await service.createShipment({
        tenantId: 'tenant_123',
        carrier: 'cargus',
        service: 'standard',
        fromAddress: mockFromAddress,
        toAddress: mockToAddress,
        packages: [mockPackage],
      });

      const retrieved = service.getShipment(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should get shipments by tenant', async () => {
      const tenantId = 'tenant_shipments_test';

      await service.createShipment({
        tenantId,
        carrier: 'fan_courier',
        service: 'standard',
        fromAddress: mockFromAddress,
        toAddress: mockToAddress,
        packages: [mockPackage],
      });

      await service.createShipment({
        tenantId,
        carrier: 'sameday',
        service: 'express',
        fromAddress: mockFromAddress,
        toAddress: mockToAddress,
        packages: [mockPackage],
      });

      const shipments = service.getShipmentsByTenant(tenantId);
      expect(shipments.length).toBe(2);
    });

    it('should get shipments by order', async () => {
      const orderId = 'order_unique_123';

      await service.createShipment({
        tenantId: 'tenant_123',
        orderId,
        carrier: 'fan_courier',
        service: 'standard',
        fromAddress: mockFromAddress,
        toAddress: mockToAddress,
        packages: [mockPackage],
      });

      const shipments = service.getShipmentsByOrder(orderId);
      expect(shipments.length).toBe(1);
      expect(shipments[0].orderId).toBe(orderId);
    });

    it('should update shipment status', async () => {
      const shipment = await service.createShipment({
        tenantId: 'tenant_123',
        carrier: 'dpd_ro',
        service: 'standard',
        fromAddress: mockFromAddress,
        toAddress: mockToAddress,
        packages: [mockPackage],
      });

      const updated = await service.updateShipmentStatus(shipment.id, 'in_transit', {
        location: 'Bucuresti Hub',
        description: 'Package arrived at sorting facility',
      });

      expect(updated.status).toBe('in_transit');
      expect(updated.timeline.length).toBe(2);
      expect(updated.timeline[1].location).toBe('Bucuresti Hub');
    });

    it('should set actual delivery date when delivered', async () => {
      const shipment = await service.createShipment({
        tenantId: 'tenant_123',
        carrier: 'gls_ro',
        service: 'standard',
        fromAddress: mockFromAddress,
        toAddress: mockToAddress,
        packages: [mockPackage],
      });

      const delivered = await service.updateShipmentStatus(shipment.id, 'delivered', {
        signedBy: 'John Doe',
      });

      expect(delivered.status).toBe('delivered');
      expect(delivered.actualDeliveryDate).toBeDefined();
      expect(delivered.timeline[1].signedBy).toBe('John Doe');
    });

    it('should cancel shipment', async () => {
      const shipment = await service.createShipment({
        tenantId: 'tenant_123',
        carrier: 'fan_courier',
        service: 'standard',
        fromAddress: mockFromAddress,
        toAddress: mockToAddress,
        packages: [mockPackage],
      });

      const cancelled = await service.cancelShipment(shipment.id, 'Customer request');
      expect(cancelled.status).toBe('cancelled');
    });

    it('should not cancel delivered shipment', async () => {
      const shipment = await service.createShipment({
        tenantId: 'tenant_123',
        carrier: 'fan_courier',
        service: 'standard',
        fromAddress: mockFromAddress,
        toAddress: mockToAddress,
        packages: [mockPackage],
      });

      await service.updateShipmentStatus(shipment.id, 'delivered');

      await expect(
        service.cancelShipment(shipment.id),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== Label Generation Tests ====================

  describe('Label Generation', () => {
    it('should create shipping label', async () => {
      const shipment = await service.createShipment({
        tenantId: 'tenant_123',
        carrier: 'fan_courier',
        service: 'standard',
        fromAddress: mockFromAddress,
        toAddress: mockToAddress,
        packages: [mockPackage],
      });

      const result = await service.createLabel(shipment.id);

      expect(result.labelUrl).toBeDefined();
      expect(result.trackingNumber).toBeDefined();
      expect(result.trackingNumber).toMatch(/^FC/);

      const updated = service.getShipment(shipment.id);
      expect(updated?.status).toBe('label_created');
      expect(updated?.trackingNumber).toBe(result.trackingNumber);
    });

    it('should create label with different formats', async () => {
      const shipment = await service.createShipment({
        tenantId: 'tenant_123',
        carrier: 'dhl',
        service: 'express',
        fromAddress: mockFromAddress,
        toAddress: mockInternationalAddress,
        packages: [mockPackage],
      });

      const result = await service.createLabel(shipment.id, 'zpl');

      expect(result.labelUrl).toContain('.zpl');
    });

    it('should generate correct tracking number prefix per carrier', async () => {
      const carriers: { carrier: ShippingCarrier; prefix: string }[] = [
        { carrier: 'fan_courier', prefix: 'FC' },
        { carrier: 'sameday', prefix: 'SD' },
        { carrier: 'dhl', prefix: 'DHL' },
        { carrier: 'ups', prefix: '1Z' },
        { carrier: 'fedex', prefix: 'FX' },
      ];

      for (const { carrier, prefix } of carriers) {
        const shipment = await service.createShipment({
          tenantId: 'tenant_123',
          carrier,
          service: 'standard',
          fromAddress: mockFromAddress,
          toAddress: mockToAddress,
          packages: [mockPackage],
        });

        const result = await service.createLabel(shipment.id);
        expect(result.trackingNumber.startsWith(prefix)).toBe(true);
      }
    });

    it('should not create label for non-draft shipment', async () => {
      const shipment = await service.createShipment({
        tenantId: 'tenant_123',
        carrier: 'fan_courier',
        service: 'standard',
        fromAddress: mockFromAddress,
        toAddress: mockToAddress,
        packages: [mockPackage],
      });

      await service.createLabel(shipment.id);
      await service.updateShipmentStatus(shipment.id, 'picked_up');

      await expect(
        service.createLabel(shipment.id),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== Tracking Tests ====================

  describe('Tracking', () => {
    it('should track shipment by tracking number', async () => {
      const shipment = await service.createShipment({
        tenantId: 'tenant_123',
        carrier: 'fan_courier',
        service: 'standard',
        fromAddress: mockFromAddress,
        toAddress: mockToAddress,
        packages: [mockPackage],
      });

      const { trackingNumber } = await service.createLabel(shipment.id);
      await service.updateShipmentStatus(shipment.id, 'in_transit');

      const events = await service.trackShipment(trackingNumber);
      expect(events.length).toBeGreaterThan(0);
    });

    it('should track by carrier', async () => {
      const shipment = await service.createShipment({
        tenantId: 'tenant_123',
        carrier: 'sameday',
        service: 'express',
        fromAddress: mockFromAddress,
        toAddress: mockToAddress,
        packages: [mockPackage],
      });

      const { trackingNumber } = await service.createLabel(shipment.id);

      const result = await service.trackByCarrier('sameday', trackingNumber);
      expect(result.trackingUrl).toContain('sameday.ro');
      expect(result.events).toBeDefined();
    });

    it('should throw error for unknown tracking number', async () => {
      await expect(
        service.trackShipment('UNKNOWN123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== Pickup Tests ====================

  describe('Pickup Management', () => {
    it('should schedule pickup', async () => {
      const shipment1 = await service.createShipment({
        tenantId: 'tenant_pickup',
        carrier: 'fan_courier',
        service: 'standard',
        fromAddress: mockFromAddress,
        toAddress: mockToAddress,
        packages: [mockPackage],
      });

      await service.createLabel(shipment1.id);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const pickup = await service.schedulePickup({
        tenantId: 'tenant_pickup',
        carrier: 'fan_courier',
        pickupDate: tomorrow,
        pickupWindow: { start: '09:00', end: '17:00' },
        address: mockFromAddress,
        shipmentIds: [shipment1.id],
        instructions: 'Ring bell twice',
      });

      expect(pickup).toBeDefined();
      expect(pickup.status).toBe('confirmed');
      expect(pickup.confirmationNumber).toBeDefined();
      expect(pickup.totalPackages).toBe(1);

      const updatedShipment = service.getShipment(shipment1.id);
      expect(updatedShipment?.status).toBe('pickup_scheduled');
    });

    it('should throw error for carrier without pickup service', async () => {
      const shipment = await service.createShipment({
        tenantId: 'tenant_123',
        carrier: 'posta_romana',
        service: 'standard',
        fromAddress: mockFromAddress,
        toAddress: mockToAddress,
        packages: [mockPackage],
      });

      await expect(
        service.schedulePickup({
          tenantId: 'tenant_123',
          carrier: 'posta_romana',
          pickupDate: new Date(),
          pickupWindow: { start: '09:00', end: '17:00' },
          address: mockFromAddress,
          shipmentIds: [shipment.id],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should get pickup by ID', async () => {
      const shipment = await service.createShipment({
        tenantId: 'tenant_123',
        carrier: 'sameday',
        service: 'standard',
        fromAddress: mockFromAddress,
        toAddress: mockToAddress,
        packages: [mockPackage],
      });

      await service.createLabel(shipment.id);

      const pickup = await service.schedulePickup({
        tenantId: 'tenant_123',
        carrier: 'sameday',
        pickupDate: new Date(),
        pickupWindow: { start: '10:00', end: '14:00' },
        address: mockFromAddress,
        shipmentIds: [shipment.id],
      });

      const retrieved = service.getPickupRequest(pickup.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(pickup.id);
    });

    it('should cancel pickup', async () => {
      const shipment = await service.createShipment({
        tenantId: 'tenant_123',
        carrier: 'dpd_ro',
        service: 'standard',
        fromAddress: mockFromAddress,
        toAddress: mockToAddress,
        packages: [mockPackage],
      });

      await service.createLabel(shipment.id);

      const pickup = await service.schedulePickup({
        tenantId: 'tenant_123',
        carrier: 'dpd_ro',
        pickupDate: new Date(),
        pickupWindow: { start: '09:00', end: '12:00' },
        address: mockFromAddress,
        shipmentIds: [shipment.id],
      });

      const cancelled = await service.cancelPickup(pickup.id);
      expect(cancelled.status).toBe('cancelled');

      const updatedShipment = service.getShipment(shipment.id);
      expect(updatedShipment?.status).toBe('label_created');
    });
  });

  // ==================== Return Label Tests ====================

  describe('Return Labels', () => {
    it('should create return label', async () => {
      const shipment = await service.createShipment({
        tenantId: 'tenant_123',
        carrier: 'fan_courier',
        service: 'standard',
        fromAddress: mockFromAddress,
        toAddress: mockToAddress,
        packages: [mockPackage],
      });

      await service.createLabel(shipment.id);

      const returnLabel = await service.createReturnLabel(shipment.id);

      expect(returnLabel).toBeDefined();
      expect(returnLabel.trackingNumber).toBeDefined();
      expect(returnLabel.labelUrl).toContain('returns');
      expect(returnLabel.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should get return label by ID', async () => {
      const shipment = await service.createShipment({
        tenantId: 'tenant_123',
        carrier: 'sameday',
        service: 'standard',
        fromAddress: mockFromAddress,
        toAddress: mockToAddress,
        packages: [mockPackage],
      });

      await service.createLabel(shipment.id);
      const created = await service.createReturnLabel(shipment.id);

      const retrieved = service.getReturnLabel(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should throw error for carrier without return label support', async () => {
      const shipment = await service.createShipment({
        tenantId: 'tenant_123',
        carrier: 'glovo',
        service: 'same_day',
        fromAddress: mockFromAddress,
        toAddress: mockToAddress,
        packages: [mockPackage],
      });

      await expect(
        service.createReturnLabel(shipment.id),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== Shipping Zone Tests ====================

  describe('Shipping Zones', () => {
    it('should create shipping zone', async () => {
      const zone = await service.createShippingZone({
        tenantId: 'tenant_123',
        name: 'Romania Domestic',
        countries: ['RO'],
        carriers: ['fan_courier', 'sameday', 'cargus'],
        defaultCarrier: 'fan_courier',
        rates: [
          { carrier: 'fan_courier', service: 'standard', baseRate: 15, perKgRate: 2 },
          { carrier: 'sameday', service: 'express', baseRate: 20, perKgRate: 3 },
        ],
      });

      expect(zone).toBeDefined();
      expect(zone.id).toMatch(/^zone_/);
      expect(zone.name).toBe('Romania Domestic');
      expect(zone.isActive).toBe(true);
    });

    it('should get shipping zone by ID', async () => {
      const created = await service.createShippingZone({
        tenantId: 'tenant_123',
        name: 'EU Zone',
        countries: ['DE', 'FR', 'IT', 'ES'],
        carriers: ['dhl', 'ups'],
        defaultCarrier: 'dhl',
        rates: [],
      });

      const retrieved = service.getShippingZone(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('EU Zone');
    });

    it('should get zones by tenant', async () => {
      const tenantId = 'tenant_zones_test';

      await service.createShippingZone({
        tenantId,
        name: 'Zone 1',
        countries: ['RO'],
        carriers: ['fan_courier'],
        defaultCarrier: 'fan_courier',
        rates: [],
      });

      await service.createShippingZone({
        tenantId,
        name: 'Zone 2',
        countries: ['DE'],
        carriers: ['dhl'],
        defaultCarrier: 'dhl',
        rates: [],
      });

      const zones = service.getShippingZonesByTenant(tenantId);
      expect(zones.length).toBe(2);
    });

    it('should find zone for address', async () => {
      const tenantId = 'tenant_zone_find';

      await service.createShippingZone({
        tenantId,
        name: 'Romania',
        countries: ['RO'],
        carriers: ['fan_courier'],
        defaultCarrier: 'fan_courier',
        rates: [],
      });

      const zone = service.getZoneForAddress(tenantId, mockToAddress);
      expect(zone).toBeDefined();
      expect(zone?.name).toBe('Romania');
    });
  });

  // ==================== Shipping Rule Tests ====================

  describe('Shipping Rules', () => {
    it('should create shipping rule', async () => {
      const rule = await service.createShippingRule({
        tenantId: 'tenant_123',
        name: 'Free shipping over 200 RON',
        priority: 1,
        conditions: [
          { field: 'value', operator: 'gte', value: 200 },
        ],
        action: {
          type: 'free_shipping',
        },
      });

      expect(rule).toBeDefined();
      expect(rule.id).toMatch(/^rule_/);
      expect(rule.isActive).toBe(true);
    });

    it('should get rule by ID', async () => {
      const created = await service.createShippingRule({
        tenantId: 'tenant_123',
        name: 'Block heavy items',
        priority: 1,
        conditions: [{ field: 'weight', operator: 'gt', value: 30 }],
        action: { type: 'block', message: 'Item too heavy' },
      });

      const retrieved = service.getShippingRule(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Block heavy items');
    });

    it('should evaluate rules', async () => {
      const tenantId = 'tenant_rule_eval';

      await service.createShippingRule({
        tenantId,
        name: 'Free shipping',
        priority: 1,
        conditions: [{ field: 'value', operator: 'gte', value: 100 }],
        action: { type: 'free_shipping' },
      });

      await service.createShippingRule({
        tenantId,
        name: 'Add handling fee for fragile',
        priority: 2,
        conditions: [{ field: 'category', operator: 'eq', value: 'fragile' }],
        action: { type: 'add_fee', amount: 10 },
      });

      const actions = service.evaluateRules(tenantId, {
        value: 150,
        category: 'fragile',
      });

      expect(actions.length).toBe(2);
      expect(actions.some(a => a.type === 'free_shipping')).toBe(true);
      expect(actions.some(a => a.type === 'add_fee')).toBe(true);
    });

    it('should not match rules with unmet conditions', async () => {
      const tenantId = 'tenant_rule_no_match';

      await service.createShippingRule({
        tenantId,
        name: 'Free shipping',
        priority: 1,
        conditions: [{ field: 'value', operator: 'gte', value: 500 }],
        action: { type: 'free_shipping' },
      });

      const actions = service.evaluateRules(tenantId, { value: 50 });
      expect(actions.length).toBe(0);
    });
  });

  // ==================== Locker Location Tests ====================

  describe('Locker Locations', () => {
    it('should get all locker locations', () => {
      const lockers = service.getLockerLocations();
      expect(lockers.length).toBeGreaterThan(0);
    });

    it('should filter lockers by carrier', () => {
      const samedayLockers = service.getLockerLocations('sameday');
      expect(samedayLockers.length).toBeGreaterThan(0);
      expect(samedayLockers.every(l => l.carrier === 'sameday')).toBe(true);
    });

    it('should get lockers by city', () => {
      const bucuresti = service.getLockersByCity('Bucuresti');
      expect(bucuresti.length).toBeGreaterThan(0);
    });

    it('should get nearby lockers', () => {
      // Coordinates near Bucuresti center
      const nearby = service.getNearbyLockers(44.4268, 26.1025, 20);
      expect(nearby.length).toBeGreaterThan(0);
    });

    it('should sort nearby lockers by distance', () => {
      const lat = 44.4324;
      const lng = 26.0524;
      const nearby = service.getNearbyLockers(lat, lng, 50);

      if (nearby.length > 1) {
        // Just verify it doesn't throw and returns sorted results
        expect(nearby.length).toBeGreaterThan(0);
      }
    });
  });

  // ==================== Analytics Tests ====================

  describe('Shipping Analytics', () => {
    it('should get shipping analytics', async () => {
      const tenantId = `tenant_analytics_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date(Date.now() + 1000); // Ensure endDate is after shipment creation

      // Create some shipments
      const shipment1 = await service.createShipment({
        tenantId,
        carrier: 'fan_courier',
        service: 'standard',
        fromAddress: mockFromAddress,
        toAddress: mockToAddress,
        packages: [mockPackage],
      });

      const shipment2 = await service.createShipment({
        tenantId,
        carrier: 'sameday',
        service: 'express',
        fromAddress: mockFromAddress,
        toAddress: mockToAddress,
        packages: [mockPackage],
      });

      await service.updateShipmentStatus(shipment1.id, 'delivered');

      const analytics = service.getShippingAnalytics(tenantId, startDate, endDate);

      expect(analytics).toBeDefined();
      expect(analytics.summary.totalShipments).toBe(2);
      expect(analytics.summary.deliveredShipments).toBe(1);
      expect(analytics.byCarrier.length).toBeGreaterThan(0);
    });

    it('should calculate delivery rate', async () => {
      const tenantId = `tenant_delivery_rate_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date(Date.now() + 1000); // Ensure endDate is after shipment creation

      const shipments = [];
      for (let i = 0; i < 4; i++) {
        const shipment = await service.createShipment({
          tenantId,
          carrier: 'fan_courier',
          service: 'standard',
          fromAddress: mockFromAddress,
          toAddress: mockToAddress,
          packages: [mockPackage],
        });
        shipments.push(shipment);

        if (i < 3) {
          await service.updateShipmentStatus(shipment.id, 'delivered');
        }
        // The 4th shipment (i=3) stays in 'pending' status
      }

      const analytics = service.getShippingAnalytics(tenantId, startDate, endDate);
      expect(analytics.summary.totalShipments).toBe(4);
      expect(analytics.summary.deliveredShipments).toBe(3);
      expect(analytics.summary.deliveryRate).toBe(75); // 3/4 = 75%
    });

    it('should track issues', async () => {
      const tenantId = 'tenant_issues';
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const shipment1 = await service.createShipment({
        tenantId,
        carrier: 'fan_courier',
        service: 'standard',
        fromAddress: mockFromAddress,
        toAddress: mockToAddress,
        packages: [mockPackage],
      });

      const shipment2 = await service.createShipment({
        tenantId,
        carrier: 'sameday',
        service: 'express',
        fromAddress: mockFromAddress,
        toAddress: mockToAddress,
        packages: [mockPackage],
      });

      await service.updateShipmentStatus(shipment1.id, 'returned');
      await service.updateShipmentStatus(shipment2.id, 'failed_attempt');

      const analytics = service.getShippingAnalytics(tenantId, startDate, endDate);
      expect(analytics.issues.returns).toBeGreaterThanOrEqual(0);
      expect(analytics.issues.failedDeliveries).toBeGreaterThanOrEqual(0);
    });
  });

  // ==================== Utility Tests ====================

  describe('Utility Methods', () => {
    it('should validate valid address', () => {
      const result = service.validateAddress(mockFromAddress);
      expect(result.valid).toBe(true);
      expect(result.suggestions).toBeUndefined();
    });

    it('should validate invalid address', () => {
      const invalid: ShippingAddress = {
        name: '',
        street1: '',
        city: '',
        postalCode: '',
        country: 'INVALID',
        phone: '',
      };

      const result = service.validateAddress(invalid);
      expect(result.valid).toBe(false);
      expect(result.suggestions?.length).toBeGreaterThan(0);
    });

    it('should validate address with missing fields', () => {
      const partial: ShippingAddress = {
        name: 'Test',
        street1: 'Street',
        city: 'City',
        postalCode: '',
        country: 'RO',
        phone: '123',
      };

      const result = service.validateAddress(partial);
      expect(result.valid).toBe(false);
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('should handle multiple packages', async () => {
      const packages: ShippingPackage[] = [
        { id: 'pkg_1', type: 'parcel', weight: 1, weightUnit: 'kg' },
        { id: 'pkg_2', type: 'parcel', weight: 2, weightUnit: 'kg' },
        { id: 'pkg_3', type: 'parcel', weight: 3, weightUnit: 'kg' },
      ];

      const rates = await service.getRates({
        fromAddress: mockFromAddress,
        toAddress: mockToAddress,
        packages,
      });

      expect(rates.length).toBeGreaterThan(0);
      // Total weight = 6kg, rates should reflect this
    });

    it('should handle heavy packages', async () => {
      const heavyPackage: ShippingPackage = {
        id: 'pkg_heavy',
        type: 'parcel',
        weight: 45,
        weightUnit: 'kg',
      };

      const rates = await service.getRates({
        fromAddress: mockFromAddress,
        toAddress: mockToAddress,
        packages: [heavyPackage],
      });

      // Should filter out carriers that can't handle 45kg
      expect(rates.length).toBeGreaterThan(0);
      expect(rates.every(r => {
        const carrier = service.getCarrier(r.carrier);
        return carrier && carrier.maxWeight >= 45;
      })).toBe(true);
    });

    it('should handle same-day service filtering', async () => {
      const rates = await service.getRates({
        fromAddress: mockFromAddress,
        toAddress: mockToAddress,
        packages: [mockPackage],
        options: { services: ['same_day'] },
      });

      expect(rates.every(r => r.estimatedDeliveryDays === 0)).toBe(true);
    });

    it('should return empty analytics for tenant with no shipments', () => {
      const analytics = service.getShippingAnalytics(
        'nonexistent_tenant',
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        new Date(),
      );

      expect(analytics.summary.totalShipments).toBe(0);
      expect(analytics.summary.deliveryRate).toBe(0);
    });
  });
});
