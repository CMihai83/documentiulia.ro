/**
 * F-3 — shared matching math, extracted verbatim from ats.service.ts and
 * freelancer.service.ts so both domains score through ONE engine.
 * Pure and dependency-free (like controlling.math.ts) so it unit-tests in isolation.
 *
 * Weights are contract: ATS = skills 40 / experience 30 / education 15 / culture 15;
 * Freelancer = skill 40 (required ×2 + verified bonus) / experience 20 / rate 15 /
 * availability 10 / location 10 / rating 5. Do not change without a product decision.
 */

// ===== structural input types (both services' interfaces satisfy these) =====

export interface AtsJobLike {
  id: string;
  location: string;
  experienceLevel: string; // ENTRY|JUNIOR|MID|SENIOR|LEAD|EXECUTIVE
  skills: { name: string; level: string; yearsRequired?: number }[]; // level: REQUIRED|PREFERRED|NICE_TO_HAVE
}

export interface AtsCandidateLike {
  id: string;
  location?: string;
  yearsOfExperience: number;
  skills: { name: string; level: string; yearsOfExperience: number; verified: boolean }[];
  education: { degree: string }[];
  languages: { name: string; level: string }[];
}

export interface AtsSkillMatch {
  skill: string;
  required: boolean;
  candidateLevel: string;
  requiredLevel: string;
  match: number; // 0-100
}

export interface AtsMatchResult {
  candidateId: string;
  jobId: string;
  overallScore: number;
  breakdown: { skills: number; experience: number; education: number; culture: number };
  strengths: string[];
  gaps: string[];
  recommendation: string;
  confidence: number;
}

export interface FreelancerLike {
  skills: { name: string; level: string; yearsExperience: number; verified: boolean }[];
  hourlyRate: number;
  availability: string; // AVAILABLE|PARTIALLY_AVAILABLE|BUSY|ON_VACATION|NOT_AVAILABLE
  country: string;
  contractType: string;
  remoteOnly: boolean;
  willingToTravel: boolean;
  averageRating: number;
  totalReviews: number;
  completedProjects: number;
  onTimeDelivery: number;
  responseTime: number;
  identityVerified: boolean;
}

export interface ProjectLike {
  requiredSkills: { skillName: string; minLevel: string; required: boolean }[];
  budgetType: string; // FIXED|HOURLY|MILESTONE
  budgetMin: number;
  budgetMax: number;
  locationType: string; // REMOTE|ONSITE|HYBRID
  country: string;
  experienceLevel: string; // ENTRY|INTERMEDIATE|SENIOR|EXPERT
  contractTypes: string[];
}

export interface FreelancerMatchBreakdown {
  skillMatch: number;
  experienceMatch: number;
  rateMatch: number;
  availabilityMatch: number;
  locationMatch: number;
  ratingMatch: number;
}

// ===== shared skill-synonym dictionary (from ats.service.ts) =====

export const SKILL_SYNONYMS: Record<string, string[]> = {
  'javascript': ['js', 'ecmascript', 'es6', 'es2015'],
  'typescript': ['ts'],
  'react': ['reactjs', 'react.js'],
  'node': ['nodejs', 'node.js'],
  'python': ['py', 'python3'],
  'sql': ['mysql', 'postgresql', 'postgres', 'mssql', 'oracle'],
  'aws': ['amazon web services', 'amazon cloud'],
  'gcp': ['google cloud', 'google cloud platform'],
  'azure': ['microsoft azure', 'azure cloud'],
  'docker': ['containerization', 'containers'],
  'kubernetes': ['k8s', 'container orchestration'],
  'agile': ['scrum', 'kanban', 'sprint'],
  'ci/cd': ['continuous integration', 'continuous deployment', 'devops'],
};

export function skillMatches(skill1: string, skill2: string): boolean {
  const s1 = skill1.toLowerCase();
  const s2 = skill2.toLowerCase();
  if (s1 === s2) return true;
  for (const [main, synonyms] of Object.entries(SKILL_SYNONYMS)) {
    const allVariants = [main, ...synonyms].map(v => v.toLowerCase());
    if (allVariants.includes(s1) && allVariants.includes(s2)) return true;
  }
  return false;
}

// ===== ATS candidate ↔ job scoring (verbatim from ats.service.ts) =====

