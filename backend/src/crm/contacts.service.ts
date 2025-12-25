import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';

// Contact Types
export interface Contact {
  id: string;
  tenantId: string;
  type: 'person' | 'company';
  status: 'active' | 'inactive' | 'archived';

  // Basic Info
  firstName?: string;
  lastName?: string;
  companyName?: string;
  jobTitle?: string;
  department?: string;

  // Contact Info
  email: string;
  phone?: string;
  mobile?: string;
  website?: string;

  // Address
  address?: Address;

  // Classification
  source: ContactSource;
  leadScore: number;
  tags: string[];
  customFields: Record<string, any>;

  // Relationships
  ownerId?: string;
  companyId?: string;
  parentContactId?: string;

  // Lifecycle
  lifecycleStage: LifecycleStage;
  lastActivityAt?: Date;
  lastContactedAt?: Date;
  convertedAt?: Date;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country: string;
}

export type ContactSource =
  | 'website'
  | 'referral'
  | 'social_media'
  | 'cold_outreach'
  | 'event'
  | 'advertisement'
  | 'partner'
  | 'import'
  | 'api'
  | 'other';

export type LifecycleStage =
  | 'subscriber'
  | 'lead'
  | 'marketing_qualified_lead'
  | 'sales_qualified_lead'
  | 'opportunity'
  | 'customer'
  | 'evangelist'
  | 'other';

export interface ContactNote {
  id: string;
  contactId: string;
  content: string;
  type: 'note' | 'call' | 'email' | 'meeting' | 'task';
  createdAt: Date;
  createdBy: string;
}

export interface ContactActivity {
  id: string;
  contactId: string;
  type: 'email_opened' | 'email_clicked' | 'page_viewed' | 'form_submitted' | 'deal_created' | 'note_added' | 'call_logged' | 'meeting_scheduled';
  description: string;
  metadata?: Record<string, any>;
  occurredAt: Date;
}

export interface ContactSegment {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: 'static' | 'dynamic';
  rules?: SegmentRule[];
  staticContactIds?: string[];
  contactCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SegmentRule {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: any;
}

export interface ContactListFilters {
  search?: string;
  type?: Contact['type'];
  status?: Contact['status'];
  source?: ContactSource;
  lifecycleStage?: LifecycleStage;
  tags?: string[];
  ownerId?: string;
  companyId?: string;
  minLeadScore?: number;
  maxLeadScore?: number;
  createdAfter?: Date;
  createdBefore?: Date;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  private contacts = new Map<string, Contact>();
  private notes = new Map<string, ContactNote>();
  private activities = new Map<string, ContactActivity>();
  private segments = new Map<string, ContactSegment>();

  constructor(private eventEmitter: EventEmitter2) {}

  // =================== CONTACTS ===================

  async createContact(data: {
    tenantId: string;
    type: Contact['type'];
    firstName?: string;
    lastName?: string;
    companyName?: string;
    jobTitle?: string;
    department?: string;
    email: string;
    phone?: string;
    mobile?: string;
    website?: string;
    address?: Address;
    source: ContactSource;
    tags?: string[];
    customFields?: Record<string, any>;
    ownerId?: string;
    companyId?: string;
    createdBy: string;
  }): Promise<Contact> {
    const contact: Contact = {
      id: uuidv4(),
      tenantId: data.tenantId,
      type: data.type,
      status: 'active',
      firstName: data.firstName,
      lastName: data.lastName,
      companyName: data.companyName,
      jobTitle: data.jobTitle,
      department: data.department,
      email: data.email,
      phone: data.phone,
      mobile: data.mobile,
      website: data.website,
      address: data.address,
      source: data.source,
      leadScore: 0,
      tags: data.tags || [],
      customFields: data.customFields || {},
      ownerId: data.ownerId,
      companyId: data.companyId,
      lifecycleStage: 'lead',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: data.createdBy,
    };

    this.contacts.set(contact.id, contact);

    this.eventEmitter.emit('contact.created', {
      contactId: contact.id,
      tenantId: data.tenantId,
    });

    // Record activity
    await this.recordActivity({
      contactId: contact.id,
      type: 'form_submitted',
      description: 'Contact created',
    });

    return contact;
  }

