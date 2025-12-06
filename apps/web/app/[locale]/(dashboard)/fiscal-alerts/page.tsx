'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  FileText,
  Calculator,
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  Filter,
  Plus,
  Settings,
  BellRing,
  Mail,
  MessageSquare,
} from 'lucide-react';

interface FiscalDeadline {
  id: string;
  title: string;
  description: string;
  date: Date;
  type: 'tva' | 'impozit' | 'contributii' | 'declaratii' | 'saft' | 'bilant';
  status: 'upcoming' | 'due_soon' | 'overdue' | 'completed';
  amount?: number;
  form?: string;
  reminderSet?: boolean;
}

const deadlineTypes = {
  tva: { label: 'TVA', icon: Calculator, color: 'bg-blue-500' },
  impozit: { label: 'Impozit', icon: TrendingUp, color: 'bg-purple-500' },
  contributii: { label: 'Contribuții', icon: Users, color: 'bg-green-500' },
  declaratii: { label: 'Declarații', icon: FileText, color: 'bg-orange-500' },
  saft: { label: 'SAF-T', icon: Building2, color: 'bg-red-500' },
  bilant: { label: 'Bilanț', icon: CreditCard, color: 'bg-indigo-500' },
};

// Romanian fiscal calendar mock data
const generateDeadlines = (): FiscalDeadline[] => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  return [
    // TVA Monthly
    {
      id: '1',
      title: 'Decont TVA D300',
      description: 'Declarație lunară TVA pentru luna precedentă',
      date: new Date(currentYear, currentMonth, 25),
      type: 'tva',
      status: now.getDate() > 20 ? 'due_soon' : 'upcoming',
      form: 'D300',
      reminderSet: true,
    },
    {
      id: '2',
      title: 'Plată TVA',
      description: 'Plata TVA aferent decontului D300',
      date: new Date(currentYear, currentMonth, 25),
      type: 'tva',
      status: now.getDate() > 20 ? 'due_soon' : 'upcoming',
      amount: 15420,
      reminderSet: true,
    },
    // Contribuții salariale
    {
      id: '3',
      title: 'Declarație Unică D112',
      description: 'Declarație contribuții sociale și salariale',
      date: new Date(currentYear, currentMonth, 25),
      type: 'contributii',
      status: now.getDate() > 20 ? 'due_soon' : 'upcoming',
      form: 'D112',
      reminderSet: true,
    },
    {
      id: '4',
      title: 'Plată Contribuții',
      description: 'Plata CAS, CASS, impozit salarii',
      date: new Date(currentYear, currentMonth, 25),
      type: 'contributii',
      status: now.getDate() > 20 ? 'due_soon' : 'upcoming',
      amount: 8750,
      reminderSet: false,
    },
    // Impozit pe profit trimestrial
    {
      id: '5',
      title: 'Impozit Micro T4',
      description: 'Impozit pe venit microîntreprinderi trimestrul 4',
      date: new Date(currentYear, 0, 25), // 25 ianuarie
      type: 'impozit',
      status: currentMonth === 0 && now.getDate() <= 25 ? 'due_soon' : 'completed',
      form: 'D100',
      amount: 2340,
    },
    // SAF-T
    {
      id: '6',
      title: 'Raport SAF-T D406',
      description: 'Raportare SAF-T lunară către ANAF',
      date: new Date(currentYear, currentMonth + 1, 1),
      type: 'saft',
      status: 'upcoming',
      form: 'D406',
      reminderSet: true,
    },
    // Declarații anuale
    {
      id: '7',
      title: 'Bilanț Anual',
      description: 'Situații financiare anuale',
      date: new Date(currentYear, 4, 30), // 30 mai
      type: 'bilant',
      status: currentMonth < 5 ? 'upcoming' : 'completed',
      form: 'Situații financiare',
    },
    // Previous month - completed
    {
      id: '8',
      title: 'Decont TVA D300 - Luna precedentă',
      description: 'Declarație lunară TVA',
      date: new Date(currentYear, currentMonth - 1, 25),
      type: 'tva',
      status: 'completed',
      form: 'D300',
    },
    {
      id: '9',
      title: 'Plată TVA - Luna precedentă',
      description: 'Plata TVA aferent decontului',
      date: new Date(currentYear, currentMonth - 1, 25),
      type: 'tva',
      status: 'completed',
      amount: 12680,
    },
    // Overdue example
    {
      id: '10',
      title: 'Declarație Recapitulativă D390',
      description: 'Livrări și achiziții intracomunitare',
      date: new Date(currentYear, currentMonth, 15),
      type: 'declaratii',
      status: now.getDate() > 15 ? 'overdue' : 'due_soon',
      form: 'D390',
    },
  ];
};