function candidateLevelScore(level: string): number {
  const scores: Record<string, number> = { BEGINNER: 25, INTERMEDIATE: 50, ADVANCED: 75, EXPERT: 100 };
  return scores[level] || 0;
}

function requiredLevelScore(level: string): number {
  const scores: Record<string, number> = { REQUIRED: 75, PREFERRED: 50, NICE_TO_HAVE: 25 };
  return scores[level] || 50;
}

export function calculateSkillsMatch(candidate: AtsCandidateLike, job: AtsJobLike): AtsSkillMatch[] {
  return job.skills.map(requiredSkill => {
    const candidateSkill = candidate.skills.find(cs => skillMatches(cs.name, requiredSkill.name));
    const match = candidateSkill
      ? candidateLevelScore(candidateSkill.level) / requiredLevelScore(requiredSkill.level)
      : 0;
    return {
      skill: requiredSkill.name,
      required: requiredSkill.level === 'REQUIRED',
      candidateLevel: candidateSkill?.level || 'NONE',
      requiredLevel: requiredSkill.level,
      match: Math.min(100, Math.round(match * 100)),
    };
  });
}

function calculateSkillsScore(candidate: AtsCandidateLike, job: AtsJobLike): number {
  if (job.skills.length === 0) return 75;
  const matches = calculateSkillsMatch(candidate, job);
  const requiredSkills = matches.filter(m => m.required);
  const preferredSkills = matches.filter(m => !m.required);
  const requiredScore = requiredSkills.length > 0
    ? requiredSkills.reduce((sum, m) => sum + m.match, 0) / requiredSkills.length
    : 100;
  const preferredScore = preferredSkills.length > 0
    ? preferredSkills.reduce((sum, m) => sum + m.match, 0) / preferredSkills.length
    : 75;
  return Math.round(requiredScore * 0.7 + preferredScore * 0.3);
}

function calculateExperienceScore(candidate: AtsCandidateLike, job: AtsJobLike): number {
  const levelRequirements: Record<string, number> = {
    ENTRY: 0, JUNIOR: 1, MID: 3, SENIOR: 5, LEAD: 8, EXECUTIVE: 12,
  };
  const requiredYears = levelRequirements[job.experienceLevel] ?? 3;
  const candidateYears = candidate.yearsOfExperience;
  if (candidateYears >= requiredYears) {
    return Math.min(100, 80 + (candidateYears - requiredYears) * 5);
  }
  const deficit = requiredYears - candidateYears;
  return Math.max(0, 80 - deficit * 20);
}

function calculateEducationScore(candidate: AtsCandidateLike): number {
  if (candidate.education.length === 0) return 50;
  const degrees = candidate.education.map(e => e.degree.toLowerCase());
  if (degrees.some(d => d.includes('master') || d.includes('phd') || d.includes('doctorat'))) return 100;
  if (degrees.some(d => d.includes('bachelor') || d.includes('licență') || d.includes('inginer'))) return 85;
  return 70;
}

function estimateCultureFit(candidate: AtsCandidateLike, job: AtsJobLike): number {
  let score = 70;
  if (candidate.location && job.location) {
    if (candidate.location.toLowerCase().includes(job.location.toLowerCase())) score += 15;
  }
  if (candidate.languages.some(l => l.name.toLowerCase() === 'romanian' || l.name.toLowerCase() === 'română')) {
    score += 10;
  }
  return Math.min(100, score);
}

/** ATS weighted score: skills 40% / experience 30% / education 15% / culture 15%. */
export function scoreCandidateToJob(candidate: AtsCandidateLike, job: AtsJobLike): AtsMatchResult {
  const skillsScore = calculateSkillsScore(candidate, job);
  const experienceScore = calculateExperienceScore(candidate, job);
  const educationScore = calculateEducationScore(candidate);
  const cultureScore = estimateCultureFit(candidate, job);

  const overallScore = Math.round(
    skillsScore * 0.40 + experienceScore * 0.30 + educationScore * 0.15 + cultureScore * 0.15,
  );

  const strengths: string[] = [];
  const gaps: string[] = [];
  if (skillsScore >= 80) strengths.push('Strong skills match');
  else if (skillsScore < 50) gaps.push('Skills gap identified');
  if (experienceScore >= 80) strengths.push('Excellent experience level');
  else if (experienceScore < 50) gaps.push('May need more experience');
  if (educationScore >= 80) strengths.push('Education aligns well');

  let recommendation = '';
  if (overallScore >= 85) recommendation = 'Strong Candidate - Recommend immediate interview';
  else if (overallScore >= 70) recommendation = 'Good Candidate - Consider for phone screen';
  else if (overallScore >= 50) recommendation = 'Potential Candidate - Review manually';
  else recommendation = 'Weak Match - May not meet requirements';

  return {
    candidateId: candidate.id,
    jobId: job.id,
    overallScore,
    breakdown: { skills: skillsScore, experience: experienceScore, education: educationScore, culture: cultureScore },
    strengths,
    gaps,
    recommendation,
    confidence: 0.85,
  };
}

