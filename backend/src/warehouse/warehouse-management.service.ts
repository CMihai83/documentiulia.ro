import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Warehouse Types
export enum WarehouseType {
  DISTRIBUTION_CENTER = 'distribution_center',
  FULFILLMENT_CENTER = 'fulfillment_center',
  CROSS_DOCK = 'cross_dock',
  COLD_STORAGE = 'cold_storage',
  BONDED_WAREHOUSE = 'bonded_warehouse',
  RETAIL_STORE = 'retail_store',
  RAW_MATERIALS = 'raw_materials',
  FINISHED_GOODS = 'finished_goods',
}

export enum WarehouseStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  CLOSED = 'closed',
}

export enum ZoneType {
  RECEIVING = 'receiving',
  STORAGE = 'storage',
  PICKING = 'picking',
  PACKING = 'packing',
  SHIPPING = 'shipping',
  RETURNS = 'returns',
  QUARANTINE = 'quarantine',
  QUALITY_CONTROL = 'quality_control',
  STAGING = 'staging',
  HAZMAT = 'hazmat',
  COLD = 'cold',
  FROZEN = 'frozen',
}

export enum LocationType {
  RACK = 'rack',
  SHELF = 'shelf',
  BIN = 'bin',
  FLOOR = 'floor',
  PALLET = 'pallet',
  BULK = 'bulk',
  FREEZER = 'freezer',
  REFRIGERATOR = 'refrigerator',
}

export enum StorageClass {
  GENERAL = 'general',
  TEMPERATURE_CONTROLLED = 'temperature_controlled',
  HAZARDOUS = 'hazardous',
  HIGH_VALUE = 'high_value',
  FRAGILE = 'fragile',
  OVERSIZED = 'oversized',
  FAST_MOVING = 'fast_moving',
  SLOW_MOVING = 'slow_moving',
}

