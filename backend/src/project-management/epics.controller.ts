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
  Request,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EpicsService, Epic, EpicStatus } from './epics.service';

@ApiTags('Project Management - Epics')
@Controller('pm/epics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EpicsController {
  constructor(private readonly epicsService: EpicsService) {}

  // =================== EPICS ===================

  @Post()
  @ApiOperation({ summary: 'Create epic' })
  @ApiResponse({ status: 201, description: 'Epic created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async createEpic(
    @Request() req: any,
    @Body() body: {
      projectId?: string;
      title: string;
      description?: string;
      status?: EpicStatus;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      startDate?: string;
      targetDate?: string;
      color?: string;
      tags?: string[];
    },
  ) {
    try {
      // Validate required fields
      if (!body.title || body.title.trim().length === 0) {
        throw new HttpException(
          {
            success: false,
            error: 'Title is required',
            field: 'title',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const epic = await this.epicsService.createEpic({
        tenantId: req.user.tenantId,
        createdBy: req.user.id,
        createdByName: req.user.name,
        projectId: body.projectId,
        title: body.title.trim(),
        description: body.description,
        status: body.status,
        priority: body.priority,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        targetDate: body.targetDate ? new Date(body.targetDate) : undefined,
        color: body.color,
        tags: body.tags,
      });

      return {
        success: true,
        epic,
        message: 'Epic created successfully',
      };
    } catch (error) {
      // If it's already an HttpException, rethrow it
      if (error instanceof HttpException) {
        throw error;
      }

      // Log the error for debugging
      console.error('Epic creation error:', error);

      // Return a proper error response
      throw new HttpException(
        {
          success: false,
          error: error.message || 'Failed to create epic',
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get epics' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Epics list' })
  async getEpics(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      return await this.epicsService.getEpics(req.user.tenantId, {
        search,
        projectId,
        status: status as EpicStatus,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
      });
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message || 'Failed to fetch epics',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get epic details' })
  @ApiResponse({ status: 200, description: 'Epic details' })
  @ApiResponse({ status: 404, description: 'Epic not found' })
  async getEpic(@Param('id') id: string) {
    try {
      const epic = await this.epicsService.getEpic(id);
      if (!epic) {
        throw new HttpException(
          {
            success: false,
            error: 'Epic not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }
      return { success: true, epic };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          error: error.message || 'Failed to fetch epic',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update epic' })
  @ApiResponse({ status: 200, description: 'Epic updated' })
  @ApiResponse({ status: 404, description: 'Epic not found' })
  async updateEpic(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: Partial<{
      title: string;
      description: string;
      status: EpicStatus;
      priority: 'low' | 'medium' | 'high' | 'critical';
      startDate: string;
      targetDate: string;
      color: string;
      tags: string[];
      progress: number;
    }>,
  ) {
    try {
      const updates = {
        ...body,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        targetDate: body.targetDate ? new Date(body.targetDate) : undefined,
      };

      const epic = await this.epicsService.updateEpic(id, updates, req.user.id);
      if (!epic) {
        throw new HttpException(
          {
            success: false,
            error: 'Epic not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return { success: true, epic };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          error: error.message || 'Failed to update epic',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete epic' })
  @ApiResponse({ status: 200, description: 'Epic deleted' })
  @ApiResponse({ status: 404, description: 'Epic not found' })
  async deleteEpic(@Param('id') id: string) {
    try {
      await this.epicsService.deleteEpic(id);
      return { success: true, message: 'Epic deleted successfully' };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message || 'Failed to delete epic',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/tasks')
  @ApiOperation({ summary: 'Add tasks to epic' })
  @ApiResponse({ status: 200, description: 'Tasks added to epic' })
  async addTasksToEpic(
    @Param('id') id: string,
    @Body() body: { taskIds: string[] },
  ) {
    try {
      const epic = await this.epicsService.addTasks(id, body.taskIds);
      if (!epic) {
        throw new HttpException(
          {
            success: false,
            error: 'Epic not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return { success: true, epic };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          error: error.message || 'Failed to add tasks to epic',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id/tasks')
  @ApiOperation({ summary: 'Remove tasks from epic' })
  @ApiResponse({ status: 200, description: 'Tasks removed from epic' })
  async removeTasksFromEpic(
    @Param('id') id: string,
    @Body() body: { taskIds: string[] },
  ) {
    try {
      const epic = await this.epicsService.removeTasks(id, body.taskIds);
      if (!epic) {
        throw new HttpException(
          {
            success: false,
            error: 'Epic not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return { success: true, epic };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          error: error.message || 'Failed to remove tasks from epic',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get epic stats' })
  @ApiResponse({ status: 200, description: 'Epic stats' })
  async getEpicStats(@Param('id') id: string) {
    try {
      const stats = await this.epicsService.getEpicStats(id);
      return { success: true, stats };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message || 'Failed to fetch epic stats',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
