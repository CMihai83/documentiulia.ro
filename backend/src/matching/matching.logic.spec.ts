import {
  analyzeMatch,
  calculateCandidateSimilarity,
  calculateFreelancerSimilarity,
  calculateMatchBreakdown,
  calculateOverallMatch,
  calculateSkillsMatch,
  getSkillLevelScore,
  scoreCandidateToJob,
  skillMatches,
} from './matching.logic';

describe('matching.logic (F-3)', () => {
  describe('skillMatches (synonym-aware)', () => {
    it('matches exact names case-insensitively', () => {
      expect(skillMatches('React', 'react')).toBe(true);
    });
    it('matches synonyms (js ↔ javascript, k8s ↔ kubernetes)', () => {
      expect(skillMatches('js', 'JavaScript')).toBe(true);
      expect(skillMatches('k8s', 'kubernetes')).toBe(true);
    });
    it('rejects unrelated skills', () => {
      expect(skillMatches('python', 'react')).toBe(false);
    });
  });

  describe('ATS scoreCandidateToJob — weights 40/30/15/15', () => {
    const job = {
      id: 'job-1',
      location: 'Bucharest',
      experienceLevel: 'MID', // requires 3 years
      skills: [{ name: 'typescript', level: 'REQUIRED' }],
    };
    const candidate = {
      id: 'cand-1',
      location: 'Bucharest, Romania',
      yearsOfExperience: 5,
      skills: [{ name: 'typescript', level: 'EXPERT', yearsOfExperience: 5, verified: true }],
      education: [{ degree: 'Master of Science' }],
      languages: [{ name: 'Romanian', level: 'NATIVE' }],
    };

    it('computes the hand-calculated weighted score exactly', () => {
      // skills: EXPERT(100)/REQUIRED(75) = 1.333 -> capped 100; required-only => 100*0.7 + 75*0.3 (no preferred -> 75) = 92.5 -> 93
      // experience: 5 >= 3 -> 80 + 2*5 = 90
      // education: master -> 100
      // culture: 70 + 15 (location) + 10 (Romanian) = 95
      // overall = round(93*0.4 + 90*0.3 + 100*0.15 + 95*0.15) = round(37.2+27+15+14.25) = round(93.45) = 93
      const r = scoreCandidateToJob(candidate, job);
      expect(r.breakdown.skills).toBe(93);
      expect(r.breakdown.experience).toBe(90);
      expect(r.breakdown.education).toBe(100);
      expect(r.breakdown.culture).toBe(95);
      expect(r.overallScore).toBe(93);
      expect(r.recommendation).toContain('Strong Candidate');
    });

    it('no job skills -> neutral 75 skill score', () => {
      const r = scoreCandidateToJob(candidate, { ...job, skills: [] });
      expect(r.breakdown.skills).toBe(75);
    });

    it('missing skills + low experience -> gaps and weak recommendation', () => {
      const weak = {
        ...candidate,
        yearsOfExperience: 0,
        skills: [],
        education: [],
        languages: [],
        location: undefined,
      };
      const r = scoreCandidateToJob(weak, job);
      expect(r.breakdown.skills).toBe(23); // 0*0.7 + 75*0.3 = 22.5 -> 23
      expect(r.breakdown.experience).toBe(20); // 80 - 3*20
      expect(r.breakdown.education).toBe(50);
      expect(r.gaps.length).toBeGreaterThan(0);
    });

    it('calculateSkillsMatch reports per-skill detail', () => {
      const matches = calculateSkillsMatch(candidate, job);
      expect(matches).toHaveLength(1);
      expect(matches[0]).toMatchObject({ skill: 'typescript', required: true, candidateLevel: 'EXPERT', match: 100 });
    });
  });

  describe('candidate similarity', () => {
    it('identical skills + experience -> 1.0', () => {
      const c = { skills: [{ name: 'a', level: 'EXPERT', yearsOfExperience: 3, verified: false }], yearsOfExperience: 5 };
      expect(calculateCandidateSimilarity(c, { ...c })).toBeCloseTo(1.0);
    });
    it('disjoint skills, 10y apart -> 0', () => {
      const a = { skills: [{ name: 'a', level: 'EXPERT', yearsOfExperience: 3, verified: false }], yearsOfExperience: 0 };
      const b = { skills: [{ name: 'b', level: 'EXPERT', yearsOfExperience: 3, verified: false }], yearsOfExperience: 10 };
      expect(calculateCandidateSimilarity(a, b)).toBe(0);
    });
  });

  describe('freelancer getSkillLevelScore', () => {
    it('meets or exceeds -> 100', () => {
      expect(getSkillLevelScore('EXPERT', 'ADVANCED')).toBe(100);
      expect(getSkillLevelScore('ADVANCED', 'ADVANCED')).toBe(100);
    });
    it('one below -> 70', () => {
      expect(getSkillLevelScore('INTERMEDIATE', 'ADVANCED')).toBe(70);
    });
    it('two below -> 40', () => {
      expect(getSkillLevelScore('BEGINNER', 'ADVANCED')).toBe(40);
    });
  });

  describe('freelancer calculateMatchBreakdown + overall — weights 40/20/15/10/10/5', () => {
    const project = {
      requiredSkills: [{ skillName: 'react', minLevel: 'ADVANCED', required: true }],
      budgetType: 'HOURLY',
      budgetMin: 20,
      budgetMax: 50,
      locationType: 'REMOTE',
      country: 'RO',
      experienceLevel: 'SENIOR', // level 3
      contractTypes: ['PFA'],
    };
    const freelancer = {
      skills: [{ name: 'React', level: 'EXPERT', yearsExperience: 8, verified: true }],
      hourlyRate: 40,
      availability: 'AVAILABLE',
      country: 'RO',
      contractType: 'PFA',
      remoteOnly: true,
      willingToTravel: false,
      averageRating: 5,
      totalReviews: 10,
      completedProjects: 25,
      onTimeDelivery: 98,
      responseTime: 2,
      identityVerified: true,
    };

    it('computes the hand-calculated breakdown exactly', () => {
      // skill: required w=2, max=200; level EXPERT>=ADVANCED ->100*2=200 + verified 10*2=20 -> 220/200 = 110%
      // experience: avg 8y -> level 4; required SENIOR=3 -> min(100, 4/3*100)=100
      // rate: 40 in [20,50] -> 100
      // availability AVAILABLE -> 100; location REMOTE + remoteOnly -> 100 (contract matches)
      // rating: (5/5)*100 = 100
      const b = calculateMatchBreakdown(freelancer, project);
      expect(b.skillMatch).toBeCloseTo(110);
      expect(b.experienceMatch).toBe(100);
      expect(b.rateMatch).toBe(100);
      expect(b.availabilityMatch).toBe(100);
      expect(b.locationMatch).toBe(100);
      expect(b.ratingMatch).toBe(100);
      // overall = round(110*.4 + 100*.2 + 100*.15 + 100*.1 + 100*.1 + 100*.05) = round(44+55) = 99... compute: 44+20+15+10+10+5 = 104
      expect(calculateOverallMatch(b)).toBe(104);
    });

    it('rate above budget degrades linearly; contract mismatch halves location', () => {
      const pricey = { ...freelancer, hourlyRate: 75, contractType: 'SRL' };
      const b = calculateMatchBreakdown(pricey, project);
      // rate: 100 - ((75-50)/50)*100 = 50
      expect(b.rateMatch).toBe(50);
      // location: remoteOnly 100 * 0.5 (contract mismatch) = 50
      expect(b.locationMatch).toBe(50);
    });

    it('no reviews -> neutral 50 rating; ONSITE cross-country without travel -> 0 location', () => {
      const newcomer = {
        ...freelancer, totalReviews: 0, averageRating: 0, country: 'DE', willingToTravel: false,
      };
      const b = calculateMatchBreakdown(newcomer, { ...project, locationType: 'ONSITE' });
      expect(b.ratingMatch).toBe(50);
      expect(b.locationMatch).toBe(0);
    });

    it('no required skills -> neutral 50 skill match', () => {
      const b = calculateMatchBreakdown(freelancer, { ...project, requiredSkills: [] });
      expect(b.skillMatch).toBe(50);
    });

    it('analyzeMatch surfaces highlights and concerns', () => {
      const b = calculateMatchBreakdown(freelancer, project);
      const { highlights, concerns } = analyzeMatch(freelancer, project, b);
      expect(highlights).toEqual(expect.arrayContaining([
        'Excellent skill match - has all required skills',
        '1 verified skill(s)',
        'Fast responder (< 4 hours)',
      ]));
      expect(concerns).toHaveLength(0);

      const risky = { ...freelancer, availability: 'BUSY', identityVerified: false, totalReviews: 0, onTimeDelivery: 60 };
      const rb = calculateMatchBreakdown(risky, project);
      const ra = analyzeMatch(risky, project, rb);
      expect(ra.concerns).toEqual(expect.arrayContaining([
        'Currently busy - may have limited availability',
        'No reviews yet - new to platform',
        'Identity not verified',
      ]));
    });
  });

  describe('freelancer similarity', () => {
    it('full overlap -> 1, none -> 0', () => {
      expect(calculateFreelancerSimilarity([{ name: 'a' }], [{ name: 'A' }])).toBe(1);
      expect(calculateFreelancerSimilarity([{ name: 'a' }], [{ name: 'b' }])).toBe(0);
    });
  });
});
