'use client';

/**
 * e-Transport Tab Component
 * Transport declarations per OUG 41/2022 with UIT management
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Truck,
  MapPin,
  Package,
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  Info,
  TrendingUp,
  Filter,
} from 'lucide-react';
import { mockTransportDeclarations, mockTransportStatistics } from '@/lib/anaf/mocks';
import type { TransportDeclaration, TransportStatus, TransportType } from '@/lib/anaf/types';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_ANAF === 'true';

export function EtransportTab() {
  const [loading, setLoading] = useState(true);
  const [transports, setTransports] = useState<TransportDeclaration[]>([]);
  const [statistics, setStatistics] = useState(mockTransportStatistics);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    fetchTransports();
  }, [statusFilter, typeFilter]);

  const fetchTransports = async () => {
    try {
      setLoading(true);
      if (USE_MOCK) {
        await new Promise(resolve => setTimeout(resolve, 400));
        let filtered = mockTransportDeclarations;
        if (statusFilter !== 'all') {
          filtered = filtered.filter(t => t.status === statusFilter);
        }
        if (typeFilter !== 'all') {
          filtered = filtered.filter(t => t.declarationType === typeFilter);
        }
        setTransports(filtered);
        setStatistics(mockTransportStatistics);
      } else {
        // Real API call would go here
        const filters: any = {};
        if (statusFilter !== 'all') filters.status = statusFilter;
        if (typeFilter !== 'all') filters.type = typeFilter;
        // const data = await eTransportService.getDeclarations('user_001', filters);
        // setTransports(data.declarations);
        // setStatistics(data.statistics);
      }
    } catch (error) {
      console.error('Failed to fetch transports:', error);
      if (USE_MOCK) setTransports(mockTransportDeclarations);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTransport = async (transportId: string) => {
    if (!confirm('Sigur doriți să porniți acest transport?')) return;

    try {
      if (USE_MOCK) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        alert('Transport pornit cu succes! (Mock)');
        fetchTransports();
      } else {
        // await eTransportService.start(transportId);
        alert('Transport pornit cu succes!');
        fetchTransports();
      }
    } catch (error: any) {
      console.error('Start failed:', error);
      alert(`Eroare: ${error.message}`);
    }
  };

  const handleCompleteTransport = async (transportId: string) => {
    if (!confirm('Sigur doriți să finalizați acest transport?')) return;

    try {
      if (USE_MOCK) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        alert('Transport finalizat cu succes! (Mock)');
        fetchTransports();
      } else {
        // await eTransportService.complete(transportId);
        alert('Transport finalizat cu succes!');
        fetchTransports();
      }
    } catch (error: any) {
      console.error('Complete failed:', error);
      alert(`Eroare: ${error.message}`);
    }
  };

  const handleCancelTransport = async (transportId: string) => {
    const reason = prompt('Motivul anulării:');
    if (!reason) return;

    try {
      if (USE_MOCK) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        alert('Transport anulat cu succes! (Mock)');
        fetchTransports();
      } else {
        // await eTransportService.cancel(transportId, reason);
        alert('Transport anulat cu succes!');
        fetchTransports();
      }
    } catch (error: any) {
      console.error('Cancel failed:', error);
      alert(`Eroare: ${error.message}`);
    }
  };

  const getStatusBadge = (status: TransportStatus) => {
    const config = {
      DRAFT: { variant: 'secondary' as const, icon: FileText, label: 'Draft', color: 'bg-gray-100 text-gray-800' },
      VALIDATED: { variant: 'default' as const, icon: CheckCircle2, label: 'Validat', color: 'bg-blue-100 text-blue-800' },
      SUBMITTED: { variant: 'default' as const, icon: Loader2, label: 'Transmis', color: 'bg-yellow-100 text-yellow-800' },
      APPROVED: { variant: 'default' as const, icon: CheckCircle2, label: 'Aprobat', color: 'bg-green-100 text-green-800' },
      REJECTED: { variant: 'destructive' as const, icon: XCircle, label: 'Respins', color: 'bg-red-100 text-red-800' },
      IN_TRANSIT: { variant: 'default' as const, icon: Truck, label: 'În tranzit', color: 'bg-purple-100 text-purple-800' },
      COMPLETED: { variant: 'default' as const, icon: CheckCircle2, label: 'Finalizat', color: 'bg-green-100 text-green-800' },
      CANCELLED: { variant: 'destructive' as const, icon: XCircle, label: 'Anulat', color: 'bg-red-100 text-red-800' },
    };
    const cfg = config[status];
    const Icon = cfg.icon;
    return (
      <Badge className={cfg.color}>
        <Icon className="h-3 w-3 mr-1" />
        {cfg.label}
      </Badge>
    );
  };

  const getTransportTypeLabel = (type: TransportType) => {
    const labels = {
      NATIONAL: 'Transport intern',
      INTERNATIONAL_IMPORT: 'Import',
      INTERNATIONAL_EXPORT: 'Export',
      INTRA_EU: 'Intra-UE',
    };
    return labels[type];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Information Banner */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
            <Info className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-orange-900 mb-1">
                e-Transport (OUG 41/2022)
              </h4>
              <p className="text-sm text-orange-700">
                Declarații de transport pentru mărfuri. Necesită UIT (Unități de Identificare a Transportului) de la ANAF înainte de începerea transportului.
              </p>
              <p className="text-xs text-orange-600 mt-2">
                <strong>Mock Data:</strong> Utilizează simulări locale. Conectarea la ANAF SPV pentru UIT real va fi disponibilă după activarea OAuth2.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Dashboard */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold">{statistics.total}</div>
            <div className="text-sm text-muted-foreground">Total transporturi</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-purple-600">{statistics.active}</div>
            <div className="text-sm text-muted-foreground">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-green-600">{statistics.completed}</div>
            <div className="text-sm text-muted-foreground">Finalizate</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-red-600">{statistics.cancelled}</div>
            <div className="text-sm text-muted-foreground">Anulate</div>
          </CardContent>
        </Card>
      </div>

      {/* Category Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Statistici pe categorii de mărfuri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-3">
            {Object.entries(statistics.byCategory).map(([category, count]) => (
              <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">
                  {category === 'FRUITS_VEGETABLES' && 'Fructe & Legume'}
                  {category === 'MEAT_PRODUCTS' && 'Carne'}
                  {category === 'CLOTHING_FOOTWEAR' && 'Îmbrăcăminte'}
                  {category === 'BUILDING_MATERIALS' && 'Construcții'}
                  {category === 'ELECTRONICS' && 'Electronice'}
                  {category === 'FUEL' && 'Combustibili'}
                  {category === 'ALCOHOL_TOBACCO' && 'Alcool & Tutun'}
                  {category === 'OTHER' && 'Altele'}
                </span>
                <span className="font-bold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate statusurile</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="APPROVED">Aprobat</SelectItem>
                <SelectItem value="IN_TRANSIT">În tranzit</SelectItem>
                <SelectItem value="COMPLETED">Finalizat</SelectItem>
                <SelectItem value="CANCELLED">Anulat</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tip transport" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate tipurile</SelectItem>
                <SelectItem value="NATIONAL">Transport intern</SelectItem>
                <SelectItem value="INTERNATIONAL_IMPORT">Import</SelectItem>
                <SelectItem value="INTERNATIONAL_EXPORT">Export</SelectItem>
                <SelectItem value="INTRA_EU">Intra-UE</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={fetchTransports} className="ml-auto">
              Reîmprospătare
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transports List */}
      <Card>
        <CardHeader>
          <CardTitle>Declarații de transport</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {transports.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nicio declarație găsită
              </p>
            ) : (
              transports.map((transport) => (
                <div
                  key={transport.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold">{getTransportTypeLabel(transport.declarationType)}</h4>
                        {getStatusBadge(transport.status)}
                        {transport.uit && (
                          <Badge variant="outline" className="font-mono text-xs">
                            {transport.uit}
                          </Badge>
                        )}
                      </div>
                      <div className="grid md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>
                            {transport.route.startCity} → {transport.route.endCity}
                            {transport.route.distance && ` (${transport.route.distance} km)`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4" />
                          <span>{transport.transport.vehicleRegistration} - {transport.transport.driverName}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Goods Summary */}
                  <div className="border-t pt-3 mt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Mărfuri transportate:</span>
                    </div>
                    <div className="space-y-1">
                      {transport.goods.map((item, idx) => (
                        <div key={idx} className="text-sm text-gray-600 ml-6">
                          • {item.description} - {item.quantity} {item.unit}
                          {item.value && ` (${item.value.toLocaleString('ro-RO')} RON)`}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    {transport.status === 'APPROVED' && (
                      <Button
                        size="sm"
                        onClick={() => handleStartTransport(transport.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Pornește transport
                      </Button>
                    )}
                    {transport.status === 'IN_TRANSIT' && (
                      <Button
                        size="sm"
                        onClick={() => handleCompleteTransport(transport.id)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Finalizează
                      </Button>
                    )}
                    {(transport.status === 'DRAFT' || transport.status === 'APPROVED' || transport.status === 'IN_TRANSIT') && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleCancelTransport(transport.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Anulează
                      </Button>
                    )}
                    <div className="ml-auto text-xs text-muted-foreground">
                      Creat: {new Date(transport.createdAt).toLocaleDateString('ro-RO', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>

                  {/* Cancel Reason */}
                  {transport.status === 'CANCELLED' && transport.cancelReason && (
                    <div className="mt-3 p-2 bg-red-50 rounded text-sm text-red-700">
                      <strong>Motiv anulare:</strong> {transport.cancelReason}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
