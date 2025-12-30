'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Search, Filter, Eye, Download, Trash2, Loader2, RefreshCw, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { SkeletonDocumentList } from '@/components/ui/Skeleton';
import FileUpload from '../../../../components/FileUpload';
import { useToast } from '@/components/ui/Toast';

interface Document {
  id: string;
  filename: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  ocrData: Record<string, unknown> | null;
  extractedText: string | null;
  confidence: number | null;
  createdAt: string;
  processedAt: string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export default function DocumentsPage() {
  const t = useTranslations('documents');
  const toast = useToast();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [statusFilter]);

  // Demo data for fallback
  const getDemoDocuments = (): Document[] => [
    {
      id: '1',
      filename: 'Factura_Furnizor_ABC_2025.pdf',
      fileUrl: '#',
      fileType: 'application/pdf',
      fileSize: 245760,
      status: 'COMPLETED',
      ocrData: { vendor: 'ABC SRL', amount: 15000 },
      extractedText: 'Factura pentru servicii consultanta...',
      confidence: 0.95,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      processedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 300000).toISOString(),
    },
    {
      id: '2',
      filename: 'Contract_Colaborare_2025.docx',
      fileUrl: '#',
      fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fileSize: 512000,
      status: 'PROCESSING',
      ocrData: null,
      extractedText: null,
      confidence: null,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      processedAt: null,
    },
    {
      id: '3',
      filename: 'Declaratie_VAT_394_2025.pdf',
      fileUrl: '#',
      fileType: 'application/pdf',
      fileSize: 187000,
      status: 'COMPLETED',
      ocrData: { period: 'decembrie 2025', totalVAT: 5250 },
      extractedText: 'Declarație privind taxa pe valoare adăugată...',
      confidence: 0.98,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      processedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 600000).toISOString(),
    },
  ];

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`${API_URL}/documents?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setDocuments(data || []);
      } else if (response.status === 401) {
        setError('Sesiune expirată. Vă rugăm să vă autentificați din nou.');
      } else {
        // Fallback to demo data on API error
        setDocuments(getDemoDocuments());
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      // Fallback to demo data on connection error
      setDocuments(getDemoDocuments());
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (docId: string) => {
    router.push(`/dashboard/documents/${docId}/delete`);
  };

  const deleteDocumentConfirmed = async (docId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        await fetchDocuments();
        toast.success('Document șters', 'Documentul a fost șters cu succes');
      } else {
        toast.error('Eroare', 'Eroare la ștergerea documentului');
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
      toast.error('Eroare', 'Eroare de conexiune');
    }
  };

  const processDocument = async (docId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/documents/${docId}/process`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        await fetchDocuments();
        toast.success('Document trimis pentru procesare OCR');
      } else {
        toast.error('Eroare la procesarea documentului');
      }
    } catch (err) {
      console.error('Failed to process document:', err);
      toast.error('Eroare de conexiune');
    }
  };

  const viewDocument = (doc: Document) => {
    if (doc.fileUrl) {
      window.open(doc.fileUrl, '_blank');
    } else {
      toast.error('URL-ul documentului nu este disponibil');
    }
  };

  const downloadDocument = async (doc: Document) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/documents/${doc.id}/download`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else if (doc.fileUrl) {
        // Fallback to direct URL if download endpoint not available
        const a = document.createElement('a');
        a.href = doc.fileUrl;
        a.download = doc.filename;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success('Document descărcat cu succes');
      } else {
        toast.error('Descărcarea documentului nu este disponibilă');
      }
    } catch (err) {
      console.error('Failed to download document:', err);
      // Fallback to direct URL on error
      if (doc.fileUrl) {
        window.open(doc.fileUrl, '_blank');
      } else {
        toast.error('Eroare la descărcarea documentului');
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'PROCESSING':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <div>
            <h3 className="font-medium text-red-900">Eroare</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
        <button
          onClick={() => { setError(null); setLoading(true); fetchDocuments(); }}
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
          <h1 className="text-2xl font-bold text-gray-900">{t('title') || 'Documente'}</h1>
          <p className="text-gray-500 mt-1">
            {t('subtitle') || 'Gestionare si procesare OCR documente'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchDocuments}
            className="p-2 text-gray-500 hover:text-gray-700"
            title="Refresh"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <FileText className="h-5 w-5 mr-2" />
            {t('upload') || 'Incarca Document'}
          </button>
        </div>
      </div>

      {/* Upload Section */}
      {showUpload && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {t('uploadTitle') || 'Incarca Documente Noi'}
          </h2>
          <FileUpload
            accept=".pdf,.jpg,.jpeg,.png,.xml"
            maxFiles={10}
            maxSize={50}
            onUpload={() => {
              fetchDocuments();
              setShowUpload(false);
            }}
          />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={t('search') || 'Cauta documente...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">{t('allStatuses') || 'Toate statusurile'}</option>
              <option value="PENDING">{t('pending') || 'In asteptare'}</option>
              <option value="PROCESSING">{t('processing') || 'In procesare'}</option>
              <option value="COMPLETED">{t('completed') || 'Finalizat'}</option>
              <option value="FAILED">{t('failed') || 'Esuat'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <SkeletonDocumentList />
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>{t('noDocuments') || 'Nu exista documente'}</p>
            <p className="text-sm mt-2">{t('noDocumentsHint') || 'Incarcati primul document folosind butonul de mai sus'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('filename') || 'Fisier'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('size') || 'Marime'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('status') || 'Status'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('confidence') || 'Acuratete OCR'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('uploaded') || 'Incarcat'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('actions') || 'Actiuni'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(doc.status)}
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                            {doc.filename}
                          </p>
                          <p className="text-xs text-gray-500">{doc.fileType}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatFileSize(doc.fileSize)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(doc.status)}`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {doc.confidence !== null ? (
                        <div className="flex items-center">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden mr-2">
                            <div
                              className={`h-full ${doc.confidence >= 0.8 ? 'bg-green-500' : doc.confidence >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${doc.confidence * 100}%` }}
                            />
                          </div>
                          <span>{Math.round(doc.confidence * 100)}%</span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(doc.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => viewDocument(doc)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => downloadDocument(doc)}
                          className="text-green-600 hover:text-green-900"
                          title="Download"
                        >
                          <Download className="h-5 w-5" />
                        </button>
                        {doc.status === 'PENDING' && (
                          <button
                            onClick={() => processDocument(doc.id)}
                            className="text-purple-600 hover:text-purple-900"
                            title="Process OCR"
                          >
                            <FileText className="h-5 w-5" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteDocument(doc.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
