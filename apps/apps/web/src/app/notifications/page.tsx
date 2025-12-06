"use client";

import { useState } from "react";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  Settings,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Info,
  Calendar,
  CreditCard,
  Users,
  Shield,
  ChevronDown,
} from "lucide-react";
import { AppLayout, MobileNav } from "@/components/layout";

type NotificationType = "invoice" | "efactura" | "payment" | "deadline" | "system" | "security";
type NotificationPriority = "high" | "medium" | "low";

interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "efactura",
    priority: "high",
    title: "E-Factura acceptată",
    message: "Factura DF-2024-001234 către SC Client Principal SRL a fost acceptată de ANAF.",
    timestamp: "2024-12-02T10:30:00",
    read: false,
    actionUrl: "/efactura",
    actionLabel: "Vezi detalii",
  },
  {
    id: "2",
    type: "deadline",
    priority: "high",
    title: "Termen fiscal apropiat",
    message: "Declarația D300 pentru luna noiembrie trebuie depusă până pe 25 decembrie 2024.",
    timestamp: "2024-12-02T09:00:00",
    read: false,
    actionUrl: "/reports",
    actionLabel: "Generează raport",
  },
  {
    id: "3",
    type: "payment",
    priority: "medium",
    title: "Plată primită",
    message: "SC Furnizor Mare SA a achitat factura FAC-2024-5678 în valoare de 10,000 lei.",
    timestamp: "2024-12-01T16:45:00",
    read: false,
    actionUrl: "/invoices",
    actionLabel: "Vezi factură",
  },
  {
    id: "4",
    type: "efactura",
    priority: "high",
    title: "E-Factura respinsă",
    message: "Factura DF-2024-001230 a fost respinsă. Motiv: CUI destinatar invalid.",
    timestamp: "2024-12-01T14:20:00",
    read: true,
    actionUrl: "/efactura",
    actionLabel: "Corectează și retrimite",
  },
  {
    id: "5",
    type: "invoice",
    priority: "medium",
    title: "Factură nouă primită",
    message: "Ai primit o factură nouă de la SC Distribuitor SRL în valoare de 30,000 lei.",
    timestamp: "2024-12-01T11:30:00",
    read: true,
    actionUrl: "/invoices",
    actionLabel: "Vezi factură",
  },
  {
    id: "6",
    type: "system",
    priority: "low",
    title: "Actualizare sistem",
    message: "Am adăugat funcționalități noi pentru rapoarte financiare. Descoperă noile grafice!",
    timestamp: "2024-11-30T18:00:00",
    read: true,
    actionUrl: "/reports",
    actionLabel: "Explorează",
  },
  {
    id: "7",
    type: "security",
    priority: "medium",
    title: "Autentificare nouă",
    message: "O nouă autentificare a fost detectată din București, România pe Chrome/Windows.",
    timestamp: "2024-11-30T09:15:00",
    read: true,
    actionUrl: "/settings",
    actionLabel: "Verifică sesiunile",
  },
  {
    id: "8",
    type: "deadline",
    priority: "medium",
    title: "Factură restantă",
    message: "Factura DF-2024-001232 către PFA Ion Popescu a depășit termenul de plată cu 2 zile.",
    timestamp: "2024-11-29T08:00:00",
    read: true,
    actionUrl: "/invoices",
    actionLabel: "Trimite reminder",
  },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(mockNotifications);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [typeFilter, setTypeFilter] = useState<NotificationType | "all">("all");

  const filteredNotifications = notifications.filter((n) => {
    const matchesReadFilter = filter === "all" || !n.read;
    const matchesTypeFilter = typeFilter === "all" || n.type === typeFilter;
    return matchesReadFilter && matchesTypeFilter;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `Acum ${minutes} minute`;
    if (hours < 24) return `Acum ${hours} ore`;
    if (days < 7) return `Acum ${days} zile`;
    return date.toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case "invoice":
        return <FileText className="w-5 h-5 text-blue-500" />;
      case "efactura":
        return <FileText className="w-5 h-5 text-purple-500" />;
      case "payment":
        return <CreditCard className="w-5 h-5 text-emerald-500" />;
      case "deadline":
        return <Calendar className="w-5 h-5 text-amber-500" />;
      case "system":
        return <Info className="w-5 h-5 text-slate-500" />;
      case "security":
        return <Shield className="w-5 h-5 text-red-500" />;
    }
  };

  const getPriorityIndicator = (priority: NotificationPriority) => {
    switch (priority) {
      case "high":
        return "border-l-red-500";
      case "medium":
        return "border-l-amber-500";
      case "low":
        return "border-l-slate-300";
    }
  };

  const typeLabels: Record<NotificationType, string> = {
    invoice: "Facturi",
    efactura: "E-Factura",
    payment: "Plăți",
    deadline: "Termene",
    system: "Sistem",
    security: "Securitate",
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Bell className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Notificări</h1>
            <p className="text-slate-500">
              {unreadCount > 0 ? `${unreadCount} necitite` : "Toate notificările citite"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
            >
              <CheckCheck className="w-4 h-4" />
              Marchează toate ca citite
            </button>
          )}
          <button
            onClick={clearAll}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <Trash2 className="w-4 h-4" />
            Șterge toate
          </button>
          <a
            href="/settings"
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
            title="Setări notificări"
          >
            <Settings className="w-5 h-5" />
          </a>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Read/Unread Filter */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 text-sm rounded-md transition ${
                filter === "all" ? "bg-white text-slate-900 shadow" : "text-slate-600"
              }`}
            >
              Toate
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-3 py-1.5 text-sm rounded-md transition flex items-center gap-1 ${
                filter === "unread" ? "bg-white text-slate-900 shadow" : "text-slate-600"
              }`}
            >
              Necitite
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as NotificationType | "all")}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Toate tipurile</option>
              <option value="invoice">Facturi</option>
              <option value="efactura">E-Factura</option>
              <option value="payment">Plăți</option>
              <option value="deadline">Termene</option>
              <option value="system">Sistem</option>
              <option value="security">Securitate</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <BellOff className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Nu ai notificări</p>
            {filter === "unread" && (
              <button
                onClick={() => setFilter("all")}
                className="mt-4 text-blue-600 hover:text-blue-700"
              >
                Vezi toate notificările
              </button>
            )}
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex items-start gap-4 p-5 hover:bg-slate-50 transition border-l-4 ${getPriorityIndicator(notification.priority)} ${
                !notification.read ? "bg-blue-50/50" : ""
              }`}
            >
              {/* Icon */}
              <div className="flex-shrink-0 mt-1">
                {getTypeIcon(notification.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className={`font-medium ${!notification.read ? "text-slate-900" : "text-slate-700"}`}>
                      {notification.title}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">{notification.message}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-xs text-slate-400">
                        {formatTime(notification.timestamp)}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                        {typeLabels[notification.type]}
                      </span>
                      {notification.actionUrl && (
                        <a
                          href={notification.actionUrl}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          {notification.actionLabel} →
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Marchează ca citit"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Șterge"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Unread Indicator */}
              {!notification.read && (
                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
              )}
            </div>
          ))
        )}
      </div>

      {/* Notification Preferences Hint */}
      <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-slate-400" />
          <span className="text-sm text-slate-600">
            Personalizează ce notificări primești și cum le primești
          </span>
        </div>
        <a
          href="/settings"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Setări notificări →
        </a>
      </div>
      </div>
      <MobileNav />
    </AppLayout>
  );
}
