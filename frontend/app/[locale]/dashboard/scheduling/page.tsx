'use client';

import { useState } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  Users,
  Video,
  MapPin,
  Bell,
  Filter,
  MoreHorizontal,
  CheckCircle,
  AlertCircle,
  Phone,
  Mail,
  Repeat,
  CalendarDays,
  CalendarCheck,
  Timer,
  UserCheck,
} from 'lucide-react';

interface Event {
  id: string;
  title: string;
  type: 'meeting' | 'deadline' | 'reminder' | 'task' | 'call';
  date: string;
  time: string;
  duration: string;
  location?: string;
  attendees?: { name: string }[];
  status: 'scheduled' | 'completed' | 'cancelled' | 'in-progress';
  recurring?: boolean;
  priority?: 'high' | 'medium' | 'low';
}

interface Appointment {
  id: string;
  clientName: string;
  clientCompany: string;
  date: string;
  time: string;
  duration: string;
  type: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  notes?: string;
}

const events: Event[] = [
  {
    id: 'e1',
    title: 'Intalnire clienti noi',
    type: 'meeting',
    date: '2024-12-14',
    time: '10:00',
    duration: '1h',
    location: 'Sala Conferinte A',
    attendees: [
      { name: 'Maria Ionescu' },
      { name: 'Andrei Pop' },
      { name: 'Client XYZ' },
    ],
    status: 'scheduled',
    priority: 'high',
  },
  {
    id: 'e2',
    title: 'Deadline TVA Q4',
    type: 'deadline',
    date: '2024-12-14',
    time: '23:59',
    duration: '-',
    status: 'scheduled',
    priority: 'high',
  },
  {
    id: 'e3',
    title: 'Call consultant fiscal',
    type: 'call',
    date: '2024-12-14',
    time: '14:00',
    duration: '30min',
    attendees: [{ name: 'Ion Popescu' }],
    status: 'scheduled',
  },
  {
    id: 'e4',
    title: 'Review raport lunar',
    type: 'task',
    date: '2024-12-14',
    time: '16:00',
    duration: '2h',
    status: 'in-progress',
  },
  {
    id: 'e5',
    title: 'Team standup',
    type: 'meeting',
    date: '2024-12-15',
    time: '09:00',
    duration: '15min',
    location: 'Online - Google Meet',
    attendees: [{ name: 'Echipa Contabilitate' }],
    status: 'scheduled',
    recurring: true,
  },
  {
    id: 'e6',
    title: 'Training SAF-T',
    type: 'meeting',
    date: '2024-12-15',
    time: '11:00',
    duration: '2h',
    location: 'Sala Training',
    attendees: [{ name: 'Echipa' }],
    status: 'scheduled',
  },
];

const appointments: Appointment[] = [
  {
    id: 'a1',
    clientName: 'Maria Popescu',
    clientCompany: 'Tech Solutions SRL',
    date: '2024-12-14',
    time: '10:00',
    duration: '1h',
    type: 'Consultanta fiscala',
    status: 'confirmed',
    notes: 'Discutie despre optimizare TVA',
  },
  {
    id: 'a2',
    clientName: 'Ion Georgescu',
    clientCompany: 'Construct Plus SA',
    date: '2024-12-14',
    time: '14:00',
    duration: '45min',
    type: 'Review bilant',
    status: 'confirmed',
  },
  {
    id: 'a3',
    clientName: 'Ana Dumitrescu',
    clientCompany: 'Green Energy SRL',
    date: '2024-12-15',
    time: '09:30',
    duration: '1h',
    type: 'Onboarding',
    status: 'pending',
    notes: 'Client nou - prezentare platforma',
  },
];

const weekDays = ['Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sam', 'Dum'];
const currentMonth = 'Decembrie 2024';

const calendarDays = Array.from({ length: 31 }, (_, i) => ({
  day: i + 1,
  isCurrentMonth: true,
  isToday: i + 1 === 14,
  hasEvents: [14, 15, 16, 25].includes(i + 1),
}));

const upcomingDeadlines = [
  { title: 'Depunere TVA', date: '14 Dec', urgent: true },
  { title: 'D406 SAF-T', date: '25 Dec', urgent: false },
  { title: 'Raport Trimestrial', date: '31 Dec', urgent: false },
  { title: 'Revisal Update', date: '5 Ian', urgent: false },
];

