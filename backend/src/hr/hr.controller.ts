import { Controller, Post, Get, Put, Delete, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HrService } from './hr.service';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('hr')
@ApiBearerAuth()
@Controller('hr')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
export class HrController {
  constructor(private readonly hrService: HrService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get HR dashboard statistics' })
  async getStats(@Query('userId') userId: string) {
    return this.hrService.getStats(userId);
  }

  @Post('employees')
  @ApiOperation({ summary: 'Create new employee' })
  async createEmployee(@Body() body: { userId: string; data: any }) {
    return this.hrService.createEmployee(body.userId, body.data);
  }

  @Get('employees')
  @ApiOperation({ summary: 'Get all employees' })
  async getEmployees(
    @Query('userId') userId: string,
    @Query('department') department?: string,
  ) {
    return this.hrService.getEmployees(userId, department);
  }

  @Get('employees/:id')
  @ApiOperation({ summary: 'Get employee by ID' })
  async getEmployee(@Param('id') id: string) {
    return this.hrService.getEmployee(id);
  }

  @Put('employees/:id')
  @ApiOperation({ summary: 'Update employee' })
  async updateEmployee(@Param('id') id: string, @Body() data: any) {
    return this.hrService.updateEmployee(id, data);
  }

  @Delete('employees/:id')
  @ApiOperation({ summary: 'Delete employee (GDPR)' })
  async deleteEmployee(@Param('id') id: string) {
    return this.hrService.deleteEmployee(id);
  }

  @Post('payroll/generate')
  @ApiOperation({ summary: 'Generate payroll for employee' })
  async generatePayroll(@Body() body: { employeeId: string; period: string }) {
    return this.hrService.generatePayroll(body.employeeId, body.period);
  }

  @Post('payroll/process')
  @ApiOperation({ summary: 'Process payroll for all employees for a period' })
  async processPayroll(@Body() body: { userId: string; period: string }) {
    return this.hrService.processPayrollForPeriod(body.userId, body.period);
  }

  @Get('payroll')
  @ApiOperation({ summary: 'Get payroll history' })
  async getPayroll(@Query('userId') userId: string, @Query('period') period?: string) {
    return this.hrService.getPayrollHistory(userId, period);
  }

  @Put('payroll/:id/status')
  @ApiOperation({ summary: 'Update payroll status' })
  async updatePayrollStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.hrService.updatePayrollStatus(id, body.status);
  }

  @Get('payroll/:id/download')
  @ApiOperation({ summary: 'Download payslip PDF' })
  async downloadPayslip(@Param('id') id: string) {
    return this.hrService.downloadPayslip(id);
  }

  @Get('departments')
  @ApiOperation({ summary: 'Get unique departments' })
  async getDepartments(@Query('userId') userId: string) {
    return this.hrService.getDepartments(userId);
  }

  // =================== TIMESHEET ENDPOINTS ===================

  @Post('timesheets')
  @ApiOperation({ summary: 'Create a timesheet entry' })
  async createTimesheet(@Body() body: {
    employeeId: string;
    date: string;
    startTime: string;
    endTime: string;
    breakMinutes?: number;
    routeId?: string;
    notes?: string;
  }) {
    return this.hrService.createTimesheet({
      employeeId: body.employeeId,
      date: new Date(body.date),
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      breakMinutes: body.breakMinutes,
      routeId: body.routeId,
      notes: body.notes,
    });
  }

  @Get('timesheets')
  @ApiOperation({ summary: 'Get all timesheets for organization' })
  async getAllTimesheets(
    @Query('userId') userId: string,
    @Query('date') date?: string,
    @Query('status') status?: string,
  ) {
    return this.hrService.getAllTimesheets(userId, {
      date: date ? new Date(date) : undefined,
      status,
    });
  }

