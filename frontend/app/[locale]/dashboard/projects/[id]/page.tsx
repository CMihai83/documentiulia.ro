'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  DollarSign,
  Users,
  Target,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  FileText,
  MessageSquare,
  TrendingUp,
  BarChart3
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  client: string;
  description: string;
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  progress: number;
  status: 'planning' | 'active' | 'on_hold' | 'completed';
  priority: 'low' | 'medium' | 'high';
  team: string[];
  objectives: string;
  tasks: Task[];
  activities: Activity[];
}

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'completed';
  assignee: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
}

interface Activity {
  id: string;
  type: 'note' | 'update' | 'milestone';
  title: string;
  description: string;
  createdAt: string;
  createdBy: string;
}

// Mock data for demonstration
const mockProject: Project = {
  id: '1',
  name: 'Implementare ERP',
  client: 'SC Tech SRL',
  description: 'Implementare sistem ERP complet pentru managementul operațiunilor financiare și logistice.',
  startDate: '2025-01-15',
  endDate: '2025-06-30',
  budget: 45000,
  spent: 28000,
  progress: 65,
  status: 'active',
  priority: 'high',
  team: ['Maria Popescu', 'Ion Vasilescu'],
  objectives: 'Digitalizare completă a proceselor contabile și logistice.',
  tasks: [
    { id: '1', title: 'Analiză cerințe', status: 'completed', assignee: 'Maria Popescu', dueDate: '2025-02-01', priority: 'high' },
    { id: '2', title: 'Configurare sistem', status: 'in_progress', assignee: 'Ion Vasilescu', dueDate: '2025-03-15', priority: 'high' },
    { id: '3', title: 'Training utilizatori', status: 'todo', assignee: 'Maria Popescu', dueDate: '2025-05-01', priority: 'medium' },
  ],
  activities: [
    { id: '1', type: 'milestone', title: 'Kickoff meeting', description: 'Întâlnire inițială cu echipa client', createdAt: '2025-01-20', createdBy: 'Project Manager' },
    { id: '2', type: 'update', title: 'Progress update', description: 'S-a finalizat faza de analiză', createdAt: '2025-02-15', createdBy: 'Maria Popescu' },
  ]
};

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const fetchProject = async () => {
      try {
        // In real app, fetch from API
        // const response = await fetch(`/api/v1/projects/${params.id}`);
        // const data = await response.json();
        // setProject(data);

        // For demo, use mock data
        setTimeout(() => {
          setProject(mockProject);
          setLoading(false);
        }, 500);
      } catch (err) {
        console.error('Failed to fetch project:', err);
        setLoading(false);
      }
    };

    if (params.id) {
      fetchProject();
    }
  }, [params.id]);

  const getStatusColor = (status: string) => {
    const colors = {
      planning: 'bg-gray-100 text-gray-800',
      active: 'bg-blue-100 text-blue-800',
      on_hold: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800'
    };
    return colors[status as keyof typeof colors] || colors.planning;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-600',
      medium: 'bg-yellow-100 text-yellow-600',
      high: 'bg-red-100 text-red-600'
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Proiect negăsit</h3>
          <p className="text-gray-500">Proiectul căutat nu există sau a fost șters.</p>
          <Link
            href="/dashboard/projects"
            className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Înapoi la Proiecte
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard/projects"
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Înapoi la Proiecte
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-gray-500">{project.client}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(project.status)}`}>
            {project.status === 'planning' ? 'Planificare' :
             project.status === 'active' ? 'Activ' :
             project.status === 'on_hold' ? 'În așteptare' : 'Finalizat'}
          </span>
          <button className="p-2 text-gray-400 hover:text-gray-600">
            <Edit className="w-5 h-5" />
          </button>
          <button className="p-2 text-red-400 hover:text-red-600">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Project Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <Target className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Progres</p>
              <p className="text-2xl font-bold text-gray-900">{project.progress}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Buget</p>
              <p className="text-2xl font-bold text-gray-900">{project.budget.toLocaleString()} RON</p>
              <p className="text-sm text-gray-500">{project.spent.toLocaleString()} cheltuit</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Echipă</p>
              <p className="text-2xl font-bold text-gray-900">{project.team.length}</p>
              <p className="text-sm text-gray-500">membri</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Termen</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Date(project.endDate).toLocaleDateString('ro-RO')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Project Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Descriere</h3>
            <p className="text-gray-600">{project.description}</p>
          </div>

          {/* Objectives */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Obiective</h3>
            <p className="text-gray-600">{project.objectives}</p>
          </div>

          {/* Tasks */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Sarcini</h3>
              <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
                <Plus className="w-4 h-4" />
                Adaugă Sarcină
              </button>
            </div>
            <div className="space-y-3">
              {project.tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getTaskStatusIcon(task.status)}
                    <div>
                      <p className="font-medium text-gray-900">{task.title}</p>
                      <p className="text-sm text-gray-500">
                        {task.assignee} • Scadent: {new Date(task.dueDate).toLocaleDateString('ro-RO')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority === 'high' ? 'Înaltă' : task.priority === 'medium' ? 'Medie' : 'Scăzută'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activities */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Activități Recente</h3>
              <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700">
                <MessageSquare className="w-4 h-4" />
                Adaugă Notă
              </button>
            </div>
            <div className="space-y-4">
              {project.activities.map((activity) => (
                <div key={activity.id} className="flex space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{activity.title}</p>
                    <p className="text-sm text-gray-600">{activity.description}</p>
                    <p className="text-xs text-gray-500">
                      {activity.createdBy} • {new Date(activity.createdAt).toLocaleDateString('ro-RO')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Team */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Echipă</h3>
            <div className="space-y-3">
              {project.team.map((member, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-gray-600" />
                  </div>
                  <span className="text-sm text-gray-900">{member}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Project Info */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Informații Proiect</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-600">Prioritate</p>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(project.priority)}`}>
                  {project.priority === 'high' ? 'Înaltă' : project.priority === 'medium' ? 'Medie' : 'Scăzută'}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Data Început</p>
                <p className="text-sm text-gray-900">{new Date(project.startDate).toLocaleDateString('ro-RO')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Data Finalizare</p>
                <p className="text-sm text-gray-900">{new Date(project.endDate).toLocaleDateString('ro-RO')}</p>
              </div>
            </div>
          </div>

          {/* Progress Chart Placeholder */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Progres</h3>
            <div className="h-32 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <BarChart3 className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">Grafic progres</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}