import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// =================== TYPES ===================

export type AssetStatus = 'active' | 'inactive' | 'maintenance' | 'disposed' | 'lost' | 'pending_disposal';
export type AssetCondition = 'excellent' | 'good' | 'fair' | 'poor' | 'broken';
export type DepreciationMethod = 'straight_line' | 'declining_balance' | 'units_of_production' | 'sum_of_years_digits';
export type AssetCategory = 'equipment' | 'vehicle' | 'it_hardware' | 'furniture' | 'building' | 'land' | 'software' | 'intangible' | 'other';

export interface Asset {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  assetTag: string;
  serialNumber?: string;
  barcode?: string;
  qrCode?: string;
  category: AssetCategory;
  subcategory?: string;
  manufacturer?: string;
  model?: string;
  status: AssetStatus;
  condition: AssetCondition;
  locationId?: string;
  locationName?: string;
  departmentId?: string;
  departmentName?: string;
  assignedToUserId?: string;
  assignedToUserName?: string;
  custodianId?: string;
  custodianName?: string;
  purchaseDate?: Date;
  purchasePrice?: number;
  purchaseOrderNumber?: string;
  supplierId?: string;
  supplierName?: string;
  warrantyExpiry?: Date;
  warrantyInfo?: string;
  currentValue?: number;
  salvageValue?: number;
  usefulLifeMonths?: number;
  depreciationMethod?: DepreciationMethod;
  depreciationStartDate?: Date;
  insurancePolicyNumber?: string;
  insuranceExpiry?: Date;
  parentAssetId?: string;
  images?: string[];
  documents?: string[];
  customFields?: Record<string, any>;
  notes?: string;
  tags?: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetCheckout {
  id: string;
  tenantId: string;
  assetId: string;
  assetName: string;
  checkedOutTo: 'user' | 'location' | 'department';
  targetId: string;
  targetName: string;
  checkedOutBy: string;
  checkedOutAt: Date;
  expectedReturn?: Date;
  actualReturn?: Date;
  notes?: string;
  status: 'checked_out' | 'returned' | 'overdue';
}

export interface AssetAudit {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  locationId?: string;
  locationName?: string;
  scheduledDate: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  auditorId: string;
  auditorName: string;
  assetCount: number;
  foundCount: number;
  missingCount: number;
  conditionChanges: number;
  discrepancies?: Array<{
    assetId: string;
    assetName: string;
    issue: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  notes?: string;
  createdAt: Date;
}

export interface AssetTransfer {
  id: string;
  tenantId: string;
  assetId: string;
  assetName: string;
  fromType: 'location' | 'department' | 'user';
  fromId: string;
  fromName: string;
  toType: 'location' | 'department' | 'user';
  toId: string;
  toName: string;
  reason?: string;
  transferredBy: string;
  transferredAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  notes?: string;
}

export interface AssetRequest {
  id: string;
  tenantId: string;
  requestType: 'new_asset' | 'repair' | 'replacement' | 'disposal' | 'transfer';
  requesterId: string;
  requesterName: string;
  assetId?: string;
  assetName?: string;
  category?: AssetCategory;
  description: string;
  justification?: string;
  estimatedCost?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// =================== SERVICE ===================

@Injectable()
export class AssetManagementService {
  private assets: Map<string, Asset> = new Map();
  private checkouts: Map<string, AssetCheckout> = new Map();
  private audits: Map<string, AssetAudit> = new Map();
  private transfers: Map<string, AssetTransfer> = new Map();
  private requests: Map<string, AssetRequest> = new Map();

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    // Sample assets
    const sampleAssets: Partial<Asset>[] = [
      {
        name: 'Dell Latitude 5520 Laptop',
        category: 'it_hardware',
        manufacturer: 'Dell',
        model: 'Latitude 5520',
        status: 'active',
        condition: 'good',
        purchasePrice: 4500,
        currentValue: 3200,
      },
      {
        name: 'HP LaserJet Pro Printer',
        category: 'it_hardware',
        manufacturer: 'HP',
        model: 'LaserJet Pro M404dn',
        status: 'active',
        condition: 'excellent',
        purchasePrice: 2200,
        currentValue: 1800,
      },
      {
        name: 'Volkswagen Transporter',
        category: 'vehicle',
        manufacturer: 'Volkswagen',
        model: 'Transporter T6.1',
        status: 'active',
        condition: 'good',
        purchasePrice: 125000,
        currentValue: 95000,
      },
      {
        name: 'Office Desk - Executive',
        category: 'furniture',
        manufacturer: 'IKEA',
        model: 'BEKANT',
        status: 'active',
        condition: 'excellent',
        purchasePrice: 1200,
        currentValue: 900,
      },
      {
        name: 'Server Rack - Main DC',
        category: 'equipment',
        manufacturer: 'APC',
        model: 'NetShelter SX 42U',
        status: 'active',
        condition: 'good',
        purchasePrice: 8500,
        currentValue: 6200,
      },
    ];

