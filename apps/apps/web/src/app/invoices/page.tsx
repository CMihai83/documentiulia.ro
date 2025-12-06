"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Send,
  Eye,
  Edit,
  Trash2,
  Copy,
  MoreVertical,
  Calendar,
  Building2,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  CreditCard,
  Printer,
  Mail,
  ChevronDown,
} from "lucide-react";
import { AppLayout, MobileNav } from "@/components/layout";

type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";
type InvoiceDirection = "issued" | "received";

interface Invoice {
  id: string;
  number: string;
  direction: InvoiceDirection;
  client: {
    name: string;
    cui: string;
  };
  issueDate: string;
  dueDate: string;
  subtotal: number;
  vatAmount: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  paidAmount: number;
  efacturaStatus?: "pending" | "accepted" | "rejected";
}

const mockInvoices: Invoice[] = [
  {
    id: "1",
    number: "DF-2024-001234",
    direction: "issued",
    client: { name: "SC Client Principal SRL", cui: "RO12345678" },
    issueDate: "2024-12-01",
    dueDate: "2024-12-31",
    subtotal: 12605.04,
    vatAmount: 2394.96,
    total: 15000,
    currency: "RON",
    status: "sent",
    paidAmount: 0,
    efacturaStatus: "accepted",
  },
  {
    id: "2",
    number: "DF-2024-001233",
    direction: "issued",
    client: { name: "SC Furnizor Mare SA", cui: "RO87654321" },
    issueDate: "2024-11-28",
    dueDate: "2024-12-28",
    subtotal: 8403.36,
    vatAmount: 1596.64,
    total: 10000,
    currency: "RON",
    status: "paid",
    paidAmount: 10000,
    efacturaStatus: "accepted",
  },
  {
    id: "3",
    number: "DF-2024-001232",
    direction: "issued",
    client: { name: "PFA Ion Popescu", cui: "23456789" },
    issueDate: "2024-11-15",
    dueDate: "2024-11-30",
    subtotal: 4201.68,
    vatAmount: 798.32,
    total: 5000,
    currency: "RON",
    status: "overdue",
    paidAmount: 2000,
    efacturaStatus: "accepted",
  },
  {
    id: "4",
    number: "FAC-2024-5678",
    direction: "received",
    client: { name: "SC Distribuitor SRL", cui: "RO99887766" },
    issueDate: "2024-12-02",
    dueDate: "2025-01-02",
    subtotal: 25210.08,
    vatAmount: 4789.92,
    total: 30000,
    currency: "RON",
    status: "sent",
    paidAmount: 0,
  },
  {
    id: "5",
    number: "DF-2024-001235",
    direction: "issued",
    client: { name: "SC Startup Inovativ SRL", cui: "RO34567890" },
    issueDate: "2024-12-03",
    dueDate: "2025-01-03",
    subtotal: 6722.69,
    vatAmount: 1277.31,
    total: 8000,
    currency: "RON",
    status: "draft",
    paidAmount: 0,
  },
];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState(mockInvoices);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [directionFilter, setDirectionFilter] = useState<InvoiceDirection | "all">("all");
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);

  // Filter invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.client.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    const matchesDirection = directionFilter === "all" || inv.direction === directionFilter;
    return matchesSearch && matchesStatus && matchesDirection;
  });

  // Statistics
  const stats = {
    totalIssued: invoices.filter(i => i.direction === "issued").reduce((sum, i) => sum + i.total, 0),
    totalReceived: invoices.filter(i => i.direction === "received").reduce((sum, i) => sum + i.total, 0),
    totalPaid: invoices.reduce((sum, i) => sum + i.paidAmount, 0),
    totalOverdue: invoices.filter(i => i.status === "overdue").reduce((sum, i) => sum + (i.total - i.paidAmount), 0),
    countDraft: invoices.filter(i => i.status === "draft").length,
    countOverdue: invoices.filter(i => i.status === "overdue").length,
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case "draft":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            <Edit className="w-3 h-3" />
            Ciornă
          </span>
        );
      case "sent":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <Send className="w-3 h-3" />
            Trimisă
          </span>
        );
      case "paid":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            <CheckCircle className="w-3 h-3" />
            Achitată
          </span>
        );
      case "overdue":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <AlertTriangle className="w-3 h-3" />
            Restantă
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
            <XCircle className="w-3 h-3" />
            Anulată
          </span>
        );
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedInvoices(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedInvoices.length === filteredInvoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(filteredInvoices.map(i => i.id));
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Facturi</h1>
          <p className="text-slate-500">Gestionează facturile emise și primite</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition text-slate-700">
            <Download className="w-4 h-4" />
            Export
          </button>
          <Link
            href="/efactura"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Factură Nouă
          </Link>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="w-5 h-5 text-emerald-500" />
            <span className="text-sm text-slate-500">Total Emis</span>
          </div>
          <p className="text-xl font-bold text-slate-900">
            {stats.totalIssued.toLocaleString("ro-RO")} lei
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownLeft className="w-5 h-5 text-purple-500" />
            <span className="text-sm text-slate-500">Total Primit</span>
          </div>
          <p className="text-xl font-bold text-slate-900">
            {stats.totalReceived.toLocaleString("ro-RO")} lei
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-slate-500">Încasat</span>
          </div>
          <p className="text-xl font-bold text-emerald-600">
            {stats.totalPaid.toLocaleString("ro-RO")} lei
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-sm text-slate-500">Restant</span>
          </div>
          <p className="text-xl font-bold text-red-600">
            {stats.totalOverdue.toLocaleString("ro-RO")} lei
          </p>
          {stats.countOverdue > 0 && (
            <p className="text-xs text-red-500 mt-1">{stats.countOverdue} facturi restante</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Caută după număr sau client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Direction Filter */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setDirectionFilter("all")}
              className={`px-3 py-1.5 text-sm rounded-md transition ${
                directionFilter === "all" ? "bg-white text-slate-900 shadow" : "text-slate-600"
              }`}
            >
              Toate
            </button>
            <button
              onClick={() => setDirectionFilter("issued")}
              className={`px-3 py-1.5 text-sm rounded-md transition flex items-center gap-1 ${
                directionFilter === "issued" ? "bg-white text-slate-900 shadow" : "text-slate-600"
              }`}
            >
              <ArrowUpRight className="w-3 h-3" />
              Emise
            </button>
            <button
              onClick={() => setDirectionFilter("received")}
              className={`px-3 py-1.5 text-sm rounded-md transition flex items-center gap-1 ${
                directionFilter === "received" ? "bg-white text-slate-900 shadow" : "text-slate-600"
              }`}
            >
              <ArrowDownLeft className="w-3 h-3" />
              Primite
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | "all")}
            className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Toate statusurile</option>
            <option value="draft">Ciorne</option>
            <option value="sent">Trimise</option>
            <option value="paid">Achitate</option>
            <option value="overdue">Restante</option>
            <option value="cancelled">Anulate</option>
          </select>
        </div>

        {/* Bulk Actions */}
        {selectedInvoices.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200 flex items-center gap-4">
            <span className="text-sm text-slate-600">
              {selectedInvoices.length} selectate
            </span>
            <button className="text-sm text-blue-600 hover:text-blue-700">
              Trimite pe email
            </button>
            <button className="text-sm text-blue-600 hover:text-blue-700">
              Exportă PDF
            </button>
            <button className="text-sm text-red-600 hover:text-red-700">
              Șterge
            </button>
          </div>
        )}
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedInvoices.length === filteredInvoices.length && filteredInvoices.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Factură</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Client/Furnizor</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Data</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-700">Valoare</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-slate-700">Status</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-700">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-slate-50 transition">
                  <td className="py-4 px-4">
                    <input
                      type="checkbox"
                      checked={selectedInvoices.includes(invoice.id)}
                      onChange={() => toggleSelect(invoice.id)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      {invoice.direction === "issued" ? (
                        <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4 text-purple-500" />
                      )}
                      <div>
                        <p className="font-medium text-slate-900">{invoice.number}</p>
                        {invoice.efacturaStatus && (
                          <span className={`text-xs ${
                            invoice.efacturaStatus === "accepted" ? "text-emerald-600" :
                            invoice.efacturaStatus === "rejected" ? "text-red-600" : "text-amber-600"
                          }`}>
                            E-Factura: {invoice.efacturaStatus === "accepted" ? "Acceptată" :
                              invoice.efacturaStatus === "rejected" ? "Respinsă" : "În așteptare"}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      <p className="font-medium text-slate-900">{invoice.client.name}</p>
                      <p className="text-sm text-slate-500">{invoice.client.cui}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      <p className="text-slate-900">{formatDate(invoice.issueDate)}</p>
                      <p className="text-sm text-slate-500">
                        Scadență: {formatDate(invoice.dueDate)}
                      </p>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <p className="font-semibold text-slate-900">
                      {invoice.total.toLocaleString("ro-RO")} {invoice.currency}
                    </p>
                    {invoice.status === "overdue" && invoice.paidAmount > 0 && (
                      <p className="text-sm text-emerald-600">
                        Achitat: {invoice.paidAmount.toLocaleString("ro-RO")} {invoice.currency}
                      </p>
                    )}
                    <p className="text-xs text-slate-500">
                      TVA: {invoice.vatAmount.toLocaleString("ro-RO")} {invoice.currency}
                    </p>
                  </td>
                  <td className="py-4 px-4 text-center">
                    {getStatusBadge(invoice.status)}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        title="Vizualizează"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        title="Printează"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        title="Trimite pe email"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        title="Descarcă"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredInvoices.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Nu au fost găsite facturi</p>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
          <p className="text-sm text-slate-500">
            Afișare 1-{filteredInvoices.length} din {filteredInvoices.length} facturi
          </p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50" disabled>
              Anterior
            </button>
            <button className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm">1</button>
            <button className="px-3 py-1 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50" disabled>
              Următor
            </button>
          </div>
        </div>
      </div>
      </div>
      <MobileNav />
    </AppLayout>
  );
}
