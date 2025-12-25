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
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  FreelancerService,
  FreelancerStatus,
  AvailabilityStatus,
  SkillLevel,
  ContractType,
  ProjectStatus,
  ApplicationStatus,
} from './freelancer.service';

// Freelancer & Collaboration Hub Controller
// AI-powered talent matching, vendor portal, and gig economy orchestration

@Controller('freelancer')
@UseGuards(ThrottlerGuard)
export class FreelancerController {
  constructor(private readonly freelancerService: FreelancerService) {}

  // ===== FREELANCER PROFILES =====

  @Post('profiles')
  async createProfile(
    @Body('userId') userId: string,
    @Body('email') email: string,
    @Body('firstName') firstName: string,
    @Body('lastName') lastName: string,
    @Body('displayName') displayName: string,
    @Body('title') title: string,
    @Body('bio') bio: string,
    @Body('hourlyRate') hourlyRate: number,
    @Body('currency') currency: string,
    @Body('contractType') contractType: ContractType,
    @Body('country') country: string,
    @Body('city') city: string,
    @Body('timezone') timezone: string,
    @Body('remoteOnly') remoteOnly: boolean,
    @Body('businessName') businessName?: string,
    @Body('cui') cui?: string,
    @Body('vatNumber') vatNumber?: string,
  ) {
    return this.freelancerService.createFreelancerProfile({
      userId,
      email,
      firstName,
      lastName,
      displayName,
      title,
      bio,
      skills: [],
      hourlyRate,
      currency,
      contractType,
      businessName,
      cui,
      vatNumber,
      country,
      city,
      timezone,
      availability: 'AVAILABLE',
      availableHoursPerWeek: 40,
      preferredProjectDuration: ['MEDIUM_TERM'],
      remoteOnly,
      willingToTravel: false,
      status: 'PENDING_VERIFICATION',
      identityVerified: false,
      portfolioVerified: false,
      skillsVerified: false,
    });
  }

  @Get('profiles/:freelancerId')
  async getProfile(@Param('freelancerId') freelancerId: string) {
    return this.freelancerService.getFreelancerProfile(freelancerId);
  }

  @Put('profiles/:freelancerId')
  async updateProfile(
    @Param('freelancerId') freelancerId: string,
    @Body() updates: Record<string, any>,
  ) {
    return this.freelancerService.updateFreelancerProfile(freelancerId, updates);
  }

  @Put('profiles/:freelancerId/status')
  async updateProfileStatus(
    @Param('freelancerId') freelancerId: string,
    @Body('status') status: FreelancerStatus,
  ) {
    return this.freelancerService.updateFreelancerProfile(freelancerId, { status });
  }

  @Put('profiles/:freelancerId/availability')
  async updateAvailability(
    @Param('freelancerId') freelancerId: string,
    @Body('availability') availability: AvailabilityStatus,
    @Body('availableHoursPerWeek') availableHoursPerWeek?: number,
  ) {
    const updates: Record<string, any> = { availability };
    if (availableHoursPerWeek !== undefined) {
      updates.availableHoursPerWeek = availableHoursPerWeek;
    }
    return this.freelancerService.updateFreelancerProfile(freelancerId, updates);
  }

  @Get('profiles')
  async searchProfiles(
    @Query('skills') skills?: string,
    @Query('minRating') minRating?: string,
    @Query('maxHourlyRate') maxHourlyRate?: string,
    @Query('minHourlyRate') minHourlyRate?: string,
    @Query('availability') availability?: string,
    @Query('contractTypes') contractTypes?: string,
    @Query('countries') countries?: string,
    @Query('remoteOnly') remoteOnly?: string,
    @Query('verifiedOnly') verifiedOnly?: string,
  ) {
    return this.freelancerService.searchFreelancers({
      skills: skills?.split(','),
      minRating: minRating ? parseFloat(minRating) : undefined,
      maxHourlyRate: maxHourlyRate ? parseFloat(maxHourlyRate) : undefined,
      minHourlyRate: minHourlyRate ? parseFloat(minHourlyRate) : undefined,
      availability: availability?.split(',') as AvailabilityStatus[],
      contractTypes: contractTypes?.split(',') as ContractType[],
      countries: countries?.split(','),
      remoteOnly: remoteOnly === 'true',
      verifiedOnly: verifiedOnly === 'true',
    });
  }

  // ===== SKILLS =====

