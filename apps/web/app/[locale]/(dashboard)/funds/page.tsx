'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface FundingProgram {
  id: string;
  name: string;
  source: 'pnrr' | 'cohesion' | 'investeu' | 'horizon' | 'digital';
  totalBudget: number;
  availableBudget: number;
  deadline: string;
  minFunding: number;
  maxFunding: number;
  cofinancing: number; // percentage required from applicant
  eligibility: string[];
  sectors: string[];
  description: string;
  status: 'open' | 'upcoming' | 'closed';
  successRate: number;
  documentsRequired: string[];
  milestones: { name: string; date: string; status: 'completed' | 'current' | 'upcoming' }[];
}

interface EligibilityResult {
  program: FundingProgram;
  score: number;
  matchedCriteria: string[];
  missingCriteria: string[];
  estimatedFunding: number;
  recommendation: string;
}

interface CompanyProfile {
  name: string;
  cui: string;
  sector: string;
  employees: number;
  revenue: number;
  founded: number;
  location: string;
  certifications: string[];
}

// Mock Data
const mockPrograms: FundingProgram[] = [
  {
    id: '1',
    name: 'PNRR - Digitalizare IMM',
    source: 'pnrr',
    totalBudget: 500000000,
    availableBudget: 320000000,
    deadline: '2025-06-30',
    minFunding: 25000,
    maxFunding: 100000,
    cofinancing: 10,
    eligibility: ['IMM', 'Minim 2 ani activitate', 'Profit ultimele 2 exerciții', 'Fără datorii ANAF'],
    sectors: ['Retail', 'Servicii', 'Producție', 'IT', 'Turism'],
    description: 'Finanțare pentru digitalizarea proceselor de business, implementare ERP, CRM, e-commerce și automatizare.',
    status: 'open',
    successRate: 68,
    documentsRequired: ['CUI', 'Bilanț 2023-2024', 'Certificat ANAF', 'Plan de afaceri digital'],
    milestones: [
      { name: 'Lansare apel', date: '2025-01-15', status: 'completed' },
      { name: 'Depunere dosare', date: '2025-06-30', status: 'current' },
      { name: 'Evaluare', date: '2025-09-30', status: 'upcoming' },
      { name: 'Contractare', date: '2025-12-15', status: 'upcoming' }
    ]
  },
  {
    id: '2',
    name: 'PNRR - Eficiență Energetică Clădiri',
    source: 'pnrr',
    totalBudget: 2300000000,
    availableBudget: 1800000000,
    deadline: '2025-09-15',
    minFunding: 50000,
    maxFunding: 500000,
    cofinancing: 15,
    eligibility: ['Proprietar clădire', 'Clădire construită înainte de 2000', 'Certificat energetic'],
    sectors: ['Imobiliare', 'Industrial', 'Comercial'],
    description: 'Renovare energetică profundă a clădirilor, izolație termică, panouri fotovoltaice, pompe de căldură.',
    status: 'open',
    successRate: 75,
    documentsRequired: ['Act proprietate', 'Certificat energetic', 'Audit energetic', 'Proiect tehnic'],
    milestones: [
      { name: 'Lansare apel', date: '2025-03-01', status: 'completed' },
      { name: 'Depunere dosare', date: '2025-09-15', status: 'current' },
      { name: 'Evaluare', date: '2025-12-15', status: 'upcoming' },
      { name: 'Contractare', date: '2026-03-01', status: 'upcoming' }
    ]
  },
  {
    id: '3',
    name: 'Fonduri Coeziune - Start-up Nation',
    source: 'cohesion',
    totalBudget: 400000000,
    availableBudget: 250000000,
    deadline: '2025-04-30',
    minFunding: 50000,
    maxFunding: 200000,
    cofinancing: 0,
    eligibility: ['Întreprindere nouă (< 3 ani)', 'Plan de afaceri inovativ', 'Locuri de muncă create'],
    sectors: ['Toate sectoarele', 'Focus pe inovație'],
    description: 'Granturi pentru start-up-uri și microîntreprinderi cu potențial de creștere și inovație.',
    status: 'open',
    successRate: 42,
    documentsRequired: ['Plan afaceri', 'CV fondatori', 'Studiu fezabilitate', 'Proiecții financiare'],
    milestones: [
      { name: 'Lansare apel', date: '2025-01-10', status: 'completed' },
      { name: 'Depunere dosare', date: '2025-04-30', status: 'current' },
      { name: 'Evaluare', date: '2025-07-30', status: 'upcoming' },
      { name: 'Contractare', date: '2025-10-15', status: 'upcoming' }
    ]
  },
  {
    id: '4',
    name: 'InvestEU - Voucher Digitalizare',
    source: 'investeu',
    totalBudget: 50000000,
    availableBudget: 35000000,
    deadline: '2025-12-31',
    minFunding: 5000,
    maxFunding: 50000,
    cofinancing: 20,
    eligibility: ['IMM', 'Activitate în România', 'Plan digitalizare'],
    sectors: ['Toate sectoarele'],
    description: 'Vouchere pentru achiziție software, licențe, servicii cloud și consultanță IT.',
    status: 'open',
    successRate: 85,
    documentsRequired: ['CUI', 'Descriere proiect', 'Oferte furnizori', 'Declarație IMM'],
    milestones: [
      { name: 'Sesiune deschisă', date: '2025-01-01', status: 'completed' },
      { name: 'Depunere continuă', date: '2025-12-31', status: 'current' },
      { name: 'Evaluare 30 zile', date: 'După depunere', status: 'upcoming' }
    ]
  },
  {
    id: '5',
    name: 'Horizon Europe - Green Tech',
    source: 'horizon',
    totalBudget: 95400000000,
    availableBudget: 15000000000,
    deadline: '2025-03-20',
    minFunding: 500000,
    maxFunding: 5000000,
    cofinancing: 30,
    eligibility: ['Consorțiu 3+ țări UE', 'TRL 4-7', 'Cercetare-inovație'],
    sectors: ['Energie verde', 'Climat', 'Mobilitate', 'Agricultură durabilă'],
    description: 'Finanțare pentru proiecte de cercetare și inovație în domeniul tehnologiilor verzi.',
    status: 'upcoming',
    successRate: 15,
    documentsRequired: ['Proposal', 'Consorțiu agreement', 'Budget breakdown', 'Impact assessment'],
    milestones: [
      { name: 'Pre-anunț', date: '2025-01-15', status: 'completed' },
      { name: 'Lansare call', date: '2025-02-15', status: 'completed' },
      { name: 'Deadline', date: '2025-03-20', status: 'current' },
      { name: 'Evaluare', date: '2025-06-20', status: 'upcoming' }
    ]
  },
  {
    id: '6',
    name: 'Digital Europe - AI & Cybersecurity',
    source: 'digital',
    totalBudget: 7500000000,
    availableBudget: 2500000000,
    deadline: '2025-05-15',
    minFunding: 100000,
    maxFunding: 2000000,
    cofinancing: 25,
    eligibility: ['Entitate UE', 'Expertiză AI/Cyber', 'Capacitate R&D'],
    sectors: ['AI', 'Cybersecurity', 'Cloud', 'HPC'],
    description: 'Programul Digital Europe pentru competențe digitale, AI și securitate cibernetică.',
    status: 'open',
    successRate: 28,
    documentsRequired: ['Application form', 'Technical annex', 'Financial annex', 'Ethics self-assessment'],
    milestones: [
      { name: 'Call deschis', date: '2025-02-01', status: 'completed' },
      { name: 'Deadline', date: '2025-05-15', status: 'current' },
      { name: 'Evaluare', date: '2025-08-15', status: 'upcoming' },
      { name: 'Grant award', date: '2025-11-01', status: 'upcoming' }
    ]
  }
];

