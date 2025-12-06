import { useState, useEffect } from 'react';

interface EstimationResult {
  estimated_points: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string[];
  alternatives: {
    lower: number | null;
    higher: number | null;
  };
  analysis: {
    complexity_score: number;
    type_baseline: number;
    historical_average: number;
    raw_estimate: number;
  };
}

interface AIStoryPointEstimatorProps {
  title: string;
  description: string;
  type: string;
  projectId?: string;
  onEstimateSelect: (points: number) => void;
  currentEstimate?: number;
}

export default function AIStoryPointEstimator({
  title,
  description,
  type,
  projectId,
  onEstimateSelect,
  currentEstimate
}: AIStoryPointEstimatorProps) {
  const [estimation, setEstimation] = useState<EstimationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const getEstimation = async () => {
    if (!title.trim()) {
      setError('Please provide a task title first');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const response = await fetch(
        'https://documentiulia.ro/api/v1/tasks/estimate.php',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Company-ID': companyId || '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title,
            description,
            type,
            project_id: projectId
          })
        }
      );

      const result = await response.json();
      if (result.success) {
        setEstimation(result.data);
      } else {
        setError(result.error || 'Failed to get estimation');
      }
    } catch (err) {
      console.error('Error getting estimation:', err);
      setError('Failed to get AI estimation');
    } finally {
      setLoading(false);
    }
  };

  // Auto-estimate when title and type change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (title.length > 5) {
        getEstimation();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [title, type]);

  const getConfidenceColor = (confidence: string) => {
    const colors = {
      high: 'text-green-600 bg-green-50 border-green-200',
      medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      low: 'text-red-600 bg-red-50 border-red-200'
    };
    return colors[confidence as keyof typeof colors] || colors.medium;
  };

  const getConfidenceIcon = (confidence: string) => {
    const icons = {
      high: '✅',
      medium: '⚠️',
      low: '❗'
    };
    return icons[confidence as keyof typeof icons] || icons.medium;
  };

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <div>
            <div className="font-medium text-blue-900">Analyzing task complexity...</div>
            <div className="text-sm text-blue-600">AI is estimating story points</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-600">
            <span>❌</span>
            <span className="text-sm">{error}</span>
          </div>
          <button
            onClick={getEstimation}
            className="text-sm text-red-600 hover:text-red-700 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!estimation) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <button
          onClick={getEstimation}
          className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <span>🤖</span>
          <span className="font-medium">Get AI Estimation</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`border-2 rounded-lg p-4 ${getConfidenceColor(estimation.confidence)}`}>
      {/* Main Estimation */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{getConfidenceIcon(estimation.confidence)}</div>
          <div>
            <div className="text-sm font-medium opacity-75">AI Recommended</div>
            <div className="text-3xl font-bold">{estimation.estimated_points} points</div>
            <div className="text-xs opacity-75 capitalize mt-1">
              {estimation.confidence} confidence
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm underline opacity-75 hover:opacity-100"
        >
          {showDetails ? 'Hide' : 'Show'} Details
        </button>
      </div>

      {/* Alternative Estimates */}
      <div className="flex gap-2 mb-3">
        {estimation.alternatives.lower !== null && (
          <button
            onClick={() => onEstimateSelect(estimation.alternatives.lower!)}
            className={`flex-1 py-2 px-3 rounded border-2 transition-colors ${
              currentEstimate === estimation.alternatives.lower
                ? 'border-current bg-white bg-opacity-50'
                : 'border-current border-opacity-30 hover:border-opacity-60'
            }`}
          >
            <div className="text-xs opacity-75">Lower</div>
            <div className="text-lg font-bold">{estimation.alternatives.lower}</div>
          </button>
        )}

        <button
          onClick={() => onEstimateSelect(estimation.estimated_points)}
          className={`flex-1 py-2 px-3 rounded border-2 transition-colors ${
            currentEstimate === estimation.estimated_points
              ? 'border-current bg-white bg-opacity-50'
              : 'border-current border-opacity-30 hover:border-opacity-60'
          }`}
        >
          <div className="text-xs opacity-75">Recommended</div>
          <div className="text-lg font-bold">{estimation.estimated_points}</div>
        </button>

        {estimation.alternatives.higher !== null && (
          <button
            onClick={() => onEstimateSelect(estimation.alternatives.higher!)}
            className={`flex-1 py-2 px-3 rounded border-2 transition-colors ${
              currentEstimate === estimation.alternatives.higher
                ? 'border-current bg-white bg-opacity-50'
                : 'border-current border-opacity-30 hover:border-opacity-60'
            }`}
          >
            <div className="text-xs opacity-75">Higher</div>
            <div className="text-lg font-bold">{estimation.alternatives.higher}</div>
          </button>
        )}
      </div>

      {/* Detailed Analysis */}
      {showDetails && (
        <div className="border-t pt-3 space-y-3 opacity-90">
          {/* Reasoning */}
          <div>
            <div className="text-xs font-semibold mb-1">AI Reasoning:</div>
            <ul className="text-sm space-y-1">
              {estimation.reasoning.map((reason, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="opacity-50">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Analysis Breakdown */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white bg-opacity-50 rounded p-2">
              <div className="opacity-75">Complexity Score</div>
              <div className="font-bold">{estimation.analysis.complexity_score}</div>
            </div>
            <div className="bg-white bg-opacity-50 rounded p-2">
              <div className="opacity-75">Type Baseline</div>
              <div className="font-bold">{estimation.analysis.type_baseline} pts</div>
            </div>
            <div className="bg-white bg-opacity-50 rounded p-2">
              <div className="opacity-75">Historical Avg</div>
              <div className="font-bold">
                {estimation.analysis.historical_average > 0
                  ? `${estimation.analysis.historical_average} pts`
                  : 'No data'
                }
              </div>
            </div>
            <div className="bg-white bg-opacity-50 rounded p-2">
              <div className="opacity-75">Raw Estimate</div>
              <div className="font-bold">{estimation.analysis.raw_estimate.toFixed(1)}</div>
            </div>
          </div>

          {/* Re-estimate Button */}
          <button
            onClick={getEstimation}
            disabled={loading}
            className="w-full py-2 text-sm font-medium opacity-75 hover:opacity-100 underline"
          >
            🔄 Re-estimate
          </button>
        </div>
      )}

      {/* Manual Override Info */}
      <div className="mt-3 pt-3 border-t text-xs opacity-75">
        💡 You can also manually enter a different value in the Story Points field above
      </div>
    </div>
  );
}
