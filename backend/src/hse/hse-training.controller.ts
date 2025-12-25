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
  ParseBoolPipe,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  HSETrainingService,
  TrainingType,
  TrainingStatus,
  CertificationType,
  CertificationStatus,
  CompetencyLevel,
  InductionPhase,
  InstructorInfo,
  CourseModule,
} from './hse-training.service';

// HSE Training & Certification Controller
// API endpoints for Romanian SSM compliance and ISO 45001 training management

@Controller('hse/training')
@UseGuards(ThrottlerGuard)
export class HSETrainingController {
  constructor(private readonly trainingService: HSETrainingService) {}

  // ===== COURSES =====

  @Post('courses')
  async createCourse(
    @Body('code') code: string,
    @Body('name') name: string,
    @Body('description') description: string,
    @Body('type') type: TrainingType,
    @Body('durationHours', ParseIntPipe) durationHours: number,
    @Body('validityMonths', ParseIntPipe) validityMonths: number,
    @Body('mandatory') mandatory: boolean,
    @Body('targetRoles') targetRoles: string[],
    @Body('prerequisites') prerequisites: string[],
    @Body('assessmentRequired') assessmentRequired: boolean,
    @Body('passingScore', ParseIntPipe) passingScore: number,
  ) {
    return this.trainingService.createCourse({
      code,
      name,
      description,
      type,
      durationHours,
      validityMonths,
      mandatory,
      targetRoles,
      prerequisites,
      assessmentRequired,
      passingScore,
    });
  }

  @Get('courses')
  async listCourses(
    @Query('type') type?: TrainingType,
    @Query('mandatory') mandatory?: string,
    @Query('role') role?: string,
    @Query('active') active?: string,
  ) {
    return this.trainingService.listCourses({
      type,
      mandatory: mandatory === 'true' ? true : mandatory === 'false' ? false : undefined,
      role,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
    });
  }

  @Get('courses/:courseId')
  async getCourse(@Param('courseId') courseId: string) {
    return this.trainingService.getCourse(courseId);
  }

  @Put('courses/:courseId')
  async updateCourse(
    @Param('courseId') courseId: string,
    @Body() data: any,
  ) {
    return this.trainingService.updateCourse(courseId, data);
  }

  @Post('courses/:courseId/modules')
  async addModuleToCourse(
    @Param('courseId') courseId: string,
    @Body('title') title: string,
    @Body('description') description: string,
    @Body('durationMinutes', ParseIntPipe) durationMinutes: number,
    @Body('content') content: string,
    @Body('videoUrl') videoUrl: string,
    @Body('order', ParseIntPipe) order: number,
  ) {
    return this.trainingService.addModuleToCourse(courseId, {
      title,
      description,
      durationMinutes,
      content,
      videoUrl,
      order,
    });
  }

  @Get('courses/role/:role')
  async getTrainingRequirementsForRole(@Param('role') role: string) {
    return this.trainingService.getTrainingRequirementsForRole(role);
  }

  // ===== SESSIONS =====

  @Post('sessions')
  async createSession(
    @Body('courseId') courseId: string,
    @Body('title') title: string,
    @Body('description') description: string,
    @Body('scheduledDate') scheduledDate: string,
    @Body('endDate') endDate: string,
    @Body('location') location: string,
    @Body('locationId') locationId: string,
    @Body('instructor') instructor: InstructorInfo,
    @Body('maxParticipants', ParseIntPipe) maxParticipants: number,
    @Body('language') language: 'RO' | 'EN',
    @Body('notes') notes: string,
  ) {
    return this.trainingService.createSession({
      courseId,
      title,
      description,
      scheduledDate: new Date(scheduledDate),
      endDate: new Date(endDate),
      location,
      locationId,
      instructor,
      maxParticipants,
      language,
      notes,
    });
  }

  @Get('sessions')
  async listSessions(
    @Query('courseId') courseId?: string,
    @Query('status') status?: TrainingStatus,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('instructorId') instructorId?: string,
  ) {
    return this.trainingService.listSessions({
      courseId,
      status,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      instructorId,
    });
  }

  @Get('sessions/:sessionId')
  async getSession(@Param('sessionId') sessionId: string) {
    return this.trainingService.getSession(sessionId);
  }

  @Post('sessions/:sessionId/enroll')
  async enrollParticipant(
    @Param('sessionId') sessionId: string,
    @Body('employeeId') employeeId: string,
    @Body('name') name: string,
    @Body('department') department: string,
  ) {
    return this.trainingService.enrollParticipant(sessionId, {
      employeeId,
      name,
      department,
    });
  }

