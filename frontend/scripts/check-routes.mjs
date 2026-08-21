#!/usr/bin/env node
/**
 * REQ-049 B1 — navigation integrity check.
 * Builds the real route map from app/[locale] page.tsx files and compares it to
 * every internal navigation target found in the frontend source
 * (router.push / router.replace / <Link href> / href="/dashboard/...").
 * Exits 1 when an unknown target is found, so it can run in CI.
 *
 *   node scripts/check-routes.mjs            # report
 *   node scripts/check-routes.mjs --json     # machine-readable
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const APP = join(ROOT, 'app', '[locale]');
const SRC_DIRS = ['app', 'components', 'contexts', 'lib'].map((d) => join(ROOT, d));

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name.startsWith('.')) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(name)) out.push(p);
  }
  return out;
}

// ---- route map: page.tsx files -> route patterns (dynamic segments -> *)
const routes = new Set();
for (const f of walk(APP)) {
  if (!/\/page\.tsx?$/.test(f)) continue;
  let r = '/' + relative(APP, f).replace(/\/page\.tsx?$/, '').replace(/\\/g, '/');
  if (r === '/page' || r === '/') r = '/';
  // strip route groups (group) and normalize dynamic segments
  r = r.split('/').filter((seg) => !/^\(.*\)$/.test(seg)).map((seg) => (/^\[.*\]$/.test(seg) ? '*' : seg)).join('/') || '/';
  routes.add(r);
}

function routeExists(path) {
  const segs = path.split('/').filter(Boolean);
  outer: for (const r of routes) {
    const rs = r.split('/').filter(Boolean);
    if (rs.length !== segs.length) continue;
    for (let i = 0; i < rs.length; i++) {
      if (rs[i] !== '*' && rs[i] !== segs[i]) continue outer;
    }
    return true;
  }
  return false;
}

// ---- link targets
const TARGET_RE = [
  /router\.(?:push|replace)\(\s*[`'"]([^`'"]+)[`'"]/g,
  /href=\{?\s*[`'"]([^`'"]+)[`'"]/g,
  /href:\s*[`'"]([^`'"]+)[`'"]/g,
];
const findings = [];
const seenTargets = new Map(); // path -> Set(files)
for (const dir of SRC_DIRS) {
  for (const f of walk(dir)) {
    if (/\.(test|spec)\.tsx?$/.test(f) || f.includes('__tests__')) continue;
    const src = readFileSync(f, 'utf8');
    for (const re of TARGET_RE) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(src))) {
        let t = m[1];
        if (!t.startsWith('/') || t.startsWith('//') || t.startsWith('/api/') || t.startsWith('/_next') || /\.(png|jpg|jpeg|svg|ico|pdf|xml|txt|json|webmanifest)$/i.test(t)) continue;
        t = t.split('?')[0].split('#')[0];
        // template literals: `/${locale}/dashboard/x` or `/dashboard/x/${id}`
        t = t.replace(/^\/\$\{[^}]*locale[^}]*\}/, '').replace(/\$\{[^}]+\}/g, '*');
        if (!t.startsWith('/')) t = '/' + t;
        // locale-prefixed literal paths: /ro/dashboard -> /dashboard
        t = t.replace(/^\/(ro|en|de|fr|es)(\/|$)/, '/');
        if (t === '' || t === '/') continue;
        // template artifacts (ternaries inside `${}`), bare dynamic roots and
        // slug templates whose values come from a known table are allowlisted
        if (t.includes('$') || t.includes('=') || t === '/*' || t === '/tools/*') continue;
        t = t.replace(/\/+$/, '') || '/';
        if (!seenTargets.has(t)) seenTargets.set(t, new Set());
        seenTargets.get(t).add(relative(ROOT, f));
      }
    }
  }
}
for (const [t, files] of seenTargets) {
  if (!routeExists(t)) findings.push({ target: t, files: [...files].sort() });
}
findings.sort((a, b) => b.files.length - a.files.length || a.target.localeCompare(b.target));

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ routes: routes.size, targets: seenTargets.size, broken: findings }, null, 2));
} else {
  console.log(`routes: ${routes.size} · link targets: ${seenTargets.size} · broken: ${findings.length}`);
  for (const f of findings) console.log(`  ${f.target}  ←  ${f.files.length} file(s): ${f.files.slice(0, 3).join(', ')}${f.files.length > 3 ? ', …' : ''}`);
}
process.exit(findings.length ? 1 : 0);
