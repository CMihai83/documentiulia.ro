/**
 * EXP-5 — Pure mastery-path sequencing (no DB — fully unit-testable).
 *
 * Turns a ranked gap list into an ordered list of steps that RESPECT
 * PREREQUISITES: if skill B's ESCO parent is skill A and A is also a gap, A must
 * come before B. We topologically sort the gap DAG (parent → child), breaking
 * ties by gap criticality (weight desc) so the order stays priority-driven where
 * the DAG leaves freedom. A cycle (shouldn't happen in a tree) degrades to
 * priority order rather than throwing.
 */

export type StepKind = 'course' | 'sim_scenario' | 'assessment';
export type Difficulty = 'gentle' | 'standard' | 'intensive';

export interface GapInput {
  skillId: string;
  label: string;
  weight: number;
  parentSkillId?: string | null; // resolved prerequisite within the gap set
}

/** A learning resource already resolved for a skill (e.g. an LMS course). */
export interface ResourceRef {
  skillId: string;
  kind: StepKind;
  refId: string | null;
  title: string;
  estMinutes: number;
}

export interface PlannedStep {
  order: number;
  kind: StepKind;
  refId: string | null;
  skillId: string;
  title: string;
  estMinutes: number;
  prerequisiteOrder: number | null;
}

/**
 * Topologically order gaps so every prerequisite precedes its dependents.
 * Kahn's algorithm; among ready nodes we pick the highest-weight gap first.
 */
export function orderGapsTopologically(gaps: GapInput[]): GapInput[] {
  const present = new Set(gaps.map((g) => g.skillId));
  const indeg = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  const byId = new Map<string, GapInput>();
  for (const g of gaps) {
    byId.set(g.skillId, g);
    indeg.set(g.skillId, 0);
  }
  for (const g of gaps) {
    const parent = g.parentSkillId;
    if (parent && present.has(parent)) {
      indeg.set(g.skillId, (indeg.get(g.skillId) ?? 0) + 1);
      dependents.set(parent, [...(dependents.get(parent) ?? []), g.skillId]);
    }
  }

  // ready = indegree 0, ordered by weight desc then label for determinism
  const ready = gaps
    .filter((g) => (indeg.get(g.skillId) ?? 0) === 0)
    .sort((a, b) => b.weight - a.weight || a.skillId.localeCompare(b.skillId));

  const out: GapInput[] = [];
  const seen = new Set<string>();
  while (ready.length) {
    const g = ready.shift()!;
    if (seen.has(g.skillId)) continue;
    seen.add(g.skillId);
    out.push(g);
    const deps = (dependents.get(g.skillId) ?? [])
      .map((id) => byId.get(id)!)
      .filter(Boolean);
    for (const d of deps) {
      indeg.set(d.skillId, (indeg.get(d.skillId) ?? 1) - 1);
      if ((indeg.get(d.skillId) ?? 0) === 0) ready.push(d);
    }
    ready.sort((a, b) => b.weight - a.weight || a.skillId.localeCompare(b.skillId));
  }

  // any nodes left (cycle) — append in priority order, deterministic
  if (out.length < gaps.length) {
    for (const g of [...gaps].sort((a, b) => b.weight - a.weight || a.skillId.localeCompare(b.skillId))) {
      if (!seen.has(g.skillId)) {
        seen.add(g.skillId);
        out.push(g);
      }
    }
  }
  return out;
}

/** How many step kinds each skill gets, by difficulty. */
function stepsForDifficulty(difficulty: Difficulty): StepKind[] {
  switch (difficulty) {
    case 'gentle':
      return ['course'];
    case 'intensive':
      return ['course', 'sim_scenario', 'assessment'];
    case 'standard':
    default:
      return ['course', 'assessment'];
  }
}

/**
 * Build the ordered step list. Each gap (in topological order) contributes the
 * step kinds for the chosen difficulty; a step's prerequisite is the last step
 * of the previous gap, so prerequisites are always earlier in the sequence.
 */
export function buildPath(
  orderedGaps: GapInput[],
  resources: Map<string, ResourceRef[]>,
  difficulty: Difficulty = 'standard',
): PlannedStep[] {
  const kinds = stepsForDifficulty(difficulty);
  const steps: PlannedStep[] = [];
  let order = 0;
  let prevGapLastOrder: number | null = null;

  for (const gap of orderedGaps) {
    const gapResources = resources.get(gap.skillId) ?? [];
    let gapFirstOrder: number | null = null;
    for (const kind of kinds) {
      const res = gapResources.find((r) => r.kind === kind);
      const step: PlannedStep = {
        order,
        kind,
        refId: res?.refId ?? null,
        skillId: gap.skillId,
        title: res?.title ?? defaultTitle(kind, gap.label),
        estMinutes: res?.estMinutes ?? defaultMinutes(kind),
        prerequisiteOrder: gapFirstOrder === null ? prevGapLastOrder : order - 1,
      };
      steps.push(step);
      if (gapFirstOrder === null) gapFirstOrder = order;
      order += 1;
    }
    if (steps.length) prevGapLastOrder = order - 1;
  }
  return steps;
}

export function totalMinutes(steps: PlannedStep[]): number {
  return steps.reduce((s, x) => s + x.estMinutes, 0);
}

function defaultTitle(kind: StepKind, label: string): string {
  if (kind === 'course') return `Curs: ${label}`;
  if (kind === 'sim_scenario') return `Simulare practică: ${label}`;
  return `Evaluare: ${label}`;
}
function defaultMinutes(kind: StepKind): number {
  if (kind === 'course') return 120;
  if (kind === 'sim_scenario') return 45;
  return 30;
}
