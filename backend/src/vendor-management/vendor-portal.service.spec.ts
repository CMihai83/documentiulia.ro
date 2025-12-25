import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  VendorPortalService,
  PortalUser,
  PortalInvitation,
  PortalMessage,
  PortalNotification,
  VendorRequest,
  DocumentSubmission,
  ProfileUpdateRequest,
  PortalSettings,
} from './vendor-portal.service';

describe('VendorPortalService', () => {
  let service: VendorPortalService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorPortalService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VendorPortalService>(VendorPortalService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Portal Users', () => {
    describe('createPortalUser', () => {
      it('should create portal user', async () => {
        const user = await service.createPortalUser({
          vendorId: 'vendor-1',
          email: 'user@vendor.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'admin',
          createdBy: 'system',
        });

        expect(user.id).toBeDefined();
        expect(user.email).toBe('user@vendor.com');
        expect(user.role).toBe('admin');
        expect(user.status).toBe('pending');
        expect(user.loginCount).toBe(0);
        expect(user.mfaEnabled).toBe(false);
        expect(eventEmitter.emit).toHaveBeenCalledWith('vendor_portal.user_created', expect.any(Object));
      });

      it('should set default permissions based on role', async () => {
        const admin = await service.createPortalUser({
          vendorId: 'vendor-1',
          email: 'admin@vendor.com',
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin',
          createdBy: 'system',
        });

        expect(admin.permissions.length).toBeGreaterThan(0);
        expect(admin.permissions.some(p => p.resource === 'users')).toBe(true);
      });

      it('should throw for duplicate email', async () => {
        await service.createPortalUser({
          vendorId: 'vendor-1',
          email: 'duplicate@vendor.com',
          firstName: 'First',
          lastName: 'User',
          role: 'viewer',
          createdBy: 'system',
        });

        await expect(
          service.createPortalUser({
            vendorId: 'vendor-1',
            email: 'duplicate@vendor.com',
            firstName: 'Second',
            lastName: 'User',
            role: 'viewer',
            createdBy: 'system',
          }),
        ).rejects.toThrow('User with this email already exists for this vendor');
      });
    });

    describe('getPortalUser', () => {
      it('should return user by ID', async () => {
        const created = await service.createPortalUser({
          vendorId: 'vendor-1',
          email: 'test@vendor.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'manager',
          createdBy: 'system',
        });

        const user = await service.getPortalUser(created.id);

        expect(user).not.toBeNull();
        expect(user?.id).toBe(created.id);
      });

      it('should return null for non-existent ID', async () => {
        const user = await service.getPortalUser('non-existent');

        expect(user).toBeNull();
      });
    });

    describe('getVendorPortalUsers', () => {
      it('should return users for vendor', async () => {
        await service.createPortalUser({
          vendorId: 'vendor-1',
          email: 'user1@vendor.com',
          firstName: 'User',
          lastName: 'One',
          role: 'admin',
          createdBy: 'system',
        });

        await new Promise(r => setTimeout(r, 5));

        await service.createPortalUser({
          vendorId: 'vendor-1',
          email: 'user2@vendor.com',
          firstName: 'User',
          lastName: 'Two',
          role: 'viewer',
          createdBy: 'system',
        });

        const users = await service.getVendorPortalUsers('vendor-1');

        expect(users.length).toBe(2);
      });
    });

    describe('updatePortalUser', () => {
      it('should update user', async () => {
        const user = await service.createPortalUser({
          vendorId: 'vendor-1',
          email: 'update@vendor.com',
          firstName: 'Original',
          lastName: 'Name',
          role: 'viewer',
          createdBy: 'system',
        });

        const updated = await service.updatePortalUser(user.id, {
          firstName: 'Updated',
          jobTitle: 'Manager',
        });

        expect(updated?.firstName).toBe('Updated');
        expect(updated?.jobTitle).toBe('Manager');
      });

      it('should return null for non-existent ID', async () => {
        const result = await service.updatePortalUser('non-existent', { firstName: 'New' });

        expect(result).toBeNull();
      });
    });

    describe('activatePortalUser', () => {
      it('should activate pending user', async () => {
        const user = await service.createPortalUser({
          vendorId: 'vendor-1',
          email: 'activate@vendor.com',
          firstName: 'Activate',
          lastName: 'User',
          role: 'viewer',
          createdBy: 'system',
        });

        const activated = await service.activatePortalUser(user.id);

        expect(activated?.status).toBe('active');
        expect(eventEmitter.emit).toHaveBeenCalledWith('vendor_portal.user_activated', expect.any(Object));
      });

      it('should not activate non-pending user', async () => {
        const user = await service.createPortalUser({
          vendorId: 'vendor-1',
          email: 'already@vendor.com',
          firstName: 'Already',
          lastName: 'Active',
          role: 'viewer',
          createdBy: 'system',
        });

        await service.activatePortalUser(user.id);
        const result = await service.activatePortalUser(user.id);

        expect(result).toBeNull();
      });
    });

    describe('suspendPortalUser', () => {
      it('should suspend active user', async () => {
        const user = await service.createPortalUser({
          vendorId: 'vendor-1',
          email: 'suspend@vendor.com',
          firstName: 'Suspend',
          lastName: 'User',
          role: 'viewer',
          createdBy: 'system',
        });

        await service.activatePortalUser(user.id);
        const suspended = await service.suspendPortalUser(user.id, 'Violation');

        expect(suspended?.status).toBe('suspended');
        expect(eventEmitter.emit).toHaveBeenCalledWith('vendor_portal.user_suspended', expect.any(Object));
      });
    });

    describe('recordLogin', () => {
      it('should record login', async () => {
        const user = await service.createPortalUser({
          vendorId: 'vendor-1',
          email: 'login@vendor.com',
          firstName: 'Login',
          lastName: 'User',
          role: 'viewer',
          createdBy: 'system',
        });

        const updated = await service.recordLogin(user.id);

        expect(updated?.loginCount).toBe(1);
        expect(updated?.lastLoginAt).toBeDefined();
      });
    });
  });

  describe('Invitations', () => {
    describe('createInvitation', () => {
      it('should create invitation', async () => {
        const invitation = await service.createInvitation({
          vendorId: 'vendor-1',
          email: 'invite@vendor.com',
          role: 'manager',
          invitedBy: 'user-1',
          invitedByName: 'Admin User',
        });

        expect(invitation.id).toBeDefined();
        expect(invitation.token).toBeDefined();
        expect(invitation.status).toBe('pending');
        expect(invitation.expiresAt).toBeDefined();
        expect(eventEmitter.emit).toHaveBeenCalledWith('vendor_portal.invitation_sent', expect.any(Object));
      });

      it('should set custom expiration', async () => {
        const invitation = await service.createInvitation({
          vendorId: 'vendor-1',
          email: 'custom@vendor.com',
          role: 'viewer',
          invitedBy: 'user-1',
          invitedByName: 'Admin',
          expiresInDays: 14,
        });

        const expectedExpiry = new Date();
        expectedExpiry.setDate(expectedExpiry.getDate() + 14);

        expect(invitation.expiresAt.getDate()).toBe(expectedExpiry.getDate());
      });
    });

    describe('getInvitationByToken', () => {
      it('should return invitation by token', async () => {
        const created = await service.createInvitation({
          vendorId: 'vendor-1',
          email: 'token@vendor.com',
          role: 'viewer',
          invitedBy: 'user-1',
          invitedByName: 'Admin',
        });

        const invitation = await service.getInvitationByToken(created.token);

        expect(invitation).not.toBeNull();
        expect(invitation?.id).toBe(created.id);
      });
    });

    describe('acceptInvitation', () => {
      it('should accept pending invitation', async () => {
        const invitation = await service.createInvitation({
          vendorId: 'vendor-1',
          email: 'accept@vendor.com',
          role: 'viewer',
          invitedBy: 'user-1',
          invitedByName: 'Admin',
        });

        const accepted = await service.acceptInvitation(invitation.token, 'new-user-id');

        expect(accepted?.status).toBe('accepted');
        expect(accepted?.acceptedUserId).toBe('new-user-id');
        expect(accepted?.acceptedAt).toBeDefined();
      });

      it('should not accept expired invitation', async () => {
        const invitation = await service.createInvitation({
          vendorId: 'vendor-1',
          email: 'expired@vendor.com',
          role: 'viewer',
          invitedBy: 'user-1',
          invitedByName: 'Admin',
          expiresInDays: -1,
        });

        const result = await service.acceptInvitation(invitation.token, 'user-id');

        expect(result).toBeNull();
      });
    });

    describe('revokeInvitation', () => {
      it('should revoke pending invitation', async () => {
        const invitation = await service.createInvitation({
          vendorId: 'vendor-1',
          email: 'revoke@vendor.com',
          role: 'viewer',
          invitedBy: 'user-1',
          invitedByName: 'Admin',
        });

        const revoked = await service.revokeInvitation(invitation.id);

        expect(revoked?.status).toBe('revoked');
      });
    });
  });

  describe('Messaging', () => {
    describe('sendMessage', () => {
      it('should send message', async () => {
        const message = await service.sendMessage({
          vendorId: 'vendor-1',
          tenantId: 'tenant-1',
          subject: 'Test Subject',
          body: 'Test body content',
          fromVendor: true,
          senderId: 'user-1',
          senderName: 'Vendor User',
        });

        expect(message.id).toBeDefined();
        expect(message.threadId).toBeDefined();
        expect(message.status).toBe('unread');
        expect(message.priority).toBe('normal');
        expect(eventEmitter.emit).toHaveBeenCalledWith('vendor_portal.message_sent', expect.any(Object));
      });

      it('should support attachments', async () => {
        const message = await service.sendMessage({
          vendorId: 'vendor-1',
          tenantId: 'tenant-1',
          subject: 'With Attachment',
          body: 'See attached',
          fromVendor: true,
          senderId: 'user-1',
          senderName: 'User',
          attachments: [
            { name: 'doc.pdf', fileUrl: '/files/doc.pdf', fileSize: 1024, mimeType: 'application/pdf' },
          ],
        });

        expect(message.attachments.length).toBe(1);
        expect(message.attachments[0].id).toBeDefined();
      });

      it('should maintain thread for replies', async () => {
        const original = await service.sendMessage({
          vendorId: 'vendor-1',
          tenantId: 'tenant-1',
          subject: 'Original Message',
          body: 'First message',
          fromVendor: true,
          senderId: 'user-1',
          senderName: 'User',
        });

        const reply = await service.sendMessage({
          vendorId: 'vendor-1',
          tenantId: 'tenant-1',
          subject: 'Re: Original Message',
          body: 'Reply',
          fromVendor: false,
          senderId: 'tenant-user-1',
          senderName: 'Tenant User',
          parentMessageId: original.id,
        });

        expect(reply.threadId).toBe(original.threadId);
      });
    });

    describe('getVendorMessages', () => {
      beforeEach(async () => {
        await service.sendMessage({
          vendorId: 'vendor-1',
          tenantId: 'tenant-1',
          subject: 'Message 1',
          body: 'Content 1',
          fromVendor: true,
          senderId: 'user-1',
          senderName: 'User',
        });

        await new Promise(r => setTimeout(r, 5));

        await service.sendMessage({
          vendorId: 'vendor-1',
          tenantId: 'tenant-1',
          subject: 'Message 2',
          body: 'Content 2',
          fromVendor: false,
          senderId: 'tenant-1',
          senderName: 'Tenant',
        });
      });

      it('should return messages for vendor', async () => {
        const messages = await service.getVendorMessages('vendor-1');

        expect(messages.length).toBe(2);
      });

      it('should filter by status', async () => {
        const messages = await service.getVendorMessages('vendor-1', { status: 'unread' });

        expect(messages.every(m => m.status === 'unread')).toBe(true);
      });

      it('should filter by fromVendor', async () => {
        const messages = await service.getVendorMessages('vendor-1', { fromVendor: true });

        expect(messages.every(m => m.fromVendor === true)).toBe(true);
      });
    });

    describe('markMessageAsRead', () => {
      it('should mark message as read', async () => {
        const message = await service.sendMessage({
          vendorId: 'vendor-1',
          tenantId: 'tenant-1',
          subject: 'Unread',
          body: 'Content',
          fromVendor: true,
          senderId: 'user-1',
          senderName: 'User',
        });

        const read = await service.markMessageAsRead(message.id, 'reader-1');

        expect(read?.status).toBe('read');
        expect(read?.readAt).toBeDefined();
        expect(read?.readBy).toBe('reader-1');
      });
    });

    describe('archiveMessage', () => {
      it('should archive message', async () => {
        const message = await service.sendMessage({
          vendorId: 'vendor-1',
          tenantId: 'tenant-1',
          subject: 'Archive Me',
          body: 'Content',
          fromVendor: true,
          senderId: 'user-1',
          senderName: 'User',
        });

        const archived = await service.archiveMessage(message.id);

        expect(archived?.status).toBe('archived');
      });
    });
  });

  describe('Notifications', () => {
    describe('createNotification', () => {
      it('should create notification', async () => {
        const notification = await service.createNotification({
          vendorId: 'vendor-1',
          type: 'info',
          title: 'Test Notification',
          message: 'This is a test',
        });

        expect(notification.id).toBeDefined();
        expect(notification.read).toBe(false);
      });

      it('should support action URL', async () => {
        const notification = await service.createNotification({
          vendorId: 'vendor-1',
          type: 'action_required',
          title: 'Action Needed',
          message: 'Please review',
          actionUrl: '/vendor/review',
          actionLabel: 'Review Now',
        });

        expect(notification.actionUrl).toBe('/vendor/review');
        expect(notification.actionLabel).toBe('Review Now');
      });
    });

    describe('getVendorNotifications', () => {
      beforeEach(async () => {
        await service.createNotification({
          vendorId: 'vendor-1',
          type: 'info',
          title: 'Info 1',
          message: 'Message 1',
        });

        await new Promise(r => setTimeout(r, 5));

        await service.createNotification({
          vendorId: 'vendor-1',
          type: 'warning',
          title: 'Warning 1',
          message: 'Message 2',
        });
      });

      it('should return notifications for vendor', async () => {
        const notifications = await service.getVendorNotifications('vendor-1');

        expect(notifications.length).toBe(2);
      });

      it('should filter unread only', async () => {
        const notifications = await service.getVendorNotifications('vendor-1', { unreadOnly: true });

        expect(notifications.every(n => !n.read)).toBe(true);
      });

      it('should filter by type', async () => {
        const notifications = await service.getVendorNotifications('vendor-1', { type: 'warning' });

        expect(notifications.every(n => n.type === 'warning')).toBe(true);
      });
    });

    describe('markNotificationAsRead', () => {
      it('should mark notification as read', async () => {
        const notification = await service.createNotification({
          vendorId: 'vendor-1',
          type: 'info',
          title: 'Read Me',
          message: 'Content',
        });

        const read = await service.markNotificationAsRead(notification.id);

        expect(read?.read).toBe(true);
        expect(read?.readAt).toBeDefined();
      });
    });

    describe('markAllNotificationsAsRead', () => {
      it('should mark all notifications as read', async () => {
        await service.createNotification({
          vendorId: 'vendor-1',
          type: 'info',
          title: 'Notification 1',
          message: 'Content 1',
        });

        await new Promise(r => setTimeout(r, 5));

        await service.createNotification({
          vendorId: 'vendor-1',
          type: 'info',
          title: 'Notification 2',
          message: 'Content 2',
        });

        const count = await service.markAllNotificationsAsRead('vendor-1');

        expect(count).toBe(2);

        const notifications = await service.getVendorNotifications('vendor-1', { unreadOnly: true });
        expect(notifications.length).toBe(0);
      });
    });
  });

  describe('Support Requests', () => {
    describe('createRequest', () => {
      it('should create support request', async () => {
        const request = await service.createRequest({
          vendorId: 'vendor-1',
          tenantId: 'tenant-1',
          type: 'support',
          subject: 'Need Help',
          description: 'I need assistance',
          requestedBy: 'user-1',
          requestedByName: 'User',
        });

        expect(request.id).toBeDefined();
        expect(request.status).toBe('open');
        expect(request.comments).toEqual([]);
        expect(eventEmitter.emit).toHaveBeenCalledWith('vendor_portal.request_created', expect.any(Object));
      });

      it('should support attachments', async () => {
        const request = await service.createRequest({
          vendorId: 'vendor-1',
          tenantId: 'tenant-1',
          type: 'document_submission',
          subject: 'Document Inquiry',
          description: 'See attached',
          requestedBy: 'user-1',
          requestedByName: 'User',
          attachments: [
            { name: 'file.pdf', fileUrl: '/files/file.pdf', fileSize: 2048, mimeType: 'application/pdf' },
          ],
        });

        expect(request.attachments.length).toBe(1);
      });
    });

    describe('getVendorRequests', () => {
      it('should return requests for vendor', async () => {
        await service.createRequest({
          vendorId: 'vendor-1',
          tenantId: 'tenant-1',
          type: 'support',
          subject: 'Request 1',
          description: 'Description',
          requestedBy: 'user-1',
          requestedByName: 'User',
        });

        const requests = await service.getVendorRequests('vendor-1');

        expect(requests.length).toBe(1);
      });

      it('should filter by type', async () => {
        await service.createRequest({
          vendorId: 'vendor-1',
          tenantId: 'tenant-1',
          type: 'payment_inquiry',
          subject: 'Payment Question',
          description: 'About payment',
          requestedBy: 'user-1',
          requestedByName: 'User',
        });

        const requests = await service.getVendorRequests('vendor-1', { type: 'payment_inquiry' });

        expect(requests.every(r => r.type === 'payment_inquiry')).toBe(true);
      });
    });

    describe('assignRequest', () => {
      it('should assign request', async () => {
        const request = await service.createRequest({
          vendorId: 'vendor-1',
          tenantId: 'tenant-1',
          type: 'support',
          subject: 'Assign Me',
          description: 'Description',
          requestedBy: 'user-1',
          requestedByName: 'User',
        });

        const assigned = await service.assignRequest(request.id, 'agent-1', 'Support Agent');

        expect(assigned?.assignedTo).toBe('agent-1');
        expect(assigned?.assignedToName).toBe('Support Agent');
        expect(assigned?.status).toBe('in_progress');
      });
    });

    describe('addRequestComment', () => {
      it('should add comment to request', async () => {
        const request = await service.createRequest({
          vendorId: 'vendor-1',
          tenantId: 'tenant-1',
          type: 'support',
          subject: 'Comment Test',
          description: 'Description',
          requestedBy: 'user-1',
          requestedByName: 'User',
        });

        const updated = await service.addRequestComment(request.id, {
          content: 'This is a comment',
          fromVendor: false,
          authorId: 'agent-1',
          authorName: 'Agent',
        });

        expect(updated?.comments.length).toBe(1);
        expect(updated?.comments[0].content).toBe('This is a comment');
      });
    });

    describe('resolveRequest', () => {
      it('should resolve request', async () => {
        const request = await service.createRequest({
          vendorId: 'vendor-1',
          tenantId: 'tenant-1',
          type: 'support',
          subject: 'Resolve Me',
          description: 'Description',
          requestedBy: 'user-1',
          requestedByName: 'User',
        });

        const resolved = await service.resolveRequest(request.id, 'Issue fixed', 'agent-1');

        expect(resolved?.status).toBe('resolved');
        expect(resolved?.resolution).toBe('Issue fixed');
        expect(resolved?.resolvedBy).toBe('agent-1');
        expect(resolved?.resolvedAt).toBeDefined();
      });
    });

    describe('closeRequest', () => {
      it('should close resolved request', async () => {
        const request = await service.createRequest({
          vendorId: 'vendor-1',
          tenantId: 'tenant-1',
          type: 'support',
          subject: 'Close Me',
          description: 'Description',
          requestedBy: 'user-1',
          requestedByName: 'User',
        });

        await service.resolveRequest(request.id, 'Done', 'agent-1');
        const closed = await service.closeRequest(request.id);

        expect(closed?.status).toBe('closed');
      });

      it('should not close non-resolved request', async () => {
        const request = await service.createRequest({
          vendorId: 'vendor-1',
          tenantId: 'tenant-1',
          type: 'support',
          subject: 'Cannot Close',
          description: 'Description',
          requestedBy: 'user-1',
          requestedByName: 'User',
        });

        const result = await service.closeRequest(request.id);

        expect(result).toBeNull();
      });
    });
  });

  describe('Document Submissions', () => {
    describe('submitDocument', () => {
      it('should submit document', async () => {
        const submission = await service.submitDocument({
          vendorId: 'vendor-1',
          tenantId: 'tenant-1',
          documentType: 'certificate',
          name: 'ISO Certificate',
          fileUrl: '/files/iso.pdf',
          fileName: 'iso.pdf',
          fileSize: 5000,
          mimeType: 'application/pdf',
          submittedBy: 'user-1',
          submittedByName: 'User',
        });

        expect(submission.id).toBeDefined();
        expect(submission.status).toBe('pending_review');
        expect(eventEmitter.emit).toHaveBeenCalledWith('vendor_portal.document_submitted', expect.any(Object));
      });
    });

    describe('getVendorDocumentSubmissions', () => {
      it('should return submissions for vendor', async () => {
        await service.submitDocument({
          vendorId: 'vendor-1',
          tenantId: 'tenant-1',
          documentType: 'license',
          name: 'License',
          fileUrl: '/files/license.pdf',
          fileName: 'license.pdf',
          fileSize: 3000,
          mimeType: 'application/pdf',
          submittedBy: 'user-1',
          submittedByName: 'User',
        });

        const submissions = await service.getVendorDocumentSubmissions('vendor-1');

        expect(submissions.length).toBe(1);
      });

      it('should filter by status', async () => {
        await service.submitDocument({
          vendorId: 'vendor-1',
          tenantId: 'tenant-1',
          documentType: 'certificate',
          name: 'Cert',
          fileUrl: '/files/cert.pdf',
          fileName: 'cert.pdf',
          fileSize: 2000,
          mimeType: 'application/pdf',
          submittedBy: 'user-1',
          submittedByName: 'User',
        });

        const submissions = await service.getVendorDocumentSubmissions('vendor-1', { status: 'pending_review' });

        expect(submissions.every(s => s.status === 'pending_review')).toBe(true);
      });
    });

    describe('reviewDocumentSubmission', () => {
      it('should approve document', async () => {
        const submission = await service.submitDocument({
          vendorId: 'vendor-1',
          tenantId: 'tenant-1',
          documentType: 'certificate',
          name: 'Approve Me',
          fileUrl: '/files/approve.pdf',
          fileName: 'approve.pdf',
          fileSize: 1500,
          mimeType: 'application/pdf',
          submittedBy: 'user-1',
          submittedByName: 'User',
        });

        const reviewed = await service.reviewDocumentSubmission(submission.id, {
          approved: true,
          reviewedBy: 'reviewer-1',
          reviewedByName: 'Reviewer',
        });

        expect(reviewed?.status).toBe('approved');
        expect(reviewed?.reviewedAt).toBeDefined();
      });

      it('should reject document with reason', async () => {
        const submission = await service.submitDocument({
          vendorId: 'vendor-1',
          tenantId: 'tenant-1',
          documentType: 'certificate',
          name: 'Reject Me',
          fileUrl: '/files/reject.pdf',
          fileName: 'reject.pdf',
          fileSize: 1500,
          mimeType: 'application/pdf',
          submittedBy: 'user-1',
          submittedByName: 'User',
        });

        const reviewed = await service.reviewDocumentSubmission(submission.id, {
          approved: false,
          reviewedBy: 'reviewer-1',
          reviewedByName: 'Reviewer',
          rejectionReason: 'Document expired',
        });

        expect(reviewed?.status).toBe('rejected');
        expect(reviewed?.rejectionReason).toBe('Document expired');
      });
    });
  });

  describe('Profile Update Requests', () => {
    describe('requestProfileUpdate', () => {
      it('should create profile update request', async () => {
        const request = await service.requestProfileUpdate({
          vendorId: 'vendor-1',
          tenantId: 'tenant-1',
          changes: [
            { field: 'address', oldValue: '123 Old St', newValue: '456 New Ave' },
            { field: 'phone', oldValue: '1234567890', newValue: '0987654321' },
          ],
          requestedBy: 'user-1',
          requestedByName: 'User',
        });

        expect(request.id).toBeDefined();
        expect(request.status).toBe('pending');
        expect(request.changes.length).toBe(2);
      });
    });

    describe('reviewProfileUpdate', () => {
      it('should approve all changes', async () => {
        const request = await service.requestProfileUpdate({
          vendorId: 'vendor-1',
          tenantId: 'tenant-1',
          changes: [
            { field: 'address', oldValue: 'Old', newValue: 'New' },
          ],
          requestedBy: 'user-1',
          requestedByName: 'User',
        });

        const reviewed = await service.reviewProfileUpdate(request.id, {
          approvedChanges: ['address'],
          rejectedChanges: [],
          reviewedBy: 'reviewer-1',
          reviewedByName: 'Reviewer',
        });

        expect(reviewed?.status).toBe('approved');
        expect(reviewed?.changes[0].approved).toBe(true);
      });

      it('should partially approve changes', async () => {
        const request = await service.requestProfileUpdate({
          vendorId: 'vendor-1',
          tenantId: 'tenant-1',
          changes: [
            { field: 'address', oldValue: 'Old', newValue: 'New' },
            { field: 'name', oldValue: 'Old Name', newValue: 'New Name' },
          ],
          requestedBy: 'user-1',
          requestedByName: 'User',
        });

        const reviewed = await service.reviewProfileUpdate(request.id, {
          approvedChanges: ['address'],
          rejectedChanges: [{ field: 'name', reason: 'Requires legal documents' }],
          reviewedBy: 'reviewer-1',
          reviewedByName: 'Reviewer',
        });

        expect(reviewed?.status).toBe('partially_approved');
      });

      it('should reject all changes', async () => {
        const request = await service.requestProfileUpdate({
          vendorId: 'vendor-1',
          tenantId: 'tenant-1',
          changes: [
            { field: 'address', oldValue: 'Old', newValue: 'New' },
          ],
          requestedBy: 'user-1',
          requestedByName: 'User',
        });

        const reviewed = await service.reviewProfileUpdate(request.id, {
          approvedChanges: [],
          rejectedChanges: [{ field: 'address', reason: 'Invalid address' }],
          reviewedBy: 'reviewer-1',
          reviewedByName: 'Reviewer',
        });

        expect(reviewed?.status).toBe('rejected');
      });
    });
  });

  describe('Portal Settings', () => {
    describe('updatePortalSettings', () => {
      it('should create default settings', async () => {
        const settings = await service.updatePortalSettings('vendor-1', {});

        expect(settings.vendorId).toBe('vendor-1');
        expect(settings.allowedFeatures.length).toBeGreaterThan(0);
        expect(settings.notificationPreferences.length).toBeGreaterThan(0);
      });

      it('should update existing settings', async () => {
        await service.updatePortalSettings('vendor-1', {});

        const updated = await service.updatePortalSettings('vendor-1', {
          customBranding: {
            logoUrl: '/logo.png',
            primaryColor: '#ff0000',
          },
        });

        expect(updated.customBranding?.logoUrl).toBe('/logo.png');
        expect(updated.customBranding?.primaryColor).toBe('#ff0000');
      });

      it('should update data visibility', async () => {
        const settings = await service.updatePortalSettings('vendor-1', {
          dataVisibility: {
            showPaymentHistory: false,
            showPerformanceScores: true,
            showContractDetails: true,
            showComplianceStatus: false,
          },
        });

        expect(settings.dataVisibility.showPaymentHistory).toBe(false);
        expect(settings.dataVisibility.showPerformanceScores).toBe(true);
      });
    });

    describe('getPortalSettings', () => {
      it('should return null for non-existent vendor', async () => {
        const settings = await service.getPortalSettings('non-existent');

        expect(settings).toBeNull();
      });

      it('should return settings for vendor', async () => {
        await service.updatePortalSettings('vendor-1', {});

        const settings = await service.getPortalSettings('vendor-1');

        expect(settings).not.toBeNull();
        expect(settings?.vendorId).toBe('vendor-1');
      });
    });
  });

  describe('Dashboard', () => {
    it('should return vendor dashboard', async () => {
      const dashboard = await service.getVendorDashboard('vendor-1');

      expect(dashboard.vendorId).toBe('vendor-1');
      expect(dashboard.overview).toBeDefined();
      expect(dashboard.recentActivity).toBeDefined();
      expect(dashboard.pendingActions).toBeDefined();
      expect(dashboard.quickStats).toBeDefined();
    });

    it('should include pending actions', async () => {
      await service.submitDocument({
        vendorId: 'vendor-1',
        tenantId: 'tenant-1',
        documentType: 'certificate',
        name: 'Pending Doc',
        fileUrl: '/files/pending.pdf',
        fileName: 'pending.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
        submittedBy: 'user-1',
        submittedByName: 'User',
      });

      const dashboard = await service.getVendorDashboard('vendor-1');

      expect(dashboard.overview.pendingDocuments).toBe(1);
    });
  });

  describe('Statistics', () => {
    it('should return portal statistics', async () => {
      await service.createPortalUser({
        vendorId: 'vendor-1',
        email: 'stat@vendor.com',
        firstName: 'Stat',
        lastName: 'User',
        role: 'viewer',
        createdBy: 'system',
      });

      await service.sendMessage({
        vendorId: 'vendor-1',
        tenantId: 'tenant-1',
        subject: 'Test',
        body: 'Content',
        fromVendor: true,
        senderId: 'user-1',
        senderName: 'User',
      });

      await service.createRequest({
        vendorId: 'vendor-1',
        tenantId: 'tenant-1',
        type: 'support',
        subject: 'Help',
        description: 'Need help',
        requestedBy: 'user-1',
        requestedByName: 'User',
      });

      const stats = await service.getPortalStatistics('tenant-1');

      expect(stats.totalVendorUsers).toBeGreaterThan(0);
      expect(stats.totalMessages).toBeGreaterThan(0);
      expect(stats.totalRequests).toBeGreaterThan(0);
    });
  });

  describe('Request Types', () => {
    it('should support profile_update type', async () => {
      const request = await service.createRequest({
        vendorId: 'vendor-1',
        tenantId: 'tenant-1',
        type: 'profile_update',
        subject: 'Update Profile',
        description: 'Description',
        requestedBy: 'user-1',
        requestedByName: 'User',
      });

      expect(request.type).toBe('profile_update');
    });

    it('should support contract_review type', async () => {
      const request = await service.createRequest({
        vendorId: 'vendor-1',
        tenantId: 'tenant-1',
        type: 'contract_review',
        subject: 'Review Contract',
        description: 'Description',
        requestedBy: 'user-1',
        requestedByName: 'User',
      });

      expect(request.type).toBe('contract_review');
    });

    it('should support compliance_update type', async () => {
      const request = await service.createRequest({
        vendorId: 'vendor-1',
        tenantId: 'tenant-1',
        type: 'compliance_update',
        subject: 'Compliance Update',
        description: 'Description',
        requestedBy: 'user-1',
        requestedByName: 'User',
      });

      expect(request.type).toBe('compliance_update');
    });
  });

  describe('Message Priority', () => {
    it('should support low priority', async () => {
      const message = await service.sendMessage({
        vendorId: 'vendor-1',
        tenantId: 'tenant-1',
        subject: 'Low Priority',
        body: 'Content',
        priority: 'low',
        fromVendor: true,
        senderId: 'user-1',
        senderName: 'User',
      });

      expect(message.priority).toBe('low');
    });

    it('should support high priority', async () => {
      const message = await service.sendMessage({
        vendorId: 'vendor-1',
        tenantId: 'tenant-1',
        subject: 'High Priority',
        body: 'Content',
        priority: 'high',
        fromVendor: true,
        senderId: 'user-1',
        senderName: 'User',
      });

      expect(message.priority).toBe('high');
    });

    it('should support urgent priority', async () => {
      const message = await service.sendMessage({
        vendorId: 'vendor-1',
        tenantId: 'tenant-1',
        subject: 'Urgent',
        body: 'Content',
        priority: 'urgent',
        fromVendor: true,
        senderId: 'user-1',
        senderName: 'User',
      });

      expect(message.priority).toBe('urgent');
    });
  });

  describe('User Roles', () => {
    it('should create admin with full permissions', async () => {
      const user = await service.createPortalUser({
        vendorId: 'vendor-1',
        email: 'admin@test.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        createdBy: 'system',
      });

      expect(user.permissions.some(p => p.resource === 'users')).toBe(true);
    });

    it('should create manager with limited permissions', async () => {
      const user = await service.createPortalUser({
        vendorId: 'vendor-1',
        email: 'manager@test.com',
        firstName: 'Manager',
        lastName: 'User',
        role: 'manager',
        createdBy: 'system',
      });

      expect(user.permissions.some(p => p.resource === 'users')).toBe(false);
    });

    it('should create viewer with view-only permissions', async () => {
      const user = await service.createPortalUser({
        vendorId: 'vendor-1',
        email: 'viewer@test.com',
        firstName: 'Viewer',
        lastName: 'User',
        role: 'viewer',
        createdBy: 'system',
      });

      expect(user.permissions.every(p => p.actions.length === 1 && p.actions[0] === 'view')).toBe(true);
    });
  });
});
