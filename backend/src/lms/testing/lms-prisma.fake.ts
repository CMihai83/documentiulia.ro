/**
 * Stateful in-memory fake of the Prisma client surface used by LMSService (F-1).
 * Shared by lms.service.spec and the course-content service specs (whose
 * services seed courses through LMSService). Not for production use.
 */
export function createLmsPrismaFake() {
  const db = { courses: [] as any[], modules: [] as any[], lessons: [] as any[], enrollments: [] as any[], progress: [] as any[] };
  let seq = 0;
  const cuid = (p: string) => `${p}_${++seq}`;
  const now = () => new Date();
  const matchCond = (fieldVal: any, cond: any): boolean => {
    if (cond && typeof cond === 'object' && !Array.isArray(cond) && !(cond instanceof Date)) {
      if ('contains' in cond) return typeof fieldVal === 'string' && fieldVal.toLowerCase().includes(String(cond.contains).toLowerCase());
      if ('has' in cond) return Array.isArray(fieldVal) && fieldVal.includes(cond.has);
      if ('equals' in cond) return fieldVal === cond.equals;
    }
    return fieldVal === cond;
  };
  const match = (row: any, where: any = {}): boolean =>
    Object.entries(where).every(([k, v]) => {
      if (v === undefined) return true;
      if (k === 'OR') return (v as any[]).some((sub) => match(row, sub));
      if (k === 'AND') return (v as any[]).every((sub) => match(row, sub));
      return matchCond(row[k], v);
    });
  const apply = (row: any, data: any) => {
    for (const [k, v] of Object.entries(data)) {
      if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && 'increment' in (v as any)) {
        row[k] = (row[k] ?? 0) + (v as any).increment;
      } else if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && 'push' in (v as any)) {
        row[k] = [...(row[k] ?? []), (v as any).push];
      } else {
        row[k] = v;
      }
    }
    row.updatedAt = now();
  };
  const withCourseInclude = (c: any, include: any) => {
    const out = { ...c };
    if (include?.modules) {
      const mods = db.modules.filter((m) => m.courseId === c.id).sort((a, b) => a.order - b.order);
      out.modules = mods.map((m) => {
        const mm = { ...m };
        if (include.modules.include?.lessons) {
          mm.lessons = db.lessons.filter((l) => l.moduleId === m.id).sort((a, b) => a.order - b.order).map((l) => ({ ...l }));
        }
        return mm;
      });
    }
    if (include?.enrollments) out.enrollments = db.enrollments.filter((e) => e.courseId === c.id).map((e) => ({ ...e }));
    return out;
  };
  const withModuleInclude = (m: any, include: any) => {
    const out = { ...m };
    if (include?.lessons) out.lessons = db.lessons.filter((l) => l.moduleId === m.id).sort((a, b) => a.order - b.order).map((l) => ({ ...l }));
    if (include?._count?.select?.lessons) out._count = { lessons: db.lessons.filter((l) => l.moduleId === m.id).length };
    return out;
  };
  const withEnrollmentInclude = (e: any, include: any) => {
    const out = { ...e };
    if (include?.lessonProgress) out.lessonProgress = db.progress.filter((p) => p.enrollmentId === e.id).map((p) => ({ ...p }));
    return out;
  };

  return {
    lMSCourse: {
      create: async ({ data }: any) => {
        if (db.courses.some((c) => c.slug === data.slug)) { const e: any = new Error('unique'); e.code = 'P2002'; throw e; }
        const row = { id: cuid('course'), enrollmentCount: 0, rating: 0, reviewCount: 0, createdAt: now(), updatedAt: now(), publishedAt: null, ...data };
        db.courses.push(row); return { ...row };
      },
      findUnique: async ({ where, include }: any) => {
        const c = db.courses.find((x) => (where.id ? x.id === where.id : x.slug === where.slug));
        return c ? withCourseInclude(c, include) : null;
      },
      findMany: async ({ where, include, orderBy }: any) => {
        let rows = db.courses.filter((c) => match(c, where));
        if (orderBy?.enrollmentCount === 'desc') rows = rows.sort((a, b) => b.enrollmentCount - a.enrollmentCount);
        return rows.map((c) => withCourseInclude(c, include));
      },
      update: async ({ where, data, include }: any) => {
        const c = db.courses.find((x) => x.id === where.id);
        if (!c) throw new Error('not found');
        apply(c, data); return withCourseInclude(c, include);
      },
      deleteMany: async () => { const n = db.courses.length; db.courses = []; return { count: n }; },
    },
    lMSCourseModule: {
      create: async ({ data }: any) => { const row = { id: cuid('mod'), createdAt: now(), updatedAt: now(), ...data }; db.modules.push(row); return { ...row }; },
      findUnique: async ({ where, include }: any) => { const m = db.modules.find((x) => x.id === where.id); return m ? withModuleInclude(m, include) : null; },
      findMany: async ({ where, include }: any) => db.modules.filter((m) => match(m, where)).map((m) => withModuleInclude(m, include)),
      update: async ({ where, data, include }: any) => { const m = db.modules.find((x) => x.id === where.id); if (!m) throw new Error('not found'); apply(m, data); return withModuleInclude(m, include); },
      deleteMany: async () => { const n = db.modules.length; db.modules = []; return { count: n }; },
    },
    lMSLesson: {
      create: async ({ data }: any) => { const row = { id: cuid('lesson'), createdAt: now(), updatedAt: now(), ...data }; db.lessons.push(row); return { ...row }; },
      findUnique: async ({ where }: any) => { const l = db.lessons.find((x) => x.id === where.id); return l ? { ...l } : null; },
      update: async ({ where, data }: any) => { const l = db.lessons.find((x) => x.id === where.id); if (!l) throw new Error('not found'); apply(l, data); return { ...l }; },
      deleteMany: async () => { const n = db.lessons.length; db.lessons = []; return { count: n }; },
    },
    lMSEnrollment: {
      create: async ({ data, include }: any) => {
        if (db.enrollments.some((e) => e.userId === data.userId && e.courseId === data.courseId)) { const e: any = new Error('unique'); e.code = 'P2002'; throw e; }
        const row = { id: cuid('enr'), startedAt: now(), completedAt: null, certificateId: null, progress: 0, createdAt: now(), updatedAt: now(), ...data };
        db.enrollments.push(row); return withEnrollmentInclude(row, include);
      },
      findFirst: async ({ where }: any) => { const e = db.enrollments.find((x) => match(x, where)); return e ? { ...e } : null; },
      findUnique: async ({ where, include }: any) => { const e = db.enrollments.find((x) => x.id === where.id); return e ? withEnrollmentInclude(e, include) : null; },
      findMany: async ({ where, include, orderBy }: any) => {
        let rows = db.enrollments.filter((e) => match(e, where));
        if (orderBy?.startedAt === 'desc') rows = rows.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
        return rows.map((e) => withEnrollmentInclude(e, include));
      },
      update: async ({ where, data, include }: any) => { const e = db.enrollments.find((x) => x.id === where.id); if (!e) throw new Error('not found'); apply(e, data); return withEnrollmentInclude(e, include); },
      count: async ({ where }: any) => db.enrollments.filter((e) => match(e, where)).length,
      deleteMany: async () => { const n = db.enrollments.length; db.enrollments = []; return { count: n }; },
    },
    lMSLessonProgress: {
      upsert: async ({ where, create, update }: any) => {
        const key = where.enrollmentId_lessonId;
        let p = db.progress.find((x) => x.enrollmentId === key.enrollmentId && x.lessonId === key.lessonId);
        if (p) { apply(p, update); return { ...p }; }
        p = { id: cuid('prog'), completed: false, attempts: 0, createdAt: now(), updatedAt: now(), ...create };
        db.progress.push(p); return { ...p };
      },
      findMany: async ({ where }: any) => db.progress.filter((p) => match(p, where)).map((p) => ({ ...p })),
      deleteMany: async () => { const n = db.progress.length; db.progress = []; return { count: n }; },
    },
  };
}
