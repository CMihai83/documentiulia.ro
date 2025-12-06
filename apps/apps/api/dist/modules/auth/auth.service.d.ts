import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
export declare class AuthService {
    private readonly prisma;
    private readonly config;
    constructor(prisma: PrismaService, config: ConfigService);
    validateClerkUser(clerkId: string): Promise<{
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
    syncClerkUser(clerkData: {
        id: string;
        emailAddresses: Array<{
            emailAddress: string;
        }>;
        firstName?: string;
        lastName?: string;
        imageUrl?: string;
        phoneNumbers?: Array<{
            phoneNumber: string;
        }>;
    }): Promise<{
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
    getUserCompanies(userId: string): Promise<({
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
    getDefaultCompany(userId: string): Promise<{
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
    } | undefined>;
}
//# sourceMappingURL=auth.service.d.ts.map