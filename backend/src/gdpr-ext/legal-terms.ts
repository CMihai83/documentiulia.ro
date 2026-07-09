/**
 * GE-LIABILITY — the informational-only disclaimer stamped on every generated
 * GDPR-EXT artifact, plus the versioned ToS text. No legal advice is provided.
 */

export const LEGAL_DISCLAIMER_RO =
  'Acest document este generat automat cu scop informativ și nu constituie consultanță juridică. ' +
  'Vă recomandăm revizuirea de către un consilier juridic înainte de utilizare.';

export const LEGAL_DISCLAIMER_EN =
  'This document is generated automatically for informational purposes and does not constitute legal advice. ' +
  'Please have it reviewed by legal counsel before use.';

/** Stamp attached to every generated artifact (policy, DSAR response, breach draft, register). */
export function artifactStamp(locale: 'ro' | 'en' = 'ro') {
  return {
    lawyerReviewed: false,
    disclaimer: locale === 'en' ? LEGAL_DISCLAIMER_EN : LEGAL_DISCLAIMER_RO,
    generatedBy: 'DocumentIulia GDPR-EXT',
  };
}

export const LEGAL_TERMS_VERSION = '2026-07-09.1';

export const LEGAL_TERMS = {
  version: LEGAL_TERMS_VERSION,
  ro: [
    'Serviciile GDPR-EXT sunt furnizate „ca atare" (AS-IS), fără garanții privind conformitatea juridică deplină.',
    'Documentele generate au caracter informativ și nu reprezintă consultanță juridică sau evaluare a unui caz individual.',
    'Răspunderea totală este limitată la valoarea abonamentului plătit în ultimele 12 luni.',
    'Utilizatorul rămâne operatorul de date și este responsabil pentru deciziile de conformitate.',
  ],
  en: [
    'GDPR-EXT services are provided AS-IS, without warranty of full legal compliance.',
    'Generated documents are informational and are not legal advice or an assessment of an individual case.',
    'Total liability is capped at the subscription fees paid in the preceding 12 months.',
    'The user remains the data controller and is responsible for compliance decisions.',
  ],
};
