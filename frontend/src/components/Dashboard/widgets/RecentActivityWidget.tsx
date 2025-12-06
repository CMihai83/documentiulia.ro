import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useI18n } from '../../../i18n/I18nContext';
import { WidgetLoading, WidgetEmpty } from '../WidgetWrapper';

interface Activity {
  id: string;
  type: string;
  description: string;
  created_at: string;
  user_name?: string;
}

const RecentActivityWidget: React.FC = () => {
  const { token, companyId } = useAuth();
  const { language } = useI18n();
  const isRo = language === 'ro';
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await fetch('/api/v1/activity/recent.php?limit=5', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Company-ID': companyId || ''
          }
        });
        const result = await response.json();
        if (result.success) {
          setActivities(result.data);
        } else {
          // Mock data for demo
          setActivities([
            { id: '1', type: 'invoice_created', description: isRo ? 'Factură #INV-001 creată' : 'Invoice #INV-001 created', created_at: new Date().toISOString() },
            { id: '2', type: 'payment_received', description: isRo ? 'Plată primită: 1,500 RON' : 'Payment received: 1,500 RON', created_at: new Date(Date.now() - 3600000).toISOString() },
            { id: '3', type: 'expense_added', description: isRo ? 'Cheltuială adăugată: Furnizori' : 'Expense added: Suppliers', created_at: new Date(Date.now() - 7200000).toISOString() },
            { id: '4', type: 'contact_created', description: isRo ? 'Contact nou: ABC SRL' : 'New contact: ABC SRL', created_at: new Date(Date.now() - 86400000).toISOString() }
          ]);
        }
      } catch (err) {
        // Mock data for demo
        setActivities([
          { id: '1', type: 'invoice_created', description: isRo ? 'Factură #INV-001 creată' : 'Invoice #INV-001 created', created_at: new Date().toISOString() },
          { id: '2', type: 'payment_received', description: isRo ? 'Plată primită: 1,500 RON' : 'Payment received: 1,500 RON', created_at: new Date(Date.now() - 3600000).toISOString() }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [token, companyId, isRo]);

  if (loading) return <WidgetLoading />;
  if (activities.length === 0) return <WidgetEmpty />;

  const getIcon = (type: string) => {
    switch (type) {
      case 'invoice_created': return '📄';
      case 'payment_received': return '💵';
      case 'expense_added': return '🧾';
      case 'contact_created': return '👤';
      default: return '📌';
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (hours < 1) return isRo ? 'Acum' : 'Just now';
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  return (
    <div className="space-y-3">
      {activities.map(activity => (
        <div key={activity.id} className="flex items-start gap-3">
          <span className="text-lg">{getIcon(activity.type)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 truncate">{activity.description}</p>
            <p className="text-xs text-gray-400">{formatTime(activity.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecentActivityWidget;
