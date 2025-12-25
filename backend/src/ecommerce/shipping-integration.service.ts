import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';

// ==================== Types & Interfaces ====================

// Shipping Carriers
export type ShippingCarrier =
  | 'fan_courier' | 'cargus' | 'sameday' | 'dpd_ro' | 'gls_ro'    // Romanian
  | 'dhl' | 'ups' | 'fedex' | 'tnt' | 'dpd_eu'                     // International
  | 'post_ro' | 'posta_romana'                                     // Postal
  | 'glovo' | 'tazz' | 'bolt_delivery'                             // Same-day/Express
  | 'packeta' | 'speedy' | 'econt';                                // Regional EU

export type ShipmentStatus =
  | 'draft' | 'pending' | 'label_created' | 'pickup_scheduled'
  | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered'
  | 'failed_attempt' | 'returned' | 'cancelled' | 'exception';

export type ServiceType = 'standard' | 'express' | 'same_day' | 'next_day' | 'economy' | 'freight';

export type PackageType = 'parcel' | 'envelope' | 'pallet' | 'freight' | 'custom';

export type LabelFormat = 'pdf' | 'zpl' | 'png' | 'epl';

// Carrier Information
export interface CarrierInfo {
  id: ShippingCarrier;
  name: string;
  country: string;
  logo?: string;
  trackingUrl: string;
  supportedServices: ServiceType[];
  supportedCountries: string[];
  maxWeight: number; // kg
  maxDimensions: { length: number; width: number; height: number }; // cm
  features: {
    cashOnDelivery: boolean;
    insurance: boolean;
    signatureRequired: boolean;
    saturdayDelivery: boolean;
    returnLabel: boolean;
    pickupService: boolean;
    lockerDelivery: boolean;
    fragileHandling: boolean;
  };
  averageDeliveryDays: { domestic: number; international: number };
  cutoffTime: string; // HH:MM format
  pricing: {
    baseRate: number;
    perKg: number;
    fuelSurcharge: number;
    currency: string;
  };
  apiEndpoint?: string;
  isActive: boolean;
}

// Address
export interface ShippingAddress {
  name: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone: string;
  email?: string;
  isResidential?: boolean;
  instructions?: string;
}

// Package Dimensions
export interface PackageDimensions {
  length: number;
  width: number;
  height: number;
  unit: 'cm' | 'in';
}

// Package
export interface ShippingPackage {
  id: string;
  type: PackageType;
  weight: number;
  weightUnit: 'kg' | 'lb';
  dimensions?: PackageDimensions;
  declaredValue?: number;
  currency?: string;
  contents?: string;
  isFragile?: boolean;
  requiresRefrigeration?: boolean;
}

// Rate Quote
export interface RateQuote {
  id: string;
  carrier: ShippingCarrier;
  service: ServiceType;
  serviceName: string;
  estimatedDeliveryDays: number;
  estimatedDeliveryDate: Date;
  rates: {
    baseRate: number;
    fuelSurcharge: number;
    insuranceFee: number;
    codFee: number;
    additionalFees: { name: string; amount: number }[];
    totalRate: number;
    currency: string;
  };
  guaranteedDelivery: boolean;
  trackingIncluded: boolean;
  insuranceIncluded: boolean;
  validUntil: Date;
}

// Shipment
export interface Shipment {
  id: string;
  tenantId: string;
  orderId?: string;
  carrier: ShippingCarrier;
  service: ServiceType;
  status: ShipmentStatus;
  trackingNumber?: string;
  trackingUrl?: string;
  labelUrl?: string;
  labelFormat?: LabelFormat;
  fromAddress: ShippingAddress;
  toAddress: ShippingAddress;
  packages: ShippingPackage[];
  options: {
    cashOnDelivery?: { amount: number; currency: string };
    insurance?: { amount: number; currency: string };
    signatureRequired?: boolean;
    saturdayDelivery?: boolean;
    fragileHandling?: boolean;
    returnLabel?: boolean;
    declaredValue?: number;
    reference?: string;
    notes?: string;
  };
  rates: RateQuote['rates'];
  timeline: ShipmentEvent[];
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  pickupDate?: Date;
  pickupWindow?: { start: Date; end: Date };
  returnShipmentId?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Shipment Event
export interface ShipmentEvent {
  id: string;
  timestamp: Date;
  status: ShipmentStatus;
  location?: string;
  description: string;
  carrierCode?: string;
  signedBy?: string;
}

// Pickup Request
export interface PickupRequest {
  id: string;
  tenantId: string;
  carrier: ShippingCarrier;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  pickupDate: Date;
  pickupWindow: { start: string; end: string };
  address: ShippingAddress;
  shipmentIds: string[];
  totalPackages: number;
  totalWeight: number;
  confirmationNumber?: string;
  instructions?: string;
  createdAt: Date;
}

// Return Label
export interface ReturnLabel {
  id: string;
  shipmentId: string;
  carrier: ShippingCarrier;
  trackingNumber: string;
  labelUrl: string;
  labelFormat: LabelFormat;
  expiresAt: Date;
  createdAt: Date;
}

// Shipping Zone
export interface ShippingZone {
  id: string;
  tenantId: string;
  name: string;
  countries: string[];
  regions?: string[];
  postalCodeRanges?: { from: string; to: string }[];
  carriers: ShippingCarrier[];
  defaultCarrier: ShippingCarrier;
  rates: {
    carrier: ShippingCarrier;
    service: ServiceType;
    baseRate: number;
    perKgRate: number;
    freeShippingThreshold?: number;
  }[];
  isActive: boolean;
  createdAt: Date;
}

// Shipping Rule
export interface ShippingRule {
  id: string;
  tenantId: string;
  name: string;
  priority: number;
  conditions: {
    field: 'weight' | 'value' | 'country' | 'category' | 'sku';
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in';
    value: any;
  }[];
  action: {
    type: 'set_carrier' | 'add_fee' | 'discount' | 'free_shipping' | 'block';
    carrier?: ShippingCarrier;
    service?: ServiceType;
    amount?: number;
    percentage?: number;
    message?: string;
  };
  isActive: boolean;
  createdAt: Date;
}

// Locker Location
export interface LockerLocation {
  id: string;
  carrier: ShippingCarrier;
  name: string;
  address: ShippingAddress;
  coordinates: { lat: number; lng: number };
  type: 'locker' | 'pickup_point' | 'post_office' | 'partner_store';
  openingHours: { day: string; open: string; close: string }[];
  availableSlots?: number;
  maxPackageSize?: 'small' | 'medium' | 'large' | 'xlarge';
  isActive: boolean;
}

// Shipping Analytics
export interface ShippingAnalytics {
  tenantId: string;
  period: { start: Date; end: Date };
  summary: {
    totalShipments: number;
    deliveredShipments: number;
    inTransitShipments: number;
    returnedShipments: number;
    deliveryRate: number;
    averageDeliveryDays: number;
    totalShippingCost: number;
  };
  byCarrier: {
    carrier: ShippingCarrier;
    shipments: number;
    deliveryRate: number;
    avgDeliveryDays: number;
    totalCost: number;
    avgCostPerShipment: number;
  }[];
  byCountry: {
    country: string;
    shipments: number;
    deliveryRate: number;
    avgDeliveryDays: number;
  }[];
  byService: {
    service: ServiceType;
    shipments: number;
    avgDeliveryDays: number;
    totalCost: number;
  }[];
  issues: {
    failedDeliveries: number;
    returns: number;
    exceptions: number;
    lateDeliveries: number;
  };
}

@Injectable()
export class ShippingIntegrationService {
  private readonly logger = new Logger(ShippingIntegrationService.name);

