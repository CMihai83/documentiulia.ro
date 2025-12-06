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
var BlogService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlogService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const blog_dto_1 = require("./dto/blog.dto");
let BlogService = BlogService_1 = class BlogService {
    prisma;
    configService;
    logger = new common_1.Logger(BlogService_1.name);
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
    }
    async getCategories() {
        return this.prisma.blogCategory.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
        });
    }
    async getCategoryBySlug(slug) {
        const category = await this.prisma.blogCategory.findUnique({
            where: { slug },
        });
        if (!category) {
            throw new common_1.NotFoundException('Categoria nu a fost găsită');
        }
        return category;
    }
    async createCategory(dto) {
        const existing = await this.prisma.blogCategory.findUnique({
            where: { slug: dto.slug },
        });
        if (existing) {
            throw new common_1.ConflictException('Slug-ul categoriei există deja');
        }
        return this.prisma.blogCategory.create({
            data: dto,
        });
    }
    async updateCategory(id, dto) {
        return this.prisma.blogCategory.update({
            where: { id },
            data: dto,
        });
    }
    async deleteCategory(id) {
        const postCount = await this.prisma.blogPost.count({
            where: { categoryId: id },
        });
        if (postCount > 0) {
            throw new common_1.BadRequestException(`Nu puteți șterge categoria - conține ${postCount} articole`);
        }
        await this.prisma.blogCategory.delete({ where: { id } });
        return { message: 'Categoria a fost ștearsă' };
    }
    async getPosts(filters) {
        const { categoryId, tag, search, status, authorId, isAiGenerated, language, page = 1, limit = 10, } = filters;
        const skip = (page - 1) * limit;
        const where = {};
        if (status) {
            where.status = status;
        }
        else {
            where.status = blog_dto_1.BlogPostStatus.PUBLISHED;
        }
        if (categoryId) {
            where.categoryId = categoryId;
        }
        if (tag) {
            where.tags = { has: tag };
        }
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { content: { contains: search, mode: 'insensitive' } },
                { excerpt: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (authorId) {
            where.authorId = authorId;
        }
        if (isAiGenerated !== undefined) {
            where.isAiGenerated = isAiGenerated;
        }
        if (language) {
            where.language = language;
        }
        const [posts, total] = await Promise.all([
            this.prisma.blogPost.findMany({
                where,
                skip,
                take: limit,
                orderBy: { publishedAt: 'desc' },
                include: {
                    author: {
                        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                    },
                    category: {
                        select: { id: true, name: true, slug: true, color: true },
                    },
                    _count: {
                        select: { comments: { where: { status: blog_dto_1.CommentStatus.APPROVED } } },
                    },
                },
            }),
            this.prisma.blogPost.count({ where }),
        ]);
        return {
            data: posts,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async getPostBySlug(slug, incrementViews = true) {
        const post = await this.prisma.blogPost.findUnique({
            where: { slug },
            include: {
                author: {
                    select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                },
                category: {
                    select: { id: true, name: true, slug: true, color: true },
                },
                comments: {
                    where: { status: blog_dto_1.CommentStatus.APPROVED, parentId: null },
                    orderBy: { createdAt: 'asc' },
                    include: {
                        author: {
                            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                        },
                        children: {
                            where: { status: blog_dto_1.CommentStatus.APPROVED },
                            orderBy: { createdAt: 'asc' },
                            include: {
                                author: {
                                    select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!post) {
            throw new common_1.NotFoundException('Articolul nu a fost găsit');
        }
        if (post.status !== blog_dto_1.BlogPostStatus.PUBLISHED) {
            throw new common_1.NotFoundException('Articolul nu este publicat');
        }
        if (incrementViews) {
            await this.prisma.blogPost.update({
                where: { id: post.id },
                data: { viewCount: { increment: 1 } },
            });
        }
        return post;
    }
    async getPostById(id) {
        const post = await this.prisma.blogPost.findUnique({
            where: { id },
            include: {
                author: {
                    select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                },
                category: {
                    select: { id: true, name: true, slug: true, color: true },
                },
            },
        });
        if (!post) {
            throw new common_1.NotFoundException('Articolul nu a fost găsit');
        }
        return post;
    }
    async createPost(userId, dto) {
        const slug = await this.generateUniqueSlug(dto.title);
        const wordCount = this.countWords(dto.content);
        const readingTime = Math.ceil(wordCount / 200);
        const post = await this.prisma.blogPost.create({
            data: {
                ...dto,
                slug,
                wordCount,
                readingTime,
                authorId: userId,
                status: blog_dto_1.BlogPostStatus.DRAFT,
            },
            include: {
                author: {
                    select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                },
                category: {
                    select: { id: true, name: true, slug: true },
                },
            },
        });
        this.logger.log(`Created blog post: ${post.title} (${post.id})`);
        return post;
    }
    async updatePost(postId, userId, dto, isAdmin = false) {
        const post = await this.prisma.blogPost.findUnique({
            where: { id: postId },
        });
        if (!post) {
            throw new common_1.NotFoundException('Articolul nu a fost găsit');
        }
        if (post.authorId !== userId && !isAdmin) {
            throw new common_1.ForbiddenException('Nu aveți permisiunea de a edita acest articol');
        }
        const updateData = { ...dto };
        if (dto.content) {
            updateData.wordCount = this.countWords(dto.content);
            updateData.readingTime = Math.ceil(updateData.wordCount / 200);
        }
        return this.prisma.blogPost.update({
            where: { id: postId },
            data: updateData,
            include: {
                author: {
                    select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                },
                category: {
                    select: { id: true, name: true, slug: true },
                },
            },
        });
    }
    async deletePost(postId, userId, isAdmin = false) {
        const post = await this.prisma.blogPost.findUnique({
            where: { id: postId },
        });
        if (!post) {
            throw new common_1.NotFoundException('Articolul nu a fost găsit');
        }
        if (post.authorId !== userId && !isAdmin) {
            throw new common_1.ForbiddenException('Nu aveți permisiunea de a șterge acest articol');
        }
        await this.prisma.blogPost.delete({ where: { id: postId } });
        if (post.categoryId) {
            await this.prisma.blogCategory.update({
                where: { id: post.categoryId },
                data: { postCount: { decrement: 1 } },
            });
        }
        return { message: 'Articolul a fost șters' };
    }
    async submitForReview(postId, userId) {
        const post = await this.prisma.blogPost.findUnique({
            where: { id: postId },
        });
        if (!post) {
            throw new common_1.NotFoundException('Articolul nu a fost găsit');
        }
        if (post.authorId !== userId) {
            throw new common_1.ForbiddenException('Nu aveți permisiunea');
        }
        if (post.status !== blog_dto_1.BlogPostStatus.DRAFT && post.status !== blog_dto_1.BlogPostStatus.REJECTED) {
            throw new common_1.BadRequestException('Articolul nu poate fi trimis pentru aprobare');
        }
        return this.prisma.blogPost.update({
            where: { id: postId },
            data: { status: blog_dto_1.BlogPostStatus.PENDING_REVIEW },
        });
    }
    async reviewPost(postId, reviewerId, dto) {
        const post = await this.prisma.blogPost.findUnique({
            where: { id: postId },
        });
        if (!post) {
            throw new common_1.NotFoundException('Articolul nu a fost găsit');
        }
        if (post.status !== blog_dto_1.BlogPostStatus.PENDING_REVIEW) {
            throw new common_1.BadRequestException('Articolul nu este în așteptare pentru aprobare');
        }
        const newStatus = dto.action === 'approve' ? blog_dto_1.BlogPostStatus.APPROVED : blog_dto_1.BlogPostStatus.REJECTED;
        return this.prisma.blogPost.update({
            where: { id: postId },
            data: {
                status: newStatus,
                reviewedBy: reviewerId,
                reviewedAt: new Date(),
                rejectionReason: dto.action === 'reject' ? dto.rejectionReason : null,
            },
        });
    }
    async publishPost(postId, userId, dto, isAdmin = false) {
        const post = await this.prisma.blogPost.findUnique({
            where: { id: postId },
        });
        if (!post) {
            throw new common_1.NotFoundException('Articolul nu a fost găsit');
        }
        if (post.status !== blog_dto_1.BlogPostStatus.APPROVED && !isAdmin) {
            throw new common_1.BadRequestException('Articolul trebuie aprobat înainte de publicare');
        }
        const updateData = {};
        if (dto.scheduledAt && dto.scheduledAt > new Date()) {
            updateData.status = blog_dto_1.BlogPostStatus.SCHEDULED;
            updateData.scheduledAt = dto.scheduledAt;
        }
        else {
            updateData.status = blog_dto_1.BlogPostStatus.PUBLISHED;
            updateData.publishedAt = new Date();
        }
        const updatedPost = await this.prisma.blogPost.update({
            where: { id: postId },
            data: updateData,
        });
        if (post.categoryId && updateData.status === blog_dto_1.BlogPostStatus.PUBLISHED) {
            await this.prisma.blogCategory.update({
                where: { id: post.categoryId },
                data: { postCount: { increment: 1 } },
            });
        }
        return updatedPost;
    }
    async unpublishPost(postId, isAdmin = false) {
        if (!isAdmin) {
            throw new common_1.ForbiddenException('Doar administratorii pot retrage articole');
        }
        const post = await this.prisma.blogPost.findUnique({
            where: { id: postId },
        });
        if (!post) {
            throw new common_1.NotFoundException('Articolul nu a fost găsit');
        }
        const updatedPost = await this.prisma.blogPost.update({
            where: { id: postId },
            data: { status: blog_dto_1.BlogPostStatus.DRAFT, publishedAt: null },
        });
        if (post.categoryId && post.status === blog_dto_1.BlogPostStatus.PUBLISHED) {
            await this.prisma.blogCategory.update({
                where: { id: post.categoryId },
                data: { postCount: { decrement: 1 } },
            });
        }
        return updatedPost;
    }
    async getPendingReviews(page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [posts, total] = await Promise.all([
            this.prisma.blogPost.findMany({
                where: { status: blog_dto_1.BlogPostStatus.PENDING_REVIEW },
                skip,
                take: limit,
                orderBy: { createdAt: 'asc' },
                include: {
                    author: {
                        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                    },
                    category: {
                        select: { id: true, name: true, slug: true },
                    },
                },
            }),
            this.prisma.blogPost.count({ where: { status: blog_dto_1.BlogPostStatus.PENDING_REVIEW } }),
        ]);
        return {
            data: posts,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    async generatePost(userId, dto) {
        const mlServiceUrl = this.configService.get('ML_SERVICE_URL', 'http://localhost:8000');
        try {
            const response = await fetch(`${mlServiceUrl}/api/v1/content/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: dto.topic,
                    target_length: dto.targetWordCount || 800,
                    style: dto.style || 'professional',
                    language: dto.language || 'ro',
                    source_urls: dto.sourceUrls || [],
                    context: 'Romanian accounting and fiscal regulations blog',
                }),
            });
            if (!response.ok) {
                throw new Error(`ML service error: ${response.status}`);
            }
            const generated = (await response.json());
            const slug = await this.generateUniqueSlug(generated.title || dto.topic);
            const content = generated.content || '';
            const post = await this.prisma.blogPost.create({
                data: {
                    title: generated.title || dto.topic,
                    slug,
                    content,
                    excerpt: generated.excerpt || content.substring(0, 300),
                    categoryId: dto.categoryId,
                    tags: dto.tags || generated.tags || [],
                    authorId: userId,
                    status: blog_dto_1.BlogPostStatus.DRAFT,
                    isAiGenerated: true,
                    aiPrompt: dto.topic,
                    aiModel: generated.model || 'llama3',
                    sourceUrls: dto.sourceUrls || [],
                    language: dto.language || 'ro',
                    wordCount: this.countWords(content),
                    readingTime: Math.ceil(this.countWords(content) / 200),
                },
                include: {
                    author: {
                        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                    },
                    category: {
                        select: { id: true, name: true, slug: true },
                    },
                },
            });
            this.logger.log(`AI generated blog post: ${post.title} (${post.id})`);
            return post;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`AI content generation failed: ${errorMessage}`);
            throw new common_1.BadRequestException(`Generarea conținutului AI a eșuat: ${errorMessage}`);
        }
    }
    async getComments(postId, filters) {
        const { status, page = 1, limit = 20 } = filters;
        const skip = (page - 1) * limit;
        const where = { postId };
        if (status) {
            where.status = status;
        }
        const [comments, total] = await Promise.all([
            this.prisma.blogComment.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    author: {
                        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                    },
                },
            }),
            this.prisma.blogComment.count({ where }),
        ]);
        return {
            data: comments,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    async createComment(postId, userId, dto) {
        const post = await this.prisma.blogPost.findUnique({
            where: { id: postId },
        });
        if (!post || post.status !== blog_dto_1.BlogPostStatus.PUBLISHED) {
            throw new common_1.NotFoundException('Articolul nu a fost găsit');
        }
        if (!userId && (!dto.authorName || !dto.authorEmail)) {
            throw new common_1.BadRequestException('Numele și email-ul sunt obligatorii');
        }
        if (dto.parentId) {
            const parent = await this.prisma.blogComment.findUnique({
                where: { id: dto.parentId },
            });
            if (!parent || parent.postId !== postId) {
                throw new common_1.NotFoundException('Comentariul părinte nu a fost găsit');
            }
        }
        let aiModerationResult = null;
        let initialStatus = blog_dto_1.CommentStatus.PENDING;
        try {
            const mlServiceUrl = this.configService.get('ML_SERVICE_URL', 'http://localhost:8000');
            const moderationResponse = await fetch(`${mlServiceUrl}/api/v1/moderation/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: dto.content, language: 'ro' }),
            });
            if (moderationResponse.ok) {
                aiModerationResult = (await moderationResponse.json());
                const isSafe = aiModerationResult.is_safe;
                const isToxic = aiModerationResult.is_toxic;
                const confidence = aiModerationResult.confidence;
                if (isSafe && confidence > 0.9) {
                    initialStatus = blog_dto_1.CommentStatus.APPROVED;
                }
                else if (isToxic && confidence > 0.8) {
                    initialStatus = blog_dto_1.CommentStatus.SPAM;
                }
            }
        }
        catch {
            this.logger.warn('AI moderation unavailable, comment queued for manual review');
        }
        const comment = await this.prisma.blogComment.create({
            data: {
                postId,
                authorId: userId,
                authorName: dto.authorName,
                authorEmail: dto.authorEmail,
                content: dto.content,
                parentId: dto.parentId,
                status: initialStatus,
                aiModerated: aiModerationResult !== null,
                aiModerationResult: aiModerationResult ? aiModerationResult : client_1.Prisma.JsonNull,
            },
            include: {
                author: {
                    select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                },
            },
        });
        if (initialStatus === blog_dto_1.CommentStatus.APPROVED) {
            await this.prisma.blogPost.update({
                where: { id: postId },
                data: { commentCount: { increment: 1 } },
            });
        }
        return comment;
    }
    async updateComment(commentId, userId, dto) {
        const comment = await this.prisma.blogComment.findUnique({
            where: { id: commentId },
        });
        if (!comment) {
            throw new common_1.NotFoundException('Comentariul nu a fost găsit');
        }
        if (comment.authorId !== userId) {
            throw new common_1.ForbiddenException('Nu aveți permisiunea de a edita acest comentariu');
        }
        return this.prisma.blogComment.update({
            where: { id: commentId },
            data: { content: dto.content, status: blog_dto_1.CommentStatus.PENDING },
        });
    }
    async deleteComment(commentId, userId, isAdmin = false) {
        const comment = await this.prisma.blogComment.findUnique({
            where: { id: commentId },
        });
        if (!comment) {
            throw new common_1.NotFoundException('Comentariul nu a fost găsit');
        }
        if (comment.authorId !== userId && !isAdmin) {
            throw new common_1.ForbiddenException('Nu aveți permisiunea de a șterge acest comentariu');
        }
        await this.prisma.blogComment.delete({ where: { id: commentId } });
        if (comment.status === blog_dto_1.CommentStatus.APPROVED) {
            await this.prisma.blogPost.update({
                where: { id: comment.postId },
                data: { commentCount: { decrement: 1 } },
            });
        }
        return { message: 'Comentariul a fost șters' };
    }
    async moderateComment(commentId, moderatorId, dto) {
        const comment = await this.prisma.blogComment.findUnique({
            where: { id: commentId },
        });
        if (!comment) {
            throw new common_1.NotFoundException('Comentariul nu a fost găsit');
        }
        const wasApproved = comment.status === blog_dto_1.CommentStatus.APPROVED;
        const willBeApproved = dto.status === blog_dto_1.CommentStatus.APPROVED;
        const updated = await this.prisma.blogComment.update({
            where: { id: commentId },
            data: {
                status: dto.status,
                moderatedBy: moderatorId,
                moderatedAt: new Date(),
            },
        });
        if (wasApproved && !willBeApproved) {
            await this.prisma.blogPost.update({
                where: { id: comment.postId },
                data: { commentCount: { decrement: 1 } },
            });
        }
        else if (!wasApproved && willBeApproved) {
            await this.prisma.blogPost.update({
                where: { id: comment.postId },
                data: { commentCount: { increment: 1 } },
            });
        }
        return updated;
    }
    async getPendingComments(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [comments, total] = await Promise.all([
            this.prisma.blogComment.findMany({
                where: { status: blog_dto_1.CommentStatus.PENDING },
                skip,
                take: limit,
                orderBy: { createdAt: 'asc' },
                include: {
                    post: { select: { id: true, title: true, slug: true } },
                    author: {
                        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                    },
                },
            }),
            this.prisma.blogComment.count({ where: { status: blog_dto_1.CommentStatus.PENDING } }),
        ]);
        return {
            data: comments,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    async getRssFeed() {
        const posts = await this.prisma.blogPost.findMany({
            where: { status: blog_dto_1.BlogPostStatus.PUBLISHED },
            take: 20,
            orderBy: { publishedAt: 'desc' },
            include: {
                author: {
                    select: { firstName: true, lastName: true },
                },
                category: {
                    select: { name: true },
                },
            },
        });
        return posts.map((post) => ({
            title: post.title,
            link: `https://documentiulia.ro/blog/${post.slug}`,
            description: post.excerpt || post.content.substring(0, 300),
            pubDate: post.publishedAt?.toUTCString() || post.createdAt.toUTCString(),
            author: post.author
                ? `${post.author.firstName} ${post.author.lastName}`
                : 'DocumentIulia',
            category: post.category?.name,
            guid: post.id,
        }));
    }
    async getBlogStats() {
        const [totalPosts, publishedPosts, draftPosts, pendingPosts, categories, totalComments] = await Promise.all([
            this.prisma.blogPost.count(),
            this.prisma.blogPost.count({ where: { status: blog_dto_1.BlogPostStatus.PUBLISHED } }),
            this.prisma.blogPost.count({ where: { status: blog_dto_1.BlogPostStatus.DRAFT } }),
            this.prisma.blogPost.count({ where: { status: blog_dto_1.BlogPostStatus.PENDING_REVIEW } }),
            this.prisma.blogCategory.count({ where: { isActive: true } }),
            this.prisma.blogComment.count({ where: { status: blog_dto_1.CommentStatus.APPROVED } }),
        ]);
        const popularPosts = await this.prisma.blogPost.findMany({
            where: { status: blog_dto_1.BlogPostStatus.PUBLISHED },
            take: 5,
            orderBy: { viewCount: 'desc' },
            select: {
                id: true,
                title: true,
                slug: true,
                viewCount: true,
                commentCount: true,
            },
        });
        const recentPosts = await this.prisma.blogPost.findMany({
            where: { status: blog_dto_1.BlogPostStatus.PUBLISHED },
            take: 5,
            orderBy: { publishedAt: 'desc' },
            select: {
                id: true,
                title: true,
                slug: true,
                publishedAt: true,
            },
        });
        return {
            totalPosts,
            publishedPosts,
            draftPosts,
            pendingPosts,
            categories,
            totalComments,
            popularPosts,
            recentPosts,
        };
    }
    async generateUniqueSlug(title) {
        const baseSlug = this.slugify(title);
        let slug = baseSlug;
        let counter = 1;
        while (true) {
            const existing = await this.prisma.blogPost.findUnique({
                where: { slug },
            });
            if (!existing)
                break;
            slug = `${baseSlug}-${counter}`;
            counter++;
        }
        return slug;
    }
    slugify(text) {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 100);
    }
    countWords(text) {
        const plainText = text.replace(/<[^>]*>/g, '');
        return plainText.split(/\s+/).filter((word) => word.length > 0).length;
    }
};
exports.BlogService = BlogService;
exports.BlogService = BlogService = BlogService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], BlogService);
//# sourceMappingURL=blog.service.js.map