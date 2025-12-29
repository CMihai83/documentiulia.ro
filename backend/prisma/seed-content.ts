/**
 * DocumentIulia.ro - Content Seed Runner
 * Seeds all BOP showcase content: courses, businesses, forum, blog
 * Run with: npx ts-node prisma/seed-content.ts
 */

import { PrismaClient, Tier } from '@prisma/client';

// Import all seed data
import { excelCourses, pmCourses } from './seed-data/courses-excel-pm';
import { financeCourses, hrCourses, hseCourses, softSkillsCourses } from './seed-data/courses-finance-hr';
import { demoBusinesses } from './seed-data/demo-businesses';
import { forumCategories, forumThreads } from './seed-data/forum-content';
import { blogCategories, blogArticles } from './seed-data/blog-articles';

const prisma = new PrismaClient();

async function seedCourses() {
  console.log('\n📚 Seeding LMS Courses...');

  const allCourses = [
    ...excelCourses,
    ...pmCourses,
    ...financeCourses,
    ...hrCourses,
    ...hseCourses,
    ...softSkillsCourses,
  ];

  let coursesCreated = 0;
  let modulesCreated = 0;
  let lessonsCreated = 0;

  for (const courseData of allCourses) {
    const { modules, ...courseInfo } = courseData;

    // Check if course exists
    const existing = await prisma.lMSCourse.findUnique({
      where: { slug: courseInfo.slug }
    });

    if (existing) {
      console.log(`  ⏭️  Skipping existing course: ${courseInfo.title}`);
      continue;
    }

    // Create course
    const course = await prisma.lMSCourse.create({
      data: {
        title: courseInfo.title,
        slug: courseInfo.slug,
        description: courseInfo.description,
        category: courseInfo.category as any,
        level: courseInfo.level as any,
        duration: courseInfo.duration,
        price: courseInfo.price,
        isFree: courseInfo.isFree,
        language: courseInfo.language,
        tags: courseInfo.tags,
        status: 'LMS_PUBLISHED',
        publishedAt: new Date(),
      },
    });
    coursesCreated++;

    // Create modules and lessons
    for (const moduleData of modules) {
      const { lessons, ...moduleInfo } = moduleData;

      const module = await prisma.lMSCourseModule.create({
        data: {
          courseId: course.id,
          title: moduleInfo.title,
          order: moduleInfo.order,
          duration: moduleInfo.duration,
        },
      });
      modulesCreated++;

      // Create lessons
      for (const lessonData of lessons) {
        await prisma.lMSLesson.create({
          data: {
            moduleId: module.id,
            title: lessonData.title,
            type: lessonData.type as any,
            duration: lessonData.duration,
            order: lessonData.order,
            content: lessonData.content,
          },
        });
        lessonsCreated++;
      }
    }

    console.log(`  ✅ Created course: ${courseInfo.title} (${modules.length} modules)`);
  }

  console.log(`\n📊 LMS Summary: ${coursesCreated} courses, ${modulesCreated} modules, ${lessonsCreated} lessons`);
}

async function seedDemoBusinesses() {
  console.log('\n🏢 Seeding Demo Businesses...');

  let businessesCreated = 0;
  let contactsCreated = 0;
  let employeesCreated = 0;

  for (const bizData of demoBusinesses) {
    const { contacts, employees, id, ...bizInfo } = bizData as any;

    // Check if business exists
    const existing = await prisma.demoBusiness.findUnique({
      where: { cui: bizInfo.cui }
    });

    if (existing) {
      console.log(`  ⏭️  Skipping existing business: ${bizInfo.name}`);
      continue;
    }

    // Map tier string to enum
    const tierMap: Record<string, Tier> = {
      'FREE': Tier.FREE,
      'PRO': Tier.PRO,
      'BUSINESS': Tier.BUSINESS,
    };

    // Create business
    const business = await prisma.demoBusiness.create({
      data: {
        name: bizInfo.name,
        cui: bizInfo.cui,
        industry: bizInfo.industry,
        city: bizInfo.city,
        county: bizInfo.county || bizInfo.city,
        employeeCount: bizInfo.employeeCount,
        revenue: bizInfo.revenue,
        description: bizInfo.description,
        tier: tierMap[bizInfo.tier] || Tier.FREE,
      },
    });
    businessesCreated++;

    // Create contacts
    if (contacts) {
      for (const contact of contacts) {
        await prisma.demoBusinessContact.create({
          data: {
            businessId: business.id,
            name: contact.name,
            role: contact.role,
            email: contact.email,
            phone: contact.phone,
            isPrimary: contact.isPrimary || false,
          },
        });
        contactsCreated++;
      }
    }

    // Create employees
    if (employees) {
      for (const emp of employees) {
        await prisma.demoEmployee.create({
          data: {
            businessId: business.id,
            firstName: emp.firstName,
            lastName: emp.lastName,
            email: emp.email,
            department: emp.department,
            position: emp.position,
            salary: emp.salary,
            hireDate: new Date('2024-01-15'),
            contractType: emp.contractType as any,
          },
        });
        employeesCreated++;
      }
    }

    console.log(`  ✅ Created business: ${bizInfo.name} (${employees?.length || 0} employees)`);
  }

  console.log(`\n📊 Business Summary: ${businessesCreated} businesses, ${contactsCreated} contacts, ${employeesCreated} employees`);
}

