import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ContactsService,
  Contact,
  ContactSource,
  LifecycleStage,
} from './contacts.service';

// Mock uuid module
jest.mock('uuid', () => ({
  v4: jest.fn(() => `uuid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`),
}));

describe('ContactsService', () => {
  let service: ContactsService;
  let eventEmitter: EventEmitter2;

  const createContactData = (overrides = {}) => ({
    tenantId: 'tenant-1',
    type: 'person' as const,
    firstName: 'Ion',
    lastName: 'Popescu',
    email: `ion.popescu.${Date.now()}@example.com`,
    source: 'website' as ContactSource,
    createdBy: 'user-1',
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactsService,
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ContactsService>(ContactsService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Contacts', () => {
    describe('createContact', () => {
      it('should create person contact', async () => {
        const contact = await service.createContact(createContactData());

        expect(contact.id).toBeDefined();
        expect(contact.type).toBe('person');
        expect(contact.firstName).toBe('Ion');
        expect(contact.lastName).toBe('Popescu');
        expect(contact.status).toBe('active');
        expect(contact.lifecycleStage).toBe('lead');
        expect(contact.leadScore).toBe(0);
        expect(contact.createdAt).toBeInstanceOf(Date);
      });

      it('should create company contact', async () => {
        const contact = await service.createContact(createContactData({
          type: 'company',
          companyName: 'Test SRL',
          firstName: undefined,
          lastName: undefined,
        }));

        expect(contact.type).toBe('company');
        expect(contact.companyName).toBe('Test SRL');
      });

      it('should emit contact.created event', async () => {
        const contact = await service.createContact(createContactData());

        expect(eventEmitter.emit).toHaveBeenCalledWith('contact.created', {
          contactId: contact.id,
          tenantId: 'tenant-1',
        });
      });

      it('should support all contact sources', async () => {
        const sources: ContactSource[] = [
          'website', 'referral', 'social_media', 'cold_outreach',
          'event', 'advertisement', 'partner', 'import', 'api', 'other',
        ];

        for (const source of sources) {
          const contact = await service.createContact(createContactData({ source }));
          expect(contact.source).toBe(source);
          await new Promise(r => setTimeout(r, 5));
        }
      });

      it('should initialize tags as empty array', async () => {
        const contact = await service.createContact(createContactData());

        expect(contact.tags).toEqual([]);
      });

      it('should support custom fields', async () => {
        const contact = await service.createContact(createContactData({
          customFields: { industry: 'Technology', size: 'enterprise' },
        }));

        expect(contact.customFields.industry).toBe('Technology');
        expect(contact.customFields.size).toBe('enterprise');
      });

      it('should support address', async () => {
        const contact = await service.createContact(createContactData({
          address: {
            street: 'Calea Victoriei 1',
            city: 'București',
            state: 'București',
            postalCode: '010001',
            country: 'RO',
          },
        }));

        expect(contact.address?.city).toBe('București');
        expect(contact.address?.country).toBe('RO');
      });
    });

    describe('getContacts', () => {
      it('should return contacts for tenant', async () => {
        await service.createContact(createContactData());
        await new Promise(r => setTimeout(r, 5));
        await service.createContact(createContactData());
        await new Promise(r => setTimeout(r, 5));
        await service.createContact(createContactData({ tenantId: 'tenant-2' }));

        const result = await service.getContacts('tenant-1');

        expect(result.contacts).toHaveLength(2);
        expect(result.total).toBe(2);
      });

      it('should filter by search', async () => {
        await service.createContact(createContactData({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        }));
        await new Promise(r => setTimeout(r, 5));
        await service.createContact(createContactData({
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
        }));

        const result = await service.getContacts('tenant-1', { search: 'john' });

        expect(result.contacts).toHaveLength(1);
        expect(result.contacts[0].firstName).toBe('John');
      });

      it('should filter by type', async () => {
        await service.createContact(createContactData({ type: 'person' }));
        await new Promise(r => setTimeout(r, 5));
        await service.createContact(createContactData({ type: 'company', companyName: 'Corp' }));

        const result = await service.getContacts('tenant-1', { type: 'person' });

        expect(result.contacts).toHaveLength(1);
        expect(result.contacts[0].type).toBe('person');
      });

      it('should filter by status', async () => {
        const contact1 = await service.createContact(createContactData());
        await service.updateContact(contact1.id, { status: 'inactive' });
        await new Promise(r => setTimeout(r, 5));
        await service.createContact(createContactData());

        const result = await service.getContacts('tenant-1', { status: 'active' });

        expect(result.contacts).toHaveLength(1);
        expect(result.contacts[0].status).toBe('active');
      });

      it('should filter by source', async () => {
        await service.createContact(createContactData({ source: 'website' }));
        await new Promise(r => setTimeout(r, 5));
        await service.createContact(createContactData({ source: 'referral' }));

        const result = await service.getContacts('tenant-1', { source: 'website' });

        expect(result.contacts).toHaveLength(1);
        expect(result.contacts[0].source).toBe('website');
      });

      it('should filter by lifecycle stage', async () => {
        const contact1 = await service.createContact(createContactData());
        await service.updateContact(contact1.id, { lifecycleStage: 'customer' });
        await new Promise(r => setTimeout(r, 5));
        await service.createContact(createContactData());

        const result = await service.getContacts('tenant-1', { lifecycleStage: 'customer' });

        expect(result.contacts).toHaveLength(1);
        expect(result.contacts[0].lifecycleStage).toBe('customer');
      });

      it('should filter by tags', async () => {
        await service.createContact(createContactData({ tags: ['vip', 'enterprise'] }));
        await new Promise(r => setTimeout(r, 5));
        await service.createContact(createContactData({ tags: ['startup'] }));

        const result = await service.getContacts('tenant-1', { tags: ['vip'] });

        expect(result.contacts).toHaveLength(1);
        expect(result.contacts[0].tags).toContain('vip');
      });

      it('should filter by lead score range', async () => {
        const c1 = await service.createContact(createContactData());
        await service.updateLeadScore(c1.id, 80);
        await new Promise(r => setTimeout(r, 5));
        const c2 = await service.createContact(createContactData());
        await service.updateLeadScore(c2.id, 30);

        const result = await service.getContacts('tenant-1', {
          minLeadScore: 50,
          maxLeadScore: 100,
        });

        expect(result.contacts).toHaveLength(1);
        expect(result.contacts[0].leadScore).toBe(80);
      });

      it('should filter by owner', async () => {
        await service.createContact(createContactData({ ownerId: 'owner-1' }));
        await new Promise(r => setTimeout(r, 5));
        await service.createContact(createContactData({ ownerId: 'owner-2' }));

        const result = await service.getContacts('tenant-1', { ownerId: 'owner-1' });

        expect(result.contacts).toHaveLength(1);
        expect(result.contacts[0].ownerId).toBe('owner-1');
      });

      it('should paginate results', async () => {
        for (let i = 0; i < 5; i++) {
          await service.createContact(createContactData());
          await new Promise(r => setTimeout(r, 5));
        }

        const result = await service.getContacts('tenant-1', { limit: 2, offset: 2 });

        expect(result.contacts).toHaveLength(2);
        expect(result.total).toBe(5);
      });

      it('should sort results', async () => {
        const c1 = await service.createContact(createContactData({ firstName: 'Zoe' }));
        await new Promise(r => setTimeout(r, 10));
        await service.createContact(createContactData({ firstName: 'Alice' }));

        const asc = await service.getContacts('tenant-1', { sortBy: 'firstName', sortOrder: 'asc' });
        const desc = await service.getContacts('tenant-1', { sortBy: 'firstName', sortOrder: 'desc' });

        expect(asc.contacts[0].firstName).toBe('Alice');
        expect(desc.contacts[0].firstName).toBe('Zoe');
      });
    });

    describe('getContact', () => {
      it('should return contact by id', async () => {
        const created = await service.createContact(createContactData());

        const contact = await service.getContact(created.id);

        expect(contact?.id).toBe(created.id);
        expect(contact?.email).toBe(created.email);
      });

      it('should return null for non-existent contact', async () => {
        const contact = await service.getContact('non-existent');

        expect(contact).toBeNull();
      });
    });

    describe('updateContact', () => {
      it('should update contact fields', async () => {
        const contact = await service.createContact(createContactData());

        const updated = await service.updateContact(contact.id, {
          firstName: 'Updated',
          lastName: 'Name',
          jobTitle: 'CEO',
        });

        expect(updated?.firstName).toBe('Updated');
        expect(updated?.lastName).toBe('Name');
        expect(updated?.jobTitle).toBe('CEO');
      });

      it('should emit contact.updated event', async () => {
        const contact = await service.createContact(createContactData());

        await service.updateContact(contact.id, { firstName: 'New' });

        expect(eventEmitter.emit).toHaveBeenCalledWith('contact.updated', {
          contactId: contact.id,
          updates: { firstName: 'New' },
        });
      });

      it('should update updatedAt timestamp', async () => {
        const contact = await service.createContact(createContactData());
        const originalUpdatedAt = contact.updatedAt;

        await new Promise(r => setTimeout(r, 10));
        const updated = await service.updateContact(contact.id, { firstName: 'New' });

        expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      });

      it('should return null for non-existent contact', async () => {
        const result = await service.updateContact('non-existent', { firstName: 'Test' });

        expect(result).toBeNull();
      });
    });

    describe('deleteContact', () => {
      it('should delete contact', async () => {
        const contact = await service.createContact(createContactData());

        await service.deleteContact(contact.id);

        const retrieved = await service.getContact(contact.id);
        expect(retrieved).toBeNull();
      });

      it('should delete related notes and activities', async () => {
        const contact = await service.createContact(createContactData());
        await service.addNote({
          contactId: contact.id,
          content: 'Test note',
          type: 'note',
          createdBy: 'user-1',
        });

        await service.deleteContact(contact.id);

        const notes = await service.getNotes(contact.id);
        expect(notes).toHaveLength(0);
      });
    });

    describe('mergeContacts', () => {
      it('should merge secondary into primary', async () => {
        const primary = await service.createContact(createContactData({
          tags: ['tag1'],
          customFields: { field1: 'value1' },
        }));
        await new Promise(r => setTimeout(r, 5));
        const secondary = await service.createContact(createContactData({
          tags: ['tag2'],
          customFields: { field2: 'value2' },
        }));
        await service.updateLeadScore(secondary.id, 80);

        const merged = await service.mergeContacts(primary.id, secondary.id);

        expect(merged?.tags).toContain('tag1');
        expect(merged?.tags).toContain('tag2');
        expect(merged?.customFields.field1).toBe('value1');
        expect(merged?.customFields.field2).toBe('value2');
        expect(merged?.leadScore).toBe(80);
      });

      it('should delete secondary contact', async () => {
        const primary = await service.createContact(createContactData());
        await new Promise(r => setTimeout(r, 5));
        const secondary = await service.createContact(createContactData());

        await service.mergeContacts(primary.id, secondary.id);

        const retrieved = await service.getContact(secondary.id);
        expect(retrieved).toBeNull();
      });

      it('should move notes to primary', async () => {
        const primary = await service.createContact(createContactData());
        await new Promise(r => setTimeout(r, 5));
        const secondary = await service.createContact(createContactData());
        await service.addNote({
          contactId: secondary.id,
          content: 'Secondary note',
          type: 'note',
          createdBy: 'user-1',
        });

        await service.mergeContacts(primary.id, secondary.id);

        const notes = await service.getNotes(primary.id);
        expect(notes.some(n => n.content === 'Secondary note')).toBe(true);
      });

      it('should emit contact.merged event', async () => {
        const primary = await service.createContact(createContactData());
        await new Promise(r => setTimeout(r, 5));
        const secondary = await service.createContact(createContactData());

        await service.mergeContacts(primary.id, secondary.id);

        expect(eventEmitter.emit).toHaveBeenCalledWith('contact.merged', {
          primaryId: primary.id,
          secondaryId: secondary.id,
        });
      });

      it('should return null if contacts not found', async () => {
        const result = await service.mergeContacts('non-existent', 'also-non-existent');

        expect(result).toBeNull();
      });
    });
  });

  describe('Lead Scoring', () => {
    describe('updateLeadScore', () => {
      it('should update lead score', async () => {
        const contact = await service.createContact(createContactData());

        const updated = await service.updateLeadScore(contact.id, 75);

        expect(updated?.leadScore).toBe(75);
      });

      it('should cap score at 100', async () => {
        const contact = await service.createContact(createContactData());

        const updated = await service.updateLeadScore(contact.id, 150);

        expect(updated?.leadScore).toBe(100);
      });

      it('should not allow negative score', async () => {
        const contact = await service.createContact(createContactData());

        const updated = await service.updateLeadScore(contact.id, -10);

        expect(updated?.leadScore).toBe(0);
      });

      it('should return null for non-existent contact', async () => {
        const result = await service.updateLeadScore('non-existent', 50);

        expect(result).toBeNull();
      });
    });

    describe('incrementLeadScore', () => {
      it('should increment lead score', async () => {
        const contact = await service.createContact(createContactData());
        await service.updateLeadScore(contact.id, 50);

        const updated = await service.incrementLeadScore(contact.id, 25);

        expect(updated?.leadScore).toBe(75);
      });

      it('should decrement with negative points', async () => {
        const contact = await service.createContact(createContactData());
        await service.updateLeadScore(contact.id, 50);

        const updated = await service.incrementLeadScore(contact.id, -20);

        expect(updated?.leadScore).toBe(30);
      });

      it('should cap at bounds', async () => {
        const contact = await service.createContact(createContactData());
        await service.updateLeadScore(contact.id, 90);

        const updated = await service.incrementLeadScore(contact.id, 50);

        expect(updated?.leadScore).toBe(100);
      });
    });
  });

  describe('Notes', () => {
    describe('addNote', () => {
      it('should add note to contact', async () => {
        const contact = await service.createContact(createContactData());

        const note = await service.addNote({
          contactId: contact.id,
          content: 'Important meeting discussion',
          type: 'meeting',
          createdBy: 'user-1',
        });

        expect(note.id).toBeDefined();
        expect(note.content).toBe('Important meeting discussion');
        expect(note.type).toBe('meeting');
      });

      it('should update contact lastActivityAt', async () => {
        const contact = await service.createContact(createContactData());
        const originalActivity = contact.lastActivityAt;

        await new Promise(r => setTimeout(r, 10));
        await service.addNote({
          contactId: contact.id,
          content: 'Note',
          type: 'note',
          createdBy: 'user-1',
        });

        const updated = await service.getContact(contact.id);
        expect(updated?.lastActivityAt).toBeDefined();
      });

      it('should update lastContactedAt for call/email', async () => {
        const contact = await service.createContact(createContactData());

        await service.addNote({
          contactId: contact.id,
          content: 'Called client',
          type: 'call',
          createdBy: 'user-1',
        });

        const updated = await service.getContact(contact.id);
        expect(updated?.lastContactedAt).toBeDefined();
      });

      it('should support all note types', async () => {
        const contact = await service.createContact(createContactData());
        const types: Array<'note' | 'call' | 'email' | 'meeting' | 'task'> = [
          'note', 'call', 'email', 'meeting', 'task',
        ];

        for (const type of types) {
          const note = await service.addNote({
            contactId: contact.id,
            content: `${type} content`,
            type,
            createdBy: 'user-1',
          });
          expect(note.type).toBe(type);
        }
      });
    });

    describe('getNotes', () => {
      it('should return notes for contact', async () => {
        const contact = await service.createContact(createContactData());
        await service.addNote({
          contactId: contact.id,
          content: 'Note 1',
          type: 'note',
          createdBy: 'user-1',
        });
        await new Promise(r => setTimeout(r, 5));
        await service.addNote({
          contactId: contact.id,
          content: 'Note 2',
          type: 'call',
          createdBy: 'user-1',
        });

        const notes = await service.getNotes(contact.id);

        expect(notes).toHaveLength(2);
      });

      it('should sort by date descending', async () => {
        const contact = await service.createContact(createContactData());
        await service.addNote({
          contactId: contact.id,
          content: 'First',
          type: 'note',
          createdBy: 'user-1',
        });
        await new Promise(r => setTimeout(r, 10));
        await service.addNote({
          contactId: contact.id,
          content: 'Second',
          type: 'note',
          createdBy: 'user-1',
        });

        const notes = await service.getNotes(contact.id);

        expect(notes[0].content).toBe('Second');
        expect(notes[1].content).toBe('First');
      });
    });

    describe('deleteNote', () => {
      it('should delete note', async () => {
        const contact = await service.createContact(createContactData());
        const note = await service.addNote({
          contactId: contact.id,
          content: 'To delete',
          type: 'note',
          createdBy: 'user-1',
        });

        await service.deleteNote(note.id);

        const notes = await service.getNotes(contact.id);
        expect(notes).toHaveLength(0);
      });
    });
  });

  describe('Activities', () => {
    describe('recordActivity', () => {
      it('should record activity', async () => {
        const contact = await service.createContact(createContactData());

        const activity = await service.recordActivity({
          contactId: contact.id,
          type: 'email_opened',
          description: 'Opened campaign email',
        });

        expect(activity.id).toBeDefined();
        expect(activity.type).toBe('email_opened');
        expect(activity.description).toBe('Opened campaign email');
      });

      it('should support metadata', async () => {
        const contact = await service.createContact(createContactData());

        const activity = await service.recordActivity({
          contactId: contact.id,
          type: 'page_viewed',
          description: 'Viewed pricing page',
          metadata: { url: '/pricing', duration: 120 },
        });

        expect(activity.metadata?.url).toBe('/pricing');
        expect(activity.metadata?.duration).toBe(120);
      });

      it('should support all activity types', async () => {
        const contact = await service.createContact(createContactData());
        const types: Array<'email_opened' | 'email_clicked' | 'page_viewed' | 'form_submitted' | 'deal_created' | 'note_added' | 'call_logged' | 'meeting_scheduled'> = [
          'email_opened', 'email_clicked', 'page_viewed', 'form_submitted',
          'deal_created', 'note_added', 'call_logged', 'meeting_scheduled',
        ];

        for (const type of types) {
          const activity = await service.recordActivity({
            contactId: contact.id,
            type,
            description: `${type} activity`,
          });
          expect(activity.type).toBe(type);
        }
      });
    });

    describe('getActivities', () => {
      it('should return activities for contact', async () => {
        const contact = await service.createContact(createContactData());
        // createContact already records one activity
        await service.recordActivity({
          contactId: contact.id,
          type: 'email_clicked',
          description: 'Clicked link',
        });

        const activities = await service.getActivities(contact.id);

        expect(activities.length).toBeGreaterThanOrEqual(2);
      });

      it('should limit results', async () => {
        const contact = await service.createContact(createContactData());
        for (let i = 0; i < 10; i++) {
          await service.recordActivity({
            contactId: contact.id,
            type: 'page_viewed',
            description: `Page ${i}`,
          });
        }

        const activities = await service.getActivities(contact.id, 5);

        expect(activities).toHaveLength(5);
      });
    });
  });

  describe('Segments', () => {
    describe('createSegment', () => {
      it('should create static segment', async () => {
        const contact = await service.createContact(createContactData());

        const segment = await service.createSegment({
          tenantId: 'tenant-1',
          name: 'VIP Customers',
          type: 'static',
          staticContactIds: [contact.id],
        });

        expect(segment.id).toBeDefined();
        expect(segment.name).toBe('VIP Customers');
        expect(segment.type).toBe('static');
        expect(segment.contactCount).toBe(1);
      });

      it('should create dynamic segment with rules', async () => {
        await service.createContact(createContactData({
          tags: ['enterprise'],
        }));

        const segment = await service.createSegment({
          tenantId: 'tenant-1',
          name: 'Enterprise',
          type: 'dynamic',
          rules: [
            { field: 'tags', operator: 'contains', value: 'enterprise' },
          ],
        });

        expect(segment.type).toBe('dynamic');
        expect(segment.rules).toHaveLength(1);
      });

      it('should calculate contact count', async () => {
        const c1 = await service.createContact(createContactData());
        await service.updateLeadScore(c1.id, 80);
        await new Promise(r => setTimeout(r, 5));
        const c2 = await service.createContact(createContactData());
        await service.updateLeadScore(c2.id, 30);

        const segment = await service.createSegment({
          tenantId: 'tenant-1',
          name: 'Hot Leads',
          type: 'dynamic',
          rules: [
            { field: 'leadScore', operator: 'greater_than', value: 50 },
          ],
        });

        expect(segment.contactCount).toBe(1);
      });
    });

    describe('getSegments', () => {
      it('should return segments for tenant', async () => {
        await service.createSegment({
          tenantId: 'tenant-1',
          name: 'Segment 1',
          type: 'static',
          staticContactIds: [],
        });
        await new Promise(r => setTimeout(r, 5));
        await service.createSegment({
          tenantId: 'tenant-1',
          name: 'Segment 2',
          type: 'static',
          staticContactIds: [],
        });

        const segments = await service.getSegments('tenant-1');

        expect(segments).toHaveLength(2);
      });
    });

    describe('getSegmentContacts', () => {
      it('should return contacts for static segment', async () => {
        const contact = await service.createContact(createContactData());
        const segment = await service.createSegment({
          tenantId: 'tenant-1',
          name: 'Test',
          type: 'static',
          staticContactIds: [contact.id],
        });

        const contacts = await service.getSegmentContacts(segment.id);

        expect(contacts).toHaveLength(1);
        expect(contacts[0].id).toBe(contact.id);
      });

      it('should return contacts for dynamic segment', async () => {
        const c1 = await service.createContact(createContactData());
        await service.updateLeadScore(c1.id, 90);
        await new Promise(r => setTimeout(r, 5));
        await service.createContact(createContactData());

        const segment = await service.createSegment({
          tenantId: 'tenant-1',
          name: 'High Score',
          type: 'dynamic',
          rules: [
            { field: 'leadScore', operator: 'greater_than', value: 50 },
          ],
        });

        const contacts = await service.getSegmentContacts(segment.id);

        expect(contacts).toHaveLength(1);
        expect(contacts[0].leadScore).toBe(90);
      });

      it('should return empty for non-existent segment', async () => {
        const contacts = await service.getSegmentContacts('non-existent');

        expect(contacts).toHaveLength(0);
      });
    });

    describe('Segment Rules', () => {
      it('should apply equals operator', async () => {
        await service.createContact(createContactData({ source: 'website' }));
        await new Promise(r => setTimeout(r, 5));
        await service.createContact(createContactData({ source: 'referral' }));

        const segment = await service.createSegment({
          tenantId: 'tenant-1',
          name: 'Website Leads',
          type: 'dynamic',
          rules: [{ field: 'source', operator: 'equals', value: 'website' }],
        });

        expect(segment.contactCount).toBe(1);
      });

      it('should apply not_equals operator', async () => {
        await service.createContact(createContactData({ source: 'website' }));
        await new Promise(r => setTimeout(r, 5));
        await service.createContact(createContactData({ source: 'referral' }));

        const segment = await service.createSegment({
          tenantId: 'tenant-1',
          name: 'Non-Website',
          type: 'dynamic',
          rules: [{ field: 'source', operator: 'not_equals', value: 'website' }],
        });

        expect(segment.contactCount).toBe(1);
      });

      it('should apply less_than operator', async () => {
        const c1 = await service.createContact(createContactData());
        await service.updateLeadScore(c1.id, 30);
        await new Promise(r => setTimeout(r, 5));
        const c2 = await service.createContact(createContactData());
        await service.updateLeadScore(c2.id, 80);

        const segment = await service.createSegment({
          tenantId: 'tenant-1',
          name: 'Low Score',
          type: 'dynamic',
          rules: [{ field: 'leadScore', operator: 'less_than', value: 50 }],
        });

        expect(segment.contactCount).toBe(1);
      });

      it('should apply is_empty operator', async () => {
        await service.createContact(createContactData({ jobTitle: undefined }));
        await new Promise(r => setTimeout(r, 5));
        await service.createContact(createContactData({ jobTitle: 'CEO' }));

        const segment = await service.createSegment({
          tenantId: 'tenant-1',
          name: 'No Title',
          type: 'dynamic',
          rules: [{ field: 'jobTitle', operator: 'is_empty', value: null }],
        });

        expect(segment.contactCount).toBe(1);
      });

      it('should apply is_not_empty operator', async () => {
        await service.createContact(createContactData({ jobTitle: undefined }));
        await new Promise(r => setTimeout(r, 5));
        await service.createContact(createContactData({ jobTitle: 'CEO' }));

        const segment = await service.createSegment({
          tenantId: 'tenant-1',
          name: 'Has Title',
          type: 'dynamic',
          rules: [{ field: 'jobTitle', operator: 'is_not_empty', value: null }],
        });

        expect(segment.contactCount).toBe(1);
      });
    });

    describe('updateSegment', () => {
      it('should update segment', async () => {
        const segment = await service.createSegment({
          tenantId: 'tenant-1',
          name: 'Original',
          type: 'static',
          staticContactIds: [],
        });

        const updated = await service.updateSegment(segment.id, {
          name: 'Updated',
          description: 'New description',
        });

        expect(updated?.name).toBe('Updated');
        expect(updated?.description).toBe('New description');
      });

      it('should recalculate contact count on update', async () => {
        const c1 = await service.createContact(createContactData());
        await new Promise(r => setTimeout(r, 5));
        const c2 = await service.createContact(createContactData());

        const segment = await service.createSegment({
          tenantId: 'tenant-1',
          name: 'Test',
          type: 'static',
          staticContactIds: [c1.id],
        });

        expect(segment.contactCount).toBe(1);

        const updated = await service.updateSegment(segment.id, {
          staticContactIds: [c1.id, c2.id],
        });

        expect(updated?.contactCount).toBe(2);
      });
    });

    describe('deleteSegment', () => {
      it('should delete segment', async () => {
        const segment = await service.createSegment({
          tenantId: 'tenant-1',
          name: 'To Delete',
          type: 'static',
          staticContactIds: [],
        });

        await service.deleteSegment(segment.id);

        const segments = await service.getSegments('tenant-1');
        expect(segments).toHaveLength(0);
      });
    });
  });

  describe('Bulk Operations', () => {
    describe('bulkUpdateContacts', () => {
      it('should update multiple contacts', async () => {
        const c1 = await service.createContact(createContactData());
        await new Promise(r => setTimeout(r, 5));
        const c2 = await service.createContact(createContactData());

        const result = await service.bulkUpdateContacts(
          [c1.id, c2.id],
          { status: 'inactive' },
        );

        expect(result.updated).toBe(2);
        expect(result.failed).toBe(0);

        const updated1 = await service.getContact(c1.id);
        const updated2 = await service.getContact(c2.id);
        expect(updated1?.status).toBe('inactive');
        expect(updated2?.status).toBe('inactive');
      });

      it('should report failed updates', async () => {
        const contact = await service.createContact(createContactData());

        const result = await service.bulkUpdateContacts(
          [contact.id, 'non-existent'],
          { status: 'archived' },
        );

        expect(result.updated).toBe(1);
        expect(result.failed).toBe(1);
      });
    });

    describe('bulkDeleteContacts', () => {
      it('should delete multiple contacts', async () => {
        const c1 = await service.createContact(createContactData());
        await new Promise(r => setTimeout(r, 5));
        const c2 = await service.createContact(createContactData());

        const result = await service.bulkDeleteContacts([c1.id, c2.id]);

        expect(result.deleted).toBe(2);
        expect(await service.getContact(c1.id)).toBeNull();
        expect(await service.getContact(c2.id)).toBeNull();
      });
    });

    describe('bulkAddToSegment', () => {
      it('should add contacts to static segment', async () => {
        const c1 = await service.createContact(createContactData());
        await new Promise(r => setTimeout(r, 5));
        const c2 = await service.createContact(createContactData());

        const segment = await service.createSegment({
          tenantId: 'tenant-1',
          name: 'Test',
          type: 'static',
          staticContactIds: [],
        });

        const updated = await service.bulkAddToSegment(segment.id, [c1.id, c2.id]);

        expect(updated?.contactCount).toBe(2);
        expect(updated?.staticContactIds).toContain(c1.id);
        expect(updated?.staticContactIds).toContain(c2.id);
      });

      it('should not duplicate contacts', async () => {
        const contact = await service.createContact(createContactData());
        const segment = await service.createSegment({
          tenantId: 'tenant-1',
          name: 'Test',
          type: 'static',
          staticContactIds: [contact.id],
        });

        const updated = await service.bulkAddToSegment(segment.id, [contact.id]);

        expect(updated?.contactCount).toBe(1);
      });

      it('should return null for dynamic segment', async () => {
        const segment = await service.createSegment({
          tenantId: 'tenant-1',
          name: 'Dynamic',
          type: 'dynamic',
          rules: [],
        });

        const result = await service.bulkAddToSegment(segment.id, ['contact-1']);

        expect(result).toBeNull();
      });
    });
  });

  describe('Import/Export', () => {
    describe('importContacts', () => {
      it('should import new contacts', async () => {
        const result = await service.importContacts('tenant-1', [
          { email: 'new1@example.com', source: 'import', createdBy: 'user-1', type: 'person' },
          { email: 'new2@example.com', source: 'import', createdBy: 'user-1', type: 'person' },
        ]);

        expect(result.created).toBe(2);
        expect(result.errors).toHaveLength(0);
      });

      it('should skip duplicates when configured', async () => {
        await service.createContact(createContactData({ email: 'existing@example.com' }));

        const result = await service.importContacts(
          'tenant-1',
          [{ email: 'existing@example.com', source: 'import', createdBy: 'user-1', type: 'person' }],
          { skipDuplicates: true },
        );

        expect(result.skipped).toBe(1);
        expect(result.created).toBe(0);
      });

      it('should update existing when configured', async () => {
        const existing = await service.createContact(createContactData({
          email: 'update@example.com',
          firstName: 'Old',
        }));

        const result = await service.importContacts(
          'tenant-1',
          [{ email: 'update@example.com', firstName: 'New', source: 'import', createdBy: 'user-1', type: 'person' }],
          { updateExisting: true },
        );

        expect(result.updated).toBe(1);
        const updated = await service.getContact(existing.id);
        expect(updated?.firstName).toBe('New');
      });

      it('should report duplicate errors by default', async () => {
        await service.createContact(createContactData({ email: 'dup@example.com' }));

        const result = await service.importContacts('tenant-1', [
          { email: 'dup@example.com', source: 'import', createdBy: 'user-1', type: 'person' },
        ]);

        expect(result.errors).toContain('Duplicate email: dup@example.com');
      });
    });

    describe('exportContacts', () => {
      it('should export all contacts', async () => {
        await service.createContact(createContactData());
        await new Promise(r => setTimeout(r, 5));
        await service.createContact(createContactData());

        const exported = await service.exportContacts('tenant-1');

        expect(exported).toHaveLength(2);
      });

      it('should apply filters to export', async () => {
        await service.createContact(createContactData({ source: 'website' }));
        await new Promise(r => setTimeout(r, 5));
        await service.createContact(createContactData({ source: 'referral' }));

        const exported = await service.exportContacts('tenant-1', { source: 'website' });

        expect(exported).toHaveLength(1);
        expect(exported[0].source).toBe('website');
      });
    });
  });

  describe('Stats', () => {
    describe('getStats', () => {
      it('should return contact statistics', async () => {
        const c1 = await service.createContact(createContactData({ source: 'website' }));
        await service.updateContact(c1.id, { lifecycleStage: 'customer' });
        await service.updateLeadScore(c1.id, 80);

        await new Promise(r => setTimeout(r, 5));
        const c2 = await service.createContact(createContactData({ source: 'referral' }));
        await service.updateLeadScore(c2.id, 40);

        await service.createSegment({
          tenantId: 'tenant-1',
          name: 'Test',
          type: 'static',
          staticContactIds: [],
        });

        const stats = await service.getStats('tenant-1');

        expect(stats.totalContacts).toBe(2);
        expect(stats.activeContacts).toBe(2);
        expect(stats.newThisMonth).toBe(2);
        expect(stats.bySource.website).toBe(1);
        expect(stats.bySource.referral).toBe(1);
        expect(stats.byLifecycleStage.customer).toBe(1);
        expect(stats.byLifecycleStage.lead).toBe(1);
        expect(stats.avgLeadScore).toBe(60);
        expect(stats.totalSegments).toBe(1);
      });

      it('should return zero for empty tenant', async () => {
        const stats = await service.getStats('empty-tenant');

        expect(stats.totalContacts).toBe(0);
        expect(stats.activeContacts).toBe(0);
        expect(stats.avgLeadScore).toBe(0);
      });
    });
  });

  describe('Lifecycle Stages', () => {
    it('should support all lifecycle stages', async () => {
      const stages: LifecycleStage[] = [
        'subscriber', 'lead', 'marketing_qualified_lead', 'sales_qualified_lead',
        'opportunity', 'customer', 'evangelist', 'other',
      ];

      for (const stage of stages) {
        const contact = await service.createContact(createContactData());
        await service.updateContact(contact.id, { lifecycleStage: stage });

        const updated = await service.getContact(contact.id);
        expect(updated?.lifecycleStage).toBe(stage);
        await new Promise(r => setTimeout(r, 5));
      }
    });
  });
});
