import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Helper to convert Romanian category to enum
function mapCourseCategory(category: string): any {
  const mapping: Record<string, string> = {
    'Contabilitate & Fiscalitate': 'ACCOUNTING',
    'HR & Legislația Muncii': 'HR_COMPLIANCE',
    'Business & Operațiuni': 'FINANCE_OPS',
    'Tehnologie & Automatizare': 'SOFT_SKILLS',
  };
  return mapping[category] || 'ACCOUNTING';
}

function mapCourseLevel(level: string): any {
  const mapping: Record<string, string> = {
    'Începător': 'BEGINNER',
    'Intermediar': 'INTERMEDIATE',
    'Avansat': 'ADVANCED',
  };
  return mapping[level] || 'BEGINNER';
}

function mapBlogCategory(category: string): string {
  return category || 'ANAF';
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function importCourses() {
  console.log('\n📚 Importing Courses...\n');

  const seedDataDir = path.join(__dirname, 'seed-data');
  const files = fs.readdirSync(seedDataDir);
  const courseFile = files.find(f => f.startsWith('courses-generated-'));

  if (!courseFile) {
    console.log('⚠️  No course file found');
    return;
  }

  const coursesData = JSON.parse(
    fs.readFileSync(path.join(seedDataDir, courseFile), 'utf-8')
  );

  let imported = 0;
  for (const courseData of coursesData) {
    try {
      const course = await prisma.lMSCourse.create({
        data: {
          title: courseData.title,
          slug: courseData.slug || slugify(courseData.title),
          description: courseData.description,
          category: mapCourseCategory(courseData.category),
          level: mapCourseLevel(courseData.level),
          duration: courseData.duration || 10,
          price: courseData.price || 0,
          currency: 'RON',
          isFree: !courseData.price || courseData.price === 0,
          language: 'ro',
          tags: courseData.seo?.keywords || [],
          status: 'LMS_PUBLISHED',
          publishedAt: new Date(),
          hasCertificate: true,
          modules: {
            create: (courseData.modules || []).map((mod: any, idx: number) => ({
              title: mod.title,
              description: mod.description || '',
              order: idx + 1,
              duration: parseInt(mod.duration?.match(/\d+/)?.[0] || '60'),
              lessons: {
                create: (mod.lessons || []).map((lesson: string, lessonIdx: number) => ({
                  title: lesson,
                  description: '',
                  order: lessonIdx + 1,
                  type: 'VIDEO',
                  content: `Content for ${lesson}`,
                  duration: 30,
                })),
              },
            })),
          },
        },
      });

      imported++;
      console.log(`✅ Imported: ${course.title}`);
    } catch (error: any) {
      console.error(`❌ Failed to import ${courseData.title}:`, error.message);
    }
  }

  console.log(`\n📚 Imported ${imported}/${coursesData.length} courses\n`);
}

async function importBlogArticles() {
  console.log('\n📝 Importing Blog Articles...\n');

  const seedDataDir = path.join(__dirname, 'seed-data');
  const files = fs.readdirSync(seedDataDir);
  const blogFiles = files.filter(f => f.startsWith('blog-'));

  if (blogFiles.length === 0) {
    console.log('⚠️  No blog files found');
    return;
  }

  // First, ensure we have categories
  const categories = ['ANAF', 'HR', 'Business', 'Tehnologie', 'Noutăți'];
  for (const catName of categories) {
    await prisma.blogCategory.upsert({
      where: { slug: slugify(catName) },
      update: {},
      create: {
        name: catName,
        nameEn: catName,
        slug: slugify(catName),
        description: `Articles about ${catName}`,
        isActive: true,
      },
    });
  }

  let imported = 0;
  for (const blogFile of blogFiles) {
    const articlesData = JSON.parse(
      fs.readFileSync(path.join(seedDataDir, blogFile), 'utf-8')
    );

    for (const articleData of articlesData) {
      try {
        // Find or create category
        const categorySlug = slugify(articleData.category || 'anaf');
        let category = await prisma.blogCategory.findUnique({
          where: { slug: categorySlug },
        });

        if (!category) {
          category = await prisma.blogCategory.create({
            data: {
              name: articleData.category || 'ANAF',
              slug: categorySlug,
              description: `Articles about ${articleData.category}`,
              isActive: true,
            },
          });
        }

        const article = await prisma.blogArticle.create({
          data: {
            title: articleData.title,
            slug: articleData.slug || slugify(articleData.title),
            excerpt: articleData.excerpt || '',
            content: articleData.content || articleData.excerpt || '',
            categoryId: category.id,
            authorName: articleData.author || 'Echipa DocumentIulia.ro',
            authorBio: 'Expert în contabilitate și conformitate ANAF',
            readTime: articleData.readTime || 8,
            tags: articleData.tags || [],
            status: 'BLOG_PUBLISHED',
            publishedAt: new Date(articleData.publishedAt || Date.now()),
            seoTitle: articleData.seo?.title || articleData.title,
            seoDescription: articleData.seo?.description || articleData.excerpt,
            seoKeywords: articleData.seo?.keywords || articleData.tags || [],
            viewCount: Math.floor(Math.random() * 500) + 100,
          },
        });

        imported++;
        console.log(`✅ Imported: ${article.title}`);
      } catch (error: any) {
        console.error(`❌ Failed to import ${articleData.title}:`, error.message);
      }
    }
  }

  console.log(`\n📝 Imported ${imported} blog articles\n`);
}

async function importForumThreads() {
  console.log('\n💬 Importing Forum Threads...\n');

  const seedDataDir = path.join(__dirname, 'seed-data');
  const files = fs.readdirSync(seedDataDir);
  const forumFile = files.find(f => f.startsWith('forum-generated-'));

  if (!forumFile) {
    console.log('⚠️  No forum file found');
    return;
  }

  // First, ensure we have categories
  const categories = [
    { name: 'Întrebări Frecvente', slug: 'intrebari-frecvente' },
    { name: 'Rezolvare Probleme', slug: 'rezolvare-probleme' },
    { name: 'Best Practices', slug: 'best-practices' },
    { name: 'Discuții Generale', slug: 'discutii-generale' },
    { name: 'Noutăți', slug: 'noutati' },
  ];

  for (const cat of categories) {
    await prisma.forumCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: {
        name: cat.name,
        nameEn: cat.name,
        slug: cat.slug,
        description: `Forum category for ${cat.name}`,
        isActive: true,
      },
    });
  }

  const threadsData = JSON.parse(
    fs.readFileSync(path.join(seedDataDir, forumFile), 'utf-8')
  );

  let imported = 0;
  for (const threadData of threadsData) {
    try {
      // Find category
      const categorySlug = slugify(threadData.category || 'intrebari-frecvente');
      const category = await prisma.forumCategory.findUnique({
        where: { slug: categorySlug },
      });

      if (!category) {
        console.log(`⚠️  Category not found: ${categorySlug}`);
        continue;
      }

      const thread = await prisma.forumThread.create({
        data: {
          title: threadData.title,
          slug: threadData.slug || slugify(threadData.title),
          content: threadData.initialPost || threadData.content || '',
          categoryId: category.id,
          authorName: 'Utilizator',
          viewCount: threadData.views || Math.floor(Math.random() * 300) + 50,
          replyCount: threadData.replies?.length || 0,
          isPinned: threadData.sticky || false,
          isLocked: false,
          isFeatured: threadData.sticky || false,
          tags: threadData.tags || [],
          createdAt: new Date(threadData.createdAt || Date.now()),
          lastReplyAt: new Date(threadData.lastActivity || Date.now()),
          lastReplyBy: threadData.replies?.[0]?.author || null,
          posts: {
            create: (threadData.replies || []).map((reply: any) => ({
              content: reply.content,
              authorName: reply.author || 'Utilizator',
              isAnswer: reply.helpful || false,
              likeCount: reply.helpful ? Math.floor(Math.random() * 10) + 5 : 0,
              createdAt: new Date(reply.createdAt || Date.now()),
            })),
          },
        },
      });

      imported++;
      console.log(`✅ Imported: ${thread.title}`);
    } catch (error: any) {
      console.error(`❌ Failed to import ${threadData.title}:`, error.message);
    }
  }

  console.log(`\n💬 Imported ${imported}/${threadsData.length} forum threads\n`);
}

async function main() {
  console.log('\n🚀 Starting Grok Content Import...\n');
  console.log('━'.repeat(80));

  try {
    await importCourses();
    await importBlogArticles();
    await importForumThreads();

    console.log('━'.repeat(80));
    console.log('\n✅ Import Complete!\n');

    // Show summary
    const courseCount = await prisma.lMSCourse.count();
    const blogCount = await prisma.blogArticle.count();
    const forumCount = await prisma.forumThread.count();

    console.log('📊 Database Summary:');
    console.log(`   📚 Courses: ${courseCount}`);
    console.log(`   📝 Blog Articles: ${blogCount}`);
    console.log(`   💬 Forum Threads: ${forumCount}`);
    console.log('');

  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
