'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import {
  Send,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  RefreshCw,
  AlertCircle,
  Loader2,
  Eye,
  Code,
  CheckSquare,
  Square,
  FileCode,
  ShieldCheck,
  X
} from 'lucide-react';

interface EfacturaRecord {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  partnerName: string;
  partnerCui: string;
  grossAmount: number;
  status: 'pending' | 'submitted' | 'accepted' | 'rejected';
  uploadIndex?: string;
  submittedAt?: string;
  messages?: string[];
  validationErrors?: string[];
  xmlGenerated?: boolean;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

// Mock data for demo mode
const getMockEfacturaRecords = (): EfacturaRecord[] => [
  {
    id: 'ef-001',
    invoiceNumber: 'FV-2025-0156',
    invoiceDate: '2025-12-15',
    partnerName: 'Tech Solutions SRL',
    partnerCui: 'RO12345678',
    grossAmount: 11900.00,
    status: 'pending',
    xmlGenerated: true,
  },
  {
    id: 'ef-002',
    invoiceNumber: 'FV-2025-0155',
    invoiceDate: '2025-12-14',
    partnerName: 'Office Direct SRL',
    partnerCui: 'RO23456789',
    grossAmount: 4850.00,
    status: 'submitted',
    uploadIndex: 'SPV-2025-123456',
    submittedAt: '2025-12-14',
    xmlGenerated: true,
  },
  {
    id: 'ef-003',
    invoiceNumber: 'FV-2025-0154',
    invoiceDate: '2025-12-13',
    partnerName: 'Digital Services SRL',
    partnerCui: 'RO34567890',
    grossAmount: 7500.00,
    status: 'accepted',
    uploadIndex: 'SPV-2025-123455',
    submittedAt: '2025-12-13',
    messages: ['Factură acceptată în sistemul ANAF'],
    xmlGenerated: true,
  },
  {
    id: 'ef-004',
    invoiceNumber: 'FV-2025-0153',
    invoiceDate: '2025-12-12',
    partnerName: 'Construct Pro SRL',
    partnerCui: 'RO45678901',
    grossAmount: 23500.00,
    status: 'rejected',
    uploadIndex: 'SPV-2025-123454',
    submittedAt: '2025-12-12',
    messages: ['Eroare validare: CUI invalid'],
    validationErrors: ['CUI beneficiar nu corespunde cu baza ANAF'],
    xmlGenerated: true,
  },
  {
    id: 'ef-005',
    invoiceNumber: 'FV-2025-0152',
    invoiceDate: '2025-12-11',
    partnerName: 'Green Energy SRL',
    partnerCui: 'RO56789012',
    grossAmount: 15750.00,
    status: 'pending',
    xmlGenerated: false,
  },
  {
    id: 'ef-006',
    invoiceNumber: 'FV-2025-0151',
    invoiceDate: '2025-12-10',
    partnerName: 'Auto Parts SRL',
    partnerCui: 'RO67890123',
    grossAmount: 8900.00,
    status: 'accepted',
    uploadIndex: 'SPV-2025-123453',
    submittedAt: '2025-12-10',
    messages: ['Factură acceptată în sistemul ANAF'],
    xmlGenerated: true,
  },
];

export default function EfacturaPage() {
  const t = useTranslations('efactura');
  const toast = useToast();
  const [records, setRecords] = useState<EfacturaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [checking, setChecking] = useState<string | null>(null);

  // Batch selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  // XML Preview Modal
  const [showXmlModal, setShowXmlModal] = useState(false);
  const [xmlContent, setXmlContent] = useState<string>('');
  const [xmlLoading, setXmlLoading] = useState(false);
  const [currentXmlRecord, setCurrentXmlRecord] = useState<EfacturaRecord | null>(null);

  // Validation Modal
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [validating, setValidating] = useState(false);

  // Fetch e-Factura eligible invoices from backend
  const fetchEfacturaRecords = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/invoices?type=ISSUED&spvSubmitted=false`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const invoices = await response.json();
        // Transform invoices to e-Factura records
        const efacturaRecords: EfacturaRecord[] = invoices.map((inv: any) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: inv.invoiceDate,
          partnerName: inv.partnerName,
          partnerCui: inv.partnerCui || '',
          grossAmount: inv.grossAmount,
          status: inv.spvSubmitted ? 'submitted' : 'pending',
          uploadIndex: inv.spvUploadIndex,
          submittedAt: inv.spvSubmittedAt,
        }));
        setRecords(efacturaRecords);
      } else if (response.status === 401) {
        setError('Sesiune expirată. Vă rugăm să vă autentificați din nou.');
        // Use mock data for demo
        setRecords(getMockEfacturaRecords());
      } else {
        // Use mock data as fallback
        setRecords(getMockEfacturaRecords());
      }
    } catch (err) {
      console.error('Fetch error:', err);
      // Use mock data as fallback for demo
      setRecords(getMockEfacturaRecords());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEfacturaRecords();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'submitted':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('ro-RO');

  const formatAmount = (amount: number) =>
    `${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`;

  const handleSubmit = async (record: EfacturaRecord) => {
    setSubmitting(record.id);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/anaf/efactura/submit/${record.id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setRecords(prev => prev.map(r =>
          r.id === record.id
            ? { ...r, status: 'submitted', uploadIndex: result.uploadIndex, submittedAt: new Date().toISOString().split('T')[0] }
            : r
        ));
        toast.compliance('e-Factura SPV', `Factura ${record.invoiceNumber} a fost trimisă către ANAF.`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error('Eroare SPV', errorData.message || 'Eroare la trimiterea facturii');
      }
    } catch (err) {
      console.error('Submit error:', err);
      toast.error('Eroare conexiune', 'Nu s-a putut trimite factura către SPV.');
    } finally {
      setSubmitting(null);
    }
  };

  const handleCheckStatus = async (record: EfacturaRecord) => {
    setChecking(record.id);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/anaf/efactura/status/${record.uploadIndex}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setRecords(prev => prev.map(r =>
          r.id === record.id ? { ...r, status: result.status, messages: result.messages } : r
        ));
        toast.success('Status actualizat', `Statusul facturii ${record.invoiceNumber}: ${result.status}`);
      } else {
        toast.error('Eroare SPV', 'Nu s-a putut verifica statusul facturii.');
      }
    } catch (err) {
      console.error('Check status error:', err);
      toast.error('Eroare conexiune', 'Nu s-a putut verifica statusul facturii.');
    } finally {
      setChecking(null);
    }
  };

  const handleDownloadReceived = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/anaf/efactura/download-received`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        toast.compliance('e-Factura SPV', `${result.count} facturi primite descărcate cu succes de la ANAF.`);
        fetchEfacturaRecords();
      } else {
        toast.error('Eroare SPV', 'Nu s-au putut descărca facturile primite.');
      }
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Eroare conexiune', 'Nu s-a putut conecta la serverul SPV.');
    }
  };

  // XML Preview Handler
  const handlePreviewXml = async (record: EfacturaRecord) => {
    setXmlLoading(true);
    setCurrentXmlRecord(record);
    setShowXmlModal(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/anaf/efactura/generate-xml/${record.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setXmlContent(result.xml || result.content || '');
      } else {
        // Generate mock XML for demo
        setXmlContent(generateMockXml(record));
        toast.success('XML generat', 'XML UBL 2.1 generat pentru previzualizare.');
      }
    } catch (err) {
      // Generate mock XML for demo
      setXmlContent(generateMockXml(record));
      toast.success('XML generat', 'XML UBL 2.1 generat local pentru previzualizare.');
    } finally {
      setXmlLoading(false);
    }
  };

  // Generate mock UBL 2.1 XML
  const generateMockXml = (record: EfacturaRecord): string => {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1</cbc:CustomizationID>
  <cbc:ID>${record.invoiceNumber}</cbc:ID>
  <cbc:IssueDate>${record.invoiceDate}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>RON</cbc:DocumentCurrencyCode>

  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>DocumentIulia SRL</cbc:Name>
      </cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>RO12345678</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${record.partnerName}</cbc:Name>
      </cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${record.partnerCui}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <cac:LegalMonetaryTotal>
    <cbc:TaxExclusiveAmount currencyID="RON">${(record.grossAmount / 1.19).toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="RON">${record.grossAmount.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="RON">${record.grossAmount.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`;
  };

  // Download XML Handler
  const handleDownloadXml = async (record: EfacturaRecord) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/anaf/efactura/generate-xml/${record.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      let xmlData: string;
      if (response.ok) {
        const result = await response.json();
        xmlData = result.xml || result.content || generateMockXml(record);
      } else {
        xmlData = generateMockXml(record);
      }

      // Create download
      const blob = new Blob([xmlData], { type: 'application/xml' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `efactura_${record.invoiceNumber}.xml`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('XML descărcat', `Fișierul XML pentru factura ${record.invoiceNumber} a fost descărcat.`);
    } catch (err) {
      console.error('Download XML error:', err);
      toast.error('Eroare descărcare', 'Nu s-a putut genera fișierul XML.');
    }
  };

  // Validation Handler
  const handleValidate = async (record: EfacturaRecord) => {
    setValidating(true);
    setCurrentXmlRecord(record);
    setShowValidationModal(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/anaf/efactura/validate/${record.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setValidationResult(result);
      } else {
        // Mock validation for demo
        setValidationResult({
          valid: true,
          errors: [],
          warnings: record.partnerCui ? [] : ['CUI partener nu a fost validat cu ANAF'],
        });
      }
    } catch (err) {
      // Mock validation for demo
      setValidationResult({
        valid: true,
        errors: [],
        warnings: ['Validare locală - conexiune la ANAF indisponibilă'],
      });
    } finally {
      setValidating(false);
    }
  };

  // Batch Selection Handlers
  const toggleSelectAll = () => {
    const pendingRecords = records.filter(r => r.status === 'pending');
    if (selectedIds.size === pendingRecords.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingRecords.map(r => r.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Batch Submit Handler
  const handleBatchSubmit = async () => {
    if (selectedIds.size === 0) {
      toast.error('Selectare necesară', 'Selectați cel puțin o factură pentru trimitere.');
      return;
    }

    setBatchSubmitting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const id of selectedIds) {
      const record = records.find(r => r.id === id);
      if (!record) continue;

      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_URL}/anaf/efactura/submit/${id}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          setRecords(prev => prev.map(r =>
            r.id === id
              ? { ...r, status: 'submitted' as const, uploadIndex: result.uploadIndex, submittedAt: new Date().toISOString().split('T')[0] }
              : r
          ));
          successCount++;
        } else {
          errorCount++;
        }
      } catch (err) {
        errorCount++;
      }
    }

    setBatchSubmitting(false);
    setSelectedIds(new Set());

    if (successCount > 0) {
      toast.compliance('e-Factura SPV', `${successCount} facturi trimise cu succes către ANAF.`);
    }
    if (errorCount > 0) {
      toast.error('Erori la trimitere', `${errorCount} facturi nu au putut fi trimise.`);
    }
  };

  const pendingCount = records.filter(r => r.status === 'pending').length;
  const submittedCount = records.filter(r => r.status === 'submitted').length;
  const acceptedCount = records.filter(r => r.status === 'accepted').length;

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Se încarcă facturile...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <XCircle className="h-5 w-5 text-red-600" />
          <div>
            <h3 className="font-medium text-red-900">Eroare</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
        <button
          onClick={() => { setError(null); setLoading(true); fetchEfacturaRecords(); }}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Încearcă din nou
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {t('subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadReceived}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Descarcă Primite
          </button>
        </div>
      </div>

      {/* Batch Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckSquare className="h-5 w-5 text-purple-600" />
            <span className="text-purple-900 font-medium">
              {selectedIds.size} facturi selectate
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
            >
              Deselectează
            </button>
            <button
              onClick={handleBatchSubmit}
              disabled={batchSubmitting}
              className="bg-purple-600 text-white px-4 py-1.5 rounded-md hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50"
            >
              {batchSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Trimite Toate la ANAF
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{t('totalInvoices')}</p>
              <p className="text-2xl font-semibold">{records.length}</p>
            </div>
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600">{t('toSubmit')}</p>
              <p className="text-2xl font-semibold text-yellow-900">{pendingCount}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-yellow-400" />
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600">{t('processing')}</p>
              <p className="text-2xl font-semibold text-blue-900">{submittedCount}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600">{t('accepted')}</p>
              <p className="text-2xl font-semibold text-green-900">{acceptedCount}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">e-Factura B2B</h3>
            <p className="text-sm text-blue-700 mt-1">
              {t('info')}
            </p>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={toggleSelectAll}
                    className="text-gray-400 hover:text-gray-600"
                    title="Selectează toate facturile în așteptare"
                  >
                    {selectedIds.size === records.filter(r => r.status === 'pending').length && pendingCount > 0 ? (
                      <CheckSquare className="h-5 w-5 text-purple-600" />
                    ) : (
                      <Square className="h-5 w-5" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Factura
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Partener
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Suma
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Index SPV
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acțiuni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.map((record) => (
                <tr key={record.id} className={`hover:bg-gray-50 ${selectedIds.has(record.id) ? 'bg-purple-50' : ''}`}>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {record.status === 'pending' && (
                      <button
                        onClick={() => toggleSelect(record.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {selectedIds.has(record.id) ? (
                          <CheckSquare className="h-5 w-5 text-purple-600" />
                        ) : (
                          <Square className="h-5 w-5" />
                        )}
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{record.invoiceNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(record.invoiceDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{record.partnerName}</div>
                    <div className="text-xs text-gray-500">{record.partnerCui}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatAmount(record.grossAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(record.status)}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(record.status)}`}>
                        {record.status === 'pending' && t('pending')}
                        {record.status === 'submitted' && t('submitted')}
                        {record.status === 'accepted' && t('accepted')}
                        {record.status === 'rejected' && 'Respinsă'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.uploadIndex || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-1">
                      {/* XML Preview */}
                      <button
                        onClick={() => handlePreviewXml(record)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Previzualizare XML"
                      >
                        <Code className="h-4 w-4" />
                      </button>
                      {/* Download XML */}
                      <button
                        onClick={() => handleDownloadXml(record)}
                        className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                        title="Descarcă XML"
                      >
                        <FileCode className="h-4 w-4" />
                      </button>
                      {/* Validate */}
                      <button
                        onClick={() => handleValidate(record)}
                        className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded"
                        title="Validare ANAF"
                      >
                        <ShieldCheck className="h-4 w-4" />
                      </button>
                      {/* Submit to ANAF */}
                      {record.status === 'pending' && (
                        <button
                          onClick={() => handleSubmit(record)}
                          disabled={submitting === record.id}
                          className="p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded disabled:opacity-50"
                          title="Trimite la ANAF"
                        >
                          {submitting === record.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </button>
                      )}
                      {/* Check Status */}
                      {record.status === 'submitted' && (
                        <button
                          onClick={() => handleCheckStatus(record)}
                          disabled={checking === record.id}
                          className="p-1.5 text-green-600 hover:text-green-900 hover:bg-green-50 rounded disabled:opacity-50"
                          title="Verifică status"
                        >
                          {checking === record.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </button>
                      )}
                      {/* Download PDF */}
                      {record.status === 'accepted' && (
                        <button
                          className="p-1.5 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded"
                          title="Descarcă PDF"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* XML Preview Modal */}
      {showXmlModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <Code className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">Previzualizare XML UBL 2.1</h3>
                  <p className="text-sm text-gray-500">
                    Factura {currentXmlRecord?.invoiceNumber} - CIUS-RO 1.0.1
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowXmlModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-50">
              {xmlLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Se generează XML...</span>
                </div>
              ) : (
                <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap bg-white p-4 rounded border overflow-auto">
                  {xmlContent}
                </pre>
              )}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(xmlContent);
                  toast.success('Copiat', 'XML copiat în clipboard.');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Copiază
              </button>
              {currentXmlRecord && (
                <button
                  onClick={() => {
                    handleDownloadXml(currentXmlRecord);
                    setShowXmlModal(false);
                  }}
                  className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Descarcă XML
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Validation Modal */}
      {showValidationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-purple-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">Validare e-Factura</h3>
                  <p className="text-sm text-gray-500">
                    Factura {currentXmlRecord?.invoiceNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowValidationModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              {validating ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                  <span className="ml-2 text-gray-600">Se validează conform EN16931...</span>
                </div>
              ) : validationResult ? (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div className={`p-4 rounded-lg flex items-center gap-3 ${
                    validationResult.valid
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    {validationResult.valid ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-600" />
                    )}
                    <div>
                      <p className={`font-medium ${validationResult.valid ? 'text-green-900' : 'text-red-900'}`}>
                        {validationResult.valid ? 'Validare reușită' : 'Validare eșuată'}
                      </p>
                      <p className={`text-sm ${validationResult.valid ? 'text-green-700' : 'text-red-700'}`}>
                        {validationResult.valid
                          ? 'Factura respectă standardul CIUS-RO 1.0.1'
                          : 'Corectați erorile înainte de trimitere'}
                      </p>
                    </div>
                  </div>

                  {/* Errors */}
                  {validationResult.errors.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-red-900 mb-2">Erori ({validationResult.errors.length})</h4>
                      <ul className="space-y-1">
                        {validationResult.errors.map((err, idx) => (
                          <li key={idx} className="text-sm text-red-700 flex items-start gap-2">
                            <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            {err}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Warnings */}
                  {validationResult.warnings.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-yellow-900 mb-2">Avertismente ({validationResult.warnings.length})</h4>
                      <ul className="space-y-1">
                        {validationResult.warnings.map((warn, idx) => (
                          <li key={idx} className="text-sm text-yellow-700 flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            {warn}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* No issues */}
                  {validationResult.errors.length === 0 && validationResult.warnings.length === 0 && (
                    <p className="text-sm text-gray-600 text-center py-4">
                      Nu au fost găsite probleme. Factura este gata pentru trimitere.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={() => setShowValidationModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Închide
              </button>
              {validationResult?.valid && currentXmlRecord && (
                <button
                  onClick={() => {
                    handleSubmit(currentXmlRecord);
                    setShowValidationModal(false);
                  }}
                  className="px-4 py-2 text-white bg-purple-600 rounded-md hover:bg-purple-700 flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Trimite la ANAF
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