// Helper functions
function formatCurrency(amount: number, currency: string = 'EUR'): string {
  if (amount >= 1000000000) {
    return `${(amount / 1000000000).toFixed(1)}B ${currency}`;
  } else if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M ${currency}`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}K ${currency}`;
  }
  return `${amount.toLocaleString()} ${currency}`;
}

function getSourceColor(source: FundingProgram['source']): string {
  const colors = {
    pnrr: 'from-blue-500 to-indigo-600',
    cohesion: 'from-green-500 to-emerald-600',
    investeu: 'from-purple-500 to-pink-600',
    horizon: 'from-orange-500 to-red-600',
    digital: 'from-cyan-500 to-blue-600'
  };
  return colors[source];
}

function getSourceLabel(source: FundingProgram['source']): string {
  const labels = {
    pnrr: 'PNRR',
    cohesion: 'Fonduri Coeziune',
    investeu: 'InvestEU',
    horizon: 'Horizon Europe',
    digital: 'Digital Europe'
  };
  return labels[source];
}

function getStatusBadge(status: FundingProgram['status']): { color: string; label: string } {
  const badges = {
    open: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', label: 'Deschis' },
    upcoming: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', label: 'În curând' },
    closed: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', label: 'Închis' }
  };
  return badges[status];
}

// Components
function ProgramCard({
  program,
  onClick,
  eligibilityScore
}: {
  program: FundingProgram;
  onClick: () => void;
  eligibilityScore?: number;
}) {
  const statusBadge = getStatusBadge(program.status);
  const daysLeft = Math.ceil((new Date(program.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden cursor-pointer hover:shadow-xl transition-all"
    >
      {/* Header with gradient */}
      <div className={`h-2 bg-gradient-to-r ${getSourceColor(program.source)}`} />

      <div className="p-6">
        {/* Title & Status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge.color}`}>
                {statusBadge.label}
              </span>
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                {getSourceLabel(program.source)}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {program.name}
            </h3>
          </div>
          {eligibilityScore !== undefined && (
            <div className={`text-right px-3 py-1 rounded-lg ${
              eligibilityScore >= 80 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
              eligibilityScore >= 60 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
              'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
            }`}>
              <div className="text-xl font-bold">{eligibilityScore}%</div>
              <div className="text-xs">eligibil</div>
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
          {program.description}
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500 uppercase">Finanțare</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {formatCurrency(program.minFunding)} - {formatCurrency(program.maxFunding)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Cofinanțare</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {program.cofinancing}%
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Rată succes</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {program.successRate}%
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Deadline</p>
            <p className={`font-semibold ${daysLeft <= 30 ? 'text-red-600' : daysLeft <= 60 ? 'text-yellow-600' : 'text-green-600'}`}>
              {daysLeft > 0 ? `${daysLeft} zile` : 'Expirat'}
            </p>
          </div>
        </div>

        {/* Budget Progress */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">Buget disponibil</span>
            <span className="font-medium">{formatCurrency(program.availableBudget)} / {formatCurrency(program.totalBudget)}</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${getSourceColor(program.source)} rounded-full`}
              style={{ width: `${(program.availableBudget / program.totalBudget) * 100}%` }}
            />
          </div>
        </div>

        {/* Sectors */}
        <div className="flex flex-wrap gap-1 mt-4">
          {program.sectors.slice(0, 3).map((sector, idx) => (
            <span key={idx} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
              {sector}
            </span>
          ))}
          {program.sectors.length > 3 && (
            <span className="px-2 py-0.5 text-gray-500 text-xs">
              +{program.sectors.length - 3}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ProgramDetailModal({
  program,
  onClose,
  eligibilityResult
}: {
  program: FundingProgram;
  onClose: () => void;
  eligibilityResult?: EligibilityResult;
}) {
  const statusBadge = getStatusBadge(program.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-4xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className={`h-3 bg-gradient-to-r ${getSourceColor(program.source)}`} />
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b dark:border-gray-700 p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge.color}`}>
                  {statusBadge.label}
                </span>
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                  {getSourceLabel(program.source)}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{program.name}</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Eligibility Result */}
          {eligibilityResult && (
            <div className={`p-4 rounded-xl border ${
              eligibilityResult.score >= 80 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
              eligibilityResult.score >= 60 ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' :
              'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg">Rezultat Eligibilitate AI</h3>
                <div className={`text-3xl font-bold ${
                  eligibilityResult.score >= 80 ? 'text-green-600' :
                  eligibilityResult.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {eligibilityResult.score}%
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-3">{eligibilityResult.recommendation}</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">Criterii îndeplinite</h4>
                  <ul className="space-y-1">
                    {eligibilityResult.matchedCriteria.map((c, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">Criterii lipsă</h4>
                  <ul className="space-y-1">
                    {eligibilityResult.missingCriteria.map((c, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg">
                <span className="text-sm text-gray-500">Finanțare estimată:</span>
                <span className="ml-2 text-xl font-bold text-blue-600">{formatCurrency(eligibilityResult.estimatedFunding)}</span>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Descriere</h3>
            <p className="text-gray-600 dark:text-gray-400">{program.description}</p>
          </div>

          {/* Key Info */}
          <div className="grid md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 uppercase mb-1">Buget Total</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(program.totalBudget)}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 uppercase mb-1">Finanțare</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(program.minFunding)} - {formatCurrency(program.maxFunding)}
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 uppercase mb-1">Cofinanțare</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{program.cofinancing}%</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 uppercase mb-1">Rată Succes</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{program.successRate}%</p>
            </div>
          </div>

          {/* Eligibility */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Criterii Eligibilitate</h3>
            <ul className="grid md:grid-cols-2 gap-2">
              {program.eligibility.map((criterion, idx) => (
                <li key={idx} className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {criterion}
                </li>
              ))}
            </ul>
          </div>

          {/* Documents Required */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Documente Necesare</h3>
            <div className="flex flex-wrap gap-2">
              {program.documentsRequired.map((doc, idx) => (
                <span key={idx} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm">
                  {doc}
                </span>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Calendar</h3>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-4">
                {program.milestones.map((milestone, idx) => (
                  <div key={idx} className="flex items-center gap-4 relative">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                      milestone.status === 'completed' ? 'bg-green-500' :
                      milestone.status === 'current' ? 'bg-blue-500 ring-4 ring-blue-200 dark:ring-blue-900' :
                      'bg-gray-300 dark:bg-gray-600'
                    }`}>
                      {milestone.status === 'completed' ? (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{milestone.name}</p>
                      <p className="text-sm text-gray-500">{milestone.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700 p-4 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
          >
            Închide
          </button>
          <div className="flex gap-3">
            <button className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20">
              Salvează
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Începe Aplicația
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function EligibilityScanner({
  onScan,
  isScanning
}: {
  onScan: (profile: CompanyProfile) => void;
  isScanning: boolean;
}) {
  const [profile, setProfile] = useState<CompanyProfile>({
    name: '',
    cui: '',
    sector: '',
    employees: 0,
    revenue: 0,
    founded: 2020,
    location: '',
    certifications: []
  });

  const [newCert, setNewCert] = useState('');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Scanner Eligibilitate AI
      </h3>
      <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
        Completează profilul companiei pentru a primi recomandări personalizate de finanțare.
      </p>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Nume Companie</label>
          <input
            type="text"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            className="w-full p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
            placeholder="SC Exemplu SRL"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">CUI</label>
          <input
            type="text"
            value={profile.cui}
            onChange={(e) => setProfile({ ...profile, cui: e.target.value })}
            className="w-full p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
            placeholder="RO12345678"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Sector Activitate</label>
          <select
            value={profile.sector}
            onChange={(e) => setProfile({ ...profile, sector: e.target.value })}
            className="w-full p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
          >
            <option value="">Selectează sector</option>
            <option value="retail">Retail / Comerț</option>
            <option value="servicii">Servicii</option>
            <option value="productie">Producție / Manufacturing</option>
            <option value="it">IT & Tehnologie</option>
            <option value="turism">Turism & HoReCa</option>
            <option value="constructii">Construcții</option>
            <option value="transport">Transport & Logistică</option>
            <option value="agricultura">Agricultură</option>
            <option value="energie">Energie</option>
            <option value="sanatate">Sănătate</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Număr Angajați</label>
          <input
            type="number"
            value={profile.employees || ''}
            onChange={(e) => setProfile({ ...profile, employees: parseInt(e.target.value) || 0 })}
            className="w-full p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
            placeholder="15"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Cifră Afaceri (EUR)</label>
          <input
            type="number"
            value={profile.revenue || ''}
            onChange={(e) => setProfile({ ...profile, revenue: parseInt(e.target.value) || 0 })}
            className="w-full p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
            placeholder="500000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">An Înființare</label>
          <input
            type="number"
            value={profile.founded}
            onChange={(e) => setProfile({ ...profile, founded: parseInt(e.target.value) || 2020 })}
            className="w-full p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
            placeholder="2020"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Locație</label>
          <input
            type="text"
            value={profile.location}
            onChange={(e) => setProfile({ ...profile, location: e.target.value })}
            className="w-full p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
            placeholder="București"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Certificări</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCert}
              onChange={(e) => setNewCert(e.target.value)}
              className="flex-1 p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
              placeholder="ISO 9001"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && newCert.trim()) {
                  setProfile({ ...profile, certifications: [...profile.certifications, newCert.trim()] });
                  setNewCert('');
                }
              }}
            />
            <button
              onClick={() => {
                if (newCert.trim()) {
                  setProfile({ ...profile, certifications: [...profile.certifications, newCert.trim()] });
                  setNewCert('');
                }
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              +
            </button>
          </div>
          {profile.certifications.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {profile.certifications.map((cert, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-sm">
                  {cert}
                  <button
                    onClick={() => setProfile({ ...profile, certifications: profile.certifications.filter((_, i) => i !== idx) })}
                    className="hover:text-red-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => onScan(profile)}
        disabled={isScanning || !profile.name || !profile.sector}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isScanning ? (
          <>
            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Scanare în curs...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Scanează Eligibilitate
          </>
        )}
      </button>
    </div>
  );
}

// Main Component
export default function FundsPage() {
  const [programs, setPrograms] = useState<FundingProgram[]>(mockPrograms);
  const [selectedProgram, setSelectedProgram] = useState<FundingProgram | null>(null);
  const [eligibilityResults, setEligibilityResults] = useState<Map<string, EligibilityResult>>(new Map());
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);

  // Filter programs
  const filteredPrograms = programs.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sectors.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSource = sourceFilter === 'all' || p.source === sourceFilter;
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesSource && matchesStatus;
  });

  // Sort by eligibility score if scanned
  const sortedPrograms = hasScanned
    ? [...filteredPrograms].sort((a, b) => {
        const scoreA = eligibilityResults.get(a.id)?.score || 0;
        const scoreB = eligibilityResults.get(b.id)?.score || 0;
        return scoreB - scoreA;
      })
    : filteredPrograms;

  // Handle eligibility scan
  const handleScan = async (profile: CompanyProfile) => {
    setIsScanning(true);

    // Simulate AI scan
    await new Promise(resolve => setTimeout(resolve, 2500));

    const results = new Map<string, EligibilityResult>();

    programs.forEach(program => {
      // Calculate eligibility based on profile
      let score = 50; // Base score
      const matched: string[] = [];
      const missing: string[] = [];

      // Check sector match
      if (program.sectors.includes(profile.sector) || program.sectors.includes('Toate sectoarele')) {
        score += 20;
        matched.push(`Sector ${profile.sector} eligibil`);
      } else {
        missing.push(`Sector ${profile.sector} neacoperit`);
      }

      // Check company age
      const companyAge = 2025 - profile.founded;
      if (program.eligibility.some(e => e.includes('< 3 ani') || e.includes('nouă'))) {
        if (companyAge < 3) {
          score += 15;
          matched.push('Companie tânără (< 3 ani)');
        } else {
          score -= 20;
          missing.push('Companie prea veche pentru acest program');
        }
      } else if (companyAge >= 2) {
        score += 10;
        matched.push('Minim 2 ani activitate');
      }

      // Check IMM criteria
      if (profile.employees < 250 && profile.revenue < 50000000) {
        score += 10;
        matched.push('Calificare IMM');
      }

      // Random variation
      score = Math.min(100, Math.max(0, score + (Math.random() * 20 - 10)));

      // Generate recommendation
      let recommendation = '';
      if (score >= 80) {
        recommendation = `Excelent! ${profile.name} îndeplinește majoritatea criteriilor pentru ${program.name}. Recomandăm depunerea dosarului cât mai curând.`;
      } else if (score >= 60) {
        recommendation = `${profile.name} are șanse bune de succes. Verificați documentele lipsă și pregătiți dosarul.`;
      } else {
        recommendation = `Eligibilitate limitată. Recomandăm consultanță specializată înainte de aplicare.`;
      }

      results.set(program.id, {
        program,
        score: Math.round(score),
        matchedCriteria: matched,
        missingCriteria: missing,
        estimatedFunding: Math.round((program.minFunding + program.maxFunding) / 2 * (score / 100)),
        recommendation
      });
    });

    setEligibilityResults(results);
    setIsScanning(false);
    setHasScanned(true);
  };

  // Stats
  const stats = {
    totalPrograms: programs.length,
    openPrograms: programs.filter(p => p.status === 'open').length,
    totalBudget: programs.reduce((acc, p) => acc + p.availableBudget, 0),
    avgSuccessRate: Math.round(programs.reduce((acc, p) => acc + p.successRate, 0) / programs.length)
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                EU Funds Scanner
              </h1>
              <p className="mt-1 text-gray-500 dark:text-gray-400">
                PNRR, Fonduri Coeziune, InvestEU, Horizon Europe & Digital Europe
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Buget Total Disponibil</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalBudget)}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Programe Active', value: stats.openPrograms, color: 'green', icon: '📋' },
              { label: 'Total Programe', value: stats.totalPrograms, color: 'blue', icon: '🗂️' },
              { label: 'Buget Disponibil', value: formatCurrency(stats.totalBudget), color: 'purple', icon: '💰' },
              { label: 'Rată Medie Succes', value: `${stats.avgSuccessRate}%`, color: 'orange', icon: '📈' }
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span>{stat.icon}</span>
                  <span className="text-sm text-gray-500">{stat.label}</span>
                </div>
                <p className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Sidebar - Scanner */}
          <div className="lg:col-span-1">
            <EligibilityScanner onScan={handleScan} isScanning={isScanning} />

            {/* Source Legend */}
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl p-4 border dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Surse Finanțare</h4>
              <div className="space-y-2">
                {[
                  { source: 'pnrr', label: 'PNRR - €13.57B', desc: 'Plan Național Reziliență' },
                  { source: 'cohesion', label: 'Coeziune - €31B', desc: 'Fonduri Structurale' },
                  { source: 'investeu', label: 'InvestEU', desc: 'Vouchere digitalizare' },
                  { source: 'horizon', label: 'Horizon Europe', desc: 'Cercetare & Inovație' },
                  { source: 'digital', label: 'Digital Europe', desc: 'Competențe digitale' }
                ].map((item) => (
                  <div key={item.source} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${getSourceColor(item.source as FundingProgram['source'])}`} />
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content - Programs */}
          <div className="lg:col-span-2">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Caută programe, sectoare..."
                    className="w-full pl-10 pr-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  />
                </div>
              </div>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="all">Toate Sursele</option>
                <option value="pnrr">PNRR</option>
                <option value="cohesion">Fonduri Coeziune</option>
                <option value="investeu">InvestEU</option>
                <option value="horizon">Horizon Europe</option>
                <option value="digital">Digital Europe</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="all">Toate Statusurile</option>
                <option value="open">Deschise</option>
                <option value="upcoming">În curând</option>
                <option value="closed">Închise</option>
              </select>
            </div>

            {/* Results info */}
            {hasScanned && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
              >
                <p className="text-green-800 dark:text-green-300 text-sm">
                  Scanare completă! Programele sunt ordonate după scorul de eligibilitate.
                </p>
              </motion.div>
            )}

            {/* Programs Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {sortedPrograms.map((program, idx) => (
                <ProgramCard
                  key={program.id}
                  program={program}
                  onClick={() => setSelectedProgram(program)}
                  eligibilityScore={hasScanned ? eligibilityResults.get(program.id)?.score : undefined}
                />
              ))}
            </div>

            {sortedPrograms.length === 0 && (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Nu am găsit programe
                </h3>
                <p className="text-gray-500">
                  Încearcă să ajustezi filtrele sau termenul de căutare.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Program Detail Modal */}
      <AnimatePresence>
        {selectedProgram && (
          <ProgramDetailModal
            program={selectedProgram}
            onClose={() => setSelectedProgram(null)}
            eligibilityResult={eligibilityResults.get(selectedProgram.id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
