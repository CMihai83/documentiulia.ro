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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  TasksService,
  Task,
  TaskStatus,
  TaskPriority,
  TaskType,
  TaskLabel,
  TaskAttachment,
  LinkedTask,
} from './tasks.service';

@ApiTags('Project Management - Tasks')
@Controller('pm/tasks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // =================== TASKS ===================

  @Post()
  @ApiOperation({ summary: 'Create task' })
  @ApiResponse({ status: 201, description: 'Task created' })
  async createTask(
    @Request() req: any,
    @Body() body: {
      projectId?: string;
      title: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      type?: TaskType;
      assigneeId?: string;
      assigneeName?: string;
      dueDate?: string;
      startDate?: string;
      estimatedHours?: number;
      tags?: string[];
      labels?: TaskLabel[];
      parentTaskId?: string;
      customFields?: Record<string, any>;
    },
  ) {
    return this.tasksService.createTask({
      tenantId: req.user.tenantId,
      reporterId: req.user.id,
      reporterName: req.user.name,
      projectId: body.projectId,
      title: body.title,
      description: body.description,
      status: body.status,
      priority: body.priority,
      type: body.type,
      assigneeId: body.assigneeId,
      assigneeName: body.assigneeName,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      estimatedHours: body.estimatedHours,
      tags: body.tags,
      labels: body.labels,
      parentTaskId: body.parentTaskId,
      customFields: body.customFields,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get tasks' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'assigneeId', required: false })
  @ApiQuery({ name: 'isOverdue', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Tasks list' })
  async getTasks(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('type') type?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('isOverdue') isOverdue?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.tasksService.getTasks(req.user.tenantId, {
      search,
      projectId,
      status: status ? status.split(',') as TaskStatus[] : undefined,
      priority: priority ? priority.split(',') as TaskPriority[] : undefined,
      type: type ? type.split(',') as TaskType[] : undefined,
      assigneeId,
      isOverdue: isOverdue === 'true',
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Get('my-tasks')
  @ApiOperation({ summary: 'Get my assigned tasks' })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: 'My tasks' })
  async getMyTasks(
    @Request() req: any,
    @Query('status') status?: string,
  ) {
    return this.tasksService.getTasks(req.user.tenantId, {
      assigneeId: req.user.id,
      status: status ? status.split(',') as TaskStatus[] : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task details' })
  @ApiResponse({ status: 200, description: 'Task details' })
  async getTask(@Param('id') id: string) {
    const task = await this.tasksService.getTask(id);
    if (!task) {
      return { error: 'Task not found' };
    }
    return task;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update task' })
  @ApiResponse({ status: 200, description: 'Task updated' })
  async updateTask(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: Partial<Pick<Task,
      'title' | 'description' | 'status' | 'priority' | 'type' |
      'assigneeId' | 'assigneeName' | 'estimatedHours' | 'tags' |
      'labels' | 'progress' | 'customFields'
    > & { dueDate?: string; startDate?: string }>,
  ) {
    const updates = {
      ...body,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
    };
    const task = await this.tasksService.updateTask(id, updates, req.user.id);
    if (!task) {
      return { error: 'Task not found' };
    }
    return task;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete task' })
  @ApiResponse({ status: 200, description: 'Task deleted' })
  async deleteTask(@Param('id') id: string) {
    await this.tasksService.deleteTask(id);
    return { success: true };
  }

  @Post(':id/move')
  @ApiOperation({ summary: 'Move task to status' })
  @ApiResponse({ status: 200, description: 'Task moved' })
  async moveTask(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { status: TaskStatus },
  ) {
    const task = await this.tasksService.moveTask(id, body.status, req.user.id);
    if (!task) {
      return { error: 'Task not found' };
    }
    return task;
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign task' })
  @ApiResponse({ status: 200, description: 'Task assigned' })
  async assignTask(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { assigneeId: string; assigneeName?: string },
  ) {
    const task = await this.tasksService.assignTask(
      id,
      body.assigneeId,
      body.assigneeName,
      req.user.id,
    );
    if (!task) {
      return { error: 'Task not found' };
    }
    return task;
  }

  @Post(':id/unassign')
  @ApiOperation({ summary: 'Unassign task' })
  @ApiResponse({ status: 200, description: 'Task unassigned' })
  async unassignTask(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const task = await this.tasksService.unassignTask(id, req.user.id);
    if (!task) {
      return { error: 'Task not found' };
    }
    return task;
  }

  // =================== SUBTASKS ===================

  @Get(':id/subtasks')
  @ApiOperation({ summary: 'Get subtasks' })
  @ApiResponse({ status: 200, description: 'Subtasks' })
  async getSubtasks(@Param('id') id: string) {
    const subtasks = await this.tasksService.getSubtasks(id);
    return { subtasks, total: subtasks.length };
  }

  @Post(':id/subtasks')
  @ApiOperation({ summary: 'Create subtask' })
  @ApiResponse({ status: 201, description: 'Subtask created' })
  async createSubtask(
    @Request() req: any,
    @Param('id') parentId: string,
    @Body() body: {
      title: string;
      description?: string;
      assigneeId?: string;
      dueDate?: string;
    },
  ) {
    const parent = await this.tasksService.getTask(parentId);
    if (!parent) {
      return { error: 'Parent task not found' };
    }

    return this.tasksService.createTask({
      tenantId: req.user.tenantId,
      reporterId: req.user.id,
      projectId: parent.projectId,
      title: body.title,
      description: body.description,
      assigneeId: body.assigneeId,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      parentTaskId: parentId,
    });
  }

  @Post(':id/convert-to-subtask')
  @ApiOperation({ summary: 'Convert task to subtask' })
  @ApiResponse({ status: 200, description: 'Task converted' })
  async convertToSubtask(
    @Param('id') id: string,
    @Body() body: { parentTaskId: string },
  ) {
    const task = await this.tasksService.convertToSubtask(id, body.parentTaskId);
    if (!task) {
      return { error: 'Task or parent not found' };
    }
    return task;
  }

  @Post(':id/promote')
  @ApiOperation({ summary: 'Promote subtask to task' })
  @ApiResponse({ status: 200, description: 'Subtask promoted' })
  async promoteToTask(@Param('id') id: string) {
    const task = await this.tasksService.promoteToTask(id);
    if (!task) {
      return { error: 'Task not found or not a subtask' };
    }
    return task;
  }

  // =================== LINKED TASKS ===================

  @Post(':id/link')
  @ApiOperation({ summary: 'Link tasks' })
  @ApiResponse({ status: 200, description: 'Tasks linked' })
  async linkTask(
    @Param('id') id: string,
    @Body() body: { linkedTaskId: string; type: LinkedTask['type'] },
  ) {
    const task = await this.tasksService.linkTasks(id, body.linkedTaskId, body.type);
    if (!task) {
      return { error: 'Task not found' };
    }
    return task;
  }

  @Delete(':id/link/:linkedTaskId')
  @ApiOperation({ summary: 'Unlink tasks' })
  @ApiResponse({ status: 200, description: 'Tasks unlinked' })
  async unlinkTask(
    @Param('id') id: string,
    @Param('linkedTaskId') linkedTaskId: string,
  ) {
    const task = await this.tasksService.unlinkTasks(id, linkedTaskId);
    if (!task) {
      return { error: 'Task not found' };
    }
    return task;
  }

  // =================== COMMENTS ===================

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add comment' })
  @ApiResponse({ status: 201, description: 'Comment added' })
  async addComment(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: {
      content: string;
      mentions?: string[];
      attachments?: TaskAttachment[];
    },
  ) {
    return this.tasksService.addComment({
      taskId: id,
      content: body.content,
      userId: req.user.id,
      userName: req.user.name,
      mentions: body.mentions,
      attachments: body.attachments,
    });
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get comments' })
  @ApiResponse({ status: 200, description: 'Comments' })
  async getComments(@Param('id') id: string) {
    const comments = await this.tasksService.getComments(id);
    return { comments, total: comments.length };
  }

  @Put('comments/:commentId')
  @ApiOperation({ summary: 'Update comment' })
  @ApiResponse({ status: 200, description: 'Comment updated' })
  async updateComment(
    @Param('commentId') commentId: string,
    @Body() body: { content: string },
  ) {
    const comment = await this.tasksService.updateComment(commentId, body.content);
    if (!comment) {
      return { error: 'Comment not found' };
    }
    return comment;
  }

  @Delete('comments/:commentId')
  @ApiOperation({ summary: 'Delete comment' })
  @ApiResponse({ status: 200, description: 'Comment deleted' })
  async deleteComment(@Param('commentId') commentId: string) {
    await this.tasksService.deleteComment(commentId);
    return { success: true };
  }

  // =================== HISTORY ===================

  @Get(':id/history')
  @ApiOperation({ summary: 'Get task history' })
  @ApiResponse({ status: 200, description: 'Task history' })
  async getHistory(@Param('id') id: string) {
    const history = await this.tasksService.getHistory(id);
    return { history, total: history.length };
  }

  // =================== ATTACHMENTS ===================

  @Post(':id/attachments')
  @ApiOperation({ summary: 'Add attachment' })
  @ApiResponse({ status: 201, description: 'Attachment added' })
  async addAttachment(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: Omit<TaskAttachment, 'id'>,
  ) {
    const task = await this.tasksService.addAttachment(id, {
      ...body,
      uploadedBy: req.user.id,
      uploadedAt: new Date(),
    });
    if (!task) {
      return { error: 'Task not found' };
    }
    return task;
  }

  @Delete(':id/attachments/:attachmentId')
  @ApiOperation({ summary: 'Remove attachment' })
  @ApiResponse({ status: 200, description: 'Attachment removed' })
  async removeAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    const task = await this.tasksService.removeAttachment(id, attachmentId);
    if (!task) {
      return { error: 'Task not found' };
    }
    return task;
  }

  // =================== WATCHERS ===================

  @Post(':id/watchers')
  @ApiOperation({ summary: 'Add watcher' })
  @ApiResponse({ status: 200, description: 'Watcher added' })
  async addWatcher(
    @Param('id') id: string,
    @Body() body: { userId: string },
  ) {
    const task = await this.tasksService.addWatcher(id, body.userId);
    if (!task) {
      return { error: 'Task not found' };
    }
    return task;
  }

  @Delete(':id/watchers/:userId')
  @ApiOperation({ summary: 'Remove watcher' })
  @ApiResponse({ status: 200, description: 'Watcher removed' })
  async removeWatcher(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    const task = await this.tasksService.removeWatcher(id, userId);
    if (!task) {
      return { error: 'Task not found' };
    }
    return task;
  }

  // =================== LABELS ===================

  @Get('labels/all')
  @ApiOperation({ summary: 'Get labels' })
  @ApiResponse({ status: 200, description: 'Labels' })
  async getLabels(@Request() req: any) {
    const labels = await this.tasksService.getLabels(req.user.tenantId);
    return { labels };
  }

  @Post('labels')
  @ApiOperation({ summary: 'Create label' })
  @ApiResponse({ status: 201, description: 'Label created' })
  async createLabel(
    @Request() req: any,
    @Body() body: { name: string; color: string },
  ) {
    return this.tasksService.createLabel(req.user.tenantId, body);
  }

  @Delete('labels/:id')
  @ApiOperation({ summary: 'Delete label' })
  @ApiResponse({ status: 200, description: 'Label deleted' })
  async deleteLabel(@Param('id') id: string) {
    await this.tasksService.deleteLabel(id);
    return { success: true };
  }

  // =================== BULK OPERATIONS ===================

  @Post('bulk/update')
  @ApiOperation({ summary: 'Bulk update tasks' })
  @ApiResponse({ status: 200, description: 'Tasks updated' })
  async bulkUpdate(
    @Request() req: any,
    @Body() body: {
      taskIds: string[];
      updates: Partial<Pick<Task, 'status' | 'priority' | 'assigneeId' | 'tags'>>;
    },
  ) {
    return this.tasksService.bulkUpdateTasks(body.taskIds, body.updates, req.user.id);
  }

  @Post('bulk/delete')
  @ApiOperation({ summary: 'Bulk delete tasks' })
  @ApiResponse({ status: 200, description: 'Tasks deleted' })
  async bulkDelete(@Body() body: { taskIds: string[] }) {
    return this.tasksService.bulkDeleteTasks(body.taskIds);
  }

  // =================== STATS ===================

  @Get('stats/overview')
  @ApiOperation({ summary: 'Get task stats' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiResponse({ status: 200, description: 'Task stats' })
  async getStats(
    @Request() req: any,
    @Query('projectId') projectId?: string,
  ) {
    return this.tasksService.getStats(req.user.tenantId, projectId);
  }
}
