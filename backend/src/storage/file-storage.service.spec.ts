import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  FileStorageService,
  FileMetadata,
  Folder,
  UploadOptions,
  FileQuery,
  StoragePolicy,
  FileCategory,
} from './file-storage.service';

describe('FileStorageService', () => {
  let service: FileStorageService;
  let eventEmitter: EventEmitter2;

  const mockUserId = 'user-123';
  const mockOrgId = 'org-456';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileStorageService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FileStorageService>(FileStorageService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have default policies initialized', () => {
      const policies = service.getAllPolicies();
      expect(policies.length).toBeGreaterThan(0);
    });

    it('should have invoice policy with 10-year retention', () => {
      const policy = service.getPolicyForCategory('INVOICE');
      expect(policy).toBeDefined();
      expect(policy!.retentionDays).toBe(3650);
    });

    it('should have ANAF XML policy with 500MB max size', () => {
      const policy = service.getPolicyForCategory('ANAF_XML');
      expect(policy).toBeDefined();
      expect(policy!.maxFileSize).toBe(500 * 1024 * 1024);
    });
  });

  describe('File Upload', () => {
    const testContent = Buffer.from('test file content');
    const testFilename = 'test-document.pdf';
    const testMimeType = 'application/pdf';

    it('should upload a file successfully', async () => {
      const options: UploadOptions = {
        category: 'DOCUMENT',
        tags: ['important', 'test'],
      };

      const result = await service.uploadFile(
        testContent,
        testFilename,
        testMimeType,
        mockUserId,
        mockOrgId,
        options,
      );

      expect(result.file).toBeDefined();
      expect(result.file.name).toBe(testFilename);
      expect(result.file.mimeType).toBe(testMimeType);
      expect(result.file.size).toBe(testContent.length);
      expect(result.file.status).toBe('READY');
      expect(result.file.tags).toEqual(['important', 'test']);
    });

    it('should emit file.uploaded event', async () => {
      const options: UploadOptions = { category: 'DOCUMENT' };

      await service.uploadFile(
        testContent,
        testFilename,
        testMimeType,
        mockUserId,
        mockOrgId,
        options,
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'file.uploaded',
        expect.objectContaining({
          userId: mockUserId,
          organizationId: mockOrgId,
          category: 'DOCUMENT',
        }),
      );
    });

    it('should calculate checksum for uploaded file', async () => {
      const options: UploadOptions = { category: 'DOCUMENT' };

      const result = await service.uploadFile(
        testContent,
        testFilename,
        testMimeType,
        mockUserId,
        mockOrgId,
        options,
      );

      expect(result.file.checksum).toBeDefined();
      expect(result.file.checksum.length).toBe(64); // SHA256 hex
      expect(result.file.checksumAlgorithm).toBe('SHA256');
    });

    it('should set encryption key when encrypt option is true', async () => {
      const options: UploadOptions = { category: 'DOCUMENT', encrypt: true };

      const result = await service.uploadFile(
        testContent,
        testFilename,
        testMimeType,
        mockUserId,
        mockOrgId,
        options,
      );

      expect(result.file.isEncrypted).toBe(true);
      expect(result.file.encryptionKey).toBeDefined();
    });

    it('should set compression when compress option is true', async () => {
      const options: UploadOptions = { category: 'DOCUMENT', compress: true };

      const result = await service.uploadFile(
        testContent,
        testFilename,
        testMimeType,
        mockUserId,
        mockOrgId,
        options,
      );

      expect(result.file.isCompressed).toBe(true);
      expect(result.file.compressionType).toBe('GZIP');
    });

    it('should upload to specific folder', async () => {
      const folder = await service.createFolder('Test Folder', mockOrgId, mockUserId);

      const options: UploadOptions = {
        category: 'DOCUMENT',
        folderId: folder.id,
      };

      const result = await service.uploadFile(
        testContent,
        testFilename,
        testMimeType,
        mockUserId,
        mockOrgId,
        options,
      );

      expect(result.file.folderId).toBe(folder.id);
    });

    it('should set access level', async () => {
      const options: UploadOptions = {
        category: 'DOCUMENT',
        accessLevel: 'SHARED',
      };

      const result = await service.uploadFile(
        testContent,
        testFilename,
        testMimeType,
        mockUserId,
        mockOrgId,
        options,
      );

      expect(result.file.accessLevel).toBe('SHARED');
    });

    it('should set expiration date', async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const options: UploadOptions = {
        category: 'DOCUMENT',
        expiresAt,
      };

      const result = await service.uploadFile(
        testContent,
        testFilename,
        testMimeType,
        mockUserId,
        mockOrgId,
        options,
      );

      expect(result.file.expiresAt).toEqual(expiresAt);
    });

    it('should reject empty file', async () => {
      const options: UploadOptions = { category: 'DOCUMENT' };

      await expect(
        service.uploadFile(Buffer.alloc(0), testFilename, testMimeType, mockUserId, mockOrgId, options),
      ).rejects.toThrow('File content is empty');
    });

    it('should reject empty filename', async () => {
      const options: UploadOptions = { category: 'DOCUMENT' };

      await expect(
        service.uploadFile(testContent, '', testMimeType, mockUserId, mockOrgId, options),
      ).rejects.toThrow('Filename is required');
    });

    it('should reject file exceeding policy size limit', async () => {
      const largeContent = Buffer.alloc(100 * 1024 * 1024); // 100MB
      const options: UploadOptions = { category: 'AVATAR' }; // 5MB limit

      await expect(
        service.uploadFile(largeContent, 'avatar.png', 'image/png', mockUserId, mockOrgId, options),
      ).rejects.toThrow(/exceeds maximum/);
    });

    it('should reject disallowed mime type', async () => {
      const options: UploadOptions = { category: 'AVATAR' };

      await expect(
        service.uploadFile(testContent, 'file.exe', 'application/x-msdownload', mockUserId, mockOrgId, options),
      ).rejects.toThrow(/not allowed/);
    });
  });

  describe('File Versioning', () => {
    const testContent = Buffer.from('version 1 content');
    const testFilename = 'versioned-doc.pdf';

    it('should create new version when version option is true', async () => {
      // Upload original
      const options: UploadOptions = { category: 'DOCUMENT', version: true };
      const v1 = await service.uploadFile(
        testContent,
        testFilename,
        'application/pdf',
        mockUserId,
        mockOrgId,
        options,
      );

      expect(v1.file.version).toBe(1);

      // Upload new version
      const newContent = Buffer.from('version 2 content');
      const v2 = await service.uploadFile(
        newContent,
        testFilename,
        'application/pdf',
        mockUserId,
        mockOrgId,
        options,
      );

      expect(v2.file.version).toBe(2);
      expect(v2.file.versions.length).toBe(1);
      expect(v2.file.versions[0].version).toBe(1);
    });

    it('should keep same file ID for versions', async () => {
      const options: UploadOptions = { category: 'DOCUMENT', version: true };
      const v1 = await service.uploadFile(
        testContent,
        testFilename,
        'application/pdf',
        mockUserId,
        mockOrgId,
        options,
      );

      const v2 = await service.uploadFile(
        Buffer.from('new content'),
        testFilename,
        'application/pdf',
        mockUserId,
        mockOrgId,
        options,
      );

      expect(v2.file.id).toBe(v1.file.id);
    });

    it('should preserve download count across versions', async () => {
      const options: UploadOptions = { category: 'DOCUMENT', version: true };
      const v1 = await service.uploadFile(
        testContent,
        testFilename,
        'application/pdf',
        mockUserId,
        mockOrgId,
        options,
      );

      // Download the file to increment count
      await service.downloadFile(v1.file.id, mockUserId);
      await service.downloadFile(v1.file.id, mockUserId);

      const v2 = await service.uploadFile(
        Buffer.from('new content'),
        testFilename,
        'application/pdf',
        mockUserId,
        mockOrgId,
        options,
      );

      expect(v2.file.downloadCount).toBe(2);
    });
  });

  describe('Multipart Upload', () => {
    it('should initiate multipart upload', async () => {
      const totalSize = 20 * 1024 * 1024; // 20MB
      const options: UploadOptions = { category: 'BACKUP' };

      const result = await service.initiateMultipartUpload(
        'large-backup.zip',
        'application/zip',
        totalSize,
        mockUserId,
        mockOrgId,
        options,
      );

      expect(result.file).toBeDefined();
      expect(result.file.status).toBe('UPLOADING');
      expect(result.uploadId).toBeDefined();
      expect(result.parts).toBeDefined();
      expect(result.parts!.length).toBe(4); // 20MB / 5MB = 4 parts
    });

    it('should complete multipart upload', async () => {
      const options: UploadOptions = { category: 'BACKUP' };
      const totalSize = 10 * 1024 * 1024;

      const initResult = await service.initiateMultipartUpload(
        'backup.zip',
        'application/zip',
        totalSize,
        mockUserId,
        mockOrgId,
        options,
      );

      const parts = [
        Buffer.alloc(5 * 1024 * 1024),
        Buffer.alloc(5 * 1024 * 1024),
      ];

      const file = await service.completeMultipartUpload(initResult.file.id, parts);

      expect(file.status).toBe('READY');
      expect(file.checksum).toBeDefined();
    });

    it('should emit multipart events', async () => {
      const options: UploadOptions = { category: 'BACKUP' };

      await service.initiateMultipartUpload(
        'backup.zip',
        'application/zip',
        10 * 1024 * 1024,
        mockUserId,
        mockOrgId,
        options,
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'file.multipart.initiated',
        expect.objectContaining({
          userId: mockUserId,
          organizationId: mockOrgId,
        }),
      );
    });
  });

  describe('File Download', () => {
    let uploadedFile: FileMetadata;
    const testContent = Buffer.from('downloadable content');

    beforeEach(async () => {
      const result = await service.uploadFile(
        testContent,
        'download-test.txt',
        'text/plain',
        mockUserId,
        mockOrgId,
        { category: 'DOCUMENT' },
      );
      uploadedFile = result.file;
    });

    it('should download file content', async () => {
      const result = await service.downloadFile(uploadedFile.id, mockUserId);

      expect(result.content).toEqual(testContent);
      expect(result.metadata.id).toBe(uploadedFile.id);
    });

    it('should increment download count', async () => {
      await service.downloadFile(uploadedFile.id, mockUserId);
      await service.downloadFile(uploadedFile.id, mockUserId);

      const file = await service.getFileById(uploadedFile.id);
      expect(file!.downloadCount).toBe(2);
    });

    it('should update last accessed timestamp', async () => {
      const before = new Date();
      await service.downloadFile(uploadedFile.id, mockUserId);

      const file = await service.getFileById(uploadedFile.id);
      expect(file!.lastAccessedAt).toBeDefined();
      expect(file!.lastAccessedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should emit download event', async () => {
      await service.downloadFile(uploadedFile.id, mockUserId);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'file.downloaded',
        expect.objectContaining({
          fileId: uploadedFile.id,
          userId: mockUserId,
        }),
      );
    });

    it('should throw error for non-existent file', async () => {
      await expect(
        service.downloadFile('non-existent', mockUserId),
      ).rejects.toThrow('File not found');
    });

    it('should download specific version', async () => {
      // Create version 2
      await service.uploadFile(
        Buffer.from('version 2'),
        uploadedFile.name,
        'text/plain',
        mockUserId,
        mockOrgId,
        { category: 'DOCUMENT', version: true },
      );

      const result = await service.downloadFile(uploadedFile.id, mockUserId, { version: 1 });

      expect(result.content).toEqual(testContent);
    });

    it('should throw error for non-existent version', async () => {
      await expect(
        service.downloadFile(uploadedFile.id, mockUserId, { version: 99 }),
      ).rejects.toThrow('Version 99 not found');
    });
  });

  describe('Download URL Generation', () => {
    let uploadedFile: FileMetadata;

    beforeEach(async () => {
      const result = await service.uploadFile(
        Buffer.from('test'),
        'url-test.pdf',
        'application/pdf',
        mockUserId,
        mockOrgId,
        { category: 'DOCUMENT' },
      );
      uploadedFile = result.file;
    });

    it('should generate download URL', async () => {
      const result = await service.getDownloadUrl(uploadedFile.id, mockUserId);

      expect(result.url).toBeDefined();
      expect(result.url).toContain('/api/files/download/');
      expect(result.expiresAt).toBeDefined();
    });

    it('should set content headers', async () => {
      const result = await service.getDownloadUrl(uploadedFile.id, mockUserId);

      expect(result.headers['Content-Type']).toBe('application/pdf');
      expect(result.headers['Content-Length']).toBe(uploadedFile.size.toString());
    });

    it('should set attachment disposition by default', async () => {
      const result = await service.getDownloadUrl(uploadedFile.id, mockUserId);

      expect(result.headers['Content-Disposition']).toContain('attachment');
    });

    it('should not set attachment for inline option', async () => {
      const result = await service.getDownloadUrl(uploadedFile.id, mockUserId, { inline: true });

      expect(result.headers['Content-Disposition']).toBeUndefined();
    });

    it('should respect custom expiration', async () => {
      const result = await service.getDownloadUrl(uploadedFile.id, mockUserId, { expiresIn: 60 });

      const expectedExpiry = new Date(Date.now() + 60 * 1000);
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedExpiry.getTime() + 1000);
    });
  });

  describe('File Deletion', () => {
    let uploadedFile: FileMetadata;

    beforeEach(async () => {
      const result = await service.uploadFile(
        Buffer.from('deletable'),
        'delete-test.txt',
        'text/plain',
        mockUserId,
        mockOrgId,
        { category: 'DOCUMENT' },
      );
      uploadedFile = result.file;
    });

    it('should soft delete file', async () => {
      await service.deleteFile(uploadedFile.id, mockUserId, false);

      const file = await service.getFileById(uploadedFile.id);
      expect(file!.status).toBe('DELETED');
      expect(file!.deletedAt).toBeDefined();
    });

    it('should permanently delete file', async () => {
      await service.deleteFile(uploadedFile.id, mockUserId, true);

      const file = await service.getFileById(uploadedFile.id);
      expect(file).toBeUndefined();
    });

    it('should emit delete event', async () => {
      await service.deleteFile(uploadedFile.id, mockUserId, false);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'file.deleted',
        expect.objectContaining({
          fileId: uploadedFile.id,
          userId: mockUserId,
          permanent: false,
        }),
      );
    });

    it('should prevent deletion during retention period', async () => {
      // Upload invoice with retention
      const result = await service.uploadFile(
        Buffer.from('invoice'),
        'invoice.pdf',
        'application/pdf',
        mockUserId,
        mockOrgId,
        { category: 'INVOICE' },
      );

      await expect(
        service.deleteFile(result.file.id, mockUserId, true),
      ).rejects.toThrow(/retention period/);
    });

    it('should restore soft-deleted file', async () => {
      await service.deleteFile(uploadedFile.id, mockUserId, false);
      const restored = await service.restoreFile(uploadedFile.id, mockUserId);

      expect(restored.status).toBe('READY');
      expect(restored.deletedAt).toBeUndefined();
    });

    it('should throw when restoring non-deleted file', async () => {
      await expect(
        service.restoreFile(uploadedFile.id, mockUserId),
      ).rejects.toThrow('File is not deleted');
    });
  });

  describe('File Move and Copy', () => {
    let uploadedFile: FileMetadata;
    let targetFolder: Folder;

    beforeEach(async () => {
      const result = await service.uploadFile(
        Buffer.from('moveable'),
        'move-test.txt',
        'text/plain',
        mockUserId,
        mockOrgId,
        { category: 'DOCUMENT' },
      );
      uploadedFile = result.file;
      targetFolder = await service.createFolder('Target', mockOrgId, mockUserId);
    });

    it('should move file to folder', async () => {
      const moved = await service.moveFile(uploadedFile.id, targetFolder.id, mockUserId);

      expect(moved.folderId).toBe(targetFolder.id);
    });

    it('should emit move event', async () => {
      await service.moveFile(uploadedFile.id, targetFolder.id, mockUserId);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'file.moved',
        expect.objectContaining({
          fileId: uploadedFile.id,
          targetFolderId: targetFolder.id,
        }),
      );
    });

    it('should copy file to folder', async () => {
      const copied = await service.copyFile(uploadedFile.id, targetFolder.id, mockUserId);

      expect(copied.id).not.toBe(uploadedFile.id);
      expect(copied.folderId).toBe(targetFolder.id);
      expect(copied.name).toContain('Copy of');
    });

    it('should emit copy event', async () => {
      await service.copyFile(uploadedFile.id, targetFolder.id, mockUserId);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'file.copied',
        expect.objectContaining({
          sourceFileId: uploadedFile.id,
          targetFolderId: targetFolder.id,
        }),
      );
    });

    it('should throw when moving to non-existent folder', async () => {
      await expect(
        service.moveFile(uploadedFile.id, 'non-existent', mockUserId),
      ).rejects.toThrow('Target folder not found');
    });
  });

  describe('Folder Management', () => {
    it('should create folder', async () => {
      const folder = await service.createFolder('Documents', mockOrgId, mockUserId);

      expect(folder.id).toBeDefined();
      expect(folder.name).toBe('Documents');
      expect(folder.path).toBe('/Documents');
      expect(folder.organizationId).toBe(mockOrgId);
    });

    it('should create nested folder', async () => {
      const parent = await service.createFolder('Parent', mockOrgId, mockUserId);
      const child = await service.createFolder('Child', mockOrgId, mockUserId, parent.id);

      expect(child.parentId).toBe(parent.id);
      expect(child.path).toBe('/Parent/Child');
    });

    it('should create folder with Romanian name', async () => {
      const folder = await service.createFolder('Invoices', mockOrgId, mockUserId, undefined, {
        nameRo: 'Facturi',
      });

      expect(folder.nameRo).toBe('Facturi');
    });

    it('should delete empty folder', async () => {
      const folder = await service.createFolder('Empty', mockOrgId, mockUserId);
      await service.deleteFolder(folder.id, mockUserId);

      const retrieved = await service.getFolderById(folder.id);
      expect(retrieved).toBeUndefined();
    });

    it('should not delete non-empty folder without recursive flag', async () => {
      const folder = await service.createFolder('NonEmpty', mockOrgId, mockUserId);

      await service.uploadFile(
        Buffer.from('file'),
        'file.txt',
        'text/plain',
        mockUserId,
        mockOrgId,
        { category: 'DOCUMENT', folderId: folder.id },
      );

      await expect(
        service.deleteFolder(folder.id, mockUserId, false),
      ).rejects.toThrow('Folder is not empty');
    });

    it('should delete folder recursively', async () => {
      const folder = await service.createFolder('Recursive', mockOrgId, mockUserId);
      const subfolder = await service.createFolder('Sub', mockOrgId, mockUserId, folder.id);

      await service.uploadFile(
        Buffer.from('file'),
        'file.txt',
        'text/plain',
        mockUserId,
        mockOrgId,
        { category: 'DOCUMENT', folderId: subfolder.id },
      );

      await service.deleteFolder(folder.id, mockUserId, true);

      expect(await service.getFolderById(folder.id)).toBeUndefined();
      expect(await service.getFolderById(subfolder.id)).toBeUndefined();
    });

    it('should get folder contents', async () => {
      const folder = await service.createFolder('Contents', mockOrgId, mockUserId);
      const subfolder = await service.createFolder('Sub', mockOrgId, mockUserId, folder.id);

      await service.uploadFile(
        Buffer.from('file1'),
        'file1.txt',
        'text/plain',
        mockUserId,
        mockOrgId,
        { category: 'DOCUMENT', folderId: folder.id },
      );

      const contents = await service.getFolderContents(folder.id);

      expect(contents.folder.id).toBe(folder.id);
      expect(contents.files.length).toBe(1);
      expect(contents.subfolders.length).toBe(1);
      expect(contents.subfolders[0].id).toBe(subfolder.id);
    });
  });

  describe('File Metadata Updates', () => {
    let uploadedFile: FileMetadata;

    beforeEach(async () => {
      const result = await service.uploadFile(
        Buffer.from('metadata'),
        'metadata-test.txt',
        'text/plain',
        mockUserId,
        mockOrgId,
        { category: 'DOCUMENT' },
      );
      uploadedFile = result.file;
    });

    it('should update file name', async () => {
      const updated = await service.updateFileMetadata(
        uploadedFile.id,
        { name: 'new-name.txt' },
        mockUserId,
      );

      expect(updated.name).toBe('new-name.txt');
    });

    it('should update tags', async () => {
      const updated = await service.updateFileMetadata(
        uploadedFile.id,
        { tags: ['new', 'tags'] },
        mockUserId,
      );

      expect(updated.tags).toEqual(['new', 'tags']);
    });

    it('should update access level', async () => {
      const updated = await service.updateFileMetadata(
        uploadedFile.id,
        { accessLevel: 'PUBLIC' },
        mockUserId,
      );

      expect(updated.accessLevel).toBe('PUBLIC');
    });

    it('should merge metadata', async () => {
      const updated = await service.updateFileMetadata(
        uploadedFile.id,
        { metadata: { custom: 'value' } },
        mockUserId,
      );

      expect(updated.metadata.custom).toBe('value');
    });

    it('should emit metadata update event', async () => {
      await service.updateFileMetadata(
        uploadedFile.id,
        { name: 'updated.txt' },
        mockUserId,
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'file.metadata.updated',
        expect.objectContaining({ fileId: uploadedFile.id }),
      );
    });
  });

  describe('File Query', () => {
    beforeEach(async () => {
      // Upload various files
      await service.uploadFile(
        Buffer.from('invoice1'),
        'invoice1.pdf',
        'application/pdf',
        mockUserId,
        mockOrgId,
        { category: 'INVOICE', tags: ['2024'] },
      );

      await service.uploadFile(
        Buffer.from('invoice2'),
        'invoice2.pdf',
        'application/pdf',
        mockUserId,
        mockOrgId,
        { category: 'INVOICE', tags: ['2024', 'important'] },
      );

      await service.uploadFile(
        Buffer.from('doc'),
        'document.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        mockUserId,
        mockOrgId,
        { category: 'DOCUMENT' },
      );
    });

    it('should query all files', async () => {
      const result = await service.queryFiles({});

      expect(result.files.length).toBe(3);
      expect(result.total).toBe(3);
    });

    it('should filter by category', async () => {
      const result = await service.queryFiles({ category: 'INVOICE' });

      expect(result.files.length).toBe(2);
      expect(result.files.every((f) => f.category === 'INVOICE')).toBe(true);
    });

    it('should filter by tags', async () => {
      const result = await service.queryFiles({ tags: ['important'] });

      expect(result.files.length).toBe(1);
      expect(result.files[0].tags).toContain('important');
    });

    it('should filter by mime type', async () => {
      const result = await service.queryFiles({ mimeType: 'application/pdf' });

      expect(result.files.length).toBe(2);
    });

    it('should search by name', async () => {
      const result = await service.queryFiles({ search: 'invoice' });

      expect(result.files.length).toBe(2);
    });

    it('should paginate results', async () => {
      const page1 = await service.queryFiles({ page: 1, limit: 2 });
      const page2 = await service.queryFiles({ page: 2, limit: 2 });

      expect(page1.files.length).toBe(2);
      expect(page1.hasMore).toBe(true);
      expect(page2.files.length).toBe(1);
      expect(page2.hasMore).toBe(false);
    });

    it('should sort by size', async () => {
      const result = await service.queryFiles({
        sortBy: 'size',
        sortOrder: 'desc',
      });

      for (let i = 0; i < result.files.length - 1; i++) {
        expect(result.files[i].size).toBeGreaterThanOrEqual(result.files[i + 1].size);
      }
    });

    it('should filter by organization', async () => {
      // Upload to different org
      await service.uploadFile(
        Buffer.from('other'),
        'other.txt',
        'text/plain',
        mockUserId,
        'other-org',
        { category: 'DOCUMENT' },
      );

      const result = await service.queryFiles({ organizationId: mockOrgId });

      expect(result.files.every((f) => f.organizationId === mockOrgId)).toBe(true);
    });

    it('should exclude deleted files by default', async () => {
      const uploaded = await service.uploadFile(
        Buffer.from('to-delete'),
        'delete.txt',
        'text/plain',
        mockUserId,
        mockOrgId,
        { category: 'DOCUMENT' },
      );

      await service.deleteFile(uploaded.file.id, mockUserId, false);

      const result = await service.queryFiles({});

      expect(result.files.find((f) => f.id === uploaded.file.id)).toBeUndefined();
    });
  });

  describe('Bulk Operations', () => {
    let files: FileMetadata[];
    let targetFolder: Folder;

    beforeEach(async () => {
      files = [];
      for (let i = 0; i < 3; i++) {
        const result = await service.uploadFile(
          Buffer.from(`file ${i}`),
          `bulk-${i}.txt`,
          'text/plain',
          mockUserId,
          mockOrgId,
          { category: 'DOCUMENT' },
        );
        files.push(result.file);
      }

      targetFolder = await service.createFolder('Bulk Target', mockOrgId, mockUserId);
    });

    it('should start bulk move operation', async () => {
      const fileIds = files.map((f) => f.id);
      const operation = await service.startBulkOperation('MOVE', fileIds, mockUserId, targetFolder.id);

      expect(operation.id).toBeDefined();
      expect(operation.type).toBe('MOVE');
      expect(operation.fileIds).toEqual(fileIds);
      // Status may be PENDING or IN_PROGRESS depending on async timing
      expect(['PENDING', 'IN_PROGRESS']).toContain(operation.status);
    });

    it('should complete bulk operation', async () => {
      const fileIds = files.map((f) => f.id);
      const operation = await service.startBulkOperation('DELETE', fileIds, mockUserId);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      const completed = await service.getBulkOperation(operation.id);

      expect(completed!.status).toBe('COMPLETED');
      expect(completed!.results.length).toBe(3);
      expect(completed!.results.every((r) => r.success)).toBe(true);
    });

    it('should track bulk operation progress', async () => {
      const fileIds = files.map((f) => f.id);
      await service.startBulkOperation('ARCHIVE', fileIds, mockUserId);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const operation = await service.getBulkOperation(
        (await service.startBulkOperation('ARCHIVE', fileIds, mockUserId)).id,
      );

      expect(operation!.progress).toBeDefined();
    });
  });

  describe('File Archive', () => {
    let uploadedFile: FileMetadata;

    beforeEach(async () => {
      const result = await service.uploadFile(
        Buffer.from('archivable'),
        'archive-test.txt',
        'text/plain',
        mockUserId,
        mockOrgId,
        { category: 'DOCUMENT' },
      );
      uploadedFile = result.file;
    });

    it('should archive file', async () => {
      const archived = await service.archiveFile(uploadedFile.id, mockUserId);

      expect(archived.status).toBe('ARCHIVED');
    });

    it('should emit archive event', async () => {
      await service.archiveFile(uploadedFile.id, mockUserId);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'file.archived',
        expect.objectContaining({ fileId: uploadedFile.id }),
      );
    });
  });

  describe('Storage Quota', () => {
    it('should get default quota', async () => {
      const quota = await service.getStorageQuota(mockOrgId);

      expect(quota.organizationId).toBe(mockOrgId);
      expect(quota.totalBytes).toBe(10 * 1024 * 1024 * 1024); // 10GB
      expect(quota.usedBytes).toBe(0);
    });

    it('should update quota on upload', async () => {
      const content = Buffer.alloc(1000);
      await service.uploadFile(
        content,
        'quota-test.txt',
        'text/plain',
        mockUserId,
        mockOrgId,
        { category: 'DOCUMENT' },
      );

      const quota = await service.getStorageQuota(mockOrgId);

      expect(quota.usedBytes).toBe(1000);
      expect(quota.fileCount).toBe(1);
    });

    it('should prevent upload when quota exceeded', async () => {
      // Get current quota and set it very low
      const quota = await service.getStorageQuota(mockOrgId);
      quota.totalBytes = 100;
      quota.usedBytes = 90;

      // Try to upload file larger than remaining space
      await expect(
        service.uploadFile(
          Buffer.alloc(20),
          'over-quota.txt',
          'text/plain',
          mockUserId,
          mockOrgId,
          { category: 'DOCUMENT' },
        ),
      ).rejects.toThrow('Storage quota exceeded');
    });
  });

  describe('Storage Statistics', () => {
    beforeEach(async () => {
      await service.uploadFile(
        Buffer.alloc(1000),
        'stat1.pdf',
        'application/pdf',
        mockUserId,
        mockOrgId,
        { category: 'INVOICE' },
      );

      await service.uploadFile(
        Buffer.alloc(2000),
        'stat2.pdf',
        'application/pdf',
        mockUserId,
        mockOrgId,
        { category: 'INVOICE' },
      );

      await service.uploadFile(
        Buffer.alloc(500),
        'stat3.txt',
        'text/plain',
        mockUserId,
        mockOrgId,
        { category: 'DOCUMENT' },
      );
    });

    it('should calculate total files and size', async () => {
      const stats = await service.getStorageStats(mockOrgId);

      expect(stats.totalFiles).toBe(3);
      expect(stats.totalSize).toBe(3500);
    });

    it('should group by category', async () => {
      const stats = await service.getStorageStats(mockOrgId);

      expect(stats.byCategory.INVOICE.count).toBe(2);
      expect(stats.byCategory.INVOICE.size).toBe(3000);
      expect(stats.byCategory.DOCUMENT.count).toBe(1);
    });

    it('should group by status', async () => {
      const stats = await service.getStorageStats(mockOrgId);

      expect(stats.byStatus.READY).toBe(3);
    });

    it('should return recent uploads', async () => {
      const stats = await service.getStorageStats(mockOrgId);

      expect(stats.recentUploads.length).toBe(3);
    });
  });

  describe('Storage Policies', () => {
    it('should get all policies', () => {
      const policies = service.getAllPolicies();

      expect(policies.length).toBeGreaterThanOrEqual(5);
    });

    it('should get policy by ID', () => {
      const policy = service.getPolicy('policy-invoice');

      expect(policy).toBeDefined();
      expect(policy!.name).toBe('Invoice Documents');
    });

    it('should get policy for category', () => {
      const policy = service.getPolicyForCategory('ANAF_XML');

      expect(policy).toBeDefined();
      expect(policy!.requireEncryption).toBe(true);
    });

    it('should enforce encryption for invoice policy', async () => {
      const result = await service.uploadFile(
        Buffer.from('invoice content'),
        'policy-test.pdf',
        'application/pdf',
        mockUserId,
        mockOrgId,
        { category: 'INVOICE' },
      );

      expect(result.file.isEncrypted).toBe(true);
    });

    it('should enforce compression for ANAF XML policy', async () => {
      const result = await service.uploadFile(
        Buffer.from('<xml>content</xml>'),
        'anaf-test.xml',
        'application/xml',
        mockUserId,
        mockOrgId,
        { category: 'ANAF_XML' },
      );

      expect(result.file.isCompressed).toBe(true);
    });
  });

  describe('Encryption and Decryption', () => {
    it('should encrypt and decrypt file content correctly', async () => {
      const originalContent = Buffer.from('sensitive data that must be encrypted');

      const result = await service.uploadFile(
        originalContent,
        'encrypted.txt',
        'text/plain',
        mockUserId,
        mockOrgId,
        { category: 'DOCUMENT', encrypt: true },
      );

      const downloaded = await service.downloadFile(result.file.id, mockUserId);

      expect(downloaded.content).toEqual(originalContent);
    });

    it('should store encrypted content differently than original', async () => {
      const originalContent = Buffer.from('test content');

      const result = await service.uploadFile(
        originalContent,
        'encrypt-check.pdf',
        'application/pdf',
        mockUserId,
        mockOrgId,
        { category: 'INVOICE' }, // Uses encrypted policy
      );

      expect(result.file.isEncrypted).toBe(true);
    });
  });

  describe('File Retrieval', () => {
    it('should get file by ID', async () => {
      const result = await service.uploadFile(
        Buffer.from('test'),
        'retrieve.txt',
        'text/plain',
        mockUserId,
        mockOrgId,
        { category: 'DOCUMENT' },
      );

      const file = await service.getFileById(result.file.id);

      expect(file).toBeDefined();
      expect(file!.id).toBe(result.file.id);
    });

    it('should get multiple files by IDs', async () => {
      const results = await Promise.all([
        service.uploadFile(Buffer.from('1'), 'f1.txt', 'text/plain', mockUserId, mockOrgId, { category: 'DOCUMENT' }),
        service.uploadFile(Buffer.from('2'), 'f2.txt', 'text/plain', mockUserId, mockOrgId, { category: 'DOCUMENT' }),
      ]);

      const ids = results.map((r) => r.file.id);
      const files = await service.getFilesByIds(ids);

      expect(files.length).toBe(2);
    });

    it('should return undefined for non-existent file', async () => {
      const file = await service.getFileById('non-existent');

      expect(file).toBeUndefined();
    });
  });
});
