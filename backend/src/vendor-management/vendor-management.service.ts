import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// =================== TYPES ===================

export type VendorStatus = 'prospect' | 'pending_approval' | 'active' | 'suspended' | 'inactive' | 'blacklisted';
export type VendorType = 'supplier' | 'service_provider' | 'contractor' | 'consultant' | 'distributor' | 'manufacturer';
export type VendorTier = 'strategic' | 'preferred' | 'approved' | 'conditional' | 'new';
export type PaymentTerms = 'net_30' | 'net_45' | 'net_60' | 'net_90' | 'due_on_receipt' | 'custom';

export interface Vendor {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  legalName?: string;
  type: VendorType;
  tier: VendorTier;
  status: VendorStatus;
  taxId?: string;
  vatNumber?: string;
  registrationNumber?: string;
  industry?: string;
  category?: string;
  subcategory?: string;
  website?: string;
  email?: string;
  phone?: string;
  fax?: string;
  addresses: VendorAddress[];
  contacts: VendorContact[];
  bankAccounts: VendorBankAccount[];
  paymentTerms: PaymentTerms;
  customPaymentDays?: number;
  creditLimit?: number;
  currency: string;
  taxExempt: boolean;
  taxExemptReason?: string;
  notes?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: Date;
  createdBy: string;
  createdByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorAddress {
  id: string;
  type: 'billing' | 'shipping' | 'headquarters' | 'warehouse' | 'other';
  isPrimary: boolean;
  street: string;
  street2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  countryCode: string;
}

export interface VendorContact {
  id: string;
  isPrimary: boolean;
  type: 'general' | 'sales' | 'support' | 'billing' | 'technical' | 'executive';
  firstName: string;
  lastName: string;
  title?: string;
  department?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  notes?: string;
}

export interface VendorBankAccount {
  id: string;
  isPrimary: boolean;
  bankName: string;
  accountName: string;
  accountNumber: string;
  routingNumber?: string;
  swiftCode?: string;
  iban?: string;
  currency: string;
  country: string;
}

export interface VendorCategory {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  parentName?: string;
  glAccountCode?: string;
  isActive: boolean;
  sortOrder?: number;
  createdAt: Date;
}

export interface VendorDocument {
  id: string;
  vendorId: string;
  type: 'certificate' | 'license' | 'insurance' | 'contract' | 'tax_form' | 'compliance' | 'other';
  name: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  expirationDate?: Date;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface VendorNote {
  id: string;
  vendorId: string;
  type: 'general' | 'meeting' | 'call' | 'issue' | 'feedback';
  subject: string;
  content: string;
  isPrivate: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
}

export interface VendorActivity {
  id: string;
  vendorId: string;
  type: 'created' | 'updated' | 'approved' | 'suspended' | 'reactivated' | 'contact_added' | 'document_uploaded' | 'order_placed' | 'payment_made';
  description: string;
  metadata?: Record<string, any>;
  performedBy: string;
  performedByName: string;
  performedAt: Date;
}

// =================== SERVICE ===================

@Injectable()
export class VendorManagementService {
  private vendors: Map<string, Vendor> = new Map();
  private categories: Map<string, VendorCategory> = new Map();
  private documents: Map<string, VendorDocument> = new Map();
  private notes: Map<string, VendorNote> = new Map();
  private activities: Map<string, VendorActivity> = new Map();

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    // Sample categories
    const defaultCategories = [
      { name: 'IT & Software', code: 'IT' },
      { name: 'Office Supplies', code: 'OFF' },
      { name: 'Professional Services', code: 'PRO' },
      { name: 'Manufacturing', code: 'MFG' },
      { name: 'Logistics & Transportation', code: 'LOG' },
      { name: 'Utilities', code: 'UTL' },
      { name: 'Marketing & Advertising', code: 'MKT' },
      { name: 'Facilities & Maintenance', code: 'FAC' },
      { name: 'Raw Materials', code: 'RAW' },
      { name: 'Equipment & Machinery', code: 'EQP' },
    ];

