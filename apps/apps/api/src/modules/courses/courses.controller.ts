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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import {
  CreateCourseDto,
  UpdateCourseDto,
  CreateLessonDto,
  UpdateLessonDto,
  CreateQuizDto,
  CreateReviewDto,
  UpdateLessonProgressDto,
  CourseFilterDto,
} from './dto/courses.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Courses')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  // ==================== COURSES ====================

  @Get()
  @ApiOperation({ summary: 'Get all published courses' })
  @ApiResponse({ status: 200, description: 'Courses returned' })
  async getCourses(@Query() filters: CourseFilterDto) {
    return this.coursesService.getCourses(filters);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get course categories' })
  @ApiResponse({ status: 200, description: 'Categories returned' })
  async getCategories() {
    return this.coursesService.getCourseCategories();
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular courses' })
  @ApiResponse({ status: 200, description: 'Popular courses returned' })
  async getPopularCourses(@Query('limit') limit?: number) {
    return this.coursesService.getPopularCourses(limit || 6);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get course by slug' })
  @ApiParam({ name: 'slug', description: 'Course slug' })
  @ApiResponse({ status: 200, description: 'Course returned' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async getCourseBySlug(
    @Param('slug') slug: string,
    @CurrentUser() user?: any,
  ) {
    return this.coursesService.getCourseBySlug(slug, user?.id);
  }

  @Post()
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new course' })
  @ApiResponse({ status: 201, description: 'Course created' })
  async createCourse(@CurrentUser() user: any, @Body() dto: CreateCourseDto) {
    return this.coursesService.createCourse(user.id, dto);
  }

  @Put(':id')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update course' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({ status: 200, description: 'Course updated' })
  async updateCourse(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.coursesService.updateCourse(id, user.id, dto);
  }

  @Delete(':id')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete course' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({ status: 200, description: 'Course deleted' })
  async deleteCourse(@Param('id') id: string, @CurrentUser() user: any) {
    return this.coursesService.deleteCourse(id, user.id);
  }

  // ==================== LESSONS ====================

  @Get(':courseSlug/lessons/:lessonSlug')
  @ApiOperation({ summary: 'Get lesson content' })
  @ApiParam({ name: 'courseSlug', description: 'Course slug' })
  @ApiParam({ name: 'lessonSlug', description: 'Lesson slug' })
  @ApiResponse({ status: 200, description: 'Lesson returned' })
  async getLesson(
    @Param('courseSlug') courseSlug: string,
    @Param('lessonSlug') lessonSlug: string,
    @CurrentUser() user?: any,
  ) {
    return this.coursesService.getLesson(courseSlug, lessonSlug, user?.id);
  }

  @Post(':courseId/lessons')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add lesson to course' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({ status: 201, description: 'Lesson created' })
  async createLesson(
    @Param('courseId') courseId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateLessonDto,
  ) {
    return this.coursesService.createLesson(courseId, user.id, dto);
  }

  @Put('lessons/:lessonId')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update lesson' })
  @ApiParam({ name: 'lessonId', description: 'Lesson ID' })
  @ApiResponse({ status: 200, description: 'Lesson updated' })
  async updateLesson(
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.coursesService.updateLesson(lessonId, user.id, dto);
  }

  @Delete('lessons/:lessonId')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete lesson' })
  @ApiParam({ name: 'lessonId', description: 'Lesson ID' })
  @ApiResponse({ status: 200, description: 'Lesson deleted' })
  async deleteLesson(
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: any,
  ) {
    return this.coursesService.deleteLesson(lessonId, user.id);
  }

  // ==================== ENROLLMENT ====================

  @Post(':courseId/enroll')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enroll in a course' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({ status: 201, description: 'Enrolled successfully' })
  async enroll(@Param('courseId') courseId: string, @CurrentUser() user: any) {
    return this.coursesService.enroll(courseId, user.id);
  }

  @Get('my/enrollments')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my course enrollments' })
  @ApiResponse({ status: 200, description: 'Enrollments returned' })
  async getMyEnrollments(@CurrentUser() user: any) {
    return this.coursesService.getMyEnrollments(user.id);
  }

  // ==================== PROGRESS ====================

  @Put('enrollments/:enrollmentId/lessons/:lessonId/progress')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update lesson progress' })
  @ApiParam({ name: 'enrollmentId', description: 'Enrollment ID' })
  @ApiParam({ name: 'lessonId', description: 'Lesson ID' })
  @ApiResponse({ status: 200, description: 'Progress updated' })
  async updateLessonProgress(
    @Param('enrollmentId') enrollmentId: string,
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateLessonProgressDto,
  ) {
    return this.coursesService.updateLessonProgress(enrollmentId, lessonId, user.id, dto);
  }

  // ==================== REVIEWS ====================

  @Post(':courseId/reviews')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a course review' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({ status: 201, description: 'Review created' })
  async createReview(
    @Param('courseId') courseId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateReviewDto,
  ) {
    return this.coursesService.createReview(courseId, user.id, dto);
  }

  // ==================== QUIZZES ====================

  @Post('lessons/:lessonId/quizzes')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add quiz to lesson' })
  @ApiParam({ name: 'lessonId', description: 'Lesson ID' })
  @ApiResponse({ status: 201, description: 'Quiz created' })
  async createQuiz(
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateQuizDto,
  ) {
    return this.coursesService.createQuiz(lessonId, user.id, dto);
  }

  // ==================== ADAPTIVE LEARNING ====================

  @Get('my/recommendations')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get personalized course recommendations' })
  @ApiResponse({ status: 200, description: 'Recommendations returned' })
  async getRecommendations(
    @CurrentUser() user: any,
    @Query('limit') limit?: number,
  ) {
    return this.coursesService.getRecommendations(user.id, limit || 5);
  }

  @Get('my/learning-stats')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get learning statistics' })
  @ApiResponse({ status: 200, description: 'Stats returned' })
  async getLearningStats(@CurrentUser() user: any) {
    return this.coursesService.getLearningStats(user.id);
  }

  @Post('my/learning-path')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate personalized learning path' })
  @ApiResponse({ status: 201, description: 'Learning path generated' })
  async getLearningPath(
    @CurrentUser() user: any,
    @Body() body: { goal: string; weeklyHours?: number },
  ) {
    return this.coursesService.getLearningPath(user.id, body.goal, body.weeklyHours);
  }

  @Post('lessons/:lessonId/analyze-quiz')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Analyze quiz performance with AI' })
  @ApiParam({ name: 'lessonId', description: 'Lesson ID' })
  @ApiResponse({ status: 200, description: 'Quiz analysis returned' })
  async analyzeQuiz(
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: any,
    @Body() body: {
      questions: Array<{ id: string; topic: string; correct_answer: string }>;
      answers: Array<{ question_id: string; selected: string }>;
      timeSpentSeconds: number;
    },
  ) {
    return this.coursesService.analyzeQuizPerformance(
      user.id,
      lessonId,
      body.questions,
      body.answers,
      body.timeSpentSeconds,
    );
  }
}
