import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface Sprint {
  id: string;
  name: string;
  goal: string;
  start_date: string;
  end_date: string;
  status: string;
  capacity: number | null;
  total_story_points: number;
  completed_story_points: number;
  completion_percentage: number;
  task_count: number;
  days_elapsed: number;
  days_remaining: number;
  sprint_phase: string;
}

interface Project {
  id: string;
  name: string;
  color: string;
}

export default function SprintsList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project_id');

  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSprint, setNewSprint] = useState({
    name: '',
    goal: '',
    start_date: '',
    end_date: '',
    capacity: ''
  });

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchSprints();
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

  const fetchSprints = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const response = await fetch(
        `https://documentiulia.ro/api/v1/sprints/sprints.php?project_id=${projectId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Company-ID': companyId || ''
          }
        }
      );

      const result = await response.json();
      if (result.success) {
        setSprints(result.data || []);
      } else {
        setError(result.error || 'Failed to load sprints');
      }
    } catch (err) {
      setError('Failed to load sprints');
      console.error('Error fetching sprints:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const response = await fetch(
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
            ...newSprint,
            capacity: newSprint.capacity ? parseInt(newSprint.capacity) : null
          })
        }
      );

      const result = await response.json();
      if (result.success) {
        setShowCreateModal(false);
        setNewSprint({ name: '', goal: '', start_date: '', end_date: '', capacity: '' });
        fetchSprints();
      } else {
        alert(result.error || 'Failed to create sprint');
      }
    } catch (err) {
      console.error('Error creating sprint:', err);
      alert('Failed to create sprint');
    }
  };

  const getStatusBadge = (sprint: Sprint) => {
    const statusColors: Record<string, string> = {
      planned: 'bg-gray-500',
      active: 'bg-green-500',
      completed: 'bg-blue-500',
      cancelled: 'bg-red-500'
    };

    const phaseEmojis: Record<string, string> = {
      upcoming: '📅',
      active: '🚀',
      overdue: '⚠️',
      completed: '✅'
    };

    return (
      <div className="flex items-center gap-2">
        <span className={`px-2 py-1 text-xs font-semibold text-white rounded ${statusColors[sprint.status] || 'bg-gray-500'}`}>
          {sprint.status.toUpperCase()}
        </span>
        <span className="text-xl">
          {phaseEmojis[sprint.sprint_phase] || '📊'}
        </span>
      </div>
    );
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
          <p className="mt-4 text-gray-600">Loading sprints...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">
              {project?.name} - Sprints
            </h1>
            <p className="text-gray-600 mt-1">Manage your project sprints</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            + New Sprint
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Sprints Grid */}
      {sprints.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No sprints yet</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Create First Sprint
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sprints.map((sprint) => (
            <div
              key={sprint.id}
              className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
              onClick={() => navigate(`/sprints/${sprint.id}/board`)}
            >
              {/* Sprint Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {sprint.name}
                  </h3>
                  {getStatusBadge(sprint)}
                </div>
              </div>

              {/* Sprint Goal */}
              {sprint.goal && (
                <p className="text-gray-600 text-sm mb-4">
                  🎯 {sprint.goal}
                </p>
              )}

              {/* Dates */}
              <div className="text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span>📅</span>
                  <span>
                    {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span>⏱️</span>
                  <span>
                    {sprint.days_elapsed} days elapsed • {sprint.days_remaining} days remaining
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-semibold">{sprint.completion_percentage?.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(sprint.completion_percentage || 0, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <div className="text-xs text-gray-600">Tasks</div>
                  <div className="text-lg font-bold">{sprint.task_count || 0}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Story Points</div>
                  <div className="text-lg font-bold">
                    {sprint.completed_story_points || 0} / {sprint.total_story_points || 0}
                  </div>
                </div>
                {sprint.capacity && (
                  <>
                    <div>
                      <div className="text-xs text-gray-600">Capacity</div>
                      <div className="text-lg font-bold">{sprint.capacity}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">Commitment</div>
                      <div className="text-lg font-bold">
                        {sprint.capacity ? Math.round((sprint.total_story_points / sprint.capacity) * 100) : 0}%
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Sprint Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Create New Sprint</h2>
            <form onSubmit={handleCreateSprint}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sprint Name *
                  </label>
                  <input
                    type="text"
                    value={newSprint.name}
                    onChange={(e) => setNewSprint({ ...newSprint, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Sprint 1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sprint Goal
                  </label>
                  <textarea
                    value={newSprint.goal}
                    onChange={(e) => setNewSprint({ ...newSprint, goal: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Implement core features..."
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
                      value={newSprint.start_date}
                      onChange={(e) => setNewSprint({ ...newSprint, start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={newSprint.end_date}
                      onChange={(e) => setNewSprint({ ...newSprint, end_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Capacity (Story Points)
                  </label>
                  <input
                    type="number"
                    value={newSprint.capacity}
                    onChange={(e) => setNewSprint({ ...newSprint, capacity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="40"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewSprint({ name: '', goal: '', start_date: '', end_date: '', capacity: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Create Sprint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
