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
  IncidentService,
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
  CAPAType,
  CAPAPriority,
  CAPAStatus,
  PersonInfo,
  InjuredPerson,
  InvestigationEvent,
  RootCause,
} from './incident.service';

// Incident Reporting & Investigation Controller
// Mobile-first API endpoints for HSE incident management

@Controller('hse/incidents')
@UseGuards(ThrottlerGuard)
export class IncidentController {
  constructor(private readonly incidentService: IncidentService) {}

  // ===== INCIDENT REPORTING =====

  @Post()
  async reportIncident(
    @Body('type') type: IncidentType,
    @Body('severity') severity: IncidentSeverity,
    @Body('occurredAt') occurredAt: string,
    @Body('locationId') locationId: string,
    @Body('locationDescription') locationDescription: string,
    @Body('department') department: string,
    @Body('shift') shift: string,
    @Body('title') title: string,
    @Body('description') description: string,
    @Body('immediateActions') immediateActions: string[],
    @Body('reportedBy') reportedBy: PersonInfo,
    @Body('injuredPersons') injuredPersons?: InjuredPerson[],
  ) {
    return this.incidentService.reportIncident({
      type,
      severity,
      occurredAt: new Date(occurredAt),
      locationId,
      locationDescription,
      department,
      shift,
      title,
      description,
      immediateActions,
      reportedBy,
      injuredPersons,
    });
  }

  @Get()
  async listIncidents(
    @Query('type') type?: IncidentType,
    @Query('severity') severity?: IncidentSeverity,
    @Query('status') status?: IncidentStatus,
    @Query('locationId') locationId?: string,
    @Query('department') department?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('recordableOnly') recordableOnly?: string,
  ) {
    return this.incidentService.listIncidents({
      type,
      severity,
      status,
      locationId,
      department,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      recordableOnly: recordableOnly === 'true',
    });
  }

  @Get(':incidentId')
  async getIncident(@Param('incidentId') incidentId: string) {
    return this.incidentService.getIncident(incidentId);
  }

  @Get('number/:incidentNumber')
  async getIncidentByNumber(@Param('incidentNumber') incidentNumber: string) {
    return this.incidentService.getIncidentByNumber(incidentNumber);
  }

  @Put(':incidentId')
  async updateIncident(
    @Param('incidentId') incidentId: string,
    @Body() data: any,
  ) {
    return this.incidentService.updateIncident(incidentId, data);
  }

  // ===== MEDIA ATTACHMENTS =====

  @Post(':incidentId/photos')
  async addPhoto(
    @Param('incidentId') incidentId: string,
    @Body('filename') filename: string,
    @Body('url') url: string,
    @Body('mimeType') mimeType: string,
    @Body('size', ParseIntPipe) size: number,
    @Body('uploadedBy') uploadedBy: string,
    @Body('description') description?: string,
  ) {
    return this.incidentService.addPhoto(incidentId, {
      filename,
      url,
      mimeType,
      size,
      uploadedBy,
      description,
    });
  }

  @Post(':incidentId/videos')
  async addVideo(
    @Param('incidentId') incidentId: string,
    @Body('filename') filename: string,
    @Body('url') url: string,
    @Body('mimeType') mimeType: string,
    @Body('size', ParseIntPipe) size: number,
    @Body('uploadedBy') uploadedBy: string,
    @Body('description') description?: string,
  ) {
    return this.incidentService.addVideo(incidentId, {
      filename,
      url,
      mimeType,
      size,
      uploadedBy,
      description,
    });
  }

  @Post(':incidentId/documents')
  async addDocument(
    @Param('incidentId') incidentId: string,
    @Body('filename') filename: string,
    @Body('url') url: string,
    @Body('mimeType') mimeType: string,
    @Body('size', ParseIntPipe) size: number,
    @Body('uploadedBy') uploadedBy: string,
    @Body('description') description?: string,
  ) {
    return this.incidentService.addDocument(incidentId, {
      filename,
      url,
      mimeType,
      size,
      uploadedBy,
      description,
    });
  }

  // ===== WITNESS STATEMENTS =====

  @Post(':incidentId/witnesses')
  async addWitnessStatement(
    @Param('incidentId') incidentId: string,
    @Body('witness') witness: PersonInfo,
    @Body('statement') statement: string,
    @Body('recordedBy') recordedBy: string,
  ) {
    return this.incidentService.addWitnessStatement(incidentId, {
      witness,
      statement,
      recordedBy,
    });
  }

  @Put(':incidentId/witnesses/:statementId/sign')
  async signWitnessStatement(
    @Param('incidentId') incidentId: string,
    @Param('statementId') statementId: string,
    @Body('signature') signature: string,
  ) {
    return this.incidentService.signWitnessStatement(incidentId, statementId, signature);
  }

  // ===== INVESTIGATION =====

  @Post(':incidentId/investigation')
  async startInvestigation(
    @Param('incidentId') incidentId: string,
    @Body('leadInvestigator') leadInvestigator: PersonInfo,
    @Body('team') team: PersonInfo[],
    @Body('methodology') methodology: 'FIVE_WHY' | 'FISHBONE' | 'FAULT_TREE' | 'TAPROOT' | 'COMBINED',
  ) {
    return this.incidentService.startInvestigation(incidentId, {
      leadInvestigator,
      team,
      methodology,
    });
  }

  @Post(':incidentId/investigation/findings')
  async addInvestigationFinding(
    @Param('incidentId') incidentId: string,
    @Body('finding') finding: string,
  ) {
    return this.incidentService.addInvestigationFinding(incidentId, finding);
  }

