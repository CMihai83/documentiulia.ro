'use client';

import { useTranslations } from 'next-intl';
import { useUser } from '@clerk/nextjs';
import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { Upload, FileText, TrendingUp, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { VATCalculator } from '@/components/dashboard/VATCalculator';
import { AIAssistant } from '@/components/dashboard/AIAssistant';

const cashFlowData = [
  { month: 'Ian', income: 45000, expenses: 32000 },
  { month: 'Feb', income: 52000, expenses: 35000 },
  { month: 'Mar', income: 48000, expenses: 30000 },
  { month: 'Apr', income: 61000, expenses: 42000 },
  { month: 'Mai', income: 55000, expenses: 38000 },
  { month: 'Iun', income: 67000, expenses: 45000 },
];

const vatData = [
  { name: 'TVA Colectat', value: 12600, color: '#3b82f6' },
  { name: 'TVA Deductibil', value: 8400, color: '#22c55e' },
  { name: 'TVA de Plată', value: 4200, color: '#f59e0b' },
];

const complianceStatus = [
  { name: 'SAF-T D406', status: 'ok', date: '2025-01-15' },
  { name: 'e-Factura SPV', status: 'ok', date: '2025-01-10' },
  { name: 'Declarație TVA', status: 'pending', date: '2025-01-25' },
];

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const { user } = useUser();
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] },
    onDrop: (files) => setUploadedFiles((prev) => [...prev, ...files]),
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t('welcome')}, {user?.firstName || 'User'}!</h1>
        <p className="text-gray-600">{t('overview')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Cash Flow Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-600" />
            {t('cashFlow')}
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `${value.toLocaleString()} RON`} />
              <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} name="Venituri" />
              <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Cheltuieli" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* VAT Summary */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-semibold mb-4">{t('vatSummary')}</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={vatData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                {vatData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value.toLocaleString()} RON`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-4">
            {vatData.map((item) => (
              <div key={item.name} className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="font-semibold">{item.value.toLocaleString()} RON</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Document Upload */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary-600" />
            {t('uploadDoc')}
          </h2>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
              isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'
            }`}
          >
            <input {...getInputProps()} />
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">{t('dragDrop')}</p>
            <p className="text-sm text-gray-400 mt-2">PDF, PNG, JPG (max 10MB)</p>
          </div>
          {uploadedFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              {uploadedFiles.map((file, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <FileText className="w-4 h-4 text-primary-600" />
                  <span className="text-sm">{file.name}</span>
                  <span className="text-xs text-gray-400 ml-auto">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Compliance Status */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary-600" />
            {t('compliance')}
          </h2>
          <div className="space-y-4">
            {complianceStatus.map((item) => (
              <div key={item.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {item.status === 'ok' ? (
                    <CheckCircle className="w-5 h-5 text-success" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-warning" />
                  )}
                  <span className="font-medium">{item.name}</span>
                </div>
                <span className="text-sm text-gray-500">{item.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <VATCalculator />
        <AIAssistant />
      </div>
    </div>
  );
}
