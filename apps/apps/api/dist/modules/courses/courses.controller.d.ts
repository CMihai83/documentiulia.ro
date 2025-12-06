import { CoursesService } from './courses.service';
import { CreateCourseDto, UpdateCourseDto, CreateLessonDto, UpdateLessonDto, CreateQuizDto, CreateReviewDto, UpdateLessonProgressDto, CourseFilterDto } from './dto/courses.dto';
export declare class CoursesController {
    private readonly coursesService;
    constructor(coursesService: CoursesService);
    getCourses(filters: CourseFilterDto): Promise<{
        data: ({
            _count: {
                enrollments: number;
                lessons: number;
            };
            instructor: {
                id: string;
                firstName: string | null;
                lastName: string | null;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            currency: string;
            tags: string[];
            description: string;
            title: string;
            category: string | null;
            slug: string;
            shortDescription: string | null;
            thumbnail: string | null;
            difficulty: import(".prisma/client").$Enums.CourseDifficulty;
            duration: number;
            isFree: boolean;
            price: import("@prisma/client/runtime/library").Decimal | null;
            isPublished: boolean;
            instructorId: string;
            language: string;
            publishedAt: Date | null;
            enrollmentCount: number;
            ratingAvg: import("@prisma/client/runtime/library").Decimal;
            ratingCount: number;
            completionRate: import("@prisma/client/runtime/library").Decimal;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getCategories(): Promise<{
        name: string | null;
        count: number;
    }[]>;
    getPopularCourses(limit?: number): Promise<({
        _count: {
            lessons: number;
        };
        instructor: {
            id: string;
            firstName: string | null;
            lastName: string | null;
            avatarUrl: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        currency: string;
        tags: string[];
        description: string;
        title: string;
        category: string | null;
        slug: string;
        shortDescription: string | null;
        thumbnail: string | null;
        difficulty: import(".prisma/client").$Enums.CourseDifficulty;
        duration: number;
        isFree: boolean;
        price: import("@prisma/client/runtime/library").Decimal | null;
        isPublished: boolean;
        instructorId: string;
        language: string;
        publishedAt: Date | null;
        enrollmentCount: number;
        ratingAvg: import("@prisma/client/runtime/library").Decimal;
        ratingCount: number;
        completionRate: import("@prisma/client/runtime/library").Decimal;
    })[]>;
    getCourseBySlug(slug: string, user?: any): Promise<{
        isEnrolled: boolean;
        enrollment: {
            id: string;
            userId: string;
            courseId: string;
            progress: import("@prisma/client/runtime/library").Decimal;
            completedAt: Date | null;
            certificateId: string | null;
            certificateUrl: string | null;
            enrolledAt: Date;
            lastAccessAt: Date | null;
        } | null;
        _count: {
            enrollments: number;
            lessons: number;
            reviews: number;
        };
        instructor: {
            id: string;
            firstName: string | null;
            lastName: string | null;
            avatarUrl: string | null;
        };
        lessons: {
            id: string;
            description: string | null;
            title: string;
            sortOrder: number;
            slug: string;
            duration: number;
            isFree: boolean;
        }[];
        reviews: ({
            user: {
                id: string;
                firstName: string | null;
                lastName: string | null;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            content: string | null;
            title: string | null;
            isHidden: boolean;
            rating: number;
            courseId: string;
            isVerified: boolean;
        })[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        currency: string;
        tags: string[];
        description: string;
        title: string;
        category: string | null;
        slug: string;
        shortDescription: string | null;
        thumbnail: string | null;
        difficulty: import(".prisma/client").$Enums.CourseDifficulty;
        duration: number;
        isFree: boolean;
        price: import("@prisma/client/runtime/library").Decimal | null;
        isPublished: boolean;
        instructorId: string;
        language: string;
        publishedAt: Date | null;
        enrollmentCount: number;
        ratingAvg: import("@prisma/client/runtime/library").Decimal;
        ratingCount: number;
        completionRate: import("@prisma/client/runtime/library").Decimal;
    }>;
    createCourse(user: any, dto: CreateCourseDto): Promise<{
        instructor: {
            id: string;
            firstName: string | null;
            lastName: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        currency: string;
        tags: string[];
        description: string;
        title: string;
        category: string | null;
        slug: string;
        shortDescription: string | null;
        thumbnail: string | null;
        difficulty: import(".prisma/client").$Enums.CourseDifficulty;
        duration: number;
        isFree: boolean;
        price: import("@prisma/client/runtime/library").Decimal | null;
        isPublished: boolean;
        instructorId: string;
        language: string;
        publishedAt: Date | null;
        enrollmentCount: number;
        ratingAvg: import("@prisma/client/runtime/library").Decimal;
        ratingCount: number;
        completionRate: import("@prisma/client/runtime/library").Decimal;
    }>;
    updateCourse(id: string, user: any, dto: UpdateCourseDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        currency: string;
        tags: string[];
        description: string;
        title: string;
        category: string | null;
        slug: string;
        shortDescription: string | null;
        thumbnail: string | null;
        difficulty: import(".prisma/client").$Enums.CourseDifficulty;
        duration: number;
        isFree: boolean;
        price: import("@prisma/client/runtime/library").Decimal | null;
        isPublished: boolean;
        instructorId: string;
        language: string;
        publishedAt: Date | null;
        enrollmentCount: number;
        ratingAvg: import("@prisma/client/runtime/library").Decimal;
        ratingCount: number;
        completionRate: import("@prisma/client/runtime/library").Decimal;
    }>;
    deleteCourse(id: string, user: any): Promise<{
        message: string;
    }>;
    getLesson(courseSlug: string, lessonSlug: string, user?: any): Promise<{
        quizzes: {
            id: string;
            options: import("@prisma/client/runtime/library").JsonValue;
            sortOrder: number;
            question: string;
            correctAnswer: number;
            explanation: string | null;
            lessonId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        content: string;
        title: string;
        sortOrder: number;
        slug: string;
        duration: number;
        isFree: boolean;
        isPublished: boolean;
        videoUrl: string | null;
        courseId: string;
    }>;
    createLesson(courseId: string, user: any, dto: CreateLessonDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        content: string;
        title: string;
        sortOrder: number;
        slug: string;
        duration: number;
        isFree: boolean;
        isPublished: boolean;
        videoUrl: string | null;
        courseId: string;
    }>;
    updateLesson(lessonId: string, user: any, dto: UpdateLessonDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        content: string;
        title: string;
        sortOrder: number;
        slug: string;
        duration: number;
        isFree: boolean;
        isPublished: boolean;
        videoUrl: string | null;
        courseId: string;
    }>;
    deleteLesson(lessonId: string, user: any): Promise<{
        message: string;
    }>;
    enroll(courseId: string, user: any): Promise<{
        id: string;
        userId: string;
        courseId: string;
        progress: import("@prisma/client/runtime/library").Decimal;
        completedAt: Date | null;
        certificateId: string | null;
        certificateUrl: string | null;
        enrolledAt: Date;
        lastAccessAt: Date | null;
    }>;
    getMyEnrollments(user: any): Promise<({
        course: {
            _count: {
                lessons: number;
            };
            instructor: {
                id: string;
                firstName: string | null;
                lastName: string | null;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            currency: string;
            tags: string[];
            description: string;
            title: string;
            category: string | null;
            slug: string;
            shortDescription: string | null;
            thumbnail: string | null;
            difficulty: import(".prisma/client").$Enums.CourseDifficulty;
            duration: number;
            isFree: boolean;
            price: import("@prisma/client/runtime/library").Decimal | null;
            isPublished: boolean;
            instructorId: string;
            language: string;
            publishedAt: Date | null;
            enrollmentCount: number;
            ratingAvg: import("@prisma/client/runtime/library").Decimal;
            ratingCount: number;
            completionRate: import("@prisma/client/runtime/library").Decimal;
        };
    } & {
        id: string;
        userId: string;
        courseId: string;
        progress: import("@prisma/client/runtime/library").Decimal;
        completedAt: Date | null;
        certificateId: string | null;
        certificateUrl: string | null;
        enrolledAt: Date;
        lastAccessAt: Date | null;
    })[]>;
    updateLessonProgress(enrollmentId: string, lessonId: string, user: any, dto: UpdateLessonProgressDto): Promise<{
        id: string;
        updatedAt: Date;
        isCompleted: boolean;
        watchedSeconds: number;
        quizPassed: boolean | null;
        quizScore: import("@prisma/client/runtime/library").Decimal | null;
        completedAt: Date | null;
        enrollmentId: string;
        lessonId: string;
        startedAt: Date;
    }>;
    createReview(courseId: string, user: any, dto: CreateReviewDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        content: string | null;
        title: string | null;
        isHidden: boolean;
        rating: number;
        courseId: string;
        isVerified: boolean;
    }>;
    createQuiz(lessonId: string, user: any, dto: CreateQuizDto): Promise<{
        id: string;
        options: import("@prisma/client/runtime/library").JsonValue;
        sortOrder: number;
        question: string;
        correctAnswer: number;
        explanation: string | null;
        lessonId: string;
    }>;
    getRecommendations(user: any, limit?: number): Promise<{
        recommendations: import("./courses.service").LearningRecommendation[];
        learning_path: string[];
        skill_gaps: string[];
        next_milestone: string;
    }>;
    getLearningStats(user: any): Promise<{
        total_courses_completed: number;
        total_lessons_completed: number;
        total_time_spent_hours: number;
        average_quiz_score: number;
        current_streak_days: number;
        skill_level: string;
        enrollments: number;
    }>;
    getLearningPath(user: any, body: {
        goal: string;
        weeklyHours?: number;
    }): Promise<unknown>;
    analyzeQuiz(lessonId: string, user: any, body: {
        questions: Array<{
            id: string;
            topic: string;
            correct_answer: string;
        }>;
        answers: Array<{
            question_id: string;
            selected: string;
        }>;
        timeSpentSeconds: number;
    }): Promise<import("./courses.service").QuizAnalysis>;
}
//# sourceMappingURL=courses.controller.d.ts.map