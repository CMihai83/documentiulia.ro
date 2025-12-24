'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import {
  Package,
  Truck,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Navigation,
  Calendar,
  User,
  Phone,
  Mail,
  FileText,
  Download,
  Printer,
  Edit,
  Route,
  Timer,
  Box,
  Weight,
  Ruler,
  Barcode,
  Camera,
  MessageSquare,
  Send,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  ExternalLink,
  Copy,
  QrCode,
} from 'lucide-react';

interface ShipmentDetail {
  id: string;
  trackingNumber: string;
  status: 'PENDING' | 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED' | 'RETURNED' | 'CANCELLED';
  priority: 'STANDARD' | 'EXPRESS' | 'URGENT' | 'SAME_DAY';
  createdAt: string;
  estimatedDelivery?: string;
  actualDelivery?: string;

  // Sender info
  sender: {
    name: string;
    company?: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    phone?: string;
    email?: string;
  };

  // Recipient info
  recipient: {
    name: string;
    company?: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    phone?: string;
    email?: string;
    deliveryInstructions?: string;
  };

  // Package details
  packages: {
    id: string;
    weight: number;
    dimensions: { length: number; width: number; height: number };
    contents?: string;
    declaredValue?: number;
    fragile?: boolean;
  }[];

  // Shipping details
  serviceType: string;
  carrier?: string;
  vehiclePlate?: string;
  driverName?: string;
  routeId?: string;

  // Financial
  shippingCost: number;
  insuranceCost?: number;
  codAmount?: number;
  currency: string;

  // Related documents
  orderId?: string;
  invoiceId?: string;
  awbNumber?: string;

  // Additional info
  notes?: string;
  tags?: string[];
  signature?: string;
  proofOfDeliveryPhoto?: string;
}

interface TrackingEvent {
  id: string;
  timestamp: string;
  status: string;
  location?: string;
  description: string;
  latitude?: number;
  longitude?: number;
  performedBy?: string;
}

interface ShipmentComment {
  id: string;
  author: string;
  authorRole: string;
  content: string;
  createdAt: string;
  isInternal: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'PENDING': 'bg-gray-100 text-gray-800',
    'PICKED_UP': 'bg-blue-100 text-blue-800',
    'IN_TRANSIT': 'bg-indigo-100 text-indigo-800',
    'OUT_FOR_DELIVERY': 'bg-yellow-100 text-yellow-800',
    'DELIVERED': 'bg-green-100 text-green-800',
    'FAILED': 'bg-red-100 text-red-800',
    'RETURNED': 'bg-orange-100 text-orange-800',
    'CANCELLED': 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'PENDING': 'In Asteptare',
    'PICKED_UP': 'Ridicat',
    'IN_TRANSIT': 'In Tranzit',
    'OUT_FOR_DELIVERY': 'In Livrare',
    'DELIVERED': 'Livrat',
    'FAILED': 'Esuat',
    'RETURNED': 'Returnat',
    'CANCELLED': 'Anulat',
    'STANDARD': 'Standard',
    'EXPRESS': 'Express',
    'URGENT': 'Urgent',
    'SAME_DAY': 'Aceeasi Zi',
  };
  return labels[status] || status;
};

const getPriorityColor = (priority: string): string => {
  const colors: Record<string, string> = {
    'STANDARD': 'bg-gray-100 text-gray-700',
    'EXPRESS': 'bg-blue-100 text-blue-700',
    'URGENT': 'bg-orange-100 text-orange-700',
    'SAME_DAY': 'bg-red-100 text-red-700',
  };
  return colors[priority] || 'bg-gray-100 text-gray-700';
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'DELIVERED':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'FAILED':
    case 'CANCELLED':
      return <XCircle className="w-5 h-5 text-red-500" />;
    case 'IN_TRANSIT':
    case 'OUT_FOR_DELIVERY':
      return <Truck className="w-5 h-5 text-blue-500" />;
    case 'PICKED_UP':
      return <Package className="w-5 h-5 text-indigo-500" />;
    default:
      return <Clock className="w-5 h-5 text-gray-500" />;
  }
};

