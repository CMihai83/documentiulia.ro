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
  ParseIntPipe,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  ATSService,
  JobStatus,
  JobType,
  ExperienceLevel,
  CandidateStatus,
  ApplicationSource,
  InterviewType,
  JobPosting,
  Candidate,
  InterviewFeedback,
} from './ats.service';

// ATS (Applicant Tracking System) Controller
// API endpoints for recruitment management with AI-powered features

@Controller('ats')
@UseGuards(ThrottlerGuard)
export class ATSController {
  constructor(private readonly atsService: ATSService) {}

  // ===== JOB POSTINGS =====

  @Post('jobs')
  async createJob(
    @Body() data: Partial<JobPosting>,
    @Body('creatorId') creatorId: string,
  ) {
    return this.atsService.createJobPosting(data, creatorId || 'system');
  }

  @Get('jobs')
  async listJobs(
    @Query('status') status?: JobStatus,
    @Query('department') department?: string,
    @Query('jobType') jobType?: JobType,
    @Query('experienceLevel') experienceLevel?: ExperienceLevel,
  ) {
    return this.atsService.listJobs({ status, department, jobType, experienceLevel });
  }

  @Get('jobs/search')
  async searchJobs(@Query('q') query: string) {
    return this.atsService.searchJobs(query);
  }

  @Get('jobs/:jobId')
  async getJob(@Param('jobId') jobId: string) {
    return this.atsService.getJobPosting(jobId);
  }

  @Put('jobs/:jobId')
  async updateJob(
    @Param('jobId') jobId: string,
    @Body() data: Partial<JobPosting>,
  ) {
    return this.atsService.updateJobPosting(jobId, data);
  }

  @Post('jobs/:jobId/publish')
  async publishJob(
    @Param('jobId') jobId: string,
    @Body('channels') channels: ApplicationSource[],
  ) {
    return this.atsService.publishJob(jobId, channels);
  }

  @Post('jobs/:jobId/close')
  async closeJob(@Param('jobId') jobId: string) {
    return this.atsService.closeJob(jobId);
  }

  @Get('jobs/:jobId/pipeline')
  async getJobPipeline(@Param('jobId') jobId: string) {
    return this.atsService.getPipelineStats(jobId);
  }

  @Get('jobs/:jobId/top-candidates')
  async getTopCandidates(
    @Param('jobId') jobId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.atsService.getTopCandidatesForJob(jobId, limit || 10);
  }

  // ===== CANDIDATES =====

  @Post('candidates')
  async createCandidate(@Body() data: Partial<Candidate>) {
    return this.atsService.createCandidate(data);
  }

  @Get('candidates')
  async listCandidates(
    @Query('source') source?: ApplicationSource,
    @Query('minExperience', new ParseIntPipe({ optional: true })) minExperience?: number,
    @Query('skills') skills?: string,
  ) {
    const skillsArray = skills ? skills.split(',').map(s => s.trim()) : undefined;
    return this.atsService.listCandidates({ source, minExperience, skills: skillsArray });
  }

  @Get('candidates/search')
  async searchCandidates(@Query('q') query: string) {
    return this.atsService.searchCandidates(query);
  }

  @Get('candidates/:candidateId')
  async getCandidate(@Param('candidateId') candidateId: string) {
    return this.atsService.getCandidate(candidateId);
  }

  @Put('candidates/:candidateId')
  async updateCandidate(
    @Param('candidateId') candidateId: string,
    @Body() data: Partial<Candidate>,
  ) {
    return this.atsService.updateCandidate(candidateId, data);
  }

  @Get('candidates/:candidateId/applications')
  async getCandidateApplications(@Param('candidateId') candidateId: string) {
    return this.atsService.getApplicationsForCandidate(candidateId);
  }

  @Get('candidates/:candidateId/similar')
  async getSimilarCandidates(
    @Param('candidateId') candidateId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.atsService.getSimilarCandidates(candidateId, limit || 5);
  }

  // ===== APPLICATIONS =====

  @Post('applications')
  async applyToJob(
    @Body('jobId') jobId: string,
    @Body('candidateId') candidateId: string,
    @Body('source') source: ApplicationSource,
  ) {
    return this.atsService.applyToJob(jobId, candidateId, source || ApplicationSource.DIRECT);
  }

  @Get('applications/:applicationId')
  async getApplication(@Param('applicationId') applicationId: string) {
    return this.atsService.getApplication(applicationId);
  }

  @Put('applications/:applicationId/status')
  async updateApplicationStatus(
    @Param('applicationId') applicationId: string,
    @Body('status') status: CandidateStatus,
    @Body('reason') reason?: string,
  ) {
    return this.atsService.updateApplicationStatus(applicationId, status, reason);
  }

