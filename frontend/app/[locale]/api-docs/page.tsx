'use client';

import { useTranslations } from 'next-intl';
import { Code, Key, Book, Terminal, Copy, CheckCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function ApiDocsPage() {
  const t = useTranslations();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const endpoints = [
    {
      method: 'GET',
      path: '/api/v1/invoices',
      description: 'Listează toate facturile',
      auth: true,
    },
    {
      method: 'POST',
      path: '/api/v1/invoices',
      description: 'Creează o factură nouă',
      auth: true,
    },
    {
      method: 'GET',
      path: '/api/v1/vat/calculate',
      description: 'Calculează TVA pentru o sumă',
      auth: true,
    },
    {
      method: 'POST',
      path: '/api/v1/ocr/process',
      description: 'Procesează document cu OCR',
      auth: true,
    },
    {
      method: 'GET',
      path: '/api/v1/saft/generate',
      description: 'Generează fișier SAF-T',
      auth: true,
    },
    {
      method: 'POST',
      path: '/api/v1/efactura/submit',
      description: 'Trimite e-Factura la ANAF',
      auth: true,
    },
  ];

  const codeExamples = {
    auth: `// Autentificare cu API Key
const response = await fetch('https://api.documentiulia.ro/v1/invoices', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
});`,
    invoice: `// Creare factură
const invoice = await fetch('https://api.documentiulia.ro/v1/invoices', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    client_cui: 'RO12345678',
    items: [
      { description: 'Servicii consultanță', quantity: 1, price: 1000, vat_rate: 21 }
    ],
    currency: 'RON'
  })
});`,
    vat: `// Calcul TVA
const vat = await fetch('https://api.documentiulia.ro/v1/vat/calculate?amount=1000&rate=21', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
});

// Response: { "net": 1000, "vat": 210, "total": 1210, "rate": 21 }`,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Code className="w-10 h-10" />
            <h1 className="text-4xl font-bold">API Documentation</h1>
          </div>
          <p className="text-xl opacity-80 max-w-2xl">
            Integrează DocumentIulia în aplicațiile tale cu API-ul nostru RESTful
          </p>
          <div className="flex gap-4 mt-8">
            <a
              href="#quickstart"
              className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition"
            >
              Quick Start
            </a>
            <a
              href="#endpoints"
              className="border border-white/30 px-6 py-2 rounded-lg font-medium hover:bg-white/10 transition"
            >
              Endpoints
            </a>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto py-12 px-4">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <nav className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-4 sticky top-4">
              <h3 className="font-semibold mb-4">Conținut</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#quickstart" className="text-gray-600 hover:text-primary-600">Quick Start</a></li>
                <li><a href="#auth" className="text-gray-600 hover:text-primary-600">Autentificare</a></li>
                <li><a href="#endpoints" className="text-gray-600 hover:text-primary-600">Endpoints</a></li>
                <li><a href="#examples" className="text-gray-600 hover:text-primary-600">Exemple Cod</a></li>
                <li><a href="#errors" className="text-gray-600 hover:text-primary-600">Gestionare Erori</a></li>
                <li><a href="#limits" className="text-gray-600 hover:text-primary-600">Rate Limits</a></li>
              </ul>
            </div>
          </nav>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-12">
            {/* Quick Start */}
            <section id="quickstart">
              <h2 className="text-2xl font-bold mb-4">Quick Start</h2>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <ol className="space-y-4">
                  <li className="flex gap-4">
                    <span className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-semibold flex-shrink-0">1</span>
                    <div>
                      <h4 className="font-medium">Creează un cont</h4>
                      <p className="text-gray-600 text-sm">Înregistrează-te pe <Link href="/register" className="text-primary-600 hover:underline">documentiulia.ro</Link></p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-semibold flex-shrink-0">2</span>
                    <div>
                      <h4 className="font-medium">Generează API Key</h4>
                      <p className="text-gray-600 text-sm">Din Dashboard → Setări → API Keys</p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-semibold flex-shrink-0">3</span>
                    <div>
                      <h4 className="font-medium">Începe să integrezi</h4>
                      <p className="text-gray-600 text-sm">Folosește exemplele de mai jos pentru primul tău request</p>
                    </div>
                  </li>
                </ol>
              </div>
            </section>

            {/* Authentication */}
            <section id="auth">
              <h2 className="text-2xl font-bold mb-4">Autentificare</h2>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-start gap-3 mb-4">
                  <Key className="w-5 h-5 text-primary-600 mt-1" />
                  <div>
                    <h4 className="font-medium">Bearer Token</h4>
                    <p className="text-gray-600 text-sm">Toate request-urile trebuie să includă header-ul Authorization</p>
                  </div>
                </div>
                <div className="relative bg-gray-900 rounded-lg p-4">
                  <button
                    onClick={() => copyToClipboard(codeExamples.auth, 'auth')}
                    className="absolute top-2 right-2 p-2 hover:bg-gray-700 rounded"
                  >
                    {copiedCode === 'auth' ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                  </button>
                  <pre className="text-sm text-gray-300 overflow-x-auto"><code>{codeExamples.auth}</code></pre>
                </div>
              </div>
            </section>

            {/* Endpoints */}
            <section id="endpoints">
              <h2 className="text-2xl font-bold mb-4">Endpoints</h2>
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Method</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Endpoint</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Descriere</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {endpoints.map((endpoint, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className={`text-xs font-mono px-2 py-1 rounded ${
                            endpoint.method === 'GET' ? 'bg-green-100 text-green-700' :
                            endpoint.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {endpoint.method}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-sm">{endpoint.path}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{endpoint.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Code Examples */}
            <section id="examples">
              <h2 className="text-2xl font-bold mb-4">Exemple Cod</h2>
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h4 className="font-medium mb-3">Creare Factură</h4>
                  <div className="relative bg-gray-900 rounded-lg p-4">
                    <button
                      onClick={() => copyToClipboard(codeExamples.invoice, 'invoice')}
                      className="absolute top-2 right-2 p-2 hover:bg-gray-700 rounded"
                    >
                      {copiedCode === 'invoice' ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                    </button>
                    <pre className="text-sm text-gray-300 overflow-x-auto"><code>{codeExamples.invoice}</code></pre>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h4 className="font-medium mb-3">Calcul TVA</h4>
                  <div className="relative bg-gray-900 rounded-lg p-4">
                    <button
                      onClick={() => copyToClipboard(codeExamples.vat, 'vat')}
                      className="absolute top-2 right-2 p-2 hover:bg-gray-700 rounded"
                    >
                      {copiedCode === 'vat' ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                    </button>
                    <pre className="text-sm text-gray-300 overflow-x-auto"><code>{codeExamples.vat}</code></pre>
                  </div>
                </div>
              </div>
            </section>

            {/* Rate Limits */}
            <section id="limits">
              <h2 className="text-2xl font-bold mb-4">Rate Limits</h2>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 text-left text-sm font-medium text-gray-600">Plan</th>
                      <th className="py-2 text-left text-sm font-medium text-gray-600">Requests/min</th>
                      <th className="py-2 text-left text-sm font-medium text-gray-600">Requests/zi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="py-2">Gratuit</td>
                      <td className="py-2">10</td>
                      <td className="py-2">100</td>
                    </tr>
                    <tr>
                      <td className="py-2">Pro</td>
                      <td className="py-2">60</td>
                      <td className="py-2">5,000</td>
                    </tr>
                    <tr>
                      <td className="py-2">Business</td>
                      <td className="py-2">300</td>
                      <td className="py-2">50,000</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
