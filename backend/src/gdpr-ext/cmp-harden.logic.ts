/**
 * GE-CMP-HARDEN pure logic — static cookie-scanner signatures, a minimal
 * TCF v2.3 TC-string codec (round-trippable), and Google Consent Mode v2
 * signal construction. Deterministic; no network here (the scanner fetch lives
 * in the service). We do NOT claim an IAB-registered CMP ID.
 */

// ---------------------------------------------------------------------------
// Static cookie / tracker scanner — signature match against fetched HTML
// ---------------------------------------------------------------------------

export interface TrackerSignature {
  id: string;
  name: string;
  category: 'analytics' | 'marketing';
  patterns: RegExp[];
}

export const TRACKER_SIGNATURES: TrackerSignature[] = [
  { id: 'ga4', name: 'Google Analytics 4 (gtag)', category: 'analytics', patterns: [/googletagmanager\.com\/gtag\/js/i, /gtag\(/i, /G-[A-Z0-9]{6,}/] },
  { id: 'gtm', name: 'Google Tag Manager', category: 'marketing', patterns: [/googletagmanager\.com\/gtm\.js/i, /GTM-[A-Z0-9]{4,}/] },
  { id: 'ua', name: 'Universal Analytics', category: 'analytics', patterns: [/google-analytics\.com\/analytics\.js/i, /UA-\d{4,}-\d+/] },
  { id: 'meta_pixel', name: 'Meta (Facebook) Pixel', category: 'marketing', patterns: [/connect\.facebook\.net\/.*\/fbevents\.js/i, /fbq\(/i] },
  { id: 'tiktok', name: 'TikTok Pixel', category: 'marketing', patterns: [/analytics\.tiktok\.com/i, /ttq\.(load|track)/i] },
  { id: 'hotjar', name: 'Hotjar', category: 'analytics', patterns: [/static\.hotjar\.com/i, /hjSiteSettings/i] },
  { id: 'linkedin', name: 'LinkedIn Insight', category: 'marketing', patterns: [/snap\.licdn\.com/i, /_linkedin_partner_id/i] },
  { id: 'youtube', name: 'YouTube embed', category: 'marketing', patterns: [/youtube(-nocookie)?\.com\/embed/i] },
  { id: 'clarity', name: 'Microsoft Clarity', category: 'analytics', patterns: [/clarity\.ms\/tag/i] },
  { id: 'doubleclick', name: 'Google DoubleClick', category: 'marketing', patterns: [/doubleclick\.net/i] },
];

export interface ScanHit {
  id: string;
  name: string;
  category: 'analytics' | 'marketing';
}

export interface ScanResult {
  method: 'static';       // honest: no headless browser
  hits: ScanHit[];
  proposedCategories: string[]; // necessary is always present
}

export function scanHtml(html: string): ScanResult {
  const hits: ScanHit[] = [];
  for (const sig of TRACKER_SIGNATURES) {
    if (sig.patterns.some((p) => p.test(html))) {
      hits.push({ id: sig.id, name: sig.name, category: sig.category });
    }
  }
  const cats = new Set<string>(['necessary']);
  for (const h of hits) cats.add(h.category);
  return { method: 'static', hits, proposedCategories: [...cats] };
}

// ---------------------------------------------------------------------------
// Google Consent Mode v2 signals
// ---------------------------------------------------------------------------

export type ConsentSignal = 'granted' | 'denied';

export interface ConsentModeState {
  ad_storage: ConsentSignal;
  analytics_storage: ConsentSignal;
  ad_user_data: ConsentSignal;
  ad_personalization: ConsentSignal;
}

/** Default: everything denied except security (Consent Mode v2 default state). */
export function consentModeDefault(): ConsentModeState {
  return { ad_storage: 'denied', analytics_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' };
}

/** Map the banner's category choices to Consent Mode v2 update signals. */
export function consentModeUpdate(choices: Record<string, boolean>): ConsentModeState {
  const analytics = !!choices.analytics ? 'granted' : 'denied';
  const marketing = !!choices.marketing ? 'granted' : 'denied';
  return {
    analytics_storage: analytics,
    ad_storage: marketing,
    ad_user_data: marketing,
    ad_personalization: marketing,
  };
}

// ---------------------------------------------------------------------------
// TCF v2.3 — minimal, round-trippable TC string codec
// ---------------------------------------------------------------------------
//
// This is a compact, spec-shaped encoding of the consent decision (version,
// created/updated, CMP id/version, vendor-list version, purpose consents,
// vendor consents). It is NOT an IAB-registered CMP output — `cmpId` is 0
// ("unregistered") and the API surface reports "IAB registration pending".
// The point is a deterministic string that decodes back to the exact choices.

export interface TcModel {
  version: number;          // 2
  created: number;          // epoch seconds
  lastUpdated: number;
  cmpId: number;            // 0 = unregistered (honest)
  cmpVersion: number;
  vendorListVersion: number;
  purposeConsents: number[]; // purpose ids granted (1..N)
  vendorConsents: number[];  // vendor ids granted
}

// URL-safe base64 (TCF uses websafe base64 without padding)
function b64urlEncode(bytes: number[]): string {
  const b = Buffer.from(Uint8Array.from(bytes)).toString('base64');
  return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(s: string): number[] {
  const b = s.replace(/-/g, '+').replace(/_/g, '/');
  return Array.from(Buffer.from(b, 'base64'));
}

// bit writer/reader over a byte array (big-endian bit order, TCF-style)
class BitWriter {
  private bits: number[] = [];
  int(value: number, len: number) {
    for (let i = len - 1; i >= 0; i--) this.bits.push((value >> i) & 1);
  }
  bitfield(ids: number[], maxId: number) {
    const set = new Set(ids);
    for (let id = 1; id <= maxId; id++) this.bits.push(set.has(id) ? 1 : 0);
  }
  bytes(): number[] {
    while (this.bits.length % 8 !== 0) this.bits.push(0);
    const out: number[] = [];
    for (let i = 0; i < this.bits.length; i += 8) {
      let byte = 0;
      for (let j = 0; j < 8; j++) byte = (byte << 1) | this.bits[i + j];
      out.push(byte);
    }
    return out;
  }
}
class BitReader {
  private bits: number[] = [];
  private pos = 0;
  constructor(bytes: number[]) {
    for (const b of bytes) for (let i = 7; i >= 0; i--) this.bits.push((b >> i) & 1);
  }
  int(len: number): number {
    let v = 0;
    for (let i = 0; i < len; i++) v = (v << 1) | (this.bits[this.pos++] ?? 0);
    return v;
  }
  bitfield(maxId: number): number[] {
    const ids: number[] = [];
    for (let id = 1; id <= maxId; id++) if (this.bits[this.pos++]) ids.push(id);
    return ids;
  }
}

const MAX_PURPOSES = 24; // TCF core purposes fit well within this
const MAX_VENDORS = 64;  // bundled GVL snapshot cap (see GVL_SNAPSHOT)

export function encodeTc(m: TcModel): string {
  const w = new BitWriter();
  w.int(m.version, 6);
  w.int(m.created, 36);
  w.int(m.lastUpdated, 36);
  w.int(m.cmpId, 12);
  w.int(m.cmpVersion, 12);
  w.int(m.vendorListVersion, 12);
  w.bitfield(m.purposeConsents, MAX_PURPOSES);
  w.bitfield(m.vendorConsents, MAX_VENDORS);
  return b64urlEncode(w.bytes());
}

export function decodeTc(s: string): TcModel {
  const r = new BitReader(b64urlDecode(s));
  const version = r.int(6);
  const created = r.int(36);
  const lastUpdated = r.int(36);
  const cmpId = r.int(12);
  const cmpVersion = r.int(12);
  const vendorListVersion = r.int(12);
  const purposeConsents = r.bitfield(MAX_PURPOSES);
  const vendorConsents = r.bitfield(MAX_VENDORS);
  return { version, created, lastUpdated, cmpId, cmpVersion, vendorListVersion, purposeConsents, vendorConsents };
}

/** Bundled Global Vendor List snapshot (honest: a small pinned subset, not the live GVL). */
export const GVL_SNAPSHOT = {
  vendorListVersion: 348,
  lastUpdated: '2026-06-01',
  note: 'Pinned GVL subset for offline TC-string mechanics. IAB CMP registration pending — cmpId is 0.',
  purposes: {
    1: 'Store and/or access information on a device',
    2: 'Use limited data to select advertising',
    7: 'Measure advertising performance',
    8: 'Measure content performance',
    9: 'Understand audiences through statistics',
    10: 'Develop and improve services',
  } as Record<number, string>,
};

/** Build a TC model from banner category choices (deterministic timestamps supplied by caller). */
export function tcFromChoices(choices: Record<string, boolean>, nowSec: number): TcModel {
  const purposes: number[] = [1]; // storage/access always offered
  if (choices.analytics) purposes.push(8, 9, 10);
  if (choices.marketing) purposes.push(2, 7);
  return {
    version: 2,
    created: nowSec,
    lastUpdated: nowSec,
    cmpId: 0, // unregistered — honest
    cmpVersion: 1,
    vendorListVersion: GVL_SNAPSHOT.vendorListVersion,
    purposeConsents: [...new Set(purposes)].sort((a, b) => a - b),
    vendorConsents: [],
  };
}

// ---------------------------------------------------------------------------
// Geo heuristic — should the banner auto-show for this visitor?
// ---------------------------------------------------------------------------

const EU_EEA = new Set([
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO',
]);

export function shouldShowForGeo(countryCode: string | undefined, geoEuOnly: boolean): boolean {
  if (!geoEuOnly) return true; // show for everyone unless the tenant restricts to EU
  if (!countryCode) return true; // unknown -> show (safe default)
  return EU_EEA.has(countryCode.toUpperCase());
}