    for (const cat of defaultCategories) {
      const id = `cat-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      this.categories.set(id, {
        id,
        tenantId: 'system',
        name: cat.name,
        code: cat.code,
        isActive: true,
        createdAt: new Date(),
      });
    }
  }

  // =================== VENDOR CRUD ===================

  async createVendor(data: {
    tenantId: string;
    code?: string;
    name: string;
    legalName?: string;
    type: VendorType;
    tier?: VendorTier;
    taxId?: string;
    vatNumber?: string;
    registrationNumber?: string;
    industry?: string;
    category?: string;
    subcategory?: string;
    website?: string;
    email?: string;
    phone?: string;
    addresses?: Omit<VendorAddress, 'id'>[];
    contacts?: Omit<VendorContact, 'id'>[];
    bankAccounts?: Omit<VendorBankAccount, 'id'>[];
    paymentTerms?: PaymentTerms;
    customPaymentDays?: number;
    creditLimit?: number;
    currency?: string;
    taxExempt?: boolean;
    taxExemptReason?: string;
    notes?: string;
    tags?: string[];
    customFields?: Record<string, any>;
    createdBy: string;
    createdByName?: string;
  }): Promise<Vendor> {
    const id = `vendor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    // Generate vendor code if not provided
    const code = data.code || this.generateVendorCode(data.tenantId);

    // Process addresses
    const addresses: VendorAddress[] = (data.addresses || []).map((addr, index) => ({
      ...addr,
      id: `addr-${Date.now()}-${index}`,
    }));

    // Process contacts
    const contacts: VendorContact[] = (data.contacts || []).map((contact, index) => ({
      ...contact,
      id: `contact-${Date.now()}-${index}`,
    }));

    // Process bank accounts
    const bankAccounts: VendorBankAccount[] = (data.bankAccounts || []).map((bank, index) => ({
      ...bank,
      id: `bank-${Date.now()}-${index}`,
    }));

    const vendor: Vendor = {
      id,
      tenantId: data.tenantId,
      code,
      name: data.name,
      legalName: data.legalName,
      type: data.type,
      tier: data.tier || 'new',
      status: 'pending_approval',
      taxId: data.taxId,
      vatNumber: data.vatNumber,
      registrationNumber: data.registrationNumber,
      industry: data.industry,
      category: data.category,
      subcategory: data.subcategory,
      website: data.website,
      email: data.email,
      phone: data.phone,
      addresses,
      contacts,
      bankAccounts,
      paymentTerms: data.paymentTerms || 'net_30',
      customPaymentDays: data.customPaymentDays,
      creditLimit: data.creditLimit,
      currency: data.currency || 'RON',
      taxExempt: data.taxExempt || false,
      taxExemptReason: data.taxExemptReason,
      notes: data.notes,
      tags: data.tags,
      customFields: data.customFields,
      createdBy: data.createdBy,
      createdByName: data.createdByName,
      createdAt: now,
      updatedAt: now,
    };

    this.vendors.set(id, vendor);

    // Record activity
    await this.recordActivity({
      vendorId: id,
      type: 'created',
      description: `Vendor ${vendor.name} created`,
      performedBy: data.createdBy,
      performedByName: data.createdByName || '',
    });

    this.eventEmitter.emit('vendor.created', { vendor });

    return vendor;
  }

  private generateVendorCode(tenantId: string): string {
    const vendors = Array.from(this.vendors.values()).filter(
      (v) => v.tenantId === tenantId,
    );
    const nextNumber = vendors.length + 1;
    return `V${String(nextNumber).padStart(6, '0')}`;
  }

  async getVendor(id: string): Promise<Vendor | null> {
    return this.vendors.get(id) || null;
  }

  async getVendorByCode(tenantId: string, code: string): Promise<Vendor | null> {
    return Array.from(this.vendors.values()).find(
      (v) => v.tenantId === tenantId && v.code === code,
    ) || null;
  }

