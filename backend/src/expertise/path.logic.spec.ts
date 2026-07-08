import { orderGapsTopologically, buildPath, totalMinutes, GapInput, ResourceRef } from './path.logic';

describe('EXP-5 path.logic', () => {
  describe('orderGapsTopologically', () => {
    it('places a prerequisite (parent) before its dependent even if the dependent has higher weight', () => {
      const gaps: GapInput[] = [
        { skillId: 'child', label: 'VAT', weight: 100, parentSkillId: 'parent' },
        { skillId: 'parent', label: 'Accounting', weight: 10, parentSkillId: null },
      ];
      const ordered = orderGapsTopologically(gaps).map((g) => g.skillId);
      expect(ordered).toEqual(['parent', 'child']); // prerequisite first despite lower weight
    });

    it('orders independent gaps by weight desc', () => {
      const gaps: GapInput[] = [
        { skillId: 'a', label: 'A', weight: 5, parentSkillId: null },
        { skillId: 'b', label: 'B', weight: 20, parentSkillId: null },
        { skillId: 'c', label: 'C', weight: 12, parentSkillId: null },
      ];
      expect(orderGapsTopologically(gaps).map((g) => g.skillId)).toEqual(['b', 'c', 'a']);
    });

    it('ignores a parent link that is not itself a gap', () => {
      const gaps: GapInput[] = [
        { skillId: 'x', label: 'X', weight: 5, parentSkillId: 'not-a-gap' },
        { skillId: 'y', label: 'Y', weight: 9, parentSkillId: null },
      ];
      expect(orderGapsTopologically(gaps).map((g) => g.skillId)).toEqual(['y', 'x']);
    });

    it('handles a chain of prerequisites', () => {
      const gaps: GapInput[] = [
        { skillId: 'c', label: 'C', weight: 30, parentSkillId: 'b' },
        { skillId: 'b', label: 'B', weight: 20, parentSkillId: 'a' },
        { skillId: 'a', label: 'A', weight: 10, parentSkillId: null },
      ];
      expect(orderGapsTopologically(gaps).map((g) => g.skillId)).toEqual(['a', 'b', 'c']);
    });

    it('degrades to priority order on a cycle instead of dropping nodes', () => {
      const gaps: GapInput[] = [
        { skillId: 'a', label: 'A', weight: 10, parentSkillId: 'b' },
        { skillId: 'b', label: 'B', weight: 20, parentSkillId: 'a' },
      ];
      const ordered = orderGapsTopologically(gaps).map((g) => g.skillId);
      expect(ordered.sort()).toEqual(['a', 'b']); // no node lost
    });
  });

  describe('buildPath', () => {
    const gaps: GapInput[] = [
      { skillId: 'parent', label: 'Accounting', weight: 10, parentSkillId: null },
      { skillId: 'child', label: 'VAT', weight: 100, parentSkillId: 'parent' },
    ];
    const ordered = orderGapsTopologically(gaps);
    const resources = new Map<string, ResourceRef[]>([
      ['parent', [{ skillId: 'parent', kind: 'course', refId: 'crs-1', title: 'Accounting 101', estMinutes: 180 }]],
    ]);

    it('standard difficulty emits course + assessment per gap', () => {
      const steps = buildPath(ordered, resources, 'standard');
      expect(steps.filter((s) => s.skillId === 'parent').map((s) => s.kind)).toEqual(['course', 'assessment']);
    });

    it('gentle = course only; intensive = course+sim+assessment', () => {
      expect(buildPath(ordered, resources, 'gentle').filter((s) => s.skillId === 'parent').map((s) => s.kind)).toEqual(['course']);
      expect(buildPath(ordered, resources, 'intensive').filter((s) => s.skillId === 'parent').map((s) => s.kind)).toEqual(['course', 'sim_scenario', 'assessment']);
    });

    it('every step orders after its prerequisite (parent gap before child gap)', () => {
      const steps = buildPath(ordered, resources, 'standard');
      const lastParent = Math.max(...steps.filter((s) => s.skillId === 'parent').map((s) => s.order));
      const firstChild = Math.min(...steps.filter((s) => s.skillId === 'child').map((s) => s.order));
      expect(firstChild).toBeGreaterThan(lastParent);
      // the child's first step points back to the parent's last step as prerequisite
      const childFirst = steps.find((s) => s.skillId === 'child' && s.order === firstChild)!;
      expect(childFirst.prerequisiteOrder).toBe(lastParent);
    });

    it('uses the resolved resource for a course step and a default otherwise', () => {
      const steps = buildPath(ordered, resources, 'standard');
      const parentCourse = steps.find((s) => s.skillId === 'parent' && s.kind === 'course')!;
      expect(parentCourse.refId).toBe('crs-1');
      expect(parentCourse.estMinutes).toBe(180);
      const childCourse = steps.find((s) => s.skillId === 'child' && s.kind === 'course')!;
      expect(childCourse.refId).toBeNull(); // no resource → default
      expect(childCourse.estMinutes).toBe(120);
    });

    it('totalMinutes sums step estimates', () => {
      const steps = buildPath(ordered, resources, 'gentle');
      expect(totalMinutes(steps)).toBe(180 + 120); // parent course (180) + child default course (120)
    });
  });
});
