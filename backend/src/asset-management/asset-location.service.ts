import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// =================== TYPES ===================

export type LocationType = 'building' | 'floor' | 'room' | 'area' | 'warehouse' | 'vehicle' | 'external';

export interface AssetLocation {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  type: LocationType;
  description?: string;
  parentId?: string;
  parentName?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  floor?: string;
  room?: string;
  building?: string;
  capacity?: number;
  currentOccupancy?: number;
  managerId?: string;
  managerName?: string;
  contactPhone?: string;
  contactEmail?: string;
  operatingHours?: string;
  isActive: boolean;
  tags?: string[];
  customFields?: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetCategory {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  parentName?: string;
  depreciationMethod?: 'straight_line' | 'declining_balance' | 'units_of_production' | 'sum_of_years_digits';
  defaultUsefulLife?: number; // months
  defaultSalvagePercent?: number;
  accountCode?: string; // for accounting integration
  glAssetAccount?: string;
  glDepreciationAccount?: string;
  glAccumulatedDepreciationAccount?: string;
  requiresSerialNumber?: boolean;
  requiresWarranty?: boolean;
  requiresInsurance?: boolean;
  requiresMaintenance?: boolean;
  maintenanceInterval?: number; // days
  isActive: boolean;
  icon?: string;
  color?: string;
  sortOrder?: number;
  customFields?: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Department {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  parentName?: string;
  managerId?: string;
  managerName?: string;
  costCenterId?: string;
  costCenterName?: string;
  locationId?: string;
  locationName?: string;
  budget?: number;
  assetBudget?: number;
  headcount?: number;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CostCenter {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description?: string;
  departmentId?: string;
  departmentName?: string;
  managerId?: string;
  managerName?: string;
  budget?: number;
  allocated?: number;
  remaining?: number;
  fiscalYear?: string;
  isActive: boolean;
  createdAt: Date;
}

// =================== SERVICE ===================

@Injectable()
export class AssetLocationService {
  private locations: Map<string, AssetLocation> = new Map();
  private categories: Map<string, AssetCategory> = new Map();
  private departments: Map<string, Department> = new Map();
  private costCenters: Map<string, CostCenter> = new Map();

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    // Sample locations
    const headquartersId = `loc-${Date.now()}-hq`;
    this.locations.set(headquartersId, {
      id: headquartersId,
      tenantId: 'system',
      name: 'Headquarters',
      code: 'HQ-001',
      type: 'building',
      address: 'Strada Victoriei 100',
      city: 'București',
      country: 'Romania',
      postalCode: '010061',
      capacity: 200,
      currentOccupancy: 150,
      isActive: true,
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const warehouseId = `loc-${Date.now()}-wh`;
    this.locations.set(warehouseId, {
      id: warehouseId,
      tenantId: 'system',
      name: 'Main Warehouse',
      code: 'WH-001',
      type: 'warehouse',
      address: 'Strada Industriei 50',
      city: 'București',
      country: 'Romania',
      postalCode: '020012',
      capacity: 5000,
      currentOccupancy: 3200,
      isActive: true,
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Sample categories
    const categories = [
      { name: 'IT Hardware', code: 'IT-HW', defaultUsefulLife: 36, icon: 'computer' },
      { name: 'Office Furniture', code: 'OFF-FN', defaultUsefulLife: 84, icon: 'chair' },
      { name: 'Vehicles', code: 'VEH', defaultUsefulLife: 60, icon: 'car' },
      { name: 'Manufacturing Equipment', code: 'MFG-EQ', defaultUsefulLife: 120, icon: 'factory' },
      { name: 'Software Licenses', code: 'SW-LIC', defaultUsefulLife: 36, icon: 'software' },
      { name: 'Buildings', code: 'BLD', defaultUsefulLife: 480, icon: 'building' },
    ];

    for (const cat of categories) {
      const id = `cat-${Date.now()}-${cat.code}`;
      this.categories.set(id, {
        id,
        tenantId: 'system',
        name: cat.name,
        code: cat.code,
        defaultUsefulLife: cat.defaultUsefulLife,
        depreciationMethod: 'straight_line',
        isActive: true,
        icon: cat.icon,
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Sample departments
    const depts = [
      { name: 'Finance', code: 'FIN' },
      { name: 'Human Resources', code: 'HR' },
      { name: 'Information Technology', code: 'IT' },
      { name: 'Operations', code: 'OPS' },
      { name: 'Sales & Marketing', code: 'SAL' },
    ];

    for (const dept of depts) {
      const id = `dept-${Date.now()}-${dept.code}`;
      this.departments.set(id, {
        id,
        tenantId: 'system',
        name: dept.name,
        code: dept.code,
        isActive: true,
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  // =================== LOCATIONS ===================

  async createLocation(data: {
    tenantId: string;
    name: string;
    code: string;
    type: LocationType;
    description?: string;
    parentId?: string;
    address?: string;
    city?: string;
    country?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
    floor?: string;
    room?: string;
    building?: string;
    capacity?: number;
    managerId?: string;
    managerName?: string;
    contactPhone?: string;
    contactEmail?: string;
    operatingHours?: string;
    tags?: string[];
    customFields?: Record<string, any>;
    createdBy: string;
  }): Promise<AssetLocation> {
    const id = `loc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    let parentName: string | undefined;
    if (data.parentId) {
      const parent = this.locations.get(data.parentId);
      parentName = parent?.name;
    }

    const location: AssetLocation = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      code: data.code,
      type: data.type,
      description: data.description,
      parentId: data.parentId,
      parentName,
      address: data.address,
      city: data.city,
      country: data.country,
      postalCode: data.postalCode,
      latitude: data.latitude,
      longitude: data.longitude,
      floor: data.floor,
      room: data.room,
      building: data.building,
      capacity: data.capacity,
      currentOccupancy: 0,
      managerId: data.managerId,
      managerName: data.managerName,
      contactPhone: data.contactPhone,
      contactEmail: data.contactEmail,
      operatingHours: data.operatingHours,
      isActive: true,
      tags: data.tags,
      customFields: data.customFields,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    this.locations.set(id, location);

    this.eventEmitter.emit('asset.location_created', { location });

    return location;
  }

  async getLocation(id: string): Promise<AssetLocation | null> {
    return this.locations.get(id) || null;
  }

  async getLocationByCode(code: string): Promise<AssetLocation | null> {
    for (const location of this.locations.values()) {
      if (location.code === code) {
        return location;
      }
    }
    return null;
  }

  async getLocations(
    tenantId: string,
    filters?: {
      type?: LocationType;
      parentId?: string;
      city?: string;
      country?: string;
      isActive?: boolean;
      search?: string;
    },
  ): Promise<AssetLocation[]> {
    let locations = Array.from(this.locations.values()).filter(
      (l) => l.tenantId === tenantId || l.tenantId === 'system',
    );

    if (filters?.type) {
      locations = locations.filter((l) => l.type === filters.type);
    }

    if (filters?.parentId) {
      locations = locations.filter((l) => l.parentId === filters.parentId);
    }

    if (filters?.city) {
      locations = locations.filter((l) =>
        l.city?.toLowerCase().includes(filters.city!.toLowerCase()),
      );
    }

    if (filters?.country) {
      locations = locations.filter((l) =>
        l.country?.toLowerCase().includes(filters.country!.toLowerCase()),
      );
    }

    if (filters?.isActive !== undefined) {
      locations = locations.filter((l) => l.isActive === filters.isActive);
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      locations = locations.filter(
        (l) =>
          l.name.toLowerCase().includes(search) ||
          l.code.toLowerCase().includes(search) ||
          l.address?.toLowerCase().includes(search),
      );
    }

    return locations.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getLocationHierarchy(tenantId: string): Promise<any[]> {
    const locations = await this.getLocations(tenantId);
    const rootLocations = locations.filter((l) => !l.parentId);

    const buildTree = (parent: AssetLocation): any => {
      const children = locations.filter((l) => l.parentId === parent.id);
      return {
        ...parent,
        children: children.map(buildTree),
      };
    };

    return rootLocations.map(buildTree);
  }

  async updateLocation(
    id: string,
    data: Partial<AssetLocation>,
  ): Promise<AssetLocation | null> {
    const location = this.locations.get(id);
    if (!location) return null;

    const updated: AssetLocation = {
      ...location,
      ...data,
      id: location.id,
      tenantId: location.tenantId,
      code: location.code,
      createdBy: location.createdBy,
      createdAt: location.createdAt,
      updatedAt: new Date(),
    };

    this.locations.set(id, updated);

    return updated;
  }

  async deleteLocation(id: string): Promise<boolean> {
    const location = this.locations.get(id);
    if (!location) return false;

    // Check for child locations
    const hasChildren = Array.from(this.locations.values()).some(
      (l) => l.parentId === id,
    );
    if (hasChildren) {
      throw new Error('Cannot delete location with child locations');
    }

    this.locations.delete(id);
    return true;
  }

  // =================== CATEGORIES ===================

  async createCategory(data: {
    tenantId: string;
    name: string;
    code: string;
    description?: string;
    parentId?: string;
    depreciationMethod?: AssetCategory['depreciationMethod'];
    defaultUsefulLife?: number;
    defaultSalvagePercent?: number;
    accountCode?: string;
    glAssetAccount?: string;
    glDepreciationAccount?: string;
    glAccumulatedDepreciationAccount?: string;
    requiresSerialNumber?: boolean;
    requiresWarranty?: boolean;
    requiresInsurance?: boolean;
    requiresMaintenance?: boolean;
    maintenanceInterval?: number;
    icon?: string;
    color?: string;
    sortOrder?: number;
    customFields?: Record<string, any>;
    createdBy: string;
  }): Promise<AssetCategory> {
    const id = `cat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    let parentName: string | undefined;
    if (data.parentId) {
      const parent = this.categories.get(data.parentId);
      parentName = parent?.name;
    }

    const category: AssetCategory = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      code: data.code,
      description: data.description,
      parentId: data.parentId,
      parentName,
      depreciationMethod: data.depreciationMethod || 'straight_line',
      defaultUsefulLife: data.defaultUsefulLife,
      defaultSalvagePercent: data.defaultSalvagePercent,
      accountCode: data.accountCode,
      glAssetAccount: data.glAssetAccount,
      glDepreciationAccount: data.glDepreciationAccount,
      glAccumulatedDepreciationAccount: data.glAccumulatedDepreciationAccount,
      requiresSerialNumber: data.requiresSerialNumber,
      requiresWarranty: data.requiresWarranty,
      requiresInsurance: data.requiresInsurance,
      requiresMaintenance: data.requiresMaintenance,
      maintenanceInterval: data.maintenanceInterval,
      isActive: true,
      icon: data.icon,
      color: data.color,
      sortOrder: data.sortOrder,
      customFields: data.customFields,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    this.categories.set(id, category);

    this.eventEmitter.emit('asset.category_created', { category });

    return category;
  }

  async getCategory(id: string): Promise<AssetCategory | null> {
    return this.categories.get(id) || null;
  }

  async getCategoryByCode(code: string): Promise<AssetCategory | null> {
    for (const category of this.categories.values()) {
      if (category.code === code) {
        return category;
      }
    }
    return null;
  }

  async getCategories(
    tenantId: string,
    filters?: {
      parentId?: string;
      isActive?: boolean;
      search?: string;
    },
  ): Promise<AssetCategory[]> {
    let categories = Array.from(this.categories.values()).filter(
      (c) => c.tenantId === tenantId || c.tenantId === 'system',
    );

    if (filters?.parentId) {
      categories = categories.filter((c) => c.parentId === filters.parentId);
    }

    if (filters?.isActive !== undefined) {
      categories = categories.filter((c) => c.isActive === filters.isActive);
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      categories = categories.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.code.toLowerCase().includes(search),
      );
    }

    return categories.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name));
  }

  async getCategoryHierarchy(tenantId: string): Promise<any[]> {
    const categories = await this.getCategories(tenantId);
    const rootCategories = categories.filter((c) => !c.parentId);

    const buildTree = (parent: AssetCategory): any => {
      const children = categories.filter((c) => c.parentId === parent.id);
      return {
        ...parent,
        children: children.map(buildTree),
      };
    };

    return rootCategories.map(buildTree);
  }

  async updateCategory(
    id: string,
    data: Partial<AssetCategory>,
  ): Promise<AssetCategory | null> {
    const category = this.categories.get(id);
    if (!category) return null;

    const updated: AssetCategory = {
      ...category,
      ...data,
      id: category.id,
      tenantId: category.tenantId,
      code: category.code,
      createdBy: category.createdBy,
      createdAt: category.createdAt,
      updatedAt: new Date(),
    };

    this.categories.set(id, updated);

    return updated;
  }

  // =================== DEPARTMENTS ===================

  async createDepartment(data: {
    tenantId: string;
    name: string;
    code: string;
    description?: string;
    parentId?: string;
    managerId?: string;
    managerName?: string;
    costCenterId?: string;
    costCenterName?: string;
    locationId?: string;
    locationName?: string;
    budget?: number;
    assetBudget?: number;
    headcount?: number;
    createdBy: string;
  }): Promise<Department> {
    const id = `dept-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    let parentName: string | undefined;
    if (data.parentId) {
      const parent = this.departments.get(data.parentId);
      parentName = parent?.name;
    }

    const department: Department = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      code: data.code,
      description: data.description,
      parentId: data.parentId,
      parentName,
      managerId: data.managerId,
      managerName: data.managerName,
      costCenterId: data.costCenterId,
      costCenterName: data.costCenterName,
      locationId: data.locationId,
      locationName: data.locationName,
      budget: data.budget,
      assetBudget: data.assetBudget,
      headcount: data.headcount,
      isActive: true,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    this.departments.set(id, department);

    this.eventEmitter.emit('asset.department_created', { department });

    return department;
  }

  async getDepartment(id: string): Promise<Department | null> {
    return this.departments.get(id) || null;
  }

  async getDepartments(
    tenantId: string,
    filters?: {
      parentId?: string;
      locationId?: string;
      costCenterId?: string;
      isActive?: boolean;
      search?: string;
    },
  ): Promise<Department[]> {
    let departments = Array.from(this.departments.values()).filter(
      (d) => d.tenantId === tenantId || d.tenantId === 'system',
    );

    if (filters?.parentId) {
      departments = departments.filter((d) => d.parentId === filters.parentId);
    }

    if (filters?.locationId) {
      departments = departments.filter((d) => d.locationId === filters.locationId);
    }

    if (filters?.costCenterId) {
      departments = departments.filter((d) => d.costCenterId === filters.costCenterId);
    }

    if (filters?.isActive !== undefined) {
      departments = departments.filter((d) => d.isActive === filters.isActive);
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      departments = departments.filter(
        (d) =>
          d.name.toLowerCase().includes(search) ||
          d.code.toLowerCase().includes(search),
      );
    }

    return departments.sort((a, b) => a.name.localeCompare(b.name));
  }

  async updateDepartment(
    id: string,
    data: Partial<Department>,
  ): Promise<Department | null> {
    const department = this.departments.get(id);
    if (!department) return null;

    const updated: Department = {
      ...department,
      ...data,
      id: department.id,
      tenantId: department.tenantId,
      code: department.code,
      createdBy: department.createdBy,
      createdAt: department.createdAt,
      updatedAt: new Date(),
    };

    this.departments.set(id, updated);

    return updated;
  }

  // =================== COST CENTERS ===================

  async createCostCenter(data: {
    tenantId: string;
    name: string;
    code: string;
    description?: string;
    departmentId?: string;
    departmentName?: string;
    managerId?: string;
    managerName?: string;
    budget?: number;
    fiscalYear?: string;
  }): Promise<CostCenter> {
    const id = `cc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const costCenter: CostCenter = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      code: data.code,
      description: data.description,
      departmentId: data.departmentId,
      departmentName: data.departmentName,
      managerId: data.managerId,
      managerName: data.managerName,
      budget: data.budget || 0,
      allocated: 0,
      remaining: data.budget || 0,
      fiscalYear: data.fiscalYear || String(new Date().getFullYear()),
      isActive: true,
      createdAt: new Date(),
    };

    this.costCenters.set(id, costCenter);

    return costCenter;
  }

  async getCostCenters(
    tenantId: string,
    filters?: {
      departmentId?: string;
      fiscalYear?: string;
      isActive?: boolean;
    },
  ): Promise<CostCenter[]> {
    let costCenters = Array.from(this.costCenters.values()).filter(
      (cc) => cc.tenantId === tenantId,
    );

    if (filters?.departmentId) {
      costCenters = costCenters.filter((cc) => cc.departmentId === filters.departmentId);
    }

    if (filters?.fiscalYear) {
      costCenters = costCenters.filter((cc) => cc.fiscalYear === filters.fiscalYear);
    }

    if (filters?.isActive !== undefined) {
      costCenters = costCenters.filter((cc) => cc.isActive === filters.isActive);
    }

    return costCenters.sort((a, b) => a.name.localeCompare(b.name));
  }

  async allocateToCostCenter(
    costCenterId: string,
    amount: number,
  ): Promise<CostCenter | null> {
    const costCenter = this.costCenters.get(costCenterId);
    if (!costCenter) return null;

    costCenter.allocated = (costCenter.allocated || 0) + amount;
    costCenter.remaining = (costCenter.budget || 0) - costCenter.allocated;

    this.costCenters.set(costCenterId, costCenter);

    return costCenter;
  }

  // =================== STATISTICS ===================

  async getOrganizationStatistics(tenantId: string): Promise<{
    totalLocations: number;
    locationsByType: Record<LocationType, number>;
    totalCategories: number;
    totalDepartments: number;
    totalCostCenters: number;
    totalBudget: number;
    totalAllocated: number;
    budgetUtilization: number;
  }> {
    const locations = await this.getLocations(tenantId);
    const categories = await this.getCategories(tenantId);
    const departments = await this.getDepartments(tenantId);
    const costCenters = await this.getCostCenters(tenantId);

    const locationsByType: Record<LocationType, number> = {
      building: 0,
      floor: 0,
      room: 0,
      area: 0,
      warehouse: 0,
      vehicle: 0,
      external: 0,
    };

    for (const loc of locations) {
      locationsByType[loc.type]++;
    }

    let totalBudget = 0;
    let totalAllocated = 0;

    for (const cc of costCenters) {
      totalBudget += cc.budget || 0;
      totalAllocated += cc.allocated || 0;
    }

    return {
      totalLocations: locations.length,
      locationsByType,
      totalCategories: categories.length,
      totalDepartments: departments.length,
      totalCostCenters: costCenters.length,
      totalBudget,
      totalAllocated,
      budgetUtilization: totalBudget > 0 ? Math.round((totalAllocated / totalBudget) * 100) : 0,
    };
  }
}