  async getVendors(
    tenantId: string,
    filters?: {
      type?: VendorType;
      tier?: VendorTier;
      status?: VendorStatus;
      category?: string;
      search?: string;
      tags?: string[];
      limit?: number;
    },
  ): Promise<{ vendors: Vendor[]; total: number }> {
    let vendors = Array.from(this.vendors.values()).filter(
      (v) => v.tenantId === tenantId,
    );

    if (filters?.type) {
      vendors = vendors.filter((v) => v.type === filters.type);
    }

    if (filters?.tier) {
      vendors = vendors.filter((v) => v.tier === filters.tier);
    }

    if (filters?.status) {
      vendors = vendors.filter((v) => v.status === filters.status);
    }

    if (filters?.category) {
      vendors = vendors.filter((v) => v.category === filters.category);
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      vendors = vendors.filter(
        (v) =>
          v.name.toLowerCase().includes(search) ||
          v.code.toLowerCase().includes(search) ||
          v.email?.toLowerCase().includes(search) ||
          v.taxId?.includes(search),
      );
    }

    if (filters?.tags && filters.tags.length > 0) {
      vendors = vendors.filter(
        (v) => v.tags && filters.tags!.some((tag) => v.tags!.includes(tag)),
      );
    }

    const total = vendors.length;
    vendors = vendors.sort((a, b) => a.name.localeCompare(b.name));

    if (filters?.limit) {
      vendors = vendors.slice(0, filters.limit);
    }

    return { vendors, total };
  }

  async updateVendor(
    id: string,
    data: Partial<Omit<Vendor, 'id' | 'tenantId' | 'code' | 'createdBy' | 'createdAt'>>,
    updatedBy: string,
    updatedByName?: string,
  ): Promise<Vendor | null> {
    const vendor = this.vendors.get(id);
    if (!vendor) return null;

    const updated: Vendor = {
      ...vendor,
      ...data,
      id: vendor.id,
      tenantId: vendor.tenantId,
      code: vendor.code,
      createdBy: vendor.createdBy,
      createdAt: vendor.createdAt,
      updatedAt: new Date(),
    };

    this.vendors.set(id, updated);

    await this.recordActivity({
      vendorId: id,
      type: 'updated',
      description: `Vendor ${updated.name} updated`,
      performedBy: updatedBy,
      performedByName: updatedByName || '',
    });

    this.eventEmitter.emit('vendor.updated', { vendor: updated });

    return updated;
  }

  async approveVendor(
    id: string,
    approvedBy: string,
    approvedByName: string,
  ): Promise<Vendor | null> {
    const vendor = this.vendors.get(id);
    if (!vendor || vendor.status !== 'pending_approval') return null;

    vendor.status = 'active';
    vendor.approvedBy = approvedBy;
    vendor.approvedByName = approvedByName;
    vendor.approvedAt = new Date();
    vendor.updatedAt = new Date();

    this.vendors.set(id, vendor);

    await this.recordActivity({
      vendorId: id,
      type: 'approved',
      description: `Vendor ${vendor.name} approved`,
      performedBy: approvedBy,
      performedByName: approvedByName,
    });

    this.eventEmitter.emit('vendor.approved', { vendor });

    return vendor;
  }

  async suspendVendor(
    id: string,
    reason: string,
    suspendedBy: string,
    suspendedByName: string,
  ): Promise<Vendor | null> {
    const vendor = this.vendors.get(id);
    if (!vendor || vendor.status === 'blacklisted') return null;

    vendor.status = 'suspended';
    vendor.updatedAt = new Date();

    this.vendors.set(id, vendor);

    await this.recordActivity({
      vendorId: id,
      type: 'suspended',
      description: `Vendor ${vendor.name} suspended: ${reason}`,
      metadata: { reason },
      performedBy: suspendedBy,
      performedByName: suspendedByName,
    });

    this.eventEmitter.emit('vendor.suspended', { vendor, reason });

    return vendor;
  }

