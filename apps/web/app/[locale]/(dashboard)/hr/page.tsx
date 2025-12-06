'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

// Types
interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  matchScore: number;
  skills: string[];
  experience: number;
  education: string;
  status: 'new' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';
  appliedAt: string;
  cvUrl?: string;
  linkedinUrl?: string;
  notes: string;
}

interface Employee {
  id: string;
  name: string;
  department: string;
  position: string;
  hireDate: string;
  performanceScore: number;
  wellnessScore: number;
  trainingCompleted: number;
  goals: { title: string; progress: number }[];
  reviews: { date: string; score: number; reviewer: string }[];
}

interface JobPosting {
  id: string;
  title: string;
  department: string;
  location: string;
  type: 'full-time' | 'part-time' | 'contract';
  salary: { min: number; max: number };
  description: string;
  requirements: string[];
  benefits: string[];
  status: 'draft' | 'active' | 'paused' | 'closed';
  applicants: number;
  postedAt: string;
}

// Mock Data
const mockCandidates: Candidate[] = [
  {
    id: '1',
    name: 'Maria Popescu',
    email: 'maria.popescu@email.com',
    phone: '+40 722 123 456',
    position: 'Senior Accountant',
    matchScore: 98.3,
    skills: ['SAF-T', 'e-Factura', 'RON/EUR Compliance', 'Sage', 'Excel Advanced'],
    experience: 8,
    education: 'Master Contabilitate, ASE București',
    status: 'interview',
    appliedAt: '2025-12-01',
    linkedinUrl: 'https://linkedin.com/in/maria-popescu',
    notes: 'Excellent SAF-T experience, 2026 compliance ready'
  },
  {
    id: '2',
    name: 'Andrei Ionescu',
    email: 'andrei.ionescu@email.com',
    phone: '+40 733 234 567',
    position: 'Tax Specialist',
    matchScore: 94.7,
    skills: ['VAT 2026', 'Dividend Tax', 'ANAF Reporting', 'Transfer Pricing'],
    experience: 5,
    education: 'Licență Economie, Universitatea București',
    status: 'screening',
    appliedAt: '2025-12-02',
    notes: 'Strong VAT knowledge, needs dividend tax training'
  },
  {
    id: '3',
    name: 'Elena Dumitrescu',
    email: 'elena.d@email.com',
    phone: '+40 744 345 678',
    position: 'Financial Controller',
    matchScore: 91.2,
    skills: ['Budgeting', 'Forecasting', 'SAP', 'Power BI', 'IFRS'],
    experience: 10,
    education: 'MBA Finance, Tiffin University',
    status: 'offer',
    appliedAt: '2025-11-28',
    notes: 'International experience, fluent English/French'
  },
  {
    id: '4',
    name: 'Cristian Marin',
    email: 'cristian.m@email.com',
    phone: '+40 755 456 789',
    position: 'Junior Accountant',
    matchScore: 85.5,
    skills: ['Excel', 'SAF-T Basic', 'Data Entry', 'Reconciliation'],
    experience: 2,
    education: 'Licență Contabilitate, UBB Cluj',
    status: 'new',
    appliedAt: '2025-12-03',
    notes: 'Fresh graduate, eager to learn'
  }
];

const mockEmployees: Employee[] = [
  {
    id: '1',
    name: 'Ana Georgescu',
    department: 'Contabilitate',
    position: 'Senior Accountant',
    hireDate: '2022-03-15',
    performanceScore: 92,
    wellnessScore: 88,
    trainingCompleted: 12,
    goals: [
      { title: 'SAF-T D406 Certification', progress: 100 },
      { title: 'e-Factura B2B Training', progress: 75 },
      { title: 'Team Leadership', progress: 60 }
    ],
    reviews: [
      { date: '2025-06-01', score: 4.5, reviewer: 'Director Financiar' },
      { date: '2024-12-01', score: 4.2, reviewer: 'Director Financiar' }
    ]
  },
  {
    id: '2',
    name: 'Mihai Radu',
    department: 'Taxe',
    position: 'Tax Manager',
    hireDate: '2020-01-10',
    performanceScore: 95,
    wellnessScore: 72,
    trainingCompleted: 18,
    goals: [
      { title: 'VAT 2026 Implementation', progress: 90 },
      { title: 'Team Expansion', progress: 50 },
      { title: 'Process Automation', progress: 40 }
    ],
    reviews: [
      { date: '2025-06-01', score: 4.8, reviewer: 'CEO' },
      { date: '2024-12-01', score: 4.7, reviewer: 'CEO' }
    ]
  }
];

