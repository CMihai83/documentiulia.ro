import { QuizItem, aggregatePeerScores, grade, selectItems, stripAnswers } from './assessment.logic';

const ITEMS: QuizItem[] = [
  { id: 'a', question: 'A?', options: ['1', '2'], correct: 0 },
  { id: 'b', question: 'B?', options: ['1', '2'], correct: 1 },
  { id: 'c', question: 'C?', options: ['1', '2'], correct: 0 },
  { id: 'd', question: 'D?', options: ['1', '2'], correct: 1 },
  { id: 'e', question: 'E?', options: ['1', '2'], correct: 0 },
];

describe('EXP-7 assessment.logic', () => {
  it('selects items deterministically for a seed, differently for another', () => {
    const s1 = selectItems(ITEMS, 3, 42).map((i) => i.id);
    const s2 = selectItems(ITEMS, 3, 42).map((i) => i.id);
    const s3 = selectItems(ITEMS, 3, 777).map((i) => i.id);
    expect(s1).toEqual(s2);
    expect(s1).toHaveLength(3);
    expect(s3).not.toEqual(s1); // overwhelmingly likely for this pool
  });

  it('never serves the correct-answer field', () => {
    const served = stripAnswers(ITEMS);
    for (const it of served) expect((it as any).correct).toBeUndefined();
  });

  it('grades exactly and applies the pass threshold', () => {
    const three = ITEMS.slice(0, 3); // correct: a=0, b=1, c=0
    const full = grade(three, { a: 0, b: 1, c: 0 }, 70);
    expect(full).toEqual({ scorePct: 100, passed: true, correctCount: 3, total: 3 });
    const partial = grade(three, { a: 0, b: 0, c: 1 }, 70);
    expect(partial.scorePct).toBe(33);
    expect(partial.passed).toBe(false);
    const exact = grade(ITEMS.slice(0, 4), { a: 0, b: 1, c: 0, d: 0 }, 75);
    expect(exact.scorePct).toBe(75);
    expect(exact.passed).toBe(true);
  });

  it('empty item set grades to 0 / not passed', () => {
    expect(grade([], {})).toEqual({ scorePct: 0, passed: false, correctCount: 0, total: 0 });
  });

  it('aggregates peer scores as a rounded mean', () => {
    expect(aggregatePeerScores([80, 90, 100])).toBe(90);
    expect(aggregatePeerScores([70, 75])).toBe(73);
    expect(aggregatePeerScores([])).toBe(0);
  });
});
