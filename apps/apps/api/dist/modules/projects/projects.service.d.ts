import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProjectDto, UpdateProjectDto, ProjectFilterDto } from './dto/project.dto';
import { Prisma } from '@prisma/client';
export declare class ProjectsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(companyId: string, dto: CreateProjectDto): Promise<{
        client: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        companyId: string;
        currency: string;
        status: import(".prisma/client").$Enums.ProjectStatus;
        description: string | null;
        clientId: string | null;
        code: string | null;
        startDate: Date | null;
        endDate: Date | null;
        budget: Prisma.Decimal | null;
    }>;
    findAll(companyId: string, filters: ProjectFilterDto): Promise<{
        data: ({
            client: {
                id: string;
                name: string;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            companyId: string;
            currency: string;
            status: import(".prisma/client").$Enums.ProjectStatus;
            description: string | null;
            clientId: string | null;
            code: string | null;
            startDate: Date | null;
            endDate: Date | null;
            budget: Prisma.Decimal | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(companyId: string, id: string): Promise<{
        client: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            companyId: string;
            cui: string | null;
            regCom: string | null;
            address: string | null;
            city: string | null;
            county: string | null;
            postalCode: string | null;
            country: string;
            bankName: string | null;
            iban: string | null;
            tags: string[];
            type: import(".prisma/client").$Enums.ClientType;
            contactName: string | null;
            contactEmail: string | null;
            contactPhone: string | null;
            defaultPaymentTerms: number;
            creditLimit: Prisma.Decimal | null;
            notes: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        companyId: string;
        currency: string;
        status: import(".prisma/client").$Enums.ProjectStatus;
        description: string | null;
        clientId: string | null;
        code: string | null;
        startDate: Date | null;
        endDate: Date | null;
        budget: Prisma.Decimal | null;
    }>;
    update(companyId: string, id: string, dto: UpdateProjectDto): Promise<{
        client: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        companyId: string;
        currency: string;
        status: import(".prisma/client").$Enums.ProjectStatus;
        description: string | null;
        clientId: string | null;
        code: string | null;
        startDate: Date | null;
        endDate: Date | null;
        budget: Prisma.Decimal | null;
    }>;
    delete(companyId: string, id: string): Promise<{
        message: string;
    }>;
    updateStatus(companyId: string, id: string, status: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        companyId: string;
        currency: string;
        status: import(".prisma/client").$Enums.ProjectStatus;
        description: string | null;
        clientId: string | null;
        code: string | null;
        startDate: Date | null;
        endDate: Date | null;
        budget: Prisma.Decimal | null;
    }>;
    getStats(companyId: string): Promise<{
        total: number;
        byStatus: {
            planning: number;
            inProgress: number;
            onHold: number;
            completed: number;
            cancelled: number;
        };
        totalBudget: number;
    }>;
    getByClient(companyId: string, clientId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        companyId: string;
        currency: string;
        status: import(".prisma/client").$Enums.ProjectStatus;
        description: string | null;
        clientId: string | null;
        code: string | null;
        startDate: Date | null;
        endDate: Date | null;
        budget: Prisma.Decimal | null;
    }[]>;
    getActiveProjects(companyId: string): Promise<({
        client: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        companyId: string;
        currency: string;
        status: import(".prisma/client").$Enums.ProjectStatus;
        description: string | null;
        clientId: string | null;
        code: string | null;
        startDate: Date | null;
        endDate: Date | null;
        budget: Prisma.Decimal | null;
    })[]>;
}
//# sourceMappingURL=projects.service.d.ts.map