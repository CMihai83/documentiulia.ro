import React from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import MBAProgressDashboard from '../components/MBAProgressDashboard';

const MBAProgressPage: React.FC = () => {
  return (
    <DashboardLayout>
      <MBAProgressDashboard />
    </DashboardLayout>
  );
};

export default MBAProgressPage;
