import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHRContractDto } from './dto/create-hr-contract.dto';
import { UpdateHRContractDto, SignContractDto } from './dto/update-hr-contract.dto';
import { HRContractStatus, Prisma } from '@prisma/client';

@Injectable()
export class HRContractsService {
  private readonly logger = new Logger(HRContractsService.name);

  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateHRContractDto) {
    // Verify employee exists and belongs to user
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, userId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Check for existing active contract
    const existingContract = await this.prisma.hRContract.findFirst({
      where: {
        employeeId: dto.employeeId,
        status: { in: ['ACTIVE', 'PENDING_SIGNATURE'] },
      },
    });

    if (existingContract) {
      throw new BadRequestException('Employee already has an active contract');
    }

    const contract = await this.prisma.hRContract.create({
      data: {
        userId,
        employeeId: dto.employeeId,
        type: dto.type,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        probationEnd: dto.probationEnd ? new Date(dto.probationEnd) : null,
        salary: dto.salary,
        currency: dto.currency || 'RON',
        workHours: dto.workHours || 40,
        position: dto.position,
        department: dto.department,
        nonCompete: dto.nonCompete || false,
        telework: dto.telework || false,
        teleworkDays: dto.teleworkDays,
        templateId: dto.templateId,
        status: HRContractStatus.DRAFT,
      },
      include: {
        employee: true,
      },
    });

    this.logger.log(`Created HR contract ${contract.id} for employee ${dto.employeeId}`);
    return contract;
  }

  async findAll(userId: string, options?: {
    status?: HRContractStatus;
    employeeId?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, employeeId, page = 1, limit = 20 } = options || {};

    const where: Prisma.HRContractWhereInput = {
      userId,
      ...(status && { status }),
      ...(employeeId && { employeeId }),
    };

    const [contracts, total] = await Promise.all([
      this.prisma.hRContract.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              position: true,
            },
          },
          amendments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.hRContract.count({ where }),
    ]);

    return {
      data: contracts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(userId: string, id: string) {
    const contract = await this.prisma.hRContract.findFirst({
      where: { id, userId },
      include: {
        employee: true,
        amendments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    return contract;
  }

  async update(userId: string, id: string, dto: UpdateHRContractDto) {
    const contract = await this.findOne(userId, id);

    if (contract.status === HRContractStatus.ACTIVE && dto.status !== HRContractStatus.TERMINATED) {
      // For active contracts, changes should go through amendment process
      throw new BadRequestException('Active contracts can only be modified through amendments');
    }

    const updated = await this.prisma.hRContract.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        probationEnd: dto.probationEnd ? new Date(dto.probationEnd) : undefined,
      },
      include: {
        employee: true,
      },
    });

    this.logger.log(`Updated HR contract ${id}`);
    return updated;
  }

  async signContract(userId: string, id: string, dto: SignContractDto) {
    const contract = await this.findOne(userId, id);

    if (contract.status !== HRContractStatus.DRAFT && contract.status !== HRContractStatus.PENDING_SIGNATURE) {
      throw new BadRequestException('Contract is not in a signable state');
    }

    const updateData: Prisma.HRContractUpdateInput = {
      signatureUrl: dto.signatureUrl,
      signedAt: new Date(),
    };

    if (dto.signerType === 'employee') {
      updateData.signedByEmployee = true;
    } else {
      updateData.signedByEmployer = true;
    }

    // Check if both parties have signed
    const willBeFullySigned =
      (dto.signerType === 'employee' && contract.signedByEmployer) ||
      (dto.signerType === 'employer' && contract.signedByEmployee);

    if (willBeFullySigned) {
      updateData.status = HRContractStatus.ACTIVE;
    } else if (contract.status === HRContractStatus.DRAFT) {
      updateData.status = HRContractStatus.PENDING_SIGNATURE;
    }

    const updated = await this.prisma.hRContract.update({
      where: { id },
      data: updateData,
      include: { employee: true },
    });

    this.logger.log(`Contract ${id} signed by ${dto.signerType}`);
    return updated;
  }

  async submitToRevisal(userId: string, id: string) {
    const contract = await this.findOne(userId, id);

    if (contract.status !== HRContractStatus.ACTIVE) {
      throw new BadRequestException('Only active contracts can be submitted to REVISAL');
    }

    if (contract.revisalSubmitted) {
      throw new BadRequestException('Contract already submitted to REVISAL');
    }

    // TODO: Implement actual REVISAL API integration
    // For now, simulate submission
    const revisalId = `REV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const updated = await this.prisma.hRContract.update({
      where: { id },
      data: {
        revisalSubmitted: true,
        revisalId,
        revisalStatus: 'PENDING',
      },
      include: { employee: true },
    });

    this.logger.log(`Contract ${id} submitted to REVISAL with ID ${revisalId}`);
    return updated;
  }

  async createAmendment(userId: string, contractId: string, data: {
    reason: string;
    changes: Record<string, any>;
    effectiveDate: string;
  }) {
    const contract = await this.findOne(userId, contractId);

    if (contract.status !== HRContractStatus.ACTIVE) {
      throw new BadRequestException('Amendments can only be created for active contracts');
    }

    const amendment = await this.prisma.hRContractAmendment.create({
      data: {
        contractId,
        reason: data.reason,
        changes: data.changes,
        effectiveDate: new Date(data.effectiveDate),
      },
    });

    // Update contract with new values from amendment
    await this.prisma.hRContract.update({
      where: { id: contractId },
      data: {
        ...data.changes,
        templateVersion: { increment: 1 },
      },
    });

    this.logger.log(`Created amendment ${amendment.id} for contract ${contractId}`);
    return amendment;
  }

  async terminate(userId: string, id: string, reason?: string) {
    const contract = await this.findOne(userId, id);

    if (contract.status === HRContractStatus.TERMINATED) {
      throw new BadRequestException('Contract is already terminated');
    }

    const updated = await this.prisma.hRContract.update({
      where: { id },
      data: {
        status: HRContractStatus.TERMINATED,
        endDate: new Date(),
      },
      include: { employee: true },
    });

    this.logger.log(`Contract ${id} terminated. Reason: ${reason || 'Not specified'}`);
    return updated;
  }

  async getStatistics(userId: string) {
    const [total, active, draft, pendingSignature, terminated] = await Promise.all([
      this.prisma.hRContract.count({ where: { userId } }),
      this.prisma.hRContract.count({ where: { userId, status: HRContractStatus.ACTIVE } }),
      this.prisma.hRContract.count({ where: { userId, status: HRContractStatus.DRAFT } }),
      this.prisma.hRContract.count({ where: { userId, status: HRContractStatus.PENDING_SIGNATURE } }),
      this.prisma.hRContract.count({ where: { userId, status: HRContractStatus.TERMINATED } }),
    ]);

    const expiringContracts = await this.prisma.hRContract.findMany({
      where: {
        userId,
        status: HRContractStatus.ACTIVE,
        endDate: {
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          gte: new Date(),
        },
      },
      include: { employee: true },
      orderBy: { endDate: 'asc' },
    });

    return {
      total,
      byStatus: {
        active,
        draft,
        pendingSignature,
        terminated,
      },
      expiringContracts,
    };
  }
}