    for (const data of sampleAssets) {
      const id = `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.assets.set(id, {
        id,
        tenantId: 'system',
        assetTag: `AT-${Date.now().toString().slice(-6)}`,
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      } as Asset);
    }
  }

  // =================== ASSET CRUD ===================

  async createAsset(data: {
    tenantId: string;
    name: string;
    description?: string;
    category: AssetCategory;
    subcategory?: string;
    serialNumber?: string;
    manufacturer?: string;
    model?: string;
    status?: AssetStatus;
    condition?: AssetCondition;
    locationId?: string;
    locationName?: string;
    departmentId?: string;
    departmentName?: string;
    assignedToUserId?: string;
    assignedToUserName?: string;
    purchaseDate?: Date;
    purchasePrice?: number;
    purchaseOrderNumber?: string;
    supplierId?: string;
    supplierName?: string;
    warrantyExpiry?: Date;
    warrantyInfo?: string;
    salvageValue?: number;
    usefulLifeMonths?: number;
    depreciationMethod?: DepreciationMethod;
    insurancePolicyNumber?: string;
    insuranceExpiry?: Date;
    customFields?: Record<string, any>;
    tags?: string[];
    notes?: string;
    createdBy: string;
  }): Promise<Asset> {
    const id = `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const assetTag = `AT-${data.tenantId.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;
    const now = new Date();

    const asset: Asset = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      assetTag,
      serialNumber: data.serialNumber,
      category: data.category,
      subcategory: data.subcategory,
      manufacturer: data.manufacturer,
      model: data.model,
      status: data.status || 'active',
      condition: data.condition || 'good',
      locationId: data.locationId,
      locationName: data.locationName,
      departmentId: data.departmentId,
      departmentName: data.departmentName,
      assignedToUserId: data.assignedToUserId,
      assignedToUserName: data.assignedToUserName,
      purchaseDate: data.purchaseDate,
      purchasePrice: data.purchasePrice,
      purchaseOrderNumber: data.purchaseOrderNumber,
      supplierId: data.supplierId,
      supplierName: data.supplierName,
      warrantyExpiry: data.warrantyExpiry,
      warrantyInfo: data.warrantyInfo,
      currentValue: data.purchasePrice,
      salvageValue: data.salvageValue,
      usefulLifeMonths: data.usefulLifeMonths,
      depreciationMethod: data.depreciationMethod || 'straight_line',
      depreciationStartDate: data.purchaseDate,
      insurancePolicyNumber: data.insurancePolicyNumber,
      insuranceExpiry: data.insuranceExpiry,
      customFields: data.customFields,
      tags: data.tags,
      notes: data.notes,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    this.assets.set(id, asset);

    this.eventEmitter.emit('asset.created', { asset });

    return asset;
  }

  async getAsset(id: string): Promise<Asset | null> {
    return this.assets.get(id) || null;
  }

  async getAssetByTag(assetTag: string): Promise<Asset | null> {
    for (const asset of this.assets.values()) {
      if (asset.assetTag === assetTag) {
        return asset;
      }
    }
    return null;
  }

  async getAssets(
    tenantId: string,
    filters?: {
      category?: AssetCategory;
      status?: AssetStatus;
      condition?: AssetCondition;
      locationId?: string;
      departmentId?: string;
      assignedToUserId?: string;
      search?: string;
      tags?: string[];
      limit?: number;
      offset?: number;
    },
  ): Promise<{ assets: Asset[]; total: number }> {
    let assets = Array.from(this.assets.values()).filter(
      (a) => a.tenantId === tenantId || a.tenantId === 'system',
    );

    if (filters?.category) {
      assets = assets.filter((a) => a.category === filters.category);
    }

    if (filters?.status) {
      assets = assets.filter((a) => a.status === filters.status);
    }

    if (filters?.condition) {
      assets = assets.filter((a) => a.condition === filters.condition);
    }

    if (filters?.locationId) {
      assets = assets.filter((a) => a.locationId === filters.locationId);
    }

    if (filters?.departmentId) {
      assets = assets.filter((a) => a.departmentId === filters.departmentId);
    }

    if (filters?.assignedToUserId) {
      assets = assets.filter((a) => a.assignedToUserId === filters.assignedToUserId);
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      assets = assets.filter(
        (a) =>
          a.name.toLowerCase().includes(search) ||
          a.assetTag.toLowerCase().includes(search) ||
          a.serialNumber?.toLowerCase().includes(search) ||
          a.manufacturer?.toLowerCase().includes(search) ||
          a.model?.toLowerCase().includes(search),
      );
    }

    if (filters?.tags && filters.tags.length > 0) {
      assets = assets.filter((a) =>
        filters.tags!.some((tag) => a.tags?.includes(tag)),
      );
    }

    const total = assets.length;

    assets = assets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (filters?.offset) {
      assets = assets.slice(filters.offset);
    }

    if (filters?.limit) {
      assets = assets.slice(0, filters.limit);
    }

    return { assets, total };
  }

  async updateAsset(
    id: string,
    data: Partial<Asset>,
  ): Promise<Asset | null> {
    const asset = this.assets.get(id);
    if (!asset) return null;

    const updated: Asset = {
      ...asset,
      ...data,
      id: asset.id,
      tenantId: asset.tenantId,
      assetTag: asset.assetTag,
      createdBy: asset.createdBy,
      createdAt: asset.createdAt,
      updatedAt: new Date(),
    };

    this.assets.set(id, updated);

    this.eventEmitter.emit('asset.updated', { asset: updated, previousStatus: asset.status });

    return updated;
  }

  async deleteAsset(id: string): Promise<boolean> {
    const asset = this.assets.get(id);
    if (!asset) return false;

    this.assets.delete(id);

    this.eventEmitter.emit('asset.deleted', { assetId: id, asset });

    return true;
  }

  // =================== ASSET CHECKOUT ===================

  async checkoutAsset(data: {
    tenantId: string;
    assetId: string;
    checkedOutTo: 'user' | 'location' | 'department';
    targetId: string;
    targetName: string;
    expectedReturn?: Date;
    notes?: string;
    checkedOutBy: string;
  }): Promise<AssetCheckout> {
    const asset = this.assets.get(data.assetId);
    if (!asset) {
      throw new Error('Asset not found');
    }

    const id = `checkout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const checkout: AssetCheckout = {
      id,
      tenantId: data.tenantId,
      assetId: data.assetId,
      assetName: asset.name,
      checkedOutTo: data.checkedOutTo,
      targetId: data.targetId,
      targetName: data.targetName,
      checkedOutBy: data.checkedOutBy,
      checkedOutAt: new Date(),
      expectedReturn: data.expectedReturn,
      notes: data.notes,
      status: 'checked_out',
    };

    this.checkouts.set(id, checkout);

    // Update asset assignment
    if (data.checkedOutTo === 'user') {
      asset.assignedToUserId = data.targetId;
      asset.assignedToUserName = data.targetName;
    } else if (data.checkedOutTo === 'location') {
      asset.locationId = data.targetId;
      asset.locationName = data.targetName;
    } else if (data.checkedOutTo === 'department') {
      asset.departmentId = data.targetId;
      asset.departmentName = data.targetName;
    }

    asset.updatedAt = new Date();
    this.assets.set(asset.id, asset);

    this.eventEmitter.emit('asset.checked_out', { checkout, asset });

    return checkout;
  }

