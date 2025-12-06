"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let AuthService = class AuthService {
    prisma;
    config;
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
    }
    async validateClerkUser(clerkId) {
        const user = await this.prisma.user.findUnique({
            where: { clerkId },
            include: {
                companies: {
                    include: {
                        company: true,
                    },
                },
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        return user;
    }
    async syncClerkUser(clerkData) {
        const email = clerkData.emailAddresses[0]?.emailAddress;
        const phone = clerkData.phoneNumbers?.[0]?.phoneNumber;
        return this.prisma.user.upsert({
            where: { clerkId: clerkData.id },
            update: {
                email,
                firstName: clerkData.firstName,
                lastName: clerkData.lastName,
                avatarUrl: clerkData.imageUrl,
                phone,
                lastLoginAt: new Date(),
            },
            create: {
                clerkId: clerkData.id,
                email,
                firstName: clerkData.firstName,
                lastName: clerkData.lastName,
                avatarUrl: clerkData.imageUrl,
                phone,
            },
        });
    }
    async getUserCompanies(userId) {
        return this.prisma.companyUser.findMany({
            where: { userId },
            include: {
                company: true,
            },
        });
    }
    async getDefaultCompany(userId) {
        const companyUser = await this.prisma.companyUser.findFirst({
            where: { userId },
            include: { company: true },
            orderBy: { createdAt: 'asc' },
        });
        return companyUser?.company;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map