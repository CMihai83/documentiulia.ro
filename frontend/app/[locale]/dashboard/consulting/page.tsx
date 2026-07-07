'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Star,
  Wallet,
  Users,
  Loader2,
  Video,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

// ---- types (match backend ConsultingService) ----
type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled';

interface Booking {
  id: string;
  packageId: string;
  package: { name: string; nameRo: string; category: string; durationMinutes: number };
  organizationId: string;
  consultantName?: string;
  scheduledAt: string;
  endTime: string;
  status: BookingStatus;
  paymentStatus: string;
  amount: number;
  currency: string;
  meetingLink?: string;
  attachments?: string[];
  feedback?: { rating: number; comment?: string };
}

interface Stats {
  totalBookings: number;
  completedBookings: number;
  upcomingBookings: number;
  totalRevenue: number;
  averageRating: number;
}

// ---- minimal RO/EN dictionary ----
const T = {
  ro: {
    title: 'Portal Consultanță',
    subtitle: 'Gestionează rezervările de consultanță și livrabilele.',
    upcoming: 'Programate', all: 'Toate', totalBookings: 'Rezervări', completed: 'Finalizate',
    revenue: 'Venituri', rating: 'Rating mediu', noBookings: 'Nicio rezervare încă.',
    confirm: 'Confirmă', complete: 'Finalizează', cancel: 'Anulează', invoice: 'Factură',
    join: 'Intră în ședință', deliverables: 'Livrabile', addDeliverable: 'Adaugă livrabil',
    retry: 'Reîncearcă', loadFail: 'Nu s-au putut încărca rezervările.',
    status: { pending: 'În așteptare', confirmed: 'Confirmată', in_progress: 'În desfășurare', completed: 'Finalizată', cancelled: 'Anulată', rescheduled: 'Reprogramată' } as Record<BookingStatus, string>,
  },
  en: {
    title: 'Consulting Portal',
    subtitle: 'Manage consultancy bookings and deliverables.',
    upcoming: 'Upcoming', all: 'All', totalBookings: 'Bookings', completed: 'Completed',
    revenue: 'Revenue', rating: 'Avg. rating', noBookings: 'No bookings yet.',
    confirm: 'Confirm', complete: 'Complete', cancel: 'Cancel', invoice: 'Invoice',
    join: 'Join session', deliverables: 'Deliverables', addDeliverable: 'Add deliverable',
    retry: 'Retry', loadFail: 'Could not load bookings.',
    status: { pending: 'Pending', confirmed: 'Confirmed', in_progress: 'In progress', completed: 'Completed', cancelled: 'Cancelled', rescheduled: 'Rescheduled' } as Record<BookingStatus, string>,
  },
};

