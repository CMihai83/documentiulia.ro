import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, ChevronRight, ChevronDown, Sparkles } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { customizationAPI } from '../../services/api';

interface Category {
  id: string;
  category_name: string;
  parent_category: string | null;
  statement_section: string;
  is_tax_deductible: boolean;
  requires_receipt: boolean;
  is_custom: boolean;
  is_active: boolean;
  description: string;
  children?: Category[];
}

const CategoryManagementPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [hierarchy, setHierarchy] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [usageStats, setUsageStats] = useState<Record<string, any>>({});

  const [formData, setFormData] = useState({
    category_name: '',
    parent_category: '',
    description: '',
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await customizationAPI.listCategories(false, true);

      if (response.success && response.data) {
        setCategories(response.data.categories || []);
        setHierarchy(response.data.hierarchy || []);
        setUsageStats(response.data.usage_statistics || {});
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await customizationAPI.createCustomCategory(formData);
      setShowCreateModal(false);
      setFormData({ category_name: '', parent_category: '', description: '' });
      loadCategories();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create category');
    }
  };

  const toggleExpand = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  const renderCategoryTree = (category: Category, level = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category.category_name);
    const usage = usageStats[category.category_name];

    return (
      <div key={category.id} className="mb-1">
        <div
          className={`flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors ${
            level > 0 ? 'ml-8 border-l-2 border-gray-200' : ''
          }`}
        >
          <div className="flex items-center space-x-3 flex-1">
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(category.category_name)}
                className="text-gray-400 hover:text-gray-600"
              >
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5" />
                ) : (
                  <ChevronRight className="w-5 h-5" />
                )}
              </button>
            ) : (
              <div className="w-5" />
            )}

            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h4 className={`font-medium ${category.is_custom ? 'text-blue-900' : 'text-gray-900'}`}>
                  {category.category_name}
                </h4>
                {category.is_custom && (
                  <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full flex items-center space-x-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Custom</span>
                  </span>
                )}
              </div>

              {category.description && (
                <p className="text-sm text-gray-600 mt-1">{category.description}</p>
              )}

              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                <span>Section: {category.statement_section}</span>
                {category.parent_category && (
                  <span>Parent: {category.parent_category}</span>
                )}
                {usage && (
                  <span className="text-green-600 font-medium">
                    Used {usage.count} times (${usage.total.toFixed(2)})
                  </span>
                )}
              </div>
            </div>
          </div>

          {category.is_custom && (
            <div className="flex items-center space-x-2">
              <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <Edit2 className="w-4 h-4" />
              </button>
              <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-1">
            {category.children!.map((child) => renderCategoryTree(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const topLevelCategories = categories.filter((c) => !c.parent_category);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Expense Categories</h1>
          <p className="text-gray-600">
            Manage your expense categories with hierarchical organization
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-600">Total Categories</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{categories.length}</p>
          </div>
          <div className="bg-blue-50 rounded-lg shadow-sm border border-blue-200 p-6">
            <h3 className="text-sm font-medium text-blue-600">Custom Categories</h3>
            <p className="text-3xl font-bold text-blue-900 mt-2">
              {categories.filter((c) => c.is_custom).length}
            </p>
          </div>
          <div className="bg-green-50 rounded-lg shadow-sm border border-green-200 p-6">
            <h3 className="text-sm font-medium text-green-600">Top Level Categories</h3>
            <p className="text-3xl font-bold text-green-900 mt-2">
              {topLevelCategories.length}
            </p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Create Custom Category</span>
          </button>
        </div>

        {/* Category Tree */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Category Hierarchy</h2>
            <div className="space-y-2">
              {hierarchy.map((category) => renderCategoryTree(category))}
            </div>
          </div>
        </div>

        {/* Create Category Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Create Custom Category
                </h3>

                <form onSubmit={handleCreateCategory} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.category_name}
                      onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
                      placeholder="e.g., Software Subscriptions"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Parent Category (Optional)
                    </label>
                    <select
                      value={formData.parent_category}
                      onChange={(e) => setFormData({ ...formData, parent_category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">None (Top Level)</option>
                      {topLevelCategories.map((cat) => (
                        <option key={cat.id} value={cat.category_name}>
                          {cat.category_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of this category"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        setFormData({ category_name: '', parent_category: '', description: '' });
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      Create Category
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CategoryManagementPage;
