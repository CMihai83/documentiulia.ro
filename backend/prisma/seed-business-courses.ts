/**
 * DocumentIulia.ro - Business Formation Courses Seed Script
 * Sprint 25 - Seeds 5 comprehensive courses on starting a business
 * Run with: npx tsx prisma/seed-business-courses.ts
 */

import { PrismaClient } from '@prisma/client';
import { businessFormationCourses } from './seed-data/courses-business-formation';

const prisma = new PrismaClient();

// Valid category mapping
const categoryMap: Record<string, string> = {
  BUSINESS: 'FINANCE_OPS',
  ACCOUNTING: 'FINANCE_OPS',
  EXCEL_VBA: 'EXCEL_VBA',
  HR_PAYROLL: 'HR_COMPLIANCE',
  PROJECT_MANAGEMENT: 'PROJECT_MANAGEMENT',
  FREELANCER: 'FINANCE_OPS',
  SOFT_SKILLS: 'SOFT_SKILLS',
  FINANCE_OPS: 'FINANCE_OPS',
  HR_COMPLIANCE: 'HR_COMPLIANCE',
  HSE_SAFETY: 'HSE_SAFETY',
  LEGAL: 'FINANCE_OPS',
  STARTUP: 'FINANCE_OPS',
};

async function seedBusinessCourses() {
  console.log('🚀 Seeding Business Formation Courses (Sprint 25)...\n');

  let coursesCreated = 0;
  let modulesCreated = 0;
  let lessonsCreated = 0;

  for (const courseData of businessFormationCourses) {
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
              description: moduleInfo.description || '',
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

          console.log(`    ✅ Module ${moduleInfo.order}: ${moduleInfo.title} (${lessons?.length || 0} lessons)`);
        }
      }

      console.log(`  📚 Created: ${courseInfo.title}`);
      console.log(`     └─ ${modules?.length || 0} modules, ${modules?.reduce((sum: number, m: any) => sum + (m.lessons?.length || 0), 0) || 0} lessons\n`);
    } catch (error: any) {
      console.log(`  ❌ Failed: ${courseInfo.title.substring(0, 40)}... - ${error.message}`);
    }
  }

  console.log('═'.repeat(60));
  console.log(`📊 Business Formation Courses Summary:`);
  console.log(`   - Courses created: ${coursesCreated}`);
  console.log(`   - Modules created: ${modulesCreated}`);
  console.log(`   - Lessons created: ${lessonsCreated}`);
  console.log('═'.repeat(60));
}

async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('🎓 Sprint 25 - Business Formation Courses Seeder');
  console.log('═'.repeat(60) + '\n');

  try {
    await seedBusinessCourses();

    // Get final count
    const totalCourses = await prisma.lMSCourse.count();
    const totalModules = await prisma.lMSCourseModule.count();
    const totalLessons = await prisma.lMSLesson.count();

    console.log(`\n✨ Database Totals:`);
    console.log(`   - Total courses: ${totalCourses}`);
    console.log(`   - Total modules: ${totalModules}`);
    console.log(`   - Total lessons: ${totalLessons}\n`);

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
