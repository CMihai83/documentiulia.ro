'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/Toast';
import {
  FolderKanban,
  Search,
  Plus,
  Filter,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  ListTodo,
  BarChart3,
  Users,
  Timer,
  ArrowRight,
  MoreHorizontal,
  Play,
  Pause,
  Flag,
  Zap,
  Bug,
  Lightbulb,
  Wrench,
  FileText,
  GripVertical,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';

type TaskStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type TaskType = 'FEATURE' | 'BUG' | 'IMPROVEMENT' | 'TASK' | 'STORY' | 'SPIKE';
type EpicStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
type SprintStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED';

interface Epic {
  id: string;
  code: string;
  name: string;
  description?: string;
  module: string;
  status: EpicStatus;
  progress: number;
  color: string;
  tasksCount: number;
  completedTasks: number;
}

interface Sprint {
  id: string;
  name: string;
  goal?: string;
  epicName: string;
  status: SprintStatus;
  startDate: string;
  endDate: string;
  storyPoints: number;
  completedPoints: number;
  tasksCount: number;
  completedTasks: number;
}

interface Task {
  id: string;
  code: string;
  title: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  storyPoints?: number;
  epicName?: string;
  sprintName?: string;
  assignee?: string;
  assigneeInitials?: string;
  dueDate?: string;
  createdAt: string;
  labels?: string[];
}

// Sample data
const sampleEpics: Epic[] = [
  {
    id: '1',
    code: 'EPIC-001',
    name: 'Modul Financiar',
    description: 'Implementare completă modul facturare și contabilitate',
    module: 'Finance',
    status: 'IN_PROGRESS',
    progress: 65,
    color: '#3b82f6',
    tasksCount: 24,
    completedTasks: 16,
  },
  {
    id: '2',
    code: 'EPIC-002',
    name: 'Integrare ANAF',
    description: 'e-Factura, SAF-T D406 și SPV',
    module: 'Compliance',
    status: 'IN_PROGRESS',
    progress: 45,
    color: '#10b981',
    tasksCount: 18,
    completedTasks: 8,
  },
  {
    id: '3',
    code: 'EPIC-003',
    name: 'Gestiune HR',
    description: 'Contracte, pontaje și salarizare',
    module: 'HR',
    status: 'PLANNED',
    progress: 20,
    color: '#f59e0b',
    tasksCount: 32,
    completedTasks: 6,
  },
  {
    id: '4',
    code: 'EPIC-004',
    name: 'Dashboard și Rapoarte',
    description: 'Rapoarte financiare și analytics',
    module: 'Reports',
    status: 'COMPLETED',
    progress: 100,
    color: '#8b5cf6',
    tasksCount: 15,
    completedTasks: 15,
  },
];

const sampleSprints: Sprint[] = [
  {
    id: '1',
    name: 'Sprint 44',
    goal: 'Finalizare integrare e-Factura și teste automatizate',
    epicName: 'Integrare ANAF',
    status: 'ACTIVE',
    startDate: '2024-12-02',
    endDate: '2024-12-15',
    storyPoints: 34,
    completedPoints: 21,
    tasksCount: 12,
    completedTasks: 7,
  },
  {
    id: '2',
    name: 'Sprint 45',
    goal: 'Implementare SAF-T export și reconciliere bancară',
    epicName: 'Integrare ANAF',
    status: 'PLANNED',
    startDate: '2024-12-16',
    endDate: '2024-12-29',
    storyPoints: 28,
    completedPoints: 0,
    tasksCount: 10,
    completedTasks: 0,
  },
  {
    id: '3',
    name: 'Sprint 43',
    goal: 'Rapoarte financiare și dashboard KPI',
    epicName: 'Dashboard și Rapoarte',
    status: 'COMPLETED',
    startDate: '2024-11-18',
    endDate: '2024-12-01',
    storyPoints: 30,
    completedPoints: 28,
    tasksCount: 11,
    completedTasks: 10,
  },
];

const sampleTasks: Task[] = [
  {
    id: '1',
    code: 'DOC-156',
    title: 'Implementare validare XML e-Factura',
    description: 'Validare structură XML conform specificații ANAF',
    type: 'FEATURE',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    storyPoints: 5,
    epicName: 'Integrare ANAF',
    sprintName: 'Sprint 44',
    assignee: 'Ion Popescu',
    assigneeInitials: 'IP',
    dueDate: '2024-12-14',
    createdAt: '2024-12-10',
    labels: ['backend', 'anaf'],
  },
  {
    id: '2',
    code: 'DOC-157',
    title: 'Teste unitare CashFlowForecastService',
    type: 'TASK',
    status: 'DONE',
    priority: 'MEDIUM',
    storyPoints: 3,
    epicName: 'Dashboard și Rapoarte',
    sprintName: 'Sprint 44',
    assignee: 'Maria Ionescu',
    assigneeInitials: 'MI',
    createdAt: '2024-12-11',
    labels: ['testing'],
  },
  {
    id: '3',
    code: 'DOC-158',
    title: 'Bug: Eroare la export PDF factură',
    description: 'PDF-ul nu se generează pentru facturi cu mai mult de 100 linii',
    type: 'BUG',
    status: 'TODO',
    priority: 'CRITICAL',
    storyPoints: 2,
    epicName: 'Modul Financiar',
    sprintName: 'Sprint 44',
    assignee: 'Andrei Marin',
    assigneeInitials: 'AM',
    dueDate: '2024-12-13',
    createdAt: '2024-12-12',
    labels: ['bug', 'urgent'],
  },
  {
    id: '4',
    code: 'DOC-159',
    title: 'Optimizare query-uri rapoarte lunare',
    type: 'IMPROVEMENT',
    status: 'IN_REVIEW',
    priority: 'MEDIUM',
    storyPoints: 3,
    epicName: 'Dashboard și Rapoarte',
    sprintName: 'Sprint 44',
    assignee: 'Elena Dumitrescu',
    assigneeInitials: 'ED',
    createdAt: '2024-12-09',
    labels: ['performance'],
  },
  {
    id: '5',
    code: 'DOC-160',
    title: 'Implementare endpoint upload documentație',
    type: 'FEATURE',
    status: 'BACKLOG',
    priority: 'LOW',
    storyPoints: 5,
    epicName: 'Modul Financiar',
    createdAt: '2024-12-08',
    labels: ['backend', 'api'],
  },
  {
    id: '6',
    code: 'DOC-161',
    title: 'Design pagină reconciliere bancară',
    type: 'STORY',
    status: 'TODO',
    priority: 'HIGH',
    storyPoints: 8,
    epicName: 'Modul Financiar',
    sprintName: 'Sprint 44',
    assignee: 'Ana Vasilescu',
    assigneeInitials: 'AV',
    dueDate: '2024-12-15',
    createdAt: '2024-12-10',
    labels: ['frontend', 'design'],
  },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const statusColors: Record<TaskStatus, string> = {
  BACKLOG: 'bg-gray-100 text-gray-800',
  TODO: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  IN_REVIEW: 'bg-purple-100 text-purple-800',
  DONE: 'bg-green-100 text-green-800',
};

const statusLabels: Record<TaskStatus, string> = {
  BACKLOG: 'Backlog',
  TODO: 'De făcut',
  IN_PROGRESS: 'În lucru',
  IN_REVIEW: 'Review',
  DONE: 'Finalizat',
};

const priorityColors: Record<TaskPriority, string> = {
  LOW: 'text-gray-500',
  MEDIUM: 'text-blue-500',
  HIGH: 'text-orange-500',
  CRITICAL: 'text-red-500',
};

const typeIcons: Record<TaskType, React.ReactNode> = {
  FEATURE: <Zap className="h-4 w-4 text-purple-500" />,
  BUG: <Bug className="h-4 w-4 text-red-500" />,
  IMPROVEMENT: <TrendingUp className="h-4 w-4 text-green-500" />,
  TASK: <ListTodo className="h-4 w-4 text-blue-500" />,
  STORY: <FileText className="h-4 w-4 text-indigo-500" />,
  SPIKE: <Lightbulb className="h-4 w-4 text-yellow-500" />,
};

const epicStatusColors: Record<EpicStatus, string> = {
  PLANNED: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  ON_HOLD: 'bg-yellow-100 text-yellow-800',
};

const sprintStatusColors: Record<SprintStatus, string> = {
  PLANNED: 'bg-gray-100 text-gray-800',
  ACTIVE: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
};

export default function ProjectsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Calculate statistics
  const activeSprint = sampleSprints.find(s => s.status === 'ACTIVE');
  const stats = {
    totalTasks: sampleTasks.length,
    inProgress: sampleTasks.filter(t => t.status === 'IN_PROGRESS').length,
    completed: sampleTasks.filter(t => t.status === 'DONE').length,
    criticalBugs: sampleTasks.filter(t => t.type === 'BUG' && t.priority === 'CRITICAL').length,
    totalEpics: sampleEpics.length,
    activeEpics: sampleEpics.filter(e => e.status === 'IN_PROGRESS').length,
    totalPoints: sampleTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0),
    completedPoints: sampleTasks.filter(t => t.status === 'DONE').reduce((sum, t) => sum + (t.storyPoints || 0), 0),
  };

  // Velocity data
  const velocityData = [
    { sprint: 'S40', planned: 28, completed: 25 },
    { sprint: 'S41', planned: 30, completed: 28 },
    { sprint: 'S42', planned: 32, completed: 30 },
    { sprint: 'S43', planned: 30, completed: 28 },
    { sprint: 'S44', planned: 34, completed: 21 },
  ];

  // Task distribution by status
  const tasksByStatus = Object.entries(statusLabels).map(([key, label]) => ({
    name: label,
    value: sampleTasks.filter(t => t.status === key).length,
  }));

  // Filter tasks
  const filteredTasks = sampleTasks.filter(task => {
    const matchesSearch = searchQuery === '' ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesType = typeFilter === 'all' || task.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Group tasks by status for Kanban
  const kanbanColumns: Record<TaskStatus, Task[]> = {
    BACKLOG: filteredTasks.filter(t => t.status === 'BACKLOG'),
    TODO: filteredTasks.filter(t => t.status === 'TODO'),
    IN_PROGRESS: filteredTasks.filter(t => t.status === 'IN_PROGRESS'),
    IN_REVIEW: filteredTasks.filter(t => t.status === 'IN_REVIEW'),
    DONE: filteredTasks.filter(t => t.status === 'DONE'),
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ro-RO');
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Action handlers
  const handleOpenCalendar = () => {
    router.push('/dashboard/calendar');
  };

  const handleNewTask = () => {
    router.push('/dashboard/projects/tasks/new');
  };

  const handleAddTaskToColumn = (status: TaskStatus) => {
    router.push(`/dashboard/projects/tasks/new?status=${status}`);
  };

  const handleTaskOptions = (task: Task) => {
    router.push(`/dashboard/projects/tasks/${task.id}/actions`);
  };

  const handleStartSprint = (sprint: Sprint) => {
    router.push(`/dashboard/projects/sprints/${sprint.id}/start`);
  };

  const handleViewEpic = (epic: Epic) => {
    router.push(`/dashboard/projects/epics/${epic.id}`);
  };

  const handleViewTask = (task: Task) => {
    router.push(`/dashboard/projects/tasks/${task.id}`);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestiune Proiecte</h1>
          <p className="text-muted-foreground">
            Administrare epics, sprinturi și taskuri în metodologie Agile
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleOpenCalendar}>
            <Calendar className="mr-2 h-4 w-4" />
            Calendar
          </Button>
          <Button onClick={handleNewTask}>
            <Plus className="mr-2 h-4 w-4" />
            Task Nou
          </Button>
        </div>
      </div>

      {/* Active Sprint Banner */}
      {activeSprint && (
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Target className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">{activeSprint.name}</h3>
                    <Badge className="bg-white/20 hover:bg-white/30">Activ</Badge>
                  </div>
                  <p className="text-blue-100 text-sm">{activeSprint.goal}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{activeSprint.completedPoints}/{activeSprint.storyPoints}</div>
                  <div className="text-xs text-blue-100">Story Points</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{activeSprint.completedTasks}/{activeSprint.tasksCount}</div>
                  <div className="text-xs text-blue-100">Taskuri</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{getDaysRemaining(activeSprint.endDate)}</div>
                  <div className="text-xs text-blue-100">Zile rămase</div>
                </div>
                <div className="w-32">
                  <div className="text-xs text-blue-100 mb-1">Progres</div>
                  <Progress
                    value={(activeSprint.completedPoints / activeSprint.storyPoints) * 100}
                    className="h-2 bg-white/20 [&>div]:bg-white"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">
            <BarChart3 className="mr-2 h-4 w-4" />
            Prezentare
          </TabsTrigger>
          <TabsTrigger value="kanban">
            <FolderKanban className="mr-2 h-4 w-4" />
            Kanban
          </TabsTrigger>
          <TabsTrigger value="backlog">
            <ListTodo className="mr-2 h-4 w-4" />
            Backlog
          </TabsTrigger>
          <TabsTrigger value="epics">
            <Target className="mr-2 h-4 w-4" />
            Epics
          </TabsTrigger>
          <TabsTrigger value="sprints">
            <Timer className="mr-2 h-4 w-4" />
            Sprinturi
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taskuri Active</CardTitle>
                <ListTodo className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.inProgress}</div>
                <p className="text-xs text-muted-foreground">
                  din {stats.totalTasks} total | {stats.completed} finalizate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Story Points</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completedPoints}/{stats.totalPoints}</div>
                <p className="text-xs text-muted-foreground">
                  {((stats.completedPoints / stats.totalPoints) * 100).toFixed(0)}% completat
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Epics Active</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeEpics}</div>
                <p className="text-xs text-muted-foreground">
                  din {stats.totalEpics} total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Buguri Critice</CardTitle>
                <Bug className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stats.criticalBugs > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {stats.criticalBugs}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.criticalBugs > 0 ? 'necesită atenție imediată' : 'niciun bug critic'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Velocitate Sprint</CardTitle>
                <CardDescription>Story points planificate vs. completate</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={velocityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="sprint" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="planned" name="Planificate" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="completed" name="Completate" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribuție Taskuri</CardTitle>
                <CardDescription>După status curent</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={tasksByStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {tasksByStatus.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Epic Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Progres Epics</CardTitle>
              <CardDescription>Starea curentă a epic-urilor active</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sampleEpics.map((epic) => (
                  <div key={epic.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: epic.color }}
                        />
                        <span className="font-medium">{epic.name}</span>
                        <Badge className={epicStatusColors[epic.status]}>
                          {epic.status === 'IN_PROGRESS' ? 'În lucru' :
                           epic.status === 'COMPLETED' ? 'Finalizat' :
                           epic.status === 'ON_HOLD' ? 'În așteptare' : 'Planificat'}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {epic.completedTasks}/{epic.tasksCount} taskuri | {epic.progress}%
                      </span>
                    </div>
                    <Progress value={epic.progress} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Kanban Tab */}
        <TabsContent value="kanban" className="space-y-4">
          <div className="flex gap-4 overflow-x-auto pb-4">
            {(Object.entries(kanbanColumns) as [TaskStatus, Task[]][]).map(([status, tasks]) => (
              <div key={status} className="flex-shrink-0 w-72">
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge className={statusColors[status]}>{statusLabels[status]}</Badge>
                      <span className="text-sm text-muted-foreground">{tasks.length}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleAddTaskToColumn(status)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleViewTask(task)}>
                        <CardContent className="p-3">
                          <div className="flex items-start gap-2 mb-2">
                            {typeIcons[task.type]}
                            <div className="flex-1">
                              <p className="text-sm font-medium line-clamp-2">{task.title}</p>
                              <p className="text-xs text-muted-foreground">{task.code}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              {task.storyPoints && (
                                <Badge variant="outline" className="text-xs">
                                  {task.storyPoints} SP
                                </Badge>
                              )}
                              <Flag className={`h-3 w-3 ${priorityColors[task.priority]}`} />
                            </div>
                            {task.assigneeInitials && (
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">{task.assigneeInitials}</AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                          {task.labels && task.labels.length > 0 && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {task.labels.slice(0, 2).map((label) => (
                                <Badge key={label} variant="secondary" className="text-xs">
                                  {label}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Backlog Tab */}
        <TabsContent value="backlog" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Căutare taskuri..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toate</SelectItem>
                    {Object.entries(statusLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Tip" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toate tipurile</SelectItem>
                    <SelectItem value="FEATURE">Feature</SelectItem>
                    <SelectItem value="BUG">Bug</SelectItem>
                    <SelectItem value="IMPROVEMENT">Improvement</SelectItem>
                    <SelectItem value="TASK">Task</SelectItem>
                    <SelectItem value="STORY">Story</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    {typeIcons[task.type]}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{task.code}</span>
                        <span className="font-medium truncate">{task.title}</span>
                      </div>
                      {task.epicName && (
                        <p className="text-xs text-muted-foreground">{task.epicName}</p>
                      )}
                    </div>
                    <Badge className={statusColors[task.status]}>{statusLabels[task.status]}</Badge>
                    <Flag className={`h-4 w-4 ${priorityColors[task.priority]}`} />
                    {task.storyPoints && (
                      <Badge variant="outline">{task.storyPoints} SP</Badge>
                    )}
                    {task.assigneeInitials && (
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs">{task.assigneeInitials}</AvatarFallback>
                      </Avatar>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleTaskOptions(task)}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Epics Tab */}
        <TabsContent value="epics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {sampleEpics.map((epic) => (
              <Card key={epic.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleViewEpic(epic)}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${epic.color}20` }}
                      >
                        <Target className="h-5 w-5" style={{ color: epic.color }} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{epic.name}</CardTitle>
                        <CardDescription>{epic.code} • {epic.module}</CardDescription>
                      </div>
                    </div>
                    <Badge className={epicStatusColors[epic.status]}>
                      {epic.status === 'IN_PROGRESS' ? 'În lucru' :
                       epic.status === 'COMPLETED' ? 'Finalizat' :
                       epic.status === 'ON_HOLD' ? 'În așteptare' : 'Planificat'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {epic.description && (
                    <p className="text-sm text-muted-foreground mb-4">{epic.description}</p>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Progres</span>
                      <span className="font-medium">{epic.progress}%</span>
                    </div>
                    <Progress value={epic.progress} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                      <span>{epic.completedTasks} din {epic.tasksCount} taskuri</span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Sprints Tab */}
        <TabsContent value="sprints" className="space-y-4">
          <div className="space-y-4">
            {sampleSprints.map((sprint) => (
              <Card key={sprint.id} className={sprint.status === 'ACTIVE' ? 'border-blue-500 border-2' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        sprint.status === 'ACTIVE' ? 'bg-green-100' :
                        sprint.status === 'COMPLETED' ? 'bg-blue-100' :
                        'bg-gray-100'
                      }`}>
                        <Timer className={`h-5 w-5 ${
                          sprint.status === 'ACTIVE' ? 'text-green-600' :
                          sprint.status === 'COMPLETED' ? 'text-blue-600' :
                          'text-gray-600'
                        }`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{sprint.name}</CardTitle>
                        <CardDescription>
                          {formatDate(sprint.startDate)} - {formatDate(sprint.endDate)} • {sprint.epicName}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={sprintStatusColors[sprint.status]}>
                        {sprint.status === 'ACTIVE' ? 'Activ' :
                         sprint.status === 'COMPLETED' ? 'Finalizat' : 'Planificat'}
                      </Badge>
                      {sprint.status === 'PLANNED' && (
                        <Button size="sm" onClick={() => handleStartSprint(sprint)}>
                          <Play className="mr-2 h-3 w-3" />
                          Pornește
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {sprint.goal && (
                    <p className="text-sm text-muted-foreground mb-4">{sprint.goal}</p>
                  )}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-2xl font-bold">
                        {sprint.completedPoints}/{sprint.storyPoints}
                      </div>
                      <div className="text-xs text-muted-foreground">Story Points</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {sprint.completedTasks}/{sprint.tasksCount}
                      </div>
                      <div className="text-xs text-muted-foreground">Taskuri</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {sprint.status === 'COMPLETED' ? '100' :
                         Math.round((sprint.completedPoints / sprint.storyPoints) * 100)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Completat</div>
                    </div>
                  </div>
                  <Progress
                    value={(sprint.completedPoints / sprint.storyPoints) * 100}
                    className="h-2 mt-4"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