const statusStyle: Record<BookingStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  confirmed: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  rescheduled: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export default function ConsultingPortalPage() {
  const routeParams = useParams();
  const locale = (Array.isArray(routeParams?.locale) ? routeParams.locale[0] : routeParams?.locale) || 'ro';
  const t = locale === 'en' ? T.en : T.ro;
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [b, s] = await Promise.all([
      api.get<Booking[]>('/consulting/bookings'),
      api.get<Stats>('/consulting/stats'),
    ]);
    if (b.error) setError(t.loadFail);
    setBookings(Array.isArray(b.data) ? b.data : []);
    if (s.data) setStats(s.data);
    setLoading(false);
  }, [t.loadFail]);

  useEffect(() => { load(); }, [load]);

  const act = async (id: string, path: string, body?: unknown) => {
    setActioning(id);
    const res = await api.post(`/consulting/bookings/${id}/${path}`, body);
    setActioning(null);
    if (!res.error) load();
  };

  const addDeliverable = async (bk: Booking) => {
    const name = typeof window !== 'undefined' ? window.prompt(t.addDeliverable) : null;
    if (!name) return;
    await act(bk.id, 'complete', { deliverables: [...(bk.attachments ?? []), name] });
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString(locale === 'en' ? 'en-GB' : 'ro-RO', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  const fmtMoney = (n: number, c: string) =>
    new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'ro-RO', { style: 'currency', currency: c || 'RON', maximumFractionDigits: 0 }).format(n);

  const now = Date.now();
  const upcoming = bookings.filter((b) => new Date(b.scheduledAt).getTime() > now && b.status !== 'cancelled');

  const statTiles = stats && [
    { label: t.totalBookings, value: stats.totalBookings, icon: Users },
    { label: t.completed, value: stats.completedBookings, icon: CheckCircle2 },
    { label: t.upcoming, value: stats.upcomingBookings, icon: Calendar },
    { label: t.revenue, value: fmtMoney(stats.totalRevenue, 'RON'), icon: Wallet },
    { label: t.rating, value: stats.averageRating ? `${stats.averageRating.toFixed(1)} ★` : '—', icon: Star },
  ];

  const BookingCard = ({ b }: { b: Booking }) => (
    <Card className="overflow-hidden">
      <CardContent className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold truncate">{locale === 'en' ? b.package?.name : b.package?.nameRo}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
              <Clock className="h-3.5 w-3.5" /> {fmtDate(b.scheduledAt)} · {b.package?.durationMinutes} min
            </p>
            {b.consultantName && <p className="text-xs text-muted-foreground mt-0.5">{b.consultantName}</p>}
          </div>
          <Badge className={`shrink-0 border-0 ${statusStyle[b.status]}`}>{t.status[b.status]}</Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium tabular-nums">{fmtMoney(b.amount, b.currency)}</span>
          <span className="text-xs text-muted-foreground">{b.paymentStatus}</span>
        </div>

        {b.attachments && b.attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {b.attachments.map((a, i) => (
              <span key={i} className="text-xs bg-muted rounded px-2 py-0.5 flex items-center gap-1">
                <FileText className="h-3 w-3" /> {a}
              </span>
            ))}
          </div>
        )}

        {b.feedback && (
          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-current" /> {b.feedback.rating}/5 {b.feedback.comment && `— ${b.feedback.comment}`}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {b.status === 'pending' && (
            <Button size="sm" disabled={actioning === b.id} onClick={() => act(b.id, 'confirm')}>
              {actioning === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} {t.confirm}
            </Button>
          )}
          {(b.status === 'confirmed' || b.status === 'in_progress') && (
            <>
              <Button size="sm" variant="secondary" disabled={actioning === b.id} onClick={() => act(b.id, 'complete')}>
                <CheckCircle2 className="h-4 w-4" /> {t.complete}
              </Button>
              <Button size="sm" variant="outline" onClick={() => addDeliverable(b)}>
                <FileText className="h-4 w-4" /> {t.addDeliverable}
              </Button>
            </>
          )}
          {b.meetingLink && (b.status === 'confirmed' || b.status === 'in_progress') && (
            <a href={b.meetingLink} target="_blank" rel="noreferrer">
              <Button size="sm" variant="outline"><Video className="h-4 w-4" /> {t.join}</Button>
            </a>
          )}
          {['pending', 'confirmed', 'in_progress', 'rescheduled'].includes(b.status) && (
            <Button size="sm" variant="ghost" className="text-red-600" disabled={actioning === b.id} onClick={() => act(b.id, 'cancel', {})}>
              <XCircle className="h-4 w-4" /> {t.cancel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-serif font-semibold flex items-center gap-2">
          <Users className="h-6 w-6 text-teal-600" /> {t.title}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{t.subtitle}</p>
      </div>

      {statTiles && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {statTiles.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><s.icon className="h-4 w-4" /> {s.label}</div>
                <p className="text-xl font-semibold mt-1 tabular-nums">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : error ? (
        <Card><CardContent className="p-8 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={load}>{t.retry}</Button>
        </CardContent></Card>
      ) : (
        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">{t.upcoming} ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="all">{t.all} ({bookings.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="mt-4">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">{t.noBookings}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">{upcoming.map((b) => <BookingCard key={b.id} b={b} />)}</div>
            )}
          </TabsContent>
          <TabsContent value="all" className="mt-4">
            {bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">{t.noBookings}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">{bookings.map((b) => <BookingCard key={b.id} b={b} />)}</div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
