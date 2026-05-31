"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, CreditCard, Package, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Przegląd", icon: LayoutDashboard, end: true },
  { href: "/admin/tenanci", label: "Tenanci", icon: Building2 },
  { href: "/admin/abonamenty", label: "Abonamenty", icon: CreditCard },
  { href: "/admin/plany", label: "Plany", icon: Package },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)] min-h-screen">
      <div className="px-6 py-6 border-b border-[var(--sidebar-border)]">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white font-bold">
            C
          </div>
          <div className="flex flex-col">
            <span className="font-semibold tracking-tight">CareQuote</span>
            <span className="text-xs text-white/60 uppercase tracking-wider">
              Super-admin
            </span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = item.end
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
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
