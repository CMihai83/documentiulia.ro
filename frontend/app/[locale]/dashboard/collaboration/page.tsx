'use client';

import React, { useState } from 'react';
import {
  Users,
  MessageSquare,
  FileText,
  Share2,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  CheckCircle,
  Paperclip,
  Send,
  ThumbsUp,
  Reply,
  Eye,
  UserPlus,
  Settings,
  MessageCircle,
  Video,
  Phone,
  Mail,
  Calendar,
  Hash,
  Lock,
} from 'lucide-react';

// Types
interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  status: 'online' | 'away' | 'offline';
  avatar?: string;
  department: string;
}

interface Channel {
  id: string;
  name: string;
  type: 'public' | 'private' | 'direct';
  members: number;
  unread: number;
  lastMessage?: string;
  lastActivity: string;
}

interface Message {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  reactions?: { emoji: string; count: number }[];
  replies?: number;
  attachments?: { name: string; type: string }[];
}

interface SharedDocument {
  id: string;
  name: string;
  type: string;
  sharedBy: string;
  sharedWith: string[];
  lastModified: string;
  status: 'active' | 'pending' | 'archived';
}

interface Task {
  id: string;
  title: string;
  assignee: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  project: string;
}

// Sample data
const teamMembers: TeamMember[] = [
  { id: 't1', name: 'Maria Ionescu', role: 'Contabil șef', email: 'maria@exemplu.ro', status: 'online', department: 'Contabilitate' },
  { id: 't2', name: 'Andrei Popescu', role: 'Consultant fiscal', email: 'andrei@exemplu.ro', status: 'online', department: 'Fiscal' },
  { id: 't3', name: 'Elena Dumitrescu', role: 'HR Manager', email: 'elena@exemplu.ro', status: 'away', department: 'HR' },
  { id: 't4', name: 'Ion Radu', role: 'Contabil', email: 'ion@exemplu.ro', status: 'online', department: 'Contabilitate' },
  { id: 't5', name: 'Ana Marin', role: 'Asistent', email: 'ana@exemplu.ro', status: 'offline', department: 'Administrativ' },
  { id: 't6', name: 'Mihai Stan', role: 'Developer', email: 'mihai@exemplu.ro', status: 'online', department: 'IT' },
];

const channels: Channel[] = [
  { id: 'ch1', name: 'general', type: 'public', members: 15, unread: 3, lastMessage: 'Bună dimineața tuturor!', lastActivity: '5 min' },
  { id: 'ch2', name: 'contabilitate', type: 'public', members: 8, unread: 0, lastMessage: 'Am finalizat balanța...', lastActivity: '1 oră' },
  { id: 'ch3', name: 'fiscal-urgent', type: 'private', members: 4, unread: 5, lastMessage: 'Deadline TVA mâine!', lastActivity: '10 min' },
  { id: 'ch4', name: 'hr-team', type: 'private', members: 3, unread: 0, lastMessage: 'Contracte actualizate', lastActivity: '2 ore' },
  { id: 'ch5', name: 'proiect-saft', type: 'private', members: 6, unread: 2, lastMessage: 'Status implementare?', lastActivity: '30 min' },
];

const messages: Message[] = [
  {
    id: 'm1',
    author: 'Maria Ionescu',
    content: 'Bună dimineața! Am finalizat reconcilierea bancară pentru luna noiembrie. Documentele sunt în folderul partajat.',
    timestamp: '09:15',
    reactions: [{ emoji: '👍', count: 3 }, { emoji: '✅', count: 2 }],
    replies: 2,
    attachments: [{ name: 'reconciliere_nov.xlsx', type: 'spreadsheet' }],
  },
  {
    id: 'm2',
    author: 'Andrei Popescu',
    content: '@Maria Ionescu Perfect, mulțumesc! Pot să verific acum pentru raportul fiscal.',
    timestamp: '09:22',
  },
  {
    id: 'm3',
    author: 'Ion Radu',
    content: 'Am câteva întrebări despre înregistrările din decembrie. Putem programa un call rapid?',
    timestamp: '09:45',
    replies: 1,
  },
  {
    id: 'm4',
    author: 'Elena Dumitrescu',
    content: 'Reminder: Deadline pentru actualizarea contractelor este vineri. Vă rog să verificați fișele angajaților.',
    timestamp: '10:00',
    reactions: [{ emoji: '👀', count: 4 }],
  },
];

const sharedDocuments: SharedDocument[] = [
  { id: 'd1', name: 'Balanță Noiembrie 2024.xlsx', type: 'spreadsheet', sharedBy: 'Maria Ionescu', sharedWith: ['Echipa Contabilitate'], lastModified: '2 ore', status: 'active' },
  { id: 'd2', name: 'Raport TVA Q4.pdf', type: 'pdf', sharedBy: 'Andrei Popescu', sharedWith: ['Management', 'Fiscal'], lastModified: '1 zi', status: 'active' },
  { id: 'd3', name: 'Contract Model 2025.docx', type: 'document', sharedBy: 'Elena Dumitrescu', sharedWith: ['HR Team'], lastModified: '3 zile', status: 'pending' },
  { id: 'd4', name: 'Proceduri SAF-T.pdf', type: 'pdf', sharedBy: 'Mihai Stan', sharedWith: ['Toată echipa'], lastModified: '1 săpt', status: 'active' },
];

