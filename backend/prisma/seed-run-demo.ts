/**
 * DocumentIulia.ro - Demo Content Seed Runner
 *
 * This script loads all demo content into the database:
 * - 10 Demo businesses with employees
 * - 30+ LMS Courses with modules and lessons
 * - Forum categories and threads
 * - Blog articles
 * - HSE incidents
 */

import { PrismaClient, Tier, LMSCourseCategory, LMSCourseLevel, LMSCourseStatus, BlogArticleStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Import demo content
import {
  demoBusinesses,
  allCourses,
  eliteBusinessCourses,
  forumData,
  allBlogArticles,
  allEmployees,
  allHSEIncidents,
} from './seed-demo-content';

const prisma = new PrismaClient();

// Map category strings to enums
function mapCourseCategory(category: string): LMSCourseCategory {
  const mapping: Record<string, LMSCourseCategory> = {
    'EXCEL_VBA': LMSCourseCategory.EXCEL_VBA,
    'PROJECT_MANAGEMENT': LMSCourseCategory.PROJECT_MANAGEMENT,
    'FINANCE': LMSCourseCategory.FINANCE_OPS,
    'FINANCE_OPS': LMSCourseCategory.FINANCE_OPS,
    'LEADERSHIP': LMSCourseCategory.MBA_STRATEGY,
    'MBA_STRATEGY': LMSCourseCategory.MBA_STRATEGY,
    'COMPLIANCE': LMSCourseCategory.TAX_COMPLIANCE,
    'TAX_COMPLIANCE': LMSCourseCategory.TAX_COMPLIANCE,
    'ACCOUNTING': LMSCourseCategory.TAX_COMPLIANCE, // Romanian accounting/ANAF courses
    'HR': LMSCourseCategory.HR_COMPLIANCE,
    'HR_COMPLIANCE': LMSCourseCategory.HR_COMPLIANCE,
    'OPERATIONS': LMSCourseCategory.LEAN_OPERATIONS,
    'LEAN_OPERATIONS': LMSCourseCategory.LEAN_OPERATIONS,
    'MARKETING': LMSCourseCategory.SOFT_SKILLS,
    'SOFT_SKILLS': LMSCourseCategory.SOFT_SKILLS,
    'TECHNOLOGY': LMSCourseCategory.FINANCE_OPS,
    'DATA_ANALYTICS': LMSCourseCategory.EXCEL_VBA,
    'E_COMMERCE': LMSCourseCategory.LEAN_OPERATIONS,
    'FREELANCER': LMSCourseCategory.SOFT_SKILLS,
    'LEGAL': LMSCourseCategory.TAX_COMPLIANCE,
  };
  return mapping[category] || LMSCourseCategory.SOFT_SKILLS;
}

function mapCourseLevel(level: string): LMSCourseLevel {
  const mapping: Record<string, LMSCourseLevel> = {
    'BEGINNER': LMSCourseLevel.BEGINNER,
    'INTERMEDIATE': LMSCourseLevel.INTERMEDIATE,
    'ADVANCED': LMSCourseLevel.ADVANCED,
    'EXPERT': LMSCourseLevel.EXPERT,
  };
  return mapping[level] || LMSCourseLevel.BEGINNER;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ăâ]/g, 'a')
    .replace(/[îï]/g, 'i')
    .replace(/[șş]/g, 's')
    .replace(/[țţ]/g, 't')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function seedDemoBusinesses() {
  console.log('\n📊 Seeding Demo Businesses...');

  for (const biz of demoBusinesses) {
    const business = await prisma.demoBusiness.upsert({
      where: { cui: biz.cui },
      update: {},
      create: {
        name: biz.name,
        cui: biz.cui,
        industry: biz.industry,
        city: biz.city,
        county: biz.county,
        employeeCount: biz.employees,
        revenue: biz.revenue,
        description: biz.description,
        tier: biz.tier === 'BUSINESS' ? Tier.BUSINESS : biz.tier === 'PRO' ? Tier.PRO : Tier.FREE,
      },
    });

    // Add contacts
    for (const contact of biz.contacts) {
      await prisma.demoBusinessContact.create({
        data: {
          businessId: business.id,
          name: contact.name,
          role: contact.role,
          email: contact.email,
          phone: contact.phone,
        },
      });
    }

    // Add employees
    const employees = allEmployees[biz.id] || [];
    for (const emp of employees.slice(0, 50)) { // Limit to 50 per business
      await prisma.demoEmployee.create({
        data: {
          businessId: business.id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email,
          department: emp.department,
          position: emp.position,
          hireDate: new Date(emp.hireDate),
          salary: emp.salary,
          contractType: emp.contractType === 'FULL_TIME' ? 'DEMO_FULL_TIME' : 'DEMO_PART_TIME',
          status: emp.status === 'ACTIVE' ? 'DEMO_ACTIVE' : 'DEMO_ON_LEAVE',
        },
      });
    }

    console.log(`  ✅ ${biz.name}: ${employees.length} employees`);
  }
}