  async checkinAsset(
    checkoutId: string,
    data: {
      notes?: string;
      condition?: AssetCondition;
    },
  ): Promise<AssetCheckout | null> {
    const checkout = this.checkouts.get(checkoutId);
    if (!checkout) return null;

    checkout.actualReturn = new Date();
    checkout.status = 'returned';
    if (data.notes) checkout.notes = data.notes;

    this.checkouts.set(checkoutId, checkout);

    // Update asset condition if provided
    const asset = this.assets.get(checkout.assetId);
    if (asset && data.condition) {
      asset.condition = data.condition;
      asset.updatedAt = new Date();
      this.assets.set(asset.id, asset);
    }

    this.eventEmitter.emit('asset.checked_in', { checkout, asset });

    return checkout;
  }

  async getCheckouts(
    tenantId: string,
    filters?: {
      assetId?: string;
      status?: AssetCheckout['status'];
      checkedOutTo?: 'user' | 'location' | 'department';
      limit?: number;
    },
  ): Promise<AssetCheckout[]> {
    let checkouts = Array.from(this.checkouts.values()).filter(
      (c) => c.tenantId === tenantId,
    );

    if (filters?.assetId) {
      checkouts = checkouts.filter((c) => c.assetId === filters.assetId);
    }

    if (filters?.status) {
      checkouts = checkouts.filter((c) => c.status === filters.status);
    }

    if (filters?.checkedOutTo) {
      checkouts = checkouts.filter((c) => c.checkedOutTo === filters.checkedOutTo);
    }

    // Mark overdue checkouts
    const now = new Date();
    for (const checkout of checkouts) {
      if (
        checkout.status === 'checked_out' &&
        checkout.expectedReturn &&
        checkout.expectedReturn < now
      ) {
        checkout.status = 'overdue';
      }
    }

    checkouts = checkouts.sort((a, b) => b.checkedOutAt.getTime() - a.checkedOutAt.getTime());

    if (filters?.limit) {
      checkouts = checkouts.slice(0, filters.limit);
    }

    return checkouts;
  }

