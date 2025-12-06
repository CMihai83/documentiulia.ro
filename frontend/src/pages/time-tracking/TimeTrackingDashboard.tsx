import React, { useState, useEffect } from 'react';
import { Clock, Play, Square, Calendar, TrendingUp, Users } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

interface TimeEntry {
  id: string;
  project_id: string;
  project_name: string;
  task_description: string;
  entry_date: string;
  start_time: string;
  end_time: string | null;
  hours: number | null;
  is_billable: boolean;
  billable_amount: number | null;
  status: 'running' | 'stopped' | 'approved';
}

interface DashboardStats {
  today_hours: number;
  week_hours: number;
  month_hours: number;
  billable_hours: number;
  active_entries: number;
  pending_approval: number;
}

const TimeTrackingDashboard: React.FC = () => {
  const { } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    today_hours: 0,
    week_hours: 0,
    month_hours: 0,
    billable_hours: 0,
    active_entries: 0,
    pending_approval: 0,
  });
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([]);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      // Fetch stats
      const statsResponse = await axios.get('/api/v1/time/stats.php', {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Company-ID': companyId,
        },
      });

      if (statsResponse.data.success) {
        setStats(statsResponse.data.data);
      }

      // Fetch recent entries
      const entriesResponse = await axios.get('/api/v1/time/entries.php?limit=10', {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Company-ID': companyId,
        },
      });

      if (entriesResponse.data.success) {
        const entries = entriesResponse.data.data.entries;
        setRecentEntries(entries);

        // Find active entry
        const active = entries.find((e: TimeEntry) => e.status === 'running');
        setActiveEntry(active || null);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Future feature: Start timer from dashboard
  // const startTimer = async (_projectId: string, _description: string) => {
  //   try {
  //     const token = localStorage.getItem('auth_token');
  //     const companyId = localStorage.getItem('company_id');

  //     const response = await axios.post(
  //       '/api/v1/time/entries.php?action=start',
  //       {
  //         project_id: _projectId,
  //         task_description: _description,
  //       },
  //       {
  //         headers: {
  //           Authorization: `Bearer ${token}`,
  //           'X-Company-ID': companyId,
  //           'Content-Type': 'application/json',
  //         },
  //       }
  //     );

  //     if (response.data.success) {
  //       fetchDashboardData();
  //     }
  //   } catch (error) {
  //     console.error('Error starting timer:', error);
  //   }
  // };

  const stopTimer = async (entryId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const response = await axios.post(
        '/api/v1/time/entries.php?action=stop',
        {
          entry_id: entryId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Company-ID': companyId,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Error stopping timer:', error);
    }
  };

  const formatHours = (hours: number | null) => {
    if (!hours) return '0.00';
    return hours.toFixed(2);
  };

  const formatTime = (time: string | null) => {
    if (!time) return '-';
    return new Date(`2000-01-01 ${time}`).toLocaleTimeString('ro-RO', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Time Tracking</h1>
            <p className="text-gray-600 mt-1">Track and manage your work hours</p>
          </div>
          <button
            onClick={() => (window.location.href = '/time/entries')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            View All Entries
          </button>
        </div>

        {/* Active Timer */}
        {activeEntry && (
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{activeEntry.project_name}</h3>
                  <p className="text-white/80">{activeEntry.task_description}</p>
                </div>
              </div>
              <button
                onClick={() => stopTimer(activeEntry.id)}
                className="flex items-center space-x-2 px-6 py-3 bg-white text-indigo-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
              >
                <Square className="w-5 h-5 fill-current" />
                <span>Stop Timer</span>
              </button>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {formatHours(stats.today_hours)}h
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Week</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {formatHours(stats.week_hours)}h
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {formatHours(stats.month_hours)}h
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Billable Hours</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {formatHours(stats.billable_hours)}h
                </p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Timers</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {stats.active_entries}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Play className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {stats.pending_approval}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Entries */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Recent Time Entries</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(entry.entry_date).toLocaleDateString('ro-RO')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {entry.project_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {entry.task_description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatHours(entry.hours)}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          entry.status === 'running'
                            ? 'bg-green-100 text-green-800'
                            : entry.status === 'approved'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TimeTrackingDashboard;
