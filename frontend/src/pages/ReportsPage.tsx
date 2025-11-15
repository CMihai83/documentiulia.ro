import React, { useState } from 'react';
import { FileText, TrendingUp, Calendar, Download, BarChart3 } from 'lucide-react';
import { reportsAPI } from '../services/api';
import DashboardLayout from '../components/layout/DashboardLayout';

type ReportType = 'profit-loss' | 'balance-sheet' | 'cash-flow';

const ReportsPage: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('profit-loss');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      let data;
      switch (selectedReport) {
        case 'profit-loss':
          data = await reportsAPI.getProfitLoss(startDate, endDate);
          break;
        case 'balance-sheet':
          data = await reportsAPI.getBalanceSheet(endDate);
          break;
        case 'cash-flow':
          data = await reportsAPI.getCashFlow(startDate, endDate);
          break;
      }
      setReportData(data);
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    alert(`Export to ${format.toUpperCase()} - Feature coming soon!`);
  };

  const reportTypes = [
    {
      id: 'profit-loss' as ReportType,
      name: 'Profit & Loss',
      description: 'Income statement showing revenue and expenses',
      icon: TrendingUp,
      color: 'bg-green-100 text-green-600',
    },
    {
      id: 'balance-sheet' as ReportType,
      name: 'Balance Sheet',
      description: 'Assets, liabilities, and equity at a point in time',
      icon: BarChart3,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      id: 'cash-flow' as ReportType,
      name: 'Cash Flow',
      description: 'Cash inflows and outflows over time',
      icon: FileText,
      color: 'bg-purple-100 text-purple-600',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
          <p className="text-gray-600 mt-1">Generate comprehensive financial reports and analytics</p>
        </div>

        {/* Report Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            return (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report.id)}
                className={`card text-left transition-all ${
                  selectedReport === report.id
                    ? 'ring-2 ring-primary-500 border-primary-500'
                    : 'hover:shadow-md'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${report.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{report.name}</h3>
                    <p className="text-sm text-gray-600">{report.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Report Configuration */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input"
                disabled={selectedReport === 'balance-sheet'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                {selectedReport === 'balance-sheet' ? 'As of Date' : 'End Date'}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleGenerateReport}
                disabled={loading}
                className="btn-primary w-full disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin inline mr-2" />
                    Generating...
                  </>
                ) : (
                  'Generate Report'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Report Display */}
        {reportData ? (
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {reportTypes.find((r) => r.id === selectedReport)?.name}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedReport === 'balance-sheet'
                    ? `As of ${new Date(endDate).toLocaleDateString()}`
                    : `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport('pdf')}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  PDF
                </button>
                <button
                  onClick={() => handleExport('excel')}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Excel
                </button>
              </div>
            </div>

            {/* Profit & Loss Report */}
            {selectedReport === 'profit-loss' && (
              <div className="space-y-6">
                {/* Revenue Section */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b">Revenue</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">Sales Revenue</span>
                      <span className="font-medium">$45,230.00</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">Service Revenue</span>
                      <span className="font-medium">$12,450.00</span>
                    </div>
                    <div className="flex justify-between py-2 border-t font-semibold">
                      <span className="text-gray-900">Total Revenue</span>
                      <span className="text-green-600">$57,680.00</span>
                    </div>
                  </div>
                </div>

                {/* Cost of Goods Sold */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b">Cost of Goods Sold</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">Materials</span>
                      <span className="font-medium">$15,230.00</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">Labor</span>
                      <span className="font-medium">$8,450.00</span>
                    </div>
                    <div className="flex justify-between py-2 border-t font-semibold">
                      <span className="text-gray-900">Total COGS</span>
                      <span className="text-red-600">$23,680.00</span>
                    </div>
                  </div>
                </div>

                {/* Gross Profit */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Gross Profit</span>
                    <span className="font-bold text-green-700 text-lg">$34,000.00</span>
                  </div>
                </div>

                {/* Operating Expenses */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b">Operating Expenses</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">Salaries</span>
                      <span className="font-medium">$12,000.00</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">Marketing</span>
                      <span className="font-medium">$3,500.00</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">Rent</span>
                      <span className="font-medium">$2,000.00</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">Utilities</span>
                      <span className="font-medium">$800.00</span>
                    </div>
                    <div className="flex justify-between py-2 border-t font-semibold">
                      <span className="text-gray-900">Total Operating Expenses</span>
                      <span className="text-red-600">$18,300.00</span>
                    </div>
                  </div>
                </div>

                {/* Net Income */}
                <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-900 text-lg">Net Income</span>
                    <span className="font-bold text-blue-700 text-xl">$15,700.00</span>
                  </div>
                </div>
              </div>
            )}

            {/* Balance Sheet Report */}
            {selectedReport === 'balance-sheet' && (
              <div className="space-y-6">
                {/* Assets */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b">Assets</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Current Assets</p>
                      <div className="ml-4 space-y-2">
                        <div className="flex justify-between py-1">
                          <span className="text-gray-600">Cash</span>
                          <span>$25,000.00</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-gray-600">Accounts Receivable</span>
                          <span>$15,000.00</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-gray-600">Inventory</span>
                          <span>$10,000.00</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between py-2 font-semibold border-t">
                      <span className="text-gray-900">Total Assets</span>
                      <span className="text-green-600">$50,000.00</span>
                    </div>
                  </div>
                </div>

                {/* Liabilities */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b">Liabilities</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Current Liabilities</p>
                      <div className="ml-4 space-y-2">
                        <div className="flex justify-between py-1">
                          <span className="text-gray-600">Accounts Payable</span>
                          <span>$8,000.00</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-gray-600">Short-term Loans</span>
                          <span>$5,000.00</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between py-2 font-semibold border-t">
                      <span className="text-gray-900">Total Liabilities</span>
                      <span className="text-red-600">$13,000.00</span>
                    </div>
                  </div>
                </div>

                {/* Equity */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold text-gray-900">Owner's Equity</span>
                    <span className="font-bold text-blue-700">$37,000.00</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Assets ($50,000) - Liabilities ($13,000) = Equity ($37,000)
                  </div>
                </div>
              </div>
            )}

            {/* Cash Flow Report */}
            {selectedReport === 'cash-flow' && (
              <div className="space-y-6">
                {/* Operating Activities */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b">Operating Activities</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">Cash from customers</span>
                      <span className="text-green-600 font-medium">$52,000.00</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">Cash to suppliers</span>
                      <span className="text-red-600 font-medium">($28,000.00)</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">Cash to employees</span>
                      <span className="text-red-600 font-medium">($12,000.00)</span>
                    </div>
                    <div className="flex justify-between py-2 border-t font-semibold">
                      <span className="text-gray-900">Net Cash from Operations</span>
                      <span className="text-green-600">$12,000.00</span>
                    </div>
                  </div>
                </div>

                {/* Investing Activities */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b">Investing Activities</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">Equipment purchases</span>
                      <span className="text-red-600 font-medium">($5,000.00)</span>
                    </div>
                    <div className="flex justify-between py-2 border-t font-semibold">
                      <span className="text-gray-900">Net Cash from Investing</span>
                      <span className="text-red-600">($5,000.00)</span>
                    </div>
                  </div>
                </div>

                {/* Financing Activities */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b">Financing Activities</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">Loan proceeds</span>
                      <span className="text-green-600 font-medium">$10,000.00</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">Loan repayments</span>
                      <span className="text-red-600 font-medium">($2,000.00)</span>
                    </div>
                    <div className="flex justify-between py-2 border-t font-semibold">
                      <span className="text-gray-900">Net Cash from Financing</span>
                      <span className="text-green-600">$8,000.00</span>
                    </div>
                  </div>
                </div>

                {/* Net Change in Cash */}
                <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                  <div className="flex justify-between mb-2">
                    <span className="font-bold text-gray-900">Net Change in Cash</span>
                    <span className="font-bold text-blue-700 text-lg">$15,000.00</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Operating ($12,000) + Investing (-$5,000) + Financing ($8,000)
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="card text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Report Generated</h3>
            <p className="text-gray-600 mb-4">
              Select a report type, choose your date range, and click "Generate Report" to view financial data
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ReportsPage;
