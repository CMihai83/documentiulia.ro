import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface FieldMapping {
  pattern: string;
  line_index?: number;
  regex?: string;
  example?: string;
}

interface FieldMappings {
  [key: string]: FieldMapping;
}

interface OCRLine {
  index: number;
  text: string;
  length: number;
}

interface Receipt {
  id: string;
  merchant_name: string;
  total_amount: string;
  vat_amount: string;
  receipt_date: string;
  receipt_number: string;
  ocr_raw_text: string;
  file_path: string;
}

interface TemplateData {
  receipt: Receipt;
  ocr_lines: OCRLine[];
  existing_template: any;
  image_url: string;
}

const ReceiptTemplateEditor: React.FC = () => {
  const { receiptId } = useParams<{ receiptId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TemplateData | null>(null);
  const [merchantName, setMerchantName] = useState('');
  const [fieldMappings, setFieldMappings] = useState<FieldMappings>({});
  const [selectedField, setSelectedField] = useState<string>('');
  const [selectedLine, setSelectedLine] = useState<number | null>(null);

  const fieldDefinitions = [
    { key: 'merchant_name', label: 'Merchant Name', icon: '🏪' },
    { key: 'merchant_address', label: 'Merchant Address', icon: '📍' },
    { key: 'receipt_number', label: 'Receipt Number', icon: '🔢' },
    { key: 'receipt_date', label: 'Receipt Date', icon: '📅' },
    { key: 'total_amount', label: 'Total Amount', icon: '💰' },
    { key: 'vat_amount', label: 'VAT Amount', icon: '📊' },
    { key: 'vat_rate', label: 'VAT Rate', icon: '%' },
    { key: 'payment_method', label: 'Payment Method', icon: '💳' }
  ];

  useEffect(() => {
    loadTemplateData();
  }, [receiptId]);

  const loadTemplateData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const response = await fetch(
        `/api/v1/receipts/template-editor.php?receipt_id=${receiptId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Company-ID': companyId || ''
          }
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to load template data');
      }

      setData(result.data);
      setMerchantName(result.data.receipt.merchant_name || '');

      // Load existing template mappings if available
      if (result.data.existing_template?.field_mappings) {
        try {
          const mappings = typeof result.data.existing_template.field_mappings === 'string'
            ? JSON.parse(result.data.existing_template.field_mappings)
            : result.data.existing_template.field_mappings;
          setFieldMappings(mappings);
        } catch (e) {
          console.error('Error parsing field mappings:', e);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLineClick = (line: OCRLine) => {
    if (!selectedField) {
      alert('Please select a field first by clicking on one of the field buttons on the left');
      return;
    }

    setSelectedLine(line.index);

    // Create pattern from selected line
    const pattern = `line:${line.index}`;

    setFieldMappings(prev => ({
      ...prev,
      [selectedField]: {
        pattern,
        line_index: line.index,
        example: line.text
      }
    }));
  };

  const handleSaveTemplate = async () => {
    try {
      setSaving(true);
      setError(null);

      if (!merchantName.trim()) {
        throw new Error('Merchant name is required');
      }

      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const response = await fetch('/api/v1/receipts/template-editor.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Company-ID': companyId || ''
        },
        body: JSON.stringify({
          receipt_id: receiptId,
          merchant_name: merchantName,
          merchant_pattern: merchantName,
          field_mappings: fieldMappings
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to save template');
      }

      alert('Template saved successfully!');
      navigate('/receipts');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClearMapping = (field: string) => {
    setFieldMappings(prev => {
      const newMappings = { ...prev };
      delete newMappings[field];
      return newMappings;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading receipt data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="text-red-600 text-center">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-bold mb-2">Error</h2>
            <p>{error || 'Failed to load template data'}</p>
          </div>
          <button
            onClick={() => navigate('/receipts')}
            className="mt-6 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Receipts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Receipt Template Editor</h1>
              <p className="text-sm text-gray-600 mt-1">
                Click on the text lines in the receipt to assign them to fields
              </p>
            </div>
            <button
              onClick={() => navigate('/receipts')}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Merchant Name */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Merchant Name *
          </label>
          <input
            type="text"
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter merchant name"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Field Selector */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Fields to Extract</h2>
            <p className="text-sm text-gray-600 mb-4">
              Select a field, then click on the corresponding line in the receipt
            </p>

            <div className="space-y-2">
              {fieldDefinitions.map(field => {
                const hasMapping = !!fieldMappings[field.key];
                const isSelected = selectedField === field.key;

                return (
                  <div key={field.key}>
                    <button
                      onClick={() => setSelectedField(field.key)}
                      className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : hasMapping
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <span className="text-xl">{field.icon}</span>
                          <span className="font-medium">{field.label}</span>
                        </span>
                        {hasMapping && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClearMapping(field.key);
                            }}
                            className="text-red-600 hover:text-red-800"
                            title="Clear mapping"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </button>

                    {hasMapping && fieldMappings[field.key].example && (
                      <div className="mt-1 ml-4 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                        <strong>Selected:</strong> {fieldMappings[field.key].example}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {selectedField && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-900">
                  Selected: {fieldDefinitions.find(f => f.key === selectedField)?.label}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Click on a line in the receipt →
                </p>
              </div>
            )}
          </div>

          {/* OCR Text Lines */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Receipt Text</h2>
            <p className="text-sm text-gray-600 mb-4">
              {selectedField ? 'Click on a line to select it' : 'Select a field first'}
            </p>

            <div className="space-y-1 max-h-[600px] overflow-y-auto">
              {data.ocr_lines.map(line => {
                const isMapped = Object.values(fieldMappings).some(
                  mapping => mapping.line_index === line.index
                );
                const isSelected = selectedLine === line.index;

                return (
                  <button
                    key={line.index}
                    onClick={() => handleLineClick(line)}
                    className={`w-full text-left px-3 py-2 rounded text-sm font-mono transition-all ${
                      isSelected
                        ? 'bg-blue-100 border-2 border-blue-500'
                        : isMapped
                        ? 'bg-green-50 border border-green-300'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                    disabled={!selectedField}
                  >
                    <span className="text-gray-400 mr-2">{line.index}:</span>
                    {line.text}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Receipt Image */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Receipt Image</h2>
            {data.image_url ? (
              <img
                src={data.image_url}
                alt="Receipt"
                className="w-full rounded-lg shadow-md"
              />
            ) : (
              <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">No image available</p>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                Mapped fields: {Object.keys(fieldMappings).length} / {fieldDefinitions.length}
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/receipts')}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={saving || !merchantName.trim()}
                className={`px-6 py-2 rounded-lg font-medium ${
                  saving || !merchantName.trim()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {saving ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptTemplateEditor;