  @Post('profiles/:freelancerId/skills')
  async addSkill(
    @Param('freelancerId') freelancerId: string,
    @Body('name') name: string,
    @Body('category') category: string,
    @Body('level') level: SkillLevel,
    @Body('yearsExperience') yearsExperience: number,
  ) {
    return this.freelancerService.addSkill(freelancerId, {
      name,
      category,
      level,
      yearsExperience,
    });
  }

  @Put('profiles/:freelancerId/skills/:skillId/verify')
  async verifySkill(
    @Param('freelancerId') freelancerId: string,
    @Param('skillId') skillId: string,
  ) {
    return this.freelancerService.verifySkill(freelancerId, skillId);
  }

  @Post('profiles/:freelancerId/skills/:skillId/endorse')
  async endorseSkill(
    @Param('freelancerId') freelancerId: string,
    @Param('skillId') skillId: string,
  ) {
    return this.freelancerService.endorseSkill(freelancerId, skillId);
  }

  // ===== AI MATCHING =====

  @Get('projects/:projectId/matches')
  async matchFreelancersToProject(@Param('projectId') projectId: string) {
    return this.freelancerService.matchFreelancersToProject(projectId);
  }

  @Get('profiles/:freelancerId/similar')
  async findSimilarFreelancers(
    @Param('freelancerId') freelancerId: string,
    @Query('limit') limit?: string,
  ) {
    return this.freelancerService.findSimilarFreelancers(
      freelancerId,
      limit ? parseInt(limit) : 5,
    );
  }

  // ===== PROJECTS =====

  @Post('projects')
  async createProject(
    @Body('clientId') clientId: string,
    @Body('title') title: string,
    @Body('description') description: string,
    @Body('requiredSkills') requiredSkills: { skillName: string; minLevel: SkillLevel; required: boolean }[],
    @Body('budgetType') budgetType: 'FIXED' | 'HOURLY' | 'MILESTONE',
    @Body('budgetMin') budgetMin: number,
    @Body('budgetMax') budgetMax: number,
    @Body('currency') currency: string,
    @Body('estimatedDuration') estimatedDuration: number,
    @Body('locationType') locationType: 'REMOTE' | 'ONSITE' | 'HYBRID',
    @Body('country') country: string,
    @Body('experienceLevel') experienceLevel: 'ENTRY' | 'INTERMEDIATE' | 'SENIOR' | 'EXPERT',
    @Body('contractTypes') contractTypes: ContractType[],
    @Body('languagesRequired') languagesRequired: string[],
    @Body('startDate') startDate?: string,
    @Body('endDate') endDate?: string,
    @Body('location') location?: string,
  ) {
    return this.freelancerService.createProject({
      clientId,
      title,
      description,
      requiredSkills,
      budgetType,
      budgetMin,
      budgetMax,
      currency,
      estimatedDuration,
      locationType,
      country,
      location,
      experienceLevel,
      contractTypes,
      languagesRequired,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status: 'DRAFT',
      visibility: 'PUBLIC',
    });
  }

  @Get('projects/:projectId')
  async getProject(@Param('projectId') projectId: string) {
    return this.freelancerService.getProject(projectId);
  }

  @Put('projects/:projectId')
  async updateProject(
    @Param('projectId') projectId: string,
    @Body() updates: Record<string, any>,
  ) {
    return this.freelancerService.updateProject(projectId, updates);
  }

  @Post('projects/:projectId/publish')
  async publishProject(@Param('projectId') projectId: string) {
    return this.freelancerService.publishProject(projectId);
  }

  @Get('projects')
  async searchProjects(
    @Query('skills') skills?: string,
    @Query('budgetMin') budgetMin?: string,
    @Query('budgetMax') budgetMax?: string,
    @Query('locationType') locationType?: string,
    @Query('countries') countries?: string,
    @Query('experienceLevel') experienceLevel?: string,
    @Query('contractTypes') contractTypes?: string,
    @Query('status') status?: string,
  ) {
    return this.freelancerService.searchProjects({
      skills: skills?.split(','),
      budgetMin: budgetMin ? parseFloat(budgetMin) : undefined,
      budgetMax: budgetMax ? parseFloat(budgetMax) : undefined,
      locationType: locationType?.split(',') as ('REMOTE' | 'ONSITE' | 'HYBRID')[],
      countries: countries?.split(','),
      experienceLevel: experienceLevel?.split(',') as ('ENTRY' | 'INTERMEDIATE' | 'SENIOR' | 'EXPERT')[],
      contractTypes: contractTypes?.split(',') as ContractType[],
      status: status?.split(',') as ProjectStatus[],
    });
  }

