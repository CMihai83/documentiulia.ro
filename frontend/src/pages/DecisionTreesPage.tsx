import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import DecisionTreeNavigator from '../components/DecisionTreeNavigator';
import { BookOpen, Search, TrendingUp } from 'lucide-react';

interface DecisionTree {
  id: number;
  tree_key: string;
  tree_name: string;
  description: string;
  category: string;
  icon: string;
}

const DecisionTreesPage: React.FC = () => {
  const [trees, setTrees] = useState<DecisionTree[]>([]);
  const [selectedTreeId, setSelectedTreeId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAvailableTrees();
  }, []);

  const loadAvailableTrees = async () => {
    try {
      const response = await fetch('/api/v1/fiscal/decision-trees');
      const data = await response.json();

      if (data.success) {
        setTrees(data.trees || []);
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to load decision trees:', error);
      setLoading(false);
    }
  };

  const handleTreeSelect = (treeId: number) => {
    setSelectedTreeId(treeId);
  };

  const handleBackToList = () => {
    setSelectedTreeId(null);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Fiscal': 'bg-blue-100 text-blue-800',
      'Accounting': 'bg-green-100 text-green-800',
      'HR': 'bg-purple-100 text-purple-800',
      'Legal': 'bg-red-100 text-red-800',
      'Business': 'bg-yellow-100 text-yellow-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (selectedTreeId) {
    return (
      <DashboardLayout>
        <div className="mb-4">
          <button
            onClick={handleBackToList}
            className="px-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
          >
            ← Înapoi la listă
          </button>
        </div>
        <DecisionTreeNavigator
          treeId={selectedTreeId}
          onComplete={(answer) => {
            console.log('Decision tree completed:', answer);
          }}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Arbori de Decizie Legislativă</h1>
          </div>
          <p className="text-gray-600 text-lg">
            Găsește răspunsuri rapide la întrebări fiscale, contabile și de HR prin ghidaje pas-cu-pas
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Empty State */}
        {!loading && trees.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
            <BookOpen className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">
              Niciun arbore de decizie disponibil încă
            </h3>
            <p className="text-yellow-700">
              Arborii de decizie vor fi adăugați în curând pentru a te ajuta să găsești răspunsuri rapide.
            </p>
          </div>
        )}

        {/* Trees Grid */}
        {!loading && trees.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trees.map((tree) => (
              <div
                key={tree.id}
                onClick={() => handleTreeSelect(tree.id)}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg ${getCategoryColor(tree.category)}`}>
                    {tree.icon === 'scale' && <BookOpen className="w-6 h-6" />}
                    {tree.icon === 'trending-up' && <TrendingUp className="w-6 h-6" />}
                    {tree.icon === 'search' && <Search className="w-6 h-6" />}
                    {!['scale', 'trending-up', 'search'].includes(tree.icon) && (
                      <BookOpen className="w-6 h-6" />
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${getCategoryColor(tree.category)}`}>
                    {tree.category}
                  </span>
                </div>

                <h3 className="font-bold text-lg text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {tree.tree_name}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-3">
                  {tree.description}
                </p>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <span className="text-sm text-blue-600 font-medium group-hover:text-blue-700">
                    Începe ghidarea →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Banner */}
        <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
          <h3 className="font-semibold text-gray-900 mb-2">💡 Cum funcționează?</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex gap-2">
              <span className="text-blue-600">1.</span>
              <span>Selectează un arbore de decizie relevant pentru întrebarea ta</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600">2.</span>
              <span>Răspunde la întrebări simple despre situația ta</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600">3.</span>
              <span>Primești răspunsul exact cu referințe legislative aplicabile</span>
            </li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DecisionTreesPage;
