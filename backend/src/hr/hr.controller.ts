import { Controller, Post, Get, Body, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HrService } from './hr.service';

@ApiTags('hr')
@ApiBearerAuth()
@Controller('hr')
export class HrController {
  constructor(private readonly hrService: HrService) {}

  @Post('employees')
  @ApiOperation({ summary: 'Create new employee' })
  async createEmployee(@Body() body: { userId: string; data: any }) {
    return this.hrService.createEmployee(body.userId, body.data);
  }

  @Get('employees')
  @ApiOperation({ summary: 'Get all employees' })
  async getEmployees(@Query('userId') userId: string) {
    return this.hrService.getEmployees(userId);
  }

  @Post('payroll/generate')
  @ApiOperation({ summary: 'Generate payroll for employee' })
  async generatePayroll(@Body() body: { employeeId: string; period: string }) {
    return this.hrService.generatePayroll(body.employeeId, body.period);
  }

  @Get('payroll')
  @ApiOperation({ summary: 'Get payroll history' })
  async getPayroll(@Query('userId') userId: string, @Query('period') period?: string) {
    return this.hrService.getPayrollHistory(userId, period);
  }
}
