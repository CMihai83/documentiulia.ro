'use client';

/**
 * ANAF Unified Dashboard
 * Comprehensive ANAF command center with 7 tabs:
 * - Overview: SPV connection, compliance score, quick actions
 * - SAF-T D406: Monthly D406 generation/submission
 * - e-Factura: B2B/B2C invoice management
 * - e-Transport: Transport declarations (OUG 41/2022)
 * - Deadlines: Calendar view of ANAF deadlines
 * - Messages: SPV notifications and ANAF messages
 * - History: Unified submission log
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Truck,
  Calendar,
  Mail,
  History,
  Info,
} from 'lucide-react';
import { AnafHeader } from '@/components/dashboard/anaf/anaf-header';
import { SpvConnectionWidget } from '@/components/dashboard/anaf/spv-connection-widget';
import { OverviewTab } from '@/components/dashboard/anaf/overview-tab';
import { SaftD406Tab } from '@/components/dashboard/anaf/saft-d406-tab';
import { EfacturaTab } from '@/components/dashboard/anaf/efactura-tab';
import { EtransportTab } from '@/components/dashboard/anaf/etransport-tab';
import { DeadlinesTab } from '@/components/dashboard/anaf/deadlines-tab';
import { MessagesTab } from '@/components/dashboard/anaf/messages-tab';
import { HistoryTab } from '@/components/dashboard/anaf/history-tab';
import { KeyboardShortcuts } from '@/components/dashboard/anaf/keyboard-shortcuts';

export default function AnafStatusPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    {
      value: 'overview',
      label: 'Panoramă',
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      value: 'saft-d406',
      label: 'SAF-T D406',
      icon: <FileText className="h-4 w-4" />,
    },
    {
      value: 'efactura',
      label: 'e-Factura',
      icon: <Receipt className="h-4 w-4" />,
    },
    {
      value: 'etransport',
      label: 'e-Transport',
      icon: <Truck className="h-4 w-4" />,
    },
    {
      value: 'deadlines',
      label: 'Termene',
      icon: <Calendar className="h-4 w-4" />,
    },
    {
      value: 'messages',
      label: 'Mesaje',
      icon: <Mail className="h-4 w-4" />,
    },
    {
      value: 'history',
      label: 'Istoric',
      icon: <History className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Skip to content link for screen readers */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded"
      >
        Salt la conținut principal
      </a>

      {/* Header with SPV status and quick stats */}
      <AnafHeader />

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList
          className="grid w-full grid-cols-7 bg-muted/50"
          aria-label="Navigare secțiuni ANAF"
        >
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex items-center gap-2 data-[state=active]:bg-background"
              aria-label={`Secțiunea ${tab.label}`}
              aria-controls={`panel-${tab.value}`}
            >
              {tab.icon}
              <span className="hidden md:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent
          value="overview"
          className="space-y-4"
          id="panel-overview"
          role="tabpanel"
          aria-labelledby="tab-overview"
        >
          <div id="main-content">
            <OverviewTab />
          </div>
        </TabsContent>

        {/* SAF-T D406 Tab */}
        <TabsContent
          value="saft-d406"
          className="space-y-4"
          id="panel-saft-d406"
          role="tabpanel"
          aria-labelledby="tab-saft-d406"
        >
          <SaftD406Tab />
        </TabsContent>

        {/* e-Factura Tab */}
        <TabsContent
          value="efactura"
          className="space-y-4"
          id="panel-efactura"
          role="tabpanel"
          aria-labelledby="tab-efactura"
        >
          <EfacturaTab />
        </TabsContent>

        {/* e-Transport Tab */}
        <TabsContent
          value="etransport"
          className="space-y-4"
          id="panel-etransport"
          role="tabpanel"
          aria-labelledby="tab-etransport"
        >
          <EtransportTab />
        </TabsContent>

        {/* Deadlines Tab */}
        <TabsContent
          value="deadlines"
          className="space-y-4"
          id="panel-deadlines"
          role="tabpanel"
          aria-labelledby="tab-deadlines"
        >
          <DeadlinesTab />
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent
          value="messages"
          className="space-y-4"
          id="panel-messages"
          role="tabpanel"
          aria-labelledby="tab-messages"
        >
          <MessagesTab />
        </TabsContent>

        {/* History Tab */}
        <TabsContent
          value="history"
          className="space-y-4"
          id="panel-history"
          role="tabpanel"
          aria-labelledby="tab-history"
        >
          <HistoryTab />
        </TabsContent>
      </Tabs>

      {/* Keyboard shortcuts helper */}
      <KeyboardShortcuts />
    </div>
  );
}
