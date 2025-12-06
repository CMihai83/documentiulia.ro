export declare enum BlogPostStatus {
    DRAFT = "DRAFT",
    PENDING_REVIEW = "PENDING_REVIEW",
    APPROVED = "APPROVED",
    PUBLISHED = "PUBLISHED",
    SCHEDULED = "SCHEDULED",
    REJECTED = "REJECTED",
    ARCHIVED = "ARCHIVED"
}
export declare enum CommentStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    SPAM = "SPAM"
}
export declare class CreateBlogCategoryDto {
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    color?: string;
    sortOrder?: number;
}
export declare class UpdateBlogCategoryDto {
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
    sortOrder?: number;
    isActive?: boolean;
}
export declare class CreateBlogPostDto {
    title: string;
    excerpt?: string;
    content: string;
    coverImage?: string;
    categoryId?: string;
    tags?: string[];
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
    language?: string;
}
export declare class UpdateBlogPostDto {
    title?: string;
    excerpt?: string;
    content?: string;
    coverImage?: string;
    categoryId?: string;
    tags?: string[];
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
}
export declare class SubmitForReviewDto {
    notes?: string;
}
export declare class ReviewPostDto {
    action: 'approve' | 'reject';
    rejectionReason?: string;
}
export declare class PublishPostDto {
    scheduledAt?: Date;
}
export declare class BlogPostFilterDto {
    categoryId?: string;
    tag?: string;
    search?: string;
    status?: BlogPostStatus;
    authorId?: string;
    isAiGenerated?: boolean;
    language?: string;
    page?: number;
    limit?: number;
}
export declare class GenerateBlogPostDto {
    topic: string;
    categoryId?: string;
    tags?: string[];
    targetWordCount?: number;
    style?: string;
    sourceUrls?: string[];
    language?: string;
}
export declare class CreateCommentDto {
    content: string;
    parentId?: string;
    authorName?: string;
    authorEmail?: string;
}
export declare class UpdateCommentDto {
    content: string;
}
export declare class ModerateCommentDto {
    status: CommentStatus;
}
export declare class CommentFilterDto {
    status?: CommentStatus;
    page?: number;
    limit?: number;
}
export interface RssFeedItem {
    title: string;
    link: string;
    description: string;
    pubDate: string;
    author?: string;
    category?: string;
    guid: string;
}
//# sourceMappingURL=blog.dto.d.ts.map