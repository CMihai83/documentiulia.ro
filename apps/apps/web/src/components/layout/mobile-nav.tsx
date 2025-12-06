"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  FileText,
  Calculator,
  Menu,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Acasă", icon: LayoutDashboard },
  { href: "/efactura", label: "E-Factura", icon: Receipt },
  { href: "/invoices", label: "Facturi", icon: FileText },
  { href: "/calculator", label: "TVA", icon: Calculator },
  { href: "/settings", label: "Mai mult", icon: Menu },
];

export function MobileNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/";
    }
    if (href === "/settings") {
      return ["/settings", "/clients", "/courses", "/forum", "/help", "/billing", "/notifications", "/reports", "/documents", "/profile", "/leaderboard", "/assistant", "/saft", "/etransport", "/expenses"].some(p => pathname.startsWith(p));
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 lg:hidden pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors ${
                active ? "text-blue-600" : "text-slate-500 active:text-slate-700"
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? "text-blue-600" : "text-slate-400"}`} />
              <span className={`text-[10px] mt-1 ${active ? "font-semibold" : "font-medium"}`}>
                {item.label}
              </span>
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
