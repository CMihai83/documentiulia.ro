import { Injectable } from '@nestjs/common';

/**
 * GI-AI-1 — pseudonymises Romanian personal data in text before it leaves to a
 * third-country LLM (xAI/US), and re-hydrates the model's response so the user
 * still sees real values. Reversible per request only; the map is never persisted.
 *
 * Detects: CNP (with checksum), IBAN, email, RO phone numbers.
 * Limitation: does NOT detect free-text person names or addresses (name matching
 * is too noisy to be safe) — pair with xAI Zero-Data-Retention as defence in depth.
 */

export interface RedactionResult {
  /** Text with PII replaced by stable placeholders like [CNP_1]. */
  text: string;
  /** placeholder -> original value, for re-hydration. Do not persist. */
  map: Record<string, string>;
  /** counts per category, for telemetry (no values). */
  counts: Record<string, number>;
}

@Injectable()
export class PiiRedactionService {
  /** RO CNP: 13 digits, control-digit checksum (constant 279146358279). */
  isValidCnp(cnp: string): boolean {
    if (!/^\d{13}$/.test(cnp)) return false;
    const s = cnp.slice(1, 7); // YYMMDD
    const mm = parseInt(s.slice(2, 4), 10);
    const dd = parseInt(s.slice(4, 6), 10);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return false;
    const first = cnp[0];
    if (!'12345678'.includes(first)) return false; // sex/century marker 1-8
    const key = '279146358279';
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += parseInt(cnp[i], 10) * parseInt(key[i], 10);
    let control = sum % 11;
    if (control === 10) control = 1;
    return control === parseInt(cnp[12], 10);
  }

  private readonly patterns: { cat: string; re: RegExp; validate?: (m: string) => boolean }[] = [
    // CNP: bounded by non-digits, checksum-validated to avoid eating invoice numbers etc.
    { cat: 'CNP', re: /\b\d{13}\b/g, validate: (m) => this.isValidCnp(m) },
    // IBAN: RO + general (letters+digits, 15-34 chars), tolerate spaces
    { cat: 'IBAN', re: /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]){11,30}\b/g, validate: (m) => m.replace(/\s/g, '').length >= 15 },
    { cat: 'EMAIL', re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
    // RO phone: +40 / 0040 / 0 followed by 9 digits (mobile 07..), tolerant of spaces/dots/dashes
    { cat: 'PHONE', re: /(?:\+?40|0040|0)(?:[ .-]?\d){9}\b/g, validate: (m) => m.replace(/\D/g, '').length >= 10 },
  ];

  redact(input: string): RedactionResult {
    if (!input) return { text: input ?? '', map: {}, counts: {} };
    const map: Record<string, string> = {};
    const seen: Record<string, string> = {}; // original -> placeholder (stable within a request)
    const counts: Record<string, number> = {};
    let text = input;

    for (const { cat, re, validate } of this.patterns) {
      text = text.replace(re, (match) => {
        if (validate && !validate(match)) return match;
        // reuse a placeholder for a repeated value
        if (seen[match]) return seen[match];
        counts[cat] = (counts[cat] || 0) + 1;
        const placeholder = `[${cat}_${counts[cat]}]`;
        seen[match] = placeholder;
        map[placeholder] = match;
        return placeholder;
      });
    }
    return { text, map, counts };
  }

  /** Swap placeholders back to originals in the LLM response. */
  rehydrate(text: string, map: Record<string, string>): string {
    if (!text) return text;
    let out = text;
    for (const [placeholder, original] of Object.entries(map)) {
      out = out.split(placeholder).join(original);
    }
    return out;
  }

  /** Whether any PII was found (used to force ZDR-only sends). */
  hasPii(counts: Record<string, number>): boolean {
    return Object.values(counts).some((n) => n > 0);
  }
}