const mockJobPostings: JobPosting[] = [
  {
    id: '1',
    title: 'Senior Accountant - SAF-T Specialist',
    department: 'Contabilitate',
    location: 'București / Remote',
    type: 'full-time',
    salary: { min: 8000, max: 12000 },
    description: 'Căutăm un contabil senior cu experiență în SAF-T D406 și e-Factura pentru pregătirea conformității 2026.',
    requirements: ['5+ ani experiență', 'Certificare CECCAR', 'SAF-T D406', 'e-Factura B2B'],
    benefits: ['Remote hybrid', 'Training plătit', 'Asigurare medicală', 'Bonus performanță'],
    status: 'active',
    applicants: 23,
    postedAt: '2025-11-25'
  },
  {
    id: '2',
    title: 'Tax Specialist - VAT 2026',
    department: 'Taxe',
    location: 'București',
    type: 'full-time',
    salary: { min: 7000, max: 10000 },
    description: 'Specialist fiscal pentru implementarea noilor cote TVA (21%/11%) și dividend tax 16%.',
    requirements: ['3+ ani experiență', 'Cunoștințe VAT', 'ANAF Reporting', 'Excel Advanced'],
    benefits: ['Training continuu', 'Flexibilitate', 'Bonus anual'],
    status: 'active',
    applicants: 15,
    postedAt: '2025-11-28'
  }
];

// Components
function StatusBadge({ status, type }: { status: string; type: 'candidate' | 'job' }) {
  const colors = {
    candidate: {
      new: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      screening: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      interview: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      offer: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      hired: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    },
    job: {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      closed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    }
  };

  const labels = {
    candidate: {
      new: 'Nou',
      screening: 'Screening',
      interview: 'Interviu',
      offer: 'Ofertă',
      hired: 'Angajat',
      rejected: 'Respins'
    },
    job: {
      draft: 'Draft',
      active: 'Activ',
      paused: 'Pauză',
      closed: 'Închis'
    }
  };

  const colorClass = colors[type][status as keyof typeof colors[typeof type]] || 'bg-gray-100 text-gray-800';
  const label = labels[type][status as keyof typeof labels[typeof type]] || status;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
}

