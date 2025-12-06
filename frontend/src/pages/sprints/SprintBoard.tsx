import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import BurndownChart from '../../components/sprints/BurndownChart';

interface Task {
  id: string;
  task_title: string;
  title?: string;
  name?: string;
  description: string;
  status: string;
  priority: string;
  type: string;
  story_points: number | null;
  assignee_name: string | null;
  epic_name: string | null;
  epic_color: string | null;
  position: number;
}

interface BoardData {
  board: {
    backlog: Task[];
    todo: Task[];
    in_progress: Task[];
    in_review: Task[];
    testing: Task[];
    blocked: Task[];
    done: Task[];
  };
  summary: {
    total_tasks: number;
    total_story_points: number;
    completed_story_points: number;
    completion_percentage: number;
  };
}

interface Sprint {
  id: string;
  name: string;
  goal: string;
  start_date: string;
  end_date: string;
  status: string;
  capacity: number | null;
  days_elapsed: number;
  days_remaining: number;
}

const STATUS_COLUMNS = [
  { id: 'backlog', title: 'Backlog', color: 'bg-gray-100' },
  { id: 'todo', title: 'To Do', color: 'bg-blue-100' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-yellow-100' },
  { id: 'in_review', title: 'In Review', color: 'bg-purple-100' },
  { id: 'testing', title: 'Testing', color: 'bg-orange-100' },
  { id: 'blocked', title: 'Blocked', color: 'bg-red-100' },
  { id: 'done', title: 'Done', color: 'bg-green-100' }
];

const PRIORITY_COLORS = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500'
};

const TYPE_ICONS = {
  story: '📖',
  bug: '🐛',
  task: '✓',
  subtask: '↳',
  spike: '⚡'
};