  async reactivateVendor(
    id: string,
    reactivatedBy: string,
    reactivatedByName: string,
  ): Promise<Vendor | null> {
    const vendor = this.vendors.get(id);
    if (!vendor || !['suspended', 'inactive'].includes(vendor.status)) return null;

    vendor.status = 'active';
    vendor.updatedAt = new Date();

    this.vendors.set(id, vendor);

    await this.recordActivity({
      vendorId: id,
      type: 'reactivated',
      description: `Vendor ${vendor.name} reactivated`,
      performedBy: reactivatedBy,
      performedByName: reactivatedByName,
    });

    this.eventEmitter.emit('vendor.reactivated', { vendor });

    return vendor;
  }

  async blacklistVendor(
    id: string,
    reason: string,
    blacklistedBy: string,
    blacklistedByName: string,
  ): Promise<Vendor | null> {
    const vendor = this.vendors.get(id);
    if (!vendor) return null;

    vendor.status = 'blacklisted';
    vendor.updatedAt = new Date();

    this.vendors.set(id, vendor);

    await this.recordActivity({
      vendorId: id,
      type: 'suspended',
      description: `Vendor ${vendor.name} blacklisted: ${reason}`,
      metadata: { reason, action: 'blacklist' },
      performedBy: blacklistedBy,
      performedByName: blacklistedByName,
    });

    this.eventEmitter.emit('vendor.blacklisted', { vendor, reason });

    return vendor;
  }

  async updateVendorTier(
    id: string,
    tier: VendorTier,
    reason?: string,
    updatedBy?: string,
    updatedByName?: string,
  ): Promise<Vendor | null> {
    const vendor = this.vendors.get(id);
    if (!vendor) return null;

    const previousTier = vendor.tier;
    vendor.tier = tier;
    vendor.updatedAt = new Date();

    this.vendors.set(id, vendor);

    await this.recordActivity({
      vendorId: id,
      type: 'updated',
      description: `Vendor tier changed from ${previousTier} to ${tier}${reason ? `: ${reason}` : ''}`,
      metadata: { previousTier, newTier: tier, reason },
      performedBy: updatedBy || 'system',
      performedByName: updatedByName || 'System',
    });

    this.eventEmitter.emit('vendor.tier_changed', { vendor, previousTier });

    return vendor;
  }

  // =================== CONTACTS ===================

  async addContact(
    vendorId: string,
    contact: Omit<VendorContact, 'id'>,
    addedBy: string,
    addedByName?: string,
  ): Promise<Vendor | null> {
    const vendor = this.vendors.get(vendorId);
    if (!vendor) return null;

    const newContact: VendorContact = {
      ...contact,
      id: `contact-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    };

    // If this is primary, unset other primaries
    if (newContact.isPrimary) {
      vendor.contacts.forEach((c) => (c.isPrimary = false));
    }

    vendor.contacts.push(newContact);
    vendor.updatedAt = new Date();

    this.vendors.set(vendorId, vendor);

    await this.recordActivity({
      vendorId,
      type: 'contact_added',
      description: `Contact ${newContact.firstName} ${newContact.lastName} added`,
      performedBy: addedBy,
      performedByName: addedByName || '',
    });

    return vendor;
  }

  async updateContact(
    vendorId: string,
    contactId: string,
    updates: Partial<VendorContact>,
  ): Promise<Vendor | null> {
    const vendor = this.vendors.get(vendorId);
    if (!vendor) return null;

    const contactIndex = vendor.contacts.findIndex((c) => c.id === contactId);
    if (contactIndex === -1) return null;

    vendor.contacts[contactIndex] = {
      ...vendor.contacts[contactIndex],
      ...updates,
      id: contactId,
    };

    vendor.updatedAt = new Date();
    this.vendors.set(vendorId, vendor);

    return vendor;
  }

  async removeContact(vendorId: string, contactId: string): Promise<boolean> {
    const vendor = this.vendors.get(vendorId);
    if (!vendor) return false;

    const initialLength = vendor.contacts.length;
    vendor.contacts = vendor.contacts.filter((c) => c.id !== contactId);

    if (vendor.contacts.length === initialLength) return false;

    vendor.updatedAt = new Date();
    this.vendors.set(vendorId, vendor);

    return true;
  }

  // =================== ADDRESSES ===================

  async addAddress(
    vendorId: string,
    address: Omit<VendorAddress, 'id'>,
  ): Promise<Vendor | null> {
    const vendor = this.vendors.get(vendorId);
    if (!vendor) return null;

    const newAddress: VendorAddress = {
      ...address,
      id: `addr-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    };

    if (newAddress.isPrimary) {
      vendor.addresses.forEach((a) => (a.isPrimary = false));
    }

    vendor.addresses.push(newAddress);
    vendor.updatedAt = new Date();

    this.vendors.set(vendorId, vendor);

    return vendor;
  }