  async getOverdueCheckouts(tenantId: string): Promise<AssetCheckout[]> {
    const now = new Date();
    return Array.from(this.checkouts.values()).filter(
      (c) =>
        c.tenantId === tenantId &&
        c.status === 'checked_out' &&
        c.expectedReturn &&
        c.expectedReturn < now,
    );
  }

  // =================== ASSET TRANSFER ===================

  async requestTransfer(data: {
    tenantId: string;
    assetId: string;
    toType: 'location' | 'department' | 'user';
    toId: string;
    toName: string;
    reason?: string;
    transferredBy: string;
  }): Promise<AssetTransfer> {
    const asset = this.assets.get(data.assetId);
    if (!asset) {
      throw new Error('Asset not found');
    }

    const id = `transfer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let fromType: 'location' | 'department' | 'user' = 'location';
    let fromId = '';
    let fromName = '';

    if (asset.assignedToUserId) {
      fromType = 'user';
      fromId = asset.assignedToUserId;
      fromName = asset.assignedToUserName || 'Unknown';
    } else if (asset.departmentId) {
      fromType = 'department';
      fromId = asset.departmentId;
      fromName = asset.departmentName || 'Unknown';
    } else if (asset.locationId) {
      fromType = 'location';
      fromId = asset.locationId;
      fromName = asset.locationName || 'Unknown';
    }

    const transfer: AssetTransfer = {
      id,
      tenantId: data.tenantId,
      assetId: data.assetId,
      assetName: asset.name,
      fromType,
      fromId,
      fromName,
      toType: data.toType,
      toId: data.toId,
      toName: data.toName,
      reason: data.reason,
      transferredBy: data.transferredBy,
      transferredAt: new Date(),
      status: 'pending',
    };

    this.transfers.set(id, transfer);

    this.eventEmitter.emit('asset.transfer_requested', { transfer });

    return transfer;
  }

  async approveTransfer(
    transferId: string,
    approvedBy: string,
  ): Promise<AssetTransfer | null> {
    const transfer = this.transfers.get(transferId);
    if (!transfer) return null;

    transfer.status = 'approved';
    transfer.approvedBy = approvedBy;
    transfer.approvedAt = new Date();

    this.transfers.set(transferId, transfer);

    this.eventEmitter.emit('asset.transfer_approved', { transfer });

    return transfer;
  }

  async completeTransfer(transferId: string): Promise<AssetTransfer | null> {
    const transfer = this.transfers.get(transferId);
    if (!transfer || transfer.status !== 'approved') return null;

    const asset = this.assets.get(transfer.assetId);
    if (!asset) return null;

    // Clear previous assignment
    asset.assignedToUserId = undefined;
    asset.assignedToUserName = undefined;
    asset.locationId = undefined;
    asset.locationName = undefined;
    asset.departmentId = undefined;
    asset.departmentName = undefined;

    // Set new assignment
    if (transfer.toType === 'user') {
      asset.assignedToUserId = transfer.toId;
      asset.assignedToUserName = transfer.toName;
    } else if (transfer.toType === 'location') {
      asset.locationId = transfer.toId;
      asset.locationName = transfer.toName;
    } else if (transfer.toType === 'department') {
      asset.departmentId = transfer.toId;
      asset.departmentName = transfer.toName;
    }

    asset.updatedAt = new Date();
    this.assets.set(asset.id, asset);

    transfer.status = 'completed';
    this.transfers.set(transferId, transfer);

    this.eventEmitter.emit('asset.transferred', { transfer, asset });

    return transfer;
  }

  async rejectTransfer(
    transferId: string,
    rejectedBy: string,
    notes?: string,
  ): Promise<AssetTransfer | null> {
    const transfer = this.transfers.get(transferId);
    if (!transfer) return null;

    transfer.status = 'rejected';
    transfer.approvedBy = rejectedBy;
    transfer.approvedAt = new Date();
    if (notes) transfer.notes = notes;

    this.transfers.set(transferId, transfer);

    this.eventEmitter.emit('asset.transfer_rejected', { transfer });

    return transfer;
  }

  async getTransfers(
    tenantId: string,
    filters?: {
      assetId?: string;
      status?: AssetTransfer['status'];
      limit?: number;
    },
  ): Promise<AssetTransfer[]> {
    let transfers = Array.from(this.transfers.values()).filter(
      (t) => t.tenantId === tenantId,
    );

    if (filters?.assetId) {
      transfers = transfers.filter((t) => t.assetId === filters.assetId);
    }

    if (filters?.status) {
      transfers = transfers.filter((t) => t.status === filters.status);
    }

    transfers = transfers.sort((a, b) => b.transferredAt.getTime() - a.transferredAt.getTime());

    if (filters?.limit) {
      transfers = transfers.slice(0, filters.limit);
    }

    return transfers;
  }

  // =================== ASSET REQUESTS ===================

  async createRequest(data: {
    tenantId: string;
    requestType: AssetRequest['requestType'];
    requesterId: string;
    requesterName: string;
    assetId?: string;
    assetName?: string;
    category?: AssetCategory;
    description: string;
    justification?: string;
    estimatedCost?: number;
    priority?: AssetRequest['priority'];
  }): Promise<AssetRequest> {
    const id = `request-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const request: AssetRequest = {
      id,
      tenantId: data.tenantId,
      requestType: data.requestType,
      requesterId: data.requesterId,
      requesterName: data.requesterName,
      assetId: data.assetId,
      assetName: data.assetName,
      category: data.category,
      description: data.description,
      justification: data.justification,
      estimatedCost: data.estimatedCost,
      priority: data.priority || 'medium',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    this.requests.set(id, request);

    this.eventEmitter.emit('asset.request_created', { request });

    return request;
  }

  async reviewRequest(
    requestId: string,
    data: {
      approved: boolean;
      reviewedBy: string;
      notes?: string;
    },
  ): Promise<AssetRequest | null> {
    const request = this.requests.get(requestId);
    if (!request) return null;

    request.status = data.approved ? 'approved' : 'rejected';
    request.reviewedBy = data.reviewedBy;
    request.reviewedAt = new Date();
    request.reviewNotes = data.notes;
    request.updatedAt = new Date();

    this.requests.set(requestId, request);

    this.eventEmitter.emit('asset.request_reviewed', { request });

    return request;
  }

  async completeRequest(requestId: string): Promise<AssetRequest | null> {
    const request = this.requests.get(requestId);
    if (!request || request.status !== 'approved') return null;

    request.status = 'completed';
    request.updatedAt = new Date();

    this.requests.set(requestId, request);

    this.eventEmitter.emit('asset.request_completed', { request });

    return request;
  }

  async getRequests(
    tenantId: string,
    filters?: {
      requestType?: AssetRequest['requestType'];
      status?: AssetRequest['status'];
      requesterId?: string;
      priority?: AssetRequest['priority'];
      limit?: number;
    },
  ): Promise<AssetRequest[]> {
    let requests = Array.from(this.requests.values()).filter(
      (r) => r.tenantId === tenantId,
    );

    if (filters?.requestType) {
      requests = requests.filter((r) => r.requestType === filters.requestType);
    }

    if (filters?.status) {
      requests = requests.filter((r) => r.status === filters.status);
    }

    if (filters?.requesterId) {
      requests = requests.filter((r) => r.requesterId === filters.requesterId);
    }

    if (filters?.priority) {
      requests = requests.filter((r) => r.priority === filters.priority);
    }

    requests = requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (filters?.limit) {
      requests = requests.slice(0, filters.limit);
    }

    return requests;
  }

  // =================== STATISTICS ===================

  async getAssetStatistics(tenantId: string): Promise<{
    total: number;
    byStatus: Record<AssetStatus, number>;
    byCategory: Record<AssetCategory, number>;
    byCondition: Record<AssetCondition, number>;
    totalValue: number;
    activeCheckouts: number;
    overdueCheckouts: number;
    pendingTransfers: number;
    pendingRequests: number;
    warrantyExpiringSoon: number;
    insuranceExpiringSoon: number;
  }> {
    const assets = Array.from(this.assets.values()).filter(
      (a) => a.tenantId === tenantId || a.tenantId === 'system',
    );

    const byStatus: Record<AssetStatus, number> = {
      active: 0,
      inactive: 0,
      maintenance: 0,
      disposed: 0,
      lost: 0,
      pending_disposal: 0,
    };

    const byCategory: Record<AssetCategory, number> = {
      equipment: 0,
      vehicle: 0,
      it_hardware: 0,
      furniture: 0,
      building: 0,
      land: 0,
      software: 0,
      intangible: 0,
      other: 0,
    };

    const byCondition: Record<AssetCondition, number> = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
      broken: 0,
    };

    let totalValue = 0;
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    let warrantyExpiringSoon = 0;
    let insuranceExpiringSoon = 0;

    for (const asset of assets) {
      byStatus[asset.status]++;
      byCategory[asset.category]++;
      byCondition[asset.condition]++;
      totalValue += asset.currentValue || 0;

      if (asset.warrantyExpiry && asset.warrantyExpiry <= thirtyDaysFromNow && asset.warrantyExpiry >= now) {
        warrantyExpiringSoon++;
      }

      if (asset.insuranceExpiry && asset.insuranceExpiry <= thirtyDaysFromNow && asset.insuranceExpiry >= now) {
        insuranceExpiringSoon++;
      }
    }

    const checkouts = Array.from(this.checkouts.values()).filter(
      (c) => c.tenantId === tenantId,
    );
    const activeCheckouts = checkouts.filter((c) => c.status === 'checked_out').length;
    const overdueCheckouts = checkouts.filter(
      (c) => c.status === 'checked_out' && c.expectedReturn && c.expectedReturn < now,
    ).length;

    const pendingTransfers = Array.from(this.transfers.values()).filter(
      (t) => t.tenantId === tenantId && t.status === 'pending',
    ).length;

    const pendingRequests = Array.from(this.requests.values()).filter(
      (r) => r.tenantId === tenantId && r.status === 'pending',
    ).length;

    return {
      total: assets.length,
      byStatus,
      byCategory,
      byCondition,
      totalValue,
      activeCheckouts,
      overdueCheckouts,
      pendingTransfers,
      pendingRequests,
      warrantyExpiringSoon,
      insuranceExpiringSoon,
    };
  }
}
