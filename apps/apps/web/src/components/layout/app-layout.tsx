"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { ChatWidget } from "@/components/assistant/chat-widget";

interface AppLayoutProps {
  children: React.ReactNode;
  showChatWidget?: boolean;
}

export function AppLayout({ children, showChatWidget = true }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar - slides in from left */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 lg:hidden transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main Content Area - offset for desktop sidebar, no offset on mobile */}
      <div className="lg:pl-64 min-h-screen flex flex-col">
        <Header
          showMenuButton
          onMenuClick={() => setSidebarOpen(true)}
        />
        {/* Main content with bottom padding for mobile nav */}
        <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6">
          {children}
        </main>
      </div>

      {/* AI Assistant Chat Widget */}
      {showChatWidget && <ChatWidget />}
    </div>
  );
}
