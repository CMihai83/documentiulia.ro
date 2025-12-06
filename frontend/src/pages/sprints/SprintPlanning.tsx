import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useProject } from '../../contexts/ProjectContext';
import ProjectSelector from '../../components/project/ProjectSelector';

interface Task {
  id: string;
  title: string;
  name?: string;
  task_title?: string;
  description: string;
  priority: string;
  type: string;
  story_points: number | null;
  assignee_name: string | null;
  epic_name: string | null;
  epic_color: string | null;
  estimated_hours: number | null;
}

interface Project {
  id: string;
  name: string;
}

type WizardStep = 'config' | 'selection' | 'review';

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

export default function SprintPlanning() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlProjectId = searchParams.get('project_id');
  const { activeProject } = useProject();

  // Use URL parameter first, fallback to active project from context
  const projectId = urlProjectId || activeProject?.id;

  const [currentStep, setCurrentStep] = useState<WizardStep>('config');
  const [project, setProject] = useState<Project | null>(null);
  const [backlogTasks, setBacklogTasks] = useState<Task[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Sprint configuration
  const [sprintConfig, setSprintConfig] = useState({
    name: '',
    goal: '',
    start_date: '',
    end_date: '',
    capacity: ''
  });

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchBacklog();
    }
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const response = await fetch(
        `https://documentiulia.ro/api/v1/projects/projects.php?id=${projectId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Company-ID': companyId || ''
          }
        }
      );

      const result = await response.json();
      if (result.success) {
        setProject(result.data);
      }
    } catch (err) {
      console.error('Error fetching project:', err);
    }
  };

  const fetchBacklog = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const response = await fetch(
        `https://documentiulia.ro/api/v1/tasks/backlog.php?project_id=${projectId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Company-ID': companyId || ''
          }
        }
      );

      const result = await response.json();
      if (result.success) {
        setBacklogTasks(result.data.tasks || []);
      } else {
        setError(result.error || 'Failed to load backlog');
      }
    } catch (err) {
      setError('Failed to load backlog');
      console.error('Error fetching backlog:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTaskTitle = (task: Task): string => {
    return task.task_title || task.title || task.name || 'Untitled';
  };

  const toggleTaskSelection = (task: Task) => {
    if (selectedTasks.find(t => t.id === task.id)) {
      setSelectedTasks(selectedTasks.filter(t => t.id !== task.id));
    } else {
      setSelectedTasks([...selectedTasks, task]);
    }
  };

  const calculateTotalStoryPoints = (tasks: Task[]) => {
    return tasks.reduce((sum, task) => sum + (task.story_points || 0), 0);
  };

  const calculateTotalHours = (tasks: Task[]) => {
    return tasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0);
  };

  const handleCreateSprint = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      // Step 1: Create the sprint
      const sprintResponse = await fetch(
        'https://documentiulia.ro/api/v1/sprints/sprints.php',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Company-ID': companyId || '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            project_id: projectId,
            ...sprintConfig,
            capacity: sprintConfig.capacity ? parseInt(sprintConfig.capacity) : null
          })
        }
      );

      const sprintResult = await sprintResponse.json();
      if (!sprintResult.success) {
        throw new Error(sprintResult.error || 'Failed to create sprint');
      }

      const sprintId = sprintResult.data.id;

      // Step 2: Assign selected tasks to the sprint
      if (selectedTasks.length > 0) {
        const bulkUpdateResponse = await fetch(
          'https://documentiulia.ro/api/v1/tasks/bulk-update.php',
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-Company-ID': companyId || '',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              task_ids: selectedTasks.map(t => t.id),
              sprint_id: sprintId
            })
          }
        );

        const bulkResult = await bulkUpdateResponse.json();
        if (!bulkResult.success) {
          throw new Error(bulkResult.error || 'Failed to assign tasks to sprint');
        }
      }

      // Success! Navigate to the sprint board
      navigate(`/sprints/${sprintId}/board`);
    } catch (err) {
      console.error('Error creating sprint:', err);
      alert(err instanceof Error ? err.message : 'Failed to create sprint');
      setSaving(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colorClass = PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] || 'bg-gray-500';
    return (
      <span className={`px-2 py-1 text-xs font-semibold text-white rounded ${colorClass}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  const renderTaskCard = (task: Task, isSelected: boolean) => {
    return (
      <div
        key={task.id}
        onClick={() => toggleTaskSelection(task)}
        className={`bg-white p-4 rounded-lg border-2 cursor-pointer transition-all ${
          isSelected
            ? 'border-indigo-600 shadow-lg'
            : 'border-gray-200 hover:border-gray-300 hover:shadow'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleTaskSelection(task)}
              className="w-5 h-5"
              onClick={(e) => e.stopPropagation()}
            />
            <span className="text-lg">
              {TYPE_ICONS[task.type as keyof typeof TYPE_ICONS] || '📝'}
            </span>
          </div>
          {getPriorityBadge(task.priority)}
        </div>

        <h4 className="font-medium text-gray-900 mb-1">
          {getTaskTitle(task)}
        </h4>

        {task.description && (
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            {task.story_points && (
              <span className="font-semibold text-indigo-600">
                {task.story_points} pts
              </span>
            )}
            {task.estimated_hours && (
              <span className="text-gray-500">
                {task.estimated_hours}h
              </span>
            )}
          </div>
          {task.assignee_name && (
            <span className="text-gray-500 text-xs">
              👤 {task.assignee_name}
            </span>
          )}
        </div>

        {task.epic_name && (
          <div className="mt-2">
            <span
              className="text-xs px-2 py-1 rounded text-white"
              style={{ backgroundColor: task.epic_color || '#6366f1' }}
            >
              {task.epic_name}
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderStepIndicator = () => {
    const steps = [
      { id: 'config', label: 'Configuration', icon: '⚙️' },
      { id: 'selection', label: 'Select Tasks', icon: '📋' },
      { id: 'review', label: 'Review & Create', icon: '✅' }
    ];

    const stepIndex = steps.findIndex(s => s.id === currentStep);

    return (
      <div className="flex items-center justify-center mb-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                index === stepIndex
                  ? 'bg-indigo-600 text-white'
                  : index < stepIndex
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              <span className="text-xl">{step.icon}</span>
              <span className="font-medium">{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <div className="w-12 h-0.5 bg-gray-300 mx-2"></div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderConfigStep = () => {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6">Sprint Configuration</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sprint Name *
            </label>
            <input
              type="text"
              value={sprintConfig.name}
              onChange={(e) => setSprintConfig({ ...sprintConfig, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Sprint 1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sprint Goal
            </label>
            <textarea
              value={sprintConfig.goal}
              onChange={(e) => setSprintConfig({ ...sprintConfig, goal: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Complete user authentication features..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                value={sprintConfig.start_date}
                onChange={(e) => setSprintConfig({ ...sprintConfig, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date *
              </label>
              <input
                type="date"
                value={sprintConfig.end_date}
                onChange={(e) => setSprintConfig({ ...sprintConfig, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Team Capacity (Story Points)
            </label>
            <input
              type="number"
              value={sprintConfig.capacity}
              onChange={(e) => setSprintConfig({ ...sprintConfig, capacity: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="40"
            />
            <p className="text-xs text-gray-500 mt-1">
              How many story points can your team commit to this sprint?
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={() => navigate(`/sprints?project_id=${projectId}`)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => setCurrentStep('selection')}
            disabled={!sprintConfig.name || !sprintConfig.start_date || !sprintConfig.end_date}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Next: Select Tasks →
          </button>
        </div>
      </div>
    );
  };

  const renderSelectionStep = () => {
    const totalPoints = calculateTotalStoryPoints(selectedTasks);
    const capacity = parseInt(sprintConfig.capacity) || 0;
    const commitmentPercentage = capacity > 0 ? (totalPoints / capacity) * 100 : 0;

    return (
      <div>
        {/* Metrics Bar */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-gray-600">Selected Tasks</div>
              <div className="text-3xl font-bold text-indigo-600">{selectedTasks.length}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Story Points</div>
              <div className="text-3xl font-bold text-purple-600">{totalPoints}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Team Capacity</div>
              <div className="text-3xl font-bold text-blue-600">{capacity || 'Not set'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Commitment</div>
              <div className={`text-3xl font-bold ${
                commitmentPercentage > 100 ? 'text-red-600' :
                commitmentPercentage > 80 ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {capacity > 0 ? `${commitmentPercentage.toFixed(0)}%` : '-'}
              </div>
            </div>
          </div>

          {capacity > 0 && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    commitmentPercentage > 100 ? 'bg-red-500' :
                    commitmentPercentage > 80 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(commitmentPercentage, 100)}%` }}
                ></div>
              </div>
              {commitmentPercentage > 100 && (
                <p className="text-sm text-red-600 mt-2">
                  ⚠️ Warning: Commitment exceeds capacity by {(totalPoints - capacity)} points
                </p>
              )}
            </div>
          )}
        </div>

        {/* Task Selection */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Product Backlog</h2>
            <div className="text-sm text-gray-600">
              {backlogTasks.length} tasks available
            </div>
          </div>

          {backlogTasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No tasks in backlog</p>
              <p className="text-sm text-gray-500 mt-2">
                Create tasks first to add them to sprints
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {backlogTasks.map((task) =>
                renderTaskCard(task, selectedTasks.some(t => t.id === task.id))
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setCurrentStep('config')}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ← Back
          </button>
          <button
            onClick={() => setCurrentStep('review')}
            className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Next: Review →
          </button>
        </div>
      </div>
    );
  };

  const renderReviewStep = () => {
    const totalPoints = calculateTotalStoryPoints(selectedTasks);
    const totalHours = calculateTotalHours(selectedTasks);
    const capacity = parseInt(sprintConfig.capacity) || 0;

    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6">Review Sprint Plan</h2>

          {/* Sprint Details */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Sprint Details</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Sprint Name:</span>
                <span className="font-medium">{sprintConfig.name}</span>
              </div>
              {sprintConfig.goal && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Sprint Goal:</span>
                  <span className="font-medium text-right max-w-md">{sprintConfig.goal}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Duration:</span>
                <span className="font-medium">
                  {new Date(sprintConfig.start_date).toLocaleDateString()} - {new Date(sprintConfig.end_date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Capacity:</span>
                <span className="font-medium">{capacity} points</span>
              </div>
            </div>
          </div>

          {/* Commitment Summary */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Commitment Summary</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-indigo-50 rounded-lg p-4 text-center">
                <div className="text-sm text-gray-600 mb-1">Tasks</div>
                <div className="text-3xl font-bold text-indigo-600">{selectedTasks.length}</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-sm text-gray-600 mb-1">Story Points</div>
                <div className="text-3xl font-bold text-purple-600">{totalPoints}</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-sm text-gray-600 mb-1">Estimated Hours</div>
                <div className="text-3xl font-bold text-blue-600">{totalHours}h</div>
              </div>
            </div>
          </div>

          {/* Selected Tasks */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">
              Selected Tasks ({selectedTasks.length})
            </h3>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {selectedTasks.map((task) => (
                <div key={task.id} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {TYPE_ICONS[task.type as keyof typeof TYPE_ICONS] || '📝'}
                    </span>
                    <div>
                      <div className="font-medium">{getTaskTitle(task)}</div>
                      <div className="text-sm text-gray-600">
                        {task.story_points && <span>{task.story_points} pts</span>}
                        {task.estimated_hours && <span className="ml-3">{task.estimated_hours}h</span>}
                      </div>
                    </div>
                  </div>
                  {getPriorityBadge(task.priority)}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setCurrentStep('selection')}
              disabled={saving}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              ← Back
            </button>
            <button
              onClick={handleCreateSprint}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating Sprint...
                </>
              ) : (
                <>
                  ✅ Create Sprint & Start
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Show project selector if no project is selected
  if (!projectId) {
    return (
      <>
        <ProjectSelector
          isOpen={true}
          onClose={() => navigate('/projects')}
          onSelect={(selectedProjectId) => {
            navigate(`/sprints/planning?project_id=${selectedProjectId}`);
          }}
          title="Select Project for Sprint Planning"
          description="Choose a project to plan your sprint"
        />
      </>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading backlog...</p>
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
            onClick={() => navigate(`/sprints?project_id=${projectId}`)}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Back to Sprints
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
          onClick={() => navigate(`/sprints?project_id=${projectId}`)}
          className="text-gray-600 hover:text-gray-900 mb-2"
        >
          ← Back to Sprints
        </button>
        <h1 className="text-3xl font-bold text-gray-900">
          Sprint Planning - {project?.name}
        </h1>
        <p className="text-gray-600 mt-1">Plan your next sprint with ease</p>
      </div>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Step Content */}
      {currentStep === 'config' && renderConfigStep()}
      {currentStep === 'selection' && renderSelectionStep()}
      {currentStep === 'review' && renderReviewStep()}
    </div>
  );
}
