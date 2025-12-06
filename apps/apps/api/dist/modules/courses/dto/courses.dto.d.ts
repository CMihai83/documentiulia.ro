import { CourseDifficulty } from '@prisma/client';
export declare class CreateCourseDto {
    title: string;
    description: string;
    shortDescription?: string;
    thumbnail?: string;
    difficulty?: CourseDifficulty;
    duration?: number;
    isFree?: boolean;
    price?: number;
    category?: string;
    tags?: string[];
}
export declare class UpdateCourseDto {
    title?: string;
    description?: string;
    shortDescription?: string;
    thumbnail?: string;
    difficulty?: CourseDifficulty;
    duration?: number;
    isFree?: boolean;
    price?: number;
    category?: string;
    tags?: string[];
    isPublished?: boolean;
}
export declare class CreateLessonDto {
    title: string;
    description?: string;
    content: string;
    videoUrl?: string;
    duration?: number;
    sortOrder?: number;
    isFree?: boolean;
}
export declare class UpdateLessonDto {
    title?: string;
    description?: string;
    content?: string;
    videoUrl?: string;
    duration?: number;
    sortOrder?: number;
    isFree?: boolean;
    isPublished?: boolean;
}
export declare class CreateQuizDto {
    question: string;
    options: string[];
    correctAnswer: number;
    explanation?: string;
    sortOrder?: number;
}
export declare class CreateReviewDto {
    rating: number;
    title?: string;
    content?: string;
}
export declare class UpdateLessonProgressDto {
    isCompleted?: boolean;
    watchedSeconds?: number;
    quizPassed?: boolean;
    quizScore?: number;
}
export declare class CourseFilterDto {
    search?: string;
    category?: string;
    difficulty?: CourseDifficulty;
    isFree?: boolean;
    page?: number;
    limit?: number;
}
//# sourceMappingURL=courses.dto.d.ts.map