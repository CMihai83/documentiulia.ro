"use client";

import { useState } from "react";
import {
  Users,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  TrendingUp,
  TrendingDown,
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
} from "lucide-react";
import { CuiInput } from "@/components/forms/cui-input";
import { IbanInput } from "@/components/forms/iban-input";
import { AppLayout, MobileNav } from "@/components/layout";

interface Client {
  id: string;
  name: string;
  cui: string;
  regCom?: string;
  email?: string;
  phone?: string;
  address: string;
  city: string;
  county: string;
  vatPayer: boolean;
  status: "active" | "inactive" | "pending";
  totalInvoiced: number;
  totalPaid: number;
  balance: number;
  lastInvoice?: string;
  createdAt: string;
}

const mockClients: Client[] = [
  {
    id: "1",
    name: "SC Client Principal SRL",
    cui: "RO12345678",
    regCom: "J40/1234/2020",
    email: "contact@clientprincipal.ro",
    phone: "+40 721 123 456",
    address: "Str. Exemplu nr. 10",
    city: "București",
    county: "București",
    vatPayer: true,
    status: "active",
    totalInvoiced: 125000,
    totalPaid: 118000,
    balance: 7000,
    lastInvoice: "2024-12-01",
    createdAt: "2023-01-15",
  },
  {
    id: "2",
    name: "SC Furnizor Mare SA",
    cui: "RO87654321",
    regCom: "J40/5678/2019",
    email: "office@furnizormare.ro",
    phone: "+40 722 234 567",
    address: "Bd. Unirii nr. 50",
    city: "București",
    county: "București",
    vatPayer: true,
    status: "active",
    totalInvoiced: 89000,
    totalPaid: 89000,
    balance: 0,
    lastInvoice: "2024-11-28",
    createdAt: "2022-06-20",
  },
  {
    id: "3",
    name: "PFA Ion Popescu",
    cui: "23456789",
    email: "ion.popescu@gmail.com",
    phone: "+40 723 345 678",
    address: "Str. Florilor nr. 5",
    city: "Cluj-Napoca",
    county: "Cluj",
    vatPayer: false,
    status: "active",
    totalInvoiced: 15000,
    totalPaid: 12000,
    balance: 3000,
    lastInvoice: "2024-11-15",
    createdAt: "2024-01-10",
  },
  {
    id: "4",
    name: "SC Startup Inovativ SRL",
    cui: "RO34567890",
    regCom: "J12/987/2023",
    email: "hello@startupinovativ.ro",
    phone: "+40 724 456 789",
    address: "Calea Victoriei nr. 100",
    city: "Timișoara",
    county: "Timiș",
    vatPayer: true,
    status: "pending",
    totalInvoiced: 0,
    totalPaid: 0,
    balance: 0,
    createdAt: "2024-11-01",
  },
  {
    id: "5",
    name: "SC Client Vechi SRL",
    cui: "RO11223344",
    regCom: "J40/111/2015",
    email: "contact@clientvechi.ro",
    address: "Str. Veche nr. 1",
    city: "Iași",
    county: "Iași",
    vatPayer: true,
    status: "inactive",
    totalInvoiced: 45000,
    totalPaid: 45000,
    balance: 0,
    lastInvoice: "2023-06-15",
    createdAt: "2020-03-01",
  },
];

