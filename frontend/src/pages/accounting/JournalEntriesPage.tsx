import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, CheckCircle, BookOpen, X } from 'lucide-react';
import { journalEntryService } from '../../services/accounting/journalEntryService';
import type { JournalEntry, JournalEntryLine, JournalEntryFormData } from '../../services/accounting/journalEntryService';

const JournalEntriesPage: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewingEntry, setViewingEntry] = useState<JournalEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Form data
  const [formData, setFormData] = useState<JournalEntryFormData>({
    entry_date: new Date().toISOString().split('T')[0],
    entry_type: 'general',
    description: '',
    reference: '',
    lines: [
      { account_id: '', debit: 0, credit: 0, description: '' },
      { account_id: '', debit: 0, credit: 0, description: '' }
    ]
  });

  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
    filterEntries();
  }, [searchTerm, statusFilter, typeFilter, entries]);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const response = await journalEntryService.list();
      setEntries(response.entries || []);
    } catch (error) {
      console.error('Error loading journal entries:', error);
      alert('Eroare la încărcarea înregistrărilor jurnal');
    } finally {
      setLoading(false);
    }
  };

  const filterEntries = () => {
    let filtered = [...entries];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(entry =>
        entry.entry_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.reference?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(entry => entry.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(entry => entry.entry_type === typeFilter);
    }

    setFilteredEntries(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate balanced entry
    const totalDebit = formData.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = formData.lines.reduce((sum, line) => sum + (line.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      alert(`Înregistrarea nu este echilibrată!\nDebit total: ${totalDebit.toFixed(2)}\nCredit total: ${totalCredit.toFixed(2)}`);
      return;
    }

    // Validate at least 2 lines
    const validLines = formData.lines.filter(line => line.account_id && (line.debit > 0 || line.credit > 0));
    if (validLines.length < 2) {
      alert('Trebuie să aveți cel puțin 2 linii valide în înregistrare');
      return;
    }

    try {
      await journalEntryService.create({
        ...formData,
        lines: validLines
      });
      alert('Înregistrare jurnal creată cu succes!');
      setShowModal(false);
      resetForm();
      loadEntries();
    } catch (error) {
      console.error('Error creating journal entry:', error);
      alert('Eroare la crearea înregistrării jurnal');
    }
  };

  const handlePostEntry = async (entryId: string) => {
    if (window.confirm('Sigur doriți să postați această înregistrare? Acest lucru o va face permanentă.')) {
      try {
        await journalEntryService.post(entryId);
        alert('Înregistrare postată cu succes!');
        loadEntries();
      } catch (error) {
        console.error('Error posting journal entry:', error);
        alert('Eroare la postarea înregistrării');
      }
    }
  };

  const handleViewEntry = (entry: JournalEntry) => {
    setViewingEntry(entry);
  };

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { account_id: '', debit: 0, credit: 0, description: '' }]
    });
  };

  const removeLine = (index: number) => {
    if (formData.lines.length > 2) {
      setFormData({
        ...formData,
        lines: formData.lines.filter((_, i) => i !== index)
      });
    }
  };

  const updateLine = (index: number, field: keyof JournalEntryLine, value: any) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setFormData({ ...formData, lines: newLines });
  };

  const resetForm = () => {
    setFormData({
      entry_date: new Date().toISOString().split('T')[0],
      entry_type: 'general',
      description: '',
      reference: '',
      lines: [
        { account_id: '', debit: 0, credit: 0, description: '' },
        { account_id: '', debit: 0, credit: 0, description: '' }
      ]
    });
  };

  const getTotalDebit = () => {
    return formData.lines.reduce((sum, line) => sum + (parseFloat(line.debit.toString()) || 0), 0);
  };

  const getTotalCredit = () => {
    return formData.lines.reduce((sum, line) => sum + (parseFloat(line.credit.toString()) || 0), 0);
  };

  const isBalanced = () => {
    return Math.abs(getTotalDebit() - getTotalCredit()) < 0.01;
  };

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: { color: string; label: string } } = {
      draft: { color: 'bg-yellow-100 text-yellow-800', label: 'Draft' },
      posted: { color: 'bg-green-100 text-green-800', label: 'Postat' },
      voided: { color: 'bg-red-100 text-red-800', label: 'Anulat' }
    };
    const badge = badges[status] || badges.draft;
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>{badge.label}</span>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Se încarcă...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Înregistrări Jurnal</h1>
        <p className="text-gray-600">Gestiune înregistrări contabile cu validare dublă intrare</p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Caută..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Toate statusurile</option>
            <option value="draft">Draft</option>
            <option value="posted">Postate</option>
            <option value="voided">Anulate</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Toate tipurile</option>
            <option value="general">General</option>
            <option value="adjustment">Ajustare</option>
            <option value="closing">Închidere</option>
            <option value="opening">Deschidere</option>
          </select>

          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Înregistrare Nouă
          </button>
        </div>
      </div>

      {/* Journal Entries Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Număr
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Descriere
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tip
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Debit
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Credit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acțiuni
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  Nu există înregistrări jurnal
                </td>
              </tr>
            ) : (
              filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{entry.entry_number}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      {formatDate(entry.entry_date)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{entry.description}</div>
                    {entry.reference && (
                      <div className="text-xs text-gray-500">Ref: {entry.reference}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs text-gray-600 capitalize">{entry.entry_type}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-semibold text-green-600">
                      {formatCurrency(entry.total_debit)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-semibold text-red-600">
                      {formatCurrency(entry.total_credit)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(entry.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleViewEntry(entry)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                      title="Vezi detalii"
                    >
                      <BookOpen className="w-5 h-5" />
                    </button>
                    {entry.status === 'draft' && (
                      <button
                        onClick={() => handlePostEntry(entry.id)}
                        className="text-green-600 hover:text-green-900"
                        title="Postează"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">Înregistrare Jurnal Nouă</h2>

              <form onSubmit={handleSubmit}>
                {/* Header Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.entry_date}
                      onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tip *
                    </label>
                    <select
                      required
                      value={formData.entry_type}
                      onChange={(e) => setFormData({ ...formData, entry_type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="general">General</option>
                      <option value="adjustment">Ajustare</option>
                      <option value="closing">Închidere</option>
                      <option value="opening">Deschidere</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Referință
                    </label>
                    <input
                      type="text"
                      value={formData.reference}
                      onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descriere *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Descrierea înregistrării..."
                  />
                </div>

                {/* Journal Lines */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Linii înregistrare (Dublă intrare)</h3>
                    <button
                      type="button"
                      onClick={addLine}
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Adaugă linie
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Cont</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Descriere</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Debit</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Credit</th>
                          <th className="px-4 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.lines.map((line, index) => (
                          <tr key={index} className="border-t">
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={line.account_id}
                                onChange={(e) => updateLine(index, 'account_id', e.target.value)}
                                placeholder="ID cont"
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={line.description || ''}
                                onChange={(e) => updateLine(index, 'description', e.target.value)}
                                placeholder="Descriere linie"
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={line.debit}
                                onChange={(e) => updateLine(index, 'debit', parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-right"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={line.credit}
                                onChange={(e) => updateLine(index, 'credit', parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-right"
                              />
                            </td>
                            <td className="px-4 py-2">
                              {formData.lines.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => removeLine(index)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-gray-400 font-semibold">
                          <td colSpan={2} className="px-4 py-2 text-right">Total:</td>
                          <td className="px-4 py-2 text-right text-green-600">
                            {formatCurrency(getTotalDebit())}
                          </td>
                          <td className="px-4 py-2 text-right text-red-600">
                            {formatCurrency(getTotalCredit())}
                          </td>
                          <td className="px-4 py-2">
                            {isBalanced() ? (
                              <span title="Echilibrat"><CheckCircle className="w-5 h-5 text-green-600" /></span>
                            ) : (
                              <span title="Neechilibrat"><X className="w-5 h-5 text-red-600" /></span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {!isBalanced() && (
                    <div className="mt-2 text-sm text-red-600">
                      ⚠️ Înregistrarea nu este echilibrată. Diferență: {formatCurrency(Math.abs(getTotalDebit() - getTotalCredit()))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                  >
                    Anulează
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Salvează ca Draft
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Entry Modal */}
      {viewingEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Înregistrare Jurnal #{viewingEntry.entry_number}</h2>
                <button
                  onClick={() => setViewingEntry(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600">Data</p>
                  <p className="font-semibold">{formatDate(viewingEntry.entry_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tip</p>
                  <p className="font-semibold capitalize">{viewingEntry.entry_type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p>{getStatusBadge(viewingEntry.status)}</p>
                </div>
                {viewingEntry.reference && (
                  <div>
                    <p className="text-sm text-gray-600">Referință</p>
                    <p className="font-semibold">{viewingEntry.reference}</p>
                  </div>
                )}
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-1">Descriere</p>
                <p>{viewingEntry.description}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Linii înregistrare</h3>
                <table className="min-w-full border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Cont</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Descriere</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Debit</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingEntry.lines.map((line, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-4 py-2">
                          {line.account_code} - {line.account_name}
                        </td>
                        <td className="px-4 py-2">{line.description}</td>
                        <td className="px-4 py-2 text-right text-green-600">
                          {line.debit > 0 ? formatCurrency(line.debit) : '-'}
                        </td>
                        <td className="px-4 py-2 text-right text-red-600">
                          {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-gray-400 font-semibold">
                      <td colSpan={2} className="px-4 py-2 text-right">Total:</td>
                      <td className="px-4 py-2 text-right text-green-600">
                        {formatCurrency(viewingEntry.total_debit)}
                      </td>
                      <td className="px-4 py-2 text-right text-red-600">
                        {formatCurrency(viewingEntry.total_credit)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {viewingEntry.posted_at && (
                <div className="mt-6 text-sm text-gray-600">
                  Postat la: {formatDate(viewingEntry.posted_at)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JournalEntriesPage;