function MatchScoreBadge({ score }: { score: number }) {
  const color = score >= 90 ? 'text-green-600 bg-green-50 dark:bg-green-900/20'
    : score >= 80 ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
    : 'text-red-600 bg-red-50 dark:bg-red-900/20';

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg ${color}`}>
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      <span className="font-bold">{score.toFixed(1)}%</span>
    </div>
  );
}

function CandidateModal({
  candidate,
  onClose,
  onUpdate
}: {
  candidate: Candidate | null;
  onClose: () => void;
  onUpdate: (candidate: Candidate) => void;
}) {
  const [editedCandidate, setEditedCandidate] = useState<Candidate | null>(candidate);

  useEffect(() => {
    setEditedCandidate(candidate);
  }, [candidate]);

  if (!candidate || !editedCandidate) return null;

  const handleStatusChange = (newStatus: Candidate['status']) => {
    const updated = { ...editedCandidate, status: newStatus };
    setEditedCandidate(updated);
    onUpdate(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-3xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b dark:border-gray-700 p-6 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{candidate.name}</h2>
            <p className="text-gray-600 dark:text-gray-400">{candidate.position}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Match Score & Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <MatchScoreBadge score={candidate.matchScore} />
              <StatusBadge status={editedCandidate.status} type="candidate" />
            </div>
            <div className="text-sm text-gray-500">
              Aplicat: {new Date(candidate.appliedAt).toLocaleDateString('ro-RO')}
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <label className="text-xs text-gray-500 uppercase">Email</label>
              <p className="font-medium">{candidate.email}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase">Telefon</label>
              <p className="font-medium">{candidate.phone}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase">Experiență</label>
              <p className="font-medium">{candidate.experience} ani</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase">Educație</label>
              <p className="font-medium">{candidate.education}</p>
            </div>
          </div>

          {/* Skills */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Competențe (AI Matching)
            </label>
            <div className="flex flex-wrap gap-2">
              {candidate.skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Note HR
            </label>
            <textarea
              value={editedCandidate.notes}
              onChange={(e) => setEditedCandidate({ ...editedCandidate, notes: e.target.value })}
              className="w-full p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          {/* Pipeline Actions */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Acțiuni Pipeline
            </label>
            <div className="flex flex-wrap gap-2">
              {(['new', 'screening', 'interview', 'offer', 'hired', 'rejected'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    editedCandidate.status === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {status === 'new' && 'Nou'}
                  {status === 'screening' && 'Screening'}
                  {status === 'interview' && 'Interviu'}
                  {status === 'offer' && 'Ofertă'}
                  {status === 'hired' && 'Angajat'}
                  {status === 'rejected' && 'Respins'}
                </button>
              ))}
            </div>
          </div>

          {/* LinkedIn */}
          {candidate.linkedinUrl && (
            <a
              href={candidate.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              Vezi Profilul LinkedIn
            </a>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700 p-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
          >
            Anulează
          </button>
          <button
            onClick={() => {
              onUpdate(editedCandidate);
              onClose();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Salvează Modificările
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function JobPostingModal({
  job,
  onClose,
  onSave,
  isNew
}: {
  job: JobPosting | null;
  onClose: () => void;
  onSave: (job: JobPosting) => void;
  isNew: boolean;
}) {
  const [editedJob, setEditedJob] = useState<JobPosting>(job || {
    id: Date.now().toString(),
    title: '',
    department: '',
    location: '',
    type: 'full-time',
    salary: { min: 5000, max: 10000 },
    description: '',
    requirements: [],
    benefits: [],
    status: 'draft',
    applicants: 0,
    postedAt: new Date().toISOString().split('T')[0]
  });

  const [newRequirement, setNewRequirement] = useState('');
  const [newBenefit, setNewBenefit] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-3xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b dark:border-gray-700 p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isNew ? 'Postare Nouă' : 'Editează Postare'}
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Titlu Poziție</label>
              <input
                type="text"
                value={editedJob.title}
                onChange={(e) => setEditedJob({ ...editedJob, title: e.target.value })}
                className="w-full p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                placeholder="ex: Senior Accountant - SAF-T Specialist"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Departament</label>
              <input
                type="text"
                value={editedJob.department}
                onChange={(e) => setEditedJob({ ...editedJob, department: e.target.value })}
                className="w-full p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                placeholder="ex: Contabilitate"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Locație</label>
              <input
                type="text"
                value={editedJob.location}
                onChange={(e) => setEditedJob({ ...editedJob, location: e.target.value })}
                className="w-full p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                placeholder="ex: București / Remote"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tip Contract</label>
              <select
                value={editedJob.type}
                onChange={(e) => setEditedJob({ ...editedJob, type: e.target.value as JobPosting['type'] })}
                className="w-full p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={editedJob.status}
                onChange={(e) => setEditedJob({ ...editedJob, status: e.target.value as JobPosting['status'] })}
                className="w-full p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="draft">Draft</option>
                <option value="active">Activ</option>
                <option value="paused">Pauză</option>
                <option value="closed">Închis</option>
              </select>
            </div>
          </div>

          {/* Salary Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Salariu Minim (RON)</label>
              <input
                type="number"
                value={editedJob.salary.min}
                onChange={(e) => setEditedJob({ ...editedJob, salary: { ...editedJob.salary, min: parseInt(e.target.value) } })}
                className="w-full p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Salariu Maxim (RON)</label>
              <input
                type="number"
                value={editedJob.salary.max}
                onChange={(e) => setEditedJob({ ...editedJob, salary: { ...editedJob.salary, max: parseInt(e.target.value) } })}
                className="w-full p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Descriere</label>
            <textarea
              value={editedJob.description}
              onChange={(e) => setEditedJob({ ...editedJob, description: e.target.value })}
              className="w-full p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              rows={4}
              placeholder="Descrierea poziției..."
            />
          </div>

          {/* Requirements */}
          <div>
            <label className="block text-sm font-medium mb-1">Cerințe</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newRequirement}
                onChange={(e) => setNewRequirement(e.target.value)}
                className="flex-1 p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                placeholder="Adaugă cerință..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newRequirement.trim()) {
                    setEditedJob({ ...editedJob, requirements: [...editedJob.requirements, newRequirement.trim()] });
                    setNewRequirement('');
                  }
                }}
              />
              <button
                onClick={() => {
                  if (newRequirement.trim()) {
                    setEditedJob({ ...editedJob, requirements: [...editedJob.requirements, newRequirement.trim()] });
                    setNewRequirement('');
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {editedJob.requirements.map((req, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm">
                  {req}
                  <button
                    onClick={() => setEditedJob({ ...editedJob, requirements: editedJob.requirements.filter((_, i) => i !== idx) })}
                    className="hover:text-red-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Benefits */}
          <div>
            <label className="block text-sm font-medium mb-1">Beneficii</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newBenefit}
                onChange={(e) => setNewBenefit(e.target.value)}
                className="flex-1 p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                placeholder="Adaugă beneficiu..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newBenefit.trim()) {
                    setEditedJob({ ...editedJob, benefits: [...editedJob.benefits, newBenefit.trim()] });
                    setNewBenefit('');
                  }
                }}
              />
              <button
                onClick={() => {
                  if (newBenefit.trim()) {
                    setEditedJob({ ...editedJob, benefits: [...editedJob.benefits, newBenefit.trim()] });
                    setNewBenefit('');
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {editedJob.benefits.map((benefit, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm">
                  {benefit}
                  <button
                    onClick={() => setEditedJob({ ...editedJob, benefits: editedJob.benefits.filter((_, i) => i !== idx) })}
                    className="hover:text-red-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700 p-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
          >
            Anulează
          </button>
          <button
            onClick={() => {
              onSave(editedJob);
              onClose();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {isNew ? 'Publică Postare' : 'Salvează'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// Main Page Component
export default function HRDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'ats' | 'performance' | 'wellness' | 'jobs'>('ats');
  const [candidates, setCandidates] = useState<Candidate[]>(mockCandidates);
  const [employees] = useState<Employee[]>(mockEmployees);
  const [jobPostings, setJobPostings] = useState<JobPosting[]>(mockJobPostings);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [isNewJob, setIsNewJob] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // AI Analysis
  const runAIAnalysis = async () => {
    setIsAnalyzing(true);
    // Simulate AI analysis call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsAnalyzing(false);
  };

  // Filter candidates
  const filteredCandidates = candidates.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    totalCandidates: candidates.length,
    inPipeline: candidates.filter(c => !['hired', 'rejected'].includes(c.status)).length,
    hired: candidates.filter(c => c.status === 'hired').length,
    avgMatchScore: candidates.reduce((acc, c) => acc + c.matchScore, 0) / candidates.length,
    activeJobs: jobPostings.filter(j => j.status === 'active').length,
    totalApplicants: jobPostings.reduce((acc, j) => acc + j.applicants, 0)
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                HR Intelligence Dashboard
              </h1>
              <p className="mt-1 text-gray-500 dark:text-gray-400">
                AI-Powered ATS, Performance Management & Wellness Analytics
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={runAIAnalysis}
                disabled={isAnalyzing}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Analiză AI...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Analiză AI
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setIsNewJob(true);
                  setSelectedJob(null);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Postare Nouă
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-6">
            {[
              { label: 'Total Candidați', value: stats.totalCandidates, color: 'blue' },
              { label: 'În Pipeline', value: stats.inPipeline, color: 'yellow' },
              { label: 'Angajați', value: stats.hired, color: 'green' },
              { label: 'Scor Mediu AI', value: `${stats.avgMatchScore.toFixed(1)}%`, color: 'purple' },
              { label: 'Posturi Active', value: stats.activeJobs, color: 'indigo' },
              { label: 'Total Aplicanți', value: stats.totalApplicants, color: 'pink' }
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 border dark:border-gray-700"
              >
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
            {[
              { id: 'ats', label: 'ATS & Recrutare', icon: '👥' },
              { id: 'performance', label: 'Performanță', icon: '📊' },
              { id: 'wellness', label: 'Wellness', icon: '💚' },
              { id: 'jobs', label: 'Posturi', icon: '📋' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {/* ATS Tab */}
          {activeTab === 'ats' && (
            <motion.div
              key="ats"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Search & Filter */}
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Caută candidați, poziții, competențe..."
                    className="w-full pl-10 pr-4 py-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                >
                  <option value="all">Toate Statusurile</option>
                  <option value="new">Nou</option>
                  <option value="screening">Screening</option>
                  <option value="interview">Interviu</option>
                  <option value="offer">Ofertă</option>
                  <option value="hired">Angajat</option>
                  <option value="rejected">Respins</option>
                </select>
              </div>

              {/* Candidates Grid */}
              <div className="grid md:grid-cols-2 gap-4">
                {filteredCandidates.map((candidate, idx) => (
                  <motion.div
                    key={candidate.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => setSelectedCandidate(candidate)}
                    className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer transition-all hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {candidate.name}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">{candidate.position}</p>
                      </div>
                      <MatchScoreBadge score={candidate.matchScore} />
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                      <StatusBadge status={candidate.status} type="candidate" />
                      <span className="text-sm text-gray-500">
                        {candidate.experience} ani exp.
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {candidate.skills.slice(0, 3).map((skill, sidx) => (
                        <span
                          key={sidx}
                          className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                      {candidate.skills.length > 3 && (
                        <span className="px-2 py-1 text-gray-500 text-xs">
                          +{candidate.skills.length - 3} more
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && (
            <motion.div
              key="performance"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="grid md:grid-cols-2 gap-6">
                {employees.map((employee, idx) => (
                  <motion.div
                    key={employee.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {employee.name}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          {employee.position} • {employee.department}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">{employee.performanceScore}%</div>
                        <div className="text-xs text-gray-500">Scor Performanță</div>
                      </div>
                    </div>

                    {/* Goals Progress */}
                    <div className="space-y-3 mb-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Obiective 2025</h4>
                      {employee.goals.map((goal, gidx) => (
                        <div key={gidx}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600 dark:text-gray-400">{goal.title}</span>
                            <span className="font-medium">{goal.progress}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                              style={{ width: `${goal.progress}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Reviews */}
                    <div className="border-t dark:border-gray-700 pt-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Evaluări Recente</h4>
                      <div className="flex gap-4">
                        {employee.reviews.map((review, ridx) => (
                          <div key={ridx} className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <svg
                                  key={i}
                                  className={`w-4 h-4 ${i < Math.floor(review.score) ? 'text-yellow-400' : 'text-gray-300'}`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(review.date).toLocaleDateString('ro-RO', { month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Add Performance Review Button */}
              <div className="flex justify-center">
                <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Inițiază Evaluare 360°
                </button>
              </div>
            </motion.div>
          )}

          {/* Wellness Tab */}
          {activeTab === 'wellness' && (
            <motion.div
              key="wellness"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Wellness Overview */}
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-white/20 rounded-lg">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold">Wellness Score Mediu</h3>
                  </div>
                  <div className="text-4xl font-bold mb-2">
                    {Math.round(employees.reduce((acc, e) => acc + e.wellnessScore, 0) / employees.length)}%
                  </div>
                  <p className="text-white/80 text-sm">+5% față de luna trecută</p>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-white/20 rounded-lg">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold">Training Completat</h3>
                  </div>
                  <div className="text-4xl font-bold mb-2">
                    {employees.reduce((acc, e) => acc + e.trainingCompleted, 0)}
                  </div>
                  <p className="text-white/80 text-sm">cursuri finalizate în 2025</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-6 text-white">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-white/20 rounded-lg">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold">Work-Life Balance</h3>
                  </div>
                  <div className="text-4xl font-bold mb-2">4.2/5</div>
                  <p className="text-white/80 text-sm">scor sondaj angajați</p>
                </div>
              </div>

              {/* Individual Wellness */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Wellness Individual
                </h3>
                <div className="space-y-4">
                  {employees.map((employee) => (
                    <div key={employee.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                        {employee.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-gray-900 dark:text-white">{employee.name}</span>
                          <span className={`font-bold ${employee.wellnessScore >= 80 ? 'text-green-600' : employee.wellnessScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {employee.wellnessScore}%
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              employee.wellnessScore >= 80 ? 'bg-green-500' :
                              employee.wellnessScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${employee.wellnessScore}%` }}
                          />
                        </div>
                      </div>
                      <button className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200">
                        Detalii
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Wellness Programs */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Programe Wellness Active
                  </h3>
                  <div className="space-y-3">
                    {[
                      { name: 'Mindfulness la Birou', participants: 12, progress: 65 },
                      { name: 'Fitness Challenge Q4', participants: 8, progress: 40 },
                      { name: 'Nutriție Sănătoasă', participants: 15, progress: 80 }
                    ].map((program, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">{program.name}</span>
                          <span className="text-sm text-gray-500">{program.participants} participanți</span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"
                            style={{ width: `${program.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Alerte Wellness
                  </h3>
                  <div className="space-y-3">
                    {[
                      { type: 'warning', message: 'Mihai Radu - scor wellness sub 75%', action: 'Check-in recomandat' },
                      { type: 'info', message: '3 angajați nu au luat concediu în 6 luni', action: 'Notificare trimisă' },
                      { type: 'success', message: 'Satisfacția echipei +10% în T4', action: 'Raport disponibil' }
                    ].map((alert, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border ${
                          alert.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' :
                          alert.type === 'info' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' :
                          'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        }`}
                      >
                        <p className="font-medium text-gray-900 dark:text-white">{alert.message}</p>
                        <p className="text-sm text-gray-500 mt-1">{alert.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Jobs Tab */}
          {activeTab === 'jobs' && (
            <motion.div
              key="jobs"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="grid gap-4">
                {jobPostings.map((job, idx) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {job.title}
                          </h3>
                          <StatusBadge status={job.status} type="job" />
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                          <span>{job.department}</span>
                          <span>•</span>
                          <span>{job.location}</span>
                          <span>•</span>
                          <span>{job.type}</span>
                          <span>•</span>
                          <span>{job.salary.min.toLocaleString()} - {job.salary.max.toLocaleString()} RON</span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">{job.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {job.requirements.map((req, ridx) => (
                            <span key={ridx} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
                              {req}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right ml-6">
                        <div className="text-2xl font-bold text-blue-600">{job.applicants}</div>
                        <div className="text-sm text-gray-500">aplicanți</div>
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => {
                              setSelectedJob(job);
                              setIsNewJob(false);
                            }}
                            className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200"
                          >
                            Editează
                          </button>
                          <button className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200">
                            Vezi CV-uri
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {selectedCandidate && (
          <CandidateModal
            candidate={selectedCandidate}
            onClose={() => setSelectedCandidate(null)}
            onUpdate={(updated) => {
              setCandidates(prev => prev.map(c => c.id === updated.id ? updated : c));
            }}
          />
        )}

        {(selectedJob || isNewJob) && (
          <JobPostingModal
            job={selectedJob}
            onClose={() => {
              setSelectedJob(null);
              setIsNewJob(false);
            }}
            onSave={(job) => {
              if (isNewJob) {
                setJobPostings(prev => [...prev, job]);
              } else {
                setJobPostings(prev => prev.map(j => j.id === job.id ? job : j));
              }
            }}
            isNew={isNewJob}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
