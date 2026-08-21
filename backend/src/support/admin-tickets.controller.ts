import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TicketPriority, TicketStatus, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SupportService } from './support.service';

/** Staff side of REQ-049: the request inbox in the back-office. */
@ApiTags('admin-tickets')
@ApiBearerAuth()
@Controller('admin/tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
export class AdminTicketsController {
  constructor(private readonly support: SupportService) {}

  @Get()
  @ApiOperation({ summary: 'Inbox (filter by status / assignee / search)' })
  list(
    @Request() req: any,
    @Query('status') status?: TicketStatus | 'ALL',
    @Query('assignedTo') assignedToId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.support.staffList(req.user.sub, { status, assignedToId, search, page: Number(page), limit: Number(limit) });
  }

  @Get('staff')
  @ApiOperation({ summary: 'Assignable staff members' })
  staff() {
    return this.support.staffMembers();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.support.staffGet(id);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Reply to the client, or add an internal note' })
  reply(@Request() req: any, @Param('id') id: string, @Body() body: { body: string; internal?: boolean; status?: TicketStatus }) {
    if (!body?.body?.trim()) throw new BadRequestException('Message body is required');
    return this.support.staffReply(req.user.sub, id, body.body, { internal: body.internal, status: body.status });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Change status / priority / assignee / category' })
  update(@Request() req: any, @Param('id') id: string, @Body() body: { status?: TicketStatus; priority?: TicketPriority; assignedToId?: string | null; category?: string }) {
    return this.support.staffUpdate(req.user.sub, id, body);
  }
}