  // ===== APPLICATIONS =====

  @Post('applications')
  async applyToProject(
    @Body('projectId') projectId: string,
    @Body('freelancerId') freelancerId: string,
    @Body('coverLetter') coverLetter: string,
    @Body('proposedRate') proposedRate: number,
    @Body('proposedDuration') proposedDuration: number,
    @Body('proposedStartDate') proposedStartDate: string,
  ) {
    return this.freelancerService.applyToProject({
      projectId,
      freelancerId,
      coverLetter,
      proposedRate,
      proposedDuration,
      proposedStartDate: new Date(proposedStartDate),
    });
  }

  @Get('projects/:projectId/applications')
  async getProjectApplications(@Param('projectId') projectId: string) {
    return this.freelancerService.getApplicationsForProject(projectId);
  }

  @Get('profiles/:freelancerId/applications')
  async getFreelancerApplications(@Param('freelancerId') freelancerId: string) {
    return this.freelancerService.getApplicationsForFreelancer(freelancerId);
  }

  @Put('applications/:applicationId/status')
  async updateApplicationStatus(
    @Param('applicationId') applicationId: string,
    @Body('status') status: ApplicationStatus,
    @Body('notes') notes?: string,
  ) {
    return this.freelancerService.updateApplicationStatus(applicationId, status, notes);
  }

  @Post('applications/:applicationId/interview')
  async scheduleInterview(
    @Param('applicationId') applicationId: string,
    @Body('scheduledAt') scheduledAt: string,
  ) {
    return this.freelancerService.scheduleInterview(applicationId, new Date(scheduledAt));
  }

  @Post('applications/:applicationId/interview-rating')
  async rateInterview(
    @Param('applicationId') applicationId: string,
    @Body('rating') rating: number,
    @Body('notes') notes: string,
  ) {
    return this.freelancerService.rateInterview(applicationId, rating, notes);
  }

  // ===== REVIEWS =====

  @Post('reviews')
  async addReview(
    @Body('freelancerId') freelancerId: string,
    @Body('projectId') projectId: string,
    @Body('clientId') clientId: string,
    @Body('overallRating') overallRating: number,
    @Body('qualityRating') qualityRating: number,
    @Body('communicationRating') communicationRating: number,
    @Body('timelinessRating') timelinessRating: number,
    @Body('professionalismRating') professionalismRating: number,
    @Body('publicFeedback') publicFeedback: string,
    @Body('projectTitle') projectTitle: string,
    @Body('projectValue') projectValue: number,
    @Body('privateFeedback') privateFeedback?: string,
  ) {
    return this.freelancerService.addReview({
      freelancerId,
      projectId,
      clientId,
      overallRating,
      qualityRating,
      communicationRating,
      timelinessRating,
      professionalismRating,
      publicFeedback,
      privateFeedback,
      projectTitle,
      projectValue,
    });
  }

  @Get('profiles/:freelancerId/reviews')
  async getFreelancerReviews(@Param('freelancerId') freelancerId: string) {
    return this.freelancerService.getFreelancerReviews(freelancerId);
  }

  // ===== EU POSTED WORKERS =====

  @Post('posted-workers')
  async createPostedWorkerDeclaration(
    @Body('freelancerId') freelancerId: string,
    @Body('projectId') projectId: string,
    @Body('workerNationality') workerNationality: string,
    @Body('homeCountry') homeCountry: string,
    @Body('hostCountry') hostCountry: string,
    @Body('startDate') startDate: string,
    @Body('endDate') endDate: string,
    @Body('workLocation') workLocation: string,
    @Body('jobDescription') jobDescription: string,
    @Body('hourlyRate') hourlyRate: number,
    @Body('currency') currency: string,
    @Body('workingHoursPerWeek') workingHoursPerWeek: number,
    @Body('restDays') restDays: string[],
    @Body('equalTreatmentConfirmed') equalTreatmentConfirmed: boolean,
    @Body('a1CertificateNumber') a1CertificateNumber?: string,
    @Body('a1ExpiryDate') a1ExpiryDate?: string,
    @Body('healthInsuranceProvider') healthInsuranceProvider?: string,
    @Body('healthInsurancePolicyNumber') healthInsurancePolicyNumber?: string,
  ) {
    return this.freelancerService.createPostedWorkerDeclaration({
      freelancerId,
      projectId,
      workerNationality,
      homeCountry,
      hostCountry,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      workLocation,
      jobDescription,
      hourlyRate,
      currency,
      workingHoursPerWeek,
      restDays,
      a1CertificateNumber,
      a1ExpiryDate: a1ExpiryDate ? new Date(a1ExpiryDate) : undefined,
      healthInsuranceProvider,
      healthInsurancePolicyNumber,
      equalTreatmentConfirmed,
      submittedToAuthority: false,
      status: 'DRAFT',
    });
  }

