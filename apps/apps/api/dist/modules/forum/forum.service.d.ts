import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto, CreateTopicDto, UpdateTopicDto, CreateReplyDto, UpdateReplyDto, TopicFilterDto } from './dto/forum.dto';
export declare class ForumService {
    private readonly prisma;
    private readonly configService;
    constructor(prisma: PrismaService, configService: ConfigService);
    private moderateContent;
    getCategories(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        isActive: boolean;
        sortOrder: number;
        slug: string;
        icon: string | null;
        color: string;
        topicCount: number;
        postCount: number;
    }[]>;
    getCategoryBySlug(slug: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        isActive: boolean;
        sortOrder: number;
        slug: string;
        icon: string | null;
        color: string;
        topicCount: number;
        postCount: number;
    }>;
    createCategory(dto: CreateCategoryDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        isActive: boolean;
        sortOrder: number;
        slug: string;
        icon: string | null;
        color: string;
        topicCount: number;
        postCount: number;
    }>;
    updateCategory(id: string, dto: UpdateCategoryDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        isActive: boolean;
        sortOrder: number;
        slug: string;
        icon: string | null;
        color: string;
        topicCount: number;
        postCount: number;
    }>;
    deleteCategory(id: string): Promise<{
        message: string;
    }>;
    getTopics(filters: TopicFilterDto): Promise<{
        data: ({
            _count: {
                replies: number;
            };
            category: {
                id: string;
                name: string;
                slug: string;
                color: string;
            };
            author: {
                id: string;
                firstName: string | null;
                lastName: string | null;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tags: string[];
            content: string;
            title: string;
            slug: string;
            categoryId: string;
            isPinned: boolean;
            isLocked: boolean;
            isSolved: boolean;
            authorId: string;
            viewCount: number;
            replyCount: number;
            likeCount: number;
            lastReplyAt: Date | null;
            lastReplyBy: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getTopicBySlug(categorySlug: string, topicSlug: string): Promise<{
        category: {
            id: string;
            name: string;
            slug: string;
            color: string;
        };
        author: {
            id: string;
            firstName: string | null;
            lastName: string | null;
            avatarUrl: string | null;
        };
        replies: ({
            author: {
                id: string;
                firstName: string | null;
                lastName: string | null;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            content: string;
            parentId: string | null;
            authorId: string;
            likeCount: number;
            isHidden: boolean;
            isAccepted: boolean;
            topicId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tags: string[];
        content: string;
        title: string;
        slug: string;
        categoryId: string;
        isPinned: boolean;
        isLocked: boolean;
        isSolved: boolean;
        authorId: string;
        viewCount: number;
        replyCount: number;
        likeCount: number;
        lastReplyAt: Date | null;
        lastReplyBy: string | null;
    }>;
    createTopic(userId: string, dto: CreateTopicDto): Promise<{
        category: {
            id: string;
            name: string;
            slug: string;
        };
        author: {
            id: string;
            firstName: string | null;
            lastName: string | null;
            avatarUrl: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tags: string[];
        content: string;
        title: string;
        slug: string;
        categoryId: string;
        isPinned: boolean;
        isLocked: boolean;
        isSolved: boolean;
        authorId: string;
        viewCount: number;
        replyCount: number;
        likeCount: number;
        lastReplyAt: Date | null;
        lastReplyBy: string | null;
    }>;
    updateTopic(topicId: string, userId: string, dto: UpdateTopicDto, isAdmin?: boolean): Promise<{
        author: {
            id: string;
            firstName: string | null;
            lastName: string | null;
            avatarUrl: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tags: string[];
        content: string;
        title: string;
        slug: string;
        categoryId: string;
        isPinned: boolean;
        isLocked: boolean;
        isSolved: boolean;
        authorId: string;
        viewCount: number;
        replyCount: number;
        likeCount: number;
        lastReplyAt: Date | null;
        lastReplyBy: string | null;
    }>;
    deleteTopic(topicId: string, userId: string, isAdmin?: boolean): Promise<{
        message: string;
    }>;
    createReply(topicId: string, userId: string, dto: CreateReplyDto): Promise<{
        author: {
            id: string;
            firstName: string | null;
            lastName: string | null;
            avatarUrl: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        parentId: string | null;
        authorId: string;
        likeCount: number;
        isHidden: boolean;
        isAccepted: boolean;
        topicId: string;
    }>;
    updateReply(replyId: string, userId: string, dto: UpdateReplyDto, isAdmin?: boolean): Promise<{
        author: {
            id: string;
            firstName: string | null;
            lastName: string | null;
            avatarUrl: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        parentId: string | null;
        authorId: string;
        likeCount: number;
        isHidden: boolean;
        isAccepted: boolean;
        topicId: string;
    }>;
    deleteReply(replyId: string, userId: string, isAdmin?: boolean): Promise<{
        message: string;
    }>;
    markReplyAsAccepted(topicId: string, replyId: string, userId: string): Promise<{
        message: string;
    }>;
    getForumStats(): Promise<{
        totalCategories: number;
        totalTopics: number;
        totalReplies: number;
        totalUsers: number;
        recentTopics: ({
            category: {
                name: string;
                slug: string;
            };
            author: {
                id: string;
                firstName: string | null;
                lastName: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tags: string[];
            content: string;
            title: string;
            slug: string;
            categoryId: string;
            isPinned: boolean;
            isLocked: boolean;
            isSolved: boolean;
            authorId: string;
            viewCount: number;
            replyCount: number;
            likeCount: number;
            lastReplyAt: Date | null;
            lastReplyBy: string | null;
        })[];
    }>;
    private slugify;
}
//# sourceMappingURL=forum.service.d.ts.map