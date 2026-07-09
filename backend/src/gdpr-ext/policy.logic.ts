/**
 * GE-POLICY-MVP (S-61) — RO/EN clause library (handlebars). The policy text is
 * DERIVED from the org's RoPA entries: purposes, legal bases, recipients and
 * retention flow straight through — no free-text claims the RoPA can't back.
 *
 * NOT legal advice. Auto-update-on-legal-change and lawyer-reviewed template
 * certification are flagged follow-ups (see sprint plan).
 */
import * as Handlebars from 'handlebars';
import { createHash } from 'crypto';
import { RopaEntryLike } from './ropa.logic';

export type PolicyKind = 'privacy' | 'cookie';
export type PolicyLocale = 'ro' | 'en';

export interface PolicyOrgInfo {
  name: string;
  cui?: string | null;
  email?: string | null;
  website?: string | null;
}

const DISCLAIMER: Record<PolicyLocale, string> = {
  ro: 'Acest document a fost generat automat pe baza registrului de prelucrări și nu constituie consultanță juridică.',
  en: 'This document was generated automatically from the processing register and does not constitute legal advice.',
};

export function retentionText(months: number | null | undefined, locale: PolicyLocale): string {
  if (!months || months <= 0) return locale === 'ro' ? 'pe durata necesară scopului' : 'for as long as the purpose requires';
  if (months % 12 === 0) {
    const y = months / 12;
    return locale === 'ro' ? `${y} ${y === 1 ? 'an' : 'ani'}` : `${y} ${y === 1 ? 'year' : 'years'}`;
  }
  return locale === 'ro' ? `${months} de luni` : `${months} months`;
}

const PRIVACY_TEMPLATE: Record<PolicyLocale, string> = {
  ro: `<article class="dgdpr-policy">
<h1>Politica de confidențialitate — {{org.name}}</h1>
<p><strong>Operator:</strong> {{org.name}}{{#if org.cui}} (CUI {{org.cui}}){{/if}}{{#if org.email}} · Contact: {{org.email}}{{/if}}</p>
<h2>Ce date prelucrăm și de ce</h2>
{{#each processes}}
<section>
<h3>{{processName}}</h3>
<p><strong>Scopuri:</strong> {{join purposes}}.</p>
{{#if legalBasis}}<p><strong>Temei legal:</strong> {{legalBasis}}.</p>{{/if}}
<p><strong>Categorii de date:</strong> {{join categories}}{{#if specialCategories.length}}; <strong>date cu regim special:</strong> {{join specialCategories}}{{/if}}.</p>
{{#if recipients.length}}<p><strong>Destinatari:</strong> {{join recipients}}.</p>{{/if}}
{{#if transfers.length}}<p><strong>Transferuri:</strong> {{join transfers}}.</p>{{/if}}
<p><strong>Durata de păstrare:</strong> {{retention retentionMonths}}.</p>
</section>
{{/each}}
<h2>Drepturile dumneavoastră</h2>
<p>Aveți dreptul de acces, rectificare, ștergere, restricționare, portabilitate și opoziție (Art. 15–21 GDPR), precum și dreptul de a depune o plângere la ANSPDCP (www.dataprotection.ro).</p>
<footer><em>{{disclaimer}}</em> · Versiune generată la {{generatedAt}}.</footer>
</article>`,
  en: `<article class="dgdpr-policy">
<h1>Privacy notice — {{org.name}}</h1>
<p><strong>Controller:</strong> {{org.name}}{{#if org.cui}} (CUI {{org.cui}}){{/if}}{{#if org.email}} · Contact: {{org.email}}{{/if}}</p>
<h2>What we process and why</h2>
{{#each processes}}
<section>
<h3>{{processName}}</h3>
<p><strong>Purposes:</strong> {{join purposes}}.</p>
{{#if legalBasis}}<p><strong>Legal basis:</strong> {{legalBasis}}.</p>{{/if}}
<p><strong>Data categories:</strong> {{join categories}}{{#if specialCategories.length}}; <strong>special categories:</strong> {{join specialCategories}}{{/if}}.</p>
{{#if recipients.length}}<p><strong>Recipients:</strong> {{join recipients}}.</p>{{/if}}
{{#if transfers.length}}<p><strong>Transfers:</strong> {{join transfers}}.</p>{{/if}}
<p><strong>Retention:</strong> {{retention retentionMonths}}.</p>
</section>
{{/each}}
<h2>Your rights</h2>
<p>You have the rights of access, rectification, erasure, restriction, portability and objection (Art. 15–21 GDPR), and the right to lodge a complaint with ANSPDCP (www.dataprotection.ro).</p>
<footer><em>{{disclaimer}}</em> · Generated {{generatedAt}}.</footer>
</article>`,
};