  @Put('sessions/:sessionId/attendance/:employeeId')
  async recordAttendance(
    @Param('sessionId') sessionId: string,
    @Param('employeeId') employeeId: string,
    @Body('attended') attended: boolean,
  ) {
    return this.trainingService.recordAttendance(sessionId, employeeId, attended);
  }

  @Post('sessions/:sessionId/assessment/:employeeId')
  async recordAssessmentResult(
    @Param('sessionId') sessionId: string,
    @Param('employeeId') employeeId: string,
    @Body('score', ParseIntPipe) score: number,
  ) {
    return this.trainingService.recordAssessmentResult(sessionId, employeeId, score);
  }

  @Post('sessions/:sessionId/complete')
  async completeSession(@Param('sessionId') sessionId: string) {
    return this.trainingService.completeSession(sessionId);
  }

  // ===== TRAINING RECORDS =====

  @Post('records')
  async createTrainingRecord(
    @Body('employeeId') employeeId: string,
    @Body('employeeName') employeeName: string,
    @Body('courseId') courseId: string,
    @Body('courseName') courseName: string,
    @Body('sessionId') sessionId: string,
    @Body('trainingType') trainingType: TrainingType,
    @Body('score') score: number,
    @Body('passed') passed: boolean,
    @Body('instructorName') instructorName: string,
    @Body('notes') notes: string,
  ) {
    return this.trainingService.createTrainingRecord({
      employeeId,
      employeeName,
      courseId,
      courseName,
      sessionId,
      trainingType,
      score,
      passed,
      instructorName,
      notes,
    });
  }

  @Get('records/:recordId')
  async getTrainingRecord(@Param('recordId') recordId: string) {
    return this.trainingService.getTrainingRecord(recordId);
  }

  @Get('employees/:employeeId/history')
  async getEmployeeTrainingHistory(@Param('employeeId') employeeId: string) {
    return this.trainingService.getEmployeeTrainingHistory(employeeId);
  }

  @Get('records/expiring')
  async getExpiringTrainings(@Query('days', ParseIntPipe) days: number = 30) {
    return this.trainingService.getExpiringTrainings(days);
  }

  // ===== CERTIFICATIONS =====

  @Post('certifications')
  async createCertification(
    @Body('employeeId') employeeId: string,
    @Body('employeeName') employeeName: string,
    @Body('certificationName') certificationName: string,
    @Body('certificationNumber') certificationNumber: string,
    @Body('type') type: CertificationType,
    @Body('issuingBody') issuingBody: string,
    @Body('issueDate') issueDate: string,
    @Body('expiryDate') expiryDate: string,
    @Body('relatedCourseId') relatedCourseId: string,
    @Body('documentUrl') documentUrl: string,
    @Body('notes') notes: string,
  ) {
    return this.trainingService.createCertification({
      employeeId,
      employeeName,
      certificationName,
      certificationNumber,
      type,
      issuingBody,
      issueDate: new Date(issueDate),
      expiryDate: new Date(expiryDate),
      relatedCourseId,
      documentUrl,
      notes,
    });
  }

  @Get('certifications/:certId')
  async getCertification(@Param('certId') certId: string) {
    return this.trainingService.getCertification(certId);
  }

  @Get('employees/:employeeId/certifications')
  async getEmployeeCertifications(@Param('employeeId') employeeId: string) {
    return this.trainingService.getEmployeeCertifications(employeeId);
  }

  @Get('certifications/expiring')
  async getExpiringCertifications(@Query('days', ParseIntPipe) days: number = 30) {
    return this.trainingService.getExpiringCertifications(days);
  }

  @Put('certifications/:certId/status')
  async updateCertificationStatus(
    @Param('certId') certId: string,
    @Body('status') status: CertificationStatus,
  ) {
    return this.trainingService.updateCertificationStatus(certId, status);
  }

  @Post('certifications/:certId/renew')
  async markRenewalInProgress(@Param('certId') certId: string) {
    return this.trainingService.markRenewalInProgress(certId);
  }

  // ===== COMPETENCY MATRIX =====

  @Post('competency-matrix')
  async createCompetencyMatrix(
    @Body('employeeId') employeeId: string,
    @Body('employeeName') employeeName: string,
    @Body('department') department: string,
    @Body('jobRole') jobRole: string,
    @Body('competencies') competencies: any[],
  ) {
    return this.trainingService.createCompetencyMatrix({
      employeeId,
      employeeName,
      department,
      jobRole,
      competencies,
    });
  }