// Interfaces
export interface Warehouse {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  type: WarehouseType;
  status: WarehouseStatus;
  address: WarehouseAddress;
  contact: WarehouseContact;
  operatingHours: OperatingHours;
  capacity: WarehouseCapacity;
  zones: Zone[];
  settings: WarehouseSettings;
  integrations?: WarehouseIntegrations;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface WarehouseAddress {
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface WarehouseContact {
  managerName?: string;
  phone?: string;
  email?: string;
  emergencyPhone?: string;
}

export interface OperatingHours {
  timezone: string;
  schedule: {
    [day: string]: { open: string; close: string } | null;
  };
  holidays?: string[];
}

export interface WarehouseCapacity {
  totalArea: number; // Square meters
  usableArea: number;
  totalLocations: number;
  usedLocations: number;
  totalPalletPositions: number;
  usedPalletPositions: number;
  maxWeight: number; // kg
  currentWeight: number;
}

export interface WarehouseSettings {
  defaultPickingStrategy: 'fifo' | 'lifo' | 'fefo' | 'nearest';
  allowNegativeStock: boolean;
  requireLotTracking: boolean;
  requireSerialTracking: boolean;
  autoReplenishment: boolean;
  cycleCountFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  minStockAlertEnabled: boolean;
  maxStockAlertEnabled: boolean;
}

export interface WarehouseIntegrations {
  erpSystem?: string;
  wmsSystem?: string;
  tmsSystem?: string;
  barcodeScanners?: boolean;
  rfidEnabled?: boolean;
  voicePickingEnabled?: boolean;
}

export interface Zone {
  id: string;
  warehouseId: string;
  code: string;
  name: string;
  type: ZoneType;
  storageClass: StorageClass;
  temperatureRange?: { min: number; max: number };
  humidityRange?: { min: number; max: number };
  locations: Location[];
  capacity: ZoneCapacity;
  isActive: boolean;
  priority: number;
  restrictions?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ZoneCapacity {
  totalLocations: number;
  usedLocations: number;
  totalVolume: number; // Cubic meters
  usedVolume: number;
  utilizationPercentage: number;
}

export interface Location {
  id: string;
  zoneId: string;
  warehouseId: string;
  code: string;
  barcode: string;
  type: LocationType;
  aisle: string;
  rack?: string;
  level?: string;
  position?: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  maxWeight: number;
  currentWeight: number;
  maxVolume: number;
  currentVolume: number;
  storageClass: StorageClass;
  isActive: boolean;
  isBlocked: boolean;
  blockReason?: string;
  pickSequence: number;
  putawaySequence: number;
  inventoryItems: InventoryItem[];
  lastCountDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryItem {
  id: string;
  locationId: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  unitOfMeasure: string;
  lotNumber?: string;
  batchNumber?: string;
  serialNumber?: string;
  expiryDate?: Date;
  manufacturingDate?: Date;
  receivedDate: Date;
  lastMovementDate?: Date;
  unitCost?: number;
  totalValue?: number;
  status: 'available' | 'reserved' | 'quarantine' | 'damaged' | 'expired';
  attributes?: Record<string, any>;
}

// DTOs
export interface CreateWarehouseDto {
  code: string;
  name: string;
  type: WarehouseType;
  address: WarehouseAddress;
  contact?: WarehouseContact;
  operatingHours?: Partial<OperatingHours>;
  settings?: Partial<WarehouseSettings>;
}

export interface UpdateWarehouseDto {
  name?: string;
  type?: WarehouseType;
  status?: WarehouseStatus;
  address?: Partial<WarehouseAddress>;
  contact?: Partial<WarehouseContact>;
  operatingHours?: Partial<OperatingHours>;
  settings?: Partial<WarehouseSettings>;
}

export interface CreateZoneDto {
  code: string;
  name: string;
  type: ZoneType;
  storageClass?: StorageClass;
  temperatureRange?: { min: number; max: number };
  humidityRange?: { min: number; max: number };
  priority?: number;
  restrictions?: string[];
}

export interface CreateLocationDto {
  code: string;
  type: LocationType;
  aisle: string;
  rack?: string;
  level?: string;
  position?: string;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  maxWeight?: number;
  storageClass?: StorageClass;
  pickSequence?: number;
  putawaySequence?: number;
}

export interface BulkCreateLocationsDto {
  aisles: string[];
  racks: string[];
  levels: string[];
  positions: string[];
  type: LocationType;
  storageClass?: StorageClass;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  maxWeight?: number;
}

@Injectable()
export class WarehouseManagementService {
  private warehouses = new Map<string, Warehouse>();
  private zones = new Map<string, Zone>();
  private locations = new Map<string, Location>();

  constructor(private eventEmitter: EventEmitter2) {}

  // Warehouse Management
  async createWarehouse(
    tenantId: string,
    dto: CreateWarehouseDto,
  ): Promise<Warehouse> {
    // Check for duplicate code
    const existing = Array.from(this.warehouses.values()).find(
      (w) => w.tenantId === tenantId && w.code === dto.code,
    );
    if (existing) {
      throw new BadRequestException(`Warehouse with code ${dto.code} already exists`);
    }

    const id = `wh_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const defaultSettings: WarehouseSettings = {
      defaultPickingStrategy: 'fifo',
      allowNegativeStock: false,
      requireLotTracking: false,
      requireSerialTracking: false,
      autoReplenishment: true,
      cycleCountFrequency: 'monthly',
      minStockAlertEnabled: true,
      maxStockAlertEnabled: true,
    };

    const defaultOperatingHours: OperatingHours = {
      timezone: 'Europe/Bucharest',
      schedule: {
        monday: { open: '08:00', close: '18:00' },
        tuesday: { open: '08:00', close: '18:00' },
        wednesday: { open: '08:00', close: '18:00' },
        thursday: { open: '08:00', close: '18:00' },
        friday: { open: '08:00', close: '18:00' },
        saturday: { open: '09:00', close: '14:00' },
        sunday: null,
      },
    };

    const warehouse: Warehouse = {
      id,
      tenantId,
      code: dto.code,
      name: dto.name,
      type: dto.type,
      status: WarehouseStatus.ACTIVE,
      address: dto.address,
      contact: dto.contact || {},
      operatingHours: { ...defaultOperatingHours, ...dto.operatingHours },
      capacity: {
        totalArea: 0,
        usableArea: 0,
        totalLocations: 0,
        usedLocations: 0,
        totalPalletPositions: 0,
        usedPalletPositions: 0,
        maxWeight: 0,
        currentWeight: 0,
      },
      zones: [],
      settings: { ...defaultSettings, ...dto.settings },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.warehouses.set(id, warehouse);

    this.eventEmitter.emit('warehouse.created', {
      tenantId,
      warehouseId: id,
      code: dto.code,
    });

    return warehouse;
  }

  async getWarehouse(tenantId: string, warehouseId: string): Promise<Warehouse> {
    const warehouse = this.warehouses.get(warehouseId);

    if (!warehouse || warehouse.tenantId !== tenantId) {
      throw new NotFoundException(`Warehouse ${warehouseId} not found`);
    }

    // Attach zones
    warehouse.zones = Array.from(this.zones.values()).filter(
      (z) => z.warehouseId === warehouseId,
    );

    return warehouse;
  }

  async listWarehouses(
    tenantId: string,
    filters?: { status?: WarehouseStatus; type?: WarehouseType },
  ): Promise<Warehouse[]> {
    let warehouses = Array.from(this.warehouses.values()).filter(
      (w) => w.tenantId === tenantId,
    );

    if (filters?.status) {
      warehouses = warehouses.filter((w) => w.status === filters.status);
    }

    if (filters?.type) {
      warehouses = warehouses.filter((w) => w.type === filters.type);
    }

    // Attach zones to each warehouse
    return warehouses.map((w) => ({
      ...w,
      zones: Array.from(this.zones.values()).filter((z) => z.warehouseId === w.id),
    }));
  }

  async updateWarehouse(
    tenantId: string,
    warehouseId: string,
    dto: UpdateWarehouseDto,
  ): Promise<Warehouse> {
    const warehouse = await this.getWarehouse(tenantId, warehouseId);

    Object.assign(warehouse, {
      ...dto,
      address: dto.address ? { ...warehouse.address, ...dto.address } : warehouse.address,
      contact: dto.contact ? { ...warehouse.contact, ...dto.contact } : warehouse.contact,
      operatingHours: dto.operatingHours
        ? { ...warehouse.operatingHours, ...dto.operatingHours }
        : warehouse.operatingHours,
      settings: dto.settings ? { ...warehouse.settings, ...dto.settings } : warehouse.settings,
      updatedAt: new Date(),
    });

    this.warehouses.set(warehouseId, warehouse);

    this.eventEmitter.emit('warehouse.updated', {
      tenantId,
      warehouseId,
      changes: Object.keys(dto),
    });

    return warehouse;
  }

  async deactivateWarehouse(
    tenantId: string,
    warehouseId: string,
    reason?: string,
  ): Promise<Warehouse> {
    const warehouse = await this.getWarehouse(tenantId, warehouseId);

    // Check if warehouse has active inventory
    const hasInventory = Array.from(this.locations.values()).some(
      (l) => l.warehouseId === warehouseId && l.inventoryItems.length > 0,
    );

    if (hasInventory) {
      throw new BadRequestException(
        'Cannot deactivate warehouse with active inventory',
      );
    }

    warehouse.status = WarehouseStatus.INACTIVE;
    warehouse.metadata = { ...warehouse.metadata, deactivationReason: reason };
    warehouse.updatedAt = new Date();

    this.warehouses.set(warehouseId, warehouse);

    this.eventEmitter.emit('warehouse.deactivated', {
      tenantId,
      warehouseId,
      reason,
    });

    return warehouse;
  }

  // Zone Management
  async createZone(
    tenantId: string,
    warehouseId: string,
    dto: CreateZoneDto,
  ): Promise<Zone> {
    const warehouse = await this.getWarehouse(tenantId, warehouseId);

    // Check for duplicate code
    const existing = Array.from(this.zones.values()).find(
      (z) => z.warehouseId === warehouseId && z.code === dto.code,
    );
    if (existing) {
      throw new BadRequestException(`Zone with code ${dto.code} already exists`);
    }

    const id = `zone_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const zone: Zone = {
      id,
      warehouseId,
      code: dto.code,
      name: dto.name,
      type: dto.type,
      storageClass: dto.storageClass || StorageClass.GENERAL,
      temperatureRange: dto.temperatureRange,
      humidityRange: dto.humidityRange,
      locations: [],
      capacity: {
        totalLocations: 0,
        usedLocations: 0,
        totalVolume: 0,
        usedVolume: 0,
        utilizationPercentage: 0,
      },
      isActive: true,
      priority: dto.priority || 0,
      restrictions: dto.restrictions,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.zones.set(id, zone);

    this.eventEmitter.emit('zone.created', {
      tenantId,
      warehouseId,
      zoneId: id,
      code: dto.code,
    });

    return zone;
  }

  async getZone(tenantId: string, zoneId: string): Promise<Zone> {
    const zone = this.zones.get(zoneId);

    if (!zone) {
      throw new NotFoundException(`Zone ${zoneId} not found`);
    }

    // Verify warehouse belongs to tenant
    const warehouse = this.warehouses.get(zone.warehouseId);
    if (!warehouse || warehouse.tenantId !== tenantId) {
      throw new NotFoundException(`Zone ${zoneId} not found`);
    }

    // Attach locations
    zone.locations = Array.from(this.locations.values()).filter(
      (l) => l.zoneId === zoneId,
    );

    return zone;
  }

  async listZones(tenantId: string, warehouseId: string): Promise<Zone[]> {
    await this.getWarehouse(tenantId, warehouseId);

    const zones = Array.from(this.zones.values()).filter(
      (z) => z.warehouseId === warehouseId,
    );

    return zones.map((z) => ({
      ...z,
      locations: Array.from(this.locations.values()).filter((l) => l.zoneId === z.id),
    }));
  }

  async updateZone(
    tenantId: string,
    zoneId: string,
    dto: Partial<CreateZoneDto>,
  ): Promise<Zone> {
    const zone = await this.getZone(tenantId, zoneId);

    Object.assign(zone, {
      ...dto,
      updatedAt: new Date(),
    });

    this.zones.set(zoneId, zone);

    return zone;
  }

  async deactivateZone(tenantId: string, zoneId: string): Promise<Zone> {
    const zone = await this.getZone(tenantId, zoneId);

    // Check for inventory
    const hasInventory = zone.locations.some((l) => l.inventoryItems.length > 0);
    if (hasInventory) {
      throw new BadRequestException('Cannot deactivate zone with active inventory');
    }

    zone.isActive = false;
    zone.updatedAt = new Date();

    this.zones.set(zoneId, zone);

    return zone;
  }

  // Location Management
  async createLocation(
    tenantId: string,
    zoneId: string,
    dto: CreateLocationDto,
  ): Promise<Location> {
    const zone = await this.getZone(tenantId, zoneId);

    // Generate barcode
    const barcode = this.generateLocationBarcode(zone.warehouseId, zoneId, dto.code);

    // Check for duplicate code
    const existing = Array.from(this.locations.values()).find(
      (l) => l.zoneId === zoneId && l.code === dto.code,
    );
    if (existing) {
      throw new BadRequestException(`Location with code ${dto.code} already exists`);
    }

    const id = `loc_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const defaultDimensions = { length: 1.2, width: 1.0, height: 1.5 };
    const dimensions = dto.dimensions || defaultDimensions;
    const maxVolume = dimensions.length * dimensions.width * dimensions.height;

    const location: Location = {
      id,
      zoneId,
      warehouseId: zone.warehouseId,
      code: dto.code,
      barcode,
      type: dto.type,
      aisle: dto.aisle,
      rack: dto.rack,
      level: dto.level,
      position: dto.position,
      dimensions,
      maxWeight: dto.maxWeight || 1000,
      currentWeight: 0,
      maxVolume,
      currentVolume: 0,
      storageClass: dto.storageClass || zone.storageClass,
      isActive: true,
      isBlocked: false,
      pickSequence: dto.pickSequence || 0,
      putawaySequence: dto.putawaySequence || 0,
      inventoryItems: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.locations.set(id, location);

    // Update zone capacity
    zone.capacity.totalLocations++;
    zone.capacity.totalVolume += maxVolume;
    this.zones.set(zoneId, zone);

    // Update warehouse capacity
    const warehouse = this.warehouses.get(zone.warehouseId)!;
    warehouse.capacity.totalLocations++;
    this.warehouses.set(zone.warehouseId, warehouse);

    this.eventEmitter.emit('location.created', {
      tenantId,
      warehouseId: zone.warehouseId,
      zoneId,
      locationId: id,
      barcode,
    });

    return location;
  }

  async bulkCreateLocations(
    tenantId: string,
    zoneId: string,
    dto: BulkCreateLocationsDto,
  ): Promise<Location[]> {
    const zone = await this.getZone(tenantId, zoneId);
    const locations: Location[] = [];

    for (const aisle of dto.aisles) {
      for (const rack of dto.racks) {
        for (const level of dto.levels) {
          for (const position of dto.positions) {
            const code = `${aisle}-${rack}-${level}-${position}`;

            try {
              const location = await this.createLocation(tenantId, zoneId, {
                code,
                type: dto.type,
                aisle,
                rack,
                level,
                position,
                dimensions: dto.dimensions,
                maxWeight: dto.maxWeight,
                storageClass: dto.storageClass,
              });
              locations.push(location);
            } catch (error) {
              // Skip duplicates
              continue;
            }
          }
        }
      }
    }

    this.eventEmitter.emit('locations.bulk_created', {
      tenantId,
      warehouseId: zone.warehouseId,
      zoneId,
      count: locations.length,
    });

    return locations;
  }

  async getLocation(tenantId: string, locationId: string): Promise<Location> {
    const location = this.locations.get(locationId);

    if (!location) {
      throw new NotFoundException(`Location ${locationId} not found`);
    }

    // Verify warehouse belongs to tenant
    const warehouse = this.warehouses.get(location.warehouseId);
    if (!warehouse || warehouse.tenantId !== tenantId) {
      throw new NotFoundException(`Location ${locationId} not found`);
    }

    return location;
  }

  async getLocationByBarcode(tenantId: string, barcode: string): Promise<Location> {
    const location = Array.from(this.locations.values()).find(
      (l) => l.barcode === barcode,
    );

    if (!location) {
      throw new NotFoundException(`Location with barcode ${barcode} not found`);
    }

    // Verify tenant
    const warehouse = this.warehouses.get(location.warehouseId);
    if (!warehouse || warehouse.tenantId !== tenantId) {
      throw new NotFoundException(`Location with barcode ${barcode} not found`);
    }

    return location;
  }

  async listLocations(
    tenantId: string,
    warehouseId: string,
    filters?: {
      zoneId?: string;
      type?: LocationType;
      storageClass?: StorageClass;
      isActive?: boolean;
      hasInventory?: boolean;
    },
  ): Promise<Location[]> {
    await this.getWarehouse(tenantId, warehouseId);

    let locations = Array.from(this.locations.values()).filter(
      (l) => l.warehouseId === warehouseId,
    );

    if (filters?.zoneId) {
      locations = locations.filter((l) => l.zoneId === filters.zoneId);
    }

    if (filters?.type) {
      locations = locations.filter((l) => l.type === filters.type);
    }

    if (filters?.storageClass) {
      locations = locations.filter((l) => l.storageClass === filters.storageClass);
    }

    if (filters?.isActive !== undefined) {
      locations = locations.filter((l) => l.isActive === filters.isActive);
    }

    if (filters?.hasInventory !== undefined) {
      locations = locations.filter(
        (l) => (l.inventoryItems.length > 0) === filters.hasInventory,
      );
    }

    return locations.sort((a, b) => a.pickSequence - b.pickSequence);
  }

  async blockLocation(
    tenantId: string,
    locationId: string,
    reason: string,
  ): Promise<Location> {
    const location = await this.getLocation(tenantId, locationId);

    location.isBlocked = true;
    location.blockReason = reason;
    location.updatedAt = new Date();

    this.locations.set(locationId, location);

    this.eventEmitter.emit('location.blocked', {
      tenantId,
      locationId,
      reason,
    });

    return location;
  }

  async unblockLocation(tenantId: string, locationId: string): Promise<Location> {
    const location = await this.getLocation(tenantId, locationId);

    location.isBlocked = false;
    location.blockReason = undefined;
    location.updatedAt = new Date();

    this.locations.set(locationId, location);

    this.eventEmitter.emit('location.unblocked', {
      tenantId,
      locationId,
    });

    return location;
  }

  // Inventory at Location
  async addInventoryToLocation(
    tenantId: string,
    locationId: string,
    item: Omit<InventoryItem, 'id' | 'locationId' | 'availableQuantity'>,
  ): Promise<Location> {
    const location = await this.getLocation(tenantId, locationId);

    if (location.isBlocked) {
      throw new BadRequestException('Cannot add inventory to blocked location');
    }

    if (!location.isActive) {
      throw new BadRequestException('Cannot add inventory to inactive location');
    }

    const inventoryItem: InventoryItem = {
      ...item,
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      locationId,
      availableQuantity: item.quantity - (item.reservedQuantity || 0),
      receivedDate: item.receivedDate || new Date(),
    };

    location.inventoryItems.push(inventoryItem);
    location.updatedAt = new Date();

    this.locations.set(locationId, location);

    // Update zone utilization
    await this.updateZoneUtilization(location.zoneId);

    this.eventEmitter.emit('inventory.added_to_location', {
      tenantId,
      locationId,
      itemId: item.itemId,
      quantity: item.quantity,
    });

    return location;
  }

  async removeInventoryFromLocation(
    tenantId: string,
    locationId: string,
    inventoryItemId: string,
    quantity: number,
  ): Promise<Location> {
    const location = await this.getLocation(tenantId, locationId);

    const itemIndex = location.inventoryItems.findIndex(
      (i) => i.id === inventoryItemId,
    );

    if (itemIndex === -1) {
      throw new NotFoundException(`Inventory item ${inventoryItemId} not found`);
    }

    const item = location.inventoryItems[itemIndex];

    if (quantity > item.availableQuantity) {
      throw new BadRequestException('Insufficient available quantity');
    }

    item.quantity -= quantity;
    item.availableQuantity -= quantity;

    if (item.quantity <= 0) {
      location.inventoryItems.splice(itemIndex, 1);
    }

    location.updatedAt = new Date();
    this.locations.set(locationId, location);

    // Update zone utilization
    await this.updateZoneUtilization(location.zoneId);

    this.eventEmitter.emit('inventory.removed_from_location', {
      tenantId,
      locationId,
      itemId: item.itemId,
      quantity,
    });

    return location;
  }

  // Helper Methods
  private generateLocationBarcode(
    warehouseId: string,
    zoneId: string,
    locationCode: string,
  ): string {
    const whCode = warehouseId.substring(3, 7).toUpperCase();
    const zCode = zoneId.substring(5, 9).toUpperCase();
    return `LOC-${whCode}-${zCode}-${locationCode}`.replace(/[^A-Z0-9-]/g, '');
  }

  private async updateZoneUtilization(zoneId: string): Promise<void> {
    const zone = this.zones.get(zoneId);
    if (!zone) return;

    const locations = Array.from(this.locations.values()).filter(
      (l) => l.zoneId === zoneId,
    );

    const usedLocations = locations.filter((l) => l.inventoryItems.length > 0).length;
    const usedVolume = locations.reduce((sum, l) => {
      const itemVolume = l.inventoryItems.reduce((iSum, item) => iSum + (item.quantity * 0.001), 0);
      return sum + itemVolume;
    }, 0);

    zone.capacity.usedLocations = usedLocations;
    zone.capacity.usedVolume = usedVolume;
    zone.capacity.utilizationPercentage =
      zone.capacity.totalLocations > 0
        ? (usedLocations / zone.capacity.totalLocations) * 100
        : 0;

    this.zones.set(zoneId, zone);
  }

  // Analytics
  async getWarehouseUtilization(
    tenantId: string,
    warehouseId: string,
  ): Promise<{
    totalCapacity: WarehouseCapacity;
    zoneUtilization: { zone: string; utilization: number }[];
    locationTypes: { type: LocationType; count: number; used: number }[];
    inventorySummary: {
      totalItems: number;
      totalQuantity: number;
      totalValue: number;
      byStatus: Record<string, number>;
    };
  }> {
    const warehouse = await this.getWarehouse(tenantId, warehouseId);
    const zones = await this.listZones(tenantId, warehouseId);
    const locations = await this.listLocations(tenantId, warehouseId);

    const zoneUtilization = zones.map((z) => ({
      zone: z.name,
      utilization: z.capacity.utilizationPercentage,
    }));

    const locationTypeMap = new Map<LocationType, { count: number; used: number }>();
    for (const loc of locations) {
      const current = locationTypeMap.get(loc.type) || { count: 0, used: 0 };
      current.count++;
      if (loc.inventoryItems.length > 0) current.used++;
      locationTypeMap.set(loc.type, current);
    }

    const locationTypes = Array.from(locationTypeMap.entries()).map(
      ([type, data]) => ({
        type,
        count: data.count,
        used: data.used,
      }),
    );

    let totalItems = 0;
    let totalQuantity = 0;
    let totalValue = 0;
    const byStatus: Record<string, number> = {};

    for (const loc of locations) {
      for (const item of loc.inventoryItems) {
        totalItems++;
        totalQuantity += item.quantity;
        totalValue += item.totalValue || 0;
        byStatus[item.status] = (byStatus[item.status] || 0) + 1;
      }
    }

    return {
      totalCapacity: warehouse.capacity,
      zoneUtilization,
      locationTypes,
      inventorySummary: {
        totalItems,
        totalQuantity,
        totalValue,
        byStatus,
      },
    };
  }

  // Find available location for putaway
  async findPutawayLocation(
    tenantId: string,
    warehouseId: string,
    itemId: string,
    storageClass: StorageClass,
    quantity: number,
  ): Promise<Location[]> {
    const locations = await this.listLocations(tenantId, warehouseId, {
      storageClass,
      isActive: true,
    });

    const available = locations.filter(
      (l) =>
        !l.isBlocked &&
        l.currentWeight < l.maxWeight &&
        l.currentVolume < l.maxVolume,
    );

    // Sort by putaway sequence
    return available.sort((a, b) => a.putawaySequence - b.putawaySequence);
  }
}
