import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateTopicDto,
  UpdateTopicDto,
  CreateReplyDto,
  UpdateReplyDto,
  TopicFilterDto,
} from './dto/forum.dto';

interface ModerationResult {
  is_safe: boolean;
  is_toxic: boolean;
  is_spam: boolean;
  is_low_quality: boolean;
  confidence: number;
  categories: string[];
  issues: Array<{ type: string; pattern: string; severity: string }>;
  suggestion: string;
}

@Injectable()
export class ForumService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Moderate content using AI service
   */
  private async moderateContent(
    text: string,
    context: 'forum' | 'comment' = 'forum',
  ): Promise<ModerationResult | null> {
    try {
      const mlServiceUrl = this.configService.get<string>('ML_SERVICE_URL', 'http://localhost:8000');
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
        return (await response.json()) as ModerationResult;
      }
      return null;
    } catch {
      // Fail open - allow content if moderation service is unavailable
      return null;
    }
  }

  // ==================== CATEGORIES ====================

  async getCategories() {
    return this.prisma.forumCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getCategoryBySlug(slug: string) {
    const category = await this.prisma.forumCategory.findUnique({
      where: { slug },
    });

    if (!category) {
      throw new NotFoundException('Categoria nu a fost găsită');
    }

    return category;
  }

  async createCategory(dto: CreateCategoryDto) {
    const existing = await this.prisma.forumCategory.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException('Slug-ul categoriei există deja');
    }

    return this.prisma.forumCategory.create({
      data: dto,
    });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    return this.prisma.forumCategory.update({
      where: { id },
      data: dto,
    });
  }

  async deleteCategory(id: string) {
    await this.prisma.forumCategory.delete({ where: { id } });
    return { message: 'Categoria a fost ștearsă' };
  }

  // ==================== TOPICS ====================

  async getTopics(filters: TopicFilterDto) {
    const { categoryId, search, tag, isSolved, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

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

  async getTopicBySlug(categorySlug: string, topicSlug: string) {
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
      throw new NotFoundException('Subiectul nu a fost găsit');
    }

    // Increment view count
    await this.prisma.forumTopic.update({
      where: { id: topic.id },
      data: { viewCount: { increment: 1 } },
    });

    return topic;
  }

  async createTopic(userId: string, dto: CreateTopicDto) {
    const category = await this.prisma.forumCategory.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category || !category.isActive) {
      throw new NotFoundException('Categoria nu a fost găsită');
    }

    // AI Moderation check
    const moderationResult = await this.moderateContent(
      `${dto.title}\n\n${dto.content}`,
      'forum',
    );

    if (moderationResult) {
      // Block toxic content
      if (moderationResult.is_toxic && moderationResult.confidence > 0.8) {
        throw new BadRequestException(
          `Conținutul a fost respins: ${moderationResult.suggestion}`,
        );
      }
      // Block spam
      if (moderationResult.is_spam && moderationResult.confidence > 0.8) {
        throw new BadRequestException(
          'Conținutul a fost detectat ca spam. Vă rugăm să reformulați.',
        );
      }
    }

    // Generate slug from title
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

      if (!existing) break;
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

    // Update category topic count
    await this.prisma.forumCategory.update({
      where: { id: dto.categoryId },
      data: { topicCount: { increment: 1 } },
    });

    return topic;
  }

  async updateTopic(topicId: string, userId: string, dto: UpdateTopicDto, isAdmin = false) {
    const topic = await this.prisma.forumTopic.findUnique({
      where: { id: topicId },
    });

    if (!topic) {
      throw new NotFoundException('Subiectul nu a fost găsit');
    }

    if (topic.authorId !== userId && !isAdmin) {
      throw new ForbiddenException('Nu aveți permisiunea de a edita acest subiect');
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

  async deleteTopic(topicId: string, userId: string, isAdmin = false) {
    const topic = await this.prisma.forumTopic.findUnique({
      where: { id: topicId },
    });

    if (!topic) {
      throw new NotFoundException('Subiectul nu a fost găsit');
    }

    if (topic.authorId !== userId && !isAdmin) {
      throw new ForbiddenException('Nu aveți permisiunea de a șterge acest subiect');
    }

    await this.prisma.forumTopic.delete({ where: { id: topicId } });

    // Update category counts
    await this.prisma.forumCategory.update({
      where: { id: topic.categoryId },
      data: {
        topicCount: { decrement: 1 },
        postCount: { decrement: topic.replyCount },
      },
    });

    return { message: 'Subiectul a fost șters' };
  }

  // ==================== REPLIES ====================

  async createReply(topicId: string, userId: string, dto: CreateReplyDto) {
    const topic = await this.prisma.forumTopic.findUnique({
      where: { id: topicId },
    });

    if (!topic) {
      throw new NotFoundException('Subiectul nu a fost găsit');
    }

    if (topic.isLocked) {
      throw new ForbiddenException('Subiectul este blocat');
    }

    // AI Moderation check for reply
    const moderationResult = await this.moderateContent(dto.content, 'comment');

    if (moderationResult) {
      // Block toxic content
      if (moderationResult.is_toxic && moderationResult.confidence > 0.8) {
        throw new BadRequestException(
          `Răspunsul a fost respins: ${moderationResult.suggestion}`,
        );
      }
      // Block spam
      if (moderationResult.is_spam && moderationResult.confidence > 0.8) {
        throw new BadRequestException(
          'Răspunsul a fost detectat ca spam. Vă rugăm să reformulați.',
        );
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

    // Update topic stats
    await this.prisma.forumTopic.update({
      where: { id: topicId },
      data: {
        replyCount: { increment: 1 },
        lastReplyAt: new Date(),
        lastReplyBy: userId,
      },
    });

    // Update category post count
    await this.prisma.forumCategory.update({
      where: { id: topic.categoryId },
      data: { postCount: { increment: 1 } },
    });

    return reply;
  }

  async updateReply(replyId: string, userId: string, dto: UpdateReplyDto, isAdmin = false) {
    const reply = await this.prisma.forumReply.findUnique({
      where: { id: replyId },
    });

    if (!reply) {
      throw new NotFoundException('Răspunsul nu a fost găsit');
    }

    if (reply.authorId !== userId && !isAdmin) {
      throw new ForbiddenException('Nu aveți permisiunea de a edita acest răspuns');
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

  async deleteReply(replyId: string, userId: string, isAdmin = false) {
    const reply = await this.prisma.forumReply.findUnique({
      where: { id: replyId },
      include: { topic: true },
    });

    if (!reply) {
      throw new NotFoundException('Răspunsul nu a fost găsit');
    }

    if (reply.authorId !== userId && !isAdmin) {
      throw new ForbiddenException('Nu aveți permisiunea de a șterge acest răspuns');
    }

    await this.prisma.forumReply.delete({ where: { id: replyId } });

    // Update topic stats
    await this.prisma.forumTopic.update({
      where: { id: reply.topicId },
      data: { replyCount: { decrement: 1 } },
    });

    // Update category post count
    await this.prisma.forumCategory.update({
      where: { id: reply.topic.categoryId },
      data: { postCount: { decrement: 1 } },
    });

    return { message: 'Răspunsul a fost șters' };
  }

  async markReplyAsAccepted(topicId: string, replyId: string, userId: string) {
    const topic = await this.prisma.forumTopic.findUnique({
      where: { id: topicId },
    });

    if (!topic) {
      throw new NotFoundException('Subiectul nu a fost găsit');
    }

    if (topic.authorId !== userId) {
      throw new ForbiddenException('Doar autorul subiectului poate marca răspunsul ca acceptat');
    }

    // Unmark any previously accepted reply
    await this.prisma.forumReply.updateMany({
      where: { topicId, isAccepted: true },
      data: { isAccepted: false },
    });

    // Mark new reply as accepted
    await this.prisma.forumReply.update({
      where: { id: replyId },
      data: { isAccepted: true },
    });

    // Mark topic as solved
    await this.prisma.forumTopic.update({
      where: { id: topicId },
      data: { isSolved: true },
    });

    return { message: 'Răspunsul a fost marcat ca acceptat' };
  }

  // ==================== STATS ====================

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

  // ==================== HELPERS ====================

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);
  }
}
