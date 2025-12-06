import React from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { EFacturaSettings } from '../../components/efactura';

const EFacturaSettingsPage: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Setări e-Factură ANAF</h1>
        <EFacturaSettings />
      </div>
    </DashboardLayout>
  );
};

export default EFacturaSettingsPage;