const tasks: Task[] = [
  { id: 'task1', title: 'Finalizare declarație TVA', assignee: 'Maria Ionescu', status: 'in-progress', priority: 'high', dueDate: '14 Dec', project: 'Fiscal Q4' },
  { id: 'task2', title: 'Review contracte noi', assignee: 'Elena Dumitrescu', status: 'todo', priority: 'medium', dueDate: '16 Dec', project: 'HR' },
  { id: 'task3', title: 'Testare integrare SAF-T', assignee: 'Mihai Stan', status: 'review', priority: 'high', dueDate: '15 Dec', project: 'IT' },
  { id: 'task4', title: 'Reconciliere bancară Dec', assignee: 'Ion Radu', status: 'todo', priority: 'medium', dueDate: '20 Dec', project: 'Contabilitate' },
  { id: 'task5', title: 'Raport anual pregătire', assignee: 'Andrei Popescu', status: 'in-progress', priority: 'low', dueDate: '28 Dec', project: 'Fiscal' },
];

export default function CollaborationPage() {
  const [selectedChannel, setSelectedChannel] = useState('general');
  const [messageInput, setMessageInput] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'team' | 'documents' | 'tasks'>('chat');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getTaskStatusBadge = (status: string) => {
    switch (status) {
      case 'done':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Finalizat</span>;
      case 'in-progress':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">În lucru</span>;
      case 'review':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Review</span>;
      case 'todo':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">De făcut</span>;
      default:
        return <span className="px-2 py-0.5 rounded border text-xs font-medium">{status}</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-600 text-white">Urgent</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Mediu</span>;
      case 'low':
        return <span className="px-2 py-0.5 rounded border text-xs font-medium text-gray-600">Scăzut</span>;
      default:
        return null;
    }
  };

  const onlineMembers = teamMembers.filter(m => m.status === 'online').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Colaborare Echipă</h1>
          <p className="text-gray-500">
            Comunică, partajează documente și coordonează-te cu echipa
          </p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
            <Video className="mr-2 h-4 w-4" />
            Întâlnire Video
          </button>
          <button className="inline-flex items-center justify-center px-4 py-2 rounded-md font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors">
            <UserPlus className="mr-2 h-4 w-4" />
            Invită Membru
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Membri Echipă</p>
              <p className="text-2xl font-bold text-gray-900">{teamMembers.length}</p>
              <p className="text-xs text-green-600">{onlineMembers} online</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Mesaje Necitite</p>
              <p className="text-2xl font-bold text-gray-900">{channels.reduce((a, c) => a + c.unread, 0)}</p>
            </div>
            <MessageSquare className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Documente Partajate</p>
              <p className="text-2xl font-bold text-gray-900">{sharedDocuments.length}</p>
            </div>
            <FileText className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Task-uri Active</p>
              <p className="text-2xl font-bold text-gray-900">{tasks.filter(t => t.status !== 'done').length}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'chat'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Chat
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'team'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="mr-2 h-4 w-4" />
              Echipă
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'documents'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="mr-2 h-4 w-4" />
              Documente
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'tasks'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Task-uri
            </button>
          </nav>
        </div>

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="p-6">
            <div className="grid gap-4 lg:grid-cols-4">
              {/* Channels List */}
              <div className="bg-gray-50 rounded-lg lg:col-span-1">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Canale</h3>
                    <button className="p-2 rounded-md hover:bg-gray-200 transition-colors">
                      <Plus className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                </div>
                <div className="overflow-y-auto max-h-[500px]">
                  <div className="space-y-1 p-2">
                    {channels.map(channel => (
                      <button
                        key={channel.id}
                        onClick={() => setSelectedChannel(channel.name)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                          selectedChannel === channel.name
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {channel.type === 'private' ? (
                            <Lock className="h-4 w-4" />
                          ) : channel.type === 'direct' ? (
                            <MessageCircle className="h-4 w-4" />
                          ) : (
                            <Hash className="h-4 w-4" />
                          )}
                          <span className="font-medium">{channel.name}</span>
                        </div>
                        {channel.unread > 0 && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            selectedChannel === channel.name
                              ? 'bg-white text-blue-600'
                              : 'bg-blue-600 text-white'
                          }`}>
                            {channel.unread}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="bg-white border border-gray-200 rounded-lg lg:col-span-3">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Hash className="h-5 w-5 text-gray-500" />
                      <h3 className="font-semibold text-gray-900">{selectedChannel}</h3>
                      <span className="px-2 py-0.5 rounded border text-xs font-medium text-gray-600">
                        {channels.find(c => c.name === selectedChannel)?.members} membri
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button className="p-2 rounded-md hover:bg-gray-100 transition-colors">
                        <Phone className="h-4 w-4 text-gray-500" />
                      </button>
                      <button className="p-2 rounded-md hover:bg-gray-100 transition-colors">
                        <Video className="h-4 w-4 text-gray-500" />
                      </button>
                      <button className="p-2 rounded-md hover:bg-gray-100 transition-colors">
                        <Settings className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="overflow-y-auto h-[400px] p-4">
                  <div className="space-y-4">
                    {messages.map(msg => (
                      <div key={msg.id} className="flex gap-3 group">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                          {msg.author.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{msg.author}</span>
                            <span className="text-xs text-gray-500">{msg.timestamp}</span>
                          </div>
                          <p className="text-sm mt-1 text-gray-700">{msg.content}</p>
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="flex gap-2 mt-2">
                              {msg.attachments.map((att, i) => (
                                <div key={i} className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg text-sm text-gray-700">
                                  <Paperclip className="h-4 w-4" />
                                  <span>{att.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            {msg.reactions && msg.reactions.map((r, i) => (
                              <button key={i} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs hover:bg-gray-200">
                                <span>{r.emoji}</span>
                                <span>{r.count}</span>
                              </button>
                            ))}
                            <button className="text-xs text-gray-500 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              <ThumbsUp className="h-3 w-3" /> Reacție
                            </button>
                            {msg.replies && (
                              <button className="text-xs text-blue-600 flex items-center gap-1">
                                <Reply className="h-3 w-3" /> {msg.replies} răspunsuri
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-4 border-t border-gray-200">
                  <div className="flex gap-2">
                    <button className="p-2 rounded-md hover:bg-gray-100 transition-colors">
                      <Paperclip className="h-4 w-4 text-gray-500" />
                    </button>
                    <input
                      type="text"
                      placeholder={`Scrie în #${selectedChannel}...`}
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button className="px-4 py-2 rounded-md font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Team Tab */}
        {activeTab === 'team' && (
          <div className="p-6 space-y-4">
            <div className="flex gap-4 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Caută membri..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                <Filter className="mr-2 h-4 w-4" />
                Filtrează
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {teamMembers.map(member => (
                <div key={member.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <div className="h-14 w-14 rounded-full bg-gray-200 flex items-center justify-center text-lg font-medium text-gray-600">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(member.status)}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{member.name}</h3>
                      <p className="text-sm text-gray-500">{member.role}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded border text-xs font-medium text-gray-600">{member.department}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Mesaj
                    </button>
                    <button className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                      <Video className="h-4 w-4 mr-1" />
                      Call
                    </button>
                    <button className="p-2 rounded-md hover:bg-gray-100 transition-colors">
                      <Mail className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="p-6 space-y-4">
            <div className="flex gap-4 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Caută documente..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button className="inline-flex items-center px-4 py-2 rounded-md font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                <Plus className="mr-2 h-4 w-4" />
                Încarcă Document
              </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="divide-y divide-gray-200">
                {sharedDocuments.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{doc.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>Partajat de {doc.sharedBy}</span>
                          <span>•</span>
                          <span>Modificat {doc.lastModified}</span>
                        </div>
                        <div className="flex gap-1 mt-1">
                          {doc.sharedWith.map((group, i) => (
                            <span key={i} className="px-2 py-0.5 rounded border text-xs font-medium text-gray-600">{group}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 rounded-md hover:bg-gray-100 transition-colors">
                        <Eye className="h-4 w-4 text-gray-500" />
                      </button>
                      <button className="p-2 rounded-md hover:bg-gray-100 transition-colors">
                        <Share2 className="h-4 w-4 text-gray-500" />
                      </button>
                      <button className="p-2 rounded-md hover:bg-gray-100 transition-colors">
                        <MoreHorizontal className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="p-6 space-y-4">
            <div className="flex gap-4 mb-4">
              <button className="inline-flex items-center px-4 py-2 rounded-md font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                <Plus className="mr-2 h-4 w-4" />
                Task Nou
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                <Filter className="mr-2 h-4 w-4" />
                Filtrează
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              {['todo', 'in-progress', 'review', 'done'].map(status => (
                <div key={status} className="bg-gray-50 rounded-lg">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {status === 'todo' ? 'De Făcut' :
                         status === 'in-progress' ? 'În Lucru' :
                         status === 'review' ? 'Review' : 'Finalizat'}
                      </h3>
                      <span className="px-2 py-0.5 rounded border text-xs font-medium text-gray-600">
                        {tasks.filter(t => t.status === status).length}
                      </span>
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-[400px] p-3">
                    <div className="space-y-3">
                      {tasks.filter(t => t.status === status).map(task => (
                        <div key={task.id} className="p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-sm text-gray-900">{task.title}</h4>
                            {getPriorityBadge(task.priority)}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                            <span className="px-2 py-0.5 rounded border text-xs font-medium text-gray-600">{task.project}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                                {task.assignee.split(' ').map(n => n[0]).join('')}
                              </div>
                              <span className="text-xs text-gray-500">{task.assignee}</span>
                            </div>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {task.dueDate}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