export default function ClientsPage() {
  const [clients, setClients] = useState(mockClients);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "pending">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // New client form state
  const [newClient, setNewClient] = useState({
    name: "",
    cui: "",
    regCom: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    county: "",
    iban: "",
    bank: "",
    vatPayer: false,
  });

  // Filter clients
  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.cui.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Statistics
  const stats = {
    total: clients.length,
    active: clients.filter((c) => c.status === "active").length,
    inactive: clients.filter((c) => c.status === "inactive").length,
    totalBalance: clients.reduce((sum, c) => sum + c.balance, 0),
    totalInvoiced: clients.reduce((sum, c) => sum + c.totalInvoiced, 0),
  };

  const getStatusBadge = (status: Client["status"]) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            <CheckCircle className="w-3 h-3" />
            Activ
          </span>
        );
      case "inactive":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            <XCircle className="w-3 h-3" />
            Inactiv
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <Clock className="w-3 h-3" />
            În așteptare
          </span>
        );
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clienți</h1>
          <p className="text-slate-500">Gestionează partenerii de afaceri</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition text-slate-700">
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition text-slate-700">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Client Nou
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-slate-500">Total Clienți</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <span className="text-sm text-slate-500">Activi</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-purple-500" />
            <span className="text-sm text-slate-500">Total Facturat</span>
          </div>
          <p className="text-xl font-bold text-slate-900">{stats.totalInvoiced.toLocaleString("ro-RO")} lei</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            <span className="text-sm text-slate-500">Sold Restant</span>
          </div>
          <p className={`text-xl font-bold ${stats.totalBalance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
            {stats.totalBalance.toLocaleString("ro-RO")} lei
          </p>
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
              placeholder="Caută după nume, CUI sau email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {["all", "active", "inactive", "pending"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status as typeof statusFilter)}
                className={`px-3 py-1.5 text-sm rounded-md transition ${
                  statusFilter === status
                    ? "bg-white text-slate-900 shadow"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {status === "all" ? "Toți" : status === "active" ? "Activi" : status === "inactive" ? "Inactivi" : "În așteptare"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Client</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">CUI</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Contact</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-700">Facturat</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-700">Sold</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-slate-700">Status</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-700">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50 transition">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{client.name}</p>
                        <p className="text-sm text-slate-500">{client.city}, {client.county}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      <p className="font-mono text-slate-900">{client.cui}</p>
                      {client.regCom && (
                        <p className="text-xs text-slate-500">{client.regCom}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="space-y-1">
                      {client.email && (
                        <p className="text-sm text-slate-700 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {client.email}
                        </p>
                      )}
                      {client.phone && (
                        <p className="text-sm text-slate-700 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {client.phone}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <p className="font-medium text-slate-900">
                      {client.totalInvoiced.toLocaleString("ro-RO")} lei
                    </p>
                    <p className="text-sm text-emerald-600">
                      Achitat: {client.totalPaid.toLocaleString("ro-RO")} lei
                    </p>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <p className={`font-semibold ${client.balance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                      {client.balance.toLocaleString("ro-RO")} lei
                    </p>
                  </td>
                  <td className="py-4 px-4 text-center">
                    {getStatusBadge(client.status)}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setSelectedClient(client)}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        title="Vizualizează"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        title="Editează"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Șterge"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredClients.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Nu au fost găsiți clienți</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 text-blue-600 hover:text-blue-700"
            >
              Adaugă primul client
            </button>
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Adaugă Client Nou</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* CUI Input with auto-lookup */}
              <CuiInput
                value={newClient.cui}
                onChange={(value) => setNewClient({ ...newClient, cui: value })}
                onCompanyFound={(company) => {
                  setNewClient({
                    ...newClient,
                    cui: company.cui,
                    name: company.name,
                    address: company.address,
                    city: company.city,
                    county: company.county,
                    regCom: company.regCom,
                    vatPayer: company.vatPayer,
                  });
                }}
                required
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Denumire <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newClient.name}
                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nr. Reg. Comerțului
                  </label>
                  <input
                    type="text"
                    value={newClient.regCom}
                    onChange={(e) => setNewClient({ ...newClient, regCom: e.target.value })}
                    placeholder="J40/1234/2020"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newClient.email}
                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Oraș
                  </label>
                  <input
                    type="text"
                    value={newClient.city}
                    onChange={(e) => setNewClient({ ...newClient, city: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Adresă
                  </label>
                  <input
                    type="text"
                    value={newClient.address}
                    onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <IbanInput
                value={newClient.iban}
                onChange={(value) => setNewClient({ ...newClient, iban: value })}
                onValidation={(isValid, bankInfo) => {
                  if (bankInfo) {
                    setNewClient({ ...newClient, bank: bankInfo.name });
                  }
                }}
              />

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newClient.vatPayer}
                    onChange={(e) => setNewClient({ ...newClient, vatPayer: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-slate-700">Plătitor de TVA</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Anulează
              </button>
              <button
                onClick={() => {
                  // Add client logic here
                  setShowAddModal(false);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Salvează Client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client Detail Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">{selectedClient.name}</h2>
              <button
                onClick={() => setSelectedClient(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{selectedClient.name}</h3>
                  <p className="text-slate-500">{selectedClient.cui}</p>
                  {getStatusBadge(selectedClient.status)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">Total Facturat</p>
                  <p className="text-xl font-bold text-slate-900">
                    {selectedClient.totalInvoiced.toLocaleString("ro-RO")} lei
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">Sold Curent</p>
                  <p className={`text-xl font-bold ${selectedClient.balance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    {selectedClient.balance.toLocaleString("ro-RO")} lei
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-slate-400" />
                  <span className="text-slate-700">{selectedClient.address}, {selectedClient.city}, {selectedClient.county}</span>
                </div>
                {selectedClient.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-slate-400" />
                    <a href={`mailto:${selectedClient.email}`} className="text-blue-600 hover:underline">
                      {selectedClient.email}
                    </a>
                  </div>
                )}
                {selectedClient.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-slate-400" />
                    <a href={`tel:${selectedClient.phone}`} className="text-blue-600 hover:underline">
                      {selectedClient.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button
                onClick={() => setSelectedClient(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Închide
              </button>
              <button className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition text-slate-700">
                Editează
              </button>
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                Factură Nouă
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
      <MobileNav />
    </AppLayout>
  );
}
