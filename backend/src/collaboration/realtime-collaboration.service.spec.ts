import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import {
  RealtimeCollaborationService,
  DocumentType,
  PermissionLevel,
  PresenceStatus,
  OperationType,
} from './realtime-collaboration.service';

describe('RealtimeCollaborationService', () => {
  let service: RealtimeCollaborationService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RealtimeCollaborationService, EventEmitter2],
    }).compile();

    service = module.get<RealtimeCollaborationService>(RealtimeCollaborationService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  describe('Document Management', () => {
    it('should create a document', () => {
      const doc = service.createDocument({
        title: 'Test Document',
        titleRo: 'Document Test',
        type: 'INVOICE',
        ownerId: 'user-1',
        content: 'Initial content',
      });

      expect(doc.id).toContain('doc-');
      expect(doc.title).toBe('Test Document');
      expect(doc.titleRo).toBe('Document Test');
      expect(doc.type).toBe('INVOICE');
      expect(doc.ownerId).toBe('user-1');
      expect(doc.version).toBe(1);
      expect(doc.isLocked).toBe(false);
    });

    it('should create document with optional fields', () => {
      const doc = service.createDocument({
        title: 'Tagged Doc',
        titleRo: 'Document Etichetat',
        type: 'CONTRACT',
        ownerId: 'user-1',
        tenantId: 'tenant-1',
        tags: ['important', 'legal'],
        metadata: { category: 'contracts' },
      });

      expect(doc.tenantId).toBe('tenant-1');
      expect(doc.tags).toEqual(['important', 'legal']);
      expect(doc.metadata.category).toBe('contracts');
    });

    it('should get a document by id', () => {
      const created = service.createDocument({
        title: 'Get Test',
        titleRo: 'Test Get',
        type: 'REPORT',
        ownerId: 'user-1',
      });

      const retrieved = service.getDocument(created.id);
      expect(retrieved.id).toBe(created.id);
    });

    it('should throw NotFoundException for invalid document', () => {
      expect(() => service.getDocument('invalid-id')).toThrow(NotFoundException);
    });

    it('should get all documents', () => {
      service.createDocument({
        title: 'Doc 1',
        titleRo: 'Doc 1 RO',
        type: 'INVOICE',
        ownerId: 'user-1',
      });
      service.createDocument({
        title: 'Doc 2',
        titleRo: 'Doc 2 RO',
        type: 'CONTRACT',
        ownerId: 'user-2',
      });

      const all = service.getAllDocuments();
      expect(all.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter documents by owner', () => {
      service.createDocument({
        title: 'Owner Doc',
        titleRo: 'Doc Proprietar',
        type: 'INVOICE',
        ownerId: 'filter-owner-1',
      });

      const filtered = service.getAllDocuments({ ownerId: 'filter-owner-1' });
      expect(filtered.every(d => d.ownerId === 'filter-owner-1')).toBe(true);
    });

    it('should filter documents by tenant', () => {
      service.createDocument({
        title: 'Tenant Doc',
        titleRo: 'Doc Tenant',
        type: 'REPORT',
        ownerId: 'user-1',
        tenantId: 'filter-tenant-1',
      });

      const filtered = service.getAllDocuments({ tenantId: 'filter-tenant-1' });
      expect(filtered.every(d => d.tenantId === 'filter-tenant-1')).toBe(true);
    });

    it('should filter documents by type', () => {
      service.createDocument({
        title: 'Spreadsheet',
        titleRo: 'Tabel',
        type: 'SPREADSHEET',
        ownerId: 'user-1',
      });

      const filtered = service.getAllDocuments({ type: 'SPREADSHEET' });
      expect(filtered.every(d => d.type === 'SPREADSHEET')).toBe(true);
    });

    it('should update a document', () => {
      const doc = service.createDocument({
        title: 'Original',
        titleRo: 'Original RO',
        type: 'NOTE',
        ownerId: 'user-1',
      });

      const updated = service.updateDocument(doc.id, {
        title: 'Updated Title',
        content: 'New content',
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.content).toBe('New content');
      expect(updated.id).toBe(doc.id);
    });

    it('should delete a document', () => {
      const doc = service.createDocument({
        title: 'To Delete',
        titleRo: 'De Șters',
        type: 'TEMPLATE',
        ownerId: 'user-1',
      });

      service.deleteDocument(doc.id);
      expect(() => service.getDocument(doc.id)).toThrow(NotFoundException);
    });

    it('should throw NotFoundException when deleting non-existent document', () => {
      expect(() => service.deleteDocument('non-existent')).toThrow(NotFoundException);
    });
  });

  describe('Collaboration - Join/Leave', () => {
    let documentId: string;

    beforeEach(() => {
      const doc = service.createDocument({
        title: 'Collab Doc',
        titleRo: 'Document Colaborare',
        type: 'INVOICE',
        ownerId: 'owner-1',
      });
      documentId = doc.id;
    });

    it('should allow owner to join document', () => {
      const collaborator = service.joinDocument(documentId, 'owner-1', 'Owner Name');

      expect(collaborator.userId).toBe('owner-1');
      expect(collaborator.userName).toBe('Owner Name');
      expect(collaborator.permissionLevel).toBe('ADMIN');
      expect(collaborator.color).toBeDefined();
    });

    it('should allow user with permission to join', () => {
      service.grantPermission(documentId, 'editor-1', 'EDIT', 'owner-1');
      const collaborator = service.joinDocument(documentId, 'editor-1', 'Editor');

      expect(collaborator.userId).toBe('editor-1');
      expect(collaborator.permissionLevel).toBe('EDIT');
    });

    it('should throw ForbiddenException for unauthorized user', () => {
      expect(() => service.joinDocument(documentId, 'random-user', 'Random')).toThrow(ForbiddenException);
    });

    it('should return existing collaborator on rejoin', () => {
      service.joinDocument(documentId, 'owner-1', 'Owner');
      const rejoin = service.joinDocument(documentId, 'owner-1', 'Owner');

      expect(rejoin.userId).toBe('owner-1');
    });

    it('should leave document', () => {
      service.joinDocument(documentId, 'owner-1', 'Owner');
      service.leaveDocument(documentId, 'owner-1');

      const collaborators = service.getActiveCollaborators(documentId);
      expect(collaborators.find(c => c.userId === 'owner-1')).toBeUndefined();
    });

    it('should get active collaborators', () => {
      service.joinDocument(documentId, 'owner-1', 'Owner');
      service.grantPermission(documentId, 'viewer-1', 'VIEW', 'owner-1');
      service.joinDocument(documentId, 'viewer-1', 'Viewer');

      const collaborators = service.getActiveCollaborators(documentId);
      expect(collaborators.length).toBe(2);
    });

    it('should assign different colors to collaborators', () => {
      service.joinDocument(documentId, 'owner-1', 'Owner');
      service.grantPermission(documentId, 'user-2', 'EDIT', 'owner-1');
      service.joinDocument(documentId, 'user-2', 'User 2');

      const collaborators = service.getActiveCollaborators(documentId);
      const colors = collaborators.map(c => c.color);
      expect(colors[0]).not.toBe(colors[1]);
    });
  });

  describe('Permissions', () => {
    let documentId: string;

    beforeEach(() => {
      const doc = service.createDocument({
        title: 'Permission Doc',
        titleRo: 'Document Permisiuni',
        type: 'CONTRACT',
        ownerId: 'owner-1',
      });
      documentId = doc.id;
    });

    it('should grant permission', () => {
      const permission = service.grantPermission(documentId, 'editor-1', 'EDIT', 'owner-1');

      expect(permission.userId).toBe('editor-1');
      expect(permission.level).toBe('EDIT');
      expect(permission.grantedBy).toBe('owner-1');
    });

    it('should grant permission with expiration', () => {
      const expiresAt = new Date(Date.now() + 86400000);
      const permission = service.grantPermission(documentId, 'temp-user', 'VIEW', 'owner-1', expiresAt);

      expect(permission.expiresAt).toEqual(expiresAt);
    });

    it('should throw ForbiddenException for non-admin granting permission', () => {
      service.grantPermission(documentId, 'editor-1', 'EDIT', 'owner-1');
      service.joinDocument(documentId, 'editor-1', 'Editor');

      expect(() => service.grantPermission(documentId, 'another-user', 'VIEW', 'editor-1')).toThrow(ForbiddenException);
    });

    it('should revoke permission', () => {
      service.grantPermission(documentId, 'revoke-user', 'EDIT', 'owner-1');
      service.revokePermission(documentId, 'revoke-user', 'owner-1');

      const doc = service.getDocument(documentId);
      expect(doc.permissions.find(p => p.userId === 'revoke-user')).toBeUndefined();
    });

    it('should throw BadRequestException when revoking owner permission', () => {
      expect(() => service.revokePermission(documentId, 'owner-1', 'owner-1')).toThrow(BadRequestException);
    });

    it('should update permission level on re-grant', () => {
      service.grantPermission(documentId, 'user-1', 'VIEW', 'owner-1');
      service.grantPermission(documentId, 'user-1', 'ADMIN', 'owner-1');

      const doc = service.getDocument(documentId);
      const permission = doc.permissions.find(p => p.userId === 'user-1');
      expect(permission?.level).toBe('ADMIN');
    });
  });

  describe('Operations (OT)', () => {
    let documentId: string;

    beforeEach(() => {
      const doc = service.createDocument({
        title: 'OT Doc',
        titleRo: 'Document OT',
        type: 'NOTE',
        ownerId: 'owner-1',
        content: 'Hello World',
      });
      documentId = doc.id;
      service.joinDocument(documentId, 'owner-1', 'Owner');
    });

    it('should apply INSERT operation', () => {
      const op = service.applyOperation({
        documentId,
        userId: 'owner-1',
        userName: 'Owner',
        type: 'INSERT',
        position: 5,
        content: ' Beautiful',
        version: 1,
      });

      expect(op.isApplied).toBe(true);
      const doc = service.getDocument(documentId);
      expect(doc.content).toBe('Hello Beautiful World');
    });

    it('should apply DELETE operation', () => {
      const op = service.applyOperation({
        documentId,
        userId: 'owner-1',
        userName: 'Owner',
        type: 'DELETE',
        position: 5,
        length: 6,
        version: 1,
      });

      expect(op.isApplied).toBe(true);
      const doc = service.getDocument(documentId);
      expect(doc.content).toBe('Hello');
    });

    it('should apply UPDATE operation', () => {
      const op = service.applyOperation({
        documentId,
        userId: 'owner-1',
        userName: 'Owner',
        type: 'UPDATE',
        position: 0,
        length: 5,
        content: 'Hi',
        version: 1,
      });

      expect(op.isApplied).toBe(true);
      const doc = service.getDocument(documentId);
      expect(doc.content).toBe('Hi World');
    });

    it('should increment document version after operation', () => {
      service.applyOperation({
        documentId,
        userId: 'owner-1',
        userName: 'Owner',
        type: 'INSERT',
        position: 0,
        content: 'Test ',
        version: 1,
      });

      const doc = service.getDocument(documentId);
      expect(doc.version).toBe(2);
    });

    it('should throw ForbiddenException for viewer applying operation', () => {
      service.grantPermission(documentId, 'viewer-1', 'VIEW', 'owner-1');
      service.joinDocument(documentId, 'viewer-1', 'Viewer');

      expect(() =>
        service.applyOperation({
          documentId,
          userId: 'viewer-1',
          userName: 'Viewer',
          type: 'INSERT',
          position: 0,
          content: 'X',
          version: 1,
        }),
      ).toThrow(ForbiddenException);
    });

    it('should get operations from version', () => {
      service.applyOperation({
        documentId,
        userId: 'owner-1',
        userName: 'Owner',
        type: 'INSERT',
        position: 0,
        content: 'A',
        version: 1,
      });
      service.applyOperation({
        documentId,
        userId: 'owner-1',
        userName: 'Owner',
        type: 'INSERT',
        position: 1,
        content: 'B',
        version: 2,
      });

      const ops = service.getOperations(documentId, 1);
      expect(ops.length).toBe(2);
    });

    it('should get all operations', () => {
      service.applyOperation({
        documentId,
        userId: 'owner-1',
        userName: 'Owner',
        type: 'INSERT',
        position: 0,
        content: 'X',
        version: 1,
      });

      const ops = service.getOperations(documentId);
      expect(ops.length).toBeGreaterThanOrEqual(1);
    });

    it('should throw when document is locked by another user', () => {
      service.lockDocument(documentId, 'owner-1');
      service.grantPermission(documentId, 'editor-1', 'EDIT', 'owner-1');
      service.joinDocument(documentId, 'editor-1', 'Editor');

      expect(() =>
        service.applyOperation({
          documentId,
          userId: 'editor-1',
          userName: 'Editor',
          type: 'INSERT',
          position: 0,
          content: 'X',
          version: 1,
        }),
      ).toThrow(ForbiddenException);
    });
  });

  describe('Cursor & Selection', () => {
    let documentId: string;

    beforeEach(() => {
      const doc = service.createDocument({
        title: 'Cursor Doc',
        titleRo: 'Document Cursor',
        type: 'NOTE',
        ownerId: 'owner-1',
      });
      documentId = doc.id;
      service.joinDocument(documentId, 'owner-1', 'Owner');
    });

    it('should update cursor position', () => {
      const cursor = { line: 5, column: 10, offset: 50 };
      service.updateCursor(documentId, 'owner-1', cursor);

      const collaborators = service.getActiveCollaborators(documentId);
      const collab = collaborators.find(c => c.userId === 'owner-1');
      expect(collab?.cursorPosition).toEqual(cursor);
    });

    it('should update selection', () => {
      const selection = {
        start: { line: 1, column: 0, offset: 0 },
        end: { line: 1, column: 10, offset: 10 },
      };
      service.updateSelection(documentId, 'owner-1', selection);

      const collaborators = service.getActiveCollaborators(documentId);
      const collab = collaborators.find(c => c.userId === 'owner-1');
      expect(collab?.selection).toEqual(selection);
    });

    it('should clear selection with null', () => {
      const selection = {
        start: { line: 1, column: 0, offset: 0 },
        end: { line: 1, column: 10, offset: 10 },
      };
      service.updateSelection(documentId, 'owner-1', selection);
      service.updateSelection(documentId, 'owner-1', null);

      const collaborators = service.getActiveCollaborators(documentId);
      const collab = collaborators.find(c => c.userId === 'owner-1');
      expect(collab?.selection).toBeUndefined();
    });
  });

  describe('Presence', () => {
    it('should update presence', () => {
      const presence = service.updatePresence('user-1', 'User One', 'ONLINE');

      expect(presence.userId).toBe('user-1');
      expect(presence.userName).toBe('User One');
      expect(presence.status).toBe('ONLINE');
      expect(presence.color).toBeDefined();
    });

    it('should update presence with document and avatar', () => {
      const presence = service.updatePresence('user-1', 'User', 'BUSY', 'doc-123', '#FF0000', 'avatar.png');

      expect(presence.currentDocumentId).toBe('doc-123');
      expect(presence.color).toBe('#FF0000');
      expect(presence.userAvatar).toBe('avatar.png');
    });

    it('should get presence by user', () => {
      service.updatePresence('lookup-user', 'Lookup', 'ONLINE');
      const presence = service.getPresence('lookup-user');

      expect(presence?.userId).toBe('lookup-user');
    });

    it('should return undefined for unknown user', () => {
      const presence = service.getPresence('unknown-user');
      expect(presence).toBeUndefined();
    });

    it('should get all presence', () => {
      service.updatePresence('presence-1', 'P1', 'ONLINE');
      service.updatePresence('presence-2', 'P2', 'AWAY');

      const all = service.getAllPresence();
      expect(all.length).toBeGreaterThanOrEqual(2);
    });

    it('should get online users only', () => {
      service.updatePresence('online-user', 'Online', 'ONLINE');
      service.updatePresence('offline-user', 'Offline', 'OFFLINE');

      const online = service.getOnlineUsers();
      expect(online.every(p => p.status !== 'OFFLINE')).toBe(true);
    });

    it('should preserve color on status update', () => {
      service.updatePresence('color-user', 'Color', 'ONLINE', undefined, '#123456');
      service.updatePresence('color-user', 'Color', 'AWAY');

      const presence = service.getPresence('color-user');
      expect(presence?.color).toBe('#123456');
    });
  });

  describe('Comments', () => {
    let documentId: string;

    beforeEach(() => {
      const doc = service.createDocument({
        title: 'Comment Doc',
        titleRo: 'Document Comentarii',
        type: 'CONTRACT',
        ownerId: 'owner-1',
      });
      documentId = doc.id;
    });

    it('should add a comment', () => {
      const comment = service.addComment({
        documentId,
        userId: 'user-1',
        userName: 'User One',
        content: 'This is a comment',
      });

      expect(comment.id).toContain('comment-');
      expect(comment.content).toBe('This is a comment');
      expect(comment.isResolved).toBe(false);
    });

    it('should add comment with position', () => {
      const comment = service.addComment({
        documentId,
        userId: 'user-1',
        userName: 'User',
        content: 'Position comment',
        position: { start: 10, end: 20 },
      });

      expect(comment.position).toEqual({ start: 10, end: 20 });
    });

    it('should add reply to comment', () => {
      const parent = service.addComment({
        documentId,
        userId: 'user-1',
        userName: 'User',
        content: 'Parent comment',
      });

      const reply = service.addComment({
        documentId,
        userId: 'user-2',
        userName: 'User 2',
        content: 'Reply comment',
        parentId: parent.id,
      });

      expect(reply.parentId).toBe(parent.id);
    });

    it('should get all comments', () => {
      service.addComment({
        documentId,
        userId: 'user-1',
        userName: 'User',
        content: 'Comment 1',
      });
      service.addComment({
        documentId,
        userId: 'user-2',
        userName: 'User 2',
        content: 'Comment 2',
      });

      const comments = service.getComments(documentId);
      expect(comments.length).toBe(2);
    });

    it('should resolve comment', () => {
      const comment = service.addComment({
        documentId,
        userId: 'user-1',
        userName: 'User',
        content: 'To resolve',
      });

      const resolved = service.resolveComment(comment.id, documentId, 'resolver-1');

      expect(resolved.isResolved).toBe(true);
      expect(resolved.resolvedBy).toBe('resolver-1');
      expect(resolved.resolvedAt).toBeInstanceOf(Date);
    });

    it('should throw when resolving non-existent comment', () => {
      expect(() => service.resolveComment('fake-id', documentId, 'user-1')).toThrow(NotFoundException);
    });

    it('should delete comment', () => {
      const comment = service.addComment({
        documentId,
        userId: 'user-1',
        userName: 'User',
        content: 'To delete',
      });

      service.deleteComment(comment.id, documentId);

      const comments = service.getComments(documentId);
      expect(comments.find(c => c.id === comment.id)).toBeUndefined();
    });
  });

  describe('Document Locking', () => {
    let documentId: string;

    beforeEach(() => {
      const doc = service.createDocument({
        title: 'Lock Doc',
        titleRo: 'Document Blocare',
        type: 'INVOICE',
        ownerId: 'owner-1',
      });
      documentId = doc.id;
    });

    it('should lock document', () => {
      const locked = service.lockDocument(documentId, 'owner-1');

      expect(locked.isLocked).toBe(true);
      expect(locked.lockedBy).toBe('owner-1');
      expect(locked.lockedAt).toBeInstanceOf(Date);
    });

    it('should allow same user to re-lock', () => {
      service.lockDocument(documentId, 'owner-1');
      const reLocked = service.lockDocument(documentId, 'owner-1');

      expect(reLocked.isLocked).toBe(true);
    });

    it('should throw when another user tries to lock', () => {
      service.lockDocument(documentId, 'owner-1');

      expect(() => service.lockDocument(documentId, 'other-user')).toThrow(ForbiddenException);
    });

    it('should unlock document', () => {
      service.lockDocument(documentId, 'owner-1');
      const unlocked = service.unlockDocument(documentId, 'owner-1');

      expect(unlocked.isLocked).toBe(false);
      expect(unlocked.lockedBy).toBeUndefined();
    });

    it('should allow owner to unlock others lock', () => {
      service.grantPermission(documentId, 'editor-1', 'EDIT', 'owner-1');
      service.lockDocument(documentId, 'editor-1');

      const unlocked = service.unlockDocument(documentId, 'owner-1');
      expect(unlocked.isLocked).toBe(false);
    });

    it('should throw when non-locker non-owner tries to unlock', () => {
      service.lockDocument(documentId, 'owner-1');
      service.grantPermission(documentId, 'other-user', 'EDIT', 'owner-1');

      expect(() => service.unlockDocument(documentId, 'other-user')).toThrow(ForbiddenException);
    });
  });

  describe('Version History', () => {
    let documentId: string;

    beforeEach(() => {
      const doc = service.createDocument({
        title: 'Version Doc',
        titleRo: 'Document Versiuni',
        type: 'REPORT',
        ownerId: 'owner-1',
        content: 'Version 1 content',
      });
      documentId = doc.id;
    });

    it('should create version snapshot', () => {
      const version = service.createVersionSnapshot(documentId, 'owner-1');

      expect(version.version).toBe(1);
      expect(version.content).toBe('Version 1 content');
      expect(version.editedBy).toBe('owner-1');
    });

    it('should get version history', () => {
      service.createVersionSnapshot(documentId, 'owner-1');

      const history = service.getVersionHistory(documentId);
      expect(history.length).toBeGreaterThanOrEqual(1);
    });

    it('should have initial version in history', () => {
      const history = service.getVersionHistory(documentId);
      expect(history.find(v => v.changesSummary === 'Document created')).toBeDefined();
    });

    it('should restore version', () => {
      service.joinDocument(documentId, 'owner-1', 'Owner');

      service.applyOperation({
        documentId,
        userId: 'owner-1',
        userName: 'Owner',
        type: 'UPDATE',
        position: 0,
        length: 17,
        content: 'Modified content',
        version: 1,
      });

      const restored = service.restoreVersion(documentId, 1, 'owner-1');

      expect(restored.content).toBe('Version 1 content');
    });

    it('should throw when restoring non-existent version', () => {
      expect(() => service.restoreVersion(documentId, 999, 'owner-1')).toThrow(NotFoundException);
    });

    it('should increment version after restore', () => {
      const doc = service.getDocument(documentId);
      const versionBefore = doc.version;

      service.restoreVersion(documentId, 1, 'owner-1');

      const restored = service.getDocument(documentId);
      expect(restored.version).toBe(versionBefore + 1);
    });
  });

  describe('Sessions', () => {
    let documentId: string;

    beforeEach(() => {
      const doc = service.createDocument({
        title: 'Session Doc',
        titleRo: 'Document Sesiune',
        type: 'SPREADSHEET',
        ownerId: 'owner-1',
      });
      documentId = doc.id;
      service.joinDocument(documentId, 'owner-1', 'Owner');
    });

    it('should start session', () => {
      const session = service.startSession(documentId);

      expect(session.id).toContain('session-');
      expect(session.documentId).toBe(documentId);
      expect(session.participants).toContain('owner-1');
      expect(session.operationsCount).toBe(0);
    });

    it('should end session', () => {
      const session = service.startSession(documentId);
      const ended = service.endSession(session.id);

      expect(ended.endedAt).toBeInstanceOf(Date);
    });

    it('should get session', () => {
      const session = service.startSession(documentId);
      const retrieved = service.getSession(session.id);

      expect(retrieved?.id).toBe(session.id);
    });

    it('should return undefined for non-existent session', () => {
      const session = service.getSession('fake-session');
      expect(session).toBeUndefined();
    });

    it('should throw when ending non-existent session', () => {
      expect(() => service.endSession('fake-session')).toThrow(NotFoundException);
    });

    it('should track operations count in session', () => {
      const session = service.startSession(documentId);

      service.applyOperation({
        documentId,
        userId: 'owner-1',
        userName: 'Owner',
        type: 'INSERT',
        position: 0,
        content: 'Test',
        version: 1,
      });

      const ended = service.endSession(session.id);
      expect(ended.operationsCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Conflicts', () => {
    let documentId: string;

    beforeEach(() => {
      const doc = service.createDocument({
        title: 'Conflict Doc',
        titleRo: 'Document Conflict',
        type: 'NOTE',
        ownerId: 'owner-1',
        content: 'Original',
      });
      documentId = doc.id;
    });

    it('should get conflicts (empty initially)', () => {
      const conflicts = service.getConflicts(documentId);
      expect(Array.isArray(conflicts)).toBe(true);
    });

    it('should return empty array for unknown document', () => {
      const conflicts = service.getConflicts('unknown-doc');
      expect(conflicts).toEqual([]);
    });
  });

  describe('Statistics', () => {
    let documentId: string;

    beforeEach(() => {
      const doc = service.createDocument({
        title: 'Stats Doc',
        titleRo: 'Document Statistici',
        type: 'REPORT',
        ownerId: 'owner-1',
        content: 'Stats content',
      });
      documentId = doc.id;
      service.joinDocument(documentId, 'owner-1', 'Owner');
    });

    it('should get collaboration stats', () => {
      const stats = service.getCollaborationStats(documentId);

      expect(stats).toHaveProperty('totalOperations');
      expect(stats).toHaveProperty('totalComments');
      expect(stats).toHaveProperty('totalVersions');
      expect(stats).toHaveProperty('totalConflicts');
      expect(stats).toHaveProperty('activeCollaborators');
      expect(stats).toHaveProperty('averageSessionDuration');
    });

    it('should count operations', () => {
      service.applyOperation({
        documentId,
        userId: 'owner-1',
        userName: 'Owner',
        type: 'INSERT',
        position: 0,
        content: 'X',
        version: 1,
      });

      const stats = service.getCollaborationStats(documentId);
      expect(stats.totalOperations).toBeGreaterThanOrEqual(1);
    });

    it('should count comments', () => {
      service.addComment({
        documentId,
        userId: 'owner-1',
        userName: 'Owner',
        content: 'Comment',
      });

      const stats = service.getCollaborationStats(documentId);
      expect(stats.totalComments).toBeGreaterThanOrEqual(1);
    });

    it('should count collaborators', () => {
      service.grantPermission(documentId, 'user-2', 'EDIT', 'owner-1');
      service.joinDocument(documentId, 'user-2', 'User 2');

      const stats = service.getCollaborationStats(documentId);
      expect(stats.activeCollaborators).toBe(2);
    });

    it('should calculate average session duration', () => {
      const session = service.startSession(documentId);
      service.endSession(session.id);

      const stats = service.getCollaborationStats(documentId);
      expect(typeof stats.averageSessionDuration).toBe('number');
    });

    it('should count nested comments (replies)', () => {
      const parent = service.addComment({
        documentId,
        userId: 'user-1',
        userName: 'User',
        content: 'Parent',
      });
      service.addComment({
        documentId,
        userId: 'user-2',
        userName: 'User 2',
        content: 'Reply',
        parentId: parent.id,
      });

      const stats = service.getCollaborationStats(documentId);
      expect(stats.totalComments).toBe(2);
    });
  });

  describe('Document Types', () => {
    const documentTypes: DocumentType[] = ['INVOICE', 'CONTRACT', 'REPORT', 'SPREADSHEET', 'PRESENTATION', 'NOTE', 'TEMPLATE'];

    documentTypes.forEach((type) => {
      it(`should create ${type} document`, () => {
        const doc = service.createDocument({
          title: `${type} Doc`,
          titleRo: `Document ${type}`,
          type,
          ownerId: 'user-1',
        });

        expect(doc.type).toBe(type);
      });
    });
  });

  describe('Permission Levels', () => {
    const levels: PermissionLevel[] = ['VIEW', 'COMMENT', 'EDIT', 'ADMIN'];
    let documentId: string;

    beforeEach(() => {
      const doc = service.createDocument({
        title: 'Permission Test',
        titleRo: 'Test Permisiuni',
        type: 'NOTE',
        ownerId: 'owner-1',
      });
      documentId = doc.id;
    });

    levels.forEach((level) => {
      it(`should grant ${level} permission`, () => {
        const permission = service.grantPermission(documentId, `user-${level}`, level, 'owner-1');
        expect(permission.level).toBe(level);
      });
    });
  });

  describe('Presence Statuses', () => {
    const statuses: PresenceStatus[] = ['ONLINE', 'AWAY', 'BUSY', 'OFFLINE'];

    statuses.forEach((status) => {
      it(`should set ${status} presence`, () => {
        const presence = service.updatePresence(`user-${status}`, 'User', status);
        expect(presence.status).toBe(status);
      });
    });
  });

  describe('Event Emission', () => {
    let emitSpy: jest.SpyInstance;

    beforeEach(() => {
      emitSpy = jest.spyOn(eventEmitter, 'emit');
    });

    afterEach(() => {
      emitSpy.mockRestore();
    });

    it('should emit document created event', () => {
      service.createDocument({
        title: 'Event Doc',
        titleRo: 'Document Eveniment',
        type: 'NOTE',
        ownerId: 'owner-1',
      });

      expect(emitSpy).toHaveBeenCalledWith('collaboration.document.created', expect.any(Object));
    });

    it('should emit document updated event', () => {
      const doc = service.createDocument({
        title: 'Event Doc',
        titleRo: 'Document Eveniment',
        type: 'NOTE',
        ownerId: 'owner-1',
      });

      service.updateDocument(doc.id, { title: 'Updated' });

      expect(emitSpy).toHaveBeenCalledWith('collaboration.document.updated', expect.any(Object));
    });

    it('should emit user joined event', () => {
      const doc = service.createDocument({
        title: 'Event Doc',
        titleRo: 'Document Eveniment',
        type: 'NOTE',
        ownerId: 'owner-1',
      });

      service.joinDocument(doc.id, 'owner-1', 'Owner');

      expect(emitSpy).toHaveBeenCalledWith('collaboration.user.joined', expect.any(Object));
    });

    it('should emit permission granted event', () => {
      const doc = service.createDocument({
        title: 'Event Doc',
        titleRo: 'Document Eveniment',
        type: 'NOTE',
        ownerId: 'owner-1',
      });

      service.grantPermission(doc.id, 'user-1', 'EDIT', 'owner-1');

      expect(emitSpy).toHaveBeenCalledWith('collaboration.permission.granted', expect.any(Object));
    });
  });

  describe('Filter by Collaborator', () => {
    it('should filter documents by collaborator ID', () => {
      const doc1 = service.createDocument({
        title: 'Collab Filter 1',
        titleRo: 'Filtru Colaborator 1',
        type: 'NOTE',
        ownerId: 'owner-1',
      });
      service.grantPermission(doc1.id, 'collab-filter-user', 'EDIT', 'owner-1');
      service.joinDocument(doc1.id, 'collab-filter-user', 'Collab User');

      service.createDocument({
        title: 'Collab Filter 2',
        titleRo: 'Filtru Colaborator 2',
        type: 'NOTE',
        ownerId: 'other-owner',
      });

      const filtered = service.getAllDocuments({ collaboratorId: 'collab-filter-user' });
      expect(filtered.some(d => d.id === doc1.id)).toBe(true);
    });

    it('should include owned documents in collaborator filter', () => {
      service.createDocument({
        title: 'Owned Doc',
        titleRo: 'Document Propriu',
        type: 'REPORT',
        ownerId: 'collab-owner-1',
      });

      const filtered = service.getAllDocuments({ collaboratorId: 'collab-owner-1' });
      expect(filtered.length).toBeGreaterThanOrEqual(1);
    });
  });
});
