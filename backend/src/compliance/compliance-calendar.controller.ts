import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  Request,
  BadRequestException,
  Header,
} from '@nestjs/common';
import { ComplianceCalendarService, ComplianceDeadline } from './compliance-calendar.service';

@Controller('compliance/calendar')
export class ComplianceCalendarController {
  constructor(private readonly calendarService: ComplianceCalendarService) {}

  @Get('deadlines')
  async getDeadlines(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('priority') priority?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const tenantId = req.user?.tenantId || 'tenant_demo';

    const deadlines = await this.calendarService.getDeadlines(tenantId, {
      status,
      category,
      priority,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });

    return {
      success: true,
      data: { deadlines },
    };
  }

  @Post('deadlines')
  async createDeadline(
    @Request() req: any,
    @Body() body: Omit<ComplianceDeadline, 'id' | 'tenantId' | 'status' | 'createdAt' | 'updatedAt'>,
  ) {
    const tenantId = req.user?.tenantId || 'tenant_demo';

    if (!body.title || !body.dueDate) {
      throw new BadRequestException('Title and due date are required');
    }

    const deadline = await this.calendarService.createDeadline(tenantId, {
      ...body,
      dueDate: new Date(body.dueDate),
    });

    return {
      success: true,
      data: deadline,
    };
  }

  @Put('deadlines/:id')
  async updateDeadline(
    @Param('id') id: string,
    @Body() body: Partial<Omit<ComplianceDeadline, 'id' | 'tenantId' | 'createdAt'>>,
  ) {
    const deadline = await this.calendarService.updateDeadline(id, body);
    if (!deadline) {
      throw new BadRequestException('Deadline not found');
    }

    return {
      success: true,
      data: deadline,
    };
  }

  @Post('deadlines/:id/complete')
  async completeDeadline(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { notes?: string; documents?: string[] },
  ) {
    const userId = req.user?.id || 'system';

    const deadline = await this.calendarService.completeDeadline(
      id,
      userId,
      body.notes,
      body.documents,
    );

    if (!deadline) {
      throw new BadRequestException('Deadline not found');
    }

    return {
      success: true,
      data: deadline,
    };
  }

  @Post('deadlines/:id/waive')
  async waiveDeadline(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { reason: string },
  ) {
    const userId = req.user?.id || 'system';

    if (!body.reason) {
      throw new BadRequestException('Waiver reason is required');
    }

    const deadline = await this.calendarService.waiveDeadline(id, userId, body.reason);
    if (!deadline) {
      throw new BadRequestException('Deadline not found');
    }

    return {
      success: true,
      data: deadline,
    };
  }

  @Get('upcoming')
  async getUpcomingDeadlines(
    @Request() req: any,
    @Query('days') days?: string,
  ) {
    const tenantId = req.user?.tenantId || 'tenant_demo';
    const deadlines = await this.calendarService.getUpcomingDeadlines(
      tenantId,
      days ? parseInt(days) : 30,
    );

    return {
      success: true,
      data: { deadlines },
    };
  }

  @Get('overdue')
  async getOverdueDeadlines(@Request() req: any) {
    const tenantId = req.user?.tenantId || 'tenant_demo';
    const deadlines = await this.calendarService.getOverdueDeadlines(tenantId);

    return {
      success: true,
      data: { deadlines },
    };
  }

  @Get('stats')
  async getCalendarStats(@Request() req: any) {
    const tenantId = req.user?.tenantId || 'tenant_demo';
    const stats = await this.calendarService.getCalendarStats(tenantId);

    return {
      success: true,
      data: stats,
    };
  }

  @Get('view/:year/:month')
  async getCalendarView(
    @Request() req: any,
    @Param('year') year: string,
    @Param('month') month: string,
  ) {
    const tenantId = req.user?.tenantId || 'tenant_demo';
    const calendarView = await this.calendarService.getCalendarView(
      tenantId,
      parseInt(year),
      parseInt(month),
    );

    return {
      success: true,
      data: { calendar: calendarView },
    };
  }

  @Post('import-templates')
  async importTemplates(
    @Request() req: any,
    @Body() body: { jurisdiction: string },
  ) {
    const tenantId = req.user?.tenantId || 'tenant_demo';

    const imported = await this.calendarService.importTemplates(
      tenantId,
      body.jurisdiction || 'RO',
    );

    return {
      success: true,
      data: { imported },
    };
  }

  @Get('export')
  async exportCalendar(
    @Request() req: any,
    @Query('format') format?: string,
  ) {
    const tenantId = req.user?.tenantId || 'tenant_demo';
    const exportFormat = (format === 'ical' ? 'ical' : 'json') as 'ical' | 'json';

    const content = await this.calendarService.exportCalendar(tenantId, exportFormat);

    return {
      success: true,
      data: {
        format: exportFormat,
        content,
        contentType: exportFormat === 'ical' ? 'text/calendar' : 'application/json',
      },
    };
  }

  @Get('categories')
  async getCategories() {
    return {
      success: true,
      data: {
        categories: [
          { id: 'tax', name: 'Tax', description: 'Tax-related filings and declarations' },
          { id: 'financial', name: 'Financial', description: 'Financial reporting deadlines' },
          { id: 'hr', name: 'HR', description: 'HR and payroll obligations' },
          { id: 'regulatory', name: 'Regulatory', description: 'Regulatory compliance' },
          { id: 'audit', name: 'Audit', description: 'Audit and review deadlines' },
          { id: 'custom', name: 'Custom', description: 'Custom deadlines' },
        ],
        priorities: [
          { id: 'low', name: 'Low' },
          { id: 'medium', name: 'Medium' },
          { id: 'high', name: 'High' },
          { id: 'critical', name: 'Critical' },
        ],
        jurisdictions: [
          { id: 'RO', name: 'Romania', authority: 'ANAF' },
          { id: 'EU', name: 'European Union', authority: 'Various' },
          { id: 'GLOBAL', name: 'Global', authority: 'Various' },
        ],
      },
    };
  }
}