async function seedLMSCourses() {
  console.log('\n📚 Seeding LMS Courses...');

  let courseCount = 0;
  let moduleCount = 0;
  let lessonCount = 0;

  for (const course of allCourses) {
    const slug = slugify(course.title);

    try {
      const createdCourse = await prisma.lMSCourse.upsert({
        where: { slug },
        update: {},
        create: {
          title: course.title,
          slug,
          description: course.description,
          category: mapCourseCategory(course.category),
          level: mapCourseLevel(course.level),
          duration: course.duration,
          price: course.price > 0 ? course.price : null,
          isFree: course.price === 0,
          language: 'ro',
          tags: [course.category, course.level],
          status: LMSCourseStatus.LMS_PUBLISHED,
          publishedAt: new Date(),
          hasCertificate: true,
        },
      });
      courseCount++;

      // Add modules
      if (course.modules) {
        let moduleOrder = 0;
        for (const mod of course.modules) {
          const createdModule = await prisma.lMSCourseModule.create({
            data: {
              courseId: createdCourse.id,
              title: mod.title,
              order: moduleOrder++,
              duration: mod.lessons.length * 20, // 20 minutes per lesson estimate
            },
          });
          moduleCount++;

          // Add lessons
          let lessonOrder = 0;
          for (const lessonTitle of mod.lessons) {
            await prisma.lMSLesson.create({
              data: {
                moduleId: createdModule.id,
                title: lessonTitle,
                content: `# ${lessonTitle}\n\nConținutul lecției "${lessonTitle}" din modulul "${mod.title}" al cursului "${course.title}".\n\n## Obiective\n- Înțelegerea conceptelor cheie\n- Aplicare practică\n- Exerciții de consolidare`,
                order: lessonOrder++,
                duration: Math.floor(15 + Math.random() * 30),
                type: 'TEXT',
              },
            });
            lessonCount++;
          }
        }
      }
    } catch (error: any) {
      if (error.code !== 'P2002') { // Ignore unique constraint violations
        console.error(`  ⚠️ Error creating course ${course.title}:`, error.message);
      }
    }
  }

  console.log(`  ✅ Created ${courseCount} courses, ${moduleCount} modules, ${lessonCount} lessons`);
}

async function seedEliteCourses() {
  console.log('\n📚 Seeding Elite Courses with Comprehensive Content...');

  let courseCount = 0;
  let moduleCount = 0;
  let lessonCount = 0;

  for (const course of eliteBusinessCourses) {
    const slug = course.slug || slugify(course.title);

    try {
      // Delete existing course and related data to update with new content
      const existingCourse = await prisma.lMSCourse.findUnique({
        where: { slug },
        include: { modules: { include: { lessons: true } } },
      });

      if (existingCourse) {
        // Delete lessons first
        for (const mod of existingCourse.modules) {
          await prisma.lMSLesson.deleteMany({ where: { moduleId: mod.id } });
        }
        // Delete modules
        await prisma.lMSCourseModule.deleteMany({ where: { courseId: existingCourse.id } });
        // Delete course
        await prisma.lMSCourse.delete({ where: { id: existingCourse.id } });
      }

      // Create the course
      const createdCourse = await prisma.lMSCourse.create({
        data: {
          title: course.title,
          slug,
          description: course.description,
          category: mapCourseCategory(course.category),
          level: mapCourseLevel(course.level),
          duration: course.duration,
          price: course.price > 0 ? course.price : null,
          isFree: course.isFree || course.price === 0,
          language: course.language || 'ro',
          tags: course.tags || [],
          status: LMSCourseStatus.LMS_PUBLISHED,
          publishedAt: new Date(),
          hasCertificate: true,
        },
      });
      courseCount++;

      // Add modules with lessons containing full content
      if (course.modules) {
        for (const mod of course.modules) {
          const createdModule = await prisma.lMSCourseModule.create({
            data: {
              courseId: createdCourse.id,
              title: mod.title,
              order: mod.order,
              duration: mod.duration,
            },
          });
          moduleCount++;

          // Add lessons with FULL content from the comprehensive data
          if (mod.lessons) {
            for (const lesson of mod.lessons) {
              await prisma.lMSLesson.create({
                data: {
                  moduleId: createdModule.id,
                  title: lesson.title,
                  content: lesson.content, // Full comprehensive content
                  order: lesson.order,
                  duration: lesson.duration,
                  type: lesson.type as any,
                },
              });
              lessonCount++;
            }
          }
        }
      }

      console.log(`  ✅ Elite course: ${course.title}`);
    } catch (error: any) {
      console.error(`  ⚠️ Error creating elite course ${course.title}:`, error.message);
    }
  }

  console.log(`  ✅ Created ${courseCount} elite courses, ${moduleCount} modules, ${lessonCount} lessons with full content`);
}