  // In-memory stores
  private carriers: Map<ShippingCarrier, CarrierInfo> = new Map();
  private shipments: Map<string, Shipment> = new Map();
  private rateQuotes: Map<string, RateQuote[]> = new Map();
  private pickupRequests: Map<string, PickupRequest> = new Map();
  private returnLabels: Map<string, ReturnLabel> = new Map();
  private shippingZones: Map<string, ShippingZone> = new Map();
  private shippingRules: Map<string, ShippingRule> = new Map();
  private lockerLocations: Map<string, LockerLocation> = new Map();

  constructor() {
    this.initializeCarriers();
    this.initializeLockerLocations();
  }

  private initializeCarriers(): void {
    const carrierList: CarrierInfo[] = [
      // Romanian Carriers
      {
        id: 'fan_courier',
        name: 'FAN Courier',
        country: 'RO',
        trackingUrl: 'https://www.fancourier.ro/awb-tracking/?tracking=',
        supportedServices: ['standard', 'express', 'same_day', 'next_day'],
        supportedCountries: ['RO', 'MD'],
        maxWeight: 50,
        maxDimensions: { length: 150, width: 80, height: 80 },
        features: {
          cashOnDelivery: true,
          insurance: true,
          signatureRequired: true,
          saturdayDelivery: true,
          returnLabel: true,
          pickupService: true,
          lockerDelivery: true,
          fragileHandling: true,
        },
        averageDeliveryDays: { domestic: 1, international: 3 },
        cutoffTime: '18:00',
        pricing: { baseRate: 15, perKg: 2, fuelSurcharge: 0.12, currency: 'RON' },
        isActive: true,
      },
      {
        id: 'cargus',
        name: 'Cargus',
        country: 'RO',
        trackingUrl: 'https://www.cargus.ro/tracking/?t=',
        supportedServices: ['standard', 'express', 'next_day'],
        supportedCountries: ['RO'],
        maxWeight: 50,
        maxDimensions: { length: 150, width: 80, height: 80 },
        features: {
          cashOnDelivery: true,
          insurance: true,
          signatureRequired: true,
          saturdayDelivery: false,
          returnLabel: true,
          pickupService: true,
          lockerDelivery: false,
          fragileHandling: true,
        },
        averageDeliveryDays: { domestic: 2, international: 5 },
        cutoffTime: '17:00',
        pricing: { baseRate: 14, perKg: 1.8, fuelSurcharge: 0.10, currency: 'RON' },
        isActive: true,
      },
      {
        id: 'sameday',
        name: 'Sameday',
        country: 'RO',
        trackingUrl: 'https://www.sameday.ro/tracking?awb=',
        supportedServices: ['standard', 'express', 'same_day', 'next_day'],
        supportedCountries: ['RO', 'BG', 'HU'],
        maxWeight: 31,
        maxDimensions: { length: 120, width: 60, height: 60 },
        features: {
          cashOnDelivery: true,
          insurance: true,
          signatureRequired: true,
          saturdayDelivery: true,
          returnLabel: true,
          pickupService: true,
          lockerDelivery: true,
          fragileHandling: true,
        },
        averageDeliveryDays: { domestic: 1, international: 2 },
        cutoffTime: '19:00',
        pricing: { baseRate: 16, perKg: 2.2, fuelSurcharge: 0.15, currency: 'RON' },
        isActive: true,
      },
      {
        id: 'dpd_ro',
        name: 'DPD Romania',
        country: 'RO',
        trackingUrl: 'https://www.dpd.ro/tracking?parcelno=',
        supportedServices: ['standard', 'express', 'next_day'],
        supportedCountries: ['RO', 'EU'],
        maxWeight: 50,
        maxDimensions: { length: 175, width: 80, height: 80 },
        features: {
          cashOnDelivery: true,
          insurance: true,
          signatureRequired: true,
          saturdayDelivery: false,
          returnLabel: true,
          pickupService: true,
          lockerDelivery: true,
          fragileHandling: true,
        },
        averageDeliveryDays: { domestic: 2, international: 4 },
        cutoffTime: '17:30',
        pricing: { baseRate: 18, perKg: 2.5, fuelSurcharge: 0.14, currency: 'RON' },
        isActive: true,
      },
      {
        id: 'gls_ro',
        name: 'GLS Romania',
        country: 'RO',
        trackingUrl: 'https://gls-group.eu/RO/ro/urmarire-colet?match=',
        supportedServices: ['standard', 'express'],
        supportedCountries: ['RO', 'EU'],
        maxWeight: 40,
        maxDimensions: { length: 150, width: 80, height: 80 },
        features: {
          cashOnDelivery: true,
          insurance: true,
          signatureRequired: true,
          saturdayDelivery: false,
          returnLabel: true,
          pickupService: true,
          lockerDelivery: false,
          fragileHandling: true,
        },
        averageDeliveryDays: { domestic: 2, international: 4 },
        cutoffTime: '17:00',
        pricing: { baseRate: 17, perKg: 2.3, fuelSurcharge: 0.12, currency: 'RON' },
        isActive: true,
      },
      // International Carriers
      {
        id: 'dhl',
        name: 'DHL Express',
        country: 'DE',
        trackingUrl: 'https://www.dhl.com/en/express/tracking.html?AWB=',
        supportedServices: ['express', 'same_day', 'next_day', 'economy'],
        supportedCountries: ['*'], // Global
        maxWeight: 70,
        maxDimensions: { length: 120, width: 80, height: 80 },
        features: {
          cashOnDelivery: false,
          insurance: true,
          signatureRequired: true,
          saturdayDelivery: true,
          returnLabel: true,
          pickupService: true,
          lockerDelivery: false,
          fragileHandling: true,
        },
        averageDeliveryDays: { domestic: 1, international: 3 },
        cutoffTime: '18:00',
        pricing: { baseRate: 45, perKg: 5, fuelSurcharge: 0.25, currency: 'EUR' },
        isActive: true,
      },
      {
        id: 'ups',
        name: 'UPS',
        country: 'US',
        trackingUrl: 'https://www.ups.com/track?tracknum=',
        supportedServices: ['standard', 'express', 'next_day', 'economy', 'freight'],
        supportedCountries: ['*'],
        maxWeight: 70,
        maxDimensions: { length: 274, width: 130, height: 130 },
        features: {
          cashOnDelivery: true,
          insurance: true,
          signatureRequired: true,
          saturdayDelivery: true,
          returnLabel: true,
          pickupService: true,
          lockerDelivery: true,
          fragileHandling: true,
        },
        averageDeliveryDays: { domestic: 2, international: 4 },
        cutoffTime: '19:00',
        pricing: { baseRate: 40, perKg: 4.5, fuelSurcharge: 0.22, currency: 'EUR' },
        isActive: true,
      },
      {
        id: 'fedex',
        name: 'FedEx',
        country: 'US',
        trackingUrl: 'https://www.fedex.com/fedextrack/?trknbr=',
        supportedServices: ['standard', 'express', 'same_day', 'next_day', 'economy', 'freight'],
        supportedCountries: ['*'],
        maxWeight: 68,
        maxDimensions: { length: 274, width: 119, height: 119 },
        features: {
          cashOnDelivery: false,
          insurance: true,
          signatureRequired: true,
          saturdayDelivery: true,
          returnLabel: true,
          pickupService: true,
          lockerDelivery: true,
          fragileHandling: true,
        },
        averageDeliveryDays: { domestic: 2, international: 3 },
        cutoffTime: '18:30',
        pricing: { baseRate: 42, perKg: 4.8, fuelSurcharge: 0.24, currency: 'EUR' },
        isActive: true,
      },
      {
        id: 'tnt',
        name: 'TNT (FedEx)',
        country: 'NL',
        trackingUrl: 'https://www.tnt.com/express/en_us/site/tracking.html?searchType=CON&cons=',
        supportedServices: ['standard', 'express', 'next_day', 'economy'],
        supportedCountries: ['EU', 'US', 'ASIA'],
        maxWeight: 70,
        maxDimensions: { length: 150, width: 80, height: 80 },
        features: {
          cashOnDelivery: false,
          insurance: true,
          signatureRequired: true,
          saturdayDelivery: false,
          returnLabel: true,
          pickupService: true,
          lockerDelivery: false,
          fragileHandling: true,
        },
        averageDeliveryDays: { domestic: 2, international: 4 },
        cutoffTime: '17:00',
        pricing: { baseRate: 38, perKg: 4.2, fuelSurcharge: 0.20, currency: 'EUR' },
        isActive: true,
      },
      {
        id: 'dpd_eu',
        name: 'DPD Europe',
        country: 'DE',
        trackingUrl: 'https://tracking.dpd.de/parcelstatus?query=',
        supportedServices: ['standard', 'express', 'next_day'],
        supportedCountries: ['EU'],
        maxWeight: 50,
        maxDimensions: { length: 175, width: 80, height: 80 },
        features: {
          cashOnDelivery: true,
          insurance: true,
          signatureRequired: true,
          saturdayDelivery: true,
          returnLabel: true,
          pickupService: true,
          lockerDelivery: true,
          fragileHandling: true,
        },
        averageDeliveryDays: { domestic: 1, international: 3 },
        cutoffTime: '18:00',
        pricing: { baseRate: 12, perKg: 2, fuelSurcharge: 0.15, currency: 'EUR' },
        isActive: true,
      },
      // Postal Services
      {
        id: 'posta_romana',
        name: 'Posta Romana',
        country: 'RO',
        trackingUrl: 'https://www.posta-romana.ro/track-trace.html?id=',
        supportedServices: ['standard', 'economy'],
        supportedCountries: ['RO', '*'],
        maxWeight: 30,
        maxDimensions: { length: 150, width: 60, height: 60 },
        features: {
          cashOnDelivery: true,
          insurance: true,
          signatureRequired: false,
          saturdayDelivery: false,
          returnLabel: true,
          pickupService: false,
          lockerDelivery: false,
          fragileHandling: false,
        },
        averageDeliveryDays: { domestic: 5, international: 14 },
        cutoffTime: '14:00',
        pricing: { baseRate: 8, perKg: 1, fuelSurcharge: 0, currency: 'RON' },
        isActive: true,
      },
      // Same-day / Express Delivery
      {
        id: 'glovo',
        name: 'Glovo Express',
        country: 'RO',
        trackingUrl: 'https://glovoapp.com/track/',
        supportedServices: ['same_day', 'express'],
        supportedCountries: ['RO', 'ES', 'IT', 'PL'],
        maxWeight: 9,
        maxDimensions: { length: 45, width: 45, height: 45 },
        features: {
          cashOnDelivery: true,
          insurance: true,
          signatureRequired: false,
          saturdayDelivery: true,
          returnLabel: false,
          pickupService: true,
          lockerDelivery: false,
          fragileHandling: true,
        },
        averageDeliveryDays: { domestic: 0, international: 1 },
        cutoffTime: '22:00',
        pricing: { baseRate: 25, perKg: 3, fuelSurcharge: 0.10, currency: 'RON' },
        isActive: true,
      },
      {
        id: 'tazz',
        name: 'Tazz by eMAG',
        country: 'RO',
        trackingUrl: 'https://tazz.ro/track/',
        supportedServices: ['same_day', 'express'],
        supportedCountries: ['RO'],
        maxWeight: 15,
        maxDimensions: { length: 50, width: 50, height: 50 },
        features: {
          cashOnDelivery: true,
          insurance: true,
          signatureRequired: false,
          saturdayDelivery: true,
          returnLabel: false,
          pickupService: true,
          lockerDelivery: false,
          fragileHandling: true,
        },
        averageDeliveryDays: { domestic: 0, international: 0 },
        cutoffTime: '21:00',
        pricing: { baseRate: 20, perKg: 2.5, fuelSurcharge: 0.08, currency: 'RON' },
        isActive: true,
      },
      // Regional EU Carriers
      {
        id: 'packeta',
        name: 'Packeta (Zásilkovna)',
        country: 'CZ',
        trackingUrl: 'https://tracking.packeta.com/en/?id=',
        supportedServices: ['standard', 'economy'],
        supportedCountries: ['CZ', 'SK', 'HU', 'PL', 'RO'],
        maxWeight: 10,
        maxDimensions: { length: 120, width: 60, height: 60 },
        features: {
          cashOnDelivery: true,
          insurance: true,
          signatureRequired: false,
          saturdayDelivery: false,
          returnLabel: true,
          pickupService: false,
          lockerDelivery: true,
          fragileHandling: false,
        },
        averageDeliveryDays: { domestic: 2, international: 4 },
        cutoffTime: '16:00',
        pricing: { baseRate: 10, perKg: 1.5, fuelSurcharge: 0.08, currency: 'EUR' },
        isActive: true,
      },
      {
        id: 'speedy',
        name: 'Speedy',
        country: 'BG',
        trackingUrl: 'https://www.speedy.bg/en/track-shipment?shipmentId=',
        supportedServices: ['standard', 'express', 'next_day'],
        supportedCountries: ['BG', 'RO', 'GR'],
        maxWeight: 50,
        maxDimensions: { length: 150, width: 80, height: 80 },
        features: {
          cashOnDelivery: true,
          insurance: true,
          signatureRequired: true,
          saturdayDelivery: true,
          returnLabel: true,
          pickupService: true,
          lockerDelivery: true,
          fragileHandling: true,
        },
        averageDeliveryDays: { domestic: 1, international: 2 },
        cutoffTime: '18:00',
        pricing: { baseRate: 12, perKg: 1.8, fuelSurcharge: 0.10, currency: 'BGN' },
        isActive: true,
      },
      {
        id: 'econt',
        name: 'Econt Express',
        country: 'BG',
        trackingUrl: 'https://www.econt.com/services/track-shipment/?shipmentNumber=',
        supportedServices: ['standard', 'express', 'same_day'],
        supportedCountries: ['BG', 'RO', 'GR', 'MK'],
        maxWeight: 50,
        maxDimensions: { length: 150, width: 80, height: 80 },
        features: {
          cashOnDelivery: true,
          insurance: true,
          signatureRequired: true,
          saturdayDelivery: true,
          returnLabel: true,
          pickupService: true,
          lockerDelivery: true,
          fragileHandling: true,
        },
        averageDeliveryDays: { domestic: 1, international: 2 },
        cutoffTime: '18:30',
        pricing: { baseRate: 10, perKg: 1.5, fuelSurcharge: 0.08, currency: 'BGN' },
        isActive: true,
      },
    ];

    carrierList.forEach(c => this.carriers.set(c.id, c));
    this.logger.log(`Initialized ${this.carriers.size} shipping carriers`);
  }

