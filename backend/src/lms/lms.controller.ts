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
  LMSService,
  Course,
  CourseCategory,
  CourseModule,
  Lesson,
  LessonContent,
  Enrollment,
  Assessment,
  Question,
  AssessmentSettings,
  AttemptAnswer,
  Badge,
} from './lms.service';

// Learning Management System Controller
// Course management, enrollments, progress tracking, assessments, certificates, gamification

@Controller('lms')
@UseGuards(ThrottlerGuard)
export class LMSController {
  constructor(private readonly lmsService: LMSService) {}

  // ===== COURSE MANAGEMENT =====

  @Post('courses')
  async createCourse(
    @Body('title') title: string,
    @Body('description') description: string,
    @Body('shortDescription') shortDescription: string,
    @Body('instructorId') instructorId: string,
    @Body('category') category: CourseCategory,
    @Body('level') level: Course['level'],
    @Body('language') language: string,
    @Body('learningOutcomes') learningOutcomes: string[],
    @Body('targetAudience') targetAudience: string[],
    @Body('price') price: number,
    @Body('currency') currency: string,
    @Body('subcategory') subcategory?: string,
    @Body('prerequisites') prerequisites?: string[],
    @Body('tags') tags?: string[],
    @Body('certificateEnabled') certificateEnabled?: boolean,
    @Body('hrdaEligible') hrdaEligible?: boolean,
    @Body('ceuCredits') ceuCredits?: number,
    @Body('thumbnail') thumbnail?: string,
    @Body('previewVideo') previewVideo?: string,
  ) {
    return this.lmsService.createCourse({
      title,
      description,
      shortDescription,
      instructorId,
      category,
      subcategory,
      level,
      language,
      prerequisites,
      learningOutcomes,
      targetAudience,
      tags,
      price,
      currency,
      certificateEnabled,
      hrdaEligible,
      ceuCredits,
      thumbnail,
      previewVideo,
    });
  }

  @Get('courses')
  async listCourses(
    @Query('category') category?: CourseCategory,
    @Query('level') level?: Course['level'],
    @Query('status') status?: Course['status'],
    @Query('isFree') isFree?: string,
    @Query('instructorId') instructorId?: string,
    @Query('search') search?: string,
  ) {
    return this.lmsService.listCourses({
      category,
      level,
      status,
      isFree: isFree ? isFree === 'true' : undefined,
      instructorId,
      search,
    });
  }

  @Get('courses/:courseId')
  async getCourse(@Param('courseId') courseId: string) {
    return this.lmsService.getCourse(courseId);
  }

  @Get('courses/slug/:slug')
  async getCourseBySlug(@Param('slug') slug: string) {
    return this.lmsService.getCourseBySlug(slug);
  }

  @Put('courses/:courseId')
  async updateCourse(
    @Param('courseId') courseId: string,
    @Body() updates: Partial<Course>,
  ) {
    return this.lmsService.updateCourse(courseId, updates);
  }

  @Post('courses/:courseId/publish')
  async publishCourse(@Param('courseId') courseId: string) {
    return this.lmsService.publishCourse(courseId);
  }

  // ===== MODULE MANAGEMENT =====

  @Post('courses/:courseId/modules')
  async addModule(
    @Param('courseId') courseId: string,
    @Body('title') title: string,
    @Body('description') description?: string,
    @Body('isFree') isFree?: boolean,
  ) {
    return this.lmsService.addModule(courseId, { title, description, isFree });
  }

  @Put('modules/:moduleId')
  async updateModule(
    @Param('moduleId') moduleId: string,
    @Body() updates: Partial<CourseModule>,
  ) {
    return this.lmsService.updateModule(moduleId, updates);
  }

  @Post('courses/:courseId/modules/reorder')
  async reorderModules(
    @Param('courseId') courseId: string,
    @Body('moduleOrder') moduleOrder: string[],
  ) {
    return this.lmsService.reorderModules(courseId, moduleOrder);
  }

  // ===== LESSON MANAGEMENT =====

  @Post('modules/:moduleId/lessons')
  async addLesson(
    @Param('moduleId') moduleId: string,
    @Body('title') title: string,
    @Body('type') type: Lesson['type'],
    @Body('content') content: LessonContent,
    @Body('duration') duration: number,
    @Body('description') description?: string,
    @Body('isFree') isFree?: boolean,
    @Body('isPreview') isPreview?: boolean,
  ) {
    return this.lmsService.addLesson(moduleId, {
      title,
      description,
      type,
      content,
      duration,
      isFree,
      isPreview,
    });
  }

