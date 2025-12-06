import { useState, useEffect } from 'react';
import { Calendar, DollarSign, Users, FileText, CheckCircle, Clock } from 'lucide-react';
import axios from 'axios';

interface PayrollPeriod {
  id: string;
  year: number;
  month: number;
  month_name: string;
  period_start: string;
  period_end: string;
  working_days: number;
  status: 'draft' | 'calculated' | 'approved' | 'paid' | 'closed';
  total_gross_salary: string;
  total_net_salary: string;
  total_employer_cost: number;
  employee_count: number;
  calculated_at?: string;
  approved_at?: string;
  paid_at?: string;
}

export default function PayrollPage() {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [processingPeriod, setProcessingPeriod] = useState<string | null>(null);

  useEffect(() => {
    fetchPayrollPeriods();
  }, [selectedYear]);

  const fetchPayrollPeriods = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const response = await axios.get(
        `/api/v1/hr/payroll/list.php?year=${selectedYear}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Company-ID': companyId,
          },
        }
      );

      if (response.data.success) {
        setPeriods(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch payroll periods:', error);
    } finally {
      setLoading(false);
    }
  };

  const processPayroll = async (year: number, month: number) => {
    try {
      const periodId = `${year}-${month}`;
      setProcessingPeriod(periodId);

      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const response = await axios.post(
        '/api/v1/hr/payroll/process.php',
        { year, month },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Company-ID': companyId,
          },
        }
      );

      if (response.data.success) {
        alert('Payroll processed successfully!');
        fetchPayrollPeriods();
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to process payroll');
    } finally {
      setProcessingPeriod(null);
    }
  };

  const approvePayroll = async (periodId: string) => {
    if (!confirm('Are you sure you want to approve this payroll period?')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const response = await axios.post(
        '/api/v1/hr/payroll/approve.php',
        { period_id: periodId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Company-ID': companyId,
          },
        }
      );

      if (response.data.success) {
        alert('Payroll approved successfully!');
        fetchPayrollPeriods();
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to approve payroll');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'calculated':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'paid':
        return 'bg-purple-100 text-purple-800';
      case 'closed':
        return 'bg-slate-100 text-slate-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
    }).format(Number(amount));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-8 h-8" />
            Payroll Management
          </h1>
          <p className="mt-2 text-gray-600">
            Manage employee payroll, process salaries, and generate payslips
          </p>
        </div>

        {/* Year Selector */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {[2024, 2025, 2026].map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-600">Total Periods</div>
              <div className="text-2xl font-bold text-gray-900">
                {periods.length}
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Gross Salary</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(
                    periods.reduce(
                      (sum, p) => sum + Number(p.total_gross_salary),
                      0
                    )
                  )}
                </p>
              </div>
              <DollarSign className="w-12 h-12 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Net Salary</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(
                    periods.reduce(
                      (sum, p) => sum + Number(p.total_net_salary),
                      0
                    )
                  )}
                </p>
              </div>
              <Users className="w-12 h-12 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Employer Cost</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(
                    periods.reduce((sum, p) => sum + p.total_employer_cost, 0)
                  )}
                </p>
              </div>
              <FileText className="w-12 h-12 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Payroll Periods Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Payroll Periods - {selectedYear}
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading payroll periods...</p>
            </div>
          ) : periods.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                No payroll periods found for {selectedYear}
              </p>
              <button
                onClick={() => processPayroll(selectedYear, 1)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Process January {selectedYear}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employees
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gross Salary
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Net Salary
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employer Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {periods.map((period) => (
                    <tr key={period.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar className="w-5 h-5 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {period.month_name} {period.year}
                            </div>
                            <div className="text-sm text-gray-500">
                              {period.working_days} working days
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                            period.status
                          )}`}
                        >
                          {period.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {period.employee_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(period.total_gross_salary)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(period.total_net_salary)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(period.total_employer_cost)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <a
                            href={`/dashboard/payroll/${period.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View Details
                          </a>
                          {period.status === 'calculated' && (
                            <button
                              onClick={() => approvePayroll(period.id)}
                              className="text-green-600 hover:text-green-900 flex items-center gap-1"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Approve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Process Next Month Button */}
        {periods.length > 0 && periods.length < 12 && (
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                const nextMonth = periods.length + 1;
                processPayroll(selectedYear, nextMonth);
              }}
              disabled={processingPeriod !== null}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
            >
              {processingPeriod ? (
                <>
                  <Clock className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Calendar className="w-5 h-5" />
                  Process Next Month
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
