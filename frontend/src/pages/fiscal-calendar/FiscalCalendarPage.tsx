import { useState, useEffect } from 'react';
import { Calendar, AlertCircle, CheckCircle, Clock, Download, Upload, FileText } from 'lucide-react';
import axios from 'axios';

interface CalendarEntry {
  id: string;
  deadline_code: string;
  deadline_name: string;
  due_date: string;
  description: string;
  urgency: 'overdue' | 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'submitted' | 'approved';
  declaration_id?: string;
  can_auto_generate: boolean;
}

interface GroupedCalendar {
  [month: string]: CalendarEntry[];
}

export default function FiscalCalendarPage() {
  const [calendar, setCalendar] = useState<GroupedCalendar>({});
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [showDeclarations, setShowDeclarations] = useState(false);

  useEffect(() => {
    fetchFiscalCalendar();
  }, [selectedYear]);

  const fetchFiscalCalendar = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const response = await axios.get(
        `/api/v1/fiscal-calendar/my-calendar.php?year=${selectedYear}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Company-ID': companyId,
          },
        }
      );

      if (response.data.success) {
        setCalendar(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch fiscal calendar:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'critical':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'high':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'medium':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'overdue':
      case 'critical':
        return <AlertCircle className="w-5 h-5" />;
      case 'high':
        return <Clock className="w-5 h-5" />;
      default:
        return <Calendar className="w-5 h-5" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const uploadDeclaration = async (entryId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.xml';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('calendar_entry_id', entryId);

      try {
        const token = localStorage.getItem('auth_token');
        const companyId = localStorage.getItem('company_id');

        const response = await axios.post(
          '/api/v1/fiscal-calendar/declaration-file.php',
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'X-Company-ID': companyId,
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        if (response.data.success) {
          alert('Declaration uploaded successfully!');
          fetchFiscalCalendar();
        }
      } catch (error: any) {
        alert(error.response?.data?.message || 'Failed to upload declaration');
      }
    };
    input.click();
  };

  const downloadDeclaration = async (declarationId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const response = await axios.get(
        `/api/v1/fiscal-calendar/declaration-file.php?id=${declarationId}`,
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
      link.setAttribute('download', `declaration_${declarationId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Failed to download declaration');
    }
  };

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-8 h-8" />
            Fiscal Calendar
          </h1>
          <p className="mt-2 text-gray-600">
            Track Romanian fiscal deadlines and manage declarations
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {[2024, 2025, 2026].map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Month
                </label>
                <select
                  value={selectedMonth || ''}
                  onChange={(e) => setSelectedMonth(e.target.value || null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Months</option>
                  {monthNames.map((month, index) => (
                    <option key={month} value={(index + 1).toString()}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={() => setShowDeclarations(!showDeclarations)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <FileText className="w-5 h-5" />
              {showDeclarations ? 'Show Calendar' : 'Show Declarations'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading fiscal calendar...</p>
          </div>
        ) : showDeclarations ? (
          /* Declaration History View */
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Declaration History
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {Object.entries(calendar).map(([, entries]) =>
                  entries
                    .filter((entry) => entry.declaration_id)
                    .map((entry) => (
                      <div
                        key={entry.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <FileText className="w-6 h-6 text-blue-600" />
                              <div>
                                <h3 className="font-medium text-gray-900">
                                  {entry.deadline_name} ({entry.deadline_code})
                                </h3>
                                <p className="text-sm text-gray-600">
                                  Due: {entry.due_date}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(entry.status)}
                            <span className="text-sm text-gray-600">
                              {entry.status}
                            </span>
                            <button
                              onClick={() =>
                                downloadDeclaration(entry.declaration_id!)
                              }
                              className="ml-4 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                            >
                              <Download className="w-4 h-4" />
                              Download PDF
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Calendar View */
          <div className="space-y-6">
            {Object.entries(calendar)
              .filter(
                ([monthName]) =>
                  !selectedMonth || monthName === monthNames[Number(selectedMonth) - 1]
              )
              .map(([month, entries]) => (
                <div key={month} className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {month} - {entries.length} deadline{entries.length !== 1 ? 's' : ''}
                    </h2>
                  </div>

                  <div className="divide-y divide-gray-200">
                    {entries.map((entry) => (
                      <div
                        key={entry.id}
                        className={`p-6 border-l-4 ${getUrgencyColor(
                          entry.urgency
                        )}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {getUrgencyIcon(entry.urgency)}
                              <div>
                                <h3 className="font-semibold text-gray-900">
                                  {entry.deadline_name}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  Code: {entry.deadline_code} | Due:{' '}
                                  {entry.due_date}
                                </p>
                              </div>
                            </div>
                            <p className="text-sm text-gray-700 ml-8">
                              {entry.description}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 ml-4">
                            {entry.declaration_id ? (
                              <button
                                onClick={() =>
                                  downloadDeclaration(entry.declaration_id!)
                                }
                                className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                              >
                                <Download className="w-4 h-4" />
                                Download
                              </button>
                            ) : (
                              <button
                                onClick={() => uploadDeclaration(entry.id)}
                                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                              >
                                <Upload className="w-4 h-4" />
                                Upload
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Urgency Badge */}
                        <div className="mt-3 ml-8">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUrgencyColor(
                              entry.urgency
                            )} border`}
                          >
                            {entry.urgency.toUpperCase()}
                          </span>
                          {entry.can_auto_generate && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-300">
                              Auto-generate available
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Legend */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Urgency Levels
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm">Overdue (past deadline)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded"></div>
              <span className="text-sm">Critical (&lt;3 days)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span className="text-sm">High (3-7 days)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-sm">Medium (7-14 days)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm">Low (&gt;14 days)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
