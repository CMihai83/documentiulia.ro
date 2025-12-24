'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DataExportRequest } from '@/components/gdpr/DataExportRequest';
import { DataDeletionRequest } from '@/components/gdpr/DataDeletionRequest';
import { ConsentManager } from '@/components/gdpr/ConsentManager';
import { PrivacyDashboard } from '@/components/gdpr/PrivacyDashboard';
import { Shield, Download, Trash2, Settings, Database, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PrivacySettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'consents' | 'export' | 'delete'>('overview');

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Please Sign In</h2>
          <p className="text-gray-600 mb-4">You need to be signed in to access privacy settings</p>
          <Link
            href="/login"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Privacy Overview', icon: Database },
    { id: 'consents', label: 'Consent Management', icon: Settings },
    { id: 'export', label: 'Export Data', icon: Download },
    { id: 'delete', label: 'Delete Account', icon: Trash2 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Privacy & Data Protection</h1>
              <p className="text-gray-600 mt-1">
                Manage your data, privacy preferences, and GDPR rights
              </p>
            </div>
          </div>
        </div>

        {/* GDPR Compliance Banner */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-sm text-blue-800">
              <p className="font-semibold mb-1">GDPR Compliant</p>
              <p>
                DocumentIulia.ro is fully compliant with the General Data Protection Regulation (GDPR).
                Your data is processed lawfully, transparently, and securely. You have full control over
                your personal information at all times.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className="flex flex-wrap gap-2 p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div>
              <PrivacyDashboard userId={user.id} />

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <Database className="w-8 h-8 text-blue-600 mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">Data Protection</h3>
                  <p className="text-sm text-gray-600">
                    Your data is encrypted at rest and in transit using industry-standard protocols.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <Shield className="w-8 h-8 text-green-600 mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">Legal Compliance</h3>
                  <p className="text-sm text-gray-600">
                    We comply with GDPR, Romanian Law 190/2018, and all applicable data protection regulations.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <Settings className="w-8 h-8 text-purple-600 mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">Your Control</h3>
                  <p className="text-sm text-gray-600">
                    You have complete control over your data with rights to access, export, and delete.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'consents' && (
            <ConsentManager userId={user.id} />
          )}

          {activeTab === 'export' && (
            <div className="space-y-6">
              <DataExportRequest
                userId={user.id}
                onSuccess={() => {
                  // Optionally refresh data or show notification
                }}
              />

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">What's Included in Your Export?</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Personal Information</h4>
                    <ul className="list-disc list-inside text-gray-600 space-y-1">
                      <li>Account details (name, email, company)</li>
                      <li>Contact information</li>
                      <li>Tax identification numbers</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Financial Data</h4>
                    <ul className="list-disc list-inside text-gray-600 space-y-1">
                      <li>All invoices and transactions</li>
                      <li>VAT and SAF-T reports</li>
                      <li>Payment history</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">HR Data</h4>
                    <ul className="list-disc list-inside text-gray-600 space-y-1">
                      <li>Employee records</li>
                      <li>Payroll information</li>
                      <li>Contracts and documents</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Activity Logs</h4>
                    <ul className="list-disc list-inside text-gray-600 space-y-1">
                      <li>Login history</li>
                      <li>Document uploads</li>
                      <li>AI query history</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'delete' && (
            <div className="space-y-6">
              <DataDeletionRequest
                userId={user.id}
                userEmail={user.email || ''}
                onSuccess={() => {
                  // Optionally redirect or show confirmation
                }}
              />

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Retention Policy</h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <p>
                    While we will delete your account and most personal data upon request, some information
                    must be retained for legal compliance:
                  </p>
                  <ul className="list-disc list-inside space-y-2">
                    <li>
                      <strong>Tax records:</strong> 10 years (Romanian fiscal law requirement)
                    </li>
                    <li>
                      <strong>Employee payroll data:</strong> Employment + 50 years (Romanian labor law)
                    </li>
                    <li>
                      <strong>Financial transactions:</strong> 10 years (anti-money laundering regulations)
                    </li>
                    <li>
                      <strong>Contracts and legal documents:</strong> According to limitation periods
                    </li>
                  </ul>
                  <p className="mt-4 text-xs text-gray-500">
                    These retention periods are mandated by Romanian and EU law and are necessary for legal
                    compliance. Data retained for legal purposes is stored securely and access is strictly
                    limited.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Alternatives to Deletion</h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <p>Before deleting your account, consider these alternatives:</p>
                  <ul className="list-disc list-inside space-y-2">
                    <li>
                      <strong>Pause your subscription:</strong> Keep your data but stop billing
                    </li>
                    <li>
                      <strong>Export your data:</strong> Download a copy for your records
                    </li>
                    <li>
                      <strong>Revoke consents:</strong> Limit how we use your data without deletion
                    </li>
                    <li>
                      <strong>Contact support:</strong> Discuss specific concerns with our team
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 p-6 bg-gray-100 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Need Help with Privacy?</h3>
          <p className="text-sm text-gray-600 mb-4">
            Our Data Protection Officer is available to answer your questions about privacy and data protection.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Contact DPO
            </Link>
            <Link
              href="/privacy"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white text-sm"
            >
              Privacy Policy
            </Link>
            <Link
              href="/gdpr"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white text-sm"
            >
              GDPR Information
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