function TaskCard({ task, isDragging = false }: { task: Task; isDragging?: boolean }) {
  const getTaskTitle = (task: Task): string => {
    return task.task_title || task.title || task.name || 'Untitled';
  };

  const getPriorityBadge = (priority: string) => {
    const colorClass = PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] || 'bg-gray-500';
    return (
      <span className={`px-2 py-1 text-xs font-semibold text-white rounded ${colorClass}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  return (
    <div
      className={`bg-white p-3 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-move ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg">
          {TYPE_ICONS[task.type as keyof typeof TYPE_ICONS] || '📝'}
        </span>
        {getPriorityBadge(task.priority)}
      </div>

      <h4 className="font-medium text-gray-900 text-sm mb-1">
        {getTaskTitle(task)}
      </h4>

      {task.epic_name && (
        <div className="mb-2">
          <span
            className="text-xs px-2 py-1 rounded"
            style={{
              backgroundColor: task.epic_color || '#6366f1',
              color: 'white'
            }}
          >
            {task.epic_name}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
        {task.story_points && (
          <span className="font-semibold">{task.story_points} pts</span>
        )}
        {task.assignee_name && (
          <span className="truncate max-w-[120px]">
            👤 {task.assignee_name}
          </span>
        )}
      </div>
    </div>
  );
}

function SortableTaskCard({ task }: { task: Task }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} isDragging={isDragging} />
    </div>
  );
}

export default function SprintBoard() {
  const { sprintId } = useParams<{ sprintId: string }>();
  const navigate = useNavigate();
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [showBurndown, setShowBurndown] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    fetchSprintData();
    fetchBoardData();
  }, [sprintId]);

  const fetchSprintData = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const response = await fetch(
        `https://documentiulia.ro/api/v1/sprints/sprints.php?id=${sprintId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Company-ID': companyId || ''
          }
        }
      );

      const result = await response.json();
      if (result.success) {
        setSprint(result.data);
      }
    } catch (err) {
      console.error('Error fetching sprint:', err);
    }
  };

  const fetchBoardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const response = await fetch(
        `https://documentiulia.ro/api/v1/tasks/board.php?sprint_id=${sprintId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Company-ID': companyId || ''
          }
        }
      );

      const result = await response.json();
      if (result.success) {
        setBoardData(result.data);
      } else {
        setError(result.error || 'Failed to load board');
      }
    } catch (err) {
      setError('Failed to load sprint board');
      console.error('Error fetching board:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = findTaskById(active.id as string);
    setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || !boardData) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;

    // Find current status
    const task = findTaskById(taskId);
    if (!task || task.status === newStatus) return;

    // Update task on server
    try {
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const response = await fetch(
        'https://documentiulia.ro/api/v1/tasks/position.php',
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Company-ID': companyId || '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: taskId,
            position: 0,
            status: newStatus
          })
        }
      );

      const result = await response.json();
      if (result.success) {
        fetchBoardData();
      } else {
        alert('Failed to update task');
      }
    } catch (err) {
      console.error('Error updating task:', err);
      alert('Failed to update task');
    }
  };

  const findTaskById = (id: string): Task | null => {
    if (!boardData) return null;

    for (const column of STATUS_COLUMNS) {
      const tasks = boardData.board[column.id as keyof typeof boardData.board];
      const task = tasks.find((t: Task) => t.id === id);
      if (task) return task;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading sprint board...</p>
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
            onClick={() => navigate('/sprints')}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Back to Sprints
          </button>
        </div>
      </div>
    );
  }

  if (!boardData || !sprint) return null;

  const completionPercentage = boardData.summary.completion_percentage || 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Sprint Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate('/projects')}
              className="text-gray-600 hover:text-gray-900 mb-2"
            >
              ← Back to Projects
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{sprint.name}</h1>
            {sprint.goal && (
              <p className="text-gray-600 mt-1">🎯 {sprint.goal}</p>
            )}
          </div>
          <div className="text-right flex items-start gap-4">
            <button
              onClick={() => setShowBurndown(!showBurndown)}
              className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                showBurndown
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-600'
              }`}
            >
              {showBurndown ? '📊 Hide' : '📊 Show'} Burndown Chart
            </button>
            <div>
              <div className="text-sm text-gray-600">
                {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {sprint.days_elapsed} days elapsed • {sprint.days_remaining} days remaining
              </div>
            </div>
          </div>
        </div>

        {/* Sprint Metrics */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Tasks</div>
            <div className="text-2xl font-bold">{boardData.summary.total_tasks}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Story Points</div>
            <div className="text-2xl font-bold">
              {boardData.summary.completed_story_points} / {boardData.summary.total_story_points}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Completion</div>
            <div className="text-2xl font-bold">{completionPercentage.toFixed(1)}%</div>
          </div>
          {sprint.capacity && (
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Capacity</div>
              <div className="text-2xl font-bold">{sprint.capacity} pts</div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-green-500 h-4 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(completionPercentage, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Burndown Chart */}
      {showBurndown && sprintId && (
        <div className="mb-6">
          <BurndownChart sprintId={sprintId} />
        </div>
      )}

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-7 gap-4 overflow-x-auto pb-4">
          {STATUS_COLUMNS.map((column) => {
            const tasks = boardData.board[column.id as keyof typeof boardData.board] || [];
            const columnPoints = tasks.reduce((sum, task) => sum + (task.story_points || 0), 0);

            return (
              <SortableContext
                key={column.id}
                id={column.id}
                items={tasks.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div
                  className={`flex flex-col rounded-lg ${column.color} p-3 min-w-[250px] min-h-[500px]`}
                >
                  {/* Column Header */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">{column.title}</h3>
                      <span className="text-xs bg-white px-2 py-1 rounded-full">
                        {tasks.length}
                      </span>
                    </div>
                    {columnPoints > 0 && (
                      <div className="text-xs text-gray-600 mt-1">
                        {columnPoints} pts
                      </div>
                    )}
                  </div>

                  {/* Tasks */}
                  <div className="space-y-2 flex-1">
                    {tasks.map((task) => (
                      <SortableTaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </div>
              </SortableContext>
            );
          })}
        </div>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