  private initializeLockerLocations(): void {
    // Sample locker locations in major Romanian cities
    const locations: LockerLocation[] = [
      {
        id: 'locker_buc_001',
        carrier: 'sameday',
        name: 'Sameday Easybox - AFI Cotroceni',
        address: {
          name: 'AFI Cotroceni',
          street1: 'Bd. Vasile Milea 4',
          city: 'Bucuresti',
          postalCode: '061344',
          country: 'RO',
          phone: '',
        },
        coordinates: { lat: 44.4324, lng: 26.0524 },
        type: 'locker',
        openingHours: [
          { day: 'Mon-Sun', open: '08:00', close: '22:00' },
        ],
        availableSlots: 45,
        maxPackageSize: 'large',
        isActive: true,
      },
      {
        id: 'locker_buc_002',
        carrier: 'fan_courier',
        name: 'FAN Courier Locker - Unirii',
        address: {
          name: 'Unirea Shopping Center',
          street1: 'Piata Unirii 1',
          city: 'Bucuresti',
          postalCode: '030167',
          country: 'RO',
          phone: '',
        },
        coordinates: { lat: 44.4268, lng: 26.1025 },
        type: 'locker',
        openingHours: [
          { day: 'Mon-Sun', open: '10:00', close: '22:00' },
        ],
        availableSlots: 30,
        maxPackageSize: 'medium',
        isActive: true,
      },
      {
        id: 'locker_cj_001',
        carrier: 'sameday',
        name: 'Sameday Easybox - Iulius Mall Cluj',
        address: {
          name: 'Iulius Mall',
          street1: 'Str. Alexandru Vaida Voevod 53B',
          city: 'Cluj-Napoca',
          postalCode: '400436',
          country: 'RO',
          phone: '',
        },
        coordinates: { lat: 46.7712, lng: 23.6236 },
        type: 'locker',
        openingHours: [
          { day: 'Mon-Sun', open: '10:00', close: '22:00' },
        ],
        availableSlots: 35,
        maxPackageSize: 'large',
        isActive: true,
      },
    ];

    locations.forEach(l => this.lockerLocations.set(l.id, l));
    this.logger.log(`Initialized ${this.lockerLocations.size} locker locations`);
  }

