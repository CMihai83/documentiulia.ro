"use client";

import { useState } from "react";
import {
  FileText,
  Upload,
  Download,
  Search,
  Filter,
  FolderOpen,
  File,
  Image,
  FileSpreadsheet,
  FilePlus,
  Trash2,
  Eye,
  MoreVertical,
  Calendar,
  Tag,
  Clock,
  CheckCircle,
  AlertTriangle,
  Grid,
  List,
  ChevronRight,
  FolderPlus,
  Share2,
  Link,
  Star,
  StarOff,
} from "lucide-react";
import { AppLayout, MobileNav } from "@/components/layout";

type DocumentType = "invoice" | "receipt" | "contract" | "report" | "other";
type DocumentStatus = "processed" | "pending" | "error";

interface Document {
  id: string;
  name: string;
  type: DocumentType;
  category: string;
  size: number;
  uploadedAt: string;
  processedAt?: string;
  status: DocumentStatus;
  starred: boolean;
  tags: string[];
  extractedData?: {
    vendor?: string;
    amount?: number;
    date?: string;
  };
}

interface Folder {
  id: string;
  name: string;
  documentCount: number;
  color: string;
}

const mockFolders: Folder[] = [
  { id: "all", name: "Toate documentele", documentCount: 156, color: "blue" },
  { id: "invoices", name: "Facturi", documentCount: 89, color: "emerald" },
  { id: "receipts", name: "Bonuri & Chitanțe", documentCount: 34, color: "amber" },
  { id: "contracts", name: "Contracte", documentCount: 12, color: "purple" },
  { id: "reports", name: "Rapoarte", documentCount: 15, color: "pink" },
  { id: "other", name: "Altele", documentCount: 6, color: "slate" },
];

const mockDocuments: Document[] = [
  {
    id: "1",
    name: "Factura_SC_Furnizor_Dec2024.pdf",
    type: "invoice",
    category: "invoices",
    size: 245000,
    uploadedAt: "2024-12-01T10:30:00",
    processedAt: "2024-12-01T10:31:00",
    status: "processed",
    starred: true,
    tags: ["furnizor", "decembrie"],
    extractedData: {
      vendor: "SC Furnizor Mare SRL",
      amount: 15000,
      date: "2024-12-01",
    },
  },
  {
    id: "2",
    name: "Contract_servicii_2024.pdf",
    type: "contract",
    category: "contracts",
    size: 1200000,
    uploadedAt: "2024-11-15T14:20:00",
    processedAt: "2024-11-15T14:22:00",
    status: "processed",
    starred: false,
    tags: ["contract", "servicii"],
  },
  {
    id: "3",
    name: "Bon_fiscal_echipamente.jpg",
    type: "receipt",
    category: "receipts",
    size: 89000,
    uploadedAt: "2024-12-02T09:15:00",
    status: "pending",
    starred: false,
    tags: ["echipamente"],
  },
  {
    id: "4",
    name: "Raport_lunar_Nov2024.xlsx",
    type: "report",
    category: "reports",
    size: 456000,
    uploadedAt: "2024-11-30T18:00:00",
    processedAt: "2024-11-30T18:01:00",
    status: "processed",
    starred: true,
    tags: ["raport", "noiembrie"],
  },
  {
    id: "5",
    name: "Factura_gresita.pdf",
    type: "invoice",
    category: "invoices",
    size: 123000,
    uploadedAt: "2024-12-01T16:45:00",
    status: "error",
    starred: false,
    tags: [],
  },
];

