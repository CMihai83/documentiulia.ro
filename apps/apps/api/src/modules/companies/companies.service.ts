import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { AddMemberDto, UpdateMemberRoleDto } from './dto/add-member.dto';
import { CompanyRole } from '@prisma/client';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCompanyDto, userId: string) {
    // Check if CUI already exists
    const existing = await this.prisma.company.findUnique({
      where: { cui: dto.cui },
    });

    if (existing) {
      throw new ConflictException('Company with this CUI already exists');
    }

    // Create company and add user as owner
    return this.prisma.company.create({
      data: {
        ...dto,
        users: {
          create: {
            userId,
            role: CompanyRole.OWNER,
          },
        },
      },
      include: {
        users: {
          include: { user: true },
        },
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.company.findMany({
      where: {
        users: {
          some: { userId },
        },
      },
      include: {
        users: {
          include: { user: true },
        },
        _count: {
          select: {
            clients: true,
            invoices: true,
            products: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, userId: string) {
    const company = await this.prisma.company.findFirst({
      where: {
        id,
        users: {
          some: { userId },
        },
      },
      include: {
        users: {
          include: { user: true },
        },
        efacturaConfig: true,
        _count: {
          select: {
            clients: true,
            invoices: true,
            products: true,
            expenses: true,
            bankAccounts: true,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  async update(id: string, dto: UpdateCompanyDto, userId: string) {
    // Check access and role
    const membership = await this.prisma.companyUser.findFirst({
      where: {
        companyId: id,
        userId,
        role: { in: [CompanyRole.OWNER, CompanyRole.ADMIN] },
      },
    });

    if (!membership) {
      throw new ForbiddenException('No permission to update this company');
    }

    // Check CUI uniqueness if updating
    if (dto.cui) {
      const existing = await this.prisma.company.findFirst({
        where: {
          cui: dto.cui,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('Another company with this CUI already exists');
      }
    }

    return this.prisma.company.update({
      where: { id },
      data: dto,
      include: {
        users: {
          include: { user: true },
        },
        efacturaConfig: true,
      },
    });
  }

  async delete(id: string, userId: string) {
    // Only owner can delete
    const membership = await this.prisma.companyUser.findFirst({
      where: {
        companyId: id,
        userId,
        role: CompanyRole.OWNER,
      },
    });

    if (!membership) {
      throw new ForbiddenException('Only the owner can delete the company');
    }

    // Soft delete or hard delete based on business rules
    // For now, just delete (CASCADE will handle related records)
    return this.prisma.company.delete({
      where: { id },
    });
  }

  // Member management
  async addMember(companyId: string, dto: AddMemberDto, userId: string) {
    // Check if current user has permission
    const membership = await this.prisma.companyUser.findFirst({
      where: {
        companyId,
        userId,
        role: { in: [CompanyRole.OWNER, CompanyRole.ADMIN] },
      },
    });

    if (!membership) {
      throw new ForbiddenException('No permission to add members');
    }

    // Find user by email
    const targetUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!targetUser) {
      throw new NotFoundException('User with this email not found');
    }

    // Check if already a member
    const existingMembership = await this.prisma.companyUser.findUnique({
      where: {
        userId_companyId: {
          userId: targetUser.id,
          companyId,
        },
      },
    });

    if (existingMembership) {
      throw new ConflictException('User is already a member of this company');
    }

    return this.prisma.companyUser.create({
      data: {
        userId: targetUser.id,
        companyId,
        role: dto.role,
      },
      include: {
        user: true,
        company: true,
      },
    });
  }

  async updateMemberRole(companyId: string, memberId: string, dto: UpdateMemberRoleDto, userId: string) {
    // Check if current user has permission
    const membership = await this.prisma.companyUser.findFirst({
      where: {
        companyId,
        userId,
        role: { in: [CompanyRole.OWNER, CompanyRole.ADMIN] },
      },
    });

    if (!membership) {
      throw new ForbiddenException('No permission to update member roles');
    }

    // Cannot change owner's role unless you're the owner
    const targetMembership = await this.prisma.companyUser.findFirst({
      where: { companyId, userId: memberId },
    });

    if (!targetMembership) {
      throw new NotFoundException('Member not found');
    }

    if (targetMembership.role === CompanyRole.OWNER && membership.role !== CompanyRole.OWNER) {
      throw new ForbiddenException('Cannot change owner role');
    }

    return this.prisma.companyUser.update({
      where: {
        userId_companyId: {
          userId: memberId,
          companyId,
        },
      },
      data: { role: dto.role },
      include: {
        user: true,
      },
    });
  }

  async removeMember(companyId: string, memberId: string, userId: string) {
    // Check if current user has permission
    const membership = await this.prisma.companyUser.findFirst({
      where: {
        companyId,
        userId,
        role: { in: [CompanyRole.OWNER, CompanyRole.ADMIN] },
      },
    });

    if (!membership) {
      throw new ForbiddenException('No permission to remove members');
    }

    // Cannot remove owner
    const targetMembership = await this.prisma.companyUser.findFirst({
      where: { companyId, userId: memberId },
    });

    if (!targetMembership) {
      throw new NotFoundException('Member not found');
    }

    if (targetMembership.role === CompanyRole.OWNER) {
      throw new ForbiddenException('Cannot remove the company owner');
    }

    return this.prisma.companyUser.delete({
      where: {
        userId_companyId: {
          userId: memberId,
          companyId,
        },
      },
    });
  }

  async getMembers(companyId: string, userId: string) {
    // Check access
    const membership = await this.prisma.companyUser.findFirst({
      where: { companyId, userId },
    });

    if (!membership) {
      throw new ForbiddenException('No access to this company');
    }

    return this.prisma.companyUser.findMany({
      where: { companyId },
      include: {
        user: true,
      },
      orderBy: [
        { role: 'asc' },
        { user: { firstName: 'asc' } },
      ],
    });
  }

  // Statistics
  async getStats(companyId: string, userId: string) {
    // Check access
    const membership = await this.prisma.companyUser.findFirst({
      where: { companyId, userId },
    });

    if (!membership) {
      throw new ForbiddenException('No access to this company');
    }

    const [clientCount, productCount, invoiceStats, expenseStats] = await Promise.all([
      this.prisma.client.count({ where: { companyId } }),
      this.prisma.product.count({ where: { companyId, isActive: true } }),
      this.prisma.invoice.aggregate({
        where: { companyId },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.expense.aggregate({
        where: { companyId },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      clients: clientCount,
      products: productCount,
      invoices: {
        count: invoiceStats._count,
        total: invoiceStats._sum?.total || 0,
      },
      expenses: {
        count: expenseStats._count,
        total: expenseStats._sum?.amount || 0,
      },
    };
  }
}
