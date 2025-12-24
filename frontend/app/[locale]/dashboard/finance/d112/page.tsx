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
  DollarSign,
  Users,
  Calculator,
  RefreshCw,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface D112Employee {
  cnp: string;
  nume: string;
  prenume: string;
  salariuBrut: number;
  salariuNet: number;
  cas: number;
  cass: number;
  impozit: number;
  camFSSF: number;
  zileLucrate: number;
  oreLucrate: number;
}

interface D112Totals {
  totalSalariuBrut: number;
  totalSalariuNet: number;
  totalCAS: number;
  totalCASS: number;
  totalImpozit: number;
  totalCAM: number;
  numarAngajati: number;
}

// Mock data for demo mode
const getMockD112Data = (period: string) => {
  const mockEmployees: D112Employee[] = [
    { cnp: '1850312345678', nume: 'Popescu', prenume: 'Ion', salariuBrut: 8500, salariuNet: 5355, cas: 2125, cass: 850, impozit: 362, camFSSF: 191, zileLucrate: 22, oreLucrate: 176 },
    { cnp: '2900515234567', nume: 'Ionescu', prenume: 'Maria', salariuBrut: 6500, salariuNet: 4095, cas: 1625, cass: 650, impozit: 277, camFSSF: 146, zileLucrate: 22, oreLucrate: 176 },
    { cnp: '1880721345612', nume: 'Georgescu', prenume: 'Andrei', salariuBrut: 12000, salariuNet: 7560, cas: 3000, cass: 1200, impozit: 510, camFSSF: 270, zileLucrate: 22, oreLucrate: 176 },
    { cnp: '2910825123456', nume: 'Constantinescu', prenume: 'Elena', salariuBrut: 9500, salariuNet: 5985, cas: 2375, cass: 950, impozit: 404, camFSSF: 214, zileLucrate: 22, oreLucrate: 176 },
    { cnp: '1870430234561', nume: 'Dumitrescu', prenume: 'Alexandru', salariuBrut: 7500, salariuNet: 4725, cas: 1875, cass: 750, impozit: 319, camFSSF: 169, zileLucrate: 22, oreLucrate: 176 },
  ];

  const totals: D112Totals = {
    totalSalariuBrut: mockEmployees.reduce((acc, e) => acc + e.salariuBrut, 0),
    totalSalariuNet: mockEmployees.reduce((acc, e) => acc + e.salariuNet, 0),
    totalCAS: mockEmployees.reduce((acc, e) => acc + e.cas, 0),
    totalCASS: mockEmployees.reduce((acc, e) => acc + e.cass, 0),
    totalImpozit: mockEmployees.reduce((acc, e) => acc + e.impozit, 0),
    totalCAM: mockEmployees.reduce((acc, e) => acc + e.camFSSF, 0),
    numarAngajati: mockEmployees.length,
  };

  return { employees: mockEmployees, totals };
};

// Calculate D112 deadline (25th of the following month)
const getD112Deadline = (period: string): { date: Date; daysRemaining: number; isOverdue: boolean } => {
  const [year, month] = period.split('-').map(Number);
  const deadlineDate = new Date(year, month, 25); // 25th of next month
  const today = new Date();
  const diffTime = deadlineDate.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return {
    date: deadlineDate,
    daysRemaining,
    isOverdue: daysRemaining < 0,
  };
};

