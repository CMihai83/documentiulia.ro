import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TenantGuard } from './tenant.guard';
import { TenantService } from './tenant.service';
import { Roles } from '../auth/roles.decorator';
import { OrgRoles, TenantScope, CurrentOrg, CurrentOrgRole, OrganizationContext } from './tenant.decorator';
import { UserRole, OrgRole } from '@prisma/client';
import { ORG_HEADER } from './tenant.guard';

class CreateOrganizationDto {
  name: string;
  cui: string;
  address?: string;
  email?: string;
  phone?: string;
}

class AddMemberDto {
  userId: string;
  role?: OrgRole;
}

class UpdateMemberRoleDto {
  role: OrgRole;
}

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get('my')
  @ApiOperation({ summary: 'Get current user organizations' })
  async getMyOrganizations(@Request() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID required');
    }

    const memberships = await this.tenantService.getUserOrganizations(userId);
    return {
      organizations: memberships.map((m) => ({
        ...m.organization,
        role: m.role,
        membershipId: m.id,
      })),
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiBody({ type: CreateOrganizationDto })
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  async createOrganization(
    @Request() req: any,
    @Body() dto: CreateOrganizationDto,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID required');
    }

    if (!dto.name || !dto.cui) {
      throw new BadRequestException('Organization name and CUI are required');
    }

    const org = await this.tenantService.createOrganization(userId, dto);
    return {
      organization: org,
      message: 'Organization created successfully',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization details' })
  @ApiHeader({ name: ORG_HEADER, description: 'Organization ID', required: true })
  @UseGuards(TenantGuard)
  @TenantScope()
  async getOrganization(
    @Param('id') id: string,
    @CurrentOrg() org: OrganizationContext,
  ) {
    return {
      organization: org,
    };
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get organization members' })
  @ApiHeader({ name: ORG_HEADER, description: 'Organization ID', required: true })
  @UseGuards(TenantGuard)
  @TenantScope()
  @OrgRoles(OrgRole.OWNER, OrgRole.ADMIN)
  async getMembers(
    @Param('id') id: string,
    @CurrentOrg() org: OrganizationContext,
  ) {
    const members = await this.tenantService.getOrganizationMembers(org.id);
    return {
      members: members.map((m) => ({
        id: m.id,
        userId: m.user.id,
        email: m.user.email,
        name: m.user.name,
        role: m.role,
      })),
    };
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add member to organization' })
  @ApiHeader({ name: ORG_HEADER, description: 'Organization ID', required: true })
  @ApiBody({ type: AddMemberDto })
  @UseGuards(TenantGuard)
  @TenantScope()
  @OrgRoles(OrgRole.OWNER, OrgRole.ADMIN)
  async addMember(
    @Param('id') id: string,
    @CurrentOrg() org: OrganizationContext,
    @Body() dto: AddMemberDto,
  ) {
    if (!dto.userId) {
      throw new BadRequestException('User ID is required');
    }

    const membership = await this.tenantService.addMember(
      org.id,
      dto.userId,
      dto.role || OrgRole.MEMBER,
    );

    return {
      membership,
      message: 'Member added successfully',
    };
  }

  @Put(':id/members/:userId')
  @ApiOperation({ summary: 'Update member role' })
  @ApiHeader({ name: ORG_HEADER, description: 'Organization ID', required: true })
  @ApiBody({ type: UpdateMemberRoleDto })
  @UseGuards(TenantGuard)
  @TenantScope()
  @OrgRoles(OrgRole.OWNER, OrgRole.ADMIN)
  async updateMemberRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentOrg() org: OrganizationContext,
    @CurrentOrgRole() currentRole: OrgRole,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    // Only owner can change someone to owner
    if (dto.role === OrgRole.OWNER && currentRole !== OrgRole.OWNER) {
      throw new BadRequestException('Only owners can assign owner role');
    }

    const membership = await this.tenantService.updateMemberRole(
      org.id,
      userId,
      dto.role,
    );

    return {
      membership,
      message: 'Member role updated successfully',
    };
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove member from organization' })
  @ApiHeader({ name: ORG_HEADER, description: 'Organization ID', required: true })
  @UseGuards(TenantGuard)
  @TenantScope()
  @OrgRoles(OrgRole.OWNER, OrgRole.ADMIN)
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentOrg() org: OrganizationContext,
    @Request() req: any,
  ) {
    // Can't remove yourself
    if (req.user.id === userId) {
      throw new BadRequestException('Cannot remove yourself from organization');
    }

    await this.tenantService.removeMember(org.id, userId);

    return {
      message: 'Member removed successfully',
    };
  }

  @Post('switch/:id')
  @ApiOperation({ summary: 'Switch active organization' })
  async switchOrganization(
    @Param('id') organizationId: string,
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID required');
    }

    const membership = await this.tenantService.switchOrganization(
      userId,
      organizationId,
    );

    return {
      organization: membership.organization,
      role: membership.role,
      message: 'Organization switched successfully',
    };
  }
}
