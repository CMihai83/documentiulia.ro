'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Building2,
  User,
  Search,
  Plus,
  MoreVertical,
  Mail,
  Phone,
  MapPin,
  FileText,
  Edit,
  Trash2,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Briefcase,
  Hash,
  CreditCard,
  Loader2,
  UserPlus,
} from 'lucide-react';
import { useCompanyStore } from '@/lib/store/company-store';
import { useClients } from '@/lib/api/hooks';
import { ContactModal } from '@/components/contacts/contact-modal';

// Client types
type ClientType = 'company' | 'individual';

interface Client {
  id: string;
  name: string;
  type: ClientType;
  cui?: string;
  regCom?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  county?: string;
  country?: string;
  iban?: string;
  bank?: string;
  vatPayer?: boolean;
  contactPerson?: string;
  totalInvoices: number;
  totalRevenue: number;
  lastInvoiceDate?: string;
  createdAt: string;
}

// Type configuration
const typeConfig: Record<ClientType, { label: string; icon: typeof Building2 }> = {
  company: { label: 'Persoană Juridică', icon: Building2 },
  individual: { label: 'Persoană Fizică', icon: User },
};

// Romanian currency formatting
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Romanian date formatting
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// Mock data for demonstration
const mockClients: Client[] = [
  {
    id: '1',
    name: 'SC Exemplu SRL',
    type: 'company',
    cui: 'RO12345678',
    regCom: 'J40/1234/2020',
    email: 'contact@exemplu.ro',
    phone: '+40 722 123 456',
    address: 'Str. Exemplu Nr. 10',
    city: 'București',
    county: 'București',
    country: 'România',
    iban: 'RO49AAAA1B31007593840000',
    bank: 'Banca Transilvania',
    vatPayer: true,
    contactPerson: 'Ion Popescu',
    totalInvoices: 24,
    totalRevenue: 156420,
    lastInvoiceDate: '2024-01-15',
    createdAt: '2023-01-10',
  },
  {
    id: '2',
    name: 'SC Test Solutions SA',
    type: 'company',
    cui: 'RO87654321',
    regCom: 'J40/5678/2019',
    email: 'office@testsolutions.ro',
    phone: '+40 733 987 654',
    address: 'Bd. Unirii Nr. 25',
    city: 'Cluj-Napoca',
    county: 'Cluj',
    country: 'România',
    iban: 'RO98BBBB2C42008604950001',
    bank: 'BRD',
    vatPayer: true,
    contactPerson: 'Maria Ionescu',
    totalInvoices: 18,
    totalRevenue: 89500,
    lastInvoiceDate: '2024-01-12',
    createdAt: '2023-03-15',
  },
  {
    id: '3',
    name: 'PFA Ion Popescu',
    type: 'individual',
    cui: '1234567890123',
    email: 'ion.popescu@email.ro',
    phone: '+40 744 555 666',
    address: 'Str. Libertatii Nr. 15',
    city: 'Timișoara',
    county: 'Timiș',
    country: 'România',
    vatPayer: false,
    totalInvoices: 5,
    totalRevenue: 12300,
    lastInvoiceDate: '2024-01-08',
    createdAt: '2023-06-20',
  },
  {
    id: '4',
    name: 'SC Digital Services SRL',
    type: 'company',
    cui: 'RO11223344',
    regCom: 'J40/9876/2021',
    email: 'hello@digitalservices.ro',
    phone: '+40 755 111 222',
    address: 'Str. Victoriei Nr. 50',
    city: 'Iași',
    county: 'Iași',
    country: 'România',
    iban: 'RO12CCCC3D53009715060002',
    bank: 'ING Bank',
    vatPayer: true,
    contactPerson: 'Ana Vasilescu',
    totalInvoices: 32,
    totalRevenue: 245000,
    lastInvoiceDate: '2024-01-18',
    createdAt: '2022-11-05',
  },
  {
    id: '5',
    name: 'SC Retail Pro SRL',
    type: 'company',
    cui: 'RO99887766',
    regCom: 'J40/4321/2018',
    email: 'contact@retailpro.ro',
    phone: '+40 766 333 444',
    address: 'Str. Comerciului Nr. 100',
    city: 'Constanța',
    county: 'Constanța',
    country: 'România',
    vatPayer: true,
    contactPerson: 'Mihai Dumitrescu',
    totalInvoices: 45,
    totalRevenue: 387650,
    lastInvoiceDate: '2024-01-17',
    createdAt: '2022-05-12',
  },
];

