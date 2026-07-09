/**
 * GE-CMP-MVP (S-61) — consent banner: embeddable script with equal-prominence
 * Accept/Reject, per-category toggles, and PRIOR BLOCKING via categorised
 * `<script type="text/plain" data-gdpr-category="...">` activation.
 *
 * Flagged follow-ups (NOT implemented, NOT claimed): IAB TCF v2.3, Google
 * Consent Mode v2, geo-targeting.
 */
import { createHash } from 'crypto';

export interface CmpTexts {
  ro: { title: string; body: string; accept: string; reject: string; prefs: string; save: string };
  en: { title: string; body: string; accept: string; reject: string; prefs: string; save: string };
}

export const DEFAULT_TEXTS: CmpTexts = {
  ro: {
    title: 'Respectăm confidențialitatea ta',
    body: 'Folosim cookie-uri necesare pentru funcționare și, doar cu acordul tău, cookie-uri de analiză și marketing.',
    accept: 'Acceptă toate',
    reject: 'Respinge toate',
    prefs: 'Preferințe',
    save: 'Salvează alegerile',
  },
  en: {
    title: 'We respect your privacy',
    body: 'We use necessary cookies to operate, and — only with your consent — analytics and marketing cookies.',
    accept: 'Accept all',
    reject: 'Reject all',
    prefs: 'Preferences',
    save: 'Save choices',
  },
};

export const DEFAULT_CATEGORIES = ['necessary', 'analytics', 'marketing'] as const;

export interface CmpConfigLike {
  bannerVersion: string;
  categories: string[];
  colors?: { bg?: string; fg?: string; accent?: string } | null;
  policyUrl?: string | null;
  texts?: CmpTexts | null;
}

/** Hash of everything the visitor actually saw — stored on each ConsentRecord. */
export function bannerTextHash(cfg: CmpConfigLike): string {
  const texts = cfg.texts ?? DEFAULT_TEXTS;
  return createHash('sha256')
    .update(JSON.stringify({ texts, categories: cfg.categories, version: cfg.bannerVersion }))
    .digest('hex');
}

export function hashPii(v: string | undefined | null, salt: string): string | null {
  if (!v) return null;
  return createHash('sha256').update(`${salt}:${v}`).digest('hex');
}

/**
 * The embeddable banner script. Pure string generation — the same inputs
 * always produce the same script (bannerVersion + textHash pinned inside).
 *
 * Prior-blocking contract for site owners:
 *   <script type="text/plain" data-gdpr-category="analytics" src="..."></script>
 *   <script type="text/plain" data-gdpr-category="marketing">...inline...</script>
 * Scripts stay inert (text/plain) until the visitor consents to the category;
 * the banner then re-creates them as real <script> nodes. `necessary` is
 * always active.
 */
