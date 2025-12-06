import React from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ReceivedInvoices from '../../components/efactura/ReceivedInvoicesPage';

const ReceivedInvoicesPage: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Facturi Primite (ANAF)</h1>
        <ReceivedInvoices />
      </div>
    </DashboardLayout>
  );
};

export default ReceivedInvoicesPage;