  @Post('applications/:applicationId/notes')
  async addNote(
    @Param('applicationId') applicationId: string,
    @Body('authorId') authorId: string,
    @Body('authorName') authorName: string,
    @Body('content') content: string,
    @Body('isPrivate') isPrivate?: boolean,
  ) {
    return this.atsService.addApplicationNote(applicationId, authorId, authorName, content, isPrivate);
  }

  @Get('jobs/:jobId/applications')
  async getJobApplications(
    @Param('jobId') jobId: string,
    @Query('status') status?: CandidateStatus,
  ) {
    return this.atsService.getApplicationsForJob(jobId, status);
  }

  // ===== INTERVIEWS =====

  @Post('applications/:applicationId/interviews')
  async scheduleInterview(
    @Param('applicationId') applicationId: string,
    @Body('type') type: InterviewType,
    @Body('scheduledAt') scheduledAt: string,
    @Body('duration') duration: number,
    @Body('interviewers') interviewers: string[],
    @Body('location') location?: string,
    @Body('meetingUrl') meetingUrl?: string,
  ) {
    return this.atsService.scheduleInterview(
      applicationId,
      type,
      new Date(scheduledAt),
      duration,
      interviewers,
      location,
      meetingUrl,
    );
  }

  @Post('applications/:applicationId/interviews/:interviewId/feedback')
  async submitInterviewFeedback(
    @Param('applicationId') applicationId: string,
    @Param('interviewId') interviewId: string,
    @Body() feedback: Omit<InterviewFeedback, 'submittedAt'>,
  ) {
    return this.atsService.submitInterviewFeedback(applicationId, interviewId, feedback);
  }

  @Post('applications/:applicationId/interviews/:interviewId/cancel')
  async cancelInterview(
    @Param('applicationId') applicationId: string,
    @Param('interviewId') interviewId: string,
  ) {
    return this.atsService.cancelInterview(applicationId, interviewId);
  }

  // ===== ASSESSMENTS =====

  @Post('applications/:applicationId/assessments')
  async sendAssessment(
    @Param('applicationId') applicationId: string,
    @Body('type') type: 'TECHNICAL' | 'PERSONALITY' | 'COGNITIVE' | 'SKILLS' | 'CASE_STUDY',
    @Body('name') name: string,
    @Body('maxScore') maxScore: number,
  ) {
    return this.atsService.sendAssessment(applicationId, type, name, maxScore);
  }

  @Post('applications/:applicationId/assessments/:assessmentId/result')
  async submitAssessmentResult(
    @Param('applicationId') applicationId: string,
    @Param('assessmentId') assessmentId: string,
    @Body('score') score: number,
    @Body('results') results?: Record<string, any>,
  ) {
    return this.atsService.submitAssessmentResult(applicationId, assessmentId, score, results);
  }

  // ===== OFFERS =====

  @Post('applications/:applicationId/offer')
  async createOffer(
    @Param('applicationId') applicationId: string,
    @Body('salary') salary: number,
    @Body('currency') currency: string,
    @Body('startDate') startDate: string,
    @Body('benefits') benefits: string[],
    @Body('probationPeriod') probationPeriod: number,
    @Body('contractType') contractType: string,
    @Body('expiresInDays') expiresInDays?: number,
  ) {
    return this.atsService.createOffer(
      applicationId,
      salary,
      currency,
      startDate,
      benefits,
      probationPeriod,
      contractType,
      expiresInDays,
    );
  }

  @Post('applications/:applicationId/offer/send')
  async sendOffer(@Param('applicationId') applicationId: string) {
    return this.atsService.sendOffer(applicationId);
  }

  @Post('applications/:applicationId/offer/respond')
  async respondToOffer(
    @Param('applicationId') applicationId: string,
    @Body('accepted') accepted: boolean,
  ) {
    return this.atsService.respondToOffer(applicationId, accepted);
  }

  // ===== AI FEATURES =====

  @Post('ai/parse-cv')
  async parseCV(@Body('text') text: string) {
    return this.atsService.parseCV(text);
  }

  @Post('ai/match')
  async calculateMatch(
    @Body('candidateId') candidateId: string,
    @Body('jobId') jobId: string,
  ) {
    const candidate = await this.atsService.getCandidate(candidateId);
    const job = await this.atsService.getJobPosting(jobId);
    return this.atsService.calculateMatchScore(candidate, job);
  }

  @Post('ai/detect-bias')
  async detectBias(@Body('text') text: string) {
    return this.atsService.detectBias(text);
  }

  // ===== METRICS =====

  @Get('metrics')
  async getRecruitmentMetrics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    return this.atsService.getRecruitmentMetrics(start, end);
  }
}
