'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Briefcase, DollarSign, Clock, Star, CheckCircle,
  AlertCircle, RefreshCw, Plus, Eye, Edit, Send, FileText,
  Calendar, Target, TrendingUp, MapPin, Search, Filter,
  CreditCard, Shield, MessageSquare, Award, Download
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface FreelancerProfile {
  id: string;
  name: string;
  title: string;
  skills: string[];
  hourlyRate: number;
  currency: string;
  rating: number;
  completedProjects: number;
  status: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  location: string;
  avatarUrl?: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  budget: number;
  currency: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  deadline: string;
  freelancerId?: string;
  freelancerName?: string;
  skills: string[];
}

interface Contract {
  id: string;
  projectTitle: string;
  freelancerName: string;
  amount: number;
  currency: string;
  status: 'DRAFT' | 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'DISPUTED';
  startDate: string;
  endDate?: string;
}

interface HubStats {
  totalFreelancers: number;
  activeProjects: number;
  completedProjects: number;
  totalEarnings: number;
  avgRating: number;
}

type TabType = 'dashboard' | 'freelancers' | 'projects' | 'contracts' | 'payments';

export default function FreelancerHubPage() {
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<HubStats | null>(null);
  const [freelancers, setFreelancers] = useState<FreelancerProfile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState<string>('all');

  const allSkills = ['React', 'Node.js', 'Python', 'Design', 'Marketing', 'DevOps', 'Mobile', 'Data Science'];

  // Navigation handlers
  const handleNewProject = () => {
    router.push('/dashboard/freelancer/projects/new');
  };

  const handleViewProject = (projectId: string) => {
    router.push(`/dashboard/freelancer/projects/${projectId}`);
  };

  const handleEditProject = (projectId: string) => {
    router.push(`/dashboard/freelancer/projects/${projectId}/edit`);
  };

  const handleViewFreelancerProfile = (freelancerId: string) => {
    router.push(`/dashboard/freelancer/profiles/${freelancerId}`);
  };

  const handleContactFreelancer = async (freelancer: FreelancerProfile) => {
    toast.success('Mesaj', `Se deschide conversația cu ${freelancer.name}...`);
    setTimeout(() => {
      router.push(`/dashboard/freelancer/messages?to=${freelancer.id}`);
    }, 500);
  };

  const handleViewContract = (contractId: string) => {
    router.push(`/dashboard/freelancer/contracts/${contractId}`);
  };

  const handleDownloadContract = async (contract: Contract) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/freelancer/contracts/${contract.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contract_${contract.projectTitle.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Descărcare', `Contract descărcat: ${contract.projectTitle}`);
      } else {
        toast.success('Descărcare (Demo)', `Contract ${contract.projectTitle} - funcționalitate în dezvoltare`);
      }
    } catch (err) {
      console.error('Download failed:', err);
      toast.success('Descărcare (Demo)', `Contract ${contract.projectTitle} - funcționalitate în dezvoltare`);
    }
  };

  const handleNewContract = () => {
    router.push('/dashboard/freelancer/contracts/new');
  };

  const handleSearchTalent = () => {
    setActiveTab('freelancers');
    toast.success('Căutare', 'Folosiți filtrele pentru a găsi talent potrivit');
  };

  const handleProcessPayment = () => {
    setActiveTab('payments');
    toast.success('Plăți', 'Modulul de plăți va fi disponibil în curând cu integrare Stripe Escrow');
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Mock data for demonstration
      setStats({
        totalFreelancers: 156,
        activeProjects: 23,
        completedProjects: 89,
        totalEarnings: 245000,
        avgRating: 4.7,
      });

      setFreelancers([
        {
          id: 'fl-001',
          name: 'Alexandru Popescu',
          title: 'Senior Full-Stack Developer',
          skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
          hourlyRate: 75,
          currency: 'EUR',
          rating: 4.9,
          completedProjects: 34,
          status: 'AVAILABLE',
          location: 'București, România',
        },
        {
          id: 'fl-002',
          name: 'Maria Ionescu',
          title: 'UI/UX Designer',
          skills: ['Figma', 'Design', 'Prototyping', 'User Research'],
          hourlyRate: 60,
          currency: 'EUR',
          rating: 4.8,
          completedProjects: 28,
          status: 'BUSY',
          location: 'Cluj-Napoca, România',
        },
        {
          id: 'fl-003',
          name: 'Ion Vasilescu',
          title: 'DevOps Engineer',
          skills: ['AWS', 'Docker', 'Kubernetes', 'DevOps'],
          hourlyRate: 80,
          currency: 'EUR',
          rating: 4.7,
          completedProjects: 19,
          status: 'AVAILABLE',
          location: 'Timișoara, România',
        },
      ]);

      setProjects([
        {
          id: 'prj-001',
          title: 'Dezvoltare Platformă E-commerce',
          description: 'Dezvoltare magazin online cu Next.js și Stripe',
          budget: 15000,
          currency: 'EUR',
          status: 'IN_PROGRESS',
          deadline: '2026-01-15',
          freelancerId: 'fl-001',
          freelancerName: 'Alexandru Popescu',
          skills: ['React', 'Node.js'],
        },
        {
          id: 'prj-002',
          title: 'Redesign Aplicație Mobilă',
          description: 'Redesign complet UI/UX pentru aplicație iOS/Android',
          budget: 8000,
          currency: 'EUR',
          status: 'OPEN',
          deadline: '2026-02-01',
          skills: ['Design', 'Mobile'],
        },
        {
          id: 'prj-003',
          title: 'Migrare Infrastructură Cloud',
          description: 'Migrare de la on-premise la AWS cu Kubernetes',
          budget: 25000,
          currency: 'EUR',
          status: 'COMPLETED',
          deadline: '2025-12-01',
          freelancerId: 'fl-003',
          freelancerName: 'Ion Vasilescu',
          skills: ['DevOps', 'AWS'],
        },
      ]);

      setContracts([
        {
          id: 'ctr-001',
          projectTitle: 'Dezvoltare Platformă E-commerce',
          freelancerName: 'Alexandru Popescu',
          amount: 15000,
          currency: 'EUR',
          status: 'ACTIVE',
          startDate: '2025-11-01',
          endDate: '2026-01-15',
        },
        {
          id: 'ctr-002',
          projectTitle: 'Migrare Infrastructură Cloud',
          freelancerName: 'Ion Vasilescu',
          amount: 25000,
          currency: 'EUR',
          status: 'COMPLETED',
          startDate: '2025-09-01',
          endDate: '2025-12-01',
        },
      ]);

    } catch (err) {
      console.error('Failed to fetch Freelancer Hub data:', err);
      setError('Eroare la încărcarea datelor');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
      case 'COMPLETED':
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'BUSY':
      case 'IN_PROGRESS':
      case 'PENDING':
        return 'bg-blue-100 text-blue-800';
      case 'OFFLINE':
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'OPEN':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
      case 'DISPUTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'AVAILABLE': 'Disponibil',
      'BUSY': 'Ocupat',
      'OFFLINE': 'Offline',
      'OPEN': 'Deschis',
      'IN_PROGRESS': 'În progres',
      'COMPLETED': 'Finalizat',
      'CANCELLED': 'Anulat',
      'DRAFT': 'Ciornă',
      'PENDING': 'În așteptare',
      'ACTIVE': 'Activ',
      'DISPUTED': 'Disputat',
    };
    return labels[status] || status;
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <div>
            <h3 className="font-medium text-red-900">Eroare</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
          Încearcă din nou
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Freelancer Hub</h1>
          <p className="text-gray-500 mt-1">
            Platformă de colaborare și management proiecte freelance
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md">
            <RefreshCw className="h-5 w-5" />
          </button>
          <button onClick={handleNewProject} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center">
            <Plus className="h-5 w-5 mr-2" />
            Proiect Nou
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Freelanceri</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalFreelancers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600">Proiecte Active</p>
                <p className="text-2xl font-bold text-yellow-900">{stats.activeProjects}</p>
              </div>
              <Briefcase className="h-8 w-8 text-yellow-400" />
            </div>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Finalizate</p>
                <p className="text-2xl font-bold text-green-900">{stats.completedProjects}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Total Plăți</p>
                <p className="text-xl font-bold text-blue-900">{formatAmount(stats.totalEarnings, 'EUR')}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">Rating Mediu</p>
                <div className="flex items-center">
                  <p className="text-2xl font-bold text-purple-900">{stats.avgRating}</p>
                  <Star className="h-5 w-5 text-yellow-400 ml-1 fill-current" />
                </div>
              </div>
              <Award className="h-8 w-8 text-purple-400" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {[
            { key: 'dashboard', label: 'Dashboard', icon: Target },
            { key: 'freelancers', label: 'Freelanceri', icon: Users },
            { key: 'projects', label: 'Proiecte', icon: Briefcase },
            { key: 'contracts', label: 'Contracte', icon: FileText },
            { key: 'payments', label: 'Plăți', icon: CreditCard },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabType)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
          <p className="mt-2 text-gray-500">Se încarcă...</p>
        </div>
      ) : activeTab === 'dashboard' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Projects */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Proiecte Recente</h3>
              <button onClick={() => setActiveTab('projects')} className="text-sm text-blue-600 hover:text-blue-800">
                Vezi toate →
              </button>
            </div>
            <div className="divide-y divide-gray-200">
              {projects.slice(0, 3).map((project) => (
                <div key={project.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{project.title}</p>
                      <p className="text-sm text-gray-500 mt-1">{project.description.slice(0, 60)}...</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm font-medium text-blue-600">
                          {formatAmount(project.budget, project.currency)}
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="text-xs text-gray-500">Deadline: {formatDate(project.deadline)}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                      {getStatusLabel(project.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Freelancers */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Freelanceri Top</h3>
              <button onClick={() => setActiveTab('freelancers')} className="text-sm text-blue-600 hover:text-blue-800">
                Vezi toți →
              </button>
            </div>
            <div className="divide-y divide-gray-200">
              {freelancers.slice(0, 3).map((fl) => (
                <div key={fl.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{fl.name}</p>
                      <p className="text-sm text-gray-500">{fl.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center">
                          <Star className="h-3 w-3 text-yellow-400 fill-current" />
                          <span className="text-xs text-gray-600 ml-1">{fl.rating}</span>
                        </div>
                        <span className="text-gray-300">•</span>
                        <span className="text-xs text-gray-500">{fl.completedProjects} proiecte</span>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(fl.status)}`}>
                      {getStatusLabel(fl.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === 'freelancers' ? (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Caută freelanceri..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <select
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="all">Toate skill-urile</option>
                {allSkills.map((skill) => (
                  <option key={skill} value={skill}>{skill}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {freelancers
              .filter((fl) =>
                (searchQuery === '' || fl.name.toLowerCase().includes(searchQuery.toLowerCase())) &&
                (skillFilter === 'all' || fl.skills.includes(skillFilter))
              )
              .map((fl) => (
                <div key={fl.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                      {fl.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{fl.name}</h4>
                          <p className="text-sm text-gray-500">{fl.title}</p>
                        </div>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(fl.status)}`}>
                          {getStatusLabel(fl.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">{fl.location}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {fl.skills.slice(0, 3).map((skill) => (
                      <span key={skill} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">
                        {skill}
                      </span>
                    ))}
                    {fl.skills.length > 3 && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        +{fl.skills.length - 3}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-sm font-medium ml-1">{fl.rating}</span>
                      </div>
                      <span className="text-xs text-gray-500">{fl.completedProjects} proiecte</span>
                    </div>
                    <span className="text-sm font-medium text-green-600">
                      {formatAmount(fl.hourlyRate, fl.currency)}/oră
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => handleContactFreelancer(fl)} className="flex-1 bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700">
                      Contactează
                    </button>
                    <button onClick={() => handleViewFreelancerProfile(fl.id)} className="px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50">
                      Profil
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ) : activeTab === 'projects' ? (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Proiecte</h3>
            <button onClick={handleNewProject} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center">
              <Plus className="h-5 w-5 mr-2" />
              Proiect Nou
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proiect</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Freelancer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buget</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deadline</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{project.title}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {project.skills.map((skill) => (
                          <span key={skill} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {project.freelancerName || <span className="text-yellow-600">Nealocat</span>}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {formatAmount(project.budget, project.currency)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(project.deadline)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                        {getStatusLabel(project.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex space-x-2">
                        <button onClick={() => handleViewProject(project.id)} className="text-blue-600 hover:text-blue-900" title="Vizualizare">
                          <Eye className="h-5 w-5" />
                        </button>
                        <button onClick={() => handleEditProject(project.id)} className="text-green-600 hover:text-green-900" title="Editare">
                          <Edit className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'contracts' ? (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Contracte</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proiect</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Freelancer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valoare</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Perioadă</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{contract.projectTitle}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{contract.freelancerName}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {formatAmount(contract.amount, contract.currency)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(contract.startDate)} - {contract.endDate ? formatDate(contract.endDate) : 'În curs'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(contract.status)}`}>
                        {getStatusLabel(contract.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex space-x-2">
                        <button onClick={() => handleViewContract(contract.id)} className="text-blue-600 hover:text-blue-900" title="Vizualizare">
                          <Eye className="h-5 w-5" />
                        </button>
                        <button onClick={() => handleDownloadContract(contract)} className="text-gray-600 hover:text-gray-900" title="Descarcă">
                          <Download className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-12 text-gray-500">
            <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Modulul de plăți este în dezvoltare</p>
            <p className="text-sm mt-2">Integrare cu Stripe Escrow pentru plăți sigure</p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
        <h3 className="font-medium text-gray-900 mb-4">Acțiuni Rapide</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button onClick={handleNewProject} className="flex items-center gap-2 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <Plus className="h-5 w-5 text-blue-600" />
            <span className="text-sm">Proiect Nou</span>
          </button>
          <button onClick={handleSearchTalent} className="flex items-center gap-2 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <Users className="h-5 w-5 text-green-600" />
            <span className="text-sm">Caută Talent</span>
          </button>
          <button onClick={handleNewContract} className="flex items-center gap-2 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <FileText className="h-5 w-5 text-purple-600" />
            <span className="text-sm">Contract Nou</span>
          </button>
          <button onClick={handleProcessPayment} className="flex items-center gap-2 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <CreditCard className="h-5 w-5 text-amber-600" />
            <span className="text-sm">Procesare Plată</span>
          </button>
        </div>
      </div>
    </div>
  );
}