  @Put('lessons/:lessonId')
  async updateLesson(
    @Param('lessonId') lessonId: string,
    @Body() updates: Partial<Lesson>,
  ) {
    return this.lmsService.updateLesson(lessonId, updates);
  }

  @Get('lessons/:lessonId')
  async getLesson(@Param('lessonId') lessonId: string) {
    return this.lmsService.getLesson(lessonId);
  }

  // ===== ENROLLMENT MANAGEMENT =====

  @Post('enrollments')
  async enrollUser(
    @Body('userId') userId: string,
    @Body('courseId') courseId: string,
    @Body('accessType') accessType?: Enrollment['accessType'],
    @Body('paymentId') paymentId?: string,
  ) {
    return this.lmsService.enrollUser(userId, courseId, accessType, paymentId);
  }

  @Get('enrollments/:enrollmentId')
  async getEnrollment(@Param('enrollmentId') enrollmentId: string) {
    return this.lmsService.getEnrollment(enrollmentId);
  }

  @Get('enrollments/user/:userId')
  async getUserEnrollments(@Param('userId') userId: string) {
    return this.lmsService.getUserEnrollments(userId);
  }

  @Get('enrollments/course/:courseId')
  async getCourseEnrollments(@Param('courseId') courseId: string) {
    return this.lmsService.getCourseEnrollments(courseId);
  }

  // ===== PROGRESS TRACKING =====

  @Post('enrollments/:enrollmentId/lessons/:lessonId/complete')
  async markLessonComplete(
    @Param('enrollmentId') enrollmentId: string,
    @Param('lessonId') lessonId: string,
    @Body('timeSpent') timeSpent: number,
  ) {
    return this.lmsService.markLessonComplete(enrollmentId, lessonId, timeSpent);
  }

  @Post('enrollments/:enrollmentId/current-lesson')
  async setCurrentLesson(
    @Param('enrollmentId') enrollmentId: string,
    @Body('lessonId') lessonId: string,
  ) {
    return this.lmsService.setCurrentLesson(enrollmentId, lessonId);
  }

  // ===== ASSESSMENTS =====

  @Post('assessments')
  async createAssessment(
    @Body('courseId') courseId: string,
    @Body('title') title: string,
    @Body('type') type: Assessment['type'],
    @Body('questions') questions: Question[],
    @Body('passingScore') passingScore: number,
    @Body('maxAttempts') maxAttempts: number,
    @Body('moduleId') moduleId?: string,
    @Body('lessonId') lessonId?: string,
    @Body('description') description?: string,
    @Body('timeLimit') timeLimit?: number,
    @Body('settings') settings?: Partial<AssessmentSettings>,
  ) {
    return this.lmsService.createAssessment({
      courseId,
      moduleId,
      lessonId,
      title,
      description,
      type,
      questions,
      passingScore,
      maxAttempts,
      timeLimit,
      settings,
    });
  }

  @Get('assessments/:assessmentId')
  async getAssessment(@Param('assessmentId') assessmentId: string) {
    return this.lmsService.getAssessment(assessmentId);
  }

  @Post('assessments/:assessmentId/publish')
  async publishAssessment(@Param('assessmentId') assessmentId: string) {
    return this.lmsService.publishAssessment(assessmentId);
  }

  @Post('assessments/:assessmentId/attempts')
  async startAssessmentAttempt(
    @Param('assessmentId') assessmentId: string,
    @Body('userId') userId: string,
    @Body('enrollmentId') enrollmentId: string,
  ) {
    return this.lmsService.startAssessmentAttempt(assessmentId, userId, enrollmentId);
  }

  @Post('attempts/:attemptId/submit')
  async submitAssessmentAttempt(
    @Param('attemptId') attemptId: string,
    @Body('answers') answers: AttemptAnswer[],
  ) {
    return this.lmsService.submitAssessmentAttempt(attemptId, answers);
  }

  @Get('attempts/:attemptId')
  async getAttempt(@Param('attemptId') attemptId: string) {
    return this.lmsService.getAttempt(attemptId);
  }