export default function ShipmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const shipmentId = params.id as string;

  const [shipment, setShipment] = useState<ShipmentDetail | null>(null);
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [comments, setComments] = useState<ShipmentComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'tracking' | 'packages' | 'documents' | 'comments'>('overview');
  const [newComment, setNewComment] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);

  useEffect(() => {
    if (shipmentId) {
      fetchShipmentDetails();
    }
  }, [shipmentId]);

  const fetchShipmentDetails = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };

      const shipmentRes = await fetch(`${API_URL}/logistics/shipments/${shipmentId}`, { headers });
      if (shipmentRes.ok) {
        setShipment(await shipmentRes.json());
      }

      const eventsRes = await fetch(`${API_URL}/logistics/shipments/${shipmentId}/tracking`, { headers });
      if (eventsRes.ok) {
        setEvents(await eventsRes.json());
      }

      const commentsRes = await fetch(`${API_URL}/logistics/shipments/${shipmentId}/comments`, { headers });
      if (commentsRes.ok) {
        setComments(await commentsRes.json());
      }
    } catch (error) {
      console.error('Error fetching shipment details:', error);
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    setShipment({
      id: shipmentId,
      trackingNumber: 'TRK-2024-123456',
      status: 'IN_TRANSIT',
      priority: 'EXPRESS',
      createdAt: '2024-12-14T08:30:00Z',
      estimatedDelivery: '2024-12-17T18:00:00Z',
      sender: {
        name: 'Tech Solutions SRL',
        company: 'Tech Solutions SRL',
        address: 'Str. Industriilor 45',
        city: 'Bucuresti',
        postalCode: '012345',
        country: 'Romania',
        phone: '+40212345678',
        email: 'expeditii@techsolutions.ro',
      },
      recipient: {
        name: 'Maria Ionescu',
        company: 'ABC Distribution SRL',
        address: 'Bd. Unirii 100, Ap. 5',
        city: 'Cluj-Napoca',
        postalCode: '400123',
        country: 'Romania',
        phone: '+40722123456',
        email: 'maria.ionescu@abc.ro',
        deliveryInstructions: 'Livrare la receptie, etaj 2. Suna inainte cu 30 minute.',
      },
      packages: [
        {
          id: 'pkg-001',
          weight: 2.5,
          dimensions: { length: 40, width: 30, height: 20 },
          contents: 'Laptop Dell Latitude',
          declaredValue: 4500,
          fragile: true,
        },
        {
          id: 'pkg-002',
          weight: 0.5,
          dimensions: { length: 20, width: 15, height: 5 },
          contents: 'Accesorii IT',
          declaredValue: 350,
          fragile: false,
        },
      ],
      serviceType: 'Express Business',
      carrier: 'DocumentIulia Logistics',
      vehiclePlate: 'B-123-LOG',
      driverName: 'Ion Popescu',
      routeId: 'route-001',
      shippingCost: 45.00,
      insuranceCost: 15.00,
      currency: 'RON',
      orderId: 'ORD-2024-5678',
      invoiceId: 'FV-2024-1234',
      awbNumber: 'AWB-RO-2024-789012',
      notes: 'Client VIP - prioritate ridicata',
      tags: ['fragil', 'prioritar', 'asigurat'],
    });

    setEvents([
      {
        id: 'evt-001',
        timestamp: '2024-12-14T08:30:00Z',
        status: 'PENDING',
        location: 'Bucuresti',
        description: 'Comanda inregistrata in sistem',
        performedBy: 'System',
      },
      {
        id: 'evt-002',
        timestamp: '2024-12-14T14:15:00Z',
        status: 'PICKED_UP',
        location: 'Bucuresti - Depozit Central',
        description: 'Colet ridicat de la expeditor',
        latitude: 44.4268,
        longitude: 26.1025,
        performedBy: 'Ion Popescu',
      },
      {
        id: 'evt-003',
        timestamp: '2024-12-15T06:00:00Z',
        status: 'IN_TRANSIT',
        location: 'Bucuresti - Hub Sortare',
        description: 'Colet procesat si incarcat pentru transport',
        performedBy: 'Sorting Center',
      },
      {
        id: 'evt-004',
        timestamp: '2024-12-15T16:30:00Z',
        status: 'IN_TRANSIT',
        location: 'Ploiesti - Punct Tranzit',
        description: 'Colet in tranzit catre destinatie',
        latitude: 44.9432,
        longitude: 26.0254,
        performedBy: 'Transport Hub',
      },
      {
        id: 'evt-005',
        timestamp: '2024-12-16T09:00:00Z',
        status: 'IN_TRANSIT',
        location: 'Brasov - Hub Regional',
        description: 'Colet sosit la hub-ul regional',
        latitude: 45.6580,
        longitude: 25.6012,
        performedBy: 'Regional Hub',
      },
    ]);

    setComments([
      {
        id: 'cmt-001',
        author: 'Maria Ionescu',
        authorRole: 'Destinatar',
        content: 'Va rog sa ma sunati cu 30 de minute inainte de livrare.',
        createdAt: '2024-12-14T10:00:00Z',
        isInternal: false,
      },
      {
        id: 'cmt-002',
        author: 'Ion Popescu',
        authorRole: 'Curier',
        content: 'Colet ridicat fara probleme. Stare perfecta.',
        createdAt: '2024-12-14T14:20:00Z',
        isInternal: true,
      },
      {
        id: 'cmt-003',
        author: 'Dispecerat',
        authorRole: 'Operator',
        content: 'ETA actualizat pentru 17.12 - trafic intens pe ruta.',
        createdAt: '2024-12-15T18:00:00Z',
        isInternal: true,
      },
    ]);
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/logistics/shipments/${shipmentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success('Status actualizat cu succes');
        fetchShipmentDetails();
        setShowStatusModal(false);
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      // Update locally for demo
      if (shipment) {
        setShipment({ ...shipment, status: newStatus as ShipmentDetail['status'] });
        setEvents([
          {
            id: `evt-${Date.now()}`,
            timestamp: new Date().toISOString(),
            status: newStatus,
            location: 'Manual Update',
            description: `Status actualizat la ${getStatusLabel(newStatus)}`,
            performedBy: 'Operator',
          },
          ...events,
        ]);
        toast.success('Status actualizat (demo)');
        setShowStatusModal(false);
      }
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/logistics/shipments/${shipmentId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newComment, isInternal: true }),
      });

      if (response.ok) {
        toast.success('Comentariu adaugat');
        fetchShipmentDetails();
        setNewComment('');
      } else {
        throw new Error('Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      // Add locally for demo
      setComments([
        ...comments,
        {
          id: `cmt-${Date.now()}`,
          author: 'Utilizator',
          authorRole: 'Operator',
          content: newComment,
          createdAt: new Date().toISOString(),
          isInternal: true,
        },
      ]);
      toast.success('Comentariu adaugat (demo)');
      setNewComment('');
    }
  };

  const handleCopyTracking = () => {
    if (shipment?.trackingNumber) {
      navigator.clipboard.writeText(shipment.trackingNumber);
      toast.success('Numar tracking copiat');
    }
  };

  const handlePrintLabel = () => {
    toast.success('Se genereaza eticheta...');
    // In a real app, this would generate a PDF label
  };

  const handleDownloadPOD = () => {
    toast.success('Se descarca dovada livrarii...');
    // In a real app, this would download the proof of delivery
  };

  const handleTrackOnMap = () => {
    const lastEvent = events.find(e => e.latitude && e.longitude);
    if (lastEvent?.latitude && lastEvent?.longitude) {
      window.open(`https://www.google.com/maps?q=${lastEvent.latitude},${lastEvent.longitude}`, '_blank');
    } else {
      toast.error('Pozitia GPS nu este disponibila');
    }
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (date: string): string => {
    return new Date(date).toLocaleString('ro-RO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTotalWeight = (): number => {
    return shipment?.packages.reduce((sum, pkg) => sum + pkg.weight, 0) || 0;
  };

  const getTotalValue = (): number => {
    return shipment?.packages.reduce((sum, pkg) => sum + (pkg.declaredValue || 0), 0) || 0;
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Expeditie negasita</h2>
        <p className="text-gray-500 mb-4">Expediția solicitată nu a fost găsită sau a fost ștearsă.</p>
        <button
          onClick={() => router.push('/dashboard/logistics')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Inapoi la Logistica
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/logistics')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{shipment.trackingNumber}</h1>
              <button
                onClick={handleCopyTracking}
                className="p-1 hover:bg-gray-100 rounded"
                title="Copiaza"
              >
                <Copy className="w-4 h-4 text-gray-500" />
              </button>
              <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(shipment.status)}`}>
                {getStatusLabel(shipment.status)}
              </span>
              <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(shipment.priority)}`}>
                {getStatusLabel(shipment.priority)}
              </span>
            </div>
            <p className="text-gray-600">
              Creat: {formatDateTime(shipment.createdAt)} • AWB: {shipment.awbNumber || 'N/A'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchShipmentDetails}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            title="Actualizeaza"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={handleTrackOnMap}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Navigation className="w-4 h-4" />
            Urmarire GPS
          </button>
          <button
            onClick={handlePrintLabel}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Printer className="w-4 h-4" />
            Eticheta
          </button>
          <button
            onClick={() => setShowStatusModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Edit className="w-4 h-4" />
            Actualizeaza Status
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          {['PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].map((step, index) => {
            const stepIndex = ['PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].indexOf(shipment.status);
            const isCompleted = index <= stepIndex;
            const isCurrent = index === stepIndex;

            return (
              <div key={step} className="flex-1 relative">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isCurrent
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isCompleted && index < stepIndex ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className={`mt-2 text-xs text-center ${isCurrent ? 'font-medium text-blue-600' : 'text-gray-500'}`}>
                    {getStatusLabel(step)}
                  </span>
                </div>
                {index < 4 && (
                  <div
                    className={`absolute top-5 left-1/2 w-full h-0.5 ${
                      index < stepIndex ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
        {shipment.estimatedDelivery && (
          <div className="text-center">
            <span className="text-sm text-gray-500">Livrare estimata: </span>
            <span className="font-medium text-gray-900">{formatDateTime(shipment.estimatedDelivery)}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Prezentare', icon: Package },
            { id: 'tracking', label: 'Tracking', icon: Route },
            { id: 'packages', label: 'Colete', icon: Box },
            { id: 'documents', label: 'Documente', icon: FileText },
            { id: 'comments', label: 'Comentarii', icon: MessageSquare },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.id === 'comments' && comments.length > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-gray-100 rounded-full">{comments.length}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sender Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-500" />
              Expeditor
            </h3>
            <div className="space-y-3">
              <div>
                <p className="font-medium text-gray-900">{shipment.sender.name}</p>
                {shipment.sender.company && (
                  <p className="text-sm text-gray-500">{shipment.sender.company}</p>
                )}
              </div>
              <div className="text-sm text-gray-600">
                <p>{shipment.sender.address}</p>
                <p>{shipment.sender.postalCode} {shipment.sender.city}</p>
                <p>{shipment.sender.country}</p>
              </div>
              {shipment.sender.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  {shipment.sender.phone}
                </div>
              )}
              {shipment.sender.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  {shipment.sender.email}
                </div>
              )}
            </div>
          </div>

          {/* Recipient Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-500" />
              Destinatar
            </h3>
            <div className="space-y-3">
              <div>
                <p className="font-medium text-gray-900">{shipment.recipient.name}</p>
                {shipment.recipient.company && (
                  <p className="text-sm text-gray-500">{shipment.recipient.company}</p>
                )}
              </div>
              <div className="text-sm text-gray-600">
                <p>{shipment.recipient.address}</p>
                <p>{shipment.recipient.postalCode} {shipment.recipient.city}</p>
                <p>{shipment.recipient.country}</p>
              </div>
              {shipment.recipient.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  {shipment.recipient.phone}
                </div>
              )}
              {shipment.recipient.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  {shipment.recipient.email}
                </div>
              )}
              {shipment.recipient.deliveryInstructions && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800">Instructiuni Livrare:</p>
                  <p className="text-sm text-yellow-700">{shipment.recipient.deliveryInstructions}</p>
                </div>
              )}
            </div>
          </div>

          {/* Shipping Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-purple-500" />
              Detalii Transport
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Serviciu</p>
                <p className="font-medium">{shipment.serviceType}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Transportator</p>
                <p className="font-medium">{shipment.carrier || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Vehicul</p>
                <p className="font-medium">{shipment.vehiclePlate || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Sofer</p>
                <p className="font-medium">{shipment.driverName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Greutate Totala</p>
                <p className="font-medium">{getTotalWeight()} kg</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Nr. Colete</p>
                <p className="font-medium">{shipment.packages.length}</p>
              </div>
            </div>

            {shipment.tags && shipment.tags.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-2">Etichete</p>
                <div className="flex flex-wrap gap-2">
                  {shipment.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Financial Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-500" />
              Informatii Financiare
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Cost Transport</span>
                <span className="font-medium">{shipment.shippingCost.toFixed(2)} {shipment.currency}</span>
              </div>
              {shipment.insuranceCost && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Asigurare</span>
                  <span className="font-medium">{shipment.insuranceCost.toFixed(2)} {shipment.currency}</span>
                </div>
              )}
              {shipment.codAmount && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Ramburs (COD)</span>
                  <span className="font-medium">{shipment.codAmount.toFixed(2)} {shipment.currency}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Valoare Declarata</span>
                <span className="font-medium">{getTotalValue().toFixed(2)} {shipment.currency}</span>
              </div>
              <div className="pt-3 border-t border-gray-200 flex justify-between">
                <span className="font-medium text-gray-900">Total</span>
                <span className="font-bold text-gray-900">
                  {(shipment.shippingCost + (shipment.insuranceCost || 0)).toFixed(2)} {shipment.currency}
                </span>
              </div>
            </div>

            {/* Related Documents */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-2">Documente Legate</p>
              <div className="space-y-2">
                {shipment.orderId && (
                  <button className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800">
                    <ExternalLink className="w-4 h-4" />
                    Comanda: {shipment.orderId}
                  </button>
                )}
                {shipment.invoiceId && (
                  <button className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800">
                    <ExternalLink className="w-4 h-4" />
                    Factura: {shipment.invoiceId}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tracking' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Istoricul Tracking</h3>
          </div>
          <div className="p-4">
            <div className="relative">
              {events.map((event, index) => (
                <div key={event.id} className="flex gap-4 pb-8 last:pb-0">
                  {/* Timeline line */}
                  <div className="relative">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        index === 0 ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                    />
                    {index < events.length - 1 && (
                      <div className="absolute top-3 left-1.5 w-0.5 h-full -ml-px bg-gray-200" />
                    )}
                  </div>

                  {/* Event content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{event.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {event.location && (
                            <span className="flex items-center gap-1 text-sm text-gray-500">
                              <MapPin className="w-3 h-3" />
                              {event.location}
                            </span>
                          )}
                          {event.performedBy && (
                            <span className="flex items-center gap-1 text-sm text-gray-500">
                              <User className="w-3 h-3" />
                              {event.performedBy}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(event.status)}`}>
                          {getStatusLabel(event.status)}
                        </span>
                        <p className="text-xs text-gray-400 mt-1">{formatDateTime(event.timestamp)}</p>
                      </div>
                    </div>
                    {event.latitude && event.longitude && (
                      <button
                        onClick={() => window.open(`https://www.google.com/maps?q=${event.latitude},${event.longitude}`, '_blank')}
                        className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                      >
                        <Navigation className="w-3 h-3" />
                        Vezi pe harta
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'packages' && (
        <div className="space-y-4">
          {shipment.packages.map((pkg, index) => (
            <div key={pkg.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Box className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Colet {index + 1}</h4>
                    <p className="text-sm text-gray-500">{pkg.id}</p>
                  </div>
                </div>
                {pkg.fragile && (
                  <span className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                    <AlertTriangle className="w-3 h-3" />
                    Fragil
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <Weight className="w-4 h-4" />
                    Greutate
                  </div>
                  <p className="font-medium">{pkg.weight} kg</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <Ruler className="w-4 h-4" />
                    Dimensiuni
                  </div>
                  <p className="font-medium">{pkg.dimensions.length} x {pkg.dimensions.width} x {pkg.dimensions.height} cm</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <Package className="w-4 h-4" />
                    Continut
                  </div>
                  <p className="font-medium">{pkg.contents || 'N/A'}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <FileText className="w-4 h-4" />
                    Valoare Declarata
                  </div>
                  <p className="font-medium">{pkg.declaredValue?.toFixed(2) || 'N/A'} {shipment.currency}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
                <button className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Barcode className="w-4 h-4" />
                  Eticheta
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                  <QrCode className="w-4 h-4" />
                  QR Code
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">AWB / Scrisoare Transport</h4>
                <p className="text-sm text-gray-500">{shipment.awbNumber}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                <Download className="w-4 h-4" />
                Descarca
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                <Printer className="w-4 h-4" />
                Printeaza
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Barcode className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Etichete Colete</h4>
                <p className="text-sm text-gray-500">{shipment.packages.length} etichete</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                <Download className="w-4 h-4" />
                Descarca
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                <Printer className="w-4 h-4" />
                Printeaza
              </button>
            </div>
          </div>

          {shipment.status === 'DELIVERED' && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Dovada Livrare (POD)</h4>
                  <p className="text-sm text-gray-500">Semnatura & foto</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadPOD}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                >
                  <Download className="w-4 h-4" />
                  Descarca
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <FileText className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Declaratie Vamala</h4>
                <p className="text-sm text-gray-500">Daca este cazul</p>
              </div>
            </div>
            <button className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
              Genereaza
            </button>
          </div>
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="space-y-6">
          {/* Add comment */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Adauga Comentariu</h3>
            <div className="flex gap-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Scrie un comentariu..."
                rows={3}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                Trimite
              </button>
            </div>
          </div>

          {/* Comments list */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Comentarii ({comments.length})</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {comments.map((comment) => (
                <div key={comment.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{comment.author}</span>
                        <span className="text-xs text-gray-500">{comment.authorRole}</span>
                        {comment.isInternal && (
                          <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                            Intern
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
                      <p className="text-xs text-gray-400 mt-2">{formatDateTime(comment.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Niciun comentariu</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Actualizeaza Status</h3>
            </div>
            <div className="p-6 space-y-3">
              {['PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED', 'CANCELLED'].map((status) => (
                <button
                  key={status}
                  onClick={() => handleUpdateStatus(status)}
                  disabled={status === shipment.status}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border ${
                    status === shipment.status
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  } disabled:opacity-50`}
                >
                  {getStatusIcon(status)}
                  <span className="font-medium">{getStatusLabel(status)}</span>
                  {status === shipment.status && (
                    <span className="ml-auto text-xs text-blue-600">Status curent</span>
                  )}
                </button>
              ))}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Anuleaza
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