  async updateAddress(
    vendorId: string,
    addressId: string,
    updates: Partial<VendorAddress>,
  ): Promise<Vendor | null> {
    const vendor = this.vendors.get(vendorId);
    if (!vendor) return null;

    const addrIndex = vendor.addresses.findIndex((a) => a.id === addressId);
    if (addrIndex === -1) return null;

    vendor.addresses[addrIndex] = {
      ...vendor.addresses[addrIndex],
      ...updates,
      id: addressId,
    };

    vendor.updatedAt = new Date();
    this.vendors.set(vendorId, vendor);

    return vendor;
  }

  // =================== BANK ACCOUNTS ===================

  async addBankAccount(
    vendorId: string,
    bankAccount: Omit<VendorBankAccount, 'id'>,
  ): Promise<Vendor | null> {
    const vendor = this.vendors.get(vendorId);
    if (!vendor) return null;

    const newAccount: VendorBankAccount = {
      ...bankAccount,
      id: `bank-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    };

    if (newAccount.isPrimary) {
      vendor.bankAccounts.forEach((b) => (b.isPrimary = false));
    }

    vendor.bankAccounts.push(newAccount);
    vendor.updatedAt = new Date();

    this.vendors.set(vendorId, vendor);

    return vendor;
  }

  // =================== CATEGORIES ===================

  async createCategory(data: {
    tenantId: string;
    name: string;
    code: string;
    description?: string;
    parentId?: string;
    glAccountCode?: string;
    sortOrder?: number;
  }): Promise<VendorCategory> {
    const id = `cat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let parentName: string | undefined;
    if (data.parentId) {
      const parent = this.categories.get(data.parentId);
      parentName = parent?.name;
    }

    const category: VendorCategory = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      code: data.code,
      description: data.description,
      parentId: data.parentId,
      parentName,
      glAccountCode: data.glAccountCode,
      isActive: true,
      sortOrder: data.sortOrder,
      createdAt: new Date(),
    };

    this.categories.set(id, category);

    return category;
  }

  async getCategories(
    tenantId: string,
    parentId?: string,
  ): Promise<VendorCategory[]> {
    let categories = Array.from(this.categories.values()).filter(
      (c) => (c.tenantId === tenantId || c.tenantId === 'system') && c.isActive,
    );

    if (parentId !== undefined) {
      categories = categories.filter((c) => c.parentId === parentId);
    }

    return categories.sort((a, b) => {
      if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
        return a.sortOrder - b.sortOrder;
      }
      return a.name.localeCompare(b.name);
    });
  }

  // =================== DOCUMENTS ===================

  async addDocument(data: {
    vendorId: string;
    type: VendorDocument['type'];
    name: string;
    description?: string;
    fileUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    expirationDate?: Date;
    uploadedBy: string;
  }): Promise<VendorDocument> {
    const id = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const document: VendorDocument = {
      id,
      vendorId: data.vendorId,
      type: data.type,
      name: data.name,
      description: data.description,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      expirationDate: data.expirationDate,
      isVerified: false,
      uploadedBy: data.uploadedBy,
      uploadedAt: new Date(),
    };

    this.documents.set(id, document);

    await this.recordActivity({
      vendorId: data.vendorId,
      type: 'document_uploaded',
      description: `Document ${data.name} uploaded`,
      metadata: { documentType: data.type },
      performedBy: data.uploadedBy,
      performedByName: '',
    });

    return document;
  }

  async getVendorDocuments(vendorId: string): Promise<VendorDocument[]> {
    return Array.from(this.documents.values())
      .filter((d) => d.vendorId === vendorId)
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }

