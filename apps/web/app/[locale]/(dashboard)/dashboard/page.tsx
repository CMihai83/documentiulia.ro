'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Plus,
  FileText,
  Receipt,
  Users,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import StatsCards from '@/components/dashboard/stats-cards';
import CashFlowChart from '@/components/dashboard/cash-flow-chart';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

export default function DashboardPage() {
  const t = useTranslations();

  const quickActions = [
    {
      label: 'Factură Nouă',
      href: '/invoices/new',
      icon: FileText,
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    },
    {
      label: 'Cheltuială Nouă',
      href: '/expenses/new',
      icon: Receipt,
      color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    },
    {
      label: 'Contact Nou',
      href: '/contacts/new',
      icon: Users,
      color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    },
  ];

  const alerts = [
    {
      type: 'warning',
      message: 'Termen TVA în 5 zile',
      icon: AlertCircle,
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
    },
    {
      type: 'error',
      message: '3 facturi restante',
      icon: XCircle,
      color: 'text-red-600 bg-red-50 dark:bg-red-900/20',
    },
    {
      type: 'info',
      message: 'e-Factura nouă primită',
      icon: CheckCircle2,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    },
  ];

  const recentActivity = [
    {
      type: 'invoice',
      title: 'Factură #2024-0156 trimisă',
      client: 'SC Example SRL',
      amount: '2,500.00 RON',
      time: 'Acum 2 ore',
      status: 'sent',
    },
    {
      type: 'payment',
      title: 'Plată primită',
      client: 'SC Client SRL',
      amount: '1,800.00 RON',
      time: 'Acum 4 ore',
      status: 'success',
    },
    {
      type: 'expense',
      title: 'Cheltuială înregistrată',
      client: 'Birou',
      amount: '450.00 RON',
      time: 'Ieri',
      status: 'pending',
    },
    {
      type: 'efactura',
      title: 'e-Factura validată ANAF',
      client: 'SC Partner SRL',
      amount: '3,200.00 RON',
      time: 'Ieri',
      status: 'success',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <motion.div {...fadeInUp}>
        <h1 className="text-2xl sm:text-3xl font-bold">
          {t('dashboard.welcome')}, Alexandru 👋
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Iată un rezumat al activității din această lună.
        </p>
      </motion.div>

      {/* Stats Cards */}
      <StatsCards />

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cash Flow Chart - Takes 2 columns */}
        <div className="lg:col-span-2">
          <CashFlowChart />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
          >
            <h2 className="font-semibold mb-4">{t('dashboard.quickActions')}</h2>
            <div className="space-y-2">
              {quickActions.map((action) => (
                <a
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                >
                  <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center`}>
                    <action.icon className="w-5 h-5" />
                  </div>
                  <span className="font-medium">{action.label}</span>
                  <ArrowRight className="w-4 h-4 ml-auto text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                </a>
              ))}
            </div>
          </motion.div>

          {/* Alerts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
          >
            <h2 className="font-semibold mb-4">{t('dashboard.alerts.title')}</h2>
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-xl ${alert.color}`}
                >
                  <alert.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium">{alert.message}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold">{t('dashboard.recentActivity')}</h2>
          <a
            href="/activity"
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            Vezi tot
          </a>
        </div>

        <div className="space-y-4">
          {recentActivity.map((activity, index) => (
            <div
              key={index}
              className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  activity.status === 'success'
                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                    : activity.status === 'pending'
                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                }`}
              >
                {activity.type === 'invoice' && <FileText className="w-5 h-5" />}
                {activity.type === 'payment' && <TrendingUp className="w-5 h-5" />}
                {activity.type === 'expense' && <TrendingDown className="w-5 h-5" />}
                {activity.type === 'efactura' && <CheckCircle2 className="w-5 h-5" />}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{activity.title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{activity.client}</p>
              </div>

              <div className="text-right">
                <p className="font-semibold">{activity.amount}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-end gap-1">
                  <Clock className="w-3 h-3" />
                  {activity.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