export default function D112Page() {
  const t = useTranslations('finance');
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<D112Employee[]>([]);
  const [totals, setTotals] = useState<D112Totals | null>(null);
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
    caen: '6201',
  });

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [employeesRes, historyRes] = await Promise.all([
        fetch(`/api/v1/compliance/d112/employees?period=${period}`, { headers }),
        fetch('/api/v1/compliance/d112/history', { headers }),
      ]);

      if (employeesRes.ok) {
        const data = await employeesRes.json();
        setEmployees(data.employees || []);
        setTotals(data.totals || null);
      } else {
        // Fallback to mock data for demo
        console.log('Using mock D112 data for demo');
        const mockData = getMockD112Data(period);
        setEmployees(mockData.employees);
        setTotals(mockData.totals);
      }

      if (historyRes.ok) {
        const data = await historyRes.json();
        setHistory(data.submissions || []);
      }
    } catch (err) {
      console.error('Error fetching D112 data:', err);
      // Fallback to mock data on error
      const mockData = getMockD112Data(period);
      setEmployees(mockData.employees);
      setTotals(mockData.totals);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/v1/compliance/d112/validate', {
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
      const response = await fetch('/api/v1/compliance/d112/generate', {
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
      const response = await fetch('/api/v1/compliance/d112/submit', {
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
        toast.compliance('D112 ANAF', 'Declarația D112 a fost trimisă cu succes către ANAF!');
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
    a.download = `d112_${period}.xml`;
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

  const getPeriodSubmitted = () => {
    return history.some(h => h.period === period);
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
          <h1 className="text-2xl font-bold text-gray-900">Declaratia D112</h1>
          <p className="text-gray-600">Declaratie privind obligatiile de plata a contributiilor sociale</p>
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
            {getPeriodSubmitted() && (
              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Depus</span>
            )}
          </div>
          <button onClick={() => changePeriod(1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Deadline Banner */}
      {(() => {
        const deadline = getD112Deadline(period);
        return (
          <div className={`rounded-lg p-4 border-l-4 ${
            deadline.isOverdue
              ? 'bg-red-50 border-red-500'
              : deadline.daysRemaining <= 5
              ? 'bg-yellow-50 border-yellow-500'
              : 'bg-green-50 border-green-500'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {deadline.isOverdue ? (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                ) : deadline.daysRemaining <= 5 ? (
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
                <div>
                  <p className={`font-medium ${
                    deadline.isOverdue ? 'text-red-800' : deadline.daysRemaining <= 5 ? 'text-yellow-800' : 'text-green-800'
                  }`}>
                    {deadline.isOverdue
                      ? `Termen depășit cu ${Math.abs(deadline.daysRemaining)} zile!`
                      : deadline.daysRemaining === 0
                      ? 'Astăzi este termenul limită!'
                      : `${deadline.daysRemaining} zile până la termen`
                    }
                  </p>
                  <p className={`text-sm ${
                    deadline.isOverdue ? 'text-red-600' : deadline.daysRemaining <= 5 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    Termen D112: {deadline.date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Contribuții sociale</p>
                <p className="text-xs text-gray-500">Depunere lunară ANAF</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Summary Cards */}
      {totals && (
        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Angajati</p>
                <p className="text-xl font-bold">{totals.numarAngajati}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Brut</p>
                <p className="text-xl font-bold">{totals.totalSalariuBrut.toLocaleString('ro-RO')} RON</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calculator className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Contributii</p>
                <p className="text-xl font-bold">
                  {(totals.totalCAS + totals.totalCASS + totals.totalImpozit + totals.totalCAM).toLocaleString('ro-RO')} RON
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Net</p>
                <p className="text-xl font-bold">{totals.totalSalariuNet.toLocaleString('ro-RO')} RON</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contributions Breakdown */}
      {totals && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Defalcare Contributii</h3>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">CAS (25%)</p>
              <p className="text-lg font-bold">{totals.totalCAS.toLocaleString('ro-RO')} RON</p>
              <p className="text-xs text-gray-400">Contributie asigurari sociale</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">CASS (10%)</p>
              <p className="text-lg font-bold">{totals.totalCASS.toLocaleString('ro-RO')} RON</p>
              <p className="text-xs text-gray-400">Contributie asigurari sanatate</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Impozit (10%)</p>
              <p className="text-lg font-bold">{totals.totalImpozit.toLocaleString('ro-RO')} RON</p>
              <p className="text-xs text-gray-400">Impozit pe venit</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">CAM (2.25%)</p>
              <p className="text-lg font-bold">{totals.totalCAM.toLocaleString('ro-RO')} RON</p>
              <p className="text-xs text-gray-400">Contributie asiguratorie munca</p>
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
        <div className="grid md:grid-cols-4 gap-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">CAEN</label>
            <input
              type="text"
              value={companyData.caen}
              onChange={(e) => setCompanyData({ ...companyData, caen: e.target.value })}
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

      {/* Employees Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-900">Detalii Angajati</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nume</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CNP</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Brut</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">CAS</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">CASS</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Impozit</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {employees.map((emp, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{emp.nume} {emp.prenume}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{emp.cnp || '-'}</td>
                  <td className="px-4 py-3 text-sm text-right">{emp.salariuBrut.toLocaleString('ro-RO')}</td>
                  <td className="px-4 py-3 text-sm text-right">{emp.cas.toLocaleString('ro-RO')}</td>
                  <td className="px-4 py-3 text-sm text-right">{emp.cass.toLocaleString('ro-RO')}</td>
                  <td className="px-4 py-3 text-sm text-right">{emp.impozit.toLocaleString('ro-RO')}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{emp.salariuNet.toLocaleString('ro-RO')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* History */}
      {showHistory && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Istoric Depuneri D112</h3>
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
                      {sub.totals?.totalSalariuBrut?.toLocaleString('ro-RO') || 0} RON
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
