import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto, ProjectFilterDto } from './dto/project.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk.guard';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('companies/:companyId/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 201, description: 'Project created' })
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectsService.create(companyId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Projects returned' })
  async findAll(
    @Param('companyId') companyId: string,
    @Query() filters: ProjectFilterDto,
  ) {
    return this.projectsService.findAll(companyId, filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get project statistics' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Project stats returned' })
  async getStats(@Param('companyId') companyId: string) {
    return this.projectsService.getStats(companyId);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active projects' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Active projects returned' })
  async getActiveProjects(@Param('companyId') companyId: string) {
    return this.projectsService.getActiveProjects(companyId);
  }

  @Get('client/:clientId')
  @ApiOperation({ summary: 'Get projects by client' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'clientId', description: 'Client ID' })
  @ApiResponse({ status: 200, description: 'Client projects returned' })
  async getByClient(
    @Param('companyId') companyId: string,
    @Param('clientId') clientId: string,
  ) {
    return this.projectsService.getByClient(companyId, clientId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a project by ID' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Project returned' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.projectsService.findOne(companyId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a project' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Project updated' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(companyId, id, dto);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update project status' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateStatus(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.projectsService.updateStatus(companyId, id, status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a project' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Project deleted' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async delete(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.projectsService.delete(companyId, id);
  }
}
