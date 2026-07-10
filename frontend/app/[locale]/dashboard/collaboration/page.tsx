'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Users, FileText, Plus, Circle, AlertCircle, FolderKanban, Activity } from 'lucide-react';

interface WorkspaceMember {
  userId: string;
  email: string;
  name: string;
  role: string;
  lastActiveAt?: string;
}
interface Workspace {
  id: string;
  name: string;
  description?: string;
  color?: string;
  isDefault?: boolean;
  members?: WorkspaceMember[];
  createdAt?: string;
}
interface SharedDocument {
  id: string;
  name?: string;
  title?: string;
  documentType?: string;
  sharedBy?: string;
  updatedAt?: string;
}
interface WorkspaceStats {
  memberCount: number;
  sharedDocuments: number;
  commentsCount: number;
  activitiesCount: number;
  recentActivity?: { id: string; description?: string; actorName?: string; createdAt?: string }[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export default function CollaborationPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [documents, setDocuments] = useState<SharedDocument[]>([]);
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [activeTab, setActiveTab] = useState<'members' | 'documents' | 'activity'>('members');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const authHeaders = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  }, []);
  const pick = <T,>(d: unknown): T[] => (Array.isArray(d) ? (d as T[]) : (d as { items?: T[]; data?: T[] })?.items ?? (d as { data?: T[] })?.data ?? []);

  const loadWorkspaces = useCallback(async () => {
    setLoading(true); setLoadError(false);
    try {
      const res = await fetch(`${API_URL}/collaboration/workspaces`, { headers: authHeaders() });
      if (!res.ok) { setLoadError(true); setLoading(false); return; }
      const list = pick<Workspace>(await res.json());
      setWorkspaces(list);
      if (list.length && !selectedId) setSelectedId(list[0].id);
    } catch { setLoadError(true); }
    finally { setLoading(false); }
  }, [authHeaders, selectedId]);

  useEffect(() => { void loadWorkspaces(); }, [loadWorkspaces]);

  useEffect(() => {
    if (!selectedId) { setDocuments([]); setStats(null); return; }
    (async () => {
      try {
        const [docRes, statRes] = await Promise.all([
          fetch(`${API_URL}/collaboration/workspaces/${selectedId}/shared`, { headers: authHeaders() }),
          fetch(`${API_URL}/collaboration/workspaces/${selectedId}/stats`, { headers: authHeaders() }),
        ]);
        setDocuments(docRes.ok ? pick<SharedDocument>(await docRes.json()) : []);
        setStats(statRes.ok ? await statRes.json() : null);
      } catch { setDocuments([]); setStats(null); }
    })();
  }, [selectedId, authHeaders]);

  const selected = workspaces.find((w) => w.id === selectedId);
  const members = selected?.members ?? [];
  const fmtDate = (d?: string) => { if (!d) return '—'; const x = new Date(d); return isNaN(x.getTime()) ? '—' : x.toLocaleDateString('ro-RO'); };

  const empty = (msg: string) => (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
      <AlertCircle className="h-8 w-8 opacity-40" /><p className="text-sm">{msg}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {loadError && (
        <div role="status" className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 text-sm text-amber-900 dark:text-amber-200">
          Nu am putut încărca spațiile de colaborare. Reîncearcă. / Could not load collaboration workspaces. Please retry.
        </div>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Colaborare</h1>
          <p className="text-muted-foreground">Spații de lucru, membri și documente partajate</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          <Plus className="h-4 w-4" />Spațiu nou
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Workspace list */}
        <div className="rounded-lg border bg-card">
          <div className="border-b p-3 text-sm font-medium flex items-center gap-2"><FolderKanban className="h-4 w-4" />Spații de lucru</div>
          {loading ? empty('Se încarcă…')
            : workspaces.length === 0 ? empty('Niciun spațiu de lucru încă.')
            : (
              <ul className="p-2 space-y-1">
                {workspaces.map((w) => (
                  <li key={w.id}>
                    <button
                      onClick={() => setSelectedId(w.id)}
                      className={`w-full text-left rounded-md px-3 py-2 text-sm ${selectedId === w.id ? 'bg-accent font-medium' : 'hover:bg-accent/50'}`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: w.color || '#64748b' }} />
                        <span className="truncate">{w.name}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">{w.members?.length ?? 0} membri</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
        </div>

        {/* Detail */}
        <div className="space-y-4">
          {!selected ? empty('Selectează un spațiu de lucru.') : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-4"><div className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" />Membri</div><div className="text-2xl font-bold tabular-nums">{stats?.memberCount ?? members.length}</div></div>
                <div className="rounded-lg border p-4"><div className="text-xs text-muted-foreground flex items-center gap-1"><FileText className="h-3 w-3" />Documente</div><div className="text-2xl font-bold tabular-nums">{stats?.sharedDocuments ?? documents.length}</div></div>
                <div className="rounded-lg border p-4"><div className="text-xs text-muted-foreground flex items-center gap-1"><Activity className="h-3 w-3" />Activități</div><div className="text-2xl font-bold tabular-nums">{stats?.activitiesCount ?? '—'}</div></div>
              </div>

              <div className="flex gap-2 border-b">
                {(['members', 'documents', 'activity'] as const).map((t) => (
                  <button key={t} onClick={() => setActiveTab(t)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
                    {t === 'members' ? 'Membri' : t === 'documents' ? 'Documente' : 'Activitate'}
                  </button>
                ))}
              </div>

              {activeTab === 'members' && (
                members.length === 0 ? empty('Niciun membru în acest spațiu.') : (
                  <div className="rounded-lg border divide-y">
                    {members.map((m) => (
                      <div key={m.userId} className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3">
                          <div className="relative"><div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium">{m.name?.charAt(0) ?? '?'}</div><Circle className="absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-current text-slate-300" /></div>
                          <div><div className="text-sm font-medium">{m.name}</div><div className="text-xs text-muted-foreground">{m.email}</div></div>
                        </div>
                        <span className="text-xs rounded-full border px-2 py-0.5">{m.role}</span>
                      </div>
                    ))}
                  </div>
                )
              )}

              {activeTab === 'documents' && (
                documents.length === 0 ? empty('Niciun document partajat în acest spațiu.') : (
                  <div className="rounded-lg border divide-y">
                    {documents.map((d) => (
                      <div key={d.id} className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3"><FileText className="h-4 w-4 text-muted-foreground" /><div><div className="text-sm font-medium">{d.name ?? d.title ?? 'Document'}</div><div className="text-xs text-muted-foreground">{d.documentType ?? ''}{d.sharedBy ? ` · ${d.sharedBy}` : ''}</div></div></div>
                        <span className="text-xs text-muted-foreground">{fmtDate(d.updatedAt)}</span>
                      </div>
                    ))}
                  </div>
                )
              )}

              {activeTab === 'activity' && (
                (stats?.recentActivity?.length ?? 0) === 0 ? empty('Nicio activitate recentă.') : (
                  <div className="rounded-lg border divide-y">
                    {stats!.recentActivity!.map((a) => (
                      <div key={a.id} className="p-3 text-sm"><span className="font-medium">{a.actorName ?? 'Cineva'}</span> <span className="text-muted-foreground">{a.description}</span><div className="text-xs text-muted-foreground">{fmtDate(a.createdAt)}</div></div>
                    ))}
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
