/**
 * EXP-10 — pure, deterministic reputation scoring (research 06 §B.5).
 *
 * Blend (each component normalised to [0,1]):
 *   40% skills      — avg of credibility(evidenceTier) × proficiency/5
 *   25% credentials — min(1, activeCredentials / 5)
 *   20% reviews     — avg peer-review scorePct / 100
 *   15% simulator   — avg scored-run composite / 100
 *
 * Credibility ladder (research 06 §B.4): self_declared 0.2 < course 0.5 <
 * assessed 0.8 (quiz 0.7 / sim 0.9 both persist as `assessed`; the evidence
 * entry records which kind) < verified 1.0.
 */

export const TIER_CREDIBILITY: Record<string, number> = {
  self_declared: 0.2,
  course: 0.5,
  assessed: 0.8,
  verified: 1.0,
};

export interface ReputationInputs {
  skills: { evidenceTier: string; proficiency: number }[];
  activeCredentials: number;
  peerReviewScores: number[]; // 0–100 each
  simComposites: number[]; // 0–100 each, scored runs only
}

export interface ReputationBreakdown {
  skills: number;
  credentials: number;
  reviews: number;
  simulator: number;
  reputation: number; // 0–100, 1dp
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function computeReputation(input: ReputationInputs): ReputationBreakdown {
  const skills = clamp01(
    avg(input.skills.map((s) => (TIER_CREDIBILITY[s.evidenceTier] ?? 0) * clamp01(s.proficiency / 5))),
  );
  const credentials = clamp01(input.activeCredentials / 5);
  const reviews = clamp01(avg(input.peerReviewScores) / 100);
  const simulator = clamp01(avg(input.simComposites) / 100);
  const reputation = Math.round((0.4 * skills + 0.25 * credentials + 0.2 * reviews + 0.15 * simulator) * 1000) / 10;
  return {
    skills: Math.round(skills * 1000) / 1000,
    credentials: Math.round(credentials * 1000) / 1000,
    reviews: Math.round(reviews * 1000) / 1000,
    simulator: Math.round(simulator * 1000) / 1000,
    reputation,
  };
}