  @Get('timesheets/employee/:employeeId')
  @ApiOperation({ summary: 'Get timesheets for specific employee' })
  async getEmployeeTimesheets(
    @Param('employeeId') employeeId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
  ) {
    return this.hrService.getEmployeeTimesheets(employeeId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status,
    });
  }

  @Get('timesheets/summary')
  @ApiOperation({ summary: 'Get timesheet summary for payroll period' })
  async getTimesheetSummary(
    @Query('userId') userId: string,
    @Query('period') period: string,
  ) {
    return this.hrService.getTimesheetSummary(userId, period);
  }

  @Put('timesheets/:id')
  @ApiOperation({ summary: 'Update a timesheet entry' })
  async updateTimesheet(
    @Param('id') id: string,
    @Body() body: {
      startTime?: string;
      endTime?: string;
      breakMinutes?: number;
      notes?: string;
    },
  ) {
    return this.hrService.updateTimesheet(id, {
      startTime: body.startTime ? new Date(body.startTime) : undefined,
      endTime: body.endTime ? new Date(body.endTime) : undefined,
      breakMinutes: body.breakMinutes,
      notes: body.notes,
    });
  }

  @Post('timesheets/:id/approve')
  @ApiOperation({ summary: 'Approve a timesheet entry' })
  async approveTimesheet(
    @Param('id') id: string,
    @Body() body: { approvedBy: string },
  ) {
    return this.hrService.approveTimesheet(id, body.approvedBy);
  }

  @Post('timesheets/:id/reject')
  @ApiOperation({ summary: 'Reject a timesheet entry' })
  async rejectTimesheet(
    @Param('id') id: string,
    @Body() body: { rejectedBy: string; reason: string },
  ) {
    return this.hrService.rejectTimesheet(id, body.rejectedBy, body.reason);
  }

  @Post('timesheets/from-routes')
  @ApiOperation({ summary: 'Auto-create timesheets from completed delivery routes' })
  async createTimesheetsFromRoutes(
    @Body() body: { userId: string; date: string },
  ) {
    return this.hrService.createTimesheetsFromRoutes(body.userId, new Date(body.date));
  }

  // =================== CONTRACT TEMPLATE ENDPOINTS ===================

  @Get('contracts/types')
  @ApiOperation({ summary: 'Get available contract template types (Tipuri contracte)' })
  async getContractTypes() {
    return {
      types: this.hrService.getContractTypes(),
      note: 'Contracte conforme cu Codul Muncii (Legea 53/2003)',
    };
  }

  @Post('contracts/generate')
  @ApiOperation({ summary: 'Generate employment contract from template (Generare contract)' })
  async generateContract(
    @Body() body: {
      userId: string;
      employeeId: string;
      templateType: string;
      startDate?: string;
      endDate?: string;
      additionalClauses?: string[];
      changes?: { field: string; oldValue: string; newValue: string }[];
    },
  ) {
    return this.hrService.generateContract(body.userId, body.employeeId, {
      templateType: body.templateType,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      additionalClauses: body.additionalClauses,
      changes: body.changes,
    });
  }

  @Post('employees/:id/detect-changes')
  @ApiOperation({ summary: 'Detect contract changes when updating employee (Detectare modificări)' })
  async detectContractChanges(
    @Param('id') employeeId: string,
    @Body() newData: any,
  ) {
    return this.hrService.detectContractChanges(employeeId, newData);
  }

  @Post('employees/:id/generate-act-aditional')
  @ApiOperation({ summary: 'Generate Act Aditional for employee changes (Generare Act Adițional)' })
  async generateActAditional(
    @Query('userId') userId: string,
    @Param('id') employeeId: string,
    @Body() body: {
      effectiveDate?: string;
      changes: { field: string; oldValue: string; newValue: string }[];
    },
  ) {
    return this.hrService.generateContract(userId, employeeId, {
      templateType: 'ACT_ADITIONAL',
      startDate: body.effectiveDate ? new Date(body.effectiveDate) : new Date(),
      changes: body.changes,
    });
  }
}