export function buildBannerScript(orgSlug: string, cfg: CmpConfigLike, intakeBase: string): string {
  const texts = cfg.texts ?? DEFAULT_TEXTS;
  const colors = { bg: '#0f172a', fg: '#f8fafc', accent: '#14b8a6', ...(cfg.colors ?? {}) };
  const categories = cfg.categories.length ? cfg.categories : [...DEFAULT_CATEGORIES];
  const textHash = bannerTextHash(cfg);
  const payload = JSON.stringify({ categories, texts, colors, policyUrl: cfg.policyUrl ?? null, version: cfg.bannerVersion, textHash });

  return `(function(){
'use strict';
var CFG=${payload};
var SLUG=${JSON.stringify(orgSlug)};
var INTAKE=${JSON.stringify(intakeBase)}+'/gdpr-public/cmp/'+SLUG+'/consent';
var KEY='dgdpr_'+SLUG;
function lang(){try{return (document.documentElement.lang||'ro').slice(0,2)==='en'?'en':'ro';}catch(e){return 'ro';}}
function read(){try{var m=document.cookie.match(new RegExp('(?:^|; )'+KEY+'=([^;]*)'));return m?JSON.parse(decodeURIComponent(m[1])):null;}catch(e){return null;}}
function write(v){try{document.cookie=KEY+'='+encodeURIComponent(JSON.stringify(v))+'; path=/; max-age=15552000; SameSite=Lax';}catch(e){}}
function activate(granted){
  var nodes=document.querySelectorAll('script[type="text/plain"][data-gdpr-category]');
  for(var i=0;i<nodes.length;i++){
    var n=nodes[i];var cat=n.getAttribute('data-gdpr-category');
    if(cat==='necessary'||granted.indexOf(cat)>=0){
      if(n.getAttribute('data-dgdpr-activated')==='1')continue;
      var s=document.createElement('script');
      if(n.src)s.src=n.src;else s.text=n.text||n.textContent||'';
      for(var a=0;a<n.attributes.length;a++){var at=n.attributes[a];if(at.name!=='type'&&at.name!=='data-gdpr-category')s.setAttribute(at.name,at.value);}
      n.setAttribute('data-dgdpr-activated','1');
      n.parentNode.replaceChild(s,n);
    }
  }
}
function send(granted){
  var choices={};for(var i=0;i<CFG.categories.length;i++){var c=CFG.categories[i];choices[c]=(c==='necessary')||granted.indexOf(c)>=0;}
  try{
    var body=JSON.stringify({choices:choices,lang:lang(),bannerVersion:CFG.version,textHash:CFG.textHash,ref:read()&&read().ref||undefined});
    if(navigator.sendBeacon){navigator.sendBeacon(INTAKE,new Blob([body],{type:'application/json'}));}
    else{var x=new XMLHttpRequest();x.open('POST',INTAKE,true);x.setRequestHeader('Content-Type','application/json');x.send(body);}
  }catch(e){}
}
function decide(granted){write({v:CFG.version,granted:granted,at:Date.now()});send(granted);activate(granted);var el=document.getElementById('dgdpr-banner');if(el)el.remove();}
function render(){
  var t=CFG.texts[lang()];
  var host=document.createElement('div');host.id='dgdpr-banner';
  host.setAttribute('style','position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:2147483647;max-width:560px;width:calc(100vw - 32px);background:'+CFG.colors.bg+';color:'+CFG.colors.fg+';border-radius:12px;padding:16px;font:14px/1.45 system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.35)');
  var cats='';for(var i=0;i<CFG.categories.length;i++){var c=CFG.categories[i];var dis=c==='necessary'?' checked disabled':'';cats+='<label style="display:inline-flex;align-items:center;gap:6px;margin-right:12px"><input type="checkbox" data-dgdpr-cat="'+c+'"'+dis+'>'+c+'</label>';}
  host.innerHTML='<strong>'+t.title+'</strong><p style="margin:8px 0">'+t.body+(CFG.policyUrl?' <a href="'+CFG.policyUrl+'" style="color:'+CFG.colors.accent+'" target="_blank" rel="noopener">Politica</a>':'')+'</p>'+
    '<div id="dgdpr-prefs" style="display:none;margin:8px 0">'+cats+'</div>'+
    '<div style="display:flex;gap:8px;flex-wrap:wrap">'+
    '<button id="dgdpr-accept" style="flex:1;min-width:120px;background:'+CFG.colors.accent+';color:#04211d;border:0;border-radius:8px;padding:10px 14px;font-weight:600;cursor:pointer">'+t.accept+'</button>'+
    '<button id="dgdpr-reject" style="flex:1;min-width:120px;background:'+CFG.colors.accent+';color:#04211d;border:0;border-radius:8px;padding:10px 14px;font-weight:600;cursor:pointer">'+t.reject+'</button>'+
    '<button id="dgdpr-open-prefs" style="background:transparent;color:'+CFG.colors.fg+';border:1px solid '+CFG.colors.fg+';border-radius:8px;padding:10px 14px;cursor:pointer">'+t.prefs+'</button>'+
    '<button id="dgdpr-save" style="display:none;background:transparent;color:'+CFG.colors.fg+';border:1px solid '+CFG.colors.fg+';border-radius:8px;padding:10px 14px;cursor:pointer">'+t.save+'</button>'+
    '</div>';
  document.body.appendChild(host);
  var all=[];for(var i=0;i<CFG.categories.length;i++){if(CFG.categories[i]!=='necessary')all.push(CFG.categories[i]);}
  document.getElementById('dgdpr-accept').onclick=function(){decide(all);};
  document.getElementById('dgdpr-reject').onclick=function(){decide([]);};
  document.getElementById('dgdpr-open-prefs').onclick=function(){document.getElementById('dgdpr-prefs').style.display='block';document.getElementById('dgdpr-save').style.display='inline-block';};
  document.getElementById('dgdpr-save').onclick=function(){var g=[];var boxes=host.querySelectorAll('input[data-dgdpr-cat]');for(var i=0;i<boxes.length;i++){var b=boxes[i];if(b.checked&&b.getAttribute('data-dgdpr-cat')!=='necessary')g.push(b.getAttribute('data-dgdpr-cat'));}decide(g);};
}
var prior=read();
if(prior&&prior.v===CFG.version){activate(prior.granted||[]);}
else{if(document.body){render();}else{document.addEventListener('DOMContentLoaded',render);}}
window.__dgdpr={activate:activate,read:read,version:CFG.version,textHash:CFG.textHash};
})();`;
}