  @Get('attempts/user/:userId')
  async getUserAttempts(
    @Param('userId') userId: string,
    @Query('assessmentId') assessmentId?: string,
  ) {
    return this.lmsService.getUserAttempts(userId, assessmentId);
  }

  // ===== CERTIFICATES =====

  @Post('certificates')
  async generateCertificate(
    @Body('enrollmentId') enrollmentId: string,
    @Body('grade') grade?: string,
  ) {
    return this.lmsService.generateCertificate(enrollmentId, grade);
  }

  @Get('certificates/:certificateId')
  async getCertificate(@Param('certificateId') certificateId: string) {
    return this.lmsService.getCertificate(certificateId);
  }

  @Get('certificates/verify/:certificateNumber')
  async verifyCertificate(@Param('certificateNumber') certificateNumber: string) {
    return this.lmsService.getCertificateByNumber(certificateNumber);
  }

  @Get('certificates/user/:userId')
  async getUserCertificates(@Param('userId') userId: string) {
    return this.lmsService.getUserCertificates(userId);
  }

  // ===== GAMIFICATION =====

  @Get('badges')
  async getAllBadges() {
    return this.lmsService.getAllBadges();
  }

  @Get('badges/user/:userId')
  async getUserBadges(@Param('userId') userId: string) {
    return this.lmsService.getUserBadges(userId);
  }

  @Post('badges/award')
  async awardBadge(
    @Body('userId') userId: string,
    @Body('badgeId') badgeId: string,
    @Body('courseId') courseId?: string,
  ) {
    return this.lmsService.awardBadge(userId, badgeId, courseId);
  }

  @Get('leaderboard')
  async getLeaderboard(
    @Query('period') period?: 'WEEKLY' | 'MONTHLY' | 'ALL_TIME',
    @Query('limit') limit?: string,
  ) {
    return this.lmsService.getLeaderboard(
      period || 'ALL_TIME',
      limit ? parseInt(limit, 10) : 10,
    );
  }

  // ===== REVIEWS =====

  @Post('courses/:courseId/reviews')
  async addReview(
    @Param('courseId') courseId: string,
    @Body('userId') userId: string,
    @Body('rating') rating: number,
    @Body('content') content: string,
    @Body('title') title?: string,
  ) {
    return this.lmsService.addReview(courseId, userId, { rating, title, content });
  }

  @Get('courses/:courseId/reviews')
  async getCourseReviews(@Param('courseId') courseId: string) {
    return this.lmsService.getCourseReviews(courseId);
  }

  // ===== LEARNING PATHS =====

  @Post('learning-paths')
  async createLearningPath(
    @Body('title') title: string,
    @Body('description') description: string,
    @Body('courses') courses: string[],
    @Body('skills') skills: string[],
    @Body('thumbnail') thumbnail?: string,
    @Body('certificateName') certificateName?: string,
  ) {
    return this.lmsService.createLearningPath({
      title,
      description,
      thumbnail,
      courses,
      skills,
      certificateName,
    });
  }

  @Get('learning-paths')
  async listLearningPaths() {
    return this.lmsService.listLearningPaths();
  }

  @Get('learning-paths/:pathId')
  async getLearningPath(@Param('pathId') pathId: string) {
    return this.lmsService.getLearningPath(pathId);
  }

  // ===== INSTRUCTORS =====

  @Post('instructors')
  async createInstructor(
    @Body('id') id: string,
    @Body('name') name: string,
    @Body('title') title: string,
    @Body('bio') bio: string,
    @Body('expertise') expertise: string[],
    @Body('avatar') avatar?: string,
  ) {
    return this.lmsService.createInstructor({
      id,
      name,
      title,
      bio,
      avatar,
      expertise,
    });
  }

  @Get('instructors/:instructorId')
  async getInstructor(@Param('instructorId') instructorId: string) {
    return this.lmsService.getInstructor(instructorId);
  }

  // ===== REFERENCE DATA =====

  @Get('reference/categories')
  getCourseCategories() {
    return this.lmsService.getCourseCategories();
  }

  @Get('reference/levels')
  getCourseLevels() {
    return this.lmsService.getCourseLevels();
  }

  @Get('reference/assessment-types')
  getAssessmentTypes() {
    return this.lmsService.getAssessmentTypes();
  }

  @Get('reference/lesson-types')
  getLessonTypes() {
    return this.lmsService.getLessonTypes();
  }
}