async function seedForumContent() {
  console.log('\n💬 Seeding Forum Content...');

  let categoriesCreated = 0;
  let threadsCreated = 0;
  let postsCreated = 0;

  // Create categories
  for (const catData of forumCategories) {
    const existing = await prisma.forumCategory.findUnique({
      where: { slug: catData.slug }
    });

    if (existing) {
      console.log(`  ⏭️  Skipping existing category: ${catData.name}`);
      continue;
    }

    await prisma.forumCategory.create({
      data: catData as any,
    });
    categoriesCreated++;
  }

  // Create threads with posts
  for (const threadData of forumThreads) {
    const { posts, categorySlug, ...threadInfo } = threadData as any;

    // Find category
    const category = await prisma.forumCategory.findUnique({
      where: { slug: categorySlug }
    });

    if (!category) {
      console.log(`  ⚠️  Category not found: ${categorySlug}`);
      continue;
    }

    // Check if thread exists
    const existingThread = await prisma.forumThread.findUnique({
      where: { slug: threadInfo.slug }
    });

    if (existingThread) {
      console.log(`  ⏭️  Skipping existing thread: ${threadInfo.title}`);
      continue;
    }

    // Create thread
    const thread = await prisma.forumThread.create({
      data: {
        categoryId: category.id,
        title: threadInfo.title,
        slug: threadInfo.slug,
        content: threadInfo.content,
        authorName: threadInfo.authorName,
        viewCount: Math.floor(Math.random() * 500) + 50,
        replyCount: posts?.length || 0,
        isPinned: threadInfo.isPinned || false,
        isFeatured: false,
        lastReplyAt: new Date(),
        lastReplyBy: posts?.[posts.length - 1]?.authorName || threadInfo.authorName,
      },
    });
    threadsCreated++;

    // Create posts (replies)
    if (posts) {
      for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        await prisma.forumPost.create({
          data: {
            threadId: thread.id,
            content: post.content,
            authorName: post.authorName,
            createdAt: new Date(Date.now() - (posts.length - i) * 3600000), // Stagger by hour
          },
        });
        postsCreated++;
      }
    }

    // Update category counts
    await prisma.forumCategory.update({
      where: { id: category.id },
      data: {
        threadCount: { increment: 1 },
        postCount: { increment: (posts?.length || 0) + 1 },
      },
    });

    console.log(`  ✅ Created thread: ${threadInfo.title} (${posts?.length || 0} replies)`);
  }

  console.log(`\n📊 Forum Summary: ${categoriesCreated} categories, ${threadsCreated} threads, ${postsCreated} posts`);
}

async function seedBlogContent() {
  console.log('\n📝 Seeding Blog Content...');

  let categoriesCreated = 0;
  let articlesCreated = 0;

  // Create categories
  for (const catData of blogCategories) {
    const existing = await prisma.blogCategory.findUnique({
      where: { slug: catData.slug }
    });

    if (existing) {
      console.log(`  ⏭️  Skipping existing category: ${catData.name}`);
      continue;
    }

    await prisma.blogCategory.create({
      data: catData as any,
    });
    categoriesCreated++;
  }

  // Create articles
  for (const articleData of blogArticles) {
    const { categorySlug, ...articleInfo } = articleData as any;

    // Find category
    const category = await prisma.blogCategory.findUnique({
      where: { slug: categorySlug }
    });

    if (!category) {
      console.log(`  ⚠️  Category not found: ${categorySlug}`);
      continue;
    }

    // Check if article exists
    const existingArticle = await prisma.blogArticle.findUnique({
      where: { slug: articleInfo.slug }
    });

    if (existingArticle) {
      console.log(`  ⏭️  Skipping existing article: ${articleInfo.title}`);
      continue;
    }

    await prisma.blogArticle.create({
      data: {
        categoryId: category.id,
        title: articleInfo.title,
        slug: articleInfo.slug,
        excerpt: articleInfo.excerpt,
        content: articleInfo.content,
        authorName: articleInfo.authorName,
        tags: articleInfo.tags || [],
        readTime: articleInfo.readTime || Math.ceil(articleInfo.content.length / 1500),
        viewCount: Math.floor(Math.random() * 1000) + 100,
        status: 'BLOG_PUBLISHED',
        publishedAt: new Date(),
      },
    });
    articlesCreated++;

    console.log(`  ✅ Created article: ${articleInfo.title}`);
  }

  console.log(`\n📊 Blog Summary: ${categoriesCreated} categories, ${articlesCreated} articles`);
}

async function main() {
  console.log('🌱 Starting DocumentIulia.ro BOP Content Seed...');
  console.log('================================================\n');

  try {
    // Seed all content in order
    await seedCourses();
    await seedDemoBusinesses();
    await seedForumContent();
    await seedBlogContent();

    console.log('\n================================================');
    console.log('🎉 BOP Content seeding completed successfully!');
    console.log('\nContent is now available at:');
    console.log('  📚 /courses - LMS Courses');
    console.log('  🏢 /demo-businesses - Demo Companies');
    console.log('  💬 /forum - Forum Discussions');
    console.log('  📝 /blog - Blog Articles');

  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
