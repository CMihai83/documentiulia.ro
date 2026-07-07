import { Injectable } from '@nestjs/common';
import {
  AtsCandidateLike,
  AtsJobLike,
  AtsMatchResult,
  AtsSkillMatch,
  FreelancerLike,
  FreelancerMatchBreakdown,
  ProjectLike,
  analyzeMatch,
  calculateCandidateSimilarity,
  calculateFreelancerSimilarity,
  calculateMatchBreakdown,
  calculateOverallMatch,
  calculateSkillsMatch,
  scoreCandidateToJob,
  skillMatches,
} from './matching.logic';

/**
 * F-3 — the ONE matching engine. ATS (candidate↔job) and Freelancer
 * (freelancer↔project) both score through this service; the math lives in
 * matching.logic.ts (pure, unit-tested).
 */
@Injectable()
export class MatchingService {
  /** ATS: weighted candidate↔job score (skills 40/exp 30/edu 15/culture 15). */
  scoreCandidateToJob(candidate: AtsCandidateLike, job: AtsJobLike): AtsMatchResult {
    return scoreCandidateToJob(candidate, job);
  }

  /** ATS: per-skill match detail for an application. */
  candidateSkillsMatch(candidate: AtsCandidateLike, job: AtsJobLike): AtsSkillMatch[] {
    return calculateSkillsMatch(candidate, job);
  }

  /** ATS: candidate↔candidate similarity (skills Jaccard + experience proximity). */
  candidateSimilarity(
    c1: Pick<AtsCandidateLike, 'skills' | 'yearsOfExperience'>,
    c2: Pick<AtsCandidateLike, 'skills' | 'yearsOfExperience'>,
  ): number {
    return calculateCandidateSimilarity(c1, c2);
  }

  /** Shared skill-name matcher (synonym-aware). */
  skillMatches(a: string, b: string): boolean {
    return skillMatches(a, b);
  }

  /** Freelancer: full scored match (breakdown + overall + highlights/concerns). */
  scoreFreelancerToProject(
    freelancer: FreelancerLike,
    project: ProjectLike,
  ): {
    breakdown: FreelancerMatchBreakdown;
    matchScore: number;
    highlights: string[];
    concerns: string[];
  } {
    const breakdown = calculateMatchBreakdown(freelancer, project);
    const matchScore = calculateOverallMatch(breakdown);
    const { highlights, concerns } = analyzeMatch(freelancer, project, breakdown);
    return { breakdown, matchScore, highlights, concerns };
  }

  /** Freelancer: profile↔profile similarity (skills Jaccard). */
  freelancerSimilarity(skillsA: { name: string }[], skillsB: { name: string }[]): number {
    return calculateFreelancerSimilarity(skillsA, skillsB);
  }
}
