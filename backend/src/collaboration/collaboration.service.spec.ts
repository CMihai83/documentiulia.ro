import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ForbiddenException } from '@nestjs/common';
import {
  CollaborationService,
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
  SharePermission,
  Comment,
} from './collaboration.service';

describe('CollaborationService', () => {
  let service: CollaborationService;
  let eventEmitter: EventEmitter2;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollaborationService,
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<CollaborationService>(CollaborationService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    jest.clearAllMocks();
  });

  describe('Workspace Management', () => {
    const validWorkspaceParams = {
      tenantId: 'tenant-1',
      name: 'Finance Team',
      description: 'Workspace for finance department',
      createdBy: 'user-1',
      createdByName: 'Ion Popescu',
      createdByEmail: 'ion@company.ro',
    };

    describe('createWorkspace', () => {
      it('should create a workspace', async () => {
        const workspace = await service.createWorkspace(validWorkspaceParams);

        expect(workspace.id).toBeDefined();
        expect(workspace.tenantId).toBe('tenant-1');
        expect(workspace.name).toBe('Finance Team');
        expect(workspace.description).toBe('Workspace for finance department');
      });

      it('should add creator as owner', async () => {
        const workspace = await service.createWorkspace(validWorkspaceParams);

        expect(workspace.members.length).toBe(1);
        expect(workspace.members[0].userId).toBe('user-1');
        expect(workspace.members[0].role).toBe('owner');
        expect(workspace.members[0].name).toBe('Ion Popescu');
      });

      it('should use default settings', async () => {
        const workspace = await service.createWorkspace(validWorkspaceParams);

        expect(workspace.settings.allowGuestAccess).toBe(false);
        expect(workspace.settings.requireApprovalForSharing).toBe(false);
        expect(workspace.settings.defaultSharePermission).toBe('view');
        expect(workspace.settings.notifyOnActivity).toBe(true);
        expect(workspace.settings.retentionDays).toBe(365);
      });

      it('should accept custom settings', async () => {
        const workspace = await service.createWorkspace({
          ...validWorkspaceParams,
          settings: {
            allowGuestAccess: true,
            requireApprovalForSharing: true,
          },
        });

        expect(workspace.settings.allowGuestAccess).toBe(true);
        expect(workspace.settings.requireApprovalForSharing).toBe(true);
      });

      it('should create activity for workspace creation', async () => {
        const workspace = await service.createWorkspace(validWorkspaceParams);

        const activities = await service.getActivityFeed(workspace.id);
        expect(activities.length).toBe(1);
        expect(activities[0].type).toBe('workspace_created');
      });
    });

    describe('getWorkspace', () => {
      it('should return workspace by ID', async () => {
        const created = await service.createWorkspace(validWorkspaceParams);

        const workspace = await service.getWorkspace(created.id);

        expect(workspace).toBeDefined();
        expect(workspace?.id).toBe(created.id);
      });

      it('should return null for non-existent workspace', async () => {
        const workspace = await service.getWorkspace('invalid-id');

        expect(workspace).toBeNull();
      });
    });

    describe('getWorkspaces', () => {
      beforeEach(async () => {
        await service.createWorkspace({
          ...validWorkspaceParams,
          name: 'Workspace 1',
        });

        await new Promise(resolve => setTimeout(resolve, 5));

        await service.createWorkspace({
          ...validWorkspaceParams,
          name: 'Workspace 2',
        });

        await service.createWorkspace({
          ...validWorkspaceParams,
          tenantId: 'tenant-2',
          name: 'Other Tenant',
        });
      });

      it('should return workspaces for tenant', async () => {
        const workspaces = await service.getWorkspaces('tenant-1');

        expect(workspaces.length).toBe(2);
        expect(workspaces.every(w => w.tenantId === 'tenant-1')).toBe(true);
      });

      it('should sort by createdAt descending', async () => {
        const workspaces = await service.getWorkspaces('tenant-1');

        expect(workspaces[0].name).toBe('Workspace 2');
        expect(workspaces[1].name).toBe('Workspace 1');
      });

      it('should filter by user membership', async () => {
        const workspaces = await service.getWorkspaces('tenant-1', 'user-1');

        expect(workspaces.length).toBe(2);
        workspaces.forEach(w => {
          expect(w.members.some(m => m.userId === 'user-1')).toBe(true);
        });
      });
    });

    describe('updateWorkspace', () => {
      let workspace: Workspace;

      beforeEach(async () => {
        workspace = await service.createWorkspace(validWorkspaceParams);
      });

      it('should update name', async () => {
        const updated = await service.updateWorkspace(workspace.id, {
          name: 'Updated Name',
        });

        expect(updated?.name).toBe('Updated Name');
      });

      it('should update description', async () => {
        const updated = await service.updateWorkspace(workspace.id, {
          description: 'New description',
        });

        expect(updated?.description).toBe('New description');
      });

      it('should update settings', async () => {
        const updated = await service.updateWorkspace(workspace.id, {
          settings: { ...workspace.settings, allowGuestAccess: true },
        });

        expect(updated?.settings.allowGuestAccess).toBe(true);
      });

      it('should return null for non-existent workspace', async () => {
        const updated = await service.updateWorkspace('invalid-id', { name: 'Test' });

        expect(updated).toBeNull();
      });
    });

    describe('deleteWorkspace', () => {
      it('should delete workspace', async () => {
        const workspace = await service.createWorkspace(validWorkspaceParams);

        const result = await service.deleteWorkspace(workspace.id);

        expect(result).toBe(true);
        expect(await service.getWorkspace(workspace.id)).toBeNull();
      });
    });
  });

  describe('Workspace Members', () => {
    let workspace: Workspace;

    beforeEach(async () => {
      workspace = await service.createWorkspace({
        tenantId: 'tenant-1',
        name: 'Test Workspace',
        createdBy: 'owner-1',
        createdByName: 'Owner',
        createdByEmail: 'owner@company.ro',
      });
    });

    describe('addMember', () => {
      const newMemberParams = {
        workspaceId: '',
        userId: 'user-2',
        email: 'maria@company.ro',
        name: 'Maria Ionescu',
        role: 'editor' as WorkspaceRole,
        addedBy: 'owner-1',
        addedByName: 'Owner',
      };

      it('should add new member', async () => {
        const member = await service.addMember({
          ...newMemberParams,
          workspaceId: workspace.id,
        });

        expect(member).toBeDefined();
        expect(member?.userId).toBe('user-2');
        expect(member?.role).toBe('editor');
        expect(member?.name).toBe('Maria Ionescu');
      });

      it('should return existing member if already added', async () => {
        await service.addMember({
          ...newMemberParams,
          workspaceId: workspace.id,
        });

        const duplicate = await service.addMember({
          ...newMemberParams,
          workspaceId: workspace.id,
          role: 'viewer',
        });

        expect(duplicate?.role).toBe('editor'); // Original role preserved
      });

      it('should create activity for member addition', async () => {
        await service.addMember({
          ...newMemberParams,
          workspaceId: workspace.id,
        });

        const activities = await service.getActivityFeed(workspace.id);
        const memberAddedActivity = activities.find(a => a.type === 'member_added');
        expect(memberAddedActivity).toBeDefined();
        expect(memberAddedActivity?.metadata?.role).toBe('editor');
      });

      it('should return null for non-existent workspace', async () => {
        const member = await service.addMember({
          ...newMemberParams,
          workspaceId: 'invalid-id',
        });

        expect(member).toBeNull();
      });
    });

    describe('removeMember', () => {
      beforeEach(async () => {
        await service.addMember({
          workspaceId: workspace.id,
          userId: 'user-2',
          email: 'maria@company.ro',
          name: 'Maria Ionescu',
          role: 'editor',
          addedBy: 'owner-1',
          addedByName: 'Owner',
        });
      });

      it('should remove member', async () => {
        const result = await service.removeMember(
          workspace.id,
          'user-2',
          'owner-1',
          'Owner',
        );

        expect(result).toBe(true);

        const updated = await service.getWorkspace(workspace.id);
        expect(updated?.members.find(m => m.userId === 'user-2')).toBeUndefined();
      });

      it('should create activity for member removal', async () => {
        await service.removeMember(
          workspace.id,
          'user-2',
          'owner-1',
          'Owner',
        );

        const activities = await service.getActivityFeed(workspace.id);
        const removeActivity = activities.find(a => a.type === 'member_removed');
        expect(removeActivity).toBeDefined();
      });

      it('should return false for non-existent workspace', async () => {
        const result = await service.removeMember(
          'invalid-id',
          'user-2',
          'owner-1',
          'Owner',
        );

        expect(result).toBe(false);
      });

      it('should return false for non-existent member', async () => {
        const result = await service.removeMember(
          workspace.id,
          'non-existent',
          'owner-1',
          'Owner',
        );

        expect(result).toBe(false);
      });
    });

    describe('updateMemberRole', () => {
      beforeEach(async () => {
        await service.addMember({
          workspaceId: workspace.id,
          userId: 'user-2',
          email: 'maria@company.ro',
          name: 'Maria Ionescu',
          role: 'editor',
          addedBy: 'owner-1',
          addedByName: 'Owner',
        });
      });

      it('should update member role', async () => {
        const member = await service.updateMemberRole(
          workspace.id,
          'user-2',
          'admin',
        );

        expect(member?.role).toBe('admin');
      });

      it('should return null for non-existent workspace', async () => {
        const member = await service.updateMemberRole(
          'invalid-id',
          'user-2',
          'admin',
        );

        expect(member).toBeNull();
      });

      it('should return null for non-existent member', async () => {
        const member = await service.updateMemberRole(
          workspace.id,
          'non-existent',
          'admin',
        );

        expect(member).toBeNull();
      });
    });
  });

  describe('Document Sharing', () => {
    let workspace: Workspace;

    beforeEach(async () => {
      workspace = await service.createWorkspace({
        tenantId: 'tenant-1',
        name: 'Test Workspace',
        createdBy: 'user-1',
        createdByName: 'Ion Popescu',
        createdByEmail: 'ion@company.ro',
      });
    });

    const shareParams = {
      workspaceId: '',
      tenantId: 'tenant-1',
      documentId: 'doc-123',
      documentType: 'invoice' as const,
      documentName: 'Factura 001/2025',
      sharedBy: 'user-1',
      sharedByName: 'Ion Popescu',
      recipients: [
        { type: 'user' as const, value: 'user-2', permission: 'view' as SharePermission, notified: false },
        { type: 'email' as const, value: 'external@partner.ro', permission: 'view' as SharePermission, notified: false },
      ],
      permission: 'view' as SharePermission,
    };

    describe('shareDocument', () => {
      it('should share document', async () => {
        const shared = await service.shareDocument({
          ...shareParams,
          workspaceId: workspace.id,
        });

        expect(shared.id).toBeDefined();
        expect(shared.documentId).toBe('doc-123');
        expect(shared.documentName).toBe('Factura 001/2025');
        expect(shared.permission).toBe('view');
      });

      it('should store recipients', async () => {
        const shared = await service.shareDocument({
          ...shareParams,
          workspaceId: workspace.id,
        });

        expect(shared.sharedWith.length).toBe(2);
        expect(shared.sharedWith[0].type).toBe('user');
        expect(shared.sharedWith[1].type).toBe('email');
      });

      it('should initialize access count', async () => {
        const shared = await service.shareDocument({
          ...shareParams,
          workspaceId: workspace.id,
        });

        expect(shared.accessCount).toBe(0);
      });

      it('should support expiration date', async () => {
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const shared = await service.shareDocument({
          ...shareParams,
          workspaceId: workspace.id,
          expiresAt,
        });

        expect(shared.expiresAt).toEqual(expiresAt);
      });

      it('should support password protection', async () => {
        const shared = await service.shareDocument({
          ...shareParams,
          workspaceId: workspace.id,
          password: 'securepass123',
        });

        expect(shared.password).toBe('securepass123');
      });

      it('should create activity for document sharing', async () => {
        await service.shareDocument({
          ...shareParams,
          workspaceId: workspace.id,
        });

        const activities = await service.getActivityFeed(workspace.id);
        const shareActivity = activities.find(a => a.type === 'document_shared');
        expect(shareActivity).toBeDefined();
        expect(shareActivity?.metadata?.recipients).toBe(2);
      });
    });

    describe('getSharedDocuments', () => {
      beforeEach(async () => {
        await service.shareDocument({
          ...shareParams,
          workspaceId: workspace.id,
          documentId: 'doc-1',
          documentType: 'invoice',
        });

        await new Promise(resolve => setTimeout(resolve, 5));

        await service.shareDocument({
          ...shareParams,
          workspaceId: workspace.id,
          documentId: 'doc-2',
          documentType: 'contract',
        });
      });

      it('should return shared documents for workspace', async () => {
        const docs = await service.getSharedDocuments(workspace.id);

        expect(docs.length).toBe(2);
        expect(docs.every(d => d.workspaceId === workspace.id)).toBe(true);
      });

      it('should filter by document type', async () => {
        const invoices = await service.getSharedDocuments(workspace.id, {
          documentType: 'invoice',
        });

        expect(invoices.length).toBe(1);
        expect(invoices[0].documentType).toBe('invoice');
      });

      it('should filter by sharedBy', async () => {
        const docs = await service.getSharedDocuments(workspace.id, {
          sharedBy: 'user-1',
        });

        expect(docs.length).toBe(2);
      });

      it('should sort by createdAt descending', async () => {
        const docs = await service.getSharedDocuments(workspace.id);

        expect(docs[0].documentId).toBe('doc-2');
      });
    });

    describe('recordAccess', () => {
      it('should increment access count', async () => {
        const shared = await service.shareDocument({
          ...shareParams,
          workspaceId: workspace.id,
        });

        await service.recordAccess(shared.id);
        await service.recordAccess(shared.id);

        const updated = await service.getSharedDocument(shared.id);
        expect(updated?.accessCount).toBe(2);
        expect(updated?.lastAccessedAt).toBeDefined();
      });

      it('should record user access time', async () => {
        const shared = await service.shareDocument({
          ...shareParams,
          workspaceId: workspace.id,
        });

        await service.recordAccess(shared.id, 'user-2');

        const updated = await service.getSharedDocument(shared.id);
        const userRecipient = updated?.sharedWith.find(r => r.value === 'user-2');
        expect(userRecipient?.accessedAt).toBeDefined();
      });
    });

    describe('revokeShare', () => {
      it('should revoke share', async () => {
        const shared = await service.shareDocument({
          ...shareParams,
          workspaceId: workspace.id,
        });

        const result = await service.revokeShare(shared.id);

        expect(result).toBe(true);
        expect(await service.getSharedDocument(shared.id)).toBeNull();
      });
    });
  });

  describe('Comments', () => {
    let workspace: Workspace;

    beforeEach(async () => {
      workspace = await service.createWorkspace({
        tenantId: 'tenant-1',
        name: 'Test Workspace',
        createdBy: 'user-1',
        createdByName: 'Ion Popescu',
        createdByEmail: 'ion@company.ro',
      });
    });

    const commentParams = {
      workspaceId: '',
      tenantId: 'tenant-1',
      documentId: 'doc-123',
      authorId: 'user-1',
      authorName: 'Ion Popescu',
      content: 'Acest document necesită aprobare',
    };

    describe('addComment', () => {
      it('should add comment', async () => {
        const comment = await service.addComment({
          ...commentParams,
          workspaceId: workspace.id,
        });

        expect(comment.id).toBeDefined();
        expect(comment.content).toBe('Acest document necesită aprobare');
        expect(comment.authorName).toBe('Ion Popescu');
        expect(comment.status).toBe('active');
      });

      it('should support replies', async () => {
        const parent = await service.addComment({
          ...commentParams,
          workspaceId: workspace.id,
        });

        const reply = await service.addComment({
          ...commentParams,
          workspaceId: workspace.id,
          parentId: parent.id,
          content: 'Răspuns la comentariu',
        });

        expect(reply.parentId).toBe(parent.id);
      });

      it('should support mentions', async () => {
        const comment = await service.addComment({
          ...commentParams,
          workspaceId: workspace.id,
          mentions: ['user-2', 'user-3'],
        });

        expect(comment.mentions).toContain('user-2');
        expect(comment.mentions).toContain('user-3');
      });

      it('should emit comment.created event', async () => {
        await service.addComment({
          ...commentParams,
          workspaceId: workspace.id,
          mentions: ['user-2'],
        });

        expect(mockEventEmitter.emit).toHaveBeenCalledWith('comment.created', expect.objectContaining({
          mentions: ['user-2'],
        }));
      });

      it('should create activity for comment', async () => {
        await service.addComment({
          ...commentParams,
          workspaceId: workspace.id,
        });

        const activities = await service.getActivityFeed(workspace.id);
        const commentActivity = activities.find(a => a.type === 'comment_added');
        expect(commentActivity).toBeDefined();
      });
    });

    describe('getComments', () => {
      beforeEach(async () => {
        await service.addComment({
          ...commentParams,
          workspaceId: workspace.id,
          content: 'Comment 1',
        });

        await new Promise(resolve => setTimeout(resolve, 5));

        await service.addComment({
          ...commentParams,
          workspaceId: workspace.id,
          content: 'Comment 2',
        });
      });

      it('should return comments for document', async () => {
        const comments = await service.getComments('doc-123');

        expect(comments.length).toBe(2);
      });

      it('should filter by status', async () => {
        const comments = await service.getComments('doc-123', { status: 'active' });

        expect(comments.every(c => c.status === 'active')).toBe(true);
      });

      it('should sort by createdAt ascending', async () => {
        const comments = await service.getComments('doc-123');

        expect(comments[0].content).toBe('Comment 1');
        expect(comments[1].content).toBe('Comment 2');
      });
    });

    describe('updateComment', () => {
      it('should update comment content', async () => {
        const comment = await service.addComment({
          ...commentParams,
          workspaceId: workspace.id,
        });

        const updated = await service.updateComment(comment.id, 'Updated content');

        expect(updated?.content).toBe('Updated content');
        expect(updated?.editedAt).toBeDefined();
      });

      it('should return null for non-existent comment', async () => {
        const updated = await service.updateComment('invalid-id', 'Test');

        expect(updated).toBeNull();
      });
    });

    describe('resolveComment', () => {
      it('should resolve comment', async () => {
        const comment = await service.addComment({
          ...commentParams,
          workspaceId: workspace.id,
        });

        const resolved = await service.resolveComment(comment.id, 'user-2', 'Maria Ionescu');

        expect(resolved?.status).toBe('resolved');
        expect(resolved?.resolvedBy).toBe('user-2');
        expect(resolved?.resolvedAt).toBeDefined();
      });

      it('should create activity for resolution', async () => {
        const comment = await service.addComment({
          ...commentParams,
          workspaceId: workspace.id,
        });

        await service.resolveComment(comment.id, 'user-2', 'Maria Ionescu');

        const activities = await service.getActivityFeed(workspace.id);
        const resolveActivity = activities.find(a => a.type === 'comment_resolved');
        expect(resolveActivity).toBeDefined();
      });
    });

    describe('deleteComment', () => {
      it('should mark comment as deleted', async () => {
        const comment = await service.addComment({
          ...commentParams,
          workspaceId: workspace.id,
        });

        const result = await service.deleteComment(comment.id);

        expect(result).toBe(true);

        const comments = await service.getComments('doc-123', { status: 'deleted' });
        expect(comments.find(c => c.id === comment.id)).toBeDefined();
      });
    });

    describe('addReaction', () => {
      it('should add reaction', async () => {
        const comment = await service.addComment({
          ...commentParams,
          workspaceId: workspace.id,
        });

        const updated = await service.addReaction(comment.id, 'user-2', '👍');

        expect(updated?.reactions.length).toBe(1);
        expect(updated?.reactions[0].emoji).toBe('👍');
        expect(updated?.reactions[0].userId).toBe('user-2');
      });

      it('should toggle reaction off if same user/emoji', async () => {
        const comment = await service.addComment({
          ...commentParams,
          workspaceId: workspace.id,
        });

        await service.addReaction(comment.id, 'user-2', '👍');
        const updated = await service.addReaction(comment.id, 'user-2', '👍');

        expect(updated?.reactions.length).toBe(0);
      });

      it('should allow multiple different reactions', async () => {
        const comment = await service.addComment({
          ...commentParams,
          workspaceId: workspace.id,
        });

        await service.addReaction(comment.id, 'user-2', '👍');
        const updated = await service.addReaction(comment.id, 'user-2', '❤️');

        expect(updated?.reactions.length).toBe(2);
      });
    });
  });

  describe('Activity Feed', () => {
    let workspace: Workspace;

    beforeEach(async () => {
      workspace = await service.createWorkspace({
        tenantId: 'tenant-1',
        name: 'Test Workspace',
        createdBy: 'user-1',
        createdByName: 'Ion Popescu',
        createdByEmail: 'ion@company.ro',
      });
    });

    describe('getActivityFeed', () => {
      beforeEach(async () => {
        await service.addMember({
          workspaceId: workspace.id,
          userId: 'user-2',
          email: 'maria@company.ro',
          name: 'Maria Ionescu',
          role: 'editor',
          addedBy: 'user-1',
          addedByName: 'Ion Popescu',
        });

        await service.addComment({
          workspaceId: workspace.id,
          tenantId: 'tenant-1',
          documentId: 'doc-123',
          authorId: 'user-1',
          authorName: 'Ion Popescu',
          content: 'Test comment',
        });
      });

      it('should return activities for workspace', async () => {
        const activities = await service.getActivityFeed(workspace.id);

        expect(activities.length).toBeGreaterThan(0);
        expect(activities.every(a => a.workspaceId === workspace.id)).toBe(true);
      });

      it('should filter by type', async () => {
        const activities = await service.getActivityFeed(workspace.id, {
          type: 'member_added',
        });

        expect(activities.every(a => a.type === 'member_added')).toBe(true);
      });

      it('should filter by user', async () => {
        const activities = await service.getActivityFeed(workspace.id, {
          userId: 'user-1',
        });

        expect(activities.every(a => a.actorId === 'user-1')).toBe(true);
      });

      it('should limit results', async () => {
        const activities = await service.getActivityFeed(workspace.id, {
          limit: 1,
        });

        expect(activities.length).toBe(1);
      });

      it('should sort by createdAt descending', async () => {
        const activities = await service.getActivityFeed(workspace.id);

        for (let i = 1; i < activities.length; i++) {
          expect(activities[i - 1].createdAt.getTime()).toBeGreaterThanOrEqual(
            activities[i].createdAt.getTime()
          );
        }
      });
    });

    describe('markActivityAsRead', () => {
      it('should mark activity as read', async () => {
        const activities = await service.getActivityFeed(workspace.id);
        const activity = activities[0];

        await service.markActivityAsRead(activity.id, 'user-2');

        const updated = (await service.getActivityFeed(workspace.id)).find(a => a.id === activity.id);
        expect(updated?.readBy).toContain('user-2');
      });

      it('should not duplicate read markers', async () => {
        const activities = await service.getActivityFeed(workspace.id);
        const activity = activities[0];

        await service.markActivityAsRead(activity.id, 'user-1');
        await service.markActivityAsRead(activity.id, 'user-1');

        const updated = (await service.getActivityFeed(workspace.id)).find(a => a.id === activity.id);
        expect(updated?.readBy.filter(u => u === 'user-1').length).toBe(1);
      });
    });

    describe('getUnreadCount', () => {
      it('should return unread count', async () => {
        const count = await service.getUnreadCount(workspace.id, 'user-2');

        expect(count).toBeGreaterThan(0);
      });

      it('should exclude activities already read by user', async () => {
        const activities = await service.getActivityFeed(workspace.id);

        for (const activity of activities) {
          await service.markActivityAsRead(activity.id, 'user-2');
        }

        const count = await service.getUnreadCount(workspace.id, 'user-2');
        expect(count).toBe(0);
      });
    });
  });

  describe('Workspace Invitations', () => {
    let workspace: Workspace;

    beforeEach(async () => {
      workspace = await service.createWorkspace({
        tenantId: 'tenant-1',
        name: 'Test Workspace',
        createdBy: 'user-1',
        createdByName: 'Ion Popescu',
        createdByEmail: 'ion@company.ro',
      });
    });

    describe('createInvite', () => {
      it('should create invitation', async () => {
        const invite = await service.createInvite({
          workspaceId: workspace.id,
          email: 'new@company.ro',
          role: 'editor',
          invitedBy: 'user-1',
        });

        expect(invite.id).toBeDefined();
        expect(invite.email).toBe('new@company.ro');
        expect(invite.role).toBe('editor');
        expect(invite.token).toBeDefined();
      });

      it('should set default expiration (7 days)', async () => {
        const invite = await service.createInvite({
          workspaceId: workspace.id,
          email: 'new@company.ro',
          role: 'editor',
          invitedBy: 'user-1',
        });

        const expectedExpiry = new Date();
        expectedExpiry.setDate(expectedExpiry.getDate() + 7);

        expect(invite.expiresAt.getDate()).toBe(expectedExpiry.getDate());
      });

      it('should accept custom expiration', async () => {
        const invite = await service.createInvite({
          workspaceId: workspace.id,
          email: 'new@company.ro',
          role: 'editor',
          invitedBy: 'user-1',
          expiresInDays: 14,
        });

        const expectedExpiry = new Date();
        expectedExpiry.setDate(expectedExpiry.getDate() + 14);

        expect(invite.expiresAt.getDate()).toBe(expectedExpiry.getDate());
      });

      it('should emit workspace.invite.created event', async () => {
        await service.createInvite({
          workspaceId: workspace.id,
          email: 'new@company.ro',
          role: 'editor',
          invitedBy: 'user-1',
        });

        expect(mockEventEmitter.emit).toHaveBeenCalledWith('workspace.invite.created', expect.anything());
      });
    });

    describe('acceptInvite', () => {
      it('should accept invitation', async () => {
        const invite = await service.createInvite({
          workspaceId: workspace.id,
          email: 'new@company.ro',
          role: 'editor',
          invitedBy: 'user-1',
        });

        const result = await service.acceptInvite(
          invite.token,
          'new-user-1',
          'New User',
          'new@company.ro',
        );

        expect(result).toBeDefined();
        expect(result?.members.some(m => m.userId === 'new-user-1')).toBe(true);
      });

      it('should throw for already accepted invite', async () => {
        const invite = await service.createInvite({
          workspaceId: workspace.id,
          email: 'new@company.ro',
          role: 'editor',
          invitedBy: 'user-1',
        });

        await service.acceptInvite(
          invite.token,
          'new-user-1',
          'New User',
          'new@company.ro',
        );

        await expect(
          service.acceptInvite(invite.token, 'another-user', 'Another', 'another@email.com'),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should throw for expired invite', async () => {
        const invite = await service.createInvite({
          workspaceId: workspace.id,
          email: 'new@company.ro',
          role: 'editor',
          invitedBy: 'user-1',
        });

        // Manually expire the invite
        const invitesMap = (service as any).invites;
        const storedInvite = invitesMap.get(invite.id);
        storedInvite.expiresAt = new Date(Date.now() - 1000);
        invitesMap.set(invite.id, storedInvite);

        await expect(
          service.acceptInvite(invite.token, 'new-user-1', 'New User', 'new@company.ro'),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should return null for invalid token', async () => {
        const result = await service.acceptInvite(
          'invalid-token',
          'new-user-1',
          'New User',
          'new@company.ro',
        );

        expect(result).toBeNull();
      });
    });

    describe('getPendingInvites', () => {
      beforeEach(async () => {
        await service.createInvite({
          workspaceId: workspace.id,
          email: 'invite1@company.ro',
          role: 'editor',
          invitedBy: 'user-1',
        });

        await service.createInvite({
          workspaceId: workspace.id,
          email: 'invite2@company.ro',
          role: 'viewer',
          invitedBy: 'user-1',
        });
      });

      it('should return pending invites', async () => {
        const invites = await service.getPendingInvites(workspace.id);

        expect(invites.length).toBe(2);
        expect(invites.every(i => !i.acceptedAt)).toBe(true);
      });

      it('should exclude accepted invites', async () => {
        const invites = await service.getPendingInvites(workspace.id);
        const invite = invites[0];

        await service.acceptInvite(
          invite.token,
          'new-user-1',
          'New User',
          invite.email,
        );

        const pendingInvites = await service.getPendingInvites(workspace.id);
        expect(pendingInvites.length).toBe(1);
      });
    });

    describe('revokeInvite', () => {
      it('should revoke invite', async () => {
        const invite = await service.createInvite({
          workspaceId: workspace.id,
          email: 'new@company.ro',
          role: 'editor',
          invitedBy: 'user-1',
        });

        const result = await service.revokeInvite(invite.id);

        expect(result).toBe(true);

        const pendingInvites = await service.getPendingInvites(workspace.id);
        expect(pendingInvites.find(i => i.id === invite.id)).toBeUndefined();
      });
    });
  });

  describe('Statistics', () => {
    let workspace: Workspace;

    beforeEach(async () => {
      workspace = await service.createWorkspace({
        tenantId: 'tenant-1',
        name: 'Test Workspace',
        createdBy: 'user-1',
        createdByName: 'Ion Popescu',
        createdByEmail: 'ion@company.ro',
      });

      await service.addMember({
        workspaceId: workspace.id,
        userId: 'user-2',
        email: 'maria@company.ro',
        name: 'Maria Ionescu',
        role: 'editor',
        addedBy: 'user-1',
        addedByName: 'Ion Popescu',
      });

      await service.shareDocument({
        workspaceId: workspace.id,
        tenantId: 'tenant-1',
        documentId: 'doc-1',
        documentType: 'invoice',
        documentName: 'Factura 001',
        sharedBy: 'user-1',
        sharedByName: 'Ion Popescu',
        recipients: [],
        permission: 'view',
      });

      await service.addComment({
        workspaceId: workspace.id,
        tenantId: 'tenant-1',
        documentId: 'doc-1',
        authorId: 'user-1',
        authorName: 'Ion Popescu',
        content: 'Test comment',
      });
    });

    describe('getWorkspaceStats', () => {
      it('should return member count', async () => {
        const stats = await service.getWorkspaceStats(workspace.id);

        expect(stats.memberCount).toBe(2);
      });

      it('should return shared documents count', async () => {
        const stats = await service.getWorkspaceStats(workspace.id);

        expect(stats.sharedDocuments).toBe(1);
      });

      it('should return comments count', async () => {
        const stats = await service.getWorkspaceStats(workspace.id);

        expect(stats.commentsCount).toBe(1);
      });

      it('should return activities count', async () => {
        const stats = await service.getWorkspaceStats(workspace.id);

        expect(stats.activitiesCount).toBeGreaterThan(0);
      });

      it('should return recent activity', async () => {
        const stats = await service.getWorkspaceStats(workspace.id);

        expect(stats.recentActivity.length).toBeGreaterThan(0);
        expect(stats.recentActivity.length).toBeLessThanOrEqual(10);
      });

      it('should throw for non-existent workspace', async () => {
        await expect(service.getWorkspaceStats('invalid-id')).rejects.toThrow('Workspace not found');
      });
    });
  });

  describe('Romanian Business Context', () => {
    it('should support Romanian document types', async () => {
      const workspace = await service.createWorkspace({
        tenantId: 'tenant-1',
        name: 'Documente Contabile',
        createdBy: 'user-1',
        createdByName: 'Ion Popescu',
        createdByEmail: 'ion@company.ro',
      });

      const factura = await service.shareDocument({
        workspaceId: workspace.id,
        tenantId: 'tenant-1',
        documentId: 'inv-001',
        documentType: 'invoice',
        documentName: 'Factura fiscală 001/2025',
        sharedBy: 'user-1',
        sharedByName: 'Ion Popescu',
        recipients: [],
        permission: 'view',
      });

      expect(factura.documentType).toBe('invoice');
    });

    it('should support Romanian comments', async () => {
      const workspace = await service.createWorkspace({
        tenantId: 'tenant-1',
        name: 'Test',
        createdBy: 'user-1',
        createdByName: 'Ion Popescu',
        createdByEmail: 'ion@company.ro',
      });

      const comment = await service.addComment({
        workspaceId: workspace.id,
        tenantId: 'tenant-1',
        documentId: 'doc-1',
        authorId: 'user-1',
        authorName: 'Ion Popescu',
        content: 'Vă rog să verificați această factură înainte de aprobare',
      });

      expect(comment.content).toContain('factură');
    });

    it('should support contract document type', async () => {
      const workspace = await service.createWorkspace({
        tenantId: 'tenant-1',
        name: 'Contracte',
        createdBy: 'user-1',
        createdByName: 'Ion Popescu',
        createdByEmail: 'ion@company.ro',
      });

      const contract = await service.shareDocument({
        workspaceId: workspace.id,
        tenantId: 'tenant-1',
        documentId: 'contract-001',
        documentType: 'contract',
        documentName: 'Contract de muncă - Maria Ionescu',
        sharedBy: 'user-1',
        sharedByName: 'Ion Popescu',
        recipients: [{ type: 'user', value: 'user-2', permission: 'edit', notified: false }],
        permission: 'edit',
      });

      expect(contract.documentType).toBe('contract');
    });
  });
});
