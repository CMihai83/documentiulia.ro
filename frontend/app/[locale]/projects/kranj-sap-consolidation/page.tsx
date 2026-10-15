'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import {
  MapPin, Building2, Layers, Globe, Calculator, ShieldCheck, Clock,
  CheckCircle, ArrowRight, Phone, FileText, GitMerge, Coins, Database,
  Info, Factory,
} from 'lucide-react';

type Copy = typeof ro;

const ro = {
  sampleBadge: 'Pagină exemplu — conținut ilustrativ',
  heroTitle: 'Proiecte de consolidare financiară SAP',
  heroSubtitle: 'Kranj, Slovenia',
  heroLead:
    'Cum arată un proiect tipic de consolidare de grup pe SAP (S/4HANA Group Reporting, BPC sau SEM-BCS) pentru grupuri industriale din regiunea Kranj, și cum se conectează DocumentIulia la filialele românești ale acestor grupuri.',
  ctaContact: 'Discută un proiect',
  ctaPhases: 'Vezi fazele proiectului',
  statsTitle: 'Cifre orientative pentru un proiect mediu',
  stats: [
    { value: '8–25', label: 'entități consolidate' },
    { value: '3–6', label: 'monede de raportare' },
    { value: '5 zile', label: 'închidere lunară țintă' },
    { value: '4–9 luni', label: 'durată implementare' },
  ],
  aboutTitle: 'De ce Kranj?',
  aboutLead:
    'Kranj este al patrulea oraș al Sloveniei și centrul regiunii Gorenjska, la 25 km de Ljubljana și la 10 minute de aeroportul Brnik. Zona concentrează grupuri industriale cu structuri multi-entitate, care raportează în EUR și operează filiale în România, Serbia, Croația și Austria.',
  aboutPoints: [
    { icon: Factory, title: 'Industrie și producție', text: 'Electronică, componente auto, cauciuc, telecomunicații — grupuri cu mai multe societăți și fluxuri intercompany intense.' },
    { icon: Globe, title: 'Grupuri regionale', text: 'Societăți-mamă slovene cu filiale în Balcani și Europa Centrală, raportare IFRS sau SRS (standardele slovene) la nivel de grup.' },
    { icon: Building2, title: 'Filiale în România', text: 'Entitățile românești ale acestor grupuri trebuie să livreze pachete de consolidare lunare și, separat, SAF-T D406 și e-Factura către ANAF.' },
  ],
  typesTitle: 'Tipuri de proiecte de consolidare',
  types: [
    { icon: Layers, title: 'SAP S/4HANA Group Reporting', text: 'Consolidare nativă în S/4HANA: unități de consolidare, grupuri, versiuni, eliminări intercompany automate, raportare în Fiori.', tags: ['Greenfield', 'Migrare din BPC'] },
    { icon: Database, title: 'SAP BPC (Standard / Embedded)', text: 'Consolidare legală și de management pe BW/4HANA. Reguli de eliminare, conversie valutară, jurnale manuale, rapoarte în Analysis for Office.', tags: ['Upgrade', 'Mentenanță'] },
    { icon: GitMerge, title: 'Migrare SEM-BCS → Group Reporting', text: 'Mutarea logicii de consolidare din SEM-BCS (sfârșit suport) în Group Reporting, cu reconciliere paralelă pe două-trei perioade istorice.', tags: ['Migrare'] },
    { icon: Coins, title: 'Conversie valutară și IC matching', text: 'RON, RSD, HRK istoric, EUR: cursuri medii și de închidere, diferențe de conversie, matching intercompany automat (ICMR).', tags: ['Optimizare'] },
  ],
  phasesTitle: 'Fazele unui proiect tipic',
  phases: [
    { step: 1, title: 'Analiză și design', text: 'Perimetru de consolidare, plan de conturi de grup, metode (integrală, proporțională, echivalență), fluxuri intercompany.', weeks: '3–5 săpt.' },
    { step: 2, title: 'Configurare', text: 'Unități și grupuri de consolidare, versiuni, reguli de eliminare, conversie valutară, validări.', weeks: '6–10 săpt.' },
    { step: 3, title: 'Integrarea datelor', text: 'Încărcare din ERP-urile filialelor (SAP și non-SAP). Pentru România: mapare din DocumentIulia la planul de conturi de grup.', weeks: '4–6 săpt.' },
    { step: 4, title: 'Rulare paralelă', text: 'Două–trei închideri în paralel cu procesul vechi, reconciliere la nivel de linie, corecții de reguli.', weeks: '2–3 luni' },
    { step: 5, title: 'Go-live și hypercare', text: 'Prima închidere pe noul sistem, suport intensiv, transfer de cunoștințe către echipa de grup.', weeks: '4–6 săpt.' },
  ],
  fitTitle: 'Unde intră DocumentIulia',
  fitLead:
    'Filiala românească a unui grup din Kranj are două obligații paralele: pachetul de consolidare către mamă și raportarea către ANAF. DocumentIulia acoperă a doua și pregătește prima.',
  fit: [
    { icon: Calculator, title: 'Balanță mapată pe planul de grup', text: 'Export lunar al balanței în structura cerută de Group Reporting sau BPC, cu TVA 21%/11% aplicat corect.' },
    { icon: FileText, title: 'SAF-T D406 și e-Factura', text: 'Declarația D406 lunară și facturile B2B prin SPV rămân conforme, independent de calendarul de grup.' },
    { icon: Coins, title: 'Multi-valută', text: 'Tranzacții în RON cu raportare în EUR la cursul BNR mediu sau de închidere, după politica grupului.' },
    { icon: ShieldCheck, title: 'Pistă de audit', text: 'Jurnale imuabile, păstrate 10 ani conform legislației fiscale, utile și pentru auditul de grup.' },
  ],
  noteTitle: 'Notă',
  noteText:
    'Aceasta este o pagină demonstrativă. Cifrele sunt orientative, iar exemplele nu se referă la clienți reali. Modulul de consolidare financiară din DocumentIulia este în planificare (pilonul OneStream din foaia de parcurs).',
  finalTitle: 'Ai o filială românească într-un grup cu consolidare SAP?',
  finalText: 'Îți arătăm cum livrezi pachetul de grup și raportarea ANAF din aceeași platformă.',
  finalCta: 'Programează o discuție',
};