  // ==================== Carrier Management ====================

  getCarriers(): CarrierInfo[] {
    return Array.from(this.carriers.values());
  }

  getCarrier(carrierId: ShippingCarrier): CarrierInfo | undefined {
    return this.carriers.get(carrierId);
  }

  getRomanianCarriers(): CarrierInfo[] {
    return Array.from(this.carriers.values()).filter(c => c.country === 'RO');
  }

  getInternationalCarriers(): CarrierInfo[] {
    return Array.from(this.carriers.values()).filter(c =>
      c.supportedCountries.includes('*') || c.supportedCountries.includes('EU')
    );
  }

  getCarriersByCountry(country: string): CarrierInfo[] {
    return Array.from(this.carriers.values()).filter(c =>
      c.supportedCountries.includes(country) || c.supportedCountries.includes('*')
    );
  }

  getCarriersByService(service: ServiceType): CarrierInfo[] {
    return Array.from(this.carriers.values()).filter(c =>
      c.supportedServices.includes(service)
    );
  }

  // ==================== Rate Calculation ====================

  async getRates(params: {
    fromAddress: ShippingAddress;
    toAddress: ShippingAddress;
    packages: ShippingPackage[];
    options?: {
      carriers?: ShippingCarrier[];
      services?: ServiceType[];
      cashOnDelivery?: number;
      insurance?: number;
    };
  }): Promise<RateQuote[]> {
    const { fromAddress, toAddress, packages, options } = params;

    const totalWeight = packages.reduce((sum, p) => sum + p.weight, 0);
    const declaredValue = packages.reduce((sum, p) => sum + (p.declaredValue || 0), 0);

    let carriers = Array.from(this.carriers.values()).filter(c => c.isActive);

    // Filter by specified carriers
    if (options?.carriers?.length) {
      carriers = carriers.filter(c => options.carriers!.includes(c.id));
    }

    // Filter by destination country
    carriers = carriers.filter(c =>
      c.supportedCountries.includes(toAddress.country) ||
      c.supportedCountries.includes('*') ||
      (c.supportedCountries.includes('EU') && this.isEUCountry(toAddress.country))
    );

    // Filter by weight
    carriers = carriers.filter(c => totalWeight <= c.maxWeight);

    const quotes: RateQuote[] = [];
    const quoteId = `quote_${Date.now()}`;

    for (const carrier of carriers) {
      let services = carrier.supportedServices;

      if (options?.services?.length) {
        services = services.filter(s => options.services!.includes(s));
      }

      for (const service of services) {
        const rate = this.calculateRate(carrier, service, totalWeight, fromAddress, toAddress, options);

        const estimatedDays = this.getEstimatedDeliveryDays(carrier, service, fromAddress.country, toAddress.country);
        const estimatedDate = new Date();
        estimatedDate.setDate(estimatedDate.getDate() + estimatedDays);

        quotes.push({
          id: `${quoteId}_${carrier.id}_${service}`,
          carrier: carrier.id,
          service,
          serviceName: this.getServiceName(service),
          estimatedDeliveryDays: estimatedDays,
          estimatedDeliveryDate: estimatedDate,
          rates: rate,
          guaranteedDelivery: service === 'express' || service === 'same_day',
          trackingIncluded: true,
          insuranceIncluded: (options?.insurance || 0) > 0,
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
      }
    }

    // Sort by total rate
    quotes.sort((a, b) => a.rates.totalRate - b.rates.totalRate);

    // Store quotes for later use
    this.rateQuotes.set(quoteId, quotes);

    this.logger.log(`Generated ${quotes.length} rate quotes`);

    return quotes;
  }

  private calculateRate(
    carrier: CarrierInfo,
    service: ServiceType,
    weight: number,
    fromAddress: ShippingAddress,
    toAddress: ShippingAddress,
    options?: { cashOnDelivery?: number; insurance?: number },
  ): RateQuote['rates'] {
    const isInternational = fromAddress.country !== toAddress.country;
    let baseRate = carrier.pricing.baseRate;

    // Service multiplier
    const serviceMultipliers: Record<ServiceType, number> = {
      economy: 0.8,
      standard: 1.0,
      express: 1.5,
      next_day: 1.8,
      same_day: 2.5,
      freight: 2.0,
    };

    baseRate *= serviceMultipliers[service] || 1.0;

    // International surcharge
    if (isInternational) {
      baseRate *= 2.5;
    }

    // Weight-based rate
    const weightRate = Math.max(0, weight - 1) * carrier.pricing.perKg;

    // Fuel surcharge
    const fuelSurcharge = (baseRate + weightRate) * carrier.pricing.fuelSurcharge;

    // COD fee
    const codFee = options?.cashOnDelivery ? Math.max(5, options.cashOnDelivery * 0.02) : 0;

    // Insurance fee
    const insuranceFee = options?.insurance ? Math.max(2, options.insurance * 0.01) : 0;

    const additionalFees: { name: string; amount: number }[] = [];

    if (isInternational) {
      additionalFees.push({ name: 'International handling', amount: 5 });
    }

    const additionalTotal = additionalFees.reduce((sum, f) => sum + f.amount, 0);
    const totalRate = baseRate + weightRate + fuelSurcharge + codFee + insuranceFee + additionalTotal;

    return {
      baseRate: Math.round(baseRate * 100) / 100,
      fuelSurcharge: Math.round(fuelSurcharge * 100) / 100,
      insuranceFee: Math.round(insuranceFee * 100) / 100,
      codFee: Math.round(codFee * 100) / 100,
      additionalFees,
      totalRate: Math.round(totalRate * 100) / 100,
      currency: carrier.pricing.currency,
    };
  }

  private getEstimatedDeliveryDays(
    carrier: CarrierInfo,
    service: ServiceType,
    fromCountry: string,
    toCountry: string,
  ): number {
    const isInternational = fromCountry !== toCountry;
    let baseDays = isInternational ? carrier.averageDeliveryDays.international : carrier.averageDeliveryDays.domestic;

    const serviceModifiers: Record<ServiceType, number> = {
      same_day: 0,
      next_day: 1,
      express: Math.ceil(baseDays * 0.7),
      standard: baseDays,
      economy: Math.ceil(baseDays * 1.5),
      freight: Math.ceil(baseDays * 2),
    };

    return Math.max(0, serviceModifiers[service]);
  }

  private getServiceName(service: ServiceType): string {
    const names: Record<ServiceType, string> = {
      same_day: 'Same Day Delivery',
      next_day: 'Next Day Delivery',
      express: 'Express Shipping',
      standard: 'Standard Shipping',
      economy: 'Economy Shipping',
      freight: 'Freight Shipping',
    };
    return names[service];
  }

  private isEUCountry(country: string): boolean {
    const euCountries = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'];
    return euCountries.includes(country);
  }

  // ==================== Shipment Management ====================

  async createShipment(params: {
    tenantId: string;
    orderId?: string;
    carrier: ShippingCarrier;
    service: ServiceType;
    fromAddress: ShippingAddress;
    toAddress: ShippingAddress;
    packages: ShippingPackage[];
    options?: Shipment['options'];
  }): Promise<Shipment> {
    const carrier = this.carriers.get(params.carrier);
    if (!carrier) {
      throw new BadRequestException(`Carrier ${params.carrier} not found`);
    }

    const rates = this.calculateRate(
      carrier,
      params.service,
      params.packages.reduce((sum, p) => sum + p.weight, 0),
      params.fromAddress,
      params.toAddress,
      {
        cashOnDelivery: params.options?.cashOnDelivery?.amount,
        insurance: params.options?.insurance?.amount,
      },
    );

    const id = `ship_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const estimatedDays = this.getEstimatedDeliveryDays(
      carrier,
      params.service,
      params.fromAddress.country,
      params.toAddress.country,
    );
    const estimatedDeliveryDate = new Date();
    estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + estimatedDays);

    const shipment: Shipment = {
      id,
      tenantId: params.tenantId,
      orderId: params.orderId,
      carrier: params.carrier,
      service: params.service,
      status: 'draft',
      fromAddress: params.fromAddress,
      toAddress: params.toAddress,
      packages: params.packages.map((p, i) => ({
        ...p,
        id: `pkg_${id}_${i}`,
      })),
      options: params.options || {},
      rates,
      timeline: [{
        id: `evt_${Date.now()}`,
        timestamp: now,
        status: 'draft',
        description: 'Shipment created',
      }],
      estimatedDeliveryDate,
      metadata: {},
      createdAt: now,
      updatedAt: now,
    };

    this.shipments.set(id, shipment);
    this.logger.log(`Created shipment ${id}`);

    return shipment;
  }

  getShipment(shipmentId: string): Shipment | undefined {
    return this.shipments.get(shipmentId);
  }

  getShipmentsByTenant(tenantId: string): Shipment[] {
    return Array.from(this.shipments.values())
      .filter(s => s.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getShipmentsByOrder(orderId: string): Shipment[] {
    return Array.from(this.shipments.values())
      .filter(s => s.orderId === orderId);
  }

  getShipmentsByStatus(tenantId: string, status: ShipmentStatus): Shipment[] {
    return this.getShipmentsByTenant(tenantId).filter(s => s.status === status);
  }

  async updateShipmentStatus(shipmentId: string, status: ShipmentStatus, details?: {
    location?: string;
    description?: string;
    signedBy?: string;
  }): Promise<Shipment> {
    const shipment = this.shipments.get(shipmentId);
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    shipment.status = status;
    shipment.updatedAt = new Date();

    const event: ShipmentEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date(),
      status,
      location: details?.location,
      description: details?.description || this.getStatusDescription(status),
      signedBy: details?.signedBy,
    };

    shipment.timeline.push(event);

    if (status === 'delivered') {
      shipment.actualDeliveryDate = new Date();
    }

    this.shipments.set(shipmentId, shipment);
    this.logger.log(`Updated shipment ${shipmentId} status to ${status}`);

    return shipment;
  }

  private getStatusDescription(status: ShipmentStatus): string {
    const descriptions: Record<ShipmentStatus, string> = {
      draft: 'Shipment created',
      pending: 'Shipment pending processing',
      label_created: 'Shipping label created',
      pickup_scheduled: 'Pickup scheduled',
      picked_up: 'Package picked up by carrier',
      in_transit: 'Package in transit',
      out_for_delivery: 'Package out for delivery',
      delivered: 'Package delivered',
      failed_attempt: 'Delivery attempt failed',
      returned: 'Package returned to sender',
      cancelled: 'Shipment cancelled',
      exception: 'Shipment exception occurred',
    };
    return descriptions[status];
  }

  // ==================== Label Generation ====================

  async createLabel(shipmentId: string, format: LabelFormat = 'pdf'): Promise<{ labelUrl: string; trackingNumber: string }> {
    const shipment = this.shipments.get(shipmentId);
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    if (shipment.status !== 'draft' && shipment.status !== 'pending') {
      throw new BadRequestException('Label can only be created for draft or pending shipments');
    }

    // Generate tracking number
    const trackingNumber = this.generateTrackingNumber(shipment.carrier);
    const carrier = this.carriers.get(shipment.carrier)!;

    // Simulate label URL
    const labelUrl = `https://labels.documentiulia.ro/${shipment.carrier}/${trackingNumber}.${format}`;
    const trackingUrl = carrier.trackingUrl + trackingNumber;

    shipment.trackingNumber = trackingNumber;
    shipment.trackingUrl = trackingUrl;
    shipment.labelUrl = labelUrl;
    shipment.labelFormat = format;
    shipment.status = 'label_created';
    shipment.updatedAt = new Date();

    shipment.timeline.push({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      status: 'label_created',
      description: `Shipping label created (${format.toUpperCase()})`,
    });

    this.shipments.set(shipmentId, shipment);
    this.logger.log(`Created label for shipment ${shipmentId}: ${trackingNumber}`);

    return { labelUrl, trackingNumber };
  }

  private generateTrackingNumber(carrier: ShippingCarrier): string {
    const prefixes: Record<ShippingCarrier, string> = {
      fan_courier: 'FC',
      cargus: 'CG',
      sameday: 'SD',
      dpd_ro: 'DPD',
      gls_ro: 'GLS',
      dhl: 'DHL',
      ups: '1Z',
      fedex: 'FX',
      tnt: 'TNT',
      dpd_eu: 'DPD',
      post_ro: 'PR',
      posta_romana: 'RR',
      glovo: 'GLV',
      tazz: 'TZZ',
      bolt_delivery: 'BLT',
      packeta: 'PKT',
      speedy: 'SPD',
      econt: 'ECN',
    };

    const prefix = prefixes[carrier] || 'TRK';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();

    return `${prefix}${timestamp}${random}`;
  }

  // ==================== Tracking ====================

  async trackShipment(trackingNumber: string): Promise<ShipmentEvent[]> {
    const shipment = Array.from(this.shipments.values())
      .find(s => s.trackingNumber === trackingNumber);

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    return shipment.timeline;
  }

  async trackByCarrier(carrier: ShippingCarrier, trackingNumber: string): Promise<{ trackingUrl: string; events: ShipmentEvent[] }> {
    const carrierInfo = this.carriers.get(carrier);
    if (!carrierInfo) {
      throw new BadRequestException('Carrier not found');
    }

    const shipment = Array.from(this.shipments.values())
      .find(s => s.carrier === carrier && s.trackingNumber === trackingNumber);

    const trackingUrl = carrierInfo.trackingUrl + trackingNumber;

    return {
      trackingUrl,
      events: shipment?.timeline || [],
    };
  }

  // ==================== Pickup Management ====================

  async schedulePickup(params: {
    tenantId: string;
    carrier: ShippingCarrier;
    pickupDate: Date;
    pickupWindow: { start: string; end: string };
    address: ShippingAddress;
    shipmentIds: string[];
    instructions?: string;
  }): Promise<PickupRequest> {
    const carrier = this.carriers.get(params.carrier);
    if (!carrier) {
      throw new BadRequestException('Carrier not found');
    }

    if (!carrier.features.pickupService) {
      throw new BadRequestException('Carrier does not support pickup service');
    }

    const shipments = params.shipmentIds
      .map(id => this.shipments.get(id))
      .filter(s => s !== undefined) as Shipment[];

    if (shipments.length !== params.shipmentIds.length) {
      throw new BadRequestException('One or more shipments not found');
    }

    const totalPackages = shipments.reduce((sum, s) => sum + s.packages.length, 0);
    const totalWeight = shipments.reduce((sum, s) =>
      sum + s.packages.reduce((psum, p) => psum + p.weight, 0), 0
    );

    const id = `pickup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const confirmationNumber = `CONF${Date.now().toString().slice(-8)}`;

    const pickup: PickupRequest = {
      id,
      tenantId: params.tenantId,
      carrier: params.carrier,
      status: 'confirmed',
      pickupDate: params.pickupDate,
      pickupWindow: params.pickupWindow,
      address: params.address,
      shipmentIds: params.shipmentIds,
      totalPackages,
      totalWeight,
      confirmationNumber,
      instructions: params.instructions,
      createdAt: new Date(),
    };

    this.pickupRequests.set(id, pickup);

    // Update shipments
    for (const shipment of shipments) {
      shipment.status = 'pickup_scheduled';
      shipment.pickupDate = params.pickupDate;
      shipment.pickupWindow = {
        start: new Date(`${params.pickupDate.toISOString().split('T')[0]}T${params.pickupWindow.start}`),
        end: new Date(`${params.pickupDate.toISOString().split('T')[0]}T${params.pickupWindow.end}`),
      };
      shipment.timeline.push({
        id: `evt_${Date.now()}`,
        timestamp: new Date(),
        status: 'pickup_scheduled',
        description: `Pickup scheduled for ${params.pickupDate.toLocaleDateString()} ${params.pickupWindow.start}-${params.pickupWindow.end}`,
      });
      this.shipments.set(shipment.id, shipment);
    }

    this.logger.log(`Scheduled pickup ${id} for ${shipments.length} shipments`);

    return pickup;
  }

  getPickupRequest(pickupId: string): PickupRequest | undefined {
    return this.pickupRequests.get(pickupId);
  }

  getPickupsByTenant(tenantId: string): PickupRequest[] {
    return Array.from(this.pickupRequests.values())
      .filter(p => p.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async cancelPickup(pickupId: string): Promise<PickupRequest> {
    const pickup = this.pickupRequests.get(pickupId);
    if (!pickup) {
      throw new NotFoundException('Pickup request not found');
    }

    if (pickup.status === 'completed') {
      throw new BadRequestException('Cannot cancel completed pickup');
    }

    pickup.status = 'cancelled';
    this.pickupRequests.set(pickupId, pickup);

    // Update shipments
    for (const shipmentId of pickup.shipmentIds) {
      const shipment = this.shipments.get(shipmentId);
      if (shipment) {
        shipment.status = 'label_created';
        shipment.pickupDate = undefined;
        shipment.pickupWindow = undefined;
        shipment.timeline.push({
          id: `evt_${Date.now()}`,
          timestamp: new Date(),
          status: 'label_created',
          description: 'Pickup cancelled',
        });
        this.shipments.set(shipmentId, shipment);
      }
    }

    this.logger.log(`Cancelled pickup ${pickupId}`);

    return pickup;
  }

  // ==================== Return Labels ====================

  async createReturnLabel(shipmentId: string): Promise<ReturnLabel> {
    const shipment = this.shipments.get(shipmentId);
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    const carrier = this.carriers.get(shipment.carrier)!;
    if (!carrier.features.returnLabel) {
      throw new BadRequestException('Carrier does not support return labels');
    }

    const id = `return_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const trackingNumber = this.generateTrackingNumber(shipment.carrier);

    const returnLabel: ReturnLabel = {
      id,
      shipmentId,
      carrier: shipment.carrier,
      trackingNumber,
      labelUrl: `https://labels.documentiulia.ro/returns/${shipment.carrier}/${trackingNumber}.pdf`,
      labelFormat: 'pdf',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      createdAt: new Date(),
    };

    this.returnLabels.set(id, returnLabel);
    shipment.returnShipmentId = id;
    this.shipments.set(shipmentId, shipment);

    this.logger.log(`Created return label ${id} for shipment ${shipmentId}`);

    return returnLabel;
  }

  getReturnLabel(returnLabelId: string): ReturnLabel | undefined {
    return this.returnLabels.get(returnLabelId);
  }

  // ==================== Shipping Zones ====================

  async createShippingZone(params: {
    tenantId: string;
    name: string;
    countries: string[];
    regions?: string[];
    postalCodeRanges?: { from: string; to: string }[];
    carriers: ShippingCarrier[];
    defaultCarrier: ShippingCarrier;
    rates: ShippingZone['rates'];
  }): Promise<ShippingZone> {
    const id = `zone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const zone: ShippingZone = {
      id,
      tenantId: params.tenantId,
      name: params.name,
      countries: params.countries,
      regions: params.regions,
      postalCodeRanges: params.postalCodeRanges,
      carriers: params.carriers,
      defaultCarrier: params.defaultCarrier,
      rates: params.rates,
      isActive: true,
      createdAt: new Date(),
    };

    this.shippingZones.set(id, zone);
    this.logger.log(`Created shipping zone ${id}: ${params.name}`);

    return zone;
  }

  getShippingZone(zoneId: string): ShippingZone | undefined {
    return this.shippingZones.get(zoneId);
  }

  getShippingZonesByTenant(tenantId: string): ShippingZone[] {
    return Array.from(this.shippingZones.values())
      .filter(z => z.tenantId === tenantId);
  }

  getZoneForAddress(tenantId: string, address: ShippingAddress): ShippingZone | undefined {
    const zones = this.getShippingZonesByTenant(tenantId).filter(z => z.isActive);

    for (const zone of zones) {
      // Check country
      if (!zone.countries.includes(address.country) && !zone.countries.includes('*')) {
        continue;
      }

      // Check postal code ranges if defined
      if (zone.postalCodeRanges?.length) {
        const inRange = zone.postalCodeRanges.some(range =>
          address.postalCode >= range.from && address.postalCode <= range.to
        );
        if (!inRange) continue;
      }

      return zone;
    }

    return undefined;
  }

  // ==================== Shipping Rules ====================

  async createShippingRule(params: {
    tenantId: string;
    name: string;
    priority: number;
    conditions: ShippingRule['conditions'];
    action: ShippingRule['action'];
  }): Promise<ShippingRule> {
    const id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const rule: ShippingRule = {
      id,
      tenantId: params.tenantId,
      name: params.name,
      priority: params.priority,
      conditions: params.conditions,
      action: params.action,
      isActive: true,
      createdAt: new Date(),
    };

    this.shippingRules.set(id, rule);
    this.logger.log(`Created shipping rule ${id}: ${params.name}`);

    return rule;
  }

  getShippingRule(ruleId: string): ShippingRule | undefined {
    return this.shippingRules.get(ruleId);
  }

  getShippingRulesByTenant(tenantId: string): ShippingRule[] {
    return Array.from(this.shippingRules.values())
      .filter(r => r.tenantId === tenantId)
      .sort((a, b) => a.priority - b.priority);
  }

  evaluateRules(tenantId: string, context: {
    weight?: number;
    value?: number;
    country?: string;
    category?: string;
    sku?: string;
  }): ShippingRule['action'][] {
    const rules = this.getShippingRulesByTenant(tenantId).filter(r => r.isActive);
    const applicableActions: ShippingRule['action'][] = [];

    for (const rule of rules) {
      if (this.evaluateConditions(rule.conditions, context)) {
        applicableActions.push(rule.action);
      }
    }

    return applicableActions;
  }

  private evaluateConditions(
    conditions: ShippingRule['conditions'],
    context: Record<string, any>,
  ): boolean {
    return conditions.every(condition => {
      const value = context[condition.field];
      if (value === undefined) return false;

      switch (condition.operator) {
        case 'eq': return value === condition.value;
        case 'ne': return value !== condition.value;
        case 'gt': return value > condition.value;
        case 'lt': return value < condition.value;
        case 'gte': return value >= condition.value;
        case 'lte': return value <= condition.value;
        case 'in': return Array.isArray(condition.value) && condition.value.includes(value);
        case 'not_in': return Array.isArray(condition.value) && !condition.value.includes(value);
        default: return false;
      }
    });
  }

  // ==================== Locker Locations ====================

  getLockerLocations(carrier?: ShippingCarrier): LockerLocation[] {
    let locations = Array.from(this.lockerLocations.values()).filter(l => l.isActive);

    if (carrier) {
      locations = locations.filter(l => l.carrier === carrier);
    }

    return locations;
  }

  getLockersByCity(city: string): LockerLocation[] {
    return Array.from(this.lockerLocations.values())
      .filter(l => l.isActive && l.address.city.toLowerCase() === city.toLowerCase());
  }

  getNearbyLockers(lat: number, lng: number, radiusKm: number = 10): LockerLocation[] {
    return Array.from(this.lockerLocations.values())
      .filter(l => {
        const distance = this.calculateDistance(lat, lng, l.coordinates.lat, l.coordinates.lng);
        return l.isActive && distance <= radiusKm;
      })
      .sort((a, b) => {
        const distA = this.calculateDistance(lat, lng, a.coordinates.lat, a.coordinates.lng);
        const distB = this.calculateDistance(lat, lng, b.coordinates.lat, b.coordinates.lng);
        return distA - distB;
      });
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // ==================== Analytics ====================

  getShippingAnalytics(tenantId: string, startDate: Date, endDate: Date): ShippingAnalytics {
    const shipments = this.getShipmentsByTenant(tenantId)
      .filter(s => s.createdAt >= startDate && s.createdAt <= endDate);

    const deliveredShipments = shipments.filter(s => s.status === 'delivered');
    const inTransitShipments = shipments.filter(s =>
      ['in_transit', 'out_for_delivery', 'picked_up'].includes(s.status)
    );
    const returnedShipments = shipments.filter(s => s.status === 'returned');
    const failedShipments = shipments.filter(s => s.status === 'failed_attempt');
    const exceptionShipments = shipments.filter(s => s.status === 'exception');

    // Calculate average delivery days
    const deliveredWithActual = deliveredShipments.filter(s => s.actualDeliveryDate);
    const avgDeliveryDays = deliveredWithActual.length > 0
      ? deliveredWithActual.reduce((sum, s) => {
          const days = Math.ceil((s.actualDeliveryDate!.getTime() - s.createdAt.getTime()) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0) / deliveredWithActual.length
      : 0;

    // Total shipping cost
    const totalShippingCost = shipments.reduce((sum, s) => sum + s.rates.totalRate, 0);

    // By carrier
    const carrierStats = new Map<ShippingCarrier, { shipments: number; delivered: number; totalDays: number; totalCost: number }>();
    for (const shipment of shipments) {
      const stats = carrierStats.get(shipment.carrier) || { shipments: 0, delivered: 0, totalDays: 0, totalCost: 0 };
      stats.shipments++;
      stats.totalCost += shipment.rates.totalRate;
      if (shipment.status === 'delivered' && shipment.actualDeliveryDate) {
        stats.delivered++;
        stats.totalDays += Math.ceil((shipment.actualDeliveryDate.getTime() - shipment.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      }
      carrierStats.set(shipment.carrier, stats);
    }

    const byCarrier = Array.from(carrierStats.entries()).map(([carrier, stats]) => ({
      carrier,
      shipments: stats.shipments,
      deliveryRate: stats.shipments > 0 ? (stats.delivered / stats.shipments) * 100 : 0,
      avgDeliveryDays: stats.delivered > 0 ? stats.totalDays / stats.delivered : 0,
      totalCost: stats.totalCost,
      avgCostPerShipment: stats.shipments > 0 ? stats.totalCost / stats.shipments : 0,
    }));

    // By country
    const countryStats = new Map<string, { shipments: number; delivered: number; totalDays: number }>();
    for (const shipment of shipments) {
      const country = shipment.toAddress.country;
      const stats = countryStats.get(country) || { shipments: 0, delivered: 0, totalDays: 0 };
      stats.shipments++;
      if (shipment.status === 'delivered' && shipment.actualDeliveryDate) {
        stats.delivered++;
        stats.totalDays += Math.ceil((shipment.actualDeliveryDate.getTime() - shipment.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      }
      countryStats.set(country, stats);
    }

    const byCountry = Array.from(countryStats.entries()).map(([country, stats]) => ({
      country,
      shipments: stats.shipments,
      deliveryRate: stats.shipments > 0 ? (stats.delivered / stats.shipments) * 100 : 0,
      avgDeliveryDays: stats.delivered > 0 ? stats.totalDays / stats.delivered : 0,
    }));

    // By service
    const serviceStats = new Map<ServiceType, { shipments: number; totalDays: number; delivered: number; totalCost: number }>();
    for (const shipment of shipments) {
      const stats = serviceStats.get(shipment.service) || { shipments: 0, totalDays: 0, delivered: 0, totalCost: 0 };
      stats.shipments++;
      stats.totalCost += shipment.rates.totalRate;
      if (shipment.status === 'delivered' && shipment.actualDeliveryDate) {
        stats.delivered++;
        stats.totalDays += Math.ceil((shipment.actualDeliveryDate.getTime() - shipment.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      }
      serviceStats.set(shipment.service, stats);
    }

    const byService = Array.from(serviceStats.entries()).map(([service, stats]) => ({
      service,
      shipments: stats.shipments,
      avgDeliveryDays: stats.delivered > 0 ? stats.totalDays / stats.delivered : 0,
      totalCost: stats.totalCost,
    }));

    // Late deliveries
    const lateDeliveries = deliveredShipments.filter(s =>
      s.actualDeliveryDate && s.estimatedDeliveryDate && s.actualDeliveryDate > s.estimatedDeliveryDate
    ).length;

    return {
      tenantId,
      period: { start: startDate, end: endDate },
      summary: {
        totalShipments: shipments.length,
        deliveredShipments: deliveredShipments.length,
        inTransitShipments: inTransitShipments.length,
        returnedShipments: returnedShipments.length,
        deliveryRate: shipments.length > 0 ? (deliveredShipments.length / shipments.length) * 100 : 0,
        averageDeliveryDays: Math.round(avgDeliveryDays * 10) / 10,
        totalShippingCost: Math.round(totalShippingCost * 100) / 100,
      },
      byCarrier,
      byCountry,
      byService,
      issues: {
        failedDeliveries: failedShipments.length,
        returns: returnedShipments.length,
        exceptions: exceptionShipments.length,
        lateDeliveries,
      },
    };
  }

  // ==================== Utility Methods ====================

  async cancelShipment(shipmentId: string, reason?: string): Promise<Shipment> {
    const shipment = this.shipments.get(shipmentId);
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    if (['delivered', 'returned'].includes(shipment.status)) {
      throw new BadRequestException('Cannot cancel delivered or returned shipment');
    }

    shipment.status = 'cancelled';
    shipment.updatedAt = new Date();
    shipment.timeline.push({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      status: 'cancelled',
      description: reason || 'Shipment cancelled',
    });

    this.shipments.set(shipmentId, shipment);
    this.logger.log(`Cancelled shipment ${shipmentId}`);

    return shipment;
  }

  validateAddress(address: ShippingAddress): { valid: boolean; suggestions?: string[] } {
    const issues: string[] = [];

    if (!address.name || address.name.length < 2) {
      issues.push('Name is required');
    }
    if (!address.street1 || address.street1.length < 5) {
      issues.push('Street address is required');
    }
    if (!address.city || address.city.length < 2) {
      issues.push('City is required');
    }
    if (!address.postalCode) {
      issues.push('Postal code is required');
    }
    if (!address.country || address.country.length !== 2) {
      issues.push('Valid 2-letter country code is required');
    }
    if (!address.phone || address.phone.length < 8) {
      issues.push('Phone number is required');
    }

    return {
      valid: issues.length === 0,
      suggestions: issues.length > 0 ? issues : undefined,
    };
  }

  estimateDeliveryDate(carrier: ShippingCarrier, service: ServiceType, fromCountry: string, toCountry: string): Date {
    const carrierInfo = this.carriers.get(carrier);
    if (!carrierInfo) {
      throw new BadRequestException('Carrier not found');
    }

    const days = this.getEstimatedDeliveryDays(carrierInfo, service, fromCountry, toCountry);
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + days);

    return deliveryDate;
  }
}
