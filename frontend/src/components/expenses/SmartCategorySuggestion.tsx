import React, { useEffect, useState } from 'react';
import { Lightbulb, TrendingUp, Clock, DollarSign } from 'lucide-react';
import { customizationAPI } from '../../services/api';

interface Suggestion {
  category: string;
  expense_type: string;
  confidence: number;
  usage_count: number;
  avg_amount: number;
  amount_range: {
    min: number;
    max: number;
  };
  last_used: string;
  reason: string;
}

interface SmartCategorySuggestionProps {
  vendorId: string | null;
  amount?: number;
  onSelect: (category: string, expenseType: string) => void;
  currentCategory?: string;
}

const SmartCategorySuggestion: React.FC<SmartCategorySuggestionProps> = ({
  vendorId,
  amount,
  onSelect,
  currentCategory,
}) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [topSuggestion, setTopSuggestion] = useState<Suggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (vendorId) {
      fetchSuggestions();
    } else {
      setSuggestions([]);
      setTopSuggestion(null);
    }
  }, [vendorId, amount]);

  const fetchSuggestions = async () => {
    if (!vendorId) return;

    try {
      setLoading(true);
      const response = await customizationAPI.getExpenseSuggestions(vendorId, amount);

      if (response.success && response.data) {
        setTopSuggestion(response.data.top_suggestion || null);
        setSuggestions(response.data.all_suggestions || []);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceBadgeColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-100 text-green-800 border-green-300';
    if (confidence >= 60) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (confidence >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  if (!vendorId || (!loading && !topSuggestion)) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-blue-700">Getting smart suggestions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 mb-4">
      {/* Top Suggestion Card */}
      {topSuggestion && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <Lightbulb className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-gray-900">Smart Suggestion</h4>
                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getConfidenceBadgeColor(topSuggestion.confidence)}`}>
                  {topSuggestion.confidence.toFixed(0)}% confidence
                </span>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{topSuggestion.category}</p>
                  <p className="text-sm text-gray-600">{topSuggestion.expense_type}</p>
                </div>

                <div className="flex items-center space-x-4 text-xs text-gray-600">
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="w-4 h-4" />
                    <span>Used {topSuggestion.usage_count} times</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <DollarSign className="w-4 h-4" />
                    <span>Avg: ${topSuggestion.avg_amount.toFixed(2)}</span>
                  </div>
                  {topSuggestion.last_used && (
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>Last: {new Date(topSuggestion.last_used).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-gray-500 italic">{topSuggestion.reason}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelect(topSuggestion.category, topSuggestion.expense_type)}
              disabled={currentCategory === topSuggestion.category}
              className={`ml-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentCategory === topSuggestion.category
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {currentCategory === topSuggestion.category ? 'Selected' : 'Use This'}
            </button>
          </div>
        </div>
      )}

      {/* Show More Suggestions */}
      {suggestions.length > 1 && (
        <div>
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {showAll ? 'Hide' : 'Show'} {suggestions.length - 1} more suggestion{suggestions.length > 2 ? 's' : ''}
          </button>

          {showAll && (
            <div className="mt-3 space-y-2">
              {suggestions.slice(1).map((suggestion, index) => (
                <div
                  key={index}
                  className="bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-sm font-medium text-gray-900">{suggestion.category}</p>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getConfidenceBadgeColor(suggestion.confidence)}`}>
                          {suggestion.confidence.toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">{suggestion.expense_type}</p>
                      <p className="text-xs text-gray-500 mt-1">{suggestion.reason}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelect(suggestion.category, suggestion.expense_type)}
                      className="ml-3 px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >
                      Use
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartCategorySuggestion;
