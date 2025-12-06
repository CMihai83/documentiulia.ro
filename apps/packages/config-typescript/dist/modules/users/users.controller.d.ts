import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getMe(user: any): Promise<{
        companies: ({
            company: {
                id: string;
                email: string | null;
                phone: string | null;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                cui: string;
                regCom: string | null;
                euid: string | null;
                address: string | null;
                city: string | null;
                county: string | null;
                postalCode: string | null;
                country: string;
                website: string | null;
                bankName: string | null;
                iban: string | null;
                swift: string | null;
                vatPayer: boolean;
                vatNumber: string | null;
                vatRate: import("@prisma/client/runtime/library").Decimal;
                fiscalYear: number;
                currency: string;
                subscriptionPlan: string;
                subscriptionEndsAt: Date | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            companyId: string;
            role: import(".prisma/client").$Enums.CompanyRole;
            canManageUsers: boolean;
            canManageFinances: boolean;
            canManageSettings: boolean;
            canViewReports: boolean;
        })[];
    } & {
        id: string;
        clerkId: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
        avatarUrl: string | null;
        locale: string;
        timezone: string;
        emailNotifications: boolean;
        pushNotifications: boolean;
        createdAt: Date;
        updatedAt: Date;
        lastLoginAt: Date | null;
    }>;
    updateMe(user: any, dto: UpdateUserDto): Promise<{
        companies: ({
            company: {
                id: string;
                email: string | null;
                phone: string | null;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                cui: string;
                regCom: string | null;
                euid: string | null;
                address: string | null;
                city: string | null;
                county: string | null;
                postalCode: string | null;
                country: string;
                website: string | null;
                bankName: string | null;
                iban: string | null;
                swift: string | null;
                vatPayer: boolean;
                vatNumber: string | null;
                vatRate: import("@prisma/client/runtime/library").Decimal;
                fiscalYear: number;
                currency: string;
                subscriptionPlan: string;
                subscriptionEndsAt: Date | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            companyId: string;
            role: import(".prisma/client").$Enums.CompanyRole;
            canManageUsers: boolean;
            canManageFinances: boolean;
            canManageSettings: boolean;
            canViewReports: boolean;
        })[];
    } & {
        id: string;
        clerkId: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
        avatarUrl: string | null;
        locale: string;
        timezone: string;
        emailNotifications: boolean;
        pushNotifications: boolean;
        createdAt: Date;
        updatedAt: Date;
        lastLoginAt: Date | null;
    }>;
    getMyCompanies(user: any): Promise<({
        company: {
            id: string;
            email: string | null;
            phone: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            cui: string;
            regCom: string | null;
            euid: string | null;
            address: string | null;
            city: string | null;
            county: string | null;
            postalCode: string | null;
            country: string;
            website: string | null;
            bankName: string | null;
            iban: string | null;
            swift: string | null;
            vatPayer: boolean;
            vatNumber: string | null;
            vatRate: import("@prisma/client/runtime/library").Decimal;
            fiscalYear: number;
            currency: string;
            subscriptionPlan: string;
            subscriptionEndsAt: Date | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        companyId: string;
        role: import(".prisma/client").$Enums.CompanyRole;
        canManageUsers: boolean;
        canManageFinances: boolean;
        canManageSettings: boolean;
        canViewReports: boolean;
    })[]>;
    findOne(id: string): Promise<{
        companies: ({
            company: {
                id: string;
                email: string | null;
                phone: string | null;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                cui: string;
                regCom: string | null;
                euid: string | null;
                address: string | null;
                city: string | null;
                county: string | null;
                postalCode: string | null;
                country: string;
                website: string | null;
                bankName: string | null;
                iban: string | null;
                swift: string | null;
                vatPayer: boolean;
                vatNumber: string | null;
                vatRate: import("@prisma/client/runtime/library").Decimal;
                fiscalYear: number;
                currency: string;
                subscriptionPlan: string;
                subscriptionEndsAt: Date | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            companyId: string;
            role: import(".prisma/client").$Enums.CompanyRole;
            canManageUsers: boolean;
            canManageFinances: boolean;
            canManageSettings: boolean;
            canViewReports: boolean;
        })[];
    } & {
        id: string;
        clerkId: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
        avatarUrl: string | null;
        locale: string;
        timezone: string;
        emailNotifications: boolean;
        pushNotifications: boolean;
        createdAt: Date;
        updatedAt: Date;
        lastLoginAt: Date | null;
    }>;
}
//# sourceMappingURL=users.controller.d.ts.map