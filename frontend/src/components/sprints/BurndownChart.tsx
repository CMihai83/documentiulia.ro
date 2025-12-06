import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

interface BurndownData {
  sprint: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    capacity: number;
    total_points: number;
    duration_days: number;
  };
  burndown: {
    ideal: Array<{
      date: string;
      remaining: number;
      day_number: number;
    }>;
    actual: Array<{
      date: string;
      remaining: number;
      day_number: number;
      points_completed: number;
    }>;
  };
  metrics: {
    completed_points: number;
    remaining_points: number;
    total_points: number;
    completion_percentage: number;
    velocity: number;
    ideal_velocity: number;
    days_elapsed: number;
    days_remaining: number;
    projected_completion_days: number | null;
    on_track: boolean;
    status: string;
  };
}

interface BurndownChartProps {
  sprintId: string;
}

export default function BurndownChart({ sprintId }: BurndownChartProps) {
  const [data, setData] = useState<BurndownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBurndownData();
  }, [sprintId]);

  const fetchBurndownData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const response = await fetch(
        `https://documentiulia.ro/api/v1/sprints/burndown.php?sprint_id=${sprintId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Company-ID': companyId || ''
          }
        }
      );

      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to load burndown data');
      }
    } catch (err) {
      console.error('Error fetching burndown data:', err);
      setError('Failed to load burndown chart');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      ahead: 'text-green-600 bg-green-50 border-green-200',
      on_track: 'text-blue-600 bg-blue-50 border-blue-200',
      behind: 'text-red-600 bg-red-50 border-red-200',
      completed: 'text-purple-600 bg-purple-50 border-purple-200'
    };
    return colors[status] || colors.on_track;
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, string> = {
      ahead: '🚀',
      on_track: '✅',
      behind: '⚠️',
      completed: '🎉'
    };
    return icons[status] || icons.on_track;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      ahead: 'Ahead of Schedule',
      on_track: 'On Track',
      behind: 'Behind Schedule',
      completed: 'Sprint Completed'
    };
    return labels[status] || 'On Track';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Loading burndown chart...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchBurndownData}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Merge ideal and actual data for the chart
  const chartData = data.burndown.ideal.map((idealPoint) => {
    const actualPoint = data.burndown.actual.find(a => a.day_number === idealPoint.day_number);

    return {
      day: `Day ${idealPoint.day_number}`,
      date: idealPoint.date,
      ideal: idealPoint.remaining,
      actual: actualPoint?.remaining,
      completed: actualPoint?.points_completed || 0
    };
  });

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sprint Burndown Chart</h2>
          <p className="text-sm text-gray-600 mt-1">
            {data.sprint.name} • {new Date(data.sprint.start_date).toLocaleDateString()} - {new Date(data.sprint.end_date).toLocaleDateString()}
          </p>
        </div>

        {/* Status Badge */}
        <div className={`px-4 py-2 rounded-lg border-2 ${getStatusColor(data.metrics.status)}`}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getStatusIcon(data.metrics.status)}</span>
            <div>
              <div className="font-semibold">{getStatusLabel(data.metrics.status)}</div>
              <div className="text-xs opacity-75">
                {data.metrics.velocity.toFixed(1)} pts/day velocity
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-xs text-gray-600 mb-1">Completed</div>
          <div className="text-2xl font-bold text-green-600">{data.metrics.completed_points}</div>
          <div className="text-xs text-gray-500">pts</div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-xs text-gray-600 mb-1">Remaining</div>
          <div className="text-2xl font-bold text-blue-600">{data.metrics.remaining_points}</div>
          <div className="text-xs text-gray-500">pts</div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-xs text-gray-600 mb-1">Progress</div>
          <div className="text-2xl font-bold text-purple-600">{data.metrics.completion_percentage}%</div>
          <div className="text-xs text-gray-500">complete</div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-xs text-gray-600 mb-1">Velocity</div>
          <div className="text-2xl font-bold text-indigo-600">{data.metrics.velocity.toFixed(1)}</div>
          <div className="text-xs text-gray-500">pts/day</div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-xs text-gray-600 mb-1">Days Left</div>
          <div className="text-2xl font-bold text-orange-600">{data.metrics.days_remaining}</div>
          <div className="text-xs text-gray-500">days</div>
        </div>
      </div>

      {/* Chart */}
      <div className="mb-6">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <YAxis
              label={{ value: 'Story Points', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '12px'
              }}
              labelFormatter={(value, payload) => {
                if (payload && payload[0]) {
                  const date = new Date(payload[0].payload.date);
                  return `${value} (${date.toLocaleDateString()})`;
                }
                return value;
              }}
            />
            <Legend />

            {/* Ideal Burndown Line */}
            <Line
              type="monotone"
              dataKey="ideal"
              name="Ideal Burndown"
              stroke="#9ca3af"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />

            {/* Actual Burndown Line */}
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual Burndown"
              stroke={data.metrics.on_track ? '#10b981' : '#ef4444'}
              strokeWidth={3}
              dot={{ fill: data.metrics.on_track ? '#10b981' : '#ef4444', r: 4 }}
              connectNulls
            />

            {/* Reference line at zero */}
            <ReferenceLine
              y={0}
              stroke="#6b7280"
              strokeDasharray="3 3"
              label={{ value: 'Sprint Goal', position: 'insideBottomLeft' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Projection Info */}
      {data.metrics.projected_completion_days !== null && data.metrics.remaining_points > 0 && (
        <div className={`rounded-lg p-4 border-2 ${getStatusColor(data.metrics.status)}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getStatusIcon(data.metrics.status)}</span>
            <div>
              <div className="font-semibold">
                {data.metrics.on_track ? (
                  <>Sprint on track to complete in {data.metrics.projected_completion_days.toFixed(1)} days</>
                ) : (
                  <>
                    Sprint projected to take {data.metrics.projected_completion_days.toFixed(1)} days
                    ({(data.metrics.projected_completion_days - data.sprint.duration_days).toFixed(1)} days over)
                  </>
                )}
              </div>
              <div className="text-sm opacity-75 mt-1">
                Current velocity: {data.metrics.velocity.toFixed(2)} pts/day
                (Ideal: {data.metrics.ideal_velocity.toFixed(2)} pts/day)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completion Message */}
      {data.metrics.remaining_points === 0 && (
        <div className={`rounded-lg p-4 border-2 ${getStatusColor('completed')}`}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎉</span>
            <div>
              <div className="font-semibold text-lg">Sprint Completed!</div>
              <div className="text-sm opacity-75 mt-1">
                All {data.metrics.total_points} story points have been completed.
                Average velocity: {data.metrics.velocity.toFixed(2)} pts/day
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legend Info */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="text-xs text-gray-600">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Ideal Burndown (gray dashed line):</strong> Expected story point completion
              if work is evenly distributed across the sprint
            </div>
            <div>
              <strong>Actual Burndown ({data.metrics.on_track ? 'green' : 'red'} line):</strong> Real-time
              story points remaining based on completed tasks
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
