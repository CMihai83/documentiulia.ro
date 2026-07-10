import { ProjectsService } from './projects.service';

describe('ProjectsService.computeStats (pure)', () => {
  const now = new Date('2026-07-10T00:00:00Z');

  it('counts tasks by status and milestones done', () => {
    const s = ProjectsService.computeStats({
      budgetRon: 45000, spentRon: 29250, dueDate: new Date('2026-07-20T00:00:00Z'),
      tasks: [{ status: 'todo' }, { status: 'in_progress' }, { status: 'completed' }, { status: 'completed' }],
      milestones: [{ done: true }, { done: false }],
    }, now);
    expect(s.tasks).toEqual({ total: 4, todo: 1, in_progress: 1, completed: 2 });
    expect(s.milestones).toEqual({ total: 2, done: 1 });
    expect(s.budget.remainingRon).toBe(15750);
    expect(s.budget.utilizationPct).toBe(65);
    expect(s.daysRemaining).toBe(10);
    expect(s.overdue).toBe(false);
  });

  it('handles missing budget/dueDate and overdue', () => {
    const s = ProjectsService.computeStats({ tasks: [], milestones: [], dueDate: new Date('2026-07-01T00:00:00Z') }, now);
    expect(s.budget.remainingRon).toBeNull();
    expect(s.budget.utilizationPct).toBeNull();
    expect(s.overdue).toBe(true);
    const s2 = ProjectsService.computeStats({ tasks: [], milestones: [], dueDate: null }, now);
    expect(s2.daysRemaining).toBeNull();
    expect(s2.overdue).toBe(false);
  });
});
