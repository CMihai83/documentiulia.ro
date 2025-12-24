'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import {
  Users,
  FileText,
  Download,
  Upload,
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Building2,
  Calendar,
  Loader2,
  Eye,
  History,
} from 'lucide-react';

interface RevisalEmployee {
  cnp: string;
  nume: string;
  prenume: string;
  dataAngajare: string;
  dataIncetare?: string;
  tipContract: string;
  functie: string;
  corFunctie: string;
  normaTimpLucru: number;
  salariuBrut: number;
  tipOperatiune: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

interface RevisalStatus {
  totalEmployees: number;
  pendingChanges: number;
  lastSubmission: {
    date: string;
    employeeCount: number;
    status: string;
  } | null;
  needsSubmission: boolean;
  nextDeadline: string;
}

export default function RevisalPage() {
  const t = useTranslations('compliance');
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<RevisalEmployee[]>([]);
  const [status, setStatus] = useState<RevisalStatus | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatedXml, setGeneratedXml] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
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
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const headers = { Authorization: `Bearer ${token}` };

      const [employeesRes, statusRes, historyRes] = await Promise.all([
        fetch('/api/v1/compliance/revisal/employees', { headers }),
        fetch('/api/v1/compliance/revisal/status', { headers }),
        fetch('/api/v1/compliance/revisal/history', { headers }),
      ]);

      if (employeesRes.ok) {
        const data = await employeesRes.json();
        setEmployees(data.employees || []);
      }

      if (statusRes.ok) {
        const data = await statusRes.json();
        setStatus(data);
      }

      if (historyRes.ok) {
        const data = await historyRes.json();
        setHistory(data.submissions || []);
      }
    } catch (err) {
      console.error('Error fetching REVISAL data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/v1/compliance/revisal/validate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
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
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/v1/compliance/revisal/generate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyData }),
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
    if (!generatedXml) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/v1/compliance/revisal/submit', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          xmlContent: generatedXml,
          employeeCount: employees.length,
        }),
      });

      if (response.ok) {
        await fetchData();
        setGeneratedXml(null);
        toast.success('REVISAL trimis', 'REVISAL trimis cu succes către ITM!');
      } else {
        toast.error('Eroare', 'Eroare la trimiterea REVISAL.');
      }
    } catch (err) {
      console.error('Submit error:', err);
      toast.error('Eroare', 'Eroare la trimiterea REVISAL.');
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
    a.download = `revisal_${new Date().toISOString().split('T')[0]}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getOperationBadge = (op: string) => {
    const colors: Record<string, string> = {
      ANGAJARE: 'bg-green-100 text-green-800',
      MODIFICARE: 'bg-blue-100 text-blue-800',
      INCETARE: 'bg-red-100 text-red-800',
      SUSPENDARE: 'bg-yellow-100 text-yellow-800',
    };
    return colors[op] || 'bg-gray-100 text-gray-800';
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
          <h1 className="text-2xl font-bold text-gray-900">REVISAL</h1>
          <p className="text-gray-600">Registrul General de Evidenta a Salariatilor - ITM</p>
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

      {/* Status Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Angajati</p>
              <p className="text-xl font-bold">{status?.totalEmployees || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${status?.pendingChanges ? 'bg-yellow-100' : 'bg-green-100'}`}>
              <AlertTriangle className={`w-5 h-5 ${status?.pendingChanges ? 'text-yellow-600' : 'text-green-600'}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Modificari in Asteptare</p>
              <p className="text-xl font-bold">{status?.pendingChanges || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Ultima Depunere</p>
              <p className="text-sm font-medium">
                {status?.lastSubmission?.date
                  ? new Date(status.lastSubmission.date).toLocaleDateString('ro-RO')
                  : 'Niciodata'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${status?.needsSubmission ? 'bg-red-100' : 'bg-green-100'}`}>
              {status?.needsSubmission ? (
                <Clock className="w-5 h-5 text-red-600" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-600" />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="text-sm font-medium">
                {status?.needsSubmission ? 'Necesita depunere' : 'La zi'}
              </p>
            </div>
          </div>
        </div>
      </div>

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
              placeholder="Numele firmei"
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Localitate</label>
            <input
              type="text"
              value={companyData.localitate}
              onChange={(e) => setCompanyData({ ...companyData, localitate: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Strada</label>
            <input
              type="text"
              value={companyData.strada}
              onChange={(e) => setCompanyData({ ...companyData, strada: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Numar</label>
            <input
              type="text"
              value={companyData.numar}
              onChange={(e) => setCompanyData({ ...companyData, numar: e.target.value })}
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
              Trimite la ITM
            </button>
          </>
        )}
      </div>

      {/* Generated XML Preview */}
      {generatedXml && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Previzualizare XML
            </h3>
          </div>
          <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-auto max-h-64">
            {generatedXml}
          </pre>
        </div>
      )}

      {/* Employees Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-900">Angajati ({employees.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nume</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CNP</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Functie</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">COR</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data Angajare</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salariu</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operatiune</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {employees.map((emp, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{emp.nume} {emp.prenume}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{emp.cnp || '-'}</td>
                  <td className="px-4 py-3 text-sm">{emp.functie}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{emp.corFunctie}</td>
                  <td className="px-4 py-3 text-sm">{emp.dataAngajare}</td>
                  <td className="px-4 py-3 text-sm">{emp.salariuBrut.toLocaleString('ro-RO')} RON</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${getOperationBadge(emp.tipOperatiune)}`}>
                      {emp.tipOperatiune}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Istoric Depuneri</h3>
          <div className="space-y-3">
            {history.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nicio depunere anterioara</p>
            ) : (
              history.map((sub, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{sub.fileName}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(sub.submittedAt).toLocaleDateString('ro-RO')} - {sub.employeeCount} angajati
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    sub.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                    sub.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {sub.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
