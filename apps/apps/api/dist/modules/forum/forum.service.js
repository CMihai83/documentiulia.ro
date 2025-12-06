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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForumService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let ForumService = class ForumService {
    prisma;
    configService;
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
    }
    async moderateContent(text, context = 'forum') {
        try {
            const mlServiceUrl = this.configService.get('ML_SERVICE_URL', 'http://localhost:8000');
            const response = await fetch(`${mlServiceUrl}/api/v1/moderation/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text,
                    language: 'ro',
                    context,
                    check_spam: true,
                    check_toxic: true,
                    check_quality: true,
                }),
            });
            if (response.ok) {
                return (await response.json());
            }
            return null;
        }
        catch {
            return null;
        }
    }
    async getCategories() {
        return this.prisma.forumCategory.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
        });
    }
    async getCategoryBySlug(slug) {
        const category = await this.prisma.forumCategory.findUnique({
            where: { slug },
        });
        if (!category) {
            throw new common_1.NotFoundException('Categoria nu a fost găsită');
        }
        return category;
    }
    async createCategory(dto) {
        const existing = await this.prisma.forumCategory.findUnique({
            where: { slug: dto.slug },
        });
        if (existing) {
            throw new common_1.ConflictException('Slug-ul categoriei există deja');
        }
        return this.prisma.forumCategory.create({
            data: dto,
        });
    }
    async updateCategory(id, dto) {
        return this.prisma.forumCategory.update({
            where: { id },
            data: dto,
        });
    }
    async deleteCategory(id) {
        await this.prisma.forumCategory.delete({ where: { id } });
        return { message: 'Categoria a fost ștearsă' };
    }
    async getTopics(filters) {
        const { categoryId, search, tag, isSolved, page = 1, limit = 20 } = filters;
        const skip = (page - 1) * limit;
        const where = {};
        if (categoryId) {
            where.categoryId = categoryId;
        }
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { content: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (tag) {
            where.tags = { has: tag };
        }
        if (isSolved !== undefined) {
            where.isSolved = isSolved;
        }
        const [topics, total] = await Promise.all([
            this.prisma.forumTopic.findMany({
                where,
                skip,
                take: limit,
                orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
                include: {
                    author: {
                        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                    },
                    category: {
                        select: { id: true, name: true, slug: true, color: true },
                    },
                    _count: {
                        select: { replies: true },
                    },
                },
            }),
            this.prisma.forumTopic.count({ where }),
        ]);
        return {
            data: topics,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async getTopicBySlug(categorySlug, topicSlug) {
        const category = await this.getCategoryBySlug(categorySlug);
        const topic = await this.prisma.forumTopic.findUnique({
            where: {
                categoryId_slug: {
                    categoryId: category.id,
                    slug: topicSlug,
                },
            },
            include: {
                author: {
                    select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                },
                category: {
                    select: { id: true, name: true, slug: true, color: true },
                },
                replies: {
                    where: { isHidden: false },
                    orderBy: { createdAt: 'asc' },
                    include: {
                        author: {
                            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                        },
                    },
                },
            },
        });
        if (!topic) {
            throw new common_1.NotFoundException('Subiectul nu a fost găsit');
        }
        await this.prisma.forumTopic.update({
            where: { id: topic.id },
            data: { viewCount: { increment: 1 } },
        });
        return topic;
    }
    async createTopic(userId, dto) {
        const category = await this.prisma.forumCategory.findUnique({
            where: { id: dto.categoryId },
        });
        if (!category || !category.isActive) {
            throw new common_1.NotFoundException('Categoria nu a fost găsită');
        }
        const moderationResult = await this.moderateContent(`${dto.title}\n\n${dto.content}`, 'forum');
        if (moderationResult) {
            if (moderationResult.is_toxic && moderationResult.confidence > 0.8) {
                throw new common_1.BadRequestException(`Conținutul a fost respins: ${moderationResult.suggestion}`);
            }
            if (moderationResult.is_spam && moderationResult.confidence > 0.8) {
                throw new common_1.BadRequestException('Conținutul a fost detectat ca spam. Vă rugăm să reformulați.');
            }
        }
        const baseSlug = this.slugify(dto.title);
        let slug = baseSlug;
        let counter = 1;
        while (true) {
            const existing = await this.prisma.forumTopic.findUnique({
                where: {
                    categoryId_slug: {
                        categoryId: dto.categoryId,
                        slug,
                    },
                },
            });
            if (!existing)
                break;
            slug = `${baseSlug}-${counter}`;
            counter++;
        }
        const topic = await this.prisma.forumTopic.create({
            data: {
                title: dto.title,
                slug,
                content: dto.content,
                tags: dto.tags || [],
                categoryId: dto.categoryId,
                authorId: userId,
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
        await this.prisma.forumCategory.update({
            where: { id: dto.categoryId },
            data: { topicCount: { increment: 1 } },
        });
        return topic;
    }
    async updateTopic(topicId, userId, dto, isAdmin = false) {
        const topic = await this.prisma.forumTopic.findUnique({
            where: { id: topicId },
        });
        if (!topic) {
            throw new common_1.NotFoundException('Subiectul nu a fost găsit');
        }
        if (topic.authorId !== userId && !isAdmin) {
            throw new common_1.ForbiddenException('Nu aveți permisiunea de a edita acest subiect');
        }
        return this.prisma.forumTopic.update({
            where: { id: topicId },
            data: dto,
            include: {
                author: {
                    select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                },
            },
        });
    }
    async deleteTopic(topicId, userId, isAdmin = false) {
        const topic = await this.prisma.forumTopic.findUnique({
            where: { id: topicId },
        });
        if (!topic) {
            throw new common_1.NotFoundException('Subiectul nu a fost găsit');
        }
        if (topic.authorId !== userId && !isAdmin) {
            throw new common_1.ForbiddenException('Nu aveți permisiunea de a șterge acest subiect');
        }
        await this.prisma.forumTopic.delete({ where: { id: topicId } });
        await this.prisma.forumCategory.update({
            where: { id: topic.categoryId },
            data: {
                topicCount: { decrement: 1 },
                postCount: { decrement: topic.replyCount },
            },
        });
        return { message: 'Subiectul a fost șters' };
    }
    async createReply(topicId, userId, dto) {
        const topic = await this.prisma.forumTopic.findUnique({
            where: { id: topicId },
        });
        if (!topic) {
            throw new common_1.NotFoundException('Subiectul nu a fost găsit');
        }
        if (topic.isLocked) {
            throw new common_1.ForbiddenException('Subiectul este blocat');
        }
        const moderationResult = await this.moderateContent(dto.content, 'comment');
        if (moderationResult) {
            if (moderationResult.is_toxic && moderationResult.confidence > 0.8) {
                throw new common_1.BadRequestException(`Răspunsul a fost respins: ${moderationResult.suggestion}`);
            }
            if (moderationResult.is_spam && moderationResult.confidence > 0.8) {
                throw new common_1.BadRequestException('Răspunsul a fost detectat ca spam. Vă rugăm să reformulați.');
            }
        }
        const reply = await this.prisma.forumReply.create({
            data: {
                content: dto.content,
                topicId,
                authorId: userId,
                parentId: dto.parentId,
            },
            include: {
                author: {
                    select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                },
            },
        });
        await this.prisma.forumTopic.update({
            where: { id: topicId },
            data: {
                replyCount: { increment: 1 },
                lastReplyAt: new Date(),
                lastReplyBy: userId,
            },
        });
        await this.prisma.forumCategory.update({
            where: { id: topic.categoryId },
            data: { postCount: { increment: 1 } },
        });
        return reply;
    }
    async updateReply(replyId, userId, dto, isAdmin = false) {
        const reply = await this.prisma.forumReply.findUnique({
            where: { id: replyId },
        });
        if (!reply) {
            throw new common_1.NotFoundException('Răspunsul nu a fost găsit');
        }
        if (reply.authorId !== userId && !isAdmin) {
            throw new common_1.ForbiddenException('Nu aveți permisiunea de a edita acest răspuns');
        }
        return this.prisma.forumReply.update({
            where: { id: replyId },
            data: dto,
            include: {
                author: {
                    select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                },
            },
        });
    }
    async deleteReply(replyId, userId, isAdmin = false) {
        const reply = await this.prisma.forumReply.findUnique({
            where: { id: replyId },
            include: { topic: true },
        });
        if (!reply) {
            throw new common_1.NotFoundException('Răspunsul nu a fost găsit');
        }
        if (reply.authorId !== userId && !isAdmin) {
            throw new common_1.ForbiddenException('Nu aveți permisiunea de a șterge acest răspuns');
        }
        await this.prisma.forumReply.delete({ where: { id: replyId } });
        await this.prisma.forumTopic.update({
            where: { id: reply.topicId },
            data: { replyCount: { decrement: 1 } },
        });
        await this.prisma.forumCategory.update({
            where: { id: reply.topic.categoryId },
            data: { postCount: { decrement: 1 } },
        });
        return { message: 'Răspunsul a fost șters' };
    }
    async markReplyAsAccepted(topicId, replyId, userId) {
        const topic = await this.prisma.forumTopic.findUnique({
            where: { id: topicId },
        });
        if (!topic) {
            throw new common_1.NotFoundException('Subiectul nu a fost găsit');
        }
        if (topic.authorId !== userId) {
            throw new common_1.ForbiddenException('Doar autorul subiectului poate marca răspunsul ca acceptat');
        }
        await this.prisma.forumReply.updateMany({
            where: { topicId, isAccepted: true },
            data: { isAccepted: false },
        });
        await this.prisma.forumReply.update({
            where: { id: replyId },
            data: { isAccepted: true },
        });
        await this.prisma.forumTopic.update({
            where: { id: topicId },
            data: { isSolved: true },
        });
        return { message: 'Răspunsul a fost marcat ca acceptat' };
    }
    async getForumStats() {
        const [categories, topics, replies, users] = await Promise.all([
            this.prisma.forumCategory.count({ where: { isActive: true } }),
            this.prisma.forumTopic.count(),
            this.prisma.forumReply.count(),
            this.prisma.user.count(),
        ]);
        const recentTopics = await this.prisma.forumTopic.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                author: {
                    select: { id: true, firstName: true, lastName: true },
                },
                category: {
                    select: { name: true, slug: true },
                },
            },
        });
        return {
            totalCategories: categories,
            totalTopics: topics,
            totalReplies: replies,
            totalUsers: users,
            recentTopics,
        };
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
};
exports.ForumService = ForumService;
exports.ForumService = ForumService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], ForumService);
//# sourceMappingURL=forum.service.js.map