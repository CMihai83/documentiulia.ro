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
  HSEPredictiveService,
  IncidentCategory,
  ShiftType,
  HistoricalIncident,
  LeadingIndicator,
  ProactiveIntervention,
  PPEItem,
} from './hse-predictive.service';

// HSE Predictive Analytics Controller
// ML-based incident forecasting and proactive risk management

@Controller('hse/predictive')
@UseGuards(ThrottlerGuard)
export class HSEPredictiveController {
  constructor(private readonly predictiveService: HSEPredictiveService) {}

  // ===== DASHBOARD =====

  @Get('dashboard')
  async getPredictiveDashboard() {
    return this.predictiveService.generatePredictiveDashboard();
  }

  // ===== HISTORICAL DATA =====

  @Post('incidents')
  async addHistoricalIncident(
    @Body('date') date: string,
    @Body('time') time: string,
    @Body('category') category: IncidentCategory,
    @Body('severity') severity: 1 | 2 | 3 | 4 | 5,
    @Body('location') location: string,
    @Body('department') department: string,
    @Body('shift') shift: ShiftType,
    @Body('weatherCondition') weatherCondition: string,
    @Body('workerExperience') workerExperience: number,
    @Body('taskType') taskType: string,
    @Body('rootCauses') rootCauses: string[],
    @Body('lostDays') lostDays: number,
  ) {
    return this.predictiveService.addHistoricalIncident({
      date: new Date(date),
      time,
      category,
      severity,
      location,
      department,
      shift,
      weatherCondition,
      workerExperience,
      taskType,
      rootCauses,
      lostDays,
    });
  }

  @Get('incidents')
  async getHistoricalIncidents(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('category') category?: IncidentCategory,
    @Query('department') department?: string,
    @Query('location') location?: string,
    @Query('shift') shift?: ShiftType,
  ) {
    return this.predictiveService.getHistoricalIncidents({
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      category,
      department,
      location,
      shift,
    });
  }

  @Post('incidents/bulk-import')
  async bulkImportIncidents(
    @Body('incidents') incidents: Omit<HistoricalIncident, 'id' | 'dayOfWeek' | 'month'>[],
  ) {
    const imported = await this.predictiveService.bulkImportIncidents(incidents);
    return { imported };
  }

  // ===== LEADING INDICATORS =====

  @Get('indicators')
  async getLeadingIndicators() {
    return this.predictiveService.getLeadingIndicators();
  }

  @Put('indicators/:indicatorId')
  async updateLeadingIndicator(
    @Param('indicatorId') indicatorId: string,
    @Body('value') value: number,
  ) {
    return this.predictiveService.updateLeadingIndicator(indicatorId, value);
  }

  @Get('indicators/:indicatorId/status')
  async getIndicatorStatus(@Param('indicatorId') indicatorId: string) {
    return this.predictiveService.getIndicatorStatus(indicatorId);
  }

  @Post('indicators')
  async createCustomIndicator(
    @Body('name') name: string,
    @Body('category') category: LeadingIndicator['category'],
    @Body('description') description: string,
    @Body('measurementUnit') measurementUnit: string,
    @Body('targetValue') targetValue: number,
    @Body('warningThreshold') warningThreshold: number,
    @Body('criticalThreshold') criticalThreshold: number,
    @Body('correlationToIncidents') correlationToIncidents: number,
  ) {
    return this.predictiveService.createCustomIndicator({
      name,
      category,
      description,
      measurementUnit,
      targetValue,
      warningThreshold,
      criticalThreshold,
      correlationToIncidents,
    });
  }

  // ===== PATTERN RECOGNITION =====

  @Get('patterns')
  async detectPatterns() {
    return this.predictiveService.detectPatterns();
  }

  @Get('analysis/temporal')
  async analyzeTemporalPatterns() {
    return this.predictiveService.analyzeTemporalPatterns();
  }

  @Get('analysis/spatial')
  async analyzeSpatialPatterns() {
    return this.predictiveService.analyzeSpatialPatterns();
  }

  // ===== FORECASTING =====

  @Get('forecast')
  async generateForecast(
    @Query('days', ParseIntPipe) days: number = 30,
    @Query('methodology') methodology: 'TIME_SERIES' | 'REGRESSION' | 'MACHINE_LEARNING' | 'ENSEMBLE' = 'TIME_SERIES',
  ) {
    return this.predictiveService.generateForecast(days, methodology);
  }

  // ===== RISK SCORING =====

  @Get('risk-score')
  async calculateRiskScore(
    @Query('department') department?: string,
    @Query('location') location?: string,
  ) {
    return this.predictiveService.calculateRiskScore(department, location);
  }

  // ===== PROACTIVE INTERVENTIONS =====

  @Post('interventions')
  async createIntervention(
    @Body('triggeredBy') triggeredBy: string,
    @Body('type') type: ProactiveIntervention['type'],
    @Body('description') description: string,
    @Body('targetArea') targetArea: string,
    @Body('targetDepartment') targetDepartment: string,
    @Body('scheduledDate') scheduledDate: string,
    @Body('assignedTo') assignedTo: string,
  ) {
    return this.predictiveService.createIntervention({
      triggeredBy,
      type,
      description,
      targetArea,
      targetDepartment,
      scheduledDate: new Date(scheduledDate),
      assignedTo,
    });
  }

  @Get('interventions')
  async getInterventions(
    @Query('status') status?: ProactiveIntervention['status'],
    @Query('type') type?: ProactiveIntervention['type'],
    @Query('department') department?: string,
  ) {
    return this.predictiveService.getInterventions({ status, type, department });
  }

  @Put('interventions/:interventionId/status')
  async updateInterventionStatus(
    @Param('interventionId') interventionId: string,
    @Body('status') status: ProactiveIntervention['status'],
  ) {
    return this.predictiveService.updateInterventionStatus(interventionId, status);
  }

  @Post('interventions/:interventionId/effectiveness')
  async rateInterventionEffectiveness(
    @Param('interventionId') interventionId: string,
    @Body('incidentReduction') incidentReduction: number,
    @Body('rating') rating: 1 | 2 | 3 | 4 | 5,
    @Body('notes') notes: string,
  ) {
    return this.predictiveService.rateInterventionEffectiveness(interventionId, {
      incidentReduction,
      rating,
      notes,
    });
  }

  @Post('interventions/auto-generate')
  async autoGenerateInterventions() {
    return this.predictiveService.autoGenerateInterventions();
  }

  // ===== PPE TRACKING =====

  @Post('ppe')
  async recordPPEStatus(
    @Body('employeeId') employeeId: string,
    @Body('employeeName') employeeName: string,
    @Body('department') department: string,
    @Body('items') items: Omit<PPEItem, 'isExpired' | 'daysUntilExpiry'>[],
  ) {
    return this.predictiveService.recordPPEStatus({
      employeeId,
      employeeName,
      department,
      items,
    });
  }

  @Get('ppe/:employeeId')
  async getPPEStatus(@Param('employeeId') employeeId: string) {
    return this.predictiveService.getPPEStatus(employeeId);
  }

  @Get('ppe/alerts/all')
  async getPPEAlerts() {
    return this.predictiveService.getPPEAlerts();
  }
}
