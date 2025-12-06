import React, { useState } from 'react';
import { X, AlertCircle, CheckCircle } from 'lucide-react';
import { customizationAPI } from '../../services/api';

interface CustomAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORY_STRUCTURE = {
  'Assets': {
    code_range: ['1000', '1999'],
    statement: 'balance_sheet',
    subcategories: ['Current Assets', 'Fixed Assets', 'Intangible Assets'],
  },
  'Liabilities': {
    code_range: ['2000', '2999'],
    statement: 'balance_sheet',
    subcategories: ['Current Liabilities', 'Long-term Liabilities'],
  },
  'Equity': {
    code_range: ['3000', '3999'],
    statement: 'balance_sheet',
    subcategories: ['Capital', 'Retained Earnings', 'Draws'],
  },
  'Revenue': {
    code_range: ['4000', '4999'],
    statement: 'income_statement',
    subcategories: ['Product Sales', 'Service Revenue', 'Other Income'],
  },
  'COGS': {
    code_range: ['5000', '5999'],
    statement: 'income_statement',
    subcategories: ['Direct Materials', 'Direct Labor', 'Manufacturing Overhead', 'Freight In'],
  },
  'Operating Expenses': {
    code_range: ['6000', '7999'],
    statement: 'income_statement',
    subcategories: [
      'Salaries & Wages',
      'Rent & Utilities',
      'Marketing & Advertising',
      'Office Supplies',
      'Professional Fees',
      'Insurance',
      'Depreciation',
      'Travel & Entertainment',
      'IT & Software',
      'Other Operating Expenses',
    ],
  },
};

const CustomAccountModal: React.FC<CustomAccountModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    account_code: '',
    account_name: '',
    category: '',
    subcategory: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const selectedCategory = formData.category ? CATEGORY_STRUCTURE[formData.category as keyof typeof CATEGORY_STRUCTURE] : null;

  const validateAccountCode = () => {
    if (!formData.account_code || !selectedCategory) return true;

    const code = parseInt(formData.account_code);
    const [min, max] = selectedCategory.code_range;

    return code >= parseInt(min) && code <= parseInt(max);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateAccountCode()) {
      setError(`Account code must be between ${selectedCategory?.code_range[0]} and ${selectedCategory?.code_range[1]} for ${formData.category}`);
      return;
    }

    try {
      setLoading(true);
      await customizationAPI.createCustomAccount({
        account_code: formData.account_code,
        account_name: formData.account_name,
        category: formData.category,
        subcategory: formData.subcategory || undefined,
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create custom account');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ account_code: '', account_name: '', category: '', subcategory: '' });
    setError('');
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Create Custom Account</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-800">Custom account created successfully!</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <span className="text-red-800 text-sm">{error}</span>
            </div>
          )}

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <select
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value, account_code: '', subcategory: '' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a category</option>
              {Object.keys(CATEGORY_STRUCTURE).map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Code Range Info */}
          {selectedCategory && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Code Range:</strong> {selectedCategory.code_range[0]} - {selectedCategory.code_range[1]}
              </p>
              <p className="text-sm text-blue-900 mt-1">
                <strong>Statement:</strong> {selectedCategory.statement === 'income_statement' ? 'Income Statement' : 'Balance Sheet'}
              </p>
            </div>
          )}

          {/* Account Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Code *
            </label>
            <input
              type="text"
              required
              value={formData.account_code}
              onChange={(e) => setFormData({ ...formData, account_code: e.target.value })}
              placeholder={selectedCategory ? `e.g., ${selectedCategory.code_range[0]}` : 'Select category first'}
              disabled={!formData.category}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                !validateAccountCode() ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
            {!validateAccountCode() && formData.account_code && (
              <p className="text-xs text-red-600 mt-1">
                Code must be between {selectedCategory?.code_range[0]} and {selectedCategory?.code_range[1]}
              </p>
            )}
          </div>

          {/* Account Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Name *
            </label>
            <input
              type="text"
              required
              value={formData.account_name}
              onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
              placeholder="e.g., Custom Packaging Materials"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Subcategory */}
          {selectedCategory && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subcategory (Optional)
              </label>
              <select
                value={formData.subcategory}
                onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">None</option>
                {selectedCategory.subcategories.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          )}

          {/* Aggregation Preview */}
          {formData.category && formData.account_code && formData.account_name && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">Aggregation Preview</h4>
              <p className="text-sm text-green-800">
                This account will automatically be included in:
              </p>
              <ul className="text-sm text-green-800 mt-2 space-y-1 list-disc list-inside">
                <li><strong>{selectedCategory?.statement === 'income_statement' ? 'Income Statement' : 'Balance Sheet'}</strong></li>
                <li><strong>{formData.category}</strong> section</li>
                {formData.subcategory && <li><strong>{formData.subcategory}</strong> subcategory</li>}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !validateAccountCode() || success}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : success ? 'Created!' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomAccountModal;
