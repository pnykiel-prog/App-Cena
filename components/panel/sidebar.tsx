"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Settings,
  CreditCard,
  ScrollText,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leady", label: "Leady", icon: Users },
  { href: "/wizyty", label: "Wizyty", icon: CalendarClock },
  { href: "/konfiguracja", label: "Konfiguracja", icon: Settings },
  { href: "/plan", label: "Plan", icon: CreditCard },
];

export function PanelSidebar({
  tenantName,
  showAudit = false,
  showLocations = false,
}: {
  tenantName: string;
  showAudit?: boolean;
  showLocations?: boolean;
}) {
  const pathname = usePathname();
  // Linki warunkowe wg planu: lokalizacje (Enterprise), dziennik zdarzeń (Pro+).
  const nav = [
    ...NAV,
    ...(showLocations
      ? [{ href: "/lokalizacje", label: "Lokalizacje", icon: MapPin }]
      : []),
    ...(showAudit
      ? [{ href: "/audit", label: "Dziennik zdarzeń", icon: ScrollText }]
      : []),
  ];

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)] min-h-screen">
      <div className="px-6 py-6 border-b border-[var(--sidebar-border)]">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <div className="h-9 w-9 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white font-bold">
            C
          </div>
          <div className="flex flex-col">
            <span className="font-semibold tracking-tight">CareQuote</span>
            <span className="text-xs text-white/60 truncate max-w-[160px]">
              {tenantName}
            </span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-[var(--sidebar-accent)] text-white"
                  : "text-white/80 hover:bg-[var(--sidebar-accent)]/60 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-4 border-t border-[var(--sidebar-border)]">
        <p className="text-xs text-white/40">
          © {new Date().getFullYear()} CareQuote
        </p>
      </div>
    </aside>
  );
}
