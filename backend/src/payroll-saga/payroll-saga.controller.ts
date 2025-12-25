import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  PayrollSagaService,
  SyncDirection,
  SalaryChangeEvent,
} from './payroll-saga.service';

// Payroll SAGA Integration Controller
// Provides API endpoints for payroll sync, D112, SAF-T, reconciliation

@Controller('payroll-saga')
@UseGuards(ThrottlerGuard)
export class PayrollSagaController {
  constructor(private readonly payrollSagaService: PayrollSagaService) {}

  // ===== CONNECTION STATUS =====

  @Get('status')
  async getConnectionStatus() {
    return this.payrollSagaService.getConnectionStatus();
  }

  // ===== EMPLOYEE SYNC =====

  @Post('sync/employees/to-saga')
  async syncEmployeesToSaga(@Query('organizationId') organizationId?: string) {
    return this.payrollSagaService.syncEmployeesToSaga(organizationId);
  }

  @Post('sync/employees/from-saga')
  async syncEmployeesFromSaga(@Query('organizationId') organizationId?: string) {
    return this.payrollSagaService.syncEmployeesFromSaga(organizationId);
  }

  @Post('sync/employees/bidirectional')
  async bidirectionalSync(@Query('organizationId') organizationId?: string) {
    return this.payrollSagaService.bidirectionalSync(organizationId);
  }

  // ===== SALARY CHANGES =====

  @Post('salary-change')
  async pushSalaryChange(@Body() event: SalaryChangeEvent) {
    return this.payrollSagaService.pushSalaryChange(event);
  }

  @Post('salary-change/queue')
  async queueSalaryChange(@Body() event: SalaryChangeEvent) {
    await this.payrollSagaService.queueSalaryChange(event);
    return { queued: true, employeeId: event.employeeId };
  }

  @Post('salary-change/process-queue')
  async processSalaryChangeQueue() {
    return this.payrollSagaService.processSalaryChangeQueue();
  }

  // ===== PAYROLL PERIODS =====

  @Post('payroll/:year/:month')
  async createPayrollPeriod(
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
  ) {
    return this.payrollSagaService.createPayrollPeriod(year, month);
  }

  @Get('payroll/:year/:month')
  async getPayrollPeriod(
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
  ) {
    return this.payrollSagaService.getPayrollPeriod(year, month);
  }

  @Post('payroll/:year/:month/calculate')
  async calculatePayroll(
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
  ) {
    return this.payrollSagaService.calculatePayroll(year, month);
  }

  @Post('payroll/:year/:month/approve')
  async approvePayroll(
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
    @Body('approvedBy') approvedBy: string,
  ) {
    return this.payrollSagaService.approvePayroll(year, month, approvedBy);
  }

  @Post('payroll/:year/:month/sync')
  async syncPayrollToSaga(
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
  ) {
    return this.payrollSagaService.syncPayrollToSaga(year, month);
  }

  // ===== D112 DECLARATION =====

  @Post('d112/:year/:month/generate')
  async generateD112(
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
  ) {
    return this.payrollSagaService.generateD112(year, month);
  }

  @Post('d112/:declarationId/validate')
  async validateD112(@Param('declarationId') declarationId: string) {
    return this.payrollSagaService.validateD112(declarationId);
  }

  @Post('d112/:declarationId/submit')
  async submitD112ToAnaf(@Param('declarationId') declarationId: string) {
    return this.payrollSagaService.submitD112ToAnaf(declarationId);
  }

  @Get('d112/:year/:month/status')
  async getD112Status(
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
  ) {
    return this.payrollSagaService.getD112Status(year, month);
  }

  // ===== SAF-T PAYROLL =====

  @Get('saft/:year/:month')
  async getSAFTPayrollSection(
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
  ) {
    return this.payrollSagaService.generateSAFTPayrollSection(year, month);
  }

  @Get('saft/:year/:month/xml')
  async getSAFTPayrollXml(
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
  ) {
    const xml = await this.payrollSagaService.generateSAFTPayrollXml(year, month);
    return { xml };
  }

  // ===== RECONCILIATION =====

  @Post('reconciliation/:year/:month')
  async generateReconciliationReport(
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
  ) {
    return this.payrollSagaService.generateReconciliationReport(year, month);
  }

  @Get('reconciliation/:reportId')
  async getReconciliationReport(@Param('reportId') reportId: string) {
    return this.payrollSagaService.getReconciliationReport(reportId);
  }

  // ===== SYNC HISTORY =====

  @Get('sync/history')
  async getSyncHistory(@Query('limit', new ParseIntPipe({ optional: true })) limit?: number) {
    return this.payrollSagaService.getSyncHistory(limit || 20);
  }

  @Get('sync/:syncId')
  async getSyncResult(@Param('syncId') syncId: string) {
    return this.payrollSagaService.getSyncResult(syncId);
  }
}