const en: Copy = {
  sampleBadge: 'Sample page — illustrative content',
  heroTitle: 'SAP financial consolidation projects',
  heroSubtitle: 'Kranj, Slovenia',
  heroLead:
    'What a typical group consolidation project on SAP (S/4HANA Group Reporting, BPC or SEM-BCS) looks like for industrial groups around Kranj, and how DocumentIulia connects the Romanian subsidiaries of those groups.',
  ctaContact: 'Discuss a project',
  ctaPhases: 'See the project phases',
  statsTitle: 'Indicative figures for a mid-size project',
  stats: [
    { value: '8–25', label: 'consolidated entities' },
    { value: '3–6', label: 'reporting currencies' },
    { value: '5 days', label: 'target monthly close' },
    { value: '4–9 months', label: 'implementation length' },
  ],
  aboutTitle: 'Why Kranj?',
  aboutLead:
    'Kranj is Slovenia\'s fourth-largest city and the centre of the Gorenjska region, 25 km from Ljubljana and ten minutes from Brnik airport. The area concentrates industrial groups with multi-entity structures that report in EUR and run subsidiaries in Romania, Serbia, Croatia and Austria.',
  aboutPoints: [
    { icon: Factory, title: 'Industry and manufacturing', text: 'Electronics, automotive components, rubber, telecoms: groups with several legal entities and heavy intercompany flows.' },
    { icon: Globe, title: 'Regional groups', text: 'Slovenian parent companies with subsidiaries across the Balkans and Central Europe, reporting under IFRS or Slovenian SRS at group level.' },
    { icon: Building2, title: 'Romanian subsidiaries', text: 'The Romanian entities of these groups must deliver monthly consolidation packages and, separately, SAF-T D406 and e-Factura to ANAF.' },
  ],
  typesTitle: 'Types of consolidation projects',
  types: [
    { icon: Layers, title: 'SAP S/4HANA Group Reporting', text: 'Native consolidation in S/4HANA: consolidation units, groups, versions, automatic intercompany eliminations, Fiori reporting.', tags: ['Greenfield', 'Migration from BPC'] },
    { icon: Database, title: 'SAP BPC (Standard / Embedded)', text: 'Legal and management consolidation on BW/4HANA. Elimination rules, currency translation, manual journals, Analysis for Office reports.', tags: ['Upgrade', 'Maintenance'] },
    { icon: GitMerge, title: 'SEM-BCS → Group Reporting migration', text: 'Moving consolidation logic out of SEM-BCS (end of support) into Group Reporting, with parallel reconciliation over two or three historical periods.', tags: ['Migration'] },
    { icon: Coins, title: 'Currency translation and IC matching', text: 'RON, RSD, legacy HRK, EUR: average and closing rates, translation differences, automated intercompany matching (ICMR).', tags: ['Optimisation'] },
  ],
  phasesTitle: 'Phases of a typical project',
  phases: [
    { step: 1, title: 'Analysis and design', text: 'Consolidation scope, group chart of accounts, methods (full, proportional, equity), intercompany flows.', weeks: '3–5 wks' },
    { step: 2, title: 'Configuration', text: 'Consolidation units and groups, versions, elimination rules, currency translation, validations.', weeks: '6–10 wks' },
    { step: 3, title: 'Data integration', text: 'Loads from subsidiary ERPs (SAP and non-SAP). For Romania: mapping from DocumentIulia to the group chart of accounts.', weeks: '4–6 wks' },
    { step: 4, title: 'Parallel run', text: 'Two or three closes in parallel with the old process, line-level reconciliation, rule corrections.', weeks: '2–3 months' },
    { step: 5, title: 'Go-live and hypercare', text: 'First close on the new system, intensive support, knowledge transfer to the group team.', weeks: '4–6 wks' },
  ],
  fitTitle: 'Where DocumentIulia fits',
  fitLead:
    'The Romanian subsidiary of a Kranj-based group has two parallel obligations: the consolidation package to the parent and reporting to ANAF. DocumentIulia covers the second and prepares the first.',
  fit: [
    { icon: Calculator, title: 'Trial balance mapped to the group chart', text: 'Monthly trial balance export in the structure Group Reporting or BPC expects, with 21%/11% VAT applied correctly.' },
    { icon: FileText, title: 'SAF-T D406 and e-Factura', text: 'The monthly D406 return and B2B invoices through SPV stay compliant regardless of the group calendar.' },
    { icon: Coins, title: 'Multi-currency', text: 'Transactions in RON with EUR reporting at the BNR average or closing rate, per group policy.' },
    { icon: ShieldCheck, title: 'Audit trail', text: 'Immutable journals retained for 10 years under Romanian tax law, also useful for the group audit.' },
  ],
  noteTitle: 'Note',
  noteText:
    'This is a demonstration page. Figures are indicative and the examples do not refer to real clients. The financial consolidation module in DocumentIulia is in planning (the OneStream pillar of the roadmap).',
  finalTitle: 'Do you run a Romanian subsidiary inside a group with SAP consolidation?',
  finalText: 'We show you how to deliver the group package and ANAF reporting from the same platform.',
  finalCta: 'Book a conversation',
};

