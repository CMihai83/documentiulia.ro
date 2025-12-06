import {
  Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpCode, HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { AddMemberDto, UpdateMemberRoleDto } from './dto/add-member.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Companies')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new company' })
  @ApiResponse({ status: 201, description: 'Company created successfully' })
  @ApiResponse({ status: 409, description: 'Company with CUI already exists' })
  async create(@Body() dto: CreateCompanyDto, @CurrentUser() user: any) {
    return this.companiesService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all companies for current user' })
  @ApiResponse({ status: 200, description: 'Companies returned' })
  async findAll(@CurrentUser() user: any) {
    return this.companiesService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company by ID' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company returned' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.companiesService.findOne(id, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update company' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company updated' })
  @ApiResponse({ status: 403, description: 'No permission' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateCompanyDto, @CurrentUser() user: any) {
    return this.companiesService.update(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete company' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 204, description: 'Company deleted' })
  @ApiResponse({ status: 403, description: 'Only owner can delete' })
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.companiesService.delete(id, user.id);
  }

  // Members
  @Get(':id/members')
  @ApiOperation({ summary: 'Get company members' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Members returned' })
  async getMembers(@Param('id') id: string, @CurrentUser() user: any) {
    return this.companiesService.getMembers(id, user.id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add member to company' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 201, description: 'Member added' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Already a member' })
  async addMember(@Param('id') id: string, @Body() dto: AddMemberDto, @CurrentUser() user: any) {
    return this.companiesService.addMember(id, dto, user.id);
  }

  @Put(':id/members/:memberId')
  @ApiOperation({ summary: 'Update member role' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiParam({ name: 'memberId', description: 'Member user ID' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  async updateMemberRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser() user: any,
  ) {
    return this.companiesService.updateMemberRole(id, memberId, dto, user.id);
  }

  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove member from company' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiParam({ name: 'memberId', description: 'Member user ID' })
  @ApiResponse({ status: 204, description: 'Member removed' })
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: any,
  ) {
    return this.companiesService.removeMember(id, memberId, user.id);
  }

  // Stats
  @Get(':id/stats')
  @ApiOperation({ summary: 'Get company statistics' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Stats returned' })
  async getStats(@Param('id') id: string, @CurrentUser() user: any) {
    return this.companiesService.getStats(id, user.id);
  }
}
