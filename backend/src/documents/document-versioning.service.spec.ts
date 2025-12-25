import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DocumentVersioningService } from './document-versioning.service';

describe('DocumentVersioningService', () => {
  let service: DocumentVersioningService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-config'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentVersioningService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<DocumentVersioningService>(DocumentVersioningService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should return document types', () => {
      const types = service.getDocumentTypes();
      expect(types).toContain('invoice');
      expect(types).toContain('contract');
      expect(types).toContain('report');
    });

    it('should return document statuses', () => {
      const statuses = service.getDocumentStatuses();
      expect(statuses).toContain('draft');
      expect(statuses).toContain('active');
      expect(statuses).toContain('archived');
    });

    it('should return permission levels', () => {
      const permissions = service.getPermissionLevels();
      expect(permissions).toContain('view');
      expect(permissions).toContain('edit');
      expect(permissions).toContain('admin');
    });
  });

  describe('documents', () => {
    it('should create document', async () => {
      const doc = await service.createDocument(
        'tenant-1',
        'Test Document',
        'contract',
        'Document content here',
        'user-1',
      );

      expect(doc.id).toBeDefined();
      expect(doc.name).toBe('Test Document');
      expect(doc.type).toBe('contract');
      expect(doc.status).toBe('draft');
      expect(doc.currentVersion).toBe(1);
    });

    it('should create document with options', async () => {
      const doc = await service.createDocument(
        'tenant-1',
        'Contract Doc',
        'contract',
        'Content',
        'user-1',
        { description: 'A contract', tags: ['important', 'legal'] },
      );

      expect(doc.metadata.description).toBe('A contract');
      expect(doc.tags).toContain('important');
    });

    it('should get document by ID', async () => {
      const created = await service.createDocument('t1', 'Doc', 'invoice', 'c', 'u1');
      const retrieved = await service.getDocument(created.id);

      expect(retrieved?.id).toBe(created.id);
    });

    it('should return null for non-existent document', async () => {
      const result = await service.getDocument('non-existent');
      expect(result).toBeNull();
    });

    it('should get documents for tenant', async () => {
      await service.createDocument('tenant-list', 'Doc 1', 'invoice', 'c1', 'u1');
      await service.createDocument('tenant-list', 'Doc 2', 'contract', 'c2', 'u1');

      const docs = await service.getDocuments('tenant-list');
      expect(docs.length).toBe(2);
    });

    it('should filter documents by type', async () => {
      await service.createDocument('tenant-filter', 'Invoice', 'invoice', 'c', 'u1');
      await service.createDocument('tenant-filter', 'Contract', 'contract', 'c', 'u1');

      const invoices = await service.getDocuments('tenant-filter', { type: 'invoice' });
      expect(invoices.length).toBe(1);
      expect(invoices[0].type).toBe('invoice');
    });

    it('should update document', async () => {
      const doc = await service.createDocument('t1', 'Original', 'invoice', 'c', 'u1');
      const updated = await service.updateDocument(doc.id, { name: 'Updated Name' });

      expect(updated?.name).toBe('Updated Name');
    });

    it('should return null when updating non-existent document', async () => {
      const result = await service.updateDocument('non-existent', { name: 'Test' });
      expect(result).toBeNull();
    });

    it('should soft delete document', async () => {
      const doc = await service.createDocument('t1', 'To Delete', 'invoice', 'c', 'u1');
      const success = await service.deleteDocument(doc.id);

      expect(success).toBe(true);

      const deleted = await service.getDocument(doc.id);
      expect(deleted?.status).toBe('deleted');
    });

    it('should permanently delete document', async () => {
      const doc = await service.createDocument('t1', 'Perm Delete', 'invoice', 'c', 'u1');
      const success = await service.deleteDocument(doc.id, true);

      expect(success).toBe(true);

      const deleted = await service.getDocument(doc.id);
      expect(deleted).toBeNull();
    });

    it('should restore deleted document', async () => {
      const doc = await service.createDocument('t1', 'To Restore', 'invoice', 'c', 'u1');
      await service.deleteDocument(doc.id);

      const restored = await service.restoreDocument(doc.id);
      expect(restored?.status).toBe('active');
    });

    it('should archive document', async () => {
      const doc = await service.createDocument('t1', 'To Archive', 'invoice', 'c', 'u1');
      const archived = await service.archiveDocument(doc.id);

      expect(archived?.status).toBe('archived');
    });
  });

  describe('versions', () => {
    it('should create initial version on document creation', async () => {
      const doc = await service.createDocument('t1', 'Versioned', 'contract', 'Initial content', 'u1');
      const versions = await service.getVersions(doc.id);

      expect(versions.length).toBe(1);
      expect(versions[0].version).toBe(1);
      expect(versions[0].content).toBe('Initial content');
    });

    it('should save new version', async () => {
      const doc = await service.createDocument('t1', 'Multi-version', 'contract', 'V1', 'u1');
      const v2 = await service.saveNewVersion(doc.id, 'V2 content', 'u1', 'Updated');

      expect(v2?.version).toBe(2);
      expect(v2?.content).toBe('V2 content');
      expect(v2?.comment).toBe('Updated');

      const updatedDoc = await service.getDocument(doc.id);
      expect(updatedDoc?.currentVersion).toBe(2);
    });

    it('should get specific version', async () => {
      const doc = await service.createDocument('t1', 'Get Version', 'contract', 'V1', 'u1');
      await service.saveNewVersion(doc.id, 'V2', 'u1');

      const v1 = await service.getVersion(doc.id, 1);
      const v2 = await service.getVersion(doc.id, 2);

      expect(v1?.content).toBe('V1');
      expect(v2?.content).toBe('V2');
    });

    it('should return null for non-existent version', async () => {
      const doc = await service.createDocument('t1', 'Doc', 'invoice', 'c', 'u1');
      const result = await service.getVersion(doc.id, 999);

      expect(result).toBeNull();
    });

    it('should get latest version', async () => {
      const doc = await service.createDocument('t1', 'Latest', 'contract', 'V1', 'u1');
      await service.saveNewVersion(doc.id, 'V2', 'u1');
      await service.saveNewVersion(doc.id, 'V3', 'u1');

      const latest = await service.getLatestVersion(doc.id);
      expect(latest?.content).toBe('V3');
    });

    it('should restore to previous version', async () => {
      const doc = await service.createDocument('t1', 'Restore', 'contract', 'Original', 'u1');
      await service.saveNewVersion(doc.id, 'Modified', 'u1');

      const restored = await service.restoreVersion(doc.id, 1, 'u1');
      expect(restored?.currentVersion).toBe(3);

      const latest = await service.getLatestVersion(doc.id);
      expect(latest?.content).toBe('Original');
    });

    it('should compare versions', async () => {
      const doc = await service.createDocument('t1', 'Compare', 'contract', 'Line 1\nLine 2', 'u1');
      await service.saveNewVersion(doc.id, 'Line 1\nLine 2\nLine 3', 'u1');

      const comparison = await service.compareVersions(doc.id, 1, 2);

      expect(comparison).toBeDefined();
      expect(comparison?.differences.length).toBeGreaterThan(0);
      expect(comparison?.summary.additions).toBeGreaterThanOrEqual(0);
    });

    it('should return null when comparing non-existent versions', async () => {
      const doc = await service.createDocument('t1', 'Doc', 'invoice', 'c', 'u1');
      const result = await service.compareVersions(doc.id, 1, 999);

      expect(result).toBeNull();
    });
  });

  describe('locks', () => {
    it('should acquire lock', async () => {
      const doc = await service.createDocument('t1', 'Lockable', 'contract', 'c', 'u1');
      const lock = await service.acquireLock(doc.id, 'u1');

      expect(lock).toBeDefined();
      expect(lock?.userId).toBe('u1');
      expect(lock?.type).toBe('exclusive');
    });

    it('should extend existing lock for same user', async () => {
      const doc = await service.createDocument('t1', 'Extend Lock', 'contract', 'c', 'u1');
      const lock1 = await service.acquireLock(doc.id, 'u1');
      const lock2 = await service.acquireLock(doc.id, 'u1');

      expect(lock2?.id).toBe(lock1?.id);
    });

    it('should not acquire lock if already locked by another user', async () => {
      const doc = await service.createDocument('t1', 'Contested', 'contract', 'c', 'u1');
      await service.acquireLock(doc.id, 'u1');

      const lock = await service.acquireLock(doc.id, 'u2');
      expect(lock).toBeNull();
    });

    it('should release lock', async () => {
      const doc = await service.createDocument('t1', 'Release', 'contract', 'c', 'u1');
      await service.acquireLock(doc.id, 'u1');

      const success = await service.releaseLock(doc.id, 'u1');
      expect(success).toBe(true);

      const lock = await service.getDocumentLock(doc.id);
      expect(lock).toBeNull();
    });

    it('should not release lock by different user', async () => {
      const doc = await service.createDocument('t1', 'Others Lock', 'contract', 'c', 'u1');
      await service.acquireLock(doc.id, 'u1');

      const success = await service.releaseLock(doc.id, 'u2');
      expect(success).toBe(false);
    });

    it('should prevent editing locked document by non-owner', async () => {
      const doc = await service.createDocument('t1', 'Locked Edit', 'contract', 'c', 'u1');
      await service.acquireLock(doc.id, 'u1');

      await expect(service.saveNewVersion(doc.id, 'New content', 'u2'))
        .rejects.toThrow(/locked/i);
    });

    it('should allow editing by lock owner', async () => {
      const doc = await service.createDocument('t1', 'Owner Edit', 'contract', 'c', 'u1');
      await service.acquireLock(doc.id, 'u1');

      const version = await service.saveNewVersion(doc.id, 'New content', 'u1');
      expect(version).toBeDefined();
    });
  });

  describe('sharing', () => {
    it('should share document', async () => {
      const doc = await service.createDocument('t1', 'Shareable', 'contract', 'c', 'u1');
      const share = await service.shareDocument(doc.id, 'u2', 'u1', 'view');

      expect(share).toBeDefined();
      expect(share?.sharedWith).toBe('u2');
      expect(share?.permission).toBe('view');
    });

    it('should update existing share', async () => {
      const doc = await service.createDocument('t1', 'Update Share', 'contract', 'c', 'u1');
      await service.shareDocument(doc.id, 'u2', 'u1', 'view');

      const updated = await service.shareDocument(doc.id, 'u2', 'u1', 'edit');
      expect(updated?.permission).toBe('edit');
    });

    it('should revoke share', async () => {
      const doc = await service.createDocument('t1', 'Revoke', 'contract', 'c', 'u1');
      await service.shareDocument(doc.id, 'u2', 'u1', 'view');

      const success = await service.revokeShare(doc.id, 'u2');
      expect(success).toBe(true);
    });

    it('should get document shares', async () => {
      const doc = await service.createDocument('t1', 'Get Shares', 'contract', 'c', 'u1');
      await service.shareDocument(doc.id, 'u2', 'u1', 'view');
      await service.shareDocument(doc.id, 'u3', 'u1', 'edit');

      const shares = await service.getDocumentShares(doc.id);
      expect(shares.length).toBe(2);
    });

    it('should get shared with me', async () => {
      const doc = await service.createDocument('t1', 'Shared With', 'contract', 'c', 'u1');
      await service.shareDocument(doc.id, 'u2', 'u1', 'view');

      const docs = await service.getSharedWithMe('u2');
      expect(docs.length).toBe(1);
    });

    it('should check permission for owner', async () => {
      const doc = await service.createDocument('t1', 'Owner Perm', 'contract', 'c', 'u1');
      const permission = await service.checkPermission(doc.id, 'u1');

      expect(permission).toBe('admin');
    });

    it('should check permission for shared user', async () => {
      const doc = await service.createDocument('t1', 'Shared Perm', 'contract', 'c', 'u1');
      await service.shareDocument(doc.id, 'u2', 'u1', 'edit');

      const permission = await service.checkPermission(doc.id, 'u2');
      expect(permission).toBe('edit');
    });

    it('should return null for non-shared user', async () => {
      const doc = await service.createDocument('t1', 'No Share', 'contract', 'c', 'u1');
      const permission = await service.checkPermission(doc.id, 'u2');

      expect(permission).toBeNull();
    });
  });

  describe('folders', () => {
    it('should create folder', async () => {
      const folder = await service.createFolder('t1', 'Documents', 'u1');

      expect(folder.id).toBeDefined();
      expect(folder.name).toBe('Documents');
      expect(folder.path).toBe('/Documents');
    });

    it('should create nested folder', async () => {
      const parent = await service.createFolder('t1', 'Parent', 'u1');
      const child = await service.createFolder('t1', 'Child', 'u1', parent.id);

      expect(child.path).toBe('/Parent/Child');
    });

    it('should get folders', async () => {
      await service.createFolder('t-folders', 'Folder 1', 'u1');
      await service.createFolder('t-folders', 'Folder 2', 'u1');

      const folders = await service.getFolders('t-folders');
      expect(folders.length).toBe(2);
    });

    it('should delete empty folder', async () => {
      const folder = await service.createFolder('t1', 'Empty', 'u1');
      const success = await service.deleteFolder(folder.id);

      expect(success).toBe(true);
    });

    it('should not delete folder with documents', async () => {
      const folder = await service.createFolder('t1', 'Has Docs', 'u1');
      await service.createDocument('t1', 'Doc', 'invoice', 'c', 'u1', { folderId: folder.id });

      const success = await service.deleteFolder(folder.id);
      expect(success).toBe(false);
    });
  });

  describe('search', () => {
    it('should search documents by name', async () => {
      await service.createDocument('t-search', 'Invoice 2024', 'invoice', 'c', 'u1');
      await service.createDocument('t-search', 'Contract ABC', 'contract', 'c', 'u1');

      const results = await service.searchDocuments('t-search', 'Invoice');
      expect(results.length).toBe(1);
      expect(results[0].document.name).toBe('Invoice 2024');
    });

    it('should search by tags', async () => {
      await service.createDocument('t-search-tag', 'Doc', 'invoice', 'c', 'u1', { tags: ['urgent', 'review'] });

      const results = await service.searchDocuments('t-search-tag', 'urgent');
      expect(results.length).toBe(1);
    });

    it('should return empty results for no match', async () => {
      await service.createDocument('t-no-match', 'Something', 'invoice', 'c', 'u1');

      const results = await service.searchDocuments('t-no-match', 'nonexistent');
      expect(results.length).toBe(0);
    });
  });

  describe('tags', () => {
    it('should add tag', async () => {
      const doc = await service.createDocument('t1', 'Tagged', 'invoice', 'c', 'u1');
      const updated = await service.addTag(doc.id, 'important');

      expect(updated?.tags).toContain('important');
    });

    it('should not add duplicate tag', async () => {
      const doc = await service.createDocument('t1', 'Dup Tag', 'invoice', 'c', 'u1', { tags: ['existing'] });
      await service.addTag(doc.id, 'existing');

      const updated = await service.getDocument(doc.id);
      expect(updated?.tags.filter(t => t === 'existing').length).toBe(1);
    });

    it('should remove tag', async () => {
      const doc = await service.createDocument('t1', 'Remove Tag', 'invoice', 'c', 'u1', { tags: ['remove-me'] });
      const updated = await service.removeTag(doc.id, 'remove-me');

      expect(updated?.tags).not.toContain('remove-me');
    });

    it('should get tags used', async () => {
      await service.createDocument('t-tags', 'D1', 'invoice', 'c', 'u1', { tags: ['alpha', 'beta'] });
      await service.createDocument('t-tags', 'D2', 'invoice', 'c', 'u1', { tags: ['alpha'] });

      const tags = await service.getTagsUsed('t-tags');
      expect(tags.length).toBe(2);
      expect(tags[0].tag).toBe('alpha');
      expect(tags[0].count).toBe(2);
    });
  });

  describe('statistics', () => {
    it('should get document stats', async () => {
      await service.createDocument('t-stats', 'Invoice 1', 'invoice', 'content 1', 'u1');
      await service.createDocument('t-stats', 'Contract 1', 'contract', 'content 2', 'u1');

      const stats = await service.getDocumentStats('t-stats');

      expect(stats.totalDocuments).toBe(2);
      expect(stats.documentsByType.length).toBeGreaterThan(0);
      expect(stats.totalVersions).toBe(2);
    });
  });
});
