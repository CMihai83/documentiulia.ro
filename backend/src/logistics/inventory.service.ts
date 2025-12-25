import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

// =================== INTERFACES & TYPES ===================

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: InventoryCategory;
  unit: UnitOfMeasure;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  minStockLevel: number;
  maxStockLevel: number;
  reorderPoint: number;
  reorderQuantity: number;
  unitCost: number;
  currency: string;
  weight: number; // kg
  dimensions: ItemDimensions;
  barcodeType: BarcodeType;
  barcode: string;
  rfidTag?: string;
  qrCode?: string;
  imageUrl?: string;
  warehouseId: string;
  zoneId?: string;
  locationId?: string;
  supplierId?: string;
  isActive: boolean;
  isPerishable: boolean;
  requiresSerialNumber: boolean;
  requiresBatchTracking: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ItemDimensions {
  length: number;
  width: number;
  height: number;
  unit: 'cm' | 'mm' | 'in';
}

export type InventoryCategory =
  | 'RAW_MATERIAL'
  | 'WORK_IN_PROGRESS'
  | 'FINISHED_GOODS'
  | 'PACKAGING'
  | 'SPARE_PARTS'
  | 'CONSUMABLES'
  | 'MERCHANDISE'
  | 'EQUIPMENT'
  | 'OTHER';

export type UnitOfMeasure =
  | 'PIECE'
  | 'KG'
  | 'GRAM'
  | 'LITER'
  | 'ML'
  | 'METER'
  | 'CM'
  | 'SQM'
  | 'CBM'
  | 'BOX'
  | 'PALLET'
  | 'PACK'
  | 'SET'
  | 'HOUR';

export type BarcodeType = 'EAN13' | 'EAN8' | 'UPC' | 'CODE128' | 'CODE39' | 'QR' | 'DATAMATRIX';

