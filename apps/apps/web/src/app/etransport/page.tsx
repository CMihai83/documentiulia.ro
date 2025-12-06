"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import {
  Truck,
  Plus,
  Search,
  Filter,
  MoreVertical,
  MapPin,
  Calendar,
  Package,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  FileText,
  Download,
  RefreshCw,
  ChevronRight,
  Building2,
} from "lucide-react";

type TransportStatus = "DRAFT" | "DECLARED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";

interface Transport {
  id: string;
  uit: string;
  operationType: string;
  operationName: string;
  vehicleNumber: string;
  departureCity: string;
  departureCounty: string;
  arrivalCity: string;
  arrivalCounty: string;
  transportDate: string;
  status: TransportStatus;
  goodsCount: number;
  partnerName?: string;
  partnerCui?: string;
  createdAt: string;
}

const mockTransports: Transport[] = [
  {
    id: "1",
    uit: "UIT-M1K2J3-ABC123",
    operationType: "AIC",
    operationName: "Achiziție intracomunitară",
    vehicleNumber: "B 123 ABC",
    departureCity: "Viena",
    departureCounty: "Austria",
    arrivalCity: "București",
    arrivalCounty: "București",
    transportDate: "2024-12-15",
    status: "IN_TRANSIT",
    goodsCount: 5,
    partnerName: "AT Supplier GmbH",
    partnerCui: "ATU12345678",
    createdAt: "2024-12-14",
  },
  {
    id: "2",
    uit: "UIT-N4P5Q6-DEF456",
    operationType: "LHI",
    operationName: "Livrare high-risk internă",
    vehicleNumber: "CJ 456 DEF",
    departureCity: "Cluj-Napoca",
    departureCounty: "Cluj",
    arrivalCity: "Timișoara",
    arrivalCounty: "Timiș",
    transportDate: "2024-12-16",
    status: "DECLARED",
    goodsCount: 3,
    partnerName: "SC Client SRL",
    partnerCui: "RO12345678",
    createdAt: "2024-12-15",
  },
  {
    id: "3",
    uit: "UIT-R7S8T9-GHI789",
    operationType: "AIE",
    operationName: "Aprovizionare pentru export",
    vehicleNumber: "B 789 GHI",
    departureCity: "București",
    departureCounty: "București",
    arrivalCity: "Berlin",
    arrivalCounty: "Germania",
    transportDate: "2024-12-10",
    status: "DELIVERED",
    goodsCount: 8,
    partnerName: "DE Import GmbH",
    partnerCui: "DE987654321",
    createdAt: "2024-12-09",
  },
  {
    id: "4",
    uit: "UIT-U1V2W3-JKL012",
    operationType: "TDT",
    operationName: "Transport domestic taxabil",
    vehicleNumber: "IS 012 JKL",
    departureCity: "Iași",
    departureCounty: "Iași",
    arrivalCity: "Constanța",
    arrivalCounty: "Constanța",
    transportDate: "2024-12-12",
    status: "CANCELLED",
    goodsCount: 2,
    createdAt: "2024-12-11",
  },
];

const operationTypes = [
  { code: "AIC", name: "Achiziție intracomunitară" },
  { code: "AIE", name: "Aprovizionare pentru export" },
  { code: "LHI", name: "Livrare high-risk internă" },
  { code: "TDT", name: "Transport domestic taxabil" },
  { code: "ACI", name: "Achiziție comercială internațională" },
];