const monthNames = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
];

const dayNames = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'];

export default function FiscalAlertsPage() {
  const [deadlines] = useState<FiscalDeadline[]>(generateDeadlines());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [filterType, setFilterType] = useState<string>('all');
  const [showReminderModal, setShowReminderModal] = useState(false);

  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();

  // Generate calendar days
  const generateCalendarDays = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];

    // Add empty slots for days before the first day of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const getDeadlinesForDay = (day: number) => {
    return deadlines.filter(d => {
      const deadlineDate = new Date(d.date);
      return (
        deadlineDate.getDate() === day &&
        deadlineDate.getMonth() === currentMonth &&
        deadlineDate.getFullYear() === currentYear
      );
    });
  };

  const filteredDeadlines = filterType === 'all'
    ? deadlines
    : deadlines.filter(d => d.type === filterType);

  const upcomingDeadlines = filteredDeadlines
    .filter(d => d.status !== 'completed')
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const overdueCount = deadlines.filter(d => d.status === 'overdue').length;
  const dueSoonCount = deadlines.filter(d => d.status === 'due_soon').length;
  const upcomingCount = deadlines.filter(d => d.status === 'upcoming').length;
  const completedCount = deadlines.filter(d => d.status === 'completed').length;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ro-RO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getDaysUntil = (date: Date) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return `${Math.abs(diff)} zile întârziere`;
    if (diff === 0) return 'Astăzi';
    if (diff === 1) return 'Mâine';
    return `${diff} zile`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue': return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800';
      case 'due_soon': return 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800';
      case 'upcoming': return 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800';
      case 'completed': return 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'overdue': return 'Restant';
      case 'due_soon': return 'Scadent curând';
      case 'upcoming': return 'Viitor';
      case 'completed': return 'Completat';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Calendar Fiscal</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Monitorizează termene și obligații fiscale
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReminderModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Bell className="w-4 h-4" />
            Setează Reminder
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-200 dark:border-gray-800"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{overdueCount}</p>
              <p className="text-sm text-gray-500">Restante</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-200 dark:border-gray-800"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{dueSoonCount}</p>
              <p className="text-sm text-gray-500">Scadente curând</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-200 dark:border-gray-800"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{upcomingCount}</p>
              <p className="text-sm text-gray-500">Viitoare</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-200 dark:border-gray-800"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedCount}</p>
              <p className="text-sm text-gray-500">Completate</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters and View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors ${
              filterType === 'all'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Toate
          </button>
          {Object.entries(deadlineTypes).map(([key, value]) => (
            <button
              key={key}
              onClick={() => setFilterType(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors ${
                filterType === key
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <value.icon className="w-3.5 h-3.5" />
              {value.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('calendar')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'calendar'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Calendar className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <FileText className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <div className="lg:col-span-2 bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {monthNames[currentMonth]} {currentYear}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedDate(new Date(currentYear, currentMonth - 1, 1))}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedDate(new Date())}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Astăzi
                </button>
                <button
                  onClick={() => setSelectedDate(new Date(currentYear, currentMonth + 1, 1))}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Day Headers */}
              {dayNames.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-gray-500 py-2"
                >
                  {day}
                </div>
              ))}

              {/* Calendar Days */}
              {generateCalendarDays().map((day, index) => {
                const dayDeadlines = day ? getDeadlinesForDay(day) : [];
                const isToday = day === new Date().getDate() &&
                  currentMonth === new Date().getMonth() &&
                  currentYear === new Date().getFullYear();
                const hasOverdue = dayDeadlines.some(d => d.status === 'overdue');
                const hasDueSoon = dayDeadlines.some(d => d.status === 'due_soon');

                return (
                  <div
                    key={index}
                    className={`min-h-[80px] p-1 border border-gray-100 dark:border-gray-800 rounded-lg ${
                      day ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900' : ''
                    } ${isToday ? 'bg-primary/5 border-primary' : ''}`}
                  >
                    {day && (
                      <>
                        <div className={`text-sm font-medium mb-1 ${
                          isToday ? 'text-primary' : ''
                        }`}>
                          {day}
                        </div>
                        <div className="space-y-0.5">
                          {dayDeadlines.slice(0, 2).map((deadline) => {
                            const typeInfo = deadlineTypes[deadline.type];
                            return (
                              <div
                                key={deadline.id}
                                className={`text-xs px-1 py-0.5 rounded truncate ${typeInfo.color} text-white`}
                                title={deadline.title}
                              >
                                {deadline.title.length > 12
                                  ? deadline.title.substring(0, 12) + '...'
                                  : deadline.title}
                              </div>
                            );
                          })}
                          {dayDeadlines.length > 2 && (
                            <div className="text-xs text-gray-500">
                              +{dayDeadlines.length - 2} mai mult
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="lg:col-span-2 bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="font-semibold">Toate Termenele</h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredDeadlines
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .map((deadline) => {
                  const typeInfo = deadlineTypes[deadline.type];
                  return (
                    <div
                      key={deadline.id}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                          <typeInfo.icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium truncate">{deadline.title}</h3>
                            <span className={`px-2 py-0.5 text-xs rounded-full border ${getStatusColor(deadline.status)}`}>
                              {getStatusLabel(deadline.status)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                            {deadline.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(deadline.date)}
                            </span>
                            {deadline.form && (
                              <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                {deadline.form}
                              </span>
                            )}
                            {deadline.amount && (
                              <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300">
                                {deadline.amount.toLocaleString('ro-RO')} RON
                              </span>
                            )}
                          </div>
                        </div>
                        {deadline.reminderSet && (
                          <BellRing className="w-4 h-4 text-primary" />
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Upcoming Deadlines Sidebar */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                Termene Apropiate
              </h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[400px] overflow-y-auto">
              {upcomingDeadlines.slice(0, 5).map((deadline) => {
                const typeInfo = deadlineTypes[deadline.type];
                return (
                  <div key={deadline.id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-900">
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        deadline.status === 'overdue' ? 'bg-red-500' :
                        deadline.status === 'due_soon' ? 'bg-orange-500' : 'bg-blue-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{deadline.title}</p>
                        <p className="text-xs text-gray-500">{getDaysUntil(deadline.date)}</p>
                        {deadline.amount && (
                          <p className="text-xs font-medium text-primary mt-1">
                            {deadline.amount.toLocaleString('ro-RO')} RON
                          </p>
                        )}
                      </div>
                      <span className={`px-1.5 py-0.5 text-xs rounded ${typeInfo.color} text-white`}>
                        {typeInfo.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Info Card */}
          <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-xl p-4 border border-primary/20">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              Setări Notificări
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Primește notificări cu 3, 7 și 14 zile înainte de termene.
            </p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded" defaultChecked />
                <Mail className="w-4 h-4" />
                Email
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded" defaultChecked />
                <MessageSquare className="w-4 h-4" />
                SMS
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded" />
                <Bell className="w-4 h-4" />
                Push
              </label>
            </div>
          </div>

          {/* Romanian Fiscal Info */}
          <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <h3 className="font-semibold mb-3">Termene Standard ANAF</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">D300 (TVA lunar)</span>
                <span className="font-medium">25 lunar</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">D112 (Contribuții)</span>
                <span className="font-medium">25 lunar</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">D100 (Impozit micro)</span>
                <span className="font-medium">25 trimestrial</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">D390 (Intracomunitar)</span>
                <span className="font-medium">15 lunar</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">SAF-T D406</span>
                <span className="font-medium">1 lună următoare</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Bilanț anual</span>
                <span className="font-medium">30 mai</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reminder Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-950 rounded-xl max-w-md w-full p-6"
          >
            <h2 className="text-lg font-semibold mb-4">Setează Reminder</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Termen fiscal</label>
                <select className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                  {upcomingDeadlines.map((d) => (
                    <option key={d.id} value={d.id}>{d.title} - {formatDate(d.date)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Când să te notificăm</label>
                <div className="space-y-2">
                  {[14, 7, 3, 1].map((days) => (
                    <label key={days} className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" defaultChecked={days <= 7} />
                      <span className="text-sm">Cu {days} {days === 1 ? 'zi' : 'zile'} înainte</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Metode de notificare</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span className="text-sm">Email</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">SMS</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowReminderModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                Anulează
              </button>
              <button
                onClick={() => setShowReminderModal(false)}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Salvează
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
