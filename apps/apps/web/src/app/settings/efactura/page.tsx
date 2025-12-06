"use client";

import { useState } from "react";
import Link from "next/link";
import { AppLayout, MobileNav } from "@/components/layout";
import {
  ArrowLeft,
  FileText,
  Key,
  Upload,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Shield,
  Clock,
  Building2,
  HelpCircle,
  Download,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

export default function EFacturaSettingsPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [showCertPassword, setShowCertPassword] = useState(false);

  const [config, setConfig] = useState({
    cui: "RO12345678",
    certificateFile: "",
    certificatePassword: "",
    spvUsername: "",
    environment: "test", // test or production
    autoSync: true,
    syncInterval: 15,
  });

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // Simulate successful connection
      setTestResult("success");
      setIsConnected(true);
    } catch {
      setTestResult("error");
    } finally {
      setIsTesting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setConfig({ ...config, certificateFile: file.name });
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/settings"
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Configurare E-Factura SPV
              </h1>
              <p className="text-slate-500">
                Conectează-te la Sistemul Privat Virtual ANAF
              </p>
            </div>
          </div>
        </div>

        {/* Connection Status Banner */}
        <div
          className={`rounded-xl p-4 mb-6 flex items-center gap-4 ${
            isConnected
              ? "bg-emerald-50 border border-emerald-200"
              : "bg-amber-50 border border-amber-200"
          }`}
        >
          {isConnected ? (
            <>
              <CheckCircle className="w-6 h-6 text-emerald-600" />
              <div className="flex-1">
                <p className="font-medium text-emerald-900">
                  Conectat la ANAF SPV
                </p>
                <p className="text-sm text-emerald-700">
                  Certificatul este valid până la 15.03.2026
                </p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition">
                <RefreshCw className="w-4 h-4" />
                Verifică status
              </button>
            </>
          ) : (
            <>
              <AlertCircle className="w-6 h-6 text-amber-600" />
              <div className="flex-1">
                <p className="font-medium text-amber-900">
                  Nu ești conectat la ANAF SPV
                </p>
                <p className="text-sm text-amber-700">
                  Configurează certificatul digital pentru a activa e-Factura
                </p>
              </div>
            </>
          )}
        </div>

        {/* Step by Step Guide */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Ghid de configurare
          </h3>
          <ol className="space-y-3 text-sm text-blue-800">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                1
              </span>
              <span>
                Obține certificatul digital calificat de la un furnizor autorizat
                (certSIGN, DigiSign, Trans Sped)
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                2
              </span>
              <span>
                Înregistrează-te în SPV pe{" "}
                <a
                  href="https://www.anaf.ro/anaf/internet/ANAF/servicii_online/inreg_inrol_pf_pj"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-600"
                >
                  portalul ANAF
                </a>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                3
              </span>
              <span>
                Încarcă certificatul în format .p12 sau .pfx și introdu parola
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                4
              </span>
              <span>Testează conexiunea și activează sincronizarea automată</span>
            </li>
          </ol>
        </div>

        {/* Configuration Form */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              Date de autentificare
            </h2>
          </div>

          <div className="p-6 space-y-6">
            {/* Company CUI */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                CUI Companie
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={config.cui}
                  onChange={(e) => setConfig({ ...config, cui: e.target.value })}
                  placeholder="RO12345678"
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                CUI-ul companiei pentru care se configurează e-Factura
              </p>
            </div>

            {/* Certificate Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Certificat Digital (.p12 / .pfx)
              </label>
              <div className="relative">
                {config.certificateFile ? (
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-emerald-600" />
                      <div>
                        <p className="font-medium text-slate-900">
                          {config.certificateFile}
                        </p>
                        <p className="text-xs text-slate-500">
                          Certificat încărcat
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setConfig({ ...config, certificateFile: "" })
                      }
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Elimină
                    </button>
                  </div>
                ) : (
                  <label className="block cursor-pointer">
                    <div className="flex items-center justify-center gap-3 p-6 border-2 border-dashed border-slate-200 rounded-lg hover:border-blue-400 transition">
                      <Upload className="w-6 h-6 text-slate-400" />
                      <div className="text-center">
                        <p className="text-slate-600">
                          Click pentru a încărca certificatul
                        </p>
                        <p className="text-xs text-slate-400">
                          Acceptă .p12, .pfx (max 5MB)
                        </p>
                      </div>
                    </div>
                    <input
                      type="file"
                      accept=".p12,.pfx"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Certificate Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Parolă Certificat
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showCertPassword ? "text" : "password"}
                  value={config.certificatePassword}
                  onChange={(e) =>
                    setConfig({ ...config, certificatePassword: e.target.value })
                  }
                  placeholder="Parola certificatului digital"
                  className="w-full pl-10 pr-12 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowCertPassword(!showCertPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded"
                >
                  {showCertPassword ? (
                    <EyeOff className="w-5 h-5 text-slate-400" />
                  ) : (
                    <Eye className="w-5 h-5 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Environment */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Mediu de lucru
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, environment: "test" })}
                  className={`p-4 rounded-xl border-2 transition text-left ${
                    config.environment === "test"
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        config.environment === "test"
                          ? "bg-blue-500"
                          : "bg-slate-300"
                      }`}
                    />
                    <span className="font-medium text-slate-900">Test</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Pentru testare și dezvoltare. Facturile nu sunt trimise real.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setConfig({ ...config, environment: "production" })
                  }
                  className={`p-4 rounded-xl border-2 transition text-left ${
                    config.environment === "production"
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        config.environment === "production"
                          ? "bg-emerald-500"
                          : "bg-slate-300"
                      }`}
                    />
                    <span className="font-medium text-slate-900">Producție</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Pentru facturi reale. Conexiune la sistemul ANAF live.
                  </p>
                </button>
              </div>
            </div>

            {/* Test Connection */}
            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">Testează conexiunea</p>
                  <p className="text-sm text-slate-500">
                    Verifică dacă certificatul și configurația sunt corecte
                  </p>
                </div>
                <button
                  onClick={handleTestConnection}
                  disabled={isTesting || !config.certificateFile}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Se testează...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Testează
                    </>
                  )}
                </button>
              </div>

              {testResult && (
                <div
                  className={`mt-4 p-4 rounded-lg flex items-center gap-3 ${
                    testResult === "success"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {testResult === "success" ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Conexiune stabilită cu succes!</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5" />
                      <span>
                        Eroare la conectare. Verifică certificatul și parola.
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Auto Sync Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              Sincronizare automată
            </h2>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">
                  Activează sincronizarea automată
                </p>
                <p className="text-sm text-slate-500">
                  Verifică periodic pentru facturi noi de la ANAF
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoSync}
                  onChange={(e) =>
                    setConfig({ ...config, autoSync: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {config.autoSync && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Interval sincronizare
                </label>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-slate-400" />
                  <select
                    value={config.syncInterval}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        syncInterval: parseInt(e.target.value),
                      })
                    }
                    className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={5}>La fiecare 5 minute</option>
                    <option value={15}>La fiecare 15 minute</option>
                    <option value={30}>La fiecare 30 minute</option>
                    <option value={60}>La fiecare oră</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Resources */}
        <div className="bg-slate-50 rounded-xl p-6 mb-20">
          <h3 className="font-semibold text-slate-900 mb-4">Resurse utile</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="https://www.anaf.ro/anaf/internet/ANAF/despre_anaf/strategii_anaf/proiecte_it/e.factura/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-white rounded-lg hover:shadow-md transition"
            >
              <ExternalLink className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-slate-900">Portal ANAF e-Factura</p>
                <p className="text-sm text-slate-500">Documentație oficială</p>
              </div>
            </a>
            <a
              href="https://mfinante.gov.ro/ro/web/efactura"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-white rounded-lg hover:shadow-md transition"
            >
              <ExternalLink className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-slate-900">
                  Ministerul Finanțelor
                </p>
                <p className="text-sm text-slate-500">Informații legislative</p>
              </div>
            </a>
            <a
              href="#"
              className="flex items-center gap-3 p-4 bg-white rounded-lg hover:shadow-md transition"
            >
              <Download className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-slate-900">Ghid PDF complet</p>
                <p className="text-sm text-slate-500">Descarcă ghidul nostru</p>
              </div>
            </a>
            <a
              href="/help"
              className="flex items-center gap-3 p-4 bg-white rounded-lg hover:shadow-md transition"
            >
              <HelpCircle className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-slate-900">Suport tehnic</p>
                <p className="text-sm text-slate-500">Contactează echipa</p>
              </div>
            </a>
          </div>
        </div>
      </div>
      <MobileNav />
    </AppLayout>
  );
}