  @Get('competency-matrix/:employeeId')
  async getCompetencyMatrix(@Param('employeeId') employeeId: string) {
    return this.trainingService.getCompetencyMatrix(employeeId);
  }

  @Put('competency-matrix/:employeeId/competency/:competencyId')
  async updateCompetency(
    @Param('employeeId') employeeId: string,
    @Param('competencyId') competencyId: string,
    @Body('currentLevel') currentLevel: CompetencyLevel,
    @Body('evidence') evidence: string[],
  ) {
    return this.trainingService.updateCompetency(employeeId, competencyId, currentLevel, evidence);
  }

  @Get('competency-gaps')
  async getCompetencyGaps(@Query('department') department?: string) {
    return this.trainingService.getCompetencyGaps(department);
  }

  // ===== INDUCTION PROGRAMS =====

  @Post('inductions')
  async createInductionProgram(
    @Body('employeeId') employeeId: string,
    @Body('employeeName') employeeName: string,
    @Body('startDate') startDate: string,
    @Body('department') department: string,
    @Body('supervisor') supervisor: string,
    @Body('hrContact') hrContact: string,
    @Body('targetCompletionDays') targetCompletionDays: number,
  ) {
    return this.trainingService.createInductionProgram({
      employeeId,
      employeeName,
      startDate: new Date(startDate),
      department,
      supervisor,
      hrContact,
      targetCompletionDays,
    });
  }

  @Get('inductions/:programId')
  async getInductionProgram(@Param('programId') programId: string) {
    return this.trainingService.getInductionProgram(programId);
  }

  @Get('employees/:employeeId/induction')
  async getEmployeeInduction(@Param('employeeId') employeeId: string) {
    return this.trainingService.getEmployeeInduction(employeeId);
  }

  @Post('inductions/:programId/advance-phase')
  async advanceInductionPhase(
    @Param('programId') programId: string,
    @Body('signedOffBy') signedOffBy: string,
  ) {
    return this.trainingService.advanceInductionPhase(programId, signedOffBy);
  }

  @Put('inductions/:programId/checklist/:itemId')
  async completeChecklistItem(
    @Param('programId') programId: string,
    @Param('itemId') itemId: string,
    @Body('completedBy') completedBy: string,
    @Body('evidence') evidence: string,
  ) {
    return this.trainingService.completeChecklistItem(programId, itemId, completedBy, evidence);
  }

  @Put('inductions/:programId/documents/:documentId/sign')
  async signInductionDocument(
    @Param('programId') programId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.trainingService.signInductionDocument(programId, documentId);
  }

  @Post('inductions/:programId/link-training')
  async linkTrainingToInduction(
    @Param('programId') programId: string,
    @Body('phase') phase: InductionPhase,
    @Body('trainingRecordId') trainingRecordId: string,
  ) {
    return this.trainingService.linkTrainingToInduction(programId, phase, trainingRecordId);
  }

  @Get('inductions/overdue')
  async getOverdueInductions() {
    return this.trainingService.getOverdueInductions();
  }

  // ===== SSM TRAINING LOG =====

  @Get('ssm-log')
  async generateSSMTrainingLog(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('locationId') locationId?: string,
    @Query('department') department?: string,
  ) {
    return this.trainingService.generateSSMTrainingLog(
      { from: new Date(fromDate), to: new Date(toDate) },
      locationId,
      department,
    );
  }

  // ===== ALERTS & COMPLIANCE =====

  @Post('alerts/generate')
  async generateAlerts() {
    return this.trainingService.generateAlerts();
  }

  @Put('alerts/:alertId/acknowledge')
  async acknowledgeAlert(
    @Param('alertId') alertId: string,
    @Body('acknowledgedBy') acknowledgedBy: string,
  ) {
    return this.trainingService.acknowledgeAlert(alertId, acknowledgedBy);
  }

  @Get('employees/:employeeId/compliance/:role')
  async checkEmployeeCompliance(
    @Param('employeeId') employeeId: string,
    @Param('role') role: string,
  ) {
    return this.trainingService.checkEmployeeCompliance(employeeId, role);
  }

  // ===== DASHBOARD =====

  @Get('dashboard')
  async getTrainingDashboard() {
    return this.trainingService.getTrainingDashboard();
  }
}
