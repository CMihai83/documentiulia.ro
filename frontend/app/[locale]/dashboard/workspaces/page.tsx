'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Server, Plus, Play, Square, Trash2, Cpu, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';

interface Milestone { id: string; title: string; amountEur: number; status: string; invoiceId?: string }
interface Workspace {
  id: string; name: string; kind: string; driver: string; status: string;
  budgetCapEur: number; spentEur: number; autoStopMinutes: number;
  connectInfo?: Record<string, unknown> | null; milestones?: Milestone[];
}

export default function WorkspacesPage() {
  const params = useParams();
  const locale = (Array.isArray(params?.locale) ? params.locale[0] : params?.locale) || 'ro';
  const ro = locale !== 'en';
  const [items, setItems] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [kind, setKind] = useState('dev_container');
  const [budget, setBudget] = useState(25);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await api.get<Workspace[]>('/delivery-workspaces');
    setItems(r.data ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    if (!name.trim()) return;
    await api.post('/delivery-workspaces', { name, kind, budgetCapEur: budget });
    setName('');
    void load();
  };
  const act = async (id: string, path: string, method: 'post' | 'delete' = 'post') => {
    if (method === 'delete') await api.delete(`/workspaces/${id}`);
    else await api.post(`/workspaces/${id}/${path}`, {});
    void load();
  };

  const badge = (s: string) => {
    const map: Record<string, string> = {
      running: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
      stopped: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
      destroyed: 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
      error: 'bg-red-100 text-red-800',
    };
    return map[s] ?? 'bg-teal-100 text-teal-800';
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-serif font-semibold flex items-center gap-2">
          <Server className="h-6 w-6 text-teal-600" /> {ro ? 'Spații de livrare' : 'Delivery workspaces'}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {ro ? 'Mediu izolat per proiect unde clientul și freelancerii construiesc și livrează.'
              : 'Per-project isolated environment where client and freelancers build and deliver.'}
        </p>
      </div>

      <Card><CardContent className="p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[160px]">
          <label className="text-xs text-muted-foreground">{ro ? 'Nume' : 'Name'}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-9 px-3 rounded-md border bg-background text-sm" placeholder={ro ? 'Proiect X' : 'Project X'} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">{ro ? 'Tip' : 'Kind'}</label>
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="h-9 px-3 rounded-md border bg-background text-sm">
            <option value="dev_container">Dev container</option>
            <option value="gpu_pod">GPU pod</option>
          </select>
        </div>
        <div className="w-28">
          <label className="text-xs text-muted-foreground">{ro ? 'Buget €' : 'Budget €'}</label>
          <input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="w-full h-9 px-3 rounded-md border bg-background text-sm" />
        </div>
        <Button size="sm" onClick={create}><Plus className="h-4 w-4 mr-1" />{ro ? 'Creează' : 'Create'}</Button>
      </CardContent></Card>

      {kind === 'gpu_pod' && (
        <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <Cpu className="h-4 w-4 shrink-0 mt-0.5" />
          {ro ? 'Pod-urile GPU nu sunt încă configurate pe acest mediu (necesită cheie RunPod + verificare de securitate).'
              : 'GPU pods are not configured on this deployment yet (needs a RunPod key + security review).'}
        </div>
      )}

      {loading ? (
        <div className="text-center text-muted-foreground py-8 text-sm">{ro ? 'Se încarcă…' : 'Loading…'}</div>
      ) : items.length === 0 ? (
        <div className="text-center text-muted-foreground py-8 text-sm">{ro ? 'Niciun spațiu încă.' : 'No workspaces yet.'}</div>
      ) : (
        <div className="space-y-3">
          {items.map((w) => {
            const pct = Math.min(100, Math.round((Number(w.spentEur) / Number(w.budgetCapEur)) * 100));
            return (
              <Card key={w.id}><CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{w.name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted">{w.kind}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge(w.status)}`}>{w.status}</span>
                  <div className="ml-auto flex gap-1">
                    {w.status !== 'running' && w.status !== 'destroyed' && (
                      <Button size="sm" variant="outline" onClick={() => act(w.id, 'provision')}><Play className="h-3.5 w-3.5" /></Button>
                    )}
                    {w.status === 'running' && (
                      <Button size="sm" variant="outline" onClick={() => act(w.id, 'stop')}><Square className="h-3.5 w-3.5" /></Button>
                    )}
                    {w.status !== 'destroyed' && (
                      <Button size="sm" variant="ghost" onClick={() => act(w.id, '', 'delete')}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{ro ? 'Cost' : 'Spend'}: €{Number(w.spentEur).toFixed(2)} / €{Number(w.budgetCapEur).toFixed(2)}</span>
                    <span>{ro ? `auto-stop ${w.autoStopMinutes}m` : `auto-stop ${w.autoStopMinutes}m`}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full ${pct >= 100 ? 'bg-red-500' : 'bg-teal-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                {w.milestones && w.milestones.length > 0 && (
                  <div className="text-xs space-y-1 border-t pt-2">
                    {w.milestones.map((m) => (
                      <div key={m.id} className="flex justify-between">
                        <span>{m.title} — €{Number(m.amountEur).toFixed(0)}</span>
                        <span className="text-muted-foreground">{m.status}{m.invoiceId ? ' · ' + (ro ? 'factură creată' : 'invoice drafted') : ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent></Card>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5" />
        {ro ? 'Plata prin escrow și facturarea compute se activează în curând (Stripe). Datele sunt șterse la distrugerea spațiului.'
            : 'Escrow payout and compute billing arrive soon (Stripe). Data is wiped when a workspace is destroyed.'}
      </p>
    </div>
  );
}