// Warehouse & Location Types
export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: WarehouseAddress;
  type: WarehouseType;
  totalArea: number; // sqm
  usableArea: number;
  zones: WarehouseZone[];
  isActive: boolean;
  managerId?: string;
  operatingHours: OperatingHours;
  capabilities: WarehouseCapability[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WarehouseAddress {
  street: string;
  city: string;
  county: string;
  postalCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export type WarehouseType =
  | 'MAIN'
  | 'DISTRIBUTION'
  | 'RETAIL'
  | 'COLD_STORAGE'
  | 'BONDED'
  | 'CROSS_DOCK'
  | 'FULFILLMENT';

export interface WarehouseZone {
  id: string;
  warehouseId: string;
  name: string;
  code: string;
  type: ZoneType;
  area: number;
  temperatureRange?: TemperatureRange;
  locations: StorageLocation[];
  isActive: boolean;
}

export type ZoneType =
  | 'RECEIVING'
  | 'SHIPPING'
  | 'STORAGE'
  | 'PICKING'
  | 'PACKING'
  | 'STAGING'
  | 'QUARANTINE'
  | 'RETURNS'
  | 'COLD'
  | 'HAZMAT';

export interface TemperatureRange {
  min: number;
  max: number;
  unit: 'C' | 'F';
}

export interface StorageLocation {
  id: string;
  zoneId: string;
  code: string; // e.g., A-01-02-03 (Aisle-Rack-Shelf-Bin)
  type: LocationType;
  capacity: LocationCapacity;
  currentUtilization: number; // percentage
  assignedItems: string[]; // item IDs
  isActive: boolean;
  isBlocked: boolean;
  blockReason?: string;
}

export type LocationType =
  | 'FLOOR'
  | 'RACK'
  | 'SHELF'
  | 'BIN'
  | 'PALLET_LOCATION'
  | 'BULK_STORAGE'
  | 'PICK_FACE';

export interface LocationCapacity {
  maxWeight: number; // kg
  maxVolume: number; // cbm
  maxPallets?: number;
  maxItems?: number;
}

export interface OperatingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  isOpen: boolean;
  openTime?: string; // HH:MM
  closeTime?: string;
}

export type WarehouseCapability =
  | 'TEMPERATURE_CONTROLLED'
  | 'HAZMAT_CERTIFIED'
  | 'BONDED_STORAGE'
  | 'CROSS_DOCKING'
  | 'VALUE_ADDED_SERVICES'
  | 'ECOMMERCE_FULFILLMENT'
  | 'REVERSE_LOGISTICS';

// Batch & Lot Tracking
export interface Batch {
  id: string;
  itemId: string;
  batchNumber: string;
  lotNumber?: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  unitCost: number;
  manufacturingDate?: Date;
  expiryDate?: Date;
  receivedDate: Date;
  supplierId?: string;
  supplierBatchRef?: string;
  qualityStatus: QualityStatus;
  qualityNotes?: string;
  locationId?: string;
  isActive: boolean;
  createdAt: Date;
}

export type QualityStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ON_HOLD' | 'EXPIRED';

// Serial Number Tracking
export interface SerialNumber {
  id: string;
  itemId: string;
  serialNumber: string;
  batchId?: string;
  status: SerialStatus;
  locationId?: string;
  receivedDate: Date;
  soldDate?: Date;
  customerId?: string;
  warrantyExpiry?: Date;
  notes?: string;
}

export type SerialStatus = 'IN_STOCK' | 'RESERVED' | 'SOLD' | 'RETURNED' | 'DAMAGED' | 'SCRAPPED';

// RFID & QR Code
export interface RFIDTag {
  id: string;
  tagId: string; // EPC or TID
  itemId?: string;
  batchId?: string;
  locationId?: string;
  assetId?: string;
  type: RFIDTagType;
  status: RFIDStatus;
  lastReadAt?: Date;
  lastReadLocation?: string;
  readCount: number;
  createdAt: Date;
}

export type RFIDTagType = 'ITEM' | 'BATCH' | 'PALLET' | 'CONTAINER' | 'ASSET' | 'LOCATION';
export type RFIDStatus = 'ACTIVE' | 'INACTIVE' | 'LOST' | 'DAMAGED' | 'DECOMMISSIONED';

export interface QRCodeData {
  id: string;
  code: string;
  type: QRCodeType;
  referenceId: string; // item/batch/location ID
  data: Record<string, any>;
  generatedAt: Date;
  expiresAt?: Date;
  scanCount: number;
  lastScannedAt?: Date;
}

export type QRCodeType = 'ITEM' | 'BATCH' | 'LOCATION' | 'PALLET' | 'SHIPMENT' | 'RECEIPT';

// Stock Movements
export interface StockMovement {
  id: string;
  type: MovementType;
  itemId: string;
  batchId?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  fromLocationId?: string;
  toLocationId?: string;
  referenceType: ReferenceType;
  referenceId: string;
  reason?: string;
  notes?: string;
  performedBy: string;
  performedAt: Date;
  status: MovementStatus;
  rfidTagIds?: string[];
}

export type MovementType =
  | 'RECEIPT'
  | 'ISSUE'
  | 'TRANSFER'
  | 'ADJUSTMENT'
  | 'RETURN'
  | 'SCRAP'
  | 'PRODUCTION_IN'
  | 'PRODUCTION_OUT'
  | 'CYCLE_COUNT';

export type ReferenceType =
  | 'PURCHASE_ORDER'
  | 'SALES_ORDER'
  | 'TRANSFER_ORDER'
  | 'PRODUCTION_ORDER'
  | 'RETURN_ORDER'
  | 'ADJUSTMENT'
  | 'CYCLE_COUNT';

export type MovementStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

// Stock Alerts
export interface StockAlert {
  id: string;
  itemId: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  threshold?: number;
  currentValue?: number;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  autoReorderTriggered: boolean;
  purchaseOrderId?: string;
}

export type AlertType =
  | 'LOW_STOCK'
  | 'OUT_OF_STOCK'
  | 'OVERSTOCK'
  | 'EXPIRY_WARNING'
  | 'EXPIRY_IMMINENT'
  | 'EXPIRED'
  | 'SLOW_MOVING'
  | 'DEAD_STOCK'
  | 'REORDER_POINT';

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// Auto-Reorder
export interface ReorderRule {
  id: string;
  itemId: string;
  isEnabled: boolean;
  reorderPoint: number;
  reorderQuantity: number;
  maxOrderQuantity?: number;
  preferredSupplierId?: string;
  leadTimeDays: number;
  safetyStockDays: number;
  reviewFrequency: ReviewFrequency;
  lastReviewedAt?: Date;
  lastTriggeredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ReviewFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ON_DEMAND';

export interface ReorderSuggestion {
  itemId: string;
  itemName: string;
  sku: string;
  currentStock: number;
  reorderPoint: number;
  suggestedQuantity: number;
  preferredSupplier?: SupplierInfo;
  estimatedCost: number;
  estimatedDeliveryDate: Date;
  urgency: AlertSeverity;
  reason: string;
}

export interface SupplierInfo {
  id: string;
  name: string;
  leadTimeDays: number;
  unitPrice: number;
  minOrderQuantity: number;
}

// Inventory Valuation
export interface InventoryValuation {
  id: string;
  itemId: string;
  valuationMethod: ValuationMethod;
  totalQuantity: number;
  totalValue: number;
  averageCost: number;
  lastCalculatedAt: Date;
  details: ValuationDetail[];
}

export type ValuationMethod = 'FIFO' | 'LIFO' | 'WEIGHTED_AVERAGE' | 'SPECIFIC_IDENTIFICATION';

export interface ValuationDetail {
  batchId?: string;
  quantity: number;
  unitCost: number;
  totalValue: number;
  receivedDate: Date;
}

// Cycle Count
export interface CycleCount {
  id: string;
  warehouseId: string;
  zoneId?: string;
  type: CycleCountType;
  status: CycleCountStatus;
  scheduledDate: Date;
  startedAt?: Date;
  completedAt?: Date;
  assignedTo: string[];
  items: CycleCountItem[];
  discrepancies: number;
  accuracy: number;
  notes?: string;
  createdBy: string;
  createdAt: Date;
}

export type CycleCountType = 'FULL' | 'ABC' | 'RANDOM' | 'LOCATION' | 'CATEGORY';
export type CycleCountStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'PENDING_REVIEW' | 'COMPLETED' | 'CANCELLED';

export interface CycleCountItem {
  itemId: string;
  locationId: string;
  systemQuantity: number;
  countedQuantity?: number;
  variance?: number;
  varianceValue?: number;
  status: CountItemStatus;
  countedBy?: string;
  countedAt?: Date;
  notes?: string;
}

export type CountItemStatus = 'PENDING' | 'COUNTED' | 'RECOUNTED' | 'VERIFIED' | 'ADJUSTED';

// RFID Reader Integration
export interface RFIDReader {
  id: string;
  name: string;
  serialNumber: string;
  model: string;
  manufacturer: string;
  type: ReaderType;
  locationId?: string;
  warehouseId: string;
  ipAddress?: string;
  port?: number;
  antennaCount: number;
  status: ReaderStatus;
  lastHeartbeat?: Date;
  firmwareVersion: string;
  configuration: ReaderConfiguration;
  createdAt: Date;
}

export type ReaderType = 'FIXED' | 'HANDHELD' | 'PORTAL' | 'CONVEYOR';
export type ReaderStatus = 'ONLINE' | 'OFFLINE' | 'ERROR' | 'MAINTENANCE';

export interface ReaderConfiguration {
  readPower: number; // dBm
  frequency: string;
  readInterval: number; // ms
  filterDuplicates: boolean;
  duplicateWindow: number; // ms
  antennaSettings: AntennaSettings[];
}

export interface AntennaSettings {
  antennaId: number;
  isEnabled: boolean;
  readPower: number;
}

export interface RFIDReadEvent {
  id: string;
  readerId: string;
  tagId: string;
  antennaId: number;
  rssi: number; // signal strength
  timestamp: Date;
  processedAt?: Date;
  processingResult?: string;
}

// DTOs
export interface CreateItemDto {
  sku: string;
  name: string;
  description?: string;
  category: InventoryCategory;
  unit: UnitOfMeasure;
  minStockLevel?: number;
  maxStockLevel?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  unitCost: number;
  currency?: string;
  weight?: number;
  dimensions?: ItemDimensions;
  barcodeType?: BarcodeType;
  barcode?: string;
  warehouseId: string;
  zoneId?: string;
  locationId?: string;
  supplierId?: string;
  isPerishable?: boolean;
  requiresSerialNumber?: boolean;
  requiresBatchTracking?: boolean;
}

export interface CreateWarehouseDto {
  name: string;
  code: string;
  address: WarehouseAddress;
  type: WarehouseType;
  totalArea: number;
  usableArea?: number;
  managerId?: string;
  operatingHours?: OperatingHours;
  capabilities?: WarehouseCapability[];
}

export interface CreateZoneDto {
  warehouseId: string;
  name: string;
  code: string;
  type: ZoneType;
  area?: number;
  temperatureRange?: TemperatureRange;
}

export interface CreateLocationDto {
  zoneId: string;
  code: string;
  type: LocationType;
  capacity: LocationCapacity;
}

export interface CreateBatchDto {
  itemId: string;
  batchNumber: string;
  lotNumber?: string;
  quantity: number;
  unitCost: number;
  manufacturingDate?: Date;
  expiryDate?: Date;
  supplierId?: string;
  supplierBatchRef?: string;
  locationId?: string;
}

export interface CreateMovementDto {
  type: MovementType;
  itemId: string;
  batchId?: string;
  quantity: number;
  unitCost?: number;
  fromLocationId?: string;
  toLocationId?: string;
  referenceType: ReferenceType;
  referenceId: string;
  reason?: string;
  notes?: string;
  rfidTagIds?: string[];
}

export interface StockReceiptDto {
  itemId: string;
  quantity: number;
  unitCost: number;
  batchNumber?: string;
  lotNumber?: string;
  expiryDate?: Date;
  locationId?: string;
  purchaseOrderId?: string;
  supplierId?: string;
  notes?: string;
}

export interface StockIssueDto {
  itemId: string;
  quantity: number;
  batchId?: string;
  fromLocationId?: string;
  salesOrderId?: string;
  reason?: string;
  notes?: string;
}

// =================== INVENTORY SERVICE ===================

@Injectable()
export class InventoryService {
  // In-memory storage for development/testing
  private items = new Map<string, InventoryItem>();
  private warehouses = new Map<string, Warehouse>();
  private zones = new Map<string, WarehouseZone>();
  private locations = new Map<string, StorageLocation>();
  private batches = new Map<string, Batch>();
  private serialNumbers = new Map<string, SerialNumber>();
  private rfidTags = new Map<string, RFIDTag>();
  private qrCodes = new Map<string, QRCodeData>();
  private movements = new Map<string, StockMovement>();
  private alerts = new Map<string, StockAlert>();
  private reorderRules = new Map<string, ReorderRule>();
  private valuations = new Map<string, InventoryValuation>();
  private cycleCounts = new Map<string, CycleCount>();
  private rfidReaders = new Map<string, RFIDReader>();
  private readEvents = new Map<string, RFIDReadEvent>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.initializeDefaults();
  }

  // Reset state for testing
  resetState(): void {
    this.items.clear();
    this.warehouses.clear();
    this.zones.clear();
    this.locations.clear();
    this.batches.clear();
    this.serialNumbers.clear();
    this.rfidTags.clear();
    this.qrCodes.clear();
    this.movements.clear();
    this.alerts.clear();
    this.reorderRules.clear();
    this.valuations.clear();
    this.cycleCounts.clear();
    this.rfidReaders.clear();
    this.readEvents.clear();
    this.initializeDefaults();
  }

  private initializeDefaults(): void {
    // Create default warehouse
    const defaultWarehouse: Warehouse = {
      id: 'wh-default',
      name: 'Depozit Principal București',
      code: 'BUC-01',
      address: {
        street: 'Str. Industriei 100',
        city: 'București',
        county: 'București',
        postalCode: '031225',
        country: 'România',
        latitude: 44.4268,
        longitude: 26.1025,
      },
      type: 'MAIN',
      totalArea: 5000,
      usableArea: 4200,
      zones: [],
      isActive: true,
      operatingHours: {
        monday: { isOpen: true, openTime: '07:00', closeTime: '19:00' },
        tuesday: { isOpen: true, openTime: '07:00', closeTime: '19:00' },
        wednesday: { isOpen: true, openTime: '07:00', closeTime: '19:00' },
        thursday: { isOpen: true, openTime: '07:00', closeTime: '19:00' },
        friday: { isOpen: true, openTime: '07:00', closeTime: '17:00' },
        saturday: { isOpen: true, openTime: '08:00', closeTime: '14:00' },
        sunday: { isOpen: false },
      },
      capabilities: ['ECOMMERCE_FULFILLMENT', 'VALUE_ADDED_SERVICES', 'CROSS_DOCKING'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.warehouses.set(defaultWarehouse.id, defaultWarehouse);

    // Create default zones
    const zones: WarehouseZone[] = [
      {
        id: 'zone-receiving',
        warehouseId: 'wh-default',
        name: 'Zona Recepție',
        code: 'REC',
        type: 'RECEIVING',
        area: 500,
        locations: [],
        isActive: true,
      },
      {
        id: 'zone-storage-a',
        warehouseId: 'wh-default',
        name: 'Zona Stocare A',
        code: 'STO-A',
        type: 'STORAGE',
        area: 2000,
        locations: [],
        isActive: true,
      },
      {
        id: 'zone-storage-b',
        warehouseId: 'wh-default',
        name: 'Zona Stocare B',
        code: 'STO-B',
        type: 'STORAGE',
        area: 1500,
        locations: [],
        isActive: true,
      },
      {
        id: 'zone-picking',
        warehouseId: 'wh-default',
        name: 'Zona Picking',
        code: 'PICK',
        type: 'PICKING',
        area: 400,
        locations: [],
        isActive: true,
      },
      {
        id: 'zone-shipping',
        warehouseId: 'wh-default',
        name: 'Zona Expediere',
        code: 'SHIP',
        type: 'SHIPPING',
        area: 300,
        locations: [],
        isActive: true,
      },
      {
        id: 'zone-cold',
        warehouseId: 'wh-default',
        name: 'Zona Refrigerată',
        code: 'COLD',
        type: 'COLD',
        area: 200,
        temperatureRange: { min: 2, max: 8, unit: 'C' },
        locations: [],
        isActive: true,
      },
    ];

    zones.forEach(zone => {
      this.zones.set(zone.id, zone);
      defaultWarehouse.zones.push(zone);
    });

    // Create sample locations
    const locations: StorageLocation[] = [
      {
        id: 'loc-a-01-01',
        zoneId: 'zone-storage-a',
        code: 'A-01-01-01',
        type: 'RACK',
        capacity: { maxWeight: 1000, maxVolume: 4, maxPallets: 4 },
        currentUtilization: 0,
        assignedItems: [],
        isActive: true,
        isBlocked: false,
      },
      {
        id: 'loc-a-01-02',
        zoneId: 'zone-storage-a',
        code: 'A-01-01-02',
        type: 'RACK',
        capacity: { maxWeight: 1000, maxVolume: 4, maxPallets: 4 },
        currentUtilization: 0,
        assignedItems: [],
        isActive: true,
        isBlocked: false,
      },
      {
        id: 'loc-b-01-01',
        zoneId: 'zone-storage-b',
        code: 'B-01-01-01',
        type: 'BULK_STORAGE',
        capacity: { maxWeight: 5000, maxVolume: 20 },
        currentUtilization: 0,
        assignedItems: [],
        isActive: true,
        isBlocked: false,
      },
      {
        id: 'loc-pick-01',
        zoneId: 'zone-picking',
        code: 'PICK-01',
        type: 'PICK_FACE',
        capacity: { maxWeight: 200, maxVolume: 1, maxItems: 100 },
        currentUtilization: 0,
        assignedItems: [],
        isActive: true,
        isBlocked: false,
      },
    ];

    locations.forEach(loc => {
      this.locations.set(loc.id, loc);
      const zone = this.zones.get(loc.zoneId);
      if (zone) {
        zone.locations.push(loc);
      }
    });

    // Create sample RFID readers
    const readers: RFIDReader[] = [
      {
        id: 'reader-portal-1',
        name: 'Portal Recepție',
        serialNumber: 'RFID-2024-001',
        model: 'FX9600',
        manufacturer: 'Zebra',
        type: 'PORTAL',
        warehouseId: 'wh-default',
        locationId: 'zone-receiving',
        ipAddress: '192.168.1.100',
        port: 5084,
        antennaCount: 4,
        status: 'ONLINE',
        lastHeartbeat: new Date(),
        firmwareVersion: '3.2.45',
        configuration: {
          readPower: 30,
          frequency: '865-868 MHz',
          readInterval: 100,
          filterDuplicates: true,
          duplicateWindow: 3000,
          antennaSettings: [
            { antennaId: 1, isEnabled: true, readPower: 30 },
            { antennaId: 2, isEnabled: true, readPower: 30 },
            { antennaId: 3, isEnabled: true, readPower: 28 },
            { antennaId: 4, isEnabled: true, readPower: 28 },
          ],
        },
        createdAt: new Date(),
      },
      {
        id: 'reader-portal-2',
        name: 'Portal Expediere',
        serialNumber: 'RFID-2024-002',
        model: 'FX9600',
        manufacturer: 'Zebra',
        type: 'PORTAL',
        warehouseId: 'wh-default',
        locationId: 'zone-shipping',
        ipAddress: '192.168.1.101',
        port: 5084,
        antennaCount: 4,
        status: 'ONLINE',
        lastHeartbeat: new Date(),
        firmwareVersion: '3.2.45',
        configuration: {
          readPower: 30,
          frequency: '865-868 MHz',
          readInterval: 100,
          filterDuplicates: true,
          duplicateWindow: 3000,
          antennaSettings: [
            { antennaId: 1, isEnabled: true, readPower: 30 },
            { antennaId: 2, isEnabled: true, readPower: 30 },
            { antennaId: 3, isEnabled: true, readPower: 28 },
            { antennaId: 4, isEnabled: true, readPower: 28 },
          ],
        },
        createdAt: new Date(),
      },
      {
        id: 'reader-handheld-1',
        name: 'Cititor Mobil #1',
        serialNumber: 'RFID-2024-HH1',
        model: 'MC3330R',
        manufacturer: 'Zebra',
        type: 'HANDHELD',
        warehouseId: 'wh-default',
        antennaCount: 1,
        status: 'ONLINE',
        lastHeartbeat: new Date(),
        firmwareVersion: '2.1.15',
        configuration: {
          readPower: 25,
          frequency: '865-868 MHz',
          readInterval: 200,
          filterDuplicates: true,
          duplicateWindow: 2000,
          antennaSettings: [
            { antennaId: 1, isEnabled: true, readPower: 25 },
          ],
        },
        createdAt: new Date(),
      },
    ];

    readers.forEach(reader => this.rfidReaders.set(reader.id, reader));

    // Create sample inventory items
    const sampleItems: InventoryItem[] = [
      {
        id: 'item-laptop-1',
        sku: 'ELEC-LAP-001',
        name: 'Laptop Business HP ProBook',
        description: 'Laptop profesional HP ProBook 450 G8, i5, 16GB RAM, 512GB SSD',
        category: 'MERCHANDISE',
        unit: 'PIECE',
        currentStock: 50,
        reservedStock: 5,
        availableStock: 45,
        minStockLevel: 10,
        maxStockLevel: 100,
        reorderPoint: 15,
        reorderQuantity: 30,
        unitCost: 3500,
        currency: 'RON',
        weight: 2.1,
        dimensions: { length: 36, width: 24, height: 2.5, unit: 'cm' },
        barcodeType: 'EAN13',
        barcode: '5901234123457',
        rfidTag: 'E280-1234-5678-0001',
        qrCode: 'QR-ELEC-LAP-001',
        warehouseId: 'wh-default',
        zoneId: 'zone-storage-a',
        locationId: 'loc-a-01-01',
        isActive: true,
        isPerishable: false,
        requiresSerialNumber: true,
        requiresBatchTracking: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'item-paper-1',
        sku: 'OFF-PAP-A4-80',
        name: 'Hârtie A4 80g/mp',
        description: 'Hârtie copiator A4, 80g/mp, 500 coli/top',
        category: 'CONSUMABLES',
        unit: 'BOX',
        currentStock: 200,
        reservedStock: 20,
        availableStock: 180,
        minStockLevel: 50,
        maxStockLevel: 500,
        reorderPoint: 80,
        reorderQuantity: 100,
        unitCost: 25,
        currency: 'RON',
        weight: 2.5,
        dimensions: { length: 30, width: 22, height: 5, unit: 'cm' },
        barcodeType: 'EAN13',
        barcode: '5901234123458',
        qrCode: 'QR-OFF-PAP-A4-80',
        warehouseId: 'wh-default',
        zoneId: 'zone-storage-b',
        locationId: 'loc-b-01-01',
        isActive: true,
        isPerishable: false,
        requiresSerialNumber: false,
        requiresBatchTracking: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'item-milk-1',
        sku: 'FOOD-MLK-1L',
        name: 'Lapte UHT 3.5% 1L',
        description: 'Lapte UHT integral 3.5% grăsime, 1 litru',
        category: 'MERCHANDISE',
        unit: 'PIECE',
        currentStock: 500,
        reservedStock: 50,
        availableStock: 450,
        minStockLevel: 100,
        maxStockLevel: 1000,
        reorderPoint: 200,
        reorderQuantity: 300,
        unitCost: 8,
        currency: 'RON',
        weight: 1.03,
        dimensions: { length: 7, width: 7, height: 20, unit: 'cm' },
        barcodeType: 'EAN13',
        barcode: '5901234123459',
        rfidTag: 'E280-1234-5678-0003',
        warehouseId: 'wh-default',
        zoneId: 'zone-cold',
        isActive: true,
        isPerishable: true,
        requiresSerialNumber: false,
        requiresBatchTracking: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    sampleItems.forEach(item => this.items.set(item.id, item));

    // Create sample batches for perishable items
    const sampleBatches: Batch[] = [
      {
        id: 'batch-milk-001',
        itemId: 'item-milk-1',
        batchNumber: 'MLK-2025-001',
        lotNumber: 'LOT-001',
        quantity: 300,
        reservedQuantity: 30,
        availableQuantity: 270,
        unitCost: 8,
        manufacturingDate: new Date('2025-01-01'),
        expiryDate: new Date('2025-03-01'),
        receivedDate: new Date('2025-01-05'),
        qualityStatus: 'APPROVED',
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 'batch-milk-002',
        itemId: 'item-milk-1',
        batchNumber: 'MLK-2025-002',
        lotNumber: 'LOT-002',
        quantity: 200,
        reservedQuantity: 20,
        availableQuantity: 180,
        unitCost: 8.2,
        manufacturingDate: new Date('2025-01-10'),
        expiryDate: new Date('2025-03-10'),
        receivedDate: new Date('2025-01-12'),
        qualityStatus: 'APPROVED',
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 'batch-paper-001',
        itemId: 'item-paper-1',
        batchNumber: 'PAP-2024-015',
        quantity: 200,
        reservedQuantity: 20,
        availableQuantity: 180,
        unitCost: 25,
        receivedDate: new Date('2024-12-15'),
        qualityStatus: 'APPROVED',
        isActive: true,
        createdAt: new Date(),
      },
    ];

    sampleBatches.forEach(batch => this.batches.set(batch.id, batch));

    // Create reorder rules
    const reorderRules: ReorderRule[] = [
      {
        id: 'rule-laptop-1',
        itemId: 'item-laptop-1',
        isEnabled: true,
        reorderPoint: 15,
        reorderQuantity: 30,
        maxOrderQuantity: 50,
        leadTimeDays: 7,
        safetyStockDays: 3,
        reviewFrequency: 'DAILY',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'rule-paper-1',
        itemId: 'item-paper-1',
        isEnabled: true,
        reorderPoint: 80,
        reorderQuantity: 100,
        maxOrderQuantity: 200,
        leadTimeDays: 3,
        safetyStockDays: 2,
        reviewFrequency: 'WEEKLY',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'rule-milk-1',
        itemId: 'item-milk-1',
        isEnabled: true,
        reorderPoint: 200,
        reorderQuantity: 300,
        maxOrderQuantity: 500,
        leadTimeDays: 1,
        safetyStockDays: 1,
        reviewFrequency: 'DAILY',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    reorderRules.forEach(rule => this.reorderRules.set(rule.id, rule));
  }

  // =================== INVENTORY ITEM OPERATIONS ===================

  async createItem(dto: CreateItemDto): Promise<InventoryItem> {
    // Check for duplicate SKU
    const existingBySku = Array.from(this.items.values()).find(i => i.sku === dto.sku);
    if (existingBySku) {
      throw new BadRequestException(`Articol cu SKU ${dto.sku} există deja`);
    }

    const id = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const barcode = dto.barcode || this.generateBarcode(dto.barcodeType || 'EAN13');
    const qrCode = this.generateQRCode('ITEM', id);

    const item: InventoryItem = {
      id,
      sku: dto.sku,
      name: dto.name,
      description: dto.description || '',
      category: dto.category,
      unit: dto.unit,
      currentStock: 0,
      reservedStock: 0,
      availableStock: 0,
      minStockLevel: dto.minStockLevel || 0,
      maxStockLevel: dto.maxStockLevel || 9999,
      reorderPoint: dto.reorderPoint || 0,
      reorderQuantity: dto.reorderQuantity || 1,
      unitCost: dto.unitCost,
      currency: dto.currency || 'RON',
      weight: dto.weight || 0,
      dimensions: dto.dimensions || { length: 0, width: 0, height: 0, unit: 'cm' },
      barcodeType: dto.barcodeType || 'EAN13',
      barcode,
      qrCode,
      warehouseId: dto.warehouseId,
      zoneId: dto.zoneId,
      locationId: dto.locationId,
      supplierId: dto.supplierId,
      isActive: true,
      isPerishable: dto.isPerishable || false,
      requiresSerialNumber: dto.requiresSerialNumber || false,
      requiresBatchTracking: dto.requiresBatchTracking || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.items.set(id, item);

    // Create default reorder rule
    if (dto.reorderPoint && dto.reorderPoint > 0) {
      await this.createReorderRule({
        itemId: id,
        isEnabled: true,
        reorderPoint: dto.reorderPoint,
        reorderQuantity: dto.reorderQuantity || Math.ceil(dto.reorderPoint * 1.5),
        leadTimeDays: 3,
        safetyStockDays: 2,
        reviewFrequency: 'WEEKLY',
      });
    }

    return item;
  }

  async getItems(filters?: {
    category?: InventoryCategory;
    warehouseId?: string;
    zoneId?: string;
    isActive?: boolean;
    lowStock?: boolean;
    search?: string;
  }): Promise<InventoryItem[]> {
    let items = Array.from(this.items.values());

    if (filters) {
      if (filters.category) {
        items = items.filter(i => i.category === filters.category);
      }
      if (filters.warehouseId) {
        items = items.filter(i => i.warehouseId === filters.warehouseId);
      }
      if (filters.zoneId) {
        items = items.filter(i => i.zoneId === filters.zoneId);
      }
      if (filters.isActive !== undefined) {
        items = items.filter(i => i.isActive === filters.isActive);
      }
      if (filters.lowStock) {
        items = items.filter(i => i.currentStock <= i.reorderPoint);
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        items = items.filter(i =>
          i.name.toLowerCase().includes(searchLower) ||
          i.sku.toLowerCase().includes(searchLower) ||
          i.barcode.includes(searchLower)
        );
      }
    }

    return items;
  }

  async getItemById(id: string): Promise<InventoryItem> {
    const item = this.items.get(id);
    if (!item) {
      throw new NotFoundException(`Articol cu ID ${id} nu a fost găsit`);
    }
    return item;
  }

  async getItemBySku(sku: string): Promise<InventoryItem> {
    const item = Array.from(this.items.values()).find(i => i.sku === sku);
    if (!item) {
      throw new NotFoundException(`Articol cu SKU ${sku} nu a fost găsit`);
    }
    return item;
  }

  async getItemByBarcode(barcode: string): Promise<InventoryItem> {
    const item = Array.from(this.items.values()).find(i => i.barcode === barcode);
    if (!item) {
      throw new NotFoundException(`Articol cu cod de bare ${barcode} nu a fost găsit`);
    }
    return item;
  }

  async updateItem(id: string, updates: Partial<CreateItemDto>): Promise<InventoryItem> {
    const item = await this.getItemById(id);

    // Check for duplicate SKU if updating
    if (updates.sku && updates.sku !== item.sku) {
      const existingBySku = Array.from(this.items.values()).find(i => i.sku === updates.sku && i.id !== id);
      if (existingBySku) {
        throw new BadRequestException(`Articol cu SKU ${updates.sku} există deja`);
      }
    }

    const updatedItem: InventoryItem = {
      ...item,
      ...updates,
      updatedAt: new Date(),
    };

    this.items.set(id, updatedItem);
    return updatedItem;
  }

  async deactivateItem(id: string): Promise<InventoryItem> {
    const item = await this.getItemById(id);
    item.isActive = false;
    item.updatedAt = new Date();
    this.items.set(id, item);
    return item;
  }

  // =================== WAREHOUSE OPERATIONS ===================

  async createWarehouse(dto: CreateWarehouseDto): Promise<Warehouse> {
    // Check for duplicate code
    const existingByCode = Array.from(this.warehouses.values()).find(w => w.code === dto.code);
    if (existingByCode) {
      throw new BadRequestException(`Depozit cu codul ${dto.code} există deja`);
    }

    const id = `wh-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const warehouse: Warehouse = {
      id,
      name: dto.name,
      code: dto.code,
      address: dto.address,
      type: dto.type,
      totalArea: dto.totalArea,
      usableArea: dto.usableArea || dto.totalArea * 0.85,
      zones: [],
      isActive: true,
      managerId: dto.managerId,
      operatingHours: dto.operatingHours || this.getDefaultOperatingHours(),
      capabilities: dto.capabilities || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.warehouses.set(id, warehouse);
    return warehouse;
  }

  async getWarehouses(filters?: { isActive?: boolean; type?: WarehouseType }): Promise<Warehouse[]> {
    let warehouses = Array.from(this.warehouses.values());

    if (filters) {
      if (filters.isActive !== undefined) {
        warehouses = warehouses.filter(w => w.isActive === filters.isActive);
      }
      if (filters.type) {
        warehouses = warehouses.filter(w => w.type === filters.type);
      }
    }

    return warehouses;
  }

  async getWarehouseById(id: string): Promise<Warehouse> {
    const warehouse = this.warehouses.get(id);
    if (!warehouse) {
      throw new NotFoundException(`Depozit cu ID ${id} nu a fost găsit`);
    }
    return warehouse;
  }

  private getDefaultOperatingHours(): OperatingHours {
    return {
      monday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
      tuesday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
      wednesday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
      thursday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
      friday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
      saturday: { isOpen: false },
      sunday: { isOpen: false },
    };
  }

  // =================== ZONE OPERATIONS ===================

  async createZone(dto: CreateZoneDto): Promise<WarehouseZone> {
    const warehouse = await this.getWarehouseById(dto.warehouseId);

    // Check for duplicate code in warehouse
    const existingByCode = warehouse.zones.find(z => z.code === dto.code);
    if (existingByCode) {
      throw new BadRequestException(`Zonă cu codul ${dto.code} există deja în acest depozit`);
    }

    const id = `zone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const zone: WarehouseZone = {
      id,
      warehouseId: dto.warehouseId,
      name: dto.name,
      code: dto.code,
      type: dto.type,
      area: dto.area || 0,
      temperatureRange: dto.temperatureRange,
      locations: [],
      isActive: true,
    };

    this.zones.set(id, zone);
    warehouse.zones.push(zone);

    return zone;
  }

  async getZones(warehouseId: string): Promise<WarehouseZone[]> {
    return Array.from(this.zones.values()).filter(z => z.warehouseId === warehouseId);
  }

  async getZoneById(id: string): Promise<WarehouseZone> {
    const zone = this.zones.get(id);
    if (!zone) {
      throw new NotFoundException(`Zonă cu ID ${id} nu a fost găsită`);
    }
    return zone;
  }

  // =================== LOCATION OPERATIONS ===================

  async createLocation(dto: CreateLocationDto): Promise<StorageLocation> {
    const zone = await this.getZoneById(dto.zoneId);

    // Check for duplicate code in zone
    const existingByCode = zone.locations.find(l => l.code === dto.code);
    if (existingByCode) {
      throw new BadRequestException(`Locație cu codul ${dto.code} există deja în această zonă`);
    }

    const id = `loc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const location: StorageLocation = {
      id,
      zoneId: dto.zoneId,
      code: dto.code,
      type: dto.type,
      capacity: dto.capacity,
      currentUtilization: 0,
      assignedItems: [],
      isActive: true,
      isBlocked: false,
    };

    this.locations.set(id, location);
    zone.locations.push(location);

    return location;
  }

  async getLocations(zoneId?: string): Promise<StorageLocation[]> {
    let locations = Array.from(this.locations.values());

    if (zoneId) {
      locations = locations.filter(l => l.zoneId === zoneId);
    }

    return locations;
  }

  async getLocationById(id: string): Promise<StorageLocation> {
    const location = this.locations.get(id);
    if (!location) {
      throw new NotFoundException(`Locație cu ID ${id} nu a fost găsită`);
    }
    return location;
  }

  async blockLocation(id: string, reason: string): Promise<StorageLocation> {
    const location = await this.getLocationById(id);
    location.isBlocked = true;
    location.blockReason = reason;
    this.locations.set(id, location);
    return location;
  }

  async unblockLocation(id: string): Promise<StorageLocation> {
    const location = await this.getLocationById(id);
    location.isBlocked = false;
    location.blockReason = undefined;
    this.locations.set(id, location);
    return location;
  }

  // =================== BATCH OPERATIONS ===================

  async createBatch(dto: CreateBatchDto): Promise<Batch> {
    const item = await this.getItemById(dto.itemId);

    const id = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const batch: Batch = {
      id,
      itemId: dto.itemId,
      batchNumber: dto.batchNumber,
      lotNumber: dto.lotNumber,
      quantity: dto.quantity,
      reservedQuantity: 0,
      availableQuantity: dto.quantity,
      unitCost: dto.unitCost,
      manufacturingDate: dto.manufacturingDate,
      expiryDate: dto.expiryDate,
      receivedDate: new Date(),
      supplierId: dto.supplierId,
      supplierBatchRef: dto.supplierBatchRef,
      qualityStatus: 'PENDING',
      locationId: dto.locationId,
      isActive: true,
      createdAt: new Date(),
    };

    this.batches.set(id, batch);

    // Update item stock
    item.currentStock += dto.quantity;
    item.availableStock += dto.quantity;
    item.updatedAt = new Date();
    this.items.set(item.id, item);

    // Check for expiry alert if perishable
    if (item.isPerishable && dto.expiryDate) {
      await this.checkExpiryAlert(item, batch);
    }

    return batch;
  }

  async getBatches(itemId?: string, status?: QualityStatus): Promise<Batch[]> {
    let batches = Array.from(this.batches.values());

    if (itemId) {
      batches = batches.filter(b => b.itemId === itemId);
    }
    if (status) {
      batches = batches.filter(b => b.qualityStatus === status);
    }

    return batches.sort((a, b) => {
      // FIFO - sort by received date
      return new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime();
    });
  }

  async getBatchById(id: string): Promise<Batch> {
    const batch = this.batches.get(id);
    if (!batch) {
      throw new NotFoundException(`Lot cu ID ${id} nu a fost găsit`);
    }
    return batch;
  }

  async updateBatchQualityStatus(id: string, status: QualityStatus, notes?: string): Promise<Batch> {
    const batch = await this.getBatchById(id);
    batch.qualityStatus = status;
    if (notes) {
      batch.qualityNotes = notes;
    }
    this.batches.set(id, batch);
    return batch;
  }

  async getExpiringBatches(daysAhead: number = 30): Promise<Batch[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

    return Array.from(this.batches.values())
      .filter(b =>
        b.isActive &&
        b.expiryDate &&
        new Date(b.expiryDate) <= cutoffDate &&
        b.qualityStatus !== 'EXPIRED'
      )
      .sort((a, b) =>
        new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime()
      );
  }

  private async checkExpiryAlert(item: InventoryItem, batch: Batch): Promise<void> {
    if (!batch.expiryDate) return;

    const now = new Date();
    const expiryDate = new Date(batch.expiryDate);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry <= 0) {
      await this.createAlert(item.id, 'EXPIRED', 'CRITICAL',
        `Lotul ${batch.batchNumber} pentru ${item.name} a expirat`);
      batch.qualityStatus = 'EXPIRED';
      this.batches.set(batch.id, batch);
    } else if (daysUntilExpiry <= 7) {
      await this.createAlert(item.id, 'EXPIRY_IMMINENT', 'HIGH',
        `Lotul ${batch.batchNumber} pentru ${item.name} expiră în ${daysUntilExpiry} zile`);
    } else if (daysUntilExpiry <= 30) {
      await this.createAlert(item.id, 'EXPIRY_WARNING', 'MEDIUM',
        `Lotul ${batch.batchNumber} pentru ${item.name} expiră în ${daysUntilExpiry} zile`);
    }
  }

  // =================== SERIAL NUMBER OPERATIONS ===================

  async registerSerialNumber(
    itemId: string,
    serialNumber: string,
    batchId?: string
  ): Promise<SerialNumber> {
    const item = await this.getItemById(itemId);

    if (!item.requiresSerialNumber) {
      throw new BadRequestException(`Articolul ${item.name} nu necesită numere de serie`);
    }

    // Check for duplicate
    const existing = Array.from(this.serialNumbers.values())
      .find(s => s.serialNumber === serialNumber && s.itemId === itemId);
    if (existing) {
      throw new BadRequestException(`Număr de serie ${serialNumber} există deja pentru acest articol`);
    }

    const id = `serial-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const serial: SerialNumber = {
      id,
      itemId,
      serialNumber,
      batchId,
      status: 'IN_STOCK',
      receivedDate: new Date(),
    };

    this.serialNumbers.set(id, serial);
    return serial;
  }

  async getSerialNumbers(itemId: string): Promise<SerialNumber[]> {
    return Array.from(this.serialNumbers.values())
      .filter(s => s.itemId === itemId);
  }

  async updateSerialNumberStatus(
    serialNumber: string,
    status: SerialStatus,
    customerId?: string
  ): Promise<SerialNumber> {
    const serial = Array.from(this.serialNumbers.values())
      .find(s => s.serialNumber === serialNumber);

    if (!serial) {
      throw new NotFoundException(`Număr de serie ${serialNumber} nu a fost găsit`);
    }

    serial.status = status;
    if (status === 'SOLD' && customerId) {
      serial.soldDate = new Date();
      serial.customerId = customerId;
    }

    this.serialNumbers.set(serial.id, serial);
    return serial;
  }

  // =================== RFID OPERATIONS ===================

  async registerRFIDTag(
    tagId: string,
    type: RFIDTagType,
    referenceId: string
  ): Promise<RFIDTag> {
    // Check for duplicate
    const existing = this.rfidTags.get(tagId);
    if (existing) {
      throw new BadRequestException(`Tag RFID ${tagId} este deja înregistrat`);
    }

    const id = `rfid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const tag: RFIDTag = {
      id,
      tagId,
      type,
      status: 'ACTIVE',
      readCount: 0,
      createdAt: new Date(),
    };

    // Associate with reference based on type
    switch (type) {
      case 'ITEM':
        tag.itemId = referenceId;
        const item = this.items.get(referenceId);
        if (item) {
          item.rfidTag = tagId;
          this.items.set(referenceId, item);
        }
        break;
      case 'BATCH':
        tag.batchId = referenceId;
        break;
      case 'LOCATION':
        tag.locationId = referenceId;
        break;
      case 'ASSET':
        tag.assetId = referenceId;
        break;
    }

    this.rfidTags.set(tagId, tag);
    return tag;
  }

  async getRFIDTags(filters?: { type?: RFIDTagType; status?: RFIDStatus }): Promise<RFIDTag[]> {
    let tags = Array.from(this.rfidTags.values());

    if (filters) {
      if (filters.type) {
        tags = tags.filter(t => t.type === filters.type);
      }
      if (filters.status) {
        tags = tags.filter(t => t.status === filters.status);
      }
    }

    return tags;
  }

  async getRFIDTagByTagId(tagId: string): Promise<RFIDTag> {
    const tag = this.rfidTags.get(tagId);
    if (!tag) {
      throw new NotFoundException(`Tag RFID ${tagId} nu a fost găsit`);
    }
    return tag;
  }

  async processRFIDRead(readerId: string, tagId: string, antennaId: number, rssi: number): Promise<RFIDReadEvent> {
    const reader = this.rfidReaders.get(readerId);
    if (!reader) {
      throw new NotFoundException(`Cititor RFID ${readerId} nu a fost găsit`);
    }

    const id = `read-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const event: RFIDReadEvent = {
      id,
      readerId,
      tagId,
      antennaId,
      rssi,
      timestamp: new Date(),
    };

    this.readEvents.set(id, event);

    // Update tag if exists
    const tag = this.rfidTags.get(tagId);
    if (tag) {
      tag.lastReadAt = new Date();
      tag.lastReadLocation = reader.locationId;
      tag.readCount++;
      this.rfidTags.set(tagId, tag);

      // Update item location if it's an item tag
      if (tag.itemId && reader.locationId) {
        const item = this.items.get(tag.itemId);
        if (item) {
          item.locationId = reader.locationId;
          item.updatedAt = new Date();
          this.items.set(item.id, item);
        }
      }

      event.processedAt = new Date();
      event.processingResult = 'LOCATION_UPDATED';
    } else {
      event.processedAt = new Date();
      event.processingResult = 'UNKNOWN_TAG';
    }

    this.readEvents.set(id, event);
    return event;
  }

  async getRFIDReaders(warehouseId?: string): Promise<RFIDReader[]> {
    let readers = Array.from(this.rfidReaders.values());

    if (warehouseId) {
      readers = readers.filter(r => r.warehouseId === warehouseId);
    }

    return readers;
  }

  async getRFIDReaderById(id: string): Promise<RFIDReader> {
    const reader = this.rfidReaders.get(id);
    if (!reader) {
      throw new NotFoundException(`Cititor RFID ${id} nu a fost găsit`);
    }
    return reader;
  }

  async updateReaderStatus(id: string, status: ReaderStatus): Promise<RFIDReader> {
    const reader = await this.getRFIDReaderById(id);
    reader.status = status;
    if (status === 'ONLINE') {
      reader.lastHeartbeat = new Date();
    }
    this.rfidReaders.set(id, reader);
    return reader;
  }

  // =================== QR CODE OPERATIONS ===================

  generateQRCode(type: QRCodeType, referenceId: string, additionalData?: Record<string, any>): string {
    const code = `QR-${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const qrData: QRCodeData = {
      id: `qr-${Date.now()}`,
      code,
      type,
      referenceId,
      data: {
        type,
        referenceId,
        generatedAt: new Date().toISOString(),
        ...additionalData,
      },
      generatedAt: new Date(),
      scanCount: 0,
    };

    this.qrCodes.set(code, qrData);
    return code;
  }

  async getQRCodeData(code: string): Promise<QRCodeData> {
    const qrData = this.qrCodes.get(code);
    if (!qrData) {
      throw new NotFoundException(`Cod QR ${code} nu a fost găsit`);
    }
    return qrData;
  }

  async processQRScan(code: string): Promise<{ type: QRCodeType; data: any }> {
    const qrData = await this.getQRCodeData(code);

    qrData.scanCount++;
    qrData.lastScannedAt = new Date();
    this.qrCodes.set(code, qrData);

    // Return associated data based on type
    let associatedData: any;

    switch (qrData.type) {
      case 'ITEM':
        associatedData = await this.getItemById(qrData.referenceId);
        break;
      case 'BATCH':
        associatedData = await this.getBatchById(qrData.referenceId);
        break;
      case 'LOCATION':
        associatedData = await this.getLocationById(qrData.referenceId);
        break;
      default:
        associatedData = qrData.data;
    }

    return {
      type: qrData.type,
      data: associatedData,
    };
  }

  generateBarcode(type: BarcodeType): string {
    switch (type) {
      case 'EAN13':
        return this.generateEAN13();
      case 'EAN8':
        return this.generateEAN8();
      case 'UPC':
        return this.generateUPC();
      case 'CODE128':
      case 'CODE39':
        return `${type}-${Date.now()}`;
      default:
        return `${type}-${Date.now()}`;
    }
  }

  private generateEAN13(): string {
    let code = '590'; // Romania prefix
    for (let i = 0; i < 9; i++) {
      code += Math.floor(Math.random() * 10);
    }
    code += this.calculateEANCheckDigit(code);
    return code;
  }

  private generateEAN8(): string {
    let code = '590';
    for (let i = 0; i < 4; i++) {
      code += Math.floor(Math.random() * 10);
    }
    code += this.calculateEANCheckDigit(code);
    return code;
  }

  private generateUPC(): string {
    let code = '0';
    for (let i = 0; i < 10; i++) {
      code += Math.floor(Math.random() * 10);
    }
    code += this.calculateEANCheckDigit(code);
    return code;
  }

  private calculateEANCheckDigit(code: string): string {
    let sum = 0;
    for (let i = 0; i < code.length; i++) {
      const digit = parseInt(code[i]);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit.toString();
  }

  // =================== STOCK MOVEMENT OPERATIONS ===================

  async receiveStock(dto: StockReceiptDto): Promise<StockMovement> {
    const item = await this.getItemById(dto.itemId);

    // Create batch if batch tracking required or batch number provided
    let batchId: string | undefined;
    if (item.requiresBatchTracking || dto.batchNumber) {
      const batch = await this.createBatch({
        itemId: dto.itemId,
        batchNumber: dto.batchNumber || `BATCH-${Date.now()}`,
        lotNumber: dto.lotNumber,
        quantity: dto.quantity,
        unitCost: dto.unitCost,
        expiryDate: dto.expiryDate,
        supplierId: dto.supplierId,
        locationId: dto.locationId,
      });
      batchId = batch.id;
    } else {
      // Update item stock directly
      item.currentStock += dto.quantity;
      item.availableStock += dto.quantity;
      item.updatedAt = new Date();
      this.items.set(item.id, item);
    }

    const movementId = `mov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const movement: StockMovement = {
      id: movementId,
      type: 'RECEIPT',
      itemId: dto.itemId,
      batchId,
      quantity: dto.quantity,
      unitCost: dto.unitCost,
      totalCost: dto.quantity * dto.unitCost,
      toLocationId: dto.locationId,
      referenceType: dto.purchaseOrderId ? 'PURCHASE_ORDER' : 'ADJUSTMENT',
      referenceId: dto.purchaseOrderId || movementId,
      notes: dto.notes,
      performedBy: 'system',
      performedAt: new Date(),
      status: 'COMPLETED',
    };

    this.movements.set(movementId, movement);

    // Check stock levels
    await this.checkStockLevels(item);

    return movement;
  }

  async issueStock(dto: StockIssueDto): Promise<StockMovement> {
    const item = await this.getItemById(dto.itemId);

    if (item.availableStock < dto.quantity) {
      throw new BadRequestException(
        `Stoc insuficient pentru ${item.name}. Disponibil: ${item.availableStock}, Solicitat: ${dto.quantity}`
      );
    }

    // If batch tracking, use FIFO to select batches
    if (item.requiresBatchTracking && !dto.batchId) {
      const batches = await this.getBatches(dto.itemId, 'APPROVED');
      let remainingQty = dto.quantity;

      for (const batch of batches) {
        if (remainingQty <= 0) break;

        const issueQty = Math.min(batch.availableQuantity, remainingQty);
        batch.quantity -= issueQty;
        batch.availableQuantity -= issueQty;
        this.batches.set(batch.id, batch);
        remainingQty -= issueQty;
      }
    } else if (dto.batchId) {
      const batch = await this.getBatchById(dto.batchId);
      if (batch.availableQuantity < dto.quantity) {
        throw new BadRequestException(
          `Stoc insuficient în lotul ${batch.batchNumber}. Disponibil: ${batch.availableQuantity}`
        );
      }
      batch.quantity -= dto.quantity;
      batch.availableQuantity -= dto.quantity;
      this.batches.set(batch.id, batch);
    }

    // Update item stock
    item.currentStock -= dto.quantity;
    item.availableStock -= dto.quantity;
    item.updatedAt = new Date();
    this.items.set(item.id, item);

    const movementId = `mov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const movement: StockMovement = {
      id: movementId,
      type: 'ISSUE',
      itemId: dto.itemId,
      batchId: dto.batchId,
      quantity: dto.quantity,
      unitCost: item.unitCost,
      totalCost: dto.quantity * item.unitCost,
      fromLocationId: dto.fromLocationId || item.locationId,
      referenceType: dto.salesOrderId ? 'SALES_ORDER' : 'ADJUSTMENT',
      referenceId: dto.salesOrderId || movementId,
      reason: dto.reason,
      notes: dto.notes,
      performedBy: 'system',
      performedAt: new Date(),
      status: 'COMPLETED',
    };

    this.movements.set(movementId, movement);

    // Check stock levels
    await this.checkStockLevels(item);

    return movement;
  }

  async transferStock(
    itemId: string,
    quantity: number,
    fromLocationId: string,
    toLocationId: string,
    batchId?: string,
    notes?: string
  ): Promise<StockMovement> {
    const item = await this.getItemById(itemId);
    const fromLocation = await this.getLocationById(fromLocationId);
    const toLocation = await this.getLocationById(toLocationId);

    if (toLocation.isBlocked) {
      throw new BadRequestException(`Locația destinație ${toLocation.code} este blocată`);
    }

    const movementId = `mov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const movement: StockMovement = {
      id: movementId,
      type: 'TRANSFER',
      itemId,
      batchId,
      quantity,
      unitCost: item.unitCost,
      totalCost: quantity * item.unitCost,
      fromLocationId,
      toLocationId,
      referenceType: 'TRANSFER_ORDER',
      referenceId: movementId,
      notes,
      performedBy: 'system',
      performedAt: new Date(),
      status: 'COMPLETED',
    };

    // Update item location if full transfer
    if (item.locationId === fromLocationId) {
      item.locationId = toLocationId;
      item.updatedAt = new Date();
      this.items.set(item.id, item);
    }

    // Update location utilization
    fromLocation.assignedItems = fromLocation.assignedItems.filter(id => id !== itemId);
    toLocation.assignedItems.push(itemId);
    this.locations.set(fromLocationId, fromLocation);
    this.locations.set(toLocationId, toLocation);

    this.movements.set(movementId, movement);
    return movement;
  }

  async adjustStock(
    itemId: string,
    quantity: number,
    reason: string,
    batchId?: string
  ): Promise<StockMovement> {
    const item = await this.getItemById(itemId);
    const adjustmentType = quantity >= 0 ? 'RECEIPT' : 'ISSUE';

    // Update item stock
    item.currentStock += quantity;
    item.availableStock += quantity;
    item.updatedAt = new Date();
    this.items.set(item.id, item);

    // Update batch if specified
    if (batchId) {
      const batch = await this.getBatchById(batchId);
      batch.quantity += quantity;
      batch.availableQuantity += quantity;
      this.batches.set(batchId, batch);
    }

    const movementId = `mov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const movement: StockMovement = {
      id: movementId,
      type: 'ADJUSTMENT',
      itemId,
      batchId,
      quantity: Math.abs(quantity),
      unitCost: item.unitCost,
      totalCost: Math.abs(quantity) * item.unitCost,
      referenceType: 'ADJUSTMENT',
      referenceId: movementId,
      reason,
      performedBy: 'system',
      performedAt: new Date(),
      status: 'COMPLETED',
    };

    this.movements.set(movementId, movement);

    // Check stock levels
    await this.checkStockLevels(item);

    return movement;
  }

  async getMovements(filters?: {
    itemId?: string;
    type?: MovementType;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<StockMovement[]> {
    let movements = Array.from(this.movements.values());

    if (filters) {
      if (filters.itemId) {
        movements = movements.filter(m => m.itemId === filters.itemId);
      }
      if (filters.type) {
        movements = movements.filter(m => m.type === filters.type);
      }
      if (filters.fromDate) {
        movements = movements.filter(m => new Date(m.performedAt) >= filters.fromDate!);
      }
      if (filters.toDate) {
        movements = movements.filter(m => new Date(m.performedAt) <= filters.toDate!);
      }
    }

    return movements.sort((a, b) =>
      new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
    );
  }

  // =================== STOCK ALERTS ===================

  private async createAlert(
    itemId: string,
    type: AlertType,
    severity: AlertSeverity,
    message: string
  ): Promise<StockAlert> {
    const id = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const alert: StockAlert = {
      id,
      itemId,
      type,
      severity,
      message,
      triggeredAt: new Date(),
      autoReorderTriggered: false,
    };

    this.alerts.set(id, alert);
    return alert;
  }

  private async checkStockLevels(item: InventoryItem): Promise<void> {
    // Check for out of stock
    if (item.currentStock <= 0) {
      await this.createAlert(item.id, 'OUT_OF_STOCK', 'CRITICAL',
        `${item.name} (${item.sku}) este fără stoc`);
      return;
    }

    // Check for low stock
    if (item.currentStock <= item.minStockLevel) {
      await this.createAlert(item.id, 'LOW_STOCK', 'HIGH',
        `${item.name} (${item.sku}) are stoc scăzut: ${item.currentStock} ${item.unit}`);
    }

    // Check for reorder point
    if (item.currentStock <= item.reorderPoint) {
      const alert = await this.createAlert(item.id, 'REORDER_POINT', 'MEDIUM',
        `${item.name} (${item.sku}) a atins punctul de reaprovizionare`);

      // Trigger auto-reorder if enabled
      const rule = Array.from(this.reorderRules.values())
        .find(r => r.itemId === item.id && r.isEnabled);

      if (rule) {
        alert.autoReorderTriggered = true;
        rule.lastTriggeredAt = new Date();
        this.reorderRules.set(rule.id, rule);
        this.alerts.set(alert.id, alert);
      }
    }

    // Check for overstock
    if (item.currentStock > item.maxStockLevel) {
      await this.createAlert(item.id, 'OVERSTOCK', 'LOW',
        `${item.name} (${item.sku}) are stoc peste limita maximă: ${item.currentStock} / ${item.maxStockLevel}`);
    }
  }

  async getAlerts(filters?: {
    itemId?: string;
    type?: AlertType;
    severity?: AlertSeverity;
    acknowledged?: boolean;
    resolved?: boolean;
  }): Promise<StockAlert[]> {
    let alerts = Array.from(this.alerts.values());

    if (filters) {
      if (filters.itemId) {
        alerts = alerts.filter(a => a.itemId === filters.itemId);
      }
      if (filters.type) {
        alerts = alerts.filter(a => a.type === filters.type);
      }
      if (filters.severity) {
        alerts = alerts.filter(a => a.severity === filters.severity);
      }
      if (filters.acknowledged !== undefined) {
        alerts = filters.acknowledged
          ? alerts.filter(a => a.acknowledgedAt !== undefined)
          : alerts.filter(a => a.acknowledgedAt === undefined);
      }
      if (filters.resolved !== undefined) {
        alerts = filters.resolved
          ? alerts.filter(a => a.resolvedAt !== undefined)
          : alerts.filter(a => a.resolvedAt === undefined);
      }
    }

    return alerts.sort((a, b) => {
      const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<StockAlert> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new NotFoundException(`Alertă ${alertId} nu a fost găsită`);
    }

    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = userId;
    this.alerts.set(alertId, alert);
    return alert;
  }

  async resolveAlert(alertId: string, userId: string): Promise<StockAlert> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new NotFoundException(`Alertă ${alertId} nu a fost găsită`);
    }

    alert.resolvedAt = new Date();
    alert.resolvedBy = userId;
    this.alerts.set(alertId, alert);
    return alert;
  }

  // =================== AUTO-REORDER ===================

  async createReorderRule(data: {
    itemId: string;
    isEnabled: boolean;
    reorderPoint: number;
    reorderQuantity: number;
    maxOrderQuantity?: number;
    preferredSupplierId?: string;
    leadTimeDays: number;
    safetyStockDays: number;
    reviewFrequency: ReviewFrequency;
  }): Promise<ReorderRule> {
    const item = await this.getItemById(data.itemId);

    const id = `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const rule: ReorderRule = {
      id,
      itemId: data.itemId,
      isEnabled: data.isEnabled,
      reorderPoint: data.reorderPoint,
      reorderQuantity: data.reorderQuantity,
      maxOrderQuantity: data.maxOrderQuantity,
      preferredSupplierId: data.preferredSupplierId,
      leadTimeDays: data.leadTimeDays,
      safetyStockDays: data.safetyStockDays,
      reviewFrequency: data.reviewFrequency,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.reorderRules.set(id, rule);

    // Update item reorder settings
    item.reorderPoint = data.reorderPoint;
    item.reorderQuantity = data.reorderQuantity;
    item.updatedAt = new Date();
    this.items.set(item.id, item);

    return rule;
  }

  async getReorderRules(itemId?: string): Promise<ReorderRule[]> {
    let rules = Array.from(this.reorderRules.values());

    if (itemId) {
      rules = rules.filter(r => r.itemId === itemId);
    }

    return rules;
  }

  async updateReorderRule(id: string, updates: Partial<ReorderRule>): Promise<ReorderRule> {
    const rule = this.reorderRules.get(id);
    if (!rule) {
      throw new NotFoundException(`Regulă de reaprovizionare ${id} nu a fost găsită`);
    }

    const updatedRule = { ...rule, ...updates, updatedAt: new Date() };
    this.reorderRules.set(id, updatedRule);
    return updatedRule;
  }

  async getReorderSuggestions(): Promise<ReorderSuggestion[]> {
    const suggestions: ReorderSuggestion[] = [];

    for (const item of this.items.values()) {
      if (!item.isActive) continue;

      if (item.currentStock <= item.reorderPoint) {
        const rule = Array.from(this.reorderRules.values())
          .find(r => r.itemId === item.id);

        const urgency: AlertSeverity =
          item.currentStock <= 0 ? 'CRITICAL' :
          item.currentStock <= item.minStockLevel ? 'HIGH' :
          item.currentStock <= item.reorderPoint ? 'MEDIUM' : 'LOW';

        const suggestedQuantity = rule?.reorderQuantity || item.reorderQuantity;
        const leadTimeDays = rule?.leadTimeDays || 3;

        suggestions.push({
          itemId: item.id,
          itemName: item.name,
          sku: item.sku,
          currentStock: item.currentStock,
          reorderPoint: item.reorderPoint,
          suggestedQuantity,
          estimatedCost: suggestedQuantity * item.unitCost,
          estimatedDeliveryDate: new Date(Date.now() + leadTimeDays * 24 * 60 * 60 * 1000),
          urgency,
          reason: urgency === 'CRITICAL'
            ? 'Fără stoc - reaprovizionare urgentă necesară'
            : urgency === 'HIGH'
            ? 'Stoc sub nivelul minim'
            : 'Stoc la punctul de reaprovizionare',
        });
      }
    }

    return suggestions.sort((a, b) => {
      const urgencyOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });
  }

  // =================== INVENTORY VALUATION ===================

  async calculateValuation(
    itemId: string,
    method: ValuationMethod
  ): Promise<InventoryValuation> {
    const item = await this.getItemById(itemId);
    const batches = await this.getBatches(itemId);
    const activeBatches = batches.filter(b => b.isActive && b.quantity > 0);

    let totalQuantity = 0;
    let totalValue = 0;
    const details: ValuationDetail[] = [];

    switch (method) {
      case 'FIFO':
        // First In First Out - oldest batches first
        const fifoSorted = activeBatches.sort((a, b) =>
          new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime()
        );

        for (const batch of fifoSorted) {
          const value = batch.quantity * batch.unitCost;
          totalQuantity += batch.quantity;
          totalValue += value;
          details.push({
            batchId: batch.id,
            quantity: batch.quantity,
            unitCost: batch.unitCost,
            totalValue: value,
            receivedDate: batch.receivedDate,
          });
        }
        break;

      case 'LIFO':
        // Last In First Out - newest batches first
        const lifoSorted = activeBatches.sort((a, b) =>
          new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime()
        );

        for (const batch of lifoSorted) {
          const value = batch.quantity * batch.unitCost;
          totalQuantity += batch.quantity;
          totalValue += value;
          details.push({
            batchId: batch.id,
            quantity: batch.quantity,
            unitCost: batch.unitCost,
            totalValue: value,
            receivedDate: batch.receivedDate,
          });
        }
        break;

      case 'WEIGHTED_AVERAGE':
        // Weighted average cost
        let totalCostQty = 0;
        for (const batch of activeBatches) {
          totalQuantity += batch.quantity;
          totalCostQty += batch.quantity * batch.unitCost;
        }
        const avgCost = totalQuantity > 0 ? totalCostQty / totalQuantity : item.unitCost;
        totalValue = totalQuantity * avgCost;
        details.push({
          quantity: totalQuantity,
          unitCost: avgCost,
          totalValue,
          receivedDate: new Date(),
        });
        break;

      case 'SPECIFIC_IDENTIFICATION':
        // Each batch valued at its specific cost
        for (const batch of activeBatches) {
          const value = batch.quantity * batch.unitCost;
          totalQuantity += batch.quantity;
          totalValue += value;
          details.push({
            batchId: batch.id,
            quantity: batch.quantity,
            unitCost: batch.unitCost,
            totalValue: value,
            receivedDate: batch.receivedDate,
          });
        }
        break;
    }

    // If no batches, use item's current stock and unit cost
    if (activeBatches.length === 0) {
      totalQuantity = item.currentStock;
      totalValue = item.currentStock * item.unitCost;
      details.push({
        quantity: item.currentStock,
        unitCost: item.unitCost,
        totalValue,
        receivedDate: item.createdAt,
      });
    }

    const valuation: InventoryValuation = {
      id: `val-${Date.now()}`,
      itemId,
      valuationMethod: method,
      totalQuantity,
      totalValue,
      averageCost: totalQuantity > 0 ? totalValue / totalQuantity : 0,
      lastCalculatedAt: new Date(),
      details,
    };

    this.valuations.set(valuation.id, valuation);
    return valuation;
  }

  async getTotalInventoryValue(method: ValuationMethod = 'WEIGHTED_AVERAGE'): Promise<{
    totalItems: number;
    totalQuantity: number;
    totalValue: number;
    valuationMethod: ValuationMethod;
    byCategory: { category: InventoryCategory; quantity: number; value: number }[];
    calculatedAt: Date;
  }> {
    const items = Array.from(this.items.values()).filter(i => i.isActive);
    let totalQuantity = 0;
    let totalValue = 0;
    const categoryTotals = new Map<InventoryCategory, { quantity: number; value: number }>();

    for (const item of items) {
      const valuation = await this.calculateValuation(item.id, method);
      totalQuantity += valuation.totalQuantity;
      totalValue += valuation.totalValue;

      const catTotal = categoryTotals.get(item.category) || { quantity: 0, value: 0 };
      catTotal.quantity += valuation.totalQuantity;
      catTotal.value += valuation.totalValue;
      categoryTotals.set(item.category, catTotal);
    }

    return {
      totalItems: items.length,
      totalQuantity,
      totalValue,
      valuationMethod: method,
      byCategory: Array.from(categoryTotals.entries()).map(([category, data]) => ({
        category,
        ...data,
      })),
      calculatedAt: new Date(),
    };
  }

  // =================== CYCLE COUNT ===================

  async createCycleCount(data: {
    warehouseId: string;
    zoneId?: string;
    type: CycleCountType;
    scheduledDate: Date;
    assignedTo: string[];
    itemIds?: string[];
  }): Promise<CycleCount> {
    const warehouse = await this.getWarehouseById(data.warehouseId);

    const id = `count-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Determine items to count based on type
    let itemsToCount: string[] = data.itemIds || [];

    if (!data.itemIds || data.itemIds.length === 0) {
      const warehouseItems = Array.from(this.items.values())
        .filter(i => i.warehouseId === data.warehouseId && i.isActive);

      switch (data.type) {
        case 'FULL':
          itemsToCount = warehouseItems.map(i => i.id);
          break;
        case 'ABC':
          // A items - high value (top 20% by value)
          const sorted = warehouseItems.sort((a, b) =>
            (b.currentStock * b.unitCost) - (a.currentStock * a.unitCost)
          );
          itemsToCount = sorted.slice(0, Math.ceil(sorted.length * 0.2)).map(i => i.id);
          break;
        case 'RANDOM':
          // Random 10% of items
          const shuffled = warehouseItems.sort(() => Math.random() - 0.5);
          itemsToCount = shuffled.slice(0, Math.ceil(shuffled.length * 0.1)).map(i => i.id);
          break;
        case 'LOCATION':
          if (data.zoneId) {
            itemsToCount = warehouseItems
              .filter(i => i.zoneId === data.zoneId)
              .map(i => i.id);
          }
          break;
        case 'CATEGORY':
          // Count items by category rotation
          const categories: InventoryCategory[] = [
            'RAW_MATERIAL', 'WORK_IN_PROGRESS', 'FINISHED_GOODS',
            'PACKAGING', 'SPARE_PARTS', 'CONSUMABLES', 'MERCHANDISE'
          ];
          const currentCategory = categories[new Date().getMonth() % categories.length];
          itemsToCount = warehouseItems
            .filter(i => i.category === currentCategory)
            .map(i => i.id);
          break;
      }
    }

    const countItems: CycleCountItem[] = itemsToCount.map(itemId => {
      const item = this.items.get(itemId);
      return {
        itemId,
        locationId: item?.locationId || '',
        systemQuantity: item?.currentStock || 0,
        status: 'PENDING' as CountItemStatus,
      };
    });

    const cycleCount: CycleCount = {
      id,
      warehouseId: data.warehouseId,
      zoneId: data.zoneId,
      type: data.type,
      status: 'SCHEDULED',
      scheduledDate: data.scheduledDate,
      assignedTo: data.assignedTo,
      items: countItems,
      discrepancies: 0,
      accuracy: 0,
      createdBy: 'system',
      createdAt: new Date(),
    };

    this.cycleCounts.set(id, cycleCount);
    return cycleCount;
  }

  async getCycleCounts(filters?: {
    warehouseId?: string;
    status?: CycleCountStatus;
  }): Promise<CycleCount[]> {
    let counts = Array.from(this.cycleCounts.values());

    if (filters) {
      if (filters.warehouseId) {
        counts = counts.filter(c => c.warehouseId === filters.warehouseId);
      }
      if (filters.status) {
        counts = counts.filter(c => c.status === filters.status);
      }
    }

    return counts.sort((a, b) =>
      new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
    );
  }

  async startCycleCount(countId: string): Promise<CycleCount> {
    const count = this.cycleCounts.get(countId);
    if (!count) {
      throw new NotFoundException(`Inventariere ${countId} nu a fost găsită`);
    }

    count.status = 'IN_PROGRESS';
    count.startedAt = new Date();
    this.cycleCounts.set(countId, count);
    return count;
  }

  async recordCount(
    countId: string,
    itemId: string,
    countedQuantity: number,
    countedBy: string,
    notes?: string
  ): Promise<CycleCountItem> {
    const count = this.cycleCounts.get(countId);
    if (!count) {
      throw new NotFoundException(`Inventariere ${countId} nu a fost găsită`);
    }

    const countItem = count.items.find(i => i.itemId === itemId);
    if (!countItem) {
      throw new NotFoundException(`Articol ${itemId} nu face parte din inventariere`);
    }

    const item = this.items.get(itemId);
    const variance = countedQuantity - countItem.systemQuantity;

    countItem.countedQuantity = countedQuantity;
    countItem.variance = variance;
    countItem.varianceValue = variance * (item?.unitCost || 0);
    countItem.status = variance === 0 ? 'VERIFIED' : 'COUNTED';
    countItem.countedBy = countedBy;
    countItem.countedAt = new Date();
    countItem.notes = notes;

    // Update count stats
    const countedItems = count.items.filter(i => i.countedQuantity !== undefined);
    const accurateItems = countedItems.filter(i => i.variance === 0);
    count.discrepancies = countedItems.filter(i => i.variance !== 0).length;
    count.accuracy = countedItems.length > 0
      ? (accurateItems.length / countedItems.length) * 100
      : 0;

    // Check if all items counted
    if (countedItems.length === count.items.length) {
      count.status = 'PENDING_REVIEW';
    }

    this.cycleCounts.set(countId, count);
    return countItem;
  }

  async completeCycleCount(countId: string, adjustInventory: boolean = true): Promise<CycleCount> {
    const count = this.cycleCounts.get(countId);
    if (!count) {
      throw new NotFoundException(`Inventariere ${countId} nu a fost găsită`);
    }

    count.status = 'COMPLETED';
    count.completedAt = new Date();

    // Adjust inventory if requested
    if (adjustInventory) {
      for (const countItem of count.items) {
        if (countItem.variance && countItem.variance !== 0) {
          await this.adjustStock(
            countItem.itemId,
            countItem.variance,
            `Ajustare din inventariere ${countId}`,
          );
          countItem.status = 'ADJUSTED';
        }
      }
    }

    this.cycleCounts.set(countId, count);
    return count;
  }

  // =================== REPORTS & ANALYTICS ===================

  async getInventorySummary(warehouseId?: string): Promise<{
    totalItems: number;
    totalSKUs: number;
    totalValue: number;
    lowStockItems: number;
    outOfStockItems: number;
    expiringBatches: number;
    pendingAlerts: number;
    byCategory: { category: InventoryCategory; count: number; value: number }[];
    byZone: { zoneId: string; zoneName: string; itemCount: number }[];
  }> {
    let items = Array.from(this.items.values()).filter(i => i.isActive);

    if (warehouseId) {
      items = items.filter(i => i.warehouseId === warehouseId);
    }

    const categoryMap = new Map<InventoryCategory, { count: number; value: number }>();
    const zoneMap = new Map<string, { count: number; name: string }>();

    let totalValue = 0;
    let lowStockItems = 0;
    let outOfStockItems = 0;

    for (const item of items) {
      totalValue += item.currentStock * item.unitCost;

      if (item.currentStock <= 0) {
        outOfStockItems++;
      } else if (item.currentStock <= item.reorderPoint) {
        lowStockItems++;
      }

      // Category stats
      const catStats = categoryMap.get(item.category) || { count: 0, value: 0 };
      catStats.count++;
      catStats.value += item.currentStock * item.unitCost;
      categoryMap.set(item.category, catStats);

      // Zone stats
      if (item.zoneId) {
        const zoneStats = zoneMap.get(item.zoneId) || { count: 0, name: '' };
        zoneStats.count++;
        const zone = this.zones.get(item.zoneId);
        if (zone) {
          zoneStats.name = zone.name;
        }
        zoneMap.set(item.zoneId, zoneStats);
      }
    }

    const expiringBatches = (await this.getExpiringBatches(30)).length;
    const pendingAlerts = (await this.getAlerts({ resolved: false })).length;

    return {
      totalItems: items.length,
      totalSKUs: new Set(items.map(i => i.sku)).size,
      totalValue,
      lowStockItems,
      outOfStockItems,
      expiringBatches,
      pendingAlerts,
      byCategory: Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        count: data.count,
        value: data.value,
      })),
      byZone: Array.from(zoneMap.entries()).map(([zoneId, data]) => ({
        zoneId,
        zoneName: data.name,
        itemCount: data.count,
      })),
    };
  }

  async getStockMovementReport(
    fromDate: Date,
    toDate: Date,
    itemId?: string
  ): Promise<{
    period: { from: Date; to: Date };
    totalMovements: number;
    totalReceipts: { count: number; quantity: number; value: number };
    totalIssues: { count: number; quantity: number; value: number };
    totalTransfers: number;
    totalAdjustments: { count: number; netQuantity: number; netValue: number };
    movements: StockMovement[];
  }> {
    const movements = await this.getMovements({ itemId, fromDate, toDate });

    const receipts = movements.filter(m => m.type === 'RECEIPT');
    const issues = movements.filter(m => m.type === 'ISSUE');
    const transfers = movements.filter(m => m.type === 'TRANSFER');
    const adjustments = movements.filter(m => m.type === 'ADJUSTMENT');

    return {
      period: { from: fromDate, to: toDate },
      totalMovements: movements.length,
      totalReceipts: {
        count: receipts.length,
        quantity: receipts.reduce((sum, m) => sum + m.quantity, 0),
        value: receipts.reduce((sum, m) => sum + m.totalCost, 0),
      },
      totalIssues: {
        count: issues.length,
        quantity: issues.reduce((sum, m) => sum + m.quantity, 0),
        value: issues.reduce((sum, m) => sum + m.totalCost, 0),
      },
      totalTransfers: transfers.length,
      totalAdjustments: {
        count: adjustments.length,
        netQuantity: adjustments.reduce((sum, m) => sum + m.quantity, 0),
        netValue: adjustments.reduce((sum, m) => sum + m.totalCost, 0),
      },
      movements,
    };
  }

  async getSlowMovingItems(daysSinceLastMovement: number = 90): Promise<{
    item: InventoryItem;
    daysSinceLastMovement: number;
    stockValue: number;
  }[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastMovement);

    const results: { item: InventoryItem; daysSinceLastMovement: number; stockValue: number }[] = [];
    const movements = Array.from(this.movements.values());

    for (const item of this.items.values()) {
      if (!item.isActive || item.currentStock <= 0) continue;

      const itemMovements = movements
        .filter(m => m.itemId === item.id)
        .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime());

      const lastMovement = itemMovements[0];

      if (!lastMovement || new Date(lastMovement.performedAt) < cutoffDate) {
        const days = lastMovement
          ? Math.ceil((Date.now() - new Date(lastMovement.performedAt).getTime()) / (1000 * 60 * 60 * 24))
          : daysSinceLastMovement + 30;

        results.push({
          item,
          daysSinceLastMovement: days,
          stockValue: item.currentStock * item.unitCost,
        });
      }
    }

    return results.sort((a, b) => b.daysSinceLastMovement - a.daysSinceLastMovement);
  }

  async getDeadStock(daysSinceLastMovement: number = 365): Promise<{
    items: InventoryItem[];
    totalQuantity: number;
    totalValue: number;
  }> {
    const slowMoving = await this.getSlowMovingItems(daysSinceLastMovement);

    return {
      items: slowMoving.map(s => s.item),
      totalQuantity: slowMoving.reduce((sum, s) => sum + s.item.currentStock, 0),
      totalValue: slowMoving.reduce((sum, s) => sum + s.stockValue, 0),
    };
  }
}
