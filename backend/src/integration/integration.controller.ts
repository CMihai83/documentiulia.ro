import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import {
  IntegrationService,
  ModuleType,
  IntegrationEvent,
  EmployeeOnboardingEvent,
  SalaryChangeEvent,
  FreelancerAvailability,
  LogisticsCapacityRequest,
  CourseCompletionEvent,
  IntegrationRule,
  LogisticsExpense,
  InventoryCostUpdate,
} from './integration.service';

@ApiTags('integration')
@Controller('integration')
export class IntegrationController {
  private readonly logger = new Logger(IntegrationController.name);

  constructor(private readonly integrationService: IntegrationService) {}

  // ============================================
  // EVENT BUS ENDPOINTS
  // ============================================

  @Post('events')
  @ApiOperation({ summary: 'Publish integration event', description: 'Publish an event to the cross-module event bus' })
  @ApiResponse({ status: 201, description: 'Event published successfully' })
  @ApiResponse({ status: 400, description: 'Invalid event data' })
  async publishEvent(
    @Body() event: Omit<IntegrationEvent, 'id' | 'timestamp' | 'status'>,
  ): Promise<{ eventId: string }> {
    const eventId = await this.integrationService.publishEvent(event);
    return { eventId };
  }

  @Get('events/:eventId')
  @ApiOperation({ summary: 'Get event by ID', description: 'Retrieve a specific integration event' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Event found' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  getEvent(@Param('eventId') eventId: string) {
    return this.integrationService.getEvent(eventId);
  }

  @Get('events/module/:module')
  getEventsByModule(
    @Param('module') module: ModuleType,
    @Query('limit') limit?: string,
  ) {
    return this.integrationService.getEventsByModule(module, limit ? parseInt(limit, 10) : 100);
  }

  @Get('events/queue')
  getEventQueue() {
    return this.integrationService.getEventQueue();
  }

  // ============================================
  // HR → HSE INTEGRATION ENDPOINTS
  // ============================================

  @Post('hr-hse/onboarding-training')
  async triggerOnboardingTraining(@Body() onboarding: EmployeeOnboardingEvent) {
    return this.integrationService.triggerOnboardingTraining(onboarding);
  }

  @Get('hr-hse/training-assignments')
  getTrainingAssignments(@Query('employeeId') employeeId?: string) {
    return this.integrationService.getTrainingAssignments(employeeId);
  }

  @Put('hr-hse/training-assignments/:assignmentId/status')
  updateTrainingStatus(
    @Param('assignmentId') assignmentId: string,
    @Body('status') status: 'assigned' | 'in_progress' | 'completed' | 'overdue',
  ) {
    return { success: this.integrationService.updateTrainingStatus(assignmentId, status) };
  }

  // ============================================
  // HR → PAYROLL → FINANCE ENDPOINTS
  // ============================================

  @Post('hr-payroll/salary-sync')
  async syncSalaryToPayroll(@Body() salaryChange: SalaryChangeEvent) {
    return this.integrationService.syncSalaryToPayroll(salaryChange);
  }

  @Get('hr-payroll/payroll-entries')
  getPayrollEntries(@Query('employeeId') employeeId?: string) {
    return this.integrationService.getPayrollEntries(employeeId);
  }

  @Get('hr-payroll/finance-transactions')
  getFinanceTransactions(@Query('module') module?: ModuleType) {
    return this.integrationService.getFinanceTransactions(module);
  }

  // ============================================
  // FREELANCER → LOGISTICS ENDPOINTS
  // ============================================

  @Post('freelancer-logistics/availability')
  registerFreelancerAvailability(@Body() availability: FreelancerAvailability) {
    this.integrationService.registerFreelancerAvailability(availability);
    return { success: true };
  }

  @Get('freelancer-logistics/availability')
  getFreelancerAvailability(@Query('freelancerId') freelancerId?: string) {
    return this.integrationService.getFreelancerAvailability(freelancerId);
  }

  @Post('freelancer-logistics/capacity-requests')
  createCapacityRequest(
    @Body() request: Omit<LogisticsCapacityRequest, 'id' | 'requestDate' | 'status' | 'matchedFreelancers'>,
  ) {
    return this.integrationService.createCapacityRequest(request);
  }

  @Get('freelancer-logistics/capacity-requests')
  getCapacityRequests(@Query('status') status?: LogisticsCapacityRequest['status']) {
    return this.integrationService.getCapacityRequests(status);
  }

  @Post('freelancer-logistics/capacity-requests/:requestId/confirm')
  confirmFreelancerAssignment(
    @Param('requestId') requestId: string,
    @Body('freelancerId') freelancerId: string,
  ) {
    return { success: this.integrationService.confirmFreelancerAssignment(requestId, freelancerId) };
  }

  // ============================================
  // LMS → HR ENDPOINTS
  // ============================================

  @Post('lms-hr/course-completion')
  async processCourseCompletion(@Body() completion: CourseCompletionEvent) {
    return this.integrationService.processCourseCompletion(completion);
  }

  @Get('lms-hr/competency-updates/:employeeId')
  getCompetencyUpdates(@Param('employeeId') employeeId: string) {
    return this.integrationService.getCompetencyUpdates(employeeId);
  }

  @Get('lms-hr/competency-matrix/:employeeId')
  getEmployeeCompetencyMatrix(@Param('employeeId') employeeId: string) {
    return this.integrationService.getEmployeeCompetencyMatrix(employeeId);
  }

  // ============================================
  // DASHBOARD AGGREGATION ENDPOINTS
  // ============================================

  @Get('dashboard/metrics')
  aggregateDashboardMetrics() {
    return this.integrationService.aggregateDashboardMetrics();
  }

  @Get('dashboard/metrics/history')
  getMetricsHistory(@Query('limit') limit?: string) {
    return this.integrationService.getMetricsHistory(limit ? parseInt(limit, 10) : 50);
  }

  // ============================================
  // AUDIT TRAIL ENDPOINTS
  // ============================================

  @Get('audit')
  getAuditTrail(
    @Query('sourceModule') sourceModule?: ModuleType,
    @Query('targetModule') targetModule?: ModuleType,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.integrationService.getAuditTrail({
      sourceModule,
      targetModule,
      entityType,
      entityId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('audit/summary')
  getAuditSummary() {
    return this.integrationService.getAuditSummary();
  }

  // ============================================
  // INTEGRATION RULES ENDPOINTS
  // ============================================

  @Post('rules')
  createRule(@Body() rule: Omit<IntegrationRule, 'id' | 'createdAt' | 'updatedAt'>) {
    return this.integrationService.createRule(rule);
  }

  @Get('rules')
  getAllRules() {
    return this.integrationService.getAllRules();
  }

  @Get('rules/:ruleId')
  getRule(@Param('ruleId') ruleId: string) {
    return this.integrationService.getRule(ruleId);
  }

  @Put('rules/:ruleId')
  updateRule(
    @Param('ruleId') ruleId: string,
    @Body() updates: Partial<IntegrationRule>,
  ) {
    return { success: this.integrationService.updateRule(ruleId, updates) };
  }

  @Delete('rules/:ruleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteRule(@Param('ruleId') ruleId: string) {
    this.integrationService.deleteRule(ruleId);
  }

  // ============================================
  // LOGISTICS → FINANCE ENDPOINTS
  // ============================================

  @Post('logistics-finance/expenses')
  async recordLogisticsExpense(
    @Body() expense: Omit<LogisticsExpense, 'id' | 'status'>,
  ) {
    return this.integrationService.recordLogisticsExpense(expense);
  }

  @Get('logistics-finance/expenses')
  getLogisticsExpenses(
    @Query('type') type?: LogisticsExpense['type'],
    @Query('status') status?: LogisticsExpense['status'],
    @Query('vehicleId') vehicleId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.integrationService.getLogisticsExpenses({
      type,
      status,
      vehicleId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Post('logistics-finance/expenses/:expenseId/approve')
  async approveLogisticsExpense(
    @Param('expenseId') expenseId: string,
    @Body('approvedBy') approvedBy: string,
  ) {
    return { success: await this.integrationService.approveLogisticsExpense(expenseId, approvedBy) };
  }

  @Post('logistics-finance/inventory-costs')
  async recordInventoryCostUpdate(
    @Body() update: Omit<InventoryCostUpdate, 'id' | 'date'>,
  ) {
    return this.integrationService.recordInventoryCostUpdate(update);
  }

  @Get('logistics-finance/inventory-costs')
  getInventoryCostUpdates(@Query('itemId') itemId?: string) {
    return this.integrationService.getInventoryCostUpdates(itemId);
  }

  @Get('logistics-finance/summary')
  getLogisticsFinanceSummary() {
    return this.integrationService.getLogisticsFinanceSummary();
  }

  // ============================================
  // STATUS ENDPOINT
  // ============================================

  @Get('status')
  getIntegrationStatus() {
    return this.integrationService.getIntegrationStatus();
  }
}
