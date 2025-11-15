import React from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import MBALibrary from '../components/MBALibrary';

const MBALibraryPage: React.FC = () => {
  return (
    <DashboardLayout>
      <MBALibrary />
    </DashboardLayout>
  );
};

export default MBALibraryPage;
