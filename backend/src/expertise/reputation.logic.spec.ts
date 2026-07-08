import { computeReputation } from './reputation.logic';

describe('EXP-10 reputation.logic', () => {
  it('is deterministic and exact for a fixed input', () => {
    const input = {
      skills: [
        { evidenceTier: 'verified', proficiency: 5 }, // 1.0 * 1.0 = 1.0
        { evidenceTier: 'course', proficiency: 3 }, // 0.5 * 0.6 = 0.3
      ],
      activeCredentials: 2, // 0.4
      peerReviewScores: [80, 90], // 0.85
      simComposites: [70], // 0.7
    };
    const a = computeReputation(input);
    const b = computeReputation(input);
    expect(a).toEqual(b);
    // skills avg = (1.0 + 0.3)/2 = 0.65 → 0.4*0.65 + 0.25*0.4 + 0.2*0.85 + 0.15*0.7 = 0.635
    expect(a.reputation).toBe(63.5);
  });

  it('empty inputs give zero', () => {
    expect(computeReputation({ skills: [], activeCredentials: 0, peerReviewScores: [], simComposites: [] }).reputation).toBe(0);
  });

  it('higher evidence tiers outrank lower at equal proficiency', () => {
    const base = { activeCredentials: 0, peerReviewScores: [], simComposites: [] };
    const self = computeReputation({ ...base, skills: [{ evidenceTier: 'self_declared', proficiency: 5 }] });
    const course = computeReputation({ ...base, skills: [{ evidenceTier: 'course', proficiency: 5 }] });
    const assessed = computeReputation({ ...base, skills: [{ evidenceTier: 'assessed', proficiency: 5 }] });
    const verified = computeReputation({ ...base, skills: [{ evidenceTier: 'verified', proficiency: 5 }] });
    expect(self.reputation).toBeLessThan(course.reputation);
    expect(course.reputation).toBeLessThan(assessed.reputation);
    expect(assessed.reputation).toBeLessThan(verified.reputation);
  });

  it('components clamp to [0,1] (credential count and scores cannot overflow)', () => {
    const r = computeReputation({
      skills: [{ evidenceTier: 'verified', proficiency: 99 }],
      activeCredentials: 50,
      peerReviewScores: [1000],
      simComposites: [500],
    });
    expect(r.reputation).toBe(100);
  });
});
