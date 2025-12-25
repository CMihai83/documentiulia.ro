import { Test, TestingModule } from '@nestjs/testing';
import { TenantService } from './tenant.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrgRole } from '@prisma/client';

describe('TenantService', () => {
  let service: TenantService;
  let prisma: PrismaService;

  const mockPrismaService = {
    organizationMember: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockUserId = 'user-123';
  const mockOrgId = 'org-456';

  const mockOrganization = {
    id: mockOrgId,
    name: 'Test Company SRL',
    cui: 'RO12345678',
    tier: 'PRO',
  };

  const mockMembership = {
    id: 'membership-1',
    userId: mockUserId,
    organizationId: mockOrgId,
    role: OrgRole.OWNER,
    organization: mockOrganization,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TenantService>(TenantService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('getUserOrganizations', () => {
    it('should return user organizations with membership details', async () => {
      const mockMemberships = [
        { ...mockMembership, role: OrgRole.OWNER },
        { ...mockMembership, id: 'membership-2', organizationId: 'org-2', role: OrgRole.MEMBER },
      ];

      mockPrismaService.organizationMember.findMany.mockResolvedValue(mockMemberships);

      const result = await service.getUserOrganizations(mockUserId);

      expect(mockPrismaService.organizationMember.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              cui: true,
              tier: true,
            },
          },
        },
      });
      expect(result).toEqual(mockMemberships);
    });

    it('should return empty array when user has no organizations', async () => {
      mockPrismaService.organizationMember.findMany.mockResolvedValue([]);

      const result = await service.getUserOrganizations(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('getUserMembership', () => {
    it('should return membership when user belongs to organization', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(mockMembership);

      const result = await service.getUserMembership(mockUserId, mockOrgId);

      expect(mockPrismaService.organizationMember.findUnique).toHaveBeenCalledWith({
        where: {
          userId_organizationId: {
            userId: mockUserId,
            organizationId: mockOrgId,
          },
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              cui: true,
              tier: true,
            },
          },
        },
      });
      expect(result).toEqual(mockMembership);
    });

    it('should return null when user does not belong to organization', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(null);

      const result = await service.getUserMembership(mockUserId, 'non-existent-org');

      expect(result).toBeNull();
    });
  });

  describe('validateOrganizationAccess', () => {
    it('should return tenant context when user has access', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(mockMembership);

      const result = await service.validateOrganizationAccess(mockUserId, mockOrgId);

      expect(result).toEqual({
        organizationId: mockOrgId,
        userId: mockUserId,
        orgRole: OrgRole.OWNER,
      });
    });

    it('should throw ForbiddenException when user has no access', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(null);

      await expect(
        service.validateOrganizationAccess(mockUserId, mockOrgId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should validate required roles', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        ...mockMembership,
        role: OrgRole.MEMBER,
      });

      await expect(
        service.validateOrganizationAccess(mockUserId, mockOrgId, [OrgRole.OWNER, OrgRole.ADMIN]),
      ).rejects.toThrow('Required organization role: OWNER or ADMIN. You have: MEMBER');
    });

    it('should pass when user has one of the required roles', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        ...mockMembership,
        role: OrgRole.ADMIN,
      });

      const result = await service.validateOrganizationAccess(
        mockUserId,
        mockOrgId,
        [OrgRole.OWNER, OrgRole.ADMIN],
      );

      expect(result.orgRole).toBe(OrgRole.ADMIN);
    });
  });

  describe('getOrganization', () => {
    it('should return organization by ID', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrganization);

      const result = await service.getOrganization(mockOrgId);

      expect(result).toEqual(mockOrganization);
    });

    it('should throw NotFoundException when organization not found', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(service.getOrganization('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createOrganization', () => {
    it('should create organization with user as owner', async () => {
      const createData = {
        name: 'New Company SRL',
        cui: 'RO87654321',
        address: 'Bucharest, Romania',
      };

      const createdOrg = {
        id: 'new-org-id',
        slug: 'new-company-srl-abc123',
        ...createData,
        members: [{ userId: mockUserId, role: OrgRole.OWNER }],
      };

      mockPrismaService.organization.create.mockResolvedValue(createdOrg);

      const result = await service.createOrganization(mockUserId, createData);

      expect(mockPrismaService.organization.create).toHaveBeenCalledWith({
        data: {
          ...createData,
          slug: expect.stringMatching(/^new-company-srl-[a-z0-9]+$/),
          members: {
            create: {
              userId: mockUserId,
              role: OrgRole.OWNER,
            },
          },
        },
        include: {
          members: true,
        },
      });
      expect(result).toEqual(createdOrg);
    });
  });

  describe('addMember', () => {
    it('should add member with default MEMBER role', async () => {
      const newMembership = {
        organizationId: mockOrgId,
        userId: 'new-user-id',
        role: OrgRole.MEMBER,
      };

      mockPrismaService.organizationMember.create.mockResolvedValue(newMembership);

      const result = await service.addMember(mockOrgId, 'new-user-id');

      expect(mockPrismaService.organizationMember.create).toHaveBeenCalledWith({
        data: {
          organizationId: mockOrgId,
          userId: 'new-user-id',
          role: OrgRole.MEMBER,
        },
      });
      expect(result).toEqual(newMembership);
    });

    it('should add member with specified role', async () => {
      mockPrismaService.organizationMember.create.mockResolvedValue({
        organizationId: mockOrgId,
        userId: 'new-user-id',
        role: OrgRole.ACCOUNTANT,
      });

      await service.addMember(mockOrgId, 'new-user-id', OrgRole.ACCOUNTANT);

      expect(mockPrismaService.organizationMember.create).toHaveBeenCalledWith({
        data: {
          organizationId: mockOrgId,
          userId: 'new-user-id',
          role: OrgRole.ACCOUNTANT,
        },
      });
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role', async () => {
      const updatedMembership = {
        ...mockMembership,
        role: OrgRole.ADMIN,
      };

      mockPrismaService.organizationMember.update.mockResolvedValue(updatedMembership);

      const result = await service.updateMemberRole(mockOrgId, mockUserId, OrgRole.ADMIN);

      expect(mockPrismaService.organizationMember.update).toHaveBeenCalledWith({
        where: {
          userId_organizationId: {
            userId: mockUserId,
            organizationId: mockOrgId,
          },
        },
        data: { role: OrgRole.ADMIN },
      });
      expect(result.role).toBe(OrgRole.ADMIN);
    });
  });

  describe('removeMember', () => {
    it('should remove member from organization', async () => {
      mockPrismaService.organizationMember.delete.mockResolvedValue(mockMembership);

      const result = await service.removeMember(mockOrgId, mockUserId);

      expect(mockPrismaService.organizationMember.delete).toHaveBeenCalledWith({
        where: {
          userId_organizationId: {
            userId: mockUserId,
            organizationId: mockOrgId,
          },
        },
      });
      expect(result).toEqual(mockMembership);
    });
  });

  describe('getOrganizationMembers', () => {
    it('should return all organization members', async () => {
      const mockMembers = [
        { ...mockMembership, user: { id: mockUserId, email: 'owner@test.com', name: 'Owner' } },
        { id: 'm2', userId: 'user-2', role: OrgRole.MEMBER, user: { id: 'user-2', email: 'member@test.com', name: 'Member' } },
      ];

      mockPrismaService.organizationMember.findMany.mockResolvedValue(mockMembers);

      const result = await service.getOrganizationMembers(mockOrgId);

      expect(mockPrismaService.organizationMember.findMany).toHaveBeenCalledWith({
        where: { organizationId: mockOrgId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('switchOrganization', () => {
    it('should return membership when switching to valid organization', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(mockMembership);

      const result = await service.switchOrganization(mockUserId, mockOrgId);

      expect(result).toEqual(mockMembership);
    });

    it('should throw ForbiddenException when user has no access', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(null);

      await expect(
        service.switchOrganization(mockUserId, 'invalid-org'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('canPerformAction', () => {
    it('should return true when user has required role', () => {
      expect(service.canPerformAction(OrgRole.ADMIN, [OrgRole.OWNER, OrgRole.ADMIN])).toBe(true);
    });

    it('should return false when user does not have required role', () => {
      expect(service.canPerformAction(OrgRole.MEMBER, [OrgRole.OWNER, OrgRole.ADMIN])).toBe(false);
    });
  });

  describe('getRoleLevel', () => {
    it('should return correct levels for each role', () => {
      expect(service.getRoleLevel(OrgRole.OWNER)).toBe(100);
      expect(service.getRoleLevel(OrgRole.ADMIN)).toBe(80);
      expect(service.getRoleLevel(OrgRole.ACCOUNTANT)).toBe(60);
      expect(service.getRoleLevel(OrgRole.MEMBER)).toBe(40);
      expect(service.getRoleLevel(OrgRole.VIEWER)).toBe(20);
    });
  });

  describe('hasMinimumRole', () => {
    it('should return true when user role is at or above minimum', () => {
      expect(service.hasMinimumRole(OrgRole.OWNER, OrgRole.ADMIN)).toBe(true);
      expect(service.hasMinimumRole(OrgRole.ADMIN, OrgRole.ADMIN)).toBe(true);
      expect(service.hasMinimumRole(OrgRole.ACCOUNTANT, OrgRole.MEMBER)).toBe(true);
    });

    it('should return false when user role is below minimum', () => {
      expect(service.hasMinimumRole(OrgRole.MEMBER, OrgRole.ADMIN)).toBe(false);
      expect(service.hasMinimumRole(OrgRole.VIEWER, OrgRole.ACCOUNTANT)).toBe(false);
    });
  });
});