/** Jaccard skill overlap ×0.7 + experience proximity ×0.3 (from ats.service.ts). */
export function calculateCandidateSimilarity(
  c1: Pick<AtsCandidateLike, 'skills' | 'yearsOfExperience'>,
  c2: Pick<AtsCandidateLike, 'skills' | 'yearsOfExperience'>,
): number {
  const skills1 = new Set(c1.skills.map(s => s.name.toLowerCase()));
  const skills2 = new Set(c2.skills.map(s => s.name.toLowerCase()));
  const intersection = new Set([...skills1].filter(s => skills2.has(s)));
  const union = new Set([...skills1, ...skills2]);
  const skillSimilarity = union.size > 0 ? intersection.size / union.size : 0;
  const expDiff = Math.abs(c1.yearsOfExperience - c2.yearsOfExperience);
  const expSimilarity = Math.max(0, 1 - expDiff / 10);
  return skillSimilarity * 0.7 + expSimilarity * 0.3;
}

// ===== Freelancer ↔ project scoring (verbatim from freelancer.service.ts) =====

export function getSkillLevelScore(freelancerLevel: string, requiredLevel: string): number {
  const levels: Record<string, number> = { BEGINNER: 1, INTERMEDIATE: 2, ADVANCED: 3, EXPERT: 4, MASTER: 5 };
  const fLevel = levels[freelancerLevel];
  const rLevel = levels[requiredLevel];
  if (fLevel >= rLevel) return 100;
  if (fLevel === rLevel - 1) return 70;
  return Math.max(0, 100 - (rLevel - fLevel) * 30);
}

export function calculateMatchBreakdown(freelancer: FreelancerLike, project: ProjectLike): FreelancerMatchBreakdown {
  // Skill Match (40% weight) — required skills weigh ×2, verified skills earn a +10 bonus
  const requiredSkills = project.requiredSkills;
  let skillPoints = 0;
  let maxSkillPoints = 0;
  for (const required of requiredSkills) {
    const weight = required.required ? 2 : 1;
    maxSkillPoints += weight * 100;
    const freelancerSkill = freelancer.skills.find(
      s => s.name.toLowerCase() === required.skillName.toLowerCase(),
    );
    if (freelancerSkill) {
      const levelScore = getSkillLevelScore(freelancerSkill.level, required.minLevel);
      skillPoints += weight * levelScore;
      if (freelancerSkill.verified) skillPoints += weight * 10; // Bonus for verified
    }
  }
  const skillMatch = maxSkillPoints > 0 ? (skillPoints / maxSkillPoints) * 100 : 50;

  // Experience Match (20% weight)
  const experienceMap: Record<string, number> = { ENTRY: 1, INTERMEDIATE: 2, SENIOR: 3, EXPERT: 4 };
  const requiredLevel = experienceMap[project.experienceLevel] || 2;
  const avgYearsExp = freelancer.skills.length > 0
    ? freelancer.skills.reduce((sum, s) => sum + s.yearsExperience, 0) / freelancer.skills.length
    : 0;
  const freelancerLevel = avgYearsExp < 2 ? 1 : avgYearsExp < 5 ? 2 : avgYearsExp < 8 ? 3 : 4;
  const experienceMatch = Math.min(100, (freelancerLevel / requiredLevel) * 100);

  // Rate Match (15% weight)
  let rateMatch: number;
  if (project.budgetType === 'HOURLY') {
    if (freelancer.hourlyRate <= project.budgetMax && freelancer.hourlyRate >= project.budgetMin) {
      rateMatch = 100;
    } else if (freelancer.hourlyRate < project.budgetMin) {
      rateMatch = 70; // Under budget is okay but might indicate less experience
    } else {
      rateMatch = Math.max(0, 100 - ((freelancer.hourlyRate - project.budgetMax) / project.budgetMax) * 100);
    }
  } else {
    rateMatch = 80; // Fixed projects - less relevant
  }

  // Availability Match (10% weight)
  let availabilityMatch = 50;
  if (freelancer.availability === 'AVAILABLE') availabilityMatch = 100;
  else if (freelancer.availability === 'PARTIALLY_AVAILABLE') availabilityMatch = 70;
  else if (freelancer.availability === 'BUSY') availabilityMatch = 30;

  // Location Match (10% weight)
  let locationMatch = 100;
  if (project.locationType === 'ONSITE') {
    if (freelancer.country !== project.country) {
      locationMatch = freelancer.willingToTravel ? 50 : 0;
    }
  } else if (project.locationType === 'REMOTE') {
    locationMatch = freelancer.remoteOnly ? 100 : 80;
  }
  // Contract type mismatch halves the location score
  if (!project.contractTypes.includes(freelancer.contractType)) {
    locationMatch *= 0.5;
  }

  // Rating Match (5% weight)
  const ratingMatch = freelancer.totalReviews > 0
    ? (freelancer.averageRating / 5) * 100
    : 50; // No reviews = neutral

  return { skillMatch, experienceMatch, rateMatch, availabilityMatch, locationMatch, ratingMatch };
}

