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
  KanbanService,
  KanbanBoard,
  KanbanColumn,
  BoardSettings,
  BoardFilter,
  Swimlane,
} from './kanban.service';

@ApiTags('Project Management - Kanban')
@Controller('pm/kanban')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class KanbanController {
  constructor(private readonly kanbanService: KanbanService) {}

  // =================== BOARDS ===================

  @Post('boards')
  @ApiOperation({ summary: 'Create board' })
  @ApiResponse({ status: 201, description: 'Board created' })
  async createBoard(
    @Request() req: any,
    @Body() body: {
      projectId?: string;
      name: string;
      description?: string;
      type?: KanbanBoard['type'];
      columns?: Omit<KanbanColumn, 'id' | 'order'>[];
      settings?: Partial<BoardSettings>;
      isDefault?: boolean;
    },
  ) {
    return this.kanbanService.createBoard({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Get('boards')
  @ApiOperation({ summary: 'Get boards' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiResponse({ status: 200, description: 'Boards list' })
  async getBoards(
    @Request() req: any,
    @Query('projectId') projectId?: string,
  ) {
    const boards = await this.kanbanService.getBoards(req.user.tenantId, projectId);
    return { boards, total: boards.length };
  }

  @Get('boards/:id')
  @ApiOperation({ summary: 'Get board details' })
  @ApiResponse({ status: 200, description: 'Board details' })
  async getBoard(@Param('id') id: string) {
    const board = await this.kanbanService.getBoard(id);
    if (!board) {
      return { error: 'Board not found' };
    }
    return board;
  }

  @Put('boards/:id')
  @ApiOperation({ summary: 'Update board' })
  @ApiResponse({ status: 200, description: 'Board updated' })
  async updateBoard(
    @Param('id') id: string,
    @Body() body: Partial<Pick<KanbanBoard, 'name' | 'description' | 'settings' | 'isDefault'>>,
  ) {
    const board = await this.kanbanService.updateBoard(id, body);
    if (!board) {
      return { error: 'Board not found' };
    }
    return board;
  }

  @Delete('boards/:id')
  @ApiOperation({ summary: 'Delete board' })
  @ApiResponse({ status: 200, description: 'Board deleted' })
  async deleteBoard(@Param('id') id: string) {
    await this.kanbanService.deleteBoard(id);
    return { success: true };
  }

  // =================== COLUMNS ===================

  @Post('boards/:boardId/columns')
  @ApiOperation({ summary: 'Add column' })
  @ApiResponse({ status: 201, description: 'Column added' })
  async addColumn(
    @Param('boardId') boardId: string,
    @Body() body: Omit<KanbanColumn, 'id' | 'order'>,
  ) {
    const board = await this.kanbanService.addColumn(boardId, body);
    if (!board) {
      return { error: 'Board not found' };
    }
    return board;
  }

  @Put('boards/:boardId/columns/:columnId')
  @ApiOperation({ summary: 'Update column' })
  @ApiResponse({ status: 200, description: 'Column updated' })
  async updateColumn(
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
    @Body() body: Partial<KanbanColumn>,
  ) {
    const board = await this.kanbanService.updateColumn(boardId, columnId, body);
    if (!board) {
      return { error: 'Board or column not found' };
    }
    return board;
  }

  @Post('boards/:boardId/columns/reorder')
  @ApiOperation({ summary: 'Reorder columns' })
  @ApiResponse({ status: 200, description: 'Columns reordered' })
  async reorderColumns(
    @Param('boardId') boardId: string,
    @Body() body: { columnIds: string[] },
  ) {
    const board = await this.kanbanService.reorderColumns(boardId, body.columnIds);
    if (!board) {
      return { error: 'Board not found' };
    }
    return board;
  }

  @Delete('boards/:boardId/columns/:columnId')
  @ApiOperation({ summary: 'Delete column' })
  @ApiResponse({ status: 200, description: 'Column deleted' })
  async deleteColumn(
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
    @Query('moveToColumnId') moveToColumnId?: string,
  ) {
    const board = await this.kanbanService.deleteColumn(boardId, columnId, moveToColumnId);
    if (!board) {
      return { error: 'Board not found' };
    }
    return board;
  }

  // =================== CARDS ===================

  @Post('boards/:boardId/cards')
  @ApiOperation({ summary: 'Add card' })
  @ApiResponse({ status: 201, description: 'Card added' })
  async addCard(
    @Param('boardId') boardId: string,
    @Body() body: {
      taskId: string;
      columnId: string;
      swimlaneId?: string;
      position?: number;
    },
  ) {
    return this.kanbanService.addCard({
      boardId,
      ...body,
    });
  }

  @Get('boards/:boardId/cards')
  @ApiOperation({ summary: 'Get board cards' })
  @ApiResponse({ status: 200, description: 'Board cards' })
  async getCards(@Param('boardId') boardId: string) {
    const cards = await this.kanbanService.getCards(boardId);
    return { cards, total: cards.length };
  }

  @Get('boards/:boardId/columns/:columnId/cards')
  @ApiOperation({ summary: 'Get column cards' })
  @ApiResponse({ status: 200, description: 'Column cards' })
  async getColumnCards(
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
  ) {
    const cards = await this.kanbanService.getCardsByColumn(boardId, columnId);
    return { cards, total: cards.length };
  }

  @Post('cards/:cardId/move')
  @ApiOperation({ summary: 'Move card' })
  @ApiResponse({ status: 200, description: 'Card moved' })
  async moveCard(
    @Request() req: any,
    @Param('cardId') cardId: string,
    @Body() body: { toColumnId: string; position: number },
  ) {
    const card = await this.kanbanService.moveCard(
      cardId,
      body.toColumnId,
      body.position,
      req.user.id,
    );
    if (!card) {
      return { error: 'Card not found' };
    }
    return card;
  }

  @Delete('cards/:cardId')
  @ApiOperation({ summary: 'Remove card' })
  @ApiResponse({ status: 200, description: 'Card removed' })
  async removeCard(@Param('cardId') cardId: string) {
    await this.kanbanService.removeCard(cardId);
    return { success: true };
  }

  // =================== SWIMLANES ===================

  @Post('boards/:boardId/swimlanes')
  @ApiOperation({ summary: 'Add swimlane' })
  @ApiResponse({ status: 201, description: 'Swimlane added' })
  async addSwimlane(
    @Param('boardId') boardId: string,
    @Body() body: Omit<Swimlane, 'id' | 'order'>,
  ) {
    const board = await this.kanbanService.addSwimlane(boardId, body);
    if (!board) {
      return { error: 'Board not found' };
    }
    return board;
  }

  @Delete('boards/:boardId/swimlanes/:swimlaneId')
  @ApiOperation({ summary: 'Remove swimlane' })
  @ApiResponse({ status: 200, description: 'Swimlane removed' })
  async removeSwimlane(
    @Param('boardId') boardId: string,
    @Param('swimlaneId') swimlaneId: string,
  ) {
    const board = await this.kanbanService.removeSwimlane(boardId, swimlaneId);
    if (!board) {
      return { error: 'Board not found' };
    }
    return board;
  }

  // =================== FILTERS ===================

  @Post('boards/:boardId/filters')
  @ApiOperation({ summary: 'Add filter' })
  @ApiResponse({ status: 201, description: 'Filter added' })
  async addFilter(
    @Param('boardId') boardId: string,
    @Body() body: Omit<BoardFilter, 'id'>,
  ) {
    const board = await this.kanbanService.addFilter(boardId, body);
    if (!board) {
      return { error: 'Board not found' };
    }
    return board;
  }

  @Put('boards/:boardId/filters/:filterId')
  @ApiOperation({ summary: 'Update filter' })
  @ApiResponse({ status: 200, description: 'Filter updated' })
  async updateFilter(
    @Param('boardId') boardId: string,
    @Param('filterId') filterId: string,
    @Body() body: Partial<BoardFilter>,
  ) {
    const board = await this.kanbanService.updateFilter(boardId, filterId, body);
    if (!board) {
      return { error: 'Board or filter not found' };
    }
    return board;
  }

  @Delete('boards/:boardId/filters/:filterId')
  @ApiOperation({ summary: 'Remove filter' })
  @ApiResponse({ status: 200, description: 'Filter removed' })
  async removeFilter(
    @Param('boardId') boardId: string,
    @Param('filterId') filterId: string,
  ) {
    const board = await this.kanbanService.removeFilter(boardId, filterId);
    if (!board) {
      return { error: 'Board not found' };
    }
    return board;
  }

  // =================== SPRINTS ===================

  @Post('boards/:boardId/sprints')
  @ApiOperation({ summary: 'Create sprint' })
  @ApiResponse({ status: 201, description: 'Sprint created' })
  async createSprint(
    @Param('boardId') boardId: string,
    @Body() body: {
      name: string;
      goal?: string;
      startDate: string;
      endDate: string;
      taskIds?: string[];
    },
  ) {
    return this.kanbanService.createSprint({
      boardId,
      name: body.name,
      goal: body.goal,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      taskIds: body.taskIds,
    });
  }

  @Get('boards/:boardId/sprints')
  @ApiOperation({ summary: 'Get sprints' })
  @ApiResponse({ status: 200, description: 'Sprints list' })
  async getSprints(@Param('boardId') boardId: string) {
    const sprints = await this.kanbanService.getSprints(boardId);
    return { sprints, total: sprints.length };
  }

  @Get('boards/:boardId/sprints/active')
  @ApiOperation({ summary: 'Get active sprint for a specific board' })
  @ApiResponse({ status: 200, description: 'Active sprint' })
  async getActiveSprint(@Param('boardId') boardId: string) {
    const sprint = await this.kanbanService.getActiveSprint(boardId);
    if (!sprint) {
      return { error: 'No active sprint' };
    }
    return sprint;
  }

  @Get('sprints/active')
  @ApiOperation({ summary: 'Get all active sprints for the tenant (project_id optional)' })
  @ApiQuery({ name: 'projectId', required: false, description: 'Filter by project ID (optional)' })
  @ApiResponse({ status: 200, description: 'Active sprints across all or specific projects' })
  async getAllActiveSprints(
    @Request() req: any,
    @Query('projectId') projectId?: string,
  ) {
    const sprints = await this.kanbanService.getAllActiveSprints(req.user.tenantId, projectId);
    return { sprints, total: sprints.length };
  }

  @Post('sprints/:sprintId/start')
  @ApiOperation({ summary: 'Start sprint' })
  @ApiResponse({ status: 200, description: 'Sprint started' })
  async startSprint(@Param('sprintId') sprintId: string) {
    const sprint = await this.kanbanService.startSprint(sprintId);
    if (!sprint) {
      return { error: 'Sprint not found' };
    }
    return sprint;
  }

  @Post('sprints/:sprintId/complete')
  @ApiOperation({ summary: 'Complete sprint' })
  @ApiResponse({ status: 200, description: 'Sprint completed' })
  async completeSprint(
    @Param('sprintId') sprintId: string,
    @Body() body: { moveIncompleteToBacklog?: boolean },
  ) {
    const sprint = await this.kanbanService.completeSprint(
      sprintId,
      body.moveIncompleteToBacklog ?? true,
    );
    if (!sprint) {
      return { error: 'Sprint not found' };
    }
    return sprint;
  }

  @Post('sprints/:sprintId/tasks')
  @ApiOperation({ summary: 'Add tasks to sprint' })
  @ApiResponse({ status: 200, description: 'Tasks added' })
  async addToSprint(
    @Param('sprintId') sprintId: string,
    @Body() body: { taskIds: string[] },
  ) {
    const sprint = await this.kanbanService.addToSprint(sprintId, body.taskIds);
    if (!sprint) {
      return { error: 'Sprint not found' };
    }
    return sprint;
  }

  @Delete('sprints/:sprintId/tasks')
  @ApiOperation({ summary: 'Remove tasks from sprint' })
  @ApiResponse({ status: 200, description: 'Tasks removed' })
  async removeFromSprint(
    @Param('sprintId') sprintId: string,
    @Body() body: { taskIds: string[] },
  ) {
    const sprint = await this.kanbanService.removeFromSprint(sprintId, body.taskIds);
    if (!sprint) {
      return { error: 'Sprint not found' };
    }
    return sprint;
  }

  // =================== ACTIVITIES ===================

  @Get('boards/:boardId/activities')
  @ApiOperation({ summary: 'Get board activities' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Board activities' })
  async getActivities(
    @Param('boardId') boardId: string,
    @Query('limit') limit?: string,
  ) {
    const activities = await this.kanbanService.getActivities(
      boardId,
      limit ? parseInt(limit) : 50,
    );
    return { activities, total: activities.length };
  }

  // =================== BACKLOG & BOARD VIEWS ===================

  @Get('backlog')
  @ApiOperation({ summary: 'Get backlog tasks (project_id optional)' })
  @ApiQuery({ name: 'projectId', required: false, description: 'Filter by project ID (optional)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Backlog tasks across all or specific projects' })
  async getBacklog(
    @Request() req: any,
    @Query('projectId') projectId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const tasks = await this.kanbanService.getBacklogTasks(
      req.user.tenantId,
      projectId,
      limit ? parseInt(limit) : undefined,
      offset ? parseInt(offset) : undefined,
    );
    return { tasks, total: tasks.length };
  }

  @Get('board')
  @ApiOperation({ summary: 'Get board view (sprint_id optional - defaults to active sprint)' })
  @ApiQuery({ name: 'sprintId', required: false, description: 'Filter by sprint ID (defaults to active sprint)' })
  @ApiQuery({ name: 'projectId', required: false, description: 'Filter by project ID' })
  @ApiResponse({ status: 200, description: 'Board view with tasks organized by columns' })
  async getBoardView(
    @Request() req: any,
    @Query('sprintId') sprintId?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.kanbanService.getBoardView(req.user.tenantId, sprintId, projectId);
  }

  // =================== STATS ===================

  @Get('boards/:boardId/stats')
  @ApiOperation({ summary: 'Get board stats' })
  @ApiResponse({ status: 200, description: 'Board stats' })
  async getBoardStats(@Param('boardId') boardId: string) {
    return this.kanbanService.getBoardStats(boardId);
  }

  @Get('stats/overview')
  @ApiOperation({ summary: 'Get kanban stats' })
  @ApiResponse({ status: 200, description: 'Kanban stats' })
  async getStats(@Request() req: any) {
    return this.kanbanService.getStats(req.user.tenantId);
  }
}