  async verifyDocument(
    id: string,
    verifiedBy: string,
    verifiedByName?: string,
  ): Promise<VendorDocument | null> {
    const doc = this.documents.get(id);
    if (!doc) return null;

    doc.isVerified = true;
    doc.verifiedBy = verifiedBy;
    doc.verifiedAt = new Date();

    this.documents.set(id, doc);

    return doc;
  }

  async getExpiringDocuments(
    tenantId: string,
    daysAhead: number = 30,
  ): Promise<VendorDocument[]> {
    const vendors = Array.from(this.vendors.values()).filter(
      (v) => v.tenantId === tenantId,
    );
    const vendorIds = new Set(vendors.map((v) => v.id));

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

    return Array.from(this.documents.values()).filter(
      (d) =>
        vendorIds.has(d.vendorId) &&
        d.expirationDate &&
        d.expirationDate <= cutoffDate,
    );
  }

  // =================== NOTES ===================

  async addNote(data: {
    vendorId: string;
    type: VendorNote['type'];
    subject: string;
    content: string;
    isPrivate?: boolean;
    createdBy: string;
    createdByName: string;
  }): Promise<VendorNote> {
    const id = `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const note: VendorNote = {
      id,
      vendorId: data.vendorId,
      type: data.type,
      subject: data.subject,
      content: data.content,
      isPrivate: data.isPrivate || false,
      createdBy: data.createdBy,
      createdByName: data.createdByName,
      createdAt: new Date(),
    };

    this.notes.set(id, note);

    return note;
  }

  async getVendorNotes(
    vendorId: string,
    includePrivate: boolean = false,
  ): Promise<VendorNote[]> {
    let notes = Array.from(this.notes.values()).filter(
      (n) => n.vendorId === vendorId,
    );

    if (!includePrivate) {
      notes = notes.filter((n) => !n.isPrivate);
    }

    return notes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // =================== ACTIVITY LOG ===================

  private async recordActivity(data: {
    vendorId: string;
    type: VendorActivity['type'];
    description: string;
    metadata?: Record<string, any>;
    performedBy: string;
    performedByName: string;
  }): Promise<void> {
    const id = `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const activity: VendorActivity = {
      id,
      vendorId: data.vendorId,
      type: data.type,
      description: data.description,
      metadata: data.metadata,
      performedBy: data.performedBy,
      performedByName: data.performedByName,
      performedAt: new Date(),
    };

    this.activities.set(id, activity);
  }

  async getVendorActivities(
    vendorId: string,
    limit?: number,
  ): Promise<VendorActivity[]> {
    let activities = Array.from(this.activities.values())
      .filter((a) => a.vendorId === vendorId)
      .sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime());

    if (limit) {
      activities = activities.slice(0, limit);
    }

    return activities;
  }

  // =================== STATISTICS ===================

  async getVendorStatistics(tenantId: string): Promise<{
    totalVendors: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    byTier: Record<string, number>;
    pendingApproval: number;
    activeVendors: number;
    newThisMonth: number;
    expiringDocuments: number;
  }> {
    const vendors = Array.from(this.vendors.values()).filter(
      (v) => v.tenantId === tenantId,
    );

    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byTier: Record<string, number> = {};

    for (const vendor of vendors) {
      byStatus[vendor.status] = (byStatus[vendor.status] || 0) + 1;
      byType[vendor.type] = (byType[vendor.type] || 0) + 1;
      byTier[vendor.tier] = (byTier[vendor.tier] || 0) + 1;
    }

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const newThisMonth = vendors.filter((v) => v.createdAt >= thisMonth).length;

    const expiringDocs = await this.getExpiringDocuments(tenantId, 30);

    return {
      totalVendors: vendors.length,
      byStatus,
      byType,
      byTier,
      pendingApproval: byStatus['pending_approval'] || 0,
      activeVendors: byStatus['active'] || 0,
      newThisMonth,
      expiringDocuments: expiringDocs.length,
    };
  }
}
