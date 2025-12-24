'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, Check, X, ExternalLink, RefreshCw, Loader2, Key, Building, FileText, Banknote } from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  status: 'connected' | 'disconnected' | 'pending';
  lastSync?: string;
  features: string[];
}

export default function IntegrationsPage() {
  const router = useRouter();
  const t = useTranslations();
  const toast = useToast();
  const [connecting, setConnecting] = useState<string | null>(null);

  const integrations: Integration[] = [
    {
      id: 'anaf-spv',
      name: 'ANAF SPV (e-Factura)',
      description: 'Depunere automata facturi electronice B2B/B2G',
      icon: Building,
      status: 'disconnected',
      features: ['e-Factura UBL 2.1', 'Verificare status', 'Descarca facturi primite'],
    },
    {
      id: 'anaf-saft',
      name: 'ANAF SAF-T D406',
      description: 'Generare si depunere rapoarte SAF-T lunar',
      icon: FileText,
      status: 'disconnected',
      features: ['Generare XML', 'Validare automata', 'Depunere SPV'],
    },
    {
      id: 'saga',
      name: 'SAGA Software',
      description: 'Sincronizare cu software-ul SAGA pentru contabilitate',
      icon: Key,
      status: 'disconnected',
      features: ['Import facturi', 'Export declaratii', 'Sync salarii'],
    },
    {
      id: 'banking',
      name: 'Open Banking (PSD2)',
      description: 'Conectare conturi bancare pentru reconciliere',
      icon: Banknote,
      status: 'disconnected',
      features: ['Import tranzactii', 'Reconciliere automata', 'Multi-banca'],
    },
  ];

  const handleConnect = async (integrationId: string) => {
    setConnecting(integrationId);

    // Simulate OAuth flow
    if (integrationId === 'anaf-spv') {
      // Redirect to ANAF OAuth
      window.open('/api/v1/spv/oauth/init', '_blank');
    }

    setTimeout(() => setConnecting(null), 2000);
  };

  const handleConfigure = (integrationId: string) => {
    const integration = integrations.find(i => i.id === integrationId);
    if (integration) {
      router.push(`/dashboard/settings/integrations/${integrationId}`);
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    const integration = integrations.find(i => i.id === integrationId);
    if (!integration) return;

    // Navigate to disconnect confirmation page
    router.push(`/dashboard/settings/integrations/${integrationId}/disconnect`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/settings"
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integrari</h1>
          <p className="text-gray-600">Conecteaza servicii externe pentru automatizare</p>
        </div>
      </div>

      {/* ANAF Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-semibold text-blue-800 mb-2">Integrare ANAF</h3>
        <p className="text-sm text-blue-700">
          Pentru a utiliza e-Factura si SAF-T D406, trebuie sa obtineti credentiale OAuth de la
          <a href="https://www.anaf.ro/anaf/internet/ANAF/servicii_online" target="_blank" rel="noopener noreferrer" className="underline ml-1">
            ANAF Portal
          </a>.
          Certificatul digital SPV este necesar.
        </p>
      </div>

      {/* Integrations Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {integrations.map((integration) => (
          <div key={integration.id} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  integration.status === 'connected' ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <integration.icon className={`w-6 h-6 ${
                    integration.status === 'connected' ? 'text-green-600' : 'text-gray-600'
                  }`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                  <div className="flex items-center gap-1 text-sm">
                    {integration.status === 'connected' ? (
                      <>
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-green-600">Conectat</span>
                      </>
                    ) : integration.status === 'pending' ? (
                      <>
                        <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />
                        <span className="text-yellow-600">In asteptare</span>
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">Neconectat</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">{integration.description}</p>

            <div className="mb-4">
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Functionalitati</h4>
              <ul className="space-y-1">
                {integration.features.map((feature, idx) => (
                  <li key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                    <Check className="w-3 h-3 text-primary-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {integration.lastSync && (
              <p className="text-xs text-gray-500 mb-4">
                Ultima sincronizare: {integration.lastSync}
              </p>
            )}

            <div className="flex gap-2">
              {integration.status === 'connected' ? (
                <>
                  <button onClick={() => handleConfigure(integration.id)} className="flex-1 px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 transition">
                    Configureaza
                  </button>
                  <button onClick={() => handleDisconnect(integration.id)} className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition">
                    Deconecteaza
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleConnect(integration.id)}
                  disabled={connecting === integration.id}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition"
                >
                  {connecting === integration.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4" />
                  )}
                  Conecteaza
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* API Keys Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Chei API</h3>
        <p className="text-sm text-gray-600 mb-4">
          Gestioneaza cheile API pentru integrari personalizate
        </p>
        <Link
          href="/dashboard/developer"
          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700"
        >
          <Key className="w-4 h-4" />
          Mergi la Developer Portal
        </Link>
      </div>
    </div>
  );
}
