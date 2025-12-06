"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Send,
  FileText,
  RefreshCw,
  ExternalLink,
  Download,
  Eye,
  MoreVertical,
  Filter,
  Search,
  Calendar,
  Building2,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
} from "lucide-react";

// E-Factura status types as per ANAF/SPV
type EFacturaStatus =
  | "draft" // Not yet sent
  | "pending" // Sent, waiting for SPV
  | "uploaded" // Uploaded to SPV, waiting for validation
  | "processing" // Being validated by ANAF
  | "accepted" // Accepted by ANAF
  | "rejected" // Rejected by ANAF
  | "error" // Technical error
  | "cancelled"; // Cancelled invoice

interface EFacturaDocument {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  uploadDate?: string;
  partnerName: string;
  partnerCui: string;
  direction: "sent" | "received"; // B2B, B2G
  amount: number;
  vatAmount: number;
  currency: string;
  status: EFacturaStatus;
  indexIncarcareId?: string; // ANAF upload ID
  errorMessage?: string;
  xmlUrl?: string;
  pdfUrl?: string;
}

// Mock data for demonstration
const mockDocuments: EFacturaDocument[] = [
  {
    id: "1",
    invoiceNumber: "DF-2024-001234",
    invoiceDate: "2024-12-01",
    uploadDate: "2024-12-01T10:30:00",
    partnerName: "SC Client Important SRL",
    partnerCui: "RO12345678",
    direction: "sent",
    amount: 15000,
    vatAmount: 2850,
    currency: "RON",
    status: "accepted",
    indexIncarcareId: "5123456789",
  },
  {
    id: "2",
    invoiceNumber: "DF-2024-001235",
    invoiceDate: "2024-12-02",
    uploadDate: "2024-12-02T14:15:00",
    partnerName: "Primăria Sector 1",
    partnerCui: "4505359",
    direction: "sent",
    amount: 25000,
    vatAmount: 4750,
    currency: "RON",
    status: "processing",
    indexIncarcareId: "5123456790",
  },
  {
    id: "3",
    invoiceNumber: "DF-2024-001236",
    invoiceDate: "2024-12-03",
    partnerName: "SC Furnizor Mare SRL",
    partnerCui: "RO87654321",
    direction: "received",
    amount: 8500,
    vatAmount: 1615,
    currency: "RON",
    status: "pending",
  },
  {
    id: "4",
    invoiceNumber: "DF-2024-001230",
    invoiceDate: "2024-11-28",
    uploadDate: "2024-11-28T09:00:00",
    partnerName: "SC Mic Business SRL",
    partnerCui: "RO11223344",
    direction: "sent",
    amount: 3200,
    vatAmount: 608,
    currency: "RON",
    status: "rejected",
    indexIncarcareId: "5123456780",
    errorMessage: "Codul CUI al cumpărătorului nu este valid sau firma este inactivă.",
  },
  {
    id: "5",
    invoiceNumber: "DF-2024-001237",
    invoiceDate: "2024-12-04",
    partnerName: "SC Nou Client SRL",
    partnerCui: "RO55667788",
    direction: "sent",
    amount: 7800,
    vatAmount: 1482,
    currency: "RON",
    status: "draft",
  },
  {
    id: "6",
    invoiceNumber: "FAC-2024-5678",
    invoiceDate: "2024-12-01",
    uploadDate: "2024-12-01T16:45:00",
    partnerName: "SC Distribuitor National SA",
    partnerCui: "RO99887766",
    direction: "received",
    amount: 45000,
    vatAmount: 8550,
    currency: "RON",
    status: "accepted",
    indexIncarcareId: "5123456795",
  },
];

interface EFacturaStatusProps {
  documents?: EFacturaDocument[];
  onSend?: (id: string) => void;
  onRefresh?: (id: string) => void;
  onDownload?: (id: string, type: "xml" | "pdf") => void;
  onView?: (id: string) => void;
  className?: string;
}

