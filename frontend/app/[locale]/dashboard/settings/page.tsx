'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { User, Building2, Bell, Shield, Key, Palette, Globe, CreditCard, Loader2, LayoutDashboard } from 'lucide-react';

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  company: string | null;
  cui: string | null;
  role: string;
  tier: string;
  language: string;
}

export default function SettingsPage() {
  const t = useTranslations();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/v1/auth/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const settingsSections = [
    {
      title: 'Profil',
      description: 'Gestioneaza informatiile personale si preferintele contului',
      href: '/dashboard/settings/profile',
      icon: User,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      title: 'Organizatie',
      description: 'Configureaza detaliile companiei, CUI si adresa',
      href: '/dashboard/settings/organization',
      icon: Building2,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      title: 'Dashboard',
      description: 'Personalizeaza widgeturile si aspectul dashboard-ului',
      href: '/dashboard/settings/dashboard-layout',
      icon: LayoutDashboard,
      color: 'bg-cyan-100 text-cyan-600',
    },
    {
      title: 'Notificari',
      description: 'Seteaza alertele pentru termene limita si conformitate',
      href: '/dashboard/settings/notifications',
      icon: Bell,
      color: 'bg-yellow-100 text-yellow-600',
    },
    {
      title: 'Securitate',
      description: 'Parola, autentificare in doi pasi (2FA) si sesiuni',
      href: '/dashboard/settings/security',
      icon: Shield,
      color: 'bg-red-100 text-red-600',
    },
    {
      title: 'Integrari',
      description: 'Conecteaza ANAF SPV, SAGA si alte servicii',
      href: '/dashboard/settings/integrations',
      icon: Key,
      color: 'bg-green-100 text-green-600',
    },
    {
      title: 'Abonament',
      description: 'Planul curent, facturi si upgrade',
      href: '/dashboard/settings/billing',
      icon: CreditCard,
      color: 'bg-indigo-100 text-indigo-600',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Setari</h1>
        <p className="text-gray-600 mt-1">Gestioneaza contul si preferintele tale</p>
      </div>

      {/* User Overview */}
      {profile && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
              <User className="w-8 h-8 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{profile.name || profile.email}</h2>
              <p className="text-gray-500">{profile.email}</p>
              <div className="flex gap-2 mt-1">
                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                  {profile.role}
                </span>
                <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                  {profile.tier}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {settingsSections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition group"
          >
            <div className={`w-12 h-12 rounded-lg ${section.color} flex items-center justify-center mb-4 group-hover:scale-110 transition`}>
              <section.icon className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{section.title}</h3>
            <p className="text-sm text-gray-500">{section.description}</p>
          </Link>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Statistici Cont</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-primary-600">16</div>
            <div className="text-sm text-gray-500">Facturi</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">11</div>
            <div className="text-sm text-gray-500">Documente</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">5</div>
            <div className="text-sm text-gray-500">Parteneri</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">9</div>
            <div className="text-sm text-gray-500">Angajati</div>
          </div>
        </div>
      </div>
    </div>
  );
}
