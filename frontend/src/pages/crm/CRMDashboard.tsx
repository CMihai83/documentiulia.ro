import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  TrendingUp,
  FileText,
  DollarSign,
  ArrowRight,
  Calendar,
  Target,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Stats {
  total_contacts: number;
  active_opportunities: number;
  open_quotations: number;
  conversion_rate: number;
  total_pipeline_value: number;
  won_this_month: number;
}

const CRMDashboard: React.FC = () => {
  const { } = useAuth();
  const [stats, setStats] = useState<Stats>({
    total_contacts: 0,
    active_opportunities: 0,
    open_quotations: 0,
    conversion_rate: 0,
    total_pipeline_value: 0,
    won_this_month: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // TODO: Fetch real stats from API
      // For now, using mock data
      setStats({
        total_contacts: 156,
        active_opportunities: 23,
        open_quotations: 12,
        conversion_rate: 32.5,
        total_pipeline_value: 245000,
        won_this_month: 8,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Contacte',
      value: stats.total_contacts,
      icon: Users,
      color: 'bg-blue-500',
      link: '/crm/contacts',
    },
    {
      title: 'Oportunități Active',
      value: stats.active_opportunities,
      icon: Target,
      color: 'bg-green-500',
      link: '/crm/opportunities',
    },
    {
      title: 'Oferte Deschise',
      value: stats.open_quotations,
      icon: FileText,
      color: 'bg-purple-500',
      link: '/crm/quotations',
    },
    {
      title: 'Rată Conversie',
      value: `${stats.conversion_rate}%`,
      icon: TrendingUp,
      color: 'bg-orange-500',
    },
    {
      title: 'Valoare Pipeline',
      value: `${(stats.total_pipeline_value / 1000).toFixed(0)}K RON`,
      icon: DollarSign,
      color: 'bg-indigo-500',
    },
  ];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          CRM Dashboard
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Gestionează clienții, oportunitățile și ofertele
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const content = (
            <div className="bg-white rounded-lg shadow p-4 sm:p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className={`${stat.color} p-2 sm:p-3 rounded-lg`}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mb-1">{stat.title}</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                {stat.value}
              </p>
              {stat.link && (
                <div className="mt-3 flex items-center text-xs sm:text-sm text-blue-600">
                  Vezi detalii
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                </div>
              )}
            </div>
          );

          return stat.link ? (
            <Link key={index} to={stat.link}>
              {content}
            </Link>
          ) : (
            <div key={index}>{content}</div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Link
          to="/crm/contacts"
          className="bg-white rounded-lg shadow p-4 sm:p-6 hover:shadow-md transition-shadow border-l-4 border-blue-500"
        >
          <div className="flex items-center mb-3">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 mr-3" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Contacte</h3>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mb-3">
            Gestionează clienții și furnizorii
          </p>
          <div className="flex items-center text-xs sm:text-sm text-blue-600 font-medium">
            Accesează contacte
            <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </Link>

        <Link
          to="/crm/opportunities"
          className="bg-white rounded-lg shadow p-4 sm:p-6 hover:shadow-md transition-shadow border-l-4 border-green-500"
        >
          <div className="flex items-center mb-3">
            <Target className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 mr-3" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Oportunități</h3>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mb-3">
            Pipeline vânzări și oportunități
          </p>
          <div className="flex items-center text-xs sm:text-sm text-green-600 font-medium">
            Vezi pipeline
            <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </Link>

        <Link
          to="/crm/quotations"
          className="bg-white rounded-lg shadow p-4 sm:p-6 hover:shadow-md transition-shadow border-l-4 border-purple-500"
        >
          <div className="flex items-center mb-3">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500 mr-3" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Oferte</h3>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mb-3">
            Creează și trimite oferte de preț
          </p>
          <div className="flex items-center text-xs sm:text-sm text-purple-600 font-medium">
            Creează ofertă
            <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </Link>
      </div>

      {/* Recent Activity Placeholder */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
          Activitate Recentă
        </h2>
        <div className="text-center py-8 sm:py-12">
          <Calendar className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
          <p className="text-sm sm:text-base text-gray-500">
            Nu există activități recente
          </p>
          <p className="text-xs sm:text-sm text-gray-400 mt-2">
            Activitățile din CRM vor apărea aici
          </p>
        </div>
      </div>
    </div>
  );
};

export default CRMDashboard;
