'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface EmployeeDashboard {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    position: string;
    department: string;
    hireDate: string;
    manager?: { id: string; name: string };
  };
  leaveBalance: {
    annual: number;
    medical: number;
    usedAnnual: number;
    usedMedical: number;
  };
  upcomingLeave: Array<{
    id: string;
    type: string;
    startDate: string;
    endDate: string;
    status: string;
  }>;
  recentPayslips: Array<{
    id: string;
    month: string;
    year: number;
    grossAmount: number;
    netAmount: number;
    downloadUrl: string;
  }>;
  pendingRequests: number;
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    createdAt: string;
    read: boolean;
  }>;
  announcements: Array<{
    id: string;
    title: string;
    content: string;
    priority: string;
    createdAt: string;
  }>;
  quickActions: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    action: string;
  }>;
}

export default function EmployeePortalDashboard() {
  const params = useParams();
  const userId = params.userId as string;
  const [dashboardData, setDashboardData] = useState<EmployeeDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await fetch(`/api/employee-portal/${userId}/dashboard`);
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard');
        }
        const data = await response.json();
        setDashboardData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchDashboard();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">Error: {error}</div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center">
        <p className="text-gray-500">No dashboard data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Welcome back, {dashboardData.employee.firstName} {dashboardData.employee.lastName}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900">Position</h3>
            <p className="text-blue-700">{dashboardData.employee.position}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-900">Department</h3>
            <p className="text-green-700">{dashboardData.employee.department}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-900">Manager</h3>
            <p className="text-purple-700">{dashboardData.employee.manager?.name || 'Not assigned'}</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <h3 className="font-semibold text-orange-900">Hire Date</h3>
            <p className="text-orange-700">{new Date(dashboardData.employee.hireDate).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Leave Balance & Upcoming Leave */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Leave Balance</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Annual Leave</span>
              <span className="font-semibold">
                {dashboardData.leaveBalance.usedAnnual} / {dashboardData.leaveBalance.annual} days used
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{
                  width: `${(dashboardData.leaveBalance.usedAnnual / dashboardData.leaveBalance.annual) * 100}%`,
                }}
              ></div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Medical Leave</span>
              <span className="font-semibold">
                {dashboardData.leaveBalance.usedMedical} / {dashboardData.leaveBalance.medical} days used
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{
                  width: `${(dashboardData.leaveBalance.usedMedical / dashboardData.leaveBalance.medical) * 100}%`,
                }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Leave</h3>
          {dashboardData.upcomingLeave.length > 0 ? (
            <div className="space-y-3">
              {dashboardData.upcomingLeave.map((leave) => (
                <div key={leave.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium capitalize">{leave.type.replace('_', ' ')}</h4>
                      <p className="text-sm text-gray-600">
                        {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      leave.status === 'APPROVED'
                        ? 'bg-green-100 text-green-800'
                        : leave.status === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {leave.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No upcoming leave</p>
          )}
        </div>
      </div>

      {/* Recent Payslips */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Payslips</h3>
        {dashboardData.recentPayslips.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gross Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dashboardData.recentPayslips.map((payslip) => (
                  <tr key={payslip.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {payslip.month} {payslip.year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      €{payslip.grossAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      €{payslip.netAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <a
                        href={payslip.downloadUrl}
                        className="text-blue-600 hover:text-blue-900"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Download
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No recent payslips</p>
        )}
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Notifications</h3>
        {dashboardData.notifications.length > 0 ? (
          <div className="space-y-3">
            {dashboardData.notifications.slice(0, 5).map((notification) => (
              <div key={notification.id} className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg">
                <h4 className="font-medium text-gray-900">{notification.title}</h4>
                <p className="text-sm text-gray-600">{notification.message}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(notification.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No notifications</p>
        )}
      </div>
    </div>
  );
}