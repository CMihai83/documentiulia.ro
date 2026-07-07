import { ConfigService } from '@nestjs/config';
import { LMSService } from './lms.service';
import { createLmsPrismaFake } from './testing/lms-prisma.fake';

/**
 * F-1: LMSService is now Prisma-backed. This unit suite drives it through a
 * compact stateful in-memory Prisma fake (+ a no-op Redis), covering the core
 * course/module/lesson/enrollment/progress logic. Real persistence, Content
 * catalog parity, restart durability and cache invalidation are proven in the
 * dedicated integration test (lms_f1_integration) against a real Postgres.
 */

// Redis fake: always-miss read-through (exercises the DB path + graceful cache calls).
const redisFake = { get: async () => null, set: async () => true, del: async () => true, delPattern: async () => 0 };

describe('LMSService (F-1, Prisma-backed via fake)', () => {
  let service: LMSService;

  beforeEach(async () => {
    const prisma = createLmsPrismaFake();
    service = new LMSService(new ConfigService(), prisma as any, redisFake as any);
    await service.resetState();
  });

  const baseCourse = {
    title: 'Excel Mastery',
    description: 'Full Excel course',
    shortDescription: 'Excel',
    instructorId: 'inst-1',
    category: 'EXCEL_VBA' as const,
    level: 'BEGINNER' as const,
    language: 'ro',
    learningOutcomes: ['Pivot tables'],
    targetAudience: ['Analysts'],
    price: 199,
    currency: 'RON',
  };

  describe('Course management', () => {
    it('creates a course with mapped fields', async () => {
      const c = await service.createCourse(baseCourse);
      expect(c.title).toBe('Excel Mastery');
      expect(c.category).toBe('EXCEL_VBA');
      expect(c.status).toBe('DRAFT');
      expect(c.isFree).toBe(false);
      expect(c.instructor.id).toBe('inst-1');
      expect(c.slug).toBe('excel-mastery');
    });

    it('marks a zero-price course free', async () => {
      const c = await service.createCourse({ ...baseCourse, title: 'Free Basics', price: 0 });
      expect(c.isFree).toBe(true);
    });

    it('gets a course by id and slug', async () => {
      const c = await service.createCourse({ ...baseCourse, title: 'Lookup Course' });
      expect((await service.getCourse(c.id))?.title).toBe('Lookup Course');
      expect((await service.getCourseBySlug('lookup-course'))?.id).toBe(c.id);
    });

    it('updates a course', async () => {
      const c = await service.createCourse({ ...baseCourse, title: 'Updatable' });
      const u = await service.updateCourse(c.id, { title: 'Updated', price: 0 });
      expect(u.title).toBe('Updated');
      expect(u.isFree).toBe(true);
    });

    it('filters and searches courses', async () => {
      await service.createCourse({ ...baseCourse, title: 'Excel A' });
      await service.createCourse({ ...baseCourse, title: 'Finance B', description: 'Budget planning', category: 'FINANCE' as const, tags: ['budget'] });
      expect((await service.listCourses({ category: 'FINANCE' as const })).length).toBe(1);
      expect((await service.listCourses({ search: 'excel' })).length).toBe(1);
      expect((await service.listCourses({ search: 'budget' })).length).toBe(1);
    });

    it('refuses to publish without a lesson', async () => {
      const c = await service.createCourse({ ...baseCourse, title: 'Empty' });
      await expect(service.publishCourse(c.id)).rejects.toThrow('at least one module');
      await service.addModule(c.id, { title: 'M1' });
      await expect(service.publishCourse(c.id)).rejects.toThrow('at least one lesson');
    });
  });

  describe('Modules, lessons, duration', () => {
    it('aggregates course duration from lessons and publishes', async () => {
      const c = await service.createCourse({ ...baseCourse, title: 'Durations' });
      const m = await service.addModule(c.id, { title: 'M1' });
      await service.addLesson(m.id, { title: 'L1', type: 'VIDEO', content: { videoUrl: 'x' }, duration: 10 });
      await service.addLesson(m.id, { title: 'L2', type: 'TEXT', content: { textContent: 'hi' }, duration: 5 });
      const published = await service.publishCourse(c.id);
      expect(published.status).toBe('PUBLISHED');
      expect(published.duration).toBe(15);
      expect(published.modules[0].lessons.length).toBe(2);
    });

    it('reorders modules', async () => {
      const c = await service.createCourse({ ...baseCourse, title: 'Reorder' });
      const a = await service.addModule(c.id, { title: 'A' });
      const b = await service.addModule(c.id, { title: 'B' });
      const course = await service.reorderModules(c.id, [b.id, a.id]);
      expect(course.modules[0].id).toBe(b.id);
    });
  });

  describe('Enrollment and progress', () => {
    async function seedCourse() {
      const c = await service.createCourse({ ...baseCourse, title: 'Enrollable' });
      const m = await service.addModule(c.id, { title: 'M1' });
      const l1 = await service.addLesson(m.id, { title: 'L1', type: 'VIDEO', content: {}, duration: 10 });
      const l2 = await service.addLesson(m.id, { title: 'L2', type: 'VIDEO', content: {}, duration: 10 });
      return { c, l1, l2 };
    }

    it('enrolls a user and blocks double enrollment', async () => {
      const { c } = await seedCourse();
      const e = await service.enrollUser('user-1', c.id, 'PURCHASED', 'pay-1');
      expect(e.status).toBe('ACTIVE');
      expect(e.accessType).toBe('PURCHASED');
      await expect(service.enrollUser('user-1', c.id)).rejects.toThrow('already enrolled');
      expect((await service.getCourse(c.id))?.enrollmentCount).toBe(1);
    });

    it('tracks progress and completes at 100%', async () => {
      const { c, l1, l2 } = await seedCourse();
      const e = await service.enrollUser('user-2', c.id);
      let updated = await service.markLessonComplete(e.id, l1.id, 10);
      expect(updated.progress.overallProgress).toBe(50);
      expect(updated.progress.completedLessons).toContain(l1.id);
      updated = await service.markLessonComplete(e.id, l2.id, 10);
      expect(updated.progress.overallProgress).toBe(100);
      expect(updated.status).toBe('COMPLETED');
      expect(updated.completedAt).toBeDefined();
    });

    it('sets the current lesson', async () => {
      const { c, l1 } = await seedCourse();
      const e = await service.enrollUser('user-3', c.id);
      const updated = await service.setCurrentLesson(e.id, l1.id);
      expect(updated.progress.currentLessonId).toBe(l1.id);
    });
  });
});
