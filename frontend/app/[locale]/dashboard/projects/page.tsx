'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FolderKanban,
  Plus,
  Search,
  Calendar,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Target,
  TrendingUp,
  BarChart3
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  client: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed';
  progress: number;
  budget: number;
  spent: number;
  team: string[];
  tasksCompleted: number;
  tasksTotal: number;
  priority: 'low' | 'medium' | 'high';
}

const projects: Project[] = [
  { id: '1', name: 'Implementare ERP', client: 'SC Tech SRL', status: 'active', progress: 65, budget: 45000, spent: 28000, team: ['Maria P.', 'Ion D.'], tasksCompleted: 32, tasksTotal: 50, priority: 'high' },
  { id: '2', name: 'Migrare Cloud', client: 'ABC Industries', status: 'active', progress: 40, budget: 85000, spent: 32000, team: ['Andrei M.'], tasksCompleted: 18, tasksTotal: 45, priority: 'high' },
  { id: '3', name: 'Website Redesign', client: 'Fashion Store', status: 'planning', progress: 10, budget: 15000, spent: 1500, team: ['Diana C.'], tasksCompleted: 3, tasksTotal: 25, priority: 'medium' },
  { id: '4', name: 'Integrare e-Factura', client: 'Logistics Pro', status: 'completed', progress: 100, budget: 12000, spent: 11500, team: ['Ion D.'], tasksCompleted: 20, tasksTotal: 20, priority: 'high' }
];

export default function ProjectsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    completed: projects.filter(p => p.status === 'completed').length,
    totalBudget: projects.reduce((sum, p) => sum + p.budget, 0)
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON', minimumFractionDigits: 0 }).format(value);

  const getStatusBadge = (status: Project['status']) => {
    const styles = {
      planning: 'bg-purple-100 text-purple-700',
      active: 'bg-blue-100 text-blue-700',
      on_hold: 'bg-amber-100 text-amber-700',
      completed: 'bg-green-100 text-green-700'
    };
    const labels = { planning: 'Planificare', active: 'Activ', on_hold: 'In asteptare', completed: 'Finalizat' };
    return <span className={`px-2 py-1 text-xs rounded-full font-medium ${styles[status]}`}>{labels[status]}</span>;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Management Proiecte</h1>
          <p className="text-gray-500">Urmariti si gestionati toate proiectele</p>
        </div>
        <button onClick={() => router.push('/dashboard/projects/new')} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          <Plus className="w-4 h-4" />Proiect Nou
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between"><span className="text-sm text-gray-500">Total</span><FolderKanban className="w-5 h-5 text-blue-500" /></div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between"><span className="text-sm text-gray-500">Active</span><Target className="w-5 h-5 text-green-500" /></div>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between"><span className="text-sm text-gray-500">Finalizate</span><CheckCircle2 className="w-5 h-5 text-emerald-500" /></div>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.completed}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between"><span className="text-sm text-gray-500">Buget Total</span><BarChart3 className="w-5 h-5 text-purple-500" /></div>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(stats.totalBudget)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="relative">
          <input type="text" placeholder="Cauta proiecte..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg" />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
      </div>

      <div className="space-y-4">
        {projects.map((project) => (
          <div key={project.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition cursor-pointer" onClick={() => router.push('/dashboard/projects/' + project.id)}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">{project.name}</h3>
                <p className="text-sm text-gray-500">{project.client}</p>
              </div>
              {getStatusBadge(project.status)}
            </div>
            <div className="grid md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Progres</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: project.progress + '%' }} />
                  </div>
                  <span className="text-sm font-medium">{project.progress}%</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Buget</p>
                <p className="text-sm"><span className="font-medium">{formatCurrency(project.spent)}</span> / {formatCurrency(project.budget)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Echipa</p>
                <p className="text-sm flex items-center gap-1"><Users className="w-4 h-4 text-gray-400" />{project.team.join(', ')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Sarcini</p>
                <p className="text-sm">{project.tasksCompleted} / {project.tasksTotal} complete</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
