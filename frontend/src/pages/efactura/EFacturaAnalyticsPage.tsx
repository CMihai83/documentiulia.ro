import React from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { EFacturaAnalytics } from '../../components/efactura';

const EFacturaAnalyticsPage: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Statistici e-Factură</h1>
        <EFacturaAnalytics />
      </div>
    </DashboardLayout>
  );
};

export default EFacturaAnalyticsPage;
