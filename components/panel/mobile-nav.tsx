"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { buildPanelNav, NavLinks } from "./sidebar";

// Mobilna nawigacja: przycisk hamburger w topbarze + wysuwany panel (drawer)
// z nakładką. Widoczna tylko < md (na desktopie działa stały PanelSidebar).
export function MobileNav({
  tenantName,
  showAudit = false,
  showLocations = false,
}: {
  tenantName: string;
  showAudit?: boolean;
  showLocations?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const nav = buildPanelNav(showAudit, showLocations);

  // Zamknij drawer po zmianie trasy oraz zablokuj scroll tła gdy otwarty.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Otwórz menu"
        className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--primary)] hover:bg-[var(--secondary)]"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* nakładka */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          {/* panel */}
          <aside className="absolute left-0 top-0 h-full w-64 flex flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)] shadow-xl">
            <div className="flex items-center justify-between px-6 py-6 border-b border-[var(--sidebar-border)]">
              <Link
                href="/dashboard"
                className="flex items-center gap-2"
                onClick={() => setOpen(false)}
              >
                <div className="h-9 w-9 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white font-bold">
                  C
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold tracking-tight">CareQuote</span>
                  <span className="text-xs text-white/60 truncate max-w-[140px]">
                    {tenantName}
                  </span>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Zamknij menu"
                className="flex h-8 w-8 items-center justify-center rounded-md text-white/70 hover:bg-[var(--sidebar-accent)]/60 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks items={nav} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </div>
  );
}
