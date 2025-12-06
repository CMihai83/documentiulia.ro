"use client";

import { useState } from "react";
import {
  FileText,
  Send,
  Download,
  Upload,
  Settings,
  HelpCircle,
  ExternalLink,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { EFacturaStatus } from "@/components/efactura/efactura-status";
import { EFacturaPreview } from "@/components/efactura/efactura-preview";
import { AppLayout, MobileNav } from "@/components/layout";

type TabType = "all" | "sent" | "received" | "drafts";

export default function EFacturaPage() {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [showPreview, setShowPreview] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const tabs = [
    { id: "all" as TabType, label: "Toate", count: 156 },
    { id: "sent" as TabType, label: "Emise", count: 89 },
    { id: "received" as TabType, label: "Primite", count: 62 },
    { id: "drafts" as TabType, label: "Ciorne", count: 5 },
  ];

  const quickStats = [
    {
      label: "De trimis",
      value: 5,
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      label: "În procesare",
      value: 3,
      icon: RefreshCw,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Acceptate azi",
      value: 12,
      icon: CheckCircle,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      label: "Respinse",
      value: 2,
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
  ];

  return (
    <AppLayout>
      {/* Header */}
      <div className="bg-white border-b border-slate-200 -mx-4 lg:-mx-6 -mt-4 lg:-mt-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">E-Factura</h1>
                  <p className="text-slate-500">
                    Gestionare facturi electronice SPV / ANAF
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition text-slate-700"
              >
                <Upload className="w-4 h-4" />
                Încarcă XML
              </button>
              <button
                onClick={() => setShowPreview(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                Factură Nouă
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className={`flex items-center gap-3 p-4 rounded-xl ${stat.bgColor}`}
                >
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                  <div>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-sm text-slate-600">{stat.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tabs */}
          <div className="mt-6 flex items-center gap-1 border-b border-slate-200 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
                <span
                  className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id
                      ? "bg-blue-100 text-blue-600"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EFacturaStatus
          onView={(id) => {
            console.log("View invoice:", id);
            setShowPreview(true);
          }}
          onSend={(id) => console.log("Send invoice:", id)}
          onRefresh={(id) => console.log("Refresh status:", id)}
          onDownload={(id, type) => console.log(`Download ${type}:`, id)}
        />
      </div>

      {/* Help Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/10 rounded-lg">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Ai nevoie de ajutor cu E-Factura?</h3>
                <p className="text-blue-100 mt-1">
                  Consultă ghidul nostru complet sau contactează suportul tehnic
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="https://www.anaf.ro/anaf/internet/ANAF/despre_anaf/strategii_anaf/proiecte_it/e.factura/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition"
              >
                <ExternalLink className="w-4 h-4" />
                Ghid ANAF
              </a>
              <button className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition font-medium">
                <Settings className="w-4 h-4" />
                Configurează SPV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl my-8">
            <EFacturaPreview
              onClose={() => setShowPreview(false)}
              onSend={() => {
                console.log("Sending to ANAF...");
                setShowPreview(false);
              }}
              onDownloadXml={() => console.log("Downloading XML...")}
              onDownloadPdf={() => console.log("Downloading PDF...")}
              onPrint={() => window.print()}
            />
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">Încarcă Factură XML</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <span className="sr-only">Închide</span>
                ×
              </button>
            </div>

            <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-blue-400 transition cursor-pointer">
              <Upload className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-2">
                Trage fișierul XML aici sau click pentru a selecta
              </p>
              <p className="text-sm text-slate-400">
                Acceptă fișiere .xml (max 10MB)
              </p>
              <input
                type="file"
                accept=".xml"
                className="hidden"
                onChange={(e) => {
                  console.log("File selected:", e.target.files?.[0]);
                  setShowUploadModal(false);
                }}
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Anulează
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                Încarcă
              </button>
            </div>
          </div>
        </div>
      )}
      <MobileNav />
    </AppLayout>
  );
}
