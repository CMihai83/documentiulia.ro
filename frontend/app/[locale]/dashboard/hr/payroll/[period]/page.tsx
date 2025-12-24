'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import {
  ArrowLeft,
  Download,
  Send,
  Calculator,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  FileText,
  Printer,
  RefreshCw,
} from 'lucide-react';

interface PayrollEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  grossSalary: number;
  netSalary: number;
  taxes: number;
  contributions: number;
  cas: number;
  cass: number;
  incomeTax: number;
  status: 'PENDING' | 'APPROVED' | 'PAID';
  paidAt: string | null;
}

interface PayrollSummary {
  period: string;
  totalGross: number;
  totalNet: number;
  totalTaxes: number;
  totalContributions: number;
  employeeCount: number;
  pendingCount: number;
  approvedCount: number;
  paidCount: number;
}

export default function PayrollDetailPage() {
  const t = useTranslations('hr');
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const period = params.period as string;

  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [generatingD112, setGeneratingD112] = useState(false);

  useEffect(() => {
    fetchPayroll();
  }, [period]);

  const fetchPayroll = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const headers = { Authorization: `Bearer ${token}` };

      const [entriesRes, summaryRes] = await Promise.all([
        fetch(`/api/v1/hr/payroll?period=${period}`, { headers }),
        fetch(`/api/v1/hr/payroll/summary?period=${period}`, { headers }),
      ]);

      if (!entriesRes.ok) throw new Error('Failed to fetch payroll');

      setEntries(await entriesRes.json());
      if (summaryRes.ok) setSummary(await summaryRes.json());
    } catch (err) {
      setError('Eroare la incarcarea datelor salariale');
    } finally {
      setLoading(false);
    }
  };

  const calculatePayroll = async () => {
    setCalculating(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/v1/hr/payroll/calculate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ period }),
      });

      if (response.ok) {
        toast.success('Calcul finalizat', 'Salariile au fost calculate cu succes.');
        await fetchPayroll();
      } else {
        toast.error('Eroare', 'Eroare la calcularea salariilor');
      }
    } catch (err) {
      toast.error('Eroare conexiune', 'Nu s-a putut conecta la server.');
    } finally {
      setCalculating(false);
    }
  };

  const generateD112 = async () => {
    setGeneratingD112(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/v1/hr/payroll/d112?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `D112_${period}.xml`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success('D112 generat', `Declarația D112 pentru ${period} a fost descărcată.`);
      } else {
        toast.error('Eroare', 'Eroare la generarea D112');
      }
    } catch (err) {
      toast.error('Eroare conexiune', 'Nu s-a putut conecta la server.');
    } finally {
      setGeneratingD112(false);
    }
  };

  const approveAll = async () => {
    // Navigate to approval confirmation page
    router.push(`/dashboard/hr/payroll/${period}/approve`);
  };

  const approveAllConfirmed = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/v1/hr/payroll/approve-all`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ period }),
      });

      if (response.ok) {
        toast.success('Aprobare completă', 'Toate calculele salariale au fost aprobate.');
        await fetchPayroll();
      } else {
        toast.error('Eroare', 'Eroare la aprobarea salariilor');
      }
    } catch (err) {
      toast.error('Eroare conexiune', 'Nu s-a putut conecta la server.');
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
    }).format(amount);
  };

  const formatPeriod = (periodStr: string) => {
    const [year, month] = periodStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('ro-RO', { year: 'numeric', month: 'long' });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PAID':
        return { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Platit' };
      case 'APPROVED':
        return { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, label: 'Aprobat' };
      default:
        return { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'In asteptare' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-500">{error}</p>
        <Link href="/dashboard/hr" className="text-primary-600 hover:underline mt-4 inline-block">
          Inapoi la HR
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/hr"
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Salarizare {formatPeriod(period)}
            </h1>
            <p className="text-gray-600">Calculul salariilor pentru luna selectata</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchPayroll}
            className="p-2 border rounded-lg hover:bg-gray-50 transition"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={calculatePayroll}
            disabled={calculating}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            {calculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
            Recalculeaza
          </button>
          <button
            onClick={generateD112}
            disabled={generatingD112}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            {generatingD112 ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Genereaza D112
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500">Angajati</p>
                <p className="text-2xl font-bold">{summary.employeeCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-gray-500">Total Brut</p>
                <p className="text-xl font-bold">{formatAmount(summary.totalGross)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500">Total Net</p>
                <p className="text-xl font-bold text-green-600">{formatAmount(summary.totalNet)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-sm text-gray-500">Contributii</p>
                <p className="text-xl font-bold text-red-600">{formatAmount(summary.totalContributions)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-sm text-gray-500">Impozite</p>
                <p className="text-xl font-bold text-amber-600">{formatAmount(summary.totalTaxes)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Summary */}
      {summary && (
        <div className="bg-blue-50 rounded-xl p-4 flex items-center justify-between">
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
              <span className="text-sm">In asteptare: {summary.pendingCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-400"></span>
              <span className="text-sm">Aprobate: {summary.approvedCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-400"></span>
              <span className="text-sm">Platite: {summary.paidCount}</span>
            </div>
          </div>
          {summary.pendingCount > 0 && (
            <button
              onClick={approveAll}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Aproba toate
            </button>
          )}
        </div>
      )}

      {/* Payroll Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Detalii Salarizare</h3>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" />
              Export Excel
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Nu exista calcule salariale pentru aceasta perioada</p>
            <button
              onClick={calculatePayroll}
              disabled={calculating}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Calculeaza acum
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Angajat</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Brut</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">CAS 25%</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">CASS 10%</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Impozit 10%</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {entries.map((entry) => {
                  const statusConfig = getStatusConfig(entry.status);
                  const StatusIcon = statusConfig.icon;
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/dashboard/hr/employees/${entry.employeeId}`}
                          className="font-medium text-gray-900 hover:text-primary-600"
                        >
                          {entry.employeeName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {formatAmount(entry.grossSalary)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-600">
                        -{formatAmount(entry.cas)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-600">
                        -{formatAmount(entry.cass)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-amber-600">
                        -{formatAmount(entry.incomeTax)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">
                        {formatAmount(entry.netSalary)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${statusConfig.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button className="text-blue-600 hover:text-blue-800 text-sm">
                          Fluturaf
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 font-medium">
                <tr>
                  <td className="px-6 py-4">TOTAL</td>
                  <td className="px-6 py-4 text-right">{formatAmount(entries.reduce((s, e) => s + e.grossSalary, 0))}</td>
                  <td className="px-6 py-4 text-right text-red-600">{formatAmount(entries.reduce((s, e) => s + e.cas, 0))}</td>
                  <td className="px-6 py-4 text-right text-red-600">{formatAmount(entries.reduce((s, e) => s + e.cass, 0))}</td>
                  <td className="px-6 py-4 text-right text-amber-600">{formatAmount(entries.reduce((s, e) => s + e.incomeTax, 0))}</td>
                  <td className="px-6 py-4 text-right text-green-600">{formatAmount(entries.reduce((s, e) => s + e.netSalary, 0))}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Tax Info */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
        <div className="flex">
          <div className="flex-shrink-0">
            <Calculator className="h-5 w-5 text-blue-500" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Informatii Contributii 2025
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>CAS</strong> - 25% din venitul brut (pensii)</li>
                <li><strong>CASS</strong> - 10% din venitul brut (sanatate)</li>
                <li><strong>Impozit pe venit</strong> - 10% din baza de calcul</li>
                <li><strong>Salariu minim brut</strong> - 3.700 RON</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