/** Freelancer weighted score: skill .40 / experience .20 / rate .15 / availability .10 / location .10 / rating .05. */
export function calculateOverallMatch(breakdown: FreelancerMatchBreakdown): number {
  return Math.round(
    breakdown.skillMatch * 0.40 +
    breakdown.experienceMatch * 0.20 +
    breakdown.rateMatch * 0.15 +
    breakdown.availabilityMatch * 0.10 +
    breakdown.locationMatch * 0.10 +
    breakdown.ratingMatch * 0.05,
  );
}

export function analyzeMatch(
  freelancer: FreelancerLike,
  _project: ProjectLike,
  breakdown: FreelancerMatchBreakdown,
): { highlights: string[]; concerns: string[] } {
  const highlights: string[] = [];
  const concerns: string[] = [];

  if (breakdown.skillMatch >= 90) highlights.push('Excellent skill match - has all required skills');
  else if (breakdown.skillMatch >= 70) highlights.push('Good skill coverage');

  const verifiedCount = freelancer.skills.filter(s => s.verified).length;
  if (verifiedCount > 0) highlights.push(`${verifiedCount} verified skill(s)`);

  if (freelancer.averageRating >= 4.5 && freelancer.totalReviews >= 5) {
    highlights.push(`Highly rated (${freelancer.averageRating.toFixed(1)}/5 from ${freelancer.totalReviews} reviews)`);
  }
  if (freelancer.onTimeDelivery >= 95) highlights.push(`${freelancer.onTimeDelivery}% on-time delivery rate`);
  if (freelancer.responseTime <= 4) highlights.push('Fast responder (< 4 hours)');
  if (freelancer.completedProjects >= 20) highlights.push(`Experienced: ${freelancer.completedProjects} completed projects`);

  if (breakdown.skillMatch < 50) concerns.push('Missing several required skills');
  if (breakdown.rateMatch < 50) concerns.push('Rate significantly above budget');
  if (freelancer.availability === 'BUSY') concerns.push('Currently busy - may have limited availability');
  if (freelancer.totalReviews === 0) concerns.push('No reviews yet - new to platform');
  if (freelancer.onTimeDelivery < 80) concerns.push(`Low on-time delivery rate (${freelancer.onTimeDelivery}%)`);
  if (!freelancer.identityVerified) concerns.push('Identity not verified');

  return { highlights, concerns };
}

/** Jaccard similarity over skill names (from freelancer.service.ts findSimilarFreelancers). */
export function calculateFreelancerSimilarity(
  skillsA: { name: string }[],
  skillsB: { name: string }[],
): number {
  const a = new Set(skillsA.map(s => s.name.toLowerCase()));
  const b = new Set(skillsB.map(s => s.name.toLowerCase()));
  const intersection = [...a].filter(s => b.has(s)).length;
  const union = new Set([...a, ...b]).size;
  return union > 0 ? intersection / union : 0;
}
