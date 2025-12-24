'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import {
  FileText,
  Download,
  Upload,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Loader2,
  Eye,
  History,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  RefreshCw,
  Building2,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Calculator,
} from 'lucide-react';

interface D394Transaction {
  tip: string;
  cuiPartener: string;
  denumirePartener: string;
  tara: string;
  bazaImpozabila: number;
  tvaColectata: number;
  tvaDeductibila: number;
  numarDocumente: number;
}

interface D394Totals {
  totalBazaLivrari: number;
  totalTVAColectata: number;
  totalBazaAchizitii: number;
  totalTVADeductibila: number;
  diferentaTVA: number;
  numarTranzactii: number;
}

export default function D394Page() {
  const t = useTranslations('finance');
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<D394Transaction[]>([]);
  const [totals, setTotals] = useState<D394Totals | null>(null);
  const [validation, setValidation] = useState<{ valid: boolean; errors: string[] } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatedXml, setGeneratedXml] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const now = new Date();
  const [period, setPeriod] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

  const [companyData, setCompanyData] = useState({
    cui: '',
    denumire: '',
    judet: 'Bucuresti',
    localitate: 'Bucuresti',
    strada: '',
    numar: '',
  });

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [transactionsRes, historyRes] = await Promise.all([
        fetch(`/api/v1/compliance/d394/transactions?period=${period}`, { headers }),
        fetch('/api/v1/compliance/d394/history', { headers }),
      ]);

      if (transactionsRes.ok) {
        const data = await transactionsRes.json();
        setTransactions(data.transactions || []);
        setTotals(data.totals || null);
      }

      if (historyRes.ok) {
        const data = await historyRes.json();
        setHistory(data.submissions || []);
      }
    } catch (err) {
      console.error('Error fetching D394 data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/v1/compliance/d394/validate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ period }),
      });

      if (response.ok) {
        const data = await response.json();
        setValidation({ valid: data.valid, errors: data.errors });
      }
    } catch (err) {
      console.error('Validation error:', err);
    }
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/v1/compliance/d394/generate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ period, companyData }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setGeneratedXml(data.xml);
        } else {
          setValidation({ valid: false, errors: data.errors });
        }
      }
    } catch (err) {
      console.error('Generation error:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!generatedXml || !totals) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/v1/compliance/d394/submit', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          period,
          xmlContent: generatedXml,
          totals,
        }),
      });

      if (response.ok) {
        await fetchData();
        setGeneratedXml(null);
        toast.compliance('D394 ANAF', 'Declarația D394 a fost trimisă cu succes către ANAF!');
      }
    } catch (err) {
      console.error('Submit error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = () => {
    if (!generatedXml) return;

    const blob = new Blob([generatedXml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `d394_${period}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const changePeriod = (delta: number) => {
    const [year, month] = period.split('-').map(Number);
    let newMonth = month + delta;
    let newYear = year;

    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }

    setPeriod(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  const getTransactionTypeBadge = (tip: string) => {
    const colors: Record<string, string> = {
      L: 'bg-green-100 text-green-800',
      A: 'bg-blue-100 text-blue-800',
      AI: 'bg-purple-100 text-purple-800',
      AC: 'bg-indigo-100 text-indigo-800',
      V: 'bg-orange-100 text-orange-800',
      C: 'bg-yellow-100 text-yellow-800',
      N: 'bg-gray-100 text-gray-800',
    };
    const labels: Record<string, string> = {
      L: 'Livrare',
      A: 'Achizitie',
      AI: 'Achizitie Intracom',
      AC: 'Achizitie Constructii',
      V: 'Vanzare',
      C: 'Cumparare',
      N: 'Neutru',
    };
    return {
      color: colors[tip] || 'bg-gray-100 text-gray-800',
      label: labels[tip] || tip,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Declaratia D394</h1>
          <p className="text-gray-600">Declaratie informativa privind livrarile/prestarile si achizitiile</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <History className="w-4 h-4" />
            Istoric
          </button>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizeaza
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => changePeriod(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <span className="text-lg font-semibold">{period}</span>
          </div>
          <button onClick={() => changePeriod(1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* VAT Summary */}
      {totals && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Rezumat TVA
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Livrari */}
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">Livrari / Vanzari</span>
              </div>
              <p className="text-2xl font-bold text-green-900">{totals.totalBazaLivrari.toLocaleString('ro-RO')} RON</p>
              <p className="text-sm text-green-700 mt-1">TVA Colectata: {totals.totalTVAColectata.toLocaleString('ro-RO')} RON</p>
            </div>

            {/* Achizitii */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-800">Achizitii</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{totals.totalBazaAchizitii.toLocaleString('ro-RO')} RON</p>
              <p className="text-sm text-blue-700 mt-1">TVA Deductibila: {totals.totalTVADeductibila.toLocaleString('ro-RO')} RON</p>
            </div>

            {/* Diferenta TVA */}
            <div className={`p-4 rounded-lg ${totals.diferentaTVA > 0 ? 'bg-red-50' : 'bg-purple-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight className={`w-5 h-5 ${totals.diferentaTVA > 0 ? 'text-red-600' : 'text-purple-600'}`} />
                <span className={`font-medium ${totals.diferentaTVA > 0 ? 'text-red-800' : 'text-purple-800'}`}>
                  {totals.diferentaTVA > 0 ? 'TVA de Plata' : 'TVA de Recuperat'}
                </span>
              </div>
              <p className={`text-2xl font-bold ${totals.diferentaTVA > 0 ? 'text-red-900' : 'text-purple-900'}`}>
                {Math.abs(totals.diferentaTVA).toLocaleString('ro-RO')} RON
              </p>
              <p className={`text-sm mt-1 ${totals.diferentaTVA > 0 ? 'text-red-700' : 'text-purple-700'}`}>
                {totals.numarTranzactii} tranzactii in perioada
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Company Data */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Date Angajator
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CUI</label>
            <input
              type="text"
              value={companyData.cui}
              onChange={(e) => setCompanyData({ ...companyData, cui: e.target.value })}
              placeholder="RO12345678"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Denumire</label>
            <input
              type="text"
              value={companyData.denumire}
              onChange={(e) => setCompanyData({ ...companyData, denumire: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Judet</label>
            <input
              type="text"
              value={companyData.judet}
              onChange={(e) => setCompanyData({ ...companyData, judet: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Validation */}
      {validation && (
        <div className={`p-4 rounded-lg ${validation.valid ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex items-center gap-2 mb-2">
            {validation.valid ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600" />
            )}
            <span className={validation.valid ? 'text-green-800' : 'text-red-800'}>
              {validation.valid ? 'Datele sunt valide' : 'Erori de validare'}
            </span>
          </div>
          {!validation.valid && (
            <ul className="list-disc list-inside text-sm text-red-700">
              {validation.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleValidate}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
        >
          <CheckCircle className="w-4 h-4" />
          Valideaza
        </button>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          Genereaza XML
        </button>
        {generatedXml && (
          <>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50"
            >
              <Download className="w-4 h-4" />
              Descarca XML
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Trimite la ANAF
            </button>
          </>
        )}
      </div>

      {/* Generated XML Preview */}
      {generatedXml && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Previzualizare XML
          </h3>
          <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-auto max-h-64">
            {generatedXml}
          </pre>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Tranzactii ({transactions.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tip</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partener</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CUI</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Baza Impoz.</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">TVA</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Nr. Doc.</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Nu exista tranzactii pentru aceasta perioada
                  </td>
                </tr>
              ) : (
                transactions.map((tr, index) => {
                  const badge = getTransactionTypeBadge(tr.tip);
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{tr.denumirePartener}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{tr.cuiPartener}</td>
                      <td className="px-4 py-3 text-sm text-right">{tr.bazaImpozabila.toLocaleString('ro-RO')} RON</td>
                      <td className="px-4 py-3 text-sm text-right">
                        {(tr.tvaColectata || tr.tvaDeductibila).toLocaleString('ro-RO')} RON
                      </td>
                      <td className="px-4 py-3 text-sm text-right">{tr.numarDocumente}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* History */}
      {showHistory && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Istoric Depuneri D394</h3>
          <div className="space-y-3">
            {history.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nicio depunere anterioara</p>
            ) : (
              history.map((sub, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{sub.period}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(sub.submittedAt).toLocaleDateString('ro-RO')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      TVA: {sub.totals?.diferentaTVA > 0 ? '+' : ''}{sub.totals?.diferentaTVA?.toLocaleString('ro-RO') || 0} RON
                    </p>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      sub.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                      sub.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {sub.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