export default function EtransportPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TransportStatus | "ALL">("ALL");
  const [showNewModal, setShowNewModal] = useState(false);

  const getStatusBadge = (status: TransportStatus) => {
    const styles = {
      DRAFT: { bg: "bg-slate-100", text: "text-slate-700", icon: FileText, label: "Ciornă" },
      DECLARED: { bg: "bg-blue-100", text: "text-blue-700", icon: Clock, label: "Declarat" },
      IN_TRANSIT: { bg: "bg-amber-100", text: "text-amber-700", icon: Truck, label: "În tranzit" },
      DELIVERED: { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle2, label: "Livrat" },
      CANCELLED: { bg: "bg-red-100", text: "text-red-700", icon: XCircle, label: "Anulat" },
    };
    const style = styles[status];
    const Icon = style.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        <Icon className="w-3.5 h-3.5" />
        {style.label}
      </span>
    );
  };

  const filteredTransports = mockTransports.filter((t) => {
    const matchesSearch =
      t.uit.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.departureCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.arrivalCity.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: mockTransports.length,
    inTransit: mockTransports.filter((t) => t.status === "IN_TRANSIT").length,
    delivered: mockTransports.filter((t) => t.status === "DELIVERED").length,
    pending: mockTransports.filter((t) => t.status === "DECLARED").length,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-7 h-7 text-blue-600" />
              RO e-Transport
            </h1>
            <p className="text-slate-600 mt-1">
              Gestionare declarații de transport bunuri
            </p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            Declarație Nouă
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-sm text-slate-500">Total declarații</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.inTransit}</p>
                <p className="text-sm text-slate-500">În tranzit</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.delivered}</p>
                <p className="text-sm text-slate-500">Livrate</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
                <p className="text-sm text-slate-500">În așteptare</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Caută după UIT, număr vehicul, oraș..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TransportStatus | "ALL")}
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Toate statusurile</option>
              <option value="DRAFT">Ciornă</option>
              <option value="DECLARED">Declarat</option>
              <option value="IN_TRANSIT">În tranzit</option>
              <option value="DELIVERED">Livrat</option>
              <option value="CANCELLED">Anulat</option>
            </select>
            <button className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition">
              <Filter className="w-5 h-5 text-slate-600" />
            </button>
            <button className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition">
              <RefreshCw className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Transport List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">UIT / Tip</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Rută</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Vehicul</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Data</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Status</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-slate-700">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransports.map((transport) => (
                  <tr key={transport.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-mono text-sm font-medium text-slate-900">{transport.uit}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {transport.operationType} - {transport.operationName}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-center">
                          <MapPin className="w-4 h-4 text-green-500" />
                          <div className="w-0.5 h-4 bg-slate-200" />
                          <MapPin className="w-4 h-4 text-red-500" />
                        </div>
                        <div>
                          <p className="text-sm text-slate-900">{transport.departureCity}</p>
                          <p className="text-sm text-slate-900">{transport.arrivalCity}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-900">{transport.vehicleNumber}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{transport.goodsCount} bunuri</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-900">
                          {new Date(transport.transportDate).toLocaleDateString("ro-RO")}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(transport.status)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-2 hover:bg-slate-100 rounded-lg transition" title="Descarcă XML">
                          <Download className="w-4 h-4 text-slate-600" />
                        </button>
                        <button className="p-2 hover:bg-slate-100 rounded-lg transition" title="Detalii">
                          <ChevronRight className="w-4 h-4 text-slate-600" />
                        </button>
                        <button className="p-2 hover:bg-slate-100 rounded-lg transition">
                          <MoreVertical className="w-4 h-4 text-slate-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredTransports.length === 0 && (
            <div className="text-center py-12">
              <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Nu au fost găsite declarații de transport</p>
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">Despre RO e-Transport</h3>
              <p className="text-sm text-blue-700 mt-1">
                Sistemul RO e-Transport este obligatoriu pentru transportul bunurilor cu risc fiscal ridicat
                și pentru achizițiile intracomunitare. Declarația trebuie transmisă înainte de începerea transportului.
              </p>
              <div className="flex gap-4 mt-3">
                {operationTypes.slice(0, 3).map((op) => (
                  <div key={op.code} className="text-xs">
                    <span className="font-mono font-bold text-blue-800">{op.code}</span>
                    <span className="text-blue-600 ml-1">- {op.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
