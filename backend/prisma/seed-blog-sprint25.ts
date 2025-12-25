/**
 * DocumentIulia.ro - Sprint 25 Blog Articles Seeder
 * Seeds 10 SEO-optimized articles on business formation
 * Run with: npx tsx prisma/seed-blog-sprint25.ts
 */

import { PrismaClient } from '@prisma/client';
import { sprint25BlogArticles } from './seed-data/blog-articles-sprint25';

const prisma = new PrismaClient();

async function seedSprint25BlogArticles() {
  console.log('\n📝 Seeding Sprint 25 Blog Articles (Business Formation)...\n');

  let categoriesCreated = 0;
  let articlesCreated = 0;
  let articlesSkipped = 0;

  // Ensure required categories exist
  const requiredCategories = [
    { slug: 'antreprenoriat', name: 'Antreprenoriat', description: 'Ghiduri și sfaturi pentru antreprenori' },
    { slug: 'fiscalitate', name: 'Fiscalitate', description: 'Totul despre taxe, impozite și conformitate fiscală' },
    { slug: 'legislatie', name: 'Legislație', description: 'Noutăți și explicații legislative pentru afaceri' },
    { slug: 'digitalizare', name: 'Digitalizare', description: 'Transformare digitală și tehnologie pentru business' },
    { slug: 'resurse-umane', name: 'Resurse Umane', description: 'HR, recrutare și managementul angajaților' },
    { slug: 'fonduri-europene', name: 'Fonduri Europene', description: 'Ghiduri pentru accesarea fondurilor UE' },
  ];

  for (const cat of requiredCategories) {
    const existing = await prisma.blogCategory.findUnique({
      where: { slug: cat.slug }
    });

    if (!existing) {
      await prisma.blogCategory.create({
        data: cat,
      });
      categoriesCreated++;
      console.log(`  ✅ Created category: ${cat.name}`);
    }
  }

  // Seed articles
  for (const articleData of sprint25BlogArticles) {
    const { categorySlug, ...articleInfo } = articleData;

    // Find category
    const category = await prisma.blogCategory.findUnique({
      where: { slug: categorySlug }
    });

    if (!category) {
      console.log(`  ⚠️  Category not found: ${categorySlug}, skipping article: ${articleInfo.title}`);
      continue;
    }

    // Check if article exists
    const existingArticle = await prisma.blogArticle.findUnique({
      where: { slug: articleInfo.slug }
    });

    if (existingArticle) {
      console.log(`  ⏭️  Article exists: ${articleInfo.title.substring(0, 50)}...`);
      articlesSkipped++;
      continue;
    }

    // Create article
    await prisma.blogArticle.create({
      data: {
        categoryId: category.id,
        title: articleInfo.title,
        titleEn: articleInfo.titleEn,
        slug: articleInfo.slug,
        excerpt: articleInfo.excerpt,
        content: articleInfo.content,
        authorName: articleInfo.authorName,
        authorBio: articleInfo.authorBio,
        tags: articleInfo.tags || [],
        readTime: articleInfo.readTime || Math.ceil(articleInfo.content.length / 1500),
        seoTitle: articleInfo.title,
        seoDescription: articleInfo.excerpt,
        seoKeywords: articleInfo.tags || [],
        viewCount: Math.floor(Math.random() * 500) + 50,
        likeCount: Math.floor(Math.random() * 50) + 5,
        status: 'BLOG_PUBLISHED',
        publishedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
      },
    });
    articlesCreated++;

    console.log(`  ✅ Created: ${articleInfo.title.substring(0, 60)}...`);
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`📊 Sprint 25 Blog Summary:`);
  console.log(`   Categories created: ${categoriesCreated}`);
  console.log(`   Articles created: ${articlesCreated}`);
  console.log(`   Articles skipped (existing): ${articlesSkipped}`);
  console.log('═'.repeat(60) + '\n');

  // Show total blog stats
  const totalArticles = await prisma.blogArticle.count();
  const totalCategories = await prisma.blogCategory.count();
  const publishedArticles = await prisma.blogArticle.count({
    where: { status: 'BLOG_PUBLISHED' }
  });

  console.log('📈 Total Blog Statistics:');
  console.log(`   Total Categories: ${totalCategories}`);
  console.log(`   Total Articles: ${totalArticles}`);
  console.log(`   Published Articles: ${publishedArticles}`);
}

async function main() {
  console.log('\n🚀 Sprint 25 Blog Articles Seeder');
  console.log('Business Formation & Entrepreneurship Content\n');

  await seedSprint25BlogArticles();
}

main()
  .catch((e) => {
    console.error('❌ Seeder Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
