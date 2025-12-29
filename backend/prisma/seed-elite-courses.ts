/**
 * DocumentIulia.ro - Elite Courses Seed Script
 * Seeds comprehensive courses with detailed text-based content
 * Run with: DATABASE_URL="postgresql://..." npx ts-node prisma/seed-elite-courses.ts
 */

import { PrismaClient } from '@prisma/client';
import { allEliteCourses } from './seed-data/all-elite-courses';

const prisma = new PrismaClient();

// Valid category mapping
const categoryMap: Record<string, string> = {
  ACCOUNTING: 'FINANCE_OPS',
  EXCEL_VBA: 'EXCEL_VBA',
  HR_PAYROLL: 'HR_COMPLIANCE',
  PROJECT_MANAGEMENT: 'PROJECT_MANAGEMENT',
  FREELANCER: 'FINANCE_OPS',
  SOFT_SKILLS: 'SOFT_SKILLS',
  FINANCE_OPS: 'FINANCE_OPS',
  HR_COMPLIANCE: 'HR_COMPLIANCE',
  HSE_SAFETY: 'HSE_SAFETY',
};

async function seedEliteCourses() {
  console.log('🎓 Seeding Elite Courses with Comprehensive Content...\n');

  let coursesCreated = 0;
  let modulesCreated = 0;
  let lessonsCreated = 0;

  for (const courseData of allEliteCourses) {
    const { modules, ...courseInfo } = courseData as any;

    // Check if course exists
    const existing = await prisma.lMSCourse.findUnique({
      where: { slug: courseInfo.slug },
    });

    if (existing) {
      console.log(`  ⏭️  Skipping existing: ${courseInfo.title.substring(0, 50)}...`);
      continue;
    }

    // Map category to valid enum
    const mappedCategory = categoryMap[courseInfo.category] || 'FINANCE_OPS';

    try {
      // Create course
      const course = await prisma.lMSCourse.create({
        data: {
          title: courseInfo.title,
          slug: courseInfo.slug,
          description: courseInfo.description,
          category: mappedCategory as any,
          level: courseInfo.level as any,
          duration: courseInfo.duration,
          price: courseInfo.price,
          isFree: courseInfo.isFree || false,
          language: courseInfo.language || 'ro',
          tags: courseInfo.tags || [],
          status: 'LMS_PUBLISHED',
          publishedAt: new Date(),
        },
      });
      coursesCreated++;

      // Create modules and lessons
      if (modules && modules.length > 0) {
        for (const moduleData of modules) {
          const { lessons, ...moduleInfo } = moduleData;

          const module = await prisma.lMSCourseModule.create({
            data: {
              courseId: course.id,
              title: moduleInfo.title,
              order: moduleInfo.order,
              duration: moduleInfo.duration || 60,
            },
          });
          modulesCreated++;

          // Create lessons
          if (lessons && lessons.length > 0) {
            for (const lessonData of lessons) {
              await prisma.lMSLesson.create({
                data: {
                  moduleId: module.id,
                  title: lessonData.title,
                  type: lessonData.type as any,
                  duration: lessonData.duration || 30,
                  order: lessonData.order,
                  content: lessonData.content || '',
                },
              });
              lessonsCreated++;
            }
          }
        }
      }

      console.log(`  ✅ Created: ${courseInfo.title.substring(0, 50)}... (${modules?.length || 0} modules)`);
    } catch (error: any) {
      console.log(`  ❌ Failed: ${courseInfo.title.substring(0, 40)}... - ${error.message}`);
    }
  }

  console.log(`\n📊 Elite Courses Summary:`);
  console.log(`   - Courses created: ${coursesCreated}`);
  console.log(`   - Modules created: ${modulesCreated}`);
  console.log(`   - Lessons created: ${lessonsCreated}`);
}

async function main() {
  console.log('🚀 Starting Elite Courses Seed...');
  console.log('================================\n');

  try {
    await seedEliteCourses();

    // Get final count
    const totalCourses = await prisma.lMSCourse.count();
    console.log(`\n✨ Total courses in database: ${totalCourses}`);

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
