/**
 * EXP-3 — Pure skill-gap analysis (no DB, no I/O — fully unit-testable).
 *
 * A user's proficiency vector is compared against a target occupation's required
 * skills. Each unmet requirement becomes a gap, ranked by criticality:
 *   weight = relationWeight × (requiredLevel − currentProficiency)
 * where essential requirements weigh more than optional ones. Essential gaps
 * always rank above optional gaps of the same deficit.
 */

export type SkillRelation = 'essential' | 'optional';

/** A skill requirement on the target occupation. */
export interface RequiredSkill {
  skillId: string;
  label: string;
  relation: SkillRelation;
  requiredLevel: number; // 0-5
}

/** A user's current proficiency in a skill. */
export interface CurrentSkill {
  skillId: string;
  proficiency: number; // 0-5
}

export interface SkillGap {
  skillId: string;
  label: string;
  relation: SkillRelation;
  requiredLevel: number;
  currentLevel: number;
  deficit: number; // requiredLevel − currentLevel (>0)
  weight: number; // criticality score for ranking
}

/** Essential requirements dominate optional ones regardless of deficit. */
export const RELATION_WEIGHT: Record<SkillRelation, number> = {
  essential: 10,
  optional: 3,
};

/**
 * Compute the prioritised gap list. Only requirements the user hasn't met
 * (currentLevel < requiredLevel) are returned, ranked by weight desc then
 * deficit desc then label (stable, deterministic).
 */
export function analyseGaps(required: RequiredSkill[], current: CurrentSkill[]): SkillGap[] {
  const byId = new Map<string, number>();
  for (const c of current) {
    // keep the highest proficiency if a skill appears twice
    byId.set(c.skillId, Math.max(byId.get(c.skillId) ?? 0, c.proficiency));
  }

  const gaps: SkillGap[] = [];
  for (const r of required) {
    const currentLevel = byId.get(r.skillId) ?? 0;
    const deficit = r.requiredLevel - currentLevel;
    if (deficit <= 0) continue; // requirement already met
    gaps.push({
      skillId: r.skillId,
      label: r.label,
      relation: r.relation,
      requiredLevel: r.requiredLevel,
      currentLevel,
      deficit,
      weight: RELATION_WEIGHT[r.relation] * deficit,
    });
  }

  gaps.sort(
    (a, b) =>
      b.weight - a.weight ||
      b.deficit - a.deficit ||
      a.label.localeCompare(b.label),
  );
  return gaps;
}

/** Radar-chart data: every required skill as an axis with required vs current. */
export interface RadarAxis {
  skillId: string;
  label: string;
  required: number;
  current: number;
}

export function radarData(required: RequiredSkill[], current: CurrentSkill[]): RadarAxis[] {
  const byId = new Map<string, number>();
  for (const c of current) byId.set(c.skillId, Math.max(byId.get(c.skillId) ?? 0, c.proficiency));
  return required.map((r) => ({
    skillId: r.skillId,
    label: r.label,
    required: r.requiredLevel,
    current: byId.get(r.skillId) ?? 0,
  }));
}

/** Overall readiness 0..1: share of essential requirement-levels the user has met. */
export function readiness(required: RequiredSkill[], current: CurrentSkill[]): number {
  const byId = new Map<string, number>();
  for (const c of current) byId.set(c.skillId, Math.max(byId.get(c.skillId) ?? 0, c.proficiency));
  const essential = required.filter((r) => r.relation === 'essential');
  if (essential.length === 0) return 1;
  let need = 0;
  let have = 0;
  for (const r of essential) {
    need += r.requiredLevel;
    have += Math.min(r.requiredLevel, byId.get(r.skillId) ?? 0);
  }
  return need === 0 ? 1 : Math.round((have / need) * 1000) / 1000;
}
