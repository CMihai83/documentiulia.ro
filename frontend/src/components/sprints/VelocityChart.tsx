import { useState, useEffect } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface VelocitySprint {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  capacity: number;
  status: string;
  completed_points: number;
  committed_points: number;
  completed_tasks: number;
  total_tasks: number;
  velocity: number;
  commitment_accuracy: number;
}

interface VelocityData {
  sprints: VelocitySprint[];
  metrics: {
    total_sprints: number;
    average_velocity: number;
    average_completed_points: number;
    average_commitment_accuracy: number;
    trend: string;
    predictability_score: number;
    standard_deviation: number;
  };
  predictions: {
    suggested_capacity: number;
    conservative_estimate: number;
    aggressive_estimate: number;
    confidence: string;
  };
}

interface VelocityChartProps {
  projectId?: string;
  limit?: number;
}

export default function VelocityChart({ projectId, limit = 10 }: VelocityChartProps) {
  const [data, setData] = useState<VelocityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVelocityData();
  }, [projectId, limit]);

  const fetchVelocityData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const params = new URLSearchParams();
      if (projectId) params.append('project_id', projectId);
      params.append('limit', limit.toString());

      const response = await fetch(
        `https://documentiulia.ro/api/v1/sprints/velocity.php?${params}`,
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
        setError(result.error || 'Failed to load velocity data');
      }
    } catch (err) {
      console.error('Error fetching velocity data:', err);
      setError('Failed to load velocity chart');
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    const icons: Record<string, string> = {
      increasing: '=È',
      stable: '¡',
      decreasing: '=É'
    };
    return icons[trend] || '¡';
  };

  const getTrendColor = (trend: string) => {
    const colors: Record<string, string> = {
      increasing: 'text-green-600 bg-green-50 border-green-200',
      stable: 'text-blue-600 bg-blue-50 border-blue-200',
      decreasing: 'text-red-600 bg-red-50 border-red-200'
    };
    return colors[trend] || colors.stable;
  };

  const getConfidenceColor = (confidence: string) => {
    const colors: Record<string, string> = {
      high: 'text-green-600 bg-green-50',
      medium: 'text-yellow-600 bg-yellow-50',
      low: 'text-red-600 bg-red-50'
    };
    return colors[confidence] || colors.medium;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Loading velocity data...</p>
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
            onClick={fetchVelocityData}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.sprints.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <p className="text-gray-600">No sprint history available yet.</p>
          <p className="text-sm text-gray-500 mt-2">
            Complete some sprints to see velocity trends and predictions.
          </p>
        </div>
      </div>
    );
  }

  // Reverse sprints for chronological display (oldest to newest)
  const chartData = [...data.sprints].reverse().map(sprint => ({
    name: sprint.name,
    completed: sprint.completed_points,
    committed: sprint.committed_points,
    velocity: sprint.velocity,
    accuracy: sprint.commitment_accuracy
  }));

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Team Velocity Analysis</h2>
          <p className="text-sm text-gray-600 mt-1">
            Historical performance and capacity predictions based on {data.metrics.total_sprints} completed sprints
          </p>
        </div>

        {/* Trend Badge */}
        <div className={`px-4 py-2 rounded-lg border-2 ${getTrendColor(data.metrics.trend)}`}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getTrendIcon(data.metrics.trend)}</span>
            <div>
              <div className="font-semibold capitalize">{data.metrics.trend}</div>
              <div className="text-xs opacity-75">Velocity Trend</div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-xs text-gray-600 mb-1">Avg Velocity</div>
          <div className="text-2xl font-bold text-indigo-600">{data.metrics.average_velocity}</div>
          <div className="text-xs text-gray-500">pts/day</div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-xs text-gray-600 mb-1">Avg Points/Sprint</div>
          <div className="text-2xl font-bold text-green-600">{data.metrics.average_completed_points}</div>
          <div className="text-xs text-gray-500">story points</div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-xs text-gray-600 mb-1">Commitment Accuracy</div>
          <div className="text-2xl font-bold text-purple-600">{data.metrics.average_commitment_accuracy}%</div>
          <div className="text-xs text-gray-500">avg</div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-xs text-gray-600 mb-1">Predictability Score</div>
          <div className="text-2xl font-bold text-blue-600">{data.metrics.predictability_score}</div>
          <div className="text-xs text-gray-500">out of 100</div>
        </div>
      </div>

      {/* Velocity Chart */}
      <div className="mb-6">
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis
              yAxisId="left"
              label={{ value: 'Story Points', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              label={{ value: 'Velocity (pts/day)', angle: 90, position: 'insideRight' }}
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
            />
            <Legend />

            {/* Committed Points Bar */}
            <Bar
              yAxisId="left"
              dataKey="committed"
              name="Committed Points"
              fill="#93c5fd"
              radius={[8, 8, 0, 0]}
            />

            {/* Completed Points Bar */}
            <Bar
              yAxisId="left"
              dataKey="completed"
              name="Completed Points"
              radius={[8, 8, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.completed >= entry.committed ? '#10b981' : '#f59e0b'}
                />
              ))}
            </Bar>

            {/* Velocity Line */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="velocity"
              name="Velocity"
              stroke="#6366f1"
              strokeWidth={3}
              dot={{ fill: '#6366f1', r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Predictions Section */}
      <div className="border-t border-gray-200 pt-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Next Sprint Capacity Predictions</h3>
          <div className={`px-3 py-1 rounded-lg ${getConfidenceColor(data.predictions.confidence)}`}>
            <span className="text-sm font-semibold capitalize">{data.predictions.confidence} Confidence</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Conservative Estimate */}
          <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
            <div className="text-sm font-semibold text-blue-800 mb-2">=á Conservative</div>
            <div className="text-3xl font-bold text-blue-900">{data.predictions.conservative_estimate}</div>
            <div className="text-xs text-blue-700 mt-1">story points</div>
            <div className="text-xs text-blue-600 mt-2">80% of average - Lower risk</div>
          </div>

          {/* Suggested Estimate */}
          <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
            <div className="text-sm font-semibold text-green-800 mb-2"> Suggested</div>
            <div className="text-3xl font-bold text-green-900">{data.predictions.suggested_capacity}</div>
            <div className="text-xs text-green-700 mt-1">story points</div>
            <div className="text-xs text-green-600 mt-2">100% of average - Recommended</div>
          </div>

          {/* Aggressive Estimate */}
          <div className="bg-orange-50 rounded-lg p-4 border-2 border-orange-200">
            <div className="text-sm font-semibold text-orange-800 mb-2">=€ Aggressive</div>
            <div className="text-3xl font-bold text-orange-900">{data.predictions.aggressive_estimate}</div>
            <div className="text-xs text-orange-700 mt-1">story points</div>
            <div className="text-xs text-orange-600 mt-2">120% of average - Higher risk</div>
          </div>
        </div>
      </div>

      {/* Sprint History Table */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sprint History</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sprint
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Committed
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completed
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Velocity
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Accuracy
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tasks
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.sprints.map((sprint) => (
                <tr key={sprint.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{sprint.name}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {sprint.duration_days} days
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {sprint.committed_points} pts
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-sm font-semibold ${
                      sprint.completed_points >= sprint.committed_points ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {sprint.completed_points} pts
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {sprint.velocity.toFixed(2)} pts/day
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-sm font-semibold ${
                      sprint.commitment_accuracy >= 90 ? 'text-green-600' :
                      sprint.commitment_accuracy >= 70 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {sprint.commitment_accuracy}%
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {sprint.completed_tasks} / {sprint.total_tasks}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights Section */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="text-xs text-gray-600">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Predictability Score:</strong> Measures consistency of delivery.
              Higher scores (70+) indicate stable, predictable velocity.
              Lower scores suggest high variability between sprints.
            </div>
            <div>
              <strong>Velocity Trend:</strong> Compares recent 3 sprints vs previous 3 sprints.
              Increasing trend shows improving performance.
              Decreasing trend may indicate burnout or increasing complexity.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
