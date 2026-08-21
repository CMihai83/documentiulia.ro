#!/usr/bin/env node
/**
 * REQ-049 B6 — API path integrity.
 * nginx proxies ONLY /api/v1/* to the backend; anything else under /api/ goes
 * to Next.js and 404s. Flag literal '/api/<x>' calls that are not '/api/v1/'.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
const ROOT = new URL('..', import.meta.url).pathname;
const DIRS = ['app', 'components', 'contexts', 'lib', 'hooks'].map((d) => join(ROOT, d));
function walk(d, out = []) { try { for (const n of readdirSync(d)) { if (n === 'node_modules' || n === '.next' || n.startsWith('.')) continue; const p = join(d, n); const st = statSync(p); if (st.isDirectory()) walk(p, out); else if (/\.(tsx?|jsx?)$/.test(n)) out.push(p); } } catch {} return out; }
const RE = /['"`](\/api\/(?!v1(?:\/|['"`]))[A-Za-z][^'"`\s]*)/g;
// paths served by Next.js API routes (app/api/**/route.ts) are legitimate
const NEXT_API = new Set(walk(join(ROOT, 'app', 'api')).filter((f) => /\/route\.tsx?$/.test(f)).map((f) => '/api/' + relative(join(ROOT, 'app', 'api'), f).replace(/\/route\.tsx?$/, '').replace(/\[[^\]]+\]/g, '*')));
function servedByNext(p) { const segs = p.split('?')[0].split('${')[0].replace(/\/$/, '').split('/'); outer: for (const r of NEXT_API) { const rs = r.split('/'); if (rs.length > segs.length) continue; for (let i = 0; i < rs.length; i++) { if (rs[i] !== '*' && rs[i] !== segs[i]) continue outer; } return true; } return false; }
const hits = [];
for (const d of DIRS) for (const f of walk(d)) {
  if (/\.(test|spec)\.tsx?$/.test(f) || f.includes('__tests__')) continue;
  const src = readFileSync(f, 'utf8');
  src.split('\n').forEach((line, i) => { const t = line.trim(); if (t.startsWith('//') || t.startsWith('*')) return; let m; RE.lastIndex = 0; while ((m = RE.exec(line))) { if (servedByNext(m[1])) continue; hits.push({ file: relative(ROOT, f), line: i + 1, path: m[1] }); } });
}
if (process.argv.includes('--json')) console.log(JSON.stringify(hits, null, 2));
else { console.log(`non-/api/v1 calls: ${hits.length}`); for (const h of hits) console.log(`  ${h.path}  ${h.file}:${h.line}`); }
process.exit(hits.length ? 1 : 0);
