import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);
  private useJsonFallback = false;
  private jsonCourses: any[] = [];
  private jsonBlogArticles: any[] = [];
  private jsonForumThreads: any[] = [];

  constructor(private prisma: PrismaService) {
    this.loadJsonContent();
  }

  private loadJsonContent() {
    try {
      const seedDataDir = path.join(process.cwd(), 'prisma', 'seed-data');

      // Load courses
      const coursesFile = fs
        .readdirSync(seedDataDir)
        .find((f) => f.startsWith('courses-generated-'));
      if (coursesFile) {
        this.jsonCourses = JSON.parse(
          fs.readFileSync(path.join(seedDataDir, coursesFile), 'utf-8'),
        );
        this.logger.log(`✅ Loaded ${this.jsonCourses.length} courses from JSON`);
        this.useJsonFallback = true;
      }

      // Load blog articles
      const blogFiles = fs
        .readdirSync(seedDataDir)
        .filter((f) => f.startsWith('blog-'));
      for (const blogFile of blogFiles) {
        const articles = JSON.parse(
          fs.readFileSync(path.join(seedDataDir, blogFile), 'utf-8'),
        );
        this.jsonBlogArticles.push(...articles);
      }
      if (this.jsonBlogArticles.length > 0) {
        this.logger.log(`✅ Loaded ${this.jsonBlogArticles.length} blog articles from JSON`);
      }

      // Load forum threads
      const forumFile = fs
        .readdirSync(seedDataDir)
        .find((f) => f.startsWith('forum-generated-'));
      if (forumFile) {
        this.jsonForumThreads = JSON.parse(
          fs.readFileSync(path.join(seedDataDir, forumFile), 'utf-8'),
        );
        this.logger.log(`✅ Loaded ${this.jsonForumThreads.length} forum threads from JSON`);
      }
    } catch (error) {
      this.logger.warn('Could not load JSON content files:', error.message);
    }
  }

  // ==================== FORUM ====================

  async getForumCategories() {
    return this.prisma.forumCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { threads: true },
        },
      },
    });
  }

  async getForumCategory(slug: string) {
    return this.prisma.forumCategory.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { threads: true },
        },
      },
    });
  }

  async getForumThreads(categorySlug?: string, limit = 20) {
    const where: any = {};
    if (categorySlug) {
      const category = await this.prisma.forumCategory.findUnique({
        where: { slug: categorySlug },
      });
      if (category) {
        where.categoryId = category.id;
      }
    }

    return this.prisma.forumThread.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      include: {
        category: true,
        _count: {
          select: { posts: true },
        },
      },
    });
  }

  async getForumThread(slug: string) {
    return this.prisma.forumThread.findUnique({
      where: { slug },
      include: {
        category: true,
        posts: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async incrementThreadViews(slug: string) {
    return this.prisma.forumThread.update({
      where: { slug },
      data: { viewCount: { increment: 1 } },
    });
  }

  // ==================== BLOG ====================

  async getBlogCategories() {
    return this.prisma.blogCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { articles: true },
        },
      },
    });
  }

  async getBlogArticles(categorySlug?: string, limit = 20) {
    const where: any = { status: 'BLOG_PUBLISHED' };
    if (categorySlug) {
      const category = await this.prisma.blogCategory.findUnique({
        where: { slug: categorySlug },
      });
      if (category) {
        where.categoryId = category.id;
      }
    }

    return this.prisma.blogArticle.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      take: limit,
      include: {
        category: true,
      },
    });
  }

  async getBlogArticle(slug: string) {
    return this.prisma.blogArticle.findUnique({
      where: { slug },
      include: {
        category: true,
      },
    });
  }

  async incrementArticleViews(slug: string) {
    return this.prisma.blogArticle.update({
      where: { slug },
      data: { viewCount: { increment: 1 } },
    });
  }

  // ==================== COURSES ====================

  async getCourses(category?: string, level?: string, limit = 50) {
    const where: any = { status: 'LMS_PUBLISHED' };
    if (category) {
      where.category = category;
    }
    if (level) {
      where.level = level;
    }

    return this.prisma.lMSCourse.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      take: limit,
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            _count: {
              select: { lessons: true },
            },
          },
        },
        _count: {
          select: { enrollments: true },
        },
      },
    });
  }

  async getCourse(slug: string) {
    return this.prisma.lMSCourse.findUnique({
      where: { slug },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
            },
          },
        },
        _count: {
          select: { enrollments: true },
        },
      },
    });
  }

  async getCourseCategories() {
    const courses = await this.prisma.lMSCourse.groupBy({
      by: ['category'],
      where: { status: 'LMS_PUBLISHED' },
      _count: true,
    });

    return courses.map((c) => ({
      category: c.category,
      count: c._count,
    }));
  }

  async getLesson(courseSlug: string, lessonId: string) {
    // First get the course to verify access
    const course = await this.prisma.lMSCourse.findUnique({
      where: { slug: courseSlug },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!course) {
      return null;
    }

    // Find the lesson across all modules
    let currentLesson = null;
    let currentModule = null;
    let allLessons: { id: string; title: string; moduleId: string; order: number }[] = [];

    for (const mod of course.modules) {
      for (const lesson of mod.lessons) {
        allLessons.push({
          id: lesson.id,
          title: lesson.title,
          moduleId: mod.id,
          order: lesson.order,
        });
        if (lesson.id === lessonId) {
          currentLesson = lesson;
          currentModule = mod;
        }
      }
    }

    if (!currentLesson || !currentModule) {
      return null;
    }

    // Find previous and next lessons
    const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
    const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
    const nextLesson =
      currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

    return {
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug,
        modules: course.modules.map((m) => ({
          id: m.id,
          title: m.title,
          order: m.order,
          lessons: m.lessons.map((l) => ({
            id: l.id,
            title: l.title,
            duration: l.duration,
            type: l.type,
            order: l.order,
          })),
        })),
      },
      module: {
        id: currentModule.id,
        title: currentModule.title,
        order: currentModule.order,
      },
      lesson: currentLesson,
      navigation: {
        prev: prevLesson,
        next: nextLesson,
        current: currentIndex + 1,
        total: allLessons.length,
      },
    };
  }

  // ==================== DEMO BUSINESSES ====================

  async getDemoBusinesses() {
    return this.prisma.demoBusiness.findMany({
      where: { isActive: true },
      include: {
        contacts: true,
        _count: {
          select: { employees: true },
        },
      },
    });
  }

  async getDemoBusiness(cui: string) {
    return this.prisma.demoBusiness.findUnique({
      where: { cui },
      include: {
        contacts: true,
        employees: {
          take: 50,
        },
      },
    });
  }

  // ==================== STATS ====================

  async getContentStats() {
    const [courses, articles, threads, businesses] = await Promise.all([
      this.prisma.lMSCourse.count({ where: { status: 'LMS_PUBLISHED' } }),
      this.prisma.blogArticle.count({ where: { status: 'BLOG_PUBLISHED' } }),
      this.prisma.forumThread.count(),
      this.prisma.demoBusiness.count({ where: { isActive: true } }),
    ]);

    return { courses, articles, threads, businesses };
  }
}