export default function ContactsPage() {
  const t = useTranslations('contacts');
  const { selectedCompanyId, selectedCompany } = useCompanyStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ClientType | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const itemsPerPage = 10;

  // Fetch clients
  const { data: clientsData, isLoading } = useClients(selectedCompanyId || '');

  // Use mock data for now
  const clients = mockClients;

  // Filter clients
  const filteredClients = clients.filter(client => {
    const matchesSearch =
      searchQuery === '' ||
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.cui?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || client.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Pagination
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats
  const stats = {
    total: clients.length,
    companies: clients.filter(c => c.type === 'company').length,
    individuals: clients.filter(c => c.type === 'individual').length,
    totalRevenue: clients.reduce((sum, c) => sum + c.totalRevenue, 0),
  };

  if (!selectedCompanyId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Users className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Selectează o firmă
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Pentru a vedea contactele, selectează mai întâi o firmă din meniul de sus.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Contacte
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Gestionează clienții și furnizorii pentru {selectedCompany?.name}
          </p>
        </div>
        <button
          onClick={() => setIsContactModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <UserPlus className="w-5 h-5" />
          <span className="font-medium">Adaugă Contact</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Contacte</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Persoane Juridice</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.companies}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Persoane Fizice</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.individuals}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <User className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Venituri Totale</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(stats.totalRevenue)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Caută după nume, CUI sau email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as ClientType | 'all');
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Toate tipurile</option>
              <option value="company">Persoane Juridice</option>
              <option value="individual">Persoane Fizice</option>
            </select>

            {/* Export Button */}
            <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <Download className="w-5 h-5 text-gray-500" />
              <span className="hidden sm:inline text-gray-700 dark:text-gray-300">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Clients List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Nu există contacte
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery || typeFilter !== 'all'
                ? 'Niciun contact nu corespunde filtrelor selectate.'
                : 'Adaugă primul tău contact pentru a începe.'}
            </p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-900/50 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <div className="col-span-4">Contact</div>
              <div className="col-span-2">Tip</div>
              <div className="col-span-2">CUI</div>
              <div className="col-span-2 text-right">Venituri</div>
              <div className="col-span-1">Facturi</div>
              <div className="col-span-1"></div>
            </div>

            {/* Client Rows */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedClients.map((client, index) => {
                const TypeIcon = typeConfig[client.type].icon;
                return (
                  <motion.div
                    key={client.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    {/* Desktop */}
                    <div className="hidden md:grid md:grid-cols-12 gap-4 items-center">
                      <div className="col-span-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            client.type === 'company'
                              ? 'bg-purple-100 dark:bg-purple-900/30'
                              : 'bg-green-100 dark:bg-green-900/30'
                          }`}>
                            <TypeIcon className={`w-5 h-5 ${
                              client.type === 'company'
                                ? 'text-purple-600 dark:text-purple-400'
                                : 'text-green-600 dark:text-green-400'
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {client.name}
                            </p>
                            {client.email && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {client.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                          client.type === 'company'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          {typeConfig[client.type].label}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm font-mono text-gray-600 dark:text-gray-400">
                          {client.cui || '-'}
                        </p>
                        {client.vatPayer && (
                          <span className="text-xs text-blue-600 dark:text-blue-400">
                            Plătitor TVA
                          </span>
                        )}
                      </div>
                      <div className="col-span-2 text-right">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(client.totalRevenue)}
                        </p>
                        {client.lastInvoiceDate && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Ultima: {formatDate(client.lastInvoiceDate)}
                          </p>
                        )}
                      </div>
                      <div className="col-span-1">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          <FileText className="w-3.5 h-3.5" />
                          {client.totalInvoices}
                        </span>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <div className="relative group">
                          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </button>
                          {/* Dropdown menu */}
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                            <div className="p-1">
                              <button
                                onClick={() => setSelectedClient(client)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                              >
                                <Eye className="w-4 h-4" />
                                Vizualizează
                              </button>
                              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                                <Edit className="w-4 h-4" />
                                Editează
                              </button>
                              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                                <FileText className="w-4 h-4" />
                                Factură nouă
                              </button>
                              <hr className="my-1 border-gray-200 dark:border-gray-700" />
                              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md">
                                <Trash2 className="w-4 h-4" />
                                Șterge
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mobile */}
                    <div className="md:hidden space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            client.type === 'company'
                              ? 'bg-purple-100 dark:bg-purple-900/30'
                              : 'bg-green-100 dark:bg-green-900/30'
                          }`}>
                            <TypeIcon className={`w-5 h-5 ${
                              client.type === 'company'
                                ? 'text-purple-600 dark:text-purple-400'
                                : 'text-green-600 dark:text-green-400'
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {client.name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {client.cui || '-'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedClient(client)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                          <span className="text-gray-500 dark:text-gray-400">
                            {client.totalInvoices} facturi
                          </span>
                          {client.vatPayer && (
                            <span className="text-blue-600 dark:text-blue-400">
                              Plătitor TVA
                            </span>
                          )}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(client.totalRevenue)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Afișez {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredClients.length)} din {filteredClients.length} contacte
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="px-4 py-2 text-sm font-medium">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Client Detail Modal */}
      <AnimatePresence>
        {selectedClient && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedClient(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white dark:bg-gray-800 p-6 border-b border-gray-200 dark:border-gray-700 z-10">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                      selectedClient.type === 'company'
                        ? 'bg-purple-100 dark:bg-purple-900/30'
                        : 'bg-green-100 dark:bg-green-900/30'
                    }`}>
                      {selectedClient.type === 'company' ? (
                        <Building2 className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                      ) : (
                        <User className="w-7 h-7 text-green-600 dark:text-green-400" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {selectedClient.name}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {typeConfig[selectedClient.type].label}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedClient(null)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedClient.totalInvoices}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Facturi</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(selectedClient.totalRevenue)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Venituri</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedClient.lastInvoiceDate ? formatDate(selectedClient.lastInvoiceDate) : '-'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Ultima Factură</p>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedClient.cui && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <Hash className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">CUI</p>
                        <p className="font-medium text-gray-900 dark:text-white">{selectedClient.cui}</p>
                      </div>
                    </div>
                  )}
                  {selectedClient.regCom && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <Briefcase className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Nr. Reg. Com.</p>
                        <p className="font-medium text-gray-900 dark:text-white">{selectedClient.regCom}</p>
                      </div>
                    </div>
                  )}
                  {selectedClient.email && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                        <p className="font-medium text-gray-900 dark:text-white">{selectedClient.email}</p>
                      </div>
                    </div>
                  )}
                  {selectedClient.phone && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Telefon</p>
                        <p className="font-medium text-gray-900 dark:text-white">{selectedClient.phone}</p>
                      </div>
                    </div>
                  )}
                  {(selectedClient.address || selectedClient.city) && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg md:col-span-2">
                      <MapPin className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Adresă</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {[selectedClient.address, selectedClient.city, selectedClient.county, selectedClient.country].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedClient.iban && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg md:col-span-2">
                      <CreditCard className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">IBAN {selectedClient.bank && `(${selectedClient.bank})`}</p>
                        <p className="font-mono text-gray-900 dark:text-white">{selectedClient.iban}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* VAT Status */}
                {selectedClient.vatPayer !== undefined && (
                  <div className={`flex items-center gap-2 px-4 py-3 rounded-lg ${
                    selectedClient.vatPayer
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    {selectedClient.vatPayer ? '✓' : '✗'} {selectedClient.vatPayer ? 'Plătitor TVA' : 'Neplătitor TVA'}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-white dark:bg-gray-800 p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  Editează
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Factură nouă
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create/Edit Contact Modal */}
      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}
