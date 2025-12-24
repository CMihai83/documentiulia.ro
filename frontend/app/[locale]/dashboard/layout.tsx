'use client';

import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';
import { CommandPalette } from '@/components/CommandPalette';
import { WebSocketProvider, WebSocketStatusIndicator } from '@/contexts/WebSocketContext';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      const locale = pathname.split('/')[1];
      router.replace(`/${locale}/login`);
    }
  }, [authLoading, user, router, pathname]);

  const {
    showShortcutsModal,
    setShowShortcutsModal,
    showCommandPalette,
    setShowCommandPalette,
  } = useKeyboardShortcuts({ enabled: true });

  return (
    <WebSocketProvider enableNotifications={true}>
      <div className="flex h-[calc(100vh-64px)] relative">
        {/* Sidebar - Hidden on mobile, visible on md+ */}
        <DashboardSidebar />

        {/* Main Content - Full width on mobile, flex-1 on desktop */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 w-full md:w-auto pb-16 md:pb-0">
          {/* Add padding-top on mobile to account for menu button */}
          <div className="pt-12 md:pt-0">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />

        {/* Keyboard Shortcuts Modal */}
        <KeyboardShortcutsModal
          isOpen={showShortcutsModal}
          onClose={() => setShowShortcutsModal(false)}
        />

        {/* Command Palette */}
        <CommandPalette
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
        />

        {/* WebSocket Status Indicator - Fixed bottom right */}
        <div className="fixed bottom-4 right-4 z-40 hidden md:block">
          <WebSocketStatusIndicator />
        </div>
      </div>
    </WebSocketProvider>
  );
}