export default function KranjSapConsolidationPage() {
  const locale = useLocale();
  const c = locale === 'ro' ? ro : en;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 text-white py-20 px-4 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500 rounded-full blur-3xl opacity-20" aria-hidden="true"></div>
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Info className="w-4 h-4" aria-hidden="true" />
              {c.sampleBadge}
            </span>
            <h1 className="text-4xl md:text-6xl font-bold mb-3">{c.heroTitle}</h1>
            <p className="inline-flex items-center gap-2 text-lg md:text-xl font-medium opacity-90 mb-6">
              <MapPin className="w-5 h-5" aria-hidden="true" />
              {c.heroSubtitle}
            </p>
            <p className="text-xl opacity-90 max-w-3xl mx-auto mb-8">{c.heroLead}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="#faze"
                className="bg-white text-primary-700 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition flex items-center justify-center gap-2"
              >
                {c.ctaPhases} <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </Link>
              <Link
                href="/contact"
                className="border-2 border-white/50 text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition flex items-center justify-center gap-2"
              >
                <Phone className="w-5 h-5" aria-hidden="true" /> {c.ctaContact}
              </Link>
            </div>
          </div>

          <p className="text-center text-sm opacity-80 mb-4">{c.statsTitle}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {c.stats.map((stat) => (
              <div key={stat.label} className="text-center bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="text-3xl md:text-4xl font-bold">{stat.value}</div>
                <div className="text-sm opacity-80">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Kranj */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{c.aboutTitle}</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">{c.aboutLead}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {c.aboutPoints.map((p) => (
              <div key={p.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center mb-4">
                  <p.icon className="w-6 h-6" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{p.title}</h3>
                <p className="text-gray-600">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Project types */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">{c.typesTitle}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {c.types.map((t) => (
              <div key={t.title} className="rounded-2xl border border-gray-200 p-6 hover:border-primary-300 hover:shadow-md transition">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 shrink-0 rounded-xl bg-primary-600 text-white flex items-center justify-center">
                    <t.icon className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{t.title}</h3>
                    <p className="text-gray-600 mb-3">{t.text}</p>
                    <div className="flex flex-wrap gap-2">
                      {t.tags.map((tag) => (
                        <span key={tag} className="text-xs font-medium bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Phases */}
      <section id="faze" className="py-20 px-4 scroll-mt-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">{c.phasesTitle}</h2>
          <ol className="space-y-4">
            {c.phases.map((ph) => (
              <li key={ph.step} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex gap-5">
                <div className="w-12 h-12 shrink-0 rounded-full bg-primary-600 text-white font-bold text-lg flex items-center justify-center">
                  {ph.step}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900">{ph.title}</h3>
                    <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                      <Clock className="w-4 h-4" aria-hidden="true" /> {ph.weeks}
                    </span>
                  </div>
                  <p className="text-gray-600">{ph.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* DocumentIulia fit */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{c.fitTitle}</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">{c.fitLead}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {c.fit.map((f) => (
              <div key={f.title} className="rounded-2xl bg-gray-50 p-6">
                <f.icon className="w-8 h-8 text-primary-600 mb-4" aria-hidden="true" />
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-600">{f.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border border-amber-200 bg-amber-50 p-6 flex gap-4" role="note">
            <Info className="w-6 h-6 text-amber-600 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold text-amber-900 mb-1">{c.noteTitle}</p>
              <p className="text-amber-900/90 text-sm">{c.noteText}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary-700 to-primary-900 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-6 opacity-90" aria-hidden="true" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{c.finalTitle}</h2>
          <p className="text-lg opacity-90 mb-8">{c.finalText}</p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-white text-primary-700 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition"
          >
            {c.finalCta} <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
