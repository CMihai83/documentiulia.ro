import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateBlogCategoryDto,
  UpdateBlogCategoryDto,
  CreateBlogPostDto,
  UpdateBlogPostDto,
  ReviewPostDto,
  PublishPostDto,
  BlogPostFilterDto,
  GenerateBlogPostDto,
  CreateCommentDto,
  UpdateCommentDto,
  ModerateCommentDto,
  CommentFilterDto,
  BlogPostStatus,
  CommentStatus,
  RssFeedItem,
} from './dto/blog.dto';

@Injectable()
export class BlogService {
  private readonly logger = new Logger(BlogService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  // ==================== CATEGORIES ====================

  async getCategories() {
    return this.prisma.blogCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getCategoryBySlug(slug: string) {
    const category = await this.prisma.blogCategory.findUnique({
      where: { slug },
    });

    if (!category) {
      throw new NotFoundException('Categoria nu a fost găsită');
    }

    return category;
  }

  async createCategory(dto: CreateBlogCategoryDto) {
    const existing = await this.prisma.blogCategory.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException('Slug-ul categoriei există deja');
    }

    return this.prisma.blogCategory.create({
      data: dto,
    });
  }

  async updateCategory(id: string, dto: UpdateBlogCategoryDto) {
    return this.prisma.blogCategory.update({
      where: { id },
      data: dto,
    });
  }

  async deleteCategory(id: string) {
    // Check for posts in category
    const postCount = await this.prisma.blogPost.count({
      where: { categoryId: id },
    });

    if (postCount > 0) {
      throw new BadRequestException(
        `Nu puteți șterge categoria - conține ${postCount} articole`,
      );
    }

    await this.prisma.blogCategory.delete({ where: { id } });
    return { message: 'Categoria a fost ștearsă' };
  }

  // ==================== POSTS ====================

  async getPosts(filters: BlogPostFilterDto) {
    const {
      categoryId,
      tag,
      search,
      status,
      authorId,
      isAiGenerated,
      language,
      page = 1,
      limit = 10,
    } = filters;

    const skip = (page - 1) * limit;
    const where: any = {};

    // Default to published posts for public queries
    if (status) {
      where.status = status;
    } else {
      where.status = BlogPostStatus.PUBLISHED;
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
            select: { comments: { where: { status: CommentStatus.APPROVED } } },
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

  async getPostBySlug(slug: string, incrementViews = true) {
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
          where: { status: CommentStatus.APPROVED, parentId: null },
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            },
            children: {
              where: { status: CommentStatus.APPROVED },
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
      throw new NotFoundException('Articolul nu a fost găsit');
    }

    // Only show published posts publicly
    if (post.status !== BlogPostStatus.PUBLISHED) {
      throw new NotFoundException('Articolul nu este publicat');
    }

    // Increment view count
    if (incrementViews) {
      await this.prisma.blogPost.update({
        where: { id: post.id },
        data: { viewCount: { increment: 1 } },
      });
    }

    return post;
  }

  async getPostById(id: string) {
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
      throw new NotFoundException('Articolul nu a fost găsit');
    }

    return post;
  }

  async createPost(userId: string, dto: CreateBlogPostDto) {
    // Generate slug from title
    const slug = await this.generateUniqueSlug(dto.title);

    // Calculate word count and reading time
    const wordCount = this.countWords(dto.content);
    const readingTime = Math.ceil(wordCount / 200); // ~200 words per minute

    const post = await this.prisma.blogPost.create({
      data: {
        ...dto,
        slug,
        wordCount,
        readingTime,
        authorId: userId,
        status: BlogPostStatus.DRAFT,
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

  async updatePost(postId: string, userId: string, dto: UpdateBlogPostDto, isAdmin = false) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Articolul nu a fost găsit');
    }

    if (post.authorId !== userId && !isAdmin) {
      throw new ForbiddenException('Nu aveți permisiunea de a edita acest articol');
    }

    // Recalculate word count and reading time if content changed
    const updateData: any = { ...dto };
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

  async deletePost(postId: string, userId: string, isAdmin = false) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Articolul nu a fost găsit');
    }

    if (post.authorId !== userId && !isAdmin) {
      throw new ForbiddenException('Nu aveți permisiunea de a șterge acest articol');
    }

    await this.prisma.blogPost.delete({ where: { id: postId } });

    // Update category post count
    if (post.categoryId) {
      await this.prisma.blogCategory.update({
        where: { id: post.categoryId },
        data: { postCount: { decrement: 1 } },
      });
    }

    return { message: 'Articolul a fost șters' };
  }

  // ==================== WORKFLOW ====================

  async submitForReview(postId: string, userId: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Articolul nu a fost găsit');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException('Nu aveți permisiunea');
    }

    if (post.status !== BlogPostStatus.DRAFT && post.status !== BlogPostStatus.REJECTED) {
      throw new BadRequestException('Articolul nu poate fi trimis pentru aprobare');
    }

    return this.prisma.blogPost.update({
      where: { id: postId },
      data: { status: BlogPostStatus.PENDING_REVIEW },
    });
  }

  async reviewPost(postId: string, reviewerId: string, dto: ReviewPostDto) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Articolul nu a fost găsit');
    }