  @Post(':incidentId/investigation/timeline')
  async addTimelineEvent(
    @Param('incidentId') incidentId: string,
    @Body('timestamp') timestamp: string,
    @Body('description') description: string,
    @Body('source') source: string,
  ) {
    return this.incidentService.addTimelineEvent(incidentId, {
      timestamp: new Date(timestamp),
      description,
      source,
    });
  }

  @Post(':incidentId/investigation/complete')
  async completeInvestigation(
    @Param('incidentId') incidentId: string,
    @Body('contributingFactors') contributingFactors: string[],
    @Body('systemFailures') systemFailures: string[],
    @Body('recommendations') recommendations: string[],
  ) {
    return this.incidentService.completeInvestigation(incidentId, {
      contributingFactors,
      systemFailures,
      recommendations,
    });
  }

  // ===== ROOT CAUSE ANALYSIS =====

  @Post(':incidentId/root-causes')
  async addRootCause(
    @Param('incidentId') incidentId: string,
    @Body() rootCause: Omit<RootCause, 'id'>,
  ) {
    return this.incidentService.addRootCause(incidentId, rootCause);
  }

  @Post(':incidentId/root-causes/five-why')
  async performFiveWhyAnalysis(
    @Param('incidentId') incidentId: string,
    @Body('problem') problem: string,
    @Body('whyChain') whyChain: string[],
  ) {
    return this.incidentService.performFiveWhyAnalysis(incidentId, problem, whyChain);
  }

  @Post(':incidentId/root-causes/fishbone')
  async performFishboneAnalysis(
    @Param('incidentId') incidentId: string,
    @Body('causes') causes: {
      manpower?: string[];
      machine?: string[];
      method?: string[];
      material?: string[];
      measurement?: string[];
      environment?: string[];
    },
  ) {
    return this.incidentService.performFishboneAnalysis(incidentId, causes);
  }

  // ===== CAPA =====

  @Post(':incidentId/capas')
  async addCAPA(
    @Param('incidentId') incidentId: string,
    @Body('type') type: CAPAType,
    @Body('priority') priority: CAPAPriority,
    @Body('description') description: string,
    @Body('rootCauseId') rootCauseId: string,
    @Body('responsiblePerson') responsiblePerson: string,
    @Body('targetDate') targetDate: string,
    @Body('cost') cost?: number,
    @Body('currency') currency?: string,
  ) {
    return this.incidentService.addCAPA(incidentId, {
      type,
      priority,
      description,
      rootCauseId,
      responsiblePerson,
      targetDate: new Date(targetDate),
      cost,
      currency,
    });
  }

  @Put(':incidentId/capas/:capaId/status')
  async updateCAPAStatus(
    @Param('incidentId') incidentId: string,
    @Param('capaId') capaId: string,
    @Body('status') status: CAPAStatus,
    @Body('verifiedBy') verifiedBy?: string,
  ) {
    return this.incidentService.updateCAPAStatus(incidentId, capaId, status, verifiedBy);
  }

  @Post(':incidentId/capas/:capaId/effectiveness')
  async rateCAPAEffectiveness(
    @Param('incidentId') incidentId: string,
    @Param('capaId') capaId: string,
    @Body('rating', ParseIntPipe) rating: number,
    @Body('evidence') evidence: string[],
  ) {
    return this.incidentService.rateCAPAEffectiveness(incidentId, capaId, rating, evidence);
  }

  @Get('capas/overdue')
  async getOverdueCAPAs() {
    return this.incidentService.getOverdueCAPAs();
  }

  // ===== INCIDENT LIFECYCLE =====

  @Post(':incidentId/close')
  async closeIncident(
    @Param('incidentId') incidentId: string,
    @Body('closedBy') closedBy: string,
  ) {
    return this.incidentService.closeIncident(incidentId, closedBy);
  }

  @Post(':incidentId/reopen')
  async reopenIncident(
    @Param('incidentId') incidentId: string,
    @Body('reason') reason: string,
  ) {
    return this.incidentService.reopenIncident(incidentId, reason);
  }

  // ===== LOST TIME & METRICS =====

  @Put(':incidentId/lost-time')
  async recordLostTime(
    @Param('incidentId') incidentId: string,
    @Body('lostWorkDays', ParseIntPipe) lostWorkDays: number,
    @Body('restrictedWorkDays', ParseIntPipe) restrictedWorkDays: number,
  ) {
    return this.incidentService.recordLostTime(incidentId, {
      lostWorkDays,
      restrictedWorkDays,
    });
  }

  @Get('metrics/safety')
  async calculateSafetyMetrics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('hoursWorked', ParseIntPipe) hoursWorked: number,
  ) {
    return this.incidentService.calculateSafetyMetrics(
      new Date(startDate),
      new Date(endDate),
      hoursWorked,
    );
  }

  // ===== REGULATORY =====

  @Post(':incidentId/report-to-authorities')
  async markReportedToAuthorities(
    @Param('incidentId') incidentId: string,
    @Body('reference') reference: string,
  ) {
    return this.incidentService.markReportedToAuthorities(incidentId, reference);
  }

  @Get('regulatory/requirements/:severity')
  async getReportingRequirements(@Param('severity') severity: IncidentSeverity) {
    return this.incidentService.getReportingRequirements(severity);
  }

  // ===== ISM REPORT =====

  @Get(':incidentId/ism-report')
  async generateISMReport(
    @Param('incidentId') incidentId: string,
    @Query('facilityName') facilityName: string,
    @Query('companyName') companyName: string,
  ) {
    return this.incidentService.generateISMReport(incidentId, facilityName, companyName);
  }
}
