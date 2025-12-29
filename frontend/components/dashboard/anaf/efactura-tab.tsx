'use client';

/**
 * e-Factura Tab Component
 * B2B and B2C invoice management with batch operations
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Receipt,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Loader2,
  FileText,
} from 'lucide-react';
import { efacturaB2BService } from '@/lib/anaf/services';
import { mockEfacturaB2BInvoices, mockEfacturaB2BDashboard } from '@/lib/anaf/mocks';
import type { EfacturaB2BInvoice } from '@/lib/anaf/types';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_ANAF === 'true';

export function EfacturaTab() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<EfacturaB2BInvoice[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      if (USE_MOCK) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setInvoices(mockEfacturaB2BInvoices);
      } else {
        const data = await efacturaB2BService.getInvoices('user_001');
        setInvoices(data.invoices);
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      if (USE_MOCK) setInvoices(mockEfacturaB2BInvoices);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const draftIds = invoices.filter(inv => inv.efacturaStatus === 'DRAFT').map(inv => inv.id);
      setSelectedInvoices(new Set(draftIds));
    } else {
      setSelectedInvoices(new Set());
    }
  };

  const handleSelectInvoice = (invoiceId: string, checked: boolean) => {
    const newSelected = new Set(selectedInvoices);
    if (checked) {
      newSelected.add(invoiceId);
    } else {
      newSelected.delete(invoiceId);
    }
    setSelectedInvoices(newSelected);
  };

  const handleBatchSubmit = async () => {
    if (selectedInvoices.size === 0) return;
    if (!confirm(`Sigur doriți să transmiteți ${selectedInvoices.size} facturi către ANAF?`)) return;

    try {
      setSubmitting(true);
      if (USE_MOCK) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        alert(`${selectedInvoices.size} facturi transmise cu succes către ANAF! (Mock)`);
        setSelectedInvoices(new Set());
        fetchInvoices();
      } else {
        // Submit each invoice
        for (const invoiceId of selectedInvoices) {
          await efacturaB2BService.submit(invoiceId, 'user_001');
        }
        alert(`${selectedInvoices.size} facturi transmise cu succes!`);
        setSelectedInvoices(new Set());
        fetchInvoices();
      }
    } catch (error: any) {
      console.error('Batch submit failed:', error);
      alert(`Eroare la transmitere: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    const config = {
      DRAFT: { variant: 'secondary' as const, icon: FileText, label: 'Draft' },
      SUBMITTED: { variant: 'default' as const, icon: Clock, label: 'Transmis' },
      ACCEPTED: { variant: 'default' as const, icon: CheckCircle2, label: 'Acceptat' },
      REJECTED: { variant: 'destructive' as const, icon: XCircle, label: 'Respins' },
    };
    const s = status || 'DRAFT';
    const cfg = config[s as keyof typeof config] || config.DRAFT;
    const Icon = cfg.icon;
    return (
      <Badge variant={cfg.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {cfg.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const draftInvoices = invoices.filter(inv => !inv.efacturaStatus || inv.efacturaStatus === 'DRAFT');
  const allDraftSelected = draftInvoices.length > 0 && draftInvoices.every(inv => selectedInvoices.has(inv.id));

  return (
    <div className="space-y-4">
      <Tabs defaultValue="b2b" className="space-y-4">
        <TabsList>
          <TabsTrigger value="b2b">B2B - Business to Business</TabsTrigger>
          <TabsTrigger value="b2c">B2C - Business to Consumer</TabsTrigger>
        </TabsList>

        {/* B2B Tab */}
        <TabsContent value="b2b" className="space-y-4">
          {/* Batch Actions */}
          {draftInvoices.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={allDraftSelected}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm font-medium">
                      {selectedInvoices.size > 0
                        ? `${selectedInvoices.size} facturi selectate`
                        : 'Selectați toate facturile draft'}
                    </span>
                  </div>
                  <Button
                    onClick={handleBatchSubmit}
                    disabled={selectedInvoices.size === 0 || submitting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Transmitere...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Transmitere selectate ({selectedInvoices.size})
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Invoice List */}
          <Card>
            <CardHeader>
              <CardTitle>Facturi B2B emise</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {invoices.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nicio factură găsită
                  </p>
                ) : (
                  invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50"
                    >
                      {(!invoice.efacturaStatus || invoice.efacturaStatus === 'DRAFT') && (
                        <Checkbox
                          checked={selectedInvoices.has(invoice.id)}
                          onCheckedChange={(checked) => handleSelectInvoice(invoice.id, checked as boolean)}
                        />
                      )}
                      <div className="flex-1 grid grid-cols-5 gap-4">
                        <div>
                          <p className="font-semibold">{invoice.invoiceNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(invoice.invoiceDate).toLocaleDateString('ro-RO')}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm">{invoice.partnerName}</p>
                          <p className="text-xs text-muted-foreground">CUI: {invoice.partnerCui}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            {invoice.grossAmount.toLocaleString('ro-RO', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })} {invoice.currency}
                          </p>
                        </div>
                        <div className="flex justify-center">
                          {getStatusBadge(invoice.efacturaStatus)}
                        </div>
                        <div className="flex justify-end gap-2">
                          {invoice.efacturaStatus === 'DRAFT' && (
                            <Button size="sm" variant="outline">
                              <FileText className="h-4 w-4 mr-1" />
                              XML
                            </Button>
                          )}
                          {invoice.efacturaId && (
                            <Button size="sm" variant="outline">
                              <Download className="h-4 w-4 mr-1" />
                              XML
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* B2C Tab */}
        <TabsContent value="b2c" className="space-y-4">
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm mb-2">
                Funcționalitatea B2C va fi disponibilă în curând.
              </p>
              <p className="text-xs">
                e-Factura B2C este obligatorie din ianuarie 2025 cu retenție 10 ani.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
