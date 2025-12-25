import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DocumentService, DocumentType, DocumentStatus, SharePermission } from './document.service';

describe('DocumentService', () => {
  let service: DocumentService;
  let eventEmitter: EventEmitter2;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const testContent = Buffer.from('Test document content');
  const testFilename = 'test-document.pdf';
  const testMimeType = 'application/pdf';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentService,
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<DocumentService>(DocumentService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    await service.onModuleInit();
    jest.clearAllMocks();
  });

  describe('Document Upload', () => {
    it('should upload document', async () => {
      const doc = await service.uploadDocument(testContent, testFilename, testMimeType, 'user-1');

      expect(doc.id).toBeDefined();
      expect(doc.name).toBe(testFilename);
      expect(doc.mimeType).toBe(testMimeType);
      expect(doc.size).toBe(testContent.length);
      expect(doc.checksum).toBeDefined();
      expect(doc.version).toBe(1);
      expect(doc.status).toBe('PENDING');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'document.uploaded',
        expect.objectContaining({ documentId: doc.id }),
      );
    });

    it('should upload document with custom name', async () => {
      const doc = await service.uploadDocument(testContent, testFilename, testMimeType, 'user-1', {
        name: 'Custom Name',
      });

      expect(doc.name).toBe('Custom Name');
    });

    it('should upload document with tags', async () => {
      const doc = await service.uploadDocument(testContent, testFilename, testMimeType, 'user-1', {
        tags: ['important', 'invoice'],
      });

      expect(doc.tags).toContain('important');
      expect(doc.tags).toContain('invoice');
    });

    it('should upload document with description', async () => {
      const doc = await service.uploadDocument(testContent, testFilename, testMimeType, 'user-1', {
        description: 'Test description',
        descriptionRo: 'Descriere test',
      });

      expect(doc.description).toBe('Test description');
      expect(doc.descriptionRo).toBe('Descriere test');
    });

    it('should detect document type from extension', async () => {
      const doc = await service.uploadDocument(testContent, 'test.pdf', testMimeType, 'user-1');

      expect(doc.type).toBe('INVOICE');
    });

    it('should detect e-Factura XML type', async () => {
      const doc = await service.uploadDocument(
        Buffer.from('<Invoice/>'),
        'efactura.xml',
        'application/xml',
        'user-1',
      );

      expect(doc.type).toBe('EFACTURA_XML');
    });

    it('should detect image type', async () => {
      const doc = await service.uploadDocument(
        Buffer.from('image data'),
        'photo.jpg',
        'image/jpeg',
        'user-1',
      );

      expect(doc.type).toBe('IMAGE');
    });

    it('should reject invalid MIME type', async () => {
      await expect(
        service.uploadDocument(testContent, 'test.exe', 'application/x-msdownload', 'user-1'),
      ).rejects.toThrow('Invalid MIME type');
    });

    it('should reject file over max size', async () => {
      const largeContent = Buffer.alloc(501 * 1024 * 1024); // 501MB

      await expect(
        service.uploadDocument(largeContent, 'large.pdf', testMimeType, 'user-1'),
      ).rejects.toThrow('File size exceeds maximum');
    });

    it('should reject duplicate documents', async () => {
      await service.uploadDocument(testContent, testFilename, testMimeType, 'user-1');

      await expect(
        service.uploadDocument(testContent, 'duplicate.pdf', testMimeType, 'user-2'),
      ).rejects.toThrow('Duplicate document detected');
    });

    it('should store document content', async () => {
      const doc = await service.uploadDocument(testContent, testFilename, testMimeType, 'user-1');
      const content = await service.getDocumentContent(doc.id);

      expect(content).toEqual(testContent);
    });

    it('should extract OCR when requested', async () => {
      const doc = await service.uploadDocument(testContent, testFilename, testMimeType, 'user-1', {
        extractOcr: true,
      });

      expect(doc.ocrText).toBeDefined();
      expect(doc.ocrConfidence).toBeDefined();
    });
  });

  describe('Document Management', () => {
    let uploadedDoc: any;

    beforeEach(async () => {
      uploadedDoc = await service.uploadDocument(testContent, testFilename, testMimeType, 'user-1');
    });

    it('should get document by id', async () => {
      const doc = await service.getDocument(uploadedDoc.id);

      expect(doc).toBeDefined();
      expect(doc!.id).toBe(uploadedDoc.id);
    });

    it('should return undefined for non-existent document', async () => {
      const doc = await service.getDocument('invalid-id');

      expect(doc).toBeUndefined();
    });

    it('should update document metadata', async () => {
      const updated = await service.updateDocument(uploadedDoc.id, undefined, 'user-2', {
        name: 'Updated Name',
        description: 'Updated description',
        tags: ['updated'],
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.description).toBe('Updated description');
      expect(updated.tags).toContain('updated');
      expect(updated.updatedBy).toBe('user-2');
    });

    it('should update document status', async () => {
      const updated = await service.updateDocument(uploadedDoc.id, undefined, 'user-1', {
        status: 'APPROVED',
      });

      expect(updated.status).toBe('APPROVED');
    });

    it('should create new version on content update', async () => {
      const newContent = Buffer.from('Updated content');
      const updated = await service.updateDocument(uploadedDoc.id, newContent, 'user-2', {
        changes: 'Content updated',
      });

      expect(updated.version).toBe(2);
      expect(updated.size).toBe(newContent.length);
    });

    it('should throw error when updating non-existent document', async () => {
      await expect(service.updateDocument('invalid-id', undefined, 'user-1', {})).rejects.toThrow(
        'Document not found',
      );
    });

    it('should soft delete document', async () => {
      const result = await service.deleteDocument(uploadedDoc.id, 'user-1');

      expect(result).toBe(true);
      const doc = await service.getDocument(uploadedDoc.id);
      expect(doc!.status).toBe('DELETED');
    });

    it('should permanently delete document', async () => {
      const result = await service.deleteDocument(uploadedDoc.id, 'user-1', true);

      expect(result).toBe(true);
      const doc = await service.getDocument(uploadedDoc.id);
      expect(doc).toBeUndefined();
    });

    it('should restore deleted document', async () => {
      await service.deleteDocument(uploadedDoc.id, 'user-1');

      const restored = await service.restoreDocument(uploadedDoc.id, 'user-2');

      expect(restored.status).toBe('PENDING');
    });

    it('should throw error when restoring non-deleted document', async () => {
      await expect(service.restoreDocument(uploadedDoc.id, 'user-1')).rejects.toThrow(
        'Document is not deleted',
      );
    });
  });

  describe('Folder Management', () => {
    it('should have default folders', async () => {
      const folders = await service.listFolders('root');

      expect(folders.length).toBeGreaterThanOrEqual(4);
      expect(folders.some((f) => f.name === 'Invoices')).toBe(true);
      expect(folders.some((f) => f.name === 'Contracts')).toBe(true);
    });

    it('should create folder', async () => {
      const folder = await service.createFolder('New Folder', 'Folder Nou', 'user-1');

      expect(folder.id).toBeDefined();
      expect(folder.name).toBe('New Folder');
      expect(folder.nameRo).toBe('Folder Nou');
      expect(folder.path).toContain('New Folder');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'folder.created',
        expect.objectContaining({ folderId: folder.id }),
      );
    });

    it('should create nested folder', async () => {
      const parent = await service.createFolder('Parent', 'Părinte', 'user-1');
      const child = await service.createFolder('Child', 'Copil', 'user-1', { parentId: parent.id });

      expect(child.parentId).toBe(parent.id);
      expect(child.path).toContain('Parent');
      expect(child.path).toContain('Child');
    });

    it('should get folder by id', async () => {
      const created = await service.createFolder('Test', 'Test', 'user-1');
      const folder = await service.getFolder(created.id);

      expect(folder).toBeDefined();
      expect(folder!.id).toBe(created.id);
    });

    it('should list subfolders', async () => {
      const parent = await service.createFolder('Parent', 'Părinte', 'user-1');
      await service.createFolder('Child 1', 'Copil 1', 'user-1', { parentId: parent.id });
      await service.createFolder('Child 2', 'Copil 2', 'user-1', { parentId: parent.id });

      const children = await service.listFolders(parent.id);

      expect(children.length).toBe(2);
    });

    it('should update folder', async () => {
      const folder = await service.createFolder('Original', 'Original', 'user-1');

      const updated = await service.updateFolder(folder.id, { name: 'Renamed' });

      expect(updated.name).toBe('Renamed');
    });

    it('should delete empty folder', async () => {
      const folder = await service.createFolder('Delete Me', 'Delete Me', 'user-1');

      const result = await service.deleteFolder(folder.id);

      expect(result).toBe(true);
    });

    it('should not delete root folder', async () => {
      await expect(service.deleteFolder('root')).rejects.toThrow('Cannot delete root folder');
    });

    it('should not delete folder with documents', async () => {
      const folder = await service.createFolder('With Docs', 'With Docs', 'user-1');
      await service.uploadDocument(testContent, testFilename, testMimeType, 'user-1', {
        folderId: folder.id,
      });

      await expect(service.deleteFolder(folder.id)).rejects.toThrow(
        'Cannot delete folder with documents',
      );
    });

    it('should update folder stats on upload', async () => {
      const folder = await service.createFolder('Stats Test', 'Stats Test', 'user-1');
      await service.uploadDocument(testContent, testFilename, testMimeType, 'user-1', {
        folderId: folder.id,
      });

      const updated = await service.getFolder(folder.id);

      expect(updated!.documentCount).toBe(1);
      expect(updated!.totalSize).toBe(testContent.length);
    });
  });

  describe('Version Management', () => {
    let doc: any;

    beforeEach(async () => {
      doc = await service.uploadDocument(testContent, testFilename, testMimeType, 'user-1');
    });

    it('should have initial version', async () => {
      const versions = await service.getVersions(doc.id);

      expect(versions).toHaveLength(1);
      expect(versions[0].version).toBe(1);
    });

    it('should create new version on content update', async () => {
      await service.updateDocument(doc.id, Buffer.from('v2 content'), 'user-1');

      const versions = await service.getVersions(doc.id);

      expect(versions).toHaveLength(2);
      expect(versions[1].version).toBe(2);
    });

    it('should get specific version', async () => {
      await service.updateDocument(doc.id, Buffer.from('v2'), 'user-1');

      const version = await service.getVersion(doc.id, 1);

      expect(version).toBeDefined();
      expect(version!.version).toBe(1);
    });

    it('should track version changes', async () => {
      await service.updateDocument(doc.id, Buffer.from('v2'), 'user-1', {
        changes: 'Updated content',
      });

      const versions = await service.getVersions(doc.id);

      expect(versions[1].changes).toBe('Updated content');
    });
  });

  describe('Document Sharing', () => {
    let doc: any;

    beforeEach(async () => {
      doc = await service.uploadDocument(testContent, testFilename, testMimeType, 'user-1');
    });

    it('should share document', async () => {
      const share = await service.shareDocument(doc.id, 'user-2', 'user-1', ['VIEW', 'DOWNLOAD']);

      expect(share.id).toBeDefined();
      expect(share.documentId).toBe(doc.id);
      expect(share.sharedWith).toBe('user-2');
      expect(share.permissions).toContain('VIEW');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'document.shared',
        expect.objectContaining({ documentId: doc.id }),
      );
    });

    it('should share with expiration', async () => {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const share = await service.shareDocument(doc.id, 'user-2', 'user-1', ['VIEW'], { expiresAt });

      expect(share.expiresAt).toEqual(expiresAt);
    });

    it('should share with password', async () => {
      const share = await service.shareDocument(doc.id, 'user-2', 'user-1', ['VIEW'], {
        password: 'secret123',
      });

      expect(share.password).toBeDefined();
    });

    it('should get share by id', async () => {
      const created = await service.shareDocument(doc.id, 'user-2', 'user-1', ['VIEW']);
      const share = await service.getShare(created.id);

      expect(share).toBeDefined();
      expect(share!.id).toBe(created.id);
    });

    it('should list document shares', async () => {
      await service.shareDocument(doc.id, 'user-2', 'user-1', ['VIEW']);
      await service.shareDocument(doc.id, 'user-3', 'user-1', ['VIEW', 'DOWNLOAD']);

      const shares = await service.listShares(doc.id);

      expect(shares.length).toBe(2);
    });

    it('should revoke share', async () => {
      const share = await service.shareDocument(doc.id, 'user-2', 'user-1', ['VIEW']);

      const result = await service.revokeShare(share.id);

      expect(result).toBe(true);
      const revoked = await service.getShare(share.id);
      expect(revoked).toBeUndefined();
    });

    it('should access shared document', async () => {
      const share = await service.shareDocument(doc.id, 'user-2', 'user-1', ['VIEW']);

      const accessed = await service.accessShare(share.id);

      expect(accessed.id).toBe(doc.id);
    });

    it('should track access count', async () => {
      const share = await service.shareDocument(doc.id, 'user-2', 'user-1', ['VIEW']);

      await service.accessShare(share.id);
      await service.accessShare(share.id);

      const updated = await service.getShare(share.id);
      expect(updated!.accessCount).toBe(2);
    });

    it('should reject expired share', async () => {
      const expiredDate = new Date(Date.now() - 1000);
      const share = await service.shareDocument(doc.id, 'user-2', 'user-1', ['VIEW'], {
        expiresAt: expiredDate,
      });

      await expect(service.accessShare(share.id)).rejects.toThrow('Share link has expired');
    });

    it('should reject wrong password', async () => {
      const share = await service.shareDocument(doc.id, 'user-2', 'user-1', ['VIEW'], {
        password: 'secret',
      });

      await expect(service.accessShare(share.id, 'wrong')).rejects.toThrow('Invalid password');
    });
  });

  describe('Search', () => {
    beforeEach(async () => {
      await service.uploadDocument(testContent, 'invoice1.pdf', testMimeType, 'user-1', {
        name: 'January Invoice',
        tags: ['finance', 'q1'],
      });
      await service.uploadDocument(Buffer.from('contract'), 'contract.pdf', testMimeType, 'user-1', {
        name: 'Service Contract',
        type: 'CONTRACT',
        tags: ['legal'],
      });
      await service.uploadDocument(Buffer.from('report'), 'report.xlsx', 'application/vnd.ms-excel', 'user-2', {
        name: 'Annual Report',
        type: 'REPORT',
      });
    });

    it('should search by query', async () => {
      const result = await service.searchDocuments({ query: 'invoice' });

      expect(result.documents.some((d) => d.name.includes('Invoice'))).toBe(true);
    });

    it('should search by type', async () => {
      const result = await service.searchDocuments({ type: 'CONTRACT' });

      expect(result.documents.every((d) => d.type === 'CONTRACT')).toBe(true);
    });

    it('should search by multiple types', async () => {
      const result = await service.searchDocuments({ type: ['INVOICE', 'CONTRACT'] });

      expect(result.documents.length).toBeGreaterThan(0);
    });

    it('should search by tags', async () => {
      const result = await service.searchDocuments({ tags: ['finance'] });

      expect(result.documents.every((d) => d.tags.includes('finance'))).toBe(true);
    });

    it('should search by creator', async () => {
      const result = await service.searchDocuments({ createdBy: 'user-2' });

      expect(result.documents.every((d) => d.createdBy === 'user-2')).toBe(true);
    });

    it('should paginate results', async () => {
      const result = await service.searchDocuments({ pageSize: 2, page: 1 });

      expect(result.documents.length).toBeLessThanOrEqual(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(2);
    });

    it('should exclude deleted documents', async () => {
      const doc = await service.uploadDocument(Buffer.from('to delete'), 'delete.pdf', testMimeType, 'user-1');
      await service.deleteDocument(doc.id, 'user-1');

      const result = await service.searchDocuments({});

      expect(result.documents.some((d) => d.id === doc.id)).toBe(false);
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await service.uploadDocument(testContent, 'doc1.pdf', testMimeType, 'user-1', { type: 'INVOICE' });
      await service.uploadDocument(Buffer.from('2'), 'doc2.pdf', testMimeType, 'user-1', { type: 'CONTRACT' });
      await service.uploadDocument(Buffer.from('3'), 'doc3.pdf', testMimeType, 'user-1', { type: 'INVOICE' });
    });

    it('should return total documents', async () => {
      const stats = await service.getStats();

      expect(stats.totalDocuments).toBeGreaterThanOrEqual(3);
    });

    it('should return total size', async () => {
      const stats = await service.getStats();

      expect(stats.totalSize).toBeGreaterThan(0);
    });

    it('should count by type', async () => {
      const stats = await service.getStats();

      expect(stats.documentsByType.INVOICE).toBeGreaterThanOrEqual(2);
    });

    it('should return recent uploads', async () => {
      const stats = await service.getStats();

      expect(stats.recentUploads.length).toBeGreaterThan(0);
    });
  });

  describe('e-Factura Support', () => {
    it('should validate e-Factura XML', async () => {
      const doc = await service.uploadDocument(
        Buffer.from('<Invoice/>'),
        'efactura.xml',
        'application/xml',
        'user-1',
        { type: 'EFACTURA_XML' },
      );

      const result = await service.validateEfacturaXml(doc.id);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should throw error for non-XML document', async () => {
      const doc = await service.uploadDocument(testContent, testFilename, testMimeType, 'user-1');

      await expect(service.validateEfacturaXml(doc.id)).rejects.toThrow('not an e-Factura XML');
    });
  });

  describe('Romanian Localization', () => {
    it('should translate document types', () => {
      expect(service.getDocumentTypeName('INVOICE')).toBe('Factură');
      expect(service.getDocumentTypeName('CONTRACT')).toBe('Contract');
      expect(service.getDocumentTypeName('PAYSLIP')).toContain('Salariu');
    });

    it('should translate statuses', () => {
      expect(service.getStatusName('PENDING')).toBe('În Așteptare');
      expect(service.getStatusName('APPROVED')).toBe('Aprobat');
      expect(service.getStatusName('ARCHIVED')).toBe('Arhivat');
    });

    it('should get all document types with translations', () => {
      const types = service.getAllDocumentTypes();

      expect(types.length).toBeGreaterThan(0);
      expect(types.every((t) => t.nameRo)).toBe(true);
    });

    it('should get all statuses with translations', () => {
      const statuses = service.getAllStatuses();

      expect(statuses.length).toBeGreaterThan(0);
      expect(statuses.every((s) => s.nameRo)).toBe(true);
    });

    it('should have Romanian diacritics in translations', () => {
      const invoice = service.getDocumentTypeName('INVOICE');
      expect(invoice).toContain('ă'); // Factură

      const pending = service.getStatusName('PENDING');
      expect(pending).toContain('ș'); // Așteptare
    });

    it('should have Romanian folder names', async () => {
      const folders = await service.listFolders('root');
      const invoices = folders.find((f) => f.name === 'Invoices');

      expect(invoices!.nameRo).toBe('Facturi');
    });
  });

  describe('Events', () => {
    it('should emit document.uploaded event', async () => {
      await service.uploadDocument(testContent, testFilename, testMimeType, 'user-1');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('document.uploaded', expect.any(Object));
    });

    it('should emit document.updated event', async () => {
      const doc = await service.uploadDocument(testContent, testFilename, testMimeType, 'user-1');
      await service.updateDocument(doc.id, undefined, 'user-1', { name: 'Updated' });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('document.updated', expect.any(Object));
    });

    it('should emit document.deleted event', async () => {
      const doc = await service.uploadDocument(testContent, testFilename, testMimeType, 'user-1');
      await service.deleteDocument(doc.id, 'user-1');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('document.deleted', expect.any(Object));
    });

    it('should emit document.shared event', async () => {
      const doc = await service.uploadDocument(testContent, testFilename, testMimeType, 'user-1');
      await service.shareDocument(doc.id, 'user-2', 'user-1', ['VIEW']);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('document.shared', expect.any(Object));
    });

    it('should emit folder.created event', async () => {
      await service.createFolder('Test', 'Test', 'user-1');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('folder.created', expect.any(Object));
    });
  });
});
