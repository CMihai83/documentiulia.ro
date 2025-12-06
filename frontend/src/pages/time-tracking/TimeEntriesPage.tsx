import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
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
  status: string;
}

const TimeEntriesPage: React.FC = () => {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [, setLoading] = useState(true);
  const [, setShowModal] = useState(false);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const response = await axios.get('/api/v1/time/entries.php', {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Company-ID': companyId,
        },
      });

      if (response.data.success) {
        setEntries(response.data.data.entries);
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteEntry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      await axios.delete(`/api/v1/time/entries.php?id=${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Company-ID': companyId,
        },
      });

      fetchEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Time Entries</h1>
            <p className="text-gray-600 mt-1">Manage all your time entries</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus className="w-5 h-5" />
            <span>New Entry</span>
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Task
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Billable
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Date(entry.entry_date).toLocaleDateString('ro-RO')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      {entry.project_name}
                    </td>
                    <td className="px-6 py-4 text-sm">{entry.task_description}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      {entry.hours?.toFixed(2)}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {entry.is_billable ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <X className="w-5 h-5 text-gray-400" />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        <button className="text-indigo-600 hover:text-indigo-800">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteEntry(entry.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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

export default TimeEntriesPage;
