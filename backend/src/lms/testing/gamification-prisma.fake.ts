/**
 * Stateful in-memory fake of the Prisma client surface used by
 * GamificationService (F-2). Mirrors the style of lms-prisma.fake.ts.
 * Not for production use.
 */
export function createGamificationPrismaFake() {
  const db = {
    userPoints: [] as any[],
    transactions: [] as any[],
    userBadges: [] as any[],
    userAchievements: [] as any[],
    streaks: [] as any[],
  };
  let seq = 0;
  const cuid = (p: string) => `${p}_${++seq}`;
  const now = () => new Date();

  const match = (row: any, where: any = {}): boolean =>
    Object.entries(where).every(([k, v]) => {
      if (v === undefined) return true;
      if (v && typeof v === 'object' && !(v instanceof Date)) {
        if ('gte' in (v as any)) return row[k] >= (v as any).gte;
        if ('equals' in (v as any)) return row[k] === (v as any).equals;
      }
      return row[k] === v;
    });

  const fake = {
    gamificationUserPoints: {
      findUnique: async ({ where }: any) => db.userPoints.find((r) => r.userId === where.userId) ?? null,
      findMany: async () => db.userPoints.map((r) => ({ ...r })),
      create: async ({ data }: any) => {
        const row = { id: cuid('gup'), createdAt: now(), updatedAt: now(), ...data };
        db.userPoints.push(row);
        return { ...row };
      },
      update: async ({ where, data }: any) => {
        const row = db.userPoints.find((r) => r.userId === where.userId);
        if (!row) throw new Error('not found');
        Object.assign(row, data, { updatedAt: now() });
        return { ...row };
      },
      updateMany: async ({ data }: any) => {
        db.userPoints.forEach((r) => Object.assign(r, data, { updatedAt: now() }));
        return { count: db.userPoints.length };
      },
    },
    gamificationPointsTransaction: {
      create: async ({ data }: any) => {
        const row = { id: cuid('gtx'), createdAt: now(), ...data };
        db.transactions.push(row);
        return { ...row };
      },
      findMany: async ({ where, orderBy, take }: any = {}) => {
        let rows = db.transactions.filter((r) => match(r, where));
        if (orderBy?.createdAt === 'desc') rows = [...rows].reverse();
        if (take) rows = rows.slice(0, take);
        return rows.map((r) => ({ ...r }));
      },
      count: async ({ where }: any = {}) => db.transactions.filter((r) => match(r, where)).length,
      groupBy: async ({ by, where, _sum }: any) => {
        const rows = db.transactions.filter((r) => match(r, where));
        const groups = new Map<string, number>();
        for (const r of rows) groups.set(r.userId, (groups.get(r.userId) ?? 0) + r.points);
        return Array.from(groups.entries()).map(([userId, points]) => ({ userId, _sum: { points } }));
      },
    },
    gamificationUserBadge: {
      findUnique: async ({ where }: any) => {
        const { userId, badgeId } = where.userId_badgeId;
        return db.userBadges.find((r) => r.userId === userId && r.badgeId === badgeId) ?? null;
      },
      findMany: async ({ where, orderBy }: any = {}) => {
        let rows = db.userBadges.filter((r) => match(r, where));
        if (orderBy?.earnedAt === 'asc') rows = [...rows].sort((a, b) => a.earnedAt - b.earnedAt);
        return rows.map((r) => ({ ...r }));
      },
      create: async ({ data }: any) => {
        if (db.userBadges.some((r) => r.userId === data.userId && r.badgeId === data.badgeId)) {
          const err: any = new Error('unique constraint');
          err.code = 'P2002';
          throw err;
        }
        const row = { id: cuid('gub'), createdAt: now(), updatedAt: now(), ...data };
        db.userBadges.push(row);
        return { ...row };
      },
      updateMany: async ({ where, data }: any) => {
        const rows = db.userBadges.filter((r) => match(r, where));
        rows.forEach((r) => Object.assign(r, data, { updatedAt: now() }));
        return { count: rows.length };
      },
      groupBy: async ({ by, _count }: any) => {
        const groups = new Map<string, number>();
        for (const r of db.userBadges) groups.set(r.userId, (groups.get(r.userId) ?? 0) + 1);
        return Array.from(groups.entries()).map(([userId, n]) => ({ userId, _count: { _all: n } }));
      },
    },
    gamificationUserAchievement: {
      findUnique: async ({ where }: any) => {
        const { userId, achievementId } = where.userId_achievementId;
        return db.userAchievements.find((r) => r.userId === userId && r.achievementId === achievementId) ?? null;
      },
      findMany: async ({ where }: any = {}) => db.userAchievements.filter((r) => match(r, where)).map((r) => ({ ...r })),
      create: async ({ data }: any) => {
        const row = { id: cuid('gua'), createdAt: now(), updatedAt: now(), ...data };
        db.userAchievements.push(row);
        return { ...row };
      },
      update: async ({ where, data }: any) => {
        const { userId, achievementId } = where.userId_achievementId;
        const row = db.userAchievements.find((r) => r.userId === userId && r.achievementId === achievementId);
        if (!row) throw new Error('not found');
        Object.assign(row, data, { updatedAt: now() });
        return { ...row };
      },
    },
    gamificationStreak: {
      findUnique: async ({ where }: any) => db.streaks.find((r) => r.userId === where.userId) ?? null,
      findMany: async () => db.streaks.map((r) => ({ ...r })),
      create: async ({ data }: any) => {
        const row = { id: cuid('gst'), createdAt: now(), updatedAt: now(), ...data };
        db.streaks.push(row);
        return { ...row };
      },
      update: async ({ where, data }: any) => {
        const row = db.streaks.find((r) => r.userId === where.userId);
        if (!row) throw new Error('not found');
        Object.assign(row, data, { updatedAt: now() });
        return { ...row };
      },
    },
    /** Test helper: reach into the fake's storage (e.g. to backdate a streak). */
    __db: db,
  };
  return fake;
}