export default function SchedulingPage() {
  const [selectedDate, setSelectedDate] = useState('2024-12-14');
  const [view, setView] = useState<'day' | 'week' | 'month'>('day');
  const [activeTab, setActiveTab] = useState<'events' | 'appointments'>('events');

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'meeting': return <Users className="h-4 w-4" />;
      case 'deadline': return <AlertCircle className="h-4 w-4" />;
      case 'reminder': return <Bell className="h-4 w-4" />;
      case 'task': return <CheckCircle className="h-4 w-4" />;
      case 'call': return <Phone className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'meeting': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'deadline': return 'bg-red-100 text-red-800 border-red-200';
      case 'reminder': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'task': return 'bg-green-100 text-green-800 border-green-200';
      case 'call': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed': return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Confirmat</span>;
      case 'pending': return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">In asteptare</span>;
      case 'cancelled': return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Anulat</span>;
      default: return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const todayEvents = events.filter(e => e.date === '2024-12-14');
  const todayAppointments = appointments.filter(a => a.date === '2024-12-14');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar & Programari</h1>
          <p className="text-gray-500 mt-1">Gestioneaza intalniri, deadline-uri si programari clienti</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
            <Filter className="mr-2 h-4 w-4" />
            Filtreaza
          </button>
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            Eveniment Nou
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Evenimente Azi</p>
              <p className="text-2xl font-bold text-gray-900">{todayEvents.length}</p>
            </div>
            <CalendarDays className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Programari</p>
              <p className="text-2xl font-bold text-gray-900">{todayAppointments.length}</p>
            </div>
            <UserCheck className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Deadline-uri Luna</p>
              <p className="text-2xl font-bold text-gray-900">3</p>
            </div>
            <Timer className="h-8 w-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Task-uri Active</p>
              <p className="text-2xl font-bold text-gray-900">5</p>
            </div>
            <CalendarCheck className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{currentMonth}</h3>
            <div className="flex gap-1">
              <button className="p-2 hover:bg-gray-100 rounded">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Week days header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {[...Array(6)].map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {calendarDays.map((item) => (
              <button
                key={item.day}
                onClick={() => setSelectedDate(`2024-12-${item.day.toString().padStart(2, '0')}`)}
                className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors relative ${
                  item.isToday
                    ? 'bg-blue-600 text-white'
                    : selectedDate === `2024-12-${item.day.toString().padStart(2, '0')}`
                    ? 'bg-blue-100 text-blue-600'
                    : 'hover:bg-gray-100'
                }`}
              >
                {item.day}
                {item.hasEvents && !item.isToday && (
                  <div className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-600" />
                )}
              </button>
            ))}
          </div>

          {/* Upcoming Deadlines */}
          <div className="mt-6 pt-4 border-t">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Deadline-uri Apropiate
            </h4>
            <div className="space-y-2">
              {upcomingDeadlines.map((deadline, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-2 rounded-lg ${
                    deadline.urgent ? 'bg-red-50' : 'bg-gray-50'
                  }`}
                >
                  <span className="text-sm">{deadline.title}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    deadline.urgent ? 'bg-red-600 text-white' : 'border text-gray-600'
                  }`}>
                    {deadline.date}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Day View / Events */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  {new Date(selectedDate).toLocaleDateString('ro-RO', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </h3>
                <p className="text-sm text-gray-500">
                  {todayEvents.length} evenimente programate
                </p>
              </div>
              <div className="flex gap-1 border rounded-lg overflow-hidden">
                {['day', 'week', 'month'].map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v as any)}
                    className={`px-3 py-1.5 text-sm ${
                      view === v ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {v === 'day' ? 'Zi' : v === 'week' ? 'Sapt' : 'Luna'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('events')}
                className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'events'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Evenimente
              </button>
              <button
                onClick={() => setActiveTab('appointments')}
                className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'appointments'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <UserCheck className="mr-2 h-4 w-4" />
                Programari Clienti
              </button>
            </nav>
          </div>

          <div className="p-4 max-h-[500px] overflow-y-auto">
            {/* Events Tab */}
            {activeTab === 'events' && (
              <div className="space-y-3">
                {events.filter(e => e.date === selectedDate).length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nu exista evenimente pentru aceasta zi</p>
                    <button className="mt-4 flex items-center mx-auto px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                      <Plus className="mr-2 h-4 w-4" />
                      Adauga eveniment
                    </button>
                  </div>
                ) : (
                  events
                    .filter(e => e.date === selectedDate)
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map(event => (
                      <div
                        key={event.id}
                        className={`p-4 rounded-lg border-l-4 ${getEventTypeColor(event.type)}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="mt-1">{getEventTypeIcon(event.type)}</div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{event.title}</h4>
                                {event.recurring && <Repeat className="h-3 w-3 text-gray-400" />}
                                {event.priority === 'high' && (
                                  <span className="px-2 py-0.5 rounded text-xs bg-red-600 text-white">Urgent</span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {event.time} ({event.duration})
                                </span>
                                {event.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {event.location}
                                  </span>
                                )}
                              </div>
                              {event.attendees && event.attendees.length > 0 && (
                                <div className="flex items-center gap-2 mt-2">
                                  <div className="flex -space-x-2">
                                    {event.attendees.slice(0, 3).map((att, i) => (
                                      <div key={i} className="h-6 w-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium">
                                        {att.name.split(' ').map(n => n[0]).join('')}
                                      </div>
                                    ))}
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    {event.attendees.length} participanti
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <button className="p-2 hover:bg-gray-100 rounded">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            )}

            {/* Appointments Tab */}
            {activeTab === 'appointments' && (
              <div className="space-y-3">
                {appointments.map(apt => (
                  <div key={apt.id} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-600">
                          {apt.clientName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <h4 className="font-medium">{apt.clientName}</h4>
                          <p className="text-sm text-gray-500">{apt.clientCompany}</p>
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(apt.date).toLocaleDateString('ro-RO')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {apt.time} ({apt.duration})
                            </span>
                            <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{apt.type}</span>
                          </div>
                          {apt.notes && (
                            <p className="text-sm text-gray-500 mt-2 italic">{apt.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(apt.status)}
                        <div className="flex gap-1">
                          <button className="p-2 hover:bg-gray-100 rounded">
                            <Phone className="h-4 w-4 text-gray-400" />
                          </button>
                          <button className="p-2 hover:bg-gray-100 rounded">
                            <Mail className="h-4 w-4 text-gray-400" />
                          </button>
                          <button className="p-2 hover:bg-gray-100 rounded">
                            <Video className="h-4 w-4 text-gray-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <button className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50 mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Programare Noua
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