    if (post.status !== BlogPostStatus.PENDING_REVIEW) {
      throw new BadRequestException('Articolul nu este în așteptare pentru aprobare');
    }

    const newStatus =
      dto.action === 'approve' ? BlogPostStatus.APPROVED : BlogPostStatus.REJECTED;

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

  async publishPost(postId: string, userId: string, dto: PublishPostDto, isAdmin = false) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Articolul nu a fost găsit');
    }

    // Only approved posts or drafts by admin can be published
    if (post.status !== BlogPostStatus.APPROVED && !isAdmin) {
      throw new BadRequestException('Articolul trebuie aprobat înainte de publicare');
    }

    const updateData: any = {};

    if (dto.scheduledAt && dto.scheduledAt > new Date()) {
      // Schedule for later
      updateData.status = BlogPostStatus.SCHEDULED;
      updateData.scheduledAt = dto.scheduledAt;
    } else {
      // Publish immediately
      updateData.status = BlogPostStatus.PUBLISHED;
      updateData.publishedAt = new Date();
    }

    const updatedPost = await this.prisma.blogPost.update({
      where: { id: postId },
      data: updateData,
    });

    // Update category post count
    if (post.categoryId && updateData.status === BlogPostStatus.PUBLISHED) {
      await this.prisma.blogCategory.update({
        where: { id: post.categoryId },
        data: { postCount: { increment: 1 } },
      });
    }

    return updatedPost;
  }

  async unpublishPost(postId: string, isAdmin = false) {
    if (!isAdmin) {
      throw new ForbiddenException('Doar administratorii pot retrage articole');
    }

    const post = await this.prisma.blogPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Articolul nu a fost găsit');
    }

    const updatedPost = await this.prisma.blogPost.update({
      where: { id: postId },
      data: { status: BlogPostStatus.DRAFT, publishedAt: null },
    });

    // Update category post count
    if (post.categoryId && post.status === BlogPostStatus.PUBLISHED) {
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
        where: { status: BlogPostStatus.PENDING_REVIEW },
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
      this.prisma.blogPost.count({ where: { status: BlogPostStatus.PENDING_REVIEW } }),
    ]);

    return {
      data: posts,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ==================== AI CONTENT GENERATION ====================

  async generatePost(userId: string, dto: GenerateBlogPostDto) {
    const mlServiceUrl = this.configService.get<string>('ML_SERVICE_URL', 'http://localhost:8000');

    try {
      // Call ML service for content generation
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

      const generated = (await response.json()) as {
        title?: string;
        content: string;
        excerpt?: string;
        tags?: string[];
        model?: string;
      };

      // Generate slug from title
      const slug = await this.generateUniqueSlug(generated.title || dto.topic);
      const content = generated.content || '';

      // Create the post as draft
      const post = await this.prisma.blogPost.create({
        data: {
          title: generated.title || dto.topic,
          slug,
          content,
          excerpt: generated.excerpt || content.substring(0, 300),
          categoryId: dto.categoryId,
          tags: dto.tags || generated.tags || [],
          authorId: userId,
          status: BlogPostStatus.DRAFT,
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`AI content generation failed: ${errorMessage}`);
      throw new BadRequestException(`Generarea conținutului AI a eșuat: ${errorMessage}`);
    }
  }

  // ==================== COMMENTS ====================

  async getComments(postId: string, filters: CommentFilterDto) {
    const { status, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = { postId };

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

  async createComment(postId: string, userId: string | null, dto: CreateCommentDto) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id: postId },
    });

    if (!post || post.status !== BlogPostStatus.PUBLISHED) {
      throw new NotFoundException('Articolul nu a fost găsit');
    }

    // For guest comments, require name and email
    if (!userId && (!dto.authorName || !dto.authorEmail)) {
      throw new BadRequestException('Numele și email-ul sunt obligatorii');
    }

    // Check parent comment exists
    if (dto.parentId) {
      const parent = await this.prisma.blogComment.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent || parent.postId !== postId) {
        throw new NotFoundException('Comentariul părinte nu a fost găsit');
      }
    }

    // AI Moderation (if ML service available)
    let aiModerationResult: Record<string, unknown> | null = null;
    let initialStatus = CommentStatus.PENDING;

    try {
      const mlServiceUrl = this.configService.get<string>('ML_SERVICE_URL', 'http://localhost:8000');
      const moderationResponse = await fetch(`${mlServiceUrl}/api/v1/moderation/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: dto.content, language: 'ro' }),
      });

      if (moderationResponse.ok) {
        aiModerationResult = (await moderationResponse.json()) as Record<string, unknown>;

        // Auto-approve if safe, auto-reject if toxic
        const isSafe = aiModerationResult.is_safe as boolean;
        const isToxic = aiModerationResult.is_toxic as boolean;
        const confidence = aiModerationResult.confidence as number;

        if (isSafe && confidence > 0.9) {
          initialStatus = CommentStatus.APPROVED;
        } else if (isToxic && confidence > 0.8) {
          initialStatus = CommentStatus.SPAM;
        }
      }
    } catch {
      // ML service unavailable, keep as pending
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
        aiModerationResult: aiModerationResult ? (aiModerationResult as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    // Update post comment count if approved
    if (initialStatus === CommentStatus.APPROVED) {
      await this.prisma.blogPost.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } },
      });
    }

    return comment;
  }

  async updateComment(commentId: string, userId: string, dto: UpdateCommentDto) {
    const comment = await this.prisma.blogComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comentariul nu a fost găsit');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException('Nu aveți permisiunea de a edita acest comentariu');
    }

    return this.prisma.blogComment.update({
      where: { id: commentId },
      data: { content: dto.content, status: CommentStatus.PENDING },
    });
  }

  async deleteComment(commentId: string, userId: string, isAdmin = false) {
    const comment = await this.prisma.blogComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comentariul nu a fost găsit');
    }

    if (comment.authorId !== userId && !isAdmin) {
      throw new ForbiddenException('Nu aveți permisiunea de a șterge acest comentariu');
    }

    await this.prisma.blogComment.delete({ where: { id: commentId } });

    // Update post comment count
    if (comment.status === CommentStatus.APPROVED) {
      await this.prisma.blogPost.update({
        where: { id: comment.postId },
        data: { commentCount: { decrement: 1 } },
      });
    }

    return { message: 'Comentariul a fost șters' };
  }

  async moderateComment(commentId: string, moderatorId: string, dto: ModerateCommentDto) {
    const comment = await this.prisma.blogComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comentariul nu a fost găsit');
    }

    const wasApproved = comment.status === CommentStatus.APPROVED;
    const willBeApproved = dto.status === CommentStatus.APPROVED;

    const updated = await this.prisma.blogComment.update({
      where: { id: commentId },
      data: {
        status: dto.status,
        moderatedBy: moderatorId,
        moderatedAt: new Date(),
      },
    });

    // Update post comment count
    if (wasApproved && !willBeApproved) {
      await this.prisma.blogPost.update({
        where: { id: comment.postId },
        data: { commentCount: { decrement: 1 } },
      });
    } else if (!wasApproved && willBeApproved) {
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
        where: { status: CommentStatus.PENDING },
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
      this.prisma.blogComment.count({ where: { status: CommentStatus.PENDING } }),
    ]);

    return {
      data: comments,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ==================== RSS FEED ====================

  async getRssFeed(): Promise<RssFeedItem[]> {
    const posts = await this.prisma.blogPost.findMany({
      where: { status: BlogPostStatus.PUBLISHED },
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

  // ==================== STATS ====================

  async getBlogStats() {
    const [totalPosts, publishedPosts, draftPosts, pendingPosts, categories, totalComments] =
      await Promise.all([
        this.prisma.blogPost.count(),
        this.prisma.blogPost.count({ where: { status: BlogPostStatus.PUBLISHED } }),
        this.prisma.blogPost.count({ where: { status: BlogPostStatus.DRAFT } }),
        this.prisma.blogPost.count({ where: { status: BlogPostStatus.PENDING_REVIEW } }),
        this.prisma.blogCategory.count({ where: { isActive: true } }),
        this.prisma.blogComment.count({ where: { status: CommentStatus.APPROVED } }),
      ]);

    const popularPosts = await this.prisma.blogPost.findMany({
      where: { status: BlogPostStatus.PUBLISHED },
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
      where: { status: BlogPostStatus.PUBLISHED },
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

  // ==================== HELPERS ====================

  private async generateUniqueSlug(title: string): Promise<string> {
    const baseSlug = this.slugify(title);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.blogPost.findUnique({
        where: { slug },
      });

      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);
  }

  private countWords(text: string): number {
    // Strip HTML tags
    const plainText = text.replace(/<[^>]*>/g, '');
    // Count words
    return plainText.split(/\s+/).filter((word) => word.length > 0).length;
  }
}