export default function DocumentsPage() {
  const [documents, setDocuments] = useState(mockDocuments);
  const [selectedFolder, setSelectedFolder] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Filter documents
  const filteredDocuments = documents.filter((doc) => {
    const matchesFolder = selectedFolder === "all" || doc.category === selectedFolder;
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFolder && matchesSearch;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFileIcon = (type: DocumentType, name: string) => {
    if (name.endsWith(".jpg") || name.endsWith(".png") || name.endsWith(".jpeg")) {
      return <Image className="w-5 h-5 text-pink-500" />;
    }
    if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv")) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    }
    switch (type) {
      case "invoice":
        return <FileText className="w-5 h-5 text-blue-500" />;
      case "contract":
        return <FileText className="w-5 h-5 text-purple-500" />;
      case "receipt":
        return <FileText className="w-5 h-5 text-amber-500" />;
      default:
        return <File className="w-5 h-5 text-slate-500" />;
    }
  };

  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case "processed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            <CheckCircle className="w-3 h-3" />
            Procesat
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <Clock className="w-3 h-3" />
            În procesare
          </span>
        );
      case "error":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <AlertTriangle className="w-3 h-3" />
            Eroare
          </span>
        );
    }
  };

  const toggleStar = (docId: string) => {
    setDocuments(documents.map(doc =>
      doc.id === docId ? { ...doc, starred: !doc.starred } : doc
    ));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Handle file upload
    const files = e.dataTransfer.files;
    console.log("Files dropped:", files);
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-8rem)] -mx-4 lg:-mx-6 -mb-4 lg:-mb-6">
      {/* Sidebar - Folders */}
      <div className="w-64 bg-white border-r border-slate-200 p-4 flex-shrink-0 hidden md:block">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">Dosare</h2>
          <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>

        <nav className="space-y-1">
          {mockFolders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => setSelectedFolder(folder.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                selectedFolder === folder.id
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <FolderOpen className={`w-5 h-5 text-${folder.color}-500`} />
              <span className="flex-1 text-left text-sm font-medium">{folder.name}</span>
              <span className="text-xs text-slate-400">{folder.documentCount}</span>
            </button>
          ))}
        </nav>

        <div className="mt-6 pt-6 border-t border-slate-200">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Stocare
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Utilizat</span>
              <span className="font-medium text-slate-900">2.4 GB / 10 GB</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full w-[24%] bg-blue-500 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {mockFolders.find(f => f.id === selectedFolder)?.name || "Documente"}
              </h1>
              <p className="text-sm text-slate-500">
                {filteredDocuments.length} documente
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Caută documente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 w-64 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* View Mode */}
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded ${viewMode === "list" ? "bg-white shadow" : ""}`}
                >
                  <List className="w-4 h-4 text-slate-600" />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded ${viewMode === "grid" ? "bg-white shadow" : ""}`}
                >
                  <Grid className="w-4 h-4 text-slate-600" />
                </button>
              </div>

              {/* Upload Button */}
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Upload className="w-4 h-4" />
                Încarcă
              </button>
            </div>
          </div>
        </div>

        {/* Drop Zone / Content */}
        <div
          className={`flex-1 overflow-auto p-4 ${isDragging ? "bg-blue-50" : "bg-slate-50"}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDragging ? (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-blue-400 rounded-xl">
              <div className="text-center">
                <Upload className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <p className="text-lg font-medium text-blue-700">Eliberează pentru a încărca</p>
                <p className="text-sm text-blue-500">PDF, JPG, PNG, Excel acceptate</p>
              </div>
            </div>
          ) : viewMode === "list" ? (
            /* List View */
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Nume</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Data</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Dimensiune</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-slate-700">Status</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-700">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleStar(doc.id)}
                            className={`p-1 rounded transition ${doc.starred ? "text-amber-500" : "text-slate-300 hover:text-slate-400"}`}
                          >
                            {doc.starred ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
                          </button>
                          {getFileIcon(doc.type, doc.name)}
                          <div>
                            <p className="font-medium text-slate-900">{doc.name}</p>
                            {doc.tags.length > 0 && (
                              <div className="flex items-center gap-1 mt-1">
                                {doc.tags.map(tag => (
                                  <span key={tag} className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-xs rounded">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {formatDate(doc.uploadedAt)}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {formatFileSize(doc.size)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(doc.status)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedDocument(doc)}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                            title="Vizualizează"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                            title="Descarcă"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                            title="Partajează"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Șterge"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredDocuments.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Nu există documente</p>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="mt-4 text-blue-600 hover:text-blue-700"
                  >
                    Încarcă primul document
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg transition cursor-pointer group"
                  onClick={() => setSelectedDocument(doc)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      {getFileIcon(doc.type, doc.name)}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStar(doc.id);
                      }}
                      className={`p-1 rounded transition ${doc.starred ? "text-amber-500" : "text-slate-300 opacity-0 group-hover:opacity-100"}`}
                    >
                      {doc.starred ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
                    </button>
                  </div>
                  <h3 className="font-medium text-slate-900 text-sm truncate mb-1">{doc.name}</h3>
                  <p className="text-xs text-slate-500 mb-2">{formatFileSize(doc.size)}</p>
                  {getStatusBadge(doc.status)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Încarcă Documente</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-blue-400 transition cursor-pointer">
                <Upload className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 mb-2">
                  Trage fișierele aici sau click pentru a selecta
                </p>
                <p className="text-sm text-slate-400">
                  PDF, JPG, PNG, Excel (max 10MB per fișier)
                </p>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.csv"
                  className="hidden"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Categoria
                </label>
                <select className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="invoices">Facturi</option>
                  <option value="receipts">Bonuri & Chitanțe</option>
                  <option value="contracts">Contracte</option>
                  <option value="reports">Rapoarte</option>
                  <option value="other">Altele</option>
                </select>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Etichete (opțional)
                </label>
                <input
                  type="text"
                  placeholder="ex: furnizor, decembrie, urgent"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Anulează
              </button>
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                Încarcă
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                {getFileIcon(selectedDocument.type, selectedDocument.name)}
                <h2 className="text-lg font-semibold text-slate-900">{selectedDocument.name}</h2>
              </div>
              <button
                onClick={() => setSelectedDocument(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center">
                <FileText className="w-16 h-16 text-slate-300" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">Dimensiune</p>
                  <p className="font-medium text-slate-900">{formatFileSize(selectedDocument.size)}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">Încărcat</p>
                  <p className="font-medium text-slate-900">{formatDate(selectedDocument.uploadedAt)}</p>
                </div>
              </div>

              {selectedDocument.extractedData && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">Date extrase automat (AI)</h3>
                  <div className="space-y-1 text-sm">
                    {selectedDocument.extractedData.vendor && (
                      <p><span className="text-blue-600">Furnizor:</span> {selectedDocument.extractedData.vendor}</p>
                    )}
                    {selectedDocument.extractedData.amount && (
                      <p><span className="text-blue-600">Suma:</span> {selectedDocument.extractedData.amount.toLocaleString("ro-RO")} lei</p>
                    )}
                    {selectedDocument.extractedData.date && (
                      <p><span className="text-blue-600">Data:</span> {selectedDocument.extractedData.date}</p>
                    )}
                  </div>
                </div>
              )}

              {selectedDocument.tags.length > 0 && (
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-slate-400" />
                  {selectedDocument.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-slate-100 text-slate-600 text-sm rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
              <div>
                {getStatusBadge(selectedDocument.status)}
              </div>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition text-slate-700">
                  <Share2 className="w-4 h-4" />
                  Partajează
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                  <Download className="w-4 h-4" />
                  Descarcă
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
      <MobileNav />
    </AppLayout>
  );
}
