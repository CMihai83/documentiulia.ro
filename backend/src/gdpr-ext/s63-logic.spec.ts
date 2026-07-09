import { screen, assessRisks, monitoringWizard, band } from './dpia.logic';
import { sccModule, decideTransfer, assessTia } from './vendor.logic';
import { scanHtml, consentModeUpdate, consentModeDefault, encodeTc, decodeTc, tcFromChoices } from './cmp-harden.logic';

describe('GE-DPIA screening (WP248 + ANSPDCP 174/2018)', () => {
  it('ANSPDCP national-list item => required', () => {
    expect(screen({ nationalIdLargeScale: true }).verdict).toBe('required');
    expect(screen({ employeeMonitoring: true }).verdict).toBe('required');
  });
  it('>=2 WP248 criteria => required; exactly 1 => recommended; none => not_required', () => {
    expect(screen({ evaluationOrScoring: true, largeScale: true }).verdict).toBe('required');
    expect(screen({ largeScale: true }).verdict).toBe('recommended');
    expect(screen({}).verdict).toBe('not_required');
  });
  it('employee monitoring flags the Art-5 wizard requirement', () => {
    expect(screen({ employeeMonitoring: true }).employeeMonitoringWizardRequired).toBe(true);
    expect(screen({ largeScale: true }).employeeMonitoringWizardRequired).toBe(false);
  });
});

describe('GE-DPIA risk matrix (4x4)', () => {
  it('bands by score', () => {
    expect(band(4)).toBe('low'); expect(band(8)).toBe('medium'); expect(band(12)).toBe('high'); expect(band(16)).toBe('very_high');
  });
  it('residual overrides inherent; Art36 when residual stays high', () => {
    const r = assessRisks([{ risk: 'leak', likelihood: 4, severity: 4, residualLikelihood: 4, residualSeverity: 3 }]);
    expect(r.items[0].inherentScore).toBe(16);
    expect(r.items[0].residualScore).toBe(12);
    expect(r.overallResidual).toBe('high');
    expect(r.art36Required).toBe(true);
  });
  it('good mitigation clears Art36', () => {
    const r = assessRisks([{ risk: 'x', likelihood: 4, severity: 4, residualLikelihood: 1, residualSeverity: 2 }]);
    expect(r.art36Required).toBe(false);
  });
});

describe('GE-DPIA Art-5 employee-monitoring wizard (5 gates)', () => {
  it('blocks until all five pass; the 30-day cap needs justification if exceeded', () => {
    const base = { legitimateInterestProven: true, priorInfoProvided: true, unionOrRepsConsulted: true, alternativesExhausted: true };
    expect(monitoringWizard({ ...base, storageDays: 30 }).passed).toBe(true);
    expect(monitoringWizard({ ...base, storageDays: 90 }).passed).toBe(false);
    expect(monitoringWizard({ ...base, storageDays: 90, storageJustification: 'audit legal requires 90 days of retention' }).passed).toBe(true);
    expect(monitoringWizard({ ...base, storageDays: 30, priorInfoProvided: false }).passed).toBe(false);
  });
});

describe('GE-VENDOR SCC module picker (2021/914)', () => {
  it('maps role pairings to M1..M4', () => {
    expect(sccModule('controller', 'controller')).toBe('M1');
    expect(sccModule('controller', 'processor')).toBe('M2');
    expect(sccModule('processor', 'processor')).toBe('M3');
    expect(sccModule('processor', 'controller')).toBe('M4');
  });
  it('transfer decision: EU none_needed; adequacy; US-DPF verify; else SCC', () => {
    expect(decideTransfer({ importerCountry: 'DE', importerIsEu: true, exporterRole: 'controller', importerRole: 'processor' }).mechanism).toBe('none_needed');
    expect(decideTransfer({ importerCountry: 'GB', importerIsEu: false, exporterRole: 'controller', importerRole: 'processor' }).mechanism).toBe('adequacy');
    expect(decideTransfer({ importerCountry: 'US', importerIsEu: false, dpfClaimed: true, exporterRole: 'controller', importerRole: 'processor' }).mechanism).toBe('dpf_verify');
    const scc = decideTransfer({ importerCountry: 'US', importerIsEu: false, exporterRole: 'controller', importerRole: 'processor' });
    expect(scc.mechanism).toBe('scc'); expect(scc.sccModule).toBe('M2'); expect(scc.tiaRequired).toBe(true);
  });
});

describe('GE-VENDOR TIA scoring', () => {
  it('measures reduce residual; special categories unprotected => do_not_transfer', () => {
    const high = assessTia({ governmentAccessRisk: 4, dataSensitivity: 4, volume: 4 });
    expect(high.verdict).toBe('do_not_transfer');
    const mitigated = assessTia({ governmentAccessRisk: 3, dataSensitivity: 2, volume: 2, pseudonymised: true, encryptionAtRest: true, contractualSafeguards: true, zeroRetentionWarranty: true });
    expect(mitigated.verdict).toBe('proceed');
    expect(assessTia({ dataSensitivity: 2, governmentAccessRisk: 2, volume: 2, specialCategories: true }).verdict).toBe('do_not_transfer');
  });
});

describe('GE-CMP-HARDEN cookie scanner', () => {
  it('detects seeded trackers and proposes categories', () => {
    const html = '<script src="https://www.googletagmanager.com/gtag/js?id=G-ABC123"></script><script>fbq("init","1")</script>';
    const r = scanHtml(html);
    const ids = r.hits.map((h) => h.id);
    expect(ids).toContain('ga4');
    expect(ids).toContain('meta_pixel');
    expect(r.proposedCategories).toContain('analytics');
    expect(r.proposedCategories).toContain('marketing');
    expect(r.method).toBe('static');
  });
  it('clean page => only necessary', () => {
    expect(scanHtml('<h1>hello</h1>').proposedCategories).toEqual(['necessary']);
  });
});

describe('GE-CMP-HARDEN Consent Mode v2', () => {
  it('default denies everything; update maps choices', () => {
    expect(consentModeDefault().analytics_storage).toBe('denied');
    const up = consentModeUpdate({ analytics: true, marketing: false });
    expect(up.analytics_storage).toBe('granted');
    expect(up.ad_storage).toBe('denied');
    expect(up.ad_user_data).toBe('denied');
  });
});

describe('GE-CMP-HARDEN TC-string round-trip (TCF v2.3 mechanics)', () => {
  it('encodes then decodes back to the same choices; cmpId stays 0 (unregistered)', () => {
    const m = tcFromChoices({ analytics: true, marketing: true }, 1_780_000_000);
    const s = encodeTc(m);
    const back = decodeTc(s);
    expect(back.version).toBe(2);
    expect(back.cmpId).toBe(0);
    expect(back.created).toBe(1_780_000_000);
    expect(back.purposeConsents).toEqual(m.purposeConsents);
    expect(back.vendorListVersion).toBe(m.vendorListVersion);
  });
  it('analytics-only excludes marketing purposes', () => {
    const m = tcFromChoices({ analytics: true, marketing: false }, 1_780_000_000);
    expect(m.purposeConsents).toContain(9);   // audience statistics
    expect(m.purposeConsents).not.toContain(2); // select advertising
    expect(decodeTc(encodeTc(m)).purposeConsents).toEqual(m.purposeConsents);
  });
});