  async getContacts(tenantId: string, filters?: ContactListFilters): Promise<{
    contacts: Contact[];
    total: number;
  }> {
    let contacts = Array.from(this.contacts.values())
      .filter(c => c.tenantId === tenantId);

    // Apply filters
    if (filters) {
      if (filters.search) {
        const search = filters.search.toLowerCase();
        contacts = contacts.filter(c =>
          c.email.toLowerCase().includes(search) ||
          c.firstName?.toLowerCase().includes(search) ||
          c.lastName?.toLowerCase().includes(search) ||
          c.companyName?.toLowerCase().includes(search)
        );
      }
      if (filters.type) contacts = contacts.filter(c => c.type === filters.type);
      if (filters.status) contacts = contacts.filter(c => c.status === filters.status);
      if (filters.source) contacts = contacts.filter(c => c.source === filters.source);
      if (filters.lifecycleStage) contacts = contacts.filter(c => c.lifecycleStage === filters.lifecycleStage);
      if (filters.tags?.length) contacts = contacts.filter(c => filters.tags!.some(t => c.tags.includes(t)));
      if (filters.ownerId) contacts = contacts.filter(c => c.ownerId === filters.ownerId);
      if (filters.companyId) contacts = contacts.filter(c => c.companyId === filters.companyId);
      if (filters.minLeadScore !== undefined) contacts = contacts.filter(c => c.leadScore >= filters.minLeadScore!);
      if (filters.maxLeadScore !== undefined) contacts = contacts.filter(c => c.leadScore <= filters.maxLeadScore!);
      if (filters.createdAfter) contacts = contacts.filter(c => c.createdAt >= filters.createdAfter!);
      if (filters.createdBefore) contacts = contacts.filter(c => c.createdAt <= filters.createdBefore!);
    }

    const total = contacts.length;

    // Sort
    const sortBy = filters?.sortBy || 'createdAt';
    const sortOrder = filters?.sortOrder || 'desc';
    contacts.sort((a, b) => {
      const aVal = (a as any)[sortBy];
      const bVal = (b as any)[sortBy];
      if (sortOrder === 'desc') return bVal > aVal ? 1 : -1;
      return aVal > bVal ? 1 : -1;
    });

    // Pagination
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    contacts = contacts.slice(offset, offset + limit);

    return { contacts, total };
  }

  async getContact(id: string): Promise<Contact | null> {
    return this.contacts.get(id) || null;
  }

  async updateContact(
    id: string,
    updates: Partial<Pick<Contact,
      'firstName' | 'lastName' | 'companyName' | 'jobTitle' | 'department' |
      'email' | 'phone' | 'mobile' | 'website' | 'address' |
      'status' | 'lifecycleStage' | 'tags' | 'customFields' | 'ownerId'
    >>,
  ): Promise<Contact | null> {
    const contact = this.contacts.get(id);
    if (!contact) return null;

    Object.assign(contact, updates, { updatedAt: new Date() });
    this.contacts.set(id, contact);

    this.eventEmitter.emit('contact.updated', {
      contactId: id,
      updates,
    });

    return contact;
  }

  async deleteContact(id: string): Promise<void> {
    this.contacts.delete(id);

    // Delete related data
    for (const [noteId, note] of this.notes) {
      if (note.contactId === id) this.notes.delete(noteId);
    }
    for (const [actId, act] of this.activities) {
      if (act.contactId === id) this.activities.delete(actId);
    }
  }

  async mergeContacts(primaryId: string, secondaryId: string): Promise<Contact | null> {
    const primary = this.contacts.get(primaryId);
    const secondary = this.contacts.get(secondaryId);
    if (!primary || !secondary) return null;

    // Merge data from secondary into primary
    const mergedTags = [...new Set([...primary.tags, ...secondary.tags])];
    const mergedCustomFields = { ...secondary.customFields, ...primary.customFields };

    primary.tags = mergedTags;
    primary.customFields = mergedCustomFields;
    primary.leadScore = Math.max(primary.leadScore, secondary.leadScore);
    primary.updatedAt = new Date();

    // Move notes and activities
    for (const note of this.notes.values()) {
      if (note.contactId === secondaryId) {
        note.contactId = primaryId;
      }
    }
    for (const activity of this.activities.values()) {
      if (activity.contactId === secondaryId) {
        activity.contactId = primaryId;
      }
    }

    // Delete secondary
    this.contacts.delete(secondaryId);
    this.contacts.set(primaryId, primary);

    this.eventEmitter.emit('contact.merged', {
      primaryId,
      secondaryId,
    });

    return primary;
  }

  // =================== LEAD SCORING ===================

  async updateLeadScore(contactId: string, score: number): Promise<Contact | null> {
    const contact = this.contacts.get(contactId);
    if (!contact) return null;

    contact.leadScore = Math.max(0, Math.min(100, score));
    contact.updatedAt = new Date();
    this.contacts.set(contactId, contact);

    return contact;
  }

  async incrementLeadScore(contactId: string, points: number): Promise<Contact | null> {
    const contact = this.contacts.get(contactId);
    if (!contact) return null;

    contact.leadScore = Math.max(0, Math.min(100, contact.leadScore + points));
    contact.updatedAt = new Date();
    this.contacts.set(contactId, contact);

    return contact;
  }

