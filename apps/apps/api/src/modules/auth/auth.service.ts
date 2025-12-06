import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async validateClerkUser(clerkId: string) {
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
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async syncClerkUser(clerkData: {
    id: string;
    emailAddresses: Array<{ emailAddress: string }>;
    firstName?: string;
    lastName?: string;
    imageUrl?: string;
    phoneNumbers?: Array<{ phoneNumber: string }>;
  }) {
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

  async getUserCompanies(userId: string) {
    return this.prisma.companyUser.findMany({
      where: { userId },
      include: {
        company: true,
      },
    });
  }

  async getDefaultCompany(userId: string) {
    const companyUser = await this.prisma.companyUser.findFirst({
      where: { userId },
      include: { company: true },
      orderBy: { createdAt: 'asc' },
    });

    return companyUser?.company;
  }
}
