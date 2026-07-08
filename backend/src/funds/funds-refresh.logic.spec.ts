import { contentHashOf, diffProgram, extractFacts, htmlToText } from './funds-refresh.logic';

describe('S-57 AI-1 funds-refresh.logic', () => {
  const CLOSED_PAGE = `<html><body><h1>Program X</h1>
    <p>Apel închis din 15.03.2026. Buget total 25 milioane EUR.</p>
    <script>var x=1;</script></body></html>`;
  const OPEN_PAGE = `<html><body><p>Apel deschis. Termen limită: 2026-09-30. Plafon 200.000 EUR.</p></body></html>`;

  it('detects closed status (closed wins over stray "apel") + latest date + ceiling in millions', () => {
    const f = extractFacts(CLOSED_PAGE);
    expect(f.statusHint).toBe('closed');
    expect(f.deadline).toBe('2026-03-15');
    expect(f.ceilingEur).toBe(25_000_000);
    expect(f.excerpt).toContain('Apel închis');
  });

  it('detects open status, ISO dates and plain EUR ceilings', () => {
    const f = extractFacts(OPEN_PAGE);
    expect(f.statusHint).toBe('open');
    expect(f.deadline).toBe('2026-09-30');
    expect(f.ceilingEur).toBe(200_000);
  });

  it('content hash is stable for identical input and differs for different facts', () => {
    expect(contentHashOf(extractFacts(CLOSED_PAGE))).toBe(contentHashOf(extractFacts(CLOSED_PAGE)));
    expect(contentHashOf(extractFacts(CLOSED_PAGE))).not.toBe(contentHashOf(extractFacts(OPEN_PAGE)));
  });

  it('diff proposes only real differences; identical state → no changes', () => {
    const facts = extractFacts(OPEN_PAGE);
    const changed = diffProgram({ status: 'closed', closesAt: '2026-06-01', ceilingEur: 100_000 }, facts);
    expect(changed.map((c) => c.field).sort()).toEqual(['ceilingEur', 'closesAt', 'status']);
    const same = diffProgram({ status: 'open', closesAt: '2026-09-30', ceilingEur: 200_000 }, facts);
    expect(same).toEqual([]);
  });

  it('ceiling within 1% tolerance is NOT proposed (noise guard)', () => {
    const facts = extractFacts(OPEN_PAGE); // 200_000
    const changes = diffProgram({ status: 'open', closesAt: '2026-09-30', ceilingEur: 199_500 }, facts);
    expect(changes).toEqual([]);
  });

  it('htmlToText strips scripts/tags deterministically', () => {
    expect(htmlToText('<p>a</p><script>bad()</script><b> b</b>')).toBe('a b');
  });

  it('no signals → null hints, no crash', () => {
    const f = extractFacts('<html><body>Lorem ipsum</body></html>');
    expect(f.statusHint).toBeNull();
    expect(f.deadline).toBeNull();
    expect(f.ceilingEur).toBeNull();
  });
});
