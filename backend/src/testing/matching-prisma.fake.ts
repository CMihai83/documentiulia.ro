/**
 * Stateful in-memory fake of the Prisma delegate surface used by the F-3
 * migrations (ATSService + FreelancerService). Mirrors the style of
 * src/lms/testing/*.fake.ts. Not for production use.
 *
 * Supports the exact query shapes the services use: findUnique({where:{id|email}}),
 * findFirst({where}), findMany({where?, orderBy?}), create, update({where:{id|...}}),
 * deleteMany({}), and the `not` operator.
 */
export function createMatchingPrismaFake() {
  const tables: Record<string, any[]> = {
    atsJobPosting: [],
    atsCandidate: [],
    atsApplication: [],
    freelancerProfile: [],
    freelancerProject: [],
    freelancerProjectApplication: [],
  };
  let seq = 0;
  const cuid = (p: string) => `${p}_${Date.now()}_${++seq}`;

  const matchesWhere = (row: any, where: any = {}): boolean =>
    Object.entries(where).every(([k, v]: [string, any]) => {
      if (v === undefined) return true;
      if (v && typeof v === 'object' && !(v instanceof Date)) {
        if ('not' in v) return row[k] !== v.not;
        if ('in' in v) return v.in.includes(row[k]);
        if ('equals' in v) return row[k] === v.equals;
        if ('gte' in v || 'lte' in v) {
          if ('gte' in v && !(row[k] >= v.gte)) return false;
          if ('lte' in v && !(row[k] <= v.lte)) return false;
          return true;
        }
      }
      return row[k] === v;
    });

  const uniqueKeys: Record<string, string[][]> = {
    atsCandidate: [['email']],
    atsApplication: [['jobId', 'candidateId']],
    freelancerProfile: [['email']],
    freelancerProjectApplication: [['projectId', 'freelancerId']],
  };

  const makeDelegate = (name: string) => ({
    findUnique: async ({ where }: any) => {
      const rows = tables[name].filter(r => matchesWhere(r, where));
      return rows[0] ? { ...rows[0] } : null;
    },
    findFirst: async ({ where }: any = {}) => {
      const rows = tables[name].filter(r => matchesWhere(r, where));
      return rows[0] ? { ...rows[0] } : null;
    },
    findMany: async ({ where, orderBy }: any = {}) => {
      let rows = tables[name].filter(r => matchesWhere(r, where));
      if (orderBy) {
        const [key, dir] = Object.entries(orderBy)[0] as [string, string];
        rows = [...rows].sort((a, b) => {
          const av = a[key] instanceof Date ? a[key].getTime() : a[key];
          const bv = b[key] instanceof Date ? b[key].getTime() : b[key];
          return dir === 'desc' ? (bv > av ? 1 : bv < av ? -1 : 0) : (av > bv ? 1 : av < bv ? -1 : 0);
        });
      }
      return rows.map(r => ({ ...r }));
    },
    create: async ({ data }: any) => {
      for (const keys of uniqueKeys[name] || []) {
        if (keys.every(k => data[k] !== undefined) &&
            tables[name].some(r => keys.every(k => r[k] === data[k]))) {
          const err: any = new Error(`Unique constraint failed on (${keys.join(',')})`);
          err.code = 'P2002';
          throw err;
        }
      }
      const row = { id: cuid(name), createdAt: new Date(), updatedAt: new Date(), ...data };
      tables[name].push(row);
      return { ...row };
    },
    update: async ({ where, data }: any) => {
      const row = tables[name].find(r => matchesWhere(r, where));
      if (!row) {
        const err: any = new Error('Record not found');
        err.code = 'P2025';
        throw err;
      }
      Object.assign(row, data, { updatedAt: new Date() });
      return { ...row };
    },
    delete: async ({ where }: any) => {
      const idx = tables[name].findIndex(r => matchesWhere(r, where));
      if (idx === -1) {
        const err: any = new Error('Record not found');
        err.code = 'P2025';
        throw err;
      }
      const [row] = tables[name].splice(idx, 1);
      return { ...row };
    },
    deleteMany: async ({ where }: any = {}) => {
      const before = tables[name].length;
      tables[name] = tables[name].filter(r => !matchesWhere(r, where || {}));
      return { count: before - tables[name].length };
    },
    count: async ({ where }: any = {}) => tables[name].filter(r => matchesWhere(r, where)).length,
  });

  const fake: any = {};
  for (const name of Object.keys(tables)) fake[name] = makeDelegate(name);
  fake.__tables = tables;
  fake.__reset = () => Object.keys(tables).forEach(k => (tables[k] = []));
  return fake;
}
