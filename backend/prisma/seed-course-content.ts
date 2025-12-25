/**
 * Seeder to populate course modules and lessons
 * Links content from courses-additional-complete.ts and part2 to existing courses
 */

import { PrismaClient } from '@prisma/client';
import { additionalCoursesComplete } from './seed-data/courses-additional-complete';
import { additionalCoursesCompletePart2 } from './seed-data/courses-additional-complete-part2';

const prisma = new PrismaClient();

// Combine both parts
const allCourseContent = [...additionalCoursesComplete, ...additionalCoursesCompletePart2];

async function seedCourseContent() {
  console.log('📚 Seeding Course Content (Modules & Lessons)...\n');
  console.log(`📋 Processing ${allCourseContent.length} courses with content\n`);

  let coursesUpdated = 0;
  let modulesCreated = 0;
  let lessonsCreated = 0;

  for (const courseContent of allCourseContent) {
    console.log(`\n🔍 Processing: ${courseContent.slug}`);

    // Find the course by slug
    const course = await prisma.lMSCourse.findUnique({
      where: { slug: courseContent.slug },
      include: {
        modules: {
          include: {
            lessons: true
          }
        }
      }
    });

    if (!course) {
      console.log(`  ⚠️  Course not found: ${courseContent.slug}`);
      continue;
    }

    // Check if course already has modules
    if (course.modules.length > 0) {
      console.log(`  ⏭️  Already has ${course.modules.length} modules, skipping...`);
      continue;
    }

    console.log(`  📝 Adding content to: ${course.title}`);

    // Create modules and lessons
    for (const moduleData of courseContent.modules) {
      try {
        const createdModule = await prisma.lMSCourseModule.create({
          data: {
            title: moduleData.title,
            description: moduleData.description || '',
            order: moduleData.order,
            duration: moduleData.duration,
            courseId: course.id,
          }
        });

        modulesCreated++;
        console.log(`    ✅ Module ${moduleData.order}: ${moduleData.title}`);

        // Create lessons for this module
        for (const lessonData of moduleData.lessons) {
          await prisma.lMSLesson.create({
            data: {
              title: lessonData.title,
              type: lessonData.type as any,
              duration: lessonData.duration,
              order: lessonData.order,
              content: lessonData.content,
              module: { connect: { id: createdModule.id } },
            }
          });

          lessonsCreated++;
        }

        console.log(`       └─ ${moduleData.lessons.length} lessons added`);

      } catch (error: any) {
        console.log(`    ❌ Error creating module: ${error.message}`);
      }
    }

    // Update course duration based on actual content
    const totalDuration = courseContent.modules.reduce((sum, m) => sum + m.duration, 0);
    await prisma.lMSCourse.update({
      where: { id: course.id },
      data: { duration: totalDuration }
    });

    coursesUpdated++;
  }

  console.log('\n' + '═'.repeat(50));
  console.log(`📊 Summary:`);
  console.log(`   Courses updated: ${coursesUpdated}`);
  console.log(`   Modules created: ${modulesCreated}`);
  console.log(`   Lessons created: ${lessonsCreated}`);
  console.log('═'.repeat(50) + '\n');
}

async function main() {
  console.log('\n🚀 Course Content Seeder\n');
  console.log('This script adds modules and lessons to existing courses.\n');

  await seedCourseContent();

  // Show total course stats
  const stats = await prisma.lMSCourse.aggregate({
    _count: { id: true }
  });

  const modulesCount = await prisma.lMSCourseModule.count();
  const lessonsCount = await prisma.lMSLesson.count();

  console.log('\n📈 Database Totals:');
  console.log(`   Total Courses: ${stats._count.id}`);
  console.log(`   Total Modules: ${modulesCount}`);
  console.log(`   Total Lessons: ${lessonsCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeder Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
