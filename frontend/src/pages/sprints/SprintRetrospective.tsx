import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface RetrospectiveItem {
  id: string;
  content: string;
  votes: number;
  creator_name: string;
  assignee_id?: string;
  assignee_name?: string;
  due_date?: string;
  status: string;
  created_at: string;
}

interface Retrospective {
  id: string;
  sprint_id: string;
  sprint_name: string;
  sprint_start: string;
  sprint_end: string;
  conducted_date: string;
  facilitator_name: string;
  notes?: string;
  team_sentiment?: string;
  sentiment_score?: number;
}

interface RetrospectiveData {
  retrospective: Retrospective;
  items: {
    went_well: RetrospectiveItem[];
    to_improve: RetrospectiveItem[];
    action_items: RetrospectiveItem[];
  };
  summary: {
    total_items: number;
    went_well_count: number;
    to_improve_count: number;
    action_items_count: number;
    completed_actions: number;
    pending_actions: number;
  };
}

export default function SprintRetrospective() {
  const { sprintId } = useParams<{ sprintId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<RetrospectiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ category: 'went_well', content: '' });

  useEffect(() => {
    fetchRetrospective();
  }, [sprintId]);

  const fetchRetrospective = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const response = await fetch(
        `https://documentiulia.ro/api/v1/sprints/retrospectives.php?sprint_id=${sprintId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Company-ID': companyId || ''
          }
        }
      );

      const result = await response.json();
      if (result.success) {
        if (!result.data) {
          // No retrospective exists, create one
          await createRetrospective();
        } else {
          setData(result.data);
        }
      } else {
        setError(result.error || 'Failed to load retrospective');
      }
    } catch (err) {
      console.error('Error fetching retrospective:', err);
      setError('Failed to load retrospective');
    } finally {
      setLoading(false);
    }
  };

  const createRetrospective = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const response = await fetch(
        'https://documentiulia.ro/api/v1/sprints/retrospectives.php',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Company-ID': companyId || '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sprint_id: sprintId,
            conducted_date: new Date().toISOString().split('T')[0]
          })
        }
      );

      const result = await response.json();
      if (result.success) {
        fetchRetrospective();
      } else {
        setError(result.error || 'Failed to create retrospective');
      }
    } catch (err) {
      console.error('Error creating retrospective:', err);
      setError('Failed to create retrospective');
    }
  };

  const addItem = async () => {
    if (!newItem.content.trim() || !data) return;

    try {
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const response = await fetch(
        'https://documentiulia.ro/api/v1/sprints/retrospective-items.php',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Company-ID': companyId || '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            retrospective_id: data.retrospective.id,
            category: newItem.category,
            content: newItem.content
          })
        }
      );

      const result = await response.json();
      if (result.success) {
        setNewItem({ category: newItem.category, content: '' });
        fetchRetrospective();
      } else {
        alert(result.error || 'Failed to add item');
      }
    } catch (err) {
      console.error('Error adding item:', err);
      alert('Failed to add item');
    }
  };

  const voteItem = async (itemId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const response = await fetch(
        'https://documentiulia.ro/api/v1/sprints/retrospective-items.php',
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Company-ID': companyId || '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: itemId,
            action: 'vote'
          })
        }
      );

      const result = await response.json();
      if (result.success) {
        fetchRetrospective();
      }
    } catch (err) {
      console.error('Error voting:', err);
    }
  };

  const updateActionStatus = async (itemId: string, status: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const response = await fetch(
        'https://documentiulia.ro/api/v1/sprints/retrospective-items.php',
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Company-ID': companyId || '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: itemId,
            status: status
          })
        }
      );

      const result = await response.json();
      if (result.success) {
        fetchRetrospective();
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const response = await fetch(
        `https://documentiulia.ro/api/v1/sprints/retrospective-items.php?id=${itemId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Company-ID': companyId || ''
          }
        }
      );

      const result = await response.json();
      if (result.success) {
        fetchRetrospective();
      }
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      went_well: 'bg-green-50 border-green-200',
      to_improve: 'bg-yellow-50 border-yellow-200',
      action_item: 'bg-blue-50 border-blue-200'
    };
    return colors[category] || 'bg-gray-50 border-gray-200';
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      went_well: '✅',
      to_improve: '💡',
      action_item: '🎯'
    };
    return icons[category] || '📝';
  };

  const getCategoryTitle = (category: string) => {
    const titles: Record<string, string> = {
      went_well: 'What Went Well',
      to_improve: 'What To Improve',
      action_item: 'Action Items'
    };
    return titles[category] || category;
  };

  const renderItemsColumn = (
    category: string,
    items: RetrospectiveItem[],
    isActionItems: boolean = false
  ) => {
    return (
      <div className={`flex-1 rounded-lg border-2 p-4 ${getCategoryColor(category)}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span className="text-2xl">{getCategoryIcon(category)}</span>
            {getCategoryTitle(category)}
          </h3>
          <span className="text-sm font-medium text-gray-600">{items.length} items</span>
        </div>

        {/* Add new item form */}
        {newItem.category === category && (
          <div className="mb-4">
            <textarea
              value={newItem.content}
              onChange={(e) => setNewItem({ ...newItem, content: e.target.value })}
              placeholder={`Add ${getCategoryTitle(category).toLowerCase()}...`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              rows={2}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={addItem}
                disabled={!newItem.content.trim()}
                className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
              <button
                onClick={() => setNewItem({ ...newItem, content: '' })}
                className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Items list */}
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{item.content}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                    <span>by {item.creator_name}</span>
                    {item.assignee_name && (
                      <>
                        <span>•</span>
                        <span>assigned to {item.assignee_name}</span>
                      </>
                    )}
                    {item.due_date && (
                      <>
                        <span>•</span>
                        <span>due {new Date(item.due_date).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-2">
                  {!isActionItems && (
                    <button
                      onClick={() => voteItem(item.id)}
                      className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 text-xs font-semibold"
                    >
                      👍 {item.votes}
                    </button>
                  )}
                  {isActionItems && (
                    <select
                      value={item.status}
                      onChange={(e) => updateActionStatus(item.id, e.target.value)}
                      className="text-xs border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  )}
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add button */}
        {newItem.category !== category && (
          <button
            onClick={() => setNewItem({ category, content: '' })}
            className="w-full mt-3 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition-colors"
          >
            + Add Item
          </button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading retrospective...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/projects')}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate(`/sprints/${sprintId}/board`)}
              className="text-gray-600 hover:text-gray-900 mb-2"
            >
              ← Back to Sprint Board
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Sprint Retrospective</h1>
            <p className="text-gray-600 mt-1">{data.retrospective.sprint_name}</p>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-600">
              Conducted: {new Date(data.retrospective.conducted_date).toLocaleDateString()}
            </div>
            {data.retrospective.facilitator_name && (
              <div className="text-sm text-gray-600">
                Facilitator: {data.retrospective.facilitator_name}
              </div>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Items</div>
            <div className="text-2xl font-bold">{data.summary.total_items}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg shadow border border-green-200">
            <div className="text-sm text-green-700">Went Well</div>
            <div className="text-2xl font-bold text-green-600">{data.summary.went_well_count}</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg shadow border border-yellow-200">
            <div className="text-sm text-yellow-700">To Improve</div>
            <div className="text-2xl font-bold text-yellow-600">{data.summary.to_improve_count}</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg shadow border border-blue-200">
            <div className="text-sm text-blue-700">Action Items</div>
            <div className="text-2xl font-bold text-blue-600">
              {data.summary.completed_actions} / {data.summary.action_items_count}
            </div>
            <div className="text-xs text-blue-600 mt-1">completed</div>
          </div>
        </div>
      </div>

      {/* Three Columns Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {renderItemsColumn('went_well', data.items.went_well)}
        {renderItemsColumn('to_improve', data.items.to_improve)}
        {renderItemsColumn('action_item', data.items.action_items, true)}
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-white rounded-lg p-4 shadow">
        <h3 className="font-semibold text-gray-900 mb-2">How to use:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Add items to each category by clicking "+ Add Item"</li>
          <li>• Vote on items in "What Went Well" and "What To Improve" to prioritize them</li>
          <li>• Assign owners and due dates to action items</li>
          <li>• Track action item progress with status updates</li>
          <li>• Delete items that are not relevant or duplicate</li>
        </ul>
      </div>
    </div>
  );
}
