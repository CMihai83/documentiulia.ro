'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Calculator, Package, Users, Banknote, Brain,
  Shield, Activity, Globe, Rocket, CreditCard,
  CheckCircle2, Clock, AlertCircle
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Calculator, Package, Users, Banknote, Brain,
  Shield, Activity, Globe, Rocket, CreditCard,
};

interface Epic {
  code: string;
  name: string;
  module: string;
  progress: number;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
  taskStats: {
    total: number;
    done: number;
    inProgress: number;
  };
}

interface RoadmapData {
  epics: Epic[];
  activeSprint: {
    name: string;
    goal?: string;
    tasks: { title: string; status: string; priority: string }[];
  } | null;
  backlogCount: number;
  velocity: number;
}

const statusColors: Record<string, string> = {
  PLANNED: 'bg-gray-500',
  IN_PROGRESS: 'bg-blue-500',
  COMPLETED: 'bg-green-500',
  ON_HOLD: 'bg-yellow-500',
};

const epicColors: Record<string, string> = {
  FINANCE: '#10B981',
  OPERATIONS: '#3B82F6',
  HR: '#8B5CF6',
  FUNDS: '#F59E0B',
  AI_ML: '#EC4899',
  COMPLIANCE: '#EF4444',
  OPERATIONS_CONTROL: '#14B8A6',
  ECOSYSTEM: '#6366F1',
  ONBOARDING: '#84CC16',
  PRICING_SUPPORT: '#F97316',
};

export default function RoadmapPage() {
  const [data, setData] = useState<RoadmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRoadmap() {
      try {
        const res = await fetch('/api/project/roadmap');
        if (!res.ok) throw new Error('Failed to fetch roadmap');
        const roadmap = await res.json();
        setData(roadmap);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchRoadmap();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">Error: {error}</p>
            <p className="text-sm text-gray-500 mt-2">
              Make sure the backend is running and epics are seeded.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Product Roadmap</h1>
          <p className="text-muted-foreground">
            10 module epics - 60+ functionalities
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-500" />
            <span>Velocity: {data?.velocity || 0} pts/sprint</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-500" />
            <span>Backlog: {data?.backlogCount || 0} items</span>
          </div>
        </div>
      </div>

      {data?.activeSprint && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-blue-600" />
              Active Sprint: {data.activeSprint.name}
            </CardTitle>
            {data.activeSprint.goal && (
              <p className="text-sm text-muted-foreground">{data.activeSprint.goal}</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.activeSprint.tasks?.slice(0, 5).map((task, i) => (
                <Badge
                  key={i}
                  variant={task.status === 'DONE' ? 'default' : 'secondary'}
                  className={task.status === 'DONE' ? 'bg-green-600' : ''}
                >
                  {task.title}
                </Badge>
              ))}
              {(data.activeSprint.tasks?.length || 0) > 5 && (
                <Badge variant="outline">+{data.activeSprint.tasks.length - 5} more</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {data?.epics.map((epic) => {
          const IconComponent = ICON_MAP[epic.code === 'AI_ML' ? 'Brain' :
            epic.code === 'OPS_CTRL' ? 'Activity' :
            epic.code === 'ONBOARD' ? 'Rocket' :
            epic.code === 'PRICING' ? 'CreditCard' :
            epic.code.charAt(0).toUpperCase() + epic.code.slice(1).toLowerCase()] || Calculator;

          return (
            <Card
              key={epic.code}
              className="relative overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div
                className="absolute top-0 left-0 w-1 h-full"
                style={{ backgroundColor: epicColors[epic.module] || '#3B82F6' }}
              />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span style={{ color: epicColors[epic.module] || '#3B82F6' }}>
                      <IconComponent className="h-5 w-5" />
                    </span>
                    <CardTitle className="text-sm font-medium">{epic.code}</CardTitle>
                  </div>
                  <Badge
                    className={`${statusColors[epic.status]} text-white text-xs`}
                  >
                    {epic.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{epic.name}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span>Progress</span>
                    <span className="font-medium">{epic.progress}%</span>
                  </div>
                  <Progress value={epic.progress} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      {epic.taskStats.done} done
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-blue-500" />
                      {epic.taskStats.inProgress} active
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 text-gray-400" />
                      {epic.taskStats.total - epic.taskStats.done - epic.taskStats.inProgress} todo
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Module Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            {[
              { label: 'Total Epics', value: data?.epics.length || 0 },
              { label: 'Completed', value: data?.epics.filter(e => e.status === 'COMPLETED').length || 0 },
              { label: 'In Progress', value: data?.epics.filter(e => e.status === 'IN_PROGRESS').length || 0 },
              { label: 'Planned', value: data?.epics.filter(e => e.status === 'PLANNED').length || 0 },
              { label: 'Avg Progress', value: `${Math.round((data?.epics.reduce((a, e) => a + e.progress, 0) || 0) / (data?.epics.length || 1))}%` },
            ].map((stat, i) => (
              <div key={i} className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
