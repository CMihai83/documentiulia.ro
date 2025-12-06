import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { EFacturaBatchUpload } from '../../components/efactura';
import { useAuth } from '../../contexts/AuthContext';
import { invoiceAPI } from '../../services/api';

interface SimpleInvoice {
  id: string;
  number: string;
  customer_name: string;
  total_amount: number;
  efactura_status?: string;
}

const BatchUploadPage: React.FC = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<SimpleInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      const data = await invoiceAPI.list();
      // Transform to simple invoice format
      const simpleInvoices: SimpleInvoice[] = data.map((inv: any) => ({
        id: inv.id,
        number: inv.invoice_number || inv.number || '',
        customer_name: inv.customer_name || '',
        total_amount: inv.total_amount || 0,
        efactura_status: inv.efactura_status
      }));
      setInvoices(simpleInvoices);
    } catch (error) {
      console.error('Failed to load invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Încărcare în Masă e-Factură</h1>
        <EFacturaBatchUpload 
          companyId={String(user?.company_id || '')}
          invoices={invoices}
          onUploadComplete={(result) => {
            console.log('Batch upload complete:', result);
            loadInvoices(); // Reload invoices after upload
          }}
        />
      </div>
    </DashboardLayout>
  );
};

export default BatchUploadPage;