const COOKIE_TEMPLATE: Record<PolicyLocale, string> = {
  ro: `<article class="dgdpr-policy">
<h1>Politica de cookie-uri — {{org.name}}</h1>
<p>Folosim cookie-uri pe categorii: <strong>necesare</strong> (funcționarea site-ului, fără consimțământ), <strong>analitice</strong> și <strong>marketing</strong> (doar cu consimțământul dumneavoastră, prin bannerul de consimțământ).</p>
{{#if consentProcesses.length}}<h2>Prelucrări bazate pe consimțământ</h2>
{{#each consentProcesses}}<p><strong>{{processName}}</strong> — {{join purposes}}; păstrare: {{retention retentionMonths}}.</p>{{/each}}{{/if}}
<p>Vă puteți retrage consimțământul oricând din bannerul de preferințe.</p>
<footer><em>{{disclaimer}}</em> · Versiune generată la {{generatedAt}}.</footer>
</article>`,
  en: `<article class="dgdpr-policy">
<h1>Cookie policy — {{org.name}}</h1>
<p>We use cookies by category: <strong>necessary</strong> (site operation, no consent needed), <strong>analytics</strong> and <strong>marketing</strong> (only with your consent, via the consent banner).</p>
{{#if consentProcesses.length}}<h2>Consent-based processing</h2>
{{#each consentProcesses}}<p><strong>{{processName}}</strong> — {{join purposes}}; retention: {{retention retentionMonths}}.</p>{{/each}}{{/if}}
<p>You can withdraw consent at any time from the preferences banner.</p>
<footer><em>{{disclaimer}}</em> · Generated {{generatedAt}}.</footer>
</article>`,
};

function hb(locale: PolicyLocale) {
  const h = Handlebars.create();
  h.registerHelper('join', (arr: unknown) => (Array.isArray(arr) ? arr.join(', ') : ''));
  h.registerHelper('retention', (months: number) => retentionText(months, locale));
  return h;
}

export function ropaHash(entries: RopaEntryLike[]): string {
  const canonical = JSON.stringify(
    entries.map((e) => ({ ...e, specialCategories: e.specialCategories ?? [], transfers: e.transfers ?? [] })),
  );
  return createHash('sha256').update(canonical).digest('hex');
}

export interface RenderedPolicy {
  html: string;
  sourceRopaHash: string;
}

export function renderPolicy(
  kind: PolicyKind,
  locale: PolicyLocale,
  org: PolicyOrgInfo,
  entries: RopaEntryLike[],
  generatedAt: string,
): RenderedPolicy {
  const active = entries.filter((e) => (e.status ?? 'active') !== 'archived');
  const ctx = {
    org,
    disclaimer: DISCLAIMER[locale],
    generatedAt,
    processes: active,
    consentProcesses: active.filter((e) => (e.legalBasis ?? '').toLowerCase().includes('consim') || (e.legalBasis ?? '').includes('6(1)(a)')),
  };
  const tpl = kind === 'privacy' ? PRIVACY_TEMPLATE[locale] : COOKIE_TEMPLATE[locale];
  const html = hb(locale).compile(tpl)(ctx);
  return { html, sourceRopaHash: ropaHash(active) };
}

/** Line-level diff between two policy versions (added/removed lines). */
export function diffPolicies(a: string, b: string): { added: string[]; removed: string[] } {
  const la = new Set(a.split('\n').map((s) => s.trim()).filter(Boolean));
  const lb = new Set(b.split('\n').map((s) => s.trim()).filter(Boolean));
  return {
    added: [...lb].filter((l) => !la.has(l)),
    removed: [...la].filter((l) => !lb.has(l)),
  };
}
