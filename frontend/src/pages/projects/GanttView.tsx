import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

interface Task {
  id: string;
  title: string;
  name?: string;
  task_title?: string;
  start_date: string | null;
  due_date: string | null;
  status: string;
  priority: string;
  assignee_name: string | null;
  epic_name: string | null;
  epic_color: string | null;
  story_points: number | null;
  progress?: number;
}

interface Sprint {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface Epic {
  id: string;
  name: string;
  color: string;
  start_date: string | null;
  target_date: string | null;
}

type ViewMode = 'day' | 'week' | 'month';

export default function GanttView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project_id');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [showTasks, setShowTasks] = useState(true);
  const [showSprints, setShowSprints] = useState(true);
  const [showEpics, setShowEpics] = useState(true);

  useEffect(() => {
    if (projectId) {
      fetchData();
    }
  }, [projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const headers = {
        'Authorization': `Bearer ${token}`,
        'X-Company-ID': companyId || ''
      };

      // Fetch tasks
      const tasksRes = await fetch(
        `https://documentiulia.ro/api/v1/tasks/tasks.php?project_id=${projectId}`,
        { headers }
      );
      const tasksData = await tasksRes.json();

      // Fetch sprints
      const sprintsRes = await fetch(
        `https://documentiulia.ro/api/v1/sprints/sprints.php?project_id=${projectId}`,
        { headers }
      );
      const sprintsData = await sprintsRes.json();

      // Fetch epics
      const epicsRes = await fetch(
        `https://documentiulia.ro/api/v1/epics/epics.php?project_id=${projectId}`,
        { headers }
      );
      const epicsData = await epicsRes.json();

      if (tasksData.success) {
        setTasks(tasksData.data.filter((t: Task) => t.start_date && t.due_date));
      }

      if (sprintsData.success) {
        setSprints(sprintsData.data || []);
      }

      if (epicsData.success) {
        setEpics(epicsData.data.filter((e: Epic) => e.start_date && e.target_date));
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load timeline data');
      setLoading(false);
    }
  };

  const getTaskTitle = (task: Task): string => {
    return task.task_title || task.title || task.name || 'Untitled';
  };

  // Calculate date range for the timeline
  const getDateRange = () => {
    const allDates: Date[] = [];

    if (showTasks) {
      tasks.forEach(task => {
        if (task.start_date) allDates.push(new Date(task.start_date));
        if (task.due_date) allDates.push(new Date(task.due_date));
      });
    }

    if (showSprints) {
      sprints.forEach(sprint => {
        allDates.push(new Date(sprint.start_date));
        allDates.push(new Date(sprint.end_date));
      });
    }

    if (showEpics) {
      epics.forEach(epic => {
        if (epic.start_date) allDates.push(new Date(epic.start_date));
        if (epic.target_date) allDates.push(new Date(epic.target_date));
      });
    }

    if (allDates.length === 0) {
      const today = new Date();
      return {
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: new Date(today.getFullYear(), today.getMonth() + 3, 0)
      };
    }

    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

    // Add padding
    const padding = 7 * 24 * 60 * 60 * 1000; // 7 days
    return {
      start: new Date(minDate.getTime() - padding),
      end: new Date(maxDate.getTime() + padding)
    };
  };

  const dateRange = getDateRange();
  const totalDays = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));

  // Generate timeline columns based on view mode
  const generateTimelineColumns = () => {
    const columns: { date: Date; label: string }[] = [];
    const current = new Date(dateRange.start);

    while (current <= dateRange.end) {
      if (viewMode === 'day') {
        columns.push({
          date: new Date(current),
          label: current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        });
        current.setDate(current.getDate() + 1);
      } else if (viewMode === 'week') {
        columns.push({
          date: new Date(current),
          label: `Week ${Math.ceil(current.getDate() / 7)}, ${current.toLocaleDateString('en-US', { month: 'short' })}`
        });
        current.setDate(current.getDate() + 7);
      } else {
        columns.push({
          date: new Date(current),
          label: current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        });
        current.setMonth(current.getMonth() + 1);
      }
    }

    return columns;
  };

  const timelineColumns = generateTimelineColumns();

  // Calculate bar position and width
  const calculateBarMetrics = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const startOffset = Math.max(0, (start.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

    const left = (startOffset / totalDays) * 100;
    const width = (duration / totalDays) * 100;

    return { left: `${left}%`, width: `${Math.max(width, 0.5)}%` };
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      backlog: '#9CA3AF',
      todo: '#3B82F6',
      in_progress: '#F59E0B',
      in_review: '#8B5CF6',
      testing: '#F97316',
      blocked: '#EF4444',
      done: '#10B981'
    };
    return colors[status] || '#6B7280';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      critical: '#DC2626',
      high: '#F97316',
      medium: '#FBBF24',
      low: '#3B82F6'
    };
    return colors[priority] || '#6B7280';
  };

  if (!projectId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">No project selected</p>
          <button
            onClick={() => navigate('/projects')}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Go to Projects
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading timeline...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => navigate('/projects')}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/projects')}
          className="text-gray-600 hover:text-gray-900 mb-2"
        >
          ← Back to Projects
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Project Timeline</h1>
            <p className="text-gray-600 mt-1">Gantt chart view of tasks, sprints, and epics</p>
          </div>

          {/* View Controls */}
          <div className="flex items-center gap-4">
            {/* View Mode Selector */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1 rounded ${
                  viewMode === 'day'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 rounded ${
                  viewMode === 'week'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1 rounded ${
                  viewMode === 'month'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Month
              </button>
            </div>

            {/* Layer Toggles */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={showEpics}
                  onChange={(e) => setShowEpics(e.target.checked)}
                  className="rounded"
                />
                Epics
              </label>
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={showSprints}
                  onChange={(e) => setShowSprints(e.target.checked)}
                  className="rounded"
                />
                Sprints
              </label>
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={showTasks}
                  onChange={(e) => setShowTasks(e.target.checked)}
                  className="rounded"
                />
                Tasks
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[1200px]">
            {/* Timeline Header */}
            <div className="flex border-b border-gray-200 bg-gray-50">
              <div className="w-64 flex-shrink-0 p-4 font-semibold border-r border-gray-200">
                Item
              </div>
              <div className="flex-1 relative">
                <div className="flex">
                  {timelineColumns.map((col, idx) => (
                    <div
                      key={idx}
                      className="flex-1 p-2 text-center text-xs font-medium text-gray-600 border-r border-gray-200"
                    >
                      {col.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Today Marker */}
            <div className="relative">
              {(() => {
                const today = new Date();
                const todayOffset = (today.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
                const todayPosition = (todayOffset / totalDays) * 100;

                if (todayPosition >= 0 && todayPosition <= 100) {
                  return (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
                      style={{ left: `calc(16rem + ${todayPosition}%)` }}
                    >
                      <div className="absolute -top-6 left-0 transform -translate-x-1/2 text-xs text-red-500 font-semibold whitespace-nowrap">
                        Today
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Epics Section */}
              {showEpics && epics.length > 0 && (
                <div>
                  <div className="bg-purple-50 px-4 py-2 font-semibold text-sm border-b border-gray-200">
                    Epics
                  </div>
                  {epics.map((epic) => (
                    <div key={epic.id} className="flex border-b border-gray-100 hover:bg-gray-50">
                      <div className="w-64 flex-shrink-0 p-3 border-r border-gray-200">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: epic.color }}
                          ></div>
                          <span className="text-sm font-medium truncate">{epic.name}</span>
                        </div>
                      </div>
                      <div className="flex-1 relative p-3">
                        {epic.start_date && epic.target_date && (
                          <div
                            className="absolute h-6 rounded-lg flex items-center px-2 text-xs text-white font-medium cursor-pointer hover:opacity-90 transition-opacity"
                            style={{
                              ...calculateBarMetrics(epic.start_date, epic.target_date),
                              backgroundColor: epic.color,
                              top: '0.75rem'
                            }}
                          >
                            <span className="truncate">{epic.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Sprints Section */}
              {showSprints && sprints.length > 0 && (
                <div>
                  <div className="bg-blue-50 px-4 py-2 font-semibold text-sm border-b border-gray-200">
                    Sprints
                  </div>
                  {sprints.map((sprint) => (
                    <div key={sprint.id} className="flex border-b border-gray-100 hover:bg-gray-50">
                      <div className="w-64 flex-shrink-0 p-3 border-r border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🚀</span>
                          <span className="text-sm font-medium truncate">{sprint.name}</span>
                        </div>
                      </div>
                      <div className="flex-1 relative p-3">
                        <div
                          className="absolute h-8 bg-blue-500 bg-opacity-20 border-2 border-blue-500 rounded-lg flex items-center px-2 text-xs font-medium cursor-pointer hover:bg-opacity-30 transition-colors"
                          style={{
                            ...calculateBarMetrics(sprint.start_date, sprint.end_date),
                            top: '0.5rem'
                          }}
                        >
                          <span className="truncate text-blue-700">{sprint.name}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tasks Section */}
              {showTasks && tasks.length > 0 && (
                <div>
                  <div className="bg-green-50 px-4 py-2 font-semibold text-sm border-b border-gray-200">
                    Tasks
                  </div>
                  {tasks.map((task) => (
                    <div key={task.id} className="flex border-b border-gray-100 hover:bg-gray-50">
                      <div className="w-64 flex-shrink-0 p-3 border-r border-gray-200">
                        <div className="text-sm truncate">{getTaskTitle(task)}</div>
                        <div className="flex items-center gap-2 mt-1">
                          {task.epic_name && (
                            <span
                              className="text-xs px-1 py-0.5 rounded text-white"
                              style={{ backgroundColor: task.epic_color || '#6366f1' }}
                            >
                              {task.epic_name}
                            </span>
                          )}
                          {task.assignee_name && (
                            <span className="text-xs text-gray-500">
                              👤 {task.assignee_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 relative p-3">
                        {task.start_date && task.due_date && (
                          <div
                            className="absolute h-6 rounded flex items-center px-2 text-xs text-white font-medium cursor-pointer hover:opacity-90 transition-opacity"
                            style={{
                              ...calculateBarMetrics(task.start_date, task.due_date),
                              backgroundColor: getStatusColor(task.status),
                              top: '0.75rem'
                            }}
                            title={`${task.status.toUpperCase()} - ${task.priority}`}
                          >
                            {task.story_points && (
                              <span className="mr-1">{task.story_points} pts</span>
                            )}
                            <div
                              className="h-1 bg-white bg-opacity-30 rounded flex-1"
                              style={{
                                width: task.progress ? `${task.progress}%` : '0%'
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {tasks.length === 0 && sprints.length === 0 && epics.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-600">No timeline data available</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Create tasks, sprints, or epics with dates to see them on the timeline
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold mb-3">Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs font-medium mb-2">Task Status</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: getStatusColor('todo') }}></div>
                To Do
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: getStatusColor('in_progress') }}></div>
                In Progress
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: getStatusColor('done') }}></div>
                Done
              </div>
            </div>
          </div>
          <div>
            <div className="text-xs font-medium mb-2">Priority</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: getPriorityColor('critical') }}></div>
                Critical
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: getPriorityColor('high') }}></div>
                High
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: getPriorityColor('low') }}></div>
                Low
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