const statusConfig: Record<EFacturaStatus, { label: string; color: string; icon: React.ReactNode; bgColor: string }> = {
  draft: {
    label: "Ciornă",
    color: "text-slate-600",
    bgColor: "bg-slate-100",
    icon: <FileText className="w-4 h-4" />,
  },
  pending: {
    label: "În așteptare",
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    icon: <Clock className="w-4 h-4" />,
  },
  uploaded: {
    label: "Încărcat SPV",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    icon: <Send className="w-4 h-4" />,
  },
  processing: {
    label: "În procesare",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
  },
  accepted: {
    label: "Acceptat ANAF",
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
    icon: <CheckCircle className="w-4 h-4" />,
  },
  rejected: {
    label: "Respins",
    color: "text-red-600",
    bgColor: "bg-red-100",
    icon: <XCircle className="w-4 h-4" />,
  },
  error: {
    label: "Eroare",
    color: "text-red-600",
    bgColor: "bg-red-100",
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  cancelled: {
    label: "Anulat",
    color: "text-slate-500",
    bgColor: "bg-slate-100",
    icon: <XCircle className="w-4 h-4" />,
  },
};

export function EFacturaStatus({
  documents = mockDocuments,
  onSend,
  onRefresh,
  onDownload,
  onView,
  className = "",
}: EFacturaStatusProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<EFacturaStatus | "all">("all");
  const [directionFilter, setDirectionFilter] = useState<"all" | "sent" | "received">("all");
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter documents
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.partnerCui.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    const matchesDirection = directionFilter === "all" || doc.direction === directionFilter;
    return matchesSearch && matchesStatus && matchesDirection;
  });

  // Calculate statistics
  const stats = {
    total: documents.length,
    accepted: documents.filter((d) => d.status === "accepted").length,
    pending: documents.filter((d) => ["pending", "uploaded", "processing"].includes(d.status)).length,
    rejected: documents.filter((d) => d.status === "rejected").length,
    draft: documents.filter((d) => d.status === "draft").length,
    sentTotal: documents.filter((d) => d.direction === "sent").reduce((sum, d) => sum + d.amount, 0),
    receivedTotal: documents.filter((d) => d.direction === "received").reduce((sum, d) => sum + d.amount, 0),
  };

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("ro-RO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">E-Factura</h2>
          <p className="text-slate-500">Monitorizare și gestionare facturi electronice SPV/ANAF</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Se actualizează..." : "Actualizează status"}
          </button>
          <a
            href="https://www.anaf.ro/spv/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition text-slate-700"
          >
            <ExternalLink className="w-4 h-4" />
            Portal SPV
          </a>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-slate-400" />
            <span className="text-sm text-slate-500">Total</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <span className="text-sm text-slate-500">Acceptate</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{stats.accepted}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <span className="text-sm text-slate-500">În procesare</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <span className="text-sm text-slate-500">Respinse</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-slate-500">Total emis</span>
          </div>
          <p className="text-lg font-bold text-blue-600">{stats.sentTotal.toLocaleString("ro-RO")} lei</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownLeft className="w-5 h-5 text-purple-500" />
            <span className="text-sm text-slate-500">Total primit</span>
          </div>
          <p className="text-lg font-bold text-purple-600">{stats.receivedTotal.toLocaleString("ro-RO")} lei</p>
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
              placeholder="Caută după număr, partener sau CUI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as EFacturaStatus | "all")}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Toate statusurile</option>
              <option value="draft">Ciorne</option>
              <option value="pending">În așteptare</option>
              <option value="processing">În procesare</option>
              <option value="accepted">Acceptate</option>
              <option value="rejected">Respinse</option>
            </select>
          </div>

          {/* Direction Filter */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setDirectionFilter("all")}
              className={`px-3 py-1.5 text-sm rounded-md transition ${
                directionFilter === "all" ? "bg-white text-slate-900 shadow" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Toate
            </button>
            <button
              onClick={() => setDirectionFilter("sent")}
              className={`px-3 py-1.5 text-sm rounded-md transition flex items-center gap-1 ${
                directionFilter === "sent" ? "bg-white text-slate-900 shadow" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ArrowUpRight className="w-3 h-3" />
              Emise
            </button>
            <button
              onClick={() => setDirectionFilter("received")}
              className={`px-3 py-1.5 text-sm rounded-md transition flex items-center gap-1 ${
                directionFilter === "received" ? "bg-white text-slate-900 shadow" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ArrowDownLeft className="w-3 h-3" />
              Primite
            </button>
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Factură</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Partener</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Data</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-700">Valoare</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-slate-700">Status</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-700">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocuments.map((doc) => {
                const statusInfo = statusConfig[doc.status];
                return (
                  <tr key={doc.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {doc.direction === "sent" ? (
                          <ArrowUpRight className="w-4 h-4 text-blue-500" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4 text-purple-500" />
                        )}
                        <div>
                          <p className="font-medium text-slate-900">{doc.invoiceNumber}</p>
                          {doc.indexIncarcareId && (
                            <p className="text-xs text-slate-500">ID: {doc.indexIncarcareId}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-slate-900">{doc.partnerName}</p>
                        <p className="text-sm text-slate-500">{doc.partnerCui}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-slate-900">{formatDate(doc.invoiceDate)}</p>
                        {doc.uploadDate && (
                          <p className="text-xs text-slate-500">
                            Încărcat: {formatDateTime(doc.uploadDate)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <p className="font-medium text-slate-900">
                        {doc.amount.toLocaleString("ro-RO")} {doc.currency}
                      </p>
                      <p className="text-sm text-slate-500">
                        TVA: {doc.vatAmount.toLocaleString("ro-RO")} {doc.currency}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color} ${statusInfo.bgColor}`}
                        >
                          {statusInfo.icon}
                          {statusInfo.label}
                        </span>
                        {doc.errorMessage && (
                          <span
                            className="text-xs text-red-600 max-w-[200px] truncate cursor-help"
                            title={doc.errorMessage}
                          >
                            {doc.errorMessage}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        {doc.status === "draft" && (
                          <button
                            onClick={() => onSend?.(doc.id)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Trimite la ANAF"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        {["pending", "uploaded", "processing"].includes(doc.status) && (
                          <button
                            onClick={() => onRefresh?.(doc.id)}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                            title="Verifică status"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onView?.(doc.id)}
                          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                          title="Vizualizează"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDownload?.(doc.id, "xml")}
                          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                          title="Descarcă XML"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredDocuments.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Nu au fost găsite facturi</p>
            <p className="text-sm text-slate-400">Modificați criteriile de filtrare</p>
          </div>
        )}
      </div>

      {/* Status Legend */}
      <div className="bg-slate-50 rounded-xl p-4">
        <h4 className="text-sm font-medium text-slate-700 mb-3">Legendă status E-Factura</h4>
        <div className="flex flex-wrap gap-4">
          {Object.entries(statusConfig).map(([status, config]) => (
            <div key={status} className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${config.color} ${config.bgColor}`}>
                {config.icon}
              </span>
              <span className="text-sm text-slate-600">{config.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
