"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoursesController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const courses_service_1 = require("./courses.service");
const courses_dto_1 = require("./dto/courses.dto");
const clerk_guard_1 = require("../auth/guards/clerk.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let CoursesController = class CoursesController {
    coursesService;
    constructor(coursesService) {
        this.coursesService = coursesService;
    }
    async getCourses(filters) {
        return this.coursesService.getCourses(filters);
    }
    async getCategories() {
        return this.coursesService.getCourseCategories();
    }
    async getPopularCourses(limit) {
        return this.coursesService.getPopularCourses(limit || 6);
    }
    async getCourseBySlug(slug, user) {
        return this.coursesService.getCourseBySlug(slug, user?.id);
    }
    async createCourse(user, dto) {
        return this.coursesService.createCourse(user.id, dto);
    }
    async updateCourse(id, user, dto) {
        return this.coursesService.updateCourse(id, user.id, dto);
    }
    async deleteCourse(id, user) {
        return this.coursesService.deleteCourse(id, user.id);
    }
    async getLesson(courseSlug, lessonSlug, user) {
        return this.coursesService.getLesson(courseSlug, lessonSlug, user?.id);
    }
    async createLesson(courseId, user, dto) {
        return this.coursesService.createLesson(courseId, user.id, dto);
    }
    async updateLesson(lessonId, user, dto) {
        return this.coursesService.updateLesson(lessonId, user.id, dto);
    }
    async deleteLesson(lessonId, user) {
        return this.coursesService.deleteLesson(lessonId, user.id);
    }
    async enroll(courseId, user) {
        return this.coursesService.enroll(courseId, user.id);
    }
    async getMyEnrollments(user) {
        return this.coursesService.getMyEnrollments(user.id);
    }
    async updateLessonProgress(enrollmentId, lessonId, user, dto) {
        return this.coursesService.updateLessonProgress(enrollmentId, lessonId, user.id, dto);
    }
    async createReview(courseId, user, dto) {
        return this.coursesService.createReview(courseId, user.id, dto);
    }
    async createQuiz(lessonId, user, dto) {
        return this.coursesService.createQuiz(lessonId, user.id, dto);
    }
    async getRecommendations(user, limit) {
        return this.coursesService.getRecommendations(user.id, limit || 5);
    }
    async getLearningStats(user) {
        return this.coursesService.getLearningStats(user.id);
    }
    async getLearningPath(user, body) {
        return this.coursesService.getLearningPath(user.id, body.goal, body.weeklyHours);
    }
    async analyzeQuiz(lessonId, user, body) {
        return this.coursesService.analyzeQuizPerformance(user.id, lessonId, body.questions, body.answers, body.timeSpentSeconds);
    }
};
exports.CoursesController = CoursesController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all published courses' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Courses returned' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [courses_dto_1.CourseFilterDto]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "getCourses", null);
__decorate([
    (0, common_1.Get)('categories'),
    (0, swagger_1.ApiOperation)({ summary: 'Get course categories' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Categories returned' }),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "getCategories", null);
__decorate([
    (0, common_1.Get)('popular'),
    (0, swagger_1.ApiOperation)({ summary: 'Get popular courses' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Popular courses returned' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "getPopularCourses", null);
__decorate([
    (0, common_1.Get)(':slug'),
    (0, swagger_1.ApiOperation)({ summary: 'Get course by slug' }),
    (0, swagger_1.ApiParam)({ name: 'slug', description: 'Course slug' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Course returned' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Course not found' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "getCourseBySlug", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new course' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Course created' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, courses_dto_1.CreateCourseDto]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "createCourse", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update course' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Course ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Course updated' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, courses_dto_1.UpdateCourseDto]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "updateCourse", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Delete course' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Course ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Course deleted' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "deleteCourse", null);
__decorate([
    (0, common_1.Get)(':courseSlug/lessons/:lessonSlug'),
    (0, swagger_1.ApiOperation)({ summary: 'Get lesson content' }),
    (0, swagger_1.ApiParam)({ name: 'courseSlug', description: 'Course slug' }),
    (0, swagger_1.ApiParam)({ name: 'lessonSlug', description: 'Lesson slug' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Lesson returned' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('courseSlug')),
    __param(1, (0, common_1.Param)('lessonSlug')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "getLesson", null);
__decorate([
    (0, common_1.Post)(':courseId/lessons'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Add lesson to course' }),
    (0, swagger_1.ApiParam)({ name: 'courseId', description: 'Course ID' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Lesson created' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('courseId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, courses_dto_1.CreateLessonDto]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "createLesson", null);
__decorate([
    (0, common_1.Put)('lessons/:lessonId'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update lesson' }),
    (0, swagger_1.ApiParam)({ name: 'lessonId', description: 'Lesson ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Lesson updated' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('lessonId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, courses_dto_1.UpdateLessonDto]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "updateLesson", null);
__decorate([
    (0, common_1.Delete)('lessons/:lessonId'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Delete lesson' }),
    (0, swagger_1.ApiParam)({ name: 'lessonId', description: 'Lesson ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Lesson deleted' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('lessonId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "deleteLesson", null);
__decorate([
    (0, common_1.Post)(':courseId/enroll'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Enroll in a course' }),
    (0, swagger_1.ApiParam)({ name: 'courseId', description: 'Course ID' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Enrolled successfully' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('courseId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "enroll", null);
__decorate([
    (0, common_1.Get)('my/enrollments'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get my course enrollments' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Enrollments returned' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "getMyEnrollments", null);
__decorate([
    (0, common_1.Put)('enrollments/:enrollmentId/lessons/:lessonId/progress'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update lesson progress' }),
    (0, swagger_1.ApiParam)({ name: 'enrollmentId', description: 'Enrollment ID' }),
    (0, swagger_1.ApiParam)({ name: 'lessonId', description: 'Lesson ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Progress updated' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('enrollmentId')),
    __param(1, (0, common_1.Param)('lessonId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, courses_dto_1.UpdateLessonProgressDto]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "updateLessonProgress", null);
__decorate([
    (0, common_1.Post)(':courseId/reviews'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Add a course review' }),
    (0, swagger_1.ApiParam)({ name: 'courseId', description: 'Course ID' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Review created' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('courseId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, courses_dto_1.CreateReviewDto]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "createReview", null);
__decorate([
    (0, common_1.Post)('lessons/:lessonId/quizzes'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Add quiz to lesson' }),
    (0, swagger_1.ApiParam)({ name: 'lessonId', description: 'Lesson ID' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Quiz created' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('lessonId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, courses_dto_1.CreateQuizDto]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "createQuiz", null);
__decorate([
    (0, common_1.Get)('my/recommendations'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get personalized course recommendations' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Recommendations returned' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "getRecommendations", null);
__decorate([
    (0, common_1.Get)('my/learning-stats'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get learning statistics' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Stats returned' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "getLearningStats", null);
__decorate([
    (0, common_1.Post)('my/learning-path'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Generate personalized learning path' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Learning path generated' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "getLearningPath", null);
__decorate([
    (0, common_1.Post)('lessons/:lessonId/analyze-quiz'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Analyze quiz performance with AI' }),
    (0, swagger_1.ApiParam)({ name: 'lessonId', description: 'Lesson ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Quiz analysis returned' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Param)('lessonId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "analyzeQuiz", null);
exports.CoursesController = CoursesController = __decorate([
    (0, swagger_1.ApiTags)('Courses'),
    (0, common_1.Controller)('courses'),
    __metadata("design:paramtypes", [courses_service_1.CoursesService])
], CoursesController);
//# sourceMappingURL=courses.controller.js.map