/**
 * S-57 AI-1 — pure, deterministic extraction + diff for the funds-catalog
 * auto-refresh. NO LLM: regex/keyword heuristics only, so identical input
 * always yields identical output (and an identical content hash).
 *
 * Proposals are conservative — only three fields are ever suggested:
 *   status (open/closed keyword hints), closesAt (deadline dates),
 *   ceilingEur (explicit EUR figures). NOTHING is applied without a human
 *   approving the revision.
 */
import { createHash } from 'crypto';

export interface ExtractedFacts {
  statusHint: 'open' | 'closed' | null;
  deadline: string | null; // ISO date (yyyy-mm-dd)
  ceilingEur: number | null;
  excerpt: string; // short text around the first signal, for the reviewer
}

export interface ProposedChange {
  field: 'status' | 'closesAt' | 'ceilingEur';
  old: any;
  new: any;
}

const CLOSED_RE = /apel\s+închis|închis|inchis|closed|suspendat|buget\s+epuizat|sesiune\s+încheiat/i;
const OPEN_RE = /apel\s+deschis|deschis|open|activ|în\s+desfășurare|in\s+desfasurare/i;

/** Strip tags/scripts → plain text (deterministic, whitespace-normalised). */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseDates(text: string): string[] {
  const out: string[] = [];
  // dd.mm.yyyy / dd/mm/yyyy
  for (const m of text.matchAll(/\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/g)) {
    const [, d, mo, y] = m;
    const yy = Number(y), mm = Number(mo), dd = Number(d);
    if (yy >= 2024 && yy <= 2035 && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      out.push(`${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`);
    }
  }
  // ISO yyyy-mm-dd
  for (const m of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) {
    const yy = Number(m[1]);
    if (yy >= 2024 && yy <= 2035) out.push(m[0]);
  }
  return out.sort();
}

function parseCeilingEur(text: string): number | null {
  const candidates: number[] = [];
  // "X milioane EUR/euro" (also mil.)
  for (const m of text.matchAll(/([\d][\d.,]*)\s*(?:mil\.?|milioane)\s*(?:de\s*)?(?:eur\b|euro|€)/gi)) {
    const n = Number(m[1].replace(/\./g, '').replace(',', '.'));
    if (Number.isFinite(n) && n > 0) candidates.push(n * 1_000_000);
  }
  // plain "X EUR/euro" figures ≥ 10.000 (ceiling-sized only)
  for (const m of text.matchAll(/([\d]{1,3}(?:[.,][\d]{3})+|[\d]{5,})\s*(?:eur\b|euro|€)/gi)) {
    const n = Number(m[1].replace(/[.,]/g, ''));
    if (Number.isFinite(n) && n >= 10_000) candidates.push(n);
  }
  return candidates.length ? Math.max(...candidates) : null;
}

export function extractFacts(html: string): ExtractedFacts {
  const text = htmlToText(html);
  const closed = CLOSED_RE.exec(text);
  const open = OPEN_RE.exec(text);
  // closed wins over open (a closed call often still says "apel" somewhere)
  const statusHint: ExtractedFacts['statusHint'] = closed ? 'closed' : open ? 'open' : null;
  const dates = parseDates(text);
  const deadline = dates.length ? dates[dates.length - 1] : null; // latest date on the page
  const ceilingEur = parseCeilingEur(text);
  const signal = closed ?? open;
  const at = signal ? Math.max(0, (signal.index ?? 0) - 60) : 0;
  const excerpt = text.slice(at, at + 300);
  return { statusHint, deadline, ceilingEur, excerpt };
}

/** Stable hash of the extracted facts — idempotency key per (program, content). */
export function contentHashOf(facts: ExtractedFacts): string {
  const stable = JSON.stringify({ s: facts.statusHint, d: facts.deadline, c: facts.ceilingEur });
  return createHash('sha256').update(stable).digest('hex');
}

export interface ProgramSnapshot {
  status: string;
  closesAt: Date | string | null;
  ceilingEur: number | null;
}

const isoDay = (d: Date | string | null): string | null => {
  if (!d) return null;
  const dt = typeof d === 'string' ? new Date(d) : d;
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10);
};

export function diffProgram(program: ProgramSnapshot, facts: ExtractedFacts): ProposedChange[] {
  const changes: ProposedChange[] = [];
  if (facts.statusHint && facts.statusHint !== program.status) {
    changes.push({ field: 'status', old: program.status, new: facts.statusHint });
  }
  const currentDay = isoDay(program.closesAt);
  if (facts.deadline && facts.deadline !== currentDay) {
    changes.push({ field: 'closesAt', old: currentDay, new: facts.deadline });
  }
  if (
    facts.ceilingEur != null &&
    (program.ceilingEur == null || Math.abs(facts.ceilingEur - program.ceilingEur) / Math.max(1, program.ceilingEur) > 0.01)
  ) {
    changes.push({ field: 'ceilingEur', old: program.ceilingEur, new: facts.ceilingEur });
  }
  return changes;
}