  @Get('posted-workers/:declarationId')
  async getPostedWorkerDeclaration(@Param('declarationId') declarationId: string) {
    return this.freelancerService.getPostedWorkerDeclaration(declarationId);
  }

  @Post('posted-workers/:declarationId/submit')
  async submitPostedWorkerDeclaration(@Param('declarationId') declarationId: string) {
    return this.freelancerService.submitPostedWorkerDeclaration(declarationId);
  }

  @Get('posted-workers/:declarationId/validate')
  async validatePostedWorkerDeclaration(@Param('declarationId') declarationId: string) {
    const declaration = await this.freelancerService.getPostedWorkerDeclaration(declarationId);
    if (!declaration) throw new Error('Declaration not found');
    return this.freelancerService.validatePostedWorkerDeclaration(declaration);
  }

  @Get('profiles/:freelancerId/posted-workers')
  async getFreelancerPostedWorkerDeclarations(@Param('freelancerId') freelancerId: string) {
    return this.freelancerService.getPostedWorkerDeclarationsForFreelancer(freelancerId);
  }

  @Get('compliance/cross-border')
  async checkCrossBorderCompliance(
    @Query('freelancerId') freelancerId: string,
    @Query('hostCountry') hostCountry: string,
    @Query('hourlyRate') hourlyRate: string,
  ) {
    return this.freelancerService.checkCrossBorderCompliance(
      freelancerId,
      hostCountry,
      parseFloat(hourlyRate),
    );
  }

  // ===== WORKFORCE CLASSIFICATION =====

  @Post('classification')
  async performClassificationAssessment(
    @Body('freelancerId') freelancerId: string,
    @Body('assessedBy') assessedBy: string,
    @Body('criteria') criteria: {
      setsOwnSchedule: boolean;
      choosesWorkLocation: boolean;
      usesOwnEquipment: boolean;
      canSubcontract: boolean;
      multipleClients: boolean;
      clientRevenueShare: number;
      marketsProfessionally: boolean;
      setsOwnRates: boolean;
      wearsCompanyUniform: boolean;
      usesCompanyEmail: boolean;
      attendsCompanyMeetings: boolean;
      reportsTomanager: boolean;
      bearsFinancialRisk: boolean;
      canIncreaseProfit: boolean;
      invoicesForServices: boolean;
      hasBusinessRegistration: boolean;
    },
  ) {
    return this.freelancerService.performClassificationAssessment(
      freelancerId,
      assessedBy,
      criteria,
    );
  }

  @Get('profiles/:freelancerId/classification')
  async getClassificationAssessments(@Param('freelancerId') freelancerId: string) {
    return this.freelancerService.getClassificationAssessments(freelancerId);
  }

  @Get('profiles/:freelancerId/classification/latest')
  async getLatestClassification(@Param('freelancerId') freelancerId: string) {
    return this.freelancerService.getLatestClassification(freelancerId);
  }

  // ===== VENDOR PORTAL =====

  @Get('portal/:freelancerId/dashboard')
  async getVendorDashboard(@Param('freelancerId') freelancerId: string) {
    return this.freelancerService.getVendorDashboard(freelancerId);
  }

  @Get('portal/:freelancerId/analytics')
  async getFreelancerAnalytics(@Param('freelancerId') freelancerId: string) {
    return this.freelancerService.getFreelancerAnalytics(freelancerId);
  }

  // ===== PLATFORM STATISTICS =====

  @Get('statistics')
  async getPlatformStatistics() {
    return this.freelancerService.getPlatformStatistics();
  }

  // ===== REFERENCE DATA =====

  @Get('reference/skill-categories')
  getSkillCategories() {
    return this.freelancerService.getSkillCategories();
  }

  @Get('reference/eu-countries')
  getEUCountries() {
    return this.freelancerService.getEUCountries();
  }

  @Get('reference/minimum-wages')
  getMinimumWages() {
    return this.freelancerService.getMinimumWages();
  }
}
