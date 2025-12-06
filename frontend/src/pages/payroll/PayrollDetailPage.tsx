import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, CheckCircle, User, DollarSign, FileText, Calendar } from 'lucide-react';
import axios from 'axios';

interface PayrollItem {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  email: string;
  gross_salary: string;
  net_salary: string;
  cas_employer: string;
  cass_employer: string;
  cas_employee: string;
  cass_employee: string;
  income_tax: string;
  total_employer_cost: number;
  days_worked: number;
  calculation_details: any;
}

interface PayrollPeriod {
  id: string;
  year: number;
  month: number;
  month_name: string;
  period_start: string;
  period_end: string;
  working_days: number;
  status: string;
  total_gross_salary: string;
  total_net_salary: string;
  total_employer_cost: number;
  items: PayrollItem[];
}

export default function PayrollDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PayrollPeriod | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchPayrollPeriod();
    }
  }, [id]);

  const fetchPayrollPeriod = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const response = await axios.get(`/api/v1/hr/payroll/get.php?id=${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Company-ID': companyId,
        },
      });

      if (response.data.success) {
        setPeriod(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch payroll period:', error);
    } finally {
      setLoading(false);
    }
  };

  const approvePayroll = async () => {
    if (!confirm('Are you sure you want to approve this payroll period?')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const response = await axios.post(
        '/api/v1/hr/payroll/approve.php',
        { period_id: id },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Company-ID': companyId,
          },
        }
      );

      if (response.data.success) {
        alert('Payroll approved successfully!');
        fetchPayrollPeriod();
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to approve payroll');
    }
  };

  const downloadPayslips = async () => {
    if (!period) return;

    try {
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      // Download payslips for all employees
      for (const item of period.items) {
        const response = await axios.get(
          `/api/v1/hr/payroll/download-payslip.php?period_id=${period.id}&employee_id=${item.employee_id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'X-Company-ID': companyId,
            },
            responseType: 'blob',
          }
        );

        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute(
          'download',
          `Fluturos_${item.employee_code}_${period.year}_${String(period.month).padStart(2, '0')}.pdf`
        );
        document.body.appendChild(link);
        link.click();
        link.remove();

        // Small delay between downloads
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      alert('Payslips downloaded successfully!');
    } catch (error) {
      console.error('Failed to download payslips:', error);
      alert('Failed to download payslips');
    }
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
    }).format(Number(amount));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payroll period...</p>
        </div>
      </div>
    );
  }

  if (!period) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Payroll period not found</p>
          <button
            onClick={() => navigate('/dashboard/payroll')}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            Go back to payroll list
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard/payroll')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Payroll List
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Payroll - {period.month_name} {period.year}
              </h1>
              <p className="mt-2 text-gray-600">
                {period.period_start} to {period.period_end} ({period.working_days} working days)
              </p>
            </div>

            <div className="flex gap-3">
              {period.status === 'calculated' && (
                <button
                  onClick={approvePayroll}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Approve Payroll
                </button>
              )}
              <button
                onClick={downloadPayslips}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download Payslips
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {period.items.length}
                </p>
              </div>
              <User className="w-10 h-10 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Gross Salary</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(period.total_gross_salary)}
                </p>
              </div>
              <DollarSign className="w-10 h-10 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Net Salary</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(period.total_net_salary)}
                </p>
              </div>
              <FileText className="w-10 h-10 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Employer Cost</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(period.total_employer_cost)}
                </p>
              </div>
              <Calendar className="w-10 h-10 text-red-500" />
            </div>
          </div>
        </div>

        {/* Employee Payroll Items */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Employee Payroll Details</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days Worked
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gross Salary
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CAS (25%)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CASS (10%)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Income Tax
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net Salary
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employer Cost
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {period.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {item.employee_name}
                          </div>
                          <div className="text-sm text-gray-500">{item.employee_code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.days_worked} / {period.working_days}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(item.gross_salary)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{formatCurrency(item.cas_employee)} (employee)</div>
                      <div className="text-xs text-gray-500">
                        {formatCurrency(item.cas_employer)} (employer)
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{formatCurrency(item.cass_employee)} (employee)</div>
                      <div className="text-xs text-gray-500">
                        {formatCurrency(item.cass_employer)} (employer)
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(item.income_tax)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {formatCurrency(item.net_salary)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                      {formatCurrency(item.total_employer_cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    TOTAL
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    {formatCurrency(period.total_gross_salary)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                    {formatCurrency(period.total_net_salary)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">
                    {formatCurrency(period.total_employer_cost)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Tax Breakdown Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">
            Romanian Payroll Tax Rates (2025)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-blue-900">CAS (Pension)</p>
              <p className="text-sm text-blue-700">
                25% employee contribution + 25% employer contribution
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900">CASS (Health)</p>
              <p className="text-sm text-blue-700">
                10% employee contribution + 10% employer contribution
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900">Income Tax</p>
              <p className="text-sm text-blue-700">
                10% of taxable income (after CAS, CASS, and 510 RON personal deduction)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