async function seedForumContent() {
  console.log('\n💬 Seeding Forum Content...');

  // Create categories
  for (const cat of forumData.categories) {
    const slug = slugify(cat.name);

    await prisma.forumCategory.upsert({
      where: { slug },
      update: {},
      create: {
        name: cat.name,
        nameEn: cat.nameEn,
        slug,
        description: cat.description,
        icon: cat.icon,
        threadCount: cat.threadCount,
        postCount: cat.postCount,
      },
    });
  }
  console.log(`  ✅ Created ${forumData.categories.length} forum categories`);

  // Create threads
  for (const thread of forumData.threads) {
    const category = await prisma.forumCategory.findFirst({
      where: { slug: slugify(forumData.categories.find(c => c.id === thread.categoryId)?.name || '') },
    });

    if (category) {
      const slug = slugify(thread.title).slice(0, 100);

      await prisma.forumThread.upsert({
        where: { slug },
        update: {},
        create: {
          categoryId: category.id,
          title: thread.title,
          slug,
          content: thread.content,
          authorName: thread.author,
          viewCount: thread.views,
          replyCount: thread.replies,
          isPinned: thread.isPinned,
          tags: [],
          lastReplyAt: new Date(thread.createdAt),
        },
      });
    }
  }
  console.log(`  ✅ Created ${forumData.threads.length} forum threads`);
}

async function seedBlogContent() {
  console.log('\n📝 Seeding Blog Content...');

  // Create blog categories
  const categories = ['Compliance', 'Fiscalitate', 'HR', 'Excel', 'Tehnologie', 'Finance', 'Operations', 'Fonduri'];

  for (const catName of categories) {
    const slug = slugify(catName);
    await prisma.blogCategory.upsert({
      where: { slug },
      update: {},
      create: {
        name: catName,
        slug,
        description: `Articole despre ${catName.toLowerCase()}`,
      },
    });
  }
  console.log(`  ✅ Created ${categories.length} blog categories`);

  // Create articles
  let articleCount = 0;
  for (const article of allBlogArticles) {
    const category = await prisma.blogCategory.findFirst({
      where: { slug: slugify(article.category) },
    });

    try {
      await prisma.blogArticle.upsert({
        where: { slug: article.slug },
        update: {},
        create: {
          categoryId: category?.id,
          title: article.title,
          titleEn: article.titleEn,
          slug: article.slug,
          excerpt: article.excerpt,
          content: article.content,
          authorName: article.author,
          readTime: article.readTime,
          tags: article.tags,
          status: BlogArticleStatus.BLOG_PUBLISHED,
          publishedAt: new Date(article.publishedAt),
          viewCount: Math.floor(100 + Math.random() * 1000),
        },
      });
      articleCount++;
    } catch (error: any) {
      if (error.code !== 'P2002') {
        console.error(`  ⚠️ Error creating article ${article.title}:`, error.message);
      }
    }
  }
  console.log(`  ✅ Created ${articleCount} blog articles`);
}

async function seedHSEData() {
  console.log('\n🦺 HSE Data available in seed-demo-content.ts');
  console.log(`  ℹ️ HSE incidents are defined but require user/employee associations`);
  console.log(`  ℹ️ Total HSE incident templates: ${Object.values(allHSEIncidents).flat().length}`);
}

async function seedUsers() {
  console.log('\n👥 Seeding Base Users...');

  const testPassword = await bcrypt.hash('Test123!', 12);
  const adminPassword = await bcrypt.hash('Admin123!', 12);

  // Admin User
  await prisma.user.upsert({
    where: { email: 'admin@documentiulia.ro' },
    update: {},
    create: {
      email: 'admin@documentiulia.ro',
      password: adminPassword,
      name: 'Administrator',
      company: 'DocumentIulia Admin',
      cui: 'RO11111111',
      address: 'Str. Admin 1, București',
      role: 'ADMIN',
      tier: Tier.BUSINESS,
      language: 'ro',
    },
  });

  // Demo User
  await prisma.user.upsert({
    where: { email: 'demo@documentiulia.ro' },
    update: {},
    create: {
      email: 'demo@documentiulia.ro',
      password: testPassword,
      name: 'Demo User',
      company: 'Demo Company SRL',
      cui: 'RO12345678',
      address: 'Str. Demo 100, București',
      role: 'USER',
      tier: Tier.PRO,
      language: 'ro',
    },
  });

  console.log('  ✅ Created admin and demo users');
}

async function main() {
  console.log('🌱 DocumentIulia.ro - Demo Content Seeding');
  console.log('==========================================\n');

  try {
    await seedUsers();
    await seedDemoBusinesses();
    await seedLMSCourses();
    await seedEliteCourses(); // Seed elite courses with comprehensive content
    await seedForumContent();
    await seedBlogContent();
    await seedHSEData();

    console.log('\n==========================================');
    console.log('✅ Demo content seeding completed successfully!');
    console.log('==========================================\n');

    // Print summary
    const [businessCount, courseCount, forumCount, blogCount] = await Promise.all([
      prisma.demoBusiness.count(),
      prisma.lMSCourse.count(),
      prisma.forumThread.count(),
      prisma.blogArticle.count(),
    ]);

    console.log('📊 Summary:');
    console.log(`   - Demo Businesses: ${businessCount}`);
    console.log(`   - LMS Courses: ${courseCount}`);
    console.log(`   - Forum Threads: ${forumCount}`);
    console.log(`   - Blog Articles: ${blogCount}`);

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