  // =================== NOTES ===================

  async addNote(data: {
    contactId: string;
    content: string;
    type: ContactNote['type'];
    createdBy: string;
  }): Promise<ContactNote> {
    const note: ContactNote = {
      id: uuidv4(),
      contactId: data.contactId,
      content: data.content,
      type: data.type,
      createdAt: new Date(),
      createdBy: data.createdBy,
    };

    this.notes.set(note.id, note);

    // Update contact's last activity
    const contact = this.contacts.get(data.contactId);
    if (contact) {
      contact.lastActivityAt = new Date();
      if (data.type === 'call' || data.type === 'email') {
        contact.lastContactedAt = new Date();
      }
      this.contacts.set(contact.id, contact);
    }

    // Record activity
    await this.recordActivity({
      contactId: data.contactId,
      type: 'note_added',
      description: `Added ${data.type}: ${data.content.substring(0, 50)}...`,
    });

    return note;
  }

  async getNotes(contactId: string): Promise<ContactNote[]> {
    return Array.from(this.notes.values())
      .filter(n => n.contactId === contactId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async deleteNote(id: string): Promise<void> {
    this.notes.delete(id);
  }

  // =================== ACTIVITIES ===================

  async recordActivity(data: {
    contactId: string;
    type: ContactActivity['type'];
    description: string;
    metadata?: Record<string, any>;
  }): Promise<ContactActivity> {
    const activity: ContactActivity = {
      id: uuidv4(),
      contactId: data.contactId,
      type: data.type,
      description: data.description,
      metadata: data.metadata,
      occurredAt: new Date(),
    };

    this.activities.set(activity.id, activity);

    // Update contact
    const contact = this.contacts.get(data.contactId);
    if (contact) {
      contact.lastActivityAt = new Date();
      this.contacts.set(contact.id, contact);
    }

    return activity;
  }

  async getActivities(contactId: string, limit = 50): Promise<ContactActivity[]> {
    return Array.from(this.activities.values())
      .filter(a => a.contactId === contactId)
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .slice(0, limit);
  }

  // =================== SEGMENTS ===================

  async createSegment(data: {
    tenantId: string;
    name: string;
    description?: string;
    type: ContactSegment['type'];
    rules?: SegmentRule[];
    staticContactIds?: string[];
  }): Promise<ContactSegment> {
    const segment: ContactSegment = {
      id: uuidv4(),
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      type: data.type,
      rules: data.rules,
      staticContactIds: data.staticContactIds,
      contactCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Calculate contact count
    if (data.type === 'static' && data.staticContactIds) {
      segment.contactCount = data.staticContactIds.length;
    } else if (data.type === 'dynamic' && data.rules) {
      const contacts = await this.getContactsByRules(data.tenantId, data.rules);
      segment.contactCount = contacts.length;
    }

    this.segments.set(segment.id, segment);
    return segment;
  }

  async getSegments(tenantId: string): Promise<ContactSegment[]> {
    return Array.from(this.segments.values())
      .filter(s => s.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getSegmentContacts(segmentId: string): Promise<Contact[]> {
    const segment = this.segments.get(segmentId);
    if (!segment) return [];

    if (segment.type === 'static' && segment.staticContactIds) {
      return segment.staticContactIds
        .map(id => this.contacts.get(id))
        .filter(Boolean) as Contact[];
    }

    if (segment.type === 'dynamic' && segment.rules) {
      return this.getContactsByRules(segment.tenantId, segment.rules);
    }

    return [];
  }

  private async getContactsByRules(tenantId: string, rules: SegmentRule[]): Promise<Contact[]> {
    return Array.from(this.contacts.values())
      .filter(c => c.tenantId === tenantId)
      .filter(contact => {
        return rules.every(rule => {
          const value = (contact as any)[rule.field] ?? contact.customFields[rule.field];

          switch (rule.operator) {
            case 'equals': return value === rule.value;
            case 'not_equals': return value !== rule.value;
            case 'contains': return String(value).toLowerCase().includes(String(rule.value).toLowerCase());
            case 'not_contains': return !String(value).toLowerCase().includes(String(rule.value).toLowerCase());
            case 'greater_than': return Number(value) > Number(rule.value);
            case 'less_than': return Number(value) < Number(rule.value);
            case 'is_empty': return !value;
            case 'is_not_empty': return !!value;
            default: return true;
          }
        });
      });
  }

  async updateSegment(
    id: string,
    updates: Partial<Pick<ContactSegment, 'name' | 'description' | 'rules' | 'staticContactIds'>>,
  ): Promise<ContactSegment | null> {
    const segment = this.segments.get(id);
    if (!segment) return null;

    Object.assign(segment, updates, { updatedAt: new Date() });

    // Recalculate count
    if (segment.type === 'static' && segment.staticContactIds) {
      segment.contactCount = segment.staticContactIds.length;
    } else if (segment.type === 'dynamic' && segment.rules) {
      const contacts = await this.getContactsByRules(segment.tenantId, segment.rules);
      segment.contactCount = contacts.length;
    }

    this.segments.set(id, segment);
    return segment;
  }

  async deleteSegment(id: string): Promise<void> {
    this.segments.delete(id);
  }

  // =================== BULK OPERATIONS ===================

  async bulkUpdateContacts(
    contactIds: string[],
    updates: Partial<Pick<Contact, 'status' | 'lifecycleStage' | 'tags' | 'ownerId'>>,
  ): Promise<{ updated: number; failed: number }> {
    let updated = 0;
    let failed = 0;

    for (const id of contactIds) {
      const contact = this.contacts.get(id);
      if (contact) {
        Object.assign(contact, updates, { updatedAt: new Date() });
        this.contacts.set(id, contact);
        updated++;
      } else {
        failed++;
      }
    }

    return { updated, failed };
  }

  async bulkDeleteContacts(contactIds: string[]): Promise<{ deleted: number }> {
    let deleted = 0;

    for (const id of contactIds) {
      if (this.contacts.has(id)) {
        await this.deleteContact(id);
        deleted++;
      }
    }

    return { deleted };
  }

  async bulkAddToSegment(segmentId: string, contactIds: string[]): Promise<ContactSegment | null> {
    const segment = this.segments.get(segmentId);
    if (!segment || segment.type !== 'static') return null;

    segment.staticContactIds = [
      ...new Set([...(segment.staticContactIds || []), ...contactIds]),
    ];
    segment.contactCount = segment.staticContactIds.length;
    segment.updatedAt = new Date();

    this.segments.set(segmentId, segment);
    return segment;
  }

  // =================== IMPORT/EXPORT ===================

  async importContacts(
    tenantId: string,
    contacts: Array<Omit<Parameters<ContactsService['createContact']>[0], 'tenantId'>>,
    options: { updateExisting?: boolean; skipDuplicates?: boolean } = {},
  ): Promise<{ created: number; updated: number; skipped: number; errors: string[] }> {
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const contactData of contacts) {
      try {
        // Check for existing contact by email
        const existing = Array.from(this.contacts.values())
          .find(c => c.tenantId === tenantId && c.email === contactData.email);

        if (existing) {
          if (options.updateExisting) {
            await this.updateContact(existing.id, contactData);
            updated++;
          } else if (options.skipDuplicates) {
            skipped++;
          } else {
            errors.push(`Duplicate email: ${contactData.email}`);
          }
        } else {
          await this.createContact({ ...contactData, tenantId });
          created++;
        }
      } catch (error) {
        errors.push(`Error importing ${contactData.email}: ${error}`);
      }
    }

    return { created, updated, skipped, errors };
  }

  async exportContacts(
    tenantId: string,
    filters?: ContactListFilters,
  ): Promise<Contact[]> {
    const { contacts } = await this.getContacts(tenantId, { ...filters, limit: 10000 });
    return contacts;
  }

  // =================== STATS ===================

  async getStats(tenantId: string): Promise<{
    totalContacts: number;
    activeContacts: number;
    newThisMonth: number;
    byLifecycleStage: Record<LifecycleStage, number>;
    bySource: Record<ContactSource, number>;
    avgLeadScore: number;
    totalSegments: number;
  }> {
    const contacts = Array.from(this.contacts.values())
      .filter(c => c.tenantId === tenantId);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const byLifecycleStage: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    let totalLeadScore = 0;

    for (const contact of contacts) {
      byLifecycleStage[contact.lifecycleStage] = (byLifecycleStage[contact.lifecycleStage] || 0) + 1;
      bySource[contact.source] = (bySource[contact.source] || 0) + 1;
      totalLeadScore += contact.leadScore;
    }

    const segments = Array.from(this.segments.values())
      .filter(s => s.tenantId === tenantId);

    return {
      totalContacts: contacts.length,
      activeContacts: contacts.filter(c => c.status === 'active').length,
      newThisMonth: contacts.filter(c => c.createdAt >= monthStart).length,
      byLifecycleStage: byLifecycleStage as Record<LifecycleStage, number>,
      bySource: bySource as Record<ContactSource, number>,
      avgLeadScore: contacts.length > 0 ? Math.round(totalLeadScore / contacts.length) : 0,
      totalSegments: segments.length,
    };
  }
}
