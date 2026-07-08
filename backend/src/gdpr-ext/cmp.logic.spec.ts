import { buildBannerScript, bannerTextHash, hashPii, DEFAULT_TEXTS } from './cmp.logic';

const CFG = { bannerVersion: '1', categories: ['necessary', 'analytics', 'marketing'], policyUrl: null, texts: null, colors: null };

/** Minimal DOM stub good enough to execute the banner script's core paths. */
function makeDom(cookie: string) {
  const plainScripts = [
    fakeNode('analytics', 'window.__an=1'),
    fakeNode('marketing', 'window.__mk=1'),
  ];
  function fakeNode(cat: string, text: string) {
    const attrs: Record<string, string> = { type: 'text/plain', 'data-gdpr-category': cat };
    const node: any = {
      src: '',
      text,
      textContent: text,
      getAttribute: (k: string) => attrs[k] ?? null,
      setAttribute: (k: string, v: string) => { attrs[k] = v; },
      get attributes() { return Object.entries(attrs).map(([name, value]) => ({ name, value })); },
      replacedWith: null as any,
    };
    node.parentNode = { replaceChild: (nw: any, _old: any) => { node.replacedWith = nw; } };
    return node;
  }
  const created: any[] = [];
  const banner: any = { remove: () => { dom.bannerRemoved = true; }, innerHTML: '', setAttribute: () => {}, querySelectorAll: () => [] };
  const buttons: Record<string, any> = {};
  const dom: any = {
    plainScripts,
    created,
    bannerRemoved: false,
    beacons: [] as string[],
    document: {
      cookie,
      documentElement: { lang: 'ro' },
      body: { appendChild: (el: any) => { dom.appended = el; } },
      addEventListener: () => {},
      createElement: (tag: string) => {
        if (tag === 'div') return banner;
        const el: any = { attrs: {} as Record<string, string>, setAttribute(k: string, v: string) { this.attrs[k] = v; }, src: '', text: '' };
        created.push(el);
        return el;
      },
      querySelectorAll: (sel: string) => (sel.includes('data-gdpr-category') ? plainScripts : []),
      getElementById: (id: string) => {
        if (id === 'dgdpr-banner') return dom.appended ? banner : null;
        if (!buttons[id]) buttons[id] = { style: {}, onclick: null };
        return buttons[id];
      },
    },
    buttons,
    navigator: { sendBeacon: (_url: string, blob: any) => { dom.beacons.push(blob); return true; } },
    window: {} as any,
  };
  return dom;
}

function run(script: string, dom: any) {
  const fn = new Function('document', 'navigator', 'window', 'Blob', 'XMLHttpRequest', script);
  fn(dom.document, dom.navigator, dom.window, class { constructor(public parts: any[]) {} }, class { open() {} setRequestHeader() {} send() {} });
}

describe('GE-CMP banner script', () => {
  const script = buildBannerScript('org-a', CFG, '/api/v1');

  it('has equal-prominence Accept and Reject (same style class, both flex:1)', () => {
    const accept = script.match(/dgdpr-accept" style="([^"]+)"/)![1];
    const reject = script.match(/dgdpr-reject" style="([^"]+)"/)![1];
    expect(accept).toBe(reject); // literally identical styling
    expect(accept).toContain('flex:1');
  });

  it('PRIOR BLOCKING: with no consent cookie, categorised scripts stay inert', () => {
    const dom = makeDom('');
    run(script, dom);
    expect(dom.appended).toBeTruthy(); // banner rendered
    expect(dom.plainScripts.every((n: any) => n.replacedWith === null)).toBe(true); // nothing activated
  });

  it('accepting activates all categories and posts consent to the org intake', () => {
    const dom = makeDom('');
    run(script, dom);
    dom.buttons['dgdpr-accept'].onclick();
    expect(dom.plainScripts.every((n: any) => n.replacedWith !== null)).toBe(true);
    expect(dom.beacons.length).toBe(1);
    const body = JSON.parse(dom.beacons[0].parts[0]);
    expect(body.choices).toEqual({ necessary: true, analytics: true, marketing: true });
    expect(body.textHash).toBe(bannerTextHash(CFG));
  });

  it('one-click reject activates nothing beyond necessary and still records the refusal', () => {
    const dom = makeDom('');
    run(script, dom);
    dom.buttons['dgdpr-reject'].onclick();
    expect(dom.plainScripts.every((n: any) => n.replacedWith === null)).toBe(true); // analytics+marketing stay inert
    const body = JSON.parse(dom.beacons[0].parts[0]);
    expect(body.choices).toEqual({ necessary: true, analytics: false, marketing: false });
  });

  it('a returning visitor with a stored choice gets activation without a banner', () => {
    const stored = encodeURIComponent(JSON.stringify({ v: '1', granted: ['analytics'] }));
    const dom = makeDom(`dgdpr_org-a=${stored}`);
    run(script, dom);
    expect(dom.appended).toBeFalsy(); // no banner re-shown
    expect(dom.plainScripts[0].replacedWith).not.toBeNull(); // analytics activated
    expect(dom.plainScripts[1].replacedWith).toBeNull(); // marketing still inert
  });

  it('textHash changes when banner texts change; hashPii is salted + null-safe', () => {
    const other = bannerTextHash({ ...CFG, texts: { ...DEFAULT_TEXTS, ro: { ...DEFAULT_TEXTS.ro, title: 'Alt titlu' } } });
    expect(other).not.toBe(bannerTextHash(CFG));
    expect(hashPii('1.2.3.4', 's1')).not.toBe(hashPii('1.2.3.4', 's2'));
    expect(hashPii(null, 's')).toBeNull();
  });
});
